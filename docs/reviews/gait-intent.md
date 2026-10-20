# Acceleration intent, bearing control and bounded arrival

This is the first milestone at `6af3a71`. See the
[pull-turn continuation](pull-landmark-snapshot.md) for the later, independently
portable acquired-landmark correction and retained native adverse evidence.

Research on `codex/gait-intent`, 2026-10-20. **Keep `GAIT_STEP=0` and the
existing physical capabilities. Separate an explosive acceleration request
from the speed the player intends to reach.** The bounded implementation
works in the mechanical/trajectory tasks below. The experimental puller
caller remains held: earlier arrival exposes inconsistent turn geometry.
No production activation or integration package is proposed here.

## What caused the sluggishness and wobble

An ordinary moderate-speed request uses roughly `(wantedSpeed-speed)/tau`.
That couples two decisions: how fast to travel and how urgently to accelerate.
A player requesting 2.65 yd/s cannot use his existing sprint propulsion to
reach that speed quickly. A global `GAIT_STEP=.5` changes all such requests,
including deliberate controlled movement. It also changes the response
assumed by existing inverse planners such as `requestToCover(tau,...)`.

There is a separate, demonstrated steering error. After reducing forward
acceleration, `locomotionAccel` restores transverse demand toward the *full*
desired transverse velocity. Its smaller achieved forward velocity then
points past the desired bearing. In a held 0.57294-degree request from
1 yd/s, the old next bearing is 1.42743 degrees. Scaling the transverse
response consistently with achievable parallel speed produces 0.57294
degrees, with the same forward acceleration and less transverse force.

The correction is commit `fd393b9`. It applies only when positive forward
easing actually reduced the selected drive. Collinear acceleration, braking
and deliberate reversals are unaffected. Cutting capacities and the friction
ellipse remain unchanged; accelerating cuts in this branch intentionally
receive a corrected transverse request.
It is independently reviewable from explicit propulsion and arrival planning.

## What changed

The optional `MoveCommand.propulsion='full'` actuator from #163 is preserved
as commit `763265d`; its held production caller was **not** imported. It uses
the existing drive/brake/cutting ellipse, speed/facing/fatigue restrictions,
ground budget and exactly-once effort accounting. It accelerates toward a
bounded target rather than buying a higher acceleration or speed capacity.
No native installation enables it by default.

Commit `fd8f76f` adds an arrival planner for that request. It budgets current
tick travel and future braking. World holds a command for an entire tick;
a final stop from `v < b*dt` consumes `v*dt/2`, which can exceed continuous
`v²/(2b)`. A continuous-only first attempt overran a zero-radius 3-yard stop
line by 0.001396 yd at 50 ms. That failure is retained in the receipt.

The corrected planner reserves `S(v)=v²/(2b)+v*H/2`, a conservative stop
distance when command intervals are no longer than the known ceiling `H`.
It selects the next requested speed against
`(v+vNext)*dt/2 + S(vNext)-S(terminal) <= remainingDistance`.
This needs one closed-form scalar root, no trial World solves. It estimates
usable braking conservatively from current fatigue, support, traction and
the existing envelope, retaining the historical 0.8 braking margin.

The planner reports a radial feasibility condition. It does not certify a
clear 2D route, a future support state, or an impossible late stop. Nonzero
through-speed is an endpoint planning target, not a guarantee at a sub-tick
crossing. Tests preserve crossing-motion and impossible-stop controls.
Unequal-tick stop-line tests supply their known maximum command interval;
the current interval alone cannot promise safety against an arbitrary later
longer hold.

The caller can declare its actual capture/handover radius. Experimental
puller activation now uses 0.65 yd, matching its existing waypoint advance
test and `cornerSpeed` radius, instead of braking toward the ordinary 0.15-yd
point-arrival boundary. Ordinary callers retain 0.15 and their historical
easing. The research-only `RunBlockPlan.pullPropulsion` field is never set
by a production assignment.

Commit `4021579` separately supplies a legal-window acceleration operator.
The audited historical operator can admit a gain whose later speed estimate
reads beyond the whistle. Changing only post-whistle positions changes an
admitted analytic sample from approximately zero to 15.83/31.67 yd/s².
The new operator excludes every incomplete, missing or post-whistle support
window and retains zero/negative gains. Historical reports remain intact;
their source/measurement limitations are documented rather than overwritten.

## Evidence for the direction

Three unchanged seeded OG/LB/CB profiles request 2.65 yd/s from rest:

| Profile | Ordinary speed at 0.5 s | Global .5 | Explicit burst |
| --- | ---: | ---: | ---: |
| OG | 0.929 | 1.726 | 2.425 |
| LB | 1.016 | 1.726 | 2.650 |
| CB | 0.992 | 1.726 | 2.650 |

Explicit burst never exceeds the requested speed. The opposing cruise
commands remain byte-identical to ordinary movement; global .5 changes
them. Straight stop/through-speed tests execute through World, including
mirrors, fatigue/support limits, impossible late stops, zero/tiny motion
and unequal intervals. Existing top-speed drive, braking and reversals
retain their mechanical controls. A larger legacy inverse-planned speed
must not also receive full propulsion: its compensation assumes the old
lag and can overrun the intended distance.

### NFL geometry tasks

The existing verified BDB2025 cache supplied a bounded packet: first eight
qualifying designed runs in source order from game 2022091200. First four
plays supplied illustrative movement shapes; later plays supplied three
controls selected without shape/outcome screening. Nine saved trajectories,
each 2 s at 10 Hz, are frozen in
[`gait-intent-nfl.json`](../../test/fixtures/gait-intent-nfl.json).
The scan read 73,279 rows / 10,043,392 bytes in 3.143 s; no archive download
or new game campaign was needed. The strict low-speed/free-proxy LB selector
found no example and remains explicitly missing.

The experiment supplies those trajectories to proxy athletes, using the
existing track-style position gain 2.2 and provider velocity feedforward.
Profiles are identical across arms. Recorded weight is used, with generated
remaining capabilities and initial facing from velocity. Future trajectory
is laboratory input, never information granted to a football agent.

| Arm | Median position RMSE, yd | Steps turning past requested bearing |
| --- | ---: | ---: |
| Accepted ordinary, GAIT_STEP=0 | 0.4443 | 191 / 241 eligible |
| Accepted ordinary, GAIT_STEP=.5 | 0.2341 | 177 / 261 |
| Bearing correction, ordinary | 0.5911 | 0 / 229 |
| Bearing correction, explicit propulsion | 0.0673 | 0 / 296 |

All nine supplied paths have lower position error with explicit propulsion.
The three later-play controls have median error 0.2530 / 0.1549 / 0.3257 /
0.0402 yd in table order. Bearing-only correction exposes more longitudinal
lag: unintended transverse motion had partly masked it. This is evidence
for fixing bearing and acceleration intent separately.

On complete legal 10-Hz/0.01-yd position windows, mean per-fixture speed error
falls 0.6210→0.0753 yd/s and scalar speed-gain error 1.0674→0.1638 yd/s².
Each fixture supplies 17 speed and 14 gain samples. All profiles stay fixed;
the explicit-propulsion candidate's maximum traction-impulse fraction is
0.5641 and maximum work residual 7.15e-13. `full-old` and `intent` use identical NFL tracking commands, so
these clips support explicit propulsion, **not** the new braking planner.

These are geometry-feasibility tasks, not NFL capability calibration.
Actual contact, assignments and effort are unknown. Provider velocity is
not exactly the derivative of interpolated positions. One game's selected
paths are not representative, and proximity is not contact. The common
10-Hz heading-reversal totals are NFL 6, ordinary 7, bearing 8, full 5;
0.1-yd rounding changes them to 27/30/34/29. This small packet does **not**
establish a game-wide jitter reduction. Command-versus-achievement evidence
is the decisive steering diagnosis.

Claude's Part12 fit is an achieved positive speed-gain quantile comparison,
not a maximum-acceleration envelope or visual reaction test. The published
table has ordinary MAE .42, gait-only .54, full package .53. Low-speed LB/DB
overshoot argues against global activation, but the saved runtime manifests
also differ in source, so this report does not certify strict flag-only
causation for that historical comparison. Source reviewed:
[`bae3fe80` report](https://github.com/tannerthardy/football-simulation-/blob/bae3fe80d189a7d792aaafbc4eea1ae2baa79573/docs/reviews/run-game-v3.md),
[`gaitfit.py`](https://github.com/tannerthardy/football-simulation-/blob/bae3fe80d189a7d792aaafbc4eea1ae2baa79573/scripts/diag/stretch/gaitfit.py).

## Native transfer and the retained adverse result

Four inputs were fixed before the comparison: counter/ace12 seeds31/32/1;
power/i-pro21 seeds11/12/77; fresh trap/i-pro21 seeds31/32/71009; and a
no-puller outside-zone control seeds11/12/77. Each is observed until ending
or 4 s. All arms hold `PULL_STEP=1`, `RUN_CONTACT_COMPONENTS=1`; other flags
use the recorded baseline, with GAIT_STEP changed only in its explicit arm.
This is a controlled pull-step host, not accepted-default game evaluation.

Compared with bearing-only ordinary motion, full intent reaches 1.5 yd/s
lateral speed earlier: counter LT/LG .90/.95→.50/.50 s; power .90→.50 s;
trap .85→.60 s. No extra force/traction or guaranteed block win is supplied.
Outside zone, with no puller, is byte-identical to the bearing-only candidate.

| Input | Accepted ordinary | Global .5 | Boundary-aligned intent |
| --- | --- | --- | --- |
| Counter | Live at 4 s, x=LOS+2.96 | Live, +3.54 | Tackle, 6.79 yd |
| Power | Tackle, 1.78 yd | Tackle, 0.46 yd | Live at 4 s, +4.01 |
| Fresh trap | Tackle, 2.08 yd | Tackle, 3.03 yd | Tackle, 0.06 yd |
| Outside zone | Tackle, 5.10 yd | Tackle, 1.91 yd | Live at 4 s, +4.15 |

Live coordinates are censored observations, never final gains. A favorable
or adverse ending does not adjudicate movement correctness. Bearing-only
itself changes all four paths and remains visible in the machine receipt.

One targeted saved trap diagnostic explains why the caller stays held.
Before the capture-interface correction, faster startup advanced the first
two waypoints at .60/1.20 s instead of .80/1.50. The guard arrived with
sideways momentum. Over 1.20–1.75 s its COM acceleration matches the existing
unloaded envelope to 5.4e-15 yd/s², support stays up, and no torso collision
explains the turn. The body executes a physically limited request.

The geometry being planned also changes: the current landmark moves while
the outgoing landmark is still stale. Computed corner speed rises from
2.60 to 4.63 to 7.25 yd/s; on handover the outgoing landmark moves again,
eventually reversing the requested lateral direction. Matching the capture
radius is justified, but does not make these requests a coherent 2D path.
The pre-correction adverse ending of −0.16 yd and ordinary control live at
4 s remain recorded. Boundary alignment changes the trap ending to +0.06,
still adverse to the accepted ordinary case; no third tuning pass followed.

The runner's first difference in that diagnostic is a changed command at
1.50 s, before runner contact, with identical preceding runner/mesh state.
Its final request falls from 6.247 to 1.740 yd/s on the existing QB spacing
plane. Reconstructing the pre-spacing press request suggests a changed ray
intersects the QB corridor; the ordinary ray misses. Exact original entry
selection was not captured, so this is **not** proof that spacing is wrong
or that the corner explains the entire later ending. It is enough to reject
the claim that the runner first slows because physics cannot execute the
same feasible request. Keep controller choice and physical response separate.

## Cost, verification and next decision

Final runtime source is `4379f0ebe71edcd7fab1e98c727fd6cd005ea5722ee47389777df07088806fb7`.
**80 focused TS tests pass** in 4.72 s; typecheck passes; **11 measurement
tests pass** in 0.020 s. No full suite or new games. The unchanged accepted
reference is `2c98bed94adad8087c65f381d4090444ad283985`; handoff refetch also
confirmed queue `4cc3337d` and Claude `bae3fe80` unchanged.
Cross-review by non-authors found no research correctness blocker in the
bearing hunk, held-step planner/interface, legal-window implementation or
NFL/provenance claims. This is research review, not activation approval.

An alternating 11-batch warmed microbenchmark measures ordinary/new planner
queries at median 0.123/0.394 microseconds, p90 batch mean 0.162/0.427,
worst batch mean 0.294/0.709. Isolated World+controller ticks measure medians
6.53/7.20 microseconds, p90 17.64/22.48, worst batch means 21.94/35.20.
This is uninstrumented cost on the same CPU, not native loaded-game cost or
a rare-tail guarantee. That receipt uses the pre-interface source `5495bd70`;
the query implementation and default radius are unchanged. It is compatible
query evidence, not a cost claim for the new puller boundary. Native trace
collector costs are recorded separately and were not used as benchmarks.
The method adds no World solves; further numerical-solver work is unwarranted.

Keep existing facing/ground-law and loaded-support research holds separate.
The radial planner cannot clear the known prospective-facing limitation.
Nonzero GAIT_STEP plus explicit full intent is not an accepted combined
contract (near-standstill GAIT settling still takes precedence). None of this
promotes earlier contact/recovery patches or erases their failures.

**Best next step:** Run owns making the acquired outgoing landmark and actual
handover agree throughout one puller's turn, then reuses these exact controls
to decide whether to use burst intent there. Physics should retain the
capacities and separately review the bearing fix. Another global settling
constant or more acceleration will not repair that request contract.

The compact [receipt](../../data/reviews/current/gait-intent.json) records
exact settings, inputs, hashes, successes, failures and scope. Reproduce with
Node22.23.3 and `baseline.mjs --candidate --flag RUN_CONTACT_COMPONENTS=1`:

```sh
node scripts/baseline.mjs --candidate --flag RUN_CONTACT_COMPONENTS=1 -- node --import tsx scripts/diag/gait-intent-lab.ts out/gait-response/lab-intent.json --mode intent --nfl test/fixtures/gait-intent-nfl.json
node scripts/baseline.mjs --candidate --flag RUN_CONTACT_COMPONENTS=1 --flag PULL_STEP=1 -- node --import tsx scripts/diag/gait-intent-lab.ts out/gait-response/native-intent.json --mode intent --native
node scripts/baseline.mjs --candidate --flag RUN_CONTACT_COMPONENTS=1 --flag PULL_STEP=1 -- node --import tsx scripts/diag/gait-intent-lab.ts out/gait-response/trap-detail-intent.json --mode intent --native --case trap --detail
python3 scripts/diag/gait-intent-compare.py
node scripts/baseline.mjs --candidate --flag RUN_CONTACT_COMPONENTS=1 -- node --import tsx scripts/diag/gait-intent-cost.ts out/gait-response/cost.json
```

For accepted/global comparisons extract accepted `src`, `config` and the
launcher with `git archive 2c98bed9`, supply `--engine /absolute/host`, and use
absolute collector/output/fixture arguments because its launcher changes cwd.
The global arm adds `--flag GAIT_STEP=.5`. The comparison script expects all
five recorded lab arms; native full-old is intentionally unsupported.
