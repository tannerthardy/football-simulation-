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
import { CARRIER_ACCEL, carrierRun, runDistance } from './carrier-forecast.js';

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
  // CARRIER_ACCEL: the lead is the shared forecast's run over that time (his anticipated acceleration), not seen velocity x time.
  const run = CARRIER_ACCEL && seen.carrying === true ? carrierRun(seen) : null;
  const lx = run ? run.heading.x * runDistance(run, tau) : seen.vel.x * tau, ly = run ? run.heading.y * runDistance(run, tau) : seen.vel.y * tau;
  return { x: seen.pos.x + lx + dir * cushion, y: clamp(seen.pos.y + ly + offset, 0.3, FIELD_WIDTH - 0.3) };
}
