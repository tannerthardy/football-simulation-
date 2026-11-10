
> gridiron-engine@0.1.0 ref
> node scripts/ref.mjs npm run scorecard -- --games 16 --leagues 2 --seed 13 --splits none --arm ref:READ_LEAN=0 --arm lean:READ_LEAN=1

[ref] stack run-ref-9 @ 2d3cfb46

> gridiron-engine@0.1.0 scorecard
> node --import tsx scripts/scorecard/run.ts --games 16 --leagues 2 --seed 13 --splits none --arm ref:READ_LEAN=0 --arm lean:READ_LEAN=1

scorecard: 2 arm(s) × 16 games in 354 s elapsed, 4 concurrent workers (4 requested)
# Scorecard

Commit `2d3cfb4649fc57ca8df792acbc53f20d0afebebf` · 16 games per arm over 2 leagues · seed 13 · 2026-11-10

Rendering measurement SHA256: `bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b`. Tables use this checkout's metric definitions; producer metadata below is preserved.

Read this as a diagnosis. A band says where our football looks unrealistic; it does not decide whether a mechanism is correct. A stat that moves the wrong way usually points at another mechanism to fix next. Ranges are 90% intervals from resampling whole games; "moved" means the interval excludes zero. A dash means an unavailable measurement or no eligible denominator.

Rate counts are recorded events / eligible exposure; missing legacy counts remain unavailable. An observed 17/17 is 100%, not a certain future success rate: whole-game resampling can give a zero-width interval when every observed outcome is the same. These intervals do not rule out unobserved rare failures.

## Timing and provenance

Per-game ms is elapsed time around simulateGame only; it excludes roster generation, record/probe work and worker startup. Sums of worker elapsed times are not collection wall time or CPU time.

**producer**: commit `2d3cfb4649fc57ca8df792acbc53f20d0afebebf`; Node: v22.23.3; probes: missedBy, weird.

Workers requested: 4; peak concurrent worker processes: 4.

Collection elapsed: 353.5 s. CPU time: not collected in scorecard records.

- ref: 43.0 s elapsed per game; worker processes: 2
- lean: 43.4 s elapsed per game; worker processes: 2
- ref film weirdness detectors: 691 ms per game, 1.6% of the elapsed time (inside it, not extra)
- lean film weirdness detectors: 712 ms per game, 1.6% of the elapsed time (inside it, not extra)
- engineSha256: 4c97815feb85265f880c58db12f51ca58e098cabbd7e8da233b32cb2753c04ea
- measurementSha256: bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b
- lockfileSha256: cee32ba14d404c05dff4e8e3b4506bc1ea1e1afbfd40b35461511e7ff8fdb98f
- platform: linux
- arch: x64
- cpuModel: Intel(R) Xeon(R) Processor @ 2.10GHz
- cpuQuotaCores: unavailable
- execution: node --import tsx
- ref resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_PATCH":false,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":false,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"UNDER_DEPTH":false,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`
- lean resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_PATCH":false,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"UNDER_DEPTH":false,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`


## lean vs ref

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | ref | lean | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 41.25 | 41.41 | +0.16 | -4.47 to +5.09 | not resolved by this sample | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 67.53 | 68.13 | +0.59 | -2.25 to +3.41 | not resolved by this sample | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 520.70 | 524.49 | +3.80 | -29.92 to +34.93 | not resolved by this sample | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 69.8% (1508/2161) | 69.1% (1506/2180) | -0.7 | -3.7 to +2.1 | not resolved by this sample | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | HIGH |
| Completion % | 59.1% (806/1363) | 58.6% (791/1350) | -0.5 | -3.9 to +2.9 | not resolved by this sample | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 10.63 | 10.46 | -0.17 | -0.90 to +0.70 | not resolved by this sample | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 7.1% (107/1508) | 7.2% (109/1506) | +0.1 | -0.8 to +1.2 | not resolved by this sample | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | OK |
| INT rate | 4.5% (62/1363) | 4.8% (65/1350) | +0.3 | -1.1 to +1.5 | not resolved by this sample | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 10.6% (145/1363) | 10.0% (135/1350) | -0.6 | -2.1 to +0.8 | not resolved by this sample | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 18.3% (250/1363) | 17.8% (240/1350) | -0.6 | -2.6 to +1.5 | not resolved by this sample | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 9.90 | 10.00 | +0.10 | -0.25 to +0.51 | not resolved by this sample | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | HIGH |
| YAC / reception | 8.78 | 8.59 | -0.19 | -1.01 to +0.58 | not resolved by this sample | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.78 | 2.76 | -0.02 | -0.04 to +0.01 | not resolved by this sample | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | OK |
| Scramble rate | 2.1% (31/1508) | 2.5% (38/1506) | +0.5 | -0.6 to +1.8 | not resolved by this sample | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | OK |
| Separation at catch point (yd) | 3.27 | 3.39 | +0.12 | -0.04 to +0.26 | not resolved by this sample | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | HIGH |
| Rush yards / carry | 4.40 | 4.80 | +0.40 | -0.04 to +0.85 | not resolved by this sample | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | OK |
| Run stuff rate (<=0) | 14.2% (93/653) | 12.8% (86/674) | -1.5 | -4.3 to +1.3 | not resolved by this sample | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | LOW |
| 10+ yd runs | 10.6% (69/653) | 10.1% (68/674) | -0.5 | -2.5 to +1.5 | not resolved by this sample | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | OK |
| Runs of 20+ that reach 40 | 53.8% (7/13) | 42.1% (8/19) | -11.7 | -35.1 to +8.9 | not resolved by this sample | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | HIGH |
| Yards before contact (runs) | 0.83 | 0.97 | +0.14 | -0.14 to +0.40 | not resolved by this sample | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.31 | 0.29 | -0.03 | -0.05 to -0.00 | **moved** | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.16 | 0.16 | -0.01 | -0.02 to +0.01 | not resolved by this sample | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 40.7% (174/427) | 40.5% (164/405) | -0.3 | -5.1 to +4.2 | not resolved by this sample | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| FG % | 79.4% (50/63) | 78.1% (50/64) | -1.2 | -13.2 to +10.4 | not resolved by this sample | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | LOW |
| XP % | 97.9% (138/141) | 93.8% (135/144) | -4.1 | -8.7 to -0.2 | **moved** | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | LOW |
| Fumbles lost / team-game | 0.56 | 0.63 | +0.06 | -0.28 to +0.41 | not resolved by this sample | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Punts / team-game | 4.34 | 4.06 | -0.28 | -1.06 to +0.53 | not resolved by this sample | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Accepted penalties / team-game | 5.44 | 5.78 | +0.34 | -0.31 to +0.97 | not resolved by this sample | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 100.0% (16/16) | 100.0% (15/15) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 100.0% (9/9) | 84.2% (16/19) | -15.8 | -27.8 to -4.8 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 68.2% (15/22) | 55.6% (10/18) | -12.6 | -35.7 to +12.5 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 62.5% (10/16) | 75.0% (9/12) | +12.5 | -11.8 to +39.4 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 47.05 | 47.16 | +0.11 | -1.39 to +1.50 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 40.23 | 41.93 | +1.70 | -0.24 to +3.87 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 26.24 | 23.85 | -2.40 | -4.47 to -0.58 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 11.22 | 10.80 | -0.43 | -3.63 to +3.27 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 27.7% (67/242) | 31.6% (77/244) | +3.9 | -2.5 to +9.4 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 4.3% (6/139) | 1.5% (2/130) | -2.8 | -5.8 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 6.8% (14/207) | 8.9% (18/202) | +2.1 | -0.6 to +5.4 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 70.8% (17/24) | 50.0% (12/24) | -20.8 | -38.3 to -3.3 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 14.5% (24/166) | 14.8% (25/169) | +0.3 | -3.2 to +3.6 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 15.19 | 14.94 | -0.25 | -1.53 to +0.97 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 2.64 | 2.62 | -0.02 | -0.40 to +0.31 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 65.6% (86/131) | 63.4% (78/123) | -2.2 | -12.9 to +6.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 2.56 | 2.66 | +0.09 | -0.66 to +0.88 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.03 | 0.03 | -0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by LB / play | 0.05 | 0.04 | -0.02 | -0.03 to -0.00 | **moved** | internal |  |
| Missed tackles by CB / play | 0.02 | 0.02 | -0.00 | -0.01 to +0.00 | not resolved by this sample | internal |  |
| Missed tackles by S / play | 0.02 | 0.01 | -0.00 | -0.01 to -0.00 | **moved** | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.3% (counts unavailable) | 0.3% (counts unavailable) | +0.1 | -0.2 to +0.3 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.3 (5/1802) | 0.3 (6/1793) | +0.1 | -0.2 to +0.3 | not resolved by this sample | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.4 (4/891) | 0.6 (5/875) | +0.1 | -0.3 to +0.5 | not resolved by this sample | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | 0.0% (0/5) | 0.0% (0/6) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 17.8% (252/1419) | 18.6% (271/1456) | +0.9 | -1.3 to +3.8 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 22.6 (320/1419) | 22.8 (332/1456) | +0.3 | -2.9 to +3.3 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 58.2% (365/627) | 60.3% (398/660) | +2.1 | -1.0 to +5.0 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 119.0 (746/627) | 126.1 (832/660) | +7.1 | -1.2 to +15.5 | not resolved by this sample | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 2.1% (23170/1088780) | 2.1% (23670/1101215) | +0.0 | -0.1 to +0.2 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 49.8% (1077/2161) | 51.8% (1129/2180) | +2.0 | -0.6 to +4.3 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 80.1 (1730/2161) | 83.3 (1816/2180) | +3.2 | -2.4 to +9.2 | not resolved by this sample | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 4.6% (244/5354) | 4.5% (250/5523) | -0.0 | -0.8 to +0.6 | not resolved by this sample | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 11.3 (244/2161) | 11.5 (250/2180) | +0.2 | -1.8 to +2.0 | not resolved by this sample | internal |  |
| Accepted penalties / team-game: block_in_back | 0.34 | 0.28 | -0.06 | -0.34 to +0.16 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.28 | 0.28 | +0.00 | -0.16 to +0.16 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.69 | 0.78 | +0.09 | -0.03 to +0.22 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: free_kick_short | 0.03 | 0.00 | -0.03 | -0.09 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 1.44 | 1.94 | +0.50 | +0.03 to +0.97 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 0.72 | 0.69 | -0.03 | -0.34 to +0.28 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_touching | 0.06 | 0.06 | +0.00 | -0.09 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 0.56 | 0.38 | -0.19 | -0.47 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.47 | 0.50 | +0.03 | -0.19 to +0.25 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.66 | 0.66 | +0.00 | -0.25 to +0.28 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.06 | 0.22 | +0.16 | +0.06 to +0.25 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: unnecessary_roughness | 0.13 | 0.00 | -0.13 | -0.31 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## Watch these first

Read the clips, not the averages: each line is a place in a simulated game that a rule flagged. A rule says where to look, never what number is right, and several of its constants are chosen, not sourced (docs/VALIDATION.md). Ids with an `sc<seed>/` prefix are this run's own games, not the film room's: the full list is in the events file next to the saved card, and `npm run weird -- <seed>` plays the film-room games so its ids match `npm run replay`.

### ref

**Pre-snap teammate contact**: 5 events in 16 games

- sc13/G3-P168 @ -0.45 s (pre-snap) [representative detector tick -0.15 s]: RB and H touched before the snap (no motion called), closing 0 yd/s
- sc13/G5-P156 @ -0.40 s (pre-snap) [representative detector tick -0.05 s]: RB and F touched before the snap (no motion called), closing 0 yd/s
- sc13/G12-P022 @ -0.45 s (pre-snap) [representative detector tick -0.15 s]: RB and H touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 320 events in 16 games

- sc13/G15-P108 @ 2.75 s: DE_S facing 121° from the runner (RB) at 3.7 yd for 1.80 s; asked for 121°
- sc13/G14-P005 @ 2.75 s: DE_S facing 171° from the runner (RB) at 1.5 yd for 1.75 s; asked for 111°
- sc13/G13-P060 @ 2.70 s [representative detector tick 2.80 s]: DE_W facing 124° from the runner (RB) at 3.1 yd for 1.75 s; asked for 124°

**Blocker on a man who is out of the play**: 746 events in 16 games

- sc13/G5-P083 @ 3.75 s [representative detector tick 7.30 s]: LG (run-block) on LB_M, 44.8 yd from the runner and moving away at 2.5 yd/s, while FS is free 0.5 yd from the runner, for 3.60 s
- sc13/G16-P023 @ 2.25 s [representative detector tick 5.45 s]: RT (run-block) on LB_W, 21.8 yd from the runner and moving away at 3.7 yd/s, while FS is free 0.5 yd from the runner, for 3.25 s
- sc13/G16-P023 @ 2.25 s [representative detector tick 5.45 s]: C (run-block) on LB_W, 21.8 yd from the runner and moving away at 3.7 yd/s, while FS is free 0.5 yd from the runner, for 3.25 s

**Lineman backpedaling while facing his own backfield**: 1730 events in 16 games

- sc13/G12-P143 @ 1.60 s [representative detector tick 2.20 s]: LG facing 178° from downfield, moving back at 4.3 yd/s for 2.25 s (pass play)
- sc13/G7-P114 @ 1.65 s [representative detector tick 2.85 s]: LG facing 151° from downfield, moving back at 4.8 yd/s for 2.05 s (pass play)
- sc13/G13-P098 @ 3.45 s [representative detector tick 5.45 s]: LG facing 164° from downfield, moving back at 4.5 yd/s for 2.05 s (pass play)

**Sliding through a cut (candidate)**: 244 events in 16 games

- sc13/G5-P052 @ 4.90 s [representative detector tick 5.50 s]: SS turned 60° from 5.1 yd/s keeping 87% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 25° turn
- sc13/G2-P130 @ 1.10 s [representative detector tick 1.70 s]: NB turned 63° from 4.3 yd/s keeping 99% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 71° turn
- sc13/G5-P047 @ 2.30 s [representative detector tick 2.90 s]: CB_S turned 63° from 3.9 yd/s keeping 95% of his speed through the whole cut (NFL p90 for the role 89%); asked for a 81° turn

**Free climber requesting near-zero movement (candidate)**: 6 events in 16 games

- sc13/G4-P146 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc13/G10-P156 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 1.17 yd/s (review braking/traffic)
- sc13/G12-P067 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 2 events in 16 games

- sc13/G10-P015 @ 2.20 s [representative detector tick 3.25 s]: SS trailing H within 1.11 yd through the recorded flight, body >149° from ball; arrival right-rear (-163°), turned 24° (not gaze evidence)
- sc13/G6-P059 @ 2.95 s [representative detector tick 3.95 s]: LB_M trailing H within 1.86 yd through the recorded flight, body >129° from ball; arrival left-rear (129°), turned 4° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 520 events in 16 games

- sc13/G3-P041 @ 2.70 s [representative detector tick 4.30 s]: RB travel -174° vs installed-aim bearing -85°; LB_M 0.05 yd ahead, 0.75 yd off heading (engaged false; geometry only)
- sc13/G13-P070 @ 1.60 s [representative detector tick 3.00 s]: RB travel -42° vs installed-aim bearing -84°; DT_W 0.08 yd ahead, 0.9 yd off heading (engaged true; geometry only) [play nullified by a penalty]
- sc13/G12-P127 @ 2.05 s [representative detector tick 2.85 s]: RB travel 63° vs installed-aim bearing -79°; DE_S 0.12 yd ahead, 0.85 yd off heading (engaged true; geometry only)

### lean

**Pre-snap teammate contact**: 6 events in 16 games

- sc13/G1-P159 @ -0.40 s (pre-snap) [representative detector tick -0.30 s]: RB and F touched before the snap (no motion called), closing 0 yd/s
- sc13/G5-P068 @ -0.35 s (pre-snap): RB and F touched before the snap (no motion called), closing 0 yd/s
- sc13/G5-P154 @ -0.45 s (pre-snap) [representative detector tick -0.10 s]: RB and F touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 332 events in 16 games

- sc13/G8-P013 @ 2.20 s [representative detector tick 2.75 s]: DE_S facing 168° from the runner (RB) at 1.3 yd for 1.90 s; asked for 167°
- sc13/G12-P016 @ 2.30 s [representative detector tick 2.65 s]: LB_M facing 153° from the runner (RB) at 2.7 yd for 1.85 s; asked for 154°
- sc13/G8-P076 @ 2.15 s [representative detector tick 3.75 s]: DE_S facing 173° from the runner (RB) at 2.6 yd for 1.65 s; asked for 173° [play nullified by a penalty]

**Blocker on a man who is out of the play**: 832 events in 16 games

- sc13/G10-P007 @ 1.95 s [representative detector tick 5.05 s]: Y (run-block) on LB_M, 24.6 yd from the runner and moving away at 2.6 yd/s, while FS is free 0.5 yd from the runner, for 3.15 s
- sc13/G3-P012 @ 2.15 s [representative detector tick 5.00 s]: RT (climb) on LB_M, 14.4 yd from the runner and moving away at 0.5 yd/s, while SS is free 0.5 yd from the runner, for 2.90 s
- sc13/G4-P138 @ 2.55 s [representative detector tick 5.35 s]: RT (run-block) on LB_M, 20 yd from the runner and moving away at 3.8 yd/s, while CB_S is free 0.4 yd from the runner, for 2.85 s

**Lineman backpedaling while facing his own backfield**: 1816 events in 16 games

- sc13/G9-P119 @ 1.45 s [representative detector tick 2.90 s]: C facing 178° from downfield, moving back at 4.1 yd/s for 2.70 s (pass play)
- sc13/G3-P122 @ 1.20 s [representative detector tick 2.35 s]: RG facing 171° from downfield, moving back at 3.8 yd/s for 2.35 s (pass play) [play nullified by a penalty]
- sc13/G16-P075 @ 1.40 s [representative detector tick 2.55 s]: RT facing 140° from downfield, moving back at 4.4 yd/s for 2.15 s (pass play)

**Sliding through a cut (candidate)**: 250 events in 16 games

- sc13/G13-P121 @ 5.20 s [representative detector tick 5.80 s]: H turned 62° from 5.8 yd/s keeping 76% of his speed through the whole cut (NFL p90 for the role 76%); asked for a 15° turn
- sc13/G2-P169 @ 5.20 s [representative detector tick 5.80 s]: CB_S turned 62° from 4.4 yd/s keeping 100% of his speed through the whole cut (NFL p90 for the role 89%); asked for a 36° turn
- sc13/G4-P131 @ 0.90 s [representative detector tick 1.50 s]: RB turned 64° from 4 yd/s keeping 95% of his speed through the whole cut (NFL p90 for the role 90%); asked for a 54° turn

**Free climber requesting near-zero movement (candidate)**: 6 events in 16 games

- sc13/G4-P060 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc13/G16-P076 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc13/G16-P076 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 2 events in 16 games

- sc13/G7-P048 @ 2.30 s [representative detector tick 3.45 s]: CB_S trailing X within 1.21 yd through the recorded flight, body >151° from ball; arrival right-rear (-170°), turned 6° (not gaze evidence)
- sc13/G5-P026 @ 2.25 s [representative detector tick 3.35 s]: NB trailing H within 1.17 yd through the recorded flight, body >143° from ball; arrival left-rear (152°), turned 18° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 532 events in 16 games

- sc13/G2-P151 @ 2.25 s [representative detector tick 3.45 s]: RB travel 90° vs installed-aim bearing -81°; DT_S 0.25 yd ahead, 1.08 yd off heading (engaged false; geometry only)
- sc13/G3-P085 @ 1.80 s [representative detector tick 3.10 s]: RB travel -18° vs installed-aim bearing -83°; LB_W 0.09 yd ahead, 0.77 yd off heading (engaged false; geometry only)
- sc13/G8-P021 @ 1.95 s [representative detector tick 2.10 s]: RB travel 66° vs installed-aim bearing -26°; DT_S 0.09 yd ahead, 1.16 yd off heading (engaged true; geometry only)


## Largest estimated changes

- Accepted penalties / team-game: roughing_passer, all plays (n=32): 0.06 → 0.22
- XP %, all plays (n=144): 97.9% (138/141) → 93.8% (135/144)
- Missed + broken tackles / play, all plays (n=2180): 0.31 → 0.29
- Accepted penalties / team-game: holding, all plays (n=32): 1.44 → 1.94
- Missed tackles by LB / play, all plays (n=2180): 0.05 → 0.04
- Fourth-down conversion % (all official attempts), all plays (n=24): 70.8% (17/24) → 50.0% (12/24)
- Missed tackles by S / play, all plays (n=2180): 0.02 → 0.01
- FG 30–39 yd %, all plays (n=19): 100.0% (9/9) → 84.2% (16/19)
scorecard: film weirdness events -> out/scorecard/weird-events.json
