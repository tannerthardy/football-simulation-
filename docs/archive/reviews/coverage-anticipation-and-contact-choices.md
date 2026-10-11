# Coverage anticipation and contact choices

## Status and where to start

This follow-up is on `claude/engine-priorities`, starting at `1f9b048`.
Read [the error-budget method](error-budget-and-protection.md#how-to-choose-and-avoid-loops)
first. The changes below improve the measured passing problem, but do not
finish it. Evidence and NFL aggregates are in
[`data/reviews/coverage-anticipation/`](../../../data/reviews/coverage-anticipation).
The [data guide](../../../data/archive/catalog-2026-10-11.md#coverage-and-contact-choice-evidence)
has reproduction commands; raw NFL data is needed only for the extractor.

Work on this branch. Do not push to or merge PR #1
(`codex/run-blocking-decision-dynamics`) without checking with the owner.
`src/sim/tackle.ts` is unchanged from this branch's graded-grasp rewrite.

## What changed, and why

The 32-game baseline reproduced the previous review exactly: separation
4.23 yards, YPA 9.68, YAC 6.57, and 36.75 points per team-game. The largest
budget component was yards per completion, +0.72 points per drive.

Five football mechanisms were wrong or incomplete:

1. **Press release footwork.** A receiver within 2.5 yards opened the corner's
   hips immediately, including at the snap with a stationary receiver. The
   corner then targeted a point behind his own alignment, stepped downhill,
   and turned again as the receiver accelerated away. He now stays square
   until a moving release becomes visible and compresses his actual initial
   cushion as the stem develops. No faster athletes or shorter base reaction
   times were introduced.
2. **Depth against the release.** Deep defenders treated a landmark minus four
   yards as a minimum depth, even with a receiver still developing his stem.
   They now manage cushion relative to the observed release. A vertical that
   consumes cushion triggers the hip flip using closing speed and physical
   turn time; once committed, the defender races it at his available speed.
3. **Route distribution.** Overlapping quarters bands could make both the
   corner and safety favor #1, or have the safety split #1 and #2 while the
   corner already carried #1. The base quarters rule now prioritizes #1 for
   the corner and #2 for the safety. Thirds corners likewise prioritize their
   outside receiver. Halves and middle zones retain their split rules. This
   is a basic distribution, not a complete trips/poach/exchange system.
4. **Crossing-route hips and eyes.** An underneath match defender carried
   crossers with his body facing the QB, forcing a permanent shuffle speed
   limit. He now opens his hips to carry a crosser. Looking over a shoulder
   can reveal the QB's release; sprinting directly away still obscures it.
   Release visibility keys the QB's location, rather than the moving ball's
   later position.
5. **Arrival at the ball.** An in-phase defender could sprint through each
   recalculated interception spot, run across his man, and leave the contest.
   Reachable spots now use physical arrival/braking. Before seeing the throw,
   a man defender keeps matching the receiver's velocity. A late defender
   closes to the catch instead of preserving a fixed yard of standoff plus
   inside shade.

`RouteObservation` adds a small anticipation model to these mechanics. It
uses delayed speed changes and torso orientation to forecast braking and a
short turn, bounded by the receiver's physical braking/cutting limits. It
does not inspect the route, next waypoint, hidden call or future position.
Anticipation, coverage skill and current focus control confidence. A hip fake
can induce a small wrong step; the next observed movement revises it. A torso
pointing back toward the QB does not imply a reversed route. The existing
attention lapses and physical hip rotation still create mistakes and recovery.

## NFL reference: compare the same event and sample

The new `bdb2025_coverage.py` extractor uses 2022 weeks 1–2, labeled targets,
football event frames, and all eleven defenders. It excludes nullified plays,
spikes, ambiguous targets and incomplete measurement frames. Outputs contain
aggregates only.

| Nearest-defender center distance | NFL mean | Median | n |
|---|---:|---:|---:|
| At release | 4.01 yd | 3.55 | 2,018 |
| At arrival | 3.68 yd | 3.03 | 1,615 |
| At completed catch | 3.43 yd | 2.77 | 1,267 |

NFL catch separation differs by coverage: Cover 1 2.52, Cover 2 4.27,
Cover 3 3.58, Quarters 3.30 yards. Two-Man is 1.94, but only 17 catches.
These observational cohorts contain different routes, situations and matchups.
They are not interchangeable with the lab's uniform call mix or a league-wide
NGS target around three yards. NFL arrival also includes off-target passes;
the engine's catch-contest separation omits those. Do not replace calibration
targets just to make this run appear correct.

## Paired coverage evidence

The fixed matrix has **2,592 plays per revision**: roster seeds 7/19/31,
two shotgun 11-personnel formations, both flips, six concepts, nine coverage
contexts and four repetitions. Front/personnel/situation are Over/nickel,
first-and-10 at x=40 on the left hash. Concepts cover slants, outs, curls,
crossers and verticals; there is no play-action sample here.

| Metric | Before | Coverage only | Coverage + contact choices |
|---|---:|---:|---:|
| Target separation at throw | 4.00 | 3.54 | 3.54 |
| Separation at completed catch | 3.67 | 3.43 | 3.43 |
| Catch-contest tight windows (<1 yd) | 5.49% | 7.05% | 7.05% |
| Yards per completion | 15.58 | 14.61 | 14.58 |
| YAC per completion | 7.93 | 7.71 | 7.67 |
| 20+ yard completions / attempts | 14.27% | 12.42% | 12.50% |
| Interceptions / attempts | 4.00% | 5.07% | 5.07% |

The result is not uniform. Quarters yards per completion fall 17.90 → 12.35,
while catch separation rises 3.63 → 3.76: the QB selects a different remaining
window. Cover 2 spot yards per completion rise 15.90 → 17.17; Cover 0 remains
explosive. Mean separation alone cannot decide whether those mechanisms work.

`coverage-matrix.json` contains the cumulative development stages and route,
coverage and roster cells. These are successive mechanism changes, not
independent ablations. `paired-plays.json` retains contexts, seeds, outcomes
and distances for before/coverage-only/final comparisons. Six representative
traces per revision were selected by context before seeing outcomes (X,
roster 7, gun doubles, unflipped, rep 0; curls/verticals vs 1/3/4).

## Contact avoidance: preference, not a fear roll

A carrier's forecast formerly discarded any heading crossing the sideline.
It now clips that forecast at the boundary, checks whether a defender or his
own blocker can stop him before it, and treats a clear exit as a terminal
option. The carrier must physically cross the boundary to end the play.

Near the sideline, an anticipated collision has a bounded utility cost from
relative speed, defender mass share, toughness and ball security. A smaller
carrier can judge the same hit as more costly without a blanket WR penalty.
First-down/goal-line payoffs and the existing hurry preference compete with
that cost. An open field lane still offers more yards than leaving it. This
cost is a qualitative preference, not an NFL-fitted injury probability.

Allowing exit paths exposed another defect: heading hysteresis could keep a
tiny outward velocity until the runner drifted out while intending to stay
in. Boundary recovery now accounts for lateral stopping room. It requests
an inward correction; it cannot override momentum or teleport the runner.

The 4,800-play paired isolated matrix uses WR/RB profiles, two rosters, both
sidelines, distances 0.75/2/4 yards, downs 1/3 and five pursuit geometries.
Out-of-bounds endings rise only **12 → 14**. Tests show deliberate exit
choices after a conversion, exits beyond nearby sticks, goal-line finishes,
and retention of clean field lanes. A chosen escape is often too late to
avoid the actual tackle. This does **not** solve the league's low exit rate
or establish how often real players avoid hits. Future work needs physical
path forecasts and more representative sideline catches and pursuit support.

## Full-game guard and error budget

Same 32-game/seed-7/four-league guard; coaching is active, so these are game
ecology checks, not isolated attribution.

| Metric | NFL band | Before | Coverage only | Final |
|---|---|---:|---:|---:|
| Separation at catch-contest | 2.8–3.2 | 4.23 | 3.91 | 3.94 |
| Tight windows | 13–17% | 3.75% | 4.05% | 4.30% |
| Yards / attempt | 6.8–7.2 | 9.68 | 9.26 | 9.14 |
| Yards / completion (YPA / completion fraction) | — | 14.50 | 13.68 | 13.43 |
| YAC / completion | 4.8–5.6 | 6.57 | 6.11 | 5.88 |
| Completion rate | 63–66% | 66.76% | 67.68% | 68.07% |
| Interception rate | 2–2.5% | 3.60% | 4.48% | 4.79% |
| Sack rate | 6–7.5% | 4.86% | 6.01% | 5.69% |
| Rush yards / carry | 4.1–4.5 | 4.82 | 4.32 | 4.79 |
| Run stuffs | 16–20% | 16.74% | 16.51% | 17.21% |
| Third-down conversion | 37–41% | 40.87% | 36.49% | 35.02% |
| Fumbles lost / team-game | 0.4–0.7 | 0.81 | 0.73 | 0.58 |
| Points / team-game | 21–23.5 | 36.75 | 32.42 | 31.13 |
| Drives / team-game | 10.5 | 13.8 | 13.92 | 13.72 |

The 48-game/seed-7/six-league collection and 20,000-drive-per-variant budget
reduce the total own-25 gap **+0.82 → +0.37** points per drive. Yards per
completion remain the largest component, **+0.72 → +0.53** (coverage-only
+0.46); completion rate is +0.24 and interceptions −0.14. The contact-choice
pass does not improve that budget further. Do not treat its changed game
mix, turnovers or fumble counts as proof of a contact-risk calibration.

In the final 16-game anatomy, field-tackled completions gain 2.09 yards in
0.68 seconds before contact, then 2.11 yards in 1.13 seconds after it (NFL
2.77/0.87 and 2.06/1.24 respectively). The remaining high average YAC cannot
be fixed by shortening every tackle; examine catches that never meet a tackler.

Pressure remains underrepresented: 16.5% of dropbacks have a defender within
two yards before release (NFL reference 30.7%). Pressure-to-outcome p90 is
only 0.60 seconds (NFL 2.50); NFL
pressure often persists while a rusher is still attached to his blocker.
The calibration table's 12.56% uses the QB's perceived-pressure flag, a
different definition. Pocket push remains a separate trench problem.

## What's next

1. **Finish passing anatomy before more global tightening.** Match route,
   coverage, depth and leverage cohorts; split contested catches from the
   wide-open tail and touchdowns with no contact. Cover 2 spot and Cover 0
   remain suspect. Quarters needs #3/trips push/poach rules and explicit
   exchanges when receivers cross bands. Replace direct QB-eye-target access
   with delayed gaze/arm observations, including attention allocation and
   look-offs. Separate gaze, torso and feet more explicitly.
2. **Audit the QB's window estimate.** Interceptions were already high and
   worsen with closer defenders. Compare believed vs actual defender reach
   along the ball flight, with current momentum/hip orientation, and trace
   which threats he never noticed. Don't lower interception probabilities
   to compensate for blind or physically inconsistent throwing decisions.
3. **Then pocket push.** Build matched held-QB labs for power/speed/finesse
   rushes and Over/Under/Tite/Wide-9 protections. Measure engaged rush depth
   at 0.5-second intervals, rear pocket boundary, QB climb, free vs attached
   pressure, and its persistence. Compare all-22 tracking with blocker labels
   and contact proxies; proximity alone does not prove a block. Fix force,
   leverage and escort motion before changing the QB's urgency thresholds.
4. **Sideline and carry forecasts.** Forecast lateral braking/turning through
   the same movement physics, measure intended vs achieved exits, and replay
   NFL sideline catch/first-down/clock contexts. The current straight-heading
   forecast can overestimate a last-second escape. Do not tune a fear slider
   or apply a role stereotype to force the NFL exit percentage.

Validation: **139 TypeScript tests and 9 Python fixtures pass**, along with
typecheck and build. The replay exports 181 entries / 138 filmed plays;
packed frames, indices, timestamps, finite coordinates and embedded JS were
checked. Browser playback interaction was not tested. The manifest records
the final source hash and script hashes; the tackle rewrite and its momentum
tests were preserved.
