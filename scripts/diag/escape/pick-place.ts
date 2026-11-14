// [route flags] node --import tsx scripts/diag/escape/pick-place.ts keys.json > rows.jsonl
// For listed staged plays: at the throw, the target's route, the time to his break in the quarterback's forecast and
// in the receiver's own route, the aim; at the ball's arrival time, the aim against where the receiver truly is
// (along and across his path), the receiver's speed and the nearest defender to the aim; and the result.
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
for (const [concept, coverage, roster, seed, formation] of JSON.parse(readFileSync(process.argv[2], 'utf8'))) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false }));
  let thr: any = null; const tb = sim.throwBall.bind(sim), tick = sim.tick.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => {
    if (p === sim.qb && !thr && target && !away) { const b: any = p.behavior, f = b?.receiverForecasts?.get(target), fb = f?.breakAt?.(); const rr: any = target.behavior;
      thr = { target, t: +sim.t.toFixed(2), route: rr?.route?.id ?? null, qbBreakIn: fb == null ? null : +(fb - sim.t).toFixed(2), trueBreakIn: rr?.breakTime != null ? +(rr.breakTime - sim.t).toFixed(2) : null,
        aim: { x: intended.x, y: intended.y }, arriveAt: arrivalT, flight: +(arrivalT - sim.t).toFixed(2), P: b?.throwRec?.P ?? null, sepAtThrow: +Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - target.pos.x, d.pos.y - target.pos.y))).toFixed(1), arr: null as any }; }
    return tb(p, target, v0, intended, arrivalT, away, ...rest);
  };
  sim.tick = () => { tick(); if (thr && !thr.arr && sim.t >= thr.arriveAt - 1e-6) { const r = thr.target, sp = Math.hypot(r.vel.x, r.vel.y) || 1, ux = r.vel.x / sp, uy = r.vel.y / sp, ex = thr.aim.x - r.pos.x, ey = thr.aim.y - r.pos.y;
    thr.arr = { ahead: +(ex * ux + ey * uy).toFixed(1), across: +(ex * -uy + ey * ux).toFixed(1), off: +Math.hypot(ex, ey).toFixed(1), speed: +sp.toFixed(1), defToAim: +Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - thr.aim.x, d.pos.y - thr.aim.y))).toFixed(1) }; } };
  const res = sim.run(); const { target, aim, arriveAt, ...row } = thr ?? {};
  console.log(JSON.stringify({ concept, coverage, roster, seed, ...row, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy }));
}
