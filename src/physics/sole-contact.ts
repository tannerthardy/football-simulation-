/** Finite material sole contact research primitives. Units kg, yd, s.
 * Normal complementarity is independent of the friction disk: tangential
 * dissipation cannot purchase an artificial normal impulse. The standalone
 * plastic impact holds the actual rigid pose, with no finite-leg impulse.
 */
import { newMaterialRigid, rigidWorldOffset, rigidPointPosition, rigidPointVelocity,
  rigidPointImpulseResponse, rigidImpactState, rigidImpactAttachment, rigidKineticEnergy,
  rigidAngularMomentum, v3Add, v3Sub, v3Scale, v3Cross, v3Dot, v3Norm,
  type Vec3, type MaterialRigidState } from './material-rigid.js';
export interface TangentVector { x: number; y: number }
export interface TangentMobility { xx: number; xy: number; yy: number }
export interface SoleContactPoint { id: string; local: Vec3; friction: number }
const finite2 = (v: TangentVector): boolean => Number.isFinite(v.x) && Number.isFinite(v.y);
const finite3 = (v: Vec3): boolean => finite2(v) && Number.isFinite(v.z);
const zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });
function validateMobility(h: TangentMobility): void {
  if (![h.xx, h.xy, h.yy].every(Number.isFinite) || !(h.xx > 0 && h.yy > 0 && h.xx * h.yy > h.xy * h.xy))
    throw new RangeError('Finite positive definite tangent mobility required');
}
/** Row residual may represent normal endpoint velocity, or an appropriately
 * scaled gap in a coupled smooth solve. Response must use that same Jacobian. */
export function projectNormalImpulse(impulse: number, residual: number, response: number): number {
  if (![impulse, residual, response].every(Number.isFinite) || !(response > 0)) throw new RangeError('Finite normal row and positive response required');
  return Math.max(0, impulse - residual / response);
}
/** Velocity/gap units of the supplied row residual, rather than impulse units. */
export function normalComplementarityResidual(impulse: number, residual: number, response: number): number {
  return Math.abs(impulse - projectNormalImpulse(impulse, residual, response)) * response;
}
/** Exact metric disk prox: min .5 J.H.J + freeVelocity.J, |J|<=mu*Jn.
 * A scalar nonnegative ridge multiplier handles an active friction circle. */
export function projectTangentImpulse(freeVelocity: TangentVector, mobility: TangentMobility,
  normalImpulse: number, friction: number): TangentVector {
  validateMobility(mobility);
  if (!finite2(freeVelocity) || ![normalImpulse, friction].every(x => Number.isFinite(x) && x >= 0)) throw new RangeError('Finite tangent row and nonnegative normal/friction required');
  const radius = normalImpulse * friction;
  if (!Number.isFinite(radius)) throw new RangeError('Finite friction disk required');
  if (radius === 0) return { x: 0, y: 0 };
  const at = (beta: number): TangentVector => {
    const xx = mobility.xx + beta, yy = mobility.yy + beta, determinant = xx * yy - mobility.xy ** 2;
    return { x: (-yy * freeVelocity.x + mobility.xy * freeVelocity.y) / determinant,
      y: (mobility.xy * freeVelocity.x - xx * freeVelocity.y) / determinant };
  };
  const unconstrained = at(0);
  if (Math.hypot(unconstrained.x, unconstrained.y) <= radius) return unconstrained;
  let lo = 0, hi = Math.max(mobility.xx, mobility.yy, Math.hypot(freeVelocity.x, freeVelocity.y) / radius);
  while (Math.hypot(at(hi).x, at(hi).y) > radius) {
    hi *= 2; if (!Number.isFinite(hi)) throw new RangeError('Unable to bracket tangent friction circle');
  }
  for (let k = 0; k < 60; k++) {
    const mid = .5 * (lo + hi), j = at(mid);
    if (Math.hypot(j.x, j.y) > radius) lo = mid; else hi = mid;
  }
  let result = at(hi);
  while (Math.hypot(result.x, result.y) > radius) result = { x: result.x * (1 - 2 * Number.EPSILON), y: result.y * (1 - 2 * Number.EPSILON) };
  return result;
}
export function tangentMaximumDissipationResidual(impulse: TangentVector, velocity: TangentVector,
  mobility: TangentMobility, normalImpulse: number, friction: number): number {
  if (!finite2(impulse) || !finite2(velocity)) throw new RangeError('Finite tangent impulse/velocity required');
  const free = { x: velocity.x - mobility.xx * impulse.x - mobility.xy * impulse.y,
    y: velocity.y - mobility.xy * impulse.x - mobility.yy * impulse.y };
  const projected = projectTangentImpulse(free, mobility, normalImpulse, friction);
  const dx = projected.x - impulse.x, dy = projected.y - impulse.y;
  return Math.hypot(mobility.xx * dx + mobility.xy * dy, mobility.xy * dx + mobility.yy * dy);
}
/** Small unilateral normal active set, with tangent impulses held fixed.
 * Singular active subsets are skipped; the original projected rows remain
 * the fallback for redundant contact geometry. No regularization is added. */
function solveNormalBlock(h: number[][], free: number[], tolerance: number): number[] | null {
  const count = free.length;
  if (count > 8) return null;
  for (let mask = 0; mask < 2 ** count; mask++) {
    const active = free.map((_, i) => i).filter(i => (mask & (1 << i)) !== 0);
    const a = active.map(i => [...active.map(j => h[i][j]), -free[i]]);
    let singular = false;
    for (let col = 0; col < active.length; col++) {
      let pivot = col;
      for (let row = col + 1; row < active.length; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
      if (Math.abs(a[pivot][col]) <= 1e-12 * Math.max(...h.map((r, i) => Math.abs(r[i])))) { singular = true; break; }
      [a[col], a[pivot]] = [a[pivot], a[col]];
      const scale = a[col][col];
      for (let j = col; j <= active.length; j++) a[col][j] /= scale;
      for (let row = 0; row < active.length; row++) if (row !== col) {
        const factor = a[row][col];
        for (let j = col; j <= active.length; j++) a[row][j] -= factor * a[col][j];
      }
    }
    if (singular) continue;
    const impulse = free.map(() => 0);
    active.forEach((i, j) => { impulse[i] = a[j][active.length]; });
    if (impulse.some(j => !Number.isFinite(j) || j < 0)) continue;
    const residual = free.map((v, i) => v + h[i].reduce((sum, x, j) => sum + x * impulse[j], 0));
    if (residual.every((v, i) => v >= -tolerance && normalComplementarityResidual(impulse[i], v, h[i][i]) <= tolerance)) return impulse;
  }
  return null;
}
export interface SoleImpactOptions { planeHeight?: number; geometryTolerance?: number; tolerance?: number; maxIterations?: number }
export interface SoleImpactContactReport {
  id: string; local: Vec3; point: Vec3; offset: Vec3; impulse: Vec3; angularImpulse: Vec3;
  postVelocity: Vec3; normalResidual: number; tangentResidual: number; frictionCapExcess: number; work: number;
}
export interface SoleImpactReport {
  accepted: boolean; reason: string | null; iterations: number; acceleratedUpdates: number; candidateState: MaterialRigidState;
  energyBefore: number; energyAfter: number; impulseWork: number; workResidual: number;
  linearMomentumResidual: Vec3; angularMomentumResidual: Vec3;
  maxNormalResidual: number; maxTangentResidual: number; maxFrictionCapExcess: number;
  minPostNormalVelocity: number; maxContactHeightError: number; contacts: SoleImpactContactReport[];
}
/** Zero-seeded deterministic projected iteration. All supplied contact points
 * must already lie on the ground plane; the impact never snaps material pose.
 * Redundant load distributions are permitted only if the final physical rows
 * converge. There is no regularization force or hidden fallback. */
export function solveSoleImpact(input: MaterialRigidState, contacts: SoleContactPoint[], options: SoleImpactOptions = {}):
  { state: MaterialRigidState; report: SoleImpactReport } {
  const before = newMaterialRigid(input), plane = options.planeHeight ?? 0, geometryTolerance = options.geometryTolerance ?? 1e-9;
  const tolerance = options.tolerance ?? 1e-9, maxIterations = options.maxIterations ?? 256;
  if (![plane, geometryTolerance, tolerance].every(Number.isFinite) || !(geometryTolerance >= 0 && tolerance > 0)
    || !Number.isInteger(maxIterations) || maxIterations < 1 || contacts.length === 0
    || contacts.some(p => !p.id || !finite3(p.local) || !(p.friction >= 0 && Number.isFinite(p.friction)))
    || new Set(contacts.map(p => p.id)).size !== contacts.length) throw new RangeError('Finite explicit material sole contacts/options required');
  const rows = contacts.map(p => {
    const offset = rigidWorldOffset(before, p.local), point = rigidPointPosition(before, p.local);
    const x = rigidPointImpulseResponse(before, p.local, p.local, { x: 1, y: 0, z: 0 });
    const y = rigidPointImpulseResponse(before, p.local, p.local, { x: 0, y: 1, z: 0 });
    const z = rigidPointImpulseResponse(before, p.local, p.local, { x: 0, y: 0, z: 1 });
    return { p, offset, point, normalResponse: z.z, mobility: { xx: x.x, xy: .5 * (x.y + y.x), yy: y.y }, impulse: zero() };
  });
  const normalMobility = rows.map(observed => rows.map(applied =>
    rigidPointImpulseResponse(before, applied.p.local, observed.p.local, { x: 0, y: 0, z: 1 }).z));
  const maxContactHeightError = Math.max(...rows.map(r => Math.abs(r.point.z - plane)));
  let candidate = before, iterations = 0, acceleratedUpdates = 0, reason: string | null = null;
  let totalImpulse = zero(), totalTorque = zero();
  const apply = (row: typeof rows[number], impulse: Vec3) => {
    totalImpulse = v3Add(totalImpulse, impulse); totalTorque = v3Add(totalTorque, v3Cross(row.offset, impulse));
    candidate = rigidImpactState(before, v3Add(before.velocity, v3Scale(totalImpulse, 1 / before.mass)), v3Add(before.angularMomentum, totalTorque));
  };
  const residuals = () => rows.map(r => {
    const velocity = rigidPointVelocity(candidate, r.p.local);
    return { velocity, normal: normalComplementarityResidual(r.impulse.z, velocity.z, r.normalResponse),
      tangent: tangentMaximumDissipationResidual(r.impulse, velocity, r.mobility, r.impulse.z, r.p.friction),
      cap: Math.max(0, Math.hypot(r.impulse.x, r.impulse.y) - r.p.friction * r.impulse.z) };
  });
  const setImpulses = (impulses: Vec3[]) => {
    totalImpulse = zero(); totalTorque = zero();
    rows.forEach((row, i) => {
      row.impulse = { ...impulses[i] };
      totalImpulse = v3Add(totalImpulse, row.impulse);
      totalTorque = v3Add(totalTorque, v3Cross(row.offset, row.impulse));
    });
    candidate = rigidImpactState(before, v3Add(before.velocity, v3Scale(totalImpulse, 1 / before.mass)), v3Add(before.angularMomentum, totalTorque));
  };
  const merit = () => Math.max(...residuals().flatMap(r => [r.normal, r.tangent, r.cap, Math.max(0, -r.velocity.z)]));
  let previousDelta: Vec3[] | null = null, previousEnd: Vec3[] | null = null;
  if (maxContactHeightError > geometryTolerance) reason = 'Contacts are not on the impact plane; locate touchdown first';
  try {
    if (!reason) for (let k = 0; k < maxIterations; k++) {
      const sweepStart = rows.map(row => ({ ...row.impulse }));
      const freeNormal = rows.map((row, i) => rigidPointVelocity(candidate, row.p.local).z
        - normalMobility[i].reduce((sum, value, j) => sum + value * rows[j].impulse.z, 0));
      const block = solveNormalBlock(normalMobility, freeNormal, tolerance * .1);
      if (block) rows.forEach((row, i) => {
        apply(row, { x: 0, y: 0, z: block[i] - row.impulse.z }); row.impulse.z = block[i];
      });
      for (const row of rows) {
        const velocity = rigidPointVelocity(candidate, row.p.local);
        const normal = block ? row.impulse.z : projectNormalImpulse(row.impulse.z, velocity.z, row.normalResponse);
        apply(row, { x: 0, y: 0, z: normal - row.impulse.z }); row.impulse.z = normal;
        const postNormal = rigidPointVelocity(candidate, row.p.local);
        const free = { x: postNormal.x - row.mobility.xx * row.impulse.x - row.mobility.xy * row.impulse.y,
          y: postNormal.y - row.mobility.xy * row.impulse.x - row.mobility.yy * row.impulse.y };
        const tangent = projectTangentImpulse(free, row.mobility, normal, row.p.friction);
        apply(row, { x: tangent.x - row.impulse.x, y: tangent.y - row.impulse.y, z: 0 });
        row.impulse.x = tangent.x; row.impulse.y = tangent.y;
      }
      // Safeguarded depth-one fixed-point extrapolation accelerates slow
      // coupled rows. Every proposal stays in its original friction disk and
      // is accepted only when the original complementarity merit improves.
      const sweepEnd = rows.map(row => ({ ...row.impulse }));
      const delta = sweepEnd.map((j, i) => v3Sub(j, sweepStart[i]));
      if (previousDelta && previousEnd) {
        const difference = delta.map((j, i) => v3Sub(j, previousDelta![i]));
        const denominator = difference.reduce((sum, d) => sum + v3Dot(d, d), 0);
        if (denominator > 0) {
          const gamma = delta.reduce((sum, d, i) => sum + v3Dot(d, difference[i]), 0) / denominator;
          if (Number.isFinite(gamma)) {
            const proposal = sweepEnd.map((j, i) => {
              const p = v3Sub(j, v3Scale(v3Sub(j, previousEnd![i]), gamma));
              p.z = Math.max(0, p.z);
              const radius = rows[i].p.friction * p.z, norm = Math.hypot(p.x, p.y);
              if (norm > radius) { p.x *= radius / norm; p.y *= radius / norm; }
              return p;
            });
            if (proposal.every(finite3)) {
              const oldMerit = merit(); setImpulses(proposal);
              if (merit() < oldMerit) acceleratedUpdates++; else setImpulses(sweepEnd);
            }
          }
        }
      }
      previousDelta = delta; previousEnd = sweepEnd;
      iterations = k + 1;
      const values = residuals();
      if (values.every(r => r.normal <= tolerance && r.tangent <= tolerance && r.cap <= tolerance && r.velocity.z >= -tolerance)) break;
    }
  } catch (error) { reason = error instanceof Error ? error.message : String(error); }
  const values = residuals(), energyBefore = rigidKineticEnergy(before), energyAfter = rigidKineticEnergy(candidate);
  const reported = rows.map((r, i): SoleImpactContactReport => {
    const attachment = rigidImpactAttachment(before, candidate, r.p.local);
    return { id: r.p.id, local: { ...r.p.local }, point: r.point, offset: r.offset, impulse: { ...r.impulse },
      angularImpulse: v3Cross(r.offset, r.impulse), postVelocity: values[i].velocity,
      normalResidual: values[i].normal, tangentResidual: values[i].tangent, frictionCapExcess: values[i].cap,
      work: v3Dot(r.impulse, attachment.meanVelocity) };
  });
  const impulseWork = reported.reduce((sum, r) => sum + r.work, 0), workResidual = energyAfter - energyBefore - impulseWork;
  const sumImpulse = reported.reduce((sum, r) => v3Add(sum, r.impulse), zero());
  const sumWorldTorque = reported.reduce((sum, r) => v3Add(sum, v3Cross(r.point, r.impulse)), zero());
  const linearMomentumResidual = v3Sub(v3Scale(v3Sub(candidate.velocity, before.velocity), before.mass), sumImpulse);
  const angularMomentumResidual = v3Sub(v3Sub(rigidAngularMomentum(candidate), rigidAngularMomentum(before)), sumWorldTorque);
  const maxNormalResidual = Math.max(...values.map(r => r.normal)), maxTangentResidual = Math.max(...values.map(r => r.tangent));
  const maxFrictionCapExcess = Math.max(...values.map(r => r.cap)), minPostNormalVelocity = Math.min(...values.map(r => r.velocity.z));
  if (!reason && (maxNormalResidual > tolerance || maxTangentResidual > tolerance || maxFrictionCapExcess > tolerance || minPostNormalVelocity < -tolerance)) reason = 'Coupled normal/friction impact rows did not converge';
  if (!reason && (energyAfter > energyBefore + tolerance || Math.abs(workResidual) > tolerance || v3Norm(linearMomentumResidual) > tolerance || v3Norm(angularMomentumResidual) > tolerance)) reason = 'Impact energy/momentum ledger residual';
  const accepted = reason === null;
  return { state: accepted ? newMaterialRigid(candidate) : newMaterialRigid(before), report: { accepted, reason, iterations, acceleratedUpdates, candidateState: newMaterialRigid(candidate),
    energyBefore, energyAfter, impulseWork, workResidual, linearMomentumResidual, angularMomentumResidual,
    maxNormalResidual, maxTangentResidual, maxFrictionCapExcess, minPostNormalVelocity, maxContactHeightError, contacts: reported } };
}

export interface SolePointForce { local: Vec3; force: Vec3 }
export interface SoleReactionOptions extends SoleImpactOptions {
  bodyForce?: Vec3; bodyCouple?: Vec3; pointForces?: SolePointForce[]; slipTolerance?: number;
}
export interface SoleReactionContactReport {
  id: string; point: Vec3; offset: Vec3; velocity: Vec3; acceleration: Vec3;
  force: Vec3; angularForce: Vec3; normalResidual: number; tangentResidual: number;
  frictionCapExcess: number; power: number; sliding: boolean;
}
export interface SoleReactionReport {
  accepted: boolean; reason: string | null; iterations: number; acceleratedUpdates: number;
  linearAcceleration: Vec3; angularAcceleration: Vec3;
  maxNormalResidual: number; maxTangentResidual: number; maxFrictionCapExcess: number;
  minNormalAcceleration: number; maxContactHeightError: number;
  forceResidual: Vec3; torqueResidual: Vec3; contactPower: number;
  contacts: SoleReactionContactReport[];
}
/** Instantaneous unilateral reaction at the actual material pose, in force
 * and acceleration units. Finite compliant legs enter only as known actual
 * point forces. There is no instantaneous leg stiffness or state advance.
 * Moving contacts use actual velocity Coulomb friction; incipient/sticking
 * contacts use the same metric maximum-dissipation disk in acceleration.
 */
export function solveSoleReaction(input: MaterialRigidState, contacts: SoleContactPoint[], options: SoleReactionOptions = {}): SoleReactionReport {
  const state = newMaterialRigid(input), plane = options.planeHeight ?? 0;
  const tolerance = options.tolerance ?? 1e-9, geometryTolerance = options.geometryTolerance ?? 1e-9;
  const slipTolerance = options.slipTolerance ?? 1e-7, maxIterations = options.maxIterations ?? 256;
  const bodyForce = options.bodyForce ?? zero(), bodyCouple = options.bodyCouple ?? zero(), pointForces = options.pointForces ?? [];
  if (![plane, tolerance, geometryTolerance, slipTolerance].every(Number.isFinite) || tolerance <= 0 || geometryTolerance < 0 || slipTolerance < 0
    || !Number.isInteger(maxIterations) || maxIterations < 1 || !finite3(bodyForce) || !finite3(bodyCouple)
    || pointForces.some(p => !finite3(p.local) || !finite3(p.force)) || !contacts.length
    || contacts.some(p => !p.id || !finite3(p.local) || !Number.isFinite(p.friction) || p.friction < 0)
    || new Set(contacts.map(p => p.id)).size !== contacts.length) throw new RangeError('Finite explicit material reaction inputs required');
  let knownForce = { ...bodyForce }, knownTorque = { ...bodyCouple };
  for (const p of pointForces) {
    knownForce = v3Add(knownForce, p.force);
    knownTorque = v3Add(knownTorque, v3Cross(rigidWorldOffset(state, p.local), p.force));
  }
  const omega = v3Scale(state.angularMomentum, 1 / state.inertia);
  const rows = contacts.map(p => {
    const offset = rigidWorldOffset(state, p.local), point = rigidPointPosition(state, p.local), velocity = rigidPointVelocity(state, p.local);
    const free = v3Add(v3Add(v3Scale(knownForce, 1 / state.mass), v3Cross(v3Scale(knownTorque, 1 / state.inertia), offset)), v3Cross(omega, v3Cross(omega, offset)));
    const x = rigidPointImpulseResponse(state, p.local, p.local, { x: 1, y: 0, z: 0 });
    const y = rigidPointImpulseResponse(state, p.local, p.local, { x: 0, y: 1, z: 0 });
    const z = rigidPointImpulseResponse(state, p.local, p.local, { x: 0, y: 0, z: 1 });
    const speed = Math.hypot(velocity.x, velocity.y);
    return { p, offset, point, velocity, free, normalResponse: z.z, mobility: { xx: x.x, xy: .5 * (x.y + y.x), yy: y.y },
      sliding: speed > slipTolerance, direction: speed > 0 ? { x: velocity.x / speed, y: velocity.y / speed } : { x: 0, y: 0 }, force: zero() };
  });
  const response = rows.map(observed => rows.map(applied => ({
    x: rigidPointImpulseResponse(state, applied.p.local, observed.p.local, { x: 1, y: 0, z: 0 }),
    y: rigidPointImpulseResponse(state, applied.p.local, observed.p.local, { x: 0, y: 1, z: 0 }),
    z: rigidPointImpulseResponse(state, applied.p.local, observed.p.local, { x: 0, y: 0, z: 1 })
  })));
  const acceleration = (i: number): Vec3 => rows.reduce((value, row, j) => v3Add(value, v3Add(v3Add(v3Scale(response[i][j].x, row.force.x), v3Scale(response[i][j].y, row.force.y)), v3Scale(response[i][j].z, row.force.z))), rows[i].free);
  const values = () => rows.map((row, i) => {
    const a = acceleration(i), cap = row.p.friction * row.force.z;
    return { acceleration: a, normal: normalComplementarityResidual(row.force.z, a.z, row.normalResponse),
      tangent: row.sliding ? Math.hypot(row.force.x + cap * row.direction.x, row.force.y + cap * row.direction.y) * Math.max(row.mobility.xx, row.mobility.yy)
        : tangentMaximumDissipationResidual(row.force, a, row.mobility, row.force.z, row.p.friction),
      cap: Math.max(0, Math.hypot(row.force.x, row.force.y) - cap) };
  });
  const merit = () => Math.max(...values().flatMap(v => [v.normal, v.tangent, v.cap, Math.max(0, -v.acceleration.z)]));
  const maxContactHeightError = Math.max(...rows.map(r => Math.abs(r.point.z - plane)));
  let reason: string | null = maxContactHeightError > geometryTolerance ? 'Contacts are not on the reaction plane' :
    rows.some(r => Math.abs(r.velocity.z) > slipTolerance) ? 'Reaction requires zero actual normal contact velocity' : null;
  let iterations = 0, acceleratedUpdates = 0;
  let previousDelta: Vec3[] | null = null, previousEnd: Vec3[] | null = null;
  const normalize = (f: Vec3, i: number): Vec3 => {
    const row = rows[i], z = Math.max(0, f.z), radius = row.p.friction * z;
    if (row.sliding) return { x: -radius * row.direction.x, y: -radius * row.direction.y, z };
    const norm = Math.hypot(f.x, f.y), scale = norm > radius ? radius / norm : 1;
    return { x: f.x * scale, y: f.y * scale, z };
  };
  try {
    if (!reason) for (let k = 0; k < maxIterations; k++) {
      const start = rows.map(r => ({ ...r.force }));
      const block = rows.every(r => !r.sliding) ? solveNormalBlock(response.map(r => r.map(v => v.z.z)),
        rows.map((_, i) => acceleration(i).z - response[i].reduce((sum, v, j) => sum + v.z.z * rows[j].force.z, 0)), tolerance * .1) : null;
      if (block) rows.forEach((r, i) => { r.force.z = block[i]; });
      // A moving Coulomb row's tangential force changes with its normal.
      // Its exact scalar response includes that same velocity direction.
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i], a = acceleration(i);
        if (row.sliding) {
          const h = row.normalResponse - row.p.friction * (response[i][i].x.z * row.direction.x + response[i][i].y.z * row.direction.y);
          if (!(h > 0)) { reason = 'Sliding normal response is nonpositive (Painleve/ambiguous reaction)'; break; }
          const normal = projectNormalImpulse(row.force.z, a.z, h);
          row.force = normalize({ x: 0, y: 0, z: normal }, i);
        } else {
          row.force.z = block ? row.force.z : projectNormalImpulse(row.force.z, a.z, row.normalResponse);
          const post = acceleration(i);
          const free = { x: post.x - row.mobility.xx * row.force.x - row.mobility.xy * row.force.y,
            y: post.y - row.mobility.xy * row.force.x - row.mobility.yy * row.force.y };
          const tangent = projectTangentImpulse(free, row.mobility, row.force.z, row.p.friction);
          row.force.x = tangent.x; row.force.y = tangent.y;
        }
      }
      if (reason) break;
      const end = rows.map(r => ({ ...r.force })), delta = end.map((f, i) => v3Sub(f, start[i]));
      if (previousDelta && previousEnd) {
        const difference = delta.map((f, i) => v3Sub(f, previousDelta![i]));
        const denominator = difference.reduce((sum, d) => sum + v3Dot(d, d), 0);
        if (denominator > 0) {
          const gamma = delta.reduce((sum, d, i) => sum + v3Dot(d, difference[i]), 0) / denominator;
          const proposal = end.map((f, i) => normalize(v3Sub(f, v3Scale(v3Sub(f, previousEnd![i]), gamma)), i));
          if (Number.isFinite(gamma) && proposal.every(finite3)) {
            const old = merit(); rows.forEach((r, i) => { r.force = proposal[i]; });
            if (merit() < old) acceleratedUpdates++; else rows.forEach((r, i) => { r.force = end[i]; });
          }
        }
      }
      previousDelta = delta; previousEnd = end; iterations = k + 1;
      if (merit() <= tolerance) break;
    }
  } catch (error) { reason = error instanceof Error ? error.message : String(error); }
  const final = values();
  let contactForce = zero(), contactTorque = zero();
  const reported = rows.map((r, i): SoleReactionContactReport => {
    const angularForce = v3Cross(r.offset, r.force);
    contactForce = v3Add(contactForce, r.force); contactTorque = v3Add(contactTorque, angularForce);
    return { id: r.p.id, point: r.point, offset: r.offset, velocity: r.velocity, acceleration: final[i].acceleration, force: { ...r.force }, angularForce,
      normalResidual: final[i].normal, tangentResidual: final[i].tangent, frictionCapExcess: final[i].cap,
      power: v3Dot(r.force, r.velocity), sliding: r.sliding };
  });
  const linearAcceleration = v3Scale(v3Add(knownForce, contactForce), 1 / state.mass), angularAcceleration = v3Scale(v3Add(knownTorque, contactTorque), 1 / state.inertia);
  const forceResidual = v3Sub(v3Scale(linearAcceleration, state.mass), v3Add(knownForce, contactForce));
  const torqueResidual = v3Sub(v3Scale(angularAcceleration, state.inertia), v3Add(knownTorque, contactTorque));
  const maxNormalResidual = Math.max(...final.map(v => v.normal)), maxTangentResidual = Math.max(...final.map(v => v.tangent));
  const maxFrictionCapExcess = Math.max(...final.map(v => v.cap)), minNormalAcceleration = Math.min(...final.map(v => v.acceleration.z));
  const contactPower = reported.reduce((sum, r) => sum + r.power, 0);
  if (!reason && (maxNormalResidual > tolerance || maxTangentResidual > tolerance || maxFrictionCapExcess > tolerance || minNormalAcceleration < -tolerance)) reason = 'Coupled normal/friction reaction rows did not converge';
  if (!reason && contactPower > tolerance + slipTolerance * reported.reduce((sum, r) => sum + v3Norm(r.force), 0)) reason = 'Positive passive contact power';
  return { accepted: reason === null, reason, iterations, acceleratedUpdates, linearAcceleration, angularAcceleration,
    maxNormalResidual, maxTangentResidual, maxFrictionCapExcess, minNormalAcceleration, maxContactHeightError, forceResidual, torqueResidual, contactPower, contacts: reported };
}
