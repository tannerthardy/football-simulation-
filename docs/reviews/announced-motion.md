# Announced movement must remain distinct from achieved movement

**Ready for isolated Integration review**, after independent source/information
and adverse-case review. This is a spacing-picture correction, not a strength,
gait-capacity, contact-law or recovery change. It is independent of the yaw
candidate in[#180](https://github.com/tannerthardy/football-simulation-/pull/180),
which remains held on its declared tail-cost gate.

Accepted parent:`2c98bed94adad8087c65f381d4090444ad283985`;
canonical queue:`6575988fe9e72bd0aaf9e3573787f0dcb81ebf52`.
Candidate:`24ff632b142183d295068c3720b5990bf8c956f8`;
runtime SHA256:`89dfe6ea4b1eb08754895b43e0c0dcadaa1ae38b1c7425cb9d1d70bd43224fea`.

## Demonstrated error and bounded repair

PlaySim replaced a teammate's acquired velocity with its rehearsed target
speed, then extrapolated position using that target. A stationary or slowly
accelerating teammate could therefore be pictured already running fast. The
spacing controller responded to a collision threat the bodies did not create.

Saved WZ strong,seed3,rosters31/32,Ace11,Over/Cover3,RG/C at.55s:

| C's present-picture error | Old | Candidate |
| --- | ---: | ---: |
| Position |.127926yd|.000696yd|
| Velocity |2.44983yd/s|.02785yd/s|

The old picture changes RG's raw request(−.527,−.047) to(−.294,−2.087)yd/s.
The correction retains the raw request. An opposing control acquires C
**already moving at the called speed**: old/new avoidance is exactly identical.

The helper uses only the acquired picture, announced track and public physical
profile. Plan one existing50ms gait request at the acquired facing, bounded by
existing traction. Advance that acceleration over the picture's age. Perception
already dead-reckons position, so add only`.5*a*age²`, never velocity*time again.
The controller interval stays50ms even for tiny/subtick ages. Zero-age, equal
motion, unknown/down pose and unsupported older pictures preserve the ordinary
picture. No live teammate body, support, fatigue, extra observation or RNG read.

This is explicitly a fresh/free estimate, not proof of the teammate's actual
support or guaranteed clearance under load. Bodies and existing avoidance
still decide movement. No artificial positional speed/strength boost.

## Native transfer and retained regression

Three fixed inputs/six executions, same initial bodies/profiles/settings.
All finish; live grasp joints and positive opposing body impulses are measured
separately at World-step endpoints, not inferred from proximity. These are
20Hz observations, not exact within-step acquisition timestamps.

| Runner's first opposing body contact | Accepted | Candidate |
| --- | --- | --- |
| Selected WZ |2.35s/−.981yd,DT_S|2.90s/+.285yd,LB_M|
| Flipped WZ,adverse |3.90s/+5.223yd,FS|2.60s/+.362yd,LB_S|
| IZ control |3.20s/+3.174yd|same|

The selected runner crosses the LOS instead of being stopped behind it; its
first grip is still just before the line. The flipped run loses its previous
protection. Neither result establishes a general football improvement.

One targeted replay of the adverse flip,53ticks/arm through2.65s, reproduces
the saved trajectory/commands. Both have **zero delivered teammate body
collisions**, all linemen upright. The first change removes LG's fictitious
6.089yd/s startup demand. Existing combination logic then selects LG to climb
at.90s with LT staying, instead of LT climbing at1.10s with LG staying. LG's
existing departure route works backward/inside and does not acquire LB_S;
the old LT reaches him at1.80s. This explains the earlier runner contact.
No failed fast-teammate avoidance or physically denied command is demonstrated.
Keep this Run/controller concern visible; do not restore an impossible current
picture to recover the old ending. The changed choice is not proved optimal.

## Checks, cost and reproducibility

Final **32 focused checks and typecheck pass** on the exact candidate: nine
new prediction contracts plus zone-track, joint-spacing, yield and residual
movement checks. No existing expectations, physics defaults or flags changed;
GAIT_STEP/RB-read/experimental contact remain off. Integration owns one exact
combined verification; no worker full-suite or game campaign was run.

Native runs used direct Node/tsx, not the baseline launcher. Both arms ran in
one process with identical settings. The original environment capture includes
only selected flag names. A posthoc44-key whitelist finds all unset, and every
archived module default matches the baseline profile. This reconstructs baseline
equivalence; it is not a historical full-environment capture. Final component
checks explicitly pin all44 settings through the launcher. Preserve that
provenance qualification rather than relabeling the original native runs.

The original native helper used picture age as its planning interval; all native
teammate ages are.05s. Final code fixes the planning interval to.05s independently
of age, so these inputs execute the same arithmetic. An optional-call annotation
fix erases to identical JavaScript. Final helper hash and compatible source
differences are explicit in the receipt; original tapes are not relabeled.

Helper-only repeated benchmark: median batch mean.318µs/call versus.049µs;
slowest batch mean.514 versus.081µs, nine alternating100k-call batches. These
are **not individual-call tails or net-native cost**. Native recording/diagnosis
cost and raw hashes are in the receipt. Work residuals remain≤1.12e−11.

The defect is independently established by the saved current geometry and
analytic bounded-step contract. No new NFL query/calibration is required to
show that a target velocity is not already achieved. Existing NFL observations
still guide movement questions; this does not claim league-wide smoother paths.

[Evidence, settings and source compatibility](../../data/reviews/current/announced-motion.json).
The next useful movement task is the exposed climb/departure request, followed
by explicit burst/arrival intent—not a global capacity boost or another solver.
