/** One coupled free-flight material support interval. Units kg, yd, s.
 * Three finite rigid bodies, isotropic inertia, persistent actual hip/ankle
 * attachments, and the shared passive axial law. No ground, active posture,
 * scheduled normal load, collision geometry, or production World selection.
 */
import { axialLegDamping, axialLegDiscreteForce, axialLegPotential, validateAxialLeg,
  type AxialLegCompliance } from './leg-compliance.js';
import { newMaterialRigid, rigidAngularMomentum, rigidAttachmentInterval, rigidBasisError, rigidKineticEnergy,
  rigidMidpointState, rigidPointPosition, v3Add as add, v3Sub as sub, v3Scale as mul, v3Dot as dot,
  v3Cross as cross, v3Norm as norm, type MaterialPointImpulse, type MaterialRigidState, type Vec3 } from './material-rigid.js';

export interface SpatialSupportLeg { hip: Vec3; ankle: Vec3; compliance: AxialLegCompliance }
export interface SpatialSupportState {
  torso: MaterialRigidState;
  /** Stable slots: foot 0 is body 1; foot 1 is body 2. */
  feet: [MaterialRigidState, MaterialRigidState];
  legs: [SpatialSupportLeg, SpatialSupportLeg];
  gravity: Vec3;
}
export interface SpatialBodyImpulses {
  center?: Vec3; couple?: Vec3; points?: MaterialPointImpulse[];
}
export type SpatialImpulseSet = [SpatialBodyImpulses, SpatialBodyImpulses, SpatialBodyImpulses];
export interface SpatialRigidEndpoint { velocity: Vec3; angularMomentum: Vec3 }
export type SpatialEndpoints = [SpatialRigidEndpoint, SpatialRigidEndpoint, SpatialRigidEndpoint];
export interface SpatialSupportOptions {
  /** Known physical impulses. Caller bounds capacities and apportions dose
   * when subdividing; the response kernel never manufactures a force cap. */
  externalImpulses?: SpatialImpulseSet;
  /** Velocity and inertia-scaled angular momentum residual tolerance. */
  tolerance?: number; geometryTolerance?: number; maxIterations?: number; maxLineSearch?: number;
  /** Numerical interval budget, not agility or a force limit. Larger physical
   * turns require local subdivision even when endpoint work closes. */
  maxAngularPhase?: number;
  /** Local elastic response estimate, not an event enclosure or a strength
   * multiplier. Large axial oscillations need subdivision too. */
  maxElasticPhase?: number;
}
export interface SpatialEnergy { kinetic: number; gravity: number; spring: number; total: number }
export interface SpatialLegReport {
  lengthBefore: number; lengthAfter: number; minimumChordLength: number;
  discreteDirection: Vec3; springForce: number; dampingForce: number; impulse: Vec3;
  springWork: number; dampingWork: number; potentialChange: number; springWorkResidual: number;
}
export interface SpatialExternalReport {
  body: 0 | 1 | 2; id: string; kind: 'point' | 'center' | 'couple';
  impulse: Vec3; work: number; angularImpulse: Vec3;
}
export interface SpatialSupportCandidate {
  state: SpatialSupportState;
  momentumResiduals: Array<{ linear: Vec3; angular: Vec3 }>;
  /** 18 residuals: linear/mass then angular/inertia for each body. */
  normalizedResidual: number[];
  legs: [SpatialLegReport, SpatialLegReport]; external: SpatialExternalReport[];
  externalWork: number; dampingWork: number;
  knownLinearImpulse: Vec3; knownAngularImpulse: Vec3;
  minimumChordLength: number; maxAngularPhase: number; maxElasticPhase: number; maxAttachmentResidual: number;
}
export interface SpatialSupportReport extends SpatialSupportCandidate {
  accepted: boolean; reason: string | null; iterations: number; residual: number;
  energyBefore: SpatialEnergy; energyAfter: SpatialEnergy; workResidual: number;
  linearMomentumResidual: Vec3; angularMomentumResidual: Vec3; orthogonalityError: number;
  /** On rejection candidate state is diagnostic; returned state is input. */
  candidateState: SpatialSupportState;
}

const zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });
const mean = (a: Vec3, b: Vec3): Vec3 => mul(add(a, b), .5);
const finite = (v: Vec3): boolean => [v.x, v.y, v.z].every(Number.isFinite);
const materials = (s: SpatialSupportState): [MaterialRigidState, MaterialRigidState, MaterialRigidState] => [s.torso, ...s.feet];
const emptyLoads = (): SpatialImpulseSet => [{}, {}, {}];
function validateState(s: SpatialSupportState): void {
  if (s.feet.length !== 2 || s.legs.length !== 2 || !finite(s.gravity)) throw new RangeError('Two stable feet/legs and finite gravity required');
  for (const b of materials(s)) newMaterialRigid(b);
  for (let i = 0; i < 2; i++) {
    const leg = s.legs[i]; validateAxialLeg(leg.compliance);
    if (![leg.hip, leg.ankle].every(finite) || !(norm(sub(rigidPointPosition(s.feet[i], leg.ankle),
      rigidPointPosition(s.torso, leg.hip))) > 0)) throw new RangeError('Finite separated material hip/ankle attachments required');
  }
}
function validateLoads(loads: SpatialImpulseSet): void {
  if (loads.length !== 3) throw new RangeError('Three material-body load slots required');
  for (const load of loads) {
    const points = load.points ?? [];
    if (![load.center ?? zero(), load.couple ?? zero()].every(finite)
      || points.some(p => typeof p.id !== 'string' || ![p.local, p.impulse].every(finite))
      || new Set(points.map(p => p.id)).size !== points.length) throw new RangeError('Finite uniquely identified material impulses required');
  }
}
function clone(s: SpatialSupportState): SpatialSupportState {
  return { torso: newMaterialRigid(s.torso), feet: [newMaterialRigid(s.feet[0]), newMaterialRigid(s.feet[1])],
    legs: s.legs.map(l => ({ hip: { ...l.hip }, ankle: { ...l.ankle }, compliance: { ...l.compliance } })) as SpatialSupportState['legs'],
    gravity: { ...s.gravity } };
}
export function newSpatialSupport(state: SpatialSupportState): SpatialSupportState { validateState(state); return clone(state); }
export function spatialSupportEnergy(s: SpatialSupportState): SpatialEnergy {
  const bs = materials(s), kinetic = bs.reduce((sum, b) => sum + rigidKineticEnergy(b), 0);
  const gravity = bs.reduce((sum, b) => sum - b.mass * dot(s.gravity, b.position), 0);
  const spring = s.legs.reduce((sum, l, i) => sum + axialLegPotential(norm(sub(rigidPointPosition(s.feet[i], l.ankle),
    rigidPointPosition(s.torso, l.hip))), l.compliance), 0);
  return { kinetic, gravity, spring, total: kinetic + gravity + spring };
}
export function spatialSupportEndpoints(s: SpatialSupportState): SpatialEndpoints {
  return materials(s).map(b => ({ velocity: { ...b.velocity }, angularMomentum: { ...b.angularMomentum } })) as SpatialEndpoints;
}
function chordMinimum(a: Vec3, b: Vec3): number {
  const delta = sub(b, a), squared = dot(delta, delta);
  const t = squared > 0 ? Math.max(0, Math.min(1, -dot(a, delta) / squared)) : 0;
  return norm(add(a, mul(delta, t)));
}

/** Shared candidate evaluator for future coupled contact/ground rows.
 * Unknown point impulses can be supplied in `loads` by the outer SAME solve.
 * This evaluates actual end poses and all 18 momentum equations; it never
 * solves a foot independently or borrows a completed vertical normal solve.
 */
export function evaluateSpatialSupportCandidate(before: SpatialSupportState, h: number, endpoints: SpatialEndpoints,
  loads: SpatialImpulseSet = emptyLoads(), geometryTolerance = 1e-9): SpatialSupportCandidate {
  validateState(before); validateLoads(loads);
  if (!(Number.isFinite(h) && h > 0 && Number.isFinite(geometryTolerance) && geometryTolerance > 0)
    || endpoints.length !== 3 || endpoints.some(e => ![e.velocity, e.angularMomentum].every(finite)))
    throw new RangeError('Finite positive spatial interval/options and three endpoint momenta required');
  const oldBodies = materials(before), bs = oldBodies.map((b, i) => rigidMidpointState(b, h,
    endpoints[i].velocity, endpoints[i].angularMomentum));
  const state = clone(before); state.torso = bs[0]; state.feet = [bs[1], bs[2]];
  const linear = bs.map(b => mul(before.gravity, h * b.mass)), angular = bs.map(() => zero());
  let knownLinearImpulse = linear.reduce(add, zero()), knownAngularImpulse = linear.reduce((sum, j, i) =>
    add(sum, cross(mean(oldBodies[i].position, bs[i].position), j)), zero());
  let externalWork = 0, dampingWork = 0, minimumChordLength = Infinity, maxAttachmentResidual = 0, elasticRateSquared = 0;
  const external: SpatialExternalReport[] = [], legReports: SpatialLegReport[] = [];
  for (let i = 0; i < 3; i++) {
    const center = loads[i].center ?? zero(), couple = loads[i].couple ?? zero();
    linear[i] = add(linear[i], center); angular[i] = add(angular[i], couple);
    knownLinearImpulse = add(knownLinearImpulse, center);
    const centerMoment = cross(mean(oldBodies[i].position, bs[i].position), center);
    knownAngularImpulse = add(knownAngularImpulse, add(centerMoment, couple));
    const centerWork = dot(center, mean(oldBodies[i].velocity, bs[i].velocity));
    const coupleWork = dot(couple, mul(add(oldBodies[i].angularMomentum, bs[i].angularMomentum), .5 / bs[i].inertia));
    externalWork += centerWork + coupleWork;
    external.push({ body: i as 0 | 1 | 2, id: 'center', kind: 'center', impulse: { ...center }, work: centerWork, angularImpulse: centerMoment },
      { body: i as 0 | 1 | 2, id: 'couple', kind: 'couple', impulse: { ...couple }, work: coupleWork, angularImpulse: { ...couple } });
    for (const p of loads[i].points ?? []) {
      const a = rigidAttachmentInterval(oldBodies[i], bs[i], h, p.local), torque = cross(a.midpointOffset, p.impulse);
      linear[i] = add(linear[i], p.impulse); angular[i] = add(angular[i], torque);
      knownLinearImpulse = add(knownLinearImpulse, p.impulse);
      const moment = cross(mean(a.beforePoint, a.afterPoint), p.impulse), work = dot(p.impulse, a.meanVelocity);
      knownAngularImpulse = add(knownAngularImpulse, moment); externalWork += work;
      maxAttachmentResidual = Math.max(maxAttachmentResidual, norm(a.identityResidual));
      external.push({ body: i as 0 | 1 | 2, id: p.id, kind: 'point', impulse: { ...p.impulse }, work, angularImpulse: moment });
    }
  }
  for (let i = 0; i < 2; i++) {
    const l = before.legs[i], hip = rigidAttachmentInterval(before.torso, state.torso, h, l.hip);
    const ankle = rigidAttachmentInterval(before.feet[i], state.feet[i], h, l.ankle);
    const d0 = sub(ankle.beforePoint, hip.beforePoint), d1 = sub(ankle.afterPoint, hip.afterPoint);
    const lengthBefore = norm(d0), lengthAfter = norm(d1), minimum = chordMinimum(d0, d1);
    if (minimum <= geometryTolerance) throw new RangeError('Leg chord approaches/crosses hip origin; subdivide the physical interval');
    const direction = mul(add(d0, d1), 1 / (lengthBefore + lengthAfter));
    // Trace estimate of the axial material modes. Actual attachments contribute
    // their rotational stretch mobility; the two legs share the torso.
    // This is a numerical time-accuracy budget, not proof against hidden events.
    const unit = mul(d0, 1 / lengthBefore), hipLever = cross(hip.midpointOffset, unit), ankleLever = cross(ankle.midpointOffset, unit);
    if (l.compliance.forceCap > 0) elasticRateSquared += l.compliance.stiffness * (1 / before.torso.mass + 1 / before.feet[i].mass
      + dot(hipLever, hipLever) / before.torso.inertia + dot(ankleLever, ankleLever) / before.feet[i].inertia);
    const springForce = axialLegDiscreteForce(lengthBefore, lengthAfter, l.compliance);
    const dampingForce = axialLegDamping((lengthAfter - lengthBefore) / h, l.compliance);
    const impulse = mul(direction, h * (springForce + dampingForce));
    linear[0] = sub(linear[0], impulse); linear[i + 1] = add(linear[i + 1], impulse);
    angular[0] = sub(angular[0], cross(hip.midpointOffset, impulse));
    angular[i + 1] = add(angular[i + 1], cross(ankle.midpointOffset, impulse));
    const velocity = sub(ankle.meanVelocity, hip.meanVelocity);
    const springWork = dot(mul(direction, h * springForce), velocity), dampWork = dot(mul(direction, h * dampingForce), velocity);
    const potentialChange = axialLegPotential(lengthAfter, l.compliance) - axialLegPotential(lengthBefore, l.compliance);
    dampingWork += dampWork; minimumChordLength = Math.min(minimumChordLength, minimum);
    maxAttachmentResidual = Math.max(maxAttachmentResidual, norm(hip.identityResidual), norm(ankle.identityResidual));
    legReports.push({ lengthBefore, lengthAfter, minimumChordLength: minimum, discreteDirection: direction, springForce, dampingForce,
      impulse, springWork, dampingWork: dampWork, potentialChange, springWorkResidual: springWork + potentialChange });
  }
  const momentumResiduals = bs.map((b, i) => ({ linear: sub(mul(sub(b.velocity, oldBodies[i].velocity), b.mass), linear[i]),
    angular: sub(sub(b.angularMomentum, oldBodies[i].angularMomentum), angular[i]) }));
  const normalizedResidual = momentumResiduals.flatMap((r, i) => [r.linear.x / bs[i].mass, r.linear.y / bs[i].mass, r.linear.z / bs[i].mass,
    r.angular.x / bs[i].inertia, r.angular.y / bs[i].inertia, r.angular.z / bs[i].inertia]);
  const maxAngularPhase = Math.max(...bs.map((b, i) => h * norm(mul(add(oldBodies[i].angularMomentum, b.angularMomentum), .5 / b.inertia))));
  return { state, momentumResiduals, normalizedResidual, legs: legReports as SpatialSupportCandidate['legs'], external,
    externalWork, dampingWork, knownLinearImpulse, knownAngularImpulse, minimumChordLength, maxAngularPhase,
    maxElasticPhase: h * Math.sqrt(elasticRateSquared), maxAttachmentResidual };
}

const residualNorm = (r: number[]): number => Math.max(...r.map(Math.abs));
/** Angular coordinates are L/I for conditioning only. Physical equations,
 * energy and all returned momenta continue to use the explicit inertia. */
function pack(s: SpatialSupportState): number[] {
  return materials(s).flatMap(b => [b.velocity.x, b.velocity.y, b.velocity.z,
    b.angularMomentum.x / b.inertia, b.angularMomentum.y / b.inertia, b.angularMomentum.z / b.inertia]);
}
function unpack(before: SpatialSupportState, values: number[]): SpatialEndpoints {
  return materials(before).map((b, i) => ({ velocity: { x: values[6 * i], y: values[6 * i + 1], z: values[6 * i + 2] },
    angularMomentum: { x: values[6 * i + 3] * b.inertia, y: values[6 * i + 4] * b.inertia,
      z: values[6 * i + 5] * b.inertia } })) as SpatialEndpoints;
}
function solveLinear(jac: number[][], rhs: number[]): number[] | null {
  const n = rhs.length, a = jac.map((row, i) => [...row, rhs[i]]);
  const scale = Math.max(1, ...jac.flat().map(Math.abs));
  for (let col = 0; col < n; col++) {
    let pivot = col; for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (!(Math.abs(a[pivot][col]) > 128 * Number.EPSILON * scale)) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col]; for (let j = col; j <= n; j++) a[col][j] /= divisor;
    for (let row = 0; row < n; row++) if (row !== col) {
      const factor = a[row][col]; for (let j = col; j <= n; j++) a[row][j] -= factor * a[col][j];
    }
  }
  const solution = a.map(row => row[n]); return solution.every(Number.isFinite) ? solution : null;
}

export function advanceSpatialSupport(before: SpatialSupportState, h: number, options: SpatialSupportOptions = {}):
  { state: SpatialSupportState; report: SpatialSupportReport } {
  validateState(before);
  const loads = options.externalImpulses ?? emptyLoads(); validateLoads(loads);
  const tolerance = options.tolerance ?? 1e-10, geometryTolerance = options.geometryTolerance ?? 1e-9;
  const maxAngularPhase = options.maxAngularPhase ?? .5;
  const maxElasticPhase = options.maxElasticPhase ?? .5;
  const maxIterations = options.maxIterations ?? 60, maxLineSearch = options.maxLineSearch ?? 24;
  if (![h, tolerance, geometryTolerance, maxAngularPhase, maxElasticPhase].every(x => Number.isFinite(x) && x > 0)
    || ![maxIterations, maxLineSearch].every(x => Number.isInteger(x) && x >= 1)) throw new RangeError('Finite positive spatial solve options required');
  const old = materials(before), guess = pack(before);
  for (let i = 0; i < 3; i++) {
    let linear = loads[i].center ?? zero(), angular = loads[i].couple ?? zero();
    for (const p of loads[i].points ?? []) {
      linear = add(linear, p.impulse);
      angular = add(angular, cross(sub(rigidPointPosition(old[i], p.local), old[i].position), p.impulse));
    }
    const dv = add(mul(before.gravity, h), mul(linear, 1 / old[i].mass)), dw = mul(angular, 1 / old[i].inertia);
    for (const [j, key] of (['x', 'y', 'z'] as const).entries()) { guess[6 * i + j] += dv[key]; guess[6 * i + 3 + j] += dw[key]; }
  }
  const tryCandidate = (values: number[]): SpatialSupportCandidate | null => {
    try { return evaluateSpatialSupportCandidate(before, h, unpack(before, values), loads, geometryTolerance); }
    catch (e) { if (e instanceof RangeError) return null; throw e; }
  };
  let values = guess, candidate = tryCandidate(values), reason: string | null = null, iterations = 0;
  if (!candidate) {
    // A valid stationary-pose seed is only a Newton candidate. It never
    // grants a successful plant or overwrites the accepted physical state.
    values = pack(before).map(x => -x); candidate = tryCandidate(values);
  }
  if (!candidate) throw new RangeError('Initial material geometry is outside the declared numerical domain');
  for (; iterations < maxIterations; iterations++) {
    const current = candidate, currentNorm = residualNorm(current.normalizedResidual);
    if (currentNorm <= tolerance) break;
    const jac = Array.from({ length: 18 }, () => Array(18).fill(0) as number[]);
    let failedColumn = false;
    for (let col = 0; col < 18; col++) {
      const eps = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(values[col]));
      const plus = [...values], minus = [...values]; plus[col] += eps; minus[col] -= eps;
      const cp = tryCandidate(plus), cm = tryCandidate(minus);
      if (!cp && !cm) { failedColumn = true; break; }
      for (let row = 0; row < 18; row++) jac[row][col] = cp && cm
        ? (cp.normalizedResidual[row] - cm.normalizedResidual[row]) / (2 * eps)
        : cp ? (cp.normalizedResidual[row] - current.normalizedResidual[row]) / eps
          : (current.normalizedResidual[row] - cm!.normalizedResidual[row]) / eps;
    }
    if (failedColumn) { reason = 'Local geometry prevents a Jacobian; subdivide the physical interval'; break; }
    const delta = solveLinear(jac, current.normalizedResidual.map(x => -x));
    if (!delta) { reason = 'Singular coupled material response; subdivide the physical interval'; break; }
    let accepted = false, scale = 1;
    for (let trial = 0; trial < maxLineSearch; trial++) {
      const nextValues = values.map((x, j) => x + scale * delta[j]), next = tryCandidate(nextValues);
      if (next && residualNorm(next.normalizedResidual) < currentNorm) { values = nextValues; candidate = next; accepted = true; break; }
      scale *= .5;
    }
    if (!accepted) { reason = 'Local geometry or nonlinear line search requires a shorter physical interval'; break; }
  }
  const residual = residualNorm(candidate.normalizedResidual);
  if (!reason && residual > tolerance) reason = 'Coupled material iteration limit; subdivide the physical interval';
  if (!reason && candidate.maxAngularPhase > maxAngularPhase)
    reason = 'Angular trajectory budget requires a shorter physical interval';
  if (!reason && candidate.maxElasticPhase > maxElasticPhase)
    reason = 'Elastic response budget requires a shorter physical interval';
  const energyBefore = spatialSupportEnergy(before), energyAfter = spatialSupportEnergy(candidate.state);
  const workResidual = energyAfter.total - energyBefore.total - candidate.externalWork - candidate.dampingWork;
  const final = materials(candidate.state), totalLinear = (bs: MaterialRigidState[]) => bs.reduce((sum, b) => add(sum, mul(b.velocity, b.mass)), zero());
  const totalAngular = (bs: MaterialRigidState[]) => bs.reduce((sum, b) => add(sum, rigidAngularMomentum(b)), zero());
  const linearMomentumResidual = sub(sub(totalLinear(final), totalLinear(old)), candidate.knownLinearImpulse);
  const angularMomentumResidual = sub(sub(totalAngular(final), totalAngular(old)), candidate.knownAngularImpulse);
  const orthogonalityError = Math.max(...final.map(b => rigidBasisError(b.basis)));
  const workTolerance = 256 * Number.EPSILON * Math.max(1, Math.abs(energyBefore.total), Math.abs(energyAfter.total), Math.abs(candidate.externalWork))
    + 4 * tolerance * final.reduce((sum, b, i) => sum + b.mass * norm(mean(old[i].velocity, b.velocity))
      + norm(mean(old[i].angularMomentum, b.angularMomentum)), 1);
  if (!reason && (Math.abs(workResidual) > workTolerance || candidate.dampingWork > workTolerance
    || candidate.legs.some(l => Math.abs(l.springWorkResidual) > workTolerance) || orthogonalityError > 1e-8
    || candidate.maxAttachmentResidual > 1e-8)) reason = 'Coupled material work/passivity/geometry residual';
  const accepted = reason === null;
  return { state: accepted ? clone(candidate.state) : clone(before), report: { ...candidate, state: clone(candidate.state),
    candidateState: clone(candidate.state), accepted, reason, iterations, residual, energyBefore, energyAfter, workResidual,
    linearMomentumResidual, angularMomentumResidual, orthogonalityError } };
}
