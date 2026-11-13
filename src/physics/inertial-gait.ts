/** Finite-force stepping controller for the inertial support research world.
 * Not a World backend. Load transfer is prescribed and quasi-static; no claim
 * of solved flight, vertical ground contact, or articulated leg mechanics.
 */
import { add, sub, scale, dot, len, type Vec2 } from '../core/vec.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { FootId, SupportGrip } from './finite-support.js';
import { solveInertialSupportInterval, torsoPosition, torsoVelocity,
  type InertialSupportBody, type InertialSupportReport } from './inertial-support.js';

export interface InertialGait {
  body: InertialSupportBody;
  /** Controller priors, specified by the caller, not measured foot timings. */
  transferTime: number;
  trackingTime: number;
  /** Shared positive motor-work budget, kg yd²/s³. */
  power: number;
  phase: 'settled' | 'unloading' | 'swing' | 'loading';
  slot: FootId;
  elapsed: number;
  initialLoad: number;
  duration: number;
  start: Vec2;
  startVelocity: Vec2;
  target: Vec2;
  lateralSigns: [number, number];
  lastPlan?: { preferredStroke: number; attemptedStroke: number; stanceReachDeadline: number; fitsDeadline: boolean };
}
export interface InertialGaitReport {
  intervals: InertialSupportReport[];
  /** Observational context aligned with intervals. These loads are still
   * prescribed research shares, not solved vertical ground reactions. */
  intervalSupport: Array<{ phases: InertialGait['phase'][];
    modes: Array<Array<'plant' | 'swing'>>; prescribedLoads: number[][] }>;
  powerRetries: number;
  placements: Array<{ body: number; slot: FootId; actual: Vec2; target: Vec2; miss: Vec2 }>;
  plantStopSplits: number;
  /** Local kinetic-friction direction changes at nonzero foot speed.
   * A perpendicular velocity crossing is not reported as a physical stop. */
  slipDirectionSplits: number;
  gripBreakSplits: number;
}
export class InertialGaitError extends Error {
  constructor(message: string, readonly candidate: InertialSupportReport | null,
    readonly bodies: InertialSupportBody[], readonly grips: SupportGrip[],
    readonly phase: Array<{ phase: InertialGait['phase']; elapsed: number }>) {
    super(message); this.name = 'InertialGaitError';
  }
}
export function newInertialGait(body: InertialSupportBody,
  options: { transferTime: number; trackingTime: number; power: number }): InertialGait {
  if (![options.transferTime, options.trackingTime, options.power].every(x => x > 0 && Number.isFinite(x)))
    throw new RangeError('Finite positive gait timing and power required');
  const side = { x: -Math.sin(body.angle), y: Math.cos(body.angle) };
  return { body, ...options, phase: 'settled', slot: 0, elapsed: 0, initialLoad: 0,
    duration: 0, start: { ...body.slots[0].position }, startVelocity: { x: 0, y: 0 },
    target: { ...body.slots[0].position },
    lateralSigns: body.slots.map(f => dot(f.restOffset, side) < 0 ? -1 : 1) as [number, number] };
}

/** Broad actuator-power prior, not measured muscle power. The corresponding
 * linear COM force-speed curve peaks at legForce*vmax/4; internal swing work
 * is additional, so the research cap deliberately uses the full product. */
export function locomotorPowerPrior(profile: PhysicalProfile, body: InertialSupportBody): number {
  return body.legForce * Math.max(profile.vmax, profile.stepSpeed ?? 3.2);
}

/** Future landing may be outside today's reach. The actual foot remains
 * force-driven and reach-limited throughout; a target is never a teleport. */
export function requestInertialStep(gait: InertialGait, slot: FootId, target: Vec2, duration: number): void {
  if (![target.x, target.y, duration].every(Number.isFinite) || duration <= 0)
    throw new RangeError('Finite target and positive stroke duration required');
  if (gait.phase !== 'settled' || gait.body.slots.some(f => f.mode === 'swing'))
    throw new Error('A step is already in progress');
  gait.phase = 'unloading'; gait.slot = slot;
  gait.initialLoad = gait.body.slots[slot].load;
  gait.elapsed = gait.initialLoad === 0 ? gait.transferTime : 0;
  gait.duration = duration; gait.target = { ...target };
}

/** Reactive nominal stride planner. Triggered by achieved support geometry,
 * with future landing predicted from actual torso motion. The caller supplies
 * a stroke-time prior; it is not an outcome timer or a measured NFL cadence. */
export function planInertialStride(g: InertialGait, desiredVelocity: Vec2, strokeTime: number): boolean {
  if (![desiredVelocity.x, desiredVelocity.y, strokeTime].every(Number.isFinite) || strokeTime <= 0)
    throw new RangeError('Finite stride intent and positive timing required');
  if (g.phase !== 'settled') return false;
  const b = g.body, travel = torsoVelocity(b);
  // Braking still requires steps. The feet follow actual momentum when a
  // stop intent supplies no direction; stopping does not freeze support.
  const heading = len(desiredVelocity) >= .01 ? desiredVelocity : travel;
  if (len(heading) < .01) return false;
  const direction = scale(heading, 1 / len(heading)), torso = torsoPosition(b);
  const trailing = b.slots.reduce((chosen, f) =>
    dot(sub(f.position, torso), direction) < dot(sub(chosen.position, torso), direction) - 1e-10 ? f : chosen);
  if (trailing.load > 0 && dot(sub(trailing.position, torso), direction) > -.1 * b.reach) return false;
  const delay = trailing.load === 0 ? 0 : g.transferTime;
  const stance = b.slots[1 - trailing.id], stanceLeg = sub(stance.position, torso), speed2 = dot(travel, travel);
  const along = dot(stanceLeg, travel);
  const deadline = speed2 > 1e-8
    ? (along + Math.sqrt(Math.max(0, along * along - speed2 * (dot(stanceLeg, stanceLeg) - b.reach * b.reach)))) / speed2
    : Infinity;
  // This constant-velocity forecast is an attempted control plan, not a
  // guarantee: force limits or later contact may defeat the placement.
  const room = deadline - delay - g.transferTime;
  const attempted = Math.min(strokeTime, Math.max(g.trackingTime, room));
  g.lastPlan = { preferredStroke: strokeTime, attemptedStroke: attempted,
    stanceReachDeadline: deadline, fitsDeadline: room >= g.trackingTime };
  const predicted = add(torso, scale(travel, delay + attempted));
  const side = { x: -direction.y, y: direction.x };
  const width = len(trailing.restOffset);
  const target = add(add(predicted, scale(direction, .5 * b.reach)), scale(side, g.lateralSigns[trailing.id] * width));
  requestInertialStep(g, trailing.id, target, attempted);
  return true;
}

function setLoads(g: InertialGait, time: number): void {
  if (g.phase !== 'unloading' && g.phase !== 'loading') return;
  const fraction = Math.min(1, Math.max(0, time / g.transferTime));
  const load = g.phase === 'unloading' ? g.initialLoad * (1 - fraction) : fraction;
  g.body.slots[g.slot].load = load; g.body.slots[1 - g.slot].load = 1 - load;
}

/** Cubic stroke with actual initial velocity and a stationary landing aim.
 * It supplies acceleration intent only; attainable placement is solved. */
function stroke(g: InertialGait, time: number): { position: Vec2; velocity: Vec2; acceleration: Vec2 } {
  const T = g.duration, u = Math.min(1, Math.max(0, time / T));
  const delta = sub(g.target, g.start);
  return {
    position: add(add(g.start, scale(delta, 3 * u * u - 2 * u * u * u)),
      scale(g.startVelocity, T * (u - 2 * u * u + u * u * u))),
    velocity: add(scale(delta, (6 * u - 6 * u * u) / T),
      scale(g.startVelocity, 1 - 4 * u + 3 * u * u)),
    acceleration: add(scale(delta, (6 - 12 * u) / (T * T)),
      scale(g.startVelocity, (-4 + 6 * u) / T)),
  };
}

/** One physical force budget serves standing drive and swinging the feet.
 * The solver scales the sum of magnitudes, so corrective work reduces drive. */
export function inertialGaitForces(g: InertialGait, acceleration: Vec2, interval: number): Vec2[] {
  if (![acceleration.x, acceleration.y, interval].every(Number.isFinite) || interval <= 0)
    throw new RangeError('Finite acceleration and positive interval required');
  const b = g.body;
  return b.slots.map(f => {
    if (f.mode === 'plant') return scale(acceleration, -b.mass * f.load);
    const aim = stroke(g, g.elapsed), midpoint = stroke(g, g.elapsed + interval / 2), tau = g.trackingTime;
    // Feedback compares state and reference at the same instant. Comparing
    // a future reference to today's foot grants a resolution-dependent burst.
    const desired = add(midpoint.acceleration, add(scale(sub(aim.position, f.position), 1 / (tau * tau)),
      scale(sub(aim.velocity, b.footVelocity[f.id]), 2 / tau)));
    return scale(desired, b.footMass[f.id]);
  });
}

function transition(g: InertialGait, index: number, report: InertialGaitReport): void {
  const f = g.body.slots[g.slot];
  if (g.phase === 'unloading') {
    setLoads(g, g.transferTime); f.mode = 'swing'; f.load = 0;
    g.start = { ...f.position }; g.startVelocity = { ...g.body.footVelocity[f.id] };
    f.target = { ...g.target }; f.elapsed = 0; f.duration = g.duration;
    g.phase = 'swing'; g.elapsed = 0;
  } else if (g.phase === 'swing') {
    f.mode = 'plant'; f.load = 0;
    f.placement = { actual: { ...f.position }, target: { ...g.target }, miss: sub(f.position, g.target) };
    report.placements.push({ body: index, slot: f.id, ...structuredClone(f.placement) });
    g.phase = 'loading'; g.elapsed = 0;
  } else if (g.phase === 'loading') {
    setLoads(g, g.transferTime); g.phase = 'settled'; g.elapsed = 0;
  }
}
function restoreBody(body: InertialSupportBody, saved: InertialSupportBody): void {
  const slots = body.slots;
  Object.assign(body, structuredClone(saved));
  body.slots = slots;
  slots.forEach((slot, i) => {
    for (const key of Object.keys(slot)) if (!(key in saved.slots[i])) delete (slot as unknown as Record<string, unknown>)[key];
    Object.assign(slot, structuredClone(saved.slots[i]));
  });
}
function restoreGrip(grip: SupportGrip, saved: SupportGrip): void {
  for (const key of Object.keys(grip)) if (!(key in saved)) delete (grip as unknown as Record<string, unknown>)[key];
  Object.assign(grip, structuredClone(saved));
}

/** Atomic event-split research tick. Failed solves cannot become a gait state.
 * Power retries use the same initial state and do not grant extra work. */
export function advanceInertialGaits(gaits: InertialGait[], grips: SupportGrip[], dt: number,
  accelerations: Vec2[], options: { maxInterval: number;
    /** Known external load on each material torso, kg*yd/s². Every local
     * trial integrates it over its own duration, including event splits. */
    externalTorsoForces?: Vec2[] } ): InertialGaitReport {
  if (!(dt > 0 && Number.isFinite(dt)) || !(options.maxInterval > 0 && Number.isFinite(options.maxInterval))
    || accelerations.length !== gaits.length) throw new RangeError('Valid gait tick and acceleration per body required');
  const external = options.externalTorsoForces ?? gaits.map(() => ({ x: 0, y: 0 }));
  if (external.length !== gaits.length || external.some(v => ![v.x, v.y].every(Number.isFinite)))
    throw new RangeError('Finite external torso force per body required');
  const savedBodies = gaits.map(g => structuredClone(g.body));
  const savedGaits = gaits.map(g => structuredClone({ ...g, body: undefined }));
  const savedGrips = structuredClone(grips);
  const report: InertialGaitReport = { intervals: [], intervalSupport: [], powerRetries: 0, placements: [], plantStopSplits: 0,
    slipDirectionSplits: 0, gripBreakSplits: 0 };
  let lastCandidate: InertialSupportReport | null = null;
  try {
    let remaining = dt;
    while (remaining > 1e-12) {
      for (let i = 0; i < gaits.length; i++) {
        const g = gaits[i], end = g.phase === 'swing' ? g.duration : g.transferTime;
        if (g.phase !== 'settled' && end - g.elapsed <= 1e-12) transition(g, i, report);
      }
      let h = Math.min(options.maxInterval, remaining);
      for (const g of gaits) if (g.phase !== 'settled')
        h = Math.min(h, (g.phase === 'swing' ? g.duration : g.transferTime) - g.elapsed);
      const initial = gaits.map(g => structuredClone(g.body));
      const initialGrips = structuredClone(grips);
      const directions = initial.map(b => b.slots.map(f => {
        const v = b.footVelocity[f.id], speed = len(v);
        return f.mode === 'plant' && speed > 1e-7 ? scale(v, 1 / speed) : null;
      }));
      const needsSlipSplit = (solved: InertialSupportReport, i: number, f: number): boolean => {
        if (directions[i][f] === null) return false;
        const impulse = solved.slotGroundImpulse[i][f], size = len(impulse);
        if (size === 0) return false;
        const friction = scale(impulse, 1 / size), end = solved.slotEndVelocity[i][f];
        // Midpoint friction must oppose the actual travel. If it would aid
        // motion at either end, update its direction locally. A crossing
        // perpendicular to the INITIAL velocity alone is not a stop.
        return dot(initial[i].footVelocity[f], friction) > 1e-11 || dot(end, friction) > 1e-11
          || (len(solved.slotMeanVelocity[i][f]) < 1e-12 && len(end) > 1e-7);
      };
      const crossesStop = (solved: InertialSupportReport): boolean => directions.some((ds, i) =>
        ds.some((_, f) => needsSlipSplit(solved, i, f)));
      const crossesBreak = (solved: InertialSupportReport): boolean => solved.gripBrokenAtEnd.some(Boolean);
      const crossesEvent = (solved: InertialSupportReport): boolean => crossesStop(solved) || crossesBreak(solved);
      const trial = (duration: number): InertialSupportReport => {
        const scales = gaits.map(() => 1);
        for (let attempt = 0; attempt < 24; attempt++) {
          gaits.forEach((g, i) => restoreBody(g.body, initial[i]));
          grips.forEach((g, i) => restoreGrip(g, initialGrips[i]));
          gaits.forEach(g => setLoads(g, g.elapsed + duration / 2));
          const forces = gaits.map((g, i) => inertialGaitForces(g, accelerations[i], duration));
          const solved = solveInertialSupportInterval(gaits.map(g => g.body), grips, duration,
            forces.map((fs, i) => fs.map(f => scale(f, scales[i]))), external.map(force => scale(force, duration)),
            { slidingDirections: directions, slidingFriction: 'midpoint', staticGround: 'endpoint', gripModel: 'tether' });
          lastCandidate = solved;
          if (solved.maxImpulseChange > 1e-9 || solved.maxReachViolation > 1e-7
            || solved.maxUncappedHoldDistanceViolation > 1e-7)
            throw new Error(`Inertial gait solve rejected after ${solved.iterations} iterations`);
          // A long sliding trial may cross zero and then do positive work.
          // It is a rejected candidate, usable only to bracket the earlier
          // physical stop. It never becomes an accepted trajectory interval.
          if (solved.maxPassiveGripWork > 1e-7 || solved.maxPassiveReachWork > 1e-7
            || (!solved.converged && !crossesStop(solved)))
            throw new Error('Inertial gait passive constraint rejected');
          const positive = solved.slotMotorWork.map(ws => ws.reduce((sum, w) => sum + Math.max(0, w), 0));
          if (positive.every((work, i) => work <= gaits[i].power * duration + 1e-9)) return solved;
          report.powerRetries++;
          positive.forEach((work, i) => { if (work > gaits[i].power * duration) scales[i] *= Math.min(.9, gaits[i].power * duration / work); });
        }
        throw new Error('Inertial gait motor-power solve rejected');
      };
      let solved = trial(h);
      let breaks: boolean[] | null = null;
      if (crossesEvent(solved)) {
        if (report.plantStopSplits + report.slipDirectionSplits + report.gripBreakSplits >= 128)
          throw new Error('Inertial gait local contact-event limit exceeded');
        // Root finding re-solves ALL feet, grips and reach constraints. An
        // isolated mass*velocity stopping impulse would miss their coupling.
        let lo = 0, hi = h;
        for (let iteration = 0; iteration < 34; iteration++) {
          const mid = (lo + hi) / 2, candidate = trial(mid);
          if (crossesEvent(candidate)) hi = mid; else lo = mid;
        }
        if (!(lo > 1e-12)) throw new Error('Inertial gait unresolved zero-duration stop event');
        const crossed = trial(hi);
        breaks = crossed.gripBrokenAtEnd;
        if (crossesStop(crossed)) {
          const actuallyStopped = directions.some((ds, i) => ds.some((d, f) => d
            && needsSlipSplit(crossed, i, f)
            && len(crossed.slotEndVelocity[i][f]) <= 1e-7));
          if (actuallyStopped) report.plantStopSplits++;
          else report.slipDirectionSplits++;
        }
        if (crossesBreak(crossed)) report.gripBreakSplits++;
        h = lo; solved = trial(h);
      }
      if (!solved.converged) throw new Error('Inertial gait accepted interval is not passive');
      report.intervals.push(solved);
      report.intervalSupport.push({ phases: gaits.map(g => g.phase),
        modes: gaits.map(g => g.body.slots.map(f => f.mode)),
        prescribedLoads: gaits.map(g => g.body.slots.map(f => f.load)) });
      // Work belongs to the interval up to the first reach crossing. Release
      // afterward; a break never erases force or work already transmitted.
      breaks?.forEach((broken, i) => { if (broken) grips[i].broken = true; });
      for (const g of gaits) if (g.phase !== 'settled') {
        g.elapsed += h;
        if (g.phase === 'swing') g.body.slots[g.slot].elapsed = g.elapsed;
        setLoads(g, g.elapsed);
      }
      remaining -= h;
    }
    for (let i = 0; i < gaits.length; i++) {
      const g = gaits[i], end = g.phase === 'swing' ? g.duration : g.transferTime;
      if (g.phase !== 'settled' && end - g.elapsed <= 1e-12) transition(g, i, report);
    }
    return report;
  } catch (error) {
    const failure = new InertialGaitError(error instanceof Error ? error.message : String(error), lastCandidate,
      gaits.map(g => structuredClone(g.body)), structuredClone(grips), gaits.map(g => ({ phase: g.phase, elapsed: g.elapsed })));
    gaits.forEach((g, i) => { restoreBody(g.body, savedBodies[i]); Object.assign(g, savedGaits[i], { body: g.body }); });
    grips.forEach((g, i) => restoreGrip(g, savedGrips[i]));
    throw failure;
  }
}
