# Flags

Every engine switch read from the environment, recounted from `src` at `57f50fc3` on 2026-10-22. This includes #210's promotion and #205's two additional default-on switches. Flags that are not on develop (parked, removed from a PR, or only on a side branch) are kept in [PARKED.md](PARKED.md) so the ideas are not lost. Registration rules are in [PLAN.md](PLAN.md): at most 10 experimental flags, and each expires two reviews after it lands.

There are 88 flags: 68 are on by default, 1 is a diagnostic scale at identity (`DEF_GETOFF`), and 19 are off (`PULL_STEP` landed as the default pull step and was removed, G2 2026-10-27; `LEG_BRACE`, `WRAP_BIND` and `TACKLE_ROLL` landed with the held-stride law and were removed, Main Engine 2026-10-27) (#215 adds `ARM_PRESS`, `PASS_KICK` and `ROUTE_CLEAR`, all on; #217 adds `GRIP_HOLD`, on). On 2026-10-22, 31 realistic flags from this week's integration were turned on in the code (rows marked "promoted"); each keeps a `=0` switch until review 2, when its off path is dropped. `PASS_FIRST`, `STALK_CUSHION` and `BACK_BLOCK` (G2) landed on the same terms. At the first review, set an expiry for each off flag and bring the experimental count to 10.

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
| `ENGAGED_TECHNIQUE` | off | experimental (run game, 2026-11-03) | trenches | `src/sim/engaged-technique.ts:24` | the engaged run blocker's feet follow the goal his controller names (drive at his own pace, or a climber walls his backer off from the runner from the ball-side shoulder) instead of the fixed 2.4 yd/s rep-law drive along the contact-time line; contact law unchanged. Evidence: run-game/DRILLS.md on evidence/counter-scorecard |
| `ENGAGED_DEFENDER` | off | experimental hook (run game for Defense, 2026-11-03) | trenches | `src/sim/engaged-technique.ts:30` | an engaged defender off the first-level stack read (box backers, unassigned men) keeps his own controller's request; contact decides how far he gets. Neutral hook: the defender behaviour is Defense's |
| `REACH_TECHNIQUE` | off | experimental (run game, 2026-11-03) | trenches | `src/sim/engaged-technique.ts:39` | a zone reach blocker races for his man's play-side shoulder at his own lateral speed (no mirroring away from the play), then holds it and goes at least with the man's flow; with hand control he steers across the man's face (acts through `HAND_MOTOR`) |
| `BACKSIDE_COMBO` | off | experimental (run game, 2026-11-03) | trenches | `src/sim/behaviors/blocking.ts:537` | zone runs: the backside end outside the backside tackle is left alone; the tackle doubles the backside guard's man and the guard climbs to the unassigned backside backer |
| `DOUBLE_HANDOFF` | off | experimental (run game, 2026-11-04) | trenches | `src/sim/behaviors/blocking.ts:545` | a double-team keeper with hands on the man within working reach plus 0.35 yd counts as able to take him over (loaded or not), so moving doubles release on the backer cue |
| `CLIMB_PREP` | off | experimental (run game, 2026-11-04) | trenches | `src/sim/engagement.ts:813` | the zone-double member with a climb backer, once he sees the backer showing, keeps his feet going with the man's lateral flow (+0.5 yd/s) and gaining ground upfield while his hands stay on |
| `CLIMB_SQUARE` | off | experimental (run game, 2026-11-04) | trenches | `src/sim/engagement.ts:818` | with CLIMB_PREP, the climber squares his shoulders upfield while his hands stay on the down man, so he can leave without first turning his body |
| `RELEASE_QUICK` | off | experimental (run game, 2026-11-04) | trenches | `src/sim/behaviors/blocking.ts:551` | with his backer showing, a double member's release read skips the 0.15 s keeper-secure dwell (read cadence unchanged) |
| `RB_STEER` | off | experimental (run game, 2026-11-04) | backfield | `src/sim/spacing.ts:25` | a ball carrier (or lead back) whose held request runs into a teammate first bends the request around him at speed; he slows or gathers only when no bend clears |
| `ZONE_PAIR` | off | experimental (run game, 2026-11-04) | trenches | `src/sim/behaviors/blocking.ts:559` | an uncovered zone lineman doubles the covered neighbor whose man is nearest him (within 1.8 yd), play side first, else climbs (installed: always the play-side neighbor) |
| `NO_CROSS` | off | experimental (run game, 2026-11-04) | trenches | `src/sim/behaviors/blocking.ts:564` | two solo blockers outside the line (tight end, wing, receiver) never cross assignments; the inside man takes the inside defender; a man on the line is never traded for one off it |
| `FB_PLAYSIDE` | off | experimental (run game, 2026-11-04) | backfield | `src/sim/behaviors/blocking.ts:613` | on stretch runs the lead fullback takes the first free play-side core defender, or none (reads his lane), never a free man across the formation |
| `DOUBLE_FLOW` | off | experimental (run game, 2026-11-04) | trenches | `src/sim/behaviors/blocking.ts:625` | a double member does not hand the down man to his partner while (felt through his hands on the man) the man moves away from the partner toward the climber's side over 0.5 yd/s; the man's flow decides who climbs (stretch runs: only while the keeper trails the man's flow by over 0.45 yd — the backside overtake) |
| `RB_COMMIT` | off | experimental (run game, 2026-11-04) | backfield | `src/sim/behaviors/carrier.ts:51` | at the line the back's entry choice counts the turn his momentum must make to each route (scaled by speed) and holds the lane he chose unless another is clearly better |
| `RB_HELD` | off | experimental (run game, 2026-11-04) | backfield | `src/sim/behaviors/carrier.ts:59` | the back's line read gives a defender he sees a blocker on the open-field read's held-up time (0.7 s; 0.25 s if visibly coming through the block) instead of treating engaged linemen as free |
| `CLIMB_RIP` | off | experimental (run game, 2026-11-04) | trenches | `src/sim/behaviors/blocking.ts:635` | a climber leaving a double rips past the released man's hip on the side away from his keeper (upfield until past the man's front, side chosen once) instead of the sign-flipping slide off the man |
| `CLIMB_BASE` | off | experimental (run game, 2026-11-04) | trenches | `src/sim/engagement.ts:828` | a zone double member whose backer shows keeps his hands on the man but eases his drive (push at most 0.35) so his weight stays over his own feet for the release |
| `L2_BREAKDOWN` | off | experimental (run game, 2026-11-04) | contact | `src/sim/breakdown.ts:23` | a blocker meeting his second-level man within 0.5 s at over 3 yd/s closing sinks his hips (posture 0.7); a backer/DB seeing a blocker arrive that way sets a take-on base (posture 0.6); speed unchanged |
| `ZONE_ONBALL` | off | experimental (run game, 2026-11-05) | trenches | `src/sim/behaviors/blocking.ts:571` | zone ownership counts only men on the ball (<= 1.1 yd deep) as down threats; an overhang standing on the line off the ball is the perimeter's |
| `CLIMB_RUNNER_SIDE` | off | experimental (run game, 2026-11-05) | trenches | `src/sim/behaviors/blocking.ts:576` | a climber fits his backer on the side between the backer and the runner as he sees him (after the handoff), not always the called play side |
| `ZONE_WINGS` | off | experimental (run game, 2026-11-05) | trenches | `src/sim/behaviors/blocking.ts:586` | a wing at the end of the line is a line member for zone covered/uncovered ownership, which also weighs the physical matchup (8 yd per unit of mass ratio over 1); the ordinary pairing and release reads decide the rest (a keeper under 85% of the man's mass never stays on him) |
| `BLOCKER_NEXT` | off | experimental (run game, 2026-11-05) | trenches | `src/sim/behaviors/blocking.ts:593` | a climber or lead whose man is gone finds the next threat in the runner's lane (after the handoff) and, with no work in sight, leads that lane upfield instead of stepping back toward the runner |
| `WING_CALL` | off | experimental (run game, 2026-11-05) | trenches | `src/sim/behaviors/blocking.ts:604` | when a down man lines up over a wing beside the end of the line, the call names the wing technique in the tracked mix: end takes him and wing arcs (TE 43% / WR 54%), wing takes him and end climbs (31/28%), or both double him (26/19%); picked by a hash of players and ball spot |
| `RELEASE_INTERCEPT` | off | experimental (run game, 2026-11-05) | trenches | `src/sim/behaviors/blocking.ts:2820` | a double member leaves for his backer when waiting one more read would make him late (his own cut-off time vs the backer's or runner's time to the line), replacing the 4.2 yd radius and runner-at-2.8 yd cues; the faster cutter is the climber |
| `BACKFIELD_DEPTH` | off | experimental (run game, 2026-11-03) | alignment | `src/playbook/formations.ts:18` | QB and tailback at their tracked run-snap depths: gun QB 4.5 / offset back 5.0 (installed 5.0/5.5), pistol QB 4.6 (4.0), under-center tailback +0.5 (6.8 to 7.3); the gun mesh follows the QB. 8 recorded scenes pin the installed depth (pre-snap alignment review) |
| `STRETCH_OFFSET` | off | experimental (run game, 2026-11-03) | alignment | `src/playbook/alignment.ts:259` | on a gun outside/wide zone call the offset back aligns away from the play side, so the mesh across the QB's face carries him to it (tracked gun OZ: 219 away, 22 on the play side) |
| `TE_OFF` | off | experimental (run game, 2026-11-05) | alignment | `src/playbook/alignment.ts:267` | on a zone run call an attached end sets off the ball beside the tackle (a wing) at the tracked share, the wide receiver on his side moving onto the line (tracked 2022 zone runs: 0.43 off-ball tight ends a snap beside the tackle vs 0.83 attached; installed none) |
| `MESH_TEMPO` | off | experimental (run game, 2026-11-03) | backfield | `src/sim/assign.ts:281` | a riding back previews his own body and takes the steadiest tempo that reaches the mesh by the exchange time, carries it through instead of braking to the landmark, and leaves his stance by it; exchange tempo 0.85 of top speed (installed 0.55) |
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
