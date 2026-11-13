# Quarter-speed gather prototype: local tests

The local mechanism works under the witnessed consumed cues, but is withheld because broader football checks regress. No active tests or production edits from this agent remain. Exact prototype test bytes, candidate source and baseline source are retained in `test-prototype/`.

Candidate source `8d27d085b6e469115435aeae79835c571f0e124f330c8ff856a55532a5e77006`: **29/29 focused tests pass**, isolated candidate typecheck passes. Baseline source `3cbabd8fbb1fb4fea34c6bb98725a97f3f6de175c0bb59bece69f3c1e7371a7f`: **27 pass / 2 expected failures** using identical prototype tests. The baseline is a verified exact copy of immutable `out/coverage-continuation/alley-v1`; its archive was not modified. Source identifiers use the repository's flattened lexical path hashing, not component-wise Path sorting.

Six new cases cover:

1. Both exact native SS bodies at 4.20/4.25, full profiles/support/energy, and all ten already-consumed teammate pictures. Ordinary and half requests overlap a consumed picture; selected movement clears every observed peer. Actual World execution with the retrospective held-native Mike request stays upright and collision-free with bounded ground/arm/support work. Mirrored execution agrees frame by frame; the first frame brakes instead of instantly reversing; movement exceeds a held zero request. The baseline failure reaches this achieved movement comparison: its zero command gives identical progress to the zero control, rather than failing only a command label check.
2. Earlier exact 4.15 ordinary half-gather remains unchanged and executes physically.
3. Each teammate observation is consumed once, no bodies/pictures are mutated, no extra random draws occur, and an altered unobserved actual Mike state does not change the decision.
4. An updated consumed crossing picture restores ordinary movement immediately; the original consumed obstruction restores the gather with no remembered freeze.
5. A controlled adverse rear picture makes quarter and stop unsafe in a previously clear lane. At native 4.20, relative position `(-2,-2)` and observed velocity `(3,5)` give ordinary clearance **+.683 yd**, half **+.286**, quarter **-.173**, stop **-.418**. Both peer orders and physical mirrors retain the original request. `probe-rear-control.ts` and `rear-control.json` retain the production-preview discovery. This cue is a deliberately adverse control, not native NFL/play evidence.
6. Own constraints, engagement, external support load/lean/strike, squeeze, push/lunge/free/dive and down states do not invoke an unconstrained free forecast or mutate the body. Existing physical-traffic cases remain included.

The old necessary-stop control at lateral .9 yd became safely passable with the new candidate: quarter clearance **+.137 yd**. The preserved prototype changes only that control's lateral geometry to .7 yd, where quarter clearance is **-.056 yd** and zero clearance **+.257 yd**. Its stop, World, upright and work assertions remain. `probe-stop-control.ts` and `stop-controls.json` show the alternatives. The active tracked test was restored exactly from HEAD because the candidate is withheld.

These are local same-cue controller and held-command execution tests, not predictions of the whole native future. The actual retrospective Mike request is used only after the spacing decision and is never supplied to it. All four retrospectively held SS alternatives, including original, were physically collision-free against Mike's changed native request; observed constant-velocity forecasts are conservative. The local result therefore does not establish that quarter movement should be chosen across all football situations.

Root reported broader regressions: retained split-field tail 7.15 yd to 70 yd touchdown, PA tail 33 yd to 70 yd touchdown, and eight-game scoring 37.94 to 46.06 per team-game. Those checks block promotion despite local test success. Preserve the improvement hypothesis while diagnosing whether longer-horizon replanning, forecast conservatism or another football controller interaction causes those regressions. No force, traction, strength, support or contact changes are justified by these local results.

Logs and exact test/source receipts: `tests-candidate.log`, `tests-baseline.log`, `tests-typecheck.log`, `tests-receipt.json`. Reproduction from repository root uses Node 22 and:

```sh
node node_modules/vitest/vitest.mjs run test/spacing-quarter-gather.test.ts test/spacing-yield.test.ts test/traffic-turning.test.ts test/traffic-control.test.ts --root out/rushing-benchmark/spacing-diagnosis/test-prototype/candidate
node node_modules/vitest/vitest.mjs run test/spacing-quarter-gather.test.ts test/spacing-yield.test.ts test/traffic-turning.test.ts test/traffic-control.test.ts --root out/rushing-benchmark/spacing-diagnosis/test-prototype/baseline
node node_modules/typescript/bin/tsc -p out/rushing-benchmark/spacing-diagnosis/test-prototype/candidate/tsconfig.json --noEmit
```

The second command intentionally returns failure for the two reproduced baseline defects; do not treat it as a passing suite.
