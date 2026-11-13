# Scorecard

Commit `a952fe458e90bf14006ff28f1fe8b50ce68e1b90` · 6 games per arm over 2 leagues · seed 7 · 2026-11-10

Rendering measurement SHA256: `bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b`. Tables use this checkout's metric definitions; producer metadata below is preserved.

Read this as a diagnosis. A band says where our football looks unrealistic; it does not decide whether a mechanism is correct. A stat that moves the wrong way usually points at another mechanism to fix next. Ranges are 90% intervals from resampling whole games; "moved" means the interval excludes zero. A dash means an unavailable measurement or no eligible denominator.

Rate counts are recorded events / eligible exposure; missing legacy counts remain unavailable. An observed 17/17 is 100%, not a certain future success rate: whole-game resampling can give a zero-width interval when every observed outcome is the same. These intervals do not rule out unobserved rare failures.

## Timing and provenance

Per-game ms is elapsed time around simulateGame only; it excludes roster generation, record/probe work and worker startup. Sums of worker elapsed times are not collection wall time or CPU time.

**producer**: commit `a952fe458e90bf14006ff28f1fe8b50ce68e1b90`; Node: v22.23.3; probes: missedBy, weird.

Workers requested: 4; peak concurrent worker processes: 4.

Collection elapsed: 141.5 s. CPU time: not collected in scorecard records.

- ref6: 44.7 s elapsed per game; worker processes: 2
- react: 44.6 s elapsed per game; worker processes: 2
- ref6 film weirdness detectors: 763 ms per game, 1.7% of the elapsed time (inside it, not extra)
- react film weirdness detectors: 778 ms per game, 1.7% of the elapsed time (inside it, not extra)
- engineSha256: 9c05204f25759bb1ebf2f719f9ea3899ad36fb480e59c293084902f557406347
- measurementSha256: bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b
- lockfileSha256: cee32ba14d404c05dff4e8e3b4506bc1ea1e1afbfd40b35461511e7ff8fdb98f
- platform: linux
- arch: x64
- cpuModel: Intel(R) Xeon(R) Processor @ 2.10GHz
- cpuQuotaCores: unavailable
- execution: node --import tsx
- ref6 resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_REACT":false,"TIGHT_OFF":true,"TIP_AWAY":true,"TOUCH_READ":true,"TURF_MU_SCALE":1,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`
- react resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TOUCH_READ":true,"TURF_MU_SCALE":1,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`


## react vs ref6

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | ref6 | react | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 33.83 | 33.42 | -0.42 | -8.58 to +12.50 | not resolved by this sample | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 64.92 | 65.08 | +0.17 | -4.50 to +4.75 | not resolved by this sample | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 442.97 | 458.48 | +15.51 | -45.17 to +98.05 | not resolved by this sample | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 66.8% (520/779) | 65.9% (515/781) | -0.8 | -2.7 to +1.4 | not resolved by this sample | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | OK |
| Completion % | 54.1% (237/438) | 55.5% (249/449) | +1.3 | -3.3 to +5.5 | not resolved by this sample | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 10.55 | 10.26 | -0.29 | -0.97 to +0.45 | not resolved by this sample | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 12.1% (63/520) | 8.7% (45/515) | -3.4 | -7.1 to +1.0 | not resolved by this sample | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | OK |
| INT rate | 5.5% (24/438) | 4.7% (21/449) | -0.8 | -2.3 to +0.6 | not resolved by this sample | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 9.1% (40/438) | 6.9% (31/449) | -2.2 | -4.1 to -0.5 | **moved** | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 17.6% (77/438) | 16.3% (73/449) | -1.3 | -4.8 to +2.6 | not resolved by this sample | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 9.79 | 9.86 | +0.08 | -0.86 to +0.86 | not resolved by this sample | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | HIGH |
| YAC / reception | 10.53 | 9.02 | -1.51 | -3.20 to +0.34 | not resolved by this sample | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.94 | 2.77 | -0.17 | -0.25 to -0.11 | **moved** | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | OK |
| Scramble rate | 2.9% (15/520) | 2.9% (15/515) | +0.0 | -1.8 to +2.2 | not resolved by this sample | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | OK |
| Separation at catch point (yd) | 3.61 | 3.37 | -0.23 | -0.71 to +0.27 | not resolved by this sample | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | HIGH |
| Rush yards / carry | 4.65 | 4.46 | -0.18 | -1.47 to +0.94 | not resolved by this sample | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | OK |
| Run stuff rate (<=0) | 13.5% (35/259) | 12.4% (33/266) | -1.1 | -5.0 to +2.9 | not resolved by this sample | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | LOW |
| 10+ yd runs | 11.2% (29/259) | 9.4% (25/266) | -1.8 | -5.9 to +2.2 | not resolved by this sample | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | OK |
| Runs of 20+ that reach 40 | 60.0% (3/5) | 80.0% (4/5) | +20.0 | +0.0 to +75.0 | not resolved by this sample | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | HIGH |
| Yards before contact (runs) | 1.27 | 0.76 | -0.51 | -0.93 to -0.12 | **moved** | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.30 | 0.30 | -0.00 | -0.04 to +0.04 | not resolved by this sample | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.16 | 0.16 | +0.00 | -0.04 to +0.05 | not resolved by this sample | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 32.9% (53/161) | 37.7% (63/167) | +4.8 | -5.9 to +14.4 | not resolved by this sample | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| FG % | 88.9% (24/27) | 80.0% (16/20) | -8.9 | -33.7 to +15.3 | not resolved by this sample | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | LOW |
| XP % | 88.4% (38/43) | 90.7% (39/43) | +2.3 | -10.6 to +14.4 | not resolved by this sample | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | LOW |
| Fumbles lost / team-game | 0.50 | 0.83 | +0.33 | -0.08 to +0.75 | not resolved by this sample | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Punts / team-game | 5.50 | 4.92 | -0.58 | -1.33 to +0.25 | not resolved by this sample | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Accepted penalties / team-game | 4.17 | 5.67 | +1.50 | +0.75 to +2.17 | **moved** | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 100.0% (5/5) | 100.0% (6/6) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 100.0% (9/9) | 100.0% (4/4) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 100.0% (9/9) | 60.0% (3/5) | -40.0 | -66.7 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 25.0% (1/4) | 60.0% (3/5) | +35.0 | -10.0 to +83.3 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 46.70 | 46.85 | +0.15 | -1.49 to +1.52 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 42.25 | 42.26 | +0.01 | -3.72 to +3.25 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 26.38 | 24.98 | -1.40 | -3.91 to +1.57 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 8.81 | 10.00 | +1.19 | -2.98 to +6.46 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 27.4% (23/84) | 35.9% (28/78) | +8.5 | -5.7 to +21.8 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 1.5% (1/66) | 0.0% (0/59) | -1.5 | -4.3 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 3.2% (3/94) | 8.2% (7/85) | +5.0 | -0.1 to +9.3 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 62.5% (5/8) | 36.4% (4/11) | -26.1 | -50.0 to -3.2 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 10.4% (5/48) | 14.0% (7/50) | +3.6 | -7.1 to +13.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 15.50 | 14.67 | -0.83 | -2.17 to +0.92 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 2.13 | 2.09 | -0.04 | -0.46 to +0.45 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 47.5% (19/40) | 59.2% (29/49) | +11.7 | -7.8 to +32.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 2.50 | 2.58 | +0.08 | -0.92 to +0.92 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.03 | 0.03 | +0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by LB / play | 0.05 | 0.03 | -0.02 | -0.03 to +0.00 | not resolved by this sample | internal |  |
| Missed tackles by CB / play | 0.03 | 0.03 | -0.01 | -0.02 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by S / play | 0.01 | 0.01 | +0.00 | -0.00 to +0.01 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.0% (counts unavailable) | 0.3% (counts unavailable) | +0.3 | +0.0 to +0.6 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.0 (0/663) | 0.3 (2/651) | +0.3 | +0.0 to +0.6 | not resolved by this sample | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.0 (0/340) | 0.3 (1/327) | +0.3 | +0.0 to +0.9 | not resolved by this sample | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | — (0/0; no exposure) | 0.0% (0/2) | — | — to — | unavailable | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 19.2% (95/496) | 17.7% (92/520) | -1.5 | -3.6 to +0.6 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 24.4 (121/496) | 23.5 (122/520) | -0.9 | -4.1 to +2.4 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 60.1% (152/253) | 56.7% (149/263) | -3.4 | -8.2 to +0.9 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 116.6 (295/253) | 115.6 (304/263) | -1.0 | -11.9 to +9.8 | not resolved by this sample | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 2.5% (9714/393795) | 2.4% (9456/389775) | -0.0 | -0.2 to +0.2 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 51.9% (404/779) | 52.0% (406/781) | +0.1 | -2.8 to +3.0 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 86.8 (676/779) | 89.0 (695/781) | +2.2 | -4.8 to +10.0 | not resolved by this sample | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 3.8% (71/1889) | 4.5% (82/1832) | +0.7 | -0.1 to +1.5 | not resolved by this sample | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 9.1 (71/779) | 10.5 (82/781) | +1.4 | -0.5 to +3.3 | not resolved by this sample | internal |  |
| Accepted penalties / team-game: block_in_back | 0.25 | 0.25 | +0.00 | -0.25 to +0.25 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.08 | 0.00 | -0.08 | -0.25 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.33 | 0.42 | +0.08 | +0.00 to +0.25 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 2.25 | 2.67 | +0.42 | -0.42 to +1.08 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 0.83 | 0.67 | -0.17 | -0.50 to +0.08 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 0.08 | 0.83 | +0.75 | +0.42 to +1.08 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.17 | 0.33 | +0.17 | +0.00 to +0.33 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.08 | 0.42 | +0.33 | +0.17 to +0.50 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.08 | 0.08 | +0.00 | -0.17 to +0.17 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## Watch these first

Read the clips, not the averages: each line is a place in a simulated game that a rule flagged. A rule says where to look, never what number is right, and several of its constants are chosen, not sourced (docs/VALIDATION.md). Ids with an `sc<seed>/` prefix are this run's own games, not the film room's: the full list is in the events file next to the saved card, and `npm run weird -- <seed>` plays the film-room games so its ids match `npm run replay`.

### ref6

**Pre-snap teammate contact**: 0 events in 6 games

- none

**Defender turned away from a nearby runner**: 121 events in 6 games

- sc7/G1-P143 @ 4.30 s [representative detector tick 5.50 s]: DT_W facing 122° from the runner (RB) at 2.3 yd for 1.25 s; asked for 121°
- sc7/G2-P124 @ 2.55 s [representative detector tick 3.45 s]: DE_W facing 130° from the runner (RB) at 2.7 yd for 1.20 s; asked for 131° [play nullified by a penalty]
- sc7/G4-P136 @ 2.60 s: DE_W facing 123° from the runner (RB) at 3.6 yd for 1.15 s; asked for 123°

**Blocker on a man who is out of the play**: 295 events in 6 games

- sc7/G5-P092 @ 2.55 s [representative detector tick 6.30 s]: C (run-block) on DT_S, 23 yd from the runner and moving away at 1.2 yd/s, while FS is free 0.5 yd from the runner, for 3.80 s
- sc7/G1-P064 @ 2.05 s [representative detector tick 5.10 s]: X (run-block) on CB_W, 25.3 yd from the runner and moving away at 0.9 yd/s, while DE_S is free 2.1 yd from the runner, for 3.10 s
- sc7/G5-P092 @ 3.40 s [representative detector tick 6.30 s]: LT (run-block) on LB_W, 17.3 yd from the runner and moving away at 2.6 yd/s, while FS is free 0.5 yd from the runner, for 2.95 s

**Lineman backpedaling while facing his own backfield**: 676 events in 6 games

- sc7/G4-P071 @ 2.25 s [representative detector tick 3.30 s]: RG facing 179° from downfield, moving back at 4.6 yd/s for 2.55 s (pass play)
- sc7/G1-P175 @ 0.95 s [representative detector tick 2.20 s]: LG facing 180° from downfield, moving back at 2.3 yd/s for 2.35 s (pass play) [play nullified by a penalty]
- sc7/G5-P046 @ 1.80 s [representative detector tick 3.70 s]: LT facing 170° from downfield, moving back at 5.1 yd/s for 2.25 s (pass play)

**Sliding through a cut (candidate)**: 71 events in 6 games

- sc7/G6-P096 @ 4.20 s [representative detector tick 4.80 s]: DE_W turned 61° from 4.2 yd/s keeping 87% of his speed through the whole cut (NFL p90 for the role 73%); asked for a 29° turn
- sc7/G5-P129 @ 2.80 s [representative detector tick 3.40 s]: DT_S turned 60° from 4.2 yd/s keeping 81% of his speed through the whole cut (NFL p90 for the role 77%); asked for a 18° turn
- sc7/G6-P095 @ 1.00 s [representative detector tick 1.60 s]: Z turned 62° from 3.5 yd/s keeping 96% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 18° turn [play nullified by a penalty]

**Free climber requesting near-zero movement (candidate)**: 4 events in 6 games

- sc7/G5-P063 @ 0.45 s [representative detector tick 0.95 s]: RG (climb) free, requesting under 0.3 yd/s for 0.55 s; achieved 0 yd/s (review braking/traffic)
- sc7/G3-P104 @ 1.95 s [representative detector tick 2.35 s]: RT (climb) free, requesting under 0.3 yd/s for 0.45 s; achieved 1.97 yd/s (review braking/traffic)
- sc7/G4-P179 @ 3.75 s [representative detector tick 4.15 s]: C (climb) free, requesting under 0.3 yd/s for 0.45 s; achieved 0.39 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 6 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 1 event in 6 games

- sc7/G3-P189 @ 2.85 s [representative detector tick 3.90 s]: SS trailing Y within 1.89 yd through the recorded flight, body >148° from ball; arrival left-rear (148°), turned 8° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 221 events in 6 games

- sc7/G5-P013 @ 1.65 s [representative detector tick 2.30 s]: RB travel 77° vs installed-aim bearing -49°; DT_W 0.12 yd ahead, 1.4 yd off heading (engaged true; geometry only)
- sc7/G3-P064 @ 1.85 s [representative detector tick 3.20 s]: RB travel 93° vs installed-aim bearing -89°; NB 0.01 yd ahead, 1 yd off heading (engaged false; geometry only)
- sc7/G2-P069 @ 1.80 s [representative detector tick 2.60 s]: RB travel -94° vs installed-aim bearing 73°; DT_S 0.44 yd ahead, 0.33 yd off heading (engaged true; geometry only)

### react

**Pre-snap teammate contact**: 2 events in 6 games

- sc7/G2-P167 @ -1.75 s (pre-snap) [representative detector tick -1.60 s]: RB and H touched before the snap (jet Z motion), closing 0 yd/s
- sc7/G5-P106 @ -0.05 s (pre-snap): RB and H touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 122 events in 6 games

- sc7/G3-P007 @ 3.20 s [representative detector tick 3.80 s]: DE_W facing 144° from the runner (RB) at 2.6 yd for 2.00 s; asked for 144°
- sc7/G2-P174 @ 2.55 s [representative detector tick 2.65 s]: DE_W facing 144° from the runner (RB) at 2.2 yd for 1.30 s; asked for 146° [play nullified by a penalty]
- sc7/G3-P162 @ 3.00 s [representative detector tick 4.20 s]: DE_S facing 175° from the runner (RB) at 1.6 yd for 1.25 s; asked for 175° [play nullified by a penalty]

**Blocker on a man who is out of the play**: 304 events in 6 games

- sc7/G4-P062 @ 3.15 s [representative detector tick 6.60 s]: RT (run-block) on LB_W, 27.5 yd from the runner and moving away at 2.6 yd/s, while NB is free 0.5 yd from the runner, for 3.50 s
- sc7/G4-P126 @ 2.45 s [representative detector tick 5.75 s]: H (run-block) on LB_M, 10.9 yd from the runner and moving away at 2 yd/s, while NB is free 0.5 yd from the runner, for 3.35 s
- sc7/G5-P119 @ 2.00 s [representative detector tick 5.20 s]: LT (run-block) on LB_W, 26.2 yd from the runner and moving away at 2.5 yd/s, while CB_W is free 0.5 yd from the runner, for 3.25 s

**Lineman backpedaling while facing his own backfield**: 695 events in 6 games

- sc7/G6-P168 @ 1.65 s [representative detector tick 2.65 s]: C facing 177° from downfield, moving back at 4.9 yd/s for 2.05 s (pass play)
- sc7/G3-P107 @ 1.50 s [representative detector tick 2.65 s]: RT facing 133° from downfield, moving back at 4.2 yd/s for 2.00 s (pass play)
- sc7/G5-P051 @ 1.70 s [representative detector tick 1.95 s]: LG facing 173° from downfield, moving back at 4 yd/s for 1.90 s (pass play)

**Sliding through a cut (candidate)**: 82 events in 6 games

- sc7/G4-P117 @ 3.70 s [representative detector tick 4.30 s]: X turned 60° from 4.3 yd/s keeping 85% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 11° turn
- sc7/G5-P129 @ 6.30 s [representative detector tick 6.90 s]: DB turned 61° from 3.7 yd/s keeping 94% of his speed through the whole cut (NFL p90 for the role 89%); asked for a 25° turn
- sc7/G5-P151 @ 2.20 s [representative detector tick 2.80 s]: H turned 61° from 4 yd/s keeping 86% of his speed through the whole cut (NFL p90 for the role 76%); asked for a 6° turn

**Free climber requesting near-zero movement (candidate)**: 3 events in 6 games

- sc7/G5-P162 @ 0.40 s [representative detector tick 0.95 s]: LG (climb) free, requesting under 0.3 yd/s for 0.60 s; achieved 0 yd/s (review braking/traffic)
- sc7/G2-P133 @ 3.75 s [representative detector tick 4.15 s]: C (climb) free, requesting under 0.3 yd/s for 0.45 s; achieved 2.6 yd/s (review braking/traffic)
- sc7/G1-P098 @ 2.45 s [representative detector tick 2.80 s]: LG (climb) free, requesting under 0.3 yd/s for 0.40 s; achieved 0.6 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 6 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 2 events in 6 games

- sc7/G6-P108 @ 2.55 s [representative detector tick 3.85 s]: FS trailing RB within 1.9 yd through the recorded flight, body >155° from ball; arrival left-rear (162°), turned 10° (not gaze evidence)
- sc7/G6-P015 @ 2.55 s [representative detector tick 3.65 s]: NB trailing H within 1.2 yd through the recorded flight, body >128° from ball; arrival right-rear (-130°), turned 25° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 220 events in 6 games

- sc7/G6-P134 @ 2.10 s [representative detector tick 3.90 s]: RB travel -47° vs installed-aim bearing 90°; DE_S 0.14 yd ahead, 0.62 yd off heading (engaged true; geometry only) [play nullified by a penalty]
- sc7/G3-P127 @ 1.60 s [representative detector tick 2.50 s]: RB travel -60° vs installed-aim bearing 62°; DT_S 0.09 yd ahead, 1.38 yd off heading (engaged true; geometry only)
- sc7/G4-P183 @ 1.75 s [representative detector tick 3.10 s]: RB travel 71° vs installed-aim bearing -90°; DE_W 0.12 yd ahead, 1.06 yd off heading (engaged true; geometry only)


## Largest estimated changes

- Accepted penalties / team-game: intentional_grounding, all plays (n=12): 0.08 → 0.83
- Accepted penalties / team-game: offside, all plays (n=12): 0.08 → 0.42
- Pass TD rate, all plays (n=449): 9.1% (40/438) → 6.9% (31/449)
- Time to throw (s), all plays (n=449): 2.94 → 2.77
- Yards before contact (runs), all plays (n=264): 1.27 → 0.76
- Fourth-down conversion % (all official attempts), all plays (n=11): 62.5% (5/8) → 36.4% (4/11)
- Accepted penalties / team-game, all plays (n=12): 4.17 → 5.67
