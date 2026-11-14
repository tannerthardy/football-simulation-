# Ball in the air: one honest estimate, turn-and-find by phase, play the hands (spec)

Coverage, C14, 2026-11-14, on develop `b9cd3628` (engine-58). A spec for review, not a
build. Every rule below is marked:
- **coached**: taught by the sources, not measured;
- **measured**: a number from tracking, with its operator;
- **choice**: ours, with no source; an estimate to revisit.

Sources:
- Tools' perception review (`docs/football-handbook/ball-in-air-perception-sources.md`,
  `claude/admiring-bell-t3ji19` ac1c6c66).
- Run Game's technique and rules review (`docs/football-handbook/ball-in-air-technique-sources.md`,
  `run/G3-oz-backfield` fcd88498).
- Coverage's traces and tables (operators on `coverage/C14-int-diag`).
- The QB lane's throw-error tables.

This replaces the information cheats the audit listed for the ball path: the user's
standing rule is that every information cheat found is removed and given a solution.

## 1. What is wrong now

Two oracles and one dice roll decide the ball in the air.

1. **The defender is handed the flight.** `acquireFlight` (`possession-read.ts:17`)
   copies `sim.ballPath`, the whole true future path with height, the tick he recognizes
   the throw. `playBall` calls it every tick, so a tip hands over the new true path at
   once. It feeds:
   - `catchSpot` (the intercept point);
   - `observedCatchWindow` (who catches, and when);
   - `arrivalPoint`;
   - `rememberedFlight` / `unresolvedBallArea` (the true landing spot, used by
     `pursueIfLive`);
   - the PassRusher peel.
2. **The receiver reads the true path every tick.** `TrackBall` steers to
   `catchSpot(a, sim)` on `sim.ballPath` from 0.08-0.33 s after the release, facing the
   ball or not. His only error is one constant offset per throw
   (σ = 0.5 x (1 − ballTracking) yd).
3. **Finding the ball is one dice roll.** `findsBall` (LOOK_ONCE) gives a defender a
   chance of 0.25 + 0.6 x ballSkills to "look", once per flight. It doesn't depend on
   phase, and looking costs nothing.

### What it does to the play (measured)

- **The receiver erases the QB's miss.**
  - On 1.5-2.0 s flights the NFL receiver slows from 7.6 to 6.7 yd/s, ends 2.4 yd off
    his release line and 1.4 yd from the landing point.
  - Ours holds about 7.6 yd/s and ends 0.8 yd from the landing point; with the QB's miss
    included, 0.4 yd from the ball. The NFL is 1.1-1.4 yd.
  - Separation in the flight: NFL closes 2.0 → 1.6; ours opens 1.9 → 2.5.
  - (`rcv-flight.ts` / `bdb26_rcv_flight.py`, BDB 2026 targeted receiver.)
- **The covered deep ball.**
  - Our defender recognizes the throw about 1.2-1.5 s into the flight.
  - He then asks for 9+ yd/s and gets 6-7.
  - He is "looking" on 0-5% of catches vs 19-23% of incompletions.
  - NFL man DBs don't accelerate in the flight; they turn their bodies 60-80°.
  - (`deep-trace.ts`, `flight_close.py`, `bdb27_deep_db.py`.)
- **Closing in the air.** The underneath zone defender's gap to the catch closes
  0.12 yd in the sim vs 0.65 in the NFL (COV-1).

The sources agree on two things (Tools §1-2, Run Game §1-3, §7):
- skilled catchers steer continuously on what they see of the ball rather than predict
  a landing point;
- a defender looks for the ball only when in phase; out of phase he plays the
  receiver's hands.

## 2. Stage 1: one ball estimate per player (`BALL_EST`, off)

**The rule.** Each player who has seen the ball holds his own estimate of its flight,
fitted only to the ball positions he has observed. It is refreshed each perception step
while the ball is in his view, and carried forward unchanged (ballistic) while it isn't.

| Part | What | Source |
| --- | --- | --- |
| Observations | Ball position samples through the existing delayed channel, only on ticks the ball is inside his view (defender: ThrowSight's cone; receiver: his facing cone, or GAZE when on) | choice (uses the existing perception channel) |
| Model | A ballistic arc under known gravity, fitted to his samples. No spin, wind or drag | coached-adjacent (McLeod & Dienes: the optical rule works without a trajectory model; a fitted arc is the stand-in Run Game §7 calls defensible) |
| Noise | Per-sample angular noise, larger in depth along his line of sight than across it. Across: about 1° (choice); along: from optical size change, about 3x across (choice) | the anisotropy is measured in the lab (Brouwer 2006: depth judged poorly, lateral from angular velocity); the magnitudes are choice |
| First estimate | Before 2 samples: the direction of the throw from the QB's seen release (arm and shoulder line) and no depth, so he moves along the line, not to a spot | coached (HK: "a QB can only throw where his off shoulder points") |
| Early error | Front/back unknown for roughly the first 0.3-0.5 s of a long flight; emerges from the fit, not a timer | measured in the lab (McLeod & Dienes: run start about 0.5 s; Oudejans: novices start the wrong way) |
| Not looking | The estimate stays at its last fit. No new information. He can still act on cues (hands, the receiver's head) | coached (Run Game §7) |
| Skill | ballTracking (receiver) / ballSkills (defender) scale per-sample noise and the delay before the first sample | choice (the ratings' meaning: perception, not outcome) |

**The estimator's constants, fixed before any NFL outcome row is read (Integration's
condition 1).** A ballistic arc is pinned by two clean samples, so everything a player
gets wrong comes from these. The NFL rows are the exam: the receiver's 7.6 → 6.7 yd/s,
1.1-1.4 yd end distance and the 1.9-2.6 yd p75 tail. If the exam is missed, the next
move is a missing mechanism, not a bigger sigma.

| Constant | Value | Evidence |
| --- | --- | --- |
| Sample interval (attempt 2) | A sample on every perception step while the ball is within his eye range (smooth pursuit) | measured, not football: eyes on the ball in 95.5% of frames while catching (Postma 2014). Attempt 1 used one sample per 0.25 s from scanning-between-players fixations (Aksum 2020, 242 ms), the wrong evidence for a pursued ball |
| Error correlation (attempt 2) | Each sample's error is serially correlated: a first-order process with a 0.25 s time constant, so ticks inside it do not average the error away. In the fit, each sample counts as dt / 0.25 s of an independent one | choice. The order is a fixation's length, but no source gives a pursuit-error correlation time. Fixed before attempt 2's exam |
| Delay | His existing perception delay, `observationDelay(reactionTime)`, the same channel every picture uses | engine (no new constant) |
| Bearing noise (azimuth and elevation), σ | 0.5° at the best skill, 1.0° at the worst | choice: the order of positional judgement of a moving target; static acuity is arc-minutes, motion degrades it |
| Range noise, σ | 5% of range at the best skill, 10% at the worst | choice: size and distance Weber fractions are a few to about 10% in psychophysics, and Brouwer 2006 finds depth judged poorly (from optical size, not angle) |
| Depth : lateral error | Emerges. At 20 yd: lateral 0.17-0.35 yd, depth 1-2 yd, about 6 : 1 | follows from the two rows above |
| What he can sample | The ball within 30° of where his head points | choice: tracking a ball needs it near fixation (Vater 2022: identification needs fixation; foveal 4-5°; 30° allows eye movement within the head) |
| Head | Turns toward the ball at 6 rad/s, within ±90° of his body facing (GAZE's existing rates) | engine (GAZE); anatomy: cervical rotation 70-90° |
| Skill | ballTracking (receiver) / ballSkills (defender) moves bearing and range noise linearly between best and worst | choice |
| Fit | Generalized least squares for launch position and velocity, each sample weighted by its own covariance (range along his line of sight, bearing across it). Gravity and the ball's drag are known physics, iterated in. Needs two samples | choice (a fitted arc is the stand-in Run Game §7 calls defensible) |

**The receiver's look costs him (Integration's condition 2).**
- A receiver running away from the QB has the ball behind him. To sample it, his head
  plus eyes must reach it: at most 120° off his body facing. A ball directly behind
  therefore needs his shoulders turned at least 60° off his running line.
- The existing facing cap prices that turn: `directionalSpeedFactor` at 60° costs about
  13% of top speed for a shuffle factor of 0.7.
- Stage 1's receiver policy is the simplest: on his ball, he turns his shoulders only as
  far as he needs to keep the ball in view. That's "eyes up after the drive" with no
  timer, and the per-play choice of when to look waits for the receiver lane.
- Defenders keep today's facing; their look decision is stage 2.

**The QB (Integration's condition 3).**
- No QB code reads the flight after the release; only the defense and receiver
  consumers above do (checked on `b9cd3628`).
- A tip or a disturbed release (THROW_HOLD) is a new flight he must see like anyone else.

**Continuity of the request (Integration's condition 4).**
- The estimate changes only when a new sample lands, at most 4 times a second, and by
  less as samples accumulate.
- Between samples the receiver's aim point is fixed, so his request is continuous apart
  from those steps.
- Budget: aim-point jumps over 1 yd after the 3rd sample count as dither, reported per
  flight, alongside today's dither count.

**One API, every consumer.** `acquireFlight` / `rememberedFlight` return the estimated
path instead of `sim.ballPath`, re-fitted on each call from his own samples. Everything
downstream then changes in one place:
- `catchSpot`, `observedCatchWindow`, `arrivalPoint`, `unresolvedBallArea`, the peel;
- Defense's items in the honesty batch: the blitzer gate (1), DRIVE_CATCH (4),
  `pursueIfLive` (5).

`TrackBall` calls `catchSpot` on his own estimate instead of `sim.ballPath`. Its
constant error offset goes, since the estimate's error replaces it.

- **A tip or deflection** is a new flight he must see. His estimate is invalid until he
  has 2 new samples. **(choice)**
- **Steering.** Keep today's steer-to-the-reachable-point, re-aimed each tick on the
  estimate. It arrives moving because the point moves as the estimate converges. An
  optical-acceleration rule is the faithful form but can wait for a witness that needs
  it. **(choice)**
- **The QB** knows the ball he threw: he keeps his intended flight. **(choice)**

**What should move, and what would refute it.**
- The receiver's speed under a long ball should drop toward the NFL's 7.6 → 6.7 yd/s,
  and his end distance to the ball should rise from 0.4 toward 1.1-1.4 yd, because he
  no longer sees the true spot.
- Short flights (under 0.8 s) should barely change: two or three samples pin the arc.
- If the receiver still arrives within 0.5 yd on 1.5 s+ flights, the noise is too
  small or he sees too much.
- If short throws start missing, the first estimate is wrong.

## 3. Stage 2: turn and find by phase (`LOOK_PHASE`, off)

Replace the `findsBall` dice with a choice from what he can perceive.

| Part | Rule | Source |
| --- | --- | --- |
| Phase | From his picture of the man: lateral within about a body width (0.7 yd), level in depth (within 1 yd), and matching speed (within 1 yd/s) | coached: in phase = shoulder locked, even, in step (Daberkow, Kelly, Grayvold); the yard figures are choice (no source gives one, Run Game §1) |
| In phase | Turn the head and look: his estimate starts sampling from the next perception step | coached |
| Out of phase | Eyes stay on the near hip; recover toward phase; no samples of the ball | coached ("NEVER look back", Daberkow) |
| Cues to look | The receiver's head turning or his eyes widening; his hands rising (HANDS_CUE); in zone, the QB's throwing motion | coached (Coach & AD, USA Football, HK) |
| Cost of looking | The head turns (GAZE: 6 rad/s within 90° of the body). While it is turned back, his body facing and the line he can run are those of a turned body. His picture of the man goes stale except by contact | coached (Daberkow: looking before phase loses the WR); no measured cost exists, so physics and gaze carry it, no number |
| Freedom | He may look out of phase. It is never forbidden; it costs him the man | rule (never ban what works) |
| Skill | ballSkills: how fast the look finds the ball (samples start sooner) and the sample noise; not whether he may look | choice |

Zone defenders facing the QB are already "looking": they sample from the release.

- **Moves:** NFL man DBs turned 60-80° in the flight, without accelerating
  (`bdb27_deep_db.py`).
- **Refutes:** if trailing defenders still find every ball, or never do.

## 4. Stage 3: the finish (`PLAY_HANDS`, off)

Finishes are actions judged by the existing pass-contact judge, whose input is
`ballAttention`, i.e. whether he is looking:

| Finish | When | Source |
| --- | --- | --- |
| Play the ball (high point, or undercut) | Looking, and the estimate puts the ball inside his reach before the receiver's. Undercut only when both hands are sure (reach margin) | coached ("never go in front unless both hands", DB guide; high point, Grayvold) |
| Play the hands | Not looking, within reach of the receiver at the hands cue: the near arm through his hands as they rise, timed off the hands | coached ("break the glass", "rake", Kelly, Grayvold, Coach & AD); legal under 8-5-3(a) when competing for the ball, a foul when early through the back (8-5-2) |
| Tackle the catch | Neither possible: take the angle to the receiver after the catch | coached (Coach & AD) |

**The hands cue and late hands.**
- The cue exists already (`HANDS_CUE`); the receiver's "late hands" timing is his
  craft.
- **Item 12, decoy hands, is not in this build.** Today no receiver shows his hands
  without a ball coming, so the false-cue rate is zero by construction.
- The seam is the hands state. A receiver showing hands as a deception is route craft
  for the receiver lane.
- Tracking can't measure a false-cue rate (no hands in the data). **(choice to defer)**

- **Moves:** breakups rise on covered deep balls; "looking" is no longer the dice's
  0-5% of catches.
- **Refutes:** if interference rises past the NFL's DPI rate (the judge already keys
  on attention), the timing is early.

## 5. The QB's lead (interface for the QB lane)

With the estimator, the receiver no longer erases the QB's miss, so the QB's lead must
model where the receiver will actually be.

The interface the QB lane asked for is the receiver's expected speed at arrival, by
flight time and his tracking:
- **The table** comes from the same receiver-flight operator, binned by flight time.
  For example, 1.5-2.0 s flights: the NFL receiver slows 7.6 → 6.7 yd/s. **(measured,
  BDB 2026)**
- **His tracking's effect** is ours. The NFL data carries no rating. **(choice)**
- In the engine it should be the receiver's own behavior under the estimate, read back
  by the QB as a belief. It is not a constant: the QB learns what this receiver does.
  **(choice)**

## 6. Order, flags and reads

1. **`BALL_EST` first, both sides at once,** so neither side keeps an oracle the other
   lost. LOOK_PHASE and PLAY_HANDS stay off.
   - **Reads:**
     - the receiver-flight table (speed, distance to the ball at arrival, separation
       through the flight);
     - the defender-in-flight table (body turn, acceleration);
     - COV-1 closing;
     - completion and YAC on covered deep balls (flights of 1.5 s or longer);
     - flats and quick throws as the unaffected control.
   - **Cohort:** BDB 2026 targeted receiver + coverage players, pooled weeks; "nearer
     the ball" in 2D.
2. **`LOOK_PHASE` on top.**
   - **Read:** the same saved deep-ball snaps run three ways (`matched-restage.ts`):
     estimator only; estimator + phase; phase with today's oracle. That separates the
     information effect from the decision effect (Tools §5.3).
3. **`PLAY_HANDS` on top.**
   - **Reads:** breakups vs late hands, the in-phase vs out-of-phase finish share, DPI
     per 100 drop-backs.

Each stage gets two attempts and a new flag, registered off.

## 7. Not doing

- **No imported reaction or perception constants.** None of 285 ms, 200-400 ms,
  0.55 s or 110 ms is used. The lab literature gives the architecture, not football
  numbers (Tools §2, §6).
- **No raised speed or acceleration to close a gap.** The 9+ requested vs 6-7 achieved
  is a request problem.
- **No retrospective ideal path to the true landing spot as what he knew.**
- **No dice for whether he may look.** Ball skills changes how well he finds the ball,
  not whether he is allowed to look.
- **No catch point for a receiver before he has seen the same evidence.**

## Stage 1 result (2026-11-14): parked after two attempts

Code: `coverage/C14-ball-est`, flag `BALL_EST` (off).

Exam: deep targets with 1.5-2.0 s flights (`rcv-flight.ts`, seeds 11/23 x 8 leagueSample games). NFL in the last column.

| | off | attempt 1 | attempt 2 | NFL |
| --- | --- | --- | --- | --- |
| Speed, release -> arrival (yd/s) | about 7.6 held | 7.3 -> 6.3 / 7.3 | 7.5 -> 6.1 / 7.3 -> 7.6 | 7.6 -> 6.7 |
| Off his release line (yd) | 1.1-1.7 | 2.0 / 2.1 | 1.2 / 2.2 | 2.4 |
| To the landing point (yd) | 0.6-1.8 | 3.0 / 2.3 | 2.6 / 2.8 | 1.4 (p75 1.9-2.6) |
| Separation at arrival (yd) | 1.9-2.2 | 2.3-2.4 | 3.0 / 2.7 | 1.6 |

- **Attempt 1:** one sample per 0.25 s. Wrong evidence: a scanning fixation, not a pursued ball.
  - Bug fixed along the way: the shoulder turn brought the ball only to the edge of his reach.
- **Attempt 2:** continuous pursuit sampling with a serially correlated error.
  - Also fixed: no samples while the ball is being secured. `catching.ts` carries it in his hands.
- **His estimate at the true arrival time** is 0.7/1.5/4.3 yd from the ball (p25/50/75).
  - That's `est-split.ts`, seed 11, flights 1.2 s+.
  - The fitter alone, on the same geometry, gives 0.6 yd median.
- **No hidden oracle steers him** (`est-steer.ts`). Where his catch spot and the true one differ by 3 yd or more, his heading is about equally off each (23° vs 22°).
- **The miss is the receiver not reaching his own estimate**, not the estimate.
  - His first sample comes about 0.5 s after the release, with the look itself slowing him.
  - The next move is that steering (a late-converging estimate he must run to), not a different sigma.
- **Not done before parking:** the defender side's reads, the short/intermediate controls and catch rate by separation.
