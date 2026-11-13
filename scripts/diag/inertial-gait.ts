/**
 * Exploratory inertial-foot gait panel. This is not a calibrated NFL gait.
 * Run from the repository root after building: node dist/scripts/diag/inertial-gait.js [out.json].
 * Engine quantities remain kg, yards, seconds; prescribed foot fractions,
 * transfer/tracking/stroke timings and actuator power are explicit priors.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Vec2 } from '../../src/core/vec.js';
import type { PhysicalProfile } from '../../src/players/physical.js';
import { newInertialSupport, torsoPosition, torsoVelocity,
  type InertialSupportBody, type InertialSupportReport } from '../../src/physics/inertial-support.js';
import { advanceInertialGaits, locomotorPowerPrior, newInertialGait,
  InertialGaitError, planInertialStride, requestInertialStep, type InertialGait, type InertialGaitReport } from '../../src/physics/inertial-gait.js';
import { sourceVersion } from '../source-version.js';
import type { SupportGrip } from '../../src/physics/finite-support.js';

const profile: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5 };
const zero = (): Vec2 => ({ x: 0, y: 0 });
const norm = (v: Vec2): number => Math.hypot(v.x, v.y);
const plus = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
const times = (a: Vec2, k: number): Vec2 => ({ x: a.x * k, y: a.y * k });
const unit = (v: Vec2): Vec2 => norm(v) > 1e-12 ? times(v, 1 / norm(v)) : zero();
const rotate = (v: Vec2, angle: number): Vec2 => ({ x: v.x * Math.cos(angle) - v.y * Math.sin(angle), y: v.x * Math.sin(angle) + v.y * Math.cos(angle) });
const vec = (v: Vec2) => [v.x, v.y] as const;
const f = (n: number): number => Number(n.toPrecision(9));

// One shared explicit gait configuration for every scenario and perturbation.
const gaitPrior = { transferTime: .04, trackingTime: .05, strokeTime: .18 };
const fractions = [.01, .020842, .04];
const timeSteps = [.01, .005, .0025];
const pushPulseDuration = .01;
const sourceSha256AtStart = sourceVersion();
const diagnosticPath = 'scripts/diag/inertial-gait.ts';
const diagnosticSha256AtStart = createHash('sha256').update(readFileSync(diagnosticPath)).digest('hex');
const transforms = [{ name: 'identity', shift: { x: 0, y: 0 }, mirror: false },
  { name: 'mirror_translate', shift: { x: 7.25, y: -3.5 }, mirror: true }];
type Kind = 'accelerate' | 'brake' | 'cut' | 'push_recovery' | 'held_step';
interface Scenario { name: string; kind: Kind; targetSpeed?: number; angle?: number; duration: number; strength?: number; holdCapacity?: number }
const scenarios: Scenario[] = [
  ...[3, 5, 7].map(targetSpeed => ({ name: `accel_${targetSpeed}yds`, kind: 'accelerate' as const, targetSpeed, duration: 2 })),
  { name: 'brake_from_5', kind: 'brake', targetSpeed: 5, duration: 2.5 },
  { name: 'cut_45_toward_3', kind: 'cut', targetSpeed: 3, angle: Math.PI / 4, duration: 2.5 },
  { name: 'cut_90_toward_3', kind: 'cut', targetSpeed: 3, angle: Math.PI / 2, duration: 2.5 },
  { name: 'at_rest_push_recovery', kind: 'push_recovery', duration: 1.5 },
  ...[.15, .5, 1].flatMap(strength => [0, 150, 900].map(holdCapacity => ({
    name: `held_step_${strength}_grip${holdCapacity}`, kind: 'held_step' as const, duration: 1.5, strength, holdCapacity }))),
];
let firstRejectionWitness: Record<string, unknown> | null = null;

function failureWitness(error: unknown): Record<string, unknown> {
  if (!(error instanceof InertialGaitError)) return { message: String(error), candidate: null };
  const c = error.candidate;
  return { message: error.message, phase: error.phase, bodies: error.bodies, grips: error.grips,
    candidate: candidateWitness(c) };
}
function candidateWitness(c: InertialSupportReport | null): Record<string, unknown> | null {
  return c ? { dt: c.dt, iterations: c.iterations, converged: c.converged, maxImpulseChange: c.maxImpulseChange,
      energyBefore: c.energyBefore, energyAfter: c.energyAfter, motorWork: c.motorWork, rotorWork: c.rotorWork,
      groundWork: c.groundWork, gripWork: c.gripWork, reachWork: c.reachWork, externalWork: c.externalWork,
      workResidual: c.workResidual, momentumResidual: c.momentumResidual, angularMomentumBefore: c.angularMomentumBefore,
      angularMomentumAfter: c.angularMomentumAfter, angularMomentumResidual: c.angularMomentumResidual,
      unrepresentedAngularImpulse: c.unrepresentedAngularImpulse, maxReachViolation: c.maxReachViolation,
      maxPassiveWork: c.maxPassiveWork, groundStopping: c.groundStopping,
      gripModel: c.gripModel, gripSlips: c.gripSlips, gripBrokenAtEnd: c.gripBrokenAtEnd,
      maxHoldDistanceViolation: c.maxHoldDistanceViolation,
      maxUncappedHoldDistanceViolation: c.maxUncappedHoldDistanceViolation,
      slotGroundImpulse: c.slotGroundImpulse, slotReachImpulse: c.slotReachImpulse,
      slotEndVelocity: c.slotEndVelocity, slotMeanVelocity: c.slotMeanVelocity } : null;
}
function intervalContractFailure(r: InertialSupportReport): string | null {
  if (!r.converged) return 'solver nonconverged';
  if (r.maxReachViolation > 1e-7) return 'finite reach violation';
  if (r.maxPassiveWork > 1e-7) return 'positive passive work';
  if (Math.abs(r.workResidual) > 1e-8) return 'work closure residual';
  if (norm(r.momentumResidual) > 1e-8) return 'linear momentum residual';
  if (Math.abs(r.angularMomentumResidual) > 1e-8) return 'angular momentum residual';
  return null;
}
function restoreBodies(targets: InertialSupportBody[], saved: InertialSupportBody[]): void {
  targets.forEach((body, i) => {
    const slots = body.slots;
    Object.assign(body, structuredClone(saved[i])); body.slots = slots;
    slots.forEach((slot, j) => {
      for (const key of Object.keys(slot)) if (!(key in saved[i].slots[j])) delete (slot as unknown as Record<string, unknown>)[key];
      Object.assign(slot, structuredClone(saved[i].slots[j]));
    });
  });
}
function restoreGrips(targets: SupportGrip[], saved: SupportGrip[]): void {
  targets.forEach((grip, i) => {
    for (const key of Object.keys(grip)) if (!(key in saved[i])) delete (grip as unknown as Record<string, unknown>)[key];
    Object.assign(grip, structuredClone(saved[i]));
  });
}
function restoreGaits(targets: InertialGait[], saved: InertialGait[], bodies: InertialSupportBody[]): void {
  targets.forEach((gait, i) => Object.assign(gait, structuredClone(saved[i]), { body: bodies[i] }));
}
function gaitSnapshot(gaits: InertialGait[]): InertialGait[] {
  return gaits.map(gait => structuredClone({ ...gait, body: undefined }) as unknown as InertialGait);
}
function reportWitness(message: string, report: InertialSupportReport, bodies: InertialSupportBody[], grips: SupportGrip[], phase: string): Record<string, unknown> {
  return { message, phase, bodies: structuredClone(bodies), grips: structuredClone(grips), candidate: candidateWitness(report) };
}

interface Row {
  scenario: string; fraction: number; dt: number; transform: string;
  elapsed: number; cutSpeedAtCue: number | null; stepsRequested: number; stepsCompleted: number; rejected: number;
  gripCount: number; brokenGrips: number;
  gripModels: string[]; gripSlips: number;
  maxAcceptedHoldDistanceViolation: number; maxAcceptedUncappedHoldDistanceViolation: number;
  maxRejectedHoldDistanceViolation: number; maxRejectedUncappedHoldDistanceViolation: number;
  plantStopSplits: number; slipDirectionSplits: number; gripBreakSplits: number;
  finalPhase: string; finalVelocity: readonly [number, number]; finalTorso: readonly [number, number];
  lastPlan: InertialGait['lastPlan'] | null;
  feet: Array<{ id: number; position: readonly [number, number]; velocity: readonly [number, number]; mode: string; load: number }>;
  placements: Array<{ body: number; slot: number; actual: readonly [number, number]; target: readonly [number, number]; miss: readonly [number, number]; missLength: number }>;
  maximumFootSpeed: number; maximumPlantedLoadedSlipSpeed: number; plantedLoadedSlipDistance: number; finalPlantSlipSpeed: number; maximumPlacementMiss: number;
  maximumLoadedSlipContext: { time: number; phase: InertialGait['phase']; slot: number; prescribedLoad: number; speedYdS: number; intervalDt: number } | null;
  loadedSlipByPhase: Record<InertialGait['phase'], { loadedFootSeconds: number; distanceYd: number; maxSpeedYdS: number; intervals: number }>;
  pushDuration: number; externalPushImpulse: readonly [number, number]; externalPushForce: readonly [number, number];
  motorWork: number; rotorWork: number; groundWork: number; gripWork: number; reachWork: number; externalWork: number;
  workResidual: number; momentumResidual: number; angularMomentumResidual: number;
  unrepresentedAngularImpulse: number; unrepresentedGripAngularImpulse: number; unrepresentedGripAngularIntervals: number;
  powerRetries: number; solverIntervals: number;
  issueCounts: Record<string, number>;
  trajectory: Array<{ time: number; torsoPosition: readonly [number, number]; torsoVelocity: readonly [number, number];
    footPositions: Array<readonly [number, number]>; footVelocities: Array<readonly [number, number]> }>;
}
function run(s: Scenario, fraction: number, dt: number, transform: typeof transforms[number]): Row {
  // Mirror along x and use a pi body heading so lateral gait chirality follows
  // the reflected heading while the world-space rest offsets stay unchanged.
  const mirror = (v: Vec2): Vec2 => ({ x: transform.mirror ? -v.x : v.x, y: v.y });
  const translate = (v: Vec2): Vec2 => plus(mirror(v), transform.shift);
  const runner = newInertialSupport(profile, translate(zero()), { footMassFractions: [fraction, fraction] });
  if (transform.mirror) Object.assign(runner, { angle: Math.PI });
  const held = s.kind === 'held_step';
  const holder = held ? newInertialSupport(profile, plus(runner.slots[0].position, { x: transform.mirror ? .25 : -.25, y: 0 }),
    { footMassFractions: [fraction, fraction] }) : undefined;
  if (holder && transform.mirror) Object.assign(holder, { angle: Math.PI });
  const bodies: InertialSupportBody[] = holder ? [holder, runner] : [runner];
  const runnerIndex = holder ? 1 : 0;
  const gaits: InertialGait[] = bodies.map(body => newInertialGait(body,
    { ...gaitPrior, power: locomotorPowerPrior(profile, body) }));
  const gait = gaits[runnerIndex];
  const grips: SupportGrip[] = held ? [{ a: { body: 0, slot: 0, share: 0 }, b: { body: 1, slot: 0, share: 1 },
    capacity: s.holdCapacity ?? 0, holdDistance: .1, reach: 1.25 }] : [];
  const placements: Row['placements'] = [];
  const issues: Record<string, number> = {};
  let motorWork = 0, rotorWork = 0, groundWork = 0, gripWork = 0, reachWork = 0, externalWork = 0;
  let workResidual = 0, momentumResidual = 0, angularMomentumResidual = 0, unrepresentedAngularImpulse = 0;
  let unrepresentedGripAngularImpulse = 0, unrepresentedGripAngularIntervals = 0, infeasiblePlans = 0;
  let powerRetries = 0, solverIntervals = 0, requested = 0, completed = 0, rejected = 0, maxFootSpeed = 0;
  let maxPlantSlipSpeed = 0, plantedLoadedSlipDistance = 0, advancedTime = 0, cutSpeedAtCue: number | null = null;
  let maximumLoadedSlipContext: Row['maximumLoadedSlipContext'] = null;
  const loadedSlipByPhase: Row['loadedSlipByPhase'] = {
    settled: { loadedFootSeconds: 0, distanceYd: 0, maxSpeedYdS: 0, intervals: 0 },
    unloading: { loadedFootSeconds: 0, distanceYd: 0, maxSpeedYdS: 0, intervals: 0 },
    swing: { loadedFootSeconds: 0, distanceYd: 0, maxSpeedYdS: 0, intervals: 0 },
    loading: { loadedFootSeconds: 0, distanceYd: 0, maxSpeedYdS: 0, intervals: 0 },
  };
  const gripModels = new Set<string>(); let gripSlips = 0, plantStopSplits = 0, slipDirectionSplits = 0;
  let maxAcceptedHoldDistanceViolation = 0, maxAcceptedUncappedHoldDistanceViolation = 0, gripBreakSplits = 0;
  let maxRejectedHoldDistanceViolation = 0, maxRejectedUncappedHoldDistanceViolation = 0;
  const trajectory: Row['trajectory'] = [];
  const recordTrajectory = (): void => { trajectory.push({ time: advancedTime, torsoPosition: vec(torsoPosition(runner)),
    torsoVelocity: vec(torsoVelocity(runner)), footPositions: runner.slots.map(slot => vec(slot.position)),
    footVelocities: runner.slots.map(slot => vec(runner.footVelocity[slot.id])) }); };
  recordTrajectory();
  const accountHold = (r: InertialSupportReport, accepted: boolean): void => {
    if (accepted) {
      maxAcceptedHoldDistanceViolation = Math.max(maxAcceptedHoldDistanceViolation, r.maxHoldDistanceViolation);
      maxAcceptedUncappedHoldDistanceViolation = Math.max(maxAcceptedUncappedHoldDistanceViolation, r.maxUncappedHoldDistanceViolation);
    } else {
      maxRejectedHoldDistanceViolation = Math.max(maxRejectedHoldDistanceViolation, r.maxHoldDistanceViolation);
      maxRejectedUncappedHoldDistanceViolation = Math.max(maxRejectedUncappedHoldDistanceViolation, r.maxUncappedHoldDistanceViolation);
    }
  };
  const accountGaitReport = (report: InertialGaitReport, timeStart: number): void => {
    solverIntervals += report.intervals.length; powerRetries += report.powerRetries;
    plantStopSplits += report.plantStopSplits; slipDirectionSplits += report.slipDirectionSplits;
    gripBreakSplits += report.gripBreakSplits;
    for (const p of report.placements) {
      placements.push({ slot: p.slot, body: p.body, actual: vec(p.actual), target: vec(p.target), miss: vec(p.miss), missLength: f(norm(p.miss)) });
      completed++;
    }
    let intervalElapsed = 0;
    for (let index = 0; index < report.intervals.length; index++) {
      const r = report.intervals[index], support = report.intervalSupport[index];
      motorWork += r.motorWork; rotorWork += r.rotorWork; groundWork += r.groundWork; gripWork += r.gripWork;
      reachWork += r.reachWork; externalWork += r.externalWork; workResidual += r.workResidual;
      momentumResidual = Math.max(momentumResidual, norm(r.momentumResidual));
      angularMomentumResidual = Math.max(angularMomentumResidual, Math.abs(r.angularMomentumResidual));
      unrepresentedAngularImpulse += Math.abs(r.unrepresentedAngularImpulse.total);
      const gripImpulse = Math.abs(r.unrepresentedAngularImpulse.grip);
      unrepresentedGripAngularImpulse += gripImpulse;
      if (gripImpulse > 1e-12) unrepresentedGripAngularIntervals++;
      gripModels.add(r.gripModel); gripSlips += r.gripSlips.filter(Boolean).length;
      accountHold(r, true);
      maxFootSpeed = Math.max(maxFootSpeed, ...r.slotMeanVelocity[runnerIndex].map(norm));
      const phase = support.phases[runnerIndex], phaseSlip = loadedSlipByPhase[phase];
      let phaseAdded = false;
      for (let slot = 0; slot < 2; slot++) {
        if (support.modes[runnerIndex][slot] !== 'plant' || support.prescribedLoads[runnerIndex][slot] <= 0) continue;
        const speed = norm(r.slotMeanVelocity[runnerIndex][slot]), distance = speed * r.dt;
        maxPlantSlipSpeed = Math.max(maxPlantSlipSpeed, speed);
        plantedLoadedSlipDistance += distance;
        phaseSlip.loadedFootSeconds += r.dt; phaseSlip.distanceYd += distance;
        phaseSlip.maxSpeedYdS = Math.max(phaseSlip.maxSpeedYdS, speed); phaseAdded = true;
        if (maximumLoadedSlipContext === null || speed > maximumLoadedSlipContext.speedYdS)
          maximumLoadedSlipContext = { time: f(timeStart + intervalElapsed + r.dt / 2), phase, slot,
            prescribedLoad: support.prescribedLoads[runnerIndex][slot], speedYdS: f(speed), intervalDt: r.dt };
      }
      if (phaseAdded) phaseSlip.intervals++;
      intervalElapsed += r.dt;
    }
  };
  let stopAfterPush = false;
  const pushImpulse = s.kind === 'push_recovery'
    ? { x: runner.mass * .75 * (transform.mirror ? -1 : 1), y: 0 }
    : s.kind === 'held_step' ? { x: runner.mass * .45 * (s.strength ?? 0) * (transform.mirror ? -1 : 1), y: 0 } : zero();
  if (s.kind === 'held_step') {
    const slot = 0 as const, direction = { x: transform.mirror ? -1 : 1, y: 0 };
    const target = plus(plus(torsoPosition(runner), times(direction, .5 * runner.reach)), { x: 0, y: runner.slots[slot].restOffset.y });
    requestInertialStep(gait, slot, target, gaitPrior.strokeTime); requested++;
    // Advance into actual swing before applying the impulse so the held foot is
    // under a live two-body grip while its owner attempts the same stroke.
    const prepBodies = structuredClone(bodies), prepGrips = structuredClone(grips), prepGaits = gaitSnapshot(gaits);
    const prep = advanceInertialGaits(gaits, grips, .06, bodies.map(() => zero()), { maxInterval: .005 });
    const prepFailure = prep.intervals.find(intervalContractFailure);
    if (prepFailure) {
      rejected++; stopAfterPush = true; issues['prep_interval_rejected'] = 1;
      accountHold(prepFailure, false);
      if (firstRejectionWitness === null) firstRejectionWitness = reportWitness('prep interval contract failure', prepFailure, bodies, grips, 'held-step-prep-candidate');
      restoreBodies(bodies, prepBodies); restoreGrips(grips, prepGrips); restoreGaits(gaits, prepGaits, bodies);
    }
    if (!prepFailure) {
    accountGaitReport(prep, advancedTime);
    advancedTime += .06;
    recordTrajectory();
    }
  }
  const pushDuration = pushPulseDuration;
  const externalPushForce = times(pushImpulse, 1 / pushDuration);
  if (norm(pushImpulse) > 0 && !stopAfterPush) {
    const pushBodies = structuredClone(bodies), pushGrips = structuredClone(grips), pushGaits = gaitSnapshot(gaits);
    try {
      const externalTorsoForces = bodies.map((_, i) => i === runnerIndex ? externalPushForce : zero());
      const report = advanceInertialGaits(gaits, grips, pushDuration, bodies.map(() => zero()),
        { maxInterval: dt / 2, externalTorsoForces });
      const failed = report.intervals.find(r => intervalContractFailure(r) !== null);
      const failure = failed ? intervalContractFailure(failed) : null;
      if (failure) {
        rejected++; stopAfterPush = true; issues[`push_rejected:${failure}`] = 1;
        accountHold(failed!, false);
        if (firstRejectionWitness === null) firstRejectionWitness = reportWitness(failure, failed!, bodies, grips, 'gait-driver-push-candidate');
        restoreBodies(bodies, pushBodies); restoreGrips(grips, pushGrips); restoreGaits(gaits, pushGaits, bodies);
      } else {
      accountGaitReport(report, advancedTime);
      // The pulse duration is fixed at .01 s; the selected simulation step only
      // controls its internal maximum interval, never its application time.
      advancedTime += pushDuration;
      recordTrajectory();
      }
    } catch (e) { restoreBodies(bodies, pushBodies); restoreGrips(grips, pushGrips); rejected++; stopAfterPush = true; issues[`push_exception:${String(e)}`] = 1;
      restoreGaits(gaits, pushGaits, bodies);
      if (e instanceof InertialGaitError && e.candidate) accountHold(e.candidate, false);
      if (firstRejectionWitness === null) firstRejectionWitness = failureWitness(e); }
  }
  const totalTicks = Math.ceil(s.duration / dt);
  let initialSpeed = false;
  for (let tick = 0; tick < totalTicks && !stopAfterPush && advancedTime < s.duration - 1e-12; tick++) {
    const elapsed = advancedTime, stepDt = Math.min(dt, s.duration - advancedTime);
    const velocity = torsoVelocity(runner), speed = norm(velocity);
    let acceleration = zero(), intent = zero();
    if (s.kind === 'accelerate') {
      const target = s.targetSpeed ?? 0;
      const forward = { x: transform.mirror ? -1 : 1, y: 0 };
      acceleration = times(forward, Math.min(4, Math.max(0, (target - speed) / .35)));
      intent = speed > .05 ? unit(velocity) : forward;
    } else if (s.kind === 'brake') {
      if (!initialSpeed) {
        acceleration = { x: (transform.mirror ? -1 : 1) * 4, y: 0 };
        intent = { x: transform.mirror ? -1 : 1, y: 0 };
        if (speed >= (s.targetSpeed ?? 5) * .8) initialSpeed = true;
      } else {
        // Zero desired velocity still means feet must follow actual moving body.
        // Zero intent lets the planner use actual travel heading while braking.
        intent = zero();
        acceleration = times(unit(velocity), -Math.min(6, speed / .25));
      }
    } else if (s.kind === 'cut') {
      const before = s.targetSpeed ?? 3, angle = s.angle ?? 0;
      if (elapsed < 1.2 && speed < 2.95) {
        const forward = { x: transform.mirror ? -1 : 1, y: 0 };
        acceleration = times(forward, 4);
        intent = speed > .05 ? unit(velocity) : forward;
      } else {
      if (cutSpeedAtCue === null) cutSpeedAtCue = f(speed);
      const desired = rotate({ x: (transform.mirror ? -1 : 1) * before, y: 0 }, transform.mirror ? -angle : angle);
      const error = { x: desired.x - velocity.x, y: desired.y - velocity.y };
      acceleration = times(error, Math.min(2, 1 / .35));
      intent = speed > .08 ? unit(velocity) : unit(desired);
      }
    } else {
      // Perturbation probes are allowed to translate/recover; intent comes from
      // actual momentum even though the desired post-push velocity is zero.
      intent = unit(velocity);
      acceleration = s.kind === 'held_step' ? times(unit(velocity), -.2) : zero();
    }
    const shouldPlan = speed > .01 || (s.kind === 'accelerate' && elapsed < s.duration);
    if (shouldPlan && gait.phase === 'settled') {
      if (planInertialStride(gait, intent, gaitPrior.strokeTime)) requested++;
      else if (gait.lastPlan?.fitsDeadline === false) infeasiblePlans++;
    }
    try {
      const beforeBodies = structuredClone(bodies), beforeGrips = structuredClone(grips), beforeGaits = gaitSnapshot(gaits);
      const report = advanceInertialGaits(gaits, grips, stepDt, bodies.map((_, i) => i === runnerIndex ? acceleration : zero()), { maxInterval: dt / 2 });
      const rejectedInterval = report.intervals.find(intervalContractFailure);
      if (rejectedInterval) {
        rejected++; issues['interval_contract_rejected'] = (issues['interval_contract_rejected'] ?? 0) + 1;
        accountHold(rejectedInterval, false);
        if (firstRejectionWitness === null) firstRejectionWitness = reportWitness(intervalContractFailure(rejectedInterval)!, rejectedInterval, bodies, grips, 'advance-candidate');
        restoreBodies(bodies, beforeBodies); restoreGrips(grips, beforeGrips); restoreGaits(gaits, beforeGaits, bodies);
        break;
      }
      const stepStart = advancedTime;
      accountGaitReport(report, stepStart);
      advancedTime += stepDt;
      recordTrajectory();
    } catch (e) {
      rejected++; issues[`advance_rejected:${String(e)}`] = (issues[`advance_rejected:${String(e)}`] ?? 0) + 1;
      if (e instanceof InertialGaitError && e.candidate) accountHold(e.candidate, false);
      if (firstRejectionWitness === null) firstRejectionWitness = failureWitness(e);
      // Failed atomic ticks are preserved as rejections and stop this trajectory;
      // the state remains the solver's documented pre-tick state.
      break;
    }
  }
  const lastPlacement = placements.length ? Math.max(...placements.map(p => p.missLength)) : 0;
  return { scenario: s.name, fraction, dt, transform: transform.name, elapsed: f(advancedTime), cutSpeedAtCue,
    stepsRequested: requested, stepsCompleted: completed, rejected, gripCount: grips.length, brokenGrips: grips.filter(g => g.broken).length,
    gripModels: [...gripModels].sort(), gripSlips,
    maxAcceptedHoldDistanceViolation: f(maxAcceptedHoldDistanceViolation),
    maxAcceptedUncappedHoldDistanceViolation: f(maxAcceptedUncappedHoldDistanceViolation),
    maxRejectedHoldDistanceViolation: f(maxRejectedHoldDistanceViolation),
    maxRejectedUncappedHoldDistanceViolation: f(maxRejectedUncappedHoldDistanceViolation),
    plantStopSplits, slipDirectionSplits, gripBreakSplits, finalPhase: gait.phase,
    maximumLoadedSlipContext,
    loadedSlipByPhase: Object.fromEntries(Object.entries(loadedSlipByPhase).map(([phase, stats]) => [phase, {
      loadedFootSeconds: f(stats.loadedFootSeconds), distanceYd: f(stats.distanceYd), maxSpeedYdS: f(stats.maxSpeedYdS), intervals: stats.intervals }])) as Row['loadedSlipByPhase'],
    pushDuration, externalPushImpulse: vec(pushImpulse), externalPushForce: vec(externalPushForce),
    lastPlan: gait.lastPlan ?? null,
    finalVelocity: vec(torsoVelocity(runner)), finalTorso: vec(torsoPosition(runner)),
    feet: runner.slots.map(slot => ({ id: slot.id, position: vec(slot.position), velocity: vec(runner.footVelocity[slot.id]), mode: slot.mode, load: f(slot.load) })),
    placements, maximumFootSpeed: f(maxFootSpeed), maximumPlantedLoadedSlipSpeed: f(maxPlantSlipSpeed),
    plantedLoadedSlipDistance: f(plantedLoadedSlipDistance),
    finalPlantSlipSpeed: f(Math.max(0, ...runner.slots.filter(slot => slot.mode === 'plant' && slot.load > 0).map(slot => norm(runner.footVelocity[slot.id])))),
    maximumPlacementMiss: f(lastPlacement),
    motorWork: f(motorWork), rotorWork: f(rotorWork), groundWork: f(groundWork), gripWork: f(gripWork), reachWork: f(reachWork), externalWork: f(externalWork),
    workResidual: f(workResidual), momentumResidual: f(momentumResidual), angularMomentumResidual: f(angularMomentumResidual),
    unrepresentedAngularImpulse: f(unrepresentedAngularImpulse), unrepresentedGripAngularImpulse: f(unrepresentedGripAngularImpulse),
    unrepresentedGripAngularIntervals, powerRetries, solverIntervals, issueCounts: { ...issues, infeasiblePlans }, trajectory };
}

const quick = process.argv.includes('--quick');
const scenarioFilter = process.argv.find(arg => arg.startsWith('--scenario='))?.slice('--scenario='.length);
const fractionFilter = process.argv.find(arg => arg.startsWith('--fraction='))?.slice('--fraction='.length);
const dtFilter = process.argv.find(arg => arg.startsWith('--dt='))?.slice('--dt='.length);
const transformFilter = process.argv.find(arg => arg.startsWith('--transform='))?.slice('--transform='.length);
const focused = Boolean(scenarioFilter || fractionFilter || dtFilter || transformFilter);
const outputPath = process.argv.slice(2).find(arg => !arg.startsWith('--')) ?? 'out/inertial-gait-panel.json';
const quickScenarios = new Set(['accel_5yds', 'brake_from_5', 'cut_90_toward_3', 'at_rest_push_recovery',
  'held_step_0.15_grip150', 'held_step_1_grip900']);
const selectedScenarios = scenarioFilter ? scenarios.filter(s => s.name === scenarioFilter)
  : quick ? scenarios.filter(s => quickScenarios.has(s.name)) : scenarios;
const selectedFractions = fractionFilter ? [Number(fractionFilter)] : quick ? [.020842] : fractions;
const selectedTimeSteps = dtFilter ? [Number(dtFilter)] : quick ? [.005] : timeSteps;
const selectedTransforms = transformFilter ? transforms.filter(t => t.name === transformFilter) : transforms;
if (!selectedScenarios.length || !selectedTransforms.length || !selectedFractions.every(Number.isFinite)
  || !selectedTimeSteps.every(Number.isFinite)) throw new Error('Diagnostic filters selected no valid cases');
const rows: Row[] = [];
for (const scenario of selectedScenarios) for (const fraction of selectedFractions)
  for (const dt of selectedTimeSteps) for (const transform of selectedTransforms) rows.push(run(scenario, fraction, dt, transform));
const sourceSha256AtEnd = sourceVersion();
if (sourceSha256AtStart !== sourceSha256AtEnd)
  throw new Error(`Source changed during inertial gait panel: ${sourceSha256AtStart} -> ${sourceSha256AtEnd}`);
const diagnosticSha256AtEnd = createHash('sha256').update(readFileSync(diagnosticPath)).digest('hex');
if (diagnosticSha256AtStart !== diagnosticSha256AtEnd)
  throw new Error(`Diagnostic script changed during panel: ${diagnosticSha256AtStart} -> ${diagnosticSha256AtEnd}`);
const identityRows = new Map(rows.filter(r => r.transform === 'identity').map(r => [`${r.scenario}/${r.fraction}/${r.dt}`, r]));
const timeStepPairs = selectedScenarios.flatMap(scenario => selectedFractions.flatMap(fraction => selectedTransforms.map(transform => {
  const entries = timeSteps.map(dt => {
    const row = rows.find(candidate => candidate.scenario === scenario.name && candidate.fraction === fraction
      && candidate.transform === transform.name && candidate.dt === dt);
    return row ? { dt, status: row.rejected ? 'rejected' : row.elapsed >= scenario.duration - 1e-9 ? 'complete' : 'incomplete',
      elapsed: row.elapsed, rejected: row.rejected, completedPlacements: row.stepsCompleted, requestedPlacements: row.stepsRequested,
      gripBreakSplits: row.gripBreakSplits, slipDirectionSplits: row.slipDirectionSplits,
      loadedSlipByPhase: row.loadedSlipByPhase, maximumLoadedSlipContext: row.maximumLoadedSlipContext,
      maxPlacementMissYd: row.maximumPlacementMiss,
      maxPlantedLoadedSlipSpeedYdS: row.maximumPlantedLoadedSlipSpeed, plantedLoadedSlipDistanceYd: row.plantedLoadedSlipDistance } : { dt, status: 'missing' };
  });
  return { scenario: scenario.name, fraction, transform: transform.name, completePair: entries.every(entry => entry.status === 'complete'),
    missingTimeSteps: entries.filter(entry => entry.status === 'missing').map(entry => entry.dt),
    rejectedTimeSteps: entries.filter(entry => entry.status === 'rejected').map(entry => entry.dt), entries };
})));
type TrajectorySample = Row['trajectory'][number];
const rowsByScenario = new Map(rows.map(row => [`${row.scenario}/${row.fraction}/${row.transform}/${row.dt}`, row]));
const vectorError = (a: readonly number[], b: readonly number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
const interpolateVector = (a: readonly number[], b: readonly number[], ratio: number): number[] => a.map((v, i) => v + (b[i] - v) * ratio);
function sampleTrajectory(samples: TrajectorySample[], time: number): TrajectorySample {
  if (time <= samples[0].time) return samples[0];
  if (time >= samples[samples.length - 1].time) return samples[samples.length - 1];
  const upper = Math.max(1, samples.findIndex(sample => sample.time >= time));
  const a = samples[upper - 1], b = samples[upper], ratio = (time - a.time) / (b.time - a.time);
  return { time, torsoPosition: interpolateVector(a.torsoPosition, b.torsoPosition, ratio) as unknown as TrajectorySample['torsoPosition'],
    torsoVelocity: interpolateVector(a.torsoVelocity, b.torsoVelocity, ratio) as unknown as TrajectorySample['torsoVelocity'],
    footPositions: a.footPositions.map((v, i) => interpolateVector(v, b.footPositions[i], ratio) as unknown as TrajectorySample['footPositions'][number]),
    footVelocities: a.footVelocities.map((v, i) => interpolateVector(v, b.footVelocities[i], ratio) as unknown as TrajectorySample['footVelocities'][number]) };
}
function compareTrajectories(coarse: Row, fine: Row): Record<string, number | number[]> {
  const end = Math.min(coarse.elapsed, fine.elapsed);
  const sampleTimes = [...new Set([...coarse.trajectory, ...fine.trajectory].map(sample => sample.time).filter(t => t <= end))].sort((a, b) => a - b);
  let maxTorsoPositionError = 0, maxTorsoVelocityError = 0;
  const maxFootPositionErrorBySlot = [0, 0], maxFootVelocityErrorBySlot = [0, 0];
  for (const time of sampleTimes) {
    const a = sampleTrajectory(coarse.trajectory, time), b = sampleTrajectory(fine.trajectory, time);
    maxTorsoPositionError = Math.max(maxTorsoPositionError, vectorError(a.torsoPosition, b.torsoPosition));
    maxTorsoVelocityError = Math.max(maxTorsoVelocityError, vectorError(a.torsoVelocity, b.torsoVelocity));
    for (let slot = 0; slot < 2; slot++) {
      maxFootPositionErrorBySlot[slot] = Math.max(maxFootPositionErrorBySlot[slot], vectorError(a.footPositions[slot], b.footPositions[slot]));
      maxFootVelocityErrorBySlot[slot] = Math.max(maxFootVelocityErrorBySlot[slot], vectorError(a.footVelocities[slot], b.footVelocities[slot]));
    }
  }
  let maxPlacementError = 0, mismatchedPlacementSlots = 0;
  const shared = Math.min(coarse.placements.length, fine.placements.length);
  for (let i = 0; i < shared; i++) {
    maxPlacementError = Math.max(maxPlacementError, vectorError(coarse.placements[i].actual, fine.placements[i].actual));
    if (coarse.placements[i].slot !== fine.placements[i].slot) mismatchedPlacementSlots++;
  }
  return { comparedThroughTime: f(end), maxTorsoPositionErrorYd: f(maxTorsoPositionError),
    maxTorsoVelocityErrorYdS: f(maxTorsoVelocityError),
    maxFootPositionErrorBySlotYd: maxFootPositionErrorBySlot.map(f),
    maxFootVelocityErrorBySlotYdS: maxFootVelocityErrorBySlot.map(f), maxPlacementErrorYd: f(maxPlacementError),
    mismatchedPlacementCounts: Number(coarse.placements.length !== fine.placements.length), mismatchedPlacementSlots };
}
const trajectoryComparisons = timeStepPairs.map(pair => {
  const triplet = timeSteps.map(dt => rowsByScenario.get(`${pair.scenario}/${pair.fraction}/${pair.transform}/${dt}`));
  const scenario = selectedScenarios.find(s => s.name === pair.scenario)!;
  const complete = triplet.every((row): row is Row => Boolean(row && row.rejected === 0 && row.elapsed >= scenario.duration - 1e-9));
  return { scenario: pair.scenario, fraction: pair.fraction, transform: pair.transform, completeTriplet: complete,
    missingTimeSteps: pair.missingTimeSteps, rejectedTimeSteps: pair.rejectedTimeSteps,
    trajectoryDifferences: complete ? { coarse_0_01_vs_mid_0_005: compareTrajectories(triplet[0], triplet[1]),
      mid_0_005_vs_fine_0_0025: compareTrajectories(triplet[1], triplet[2]),
      coarse_0_01_vs_fine_0_0025: compareTrajectories(triplet[0], triplet[2]) } : null };
});
const timeStepPairStatusCounts = { groups: timeStepPairs.length,
  completeTriplets: trajectoryComparisons.filter(pair => pair.completeTriplet).length,
  incompleteTriplets: trajectoryComparisons.filter(pair => !pair.completeTriplet).length,
  groupsWithMissingSteps: timeStepPairs.filter(pair => pair.missingTimeSteps.length > 0).length,
  groupsWithRejectedSteps: timeStepPairs.filter(pair => pair.rejectedTimeSteps.length > 0).length };
const gaitPhases: InertialGait['phase'][] = ['settled', 'unloading', 'swing', 'loading'];
const loadedSlipByPhaseTotals = Object.fromEntries(gaitPhases.map(phase => {
  const parts = rows.map(row => row.loadedSlipByPhase[phase]);
  const loadedFootSeconds = parts.reduce((sum, part) => sum + part.loadedFootSeconds, 0);
  const distanceYd = parts.reduce((sum, part) => sum + part.distanceYd, 0);
  return [phase, { loadedFootSeconds: f(loadedFootSeconds), distanceYd: f(distanceYd),
    meanLoadedSlipSpeedYdS: f(loadedFootSeconds > 0 ? distanceYd / loadedFootSeconds : 0),
    maxSpeedYdS: f(Math.max(0, ...parts.map(part => part.maxSpeedYdS))),
    loadedIntervals: parts.reduce((sum, part) => sum + part.intervals, 0) }];
}));
const invariance = { cases: 0, maxTorsoPositionError: 0, maxTorsoVelocityError: 0, maxFootPositionError: 0,
  maxPlacementError: 0, mismatchedPlacementCounts: 0, mismatchedPlacementSlots: 0 };
for (const mirrored of rows.filter(r => r.transform === 'mirror_translate')) {
  const original = identityRows.get(`${mirrored.scenario}/${mirrored.fraction}/${mirrored.dt}`);
  if (!original) continue;
  invariance.cases++;
  const err = (actual: readonly number[], expected: readonly number[]): number => Math.hypot(actual[0] - expected[0], actual[1] - expected[1]);
  invariance.maxTorsoPositionError = Math.max(invariance.maxTorsoPositionError,
    err(mirrored.finalTorso, [7.25 - original.finalTorso[0], original.finalTorso[1] - 3.5]));
  invariance.maxTorsoVelocityError = Math.max(invariance.maxTorsoVelocityError,
    err(mirrored.finalVelocity, [-original.finalVelocity[0], original.finalVelocity[1]]));
  for (let i = 0; i < 2; i++) invariance.maxFootPositionError = Math.max(invariance.maxFootPositionError,
    err(mirrored.feet[i].position, [7.25 - original.feet[i].position[0], original.feet[i].position[1] - 3.5]));
  for (let i = 0; i < Math.min(mirrored.placements.length, original.placements.length); i++)
    invariance.maxPlacementError = Math.max(invariance.maxPlacementError,
      err(mirrored.placements[i].actual, [7.25 - original.placements[i].actual[0], original.placements[i].actual[1] - 3.5]));
  if (mirrored.placements.length !== original.placements.length) invariance.mismatchedPlacementCounts++;
  for (let i = 0; i < Math.min(mirrored.placements.length, original.placements.length); i++)
    if (mirrored.placements[i].slot !== original.placements[i].slot) invariance.mismatchedPlacementSlots++;
}
const summary = {
  scope: 'Research probe only; planar torso plus two point feet. No World integration, calibration, or readiness claim.',
  sourceSha256: sourceSha256AtStart, sourceSha256AtEnd, node: process.version,
  diagnosticSha256AtStart, diagnosticSha256AtEnd,
  units: { mass: 'kg', distance: 'yd', time: 's', force: 'kg*yd/s^2', work: 'kg*yd^2/s^2', impulse: 'kg*yd/s' },
  priors: { ...gaitPrior, footMassFractions: fractions, timeSteps,
    pushDurationSeconds: pushPulseDuration, pushImpulse: 'push_recovery = 0.75 * runner.mass in +x; held_step = 0.45 * runner.mass * strength in +x; sign mirrors with transform',
    pushForce: 'known torso force = push impulse / 0.01 s, integrated by advanceInertialGaits; same total impulse at every dt',
    power: 'locomotorPowerPrior(profile, body) = legForce * max(vmax, stepSpeed); broad explicit actuator prior, not fitted' },
  profile: { massKg: profile.massKg, vmaxYdS: profile.vmax, reachYd: profile.reach },
  runMode: focused ? 'focused_case' : quick ? 'critical_subset' : 'full_panel', scenarioCount: new Set(rows.map(r => r.scenario)).size, cases: rows.length,
  mirrorTranslationInvariance: invariance,
  timeStepPairs,
  timeStepPairStatusCounts,
  trajectoryComparisons,
  loadedSlipByPhaseTotals,
  firstRejectionWitness,
  totals: { rejected: rows.reduce((n, r) => n + r.rejected, 0), completedPlacements: rows.reduce((n, r) => n + r.stepsCompleted, 0),
    requestedPlacements: rows.reduce((n, r) => n + r.stepsRequested, 0), maxPlacementMissYd: Math.max(...rows.map(r => r.maximumPlacementMiss)),
    maxFootSpeedYdS: Math.max(...rows.map(r => r.maximumFootSpeed)),
    maxPlantedLoadedSlipSpeedYdS: Math.max(...rows.map(r => r.maximumPlantedLoadedSlipSpeed)),
    sumPlantedLoadedSlipDistanceYd: rows.reduce((n, r) => n + r.plantedLoadedSlipDistance, 0),
    maxFinalPlantSlipSpeedYdS: Math.max(...rows.map(r => r.finalPlantSlipSpeed)),
    maxWorkResidual: Math.max(...rows.map(r => Math.abs(r.workResidual))),
    maxMomentumResidual: Math.max(...rows.map(r => r.momentumResidual)), maxAngularMomentumResidual: Math.max(...rows.map(r => r.angularMomentumResidual)),
    sumUnrepresentedAngularImpulse: rows.reduce((n, r) => n + r.unrepresentedAngularImpulse, 0),
    sumUnrepresentedGripAngularImpulse: rows.reduce((n, r) => n + r.unrepresentedGripAngularImpulse, 0),
    sumUnrepresentedGripAngularIntervals: rows.reduce((n, r) => n + r.unrepresentedGripAngularIntervals, 0),
    gripSlips: rows.reduce((n, r) => n + r.gripSlips, 0),
    maxAcceptedHoldDistanceViolation: Math.max(...rows.map(r => r.maxAcceptedHoldDistanceViolation)),
    maxAcceptedUncappedHoldDistanceViolation: Math.max(...rows.map(r => r.maxAcceptedUncappedHoldDistanceViolation)),
    maxRejectedHoldDistanceViolation: Math.max(...rows.map(r => r.maxRejectedHoldDistanceViolation)),
    maxRejectedUncappedHoldDistanceViolation: Math.max(...rows.map(r => r.maxRejectedUncappedHoldDistanceViolation)),
    plantStopSplits: rows.reduce((n, r) => n + r.plantStopSplits, 0),
    slipDirectionSplits: rows.reduce((n, r) => n + r.slipDirectionSplits, 0),
    gripBreakSplits: rows.reduce((n, r) => n + r.gripBreakSplits, 0),
    infeasibleStridePlans: rows.reduce((n, r) => n + (r.issueCounts.infeasiblePlans ?? 0), 0),
    gripCount: rows.reduce((n, r) => n + r.gripCount, 0), brokenGrips: rows.reduce((n, r) => n + r.brokenGrips, 0) },
  rows: rows.map(({ trajectory: _trajectory, ...row }) => row),
};
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ output: outputPath, sourceSha256: summary.sourceSha256, node: summary.node,
  cases: summary.cases, mirrorTranslationInvariance: summary.mirrorTranslationInvariance, totals: summary.totals }, null, 2));
