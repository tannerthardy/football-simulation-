/** Existing contact operator on one acquired pose and opposing controls.
 * The physics owner establishes retention eligibility; this changes no law. */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { replayKeeper, stateError, type KeeperWitness } from './keeper-contact-law.js';

const manifest = JSON.parse(readFileSync('docs/reviews/ace-lateral-retention-controls.json', 'utf8')) as {
  witness: KeeperWitness;
};
const w = manifest.witness;
const retained = replayKeeper(w, 'patch', { groundMovement: 'legacy' });
const nativeError = stateError(retained.bodies, w.expectedAfter);
assert(nativeError < 1e-12, 'Retained pair must reproduce the exact native pose/velocity/spin');
assert.equal(retained.joints[0].normalForce, 0, 'This is genuinely zero compression');
assert(Math.abs(retained.joints[0].tangentForce!) > 1);
const clearedInput = structuredClone(w);
clearedInput.jointInputs = [];
const cleared = replayKeeper(clearedInput, 'patch', { groundMovement: 'legacy' });
assert.equal(cleared.joints.length, 0);
assert(cleared.reports[0].armImpulse.every(x => x === 0));
assert(cleared.reports[0].armWork.every(x => x === 0));
assert.equal(cleared.reports[0].work.hands, 0);
const unreachableInput = structuredClone(w);
const [a, b] = unreachableInput.beforeBodies;
const dx = a.pos.x - b.pos.x, dy = a.pos.y - b.pos.y, distance = Math.hypot(dx, dy);
a.pos.x += 3 * dx / distance;
a.pos.y += 3 * dy / distance;
const unreachableDistance = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
const generousReach = a.profile.radius + b.profile.radius + a.profile.reach + b.profile.reach;
assert(unreachableDistance > generousReach);
const stale = replayKeeper(unreachableInput, 'patch', { groundMovement: 'legacy' });
const unreachableCleared = structuredClone(unreachableInput);
unreachableCleared.jointInputs = [];
const unreachableNoJoint = replayKeeper(unreachableCleared, 'patch', { groundMovement: 'legacy' });
const rows = [retained, cleared, stale, unreachableNoJoint];
for (const row of rows) for (const report of row.reports) {
  assert.equal(report.contacts.length, 0);
  assert.equal(report.strikes.length, 0);
  assert(Math.abs(report.work.residual) < 1e-8);
  report.armImpulse.forEach((x, i) => assert(x <= report.armImpulseLimit[i] + 1e-9));
  report.armWork.forEach((x, i) => assert(x <= report.armWorkLimit[i] + 1e-9));
  report.supportMotorWork.forEach((x, i) => assert(x <= report.supportMotorWorkLimit[i] + 1e-9));
}
const result = { protocol: 'ace-retention-control-replay-v1', nativeError, unreachableDistance, generousReach,
  retained, cleared, stale, unreachableNoJoint,
  scope: 'Operator and diagnostic controls only. Native retained state is reachable and previously acquired; owner must decide physical retention. Stale unreachable joint is deliberately injected, not a native failure. Cleared input establishes zero hand delivery. No force/compression scaling or law/capacity change.' };
const destination = process.argv[2] ?? 'out/ace-protection/retention.json';
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ nativeError, reachableHands: retained.joints, clearedHandImpulse: cleared.reports[0].armImpulse,
  unreachableDistance, generousReach, injectedStaleHands: stale.joints,
  unavailableRetentionContract: 'Which physical/controller boundary invalidates the acquired joint as reach/facing change?' }));
