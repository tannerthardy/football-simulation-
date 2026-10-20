# Contact that disrupts without ending the play

**Accepted physics can already produce the proposed middle.** A fixed torso
glance slows, rotates and displaces a running body without dropping it; ordinary
ground actuation recovers over time. The native broken-hold witness has real
loading and a lasting movement cost too, despite never reaching torso contact.
The immediate correction is to the measurement/diagnostic contract, with three
new mechanical regression checks. A generic post-contact penalty is unsupported.

## Measurement audit and inherited evidence

This investigation starts from accepted development
`2c98bed94adad8087c65f381d4090444ad283985`. The inherited NFL comparison is a
diagnostic clue, not a physics calibration target or a result from this accepted
build. The reports and operators below were inspected at Claude's research pin
`bae3fe80d189a7d792aaafbc4eea1ae2baa79573`; their raw encounter files are not
available locally, so the printed counts were not independently recomputed.

### What the reported numbers measure

`docs/reviews/run-game-v3/part12/mechanisms-zone.txt`, under “Encounters past
+8,” reports the following **8–20-yard** band:

| Recorded source | Encounters | Ended | Broken | Slowed |
| --- | ---: | ---: | ---: | ---: |
| NFL | 804 | 71% | 9% | 20% |
| d0co | 109 | 90% | 10% | 0% |
| Experimental c14co | 237 | 97% | 3% | 0% |

These rounded percentages do not describe every encounter beyond eight yards.
In the separate 20+ band, c14co has only 11 encounters: 64% ended and 36%
broken; NFL has 78: 76% ended, 19% broken and 5% slowed. Across both bands,
the samples include 470 NFL runs reaching eight yards, 200 d0co runs and 189
c14co runs. Multiple defender encounters within a play are not independent.

The operator, `scripts/diag/stretch/openfield.py:25–39`, selects each defender's
first center-distance approach within **1 yard** while the carrier is at least
eight yards beyond the line. It requires no actual collision, grasp or tackle
attempt. “Ended” means the play ends within one second, regardless of cause.
Otherwise “broken” requires speed of at least 4 yd/s half a second later and
at least five yards of subsequent forward advance. “Slowed” is the remaining
category: it does **not** require measured deceleration. These categories cannot
directly establish tackle success rates or a missing physical slowing law.

The approximately **0.5 yd/s** figure is supported by a different proximity
measurement in `docs/reviews/run-game-v3/part11/structure.txt`, under “Speed
kept through encounters that do not end the play”:

| Recorded source | Direction group | Encounters | Median speed loss |
| --- | --- | ---: | ---: |
| NFL | Side/head-on | 68 | 0.76 yd/s |
| NFL | Behind | 409 | 0.89 yd/s |
| d0co | Side/head-on | 24 | 0.46 yd/s |
| d0co | Behind | 58 | 0.47 yd/s |

`scripts/diag/stretch/contactloss.py:22–34` selects each defender's first
approach within one yard after the carrier reaches five yards, retaining it
only if the runner subsequently advances at least **three more yards**. Loss
is the approach speed minus the lowest speed over the next five samples
(0.5 seconds at the recorded 10 Hz rate, shortened at the endpoint). It does
not identify broken holds. “Behind” means the two velocity directions have
cosine greater than 0.5, rather than a measured rear contact location.

Both operators use `scripts/mechanics/metrics.py`: positions are rounded to
0.1 yard and speed uses a centered difference over ±2 frames. Consequently
approach speed already includes subsequent motion; the speed window is bounded
by the recording rather than the whistle. Neither operator separates contact
impulse, rotation, support disruption, requested movement and reacceleration.
Survivor conditioning also excludes encounters without the required later
advance. The comparison motivates a mechanical test; it cannot set a required
speed penalty or contact outcome percentage.

### Exact historical sources and reusable witnesses

The d0co manifest in `docs/reviews/run-game-v3/part11/d0co.manifest.json` pins
`ece674aa72a2b2907c0c6a39f6d53e4f5be08483`, source SHA256
`05c4d6ec65aa5b06a871aeda614b345500d9a4f7dbdeeeb35f465bdc83568ea8`.
The c14co manifest in `docs/reviews/run-game-v3/part12/c14co.manifest.json`
pins `17ca773ab1b4731c2bcc2ec526aef8afad6f8e20`, source SHA256
`18621dcf9084d58a57340de93d412c238426d743c86fb0ea63e8011cd53642ad`,
with its recorded experimental flags. Neither manifest establishes current
accepted behavior.

`data/reviews/current/run-game-v3-witnesses.json` on the research pin contains
an actual native broken-hold witness, `w4-power-package-tempo`, case
`power/strong/i_pro_21/wide9/pair11/77`. Its receipt pins
`b5577605bb10b6d1e35b618d9ba78d75e6f65106`, source SHA256
`cfc66cf54643e0d09a909ae23a0854591b9f7c67d3b51d41eb87b977a39d645c`.
NB grasps at 2.85 seconds and breaks at 3.35; CB_S assists at 3.15 and breaks
at 3.55; NB grasps again at 3.65 and breaks at 4.15. The runner remains upright
at the sampled boundaries, with sampled speed roughly 7.6–8.0 yd/s through
these events. That is evidence of little sustained disruption in this
particular historical encounter, not a frequency estimate.

The opposing `w4-power-package` witness records CB_S contact at 3.40, the
runner's legs fall at 3.65 and a tackle at 4.05. Its different mesh timing
changes incoming geometry, so it is not a matched physical-state control.
The packet preserves constructor inputs, flags, events and rounded 0.2-second
samples; it does **not** contain a complete resumable precontact checkpoint.
The historical one-case receipt records 2.949 seconds of runtime. A current
accepted reconstruction must establish its own outcome and provenance.

The existing [slow-rear witness](../../data/reviews/current/slow-rear-witness.json)
and [loaded-wrap prefix](../../data/reviews/current/loaded-wrap-prefix-witness.json)
preserve full physical inputs and decision tapes for their separate historical
experiments. They can support replay and accounting checks; they are not this
broken-hold encounter and do not establish the proposed missing spectrum on
accepted development. No new simulations, NFL scans or downloads were run for
this audit section. The bounded new work follows.

## Fixed torso hit: the middle exists

`scripts/diag/physics/recoverable-contact.ts` uses unchanged generated RB/LB
profiles (individual-player seeds 61/62). The runner starts at 8 yd/s, facing
forward. A passive defender starts 0.9 yd ahead and 0.45 yd to the side. This
geometry was declared before execution and was not adjusted to obtain a desired
outcome. A true miss moves only that offset beyond the contact radii; square
contact changes only the offset to zero. No tackle probability or grasp is used.

Both glancing arms first achieve **the identical contact and complete body/support
state** through 0.10 seconds in their own retained Worlds. One continues the
ordinary 8-yd/s request; the other receives `free` afterward. The latter removes
active recovery as well as acceleration and is a diagnostic, not a football option.

| Achieved result | Ordinary run after glance | Untouched route | Square hit |
| --- | ---: | ---: | ---: |
| Minimum forward velocity | 6.598 yd/s | 8.000 yd/s | Falls/stops |
| Minimum total speed | 6.738 yd/s | 8.000 yd/s | 0 |
| Lowest movement availability | 0.721 | 1.000 | Falls |
| Largest capture-point disturbance | 0.620 yd | 0 | Falls |
| State over first two seconds | Upright throughout | Upright throughout | Falling at 0.10 s |
| Forward deficit at two seconds | 1.322 yd | Reference | — |

The real hit supplies runner impulse (-136.118, -132.910) kg·yd/s. No subsequent
contact impulse is needed to maintain the speed/distance loss. Facing disturbance
reaches 0.643 rad; ordinary ground actuation removes the lateral drift and returns
availability to one. The declared 95%-speed/stable-facing landmark is reached
1.55 seconds after contact, with a remaining speed and distance cost. This
landmark is descriptive, not NFL calibration or proof of complete recovery.
The identical-contact passive arm falls: active recovery has a consequential
effect rather than instantly canceling the hit.

A configured 48-substep repeat retains the recoverable glance and square fall.
At two seconds, glance forward velocity differs by 0.00028 yd/s and distance by
0.00223 yd. Isolated bodies still use World's ordinary one-step path; this is
contact refinement, not universal convergence. Across all seven final arms,
pair momentum residual is below 1.8e-12 and work residual below 1.3e-11.

## Actual broken holds: load is not net speed loss

The accepted reconstruction of `power/strong/i_pro_21/wide9/pair11/77` tackles
the runner at 4.10 seconds for **1.589 yd** and produces no broken hold. This
cannot certify or refute the experimental package's particular ending.

To investigate the inherited phenomenon itself, a separate historical checkout
at `b5577605bb10b6d1e35b618d9ba78d75e6f65106` reuses the saved witness's exact
flags and constructor. It reproduces all three grasp/break pairs at their saved
times. It stops at seven seconds, before the historical touchdown. No historical
runtime is imported into the candidate. Between this pin and accepted development,
`git diff -- src/physics src/players/physical.ts` shows only the later addition of
`catch-opportunity.ts`; the relevant movement, contact, hold, support and profile
laws are identical.

Observation records final requests, full runner body/support, actual ground
impulse and exact residual internal impulse `mass * deltaVelocity - ground`.
The latter includes tangential loads, unlike reconstructing a contact from the
normal-only `ContactRecord`. The first recorder run omitted the required fatigue
argument when reporting availability; that field was null. It was corrected and
both constructors rerun, retaining identical events/endpoints. No decision or law
changed; the final traces contain complete bodies and finite availability.

From first grasp loading through final release:

- **Zero torso-contact ticks.** These are extended grips, including a `hit`
  event caused by the attempt's closing speed; that event is not a torso impulse.
- Internal loading projected onto each tick's incoming velocity sums to
  **-3.123 yd/s**, while the ground contribution sums to **+3.351 yd/s**.
  These rotating-axis sums are not an exact scalar speed difference. They
  establish that transmitted loading is substantial despite little net slowing.
- Native speed reaches 7.512 yd/s. Balance disturbance continues after release,
  peaks at **1.104 yd**, and reduces movement availability to **0.234**. Release
  does not erase momentum or capture-point disturbance.

The same attained body immediately before loading also runs through the saved
request tape with contact removed. This **mechanical counterfactual** holds
requests fixed; it is not a reacting play, an avoidance option, or proof of a
better football decision. By 5.20 seconds, the loaded native body is **0.396 yd/s
slower** and **1.230 yd behind in field X**, with a 0.466-yd Y displacement
difference. Maximum speed deficit is 0.597 yd/s. The deficit projected onto the
initial heading is only 0.348 yd, because requests and travel direction change.
Reporting path and vector motion matters: no single yardage or speed statistic
describes all these costs. The replay's work residual is below 2.3e-12. Removing
peers also selects the isolated integration path. A zero-capacity connection to
a far passive body holds the clear replay in a 12/16-substep island, with zero
hand work/contact: final speed deficits remain 0.396 yd/s and X differences
1.228 yd. Maximum position/velocity differences from isolated replay are
0.00183 yd/0.00219 yd/s. This bounds that numerical confound without turning the
comparison into a reacting football continuation.

Three additional short native pursuit/tackle controls reuse the existing panel,
seed 3000 and team-roster seeds 61/62, straight 8-yd/s requests at 0/90/135-degree
bearings. The square approach produces a physical tackle. The two side/rear
approaches never acquire a grasp or torso contact and legitimately escape. Their
absence of disruption is an absence of contact, not a physical hit being erased.
Three selected cases do not measure a football-wide contact rate.

## What is actually limited, and the next decision

The represented spectrum already includes untouched misses, glancing momentum
loss, yaw, recoverable imbalance, slipping grips, reacceleration and physical
falls. The present evidence does not justify assigning every failed tackle a
slowdown, increasing grip strength, or matching the inherited proximity totals.

Two physical limits remain concrete. Accepted **unbraced center-mode upper
grasps have no acquired yaw lever arm**, so a hand/jersey hold cannot twist the runner unless torso
contact or ground actuation supplies the rotation. Also, the planar model has
no vertical transmission of a hanging tackler's weight or articulated feet/limbs:
it cannot represent that load, an actual step-over, or distinguish every recovery
stride. Mass and gravity already act elsewhere in the model.
These limits are not proved to cause the 97% diagnostic label. The experimental
common-point model already addresses part of the angular issue and retains
documented adverse/refinement failures; this work does not waive or repeat its
promotion review. Existing arbitrary side-braking and near-surface trials also
failed preserved controls; do not restart them from these statistics.

**Adopt the observation/measurement contract and regression coverage. Hold a new
physical penalty or law/default promotion.** The next physics correction should
be justified from an acquired force point and its actual point motion, with
equal/opposite angular momentum and finite work, preserving both slipping reaches
and secure finishes. A future ordinary-play comparison needs actual torso/hold
impulses and recovery duration before using NFL proximity classes as motivation.
There is no demonstrated defect here that a small scalar slowdown can repair.

## Checks, costs and reproducibility

Candidate: `dc4b8f101d2a04e91be2ffd36b6bb051a36fdbc6` on
`codex/contact-middle`. [Compact receipt](../../data/reviews/current/contact-middle.json)
and [portable native request tape](../../data/reviews/current/contact-middle-native.json)
are separate evidence; the latter reproduces the full-trace mechanical comparison
without reconstructing a historical engine. Source SHA256 is
`4273994fa50f0f11a54bff53b374ad87d80766be471ca727ce43f76fdef83571`.

Three new focused checks cover achieved disruption/recovery, genuine miss versus
square/passive falls, and refined conservation/work. All pass. Typecheck passes.
Existing accepted combined-suite evidence is reused; no full suite, games, NFL
scans or downloads were added. New bounded constructor continuations are explicitly
listed above, including the recorder reruns.

Final mechanical harness: 0.067 s (wrapper 0.322 s). Three native approach controls:
0.126 s. Final accepted/historical constructors: 0.665/0.954 s (wrappers
1.029/1.288 s). Final fixed-request replay with refinement: 0.068 s (wrapper
0.302 s). Focused checks: 1.458 s. Typecheck: 19.942 s, then 11.807 s after
adding the numerical-confound control. Initial one-second and recorder-debug
costs are recorded in the compact receipt rather than hidden from total cost. These are
local measured wall times, not a simulator throughput benchmark.

```sh
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/recoverable-contact.ts --seconds 2 --refine 48
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/native-contact-middle.ts out/contact-middle/native-power77.json
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/contact-middle-panel.ts out/contact-middle/native-three.json
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/contact-middle-replay.ts data/reviews/current/contact-middle-native.json out/contact-middle/portable-replay.json
node scripts/baseline.mjs --candidate -- npx vitest run --project core test/recoverable-contact.test.ts
```

Use Node 22.23.3 and the published compact receipt's exact historical flags for
that separate constructor. The receipt pins the input/operator/source hashes,
all final output hashes, commands and costs. Detailed traces stay in ignored
`out/contact-middle/`; the committed compact tape retains the replay inputs.
No candidate runtime source differs from accepted
`src` or baseline settings.
