/** Independent mechanics for the normal-compliance research kernel.
 * Run with Node 22 from the repository root. No World or football calibration.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceVersion } from '../source-version.js';
import { advanceSpatialSoleCompliance, type CompliantSoleMaterial } from '../../src/physics/spatial-sole-compliance.js';
import type { SpatialSupportState, SpatialImpulseSet } from '../../src/physics/spatial-support.js';
import type { MaterialRigidState, Vec3 } from '../../src/physics/material-rigid.js';

if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Run with pinned Node 22');
if (process.argv.length > 3 || process.argv[2]?.startsWith('--')) throw new Error('Specify at most one output path');
const output = process.argv[2] ?? 'out/compliant-sole-stress.json';
const scriptPath = fileURLToPath(import.meta.url);
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const sourceSha256Start = sourceVersion(), scriptSha256Start = sha(readFileSync(scriptPath));
const zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mul = (a: Vec3, t: number): Vec3 => ({ x: a.x * t, y: a.y * t, z: a.z * t });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const mean = (a: Vec3, b: Vec3): Vec3 => mul(add(a, b), .5);
const bodies = (s: SpatialSupportState): MaterialRigidState[] => [s.torso, ...s.feet];
const offset = (b: MaterialRigidState, r: Vec3): Vec3 => add(add(mul(b.basis[0], r.x), mul(b.basis[1], r.y)), mul(b.basis[2], r.z));
const point = (b: MaterialRigidState, r: Vec3): Vec3 => add(b.position, offset(b, r));
const linear = (s: SpatialSupportState): Vec3 => bodies(s).reduce((a, b) => add(a, mul(b.velocity, b.mass)), zero());
const angular = (s: SpatialSupportState): Vec3 => bodies(s).reduce((a, b) => add(a, add(cross(b.position, mul(b.velocity, b.mass)), b.angularMomentum)), zero());
const identity = (): MaterialRigidState['basis'] => [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }];
const body = (mass: number, inertia: number, position: Vec3): MaterialRigidState => ({ mass, inertia, position, velocity: zero(), angularMomentum: zero(), basis: identity() });
const disabled = () => ({ restLength: 1, stiffness: 1, forceCap: 0, damping: 0, dampingCap: 0 });
function legPotential(length: number, c: SpatialSupportState['legs'][0]['compliance']): number {
  const q = Math.max(0, c.restLength - length), elastic = Math.min(q, c.forceCap / c.stiffness);
  return .5 * c.stiffness * elastic ** 2 + c.forceCap * (q - elastic);
}
function energy(s: SpatialSupportState, mat: CompliantSoleMaterial): number {
  let e = bodies(s).reduce((sum, b) => sum + .5 * b.mass * dot(b.velocity, b.velocity)
    + .5 * dot(b.angularMomentum, b.angularMomentum) / b.inertia - b.mass * dot(s.gravity, b.position), 0);
  s.legs.forEach((l, i) => { e += legPotential(norm(sub(point(s.feet[i], l.ankle), point(s.torso, l.hip))), l.compliance); });
  mat.points.forEach((pts, i) => pts.forEach(p => {
    const d = Math.max(0, (mat.planeHeight ?? 0) - point(s.feet[i], p.local).z);
    e += .5 * mat.stiffness[i] * p.areaWeight * d * d;
  }));
  return e;
}
interface Audit { work: number; linear: number; angular: number; bodyLinear: number; bodyAngular: number;
  damping: number; minNormal: number; soleSpringClosure: number; normalImpulse: number; compression: number }
/** Uses returned states and independently reconstructed physical laws only.
 * No engine report force, potential, work, residual or accepted flag is an oracle.
 */
function audit(before: SpatialSupportState, after: SpatialSupportState, h: number, mat: CompliantSoleMaterial,
  loads: SpatialImpulseSet): Audit {
  const bs = bodies(before), ns = bodies(after), impulse = bs.map(b => mul(before.gravity, h * b.mass)), torque = bs.map(() => zero());
  let knownJ = zero(), knownL = zero(), knownWork = 0, damping = 0, minNormal = Infinity, soleSpringClosure = 0, normalImpulse = 0, compression = 0;
  bs.forEach((b, i) => {
    knownJ = add(knownJ, impulse[i]); knownL = add(knownL, cross(mean(b.position, ns[i].position), impulse[i]));
    const center = loads[i].center ?? zero(), couple = loads[i].couple ?? zero();
    impulse[i] = add(impulse[i], center); torque[i] = add(torque[i], couple);
    knownJ = add(knownJ, center); knownL = add(knownL, add(cross(mean(b.position, ns[i].position), center), couple));
    knownWork += dot(center, mul(sub(ns[i].position, b.position), 1 / h))
      + dot(couple, mul(add(b.angularMomentum, ns[i].angularMomentum), .5 / b.inertia));
    for (const p of loads[i].points ?? []) {
      const p0 = point(b, p.local), p1 = point(ns[i], p.local), lever = mean(offset(b, p.local), offset(ns[i], p.local));
      impulse[i] = add(impulse[i], p.impulse); torque[i] = add(torque[i], cross(lever, p.impulse));
      knownJ = add(knownJ, p.impulse); knownL = add(knownL, cross(mean(p0, p1), p.impulse));
      knownWork += dot(p.impulse, mul(sub(p1, p0), 1 / h));
    }
  });
  before.legs.forEach((l, i) => {
    const a0 = point(before.feet[i], l.ankle), a1 = point(after.feet[i], l.ankle), h0 = point(before.torso, l.hip), h1 = point(after.torso, l.hip);
    const d0 = sub(a0, h0), d1 = sub(a1, h1), ell0 = norm(d0), ell1 = norm(d1), c = l.compliance;
    // Integrate the independently declared capped force law; a midpoint is exact
    // within either linear or saturated branch, avoiding cancellation at tiny dℓ.
    const q0 = Math.max(0, c.restLength - ell0), q1 = Math.max(0, c.restLength - ell1), cap = c.forceCap / c.stiffness;
    const spring = ell0 === ell1 ? Math.min(c.forceCap, c.stiffness * q0)
      : ell0 >= c.restLength && ell1 >= c.restLength ? 0
      : q0 <= cap && q1 <= cap && ell0 <= c.restLength && ell1 <= c.restLength ? c.stiffness * (q0 + q1) / 2
      : q0 >= cap && q1 >= cap ? c.forceCap : -(legPotential(ell1, c) - legPotential(ell0, c)) / (ell1 - ell0);
    const rate = (ell1 - ell0) / h, damper = -Math.max(-c.dampingCap, Math.min(c.dampingCap, c.damping * rate));
    const j = mul(add(d0, d1), h * (spring + damper) / (ell0 + ell1));
    impulse[0] = sub(impulse[0], j); impulse[i + 1] = add(impulse[i + 1], j);
    torque[0] = sub(torque[0], cross(mean(offset(before.torso, l.hip), offset(after.torso, l.hip)), j));
    torque[i + 1] = add(torque[i + 1], cross(mean(offset(before.feet[i], l.ankle), offset(after.feet[i], l.ankle)), j));
    damping += damper * (ell1 - ell0);
  });
  mat.points.forEach((pts, i) => pts.forEach(p => {
    const p0 = point(before.feet[i], p.local), p1 = point(after.feet[i], p.local), g0 = p0.z - (mat.planeHeight ?? 0), g1 = p1.z - (mat.planeHeight ?? 0);
    const d0 = Math.max(0, -g0), d1 = Math.max(0, -g1), k = mat.stiffness[i] * p.areaWeight, c = mat.damping[i] * p.areaWeight;
    const u0 = .5 * k * d0 * d0, u1 = .5 * k * d1 * d1;
    const spring = g0 <= 0 && g1 <= 0 ? k * (d0 + d1) / 2 : g0 >= 0 && g1 >= 0 ? 0 : -(u1 - u0) / (g1 - g0);
    const closing = Math.max(0, -(g1 - g0) / h), damper = g0 <= 0 && g1 <= 0 ? c * closing : 0;
    const j = { x: 0, y: 0, z: h * (spring + damper) }, lever = mean(offset(before.feet[i], p.local), offset(after.feet[i], p.local));
    impulse[i + 1] = add(impulse[i + 1], j); torque[i + 1] = add(torque[i + 1], cross(lever, j));
    knownJ = add(knownJ, j); knownL = add(knownL, cross(mean(p0, p1), j));
    damping += damper * (g1 - g0); minNormal = Math.min(minNormal, spring + damper);
    soleSpringClosure = Math.max(soleSpringClosure, Math.abs(spring * (g1 - g0) + u1 - u0));
    normalImpulse += j.z; compression = Math.max(compression, d0, d1);
  }));
  return { work: Math.abs(energy(after, mat) - energy(before, mat) - knownWork - damping),
    linear: norm(sub(sub(linear(after), linear(before)), knownJ)), angular: norm(sub(sub(angular(after), angular(before)), knownL)),
    bodyLinear: Math.max(...bs.map((b, i) => norm(sub(mul(sub(ns[i].velocity, b.velocity), b.mass), impulse[i])))),
    bodyAngular: Math.max(...bs.map((b, i) => norm(sub(sub(ns[i].angularMomentum, b.angularMomentum), torque[i])))),
    damping, minNormal, soleSpringClosure, normalImpulse, compression };
}
const violations: unknown[] = [], rejections: unknown[] = [];
const maxAudit = { work: 0, linear: 0, angular: 0, bodyLinear: 0, bodyAngular: 0, soleSpringClosure: 0 };
let intervals = 0;
function checkedStep(s: SpatialSupportState, h: number, mat: CompliantSoleMaterial, loads: SpatialImpulseSet, label: string) {
  const r = advanceSpatialSoleCompliance(s, h, mat, { externalImpulses: loads }); intervals++;
  if (!r.report.accepted) { rejections.push({ label, h, before: s, mat, loads, reason: r.report.reason, report: r.report }); return null; }
  const a = audit(s, r.state, h, mat, loads);
  for (const k of Object.keys(maxAudit) as Array<keyof typeof maxAudit>) maxAudit[k] = Math.max(maxAudit[k], a[k]);
  if (Math.max(a.work, a.linear, a.angular, a.bodyLinear, a.bodyAngular, a.soleSpringClosure) > 1e-7 || a.damping > 1e-12 || a.minNormal < 0)
    violations.push({ label, h, before: s, after: r.state, mat, loads, audit: a });
  return { state: r.state, audit: a, iterations: r.report.iterations };
}
const stateError = (a: SpatialSupportState, b: SpatialSupportState): number => Math.max(...bodies(a).flatMap((p, i) => {
  const q = bodies(b)[i]; return [norm(sub(p.position, q.position)), norm(sub(p.velocity, q.velocity)),
    norm(sub(p.angularMomentum, q.angularMomentum)), ...p.basis.map((axis, j) => norm(sub(axis, q.basis[j])))];
}));
const dose = (f: SpatialImpulseSet, h: number): SpatialImpulseSet => f.map(p => ({
  ...(p.center ? { center: mul(p.center, h) } : {}), ...(p.couple ? { couple: mul(p.couple, h) } : {}),
  ...(p.points ? { points: p.points.map(q => ({ ...q, impulse: mul(q.impulse, h) })) } : {}) })) as SpatialImpulseSet;

// Planar continuous compliant ODE, independent of midpoint/Cayley and reports.
// z, vz and theta, omega are ordinary generalized coordinates; no projection.
type Planar = [number, number, number, number];
const N0 = 6 / 1.09, Ndot0 = ((-2.4 + 1.2 * N0) * 1.09 + 7.2) / 1.09 ** 2;
const rx = (theta: number) => .3 * Math.cos(theta) - Math.sin(theta);
const rz = (theta: number) => -.3 * Math.sin(theta) - Math.cos(theta);
function prepared(K: number, C: number): Planar { return [1 - N0 / K + C * Ndot0 / K ** 2, .6 - Ndot0 / K, 0, 2]; }
function planarRate(s: Planar, K: number, C: number): Planar {
  const gap = s[0] + rz(s[2]), gapRate = s[1] - rx(s[2]) * s[3];
  const N = gap < 0 ? K * -gap + C * Math.max(0, -gapRate) : 0;
  return [s[1], N - 10, s[3], -rx(s[2]) * N];
}
function rk4(s: Planar, h: number, K: number, C: number): Planar {
  return integratePlanar(s, h, q => planarRate(q, K, C));
}
function integratePlanar(s: Planar, h: number, rate: (q: Planar) => Planar): Planar {
  const shift = (a: Planar, b: Planar, t: number): Planar => a.map((x, i) => x + t * b[i]) as Planar;
  const a = rate(s), b = rate(shift(s, a, h / 2)), c = rate(shift(s, b, h / 2)), d = rate(shift(s, c, h));
  return s.map((x, i) => x + h * (a[i] + 2 * b[i] + 2 * c[i] + d[i]) / 6) as Planar;
}
function odeReference(K: number, C: number, h: number) {
  let s = prepared(K, C), minGap = s[0] + rz(s[2]), maxGap = minGap, maxGapRate = Math.abs(s[1] - rx(s[2]) * s[3]);
  const steps = Math.round(.2 / h), actualH = .2 / steps;
  for (let i = 0; i < steps; i++) {
    s = rk4(s, actualH, K, C); const gap = s[0] + rz(s[2]);
    minGap = Math.min(minGap, gap); maxGap = Math.max(maxGap, gap); maxGapRate = Math.max(maxGapRate, Math.abs(s[1] - rx(s[2]) * s[3]));
  }
  return { h: actualH, steps, endpoint: s, minGap, maxGap, maxGapRate };
}
function pivotFixture(K: number, C: number) {
  const q = prepared(K, C), foot = body(1, 1, { x: 0, y: 0, z: q[0] }); foot.velocity.z = q[1]; foot.angularMomentum.y = 2;
  const initial: SpatialSupportState = { torso: body(1, 1, { x: 0, y: 0, z: 10 }), feet: [foot, body(1, 1, { x: 3, y: 0, z: 3 })],
    legs: [0, 1].map(() => ({ hip: zero(), ankle: zero(), compliance: disabled() })) as SpatialSupportState['legs'], gravity: { x: 0, y: 0, z: -10 } };
  const mat: CompliantSoleMaterial = { points: [[{ id: 'toe', local: { x: .3, y: 0, z: -1 }, areaWeight: 1 }],
    [{ id: 'free', local: zero(), areaWeight: 1 }]], stiffness: [K, K], damping: [C, C] };
  return { initial, mat };
}
const rigidReferencePath = 'data/reviews/physics-world/contact-events/pivot-reference.json';
const rigidBytes = readFileSync(rigidReferencePath), rigidReference = JSON.parse(rigidBytes.toString()) as {
  input: { mass: number; inertia: number; horizon: number }; rows: Array<{ endpoint: { theta: number; omega: number; comPosition: Vec3; comVelocity: Vec3 }; quadrature: { normalImpulse: number } }> };
if (rigidReference.input.mass !== 1 || rigidReference.input.inertia !== 1 || rigidReference.input.horizon !== .2) throw new Error('Rigid pivot reference fixture changed');
const target = rigidReference.rows.at(-1)!, targetVector: Planar = [target.endpoint.comPosition.z, target.endpoint.comVelocity.z, target.endpoint.theta, target.endpoint.omega];
const vectorError = (a: Planar, b: Planar): number => Math.max(...a.map((x, i) => Math.abs(x - b[i])));
const pivots = [250, 1000, 4000, 16000].flatMap(K => [0, 10].map(C => {
  const coarseReference = odeReference(K, C, .000125 * Math.sqrt(250 / K));
  const reference = odeReference(K, C, .0000625 * Math.sqrt(250 / K));
  const rows = [.002, .001, .0005].map(h => {
    const { initial, mat } = pivotFixture(K, C); let s = initial, normalImpulse = 0, maxCompression = 0, iterations = 0, completed = true;
    for (let i = 0; i < Math.round(.2 / h); i++) {
      const next = checkedStep(s, h, mat, [{}, {}, {}], `pivot/K${K}/C${C}/h${h}/step${i}`);
      if (!next) { completed = false; break; } s = next.state; normalImpulse += next.audit.normalImpulse; maxCompression = Math.max(maxCompression, next.audit.compression); iterations += next.iterations;
    }
    const b = s.feet[0], theta = Math.atan2(-b.basis[0].z, b.basis[0].x), endpoint: Planar = [b.position.z, b.velocity.z, theta, b.angularMomentum.y];
    const gap = point(b, mat.points[0][0].local).z, normalVelocity = b.velocity.z - rx(theta) * b.angularMomentum.y;
    return { h, completed, endpoint, gap, normalVelocity, maxCompression, normalImpulse, iterations,
      continuumError: vectorError(endpoint, reference.endpoint), rigidError: vectorError(endpoint, targetVector),
      rigidNormalImpulseError: Math.abs(normalImpulse - target.quadrature.normalImpulse) };
  });
  return { K, C, units: 'kg, yd, s; K=force/yd; C=force*s/yd', initial: prepared(K, C), reference,
    referenceRefinementDifference: vectorError(coarseReference.endpoint, reference.endpoint),
    continuumRigidDifference: vectorError(reference.endpoint, targetVector), rows,
    refinementRatios: rows.slice(0, -1).map((r, i) => r.continuumError / rows[i + 1].continuumError) };
}));

// Two weighted heel/toe points on a small foot. Its freely pitching finite
// inertia receives a known central load; neither point is immobilized. This
// reference includes both point normals and their actual rotating moment arms.
const rockingInput = { mass: 2, inertia: .008, localPoints: [{ x: -.08, y: 0, z: -.04 }, { x: .08, y: 0, z: -.04 }],
  weights: [.5, .5], normalDemand: 500, gravity: 10, knownDownwardForce: 480, theta: .005, omega: .8, horizon: .04 };
function rockingRate(q: Planar, K: number, C: number): Planar {
  let normal = 0, spinTorque = 0;
  rockingInput.localPoints.forEach((p, i) => {
    const x = p.x * Math.cos(q[2]) + p.z * Math.sin(q[2]), z = -p.x * Math.sin(q[2]) + p.z * Math.cos(q[2]);
    const gap = q[0] + z, gapRate = q[1] - x * q[3];
    const N = gap < 0 ? rockingInput.weights[i] * (K * -gap + C * Math.max(0, -gapRate)) : 0;
    normal += N; spinTorque -= x * N;
  });
  return [q[1], (normal - rockingInput.knownDownwardForce) / rockingInput.mass - rockingInput.gravity,
    q[3], spinTorque / rockingInput.inertia];
}
function rockingReference(K: number, C: number, h: number) {
  let q: Planar = [.04 - rockingInput.normalDemand / K, 0, rockingInput.theta, rockingInput.omega], maxGap = -Infinity;
  const steps = Math.round(rockingInput.horizon / h);
  for (let i = 0; i < steps; i++) {
    q = integratePlanar(q, h, s => rockingRate(s, K, C));
    rockingInput.localPoints.forEach(p => { maxGap = Math.max(maxGap, q[0] - p.x * Math.sin(q[2]) + p.z * Math.cos(q[2])); });
  }
  return { endpoint: q, maxGap, h, steps };
}
function rockingFixture(K: number, C: number) {
  const f = pivotFixture(K, C), b = f.initial.feet[0];
  b.mass = rockingInput.mass; b.inertia = rockingInput.inertia; b.position.z = .04 - rockingInput.normalDemand / K;
  b.velocity.z = 0; b.angularMomentum.y = rockingInput.omega * b.inertia;
  const theta = rockingInput.theta;
  b.basis = [{ x: Math.cos(theta), y: 0, z: -Math.sin(theta) }, { x: 0, y: 1, z: 0 }, { x: Math.sin(theta), y: 0, z: Math.cos(theta) }];
  f.mat.points[0] = rockingInput.localPoints.map((local, i) => ({ id: i ? 'toe' : 'heel', local, areaWeight: rockingInput.weights[i] }));
  return f;
}
const rocking = [50000, 100000].flatMap(K => [0, 60].map(C => {
  const coarseReference = rockingReference(K, C, .000005), reference = rockingReference(K, C, .0000025);
  const rows = [.0005, .00025, .000125].map(h => {
    const f = rockingFixture(K, C); let s = f.initial, completed = true, dampingWork = 0, maxCompression = 0;
    const loads: SpatialImpulseSet = [{}, { center: { x: 0, y: 0, z: -rockingInput.knownDownwardForce * h } }, {}];
    for (let i = 0; i < Math.round(rockingInput.horizon / h); i++) {
      const next = checkedStep(s, h, f.mat, loads, `rocking/K${K}/C${C}/h${h}/step${i}`);
      if (!next) { completed = false; break; } s = next.state; dampingWork += next.audit.damping; maxCompression = Math.max(maxCompression, next.audit.compression);
    }
    const b = s.feet[0], endpoint: Planar = [b.position.z, b.velocity.z, Math.atan2(-b.basis[0].z, b.basis[0].x), b.angularMomentum.y / b.inertia];
    return { h, completed, endpoint, dampingWork, maxCompression, continuumError: vectorError(endpoint, reference.endpoint) };
  });
  return { K, C, input: rockingInput, reference, referenceRefinementDifference: vectorError(coarseReference.endpoint, reference.endpoint), rows,
    refinementRatios: rows.slice(0, -1).map((r, i) => r.continuumError / rows[i + 1].continuumError) };
}));

function standingFixture(K: number, C: number, shove: number) {
  const torso = body(96, 8, { x: 0, y: 0, z: 1 }), feet = [-1, 1].map(side => body(2, .008, { x: 0, y: side * .14, z: .04 - 500 / K })) as SpatialSupportState['feet'];
  const legs = [-1, 1].map((side, i) => {
    const hip = { x: 0, y: side * .14, z: -.15 }, ankle = { x: 0, y: 0, z: .03 };
    return { hip, ankle, compliance: { restLength: norm(sub(point(torso, hip), point(feet[i], ankle))) + .1,
      stiffness: 4800, forceCap: 1600, damping: 20, dampingCap: 300 } };
  }) as SpatialSupportState['legs'];
  const initial: SpatialSupportState = { torso, feet, legs, gravity: { x: 0, y: 0, z: -10 } };
  const pts = [-1, 1].flatMap(x => [-1, 1].map(y => ({ id: `${x}:${y}`, local: { x: x * .10, y: y * .04, z: -.04 }, areaWeight: .25 })));
  const mat: CompliantSoleMaterial = { points: [structuredClone(pts), structuredClone(pts)], stiffness: [K, K], damping: [C, C] };
  const forces: SpatialImpulseSet = [{ points: [{ id: 'shoulder', local: { x: .10, y: .10, z: .25 }, impulse: { x: shove, y: shove / 3, z: 0 } }] }, {}, {}];
  return { initial, mat, forces };
}
type Variant = 'base' | 'mirror' | 'translate' | 'split-point';
const reflect = (v: Vec3): Vec3 => ({ x: -v.x, y: v.y, z: v.z });
const axialReflect = (v: Vec3): Vec3 => ({ x: v.x, y: -v.y, z: -v.z });
const translation = { x: 11, y: -7, z: 2 };
function transform(f: ReturnType<typeof standingFixture>, v: Variant) {
  const r = structuredClone(f);
  if (v === 'mirror') {
    bodies(r.initial).forEach(b => { b.position = reflect(b.position); b.velocity = reflect(b.velocity); b.angularMomentum = axialReflect(b.angularMomentum);
      b.basis = [mul(reflect(b.basis[0]), -1), reflect(b.basis[1]), reflect(b.basis[2])]; });
    r.initial.legs.forEach(l => { l.hip = reflect(l.hip); l.ankle = reflect(l.ankle); }); r.initial.gravity = reflect(r.initial.gravity);
    r.mat.points.forEach(pts => pts.forEach(p => { p.local = reflect(p.local); }));
    r.forces.forEach(l => { if (l.center) l.center = reflect(l.center); if (l.couple) l.couple = axialReflect(l.couple);
      l.points?.forEach(p => { p.local = reflect(p.local); p.impulse = reflect(p.impulse); }); });
  }
  if (v === 'translate') { bodies(r.initial).forEach(b => { b.position = add(b.position, translation); }); r.mat.planeHeight = translation.z; }
  if (v === 'split-point') r.mat.points = r.mat.points.map(pts => pts.flatMap(p => [
    { ...p, id: `${p.id}:a`, areaWeight: p.areaWeight * .3 }, { ...p, id: `${p.id}:b`, areaWeight: p.areaWeight * .7 }])) as CompliantSoleMaterial['points'];
  return r;
}
const standing = [25000, 100000].flatMap(K => [0, 80].flatMap(C => [0, 100].map(shove => {
  const f = standingFixture(K, C, shove);
  const rows = [.0005, .00025, .000125].map(h => {
    const variants = (['base', 'mirror', 'translate', 'split-point'] as Variant[]).map(variant => {
      const t = transform(f, variant); let s = t.initial, completed = true, iterations = 0;
      for (let i = 0; i < Math.round(.004 / h); i++) {
        const next = checkedStep(s, h, t.mat, dose(t.forces, h), `standing/K${K}/C${C}/shove${shove}/${variant}/h${h}/step${i}`);
        if (!next) { completed = false; break; } s = next.state; iterations += next.iterations;
      }
      return { variant, completed, iterations, state: s };
    });
    const base = variants[0].state;
    return { h, completed: variants.every(v => v.completed), baseState: base,
      variants: variants.map(v => ({ variant: v.variant, completed: v.completed, iterations: v.iterations,
        transformedStateError: stateError(v.state, transform({ ...f, initial: base }, v.variant).initial), stateSha256: sha(JSON.stringify(v.state)) })),
      staticDrift: shove === 0 ? stateError(base, f.initial) : null };
  });
  return { K, C, shove, input: f, rows, convergence: rows.slice(0, -1).map((r, i) => ({ h: r.h,
    differenceVersusFinest: stateError(r.baseState, rows.at(-1)!.baseState), nextDifferenceVersusFinest: stateError(rows[i + 1].baseState, rows.at(-1)!.baseState) })) };
})));

// These failures must be explicit and atomic, not repaired by changed strength,
// a pose snap, an unrecorded impact or disabled ordinary compressed intervals.
const expectedRejections: Array<{ label: string; rejected: boolean; atomic: boolean; reason: string | null }> = [];
function expectRejection(label: string, s: SpatialSupportState, h: number, mat: CompliantSoleMaterial) {
  const saved = structuredClone(s), r = advanceSpatialSoleCompliance(s, h, mat);
  expectedRejections.push({ label, rejected: !r.report.accepted, atomic: JSON.stringify(s) === JSON.stringify(saved) && JSON.stringify(r.state) === JSON.stringify(saved), reason: r.report.reason });
}
const stiff = standingFixture(100000, 0, 100); expectRejection('elastic phase exceeds local budget', stiff.initial, .01, stiff.mat);
const overDamped = standingFixture(100000, 1e5, 0); expectRejection('damping rate exceeds local budget', overDamped.initial, .0001, overDamped.mat);
const onset = pivotFixture(1000, 0); onset.initial.feet[0].basis = identity(); onset.initial.feet[0].position.z = 1.005; onset.initial.feet[0].velocity.z = -10; onset.initial.feet[0].angularMomentum = zero();
expectRejection('interior normal contact onset', onset.initial, .001, onset.mat);

const checks = { allOrdinaryIntervalsAccepted: rejections.length === 0, independentBudgetsPass: violations.length === 0,
  continuousReferencesSupported: pivots.every(p => p.reference.maxGap < 0), continuousReferenceRefinementBelow1eMinus7: pivots.every(p => p.referenceRefinementDifference < 1e-7),
  pivotTemporalRefinementImproves: pivots.every(p => p.rows.every(r => r.completed) && p.refinementRatios.every(r => r > 2.5)),
  smoothRigidLimitImprovesWithStiffness: [0, 10].every(C => { const p = pivots.filter(r => r.C === C); return p.slice(1).every((r, i) => r.continuumRigidDifference < p[i].continuumRigidDifference); }),
  rockingContinuousReferencesSupported: rocking.every(r => r.reference.maxGap < 0),
  rockingReferenceRefinementBelow1eMinus7: rocking.every(r => r.referenceRefinementDifference < 1e-7),
  rockingTemporalRefinementImproves: rocking.every(r => r.rows.every(s => s.completed) && r.refinementRatios.every(ratio => ratio > 2.5)),
  representationCovarianceBelow1eMinus7: standing.every(p => p.rows.every(r => r.variants.every(v => v.completed && v.transformedStateError < 1e-7))),
  staticEquilibriaDoNotDrift: standing.every(p => p.rows.every(r => r.staticDrift === null || r.staticDrift < 1e-8)),
  expectedRejectionsAtomic: expectedRejections.every(r => r.rejected && r.atomic) };
const sourceSha256End = sourceVersion(), scriptSha256End = sha(readFileSync(scriptPath));
if (sourceSha256Start !== sourceSha256End || scriptSha256Start !== scriptSha256End) throw new Error('Source/script changed during run; output withheld');
const payload = { sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End, node: process.version,
  reference: { path: rigidReferencePath, sha256: sha(rigidBytes), rigidTarget: target, N0, Ndot0, preparation: 'gap=-N0/K+C*Ndot0/K^2; gap velocity=-Ndot0/K; theta=0; omega=2' },
  intervals, maxAudit, pivots, rocking, standing, expectedRejections, rejections, violations, checks,
  scope: 'Independent normal-only finite-compliance research mechanics. K/C/sole area are declared sensitivity fixtures, not NFL-calibrated. No World, friction, cleat anchoring, gait, active control, grip coupling or complete contact-event lifecycle. Fixed-C supported smooth convergence does not establish a plastic-impact limit.' };
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify({ output, sourceSha256Start, scriptSha256Start, intervals, maxAudit, checks, expectedRejections,
  pivots: pivots.map(p => ({ K: p.K, C: p.C, continuumRigidDifference: p.continuumRigidDifference, referenceRefinementDifference: p.referenceRefinementDifference,
    refinementRatios: p.refinementRatios, rows: p.rows })), rocking, rejections: rejections.length, violations: violations.length }, null, 2));
if (Object.values(checks).some(ok => !ok)) process.exitCode = 1;
