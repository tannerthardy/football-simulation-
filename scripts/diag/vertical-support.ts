/**
 * Deterministic diagnostics for the isolated finite-mass vertical support
 * kernel. Run from repo root with Node 22: node --import tsx scripts/diag/vertical-support.ts
 * This is a mechanical probe, not gait calibration or readiness evidence.
 */
import { sourceVersion } from '../source-version.js';
import {
  axialLegDamping,
  axialLegForce,
  axialLegPotential,
} from '../../src/physics/leg-compliance.js';
import {
  advanceVerticalSupport,
  newVerticalSupport,
  type VerticalSupportSegment,
  type VerticalSupportState,
} from '../../src/physics/vertical-support.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sourceShaStart = sourceVersion();
const selfPath = fileURLToPath(import.meta.url);
const scriptShaStart = createHash('sha256').update(readFileSync(selfPath)).digest('hex');
const runtime = process.versions.node;
if (Number(runtime.split('.')[0]) !== 22 && !process.argv.includes('--allow-non22')) {
  throw new Error(`Node 22.x is required (found ${runtime}); --allow-non22 is only for draft smoke checks`);
}

const G_YD_S2 = 10.7247;
const makeState = (opts: {
  torsoMass?: number; footMass?: [number, number]; stiffness?: number; damping?: number;
  supportScale?: number; torsoY?: number; torsoV?: number; footY?: [number, number]; footV?: [number, number];
  forceCap?: number; powerCap?: number; gravity?: number; legForceCap?: number;
  legDampingCap?: number; restLength?: number;
} = {}): VerticalSupportState => {
  const gravity = opts.gravity ?? G_YD_S2;
  const torsoMass = opts.torsoMass ?? 80;
  const footMass = opts.footMass ?? [4, 4];
  const footY = opts.footY ?? [0, 0];
  const footV = opts.footV ?? [0, 0];
  const torsoY = opts.torsoY ?? 1;
  const stiffness = opts.stiffness ?? 18000;
  const damping = opts.damping ?? 250;
  const scale = opts.supportScale ?? 1;
  // Ground force carries foot weight directly. Springs therefore balance the
  // torso load, split evenly, rather than the total material-point weight.
  const eachTorsoLoad = torsoMass * gravity * scale / 2;
  const restLength = opts.restLength ?? torsoY + eachTorsoLoad / stiffness;
  const forceCap = opts.legForceCap ?? Math.max(2 * eachTorsoLoad, 1);
  const dampingCap = opts.legDampingCap ?? Math.max(2 * eachTorsoLoad, 1);
  const legs = [0, 1].map(() => ({ restLength, stiffness, forceCap, damping, dampingCap })) as VerticalSupportState['legs'];
  return newVerticalSupport({
    torsoMass,
    footMass,
    torso: { position: torsoY, velocity: opts.torsoV ?? 0 },
    actuator: { forceCap: opts.forceCap ?? 500, powerCap: opts.powerCap ?? 5000 },
    feet: [{ id: 0, position: footY[0], velocity: footV[0] }, { id: 1, position: footY[1], velocity: footV[1] }],
    gravity,
    legs,
  });
};

type Scenario = {
  name: string;
  category: 'ordinary' | 'expected-budget';
  initial: VerticalSupportState;
  external?: [number, number, number];
  motor?: [number, number];
};
const scenarios: Scenario[] = [
  { name: 'quiet-double-stance-equilibrium', category: 'ordinary', initial: makeState() },
  { name: 'unequal-feet-load-transfer', category: 'ordinary', initial: makeState({ footMass: [2.5, 9], torsoMass: 88, supportScale: 1.15, stiffness: 24000, damping: 420 }), motor: [65, -35] },
  { name: 'stance-to-lift-opposition', category: 'ordinary', initial: makeState({ torsoMass: 92, supportScale: 1.05 }), external: [1050, 0, 0] },
  { name: 'flight-with-persistent-legs', category: 'ordinary', initial: makeState({ footY: [0.13, 0.19], footV: [1.3, 0.7], torsoY: 1.3, torsoMass: 76, supportScale: 0.8, stiffness: 14000, damping: 180 }) },
  { name: 'one-foot-touchdown', category: 'ordinary', initial: makeState({ torsoY: 1.15, footY: [0.035, 0], footV: [-2.1, 0], footMass: [3, 7], stiffness: 22000, damping: 300 }) },
  { name: 'simultaneous-two-foot-touchdown', category: 'ordinary', initial: makeState({ torsoY: 1.15, footY: [0.035, 0.035], footV: [-2.1, -2.1], footMass: [3, 3], stiffness: 22000, damping: 300 }) },
  { name: 'ground-zero-velocity-forced-liftoff', category: 'ordinary', initial: makeState({ stiffness: 16000, damping: 100, forceCap: 900 }), motor: [700, 0] },
  { name: 'expected-shared-force-command-scaling', category: 'ordinary', initial: makeState({ forceCap: 500 }), motor: [350, 350] },
  { name: 'soft-damped-support', category: 'ordinary', initial: makeState({ torsoMass: 105, footMass: [5, 3], supportScale: 1.1, stiffness: 9000, damping: 700 }) },
  { name: 'expected-shared-power-budget-rejection', category: 'expected-budget', initial: makeState({ powerCap: 0.01 }), motor: [300, 0] },
];

const resolutions = [0.01, 0.005, 0.0025];
const ordinaryDuration = 0.4;
const kinetic = (s: VerticalSupportState): number => .5 * s.torsoMass * s.torso.velocity ** 2
  + s.feet.reduce((sum, f, i) => sum + .5 * s.footMass[i] * f.velocity ** 2, 0);
const energy = (s: VerticalSupportState): number => kinetic(s)
  + s.gravity * (s.torsoMass * s.torso.position + s.feet.reduce((sum, f, i) => sum + s.footMass[i] * f.position, 0))
  + s.legs.reduce((sum, l, i) => sum + axialLegPotential(s.torso.position - s.feet[i].position, l), 0);
const momentum = (s: VerticalSupportState): number => s.torsoMass * s.torso.velocity
  + s.feet.reduce((sum, f, i) => sum + s.footMass[i] * f.velocity, 0);
const requiredNormalAt = (s: VerticalSupportState, i: number, motor: number, external = 0): number =>
  s.footMass[i] * s.gravity
  + axialLegForce(s.torso.position - s.feet[i].position, s.legs[i])
  + axialLegDamping(s.torso.velocity - s.feet[i].velocity, s.legs[i])
  - motor - external;

/** Reconstruct work and impulse from material snapshots and reported forces. */
function independentLedger(before: VerticalSupportState, after: VerticalSupportState, segments: VerticalSupportSegment[]) {
  let motorWork = 0, restMotorWork = 0, dampingWork = 0, groundWork = 0, externalWork = 0, impactWork = 0;
  let seriesDragWork = 0, seriesLimitWork = 0, restBoundWork = 0;
  let groundImpulse = 0, externalImpulse = 0, elapsed = 0;
  for (const seg of segments) {
    const dyTorso = seg.after.torso.position - seg.before.torso.position;
    if (seg.kind === 'impact') {
      impactWork += kinetic(seg.after) - kinetic(seg.before);
      groundImpulse += seg.normalImpulse[0] + seg.normalImpulse[1];
      continue;
    }
    const h = seg.dt;
    elapsed += h;
    groundImpulse += seg.normalImpulse[0] + seg.normalImpulse[1];
    externalImpulse += seg.externalImpulse.reduce((a, b) => a + b, 0);
    for (let i = 0; i < 2; i++) {
      const dyFoot = seg.after.feet[i].position - seg.before.feet[i].position;
      const dyRelative = dyFoot - dyTorso;
      motorWork += h > 0 ? (seg.motorImpulse[i] / h) * dyRelative : 0;
      dampingWork += seg.dampingForce[i] * (-dyRelative);
      groundWork += h > 0 ? (seg.normalImpulse[i] / h) * dyFoot : 0;
      externalWork += h > 0 ? (seg.externalImpulse[i + 1] / h) * dyFoot : 0;
      const deltaRest = seg.after.legs[i].restLength - seg.before.legs[i].restLength;
      const restRate = h > 0 ? deltaRest / h : 0;
      restMotorWork += seg.restForces[i] * deltaRest;
      if (seg.before.series) {
        const series = seg.before.series[i];
        seriesDragWork += -series.drag * restRate ** 2 * h;
        const desiredRate = (seg.restForces[i] - seg.springForce[i]) / series.drag;
        if (desiredRate < seg.restRateBounds[i].min || desiredRate > seg.restRateBounds[i].max) {
          seriesLimitWork += -h * (seg.restForces[i] - seg.springForce[i] - series.drag * restRate) * restRate;
        }
        // A hard structural end stop acts at zero rest-rate after contact.
        // The motor work already uses the actual rest displacement up to it.
        if (seg.restBoundWork[i] !== 0) restBoundWork += seg.restBoundWork[i];
      }
    }
    externalWork += h > 0 ? (seg.externalImpulse[0] / h) * dyTorso : 0;
  }
  const energyResidual = energy(after) - energy(before) - motorWork - restMotorWork - dampingWork - groundWork
    - externalWork - impactWork - seriesDragWork - seriesLimitWork - restBoundWork;
  const momentumResidual = momentum(after) - momentum(before) - externalImpulse - groundImpulse
    + before.gravity * (before.torsoMass + before.footMass[0] + before.footMass[1]) * elapsed;
  return { energyResidual, momentumResidual, motorWork, restMotorWork, dampingWork, groundWork, externalWork, impactWork,
    seriesDragWork, seriesLimitWork, restBoundWork, groundImpulse, externalImpulse, elapsed };
}

const results: Record<string, unknown>[] = [];
for (const scenario of scenarios) for (const dt of resolutions) {
  let state = scenario.initial;
  let time = 0;
  let acceptedSteps = 0;
  let rejectedSteps = 0;
  let firstFailure: Record<string, unknown> | null = null;
  let maxIndependentEnergyResidual = 0;
  let maxIndependentMomentumResidual = 0;
  let maxReportedEnergyResidual = 0;
  let maxReportedMomentumResidual = 0;
  let minNormalForce = Number.POSITIVE_INFINITY;
  let minHeldEndpointRequiredNormal = Number.POSITIVE_INFINITY;
  let negativeEndpointNormalsOnSeparatedFeet = 0;
  let totalNormalImpulse: [number, number] = [0, 0];
  let maxForceCommandRatio = 0;
  let maxAppliedForceRatio = 0;
  let maxPositivePowerRatio = 0;
  let maxIndependentLedgerFailure: Record<string, unknown> | null = null;
  const footContact: [boolean, boolean] = scenario.initial.feet.map(f => f.position === 0 && f.velocity === 0) as [boolean, boolean];
  const footLiftoff: [boolean, boolean] = [false, false];
  let totalImpactWork = 0, totalDampingWork = 0, totalGroundWork = 0;
  const duration = scenario.category === 'ordinary' ? ordinaryDuration : dt;
  while (time < duration - 1e-12) {
    const h = Math.min(dt, duration - time);
    const { state: returned, report } = advanceVerticalSupport(state, h, {
      motorForces: scenario.motor,
      externalForces: scenario.external,
      maxInterval: h,
    });
    const candidate = report.candidateState;
    const ledger = independentLedger(state, candidate, report.segments);
    const absIndependentEnergyResidual = Math.abs(ledger.energyResidual);
    const absIndependentMomentumResidual = Math.abs(ledger.momentumResidual);
    if (absIndependentEnergyResidual > maxIndependentEnergyResidual) {
      maxIndependentEnergyResidual = absIndependentEnergyResidual;
      maxIndependentLedgerFailure = { time, dt: h, ledger, reportedWorkResidual: report.workResidual, reportedMomentumResidual: report.momentumResidual };
    }
    maxIndependentMomentumResidual = Math.max(maxIndependentMomentumResidual, absIndependentMomentumResidual);
    maxReportedEnergyResidual = Math.max(maxReportedEnergyResidual, Math.abs(report.workResidual));
    maxReportedMomentumResidual = Math.max(maxReportedMomentumResidual, Math.abs(report.momentumResidual));
    maxForceCommandRatio = Math.max(maxForceCommandRatio,
      (Math.abs(report.requestedMotorForces[0]) + Math.abs(report.requestedMotorForces[1])) / Math.max(report.sharedForceCap, 1e-300));
    maxAppliedForceRatio = Math.max(maxAppliedForceRatio,
      (Math.abs(report.appliedMotorForces[0]) + Math.abs(report.appliedMotorForces[1])) / Math.max(report.sharedForceCap, 1e-300));
    maxPositivePowerRatio = Math.max(maxPositivePowerRatio,
      report.positiveMotorWork / Math.max(report.sharedPowerCap * h, 1e-300));
    if (!report.accepted) {
      rejectedSteps++;
      firstFailure = {
        scenario: scenario.name,
        category: scenario.category,
        time,
        requestedInterval: h,
        reason: report.reason,
        input: state,
        candidate,
        report: {
          advancedTime: report.advancedTime,
          workResidual: report.workResidual,
          momentumResidual: report.momentumResidual,
          dampingWork: report.dampingWork,
          groundWork: report.groundWork,
          normalImpulse: report.normalImpulse,
          segments: report.segments,
        },
        independentLedger: ledger,
      };
      break;
    }
    acceptedSteps++;
    for (let i = 0; i < 2; i++) {
      totalNormalImpulse[i] += report.normalImpulse[i];
      if (report.normalImpulse[i] > 0) footContact[i] = true;
      else if (footContact[i] && (candidate.feet[i].position > 0 || candidate.feet[i].velocity > 0)) footLiftoff[i] = true;
      for (const seg of report.segments) {
        if (seg.kind !== 'interval' || seg.normalImpulse[i] <= 0) continue;
        const endpointN = requiredNormalAt(seg.after, i, report.appliedMotorForces[i] ?? 0, scenario.external?.[i + 1] ?? 0);
        minHeldEndpointRequiredNormal = Math.min(minHeldEndpointRequiredNormal, endpointN);
      }
    }
    for (const seg of report.segments) {
      if (seg.kind === 'impact') totalImpactWork += seg.impactWork;
      else {
        totalDampingWork += seg.dampingWork;
        totalGroundWork += seg.groundWork;
        for (let i = 0; i < 2; i++) {
          const endpointN = requiredNormalAt(seg.after, i, report.appliedMotorForces[i] ?? 0, scenario.external?.[i + 1] ?? 0);
          if (endpointN < -1e-10 && seg.after.feet[i].position > 0) negativeEndpointNormalsOnSeparatedFeet++;
        }
      }
    }
    state = returned;
    time += h;
  }
  results.push({
    scenario: scenario.name,
    category: scenario.category,
    dt,
    requestedDuration: duration,
    advancedTime: time,
    acceptedSteps,
    rejectedSteps,
    firstFailure,
    initial: scenario.initial,
    final: state,
    totalNormalImpulse,
    footLiftoffObserved: footLiftoff,
    minHeldEndpointRequiredNormal: Number.isFinite(minHeldEndpointRequiredNormal) ? minHeldEndpointRequiredNormal : null,
    negativeEndpointNormalsOnSeparatedFeet,
    maxAbsIndependentEnergyResidual: maxIndependentEnergyResidual,
    maxAbsIndependentMomentumResidual: maxIndependentMomentumResidual,
    maxAbsReportedEnergyResidual: maxReportedEnergyResidual,
    maxAbsReportedMomentumResidual: maxReportedMomentumResidual,
    maxForceCommandRatio,
    maxAppliedForceRatio,
    maxPositivePowerRatio,
    maxIndependentLedgerFailure,
    totalImpactWork,
    totalDampingWork,
    totalGroundWork,
  });
}

function seriesStanding(overrides: {
  forceCap?: number; powerCap?: number; springForceCap?: number; stiffness?: number; damping?: number;
  dampingCap?: number; drag?: number; rateCap?: number; minLength?: number; maxLength?: number;
} = {}): VerticalSupportState {
  const leg = {
    restLength: 1.1,
    stiffness: overrides.stiffness ?? 4800,
    forceCap: overrides.springForceCap ?? 1600,
    damping: overrides.damping ?? 30,
    dampingCap: overrides.dampingCap ?? 300,
  };
  const joint = {
    drag: overrides.drag ?? 600,
    rateCap: overrides.rateCap ?? 1,
    minLength: overrides.minLength ?? 0.6,
    maxLength: overrides.maxLength ?? 1.4,
  };
  return newVerticalSupport({
    torsoMass: 96,
    footMass: [2, 2],
    gravity: 10,
    torso: { position: 1, velocity: 0 },
    feet: [{ id: 0, position: 0, velocity: 0 }, { id: 1, position: 0, velocity: 0 }],
    legs: [{ ...leg }, { ...leg }],
    series: [{ ...joint }, { ...joint }],
    actuator: { forceCap: overrides.forceCap ?? 2500, powerCap: overrides.powerCap ?? 1e6 },
  });
}

type SeriesScenario = {
  name: string; initial: VerticalSupportState; duration: number;
  motor?: [number, number]; rest?: [number, number]; external?: [number, number, number];
};
const seriesScenarios: SeriesScenario[] = [
  { name: 'series-quiet-u480', initial: seriesStanding({ powerCap: 0 }), duration: 0.1, rest: [480, 480] },
  { name: 'series-weak-forcecap300-u480', initial: seriesStanding({ forceCap: 300 }), duration: 0.08, rest: [480, 480] },
  { name: 'series-powered-raise-u700', initial: seriesStanding(), duration: 0.1, rest: [700, 700] },
  { name: 'series-unpowered-backdrive', initial: seriesStanding(), duration: 0.05 },
  ...[0, 40, 100].map(opposition => ({
    name: `series-held-lift-opposition-${opposition}`,
    initial: seriesStanding(), duration: 0.3, motor: [100, 0] as [number, number],
    rest: [-200, 960] as [number, number], external: [0, -opposition, 0] as [number, number, number],
  })),
  {
    name: 'series-exact-structural-rest-stop',
    initial: seriesStanding({ springForceCap: 0, damping: 0, dampingCap: 0, drag: 200, rateCap: 1, maxLength: 1.105 }),
    duration: 0.1, rest: [100, 0],
  },
];

function segmentBudgetAudit(input: VerticalSupportState, seg: VerticalSupportSegment) {
  if (seg.kind !== 'interval' || seg.dt <= 0) return { forceRatio: 0, positivePowerRatio: 0, actualRestRates: [0, 0], boundViolations: [] as Record<string, unknown>[] };
  const h = seg.dt;
  const directForces = seg.motorImpulse.map(j => j / h);
  const directWork = [0, 1].map(i => directForces[i]
    * ((seg.after.feet[i].position - seg.before.feet[i].position) - (seg.after.torso.position - seg.before.torso.position)));
  const restWork = [0, 1].map(i => seg.restForces[i] * (seg.after.legs[i].restLength - seg.before.legs[i].restLength));
  const positiveWork = directWork.reduce((sum, w) => sum + Math.max(0, w), 0)
    + restWork.reduce((sum, w) => sum + Math.max(0, w), 0);
  const force = directForces.reduce((sum, f) => sum + Math.abs(f), 0) + seg.restForces.reduce((sum, f) => sum + Math.abs(f), 0);
  const powerBudget = input.actuator.powerCap * h;
  const actualRestRates = [0, 1].map(i => (seg.after.legs[i].restLength - seg.before.legs[i].restLength) / h);
  const boundViolations = [0, 1].flatMap(i => {
    const b = seg.restRateBounds[i], rate = actualRestRates[i];
    return rate < b.min - 1e-9 || rate > b.max + 1e-9
      || seg.after.legs[i].restLength < seg.after.series![i].minLength - 1e-10
      || seg.after.legs[i].restLength > seg.after.series![i].maxLength + 1e-10
      ? [{ slot: i, rate, bounds: b, restLength: seg.after.legs[i].restLength, structuralBounds: seg.after.series![i] }]
      : [];
  });
  return {
    forceRatio: force / Math.max(input.actuator.forceCap, 1e-300),
    positivePowerRatio: powerBudget > 0 ? positiveWork / powerBudget : positiveWork > 1e-12 ? Number.POSITIVE_INFINITY : 0,
    directForces,
    restForces: seg.restForces,
    directWork,
    restWork,
    positiveWork,
    actualRestRates,
    boundViolations,
  };
}

function runSeriesScenario(scenario: SeriesScenario, dt: number) {
  let state = scenario.initial;
  let time = 0, acceptedTicks = 0;
  const rejectedInputs: Record<string, unknown>[] = [];
  const acceptedContractViolations: Record<string, unknown>[] = [];
  const trajectory: Record<string, unknown>[] = [];
  let maxIndependentEnergyResidual = 0, maxIndependentMomentumResidual = 0;
  let maxForceRatio = 0, maxPositivePowerRatio = 0, maxRateRatio = 0;
  let maxForceAudit: Record<string, unknown> | null = null, maxPowerAudit: Record<string, unknown> | null = null;
  let maxAbsoluteRestWorkResidual = 0;
  let minimumHeldEndpointNormal = Number.POSITIVE_INFINITY;
  let firstLiftTime: number | null = null, firstRestBoundTime: number | null = null;
  let totalIndependent = { motorWork: 0, restMotorWork: 0, seriesDragWork: 0, seriesLimitWork: 0, restBoundWork: 0 };
  while (time < scenario.duration - 1e-12) {
    const h = Math.min(dt, scenario.duration - time);
    const input = state;
    const result = advanceVerticalSupport(input, h, {
      motorForces: scenario.motor,
      restForces: scenario.rest,
      externalForces: scenario.external,
      maxInterval: h,
    });
    const { report } = result;
    const candidate = report.candidateState;
    const ledger = independentLedger(input, candidate, report.segments);
    maxIndependentEnergyResidual = Math.max(maxIndependentEnergyResidual, Math.abs(ledger.energyResidual));
    maxIndependentMomentumResidual = Math.max(maxIndependentMomentumResidual, Math.abs(ledger.momentumResidual));
    totalIndependent.motorWork += ledger.motorWork;
    totalIndependent.restMotorWork += ledger.restMotorWork;
    totalIndependent.seriesDragWork += ledger.seriesDragWork;
    totalIndependent.seriesLimitWork += ledger.seriesLimitWork;
    totalIndependent.restBoundWork += ledger.restBoundWork;
    maxAbsoluteRestWorkResidual = Math.max(maxAbsoluteRestWorkResidual,
      Math.abs(ledger.restMotorWork - report.restMotorWork[0] - report.restMotorWork[1]),
      Math.abs(ledger.seriesDragWork - report.seriesDragWork[0] - report.seriesDragWork[1]),
      Math.abs(ledger.seriesLimitWork - report.seriesLimitWork[0] - report.seriesLimitWork[1]));
    let segmentTime = time;
    for (let index = 0; index < report.segments.length; index++) {
      const seg = report.segments[index];
      const budget = segmentBudgetAudit(input, seg);
      if (budget.forceRatio > maxForceRatio) maxForceAudit = { tick: acceptedTicks, segment: index, dt: seg.dt,
        directForces: budget.directForces, restForces: budget.restForces,
        sharedForceSum: (budget.directForces ?? []).reduce((sum, f) => sum + Math.abs(f), 0) + (budget.restForces ?? []).reduce((sum, f) => sum + Math.abs(f), 0),
        forceCap: input.actuator.forceCap, ratio: budget.forceRatio };
      if (budget.positivePowerRatio > maxPositivePowerRatio) maxPowerAudit = { tick: acceptedTicks, segment: index, dt: seg.dt,
        directChannelWork: budget.directWork, restChannelWork: budget.restWork, positiveWork: budget.positiveWork,
        powerCap: input.actuator.powerCap, powerBudgetForSegment: input.actuator.powerCap * seg.dt, ratio: budget.positivePowerRatio };
      maxForceRatio = Math.max(maxForceRatio, budget.forceRatio);
      maxPositivePowerRatio = Math.max(maxPositivePowerRatio, budget.positivePowerRatio);
      for (const violation of budget.boundViolations) acceptedContractViolations.push({ scenario: scenario.name, dt, tick: acceptedTicks, segment: index, contract: 'rest-rate-or-structural-bound', ...violation });
      if (seg.kind === 'interval') {
        for (let i = 0; i < 2; i++) {
          const rate = budget.actualRestRates[i], cap = input.series![i].rateCap;
          maxRateRatio = Math.max(maxRateRatio, Math.abs(rate) / Math.max(cap, 1e-300));
          if (seg.normalImpulse[i] > 0) {
            const endpointN = requiredNormalAt(seg.after, i, seg.motorImpulse[i] / seg.dt, scenario.external?.[i + 1] ?? 0);
            minimumHeldEndpointNormal = Math.min(minimumHeldEndpointNormal, endpointN);
            if (endpointN < -1e-8) acceptedContractViolations.push({ scenario: scenario.name, dt, tick: acceptedTicks, segment: index, contract: 'unilateral-held-endpoint', slot: i, endpointN, seg });
          }
          if (firstLiftTime === null && input.feet[i].position === 0 && input.feet[i].velocity === 0
            && seg.normalImpulse[i] <= 1e-12 && (seg.after.feet[i].position > 1e-12 || seg.after.feet[i].velocity > 1e-10)) {
            firstLiftTime = segmentTime + seg.dt;
          }
          const series = seg.before.series![i], oldR = seg.before.legs[i].restLength, newR = seg.after.legs[i].restLength;
          if (firstRestBoundTime === null && ((oldR > series.minLength && newR <= series.minLength + 1e-10)
            || (oldR < series.maxLength && newR >= series.maxLength - 1e-10))) firstRestBoundTime = segmentTime + seg.dt;
          if (seg.normalImpulse[i] < -1e-10) acceptedContractViolations.push({ scenario: scenario.name, dt, tick: acceptedTicks, segment: index, contract: 'nonnegative-normal', slot: i, impulse: seg.normalImpulse[i] });
        }
        const passiveChannels: [string, number][] = [['series-drag', seg.seriesDragWork[0] + seg.seriesDragWork[1]], ['series-limit', seg.seriesLimitWork[0] + seg.seriesLimitWork[1]]];
        for (const [channel, work] of passiveChannels) {
          if (work > 1e-9) acceptedContractViolations.push({ scenario: scenario.name, dt, tick: acceptedTicks, segment: index, contract: channel, work });
        }
      }
      segmentTime += seg.dt;
    }
    if (!report.accepted) {
      rejectedInputs.push({
        scenario: scenario.name, dt, tick: acceptedTicks, time, initial: scenario.initial,
        input, requestedMotorForces: scenario.motor ?? [0, 0], requestedRestForces: scenario.rest ?? [0, 0],
        externalForces: scenario.external ?? [0, 0, 0], candidate, reason: report.reason,
        report: { advancedTime: report.advancedTime, workResidual: report.workResidual, momentumResidual: report.momentumResidual, segments: report.segments },
        independentLedger: ledger,
      });
      break;
    }
    acceptedTicks++;
    state = result.state;
    time += h;
    trajectory.push({ time, torsoY: state.torso.position, torsoV: state.torso.velocity,
      feet: state.feet.map(f => ({ position: f.position, velocity: f.velocity })),
      restLengths: state.legs.map(l => l.restLength), normalImpulse: report.normalImpulse });
  }
  return {
    scenario: scenario.name,
    dt,
    duration: scenario.duration,
    acceptedTicks,
    advancedTime: time,
    rejectedInputs,
    acceptedMechanicalContractViolations: acceptedContractViolations,
    initial: scenario.initial,
    final: state,
    trajectory,
    firstLiftTime,
    firstRestBoundTime,
    liftBeforeFirstRestBound: firstLiftTime !== null && (firstRestBoundTime === null || firstLiftTime < firstRestBoundTime),
    maxAbsIndependentEnergyResidual: maxIndependentEnergyResidual,
    maxAbsIndependentMomentumResidual: maxIndependentMomentumResidual,
    maxIndependentVsReportedSeriesWorkResidual: maxAbsoluteRestWorkResidual,
    maxSharedForceRatioPerSegment: maxForceRatio,
    maxSharedForceAudit: maxForceAudit,
    maxPositivePowerRatioPerSegment: maxPositivePowerRatio,
    maxPositivePowerAudit: maxPowerAudit,
    maxSeriesRateRatio: maxRateRatio,
    minimumHeldEndpointRequiredNormal: Number.isFinite(minimumHeldEndpointNormal) ? minimumHeldEndpointNormal : null,
    independentWork: totalIndependent,
  };
}

const seriesResults: Record<string, unknown>[] = [];
for (const scenario of seriesScenarios) for (const dt of resolutions) seriesResults.push(runSeriesScenario(scenario, dt));

function compareSeriesTrajectories(rows: Record<string, unknown>[]) {
  const byName = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const list = byName.get(row.scenario as string) ?? [];
    list.push(row); byName.set(row.scenario as string, list);
  }
  return [...byName.entries()].map(([scenario, group]) => {
    const fine = group.find(r => r.dt === 0.0025)!;
    const fineTrace = fine.trajectory as Record<string, unknown>[];
    return {
      scenario,
      comparisons: group.filter(r => r.dt !== 0.0025).map(row => {
        const stride = Math.round((row.dt as number) / 0.0025);
        const trace = row.trajectory as Record<string, unknown>[];
        let maxTorsoHeight = 0, maxRestLength = 0, maxFootPosition = 0;
        for (let i = 0; i < trace.length; i++) {
          const f = fineTrace[(i + 1) * stride - 1]; if (!f) continue;
          const aFeet = trace[i].feet as { position: number; velocity: number }[];
          const bFeet = f.feet as { position: number; velocity: number }[];
          const aRest = trace[i].restLengths as number[], bRest = f.restLengths as number[];
          maxTorsoHeight = Math.max(maxTorsoHeight, Math.abs((trace[i].torsoY as number) - (f.torsoY as number)));
          for (let j = 0; j < 2; j++) {
            maxRestLength = Math.max(maxRestLength, Math.abs(aRest[j] - bRest[j]));
            maxFootPosition = Math.max(maxFootPosition, Math.abs(aFeet[j].position - bFeet[j].position));
          }
        }
        return { dt: row.dt, maxCommonTimeTorsoHeightDelta: maxTorsoHeight, maxCommonTimeRestLengthDelta: maxRestLength, maxCommonTimeFootPositionDelta: maxFootPosition };
      }),
    };
  });
}

let randomState = 337 >>> 0;
const random = (): number => {
  randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5;
  return (randomState >>> 0) / 0x1_0000_0000;
};
const randomCohortCases: Record<string, unknown>[] = [];
const randomRejectedInputs: Record<string, unknown>[] = [];
const randomContractViolations: Record<string, unknown>[] = [];
let randomAcceptedTicks = 0, randomLiftBeforeBoundCount = 0;
let randomFirstLiftCases = 0, randomFirstBoundCases = 0;
let randomMaxEnergyResidual = 0, randomMaxMomentumResidual = 0;
let randomMaxForceRatio = 0, randomMaxPowerRatio = 0;
let randomMaxForceAudit: Record<string, unknown> | null = null, randomMaxPowerAudit: Record<string, unknown> | null = null;
for (let caseIndex = 0; caseIndex < 100; caseIndex++) {
  const torsoMass = 85 + 25 * random(), footMass: [number, number] = [1.5 + 3 * random(), 1.5 + 3 * random()];
  const gravity = 9.5 + 1.2 * random(), torsoY = .9 + .2 * random();
  const stiffness = 3500 + 4500 * random(), eachTorsoLoad = torsoMass * gravity / 2;
  const restLength = torsoY + eachTorsoLoad / stiffness;
  const leg = { restLength, stiffness, forceCap: eachTorsoLoad * (1.4 + .8 * random()), damping: 80 * random(), dampingCap: 150 * random() };
  const joint = { drag: 400 + 400 * random(), rateCap: .5 + random(), minLength: restLength - .5, maxLength: restLength + .5 };
  const initial = newVerticalSupport({
    torsoMass, footMass, gravity, torso: { position: torsoY, velocity: 0 },
    feet: [{ id: 0, position: 0, velocity: 0 }, { id: 1, position: 0, velocity: 0 }],
    legs: [{ ...leg }, { ...leg }], series: [{ ...joint }, { ...joint }],
    actuator: { forceCap: 2000 + 800 * random(), powerCap: 1e7 },
  });
  const opposition = 100 * random(), motor: [number, number] = [100, 0], rest: [number, number] = [-200, 960];
  let state = initial, time = 0, ticks = 0, firstLift: number | null = null, firstBound: number | null = null;
  let caseMaxEnergy = 0, caseMaxMomentum = 0, caseMaxForce = 0, caseMaxPower = 0;
  const acceptedTrace: Record<string, unknown>[] = [];
  for (let tick = 0; tick < 20; tick++) {
    const input = state;
    const result = advanceVerticalSupport(input, .01, { maxInterval: .005, motorForces: motor, restForces: rest, externalForces: [0, -opposition, 0] });
    const report = result.report, candidate = report.candidateState;
    const ledger = independentLedger(input, candidate, report.segments);
    caseMaxEnergy = Math.max(caseMaxEnergy, Math.abs(ledger.energyResidual));
    caseMaxMomentum = Math.max(caseMaxMomentum, Math.abs(ledger.momentumResidual));
    if (!report.accepted) {
      randomRejectedInputs.push({ caseIndex, seed: 337, tick, time, initial, input, motor, rest, external: [0, -opposition, 0], opposition, candidate,
        reason: report.reason, report: { advancedTime: report.advancedTime, workResidual: report.workResidual, momentumResidual: report.momentumResidual, segments: report.segments }, independentLedger: ledger });
      break;
    }
    ticks++; randomAcceptedTicks++;
    let segmentTime = time;
    for (let segmentIndex = 0; segmentIndex < report.segments.length; segmentIndex++) {
      const seg = report.segments[segmentIndex];
      const budget = segmentBudgetAudit(input, seg);
      if (budget.forceRatio > (Number(randomMaxForceAudit?.ratio ?? -1))) randomMaxForceAudit = { caseIndex, tick, segment: segmentIndex, dt: seg.dt,
        directForces: budget.directForces, restForces: budget.restForces,
        sharedForceSum: (budget.directForces ?? []).reduce((sum, f) => sum + Math.abs(f), 0) + (budget.restForces ?? []).reduce((sum, f) => sum + Math.abs(f), 0),
        forceCap: input.actuator.forceCap, ratio: budget.forceRatio };
      if (budget.positivePowerRatio > (Number(randomMaxPowerAudit?.ratio ?? -1))) randomMaxPowerAudit = { caseIndex, tick, segment: segmentIndex, dt: seg.dt,
        directChannelWork: budget.directWork, restChannelWork: budget.restWork, positiveWork: budget.positiveWork,
        powerCap: input.actuator.powerCap, powerBudgetForSegment: input.actuator.powerCap * seg.dt, ratio: budget.positivePowerRatio };
      caseMaxForce = Math.max(caseMaxForce, budget.forceRatio);
      caseMaxPower = Math.max(caseMaxPower, budget.positivePowerRatio);
      const issues: Record<string, unknown>[] = [];
      if (budget.forceRatio > 1 + 1e-9) issues.push({ contract: 'shared-force-cap', ratio: budget.forceRatio });
      if (budget.positivePowerRatio > 1 + 1e-9) issues.push({ contract: 'shared-positive-power-cap', ratio: budget.positivePowerRatio });
      for (const b of budget.boundViolations) issues.push({ contract: 'rest-rate-or-length-bound', ...b });
      if (seg.kind === 'interval') {
        if (seg.normalImpulse.some(n => n < -1e-10)) issues.push({ contract: 'nonnegative-normal', normalImpulse: seg.normalImpulse });
        if (seg.seriesDragWork.some(w => w > 1e-9)) issues.push({ contract: 'passive-series-drag', work: seg.seriesDragWork });
        if (seg.seriesLimitWork.some(w => w > 1e-9)) issues.push({ contract: 'passive-rate-limit', work: seg.seriesLimitWork });
        for (let i = 0; i < 2; i++) if (seg.normalImpulse[i] > 0) {
          const n = requiredNormalAt(seg.after, i, seg.motorImpulse[i] / seg.dt, [0, -opposition, 0][i + 1]);
          if (n < -1e-8) issues.push({ contract: 'unilateral-held-endpoint', slot: i, endpointN: n });
        }
        for (let i = 0; i < 2; i++) {
          if (firstLift === null && input.feet[i].position === 0 && input.feet[i].velocity === 0
            && seg.normalImpulse[i] <= 1e-12 && (seg.after.feet[i].position > 1e-12 || seg.after.feet[i].velocity > 1e-10)) firstLift = segmentTime + seg.dt;
          const a = seg.before.series![i], oldR = seg.before.legs[i].restLength, newR = seg.after.legs[i].restLength;
          if (firstBound === null && ((oldR > a.minLength && newR <= a.minLength + 1e-10) || (oldR < a.maxLength && newR >= a.maxLength - 1e-10))) firstBound = segmentTime + seg.dt;
        }
      }
      for (const issue of issues) randomContractViolations.push({ caseIndex, tick, segmentIndex, issue, input, candidate: seg.after, opposition, motor, rest, external: [0, -opposition, 0] });
      segmentTime += seg.dt;
    }
    state = result.state; time += .01;
    acceptedTrace.push({ time, torsoY: state.torso.position, restLengths: state.legs.map(l => l.restLength), feet: state.feet });
  }
  randomMaxEnergyResidual = Math.max(randomMaxEnergyResidual, caseMaxEnergy);
  randomMaxMomentumResidual = Math.max(randomMaxMomentumResidual, caseMaxMomentum);
  randomMaxForceRatio = Math.max(randomMaxForceRatio, caseMaxForce);
  randomMaxPowerRatio = Math.max(randomMaxPowerRatio, caseMaxPower);
  if (firstLift !== null) randomFirstLiftCases++;
  if (firstBound !== null) randomFirstBoundCases++;
  if (firstLift !== null && (firstBound === null || firstLift < firstBound)) randomLiftBeforeBoundCount++;
  randomCohortCases.push({ caseIndex, seed: 337, opposition, initial, motor, rest, external: [0, -opposition, 0], acceptedTicks: ticks,
    final: state, firstLiftTime: firstLift, firstRestBoundTime: firstBound, liftBeforeFirstRestBound: firstLift !== null && (firstBound === null || firstLift < firstBound), trace: acceptedTrace,
    maxAbsIndependentEnergyResidual: caseMaxEnergy, maxAbsIndependentMomentumResidual: caseMaxMomentum, maxForceRatioPerSegment: caseMaxForce, maxPositivePowerRatioPerSegment: caseMaxPower });
}

// This witness intentionally has a positive average support interval whose
// endpoint required normal changes sign. A valid result must split and release
// rather than retain a grounded foot through negative instantaneous reaction.
const separationInitial = makeState({
  torsoMass: 96, footMass: [2, 2], gravity: 10,
  torsoY: 0.75, torsoV: 1.5,
  footY: [0, 0], footV: [0, 0],
  restLength: 1, stiffness: 2000, legForceCap: 2000, damping: 0, legDampingCap: 0,
  forceCap: 800, powerCap: 1e9,
});
const separationRows: Record<string, unknown>[] = [];
for (const maxInterval of [0.1, 0.01, 0.005, 0.0025]) {
  const dt = 0.1;
  const result = advanceVerticalSupport(separationInitial, dt, { motorForces: [400, 400], maxInterval });
  const report = result.report;
  const s = report.candidateState;
  const finalRequiredNormal = s.feet.map((f, i) => s.footMass[i] * s.gravity
    + axialLegForce(s.torso.position - f.position, s.legs[i])
    + axialLegDamping(s.torso.velocity - f.velocity, s.legs[i]) - report.appliedMotorForces[i]);
  let elapsed = 0;
  const contactRelease = [0, 1].map(i => {
    let release: number | null = null;
    for (const seg of report.segments) {
      if (seg.kind === 'interval' && seg.normalImpulse[i] <= 0
        && (seg.after.feet[i].position > 0 || seg.after.feet[i].velocity > 0)) { release = elapsed; break; }
      elapsed += seg.dt;
    }
    elapsed = 0;
    return release;
  });
  const independent = independentLedger(separationInitial, s, report.segments);
  separationRows.push({
    maxInterval,
    accepted: report.accepted,
    reason: report.reason,
    dt,
    advancedTime: report.advancedTime,
    normalImpulse: report.normalImpulse,
    averageNormalForce: report.normalImpulse.map(n => n / dt),
    finalRequiredNormal,
    finalFeet: s.feet,
    contactRelease,
    segmentKindsAndDurations: report.segments.map(seg => ({ kind: seg.kind, dt: seg.dt, normalImpulse: seg.normalImpulse, afterFeet: seg.after.feet })),
    reportedWorkResidual: report.workResidual,
    reportedMomentumResidual: report.momentumResidual,
    independent,
  });
}

// Long-interval variant: both the interval endpoint and an interior sample can
// have nonnegative reaction while the physical reaction crosses zero between
// them. Audit every candidate segment, even when the overall step rejects.
const hiddenSeparationRows: Record<string, unknown>[] = [];
for (const dt of [0.3, 0.4, 0.6, 0.7]) {
  const result = advanceVerticalSupport(separationInitial, dt, { motorForces: [400, 400], maxInterval: dt });
  const report = result.report;
  const heldSegments = report.segments.flatMap((seg, segmentIndex) => {
    if (seg.kind !== 'interval') return [];
    return [0, 1].flatMap(i => {
      const active = seg.after.feet[i].position === 0 && seg.after.feet[i].velocity === 0 && seg.normalImpulse[i] > 0;
      if (!active) return [];
      const endpointRequiredNormal = requiredNormalAt(seg.after, i, report.appliedMotorForces[i], 0);
      return [{
        segmentIndex,
        intervalStart: seg.before,
        intervalEnd: seg.after,
        intervalDt: seg.dt,
        foot: i,
        normalImpulse: seg.normalImpulse[i],
        meanNormalForce: seg.normalImpulse[i] / seg.dt,
        endpointRequiredNormal,
        violatesEndpointUnilateralConstraint: endpointRequiredNormal < -1e-8,
      }];
    });
  });
  const violations = heldSegments.filter(x => x.violatesEndpointUnilateralConstraint);
  const candidate = report.candidateState;
  hiddenSeparationRows.push({
    dt,
    accepted: report.accepted,
    reason: report.reason,
    advancedTime: report.advancedTime,
    candidate,
    returnedStateUnchangedOnReject: !report.accepted && JSON.stringify(result.state) === JSON.stringify(separationInitial),
    intervalCount: report.segments.filter(x => x.kind === 'interval').length,
    heldIntervalCount: heldSegments.length,
    heldIntervalsWithNegativeEndpointNormal: violations.length,
    heldIntervalAudit: heldSegments,
    firstViolation: violations[0] ?? null,
    independent: independentLedger(separationInitial, candidate, report.segments),
  });
}

// Exact regression fixture from vertical-support.test.ts: in airborne flight,
// the free rest-length trajectory crosses the lower stop and returns inside
// by the coarse endpoint. Audit the independently predicted first arrival and
// the kernel's split/rebound segments at both coarse and fine partitions.
const hiddenRestInitial = newVerticalSupport({
  torsoMass: 96, footMass: [2, 2], gravity: 10,
  torso: { position: 11, velocity: 0 },
  feet: [{ id: 0, position: 10, velocity: 0 }, { id: 1, position: 10, velocity: 0 }],
  legs: [0, 1].map(() => ({ restLength: 1.1, stiffness: 4800, forceCap: 1600, damping: 0, dampingCap: 0 })) as VerticalSupportState['legs'],
  series: [0, 1].map(() => ({ drag: 600, rateCap: 1, minLength: 1.095, maxLength: 1.4 })) as NonNullable<VerticalSupportState['series']>,
  actuator: { forceCap: 2500, powerCap: 1e6 },
});
const hiddenRestOmega = Math.sqrt(2484);
const hiddenRestB = (-380 / 600 + .4) / hiddenRestOmega;
const hiddenRestAt = (t: number): number => {
  const q = Math.exp(-4 * t) * (.1 * Math.cos(hiddenRestOmega * t) + hiddenRestB * Math.sin(hiddenRestOmega * t));
  const qdot = Math.exp(-4 * t) * ((-.4 + hiddenRestB * hiddenRestOmega) * Math.cos(hiddenRestOmega * t)
    + (-4 * hiddenRestB - .1 * hiddenRestOmega) * Math.sin(hiddenRestOmega * t));
  const w = 100 / 600 - 8 * q - qdot;
  return 1.1 + 100 / 600 * t - w / (600 * (1 / 2 + 2 / 96));
};
let hiddenRestLo = 0, hiddenRestHi = .01;
for (let i = 0; i < 64; i++) {
  const mid = (hiddenRestLo + hiddenRestHi) / 2;
  if (hiddenRestAt(mid) <= 1.095) hiddenRestHi = mid; else hiddenRestLo = mid;
}
const hiddenRestRows = [0.1, 0.002].map(maxInterval => {
  const dt = .1;
  const result = advanceVerticalSupport(hiddenRestInitial, dt, { restForces: [100, 100], maxInterval });
  let elapsed = 0, arrival: number | null = null;
  const intervals = result.report.segments.map((seg, segmentIndex) => {
    const row = { segmentIndex, kind: seg.kind, dt: seg.dt, startTime: elapsed,
      beforeRest: seg.before.legs.map(l => l.restLength), afterRest: seg.after.legs.map(l => l.restLength),
      normalImpulse: seg.normalImpulse, afterFeet: seg.after.feet };
    elapsed += seg.dt;
    if (seg.kind === 'interval' && arrival === null && seg.after.legs[0].restLength === 1.095) arrival = elapsed;
    return row;
  });
  return {
    maxInterval, dt, accepted: result.report.accepted, reason: result.report.reason,
    advancedTime: result.report.advancedTime, expectedFirstStopTime: hiddenRestHi,
    independentFreeEndpointRest: hiddenRestAt(dt),
    coarseEndpointReturnsInside: hiddenRestAt(dt) > 1.095,
    firstObservedStopTime: arrival,
    firstStopTimeError: arrival === null ? null : arrival - hiddenRestHi,
    restBoundSplits: result.report.restBoundSplits,
    allObservedRestLengthsRespectStop: result.report.segments.every(seg => seg.after.legs.every(l => l.restLength >= 1.095)),
    intervalSegments: intervals,
    candidateState: result.report.candidateState,
    returnedStateUnchangedOnReject: !result.report.accepted && JSON.stringify(result.state) === JSON.stringify(hiddenRestInitial),
    independentLedger: independentLedger(hiddenRestInitial, result.report.candidateState, result.report.segments),
  };
});

const sourceShaEnd = sourceVersion();
const scriptShaEnd = createHash('sha256').update(readFileSync(selfPath)).digest('hex');
const unchangedDuringRun = sourceShaStart === sourceShaEnd && scriptShaStart === scriptShaEnd;
console.log(JSON.stringify({
  diagnostic: 'finite-mass vertical support numerical probe; draft kernel only, no gait calibration/readiness claim',
  runtime,
  runtimeRequirement: 'Node 22.x',
  sourceShaAtStart: sourceShaStart,
  sourceShaAtEnd: sourceShaEnd,
  scriptShaAtStart: scriptShaStart,
  scriptShaAtEnd: scriptShaEnd,
  unchangedDuringRun,
  gravityYardsPerSecondSquared: G_YD_S2,
  ordinaryDuration,
  resolutions,
  results,
  seriesResults,
  seriesTrajectoryResolutionComparisons: compareSeriesTrajectories(seriesResults),
  randomSeriesCohort: {
    seed: 337,
    casesRequested: 100,
    ticksRequestedPerCase: 20,
    nominalTicksRequested: 2000,
    acceptedTicks: randomAcceptedTicks,
    rejectedCaseCount: randomRejectedInputs.length,
    rejectedInputs: randomRejectedInputs,
    acceptedMechanicalContractViolationCount: randomContractViolations.length,
    acceptedMechanicalContractViolations: randomContractViolations,
    liftOffCases: randomFirstLiftCases,
    structuralBoundCases: randomFirstBoundCases,
    liftBeforeFirstRestBoundCases: randomLiftBeforeBoundCount,
    maxAbsIndependentEnergyResidual: randomMaxEnergyResidual,
    maxAbsIndependentMomentumResidual: randomMaxMomentumResidual,
    maxSharedForceRatioPerSegment: randomMaxForceRatio,
    maxSharedForceAudit: randomMaxForceAudit,
    maxPositivePowerRatioPerSegment: randomMaxPowerRatio,
    maxPositivePowerAudit: randomMaxPowerAudit,
    cases: randomCohortCases,
  },
  separationWitness: { input: separationInitial, motorForces: [400, 400], rows: separationRows },
  hiddenInteriorSeparation: { input: separationInitial, motorForces: [400, 400], rows: hiddenSeparationRows },
  hiddenInteriorRestStop: { input: hiddenRestInitial, restForces: [100, 100], independentReference: 'q\'\'+8q\'+2500q=0; analytic free rest length crosses minLength=1.095 inside dt=.1 and returns above it at endpoint', rows: hiddenRestRows },
}, null, 2));
if (!unchangedDuringRun) process.exitCode = 2;
