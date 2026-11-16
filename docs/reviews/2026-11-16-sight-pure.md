# SIGHT_PURE: what a player saw at a past tick does not depend on who asked first (Tools, 2026-11-16)

Off by default (`SIGHT_PURE=1`). Branch `tools/sight-pure` on develop 1538db2d (engine-69).

## The finding (QB lane, via Integration)

`sighted()` (`src/sim/playsim.ts`: SIGHT_CARRIER, SIGHT_COVER, SIGHT_RECOG) decides, for a past tick, whether an observer had a man in sight, and keeps the answer in `sightAt` ("visibility at a past tick never changes"). Two things made the kept answer depend on when it was first asked:

1. **Heights.** `lineOfSight` put the bodies where the perception record had them at that tick but took every body's height and posture as it is now (`bodyHeight` reads `support.posture` and `state` live). A tick first asked about at back 0 got that tick's heights; the same tick first asked about three ticks later got the heights of three ticks later.
2. **The fall-back picture.** When he had the man in sight at no tick in the record, his picture was `kept`, the last picture any consumer's query found, whichever consumer and delay that was (`kept` is keyed by observer and target only). A consumer with a long latency could be handed a sighting fresher than its own delay allows, and a pair nobody asked about in the last second kept an older one.

`release-evidence.ts` (`sawAt`) has the same heights-as-now shape and is covered by the same flag.

The memo's 200,000-entry clear (`if (memo.size > 200000) memo.clear()`) is not reached in a normal play: three plays held 6,242 to 9,389 entries. It would have recomputed past ticks with now's heights; with the flag on there is no memo to clear.

## The repair

* The perception record carries each body's `posture` and whether he was up at every tick (two more floats per body per tick), and `recorded()` returns them. `lineOfSight` takes an optional `poseOf` and `bodyHeight` an optional recorded pose; with `poseOf` a past sight line is a function of that tick.
* `PerceptionBuffer.stamp` counts records (a tick's identity). With the flag on, `recordSightHistory()` runs after every record: for every ordered pair and each of the three views (`v` body-facing cone, `o` occlusion only, `h` head cone), it keeps the stamps at which he had the man in sight, for the ticks the record still holds, plus the picture at the newest sighting that reached the record's edge (the one he falls back on, ageing).
* `sightedPure()` answers a consumer from that history: the newest sighting at least as old as his own delay, else the aged picture at the edge, else `perceive(1.2 s)` as before. Asking extra or earlier changes nothing, because nothing is written by a question.
* Flag off: the old path, byte for byte (the first 40 plays of two saved files hash identically to a clean develop).

Information: nothing new is seen. Visibility is still occlusion by recorded bodies and the view cone at that tick; the change removes the leak of fresher-than-latency sightings through `kept` and the dependence on the asker.

## Staging

`scripts/diag/effective-mass/sight-order.mts FILE [max]` runs each saved play twice, once as is and once with extra sight questions after every tick's record (every ordered pair, delays 0.05 / 0.2 / 0.45 s, all three views, the memo and `kept` written freely). A play that moves was moved by the question.

| | plays that differ with the extra questions |
| --- | --- |
| flag off | 11 of 12 (seed 11 run file), 25 of 25 (seed 7 passes) |
| heights fix alone (memo pure, `kept` writes from the extra questions suppressed) | 0 of 12 |
| heights fix alone, `kept` live | 11 of 12 (`kept` is the second dependence) |
| flag on | 0 of 12, 0 of 30 (seed 11 runs), 0 of 30 (seed 7 passes), 0 of 30 (seed 8 passes) |

`test/sight-pure.test.ts` holds this for a run and a pass play (flag on: equal; flag off: still different, the finding); `test/sight.test.ts` has the `poseOf` cases.

Rules' observer repro (`scripts/diag/cov7-observer-purity.ts`, #768's branch f2b2dabd with this patch applied): the first differences with the flag off are physical (deception arms: frame 26, an agent's position -0.46 against -0.52; support arm: a perception position). With the flag on no frame differs in any arm; what still differs is `actors[0].mind.judgments` ("reach:DE_S" against "def-phase"), a judgment label the observer's `evaluate` writes (the QB lane's `QB_TICK_PICTURE` target), not an execution difference. So `sightAt` was the physical half of the cov7 case, and the judgment half is the QB's.

## How many plays move (flag off against on, no extra questions)

Saved run set, 1,438 plays, one pass each: 1,434 differ in their final positions (any change in a picture moves a play; this is the chaos of a closed-loop sim, not a size) and the outcome class changes in 27. Paired mean yards (capped at 20) 3.32 to 3.37 (+0.05, SE 0.09), stuffs 14.7% to 14.6%, 10+ yd 5.6% to 6.5%. On the 490 plays of three saved files the means are +0.85 (233 runs), +0.80 (130 passes) and -0.21 (127 passes); the full set shows those were noise.

Gates with the flag on: dither panel carrier / spacing 0.1601 (off 0.1713; budget 0.174), coverage / spacing 0.1138 (off 0.0980), the other stages inside budget; `test/dither-budget.test.ts` passes. `test/sight*.test.ts`, `test/release-evidence.test.ts`, `test/reference-stack.test.ts`, `test/scorecard-provenance.test.ts`, `test/decision-information-guard.test.ts` pass.

Cost: +2 to 6% play time with the flag on (60 plays: 22.6 s off, 23.0 to 24.0 s on). The first version was +35 to 45%, from allocating a `recorded()` object and calling `bodyHeight` four times per blocker for each of the 462 ordered pairs every tick. `SightFrame` (`sight.ts`) takes each body's position, radius and three heights once per tick and tests every pair against those arrays; `test/sight.test.ts` holds it to `lineOfSight` on 200 random scenes (every ordered pair, recorded poses, bodies up and down). The results are byte-identical to the first version (60 plays of two saved files hash the same), flag off is byte-identical to develop, and the invariance test and harness are unchanged: 0 of 90 more plays differ with extra questions.

### The lazy per-pair version was tried and is not the same

Integration asked for tracking only the pairs somebody asks about. Built next to the per-tick one and run as a shadow on 180 plays, the two differ on 0.8 to 2.7% of the answers a consumer is given (73,500 of 2.7 million on the run file, 66,000 of 6.6 million and 58,000 of 6.9 million on the two pass files), by up to 90 yd. They differ only where the man has been out of sight for the whole record (1.2 s): the per-tick version gives the aged picture of his last sighting however long ago it was (as the old `kept` did, without limit, which is how a man seen at the snap is "seen" 80 yd off five seconds later), the lazy version gives that only if somebody asked about the pair when he was last seen, and otherwise his delayed picture through whatever hides him. So forgetting a sighting older than the record for a pair nobody asked about does change an answer a consumer can get, and it makes the answer depend on who asked: not pure. The per-tick version stays, at +2 to 6%.

What the shadow also shows, and is not mine to change here: a man hidden longer than the record is "seen" at his last sighting plus velocity times any age (`age` unbounded), up to 80 to 90 yd from where he is. That is the old `kept` behaviour, kept so the flag changes one thing at a time. A bound or a fade on that ageing (the player knows where he last saw him, and how long ago, and does not extrapolate a sprint for five seconds) is a perception question for the owners of the sight consumers.

## Not touched

`see()`'s own `sightSamples` and `sightMemory` (the observer's own looking history, which sets his delay and his acceleration estimate) are state written by the consumer's own act of looking; an extra `see()` call would perturb them, as an extra glance would. They are by design, not part of this finding.
