/** Independent coupled body/support/shear audits; research kernel, no World. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { deepStrictEqual } from 'node:assert';
import { sourceVersion } from '../source-version.js';
import { advanceSpatialSoleCompliance, createSpatialSoleShearState, type CompliantSoleMaterial,
  type SpatialSoleShearState } from '../../src/physics/spatial-sole-compliance.js';
import type { SpatialSupportState, SpatialImpulseSet } from '../../src/physics/spatial-support.js';
import type { MaterialRigidState, Vec3 } from '../../src/physics/material-rigid.js';
import { advanceSoleTractionReference } from './sole-traction-reference.js';

if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Run with pinned Node 22');
if (process.argv.length > 3 || process.argv[2]?.startsWith('--')) throw new Error('Specify at most one output path');
const output = process.argv[2] ?? 'out/sole-traction-stress.json';
const scriptPath = fileURLToPath(import.meta.url);
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const sourceSha256Start = sourceVersion(), scriptSha256Start = sha(readFileSync(scriptPath));
const referencePath = fileURLToPath(new URL('./sole-traction-reference.ts', import.meta.url));
const referenceSha256Start = sha(readFileSync(referencePath));
const zero = (): Vec3 => ({ x: 0, y: 0, z: 0 });
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mul = (a: Vec3, q: number): Vec3 => ({ x: a.x * q, y: a.y * q, z: a.z * q });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const mean = (a: Vec3, b: Vec3) => mul(add(a, b), .5);
const bodies = (s: SpatialSupportState) => [s.torso, ...s.feet];
const offset = (b: MaterialRigidState, r: Vec3) => add(add(mul(b.basis[0], r.x), mul(b.basis[1], r.y)), mul(b.basis[2], r.z));
const point = (b: MaterialRigidState, r: Vec3) => add(b.position, offset(b, r));
const identity = (): MaterialRigidState['basis'] => [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }];
const body = (mass: number, inertia: number, position: Vec3): MaterialRigidState => ({ mass, inertia, position, velocity: zero(), angularMomentum: zero(), basis: identity() });
const disabled = () => ({ restLength: 1, stiffness: 1, forceCap: 0, damping: 0, dampingCap: 0 });
function potential(l: number, c: SpatialSupportState['legs'][0]['compliance']) {
  const q = Math.max(0, c.restLength - l), e = Math.min(q, c.forceCap / c.stiffness);
  return .5 * c.stiffness * e * e + c.forceCap * (q - e);
}
function energy(s: SpatialSupportState, mat: CompliantSoleMaterial, shear: SpatialSoleShearState): number {
  let e = bodies(s).reduce((sum, b) => sum + .5 * b.mass * dot(b.velocity, b.velocity)
    + .5 * dot(b.angularMomentum, b.angularMomentum) / b.inertia - b.mass * dot(s.gravity, b.position), 0);
  s.legs.forEach((l, i) => { e += potential(norm(sub(point(s.feet[i], l.ankle), point(s.torso, l.hip))), l.compliance); });
  mat.points.forEach((ps, f) => ps.forEach(p => {
    e += .5 * mat.stiffness[f] * p.areaWeight * Math.max(0, (mat.planeHeight ?? 0) - point(s.feet[f], p.local).z) ** 2;
    const q = shear.points.find(q => q.foot === f && q.id === p.id)!.stretch;
    e += .5 * (mat.shearStiffness?.[f] ?? 0) * p.areaWeight * (q.x * q.x + q.y * q.y);
  }));
  return e;
}
const violations: string[] = [];
let acceptedIntervals = 0, ordinaryRejections = 0;
const maxima = { work: 0, bodyLinear: 0, bodyAngular: 0, capacityExcess: 0, attachmentWork: 0, stateEnergyLedger: 0 };
type Result = ReturnType<typeof advanceSpatialSoleCompliance>;
function audit(before: SpatialSupportState, after: Result, mat: CompliantSoleMaterial, shear: SpatialSoleShearState, h: number,
  loads: SpatialImpulseSet, label: string) {
  const linear = bodies(before).map(b => mul(before.gravity, b.mass * h));
  const spin = bodies(before).map(() => zero());
  let knownWork = 0, dampingWork = 0, plasticD = 0, attachmentError = 0, capacityExcess = 0;
  bodies(before).forEach((b, i) => {
    const next = bodies(after.state)[i], c = loads[i].center ?? zero(), couple = loads[i].couple ?? zero();
    linear[i] = add(linear[i], c); spin[i] = add(spin[i], couple);
    knownWork += dot(c, mean(b.velocity, next.velocity)) + dot(couple, mul(mean(b.angularMomentum, next.angularMomentum), 1 / b.inertia));
    (loads[i].points ?? []).forEach(p => {
      linear[i] = add(linear[i], p.impulse); spin[i] = add(spin[i], cross(mean(offset(b, p.local), offset(next, p.local)), p.impulse));
      knownWork += dot(p.impulse, mul(sub(point(next, p.local), point(b, p.local)), 1 / h));
    });
  });
  before.legs.forEach((l, i) => {
    const d0 = sub(point(before.feet[i], l.ankle), point(before.torso, l.hip));
    const d1 = sub(point(after.state.feet[i], l.ankle), point(after.state.torso, l.hip));
    const l0 = norm(d0), l1 = norm(d1), dl = l1 - l0;
    // Integrate the piecewise-linear conservative force independently, without
    // subtracting near-equal potential energies over a microscopic stroke.
    const forceAt = (u: number) => Math.min(l.compliance.forceCap,
      l.compliance.stiffness * Math.max(0, l.compliance.restLength - (l0 + dl * u)));
    const cuts = [0, 1, ...[l.compliance.restLength, l.compliance.restLength - l.compliance.forceCap / l.compliance.stiffness]
      .map(length => (length - l0) / dl).filter(u => Number.isFinite(u) && u > 0 && u < 1)].sort((a, b) => a - b);
    const spring = cuts.slice(0, -1).reduce((sum, u, j) => sum + .5 * (forceAt(u) + forceAt(cuts[j + 1])) * (cuts[j + 1] - u), 0);
    const damper = -Math.max(-l.compliance.dampingCap, Math.min(l.compliance.dampingCap, l.compliance.damping * dl / h));
    const J = mul(add(d0, d1), h * (spring + damper) / (l0 + l1));
    linear[0] = sub(linear[0], J); linear[i + 1] = add(linear[i + 1], J);
    spin[0] = sub(spin[0], cross(mean(offset(before.torso, l.hip), offset(after.state.torso, l.hip)), J));
    spin[i + 1] = add(spin[i + 1], cross(mean(offset(before.feet[i], l.ankle), offset(after.state.feet[i], l.ankle)), J));
    dampingWork += damper * dl;
  });
  mat.points.forEach((ps, f) => ps.forEach(p => {
    const b = before.feet[f], next = after.state.feet[f], p0 = point(b, p.local), p1 = point(next, p.local);
    const g0 = p0.z - (mat.planeHeight ?? 0), g1 = p1.z - (mat.planeHeight ?? 0), dp = sub(p1, p0);
    const compressed = after.report.solePoints.find(q => q.foot === f && q.id === p.id)!.mode === 'compressed';
    const Ns0 = compressed ? mat.stiffness[f] * p.areaWeight * Math.max(0, -g0) : 0;
    const Ns1 = compressed ? mat.stiffness[f] * p.areaWeight * Math.max(0, -g1) : 0;
    const Nd = compressed ? mat.damping[f] * p.areaWeight * Math.max(0, -dp.z / h) : 0;
    const Jn = h * (.5 * (Ns0 + Ns1) + Nd);
    const q = after.report.solePoints.find(q => q.foot === f && q.id === p.id)!.shear;
    const jt = q?.constitutive.footImpulse ?? { x: 0, y: 0 };
    const J = { x: jt.x, y: jt.y, z: Jn };
    linear[f + 1] = add(linear[f + 1], J); spin[f + 1] = add(spin[f + 1], cross(mean(offset(b, p.local), offset(next, p.local)), J));
    dampingWork += Nd * dp.z;
    plasticD += q?.constitutive.totalDissipation ?? 0;
    capacityExcess = Math.max(capacityExcess, Math.hypot(jt.x, jt.y) - (p.friction ?? 0) * Jn);
    if (q) attachmentError = Math.max(attachmentError, Math.abs(dot({ x: jt.x, y: jt.y, z: 0 }, mul(dp, 1 / h)) - q.actualAttachmentWork));
  }));
  const beforeEnergy = energy(before, mat, shear), afterEnergy = energy(after.state, mat, after.shearState!);
  const errors = { work: Math.abs(afterEnergy - beforeEnergy - knownWork - dampingWork + plasticD),
    bodyLinear: Math.max(...bodies(before).map((b, i) => norm(sub(mul(sub(bodies(after.state)[i].velocity, b.velocity), b.mass), linear[i])))),
    bodyAngular: Math.max(...bodies(before).map((b, i) => norm(sub(sub(bodies(after.state)[i].angularMomentum, b.angularMomentum), spin[i])))),
    capacityExcess, attachmentWork: attachmentError,
    stateEnergyLedger: Math.max(Math.abs(beforeEnergy - after.report.totalEnergyBefore), Math.abs(afterEnergy - after.report.totalEnergyAfter)) };
  for (const k of Object.keys(maxima) as Array<keyof typeof maxima>) maxima[k] = Math.max(maxima[k], errors[k]);
  if (Object.values(errors).some(e => !Number.isFinite(e) || e > 1e-7)) violations.push(`${label}: mechanics ${JSON.stringify(errors)}`);
  return errors;
}
function checked(before: SpatialSupportState, mat: CompliantSoleMaterial, shear: SpatialSoleShearState, h: number, loads: SpatialImpulseSet, label: string) {
  const result = advanceSpatialSoleCompliance(before, h, mat, { externalImpulses: loads, shearState: shear });
  if (!result.report.accepted) { ordinaryRejections++; violations.push(`${label}: rejected ${result.report.reason}`); return null; }
  acceptedIntervals++; audit(before, result, mat, shear, h, loads, label); return result;
}
function fixture(Kt: number, mu: number, vx: number, count = 1) {
  const foot = body(2, .008, { x: 0, y: 0, z: -.01 }); foot.velocity.x = vx;
  const initial: SpatialSupportState = { torso: body(1, 1, { x: 0, y: 0, z: 10 }), feet: [foot, body(2, .008, { x: 0, y: 0, z: 3 })],
    legs: [0, 1].map(() => ({ hip: zero(), ankle: zero(), compliance: disabled() })) as SpatialSupportState['legs'], gravity: { x: 0, y: 0, z: -10 } };
  const points = Array.from({ length: count }, (_, i) => ({ id: `patch${i}`, local: zero(), areaWeight: 1 / count, friction: mu }));
  const mat: CompliantSoleMaterial = { points: [structuredClone(points), structuredClone(points)], stiffness: [50000, 50000], damping: [0, 0], shearStiffness: [Kt, Kt] };
  return { initial, mat };
}
const oneDInputs = [
  ...[1000, 4000].flatMap(Kt => [.2, .6].flatMap(mu => [.1, 2].map(vx => ({ Kt, mu, vx, force: 0 })))),
  { Kt: 4000, mu: .2, vx: 0, force: 40 }, { Kt: 4000, mu: .2, vx: 0, force: 120 },
];
const oneDimensional = oneDInputs.map(input => {
  const H = .04;
  const referenceResult = advanceSoleTractionReference({ mass: 2, tangentialStiffness: input.Kt, normalLoad: 500,
    friction: input.mu, externalForce: input.force }, { position: 0, velocity: input.vx, stretch: 0 }, H);
  const reference = { ...referenceResult.state, dissipation: referenceResult.totals.plasticDissipation };
  const rows = [.0004, .0002, .0001].map(h => {
    const f = fixture(input.Kt, input.mu, input.vx); let state = f.initial, shear = createSpatialSoleShearState(f.mat), completed = true, plasticD = 0, normalImpulse = 0;
    let tractionImpulse = 0, firstYieldTime: number | null = null;
    for (let i = 0; i < Math.round(H / h); i++) {
      const result = checked(state, f.mat, shear, h, [{}, { center: { x: input.force * h, y: 0, z: -480 * h } }, {}], `1D/${JSON.stringify(input)}/h${h}/${i}`);
      if (!result) { completed = false; break; }
      state = result.state; shear = result.shearState!; plasticD += result.report.soleShearDissipation;
      normalImpulse += result.report.solePoints.filter(q => q.foot === 0).reduce((n, q) => n + q.springImpulse + q.dampingImpulse, 0);
      const q = result.report.solePoints.find(q => q.foot === 0)!.shear!.constitutive;
      tractionImpulse -= q.footImpulse.x;
      if (firstYieldTime === null && (q.branch === 'plastic' || q.branch === 'elastic-plastic')) firstYieldTime = i * h + (q.onsetTime ?? 0);
    }
    const e = shear.points.find(p => p.foot === 0)!.stretch.x;
    const endpoint = { position: state.feet[0].position.x, velocity: state.feet[0].velocity.x, stretch: e, dissipation: plasticD };
    const difference = Math.max(Math.abs(endpoint.position - reference.position), Math.abs(endpoint.velocity - reference.velocity),
      Math.abs(e - reference.stretch), Math.abs(plasticD - reference.dissipation));
    const exactYieldTime = referenceResult.events.find(e => e.kind === 'yield')?.time ?? null;
    return { h, completed, endpoint, continuumError: difference, normalImpulse, normalDemandImpulse: 500 * H,
      tractionImpulse, exactTractionImpulse: referenceResult.totals.tractionImpulse,
      tractionImpulseError: Math.abs(tractionImpulse - referenceResult.totals.tractionImpulse), firstYieldTime, exactYieldTime,
      firstYieldTimeError: firstYieldTime !== null && exactYieldTime !== null ? Math.abs(firstYieldTime - exactYieldTime) : null };
  });
  if (rows.some(r => !r.completed) || rows.at(-1)!.continuumError > 3e-5
    || rows.at(-1)!.tractionImpulseError > 3e-5
    || rows.slice(1).some((r, i) => r.continuumError >= rows[i].continuumError)) violations.push(`1D continuum/refinement ${JSON.stringify(input)}`);
  return { input, horizon: H, reference, rows, refinementRatios: rows.slice(0, -1).map((r, i) => r.continuumError / rows[i + 1].continuumError) };
});

// Independent planar finite-inertia rocking reference: explicit small steps
// and radial plastic returns, not the body kernel's Cayley/DG/phase quadrature.
// Its first-order numerical error is retained as a refinement difference.
type RockState = [number, number, number, number, number, number, number, number];
const rockPoints = [{ x: -.08, y: 0, z: -.04 }, { x: .08, y: 0, z: -.04 }];
const rockParameters = { mass: 2, inertia: .008, K: 50000, C: 60, Kt: 40000, mu: .4, normalDemand: 500, horizon: .01 };
function rockNormal(q: RockState, i: number) {
  const p = rockPoints[i], rx = p.x * Math.cos(q[4]) + p.z * Math.sin(q[4]), rz = -p.x * Math.sin(q[4]) + p.z * Math.cos(q[4]);
  const g = q[2] + rz, vn = q[3] - rx * q[5];
  return { rx, rz, N: g < 0 ? .5 * (rockParameters.K * -g + rockParameters.C * Math.max(0, -vn)) : 0 };
}
function rockingReference(dt: number) {
  let q: RockState = [0, 2, .03, 0, .005, .8, 0, 0];
  const steps = Math.round(rockParameters.horizon / dt);
  for (let n = 0; n < steps; n++) {
    const normals = rockPoints.map((_, i) => rockNormal(q, i)), forces = [6, 7].map((j, i) => {
      const trial = rockParameters.Kt * .5 * q[j], R = rockParameters.mu * normals[i].N;
      return Math.max(-R, Math.min(R, trial));
    });
    const N = normals.reduce((sum, p) => sum + p.N, 0), torque = normals.reduce((sum, p, i) => sum - p.rx * p.N - p.rz * forces[i], 0);
    const next = [...q] as RockState;
    next[0] += dt * q[1]; next[2] += dt * q[3]; next[4] += dt * q[5];
    next[1] -= dt * (forces[0] + forces[1]) / rockParameters.mass;
    next[3] += dt * ((N - 480) / rockParameters.mass - 10);
    next[5] += dt * torque / rockParameters.inertia;
    [6, 7].forEach((j, i) => {
      const trial = forces[i] + rockParameters.Kt * .5 * (q[1] + normals[i].rz * q[5]) * dt;
      const R = rockParameters.mu * rockNormal(next, i).N;
      next[j] = Math.max(-R, Math.min(R, trial)) / (rockParameters.Kt * .5);
    });
    q = next;
  }
  return { h: dt, steps, endpoint: q };
}
const referenceCoarse = rockingReference(5e-8), referenceFine = rockingReference(2.5e-8);
const maxDifference = (a: number[], b: number[]) => Math.max(...a.map((x, i) => Math.abs(x - b[i])));
const rockingRows = [.0002, .0001, .00005].map(h => {
  const f = fixture(rockParameters.Kt, rockParameters.mu, 2), b = f.initial.feet[0];
  b.position.z = .03; b.angularMomentum.y = .8 * b.inertia;
  const a = .005; b.basis = [{ x: Math.cos(a), y: 0, z: -Math.sin(a) }, { x: 0, y: 1, z: 0 }, { x: Math.sin(a), y: 0, z: Math.cos(a) }];
  f.mat.points[0] = rockPoints.map((local, i) => ({ id: `point${i}`, local, areaWeight: .5, friction: rockParameters.mu })); f.mat.damping = [60, 60];
  let state = f.initial, shear = createSpatialSoleShearState(f.mat), completed = true;
  for (let i = 0; i < Math.round(rockParameters.horizon / h); i++) {
    const result = checked(state, f.mat, shear, h, [{}, { center: { x: 0, y: 0, z: -480 * h } }, {}], `rocking/h${h}/${i}`);
    if (!result) { completed = false; break; } state = result.state; shear = result.shearState!;
  }
  const end = state.feet[0], endpoint = [end.position.x, end.velocity.x, end.position.z, end.velocity.z,
    Math.atan2(-end.basis[0].z, end.basis[0].x), end.angularMomentum.y / end.inertia,
    ...f.mat.points[0].map(p => shear.points.find(q => q.foot === 0 && q.id === p.id)!.stretch.x)];
  return { h, completed, endpoint, continuumError: maxDifference(endpoint, referenceFine.endpoint) };
});
if (rockingRows.some(r => !r.completed) || rockingRows.at(-1)!.continuumError > .001
  || rockingRows.slice(1).some((r, i) => r.continuumError >= rockingRows[i].continuumError)) violations.push('Rocking continuum/reference failed');
const rocking = { parameters: rockParameters, reference: referenceFine,
  referenceRefinementDifference: maxDifference(referenceCoarse.endpoint, referenceFine.endpoint), rows: rockingRows };

const benchmarks = [1, 2, 4, 8].map(count => {
  const f = fixture(4000, .2, 2, count); let state = f.initial, shear = createSpatialSoleShearState(f.mat), iterations = 0, completed = 0;
  let candidateEvaluations = 0, constitutiveEvaluations = 0, quadratureEvaluations = 0;
  // Start a loaded sliding episode explicitly. Collocated split copies keep
  // equal stretch and weighted stiffness; points do not buy extra capacity.
  shear.points.forEach(p => { if (p.foot === 0) p.stretch.x = .025; });
  const time = performance.now();
  for (let i = 0; i < 25; i++) {
    const r = checked(state, f.mat, shear, .0001, [{}, { center: { x: 0, y: 0, z: -.048 } }, {}], `benchmark/${count}/${i}`);
    if (!r) break; state = r.state; shear = r.shearState!; iterations += r.report.iterations; completed++;
    candidateEvaluations += r.report.candidateEvaluations; constitutiveEvaluations += r.report.shearConstitutiveEvaluations;
    quadratureEvaluations += r.report.shearQuadratureEvaluations;
  }
  return { pointsPerFoot: count, completed, intervals: 25, elapsedMs: performance.now() - time, iterations,
    candidateEvaluations, constitutiveEvaluations, quadratureEvaluations, endpoint: state.feet[0], shear };
});
const splitError = Math.max(...benchmarks.map(r => norm(sub(r.endpoint.velocity, benchmarks[0].endpoint.velocity))));
if (splitError > 1e-8) violations.push(`Coupled weighted split mismatch ${splitError}`);

function stanceFixture() {
  const torso = body(96, 8, { x: 0, y: 0, z: 1 });
  const feet = [-1, 1].map(side => body(2, .008, { x: 0, y: side * .14, z: .035 })) as SpatialSupportState['feet'];
  const legs = [-1, 1].map((side, i) => {
    const hip = { x: 0, y: side * .14, z: -.15 }, ankle = { x: 0, y: 0, z: .03 };
    return { hip, ankle, compliance: { restLength: norm(sub(point(torso, hip), point(feet[i], ankle))) + .1,
      stiffness: 4800, forceCap: 1600, damping: 20, dampingCap: 300 } };
  }) as SpatialSupportState['legs'];
  const initial: SpatialSupportState = { torso, feet, legs, gravity: { x: 0, y: 0, z: -10 } };
  const patches = [-1, 1].flatMap(x => [-1, 1].map(y => ({ id: `${x}:${y}`, local: { x: x * .1, y: y * .04, z: -.04 }, areaWeight: .25, friction: .5 })));
  const mat: CompliantSoleMaterial = { points: [structuredClone(patches), structuredClone(patches)], stiffness: [100000, 100000],
    damping: [80, 80], shearStiffness: [5000, 5000] };
  const load: SpatialImpulseSet = [{ points: [{ id: 'shoulder', local: { x: .1, y: .1, z: .25 }, impulse: { x: 300, y: 100, z: 0 } }] }, {}, {}];
  return { initial, mat, load };
}
type Variant = 'base' | 'mirror' | 'rotate' | 'translate' | 'permute' | 'split';
const shift = { x: 11, y: -7, z: 2 }, angle = .83;
const reflected = (v: Vec3): Vec3 => ({ x: -v.x, y: v.y, z: v.z });
const axialReflected = (v: Vec3): Vec3 => ({ x: v.x, y: -v.y, z: -v.z });
const rotated = (v: Vec3, a: number): Vec3 => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a), z: v.z });
function variantFixture(v: Variant) {
  const f = stanceFixture();
  if (v === 'translate') { bodies(f.initial).forEach(b => { b.position = add(b.position, shift); }); f.mat.planeHeight = shift.z; }
  if (v === 'permute') f.mat.points.forEach(ps => ps.reverse());
  if (v === 'split') f.mat.points = f.mat.points.map(ps => ps.flatMap(p => ['a', 'b'].map(s => ({ ...p, id: `${p.id}/${s}`, areaWeight: p.areaWeight / 2 })))) as CompliantSoleMaterial['points'];
  if (v === 'mirror' || v === 'rotate') {
    const map = (x: Vec3) => v === 'mirror' ? reflected(x) : rotated(x, angle);
    bodies(f.initial).forEach(b => {
      b.position = map(b.position); b.velocity = map(b.velocity);
      b.angularMomentum = v === 'mirror' ? axialReflected(b.angularMomentum) : map(b.angularMomentum);
      b.basis = b.basis.map((x, i) => v === 'mirror' && i === 0 ? mul(map(x), -1) : map(x)) as MaterialRigidState['basis'];
    });
    f.initial.gravity = map(f.initial.gravity);
    if (v === 'mirror') {
      f.initial.legs.forEach(l => { l.hip = reflected(l.hip); l.ankle = reflected(l.ankle); });
      f.mat.points.forEach(ps => ps.forEach(p => { p.local = reflected(p.local); }));
    }
    f.load.forEach(l => { l.points?.forEach(p => { if (v === 'mirror') p.local = reflected(p.local); p.impulse = map(p.impulse); }); });
  }
  return f;
}
function untransform(s: SpatialSupportState, v: Variant): SpatialSupportState {
  const r = structuredClone(s);
  bodies(r).forEach(b => {
    if (v === 'translate') b.position = sub(b.position, shift);
    if (v === 'rotate') {
      b.position = rotated(b.position, -angle); b.velocity = rotated(b.velocity, -angle); b.angularMomentum = rotated(b.angularMomentum, -angle);
      b.basis = b.basis.map(x => rotated(x, -angle)) as MaterialRigidState['basis'];
    }
    if (v === 'mirror') {
      b.position = reflected(b.position); b.velocity = reflected(b.velocity); b.angularMomentum = axialReflected(b.angularMomentum);
      b.basis = b.basis.map((x, i) => i === 0 ? mul(reflected(x), -1) : reflected(x)) as MaterialRigidState['basis'];
    }
  });
  return r;
}
const bodyDifference = (a: SpatialSupportState, b: SpatialSupportState) => Math.max(...bodies(a).flatMap((x, i) => {
  const y = bodies(b)[i]; return [norm(sub(x.position, y.position)), norm(sub(x.velocity, y.velocity)), norm(sub(x.angularMomentum, y.angularMomentum)),
    ...x.basis.map((axis, j) => norm(sub(axis, y.basis[j])))];
}));
const stance = [.0004, .0002, .0001].map(h => {
  const rows = (['base', 'mirror', 'rotate', 'translate', 'permute', 'split'] as Variant[]).map(variant => {
    const f = variantFixture(variant); let state = f.initial, shear = createSpatialSoleShearState(f.mat), completed = true;
    for (let i = 0; i < Math.round(.004 / h); i++) {
      const loads = f.load.map(l => ({ points: l.points?.map(p => ({ ...p, impulse: mul(p.impulse, h) })) })) as SpatialImpulseSet;
      const r = checked(state, f.mat, shear, h, loads, `stance/${variant}/h${h}/${i}`);
      if (!r) { completed = false; break; } state = r.state; shear = r.shearState!;
    }
    return { variant, completed, state, shear };
  });
  const base = rows[0];
  const differences = rows.map(r => ({ variant: r.variant, body: bodyDifference(base.state, untransform(r.state, r.variant)),
    stretch: Math.max(...base.shear.points.map(p => {
      const peers = r.shear.points.filter(q => q.foot === p.foot && (r.variant === 'split' ? q.id.startsWith(`${p.id}/`) : q.id === p.id));
      return Math.max(...peers.map(q => {
        let t = { ...q.stretch, z: 0 };
        if (r.variant === 'mirror') t = reflected(t); if (r.variant === 'rotate') t = rotated(t, -angle);
        return Math.hypot(p.stretch.x - t.x, p.stretch.y - t.y);
      }));
    })) }));
  if (differences.some(d => d.body > 1e-7 || d.stretch > 1e-7)) violations.push(`Stance covariance h${h}: ${JSON.stringify(differences)}`);
  return { h, horizon: .004, rows, covariance: differences };
});

// A vanishing net chord can conceal irreversible slip before a stop. Body
// energy closes even when that history is wrongly treated as elastic.
const reflectionFixture = fixture(4096, .25, (1 - 1e-12) / 32);
reflectionFixture.initial.gravity = zero(); reflectionFixture.initial.feet[0].position.z = -1 / 128;
reflectionFixture.mat.stiffness = [65536, 65536];
const reflectionShear = createSpatialSoleShearState(reflectionFixture.mat);
reflectionShear.points.find(p => p.foot === 0)!.stretch.x = 1 / 32;
const reflection = advanceSpatialSoleCompliance(reflectionFixture.initial, 1 / 1024, reflectionFixture.mat,
  { shearState: reflectionShear, externalImpulses: [{}, { center: { x: 0, y: 0, z: -.5 } }, {}] });
const reflectionReference = advanceSoleTractionReference({ mass: 2, normalLoad: 512, friction: .25, tangentialStiffness: 4096 },
  { position: 0, velocity: (1 - 1e-12) / 32, stretch: 1 / 32 }, 1 / 1024);
if (reflection.report.accepted || !reflection.report.reason?.includes('reversal')) violations.push('Yield/stop reflection was not explicitly rejected');
try { deepStrictEqual(reflection.state, reflectionFixture.initial); deepStrictEqual(reflection.shearState, reflectionShear); }
catch { violations.push('Yield/stop reflection rejection changed body or stored shear'); }

const sourceSha256End = sourceVersion(), scriptSha256End = sha(readFileSync(scriptPath));
const referenceSha256End = sha(readFileSync(referencePath));
if (sourceSha256Start !== sourceSha256End || scriptSha256Start !== scriptSha256End || referenceSha256Start !== referenceSha256End)
  throw new Error('Source/script/reference changed during diagnostic; rerun');
const report = { schema: 'coupled-sole-traction-independent-v1', generatedAt: new Date().toISOString(), node: process.versions.node,
  provenance: { sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End, referenceSha256Start, referenceSha256End },
  scope: 'Research-only passive three-body support and finite sole shear; no World, gait, active controllers or NFL shoe/turf parameter calibration',
  summary: { acceptedIntervals, ordinaryRejections, violations: violations.length, ...maxima, splitError }, oneDimensional, rocking, benchmarks, stance,
  expectedRejections: { yieldStopReflection: { input: reflectionFixture, shearState: reflectionShear, result: reflection,
    independentContinuousReference: reflectionReference } }, violations };
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, ...report.summary }));
if (violations.length) process.exitCode = 1;
