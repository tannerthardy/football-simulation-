<!-- Census of perceived-velocity consumers for docs/reviews/2026-11-13-perception-proposal.md. Read-only code reading at eed4c000 (develop d90dcb96 + the proposal); line numbers from that tree. -->
# Perception census: consumers of perceived opponent velocity and position triggers

Repo /home/user/fb-perc @ eed4c000 (read-only). Line numbers are from that commit.
Method: `rg` for `see(`, `perceive(`, `estimate(`, `felt(`, `feltClosing(` and for `.vel` on their results, then reading each enclosing function. Teammate sight (0.05 s) is excluded except where noted.

## 0. Facts about the delay plumbing that change the redesign

1. **A scaled delay is not a short delay.** `see()` (playsim.ts:786) computes `observer.mind.observationDelay(reactionTime * delayScale)`. `observationDelay` (mind.ts:60-62) adds `0.12*(1-focus) + 0.06*stress*(1-composure)` *after* the scale. So "touch at 0.06 s" (engagement.ts:441, 479, 1615, 2148), pursuit's "0.12-0.24 s visuomotor" (common.ts:95, 234; tackle.ts:195) and KEY_REACT's floor all land 0.06-0.24 s above the number in the comment. A tracking channel needs its own latency term, not `delayScale`.
2. **Extra delay terms inside `see()` apply to every caller, tracking ones included:**
   - `eyes.peripheral` (+0.08-0.25 s), playsim.ts:785. It is set only by the RB run read (run-read.ts:172-188), so it hits the carrier's view of everyone except his two keys.
   - The run-read attention penalty (+0.15 s), playsim.ts:798-803. It applies when a defender's `recog.read === 'run'` and the target is not the QB, the RB or an OL, and is outside `inBlockingView`. This also slows pursuit of a WR/TE carrier and the run-read defender's view of a releasing TE.
3. **The perceived velocity is the old sample; only the position is dead-reckoned** (perception.ts:65-82). Every consumer that projects `pos + vel*t` is projecting twice from one stale velocity.
4. **GAZE `remembered()`** (playsim.ts:735-772, GAZE=1, off by default) already applies constant-acceleration anticipation plus a tracking prior. If it is turned on, it would double-count with any new tracking channel and with every self-compensating consumer below.
5. **The flag comments are stale.** KEY_REACT is documented as "experimental, off" (key-read.ts:2) but is `!== '0'`, so it is on (key-read.ts:14). CARRY_READ is documented as "experimental, off" (defense.ts:777) but is also on (defense.ts:799). Both self-compensators listed below are therefore live.
6. **Several opponent reads bypass perception (true state).** They are listed as group T at the end, because the redesign must decide whether each is touch or a leak.

## 1. Census by group

Abbreviations:
- Channels: TRK = tracking, REC = recognition/decision, ANT = anticipation.
- Delay labels: Vis = default visual delay (rt x1 + focus/stress terms); Scaled(k) = `delayScale` k; Touch = `0.06/rt` scale; QBmem = QB `estimate` memory.
- "Comp" = the consumer already compensates for the stale picture on its own.

### A. Pursuit and tackle approach (defense, run fits, common)
- **A1. Pursuit intercept, `pursuitPoint`** (common.ts:93-140). It sees the carrier at scale `(0.12+0.12(1-awareness))/rt`, then again 0.2 s older, and forms a speed-only acceleration (99-105). That burst is held for τ=0.3-0.6 s along the *seen heading*, and the result feeds `interceptPoint`. A per-play angle bias (124-129) is the pursuit-rating error.
  - Channel: TRK. Continuous aim at an identified carrier.
  - Comp: **YES**, with an acceleration estimate from two samples. The heading is not turned (no turn rate), so a cut is missed until it is seen.
  - Delay: Scaled(~0.12-0.24/rt) plus the focus/stress terms plus the +0.15 run-attention penalty if it applies.
  - Callers: 14 sites. defense.ts has 7, run-fits.ts 4, common.ts 3.
- **A2. `chase` close/gather/leverage** (common.ts:232-276). It uses the same scaled picture: `seen.pos` for distance and leverage, `seen.vel` as the moving-objective velocity, then `gatheringApproach` (173-231) and `chooseApproach` (approach-control.ts:30-60). The latter matches `seen.vel` with `movingArrivalVelocity` and projects `goal + seen.vel*t`.
  - Channel: TRK. Comp: no (constant velocity). Delay: Scaled, the same as A1.
- **A3. `aroundBodies`** (common.ts:286-320). It reads the runner's `vel` to judge "past him" and sees blockers in the path at the same look.
  - Channel: TRK for the runner. The blocker obstacles are position-only steering.
  - Comp: no. Delay: Scaled.
- **A4. Tackle-window forecast** (tackle.ts:186-205 into tackle-window.ts:44). It dead-reckons `seen.vel` across the intra-tick gap and previews whether the hips are reachable, which decides "wait for better".
  - Channel: TRK. It is a reach prediction a fraction of a second out.
  - Comp: no. Delay: Scaled(pursuit look).
- **A5. Whiff margin** (tackle.ts:324-345). The tackler's aim is `seenC.pos + seenC.vel*w`. The carrier's evasive cut uses `seenD` (the carrier sees the tackler). Both sides use perceived velocity, and the result decides miss distance.
  - Channel: TRK, for both bodies.
  - Comp: no. Delay: Vis.
  - This is a direct outcome consumer.
- **A6. Catch-point and flight follow-up.**
  - Possession: `anticipatedCatcher` / `observedHolder` / `qbRunning` (possession-read.ts:54-130) read `carrying` and `cue.vel.x` (114) to latch "QB is running". defense.ts:154-174 then `track`s `anticipated.cue.vel`.
  - Catch-carry approach: `movingCatchApproach` (catch-approach.ts:20-55, called from defense.ts). It matches `seen.vel` and back-projects the goal by `seen.vel*(t-now)`.
  - Channel: REC for the latch (114) and the catch hypothesis; TRK for the `track`/approach.
  - Comp: no. Delay: Vis.

### B. Man coverage mirror and break (defense.ts `ManCoverage`)
- **B1. Stem read: `trackReceiver`** (defense.ts:1078-1092). A Vis cue's heading must stay stable for 0.35-0.7 s before `routeRead` is set. The second look is then taken at `delayScale 0.65`.
  - Channel: ANT. A learned tell (stable stem) shortens the delay.
  - Comp: it *is* the anticipation mechanism. Delay: Vis, then Scaled(0.65).
- **B2. Mirror/carry/pedal/open** (defense.ts:1092-1235). The picture is `RouteObservation.read(acquired, …)` (1092). Its `vel` drives `track(a, tgt, seen.vel …)` (1189-1199), `hipsOpen` (1141), `releaseObserved` (1094), the cushion-break burst (1132), `carrySpeedNeed` (1206-1225) and `openCarryFacing` (856-860).
  - Channel: TRK (mirror), with REC triggers mixed in. See Section 3.
  - Comp: **YES**. RouteObservation (coverage-read.ts:12-40) ages an observed deceleration forward by `age`≤0.4 s and turns by the hip angle. CARRY_READ also uses `DeepCoverage.seenAcceleration`.
- **B3. Slow-play / press** (defense.ts:1052-1063). It matches `cue.vel` (Vis) directly.
  - Channel: TRK. Comp: no.
- **B4. Hands/ball reads** (defense.ts:2008-2045 `readsHandsAt`/`playBall`; 2055-2160 `playObservedFlight`/`observedCatchWindow`).
  - `cue.vel` combined with facing (2010-2013) is the "receiver turned back for the ball" tell.
  - `s.vel` is used for `track` (2045).
  - The catch window projects `seen.pos + seen.vel*remaining` and uses `timeToReach(seen …)` (2081-2156).
  - Channel: REC (2010-2013 tell; "can I get there"), with TRK for the `track` at 2045/2087.
  - Comp: no. Delay: Vis.

### C. Zone and deep coverage
- **C1. Receiver reads** (coverage/reads.ts:81-131). They build a `ReceiverRead` through `RouteObservation.read(sim.see(a,r))` and classify the release (vertical/out/in/stop) from `seen.vel` (93-113).
  - Channel: REC. Release classification is a discrete event.
  - Comp: **YES** (RouteObservation). Delay: Vis.
- **C2. Zone techniques using `rd.vel`** (coverage/techniques.ts:77-126 trap/wall/rob) and judgment (coverage/judgment.ts:56-72 `climbing`/`short`; 93-95 `hasVisibleCap`).
  - Channel: TRK for the `track` steering; REC for the judgment thresholds (`vel.x > 3`, `< 2.5`).
  - Comp: inherited from C1. Delay: Vis.
- **C3. Hook/curl/flat/deep zone (`safetyOver`/`zonePlay`)** (defense.ts:1458-1790). Threats come from per-receiver RouteObservation (1465-1471) with a `fut = pos + vel*0.7` projection.
  - Vertical/climbing/carryable/flat-widen thresholds: 1491, 1533-1535, 1617, 1650, 1679, 1724-1739, 1762-1770.
  - `track(... th.vel ...)` carries: 1541, 1579-1587, 1624, 1660, 1742, 1781.
  - The cushion uses `deepest.vel.x` (1547, 1572-1578).
  - QB settle uses `q.vel` (1484).
  - Channel: mixed. See Section 3.
  - Comp: **YES**, through RouteObservation and `DeepCoverage.choose` (coverage-leverage.ts:18-60).
- **C4. `DeepCoverage.choose` and `seenAcceleration`** (coverage-leverage.ts:12-80).
  - It differences `cue.vel.x` between distinct sample stamps (24-30). It continues a burst/plant ≤0.25 s (42-55) and bounds the image age at 0.4 s.
  - `carrySpeedNeed`/`holdWeight` (defense.ts:765-770, 1206-1225, 1597) reuse that acceleration.
  - Channel: TRK. Comp: **YES**. The code explicitly avoids double-counting with RouteObservation (36-41).
- **C5. QB-eyes / throw-reaction reads** (defense.ts:75-90 `seenQbEyes`; 857, 1223, 1409-1441, 1595, 1959, 1977 `sawThrow`/`underneathPlant`).
  - They use QB **position and facing** only, as triggers (throw seen, plant) and as facing targets.
  - Channel: REC. Comp: n/a. Delay: Vis.

### D. Pass protection (blocking.ts PassBlock and engagement.ts pass rep)
- **D1. Rusher identification, `seenRusher`** (blocking.ts:82-93). `seen.vel.x` thresholds (>1 dropping, <-0.5 attacking) are run through `dropped`/`declaredOn`/PRO_CALL.
  - Channel: REC. It declares a blitzer or a dropper.
  - Comp: no. Delay: Vis (blocker in area).
- **D2. Pre-contact pass set and kick-slide** (blocking.ts:340-443, `cutOffPoint` 508-530, `tackleSetLine`). These read **true** `r.pos`, `r.vel`, `r.speed`, with no perception at all.
  - Channel: TRK, a blocker's set on a rusher.
  - Comp: n/a (omniscient). Delay: **none (true state)**.
  - This is the biggest tracking consumer that is not on perception today. See T.
- **D3. Engaged mirror, PASS_FEEL** (engagement.ts:1610-1640).
  - `known = see(b,d, 0.06/rt)`, or `0.12+0.12(1-read)` when hands are off. The `known.vel` lead and `dLat` give the lateral mirror velocity, and `felt(e, lat)` (642) adds a haptic load term.
  - Channel: TRK, by touch and sight.
  - Comp: partial. The haptic `felt` is real-time force, and the short scale is intended as touch; no acceleration term.
  - Delay: Touch (really 0.06-0.24 s; see 0.1).
- **D4. Punch timing, PUNCH** (engagement.ts:435-445) and **grip `gripFor`** (476-500). Both use `see(·, 0.06/rt)`. They read `seen.pos` gap and `seen.vel` relative to the holder (483-499).
  - Channel: TRK by touch. Comp: no. Delay: Touch.
- **D5. Ride/pass "past" checks** (engagement.ts:1184-1205 `rideIntent`/past; 1509-1510; 744 `e.blocker.vel`; 1131-1139). They read true `d.vel` and `b.vel` while hands are on.
  - Channel: TRK (touch). Delay: none (true state).
- **D6. Rusher's aim at the QB** (defense.ts:478; engagement.ts:1578 EDGE_ARC). This is QB position at Scaled(0.5); position only.
  - Channel: TRK. Comp: no. Delay: Scaled(0.5).

### E. QB pocket feel and throw decision (qb.ts, qbmind.ts)
- **E1. `felt()`** (qb.ts:1101-1108). It is `see` at scale 1, or `2.2-1.4*pocketPresence` when the rusher is >1.8 rad off the facing. (The blind-side test uses the true `d.pos` bearing, 1104.) Consumers:
  - `pressure` (1201-1215): `timeToReach(seen.pos, seen.vel)` to the QB, plus `held` and `freeBound` (1182-1195, `v` from `seen.vel` at 1193). `dist` uses true `d.pos` (1212).
  - `held`/`seenHold` (1113-1160): position only.
  - `shouldScramble` (1646-1655) and `climb` (1851-1855): `timeToReach(seen.vel)` to candidate spots.
  - `pocketMove` (1695-1716): position only.
  - Channel: TRK for the continuous drift and pocket movement against seen rushers; REC for the scramble, climb and throw-away decisions they gate.
  - Comp: no, except via E2. Delay: Vis or Scaled(blind).
- **E2. `feltClosing`** (qb.ts:1741-1752). It differences `felt` against `perceive(age+dt)`, carries the acceleration over `age` (pos and vel) and caps it at vmax. Used by `canFinish` (1754-1762) and `setDecide` (1767-1810, SET_DECIDE).
  - Channel: REC. It is a "can I finish the throw here" decision on tracked inputs.
  - Comp: **YES**. Acceleration is carried forward over the image age.
  - Note: the dt-apart difference is noisy and has no age bound, unlike RouteObservation's 0.4 s.
- **E3. QB memory, `QbMind.observe`/`estimate`** (qbmind.ts:387-470). Clear-cone `see` (scale 1) or peripheral `see(…,1.7)` is stored in memory. `estimate` dead-reckons `m.vel` ≤0.5 s, then blends toward `expectedPos` and decays vel to 0 over age 0.2-1.2 s. Consumers:
  - throw window `window` (qb.ts:1314-1350), with `mover = seen.pos + seen.vel*blind`;
  - screen touch (1294-1307);
  - `spotSatOn`/`screenDead` (1033-1049), position only.
  - Channel: REC (window/throw choice).
  - Comp: partial. An expectation prior replaces motion as the memory ages.
  - Delay: QBmem (Vis or Scaled(1.7) plus memory age).
- **E4. Route keys** (`routeKeyPictures` qbmind.ts:438-447 into qb.ts:461-463 `p.pos + p.vel*0.3`) and receiver look (`receiverLook` 422-436, back-dated). The latter feeds `ReceiverForecast` (receiver-forecast.ts:113-265), which steers from `p.vel`.
  - Channel: REC (read progression, receiver open).
  - Comp: the forecast is model-based (route prior), not on perceived acceleration. Delay: Vis/1.7 plus memory.
- **E5. Mesh/handoff** (qb.ts:1915-1944; assign.ts:552-554). RB and QB velocities are used to lead the mesh. These are teammates (0.05 s), so they are out of scope.

### F. Run fits and run defense (run-fits.ts, live-gaps.ts, recognition.ts, engagement.ts run rep)
- **F1. Run/pass recognition, `Recognition.add`** (recognition.ts:339-422). It weighs OL `s.vel.x` (back-set vs fire-out, 354), pullers `|vel.y|>3` (356), QB drop `qb.vel` (381-382; scale `bf`), RB `rb.vel` (389-391) and WR release `s.vel.x>3.5` (422). Also `seesGive` (316-320, scaled) and QB position (266).
  - Channel: REC, the canonical run-or-pass choice.
  - Comp: no. Delay: Vis or Scaled(`bf`).
- **F2. Key reads (guard / man in front / KEY_REACT)**:
  - `guardStep`/`guardRead` (run-fits.ts:366-383, GUARD_KEY_DELAY=0.5): `g.vel` side and pace.
  - DL `manInFront` (defense.ts:227-234) at `keyScale(a)`, consumed in defense.ts:383-470 (`runStep`, edge close, `reachOut`, `KEY_PACE` uses `|man.vel.y|` as pace).
  - engagement.ts:1787-1791 KEY_REACT first step.
  - `blockingIndicator` (run-fits.ts:408-417).
  - Channel: REC at the trigger (first step and side) and ANT (the primed key = KEY_REACT, which commits on a learned tell), then TRK where `man.vel.y` sets the pace/track (defense.ts:405-417, 428, 455, 469).
  - Comp: the KEY_REACT/primed scale is the anticipation mechanism.
  - Delay: Scaled(0.5) or KEY_REACT `max(0.1/rt, 0.35)`.
- **F3. Line flow / pullers / live gaps**:
  - `pullers` (run-fits.ts:332-342) and `linePicture` (live-gaps.ts:103-141): `seen.vel.y` per surface body, `centerVel`, vacancy velocities.
  - Gap velocity (live-gaps.ts:175, 195).
  - Line step `across` (run-fits.ts:393-399).
  - SCRAPE `gap.vel` (run-fits.ts:673).
  - Pull follow (run-fits.ts:684-687, PULL_LOOK).
  - Channel: REC for which side and pull declared; TRK where `gap.vel` and pull `vel.y` lead the fit position.
  - Comp: no. Delay: Vis (+0.15 run attention for non-OL).
- **F4. `executeRunFit` steering** (run-fits.ts:429-660).
  - Inputs: `seen` = backfield cue or carrier (445). `flowVy` is the averaged back/QB `vel.y` (480). Kick-out blockers come from `o.vel.y` (507-508). The force line comes from `b.vel.y` (584-591). `forceTrack(…seen.vel.y…)` (force-track.ts:21-28).
  - Uses: trail motion (604), lag gap (631), `flowSide` (642), `flowLead(… seen.vel …)` onBall (664-665), then `gatheringApproach`/`chooseApproach` (624-625).
  - Channel: TRK (fit leverage on the ball, mirroring the carrier along the line), with REC branch points (flowSide, lag, kick).
  - Comp: no. Delay: Vis.
- **F5. Engaged run defender, `runContactRead`** (engagement.ts:1735-1900).
  - `picture.vel.y` sampled each `decisionInterval` (1793-1798).
  - Runner cue `vel.y`: cutback latch (1825-1831), contain projection (1889-1891).
  - Back/QB flow when `fresh` (1840-1872).
  - DL_CHASE pull `vel.y` (1803-1810).
  - Channel: REC for flow, cutback and declared; TRK for contain aim.
  - Comp: no, but held per decision beat (deliberately REC-paced). Delay: Vis, and KEY_REACT scaled for 1790.
- **F6. Engaged run defender along/steer, `along`** (engagement.ts:2184-2560).
  - Under DL_FLATTEN the blocker is seen (2379-2389). It falls back to true `b.vel` when touching.
  - Ball-key cue `vel.y` (2404-2407, 2516-2517).
  - Channel: TRK. Comp: no. Delay: Vis or true-touch.
- **F7. `helperFit`** (engagement.ts:2605-2620). Position only (owner and visual), Vis.

### G. Run blocking (blocking.ts RunBlock, engagement.ts run rep, climb/collection helpers)
- **G1. Engaged run block, RUN_FEEL** (engagement.ts:2145-2160). `runSeen = see(b,d, 0.06/rt` with hands, or `0.12+…` without). `dv` sets `dLat` and the seal `offset` lead, plus haptic `felt`.
  - Channel: TRK (touch). Comp: partial (haptic). Delay: Touch.
- **G2. Climb / second-level meet**:
  - `meetY`/`plannedClimb` (blocking.ts:1894-2160): `read.seen.vel` intercepts (1896-1944, 2099-2117, 2137).
  - `secondLevelBlockApproach` / `chooseRunBlockFit` (run-block-fit.ts:27-54).
  - `climbPath` (1574-1581): perpendicular velocity.
  - `climbAccess` (climb-access.ts:26, 108, 129).
  - `zoneFlow` (2184, 2215).
  - `attack` (2622-2801): `track(..., seen.vel)` at 2761 and 2801, intercepts at 2734-2748, overtake at 2709.
  - Channel: TRK (closing on a linebacker).
  - Comp: no. Delay: Vis.
- **G3. Pull and kick-out, `readPull`/`kickPicture`** (blocking.ts:2512-2584). It differences the speed of distinct sample stamps into a *braking* vector, then integrates braking over `age + elapsed` (2574-2584).
  - Channel: TRK. Comp: **YES** (deceleration only, mirroring RouteObservation).
  - Delay: Vis, held until `nextRead` (REC-paced refresh).
- **G4. Combination release** (blocking.ts:3009-3030 `danger`; 3155-3195 `readCheckSurface`; 3219-3260 `offReleasedHip`/`slidePast`; 3388-3426 `releaseTiming`/`backerShows`; 3436-3520 `readJoined*`/`readUnjoined*`/`readOvertaken`; 3302-3350 `keeperCandidate`).
  - `backer.vel` decides "climb now" (`go`) by time-to-intercept against the backer's fill time. `backerShows` uses `vel*0.5` and `vel.y>1.5`.
  - Down-man `vel` sets flow.
  - DOUBLE_FLOW (3361-3370) uses true `combo.defender.vel`, treated as touch.
  - Channel: REC (leave the double now), computed from TRK-style intercepts.
  - Comp: no. Delay: Vis, plus true state for DOUBLE_FLOW.
  - Also engagement.ts:1434-1463 (`easeClimberPush`/`prepareClimberFeet`): `backer.vel` shows and `seenD.vel.y` flow, Vis, REC.
- **G5. Zone-step reads** (blocking.ts:2845-2860 `readZone`, 2882 `classifyWork`, 2903-2940 `readRules`, 2964-2980 `gapClimb`, 3093 `findWork`; zone-reach.ts:52-61; blocker-work-picture.ts:17-22).
  - Inputs: positions plus `seen.vel.y` for reach-ability and work classification.
  - Channel: REC (whose man, reach or overtake), with zone-reach as TRK feasibility.
  - Comp: no. Delay: Vis.
- **G6. Hole/runner reads** (blocking.ts:2417-2510 `behindRunner`/`holeThreat`/`opening`).
  - Relative closing `seen.vel - picture.vel` (2422-2443, 2509).
  - `seen.pos + vel*0.3` at the hole (2476).
  - Channel: REC (threat to the hole), TRK for the intercept at 2494. Comp: no. Delay: Vis.
- **G7. Kick block on the edge** (blocking.ts:1736-1752, `seen.vel.y*KICK_LOOK`; 1808-1826) and the space/screen blocks (space-block.ts:72-78 `carrierLane`, 99, 189 `threatOf`; screen.ts:76-132, 194, 281, with `track(..., seen.vel)`).
  - Channel: TRK. Comp: no. Delay: Vis.

### H. Ball carrier (carrier.ts, run-read.ts)
- **H1. RB read of keys and the cut, `runRead`** (run-read.ts:85-260; carrier.ts:162-180 `depth`).
  - Key `vel.y` gives the preferred lane (carrier.ts:165-166), and `proj = pos + vel*h` gives the lateral fit (run-read.ts:148, 193).
  - The key-gone trigger is position (185).
  - The first two keys are focal; others get `eyes.peripheral`.
  - Channel: REC (bounce/cut choice), with ANT where `proj` leads the key by `h`.
  - Comp: no. Delay: Vis; peripheral for non-keys.
- **H2. Open-field threat picture** (carrier.ts:813-890 `arrivalEvidence`, threats at `see(·,0.7)`; 521-710 `command`).
  - Threat `vel` goes into `timeToReach` for candidate lanes (700) and into evade relative velocity (709).
  - Blocker-bonus direction uses `seen.vel` (837, 241).
  - RB_FLOW body `vel` extrapolation (211, 261-264).
  - Traffic tempo (carrier.ts:469-490): `s.vel` toward.
  - Channel: TRK for evading a tackler; REC for lane choice. Comp: no. Delay: Scaled(0.7) or Vis.
- **H3. QB slide** (carrier.ts:439). It uses true `d.pos`/`d.vel`. See T.

### I. Receivers (receiver.ts)
- **I1. Route craft vs the defender** (receiver.ts:97-115 `routeCraft`): `seen.vel` closing and an intercept to bend the stem. Also `clearLane` (48-63, `vel.x>-1`, projection).
  - Channel: TRK. Comp: no. Delay: Vis.
- **I2. `readKeys`** (receiver.ts:331-345): defender pictures aged by `vel*elapsed` for option and sit reads. `defenderAhead`/`stop` (239-242, 504-515): positions.
  - Channel: REC (sit or break). Comp: no. Delay: Vis.

### J. Run-game read by defenders on the backfield (also listed under F)
- `pa-look.ts:18-27` (`-seen.vel.x > 1` "end dropping"), `coverage-cues.ts:6-26` (`showsBlock`, `vel.x > 0.4`), `breakdown.ts:28-36` (`closingOn`, position-based), `coverage/defender.ts:123` (back cue).
  - Channel: REC. Comp: no. Delay: Vis.

### T. Opponent reads on true state (no perception)
| Site | What | Status |
|---|---|---|
| blocking.ts:340-443, 508-530 | Pre-contact pass set: rusher `pos`/`vel`/`speed`, arc forecast | **Leak.** TRK, should be on the tracking channel. |
| blocking.ts:109 | Legacy `isRusher` (PRO_READ=0 only) | Inactive by default. |
| blocking.ts:3346-3370 | DOUBLE_FLOW `combo.defender.vel`, overtake | Intended touch (hands on). |
| engagement.ts:1131-1139, 1184-1205, 1509, 744, 2388 | Ride/past/ground while engaged | Touch, zero latency. |
| tackle.ts:177, 228, 310, 365, 439, 661-768 | Contact physics/grasp | Physics, not perception. |
| qb.ts:1104, 1212 | Blind-side bearing; pressure `dist` | Minor leak; the bearing should come from the seen position. |
| carrier.ts:439 | QB slide threat `timeToReach(d.pos,d.vel)` | **Leak.** REC. |
| receiver.ts:682 | Post-catch blocker picks a defender | **Leak.** REC. |

Teammate sight (excluded): spacing (spacing.ts:313-406, with LINE_STEP `calledVelocityAhead`), `predictCalledMotion` (called-motion.ts:16-45, playsim.ts:1381-1384), and blocker-work picture of mates. These are the "called motion 8" in the earlier count. `predictCalledMotion` adds acceleration toward an announced velocity for pictures ≤0.05 s old; it is teammate-only.

### Rough counts (call sites reading perceived opponent `.vel`)
- blocking ≈60 (D1, G2-G7). Of the 94 `.vel` hits, about 25 are true state or own body.
- defense ≈55 (B, C3, C5, F2).
- engagement ≈30 perceived plus ≈25 touch/true.
- run-fits ≈30.
- QB ≈20 (qb.ts) plus 6 (qbmind).
- carrier ≈15.
- coverage modules ≈25 (reads, techniques, judgment, leverage).
- recognition 8; live-gaps 6; tackle 6 perceived.
- receivers 6; catch/approach/collection ≈12; screen/space ≈6; force/zone-reach/climb-access ≈8.

## 2. The ten groups that matter most

1. **A1+A2 pursuit/chase (common.ts:93-276).** Every defender after the handoff or catch runs through it every tick, and its aim decides angles, missed tackles and YAC. It already carries a speed-only burst, so tracking must replace that estimate, not add to it. Turn rate is missing (cuts).
2. **A5 whiff margin and A4 tackle window (tackle.ts:186-205, 324-345).** These are the last-0.3 s inputs that directly decide a tackle or a miss. They run on Vis/pursuit-scaled pictures with constant velocity and no acceleration, from both the tackler's and the carrier's sides.
3. **B2 man mirror/break (defense.ts:1078-1235).** Separation at the break is the core of the pass game. It is self-compensated by RouteObservation plus DeepCoverage, and the stem tell (B1) is the only learned anticipation in coverage. It needs the most care against double counting.
4. **C3+C4 zone/deep carry (defense.ts:1458-1790; coverage-leverage.ts).** They decide whether a vertical is carried or passed off and what cushion holds, so they decide explosive passes. They are already compensated twice (decel aging plus seenAcceleration).
5. **D2+D3 pass set and engaged mirror (blocking.ts:340-443; engagement.ts:1610-1640).** These two decide whether the rusher wins the edge. The pre-contact set is omniscient while the engaged mirror is "touch" at an effective 0.06-0.24 s; that asymmetry shapes pressure rates more than any rating.
6. **E1+E2 QB pocket feel (qb.ts:1101-1215, 1741-1810).** `pressure`/`canFinish`/`setDecide` decide sack, throw-away, scramble or throw on time. feltClosing already extrapolates acceleration; pressure/scramble/climb do not, so they are inconsistent with each other today.
7. **F1 run/pass recognition (recognition.ts:339-422).** This flips every second-level defender between run fit and pass drop. A discrete REC event built from velocity thresholds, it is the clearest choice-RT case.
8. **F2 key reads (run-fits.ts:366-383; defense.ts:227-470; engagement.ts:1787-1791).** The first step of the DL and LBs decides gap integrity on every run. KEY_REACT is the existing anticipation channel and is on by default.
9. **F4 run-fit steering and F3 line flow (run-fits.ts:332-687; live-gaps.ts).** Linebacker fits against a moving gap and carrier set run yards per carry. The gap's `vel` and the carrier's `vel.y` lead are constant-velocity extrapolations of an extra-stale (+0.15 s attention) picture.
10. **G2+G4 climb and combo release (blocking.ts:1894-2160, 3388-3520).** They decide whether the linebacker is blocked at the second level. `releaseTiming` is a REC decision computed from TRK intercepts on the backer's stale velocity.

Honourable mentions:
- H2 carrier threat picture (lane choice and evasion at Scaled 0.7).
- B4/C5 ball-and-throw reads (break on the ball).

## 3. Mixed groups: one picture used for both tracking and a recognition decision

1. **defense.ts `trackReceiver`/`ManCoverage` (1078-1235).** The same RouteObservation `seen` feeds:
   - the continuous mirror `track(seen.vel)` (1189-1199);
   - discrete latches: `releaseObserved` (1094), `hipsOpen` (1141, crossing/consumed), cushion broken/`carrySpeedNeed` → open-carry (1206-1225).
   - The stem-stability timer (B1, ANT) also changes the delay of that same picture.
2. **defense.ts zone `safetyOver`/`zonePlay` (1458-1790).** One `threats[]` (RouteObservation pictures) feeds:
   - the vertical/climbing/carryable/flat-widen classifications (REC: 1491, 1533, 1650, 1724-1730, 1762-1770);
   - the `track(th.vel)` carries (TRK: 1541, 1579, 1660, 1742, 1781);
   - `fut = pos + vel*0.7`, which is itself a 0.7 s anticipation.
3. **qb.ts `felt()` (1101).** One picture feeds:
   - continuous pocket movement (`pocketMove` 1695-1716, `climb` 1851);
   - the scramble and throw decisions (`pressure` 1201, `shouldScramble` 1646);
   - feltClosing for `canFinish`/`setDecide`.
   - Only the last compensates for acceleration, so one rusher can be "arriving" in setDecide and "not yet" in `pressure` on the same tick.
4. **defense.ts DL key `manInFront` (227-234 → 383-470) and engagement.ts `runContactRead` (1784-1798).**
   - The keyScale picture gives the first-step side (REC/ANT: `runStep`, `firstStep`).
   - The same picture's `man.vel.y` is then the tracked pace and position for the squeeze or close (TRK: 405-417, 428, 455, 469; `stack.flow`).
5. **blocking.ts `releaseTiming`/`backerShows`/`readJoinedCombination` (3388-3520) and engagement.ts:1434-1463.** One backer picture gives:
   - a time-to-intercept (TRK geometry);
   - the "climb now" or "backer shows" decision (REC);
   - the climber's later approach (G2 TRK).
6. **blocking.ts `holeThreat`/`behindRunner` (2417-2510).** Relative closing on one picture selects the threat (REC) and also gives the intercept path (`seenCurrent` projection, 2494).
7. **run-fits.ts `executeRunFit` (429-660), with `forceTrack` and `flowSide`.** `seen.vel.y` both picks the branch (flowSide 642, lag gap 631, trail 604) and leads the fit point (`flowLead` 664, `forceTrack` 597).
8. **engagement.ts `runContactRead` edge contain (1825-1891).** `runnerCue.vel.y` latches `runFlows`/`cutback` (REC) and projects `contain = pos.y + vel.y*arrive` (TRK).
9. **possession-read.ts `anticipatedCatcher` → defense.ts:174.** The same cue latches the catch hypothesis (REC on `carrying`) and is then `track`ed with `cue.vel` (TRK). `qbRunning` (110-120) latches on `cue.vel.x`.
10. **carrier.ts `arrivalEvidence`/`command` (813-890, 521-710).** Threat `vel` chooses the lane (REC) and computes the evasive relative velocity (TRK, 709).
11. **blocking.ts `readPull` (2512-2584).** The tracked kick-out picture (self-compensated braking) is refreshed only at `nextRead`, a REC cadence. Moving it to a tracking channel changes both the latency and the refresh.
12. **blocking.ts `seenRusher` (82-93) vs the pass set (340-443).** These are split across two code paths with different information: identification is REC on Vis, and the set is TRK on true state. The redesign has to join them on one acquired rusher picture.

## Self-compensators that would double-count if tracking added acceleration
| Mechanism | Where | What it already adds |
|---|---|---|
| RouteObservation | coverage-read.ts:12-40; used in defense.ts:1092, 1465; coverage/reads.ts:91 | Observed decel aged ≤0.4 s; hip-turn heading bend |
| DeepCoverage.seenAcceleration (CARRY_READ, on) | coverage-leverage.ts:18-55; defense.ts:765-770, 1206-1225, 1597 | ±accel from distinct stamps, burst ≤0.25 s |
| Pursuit forecast | common.ts:95-112 | Speed accel from two samples, τ 0.3-0.6 s |
| feltClosing (SET_DECIDE) | qb.ts:1741-1752 | Accel over age, pos and vel |
| readPull/kickPicture | blocking.ts:2512-2584 | Braking only, integrated over age |
| KEY_REACT / keyScale (on) | key-read.ts:14-21; defense.ts:234; engagement.ts:1790 | Shorter delay (primed): ANT, not accel |
| Stem routeRead | defense.ts:1084-1091 | Shorter delay 0.65× after a stable stem: ANT |
| Touch scales PASS_FEEL / RUN_FEEL / PUNCH / grip | engagement.ts:441, 479, 1615, 2148 | Shorter delay; haptic `felt()` load (642) |
| QB estimate prior | qbmind.ts:457-475 | Expected-position blend as memory ages |
| GAZE remembered (off) | playsim.ts:735-772 | Constant accel ≤1 s plus a tracking prior |
| predictCalledMotion (teammates) | called-motion.ts:16-31 | Accel toward an announced velocity |
