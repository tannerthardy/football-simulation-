/** Conditional mechanical sensitivity, not a native controller state reset. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Body } from '../../../src/physics/kinematics.js';
import { fatigueFactor } from '../../../src/physics/kinematics.js';
import { availability, baseRadiusAt, supportParams } from '../../../src/physics/support.js';
import { World, type Intent, type Joint } from '../../../src/physics/world.js';
import { stateError } from '../physics/keeper-contact-law.js';

type FlatJoint = Record<string, unknown> & { kind: string; a: number; b: number; actor?: number; holder?: number };
interface Row {
  id: string; actor: number; actorSlot: string; t: number; dt: number; nativeSubsteps: number;
  beforeBodies: Body[]; intents: Intent[]; jointInputs: FlatJoint[]; expectedAfter: Body[];
  expectedHands: unknown[]; attainedCandidatePosture: number; queuedStrikeCount: number;
}
const inputPath = 'docs/reviews/te-loaded-base-fixed-contact.json';
const bytes = readFileSync(inputPath);
const manifest = JSON.parse(bytes.toString()) as { protocol: string; scope: string; rows: Row[] };
assert.equal(manifest.protocol, 'te-loaded-base-fixed-contact-v1');
assert.equal(manifest.rows.length, 2);
const sha = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
const started = performance.now();
function run(row: Row, attainedPosture: boolean, substeps: number) {
  assert.equal(row.beforeBodies.length, 22);
  assert.equal(row.queuedStrikeCount, 0);
  const bodies = structuredClone(row.beforeBodies);
  if (attainedPosture) bodies[row.actor].support!.posture = row.attainedCandidatePosture;
  const world = new World(bodies, { handContact: 'patch', groundMovement: 'legacy', substeps });
  world.time = row.t;
  world.joints = row.jointInputs.map(flat => {
    assert.equal(flat.kind, 'hands', 'Do not omit attachment history for another joint kind');
    const { a, b, actor, holder, ...rest } = structuredClone(flat);
    return { ...rest, a: bodies[a], b: bodies[b],
      ...(actor === undefined ? {} : { actor: bodies[actor] }),
      ...(holder === undefined ? {} : { holder: bodies[holder] }) } as Joint;
  });
  const before = structuredClone(bodies);
  const report = world.step(structuredClone(row.intents), row.dt);
  const hands = world.joints.map(j => ({ kind: j.kind, a: world.indexOf(j.a), b: world.indexOf(j.b),
    normalForce: j.kind === 'hands' ? j.normalForce : undefined,
    tangentForce: j.kind === 'hands' ? j.tangentForce : undefined,
    forceOnB: j.kind === 'hands' ? j.forceOnB : undefined,
    momentOnA: j.kind === 'hands' ? j.momentOnA : undefined,
    momentOnB: j.kind === 'hands' ? j.momentOnB : undefined }));
  let referenceError: number | null = null;
  if (!attainedPosture && substeps === row.nativeSubsteps) {
    referenceError = stateError(bodies, row.expectedAfter);
    assert(referenceError < 1e-10, `Same-state native replay failed: ${row.id}, ${referenceError}`);
    assert.deepEqual(JSON.parse(JSON.stringify(hands)), row.expectedHands);
  }
  const limits = { armImpulseExcess: 0, armWorkExcess: 0, supportWorkExcess: 0,
    workResidual: Math.abs(report.work.residual), postureRateExcess: 0 };
  for (let i = 0; i < bodies.length; i++) {
    assert.deepEqual(bodies[i].profile, before[i].profile);
    limits.armImpulseExcess = Math.max(limits.armImpulseExcess, report.armImpulse[i] - report.armImpulseLimit[i]);
    limits.armWorkExcess = Math.max(limits.armWorkExcess, report.armWork[i] - report.armWorkLimit[i]);
    limits.supportWorkExcess = Math.max(limits.supportWorkExcess, report.supportMotorWork[i] - report.supportMotorWorkLimit[i]);
    limits.postureRateExcess = Math.max(limits.postureRateExcess,
      Math.abs(bodies[i].support!.posture - before[i].support!.posture) - 2.5 * row.dt);
  }
  assert(Object.values(limits).every(x => x < 1e-8), JSON.stringify(limits));
  const actor = bodies[row.actor], sup = actor.support!, params = supportParams(actor.profile);
  const yawImpulse = params.yawInertia * ((actor.spin ?? 0) - (before[row.actor].spin ?? 0));
  const handYawImpulse = world.joints.reduce((sum, j) => sum + (j.kind !== 'hands' ? 0
    : j.a === actor ? (j.momentOnA ?? 0) * row.dt : j.b === actor ? (j.momentOnB ?? 0) * row.dt : 0), 0);
  const yawLedger = { achieved: yawImpulse, hands: handYawImpulse,
    ground: report.groundYawImpulse[row.actor],
    residual: yawImpulse - handYawImpulse - report.groundYawImpulse[row.actor],
    torsoAbsent: report.contacts.length === 0 };
  if (yawLedger.torsoAbsent) assert(Math.abs(yawLedger.residual) < 1e-10, 'Unaccounted stance-dependent rotation');
  return { attainedPosture, substeps, referenceError, bodies, hands, limits,
    actor: { pos: actor.pos, vel: actor.vel, spin: actor.spin, state: sup.state,
      posture: sup.posture, xi: sup.xi, xiMagnitude: Math.hypot(sup.xi.x, sup.xi.y),
      availability: availability(sup, params, fatigueFactor(actor.energy)), baseRadius: baseRadiusAt(params, sup.posture) },
    contacts: report.contacts, strikes: report.strikes, groundImpulse: report.groundImpulse[row.actor], yawLedger };
}
const rows = manifest.rows.map(row => {
  const unchanged = JSON.stringify(row);
  const variants = [run(row, false, row.nativeSubsteps), run(row, true, row.nativeSubsteps),
    run(row, false, 48), run(row, true, 48)];
  assert.equal(JSON.stringify(row), unchanged);
  const differences = [[0, 1], [2, 3]].map(([a, b]) => ({ substeps: variants[a].substeps,
    xiMagnitude: variants[b].actor.xiMagnitude - variants[a].actor.xiMagnitude,
    supportAvailability: variants[b].actor.availability - variants[a].actor.availability,
    actorPosition: Math.hypot(variants[b].actor.pos.x - variants[a].actor.pos.x, variants[b].actor.pos.y - variants[a].actor.pos.y),
    actorSpin: (variants[b].actor.spin ?? 0) - (variants[a].actor.spin ?? 0) }));
  console.log(JSON.stringify({ id: row.id, referenceError: variants[0].referenceError, differences }));
  return { id: row.id, t: row.t, actorSlot: row.actorSlot,
    originalPosture: row.beforeBodies[row.actor].support!.posture,
    attainedPosture: row.attainedCandidatePosture, variants, differences };
});
const result = { protocol: 'te-loaded-base-fixed-contact-result-v1',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), node: process.version,
  manifestSha256: sha(bytes), scriptSha256: sha(readFileSync(import.meta.filename)),
  scope: manifest.scope, worldSteps: rows.length * 4, newNativePlays: 0, newGames: 0, rows,
  elapsedSeconds: (performance.now() - started) / 1000 };
const destination = process.argv[2] ?? 'out/te-loaded-base/fixed-contact.json';
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
