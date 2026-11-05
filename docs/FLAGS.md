# Flags

Every engine switch read from the environment, recounted from `src` at `57f50fc3` on 2026-10-22. This includes #210's promotion and #205's two additional default-on switches. Flags that are not on develop (parked, removed from a PR, or only on a side branch) are kept in [PARKED.md](PARKED.md) so the ideas are not lost. Registration rules are in [PLAN.md](PLAN.md): at most 10 experimental flags, and each expires two reviews after it lands.

There are 89 flags: 68 are on by default, 1 is a diagnostic scale at identity (`DEF_GETOFF`), and 20 are off (`PULL_STEP` landed as the default pull step and was removed, G2 2026-10-27; `LEG_BRACE`, `WRAP_BIND` and `TACKLE_ROLL` landed with the held-stride law and were removed, Main Engine 2026-10-27) (#215 adds `ARM_PRESS`, `PASS_KICK` and `ROUTE_CLEAR`, all on; #217 adds `GRIP_HOLD`, on). On 2026-10-22, 31 realistic flags from this week's integration were turned on in the code (rows marked "promoted"); each keeps a `=0` switch until review 2, when its off path is dropped. `PASS_FIRST`, `STALK_CUSHION` and `BACK_BLOCK` (G2) landed on the same terms. At the first review, set an expiry for each off flag and bring the experimental count to 10.

| Flag | Default | Status | Lane | Read in | Expires |
| --- | --- | --- | --- | --- | --- |
| `ANCHOR_SPLIT` | on | default | trenches | `src/sim/engagement.ts:673` | — |
| `ARM_PRESS` | on | default (G5, 2026-10-22) | physics | `src/physics/support.ts:106` | review 2: drop the off path. Pushing through the hands uses the bench press (combine reps, Epley), counted in press units in the arm budget and its work and impulse ledgers; agreed with G2 for run reps. Staged scenes recorded on arm-force hands are pinned under RUN-11 until review 2 |
| `CLIMB_INTERCEPT` | on | default | run | `src/sim/behaviors/blocking.ts:856` | — |
| `CLIMB_PLAN` | on | default | run | `src/sim/behaviors/blocking.ts:853` | — |
| `EDGE_CONTAIN` | on | default (G1/G2, 2026-10-25) | trenches | `src/sim/engagement.ts:716` | review 2: drop the off path. A blocked edge widens with a reach only as far as containing the back's observed track needs; already wider, he holds. Recorded scenes staged on unbounded widening (`planned-climb-fit`, `zone-helper-check`) pin it off until re-recorded |
| `SEAL_HOLD` | on | default (G1/G2, 2026-10-25) | trenches | `src/sim/engagement.ts:721` | review 2: drop the off path. A run blocker whose own felt load says his hands are on keeps the leverage he caught the man with; he no longer runs to a new shoulder and carries the man along |
| `GAP_MATCH` | on | default (G1/G2, 2026-10-25) | defense | `src/sim/run-fits.ts:243` | review 2: drop the off path. Backers fill the front's open gaps as a set: the gap left open is one an underneath support player still covers, never an unsupported or A gap. Nearest-first left the nickel Under's gap between the weak tackle and a second tight end empty |
| `FLOW_READ` | on | default | defense | `src/sim/run-fits.ts:189` | — |
| `DL_GAMES` | off | experimental (G2, 2026-11-05) | defense | `src/game/playcaller.ts:129` | two reviews after it lands. The coordinator calls defensive-line games: angles, slants and pinches on run downs (the movers take their new gaps from the snap; backers re-fit the gaps vacated), twists (TE/ET/TT) on passing downs. Off until the offense's blocking rules answer movement |
| `FLOW_RELEASE` | on | default | run | `src/sim/behaviors/blocking.ts:847` | — |
| `KEEPER_TORSO` | on | default | run | `src/sim/behaviors/blocking.ts:850` | — |
| `LB_PLAN` | on | default | defense | `src/sim/run-fits.ts:183` | — |
| `LEVER_FACING` | on | default | trenches | `src/sim/engagement.ts:723` | — |
| `LIVE_AIM` | on | default | run | `src/sim/behaviors/carrier.ts:47` | — |
| `LIVE_GAPS` | on | default | run | `src/sim/live-gaps.ts:25` | — |
| `PASS_KICK` | on | default (G5, 2026-10-22) | trenches | `src/sim/behaviors/blocking.ts:332` | review 2: drop the off path. Vertical pass set against edge rushers (ported from `claude/run-game-v3`); decided by edge-rep first contact and tackle retreat vs tracking |
| `PASS_FIRST` | on | default (G2) | defense | `src/sim/behaviors/defense.ts:37` | review 2: drop the off path |
| `PULL_READ` | on | default | defense | `src/sim/run-fits.ts:192` | — |
| `PURSUE_AROUND` | on | default | defense | `src/sim/behaviors/common.ts:249` | — |
| `READ_EYES` | on | default | defense | `src/sim/run-read.ts:42` | — |
| `ROUTE_CLEAR` | on | default (G5, 2026-10-22) | coverage | `src/sim/behaviors/receiver.ts:39` | review 2: drop the off path. A back releasing from the backfield paths around a body in his lane (a teammate, or a rusher) instead of running into it; decided by the back's release speed past a kicking tackle |
| `RUN_ANCHOR` | on | default | trenches | `src/sim/engagement.ts:744` | — |
| `RUN_CONTACT_COMPONENTS` | on | default | trenches | `src/sim/engagement.ts:680` | — |
| `RUN_FEEL` | on | default (G1, 2026-10-23) | trenches | `src/sim/engagement.ts:703` | review 2: drop the off path. A run blocker mirrors the defender's motion as he has it (PASS_FEEL's touch/sight delays), not his true velocity; decided by DL release in the G1 lab |
| `SCRAPE` | on | default | defense | `src/sim/run-fits.ts:180` | — |
| `SHED_PHYSICAL` | on | default | trenches | `src/sim/engagement.ts:726` | — |
| `SHED_PURSUE` | on | default | defense | `src/sim/engagement.ts:735` | — |
| `STALK_CLAIM` | on | default | run | `src/sim/behaviors/blocking.ts:844` | — |
| `STALK_CUSHION` | on | default (G2) | run | `src/sim/behaviors/blocking.ts:820` | review 2: drop the off path |
| `BACK_BLOCK` | on | default (G2) | run | `src/sim/behaviors/blocking.ts:831` | review 2: drop the off path |
| `STRETCH_MESH` | on | default | run | `src/sim/assign.ts:158` | — |
| `STRETCH_REACH` | on | default | trenches | `src/sim/engagement.ts:676` | — |
| `THREAT_READ` | on | default | defense | `src/sim/run-fits.ts:180` | — |
| `ZONE_FLOW` | on | default | run | `src/sim/behaviors/blocking.ts:859` | — |
| `CF_FLOW` | off | experimental | tools | `src/sim/counterfactual.ts:5` | set at first review |
| `DL_FIGHT` | off | experimental | trenches | `src/sim/engagement.ts:712` | set at first review |
| `DL_HANDS` | off | experimental | trenches | `src/sim/engagement.ts:694` | set at first review |
| `GAIT_STEP` | off | experimental | physics | `src/physics/kinematics.ts:94` | set at first review |
| `HAND_FIGHT` | off | experimental | trenches | `src/sim/engagement.ts:1093` | set at first review |
| `HAND_MOTOR` | off | experimental | physics | `src/physics/world.ts:302` | set at first review |
| `HOLD_SUBSTEPS` | off | experimental | physics | `src/physics/world.ts:300` | set at first review |
| `IN_STRIDE_CATCH` | off | experimental | coverage | `src/sim/behaviors/receiver.ts:330` | set at first review |
| `PASS_SINK` | off | experimental | trenches | `src/sim/engagement.ts:696` | set at first review |
| `PULL_CUE` | off | experimental | defense | `src/sim/run-fits.ts:195` | set at first review |
| `PULL_PLAN` | off | experimental | defense | `src/sim/run-fits.ts:186` | set at first review |
| `REACH_CONTACT` | off | experimental | defense | `src/sim/tackle.ts:71` | set at first review |
| `READ_RISK_TRACE` | off | experimental | defense | `src/sim/run-read.ts:117` | set at first review |
| `RUN_CONTACT_TRACK` | off | experimental | trenches | `src/sim/engagement.ts:678` | set at first review |
| `RUN_HANDS` | off | experimental | trenches | `src/sim/engagement.ts:692` | set at first review |
| `RUN_READ` | off | experimental | defense | `src/sim/run-read.ts:35` | set at first review |
| `RUN_READ_TURN` | off | experimental | defense | `src/sim/run-read.ts:39` | set at first review |
| `TACKLE_TOUCH` | off | experimental | defense | `src/sim/tackle.ts:74` | set at first review |
| `BLOCKED_REACH` | on | default (promoted 2026-10-22) | defense | `src/sim/tackle.ts:85` | review 2: drop the off path |
| `GRIP_HOLD` | on | default (2026-10-22) | physics | `src/sim/tackle.ts:95` | review 2: drop the off path |
| `DEEP_NO_FORCE` | off | experimental | defense | `src/sim/run-fits.ts:236` | expires: review 2. Open: who supplies force in Cover 2 Man and which inside jobs trade; Defense, Run Game and Coverage to agree (#193, #190 comments) |
| `DEF_ALIGN` | on | default (promoted 2026-10-22) | coverage | `src/playbook/alignment.ts:71` | review 2: drop the off path |
| `DEF_GETOFF` | 1 (identity scale) | diagnostic | trenches | `src/sim/agent.ts:25` | expires: review 2 |
| `DL_ANCHOR` | on | default (promoted 2026-10-22) | trenches | `src/sim/engagement.ts:80` | review 2: drop the off path |
| `DL_CHASE` | on | default (promoted 2026-10-22) | trenches | `src/sim/engagement.ts:690` | review 2: drop the off path |
| `DL_FLATTEN` | on | default (promoted 2026-10-22) | trenches | `src/sim/engagement.ts:90` | review 2: drop the off path |
| `DL_FLATTEN_WON` | on | default (promoted 2026-10-22) | trenches | `src/sim/engagement.ts:106` | review 2: drop the off path |
| `DL_SQUEEZE` | on | default (promoted 2026-10-22) | trenches | `src/sim/engagement.ts:100` | review 2: drop the off path |
| `FORCE_BOUNCE` | on | default (promoted 2026-10-22) | defense | `src/sim/run-fits.ts:215` | review 2: drop the off path |
| `FRONT_ALIGN` | on | default (promoted 2026-10-22) | defense | `src/game/playcaller.ts:34`, `src/playbook/alignment.ts:104` | review 2: drop the off path |
| `LB_LANDMARK` | on | default (promoted 2026-10-22) | defense | `src/sim/run-fits.ts:223` | review 2: drop the off path |
| `OL_SPLITS` | on | default (promoted 2026-10-22) | run | `src/playbook/alignment.ts:24` | review 2: drop the off path |
| `OL_STAGGER` | on | default (promoted 2026-10-22) | run | `src/playbook/alignment.ts:32` | review 2: drop the off path |
| `PAD_LEVERAGE` | on | default (promoted 2026-10-22) | physics | `src/physics/world.ts:313` | review 2: drop the off path |
| `PASS_FEEL` | on | default (promoted 2026-10-22) | trenches | `src/sim/engagement.ts:751` | review 2: drop the off path |
| `PULL_EARLY` | on | default (promoted 2026-10-22) | defense | `src/sim/run-fits.ts:206` | review 2: drop the off path |
| `SAFETY_TEMPO` | on | default (promoted 2026-10-22) | defense | `src/sim/run-fits.ts:230` | review 2: drop the off path |
| `SHORT_PACKAGE` | on | default (promoted 2026-10-22) | defense | `src/game/playcaller.ts:48`, `src/playbook/alignment.ts:106` | review 2: drop the off path |
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
| `GROUNDING_FACTS` | on | default (G6, #214) | rules | `src/sim/pass-legality.ts:20` | expires: review 2 (drop the off path) |
| `HOLD_LEVERAGE` | on | default (G6, #219) | rules | `src/sim/contact-holding.ts:25` | expires: review 2 (drop the off path) |
