# Attainable tackle timing and the next contact repair

## Status and where to start

Tackle attempts now compare opportunities using the defender's **actual last
movement command through the existing World**, rather than assuming his current
velocity continues. This is a small controller repair; physical capacities,
grip execution, support mechanics and solver resolution are unchanged. It follows
[the approach-control increment](approach-control-and-remaining-contact.md).
[Recovery allocation](recovery-allocation-and-run-contact.md) remains the latest
solver change. Full anatomical foot/ground expansion remains paused.

Read [the evidence and rerun commands](../../../data/reviews/physics-world/tackle-timing/README.md).
Watch [the paired tackle library](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/tackle-timing-review.html), or
download [its offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/tackle-timing-review.zip). Start with
`BASE-TB-W-S83-L` and `CAND-TB-W-S83-L`, the separate plant/brake witness.
The library also preserves ordinary frontal, crossing, glancing, fatigued,
off-balance, traffic and faster-runner escape cases.
The [paired 11v11 run library](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/tackle-timing-runs.html) and
[its offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/tackle-timing-runs.zip) retain the previous fixed
film selection under both sources, with full recorded player/contact state.

The next solver problem is now isolated in
[Lower attachment-bound diagnosis](lower-attachment-bound.md). It is **not
fixed** by this controller increment. The physics has not earned the final OK,
but neither that defect nor a complete biomechanics model is a reason to freeze
small, demonstrated football-control improvements.

## What was wrong, and what changed

A defender's momentum can be closing while his feet are already braking or
redirecting. The old tackle policy extrapolated constant relative velocity and
waited for a better hip position. That position can be unattainable under the
command he is actually executing. Conversely, controlled movement can create
a closer opportunity that the straight-line estimate misses.

The new helper copies the current body/support state into the existing one-body
scratch World and holds the executed command for six ordinary 50 ms samples.
It compares current and future wrap geometry over the previous 0.3-second
horizon. It credits only actual decision samples: a hip passing between samples
is not a reason to skip the current attempt. If the forecast loses upright
support, only earlier upright samples count.

The carrier comes from the defender's delayed observation, with the same visual
lag as pursuit. Tackle evaluation follows physics, so that stale observation is
advanced by its own observed velocity to the body-state boundary. Current and
future waiting estimates use the same observation. Physical reach, occlusion,
contact quality, execution rolls and grip acquisition still use actual geometry.
No extra behavior update or random draw is made by the forecast. Future cuts,
commands, obstacles and contact forces are unknown.

This is deliberately restricted to upright, free movement below form-tackle
quality. Active contact/joints, held support, strikes, committed lean/load,
down states and unsupported commands retain the previous policy. Form tackles
and assists keep their existing decisions. The existing 0.1 quality improvement
threshold is preserved, not fitted. This is not a tackle-success oracle or a
new movement law.

When replay telemetry is enabled, the actual decision records its observed
quality, best attainable sample, choice and cue. Select the defender and inspect
the decision panel to see why he waited or reached. Recording does not change
physical state or RNG.

## Controlled transfer and its limits

The primary panel has 56 mirrored rows: seven predetermined geometries/states,
two generated roster pairs, two reused play seeds and both mirrors. These are
28 unmirrored inputs, not 56 independent NFL samples. Eight historical crossing
witness rows remain separate. Incoming moving players have coherent straight-line
perception history ending one tick before the staged state; the first ordinary
tick records that state. Repeating a moving pose would bias dead reckoning.

All 56 primary and eight crossing witness physical signatures, first-attempt
geometries and endpoints match the previous source exactly. This is regression
evidence, not proof of benefit. All eight faster-carrier negative controls remain
unchanged. Both sources pass 64 observer controls and nine film-recording
controls. Mirror position error stays below `3.6e-10` yd; observed work residual
stays below `8e-12`, with no motor-work excess.

The **separate retrospective plant/brake witness** interrogates the diagnosed
law directly. One unedited roster pair, two play seeds and both mirrors start
with a runner moving at 6 yd/s and a defender at 7 yd/s requesting a stop. At the
first post-physics decision, actual contact quality is about 0.310; constant
velocity predicts 0.506. The achieved braking trajectory offers no sufficient
improvement. The old policy waits one tick; the new one attempts immediately.
Both seeds naturally end in tackles. Seed 83's new initial hold is slightly
weaker, and final advance improves by about 0.354 yd; seed 131 concedes about
0.358 yd more. The demonstrated benefit is **command-consistent timing**, not
universally stronger grips or better endpoints.

Live inspection-window endpoints are censored, not engine timeouts or missed
tackles. The isolated recordings start two seconds into a staged catch; viewer
clocks consistently subtract two seconds. Tick-start event labels and
post-physics attempt geometry differ by the ordinary 50 ms boundary. Raw LOS
gain includes the runner's existing ten-yard lead; the film labels post-catch
advance separately. Constructor route/coverage state is setup scaffolding,
not evidence that those schemes are executing in the isolation fixtures.

## Full-football checks

The unchanged run panel retains 144 actual 11v11 inputs: three roster pairs,
six concepts, Over/Under fronts, both directions and two play seeds.

| Measure | Previous source | New source |
| --- | ---: | ---: |
| Mean simulated forward-progress gain | 1.99 yd | 1.84 yd |
| Median gain | 1.05 yd | 1.05 yd |
| Stuffs | 23/144 | 23/144 |
| Runs gaining 10+ yd | 5/144 | 4/144 |
| Missed attempts / broken holds | 15 / 11 | 15 / 12 |
| Timeouts / lower-bound releases | 0 / 0 | 0 / 0 |

These are raw play results before game-level penalty enforcement, not official
NFL rushing statistics. Results are mixed, and no rate or mean was fitted.
Changes in first-contact timing/geometry remain visible in the paired report.

The largest gain difference, `RC-R3-trap-over-L-S3`, was selected **after**
measurement for first-difference diagnosis. Both recorded trace signatures match
their panel rows. At 3.35 seconds both sources have the same physical state; the
old SS reaches, while the new SS's delayed observation predicts a better
attainable sample. It reaches at 3.40 seconds and 1.180 yd instead of 1.242 yd.
The new hold survives; the old first and second holds break. Raw forward progress
changes from 26.48 to 3.66 yd, but the baseline also has a holding penalty.
Changing attempt time changes subsequent execution-roll order and angle, so
the stronger acquired hold is not wholly attributable to closer geometry.
This trace explains a mechanism; it is not representative selection or a
guaranteed improvement in official game results.

Four full-game guards keep starting rosters and game seeds. There are no physical
timeouts or motor-work excess, but the exposed lower-bound releases rise from
two to seven. Divergent snaps change later RNG, situations and playcalling;
these are regression guards, not independent matched-play causal estimates,
league calibration or an isolated performance benchmark. The release increase
is retained openly and makes the localized contact repair the next priority.

## How to choose the next work

1. **Try the bounded lower-attachment map as a default-off experiment.** Follow
   the diagnosed restart and matching geometry/velocity/Jacobian/work paths in
   [the lower-bound review](lower-attachment-bound.md). Do not delete the bound,
   clamp support after solving or reset a held point. A hold may legitimately
   escape; eliminating every release is not the goal. First establish derivative
   and virtual-work correctness, progressive weak/medium/strong restraint,
   ordinary tackles, mirrors and local refinement, then paired football transfer.
2. **Localize the remaining sustained hand-contact disagreement.** Find the
   first differing support/constraint transition in the retained QB/rusher case.
   Keep localized solver changes tied to that evidence; do not raise resolution
   globally or expand spatial feet first.
3. **Return to early run contact and controller transfer.** The existing NFL
   tracking references constrain get-off, acceleration and movement distributions.
   Diagnose OL response advantage, posture, double teams and actual assignments
   before changing force magnitudes. Broader pursuit, coverage and run technique
   work is appropriate when it exercises the same shared capabilities.

One coherent reduced model should explain anchoring, double teams, shedding,
absorbed runner contact, jams and tackles without scenario-specific strength
bonuses. Physical consistency, stable football-scale convergence, attainable
control and believable varied film are the readiness gates. Scores and exact NFL
averages cannot substitute for those gates.

Validation: 549 TypeScript tests and 22 Python tests pass; typecheck/build and
browser/video checks are retained in the evidence manifest. The isolated helper
cost report measures current helper calls only, outside concurrent workloads;
eligible calls cost roughly 0.03 ms on the retained runtime. It is not a
before/after or full-game overhead claim. No physical parameters,
roster traits, NFL targets or PR #1 changes are included in this increment.

The browser checker now selects a recorded window long enough for its 1.2-second
video test, and pauses short fixtures during intentionally delayed telemetry
decoding. Export locks, state restoration, cancellation, stale-decode handling
and actual decoded video frames remain checked. The shared viewer template and
engine are unchanged by these test repairs.
