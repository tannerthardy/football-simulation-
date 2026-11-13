# Nearby coverage help and current engine priorities

## Status and where to start

Keep the reduced shared physics model. This increment repairs a demonstrated
coverage decision without changing movement, contact, strength, support or
solver resolution. A defender now checks whether the help he observes can keep
its cushion and corridor through his next read, rather than trusting its
current spacing alone.

Watch the [ten paired recordings](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/projected-help.html), or use the
[offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/projected-help.zip). The
[saved evidence and rerun commands](../../../data/reviews/physics-world/projected-help/README.md)
retain the baseline, final version, rejected far-help prototype and near-only
ablation. Four paired recordings were selected before outcomes; the fifth is
an explicitly labelled retrospective witness from the same fixed panel.

This is a bounded controller repair inside the existing physical capabilities.
It does not establish NFL coverage quality, a universal physics OK, or that
95% of possible physics gains have been exhausted. No anatomical expansion is
justified by this decision error.

## The observed error and small repair

The old help check accepted an upright teammate between roughly half a yard
and six yards above a receiver, within its lateral corridor. That picture
could qualify even when the receiver would erase the cushion before the
observer's next read. Another defender could then abandon the threatened
vertical to squeeze an underneath route.

The new pure check uses the **already consumed**, delayed receiver and helper
positions and velocities. It requires positive depth cushion now and at the
next-read horizon, and a lateral corridor at that horizon. The horizon is the
defender's existing decision interval plus the helper picture's age. That age
adds a conservative uncertainty reserve; it does not dead-reckon the position
a second time. Receiver-read age is not separately propagated here.

Existing discipline and stable judgment error affect the same cushion/corridor
thresholds. Observed down/rising helpers still cannot supply help, and unknown
pose retains the previous imperfect geometric guess. There are no new vision
queries, random draws, assignments, hidden physical capacities or future
trajectory reads. A defender may still be fooled by an outdated picture.

The six-yard maximum stays. This patch does **not** solve responsibility
transfers to distant safeties. It also does not change route recognition,
primary assignment rules, man alignment, pressure, QB throwing or pursuit.

## The ordinary football witness and controls

The fixed panel has 24 ordinary pass inputs: two generated roster pairs, four
concepts and three coverages, with identical before/after calls and seeds.
Every initial context matches, and all observed/plain recording controls match
in both versions. Full endpoint contexts match in 21/24 pairs; physical
execution, requests, ball, events, stats and random-stream payloads match in
23/24. Two otherwise unchanged Bunch cases only alter judgment memory.

The changed execution is `HELP-R2-gun_trips_11-smash-cover4-S3`:

- At 2.85 s, CB_S observes SS about 1.206 yd above H. Over the consumed
  0.214 s horizon that shrinks to about 0.299 yd, below this defender's
  0.479 yd judgment margin. CB_S keeps the vertical instead of squeezing Z.
- At 3.05 s, FS sees SS about 0.458 yd above H, with a projected cushion of
  -0.253 yd over 0.224 s. FS protects H instead of squeezing Y.

Both directives follow the moving picture. They do not consult the safety's
actual assignment. The defense gains vertical attention while giving up
underneath space: the baseline throws an interception and its return is still
live at the eight-second inspection limit; the candidate completes a short
pass with 4.307 yd of natural field advance. An unfinished defensive return
is not an offensive gain or a forced whistle.

Across the panel, accepted help queries fall from 120 to 100, and accepted
straight-line cushions lasting under half a second fall from 61 to 38. These
are repeated queries, **not independent plays, busts or NFL frequencies**.
Twenty-yard natural completed advances remain two. The natural endpoint count
changes 22 to 23; the remaining play is a live censor. The 13.37 versus 14.07 yd
mean natural completed advance uses different completion membership and is not
official credited game yards or a causal passing estimate.

## Why the farther forecast remains a prototype

A tested prototype additionally allowed help beyond six yards when a constant
velocity encounter was predicted within two seconds. It passes staged positive
and adverse controls and records six eligible far-help queries. However, its
24 ordinary executions are identical to the near-only ablation: the observed
football correction comes from short persistence, not the far extension.

A retrospective Dagger picture also shows the danger of a long static
forecast: at 2.0 s it predicts the safety reaching receiver depth at 3.40 s,
but the recorded safety is still roughly 5.8 yd above and 3.8 yd laterally away
then. The ball was already thrown at 2.25 s. This is a forecast limitation,
not a measured bust rate. Future techniques can change either trajectory.

Keep the exact prototype bytes and results for future work. Before promoting
far help, show an executed transfer that protects the original deep threat,
include a departing helper and a competing primary, and preserve an ordinary
control. Two seconds is an unvalidated prediction assumption, not an NFL
calibration or a play-clock trigger. Do not delete the depth maximum alone.

## Verification and remaining limits

Twenty-one new tests include close approaching help, disappearing cushion,
lateral departure, mirrored pictures, observed pose/recovery and conservative
far uncertainty. On the original engine, six intended regressions fail while
15 controls pass. All 39 focused coverage tests pass on final.

The final 678 TypeScript tests, 22 Python tests, typecheck and build pass.
All 144 run rows and all 64 tackle rows are identical to the baseline with
the same collectors/profiles, including requests, physical trajectories and
outcomes. Every original recording control still passes. This transfer is
checked at the complete row level, not merely aggregate outcomes. Concurrent
simulation timings are not performance benchmarks.

The two game scores change 19–14 / 41–17 to 25–14 / 20–27. Combined credited
yards per completion rise from 15.25 to 15.94; receiver YAC rises from
8.27 / 8.76 to 9.47 / 9.14 yd. Twenty-yard completions rise from 24 to 25,
while interceptions remain 15. Rushing YPA changes 1.40 to 2.46 with a
different set of calls. Full-game results remain mixed.
Changing coverage changes later calls, clocks and random draws, so two games
cannot identify a causal effect or establish NFL calibration. Do not choose
coverage or physical force parameters by their scores. The shorter estimator
ships because its decision correction has an executed ordinary witness; the
far estimator needs its own evidence.

Neither final game has a physical timeout, lower-hold release or support-motor
work excess. Maximum momentum/work residuals are roughly 1e-11 kg·yd/s and
5.4e-11 kg·yd²/s². These accounting guards preserve the common physical model;
they are not measurements of actual NFL contact forces or coverage quality.

The underlying movement/contact model is untouched. Earlier exact achieved
force/travel oracles still apply. Nonuniform contact-onset/support-chart
refinement, pursuit in traffic and incorrect controller requests remain
separate questions; conservation alone does not demonstrate authentic football.

## Next, in order

1. **OL target changes and obsolete combo ownership.** `RunBlock` can replace
   `plan.target` through `findWork` while retaining an unreleased combination
   for the old defender. The pointer suppresses individual reach/cutoff and
   exchange logic, and the helper can still aim through the old partner.
   A staged ordinary update reproduces this lifecycle defect on the current
   physics baseline. Historical Trap telemetry contains the same stale state,
   but the old unstaged fixture no longer reproduces it; its current frequency
   is unmeasured. Test cancelling the shared combination atomically when an
   actual retarget leaves its defender, distinguish cancellation from a proper
   climb, and preserve live engagements/regrabs/unrelated combinations.
2. **Pursuit and tackle approaches in traffic.** Current short movement
   forecasts do not execute other players' future collisions. Stage a
   multiple-pursuer or traffic failure alongside ordinary approach controls,
   then separate bad requests from infeasible grip or support execution.
3. **Distant coverage transfers.** The old
   [roof audit](coverage-roof-priority-audit.md) remains a useful hypothesis
   list, but its far portion is unimplemented. Earn responsibility changes
   through executed coverage cases, including abandoned primary risk.
4. **Local numerical debt where it matters.** Reproduce the first material
   divergence before changing contact onset, passive capture or support-chart
   integration. Do not increase global resolution or anatomical detail to
   repair a stale assignment or an unreachable approach request.

Use NFL tracking for conditional movement/contact distributions across
generated rosters. Keep pressure, outcomes and playcalling separate from the
physics validity checks; this increment adds no NFL observations and does not
fit league averages. Main and PR #1 remain outside this work.
