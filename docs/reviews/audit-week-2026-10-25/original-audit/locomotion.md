# Locomotion and steering: causal investigation

Source: `/workspace/football-audit`, `c4a03f6463eacb23ce63d01bd32b4f8b547b9bc0`, unchanged production. This investigation uses current `World`, current `chase`, native body snapshots, and isolated diagnostic scripts. It does not tune production, measure an NFL capacity population, or infer player intentions from trajectory.

## Findings that survived intervention

1. **The inspected ordinary sweep is not caused by hidden contacts, a weak yaw motor, or excessive mass inertia.** A one-body continuation of the native G1-P002 SS at 3.8 s, replaying the original final movement requests through 6.0 s, reproduces the full-game position and velocity exactly. Doubling yaw speed or forcing the requested body facing immediately changes the path by less than 0.016 yd. This is unusually strong isolation of a visible symptom.
2. **The body can brake when asked. A high-speed direction-change request is a different action.** Stopping from 9 yd/s takes approximately 1.3 s and 5.86 yd for the generated safety profile. Requesting 9 yd/s at 90 degrees instead produces a broad curve: 1.90 s to turn travel direction through 80 degrees and 9.52 yd of forward excursion. The locomotor law shares its acceleration allowance between braking old velocity and building new velocity. Its behavior is consistent with that request and law.
3. **“Brake earlier” is not a general football repair.** Unchanged-capacity request changes improve some slow-crossing approaches but worsen faster crossing examples. In the native P002 snapshot, stopping is physically possible but leaves the player farther from the recorded runner. A tighter-looking path is not inherently a better pursuit.
4. **The shared reach estimate can claim an arrival that is impossible even under a generous physical bound.** This is an estimator/execution-interface defect, not evidence that World violates physical laws. `timeToReach` is useful in aligned and standing-start controls but can be severely optimistic when transverse momentum must be redirected. `interceptPoint` promotes that approximate estimate to a feasibility predicate without exposing uncertainty or failure.
5. **No current evidence in this slice justifies increasing all braking/cutting, reducing all yaw speed, replacing World, or deploying a broad responsibility framework.** There is a justified shared-interface investigation: what does a proposed interception mean, how is its attainability checked, and what happens when no feasible interception was found? Existing roles, motors, gather techniques and movement previews are substantial useful infrastructure.

## What the actual execution path does

- `src/sim/behaviors/common.ts:93` predicts an observed carrier's future path using delayed motion, a short acceleration extrapolation and a per-play aiming error. It asks `interceptPoint` for a point on that path. The nominal horizon is three seconds.
- `src/physics/reach.ts:41` projects current velocity onto the target bearing, adds `0.5 * transverseSpeed / lateralCapacity` as a redirection delay, and applies the one-dimensional sprint model. An away-going component gets a stopping-time and stopping-distance penalty; a sideways component gets only a time penalty. Facing, support state, the actual steering law and accumulated sideways displacement are absent.
- `src/physics/reach.ts:85` treats `estimatedTime <= targetTime` as an interception. If none is found, line 89 still returns a point/time: the least-bad slack encountered. Its return type does not distinguish feasible interception from fallback.
- `common.ts:234` converts the far interception into a full-speed velocity request toward that point, with reduced effort while farther than 12 yd. Existing `gatheringApproach` at line 156 computes available braking from the current free-movement envelope. `chooseApproach` is already a modest model-predictive controller: it compares a composed original request, moving arrival and matching the runner's velocity through ordinary World previews.
- `src/sim/approach-control.ts:31` deliberately limits this preview to an imminent, free, moving-target approach. It excludes stationary targets, distant approaches, loaded support, active engagements and several other cases; line 78 also retains the original when its preview stays outside the near region. Those gates protect both cost and good distant pursuit. They are not proof that every distant approach is feasible.
- `src/physics/kinematics.ts:153` maps desired velocity into acceleration. Above 0.35 yd/s it resolves velocity error along and across attained travel, and fits those demands inside a braking/drive versus lateral ellipse. It does not choose an optimal path to a football objective; it realizes a velocity request.
- `kinematics.ts:121` determines body-facing demand. Default facing leads actual travel by at most 60 degrees above 2.5 yd/s; explicit facing bypasses that coupling. Body yaw and travel turning are different state variables.
- `src/physics/world.ts:1071` makes one movement plan per controller tick. Production center mode temporarily uses a rate-limited future-facing estimate for the directional speed cap, then restores attained facing. At `world.ts:1620` onward, locomotion, posture, lean, yaw and balance recovery execute under the common ground budgets. Ground translation does not acquire a fictitious “inertia multiplier”; the planned acceleration becomes mass times force.

There is already sophisticated control here. Calling it “just rigid paths” would be inaccurate. The remaining question is whether its approximations, gates and objectives compose well enough.

## Experiment 1: isolated motor panel

Artifact: `out/forensic-locomotion/motor-panel.ts`; results `motor-panel.json` and compact `motor-panel-summary.json`.

The panel generates one S, LB and CB at quality .65 from named fixed seeds, then tests initial speeds 3/6/9 yd/s and constant 0/45/90/135/180-degree or zero-velocity requests. Each body starts fresh, balanced, unengaged, without other bodies. Eight variants isolate baseline, doubled yaw-rate limit, doubled braking profile, doubled lateral profile, halved sprint time constant, fixed original facing, explicit target-facing, and instantaneous requested facing. The last is deliberately nonphysical: a diagnostic upper bound on eliminating yaw delay, not a proposed feature. All runs use the normal .05 s tick and production World.

This is 432 designed cases, not a representative sample of 432 football events. Their repeated conditions are useful discrimination, not statistical independence.

Profile values:

| Profile | vmax yd/s | tau s | brake yd/s² | lateral yd/s² | yaw limit rad/s |
|---|---:|---:|---:|---:|---:|
| S | 9.726 | 1.099 | 6.907 | 7.014 | 9.727 |
| LB | 9.215 | 1.178 | 7.056 | 7.057 | 9.711 |
| CB | 10.012 | 1.202 | 6.993 | 7.152 | 10.018 |

Stopping is measured at first speed below .2 yd/s. Distance is maximum forward excursion over the run.

| Initial speed | S stop time / distance | LB stop time / distance | CB stop time / distance |
|---|---|---|---|
| 3 yd/s | .45 s / .657 yd | .40 s / .640 yd | .45 s / .647 yd |
| 6 yd/s | .85 s / 2.608 yd | .85 s / 2.551 yd | .85 s / 2.575 yd |
| 9 yd/s | 1.30 s / 5.864 yd | 1.25 s / 5.742 yd | 1.30 s / 5.798 yd |

These agree closely with the expected `v²/(2b)` stopping distance and tick sampling. There is no extra unexplained coasting after a stop request in this panel. Whether the capacities themselves match an athlete's hard plant requires task-matched evidence; agreement with the implemented formula is not external validation.

For the safety beginning at `(9,0)` and requesting `(0,9)`:

| Single changed mechanism | Time to travel heading within 10° of target | Forward excursion | Speed / travel heading at 1 s |
|---|---:|---:|---|
| Production baseline | 1.90 s | 9.519 yd | 6.336 yd/s / 43.2° |
| Twice yaw-rate limit | 1.90 s | 9.568 yd | 6.363 / 43.1° |
| Instant requested facing | 1.90 s | 9.577 yd | 6.367 / 43.1° |
| Twice braking profile | 1.80 s | 8.885 yd | 6.333 / 47.6° |
| Twice lateral profile | 1.15 s | 5.836 yd | 7.011 / 73.2° |
| Twice burst | 1.80 s | 9.324 yd | 6.336 / 43.2° |

The doubled profile values still meet ordinary traction limits; “double brake” does not imply twice the achieved ground acceleration. No case falls; the largest work-accounting residual is approximately 2.2e-12 in engine energy units. A good ledger is merely an internal numerical check, not football realism.

The baseline body faces 72.5° at .5 s while its velocity points 17.7°. Explicit facing reaches 89.8° at the same time, while the velocity is still 17.7°. Thus a viewer can show a substantially rotated torso while the travel curve remains nearly unchanged. The same fact means a yaw-only statistic cannot diagnose whether an athlete can cut.

**Supported conclusion:** yaw capacity is not the binding constraint in these free cuts. The lateral acceleration/request allocation is. Doubling a binding capacity helps a difficult maneuver, but does not establish that its original value was wrong.

## Experiment 2: exact ordinary P002 motor isolation

Artifacts: `out/forensic-locomotion/native-replay.ts`, `native-replay.json`, `native-replay-summary.json`. Input is the architecture investigator's exact body snapshot `audit-deep/evidence/architecture/G1-P002-SS-3.8-body.json` and neutral native trace `G1-P002-trace.json`.

At t=3.8, the native SS is standing and unloaded with velocity `(-.9502, 3.3923)` yd/s, speed 3.523 yd/s, position `(58.6671,20.2393)` yd, facing 157.75°, and zero support deviation, contact load and contact history. His final request is `(-7.7964,-.7274)` yd/s. The raw role request equals every later command-stage result in this interval.

Replay the full body, including spin, sprint load and support, by itself. Apply the recorded final requests from 3.8 to 6.0 and compare each step with the original game's post-physics body. Position and velocity match exactly at every step; there are no contacts. This is stronger than a plausible visual narrative: the original free movement law plus the recorded requests is sufficient to recreate the sweep.

Single-mechanism sensitivity, retaining the same recorded request sequence:

| Intervention | Maximum path difference from native | Closest distance to recorded runner in window |
|---|---:|---:|
| None | 0 yd | 2.366 yd |
| Double yaw-rate limit | .0129 yd | 2.360 yd |
| Instant requested facing | .0155 yd | 2.359 yd |
| Double mass | .00057 yd | 2.365 yd |
| Double braking profile | .415 yd | 1.994 yd |
| Double lateral profile | 3.603 yd | 1.240 yd |
| Stop at 3.8 | 5.832 yd | 7.444 yd |
| Hold the first request | 10.024 yd | 4.492 yd |

These are **open-loop motor interventions**, not counterfactual full plays. Other players and the carrier follow their recorded paths; the modified player's controller does not reconsider based on his changed position. Closest approach is a geometric diagnostic, not a claimed tackle or yardage improvement. Double mass also changes support geometry slightly, explaining its tiny nonzero difference.

The stop request arrests the player by t=4.30, with only .913 yd of travel. His apparently slippery motion is therefore not a failure to execute an actual stopping request. But stopping does not solve the pursuit. Similarly, holding the original direction is much worse after the runner's path evolves.

The normal request itself changes markedly: approximately −175° at 3.8, −147° at 4.0, and −68° at 4.4, while attained travel is approximately 111°, 132° and −179° after those ticks. His speed falls to 1.89 yd/s around 4.45, then rises again. A changing pursuit aim and the time to change velocity are composing here. This investigation isolates the motor; it does **not**, by itself, identify the first incorrect prediction or prove a better legal pursuit existed.

The film investigator's independent closed-loop P002 intervention agrees: double yaw after the catch changes final gain only 32.30 to 32.09 yd and minimum early approach only 2.366 to 2.361 yd. Brief stop-on-opposed-velocity worsens the gain to 35.18 yd; shortening the pursuit horizon to .8 s produces a touchdown. It also exposes a forecast discontinuity: between 4.25 and 4.30, estimated interception time jumps 1.8 to 2.8 s and aim jumps `(56.16,14.42)` to `(62.65,9.31)` despite only .368 yd of observed runner displacement. By 4.35 there is no feasible interception; the helper returns the 3.0 s fallback. These observations strengthen the prediction/control-interface investigation, but a discontinuous earliest feasible interception can sometimes be mathematically legitimate. They are not proof that smoothing its point improves football.

**Failed hypotheses:** the sweep is not explained by collision, downstream command modification, huge mass inertia, or too-slow body yaw in this window. **Still open:** whether the existing lateral capacity is externally accurate; whether forecasting, inherited pursuit position, request allocation or an unavoidable bad angle dominates this particular missed opportunity.

## Experiment 3: identical football objective, unchanged capacities

Artifacts: `steering-panel.ts/json`, `pursuit-panel.ts/json` and their compact summaries.

The static panel asks the body to arrive within .5 yd of the same fixed point, and separately to do so below 1 yd/s. It compares native `arriveVelocity`, a modest gather (scale desired speed to .35 only when current speed exceeds 2.5 yd/s and desired/travel angle exceeds 60°), an explicit stop-first policy under the same gate, and a simple .6 s three-candidate preview. The latter is only a diagnostic policy and was not promoted or optimized against the panel.

At initial `(9,0)`, target `(3,6)`:

- Native arrive reaches .5 yd at 3.05 s; below 1 yd/s at 3.35 s; trajectory length over six seconds is 16.2 yd.
- Modest gather reaches .5 yd at 2.70 s; controlled arrival at 2.90 s; length 12.3 yd.
- Stop-first reaches at 2.90 / 3.10 s.
- The short preview reaches at 3.25 / 3.25 s. More simulation alone did not select the better action.

Aligned target `(12,0)` is a control: native, modest gather and stop-first all capture at 1.70 s and settle at 1.90 s. The added preview delays first capture to 1.85 s while settling at 1.85. A scorer must distinguish touching an opportunity from arriving under control.

The pursuit panel then runs **current native `chase`**, including its existing gather and approach preview, against a constant-velocity target with perfect supplied observations and zero aiming error. Profile, body, target path, football contact radius and all motor capacities are fixed across policies. There are no other bodies, contact responses or tackle success rolls. Three initial speeds, nine geometries, mirrored sides and three policies give 162 designed cases. Runs end after 3.25 s so every prescribed target stays on the field; missing capture is right-censored.

Representative 9 yd/s results:

| Runner relative start / velocity | Native first envelope entry | Modest gather | Stop-first |
|---|---:|---:|---:|
| `(3,3) / (0,0)` | 2.65 s | 2.50 s | 2.55 s |
| `(3,3) / (0,3)` | 3.15 s | 2.95 s | None by 3.25 s |
| `(6,6) / (0,-6)` | .90 s | .90 s | .90 s |
| `(3,6) / (6,0)` | 1.45 s | 1.45 s | 1.45 s |
| `(6,0) / (6,0)` | 1.50 s | 1.50 s | 1.50 s |
| `(12,0) / (-6,0)` | .95 s | .95 s | .95 s |

The far fast crossing case `(6,6)/(0,6)` does not enter the envelope under any policy. Its minimum distance is 6.90 yd native, 8.34 yd modest gather, 8.36 yd stop-first. Slowing to turn more tightly damages the actual pursuit objective. At initial speed 6, the slow-crossing runner is captured at 1.95 s native, 2.00 s modest gather and 2.55 s stop-first. A rule that helps the high-speed version hurts the otherwise identical lower-speed version.

**Supported conclusion:** request allocation can improve specific errors without changing the body, but there is no demonstrated universal gather patch. Matching a desired curve is the wrong acceptance criterion; retain the ability to take a real interception, preserve leverage where applicable, and admit when capture is unavailable. The artificial panel has no force or cutback responsibility; it cannot validate abandonment of those responsibilities in real football.

## Experiment 4: a reach estimate that violates a necessary bound

Artifact: `reach-bound.ts/json`, `reach-summary.json`.

Let `p0` and `v0` be initial position and velocity, `q` a stationary target, `r` its capture radius, and `A` a bound on the body's translational acceleration. Every admissible trajectory must satisfy

`|q - (p0 + v0*T)| <= r + A*T²/2`.

This follows by integrating acceleration: the displacement contributed by an acceleration bounded by A lies within a disk of radius A*T²/2 around the inertial position. It is a necessary condition only. It grants arbitrary immediate acceleration direction and ignores maximum speed, directional gait caps, yaw costs and smooth technique changes, so it is deliberately generous.

Use the entire unladen cleat traction as the bound: `A = supportParams(profile).traction / mass = 1.1*g = 11.797151137 yd/s²`. This is greater than the normal safety's maximum gait envelope, 8.8502 yd/s², and remains generous if cutSkill increases. It covers ordinary ground locomotion under the shared traction budget; it excludes externally accelerated contacts, extra normal loads, dives/falling forces and injected impulses. The fixtures have none of those mechanisms.

For `v0=(9,0)`, `q=(3,3)`, `r=.5`, `timeToReach` predicts `.983874413 s`. At that time, the left side exceeds the right side by `.368842219 yd`. Even the all-direction full-traction athlete cannot be within the requested radius. The first time the loose necessary condition permits arrival is approximately 1.076 s. The actual gait/control requirements can make arrival substantially later; this bound is not an optimal solution.

For `q=(0,3)`, `r=1.2`, the prediction is `1.347505221 s`; bound violation is `.582635478 yd`; the loose necessary time is approximately 1.425 s. This avoids making the entire concern depend on an unusually tiny capture radius.

The panel has 48 designed conditions and six violations, including rotated counterparts. It also has useful controls:

| Initial velocity / target / radius | Prediction | Current full-speed seek first capture |
|---|---:|---:|
| `(9,0) / (12,0) / .5` | 1.238 s | 1.25 s |
| `(0,0) / (3,3) / .5` | 1.068 s | 1.10 s |
| `(0,0) / (12,0) / .5` | 2.122 s | 2.15 s |
| `(6,0) / (12,0) / .5` | 1.495 s | 1.50 s |
| `(9,0) / (3,3) / .5` | .984 s | 4.95 s |

The last huge gap is **not** a claim that 4.95 s is the minimum achievable time. The tiny-radius full-speed seek overshoots and returns; native stopping arrival reaches in 2.85 s and modest gather in 2.60. The algebra, independently of those policies, proves the prediction's infeasibility. The trajectory comparisons explain why a cheap reach estimate and a particular steering controller must not be treated as interchangeable.

`timeToReach` explicitly says it is an estimate, which is reasonable. The architectural weakness is downstream: feasibility, fallback, uncertainty, and execution are collapsed into a point/time pair. Correcting that boundary is more defensible than rewriting every role or promising an exact global optimal-control solver.

**Adversarial transfer result:** the film investigator applied the same full-traction necessary bound to the selected native pursuit points in P002 and P117 and found zero falsely feasible points. This materially limits the inference: the synthetic estimate defect is reproduced, but it is **not established as the cause of those ordinary sweeps**. A point can satisfy the loose bound and still be unachievable by the actual gait/controller; conversely the runner can change his path after a reasonable forecast. Do not collapse these distinct explanations.

## Implications for the earlier roadmap

**Keep A04/A10, but give them this concrete task.** A04 needs separate observation, forecast point/time, desired velocity, attained velocity, requested facing, attained facing and actual contact/support state. A10's first useful fixtures can be these neutral native snippets plus mirror/aligned/standing-start controls. More general framework work is not a prerequisite.

**Add a narrow motion-feasibility item inside the existing pursuit/run-fit investigation, ahead of broad A08/A09 expansion.** Start with the `timeToReach`/`interceptPoint` contract and a family of transverse approaches. Return whether a candidate was actually judged feasible versus merely least-bad; distinguish an optimistic reach estimate from an executed-control forecast. Cheap necessary bounds can reject impossible promises, but must not themselves be sold as sufficient feasibility. Where a closer check matters, use the existing World preview with a bounded number of candidates and preserve its scope limitations.

**Do not automatically widen preview horizons or add more rollouts.** The .6 s diagnostic preview already loses to a simpler gather on some static targets, and root instrumentation finds substantial existing preview work. Objectives, terminal conditions and gating matter. First measure what error the new forecast corrects, how frequently it activates, and how much extra cost it adds. A longer forecast of a constant-velocity runner can be more confidently wrong.

**A06 yaw repair and pursuit geometry should remain separate unless a native intervention connects them.** They share movement interfaces, but no evidence from this sweep says yaw-rate capacity is its cause. Fixing excessive explicit facing toggles may make bodies look more sensible without resolving the velocity path.

**Do not promote A08's responsibility envelope on the strength of these findings.** A better hierarchy can decide whether to pursue, keep force or help. It cannot make a false interception estimate feasible or select an appropriate acceleration allocation by naming the responsibility. Preserve role-specific controllers while repairing and measuring their common movement contract; then evaluate whether a shared decision envelope adds generalization beyond those repairs.

**Keep physical calibration open, not assumed solved or broken.** `physical.ts:107` fits in-game burst to observed per-play peak acceleration; `physical.ts:138` scales plant/cut formulas by .55. Ordinary movement statistics conflate capacity, selected effort, task, contact and coaching. A population max-deceleration statistic is neither a hard-plant capacity experiment nor a pursuit-path validation. The validation investigator owns the external measurement caveats. This investigation finds no basis for a global capacity change now.

Suggested small sequence: (1) native request/forecast witness and estimator-contract correction, 2–4 focused days; (2) a bounded approach policy comparison with aligned/head-on/escaping/force/loaded controls, 3–7 days; (3) task-matched capacity evidence only if a legal objective remains unattainable under all reasonable unchanged-capacity controls. Stop after two plausible local policies fail on opposing controls; do not widen their gates merely to repair the original clip. These are work estimates, not guaranteed delivery dates.

## What remains unknown

- Whether ordinary bad interception choices materially arise from the specific reach-estimator optimism shown here. Native P002/P117 chosen points pass the loose full-traction bound. Their forecast/fallback transitions need a stronger executable candidate comparison before attributing them to the synthetic optimism.
- How much of the residual sweep comes from uncertainty about a runner who can cut, versus an inferior control choice under the same acquired information. Compare policies on the same observation stream, then on fresh full plays with ordinary opponent reactions.
- Whether current braking and lateral profiles represent true hard-plant capabilities across player types. Need speed-conditioned, contact-excluded, task-defined acceleration and direction-change evidence plus selection/measurement uncertainty; neither torso yaw nor aggregate deceleration settles it.
- Whether the present half-second approach policy is the best cost/benefit compromise. Existing forecasts are physics-consistent within their unloaded held-command scope, but a consistent forecast can optimize the wrong objective or have insufficient horizon.
- Whether a unified motion controller is warranted. The next discriminating result would be a small shared attainability/arrival interface that fixes at least two role families while preserving real opposing examples, at measured acceptable cost. A successful local role-specific repair would weaken the case for consolidation.

## Reproduction

From `/workspace/football-audit`, with Node 22 on PATH:

```sh
node --import tsx out/forensic-locomotion/motor-panel.ts
node --import tsx out/forensic-locomotion/steering-panel.ts
node --import tsx out/forensic-locomotion/pursuit-panel.ts
node --import tsx out/forensic-locomotion/reach-bound.ts
node --import tsx out/forensic-locomotion/native-replay.ts
```

`native-replay.ts` requires the two architecture evidence inputs listed above. Scripts print compact case results and save complete local traces. All coordinates are yards, time seconds, velocity yd/s, linear acceleration yd/s², facing radians internally (degrees in the motor summary). No broad scorecard or game outcome calibration was run for this slice.
