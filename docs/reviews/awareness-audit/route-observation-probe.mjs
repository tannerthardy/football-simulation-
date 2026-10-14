/** Source-only counterexample, not a football run or passing correctness test.
 * On pinned develop a repeated interpretation read erases its braking cue.
 * A future repair should make this documented counterexample stop reproducing.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { RouteObservation } from '../../../src/sim/coverage-read.ts';

const profile = { brake: 6, lateral: 6 };
const cue = speed => ({ pos: { x: 2, y: 0 }, vel: { x: speed, y: 0 },
  facing: 0, stance: null, age: .2 });
const reader = new RouteObservation();
reader.read(cue(6), 0, profile, .2, 1);
const first = reader.read(cue(4), .1, profile, .2, 1);
const repeated = reader.read(cue(4), .1, profile, .2, 1);
assert.equal(first.vel.x, 1.5999999999999996);
assert.equal(repeated.vel.x, 4);
assert.notDeepEqual(first, repeated, 'The pinned query-mutation witness no longer reproduces');
const report = { protocol: 'awareness-audit-query-counterexample',
  interpretation: 'Confirmed helper mutation; a cached caller can prevent it. No claim that normal play duplicates this read.',
  input: { profile, initial: cue(6), current: cue(4), times: [0, .1, .1], horizon: .2, confidence: 1 },
  first, repeated, worldTicks: 0, nativePlays: 0, games: 0 };
const path = process.argv[2] ?? 'out/awareness-audit/route-observation-probe.json';
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output: path, firstVelocity: first.vel, repeatedVelocity: repeated.vel,
  confirmedCounterexample: true, worldTicks: 0 }));
