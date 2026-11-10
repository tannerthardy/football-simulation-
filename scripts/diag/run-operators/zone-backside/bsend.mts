// OZ/IZ: the backside end (outermost front defender < 1.6 yd deep on the backside, outside the backside tackle). Per run: is he the tackler
// (first tackler on the tackle event), the run's yards, and whether his tackle is a chase-down (carrier play side of the ball and past the LOS)
// or a backfield tackle (yards <= 0); split by his width outside the tackle (<2, 2-3.5, >3.5 yd).
import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`); const B = await import(`${W}/src/sim/behaviors/blocking.ts`);
const C: Record<string, number> = {}; const inc = (k: string, v = 1) => C[k] = (C[k] ?? 0) + v;
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); const sc = st.offCall?.run?.scheme;
  const con = sc === 'insideZone' ? 'IZ' : ['outsideZone', 'wideZone'].includes(sc) ? 'OZ' : null; if (!con) continue;
  const sim: any = new PlaySim(st); sim.tick(); if (!sim.offCall.run) continue; const ps = B.playSideSign(sim, sim.offCall.run); const dir = sim.attackDir('O');
  const ol = sim.offense.filter((a: any) => ['LT','LG','C','RG','RT'].includes(a.slot)).sort((a: any, b: any) => (a.pos.y - b.pos.y) * ps); const bt = ol[0];
  const out = sim.defense.filter((d: any) => (d.pos.x - sim.los) * dir < 1.6 && (bt.pos.y - d.pos.y) * ps > 0.5).sort((a: any, b: any) => (a.pos.y - b.pos.y) * ps);
  const end = out[0]; if (!end) continue; const w = (bt.pos.y - end.pos.y) * ps; const wc = w < 2 ? '<2' : w <= 3.5 ? '2-3.5' : '>3.5';
  while (sim.phase === 'live' && sim.t < 12) sim.tick(); const yards = sim.run().yards;
  const tk = sim.events.find((e: any) => e.type === 'tackle'); const tackler = tk ? sim.agents[tk.a] : null;
  inc(`${con} ${wc} n`); inc(`${con} all n`); inc(`${con} all yards`, Math.min(yards, 20));
  if (tackler === end) { inc(`${con} ${wc} end tackles`); inc(`${con} all end tackles`); inc(`${con} all end ${yards <= 0 ? 'backfield' : 'downfield'}`); inc(`${con} ${wc} end ${yards <= 0 ? 'backfield' : 'downfield'}`); }
}
for (const k of Object.keys(C).sort()) console.log(k.padEnd(36), k.endsWith('yards') ? (C[k] / C[k.replace('yards', 'n')]).toFixed(2) : C[k]);
