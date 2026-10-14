/** One-body action comparison. Never runs PlaySim, acquisition or a hand law. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Body } from '../../../src/physics/kinematics.js';
import { availability, supportParams } from '../../../src/physics/support.js';
import { fatigueFactor } from '../../../src/physics/kinematics.js';
import { World, type Intent } from '../../../src/physics/world.js';

interface Case {
  id: string; slot: string; actor: number; job: string; now: number;
  probeFirstLevelBase: boolean; body: Body; nativeExpectedFirstStepBody: Body;
  recordedIntent: Intent;
  target: { actor: number; slot: string; bodyRadius: number;
    seen: { pos: { x: number; y: number }; vel: { x: number; y: number }; age: number } | null };
}
interface Manifest {
  protocol: string; comparisonBaseline: string; sourceBase: string;
  fieldWidth: number; tickSeconds: number; steps: number; actionPosture: number;
  scope: string; cases: Case[];
}
const inputPath = process.argv[2] ?? 'config/te-unloaded-approach.json';
const outputPath = process.argv[3] ?? 'out/te-approach/result.json';
const inputBytes = readFileSync(inputPath);
const manifest = JSON.parse(inputBytes.toString()) as Manifest;
assert.equal(manifest.protocol, 'te-unloaded-approach-v1');
assert.equal(manifest.tickSeconds, .05);
assert.equal(manifest.steps, 3);
assert.equal(manifest.cases.length, 6);
const started = performance.now();
const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const sourceBefore = readFileSync('src/physics/world.ts');
assert.equal(hash(sourceBefore), hash(execFileSync('git', ['show', manifest.comparisonBaseline + ':src/physics/world.ts'])),
  'Review changed World before reusing this historical free-motion input');

function reflectBody(source: Body): Body {
  const b = structuredClone(source);
  b.pos.y = manifest.fieldWidth - b.pos.y;
  b.vel.y = -b.vel.y;
  b.facing = -b.facing;
  if (b.spin !== undefined) b.spin = -b.spin;
  if (b.squeezeHeading !== undefined) b.squeezeHeading = -b.squeezeHeading;
  if (b.support) {
    const fields = b.support as unknown as Record<string, unknown>;
    assert.equal(fields.foot, undefined, 'Held/virtual-foot state is outside this free study');
    for (const v of Object.values(fields)) {
      if (typeof v === 'object' && v !== null && 'x' in v && 'y' in v) {
        const vector = v as { x: number; y: number };
        vector.y = -vector.y;
      }
    }
  }
  return b;
}
function reflectIntent(source: Intent): Intent {
  const cmd = structuredClone(source);
  cmd.vel.y = -cmd.vel.y;
  if (cmd.facing !== undefined) cmd.facing = -cmd.facing;
  assert.equal(cmd.dive, undefined);
  assert.equal(cmd.lunge, undefined);
  return cmd;
}
function state(b: Body) {
  return { pos: { ...b.pos }, vel: { ...b.vel }, facing: b.facing, spin: b.spin ?? 0,
    energy: b.energy, posture: b.support!.posture, support: b.support!.state,
    xi: { ...b.support!.xi }, availableSupport: availability(b.support!, supportParams(b.profile), fatigueFactor(b.energy)) };
}
function error(a: ReturnType<typeof state>, b: ReturnType<typeof state>): number {
  assert.equal(a.support, b.support);
  return Math.max(...['x', 'y'].flatMap(k => {
    const axis = k as 'x' | 'y';
    return [Math.abs(a.pos[axis] - b.pos[axis]), Math.abs(a.vel[axis] - b.vel[axis]), Math.abs(a.xi[axis] - b.xi[axis])];
  }), Math.abs(Math.atan2(Math.sin(a.facing - b.facing), Math.cos(a.facing - b.facing))),
  Math.abs(a.spin - b.spin), Math.abs(a.energy - b.energy), Math.abs(a.posture - b.posture));
}

function run(c: Case, withBase: boolean, reflected: boolean) {
  const original = JSON.stringify(c);
  const body = reflected ? reflectBody(c.body) : structuredClone(c.body);
  const originalProfile = JSON.stringify(body.profile);
  const intent = reflected ? reflectIntent(c.recordedIntent) : structuredClone(c.recordedIntent);
  if (withBase && c.probeFirstLevelBase) intent.posture = manifest.actionPosture;
  // No joints, opponents, teammate removal, RNG or perception acquisition.
  // This is explicitly an empty-space action response, not a lane forecast.
  const world = new World([body], { handContact: 'center', supportModel: 'legacy' });
  world.time = c.now;
  const samples = [];
  let maximumWorkResidual = 0, maximumGroundBudgetExcess = 0;
  let firstNativeError: number | null = null;
  for (let step = 0; step < manifest.steps; step++) {
    const previous = state(body);
    const report = world.step([intent], manifest.tickSeconds);
    assert.equal(report.contacts.length, 0);
    assert.equal(world.joints.length, 0);
    assert.equal(report.strikes.length, 0);
    assert.equal(report.armImpulse[0], 0);
    assert.equal(report.armWork[0], 0);
    assert.equal(body.support!.state, 'up');
    assert.equal(JSON.stringify(body.profile), originalProfile);
    const groundBudgetExcess = Math.hypot(report.groundImpulse[0].x, report.groundImpulse[0].y)
      - supportParams(body.profile).traction * manifest.tickSeconds;
    maximumWorkResidual = Math.max(maximumWorkResidual, Math.abs(report.work.residual));
    maximumGroundBudgetExcess = Math.max(maximumGroundBudgetExcess, groundBudgetExcess);
    assert.ok(Math.abs(report.work.residual) < 1e-8, 'Represented work failed');
    assert.ok(groundBudgetExcess < 1e-8, 'Shared traction budget failed');
    assert.ok(Math.abs(body.support!.posture - previous.posture) <= 2.5 * manifest.tickSeconds + 1e-10,
      'Posture changed faster than the existing World law');
    if (step === 0 && !withBase && !reflected) {
      firstNativeError = error(state(body), state(c.nativeExpectedFirstStepBody));
      assert.ok(firstNativeError < 1e-10, `Single-body reference does not reproduce saved first step: ${c.id}, ${firstNativeError}`);
    }
    samples.push({ time: c.now + (step + 1) * manifest.tickSeconds, state: state(body),
      achievedAverageVelocity: { x: (body.pos.x - previous.pos.x) / manifest.tickSeconds,
        y: (body.pos.y - previous.pos.y) / manifest.tickSeconds },
      groundImpulse: report.groundImpulse[0], groundWork: report.groundWork[0],
      groundYawWork: report.groundYawWork[0], workResidual: report.work.residual });
  }
  assert.equal(JSON.stringify(c), original, 'Probe changed frozen source');
  return { variant: withBase ? 'explicit-first-level-base' : 'recorded-command', reflected,
    intent, samples, firstNativeError, maximumWorkResidual, maximumGroundBudgetExcess };
}
const rows = manifest.cases.map(c => {
  if (c.probeFirstLevelBase) {
    assert.ok(c.slot === 'Y' || c.slot === 'H');
    assert.ok(c.job === 'reach' || c.job === 'cutoff');
    assert.equal(c.recordedIntent.posture, undefined);
    assert.ok(c.target.seen);
  }
  const variants = [run(c, false, false), run(c, true, false), run(c, false, true), run(c, true, true)];
  let maximumMirrorError = 0;
  for (const [a, b] of [[0, 2], [1, 3]]) {
    for (let k = 0; k < manifest.steps; k++) {
      const plain = variants[a].samples[k].state;
      const counterpart = variants[b].samples[k].state;
      const target = { ...plain, pos: { x: plain.pos.x, y: manifest.fieldWidth - plain.pos.y },
        vel: { x: plain.vel.x, y: -plain.vel.y }, xi: { x: plain.xi.x, y: -plain.xi.y },
        facing: -plain.facing, spin: -plain.spin };
      maximumMirrorError = Math.max(maximumMirrorError, error(target, counterpart));
    }
  }
  assert.ok(maximumMirrorError < 1e-9, 'True reflection failed');
  if (!c.probeFirstLevelBase) {
    assert.deepEqual(variants[0].samples, variants[1].samples, 'Ordinary role control changed');
    assert.deepEqual(variants[2].samples, variants[3].samples, 'Reflected role control changed');
  }
  const old = variants[0].samples.at(-1)!.state, changed = variants[1].samples.at(-1)!.state;
  return { id: c.id, slot: c.slot, job: c.job, probeFirstLevelBase: c.probeFirstLevelBase,
    variants, maximumMirrorError,
    endingDifference: { pos: { x: changed.pos.x - old.pos.x, y: changed.pos.y - old.pos.y },
      velocity: { x: changed.vel.x - old.vel.x, y: changed.vel.y - old.vel.y },
      posture: changed.posture - old.posture, energy: changed.energy - old.energy,
      availableSupport: changed.availableSupport - old.availableSupport } };
});
const result = { protocol: 'te-unloaded-approach-result-v1',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  comparisonBaseline: manifest.comparisonBaseline, sourceBase: manifest.sourceBase,
  node: process.version, manifestSha256: hash(inputBytes), scriptSha256: hash(readFileSync(import.meta.filename)),
  worldSha256: hash(sourceBefore), durationSeconds: manifest.tickSeconds * manifest.steps,
  worldSteps: rows.length * 4 * manifest.steps, newPlays: 0, currentDevelopNativeTested: false,
  controllerChanged: false, retainedContactTested: false, rows,
  elapsedSeconds: (performance.now() - started) / 1000,
  scope: manifest.scope,
  limitation: 'Successful unloaded response cannot establish safe joining, loaded anchoring, attachment validity, defender access or realistic football gains. The .7 action is not calibrated or installed as a TE policy.' };
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({ saved: outputPath, worldSteps: result.worldSteps, newPlays: 0,
  elapsedSeconds: result.elapsedSeconds, rows: rows.map(r => ({ id: r.id, endingDifference: r.endingDifference })) }) + '\n');
