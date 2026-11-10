/** Deep-duty steering from an acquired stem and this body's achievable motion.
 * No route, future cut, ball outcome, extra observation or random draw.
 */
import { END_LINE_X } from '../core/field.js';
import { angleDiff, clamp, type Vec2 } from '../core/vec.js';
import { arriveVelocity, commandFacing, fatigueFactor, turnRateOf, type MoveCommand } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';

/** THROW_HORIZON (off; THROW_HORIZON=1 turns it on): a defender protecting
 * depth judges his safety against a throw made now, not an endless race. The
 * recovery he owes for being slower than the receiver counts only until such
 * a ball would arrive (his reaction plus the throw's natural flight from his
 * picture of the QB to his picture of the receiver), and when his technique's
 * request is unsafe he takes the slowest safe pace before opening or
 * sprinting. Off, every carry is charged as a race the receiver runs forever,
 * so no pace below the receiver's is ever safe (COV-1,
 * docs/reviews/cov1-flight-closing.md). */
export const throwHorizonOn = () => process.env.THROW_HORIZON === '1';

/** His reaction plus the natural flight of a throw made now from his picture
 * of the QB to his picture of the receiver: the 2023-tracking relation the QB
 * uses (behaviors/qb.ts), at an average arm. */
export function throwHorizon(a: Agent, qb: Vec2, receiver: Vec2): number {
  const d = Math.hypot(receiver.x - qb.x, receiver.y - qb.y);
  return a.profile.reactionTime + 0.38 + 0.022 * d + 0.00065 * d * d;
}

/** Yards a receiver gains on a defender who is `deficit` slower within
 * `window` s: the whole deficit while he turns, then a first-order catch-up. */
function lostWithin(deficit: number, turn: number, tau: number, window: number): number {
  return deficit * Math.min(window, turn) + deficit * tau * (1 - Math.exp(-Math.max(0, window - turn) / tau));
}

/** Downfield distance a receiver can cover in `t` s from his seen downfield
 * speed and facing: first he turns his shoulders downfield (his turn rate),
 * then accelerates toward his top speed (first-order, his tau). What his
 * body can do, not where his route goes. */
export function reachDownfield(vx: number, facing: number, receiver: PhysicalProfile, t: number): number {
  const v0 = Math.max(0, vx), turn = Math.abs(angleDiff(facing, 0)) / receiver.turnRate;
  const t1 = Math.min(t, turn), t2 = Math.max(0, t - turn);
  return v0 * t1 + receiver.vmax * t2 - (receiver.vmax - v0) * receiver.tau * (1 - Math.exp(-t2 / receiver.tau));
}

export class DeepCoverage {
  private previous: { stamp: number; vx: number } | null = null;
  private acceleration = 0;
  /** THROW_HORIZON: he has seen this receiver run downfield (released). */
  private released = false;

  choose(a: Agent, seen: Pick<Perceived, 'pos' | 'vel'>, cue: Perceived, receiver: PhysicalProfile,
    cushion: number, original: MoveCommand, now: number,
    model: Parameters<typeof previewFreeMovement>[4], horizon?: number): MoveCommand {
    const stamp = now - (cue.age ?? 0), previous = this.previous;
    if (!previous || stamp > previous.stamp + 1e-9) {
      const dt = previous ? stamp - previous.stamp : 0;
      this.acceleration = previous && dt > 0 && dt <= .3
        ? clamp((cue.vel.x - previous.vx) / dt, -receiver.brake,
          Math.max(0, (receiver.vmax - cue.vel.x) / receiver.tau)) : 0;
      this.previous = { stamp, vx: cue.vel.x };
    }
    const s = a.body.support;
    const horizonOn = horizon !== undefined && throwHorizonOn();
    if (seen.vel.x > 1.5) this.released = true;
    // With the horizon, a released receiver whose shoulders are still
    // downfield is a threat while he slows: he can go again at once. Turned
    // to the QB, his reach below waits for his turn.
    const squareDownfield = horizonOn && this.released && Math.cos(cue.facing) > 0.5;
    if ((seen.vel.x <= 1.5 && !squareDownfield) || (seen.vel.x <= Math.abs(seen.vel.y) && !squareDownfield)
      || a.engagement || a.isDown(now)
      || (s && (s.state !== 'up' || s.foot || s.strike || Math.hypot(s.lean.x, s.lean.y) > 1e-6
        || Math.hypot(s.load.x, s.load.y) > 1e-6))) return original;

    // A measured burst/plant is a short expectation, not a route commitment.
    // RouteObservation already corrects stale braking; do not apply that age
    // correction twice. Continue it briefly from the consumed picture, stopping
    // at zero rather than inventing a reverse route. Positive burst prediction
    // also supplies the missing correction to constant-velocity dead reckoning.
    // Re-querying an aging picture cannot renew its transient plant/burst.
    // Use the same .4 s image-age bound as RouteObservation's correction.
    const acceleration = (cue.age ?? 0) > .4 ? 0 : this.acceleration;
    const age = acceleration < 0 ? 0 : clamp(cue.age ?? 0, 0, .4);
    const burst = acceleration < 0 ? Math.min(.25, seen.vel.x / -acceleration) : .25;
    const extra = (t: number) => {
      const h = Math.min(t, burst);
      return acceleration * (h * h * .5 + h * Math.max(0, t - burst));
    };
    // Off: his measured burst or plant continued. With the horizon: the most
    // ground his body can take from the seen speed and facing (a plant is no
    // safety while his shoulders stay downfield; a turn to the QB is).
    const reach = (t: number) => reachDownfield(seen.vel.x, cue.facing, receiver, t);
    const targetX = (t: number) => horizonOn ? seen.pos.x + reach(t) : seen.pos.x + seen.vel.x * t + extra(age + t);
    const reachV = (t: number) => { const h = 1e-3; return (reach(t + h) - reach(t)) / h; };
    const targetV = horizonOn ? clamp(reachV(0.5), 0, receiver.vmax) : clamp(seen.vel.x + acceleration * burst, 0, receiver.vmax);
    const base = Math.max(0, Math.min(cushion, END_LINE_X - a.profile.radius - seen.pos.x));
    const heading = Math.atan2(seen.vel.y, Math.max(.1, targetV));
    const tau = a.profile.tau / fatigueFactor(a.body.energy);
    const score = (command: MoveCommand) => {
      const path = previewFreeMovement(a.body, command, now, 16, model);
      let margin = Infinity;
      for (const p of path) {
        if (p.support !== 'up') return -Infinity;
        margin = Math.min(margin, p.pos.x - targetX(p.t) - base,
          END_LINE_X - a.profile.radius - p.pos.x);
      }
      const end = path[path.length - 1];
      const turn = Math.abs(angleDiff(commandFacing(a.body, command), heading)) / turnRateOf(a.body);
      const deficit = Math.max(0, (horizonOn ? reachV(end.t) : targetV) - end.vel.x);
      const recovery = horizon === undefined || !throwHorizonOn() ? deficit * (turn + tau)
        : lostWithin(deficit, turn, tau, Math.max(0, horizon - end.t));
      return Math.min(margin, end.pos.x - targetX(end.t) - base - recovery);
    };
    let choice = original, best = score(original);
    if (best >= 0) return original;
    const endLineSpeed = Math.max(0, arriveVelocity(a.body,
      { x: END_LINE_X - a.profile.radius, y: a.pos.y }, a.profile.vmax).x);
    const request = (vx: number, facing?: number): MoveCommand => {
      const x = Math.min(vx, endLineSpeed), y = original.vel.y;
      const scale = Math.min(1, a.profile.vmax / Math.max(1e-9, Math.hypot(x, y)));
      return { ...original, vel: { x: x * scale, y: y * scale }, facing };
    };
    // Spend excess depth if safe; otherwise match the stem square, open with
    // it, or run with it. The chosen request is the one actually previewed.
    const candidates: MoveCommand[] = [];
    if (horizon !== undefined && throwHorizonOn() && original.vel.x < targetV)
      for (const k of [.25, .5, .75]) candidates.push(request(original.vel.x + (targetV - original.vel.x) * k, original.facing));
    candidates.push(request(targetV, original.facing));
    if (original.facing !== undefined) candidates.push(request(targetV));
    candidates.push(request(a.profile.vmax));
    for (const command of candidates) {
      const margin = score(command);
      if (margin > best) { choice = command; best = margin; }
      if (margin >= 0) return command;
    }
    return choice;
  }
}
