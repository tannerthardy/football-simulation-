// QB lane 2026-11-18: engine-83's late cross-field throws (slant_flat from trips). Per staged play: the throw (time,
// target route, his P / intRisk / planned flight T), whether QB_STICK kept a throw the old recheck would have pulled,
// his phase and read position, the target's route state (path index vs length, finished?), the receiver vs the aim at
// the release, the nearest defender at the catch, and YAC.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const C = (process.env.LC_CONCEPTS ?? 'slant_flat').split(',');
for (const concept of C) for (const coverage of ['cover1', 'cover2', 'cover2_match', 'cover3', 'cover3_match', 'cover4', 'cover6', 'tampa2']) for (const roster of [3, 7, 11]) for (const seed of [1, 2, 3, 4]) for (const flip of [false, true]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_trips_11', flip })); } catch { continue; }
  const dir = sim.attackDir(sim.offense[0].team), X = (p: any) => +((p.x - sim.los) * dir).toFixed(1), Y = (p: any) => +(p.y - sim.ballY).toFixed(1);
  let thr: any = null, catchAt: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => { if (p === sim.qb && !thr && target && intended && !away) { const b: any = p.behavior, r = b.throwRec, rr: any = target.behavior;
    thr = { t: +sim.t.toFixed(2), decT: r ? +r.t.toFixed(2) : null, slot: target.slot, route: rr?.route?.id ?? null, P: r ? +r.P.toFixed(3) : null, iR: r ? +r.intRisk.toFixed(3) : null, T: +(arrivalT - sim.t).toFixed(2),
      phase: b.phase, out: !!b.out, readIdx: b.readIdx, nReads: b.reads?.length, readsTo: b.reads?.map((x: any) => x.slot + ':' + (x.behavior?.route?.id ?? '')).join(' '), kept: !!b.stickKeptLast,
      pathIdx: rr?.idx ?? null, pathLen: rr?.path?.length ?? null, settled: rr?.settled ?? null, finishAt: rr?.path?.length ? [X(rr.path[rr.path.length - 1].p), Y(rr.path[rr.path.length - 1].p)] : null,
      rec: [X(target.pos), Y(target.pos)], aim: [X(intended), Y(intended)], toSide: +Math.min(intended.y, 53.33 - intended.y).toFixed(1) }; }
    return tb(p, target, v0, intended, arrivalT, away, ...rest); };
  const tick0 = sim.tick.bind(sim);
  sim.tick = () => { tick0(); if (thr && !catchAt && sim.ball.kind === 'held' && sim.ball.carrier?.team === sim.offense[0].team && sim.ball.carrier !== sim.qb) { const c = sim.ball.carrier; catchAt = { at: [X(c.pos), Y(c.pos)], nd: +Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y))).toFixed(1) }; } };
  let res: any; try { res = sim.run(); } catch { continue; }
  if (thr) console.log(JSON.stringify({ concept, coverage, roster, seed, flip, thr, catchAt, cmp: !!res.stats.completed, yards: +(res.yards ?? 0).toFixed(1), touched: sim.events.some((e: any) => e.type === 'tackle' || e.type === 'contact_tackle') }));
}
