// QB lane 2026-11-18: mesh's corner thrown at the plant (staged), qb-grass-read's scenes: his price vs the result.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
for (const coverage of ['cover2', 'tampa2']) for (const roster of [3, 7, 11]) for (const seed of [1, 2, 3]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'mesh', seed, roster, formation: 'gun_doubles_11', flip: false }));
  const corner = sim.offense.find((o: any) => o.behavior?.route?.id === 'corner');
  sim.stagedThrow = { at: 99, slot: corner?.slot ?? 'X' }; let rec: any = null, set = false;
  const tick0 = sim.tick.bind(sim);
  sim.tick = () => { tick0(); const b: any = sim.qb.behavior; if (!set && b?.kind === 'qb-pass' && b.phase === 'set') { set = true; sim.stagedThrow = { at: sim.t, slot: corner.slot }; } };
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, ...rest: any[]) => { if (p === sim.qb && !rec) { const r = p.behavior?.throwRec; rec = r ? { t: +sim.t.toFixed(2), P: +r.P.toFixed(3), pOpen: +r.parts.pOpen.toFixed(3), iR: +r.intRisk.toFixed(3) } : null; } return tb(p, target, ...rest); };
  let res: any; try { res = sim.run(); } catch { continue; }
  const ev = sim.events.map((e: any) => e.type);
  console.log(JSON.stringify({ coverage, roster, seed, rec, cmp: !!res.stats.completed, int: ev.includes('interception'), pbu: ev.includes('pbu') }));
}
