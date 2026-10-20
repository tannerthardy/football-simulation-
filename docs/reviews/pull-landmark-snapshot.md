# One acquired picture for the puller's remaining turn

2026-10-20. Minimal correction: `615d0c0862e0772d20d7a20044854e2ac5369b53`
on `codex/gait-intent`. **Request-consistency defect demonstrated and repaired;
native football benefit remains inconclusive. Hold rollout.** The two-file
source/test commit applies independently to accepted `2c98bed9`; it does not
require the burst, braking-planner, bearing or solver experiments.

## Process adopted

Read Measurement's full [diagnostic-process critique at f3063e5](https://github.com/tannerthardy/football-simulation-/blob/f3063e550b434d355fc050bfc604a894303ea0a0/docs/reviews/diagnostic-process-critique.md).
This pass follows the actual producer → refinement → World input → motion
chain, preserves earned transitions and opposing football, and separates
defect, intervention and transfer. It adds no architecture, mandatory panel or
NFL scan. The diagnostic now copies actual behavior returns and World inputs;
its before-replay exactly reproduces the prior body hash, events and frames.

## The first demonstrated mistake

In the saved trap, at command time 0.80 s (step ending 0.85), the blocker has
the same entering body state in both arms. His adopted current waypoint is
Y=25.461801, but his actual request still aims at Y=25.273535. The wall-depth
refinement uses the old `wp` object's Y after the acquired goal has been
replaced. This is an actual command discrepancy, not just stale metadata.

There is a second part of the same contract: the current target-derived
landmark updates while the outgoing landmark retains older coordinates.
Lookahead plans a shallow turn that will not be executed when the outgoing
landmark is subsequently updated. On a saved fixed state, stale versus
same-picture geometry permits 4.63 versus 2.62 yd/s; later 7.25 versus 2.95.

The correction updates the remaining target-derived Y coordinates together
from the **existing held acquired read** and preserves the adopted Y through
the wall-depth adjustment. Depth X, read cadence, fit/penetration decisions,
targets, kick/trap responsibilities, lead/wrapper tracks and physics stay as
before. No information query or movement capacity is added.

Earned waypoint progression remains unchanged. An initial trial refreshed
the cue before checking arrival; review correctly rejected that extra policy.
Physically reaching a held goal can earn progression before new information
revises the remaining work. The final test establishes a held goal with two
actual behavior updates and preserves that legitimate transition.

## Evidence and limits

Ten focused controls give **6 failures / 4 passes before**, **9 passes / 1
failure with pairing alone**, then **10 passes with pairing plus the wall
refinement correction**. Mirrors, held/private-state independence, opening
step, earned arrival, penetration and wrapper controls remain. The broader
directly affected check is **43 passing tests in 2.81 s**, plus typecheck.
Non-author review supports the bounded source correction. No full suite ran.

Four exact native inputs were tested alone on accepted physics, then with the
existing gait research. All use recorded flags, `RUN_CONTACT_COMPONENTS=1`,
`PULL_STEP=1`, `GAIT_STEP=0`; these are controlled prefixes, not an accepted-
default population sample. Existing before recordings are reused.

| Input | Accepted before → landmark correction alone | Burst research before → composed correction |
| --- | --- | --- |
| Counter | Both live at 4 s; final gain unknown | Tackle 6.79 yd → live at 4 s; final gain unknown |
| Power | Exact body/event identity; tackle 1.78 yd | Exact body/event identity; live at 4 s |
| Fresh trap | Tackle 2.08 → 0.81 yd | Tackle 0.06 → −0.23 yd |
| Outside zone | Exact body/event identity; tackle 5.10 yd | Exact body/event identity; live at 4 s |

The adverse trap is not cleared by passing mechanical tests or earlier
engagement. The first changed guard request reaches World unchanged; the
earliest issue is its planned goal, not an unexplained failure to accelerate.
Later carrier spacing responds to changed geometry. Its precise acquired
peer picture was not captured, so that response is not declared wrong.
Unchanged phase timings in this witness also fail to support reordering
progress. Final tapes match the earlier trial's actual requests, World inputs,
body histories and events on these inputs; compatible causal evidence is reused.

Independent tiny movement controls argue against more lateral capacity:
aligned 45°/90° corners stay within 0.116/0.221 yd of their nominal path. A
perpendicular 2.5-yd/s entry drifts 0.768 yd under radial pursuit, while lawful
braking first limits it to 0.523 yd; an independent held-step calculation
gives 0.5225 yd. Both controls keep the same body and laws. A slower opposing
entry already works faster without braking first. This demonstrates an
achievable alternative for a declared corridor, not a universal brake-first
policy or a defect in the explicitly radial-only arrival helper.

The fix does not certify complete 2D access. Near-wall X differs from the
stored progress point, incoming momentum may not match a nominal path, and
clearance selection has its own retained corridor. Known facing/support and
contact-law holds remain. No strength, recovery, yaw, traction or global
settling changes were made, and no NFL reference was recollected.

## Decision

Keep the small request correction independently reviewable; keep burst
activation and native adoption held. **Next: Run reviews useful position at
runner arrival in this exact trap, using the captured requests to determine
whether the remaining clearance/fit transition offers a recoverable route.**
Physics should change a law only if that review supplies a justified feasible
request that the body fails to execute. Do not tune force to rescue this gain.

Standalone/composed runtimes are `4d83dab9…` / `cbd6b742…`. Final four-prefix
trace collectors cost 6.08/4.80 s with instrumentation and concurrent work;
these are collection costs, not a native performance comparison. This pass
used 21 prefix executions across four fixed setups, including retained trials,
plus three tiny mechanical collectors; zero games, NFL scans or full suites.
The [compact receipt](../../data/reviews/current/pull-landmark-snapshot.json)
records exact inputs, flags, source/collector hashes and retained failures.
