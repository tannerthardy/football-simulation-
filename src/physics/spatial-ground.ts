/** Smooth, already-established finite sole contact for spatial support research.
 * Units kg, yd, s. This is deliberately not a touchdown/liftoff event driver.
 * It solves all 18 material momentum equations and sole impulses together by
 * evaluating the shared spatial-support candidate; it never applies a normal
 * in a preceding vertical solve or projects a pose afterward.
 */
import { axialLegDamping, axialLegForce } from './leg-compliance.js';
import { createMaterialPlaneCandidate, inspectMaterialPlane, type MaterialPlaneReport } from './material-plane.js';
import { projectNormalImpulse, projectTangentImpulse, solveSoleReaction,
  type SoleReactionContactReport, type TangentMobility } from './sole-contact.js';
import { evaluateSpatialSupportCandidate, newSpatialSupport, spatialSupportEnergy,
  spatialSupportEndpoints, type SpatialImpulseSet, type SpatialSupportCandidate,
  type SpatialSupportState } from './spatial-support.js';
import { rigidAttachmentInterval, rigidPointPosition, rigidPointVelocity,
  rigidAngularMomentum, v3Add as add, v3Cross as cross, v3Dot as dot, v3Norm as norm, v3Scale as scale,
  v3Sub as sub, type Vec3 } from './material-rigid.js';

export interface SpatialGroundPoint { id: string; local: Vec3; friction: number }
export interface SpatialGroundContactOptions {
  planeHeight?: number; geometryTolerance?: number; tolerance?: number;
  maxIterations?: number; maxLineSearch?: number;
  maxAngularPhase?: number;
  maxElasticPhase?: number;
  /** Known interval impulses enter the same 18D candidate as sole reactions. */
  externalImpulses?: SpatialImpulseSet;
  /** Optional complete sole geometry, including inactive airborne points.
   * Geometry only: these points do not receive contact forces. Touchdown still
   * rejects; a lifecycle driver must locate and re-solve its prefix. */
  soleGeometry?: [SpatialGroundPoint[], SpatialGroundPoint[]];
}
export interface SpatialGroundPointReport {
  foot: 0 | 1; id: string; local: Vec3; point: Vec3; impulse: Vec3; force: Vec3;
  endpointVelocity: Vec3; meanVelocity: Vec3; endpointGap: number;
  normalComplementarityResidual: number; tangentMaximumDissipationResidual: number;
  frictionCapExcess: number; instantaneousRequiredNormal: number; groundWork: number;
  instantaneousForce: Vec3; instantaneousNormalAcceleration: number;
  instantaneousNormalResidual: number; instantaneousTangentResidual: number;
  instantaneousFrictionCapExcess: number; instantaneousContactPower: number;
}
export interface SpatialGroundContactReport extends SpatialSupportCandidate {
  accepted: boolean; reason: string | null; iterations: number; residual: number;
  candidateState: SpatialSupportState; energyBefore: number; energyAfter: number;
  /** The inherited externalWork is all candidate-applied work, including
   * sole impulses. Use knownExternalWork + groundWork to separate channels;
   * do not add groundWork to externalWork a second time. */
  knownExternalWork: number;
  groundWork: number; workResidual: number; maxNormalResidual: number;
  maxTangentResidual: number; maxFrictionCapExcess: number; minEndpointGap: number;
  minInstantaneousRequiredNormal: number | null; maxInstantaneousReactionMismatch: number;
  maxAngularPhase: number; maxAngularPhaseLimit: number;
  maxElasticPhaseLimit: number;
  minInitialInstantaneousNormal: number | null; maxInitialNormalAcceleration: number;
  minEndpointNormalAcceleration: number;
  linearMomentumResidual: Vec3; angularMomentumResidual: Vec3;
  orbitalAngularMomentumBefore: Vec3; orbitalAngularMomentumAfter: Vec3; knownAngularImpulse: Vec3;
  instantaneousContactPower: number;
  maxContactNormalSpeed: number; maxSlipReversal: number;
  /** No enclosure of hidden interior events is attempted by this first scope. */
  interiorEventCertification: 'not-provided';
  candidateGeometry: {
    scope: 'fixed-candidate-path';
    status: 'not-checked' | 'enclosed' | 'unresolved' | 'penetrated';
    points: Array<{ foot: 0 | 1; id: string; report: MaterialPlaneReport }>;
  };
  contacts: SpatialGroundPointReport[];
}

const zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });
const maxAbs = (xs: number[]): number => Math.max(0, ...xs.map(Math.abs));
const finite = (v: Vec3): boolean => [v.x, v.y, v.z].every(Number.isFinite);
const materials = (s: SpatialSupportState) => [s.torso, ...s.feet] as const;

function solveLinear(matrix: number[][], rhs: number[]): number[] | null {
  const n = rhs.length, a = matrix.map((row, i) => [...row, rhs[i]]);
  const scaleMax = Math.max(1, ...matrix.flat().map(Math.abs));
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (!(Math.abs(a[pivot][col]) > 128 * Number.EPSILON * scaleMax)) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const d = a[col][col]; for (let j = col; j <= n; j++) a[col][j] /= d;
    for (let row = 0; row < n; row++) if (row !== col) {
      const f = a[row][col]; for (let j = col; j <= n; j++) a[row][j] -= f * a[col][j];
    }
  }
  const x = a.map(row => row[n]); return x.every(Number.isFinite) ? x : null;
}
function regularizedNewtonDirection(jacobian: number[][], residual: number[]): number[] | null {
  const n = residual.length, jtJ = Array.from({ length: n }, () => Array(n).fill(0) as number[]);
  const jtr = Array(n).fill(0) as number[];
  for (let row = 0; row < jacobian.length; row++) for (let i = 0; i < n; i++) {
    jtr[i] += jacobian[row][i] * residual[row];
    for (let j = 0; j < n; j++) jtJ[i][j] += jacobian[row][i] * jacobian[row][j];
  }
  const scaleMax = Math.max(1, ...jtJ.map((row, i) => Math.abs(row[i])));
  for (const ridge of [1e-14, 1e-12, 1e-10, 1e-8]) {
    const matrix = jtJ.map((row, i) => row.map((x, j) => x + (i === j ? ridge * scaleMax : 0)));
    const direction = solveLinear(matrix, jtr.map(x => -x));
    if (direction) return direction;
  }
  return null;
}
function validateContactGeometry(state: SpatialSupportState, patches: [SpatialGroundPoint[], SpatialGroundPoint[]],
  plane: number, geometryTolerance: number, tolerance: number): void {
  for (let foot = 0; foot < 2; foot++) {
    const points = patches[foot];
    if (!Array.isArray(points) || (points.length > 0 && points.length < 3) || points.some(p => !p.id || !finite(p.local)
      || !Number.isFinite(p.friction) || p.friction < 0) || new Set(points.map(p => p.id)).size !== points.length)
      throw new RangeError('Each supporting foot needs at least three uniquely identified finite sole points');
    if (points.length === 0) continue;
    const world = points.map(p => rigidPointPosition(state.feet[foot], p.local));
    if (world.some(p => Math.abs(p.z - plane) > geometryTolerance)) throw new RangeError('Ground contacts must already lie on the plane; touchdown is unsupported');
    if (points.some(p => Math.abs(rigidPointVelocity(state.feet[foot], p.local).z) > tolerance))
      throw new RangeError('Ground contacts must begin with zero normal velocity; impact or separation is unsupported');
    let area2 = 0;
    for (let i = 1; i < points.length && area2 <= geometryTolerance; i++) for (let j = i + 1; j < points.length && area2 <= geometryTolerance; j++) {
      const a = sub(world[i], world[0]), b = sub(world[j], world[0]); area2 = Math.abs(a.x * b.y - a.y * b.x);
    }
    if (!(area2 > geometryTolerance)) throw new RangeError('Sole contacts must be noncollinear in the ground plane');
  }
  if (patches[0].length === 0 && patches[1].length === 0) throw new RangeError('At least one planted sole is required');
}

function encodeEndpoints(s: SpatialSupportState): number[] {
  return spatialSupportEndpoints(s).flatMap((e, i) => [e.velocity.x, e.velocity.y, e.velocity.z,
    e.angularMomentum.x / materials(s)[i].inertia, e.angularMomentum.y / materials(s)[i].inertia,
    e.angularMomentum.z / materials(s)[i].inertia]);
}
function decodeEndpoints(before: SpatialSupportState, x: number[]) {
  return materials(before).map((b, i) => ({ velocity: { x: x[6 * i], y: x[6 * i + 1], z: x[6 * i + 2] },
    angularMomentum: { x: x[6 * i + 3] * b.inertia, y: x[6 * i + 4] * b.inertia,
      z: x[6 * i + 5] * b.inertia } })) as ReturnType<typeof spatialSupportEndpoints>;
}
function tangentMobility(footMass: number, inertia: number, r: Vec3): TangentMobility {
  return { xx: 1 / footMass + (r.y * r.y + r.z * r.z) / inertia,
    xy: -r.x * r.y / inertia, yy: 1 / footMass + (r.x * r.x + r.z * r.z) / inertia };
}
function pointMobilityNormal(footMass: number, inertia: number, r: Vec3): number {
  return 1 / footMass + (r.x * r.x + r.y * r.y) / inertia;
}
/** Solve already-grounded finite sole rows in the exact 18D material candidate.
 * Contact reactions are trial variables, not a later correction. Any rejected
 * interval returns the unchanged input while retaining its candidate report.
 */
export function advanceSpatialGroundContact(beforeInput: SpatialSupportState, h: number,
  patches: [SpatialGroundPoint[], SpatialGroundPoint[]], options: SpatialGroundContactOptions = {}):
  { state: SpatialSupportState; report: SpatialGroundContactReport } {
  const before = newSpatialSupport(beforeInput), plane = options.planeHeight ?? 0;
  const tolerance = options.tolerance ?? 2e-9, geometryTolerance = options.geometryTolerance ?? 1e-9;
  const maxIterations = options.maxIterations ?? 48, maxLineSearch = options.maxLineSearch ?? 24;
  const maxAngularPhase = options.maxAngularPhase ?? .5;
  const maxElasticPhase = options.maxElasticPhase ?? .5;
  if (!(Number.isFinite(h) && h > 0) || ![plane, tolerance, geometryTolerance, maxAngularPhase, maxElasticPhase].every(Number.isFinite)
    || !(tolerance > 0 && geometryTolerance > 0 && maxAngularPhase > 0 && maxElasticPhase > 0) || ![maxIterations, maxLineSearch].every(n => Number.isInteger(n) && n > 0))
    throw new RangeError('Finite positive interval and solver tolerances required');
  validateContactGeometry(before, patches, plane, geometryTolerance, tolerance);
  if (options.soleGeometry && (options.soleGeometry.length !== 2 || options.soleGeometry.some(points =>
    !Array.isArray(points) || points.some(p => !p.id || !finite(p.local) || !Number.isFinite(p.friction) || p.friction < 0)
    || new Set(points.map(p => p.id)).size !== points.length)))
    throw new RangeError('Optional sole geometry needs two uniquely identified finite point lists');
  const geometry = patches.map((points, foot) => {
    const byId = new Map(points.map(p => [p.id, p]));
    for (const p of options.soleGeometry?.[foot] ?? []) {
      const old = byId.get(p.id);
      if (old && (old.local.x !== p.local.x || old.local.y !== p.local.y || old.local.z !== p.local.z))
        throw new RangeError('A sole point identity must refer to the same material geometry');
      byId.set(p.id, p);
    }
    return [...byId.values()];
  });
  if (options.externalImpulses && options.externalImpulses.length !== 3) throw new RangeError('Three material-body impulse slots required');
  const known: SpatialImpulseSet = options.externalImpulses ? options.externalImpulses.map(load => ({
    center: load.center && { ...load.center }, couple: load.couple && { ...load.couple },
    points: load.points?.map(p => ({ ...p, local: { ...p.local }, impulse: { ...p.impulse } })),
  })) as SpatialImpulseSet : [{}, {}, {}];
  const contacts = patches.flatMap((points, foot) => points.map(p => ({ foot: foot as 0 | 1, ...p })));
  if (known.some(load => load.points?.some(p => p.id.startsWith('sole:'))))
    throw new RangeError('The sole: point-impulse namespace is reserved for physical ground rows');
  const dimensions = 18 + 3 * contacts.length;
  const buildLoads = (x: number[]): SpatialImpulseSet => {
    const loads: SpatialImpulseSet = known.map(load => ({ center: load.center && { ...load.center },
      couple: load.couple && { ...load.couple }, points: load.points?.map(p => ({ ...p, local: { ...p.local }, impulse: { ...p.impulse } })) })) as SpatialImpulseSet;
    contacts.forEach((p, i) => {
      const impulse = { x: x[18 + 3 * i], y: x[19 + 3 * i], z: x[20 + 3 * i] };
      const points = loads[p.foot + 1].points ?? [];
      points.push({ id: `sole:${p.id}`, local: { ...p.local }, impulse }); loads[p.foot + 1].points = points;
    });
    return loads;
  };
  const reactionAt = (s: SpatialSupportState, foot: 0 | 1) => {
    const body = s.feet[foot], leg = s.legs[foot], hip = rigidPointPosition(s.torso, leg.hip), ankle = rigidPointPosition(body, leg.ankle);
    const d = sub(ankle, hip), length = norm(d), direction = scale(d, 1 / length);
    const relative = sub(rigidPointVelocity(body, leg.ankle), rigidPointVelocity(s.torso, leg.hip));
    const legForce = scale(direction, axialLegForce(length, leg.compliance) + axialLegDamping(dot(relative, direction), leg.compliance));
    const knownBody = known[foot + 1];
    return solveSoleReaction(body, patches[foot].map(p => ({ ...p })), {
      planeHeight: plane, geometryTolerance: Math.max(geometryTolerance, 10 * tolerance),
      tolerance: Math.max(tolerance, 1e-8), slipTolerance: Math.max(tolerance, 1e-7),
      bodyForce: add(scale(s.gravity, body.mass), scale(knownBody.center ?? zero(), 1 / h)),
      bodyCouple: scale(knownBody.couple ?? zero(), 1 / h),
      pointForces: [{ local: leg.ankle, force: legForce }, ...(knownBody.points ?? []).map(p => ({ local: p.local, force: scale(p.impulse, 1 / h) }))],
    });
  };
  // Seed the coupled solve at the physical force-level reaction of the
  // already-resting state. Starting all normal impulses at zero puts a
  // multi-patch stance exactly at the cone apex, where the nonsmooth
  // complementarity Jacobian can be singular or give a useless line-search
  // direction for low-inertia feet. This is only an initial guess: the same
  // 18D/contact residuals and unregularized final checks still decide the solve.
  const initialReactions = [0, 1].map(foot => patches[foot].length ? reactionAt(before, foot as 0 | 1) : null);
  const warmImpulse = new Map<string, Vec3>();
  for (let foot = 0; foot < 2; foot++) {
    const reaction = initialReactions[foot];
    if (!reaction?.accepted) continue;
    for (const row of reaction.contacts) warmImpulse.set(`${foot}:${row.id}`, scale(row.force, h));
  }
  const initial = [...encodeEndpoints(before), ...contacts.flatMap(c => {
    const j = warmImpulse.get(`${c.foot}:${c.id}`) ?? zero(); return [j.x, j.y, j.z];
  })];
  type Evaluation = { candidate: SpatialSupportCandidate; residual: number[]; normal: number[]; tangent: number[]; cap: number[]; gaps: number[]; pointMean: Vec3[] };
  const evaluate = (x: number[]): Evaluation | null => {
    try {
      const candidate = evaluateSpatialSupportCandidate(before, h, decodeEndpoints(before, x), buildLoads(x), geometryTolerance);
      const normal: number[] = [], tangent: number[] = [], cap: number[] = [], gaps: number[] = [], pointMean: Vec3[] = [];
      const residual = [...candidate.normalizedResidual];
      for (let i = 0; i < contacts.length; i++) {
        const c = contacts[i], bodyBefore = before.feet[c.foot], bodyAfter = candidate.state.feet[c.foot];
        const attachment = rigidAttachmentInterval(bodyBefore, bodyAfter, h, c.local);
        const gap = rigidPointPosition(bodyAfter, c.local).z - plane, gapRate = gap / h;
        const r = attachment.midpointOffset, mobility = tangentMobility(bodyBefore.mass, bodyBefore.inertia, r);
        const normalResponse = pointMobilityNormal(bodyBefore.mass, bodyBefore.inertia, r);
        const jx = x[18 + 3 * i], jy = x[19 + 3 * i], jn = x[20 + 3 * i];
        const positiveJn = Math.max(0, jn), projectedNormal = projectNormalImpulse(positiveJn, gapRate, normalResponse);
        const nt = (jn - projectedNormal) * normalResponse;
        const free = { x: attachment.meanVelocity.x - mobility.xx * jx - mobility.xy * jy,
          y: attachment.meanVelocity.y - mobility.xy * jx - mobility.yy * jy };
        const projectedTangent = projectTangentImpulse(free, mobility, positiveJn, c.friction);
        const tx = mobility.xx * (jx - projectedTangent.x) + mobility.xy * (jy - projectedTangent.y);
        const ty = mobility.xy * (jx - projectedTangent.x) + mobility.yy * (jy - projectedTangent.y);
        residual.push(nt, tx, ty); normal.push(nt); tangent.push(Math.hypot(tx, ty));
        cap.push(Math.max(0, Math.hypot(jx, jy) - c.friction * positiveJn)); gaps.push(gap); pointMean.push(attachment.meanVelocity);
      }
      return { candidate, residual, normal, tangent, cap, gaps, pointMean };
    } catch (error) { if (error instanceof RangeError) return null; throw error; }
  };
  const residualNorm = (r: number[]): number => maxAbs(r);
  let x = initial, current = evaluate(x), reason: string | null = current ? null : 'Initial contact candidate lies outside material geometry';
  let iterations = 0;
  if (!current) {
    // Gravity-only endpoint seed; no contact impulse is applied outside the solve.
    const seed = encodeEndpoints(before), bodies = materials(before);
    for (let i = 0; i < 3; i++) {
      seed[6 * i] += before.gravity.x * h; seed[6 * i + 1] += before.gravity.y * h; seed[6 * i + 2] += before.gravity.z * h;
      for (let k = 0; k < 3; k++) seed[6 * i + 3 + k] += 0 / bodies[i].inertia;
    }
    x = [...seed, ...contacts.flatMap(() => [0, 0, 0])]; current = evaluate(x);
    if (!current) reason = 'No valid material candidate seed'; else reason = null;
  }
  for (; current && !reason && iterations < maxIterations; iterations++) {
    const baseNorm = residualNorm(current.residual);
    if (baseNorm <= tolerance) break;
    const jac = Array.from({ length: dimensions }, () => Array(dimensions).fill(0) as number[]);
    let failed = false;
    for (let col = 0; col < dimensions; col++) {
      const epsilon = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(x[col]));
      const plus = [...x], minus = [...x]; plus[col] += epsilon; minus[col] -= epsilon;
      const ep = evaluate(plus), em = evaluate(minus);
      if (!ep && !em) { failed = true; break; }
      for (let row = 0; row < dimensions; row++) jac[row][col] = ep && em
        ? (ep.residual[row] - em.residual[row]) / (2 * epsilon)
        : ep ? (ep.residual[row] - current.residual[row]) / epsilon : (current.residual[row] - em!.residual[row]) / epsilon;
    }
    if (failed) { reason = 'Local material geometry prevents contact Jacobian; subdivide the interval'; break; }
    const delta = solveLinear(jac, current.residual.map(v => -v)) ?? regularizedNewtonDirection(jac, current.residual);
    if (!delta) { reason = 'Rank-deficient coupled contact Jacobian; subdivide the interval'; break; }
    let accepted = false, alpha = 1;
    for (let line = 0; line < maxLineSearch; line++) {
      const nextX = x.map((v, i) => v + alpha * delta[i]), next = evaluate(nextX);
      if (next && residualNorm(next.residual) < baseNorm) { x = nextX; current = next; accepted = true; break; }
      alpha *= .5;
    }
    if (!accepted) { reason = 'Contact Newton line search failed; subdivide the interval'; break; }
  }
  if (current && !reason && residualNorm(current.residual) > tolerance) reason = 'Coupled contact iteration limit';
  // A finite endpoint position row alone can hide a positive-average plant
  // after its actual physical reaction has changed sign. Reconstruct the
  // continuous required sole force from endpoint leg, gravity, friction and
  // centripetal forces; negative held reaction is an unsupported release event.
  const candidate = current?.candidate ?? evaluate(initial)?.candidate
    ?? evaluateSpatialSupportCandidate(before, h, spatialSupportEndpoints(before), known, geometryTolerance);
  if (candidate.maxAngularPhase > maxAngularPhase && !reason) reason = 'Spatial angular phase exceeds the local interval limit; subdivide the physical interval';
  if (candidate.maxElasticPhase > maxElasticPhase && !reason) reason = 'Axial leg elastic phase exceeds the local interval limit; subdivide the physical interval';
  const initialRows = initialReactions.flatMap(r => r?.contacts ?? []);
  if (initialReactions.some(r => r && !r.accepted) && !reason)
    reason = `Initial sole reaction is unsupported: ${initialReactions.find(r => r && !r.accepted)?.reason}`;
  if (initialRows.some(r => r.force.z <= tolerance && r.acceleration.z > tolerance) && !reason)
    reason = 'Initial sole has zero normal reaction and outward acceleration; liftoff event is unsupported';
  const pointRows: SpatialGroundPointReport[] = [];
  let minInstantaneous = Infinity, maxReactionMismatch = 0, maxNormalSpeed = 0, maxSlipReversal = 0;
  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i], b = candidate.state.feet[c.foot], b0 = before.feet[c.foot], j = current ? {
      x: x[18 + 3 * i], y: x[19 + 3 * i], z: x[20 + 3 * i],
    } : zero();
    const point = rigidPointPosition(b, c.local), endpointVelocity = rigidPointVelocity(b, c.local);
    const attachment = rigidAttachmentInterval(b0, b, h, c.local), force = scale(j, 1 / h);
    maxNormalSpeed = Math.max(maxNormalSpeed, Math.abs(endpointVelocity.z));
    const v0 = rigidPointVelocity(b0, c.local), v1 = endpointVelocity;
    const initialTangentSpeed = Math.hypot(v0.x, v0.y), finalTangentSpeed = Math.hypot(v1.x, v1.y);
    if (initialTangentSpeed > tolerance && v0.x * v1.x + v0.y * v1.y < -tolerance * initialTangentSpeed) maxSlipReversal = Math.max(maxSlipReversal, finalTangentSpeed);
    const groundWork = current?.candidate.external.filter(e => e.body === c.foot + 1 && e.id === `sole:${c.id}`).reduce((sum, e) => sum + e.work, 0) ?? 0;
    pointRows.push({ foot: c.foot, id: c.id, local: { ...c.local }, point, impulse: j, force, endpointVelocity,
      meanVelocity: attachment.meanVelocity, endpointGap: point.z - plane,
      normalComplementarityResidual: current?.normal[i] ?? Infinity,
      tangentMaximumDissipationResidual: current?.tangent[i] ?? Infinity,
      frictionCapExcess: current?.cap[i] ?? Infinity, instantaneousRequiredNormal: 0,
      instantaneousForce: zero(), instantaneousNormalAcceleration: 0,
      instantaneousNormalResidual: Infinity, instantaneousTangentResidual: Infinity,
      instantaneousFrictionCapExcess: Infinity, instantaneousContactPower: 0, groundWork });
  }
  for (let foot = 0; foot < 2; foot++) {
    const indices = contacts.map((c, i) => c.foot === foot ? i : -1).filter(i => i >= 0);
    if (indices.length === 0) continue;
    const reaction = reactionAt(candidate.state, foot as 0 | 1);
    if (!reaction.accepted && !reason) reason = `Instantaneous endpoint sole reaction is unsupported: ${reaction.reason}`;
    const byId = new Map<string, SoleReactionContactReport>(reaction.contacts.map(r => [r.id, r]));
    for (const i of indices) {
      const row = pointRows[i], instant = byId.get(row.id);
      if (!instant) { if (!reason) reason = 'Instantaneous reaction omitted a sole row'; continue; }
      row.instantaneousForce = instant.force; row.instantaneousRequiredNormal = instant.force.z;
      row.instantaneousNormalAcceleration = instant.acceleration.z; row.instantaneousNormalResidual = instant.normalResidual;
      row.instantaneousTangentResidual = instant.tangentResidual; row.instantaneousFrictionCapExcess = instant.frictionCapExcess;
      row.instantaneousContactPower = instant.power;
      minInstantaneous = Math.min(minInstantaneous, instant.force.z);
      maxReactionMismatch = Math.max(maxReactionMismatch, Math.abs(instant.force.z - row.force.z));
      if (row.impulse.z > tolerance && instant.force.z < -tolerance && !reason)
        reason = 'Held sole requires negative instantaneous normal reaction; split at release event';
      if (row.impulse.z > tolerance && instant.force.z <= tolerance && instant.acceleration.z > tolerance && !reason)
        reason = 'Held sole has zero endpoint normal reaction with outward acceleration; split at liftoff event';
    }
  }
  if (maxSlipReversal > tolerance && !reason) reason = 'Sole sliding direction reverses inside interval; split at friction stop';
  if (pointRows.some(p => p.endpointGap < -geometryTolerance) && !reason) reason = 'Sole penetrates plane; unsupported contact event';
  if (pointRows.some(p => p.impulse.z < -tolerance) && !reason) reason = 'Negative sole normal impulse';
  const energyBefore = spatialSupportEnergy(before), energyAfter = spatialSupportEnergy(candidate.state);
  const groundWork = pointRows.reduce((sum, p) => sum + p.groundWork, 0);
  const knownExternalWork = candidate.externalWork - groundWork;
  const instantaneousContactPower = pointRows.reduce((sum, p) => sum + p.instantaneousContactPower, 0);
  const instantaneousPowerTolerance = Math.max(tolerance, 1e-7 * pointRows.reduce((sum, p) => sum + norm(p.instantaneousForce), 0));
  const minInitialInstantaneousNormal = initialRows.length ? Math.min(...initialRows.map(r => r.force.z)) : null;
  const maxInitialNormalAcceleration = initialRows.length ? Math.max(...initialRows.map(r => r.acceleration.z)) : 0;
  const minEndpointNormalAcceleration = pointRows.length ? Math.min(...pointRows.map(p => p.instantaneousNormalAcceleration)) : 0;
  const workResidual = energyAfter.total - energyBefore.total - candidate.externalWork - candidate.dampingWork;
  const beforeBodies = materials(before), afterBodies = materials(candidate.state);
  const totalLinearMomentum = (bodies: readonly ReturnType<typeof materials>[number][]) => bodies.reduce((sum, b) => add(sum, scale(b.velocity, b.mass)), zero());
  const totalAngularMomentum = (bodies: readonly ReturnType<typeof materials>[number][]) => bodies.reduce((sum, b) => add(sum, rigidAngularMomentum(b)), zero());
  const linearMomentumResidual = sub(sub(totalLinearMomentum(afterBodies), totalLinearMomentum(beforeBodies)), candidate.knownLinearImpulse);
  const orbitalAngularMomentumBefore = totalAngularMomentum(beforeBodies), orbitalAngularMomentumAfter = totalAngularMomentum(afterBodies);
  const angularMomentumResidual = sub(sub(orbitalAngularMomentumAfter, orbitalAngularMomentumBefore), candidate.knownAngularImpulse);
  if (!reason && (Math.abs(workResidual) > 1e-7 || groundWork > tolerance || instantaneousContactPower > instantaneousPowerTolerance
    || candidate.dampingWork > tolerance || candidate.legs.some(l => Math.abs(l.springWorkResidual) > 1e-7))) reason = 'Ground/support energy or passivity ledger failed';
  const maxNormalResidual = maxAbs(current?.normal ?? []), maxTangentResidual = maxAbs(current?.tangent ?? []), maxFrictionCapExcess = maxAbs(current?.cap ?? []);
  if (current && !reason && (maxNormalResidual > tolerance || maxTangentResidual > tolerance || maxFrictionCapExcess > tolerance))
    reason = 'Coupled contact complementarity/friction rows did not converge';
  const candidateGeometry: SpatialGroundContactReport['candidateGeometry'] = {
    scope: 'fixed-candidate-path', status: 'not-checked', points: [],
  };
  if (!reason) {
    candidateGeometry.status = 'enclosed';
    for (let foot = 0; foot < 2; foot++) for (const p of geometry[foot]) {
      const path = createMaterialPlaneCandidate(before.feet[foot], candidate.state.feet[foot], h, p.local,
        { normal: { x: 0, y: 0, z: 1 }, height: plane });
      const report = inspectMaterialPlane(path, { gapTolerance: geometryTolerance });
      candidateGeometry.points.push({ foot: foot as 0 | 1, id: p.id, report });
      if (report.penetrationBeyondTolerance.certain) {
        candidateGeometry.status = 'penetrated';
        reason = `Sole ${foot}:${p.id} crosses the plane inside the candidate; touchdown or contact transition is unsupported`;
      } else if (report.penetrationBeyondTolerance.possible && candidateGeometry.status !== 'penetrated') {
        candidateGeometry.status = 'unresolved';
        reason = `Sole ${foot}:${p.id} interior candidate clearance is unresolved; subdivide and re-solve`;
      }
    }
  }
  const accepted = reason === null;
  const resultCandidate = current?.candidate ?? candidate;
  return { state: accepted ? newSpatialSupport(candidate.state) : before,
    report: { ...resultCandidate, state: newSpatialSupport(candidate.state), candidateState: newSpatialSupport(candidate.state),
      accepted, reason, iterations, residual: current ? residualNorm(current.residual) : Infinity,
      energyBefore: energyBefore.total, energyAfter: energyAfter.total, knownExternalWork, groundWork, workResidual,
      maxNormalResidual, maxTangentResidual, maxFrictionCapExcess,
      linearMomentumResidual, angularMomentumResidual, orbitalAngularMomentumBefore, orbitalAngularMomentumAfter,
      knownAngularImpulse: current?.candidate.knownAngularImpulse ?? zero(),
      instantaneousContactPower,
      minEndpointGap: Math.min(...pointRows.map(p => p.endpointGap)),
      minInstantaneousRequiredNormal: Number.isFinite(minInstantaneous) ? minInstantaneous : null,
      minInitialInstantaneousNormal, maxInitialNormalAcceleration, minEndpointNormalAcceleration,
      maxInstantaneousReactionMismatch: maxReactionMismatch, maxContactNormalSpeed: maxNormalSpeed,
      maxSlipReversal, maxAngularPhase: candidate.maxAngularPhase, maxAngularPhaseLimit: maxAngularPhase,
      maxElasticPhaseLimit: maxElasticPhase,
      interiorEventCertification: 'not-provided', candidateGeometry, contacts: pointRows } };
}
