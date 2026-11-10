
> gridiron-engine@0.1.0 ref
> node scripts/ref.mjs npm run scorecard -- --games 16 --leagues 2 --seed 11 --splits none --arm ref:GRASP_PATCH=0 --arm finish:HOLD_FINISH=1,HIP_BRACE=1 --arm pkg:HOLD_FINISH=1,HIP_BRACE=1,GRASP_PATCH=1 --arm pkgLayer:HOLD_FINISH=1,HIP_BRACE=1,GRASP_PATCH=1,CONTACT_LAYER=1

[ref] stack run-ref-10 @ 759fcf3c

> gridiron-engine@0.1.0 scorecard
> node --import tsx scripts/scorecard/run.ts --games 16 --leagues 2 --seed 11 --splits none --arm ref:GRASP_PATCH=0 --arm finish:HOLD_FINISH=1,HIP_BRACE=1 --arm pkg:HOLD_FINISH=1,HIP_BRACE=1,GRASP_PATCH=1 --arm pkgLayer:HOLD_FINISH=1,HIP_BRACE=1,GRASP_PATCH=1,CONTACT_LAYER=1

scorecard: 4 arm(s) × 16 games in 807 s elapsed, 4 concurrent workers (4 requested)
# Scorecard

Commit `759fcf3c97e3717dfc8215ef4f4153f770619ae4` · 16 games per arm over 2 leagues · seed 11 · 2026-11-10

Rendering measurement SHA256: `bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b`. Tables use this checkout's metric definitions; producer metadata below is preserved.

Read this as a diagnosis. A band says where our football looks unrealistic; it does not decide whether a mechanism is correct. A stat that moves the wrong way usually points at another mechanism to fix next. Ranges are 90% intervals from resampling whole games; "moved" means the interval excludes zero. A dash means an unavailable measurement or no eligible denominator.

Rate counts are recorded events / eligible exposure; missing legacy counts remain unavailable. An observed 17/17 is 100%, not a certain future success rate: whole-game resampling can give a zero-width interval when every observed outcome is the same. These intervals do not rule out unobserved rare failures.

## Timing and provenance

Per-game ms is elapsed time around simulateGame only; it excludes roster generation, record/probe work and worker startup. Sums of worker elapsed times are not collection wall time or CPU time.

**producer**: commit `759fcf3c97e3717dfc8215ef4f4153f770619ae4`; Node: v22.23.3; probes: missedBy, weird.

Workers requested: 4; peak concurrent worker processes: 4.

Collection elapsed: 806.9 s. CPU time: not collected in scorecard records.

- ref: 49.6 s elapsed per game; worker processes: 1
- finish: 47.0 s elapsed per game; worker processes: 1
- pkg: 49.9 s elapsed per game; worker processes: 1
- pkgLayer: 50.4 s elapsed per game; worker processes: 1
- ref film weirdness detectors: 783 ms per game, 1.6% of the elapsed time (inside it, not extra)
- finish film weirdness detectors: 726 ms per game, 1.5% of the elapsed time (inside it, not extra)
- pkg film weirdness detectors: 770 ms per game, 1.5% of the elapsed time (inside it, not extra)
- pkgLayer film weirdness detectors: 777 ms per game, 1.5% of the elapsed time (inside it, not extra)
- engineSha256: 826101ae900f7143b65bb4e020c220da22701e6a09d76f728d8336f693f7057e
- measurementSha256: bf2fcc2ab7bad96d68e1373e7b575c54366e55ae2c8a4bcc8d01dd35f740670b
- lockfileSha256: cee32ba14d404c05dff4e8e3b4506bc1ea1e1afbfd40b35461511e7ff8fdb98f
- platform: linux
- arch: x64
- cpuModel: Intel(R) Xeon(R) Processor @ 2.10GHz
- cpuQuotaCores: unavailable
- execution: node --import tsx
- ref resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_PATCH":false,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HIP_BRACE":false,"HOLD_FINISH":false,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_HORIZON":false,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"UNDER_DEPTH":false,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`
- finish resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_PATCH":false,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HIP_BRACE":true,"HOLD_FINISH":true,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_HORIZON":false,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"UNDER_DEPTH":false,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`
- pkg resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":false,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_PATCH":true,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HIP_BRACE":true,"HOLD_FINISH":true,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_HORIZON":false,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"UNDER_DEPTH":false,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`
- pkgLayer resolved engine switches: `{"AGAP_ALIGN":true,"ALIGN_HABIT":true,"ANCHOR_GRADE":true,"ANCHOR_SPLIT":true,"ARM_PRESS":true,"ATTACK_LANDMARK":false,"BACKER_CREEP":true,"BACKER_TAKEON":true,"BACKFIELD_DEPTH":true,"BACKSIDE_COMBO":true,"BACKSIDE_SHOOT":false,"BACK_BLOCK":true,"BLITZ_CREEP":true,"BLOCKED_REACH":true,"BLOCKER_NEXT":true,"BLOCK_RELEASE":false,"BOX_ALIGN":true,"CARRIER_BRACE":false,"CF_FLOW":null,"CLIMB_BASE":true,"CLIMB_INTERCEPT":true,"CLIMB_PATH":true,"CLIMB_PLAN":true,"CLIMB_PREP":true,"CLIMB_RIP":true,"CLIMB_RUNNER_SIDE":true,"CLIMB_SLIDE":true,"CLIMB_SQUARE":true,"CONTACT_LAYER":true,"CONTACT_PATCH":false,"COUNTER_C":true,"COUNTER_OFFSET":true,"COVER_CALL":true,"CUTOFF_RACE":true,"DB_SLOWPLAY":true,"DEEP_NO_FORCE":false,"DEF_ALIGN":true,"DEF_GETOFF":1,"DEF_PACKAGE":true,"DEF_STANCE":false,"DEUCE":true,"DL_ANCHOR":true,"DL_CHASE":true,"DL_FIGHT":false,"DL_FLATTEN":true,"DL_FLATTEN_WON":true,"DL_GAMES":false,"DL_HANDS":false,"DL_SQUEEZE":true,"DOUBLE_FLOW":true,"DOUBLE_HANDOFF":true,"DOUBLE_OVERTAKE":true,"DOUBLE_TRACK":true,"DRAW_NFL":true,"DRAW_READ":true,"EDGE_CONTAIN":true,"EDGE_REACH":true,"END_CHASE":true,"ENGAGED_DEFENDER":true,"ENGAGED_TECHNIQUE":true,"FB_PLAYSIDE":true,"FEET_SETTLE":true,"FLAT_PRESS":true,"FLOW_INTERCEPT":false,"FLOW_READ":true,"FLOW_RELEASE":true,"FORCE_BOUNCE":true,"FRONT_ALIGN":true,"FRONT_MENU":true,"FRONT_STRENGTH":true,"GAIT_STEP":0,"GAP_CLIMB":true,"GAP_MATCH":true,"GAZE":false,"GRASP_ARMS":false,"GRASP_PATCH":true,"GRIP_HOLD":true,"GROUNDING_FACTS":true,"GUN_MESH":true,"GUN_MESH_GO":true,"GUN_SNAP":true,"GUN_STRETCH_T":false,"HANDS_CHEST":true,"HANDS_FRICTION":false,"HAND_FIGHT":false,"HAND_MOTOR":false,"HELD_SIDE":true,"HELD_SWING":false,"HIP_BRACE":true,"HOLD_FINISH":true,"HOLD_LEVERAGE":true,"HOLD_SUBSTEPS":0,"IN_STRIDE_CATCH":false,"IZ_FLAT":true,"IZ_GUN_A":true,"IZ_OFFSET":true,"KEEPER_TORSO":true,"KEY_DEPTH":true,"KEY_PACE":true,"KEY_REACT":true,"L2_BREAKDOWN":true,"LB_GUARD_STEP":true,"LB_LANDMARK":true,"LB_LINE_FLOW":true,"LB_PLAN":true,"LB_READ_STEP":true,"LEG_ALLOMETRY":true,"LEVEL2_TIME":true,"LEVER_FACING":true,"LINE_STEP":true,"LIVE_AIM":true,"LIVE_GAPS":true,"MESH_GUN_SIDE":true,"MESH_NFL":false,"MESH_TEMPO":true,"MIDDLE_NO_FORCE":false,"MOTION":true,"MOTION_CHECK":true,"MUG_CALLS":true,"MUG_PRESSURES":true,"NICKEL_FRONTS":true,"NO_CROSS":true,"OFFBALL_TIMING":true,"OL_SPLITS":true,"OL_STAGGER":true,"ONE_ARM_HOLD":true,"OWNER_KEEPS":true,"OZ_HIP_READ":true,"PAD_LEVERAGE":true,"PASS_FEEL":true,"PASS_FIRST":true,"PASS_KICK":true,"PASS_SINK":false,"PRESSURE_CALL":true,"PRO_READ":true,"PULL_CUE":false,"PULL_EARLY":true,"PULL_PLAN":false,"PULL_READ":true,"PURSUE_AROUND":true,"RACE_LEAN":false,"RB_COMMIT":true,"RB_FLOW":true,"RB_GATHER":true,"RB_HELD":true,"RB_STEER":true,"RB_TEMPO":true,"REACH_CARRY":true,"REACH_CLOSE":true,"REACH_CONTACT":false,"REACH_FLAT":true,"REACH_RACE":true,"REACH_TECHNIQUE":true,"READ_EYES":true,"READ_LEAN":true,"READ_RISK_TRACE":false,"RELEASE_INTERCEPT":true,"RELEASE_QUICK":true,"RELEASE_REDECIDE":true,"ROUTE_CLEAR":true,"RUN_ANCHOR":true,"RUN_BLITZ":true,"RUN_CONFIRM":true,"RUN_CONTACT_COMPONENTS":true,"RUN_CONTACT_TRACK":false,"RUN_FEEL":true,"RUN_FORM_PAIR":true,"RUN_HANDS":false,"RUN_HAND_MOVE":true,"RUN_READ":false,"RUN_READ_TURN":false,"SAFETY_TEMPO":true,"SAM_ON_TE":false,"SCRAPE":true,"SEAL_HOLD":true,"SHED_PAST":true,"SHED_PAST_GATE":true,"SHED_PHYSICAL":true,"SHED_PURSUE":true,"SHED_ROUTE":true,"SHELL_SHOW":true,"SHORT_BASE":true,"SHORT_PACKAGE":true,"SINK_LEAD":false,"SITU_DEPTH":true,"SLOT_LEV":true,"SNAP_REACT":true,"STALK_CLAIM":true,"STALK_CUSHION":true,"STANCE_TELL":true,"STRETCH_MESH":true,"STRETCH_OFFSET":true,"STRETCH_REACH":true,"STRETCH_TRACK":false,"TACKLE_TOUCH":false,"TE_OFF":true,"THREAT_READ":true,"THROW_HORIZON":false,"THROW_REACT":true,"TIGHT_OFF":true,"TIP_AWAY":true,"TKL_WHIFF":false,"TOUCH_READ":true,"TURF_MU_SCALE":1,"UNDER_DEPTH":false,"WING_CALL":true,"WING_WORK":true,"WRAP_FOOT":false,"WR_ALIGN":true,"ZONE_ARMS":true,"ZONE_FLOW":true,"ZONE_GAP":true,"ZONE_MUG":true,"ZONE_ONBALL":true,"ZONE_PAIR":false,"ZONE_RUN":true,"ZONE_SCOOP":true,"ZONE_SETTLE":true,"ZONE_WINGS":true}`


## finish vs ref

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | ref | finish | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 34.78 | 34.47 | -0.31 | -5.84 to +4.44 | not resolved by this sample | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 67.38 | 65.34 | -2.03 | -3.94 to +0.06 | not resolved by this sample | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 461.87 | 470.51 | +8.64 | -34.54 to +50.18 | not resolved by this sample | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 66.7% (1439/2156) | 67.0% (1400/2091) | +0.2 | -3.3 to +3.6 | not resolved by this sample | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | HIGH |
| Completion % | 55.3% (717/1297) | 58.8% (742/1262) | +3.5 | +1.5 to +5.4 | **moved** | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 9.69 | 10.05 | +0.37 | -0.19 to +1.04 | not resolved by this sample | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 7.1% (102/1439) | 7.2% (101/1400) | +0.1 | -1.7 to +1.9 | not resolved by this sample | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | OK |
| INT rate | 3.7% (48/1297) | 3.2% (40/1262) | -0.5 | -1.7 to +0.7 | not resolved by this sample | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 7.9% (103/1297) | 8.1% (102/1262) | +0.1 | -1.1 to +1.3 | not resolved by this sample | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 15.5% (201/1297) | 16.4% (207/1262) | +0.9 | -1.4 to +3.2 | not resolved by this sample | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 9.85 | 9.38 | -0.48 | -0.80 to -0.23 | **moved** | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | HIGH |
| YAC / reception | 8.36 | 8.14 | -0.22 | -1.03 to +0.67 | not resolved by this sample | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.78 | 2.76 | -0.03 | -0.07 to +0.01 | not resolved by this sample | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | OK |
| Scramble rate | 2.2% (31/1439) | 1.9% (26/1400) | -0.3 | -0.9 to +0.3 | not resolved by this sample | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | LOW |
| Separation at catch point (yd) | 3.16 | 3.29 | +0.13 | +0.04 to +0.24 | **moved** | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | HIGH |
| Rush yards / carry | 3.77 | 4.34 | +0.57 | -0.21 to +1.29 | not resolved by this sample | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | OK |
| Run stuff rate (<=0) | 14.9% (107/717) | 16.9% (117/691) | +2.0 | -1.7 to +5.6 | not resolved by this sample | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | OK |
| 10+ yd runs | 7.1% (51/717) | 9.7% (67/691) | +2.6 | -0.9 to +5.8 | not resolved by this sample | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | OK |
| Runs of 20+ that reach 40 | 33.3% (3/9) | 44.4% (8/18) | +11.1 | -12.4 to +36.5 | not resolved by this sample | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | HIGH |
| Yards before contact (runs) | 0.69 | 1.19 | +0.51 | +0.21 to +0.80 | **moved** | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.28 | 0.25 | -0.03 | -0.06 to -0.00 | **moved** | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.15 | 0.14 | -0.01 | -0.03 to +0.01 | not resolved by this sample | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 37.5% (171/456) | 40.2% (173/430) | +2.7 | -1.7 to +6.7 | not resolved by this sample | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| FG % | 89.1% (57/64) | 87.7% (57/65) | -1.4 | -8.8 to +4.7 | not resolved by this sample | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| XP % | 94.7% (108/114) | 94.6% (106/112) | -0.1 | -6.8 to +6.0 | not resolved by this sample | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Fumbles lost / team-game | 0.78 | 0.34 | -0.44 | -0.72 to -0.22 | **moved** | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | LOW |
| Punts / team-game | 5.47 | 4.97 | -0.50 | -1.53 to +0.56 | not resolved by this sample | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Accepted penalties / team-game | 5.22 | 5.63 | +0.41 | -0.50 to +1.50 | not resolved by this sample | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 100.0% (18/18) | 100.0% (17/17) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 93.3% (14/15) | 100.0% (15/15) | +6.7 | +0.0 to +20.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 86.7% (13/15) | 81.3% (13/16) | -5.4 | -29.7 to +16.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 75.0% (12/16) | 70.6% (12/17) | -4.4 | -27.8 to +16.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 45.98 | 46.37 | +0.39 | -0.81 to +1.73 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 40.49 | 41.72 | +1.24 | -0.98 to +3.16 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 24.09 | 26.79 | +2.70 | +1.00 to +4.27 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 8.78 | 9.90 | +1.12 | -1.25 to +4.03 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 26.0% (57/219) | 23.9% (52/218) | -2.2 | -7.1 to +1.9 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 3.4% (6/175) | 1.3% (2/159) | -2.2 | -4.6 to +0.1 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 5.7% (14/246) | 6.6% (15/228) | +0.9 | -2.8 to +4.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 44.0% (11/25) | 50.0% (11/22) | +6.0 | -18.8 to +31.7 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 16.2% (22/136) | 16.4% (22/134) | +0.2 | -4.9 to +5.2 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 15.09 | 13.69 | -1.41 | -2.31 to -0.47 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 2.21 | 2.38 | +0.17 | -0.07 to +0.41 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 58.9% (76/129) | 56.8% (63/111) | -2.2 | -13.1 to +8.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 2.31 | 1.59 | -0.72 | -1.34 to -0.09 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.04 | 0.04 | -0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by LB / play | 0.04 | 0.05 | +0.01 | -0.01 to +0.02 | not resolved by this sample | internal |  |
| Missed tackles by CB / play | 0.02 | 0.03 | +0.01 | +0.00 to +0.01 | **moved** | internal |  |
| Missed tackles by S / play | 0.01 | 0.01 | +0.00 | -0.00 to +0.01 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.2% (counts unavailable) | 0.1% (counts unavailable) | -0.1 | -0.2 to +0.0 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.2 (3/1789) | 0.1 (2/1756) | -0.1 | -0.1 to +0.0 | not resolved by this sample | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.1 (1/902) | 0.1 (1/884) | +0.0 | -0.0 to +0.0 | not resolved by this sample | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | 0.0% (0/3) | 0.0% (0/2) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 18.6% (265/1427) | 16.3% (232/1423) | -2.3 | -4.8 to +0.3 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 23.5 (335/1427) | 18.8 (268/1423) | -4.6 | -8.3 to -1.3 | **moved** | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 58.8% (416/708) | 58.8% (398/677) | +0.0 | -4.0 to +4.8 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 119.2 (844/708) | 112.1 (759/677) | -7.1 | -16.1 to +0.8 | not resolved by this sample | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 2.1% (21727/1057475) | 2.1% (21190/998015) | +0.1 | -0.0 to +0.2 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 49.3% (1063/2156) | 49.1% (1026/2091) | -0.2 | -1.8 to +1.5 | not resolved by this sample | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 75.8 (1634/2156) | 77.5 (1620/2091) | +1.7 | -1.7 to +4.9 | not resolved by this sample | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 3.9% (198/5051) | 4.4% (215/4900) | +0.5 | -0.2 to +1.0 | not resolved by this sample | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 9.2 (198/2156) | 10.3 (215/2091) | +1.1 | -0.2 to +2.4 | not resolved by this sample | internal |  |
| Accepted penalties / team-game: block_in_back | 0.16 | 0.19 | +0.03 | -0.13 to +0.19 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.13 | 0.19 | +0.06 | -0.06 to +0.19 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.88 | 0.72 | -0.16 | -0.41 to +0.06 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: free_kick_short | 0.03 | 0.00 | -0.03 | -0.09 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 1.63 | 1.81 | +0.19 | -0.47 to +0.94 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 0.78 | 0.84 | +0.06 | -0.22 to +0.38 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_touching | 0.13 | 0.00 | -0.13 | -0.22 to -0.03 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 0.50 | 0.63 | +0.13 | -0.09 to +0.34 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.44 | 0.53 | +0.09 | -0.06 to +0.25 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.47 | 0.53 | +0.06 | -0.13 to +0.25 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.06 | 0.16 | +0.09 | -0.03 to +0.22 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: unnecessary_roughness | 0.03 | 0.03 | +0.00 | -0.06 to +0.06 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## pkg vs ref

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | ref | pkg | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 34.78 | 39.28 | +4.50 | +0.19 to +8.22 | **moved** | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 67.38 | 67.00 | -0.38 | -2.13 to +1.41 | not resolved by this sample | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 461.87 | 495.77 | +33.90 | -8.15 to +68.21 | not resolved by this sample | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 66.7% (1439/2156) | 68.2% (1462/2144) | +1.4 | -1.7 to +4.2 | not resolved by this sample | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | HIGH |
| Completion % | 55.3% (717/1297) | 58.1% (760/1307) | +2.9 | -0.1 to +5.6 | not resolved by this sample | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 9.69 | 10.36 | +0.67 | +0.09 to +1.31 | **moved** | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 7.1% (102/1439) | 6.7% (98/1462) | -0.4 | -1.7 to +1.0 | not resolved by this sample | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | OK |
| INT rate | 3.7% (48/1297) | 4.6% (60/1307) | +0.9 | -0.2 to +2.0 | not resolved by this sample | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 7.9% (103/1297) | 9.6% (125/1307) | +1.6 | +0.2 to +3.1 | **moved** | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 15.5% (201/1297) | 17.1% (223/1307) | +1.6 | -0.5 to +3.8 | not resolved by this sample | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 9.85 | 9.71 | -0.14 | -0.43 to +0.22 | not resolved by this sample | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | HIGH |
| YAC / reception | 8.36 | 8.63 | +0.28 | -0.38 to +1.07 | not resolved by this sample | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.78 | 2.77 | -0.02 | -0.05 to +0.02 | not resolved by this sample | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | OK |
| Scramble rate | 2.2% (31/1439) | 3.1% (46/1462) | +1.0 | +0.2 to +1.8 | **moved** | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | OK |
| Separation at catch point (yd) | 3.16 | 3.28 | +0.12 | -0.02 to +0.24 | not resolved by this sample | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | HIGH |
| Rush yards / carry | 3.77 | 4.26 | +0.48 | -0.21 to +1.07 | not resolved by this sample | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | OK |
| Run stuff rate (<=0) | 14.9% (107/717) | 8.9% (61/682) | -6.0 | -7.8 to -4.0 | **moved** | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | LOW |
| 10+ yd runs | 7.1% (51/717) | 6.9% (47/682) | -0.2 | -2.9 to +2.3 | not resolved by this sample | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | LOW |
| Runs of 20+ that reach 40 | 33.3% (3/9) | 77.8% (7/9) | +44.4 | +11.1 to +72.7 | **moved** | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | HIGH |
| Yards before contact (runs) | 0.69 | 0.79 | +0.11 | -0.10 to +0.32 | not resolved by this sample | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.28 | 0.28 | +0.01 | -0.02 to +0.03 | not resolved by this sample | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.15 | 0.16 | +0.01 | -0.02 to +0.03 | not resolved by this sample | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 37.5% (171/456) | 42.2% (180/427) | +4.7 | -0.3 to +9.2 | not resolved by this sample | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| FG % | 89.1% (57/64) | 86.4% (57/66) | -2.7 | -12.7 to +6.1 | not resolved by this sample | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| XP % | 94.7% (108/114) | 93.2% (124/133) | -1.5 | -6.7 to +3.3 | not resolved by this sample | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | LOW |
| Fumbles lost / team-game | 0.78 | 0.75 | -0.03 | -0.34 to +0.22 | not resolved by this sample | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Punts / team-game | 5.47 | 4.50 | -0.97 | -1.66 to -0.16 | **moved** | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Accepted penalties / team-game | 5.22 | 5.22 | +0.00 | -0.53 to +0.63 | not resolved by this sample | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 100.0% (18/18) | 100.0% (12/12) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 93.3% (14/15) | 93.8% (15/16) | +0.4 | -16.7 to +18.8 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 86.7% (13/15) | 74.1% (20/27) | -12.6 | -29.4 to +7.6 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 75.0% (12/16) | 90.9% (10/11) | +15.9 | -8.9 to +37.5 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 45.98 | 44.76 | -1.22 | -2.66 to -0.01 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 40.49 | 39.56 | -0.92 | -2.68 to +0.85 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 24.09 | 24.89 | +0.79 | -1.15 to +2.88 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 8.78 | 9.86 | +1.07 | -1.02 to +2.72 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 26.0% (57/219) | 27.4% (66/241) | +1.4 | -2.7 to +5.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 3.4% (6/175) | 1.4% (2/144) | -2.0 | -4.3 to +0.2 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 5.7% (14/246) | 1.5% (3/204) | -4.2 | -6.6 to -1.8 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 44.0% (11/25) | 46.2% (6/13) | +2.2 | -32.1 to +35.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 16.2% (22/136) | 14.1% (22/156) | -2.1 | -7.0 to +3.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 15.09 | 14.66 | -0.44 | -1.34 to +0.47 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 2.21 | 2.47 | +0.25 | -0.06 to +0.55 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 58.9% (76/129) | 66.7% (80/120) | +7.8 | +1.3 to +13.8 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 2.31 | 2.66 | +0.34 | -0.19 to +0.97 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.04 | 0.04 | -0.00 | -0.02 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by LB / play | 0.04 | 0.04 | -0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by CB / play | 0.02 | 0.02 | +0.00 | -0.00 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by S / play | 0.01 | 0.02 | +0.01 | +0.00 to +0.01 | **moved** | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.2% (counts unavailable) | 0.3% (counts unavailable) | +0.2 | -0.0 to +0.3 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.2 (3/1789) | 0.3 (6/1795) | +0.2 | -0.0 to +0.3 | not resolved by this sample | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.1 (1/902) | 0.4 (4/916) | +0.3 | -0.0 to +0.8 | not resolved by this sample | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | 0.0% (0/3) | 0.0% (0/6) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 18.6% (265/1427) | 18.7% (271/1449) | +0.1 | -2.0 to +2.3 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 23.5 (335/1427) | 23.3 (337/1449) | -0.2 | -3.9 to +3.1 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 58.8% (416/708) | 57.0% (383/672) | -1.8 | -4.7 to +0.9 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 119.2 (844/708) | 114.0 (766/672) | -5.2 | -17.8 to +5.6 | not resolved by this sample | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 2.1% (21727/1057475) | 2.2% (23297/1071905) | +0.1 | +0.0 to +0.2 | **moved** | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 49.3% (1063/2156) | 51.5% (1105/2144) | +2.2 | +0.8 to +3.8 | **moved** | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 75.8 (1634/2156) | 83.2 (1783/2144) | +7.4 | +3.0 to +11.8 | **moved** | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 3.9% (198/5051) | 4.2% (227/5344) | +0.3 | -0.4 to +1.0 | not resolved by this sample | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 9.2 (198/2156) | 10.6 (227/2144) | +1.4 | -0.2 to +2.9 | not resolved by this sample | internal |  |
| Accepted penalties / team-game: block_in_back | 0.16 | 0.25 | +0.09 | -0.13 to +0.31 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.13 | 0.16 | +0.03 | -0.09 to +0.16 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.88 | 0.81 | -0.06 | -0.28 to +0.16 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: free_kick_short | 0.03 | 0.03 | +0.00 | +0.00 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 1.63 | 1.63 | +0.00 | -0.44 to +0.41 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 0.78 | 0.59 | -0.19 | -0.50 to +0.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_touching | 0.13 | 0.03 | -0.09 | -0.22 to +0.03 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 0.50 | 0.41 | -0.09 | -0.38 to +0.19 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.44 | 0.56 | +0.13 | -0.06 to +0.31 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.47 | 0.47 | +0.00 | -0.19 to +0.22 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.06 | 0.16 | +0.09 | -0.03 to +0.22 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: unnecessary_roughness | 0.03 | 0.13 | +0.09 | -0.03 to +0.19 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## pkgLayer vs ref

Measurement, runtime, probe and actual input identities agree; engine source/settings may differ intentionally. Paired units are whole games, not matched post-divergence football situations.

| Metric | ref | pkgLayer | Change | 90% range of change | Reading | NFL band | vs band |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Points / team-game | 34.78 | 35.63 | +0.84 | -4.50 to +6.00 | not resolved by this sample | 21–23.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Scrimmage plays / team-game | 67.38 | 67.78 | +0.41 | -1.41 to +2.31 | not resolved by this sample | 61–65 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Total yards / team-game | 461.87 | 474.48 | +12.61 | -28.36 to +53.32 | not resolved by this sample | 320–345 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Pass rate (dropbacks / plays) | 66.7% (1439/2156) | 68.7% (1491/2169) | +2.0 | -0.7 to +4.8 | not resolved by this sample | 54.43–66.33% (data/reviews/nflverse/reference.json#teamSeasons[].dropbackShare.percent (team-season p10–p90; 2dp)) | HIGH |
| Completion % | 55.3% (717/1297) | 55.0% (743/1350) | -0.2 | -1.8 to +1.3 | not resolved by this sample | 60.59–68.09% (data/reviews/nflverse/reference.json#teamSeasonRanges.completion (team-season p10–p90; 2dp)) | LOW |
| Yards / attempt | 9.69 | 9.44 | -0.24 | -0.91 to +0.43 | not resolved by this sample | 6.35–7.89 (data/reviews/nflverse/reference.json#teamSeasons[]: completionYards.mean * completion.count / throws (team-season p10–p90; 2dp)) | HIGH |
| Sack rate (per dropback) | 7.1% (102/1439) | 6.2% (92/1491) | -0.9 | -2.5 to +0.8 | not resolved by this sample | 4.61–9.36% (data/reviews/nflverse/reference.json#teamSeasonRanges.sackPerDropback (team-season p10–p90; 2dp)) | OK |
| INT rate | 3.7% (48/1297) | 4.4% (59/1350) | +0.7 | -0.7 to +2.0 | not resolved by this sample | 1.47–3.15% (data/reviews/nflverse/reference.json#teamSeasonRanges.interception (team-season p10–p90; 2dp)) | HIGH |
| Pass TD rate | 7.9% (103/1297) | 7.9% (106/1350) | -0.1 | -1.3 to +1.2 | not resolved by this sample | 4–4.8% (unsourced: legacy scorecard estimate; no committed TD/attempt team-season range) | HIGH |
| 20+ yd completions / att | 15.5% (201/1297) | 15.2% (205/1350) | -0.3 | -2.9 to +2.5 | not resolved by this sample | 6.66–11.08% (data/reviews/nflverse/reference.json#teamSeasonRanges.twentyYardCompletionPerThrow (team-season p10–p90; 2dp)) | HIGH |
| aDOT | 9.85 | 9.51 | -0.35 | -0.73 to +0.07 | not resolved by this sample | 7.5–8.5 (unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here) | HIGH |
| YAC / reception | 8.36 | 8.30 | -0.06 | -0.84 to +0.77 | not resolved by this sample | 4.53–5.91 (data/reviews/nflverse/reference.json#teamSeasonRanges.meanCompletedYAC (team-season p10–p90; 2dp)) | HIGH |
| Time to throw (s) | 2.78 | 2.75 | -0.04 | -0.08 to +0.01 | not resolved by this sample | 2.7–2.9 (unsourced: legacy scorecard estimate; no committed time-to-throw distribution) | OK |
| Scramble rate | 2.2% (31/1439) | 2.6% (39/1491) | +0.5 | -0.4 to +1.2 | not resolved by this sample | 2.18–7.32% (data/reviews/nflverse/reference.json#teamSeasonRanges.scramblePerDropback (team-season p10–p90; 2dp)) | OK |
| Separation at catch point (yd) | 3.16 | 3.22 | +0.06 | -0.08 to +0.21 | not resolved by this sample | 2.8–3.2 (unsourced: NGS 2022–24; no committed cohort or team-season aggregate) | HIGH |
| Rush yards / carry | 3.77 | 4.25 | +0.48 | -0.22 to +1.03 | not resolved by this sample | 3.7–4.83 (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.yards.mean (team-season p10–p90; 2dp)) | OK |
| Run stuff rate (<=0) | 14.9% (107/717) | 9.0% (61/678) | -5.9 | -8.5 to -3.1 | **moved** | 15.89–23.54% (data/reviews/nflverse/reference.json#teamSeasonRanges.stuffPerDesignedRun (team-season p10–p90; 2dp)) | LOW |
| 10+ yd runs | 7.1% (51/717) | 7.1% (48/678) | -0.0 | -2.8 to +2.2 | not resolved by this sample | 7.58–12.87% (data/reviews/nflverse/reference.json#teamSeasons[].designedRun.explosive.percent (team-season p10–p90; 2dp)) | LOW |
| Runs of 20+ that reach 40 | 33.3% (3/9) | 35.7% (5/14) | +2.4 | -25.0 to +39.4 | not resolved by this sample | 25–35% (unsourced: PR #190, BDB 2022; no committed team-season distribution) | HIGH |
| Yards before contact (runs) | 0.69 | 0.87 | +0.18 | -0.11 to +0.46 | not resolved by this sample | 1.5–2.3 (unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified) | LOW |
| Missed + broken tackles / play | 0.28 | 0.26 | -0.02 | -0.04 to +0.01 | not resolved by this sample | 0.11–0.16 (unsourced: PFF, definition unknown) | HIGH |
| Failed tackle opportunities / play (unique defenders) | 0.15 | 0.15 | -0.00 | -0.02 to +0.02 | not resolved by this sample | internal: unique failed defenders per official play; no NFL comparison band |  |
| 3rd-down conversion | 37.5% (171/456) | 37.8% (165/437) | +0.3 | -5.0 to +5.2 | not resolved by this sample | 37–41% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| FG % | 89.1% (57/64) | 90.8% (59/65) | +1.7 | -6.2 to +8.0 | not resolved by this sample | 83–87% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| XP % | 94.7% (108/114) | 97.3% (109/112) | +2.6 | -0.3 to +5.5 | not resolved by this sample | 94–97% (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Fumbles lost / team-game | 0.78 | 0.69 | -0.09 | -0.38 to +0.19 | not resolved by this sample | 0.4–0.7 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | OK |
| Punts / team-game | 5.47 | 5.13 | -0.34 | -1.06 to +0.44 | not resolved by this sample | 3.5–4.5 (unsourced: legacy scorecard estimate; waits on M1 game-layer.json) | HIGH |
| Accepted penalties / team-game | 5.22 | 6.22 | +1.00 | +0.28 to +1.72 | **moved** | internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md |  |
| FG 18–29 yd % | 100.0% (18/18) | 100.0% (20/20) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 30–39 yd % | 93.3% (14/15) | 100.0% (18/18) | +6.7 | +0.0 to +20.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 40–49 yd % | 86.7% (13/15) | 71.4% (10/14) | -15.2 | -45.0 to +11.3 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| FG 50+ yd % | 75.0% (12/16) | 84.6% (11/13) | +9.6 | -23.0 to +34.0 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt gross average (box yards) | 45.98 | 46.06 | +0.08 | -1.00 to +1.07 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt net field-position average | 40.49 | 39.91 | -0.58 | -2.69 to +1.02 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff return average (recorded yards) | 24.09 | 25.05 | +0.96 | -0.69 to +2.41 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt return average (recorded yards) | 8.78 | 11.28 | +2.50 | -0.01 to +5.09 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Kickoff touchback % (regular kicks) | 26.0% (57/219) | 29.7% (65/219) | +3.7 | +0.0 to +7.5 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Punt touchback % | 3.4% (6/175) | 2.4% (4/164) | -1.0 | -3.4 to +1.8 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down go % (outside Q4 last 2:30) | 5.7% (14/246) | 5.6% (13/233) | -0.1 | -2.8 to +2.4 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Fourth-down conversion % (all official attempts) | 44.0% (11/25) | 68.2% (15/22) | +24.2 | +8.0 to +39.4 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Two-point attempts / TD (retries once) | 16.2% (22/136) | 17.0% (23/135) | +0.9 | -4.4 to +6.2 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Drives / team-game (logged offensive possessions) | 15.09 | 14.94 | -0.16 | -1.28 to +0.81 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Offensive points / drive (including Try) | 2.21 | 2.32 | +0.11 | -0.14 to +0.35 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Red-zone TD % (box trips) | 58.9% (76/129) | 57.0% (73/128) | -1.9 | -10.3 to +5.9 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Turnovers / team-game (box) | 2.31 | 2.56 | +0.25 | -0.47 to +0.91 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Missed tackles by DL / play | 0.04 | 0.03 | -0.01 | -0.02 to +0.00 | not resolved by this sample | internal |  |
| Missed tackles by LB / play | 0.04 | 0.05 | +0.01 | -0.00 to +0.02 | not resolved by this sample | internal |  |
| Missed tackles by CB / play | 0.02 | 0.02 | +0.00 | -0.01 to +0.01 | not resolved by this sample | internal |  |
| Missed tackles by S / play | 0.01 | 0.01 | -0.00 | -0.00 to +0.00 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: plays with one or more (% of plays with pre-snap staging) | 0.2% (counts unavailable) | 0.2% (counts unavailable) | +0.1 | -0.1 to +0.2 | not resolved by this sample | internal |  |
| Pre-snap teammate contact: events per 100 plays with pre-snap staging | 0.2 (3/1789) | 0.2 (4/1786) | +0.1 | -0.1 to +0.2 | not resolved by this sample | internal |  |
| Pre-snap teammate contact with no motion called (control, expect 0): events per 100 plays with staging and no motion | 0.1 (1/902) | 0.3 (3/900) | +0.2 | -0.1 to +0.6 | not resolved by this sample | internal |  |
| Pre-snap contact involving the motion man (% of pre-snap contact events) | 0.0% (0/3) | 0.0% (0/4) | +0.0 | +0.0 to +0.0 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: plays with one or more (% of plays with a runner) | 18.6% (265/1427) | 18.0% (257/1430) | -0.6 | -2.2 to +1.1 | not resolved by this sample | internal |  |
| Defender turned from a nearby runner: events per 100 plays with a runner | 23.5 (335/1427) | 22.3 (319/1430) | -1.2 | -4.8 to +2.2 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: plays with one or more (% of run plays with a runner) | 58.8% (416/708) | 58.4% (391/670) | -0.4 | -3.4 to +2.3 | not resolved by this sample | internal |  |
| Blocker on a man out of the play: events per 100 run plays with a runner | 119.2 (844/708) | 119.1 (798/670) | -0.1 | -11.0 to +10.1 | not resolved by this sample | internal |  |
| OL facing own backfield and moving back (% of OL frames) | 2.1% (21727/1057475) | 2.3% (24683/1072095) | +0.2 | +0.1 to +0.4 | **moved** | internal |  |
| OL backpedaling facing own backfield: plays with one or more (% of plays) | 49.3% (1063/2156) | 51.3% (1113/2169) | +2.0 | +0.0 to +4.2 | **moved** | internal |  |
| OL backpedaling facing own backfield: events per 100 plays | 75.8 (1634/2156) | 84.3 (1828/2169) | +8.5 | +3.6 to +13.5 | **moved** | internal |  |
| Sharp turns with no speed loss (candidate; % of 60°+ turns) | 3.9% (198/5051) | 4.2% (227/5371) | +0.3 | -0.2 to +0.7 | not resolved by this sample | internal |  |
| Sliding through a cut (candidate): events per 100 plays | 9.2 (198/2156) | 10.5 (227/2169) | +1.3 | +0.0 to +2.5 | **moved** | internal |  |
| Accepted penalties / team-game: block_in_back | 0.16 | 0.06 | -0.09 | -0.25 to +0.06 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: encroachment | 0.13 | 0.19 | +0.06 | -0.03 to +0.16 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: false_start | 0.88 | 0.81 | -0.06 | -0.28 to +0.16 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: free_kick_short | 0.03 | 0.00 | -0.03 | -0.09 to +0.00 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: holding | 1.63 | 2.50 | +0.88 | +0.44 to +1.28 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_contact | 0.78 | 0.59 | -0.19 | -0.47 to +0.16 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: illegal_touching | 0.13 | 0.00 | -0.13 | -0.22 to -0.03 | **moved** | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: intentional_grounding | 0.50 | 0.63 | +0.13 | -0.09 to +0.41 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: neutral_zone_infraction | 0.44 | 0.66 | +0.22 | +0.00 to +0.41 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: offside | 0.47 | 0.63 | +0.16 | -0.03 to +0.31 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: roughing_passer | 0.06 | 0.13 | +0.06 | -0.03 to +0.16 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |
| Accepted penalties / team-game: unnecessary_roughness | 0.03 | 0.03 | +0.00 | -0.06 to +0.06 | not resolved by this sample | internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |  |

## Watch these first

Read the clips, not the averages: each line is a place in a simulated game that a rule flagged. A rule says where to look, never what number is right, and several of its constants are chosen, not sourced (docs/VALIDATION.md). Ids with an `sc<seed>/` prefix are this run's own games, not the film room's: the full list is in the events file next to the saved card, and `npm run weird -- <seed>` plays the film-room games so its ids match `npm run replay`.

### ref

**Pre-snap teammate contact**: 3 events in 16 games

- sc11/G5-P077 @ -4.85 s (pre-snap) [representative detector tick -4.70 s]: RB and F touched before the snap (across H motion), closing 0 yd/s
- sc11/G9-P062 @ -2.05 s (pre-snap) [representative detector tick -1.60 s]: RB and H touched before the snap (jet Z motion), closing 0 yd/s
- sc11/G11-P137 @ -0.95 s (pre-snap) [representative detector tick -0.40 s]: RB and H touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 335 events in 16 games

- sc11/G8-P015 @ 2.50 s [representative detector tick 3.20 s]: DE_W facing 157° from the runner (RB) at 2.3 yd for 2.10 s; asked for 157° [play nullified by a penalty]
- sc11/G16-P152 @ 3.35 s: DE_S facing 122° from the runner (RB) at 2.6 yd for 1.60 s; asked for 125°
- sc11/G1-P184 @ 2.30 s [representative detector tick 2.85 s]: CB_S facing 155° from the runner (RB) at 4 yd for 1.55 s; asked for 156°

**Blocker on a man who is out of the play**: 844 events in 16 games

- sc11/G4-P036 @ 2.65 s [representative detector tick 7.55 s]: RG (run-block) on LB_W, 14.5 yd from the runner and moving away at 2.8 yd/s, while LB_S is free 0.5 yd from the runner, for 4.95 s
- sc11/G6-P005 @ 2.60 s [representative detector tick 6.90 s]: Y (run-block) on SS, 18.3 yd from the runner and moving away at 2.2 yd/s, while DT_S is free 1.1 yd from the runner, for 4.35 s
- sc11/G16-P175 @ 2.00 s [representative detector tick 5.50 s]: C (run-block) on LB_M, 18.3 yd from the runner and moving away at 1.5 yd/s, while NB is free 0.5 yd from the runner, for 3.55 s

**Lineman backpedaling while facing his own backfield**: 1634 events in 16 games

- sc11/G8-P146 @ 2.00 s [representative detector tick 3.50 s]: LG facing 163° from downfield, moving back at 5.2 yd/s for 2.50 s (pass play)
- sc11/G4-P102 @ 1.75 s [representative detector tick 2.95 s]: C facing 169° from downfield, moving back at 5.5 yd/s for 2.35 s (pass play)
- sc11/G13-P177 @ 1.45 s [representative detector tick 3.00 s]: C facing 156° from downfield, moving back at 4.7 yd/s for 2.20 s (pass play)

**Sliding through a cut (candidate)**: 198 events in 16 games

- sc11/G13-P026 @ 2.40 s [representative detector tick 3.10 s]: X turned 62° from 4.2 yd/s keeping 99% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 22° turn
- sc11/G9-P108 @ 3.10 s [representative detector tick 3.70 s]: LB_M turned 62° from 3.8 yd/s keeping 97% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 3° turn
- sc11/G16-P066 @ 2.80 s [representative detector tick 3.40 s]: H turned 61° from 3.6 yd/s keeping 100% of his speed through the whole cut (NFL p90 for the role 76%); asked for a 3° turn

**Free climber requesting near-zero movement (candidate)**: 10 events in 16 games

- sc11/G3-P136 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G13-P101 @ 2.00 s [representative detector tick 2.60 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0.19 yd/s (review braking/traffic)
- sc11/G13-P134 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 6 events in 16 games

- sc11/G6-P105 @ 2.55 s [representative detector tick 3.90 s]: LB_S trailing H within 1.25 yd through the recorded flight, body >144° from ball; arrival right-rear (-144°), turned 15° (not gaze evidence)
- sc11/G11-P018 @ 2.60 s [representative detector tick 3.70 s]: SS trailing Y within 1.11 yd through the recorded flight, body >141° from ball; arrival right-rear (-141°), turned 21° (not gaze evidence)
- sc11/G12-P157 @ 3.00 s [representative detector tick 4.10 s]: LB_S trailing H within 0.74 yd through the recorded flight, body >138° from ball; arrival left-rear (138°), turned 17° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 597 events in 16 games

- sc11/G5-P073 @ 1.85 s [representative detector tick 2.95 s]: RB travel 58° vs installed-aim bearing -76°; DE_S 0.17 yd ahead, 0.62 yd off heading (engaged true; geometry only)
- sc11/G7-P121 @ 1.55 s [representative detector tick 2.60 s]: RB travel 108° vs installed-aim bearing -30°; DT_W 0.19 yd ahead, 0.5 yd off heading (engaged true; geometry only)
- sc11/G12-P002 @ 1.90 s [representative detector tick 2.85 s]: RB travel -7° vs installed-aim bearing 71°; DE_W 0.51 yd ahead, 1.15 yd off heading (engaged false; geometry only)

### finish

**Pre-snap teammate contact**: 2 events in 16 games

- sc11/G9-P074 @ -2.05 s (pre-snap) [representative detector tick -1.65 s]: RB and H touched before the snap (jet Z motion), closing 0 yd/s
- sc11/G10-P192 @ -0.60 s (pre-snap) [representative detector tick -0.35 s]: RB and H touched before the snap (no motion called), closing 0 yd/s [play nullified by a penalty]
- sc11/G11-P116 @ -0.35 s (pre-snap): RB and H touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 268 events in 16 games

- sc11/G4-P152 @ 1.90 s [representative detector tick 3.35 s]: DE_S facing 124° from the runner (RB) at 3.6 yd for 1.50 s; asked for 6°
- sc11/G8-P144 @ 1.40 s [representative detector tick 2.55 s]: LB_M facing 145° from the runner (RB) at 2.3 yd for 1.30 s; asked for 141° [play nullified by a penalty]
- sc11/G15-P119 @ 2.15 s [representative detector tick 2.25 s]: DE_W facing 137° from the runner (RB) at 2.3 yd for 1.25 s; asked for 137°

**Blocker on a man who is out of the play**: 759 events in 16 games

- sc11/G6-P005 @ 2.60 s [representative detector tick 5.60 s]: Y (run-block) on SS, 12.5 yd from the runner and moving away at 1.8 yd/s, while LB_W is free 2.1 yd from the runner, for 3.05 s
- sc11/G16-P159 @ 2.35 s [representative detector tick 5.15 s]: Y (run-block) on SS, 11 yd from the runner and moving away at 2.4 yd/s, while CB_W is free 3.2 yd from the runner, for 2.85 s
- sc11/G15-P115 @ 1.95 s [representative detector tick 4.30 s]: C (run-block) on DT_S, 12 yd from the runner and moving away at 2 yd/s, while LB_M is free 1.2 yd from the runner, for 2.40 s

**Lineman backpedaling while facing his own backfield**: 1620 events in 16 games

- sc11/G16-P108 @ 1.65 s [representative detector tick 2.50 s]: LG facing 168° from downfield, moving back at 3.8 yd/s for 2.65 s (pass play)
- sc11/G7-P103 @ 0.85 s [representative detector tick 2.25 s]: LT facing 153° from downfield, moving back at 4.6 yd/s for 2.50 s (pass play)
- sc11/G15-P116 @ 1.35 s [representative detector tick 2.90 s]: LG facing 152° from downfield, moving back at 4.9 yd/s for 2.40 s (pass play)

**Sliding through a cut (candidate)**: 215 events in 16 games

- sc11/G6-P021 @ 1.60 s [representative detector tick 2.30 s]: LB_W turned 64° from 4.2 yd/s keeping 99% of his speed through the whole cut (NFL p90 for the role 80%); asked for a 57° turn
- sc11/G5-P033 @ 4.00 s [representative detector tick 4.70 s]: LB_W turned 61° from 3.9 yd/s keeping 99% of his speed through the whole cut (NFL p90 for the role 80%); asked for a 50° turn
- sc11/G15-P159 @ 1.20 s [representative detector tick 1.80 s]: SS turned 64° from 4.4 yd/s keeping 85% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 61° turn

**Free climber requesting near-zero movement (candidate)**: 8 events in 16 games

- sc11/G3-P120 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G15-P163 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G16-P104 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 1.46 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 1 event in 16 games

- sc11/G3-P090 @ 3.70 s: QB went down; nearest defender 2.45 yd over the preceding 0.5 s and onset (positions/contact need review)

**Trailing man defender stays turned from the ball (candidate)**: 3 events in 16 games

- sc11/G6-P094 @ 3.25 s [representative detector tick 4.65 s]: CB_W trailing X within 0.64 yd through the recorded flight, body >124° from ball; arrival right-rear (-160°), turned 26° (not gaze evidence)
- sc11/G4-P051 @ 2.30 s [representative detector tick 3.45 s]: CB_S trailing Z within 1.5 yd through the recorded flight, body >152° from ball; arrival left-rear (173°), turned 25° (not gaze evidence)
- sc11/G3-P131 @ 2.15 s [representative detector tick 3.25 s]: CB_W trailing X within 1.26 yd through the recorded flight, body >136° from ball; arrival right-rear (-151°), turned 23° (not gaze evidence) [play nullified by a penalty]

**Runner leaves installed aim toward a nearby defender (candidate)**: 544 events in 16 games

- sc11/G12-P050 @ 2.10 s [representative detector tick 3.75 s]: RB travel 17° vs installed-aim bearing -85°; CB_W 1.1 yd ahead, 1.08 yd off heading (engaged false; geometry only)
- sc11/G3-P167 @ 2.25 s [representative detector tick 3.75 s]: RB travel -50° vs installed-aim bearing 80°; DE_W 0.07 yd ahead, 1.13 yd off heading (engaged false; geometry only)
- sc11/G5-P147 @ 1.95 s [representative detector tick 3.00 s]: RB travel -92° vs installed-aim bearing 61°; LB_W 0 yd ahead, 1.29 yd off heading (engaged false; geometry only)

### pkg

**Pre-snap teammate contact**: 6 events in 16 games

- sc11/G3-P013 @ -0.05 s (pre-snap): RB and F touched before the snap (no motion called), closing 0 yd/s
- sc11/G5-P100 @ -4.85 s (pre-snap) [representative detector tick -4.70 s]: RB and F touched before the snap (across H motion), closing 0 yd/s
- sc11/G7-P045 @ -0.35 s (pre-snap) [representative detector tick -0.20 s]: RB and F touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 337 events in 16 games

- sc11/G6-P017 @ 1.55 s [representative detector tick 1.80 s]: DE_W facing 133° from the runner (RB) at 2.8 yd for 1.45 s; asked for 111° [play nullified by a penalty]
- sc11/G7-P144 @ 2.70 s [representative detector tick 3.70 s]: DE_S facing 143° from the runner (RB) at 4.3 yd for 1.45 s; asked for 143°
- sc11/G16-P047 @ 2.60 s [representative detector tick 2.80 s]: DE_S facing 128° from the runner (RB) at 4 yd for 1.45 s; asked for 128°

**Blocker on a man who is out of the play**: 766 events in 16 games

- sc11/G6-P039 @ 1.50 s [representative detector tick 5.00 s]: Y (run-block) on LB_S, 26.9 yd from the runner and moving away at 1.5 yd/s, while SS is free 0.5 yd from the runner, for 3.55 s
- sc11/G11-P163 @ 3.55 s [representative detector tick 5.90 s]: X (run-block) on CB_W, 18.1 yd from the runner and moving away at 2.2 yd/s, while SS is free 0.5 yd from the runner, for 2.40 s
- sc11/G2-P083 @ 1.85 s [representative detector tick 3.90 s]: LT (run-block) on SS, 23.9 yd from the runner and moving away at 1.7 yd/s, while CB_W is free 1.5 yd from the runner, for 2.10 s

**Lineman backpedaling while facing his own backfield**: 1783 events in 16 games

- sc11/G6-P143 @ 1.60 s [representative detector tick 3.35 s]: LG facing 173° from downfield, moving back at 4.7 yd/s for 2.50 s (pass play)
- sc11/G11-P136 @ 1.85 s [representative detector tick 3.20 s]: RT facing 131° from downfield, moving back at 3.5 yd/s for 2.25 s (pass play)
- sc11/G6-P143 @ 1.85 s [representative detector tick 3.35 s]: C facing 156° from downfield, moving back at 4.6 yd/s for 2.20 s (pass play)

**Sliding through a cut (candidate)**: 227 events in 16 games

- sc11/G2-P029 @ 2.20 s [representative detector tick 2.80 s]: DE_S turned 68° from 4.3 yd/s keeping 96% of his speed through the whole cut (NFL p90 for the role 73%); asked for a 56° turn
- sc11/G14-P183 @ 2.60 s [representative detector tick 3.30 s]: LB_W turned 64° from 4.1 yd/s keeping 94% of his speed through the whole cut (NFL p90 for the role 80%); asked for a 67° turn
- sc11/G10-P040 @ 2.10 s [representative detector tick 2.70 s]: LB_M turned 65° from 4 yd/s keeping 95% of his speed through the whole cut (NFL p90 for the role 81%); asked for a 39° turn

**Free climber requesting near-zero movement (candidate)**: 5 events in 16 games

- sc11/G3-P135 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)
- sc11/G6-P023 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 1.13 yd/s (review braking/traffic)
- sc11/G11-P172 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 6 events in 16 games

- sc11/G16-P064 @ 2.40 s [representative detector tick 4.35 s]: SS trailing H within 1.18 yd through the recorded flight, body >137° from ball; arrival right-rear (-137°), turned 14° (not gaze evidence)
- sc11/G4-P137 @ 2.20 s [representative detector tick 3.70 s]: CB_W trailing X within 1.3 yd through the recorded flight, body >132° from ball; arrival left-rear (145°), turned 3° (not gaze evidence)
- sc11/G4-P153 @ 2.65 s [representative detector tick 4.00 s]: LB_M trailing Y within 1.64 yd through the recorded flight, body >128° from ball; arrival right-rear (-128°), turned 7° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 569 events in 16 games

- sc11/G2-P089 @ 1.65 s [representative detector tick 3.55 s]: RB travel 39° vs installed-aim bearing -82°; DE_S 0.13 yd ahead, 1.31 yd off heading (engaged false; geometry only)
- sc11/G1-P052 @ 1.75 s [representative detector tick 2.90 s]: RB travel 99° vs installed-aim bearing -76°; LB_W 0.01 yd ahead, 0.99 yd off heading (engaged false; geometry only) [play nullified by a penalty]
- sc11/G7-P153 @ 1.80 s [representative detector tick 3.15 s]: RB travel 90° vs installed-aim bearing -76°; LB_S 0.02 yd ahead, 1.02 yd off heading (engaged false; geometry only) [play nullified by a penalty]

### pkgLayer

**Pre-snap teammate contact**: 4 events in 16 games

- sc11/G2-P074 @ -0.40 s (pre-snap) [representative detector tick -0.05 s]: RB and F touched before the snap (no motion called), closing 0 yd/s
- sc11/G5-P096 @ -0.40 s (pre-snap) [representative detector tick -0.05 s]: RB and F touched before the snap (no motion called), closing 0 yd/s
- sc11/G8-P021 @ -0.35 s (pre-snap): RB and F touched before the snap (no motion called), closing 0 yd/s

**Defender turned away from a nearby runner**: 319 events in 16 games

- sc11/G15-P041 @ 2.45 s [representative detector tick 3.45 s]: CB_S facing 167° from the runner (RB) at 3.1 yd for 1.85 s; asked for 167°
- sc11/G10-P033 @ 3.10 s [representative detector tick 3.75 s]: DT_W facing 176° from the runner (RB) at 2.3 yd for 1.80 s; asked for 176° [play nullified by a penalty]
- sc11/G11-P111 @ 3.10 s [representative detector tick 4.30 s]: DE_S facing 157° from the runner (RB) at 3 yd for 1.70 s; asked for 157° [play nullified by a penalty]

**Blocker on a man who is out of the play**: 798 events in 16 games

- sc11/G16-P076 @ 1.85 s [representative detector tick 5.95 s]: RT (run-block) on SS, 15.1 yd from the runner and moving away at 4 yd/s, while CB_W is free 0.8 yd from the runner, for 4.15 s
- sc11/G4-P041 @ 1.60 s [representative detector tick 4.15 s]: Y (run-block) on SS, 7.6 yd from the runner and moving away at 2.3 yd/s, while FS is free 0.6 yd from the runner, for 2.60 s
- sc11/G7-P148 @ 1.70 s [representative detector tick 4.20 s]: LG (run-block) on DT_W, 13.5 yd from the runner and moving away at 0.9 yd/s, while DE_W is free 0.5 yd from the runner, for 2.55 s

**Lineman backpedaling while facing his own backfield**: 1828 events in 16 games

- sc11/G9-P128 @ 1.40 s [representative detector tick 3.00 s]: C facing 148° from downfield, moving back at 4.8 yd/s for 2.35 s (pass play)
- sc11/G3-P100 @ 1.15 s [representative detector tick 2.40 s]: LT facing 157° from downfield, moving back at 4.7 yd/s for 2.00 s (pass play)
- sc11/G4-P062 @ 4.25 s [representative detector tick 6.05 s]: LG facing 147° from downfield, moving back at 4.3 yd/s for 2.00 s (pass play)

**Sliding through a cut (candidate)**: 227 events in 16 games

- sc11/G12-P114 @ 1.10 s [representative detector tick 1.70 s]: NB turned 62° from 4.2 yd/s keeping 100% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 35° turn
- sc11/G8-P004 @ 3.30 s [representative detector tick 3.90 s]: SS turned 65° from 3.9 yd/s keeping 98% of his speed through the whole cut (NFL p90 for the role 85%); asked for a 48° turn
- sc11/G9-P048 @ 2.20 s [representative detector tick 2.80 s]: RB turned 60° from 4 yd/s keeping 90% of his speed through the whole cut (NFL p90 for the role 90%); asked for a 40° turn

**Free climber requesting near-zero movement (candidate)**: 4 events in 16 games

- sc11/G2-P070 @ 0.25 s [representative detector tick 0.90 s]: LT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic) [play nullified by a penalty]
- sc11/G16-P128 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic) [play nullified by a penalty]
- sc11/G16-P166 @ 0.25 s [representative detector tick 0.90 s]: RT (climb) free, requesting under 0.3 yd/s for 0.75 s; achieved 0 yd/s (review braking/traffic)

**QB goes down without a nearby defender (candidate)**: 0 events in 16 games

- none

**Trailing man defender stays turned from the ball (candidate)**: 5 events in 16 games

- sc11/G11-P051 @ 2.20 s [representative detector tick 3.50 s]: SS trailing Y within 1.44 yd through the recorded flight, body >124° from ball; arrival left-rear (124°), turned 17° (not gaze evidence)
- sc11/G8-P088 @ 2.30 s [representative detector tick 3.30 s]: NB trailing H within 1.27 yd through the recorded flight, body >128° from ball; arrival right-rear (-128°), turned 21° (not gaze evidence)
- sc11/G3-P074 @ 2.45 s [representative detector tick 3.40 s]: FS trailing RB within 1.4 yd through the recorded flight, body >158° from ball; arrival right-rear (-159°), turned 5° (not gaze evidence)

**Runner leaves installed aim toward a nearby defender (candidate)**: 546 events in 16 games

- sc11/G2-P084 @ 1.55 s [representative detector tick 3.75 s]: RB travel -43° vs installed-aim bearing 79°; DE_W 0.01 yd ahead, 0.54 yd off heading (engaged true; geometry only)
- sc11/G11-P045 @ 2.45 s [representative detector tick 4.25 s]: RB travel -125° vs installed-aim bearing 67°; DE_S 0.02 yd ahead, 0.51 yd off heading (engaged true; geometry only)
- sc11/G14-P153 @ 1.35 s [representative detector tick 1.80 s]: RB travel -73° vs installed-aim bearing 48°; DT_S 0.04 yd ahead, 0.85 yd off heading (engaged true; geometry only)


## Largest estimated changes

- Runs of 20+ that reach 40, all plays (n=9): 33.3% (3/9) → 77.8% (7/9)
- Pass TD rate, all plays (n=1307): 7.9% (103/1297) → 9.6% (125/1307)
- Points / team-game, all plays (n=32): 34.78 → 39.28
- Fumbles lost / team-game, all plays (n=32): 0.78 → 0.34
- Accepted penalties / team-game: illegal_touching, all plays (n=32): 0.13 → 0.00
- Accepted penalties / team-game: illegal_touching, all plays (n=32): 0.13 → 0.00
- Punts / team-game, all plays (n=32): 5.47 → 4.50
- Run stuff rate (<=0), all plays (n=682): 14.9% (107/717) → 8.9% (61/682)
scorecard: film weirdness events -> out/scorecard/weird-events.json
