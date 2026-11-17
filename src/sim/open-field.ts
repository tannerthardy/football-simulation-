/** OPEN_FIELD (experimental, off; OPEN_FIELD=1 turns it on): a defender closing on a free runner in space stays on top
 * of him with inside-out leverage instead of sprinting to the intercept point.
 *
 * Why (scripts/diag/risk/contact_cost.py parts 3-4, one operator over BDB 2025 and the sim, free plays after short
 * completions): the NFL's nearest defender is 2.0 yd upfield of the catcher at the catch, wider, barely coming downhill
 * (-0.6 yd/s toward his own goal), and from +0.5 s gives ground at the runner's pace while closing the lateral gap
 * (2.8 -> 1.5 yd): level at +1.0 s, never cleanly passed. Ours is 1.0 yd upfield, drives downhill (-1.5) at the
 * intercept point at full speed, is underneath by +0.5 s (passed on 66%, 96% by +1.5 s) and chases from behind. Near
 * defenders stop an NFL free runner on 43% of plays, ours on 25%.
 *
 * As coached: close the cushion fast while he is far, stay between him and the goal line on his inside shoulder, come
 * under control at a distance set by closing speed, mirror his upfield speed while squeezing the lateral gap, and tackle
 * when he commits or comes inside reach. This module only changes the far target of chase's sprint: a point on top of
 * the runner (his seen position carried along his seen velocity for the time to close, at most LEAD_MAX, plus a cushion
 * upfield that shrinks with distance, at chase's own leverage offset). chase's existing gather (gatheringApproach:
 * braking by closing speed, a moving arrival on the runner's motion) still takes over near him, and WAIT_REACHED still
 * decides when the reach is worth taking: they are the control and the tackle phases of the same approach.
 *
 * Attempt 2: the gather's own goal is shifted on top of the runner too (the cushion shrinking to nothing at contact),
 * so its moving arrival mirrors him instead of driving at him; and DRIVE_CATCH hands a receiver he cannot reach within
 * the securing beat (his own catch window) to this approach instead of driving through the hands.
 *
 * Applies only to a runner in space, from what the defender sees: the defender is upfield of him (entered above
 * ENTER_DEPTH, left below EXIT_DEPTH: the commitment rule), within RANGE, with no offensive body near the line between
 * them. A runner within SHORT yd of the line to gain or the goal line is met, not mirrored: giving ground there is the
 * first down or the score. */
import { OPP_GOAL_X, OWN_GOAL_X, FIELD_WIDTH } from '../core/field.js';
import { clamp, type Vec2 } from '../core/vec.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';

export const OPEN_FIELD = process.env.OPEN_FIELD !== '0';
/** Depth (yd upfield of the runner) at which he takes the on-top approach, and below which he leaves it. */
const ENTER_DEPTH = -0.3, EXIT_DEPTH = -0.8;
/** Beyond this he is not yet in the open-field approach (yd). */
const RANGE = 15;
/** Cushion upfield of the runner: a share of the distance, within bounds (yd; choice from the NFL catcher-frame rows:
 * +2.0 yd at about 4 yd, +2.7 at about 8). */
const CUSHION_SHARE = 0.4, CUSHION_MIN = 0.5, CUSHION_MAX = 3;
/** Longest lead on the runner's seen line (s). */
const LEAD_MAX = 0.6;
/** Short yardage: within this of the line to gain or the goal line he meets the runner (yd). */
const SHORT = 2;
/** A body within this of the line between them blocks the approach (yd). */
const LANE = 1.5;

const onTop = new WeakMap<Agent, boolean>();

/** Attempt 2: the gather's goal shift (yd along x) that keeps the arrival on top of the runner: the cushion shrinking
 * linearly to nothing at contact, while the on-top approach applies (decided by onTopPoint this tick). */
export function onTopCushion(sim: PlaySim, a: Agent, target: Agent, seen: Perceived, dist: number, contact: number): number {
  if (!onTop.get(a)) return 0;
  return sim.attackDir(target.team) * clamp(CUSHION_SHARE * (dist - contact), 0, CUSHION_MAX);
}

const playing = new WeakMap<Agent, { R: Agent; ball: boolean }>();
/** DRIVE_CATCH under OPEN_FIELD: whether he still plays the ball through the receiver's hands, by his time to the
 * hands against the securing beat his own arrival estimate leaves (enter/exit margins; persists per receiver). */
export function playsBall(a: Agent, R: Agent, tt: number, remaining: number): boolean {
  const prev = playing.get(a), was = prev && prev.R === R ? prev.ball : undefined;
  const ball = was === undefined ? tt <= remaining : was ? tt <= remaining + 0.1 : tt <= remaining - 0.05;
  playing.set(a, { R, ball });
  return ball;
}

/** The on-top target for `a` on the runner he sees, or null when the open-field approach does not apply. */
export function onTopPoint(sim: PlaySim, a: Agent, target: Agent, seen: Perceived, offset: number): Vec2 | null {
  const dir = sim.attackDir(target.team);
  const dx = seen.pos.x - a.pos.x, dy = seen.pos.y - a.pos.y, dist = Math.hypot(dx, dy);
  const depth = (a.pos.x - seen.pos.x) * dir;
  const was = onTop.get(a) ?? false;
  const goal = dir > 0 ? OPP_GOAL_X : OWN_GOAL_X;
  const shortYardage = (sim.firstDownX - seen.pos.x) * dir <= SHORT || (goal - seen.pos.x) * dir <= SHORT;
  let ok = !shortYardage && dist <= RANGE && (was ? depth > EXIT_DEPTH : depth > ENTER_DEPTH);
  if (ok) {
    // Nobody between them, from his own picture of the offence.
    for (const o of sim.offense) {
      if (o === target) continue;
      const q = sim.see(a, o).pos, t = clamp(((q.x - a.pos.x) * dx + (q.y - a.pos.y) * dy) / Math.max(1e-6, dist * dist), 0, 1);
      if (t > 0 && t < 1 && Math.hypot(a.pos.x + dx * t - q.x, a.pos.y + dy * t - q.y) < LANE) { ok = false; break; }
    }
  }
  onTop.set(a, ok);
  if (!ok) return null;
  const tau = clamp(dist / Math.max(1, a.profile.vmax), 0, LEAD_MAX);
  const cushion = clamp(CUSHION_SHARE * dist, CUSHION_MIN, CUSHION_MAX);
  return { x: seen.pos.x + seen.vel.x * tau + dir * cushion, y: clamp(seen.pos.y + seen.vel.y * tau + offset, 0.3, FIELD_WIDTH - 0.3) };
}

/** OPEN_TOP (experimental, off; OPEN_TOP=1; docs/reviews/2026-11-17-open-top.md). Zone YAC tail: the nearest deep
 * defender on top of a free runner closed at full speed to a point at most CUSHION_MAX ahead of him, so he kept coming
 * downhill; inside about 2.5 yd chase's gather matched the runner's velocity at a leverage offset and the runner ran
 * past him 1.5-2.5 yd to his side (61% of the never-reached zone yards). The NFL deep defender gives ground in front
 * for over a second on half of such plays (one positions operator, scripts/diag/yac/mirror.py).
 *
 * As taught (football handbook, defense-and-perception.md §10: close while matching lateral motion, gather before the
 * cut becomes unreachable, an alley player approaches inside-out; WR_DB_Mechanics_Textbook §16 perimeter tackling):
 *  close   - far from him, run at the on-top point at full speed (onTopPoint);
 *  balance - once he is inside the distance in which he could kill the closing speed he sees (his own braking from
 *            that closing speed, plus one reaction time of travel, plus contact), come to balance on top of him;
 *  give    - give ground at the runner's downfield pace while squeezing: the lateral gap to the leverage spot closes at
 *            TOP_SQUEEZE per second and the depth gap to contact at TOP_SINK per second (rates, not fixed offsets);
 *  strike  - when the runner is inside his lunge range, or has committed past his leverage (crossed to the side he is
 *            protecting by TOP_COMMIT), he takes him through the near hip, committed.
 * The balance distance is entered at the braking distance and left only beyond it plus TOP_EXIT (the exit on the far
 * side of the entry); the strike holds once taken. Near the goal line or the line to gain onTopPoint already returns
 * null and he meets the runner. Stated choices: TOP_SQUEEZE 2.0/s (the lateral gap closes in about half a second),
 * TOP_SINK 1.0/s (depth more slowly, so he is square on the runner's line before he arrives), TOP_EXIT 1.0 yd,
 * TOP_COMMIT 0.5 yd. */
export const OPEN_TOP = process.env.OPEN_TOP === '1';
const TOP_SQUEEZE = 2.0, TOP_SINK = 1.0, TOP_EXIT = 1.0, TOP_COMMIT = 0.5;
const topPhase = new WeakMap<Agent, { target: Agent; phase: 'close' | 'give' | 'strike' }>();
/** The open-field request for a defender on top of a free runner, or null to leave chase's approach alone. */
export function openTopVelocity(sim: PlaySim, a: Agent, target: Agent, seen: Perceived, offset: number, top: Vec2): { vel: Vec2; phase: string } {
  const dir = sim.attackDir(target.team);
  const rx = seen.pos.x - a.pos.x, ry = seen.pos.y - a.pos.y, dist = Math.hypot(rx, ry) || 1e-9;
  const ux = rx / dist, uy = ry / dist;
  const closing = Math.max(0, (a.vel.x - seen.vel.x) * ux + (a.vel.y - seen.vel.y) * uy);
  const body = a.profile.radius + target.profile.radius, arms = body + a.profile.reach, lunge = arms + 0.45;
  const brake = Math.max(1, a.profile.brake);
  const balance = arms + closing * closing / (2 * brake) + closing * a.profile.reactionTime;
  const vmax = a.profile.vmax * a.speedScale;
  let st = topPhase.get(a);
  if (!st || st.target !== target) { st = { target, phase: 'close' }; topPhase.set(a, st); }
  // Committed past his leverage: the runner is on the side he protects (offset points there) by TOP_COMMIT.
  const side = Math.sign(offset);
  // Only once he has taken that leverage (giving ground) can the runner commit past it.
  const past = st.phase === 'give' && side !== 0 && side * (seen.pos.y - a.pos.y) > TOP_COMMIT;
  if (st.phase !== 'strike' && (dist <= lunge || past)) st.phase = 'strike';
  else if (st.phase === 'close' && dist <= balance) st.phase = 'give';
  else if (st.phase === 'give' && dist > balance + TOP_EXIT) st.phase = 'close';
  let vx: number, vy: number;
  if (st.phase === 'strike') {
    const hx = seen.pos.x + seen.vel.x * 0.15 - a.pos.x, hy = seen.pos.y + seen.vel.y * 0.15 - a.pos.y, h = Math.hypot(hx, hy) || 1e-9;
    vx = hx / h * vmax; vy = hy / h * vmax;
  } else if (st.phase === 'close') {
    const tx = top.x - a.pos.x, ty = top.y - a.pos.y, t = Math.hypot(tx, ty) || 1e-9;
    vx = tx / t * vmax; vy = ty / t * vmax;
  } else {
    const depth = (a.pos.x - seen.pos.x) * dir;
    vx = seen.vel.x - dir * TOP_SINK * (depth - arms);
    vy = seen.vel.y + TOP_SQUEEZE * (seen.pos.y + offset - a.pos.y);
    const s = Math.hypot(vx, vy);
    if (s > vmax) { vx *= vmax / s; vy *= vmax / s; }
  }
  return { vel: { x: vx, y: vy }, phase: st.phase };
}
