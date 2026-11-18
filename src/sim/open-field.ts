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
/** OPEN_FIELD_GAIN (on since engine-92; OPEN_FIELD_GAIN=0 restores): the short-yardage exception counts a runner short
 * of the line to gain, not one already past it (see onTopPoint). */
export const OPEN_FIELD_GAIN = process.env.OPEN_FIELD_GAIN !== '0';
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
/** OPEN_FIELD_FINISH (on since engine-92, with OPEN_FIELD_GAIN; OPEN_FIELD_FINISH=0 restores): the mirror is for a runner who can still cut both ways. Once the runner
 * he sees has committed to a line (running near top speed, where a cut costs him the speed he would beat the angle
 * with) or has the sideline on his outside (less room to that side than he covers in one cut time), the defender stops
 * giving ground and takes chase's meeting angle at his inside leverage, the sideline as help. The switch has enter and
 * exit margins and persists per defender (the commit rule): it reopens only when the runner slows well below the line
 * speed and has room both ways again. Why: with OPEN_FIELD_GAIN the on-top mirror applies past the sticks, and against a
 * runner already at full speed it held a cushion that never closed (cover4 stick: 3.5 -> 4.1 yd at 9 yd/s); 6 of 9 new
 * touchdowns in the paired staged set were mid-field catches the chase had pushed out or tackled. */
export const OPEN_FIELD_FINISH = process.env.OPEN_FIELD_FINISH !== '0';
/** A runner at or above this seen speed has committed to his line (yd/s); he is free again below the exit speed. */
const FINISH_SPEED_ENTER = 7, FINISH_SPEED_EXIT = 6;
/** One cut's time (s): the sideline is on his outside when he has less room to it than he covers in this time, plus
 * FINISH_SIDE yd; he has room again past FINISH_SIDE_EXIT more. */
const FINISH_CUT_T = 0.5, FINISH_SIDE = 1, FINISH_SIDE_EXIT = 1.5;
const finishing = new WeakMap<Agent, boolean>();
/** OPEN_FIELD_FINISH: whether this defender has stopped mirroring the runner he sees (persists with margins). */
function finishes(a: Agent, seen: Perceived): boolean {
  const speed = Math.hypot(seen.vel.x, seen.vel.y), side = Math.min(seen.pos.y, FIELD_WIDTH - seen.pos.y);
  const room = FINISH_SIDE + FINISH_CUT_T * speed;
  const was = finishing.get(a) ?? false;
  const now = was ? speed > FINISH_SPEED_EXIT || side < room + FINISH_SIDE_EXIT : speed >= FINISH_SPEED_ENTER || side < room;
  finishing.set(a, now);
  return now;
}

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
  // OPEN_FIELD_GAIN: short of the line to gain only. A runner already past it has made the first down; without the
  // lower bound every catch past the sticks counted as short yardage and the open-field approach never applied.
  const toGain = (sim.firstDownX - seen.pos.x) * dir;
  const shortYardage = (OPEN_FIELD_GAIN ? toGain > 0 && toGain <= SHORT : toGain <= SHORT) || (goal - seen.pos.x) * dir <= SHORT;
  let ok = !shortYardage && dist <= RANGE && (was ? depth > EXIT_DEPTH : depth > ENTER_DEPTH);
  if (ok) {
    // Nobody between them, from his own picture of the offence.
    for (const o of sim.offense) {
      if (o === target) continue;
      const q = sim.see(a, o).pos, t = clamp(((q.x - a.pos.x) * dx + (q.y - a.pos.y) * dy) / Math.max(1e-6, dist * dist), 0, 1);
      if (t > 0 && t < 1 && Math.hypot(a.pos.x + dx * t - q.x, a.pos.y + dy * t - q.y) < LANE) { ok = false; break; }
    }
  }
  if (ok && OPEN_FIELD_FINISH && finishes(a, seen)) ok = false;
  onTop.set(a, ok);
  if (!ok) return null;
  const tau = clamp(dist / Math.max(1, a.profile.vmax), 0, LEAD_MAX);
  const cushion = clamp(CUSHION_SHARE * dist, CUSHION_MIN, CUSHION_MAX);
  return { x: seen.pos.x + seen.vel.x * tau + dir * cushion, y: clamp(seen.pos.y + seen.vel.y * tau + offset, 0.3, FIELD_WIDTH - 0.3) };
}
