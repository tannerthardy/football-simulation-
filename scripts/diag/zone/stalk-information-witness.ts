/** A controller information probe. No World, RNG or native counterfactual. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Body, MoveCommand } from '../../../src/physics/kinematics.js';
import type { Agent } from '../../../src/sim/agent.js';
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { goTo } from '../../../src/sim/behaviors/common.js';
import type { Perceived } from '../../../src/sim/perception.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

interface Fixture {
  protocol: string; comparisonBaseline: string; sourceBase: string; controllerT: number;
  actor: { id: number; slot: string; body: Body; snapReadyAt: number };
  target: { id: number; slot: string; body: Body };
  installedDrive: { x: number; y: number }; presentedPicture: Perceived;
  hiddenPositionDelta: { x: number; y: number }; recordedMovementCommand: MoveCommand;
  actualTargetPictureReads: number; scope: string;
}
const inputPath = process.argv[2] ?? 'config/stalk-information-witness.json';
const outputPath = process.argv[3] ?? 'out/stalk-information/result.json';
const bytes = readFileSync(inputPath), fixture = JSON.parse(bytes.toString()) as Fixture;
assert.equal(fixture.protocol, 'stalk-information-witness-v1');
const started = performance.now();
const original = JSON.stringify(fixture);

function compare(a: MoveCommand, b: MoveCommand) {
  return Math.hypot(a.vel.x - b.vel.x, a.vel.y - b.vel.y);
}
function request(shadow: boolean, hiddenChange: boolean, freshPicture: boolean) {
  const own = structuredClone(fixture.actor.body), other = structuredClone(fixture.target.body);
  if (hiddenChange) {
    other.pos.x += fixture.hiddenPositionDelta.x;
    other.pos.y += fixture.hiddenPositionDelta.y;
  }
  const seen = freshPicture ? { ...structuredClone(fixture.presentedPicture),
    pos: { ...other.pos }, vel: { ...other.vel }, facing: other.facing, age: 0 }
    : structuredClone(fixture.presentedPicture);
  const actor = { idx: fixture.actor.id, slot: fixture.actor.slot, team: 'O', body: own,
    profile: own.profile, engagement: null,
    get pos() { return own.pos; }, get vel() { return own.vel; }, get facing() { return own.facing; },
    // Both inputs are long after snap readiness. These two fields do not
    // affect the stalk fit; the probe preserves them across all controls.
    mind: { snapDelay: fixture.actor.snapReadyAt, decisionInterval: .2 },
    isDown: () => false } as unknown as Agent;
  const target = { idx: fixture.target.id, slot: fixture.target.slot, team: 'D', body: other,
    profile: other.profile, engagement: null, get pos() { return other.pos; },
    get vel() { return other.vel; }, get facing() { return other.facing; },
    isDown: () => false } as unknown as Agent;
  const distance = Math.hypot(other.pos.x - own.pos.x, other.pos.y - own.pos.y);
  const strikeRange = own.profile.radius + other.profile.radius + .3;
  assert.ok(distance > strikeRange, 'Near/contact feedback is outside this witness');
  let visualCalls = 0;
  const sim = { t: fixture.controllerT, offCall: { kind: 'run', run: { scheme: 'wideZone' } },
    see: (observer: Agent, opponent: Agent) => {
      assert.equal(observer, actor); assert.equal(opponent, target); visualCalls++;
      return structuredClone(seen);
    },
    engage: () => { throw new Error('No contact acquisition is allowed in this witness'); } } as unknown as PlaySim;
  let command: MoveCommand;
  if (shadow) {
    // Shadow only the far-contact fit in the quarantined two-line proposal.
    // Physical engagement eligibility, speed, stand-off and braking are unchanged.
    const picture = sim.see(actor, target);
    command = goTo(actor, { x: Math.max(picture.pos.x - 1.2, actor.pos.x), y: picture.pos.y },
      { speed: .85, through: 1 });
  } else {
    command = new RunBlocker({ kind: 'stalk', target, drive: { ...fixture.installedDrive } }).update(actor, sim);
  }
  assert.deepEqual(own, fixture.actor.body, 'Information observation changed own body');
  return { command, visualCalls, distance, strikeRange, presentedPicture: seen,
    targetPos: { ...other.pos }, hiddenChange, freshPicture };
}
const live = request(false, false, false), liveHidden = request(false, true, false);
const shadow = request(true, false, false), shadowHidden = request(true, true, false);
const freshLive = request(false, false, true), freshShadow = request(true, false, true);
const changedFreshLive = request(false, true, true), changedFreshShadow = request(true, true, true);
assert.equal(JSON.stringify(live.command), JSON.stringify(fixture.recordedMovementCommand),
  'Existing branch does not reproduce the recorded native request');
assert.equal(fixture.actualTargetPictureReads, 0);
assert.equal(live.visualCalls, 0); assert.equal(liveHidden.visualCalls, 0);
assert.ok(compare(live.command, liveHidden.command) > 1e-6, 'Review source: unseen live-position dependence changed');
assert.equal(compare(shadow.command, shadowHidden.command), 0, 'Held picture changed under hidden geometry');
assert.deepEqual(shadow.presentedPicture, shadowHidden.presentedPicture);
assert.equal(compare(freshLive.command, freshShadow.command), 0, 'Fresh-picture compatibility failed');
assert.equal(compare(changedFreshLive.command, changedFreshShadow.command), 0);
assert.ok(compare(freshShadow.command, changedFreshShadow.command) > 1e-6, 'Visible change must still affect the request');
assert.equal(shadow.visualCalls, 1);
assert.equal(JSON.stringify(fixture), original);

const hash = (x: string | Uint8Array) => createHash('sha256').update(x).digest('hex');
const result = { protocol: 'stalk-information-result-v1',
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), node: process.version,
  sourceBase: fixture.sourceBase, comparisonBaseline: fixture.comparisonBaseline,
  manifestSha256: hash(bytes), scriptSha256: hash(readFileSync(import.meta.filename)),
  controllerSha256: hash(readFileSync('src/sim/behaviors/blocking.ts')),
  proposedPatchSha256: hash(readFileSync('docs/reviews/stalk-visual-input-proposed.patch')),
  existingNativeRequestExact: true, existingUnseenChangeResponseYdS: compare(live.command, liveHidden.command),
  shadowUnseenChangeResponseYdS: compare(shadow.command, shadowHidden.command),
  freshPictureCompatibilityError: compare(freshLive.command, freshShadow.command),
  visibleChangeResponseYdS: compare(freshShadow.command, changedFreshShadow.command),
  rows: { live, liveHidden, shadow, shadowHidden, freshLive, freshShadow, changedFreshLive, changedFreshShadow },
  worldTicks: 0, newPlays: 0, controllerChanged: false, patchApplied: false,
  elapsedSeconds: (performance.now() - started) / 1000, scope: fixture.scope,
  limitation: 'Shadow only proves information consistency of this far-contact fit. It does not prove a better block, native history, contact handling, execution randomness or yardage. Live controller and all contact laws remain unchanged.' };
mkdirSync(dirname(outputPath), { recursive: true }); writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
process.stdout.write(JSON.stringify({ saved: outputPath,
  existingUnseenChangeResponseYdS: result.existingUnseenChangeResponseYdS,
  shadowUnseenChangeResponseYdS: 0, freshPictureCompatibilityError: 0,
  worldTicks: 0, patchApplied: false }) + '\n');
