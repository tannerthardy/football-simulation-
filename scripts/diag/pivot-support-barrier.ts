/** A deliberately unsupported pivot: endpoint position/work is insufficient.
 * Node 22: node --import tsx scripts/diag/pivot-support-barrier.ts [output.json]
 * This queries the existing rigid interval map; it does not enable point support.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { advanceMaterialRigid, identityRigidBasis, type MaterialRigidState, type Vec3 } from '../../src/physics/material-rigid.js';
import { sourceVersion } from '../source-version.js';

if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Use pinned Node 22');
const self = fileURLToPath(import.meta.url);
const scriptHash = () => createHash('sha256').update(readFileSync(self)).digest('hex');
const sourceSha256Start = sourceVersion(), scriptSha256Start = scriptHash();
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (a: Vec3) => Math.hypot(a.x, a.y, a.z);
const local = { x: .3, y: 0, z: -1 }, gravity = { x: 0, y: 0, z: -10 };
const before: MaterialRigidState = { mass: 1, inertia: 1, position: { x: 0, y: 0, z: 1 },
  velocity: { x: 0, y: 0, z: .6 }, angularMomentum: { x: 0, y: 2, z: 0 }, basis: identityRigidBasis() };
const offset = (b: MaterialRigidState) => add(add(scale(b.basis[0], local.x), scale(b.basis[1], local.y)), scale(b.basis[2], local.z));
const point = (b: MaterialRigidState) => add(b.position, offset(b));
const velocity = (b: MaterialRigidState) => add(b.velocity, cross(scale(b.angularMomentum, 1 / b.inertia), offset(b)));
const energy = (b: MaterialRigidState) => .5 * b.mass * dot(b.velocity, b.velocity)
  + .5 * dot(b.angularMomentum, b.angularMomentum) / b.inertia - b.mass * dot(gravity, b.position);
const angular = (b: MaterialRigidState) => add(cross(b.position, scale(b.velocity, b.mass)), b.angularMomentum);
const rows = [];
for (const h of [.2, .1, .05, .025]) {
  const trial = (normal: number) => {
    const result = advanceMaterialRigid(before, h, { centerImpulse: scale(gravity, h * before.mass),
      pointImpulses: [{ id: 'pivot', local, impulse: { x: 0, y: 0, z: normal } }], tolerance: 1e-12 });
    if (!result.report.accepted) throw new Error(`Rigid candidate rejected: ${result.report.reason}`);
    return result;
  };
  let lo = 0, hi = 3 * h / .2;
  if (!(point(trial(lo).state).z < 0 && point(trial(hi).state).z > 0)) throw new Error('Missing pivot gap bracket');
  for (let i = 0; i < 80; i++) {
    const middle = .5 * (lo + hi);
    if (middle === lo || middle === hi) break;
    if (point(trial(middle).state).z > 0) hi = middle; else lo = middle;
  }
  const normal = .5 * (lo + hi), after = trial(normal).state;
  const j = { x: 0, y: 0, z: normal }, p0 = point(before), p1 = point(after);
  const groundWork = dot(j, scale(sub(p1, p0), 1 / h));
  const energyResidual = energy(after) - energy(before) - groundWork;
  const linearResidual = norm(sub(scale(sub(after.velocity, before.velocity), before.mass), add(j, scale(gravity, before.mass * h))));
  const centerMean = scale(add(before.position, after.position), .5), pointMean = scale(add(p0, p1), .5);
  const angularResidual = norm(sub(sub(angular(after), angular(before)),
    add(cross(pointMean, j), cross(centerMean, scale(gravity, before.mass * h)))));
  rows.push({ h, normalImpulse: normal, endpointGap: p1.z, endpointPointNormalVelocity: velocity(after).z,
    chordNormalVelocity: (p1.z - p0.z) / h, groundWork, energyResidual, linearResidual, angularResidual, after });
}
const sourceSha256End = sourceVersion(), scriptSha256End = scriptHash();
if (sourceSha256Start !== sourceSha256End || scriptSha256Start !== scriptSha256End) throw new Error('Source changed during diagnostic');
const contractViolations = rows.filter(r => r.normalImpulse < 0 || Math.abs(r.endpointGap) > 1e-10
  || Math.abs(r.energyResidual) > 1e-10 || r.linearResidual > 1e-10 || r.angularResidual > 1e-10);
const barrierReproduced = rows[0].endpointPointNormalVelocity < -.02;
const output = { sourceSha256Start, sourceSha256End, scriptSha256Start, scriptSha256End,
  node: process.version, before, local, gravity, initialPointNormalVelocity: velocity(before).z,
  rows, independentContractViolations: contractViolations.length, barrierReproduced,
  scope: 'Unsupported one-point pivot under the existing Cayley endpoint-gap map. Positive normal impulse and closed work do not imply zero endpoint material-point normal velocity. No support API, lifecycle or World selection changed.' };
if (process.argv[2]) { mkdirSync(dirname(process.argv[2]), { recursive: true }); writeFileSync(process.argv[2], JSON.stringify(output, null, 2) + '\n'); }
console.log(JSON.stringify({ sourceSha256Start, barrierReproduced, independentContractViolations: contractViolations.length,
  rows: rows.map(({ after: _after, ...row }) => row), output: process.argv[2] ?? null }, null, 2));
if (contractViolations.length || !barrierReproduced) process.exitCode = 1;
