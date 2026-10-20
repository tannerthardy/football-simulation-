# Preserve the installed force shoulder at midfield

2026-10-20 UTC. **Recommend ACCEPT for independent Integration review of the
narrow installed-duty correction.** A force or edge-box defender's outside
shoulder was disappearing at midfield. The correction preserves that duty and
produces useful movement in a short reacting encounter. Ordinary-play frequency
and a general ability to infer teammate help remain unproved.

- Accepted base: `2c98bed94adad8087c65f381d4090444ad283985`.
- Frozen candidate: `4b1ea231f911e18e168eec36e689b6ec52a4a15c`, including initial
  implementation `ff7e27f3791b2d1e62febbb55bc20a5bea66e91a`.
- Branch: `codex/help-aware-pursuit`. Evidence publication pin is pending the
  owner's publication checkpoint.
- Final engine source SHA256:
  `f96483a2fac21599fd022733bffff2684719e66c60261177459259c9f26ebca0`.
- [Compact evidence and provenance](../../data/reviews/current/help-aware-pursuit.json)
  contains exact inputs, signatures, artifact/tool hashes, launch receipts,
  settings and runtime. Multi-megabyte raw traces remain under
  `out/force-shoulder/` and are reproducible with the committed collectors.

## Process and ownership

This investigation adopted [Measurement's recent comment][measurement] and
[process critique][process] at `f3063e550b434d355fc050bfc604a894303ea0a0`:
repair the narrowest demonstrated broken contract at its actual owner. The
review follows installed duty → acquired cue/age → retained target → complete
request → refinements → achieved movement/load → result. A correct target
coordinate alone cannot certify private activation gates or a useful physical
action.

The three conclusions are deliberately separate:

| Proof level | Finding |
| --- | --- |
| Defect demonstrated | A generic field-middle fade removes a called outside shoulder, making force and alley requests identical in the focused midpoint fixture. |
| Intervention repairs the mechanism | Mirrored force/edge-box contracts pass; reacting force movement stays farther outside, both available defenders physically load the runner, and an escaping runner still escapes. |
| Transfer and importance established | Limited: two native run prefixes are exactly unchanged. This is not evidence of ordinary-play improvement, prevalence or NFL calibration. |

The change is confined to `src/sim/behaviors/common.ts`; its scope was
coordinated in [PR #153][claim]. Man coverage and run-fit input resolution remain
with Catching. Run's engagement work #169 and held physical experiments
#162/#164/#165 are separate. Existing #170 glancing-contact evidence remains
source-qualified; it does not justify adding a general contact slowdown here.

## First wrong decision and correction

The existing generic `leverage()` fades its signed preference toward zero near
the field's middle because geometrical "inside" is ambiguous there. Force and
edge-box pursuit used the absolute value of that already faded result, then
applied their installed side. At the exact midpoint that value is zero, even
though the called outside shoulder is unambiguous.

The candidate gives force/edge-box pursuit the existing **unsigned magnitude**
and installed side. Generic pursuit keeps its original calculation and exact
multiplication order. `pursuitPoint()` and `chase()` share this selection; their
existing distance-to-contact fade still closes the defender onto the near hip.
This changes a pursuit request, without adding capability, changing collision
laws or requiring the defender to stay permanently wide.

The consumed inputs are the defender's own installed duty/side, own skill and
the existing acquired carrier picture. There are no added observation calls,
random draws or private live target coordinates. Fixed-picture controls change
the unseen target's actual position/velocity/facing and preserve forecast and
command output until a new acquisition. Target identity is held in those tests;
caller-level authoritative carrier/possession activation gates elsewhere are
recorded debt, not certified by this result.

On accepted source, the new 11-case file produced **6 failures and 5 passes**:
four mirrored force/edge-box shoulder assertions and two force-versus-alley
request assertions failed. Generic midpoint symmetry, near-hip collection and
the acquired-picture controls already passed. On final source, **44 focused
checks pass** across this file and the existing chase-arrival/pursuit-contact
controls. Typecheck passes. The passing result does not waive the original
failures or assert a tackle outcome.

## Reacting encounter: useful movement and real counterplay

The three geometries were declared before the correction: generated roster
seeds 19/20, play seed 83, a post-catch Z at `(50, CENTER_Y)` at t=2, force FS
initially stationary at `(56, CENTER_Y+2)`, and an inside SS initially stationary
at `(55, CENTER_Y-2)`. The unavailable helper is parked far away; the escape
control starts the force behind at x=49 and gives the runner 8 rather than
6 yd/s. Incoming observation history is consistent moving history ending at
the staged pose, with known possession. No ratings or physical capacities are
edited.

The active actors use production `BallCarrier` and `Pursuit`, ordinary tick
refinements, spacing, tackle selection and World. Each case runs at most
2.5 seconds. Explicit force/alley installation makes this a **staged mechanism
test**, not proof that ordinary installation or dynamic help selection works.
Complete raw commands, applied requests, acquired reads, bodies, grips, torso
contacts and ground/work records are retained. Observers wrap existing calls;
the supported case's plain and observed physical/RNG/perception/behavior-state
endpoint hashes match on both sources.

| Case | Accepted → candidate | Interpretation |
| --- | --- | --- |
| Inside support | Force outside offset at t=2.70: **0.690 → 0.799 yd**. First grip 2.65 and first loaded grip interval 2.70–2.75 unchanged. Runner first fall **2.95 → 2.90 s**; tackle event **3.35 → 3.30 s**. Body advance **8.353 → 8.155 yd**. | Useful achievable shoulder movement; both complementary defenders load the runner. |
| Helper unavailable | First grip **2.80 → 2.75 s**; baseline slips at 3.25, reacquires, and remains live at 4.50. Candidate runner falls at 3.20 and tackle occurs at 3.60. Body advance observed **17.594 yd at horizon → 10.684 yd at ending**. | The carrier reacts toward open inside space. Baseline is censored, so this is not a final-yardage comparison or proof of helper awareness. |
| Faster runner, force already behind | Runner trajectory exactly unchanged: **22.960 yd** advance by 4.50 s, live in both arms. No attempt, grip, loaded interval or torso contact. | Legitimate offensive escape survives. Force requests/body do change; the entire case is not identical. |

The first supported-case change is the force's raw/applied request and achieved
motion in the t=2.00–2.05 interval. The helper first changes through applied
spacing at 2.45, then its own request at 2.50. The runner first physically
diverges under grip at 2.70, before its request changes at 2.75. The outcome
difference follows interacting movement, not a scripted runner path.

Actual load matters more than an assist label. The helper starts loading in
2.70–2.75 and force in 2.75–2.80 in both arms. Over the identical pre-fall
`[2.70,2.90)` window, the scalar grasp-load integrals are **293.881 → 299.838**
for SS and **34.585 → 47.556 kg·yd/s** for FS. These are integrals of mean force
magnitude, not forward impulse or work. There are no FS/SS torso-contact ticks.

**Preserved adverse result:** first torso impulse shifts from **2.75–2.80 to
2.80–2.85**, 0.05 s later. Earlier fall/ending does not erase that delay. The
union of positive loaded-grip intervals is **0.70 → 0.65 s** with support and
**1.30 → 0.85 s** without; those unequal intervals are not a continuous
single-holder comparison or evidence that longer holds are better. First grip,
actual loading, normal torso impulse, fall, tackle event and credited end spot
are separate from actual body advance. Saved work residuals remain bounded at
approximately 1.1e-11; this is accounting evidence, not NFL validation.

## Native controls and the next distinct defect

The two saved Ace12 strong outside-zone constructors run all 22 players
naturally to 3.50 seconds: AFTER-04 Under/Cover3, roster seeds 11/12, play seed7;
AFTER-14 Wide9/Cover3, roster seeds 31/32, play seed8. Both use strength .55,
spill/stack, match zones, LOS40, ballY26.67, no audible or hurry.

**Both exact accepted/candidate endpoint signatures are unchanged**, including
bodies, commands, minds, perception, events and RNG. AFTER-04 is still live at
3.50 with body position 4.368 yd beyond LOS; AFTER-14 is still live with 1.768 yd.
Those are prefixes, not final credited gains. AFTER-14 retains its acquired
grip at 3.30 and first positive torso interval 3.35–3.40. Ordinary native benefit
from the midpoint fix is absent in this evidence.

The native observation does identify a separate next question. In AFTER-04's
first lost-width interval, **2.35–2.40**, SS has already recognized run and
consumes an RB picture aged .25 s with velocity `(3.541,-3.910)` yd/s. The
edge-fit aim is held until 2.383; its adopted point remains
`(44.125,20.467)` while the newly desired point is `(40.300,19.986)`.
The raw movement objective treats this as a target with **zero velocity** and
requests facing π and only `(0.124,-0.176)` yd/s. Raw, contained and applied
requests are identical at that interval: spacing did not produce the request.
The force's achieved outside margin changes +0.028 → −0.189 yd.

This retained moving-target/command contract is **not repaired by this
candidate**. It is the next bounded investigation, coordinated separately with
the run-fit/coverage owner. It should establish achievable tracking from the
consumed cue and retained aim before changing policy. No shared physics,
perception expansion or broad teammate-help AI is justified by this finding.

## Verification cost and next decision

| Recorded group | Command wall seconds |
| --- | ---: |
| Accepted failing 11-case reproducer | 2.446 |
| Accepted staged pair / native controls | 0.821 / 1.985 |
| Provisional focused checks / pair / native | 2.169 / 0.950 / 1.844 |
| Final 44 focused checks / pair / native | 2.362 / 0.753 / 1.825 |
| Final typecheck | 13.667 |
| Total recorded command time | **28.822** |

Node is pinned to v22.23.3; the baseline launcher records flags and World
defaults and reports unchanged inputs for every run, including the expected
baseline test failure. Final reruns followed restoration of the original
generic floating-point multiplication order. They use final source
`f96483a…`; all final staged frames/results equal the provisional counterpart,
and both native signatures match accepted. Receipts record precommit HEAD
`ff7e27f…` plus tracked source changes; the frozen code pin `4b1ea231…` contains
that final source. No full suite, game campaign or NFL scan was run.

Advance only this common helper correction and its focused evidence to
independent review; Integration owns combined verification. Preserve the
separate stationary-tracking witness for its owner and do not describe this as
a demonstrated native defensive-width improvement or dynamic cooperative
help policy.

[measurement]: https://github.com/tannerthardy/football-simulation-/pull/170#issuecomment-6299671944
[process]: https://github.com/tannerthardy/football-simulation-/blob/f3063e550b434d355fc050bfc604a894303ea0a0/docs/reviews/diagnostic-process-critique.md
[claim]: https://github.com/tannerthardy/football-simulation-/pull/153#issuecomment-6299849626
