/** A small pursuit controller shortlist, all executed by the same World.
 * Predictions assume the observed carrier keeps his velocity. They do not see
 * future cuts, grips, obstacles or tackle outcomes. Replan at the normal tick.
 */
import { FIELD_WIDTH } from '../core/field.js';
import { clamp, type Vec2 } from '../core/vec.js';
import { fatigueFactor, gaitLag, movingArrivalVelocity, type MoveCommand } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import { interceptPoint } from '../physics/reach.js';
import { availability, supportParams } from '../physics/support.js';
import type { Intent } from '../physics/world.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';
import { requestToCover } from './motion-plan.js';

const LOOKAHEAD_STEPS = 12; // 0.6 s of ordinary 20 Hz movement, a few running steps.
const CHOICE_MARGIN = .1; // yd; avoid switching on a negligible forecast difference.

/** A full gather still has to reach the moving hip. Compare one short
 * momentum-aware interception with the ordinary gather, using only the same
 * acquired image. Neither the target's future cut nor a successful grip is
 * forecast. Close strikes and loaded bodies keep their current ownership.
 */
export function chooseGatherApproach(a: Agent, seen: Perceived, contact: number,
  offset: number, original: MoveCommand, now: number): MoveCommand {
  const s = a.body.support, dist = Math.hypot(seen.pos.x-a.pos.x, seen.pos.y-a.pos.y);
  if (dist <= contact+.5 || Math.hypot(seen.vel.x,seen.vel.y) < .5
    || a.isDown(now) || a.engagement || (s && (s.state !== 'up' || s.foot || s.strike
      || Math.hypot(s.lean.x,s.lean.y) > 1e-6 || Math.hypot(s.load.x,s.load.y) > 1e-6))) return original;
  const path = (t: number): Vec2 => ({ x: seen.pos.x+seen.vel.x*t,
    y: clamp(seen.pos.y+seen.vel.y*t,0,FIELD_WIDTH) });
  const ip = interceptPoint({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},path,
    {horizon:.6,step:.05,radius:contact});
  if (ip.t < .1) return original;
  const vel = { x: requestToCover(gaitLag(a.profile),ip.point.x-a.pos.x,ip.t,a.vel.x),
    y: requestToCover(gaitLag(a.profile),clamp(ip.point.y+offset,0,FIELD_WIDTH)-a.pos.y,ip.t,a.vel.y) };
  const speed = Math.hypot(vel.x,vel.y), cap = a.profile.vmax*a.speedScale;
  if (speed > cap) { vel.x *= cap/speed; vel.y *= cap/speed; }
  const alternative = {...original,vel};
  const force = a.runFit?.kind === 'force' || (a.runFit?.kind === 'edge' && a.runFit.edge === 'box');
  function closest(command: MoveCommand): number {
    let best = dist;
    for (const p of previewFreeMovement(a.body,command,now,LOOKAHEAD_STEPS)) {
      if (p.support !== 'up') return Infinity;
      const target = path(p.t);
      if (force && Math.abs(offset) > .5 && a.runFit!.side*(p.pos.y-target.y-offset) < -contact) return Infinity;
      best = Math.min(best,Math.hypot(p.pos.x-target.x,p.pos.y-target.y));
    }
    return best;
  }
  const ordinary = closest(original);
  if (!Number.isFinite(ordinary) || ordinary > contact+2.5) return original;
  return closest(alternative)+CHOICE_MARGIN < ordinary ? alternative : original;
}

/** Only replace an unconstrained sprint that benefits from redirecting sooner.
 * Close strikes and the square-on approach remain owned by the tackle policy.
 */
export function chooseApproach(a: Agent, seen: Perceived, contact: number,
  offset: number, original: MoveCommand, now: number): MoveCommand {
  const s = a.body.support;
  const dx = seen.pos.x - a.pos.x, dy = seen.pos.y - a.pos.y;
  const dist = Math.hypot(dx, dy), speed = Math.hypot(a.vel.x, a.vel.y);
  const targetSpeed = Math.hypot(seen.vel.x, seen.vel.y);
  if (dist <= contact + .5 || speed < 2 || targetSpeed < .5
    || dist > contact + (speed + targetSpeed) * .6
    || a.isDown(now) || a.engagement || (s && (s.state !== 'up' || s.foot || s.strike
      || Math.hypot(s.lean.x, s.lean.y) > 1e-6
      || Math.hypot(s.load.x, s.load.y) > 1e-6))) return original;
  const ux = dx / dist, uy = dy / dist;
  const rvx = a.vel.x - seen.vel.x, rvy = a.vel.y - seen.vel.y;
  const closing = rvx * ux + rvy * uy;
  const across = -rvx * uy + rvy * ux;
  // A straight chase of a faster runner receives no speculative slow-down.
  if (closing <= 0 || Math.abs(across) < 1) return original;

  const tackle = a.r('tackling'), cutSkill = .85 + .35 * tackle;
  const capacity = s ? availability(s, supportParams(a.profile), fatigueFactor(a.body.energy)) : 1;
  const goal = { x: seen.pos.x, y: clamp(seen.pos.y + offset, 0, FIELD_WIDTH) };
  const arrival: Intent = { vel: movingArrivalVelocity(a.body, goal, seen.vel,
    a.profile.vmax * a.speedScale, contact, 2.5 + 2 * (1 - tackle), cutSkill, capacity),
    cutSkill, posture: .4 + .25 * tackle };
  // Match the observed runner's motion while shedding excess approach speed.
  // This is a requested velocity; the physics still limits the braking/turn.
  const brake: Intent = { vel: { ...seen.vel }, cutSkill, posture: arrival.posture };
  const force = a.runFit?.kind === 'force' || (a.runFit?.kind === 'edge' && a.runFit.edge === 'box');
  function score(command: Intent): number {
    const samples = previewFreeMovement(a.body, command, now, LOOKAHEAD_STEPS);
    let previous = { x: a.pos.x - goal.x, y: a.pos.y - goal.y };
    let closest = Math.hypot(previous.x, previous.y);
    for (const p of samples) {
      if (p.support !== 'up') return Infinity;
      const target: Vec2 = { x: goal.x + seen.vel.x * p.t,
        y: clamp(goal.y + seen.vel.y * p.t, 0, FIELD_WIDTH) };
      // Preserve the outside shoulder while the force fit is still shaded.
      if (force && Math.abs(offset) > .5 && a.runFit!.side * (p.pos.y - target.y) < -contact)
        return Infinity;
      const r = { x: p.pos.x - target.x, y: p.pos.y - target.y };
      const ex = r.x - previous.x, ey = r.y - previous.y;
      const along = clamp(-(previous.x * ex + previous.y * ey) / Math.max(1e-12, ex * ex + ey * ey), 0, 1);
      closest = Math.min(closest, Math.hypot(previous.x + ex * along, previous.y + ey * along));
      previous = r;
    }
    return closest;
  }
  let choice = original;
  let best = score(original);
  // A short forecast is useful for the upcoming plant, not for replacing a
  // distant interception. Only compare commands if the original path enters
  // the existing close-arrival region during this forecast. Fast players ten
  // yards apart can pass the cheap gate without any imminent approach.
  if (best > contact + 2.5) return original;
  for (const command of [arrival, brake]) {
    const distance = score(command);
    if (distance + CHOICE_MARGIN < best) { choice = command; best = distance; }
  }
  return choice;
}
