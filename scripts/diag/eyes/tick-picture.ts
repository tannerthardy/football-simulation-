// [QB_TICK_PICTURE=1] node --import tsx scripts/diag/eyes/tick-picture.ts > rows.jsonl
// QB_TICK_PICTURE's staged read: the same staged plays in two processes (flag off / on). Per play: his first
// evaluation (when, of whom, the chance and pick risk he priced), every evaluation he made as (t, slot, P) for the
// first-divergence comparison, his throw (when, to whom), and his position every 0.1 s. tick_picture_table.py pairs
// the arms. Passive (wraps evaluate and throwBall; calls nothing extra).
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const CONCEPTS = 'smash mesh stick four_verts'.split(' ');
const COVS = 'cover1 cover2man cover2 tampa2 cover3 cover3_match cover4 cover6'.split(' ');
for (const concept of CONCEPTS) for (const coverage of COVS) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
  const evs: [number, string, number][] = []; let thr: any = null; const xs: number[] = [];
  const qb: any = sim.qb.behavior, ev = qb.evaluate;
  qb.evaluate = function (...args: any[]) {
    const r = ev.apply(this, args);
    evs.push([+sim.t.toFixed(3), args[2]?.slot ?? '?', r ? +r.P.toFixed(4) : -1, r ? +r.intRisk.toFixed(4) : -1] as any);
    return r;
  };
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, ...rest: any[]) => { if (p === sim.qb && !thr) thr = { t: +sim.t.toFixed(2), to: target?.slot ?? null }; return tb(p, target, ...rest); };
  const tick = sim.tick.bind(sim); let k = 0;
  sim.tick = () => { tick(); if (k++ % 6 === 0) xs.push(+sim.qb.pos.x.toFixed(3), +sim.qb.pos.y.toFixed(3)); };
  let res: any; try { res = sim.run(); } catch { continue; }
  console.log(JSON.stringify({ key: `${concept}|${coverage}|${roster}|${seed}`, first: evs[0] ?? null, evs, thr, xs, sacked: !!res.stats.sacked, cmp: !!res.stats.completed }));
}
