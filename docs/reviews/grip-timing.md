# Passive grip impulse and timing: bounded candidate, not promotion

**Latest follow-up:** [physical effort accounting](grip-timing-effort.md)
repairs a later error without changing contact or recovery laws. Lean effort
was summed per refined piece but divided by the original outer-step count.
Time-weighted effort reduces the selected native path gap from 1.6435 to
.2422 yd, and the identical held-control .8 s gap from .05825 to .000585 yd.
All baseline tackles and 12/12 fresh finishes remain; cost is still excessive.
The balance-only refinement probe is rejected and preserved at `080eaa1`.
Original results below describe the earlier `9e9fd3d` candidate. Current
[timing receipt](../../data/reviews/current/grip-timing.json) and
[effort receipt](../../data/reviews/current/grip-timing-effort.json) describe
runtime `a4bfc671…`; neither stage promotes the patch or changes `4ded6b6`.

PR #3 continues from `3255be5`, with **`4ded6b6` kept as the comparison
baseline**. The [original investigation](contact-foundations.md) identified
the first angular error before active recovery placement. Its 98% reference
explanation describes that frozen example, not tackle accuracy.

This candidate retains every physical capacity and recovery law. Its only
activation is the explicit World/PlaySim option `gripTiming: 'resolved'`, with
`handContact: 'patch'`. The default is `midpoint`; center physics is unchanged
even if that option is supplied. No environment flag or shared-baseline
designation changes. Claude's support and tackle experiments remain separate.

Candidate runtime SHA-256:
`c89092946f520d67ebcaeb45e2435d7f52cc0075bde009d0d34a819fbb08824c`.
The [compact receipt](../../data/reviews/current/grip-timing.json) records the
baseline source, all 43 actual flags, Node version, input manifest, acquired
packet checksums, explicit API choices, failed controls and native endings.
Raw V8 packets and traces remain under ignored `out/grip-timing/`.

## What changed

A constant force's midpoint travel is correct. A grip whose force stops or
rapidly relaxes within an interval needs its actual impulse and temporal
moment. Correcting yaw alone would leave translation, attachments and work on
another force schedule, especially when several contacts share one body.

The narrow numerical candidate resolves the **existing** contact law over a
live acquired-grip interval. It compares complete coarse/refined scratch
replays, then executes only the accepted partition on the real World. Gait
requests remain at 20 Hz. Rejected trials cannot spend physical time, impulse
or work, draw RNG, or change bodies, joints and profiles. Each accepted piece
uses the existing shared normal/tangent and arm/support budgets, force frame,
yaw, body transport, attachment transport and work accounting together.

The refinement decision observes body position/velocity/facing/spin, achieved
grip points, topology/state changes and work, including support motor work.
Whole-interval comparison matters: acceptable local pieces can accumulate
incorrect impulse and force timing. A vanishing grip uses the original solve
when its bounded numerical effect is negligible. Refinement is capped; a
failure to meet the estimate is reported, never declared converged silently.

Engineering tolerances are 5e-7 yd position, 2.5e-5 yd/s velocity, 2.5e-6 rad
facing, 2.5e-4 rad/s spin and 0.01 kg·yd²/s² work **between refinements**.
The cap is 16,384 physical pieces per acquired outer interval. These are
numerical accuracy settings, not athlete capabilities, guarantees of global
trajectory accuracy or settings fitted to NFL outcomes.

The rejected local-acceptance implementation is preserved at `9916663`.
It repaired the selected event but failed an independent slow-compliance
impulse/time-moment check; tighter local tolerances still accumulated error
and exhausted a depth bound. No reference assertions were relaxed. The final
whole-interval comparison passes those same checks. This is one integration
correction, with no new bounce/bang/bend, tackling or recovery rule.

## Before and after the first event

Use the exact acquired 45°/8 yd/s seed-3001 packet from the isolated
`4ded6b6` archive, both mirrors. Resolve the next 4.167 ms. The World reference
uses 4,096 partitions, finer than the candidate's selected 256; the separate
constant-Jacobian force reference independently tests capped/exponential
relaxation, impulse, temporal moment, support/attachment displacement and work.

| Selected frozen event, ground and grip | Old outer solve | Candidate |
| --- | ---: | ---: |
| Facing error versus refined World | 0.00302854 rad | 0.000001659 rad |
| Spin error | 0.139240 rad/s | 0.0001738 rad/s |
| Position error | 0.00005113 yd | 0.0000000281 yd |

The grip-only control also improves, and the reused seed-4001 angled control
improves. Mirrors retain the same result. Active corrective placement remains
zero in the selected first event. This validates the early numerical repair;
it does not establish how much it explains ordinary tackles or blocks.

Ten new contracts cover the independent force reference, moving geometry,
shared normal/tangent budgets, multiple contacts, achieved material rotation,
zero/tiny loads, object identities, mirrors and unequal partitions. Existing
production assertions and the physics capacities are unchanged.

Complete candidate-source verification at `9e9fd3d` passes **1,671 TypeScript
tests in 140 files, 145 Python checks, typecheck and build**, with no worker
errors and unchanged inputs during the run. The
[validation receipt](../../data/reviews/current/grip-timing-validation.json)
pins code, harness and defaults. This complete run uses production defaults;
the candidate's explicit physics option is covered by its targeted contracts
and separate native/gate comparisons. The retained experimental gate is not
reported as green.

## Native controls and adverse evidence

Seven inputs, both mirrors, are run at 12 and 96 outer substeps with identical
flags and rosters. Original code is extracted from `4ded6b6`; candidate-off
results reproduce all **14/14** matched 12-step results exactly. This validates
behavior parity on that panel, not a claim that the candidate source is
byte-identical. Existing frozen command/body/load/RNG contracts also remain.

All 10 baseline 12-step tackles and all 12 baseline 96-step tackles remain
tackles. At 12 steps the selected angled escape pair becomes **censored**, not
a new tackle: counts change 10 tackled / 2 escaped / 2 censored to
10 / 0 / 4. At 96 both versions have 12 tackled / 0 escaped / 2 censored.
Ending agreement between 12 and 96 improves from 10/14 to 12/14. The unchanged
rear-center pair still disagrees across resolution.

At 12 steps, advance after the acquired grip on one mirrored representative:

| Input | Baseline | Candidate | Interpretation |
| --- | ---: | ---: | --- |
| Frontal patch, ordinary 0°/3 | 0.4573 yd | 0.4406 yd | Successful physical tackle retained. |
| Rear patch, difficult 135°/6 | 6.5057 yd | 6.7841 yd | Tackle retained, runner advances about 0.28 yd farther. |
| Side-cut patch, difficult 90°/3 | 2.0883 yd | 2.0814 yd | Successful adverse control retained. |
| Reused angled control, seed 4001 | 13.6890 yd | 12.6630 yd | Physical tackle retained with less advance. |

The selected angled hold still has an important **regression in path
agreement**: candidate acquired-grip advance is 20.7114 yd at 12 versus
22.3549 at 96, a 1.6435 yd gap. The first event can be accurate while the later
loaded motion remains sensitive. None of the candidate's native intervals
hits its refinement cap; that local estimate does not certify a whole play.
Recovery/source coupling and zero-grip-load intervals require primary's
separate diagnosis. No recovery fix is inferred or enabled here.

The operator's older `afterContact` marker includes misses and can include
zero-impulse proximity. The table therefore uses **advance after the acquired
grip**, not actual first-contact depth or NFL YAC. Censored holds are retained
explicitly and never counted as finishes.

Accounting remains bounded: worst native kinetic-work residual is 1.94e-9,
arm-budget excess 4.91e-12, positive passive work 1.34e-15 and no support-work
excess. These check the reduced model's represented planar mechanics, not
unrepresented limb/vertical energy or measured human force capacities.

## Retained football gate and practical limits

The candidate gate remains **43/52**, with exactly the original nine failures.
Per-test instrumentation proves **zero grip-timing invocations in every
failing fixture**. Thus the correction does not explain or conceal those
failures. Seven concern patch hands/helper collection, recovery of a helper's
footing, supported-owner checks and Tite climb; two assert legacy histories
under a deliberately different patch law. All assertions are retained. The
baseline Tite contract stays unchanged and this is not patch promotion.

The implementation is a costly experimental accuracy candidate. Small native
patch reps take seconds to tens of seconds, versus fractions of a second for
the original solver. These are instrumented runs with differing scheduling,
not a controlled game-performance benchmark, but the cost is plainly too
large for production adoption. The current flat contact island can also cause
unrelated near bodies to be refined when a grasp is live. No claim of isolated
football-wide speed or outcome improvement is made.

No support interface or law changed: `support.ts`, `virtual-foot.ts` and
actuation are byte-identical to the baseline. The helper preserves the existing
attachment graph and reads the existing grip-point and motor-work interfaces.
The validated configuration is legacy support, bounded attachments, mean
support integration and speculative impact timing. External diagnostic
recovery adapters and Claude's support/tackle variants were not combined.

The single best next step is to use these acquired packets and unchanged
reference contracts to implement an efficient force-event integration,
preserving impulse, its temporal moment and shared work. Primary should trace
the later loaded-support divergence separately. Combining support/tackle
experiments or declaring a new baseline requires a reviewed comparison.

## Reproduce / primary handoff

The smallest acquired witness can be obtained with
`captureFirstGrip({angle:45,speed:8,cut:false,difficulty:'difficult'}, 'patch', 1)`
from `scripts/diag/physics/contact-foundations.ts`. `frozenInterval` accepts
that same saved packet with either `midpoint` or `resolved`, leaving capacities
and incoming requests fixed. The receipt pins the original packet checksum.
The original archive can run the same read-only collector on its source; see
the evidence script's `--baseline` path. Copy only the new diagnostics into
the source archive, use its baseline launcher's exported `environment()` to
reset flags, and verify its source is the pinned baseline hash. The archive
needs no additional Git checkout or worktree.

```sh
# Current branch: same archived input packets, candidate alone.
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/physics/grip-timing-evidence.ts out/grip-timing
# Finer frozen reference only, preserving the already collected native panel.
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/physics/grip-timing-evidence.ts out/grip-timing --frozen-only
npm run baseline:run -- --candidate -- npx vitest run --project core test/grip-timing-reference.test.ts test/grip-timing.test.ts
npm run baseline:run -- --candidate -- npx vitest run --config scripts/diag/grip-timing-vitest.config.ts --maxWorkers=1 --reporter=json --outputFile=out/grip-timing-final-gate.json
python scripts/diag/physics/grip-timing-report.py out/grip-timing
npm run baseline:verify -- --candidate --receipt out/grip-timing/full-validation.json
```

The patch gate exits nonzero as expected. All experiments in the recorded
baseline profile remain off; the explicit `gripTiming` API option and patch
World setting must always accompany a candidate result.
