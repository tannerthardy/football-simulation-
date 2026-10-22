# Flags

Every engine switch read from the environment, generated from `src` on 2026-10-22 (trunk `d91c9014`). Registration rules are in [PLAN.md](PLAN.md): at most 10 experimental flags, and each expires two reviews after it lands.

There are 68 flags: 22 are on by default, 1 is a diagnostic scale at identity (`DEF_GETOFF`), and 45 are off. The 24 rows marked "expires: review 2" were added by PR #190 (all default off or identity). At the first review, set an expiry for each off flag and bring the experimental count to 10. Flags that are on by default can lose their switch, keeping only the new path.

| Flag | Default | Status | Lane | Read in | Expires |
| --- | --- | --- | --- | --- | --- |
| `ANCHOR_SPLIT` | on | default | trenches | `src/sim/engagement.ts:668` | — |
| `CLIMB_INTERCEPT` | on | default | run | `src/sim/behaviors/blocking.ts:764` | — |
| `CLIMB_PLAN` | on | default | run | `src/sim/behaviors/blocking.ts:761` | — |
| `DL_FLOW` | on | default | trenches | `src/sim/engagement.ts:678` | — |
| `FLOW_READ` | on | default | defense | `src/sim/run-fits.ts:148` | — |
| `FLOW_RELEASE` | on | default | run | `src/sim/behaviors/blocking.ts:755` | — |
| `KEEPER_TORSO` | on | default | run | `src/sim/behaviors/blocking.ts:758` | — |
| `LB_PLAN` | on | default | defense | `src/sim/run-fits.ts:142` | — |
| `LEVER_FACING` | on | default | trenches | `src/sim/engagement.ts:696` | — |
| `LIVE_AIM` | on | default | run | `src/sim/behaviors/carrier.ts:47` | — |
| `LIVE_GAPS` | on | default | run | `src/sim/live-gaps.ts:25` | — |
| `PULL_READ` | on | default | defense | `src/sim/run-fits.ts:151` | — |
| `READ_EYES` | on | default | defense | `src/sim/run-read.ts:42` | — |
| `RUN_ANCHOR` | on | default | trenches | `src/sim/engagement.ts:706` | — |
| `RUN_CONTACT_COMPONENTS` | on | default | trenches | `src/sim/engagement.ts:675` | — |
| `SCRAPE` | on | default | defense | `src/sim/run-fits.ts:139` | — |
| `SHED_PHYSICAL` | on | default | trenches | `src/sim/engagement.ts:699` | — |
| `STALK_CLAIM` | on | default | run | `src/sim/behaviors/blocking.ts:752` | — |
| `STRETCH_MESH` | on | default | run | `src/sim/assign.ts:158` | — |
| `STRETCH_REACH` | on | default | trenches | `src/sim/engagement.ts:671` | — |
| `THREAT_READ` | on | default | defense | `src/sim/run-fits.ts:139` | — |
| `ZONE_FLOW` | on | default | run | `src/sim/behaviors/blocking.ts:767` | — |
| `CF_FLOW` | off | experimental | tools | `src/sim/counterfactual.ts:5` | set at first review |
| `DL_FIGHT` | off | experimental | trenches | `src/sim/engagement.ts:693` | set at first review |
| `DL_HANDS` | off | experimental | trenches | `src/sim/engagement.ts:689` | set at first review |
| `GAIT_STEP` | off | experimental | physics | `src/physics/kinematics.ts:94` | set at first review |
| `HAND_FIGHT` | off | experimental | trenches | `src/sim/engagement.ts:1028` | set at first review |
| `HAND_MOTOR` | off | experimental | physics | `src/physics/world.ts:302` | set at first review |
| `HOLD_SUBSTEPS` | off | experimental | physics | `src/physics/world.ts:300` | set at first review |
| `IN_STRIDE_CATCH` | off | experimental | coverage | `src/sim/behaviors/receiver.ts:283` | set at first review |
| `LEG_BRACE` | off | experimental | physics | `src/physics/world.ts:304` | set at first review |
| `PASS_SINK` | off | experimental | trenches | `src/sim/engagement.ts:691` | set at first review |
| `PULL_CUE` | off | experimental | defense | `src/sim/run-fits.ts:154` | set at first review |
| `PULL_PLAN` | off | experimental | defense | `src/sim/run-fits.ts:145` | set at first review |
| `PULL_STEP` | off | experimental | run | `src/sim/behaviors/blocking.ts:37` | set at first review |
| `REACH_CONTACT` | off | experimental | defense | `src/sim/tackle.ts:66` | set at first review |
| `READ_RISK_TRACE` | off | experimental | defense | `src/sim/run-read.ts:117` | set at first review |
| `RUN_CONTACT_TRACK` | off | experimental | trenches | `src/sim/engagement.ts:673` | set at first review |
| `RUN_HANDS` | off | experimental | trenches | `src/sim/engagement.ts:687` | set at first review |
| `RUN_READ` | off | experimental | defense | `src/sim/run-read.ts:35` | set at first review |
| `RUN_READ_TURN` | off | experimental | defense | `src/sim/run-read.ts:39` | set at first review |
| `TACKLE_ROLL` | off | experimental | defense | `src/sim/tackle.ts:60` | set at first review |
| `TACKLE_TOUCH` | off | experimental | defense | `src/sim/tackle.ts:69` | set at first review |
| `WRAP_BIND` | off | experimental | defense | `src/sim/tackle.ts:63` | set at first review |
| `BLOCKED_REACH` | off | experimental | defense | `src/sim/tackle.ts:80` | expires: review 2 |
| `DEEP_NO_FORCE` | off | experimental | defense | `src/sim/run-fits.ts:205` | expires: review 2 |
| `DEF_ALIGN` | off | experimental | coverage | `src/playbook/alignment.ts:71` | expires: review 2 |
| `DEF_GETOFF` | 1 (identity scale) | diagnostic | defense | `src/sim/agent.ts:25` | expires: review 2 |
| `DL_ANCHOR` | off | experimental | trenches | `src/sim/engagement.ts:80` | expires: review 2 |
| `DL_CHASE` | off | experimental | trenches | `src/sim/engagement.ts:685` | expires: review 2 |
| `DL_FLATTEN` | off | experimental | trenches | `src/sim/engagement.ts:90` | expires: review 2 |
| `DL_FLATTEN_WON` | off | experimental | trenches | `src/sim/engagement.ts:106` | expires: review 2 |
| `DL_KEY` | off | experimental | trenches | `src/sim/behaviors/defense.ts:37` | expires: review 2 |
| `DL_SQUEEZE` | off | experimental | trenches | `src/sim/engagement.ts:100` | expires: review 2 |
| `FORCE_BOUNCE` | off | experimental | defense | `src/sim/run-fits.ts:174` | expires: review 2 |
| `FRONT_ALIGN` | off | experimental | defense | `src/game/playcaller.ts:33`, `src/playbook/alignment.ts:104` | expires: review 2 |
| `LB_LANDMARK` | off | experimental | defense | `src/sim/run-fits.ts:192` | expires: review 2 |
| `LB_TEMPO` | off | experimental | defense | `src/sim/run-fits.ts:184` | expires: review 2 |
| `OL_SPLITS` | off | experimental | run | `src/playbook/alignment.ts:24` | expires: review 2 |
| `OL_STAGGER` | off | experimental | run | `src/playbook/alignment.ts:32` | expires: review 2 |
| `PAD_LEVERAGE` | off | experimental | physics | `src/physics/world.ts:313` | expires: review 2 |
| `PASS_FEEL` | off | experimental | trenches | `src/sim/engagement.ts:713` | expires: review 2 |
| `PULL_EARLY` | off | experimental | defense | `src/sim/run-fits.ts:165` | expires: review 2 |
| `SAFETY_TEMPO` | off | experimental | defense | `src/sim/run-fits.ts:199` | expires: review 2 |
| `SHORT_PACKAGE` | off | experimental | defense | `src/game/playcaller.ts:47`, `src/playbook/alignment.ts:106` | expires: review 2 |
| `SNAP_REACT` | off | experimental | rules | `src/sim/snap-count.ts:30` | expires: review 2 |
| `TIP_AWAY` | off | experimental | coverage | `src/sim/catching.ts:23` | expires: review 2 |
| `WR_ALIGN` | off | experimental | run | `src/playbook/alignment.ts:80` | expires: review 2 |
| `FRONT_STRENGTH` | off | experimental | defense | `src/game/playcaller.ts:51`, `src/playbook/alignment.ts:120` | expires: review 2 |
| `FRONT_MENU` | off | experimental | defense | `src/game/playcaller.ts:69`, `src/playbook/alignment.ts:129` | expires: review 2 |
| `BOX_ALIGN` | off | experimental | defense | `src/playbook/alignment.ts:153` | expires: review 2 |
| `DEF_PACKAGE` | off | experimental | defense | `src/game/playcaller.ts:79` | expires: review 2 |
| `SHELL_SHOW` | off | experimental | defense | `src/game/playcaller.ts:93`, `src/playbook/alignment.ts:156` | expires: review 2 |
| `COVER_CALL` | off | experimental | defense | `src/game/playcaller.ts:114` | expires: review 2 |
| `MOTION_CHECK` | off | experimental | defense | `src/sim/motion.ts:277` | expires: review 2 (turn on with `MOTION`) |
| `PRESSURE_CALL` | off | experimental | defense | `src/game/playcaller.ts:126` | expires: review 2 (turn on with `DEUCE`) |
| `AGAP_ALIGN` | off | experimental | defense | `src/playbook/alignment.ts:167` | expires: review 2 |
