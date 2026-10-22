# Flags

Every engine switch read from the environment, generated from `src` on 2026-10-22 (trunk `d91c9014`). Registration rules are in [PLAN.md](PLAN.md): at most 10 experimental flags, and each expires two reviews after it lands.

There are 44 flags: 22 are on by default and 22 are off. At the first review, set an expiry for each off flag and bring the experimental count to 10. Flags that are on by default can lose their switch, keeping only the new path.

| Flag | Default | Status | Lane | Read in | Expires |
| --- | --- | --- | --- | --- | --- |
| `ANCHOR_SPLIT` | on | default | trenches | `src/sim/engagement.ts:629` | — |
| `CLIMB_INTERCEPT` | on | default | run | `src/sim/behaviors/blocking.ts:760` | — |
| `CLIMB_PLAN` | on | default | run | `src/sim/behaviors/blocking.ts:757` | — |
| `DL_FLOW` | on | default | trenches | `src/sim/engagement.ts:639` | — |
| `FLOW_READ` | on | default | defense | `src/sim/run-fits.ts:147` | — |
| `FLOW_RELEASE` | on | default | run | `src/sim/behaviors/blocking.ts:751` | — |
| `KEEPER_TORSO` | on | default | run | `src/sim/behaviors/blocking.ts:754` | — |
| `LB_PLAN` | on | default | defense | `src/sim/run-fits.ts:141` | — |
| `LEVER_FACING` | on | default | trenches | `src/sim/engagement.ts:650` | — |
| `LIVE_AIM` | on | default | run | `src/sim/behaviors/carrier.ts:47` | — |
| `LIVE_GAPS` | on | default | run | `src/sim/live-gaps.ts:25` | — |
| `PULL_READ` | on | default | defense | `src/sim/run-fits.ts:150` | — |
| `READ_EYES` | on | default | defense | `src/sim/run-read.ts:42` | — |
| `RUN_ANCHOR` | on | default | trenches | `src/sim/engagement.ts:660` | — |
| `RUN_CONTACT_COMPONENTS` | on | default | trenches | `src/sim/engagement.ts:636` | — |
| `SCRAPE` | on | default | defense | `src/sim/run-fits.ts:138` | — |
| `SHED_PHYSICAL` | on | default | trenches | `src/sim/engagement.ts:653` | — |
| `STALK_CLAIM` | on | default | run | `src/sim/behaviors/blocking.ts:748` | — |
| `STRETCH_MESH` | on | default | run | `src/sim/assign.ts:158` | — |
| `STRETCH_REACH` | on | default | trenches | `src/sim/engagement.ts:632` | — |
| `THREAT_READ` | on | default | defense | `src/sim/run-fits.ts:138` | — |
| `ZONE_FLOW` | on | default | run | `src/sim/behaviors/blocking.ts:763` | — |
| `CF_FLOW` | off | experimental | tools | `src/sim/counterfactual.ts:5` | set at first review |
| `DL_FIGHT` | off | experimental | trenches | `src/sim/engagement.ts:647` | set at first review |
| `DL_HANDS` | off | experimental | trenches | `src/sim/engagement.ts:643` | set at first review |
| `GAIT_STEP` | off | experimental | physics | `src/physics/kinematics.ts:94` | set at first review |
| `HAND_FIGHT` | off | experimental | trenches | `src/sim/engagement.ts:957` | set at first review |
| `HAND_MOTOR` | off | experimental | physics | `src/physics/world.ts:302` | set at first review |
| `HOLD_SUBSTEPS` | off | experimental | physics | `src/physics/world.ts:300` | set at first review |
| `IN_STRIDE_CATCH` | off | experimental | coverage | `src/sim/behaviors/receiver.ts:283` | set at first review |
| `LEG_BRACE` | off | experimental | physics | `src/physics/world.ts:304` | set at first review |
| `PASS_SINK` | off | experimental | trenches | `src/sim/engagement.ts:645` | set at first review |
| `PULL_CUE` | off | experimental | defense | `src/sim/run-fits.ts:153` | set at first review |
| `PULL_PLAN` | off | experimental | defense | `src/sim/run-fits.ts:144` | set at first review |
| `PULL_STEP` | off | experimental | run | `src/sim/behaviors/blocking.ts:36` | set at first review |
| `REACH_CONTACT` | off | experimental | defense | `src/sim/tackle.ts:66` | set at first review |
| `READ_RISK_TRACE` | off | experimental | defense | `src/sim/run-read.ts:117` | set at first review |
| `RUN_CONTACT_TRACK` | off | experimental | trenches | `src/sim/engagement.ts:634` | set at first review |
| `RUN_HANDS` | off | experimental | trenches | `src/sim/engagement.ts:641` | set at first review |
| `RUN_READ` | off | experimental | defense | `src/sim/run-read.ts:35` | set at first review |
| `RUN_READ_TURN` | off | experimental | defense | `src/sim/run-read.ts:39` | set at first review |
| `TACKLE_ROLL` | off | experimental | defense | `src/sim/tackle.ts:60` | set at first review |
| `TACKLE_TOUCH` | off | experimental | defense | `src/sim/tackle.ts:69` | set at first review |
| `WRAP_BIND` | off | experimental | defense | `src/sim/tackle.ts:63` | set at first review |
