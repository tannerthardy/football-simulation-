/**
 * QB_V2 module D: the judgment (QB lane, 2026-11-24; docs/reviews/2026-11-24-qb-v2-design.md §2, §7, §8). For one
 * candidate throw, his belief that it is caught (P) and that it is intercepted (risk), from the defenders in his picture
 * in three roles, each with one physical model:
 * - the coverer (the man his picture shows moving with the receiver): carried with the receiver to the break, then his
 *   reaction by the technique he is seen playing, then the body law to the catch point;
 * - drivers (off the receiver, in range): start at the passer's delivery if he sees them facing him (the arm cue), at
 *   the ball otherwise, then the body law;
 * - lane men (anyone in his picture under the ball's path): the ball's height against their reach as it passes.
 * Pure: it reads only what the caller passes (his picture, the receiver's forecast, the scouting report). No defender
 * he does not have in his picture is judged; that is where the unpriced interception comes from.
 */

export interface V2 { x: number; y: number }

/** A defender as he has him. */
export interface SeenDefender {
  id: number;
  pos: V2;
  vel: V2;
  facing: number;
  /** His picture's spread on this man (yd), from the cones and age. */
  spread: number;
  /** Whether the passer sees him facing the passer (eyes on him), so he can take the arm cue. */
  facesPasser: boolean;
  /** Scouting report: top speed (yd/s), acceleration (yd/s^2), reach (yd) and leap height (yd), ball skills (0-1). */
  vmax: number;
  accel: number;
  reach: number;
  leap: number;
  ballSkills: number;
}

export interface ThrowQuestion {
  /** Seconds from now to the release (his windup) and the ball's flight time. */
  windup: number;
  flight: number;
  /** Where the ball is caught, and the receiver's position at a time from now (his forecast). */
  catchAt: V2;
  receiverAt(t: number): V2;
  /** When the receiver breaks (seconds from now), null if no break before the catch (a settle, a seen-open read). */
  breakIn: number | null;
  /** The ball's height (yd) at a field point on its path (null where the ball is not over it). */
  ballHeightAt(p: V2): number | null;
  /** The ball's path from release to catch, sampled (for the lane). */
  path: V2[];
  /** The receiver's catch belief with no defender near (from the catch model, not a fitted drop rate). */
  catchClean: number;
  /** How resolved his look at the receiver is (0-1) and his picture spread on the receiver (yd). */
  res: number;
  receiverSpread: number;
}

export type Role = 'coverer' | 'driver' | 'lane';
export interface RoleJudged { id: number; role: Role; margin: number; sigma: number; pArrive: number; pPlay: number; pPick: number }
export interface Judgment { P: number; risk: number; roles: RoleJudged[] }

/** Stated choices (labelled; not fitted). */
/** A defender within this of the receiver's path, moving with him, is the coverer (yd). */
export const COVER_RADIUS = 6;
/** A settled receiver's coverer sits on him within this (yd); a dropper farther off holding his zone is a driver
 * (Coverage's note: underneath droppers answer the throw, not the break). */
export const SETTLE_COVER = 2.5;
/** Arrival within this of the catch point plays the ball (yd): a hand on the ball. */
export const PLAY_RADIUS = 1.0;
/** A driver starting farther than this from the catch point is not judged (yd; Coverage: 6+ yd arrive about never). */
export const DRIVE_RANGE = 9;
/** The arm cue's lead over the ball cue (s; Coverage's note: 0.25 s). */
export const ARM_LEAD = 0.25;
/** Reaction at the break by what the coverer is seen doing (s; Coverage's note §1, typical by technique). */
export const REACT_WITH_MAN = 0.3;
export const REACT_DEEP_CARRY = 0.3;
export const REACT_MATCH_FLAT = 0.75;
/** The base spread of an arrival time (s) with a resolved look and an exact picture (chosen). */
export const ARRIVE_SIGMA0 = 0.12;
/** An unresolved look's extra spread on where the receiver is (yd at res 0; the step clock's LOOK_SEP). */
export const LOOK_SEP = 0.5;
/** Of a defender who plays the ball, the share who break it up (rather than miss it) and, in front of the hands on the
 * throw side, who catch it (scaled by ball skills). Stated choices pending the calibration contract. */
export const PLAY_BREAKUP = 0.6;
export const PICK_IN_FRONT = 0.35;

const hyp = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y);
const phi = (z: number) => 0.5 * (1 + Math.tanh(0.7978845608 * (z + 0.044715 * z * z * z)));

/** Body law: time for a man at `pos` moving `vel`, facing `facing`, to get within `r` of `to`, starting after `delay`:
 * he turns toward it (a quarter turn costs `turnQ` s), keeps his speed along the new line, and accelerates to vmax. */
export function arriveTime(d: Pick<SeenDefender, 'pos' | 'vel' | 'facing' | 'vmax' | 'accel'>, to: V2, r: number, delay: number, turnQ = 0.15): number {
  const dx = to.x - d.pos.x, dy = to.y - d.pos.y, L = Math.hypot(dx, dy) - r;
  if (L <= 0) return delay;
  const ux = dx / (L + r), uy = dy / (L + r), along = Math.max(0, d.vel.x * ux + d.vel.y * uy);
  const ang = Math.abs(Math.atan2(Math.sin(Math.atan2(uy, ux) - d.facing), Math.cos(Math.atan2(uy, ux) - d.facing)));
  const turn = turnQ * (ang / (Math.PI / 2)) * (1 - along / Math.max(d.vmax, 1e-3));
  const v0 = along, a = Math.max(d.accel, 1e-3), vmax = Math.max(d.vmax, v0);
  const tAcc = (vmax - v0) / a, dAcc = v0 * tAcc + 0.5 * a * tAcc * tAcc;
  const run = L <= dAcc ? (-v0 + Math.sqrt(v0 * v0 + 2 * a * L)) / a : tAcc + (L - dAcc) / vmax;
  return delay + turn + run;
}

/** Which defender, if any, his picture shows covering the receiver: within COVER_RADIUS of where the receiver is now, the
 * nearest whose seen velocity runs with the receiver's (a man or a carry); a zone dropper holding is not a coverer. */
export function findCoverer(q: ThrowQuestion, defs: SeenDefender[]): SeenDefender | null {
  const r0 = q.receiverAt(0), r1 = q.receiverAt(0.2), rv = { x: (r1.x - r0.x) / 0.2, y: (r1.y - r0.y) / 0.2 }, rs = Math.hypot(rv.x, rv.y);
  let best: SeenDefender | null = null, bd = COVER_RADIUS;
  for (const d of defs) {
    const dist = hyp(d.pos, r0);
    if (dist > bd) continue;
    const withHim = rs < 1 ? dist <= SETTLE_COVER && Math.hypot(d.vel.x, d.vel.y) < 2 : (d.vel.x * rv.x + d.vel.y * rv.y) / rs > 0.5 * rs;
    if (withHim) { best = d; bd = dist; }
  }
  return best;
}

/** The coverer's reaction by what he is seen doing: deep (cushion over 4 yd) carrying, a flat seat (under the receiver,
 * level or in front), or running with his man. */
function coverReact(q: ThrowQuestion, d: SeenDefender): number {
  const r0 = q.receiverAt(0), cushion = hyp(d.pos, r0);
  if (cushion >= 4) return REACT_DEEP_CARRY;
  const r1 = q.receiverAt(0.2), up = { x: r1.x - r0.x, y: r1.y - r0.y }, ahead = (d.pos.x - r0.x) * up.x + (d.pos.y - r0.y) * up.y;
  return ahead < 0 ? REACT_MATCH_FLAT : REACT_WITH_MAN;
}

/** Judge one candidate throw on his picture. */
export function judge(q: ThrowQuestion, defs: SeenDefender[]): Judgment {
  const tBall = q.windup + q.flight, roles: RoleJudged[] = [];
  const recvSig = Math.hypot(q.receiverSpread, LOOK_SEP * (1 - q.res));
  const cov = findCoverer(q, defs);
  const add = (d: SeenDefender, role: Role, tArr: number, inFront: boolean) => {
    const sigma = Math.hypot(ARRIVE_SIGMA0, Math.hypot(d.spread, recvSig) / Math.max(d.vmax, 1e-3));
    const margin = tBall - tArr, pArrive = phi(margin / sigma);
    roles.push({ id: d.id, role, margin, sigma, pArrive, pPlay: pArrive * PLAY_BREAKUP, pPick: inFront ? pArrive * PICK_IN_FRONT * (0.5 + d.ballSkills) : 0 });
  };
  if (cov) {
    // Carried with the receiver to the break (his seen offset kept), then his reaction, then the body law from there.
    const tb = q.breakIn !== null && q.breakIn < tBall ? Math.max(0, q.breakIn) : null;
    let tArr: number;
    if (tb === null) tArr = arriveTime(cov, q.catchAt, PLAY_RADIUS, 0);
    else {
      const r0 = q.receiverAt(0), rb = q.receiverAt(tb), off = { x: cov.pos.x - r0.x, y: cov.pos.y - r0.y };
      const atBreak = { ...cov, pos: { x: rb.x + off.x, y: rb.y + off.y } };
      tArr = tb + arriveTime(atBreak, q.catchAt, PLAY_RADIUS, coverReact(q, cov));
    }
    const towardQB = hyp(cov.pos, q.path[0] ?? cov.pos) < hyp(q.catchAt, q.path[0] ?? q.catchAt);
    add(cov, 'coverer', tArr, towardQB);
  }
  for (const d of defs) {
    if (d === cov) continue;
    // Lane: under the ball's path where it passes low enough for his leap.
    let lane = false;
    for (const p of q.path) { const h = q.ballHeightAt(p); if (h !== null && h <= d.leap && hyp(d.pos, p) <= d.reach + 0.5) { lane = true; break; } }
    if (lane) { roles.push({ id: d.id, role: 'lane', margin: -1, sigma: ARRIVE_SIGMA0, pArrive: 1, pPlay: PLAY_BREAKUP, pPick: PICK_IN_FRONT * (0.5 + d.ballSkills) }); continue; }
    if (hyp(d.pos, q.catchAt) > DRIVE_RANGE) continue;
    const start = q.windup + (d.facesPasser ? 0 : ARM_LEAD);
    const tArr = arriveTime(d, q.catchAt, PLAY_RADIUS, start);
    add(d, 'driver', tArr, hyp(d.pos, q.path[0] ?? d.pos) < hyp(q.catchAt, q.path[0] ?? q.catchAt));
  }
  const notPlayed = roles.reduce((p, r) => p * (1 - r.pPlay), 1), notPicked = roles.reduce((p, r) => p * (1 - r.pPick), 1);
  return { P: q.catchClean * notPlayed, risk: 1 - notPicked, roles };
}
