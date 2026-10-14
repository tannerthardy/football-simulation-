/** Exact saved contact input, with only ground selection decoupled. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { readWitness, reflectWitness, replayKeeper, stateError, witnessPath } from './keeper-contact-law.js';

const w = readWitness();
const baseline = replayKeeper(w, 'center');
const nativeError = stateError(baseline.bodies, w.expectedAfter);
assert(nativeError < 1e-12, 'Retain the exact native center step first');
const isolated = replayKeeper(w, 'patch', { groundMovement: 'legacy' });
const fullPatch = replayKeeper(w, 'patch');
const controls = [];
for (const mirror of [false, true]) for (const substeps of [1, 12, 48]) {
  const source = mirror ? reflectWitness(w) : w;
  const result = replayKeeper(source, 'patch', { groundMovement: 'legacy', free: true, substeps });
  assert(result.clean);
  assert(Math.abs(result.angularChange) < 1e-8);
  assert(result.linearResidual < 1e-10);
  controls.push({ mirror, substeps, ...result });
}
const budgets = (r: ReturnType<typeof replayKeeper>) => {
  for (const q of r.reports) {
    assert(Math.abs(q.work.residual) < 1e-8);
    q.armImpulse.forEach((v, i) => assert(v <= q.armImpulseLimit[i] + 1e-9));
    q.armWork.forEach((v, i) => assert(v <= q.armWorkLimit[i] + 1e-9));
    q.supportMotorWork.forEach((v, i) => assert(v <= q.supportMotorWorkLimit[i] + 1e-9));
  }
};
for (const r of [baseline, isolated, fullPatch, ...controls]) budgets(r);
assert(isolated.joints.some(j => Math.abs(j.momentOnA ?? 0) > 1 && Math.abs(j.momentOnB ?? 0) > 1), 'Real delivered force-point torque must remain');
const result = { protocol: 'contact-isolation-mechanics-v1',
  witnessSha256: createHash('sha256').update(readFileSync(witnessPath)).digest('hex'),
  worldSha256: createHash('sha256').update(readFileSync('src/physics/world.ts')).digest('hex'),
  nativeError, baseline, isolated, fullPatch, controls,
  scope: 'Common contact law with legacy ground. Native angular change includes external ground torque; free controls isolate the internal law. No PR #7 timing or controller repair.' };
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ nativeError,
  isolatedHands: isolated.joints, freeMaximumAngularChange: Math.max(...controls.map(r => Math.abs(r.angularChange))),
  nativeWorkResidual: isolated.reports[0].work.residual }));
