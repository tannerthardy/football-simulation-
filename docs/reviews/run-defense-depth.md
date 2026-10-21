# Run defense depth and pursuit on the contact build (2026-10-21)

Branch `claude/zen-feynman-7712y8`, from `claude/run-game-v3@9932066`: accepted
develop `d91c9014` plus the [contact model](contact-model.md), which is on in
the pinned profile. The user's priority was "run defense depth and pursuit",
the first item of the realism review that followed #189.

Ownership split, agreed with the `claude/run-game-v3` session:
- This branch owns the defense side of the run game: `run-fits.ts`,
  `defense.ts`, pursuit, and the defender side of run reps.
- That session owns blocking, pullers, the mesh and the carrier.

Every change here is a default-off flag. With every flag off the engine is
the pinned profile. The lab baselines reproduce the contact review's `cmF*`
arms exactly: TVD zone 13.6, gap 14.0, shotgun 10.2.

## Question and answer

**Question.** Long runs are 5–8% of lab runs (NFL 0.8–2.0%). On the plays that
break the first level, nobody is behind the play and nobody arrives. Does
holding the deep defender deep (`DEEP_CAP`) fix this on the contact build?
What else must change for it to help?

**Answer.**

1. **`DEEP_CAP` alone makes every set worse.** TVD goes zone 13.6 → 22.4,
   gap 14.0 → 26.2, shotgun 10.2 → 17.4.
   - It keeps the safety deep, but the 5–9 yd runs he used to stop become
     10–19 yd runs, and 40+ runs do not fall.
   - In the sim the deep man makes 61% of the stops on 5–9 yd zone runs. In
     the NFL he makes 15%; linebackers and linemen make half.
   - The box has to make those stops before the cap can stay deep.
2. **`DEEP_CAP` had a hole at the mesh.** Before the cap saw the handoff, his
   fit fell through to the alley landmark (5–8 yd), so he walked down. Once he
   saw the handoff, he back-pedalled to his alignment depth.
   - Two-high safeties went 12 → 10.7 → 11.4 yd.
   - At the crossing they were moving −1.8 yd/s downhill; the NFL playside
     safety moves +2.8.
   - The new flag `CAP_MESH` holds the cap's depth through the mesh.
3. **With the front-seven pursuit flags, the cap works on ace zone.** Package:
   `DEEP_CAP CAP_MESH LB_DEPTH EDGE_SQUEEZE SHED_PURSUE BLOCK_FRONT`.
   - 40+ runs 6.6 → 2.1% (79 → 25 of 1,200, p < 0.001; NFL 0.8%).
   - Negatives 15.3 → 9.8% (NFL 7.6). TVD 13.6 → 9.7.
   - Past +10, survival is now NFL-like (10→15 0.45, 15→20 0.56, 20→30 0.56;
     NFL 0.48 / 0.48 / 0.53).
   - The cost is 10–19 yd runs at 13.8% (NFL 8.6): 5→10 survival is 0.44
     (NFL 0.34).
4. **Gap and shotgun are limited by the front, not by depth.** The package
   cuts the gap tail (40+ 7.8 → 5.7%, p = 0.01) but piles runs into 10–19
   (25.6%, NFL 11.3). Shotgun gets worse (TVD 10.2 → 12.4). The missing
   tacklers are the front:
   - **Linemen near the hole do not get to the runner.** A free DL within 3 yd
     at the crossing reaches him 23–28% of the time (NFL 65%). He asks for
     8.1 yd/s and moves at 1.9, facing 60° away. That is the body's start-up
     and turn law. Handed to physics.
   - **Gap linebackers flow late or the wrong way** (−0.8 to +0.2 yd at 2.5 s;
     NFL +2.5 playside, +4.6 backside). They read the pull, but the puller
     leaves 0.4–0.5 s later than an NFL puller (1 yd lateral at 1.1 s vs 0.7).
     Handed to the offense session.

PENDING: PULL_FLOW, GAIT_STEP context, leave-one-out.

## Method

- **Lab arms** run through `scripts/diag/open-field/arm.mjs`: the pinned
  profile plus the listed flags. Manifests are in
  [receipts](run-defense-depth/). Same cases and seeds in every arm.
  - Ace zone: `ace_12` iz/oz/wz, 10 looks, 2 rosters, 10 seeds (1,200 plays).
  - Gap: `i_pro_21`/`ace_12` power/counter/duo/trap, 5 seeds (1,600).
  - Shotgun zone: `gun_doubles_11`, 5 seeds (600).
  - Paired McNemar tests per threshold: `scripts/diag/stretch/paired.py`.
- **NFL reference:** 2022 Big Data Bowl tracking (5,462 runs), converted by
  `scripts/mechanics/nfl_bdb2025.py --plays-out`.
  - "NFL60" means runs with 60+ yd to the goal. The filter comes from the new
    `scripts/mechanics/nfl_ytg.py`: every tail operator reads its output, but
    nothing in the repo produced it.
  - The conversion reproduces the committed NFL60 bands exactly.
- **Operators:** the existing stretch/open-field tools, plus new tools in
  `scripts/diag/depth/`. Where both apply, NFL and sim go through the same
  operator.
