/**
 * Forced deep throws (risk diagnosis harness; the decision rule is bypassed, nothing else): four verticals from 2x2
 * and 3x1 against Cover 1-4; at the first moment from 2.3 to 2.6 s that the QB is set and an outside go is ready,
 * he is made to throw it (his own evaluation of that throw, his own release). Per throw, at the planned arrival:
 * the ball against the point he aimed at as it left his hand, split along the throw (+ long, - short) and across
 * it; the receiver against that point, split the same way (+ past the spot, - short of it); the ball to the
 * catcher when it arrives; whether he was moving (speed > 1 yd/s) or held/hit (flick) at the release; completion.
 * Arms by environment (e.g. CATCH_CHOICE=0).
 * Contest additions (C14, this copy): at arrival the nearest defender to the receiver (distance; position along the
 * ball's incoming direction, + in front of him toward the ball; across), his speed; how the throw ended (the sim's
 * own ball events after the release: catch, pbu (with note), drop, miss, interception); whether the catch went
 * through a securing window (CATCH_SECURE) and how many defenders tried it, and the nearest defender during it.
 *   [CATCH_HANDS=1 ...] node --import tsx scripts/diag/risk/forced-deep-contest.ts [--n 60] > out/risk/contest-<arm>.jsonl
 */
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const N = Number(arg('--n', '60'));
const P: any = QBPass.prototype, rel = P.release;
let cur: any = null;
P.release = function (a: any, sim: any, ev: any) {
  const tb = sim.throwBall;
  sim.throwBall = (q: any, r: any, v0: any, pt: any, arr: number) => {
    sim.throwBall = tb;
    if (cur && cur.forced && !cur.thrown) cur.thrown = { pt: { x: pt.x, y: pt.y }, from: { x: q.pos.x, y: q.pos.y }, arr, r, moving: Math.hypot(q.vel.x, q.vel.y) > 1, flick: +this.flick.toFixed(2),
      sigma: +this.missSigma(a, sim, Math.hypot(pt.x - q.pos.x, pt.y - q.pos.y), 0).toFixed(2) };
    return tb.call(sim, q, r, v0, pt, arr);
  };
  return rel.call(this, a, sim, ev);
};
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (let i = 1; i <= N; i++) {
  const seed = Math.ceil(i / 2), flip = i % 2 === 0;
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: seed, formation, flip }));
  const by = sim.ballY;
  const runners = sim.offense.filter((o: any) => o.behavior instanceof RouteRunner && ['go', 'seam'].includes(o.behavior.route?.id));
  const gos = runners.filter((r: any) => { const side = Math.sign(r.pos.y - by) || 1;
    return !runners.some((o: any) => o !== r && (Math.sign(o.pos.y - by) || 1) === side && Math.abs(o.pos.y - by) > Math.abs(r.pos.y - by) + 0.5); });
  cur = { forced: false, thrown: null, at: null, arrive: null, opp: null, secure: null };
  let qb: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const air = sim.ball.kind === 'air', b0 = air ? sim.ballPos() : null;
    tick();
    if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
    if (qb && !cur.forced && sim.throwAt < 0 && qb.phase === 'set' && sim.t >= 2.3 && sim.t <= 2.6) {
      const go = gos.find((r: any) => qb.ready(r, sim));
      const ev = go ? qb.evaluate(sim.qb, sim, go, 0) : null;
      if (ev) { cur.forced = true; qb.startThrow(sim.qb, sim, ev); }
    }
    const T = cur.thrown;
    if (T && !cur.at && sim.t >= T.arr - 1e-9) {
      const b = sim.ballPos(), ux = T.pt.x - T.from.x, uy = T.pt.y - T.from.y, L = Math.hypot(ux, uy) || 1;
      const split = (p: any) => { const dx = p.x - T.pt.x, dy = p.y - T.pt.y; return { along: +((dx * ux + dy * uy) / L).toFixed(2), across: +((dy * ux - dx * uy) / L).toFixed(2), dist: +Math.hypot(dx, dy).toFixed(2) }; };
      cur.at = { inAir: sim.ball.kind === 'air', ball: split(b), rec: split(T.r.pos) };
    }
    if (T && air && sim.ball.kind !== 'air' && !cur.arrive && b0) cur.arrive = +Math.hypot(b0.x - T.r.pos.x, b0.y - T.r.pos.y).toFixed(2);
    // the contest at arrival: the nearest defender to the receiver when the ball first gets within 1.5 yd of him (or lands)
    if (T && air && b0 && !cur.opp && (sim.ball.kind !== 'air' || Math.hypot(sim.ballPos().x - T.r.pos.x, sim.ballPos().y - T.r.pos.y) < 1.5)) {
      const R = T.r, bp = sim.ballPos(), vx = bp.x - b0.x, vy = bp.y - b0.y, vl = Math.hypot(vx, vy) || 1;
      const d = sim.defense.filter((x: any) => !x.isDown?.(sim.t)).sort((a: any, b: any) => Math.hypot(a.pos.x - R.pos.x, a.pos.y - R.pos.y) - Math.hypot(b.pos.x - R.pos.x, b.pos.y - R.pos.y))[0];
      if (d) { const rx = d.pos.x - R.pos.x, ry = d.pos.y - R.pos.y;
        cur.opp = { slot: d.slot, dist: +Math.hypot(rx, ry).toFixed(2), front: +(-(rx * vx + ry * vy) / vl).toFixed(2), across: +((rx * vy - ry * vx) / vl).toFixed(2), speed: +Math.hypot(d.vel.x, d.vel.y).toFixed(1), recSpeed: +Math.hypot(R.vel.x, R.vel.y).toFixed(1) }; }
    }
    const sec = sim.ball.securing;
    if (sec) { const R = sec.receiver, near = Math.min(...sim.defense.map((x: any) => Math.hypot(x.pos.x - R.pos.x, x.pos.y - R.pos.y)));
      cur.secure = { tried: sec.tried.size, near: Math.min(cur.secure?.near ?? 99, +near.toFixed(2)), len: +(sec.until - sec.start).toFixed(2) }; }
  };
  sim.run();
  const T = cur.thrown, s = sim.stats;
  if (!T || !cur.at) continue;
  process.stdout.write(JSON.stringify({ coverage, formation, seed, flip, dist: +Math.hypot(T.pt.x - T.from.x, T.pt.y - T.from.y).toFixed(1), sigma: T.sigma, moving: T.moving, flick: T.flick,
    ...cur.at, ballToCatcher: cur.arrive, cmp: !!s.completed, int: !!s.interceptedBy, opp: cur.opp, secure: cur.secure,
    ends: sim.events.filter((e: any) => e.t >= sim.throwAt - 1e-9 && ['catch', 'pbu', 'drop', 'miss', 'interception', 'deflection', 'incomplete'].includes(e.type)).map((e: any) => e.note ? `${e.type}:${e.note}` : e.type) }) + '\n');
}
