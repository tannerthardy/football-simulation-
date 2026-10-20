# Free and loaded movement: bounded yaw correction

The most defensible immediate correction is the shared facing motor, not
stronger linemen or a faster global gait setting. A fixed facing request
produces repeated overshoot on accepted code, without contact, new decisions
or randomness. The candidate removes that self-generated motion and preserves
the existing force, traction, inertia, rate and recovery laws. Its ordinary
motor response and the ground reserve left for recovery **do change**.

Accepted comparison: `2c98bed94adad8087c65f381d4090444ad283985`;
canonical queue inspected: `6575988fe9e72bd0aaf9e3573787f0dcb81ebf52`.
Minimal #162 extraction: `2637558c5024b84dc23f7de10cffc3058b2dab41`.
Exact-flow optimization: `aadac6d8b78bd452ff3bb92b337e027bec4a0d25`.
Final runtime SHA256:
`8ea7dadd45db400da68e31a92b215572d0243c48495e97d666b7dcb5ce08c8c2`.
Node22.23.3, all44 baseline settings retained, components1/GAIT_STEP0,
center hands, centered integration, legacy support, speculative impacts and
mean support integration. Research gait/contact branches remain separate.

## Cause and correction

The old motor requests `angleError / remainingTickTime`, without planning
braking against incoming angular velocity. Its stopping deadline also changes
with the phase of the physics step. The existing bounded critical-response
motor accounts for incoming spin and the actual requested angle. Use it for
ordinary World movement and matching `stepBody` forecasts. Preserve the
existing prospective gait estimate; this does not import held #165.

Reserve **peak absolute yaw torque**, not net angular impulse/time, before
spending recovery's remaining traction. Opposing torques can cancel in the
net impulse while still using the turf. External spin is removed through
finite counter-torque, never projected to the motor's speed limit.

The optimization certifies the exact unsaturated flow's acceleration and spin
extrema, including interior extrema, before skipping event searches. Saturation,
near-boundary states, zero allowance and external overspeed retain the existing
solver. No new mechanics, looser tolerances or changed limits. Independent
review accepts both the motor interface and this equivalent fast path.

## Evidence and limits

Five of the eight turning assertions fail on accepted code; all eight pass
after extraction. Final candidate passes114 directly affected assertions and
typecheck. Twenty-four direct mirrored reference comparisons are bit-identical,
including peak demand and events. Two added opposing controls ensure an
interior acceleration/rate limit is detected even when both free endpoints fit.

- Held60° turn:19.52° overshoot becomes0°, with the same7rad/s limit.
- Normally loaded co-flow remains upright:3s lateral travel5.75027→5.74654yd.
- Loaded external-spin controls match independent finite-braking rotation,
  impulse and work within floating precision; shared traction is respected.
- Retained adverse mechanical control: a mismatched torso-slip continuation
  changes, and peak late angular error rises from≤2.09° to3.54°. Smooth free
  turning does not imply every loaded block retains better position.

Two existing frozen native inputs were replayed on current accepted code and
the minimal motor candidate. Same bodies, profiles, calls, seeds and settings;
four prefixes cost6.50s recording. No games, roster sweep or NFL query.

| Current native comparison | Accepted | Candidate |
| --- | ---: | ---: |
| Toss first runner contact |2.50s|3.95s|
| Toss tackle / gain |3.15s /−.93yd|4.65s /+.94yd|
| Four-verts Y throw / catch |2.80 /3.80s|2.85 /3.85s|
| Four-verts ending |live, censored at6s|tackle5.25s|
| Alternating body-facing correction,567 matched windows |1.1893°|.1854°|
| Alternating travel-heading correction |.22150°|.21981°|
| Speed pulse |.12062yd/s|.12155yd/s|

The facing reduction is84.4%; path jitter and speed pulsing barely change.
Toss's later contact follows a different raw runner cut, then valid teammate
avoidance behind Y. Independent review finds no same-state feasible command
being denied. Preserve that material delay; the chosen route is not proved
optimal. Neither changed gain nor an old encounter time is an acceptance target.

The existing #162 NFL reference uses20 selected plays from one game sequence,
10Hz/.01yd valid samples, and separates body orientation from travel heading.
Reuse its operator/provenance; it is not league calibration or gaze. Its clear
body-facing reversal reference is.263°. No new population/NFL benefit claim.
[Original packet](https://github.com/tannerthardy/football-simulation-/tree/ed6ebd21911a28f07a085094c393ea2613abeb69/data/reviews/movement-continuity).

## Other limitations localized, without speculative fixes

An equal-command linked pair exactly reproduces unlinked lateral movement;
normal-loaded pairs also translate and remain upright. Their complete momentum
and work close to floating precision. There is no demonstrated generic World
lock that justifies stronger lateral bodies or weaker hands.

In the current WZ seed3/rosters31–32/Ace11/Over-Cover3 witness, hand feedback
does oppose the blocker's own overtaking request. Removing that cue alone barely
changes the actual consumed command, brings no useful WZ improvement and
worsens the IZ control. Do not promote that intervention or the held contact
track floor. Current stretch anchoring already preserves lateral work.

The actual large request change comes from teammate spacing: C is observed
moving−.800yd/s but its announced−3.392yd/s target is substituted as achieved
motion, including position extrapolation. This generates an unnecessary RG
escape request of−2.087yd/s. A finite-response estimate preserves the raw request
and retains exactly the old avoidance when C really is moving at that speed.
This is a separate prediction/controller candidate, not part of the motor fix.
It needs its own complete native continuation and information/avoidance review.

Moderate-speed acceleration remains a separate request contract. Global
GAIT_STEP activation is not justified; explicit burst can use existing capacity
but needs a coherent braking/corridor objective. A small feasibility experiment
reduces a crossing approach's excursion.768→.645yd within a declared.65yd
corridor, while preserving slower/aligned controls. That prototype is not a
generic arrival guarantee or an adopted native controller.

Known center angular/contact accounting, experimental solver, support-history,
and the nine unrelated historical patch failures retain their existing holds.

## Runtime and adoption decision

The unoptimized extraction increases isolated World-step median cost about
60% free/52% loaded. The exact-flow fast path reduces these to21%/14% in
the small mechanical benchmark. That is not whole-native cost. The first
fast-path mechanical receipt flags a test edit during collection; runtime
source stayed identical and the separate source/reference evidence is explicit.

Two fixed native60-tick prefixes, with no tracing/copying in the timed loop,
use20 balancedAB/BA rounds after four warmup pairs. All remain live for the
same3s. The first run partly overlaps typecheck/warmup and is retained. A clean
idle repeat, on frozen final source, gives:

| ms/native tick, batch average | Accepted median /p95 /worst | Candidate median /p95 /worst | Paired median /p95 /worst |
| --- | --- | --- | --- |
| Toss |2.820 /3.162 /3.214|2.719 /3.601 /3.747|.966 /1.267 /1.433×|
| Pass |2.458 /2.895 /2.961|2.468 /2.941 /2.980|.980 /1.131 /1.287×|

Use the receipt's unrounded values. Tail statistics describe batch averages,
not individual-tick latency. No average speedup is claimed. The predeclared
median≤1.10× gate passes; **paired p95≤1.25× fails for Toss**. Absolute-p95
ratios are smaller but do not replace that gate after observing results.
Do not silently waive the failure or launch another micro-tuning loop.

The optimized Toss exactly reproduces the unoptimized candidate's94 ticks:
full bodies, requests, perceptions, RNG, contacts/events and outcome, with only
source/elapsed metadata excluded. Thus its native accuracy evidence is reused
without relabeling the original source.

**Disposition: mechanics ACCEPT, adoption HOLD on the practical tail-cost
decision.** The isolated correction is fully reviewable, but is not yet declared
integration-ready. Primary/Integration retain the ordinary yaw/default adoption
decision and exact combined verification. No production branch or experiment
was activated; no worker full-suite rerun. Next useful independent work is the
announced-motion prediction defect above, rather than more solver mechanics.

Exact inputs, settings, checks, independent reviews, source/tape hashes and
cost summaries: [compact receipt](../../data/reviews/current/loaded-movement.json).
