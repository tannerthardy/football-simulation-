// QB lane 2026-11-18: on slant_flat plays (keys from QT rows with a throwaway), every ready read evaluated every tick
// (u = 0; no dice): when each read first cleared his bar, its best P and when, and when his eyes got to it.
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const rows = readFileSync(process.env.QT!, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.throwaway);
for (const row of rows) {
  const [formation, coverage, roster, seed, flip] = row.key.split('|');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: process.env.QC ?? 'slant_flat', seed: +seed, roster: +roster, formation, flip: flip === 'true' }));
  const per = new Map<string, any>();
  for (let i = 0; i < 80 && sim.phase === 'live' && sim.carrier === sim.qb; i++) {
    sim.tick(); const b: any = sim.qb.behavior;
    if (b?.kind !== 'qb-pass' || !b.reads) continue;
    const need = b.barNow?.thr ?? 0.55, risk = b.barNow?.maxInt ?? 0.05, onR = b.reads[b.readIdx];
    for (const r of b.reads) {
      const s = per.get(r.slot) ?? { slot: r.slot, route: r.behavior?.route?.id, idx: b.reads.indexOf(r), clearAt: null, best: 0, bestAt: null, eyesAt: null };
      per.set(r.slot, s);
      if (onR === r && s.eyesAt === null && b.setAt >= 0) s.eyesAt = +sim.t.toFixed(2);
      let ready = false; try { ready = b.ready(r, sim); } catch {} if (!ready) continue;
      let e: any = null; try { e = b.evaluate(sim.qb, sim, r, 0); } catch {} if (!e) continue;
      if (e.P > s.best) { s.best = +e.P.toFixed(2); s.bestAt = +sim.t.toFixed(2); }
      if (s.clearAt === null && e.P >= need && e.intRisk <= risk) s.clearAt = +sim.t.toFixed(2);
    }
  }
  console.log(JSON.stringify({ key: row.key, setAt: +(sim.qb.behavior?.setAt ?? -1).toFixed?.(2), reads: [...per.values()] }));
}
