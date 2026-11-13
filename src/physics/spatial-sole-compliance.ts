/** Research-only compliant sole response coupled to the shared 18D material
 * support residual. Units kg, yd, s. No World, gait, or impact integration.
 * Each foot's K, C and Kt are totals over normalized positive patch weights.
 */
import { evaluateSpatialSupportCandidate, newSpatialSupport, spatialSupportEnergy, spatialSupportEndpoints,
  type SpatialImpulseSet, type SpatialSupportCandidate, type SpatialSupportState } from './spatial-support.js';
import { createMaterialPlaneCandidate, inspectMaterialPlane, type MaterialPlaneReport } from './material-plane.js';
import { rigidAngularMomentum, rigidBasisError, rigidPointPosition, rigidPointVelocity, rigidWorldOffset, v3Add, v3Cross, v3Dot, v3Norm, v3Scale, v3Sub,
  type Vec3 } from './material-rigid.js';
import { advanceSoleShear, type SoleShearReport } from './sole-shear.js';

export interface CompliantSolePatch {
  id: string;
  local: Vec3;
  areaWeight: number;
  /** Coulomb coefficient for this patch; defaults to zero. */
  friction?: number;
}
export interface SpatialSoleComplianceMaterial {
  planeHeight?: number;
  points: [CompliantSolePatch[], CompliantSolePatch[]];
  /** Per-foot total stiffness (force / distance). */
  stiffness: [number, number];
  /** Per-foot total normal dashpot coefficient (force / speed). */
  damping: [number, number];
  /** Optional per-foot total tangential stiffness (force / distance). */
  shearStiffness?: [number, number];
}
/** Short alias used by standalone mechanics diagnostics. */
export type CompliantSoleMaterial = SpatialSoleComplianceMaterial;
export interface SpatialSoleShearPatchState {
  foot: 0 | 1;
  id: string;
  stretch: { x: number; y: number };
}
/** Persistent shear stretch, bound to an exact versioned sole material. */
export interface SpatialSoleShearState {
  fingerprint: string;
  points: SpatialSoleShearPatchState[];
}
export interface SpatialSoleComplianceOptions {
  /** Required whenever any patch has positive friction and its foot has Kt>0. */
  shearState?: SpatialSoleShearState;
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
  maxShearElasticPhase?: number;
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
  shear: SoleShearPointReport | null;
}
export interface SoleShearPointReport {
  friction: number;
  stiffness: number;
  capacityBefore: number;
  capacityAfter: number;
  inputStretch: { x: number; y: number };
  finalStretch: { x: number; y: number };
  constitutive: SoleShearReport;
  actualAttachmentWork: number;
  constitutiveAttachmentWork: number;
  attachmentWorkResidual: number;
  energyResidual: number;
  potentialBefore: number;
  potentialAfter: number;
}
export interface SpatialSoleComplianceReport extends SpatialSupportCandidate {
  accepted: boolean;
  reason: string | null;
  iterations: number;
  candidateEvaluations: number;
  shearConstitutiveEvaluations: number;
  shearQuadratureEvaluations: number;
  residual: number;
  candidateState: SpatialSupportState;
  candidateShearState: SpatialSoleShearState | null;
  solePoints: SolePointReport[];
  solePotentialBefore: number; solePotentialAfter: number;
  shearPotentialBefore: number; shearPotentialAfter: number;
  soleSpringWork: number; soleDampingWork: number; knownExternalWork: number;
  soleShearWork: number; soleShearDissipation: number;
  workResidual: number; linearMomentumResidual: Vec3; angularMomentumResidual: Vec3;
  maxCombinedElasticPhase: number; maxDampingNumber: number;
  maxShearElasticPhase: number;
  /** Support energy excludes turf potential; this ledger includes it. */
  totalEnergyBefore: number; totalEnergyAfter: number;
}
/** Constant physical loads. These are forces, not a previously dosed impulse. */
export interface SpatialSoleConstantBodyForces {
  center?: Vec3;
  couple?: Vec3;
  points?: Array<{ id: string; local: Vec3; force: Vec3 }>;
}
export type SpatialSoleConstantForces = [SpatialSoleConstantBodyForces,
  SpatialSoleConstantBodyForces, SpatialSoleConstantBodyForces];
export interface SpatialSoleSlipStopOptions extends Omit<SpatialSoleComplianceOptions, 'externalImpulses' | 'shearState'> {
  shearState: SpatialSoleShearState;
  foot: 0 | 1;
  patchId: string;
  /** First event gate supports exactly one signed world x or y axis. */
  direction: { x: number; y: number };
  maxDuration: number;
  externalForces?: SpatialSoleConstantForces;
}
export interface SpatialSoleSlipStopEvent {
  kind: 'slip-stop';
  foot: 0 | 1;
  patchId: string;
  direction: { x: number; y: number };
  initialSlip: number;
  finalSlip: number;
  /** Algebraic solve domain; this is not a certified trajectory-root bracket. */
  durationDomain: { lo: 0; hi: number };
}
export interface SpatialSoleSlipStopResult {
  state: SpatialSupportState;
  shearState: SpatialSoleShearState | null;
  /** Zero on rejection; no physical time or partial state has been committed. */
  duration: number;
  event: SpatialSoleSlipStopEvent | null;
  report: SpatialSoleComplianceReport;
}
interface SlipStopSolve {
  column: number;
  /** Seed physical duration conditions the unknown; horizon is only a bound. */
  timeScale: number;
  maxDuration: number;
  forces: SpatialSoleConstantForces;
  rejectReason: string | null;
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
  const shearStiffness = m.shearStiffness ?? [0, 0];
  if (!Number.isFinite(planeHeight) || m.points.length !== 2 || m.stiffness.length !== 2
    || m.damping.length !== 2 || shearStiffness.length !== 2)
    throw new RangeError('Two finite sole material slots required');
  const points = [0, 1].map(foot => m.points[foot].map(p => ({ ...p, friction: p.friction ?? 0 }))) as unknown as [CompliantSolePatch[], CompliantSolePatch[]];
  for (let f = 0; f < 2; f++) {
    if (!(Number.isFinite(m.stiffness[f]) && m.stiffness[f] >= 0
      && Number.isFinite(m.damping[f]) && m.damping[f] >= 0
      && Number.isFinite(shearStiffness[f]) && shearStiffness[f] >= 0))
      throw new RangeError('Sole normal/shear stiffness and damping must be finite nonnegative material values');
    const ps = points[f];
    if (!ps.length || ps.some(p => !p.id || ![p.local.x, p.local.y, p.local.z, p.areaWeight].every(Number.isFinite) || !(p.areaWeight > 0))
      || ps.some(p => !Number.isFinite(p.friction) || p.friction! < 0)
      || new Set(ps.map(p => p.id)).size !== ps.length || Math.abs(ps.reduce((a, p) => a + p.areaWeight, 0) - 1) > 1e-12)
      throw new RangeError('Each foot needs uniquely identified positive patch weights summing to one');
  }
  return { ...m, points, shearStiffness, planeHeight };
}

function shearMaterialFingerprint(material: SpatialSoleComplianceMaterial): string {
  const m = validateMaterial(material);
  const canonical = {
    version: 1,
    planeHeight: m.planeHeight,
    feet: [0, 1].map(foot => ({
      normalStiffness: m.stiffness[foot],
      normalDamping: m.damping[foot],
      shearStiffness: m.shearStiffness![foot],
      patches: m.points[foot].map(patch => ({
        id: patch.id,
        local: [patch.local.x, patch.local.y, patch.local.z],
        weight: patch.areaWeight,
        friction: patch.friction,
      })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    })),
  };
  return `spatial-sole-shear-v1:${JSON.stringify(canonical)}`;
}

/** Make the required persistent state for an active finite-friction material. */
export function createSpatialSoleShearState(materialInput: SpatialSoleComplianceMaterial): SpatialSoleShearState {
  const material = validateMaterial(materialInput);
  return {
    fingerprint: shearMaterialFingerprint(material),
    points: [0, 1].flatMap(foot => material.points[foot].map(patch => ({
      foot: foot as 0 | 1,
      id: patch.id,
      stretch: { x: 0, y: 0 },
    }))),
  };
}

function validateShearState(
  state: SpatialSoleShearState | undefined,
  material: SpatialSoleComplianceMaterial,
  required: boolean,
): SpatialSoleShearState | null {
  if (!state) {
    if (required) throw new RangeError('Persistent shearState is required for active sole friction');
    return null;
  }
  if (state.fingerprint !== shearMaterialFingerprint(material) || !Array.isArray(state.points))
    throw new RangeError('Persistent sole shearState material fingerprint mismatch');
  if (state.points.some(patch => !patch || typeof patch !== 'object' || !patch.stretch || typeof patch.id !== 'string'))
    throw new RangeError('Persistent sole shearState patch entries are malformed');
  const expected = [0, 1].flatMap(foot => material.points[foot].map(patch => `${foot}:${patch.id}`)).sort();
  const keys = state.points.map(patch => `${patch.foot}:${patch.id}`);
  if (keys.length !== expected.length || new Set(keys).size !== keys.length
    || [...keys].sort().some((key, i) => key !== expected[i])
    || state.points.some(patch => (patch.foot !== 0 && patch.foot !== 1)
      || !patch.id || !Number.isFinite(patch.stretch.x) || !Number.isFinite(patch.stretch.y)))
    throw new RangeError('Persistent sole shearState patch IDs or stretches are invalid');
  for (const patch of state.points) {
    const materialPatch = material.points[patch.foot].find(item => item.id === patch.id)!;
    if ((material.shearStiffness![patch.foot] === 0 || materialPatch.friction === 0)
      && (patch.stretch.x !== 0 || patch.stretch.y !== 0))
      throw new RangeError('Disabled sole shear patch cannot retain stored stretch');
  }
  return { fingerprint: state.fingerprint,
    points: state.points.map(patch => ({ ...patch, stretch: { ...patch.stretch } })) };
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
): { state: SpatialSupportState; shearState: SpatialSoleShearState | null; report: SpatialSoleComplianceReport } {
  const { duration: _duration, ...result } = solveSpatialSoleCompliance(beforeInput, h, materialInput, options);
  return result;
}

function scaleConstantForces(forces: SpatialSoleConstantForces, h: number): SpatialImpulseSet {
  return forces.map(load => ({
    center: load.center && v3Scale(load.center, h),
    couple: load.couple && v3Scale(load.couple, h),
    points: load.points?.map(point => ({ id: point.id, local: { ...point.local },
      impulse: v3Scale(point.force, h) })),
  })) as SpatialImpulseSet;
}

/** Restricted research event: an isolated nonrotating foot already slides at
 * its fixed normal-load yield limit. Co-located weighted patches are allowed.
 * Duration replaces one endpoint velocity unknown, which is constructed as
 * zero inside the same 18 momentum equations. No velocity projection follows
 * the solve. Rotating/2D slip, variable normal loads, onset and release require
 * separate event equations and are deliberately unsupported here.
 */
export function advanceSpatialSoleSlipStop(
  beforeInput: SpatialSupportState,
  materialInput: SpatialSoleComplianceMaterial,
  options: SpatialSoleSlipStopOptions,
): SpatialSoleSlipStopResult {
  const before = newSpatialSupport(beforeInput);
  const material = validateMaterial(materialInput);
  const shear = validateShearState(options.shearState, material, true)!;
  const direction = options.direction;
  if ('externalImpulses' in options)
    throw new RangeError('Slip-stop events require physical externalForces, not interval impulses');
  if (!(Number.isFinite(options.maxDuration) && options.maxDuration > 0)
    || (options.foot !== 0 && options.foot !== 1)
    || !direction || !((Math.abs(direction.x) === 1 && direction.y === 0)
      || (Math.abs(direction.y) === 1 && direction.x === 0)))
    throw new RangeError('Finite positive event horizon, stable foot and signed x/y axis required');
  const forces = options.externalForces ?? [{}, {}, {}];
  const finiteVector = (v: Vec3 | undefined): boolean => !!v && [v.x, v.y, v.z].every(Number.isFinite);
  if (!Array.isArray(forces) || forces.length !== 3 || forces.some(load => !load
    || (load.center !== undefined && !finiteVector(load.center))
    || (load.couple !== undefined && !finiteVector(load.couple))
    || (load.points !== undefined && !Array.isArray(load.points))
    || (load.points ?? []).some(point => !point || typeof point.id !== 'string'
      || !point.id || point.id.startsWith('sole:')
      || !finiteVector(point.local) || !finiteVector(point.force))
    || new Set((load.points ?? []).map(point => point.id)).size !== (load.points ?? []).length))
    throw new RangeError('Three finite uniquely identified constant force slots required');
  if (before.gravity.x !== 0 || before.gravity.y !== 0
    || before.legs.some(leg => leg.compliance.forceCap !== 0 || leg.compliance.dampingCap !== 0)
    || forces.some(load => v3Norm(load.couple ?? zero()) !== 0
      || (load.points ?? []).some(point => v3Norm(point.local) !== 0)))
    throw new RangeError('Slip-stop gate requires disabled legs, no rotation and center-only physical forces');
  const foot = options.foot;
  const selectedBody = before.feet[foot];
  const patches = material.points[foot];
  const selectedPatch = patches.find(patch => patch.id === options.patchId);
  if (!selectedPatch) throw new RangeError('Slip-stop material patch ID is missing');
  const axis: 'x' | 'y' = direction.x !== 0 ? 'x' : 'y';
  const otherAxis: 'x' | 'y' = axis === 'x' ? 'y' : 'x';
  const sign = direction[axis];
  const mu = selectedPatch.friction!;
  const kt = material.shearStiffness![foot];
  const gap = selectedBody.position.z - material.planeHeight!;
  const normal = material.stiffness[foot] * Math.max(0, -gap);
  const force = (forces[foot + 1].points ?? []).reduce((sum, point) => v3Add(sum, point.force),
    forces[foot + 1].center ?? zero());
  const initialSlip = sign * selectedBody.velocity[axis];
  const capacity = mu * normal;
  const motionEnergyScale = selectedBody.mass * initialSlip * initialSlip + normal * Math.abs(gap);
  if (![normal, capacity, motionEnergyScale].every(Number.isFinite))
    throw new RangeError('Slip-stop fixed normal support and physical motion scales must be finite');
  if (bodies(before).some(body => v3Norm(body.angularMomentum)
    > 256 * Number.EPSILON * Math.sqrt(body.inertia * motionEnergyScale)))
    throw new RangeError('Slip-stop gate requires no rotation beyond physical-scale roundoff');
  const forceRoundoff = 256 * Number.EPSILON * Math.max(Number.MIN_VALUE,
    normal, Math.abs(force.z), Math.abs(selectedBody.mass * before.gravity.z), capacity);
  // Accepted equilibrium intervals can retain floating-point normal and
  // orthogonal velocity. Admit only scale-relative roundoff and keep these in
  // the solve;
  // unlike the stop coordinate it is never prescribed or reset to zero.
  const normalVelocityRoundoff = 256 * Number.EPSILON * Math.max(Number.MIN_VALUE,
    Math.abs(initialSlip), Math.sqrt(normal * Math.abs(gap) / selectedBody.mass));
  if (Math.abs(selectedBody.velocity.z) > normalVelocityRoundoff
    || Math.abs(selectedBody.velocity[otherAxis]) > normalVelocityRoundoff
    || force[otherAxis] !== 0 || !(gap < 0 && normal > 0 && mu > 0 && kt > 0)
    || Math.abs(force.z + selectedBody.mass * before.gravity.z + normal) > forceRoundoff
    || patches.some(patch => v3Norm(patch.local) !== 0 || patch.friction !== mu)
    || material.points[1 - foot].some(patch =>
      rigidPointPosition(before.feet[1 - foot], patch.local).z <= material.planeHeight!))
    throw new RangeError(`Slip-stop gate requires collinear center patches and fixed positive normal equilibrium (vz=${selectedBody.velocity.z}, off-axis velocity=${selectedBody.velocity[otherAxis]}, normal residual=${force.z + selectedBody.mass * before.gravity.z + normal})`);
  if (patches.some(patch => {
    const stretch = shear.points.find(p => p.foot === foot && p.id === patch.id)!.stretch;
    return Math.abs(kt * stretch[otherAxis]) > forceRoundoff
      || Math.abs(kt * stretch[axis] - sign * capacity) > forceRoundoff;
  }) || shear.points.some(patch => patch.foot !== foot && (patch.stretch.x !== 0 || patch.stretch.y !== 0)))
    throw new RangeError('Slip-stop gate requires saturated collinear retained shear strain and an unloaded other foot');
  let rejectReason: string | null = null;
  let initialDuration = options.maxDuration;
  const deceleration = (capacity - sign * force[axis]) / selectedBody.mass;
  if (!(initialSlip > 0)) rejectReason = 'Slip-stop event has no positive incoming sliding velocity';
  else if (!(deceleration > 0)) rejectReason = 'Constant force does not produce a slip-stop event';
  else {
    const estimate = initialSlip / deceleration;
    if (!Number.isFinite(estimate) || estimate > options.maxDuration)
      rejectReason = 'Slip-stop event lies outside the requested duration domain';
    else initialDuration = estimate;
  }
  const { externalForces: _forces, foot: _foot, patchId: _patchId,
    direction: _direction, maxDuration: _maxDuration, ...ordinary } = options;
  const solved = solveSpatialSoleCompliance(before, initialDuration, material, ordinary, {
    column: 6 * (foot + 1) + (axis === 'x' ? 0 : 1),
    timeScale: initialDuration, maxDuration: options.maxDuration, forces, rejectReason,
  });
  const accepted = solved.report.accepted;
  return {
    state: solved.state,
    shearState: solved.shearState,
    duration: accepted ? solved.duration : 0,
    event: accepted ? { kind: 'slip-stop', foot, patchId: options.patchId,
      direction: { ...direction }, initialSlip,
      finalSlip: sign * solved.state.feet[foot].velocity[axis],
      durationDomain: { lo: 0, hi: options.maxDuration } } : null,
    report: solved.report,
  };
}

function solveSpatialSoleCompliance(
  beforeInput: SpatialSupportState,
  initialH: number,
  materialInput: SpatialSoleComplianceMaterial,
  options: SpatialSoleComplianceOptions = {},
  eventSolve?: SlipStopSolve,
): { state: SpatialSupportState; shearState: SpatialSoleShearState | null;
  report: SpatialSoleComplianceReport; duration: number } {
  let h = initialH;
  const before = newSpatialSupport(beforeInput);
  const material = validateMaterial(materialInput);
  const shearActive = material.points.some((patches, foot) => material.shearStiffness![foot] > 0
    && patches.some(patch => patch.friction! > 0));
  const inputShearState = validateShearState(options.shearState, material, shearActive);
  const tolerance = options.tolerance ?? 1e-10;
  const geometryTolerance = options.geometryTolerance ?? 1e-9;
  const maxAngular = options.maxAngularPhase ?? .5;
  const maxElastic = options.maxCombinedElasticPhase ?? .5;
  const maxDamping = options.maxDampingNumber ?? .5;
  const maxShearPhase = options.maxShearElasticPhase ?? .5;
  const maxIterations = options.maxIterations ?? 60;
  const maxLineSearch = options.maxLineSearch ?? 24;
  if (!(Number.isFinite(h) && h > 0)
    || ![tolerance, geometryTolerance, maxAngular, maxElastic, maxDamping, maxShearPhase].every(x => Number.isFinite(x) && x > 0)
    || ![maxIterations, maxLineSearch].every(x => Number.isInteger(x) && x >= 1)) {
    throw new RangeError('Finite positive interval and numerical budgets required');
  }

  let known = eventSolve ? scaleConstantForces(eventSolve.forces, h)
    : options.externalImpulses ?? [{}, {}, {}];
  const start = spatialSupportEndpoints(before);
  let candidateEvaluations = 0;
  let shearConstitutiveEvaluations = 0;
  let shearQuadratureEvaluations = 0;
  if (known.length !== 3 || known.some(load =>
    ![load.center ?? zero(), load.couple ?? zero()].every(v => [v.x, v.y, v.z].every(Number.isFinite))
    || (load.points ?? []).some(p => typeof p.id !== 'string' || p.id.startsWith('sole:')
      || ![p.local.x, p.local.y, p.local.z, p.impulse.x, p.impulse.y, p.impulse.z].every(Number.isFinite))
    || new Set((load.points ?? []).map(p => p.id)).size !== (load.points ?? []).length)) {
    throw new RangeError('Finite uniquely identified known point impulses required');
  }

  const trialLoads = (candidate: SpatialSupportCandidate): SpatialImpulseSet => {
    candidateEvaluations++;
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
        const friction = patch.friction ?? 0;
        const shearStiffness = material.shearStiffness![foot] * weight;
        if (friction > 0 && shearStiffness > 0) {
          const patchState = inputShearState!.points.find(item => item.foot === foot && item.id === patch.id)!;
          const beforePoint = rigidPointPosition(before.feet[foot], patch.local);
          const afterPoint = rigidPointPosition(candidate.state.feet[foot], patch.local);
          const capacityBefore = mode.mode === 'compressed'
            ? friction * (stiffness * weight * indentationBefore + dampingForce) : 0;
          const capacityAfter = mode.mode === 'compressed'
            ? friction * (stiffness * weight * indentationAfter + dampingForce) : 0;
          const shear = advanceSoleShear(patchState.stretch,
            { x: afterPoint.x - beforePoint.x, y: afterPoint.y - beforePoint.y }, h,
            { stiffness: shearStiffness, capacityBefore, capacityAfter });
          shearConstitutiveEvaluations++;
          shearQuadratureEvaluations += shear.report.quadratureEvaluations;
          if (!shear.report.accepted)
            throw new RangeError(`Sole shear ${foot}:${patch.id}: ${shear.report.reason}`);
          if (shear.report.footImpulse.x !== 0 || shear.report.footImpulse.y !== 0) {
            extra.push({
              foot: foot as 0 | 1,
              id: `sole:${foot}:${patch.id}:shear`,
              local: patch.local,
              impulse: { x: shear.report.footImpulse.x, y: shear.report.footImpulse.y, z: 0 },
            });
          }
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
  if (eventSolve) values[eventSolve.column] = h / eventSolve.timeScale;
  let candidate: SpatialSupportCandidate | null = null;
  let candidateDuration = h;
  let reason: string | null = eventSolve?.rejectReason ?? null;
  let iterations = 0;

  const endpointValue = (column: number) => eventSolve?.column === column ? 0 : values[column];
  const unpack = (): typeof start => [0, 1, 2].map(i => ({
    velocity: { x: endpointValue(6 * i), y: endpointValue(6 * i + 1), z: values[6 * i + 2] },
    angularMomentum: {
      x: values[6 * i + 3] * materialBodies[i].inertia,
      y: values[6 * i + 4] * materialBodies[i].inertia,
      z: values[6 * i + 5] * materialBodies[i].inertia,
    },
  })) as typeof start;
  const evaluate = (unknowns: number[]): SpatialSupportCandidate => {
    values = unknowns;
    if (eventSolve) {
      h = values[eventSolve.column] * eventSolve.timeScale;
      if (!(Number.isFinite(h) && h > 0 && h <= eventSolve.maxDuration))
        throw new RangeError('Slip-stop candidate duration is outside the solve domain');
      known = scaleConstantForces(eventSolve.forces, h);
    }
    const provisional = evaluateSpatialSupportCandidate(before, h, unpack(), known, geometryTolerance);
    return evaluateSpatialSupportCandidate(before, h, unpack(), trialLoads(provisional), geometryTolerance);
  };
  try {
    candidate = evaluate(values);
    candidateDuration = h;
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
    if (eventSolve) baseline[eventSolve.column] = candidateDuration / eventSolve.timeScale;
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
          candidateDuration = h;
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
    h = candidateDuration;
    if (eventSolve) {
      values[eventSolve.column] = h / eventSolve.timeScale;
      known = scaleConstantForces(eventSolve.forces, h);
    }
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
    if (eventSolve) {
      h = initialH;
      values[eventSolve.column] = h / eventSolve.timeScale;
      known = scaleConstantForces(eventSolve.forces, h);
    }
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
            shear: null,
          };
        }));
        const shearPotential = inputShearState?.points.reduce((sum, patch) => {
          const kt = material.shearStiffness![patch.foot]
            * material.points[patch.foot].find(item => item.id === patch.id)!.areaWeight;
          return sum + .5 * kt * (patch.stretch.x ** 2 + patch.stretch.y ** 2);
        }, 0) ?? 0;
        const zeroLeg = {
          lengthBefore: 0, lengthAfter: 0, minimumChordLength: 0, discreteDirection: zero(),
          springForce: 0, dampingForce: 0, impulse: zero(), springWork: 0, dampingWork: 0,
          potentialChange: 0, springWorkResidual: 0,
        };
        const report: SpatialSoleComplianceReport = {
          state: before,
          candidateState: before,
          candidateShearState: inputShearState,
          accepted: false,
          reason: reason ?? error.message,
          iterations,
          candidateEvaluations,
          shearConstitutiveEvaluations,
          shearQuadratureEvaluations,
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
          shearPotentialBefore: shearPotential,
          shearPotentialAfter: shearPotential,
          soleSpringWork: 0,
          soleDampingWork: 0,
          soleShearWork: 0,
          soleShearDissipation: 0,
          knownExternalWork: 0,
          workResidual: 0,
          linearMomentumResidual: zero(),
          angularMomentumResidual: zero(),
          maxCombinedElasticPhase: 0,
          maxDampingNumber: 0,
          maxShearElasticPhase: 0,
          totalEnergyBefore: energy.total + potential + shearPotential,
          totalEnergyAfter: energy.total + potential + shearPotential,
        };
        return { state: before, shearState: inputShearState, report, duration: h };
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
  let shearRateSquared = 0;
  let shearPotentialBefore = 0;
  let shearPotentialAfter = 0;
  let soleShearWork = 0;
  let soleShearDissipation = 0;
  const outputShearPatches: SpatialSoleShearPatchState[] = [];

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
      const friction = patch.friction ?? 0;
      const weight = patch.areaWeight;
      const shearStiffness = material.shearStiffness![foot] * weight;
      let shearReport: SoleShearPointReport | null = null;
      if (inputShearState && friction > 0 && shearStiffness > 0) {
        const patchState = inputShearState.points.find(item => item.foot === foot && item.id === patch.id)!;
        const pointBefore = rigidPointPosition(before.feet[foot], patch.local);
        const pointAfter = rigidPointPosition(converged.state.feet[foot], patch.local);
        const tangentDisplacement = { x: pointAfter.x - pointBefore.x, y: pointAfter.y - pointBefore.y };
        const capacityBefore = mode.mode === 'compressed'
          ? friction * (stiffness * indentationBefore + dampingForce) : 0;
        const capacityAfter = mode.mode === 'compressed'
          ? friction * (stiffness * indentationAfter + dampingForce) : 0;
        const shearResult = advanceSoleShear(patchState.stretch, tangentDisplacement, h,
          { stiffness: shearStiffness, capacityBefore, capacityAfter });
        shearConstitutiveEvaluations++;
        shearQuadratureEvaluations += shearResult.report.quadratureEvaluations;
        if (!shearResult.report.accepted) {
          reason = reason ?? `Sole shear ${foot}:${patch.id}: ${shearResult.report.reason}`;
        }
        const actualAttachmentWork = converged.external
          .find(entry => entry.id === `sole:${foot}:${patch.id}:shear`)?.work ?? 0;
        const constitutiveAttachmentWork = v3Dot(
          { x: shearResult.report.footImpulse.x, y: shearResult.report.footImpulse.y, z: 0 },
          { x: tangentDisplacement.x / h, y: tangentDisplacement.y / h, z: 0 });
        const shearPotentialBeforePatch = .5 * shearStiffness
          * (patchState.stretch.x ** 2 + patchState.stretch.y ** 2);
        const shearPotentialAfterPatch = .5 * shearStiffness
          * (shearResult.stretch.x ** 2 + shearResult.stretch.y ** 2);
        const energyResidual = actualAttachmentWork + shearPotentialAfterPatch - shearPotentialBeforePatch
          + shearResult.report.totalDissipation;
        shearPotentialBefore += shearPotentialBeforePatch;
        shearPotentialAfter += shearPotentialAfterPatch;
        soleShearWork += actualAttachmentWork;
        soleShearDissipation += shearResult.report.totalDissipation;
        outputShearPatches.push({ foot: foot as 0 | 1, id: patch.id, stretch: { ...shearResult.stretch } });

        if (capacityBefore > 0 || capacityAfter > 0) {
          const tangentMobilityTrace = (body: SpatialSupportState['feet'][number]): number => {
            const r = rigidWorldOffset(body, patch.local);
            return 2 / body.mass + (r.x * r.x + r.y * r.y + 2 * r.z * r.z) / body.inertia;
          };
          shearRateSquared += shearStiffness * Math.max(
            tangentMobilityTrace(before.feet[foot]), tangentMobilityTrace(converged.state.feet[foot]));
        }
        const flowTolerance = 128 * Number.EPSILON
          * Math.max(Number.MIN_VALUE, shearResult.report.plasticDissipation, shearResult.report.totalDissipation);
        const startVelocity = rigidPointVelocity(before.feet[foot], patch.local);
        const endVelocity = rigidPointVelocity(converged.state.feet[foot], patch.local);
        const startSpeed = Math.hypot(startVelocity.x, startVelocity.y);
        const endSpeed = Math.hypot(endVelocity.x, endVelocity.y);
        const velocityDot = startVelocity.x * endVelocity.x + startVelocity.y * endVelocity.y;
        const reversalTolerance = 128 * Number.EPSILON
          * Math.max(Number.MIN_VALUE, startSpeed * endSpeed);
        const startForce = {
          x: shearStiffness * patchState.stretch.x,
          y: shearStiffness * patchState.stretch.y,
        };
        const startForceMagnitude = Math.hypot(startForce.x, startForce.y);
        const boundaryRoundoff = 128 * Number.EPSILON
          * Math.max(Number.MIN_VALUE, startForceMagnitude, capacityBefore);
        const initiallyAtOrBeyondYield = capacityBefore > 0
          && startForceMagnitude >= capacityBefore - boundaryRoundoff;
        let initialYieldLoading = false;
        if (initiallyAtOrBeyondYield && shearStiffness > 0) {
          const outwardSpeed = (startForce.x * startVelocity.x + startForce.y * startVelocity.y)
            / startForceMagnitude;
          const capacityRate = (capacityAfter - capacityBefore) / h;
          const yieldRate = outwardSpeed - capacityRate / shearStiffness;
          const yieldRateTolerance = 128 * Number.EPSILON
            * Math.max(Number.MIN_VALUE, Math.abs(outwardSpeed), Math.abs(capacityRate / shearStiffness));
          initialYieldLoading = yieldRate > yieldRateTolerance;
        }
        const unresolvedReversal = velocityDot < -reversalTolerance
          && (shearResult.report.plasticDissipation > flowTolerance || initialYieldLoading);
        if (unresolvedReversal)
          reason = reason ?? 'Plastic sole shear interval contains an unresolved endpoint velocity reversal';
        if (shearResult.report.plasticDissipation > flowTolerance
          && Math.hypot(tangentDisplacement.x, tangentDisplacement.y) > 0) {
          const chord = { x: tangentDisplacement.x / h, y: tangentDisplacement.y / h };
          for (const endpointVelocity of [startVelocity, endVelocity]) {
            const dotChord = endpointVelocity.x * chord.x + endpointVelocity.y * chord.y;
            const chordTolerance = 128 * Number.EPSILON
              * Math.max(Number.MIN_VALUE, Math.hypot(endpointVelocity.x, endpointVelocity.y) * Math.hypot(chord.x, chord.y));
            if (dotChord < -chordTolerance)
              reason = reason ?? 'Plastic sole shear interval contains an unresolved endpoint velocity reversal';
          }
        }
        shearReport = {
          friction,
          stiffness: shearStiffness,
          capacityBefore,
          capacityAfter,
          inputStretch: { ...patchState.stretch },
          finalStretch: { ...shearResult.stretch },
          constitutive: shearResult.report,
          actualAttachmentWork,
          constitutiveAttachmentWork,
          attachmentWorkResidual: actualAttachmentWork - constitutiveAttachmentWork,
          energyResidual,
          potentialBefore: shearPotentialBeforePatch,
          potentialAfter: shearPotentialAfterPatch,
        };
      } else {
        const preserved = inputShearState?.points.find(item => item.foot === foot && item.id === patch.id);
        if (preserved) outputShearPatches.push({ ...preserved, stretch: { ...preserved.stretch } });
      }
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
        shear: shearReport,
      });
    }
  }
  const maxCombinedElasticPhase = h * Math.sqrt(
    converged.maxElasticPhase ** 2 / (h * h) + soleRateSquared + shearRateSquared);
  const maxShearElasticPhase = h * Math.sqrt(shearRateSquared);
  const candidateShearState = inputShearState ? {
    fingerprint: inputShearState.fingerprint,
    points: outputShearPatches,
  } : null;
  const totalEnergyBefore = energyBefore.total + solePotentialBefore + shearPotentialBefore;
  const totalEnergyAfter = energyAfter.total + solePotentialAfter + shearPotentialAfter;
  const knownExternalWork = converged.external
    .filter(entry => !entry.id.startsWith('sole:'))
    .reduce((sum, entry) => sum + entry.work, 0);
  const workResidual = totalEnergyAfter - totalEnergyBefore - knownExternalWork
    - converged.dampingWork - soleDampingWork + soleShearDissipation;
  if (!reason && converged.maxAngularPhase > maxAngular)
    reason = 'Angular trajectory budget requires a shorter physical interval';
  if (!reason && maxCombinedElasticPhase > maxElastic)
    reason = 'Combined leg/sole elastic response budget requires a shorter physical interval';
  if (!reason && soleDampingNumber > maxDamping)
    reason = 'Sole damping number requires a shorter physical interval';
  if (!reason && maxShearElasticPhase > maxShearPhase)
    reason = 'Sole shear elastic phase requires a shorter physical interval';

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
    candidateEvaluations,
    shearConstitutiveEvaluations,
    shearQuadratureEvaluations,
    residual: residual(converged),
    candidateState: converged.state,
    candidateShearState,
    solePoints: pointReports,
    solePotentialBefore,
    solePotentialAfter,
    shearPotentialBefore,
    shearPotentialAfter,
    soleSpringWork,
    soleDampingWork,
    soleShearWork,
    soleShearDissipation,
    knownExternalWork,
    workResidual,
    linearMomentumResidual: converged.momentumResiduals.reduce((sum, item) => v3Add(sum, item.linear), zero()),
    angularMomentumResidual: angularLedger,
    maxCombinedElasticPhase,
    maxDampingNumber: soleDampingNumber,
    maxShearElasticPhase,
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
    || Math.abs(point.dampingAttachmentWorkResidual) > workTolerance
    || (point.shear && (Math.abs(point.shear.attachmentWorkResidual) > workTolerance
      || Math.abs(point.shear.energyResidual) > workTolerance
      || point.shear.constitutive.totalDissipation < -workTolerance)));
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
  return {
    state: report.accepted ? newSpatialSupport(converged.state) : before,
    shearState: report.accepted ? candidateShearState : inputShearState,
    report,
    duration: h,
  };
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
