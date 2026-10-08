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
  let vx: number;
  let vy: number;
  if (d > 4) {
    // Far away: sprint at a lead point.
    const lead = Math.min(1.2, d / vmax);
    const lx = ex + targetVel.x * lead;
    const ly = ey + targetVel.y * lead;
    const l = Math.hypot(lx, ly) || 1;
    vx = (lx / l) * vmax;
    vy = (ly / l) * vmax;
  } else {
    const k = opts.gain ?? 2.2;
    vx = targetVel.x + ex * k;
    vy = targetVel.y + ey * k;
    const sp = Math.hypot(vx, vy);
    if (sp > vmax) {
      vx *= vmax / sp;
      vy *= vmax / sp;
    }
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
 *  - The pursuer anticipates the carrier's path: he will accelerate toward
 *    his top speed and bend his run upfield; anticipation sets how much the
 *    pursuer trusts that prediction vs. the current heading.
 *  - Angle quality: each pursuer carries a per-play angle error (pursuit
 *    rating); poor pursuers aim at where the carrier will be a beat early
 *    (flat angle, end up trailing), great ones lead him and keep inside-out
 *    leverage.
 */
export function pursuitPoint(sim: PlaySim, a: Agent, target: Agent, horizon = 3): Vec2 {
  const delay = (0.12 + 0.12 * (1 - a.r('awareness'))) / Math.max(0.1, a.profile.reactionTime);
  const seen = sim.see(a, target, delay);
  const sp = Math.hypot(seen.vel.x, seen.vel.y);
  const dir = sim.attackDir(target.team);
  const h0 = sp > 0.5 ? { x: seen.vel.x / sp, y: seen.vel.y / sp } : { x: dir, y: 0 };
  // Expected heading: carriers bend upfield; anticipation trusts that more.
  const bendW = 0.2 + 0.45 * a.r('anticipation');
  const h1 = norm({ x: h0.x * (1 - bendW) + dir * bendW, y: h0.y * (1 - bendW) });
  const V = target.profile.vmax;
  const tau = target.profile.tau;
  const u0 = Math.min(sp, V);
  const path = (t: number): Vec2 => {
    const d = V * t - (V - u0) * tau * (1 - Math.exp(-t / tau));
    const w = Math.min(1, t / 0.6);
    const hx = h0.x * (1 - w) + h1.x * w;
    const hy = h0.y * (1 - w) + h1.y * w;
    const hl = Math.hypot(hx, hy) || 1;
    return { x: seen.pos.x + (hx / hl) * d, y: clamp(seen.pos.y + (hy / hl) * d, 0, FIELD_WIDTH) };
  };
  const ip = interceptPoint({ pos: a.pos, vel: a.vel, profile: a.profile }, path, { horizon, step: 0.1, radius: 0.7 });
  let bias = angleBias.get(a);
  if (bias === undefined) {
    bias = (1 - a.r('pursuit')) * 0.3 + sim.rng.normal(0, 0.12 * (1.2 - a.r('pursuit')));
    angleBias.set(a, bias);
  }
  const p = path(clamp(ip.t - bias, 0, horizon));
  if (process.env.PDEBUG && Math.round(sim.t * 20) % 4 === 0) console.log(`[pursuit] t=${sim.t.toFixed(2)} ${a.slot} ip.t=${ip.t.toFixed(2)} ip=(${ip.point.x.toFixed(1)},${ip.point.y.toFixed(1)}) bias=${bias.toFixed(2)} aim=(${p.x.toFixed(1)},${p.y.toFixed(1)}) seen=(${seen.pos.x.toFixed(1)},${seen.pos.y.toFixed(1)}) v=(${seen.vel.x.toFixed(1)},${seen.vel.y.toFixed(1)})`);
  // Inside-out leverage: shade toward the middle of the field.
  const lev = 0.5 * a.r('pursuit');
  return { x: p.x, y: p.y + Math.sign(sim.ballY - p.y || 1) * lev };
}

const angleBias = new WeakMap<Agent, number>();

export function chase(sim: PlaySim, a: Agent, target: Agent, horizon = 3): MoveCommand {
  const dist = Math.hypot(target.pos.x - a.pos.x, target.pos.y - a.pos.y);
  // Open-field tackling: when the carrier is coming at you, break down,
  // mirror his lateral movement square-on and make him come to you.
  const tackle = a.r('tackling');
  const breakDist = 3 + 3 * tackle;
  if (dist < breakDist && dist > 0.5) {
    const seen = sim.see(a, target, (0.12 + 0.12 * (1 - a.r('awareness'))) / Math.max(0.1, a.profile.reactionTime));
    const ux = (seen.pos.x - a.pos.x) / dist;
    const uy = (seen.pos.y - a.pos.y) / dist;
    const closing = -(seen.vel.x * ux + seen.vel.y * uy);
    if (closing > 1.5) {
      // Lateral component of the carrier's velocity relative to the line between us.
      const lat = seen.vel.x * -uy + seen.vel.y * ux;
      const mirror = lat * (0.7 + 0.3 * tackle);
      const approach = 1.5 + 2.5 * (1 - tackle) + Math.max(0, dist - 2) * 0.8;
      const vx = ux * approach + -uy * mirror;
      const vy = uy * approach + ux * mirror;
      return { vel: { x: vx, y: vy }, facing: Math.atan2(uy, ux), cutSkill: 0.8 + 0.4 * tackle };
    }
  }
  const p = pursuitPoint(sim, a, target, horizon);
  const effort = dist > 15 ? 0.85 + 0.15 * a.r('workRate') : 1;
  return { ...runThrough(a, p, { speed: effort }), effort };
}

export function ttr(a: Agent, p: Vec2, radius = 0): number {
  return timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile }, p, radius);
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
