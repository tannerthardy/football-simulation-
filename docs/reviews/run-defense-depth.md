# Run defense depth and pursuit on the contact build (2026-10-21)

Branch `claude/zen-feynman-7712y8`, from `claude/run-game-v3@9932066` (accepted
develop `d91c9014` plus the [contact model](contact-model.md), pinned on). User
priority: "run defense depth and pursuit", the first item of the realism review
that followed #189. Ownership split agreed with the `claude/run-game-v3` session:
this branch owns the defense side of the run game (`run-fits.ts`, `defense.ts`,
pursuit, the defender side of run reps); that session owns blocking, pullers,
the mesh and the carrier. Every change here is a default-off flag; with every
flag off the engine is the pinned profile (lab baselines reproduce the contact
review's `cmF*` arms exactly: zone/gap/shotgun TVD 13.6 / 14.0 / 10.2).

## Question and answer

**Question.** Long runs are 6.6–7.8% of lab runs (NFL 0.8–2.0%) because, on the
plays that break the first level, nobody is behind the play and nobody arrives.
Does holding the deep defender deep (`DEEP_CAP`) fix that on the contact build,
and what else must change for it to help?

**Answer.**

1. **`DEEP_CAP` alone makes every set worse** (TVD zone 13.6 → 22.4, gap
   14.0 → 26.2, shotgun 10.2 → 17.4). It keeps the safety deep, but the 5–9 yd
   runs he used to stop become 10–19 yd runs and 40+ runs do not fall. In the
   sim the deep man makes 61% of the stops on 5–9 yd zone runs; in the NFL he
   makes 15%, and linebackers and linemen make half. The box has to make those
   stops before the cap can stay deep.
2. **`DEEP_CAP` had a hole at the mesh.** While the handoff is not yet seen,
   the cap fell through to the alley landmark (5–8 yd) and walked down, then
   back-pedalled to his alignment once he saw the handoff (two-high safeties
   12 → 10.7 → 11.4 yd; downhill −1.8 yd/s at the crossing, NFL +2.8).
   `CAP_MESH` holds the cap's depth through the mesh.
3. **With the front-seven pursuit flags, the cap works on zone.** `DEEP_CAP
   CAP_MESH LB_DEPTH EDGE_SQUEEZE SHED_PURSUE BLOCK_FRONT`: zone 40+ runs
   6.6 → 2.1% (79 → 25 of 1,200, p < 0.001; NFL 0.8%), negatives 15.3 → 9.8%
   (NFL 7.6), TVD 13.6 → 9.7. The cost is 10–19 yd runs at 13.8% (NFL 8.6).
4. **Gap schemes are limited by the pull, not the fit.** Gap linebackers flow
   0 to −0.8 yd by 2.5 s (NFL +2.5 playside, +4.6 backside) because they read
   the puller late — and the puller leaves 0.4–0.5 s later than an NFL puller
   (1 yd lateral at 1.1 s vs 0.7 s). Handed to the offense session.

GAP/GUN RESULTS PENDING

## Method

- **Lab arms** (`scripts/diag/open-field/arm.mjs`, pinned profile plus listed
  flags; manifests in [receipts](run-defense-depth/)): ace zone `ace_12`
  iz/oz/wz, 10 looks, 2 rosters, 10 seeds (1,200 plays); gap `i_pro_21`/`ace_12`
  power/counter/duo/trap, 5 seeds (1,600); shotgun zone `gun_doubles_11`, 5 seeds
  (600). Same cases and seeds in every arm; paired McNemar tests per threshold
  (`scripts/diag/stretch/paired.py`).
- **NFL reference:** 2022 Big Data Bowl tracking converted by
  `scripts/mechanics/nfl_bdb2025.py --plays-out` (5,462 runs), runs with 60+ yd
  to the goal ("NFL60", `scripts/mechanics/nfl_ytg.py`, new: the filter every
  tail operator reads had no producer in the repo). The conversion reproduces
  the committed NFL60 bands exactly.
- **Operators:** the existing stretch/open-field tools plus new
  `scripts/diag/depth/` tools, each one operator for NFL and sim common plays
  where both apply.
