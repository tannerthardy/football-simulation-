# Coverage help evidence and the next bounded experiment

This is a read-only priority audit, not an implemented coverage change. The [active-grip travel correction](active-grip-force-travel-and-current-priorities.md) now passes its local and football guards. This audit identifies the next bounded coverage experiment. Do not remove the six-yard upper cap bound by itself.

## What the recorded field evidence establishes

The ordinary panel is 24 fixed 11v11 passes across two generated rosters, Cover4, Cover3Match and Cover1, four concepts/formations, and seed3. The collector copies existing consumed observations and judgment calls; no extra reads or draws. All observer/recording controls are exact. Source and tool pins, all natural endpoints and live censors are retained in `data/reviews/physics-world/visible-help/`.

The early-primary safeguard already fixes the specific premature switch. It does **not** solve the roof-estimation problem. A roof is currently any upright observed teammate satisfying:

- Depth greater than `0.4 - error`, less than six yards.
- Projected lateral separation at 0.2 seconds less than `2.3 + error`.
- Observed longitudinal velocity greater than -1yd/s.

These tests can reject useful deep help while accepting a shallow player whose remaining cushion is being consumed. Neither proximity nor upright posture proves that a teammate will protect the route. A roof also does not imply that someone covers every underneath throw.

### Natural useful-deep-help witness

In the **before/pose-only** phases, `HELP-R2-gun_trips_11-smash-cover4-S3`, CB_S at 1.60s abandons primary Z for H. His own confirmed vertical is still only 4.554yd deep. The observed SS is 8.245yd deeper than H, with 0.697yd projected lateral separation, upright, vx1.887/vy0.406; H has vx6.386/vy0. The SS fails the roof test solely because the depth exceeds six yards. His hidden job/target are quarter_s_in/H, but those are diagnostic evidence, not legal controller inputs.

Under unchanged observed velocities, H reaches the SS's longitudinal line in about 1.833s; their lateral separation then is about 1.36yd. This is a coherent visible candidate for deep help, not proof of an actual interception, contact or correct assignment. The final early-primary safeguard retains Z at 1.60s; it later allows a legitimate rob-Z transition at 2.25s. That safeguard remains important regardless of the future cap estimator.

### Natural counterexample to deleting the maximum

In the **primary-stem** phase, `HELP-R1-gun_bunch_11-mesh-cover4-S3`, CB_S at 0.80s considers help on Z. The observed SS is 12.073yd deeper, upright, with 0.964yd projected lateral separation at 0.2s. That passes every current criterion except the six-yard maximum.

But the SS's observed vx/vy are 0.365/1.677, while Z has vx3.413/vy0. The safety is moving laterally away from the corridor. Continuing those consumed velocities gives a longitudinal encounter after about 3.961s and lateral separation about 7.271yd. His hidden target is Y, not Z; the proposed controller must reach its conclusion from the visible motion, not that target ID. The similar R2 picture is also present.

That long constant-velocity extrapolation is a counterexample to interpreting the initial alignment as guaranteed help. It is not a four-second forecast we should trust in live football. Either player can change direction before then.

## All currently consumed far candidates

The following are **all 15 consumed queries** in the archived primary-stem phase that were rejected, have depth>=6, and pass the other current geometry/velocity/pose tests. They are 14 unique `(play,t,observer,receiver,helper)` tuples: one real decision queries the same route twice. No independent field-error frequency is implied. The natural pre-guard Smash witness above is separate: the final safeguard returns after querying its own Z and does not consume the H query at that time.

All rows use play seed3. Doubles=`gun_doubles_11`, Bunch=`gun_bunch_11`, Trips=`gun_trips_11`. `Q` is the zero-based query index within the retained fresh decision. Lateral separation includes the existing 0.2s projection and stable judgment error remains part of eligibility.

| Roster / formation / concept / coverage | t | Observer | Q | Receiver | Helper | Depth yd | Lateral yd |
| --- | ---: | --- | ---: | --- | --- | ---: | ---: |
| R1 Doubles four_verts cover4 | 2.00 | SS | 2 | H | FS | 6.424 | 0.926 |
| R1 Doubles four_verts cover4 | 2.05 | SS | 2 | H | FS | 6.121 | 0.916 |
| R1 Doubles four_verts cover4 | 2.05 | SS | 5 | H | FS | 6.121 | 0.916 |
| R1 Doubles dagger cover4 | 2.00 | SS | 2 | H | FS | 7.171 | 0.926 |
| R1 Bunch mesh cover4 | 0.80 | CB_S | 0 | Z | SS | 12.073 | 0.964 |
| R1 Bunch mesh cover4 | 1.00 | CB_S | 0 | Z | SS | 11.243 | 1.544 |
| R1 Bunch mesh cover4 | 1.20 | CB_S | 0 | Z | SS | 10.310 | 2.222 |
| R1 Bunch mesh cover4 | 1.40 | CB_S | 0 | Z | SS | 9.133 | 2.467 |
| R1 Bunch mesh cover4 | 1.60 | CB_S | 0 | Z | SS | 7.786 | 2.436 |
| R1 Bunch mesh cover4 | 1.80 | CB_S | 0 | Z | SS | 6.384 | 2.236 |
| R2 Doubles four_verts cover4 | 1.85 | SS | 2 | H | FS | 6.926 | 0.917 |
| R2 Bunch mesh cover4 | 0.80 | CB_S | 0 | Z | SS | 12.005 | 0.851 |
| R2 Bunch mesh cover4 | 1.00 | CB_S | 0 | Z | SS | 11.128 | 1.450 |
| R2 Bunch mesh cover4 | 1.20 | CB_S | 0 | Z | SS | 10.149 | 2.158 |
| R2 Trips smash cover3_match | 2.65 | CB_S | 0 | H | FS | 6.582 | 2.056 |

The phase source is `5b6c2f84e77672496996cb7caeb58341e09b7f53f6455919329b8823ea334f84`; collector SHA is `fa04d9ac372ab0c351566f5b998ce7ba810bba09104b0e5436bda6b79b62231e`. These observations precede the subsequent local physics correction. Reproduce the eligibility list from the archived `panel-primary-stem.json.gz`, not an altered live engine.

## Cheapest falsifiable next prototype

Start with a **short projected roof margin**, plus a conservative extension for currently excluded deeper help. This is a controller estimate from the picture, not a physics or assignment oracle. It needs only the already consumed position, velocity, pose, age and existing stable judgment error.

Let `g(t)` be signed longitudinal help depth and `l(t)` signed lateral separation under those consumed velocities. Let `h` cover the observer's next ordinary decision interval plus the sampled image age. Reuse the current spacing/error scale rather than adding another strength or awareness multiplier.

1. Require the visible helper to remain ahead at `h`. This rejects a shallow wall whose cushion disappears before the observer can reconsider. Compare `g(h)` to the same imperfect margin, rather than awarding a roof from `g(0)` alone.
2. Evaluate whether visible lateral movement retains or enters the corridor at `h`, instead of only the fixed 0.2s sample. Do not read the helper's hidden target, behavior, planned intent, support capacity or future route.
3. Preserve the existing near-help branch initially. For help beyond six yards, consider a conservative extension only when the consumed motions predict a positive longitudinal encounter within a bounded evidence window and acceptable lateral separation at that encounter. A starting two-second window is an **unvalidated planning assumption**, chosen for a small falsification study, not a fitted NFL constant or elapsed-play timer. The actual cue is spacing and closing/departure motion.
4. Do not automatically extend distant co-moving or separating help: its future intervention is unestablished by the current image. Retain that uncertainty rather than inventing braking, acceleration or a future assignment. A close co-moving helper remains a valid control in the near branch.

This is a few scalar calculations, not a World rollout, a reachability map or a new simulator. The conservative extension admits the Smash picture and rejects the early Bunch picture as evidence too remote/departing. It can still be wrong when players change motion. These limitations should remain visible in diagnostics. If the staged controls show that the extension needs exceptions or several new thresholds, stop: expose richer roof evidence for the caller rather than expanding a universal yes/no promise.

## Staged controls before a field trial

Use actual delayed perception and ordinary CoverageJudgment cadence; keep all player profiles and physical capacities unchanged. Pure predicate tests establish what was believed. Short executed World/controller windows establish what happened; those are separate assertions.

| Control | Expected evidence / falsifier |
| --- | --- |
| Upright moving roof, near and 8.25yd deep | A helper remaining in the receiver's corridor with sustained depth can support the appropriate near or conservative far branch. Mirror both sides. If the helper walks away during the window, the estimate must be reconsidered on the next read. |
| Visible lateral departure | Reproduce the consumed Bunch geometry, then vary only the helper's observed lateral velocity. A departing helper should not become reliable help solely by deleting the maximum. A helper moving into the corridor supplies the opposing control. |
| Short wall / handoff | Reproduce R1 Doubles/Dagger at1.85s: observed wall:Y helper depth0.169yd, receiver vx6.216, helper vx4.535, lateral0.340yd; straight-line level time0.101s. It should not promise a persistent roof after the next read. A nearby co-moving upright helper must remain a valid opposing control. A separate deep safety can supply the eventual handoff; do not erase real underneath disruption. |
| Grounded, stale upright and recovery | Retain the current pose tests. A newly fallen helper can still look upright for the sampled latency; a recovered helper can still look down. No instantaneous hidden-state correction or clock-based bust roll. |
| Genuinely remote help | A helper tens of yards above the receiver, initially aligned, must not make the observer abandon his man merely because he is upright and deep. Include departing, stationary and co-moving variants. The far branch should treat these as unestablished help; document any physically plausible exceptions before broadening it. |
| Competing primary and deeper threat | Preserve the early-primary safeguard. A confirmed uncapped primary remains protected. A visible roof or observed break can still permit help. Test that accepting a deep roof does not automatically create a switch when the other route is not a genuine observed threat. |

After those controls pass, rerun the **same fixed24 panel**, retain all added/removed cap-query records and all adverse outcomes, and inspect changes before enlarging the sample. Added observed query records are not automatically new decisions or busts. Compare actual receiver/defender trajectories and contact, plus small full-game guards; do not tune the estimator to points or interception totals.

## Limits and priority

Motion alone cannot establish a teammate's assignment, communication, future acceleration or willingness to leave another receiver. The objective is a useful bounded guess with consistent failure modes, not perfect help recognition. The fixed panel contained no grounded/rising roof incidence; its pose fix remains a staged safety invariant. Short-cushion and far-helper counts are diagnostic candidates, not measured blown-coverages.

The local numerical correction is complete; this coverage experiment remains unimplemented. Freeze a new source and pass the staged controls before a field trial. The retained evidence here belongs to the preceding visible-help source, not to a newly measured coverage panel after the physics correction.
