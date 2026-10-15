# Refuse unsupported reel force inside the native stop

**The older experimental active helper omitted a native reel-stop condition.** This bounded repair refuses those proposals and lets World run its existing native law. It changes no World code, capacity, recovery law, default or test expectation. Baseline remains `4ded6b6`.

Tested helper/diagnostics `b9e5ec2`, from PR51 `337be32`; runtime source is unchanged `de1b4a43a98f547950357c0a5699023e4a878969790724b387f70d899831868b`. [Receipt](../../data/reviews/current/grip-native-reel-stop.json) records flags, inputs, hashes, controls and adverse results. This branch is independent of the corrective-foot World prototype on `codex/grip-recovery-work`.

## Demonstrated cause and bounded repair

Native `reelPatchGrasp` stops pulling when the held material point is at or inside `CONTACT_SCALE*(radiusA+radiusB)`. World's native callback input expresses this as `minimumDistance/1.12`; this relation is specific to that input producer. The older helper calculated positive reel demand without the span check. Its independent reel reference shared that omission, so numerical agreement did not establish compliance with the native law.

In the retained seed4001 histories,359 previous-helper calls and361 transition-helper calls delivered positive reel inside the .522yd stop. All720 pass the older physical result validator. The first actual inputs have span .033880/.064093yd at4.326042/4.286458s, respectively. [Portable fixtures](../../config/grip-native-reel-stop-inputs.json) contain those inputs only, not solver answers. The other four native contacts, including seed5001, have no audited below-stop positive-reel calls.

The candidate now refuses positive reel at or inside the stop at **every force evaluation**, including intermediate moving geometry. Both independent reel expressions enforce the same native scope separately. Zero pull or no positive reel demand remains supported. Crossing the stop is not silently integrated as a continuous force: World atomically falls back to the already correct native implementation. No new event model or force law was added.

## Isolated football comparison

Run only the guarded PR51 transition helper with owned material transport, patch contact, midpoint timing and96 substeps. Reuse the exact five-input manifest and prior ownership/previous/transition arms. Both mirrored difficult contacts remain censored, and all three completed tackles remain completed. Advance starts at acquired grip and is not NFL YAC.

| Input | Ownership only: yd / s | Old transition: yd / s | Guarded transition: yd / s |
| --- | --- | --- | --- |
| 45°,8,3001 | 24.199731 /4.40 | 24.192990 /4.40 | 24.192990 /4.40, censored |
| Mirror3001 | 24.199731 /4.40 | 24.192990 /4.40 | 24.192990 /4.40, censored |
| Front,3,3001 | .449062 /.85 | .449062 /.85 | .449062 /.85 |
| 45°,8,4001 | 14.405497 /2.90 | 13.610862 /2.70 | 14.381376 /2.90 |
| Previously declared fresh45°,8,5001 | 11.668849 /3.15 | 13.652421 /4.10 | 13.652421 /4.10 |

Four results reproduce the old transition exactly. Seed4001 changes by **+.770514yd/+.20s** versus that helper, moving close to the ownership-only result (−.024121yd/same finish time). It accepts149 intervals and falls back492 times for the named stop scope. Changed trajectories mean492 is not comparable to the361 old-history calls as a fixed-input count. This demonstrates an outcome consequence of removing unsupported reel; a longer or shorter tackle is not itself a law-quality verdict.

The support-history gap already exceeds .01yd at4.1125s, before the first observed omission at4.286458s. This repair cannot explain that earlier amplification. Seed5001 retains its larger inherited+.95s delay versus ownership only, with no reel-stop refusal or outcome change. Keep that adverse evidence separate.

## Validation, scope and recommendation

**32 focused checks pass:** the existing28 native force/cap/slip contracts plus4 checks for actual below-stop queries, independent reference refusal, zero pull/no positive demand, moving-stage geometry and atomic World fallback. Typecheck passes. The input collection has frozen metadata and reproduces all five declared contacts. A collector-only nullable-result typing error was corrected before collection; one overlapping metadata check was invalidated by a commit and rerun cleanly. No physical assertion was weakened.

No new full suite or cost campaign is justified for this diagnostic-only scope guard. Existing above-stop references, mirrors, unequal partitions, support/work and exactly-once effort controls remain passing. Prior runtime tails, including6.573ms, remain visible; instrumented contact elapsed times are not a new benchmark. The old dry-cap numerical certificate and nine earlier43/52 experimental failures remain unresolved.

Reproduce under Node22 with `node scripts/baseline.mjs --candidate -- npx vitest run test/grip-native-forces.test.ts test/grip-native-slip.test.ts test/grip-native-reel-stop.test.ts --maxWorkers=1`, then `node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-native-reel-stop-evidence.ts`. Raw results stay in ignored `out/grip-native-reel-stop/`.

**Recommendation:** review this narrow scope/fallback correction independently before further active-solver combinations. The helper supports its prior above-stop reel and zero-reel tangent cases, with native fallback for positive reel inside the stop or a crossing. This does not promote the full patch or prove football benefit. Primary's earlier support-command/load diagnosis remains the best next physical question.
