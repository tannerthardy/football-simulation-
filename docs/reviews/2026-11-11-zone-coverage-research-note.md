# Zone coverage research note (Tanner, 2026-11-11)

Provenance: research note supplied by Tanner on 2026-11-11, committed verbatim below as a source for the coverage-rule audit (Rules + Coaching) and Defense's zone work. Tanner's instruction: use it as a guide or inspiration, not to follow blindly. Its code review is of the default branch at `3b5bf9b9` (Oct 8), not develop; verify each code claim before acting. Checked on develop 3e38b6e4 by Coverage:

- The per-tick `sim.rng.next()` in the deep defender's route-break decision is **not** on develop (the deep pattern read is a deterministic focus x playRecognition gate).
- The same per-tick-lottery pattern **is** live in `playObservedFlight` (`src/sim/behaviors/defense.ts`, the `'look'` dice): re-rolled every tick near the ball's path, so almost every nearby defender is "looking" within ~0.5 s whatever his ball skills; it feeds `facingBall()` for PBU/INT. Coverage owns the fix (queued after the flat fix).
- "Match rules are planned": they exist (`CoverageDefender`, `MatchRule`, `job`); the corner-over-the-catcher excess runs through man-match jobs under Palms / Cover 3 Match / Quarters.

---

# Zone Coverage: Why NFL Defenders Close So Quickly — Research and Simulation Implementation Blueprint

**Prepared:** November 11, 2026  
**Project:** `tannerthardy/football-simulation-`  
**Scope:** anticipation, pattern recognition, threat distribution, zone positioning, transitions, break timing, ball flight, and post-catch rally.  
**Status:** research-backed engineering design; **not** a claim that the proposed changes have been implemented or calibrated.

---

## Executive conclusion

**NFL defenders rarely win the race to a completion by waiting for the ball to be thrown and then reacting faster. They win by reducing how much recognition and travel remains when it is thrown.** They use pre-snap formation and down/distance, route stems, receiver numbering, timing, quarterback mechanics, their own leverage, the presence of other receivers, and teammate calls to anticipate *which windows can open*. Their drop is not simply a trip to a location: it is a moving, leverage-preserving attempt to constrict the offense's next viable throw. When a specific route/throw declares, they already have their weight, hips, feet and angle arranged to close.

This requires **four different clocks** in the simulator:

1. **Threat recognition:** which receiver/concept is becoming dangerous? Can start before the throw.
2. **Commitment/trigger:** when is evidence sufficient to drive, carry, pass off, trap, or stay deep? Can start before the throw, but carries risk.
3. **Physical transition:** braking, planting, redirecting and accelerating from the defender's real body state.
4. **Ball-flight convergence:** how efficiently the player attacks a reachable interception/contest point once the trajectory is observable.

Faster defender top speed or a uniform reaction-time discount does not solve (1)–(3). Conversely, a defender who always knows the selected receiver, future route, or exact ball endpoint before observable release cues will look superhuman and ruin double moves, high-lows and quarterback manipulation.

**Primary recommendation:** implement a *coverage-specific threat/assignment and commitment layer* ahead of the existing movement physics; give it persistent state, imperfect observations, rule-based pass-offs and probabilistic-but-coherent recognition, followed by a physically admissible break command. Add frame-level timing diagnostics before tuning any speed coefficients.

---

## 1. What the coaching literature actually says

### 1.1 The fundamental distinction: spot drop, match, and true man

Traditional spot-drop zone emphasizes protection of a landmark and quarterback vision; its strengths include defenders seeing the throw and rallying, while its weaknesses include seams between landmarks and well-timed route combinations. **Match zone** starts with zone spacing but converts into route-specific responsibilities according to the releases of numbered eligible receivers. It is neither pure grass guarding nor fully man-to-man throughout the snap.

The influential Saban/Belichick Rip/Liz solution was developed partly because conventional Cover 3 could not reliably defend four vertical threats simply by waiting to break on the throw. In a match version, a curl/flat or seam player may **carry #2 vertical**, while other defenders sort the remaining releases. This is an assignment solution to a geometric problem, not simply an athletic upgrade [1][2][3].

**Critical sim implication:** before asking a hook defender to break faster on a dig, determine whether that defender should have been walling a seam, carrying #3, sinking beneath #1, or passing off an under route. Improving closing speed while assigning the wrong route can make the defense both less realistic and more vulnerable to busted leverage.

### 1.2 Read the distribution, not five unrelated dots

Coaching systems use receiver numbers (#1 widest, #2 next inside, #3 next), release classification (vertical, under, out, back), and communications such as an **under call**. These rules compress a high-dimensional scene into a handful of choices: *If #2 crosses shallow, who takes him, who becomes hook, and who protects #1?* Alabama-derived Rip/Liz explanations describe this explicitly; responsibilities change when #2 declares underneath [2].

A defender need not recognize a specific named play to play intelligently. The essential primitive is **route distribution**: vertical count, inside/outside release, final #3, and which routes threaten the defender's seam, curl or flat. Recognizing a common concept such as Smash improves that process but should be optional.

### 1.3 Read keys are contextual; “always watch the QB” is wrong

For some spot-zone drills, defensive backs read quarterback eyes and shoulders, then plant on release [4]. In a match technique, however, the defender may have to key #2's release and carry him, losing uninterrupted QB vision. Against good quarterbacks, eyes alone are manipulable. A defender instead uses an **eye discipline policy** based on phase and responsibility:

- **Pre-snap:** alignment, splits, backfield, formation, down/distance, route propensity.
- **Early post-snap:** primary key (often a receiver's release, uncovered lineman, QB drop, or run/pass read), plus peripheral nearby threats.
- **Developing routes:** stems and route distribution; maintain leverage on assigned threat while retaining QB information where possible.
- **Throw:** QB shoulder/arm/feet/launch, receiver hands and head, then the visible ball path.

The Saban clinic explanation also gives a useful run/pass read: linemen who penetrate the line of scrimmage indicate run, who retreat indicate pass, and who bump it can indicate play action [2]. This is an illustrative coaching key, not a universal unambiguous classifier.

### 1.4 Footwork makes a good read actionable

Defensive back drills teach a low, balanced pedal; avoiding a false step; planting within the body's frame; opening or redirecting hips; and then driving through the target. One published DB coaching discussion emphasizes moving from a pedal to an effective break without unnecessary preparatory foot fire, with the transition executed in roughly two steps as a **coaching goal**, not a universal measured NFL duration [5]. A separate clinic outlines a tilt–point–drive hip transition [6].

The sim's traction ellipse is the right foundation. It should *not* get bypassed by an arbitrary instant lateral launch. But its high-level command should model distinct **movement modes** (pedal / shuffle / weave / bail / speed turn / downhill drive / gather-to-tackle), and preserve plant-foot and hip orientation effects. A defender already half-turned toward the likely window can close much sooner without having a higher maximum speed.

### 1.5 Anticipation comes with mistakes

Route recognition and quarterback cues should produce earlier decisions **sometimes** and false jumps **sometimes**. A corner who drives every hitch is beaten by hitch-and-go; a safety who steals a glance at the first in-breaker can lose a post behind him; a curl/flat player who expands immediately can vacate the seam. High recognition should increase the *quality and calibration of evidence*, not provide omniscience.

---

## 2. A useful model of “fast closing”

Decompose each defended target into a state timeline. Let

- `t_threat` = first frame when a relevant receiver becomes a legitimate threat, given that defender's responsibilities;
- `t_key` = first frame a diagnostic cue becomes *observable* to that defender;
- `t_commit` = first persistent decision to drive or attach to that threat;
- `t_release` = quarterback's true release;
- `t_motion` = first frame defender's velocity measurably rotates toward the correct lane;
- `t_arrive` = arrival at ball path, catch point or tackle leverage;
- `t_ball` = actual ball arrival.

Then separately evaluate:

**Pre-release anticipation** = `t_release − t_commit`. Positive values indicate a legal pre-throw commitment, but should only be counted when the decision used observable keys and respected the defender's coverage job.

**Post-release orientation delay** = `t_motion − t_release`. May be negative when a defender has begun an anticipatory break. This is not equivalent to neural reaction time; it includes movement inertia and tactical choice.

**Travel/transition delay** = `t_arrive − t_motion`, conditioned on starting distance, velocity and body facing.

**Contestation margin** = `t_ball − t_arrive`. Positive means an opportunity to get there before arrival; negative means a late defender, although he may still contest through the catch or tackle immediately.

A conceptual decomposition of successful closing is

`effective_closing = assignment quality + prethrow positioning + cue recognition + decision timing + body transition + trajectory selection + acceleration`.

These terms interact. A defender two yards nearer the correct passing lane with downhill-ready feet can outperform a faster player who rotates late or runs to the receiver's *current* location.

### A critical physics sanity check

At 20 Hz, one simulation tick is **0.05 seconds**. A 0.25-second decision delay is five ticks. At 6–8 yards/second of actual running speed, that corresponds to 1.5–2.0 yards of potential travel **only in a crude constant-speed thought experiment**; real closing includes acceleration and turning. Do not treat this as a measured NFL reaction benchmark. It demonstrates why an extra few frames can make a zone defender appear absurdly passive.

---

## 3. What the repository currently does, and why it may still look slow

**Inspected sources on repository default branch** (GitHub search/fetch, November 11, 2026):

- `src/sim/behaviors/defense.ts` — `ZoneCoverage`, `sawThrow`, `playBall`, man behavior.
- `src/sim/behaviors/common.ts` and physics/reach are referenced by coverage.
- `docs/DESIGN.md` — intended architecture, 20 Hz loop and perception model.
- `scripts/zone-style-lab.ts` — paired-seed spot versus match experiment exists.

This is a **focused code review, not a full audit of all coverage-related files or an executed benchmark**. Branches/PRs may contain newer experimental behavior.

### Existing strengths to retain

1. **Separate match/spot zone styles** rather than an indiscriminate radius chase.
2. **Perception lag** through `sim.see`, player ratings, and recognition / run-pass uncertainty.
3. **Real movement constraints**: facing, backpedal penalty, acceleration and cutting.
4. **Vertical carry and deep cushion** attempts; a deep defender considers other climbing routes before driving downhill.
5. **QB windup support** via `sim.windupAt`; spot zone can recognize arm action.
6. **Ball-flight target** using `catchSpot`, `timeToReach`, and an arrival fallback.
7. **Paired-seed experimental scripts**, which can be expanded into causal tests.

### Specific concerns to investigate first

| Priority | Current behavior observed | Why it may hurt realism | Suggested change |
|---|---|---|---|
| Critical | Underneath match threats are gathered by projected position within a broad lateral band; a nearest/weighted threat is selected | Proximity is not the same as a numbered receiver's role; assignments can switch for the wrong reasons | Stable route-distribution / match-assignment controller, with explicit handoff events |
| Critical | `sim.rng.next()` is used inside a deep defender's route-break decision every update | Repeated rolls can produce intermittent or eventual arbitrary drives across ticks rather than one coherent read | Draw once per identifiable cue/event; latch commitment, retain uncertainty and reversal cost |
| Critical | Spot defender may sprint to landmark and only then settle; early in-zone threats are secondary | Can vacate early throwing windows or take too long to settle and trigger | Speed-controlled zone drop with threat-based settle/expand, not unconditional landmark-first movement |
| High | A projected 0.7 s receiver position estimates threats | Fixed prediction horizon treats curls, screens, wheels, stems and double moves alike | A short-horizon belief distribution over route continuations, not just linear extrapolation |
| High | Deep defender selects deepest/nearest vertical and uses geometric cushion | No explicit formation/number-based ownership; deep zones can overcommit against layered patterns | Assign vertical ownership, divider/leverage rules, teammate help and route-count safety checks |
| High | Underneath `carryTo` is a broadly shared 10/13 yd cutoff | Real pass-offs are rule/coverage/route dependent; depth alone does not prove a handoff | Condition pass-off on next defender presence, number, leverage, route declaration and call |
| High | `sawThrow()` keys a broad facing test and reaction formula; early windup recognition only for spot style | Match players with true QB vision may fail to use release cues; defenders not seeing the arm may receive information too cheaply or too late | Perceptual view/cue pipeline distinct from assigned route tracking |
| High | Once `sim.ball.kind === 'air'`, zone can immediately call `playBall()` on recognition | A defender far from path may ditch zone responsibility to pursue a ball that cannot affect him | Contest feasibility + tackle/rally roles + teammate coordination |
| Medium | `a.tags` such as `settled`, `onBall`, `readArm` mark states | Tags are insufficient for explaining *when* a player recognized a specific route or why he committed | Event log with threat ID, evidence, confidence, mode and transition times |
| Medium | QB look is used to bias drop locations | Look-offs can move an entire shell too much, or bias the defender toward the final target oracle | Use noisy gaze/helmet cues and cap movement by assignment/vertical safety |

**Notable code-level distinction:** `this.target` in `ZoneCoverage` exists, but the inspected portions do not establish a robust, persistent route-to-defender assignment exchange analogous to Rip/Liz, Quarters MOD/MEG, Palms, Poach and push calls. `docs/DESIGN.md` itself describes named match rules as planned. This is probably more important than a generic `reactionTime` tweak.

**Potential recurring bug:** if a deep defender gets the route-break `react` roll anew every frame, an action with probability `p` per frame becomes almost certain after enough frames: after `n` independent checks, `P(at least one trigger)=1−(1−p)^n`. That is not how a defender reads a route. It must be made into a persistent inference/commitment event.

---

## 4. The missing intelligence: a coverage-specific state machine

Recommend distinct per-defender state, independent of rendering or the high-level movement call:

```ts
type ZonePhase =
  | 'align_and_disguise'
  | 'run_pass_key'
  | 'drop_and_scan'
  | 'wall_or_carry'
  | 'match_attached'
  | 'pass_off'
  | 'midpoint_two_threats'
  | 'trap_or_drive'
  | 'ball_in_flight'
  | 'rally_tackle'
  | 'recover_bust';

type CoverageMind = {
  phase: ZonePhase;
  primaryKey: 'qb' | 'number1' | 'number2' | 'number3' | 'line' | 'back';
  ownedReceiverId?: string;
  pendingHandoffTo?: string;
  threatenedLanes: Array<{ laneId: string; confidence: number; eta: number }>;
  hypotheses: Array<{ routeFamily: string; probability: number }>;
  confidence: number;
  committedAt?: number;
  evidenceAt?: number;
  lastTransitionAt: number;
  footwork: 'pedal' | 'shuffle' | 'weave' | 'bail' | 'plant' | 'drive';
  leverage: 'inside' | 'outside' | 'top' | 'under' | 'midpoint';
  observedCueIds: string[];
};
```

The **responsibility layer** should answer *what must I protect?* The **perception/inference layer** answers *what do I think is happening?* The **locomotion layer** answers *how do I get there without violating physical limits?* Keep these modular. One global `zoneCoverage` rating should not decide all three.

### 4.1 Event-driven evidence, not omniscient target selection

Examples of observable events:

- #2 crosses shallow under a scheme-specific threshold: possible UNDER/return call.
- #2 commits vertically past stem threshold: seam carry obligation.
- #1 throttles/stems and shoulders rotate inward: possible curl/dig, conditional on deep protection.
- A receiver's velocity and torso indicate a break; confidence changes across successive observed frames.
- QB ends drop, sets base and transitions into throw: release likelihood rises; actual target still uncertain.
- QB eyes/head point left: weak evidence of throw direction, not certainty.
- Teammate passes a route or communicates help: assignment changes *after communication/processing delay*.
- A route disappears behind a player/occlusion: belief confidence decays rather than tracking it perfectly.

Do not feed the agent future offense waypoint data, play concept ID, true target selection, true future catch point, or unrevealed quarterback intention. The defense can know scouting tendencies and its **own called coverage**, not the offense's hidden plan.

### 4.2 Sticky decisions and mistake mechanics

Decision scores should accumulate with hysteresis rather than randomize every tick:

```text
belief_t = decay * belief_(t-1) + new_visible_evidence
if phase == scan and P(route_under | evidence) > enter_threshold:
    phase = pass_off_or_drive
if phase == drive and P(route_under | evidence) < exit_threshold:
    begin_recovery_transition
enter_threshold > exit_threshold
```

High-recognition players: better priors, informative cues weighted properly, fewer false alarms, lower but nonzero latency. Low-recognition players: later attachment, more mistaken classification, slower handoff, occasional eye discipline errors. A busted player should fail in a football-shaped way—e.g., carry the wrong seam or open hips the wrong way—not silently switch his entire coverage to spot mode every time.

---

## 5. Build an actual route-distribution engine

### 5.1 Local numbering and threats

At snap, identify #1/#2/#3 on each side; handle motion, bunch, stack, trips and empty. Classify releases and track **current** side after crossers. Maintain both *original numbering* and *current threat order*. The final #3 may come from across the formation or backfield; Rip/Liz clinic material explicitly treats this as consequential [2].

Minimum route categories from observations: vertical, inside-under, outside-under, out, in-break, settle, wheel, back release, block/no-release. Classifiers update with time and confidence. Do not hardcode route names when a pattern can be recognized from observable geometry.

### 5.2 Coverage families should be rule data, not one universal radius

The following are **illustrative rules to implement as coverage-specific tables**; terminology and thresholds vary significantly by coaching system, so do not treat them as universal playbook doctrine.

| Family | Essential read | Behavior needed for quick, realistic closing | Key failure case |
|---|---|---|---|
| Spot Cover 3 | landmarks, QB set, route entering zone | overlap windows and drive on released ball; preserve deep 1/3 | curl/flat or seam high-low |
| Rip/Liz Cover 3 match | #2 release / vertical, final #3, under call | carry seam; communicate UNDER and replace inside; drive downhill only when vertical account is safe | four verticals and wheel |
| Quarters / MOD-style | #2 vertical vs under/out; #1 vertical threat | safety attaches #2 or helps #1 by rule; corner holds vertical before driving hitch | Mills/post-dig and double moves |
| Palms / 2-read | #2 out/under vs vertical | corner can trap #2 out under proper #1 / safety rules | #1 vertical + #2 wheel |
| Cover 2 / cloud | #1 release, #2 to half, sink and reroute | squat corner drives short throw with half-field help, but must sink under hole shot | corner route behind CB |
| Tampa 2 | seam threats, MLB run-through, two deep halves | middle runner gains seam depth early; underneath force/checkdown triggers | middle seam and crossers |
| Cover 6 | quarter side versus half side | asymmetric route distribution and leverage by half | flooding the weaker side |
| Trips poach / special | #3 vertical and backside involvement | safety poaches threat while others adapt; honest communication delay | 3 vertical / crossers |
| Fire-zone 3-under/3-deep | replacement zones after pressure | hot window recognition and fast trap/hot coverage with proper vacated zones | quick hot throw into replace window |

Do not implement all these simultaneously. **First get one specific Cover 3 match family right** and compare it with spot Cover 3 using identical offensive concepts and physical ratings.

### 5.3 Dynamic midpoint, not fixed geometric midpoint

A hook defender responsible for two threats should choose a location that limits the more dangerous **reachable throwing windows**, accounting for QB timing and route depth. A simple starting objective:

`score(position) = Σ_i [P_throw(i) * danger(i) * contestability(position,i)] − vertical_bust_penalty − movement_cost`

where `P_throw(i)` is a **prior inferred from observed cues, not actual QB target**, `danger(i)` accounts for route depth/field position, and `contestability` is a function of time-to-reach to the projected lane at possible release times.

This produces a zone defender who *cheats toward the dangerous route without abandoning the second threat*. It also explains why the defender may be further from a receiver but better positioned to eliminate the throw.

### 5.4 No free handoffs

Receiver assignment transfer should require an observable triggering route, a matching teammate who can accept responsibility, and delay for communication / mutual recognition. Store `coverageOwner(receiver)` and `helpOwner(receiver)` as distinct fields. On a temporary conflict, two defenders may cover one receiver or nobody may cover him—a plausible bust. In general, a linebacker must not magically know the safety has taken his vertical simply because the safety crossed a coordinate threshold.

---

## 6. Better cues for when to drive

Implement a **cue evidence ladder** instead of a global “ball is in the air” trigger:

| Cue | Earliest phase | Reliability | Best use |
|---|---|---|---|
| scouting/formational prior | pre-snap | weak-to-moderate | anticipation, preferred landmark and initial leverage |
| WR split/release and #2 direction | 0–1 s | moderate | identify relevant concepts, vertical ownership |
| WR stem speed, depth, hip/torso turn | during stem | moderate | narrow route family, move feet into good breaking posture |
| QB drop depth, set/hitch timing | near throw window | moderate | anticipate *when* a ball may come |
| QB shoulders/front foot/arm windup | final throwing motion | strong direction, imperfect destination | commit once legal read is sufficiently strong |
| Receiver eyes/hands | release/arrival | strong for near defender, possible late | ball location and catch contest |
| observed ball velocity/trajectory | after release | increasingly strong | intercept / contest target solve |

**Practical instruction:** quarterback *eyes* should be weaker evidence than consistent torso/foot/arm cues, especially against quarterbacks who intentionally look off defenders. Read keys can be intentionally masked and can conflict. Do not make one permanent ranking for all positions or technique types.

Introduce a `cueVisibility` value: head direction, body facing, route visibility, occlusion, distance, depth, attention allocation, and peripheral vision. A safety tracking #2 with hips turned should not gain the same immediate certainty of QB launch as a settled underneath hook defender facing the passer.

### Suggested inference architecture

At a manageable computational cost, track no more than 2–4 local route hypotheses per critical threat, updating at 5–10 Hz or at observed events. A lookup of coverage rule × threat release × QB cue is cheaper and more interpretable than a full planning search every 50 ms. The physics still updates at 20 Hz.

---

## 7. Movement and breaking: improve the *initial state*, not cheat acceleration

### 7.1 Footwork modes

- **Pedal:** preserve depth, QB/route vision, limited forward/sideways acceleration until transition.
- **Read/shuffle:** compact steps, shoulders square, can drive downhill with less turn penalty; less fast vertically than bail.
- **Weave:** gain depth and lateral displacement without a full body turn; preserve cushion.
- **Bail/open:** turns and runs to protect vertical; powerful deep movement but expensive downhill reversal.
- **Plant/drive:** decelerate and redirect based on current velocity, hips, footing and balance.
- **Speed turn/recovery:** used after wrong leverage or a double move; carries visible lost time.
- **Gather/tackle:** reduce approach speed for a credible tackle rather than fly past.

A simulated defender should **choose footwork based on plausible threats**. For example, when #2 has a credible vertical, an underneath defender must gain depth, but when #2 has definitively worked under and been passed off, he can square and drive on #1's curl with less reversal cost.

### 7.2 Desired movement versus physical execution

Use the locomotion controller to compute legal acceleration under existing friction/traction; do not directly set instantaneous full-speed vector on a break. Model pose and facing separately from velocity. Introduce a small *decision-to-plant* phase when current momentum points away from intended lane; reduce it when already in loaded shuffle/read posture.

A robust transition test records `(x,y)`, facing, velocity, desired velocity, acceleration, turn rate and assigned footwork at each frame. A defender who appears motionless for four ticks may be waiting on recognition; a defender who angles sideways for four ticks may be fighting a mechanical braking constraint. Those are different bugs.

### 7.3 Drive to *space*, not the receiver's current position

When the throw is likely, choose between:

1. **Undercut/intercept:** attempt ball path at reachable time, preserving interception angle.
2. **Contest-through-hands:** aim to arrive on catch-side shoulder and play the hands; not a magical interception.
3. **Limit YAC:** aim inside-out/upfield leverage and tackle near arrival if ball cannot be reached.
4. **Stay over top:** refuse to drive and abandon a dangerous vertical or double-move threat.

A defender can start with a throwing-lane interception point before launch based on uncertainty, but must recompute after real trajectory is seen. During flight, estimate visible ball state with delay and error. Do not give every defender the exact solver's final landing coordinates instantaneously at release.

---

## 8. Ball-in-air convergence and the difference between good outcomes and good process

NFL's 2025 Next Gen Stats materials describe improved frame-level **coverage responsibility**, rather than automatically assigning the defender closest to the target at arrival [7]. This matters directly to calibration: a safety may close excellently from help while a curl defender is responsible for giving up the window. The 2026 Big Data Bowl made predicting post-release player movement a central data task [8].

Several public Big Data Bowl writeups propose useful measurements:

- **REACT** studies the beginning of a safety's post-throw adjustment window and splits man and zone [9].
- **Reaction Phase / rCPA** attributes changes in expected completion probability from release to 0.5 s later [10].
- **Ball-Hawk Index** uses velocity alignment with the ball destination as an early movement metric [11].
- **Eraser Framework** stresses separation at release versus catch and attempts to score post-throw closing [12].
- **DCE** combines movement delay, path and convergence but includes methodological choices requiring caution [13].

**Evidence warning:** these are **competition submissions / exploratory writeups**, not universal NFL physical standards. Some make strong causal claims from observational associations. For example, straight-line path efficiency can unfairly penalize a safety preserving leverage or a defender tasked with a second vertical; measures using the true `ball_land` coordinate are valid for *offline grading* but **not** pre-throw AI inputs. Avoid importing an unverified “elite reacts in X milliseconds” constant from such projects. Use them as metric ideas, then establish defensible empirical distributions from the underlying NFL tracking data.

### Recommended frame-level metrics

1. `firstThreatEvidenceAt`, `firstThreatAssignmentAt`, `firstCommitAt`, `firstPhysicalBreakAt`, `throwAt`.
2. **Defender displacement and directional velocity** at release +0.1, +0.2, +0.3, +0.5 s; compare like roles and like distance-to-target.
3. **Signed destination projection:** `(v_def · unit(target−pos)) / |v_def|` where target is final offline-graded catch point; define zero-speed separately.
4. **Distance-closed curve** `d(0)−d(t)` and **separation reduction curve** versus nearest catch-side receiver.
5. **Trajectory efficiency**, but only after controlling for starting body facing, coverage responsibility and pursuit leverage.
6. **Contest margin** estimated under physically available acceleration, not just straight-line distance.
7. **Assignment integrity:** correctly carried verticals, timely UNDER/pass-offs, no uncovered final #3, and false jumps.
8. **Rate of immediate tackle opportunities** when a short pass is intentionally conceded.
9. **Team-level responsibility:** count which defender should have covered the window, who gave help, and whether multiple defenders chased the same target.
10. **Coverage-specific passing outcomes:** target selection, air-yard depth, completion, YAC, explosive rate and interceptions—after confirming tactical behaviors.

---

## 9. A concrete suite of paired film / laboratory experiments

Use the existing `scripts/zone-style-lab.ts` as a starting harness. For each case, use identical seeds and personnel, and isolate **A: current behavior**, **B: responsibility model only**, **C: + anticipation**, **D: + footwork transitions**, **E: full model**. Report distributions, not a handful of highlights; manually inspect worst decile and mismatched outcomes.

| Test | Offense / defense | What correct behavior should look like | Failure to detect |
|---|---|---|---|
| 1 | Curl-flat vs spot Cover 3 | hook/curl squeeze curl lane; flat defender expands; deep maintains top | all defenders blindly chase QB gaze |
| 2 | Curl-flat vs Rip/Liz | #2 under may trigger exchange; defender drives #1 only if vertically safe | under call ignored; seam uncovered |
| 3 | Four verticals vs match Cover 3 | seam player carries #2; FS routes to correct verticals | one extra vertical runs free by design bug |
| 4 | Smash (#1 hitch, #2 corner) vs Cover 2 | squat/flat player threatens hitch; deep half protects corner | corner drives hitch and abandons deep hole |
| 5 | Smash vs Cover 3 match | proper #2/under distinction; CB protects corner route | both DBs jump the hitch |
| 6 | Dagger / clear + dig | deep defender respects vertical clear; hook sinks beneath dig | false downhill read vacates post |
| 7 | Mills (post + dig) vs quarters | safety honors priority and help rules, not nearest dot | safety follows dig and loses post |
| 8 | Stick / spacing / hitch | underneath defenders square feet and close short throws without huge YAC | landmark overshoot / late arrival |
| 9 | Mesh/crossers | responsibility changes, traffic and communication respected | every zone defender transfers instantly |
| 10 | RB wheel from backfield | final #3 tracking / wheel ownership, no instant catch-up | defender stops carry at hard depth threshold |
| 11 | Hitch-and-go / sluggo | trigger sometimes creates an exploitable false step | all defenders infallibly stay over top or always bite |
| 12 | QB look-off then throw opposite | limited baiting; good player recovers but cannot teleport | helmet gaze acts like target oracle |
| 13 | Fast three-step throw | early lane positioning, without impossible catch-up after release | spot drop not settled before ball out |
| 14 | Play action shallow cross | realistic delayed run/pass conversion and hook vacancy | LBs automatically know pass before credible cues |
| 15 | Throw against zone weak side | help defender rallies to contest/catch/tackle by angle | only targeted defender reacts |
| 16 | Same target at 6-, 12-, 20-yard depth | progressive tradeoff between break opportunity and flight time | identical response curve at all depths |
| 17 | Two simultaneous verticals | deep help splits and delays downhill break | one-route greedy collapse |
| 18 | Bunch release with switch | pickup/exchange without arbitrary original-number confusion | receivers untracked when crossing bands |

**Film-review annotations:** for every rep, print the defender's assigned rule, relevant #, cue stream, current belief, `t_commit`, movement mode, head/facing, physical break, pass-off owner, distance to receiver and ball, and decision reason. Be able to pause at QB release and ask: *what did the defender legitimately know right now?*

### Quantitative acceptance gates

Do **not** choose synthetic NFL-looking reaction numbers before extracting empirical references. Instead require:

- Zero hidden offense-knowledge leakage in agent input tests.
- Deterministic decisions across identical seeds, with random draws at meaningful events rather than every tick.
- Correct responsibility on hand-authored route-release fixtures (including #2 UNDER, #2 vertical and final #3).
- No early downhill break that leaves an unowned active vertical threat, except explicit recorded busts.
- Faster *correct* drives on straightforward short routes **without** eliminating legitimate double-move vulnerability.
- Improvements in early closing conditioned on start geometry; no simultaneous inflation of every defender's acceleration.
- Better conditional YAC/contest timing without creating excessive picks, unrealistic pressure, or implausible completion rates.
- No substantial CPU regression; use low-frequency inference updates and event reuse.

---

## 10. An incremental implementation plan

### P0 — instrument before tuning

**Files/areas:** `src/sim/behaviors/defense.ts`, sim diagnostics/film export, `scripts/zone-style-lab.ts`.

Implement per-tick zone audit rows: `defenderId`, `zone`, `style`, `phase`, `primaryKey`, `observedThreats`, `ownedReceiver`, `eyeCue`, `belief`, `facing`, `velocity`, `desiredVelocity`, `commitReason`, `throwAt`, `ballLandOffline`. Add visuals for early break and pass-off. Save paired-seed CSV/JSON. Separate true world state used in graders from permissible agent observations.

### P1 — persistent threat ownership and no repeated RNG

Add a lightweight `CoverageMind` state; assign #1/#2/#3 by formation; introduce release events and rule tables for a single coverage family. Replace tick-by-tick route-read dice with persistent recognition evaluation. Distinguish `coverageOwner` from `helpOwner`. Verify no magical pass-offs.

### P2 — threat-driven positioning and legal pre-throw anticipation

Replace hardcoded nearest-to-landmark selection with route priority and local throwing-lane risk; teach defender to settle, midpoint, wall, sink and expand based on assignment. Fuse QB drop/set/windup with receiver break cues and explicit gaze uncertainty. Allow pre-release commitment only when evidence crosses a calibrated threshold and vertical obligations permit it.

### P3 — DB movement modes and ball-path decisions

Implement pedal, weave, shuffle, bail, plant and drive as locomotion intentions mapped to current physics. Introduce undercut versus through-hands versus YAC-containment roles. Use observed ball trajectory with progressive certainty, not exact future landing point as instant perception. Audit braking and false steps.

### P4 — route combinations, coverage families, communication

Expand from one Cover 3 match family to quarters, palms/2-read, Cover 2 and trips-specific calls. Incorporate handoff delay, bunch/stacks and overload/crossers. Add grading for clean technique and intelligent errors.

### P5 — NFL-relative calibration

Extract Big Data Bowl tracking samples and align frame times/roles. Use 2023/2024 tracking and 2026 contest writeups for metric approaches, but carefully inspect dataset scope and availability. Build role-by-coverage-by-route-depth matched distributions of first movement, distance-closed, orientation and contest impact. Tune inference only against movement and assignment diagnostics **before** calibrating global completion or YAC results.

---

## 11. Example algorithm for a curl/flat defender in match Cover 3

```text
At snap:
  know called Rip/Liz rules and own starting assignment
  identify local #1, #2, back; assign initial threat priorities
  establish first read key and likely drop/footwork

For each newly observed event (not every arbitrary physics tick):
  classify #2 release with uncertainty
  if #2 vertical and no legal handoff:
      remain attached / wall and carry, protect seam
  else if #2 under and exchange confirmed:
      communicate/receive UNDER, replace toward curl/hook responsibility
  else:
      midpoint threatened lanes, preserve top-down cushion

  update route beliefs for #1 and final #3
  update QB set/windup/gaze evidence if actually visible
  if threat_break_likely and own vertical obligations are safe:
      compare expected reward of drive vs stay/expand
      if score > commit threshold:
          commit to a short-horizon passing-lane target
          choose plant/drive according to actual pose

After throw is observable:
  classify reachable interception vs contest vs tackle
  resolve target from delayed observed trajectory
  use real acceleration/turn constraints and teammate leverage
  record first break time and reason

After catch:
  rally inside-out; adjust to carrier and nearby help
  avoid two defenders duplicating impossible angles
```

**Why this looks faster:** the defender can have established curl leverage, begun a plant on visible receiver/QB cues, and reduced the distance to the throwing lane *before the ball is in flight*. The physics engine then has less work to do. On the wrong read, he is out of position, producing exactly the vulnerability that makes real defensive football interesting.

---

## 12. Common shortcuts to reject

1. **“Reduce reaction time for all zone players by 40%.”** Makes them uniformly superhuman, masks assignment mistakes, and devalues play action and deception.
2. **“Tell the zone defender which receiver QB will target.”** Leakage makes coverage look smart while destroying actual anticipation.
3. **“Everyone sprints to the ball's exact landing point at release.”** True trajectory is not known instantaneously to distant players; many have a tackle or help job, not a catch-point job.
4. **“If a receiver comes near a zone, chase him.”** Breaks route distribution and spacing rules, especially versus switch releases, wheels and crossers.
5. **“Every defender watches the QB's eyes.”** Match responsibilities require receiver keys; gaze is gameable.
6. **“Faster reads never cause false positives.”** Removing false jumps erases double moves, pump fakes and concept conflict.
7. **“Grade every safety on straight-line efficiency to the completed pass.”** Coverage responsibility, leverage and unchosen threats matter.
8. **“Calibrate to one league-wide closing-time constant.”** Starting depth, player role, coverage, pass depth, route and move mode differ materially.
9. **“Fix the average YAC without film-level read instrumentation.”** You can get the right aggregate number for the wrong football reasons.

---

## 13. Research notes, quality assessment and source index

**Source hierarchy:** published clinics and specialist coaching sources for **rules/technique**; NFL/AWS documentation for **tracking/assignment methodology**; Big Data Bowl work for **possible metrics and hypotheses**; repository code for **what the sim currently does**. None of the public sources constitutes a definitive validation of every simulated parameter. Adapt all coaching rules to the chosen playbook, since identical nomenclature can differ across coaching trees.

### Coaching/coverage sources

1. Sports Illustrated, *Nick Saban's Revolutionary Impact on Football* (2024): origin and motivation for match coverage, four-verticals problem. https://www.si.com/college/2024/01/11/nick-saban-revolutionary-impact-football-will-live-on-retirement-alabama-crimson-tide
2. USA Football, *How to understand Nick Saban's pattern match Cover-3 defense*: Rip/Liz, UNDER calls, final #3, route-specific adjustments and linemen run/pass keys. https://blogs.usafootball.com/blog/5615/how-to-understand-nick-saban-s-pattern-match-cover-3-defense
3. Eleven Warriors, *Breaking Down: How Nick Saban and Kirby Smart Defend the Spread* (2014): pattern-match Cover 3 and seam carry. https://www.elevenwarriors.com/ohio-state-football/2014/12/46896/breaking-down-alabama-how-nick-saban-and-kirby-smart-defend-the-spread
4. ACTIVE, *The Zone Break Drill for Defensive Backs* (2013): QB read, plant and drive drill. https://www.active.com/football/articles/the-zone-break-drill-for-defensive-backs
5. American Football Quarterly, *Drills Report: Defensive Backs: Footwork, Block Protection, Tackling, and Ball Skills*: transition step and vision coaching. https://americanfootballquarterly.com/article/6108-drills-report-defensive-backs-footwork-block-pro/
6. Nebraska Coaches Association clinic PDF, *Developing Defensive Backs*: tilt-point-drive and hip transitions. https://www.ncacoach.org/uploads/DaberkowFB11-1.pdf
14. USA Football, *Setting the Front in Match Coverage: Man Free with Zone Principles* (2019): match rules and protection of the hole. https://blogs.usafootball.com/blog/7313/setting-the-front-in-match-coverage-man-free-with-zone-principles
15. Aire Athletics, *How Defensive Backs Break on the Ball Faster* (2026): read/preparation/false-step teaching perspective; coaching commentary, not quantified NFL league norms. https://aire-athletics.com/blog/how-defensive-backs-break-on-the-ball-faster

### Tracking analytics and research

7. NFL Next Gen Stats, *New advanced metrics for 2025*: new frame-level coverage responsibility and defender/receiver matching. https://www.nfl.com/news/next-gen-stats-new-advanced-metrics-you-need-to-know-for-the-2025-nfl-season
8. NFL Football Operations, *Big Data Bowl*: 2026 movement prediction competition context, 2023/24 tracking and 2025 outcome evaluation. https://edge-operations.nfl.com/programs-initiatives/innovation/big-data-bowl
9. Kaggle Big Data Bowl 2026, *REACT: Recognition & Early Adjustment Capability Time*. https://www.kaggle.com/competitions/nfl-big-data-bowl-2026-analytics/writeups/REACT
10. Kaggle Big Data Bowl 2026, *The Reaction Phase / rCPA*. https://www.kaggle.com/competitions/nfl-big-data-bowl-2026-analytics/writeups/an-introduction-to-rCPA
11. Kaggle Big Data Bowl 2026, *Ball-Hawk Index*. https://www.kaggle.com/competitions/nfl-big-data-bowl-2026-analytics/writeups/new-writeup-1763611523333
12. Kaggle Big Data Bowl 2026, *Eraser Framework*. https://www.kaggle.com/competitions/nfl-big-data-bowl-2026-analytics/writeups/the-void-engine
13. Kaggle Big Data Bowl 2026, *Defensive Convergence Efficiency*: exploratory composite; watch for score-design and causality limitations. https://www.kaggle.com/competitions/nfl-big-data-bowl-2026-analytics/writeups/defensive-convergence-efficiency-measuring-post-t
16. AWS, *NFL Next Gen Stats and AWS decode defensive coverage patterns* (2025): three related assignment/matchup/target responsibility models. https://aws.amazon.com/blogs/media/nfl-next-gen-stats-and-aws-decode-defense-coverage-patterns/
17. Kaggle Big Data Bowl 2026, *Window Shopping*: how defenses protect and close zones against layered concepts. https://www.kaggle.com/competitions/nfl-big-data-bowl-2026-analytics/writeups/new-writeup-1765756013794
18. Kaggle Big Data Bowl 2026, *Gap Closing Rate*: distance closing during ball flight. https://www.kaggle.com/competitions/nfl-big-data-bowl-2026-analytics/writeups/new-writeup-1764215994546

### Repository references (private; accessible through connected GitHub)

- `src/sim/behaviors/defense.ts`: https://github.com/tannerthardy/football-simulation-/blob/3b5bf9b9282aacc236e479bde7b5aaa2d69fb21f/src/sim/behaviors/defense.ts
- `docs/DESIGN.md`: https://github.com/tannerthardy/football-simulation-/blob/3b5bf9b9282aacc236e479bde7b5aaa2d69fb21f/docs/DESIGN.md
- `scripts/zone-style-lab.ts`: https://github.com/tannerthardy/football-simulation-/blob/3b5bf9b9282aacc236e479bde7b5aaa2d69fb21f/scripts/zone-style-lab.ts

### Explicit unresolved empirical questions

- How many frames before release do NFL zone defenders first commit to a hitch/curl, conditional on route and coverage? **Requires tracking + film annotation, not inferred from clinic rules.**
- How quickly do hook and curl/flat defenders reduce separation during the first 0.1–0.5 seconds of flight? **Extract role- and depth-conditioned distributions.**
- How much of the sim's observed problem comes from recognition vs starting body orientation vs physical cut limitations? **Needs debug traces and controlled simulation runs.**
- What is the appropriate rate of false pre-throw jumps for well-coached versus poor defenders? **Needs NFL reference film labeling.**
- Are repository default-branch behaviors the latest intended integration targets? **Verify active PR heads before applying patches.**

---

## Final recommendation

If only one architectural change is made, **replace “move toward the nearest receiver in my lateral zone, then react to the ball” with “interpret my receiver distribution and coverage rule, continuously protect the most dangerous legal throwing windows, and commit on an observed cue.”** Keep the existing physics. That is the most promising path to NFL-like zone defenders who appear to react and close faster **because they start correctly**, rather than because the game secretly gives them superhuman speed.
