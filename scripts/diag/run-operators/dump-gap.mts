// Zone runs: dump carrier + OL frames at 0.1 s (x upfield from LOS, raw y), yards, handoff t, for rbread.py. JSON lines.
import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const CON: Record<string, string> = { counter: 'COUNTER', power: 'POWER', trap: 'TRAP' };
for (let seed = 7; seed <= 29; seed += 2) { let i = 0; for (const p of JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  const id = `s${seed}-${i++}`; if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); const con = CON[st.offCall?.run?.scheme]; if (!con) continue;
  const sim: any = new PlaySim(st); const dir = sim.attackDir('O'), los = sim.los, t0 = sim.t;
  const ol = sim.offense.filter((a: any) => ['LT','LG','C','RG','RT'].includes(a.slot)); const off = sim.offense; const df = sim.defense; const dg = df.map((d: any) => /^(DE|DT|NT)/.test(d.slot) ? 'DL' : /LB/.test(d.slot) ? 'LB' : 'DB'); const dfr: any[] = [];
  const fr: any[] = []; let k = 0;
  while (true) { const t = sim.t - t0; if (t >= k * .1 - 1e-9) { fr.push(off.map((a: any) => [((a.pos.x - los) * dir), a.pos.y])); dfr.push(df.map((d: any) => [+(((d.pos.x - los) * dir).toFixed(2)), +d.pos.y.toFixed(2)])); k++; } if (sim.phase !== 'live' || t > 8) break; sim.tick(); }
  const yards = sim.run().yards;
  const ho = sim.events.find((e: any) => e.type === 'handoff' || e.type === 'pitch'); const car = sim.agents[ho?.b ?? -1] ?? sim.carrier; if (!car || !ho) continue;
  const ci = off.indexOf(car), oi = ol.map((a: any) => off.indexOf(a));
  const cc = sim.events.find((e: any) => e.type === 'carrier_contact'); const mt = sim.events.filter((e: any) => e.type === 'missed_tackle' || e.type === 'broken_tackle').length;
  console.log(JSON.stringify({ id, src: 'sim', concept: con, yards, handoff: ho.t, contact: cc?.t ?? null, missed: mt, car: fr.map((f) => f[ci]), ol: fr.map((f) => oi.map((j: number) => f[j][1])), dg, def: dfr, off: process.argv[3] === 'off' ? fr.map((f) => f.filter((_: any, j: number) => j !== ci).map((q: any) => [+q[0].toFixed(2), +q[1].toFixed(2)])) : undefined })); } }
