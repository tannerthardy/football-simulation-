# Linemen slow off the ball: what holds them back, and one start law (held)

Main Engine, Stage 1, 2026-10-27. Question from Tanner: what per-body
acceleration law should take a heavy lineman from his stance to a moderate
target speed? It should come from mass, leg force and stance, sit on the
force-velocity curve (#297's shape: force falls as speed rises, the start is
the low-speed end), and bring OL and pullers to NFL without moving backs or DL
past theirs.

**Outcome:** one law, below. It is physically supported and fixes the
linemen's start, but it fails the acceptance bar. It moves backs past NFL, and
on pass plays DBs, receivers and backs too, because those controllers request
speed earlier or harder than NFL players move. The old proportional start was
hiding that. No second law: one that keeps skill players slow would be physics
bent to cover controller timing. The law is in commit `b4a6bcfe` on this branch,
held, not for merge on its own.

## 1. Measurement (run-only film vs NFL, same operator)

Run-only harness from #329, seeds 7/9/11/13, two games each (about 890 runs),
against 1,218 NFL runs (BDB2025 weeks 1-2). Distance from the snap spot, median.

**Correction to #329's numbers.** Sim film frames sit at t = 0.05 + 0.1k
(recorded after every second tick), but `run_film_reference.py` reads frame k
as t = 0.1k. It samples the sim 0.05 s late and flatters it. Here sim
positions are interpolated to the true time. OL at 0.5 / 1.0 s is 0.27 / 0.86
corrected (0.33 / 0.91 as #329 printed). The same offset made
`GAIT_STEP=0.3 PULL_STEP=1` look like an exact puller match.

| Develop `55cc9e5`, runs | d 0.5 s | d 1.0 s | d 1.5 s | first 0.15 yd | 0.5 yd/s reached | ramp 0.5→2 yd/s |
|---|---|---|---|---|---|---|
| OL (non-pullers) NFL | 0.45 | 1.41 | 2.48 | 0.30 | 0.10 | 0.40 |
| OL (non-pullers) sim | 0.27 | 0.86 | 1.34 | 0.45 | 0.30 | 0.40 |
| Pullers NFL | 0.60 | 2.03 | 3.76 | 0.30 | 0.10 | 0.40 |
| Pullers sim | 0.22 | 0.84 | 2.04 | 0.45 | 0.30 | 0.70 |
| RB (carrier) NFL | 0.21 | 1.44 | 3.59 | 0.50 | 0.40 | 0.30 |
| RB (carrier) sim | 0.42 | 1.45 | 2.67 | 0.35 | 0.20 | 0.50 |
| DL NFL | 0.39 | 1.29 | 2.31 | 0.30 | 0.20 | 0.50 |
| DL sim | 0.35 | 0.96 | 1.25 | 0.45 | 0.30 | 0.20 |
| LB NFL | 0.33 | 1.29 | 2.60 | 0.40 | 0.20 | 0.40 |
| LB sim | 0.17 | 0.91 | 1.92 | 0.55 | 0.40 | 0.40 |

NFL linemen reach 0.5 yd/s by 0.10 s out of the stance; ours take 0.30.
The sim RB matches NFL at 1.0 s only by accident. He leaves 0.2 s early
(0.5 yd/s at 0.20 vs 0.40 s) and then accelerates too slowly (0.50 vs 0.30 s
ramp). The two errors cancel at 1.0 s.

## 2. Which term holds the lineman back

A per-tick probe (requested speed, achieved speed, get-off, contact, support
availability, per body) on the same plays:

| Term | Finding |
|---|---|
| Get-off | Not it. OL commands start at 0.02 s (snap count). DL start at 0.15 s (snap-reaction model), LB at 0.17 s. |
| Requested speed | Not it for OL. Steady request about 2.4 yd/s after a brief spike, against NFL OL speed at 1.0 s of 2.19 yd/s. |
| **Time constant / start force** | **Main term for the start.** The gait approached a wanted speed u as (u − v)/τ, so a guard who wants 2.4 yd/s starts with 2.4 / 7.6 of his legs' force. Free OL starts (not engaged by 1.0 s) cover 1.03 yd at 1.0 s; a 1-D rerun of their own requests under full start force gives 2.0. A lone guard asked for 2.4 yd/s covers 0.74 yd at 1.0 s (NFL OL 1.41). |
| Support state | Not it. Availability median 1.00 at 0.5 s. Stance (posture 0.7) costs about 5% of top speed through the pad-level effort term. |
| Contact (after 0.6 s) | Second, separate term. 61% of OL are engaged by 1.0 s, and engaged OL and DL both stall (sim speed at 1.0 s about 1.1-1.3 yd/s vs NFL 2.1-2.2). This is the remaining OL gap at 1.0-1.5 s after any start law. |

## 3. The law (commit `b4a6bcfe`, `src/physics/kinematics.ts`)

Starting is the low-speed end of the legs' force-velocity curve. At rest the
legs push with full start force whatever speed is wanted. That force falls
linearly to zero at the wanted speed instead of at top speed:

    a = (full / τ) · (1 − v / wanted) · fatigue · availability

Here full is the body's top speed in the direction pushed (vmax × directional
factor). In code this is the old propulsion term times full / wanted.

- **Per body, no shared constant.** Start force is the body's own vmax / τ:
  mass and leg force through his 10-split and 40. The approach time constant
  is τ · wanted / full (`gaitLag(profile, wanted)`).
- **A full request in any direction is the sprint curve unchanged.** From an
  upright posture, a sprint, a full shuffle, a full backpedal and a curve over
  3 s are bit-identical to develop. From a low stance the only difference is
  by design: the stance's top-speed cost no longer cuts start force.
- **The estimator follows the law.** `requestedSprintTime` uses τ ·
  wanted / full. Controllers that call `gaitLag(profile)` keep the full-request
  lag (unchanged); see open items.
- **Tests** (`test/start-force.test.ts`):
  - Moderate and full requests start equal.
  - Force falls to zero at the wanted speed and never exceeds the curve.
  - Start force is each body's own vmax / τ.
  - A lone guard reaches and holds 2.4 yd/s with no overshoot, at the time the
    estimator forecasts.

  All three fail on develop. `gait-facing-contract` and `pursuit-effort` pinned
  the old law's arithmetic and are updated to the new law. Below the cap, the
  start force now follows the hips' direction, as #297's `along` does.

Lone guard, 2.4 yd/s wanted: 0.74 → 1.40 yd at 1.0 s (NFL OL 1.41).

## 4. Results

Film, same seeds (develop → law; NFL):

| Runs | d 0.5 s | d 1.0 s | d 1.5 s | NFL d 0.5 / 1.0 / 1.5 |
|---|---|---|---|---|
| OL (non-pullers) | 0.27 → 0.40 | 0.86 → 1.13 | 1.34 → 1.66 | 0.45 / 1.41 / 2.48 |
| Pullers | 0.22 → 0.28 | 0.84 → 1.01 | 2.04 → 2.38 | 0.60 / 2.03 / 3.76 |
| Pullers with `PULL_STEP=1` | 0.25 → 0.32 | 0.99 → 1.34 | 2.17 → 2.83 | |
| RB (carrier) | 0.42 → 0.60 | 1.45 → 1.92 | 2.67 → 3.20 | 0.21 / 1.44 / 3.59 |
| DL | 0.35 → 0.35 | 0.96 → 0.91 | 1.25 → 1.29 | 0.39 / 1.29 / 2.31 |
| LB | 0.17 → 0.20 | 0.91 → 1.02 | 1.92 → 2.16 | 0.33 / 1.29 / 2.60 |

Matched restage, run-only captures (develop `55cc9e5` + #329 harness):
- 894 plays, each replayed on the captured stream and on 4 RNG-shifted
  streams; per-play means paired (`out/run/run-restage.ts`).
- Group distance changes (law − develop):
  - OL: +0.10 / +0.18 / +0.25 yd at 0.5 / 1.0 / 1.5 s.
  - Pullers: +0.05 / +0.17 / +0.28.
  - RB: +0.17 / +0.38 / +0.39.
  - TE: +0.07 / +0.16 / +0.22.
  - LB: +0.02 / +0.10 / +0.16.
  - DL: 0.00 / −0.05 / −0.01.
- All of these have SE ≤ 0.02, except +0.39 ± 0.01 and +0.28 ± 0.02.
- First carrier contact 0.10 ± 0.02 s earlier. Contact behind the LOS −0.01 ± 0.01.
- Yards +0.11 ± 0.26 (per-play SD across shifts is about 7 yd). Reported for
  context, not a target.

## 5. Why it is held

- **Backs past NFL.**
  - RB: 1.92 yd at 1.0 s against NFL 1.44.
  - Under the law his ramp from 0.5 to 2 yd/s is 0.30 s, exactly NFL's. The
    excess is the departure: he requests about 6 yd/s from 0.2 s, and NFL
    backs are not moving until 0.4 s.
  - That is the mesh/track controller's timing (Run Game). It is not the law.
- **Pass plays** (film, seeds 7/9; develop → law; NFL), distance at 1.0 s:
  - OL 0.83 → 0.97 (NFL 1.29). DL 1.70 → 1.78 (1.74). LB unchanged.
  - DB 0.83 → 1.05 (0.90); DB speed at 1.0 s 2.20 → 2.56 (1.92).
  - WR 2.49 → 2.75 (1.74). RB 1.21 → 1.67 (1.13). TE 1.78 → 2.04 (1.55).
  - Receivers and TEs were already past NFL at 0.5 s on develop: they release
    at once.
  - DBs now reach their requested drop speed, which is higher than NFL DBs move.
- **Default-game matched restage** (k = 1, seeds 7-10, 557 snaps; every snap
  changes):
  - Run +0.38 ± 1.09 yd/play, pass +0.55 ± 0.95, incompletions 121 → 117.
  - No material yardage change. Seed pairs swing −2.6 and +3.7 pass yd/play
    (±1.3), so any one pair misleads.
  - The pass-side concern is the mechanism above, not yards.
- **Pullers do not reach NFL** with or without `PULL_STEP`. What remains is
  the first 0.2 s: 0.5 yd/s at 0.30 s vs 0.10. A puller square to the line
  stepping straight back has backpedal force under this law (the hips'
  direction, as in #297's `along`).
  - A variant with direction-free start force gave pullers 0.40 / 1.30 / 2.76,
    and 0.46 / 1.64 / 3.24 with `PULL_STEP`.
  - That variant would hide a slow hip turn, so I did not take it. NFL guards
    open the hips with the first step. Here the yaw motor turns them at about
    6 rad/s, about 0.26 s for 90°.

## Test suite (commit `b4a6bcfe`; Node 22.22.0, `.nvmrc` pins 22.23.3)

- `npm run typecheck`: exit 0. `npm run build`: exit 0.
- `npm run test:integration`: 8 of 9. `protection-panel` (edge rushers
  blocked, rate bar 0.9 on 12 plays) fails.
- `npm test`: 3,460 passed, 44 failed.
  - **4 environmental:** `baseline-runner` ×3 and `film-pairs`, the Node
    version. The same on develop.
  - **1 defect, fixed in the follow-up commit:** `run-execution` "shoulder turn
    costs acceleration". The squeeze sat in effort, so the law gave its burst
    back. Squeeze now narrows the full force.
  - **2 contracts to re-examine before landing:**
    - `scenario-pack` redirect: the tackle rides the speed rusher 0.38 yd past
      the QB's depth, bar 0.5.
    - `world-physics` substep convergence: error still falls with refinement
      and the absolute gate passes, but the 32 → 64 step improves 0.81× against
      a 0.75× bar.
  - **37 recorded scenes or pinned traces whose play changed:** `called-motion`,
    `climb-access`, `combo-strike-access` ×5, `command-trace`,
    `cov7-abandonment` ×2, `cover3-cover2-rules` ×3, `coverage-rules`,
    `cutoff-surface`, `motion-clearance`, `pass-contact`,
    `pass-cutoff-approach` (P019, before #325), `planned-climb-fit` ×3,
    `possession-awareness`, `pursuit-prediction`, `qb-rusher-recording`,
    `quarters-trips-rules`, `responsibility-ledger` ×7, `run-hand-control` ×2,
    `spacing-forecast-reuse`, `zone-helper-check` ×2.
  - A gait change touches every below-cap request, so this is about #297's
    re-record cost. Each would be traced and re-recorded once if the law lands.

Film and restage numbers above are from `b4a6bcfe`. The squeeze fix changes
only bodies with a shoulder squeeze (carriers through a crease).

## Open items and owners

1. Decide: land the law together with the controller fixes it exposes, or hold.
   - RB departure timing (Run Game).
   - DB drop and backpedal request speeds (Coverage).
   - WR/TE release (whoever owns routes).
   - Each is "request as fast as the NFL player actually moves". None is physics.
2. Engaged stall (OL and DL at 1.0 s): the next physics term for linemen.
3. Puller hip turn on the open step: yaw/turn rate out of a stance (physics),
   after Run Game's `PULL_STEP` lands.
4. Planners that call `gaitLag(profile)` still forecast the full-request lag.
   If the law lands, give them the wanted speed (blocking.ts is Run Game's).
5. `run_film_reference.py` (#329) samples the sim 0.05 s late; fix before
   using its start or puller tables as a bar.

## 6. Update, same day: the start limit for backs and climbers (item (b))

Run Game measured that free climbers and backs reach about half their request.
Tanner made it a Main Engine item. Same position-only operator on NFL and sim
run film (`scripts/diag/accel_envelope.py`):
- acceleration vs speed;
- free running only: before the carrier's first contact, no opponent within
  1.5 yd;
- seeds 7/9, develop + #344 (back's mesh departure).

| Backs, accel median / p90 (yd/s²) | NFL | develop | + this law |
|---|---|---|---|
| 1-2 yd/s | 4.34 / 6.06 | 2.58 / 4.26 | 4.19 / 5.62 |
| 2-3 yd/s | 4.66 / 6.42 | 1.97 / 3.57 | 2.65 / 4.76 |
| 3-4 yd/s | 4.01 / 5.75 | 2.43 / 3.68 | 2.67 / 3.78 |

With the law, OL, LB, DB and WR are close to NFL at every speed. WR at
1-2 / 2-3 / 3-4 yd/s, median: NFL 4.28 / 4.16 / 3.45, law 5.55 / 4.91 / 3.54.

The per-tick probe (`scripts/diag/start-probe.ts`) explains the rest:
- **Backs.** The body delivers the plan (planned = achieved), and planned
  acceleration follows the law. Before the handoff, 39% of ticks at 2-4 yd/s
  request under 4.5 yd/s: the mesh tempo (Run Game). At requests of 6-8 yd/s
  the plan is 4.6 yd/s² at 2.6 yd/s, close to NFL's median.
- **Free climbers.** Planned acceleration rises 3.2 → 3.6 yd/s², but speed stays
  about 2.8 yd/s. The requested direction turns more than 1 rad/s on 41% of
  ticks (90th percentile 9.4 rad/s): the climb aim re-targets every decision
  (Run Game). A hip turned off the request is that redirect, not the body.

So the body's share of item (b) is this law. The rest is controller requests.

## 7. Landing: what the law moves (develop `1ec115c7` merged)

Restated contracts:
- **`pass-contact` anchor.** Cutting `power` weakens the end's brace, not his
  gait. His bull request now drives at full start force: 0.20 yd given in
  20 ticks (develop 0.05), against 0.51 for a clear drive advantage. The bar is
  now held < 0.25 and driven > 2 × held. Bounding the gait by leg strength
  instead was tried and rejected: it breaks the calibrated sprint integrator for
  the 4% of players whose sprint-start demand exceeds `pushForce`.
- **`world-physics` substep convergence.** The coarse 8/16 pair trades places
  (0.023 / 0.025; develop 0.033 / 0.016). e32 must beat both by half, and e64
  keeps improving.

Planner following the law:
- `motion.ts` `planMotion` used the old lag, so jets overran their snap point by
  1.5-2.2 yd. It now uses τ · wanted / full.

Re-recorded scenes:
- Each one's first divergence is a below-cap request starting at full force, and
  each contract was re-checked on the new play. Details are in the commit
  messages.
- Files: combo-strike-access, zone-helper-check, seal-hold, cutoff-surface,
  run-hand-control, the spacing-forecast reference, cover3-cover2-rules,
  coverage-rules, possession-awareness, command-trace, called-motion,
  responsibility-ledger.

Blockers (controllers the law exposes; not edited here):
1. **`planned-climb-fit`.** A tackle released one tick earlier still overlaps
   DE_S. Every detour fails the clearance check, so he brakes for a whole read
   and never occupies Mike (`assessClimbAccess`, Run Game).
2. **`protection-panel`.** On ace_12 vs Over the LT tracks his vertical-set
   point, which is 0.4 s ahead of the end plus 0.8 yd deeper. That keeps him a
   steady 2.2 yd away, never in punching range. Edges engaged drop 24/24 →
   17/24. On develop the tackle lagged the point, so the end ran into him
   (`blocking.ts` PassProtector).
3. **`cov7-abandonment`.** Its fixture play lost the corner's run support and
   the WR2 throw; the recipe is being re-recorded.

Environment-only in this container: `baseline-runner` and `film-pairs` (the
Node version), `saved-game-play` and `play-lab` (timeouts under load; they pass
alone).

## 8. Landing on develop `84af7d9e` (blockers cleared)

**Merge.** develop `84af7d9e` merged, with Coverage's COV-7 repair (#354).
- Two conflicting re-records: `combo-strike-access` and the
  `responsibility-ledger` named cases.
  - Both sides of the merge moved the same scenes.
  - The combined staging is re-scanned. Two new captures, on this branch, carry
    the ledger's "reread twice" and "tied first contact" features:
    `M25-P021` and `M25-P029`.

**Blocker 1, `planned-climb-fit`: cleared by the merge.**
- Develop's climb-off-hip change (#345) lets the released RT clear DE_S.
- He now occupies Mike before the runner arrives, so the execution test
  passes with no edit.
- The decision snapshots move one tick earlier: 1.20 far, 1.25 near.
- `climb-access` restates its load bound to 1.70. Y's climb is identical;
  LB_W sits 0.08 yd wider.

**Blocker 2, `protection-panel`: repaired, plus one exposed problem.**
- **The tackle's kick target ran away from the rusher.**
  - It led the end by his position 0.4 s ahead, plus 0.8 yd deeper. Against a
    fast end that is 2–3 yd in front of him.
  - Under develop's start law the tackle lagged that target, so the end ran
    into him. Under this law he holds it and never gets into punching range.
- **Fix:** PASS_KICK's depth now keeps 0.8 yd deeper than the end's present
  depth. Width still reads him a beat ahead.
- **Results:**
  - ace_12 panel: 17 → 20 of 24.
  - 8 games (seed 301), `scripts/diag/edge-rep.py`: edge reps unchanged.
    Engaged / free 71 / 19 → 70 / 20%; first contact 1.19 s (NFL 1.20).
- **The other 4 ace_12 misses: H releasing head-up into DE_S.**
  - The two push chest to chest to the end of the 3 s window.
  - DE_S is held, not free, but no blocker engages him.
  - This is KNOWN_PROBLEMS PRO-6. The ace_12 bar is 0.8 until it is fixed.
- **Tried and rejected:** letting a line receiver bend around a rusher
  (`clearLane`).
  - The panel passed, but unblocked edge pressures went 4 → 14 in 8 games.
  - Nobody picks up the end once H goes around (PRO-5).

**Blocker 3, `cov7-abandonment`:** Coverage's stricter fixture (#354). It
passes.

**Checks** (head `f03a708e`; Node 22.22.0, `.nvmrc` pins 22.23.3):
- `npm run typecheck`: exit 0. `npm run build`: exit 0.
- `npm test`: 3,550 passed, 4 failed. All 4 are the Node-version tests:
  `baseline-runner` ×3 and `film-pairs`.
- `npm run test:integration`: 10 of 10.

**Matched restage** (k = 1, default games, seeds 7-10, captured on develop
`84af7d9e`, 557 snaps, every snap changes):
- Run yards 5.92 → 6.27 per play.
- Pass yards 9.46 → 10.07 per play.
- Incompletions 123 → 108.
- These are in line with §5's earlier restage (+0.38 / +0.55). Reported for
  context, not as targets.
- Two runs end in "timeout" with 0 yd. Both are pre-snap defensive fouls:
  - An edge who anticipates the count was offside on develop, and the play
    ran.
  - Under the law his early start reaches the neutral-zone contact first, so
    it is a dead-ball encroachment.
