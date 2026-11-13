<!-- Information-rule sweep (the user's rule: every information cheat is removed by its owner). Read-only code reading of develop d90dcb96 (src identical at d38800b4), 2026-11-13; nothing run. Two top new items spot-checked by hand: Blitzer catchSpot without a saw-the-throw gate (defense.ts ~544), engaged rusher aiming at the true QB position (engagement.ts ~1561). -->
# Information-leak sweep: decisions that read an opponent's true state

Repo `/home/user/fb-perc`, checked out at `d38800b4` (branch `rules/perception-proposal`). Its `src/` is byte-identical to develop `d90dcb96`: `git diff d90dcb96 HEAD` touches only two docs. All line numbers below are from that tree. Read-only audit; nothing was run.

Severity: **H** runs every tick for many players and steers or selects the action. **M** runs often, or gates a choice. **L** is rare, a filter or tie-break, or small in effect. **dormant** means only a non-default flag reaches it.

Default flags that matter here: PASS_KICK, PRO_READ, BLOCK_SEEN, SEEN_EYES, DRIVE_CATCH, CATCH_CARRY, LOOK_ONCE, RELEASE_SEEN and BACKER_TAKEON are on. FREE_BOUND, SCREEN_QB, QB_FEEL, GAZE and JUDGE_SEEN_BALL are off.

## Status of the items already known
| Known item | Where it is now | Status |
|---|---|---|
| Pass set uses `coord.assigned.get(a)` | blocking.ts:339-443 | **Confirmed.** Every pass-set point, lead, facing and ride uses the true `r.pos`, `r.vel` and `r.speed`. |
| `cutOffPoint` | blocking.ts:388, 508-530 | Confirmed, but **dormant**: it is called only when `PASS_KICK=0`. |
| `felt()` blind-side bearing | qb.ts:1104-1107 (not ~1299) | **Confirmed.** |
| FREE_BLIND_LAG bearing | qb.ts:1206-1208 (`freeBound`) | Confirmed, but **dormant** (FREE_BOUND is off). |
| `pressure()` `dist` | qb.ts:1213 | True `d.pos`, but its only consumer is `sim.stats.pressured` and the pressure event (qb.ts:629-633). That is **stats, not a decision.** |
| `evade()` steps away from `threat.pos` | qb.ts:1672-1678 | **Confirmed.** |
| `tackle.ts` `seesIt` | tackle.ts:378 | **Confirmed.** It uses the true bearing `d.pos - c.pos` against the QB's facing. |
| QB slide `timeToReach(d.pos, d.vel)` | carrier.ts:438-439 | **Confirmed.** It also skips defenders on true `d.isDown`. |
| Post-catch blocker target | receiver.ts:643-692 (`DownfieldBlocker`, `pickBlockTarget`) | **Confirmed.** The whole controller is true state. |
| `acquireFlight` true ball path | possession-read.ts:16-20 | **Found and confirmed.** It copies `sim.ballPath`, the exact future trajectory to landing. |
| INFO-1 `onBallCaught` | assign.ts:644-649 | **Defender half fixed.** Defenders are no longer switched. The offensive convoy is still switched on the true catch (Rules table). |
| INFO-1 `pursueIfLive` on `sim.carrier` | defense.ts:122-196 | **Fixed** (#260, `observedHolder`). True `sim.ball.kind` gates remain (Defense table). |
| STALK-001 far stalk | blocking.ts:2036-2069 | **Fixed in trunk** by f76e8501 (#148/#149), which uses `sim.see`. Only the contact-range engage gate on true `dd` remains (excluded category). |

## Flex: blocking and engagement decisions
| file:line | function | true state read | consumer (decision) | honest replacement | sev |
|---|---|---|---|---|---|
| blocking.ts:226-249 | ProtectionCoordinator.update (pairing) | rusher `r.pos` (lateral cost, "already past", A/B-gap bonus) | which blocker takes which rusher, every tick | see: the area observer's picture (as `seenRusher` already does) | H |
| blocking.ts:194, 206, 218 | ProtectionCoordinator.update | `d.isDown`, `r.engagement`, `r.isDown`, sticky `r.pos.y` vs home | who counts as a rusher; dropping a sticky assignment | see (pose, position); touch only for own engaged man | M |
| blocking.ts:339-443 | PassProtector.update (pass set) | `r.pos`, `r.vel`, `r.speed` of the true assigned Agent | set point, kick lead, ride, facing, engage reach | see / track the assigned rusher; touch once in contact | H (known) |
| blocking.ts:319, 324-325 | PassProtector release (`freeRusher`, `pastHip`) | `r.engagement`, assigned `d.pos` | screen/back release timing | see the rusher's position and pose; touch for own man | M |
| blocking.ts:65-73 | ProtectionCoordinator.observer | `d.pos.y` | whose eyes see this defender | his alignment spot, or the last seen picture | L |
| blocking.ts:121-181 | ProtectionCoordinator.declare | `r.pos.y` (first tick with a front) | snap declaration | pre-snap `snapX` / `defAlign` spot (visible) | L |
| blocking.ts:253-265 | spare-protector help | `e.defender.pos.y` | whom a free lineman doubles | see | L |
| blocking.ts:102-109 | isRusher (legacy) | `d.behavior.kind`, `d.pos`, `d.vel` | rusher identification | already `seenRusher` | dormant (PRO_READ=0) |
| blocking.ts:508-530 | cutOffPoint | `r.pos`, `r.vel`, `r.profile.vmax` | tackle cut-off spot | track | dormant (PASS_KICK=0) |
| blocking.ts:2318-2325 | RunBlocker.availableTarget (installed jobs) | `target.isDown`, `target.engagement` (partnerOwns, "someone else has him") | drop the man and `findWork`, every tick | see pose; a seen-contact cue (no "engaged" channel yet) | H |
| blocking.ts:2213 | zoneFlow scoop | `scoopBacker.isDown` | climb now to scoop backer | see pose | L |
| blocking.ts:2911-2912 | readRules crossing exchange | `p.target.engagement`, `q.target.engagement` | whether two linemen swap men | seen contact | M |
| blocking.ts:2937 | readRules look-lean-climb | `!d.engagement && !d.isDown` | collecting a penetrator | see pose plus seen contact | M |
| blocking.ts:3098 | findWork (non-acquired) | `d.engagement`, `d.isDown` | replacement target | see pose plus seen contact | M |
| blocking.ts:3171-3180 | readCheckSurface | other defenders' `isDown`, `d.engagement`, hands joint with a third player | helper's check-release permission | see; touch only for his own contact | M |
| blocking.ts:3626-3646 | readUnjoinedCombination | `combo.defender.engagement` (blocker identity, helpers) while the observer is off him | overtake / check-release path | seen contact of partner on man (readJoinedSurface-style) | M |
| blocking.ts:3536, 3600, 3624 | combination reads | `combo.backer.isDown` | abort release read | see pose | L |
| blocking.ts:3585-3586 | retargetTakenBacker | `combo.defender.pos`, `d.isDown` | new backer for the pair | see | L |
| screen.ts:61, 193, 257, 274, 280 | ScreenBlocker.update/slide/pick | `target.engagement`, `isDown`, opponents' `engagement` | retarget, threat list, "on him" | see pose plus seen contact | M |
| screen.ts:74 | ScreenBlocker.update | `d.pos.x` | lineman slides vs blocks before the throw | see | M |
| screen.ts:59 | ScreenBlocker.update | `sim.carrier.team` (turnover) | stop blocking | observedHolder | L |
| breakdown.ts:40 | breakdownForContact (O) | `t.isDown` of block target | pad-level breakdown | see pose | L |
| engagement.ts:1561-1586 | stepPassRep (rusher) | `sim.qb.pos` | engaged rusher's power/turned aim and facing | see(d, qb) (the EDGE_ARC branch already uses it at 1578) | H freq / M effect |
| engagement.ts:1359 | updateEngagements | `sim.throwAt` (+0.35 s) | every pass rep ends on a timer from the true release | each side's sawThrow / own release | M |
| engagement.ts:1364 | updateEngagements | `!sim.isPass` (offense call), `sim.carrier`, `sim.scrambled` | rep type pass→run (changes the defender's technique) | defender: observedHolder/qbRunning; blocker: own call | L (known seam) |
| engagement.ts:1753 | runContactRead | `sim.isPass` (offense call) | engaged defender reads "caught" vs handoff | `hasObservedFlight(d)` | M |

## Defense: defense.ts, run fits, pursuit
| file:line | function | true state read | consumer (decision) | honest replacement | sev |
|---|---|---|---|---|---|
| defense.ts:544-547 | Blitzer.update | `sim.ball.kind==='air'` with no sawThrow, then `catchSpot(a, sim)` on the true `sim.ballPath` | every blitzer peels to the exact catch point at the release | `sawThrow`, then the acquired (estimated) flight, as PassRusher does at 344 | H |
| defense.ts:151, 169, 176, 179, 180 | pursueIfLive | `sim.ball.kind !== 'air'` | the moment the true flight ends switches him to catch-anticipation/flight-continuation/rally | his flight forecast endpoint and seen catch cues only | M |
| defense.ts:632 | takeOn (BACKER_TAKEON) | blocker `o.engagement` | backer breaks down for a climber | seen contact | L |
| defense.ts:2179; 2192-2196 | Pursuit / FumbleScramble | `sim.ball.flight.pos/vel` of a loose ball | everyone runs to the exact ball | see the ball (delay, view) | L |
| assign.ts:661-664 | onLooseBall | true fumble event | all 22 switch to FumbleScramble and all reps break at once | per-player seen loose ball | L |
| assign.ts:653-658, 667-671 | onInterception / onRecovery | true turnover event | defense switches instantly to DownfieldBlocker (all true-state, see Rules), offense to Pursuit, all reps break | per-player observedHolder before switching | L |
| breakdown.ts:48-49 | breakdownForContact (D) | blocker `o.isDown`, `o.pos` distance gate | pad-level breakdown | see | L |
| common.ts:298 | aroundBodies | opponent `o.isDown` | path around a body | see pose | L |
| run-fits.ts:437, 442 | executeRunFit fallback | `sim.carrier`, `sim.handoffAt` | runner selection when input undefined | none needed: the only caller (defense.ts:574) always passes a read | dormant |

## Coverage: coverage modules and the catch point
| file:line | function | true state read | consumer (decision) | honest replacement | sev |
|---|---|---|---|---|---|
| possession-read.ts:16-20 (callers defense.ts:345, 2050) | acquireFlight | full future `sim.ballPath` (wind, drag, landing) at recognition | rememberedFlight, catchSpot, observedCatchWindow, arrivalPoint, unresolvedBallArea, CATCH_CARRY: every defender who sees a throw | estimate the flight from seen release position and velocity, refined by later sightings | H |
| receiver.ts:598-623; catch-choice.ts:34 | TrackBall / catchSpot / chooseCatchPoint (offense catch point) | true `sim.ballPath` | target receiver's catch point and arrival speed | the same seen-flight estimate | H |
| defense.ts:2066-2069 | playObservedFlight (DRIVE_CATCH) | `sim.ball.securing` (hidden catch state), `R.body.facing` | drive through the hands while the ball is secured | seen receiver carrying/hands cue; seen facing | M |
| defense.ts:1450, 1801 | ZoneCoverage zone/spot facing | `qb.pos` | facing for every zone command | see(a, qb) (already sampled in seenQbEyes) | M |
| defense.ts:1754, 1823, 1832 | ZoneCoverage lane targets | `qb.pos` | throwing-lane aim point | see(a, qb) | M |
| defense.ts:1516, 1751 | ZoneCoverage deep/underneath | `qbEyes.pos` (the eyed receiver's true position) | lean toward the QB's eyes | the receiver's `sim.see` picture (as 1823 does) | M |
| coverage/techniques.ts:100, 120, 125 | wall / rob techniques | `sim.qb.pos` | facing and robber lane | see(a, qb) | M |
| coverage/judgment.ts:37 | deep help judgment | `sim.ball.kind==='air'` (JUDGE_SEEN_BALL off) | freeze help decisions at the true release | sawThrow (the flag exists) | L-M |
| defense.ts:2036 | playBall | `ball.kind !== 'air'` | stand the instant the flight ends | his forecast and seen outcome | L |
| defense.ts:921 | findsBall (LOOK_ONCE) | `ball.thrower.pos` | time to find the ball | see(a, qb) | L |

## QB lane: qb.ts, qbmind, the QB as a carrier
| file:line | function | true state read | consumer (decision) | honest replacement | sev |
|---|---|---|---|---|---|
| qb.ts:1104-1107 | felt | true bearing `d.pos - a.pos` | blind-side delay for every felt rusher (pressure, scramble, climb, hold) | bearing of the last seen picture / gaze cone | H (known) |
| qb.ts:1672-1678 | evade | `threat.pos` | escape direction | felt(threat) | M (known) |
| tackle.ts:378-379 | attempt (`seesIt`) | rusher true bearing | pocket QB escape probability | see/felt bearing | M (known) |
| carrier.ts:438-439 | BallCarrier QB slide | `d.pos`, `d.vel`, `d.isDown` | slide now | see (as the rest of carrier.ts does) | M (known) |
| qb.ts:1349 | window (throw evaluation) | `d.engagement` (+0.5 s), `d.profile.reactionTime` | per-defender reaction in P(open)/INT risk | seen contact (seenHold-style); rating → see Unsure | M |
| qb.ts:1153, 1184, 1206, 1325, 1645, 1694, 1757, 1772, 1850 | seenHold, freeBound, pressure, window, shouldScramble, pocketMove, canFinish, setDecide, climb | `d.isDown` / `o.isDown` | drop a defender or blocker from pressure, hold and window sums | estimate/see pose | M |
| qb.ts:1298, 1304 | screenTouch (slow screens) | `d.isDown`, `d.engagement` | float vs firm | estimate pose plus seen contact | L |
| qb.ts:503-513 (re-run at 571) | orderReads (man belief) | defender `o.pos` (nearest to each receiver); `d.profile.vmax`, `d.r('manCoverage')` | read order after the coverage is identified | mind.estimate positions; ratings → see Unsure | L-M |
| qb.ts:1115-1129 | held (legacy) | `d.engagement`, `engagement.win` | felt hold time | already seenHold | dormant (BLOCK_SEEN=0) |
| qb.ts:1206-1208 | freeBound | true bearing (FREE_BLIND_LAG) | blind lag | as felt | dormant (FREE_BOUND) |
| qb.ts:1033, 1048, 1053 | spotSatOn / screenDead | `isDown`, `d.engagement` | quick-screen kill | as above | dormant (SCREEN_QB) |

## Ball carrier: carrier.ts and the run read
| file:line | function | true state read | consumer (decision) | honest replacement | sev |
|---|---|---|---|---|---|
| run-read.ts:95, 186 | readKeys / run read | `sim.engagements` (which blocker holds the key) | the blocker whose leverage the back reads | nearest seen surface body (the existing fallback at 96-99) | M |
| run-read.ts:132 | entryRisk | `d.engagement` (+0.35 s tie) | risk of each entry: bang/bend/bounce choice | seen contact (as `touching` in carrier.ts) | M |
| run-read.ts:231 | read `unsafe` | `d.isDown`, `d.engagement` | force the commit | see pose plus seen contact | M |
| run-read.ts:89, 116, 185 | readKeys / entryRisk / key gone | `d.isDown`, `st.key.isDown` | drop defenders from keys or risk; re-key | see pose | L |
| assign.ts:624-625 | onHandoff | defender `d.pos` | the back's duo `readKey` | see at handoff (or the alignment spot) | M |
| carrier.ts:522 | BallCarrier.command | `o.isDown` (all agents) | squeeze-gap bodies | see pose | L |

## Rules and coaching: receivers, routes, play-caller, read compiler
| file:line | function | true state read | consumer (decision) | honest replacement | sev |
|---|---|---|---|---|---|
| receiver.ts:643-692 | DownfieldBlocker / pickBlockTarget | `d.pos`, `d.vel`, `d.engagement`, `d.isDown`; the fit aims at the true `d.pos` | convoy, run-play idle receivers (assign.ts:298), defense after a turnover | see / track; seen contact | H (known) |
| receiver.ts:265, 446 | RouteRunner | `sim.scrambleDrill` (the QB's private clock flag) | scramble drill starts; the press jam ends | seen QB leaving the set or moving (qbRunning-style) | M |
| receiver.ts:367 | scrambleDrill | defender `d.pos` | open-grass spot | see | L |
| assign.ts:644-649 | onBallCaught | true catch event | all teammates switch to the convoy instantly | per-player seen holder | L |
| receiver.ts:59, 105 | lane-clearing / routeCraft | `o.isDown`, `d.isDown` | bodies to steer around | see pose | L |
| (src/playbook, src/game) | | | No opponent leaks found. The callers read only their own call, visible personnel and formation, and post-play film. | | – |

## Excluded categories (not leaks)
- Physics, world contact, joints and hands: engagement.ts force exchange, `setHands`, `punch`, `refit`, `handFight`, run and pass rep mechanics while bodies touch (blocker `known`/`runSeen` already use see).
- Contact-range engage gates on true distance, `dd < contact` → `sim.engage`. They are treated as contact initiation: blocking.ts:417-421, 2039-2040, 2652; screen.ts:79; receiver.ts:661.
- Tackle resolution: tryTackles reach/dive geometry, whiff and grasp, `occluded`, pFumble, the inGrasp whistle (tackle.ts:147-250, 324-505, 585-825).
- Catch adjudication: catching.ts:156-437, including `ball.target`, `securing`, defender contest.
- Officials: contact-holding, contact-legality, pass-legality, pass-interference, team-contact-rules, presnap-rules, ball-rules.
- Stats, diagnostics and telemetry: telemetry.ts, responsibility-ledger.ts, `sim.trace`, `recordedTarget`, run-read trace `actual:`, the qb.ts:629 pressure stat, qbmind `report`.
- Play-calling that reads only its own team: game.ts, playcaller, call-mix, coverage scouting after the play, `sim.defCall` read by the defense, `sim.offCall` read by the offense.
- Teammate positions and states (0.05 s): spacing.ts and traffic-*.ts (teammates only), screen and convoy `sim.carrier` when it is own team, QB→RB mesh.
- At-snap installation from visible alignment: planRunBlocking/assignBehaviors, buildRunFits, installBlockLook, ReleaseReader start, ManCoverage initialCushion, qbmind pre-snap reads with noise, protectionCount, nearestDefender (LINE_START).

## Count of active leaks per area (default flags; dormant ones in brackets)
| Area | Active | Dormant |
|---|---|---|
| Flex | 23 | 2 (isRusher legacy, cutOffPoint) |
| Defense | 8 | 1 (run-fits fallback) |
| Coverage | 10 | 0 |
| QB lane | 8 | 3 (held legacy, freeBound, screenDead/spotSatOn) |
| Ball carrier | 6 | 0 |
| Rules and coaching | 5 | 0 |
| **Total** | **60** | **6** |

Highest-leverage first: the pass-protection coordinator and pass set (blocking 194-443); `acquireFlight` and the receiver catchSpot (true trajectory); Blitzer's ungated catchSpot; availableTarget's engagement/isDown; QB `felt()`; DownfieldBlocker; the rusher's engaged aim at the true QB. Another ~25 rows are the same mistake: a true `isDown`/`engagement` filter where `seen.pose` plus a seen-contact cue would do. The repo has no "engaged" perception channel yet (KNOWN_PROBLEMS INFO-1), so one shared seen-contact helper would retire most of them.

## Unsure: possibly leaks, with the reason
- **tackle.ts:148-152, tryTackles.** The target set is the true `sim.carrier`. Within arm's reach, any defender attempts on the real holder and never on a faking QB or empty-handed back. It is inside tackle resolution (excluded), but the *choice to reach* is a decision. Candidate fix: gate on `see().carrying`.
- **Teammate private engagement state.** blocking.ts:3667-3678 reads the owner's `e.baseB`/`e.phi` (block quality). blocking.ts:205/253-261 reads teammates' engagement records. engagement.ts 1439-1458 reads teammates' plans. These are teammates, but the code's own comment calls hand-fight standing "private state".
- **blocking.ts:3292-3330, joinedEngagement/keeperCandidate.** True `combo.defender` geometry and `isDown`, read by a climber who is in the joint contact. Probably touch, but the keeper-to-defender relation is not his own contact.
- **engagement.ts:180, axisOf pass.** The axis to the true `sim.qb.pos` is a physics frame, but it is also the rusher's intended line (rushIntent, the pass-pro "front").
- **Opponent ratings and profile used in decisions.** qb.ts:1349 `d.profile.reactionTime`, qb.ts:1405-1406 `d.r('ballSkills')`, qb.ts:511 `d.r('manCoverage')`, defense.ts:1058/1166 `R.profile.vmax`, blocking.ts:3410 `d.profile`. Scouting knowledge or a leak, depending on the rule for ratings. Body size and arm length are visible.
- **blocking.ts:1471, backTurned.** Reads own `sim.scrambled` (the QB's private decision flag). He is a teammate, and the run is visible.
- **assign.ts:640-641, onThrow.** Only `ball.target` gets TrackBall at the release, so a receiver learns he is the target from the QB's intent, not the seen ball. space-block.ts:82 uses the true `ball.arrivalT` for the screen lane.
- **qb.ts:1743, feltClosing.** Calls `sim.perception.perceive` directly, bypassing `see()` attention and GAZE memory, for the acceleration sample.
- **qbmind.ts:192.** Canonical coverage looks spread the true `sim.defCall` (front, personnel, games) with only the coverage replaced. It is harmless if `alignDefense` uses only visible fields; not verified.
- **motion.ts:530-531, 574.** The defense's motion lock odds use `LOCK[this.plan.kind]` and `plan.live` from the offense's called motion. Pre-snap, and largely visible, but it is the call itself.
- **defense.ts:424-426, STANCE_TELL.** Reads `man.agent.stanceLean`, the true pre-snap lean (a probabilistic stand-in for a visible tell).
- **defense.ts:1990/2028 and 1955-1961.** `sim.windupAt`/`windupEndAt` timestamps and `perception.recorded` (undelayed QB track), gated by eyes held on the QB. A plausible visible cue, but read as an exact event time.
- **carrier.ts:829.** `d.downUntil` scenario parking. Test fixtures only.
