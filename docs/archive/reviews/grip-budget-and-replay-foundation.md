# Shared grip budget and replay inspection foundation

## Status and where to start

Work on `claude/engine-priorities`. **Physics is NOT READY.** Read this with
[PHYSICS_DEVELOPMENT.md](../plans/PHYSICS_DEVELOPMENT.md). The previous baseline is
`60c149b`; evidence for this pass is in
`data/reviews/physics-world/grip-budget/`. Do not change or merge PR #1.

This pass repairs a demonstrated force-budget defect. Active arm reeling and
passive grip restraint now share the same grip-force allowance. It does not
repair the real hand-fight convergence failure. New probes separate its
pre-wrap and post-wrap causes; do not raise resolution globally to conceal it.
The replay recording/export work is observational and is described separately
in [Replay telemetry and export](replay-telemetry-and-export.md).

## What the trace established

The existing planar kinetic-work ledger closes, but a closing ledger cannot
prove that a player stayed within his force limits. The grip diagnostic sums
the **actual delivered active and passive impulse vectors** at every substep.
Before the repair, an active reel was capped by the holder's arm actuator;
passive restraint independently spent the grip allowance. A weak grip could
therefore transmit far more than its claimed capacity without violating
momentum conservation or the energy ledger.

In an isolated 100 kg pair (carrier initially moving at 5 yd/s, 2 yd/s reel
request), a 50-unit grip transmitted up to **854.35 kg yd/s²**, or **17.09 times**
its allowance. A 300-unit grip reached 1,104.35; a 900-unit grip reached
1,704.35. In the actual redirect fixtures the excess was smaller but still
real: up to **7.81%** at native 12 substeps. These are artificial mechanics
fixtures and generated football players, not measured human grip capacities.

`World.gripCapacity` now gives the same structural allowance to both stages.
Delivered active reel is recorded per joint; the passive normal/tangential
solver spends only the remainder of the combined force-vector budget. All
holds from one holder continue to share his strongest structural claim,
bounded by the existing arm-based envelope. Duplicate holds cannot multiply
that allowance. The reported grip force is the interval mean of the norm of
the combined delivered load. Arm muscle impulse/work limits remain separate
and unchanged. No force constants, player profiles, solver floor or football
outcome coefficients were fitted.

The same diagnostic now finds **zero force-budget violations** in the isolated
capacity/resolution panel and nine real redirect fixtures at 12/48/192 steps.
The contract test also covers zero-capacity grips and duplicate holds. A former
test asked a zero-capacity grip to reel; it now uses a valid slack grip to
isolate the same active contact-height moment.

## The fall reversal is localized, not repaired

The full closed-loop hand sweep still runs nine seed/power fixtures, with
ordinary 20 Hz football decisions and a 192-step numerical reference:

| Native 12 steps | Before | After |
|---|---:|---:|
| Mean closest-approach error | 0.20610 yd | 0.20605 yd |
| Worst closest-approach error | 0.82215 yd | 0.82215 yd |
| Fall-set disagreements | 2/9 | 2/9 |

At 24 steps, fall disagreements **increase from one to two**. At 48/96 steps
they remain zero. Correct force accounting does not establish numerical
readiness; the regression belongs in the record. A finer solution is a
numerical reference, not physical ground truth.

`grasp-support-convergence.ts` adds two isolations using the actual first wrap:

1. Start each resolution from an identical 192-step incoming body/joint state,
   hold the incoming intents and controller-set capacities fixed, and run the
   ordinary world for eight 20 Hz ticks. Grip slip/ratcheting, loads and support
   continue to evolve. All five fixtures make the QB fall at every tested
   resolution. This is not the original play: decisions and officiating are
   deliberately frozen/absent.
2. Keep the real controllers and officiating, but switch physics resolution
   only when the first incoming grasp exists. For seed 3 / power 1, the QB
   stays upright with post-wrap 12 steps and falls with post-wrap 192 steps,
   **regardless of whether the pre-wrap path used 12 or 192**. For seed 3 /
   power 1.4, the rusher fall instead follows the **pre-wrap** resolution;
   changing only post-wrap resolution does not fix it.

This distinguishes the near-critical coupled wrap/support/controller path
from a separate incoming block-path difference. It does not show that either
is a coverage problem, nor that fixed-input support is converged in position
or fall time. The remaining 0.822 yd worst approach error is in seed 7's
unwrapped hand fight, so a grasp-only change cannot resolve it.

## Transfer and NFL guards

The five-task shared-capability panel uses the same physical profiles for
anchoring, double drive, shedding, absorbing contact and press jams: 120 reps
including mirrors and 6/12/48 steps. Final maximum momentum/work residuals
are `2.73e-12` / `8.42e-12`; native mirror error is below `1.2e-14` yd. Native
position error against 48 steps is 0.030 yd mean / 0.075 yd maximum, with no
fall-set disagreements. This is useful mechanical transfer evidence, not
validation that those controllers execute authentic NFL techniques.

Forty reps each of the actual front/side/two/trail open-field controllers
retain the pursuit problem. Side approach still produces **40/40 escapes
without a wrap** in both revisions. Front after-contact travel changes
12.73→12.79 yd, two-defender travel 10.79→10.52, and trailing travel
44.00→42.51. Trailing escapes remain 24/40. Do not infer that a contact-force
fix repaired interception geometry or far pursuit.

Four tracking-style games, seed 5, using the same generation procedure and
the existing 2022/2023 tracking summaries:

| Measurement | Before | After | NFL reference |
|---|---:|---:|---:|
| DL speed at 0.5 s, median | 1.58 | 1.58 yd/s | 1.68 |
| Defender within 2 yd before release | 30.9% | 31.4% | 32.49% |
| Pocket depth at 2.5 s, median | 4.22 | 4.18 yd | 4.55 |
| Run first-contact yards, mean | 1.10 | **0.77 yd** | 1.16 |
| Run DL max acceleration, median | 4.92 | 4.75 yd/s² | 3.28 |

Run OL acceleration is 3.67 versus 2.99 yd/s²; RB acceleration is 3.74 versus
5.18. These are descriptive, differently composed cohorts. A change in
tackle mechanics changes later game choices and samples, so an earlier
first-contact yardage shift is not proof that the opening line force changed.
No movement envelopes were fitted to these results.

Sixteen games, seed 7, two independently generated eight-team leagues:

| Guard | Before | After |
|---|---:|---:|
| Points / team-game | 29.47 | **32.03** |
| 20+ yd completions / attempt | 14.55% | 14.26% |
| YAC / reception | 8.01 | **8.88 yd** |
| Interceptions / attempt | 8.48% | 6.77% |
| Missed + broken tackles / play | 0.19 | **0.26** |
| Run yards / carry | 3.37 | 3.91 |
| Stuffs | 24.59% | 23.34% |
| 10+ yd runs | 6.77% | 6.47% |

Passing explosives and interceptions remain far above NFL ranges. Scoring,
YAC and tackle counts regress. Correcting unexplained force is justified by
the physical defect; it does not justify calling the resulting football good.
Changed trajectories alter subsequent decisions and random draws, so paired
seeds do not isolate every causal effect. The two leagues span 29.00–35.06
points/team-game and 3.62–4.20 run yards/carry.

The separate six-game film cohort has 875 recorded clips / 765 non-nullified
scrimmage plays. Twenty-yard completions are 75/507 throws (**14.79%**), versus
96/512 (18.75%) before. Run success rises 27.18→32.66%; run explosives stay
about 9%. Inside/outside-zone explosives are 3/37 and 5/45, with small,
unmatched concept/front/coverage cells retained in the report. Those cells
are not independent scheme experiments or NFL calibration. Drops account
for 22/145 incompletions excluding interceptions (15.17%); pressure annotations
cannot identify the cause of the other incompletions. Coverage/QB technique
concerns remain open.

## Acceptance and limits

Passing contracts are necessary. Readiness also requires useful convergence
under real controls, credible loaded movement, mirrored prolonged contact,
and transfer across the owner's interactions without role-specific strength
bonuses. There is no honest percentage of all possible remaining physics
gains yet. The reduced support model and physical force magnitudes still need
empirical validation.

The earlier [controlled approach review](controlled-tackle-approach.md)
retains a long frontal-contact drift of 8.502 yd, a 0.691 yd native mirror
error, and fall disagreements. This pass does not claim to repair them.
Leg-restraint strength is still a geometric proxy; a force-limited grip does
not establish that the foot-lock model has a complete force/work budget.
The ledger covers planar translation and yaw, not a full 3D anatomical energy
model. The existing 3.36-arm structural envelope is unvalidated.

Whole-game outcomes are noisy guards. The prior review also identifies a
measurement defect: called-pass QB scrambles tackled behind the line are
counted as rushes rather than sacks. That definition audit remains open;
do not use the printed sack/rush rates as exact NFL comparisons. Geometric
2-yard pressure and QB-sensed pressure are different measurements.

## Next, in order

1. Trace the seed-3 / power-1 wrap at substep level from an identical incoming
   state **with real controllers**. Compare delivered joint loads, slip/leg
   transitions, held-foot motion, support recovery, and the whistle boundary.
   Resolve its local feedback/integration defect before adding more moves.
2. Trace seed-3 / power-1.4 and seed-7 pre-wrap hand fights separately. Fix
   the demonstrated force/integration cause, then repeat the nine-fixture
   sweep and prolonged frontal/mirror guard. Avoid a global step increase.
3. Audit restraint feasibility and loaded run contact: force-limited foot
   locks, initial acceleration, OL response advantage, posture and double
   teams. Use matched NFL movement and contact timing, not points targets.
4. Improve achievable tackle approach and far pursuit using the same body
   braking/cutting/reach envelope. Compare actual contact geometry and whiffs.
5. Once physics clears its gates, expand the visual recording and football
   controllers. The man-assignment audit is a cardinality/side safeguard,
   not the final model of fluid fronts, pressure exchanges and playcalling.

The owner's new
[Coverage Operating System manuscript](../../references/Coverage_Operating_System_Manuscript.md)
is retained verbatim for that later work. Its communication, checks,
coverage/rush ownership and first-invalid-state diagnosis are useful design
topics. It is an unverified user-supplied aid, not engine instructions or an
authenticated NFL installation. Physics remains the active priority.

The evidence README records commands, source hashes, cohorts, game/film
guards, tests and viewer verification. Read both improvements and regressions
before continuing.

Final verification passes 285 tests and 22 Python data tests, with clean
typecheck and build. Browser checks pass 32 contracts on the 875-clip library,
34 on the six full-detail fixtures and 28 on an older 884-clip library.
Downloaded WebM clips decode as VP9 at 1280×840. Recording-level contracts
preserve results, events, positional frames, final bodies and the next RNG draw.
Lossless per-play compression makes the main standalone HTML 41.5 MiB
(17.5 MiB ZIP); the small full inspector is 1.33 MiB (0.87 MiB ZIP).
Unsupported decompression leaves paths and events usable and explains the
missing inspection state. These checks establish recording and packaging
correctness; they do not establish physics readiness.
