/** One opposing control: the same generated DT and request without a block. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { World } from '../../../src/physics/world.js';
import { newSupport } from '../../../src/physics/support.js';
import type { Body } from '../../../src/physics/kinematics.js';
import { sourceVersion } from '../../source-version.js';

const raw = JSON.parse(readFileSync('out/block-mass-response/raw.json', 'utf8'));
assert.equal(sourceVersion(), raw.sourceSha256);
const loaded = raw.runs.find((r: any) => r.scene.id === 'roster-te-dt-square');
const first = loaded.initial[1];
const body: Body = { pos: { ...first.pos }, vel: { ...first.vel }, spin: first.spin,
  facing: Math.PI, energy: first.energy, profile: structuredClone(loaded.profiles[1]), support: newSupport(.7) };
const w = new World([body]);
w.time = 1;
const samples = [];
for (let k = 0; k < loaded.steps.length; k++) {
  const command = loaded.steps[k].commands[1], report = w.step([command], .05);
  assert(Math.abs(report.work.residual) < 1e-8);
  w.time += .05;
  if ([9, 19, 39].includes(k)) {
    const opposed = loaded.steps[k].after[1];
    samples.push({ elapsed: (k + 1) * .05, freeAdvance: first.pos.x - body.pos.x,
      blockedAdvance: first.pos.x - opposed.pos.x, delayedDistance: body.pos.x - opposed.pos.x,
      freeSpeed: -body.vel.x, blockedSpeed: -opposed.vel.x });
  }
}
const result = { source: sourceVersion(), inputCaseSha256: loaded.inputSha256,
  samples, limits: 'Same DT/profile/posture/time/requests; blocker and its contact absent. Measures mechanical delay, not protection of a runner.' };
writeFileSync('out/block-mass-response/delay-control.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
