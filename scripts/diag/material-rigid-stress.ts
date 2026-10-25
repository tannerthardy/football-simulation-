/** Reproducible rigid attachment mechanics audit; not support/readiness data.
 * Node 22, from repo root:
 * node --import tsx scripts/diag/material-rigid-stress.ts [output.json]
 *   [--seed=713291] [--cases=2000] [--over-cases=2000] [--multiload-cases=128]
 *
 * Ledgers below are reconstructed from actual input/output material states
 * and known impulses. Solver report residuals are deliberately not used.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { advanceMaterialRigid, rigidMidpointState, type MaterialPointImpulse, type MaterialRigidOptions,
  type MaterialRigidState, type RigidBasis, type Vec3 } from '../../src/physics/material-rigid.js';
import { sourceVersion } from '../source-version.js';

if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('This pinned audit requires Node 22');
const args = process.argv.slice(2), allowed = ['seed', 'cases', 'over-cases', 'multiload-cases'];
for (const arg of args.filter(a => a.startsWith('--')))
  if (!allowed.some(key => arg.startsWith(`--${key}=`))) throw new Error(`Unknown option ${arg}`);
function integerOption(key: string, fallback: number, lower: number, upper: number): number {
  const matches = args.filter(a => a.startsWith(`--${key}=`));
  if (matches.length > 1) throw new Error(`Specify --${key} once`);
  if (!matches.length) return fallback;
  const raw = matches[0].slice(key.length + 3), value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isInteger(value) || value < lower || value > upper) throw new Error(`Invalid --${key}`);
  return value;
}
const seed = integerOption('seed', 713291, 0, 0xffffffff), cases = integerOption('cases', 2000, 1, 10000);
const overCases = integerOption('over-cases', 2000, 0, 10000), multiloadCases = integerOption('multiload-cases', 128, 0, 10000);
const destinations = args.filter(a => !a.startsWith('--'));
if (destinations.length > 1) throw new Error('Specify at most one output path');
const destination = destinations[0] ?? 'out/material-rigid-stress/summary.json';
const ownPath = fileURLToPath(import.meta.url), sourceSha256Start = sourceVersion();
const selfHash = (): string => createHash('sha256').update(readFileSync(ownPath)).digest('hex');
const scriptSha256Start = selfHash();

// Independent ledger arithmetic: do not import the kernel's vector, energy,
// material-point, angular-momentum, or report-residual helpers.
const z = (): Vec3 => ({ x: 0, y: 0, z: 0 });
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const mul = (a: Vec3, n: number): Vec3 => ({ x: a.x * n, y: a.y * n, z: a.z * n });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x });
const mean = (a: Vec3, b: Vec3): Vec3 => mul(add(a, b), .5);
const identity = (): RigidBasis => [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }];
const offset = (s: MaterialRigidState, a: Vec3): Vec3 => add(add(mul(s.basis[0], a.x), mul(s.basis[1], a.y)), mul(s.basis[2], a.z));
const point = (s: MaterialRigidState, a: Vec3): Vec3 => add(s.position, offset(s, a));
const kinetic = (s: MaterialRigidState): number => .5 * s.mass * dot(s.velocity, s.velocity)
  + dot(s.angularMomentum, s.angularMomentum) / (2 * s.inertia);
const angular = (s: MaterialRigidState): Vec3 => add(cross(s.position, mul(s.velocity, s.mass)), s.angularMomentum);
function basisError(b: RigidBasis): number {
  let error = Math.abs(dot(cross(b[0], b[1]), b[2]) - 1);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) error = Math.max(error, Math.abs(dot(b[i], b[j]) - +(i === j)));
  return error;
}
type Transform = 'base' | 'translated' | 'reflected';
type Cohort = 'original-under-bound' | 'arbitrary-basis-multiload' | 'above-bound-negative-control';
interface Input { body: MaterialRigidState; dt: number; loads: MaterialPointImpulse[]; center: Vec3; couple: Vec3 }
interface Ledger {
  energyBefore: number; energyAfter: number; pointWork: number; centerWork: number; coupleWork: number;
  workResidualAbs: number; workResidualRelative: number; linearResidual: number; spinResidual: number;
  angularResidual: number; attachmentIdentityResidual: number; centerIdentityResidual: number;
  orthogonalityError: number; massInertiaChange: number; angularPhase: number; cayleyAngle: number;
}
function reconstruct(input: Input, after: MaterialRigidState): Ledger {
  const before = input.body, h = input.dt;
  const centerTravel = mul(sub(after.position, before.position), 1 / h), vbar = mean(before.velocity, after.velocity);
  const omegaMean = mul(add(before.angularMomentum, after.angularMomentum), .5 / before.inertia);
  let knownLinear = input.center, knownSpin = input.couple;
  let knownAngular = add(cross(mean(before.position, after.position), input.center), input.couple);
  let pointWork = 0, attachmentIdentityResidual = 0;
  for (const load of input.loads) {
    const p0 = point(before, load.local), p1 = point(after, load.local);
    const rbar = mean(offset(before, load.local), offset(after, load.local));
    const travel = mul(sub(p1, p0), 1 / h);
    pointWork += dot(load.impulse, travel);
    knownLinear = add(knownLinear, load.impulse);
    knownSpin = add(knownSpin, cross(rbar, load.impulse));
    knownAngular = add(knownAngular, cross(mean(p0, p1), load.impulse));
    attachmentIdentityResidual = Math.max(attachmentIdentityResidual, norm(sub(travel, add(vbar, cross(omegaMean, rbar)))));
  }
  const centerWork = dot(input.center, centerTravel), coupleWork = dot(input.couple, omegaMean);
  const energyBefore = kinetic(before), energyAfter = kinetic(after), work = pointWork + centerWork + coupleWork;
  const workResidualAbs = Math.abs(energyAfter - energyBefore - work);
  return { energyBefore, energyAfter, pointWork, centerWork, coupleWork, workResidualAbs,
    workResidualRelative: workResidualAbs / Math.max(1, Math.abs(energyBefore), Math.abs(energyAfter), Math.abs(work)),
    linearResidual: norm(sub(mul(sub(after.velocity, before.velocity), before.mass), knownLinear)),
    spinResidual: norm(sub(sub(after.angularMomentum, before.angularMomentum), knownSpin)),
    angularResidual: norm(sub(sub(angular(after), angular(before)), knownAngular)), attachmentIdentityResidual,
    centerIdentityResidual: norm(sub(centerTravel, vbar)), orthogonalityError: basisError(after.basis),
    massInertiaChange: Math.max(Math.abs(before.mass - after.mass), Math.abs(before.inertia - after.inertia)),
    angularPhase: h * norm(omegaMean), cayleyAngle: 2 * Math.atan(.5 * h * norm(omegaMean)) };
}
function contractViolations(ledger: Ledger): string[] {
  const result: string[] = [];
  // Physical absolute residuals and relative residual are both retained. The
  // stress inputs intentionally include very small inertias and large work.
  if (ledger.workResidualAbs > 5e-9 + 1e-11 * Math.max(1, ledger.energyBefore, ledger.energyAfter,
    Math.abs(ledger.pointWork) + Math.abs(ledger.centerWork) + Math.abs(ledger.coupleWork))) result.push('work');
  if (ledger.linearResidual > 1e-8) result.push('linear momentum');
  if (ledger.spinResidual > 1e-8) result.push('spin momentum');
  if (ledger.angularResidual > 1e-7) result.push('total angular momentum');
  if (ledger.attachmentIdentityResidual > 2e-9 || ledger.centerIdentityResidual > 2e-9) result.push('material-point kinematics');
  if (ledger.orthogonalityError > 1e-10) result.push('rigid geometry');
  if (ledger.massInertiaChange !== 0) result.push('material parameters changed');
  if (!Object.values(ledger).every(Number.isFinite)) result.push('nonfinite ledger');
  return result;
}

function rng(initial: number): () => number {
  let state = initial >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
const sampleVector = (u: () => number): Vec3 => ({ x: 2 * u() - 1, y: 2 * u() - 1, z: 2 * u() - 1 });
function originalInput(u: () => number): Input {
  // Preserve the original informal 2,000-case audit's draw order and input
  // generation. The pose helper is input generation, never a ledger oracle.
  const inertia = Math.exp(Math.log(.001) + u() * Math.log(20000)), dt = .001 + u() * .03;
  let body: MaterialRigidState = { mass: 2 + u() * 128, inertia,
    position: { x: 110 * u(), y: 53 * u(), z: 1 + u() }, velocity: sampleVector(u),
    angularMomentum: sampleVector(u), basis: identity() };
  body = rigidMidpointState(body, .5, body.velocity, body.angularMomentum);
  const local = sampleVector(u), impulse = sampleVector(u), target = .01 + .97 * u();
  const scale = target * 4 * inertia / (dt * norm(local) * norm(impulse));
  return { body, dt, loads: [{ id: 'stress-point', local, impulse: mul(impulse, scale) }], center: z(), couple: z() };
}
function randomBasis(u: () => number): RigidBasis {
  // Haar-uniform quaternion, independent of mass/inertia and the engine's
  // Cayley pose helper. Columns are the resulting actual material basis.
  const a = u(), b = 2 * Math.PI * u(), c = 2 * Math.PI * u();
  const x = Math.sqrt(1 - a) * Math.sin(b), y = Math.sqrt(1 - a) * Math.cos(b);
  const zz = Math.sqrt(a) * Math.sin(c), w = Math.sqrt(a) * Math.cos(c);
  return [{ x: 1 - 2 * (y * y + zz * zz), y: 2 * (x * y + w * zz), z: 2 * (x * zz - w * y) },
    { x: 2 * (x * y - w * zz), y: 1 - 2 * (x * x + zz * zz), z: 2 * (y * zz + w * x) },
    { x: 2 * (x * zz + w * y), y: 2 * (y * zz - w * x), z: 1 - 2 * (x * x + y * y) }];
}
function multiloadInput(u: () => number, target: number): Input {
  const inertia = Math.exp(Math.log(.001) + u() * Math.log(20000)), dt = .001 + u() * .03;
  const body: MaterialRigidState = { mass: 2 + u() * 128, inertia,
    position: { x: 110 * u(), y: 53 * u(), z: 1 + u() }, velocity: mul(sampleVector(u), 5),
    angularMomentum: mul(sampleVector(u), 8 * inertia), basis: randomBasis(u) };
  const count = 1 + Math.floor(u() * 4);
  const loads = Array.from({ length: count }, (_, i) => ({ id: `point-${i}`, local: sampleVector(u), impulse: sampleVector(u) }));
  const denominator = dt * loads.reduce((sum, load) => sum + norm(load.local) * norm(load.impulse), 0);
  const scale = target * 4 * inertia / denominator;
  for (const load of loads) load.impulse = mul(load.impulse, scale);
  return { body, dt, loads, center: mul(sampleVector(u), 10), couple: mul(sampleVector(u), inertia) };
}
const reflection = (v: Vec3): Vec3 => ({ x: -v.x, y: v.y, z: v.z });
const reflectionAxial = (v: Vec3): Vec3 => ({ x: v.x, y: -v.y, z: -v.z });
const translation: Vec3 = { x: 23, y: -11, z: 3 };
function transformInput(input: Input, kind: Transform): Input {
  const transformed = structuredClone(input);
  if (kind === 'translated') transformed.body.position = add(transformed.body.position, translation);
  if (kind === 'reflected') {
    transformed.body.position = reflection(transformed.body.position); transformed.body.velocity = reflection(transformed.body.velocity);
    transformed.body.angularMomentum = reflectionAxial(transformed.body.angularMomentum);
    transformed.body.basis = [mul(reflection(transformed.body.basis[0]), -1), reflection(transformed.body.basis[1]), reflection(transformed.body.basis[2])];
    transformed.loads = transformed.loads.map(load => ({ id: load.id, local: reflection(load.local), impulse: reflection(load.impulse) }));
    transformed.center = reflection(transformed.center); transformed.couple = reflectionAxial(transformed.couple);
  }
  return transformed;
}
function covariance(base: MaterialRigidState, other: MaterialRigidState, kind: Exclude<Transform, 'base'>): Record<string, number> {
  const expected = kind === 'translated' ? { ...base, position: add(base.position, translation) }
    : transformInput({ body: base, dt: 1, loads: [], center: z(), couple: z() }, 'reflected').body;
  return { position: norm(sub(expected.position, other.position)), velocity: norm(sub(expected.velocity, other.velocity)),
    angularMomentum: norm(sub(expected.angularMomentum, other.angularMomentum)),
    basis: Math.max(...expected.basis.map((axis, i) => norm(sub(axis, other.basis[i])))) };
}
interface Counts {
  inputs: number; trajectories: number; accepted: number; rejected: number; expectedRejects: number; unexpectedRejects: number;
  unexpectedAccepts: number; atomicRejectFailures: number; inputMutationFailures: number; contractViolations: number;
  covarianceStatusMismatches: number; covarianceViolations: number; maximumIterations: number;
  maxima: Record<string, number>; covarianceMaxima: Record<string, number>;
  rejectedReasons: Record<string, number>; inputSha256: string;
  firstRejectedInput: unknown | null; firstViolation: unknown | null;
}
const cohorts = {} as Record<Cohort, Counts>;
const inputHashes = {} as Record<Cohort, ReturnType<typeof createHash>>;
function initialize(cohort: Cohort): void {
  cohorts[cohort] = { inputs: 0, trajectories: 0, accepted: 0, rejected: 0, expectedRejects: 0, unexpectedRejects: 0,
    unexpectedAccepts: 0, atomicRejectFailures: 0, inputMutationFailures: 0, contractViolations: 0,
    covarianceStatusMismatches: 0, covarianceViolations: 0, maximumIterations: 0, maxima: {}, covarianceMaxima: {},
    rejectedReasons: {}, inputSha256: '', firstRejectedInput: null, firstViolation: null };
  inputHashes[cohort] = createHash('sha256');
}
const maximum = (into: Record<string, number>, key: string, value: number): void => { into[key] = Math.max(into[key] ?? 0, value); };
function runInput(cohort: Cohort, caseId: number, input: Input, expectRejected: boolean): void {
  const counts = cohorts[cohort]; counts.inputs++;
  let baseline: ReturnType<typeof advanceMaterialRigid> | null = null;
  for (const transform of ['base', 'translated', 'reflected'] as const) {
    const candidate = transformInput(input, transform), beforeJson = JSON.stringify(candidate.body);
    inputHashes[cohort].update(JSON.stringify(candidate)).update('\0'); counts.trajectories++;
    const independentBound = candidate.dt * candidate.loads.reduce((sum, load) => sum + norm(load.local) * norm(load.impulse), 0)
      / (4 * candidate.body.inertia);
    const options: MaterialRigidOptions = { pointImpulses: candidate.loads, centerImpulse: candidate.center, coupleImpulse: candidate.couple };
    const response = advanceMaterialRigid(candidate.body, candidate.dt, options);
    counts.maximumIterations = Math.max(counts.maximumIterations, response.report.iterations);
    const inputMutated = JSON.stringify(candidate.body) !== beforeJson;
    if (inputMutated) counts.inputMutationFailures++;
    const problems: string[] = inputMutated ? ['input mutation'] : [];
    if (response.report.accepted) {
      counts.accepted++;
      if (expectRejected) { counts.unexpectedAccepts++; problems.push('negative control accepted'); }
      const ledger = reconstruct(candidate, response.state);
      for (const [key, value] of Object.entries(ledger)) maximum(counts.maxima, key, Math.abs(value));
      const violations = contractViolations(ledger);
      if (violations.length) { counts.contractViolations++; problems.push(...violations); }
    } else {
      counts.rejected++;
      if (expectRejected) counts.expectedRejects++; else { counts.unexpectedRejects++; problems.push('certified under-bound case rejected'); }
      const reason = response.report.reason ?? 'unspecified'; counts.rejectedReasons[reason] = (counts.rejectedReasons[reason] ?? 0) + 1;
      const atomic = JSON.stringify(response.state) === beforeJson;
      if (!atomic) { counts.atomicRejectFailures++; problems.push('atomic rejection failed'); }
      if (!counts.firstRejectedInput) counts.firstRejectedInput = { caseId, transform, independentBound, reason, atomic, input: candidate };
    }
    if (transform === 'base') baseline = response;
    else if (baseline) {
      if (baseline.report.accepted !== response.report.accepted) { counts.covarianceStatusMismatches++; problems.push('covariant status mismatch'); }
      if (baseline.report.accepted && response.report.accepted) {
        const errors = covariance(baseline.state, response.state, transform);
        for (const [key, value] of Object.entries(errors)) maximum(counts.covarianceMaxima, key, value);
        if (Object.values(errors).some(value => value > 2e-8)) { counts.covarianceViolations++; problems.push('covariant state mismatch'); }
      }
    }
    if (problems.length && !counts.firstViolation) counts.firstViolation = { caseId, transform, independentBound, problems, input: candidate, output: response.state };
  }
}
for (const cohort of ['original-under-bound', 'arbitrary-basis-multiload', 'above-bound-negative-control'] as const) initialize(cohort);
const originalRng = rng(seed);
for (let i = 0; i < cases; i++) runInput('original-under-bound', i, originalInput(originalRng), false);
const extraRng = rng(seed ^ 0x5c709ab3);
for (let i = 0; i < multiloadCases; i++) runInput('arbitrary-basis-multiload', i, multiloadInput(extraRng, .01 + .97 * extraRng()), false);
const overRng = rng(seed ^ 0xa79301d5);
for (let i = 0; i < overCases; i++) runInput('above-bound-negative-control', i, multiloadInput(overRng, 1.001 + 2 * overRng()), true);
for (const cohort of Object.keys(cohorts) as Cohort[]) cohorts[cohort].inputSha256 = inputHashes[cohort].digest('hex');
const sourceSha256End = sourceVersion(), scriptSha256End = selfHash();
const sourceStable = sourceSha256Start === sourceSha256End, scriptStable = scriptSha256Start === scriptSha256End;
const failures = Object.values(cohorts).reduce((sum, c) => sum + c.unexpectedRejects + c.unexpectedAccepts + c.atomicRejectFailures
  + c.inputMutationFailures + c.contractViolations + c.covarianceStatusMismatches + c.covarianceViolations, 0);
const result = {
  schema: 'material-rigid-stress-v1', nodeVersion: process.version, seed, cases, overCases, multiloadCases,
  sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End, sourceStable, scriptStable,
  method: { originalPanel: 'Preserves the informal 2,000-case draw order and input generation; adds covariance transforms',
    secondaryPanel: 'Independent Haar-uniform basis, 1–4 material point loads, COM load and explicit couple',
    negativeControl: 'Sufficient local contraction bound B >= 1: expect atomic numeric rejection, not a strength limit',
    transforms: ['base', 'translated by (23,-11,3) yd', 'reflect x with angular momentum/couple as axial pseudovectors and unchanged point IDs'],
    independentlyReconstructed: ['full material kinetic energy', 'known impulse work from actual material-point displacement',
      'linear momentum', 'spin response at actual midpoint offsets', 'orbital plus spin angular momentum about fixed origin',
      'Cayley attachment identity', 'rigid orthonormality', 'atomic rejection and unchanged inputs', 'covariant states/status'],
    thresholds: { workAbs: '5e-9 + 1e-11 * max(1,Kbefore,Kafter,sum(abs(work channels)))', linearAbs: 1e-8,
      spinAbs: 1e-8, angularAbs: 1e-7, materialPointKinematicsAbs: 2e-9, orthonormalityAbs: 1e-10, covarianceAbs: 2e-8 },
    limits: 'Fixed external-impulse numerical stress only. B<1 certifies a unique standalone angular impulse root, not time accuracy of fast free spin. angularPhase and Cayley angle expose that limit; the physical driver needs local angular/chord and first-hit checks. No gravity, normal/traction solve, joint capacity, gait, fall, or World readiness is validated.' },
  cohorts, failures,
};
mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ destination, sourceStable, scriptStable, failures, cohorts: Object.fromEntries(Object.entries(cohorts)
  .map(([name, c]) => [name, { inputs: c.inputs, accepted: c.accepted, expectedRejects: c.expectedRejects,
    unexpectedRejects: c.unexpectedRejects, contractViolations: c.contractViolations, maxima: c.maxima, covarianceMaxima: c.covarianceMaxima }])) }));
if (!sourceStable || !scriptStable || failures) process.exitCode = 1;
