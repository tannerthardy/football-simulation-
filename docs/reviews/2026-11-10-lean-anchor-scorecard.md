
> gridiron-engine@0.1.0 ref
> node scripts/ref.mjs npm run scorecard -- --games 16 --leagues 2 --seed 11 --splits none --arm ref:LEAN_PITCH=0,PASS_ANCHOR=0 --arm cand:LEAN_PITCH=1,PASS_ANCHOR=1

[ref] stack run-ref-12 @ 75674e8d

> gridiron-engine@0.1.0 scorecard
> node --import tsx scripts/scorecard/run.ts --games 16 --leagues 2 --seed 11 --splits none --arm ref:LEAN_PITCH=0,PASS_ANCHOR=0 --arm cand:LEAN_PITCH=1,PASS_ANCHOR=1

scorecard: 2 arm(s) × 16 games in 318 s elapsed, 4 concurrent workers (4 requested)
# Scorecard

Commit `75674e8d26b062e68979ab44be0d8185b49123c8` · 16 games per arm over 2 leagues · seed 11 · 2026-11-10

Rendering measurement SHA256: `bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b`. Tables use this checkout's metric definitions; producer metadata below is preserved.

Read this as a diagnosis. A band says where our football looks unrealistic; it does not decide whether a mechanism is correct. A stat that moves the wrong way usually points at another mechanism to fix next. Ranges are 90% intervals from resampling whole games; "moved" means the interval excludes zero. A dash means an unavailable measurement or no eligible denominator.

Rate counts are recorded events / eligible exposure; missing legacy counts remain unavailable. An observed 17/17 is 100%, not a certain future success rate: whole-game resampling can give a zero-width interval when every observed outcome is the same. These intervals do not rule out unobserved rare failures.

## Timing and provenance

Per-game ms is elapsed time around simulateGame only; it excludes roster generation, record/probe work and worker startup. Sums of worker elapsed times are not collection wall time or CPU time.

**producer**: commit `75674e8d26b062e68979ab44be0d8185b49123c8`; Node: v22.23.3; probes: missedBy, weird.

Workers requested: 4; peak concurrent worker processes: 4.

Collection elapsed: 318.0 s. CPU time: not collected in scorecard records.

- ref: 37.8 s elapsed per game; worker processes: 2
- cand: 39.0 s elapsed per game; worker processes: 2
- ref film weirdness detectors: 622 ms per game, 1.6% of the elapsed time (inside it, not extra)
- cand film weirdness detectors: 634 ms per game, 1.6% of the elapsed time (inside it, not extra)
- engineSha256: f9f6bf70742bed18fea191ed8e6cf9be2406666746d4354ad810002e57858c27
- measurementSha256: bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b
- lockfileSha256: cee32ba14d404c05dff4e8e3b4506bc1ea1e1afbfd40b35461511e7ff8fdb98f
- platform: linux
- arch: x64
- cpuModel: Intel(R) Xeon(R) Processor @ 2.10GHz
- cpuQuotaCores: unavailable
- execution: node --import tsx
- ref resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SNAP_TIME":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_REACH":false,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_CLOSURE":false,"GRASP_PATCH":true,"GRASP_SLIDE":false,"GRIP_HOLD":true,"GRIP_REACH":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HIP_BRACE":true,"HOLD_FINISH":true,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEAN_PITCH":false,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_ON_COUNT":false,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_ANCHOR":false,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRESS_MIRROR":false,"PRESS_RELEASE":false,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"QB_RHYTHM":false,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_HANDS":false,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_HORIZON":false,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TORSO_CAPSULE":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"UNDER_DEPTH":false,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WRAP_TWO_POINT":false,"WR_ALIGN":true,"WR_SNAP":false,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`
- cand resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SNAP_TIME":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_REACH":false,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_CLOSURE":false,"GRASP_PATCH":true,"GRASP_SLIDE":false,"GRIP_HOLD":true,"GRIP_REACH":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HIP_BRACE":true,"HOLD_FINISH":true,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEAN_PITCH":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_ON_COUNT":false,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_ANCHOR":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRESS_MIRROR":false,"PRESS_RELEASE":false,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"QB_RHYTHM":false,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_HANDS":false,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_HORIZON":false,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TORSO_CAPSULE":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"UNDER_DEPTH":false,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WRAP_TWO_POINT":false,"WR_ALIGN":true,"WR_SNAP":false,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`


## cand vs ref

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | ref | cand | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 36.09 | 40.34 | +4.25 | +0.44 to +8.28 | **moved** | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 67.09 | 66.28 | -0.81 | -2.50 to +1.31 | not resolved by this sample | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 476.56 | 531.78 | +55.22 | +11.17 to +101.51 | **moved** | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 67.3% (1444/2147) | 66.6% (1413/2121) | -0.6 | -3.2 to +1.4 | not resolved by this sample | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | HIGH |
| Completion % | 56.4% (736/1304) | 58.4% (747/1280) | +1.9 | -1.6 to +5.1 | not resolved by this sample | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 9.88 | 10.62 | +0.74 | -0.28 to +1.82 | not resolved by this sample | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 6.4% (93/1444) | 5.0% (71/1413) | -1.4 | -2.4 to -0.6 | **moved** | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | OK |
| INT rate | 4.4% (57/1304) | 4.7% (60/1280) | +0.3 | -1.3 to +1.8 | not resolved by this sample | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 9.1% (119/1304) | 9.5% (122/1280) | +0.4 | -1.0 to +1.6 | not resolved by this sample | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 15.1% (197/1304) | 17.3% (221/1280) | +2.2 | -0.4 to +4.4 | not resolved by this sample | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 9.68 | 9.58 | -0.10 | -0.55 to +0.34 | not resolved by this sample | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | HIGH |
| YAC / reception | 8.43 | 9.30 | +0.87 | -0.27 to +2.05 | not resolved by this sample | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.74 | 2.84 | +0.10 | +0.05 to +0.15 | **moved** | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | OK |
| Scramble rate | 2.5% (36/1444) | 4.1% (58/1413) | +1.6 | +0.7 to +2.5 | **moved** | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | OK |
| Separation at catch point (yd) | 3.37 | 3.25 | -0.12 | -0.29 to +0.04 | not resolved by this sample | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | HIGH |
| Rush yards / carry | 4.19 | 4.80 | +0.61 | +0.02 to +1.23 | **moved** | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | OK |
| Run stuff rate (<=0) | 10.4% (73/703) | 8.6% (61/708) | -1.8 | -5.8 to +1.6 | not resolved by this sample | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | LOW |
| 10+ yd runs | 7.8% (55/703) | 9.0% (64/708) | +1.2 | -0.8 to +3.2 | not resolved by this sample | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | OK |
| Runs of 20+ that reach 40 | 54.5% (6/11) | 62.5% (10/16) | +8.0 | -25.2 to +42.7 | not resolved by this sample | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | HIGH |
| Yards before contact (runs) | 0.97 | 1.23 | +0.26 | -0.01 to +0.50 | not resolved by this sample | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.27 | 0.25 | -0.02 | -0.06 to +0.02 | not resolved by this sample | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.16 | 0.16 | +0.00 | -0.03 to +0.04 | not resolved by this sample | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 33.8% (142/420) | 42.0% (177/421) | +8.2 | +1.2 to +13.8 | **moved** | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| FG % | 82.8% (48/58) | 88.9% (48/54) | +6.1 | -2.9 to +17.3 | not resolved by this sample | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| XP % | 95.2% (119/125) | 96.3% (131/136) | +1.1 | -1.7 to +4.7 | not resolved by this sample | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Fumbles lost / team-game | 0.75 | 0.56 | -0.19 | -0.53 to +0.19 | not resolved by this sample | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Punts / team-game | 5.19 | 4.09 | -1.09 | -1.88 to -0.28 | **moved** | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Accepted penalties / team-game | 5.78 | 5.47 | -0.31 | -0.94 to +0.28 | not resolved by this sample | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 100.0% (2/2) | 100.0% (17/17) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 94.4% (17/18) | 80.0% (12/15) | -14.4 | -30.0 to +4.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 82.4% (14/17) | 80.0% (12/15) | -2.4 | -22.2 to +15.3 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 71.4% (15/21) | 100.0% (7/7) | +28.6 | +13.6 to +45.8 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 46.10 | 44.72 | -1.38 | -2.73 to -0.26 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 41.39 | 40.05 | -1.35 | -2.67 to -0.07 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 25.52 | 24.15 | -1.37 | -3.23 to +0.61 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 8.05 | 8.40 | +0.36 | -1.91 to +3.06 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 25.3% (55/217) | 28.4% (67/236) | +3.0 | -5.0 to +13.3 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 1.8% (3/166) | 2.3% (3/131) | +0.5 | -2.2 to +3.5 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 5.7% (13/228) | 8.2% (16/196) | +2.5 | -0.9 to +6.2 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 60.9% (14/23) | 76.0% (19/25) | +15.1 | -0.9 to +31.3 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 13.2% (19/144) | 16.6% (27/163) | +3.4 | -0.9 to +7.3 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 15.03 | 14.34 | -0.69 | -1.66 to +0.38 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 2.27 | 2.76 | +0.49 | +0.21 to +0.76 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 65.8% (73/111) | 65.6% (84/128) | -0.1 | -6.6 to +5.2 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 2.53 | 2.44 | -0.09 | -0.81 to +0.59 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.03 | 0.04 | +0.01 | -0.00 to +0.02 | not resolved by this sample | internal |  |
| Missed tackles by LB / play | 0.04 | 0.03 | -0.00 | -0.01 to +0.00 | not resolved by this sample | internal |  |
| Missed tackles by CB / play | 0.02 | 0.02 | -0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by S / play | 0.02 | 0.01 | -0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.2% (counts unavailable) | 0.1% (counts unavailable) | -0.1 | -0.3 to +0.1 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.2 (3/1783) | 0.1 (1/1751) | -0.1 | -0.3 to +0.1 | not resolved by this sample | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.2 (2/893) | 0.1 (1/882) | -0.1 | -0.4 to +0.1 | not resolved by this sample | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | 0.0% (0/3) | 0.0% (0/1) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 17.4% (249/1427) | 16.8% (247/1470) | -0.6 | -2.3 to +1.2 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 20.8 (297/1427) | 20.2 (297/1470) | -0.6 | -3.2 to +1.8 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 62.3% (429/689) | 55.5% (386/695) | -6.7 | -11.2 to -2.3 | **moved** | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 129.0 (889/689) | 110.2 (766/695) | -18.8 | -31.8 to -6.6 | **moved** | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 2.2% (22990/1050330) | 1.9% (20349/1080100) | -0.3 | -0.5 to -0.1 | **moved** | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 50.7% (1089/2147) | 46.5% (987/2121) | -4.2 | -6.0 to -2.4 | **moved** | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 80.3 (1723/2147) | 74.7 (1584/2121) | -5.6 | -9.8 to -1.1 | **moved** | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 4.5% (234/5198) | 4.3% (228/5291) | -0.2 | -0.9 to +0.6 | not resolved by this sample | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 10.9 (234/2147) | 10.7 (228/2121) | -0.1 | -1.8 to +1.4 | not resolved by this sample | internal |  |
| Accepted penalties / team-game: block_in_back | 0.22 | 0.22 | +0.00 | -0.16 to +0.13 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.25 | 0.09 | -0.16 | -0.31 to -0.03 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.66 | 0.69 | +0.03 | -0.13 to +0.19 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: free_kick_short | 0.03 | 0.00 | -0.03 | -0.09 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 2.06 | 2.09 | +0.03 | -0.38 to +0.41 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 1.16 | 0.91 | -0.25 | -0.56 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_touching | 0.03 | 0.06 | +0.03 | -0.06 to +0.16 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 0.22 | 0.31 | +0.09 | -0.09 to +0.28 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.59 | 0.59 | +0.00 | -0.19 to +0.22 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.53 | 0.47 | -0.06 | -0.28 to +0.16 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.03 | 0.03 | +0.00 | -0.06 to +0.06 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## Watch these first

Read the clips, not the averages: each line is a place in a simulated game that a rule flagged. A rule says where to look, never what number is right, and several of its constants are chosen, not sourced (docs/VALIDATION.md). Ids with an `sc<seed>/` prefix are this run's own games, not the film room's: the full list is in the events file next to the saved card, and `npm run weird -- <seed>` plays the film-room games so its ids match `npm run replay`.

### ref

**Pre-snap teammate contact**: 3 events in 16 games

- sc11/G8-P018 @ -0.50 s (pre-snap) [representative detector tick -0.05 s]: RB and F touched before the snap (no motion called), closing 0 yd/s
- sc11/G9-P075 @ -2.05 s (pre-snap) [representative detector tick -1.70 s]: RB and H touched before the snap (jet Z motion), closing 0 yd/s
- sc11/G10-P168 @ -0.35 s (pre-snap): RB and H touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 297 events in 16 games

- sc11/G13-P040 @ 3.25 s [representative detector tick 4.15 s]: DE_S facing 158° from the runner (RB) at 2.3 yd for 1.50 s; asked for 158°
- sc11/G11-P071 @ 2.50 s [representative detector tick 2.85 s]: NB facing 158° from the runner (RB) at 3.4 yd for 1.45 s; asked for 159°
- sc11/G5-P126 @ 3.65 s [representative detector tick 4.05 s]: DE_W facing 131° from the runner (RB) at 3.4 yd for 1.35 s; asked for 131°

**Blocker on a man who is out of the play**: 889 events in 16 games

- sc11/G12-P090 @ 2.80 s [representative detector tick 5.85 s]: LT (run-block) on NB, 25.4 yd from the runner and moving away at 1.1 yd/s, while CB_S is free 0.6 yd from the runner, for 3.10 s
- sc11/G15-P157 @ 2.95 s [representative detector tick 5.80 s]: LT (run-block) on SS, 20.7 yd from the runner and moving away at 0.6 yd/s, while CB_S is free 2.6 yd from the runner, for 2.90 s
- sc11/G12-P090 @ 3.35 s [representative detector tick 5.85 s]: RT (run-block) on LB_M, 15.1 yd from the runner and moving away at 1.7 yd/s, while CB_S is free 0.6 yd from the runner, for 2.55 s

**Lineman backpedaling while facing his own backfield**: 1723 events in 16 games

- sc11/G5-P034 @ 1.90 s [representative detector tick 3.75 s]: RG facing 132° from downfield, moving back at 3.1 yd/s for 2.30 s (pass play)
- sc11/G11-P044 @ 3.00 s [representative detector tick 4.85 s]: LG facing 151° from downfield, moving back at 5.4 yd/s for 2.25 s (pass play)
- sc11/G1-P136 @ 1.95 s [representative detector tick 3.30 s]: LG facing 179° from downfield, moving back at 4.5 yd/s for 2.15 s (pass play)

**Sliding through a cut (candidate)**: 234 events in 16 games

- sc11/G16-P004 @ 4.80 s [representative detector tick 5.40 s]: LB_W turned 64° from 5.1 yd/s keeping 81% of his speed through the whole cut (NFL p90 for the role 80%); asked for a 66° turn
- sc11/G9-P069 @ 1.60 s [representative detector tick 2.20 s]: LB_W turned 60° from 4.4 yd/s keeping 89% of his speed through the whole cut (NFL p90 for the role 80%); asked for a 36° turn
- sc11/G9-P167 @ 1.10 s [representative detector tick 1.80 s]: LB_M turned 65° from 3.9 yd/s keeping 97% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 31° turn

**Free climber requesting near-zero movement (candidate)**: 5 events in 16 games

- sc11/G1-P042 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G16-P102 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic) [play nullified by a penalty]
- sc11/G6-P127 @ 0.45 s [representative detector tick 0.95 s]: LG (climb) free, requesting under 0.3 yd/s for 0.55 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 1 event in 16 games

- sc11/G3-P054 @ 2.75 s [representative detector tick 3.85 s]: SS trailing H within 1.51 yd through the recorded flight, body >157° from ball; arrival right-rear (-157°), turned 10° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 581 events in 16 games

- sc11/G2-P168 @ 1.80 s [representative detector tick 3.35 s]: RB travel -75° vs installed-aim bearing 79°; DE_S 0.02 yd ahead, 0.53 yd off heading (engaged true; geometry only)
- sc11/G4-P125 @ 2.00 s [representative detector tick 2.55 s]: RB travel 69° vs installed-aim bearing -57°; DT_S 0.02 yd ahead, 1.46 yd off heading (engaged true; geometry only)
- sc11/G12-P002 @ 1.90 s [representative detector tick 2.85 s]: RB travel -7° vs installed-aim bearing 71°; DE_W 0.51 yd ahead, 1.15 yd off heading (engaged false; geometry only)

### cand

**Pre-snap teammate contact**: 1 event in 16 games

- sc11/G1-P125 @ -0.60 s (pre-snap) [representative detector tick -0.10 s]: RB and F touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 297 events in 16 games

- sc11/G3-P118 @ 1.95 s [representative detector tick 3.60 s]: DE_S facing 170° from the runner (RB) at 2.2 yd for 1.70 s; asked for 169°
- sc11/G3-P151 @ 2.70 s [representative detector tick 4.25 s]: DE_S facing 158° from the runner (RB) at 2 yd for 1.60 s; asked for 158°
- sc11/G9-P156 @ 2.70 s [representative detector tick 4.15 s]: DE_W facing 157° from the runner (RB) at 2 yd for 1.50 s; asked for 157°

**Blocker on a man who is out of the play**: 766 events in 16 games

- sc11/G2-P122 @ 4.15 s [representative detector tick 7.70 s]: RG (run-block) on LB_M, 29.3 yd from the runner and moving away at 3 yd/s, while CB_S is free 0.5 yd from the runner, for 3.60 s
- sc11/G6-P044 @ 1.80 s [representative detector tick 5.05 s]: C (run-block) on DT_W, 10 yd from the runner and moving away at 0.8 yd/s, while NB is free 0.5 yd from the runner, for 3.30 s
- sc11/G2-P062 @ 1.75 s [representative detector tick 4.70 s]: RT (run-block) on NB, 12.3 yd from the runner and moving away at 2.5 yd/s, while SS is free 0.5 yd from the runner, for 3.00 s

**Lineman backpedaling while facing his own backfield**: 1584 events in 16 games

- sc11/G12-P192 @ 1.35 s [representative detector tick 2.45 s]: RT facing 149° from downfield, moving back at 3.7 yd/s for 2.30 s (pass play)
- sc11/G14-P082 @ 2.20 s [representative detector tick 2.85 s]: LG facing 153° from downfield, moving back at 2.8 yd/s for 2.25 s (run play)
- sc11/G10-P067 @ 1.70 s [representative detector tick 3.05 s]: RG facing 154° from downfield, moving back at 4.6 yd/s for 2.20 s (pass play) [play nullified by a penalty]

**Sliding through a cut (candidate)**: 228 events in 16 games

- sc11/G6-P050 @ 5.30 s [representative detector tick 5.90 s]: Y turned 69° from 4.9 yd/s keeping 84% of his speed through the whole cut (NFL p90 for the role 82%); asked for a 27° turn [play nullified by a penalty]
- sc11/G7-P190 @ 0.90 s [representative detector tick 1.80 s]: LB_W turned 63° from 4.1 yd/s keeping 87% of his speed through the whole cut (NFL p90 for the role 80%); asked for a 80° turn
- sc11/G7-P008 @ 1.30 s [representative detector tick 1.90 s]: LB_W turned 62° from 3.8 yd/s keeping 92% of his speed through the whole cut (NFL p90 for the role 80%); asked for a 83° turn

**Free climber requesting near-zero movement (candidate)**: 7 events in 16 games

- sc11/G6-P026 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G7-P058 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G15-P187 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 3 events in 16 games

- sc11/G12-P148 @ 2.65 s [representative detector tick 3.95 s]: LB_S trailing H within 0.91 yd through the recorded flight, body >123° from ball; arrival right-rear (-123°), turned 11° (not gaze evidence)
- sc11/G11-P072 @ 2.30 s [representative detector tick 3.55 s]: NB trailing H within 0.95 yd through the recorded flight, body >154° from ball; arrival right-rear (-177°), turned 6° (not gaze evidence)
- sc11/G3-P134 @ 2.00 s [representative detector tick 2.75 s]: CB_W trailing Z within 0.99 yd through the recorded flight, body >144° from ball; arrival left-rear (148°), turned 15° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 568 events in 16 games

- sc11/G16-P118 @ 1.90 s [representative detector tick 3.65 s]: RB travel -100° vs installed-aim bearing 60°; LB_W 0.14 yd ahead, 0.56 yd off heading (engaged true; geometry only)
- sc11/G8-P062 @ 1.75 s [representative detector tick 3.05 s]: RB travel -118° vs installed-aim bearing 67°; DT_S 0.01 yd ahead, 0.63 yd off heading (engaged true; geometry only)
- sc11/G13-P123 @ 1.80 s [representative detector tick 2.85 s]: RB travel -83° vs installed-aim bearing 75°; DT_S 0.03 yd ahead, 0.55 yd off heading (engaged true; geometry only)


## Largest estimated changes

- Total yards / team-game, all plays (n=32): 476.56 → 531.78
- 3rd-down conversion, all plays (n=421): 33.8% (142/420) → 42.0% (177/421)
- Points / team-game, all plays (n=32): 36.09 → 40.34
- Punts / team-game, all plays (n=32): 5.19 → 4.09
- Accepted penalties / team-game: encroachment, all plays (n=32): 0.25 → 0.09
- Rush yards / carry, all plays (n=708): 4.19 → 4.80
- Time to throw (s), all plays (n=1280): 2.74 → 2.84
- FG 50+ yd %, all plays (n=7): 71.4% (15/21) → 100.0% (7/7)
scorecard: film weirdness events -> out/scorecard/weird-events.json
