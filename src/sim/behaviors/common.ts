/** Steering helpers shared by behaviors. */
import { FIELD_WIDTH } from '../../core/field.js';
import { hasObservedFlight } from '../possession-read.js';
import { angleDiff, angleOf, clamp, norm, type Vec2 } from '../../core/vec.js';
import { arriveVelocity, fatigueFactor, followAccel, movingArrivalVelocity, type MoveCommand } from '../../physics/kinematics.js';
import { availability, supportParams } from '../../physics/support.js';
import { interceptPoint, timeToReach, timeToReachRequested, type SprintRequest } from '../../physics/reach.js';
import type { Agent } from '../agent.js';
import { chooseApproach } from '../approach-control.js';
import { LAST_LINE, lastLinePoint, onTopCushion, onTopPoint } from '../open-field.js';
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
/** TRACK_PURSUIT (experimental, off; TRACK_PURSUIT=1, or PERCEIVE_TRACK=1 for every group): perception channels
 * step 1a, pursuit's aim (docs/reviews/2026-11-13-perception-proposal.md). The pursued carrier is read through the
 * tracking channel (`PlaySim.track`) instead of a scaled `see()` plus a two-sample acceleration burst. The tackle
 * window (the close gather in `chase`) is its own step (1a'). */
const TRACK_PURSUIT = process.env.TRACK_PURSUIT !== '0' || process.env.PERCEIVE_TRACK === '1';
/** BEND_FORECAST (experimental, numeric bits, default 0; docs/reviews/2026-11-17-bend-forecast.md). A pursuer
 * forecasts a ball carrier in space bending, not running his instantaneous line: the constant-velocity forecast was
 * 1.6 yd p50 (2.1 p75) short at +1.0 s, systematically ~1 yd upfield, most just out of the catch (staged zone,
 * scripts/diag/yac). From what he can see, in order of evidence:
 *  bit 2 (body): the carrier's seen facing (hips and shoulders) leads his velocity when he is turning; the forecast
 *        heading turns from his velocity toward his facing at BEND_BODY_RATE.
 *  bit 1 (prior): where the body shows nothing (facing within BEND_MARGIN of his velocity, or bit 2 off), the prior
 *        every defender holds: a runner in space turns upfield, at BEND_PRIOR_RATE until he is running upfield.
 * The forecast target heading is his belief: it changes only when the seen facing or velocity has moved BEND_MARGIN
 * from the picture it was formed on. Stated choices: BEND_PRIOR_RATE 19 deg/s (our carriers' measured median turn
 * toward upfield), BEND_BODY_RATE 40 deg/s (their p75, a carrier visibly turning), BEND_MARGIN 20 deg. */
const BEND_BITS = Number(process.env.BEND_FORECAST ?? 1);
const BEND_FORECAST = BEND_BITS !== 0;
const BEND_PRIOR = (BEND_BITS & 1) !== 0, BEND_BODY = (BEND_BITS & 2) !== 0;
const BEND_PRIOR_RATE = (19 * Math.PI) / 180, BEND_BODY_RATE = (40 * Math.PI) / 180, BEND_MARGIN = (20 * Math.PI) / 180, BEND_STEP = 0.05;
const curveOf = new WeakMap<Agent, Vec2[]>();
const bendBelief = new WeakMap<Agent, { target: Agent; vel: number; facing: number; heading: number; rate: number }>();
function bendTarget(sim: PlaySim, a: Agent, target: Agent, seen: import('../perception.js').Perceived, velHeading: number): { heading: number; rate: number } | null {
  const held = bendBelief.get(a);
  if (held && held.target === target && Math.abs(angleDiff(held.vel, velHeading)) < BEND_MARGIN && Math.abs(angleDiff(held.facing, seen.facing)) < BEND_MARGIN)
    return { heading: held.heading, rate: held.rate };
  const up = sim.attackDir(target.team) > 0 ? 0 : Math.PI;
  let heading = velHeading, rate = 0;
  if (BEND_BODY && Math.abs(angleDiff(velHeading, seen.facing)) >= BEND_MARGIN) { heading = seen.facing; rate = BEND_BODY_RATE; }
  else if (BEND_PRIOR) { heading = up; rate = BEND_PRIOR_RATE; }
  bendBelief.set(a, { target, vel: velHeading, facing: seen.facing, heading, rate });
  return rate > 0 ? { heading, rate } : null;
}
/** The forecast polyline: heading turns from h0 toward hT at `rate`, distance along it from `dist(t)`. */
function bentPath(p0: Vec2, h0: number, hT: number, rate: number, dist: (t: number) => number, horizon: number): Vec2[] {
  const out: Vec2[] = [{ x: p0.x, y: p0.y }];
  let h = h0, x = p0.x, y = p0.y, last = 0;
  for (let t = BEND_STEP; t <= horizon + 1e-9; t += BEND_STEP) {
    const dh = angleDiff(h, hT); h += Math.sign(dh) * Math.min(Math.abs(dh), rate * BEND_STEP);
    const d = dist(t), step = d - last; last = d;
    x += Math.cos(h) * step; y = clamp(y + Math.sin(h) * step, 0, FIELD_WIDTH);
    out.push({ x, y });
  }
  return out;
}

export function pursuitPoint(sim: PlaySim, a: Agent, target: Agent, horizon = 3,
  request?: SprintRequest): Vec2 {
  const delay = (0.12 + 0.12 * (1 - a.r('awareness'))) / Math.max(0.1, a.profile.reactionTime);
  // TRACK_PURSUIT (step 1a): the carrier he pursues is tracked: a short correcting loop (`track`), re-aimed every
  // tick, with no acceleration estimate (people do not perceive acceleration over such windows; Brouwer et al. 2002).
  // It retires this function's own compensator, the scaled 0.12-0.24 s picture and the two-sample burst below.
  const seen = TRACK_PURSUIT ? sim.track(a, target, 1, true) : sim.see(a, target, delay);
  const sp = Math.hypot(seen.vel.x, seen.vel.y);
  const heading = sp > 0.1 ? norm(seen.vel) : { x: 0, y: 0 };
  const older = TRACK_PURSUIT ? seen : sim.see(a, target, delay + 0.2 / Math.max(0.1, a.profile.reactionTime));
  // Over the time actually between the two pictures he holds, which attention
  // can stretch past the 0.2 s asked for; two pictures of the same moment show
  // no acceleration.
  const interval = (older.age ?? 0) - (seen.age ?? 0);
  const acceleration = !TRACK_PURSUIT && interval > 1e-9 ? clamp((sp - Math.hypot(older.vel.x, older.vel.y)) / interval,
    -target.profile.brake, Math.max(0, (target.profile.vmax - sp) / target.profile.tau)) : 0;
  // Recent acceleration is evidence for a short burst, not a promise of full
  // speed throughout the horizon. Reassess as new motion becomes visible.
  const tau = 0.3 + 0.3 * a.r('anticipation');
  const V = clamp(sp + acceleration * tau, 0, target.profile.vmax);
  const straight = (t: number): Vec2 => {
    const d = V * t - (V - sp) * tau * (1 - Math.exp(-t / tau));
    return { x: seen.pos.x + heading.x * d, y: clamp(seen.pos.y + heading.y * d, 0, FIELD_WIDTH) };
  };
  const bend = BEND_FORECAST && sp > 1 && seen.carrying === true && hasObservedFlight(a)
    ? bendTarget(sim, a, target, seen, Math.atan2(seen.vel.y, seen.vel.x)) : null;
  const curve = bend ? bentPath(seen.pos, Math.atan2(seen.vel.y, seen.vel.x), bend.heading, bend.rate, (t) => V * t - (V - sp) * tau * (1 - Math.exp(-t / tau)), horizon) : null;
  if (curve) curveOf.set(a, curve); else curveOf.delete(a);
  const path = curve ? (t: number): Vec2 => curve[Math.min(curve.length - 1, Math.max(0, Math.round(t / BEND_STEP)))] : straight;
  const reach = a.profile.radius + target.profile.radius + a.profile.reach * 0.75;
  const trace = sim.commandTraceFor?.(a);
  const mover = { pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale };
  const ip = interceptPoint(mover, path, { horizon, step: 0.1, radius: reach, request, recordSamples: !!trace });
  let bias = angleBias.get(a);
  if (bias === undefined) {
    // The intercept already forecasts from acquired motion. Delayed cues
    // can miss a cut, but straight motion is dead-reckoned forward. Do not
    // subtract another skill-based time offset from every interception.
    bias = sim.rng.fork(`pursuit:${a.idx}`).normal(0, 0.12 * (1.2 - a.r('pursuit')));
    angleBias.set(a, bias);
  }
  const meetT = PURSUIT_COMMIT ? (PURSUIT_SPOT ? commitSpot(sim, a, target, ip, path, seen, heading, V, mover, reach, horizon, request) : commitMeeting(sim, a, target, ip, path, mover, reach, horizon, request)) : ip.t;
  const biasedTime = clamp(meetT - bias, 0, horizon);
  const p = path(biasedTime);
  // Keep the support contract while approaching, then close onto the near
  // hip. A permanent two-yard sideline shade is outside tackling reach.
  const dist = Math.hypot(seen.pos.x-a.pos.x, seen.pos.y-a.pos.y);
  const lev = pursuitLeverage(a,p.y) * clamp((dist-reach)/6,0,1);
  const point = { x: p.x, y: p.y + lev };
  trace?.pursuit(target, { kind: 'intercept', prediction: ip,
    estimateAppliesTo: 'sampled-point-before-bias-and-leverage', steeringPointEstimate: 'not-evaluated',
    pursuer: { position: mover.pos, velocity: mover.vel, speedScale: mover.speedScale,
      capacity: { vmax: a.profile.vmax, tau: a.profile.tau, brake: a.profile.brake, lateral: a.profile.lateral } }, observed: seen, older,
    forecast: { model: 'fixed-observed-heading-relaxing-speed', heading, initialSpeed: sp, acceleration,
      speedLimit: target.profile.vmax, targetBrake: target.profile.brake, targetSprintTau: target.profile.tau,
      relaxedSpeed: V, relaxationTime: tau, lateralBoundary: [0, FIELD_WIDTH] },
    timeBias: bias, biasedTime, forecastPoint: p, leverage: lev, steeringPoint: point });
  return point;
}

const angleBias = new WeakMap<Agent, number>();

/** PURSUIT_COMMIT (experimental, off): a pursuer commits to the meeting he
 * chose. Measured (pursuit-weave.mts): re-picking the first reachable forecast
 * sample every tick flips between a reachable meeting and the least-late
 * fallback, and jumps the meeting time, on 9-13% of ticks; those ticks gave
 * 35-40% of his aim-point turn and 44% of the big pass re-aims (his body
 * heading turns 26 deg/s vs NFL 17). He keeps the meeting moment he chose, on
 * his current picture of the carrier, until:
 *  - it is no longer reachable by MEET_EXIT s (a reachable meeting), or a
 *    fresh one is reachable with MEET_ENTER s to spare (a fallback);
 *  - a fresh meeting is earlier (reachable) or less late (fallback) by
 *    MEET_MARGIN s;
 *  - it is under MEET_NEAR s away, past his horizon, or the target changed.
 * The exit is on the far side of the entry. Also: a defender playing the
 * ball holds his last approach on the flight's final tick (defense.ts). */
export const PURSUIT_COMMIT = process.env.PURSUIT_COMMIT !== '0';
const MEET_ENTER = 0.1, MEET_EXIT = 0.15, MEET_MARGIN = 0.3, MEET_NEAR = 0.15;
const heldMeeting = new WeakMap<Agent, { target: Agent; at: number; ok: boolean }>();
/** PURSUIT_SPOT (experimental, off; PURSUIT_SPOT=1 turns it on; for TRACK_PURSUIT): PURSUIT_COMMIT's pursuer commits
 * to the meeting spot he chose, not its moment. Under TRACK_PURSUIT the carrier is a tracked picture whose velocity the
 * tracker corrects every tick; a meeting moment held fixed turns each correction into a shift of his aim point along
 * the carrier's path (engine-61 candidate, pursuit-commit's 3-8 yd band: held-moment ticks turn 14.0 deg/s against the
 * uncommitted re-solved intercept's 10.6), while a held spot only moves when the forecast path stops passing it. */
const PURSUIT_SPOT = process.env.PURSUIT_SPOT !== '0';
const heldSpot = new WeakMap<Agent, { target: Agent; spot: Vec2; ok: boolean }>();
/** PURSUIT_SPOT: commit to the meeting spot, not its moment. The carrier's time to the held spot is read off
 * his current forecast (its along-path distance over the forecast speed); released when his forecast path no longer
 * passes the spot within reach, the pursuer can no longer reach it in time (MEET_EXIT), a fresh reachable meeting is
 * earlier by MEET_MARGIN, or it is under MEET_NEAR away. */
function commitSpot(sim: PlaySim, a: Agent, target: Agent, ip: ReturnType<typeof interceptPoint>, path: (t: number) => Vec2,
  seen: { pos: Vec2 }, heading: Vec2, V: number, mover: Parameters<typeof timeToReach>[0], reach: number, horizon: number, request?: SprintRequest): number {
  const freshOk = ip.estimate.status === 'estimated-feasible';
  const choose = (t: number, ok: boolean) => { heldSpot.set(a, { target, spot: path(t), ok }); return t; };
  const held = heldSpot.get(a);
  if (!held || held.target !== target || V < 0.5) return choose(ip.t, freshOk);
  const dx = held.spot.x - seen.pos.x, dy = held.spot.y - seen.pos.y;
  let along = dx * heading.x + dy * heading.y, miss = Math.abs(dx * heading.y - dy * heading.x);
  let t = along / V;
  if (BEND_FORECAST && curveOf.has(a)) {
    // BEND_FORECAST: the held spot is judged against the bending forecast, its nearest sample.
    const c = curveOf.get(a)!; let k = 0, best = Infinity;
    for (let i = 0; i < c.length; i++) { const m = Math.hypot(c[i].x - held.spot.x, c[i].y - held.spot.y); if (m < best) { best = m; k = i; } }
    t = k * BEND_STEP; miss = best; along = t * V;
  }
  void along;
  if (t < MEET_NEAR || t > horizon || miss > reach) return choose(ip.t, freshOk);
  const slack = t - (request ? timeToReachRequested(mover, held.spot, reach, request) : timeToReach(mover, held.spot, reach));
  if (held.ok ? slack < -MEET_EXIT : slack < MEET_ENTER && freshOk && (ip.estimate.slack ?? -Infinity) >= MEET_ENTER) return choose(ip.t, freshOk);
  if (freshOk && ip.t < t - MEET_MARGIN) return choose(ip.t, true);
  if (!held.ok && slack >= MEET_ENTER) held.ok = true;
  return t;
}

function commitMeeting(sim: PlaySim, a: Agent, target: Agent, ip: ReturnType<typeof interceptPoint>, path: (t: number) => Vec2,
  mover: Parameters<typeof timeToReach>[0], reach: number, horizon: number, request?: SprintRequest): number {
  const freshOk = ip.estimate.status === 'estimated-feasible';
  const freshSlack = ip.estimate.slack ?? -Infinity;
  const choose = (t: number, ok: boolean) => { heldMeeting.set(a, { target, at: sim.t + t, ok }); return t; };
  const held = heldMeeting.get(a);
  if (!held || held.target !== target) return choose(ip.t, freshOk);
  const t = held.at - sim.t;
  if (t < MEET_NEAR || t > horizon) return choose(ip.t, freshOk);
  const pt = path(t);
  const slack = t - (request ? timeToReachRequested(mover, pt, reach, request) : timeToReach(mover, pt, reach));
  if (held.ok) {
    if (slack < -MEET_EXIT) return choose(ip.t, freshOk);
    if (freshOk && ip.t < t - MEET_MARGIN) return choose(ip.t, true);
    return t;
  }
  if (freshOk && freshSlack >= MEET_ENTER) return choose(ip.t, true);
  if (slack >= MEET_ENTER) { held.ok = true; return t; }
  if (!freshOk && freshSlack > slack + MEET_MARGIN) return choose(ip.t, false);
  return t;
}

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
  contact: number, offset: number, upfield = 0): { near: MoveCommand | null; gather: number } {
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
      // OPEN_FIELD: `upfield` (yd along x) keeps the arrival on top of the runner, shrinking to nothing at contact.
      const goal = { x: seen.pos.x + upfield, y: clamp(seen.pos.y + offset, .3, FIELD_WIDTH - .3) };
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

/** TRACK_TACKLE (experimental, off; TRACK_TACKLE=1, or PERCEIVE_TRACK=1 for every group): perception channels step
 * 1a', the tackle window (docs/reviews/2026-11-13-perception-proposal.md). The pursued carrier's picture in the last
 * yards (chase's close gather, tryTackles' window preview, the whiff margin's aim) is read through the tracking channel
 * (`PlaySim.track`) instead of a scaled `see()` (0.12-0.24 s by awareness, plus the focus and stress terms added after
 * the scale). Who he tackles (observedHolder) and the commit reads are Defense's. */
export const TRACK_TACKLE = process.env.TRACK_TACKLE !== '0' || process.env.PERCEIVE_TRACK === '1';
export function chase(sim: PlaySim, a: Agent, target: Agent, horizon = 3, opts: { onTop?: boolean } = {}): MoveCommand {
  sim.lookAt(a, target);
  const look = (0.12 + 0.12 * (1 - a.r('awareness'))) / Math.max(0.1, a.profile.reactionTime);
  const seen = TRACK_TACKLE ? sim.track(a, target, 1, true) : sim.see(a, target, look);
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
  // OPEN_FIELD: on a runner in space he aims on top of him (inside-out, a cushion upfield), not at the intercept,
  // and the gather's arrival stays on top of him (onTopCushion), so it mirrors him.
  // LAST_LINE (open-field.ts): the deepest man on his side, with a teammate nearer and attacking, stays on top.
  const last = LAST_LINE && opts.onTop ? lastLinePoint(sim, a, target, seen, offset) : null;
  if (last) {
    a.tags.add('last-line');
    return ownApproach({ ...runThrough(a, last, { speed: 1 }), effort: 1 });
  }
  const top = opts.onTop ? onTopPoint(sim, a, target, seen, offset) : null;
  const topShift = opts.onTop ? onTopCushion(sim, a, target, seen, dist, contact) : 0;
  const { near, gather } = gatheringApproach(a, seen, contact, offset, topShift);
  const trace = sim.commandTraceFor?.(a);
  if (gather >= 1 && !sim.bond?.tacklers.includes(a)) {
    const command = ownApproach(near!);
    trace?.pursuit(target, { kind: 'chase', planner: 'bypassed-close-gather', requestedHorizon: horizon,
      observed: seen, distance: dist, contact, offset, gather, requests: [{ stage: 'close-gather', command }] });
    return command;
  }
  // Away from the ball, pursuit runs below top speed (more so for low motors).
  const effort = dist > 12 ? 0.75 + 0.2 * a.r('workRate') : 1;
  const request = { speed: effort, effort };
  const p = top ?? pursuitPoint(sim, a, target, horizon, request);
  const original = { ...runThrough(a, p, { speed: request.speed }), effort: request.effort };
  // A new grip may exist before its first solved load reaches body support.
  if (sim.bond?.tacklers.includes(a)) {
    trace?.pursuit(target, { kind: 'chase', planner: 'used', requestedHorizon: horizon, observed: seen,
      distance: dist, contact, offset, gather, requests: [{ stage: 'held-tackle', command: original }] });
    return original;
  }
  const chosen = chooseApproach(a, seen, contact, offset, original, sim.t,
    command => ownApproach(blendApproach(command, near, gather)));
  const command = PURSUE_AROUND ? aroundBodies(sim, a, target, seen, look, chosen) : chosen;
  trace?.pursuit(target, { kind: 'chase', planner: 'used', requestedHorizon: horizon, observed: seen,
    distance: dist, contact, offset, gather, requests: [{ stage: 'intercept-sprint', command: original },
      { stage: 'approach-and-gather', command: chosen }, { stage: 'around-bodies', command }] });
  return command;
}

/** A pursuer the runner has already passed works around an offensive body
 * on his path instead of running into it (getting off a block and
 * flattening to the ball). Only the requested path changes, from his own
 * acquired picture of that body; bodies still collide and a blocker can
 * still block him again. A defender in front of the runner, or engaged in a
 * block, keeps his request: taking on a lead blocker is a fit, not pursuit.
 * PURSUE_AROUND=0 restores the straight request for comparison. */
const PURSUE_AROUND = process.env.PURSUE_AROUND !== '0';
const AROUND_MARGIN = 0.15; // yd of clearance beyond the two bodies
const AROUND_LOOK = 0.5;    // s of travel at the requested speed

function aroundBodies(sim: PlaySim, a: Agent, target: Agent, runner: import('../perception.js').Perceived,
  look: number, command: MoveCommand): MoveCommand {
  if (a.engagement || a.isDown(sim.t)) return command;
  const v = command.vel, speed = Math.hypot(v.x, v.y);
  const rs = Math.hypot(runner.vel.x, runner.vel.y);
  if (speed < 1 || rs < 1) return command;
  // Only once the runner is past him: behind the runner along his travel.
  if (((a.pos.x - runner.pos.x) * runner.vel.x + (a.pos.y - runner.pos.y) * runner.vel.y) / rs > -0.5) return command;
  const ux = v.x / speed, uy = v.y / speed;
  const toRunner = Math.hypot(runner.pos.x - a.pos.x, runner.pos.y - a.pos.y);
  let block: { x: number; y: number; d: number; r: number } | null = null;
  for (const o of sim.opponents(a)) {
    if (o === target || o.isDown(sim.t)) continue;
    const seen = sim.see(a, o, look);
    const rx = seen.pos.x - a.pos.x, ry = seen.pos.y - a.pos.y, d = Math.hypot(rx, ry);
    const r = a.profile.radius + o.profile.radius + AROUND_MARGIN;
    const along = rx * ux + ry * uy;
    // On the straight path, ahead of him, nearer than the runner and within this look.
    if (along <= 0 || d >= toRunner || along > r + speed * AROUND_LOOK) continue;
    if (Math.abs(rx * uy - ry * ux) >= r) continue;
    if (!block || d < block.d) block = { x: rx, y: ry, d, r };
  }
  if (!block) return command;
  // The tangent past the body on the side nearer his own request; already in
  // contact, slide along it.
  const centre = Math.atan2(block.y, block.x);
  const half = block.d > block.r ? Math.asin(block.r / block.d) : Math.PI / 2;
  const want = Math.atan2(uy, ux);
  // Toward his request's side of the body; dead on, toward the runner's side
  // (a mirrored play is played the mirrored way).
  const side = angleDiff(centre, want) || angleDiff(centre, Math.atan2(runner.pos.y - a.pos.y, runner.pos.x - a.pos.x));
  const heading = centre + (side >= 0 ? half : -half);
  return { ...command, vel: { x: Math.cos(heading) * speed, y: Math.sin(heading) * speed }, facing: heading };
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

/** GAZE (Flex's field-of-view model, #417): name what this player watches this
 * tick. Optional so it is a no-op on builds without the model; where the model
 * is present it is itself a no-op with GAZE off. */
export function watch(sim: PlaySim, a: Agent, target: Agent | null | undefined): void {
  if (target) (sim as unknown as { lookAt?: (who: Agent, what: Agent) => void }).lookAt?.(a, target);
}
