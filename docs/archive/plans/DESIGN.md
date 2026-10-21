# Gridiron Engine — Design

A physics-driven American football simulation with the management depth of
Football Manager. Every play is simulated as 22 autonomous athletes moving in
continuous space under real kinematic limits, reacting to what they *perceive*
(with human reaction delays), executing assignments from a real playbook, and
resolving contact (blocks, tackles, catches) through force, leverage and skill
contests. Stats are never rolled directly — completion percentage, yards per
carry, sack rate and so on *emerge* from the physics and the decisions.

This document is the blueprint. `docs/ROADMAP.md` tracks what is built.

---

## 1. Guiding principles

1. **Emergence over dice.** No "roll for completion". A pass is complete because
   the ball physically arrived inside a receiver's catch envelope before a
   defender could get a hand on it, and the receiver's hands held on under
   that contest. Ratings change the inputs to physics, not the outputs.
2. **Measurables are ground truth.** A player's 40 time, 10-yard split, short
   shuttle, height, weight and arm length are converted into a kinematic body
   (top speed, acceleration curve, braking, cut ability, mass, reach). Skill and
   mental ratings sit on top of the body.
3. **Perception is not omniscience.** Every agent sees the world through a
   reaction-time delay determined by their mental ratings. Separation on a
   route break is the gap between when the receiver changed velocity and when
   the defender's brain caught up.
4. **Playbooks are data.** Formations, personnel groupings, route concepts, run
   schemes, fronts, coverages and pressures are declarative. Concepts are
   written against *receiver numbering* (#1/#2/#3 from the sideline in) so a
   single concept works from any formation — exactly how real offenses teach it.
5. **The game adapts to the athletes.** Role suitability, scheme fit, depth
   charts, matchup-hunting play callers, shadow coverage and in-game learning
   all read the same player model the physics uses.
6. **Deterministic.** Everything takes a seeded RNG. Any game, drive or single
   play can be replayed bit-for-bit for debugging and for the replay viewer.
7. **Calibrated.** A calibration harness simulates thousands of games and
   compares league output against NFL baselines (completion %, YPC, sack rate,
   time to throw, pressure rate, aDOT, YAC, explosive play rates, scoring).

---

## 2. Architecture overview

```
 ┌──────────────────────────── League layer (Phase 5) ───────────────────────────┐
 │ teams · contracts · cap · draft · scouting · development · season · playoffs  │
 └───────────────────────────────────────┬───────────────────────────────────────┘
                                         │ rosters, depth charts, schemes
 ┌───────────────────────────── Game layer ──────────────────────────────────────┐
 │ GameState (score, clock, down, distance, timeouts, possession)                │
 │ Offensive & defensive coordinators (play calling, matchups, in-game learning) │
 │ Personnel & substitution (fatigue rotation, packages)                         │
 │ Special teams (kickoff, punt, FG/PAT)   Rules/officiating (penalties, clock)  │
 │ Stats (box score, advanced metrics), play-by-play                             │
 └───────────────────────────────────────┬───────────────────────────────────────┘
                                         │ PlayCall (offense + defense), players
 ┌───────────────────────────── Play layer ──────────────────────────────────────┐
 │ Alignment resolver: formation → spots; defense aligns to offensive strength   │
 │ Agents: body (kinematics) + brain (behavior state machine) + perception       │
 │ Tick loop @ 20 Hz: perceive → decide → steer → integrate → contacts → ball    │
 │ Blocking engagements · tackles · catch contests · fumbles · whistles          │
 │ Event log + frame recorder (replay)                                           │
 └───────────────────────────────────────┬───────────────────────────────────────┘
                                         │
 ┌───────────────────────────── Physics core ────────────────────────────────────┐
 │ Vec math · seeded RNG · sprint model · traction-ellipse integrator ·          │
 │ time-to-reach (pursuit) · 3D ball flight with drag + wind · throw solver      │
 └───────────────────────────────────────────────────────────────────────────────┘
```

Source layout:

| Path | Responsibility |
|---|---|
| `src/core` | RNG, vector math, units, field geometry |
| `src/players` | Attributes, measurables, physical profile, positions & roles, generator |
| `src/physics` | Movement integrator, time-to-reach, ball flight & throw solver |
| `src/playbook` | Personnel, formations, routes, pass/run concepts, fronts, coverages, play library |
| `src/sim` | Play state, agents, perception, behaviors, blocking, tackling, catching, play loop |
| `src/game` | Game state machine, clock & rules, play callers, special teams, stats, PBP |
| `src/league` | Teams, roster generation (later: contracts, draft, development) |
| `scripts` | CLIs: sim a play, sim a game, calibration run, replay export |
| `viewer` | Canvas replay viewer for exported plays |

---

## 3. Units, field and coordinates

* Distance in **yards**, time in **seconds**, mass in **kg** (for momentum
  contests), angles in radians.
* Field: `x ∈ [0, 120]` (0–10 and 110–120 are end zones), `y ∈ [0, 53.33]`.
  Hash marks at `y = 23.58` and `29.75` (NFL: 70'9" from each sideline).
* **Play frame:** inside a play the offense always attacks `+x`. The line of
  scrimmage is `x = 10 + yardline` where `yardline` is yards from the offense's
  own goal line. The game layer flips direction for presentation only.
* Gravity `g = 10.73 yd/s²`. Ball release height ≈ 2.2 yd, catch height ≈ 1.3 yd.

---

## 4. Player model

### 4.1 Measurables (physical ground truth)

`heightIn, weightLb, armIn, handIn, forty, tenSplit, shuttle, threeCone,
vertical, broad, bench`. Generated per position from realistic combine
distributions with latent correlations (an *athleticism* latent, a *size*
latent, an *agility* latent) so that, e.g., heavier players are slower and
explosive players jump higher.

### 4.2 Ratings (1–100)

| Group | Ratings |
|---|---|
| Physical | strength, stamina, balance, toughness (injury resistance) |
| Passing | throwPower, accShort, accMid, accDeep, release, throwOnRun, touch, pocketPresence |
| Ball carrier | vision, elusiveness, breakTackle, ballSecurity, patience |
| Receiving | routeRunning, release (vs press), hands, contestedCatch, ballTracking |
| Blocking | passBlock, runBlock, handTechnique, leadBlock |
| Defense | passRushPower, passRushFinesse, blockShedding, tackling, hitPower, pursuit, manCoverage, zoneCoverage, press, ballSkills |
| Kicking | kickPower, kickAccuracy, puntPower, puntAccuracy |
| Mental | awareness, playRecognition, decisionMaking, composure, discipline, anticipation, consistency, workRate |

### 4.3 Physical profile (derived, used by physics)

**Sprint model.** Straight-line sprinting follows
`v(t) = V·(1 − e^(−t/τ))`, so distance `d(t) = V·(t − τ(1 − e^(−t/τ)))`.
Given a player's 10-yard split and 40 time, we solve for top speed `V` and
time constant `τ` (bisection on the ratio `d(T40)/d(T10) = 4`). A 4.40/1.50
player gets `V ≈ 10.5 yd/s` (21.5 mph), `τ ≈ 0.60 s`; a 5.20/1.80 tackle gets
`V ≈ 9.0 yd/s`, `τ ≈ 0.77 s`.

The equivalent force law is **`a_drive(v) = (V − v)/τ`** — propulsive
acceleration falls linearly to zero at top speed. That single law reproduces
both the 10-yard split and the 40 time and is what the integrator uses.

Other derived quantities:

| Quantity | Source |
|---|---|
| `brake` (max deceleration) | shuttle / 3-cone, agility, balance |
| `lateral` (max centripetal accel, the cut) | shuttle / 3-cone, agility, balance, routeRunning/elusiveness for skill players |
| `turnRate` (facing angular speed) | agility |
| `backpedalFactor`, `shuffleFactor` | position + coverage technique |
| `mass` | weight |
| `reach` (horizontal catch/tackle radius) | arm length + height |
| `maxCatchHeight` | standing reach + vertical jump |
| `reactionTime` | playRecognition, awareness (0.12–0.40 s) |

### 4.4 Positions, roles and familiarity

Positions: QB, RB, FB, WR, TE, LT, LG, C, RG, RT, DE (edge), DT, NT, OLB, ILB,
CB, NCB (nickel), FS, SS, K, P, LS.

**Roles** (Football-Manager-style) describe *how* a player plays a position,
each with a weighted attribute formula producing a 0–100 suitability:

* QB: Pocket Passer, Dual Threat, Game Manager, Gunslinger
* RB: Power Back, Elusive Back, Receiving Back, Workhorse
* WR: X (boundary/contested), Z (flanker/vertical), Slot, Deep Threat
* TE: Inline Y (blocker), Move F (receiving), H-Back
* OL: Zone Blocker (athletic), Power/Gap Blocker (mauler), Pass Protector
* DL: Nose (1-tech/0-tech), 3-Tech Penetrator, 5-Tech Two-Gapper, Speed Edge, Power Edge
* LB: Mike (run stuffer/signal caller), Will (coverage/range), Sam/strong-side, Off-ball Blitzer
* DB: Press Corner, Zone Corner, Slot Corner, Box Safety, Single-High FS, Robber

**Positional familiarity** (0–1) per position scales mental effectiveness
(awareness, recognition) when a player lines up away from his natural spot.

---

## 5. Physics core

### 5.1 Movement — the traction ellipse

Each tick an agent's brain requests a **desired velocity** and a **desired
facing**. The integrator decomposes the required velocity change into a
tangential part (along current velocity) and a normal part (turning):

* tangential limit: `a_drive(v)` when speeding up, `brake` when slowing;
* normal limit: `lateral` (cut ability), reduced at high speed;
* combined limit: `(a_t/A_t)² + (a_n/A_n)² ≤ 1` (friction ellipse).

Consequences that fall out for free: receivers must throttle down to snap off
a 90° break (route-running skill raises `lateral`, letting a great route
runner break at higher speed); ball carriers lose speed on cuts; pursuit
angles matter; big men cannot change direction like corners.

**Facing** is a separate state with a max angular rate. Max speed is scaled by
the angle between facing and velocity: forward 1.0, lateral shuffle ≈ 0.55,
backpedal ≈ 0.6–0.7 (DB technique). A corner in his backpedal must *open his
hips* (rotate facing) before he can reach full speed — the double move
punishes exactly this.

**Fatigue** is an energy reservoir drained by mechanical work (accelerating,
high speed, engagement exertion) and refilled between plays according to
stamina. Low energy reduces `V`, `a_drive`, strength and lengthens reaction time.

### 5.2 Time-to-reach

`timeToReach(body, point)` estimates how long an agent needs to reach a point
given its current velocity: braking/turning penalty to redirect, then a 1-D
solve of the sprint model starting from the useful velocity component. It is
the workhorse for pursuit angles, QB throw-window evaluation, ball-carrier
lane evaluation and zone defenders breaking on the ball.

### 5.3 Ball flight

3-D projectile with quadratic drag relative to the air:
`a = g + (−k·|v − w|·(v − w))`, `k = ½ρC_dA/m` (spiral `C_d ≈ 0.10`,
nose-on area 0.0227 m², mass 0.42 kg), wind `w`. Integrated with sub-steps.

**Throw solver.** Given a release point, a target point and a flight time `T`,
start from the drag-free solution `v0 = (Δ − ½gT²)/T` and correct it by
shooting (simulate → measure miss → adjust) until the miss is < 0.05 yd. The
QB chooses `T` (bullet vs. touch) subject to his arm's maximum release speed.

**Throw error.** Launch direction, elevation and speed are perturbed by a
Gaussian whose σ grows with distance and shrinks with the relevant accuracy
rating; pressure (composure), throwing on the run, off-platform mechanics and
fatigue widen it.

---

## 6. Play simulation

### 6.1 Tick loop (20 Hz)

```
for each tick:
  record snapshot into perception history
  for each agent: brain.update(ctx)      → intent (desired velocity, facing, actions)
  resolve actions (snap, handoff, pitch, throw, tackle attempts, block initiation)
  engagements: update block contests (force/leverage/win progress, sheds)
  integrate free bodies (traction ellipse) and engaged pairs (force balance)
  resolve collisions (soft separation of overlapping bodies)
  ball: carried → follows carrier; in flight → physics; loose → bounce/roll
  catch contests when ball reaches catch envelopes
  tackles: wrap-ups, drive, bring-down, fumbles
  whistle checks: down by contact, out of bounds, touchdown, safety, incomplete
  record frame (for replay)
```

### 6.2 Perception

A ring buffer stores world snapshots. When agent *A* looks at opponent *B*,
it receives *B*'s state at `t − rt(A)` dead-reckoned forward by `rt(A)` using
the stale velocity. Teammates and the ball carrier's own blockers are read
with a short delay. Effects:

* **Route breaks:** when a receiver plants, the defender keeps "seeing" the old
  stem for `rt` seconds and keeps drifting — separation emerges from
  route-running sharpness vs. reaction time vs. agility.
* **Anticipation:** man defenders observe a stable receiver stem before reducing
  reaction delay. An observed break resets that benefit; anticipation never
  reveals the called route or removes latency entirely.
* **Ball in the air:** defenders not facing the QB need extra time to locate the
  ball; zone defenders reading the QB's eyes (anticipation) break early.

Snapshots include visible stance and facing, so those cues have latency too.
Each agent's `SnapMind` adds coherent snap readiness/precision and dynamic focus,
stress and urgency. Fatigue, visible congestion/contact and an optional brief
attention lapse change latency and execution; finite decision intervals hold
fits between reads. Pattern readers can hesitate and recover without changing
their called technique. These parameters remain uncalibrated hypotheses. See
the [implementation review](../reviews/run-blocking-and-decision-update.md) for
scope, remaining information shortcuts and paired results.

### 6.2a Game sense: reading run and pass (`src/sim/recognition.ts`)

No defender is told the play. Each brings an **expectation** into the snap —
the NFL pass rate for the situation (2022 Big Data Bowl labels), shifted by
personnel, QB alignment, empty sets and tempo, and by the defense's in-game
scouting of this offense — and weighs it by his **game sense** (play
recognition, awareness and experience). Low game sense plays every snap
closer to fifty-fifty.

After the snap he reads **visible cues** through his perception delay, keyed
by position: blockers' pad level (up in a pass set, low firing out), the line
giving ground or moving people, a pulling guard, the QB dropping past the mesh
or riding it, the back's path, receivers releasing or closing to block, the
blocker in front of a lineman, and finally the handoff or the throw. Evidence
is filtered over time (faster with recognition) with a per-play lean, so
misreads are coherent rather than flickering. He **commits** to run or pass
when he's convinced and an actual cue agrees; changing his mind takes
stronger evidence. Until he commits, an underneath defender only eases into
his drop. Play action works through the same cues — the back rides the mesh,
the QB fakes, the line shows a low, aggressive look — and works best when the
defense expects run; a draw shows pass sets first.

**Learning:** each side keeps a scouting memory through the game. The
defense learns the offense's run/pass mix by situation and formation; the
offense learns the defense's coverage mix and how often its pre-snap shell is
a disguise, which feeds the QB's coverage prior. Both are shrunk toward
league habits so a few snaps don't give a team away, and sharper players use
more of what was learned.

### 6.3 Behaviors

Each agent's brain is a state machine chosen by its assignment and switched by
play events (handoff, throw, catch, turnover, ball crossing the LOS).

| Behavior | Summary |
|---|---|
| **Quarterback** | Snap → drop (3/5/7-step or gun) or play-action fake → progression reads in concept order with timing → evaluate each target's throw window → throw / check down / hitch / climb pocket / scramble / throw away / take sack. Pocket presence governs sensing pressure. |
| **Route runner** | Release (beat press via release vs. press contest) → stem → break with speed governed by route-running and the traction ellipse → option-route conversions vs. man/zone → settle in zone windows → track ball to its predicted landing point → after catch becomes ball carrier. |
| **Pass blocker** | Kick/vertical set to a protection point between rusher and QB; mirror rusher; engage; anchor; pass off twists. Slide/man/BOB protection assignments. |
| **Run blocker** | Zone ownership accounts for down threats before combinations; gap down blocks reserve one trap/kick target and cover pulling-guard responsibility. Combinations read control, leverage and backer flow before one member climbs. Pull/lead paths clear the line. |
| **Pass rusher** | Choose a plan from ratings & blocker set: speed rush (arc), bull rush, swim/rip/spin; counter moves; contain duties; stunts. |
| **Run defender** | Gap assignment from front (A/B/C/D, 1-gap vs 2-gap), read keys (blocker's helmet), squeeze, spill vs box, shed and tackle. |
| **Man coverage** | Press/off/bail technique; inside/outside leverage; trail/in-phase; mirror receiver via perceived (delayed) state; play through hands. |
| **Zone coverage** | Two techniques, chosen per call. Spot drop ("country" zone): sprint to the landmark, settle facing the QB, lean where he looks, squeeze the lane of a receiver in the zone without following him out, and start the break on his arm action. Pattern-match: drop with eyes on the QB, wall and carry verticals through the zone (curl-flat to ~10 yards, hook to ~13), pick up whoever enters it. A defender who misses a match rule plays spot. Named match rules (Cover-3 Rip/Liz, Quarters MOD/MEG and reading #2, Cover-2 corner sink, trips Poach) are planned. |
| **Ball carrier** | Sample headings against observed defender reach and teammate obstruction; press or abandon a closed aiming point, pace a lead entering ahead while safe, then burst. Turn shoulders for narrow passable openings with finite posture transition and movement cost. |
| **Pursuer** | Compute intercept point using time-to-reach against the carrier's anticipated path, with a per-play angle bias from the pursuit rating and inside-out leverage; break down and mirror in the open field (§6.5). |

### 6.4 Trench model (blocking engagements)

A block is a physical, technical rep, not a single dice roll. Each engagement
tracks state that line coaches would recognize (`src/sim/engagement.ts`):

| State | Meaning |
|---|---|
| **control** (−1…+1) | Hand position. +1: blocker's hands inside and latched, steering the defender. −1: defender's hands inside on the blocker's chest, or the blocker's hands knocked away. |
| **phi** (−1…+1) | Defender's angular progress around the blocker relative to the line the blocker must protect (QB for pass pro, drive axis for runs), in units of 90°. 0 = square, ±1 = hip to hip, beaten. |
| **base** (0–1, each side) | Balance. Lunging at a missed punch, over-setting, being driven or yanked all cost base; it recovers with balance and footwork. A blocker with no base is beaten. |
| **pad level** | Leverage from height, bend and fatigue; the low player wins the push, and losing the push stands you up. |

Per-player trench traits are derived once from measurables and ratings: pad
height, bend, hand quickness, arm length (inches), engaged lateral quickness,
footwork, balance and recognition.

* **Contact.** The rusher's momentum converts to power (speed-to-power) against
  the blocker's anchor. A punch exchange (hand technique, arm length, timing,
  or a swipe/chop that makes the blocker miss) sets initial control and base.
* **Every tick.** A *lateral battle* (the defender's lateral burst toward the
  side it wants vs. the blocker's mirror, scaled by footwork × base ×
  control, much stronger on a double team) moves phi. A *push battle* (power ×
  leverage × base × control) moves the pair: pocket push, drive blocks,
  anchors, re-anchors.
* **Moves are chosen from the state.** Inside counter vs. an over-set, snatch
  vs. a lunging blocker, rip/club vs. latched hands, dip-and-bend once even,
  bull or long-arm vs. a high-pad or light blocker, spin when stalled. Success
  is `logistic(skill − counter + situational bonus − control)`, where skill
  uses the matching ratings and physical traits (arm length, bend, agility,
  strength) and counter uses the blocker's recognition and technique.
* **Outcomes.** Shed when |phi| ≥ 1 or the blocker's base collapses; the
  defender comes off with its momentum intact. Holding becomes likely when a blocker
  is beaten with hands still latched (discipline reduces it; officials see a
  fraction).
* **Run reps** use the same state with a drive axis and a *seal target*
  (keep the defender on one side of the aiming point). Defenders attempt to
  shed when the carrier comes near, with success depending on control, seal
  and the shed skill. Double teams add helpers who contribute push and
  mirror until one climbs.

`scripts/trench-lab.ts` isolates pass-pro reps (QB holds the ball) and reports
win rates, pressure timing and sack timing by matchup.

### 6.5 Pursuit and tackling

**Pursuit angles** (`pursuitPoint` in `src/sim/behaviors/common.ts`):

* Tracking an identified carrier uses a short visuomotor delay (0.12–0.24 s by
  awareness), not the full recognition reaction time.
* The pursuer anticipates the carrier's path: acceleration toward top speed
  and a bend upfield. Anticipation sets how much the pursuer trusts that
  prediction vs. the current heading.
* Each pursuer carries a per-play **angle bias** drawn from the pursuit
  rating. Poor pursuers aim where the carrier will be a beat early (a flat
  angle that ends up trailing); good ones lead the carrier.
* **Leverage**: pursuers shade inside-out, more so near the sideline (which
  becomes an extra defender) and more for disciplined pursuers.
* **Open-field break-down**: inside 4–8 yd (by tackling) when the carrier is
  coming at the defender, the defender stops sprinting, mirrors the carrier's
  lateral movement square-on and makes the carrier come to the tackler.

**Tackling** (`src/sim/tackle.ts`): contact within arm reach (plus a lunge
zone once the play has developed) lets a defender attempt a tackle. Attempt
quality `q` depends on distance, angle and whether the defender is under
control; patient tacklers wait for a better shot while closing. A defender
can't tackle through a blocker (occlusion corridor), and engaged defenders
need to be winning their rep. Miss chance comes from elusiveness vs. tackling,
open field, overrun speed and attempt quality; break chance from power vs.
tackling, mass difference and arm vs. wrap. Diving attempts are a last resort
(trailing, or the carrier separating). A successful wrap creates a **tackle
bond**: tacklers apply stopping force, the carrier drives with leg strength,
helpers join the pile; yards after contact and gang tackles emerge from that.
Fumbles roll from hit power, number of tacklers and ball security.

### 6.6 Catch contests

When the ball passes through a player's catch envelope (horizontal `reach`,
height up to `maxCatchHeight`), the player attempts to catch or play it.
Contest inputs: receiver hands/contestedCatch/ballTracking, catch difficulty
(reach extent, ball speed, body speed), defender proximity and whether the
defender is *facing the ball* (in-phase vs. trailing), height/arm length
advantage, defender ballSkills. Outcomes: catch, drop, pass breakup,
deflection (ball continues with new velocity — tipped picks happen
physically), interception.

---

## 7. Playbook

### 7.1 Offense

* **Personnel:** 10, 11, 12, 13, 21, 22, 20 (RB count, TE count).
* **Formations** place roles (X, Z, Y, H, F, RB, QB, five OL) with splits,
  depth, on/off-ball, and backfield set (gun, pistol, under center, I, offset).
* **Receiver numbering** is resolved after alignment (#1 outermost on each
  side), and the formation's *strength* (passing strength vs. TE side) is
  computed.
* **Pass concepts** are defined per receiver number and side (e.g. *Smash:
  #1 hitch 5, #2 corner 12*; *Stick: #1 go, #2 stick 6, #3 flat*; *Mesh: two
  shallow crosses + corner + wheel*). Each includes protection (5/6/7-man), QB
  drop, and a read progression.
* **Run concepts:** inside zone, outside (wide) zone, power, counter, duo,
  trap, toss/pin-pull, draw, QB keepers; plus play-action pairs (boot, PA deep).
* **Routes** are templates in a *receiver frame* (forward = downfield,
  inside/outside relative to the sideline), each with waypoints, break speeds
  and option rules.

### 7.2 Defense

* **Personnel:** base 4-3 / 3-4, nickel (4-2-5), dime (4-1-6), goal line.
* **Fronts:** 4-3 Over/Under, Tite (3-4 4i-0-4i), Odd, Wide-9 nickel, Bear.
  Alignment uses **technique numbers** relative to the OL and flips to the
  formation's strength.
* **Coverages:** Cover 0, Cover 1 (man-free, robber), Cover 2 (zone, man,
  Tampa 2), Cover 3 (sky/buzz, match), Cover 4 (quarters), Cover 6.
* **Pressures:** fire-zone blitzes, A-gap mugs, edge pressures, DB blitzes,
  simulated pressures; stunts (T-E, E-T twists).
* **Matchups:** man assignments by rule (#1↔CB, #2↔nickel/S, backs↔LB) with
  coach overrides — shadow the best receiver with the best corner, bracket a
  star, put the big safety on the tight end.

### 7.3 Defensive alignment adapts to the offense

1. Identify strength (TE side, else passing strength, else field side).
2. Set the front relative to strength.
3. Corners align to #1s; nickel to the slot; safeties to the shell; linebackers
   over the box. Box count falls out of the formation: spreading the offense
   *physically* removes defenders from the box.
4. Assign man responsibilities and zone landmarks after alignment.

---

## 8. Game layer

* **Game state:** quarter, clock, possession, down, distance, ball spot, score,
  timeouts, two-minute warning, play clock.
* **Clock rules:** stops on incompletion, out of bounds (late in halves),
  scoring, change of possession, penalties, timeouts; runoff between plays from
  offensive tempo (huddle, no-huddle, hurry-up, milking).
* **Special teams:** kickoff (2025 dynamic-kickoff landing zone; touchback
  to the 35), punts (hang time and distance from ball physics; fair catch vs.
  return), field goals/PATs (kick trajectory must clear the crossbar inside the
  uprights), 2-point tries.
* **Overtime:** 10-minute period, both teams guaranteed a possession.
* **Coordinators:**
  * Offense chooses personnel, formation and concept from situation (down,
    distance, field zone, score, time), scheme identity, *personnel strengths*
    (concept suitability scored from the players who would run it) and
    *in-game learning* (a bandit over concept families vs. the opponent's
    looks).
  * Defense chooses personnel response, front, coverage and pressure from
    situation, opponent tendencies and its own personnel (great corners →
    more man; elite rush → fewer blitzes).
  * Head coach: 4th-down/2-point decisions from an expected-points model and
    aggressiveness; clock management; timeouts.
* **Personnel & fatigue:** depth charts by role suitability; DL and RB rotation
  driven by energy; packages per personnel grouping.
* **Rules/officiating:** false starts and offsides (discipline, crowd noise),
  holding (from engagements), DPI/OPI (contact while ball in air), roughing,
  accept/decline logic.
* **Stats:** full box score and advanced metrics (air yards, aDOT, YAC, time to
  throw, pressure, separation at target, yards before/after contact, missed
  tackles, EPA).

---

## 9. League layer (Phase 5)

32 fictional teams; 53-man rosters; contracts and salary cap; free agency;
the draft with combine-measurable prospects and scouting uncertainty; player
development with per-attribute age curves, potential, training focus and
playing time; injuries with recovery timelines; morale and chemistry
(QB–WR timing trust); coaching staff with scheme preferences.

---

## 10. Calibration targets (NFL, approximate recent league averages)

| Metric | Target |
|---|---|
| Points per team-game | 21–23 |
| Offensive plays per team-game | 61–65 |
| Completion % | 63–66% |
| Yards per attempt | 6.8–7.2 |
| Sack rate (per dropback) | 6–7.5% |
| INT rate | 2.0–2.5% |
| Rush yards per carry | 4.1–4.5 |
| Run stuff rate (≤ 0 yds) | 16–20% |
| 10+ yard runs | 10–12% |
| 20+ yard completions (per attempt) | 7–9% |
| aDOT | 7.5–8.5 yds |
| YAC per reception | 4.8–5.6 |
| Average time to throw | 2.7–2.9 s |
| 3rd-down conversion | 37–41% |
| FG % | 83–87% |
| Fumbles lost per team-game | 0.4–0.7 |

The calibration script prints simulated vs. target with a pass/fail band so
tuning is measurable.

---

## 11. Determinism & performance

* `Rng` is a seeded xoshiro128** generator; plays derive child streams from
  `(gameSeed, playIndex)` so any play can be re-simulated in isolation.
* 20 Hz tick, 22 agents, ~6 s plays → ~2,600 agent-updates per play. Target:
  a full game in well under a second on one core; a 272-game season in a few
  minutes or less.
