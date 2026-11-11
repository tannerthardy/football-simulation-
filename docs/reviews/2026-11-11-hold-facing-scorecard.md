
> gridiron-engine@0.1.0 ref
> node scripts/ref.mjs npm run scorecard -- --games 16 --leagues 2 --seed 11 --splits none --arm ref:HOLD_FACING=0 --arm cand:HOLD_FACING=1

[ref] stack run-ref-19 @ 015718b8

> gridiron-engine@0.1.0 scorecard
> node --import tsx scripts/scorecard/run.ts --games 16 --leagues 2 --seed 11 --splits none --arm ref:HOLD_FACING=0 --arm cand:HOLD_FACING=1

scorecard: 2 arm(s) × 16 games in 309 s elapsed, 4 concurrent workers (4 requested)
# Scorecard

Commit `015718b8029a4580bfa1f4cd282579f49a52f793` · 16 games per arm over 2 leagues · seed 11 · 2026-11-11

Rendering measurement SHA256: `b1c00550b185328d154361a94b73aa5fec0dd3b36d517fd4c49f596e73c555c5`. Tables use this checkout's metric definitions; producer metadata below is preserved.

Read this as a diagnosis. A band says where our football looks unrealistic; it does not decide whether a mechanism is correct. A stat that moves the wrong way usually points at another mechanism to fix next. Ranges are 90% intervals from resampling whole games; "moved" means the interval excludes zero. A dash means an unavailable measurement or no eligible denominator.

Rate counts are recorded events / eligible exposure; missing legacy counts remain unavailable. An observed 17/17 is 100%, not a certain future success rate: whole-game resampling can give a zero-width interval when every observed outcome is the same. These intervals do not rule out unobserved rare failures.

## Timing and provenance

Per-game ms is elapsed time around simulateGame only; it excludes roster generation, record/probe work and worker startup. Sums of worker elapsed times are not collection wall time or CPU time.

**producer**: commit `015718b8029a4580bfa1f4cd282579f49a52f793`; Node: v22.23.3; probes: missedBy, weird.

Workers requested: 4; peak concurrent worker processes: 4.

Collection elapsed: 308.7 s. CPU time: not collected in scorecard records.

- ref: 36.2 s elapsed per game; worker processes: 2
- cand: 37.5 s elapsed per game; worker processes: 2
- ref film weirdness detectors: 595 ms per game, 1.6% of the elapsed time (inside it, not extra)
- cand film weirdness detectors: 624 ms per game, 1.7% of the elapsed time (inside it, not extra)
- engineSha256: 5d85dc10a4c2a4c7bc581fd31eaa5f22f62dad31e7e72a28cd0cfb6c7fcda5bc
- measurementSha256: b1c00550b185328d154361a94b73aa5fec0dd3b36d517fd4c49f596e73c555c5
- lockfileSha256: cee32ba14d404c05dff4e8e3b4506bc1ea1e1afbfd40b35461511e7ff8fdb98f
- platform: linux
- arch: x64
- cpuModel: Intel(R) Xeon(R) Processor @ 2.10GHz
- cpuQuotaCores: unavailable
- execution: node --import tsx
- ref resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SWAP":true,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CATCH_EYES":true,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SNAP_TIME":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FIT_BLITZ_SLIDE":true,"FIT_TE_GAP":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARM_MOMENT":true,"GRASP_JEOPARDY":true,"GRASP_PATCH":true,"GRIP_HOLD":true,"GRIP_REACH":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"HANDS_CHEST":true,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HIP_BRACE":true,"HOLD_FACING":false,"HOLD_FINISH":true,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_HIP":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEAN_PITCH":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MAN_PHASE":false,"MESH_GUN_SIDE":true,"MESH_TEMPO":true,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_ON_COUNT":false,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_ANCHOR":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRESS_MIRROR":true,"PRESS_RELEASE":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"QB_FEEL":false,"QB_RHYTHM":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_HANDS":false,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RECEIVER_DEPTH":true,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TORSO_CAPSULE":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"WR_SNAP":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`
- cand resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SWAP":true,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CATCH_EYES":true,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SNAP_TIME":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FIT_BLITZ_SLIDE":true,"FIT_TE_GAP":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARM_MOMENT":true,"GRASP_JEOPARDY":true,"GRASP_PATCH":true,"GRIP_HOLD":true,"GRIP_REACH":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"HANDS_CHEST":true,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HIP_BRACE":true,"HOLD_FACING":true,"HOLD_FINISH":true,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_HIP":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEAN_PITCH":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MAN_PHASE":false,"MESH_GUN_SIDE":true,"MESH_TEMPO":true,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_ON_COUNT":false,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_ANCHOR":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRESS_MIRROR":true,"PRESS_RELEASE":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"QB_FEEL":false,"QB_RHYTHM":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_HANDS":false,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RECEIVER_DEPTH":true,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TORSO_CAPSULE":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"WR_SNAP":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`


## cand vs ref

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | ref | cand | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 33.22 | 35.63 | +2.41 | -2.31 to +7.19 | not resolved by this sample | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 66.75 | 69.25 | +2.50 | +0.41 to +4.34 | **moved** | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 458.04 | 486.13 | +28.09 | -13.27 to +62.19 | not resolved by this sample | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 66.7% (1425/2136) | 68.1% (1508/2216) | +1.3 | -0.6 to +3.7 | not resolved by this sample | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | HIGH |
| Completion % | 58.5% (773/1322) | 59.0% (836/1418) | +0.5 | -1.4 to +2.6 | not resolved by this sample | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 8.80 | 8.80 | +0.00 | -0.71 to +0.65 | not resolved by this sample | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 3.8% (54/1425) | 3.0% (45/1508) | -0.8 | -1.7 to +0.2 | not resolved by this sample | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | LOW |
| INT rate | 4.5% (60/1322) | 4.2% (60/1418) | -0.3 | -1.3 to +0.6 | not resolved by this sample | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 7.0% (93/1322) | 7.3% (104/1418) | +0.3 | -1.3 to +2.0 | not resolved by this sample | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 13.0% (172/1322) | 13.5% (192/1418) | +0.5 | -1.2 to +2.4 | not resolved by this sample | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 8.92 | 8.62 | -0.30 | -0.75 to +0.14 | not resolved by this sample | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | HIGH |
| YAC / reception | 7.04 | 7.07 | +0.03 | -1.20 to +1.16 | not resolved by this sample | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.81 | 2.84 | +0.03 | -0.01 to +0.07 | not resolved by this sample | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | OK |
| Scramble rate | 2.8% (40/1425) | 2.8% (42/1508) | -0.0 | -0.7 to +0.8 | not resolved by this sample | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | OK |
| Separation at catch point (yd) | 3.32 | 3.35 | +0.03 | -0.13 to +0.19 | not resolved by this sample | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | HIGH |
| Rush yards / carry | 4.44 | 4.31 | -0.13 | -0.60 to +0.32 | not resolved by this sample | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | OK |
| Run stuff rate (<=0) | 9.0% (64/711) | 9.0% (64/708) | +0.0 | -3.1 to +2.8 | not resolved by this sample | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | LOW |
| 10+ yd runs | 7.2% (51/711) | 8.2% (58/708) | +1.0 | -0.7 to +2.7 | not resolved by this sample | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | OK |
| Runs of 20+ that reach 40 | 53.8% (7/13) | 61.5% (8/13) | +7.7 | -29.5 to +40.5 | not resolved by this sample | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | HIGH |
| Yards before contact (runs) | 1.12 | 1.13 | +0.01 | -0.22 to +0.23 | not resolved by this sample | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.24 | 0.23 | -0.01 | -0.03 to +0.02 | not resolved by this sample | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.14 | 0.13 | -0.01 | -0.03 to +0.01 | not resolved by this sample | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 42.3% (177/418) | 39.9% (168/421) | -2.4 | -6.4 to +2.2 | not resolved by this sample | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| FG % | 89.7% (52/58) | 86.2% (50/58) | -3.4 | -12.4 to +5.5 | not resolved by this sample | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| XP % | 97.2% (106/109) | 93.6% (102/109) | -3.7 | -8.8 to +0.8 | not resolved by this sample | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | LOW |
| Fumbles lost / team-game | 0.66 | 0.66 | +0.00 | -0.31 to +0.34 | not resolved by this sample | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Punts / team-game | 4.28 | 4.59 | +0.31 | -0.38 to +0.91 | not resolved by this sample | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Accepted penalties / team-game | 5.22 | 5.41 | +0.19 | -0.41 to +0.72 | not resolved by this sample | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 100.0% (16/16) | 100.0% (13/13) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 91.7% (11/12) | 100.0% (16/16) | +8.3 | +0.0 to +20.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 85.7% (18/21) | 80.0% (16/20) | -5.7 | -19.0 to +8.4 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 77.8% (7/9) | 55.6% (5/9) | -22.2 | -50.0 to +6.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 45.51 | 46.38 | +0.87 | -0.25 to +1.81 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 40.12 | 41.56 | +1.44 | -0.45 to +3.20 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 25.83 | 24.08 | -1.75 | -3.15 to -0.25 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 9.06 | 8.09 | -0.96 | -2.63 to +0.56 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 30.1% (63/209) | 29.5% (65/220) | -0.6 | -6.8 to +4.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 3.6% (5/137) | 2.7% (4/147) | -0.9 | -4.3 to +2.5 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 7.4% (15/203) | 5.7% (12/210) | -1.7 | -6.0 to +2.8 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 41.7% (10/24) | 58.3% (14/24) | +16.7 | -4.8 to +36.9 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 16.2% (21/130) | 21.7% (31/143) | +5.5 | +0.6 to +10.1 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 13.84 | 14.47 | +0.63 | -0.47 to +1.69 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 2.32 | 2.38 | +0.06 | -0.22 to +0.37 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 61.4% (70/114) | 66.7% (90/135) | +5.3 | -4.7 to +15.4 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 2.59 | 2.56 | -0.03 | -0.59 to +0.59 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.03 | 0.03 | +0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by LB / play | 0.04 | 0.04 | -0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by CB / play | 0.02 | 0.02 | -0.00 | -0.01 to +0.00 | not resolved by this sample | internal |  |
| Missed tackles by S / play | 0.01 | 0.01 | -0.00 | -0.01 to +0.00 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.1% (counts unavailable) | 0.3% (counts unavailable) | +0.3 | +0.0 to +0.5 | **moved** | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.1 (1/1761) | 0.3 (6/1831) | +0.3 | +0.1 to +0.5 | **moved** | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.1 (1/866) | 0.2 (2/889) | +0.1 | -0.2 to +0.4 | not resolved by this sample | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | 0.0% (0/1) | 0.0% (0/6) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 18.0% (270/1501) | 17.8% (273/1538) | -0.2 | -2.1 to +1.9 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 22.9 (344/1501) | 21.3 (328/1538) | -1.6 | -4.8 to +1.9 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 60.4% (427/707) | 59.5% (414/696) | -0.9 | -3.6 to +1.7 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 128.7 (910/707) | 120.4 (838/696) | -8.3 | -19.0 to +2.5 | not resolved by this sample | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 2.0% (21162/1067570) | 1.9% (21192/1115705) | -0.1 | -0.2 to -0.0 | **moved** | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 47.8% (1022/2136) | 47.3% (1048/2216) | -0.6 | -2.8 to +1.5 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 74.8 (1598/2136) | 73.3 (1625/2216) | -1.5 | -5.8 to +2.6 | not resolved by this sample | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 4.1% (230/5597) | 4.1% (234/5755) | -0.0 | -0.6 to +0.5 | not resolved by this sample | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 10.8 (230/2136) | 10.6 (234/2216) | -0.2 | -2.0 to +1.4 | not resolved by this sample | internal |  |
| Accepted penalties / team-game: block_in_back | 0.16 | 0.28 | +0.13 | -0.03 to +0.28 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.22 | 0.13 | -0.09 | -0.22 to +0.03 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.72 | 0.69 | -0.03 | -0.28 to +0.22 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: free_kick_short | 0.00 | 0.03 | +0.03 | +0.00 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 1.44 | 1.72 | +0.28 | -0.25 to +0.81 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 1.25 | 1.22 | -0.03 | -0.41 to +0.41 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 0.22 | 0.19 | -0.03 | -0.16 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.50 | 0.59 | +0.09 | -0.13 to +0.28 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.47 | 0.47 | +0.00 | -0.13 to +0.13 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.16 | 0.06 | -0.09 | -0.19 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: unnecessary_roughness | 0.09 | 0.03 | -0.06 | -0.19 to +0.03 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## Watch these first

Read the clips, not the averages: each line is a place in a simulated game that a rule flagged. A rule says where to look, never what number is right, and several of its constants are chosen, not sourced (docs/VALIDATION.md). Ids with an `sc<seed>/` prefix are this run's own games, not the film room's: the full list is in the events file next to the saved card, and `npm run weird -- <seed>` plays the film-room games so its ids match `npm run replay`.

### ref

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

### cand

**Pre-snap teammate contact**: 6 events in 16 games

- sc11/G1-P122 @ -4.00 s (pre-snap) [representative detector tick -3.50 s]: RB and H touched before the snap (return Z motion), closing 0 yd/s
- sc11/G6-P161 @ -0.05 s (pre-snap): RB and F touched before the snap (no motion called), closing 0 yd/s
- sc11/G7-P015 @ -3.75 s (pre-snap) [representative detector tick -3.45 s]: RB and H touched before the snap (return Z motion), closing 0 yd/s

**Defender turned away from a nearby runner**: 328 events in 16 games

- sc11/G11-P063 @ 3.45 s [representative detector tick 3.75 s]: DE_S facing 159° from the runner (RB) at 1.2 yd for 1.70 s; asked for 159°
- sc11/G6-P154 @ 2.70 s [representative detector tick 4.00 s]: DE_S facing 159° from the runner (RB) at 2.8 yd for 1.35 s; asked for 160°
- sc11/G10-P020 @ 3.45 s [representative detector tick 4.60 s]: DE_S facing 155° from the runner (RB) at 2.8 yd for 1.25 s; asked for 155°

**Blocker on a man who is out of the play**: 838 events in 16 games

- sc11/G6-P021 @ 2.20 s [representative detector tick 5.15 s]: C (run-block) on LB_M, 17.6 yd from the runner and moving away at 2.9 yd/s, while NB is free 0.5 yd from the runner, for 3.00 s
- sc11/G3-P018 @ 1.40 s [representative detector tick 4.35 s]: LT (run-block) on LB_W, 15.5 yd from the runner and moving away at 1.9 yd/s, while FS is free 0.5 yd from the runner, for 3.00 s
- sc11/G3-P018 @ 1.40 s [representative detector tick 2.40 s]: C (run-block) on DT_W, 8.4 yd from the runner and moving away at 1.4 yd/s, while DT_S is free 2.8 yd from the runner, for 3.00 s

**Lineman backpedaling while facing his own backfield**: 1625 events in 16 games

- sc11/G6-P119 @ 1.80 s [representative detector tick 2.80 s]: LT facing 131° from downfield, moving back at 4.2 yd/s for 2.20 s (pass play)
- sc11/G14-P006 @ 1.40 s [representative detector tick 2.70 s]: RT facing 136° from downfield, moving back at 3.9 yd/s for 2.15 s (pass play)
- sc11/G7-P171 @ 3.00 s [representative detector tick 4.95 s]: RG facing 143° from downfield, moving back at 4.4 yd/s for 2.10 s (pass play)

**Sliding through a cut (candidate)**: 234 events in 16 games

- sc11/G9-P116 @ 3.00 s [representative detector tick 3.60 s]: CB_W turned 61° from 4.5 yd/s keeping 100% of his speed through the whole cut (NFL p90 for the role 89%); asked for a 16° turn
- sc11/G11-P037 @ 3.50 s [representative detector tick 4.10 s]: DE_W turned 62° from 3.8 yd/s keeping 99% of his speed through the whole cut (NFL p90 for the role 73%); asked for a 3° turn
- sc11/G9-P156 @ 1.90 s [representative detector tick 2.50 s]: RB turned 60° from 3.8 yd/s keeping 96% of his speed through the whole cut (NFL p90 for the role 90%); asked for a 40° turn

**Free climber requesting near-zero movement (candidate)**: 8 events in 16 games

- sc11/G2-P184 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G6-P017 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G13-P124 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 2 events in 16 games

- sc11/G6-P119 @ 2.85 s [representative detector tick 4.15 s]: LB_M trailing RB within 1.99 yd through the recorded flight, body >147° from ball; arrival left-rear (155°), turned 20° (not gaze evidence)
- sc11/G9-P145 @ 2.55 s [representative detector tick 3.70 s]: SS trailing Y within 1.75 yd through the recorded flight, body >158° from ball; arrival left-rear (172°), turned 13° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 597 events in 16 games

- sc11/G14-P194 @ 2.60 s [representative detector tick 5.75 s]: RB travel 101° vs installed-aim bearing -68°; DE_S 0 yd ahead, 0.89 yd off heading (engaged false; geometry only)
- sc11/G8-P044 @ 1.70 s [representative detector tick 3.25 s]: RB travel 120° vs installed-aim bearing -84°; DT_W 0.05 yd ahead, 0.57 yd off heading (engaged false; geometry only)
- sc11/G16-P122 @ 1.70 s [representative detector tick 3.25 s]: RB travel 51° vs installed-aim bearing -67°; DE_W 0.16 yd ahead, 0.53 yd off heading (engaged true; geometry only) [play nullified by a penalty]


## Largest estimated changes

- Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging), all plays (n=1831): 0.1% (counts unavailable) → 0.3% (counts unavailable)
- Pre-snap teammate contact: events per 100 plays with pre-snap staging, all plays (n=1831): 0.1 (1/1761) → 0.3 (6/1831)
- Scrimmage plays / team-game, all plays (n=32): 66.75 → 69.25
- Two-point attempts / TD (retries once), all plays (n=143): 16.2% (21/130) → 21.7% (31/143)
- Kickoff return average (recorded yards), all plays (n=154): 25.83 → 24.08
- OL facing own backfield and moving back (% of OL frames), all plays (n=1115705): 2.0% (21162/1067570) → 1.9% (21192/1115705)
scorecard: film weirdness events -> out/scorecard/weird-events.json
