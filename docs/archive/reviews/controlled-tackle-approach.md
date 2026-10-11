# Controlled tackle approach and owner-film observations

**Read first on `claude/engine-priorities`. Physics remains NOT READY.**
Follow [PHYSICS_DEVELOPMENT.md](../plans/PHYSICS_DEVELOPMENT.md) and the acceptance
gates in [the preceding handoff](held-foot-and-movement-readiness.md). The owner
reported G4-P135, G5-P106, G6-P053 and G6-P096 in the film from `2c2c250`.
This pass traces that exact source and improves an approach controller using
the shared body's existing limits. It does not retune collisions, grip strength,
physical capacities, tackle outcome probabilities or solver resolution.
PR #1 remains separate.

## What the four clips actually show

All four are **Curl-Flat completions**, not zone runs. The original film source
is `92eb1ea66cfffd94732d7eb2dc8132212a135fdf8a2cf17a595f7d1674632e63`.
`scripts/diag/pursuit-film.ts` instruments the original six games without changing
decisions or random draws. Each selected packed path is verified exactly against
that film before collecting commands, contact impulses, support states and
tackle events. Reviewed samples are in `owner-observations.json`; full traces
remain ignored.

| Clip | Reproduced observation |
|---|---|
| G4-P135 | 91-yard TD, about 79 YAC. SS dives and misses; NB makes an extended hold and falls into a dive, then slips. CB_S hits the diving SS at **9.91 yd/s closing speed**, then falls. This is a real teammate collision following poor approaches, not evidence of invented momentum |
| G5-P106 | 71-yard TD, about 59 YAC. FS continues requesting 9.91 yd/s while crossing the runner, reaches at about 1.63 yd separation, dives and loses the hold. LB_W has a separate missed attempt |
| G6-P053 | 20-yard completion ending out of bounds. FS crosses at roughly 7.4 yd/s, makes an extended hold, dives and slips; CB_W subsequently wraps. The safety's entry trajectory needs better braking/redirect planning |
| G6-P096 | 63-yard TD, about 59 YAC. Only CB_S records a missed tackle, a dive. Other defenders often never reach an attempt. Catch separation is already about 10.7 yd. Counting every visible pursuer as a missed tackle would misdiagnose the play |

The contact solver still transfers a real closing impulse to the teammate; that
can legitimately knock players down. The reduced balance response and collision
magnitudes remain unvalidated. The trace does not prove that every fall is
realistic, but it identifies a controller reason for the high-speed encounter.
Weakening all contacts to hide it would affect blocks and tackles too.

## The controller error and repair

The final crossing approach matched the carrier's velocity across the bearing
and assigned **all remaining top speed toward him**, regardless of remaining
distance or available braking. It also requested push throughout that approach.
A defender could be crossing at speed, recognize the runner changing direction,
and still receive a maximum-speed command until he passed the useful hip.
The world correctly limited the turn; the controller had not planned for it.

`movingArrivalVelocity` in `src/physics/kinematics.ts` is a reusable moving-point
steering primitive. It matches observed motion across the bearing and budgets
relative closing speed from distance to the contact envelope and the body's
existing acceleration ellipse. Speed remains bounded; nothing moves the body
directly. The world supplies actual forces and may fail to execute the command.

`chase` now uses that primitive for crossing/near approaches. It begins accounting
for closure when the projected braking distance requires it, using current
velocity, fatigue and support availability. The existing control policy asks
better tacklers for a gentler relative arrival and worse ones for a harder one;
those 2.5–4.5 yd/s requested arrival values are retained control assumptions,
**not measured safe-contact thresholds or new physical capacities**. Push is
requested at the strike, rather than throughout a distant crossing approach.
Head-on breakdown and far pursuit remain their existing policies. Targets still
come from delayed perception; the runner's next intended cut is not available.

A cheap mirrored regression verifies that identical bodies with different
tackling control request different closure while tracking the same observed
cross-bearing motion. It also preserves the existing unseen-state, head-on,
oblique and sideline checks. Body/strength ratings are not rescaled to make
the tackle succeed. Tackle miss draws and grip execution remain older, imperfect
mechanisms; this pass does not claim to eliminate those outcome abstractions.

## Isolated mechanical evidence

`scripts/diag/moving-contact.ts`: four roster seeds, both mirrors, four entry
geometries, 6/12/48 substeps: **96 reps per source**. The carrier asks for a
straight 6 yd/s run; the defender uses ordinary chase and both move through the
ordinary world. No tackle rolls, grasps, evasion or assignment effects. This is
a body-approach probe, not an NFL tackle-success estimate.

Native-12 results, eight reps per geometry:

| Geometry | Body contacts before/after | Mean peak contact closing, yd/s | Body falls before/after |
|---|---:|---:|---:|
| Crossing | 8 / 8 | **10.43 → 3.23** | **14 → 0** |
| Near crossing | 8 / 8 | 4.02 → 3.48 | 0 → 0 |
| Frontal | 8 / 8 | 7.77 → 7.77 | 8 → 8 |
| Trailing | 8 / 8 | 2.57 → 2.48 | 0 → 0 |

Momentum and planar work residuals stay below `2e-12` and `9e-12` respectively
in these native-12 reps. The reduction comes from movement before contact,
with identical physical profiles, not from scaling the contact impulse.

**Numerical limits remain.** First body-contact times match at the 20 Hz reporting
resolution, but continuing the unwrapped mechanical rep for five seconds can
amplify differences after collisions/falls. Native 12 versus 48 worst defender
ending-position error is **1.308 yd crossing** (before 0.238), **0.351 near
crossing** (before 0.171), **8.502 frontal** (before 10.457), and 0.071 trailing
(before 0.054). Frontal fall sets disagree in two mirrored reps before and
after; the other geometries do not. These long continued-contact probes are
not officiated tackles, but their instability is a real readiness concern.
The full-path mirror comparison also exposes a **0.691 yd frontal drift**
in seed 7 at native 12 before and after, with matching fall sets. The crossing
probe remains mirrored within `3.5e-7` yd after the change; this does not excuse
the frontal failure. Cheap symmetry contracts do not cover every critical
continued-contact trajectory.
Do not describe the new approach as a numerical-convergence fix.

The existing nine real-technique hand-fighting fixtures are unchanged: native
12 versus 192 mean closest-distance error **0.206 yd**, worst **0.822 yd** and
**two fall disagreements**. Continue tracing the pre-wrap block path and the
near-critical QB support transition. No global resolution increase was used.

The older open-field lab adds 40 reps each for front, side, two-defender and
trail geometries. Its fast live-evasion side case escapes in all 40 reps before
and after; it is not evidence that every escape is a bug or that the new
controller solves far interception. Front and trail behavior change little.
Those tests have different bodies and a faster live carrier than the mechanical
6 yd/s probe. Keep feasible interception, close approach and grip establishment
as separate questions.

## Football guard, with regressions

Same seed/cohort definitions as `2c2c250`: sixteen games, seed 7, two independently
generated leagues; four recorded tracking games, seed 5. These are broad guards,
not tuning targets or formal causal estimates. Calling/clock/roster exposure
changes after execution changes; the constant-body probe is the cleaner evidence.

| Measurement | Before | After |
|---|---:|---:|
| Points/team-game | 30.09 | 28.91 |
| Missed + broken tackles/play | 0.22 | 0.18 |
| 20+ yd completions/throw | 15.73% | 13.63% |
| Completed YAC | 8.19 yd | 7.94 yd |
| Interceptions/throw | 7.32% | 6.65% |
| Run yards/carry | 3.50 | **3.06** |
| Run stuffs | 24.10% | 23.60% |
| Run 10+ rate | 6.54% | 6.55% |
| Four-game geometric pressure | 25.5% | 26.4% |
| Four-game DL speed at 0.5 s | 1.58 yd/s | 1.58 yd/s |
| Four-game first-contact YBC mean | 0.89 yd | 1.48 yd |

Rushing efficiency worsens; passing explosiveness, YAC and interceptions remain
too high despite moving down in this cohort. The four-game YBC improvement is
not reproduced by the sixteen-game run-contact mean (0.84 → 0.77 yd); they use
different roster cohorts and measurement paths. This needs matched run/contact
comparisons, not a compensating strength adjustment. DL run peak acceleration
is still about 5.04 yd/s² versus 3.28 in the existing NFL reference.

The owner's outside-zone versus inside-zone impression is visible in the
**original fixed film**: outside/wide zone has 12 runs of 10+ yd in 95 attempts
(12.6%); inside zone has 1/33 (3.0%). These small, unmatched concept/context
groups do not establish concept calibration. Counter is 3/13; gap concepts
also differ in stuffs and mean gain. Do not use highlighted plays alone.

## WR/DB reference and legal contact

The uploaded [WR/DB textbook](../../references/WR_DB_Mechanics_Textbook.md) is retained
byte-for-byte for collaborators, with hash/provenance in the reference index.
Its controlled run-support approach and phase/hand-contact discussion are useful
design aids. It is not repository instructions or independently verified rules
authority; its linked figures were not supplied and cited sources need checking.

Press releases already use bounded world hand joints, finite hand following
and receiver clearance, with no tensile jersey hold. The controller stops its
release jam beyond its simplified five-yard window or when the ball is thrown.
WR downfield blocks also use the shared hand/engagement system. We do **not**
yet have full independent left/right hand tactics or an adequate NFL illegal
contact, defensive holding, OPI/DPI implementation. Existing simplified offensive
holding is not that system.

When expanding WR/DB interaction, implement its contact history and officiating
together: who controls which hand, push versus actual restraint, where contact
acts, how it changes route/movement, whether contact breaks and is reinitiated,
player eligibility, ball/throw/possession state and material effect on a catch.
Check current authoritative rules and exceptions before mapping those predicates
to fouls; a generic distance or elapsed-time penalty roll is insufficient. This
pass does not add penalties or coverage technique packages.

## Verification and next work

Engine source SHA-256: `e3471f2c0be6e1c4b32c9713d53d216bc835691d868e93e1628ea279fb21498d`.
**267 engine tests, 20 data checks, typecheck and build pass.** Fresh film has
**874 clips, six fixed-team games, 27 concepts**; all 20 browser checks pass,
including two pitch release/catch sequences. ZIP HTML matches the viewer.
New play IDs refer to new trajectories; old reports are preserved with their
old source. New film has 512 throws, 327 completions, 34 interceptions and 151
other incompletions; drop share remains 28/151 (18.5%). Geometric pressure is
still an annotation, not a proven cause of each miss.
The fixed-film 20+ completion rate goes **16.73% → 16.99% of throws**, unlike
the decrease in the sixteen-game league cohort. This is mixed transfer evidence,
not a general reduction in explosive plays. No matched counterfactual of all
four original clips is claimed: their IDs belong to the original source.

1. **Physics convergence first:** pre-wrap hand/load/lean path, near-critical
   QB support, and the long continued-contact drift exposed by this probe.
   Keep decision rate fixed and localize integration errors before refinement.
2. **Executable pursuit:** improve far interception estimates with turning,
   braking, facing and arrival-relative motion. Current analytical reach still
   gives only an approximate plan. Preserve delayed visual information and
   fallible execution; don't give defenders the runner's future cut.
3. **Achievable tackles and traffic:** evaluate sustainable grip/reach/current
   support before committing a dive. Anticipate teammate paths early enough
   to brake; the existing 1.2 yd spacing window is often late at sprint speeds.
   Test helpers and crowded pursuit without disabling real teammate collisions.
4. **Loaded run transfer and capacity/effort separation:** use the existing
   matched NFL panel and complete-measurement subsets, then front/alignment,
   OL response, posture, doubles and actual first-contact comparisons.
5. **Contact magnitudes and reduced support energy:** sensitivity and appropriate
   physical measurements remain necessary. NFL paths do not identify grip force.

Evidence/commands are in `data/reviews/physics-world/controlled-approach/`.
No new raw NFL data or AddBiomechanics subjects were downloaded. No physics
constants were fitted to the game guard. The foundation has not earned the OK.
