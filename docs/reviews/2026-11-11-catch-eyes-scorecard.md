
> gridiron-engine@0.1.0 ref
> node scripts/ref.mjs npm run scorecard -- --games 16 --leagues 2 --seed 11 --splits none --arm ref:CATCH_EYES=0 --arm cand:CATCH_EYES=1

[ref] stack run-ref-18 @ 73b5cee4

> gridiron-engine@0.1.0 scorecard
> node --import tsx scripts/scorecard/run.ts --games 16 --leagues 2 --seed 11 --splits none --arm ref:CATCH_EYES=0 --arm cand:CATCH_EYES=1

scorecard: 2 arm(s) × 16 games in 286 s elapsed, 4 concurrent workers (4 requested)
# Scorecard

Commit `73b5cee4940f31a0e2586f68f95cc585be251578` · 16 games per arm over 2 leagues · seed 11 · 2026-11-11

Rendering measurement SHA256: `b1c00550b185328d154361a94b73aa5fec0dd3b36d517fd4c49f596e73c555c5`. Tables use this checkout's metric definitions; producer metadata below is preserved.

Read this as a diagnosis. A band says where our football looks unrealistic; it does not decide whether a mechanism is correct. A stat that moves the wrong way usually points at another mechanism to fix next. Ranges are 90% intervals from resampling whole games; "moved" means the interval excludes zero. A dash means an unavailable measurement or no eligible denominator.

Rate counts are recorded events / eligible exposure; missing legacy counts remain unavailable. An observed 17/17 is 100%, not a certain future success rate: whole-game resampling can give a zero-width interval when every observed outcome is the same. These intervals do not rule out unobserved rare failures.

## Timing and provenance

Per-game ms is elapsed time around simulateGame only; it excludes roster generation, record/probe work and worker startup. Sums of worker elapsed times are not collection wall time or CPU time.

**producer**: commit `73b5cee4940f31a0e2586f68f95cc585be251578`; Node: v22.23.3; probes: missedBy, weird.

Workers requested: 4; peak concurrent worker processes: 4.

Collection elapsed: 285.8 s. CPU time: not collected in scorecard records.

- ref: 34.9 s elapsed per game; worker processes: 2
- cand: 34.6 s elapsed per game; worker processes: 2
- ref film weirdness detectors: 578 ms per game, 1.7% of the elapsed time (inside it, not extra)
- cand film weirdness detectors: 579 ms per game, 1.7% of the elapsed time (inside it, not extra)
- engineSha256: ada0c6749f9a6c6321890698c70bfc4f295e229cd84c73b1cee7660c9896f14b
- measurementSha256: b1c00550b185328d154361a94b73aa5fec0dd3b36d517fd4c49f596e73c555c5
- lockfileSha256: cee32ba14d404c05dff4e8e3b4506bc1ea1e1afbfd40b35461511e7ff8fdb98f
- platform: linux
- arch: x64
- cpuModel: Intel(R) Xeon(R) Processor @ 2.10GHz
- cpuQuotaCores: unavailable
- execution: node --import tsx
- ref resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SWAP":true,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CATCH_EYES":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SNAP_TIME":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FIT_BLITZ_SLIDE":true,"FIT_TE_GAP":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARM_MOMENT":true,"GRASP_JEOPARDY":true,"GRASP_PATCH":true,"GRIP_HOLD":true,"GRIP_REACH":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"HANDS_CHEST":true,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HIP_BRACE":true,"HOLD_FINISH":true,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_HIP":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEAN_PITCH":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MAN_PHASE":false,"MESH_GUN_SIDE":true,"MESH_TEMPO":true,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_ON_COUNT":false,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_ANCHOR":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRESS_MIRROR":true,"PRESS_RELEASE":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"QB_FEEL":false,"QB_RHYTHM":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_HANDS":false,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RECEIVER_DEPTH":true,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TORSO_CAPSULE":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"WR_SNAP":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`
- cand resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SWAP":true,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CATCH_EYES":true,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SNAP_TIME":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FIT_BLITZ_SLIDE":true,"FIT_TE_GAP":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARM_MOMENT":true,"GRASP_JEOPARDY":true,"GRASP_PATCH":true,"GRIP_HOLD":true,"GRIP_REACH":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"HANDS_CHEST":true,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HIP_BRACE":true,"HOLD_FINISH":true,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_HIP":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEAN_PITCH":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MAN_PHASE":false,"MESH_GUN_SIDE":true,"MESH_TEMPO":true,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_ON_COUNT":false,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_ANCHOR":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRESS_MIRROR":true,"PRESS_RELEASE":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"QB_FEEL":false,"QB_RHYTHM":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_HANDS":false,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RECEIVER_DEPTH":true,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TORSO_CAPSULE":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"WR_SNAP":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`


## cand vs ref

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | ref | cand | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 35.28 | 33.22 | -2.06 | -6.34 to +2.25 | not resolved by this sample | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 66.69 | 66.75 | +0.06 | -1.28 to +1.38 | not resolved by this sample | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 493.85 | 458.04 | -35.81 | -67.43 to -2.79 | **moved** | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 65.1% (1389/2134) | 66.7% (1425/2136) | +1.6 | -0.7 to +3.9 | not resolved by this sample | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | HIGH |
| Completion % | 59.0% (773/1310) | 58.5% (773/1322) | -0.5 | -3.3 to +1.8 | not resolved by this sample | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 9.59 | 8.80 | -0.79 | -1.47 to -0.09 | **moved** | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 3.0% (42/1389) | 3.8% (54/1425) | +0.8 | -0.4 to +1.8 | not resolved by this sample | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | LOW |
| INT rate | 4.7% (62/1310) | 4.5% (60/1322) | -0.2 | -1.3 to +0.9 | not resolved by this sample | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 8.0% (105/1310) | 7.0% (93/1322) | -1.0 | -2.9 to +0.9 | not resolved by this sample | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 14.6% (191/1310) | 13.0% (172/1322) | -1.6 | -3.6 to +0.2 | not resolved by this sample | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 8.36 | 8.92 | +0.56 | +0.09 to +1.05 | **moved** | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | HIGH |
| YAC / reception | 8.05 | 7.04 | -1.01 | -1.87 to +0.01 | not resolved by this sample | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.81 | 2.81 | -0.01 | -0.05 to +0.02 | not resolved by this sample | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | OK |
| Scramble rate | 2.4% (34/1389) | 2.8% (40/1425) | +0.4 | -0.7 to +1.5 | not resolved by this sample | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | OK |
| Separation at catch point (yd) | 3.36 | 3.32 | -0.03 | -0.15 to +0.07 | not resolved by this sample | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | HIGH |
| Rush yards / carry | 4.34 | 4.44 | +0.10 | -0.22 to +0.45 | not resolved by this sample | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | OK |
| Run stuff rate (<=0) | 9.5% (71/745) | 9.0% (64/711) | -0.5 | -3.0 to +2.1 | not resolved by this sample | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | LOW |
| 10+ yd runs | 7.9% (59/745) | 7.2% (51/711) | -0.7 | -2.7 to +1.3 | not resolved by this sample | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | LOW |
| Runs of 20+ that reach 40 | 50.0% (7/14) | 53.8% (7/13) | +3.8 | -18.2 to +22.2 | not resolved by this sample | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | HIGH |
| Yards before contact (runs) | 1.05 | 1.12 | +0.07 | -0.07 to +0.22 | not resolved by this sample | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.23 | 0.24 | +0.00 | -0.02 to +0.03 | not resolved by this sample | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.14 | 0.14 | +0.01 | -0.01 to +0.02 | not resolved by this sample | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 42.5% (169/398) | 42.3% (177/418) | -0.1 | -4.8 to +5.4 | not resolved by this sample | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| FG % | 79.7% (47/59) | 89.7% (52/58) | +10.0 | +3.7 to +15.7 | **moved** | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| XP % | 93.4% (114/122) | 97.2% (106/109) | +3.8 | -0.4 to +8.4 | not resolved by this sample | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Fumbles lost / team-game | 0.59 | 0.66 | +0.06 | -0.28 to +0.34 | not resolved by this sample | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Punts / team-game | 3.72 | 4.28 | +0.56 | -0.06 to +1.19 | not resolved by this sample | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Accepted penalties / team-game | 5.72 | 5.22 | -0.50 | -1.31 to +0.22 | not resolved by this sample | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 92.9% (13/14) | 100.0% (16/16) | +7.1 | +0.0 to +17.6 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 94.4% (17/18) | 91.7% (11/12) | -2.8 | -16.7 to +14.3 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 73.3% (11/15) | 85.7% (18/21) | +12.4 | -1.8 to +30.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 50.0% (6/12) | 77.8% (7/9) | +27.8 | -2.1 to +66.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 45.36 | 45.51 | +0.15 | -1.18 to +1.36 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 40.28 | 40.12 | -0.16 | -2.09 to +1.57 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 24.26 | 25.83 | +1.58 | +0.24 to +2.82 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 9.22 | 9.06 | -0.16 | -3.06 to +2.23 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 28.4% (61/215) | 30.1% (63/209) | +1.8 | -2.7 to +7.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 1.7% (2/119) | 3.6% (5/137) | +2.0 | -1.5 to +5.9 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 9.7% (18/186) | 7.4% (15/203) | -2.3 | -7.3 to +1.9 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 48.4% (15/31) | 41.7% (10/24) | -6.7 | -23.6 to +11.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 13.4% (19/142) | 16.2% (21/130) | +2.8 | -2.8 to +6.8 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 13.88 | 13.84 | -0.03 | -0.78 to +0.75 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 2.46 | 2.32 | -0.14 | -0.36 to +0.08 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 61.0% (83/136) | 61.4% (70/114) | +0.4 | -8.4 to +8.4 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 2.56 | 2.59 | +0.03 | -0.38 to +0.41 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.02 | 0.03 | +0.01 | -0.00 to +0.02 | not resolved by this sample | internal |  |
| Missed tackles by LB / play | 0.04 | 0.04 | -0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by CB / play | 0.02 | 0.02 | -0.00 | -0.01 to +0.00 | not resolved by this sample | internal |  |
| Missed tackles by S / play | 0.01 | 0.01 | +0.00 | -0.00 to +0.01 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.2% (counts unavailable) | 0.1% (counts unavailable) | -0.1 | -0.2 to +0.0 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.2 (3/1790) | 0.1 (1/1761) | -0.1 | -0.2 to +0.0 | not resolved by this sample | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.2 (2/913) | 0.1 (1/866) | -0.1 | -0.3 to +0.0 | not resolved by this sample | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | 0.0% (0/3) | 0.0% (0/1) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 17.4% (261/1503) | 18.0% (270/1501) | +0.6 | -1.5 to +2.7 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 20.2 (303/1503) | 22.9 (344/1501) | +2.8 | -0.4 to +5.0 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 59.9% (436/728) | 60.4% (427/707) | +0.5 | -2.6 to +3.6 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 120.6 (878/728) | 128.7 (910/707) | +8.1 | -1.9 to +18.7 | not resolved by this sample | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 1.9% (19763/1065555) | 2.0% (21162/1067570) | +0.1 | +0.0 to +0.2 | **moved** | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 47.1% (1006/2134) | 47.8% (1022/2136) | +0.7 | -1.1 to +2.9 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 71.8 (1533/2134) | 74.8 (1598/2136) | +3.0 | -1.1 to +6.8 | not resolved by this sample | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 4.7% (254/5408) | 4.1% (230/5597) | -0.6 | -1.4 to +0.1 | not resolved by this sample | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 11.9 (254/2134) | 10.8 (230/2136) | -1.1 | -3.1 to +0.9 | not resolved by this sample | internal |  |
| Accepted penalties / team-game: block_in_back | 0.25 | 0.16 | -0.09 | -0.28 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.31 | 0.22 | -0.09 | -0.28 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.72 | 0.72 | +0.00 | -0.19 to +0.19 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 1.63 | 1.44 | -0.19 | -0.63 to +0.19 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 1.47 | 1.25 | -0.22 | -0.81 to +0.28 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_touching | 0.03 | 0.00 | -0.03 | -0.09 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 0.31 | 0.22 | -0.09 | -0.31 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.44 | 0.50 | +0.06 | -0.16 to +0.31 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.50 | 0.47 | -0.03 | -0.28 to +0.22 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.03 | 0.16 | +0.13 | +0.00 to +0.25 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: unnecessary_roughness | 0.03 | 0.09 | +0.06 | +0.00 to +0.13 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## Watch these first

Read the clips, not the averages: each line is a place in a simulated game that a rule flagged. A rule says where to look, never what number is right, and several of its constants are chosen, not sourced (docs/VALIDATION.md). Ids with an `sc<seed>/` prefix are this run's own games, not the film room's: the full list is in the events file next to the saved card, and `npm run weird -- <seed>` plays the film-room games so its ids match `npm run replay`.

### ref

**Pre-snap teammate contact**: 3 events in 16 games

- sc11/G8-P031 @ -0.45 s (pre-snap) [representative detector tick -0.05 s]: RB and F touched before the snap (no motion called), closing 0 yd/s
- sc11/G9-P056 @ -1.80 s (pre-snap) [representative detector tick -1.70 s]: RB and H touched before the snap (jet Z motion), closing 0 yd/s
- sc11/G10-P166 @ -0.50 s (pre-snap) [representative detector tick -0.35 s]: RB and H touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 303 events in 16 games

- sc11/G7-P108 @ 2.85 s: DE_W facing 120° from the runner (RB) at 3.5 yd for 1.90 s; asked for 120°
- sc11/G4-P099 @ 2.40 s [representative detector tick 3.95 s]: DE_S facing 159° from the runner (RB) at 1.2 yd for 1.65 s; asked for 166°
- sc11/G1-P042 @ 2.30 s: DE_W facing 126° from the runner (RB) at 2.3 yd for 1.55 s; asked for 126°

**Blocker on a man who is out of the play**: 878 events in 16 games

- sc11/G8-P021 @ 1.55 s [representative detector tick 4.15 s]: LT (run-block) on DE_W, 15.2 yd from the runner and moving away at 3.4 yd/s, while DT_S is free 2.6 yd from the runner, for 2.65 s
- sc11/G8-P021 @ 1.55 s [representative detector tick 4.15 s]: LG (run-block) on DE_W, 15.2 yd from the runner and moving away at 3.4 yd/s, while DT_S is free 2.6 yd from the runner, for 2.65 s
- sc11/G5-P103 @ 2.40 s [representative detector tick 4.95 s]: LG (run-block) on LB_W, 25.2 yd from the runner and moving away at 2 yd/s, while CB_S is free 0.5 yd from the runner, for 2.60 s

**Lineman backpedaling while facing his own backfield**: 1533 events in 16 games

- sc11/G11-P049 @ 1.50 s [representative detector tick 2.50 s]: LT facing 139° from downfield, moving back at 3.4 yd/s for 2.25 s (pass play)
- sc11/G16-P064 @ 1.15 s [representative detector tick 2.35 s]: RT facing 145° from downfield, moving back at 4.6 yd/s for 2.20 s (pass play)
- sc11/G1-P163 @ 1.15 s [representative detector tick 2.60 s]: LG facing 152° from downfield, moving back at 3.5 yd/s for 2.15 s (pass play)

**Sliding through a cut (candidate)**: 254 events in 16 games

- sc11/G2-P138 @ 2.80 s [representative detector tick 3.50 s]: H turned 69° from 4.3 yd/s keeping 94% of his speed through the whole cut (NFL p90 for the role 76%); asked for a 29° turn
- sc11/G1-P174 @ 2.50 s [representative detector tick 3.30 s]: X turned 61° from 4.4 yd/s keeping 87% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 35° turn
- sc11/G16-P156 @ 3.50 s [representative detector tick 4.10 s]: FS turned 64° from 3.9 yd/s keeping 97% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 5° turn

**Free climber requesting near-zero movement (candidate)**: 8 events in 16 games

- sc11/G1-P064 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G6-P025 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G16-P085 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic) [play nullified by a penalty]

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 0 events in 16 games

- none

**Runner leaves installed aim toward a nearby defender (candidate)**: 560 events in 16 games

- sc11/G2-P107 @ 1.90 s [representative detector tick 3.35 s]: RB travel -16° vs installed-aim bearing -63°; DE_S 0.04 yd ahead, 1.09 yd off heading (engaged true; geometry only)
- sc11/G5-P022 @ 2.70 s [representative detector tick 2.75 s]: RB travel 73° vs installed-aim bearing -65°; DT_S 0.01 yd ahead, 1.34 yd off heading (engaged true; geometry only) [play nullified by a penalty]
- sc11/G6-P036 @ 1.80 s [representative detector tick 3.05 s]: RB travel -81° vs installed-aim bearing 62°; DT_W 0 yd ahead, 0.89 yd off heading (engaged true; geometry only)

### cand

**Pre-snap teammate contact**: 1 event in 16 games

- sc11/G10-P123 @ -1.50 s (pre-snap): Z and H touched before the snap (across Z motion), closing 1.05 yd/s [play nullified by a penalty]
- sc11/G10-P162 @ -0.60 s (pre-snap) [representative detector tick -0.45 s]: RB and H touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 344 events in 16 games

- sc11/G3-P006 @ 2.30 s [representative detector tick 4.00 s]: DE_S facing 128° from the runner (RB) at 1.9 yd for 1.75 s; asked for 128°
- sc11/G5-P042 @ 2.10 s [representative detector tick 3.45 s]: DE_S facing 124° from the runner (RB) at 3.3 yd for 1.40 s; asked for 3° [play nullified by a penalty]
- sc11/G3-P006 @ 2.45 s [representative detector tick 2.70 s]: CB_W facing 180° from the runner (RB) at 2.9 yd for 1.35 s; asked for 176°

**Blocker on a man who is out of the play**: 910 events in 16 games

- sc11/G14-P062 @ 2.10 s [representative detector tick 5.50 s]: H (run-block) on NB, 11.2 yd from the runner and moving away at 2.8 yd/s, while DE_W is free 0.8 yd from the runner, for 3.45 s
- sc11/G11-P104 @ 2.65 s [representative detector tick 5.25 s]: Y (run-block) on SS, 8.8 yd from the runner and moving away at 1.9 yd/s, while CB_W is free 2.9 yd from the runner, for 2.65 s
- sc11/G10-P123 @ 2.10 s [representative detector tick 4.60 s]: RT (run-block) on LB_W, 24.6 yd from the runner and moving away at 1.3 yd/s, while CB_W is free 0.5 yd from the runner, for 2.55 s [play nullified by a penalty]

**Lineman backpedaling while facing his own backfield**: 1598 events in 16 games

- sc11/G16-P167 @ 1.85 s [representative detector tick 3.15 s]: LG facing 158° from downfield, moving back at 4.9 yd/s for 2.70 s (pass play)
- sc11/G16-P161 @ 1.65 s [representative detector tick 2.50 s]: LT facing 140° from downfield, moving back at 5.1 yd/s for 2.25 s (pass play)
- sc11/G5-P184 @ 1.60 s [representative detector tick 2.65 s]: RT facing 134° from downfield, moving back at 4.2 yd/s for 2.25 s (pass play)

**Sliding through a cut (candidate)**: 230 events in 16 games

- sc11/G5-P027 @ 1.40 s [representative detector tick 2.00 s]: NB turned 62° from 3.9 yd/s keeping 97% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 27° turn
- sc11/G15-P003 @ 2.00 s [representative detector tick 2.60 s]: RB turned 62° from 3.9 yd/s keeping 90% of his speed through the whole cut (NFL p90 for the role 90%); asked for a 29° turn
- sc11/G16-P183 @ 6.10 s [representative detector tick 6.70 s]: NB turned 62° from 3.9 yd/s keeping 89% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 6° turn

**Free climber requesting near-zero movement (candidate)**: 5 events in 16 games

- sc11/G6-P016 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G16-P180 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G6-P016 @ 0.45 s [representative detector tick 0.95 s]: LG (climb) free, requesting under 0.3 yd/s for 0.55 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 2 events in 16 games

- sc11/G9-P130 @ 2.40 s [representative detector tick 3.35 s]: LB_W trailing Y within 0.6 yd through the recorded flight, body >138° from ball; arrival left-rear (138°), turned 21° (not gaze evidence)
- sc11/G9-P169 @ 2.30 s [representative detector tick 3.05 s]: SS trailing H within 1.58 yd through the recorded flight, body >144° from ball; arrival left-rear (144°), turned 2° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 587 events in 16 games

- sc11/G1-P160 @ 2.10 s [representative detector tick 3.30 s]: RB travel 84° vs installed-aim bearing -84°; DE_S 0 yd ahead, 1.22 yd off heading (engaged true; geometry only)
- sc11/G13-P174 @ 2.30 s [representative detector tick 3.85 s]: RB travel 100° vs installed-aim bearing -27°; DT_S 0.08 yd ahead, 0.69 yd off heading (engaged true; geometry only) [play nullified by a penalty]
- sc11/G14-P063 @ 2.10 s [representative detector tick 3.70 s]: RB travel 117° vs installed-aim bearing -61°; DE_S 0.12 yd ahead, 1.45 yd off heading (engaged true; geometry only)


## Largest estimated changes

- FG %, all plays (n=58): 79.7% (47/59) → 89.7% (52/58)
- Total yards / team-game, all plays (n=32): 493.85 → 458.04
- aDOT, all plays (n=1304): 8.36 → 8.92
- Yards / attempt, all plays (n=1322): 9.59 → 8.80
- OL facing own backfield and moving back (% of OL frames), all plays (n=1067570): 1.9% (19763/1065555) → 2.0% (21162/1067570)
- Kickoff return average (recorded yards), all plays (n=146): 24.26 → 25.83
scorecard: film weirdness events -> out/scorecard/weird-events.json
