# Complete contacts after the tangent transition

**Keep PR #51 experimental.** The narrow transition passes the new contact checks, but this panel does not establish better tackling. All three completed tackles remain completed; both difficult mirrors remain censored. The next useful question is the existing active-recovery/contact force path, using the saved histories below.

Runtime is unchanged from `805c34d`, source `de1b4a43a98f547950357c0a5699023e4a878969790724b387f70d899831868b`. Diagnostics and portable inputs are at `8b274a7`. Baseline remains `4ded6b6`; fetched primary remains `862258c`. No capacities, recovery laws, defaults, controllers or test expectations changed. [Receipt](../../data/reviews/current/grip-native-football.json) pins flags, inputs, file hashes and every arm's results/refusals. [Earlier mechanical/cost evidence](grip-native-slip.md) remains separate.

## Declared comparison

Same roster, controller, requests/seed setup and measurement operator: patch contact, midpoint timing, 96 native substeps and owned material transport. Compare ownership alone, ownership plus previous below-slip callback, and ownership plus the new transition. Four retained inputs reproduce the previous ownership/callback result summaries exactly. Add one declared new input: 45°,8yd/s, no cut, seed5001. No rolled misses occur in these15 contacts.

Advance starts at the actually observed acquired grip, identical across each case's arms. It is not NFL YAC. The legacy attempt/proximity marker remains separate from actual torso-contact impulse.

| Input | Ownership only: yd / s | Previous callback: yd / s | New transition: yd / s | Ending in all arms |
| --- | --- | --- | --- | --- |
| 45°,8,seed3001 | 24.199731 / 4.40 | 24.203259 / 4.40 | 24.192990 / 4.40 | Censored, still live |
| Mirrored3001 | 24.199731 / 4.40 | 24.203259 / 4.40 | 24.192990 / 4.40 | Censored, still live |
| Front,3,seed3001 | .449062 / .85 | .449062 / .85 | .449062 / .85 | Physical fall/tackle |
| 45°,8,seed4001 | 14.405497 / 2.90 | 13.787723 / 2.75 | 13.610862 / 2.70 | Physical fall/tackle |
| New45°,8,seed5001 | 11.668849 / 3.15 | 13.603060 / 4.10 | 13.652421 / 4.10 | Physical fall/tackle |

The frontal control is exactly unchanged versus the previous callback. The two mirrors agree in final advance within4.5e-11yd and have zero torso-contact impulse; they do not demonstrate a successful tackle. The new transition changes seed4001 by−.176861yd/−.05s and seed5001 by+.049360yd/0s. Keep both directions visible. A larger adverse change is already present in the previous solver on the new input: **+1.934211yd and+.95s versus ownership only**. A longer or shorter finish is an observation, not a law-accuracy verdict.

## First differences and mechanical checks

Before acquisition, histories/requests match. First physical differences appear in the2.65–2.70s tick; pursuit requests diverge on the following tick. All observed attempts are acquired grips, so these differences are not caused by a new missed-tackle roll.

All **24 new tangent-transition proposals** actually exercised by the five contacts pass independent centered RK4 1024/2048 refinement and the original physical commit checks. Worst normalized candidate error **.0005974**, reference refinement **.0038181**, allowance **.0625**. This includes the new input and both native mirrors; no force/timing/work tolerance was loosened. Earlier below-slip and full-interval references are reused.

For seed4001, body displacement differences reach .001yd at4.15s and .01yd at4.45s. The first differing support state is at4.90s: the new history is falling while the previous remains up until4.95s. First torso impulses occur in those respective ticks. This tick-level observation cannot determine whether the torso collision or support loss happened first inside the tick.

Seed5001's new transition preserves the4.10s finish time. Its larger previous-solver/ownership difference already has a support-state split at5.35s: ownership is falling, previous solver remains upright until6.30s. This remains adverse/inconclusive evidence about the wider prototype.

## Small support-history handoff

For seed4001, save the two histories at **4.10s**, before the first large support growth. Each portable World input is **5.6KB** in [the input manifest](../../config/grip-native-support-packets.json); these are acquired states/requests, not expected solver answers. The full22-body and projected two-body worlds reproduce bodies/support exactly through all96 intervals of the issued50ms tick. Work/effort equivalence is also checked on the original interval.

From either **identical checkpoint**, previous versus new callback gives **exactly identical96-interval results**: zero accepted proposals,96 recovery-command refusals. The solver identity does not locally produce this late fork. The histories entering the tick are different:

- At4.10s: body-position difference .000691yd, modeled capture-point deviation `xi` difference **.003817yd**.
- At4.1125s: `xi` difference first exceeds .01yd, while body-position difference is .000565yd. Constraint-load difference is about403.5kg·yd/s²; desired corrective-speed difference is .0346yd/s.
- At4.15s: `xi` difference is **.073086yd**, body-position difference .002617yd. Both bodies remain upright, both are requesting recovery, and both use native fallback.

This locates consequential amplification in the existing loaded recovery/contact continuation. It does **not** prove an incorrect recovery rule, identify whether the requested footwork or delivered contact load is wrong, or establish one common cause with the older .24yd support-history witness. Primary can reuse these inputs before changing support. The solver owner should next establish independent force/work accounting for one actual nonzero corrective-foot request from this interval, preserving requests, capacities and recovery laws.

## Validation and decision

The15 contact runs,24 focused reference comparisons, original/portable96-interval equivalence and same-checkpoint callback checks pass. Typecheck/build pass. A diagnostic comparison initially encountered JSON's `-Infinity`→`null` encoding; panel comparison now uses the same encoding, while original/portable and callback comparisons remain strict on V8 values. Runtime and all existing tests are byte-identical to the prior candidate. **No full suite, broad game panel or new runtime campaign.** These histories are instrumented; reuse the prior interval-cost evidence, including its6.573ms worst sample, without claiming a new whole-contact budget pass.

The old fast/resolved dry-cap phase-certificate failure remains unresolved (16384-piece uncertainty5.01379e-6 versus1e-6); no re-pin or enlarged bound. The earlier43/52 patch gate's nine failures, keeper angular-law witness, ownership-only outcome changes and older support history remain separate and unpromoted.

Reproduce under Node22 with `node scripts/baseline.mjs --candidate -- node --import tsx` followed by `scripts/diag/physics/grip-native-football.ts`, then `grip-native-football-audit.ts`. `grip-native-support-repro.ts` recreates the portable inputs from the exact matched panel; `grip-native-support-replay.ts` replays them without scratch checkpoints. Add `--verify-original` when the generated original captures are available. Raw histories stay under ignored `out/grip-native-football/`.

**Adoption recommendation:** the new tangent transition remains suitable for narrow experimental review. Whole-contact benefit and the active-recovery force/work interface are still unproved, so leave defaults and the full patch unpromoted. The best next step is the saved active-recovery interval's force/work reference, coordinated with the primary support owner.
