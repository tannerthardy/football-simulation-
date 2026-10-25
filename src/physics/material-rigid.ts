/** Small rigid material substrate for the shared support/contact solve.
 * Units: kg, yd, s. Rotational inertia is explicitly ISOTROPIC.
 *
 * Cayley midpoint attitude gives one exact material attachment Jacobian for
 * displacement, work, and angular momentum. This module has no strength,
 * traction, posture, or force capacity: the caller bounds applied impulses.
 * `rigidMidpointState` is the pose primitive for a coupled spatial solve;
 * the standalone point-impulse advance is a small mechanical diagnostic.
 */
export interface Vec3 { x: number; y: number; z: number }
/** Right-handed orthonormal basis, stored as local-to-world columns. */
export type RigidBasis = [Vec3, Vec3, Vec3];
export interface MaterialRigidState {
  mass: number;
  inertia: number;
  position: Vec3;
  velocity: Vec3;
  angularMomentum: Vec3;
  basis: RigidBasis;
}
export interface MaterialPointImpulse { id: string; local: Vec3; impulse: Vec3 }
export interface MaterialRigidOptions {
  pointImpulses?: MaterialPointImpulse[];
  centerImpulse?: Vec3;
  coupleImpulse?: Vec3;
  tolerance?: number;
  maxIterations?: number;
}
export interface RigidAttachmentInterval {
  beforePoint: Vec3; afterPoint: Vec3; midpointOffset: Vec3;
  meanVelocity: Vec3; displacementVelocity: Vec3; identityResidual: Vec3;
}
export interface RigidImpactAttachment { point: Vec3; offset: Vec3; meanVelocity: Vec3 }
export interface MaterialRigidReport {
  accepted: boolean; reason: string | null; iterations: number;
  /** A sufficient local uniqueness bound, not an actuator capacity. */
  angularContractionBound: number;
  angularSolveResidual: Vec3;
  candidateState: MaterialRigidState;
  energyBefore: number; energyAfter: number;
  pointWork: number; centerWork: number; coupleWork: number; impulseWork: number; workResidual: number;
  linearMomentumResidual: Vec3; angularMomentumResidual: Vec3;
  orthogonalityError: number; rotationAngle: number;
  points: Array<RigidAttachmentInterval & { id: string; impulse: Vec3; angularImpulse: Vec3; work: number }>;
}

const zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });
const copy = (v: Vec3): Vec3 => ({ ...v });
export const v3Add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const v3Sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const v3Scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const v3Dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const v3Cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x });
export const v3Norm = (v: Vec3): number => Math.hypot(v.x, v.y, v.z);
export function identityRigidBasis(): RigidBasis {
  return [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }];
}
export function rigidWorldOffset(state: MaterialRigidState, local: Vec3): Vec3 {
  return v3Add(v3Add(v3Scale(state.basis[0], local.x), v3Scale(state.basis[1], local.y)),
    v3Scale(state.basis[2], local.z));
}
export function rigidPointPosition(state: MaterialRigidState, local: Vec3): Vec3 {
  return v3Add(state.position, rigidWorldOffset(state, local));
}
export function rigidPointVelocity(state: MaterialRigidState, local: Vec3): Vec3 {
  return v3Add(state.velocity, v3Cross(v3Scale(state.angularMomentum, 1 / state.inertia), rigidWorldOffset(state, local)));
}
export function rigidBasisError(basis: RigidBasis): number {
  let error = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    error = Math.max(error, Math.abs(v3Dot(basis[i], basis[j]) - (i === j ? 1 : 0)));
  return Math.max(error, Math.abs(v3Dot(v3Cross(basis[0], basis[1]), basis[2]) - 1));
}
const clone = (s: MaterialRigidState): MaterialRigidState => ({ ...s, position: copy(s.position), velocity: copy(s.velocity),
  angularMomentum: copy(s.angularMomentum), basis: [copy(s.basis[0]), copy(s.basis[1]), copy(s.basis[2])] });
function finiteVec(v: Vec3): boolean { return [v.x, v.y, v.z].every(Number.isFinite); }
function validate(s: MaterialRigidState): void {
  if (![s.mass, s.inertia].every(x => Number.isFinite(x) && x > 0)
    || ![s.position, s.velocity, s.angularMomentum, ...s.basis].every(finiteVec)
    || s.basis.length !== 3 || rigidBasisError(s.basis) > 1e-8)
    throw new RangeError('Finite positive rigid mass/isotropic inertia and right-handed orthonormal material state required');
}
export function newMaterialRigid(state: MaterialRigidState): MaterialRigidState { validate(state); return clone(state); }
export function rigidKineticEnergy(s: MaterialRigidState): number {
  return .5 * s.mass * v3Dot(s.velocity, s.velocity) + .5 * v3Dot(s.angularMomentum, s.angularMomentum) / s.inertia;
}
export function rigidAngularMomentum(s: MaterialRigidState, origin: Vec3 = zero()): Vec3 {
  return v3Add(v3Cross(v3Sub(s.position, origin), v3Scale(s.velocity, s.mass)), s.angularMomentum);
}

/** Exact Cayley rotation; no pose normalization/projection is applied afterward. */
function cayleyVector(v: Vec3, halfIncrement: Vec3): Vec3 {
  const first = v3Cross(halfIncrement, v), second = v3Cross(halfIncrement, first);
  return v3Add(v, v3Scale(v3Add(first, second), 2 / (1 + v3Dot(halfIncrement, halfIncrement))));
}

/** Candidate pose driven by unknown end momenta in the SAME interval solve.
 * For isotropic inertia, omega_mean=(L0+L1)/(2I). This is a second-order
 * integration rule, not the exact free-rotation exponential flow.
 */
export function rigidMidpointState(before: MaterialRigidState, h: number, endVelocity: Vec3,
  endAngularMomentum: Vec3): MaterialRigidState {
  validate(before);
  if (!(h > 0 && Number.isFinite(h)) || ![endVelocity, endAngularMomentum].every(finiteVec))
    throw new RangeError('Finite positive rigid interval and finite candidate momenta required');
  const halfIncrement = v3Scale(v3Add(before.angularMomentum, endAngularMomentum), h / (4 * before.inertia));
  const after = clone(before);
  after.position = v3Add(before.position, v3Scale(v3Add(before.velocity, endVelocity), .5 * h));
  after.velocity = copy(endVelocity); after.angularMomentum = copy(endAngularMomentum);
  after.basis = before.basis.map(axis => cayleyVector(axis, halfIncrement)) as RigidBasis;
  return after;
}

/** Instantaneous contact candidate: pose is held; finite leg springs supply
 * no impulse. Normal/friction impulses and angular response belong to the
 * caller's one impact solve, not a later pose correction.
 */
export function rigidImpactState(before: MaterialRigidState, endVelocity: Vec3,
  endAngularMomentum: Vec3): MaterialRigidState {
  validate(before);
  if (![endVelocity, endAngularMomentum].every(finiteVec)) throw new RangeError('Finite impact momenta required');
  const after = clone(before); after.velocity = copy(endVelocity); after.angularMomentum = copy(endAngularMomentum);
  return after;
}

/** Instantaneous point response at a different observed material attachment.
 * Applies a known impulse to one actual local point; the same formula is
 * the linear rigid impact Jacobian used in coupled contact rows.
 */
export function rigidPointImpulseResponse(state: MaterialRigidState, appliedLocal: Vec3,
  observedLocal: Vec3, impulse: Vec3): Vec3 {
  const applied = rigidWorldOffset(state, appliedLocal), observed = rigidWorldOffset(state, observedLocal);
  const deltaOmega = v3Scale(v3Cross(applied, impulse), 1 / state.inertia);
  return v3Add(v3Scale(impulse, 1 / state.mass), v3Cross(deltaOmega, observed));
}

/** At an impact the point does not travel in time. Work uses the velocity
 * jump's mean, not an undefined geometric displacement divided by zero.
 */
export function rigidImpactAttachment(before: MaterialRigidState, after: MaterialRigidState,
  local: Vec3): RigidImpactAttachment {
  if (!finiteVec(local) || before.mass !== after.mass || before.inertia !== after.inertia
    || v3Norm(v3Sub(after.position, before.position)) > 1e-12
    || after.basis.some((axis, i) => v3Norm(v3Sub(axis, before.basis[i])) > 1e-12))
    throw new RangeError('Impact attachment requires unchanged material geometry/mass/inertia');
  const offset = rigidWorldOffset(before, local);
  const velocityMean = v3Scale(v3Add(before.velocity, after.velocity), .5);
  const omegaMean = v3Scale(v3Add(before.angularMomentum, after.angularMomentum), .5 / before.inertia);
  return { point: v3Add(before.position, offset), offset, meanVelocity: v3Add(velocityMean, v3Cross(omegaMean, offset)) };
}

/** Actual material chord velocity and its matching rigid impulse Jacobian. */
export function rigidAttachmentInterval(before: MaterialRigidState, after: MaterialRigidState, h: number,
  local: Vec3): RigidAttachmentInterval {
  if (!(h > 0 && Number.isFinite(h)) || !finiteVec(local) || before.mass !== after.mass || before.inertia !== after.inertia)
    throw new RangeError('Finite material attachment and unchanged mass/inertia over a positive interval required');
  const r0 = rigidWorldOffset(before, local), r1 = rigidWorldOffset(after, local);
  const midpointOffset = v3Scale(v3Add(r0, r1), .5);
  const beforePoint = v3Add(before.position, r0), afterPoint = v3Add(after.position, r1);
  const velocityMean = v3Scale(v3Add(before.velocity, after.velocity), .5);
  const omegaMean = v3Scale(v3Add(before.angularMomentum, after.angularMomentum), .5 / before.inertia);
  const meanVelocity = v3Add(velocityMean, v3Cross(omegaMean, midpointOffset));
  const displacementVelocity = v3Scale(v3Sub(afterPoint, beforePoint), 1 / h);
  return { beforePoint, afterPoint, midpointOffset, meanVelocity, displacementVelocity,
    identityResidual: v3Sub(displacementVelocity, meanVelocity) };
}

function solve3(a: number[][], b: number[]): Vec3 | null {
  const matrix = a.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < 3; i++) {
    let pivot = i; for (let j = i + 1; j < 3; j++) if (Math.abs(matrix[j][i]) > Math.abs(matrix[pivot][i])) pivot = j;
    if (!(Math.abs(matrix[pivot][i]) > 1e-16)) return null;
    [matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]];
    const scale = matrix[i][i]; for (let j = i; j < 4; j++) matrix[i][j] /= scale;
    for (let row = 0; row < 3; row++) if (row !== i) {
      const factor = matrix[row][i]; for (let j = i; j < 4; j++) matrix[row][j] -= factor * matrix[i][j];
    }
  }
  const result = { x: matrix[0][3], y: matrix[1][3], z: matrix[2][3] };
  return finiteVec(result) ? result : null;
}

/** Standalone mechanically certified response to fixed external impulses.
 * Returns the unchanged state if the local interval is not certified or the
 * angular solve fails. This does not run after a ground/leg solve: the shared
 * spatial kernel uses the candidate-pose and attachment primitives directly.
 */
export function advanceMaterialRigid(before: MaterialRigidState, h: number, options: MaterialRigidOptions = {}):
  { state: MaterialRigidState; report: MaterialRigidReport } {
  validate(before);
  const tolerance = options.tolerance ?? 1e-11, limit = options.maxIterations ?? 40;
  const center = options.centerImpulse ?? zero(), couple = options.coupleImpulse ?? zero();
  const points = options.pointImpulses ?? [];
  if (!(Number.isFinite(h) && h > 0 && Number.isFinite(tolerance) && tolerance > 0)
    || !Number.isInteger(limit) || limit < 1 || ![center, couple].every(finiteVec)
    || points.some(p => typeof p.id !== 'string' || !finiteVec(p.local) || !finiteVec(p.impulse))
    || new Set(points.map(p => p.id)).size !== points.length)
    throw new RangeError('Finite positive interval/options and uniquely identified finite material impulses required');
  const total = points.reduce((sum, p) => v3Add(sum, p.impulse), center);
  const endVelocity = v3Add(before.velocity, v3Scale(total, 1 / before.mass));
  const angularContractionBound = h * points.reduce((sum, p) => sum + v3Norm(p.local) * v3Norm(p.impulse), 0)
    / (4 * before.inertia);
  let endMomentum = points.reduce((sum, p) => v3Add(sum, v3Cross(rigidWorldOffset(before, p.local), p.impulse)),
    v3Add(before.angularMomentum, couple));
  const evaluate = (end: Vec3) => {
    const state = rigidMidpointState(before, h, endVelocity, end);
    const attachments = points.map(p => rigidAttachmentInterval(before, state, h, p.local));
    const torque = points.reduce((sum, p, i) => v3Add(sum, v3Cross(attachments[i].midpointOffset, p.impulse)), couple);
    return { state, attachments, residual: v3Sub(v3Sub(end, before.angularMomentum), torque) };
  };
  let reason: string | null = angularContractionBound >= 1
    ? 'Local angular interval not certified; subdivide the physical interval' : null;
  let iterations = 0;
  const keys: Array<keyof Vec3> = ['x', 'y', 'z'];
  if (!reason) {
    for (; iterations < limit; iterations++) {
      const current = evaluate(endMomentum), norm = v3Norm(current.residual);
      if (norm <= tolerance) break;
      const jac = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (let col = 0; col < 3; col++) {
        const key = keys[col], step = 1e-6 * Math.max(1, Math.abs(endMomentum[key]));
        const plus = { ...endMomentum, [key]: endMomentum[key] + step };
        const minus = { ...endMomentum, [key]: endMomentum[key] - step };
        const rp = evaluate(plus).residual, rm = evaluate(minus).residual;
        for (let row = 0; row < 3; row++) jac[row][col] = (rp[keys[row]] - rm[keys[row]]) / (2 * step);
      }
      const delta = solve3(jac, keys.map(key => -current.residual[key]));
      if (!delta) { reason = 'Singular local angular response; subdivide the physical interval'; break; }
      let scale = 1, next = endMomentum, improved = false;
      for (let trial = 0; trial < 24; trial++) {
        next = v3Add(endMomentum, v3Scale(delta, scale));
        if (finiteVec(next) && v3Norm(evaluate(next).residual) < norm) { improved = true; break; }
        scale *= .5;
      }
      if (!improved) { reason = 'Local angular line search failed; subdivide the physical interval'; break; }
      endMomentum = next;
    }
    if (!reason && v3Norm(evaluate(endMomentum).residual) > tolerance)
      reason = 'Local angular iteration limit; subdivide the physical interval';
  }
  const evaluated = evaluate(endMomentum), after = evaluated.state;
  const omegaMean = v3Scale(v3Add(before.angularMomentum, after.angularMomentum), .5 / before.inertia);
  const velocityMean = v3Scale(v3Add(before.velocity, after.velocity), .5);
  const pointReports = points.map((p, i) => ({ ...evaluated.attachments[i], id: p.id, impulse: copy(p.impulse),
    angularImpulse: v3Cross(evaluated.attachments[i].midpointOffset, p.impulse),
    work: v3Dot(p.impulse, evaluated.attachments[i].meanVelocity) }));
  const pointWork = pointReports.reduce((sum, p) => sum + p.work, 0);
  const centerWork = v3Dot(center, velocityMean), coupleWork = v3Dot(couple, omegaMean);
  const impulseWork = pointWork + centerWork + coupleWork;
  const energyBefore = rigidKineticEnergy(before), energyAfter = rigidKineticEnergy(after);
  const workResidual = energyAfter - energyBefore - impulseWork;
  const linearMomentumResidual = v3Sub(v3Scale(v3Sub(after.velocity, before.velocity), before.mass), total);
  const midpointCenter = v3Scale(v3Add(before.position, after.position), .5);
  const externalAngular = pointReports.reduce((sum, p) => v3Add(sum,
    v3Cross(v3Scale(v3Add(p.beforePoint, p.afterPoint), .5), p.impulse)),
  v3Add(v3Cross(midpointCenter, center), couple));
  const angularMomentumResidual = v3Sub(v3Sub(rigidAngularMomentum(after), rigidAngularMomentum(before)), externalAngular);
  const orthogonalityError = rigidBasisError(after.basis);
  const roundoff = 128 * Number.EPSILON * Math.max(1, energyBefore, energyAfter, Math.abs(impulseWork));
  if (!reason && (Math.abs(workResidual) > roundoff + 4 * tolerance * Math.max(1, v3Norm(omegaMean))
    || v3Norm(linearMomentumResidual) > 1e-8 || v3Norm(angularMomentumResidual) > 1e-8
    || pointReports.some(p => v3Norm(p.identityResidual) > 1e-8) || orthogonalityError > 1e-8))
    reason = 'Rigid attachment energy/momentum/geometry residual';
  const accepted = reason === null;
  return { state: accepted ? clone(after) : clone(before), report: { accepted, reason, iterations, angularContractionBound,
    angularSolveResidual: copy(evaluated.residual), candidateState: clone(after), energyBefore, energyAfter,
    pointWork, centerWork, coupleWork, impulseWork, workResidual, linearMomentumResidual, angularMomentumResidual,
    orthogonalityError, rotationAngle: 2 * Math.atan(.5 * h * v3Norm(omegaMean)), points: pointReports } };
}
