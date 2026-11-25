/** Deep-duty steering from an acquired stem and this body's achievable motion.
 * No route, future cut, ball outcome, extra observation or random draw.
 */
import { END_LINE_X } from '../core/field.js';
import { angleDiff, clamp } from '../core/vec.js';
import { arriveVelocity, commandFacing, fatigueFactor, turnRateOf, type MoveCommand } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';

/** The receiver's upfield acceleration in this defender's own picture: the change in his seen upfield speed between
 * his delayed sight samples (each at its own stamp, over at most 0.3 s), bounded by the receiver's braking and his
 * remaining acceleration toward top speed. One form for every reader of the stem (CARRY_READ through DeepCoverage,
 * and the stem-stop read). */
export class StemAcceleration {
  private previous: { stamp: number; vx: number } | null = null;
  private acceleration = 0;
  get value(): number { return this.acceleration; }
  /** Fold in this tick's sight of him (no change unless it is a newer sample). */
  observe(cue: Perceived, receiver: Pick<PhysicalProfile, 'vmax' | 'tau' | 'brake'>, now: number): number {
    const stamp = now - (cue.age ?? 0), previous = this.previous;
    if (!previous || stamp > previous.stamp + 1e-9) {
      const dt = previous ? stamp - previous.stamp : 0;
      this.acceleration = previous && dt > 0 && dt <= .3
        ? clamp((cue.vel.x - previous.vx) / dt, -receiver.brake,
          Math.max(0, (receiver.vmax - cue.vel.x) / receiver.tau)) : 0;
      this.previous = { stamp, vx: cue.vel.x };
    }
    return this.acceleration;
  }
}

/** CARRY_READ's projection: the receiver's upfield speed t s ahead from his seen speed and seen acceleration. */
export const STEM_BURST_TAU = 1.0;
export const projectedStem = (vx: number, accel: number, t: number): number =>
  Math.max(0, vx + accel * STEM_BURST_TAU * (1 - Math.exp(-t / STEM_BURST_TAU)));
/** The stem-stop read (one stated form): his stem, projected 0.5 s ahead in his picture, has stopped below 1 yd/s, and
 * is climbing again only above 3 (CARRY_READ's endpoints). `held` is the previous state; the exit is on the far side. */
export const stemStopped = (vx: number, accel: number, held: boolean): boolean => {
  const p = projectedStem(vx, accel, 0.5);
  return held ? p < 3 : p < 1;
};

export class DeepCoverage {
  private readonly stem = new StemAcceleration();
  /** The receiver's upfield acceleration in this defender's picture (the last estimate choose made). */
  get seenAcceleration(): number { return this.stem.value; }

  choose(a: Agent, seen: Pick<Perceived, 'pos' | 'vel'>, cue: Perceived, receiver: Pick<PhysicalProfile, 'vmax' | 'tau' | 'brake'>,
    cushion: number, original: MoveCommand, now: number,
    model: Parameters<typeof previewFreeMovement>[4]): MoveCommand {
    this.stem.observe(cue, receiver, now);
    const s = a.body.support;
    if (seen.vel.x <= 1.5 || seen.vel.x <= Math.abs(seen.vel.y)
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
    const acceleration = (cue.age ?? 0) > .4 ? 0 : this.stem.value;
    const age = acceleration < 0 ? 0 : clamp(cue.age ?? 0, 0, .4);
    const burst = acceleration < 0 ? Math.min(.25, seen.vel.x / -acceleration) : .25;
    const extra = (t: number) => {
      const h = Math.min(t, burst);
      return acceleration * (h * h * .5 + h * Math.max(0, t - burst));
    };
    // His measured burst or plant continued.
    const targetX = (t: number) => seen.pos.x + seen.vel.x * t + extra(age + t);
    const targetV = clamp(seen.vel.x + acceleration * burst, 0, receiver.vmax);
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
      const deficit = Math.max(0, targetV - end.vel.x);
      const recovery = deficit * (turn + tau);
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
