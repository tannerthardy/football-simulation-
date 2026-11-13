
> gridiron-engine@0.1.0 ref
> node scripts/ref.mjs npm run scorecard -- --games 16 --leagues 2 --seed 11 --splits none --arm ref:HANDS_CHEST=0 --arm chest:HANDS_CHEST=1

[ref] stack run-ref-8 @ 59f53e6d

> gridiron-engine@0.1.0 scorecard
> node --import tsx scripts/scorecard/run.ts --games 16 --leagues 2 --seed 11 --splits none --arm ref:HANDS_CHEST=0 --arm chest:HANDS_CHEST=1

scorecard: 2 arm(s) × 16 games in 351 s elapsed, 4 concurrent workers (4 requested)
# Scorecard

Commit `59f53e6dd6128dcef43c11a0fb3fe2291826cd1a` · 16 games per arm over 2 leagues · seed 11 · 2026-11-10

Rendering measurement SHA256: `bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b`. Tables use this checkout's metric definitions; producer metadata below is preserved.

Read this as a diagnosis. A band says where our football looks unrealistic; it does not decide whether a mechanism is correct. A stat that moves the wrong way usually points at another mechanism to fix next. Ranges are 90% intervals from resampling whole games; "moved" means the interval excludes zero. A dash means an unavailable measurement or no eligible denominator.

Rate counts are recorded events / eligible exposure; missing legacy counts remain unavailable. An observed 17/17 is 100%, not a certain future success rate: whole-game resampling can give a zero-width interval when every observed outcome is the same. These intervals do not rule out unobserved rare failures.

## Timing and provenance

Per-game ms is elapsed time around simulateGame only; it excludes roster generation, record/probe work and worker startup. Sums of worker elapsed times are not collection wall time or CPU time.

**producer**: commit `59f53e6dd6128dcef43c11a0fb3fe2291826cd1a`; Node: v22.23.3; probes: missedBy, weird.

Workers requested: 4; peak concurrent worker processes: 4.

Collection elapsed: 351.2 s. CPU time: not collected in scorecard records.

- ref: 42.9 s elapsed per game; worker processes: 2
- chest: 42.1 s elapsed per game; worker processes: 2
- ref film weirdness detectors: 769 ms per game, 1.8% of the elapsed time (inside it, not extra)
- chest film weirdness detectors: 745 ms per game, 1.8% of the elapsed time (inside it, not extra)
- engineSha256: 9a349ccac7d8533a74ce5868285ac7f0d8cfccb2786c232d6070b6aebe4b42b3
- measurementSha256: bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b
- lockfileSha256: cee32ba14d404c05dff4e8e3b4506bc1ea1e1afbfd40b35461511e7ff8fdb98f
- platform: linux
- arch: x64
- cpuModel: Intel(R) Xeon(R) Processor @ 2.10GHz
- cpuQuotaCores: unavailable
- execution: node --import tsx
- ref resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":false,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TOUCH_READ":true,"TURF_MU_SCALE":1,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`
- chest resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":false,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TOUCH_READ":true,"TURF_MU_SCALE":1,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`


## chest vs ref

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | ref | chest | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 36.94 | 36.53 | -0.41 | -4.84 to +4.16 | not resolved by this sample | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 67.63 | 65.84 | -1.78 | -3.38 to -0.28 | **moved** | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 485.02 | 472.17 | -12.84 | -58.47 to +28.86 | not resolved by this sample | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 68.2% (1476/2164) | 66.0% (1390/2107) | -2.2 | -4.4 to +0.5 | not resolved by this sample | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | OK |
| Completion % | 54.9% (720/1311) | 57.2% (708/1238) | +2.3 | -0.3 to +4.4 | not resolved by this sample | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 9.88 | 10.08 | +0.20 | -0.68 to +1.09 | not resolved by this sample | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 7.4% (109/1476) | 7.7% (107/1390) | +0.3 | -1.1 to +1.8 | not resolved by this sample | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | OK |
| INT rate | 4.2% (55/1311) | 4.3% (53/1238) | +0.1 | -1.8 to +1.7 | not resolved by this sample | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 8.4% (110/1311) | 8.5% (105/1238) | +0.1 | -1.6 to +1.7 | not resolved by this sample | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 17.2% (225/1311) | 16.3% (202/1238) | -0.8 | -2.8 to +1.0 | not resolved by this sample | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 9.74 | 9.53 | -0.21 | -0.55 to +0.13 | not resolved by this sample | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | HIGH |
| YAC / reception | 9.45 | 8.91 | -0.53 | -1.75 to +1.00 | not resolved by this sample | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.74 | 2.78 | +0.04 | -0.01 to +0.09 | not resolved by this sample | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | OK |
| Scramble rate | 2.8% (42/1476) | 2.6% (36/1390) | -0.3 | -1.1 to +0.6 | not resolved by this sample | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | OK |
| Separation at catch point (yd) | 3.32 | 3.32 | -0.01 | -0.21 to +0.22 | not resolved by this sample | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | HIGH |
| Rush yards / carry | 4.70 | 4.59 | -0.11 | -0.78 to +0.69 | not resolved by this sample | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | OK |
| Run stuff rate (<=0) | 15.3% (105/688) | 15.1% (108/717) | -0.2 | -3.4 to +2.7 | not resolved by this sample | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | LOW |
| 10+ yd runs | 9.2% (63/688) | 9.3% (67/717) | +0.2 | -2.8 to +2.7 | not resolved by this sample | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | OK |
| Runs of 20+ that reach 40 | 45.0% (9/20) | 62.5% (10/16) | +17.5 | -5.4 to +47.1 | not resolved by this sample | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | HIGH |
| Yards before contact (runs) | 0.57 | 1.01 | +0.44 | +0.18 to +0.75 | **moved** | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.31 | 0.28 | -0.03 | -0.06 to +0.00 | not resolved by this sample | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.17 | 0.16 | -0.01 | -0.04 to +0.02 | not resolved by this sample | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 33.6% (145/431) | 38.0% (162/426) | +4.4 | -0.3 to +8.5 | not resolved by this sample | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| FG % | 87.1% (61/70) | 93.9% (62/66) | +6.8 | +0.6 to +12.2 | **moved** | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| XP % | 94.2% (113/120) | 98.4% (123/125) | +4.2 | +1.1 to +7.4 | **moved** | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Fumbles lost / team-game | 0.84 | 0.53 | -0.31 | -0.59 to -0.03 | **moved** | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Punts / team-game | 5.28 | 4.69 | -0.59 | -1.25 to +0.06 | not resolved by this sample | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Accepted penalties / team-game | 6.44 | 5.88 | -0.56 | -1.59 to +0.41 | not resolved by this sample | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 100.0% (10/10) | 100.0% (12/12) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 100.0% (21/21) | 95.2% (20/21) | -4.8 | -15.8 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 87.5% (21/24) | 94.1% (16/17) | +6.6 | -2.3 to +16.2 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 60.0% (9/15) | 87.5% (14/16) | +27.5 | +8.3 to +45.0 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 46.41 | 45.63 | -0.78 | -2.25 to +0.67 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 41.36 | 40.18 | -1.18 | -3.35 to +0.95 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 25.34 | 24.29 | -1.05 | -3.02 to +0.95 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 8.32 | 8.89 | +0.57 | -2.22 to +3.05 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 31.3% (72/230) | 32.2% (73/227) | +0.9 | -3.6 to +6.5 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 3.0% (5/169) | 2.7% (4/150) | -0.3 | -2.5 to +2.1 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 5.0% (12/239) | 7.7% (17/222) | +2.6 | -1.8 to +7.9 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 42.3% (11/26) | 51.9% (14/27) | +9.5 | -17.2 to +32.3 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 14.8% (21/142) | 10.7% (15/140) | -4.1 | -7.8 to +0.2 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 15.59 | 14.34 | -1.25 | -2.16 to -0.09 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 2.23 | 2.40 | +0.17 | -0.09 to +0.41 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 54.2% (58/107) | 60.7% (68/112) | +6.5 | -6.3 to +20.4 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 2.56 | 2.22 | -0.34 | -1.09 to +0.31 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.04 | 0.04 | +0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by LB / play | 0.05 | 0.05 | -0.00 | -0.02 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by CB / play | 0.02 | 0.02 | +0.00 | -0.00 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by S / play | 0.01 | 0.01 | -0.00 | -0.01 to +0.00 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.2% (counts unavailable) | 0.3% (counts unavailable) | +0.1 | -0.1 to +0.3 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.2 (4/1811) | 0.3 (6/1774) | +0.1 | -0.0 to +0.3 | not resolved by this sample | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.2 (2/916) | 0.4 (4/898) | +0.2 | +0.0 to +0.5 | **moved** | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | 0.0% (0/4) | 0.0% (0/6) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 18.8% (267/1424) | 19.2% (275/1435) | +0.4 | -1.9 to +3.1 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 23.6 (336/1424) | 24.3 (348/1435) | +0.7 | -3.2 to +4.2 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 54.1% (367/679) | 59.7% (425/712) | +5.6 | +2.1 to +8.8 | **moved** | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 108.0 (733/679) | 122.6 (873/712) | +14.7 | +3.7 to +24.9 | **moved** | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 2.4% (26155/1080570) | 2.1% (22267/1053515) | -0.3 | -0.5 to -0.1 | **moved** | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 54.0% (1169/2164) | 48.2% (1015/2107) | -5.8 | -8.1 to -3.9 | **moved** | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 90.4 (1956/2164) | 78.2 (1648/2107) | -12.2 | -19.6 to -5.8 | **moved** | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 4.4% (226/5119) | 4.2% (215/5145) | -0.2 | -0.9 to +0.2 | not resolved by this sample | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 10.4 (226/2164) | 10.2 (215/2107) | -0.2 | -1.5 to +0.8 | not resolved by this sample | internal |  |
| Accepted penalties / team-game: block_in_back | 0.34 | 0.13 | -0.22 | -0.38 to -0.06 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.25 | 0.06 | -0.19 | -0.34 to -0.06 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.78 | 0.59 | -0.19 | -0.41 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: free_kick_short | 0.03 | 0.00 | -0.03 | -0.09 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 2.38 | 2.25 | -0.13 | -0.75 to +0.50 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 0.75 | 1.00 | +0.25 | -0.03 to +0.59 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_touching | 0.06 | 0.00 | -0.06 | -0.13 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 0.53 | 0.44 | -0.09 | -0.31 to +0.13 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.56 | 0.81 | +0.25 | +0.03 to +0.50 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.66 | 0.53 | -0.13 | -0.41 to +0.13 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.06 | 0.03 | -0.03 | -0.13 to +0.06 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: unnecessary_roughness | 0.03 | 0.03 | +0.00 | +0.00 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## Watch these first

Read the clips, not the averages: each line is a place in a simulated game that a rule flagged. A rule says where to look, never what number is right, and several of its constants are chosen, not sourced (docs/VALIDATION.md). Ids with an `sc<seed>/` prefix are this run's own games, not the film room's: the full list is in the events file next to the saved card, and `npm run weird -- <seed>` plays the film-room games so its ids match `npm run replay`.

### ref

**Pre-snap teammate contact**: 4 events in 16 games

- sc11/G5-P097 @ -4.75 s (pre-snap) [representative detector tick -4.25 s]: RB and F touched before the snap (across H motion), closing 0 yd/s
- sc11/G8-P038 @ -0.55 s (pre-snap) [representative detector tick -0.20 s]: RB and F touched before the snap (no motion called), closing 0 yd/s
- sc11/G10-P176 @ -1.80 s (pre-snap) [representative detector tick -1.20 s]: RB and H touched before the snap (jet Z motion), closing 0 yd/s

**Defender turned away from a nearby runner**: 336 events in 16 games

- sc11/G11-P036 @ 3.00 s [representative detector tick 5.20 s]: DE_W facing 177° from the runner (RB) at 1.6 yd for 2.50 s; asked for 179°
- sc11/G7-P079 @ 2.00 s [representative detector tick 2.70 s]: NB facing 148° from the runner (RB) at 3.4 yd for 2.00 s; asked for 148°
- sc11/G11-P024 @ 3.15 s: DE_W facing 125° from the runner (RB) at 1.6 yd for 1.90 s; asked for 126°

**Blocker on a man who is out of the play**: 733 events in 16 games

- sc11/G15-P104 @ 4.35 s [representative detector tick 9.45 s]: C (run-block) on LB_W, 28.7 yd from the runner and moving away at 2.2 yd/s, while SS is free 0.5 yd from the runner, for 5.15 s
- sc11/G15-P104 @ 4.35 s [representative detector tick 9.45 s]: H (stalk) on LB_W, 28.7 yd from the runner and moving away at 2.2 yd/s, while SS is free 0.5 yd from the runner, for 5.15 s
- sc11/G3-P121 @ 3.80 s [representative detector tick 7.95 s]: X (run-block) on CB_S, 21.3 yd from the runner and moving away at 2 yd/s, while DE_S is free 0.5 yd from the runner, for 4.20 s

**Lineman backpedaling while facing his own backfield**: 1956 events in 16 games

- sc11/G4-P016 @ 1.60 s [representative detector tick 2.60 s]: RG facing 168° from downfield, moving back at 4.4 yd/s for 2.85 s (pass play)
- sc11/G2-P047 @ 2.00 s [representative detector tick 3.45 s]: LG facing 162° from downfield, moving back at 4.6 yd/s for 2.40 s (pass play)
- sc11/G4-P103 @ 1.65 s [representative detector tick 2.90 s]: LG facing 154° from downfield, moving back at 4.9 yd/s for 2.15 s (pass play)

**Sliding through a cut (candidate)**: 226 events in 16 games

- sc11/G14-P139 @ 3.30 s [representative detector tick 3.90 s]: CB_S turned 63° from 4.2 yd/s keeping 100% of his speed through the whole cut (NFL p90 for the role 89%); asked for a 75° turn
- sc11/G12-P007 @ 4.30 s [representative detector tick 4.90 s]: Z turned 68° from 4.1 yd/s keeping 99% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 45° turn
- sc11/G13-P028 @ 3.60 s [representative detector tick 4.20 s]: FS turned 61° from 4 yd/s keeping 100% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 11° turn

**Free climber requesting near-zero movement (candidate)**: 7 events in 16 games

- sc11/G3-P116 @ 0.20 s [representative detector tick 0.80 s]: RT (climb) free, requesting under 0.3 yd/s for 0.80 s; achieved 0 yd/s (review braking/traffic)
- sc11/G4-P095 @ 0.20 s [representative detector tick 0.80 s]: RT (climb) free, requesting under 0.3 yd/s for 0.80 s; achieved 0 yd/s (review braking/traffic) [play nullified by a penalty]
- sc11/G6-P018 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 7 events in 16 games

- sc11/G15-P176 @ 2.15 s [representative detector tick 3.60 s]: DB trailing H within 1.14 yd through the recorded flight, body >129° from ball; arrival right-rear (-129°), turned 17° (not gaze evidence)
- sc11/G14-P139 @ 2.55 s [representative detector tick 3.90 s]: LB_M trailing H within 1.2 yd through the recorded flight, body >154° from ball; arrival right-rear (-167°), turned 25° (not gaze evidence)
- sc11/G6-P041 @ 2.20 s [representative detector tick 3.35 s]: NB trailing Y within 1.4 yd through the recorded flight, body >133° from ball; arrival left-rear (133°), turned 13° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 585 events in 16 games

- sc11/G7-P050 @ 1.95 s [representative detector tick 3.85 s]: RB travel 83° vs installed-aim bearing -85°; DE_W 0.07 yd ahead, 1.08 yd off heading (engaged true; geometry only)
- sc11/G10-P148 @ 2.40 s [representative detector tick 3.00 s]: RB travel 61° vs installed-aim bearing -13°; DT_S 0.31 yd ahead, 1.38 yd off heading (engaged true; geometry only)
- sc11/G5-P093 @ 1.80 s [representative detector tick 3.00 s]: RB travel 72° vs installed-aim bearing -77°; DT_W 0.12 yd ahead, 1.48 yd off heading (engaged true; geometry only)

### chest

**Pre-snap teammate contact**: 6 events in 16 games

- sc11/G5-P099 @ -4.85 s (pre-snap) [representative detector tick -4.10 s]: RB and F touched before the snap (across H motion), closing 0 yd/s
- sc11/G6-P072 @ -0.05 s (pre-snap): Y and H touched before the snap (no motion called), closing 0 yd/s
- sc11/G8-P023 @ -0.35 s (pre-snap) [representative detector tick -0.10 s]: RB and F touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 348 events in 16 games

- sc11/G12-P051 @ 2.55 s: DE_W facing 120° from the runner (RB) at 3.6 yd for 1.85 s; asked for 120°
- sc11/G2-P178 @ 2.65 s: DE_W facing 132° from the runner (RB) at 3.2 yd for 1.70 s; asked for 146°
- sc11/G16-P037 @ 2.85 s [representative detector tick 3.15 s]: CB_S facing 157° from the runner (RB) at 2.3 yd for 1.35 s; asked for 156°

**Blocker on a man who is out of the play**: 873 events in 16 games

- sc11/G6-P005 @ 2.60 s [representative detector tick 6.95 s]: Y (run-block) on SS, 18.3 yd from the runner and moving away at 2.4 yd/s, while LB_W is free 1.4 yd from the runner, for 4.40 s
- sc11/G5-P060 @ 1.95 s [representative detector tick 6.00 s]: H (run-block) on NB, 10.9 yd from the runner and moving away at 3.1 yd/s, while CB_S is free 0.5 yd from the runner, for 4.10 s
- sc11/G14-P123 @ 5.90 s [representative detector tick 8.65 s]: Y (run-block) on NB, 9 yd from the runner and moving away at 1.1 yd/s, while DE_S is free 2 yd from the runner, for 3.60 s

**Lineman backpedaling while facing his own backfield**: 1648 events in 16 games

- sc11/G14-P137 @ 1.05 s [representative detector tick 2.40 s]: RT facing 140° from downfield, moving back at 4.7 yd/s for 2.50 s (pass play)
- sc11/G4-P091 @ 2.10 s [representative detector tick 4.25 s]: LG facing 165° from downfield, moving back at 3.5 yd/s for 2.45 s (pass play)
- sc11/G3-P102 @ 2.05 s [representative detector tick 2.55 s]: RT facing 166° from downfield, moving back at 4.4 yd/s for 2.15 s (pass play)

**Sliding through a cut (candidate)**: 215 events in 16 games

- sc11/G10-P028 @ 3.00 s [representative detector tick 3.60 s]: LB_W turned 62° from 4.5 yd/s keeping 84% of his speed through the whole cut (NFL p90 for the role 80%); asked for a 48° turn
- sc11/G9-P096 @ 1.40 s [representative detector tick 2.00 s]: X turned 62° from 4.1 yd/s keeping 92% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 11° turn
- sc11/G8-P092 @ 1.30 s [representative detector tick 1.90 s]: LB_W turned 71° from 4.1 yd/s keeping 90% of his speed through the whole cut (NFL p90 for the role 80%); asked for a 33° turn

**Free climber requesting near-zero movement (candidate)**: 8 events in 16 games

- sc11/G11-P175 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G15-P163 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G16-P098 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 2 events in 16 games

- sc11/G3-P128 @ 2.75 s [representative detector tick 4.05 s]: LB_W trailing RB within 1.68 yd through the recorded flight, body >153° from ball; arrival right-rear (-164°), turned 8° (not gaze evidence)
- sc11/G6-P104 @ 2.20 s [representative detector tick 3.30 s]: LB_M trailing Y within 0.88 yd through the recorded flight, body >145° from ball; arrival right-rear (-151°), turned 7° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 579 events in 16 games

- sc11/G8-P014 @ 1.70 s [representative detector tick 2.50 s]: RB travel 86° vs installed-aim bearing -56°; DT_S 0.06 yd ahead, 0.59 yd off heading (engaged true; geometry only)
- sc11/G11-P044 @ 1.30 s [representative detector tick 2.50 s]: RB travel -87° vs installed-aim bearing 79°; DT_W 0 yd ahead, 1.31 yd off heading (engaged true; geometry only)
- sc11/G3-P157 @ 2.05 s [representative detector tick 3.30 s]: RB travel 55° vs installed-aim bearing -81°; DT_W 0.33 yd ahead, 1.49 yd off heading (engaged true; geometry only)


## Largest estimated changes

- FG %, all plays (n=66): 87.1% (61/70) → 93.9% (62/66)
- XP %, all plays (n=125): 94.2% (113/120) → 98.4% (123/125)
- Fumbles lost / team-game, all plays (n=32): 0.84 → 0.53
- Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion, all plays (n=898): 0.2 (2/916) → 0.4 (4/898)
- Accepted penalties / team-game: encroachment, all plays (n=32): 0.25 → 0.06
- Accepted penalties / team-game: block_in_back, all plays (n=32): 0.34 → 0.13
- Yards before contact (runs), all plays (n=710): 0.57 → 1.01
- FG 50+ yd %, all plays (n=16): 60.0% (9/15) → 87.5% (14/16)
scorecard: film weirdness events -> out/scorecard/weird-events.json
