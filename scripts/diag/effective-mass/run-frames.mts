// Fixed-set runs in the NFL record shape (players' side/group, 0.1 s xy frames from the snap, x from the line with the
// offense attacking +x; events handoff / first_contact / end; carrier index) plus the truth the tracking cannot see:
// falls = [defender index, time] for run engagements that ended 'body down' with the defender down. For rdfall.py.
// usage: [flags] node --import tsx scripts/diag/effective-mass/run-frames.mts [dir] > out.jsonl
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { runContactObservers } = await import(`${W}/src/sim/run-contact-observer.ts`);
const DIR = process.argv[2] ?? 'out/matched-restage';
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
const group = (a: any) => a.team === 'O' ? (OL.has(a.slot) ? 'OL' : ['Y', 'H'].includes(a.slot) ? 'TE' : a.slot === 'QB' ? 'QB' : ['RB', 'FB'].includes(a.slot) ? 'RB' : 'WR')
  : /^(DE|DT|NT)/.test(a.slot) ? 'DL' : /LB/.test(a.slot) ? 'LB' : 'DB';
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (p.pass) continue;
  const sim: any = new PlaySim(st); const all = [...sim.offense, ...sim.defense]; const dir = sim.attackDir('O'), los = sim.los, t0 = sim.t;
  const falls: any[] = []; const ended = new Set<any>();
  runContactObservers.set(sim, (e: any, ph: string, data: any) => { if (ph !== 'end' || ended.has(e)) return; ended.add(e);
    if (data?.reason === 'body down' && e.defender.isDown(sim.t)) falls.push([all.indexOf(e.defender), +(sim.t - t0).toFixed(2)]); });
  const xy: number[][] = []; let k = 0;
  while (true) { const t = sim.t - t0; if (t >= k * 0.1 - 1e-9) { xy.push(all.flatMap((a: any) => [+((a.pos.x - los) * dir).toFixed(2), +a.pos.y.toFixed(2)])); k++; }
    if (sim.phase !== 'live' || t > 8) break; sim.tick(); }
  const res = sim.run();
  const ev: any = { end: +(sim.t - t0).toFixed(2) }; const ho = sim.events.find((e: any) => e.type === 'handoff' || e.type === 'pitch'); if (ho) ev.handoff = +(ho.t - t0).toFixed(2);
  const cc = sim.events.find((e: any) => e.type === 'carrier_contact'); if (cc) ev.first_contact = +(cc.t - t0).toFixed(2);
  const car = ho ? sim.agents[ho.b] : sim.carrier;
  console.log(JSON.stringify({ kind: 'run', dt: 0.1, yards: res?.yards ?? null, players: all.map((a: any) => ({ side: a.team === 'O' ? 'O' : 'D', group: group(a) })),
    xy, events: ev, carrier: car ? all.indexOf(car) : null, falls }));
}
