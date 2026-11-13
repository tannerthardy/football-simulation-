/** Independent force/work references for persistent sole shear. No football tuning. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceVersion } from '../source-version.js';
import { advanceSoleShear, type SoleShearLaw } from '../../src/physics/sole-shear.js';
import type { Vec2 } from '../../src/core/vec.js';

if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Run with pinned Node 22');
if (process.argv.length > 3 || process.argv[2]?.startsWith('--')) throw new Error('Specify at most one output path');
const output = process.argv[2] ?? 'out/sole-shear-stress.json';
const scriptPath = fileURLToPath(import.meta.url);
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const sourceSha256Start = sourceVersion(), scriptSha256Start = sha(readFileSync(scriptPath));
const vec = (x = 0, y = 0): Vec2 => ({ x, y });
const plus = (a: Vec2, b: Vec2): Vec2 => vec(a.x + b.x, a.y + b.y);
const minus = (a: Vec2, b: Vec2): Vec2 => vec(a.x - b.x, a.y - b.y);
const times = (a: Vec2, q: number): Vec2 => vec(a.x * q, a.y * q);
const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
const norm = (a: Vec2): number => Math.hypot(a.x, a.y);
const error = (a: Vec2, b: Vec2): number => norm(minus(a, b));
const rotate = (a: Vec2, angle: number): Vec2 => vec(a.x * Math.cos(angle) - a.y * Math.sin(angle), a.x * Math.sin(angle) + a.y * Math.cos(angle));
const reflect = (a: Vec2): Vec2 => vec(-a.x, a.y);
const violations: string[] = [];
let calls = 0, maxWorkResidual = 0, maxCapacityExcess = 0;
interface Fixture { name: string; stretch: Vec2; displacement: Vec2; h: number; law: SoleShearLaw }
interface Reference { stretch: Vec2; forceIntegral: Vec2; dissipation: number }
function evaluate(f: Fixture) {
  calls++;
  const result = advanceSoleShear(f.stretch, f.displacement, f.h, f.law,
    { absoluteTolerance: 1e-12, relativeTolerance: 1e-10 });
  if (!result.report.accepted) { violations.push(`${f.name}: rejected ${result.report.reason}`); return result; }
  // Reconstruct energy and capacity from inputs and returned state, not ledgers.
  const u0 = .5 * f.law.stiffness * dot(f.stretch, f.stretch);
  const u1 = .5 * f.law.stiffness * dot(result.stretch, result.stretch);
  const work = -dot(result.report.forceIntegral, times(f.displacement, 1 / f.h));
  const residual = work + u1 - u0 + result.report.totalDissipation;
  const cap = f.h * (f.law.capacityBefore + f.law.capacityAfter) / 2;
  const excess = norm(result.report.forceIntegral) - cap;
  maxWorkResidual = Math.max(maxWorkResidual, Math.abs(residual));
  maxCapacityExcess = Math.max(maxCapacityExcess, excess);
  if (Math.abs(residual) > 1e-8 * Math.max(1, u0, u1, Math.abs(work))) violations.push(`${f.name}: work residual ${residual}`);
  if (excess > 1e-11 * Math.max(1, cap)) violations.push(`${f.name}: capacity exceeded ${excess}`);
  if (result.report.totalDissipation < -1e-12) violations.push(`${f.name}: negative dissipation`);
  return result;
}
function compare(f: Fixture, r: Reference, tolerance: number) {
  const result = evaluate(f);
  const differences = { stretch: error(result.stretch, r.stretch), impulse: error(result.report.forceIntegral, r.forceIntegral),
    dissipation: Math.abs(result.report.totalDissipation - r.dissipation) };
  if (Object.values(differences).some(e => !(e <= tolerance))) violations.push(`${f.name}: independent error ${JSON.stringify(differences)}, tolerance ${tolerance}`);
  return { input: f, expected: r, differences, tolerance, result };
}
const law = (k: number, R0: number, R1 = R0): SoleShearLaw => ({ stiffness: k, capacityBefore: R0, capacityAfter: R1 });
const exact = [
  compare({ name: 'elastic', stretch: vec(.05, .02), displacement: vec(.03, -.01), h: .02, law: law(100, 20) },
    { stretch: vec(.08, .01), forceIntegral: vec(.13, .03), dissipation: 0 }, 1e-11),
  compare({ name: 'interior-yield', stretch: vec(), displacement: vec(.05, 0), h: .05, law: law(100, 2) },
    { stretch: vec(.02, 0), forceIntegral: vec(.08, 0), dissipation: .06 }, 1e-11),
  compare({ name: 'elastic-unloading-positive-foot-work', stretch: vec(.02, 0), displacement: vec(-.01, 0), h: .05, law: law(100, 2) },
    { stretch: vec(.01, 0), forceIntegral: vec(.075, 0), dissipation: 0 }, 1e-11),
  compare({ name: 'reverse-unload-reload', stretch: vec(.02, 0), displacement: vec(-.08, 0), h: .05, law: law(100, 2) },
    { stretch: vec(-.02, 0), forceIntegral: vec(-.05, 0), dissipation: .08 }, 1e-11),
  compare({ name: 'stationary-capacity-release', stretch: vec(.02, 0), displacement: vec(), h: .05, law: law(100, 2, 0) },
    { stretch: vec(), forceIntegral: vec(.05, 0), dissipation: .02 }, 1e-11),
  compare({ name: 'zero-cap-birth-elastic', stretch: vec(), displacement: vec(.05, 0), h: .05, law: law(100, 0, 10) },
    { stretch: vec(.05, 0), forceIntegral: vec(.125, 0), dissipation: 0 }, 1e-11),
  compare({ name: 'zero-cap-birth-yielded', stretch: vec(), displacement: vec(.05, 0), h: .05, law: law(100, 0, 1) },
    { stretch: vec(.01, 0), forceIntegral: vec(.025, 0), dissipation: .02 }, 1e-11),
  compare({ name: 'initial-cap-return', stretch: vec(.04, 0), displacement: vec(), h: .05, law: law(100, 2) },
    { stretch: vec(.02, 0), forceIntegral: vec(.1, 0), dissipation: .06 }, 1e-11),
  compare({ name: 'zero-cap-return-no-air-traction', stretch: vec(.04, 0), displacement: vec(.05, 0), h: .05, law: law(100, 0) },
    { stretch: vec(), forceIntegral: vec(), dissipation: .08 }, 1e-11),
  compare({ name: 'tiny-slip-capacity-collapse-layer', stretch: vec(.001 / (400 * Math.sqrt(2)), .001 / (400 * Math.sqrt(2))),
    displacement: vec(1e-15, 0), h: 1, law: law(400, .001, 0) },
    { stretch: vec(), forceIntegral: vec(.0005 / Math.sqrt(2), .0005 / Math.sqrt(2)), dissipation: 1.25e-9 }, 1e-12),
];

// Independent closed form for the full plastic, constant-capacity trajectory.
// Integrating tanh/sech exactly catches narrow turning layers that both
// ordinary quadrature orders can miss while their common energy check passes.
const logCosh = (u: number) => Math.abs(u) + Math.log1p(Math.exp(-2 * Math.abs(u))) - Math.log(2);
const sechPrimitive = (u: number) => 2 * Math.atan(Math.tanh(u / 2));
const constantPlastic = [0, .2, .75, 1.3, Math.PI / 2].flatMap(angle => [1e-6, .01, .3, 4, 100, 1e6].map(phase => {
  const R = 2, k = 100, speed = .7, h = phase * R / (k * speed);
  const c0 = Math.cos(angle), a = k * speed / R;
  let expectedForce: Vec2, expectedStretch: Vec2;
  if (angle === 0) { expectedForce = vec(R * h, 0); expectedStretch = vec(R / k, 0); }
  else {
    const u0 = Math.atanh(Math.min(1 - Number.EPSILON, c0)), u1 = u0 + phase;
    expectedForce = vec(R / a * (logCosh(u1) - logCosh(u0)), R / a * (sechPrimitive(u1) - sechPrimitive(u0)));
    expectedStretch = vec(R / k * Math.tanh(u1), R / k / Math.cosh(u1));
  }
  const f: Fixture = { name: `constant-R/angle${angle}/phase${phase}`, stretch: vec(R / k * Math.cos(angle), R / k * Math.sin(angle)),
    displacement: vec(speed * h, 0), h, law: law(k, R) };
  return compare(f, { stretch: expectedStretch, forceIntegral: expectedForce, dissipation: speed * expectedForce.x }, 2e-9);
}));

// Independent fine incremental plastic-return reference, deliberately using
// neither the production half-angle solution nor its quadrature coordinates.
// This method is first order at yield: preserve its refinement difference.
function incrementalReference(f: Fixture, steps: number): Reference {
  const k = f.law.stiffness, dt = f.h / steps, dp = times(f.displacement, 1 / steps);
  const initialForce = times(f.stretch, k), initialLength = norm(initialForce);
  let force = initialLength > f.law.capacityBefore
    ? times(initialForce, f.law.capacityBefore / initialLength) : initialForce;
  let dissipation = (dot(initialForce, initialForce) - dot(force, force)) / (2 * k);
  let forceIntegral = vec();
  for (let i = 0; i < steps; i++) {
    const trial = plus(force, times(dp, k)), R = f.law.capacityBefore + (f.law.capacityAfter - f.law.capacityBefore) * (i + 1) / steps;
    const length = norm(trial), next = length > R ? times(trial, R / length) : trial;
    forceIntegral = plus(forceIntegral, times(plus(force, next), dt / 2));
    const plasticMovement = minus(dp, times(minus(next, force), 1 / k));
    // End-force dotted with plastic displacement is a direct flow-work sum,
    // not an energy-difference definition of dissipation.
    dissipation += dot(next, plasticMovement);
    force = next;
  }
  return { stretch: times(force, 1 / k), forceIntegral, dissipation };
}
const affineInputs: Fixture[] = [
  ...[vec(.01, .018), vec(-.018, .005), vec(), vec(.025, -.018)].flatMap((stretch, i) => [0, .4, 2, 8].map(R1 => ({
    name: `affine/initial${i}/R1${R1}`, stretch, displacement: vec(.09, .065), h: .12, law: law(100, 2, R1),
  }))),
  { name: 'shrinking-antiparallel', stretch: vec(-.02, 0), displacement: vec(.004, 0), h: .1, law: law(100, 2, 0) },
  { name: 'almost-constant-capacity', stretch: vec(0, .75), displacement: vec(1, 0), h: 1, law: law(2, 1.5, 1.5000000000000002) },
];
const affine = affineInputs.map(f => {
  const coarse = incrementalReference(f, 32768), fine = incrementalReference(f, 65536);
  const difference = { stretch: error(coarse.stretch, fine.stretch), impulse: error(coarse.forceIntegral, fine.forceIntegral),
    dissipation: Math.abs(coarse.dissipation - fine.dissipation) };
  const tolerance = 4 * Math.max(...Object.values(difference)) + 1e-9;
  return { ...compare(f, fine, tolerance), referenceMethod: 'incremental radial plastic return; independent end-force flow work',
    referenceSteps: [32768, 65536], referenceRefinementDifference: difference };
});
const covariance = affineInputs.map(f => {
  const base = evaluate(f), angle = .81;
  const spun = evaluate({ ...f, name: `${f.name}/rotate`, stretch: rotate(f.stretch, angle), displacement: rotate(f.displacement, angle) });
  const mirrored = evaluate({ ...f, name: `${f.name}/mirror`, stretch: reflect(f.stretch), displacement: reflect(f.displacement) });
  const weights = [.13, .27, .6];
  const split = weights.map((w, i) => evaluate({ ...f, name: `${f.name}/area${i}`, law: law(f.law.stiffness * w, f.law.capacityBefore * w, f.law.capacityAfter * w) }));
  const first = evaluate({ ...f, name: `${f.name}/half1`, displacement: times(f.displacement, .5), h: f.h / 2,
    law: law(f.law.stiffness, f.law.capacityBefore, (f.law.capacityBefore + f.law.capacityAfter) / 2) });
  const second = evaluate({ ...f, name: `${f.name}/half2`, stretch: first.stretch, displacement: times(f.displacement, .5), h: f.h / 2,
    law: law(f.law.stiffness, (f.law.capacityBefore + f.law.capacityAfter) / 2, f.law.capacityAfter) });
  const diffs = {
    rotation: Math.max(error(rotate(base.stretch, angle), spun.stretch), error(rotate(base.report.forceIntegral, angle), spun.report.forceIntegral),
      Math.abs(base.report.totalDissipation - spun.report.totalDissipation)),
    reflection: Math.max(error(reflect(base.stretch), mirrored.stretch), error(reflect(base.report.forceIntegral), mirrored.report.forceIntegral),
      Math.abs(base.report.totalDissipation - mirrored.report.totalDissipation)),
    weightedSplit: Math.max(error(base.report.forceIntegral, split.reduce((p, r) => plus(p, r.report.forceIntegral), vec())),
      Math.abs(base.report.totalDissipation - split.reduce((n, r) => n + r.report.totalDissipation, 0)), ...split.map(r => error(base.stretch, r.stretch))),
    subdivision: Math.max(error(base.stretch, second.stretch), error(base.report.forceIntegral, plus(first.report.forceIntegral, second.report.forceIntegral)),
      Math.abs(base.report.totalDissipation - first.report.totalDissipation - second.report.totalDissipation)),
  };
  if (Object.values(diffs).some(e => e > 2e-9)) violations.push(`${f.name}: covariance/subdivision ${JSON.stringify(diffs)}`);
  return { name: f.name, differences: diffs };
});
const budgetInput = vec(0, .2);
const budget = advanceSoleShear(budgetInput, vec(.2, 0), .2, law(10, 2),
  { absoluteTolerance: 1e-30, relativeTolerance: 1e-30, maxEvaluations: 48, maxDepth: 0 });
if (budget.report.accepted || error(budget.stretch, budgetInput) !== 0) violations.push('Budget rejection not atomic');

const sourceSha256End = sourceVersion(), scriptSha256End = sha(readFileSync(scriptPath));
if (sourceSha256Start !== sourceSha256End || scriptSha256Start !== scriptSha256End) throw new Error('Source/script changed during diagnostic; rerun');
const report = { schema: 'sole-shear-independent-reference-v1', generatedAt: new Date().toISOString(), node: process.versions.node,
  provenance: { sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End },
  scope: 'Isolated material shear law along a constant chord and affine capacity; no body integration, gait, World, or NFL material calibration',
  summary: { calls, violations: violations.length, maxWorkResidual, maxCapacityExcess }, exact, constantPlastic, affine, covariance,
  expectedRejections: { insufficientBudget: budget }, violations };
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, ...report.summary }));
if (violations.length) process.exitCode = 1;
