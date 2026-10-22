# Flags

Every engine switch read from the environment, generated from `src` on 2026-10-22 (trunk `d91c9014`). Flags that are not on develop (parked, removed from a PR, or only on a side branch) are kept in [PARKED.md](PARKED.md) so the ideas are not lost. Registration rules are in [PLAN.md](PLAN.md): at most 10 experimental flags, and each expires two reviews after it lands.

There are 78 flags: 54 are on by default, 1 is a diagnostic scale at identity (`DEF_GETOFF`), and 23 are off. On 2026-10-22, 31 realistic flags from this week's integration were turned on in the code (rows marked "promoted"); each keeps a `=0` switch until review 2, when its off path is dropped. At the first review, set an expiry for each off flag and bring the experimental count to 10.

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
| `SHED_PURSUE` | on | default | defense | `src/sim/engagement.ts:708` | — |
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
| `BLOCKED_REACH` | on | default (promoted 2026-10-22) | defense | `src/sim/tackle.ts:80` | review 2: drop the off path |
| `DEEP_NO_FORCE` | off | experimental | defense | `src/sim/run-fits.ts:195` | expires: review 2. Open: who supplies force in Cover 2 Man and which inside jobs trade; Defense, Run Game and Coverage to agree (#193, #190 comments) |
| `DEF_ALIGN` | on | default (promoted 2026-10-22) | coverage | `src/playbook/alignment.ts:71` | review 2: drop the off path |
| `DEF_GETOFF` | 1 (identity scale) | diagnostic | trenches | `src/sim/agent.ts:25` | expires: review 2 |
| `DL_ANCHOR` | on | default (promoted 2026-10-22) | trenches | `src/sim/engagement.ts:80` | review 2: drop the off path |
| `DL_CHASE` | on | default (promoted 2026-10-22) | trenches | `src/sim/engagement.ts:685` | review 2: drop the off path |
| `DL_FLATTEN` | on | default (promoted 2026-10-22) | trenches | `src/sim/engagement.ts:90` | review 2: drop the off path |
| `DL_FLATTEN_WON` | on | default (promoted 2026-10-22) | trenches | `src/sim/engagement.ts:106` | review 2: drop the off path |
| `DL_SQUEEZE` | on | default (promoted 2026-10-22) | trenches | `src/sim/engagement.ts:100` | review 2: drop the off path |
| `FORCE_BOUNCE` | on | default (promoted 2026-10-22) | defense | `src/sim/run-fits.ts:174` | review 2: drop the off path |
| `FRONT_ALIGN` | on | default (promoted 2026-10-22) | defense | `src/game/playcaller.ts:33`, `src/playbook/alignment.ts:104` | review 2: drop the off path |
| `LB_LANDMARK` | on | default (promoted 2026-10-22) | defense | `src/sim/run-fits.ts:182` | review 2: drop the off path |
| `OL_SPLITS` | on | default (promoted 2026-10-22) | run | `src/playbook/alignment.ts:24` | review 2: drop the off path |
| `OL_STAGGER` | on | default (promoted 2026-10-22) | run | `src/playbook/alignment.ts:32` | review 2: drop the off path |
| `PAD_LEVERAGE` | on | default (promoted 2026-10-22) | physics | `src/physics/world.ts:313` | review 2: drop the off path |
| `PASS_FEEL` | on | default (promoted 2026-10-22) | trenches | `src/sim/engagement.ts:713` | review 2: drop the off path |
| `PULL_EARLY` | on | default (promoted 2026-10-22) | defense | `src/sim/run-fits.ts:165` | review 2: drop the off path |
| `SAFETY_TEMPO` | on | default (promoted 2026-10-22) | defense | `src/sim/run-fits.ts:189` | review 2: drop the off path |
| `SHORT_PACKAGE` | on | default (promoted 2026-10-22) | defense | `src/game/playcaller.ts:47`, `src/playbook/alignment.ts:106` | review 2: drop the off path |
| `SNAP_REACT` | on | default (promoted 2026-10-22) | rules | `src/sim/snap-count.ts:30` | review 2: drop the off path |
| `TIP_AWAY` | on | default (promoted 2026-10-22) | coverage | `src/sim/catching.ts:23` | review 2: drop the off path |
| `WR_ALIGN` | on | default (promoted 2026-10-22) | run | `src/playbook/alignment.ts:80` | review 2: drop the off path |
| `MOTION` | on | default (promoted 2026-10-22) | coverage | `src/sim/motion.ts:34` | review 2: drop the off path |
| `DEUCE` | on | default (promoted 2026-10-22) | coverage | `src/playbook/call-integrity.ts:67` | review 2: drop the off path |
| `FRONT_STRENGTH` | on | default (promoted 2026-10-22) | defense | `src/game/playcaller.ts:52`, `src/playbook/alignment.ts:120` | review 2: drop the off path |
| `FRONT_MENU` | on | default (promoted 2026-10-22) | defense | `src/game/playcaller.ts:70`, `src/playbook/alignment.ts:129` | review 2: drop the off path |
| `BOX_ALIGN` | on | default (promoted 2026-10-22) | defense | `src/playbook/alignment.ts:153` | review 2: drop the off path |
| `DEF_PACKAGE` | on | default (promoted 2026-10-22) | defense | `src/game/playcaller.ts:80` | review 2: drop the off path |
| `SHELL_SHOW` | on | default (promoted 2026-10-22) | defense | `src/game/playcaller.ts:94`, `src/playbook/alignment.ts:156` | review 2: drop the off path |
| `COVER_CALL` | on | default (promoted 2026-10-22) | defense | `src/game/playcaller.ts:115` | review 2: drop the off path |
| `MOTION_CHECK` | on | default (promoted 2026-10-22) | defense | `src/sim/motion.ts:293` | review 2: drop the off path |
| `PRESSURE_CALL` | on | default (promoted 2026-10-22) | defense | `src/game/playcaller.ts:126` | review 2: drop the off path |
| `AGAP_ALIGN` | on | default (promoted 2026-10-22) | defense | `src/playbook/alignment.ts:167` | review 2: drop the off path |
