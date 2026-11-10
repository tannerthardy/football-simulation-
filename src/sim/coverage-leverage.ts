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

export class DeepCoverage {
  private previous: { stamp: number; vx: number } | null = null;
  private acceleration = 0;

  choose(a: Agent, seen: Pick<Perceived, 'pos' | 'vel'>, cue: Perceived, receiver: PhysicalProfile,
    cushion: number, original: MoveCommand, now: number,
    model: Parameters<typeof previewFreeMovement>[4]): MoveCommand {
    const stamp = now - (cue.age ?? 0), previous = this.previous;
    if (!previous || stamp > previous.stamp + 1e-9) {
      const dt = previous ? stamp - previous.stamp : 0;
      this.acceleration = previous && dt > 0 && dt <= .3
        ? clamp((cue.vel.x - previous.vx) / dt, -receiver.brake,
          Math.max(0, (receiver.vmax - cue.vel.x) / receiver.tau)) : 0;
      this.previous = { stamp, vx: cue.vel.x };
    }
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
    const acceleration = (cue.age ?? 0) > .4 ? 0 : this.acceleration;
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
