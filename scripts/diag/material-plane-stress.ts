/** Independent analytic/Rodrigues audit of candidate geometry, not events.
 * Node 22: node --import tsx scripts/diag/material-plane-stress.ts [output.json]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMaterialPlaneCandidate, inspectMaterialPlane, type MaterialPlane, type MaterialPlaneReport } from '../../src/physics/material-plane.js';
import { identityRigidBasis, rigidMidpointState, type MaterialRigidState, type Vec3, type RigidBasis } from '../../src/physics/material-rigid.js';
import { sourceVersion } from '../source-version.js';

if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Run with pinned Node 22');
const self = fileURLToPath(import.meta.url), selfHash = () => createHash('sha256').update(readFileSync(self)).digest('hex');
const sourceSha256Start = sourceVersion(), scriptSha256Start = selfHash();
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (a: Vec3) => Math.hypot(a.x, a.y, a.z);
const reflect = (a: Vec3): Vec3 => ({ x: -a.x, y: a.y, z: a.z });
const rotate = (a: Vec3): Vec3 => ({ x: a.z, y: a.x, z: a.y });
const options = { timeTolerance: 1e-8, gapTolerance: 1e-9, maxNodes: 20000, maxDepth: 48 };
interface Input { before: MaterialRigidState; after: MaterialRigidState; h: number; local: Vec3; plane: MaterialPlane }
/** Separate Rodrigues construction; does not use the root/coefficient module. */
function gap(input: Input, time: number): number {
  const { before, after, local, plane } = input;
  const r = add(add(scale(before.basis[0], local.x), scale(before.basis[1], local.y)), scale(before.basis[2], local.z));
  const v = scale(add(before.velocity, after.velocity), .5), w = scale(add(before.angularMomentum, after.angularMomentum), .5 / before.inertia);
  const speed = norm(w), axis = speed === 0 ? { x: 0, y: 0, z: 0 } : scale(w, 1 / speed), angle = 2 * Math.atan(.5 * time * speed);
  const rotated = speed === 0 ? r : add(add(scale(r, Math.cos(angle)), scale(cross(axis, r), Math.sin(angle))), scale(axis, dot(axis, r) * (1 - Math.cos(angle))));
  return (dot(plane.normal, add(add(before.position, scale(v, time)), rotated)) - plane.height) / norm(plane.normal);
}
const contained = (r: MaterialPlaneReport, time: number, uncertainty = 1e-10): boolean =>
  r.roots.some(b => b.lo - uncertainty <= time && b.hi + uncertainty >= time);
const plane = { normal: { x: 0, y: 0, z: 1 }, height: 0 };
function analyticInput(z: number, local: Vec3, vz: number, h: number): Input {
  const before: MaterialRigidState = { mass: 2, inertia: 1, position: { x: 0, y: 0, z },
    velocity: { x: 0, y: 0, z: vz }, angularMomentum: { x: 2, y: 0, z: 0 }, basis: identityRigidBasis() };
  return { before, after: rigidMidpointState(before, h, before.velocity, before.angularMomentum), h, local, plane };
}
const analyticFixtures = [
  { id: 'hidden-cross-return', input: analyticInput(.5, { x: 0, y: -1, z: 0 }, 0, 4), roots: [2 - Math.sqrt(3), 2 + Math.sqrt(3)], penetration: true },
  { id: 'double-grazing', input: analyticInput(1, { x: 0, y: -1, z: 0 }, 0, 2), roots: [1], penetration: false },
  { id: 'triple-crossing', input: analyticInput(2, { x: 0, y: -1, z: -1 }, -1, 2), roots: [1], penetration: true },
  { id: 'three-crossings', input: analyticInput(51 / 64, { x: 0, y: 5 / 32, z: -45 / 64 }, -1, 1), roots: [.25, .5, .75], penetration: true },
];
const violations: Array<{ id: string; issues: string[]; input: Input; report: MaterialPlaneReport }> = [];
const analytic = analyticFixtures.map(f => {
  const report = inspectMaterialPlane(createMaterialPlaneCandidate(f.input.before, f.input.after, f.input.h, f.input.local, f.input.plane), options);
  const issues: string[] = [];
  if (f.roots.some(t => !contained(report, t))) issues.push('Analytic root not retained');
  if (report.penetrationBeyondTolerance.certain !== f.penetration) issues.push('Analytic penetration mismatch');
  if (f.id === 'double-grazing' && report.status !== 'ambiguous') issues.push('Unjustified grazing acceptance');
  if (issues.length) violations.push({ id: f.id, issues, input: f.input, report });
  return { id: f.id, input: f.input, expectedRoots: f.roots, report };
});
const seed = 73431;
let rng = seed;
const random = () => ((rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 4294967296);
const randomVector = (size: number): Vec3 => ({ x: size * (random() - .5), y: size * (random() - .5), z: size * (random() - .5) });
const fixtures: Input[] = [], trials = [];
const summary = { cases: 200, variants: 4, completed: 0, sampledPoints: 0, sampledSignCrossings: 0,
  unsupported: 0, maxGapReconstructionError: 0, maxCovarianceGapError: 0, maxNodes: 0,
  statuses: {} as Record<string, number> };
for (let index = 0; index < 200; index++) {
  const inertia = .008 + random() * .1, position = randomVector(4), velocity = randomVector(8);
  const before: MaterialRigidState = { mass: 1 + random() * 4, inertia, position, velocity,
    angularMomentum: scale(randomVector(40), inertia), basis: identityRigidBasis() };
  const h = .01 + .5 * random(), after = rigidMidpointState(before, h, add(velocity, randomVector(4)), scale(randomVector(40), inertia));
  const local = randomVector(.5), direction = randomVector(2), normal = scale(direction, 1 / norm(direction));
  const input = { before, after, h, local, plane: { normal, height: dot(normal, position) + .8 * (random() - .5) } };
  fixtures.push(input);
  const shift = { x: 37, y: -11, z: 8 };
  const reflectedBefore: MaterialRigidState = { ...before, position: reflect(before.position), velocity: reflect(before.velocity),
    angularMomentum: scale(reflect(before.angularMomentum), -1) };
  const reflectedAfter = rigidMidpointState(reflectedBefore, h, reflect(after.velocity), scale(reflect(after.angularMomentum), -1));
  const rotatedBefore: MaterialRigidState = { ...before, position: rotate(before.position), velocity: rotate(before.velocity),
    angularMomentum: rotate(before.angularMomentum), basis: before.basis.map(rotate) as RigidBasis };
  const rotatedAfter = rigidMidpointState(rotatedBefore, h, rotate(after.velocity), rotate(after.angularMomentum));
  const variants: Array<[string, Input]> = [
    ['base', input],
    ['translated-scaled-plane', { ...input, before: { ...before, position: add(before.position, shift) }, after: { ...after, position: add(after.position, shift) },
      plane: { normal: scale(normal, 7), height: 7 * (input.plane.height + dot(normal, shift)) } }],
    ['reflected', { ...input, before: reflectedBefore, after: reflectedAfter, local: reflect(local), plane: { ...input.plane, normal: reflect(normal) } }],
    ['rotated', { ...input, before: rotatedBefore, after: rotatedAfter, plane: { ...input.plane, normal: rotate(normal) } }],
  ];
  for (const [variant, trial] of variants) {
    const candidate = createMaterialPlaneCandidate(trial.before, trial.after, h, trial.local, trial.plane), report = inspectMaterialPlane(candidate, options);
    const issues: string[] = [], independentRoots: number[] = [];
    summary.completed++; summary.maxNodes = Math.max(summary.maxNodes, report.nodes);
    summary.statuses[report.status] = (summary.statuses[report.status] ?? 0) + 1;
    if (report.status === 'unsupported') { summary.unsupported++; issues.push('Unexpected ordinary geometry budget rejection'); }
    let minimumSampleGap = Infinity, previous = gap(trial, 0), previousTime = 0;
    for (let sample = 0; sample <= 200; sample++) {
      const time = h * sample / 200, u = time / h, actualGap = gap(trial, time);
      const c = candidate.coefficients.map(c => .5 * (c.lo + c.hi)), q = .5 * (candidate.denominatorQuadratic.lo + candidate.denominatorQuadratic.hi);
      const polynomialGap = (((c[3] * u + c[2]) * u + c[1]) * u + c[0]) / (1 + q * u * u) / norm(trial.plane.normal);
      summary.maxGapReconstructionError = Math.max(summary.maxGapReconstructionError, Math.abs(actualGap - polynomialGap));
      summary.maxCovarianceGapError = Math.max(summary.maxCovarianceGapError, Math.abs(actualGap - gap(input, time)));
      summary.sampledPoints++; minimumSampleGap = Math.min(minimumSampleGap, actualGap);
      if (sample > 0 && actualGap * previous < 0 && Math.min(Math.abs(actualGap), Math.abs(previous)) > 1e-10) {
        let lo = previousTime, hi = time, sign = previous;
        for (let refinement = 0; refinement < 50; refinement++) {
          const midpoint = .5 * (lo + hi), value = gap(trial, midpoint);
          if (value * sign > 0) lo = midpoint; else hi = midpoint;
        }
        const root = .5 * (lo + hi); independentRoots.push(root); summary.sampledSignCrossings++;
        if (!contained(report, root)) issues.push('Independent sign crossing not retained');
      }
      previous = actualGap; previousTime = time;
    }
    if (minimumSampleGap < -1e-7 && !report.penetrationBeyondTolerance.certain) issues.push('Clear independent negative witness lacks penetration flag');
    if (issues.length) violations.push({ id: `${index}:${variant}`, issues, input: trial, report });
    trials.push({ fixture: index, variant, report, independentRoots, minimumSampleGap });
  }
}
if (summary.maxGapReconstructionError > 1e-10 || summary.maxCovarianceGapError > 1e-10) throw new Error('Independent geometry reconstruction/covariance failed');
const sourceSha256End = sourceVersion(), scriptSha256End = selfHash();
if (sourceSha256Start !== sourceSha256End || scriptSha256Start !== scriptSha256End) throw new Error('Source changed during diagnostic');
const output = { sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End, node: process.version,
  options, seed, summary, analytic, fixtures, trials, violations,
  scope: 'Outward candidate-geometry enclosures only. Independent Rodrigues samples test reconstruction and sampled sign crossings; sampling is not a proof of all roots. Analytic fixtures test hidden/repeated roots. No physical event acceptance, prefix solve, support force history, gait or World integration.' };
if (process.argv[2]) { mkdirSync(dirname(process.argv[2]), { recursive: true }); writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + '\n'); }
console.log(JSON.stringify({ sourceSha256Start, summary, analytic: analytic.map(a => ({ id: a.id, status: a.report.status, roots: a.report.roots })),
  independentViolations: violations.length, output: process.argv[2] ?? null }, null, 2));
if (violations.length) process.exitCode = 1;
