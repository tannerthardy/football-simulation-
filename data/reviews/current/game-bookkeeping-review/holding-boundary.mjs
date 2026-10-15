/** Zero-simulation P022 decision boundary, using the already saved telemetry. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { Game } from '../../../../src/game/game.ts';
import { sourceVersion } from '../../../../scripts/source-version.ts';

const began = performance.now();
const observations = JSON.parse(readFileSync(new URL('./saved-observations.json', import.meta.url)));
const play = observations.observations.find(p => p.play === 22);
const s = { yardline: play.recordedLog.yardline };
const los = 10 + s.yardline;
const spotX = play.behindLineFoulXInferredFromOldEnforcement;
const progress = play.savedForwardProgress.progressX;
// downSpot preserves at least the forward-progress x; the ball can improve
// the spot. Quantized progress therefore bounds the loss, rather than giving
// the exact raw sack result. Any smaller loss only strengthens acceptance.
const maximumLossFromSavedProgress = los - (progress - .005);
assert.ok(maximumLossFromSavedProgress < 8);
const rows = [-.01, 0, .01].map(offset => {
  const endX = progress + offset;
  const yards = Math.round((endX - los) * 100) / 100;
  const r = { penalty: { kind: 'holding', against: 'O', playerId: 'recorded-holder', spotX },
    stats: { attempted: false }, endX, yards, outcome: 'tackle', turnover: false, score: null };
  // TypeScript private method is called only by this offline diagnostic; no
  // Game is constructed and no snap, RNG, clock or controller runs.
  const result = Game.prototype.holdingDecision.call({ s }, r, los, 1, 10);
  assert.equal(result.newYard, 25);
  assert.equal(result.accepted, true);
  const declined = { s: { down: 1, distance: 10, yardline: 35 } };
  Game.prototype.moveChains.call(declined, yards);
  return { modeledSackLoss: -yards, decline: declined.s,
    accept: { down: 1, distance: 20, yardline: result.newYard }, acceptedByExistingHeuristic: result.accepted };
});
const report = { schema: 'holding-boundary-v1', sourceSha256: sourceVersion(), simulations: 0,
  input: 'saved-observations.json / P022 savedForwardProgress', rows,
  maximumLossFromSavedProgress,
  interpretation: 'Correct enforcement, unchanged coarse acceptance policy. Saved progress bounds the native loss below eight yards; any improvement from the ball spot only strengthens acceptance. The rows are boundary evaluations, not an exact native replay or a football value model. An exact eight-yard scripted control declines.',
  elapsedSeconds: (performance.now() - began) / 1000 };
writeFileSync(new URL('./holding-boundary.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
