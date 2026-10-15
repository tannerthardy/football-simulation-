# Existing angular motion can improve a loaded half-turn choice

**Disposition, 2026-10-15: parked on the historical experimental patch host.**
Preserve draft PR #62 and its evidence; do not run the proposed native-loop cost
check now. That check cannot resolve the host's adoption prerequisites, so it
would not change this disposition. The primary assignment is a minimal coherent
contact-law candidate on current approved develop. Revisit turn choice only with
a specified reviewed host and a concrete integration decision. No baseline or
production default changes.

Cost follow-up: [the scalar planner](turn-planner-cost.md) preserves the choices
and improves warmed planning cost, but the original tail screen remains open.
The measurements below retain their original revision pins.

**Keep this controller candidate experimental.** It improves five of34 isolated turn tasks and preserves29, including normal turns and deliberate reversals. The saved previous-history turn settles36.46ms sooner with less absolute motor work. Six native contact inputs retain all endings, but seed4001 allows+.544yd/+.10s. Planning medians pass the declared budget; all candidate p95 screens fail it. This is narrow motion evidence, not established football or full-patch benefit.

Runtime/diagnostics `b4bc3a1`, source `7101eecf0adf491a529f279560206111960fa409a90a81815ee87c3a2ad6b8a3`, from PR59 `4db2ffa`. Full validation freezes the same runtime at the documentation-only owner pin `bea90de`. Baseline remains `4ded6b6`; primary `862258c`. [The receipt](../../data/reviews/current/momentum-turn-choice.json) pins exact flags, input/file hashes, successful/adverse evidence and commands. PR56 remains separate and uncombined.

## Objective and one supported controller change

The PR59 witness straddles the antipode of the requested heading. Instantaneous shortest-angle choice ignores the time needed to brake existing angular motion. The explicit experimental objective is to reach the requested orientation and settle under existing physical limits. It does not demand matching histories, a block win or a shorter tackle.

`World({handContact:'patch',turnChoice:'arrival-time'})` compares the nearest orientation and its adjacent±2π lifts using a bounded-motion travel-time estimate. Current spin and an acceleration estimate from the body's own last delivered ground force influence the route. This uses the body's own state, not future contact forces or another player's private assignment. Existing gait, grounded yaw, torque/traction sharing, recovery, grip integration and physical capacities still execute the request. The selected target keeps the existing per-tick angular limit. No achieved speed or displacement is guaranteed.

The option is absent under defaults and requires patch yaw. Zero authority or spin outside the forecast's rate scope retains the existing shortest route. Zero-spin ties preserve the original choice. This remains a finite route forecast with constant-load assumptions, not a globally optimal controller under changing contact loads. A branch boundary still exists; it is not a dead band or a guarantee of continuous decisions everywhere.

The behavioral contract is an **orientation goal with a free choice of turn route**. The current `facing` command supplies an orientation, not a mandatory clockwise/counterclockwise path. Under that contract, braking existing spin has a cost worth considering. This is not authority to override an explicit tactical turn direction or a clearance constraint; neither is represented by this option. The deliberate-reversal controls demonstrate response to a changed orientation goal, not preservation of an unrepresented coaching instruction.

The follow-up at `0312539` checks exact and nearby half-turns with both spin signs, five equivalent heading lifts, and independently wrapped body/target headings through actual `World.plan`. Nondegenerate route choices agree. At exactly 180° with zero spin, the two routes have equal cost: retaining the existing input-sign convention can produce opposite directions for equivalent representations. That is an explicitly retained tie, not evidence of different movement capability or a wrapping/accounting defect. Different states on opposite sides of a real decision boundary may still produce valid different histories.

## What the diagnosis establishes

| Category | Evidence and limit |
| --- | --- |
| Controller choice | PR59's opposite shortest-angle requests explain the dominant saved support-history gap. Existing spin matters under the stated free-route objective. Reducing the gap is a consequence, not the acceptance test. |
| Controller forecast error | The rejected motor-cap forecast loses 71.35 ms even after 96/192/384 refinement. The actual servo cruises more slowly; correcting that forecast removes the demonstrated losses. |
| Accounting or physical law | The unchanged allocated-force, work and sampled grip-reference checks pass. This witness demonstrates no new recovery/grip-law defect and does not certify every contact law or resolve PR56. |
| Numerical error | Independent route times agree within 1.69e-14 s; retained interval and partition gates pass. Those numerical results do not prove that a constant-load forecast is optimal during changing football contact. |

The bounded turn-choice question is closed as an experimental controller result. Keep the candidate off pending its cost gate and review; do not repair recovery strength to force the saved histories together.

## Why the first forecast was rejected

The first candidate at `42aaf87` used the physical motor rate cap as a cruise-speed forecast. Its bounded-motion reference calculation was correct, but two newly tested boundary turns settled71.35ms later through the actual yaw controller. Refining96→192→384 substeps preserves that loss. It was a controller-model mismatch, not numerical contact error.

The existing controller resets a short target each tick and follows a critically damped yaw response. During sustained turning it cruises below its motor rate cap. For controller tick `H`, existing response time `τ`, and motor rate `R`, the unsaturated periodic flow gives:

`cruise = R*(1-exp(-H/τ))² / (1-(1-H/τ)*exp(-H/τ))`.

At `H=τ=.05s`, this is about.3996R. The corrected candidate uses this derived travel forecast; it does **not** reduce the physical rate cap or change the response law. Independent periodic-flow checks cover10/50/100ms ticks. No fitted threshold, recovery gain or force capacity was added.

The rejected first candidate also changes seed4001 from a completed tackle to a censored22.177yd run. That evidence remains at the first candidate's pinned revision and scratch hashes. The mechanical turn regression motivated the correction; the tackle ending was not used to choose a parameter.

## Mechanical evidence and controls

Seventy bounded-motion queries match an independent reachable-velocity-envelope reference within1.69e-14s. Mirrors and±2π representations agree. The actual-turn task holds load and availability fixed and uses the unchanged yaw motor. Finish means angle error≤.01rad and spin≤.02rad/s, held for.10s;5s censoring remains explicit. These are declared mechanical operators, not NFL tolerances.

| Fixed-load turn task | Shortest-angle finish | Candidate finish | Result |
| --- | --- | --- | --- |
| Saved previous history | 1.411458s | 1.375000s | 36.46ms earlier; absolute yaw work124.330→122.726kg·yd²/s² |
| Saved transition history | 1.369792s | 1.369792s | Exact control |
| Mirrored previous/transition | Same as corresponding originals | Same as corresponding originals | Genuine reflection retained |
| Normal turn | .577083s | .577083s | Exact control |
| Deliberate reversal | .686979s | .686979s | Exact control |
| Changed command during turn | 1.072917s | 1.072917s | Exact reversal response |
| Near target | .131250s | .131250s | Exact control |
| Lower-torque half-turn | 1.475000s | 1.350000s | 125ms earlier; less absolute yaw work |

The34 tasks comprise ten retained tasks,16 initially new boundary inputs and eight additional boundary inputs declared after diagnosing the forecast error. These are now inspected controls, not a blind holdout. Final result:5 improve,29 remain equal, none regress or censor. The two first-candidate adverse boundary cases now reproduce the original task exactly. Three96/192 partition controls agree within one96-substep observation interval; the finish marker itself is discrete.

On the saved50ms loaded replay, both candidate histories choose the negative turn. The previous history's final heading moves from−3.189647 to−3.231815rad; its instantaneous wrapped error to the requested heading decreases. The other history reproduces exactly. Their support gap falls from.073068 to about.003855yd. Matching that gap is not the acceptance objective. Two sampled actual candidate grip intervals retain the original converged1024/2048 reference checks; worst normalized error.000720/refinement.000052 remain below.0625. The solver, recovery law and all their tolerances are unchanged.

## Matched native contacts

Use ownership plus the PR55 corrective callback only,96 native substeps, patch/midpoint/per-solve settings. Five prior default-result summaries reproduce exactly. Add a declared new45°/8yd/s seed6001 input; it escapes in both arms. Advance starts at the acquired grip, not NFL YAC. Censored runs are not completed tackles.

| Input | Existing choice: yd / s | Candidate: yd / s | Ending |
| --- | --- | --- | --- |
| 45°,8,3001 | 24.199731 /4.40 | 24.199731 /4.40 | Censored in both |
| Mirror3001 | 24.199731 /4.40 | 24.199731 /4.40 | Censored in both |
| Front,3,3001 | .449062 /.85 | .449062 /.85 | Tackle, exact |
| 45°,8,4001 | 14.405071 /2.90 | 14.948803 /3.00 | Tackle;+.543732yd/+.10s retained |
| 45°,8,5001 | 11.675659 /3.15 | 11.660467 /3.15 | Tackle;−.015192yd retained |
| New45°,8,6001 | 10.278738 /1.40 | 10.278738 /1.40 | Escape, exact |

The final candidate changes one runner-facing request in each of4001 and5001, first at4.05s and5.00s respectively, after their identical2.65s acquired grips. Those changed contacts have no new missed-tackle roll. The fresh6001 escape includes the same later rolled dive miss in both arms. Improved runner turning can legitimately change the defender's result; these endings do not by themselves prove better or worse physics. Maximum full-World work residual is3.55e-11. No broad game campaign or new capacity/recovery tuning.

## Runtime and adoption decision

Two serial processes on Node22.23.3, AMD EPYC9V74, each use11 warmups and101 rotating samples per arm. Clocks include22 frozen-body `World.plan` calls using copies of the two saved profiles; preparation is outside the clock. They are not full World/game timings. Budgets declared before measurement: median≤.10ms, p95≤.25ms.

| Planning task/arm | Median range, ms | p95 range, ms | Worst observed, ms |
| --- | --- | --- | --- |
| Loaded, existing | .031–.046 | .141–.171 | .959 |
| Loaded, candidate | .076–.081 | .279–.364 | 2.517 |
| Normal, existing | .029–.041 | .140–.165 | 1.272 |
| Normal, candidate | .077–.078 | .347–.353 | 1.704 |

Typical overhead is about.035–.049ms for22 calls. Every candidate median passes; every candidate p95 fails. Setup allocations can contribute deferred GC to a timed call, and the worst samples remain real observed costs. No universal runtime bound, total-game speed claim or relaxed budget. Do not erase those tails by quoting only the saved case's improved turn time.

**Recommendation:** preserve this narrow, default-off controller for review. It demonstrates a useful turn-objective correction without changing physics capacities or recovery. It is not ready for baseline promotion: planning tails miss the stated budget, constant-load forecasts have limited scope, and league-level football benefit is unproved. The single next engineering step is to reduce planner allocation/tail cost while preserving exactly the selected decisions, using these mechanical and adverse controls. Do not expand the solver or run another broad game campaign to answer that cost question.

The single full preserved suite on `bea90de` records **1952 passed /1 retained failure** (1953 total;331.23s), with no new failure. The existing dry-cap assertion still expects limited0/actual1. All47 focused checks (13 new), typecheck, build and145Python checks pass. Exact command/source receipts are linked; no test expectation or physical accuracy tolerance changed. Existing dry-cap numerical-certificate failure, nine earlier43/52 patch failures, keeper/older.24yd witness and seed5001's inherited earlier-prototype delay stay separate. PR56's force-law scope correction is neither merged nor judged by this controller's tackle outcomes.

Reproduce under Node22 with `node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/turn-route-evidence.ts`; add `--football` or `--benchmark` for separate transfer/cost modes. Focused commands and raw-output hashes are in the receipt. Raw histories/samples stay in ignored `out/momentum-turn-choice/`.

The contract follow-up changes tests/docs only. At `0312539`, all 14 turn-route checks pass (181 ms test bodies; 1.35 s Vitest; 2.656 s launcher wall time). Its receipt records unchanged runtime source `7101eecf…` and unchanged inputs. The prior full-suite result remains pinned to `bea90de`; it was not rerun or relabeled as a check of the new test revision.

## One later movement task: the existing short shuttle

Use **one 20-yard short shuttle (5–10–5)** from the already published [18-fixture movement audit](../../data/reviews/physics-world/position-technique/movement-audit/manifest.json), whose decompressed input hash is `d6e1a492f11326a05b76d298ee86b9c753c6d4f21b6a3d57755fe20b907f2155`. That small subset contains OL shuttle paths: select the lexicographically first `athlete:event` among its `SHORT_SHUTTLE` fixtures before examining performance. This is an inspected development example, not a new holdout or an RB-specific athletic reference.

Reuse the existing [movement-task runner](../../scripts/diag/movement-tasks.ts) and measurement operator. Keep one physical profile, entry state, footing and World settings fixed; compare its existing 0.15 s/0.40 s path-feedback requests. Retain the straight approach as the opposing control and reflect the same path as a mirror. Focus on the first reversal: braking onset, turn location/path error, achieved entry/exit speeds and reversal-to-reacceleration time. Log requests alongside achieved motion and ground-budget usage. Do not change sprint/agility capacities between the controller arms. Testing `arrival-time` later would require the same patch-yaw host in both arms; comparing it against a center-yaw host would confound execution and choice.

If one request sequence executes the same task materially better with the same body, that identifies avoidable controller loss. If both miss, it leaves capability versus two poor request sequences unresolved; require a force/turn reachability bound before blaming capacities. Combine positions do not observe torso-facing intent, and an unloaded OL shuttle cannot validate loaded RB recovery or grip laws. This is a proposed small task only: no fixture extraction, new data pipeline, simulation panel or fitting was started in this follow-up.
