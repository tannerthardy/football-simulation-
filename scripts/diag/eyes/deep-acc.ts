// node --import tsx scripts/diag/eyes/deep-acc.ts > rows.jsonl   (QB lane, 2026-11-18: deep accuracy, release vs receiver)
// Staged throws of 15+ air yards: the aimed point, where the ball actually was at the planned arrival (or where it
// stopped being in the air, if earlier), and the receiver then. Release error = ball vs aim; the receiver's adjustment
// = receiver vs aim; ball-to-receiver = what the NFL operator measures. Nearest defender to the receiver at the arrival.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const CONCEPTS = 'four_verts verts_hitch smash dagger sail_corner fade_flat corner_flat stick comebacks y_cross flood drive'.split(' ');
for (const concept of CONCEPTS) for (const coverage of ['cover1', 'cover2', 'cover2_match', 'cover3', 'cover4', 'cover6']) for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const seed of [1, 2, 3, 4]) for (const flip of [false, true]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
  const dir = sim.attackDir(sim.offense[0].team); let thr: any = null, at: any = null, last: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => { if (p === sim.qb && !thr && target && intended && !away) thr = { target, aim: { x: intended.x, y: intended.y }, arrivalT, air: (intended.x - sim.los) * dir, t: sim.t }; return tb(p, target, v0, intended, arrivalT, away, ...rest); };
  const tick0 = sim.tick.bind(sim);
  sim.tick = () => { tick0(); if (!thr || at) return; const b = sim.ball;
    if (b.kind === 'air') last = { x: b.flight.pos.x, y: b.flight.pos.y, z: b.flight.pos.z, t: sim.t };
    if ((b.kind !== 'air' || sim.t >= thr.arrivalT - 1e-9) && last) { const r = thr.target.pos, nd = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - r.x, d.pos.y - r.y)));
      at = { early: b.kind !== 'air', ballAim: Math.hypot(last.x - thr.aim.x, last.y - thr.aim.y), recAim: Math.hypot(r.x - thr.aim.x, r.y - thr.aim.y), ballRec: Math.hypot(last.x - r.x, last.y - r.y), z: last.z, nd, toSide: Math.min(thr.aim.y, 53.33 - thr.aim.y) }; } };
  let res: any; try { res = sim.run(); } catch { continue; }
  if (!thr || !at || thr.air < 15) continue;
  console.log(JSON.stringify({ concept, coverage, formation, seed, flip, air: +thr.air.toFixed(1), ...Object.fromEntries(Object.entries(at).map(([k, v]) => [k, typeof v === 'number' ? +v.toFixed(2) : v])), cmp: !!res.stats.completed }));
}
