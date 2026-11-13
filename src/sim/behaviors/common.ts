/** Steering helpers shared by behaviors. */
import { FIELD_WIDTH } from '../../core/field.js';
import { angleDiff, angleOf, clamp, norm, type Vec2 } from '../../core/vec.js';
import { arriveVelocity, fatigueFactor, followAccel, movingArrivalVelocity, type MoveCommand } from '../../physics/kinematics.js';
import { availability, supportParams } from '../../physics/support.js';
import { interceptPoint, timeToReach, type SprintRequest } from '../../physics/reach.js';
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
export function pursuitPoint(sim: PlaySim, a: Agent, target: Agent, horizon = 3,
  request?: SprintRequest): Vec2 {
  // INTERCEPT_COURSE: a cut reaches his forecast later the lower his anticipation.
  const delay = (0.12 + 0.12 * (1 - a.r('awareness'))) / Math.max(0.1, a.profile.reactionTime)
    * (INTERCEPT_COURSE && !process.env.IC_NODELAY ? 1 + 0.8 * (1 - a.r('anticipation')) : 1);
  const seen = sim.see(a, target, delay);
  const est = INTERCEPT_COURSE && !process.env.IC_NOEST ? estimateError(sim, a) : null;
  const sp = Math.hypot(seen.vel.x, seen.vel.y) * (est ? 1 + est.speed : 1);
  const heading = sp > 0.1 ? (est ? rotate(norm(seen.vel), est.heading) : norm(seen.vel)) : { x: 0, y: 0 };
  const older = sim.see(a, target, delay + 0.2 / Math.max(0.1, a.profile.reactionTime));
  // Over the time actually between the two pictures he holds, which attention
  // can stretch past the 0.2 s asked for; two pictures of the same moment show
  // no acceleration.
  const interval = (older.age ?? 0) - (seen.age ?? 0);
  const acceleration = interval > 1e-9 ? clamp((sp - Math.hypot(older.vel.x, older.vel.y)) / interval,
    -target.profile.brake, Math.max(0, (target.profile.vmax - sp) / target.profile.tau)) : 0;
  // Recent acceleration is evidence for a short burst, not a promise of full
  // speed throughout the horizon. Reassess as new motion becomes visible.
  const tau = 0.3 + 0.3 * a.r('anticipation');
  const V = clamp(sp + acceleration * tau, 0, target.profile.vmax);
  const path = (t: number): Vec2 => {
    const d = V * t - (V - sp) * tau * (1 - Math.exp(-t / tau));
    return { x: seen.pos.x + heading.x * d, y: clamp(seen.pos.y + heading.y * d, 0, FIELD_WIDTH) };
  };
  const reach = a.profile.radius + target.profile.radius + a.profile.reach * 0.75;
  const trace = sim.commandTraceFor?.(a);
  const tk = Number(process.env.IC_TAUK ?? 1);
  const mover = { pos: a.pos, vel: a.vel, profile: INTERCEPT_COURSE && tk !== 1 ? { ...a.profile, tau: a.profile.tau * tk } : a.profile, speedScale: a.speedScale };
  const ip = interceptPoint(mover, path, { horizon, step: 0.1, radius: reach, request, recordSamples: !!trace });
  let bias = angleBias.get(a);
  if (bias === undefined) {
    // The intercept already forecasts from acquired motion. Delayed cues
    // can miss a cut, but straight motion is dead-reckoned forward. Do not
    // subtract another skill-based time offset from every interception.
    bias = sim.rng.fork(`pursuit:${a.idx}`).normal(0, 0.12 * (1.2 - a.r('pursuit')));
    angleBias.set(a, bias);
  }
  const biasedTime = clamp(ip.t - bias, 0, horizon);
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

/** INTERCEPT_COURSE (experimental, off): a pursuer runs the intercept at a
 * speed he can turn onto it at, from his own forecast of the carrier.
 * Measured (pursuit.py / pursuit-planner.mts): the planner asked for roughly
 * the NFL's course (pass, level 5-10 yd: 36 deg ahead of the man vs NFL 34)
 * but at a sprint (9.8 yd/s), so the body could not turn onto it and the
 * achieved course lagged 10-12 deg back toward the man (24 deg; NFL runs it at
 * 5.5 yd/s), a tail chase. Three parts, all his own:
 *  - his forecast of the carrier's heading and speed carries an error that
 *    wanders with time (ESTIMATE_TAU), sized by pursuit and play recognition,
 *    and a cut reaches it later the lower his anticipation;
 *  - he asks for the speed at which his judged cut capacity turns him onto
 *    the course within half the run to it; his judgment of that capacity is
 *    off by a per-play error sized by pursuit (too fast over-runs it, too
 *    slow throttles early);
 *  - he holds the planned course until his picture of the carrier changes
 *    past COURSE_MARGIN (heading or speed) or he is near the point.
 * Error sizes are ESTIMATED until the NFL within-position spread is in. */
export const INTERCEPT_COURSE = process.env.INTERCEPT_COURSE === '1';
const ESTIMATE_TAU = 0.5, HEADING_SIGMA = 10 * Math.PI / 180, SPEED_SIGMA = 0.12, CAPACITY_SIGMA = 0.25;
const COURSE_HEADING_MARGIN = 12 * Math.PI / 180, COURSE_SPEED_MARGIN = 1.0, TURN_SHARE = 0.5;
const estimates = new WeakMap<Agent, { t: number; heading: number; speed: number }>();
const capacityJudgment = new WeakMap<Agent, number>();
const heldCourse = new WeakMap<Agent, { point: Vec2; heading: number; speed: number; target: Agent }>();

function rotate(v: Vec2, a: number): Vec2 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/** His forecast error of the carrier's motion: an Ornstein-Uhlenbeck wander
 * (correlated in time), larger the lower his pursuit and play recognition. */
function estimateError(sim: PlaySim, a: Agent): { heading: number; speed: number } {
  const skill = 0.5 * (a.r('pursuit') + a.r('playRecognition'));
  const sh = HEADING_SIGMA * (1.2 - skill), ss = SPEED_SIGMA * (1.2 - skill);
  const prev = estimates.get(a);
  const rng = sim.rng.fork(`pursuit-estimate:${a.idx}:${Math.round(sim.t * 20)}`);
  if (!prev) {
    const e = { t: sim.t, heading: rng.normal(0, sh), speed: rng.normal(0, ss) };
    estimates.set(a, e); return e;
  }
  const dt = Math.max(0, sim.t - prev.t);
  if (dt > 0) {
    const k = Math.exp(-dt / ESTIMATE_TAU), w = Math.sqrt(1 - k * k);
    prev.heading = prev.heading * k + rng.normal(0, sh) * w;
    prev.speed = prev.speed * k + rng.normal(0, ss) * w;
    prev.t = sim.t;
  }
  return prev;
}

/** INTERCEPT_COURSE: the speed (fraction of his top speed) at which he judges
 * he can turn from his current velocity onto the line to `p` within half the
 * run to it: a turn of dTheta at speed s takes dTheta * s / lateral, the run
 * d / s, so s = sqrt(TURN_SHARE * d * lateral / dTheta). */
export function holdableSpeed(sim: PlaySim, a: Agent, p: Vec2): number {
  const dx = p.x - a.pos.x, dy = p.y - a.pos.y, d = Math.hypot(dx, dy);
  const v = Math.hypot(a.vel.x, a.vel.y);
  if (v < 1 || d < 1) return 1;
  const turn = Math.abs(angleDiff(angleOf(a.vel), Math.atan2(dy, dx)));
  if (turn < 0.15) return 1;
  let judged = capacityJudgment.get(a);
  if (judged === undefined) {
    judged = sim.rng.fork(`pursuit-capacity:${a.idx}`).normal(0, CAPACITY_SIGMA * (1.15 - a.r('pursuit')));
    capacityJudgment.set(a, judged);
  }
  const lateral = a.profile.lateral * Math.max(0.3, 1 + judged);
  const s = Math.sqrt(TURN_SHARE * d * lateral / turn);
  return clamp(s / (a.profile.vmax * a.speedScale), 0.45, 1);
}

/** INTERCEPT_COURSE: keep the planned point until his picture of the carrier
 * changes past the margin, the target changes, or he is near the point. */
export function holdCourse(a: Agent, target: Agent, seen: { vel: Vec2 }, fresh: Vec2): Vec2 {
  const sp = Math.hypot(seen.vel.x, seen.vel.y), hd = Math.atan2(seen.vel.y, seen.vel.x);
  const held = heldCourse.get(a);
  if (held && held.target === target && Math.hypot(held.point.x - a.pos.x, held.point.y - a.pos.y) > 2
    && Math.abs(angleDiff(held.heading, hd)) < COURSE_HEADING_MARGIN && Math.abs(held.speed - sp) < COURSE_SPEED_MARGIN)
    return held.point;
  heldCourse.set(a, { point: { ...fresh }, heading: hd, speed: sp, target });
  return fresh;
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
  sim.lookAt(a, target);
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
  let p = pursuitPoint(sim, a, target, horizon, request);
  if (INTERCEPT_COURSE) {
    if (!process.env.IC_NOHOLD) p = holdCourse(a, target, seen, p);
    if (!process.env.IC_NOSPEED) request.speed = Math.min(request.speed, holdableSpeed(sim, a, p));
  }
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
