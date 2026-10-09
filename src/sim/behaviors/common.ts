/** Steering helpers shared by behaviors. */
import { FIELD_WIDTH } from '../../core/field.js';
import { angleOf, clamp, norm, type Vec2 } from '../../core/vec.js';
import { arriveVelocity, type MoveCommand } from '../../physics/kinematics.js';
import { interceptPoint, timeToReach } from '../../physics/reach.js';
import type { Agent } from '../agent.js';
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
  return { vel: { x: vx, y: vy }, facing: opts.facing, cutSkill: opts.cutSkill };
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
 *  - Angle quality: each pursuer carries a per-play angle error (pursuit
 *    rating); poor pursuers aim at where the carrier will be a beat early
 *    (flat angle, end up trailing), great ones lead him and keep inside-out
 *    leverage.
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
    bias = (1 - a.r('pursuit')) * 0.3 + sim.rng.fork(`pursuit:${a.idx}`).normal(0, 0.12 * (1.2 - a.r('pursuit')));
    angleBias.set(a, bias);
  }
  const p = path(clamp(ip.t - bias, 0, horizon));
  // Keep the support contract while approaching, then close onto the near
  // hip. A permanent two-yard sideline shade is outside tackling reach.
  const dist = Math.hypot(seen.pos.x-a.pos.x, seen.pos.y-a.pos.y);
  const force = a.runFit?.kind === 'force' || (a.runFit?.kind === 'edge' && a.runFit.edge === 'box');
  const lev = (force ? Math.abs(leverage(a,p.y))*a.runFit!.side : leverage(a,p.y)) * clamp((dist-reach)/6,0,1);
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

export function chase(sim: PlaySim, a: Agent, target: Agent, horizon = 3): MoveCommand {
  const look = (0.12 + 0.12 * (1 - a.r('awareness'))) / Math.max(0.1, a.profile.reactionTime);
  const seen = sim.see(a, target, look);
  const dist = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y);
  // Open-field tackling: when the carrier is coming at you, break down,
  // mirror his lateral movement square-on and make him come to you.
  const tackle = a.r('tackling');
  if (dist > 0.3) {
    const ux = (seen.pos.x - a.pos.x) / dist;
    const uy = (seen.pos.y - a.pos.y) / dist;
    const incoming = -(seen.vel.x * ux + seen.vel.y * uy);
    const contact = a.profile.radius+target.profile.radius+a.profile.reach*.65;
    // He is coming at the tackler (not crossing his face or pulling away).
    // An oblique interceptor needs to run his angle instead: squaring up on
    // every closing carrier flattens that angle before he reaches the hip.
    if (incoming > 1.5 && incoming/Math.max(.1,Math.hypot(seen.vel.x,seen.vel.y)) > .7) {
      const nx = -uy, ny = ux;
      const across = seen.vel.x * nx + seen.vel.y * ny;
      const body = a.profile.radius + target.profile.radius;
      const toward = a.vel.x * ux + a.vel.y * uy;
      const closing = incoming + toward;
      const T = Math.max(0.15, (dist - body) / Math.max(1, closing));
      // Meet him from the inside, on the near hip: he arrives a little to
      // the tackler's outside, still inside the shoulders.
      const lev = leverage(a, seen.pos.y);
      const offset = -clamp(0.35 * lev, -0.3, 0.3) * ny;
      const lateralMax = a.profile.lateral * 0.6 + 2;
      const vn = clamp(across - offset / T, -lateralMax, lateralMax);
      // He is already closing the distance. Spend the feet on staying in
      // front of him and arrive under control (a poor tackler comes in too
      // fast), but keep them driving through the strike: a tackler standing
      // still is run over.
      const attack = 0.8 + 1.6 * tackle;
      const run = Math.sqrt(Math.max(0, a.profile.vmax ** 2 - vn * vn));
      const approach = clamp(Math.sqrt((2.5+2*(1-tackle))**2+2*a.profile.brake*Math.max(0,dist-contact))-incoming, Math.min(attack, run), run);
      const strike = dist < contact + 0.5;
      return { vel: { x: ux * approach + nx * vn, y: uy * approach + ny * vn }, facing: Math.atan2(uy, ux),
        cutSkill: 0.8 + 0.4 * tackle, push: strike ? 1 : undefined, posture: 0.4 + 0.25 * tackle } as MoveCommand;
    }
  }
  // The last yards: a collision course. Hold his bearing steady by matching
  // his motion across the line between us, and run through him with what
  // speed is left. The body contact takes his momentum; the arms keep it.
  if (dist > 0.3) {
    const contact = a.profile.radius + target.profile.radius + a.profile.reach * 0.65;
    if (dist < contact + 2.5) {
      const ux = (seen.pos.x - a.pos.x) / dist, uy = (seen.pos.y - a.pos.y) / dist;
      const nx = -uy, ny = ux;
      const cap = a.profile.vmax;
      const vn = clamp(seen.vel.x * nx + seen.vel.y * ny, -cap, cap);
      const approach = Math.sqrt(Math.max(0, cap * cap - vn * vn));
      // Square the shoulders for the strike.
      const square = dist < contact + 0.5 ? Math.atan2(uy, ux) : undefined;
      return { vel: { x: ux * approach + nx * vn, y: uy * approach + ny * vn }, facing: square,
        cutSkill: 0.85 + 0.35 * tackle, push: 1, posture: 0.4 + 0.25 * tackle } as MoveCommand;
    }
  }
  const p = pursuitPoint(sim, a, target, horizon);
  // Away from the ball, pursuit runs below top speed (more so for low motors).
  const effort = dist > 12 ? 0.75 + 0.2 * a.r('workRate') : 1;
  return { ...runThrough(a, p, { speed: effort }), effort };
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
