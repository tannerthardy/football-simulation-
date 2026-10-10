/** Research-only normal sole compliance coupled to the shared 18D material
 * support residual. Units kg, yd, s. No World, friction, impact, or capacity.
 * Each foot's K and C are totals over normalized positive patch area weights.
 */
import { evaluateSpatialSupportCandidate, newSpatialSupport, spatialSupportEnergy, spatialSupportEndpoints,
  type SpatialImpulseSet, type SpatialSupportCandidate, type SpatialSupportState } from './spatial-support.js';
import { createMaterialPlaneCandidate, inspectMaterialPlane, type MaterialPlaneReport } from './material-plane.js';
import { rigidAngularMomentum, rigidBasisError, rigidPointPosition, rigidWorldOffset, v3Add, v3Cross, v3Dot, v3Norm, v3Scale, v3Sub,
  type Vec3 } from './material-rigid.js';

export interface CompliantSolePatch {
  id: string;
  local: Vec3;
  areaWeight: number;
}
export interface SpatialSoleComplianceMaterial {
  planeHeight?: number;
  points: [CompliantSolePatch[], CompliantSolePatch[]];
  /** Per-foot total stiffness (force / distance). */
  stiffness: [number, number];
  /** Per-foot total normal dashpot coefficient (force / speed). */
  damping: [number, number];
}
/** Short alias used by standalone mechanics diagnostics. */
export type CompliantSoleMaterial = SpatialSoleComplianceMaterial;
export interface SpatialSoleComplianceOptions {
  externalImpulses?: SpatialImpulseSet;
  tolerance?: number;
  geometryTolerance?: number;
  maxIterations?: number;
  maxLineSearch?: number;
  maxAngularPhase?: number;
  /** Trace estimate for coupled leg and sole elastic response. */
  maxCombinedElasticPhase?: number;
  /** Trace estimate for compressed sole damping response. */
  maxDampingNumber?: number;
  materialPlaneOptions?: {
    timeTolerance?: number;
    gapTolerance?: number;
    maxDepth?: number;
    maxNodes?: number;
  };
}
export interface SolePointReport {
  foot: 0 | 1;
  id: string;
  gapBefore: number;
  gapAfter: number;
  mode: 'free' | 'compressed' | 'coincident' | 'unresolved';
  modeCertificate: MaterialPlaneReport;
  springForce: number;
  dampingForce: number;
  springImpulse: number;
  dampingImpulse: number;
  springWork: number;
  dampingWork: number;
  discreteSpringWork: number;
  dampingLawWork: number;
  springAttachmentWorkResidual: number;
  dampingAttachmentWorkResidual: number;
  potentialBefore: number;
  potentialAfter: number;
  springWorkResidual: number;
}
export interface SpatialSoleComplianceReport extends SpatialSupportCandidate {
  accepted: boolean;
  reason: string | null;
  iterations: number;
  residual: number;
  candidateState: SpatialSupportState;
  solePoints: SolePointReport[];
  solePotentialBefore: number; solePotentialAfter: number;
  soleSpringWork: number; soleDampingWork: number; knownExternalWork: number;
  workResidual: number; linearMomentumResidual: Vec3; angularMomentumResidual: Vec3;
  maxCombinedElasticPhase: number; maxDampingNumber: number;
  /** Support energy excludes turf potential; this ledger includes it. */
  totalEnergyBefore: number; totalEnergyAfter: number;
}
const zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });
const normResidual = (r: number[]) => Math.max(...r.map(Math.abs));
const bodies = (s: SpatialSupportState) => [s.torso, ...s.feet] as const;
function finiteNumbers(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finiteNumbers);
  if (value && typeof value === 'object') return Object.values(value).every(finiteNumbers);
  return true;
}
const nextFloat = (x: number, up: boolean): number => {
  if (!Number.isFinite(x)) return x;
  if (x === 0) return up ? Number.MIN_VALUE : -Number.MIN_VALUE;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  let bits = view.getBigUint64(0);
  bits += (x > 0) === up ? 1n : -1n;
  view.setBigUint64(0, bits);
  return view.getFloat64(0);
};
const addInterval = (a: { lo: number; hi: number }, b: { lo: number; hi: number }) => ({
  lo: nextFloat(a.lo + b.lo, false),
  hi: nextFloat(a.hi + b.hi, true),
});
const mulIntervalScalar = (a: { lo: number; hi: number }, s: number) => s >= 0
  ? { lo: nextFloat(a.lo * s, false), hi: nextFloat(a.hi * s, true) }
  : { lo: nextFloat(a.hi * s, false), hi: nextFloat(a.lo * s, true) };
function validateMaterial(m: SpatialSoleComplianceMaterial): SpatialSoleComplianceMaterial {
  const planeHeight = m.planeHeight ?? 0;
  if (!Number.isFinite(planeHeight) || m.points.length !== 2 || m.stiffness.length !== 2 || m.damping.length !== 2)
    throw new RangeError('Two finite sole material slots required');
  for (let f = 0; f < 2; f++) {
    if (!(Number.isFinite(m.stiffness[f]) && m.stiffness[f] >= 0 && Number.isFinite(m.damping[f]) && m.damping[f] >= 0))
      throw new RangeError('Sole stiffness and damping must be finite nonnegative material values');
    const ps = m.points[f];
    if (!ps.length || ps.some(p => !p.id || ![p.local.x, p.local.y, p.local.z, p.areaWeight].every(Number.isFinite) || !(p.areaWeight > 0))
      || new Set(ps.map(p => p.id)).size !== ps.length || Math.abs(ps.reduce((a, p) => a + p.areaWeight, 0) - 1) > 1e-12)
      throw new RangeError('Each foot needs uniquely identified positive patch weights summing to one');
  }
  return {...m,planeHeight};
}
function certificate(
  before: SpatialSupportState,
  candidate: SpatialSupportCandidate,
  h: number,
  foot: 0 | 1,
  local: Vec3,
  planeHeight: number,
  options: SpatialSoleComplianceOptions['materialPlaneOptions'],
): { mode: 'free' | 'compressed' | 'coincident'; report: MaterialPlaneReport } {
  const beforeFoot = before.feet[foot];
  const afterFoot = candidate.state.feet[foot];
  const gapBefore = rigidPointPosition(beforeFoot, local).z - planeHeight;
  const gapAfter = rigidPointPosition(afterFoot, local).z - planeHeight;
  const planeCandidate = createMaterialPlaneCandidate(beforeFoot, afterFoot, h, local,
    { normal: { x: 0, y: 0, z: 1 }, height: planeHeight });
  const report = inspectMaterialPlane(planeCandidate, options);

  if (report.status === 'coincident') return { mode: 'coincident', report };
  if (report.status === 'clear') {
    if (gapBefore === 0 || gapAfter === 0 || Math.sign(gapBefore) !== Math.sign(gapAfter))
      throw new RangeError('Unresolved sole endpoint mode');
    return { mode: gapBefore > 0 ? 'free' : 'compressed', report };
  }
  // A root bracket may be assigned to an exact endpoint only when the
  // endpoint gap is exactly zero and the full-interval derivative enclosure
  // proves strict monotonicity, excluding a hidden interior cross-and-return.
  if ((report.status !== 'roots' && report.status !== 'ambiguous') || report.roots.length !== 1
    || report.unresolved.length || !report.timeResolutionMet)
    throw new RangeError('Sole path has an unresolved or interior plane crossing');
  const root = report.roots[0];
  const atStart = root.lo === 0 && gapBefore === 0;
  const atEnd = root.hi === h && gapAfter === 0;
  if (!(atStart || atEnd)) throw new RangeError('Sole path has an interior plane crossing');
  const coefficients = planeCandidate.coefficients;
  // Derivative quadratic in Bernstein form: c1, c1+c2, c1+2c2+3c3.
  const derivativeStart = coefficients[1];
  const derivativeMiddle = addInterval(coefficients[1], coefficients[2]);
  const derivativeEnd = addInterval(addInterval(coefficients[1], mulIntervalScalar(coefficients[2], 2)),
    mulIntervalScalar(coefficients[3], 3));
  const derivativeBounds = [derivativeStart, derivativeMiddle, derivativeEnd];
  if (!(derivativeBounds.every(x => x.lo > 0) || derivativeBounds.every(x => x.hi < 0)))
    throw new RangeError('Endpoint sole root lacks a strict open-interval sign certificate');
  const interiorEndpointGap = atStart ? gapAfter : gapBefore;
  if (interiorEndpointGap === 0)
    throw new RangeError('Two endpoint roots require an exact coincident-path certificate');
  return { mode: interiorEndpointGap > 0 ? 'free' : 'compressed', report };
}

interface SoleImpulseAddition {
  foot: 0 | 1;
  id: string;
  local: Vec3;
  impulse: Vec3;
}
function loadsWith(before: SpatialImpulseSet, additions: SoleImpulseAddition[]): SpatialImpulseSet {
  const result = before.map(load => ({
    center: load.center && { ...load.center },
    couple: load.couple && { ...load.couple },
    points: (load.points ?? []).map(point => ({
      id: point.id,
      local: { ...point.local },
      impulse: { ...point.impulse },
    })),
  })) as SpatialImpulseSet;
  for (const addition of additions)
    result[addition.foot + 1].points!.push({ id: addition.id, local: addition.local, impulse: addition.impulse });
  return result;
}

export function advanceSpatialSoleCompliance(
  beforeInput: SpatialSupportState,
  h: number,
  materialInput: SpatialSoleComplianceMaterial,
  options: SpatialSoleComplianceOptions = {},
): { state: SpatialSupportState; report: SpatialSoleComplianceReport } {
  const before = newSpatialSupport(beforeInput);
  const material = validateMaterial(materialInput);
  const tolerance = options.tolerance ?? 1e-10;
  const geometryTolerance = options.geometryTolerance ?? 1e-9;
  const maxAngular = options.maxAngularPhase ?? .5;
  const maxElastic = options.maxCombinedElasticPhase ?? .5;
  const maxDamping = options.maxDampingNumber ?? .5;
  const maxIterations = options.maxIterations ?? 60;
  const maxLineSearch = options.maxLineSearch ?? 24;
  if (!(Number.isFinite(h) && h > 0)
    || ![tolerance, geometryTolerance, maxAngular, maxElastic, maxDamping].every(x => Number.isFinite(x) && x > 0)
    || ![maxIterations, maxLineSearch].every(x => Number.isInteger(x) && x >= 1)) {
    throw new RangeError('Finite positive interval and numerical budgets required');
  }

  const known = options.externalImpulses ?? [{}, {}, {}];
  const start = spatialSupportEndpoints(before);
  if (known.length !== 3 || known.some(load =>
    ![load.center ?? zero(), load.couple ?? zero()].every(v => [v.x, v.y, v.z].every(Number.isFinite))
    || (load.points ?? []).some(p => typeof p.id !== 'string' || p.id.startsWith('sole:')
      || ![p.local.x, p.local.y, p.local.z, p.impulse.x, p.impulse.y, p.impulse.z].every(Number.isFinite))
    || new Set((load.points ?? []).map(p => p.id)).size !== (load.points ?? []).length)) {
    throw new RangeError('Finite uniquely identified known point impulses required');
  }

  const trialLoads = (candidate: SpatialSupportCandidate): SpatialImpulseSet => {
    const extra: SoleImpulseAddition[] = [];
    for (let foot = 0; foot < 2; foot++) {
      for (const patch of material.points[foot]) {
        const mode = certificate(before, candidate, h, foot as 0 | 1, patch.local,
          material.planeHeight!, options.materialPlaneOptions);
        const gapBefore = rigidPointPosition(before.feet[foot], patch.local).z - material.planeHeight!;
        const gapAfter = rigidPointPosition(candidate.state.feet[foot], patch.local).z - material.planeHeight!;
        const indentationBefore = Math.max(0, -gapBefore);
        const indentationAfter = Math.max(0, -gapAfter);
        const weight = patch.areaWeight;
        const stiffness = material.stiffness[foot];
        const damping = material.damping[foot];
        // U = 1/2 K w max(-g, 0)^2. On a uniform compressed branch,
        // the mean endpoint indentation is the exact discrete-gradient force.
        const springForce = mode.mode === 'compressed'
          ? .5 * stiffness * weight * (indentationBefore + indentationAfter)
          : 0;
        // The unilateral parallel dashpot can oppose compression only; it
        // never becomes a tensile turf force during release.
        const dampingForce = mode.mode === 'compressed'
          ? damping * weight * Math.max(0, -(gapAfter - gapBefore) / h)
          : 0;

        extra.push({
          foot: foot as 0 | 1,
          id: `sole:${foot}:${patch.id}:spring`,
          local: patch.local,
          impulse: { x: 0, y: 0, z: h * springForce },
        });
        if (dampingForce > 0) {
          extra.push({
            foot: foot as 0 | 1,
            id: `sole:${foot}:${patch.id}:damper`,
            local: patch.local,
            impulse: { x: 0, y: 0, z: h * dampingForce },
          });
        }
      }
    }
    return loadsWith(known, extra);
  };

  const materialBodies = bodies(before);
  let values = start.flatMap((endpoint, i) => [
    endpoint.velocity.x,
    endpoint.velocity.y,
    endpoint.velocity.z,
    endpoint.angularMomentum.x / materialBodies[i].inertia,
    endpoint.angularMomentum.y / materialBodies[i].inertia,
    endpoint.angularMomentum.z / materialBodies[i].inertia,
  ]);
  let candidate: SpatialSupportCandidate | null = null;
  let reason: string | null = null;
  let iterations = 0;

  const unpack = (): typeof start => [0, 1, 2].map(i => ({
    velocity: { x: values[6 * i], y: values[6 * i + 1], z: values[6 * i + 2] },
    angularMomentum: {
      x: values[6 * i + 3] * materialBodies[i].inertia,
      y: values[6 * i + 4] * materialBodies[i].inertia,
      z: values[6 * i + 5] * materialBodies[i].inertia,
    },
  })) as typeof start;
  const evaluate = (unknowns: number[]): SpatialSupportCandidate => {
    values = unknowns;
    const provisional = evaluateSpatialSupportCandidate(before, h, unpack(), known, geometryTolerance);
    return evaluateSpatialSupportCandidate(before, h, unpack(), trialLoads(provisional), geometryTolerance);
  };
  try {
    candidate = evaluate(values);
  } catch (error) {
    if (error instanceof RangeError) reason = error.message;
    else throw error;
  }
  const residual = (value: SpatialSupportCandidate) => normResidual(value.normalizedResidual);

  for (; candidate && !reason && iterations < maxIterations; iterations++) {
    const currentResidual = residual(candidate);
    if (currentResidual <= tolerance) break;
    const base = candidate.state;
    const baseline = [
      base.torso.velocity.x, base.torso.velocity.y, base.torso.velocity.z,
      base.torso.angularMomentum.x / base.torso.inertia,
      base.torso.angularMomentum.y / base.torso.inertia,
      base.torso.angularMomentum.z / base.torso.inertia,
      ...base.feet.flatMap(foot => [
        foot.velocity.x, foot.velocity.y, foot.velocity.z,
        foot.angularMomentum.x / foot.inertia,
        foot.angularMomentum.y / foot.inertia,
        foot.angularMomentum.z / foot.inertia,
      ]),
    ];
    const jacobian = Array.from({ length: 18 }, () => Array(18).fill(0) as number[]);
    let failedColumn = false;

    for (let column = 0; column < 18; column++) {
      const epsilon = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(baseline[column]));
      const plus = [...baseline];
      const minus = [...baseline];
      plus[column] += epsilon;
      minus[column] -= epsilon;
      let positive: SpatialSupportCandidate | null = null;
      let negative: SpatialSupportCandidate | null = null;
      try { positive = evaluate(plus); }
      catch (error) { if (!(error instanceof RangeError)) throw error; }
      try { negative = evaluate(minus); }
      catch (error) { if (!(error instanceof RangeError)) throw error; }
      if (!positive && !negative) {
        failedColumn = true;
        break;
      }
      for (let row = 0; row < 18; row++) {
        jacobian[row][column] = positive && negative
          ? (positive.normalizedResidual[row] - negative.normalizedResidual[row]) / (2 * epsilon)
          : positive
            ? (positive.normalizedResidual[row] - candidate.normalizedResidual[row]) / epsilon
            : (candidate.normalizedResidual[row] - negative!.normalizedResidual[row]) / epsilon;
      }
    }
    if (failedColumn) {
      reason = 'Sole mode prevents a local coupled Jacobian; subdivide the physical interval';
      break;
    }
    values = baseline;
    const correction = solveLinear(jacobian, candidate.normalizedResidual.map(value => -value));
    if (!correction) {
      reason = 'Singular coupled sole/material response';
      break;
    }

    let acceptedLineSearch = false;
    let lineSearchScale = 1;
    for (let search = 0; search < maxLineSearch; search++) {
      const nextValues = baseline.map((value, i) => value + lineSearchScale * correction[i]);
      try {
        const nextCandidate = evaluate(nextValues);
        if (residual(nextCandidate) < currentResidual) {
          candidate = nextCandidate;
          acceptedLineSearch = true;
          break;
        }
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
      }
      lineSearchScale *= .5;
    }
    if (!acceptedLineSearch) {
      values = baseline;
      reason = 'Sole branch or material line search requires a shorter physical interval';
      break;
    }
  }
  if (candidate) {
    values = [
      candidate.state.torso.velocity.x,
      candidate.state.torso.velocity.y,
      candidate.state.torso.velocity.z,
      candidate.state.torso.angularMomentum.x / candidate.state.torso.inertia,
      candidate.state.torso.angularMomentum.y / candidate.state.torso.inertia,
      candidate.state.torso.angularMomentum.z / candidate.state.torso.inertia,
      ...candidate.state.feet.flatMap(foot => [
        foot.velocity.x, foot.velocity.y, foot.velocity.z,
        foot.angularMomentum.x / foot.inertia,
        foot.angularMomentum.y / foot.inertia,
        foot.angularMomentum.z / foot.inertia,
      ]),
    ];
  }
  if (candidate && !reason && residual(candidate) > tolerance)
    reason = 'Coupled sole/material iteration limit';
  if (!candidate) {
    // A stationary-pose endpoint is diagnostic only. It preserves the input
    // state on rejection and helps expose geometry/mode errors without an
    // invalid gravity-seeded candidate being mistaken for a physical step.
    values = start.flatMap((endpoint, i) => [
      -endpoint.velocity.x,
      -endpoint.velocity.y,
      -endpoint.velocity.z,
      -endpoint.angularMomentum.x / materialBodies[i].inertia,
      -endpoint.angularMomentum.y / materialBodies[i].inertia,
      -endpoint.angularMomentum.z / materialBodies[i].inertia,
    ]);
    try {
      candidate = evaluate(values);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
    }
    if (!candidate) {
      try {
        candidate = evaluateSpatialSupportCandidate(before, h, unpack(), known, geometryTolerance);
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        const energy = spatialSupportEnergy(before);
        const potential = material.points.flatMap((patches, foot) => patches.map(patch => {
          const gap = rigidPointPosition(before.feet[foot], patch.local).z - material.planeHeight!;
          return .5 * material.stiffness[foot] * patch.areaWeight * Math.max(0, -gap) ** 2;
        })).reduce((sum, value) => sum + value, 0);
        const unresolved: SolePointReport[] = material.points.flatMap((patches, foot) => patches.map(patch => {
          const gap = rigidPointPosition(before.feet[foot], patch.local).z - material.planeHeight!;
          const patchPotential = .5 * material.stiffness[foot] * patch.areaWeight * Math.max(0, -gap) ** 2;
          return {
            foot: foot as 0 | 1,
            id: patch.id,
            gapBefore: gap,
            gapAfter: gap,
            mode: 'unresolved' as const,
            modeCertificate: {
              status: 'unsupported' as const,
              reason: error.message,
              roots: [],
              nodes: 0,
              unresolved: [{ lo: 0, hi: h }],
              maxBracketWidth: h,
              timeResolutionMet: false,
              penetrationBeyondTolerance: { possible: true, certain: false },
            },
            springForce: 0,
            dampingForce: 0,
            springImpulse: 0,
            dampingImpulse: 0,
            springWork: 0,
            dampingWork: 0,
            discreteSpringWork: 0,
            dampingLawWork: 0,
            springAttachmentWorkResidual: 0,
            dampingAttachmentWorkResidual: 0,
            potentialBefore: patchPotential,
            potentialAfter: patchPotential,
            springWorkResidual: 0,
          };
        }));
        const zeroLeg = {
          lengthBefore: 0, lengthAfter: 0, minimumChordLength: 0, discreteDirection: zero(),
          springForce: 0, dampingForce: 0, impulse: zero(), springWork: 0, dampingWork: 0,
          potentialChange: 0, springWorkResidual: 0,
        };
        const report: SpatialSoleComplianceReport = {
          state: before,
          candidateState: before,
          accepted: false,
          reason: reason ?? error.message,
          iterations,
          residual: Infinity,
          momentumResiduals: [0, 1, 2].map(() => ({ linear: zero(), angular: zero() })),
          normalizedResidual: Array(18).fill(Infinity),
          legs: [zeroLeg, zeroLeg],
          external: [],
          externalWork: 0,
          dampingWork: 0,
          knownLinearImpulse: zero(),
          knownAngularImpulse: zero(),
          minimumChordLength: 0,
          maxAngularPhase: 0,
          maxElasticPhase: 0,
          maxAttachmentResidual: 0,
          solePoints: unresolved,
          solePotentialBefore: potential,
          solePotentialAfter: potential,
          soleSpringWork: 0,
          soleDampingWork: 0,
          knownExternalWork: 0,
          workResidual: 0,
          linearMomentumResidual: zero(),
          angularMomentumResidual: zero(),
          maxCombinedElasticPhase: 0,
          maxDampingNumber: 0,
          totalEnergyBefore: energy.total + potential,
          totalEnergyAfter: energy.total + potential,
        };
        return { state: before, report };
      }
    }
  }
  const converged = candidate;
  const energyBefore = spatialSupportEnergy(before);
  const energyAfter = spatialSupportEnergy(converged.state);
  const pointReports: SolePointReport[] = [];
  let solePotentialBefore = 0;
  let solePotentialAfter = 0;
  let soleSpringWork = 0;
  let soleDampingWork = 0;
  let soleRateSquared = 0;
  let soleDampingNumber = 0;

  for (let foot = 0; foot < 2; foot++) {
    for (const patch of material.points[foot]) {
      const gapBefore = rigidPointPosition(before.feet[foot], patch.local).z - material.planeHeight!;
      const gapAfter = rigidPointPosition(converged.state.feet[foot], patch.local).z - material.planeHeight!;
      let mode: { mode: 'free' | 'compressed' | 'coincident' | 'unresolved'; report: MaterialPlaneReport };
      try {
        mode = certificate(before, converged, h, foot as 0 | 1, patch.local,
          material.planeHeight!, options.materialPlaneOptions);
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        reason = reason ?? error.message;
        mode = {
          mode: 'unresolved',
          report: {
            status: 'unsupported',
            reason: error.message,
            roots: [],
            nodes: 0,
            unresolved: [{ lo: 0, hi: h }],
            maxBracketWidth: h,
            timeResolutionMet: false,
            penetrationBeyondTolerance: { possible: true, certain: false },
          },
        };
      }
      const indentationBefore = Math.max(0, -gapBefore);
      const indentationAfter = Math.max(0, -gapAfter);
      const stiffness = material.stiffness[foot] * patch.areaWeight;
      const damping = material.damping[foot] * patch.areaWeight;
      const springForce = mode.mode === 'compressed'
        ? .5 * stiffness * (indentationBefore + indentationAfter)
        : 0;
      const dampingForce = mode.mode === 'compressed'
        ? damping * Math.max(0, -(gapAfter - gapBefore) / h)
        : 0;
      const springImpulse = h * springForce;
      const dampingImpulse = h * dampingForce;
      const potentialBefore = .5 * stiffness * indentationBefore ** 2;
      const potentialAfter = .5 * stiffness * indentationAfter ** 2;
      // Audit actual point work from the shared material Jacobian. Do not
      // infer it from the gap law: that would hide a mismatch by subtracting
      // expected sole work from the external-work ledger.
      const springWork = converged.external.find(entry => entry.id === `sole:${foot}:${patch.id}:spring`)?.work ?? 0;
      const dampingWork = converged.external.find(entry => entry.id === `sole:${foot}:${patch.id}:damper`)?.work ?? 0;
      const discreteSpringWork = springForce * (gapAfter - gapBefore);
      const dampingLawWork = dampingForce * (gapAfter - gapBefore);
      const midpointOffset = v3Scale(v3Add(
        rigidWorldOffset(before.feet[foot], patch.local),
        rigidWorldOffset(converged.state.feet[foot], patch.local),
      ), .5);
      const rotationalLever = v3Cross(midpointOffset, { x: 0, y: 0, z: 1 });
      const mobility = 1 / before.feet[foot].mass
        + v3Dot(rotationalLever, rotationalLever) / before.feet[foot].inertia;
      if (mode.mode === 'compressed') {
        // These trace estimates are local time-accuracy guards, not event
        // certificates, fitted material capacities, or strength limits.
        soleRateSquared += stiffness * mobility;
        soleDampingNumber += h * damping * mobility;
      }
      solePotentialBefore += potentialBefore;
      solePotentialAfter += potentialAfter;
      soleSpringWork += springWork;
      soleDampingWork += dampingWork;
      pointReports.push({
        foot: foot as 0 | 1,
        id: patch.id,
        gapBefore,
        gapAfter,
        mode: mode.mode,
        modeCertificate: mode.report,
        springForce,
        dampingForce,
        springImpulse,
        dampingImpulse,
        springWork,
        dampingWork,
        discreteSpringWork,
        dampingLawWork,
        springAttachmentWorkResidual: springWork - discreteSpringWork,
        dampingAttachmentWorkResidual: dampingWork - dampingLawWork,
        potentialBefore,
        potentialAfter,
        springWorkResidual: springWork + potentialAfter - potentialBefore,
      });
    }
  }
  const maxCombinedElasticPhase = h * Math.sqrt(converged.maxElasticPhase ** 2 / (h * h) + soleRateSquared);
  const totalEnergyBefore = energyBefore.total + solePotentialBefore;
  const totalEnergyAfter = energyAfter.total + solePotentialAfter;
  const knownExternalWork = converged.external
    .filter(entry => !entry.id.startsWith('sole:'))
    .reduce((sum, entry) => sum + entry.work, 0);
  const workResidual = totalEnergyAfter - totalEnergyBefore - knownExternalWork
    - converged.dampingWork - soleDampingWork;
  if (!reason && converged.maxAngularPhase > maxAngular)
    reason = 'Angular trajectory budget requires a shorter physical interval';
  if (!reason && maxCombinedElasticPhase > maxElastic)
    reason = 'Combined leg/sole elastic response budget requires a shorter physical interval';
  if (!reason && soleDampingNumber > maxDamping)
    reason = 'Sole damping number requires a shorter physical interval';

  const beforeBodies = bodies(before);
  const afterBodies = bodies(converged.state);
  const angularLedger = v3Sub(
    v3Sub(
      afterBodies.reduce((sum, body) => v3Add(sum, rigidAngularMomentum(body)), zero()),
      beforeBodies.reduce((sum, body) => v3Add(sum, rigidAngularMomentum(body)), zero()),
    ),
    converged.knownAngularImpulse,
  );
  const report: SpatialSoleComplianceReport = {
    ...converged,
    accepted: reason === null,
    reason,
    iterations,
    residual: residual(converged),
    candidateState: converged.state,
    solePoints: pointReports,
    solePotentialBefore,
    solePotentialAfter,
    soleSpringWork,
    soleDampingWork,
    knownExternalWork,
    workResidual,
    linearMomentumResidual: converged.momentumResiduals.reduce((sum, item) => v3Add(sum, item.linear), zero()),
    angularMomentumResidual: angularLedger,
    maxCombinedElasticPhase,
    maxDampingNumber: soleDampingNumber,
    totalEnergyBefore,
    totalEnergyAfter,
  };
  const workTolerance = 256 * Number.EPSILON
    * Math.max(1, Math.abs(totalEnergyBefore), Math.abs(totalEnergyAfter), Math.abs(knownExternalWork))
    + 4 * tolerance * afterBodies.reduce((sum, body, i) => sum
      + body.mass * v3Norm(v3Scale(v3Add(beforeBodies[i].velocity, body.velocity), .5))
      + v3Norm(v3Scale(v3Add(beforeBodies[i].angularMomentum, body.angularMomentum), .5)), 1);
  const soleWorkMismatch = pointReports.some(point => Math.abs(point.springWorkResidual) > workTolerance
    || Math.abs(point.springAttachmentWorkResidual) > workTolerance
    || Math.abs(point.dampingAttachmentWorkResidual) > workTolerance);
  if (report.accepted && (Math.abs(workResidual) > workTolerance || soleWorkMismatch
    || soleDampingWork > workTolerance || converged.dampingWork > workTolerance)) {
    report.accepted = false;
    report.reason = 'Sole/material energy, discrete-gradient, or damping passivity residual';
  }
  if (report.accepted && (!finiteNumbers(report) || converged.maxAttachmentResidual > 1e-8
    || afterBodies.some(body => rigidBasisError(body.basis) > 1e-8))) {
    report.accepted = false;
    report.reason = 'Nonfinite work/geometry ledger or material attachment accuracy';
  }
  return { state: report.accepted ? newSpatialSupport(converged.state) : before, report };
}

function solveLinear(matrix: number[][], rhs: number[]): number[] | null {
  const n = rhs.length;
  const augmented = matrix.map((row, i) => [...row, rhs[i]]);
  const scale = Math.max(1, ...matrix.flat().map(Math.abs));
  for (let column = 0; column < n; column++) {
    let pivot = column;
    for (let row = column + 1; row < n; row++) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (!(Math.abs(augmented[pivot][column]) > 128 * Number.EPSILON * scale)) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let j = column; j <= n; j++) augmented[column][j] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let j = 0; j <= n; j++) augmented[row][j] -= factor * augmented[column][j];
    }
  }
  const solution = augmented.map(row => row[n]);
  return solution.every(Number.isFinite) ? solution : null;
}
