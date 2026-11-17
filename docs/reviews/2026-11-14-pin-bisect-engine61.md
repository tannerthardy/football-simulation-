# Pin bisect: which tests still need the legacy engine, by lane

150 files bisected (3 pending: test/concept-menu.test.ts, test/grasp-jeopardy.test.ts, test/responsibility-ledger.test.ts). For each: the minimal set of promoted flags that, pinned to 0 alone, makes the file pass (`TEST_PIN_FLAGS=A,B`). Re-record the file on the real engine and the flags leave its list; when a flag has no file left, it can be deleted from the pin.

**Method and caveats (2026-11-14, engine-61 base `98ce8574`; the stack has gained flags since, see the refresh in #707).**
`scripts/diag/pin-bisect.ts` delta-debugs the promoted flags per file; this table is `scripts/diag/pin-lanes.py` over the bisect's per-file results (`pin-bisect-engine61.json`). Lane = the owner of the source the test imports
(then of the flags' files, then by name; the 8 files no rule placed are proposed in the script's OVERRIDE table); Integration reassigns. Three limits: (1) the box was loaded and twice ran out of memory while this ran, and a probe that
fails only because of that keeps a flag in its set, so a set is a valid pin (it passes) but may not be minimal; re-run a file alone with `TEST_PIN_FLAGS=<its set>` before relying on a set to delete a flag; (2) `concept-menu` and `grasp-jeopardy`
were first recorded as 'fails even fully pinned' from such a failure (both pass alone fully pinned, in 53 s and 64 s) and are being bisected again; `responsibility-ledger` is the slowest file (600+ probes so far); (3) the sets
come from different orders of the same search, so the same flag can be found in different files by different paths; the by-flag list at the end is the one to delete from.

## Coverage (6 files)

- `test/cover3-cover2-rules.test.ts` ← READ_PLAN  _(imports)_
- `test/coverage-judgment.test.ts` ← OPEN_CARRY  _(imports)_
- `test/coverage-rules.test.ts` ← WR_SNAP  _(imports)_
- `test/db-slots.test.ts` ← DB_SLOTS  _(by name)_
- `test/projected-cap.test.ts` ← DB_SLOTS  _(imports)_
- `test/quarters-trips-rules.test.ts` ← BACK_PATHS, HANDS_CHEST  _(by name)_

## Defense (34 files)

- `test/acquired-qb-continuation.test.ts` ← PURSUIT_FIELD, TRACK_PURSUIT, TRACK_TACKLE  _(imports)_
- `test/arrival.test.ts` ← QB_BODY_SEEN  _(flags)_
- `test/back-man-run-fit.test.ts` ← CUSHION_NEED, DB_SLOTS, READ_LEAN  _(imports)_
- `test/backer-read-step.test.ts` ← BACKER_CREEP, LB_READ_STEP, READ_LEAN  _(imports)_
- `test/blocked-reach.test.ts` ← HONEST_TACKLE  _(flags)_
- `test/coverage-flat-responsibility.test.ts` ← CURL_FLAT_BACK, DB_SLOTS, QB_BODY_SEEN, SEEN_EYES  _(imports)_
- `test/coverage-mechanics.test.ts` ← OPEN_CARRY  _(imports)_
- `test/cushion-break.test.ts` ← BACKFIELD_DEPTH, CARRY_READ  _(flags)_
- `test/deep-coverage-leverage.test.ts` ← CUSHION_BREAK  _(imports)_
- `test/dl-games.test.ts` ← FIT_TE_GAP, KEY_DEPTH, STANCE_TELL  _(flags)_
- `test/finish-check.test.ts` ← CARRY_READ  _(flags)_
- `test/gap-match.test.ts` ← TE_OFF  _(name)_
- `test/hook-stem-continuity.test.ts` ← OPEN_CARRY  _(imports)_
- `test/lb-flow-intercept.test.ts` ← ALIGN_HABIT, LB_GUARD_STEP, LB_LINE_FLOW, LINE_STEP, REACH_FLAT, ZONE_ARMS  _(flags)_
- `test/lb-guard-step.test.ts` ← READ_LEAN  _(flags)_
- `test/line-read.test.ts` ← EDGE_REACH  _(imports)_
- `test/man-cushion-compression.test.ts` ← CUSHION_BREAK, CUSHION_NEED  _(imports)_
- `test/man-run-continuity.test.ts` ← DB_SLOWPLAY  _(imports)_
- `test/motion-contact.test.ts` ← BACKER_CREEP  _(flags)_
- `test/pass-contact-rules.test.ts` ← BACKER_CREEP, OFFICIATE, OPEN_HANDS  _(flags)_
- `test/pass-rush-finish.test.ts` ← TRACK_PURSUIT  _(imports)_
- `test/presnap-coverage-checks.test.ts` ← CUSHION_BREAK  _(flags)_
- `test/press-front-stance.test.ts` ← BACKER_CREEP, TIGHT_OFF  _(flags)_
- `test/pursuit-effort.test.ts` ← TRACK_PURSUIT  _(name)_
- `test/pursuit-objective.test.ts` ← TRACK_TACKLE  _(flags)_
- `test/pursuit-prediction.test.ts` ← TRACK_TACKLE  _(flags)_
- `test/second-level-handover.test.ts` ← TRACK_PURSUIT  _(imports)_
- `test/seen-eyes.test.ts` ← QB_BODY_SEEN  _(flags)_
- `test/short-package.test.ts` ← SHORT_BASE  _(by name)_
- `test/snap-count.test.ts` ← BACKER_CREEP  _(flags)_
- `test/tackle-support-choice.test.ts` ← DB_SLOTS, GRASP_PATCH, HOLD_FINISH, LEAN_PITCH  _(imports)_
- `test/tackle-window.test.ts` ← HONEST_TACKLE  _(imports)_
- `test/team-contact-rules.test.ts` ← OPEN_HANDS  _(imports)_
- `test/zone-throw-key.test.ts` ← QB_BODY_SEEN  _(imports)_

## Flex (71 files)

- `test/back-release.test.ts` ← PRO_CALL  _(flags)_
- `test/backer-takeon.test.ts` ← CLIMB_PATH, L2_BREAKDOWN, LB_LINE_FLOW  _(flags)_
- `test/block-seen.test.ts` ← PUNCH  _(flags)_
- `test/bounded-attachment-world.test.ts` ← GRASP_PATCH  _(playbook)_
- `test/chase-arrival.test.ts` ← DB_SLOTS  _(playbook)_
- `test/climb-access.test.ts` ← STANCE_TELL, TE_OFF, ZONE_GAP  _(imports)_
- `test/climb-reread-passed.test.ts` ← TOUCH_READ  _(flags)_
- `test/combination-ownership.test.ts` ← RELEASE_QUICK  _(imports)_
- `test/combo-attention.test.ts` ← HANDS_CHEST, RELEASE_INTERCEPT, RELEASE_QUICK, WING_WORK  _(imports)_
- `test/combo-strike-access.test.ts` ← LEAN_PITCH, RELEASE_QUICK, STANCE_TELL, TRACK_PURSUIT  _(imports)_
- `test/combo-transfer.test.ts` ← CLIMB_SQUARE, DOUBLE_FLOW, DOUBLE_HANDOFF, RELEASE_INTERCEPT, RELEASE_QUICK  _(imports)_
- `test/command-trace.test.ts` ← BACK_RELEASE, CARRY_READ, GUN_SNAP, LINE_START, READ_PLAN  _(imports)_
- `test/contact-holding-rules.test.ts` ← OPEN_HANDS, PAST_ALONG_PATH, PUNCH  _(imports)_
- `test/contact-motion.test.ts` ← ANCHOR_GRADE  _(flags)_
- `test/directional-brace.test.ts` ← LEAN_PITCH, LEG_ALLOMETRY  _(by name)_
- `test/dl-attack-landmark.test.ts` ← STANCE_TELL  _(imports)_
- `test/dl-flatten.test.ts` ← TOUCH_READ  _(flags)_
- `test/draw-presentation.test.ts` ← RELEASE_QUICK, ZONE_WINGS  _(imports)_
- `test/flat-press.test.ts` ← ZONE_RUN  _(flags)_
- `test/grasp-angular-transfer.test.ts` ← GRASP_ARM_MOMENT  _(playbook)_
- `test/gun-split-backs.test.ts` ← PRO_CALL  _(imports)_
- `test/hand-angular-transfer.test.ts` ← OPEN_HANDS  _(flags)_
- `test/hand-comoving.test.ts` ← OPEN_HANDS  _(flags)_
- `test/hand-force-integration.test.ts` ← OPEN_HANDS  _(flags)_
- `test/hand-force-point.test.ts` ← OPEN_HANDS  _(flags)_
- `test/held-recovery.test.ts` ← GRASP_PATCH  _(playbook)_
- `test/held-stride.test.ts` ← HELD_SWING  _(playbook)_
- `test/helper-fit.test.ts` ← OPEN_HANDS  _(imports)_
- `test/kick-braking.test.ts` ← BACKFIELD_DEPTH  _(imports)_
- `test/native-pass-foul-game.test.ts` ← OFFICIATE  _(playbook)_
- `test/open-hands.test.ts` ← HANDS_CHEST  _(by name)_
- `test/overtake-climb.test.ts` ← DOUBLE_FLOW, TE_OFF  _(flags)_
- `test/pad-leverage.test.ts` ← LEG_ALLOMETRY  _(playbook)_
- `test/pass-anchor.test.ts` ← LEAN_PITCH  _(playbook)_
- `test/pass-contact.test.ts` ← LEAN_PITCH, LEG_ALLOMETRY, PUNCH  _(imports)_
- `test/pass-cutoff-approach.test.ts` ← BACK_RELEASE, PASS_SET_SEEN  _(imports)_
- `test/pass-feel.test.ts` ← REP_SEEN  _(flags)_
- `test/pass-hip-ride.test.ts` ← PAST_ALONG_PATH  _(imports)_
- `test/perimeter-run-play.test.ts` ← DB_SLOWPLAY  _(imports)_
- `test/planned-climb-fit.test.ts` ← CLIMB_PATH, CLIMB_RIP, WING_CALL, ZONE_WINGS  _(imports)_
- `test/possession-awareness.test.ts` ← ANCHOR_BASE, BACKFIELD_DEPTH, BACK_RELEASE, CATCH_CARRY, CATCH_POINT, CATCH_SECURE, CUSHION_BREAK, GRASP_PATCH, GUN_SNAP, HANDS_CHEST, LEAN_PITCH, LEG_ALLOMETRY, LINE_START, PASS_ANCHOR, PASS_SET_SEEN, PAST_ALONG_PATH, PEDAL_CAP, POCKET_REACH, RCV_SEEN, READ_PLAN, REP_SEEN, RUSH_LEAN_BOUND, THROW_BODY, THROW_HOLD, THROW_REACT, TRACK_TACKLE, WR_SNAP  _(imports)_
- `test/pro-call.test.ts` ← PRO_CALL  _(imports)_
- `test/protection.test.ts` ← PRO_CALL  _(flags)_
- `test/pursuit-contact.test.ts` ← HONEST_TACKLE, PASS_SET_SEEN, TRACK_PURSUIT, TRACK_TACKLE  _(imports)_
- `test/qb-feel.test.ts` ← BACKFIELD_DEPTH, BACK_RELEASE, HANDS_CHEST, PASS_SET_SEEN, TRACK_PURSUIT  _(flags)_
- `test/qb-scramble-lane.test.ts` ← PUNCH  _(flags)_
- `test/read-lean.test.ts` ← PUNCH  _(flags)_
- `test/receiver-native-motion.test.ts` ← ALIGN_HABIT  _(imports)_
- `test/receiver-run-eligibility.test.ts` ← LEVEL2_TIME, ZONE_GAP  _(imports)_
- `test/redirect-phase-contract.test.ts` ← HANDS_CHEST, PAST_ALONG_PATH  _(flags)_
- `test/redirect-protection.test.ts` ← PAST_ALONG_PATH  _(flags)_
- `test/run-base.test.ts` ← BACKER_CREEP  _(imports)_
- `test/run-combo-retarget.test.ts` ← RELEASE_QUICK  _(imports)_
- `test/run-contact-flow.test.ts` ← ENGAGED_DEFENDER, REP_SEEN  _(imports)_
- `test/run-contact-track.test.ts` ← REACH_TECHNIQUE  _(imports)_
- `test/run-contact-workoff-interaction.test.ts` ← ENGAGED_DEFENDER  _(imports)_
- `test/run-execution.test.ts` ← ALIGN_HABIT, BACKER_CREEP, RELEASE_QUICK  _(imports)_
- `test/run-hand-control.test.ts` ← ANCHOR_BASE, BACKER_CREEP, BACK_RELEASE, ENGAGED_DEFENDER, FEET_SETTLE, HANDS_CHEST, LEAN_PITCH, LEG_ALLOMETRY, PASS_ANCHOR, PEDAL_CAP, REP_SEEN, RUSH_LEAN_BOUND  _(imports)_
- `test/runner-side-recovery.test.ts` ← TE_OFF  _(imports)_
- `test/scenario-pack.test.ts` ← GRASP_PATCH, HANDS_CHEST, PAST_ALONG_PATH  _(flags)_
- `test/shed-pursue.test.ts` ← SHED_PAST  _(flags)_
- `test/shotgun-exchange.test.ts` ← GUN_MESH, MESH_GUN_SIDE, MESH_TEMPO  _(imports)_
- `test/support-contact-frame.test.ts` ← ENGAGED_DEFENDER, SHED_PAST  _(imports)_
- `test/support-escape-objective.test.ts` ← ENGAGED_DEFENDER, SHED_PAST  _(imports)_
- `test/support-receiver-holder.test.ts` ← SHED_PAST  _(flags)_
- `test/support-work-off.test.ts` ← ENGAGED_DEFENDER, SHED_PAST  _(flags)_
- `test/world-physics.test.ts` ← LEAN_PITCH, OPEN_HANDS  _(flags)_
- `test/wrap-binding.test.ts` ← HIP_BRACE  _(playbook)_
- `test/zone-backer-count.test.ts` ← TE_OFF  _(imports)_
- `test/zone-helper-check.test.ts` ← CLIMB_SQUARE, DOUBLE_HANDOFF, RECEIVER_DEPTH, RELEASE_INTERCEPT, RELEASE_QUICK, STANCE_TELL, ZONE_ARMS, ZONE_GAP  _(imports)_
- `test/zone-runoff-work.test.ts` ← FEET_SETTLE, REACH_TECHNIQUE  _(imports)_

## Integration (1 files)

- `test/schematic-stress.test.ts` ← SLOT_LEV  _(by name)_

## QB (8 files)

- `test/pass-installation.test.ts` ← BACK_RELEASE, READ_PLAN  _(imports)_
- `test/qb-interception-estimate.test.ts` ← INT_BELIEF, THROW_REACT  _(imports)_
- `test/qb-rusher-recording.test.ts` ← PASS_SET_SEEN, QB_BODY_SEEN, QB_RHYTHM, READ_PLAN, RECEIVER_DEPTH, REP_SEEN, SEEN_EYES  _(flags)_
- `test/read-compiler.test.ts` ← RELEASE_SEEN  _(imports)_
- `test/release-seen.test.ts` ← READ_PLAN  _(flags)_
- `test/shoulders-set.test.ts` ← BACKFIELD_DEPTH, READ_PLAN, RECEIVER_DEPTH  _(flags)_
- `test/throw-body.test.ts` ← THROW_HOLD  _(flags)_
- `test/traffic-turning.test.ts` ← READ_PLAN  _(flags)_

## Rules+Coaching (24 files)

- `test/call-mix.test.ts` ← CALL_MIX  _(playbook)_
- `test/catch-caller-interval.test.ts` ← CATCH_POINT, CATCH_SECURE  _(imports)_
- `test/catch-hands.test.ts` ← CATCH_SECURE  _(flags)_
- `test/cov7-abandonment.test.ts` ← CUSHION_NEED, DB_SLOWPLAY, DEF_BELIEF, KEY_DEPTH, LINE_START, PASS_SET_SEEN, PA_DROP, PUNCH, WR_SNAP  _(imports)_
- `test/cover6-half-side.test.ts` ← ROUTE_CRAFT  _(flags)_
- `test/defensive-call-integrity.test.ts` ← MUG_PRESSURES, NICKEL_FRONTS  _(playbook)_
- `test/downfield-contact-rejection.test.ts` ← RCV_SEEN  _(imports)_
- `test/fangio-tree.test.ts` ← WR_SNAP  _(playbook)_
- `test/fit-te-gap-slide.test.ts` ← TE_OFF  _(playbook)_
- `test/front-menu.test.ts` ← MUG_CALLS  _(playbook)_
- `test/hold-sink.test.ts` ← DB_SLOTS  _(playbook)_
- `test/incidental-catch-readiness.test.ts` ← CATCH_POINT, CATCH_SECURE, CATCH_SPEED, DEFLECT_BALL  _(imports)_
- `test/lb-start.test.ts` ← RCV_SEEN, READ_LEAN  _(flags)_
- `test/lineup-order.test.ts` ← DB_SLOTS  _(playbook)_
- `test/ol-align.test.ts` ← RECEIVER_DEPTH  _(playbook)_
- `test/presnap-alignment-contract.test.ts` ← TIGHT_OFF  _(playbook)_
- `test/press-contact.test.ts` ← LINE_START, RELEASE_SEEN, ROUTE_CRAFT  _(imports)_
- `test/prethrow-opi.test.ts` ← LEAN_PITCH  _(playbook)_
- `test/receiver-option-information.test.ts` ← RELEASE_SEEN  _(imports)_
- `test/receiver-route-effort.test.ts` ← LINE_START, RCV_SEEN, ROUTE_CRAFT  _(imports)_
- `test/route-craft.test.ts` ← ALIGN_HABIT  _(imports)_
- `test/shotgun-rb-alignment.test.ts` ← BACKFIELD_DEPTH  _(playbook)_
- `test/situation-depth.test.ts` ← ALIGN_HABIT  _(playbook)_
- `test/tip-away.test.ts` ← CATCH_HANDS  _(flags)_

## Run Game (6 files)

- `test/carrier-decision-cadence.test.ts` ← RB_TEMPO  _(imports)_
- `test/draw-read.test.ts` ← GUN_SNAP  _(by name)_
- `test/edge-contain-flow.test.ts` ← LB_LINE_FLOW, LEAN_PITCH  _(imports)_
- `test/long-yardage-run.test.ts` ← ALIGN_HABIT, SLOT_LEV  _(by name)_
- `test/run-pace-gather.test.ts` ← RB_STEER  _(name)_
- `test/run-read-attention.test.ts` ← TRACK_PURSUIT  _(name)_

## By flag (files blocking its deletion)

- `LEAN_PITCH` (10): combo-strike-access, directional-brace, edge-contain-flow, pass-anchor, pass-contact, possession-awareness, prethrow-opi, run-hand-control, tackle-support-choice, world-physics
- `OPEN_HANDS` (9): contact-holding-rules, hand-angular-transfer, hand-comoving, hand-force-integration, hand-force-point, helper-fit, pass-contact-rules, team-contact-rules, world-physics
- `TRACK_PURSUIT` (8): acquired-qb-continuation, combo-strike-access, pass-rush-finish, pursuit-contact, pursuit-effort, qb-feel, run-read-attention, second-level-handover
- `DB_SLOTS` (8): back-man-run-fit, chase-arrival, coverage-flat-responsibility, db-slots, hold-sink, lineup-order, projected-cap, tackle-support-choice
- `BACKER_CREEP` (8): backer-read-step, motion-contact, pass-contact-rules, press-front-stance, run-base, run-execution, run-hand-control, snap-count
- `RELEASE_QUICK` (8): combination-ownership, combo-attention, combo-strike-access, combo-transfer, draw-presentation, run-combo-retarget, run-execution, zone-helper-check
- `HANDS_CHEST` (8): combo-attention, open-hands, possession-awareness, qb-feel, quarters-trips-rules, redirect-phase-contract, run-hand-control, scenario-pack
- `READ_PLAN` (8): command-trace, cover3-cover2-rules, pass-installation, possession-awareness, qb-rusher-recording, release-seen, shoulders-set, traffic-turning
- `PUNCH` (6): block-seen, contact-holding-rules, cov7-abandonment, pass-contact, qb-scramble-lane, read-lean
- `TE_OFF` (6): climb-access, fit-te-gap-slide, gap-match, overtake-climb, runner-side-recovery, zone-backer-count
- `PAST_ALONG_PATH` (6): contact-holding-rules, pass-hip-ride, possession-awareness, redirect-phase-contract, redirect-protection, scenario-pack
- `BACKFIELD_DEPTH` (6): cushion-break, kick-braking, possession-awareness, qb-feel, shotgun-rb-alignment, shoulders-set
- `BACK_RELEASE` (6): command-trace, pass-cutoff-approach, pass-installation, possession-awareness, qb-feel, run-hand-control
- `PASS_SET_SEEN` (6): cov7-abandonment, pass-cutoff-approach, possession-awareness, pursuit-contact, qb-feel, qb-rusher-recording
- `ALIGN_HABIT` (6): lb-flow-intercept, long-yardage-run, receiver-native-motion, route-craft, run-execution, situation-depth
- `ENGAGED_DEFENDER` (6): run-contact-flow, run-contact-workoff-interaction, run-hand-control, support-contact-frame, support-escape-objective, support-work-off
- `QB_BODY_SEEN` (5): arrival, coverage-flat-responsibility, qb-rusher-recording, seen-eyes, zone-throw-key
- `TRACK_TACKLE` (5): acquired-qb-continuation, possession-awareness, pursuit-contact, pursuit-objective, pursuit-prediction
- `GRASP_PATCH` (5): bounded-attachment-world, held-recovery, possession-awareness, scenario-pack, tackle-support-choice
- `STANCE_TELL` (5): climb-access, combo-strike-access, dl-attack-landmark, dl-games, zone-helper-check
- `LEG_ALLOMETRY` (5): directional-brace, pad-leverage, pass-contact, possession-awareness, run-hand-control
- `LINE_START` (5): command-trace, cov7-abandonment, possession-awareness, press-contact, receiver-route-effort
- `REP_SEEN` (5): pass-feel, possession-awareness, qb-rusher-recording, run-contact-flow, run-hand-control
- `SHED_PAST` (5): shed-pursue, support-contact-frame, support-escape-objective, support-receiver-holder, support-work-off
- `PRO_CALL` (4): back-release, gun-split-backs, pro-call, protection
- `READ_LEAN` (4): back-man-run-fit, backer-read-step, lb-guard-step, lb-start
- `CATCH_SECURE` (4): catch-caller-interval, catch-hands, incidental-catch-readiness, possession-awareness
- `WR_SNAP` (4): cov7-abandonment, coverage-rules, fangio-tree, possession-awareness
- `CUSHION_BREAK` (4): deep-coverage-leverage, man-cushion-compression, possession-awareness, presnap-coverage-checks
- `RCV_SEEN` (4): downfield-contact-rejection, lb-start, possession-awareness, receiver-route-effort
- `RECEIVER_DEPTH` (4): ol-align, qb-rusher-recording, shoulders-set, zone-helper-check
- `LB_LINE_FLOW` (3): backer-takeon, edge-contain-flow, lb-flow-intercept
- `CUSHION_NEED` (3): back-man-run-fit, cov7-abandonment, man-cushion-compression
- `HONEST_TACKLE` (3): blocked-reach, pursuit-contact, tackle-window
- `CATCH_POINT` (3): catch-caller-interval, incidental-catch-readiness, possession-awareness
- `ZONE_GAP` (3): climb-access, receiver-run-eligibility, zone-helper-check
- `RELEASE_INTERCEPT` (3): combo-attention, combo-transfer, zone-helper-check
- `ROUTE_CRAFT` (3): cover6-half-side, press-contact, receiver-route-effort
- `OPEN_CARRY` (3): coverage-judgment, coverage-mechanics, hook-stem-continuity
- `CARRY_READ` (3): command-trace, cushion-break, finish-check
- `GUN_SNAP` (3): command-trace, draw-read, possession-awareness
- `DB_SLOWPLAY` (3): cov7-abandonment, man-run-continuity, perimeter-run-play
- `RELEASE_SEEN` (3): press-contact, read-compiler, receiver-option-information
- `CLIMB_PATH` (2): backer-takeon, planned-climb-fit
- `TOUCH_READ` (2): climb-reread-passed, dl-flatten
- `CLIMB_SQUARE` (2): combo-transfer, zone-helper-check
- `DOUBLE_FLOW` (2): combo-transfer, overtake-climb
- `DOUBLE_HANDOFF` (2): combo-transfer, zone-helper-check
- `SEEN_EYES` (2): coverage-flat-responsibility, qb-rusher-recording
- `ZONE_WINGS` (2): draw-presentation, planned-climb-fit
- `KEY_DEPTH` (2): cov7-abandonment, dl-games
- `ZONE_ARMS` (2): lb-flow-intercept, zone-helper-check
- `SLOT_LEV` (2): long-yardage-run, schematic-stress
- `OFFICIATE` (2): native-pass-foul-game, pass-contact-rules
- `TIGHT_OFF` (2): presnap-alignment-contract, press-front-stance
- `THROW_REACT` (2): possession-awareness, qb-interception-estimate
- `ANCHOR_BASE` (2): possession-awareness, run-hand-control
- `PASS_ANCHOR` (2): possession-awareness, run-hand-control
- `PEDAL_CAP` (2): possession-awareness, run-hand-control
- `RUSH_LEAN_BOUND` (2): possession-awareness, run-hand-control
- `THROW_HOLD` (2): possession-awareness, throw-body
- `REACH_TECHNIQUE` (2): run-contact-track, zone-runoff-work
- `FEET_SETTLE` (2): run-hand-control, zone-runoff-work
- `PURSUIT_FIELD` (1): acquired-qb-continuation
- `L2_BREAKDOWN` (1): backer-takeon
- `LB_READ_STEP` (1): backer-read-step
- `CALL_MIX` (1): call-mix
- `RB_TEMPO` (1): carrier-decision-cadence
- `WING_WORK` (1): combo-attention
- `ANCHOR_GRADE` (1): contact-motion
- `CURL_FLAT_BACK` (1): coverage-flat-responsibility
- `MUG_PRESSURES` (1): defensive-call-integrity
- `NICKEL_FRONTS` (1): defensive-call-integrity
- `FIT_TE_GAP` (1): dl-games
- `ZONE_RUN` (1): flat-press
- `MUG_CALLS` (1): front-menu
- `GRASP_ARM_MOMENT` (1): grasp-angular-transfer
- `HELD_SWING` (1): held-stride
- `CATCH_SPEED` (1): incidental-catch-readiness
- `DEFLECT_BALL` (1): incidental-catch-readiness
- `DEF_BELIEF` (1): cov7-abandonment
- `PA_DROP` (1): cov7-abandonment
- `LB_GUARD_STEP` (1): lb-flow-intercept
- `LINE_STEP` (1): lb-flow-intercept
- `REACH_FLAT` (1): lb-flow-intercept
- `EDGE_REACH` (1): line-read
- `CLIMB_RIP` (1): planned-climb-fit
- `WING_CALL` (1): planned-climb-fit
- `INT_BELIEF` (1): qb-interception-estimate
- `BACK_PATHS` (1): quarters-trips-rules
- `QB_RHYTHM` (1): qb-rusher-recording
- `CATCH_CARRY` (1): possession-awareness
- `POCKET_REACH` (1): possession-awareness
- `THROW_BODY` (1): possession-awareness
- `LEVEL2_TIME` (1): receiver-run-eligibility
- `RB_STEER` (1): run-pace-gather
- `SHORT_BASE` (1): short-package
- `GUN_MESH` (1): shotgun-exchange
- `MESH_GUN_SIDE` (1): shotgun-exchange
- `MESH_TEMPO` (1): shotgun-exchange
- `CATCH_HANDS` (1): tip-away
- `HOLD_FINISH` (1): tackle-support-choice
- `HIP_BRACE` (1): wrap-binding
