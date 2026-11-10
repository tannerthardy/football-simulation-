
> gridiron-engine@0.1.0 ref
> node scripts/ref.mjs npm run scorecard -- --games 16 --leagues 2 --seed 11 --splits none --arm ref:GRASP_PATCH=0 --arm grasp:GRASP_PATCH=1 --arm both:GRASP_PATCH=1,CONTACT_LAYER=1

[ref] stack run-ref-9 @ ef4ec599

> gridiron-engine@0.1.0 scorecard
> node --import tsx scripts/scorecard/run.ts --games 16 --leagues 2 --seed 11 --splits none --arm ref:GRASP_PATCH=0 --arm grasp:GRASP_PATCH=1 --arm both:GRASP_PATCH=1,CONTACT_LAYER=1

scorecard: 3 arm(s) × 16 games in 617 s elapsed, 3 concurrent workers (4 requested)
# Scorecard

Commit `ef4ec599d4e54e348e339563702b0ddf4b64acf6` · 16 games per arm over 2 leagues · seed 11 · 2026-11-10

Rendering measurement SHA256: `bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b`. Tables use this checkout's metric definitions; producer metadata below is preserved.

Read this as a diagnosis. A band says where our football looks unrealistic; it does not decide whether a mechanism is correct. A stat that moves the wrong way usually points at another mechanism to fix next. Ranges are 90% intervals from resampling whole games; "moved" means the interval excludes zero. A dash means an unavailable measurement or no eligible denominator.

Rate counts are recorded events / eligible exposure; missing legacy counts remain unavailable. An observed 17/17 is 100%, not a certain future success rate: whole-game resampling can give a zero-width interval when every observed outcome is the same. These intervals do not rule out unobserved rare failures.

## Timing and provenance

Per-game ms is elapsed time around simulateGame only; it excludes roster generation, record/probe work and worker startup. Sums of worker elapsed times are not collection wall time or CPU time.

**producer**: commit `ef4ec599d4e54e348e339563702b0ddf4b64acf6`; Node: v22.23.3; probes: missedBy, weird.

Workers requested: 4; peak concurrent worker processes: 3.

Collection elapsed: 616.9 s. CPU time: not collected in scorecard records.

- ref: 36.0 s elapsed per game; worker processes: 1
- grasp: 38.0 s elapsed per game; worker processes: 1
- both: 38.5 s elapsed per game; worker processes: 1
- ref film weirdness detectors: 592 ms per game, 1.6% of the elapsed time (inside it, not extra)
- grasp film weirdness detectors: 627 ms per game, 1.6% of the elapsed time (inside it, not extra)
- both film weirdness detectors: 631 ms per game, 1.6% of the elapsed time (inside it, not extra)
- engineSha256: d809c35718a974492a362c8ed506e0534a4f231f725852a415cea158f1b0e912
- measurementSha256: bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b
- lockfileSha256: cee32ba14d404c05dff4e8e3b4506bc1ea1e1afbfd40b35461511e7ff8fdb98f
- platform: linux
- arch: x64
- cpuModel: Intel(R) Xeon(R) Processor @ 2.10GHz
- cpuQuotaCores: unavailable
- execution: node --import tsx
- ref resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_PATCH":false,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":false,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TOUCH_READ":true,"TURF_MU_SCALE":1,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`
- grasp resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_PATCH":true,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":false,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TOUCH_READ":true,"TURF_MU_SCALE":1,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`
- both resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":true,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_PATCH":true,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":false,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TOUCH_READ":true,"TURF_MU_SCALE":1,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`


## grasp vs ref

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | ref | grasp | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 36.53 | 41.03 | +4.50 | -0.84 to +9.69 | not resolved by this sample | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 65.84 | 67.34 | +1.50 | -0.41 to +3.66 | not resolved by this sample | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 472.17 | 523.66 | +51.49 | +10.63 to +93.57 | **moved** | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 66.0% (1390/2107) | 65.7% (1415/2155) | -0.3 | -3.4 to +2.5 | not resolved by this sample | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | OK |
| Completion % | 57.2% (708/1238) | 56.3% (715/1271) | -0.9 | -3.7 to +2.2 | not resolved by this sample | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 10.08 | 10.65 | +0.58 | -0.24 to +1.29 | not resolved by this sample | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 7.7% (107/1390) | 6.7% (95/1415) | -1.0 | -2.4 to +0.3 | not resolved by this sample | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | OK |
| INT rate | 4.3% (53/1238) | 4.5% (57/1271) | +0.2 | -1.2 to +1.3 | not resolved by this sample | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 8.5% (105/1238) | 10.1% (128/1271) | +1.6 | -0.2 to +3.3 | not resolved by this sample | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 16.3% (202/1238) | 18.4% (234/1271) | +2.1 | +0.1 to +3.9 | **moved** | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 9.53 | 9.75 | +0.22 | -0.10 to +0.59 | not resolved by this sample | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | HIGH |
| YAC / reception | 8.91 | 10.06 | +1.15 | +0.04 to +2.21 | **moved** | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.78 | 2.78 | -0.00 | -0.05 to +0.04 | not resolved by this sample | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | OK |
| Scramble rate | 2.6% (36/1390) | 2.7% (38/1415) | +0.1 | -0.7 to +0.9 | not resolved by this sample | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | OK |
| Separation at catch point (yd) | 3.32 | 3.19 | -0.13 | -0.33 to +0.05 | not resolved by this sample | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | OK |
| Rush yards / carry | 4.59 | 4.97 | +0.38 | -0.29 to +0.91 | not resolved by this sample | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | HIGH |
| Run stuff rate (<=0) | 15.1% (108/717) | 9.6% (71/740) | -5.5 | -8.0 to -3.0 | **moved** | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | LOW |
| 10+ yd runs | 9.3% (67/717) | 9.7% (72/740) | +0.4 | -1.7 to +2.7 | not resolved by this sample | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | OK |
| Runs of 20+ that reach 40 | 62.5% (10/16) | 31.6% (6/19) | -30.9 | -57.1 to -7.4 | **moved** | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | OK |
| Yards before contact (runs) | 1.01 | 0.84 | -0.17 | -0.46 to +0.07 | not resolved by this sample | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.28 | 0.33 | +0.05 | +0.02 to +0.08 | **moved** | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.16 | 0.18 | +0.03 | +0.01 to +0.05 | **moved** | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 38.0% (162/426) | 38.1% (161/423) | +0.0 | -5.6 to +5.0 | not resolved by this sample | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| FG % | 93.9% (62/66) | 93.3% (56/60) | -0.6 | -8.7 to +8.0 | not resolved by this sample | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| XP % | 98.4% (123/125) | 93.4% (127/136) | -5.0 | -8.8 to -1.2 | **moved** | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | LOW |
| Fumbles lost / team-game | 0.53 | 1.00 | +0.47 | +0.19 to +0.75 | **moved** | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Punts / team-game | 4.69 | 4.91 | +0.22 | -0.41 to +0.84 | not resolved by this sample | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Accepted penalties / team-game | 5.88 | 5.56 | -0.31 | -1.38 to +0.69 | not resolved by this sample | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 100.0% (12/12) | 100.0% (12/12) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 95.2% (20/21) | 92.3% (12/13) | -2.9 | -15.4 to +10.5 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 94.1% (16/17) | 95.0% (19/20) | +0.9 | -10.0 to +11.1 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 87.5% (14/16) | 86.7% (13/15) | -0.8 | -20.2 to +22.2 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 45.63 | 45.02 | -0.61 | -2.04 to +1.03 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 40.18 | 39.78 | -0.41 | -2.10 to +1.23 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 24.29 | 23.58 | -0.71 | -2.60 to +0.94 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 8.89 | 9.19 | +0.30 | -1.88 to +2.38 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 32.2% (73/227) | 31.0% (76/245) | -1.1 | -7.2 to +3.6 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 2.7% (4/150) | 1.9% (3/157) | -0.8 | -3.5 to +2.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 7.7% (17/222) | 2.4% (5/209) | -5.3 | -10.2 to -1.6 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 51.9% (14/27) | 57.9% (11/19) | +6.0 | -13.8 to +29.3 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 10.7% (15/140) | 16.0% (26/162) | +5.3 | +0.0 to +10.5 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 14.34 | 15.81 | +1.47 | +0.38 to +2.47 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 2.40 | 2.51 | +0.11 | -0.18 to +0.39 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 60.7% (68/112) | 64.9% (85/131) | +4.2 | -8.7 to +14.1 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 2.22 | 2.81 | +0.59 | +0.06 to +1.13 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.04 | 0.04 | -0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by LB / play | 0.05 | 0.05 | +0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by CB / play | 0.02 | 0.02 | +0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by S / play | 0.01 | 0.01 | +0.00 | -0.00 to +0.01 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.3% (counts unavailable) | 0.2% (counts unavailable) | -0.1 | -0.3 to +0.1 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.3 (6/1774) | 0.2 (4/1769) | -0.1 | -0.3 to +0.1 | not resolved by this sample | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.4 (4/898) | 0.2 (2/890) | -0.2 | -0.6 to +0.1 | not resolved by this sample | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | 0.0% (0/6) | 25.0% (1/4) | +25.0 | +0.0 to +100.0 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 19.2% (275/1435) | 21.4% (310/1447) | +2.3 | -0.5 to +4.8 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 24.3 (348/1435) | 27.0 (391/1447) | +2.8 | -0.3 to +5.9 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 59.7% (425/712) | 62.8% (456/726) | +3.1 | +0.4 to +6.3 | **moved** | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 122.6 (873/712) | 133.3 (968/726) | +10.7 | +1.3 to +20.4 | **moved** | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 2.1% (22267/1053515) | 2.1% (23594/1114905) | +0.0 | -0.1 to +0.1 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 48.2% (1015/2107) | 52.6% (1134/2155) | +4.4 | +2.2 to +7.0 | **moved** | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 78.2 (1648/2107) | 83.0 (1789/2155) | +4.8 | -0.1 to +10.2 | not resolved by this sample | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 4.2% (215/5145) | 4.5% (239/5317) | +0.3 | -0.4 to +1.1 | not resolved by this sample | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 10.2 (215/2107) | 11.1 (239/2155) | +0.9 | -0.7 to +2.7 | not resolved by this sample | internal |  |
| Accepted penalties / team-game: block_in_back | 0.13 | 0.19 | +0.06 | -0.09 to +0.22 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.06 | 0.13 | +0.06 | -0.06 to +0.19 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.59 | 0.75 | +0.16 | +0.00 to +0.31 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 2.25 | 2.03 | -0.22 | -1.00 to +0.47 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 1.00 | 0.88 | -0.13 | -0.50 to +0.22 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_touching | 0.00 | 0.03 | +0.03 | +0.00 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 0.44 | 0.66 | +0.22 | -0.09 to +0.50 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.81 | 0.50 | -0.31 | -0.53 to -0.09 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.53 | 0.31 | -0.22 | -0.50 to +0.06 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.03 | 0.03 | +0.00 | -0.06 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: unnecessary_roughness | 0.03 | 0.06 | +0.03 | -0.06 to +0.13 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## both vs ref

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | ref | both | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 36.53 | 38.69 | +2.16 | -2.94 to +6.03 | not resolved by this sample | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 65.84 | 65.56 | -0.28 | -2.63 to +1.88 | not resolved by this sample | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 472.17 | 509.43 | +37.26 | -5.88 to +75.20 | not resolved by this sample | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 66.0% (1390/2107) | 64.9% (1362/2098) | -1.1 | -3.6 to +1.6 | not resolved by this sample | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | OK |
| Completion % | 57.2% (708/1238) | 58.4% (710/1216) | +1.2 | -0.9 to +3.4 | not resolved by this sample | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 10.08 | 10.64 | +0.57 | -0.17 to +1.39 | not resolved by this sample | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 7.7% (107/1390) | 7.6% (103/1362) | -0.1 | -1.6 to +1.2 | not resolved by this sample | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | OK |
| INT rate | 4.3% (53/1238) | 4.7% (57/1216) | +0.4 | -1.1 to +2.1 | not resolved by this sample | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 8.5% (105/1238) | 9.6% (117/1216) | +1.1 | -0.0 to +2.3 | not resolved by this sample | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 16.3% (202/1238) | 17.9% (218/1216) | +1.6 | -0.8 to +4.0 | not resolved by this sample | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 9.53 | 9.48 | -0.06 | -0.39 to +0.28 | not resolved by this sample | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | HIGH |
| YAC / reception | 8.91 | 9.63 | +0.72 | -0.37 to +1.80 | not resolved by this sample | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.78 | 2.77 | -0.02 | -0.06 to +0.02 | not resolved by this sample | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | OK |
| Scramble rate | 2.6% (36/1390) | 2.5% (34/1362) | -0.1 | -0.9 to +0.6 | not resolved by this sample | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | OK |
| Separation at catch point (yd) | 3.32 | 3.34 | +0.02 | -0.18 to +0.22 | not resolved by this sample | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | HIGH |
| Rush yards / carry | 4.59 | 5.50 | +0.91 | +0.29 to +1.47 | **moved** | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | HIGH |
| Run stuff rate (<=0) | 15.1% (108/717) | 7.2% (53/736) | -7.9 | -10.3 to -5.7 | **moved** | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | LOW |
| 10+ yd runs | 9.3% (67/717) | 14.0% (103/736) | +4.7 | +2.2 to +7.2 | **moved** | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | HIGH |
| Runs of 20+ that reach 40 | 62.5% (10/16) | 37.5% (9/24) | -25.0 | -55.1 to +0.0 | not resolved by this sample | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | HIGH |
| Yards before contact (runs) | 1.01 | 0.85 | -0.16 | -0.49 to +0.18 | not resolved by this sample | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.28 | 0.36 | +0.08 | +0.05 to +0.10 | **moved** | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.16 | 0.20 | +0.04 | +0.03 to +0.06 | **moved** | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 38.0% (162/426) | 38.9% (149/383) | +0.9 | -5.4 to +5.8 | not resolved by this sample | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| FG % | 93.9% (62/66) | 80.0% (44/55) | -13.9 | -21.4 to -6.6 | **moved** | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | LOW |
| XP % | 98.4% (123/125) | 94.3% (132/140) | -4.1 | -8.5 to +0.2 | not resolved by this sample | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Fumbles lost / team-game | 0.53 | 0.78 | +0.25 | -0.06 to +0.56 | not resolved by this sample | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Punts / team-game | 4.69 | 4.22 | -0.47 | -1.16 to +0.19 | not resolved by this sample | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Accepted penalties / team-game | 5.88 | 5.78 | -0.09 | -1.00 to +0.81 | not resolved by this sample | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 100.0% (12/12) | 100.0% (18/18) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 95.2% (20/21) | 68.8% (11/16) | -26.5 | -46.7 to -9.7 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 94.1% (16/17) | 80.0% (8/10) | -14.1 | -40.9 to +5.6 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 87.5% (14/16) | 63.6% (7/11) | -23.9 | -53.3 to -1.2 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 45.63 | 45.95 | +0.31 | -0.60 to +1.41 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 40.18 | 40.61 | +0.42 | -1.20 to +2.51 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 24.29 | 24.34 | +0.04 | -2.20 to +2.17 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 8.89 | 11.05 | +2.16 | -0.32 to +4.96 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 32.2% (73/227) | 30.1% (69/229) | -2.0 | -8.0 to +3.5 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 2.7% (4/150) | 2.2% (3/135) | -0.4 | -3.0 to +2.2 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 7.7% (17/222) | 7.5% (15/200) | -0.2 | -5.1 to +4.4 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 51.9% (14/27) | 58.3% (14/24) | +6.5 | -7.5 to +25.6 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 10.7% (15/140) | 10.2% (16/157) | -0.5 | -3.8 to +2.9 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 14.34 | 14.53 | +0.19 | -1.13 to +1.31 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 2.40 | 2.54 | +0.14 | -0.15 to +0.44 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 60.7% (68/112) | 65.2% (86/132) | +4.4 | -5.7 to +14.8 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 2.22 | 2.56 | +0.34 | -0.34 to +1.22 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.04 | 0.04 | -0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by LB / play | 0.05 | 0.05 | +0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by CB / play | 0.02 | 0.02 | -0.00 | -0.01 to +0.00 | not resolved by this sample | internal |  |
| Missed tackles by S / play | 0.01 | 0.02 | +0.01 | +0.01 to +0.02 | **moved** | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.3% (counts unavailable) | 0.3% (counts unavailable) | -0.1 | -0.3 to +0.2 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.3 (6/1774) | 0.3 (5/1754) | -0.1 | -0.3 to +0.2 | not resolved by this sample | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.4 (4/898) | 0.3 (3/885) | -0.1 | -0.5 to +0.3 | not resolved by this sample | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | 0.0% (0/6) | 0.0% (0/5) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 19.2% (275/1435) | 22.4% (321/1432) | +3.3 | +0.8 to +5.7 | **moved** | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 24.3 (348/1435) | 28.2 (404/1432) | +4.0 | +0.1 to +7.5 | **moved** | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 59.7% (425/712) | 62.0% (450/726) | +2.3 | -1.7 to +6.4 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 122.6 (873/712) | 137.1 (995/726) | +14.4 | +3.8 to +25.3 | **moved** | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 2.1% (22267/1053515) | 2.1% (23050/1105950) | -0.0 | -0.1 to +0.1 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 48.2% (1015/2107) | 50.4% (1058/2098) | +2.3 | +0.2 to +4.4 | **moved** | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 78.2 (1648/2107) | 81.0 (1700/2098) | +2.8 | -2.1 to +8.2 | not resolved by this sample | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 4.2% (215/5145) | 4.2% (223/5357) | -0.0 | -0.8 to +0.8 | not resolved by this sample | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 10.2 (215/2107) | 10.6 (223/2098) | +0.4 | -1.8 to +2.6 | not resolved by this sample | internal |  |
| Accepted penalties / team-game: block_in_back | 0.13 | 0.13 | +0.00 | -0.16 to +0.13 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.06 | 0.19 | +0.13 | +0.00 to +0.28 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.59 | 0.69 | +0.09 | +0.03 to +0.19 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 2.25 | 2.31 | +0.06 | -0.63 to +0.69 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 1.00 | 0.88 | -0.13 | -0.53 to +0.22 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_touching | 0.00 | 0.03 | +0.03 | +0.00 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 0.44 | 0.41 | -0.03 | -0.34 to +0.25 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.81 | 0.41 | -0.41 | -0.72 to -0.13 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.53 | 0.53 | +0.00 | -0.19 to +0.22 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.03 | 0.19 | +0.16 | +0.03 to +0.31 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: unnecessary_roughness | 0.03 | 0.03 | +0.00 | -0.06 to +0.06 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## Watch these first

Read the clips, not the averages: each line is a place in a simulated game that a rule flagged. A rule says where to look, never what number is right, and several of its constants are chosen, not sourced (docs/VALIDATION.md). Ids with an `sc<seed>/` prefix are this run's own games, not the film room's: the full list is in the events file next to the saved card, and `npm run weird -- <seed>` plays the film-room games so its ids match `npm run replay`.

### ref

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

### grasp

**Pre-snap teammate contact**: 4 events in 16 games

- sc11/G6-P158 @ -4.20 s (pre-snap): Y and H touched before the snap (across H motion), closing 0 yd/s
- sc11/G8-P023 @ -0.55 s (pre-snap) [representative detector tick -0.20 s]: RB and F touched before the snap (no motion called), closing 0 yd/s
- sc11/G9-P064 @ -1.55 s (pre-snap) [representative detector tick -0.90 s]: RB and H touched before the snap (jet Z motion), closing 0 yd/s

**Defender turned away from a nearby runner**: 391 events in 16 games

- sc11/G6-P119 @ 2.95 s: CB_S facing 129° from the runner (RB) at 1.7 yd for 1.60 s; asked for 139°
- sc11/G8-P124 @ 1.90 s: DE_W facing 123° from the runner (RB) at 4 yd for 1.55 s; asked for 123°
- sc11/G5-P168 @ 3.85 s [representative detector tick 5.25 s]: DE_W facing 173° from the runner (RB) at 2.5 yd for 1.45 s; asked for 173°

**Blocker on a man who is out of the play**: 968 events in 16 games

- sc11/G10-P104 @ 2.10 s [representative detector tick 5.85 s]: Y (run-block) on SS, 13.6 yd from the runner and moving away at 1.1 yd/s, while NB is free 0.5 yd from the runner, for 3.80 s
- sc11/G9-P030 @ 1.15 s [representative detector tick 4.10 s]: LG (run-block) on DE_W, 12.7 yd from the runner and moving away at 0.7 yd/s, while SS is free 0.5 yd from the runner, for 3.00 s
- sc11/G4-P048 @ 1.65 s [representative detector tick 4.50 s]: Z (run-block) on LB_W, 13.4 yd from the runner and moving away at 2.4 yd/s, while CB_W is free 0.5 yd from the runner, for 2.90 s

**Lineman backpedaling while facing his own backfield**: 1789 events in 16 games

- sc11/G13-P211 @ 1.45 s [representative detector tick 4.20 s]: RG facing 152° from downfield, moving back at 4.2 yd/s for 2.95 s (pass play)
- sc11/G13-P103 @ 1.60 s [representative detector tick 2.05 s]: RG facing 172° from downfield, moving back at 3.9 yd/s for 2.35 s (pass play) [play nullified by a penalty]
- sc11/G4-P142 @ 2.55 s [representative detector tick 3.45 s]: LT facing 150° from downfield, moving back at 3.5 yd/s for 2.30 s (pass play)

**Sliding through a cut (candidate)**: 239 events in 16 games

- sc11/G15-P058 @ 3.10 s [representative detector tick 3.80 s]: X turned 67° from 4.9 yd/s keeping 85% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 119° turn
- sc11/G14-P030 @ 1.70 s [representative detector tick 2.40 s]: X turned 68° from 4.7 yd/s keeping 84% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 17° turn
- sc11/G13-P068 @ 1.10 s [representative detector tick 1.70 s]: NB turned 64° from 3.7 yd/s keeping 100% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 37° turn

**Free climber requesting near-zero movement (candidate)**: 3 events in 16 games

- sc11/G3-P142 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G6-P018 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic) [play nullified by a penalty]
- sc11/G6-P018 @ 0.45 s [representative detector tick 0.95 s]: LG (climb) free, requesting under 0.3 yd/s for 0.55 s; achieved 0 yd/s (review braking/traffic) [play nullified by a penalty]

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 2 events in 16 games

- sc11/G7-P102 @ 2.20 s [representative detector tick 3.20 s]: CB_S trailing Z within 1.42 yd through the recorded flight, body >137° from ball; arrival right-rear (-154°), turned 26° (not gaze evidence)
- sc11/G9-P165 @ 2.85 s [representative detector tick 3.80 s]: SS trailing Y within 1.48 yd through the recorded flight, body >150° from ball; arrival right-rear (-150°), turned 15° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 626 events in 16 games

- sc11/G2-P124 @ 2.00 s [representative detector tick 2.95 s]: RB travel 71° vs installed-aim bearing -72°; DT_W 0.01 yd ahead, 1.31 yd off heading (engaged true; geometry only)
- sc11/G10-P109 @ 1.20 s [representative detector tick 2.45 s]: RB travel 79° vs installed-aim bearing -79°; LB_W 0 yd ahead, 1.34 yd off heading (engaged false; geometry only)
- sc11/G7-P031 @ 2.20 s [representative detector tick 2.95 s]: RB travel 81° vs installed-aim bearing -83°; DT_W 0 yd ahead, 1.28 yd off heading (engaged true; geometry only)

### both

**Pre-snap teammate contact**: 5 events in 16 games

- sc11/G2-P078 @ -0.55 s (pre-snap) [representative detector tick -0.20 s]: RB and F touched before the snap (no motion called), closing 0 yd/s
- sc11/G5-P073 @ -0.40 s (pre-snap) [representative detector tick -0.20 s]: Y and H touched before the snap (no motion called), closing 0 yd/s
- sc11/G5-P089 @ -4.85 s (pre-snap) [representative detector tick -4.50 s]: RB and F touched before the snap (across H motion), closing 0 yd/s

**Defender turned away from a nearby runner**: 404 events in 16 games

- sc11/G12-P017 @ 2.70 s: DE_W facing 121° from the runner (RB) at 3.4 yd for 2.15 s; asked for 121°
- sc11/G14-P088 @ 2.95 s [representative detector tick 3.35 s]: DE_W facing 146° from the runner (RB) at 1.7 yd for 1.95 s; asked for 146°
- sc11/G5-P122 @ 2.55 s [representative detector tick 4.45 s]: DE_W facing 166° from the runner (RB) at 2.5 yd for 1.95 s; asked for 166° [play nullified by a penalty]

**Blocker on a man who is out of the play**: 995 events in 16 games

- sc11/G10-P124 @ 3.05 s [representative detector tick 7.00 s]: RG (run-block) on LB_W, 43.9 yd from the runner and moving away at 2.6 yd/s, while FS is free 3.4 yd from the runner, for 4.00 s
- sc11/G3-P095 @ 2.70 s [representative detector tick 5.95 s]: RT (run-block) on SS, 8.4 yd from the runner and moving away at 2.3 yd/s, while DT_W is free 0.5 yd from the runner, for 3.30 s
- sc11/G3-P116 @ 2.90 s [representative detector tick 5.95 s]: LT (run-block) on LB_M, 17.1 yd from the runner and moving away at 1.2 yd/s, while DT_S is free 0.7 yd from the runner, for 3.10 s [play nullified by a penalty]

**Lineman backpedaling while facing his own backfield**: 1700 events in 16 games

- sc11/G5-P008 @ 1.85 s [representative detector tick 2.75 s]: RG facing 142° from downfield, moving back at 5.1 yd/s for 2.40 s (pass play)
- sc11/G15-P109 @ 0.85 s [representative detector tick 2.10 s]: LT facing 154° from downfield, moving back at 4.8 yd/s for 2.35 s (pass play)
- sc11/G1-P064 @ 1.50 s [representative detector tick 2.90 s]: C facing 147° from downfield, moving back at 5.1 yd/s for 2.20 s (pass play)

**Sliding through a cut (candidate)**: 223 events in 16 games

- sc11/G16-P049 @ 1.00 s [representative detector tick 1.60 s]: LB_M turned 62° from 5.3 yd/s keeping 89% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 63° turn
- sc11/G11-P104 @ 1.40 s [representative detector tick 2.00 s]: NB turned 64° from 4.7 yd/s keeping 92% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 35° turn
- sc11/G15-P012 @ 2.90 s [representative detector tick 3.50 s]: H turned 61° from 4.5 yd/s keeping 84% of his speed through the whole cut (NFL p90 for the role 76%); asked for a 0° turn [play nullified by a penalty]

**Free climber requesting near-zero movement (candidate)**: 9 events in 16 games

- sc11/G2-P143 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic) [play nullified by a penalty]
- sc11/G6-P017 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G9-P085 @ 4.10 s [representative detector tick 4.70 s]: C (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0.2 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 5 events in 16 games

- sc11/G3-P122 @ 2.90 s [representative detector tick 4.20 s]: CB_S trailing Z within 1.84 yd through the recorded flight, body >120° from ball; arrival left-rear (139°), turned 28° (not gaze evidence)
- sc11/G11-P068 @ 2.50 s [representative detector tick 3.80 s]: NB trailing H within 1.02 yd through the recorded flight, body >127° from ball; arrival right-rear (-127°), turned 5° (not gaze evidence)
- sc11/G12-P097 @ 4.10 s [representative detector tick 5.15 s]: LB_W trailing H within 1.49 yd through the recorded flight, body >163° from ball; arrival right-rear (-165°), turned 7° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 612 events in 16 games

- sc11/G8-P134 @ 1.90 s [representative detector tick 2.05 s]: RB travel -79° vs installed-aim bearing -32°; DT_W 0.01 yd ahead, 0.47 yd off heading (engaged true; geometry only)
- sc11/G12-P002 @ 1.90 s [representative detector tick 3.00 s]: RB travel -48° vs installed-aim bearing 78°; DE_W 0.19 yd ahead, 0.97 yd off heading (engaged true; geometry only)
- sc11/G16-P060 @ 1.45 s [representative detector tick 2.80 s]: RB travel -47° vs installed-aim bearing 89°; LB_W 0.68 yd ahead, 0.95 yd off heading (engaged false; geometry only) [play nullified by a penalty]


## Largest estimated changes

- Accepted penalties / team-game: roughing_passer, all plays (n=32): 0.03 → 0.19
- FG %, all plays (n=55): 93.9% (62/66) → 80.0% (44/55)
- Runs of 20+ that reach 40, all plays (n=19): 62.5% (10/16) → 31.6% (6/19)
- Total yards / team-game, all plays (n=32): 472.17 → 523.66
- XP %, all plays (n=136): 98.4% (123/125) → 93.4% (127/136)
- Fumbles lost / team-game, all plays (n=32): 0.53 → 1.00
- Missed + broken tackles / play, all plays (n=2098): 0.28 → 0.36
- Missed tackles by S / play, all plays (n=2098): 0.01 → 0.02
scorecard: film weirdness events -> out/scorecard/weird-events.json
