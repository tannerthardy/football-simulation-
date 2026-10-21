# Achievable approach control and remaining contact work

## Status and where to start

The production pursuit controller now compares three existing movement commands
through the **unchanged production World** when a crossing approach is imminent.
It can redirect earlier without increasing agility, traction, strength, grip
quality or physics resolution. Full anatomical feet remain unnecessary for this
repair. The model is still not ready for the final physics OK.

Read [the source-pinned evidence and rerun commands](../../../data/reviews/physics-world/approach-control/README.md).
Watch the [paired run library](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/approach-control-review.html) or its
[offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/approach-control-review.zip), and the
[isolated crossing tackles](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/approach-tackles.html) or their
[offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/approach-tackles.zip).

The preceding [recovery allocation report](recovery-allocation-and-run-contact.md)
remains the latest change to the physical solver. This increment improves how
players use those capabilities, and exposes the next contact problems.

## The diagnosed problem and small repair

The scalar interception estimate can call a point reachable while the actual
body's momentum, yaw and coupled braking/cutting carry it past. The existing
radial arrival policy helps once selected, but transverse motion can delay that
selection. Turning the body faster or weakening momentum would conceal this
controller problem.

For an upright, moving, unconstrained pursuer with substantial transverse relative
motion, `chooseApproach` first previews his original command for 0.6 seconds at
the ordinary 20 Hz movement interval. Only if that trajectory enters the existing
close-arrival region does it compare moving arrival and velocity matching. It
chooses a different command only for more than 0.1 yard of predicted improvement.
These are transparent controller choices, not measured NFL physical constants.

The forecast uses delayed observed carrier position/velocity and existing
leverage. It assumes that motion continues; it cannot see future cuts, obstacles,
grips or tackle outcomes. Original pursuit, angle error, perception delay and the
actual collision/tackle solve remain in authority. Head-on breakdown and close
strikes keep their existing policy. Engagement, grip ownership, held support,
contact load, committed lean, strikes and down states exclude the free preview.

The reusable one-body scratch World copies complete body/support state for every
candidate. Tests compare it with independent World execution, including fatigue,
balance recovery, yaw, rising timing, optional-state clearing, mirroring and
nonmutation. There is no second movement formula or new physical backend.

The objective is **closer attainable approach geometry**, not universally slower
impact. In the reproduced actual tackle it produces a closer, squarer hold, with
greater normal closing speed. Do not describe this as a general gentle-tackling
calibration or a guaranteed tackle.

## What the retained evidence says

The mechanical panel retains 120 predetermined cases across three roster pairs,
five geometries, two speeds, mirrors and 12/48 physics subdivisions. Its four
additional crossing witnesses are explicitly retrospective diagnostics, separate
from the primary cohort.

- Native positive body-contact cases stay at 48/48; faster-carrier negative
  controls stay at 0/12. Eight primary trajectories change. Body contact is
  not a tackle-success measure.
- The reproduced crossing approach formerly passed 1.240 yards away without
  torso contact. The new command reaches torso contact in the 1.00–1.05 second
  interval under both resolutions and both mirrors.
- Primary contact/fall agreement under refinement remains exact; momentum and
  work residuals remain at numerical precision. Continued five-second mirror
  position error reaches 0.000156 yards. Those checks do not prove convergence
  of prolonged grips or hand fighting.

The separate real-tackle follow-up runs the ordinary 22-body PlaySim/tackle
lifecycle with parked bystanders, one straight carrier and one pursuer. Four play
seeds and their mirrors share one generated roster pair. Both sources eventually
tackle every fixture: the baseline mechanical miss was **not** an automatic
missed tackle. New first wraps occur about one tick earlier and closer to the
runner. In seed 19 the old first grip breaks, allowing approximately 19 additional
yards; the new first grip holds. Other endpoint improvements are smaller. These
four cases establish useful transfer, not an NFL tackle rate.

The matched full-football panel contains 144 runs across three roster pairs,
six calls, Over/Under fronts, both directions and two play seeds:

| Measure | Previous source | New source |
| --- | ---: | ---: |
| Mean credited gain | 1.82 yd | 1.99 yd |
| Median credited gain | 1.06 yd | 1.05 yd |
| Stuffed runs | 23/144 | 23/144 |
| Runs gaining 10+ yards | 4/144 | 5/144 |
| Missed attempts / broken holds | 14 / 11 | 15 / 11 |
| Timeouts / lower-range releases | 0 / 0 | 0 / 0 |

These results are mixed. First-contact locations/times are effectively unchanged;
the approach repair mainly affects subsequent pursuit. No NFL mean, success rate
or explosive rate was fitted. Four matched full-game guards retain the same
generated roster pairs/seeds, but divergent snaps change subsequent RNG and
playcalling. Their rates and scores are not evidence of league calibration.
The full-game guards retain three lower-attachment releases under the previous
source and two under the new one; absence of that release in the 144-run panel
does not establish that the transition is fixed.

The isolated warmed cost panel measures eight fixed command inputs with source,
script, profile and input pins. Eligible three-command calls cost roughly
0.16–0.17 ms each; distant, close-strike, head-on and faster-escape cases retain the
cheap path, or only need the initial forecast. Do not extrapolate this eligible
call cost into a full-game percentage. One-body forecasts are excluded from
physical-game tick/contact accounting, while their cost remains in game CPU time.

Validation passes: 525 TypeScript tests, 22 Python tests, typecheck and build.
Browser checks cover both self-contained libraries; the isolated tackle library
also exercises actual WebM export and decoded-frame verification. The retained
logs and artifact checksums are listed in the evidence manifest.

## The rejected broader scope and useful failures

The first candidate allowed a short forecast to replace a longer interception
while the players were almost ten yards apart. In `RC-R2-counter-under-R-S11`,
the corner chose a different angle at 5.25 seconds, attempted a fingertip reach
at 6.90 seconds, and the run became a touchdown. The final cue waits for the
original preview to enter the close-arrival region; this run now ends in a
28.86-yard tackle. The previous 28.78-yard endpoint was not a target or correctness
criterion. The retained traces explain the scope change.

Two remaining issues were exposed by that broader candidate:

1. **Attempt forecasting disagrees with movement control.** The tackle policy
   compares current and constant-velocity future contact quality. In the trace,
   current quality is 0.064 and predicted quality 0.152, just below its 0.1
   improvement threshold for waiting. It reaches at 1.476 yards; the old approach
   later reaches at 0.890 yards with quality 0.819. The prediction omits the
   pursuer's subsequent achievable braking and turning.
2. **The lower attachment bound needs scrutiny.** At 7.85 seconds the low hold
   releases because its reduced support attachment exceeds the runner's body
   reach limit. It does not exhaust force capacity or slip at the hands: actual
   holder-to-attachment distance is around 0.60 yards, effective capacity around
   937, and solved force falls from 86.9 to 35.1. The runner then recovers. This
   is an existing reduced-support transition, not proof that NFL grips behave
   that way. It is retained as a mechanical diagnostic, although the final
   controller no longer triggers it in this run.

## Next, in order

1. Compare attainable tackle quality with the same movement limits and observed
   target motion. Improve when to wait for a form tackle versus take a desperate
   reach. Preserve credible misses and avoid grip-strength fitting.
2. Extract the retained low-hold anatomy-bound release into a small actual-World
   scenario. Locate the first incompatible attachment/support state; determine
   whether bounded force transfer or a better reduced attachment law can handle
   it without adding anatomical feet or simply suppressing releases.
3. Localize the worst sustained hand-contact divergence from the previous report.
   Agreement on falls is insufficient when trajectory error remains about
   0.82 yards. Test a local persistent-state repair before higher global resolution.
4. Continue early-run penetration work with snap reaction, posture, first steps
   and combo-release decisions, using matched NFL get-off/contact measurements.

The owner can help by identifying the first implausible approach or reach in the
paired clips, with fixture ID and time. A believable escape is not a failure
merely because the final gain is large. No new large dataset is needed to diagnose
these retained problems.
