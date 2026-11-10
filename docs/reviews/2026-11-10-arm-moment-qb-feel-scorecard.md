
> gridiron-engine@0.1.0 ref
> node scripts/ref.mjs npm run scorecard -- --games 16 --leagues 2 --seed 11 --splits none --arm ref:GRASP_ARM_MOMENT=0,QB_FEEL=0 --arm gam:GRASP_ARM_MOMENT=1,QB_FEEL=0 --arm qbf:GRASP_ARM_MOMENT=0,QB_FEEL=1

[ref] stack run-ref-14 @ 737ed889

> gridiron-engine@0.1.0 scorecard
> node --import tsx scripts/scorecard/run.ts --games 16 --leagues 2 --seed 11 --splits none --arm ref:GRASP_ARM_MOMENT=0,QB_FEEL=0 --arm gam:GRASP_ARM_MOMENT=1,QB_FEEL=0 --arm qbf:GRASP_ARM_MOMENT=0,QB_FEEL=1

scorecard: 3 arm(s) × 16 games in 549 s elapsed, 3 concurrent workers (4 requested)
# Scorecard

Commit `737ed8891c6f7fe4d111215bcc2919986573165a` · 16 games per arm over 2 leagues · seed 11 · 2026-11-10

Rendering measurement SHA256: `bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b`. Tables use this checkout's metric definitions; producer metadata below is preserved.

Read this as a diagnosis. A band says where our football looks unrealistic; it does not decide whether a mechanism is correct. A stat that moves the wrong way usually points at another mechanism to fix next. Ranges are 90% intervals from resampling whole games; "moved" means the interval excludes zero. A dash means an unavailable measurement or no eligible denominator.

Rate counts are recorded events / eligible exposure; missing legacy counts remain unavailable. An observed 17/17 is 100%, not a certain future success rate: whole-game resampling can give a zero-width interval when every observed outcome is the same. These intervals do not rule out unobserved rare failures.

## Timing and provenance

Per-game ms is elapsed time around simulateGame only; it excludes roster generation, record/probe work and worker startup. Sums of worker elapsed times are not collection wall time or CPU time.

**producer**: commit `737ed8891c6f7fe4d111215bcc2919986573165a`; Node: v22.23.3; probes: missedBy, weird.

Workers requested: 4; peak concurrent worker processes: 3.

Collection elapsed: 549.3 s. CPU time: not collected in scorecard records.

- ref: 34.3 s elapsed per game; worker processes: 1
- gam: 33.7 s elapsed per game; worker processes: 1
- qbf: 33.9 s elapsed per game; worker processes: 1
- ref film weirdness detectors: 545 ms per game, 1.6% of the elapsed time (inside it, not extra)
- gam film weirdness detectors: 540 ms per game, 1.6% of the elapsed time (inside it, not extra)
- qbf film weirdness detectors: 545 ms per game, 1.6% of the elapsed time (inside it, not extra)
- engineSha256: 14bc0d985181bffc1611af3cb537b419eda24d4d476cbaf6f1ff832e0ee23ed0
- measurementSha256: bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b
- lockfileSha256: cee32ba14d404c05dff4e8e3b4506bc1ea1e1afbfd40b35461511e7ff8fdb98f
- platform: linux
- arch: x64
- cpuModel: Intel(R) Xeon(R) Processor @ 2.10GHz
- cpuQuotaCores: unavailable
- execution: node --import tsx
- ref resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SNAP_TIME":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_REACH":false,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_ARM_MOMENT":false,"GRASP_CLOSURE":false,"GRASP_PATCH":true,"GRASP_SLIDE":false,"GRIP_HOLD":true,"GRIP_REACH":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HIP_BRACE":true,"HOLD_FINISH":true,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEAN_PITCH":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MAN_PHASE":false,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_ON_COUNT":false,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_ANCHOR":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRESS_MIRROR":true,"PRESS_RELEASE":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"QB_FEEL":false,"QB_RHYTHM":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_HANDS":false,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_HORIZON":false,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TORSO_CAPSULE":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"UNDER_DEPTH":false,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WRAP_TWO_POINT":false,"WR_ALIGN":true,"WR_SNAP":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`
- gam resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SNAP_TIME":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_REACH":false,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_ARM_MOMENT":true,"GRASP_CLOSURE":false,"GRASP_PATCH":true,"GRASP_SLIDE":false,"GRIP_HOLD":true,"GRIP_REACH":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HIP_BRACE":true,"HOLD_FINISH":true,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEAN_PITCH":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MAN_PHASE":false,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_ON_COUNT":false,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_ANCHOR":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRESS_MIRROR":true,"PRESS_RELEASE":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"QB_FEEL":false,"QB_RHYTHM":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_HANDS":false,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_HORIZON":false,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TORSO_CAPSULE":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"UNDER_DEPTH":false,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WRAP_TWO_POINT":false,"WR_ALIGN":true,"WR_SNAP":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`
- qbf resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SNAP_TIME":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_REACH":false,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_ARM_MOMENT":false,"GRASP_CLOSURE":false,"GRASP_PATCH":true,"GRASP_SLIDE":false,"GRIP_HOLD":true,"GRIP_REACH":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HIP_BRACE":true,"HOLD_FINISH":true,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEAN_PITCH":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MAN_PHASE":false,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_ON_COUNT":false,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_ANCHOR":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRESS_MIRROR":true,"PRESS_RELEASE":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"QB_FEEL":true,"QB_RHYTHM":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_HANDS":false,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_HORIZON":false,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TORSO_CAPSULE":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"UNDER_DEPTH":false,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WRAP_TWO_POINT":false,"WR_ALIGN":true,"WR_SNAP":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`


## gam vs ref

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | ref | gam | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 38.66 | 36.50 | -2.16 | -5.81 to +0.78 | not resolved by this sample | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 67.63 | 67.22 | -0.41 | -1.94 to +1.28 | not resolved by this sample | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 516.94 | 478.37 | -38.57 | -63.82 to -17.43 | **moved** | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 66.6% (1442/2164) | 64.5% (1388/2151) | -2.1 | -3.6 to -0.8 | **moved** | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | OK |
| Completion % | 60.6% (806/1331) | 57.9% (750/1296) | -2.7 | -4.9 to -0.3 | **moved** | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 9.87 | 9.15 | -0.71 | -1.25 to -0.18 | **moved** | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 4.0% (57/1442) | 3.3% (46/1388) | -0.6 | -1.3 to +0.1 | not resolved by this sample | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | LOW |
| INT rate | 3.1% (41/1331) | 3.2% (41/1296) | +0.1 | -0.6 to +0.8 | not resolved by this sample | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 9.0% (120/1331) | 8.5% (110/1296) | -0.5 | -2.1 to +0.8 | not resolved by this sample | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 15.6% (208/1331) | 13.9% (180/1296) | -1.7 | -3.8 to +0.2 | not resolved by this sample | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 8.69 | 8.43 | -0.26 | -0.59 to +0.09 | not resolved by this sample | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | OK |
| YAC / reception | 8.16 | 7.95 | -0.21 | -0.79 to +0.38 | not resolved by this sample | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.82 | 2.81 | -0.01 | -0.05 to +0.03 | not resolved by this sample | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | OK |
| Scramble rate | 3.1% (45/1442) | 2.7% (38/1388) | -0.4 | -1.3 to +0.6 | not resolved by this sample | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | OK |
| Separation at catch point (yd) | 3.36 | 3.28 | -0.09 | -0.24 to +0.06 | not resolved by this sample | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | HIGH |
| Rush yards / carry | 4.71 | 4.57 | -0.14 | -0.66 to +0.42 | not resolved by this sample | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | OK |
| Run stuff rate (<=0) | 9.3% (67/722) | 9.2% (70/763) | -0.1 | -3.3 to +2.6 | not resolved by this sample | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | LOW |
| 10+ yd runs | 9.6% (69/722) | 8.5% (65/763) | -1.0 | -3.0 to +0.9 | not resolved by this sample | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | OK |
| Runs of 20+ that reach 40 | 58.8% (10/17) | 69.2% (9/13) | +10.4 | -16.7 to +35.0 | not resolved by this sample | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | HIGH |
| Yards before contact (runs) | 1.08 | 1.13 | +0.05 | -0.19 to +0.33 | not resolved by this sample | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.27 | 0.24 | -0.03 | -0.05 to -0.00 | **moved** | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.17 | 0.14 | -0.03 | -0.05 to -0.01 | **moved** | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 48.7% (202/415) | 39.4% (170/431) | -9.2 | -14.0 to -4.7 | **moved** | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| FG % | 91.8% (45/49) | 95.5% (63/66) | +3.6 | -3.9 to +10.6 | not resolved by this sample | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| XP % | 90.9% (120/132) | 99.1% (115/116) | +8.2 | +4.1 to +12.5 | **moved** | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Fumbles lost / team-game | 0.81 | 0.66 | -0.16 | -0.34 to +0.03 | not resolved by this sample | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Punts / team-game | 3.97 | 4.28 | +0.31 | -0.34 to +1.09 | not resolved by this sample | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Accepted penalties / team-game | 5.31 | 5.47 | +0.16 | -0.47 to +0.78 | not resolved by this sample | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 100.0% (5/5) | 100.0% (9/9) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 100.0% (18/18) | 95.7% (22/23) | -4.3 | -11.4 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 93.3% (14/15) | 95.7% (22/23) | +2.3 | -10.0 to +12.5 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 72.7% (8/11) | 90.9% (10/11) | +18.2 | -9.1 to +50.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 46.29 | 44.46 | -1.83 | -3.04 to -0.56 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 41.61 | 39.15 | -2.46 | -4.63 to -0.55 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 23.96 | 25.09 | +1.13 | -0.53 to +2.75 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 8.33 | 9.60 | +1.27 | -0.67 to +3.63 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 30.9% (72/233) | 28.9% (66/228) | -2.0 | -7.7 to +3.1 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 1.6% (2/127) | 2.2% (3/137) | +0.6 | -1.3 to +2.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 6.6% (12/182) | 11.4% (25/220) | +4.8 | +1.4 to +8.1 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 50.0% (10/20) | 54.3% (19/35) | +4.3 | -17.2 to +24.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 17.5% (28/160) | 15.8% (22/139) | -1.7 | -5.9 to +1.9 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 13.72 | 13.88 | +0.16 | -0.41 to +0.75 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 2.74 | 2.51 | -0.24 | -0.54 to +0.02 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 66.7% (84/126) | 60.2% (77/128) | -6.5 | -17.0 to +4.3 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 2.09 | 2.00 | -0.09 | -0.41 to +0.22 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.04 | 0.03 | -0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by LB / play | 0.04 | 0.04 | -0.01 | -0.01 to -0.00 | **moved** | internal |  |
| Missed tackles by CB / play | 0.02 | 0.02 | -0.00 | -0.01 to +0.00 | not resolved by this sample | internal |  |
| Missed tackles by S / play | 0.02 | 0.01 | -0.00 | -0.01 to +0.00 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.1% (counts unavailable) | 0.2% (counts unavailable) | +0.1 | +0.0 to +0.2 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.1 (1/1812) | 0.2 (3/1776) | +0.1 | +0.0 to +0.2 | not resolved by this sample | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.1 (1/902) | 0.2 (2/877) | +0.1 | +0.0 to +0.3 | not resolved by this sample | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | 0.0% (0/1) | 0.0% (0/3) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 18.8% (289/1534) | 18.4% (277/1507) | -0.5 | -2.2 to +1.1 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 23.6 (362/1534) | 21.4 (323/1507) | -2.2 | -4.3 to -0.4 | **moved** | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 59.1% (422/714) | 58.8% (444/755) | -0.3 | -4.0 to +3.0 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 116.8 (834/714) | 122.8 (927/755) | +6.0 | -3.6 to +16.3 | not resolved by this sample | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 1.9% (20760/1089940) | 1.9% (20056/1058475) | -0.0 | -0.2 to +0.1 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 46.5% (1007/2164) | 46.1% (991/2151) | -0.5 | -2.6 to +1.5 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 72.7 (1573/2164) | 71.7 (1542/2151) | -1.0 | -4.4 to +2.6 | not resolved by this sample | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 4.0% (225/5563) | 3.5% (189/5409) | -0.6 | -1.1 to -0.0 | **moved** | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 10.4 (225/2164) | 8.8 (189/2151) | -1.6 | -2.9 to -0.3 | **moved** | internal |  |
| Accepted penalties / team-game: block_in_back | 0.03 | 0.16 | +0.13 | +0.00 to +0.25 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.22 | 0.16 | -0.06 | -0.22 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.78 | 0.84 | +0.06 | -0.16 to +0.28 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: free_kick_short | 0.03 | 0.00 | -0.03 | -0.09 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 1.66 | 1.53 | -0.13 | -0.59 to +0.38 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 1.50 | 1.22 | -0.28 | -0.63 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_touching | 0.00 | 0.03 | +0.03 | +0.00 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 0.28 | 0.31 | +0.03 | -0.22 to +0.28 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.47 | 0.59 | +0.13 | -0.09 to +0.34 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.31 | 0.50 | +0.19 | -0.09 to +0.47 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.03 | 0.06 | +0.03 | -0.06 to +0.13 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: unnecessary_roughness | 0.00 | 0.06 | +0.06 | +0.00 to +0.13 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## qbf vs ref

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | ref | qbf | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 38.66 | 37.78 | -0.88 | -6.44 to +5.06 | not resolved by this sample | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 67.63 | 67.25 | -0.38 | -2.28 to +1.63 | not resolved by this sample | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 516.94 | 496.92 | -20.01 | -71.96 to +22.31 | not resolved by this sample | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 66.6% (1442/2164) | 64.6% (1391/2152) | -2.0 | -5.6 to +0.9 | not resolved by this sample | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | OK |
| Completion % | 60.6% (806/1331) | 57.8% (773/1337) | -2.7 | -6.0 to +0.2 | not resolved by this sample | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 9.87 | 9.53 | -0.33 | -1.02 to +0.38 | not resolved by this sample | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 4.0% (57/1442) | 3.1% (43/1391) | -0.9 | -1.6 to +0.1 | not resolved by this sample | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | LOW |
| INT rate | 3.1% (41/1331) | 4.2% (56/1337) | +1.1 | -0.0 to +2.0 | not resolved by this sample | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 9.0% (120/1331) | 9.0% (120/1337) | -0.0 | -1.6 to +1.5 | not resolved by this sample | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 15.6% (208/1331) | 14.5% (194/1337) | -1.1 | -3.6 to +1.1 | not resolved by this sample | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 8.69 | 8.69 | -0.00 | -0.55 to +0.52 | not resolved by this sample | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | HIGH |
| YAC / reception | 8.16 | 8.32 | +0.16 | -0.78 to +1.01 | not resolved by this sample | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.82 | 2.82 | -0.00 | -0.05 to +0.04 | not resolved by this sample | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | OK |
| Scramble rate | 3.1% (45/1442) | 0.4% (6/1391) | -2.7 | -3.4 to -2.0 | **moved** | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | LOW |
| Separation at catch point (yd) | 3.36 | 3.36 | -0.00 | -0.10 to +0.10 | not resolved by this sample | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | HIGH |
| Rush yards / carry | 4.71 | 4.46 | -0.25 | -0.94 to +0.57 | not resolved by this sample | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | OK |
| Run stuff rate (<=0) | 9.3% (67/722) | 9.2% (70/761) | -0.1 | -2.9 to +2.0 | not resolved by this sample | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | LOW |
| 10+ yd runs | 9.6% (69/722) | 8.3% (63/761) | -1.3 | -3.7 to +1.4 | not resolved by this sample | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | OK |
| Runs of 20+ that reach 40 | 58.8% (10/17) | 71.4% (10/14) | +12.6 | -7.9 to +33.8 | not resolved by this sample | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | HIGH |
| Yards before contact (runs) | 1.08 | 1.06 | -0.02 | -0.27 to +0.24 | not resolved by this sample | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.27 | 0.22 | -0.05 | -0.08 to -0.02 | **moved** | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.17 | 0.13 | -0.03 | -0.05 to -0.01 | **moved** | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 48.7% (202/415) | 42.8% (176/411) | -5.9 | -10.6 to -1.3 | **moved** | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| FG % | 91.8% (45/49) | 88.7% (47/53) | -3.2 | -13.4 to +6.9 | not resolved by this sample | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| XP % | 90.9% (120/132) | 97.0% (128/132) | +6.1 | +2.1 to +10.1 | **moved** | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Fumbles lost / team-game | 0.81 | 0.66 | -0.16 | -0.63 to +0.28 | not resolved by this sample | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Punts / team-game | 3.97 | 4.47 | +0.50 | -0.25 to +1.28 | not resolved by this sample | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Accepted penalties / team-game | 5.31 | 5.34 | +0.03 | -0.59 to +0.63 | not resolved by this sample | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 100.0% (5/5) | 100.0% (13/13) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 100.0% (18/18) | 100.0% (11/11) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 93.3% (14/15) | 80.0% (12/15) | -13.3 | -33.3 to +3.6 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 72.7% (8/11) | 78.6% (11/14) | +5.8 | -33.8 to +50.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 46.29 | 45.70 | -0.59 | -2.31 to +1.26 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 41.61 | 41.96 | +0.36 | -2.41 to +2.97 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 23.96 | 25.62 | +1.66 | -0.17 to +3.48 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 8.33 | 8.03 | -0.30 | -1.62 to +1.03 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 30.9% (72/233) | 29.0% (64/221) | -1.9 | -7.1 to +2.5 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 1.6% (2/127) | 0.7% (1/143) | -0.9 | -3.0 to +1.3 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 6.6% (12/182) | 5.1% (10/196) | -1.5 | -5.0 to +1.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 50.0% (10/20) | 53.8% (7/13) | +3.8 | -19.4 to +31.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 17.5% (28/160) | 13.2% (20/152) | -4.3 | -8.6 to -0.5 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 13.72 | 14.19 | +0.47 | -0.91 to +1.69 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 2.74 | 2.57 | -0.17 | -0.53 to +0.18 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 66.7% (84/126) | 72.5% (87/120) | +5.8 | -4.5 to +15.1 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 2.09 | 2.44 | +0.34 | -0.47 to +1.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.04 | 0.03 | -0.01 | -0.02 to -0.00 | **moved** | internal |  |
| Missed tackles by LB / play | 0.04 | 0.03 | -0.01 | -0.03 to -0.00 | **moved** | internal |  |
| Missed tackles by CB / play | 0.02 | 0.01 | -0.01 | -0.01 to +0.00 | not resolved by this sample | internal |  |
| Missed tackles by S / play | 0.02 | 0.01 | -0.01 | -0.01 to -0.00 | **moved** | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.1% (counts unavailable) | 0.2% (counts unavailable) | +0.1 | -0.0 to +0.2 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.1 (1/1812) | 0.2 (3/1788) | +0.1 | -0.0 to +0.2 | not resolved by this sample | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.1 (1/902) | 0.2 (2/901) | +0.1 | -0.0 to +0.3 | not resolved by this sample | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | 0.0% (0/1) | 0.0% (0/3) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 18.8% (289/1534) | 17.7% (264/1489) | -1.1 | -3.7 to +1.6 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 23.6 (362/1534) | 21.3 (317/1489) | -2.3 | -6.2 to +1.2 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 59.1% (422/714) | 58.6% (438/748) | -0.5 | -4.1 to +2.9 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 116.8 (834/714) | 119.0 (890/748) | +2.2 | -6.5 to +10.7 | not resolved by this sample | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 1.9% (20760/1089940) | 2.0% (20957/1067140) | +0.1 | -0.0 to +0.2 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 46.5% (1007/2164) | 48.2% (1038/2152) | +1.7 | -0.2 to +3.6 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 72.7 (1573/2164) | 75.3 (1621/2152) | +2.6 | -0.7 to +6.0 | not resolved by this sample | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 4.0% (225/5563) | 3.5% (187/5341) | -0.5 | -1.1 to -0.0 | **moved** | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 10.4 (225/2164) | 8.7 (187/2152) | -1.7 | -3.2 to -0.3 | **moved** | internal |  |
| Accepted penalties / team-game: block_in_back | 0.03 | 0.25 | +0.22 | +0.09 to +0.34 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.22 | 0.16 | -0.06 | -0.22 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.78 | 0.75 | -0.03 | -0.19 to +0.13 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: free_kick_short | 0.03 | 0.00 | -0.03 | -0.09 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 1.66 | 1.56 | -0.09 | -0.63 to +0.44 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 1.50 | 1.28 | -0.22 | -0.50 to +0.06 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_touching | 0.00 | 0.00 | +0.00 | +0.00 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 0.28 | 0.34 | +0.06 | -0.06 to +0.19 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.47 | 0.53 | +0.06 | -0.13 to +0.25 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.31 | 0.44 | +0.13 | -0.03 to +0.28 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.03 | 0.00 | -0.03 | -0.09 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: unnecessary_roughness | 0.00 | 0.03 | +0.03 | +0.00 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## Watch these first

Read the clips, not the averages: each line is a place in a simulated game that a rule flagged. A rule says where to look, never what number is right, and several of its constants are chosen, not sourced (docs/VALIDATION.md). Ids with an `sc<seed>/` prefix are this run's own games, not the film room's: the full list is in the events file next to the saved card, and `npm run weird -- <seed>` plays the film-room games so its ids match `npm run replay`.

### ref

**Pre-snap teammate contact**: 1 event in 16 games

- sc11/G5-P106 @ -0.35 s (pre-snap): RB and F touched before the snap (no motion called), closing 0 yd/s [play nullified by a penalty]
- sc11/G8-P022 @ -0.35 s (pre-snap): RB and F touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 362 events in 16 games

- sc11/G4-P148 @ 2.70 s [representative detector tick 2.90 s]: DE_S facing 121° from the runner (RB) at 3.6 yd for 2.00 s; asked for 121°
- sc11/G9-P096 @ 2.45 s: DE_W facing 121° from the runner (RB) at 3.9 yd for 2.00 s; asked for 121°
- sc11/G16-P033 @ 2.00 s [representative detector tick 3.80 s]: LB_M facing 135° from the runner (RB) at 1.4 yd for 1.85 s; asked for 2°

**Blocker on a man who is out of the play**: 834 events in 16 games

- sc11/G12-P136 @ 1.70 s [representative detector tick 5.55 s]: Z (run-block) on CB_S, 22.7 yd from the runner and moving away at 2.3 yd/s, while LB_W is free 0.5 yd from the runner, for 3.90 s
- sc11/G3-P017 @ 1.70 s [representative detector tick 5.40 s]: Z (stalk) on CB_S, 30.7 yd from the runner and moving away at 0.6 yd/s, while FS is free 0.5 yd from the runner, for 3.75 s
- sc11/G7-P088 @ 2.00 s [representative detector tick 5.00 s]: C (run-block) on DT_W, 13.9 yd from the runner and moving away at 1.6 yd/s, while CB_S is free 0.5 yd from the runner, for 3.05 s [play nullified by a penalty]

**Lineman backpedaling while facing his own backfield**: 1573 events in 16 games

- sc11/G15-P163 @ 1.10 s [representative detector tick 2.50 s]: RT facing 142° from downfield, moving back at 4.5 yd/s for 2.35 s (pass play)
- sc11/G12-P094 @ 1.70 s [representative detector tick 2.35 s]: C facing 145° from downfield, moving back at 4.8 yd/s for 2.30 s (pass play)
- sc11/G12-P124 @ 2.20 s [representative detector tick 3.70 s]: C facing 179° from downfield, moving back at 4.9 yd/s for 2.30 s (pass play)

**Sliding through a cut (candidate)**: 225 events in 16 games

- sc11/G7-P148 @ 6.50 s [representative detector tick 7.10 s]: Y turned 61° from 5.7 yd/s keeping 94% of his speed through the whole cut (NFL p90 for the role 82%); asked for a 43° turn
- sc11/G14-P086 @ 5.80 s [representative detector tick 6.40 s]: NB turned 62° from 4.7 yd/s keeping 100% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 32° turn
- sc11/G11-P161 @ 5.60 s [representative detector tick 6.40 s]: SS turned 64° from 3.9 yd/s keeping 98% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 33° turn

**Free climber requesting near-zero movement (candidate)**: 7 events in 16 games

- sc11/G3-P130 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G6-P013 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G13-P092 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 2 events in 16 games

- sc11/G4-P072 @ 2.70 s [representative detector tick 3.75 s]: SS trailing H within 1.52 yd through the recorded flight, body >165° from ball; arrival right-rear (-165°), turned 3° (not gaze evidence)
- sc11/G8-P017 @ 2.05 s [representative detector tick 2.90 s]: SS trailing Y within 1.11 yd through the recorded flight, body >156° from ball; arrival right-rear (-179°), turned 10° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 603 events in 16 games

- sc11/G8-P028 @ 3.35 s: RB travel 103° vs installed-aim bearing -59°; DE_W 0 yd ahead, 0.54 yd off heading (engaged true; geometry only)
- sc11/G1-P060 @ 2.00 s [representative detector tick 2.60 s]: RB travel -53° vs installed-aim bearing 73°; DT_S 0.16 yd ahead, 0.62 yd off heading (engaged true; geometry only) [play nullified by a penalty]
- sc11/G3-P068 @ 1.70 s [representative detector tick 2.95 s]: RB travel -50° vs installed-aim bearing 62°; LB_W 0.12 yd ahead, 0.82 yd off heading (engaged false; geometry only)

### gam

**Pre-snap teammate contact**: 3 events in 16 games

- sc11/G5-P068 @ -4.85 s (pre-snap) [representative detector tick -4.35 s]: RB and F touched before the snap (across H motion), closing 0 yd/s
- sc11/G8-P024 @ -1.60 s (pre-snap) [representative detector tick -1.05 s]: RB and F touched before the snap (no motion called), closing 0 yd/s
- sc11/G9-P065 @ -1.30 s (pre-snap) [representative detector tick -0.65 s]: RB and H touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 323 events in 16 games

- sc11/G3-P049 @ 2.85 s [representative detector tick 4.40 s]: DE_W facing 179° from the runner (RB) at 1.8 yd for 1.60 s; asked for 179°
- sc11/G9-P150 @ 2.45 s: DE_W facing 123° from the runner (RB) at 4.1 yd for 1.35 s; asked for 121°
- sc11/G14-P067 @ 2.50 s [representative detector tick 3.20 s]: DE_S facing 133° from the runner (RB) at 3.5 yd for 1.35 s; asked for 133°

**Blocker on a man who is out of the play**: 927 events in 16 games

- sc11/G3-P017 @ 1.70 s [representative detector tick 4.65 s]: Z (run-block) on CB_S, 25.9 yd from the runner and moving away at 2.4 yd/s, while DT_W is free 1.4 yd from the runner, for 3.00 s
- sc11/G4-P145 @ 1.95 s [representative detector tick 4.70 s]: LT (run-block) on LB_W, 19.6 yd from the runner and moving away at 1.3 yd/s, while FS is free 0.5 yd from the runner, for 2.80 s
- sc11/G12-P009 @ 2.30 s [representative detector tick 5.05 s]: Y (run-block) on DE_W, 14.2 yd from the runner and moving away at 1.8 yd/s, while CB_S is free 0.6 yd from the runner, for 2.80 s

**Lineman backpedaling while facing his own backfield**: 1542 events in 16 games

- sc11/G16-P054 @ 2.80 s [representative detector tick 4.55 s]: C facing 180° from downfield, moving back at 4.7 yd/s for 2.50 s (pass play)
- sc11/G6-P183 @ 1.95 s [representative detector tick 3.25 s]: C facing 172° from downfield, moving back at 4.7 yd/s for 2.05 s (pass play)
- sc11/G16-P054 @ 2.95 s [representative detector tick 4.50 s]: LG facing 154° from downfield, moving back at 4.9 yd/s for 2.05 s (pass play)

**Sliding through a cut (candidate)**: 189 events in 16 games

- sc11/G5-P102 @ 3.80 s [representative detector tick 4.40 s]: X turned 65° from 5.8 yd/s keeping 87% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 41° turn
- sc11/G4-P022 @ 6.40 s [representative detector tick 7.00 s]: X turned 62° from 4.7 yd/s keeping 98% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 20° turn
- sc11/G9-P105 @ 4.50 s [representative detector tick 5.10 s]: X turned 62° from 5.1 yd/s keeping 88% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 90° turn

**Free climber requesting near-zero movement (candidate)**: 11 events in 16 games

- sc11/G3-P132 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G9-P158 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 1.25 yd/s (review braking/traffic)
- sc11/G1-P038 @ 0.20 s [representative detector tick 0.80 s]: LT (climb) free, requesting under 0.3 yd/s for 0.70 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 3 events in 16 games

- sc11/G16-P142 @ 2.75 s [representative detector tick 3.80 s]: DB trailing H within 1.45 yd through the recorded flight, body >164° from ball; arrival left-rear (173°), turned 18° (not gaze evidence)
- sc11/G4-P097 @ 2.60 s [representative detector tick 3.60 s]: SS trailing Y within 1.71 yd through the recorded flight, body >148° from ball; arrival left-rear (148°), turned 11° (not gaze evidence)
- sc11/G8-P013 @ 3.15 s [representative detector tick 4.15 s]: SS trailing Y within 1.85 yd through the recorded flight, body >158° from ball; arrival right-rear (-158°), turned 2° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 627 events in 16 games

- sc11/G16-P081 @ 1.85 s [representative detector tick 3.75 s]: RB travel -76° vs installed-aim bearing 81°; FS 0.41 yd ahead, 1.44 yd off heading (engaged false; geometry only)
- sc11/G2-P105 @ 1.85 s [representative detector tick 2.50 s]: RB travel 71° vs installed-aim bearing -60°; DE_W 0.01 yd ahead, 1.39 yd off heading (engaged true; geometry only) [play nullified by a penalty]
- sc11/G7-P038 @ 1.70 s [representative detector tick 2.75 s]: RB travel 70° vs installed-aim bearing -66°; DT_W 0.73 yd ahead, 1.39 yd off heading (engaged true; geometry only)

### qbf

**Pre-snap teammate contact**: 3 events in 16 games

- sc11/G8-P039 @ -0.60 s (pre-snap) [representative detector tick -0.05 s]: RB and F touched before the snap (no motion called), closing 0 yd/s
- sc11/G9-P078 @ -1.55 s (pre-snap) [representative detector tick -1.00 s]: RB and H touched before the snap (jet Z motion), closing 0 yd/s
- sc11/G11-P068 @ -0.35 s (pre-snap) [representative detector tick -0.25 s]: RB and H touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 317 events in 16 games

- sc11/G14-P103 @ 1.65 s [representative detector tick 2.00 s]: LB_W facing 132° from the runner (RB) at 1.9 yd for 2.20 s; asked for 129°
- sc11/G2-P176 @ 2.30 s: DE_S facing 126° from the runner (RB) at 1.8 yd for 1.25 s; asked for 132°
- sc11/G5-P103 @ 2.30 s [representative detector tick 2.40 s]: DE_S facing 134° from the runner (RB) at 2.1 yd for 1.20 s; asked for 134°

**Blocker on a man who is out of the play**: 890 events in 16 games

- sc11/G16-P034 @ 2.45 s [representative detector tick 5.60 s]: Y (climb) on LB_M, 20.3 yd from the runner and moving away at 1 yd/s, while CB_W is free 0.6 yd from the runner, for 3.20 s [play nullified by a penalty]
- sc11/G9-P016 @ 2.10 s [representative detector tick 5.20 s]: RG (run-block) on DT_S, 12.8 yd from the runner and moving away at 1.6 yd/s, while CB_S is free 0.9 yd from the runner, for 3.15 s
- sc11/G16-P034 @ 2.90 s [representative detector tick 5.60 s]: LT (run-block) on SS, 15.7 yd from the runner and moving away at 3.6 yd/s, while CB_W is free 0.6 yd from the runner, for 2.75 s [play nullified by a penalty]

**Lineman backpedaling while facing his own backfield**: 1621 events in 16 games

- sc11/G8-P169 @ 2.10 s [representative detector tick 3.10 s]: RG facing 155° from downfield, moving back at 4.9 yd/s for 2.15 s (pass play)
- sc11/G2-P152 @ 1.70 s [representative detector tick 2.90 s]: LT facing 146° from downfield, moving back at 3.8 yd/s for 2.15 s (pass play)
- sc11/G2-P171 @ 1.30 s [representative detector tick 2.80 s]: LT facing 167° from downfield, moving back at 3.9 yd/s for 2.15 s (pass play)

**Sliding through a cut (candidate)**: 187 events in 16 games

- sc11/G14-P153 @ 3.90 s [representative detector tick 4.50 s]: H turned 63° from 4.2 yd/s keeping 88% of his speed through the whole cut (NFL p90 for the role 76%); asked for a 38° turn
- sc11/G13-P169 @ 1.60 s [representative detector tick 2.40 s]: RB turned 61° from 3.5 yd/s keeping 100% of his speed through the whole cut (NFL p90 for the role 90%); asked for a 57° turn [play nullified by a penalty]
- sc11/G8-P020 @ 2.70 s [representative detector tick 3.30 s]: CB_W turned 60° from 3.6 yd/s keeping 93% of his speed through the whole cut (NFL p90 for the role 89%); asked for a 41° turn

**Free climber requesting near-zero movement (candidate)**: 5 events in 16 games

- sc11/G2-P063 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G7-P058 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G6-P017 @ 0.30 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.70 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 4 events in 16 games

- sc11/G13-P049 @ 2.00 s [representative detector tick 3.65 s]: CB_S trailing Z within 1.28 yd through the recorded flight, body >148° from ball; arrival left-rear (148°), turned 22° (not gaze evidence)
- sc11/G9-P116 @ 2.25 s [representative detector tick 3.85 s]: CB_W trailing X within 1.01 yd through the recorded flight, body >128° from ball; arrival right-rear (-179°), turned 24° (not gaze evidence)
- sc11/G14-P025 @ 2.40 s [representative detector tick 3.80 s]: CB_S trailing Z within 1.75 yd through the recorded flight, body >137° from ball; arrival right-rear (-160°), turned 15° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 617 events in 16 games

- sc11/G5-P062 @ 2.15 s [representative detector tick 2.75 s]: RB travel 74° vs installed-aim bearing -74°; DT_W 0 yd ahead, 1.47 yd off heading (engaged true; geometry only)
- sc11/G16-P017 @ 1.75 s [representative detector tick 3.55 s]: RB travel -109° vs installed-aim bearing 61°; CB_W 0.03 yd ahead, 0.99 yd off heading (engaged false; geometry only)
- sc11/G3-P007 @ 1.90 s [representative detector tick 3.70 s]: RB travel -88° vs installed-aim bearing 67°; DE_W 0.01 yd ahead, 0.99 yd off heading (engaged true; geometry only) [play nullified by a penalty]


## Largest estimated changes

- Accepted penalties / team-game: block_in_back, all plays (n=32): 0.03 → 0.25
- XP %, all plays (n=116): 90.9% (120/132) → 99.1% (115/116)
- 3rd-down conversion, all plays (n=431): 48.7% (202/415) → 39.4% (170/431)
- XP %, all plays (n=132): 90.9% (120/132) → 97.0% (128/132)
- Total yards / team-game, all plays (n=32): 516.94 → 478.37
- 3rd-down conversion, all plays (n=411): 48.7% (202/415) → 42.8% (176/411)
- Missed + broken tackles / play, all plays (n=2152): 0.27 → 0.22
- Fourth-down go % (outside Q4 last 2:30), all plays (n=220): 6.6% (12/182) → 11.4% (25/220)
scorecard: film weirdness events -> out/scorecard/weird-events.json
