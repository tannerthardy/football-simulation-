/** BREAK_LEVERAGE (experimental, off; BREAK_LEVERAGE=1 turns it on): a defender breaking on a short completion drives
 * to the receiver's upfield (leverage) shoulder on the line the receiver will take after the catch, as far as the
 * defender can see that line, not at the man standing on the catch point.
 *
 * Why: on short completions the nearest defender's request pointed at the receiver himself (lead at the catch +1 deg,
 * sim, default engine) while the NFL's nearest defender arrives already angled ahead of the catcher (+32 deg, +39 with
 * the catcher moving over 3.5 yd/s), and the catcher's way out is back across the defender's face (79% of NFL plays vs
 * 55% ours). scripts/diag/risk/redirect_at_speed.py, one operator over BDB 2025 and the sim.
 *
 * As coached (break on the throw, rip through the hands when you can get there, otherwise take the upfield shoulder
 * and tackle through the man):
 *  - Play the ball if he can: DRIVE_CATCH's drive through the hands is kept while his time to the hands is within the
 *    catch's securing beat by his own estimate of the arrival. That choice has an enter and an exit margin.
 *  - Otherwise, and once his estimate has the ball arrived (CATCH_CARRY), he aims at the receiver's projected position
 *    (his seen position carried along his seen velocity for the time the defender needs to close, at most LEAD_MAX),
 *    plus one body width ahead along the receiver's escape line: his seen velocity blended continuously with the
 *    upfield direction (so a receiver caught standing still escapes upfield, a moving one along his momentum).
 *  - He arrives under control: he moves with the receiver and closes on the shoulder no faster than he could brake
 *    from relative to him (sure tacklers more). The cut back across his face is the one he can still play.
 *  - His own arrival estimate for the play-the-ball choice is the catch window in his picture of the flight.
 * Everything comes from his own picture of the receiver (sim.see): no route, target or catch flag.
 * Not in this attempt: the sideline and where help is. */
import { FIELD_WIDTH } from '../core/field.js';
import { clamp, type Vec2 } from '../core/vec.js';
import type { MoveCommand } from '../physics/kinematics.js';
import { timeToReach } from '../physics/reach.js';
import type { Agent } from './agent.js';
import { withMovementObjective } from './movement-objective.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';

export const BREAK_LEVERAGE = process.env.BREAK_LEVERAGE === '1';
/** Longest lead on the receiver's seen line (s; choice: about how long a short-catch line holds before he cuts). */
const LEAD_MAX = 0.6;
/** Upfield component of the escape line, as a speed added to his seen velocity (yd/s; choice: a jog). */
const ESCAPE_UPFIELD = 1.5;
/** Margins on the play-the-ball choice (s): enter at remaining - ENTER, leave at remaining + EXIT. */
const BALL_ENTER = 0.05, BALL_EXIT = 0.1;

/** Where he aims on the receiver he sees: the receiver's upfield shoulder on his escape line. */
export function leverageTarget(a: Agent, sim: PlaySim, seen: Perceived, R: Agent): Vec2 {
  const dir = sim.attackDir(R.team);
  const ex = seen.vel.x + dir * ESCAPE_UPFIELD, ey = seen.vel.y, en = Math.hypot(ex, ey) || 1;
  const d = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y);
  const tau = clamp(d / Math.max(1, a.profile.vmax), 0, LEAD_MAX);
  const shoulder = a.profile.radius + R.profile.radius;
  return { x: seen.pos.x + seen.vel.x * tau + (ex / en) * shoulder,
    y: clamp(seen.pos.y + seen.vel.y * tau + (ey / en) * shoulder, 0.3, FIELD_WIDTH - 0.3) };
}

/** His approach to that shoulder, under control: he moves with the receiver he sees and closes on the shoulder no
 * faster than he could brake from relative to him (the catch-point drive's braking law, applied to the closing speed,
 * since the shoulder moves with the man), capped at his top speed. */
export function leverageApproach(a: Agent, sim: PlaySim, seen: Perceived, R: Agent): MoveCommand {
  const tgt = leverageTarget(a, sim, seen, R);
  const dx = tgt.x - a.pos.x, dy = tgt.y - a.pos.y, d = Math.hypot(dx, dy) || 1;
  const control = 2.2 + 2.5 * (1 - a.r('tackling'));
  const close = Math.min(a.profile.vmax, Math.sqrt(control * control + 2 * a.profile.brake * 0.7 * Math.max(0, d - 0.3)));
  let vx = seen.vel.x + (dx / d) * close, vy = seen.vel.y + (dy / d) * close;
  const sp = Math.hypot(vx, vy);
  if (sp > a.profile.vmax) { vx *= a.profile.vmax / sp; vy *= a.profile.vmax / sp; }
  return withMovementObjective({ vel: { x: vx, y: vy } }, { kind: 'moving', point: tgt, velocity: seen.vel });
}

const playing = new WeakMap<Agent, { R: Agent; ball: boolean }>();

/** Whether he still plays the ball through the receiver's hands: his time to the hands within the securing beat that
 * remains by his own estimate (`remaining`, s), with an enter and an exit margin; the choice persists per receiver. */
export function playsBall(a: Agent, R: Agent, hands: Vec2, remaining: number): boolean {
  const tt = timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, hands, a.profile.reach);
  const prev = playing.get(a);
  const was = prev && prev.R === R ? prev.ball : undefined;
  const ball = was === undefined ? tt <= remaining : was ? tt <= remaining + BALL_EXIT : tt <= remaining - BALL_ENTER;
  playing.set(a, { R, ball });
  return ball;
}
