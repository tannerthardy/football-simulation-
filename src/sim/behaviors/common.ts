/** Steering helpers shared by behaviors. */
import { FIELD_WIDTH } from '../../core/field.js';
import { angleDiff, angleOf, clamp, norm, type Vec2 } from '../../core/vec.js';
import { arriveVelocity, fatigueFactor, followAccel, movingArrivalVelocity, type MoveCommand } from '../../physics/kinematics.js';
import { availability, supportParams } from '../../physics/support.js';
import { interceptPoint, timeToReach } from '../../physics/reach.js';
import type { Agent } from '../agent.js';
import { chooseApproach } from '../approach-control.js';
import { withMovementObjective } from '../movement-objective.js';
import type { PlaySim } from '../playsim.js';

export const STAND: MoveCommand = { vel: { x: 0, y: 0 } };

export function stand(facing?: number): MoveCommand {
  return { vel: { x: 0, y: 0 }, facing };
}

/** Move toward a point, arriving at `through` speed (0 = stop). */
export function goTo(a: Agent, target: Vec2, opts: { speed?: number; through?: number; facing?: number; cutSkill?: number; effort?: number } = {}): MoveCommand {
  const vmax = a.profile.vmax * (opts.speed ?? 1);
  const t = { x: target.x, y: clamp(target.y, 0.3, FIELD_WIDTH - 0.3) };
  return {
    vel: arriveVelocity(a.body, t, vmax, opts.through ?? 0),
    facing: opts.facing,
    cutSkill: opts.cutSkill,
    effort: opts.effort,
  };
}

/** Sprint through a point without slowing. */
export function runThrough(a: Agent, target: Vec2, opts: { speed?: number; facing?: number; cutSkill?: number } = {}): MoveCommand {
  const dx = target.x - a.pos.x;
  const dy = target.y - a.pos.y;
  const d = Math.hypot(dx, dy) || 1;
  const s = a.profile.vmax * (opts.speed ?? 1);
  return { vel: { x: (dx / d) * s, y: (dy / d) * s }, facing: opts.facing, cutSkill: opts.cutSkill };
}

/**
 * Station-keeping on a moving point: match its velocity and close the offset.
 * Used for coverage (shadowing a receiver) and fitting on moving defenders.
 */
export function track(a: Agent, target: Vec2, targetVel: Vec2, opts: { facing?: number; cutSkill?: number; gain?: number; speed?: number } = {}): MoveCommand {
  const ex = target.x - a.pos.x;
  const ey = clamp(target.y, 0.3, FIELD_WIDTH - 0.3) - a.pos.y;
  const d = Math.hypot(ex, ey);
  const vmax = a.profile.vmax * (opts.speed ?? 1);
  // Close on the target no faster than we could still brake to its speed on
  // arrival — a defender who sprints flat out at a slowing receiver overruns.
  const brakeClose = (dist: number) => Math.sqrt(2 * a.profile.brake * 0.5 * Math.max(0, dist - 0.3)) + 1;
  let vx: number;
  let vy: number;
  if (d > 4) {
    // Far away: run at a lead point.
    const lead = Math.min(1.2, d / vmax);
    const lx = ex + targetVel.x * lead;
    const ly = ey + targetVel.y * lead;
    const l = Math.hypot(lx, ly) || 1;
    const close = Math.min(vmax, brakeClose(d));
    vx = targetVel.x + (lx / l) * close;
    vy = targetVel.y + (ly / l) * close;
  } else {
    const k = opts.gain ?? 2.2;
    const close = Math.min(k * d, brakeClose(d));
    vx = targetVel.x + (ex / (d || 1)) * close;
    vy = targetVel.y + (ey / (d || 1)) * close;
  }
  const sp = Math.hypot(vx, vy);
  if (sp > vmax) {
    vx *= vmax / sp;
    vy *= vmax / sp;
  }
  return withMovementObjective({ vel: { x: vx, y: vy }, facing: opts.facing, cutSkill: opts.cutSkill },
    { kind: 'moving', point: target, velocity: targetVel });
}

export function angleTo(from: Vec2, to: Vec2): number {
  return angleOf({ x: to.x - from.x, y: to.y - from.y });
}

/**
 * Pursuit: where to aim at a ball carrier.
 *
 * Awareness model:
 *  - Tracking an identified carrier uses a short visuomotor delay
 *    (0.12–0.24 s by awareness), not the full recognition reaction time.
 *  - Forecast from observed heading and recent acceleration. A stationary
 *    QB or a back pressing slowly does not become an imaginary sprinter.
 *  - Angle quality: each pursuer carries a per-play error around the
 *    perceived intercept. Lower pursuit ratings widen that error; they do
 *    not require every poorer pursuer to take a flat, trailing angle.
 */
export function pursuitPoint(sim: PlaySim, a: Agent, target: Agent, horizon = 3): Vec2 {
  const delay = (0.12 + 0.12 * (1 - a.r('awareness'))) / Math.max(0.1, a.profile.reactionTime);
  const seen = sim.see(a, target, delay);
  const sp = Math.hypot(seen.vel.x, seen.vel.y);
  const heading = sp > 0.1 ? norm(seen.vel) : { x: 0, y: 0 };
  const older = sim.see(a, target, delay + 0.2 / Math.max(0.1, a.profile.reactionTime));
  const acceleration = clamp((sp - Math.hypot(older.vel.x, older.vel.y)) / 0.2,
    -target.profile.brake, Math.max(0, (target.profile.vmax - sp) / target.profile.tau));
  // Recent acceleration is evidence for a short burst, not a promise of full
  // speed throughout the horizon. Reassess as new motion becomes visible.
  const tau = 0.3 + 0.3 * a.r('anticipation');
  const V = clamp(sp + acceleration * tau, 0, target.profile.vmax);
  const path = (t: number): Vec2 => {
    const d = V * t - (V - sp) * tau * (1 - Math.exp(-t / tau));
    return { x: seen.pos.x + heading.x * d, y: clamp(seen.pos.y + heading.y * d, 0, FIELD_WIDTH) };
  };
  const reach = a.profile.radius + target.profile.radius + a.profile.reach * 0.75;
  const ip = interceptPoint({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, path, { horizon, step: 0.1, radius: reach });
  let bias = angleBias.get(a);
  if (bias === undefined) {
    // The intercept already forecasts from acquired motion. Delayed cues
    // can miss a cut, but straight motion is dead-reckoned forward. Do not
    // subtract another skill-based time offset from every interception.
    bias = sim.rng.fork(`pursuit:${a.idx}`).normal(0, 0.12 * (1.2 - a.r('pursuit')));
    angleBias.set(a, bias);
  }
  const p = path(clamp(ip.t - bias, 0, horizon));
  // Keep the support contract while approaching, then close onto the near
  // hip. A permanent two-yard sideline shade is outside tackling reach.
  const dist = Math.hypot(seen.pos.x-a.pos.x, seen.pos.y-a.pos.y);
  const lev = pursuitLeverage(a,p.y) * clamp((dist-reach)/6,0,1);
  return { x: p.x, y: p.y + lev };
}

const angleBias = new WeakMap<Agent, number>();

/** Signed lateral offset (toward the field's middle) a pursuer keeps on a carrier at `y`. */
export function leverage(a: Agent, y: number): number {
  const toSide = Math.min(y, FIELD_WIDTH - y);
  // Mid-field has no inside: the preference fades out near the middle, so
  // a play and its mirror image are played the same way.
  const inside = clamp((FIELD_WIDTH / 2 - y) / 1.5, -1, 1);
  const near = clamp(1 - toSide / 14, 0, 1);
  return inside * (0.5 + 1.7 * near) * (0.55 + 0.45 * a.r('pursuit'));
}

function leverageMagnitude(a: Agent, y: number): number {
  const toSide = Math.min(y, FIELD_WIDTH - y);
  const near = clamp(1 - toSide / 14, 0, 1);
  return (0.5 + 1.7 * near) * (0.55 + 0.45 * a.r('pursuit'));
}

function pursuitLeverage(a: Agent, y: number): number {
  const force = a.runFit?.kind === 'force' || (a.runFit?.kind === 'edge' && a.runFit.edge === 'box');
  // A called outside shoulder is unambiguous at midfield. Only the generic
  // inside preference needs the center-field fade; close approaches still
  // shed the shade through their ordinary distance-to-contact factors.
  return force ? leverageMagnitude(a,y)*a.runFit!.side : leverage(a,y);
}

/** Gather from an already consumed runner picture. A fit and a chase use
 * the same braking and achievable arrival request; no new observation,
 * decision, random draw or physical capability is introduced here. */
export function gatheringApproach(a: Agent, seen: import('../perception.js').Perceived,
  contact: number, offset: number): { near: MoveCommand | null; gather: number } {
  const dist = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y);
  const tackle = a.r('tackling');
  let near: MoveCommand | null = null;
  let gather = 0;
  if (dist > 0.3) {
    const ux = (seen.pos.x - a.pos.x) / dist;
    const uy = (seen.pos.y - a.pos.y) / dist;
    const incoming = -(seen.vel.x * ux + seen.vel.y * uy);
    const cutSkill=.85+.35*tackle;
    const capacity=a.body.support?availability(a.body.support,supportParams(a.profile),fatigueFactor(a.body.energy)):1;
    const brake=followAccel(a.body,{x:-ux*1e3,y:-uy*1e3},cutSkill,capacity);
    const decel=Math.max(.1,-brake.x*ux-brake.y*uy);
    const closing=Math.max(0,(a.vel.x-seen.vel.x)*ux+(a.vel.y-seen.vel.y)*uy);
    const through=2.5+2*(1-tackle);
    const stopping=Math.max(0,(closing*closing-through*through)/(2*decel));
    // One arrival budget across incoming and crossing approaches. A small
    // heading change blends technique instead of selecting a new speed policy.
    // Near gathers start from available braking; far oblique angles still run.
    const carrierSpeed = Math.hypot(seen.vel.x, seen.vel.y);
    // A runner merely moving in our direction may still pass several yards
    // outside our reach. Gather early when his observed path actually enters
    // the near-hip corridor; otherwise run the oblique interception angle.
    const pathMiss = dist * Math.abs(ux * seen.vel.y - uy * seen.vel.x) / Math.max(.1, carrierSpeed);
    const headOn = clamp((contact + .5 - pathMiss) / .75, 0, 1)
      * clamp((incoming - 1.5) / 1.5, 0, 1);
    const close = clamp((contact + Math.max(2.5, stopping) - dist) / .75, 0, 1);
    gather = Math.max(headOn, close);
    if (gather > 0) {
      const goal = { x: seen.pos.x, y: clamp(seen.pos.y + offset, .3, FIELD_WIDTH - .3) };
      const vel=movingArrivalVelocity(a.body,goal,seen.vel,a.profile.vmax*a.speedScale,
        contact,through,cutSkill,capacity);
      // A front tackler keeps driving through the near hip, rather than
      // retreating forever to match an incoming runner's sprint. This is a
      // technique request, bounded by the same speed and support envelope.
      const toward = vel.x * ux + vel.y * uy;
      const attack = (0.8 + 1.6 * tackle) * headOn;
      if (toward < attack) {
        vel.x += ux * (attack - toward); vel.y += uy * (attack - toward);
        const speed = Math.hypot(vel.x, vel.y), cap = a.profile.vmax * a.speedScale;
        if (speed > cap) { vel.x *= cap / speed; vel.y *= cap / speed; }
      }
      near = {vel,facing:Math.atan2(uy, ux),cutSkill,push:dist<contact+.5?1:undefined,
        posture:.4+.25*tackle} as MoveCommand;
    }
  }
  return { near, gather };
}

/** Preserve the original request outside the physically needed gather. */
export function blendApproach(far: MoveCommand, near: MoveCommand | null, gather: number): MoveCommand {
  if (!near || gather <= 0) return far;
  const travel = far.facing ?? angleOf(far.vel);
  return { ...near, vel: { x: far.vel.x + (near.vel.x - far.vel.x) * gather,
    y: far.vel.y + (near.vel.y - far.vel.y) * gather },
    facing: travel + angleDiff(travel, near.facing!) * gather };
}

export function chase(sim: PlaySim, a: Agent, target: Agent, horizon = 3): MoveCommand {
  const look = (0.12 + 0.12 * (1 - a.r('awareness'))) / Math.max(0.1, a.profile.reactionTime);
  const seen = sim.see(a, target, look);
  const dist = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y);
  const tackle = a.r('tackling');
  const contact = a.profile.radius + target.profile.radius + a.profile.reach * .65;
  const offset = pursuitLeverage(a, seen.pos.y)
    * clamp((dist - contact) / 6, 0, 1);
  // Teammate navigation needs the responsibility this request serves. This
  // picture is already acquired and dead-reckoned to now; the intercept below
  // is a future steering waypoint, not another current moving target.
  const ownApproach = (command: MoveCommand): MoveCommand => withMovementObjective(command,
    { kind: 'moving', point: { x: seen.pos.x,
      y: clamp(seen.pos.y + offset, .3, FIELD_WIDTH - .3) }, velocity: seen.vel });
  const { near, gather } = gatheringApproach(a, seen, contact, offset);
  if (gather >= 1 && !sim.bond?.tacklers.includes(a)) return ownApproach(near!);
  const p = pursuitPoint(sim, a, target, horizon);
  // Away from the ball, pursuit runs below top speed (more so for low motors).
  const effort = dist > 12 ? 0.75 + 0.2 * a.r('workRate') : 1;
  const original = { ...runThrough(a, p, { speed: effort }), effort };
  // A new grip may exist before its first solved load reaches body support.
  if (sim.bond?.tacklers.includes(a)) return original;
  return chooseApproach(a, seen, contact, offset, original, sim.t,
    command => ownApproach(blendApproach(command, near, gather)));
}

export function ttr(a: Agent, p: Vec2, radius = 0): number {
  return timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, p, radius);
}

/** Nearest agent from a list to a point. */
export function nearest(list: Agent[], p: Vec2, filter?: (a: Agent) => boolean): Agent | null {
  let best: Agent | null = null;
  let bestD = Infinity;
  for (const a of list) {
    if (filter && !filter(a)) continue;
    const d = Math.hypot(a.pos.x - p.x, a.pos.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}
