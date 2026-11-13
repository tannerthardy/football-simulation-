# Scorecard

Commit `9015312a904b82ddff386898ba8a26ba98b1c57e` · 6 games per arm over 2 leagues · seed 7 · 2026-11-09

Rendering measurement SHA256: `bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b`. Tables use this checkout's metric definitions; producer metadata below is preserved.

Read this as a diagnosis. A band says where our football looks unrealistic; it does not decide whether a mechanism is correct. A stat that moves the wrong way usually points at another mechanism to fix next. Ranges are 90% intervals from resampling whole games; "moved" means the interval excludes zero. A dash means an unavailable measurement or no eligible denominator.

Rate counts are recorded events / eligible exposure; missing legacy counts remain unavailable. An observed 17/17 is 100%, not a certain future success rate: whole-game resampling can give a zero-width interval when every observed outcome is the same. These intervals do not rule out unobserved rare failures.

## Timing and provenance

Per-game ms is elapsed time around simulateGame only; it excludes roster generation, record/probe work and worker startup. Sums of worker elapsed times are not collection wall time or CPU time.

**producer**: commit `9015312a904b82ddff386898ba8a26ba98b1c57e`; Node: v22.23.3; probes: missedBy, weird.

Workers requested: 4; peak concurrent worker processes: 4.

Collection elapsed: 122.8 s. CPU time: not collected in scorecard records.

- defaults: 38.6 s elapsed per game; worker processes: 2
- ref: 38.4 s elapsed per game; worker processes: 2
- defaults film weirdness detectors: 718 ms per game, 1.9% of the elapsed time (inside it, not extra)
- ref film weirdness detectors: 675 ms per game, 1.8% of the elapsed time (inside it, not extra)
- engineSha256: 0eb485b3e93e74ea605a58f8cf2f9d3b975254177a429323b814d6cf5c66f4c0
- measurementSha256: bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b
- lockfileSha256: cee32ba14d404c05dff4e8e3b4506bc1ea1e1afbfd40b35461511e7ff8fdb98f
- platform: linux
- arch: x64
- cpuModel: Intel(R) Xeon(R) Processor @ 2.30GHz
- cpuQuotaCores: unavailable
- execution: node --import tsx
- defaults resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":false,"ANCHOR_GRADE":false,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_TAKEON":false,"BACKFIELD_DEPTH":false,"BACKSIDE_COMBO":false,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":false,"BLOCKED_REACH":true,"BLOCKER_NEXT":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":false,"CLIMB_INTERCEPT":true,"CLIMB_PATH":false,"CLIMB_PLAN":true,"CLIMB_PREP":false,"CLIMB_RIP":false,"CLIMB_RUNNER_SIDE":false,"CLIMB_SLIDE":false,"CLIMB_SQUARE":false,"COUNTER_C":false,"COUNTER_OFFSET":false,"COVER_CALL":true,"CUTOFF_RACE":false,"DB_SLOWPLAY":false,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":false,"DOUBLE_HANDOFF":false,"DOUBLE_OVERTAKE":false,"DOUBLE_TRACK":false,"DRAW_NFL":false,"DRAW_READ":true,"EDGE_CONTAIN":true,"END_CHASE":false,"ENGAGED_DEFENDER":false,"ENGAGED_TECHNIQUE":false,"FB_PLAYSIDE":false,"FEET_SETTLE":false,"FLAT_PRESS":false,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":false,"GAP_MATCH":true,"GAZE":false,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":false,"GUN_MESH_GO":false,"GUN_SNAP":false,"GUN_STRETCH_T":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":false,"HELD_SWING":false,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":false,"IZ_GUN_A":false,"IZ_OFFSET":false,"KEEPER_TORSO":true,"KEY_DEPTH":false,"KEY_PACE":false,"KEY_REACT":false,"L2_BREAKDOWN":false,"LB_GUARD_STEP":false,"LB_LANDMARK":true,"LB_LINE_FLOW":false,"LB_PLAN":true,"LB_READ_STEP":false,"LEG_ALLOMETRY":false,"LEVEL2_TIME":false,"LEVER_FACING":true,"LINE_STEP":false,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":false,"MESH_NFL":false,"MESH_TEMPO":false,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":false,"MUG_PRESSURES":false,"NICKEL_FRONTS":false,"NO_CROSS":false,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OZ_HIP_READ":false,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":false,"RB_FLOW":false,"RB_GATHER":false,"RB_HELD":false,"RB_STEER":false,"RB_TEMPO":false,"REACH_CARRY":false,"REACH_CLOSE":false,"REACH_CONTACT":false,"REACH_FLAT":false,"REACH_RACE":false,"REACH_TECHNIQUE":false,"READ_EYES":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":false,"RELEASE_QUICK":false,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":false,"RUN_CONFIRM":false,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":false,"RUN_HANDS":false,"RUN_HAND_MOVE":false,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":false,"SHED_PAST_GATE":false,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":false,"SHELL_SHOW":true,"SHORT_BASE":false,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":false,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":false,"STRETCH_MESH":true,"STRETCH_OFFSET":false,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":false,"THREAT_READ":true,"TIGHT_OFF":false,"TIP_AWAY":true,"TOUCH_READ":false,"TURF_MU_SCALE":1,"WING_CALL":false,"WING_WORK":false,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":false,"ZONE_FLOW":true,"ZONE_GAP":false,"ZONE_MUG":false,"ZONE_ONBALL":false,"ZONE_PAIR":false,"ZONE_RUN":false,"ZONE_SCOOP":false,"ZONE_SETTLE":true,"ZONE_WINGS":false}`
- ref resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TOUCH_READ":true,"TURF_MU_SCALE":1,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`


## ref vs defaults

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | defaults | ref | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 52.92 | 41.25 | -11.67 | -21.75 to -1.33 | **moved** | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 68.08 | 66.33 | -1.75 | -6.67 to +3.08 | not resolved by this sample | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 632.06 | 469.77 | -162.29 | -238.42 to -82.02 | **moved** | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 64.0% (523/817) | 67.8% (540/796) | +3.8 | -0.8 to +8.9 | not resolved by this sample | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | HIGH |
| Completion % | 55.0% (253/460) | 53.7% (242/451) | -1.3 | -6.2 to +2.1 | not resolved by this sample | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 12.15 | 11.37 | -0.78 | -2.19 to +0.55 | not resolved by this sample | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 9.6% (50/523) | 12.4% (67/540) | +2.8 | +1.7 to +4.4 | **moved** | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | HIGH |
| INT rate | 3.5% (16/460) | 4.2% (19/451) | +0.7 | +0.2 to +1.4 | **moved** | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 12.2% (56/460) | 11.3% (51/451) | -0.9 | -3.7 to +1.6 | not resolved by this sample | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 21.7% (100/460) | 20.2% (91/451) | -1.6 | -6.5 to +2.7 | not resolved by this sample | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 9.57 | 9.65 | +0.09 | -0.52 to +0.80 | not resolved by this sample | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | HIGH |
| YAC / reception | 13.33 | 11.91 | -1.42 | -3.47 to +0.73 | not resolved by this sample | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.88 | 2.95 | +0.06 | -0.04 to +0.16 | not resolved by this sample | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | HIGH |
| Scramble rate | 2.3% (12/523) | 3.5% (19/540) | +1.2 | -0.3 to +2.8 | not resolved by this sample | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | OK |
| Separation at catch point (yd) | 3.77 | 3.57 | -0.19 | -0.54 to +0.11 | not resolved by this sample | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | HIGH |
| Rush yards / carry | 7.95 | 3.61 | -4.34 | -6.20 to -2.85 | **moved** | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | LOW |
| Run stuff rate (<=0) | 11.2% (33/294) | 14.1% (36/256) | +2.8 | -0.5 to +8.1 | not resolved by this sample | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | LOW |
| 10+ yd runs | 21.1% (62/294) | 7.0% (18/256) | -14.1 | -17.2 to -11.0 | **moved** | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | LOW |
| Runs of 20+ that reach 40 | 61.9% (13/21) | 50.0% (1/2) | -11.9 | -54.2 to +32.3 | not resolved by this sample | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | HIGH |
| Yards before contact (runs) | 1.33 | 0.76 | -0.57 | -1.08 to -0.13 | **moved** | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.41 | 0.32 | -0.08 | -0.12 to -0.04 | **moved** | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.26 | 0.18 | -0.08 | -0.12 to -0.04 | **moved** | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 43.8% (71/162) | 28.0% (46/164) | -15.8 | -28.5 to -5.2 | **moved** | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | LOW |
| FG % | 75.0% (15/20) | 84.0% (21/25) | +9.0 | -10.6 to +33.3 | not resolved by this sample | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| XP % | 96.1% (74/77) | 96.3% (52/54) | +0.2 | -1.3 to +2.6 | not resolved by this sample | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Fumbles lost / team-game | 0.50 | 0.33 | -0.17 | -0.42 to +0.08 | not resolved by this sample | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | LOW |
| Punts / team-game | 4.92 | 6.25 | +1.33 | -0.67 to +3.50 | not resolved by this sample | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Accepted penalties / team-game | 5.42 | 5.42 | +0.00 | -1.50 to +1.33 | not resolved by this sample | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 100.0% (5/5) | 100.0% (11/11) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 85.7% (6/7) | 83.3% (5/6) | -2.4 | -33.3 to +5.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 66.7% (2/3) | 40.0% (2/5) | -26.7 | -66.7 to +25.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 40.0% (2/5) | 100.0% (3/3) | +60.0 | +25.0 to +100.0 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 45.20 | 47.45 | +2.25 | +0.46 to +4.08 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 40.43 | 43.14 | +2.72 | -0.28 to +4.95 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 25.98 | 25.66 | -0.33 | -5.39 to +4.52 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 11.19 | 11.03 | -0.16 | -2.92 to +2.71 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 30.8% (33/107) | 28.6% (26/91) | -2.3 | -8.6 to +5.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 0.0% (0/59) | 0.0% (0/75) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 3.8% (3/78) | 9.7% (10/103) | +5.9 | +0.0 to +11.3 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 40.0% (2/5) | 66.7% (8/12) | +26.7 | -10.0 to +85.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 8.3% (7/84) | 10.0% (6/60) | +1.7 | -1.4 to +3.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 16.42 | 16.67 | +0.25 | -2.58 to +3.08 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 3.09 | 2.40 | -0.69 | -1.05 to -0.27 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 74.0% (37/50) | 56.3% (27/48) | -17.8 | -30.9 to -6.7 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 1.83 | 1.92 | +0.08 | -0.33 to +0.50 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.05 | 0.03 | -0.01 | -0.02 to -0.00 | **moved** | internal |  |
| Missed tackles by LB / play | 0.06 | 0.05 | -0.01 | -0.03 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by CB / play | 0.03 | 0.02 | -0.02 | -0.03 to -0.00 | **moved** | internal |  |
| Missed tackles by S / play | 0.02 | 0.01 | -0.01 | -0.02 to -0.00 | **moved** | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.0% (counts unavailable) | 1.7% (counts unavailable) | +1.7 | +0.9 to +2.5 | **moved** | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.0 (0/518) | 1.7 (8/475) | +1.7 | +0.9 to +2.4 | **moved** | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.0 (0/161) | 3.0 (4/133) | +3.0 | +1.6 to +4.4 | **moved** | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | — (0/0; no exposure) | 0.0% (0/8) | — | — to — | unavailable | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 15.3% (83/544) | 21.2% (108/509) | +6.0 | +2.5 to +9.6 | **moved** | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 17.1 (93/544) | 26.7 (136/509) | +9.6 | +5.9 to +13.0 | **moved** | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 50.3% (148/294) | 56.7% (144/254) | +6.4 | +1.4 to +10.8 | **moved** | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 84.7 (249/294) | 111.8 (284/254) | +27.1 | +16.0 to +37.4 | **moved** | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 2.3% (9895/426155) | 2.5% (10102/401435) | +0.2 | +0.1 to +0.3 | **moved** | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 56.4% (461/817) | 54.1% (431/796) | -2.3 | -5.3 to -0.0 | **moved** | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 93.1 (761/817) | 90.2 (718/796) | -2.9 | -8.0 to +3.0 | not resolved by this sample | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 4.9% (95/1922) | 4.4% (88/1994) | -0.5 | -1.7 to +0.5 | not resolved by this sample | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 11.6 (95/817) | 11.1 (88/796) | -0.6 | -3.5 to +2.6 | not resolved by this sample | internal |  |
| Accepted penalties / team-game: block_in_back | 0.25 | 0.08 | -0.17 | -0.42 to +0.08 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.17 | 0.08 | -0.08 | -0.25 to +0.17 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.50 | 0.50 | +0.00 | -0.17 to +0.17 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 1.33 | 2.08 | +0.75 | +0.08 to +1.42 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 0.67 | 0.58 | -0.08 | -0.25 to +0.17 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 1.17 | 1.00 | -0.17 | -0.67 to +0.33 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.42 | 0.42 | +0.00 | -0.42 to +0.42 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.67 | 0.42 | -0.25 | -0.67 to +0.08 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.25 | 0.25 | +0.00 | -0.25 to +0.25 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## Watch these first

Read the clips, not the averages: each line is a place in a simulated game that a rule flagged. A rule says where to look, never what number is right, and several of its constants are chosen, not sourced (docs/VALIDATION.md). Ids with an `sc<seed>/` prefix are this run's own games, not the film room's: the full list is in the events file next to the saved card, and `npm run weird -- <seed>` plays the film-room games so its ids match `npm run replay`.

### defaults

**Pre-snap teammate contact**: 0 events in 6 games

- none

**Defender turned away from a nearby runner**: 93 events in 6 games

- sc7/G1-P040 @ 2.75 s [representative detector tick 4.15 s]: DE_W facing 172° from the runner (RB) at 2.9 yd for 1.50 s; asked for 172°
- sc7/G6-P039 @ 1.65 s [representative detector tick 1.75 s]: DE_S facing 140° from the runner (RB) at 3.2 yd for 1.50 s; asked for 141°
- sc7/G6-P023 @ 3.10 s [representative detector tick 4.10 s]: DE_S facing 152° from the runner (RB) at 2.4 yd for 1.45 s; asked for 152°

**Blocker on a man who is out of the play**: 249 events in 6 games

- sc7/G5-P002 @ 4.50 s [representative detector tick 7.75 s]: RT (run-block) on NB, 10.6 yd from the runner and moving away at 3.4 yd/s, while FS is free 0.5 yd from the runner, for 3.30 s
- sc7/G5-P002 @ 5.25 s [representative detector tick 7.75 s]: LG (run-block) on DT_W, 10.9 yd from the runner and moving away at 1.1 yd/s, while FS is free 0.5 yd from the runner, for 2.55 s
- sc7/G4-P076 @ 2.90 s [representative detector tick 5.35 s]: LT (run-block) on CB_W, 8.3 yd from the runner and moving away at 3.3 yd/s, while LB_W is free 0.7 yd from the runner, for 2.50 s

**Lineman backpedaling while facing his own backfield**: 761 events in 6 games

- sc7/G4-P189 @ 1.50 s [representative detector tick 3.35 s]: C facing 177° from downfield, moving back at 4.1 yd/s for 2.55 s (pass play)
- sc7/G1-P032 @ 1.70 s [representative detector tick 2.85 s]: C facing 180° from downfield, moving back at 5.2 yd/s for 2.40 s (pass play)
- sc7/G2-P002 @ 1.85 s [representative detector tick 4.10 s]: LG facing 172° from downfield, moving back at 4.8 yd/s for 2.35 s (pass play)

**Sliding through a cut (candidate)**: 95 events in 6 games

- sc7/G5-P075 @ 2.70 s [representative detector tick 3.30 s]: DE_W turned 61° from 3.8 yd/s keeping 97% of his speed through the whole cut (NFL p90 for the role 73%); asked for a 12° turn
- sc7/G2-P071 @ 1.80 s [representative detector tick 2.40 s]: RB turned 60° from 3.9 yd/s keeping 92% of his speed through the whole cut (NFL p90 for the role 90%); asked for a 95° turn
- sc7/G3-P124 @ 1.70 s [representative detector tick 2.30 s]: NB turned 61° from 3.8 yd/s keeping 93% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 17° turn

**Free climber requesting near-zero movement (candidate)**: 6 events in 6 games

- sc7/G4-P192 @ 0.45 s [representative detector tick 0.95 s]: LG (climb) free, requesting under 0.3 yd/s for 0.55 s; achieved 0 yd/s (review braking/traffic)
- sc7/G1-P115 @ 2.00 s [representative detector tick 2.45 s]: RT (climb) free, requesting under 0.3 yd/s for 0.50 s; achieved 0 yd/s (review braking/traffic)
- sc7/G4-P073 @ 4.10 s [representative detector tick 4.55 s]: LT (climb) free, requesting under 0.3 yd/s for 0.50 s; achieved 0.46 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 6 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 3 events in 6 games

- sc7/G6-P158 @ 2.80 s [representative detector tick 4.35 s]: SS trailing Y within 1.5 yd through the recorded flight, body >121° from ball; arrival right-rear (-121°), turned 9° (not gaze evidence)
- sc7/G3-P040 @ 3.00 s [representative detector tick 4.10 s]: DB trailing Y within 1.62 yd through the recorded flight, body >129° from ball; arrival right-rear (-129°), turned 5° (not gaze evidence)
- sc7/G6-P073 @ 2.70 s [representative detector tick 3.65 s]: NB trailing Y within 1.49 yd through the recorded flight, body >163° from ball; arrival right-rear (-164°), turned 7° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 227 events in 6 games

- sc7/G3-P063 @ 2.10 s [representative detector tick 2.95 s]: RB travel -79° vs installed-aim bearing 77°; DT_W 0.26 yd ahead, 1.09 yd off heading (engaged false; geometry only) [play nullified by a penalty]
- sc7/G6-P117 @ 2.70 s [representative detector tick 2.95 s]: RB travel 88° vs installed-aim bearing -16°; LB_M 0.03 yd ahead, 1.11 yd off heading (engaged false; geometry only)
- sc7/G2-P010 @ 1.65 s [representative detector tick 2.20 s]: RB travel 42° vs installed-aim bearing -25°; DE_W 1.02 yd ahead, 1.44 yd off heading (engaged true; geometry only)

### ref

**Pre-snap teammate contact**: 8 events in 6 games

- sc7/G1-P036 @ -0.05 s (pre-snap): RB and F touched before the snap (no motion called), closing 0 yd/s
- sc7/G2-P043 @ -4.80 s (pre-snap) [representative detector tick -4.55 s]: RB and F touched before the snap (across Z motion), closing 0 yd/s
- sc7/G3-P056 @ -1.05 s (pre-snap) [representative detector tick -0.50 s]: RB and F touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 136 events in 6 games

- sc7/G5-P014 @ 2.85 s [representative detector tick 3.45 s]: DE_W facing 123° from the runner (RB) at 1.2 yd for 1.80 s; asked for 123°
- sc7/G5-P014 @ 3.40 s [representative detector tick 3.80 s]: DE_S facing 137° from the runner (RB) at 2.4 yd for 1.65 s; asked for 137°
- sc7/G1-P015 @ 3.05 s [representative detector tick 3.20 s]: DE_S facing 126° from the runner (RB) at 1.4 yd for 1.10 s; asked for 127°

**Blocker on a man who is out of the play**: 284 events in 6 games

- sc7/G5-P010 @ 2.00 s [representative detector tick 4.85 s]: Z (run-block) on LB_W, 12.8 yd from the runner and moving away at 2.1 yd/s, while CB_W is free 3.2 yd from the runner, for 2.90 s
- sc7/G2-P184 @ 3.60 s [representative detector tick 6.25 s]: RT (run-block) on LB_M, 15.5 yd from the runner and moving away at 3 yd/s, while DE_S is free 2.4 yd from the runner, for 2.70 s
- sc7/G2-P022 @ 1.35 s [representative detector tick 3.95 s]: Y (run-block) on NB, 16.6 yd from the runner and moving away at 0.6 yd/s, while DE_W is free 0.5 yd from the runner, for 2.65 s

**Lineman backpedaling while facing his own backfield**: 718 events in 6 games

- sc7/G2-P062 @ 1.50 s [representative detector tick 2.75 s]: RG facing 146° from downfield, moving back at 5.3 yd/s for 2.65 s (pass play)
- sc7/G1-P077 @ 1.35 s [representative detector tick 2.90 s]: RG facing 149° from downfield, moving back at 4.9 yd/s for 2.35 s (pass play)
- sc7/G2-P120 @ 0.85 s [representative detector tick 2.20 s]: RT facing 154° from downfield, moving back at 4.3 yd/s for 2.35 s (pass play)

**Sliding through a cut (candidate)**: 88 events in 6 games

- sc7/G5-P012 @ 1.60 s [representative detector tick 2.20 s]: H turned 61° from 4.9 yd/s keeping 82% of his speed through the whole cut (NFL p90 for the role 76%); asked for a 62° turn
- sc7/G3-P079 @ 4.00 s [representative detector tick 4.70 s]: X turned 76° from 4.5 yd/s keeping 86% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 59° turn
- sc7/G1-P100 @ 2.90 s [representative detector tick 3.50 s]: CB_W turned 70° from 4.3 yd/s keeping 89% of his speed through the whole cut (NFL p90 for the role 89%); asked for a 86° turn

**Free climber requesting near-zero movement (candidate)**: 1 event in 6 games

- sc7/G3-P062 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 6 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 0 events in 6 games

- none

**Runner leaves installed aim toward a nearby defender (candidate)**: 211 events in 6 games

- sc7/G1-P015 @ 1.80 s [representative detector tick 3.25 s]: RB travel -42° vs installed-aim bearing 90°; DE_S 0.06 yd ahead, 1.43 yd off heading (engaged false; geometry only)
- sc7/G3-P095 @ 1.80 s [representative detector tick 2.75 s]: RB travel 7° vs installed-aim bearing -68°; DE_W 0.01 yd ahead, 1.04 yd off heading (engaged true; geometry only)
- sc7/G6-P110 @ 1.50 s [representative detector tick 1.85 s]: RB travel 51° vs installed-aim bearing -28°; DT_S 0.1 yd ahead, 1.4 yd off heading (engaged true; geometry only)


## Largest estimated changes

- Total yards / team-game, all plays (n=12): 632.06 → 469.77
- Points / team-game, all plays (n=12): 52.92 → 41.25
- 3rd-down conversion, all plays (n=164): 43.8% (71/162) → 28.0% (46/164)
- Rush yards / carry, all plays (n=256): 7.95 → 3.61
- Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion, all plays (n=133): 0.0 (0/161) → 3.0 (4/133)
- 10+ yd runs, all plays (n=256): 21.1% (62/294) → 7.0% (18/256)
- Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging), all plays (n=475): 0.0% (counts unavailable) → 1.7% (counts unavailable)
- Pre-snap teammate contact: events per 100 plays with pre-snap staging, all plays (n=475): 0.0 (0/518) → 1.7 (8/475)
