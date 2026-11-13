# Moving Offensive Linemen: Run-Game Footwork, Puller Intelligence, Contact, and Simulation Checks

**Coaching-to-engine technical handbook | 17 October 2026 | For the football-simulation project**  
**Emphasis:** Power, Counter GT/GH/GY, Pin-and-Pull, Buck Sweep, Crack Toss, Trap, Dart, toss/sweep, moving zone and constraint plays.  
**Evidence basis:** Public coaching and film-study resources listed in [Sources](#sources-and-further-study), checked against the project's run-game implementation and review record.  
**Current-code reference when drafted:** [`develop@0000e560`](https://github.com/tannerthardy/football-simulation-/tree/0000e560e0dbe31905151465152d412ba838803d), 2026-10-17. This file is a **specification and teaching reference**, **not** an assertion that these techniques are implemented correctly on that commit.

> **Purpose.** An agent should be able to open any concept below and answer: What are the OL players trying to accomplish? What are their first two or three steps doing? What are their eyes/key, landmarks, contingency rules, movement and contact needs? What observations would prove a good or bad simulated rep? The agent should be able to turn the checks into isolated, deterministic scenarios without inventing automatic wins.

> **Non-negotiable interpretation rule.** Coaches disagree. An *open pull*, *flat pull*, *square/skip pull*, *lead pull*, *trap pull*, *wrap*, *kick*, *log*, *pin* and *reach* are **not interchangeable**. Two authentic installations can use different first steps or blocker distributions. The goal is to represent the **chosen installation** faithfully, not impose this document's example variant on every coach or team. If the concept has no explicitly selected installation, mark tests **N/A / undefined**, not fail.

## Contents

1. [The fundamental model](#1-the-fundamental-model)
2. [Footwork: how moving linemen actually move](#2-footwork-how-moving-linemen-actually-move)
3. [Getting around a tackle, then delivering a block](#3-getting-around-a-tackle-then-delivering-a-block)
4. [Concept-specific coaching and checks](#4-concept-specific-coaching-and-checks)
   - [4.1 Power O / Power with a wrap guard](#41-power-o--power-with-a-wrap-guard)
   - [4.2 GT Counter / Counter Trey](#42-gt-counter--counter-trey)
   - [4.3 GH, GY and other two-puller Counters](#43-gh-gy-and-other-two-puller-counters)
   - [4.4 Buck Sweep / Wing-T two-guard sweep](#44-buck-sweep--wing-t-two-guard-sweep)
   - [4.5 Pin-and-Pull sweep](#45-pin-and-pull-sweep)
   - [4.6 Crack Toss / Toss Crack](#46-crack-toss--toss-crack)
   - [4.7 Conventional Toss / Toss Power / Lead Sweep](#47-conventional-toss--toss-power--lead-sweep)
   - [4.8 Trap / Long Trap](#48-trap--long-trap)
   - [4.9 Dart / Tackle-lead run](#49-dart--tackle-lead-run)
   - [4.10 Outside / Wide Zone moving contact](#410-outside--wide-zone-moving-contact)
   - [4.11 Split Zone / Slice / Wham / Sift](#411-split-zone--slice--wham--sift)
   - [4.12 Jet / Fly Sweep with moving blockers](#412-jet--fly-sweep-with-moving-blockers)
   - [4.13 QB Power, Counter Read and Bash variations](#413-qb-power-counter-read-and-bash-variations)
5. [Common defensive reactions and coaching tradeoffs](#5-common-defensive-reactions-and-coaching-tradeoffs)
6. [The cross-concept simulation acceptance suite](#6-the-cross-concept-simulation-acceptance-suite)
7. [Instrumentation and proposed implementation interfaces](#7-instrumentation-and-proposed-implementation-interfaces)
8. [Experiments, benchmarks and agent handoffs](#8-experiments-benchmarks-and-agent-handoffs)
9. [Quick-reference glossary](#9-quick-reference-glossary)
10. [Sources and further study](#sources-and-further-study)

---

## 1. The fundamental model

### 1.1 What a moving blocker must accomplish

An offensive lineman on a pull does not merely receive a new `x, y` destination. He must **depart from a protected surface**, **clear real bodies**, **read a changing threat**, **arrive on a useful half of that threat**, **establish physical contact with support**, and **protect the runner's intended route for long enough**. Each is independently fallible. A player can get to the correct landmark but fail to strike; attach hands but fail to deny the runner's corridor; make an excellent kick-out while the runner cuts behind the wrong shoulder; or leave a double efficiently while abandoning an unsecured defender.

Use the following causal sequence for every review:

`installed responsibility → acquired cue → first step → clearance → route/eyes → attack half → approach speed/brake/turn → actual contact → useful path control → runner arrives → defender counter/recovery`

This sequence is a **measurement framework**, not a forced state-machine ordering. The lineman can acquire a defender during departure, feel contact while moving, turn or replace feet under load, and lose/reacquire an advantage within the same rep. A defender can legitimately win any stage.

### 1.2 Coordinate conventions for the simulator

Normalize trajectories before judging technique:

- **Longitudinal** `u = attackDirection * (x - LOS)`: positive downfield for the offense; `u = 0` is LOS; negative is the offensive backfield.
- **Lateral** `v = calledPlaySideSign * (y - ballY)`: positive toward the **called play side**, independent of strong/weak, left/right or the field's absolute `y` coordinate.
- **Backside** means against the called direction; **playside** means toward it. For a reverse or an option keep, distinguish the **installed blocking side** from the **actual ball side**.
- **First pull step** is measured after the individual player's legitimate snap-ready event; do not give the defense zero reaction time by changing the clock origin.
- **Hips / torso facing**, **travel heading**, **eyes/key**, and **contact-surface orientation** are different variables; do not assume the player must face his running direction or the defender at all times.
- **Release time** is when responsibility transitions, **departure time** is when achieved displacement begins, **contact time** is first actual load/impulse, and **useful block time** is the interval a protected runner route is actually denied to the defender. These are not synonyms.

### 1.3 What counts as success

Do **not** use “the blocker is engaged,” “the blocker has a `win` value,” “the defender was moved 1 yard,” or “the rush gained 5 yards” as sufficient proof of a good moving block.

A more defensible definition is conditional: Given the installed play, observed threats and attainable movement, did the blocker use a plausible technique to interfere with the assigned defender's **relevant path** while preserving the other assignments? The kick can be successful with modest displacement; the reach can be successful without a hook if the defender is ridden beyond the lane; the pull can be successful with a legal collision that impedes the defender; a runner can still be tackled by legitimate pursuit.

Record four distinct judgments:

1. **Coaching correctness:** assignment, first-step family, target/eyes, attack half and contingency fit the install.
2. **Execution quality:** player actually traveled, turned, braked, planted and applied force within capabilities.
3. **Tactical usefulness:** defender's route to the **actual, observable runner corridor** was delayed/redirected, not just the contact's nominal drive axis.
4. **Outcome:** runner arrival, first contact, yards before/after contact and terminal spot. This is an *effect*, not proof of the preceding causes.

### 1.4 A vocabulary for installing a play

| Part | Examples | Meaning |
|---|---|---|
| **Threat ownership** | down defender; kick defender; point LB; force DB; backside B-gap threat | Whom or what must be accounted for, including legal unblocked reads |
| **First action** | down; hinge; open pull; skip pull; lead pull; slice; arc | The initial movement responsibility |
| **Near landmark** | center's back hip; playside tackle's near hip; tight end's inside hip; cone representing EMLOS | A *reference for a route*, not a scripted path ignoring opponents |
| **Contact job** | kick; log; wall; seal; trap; wrap; cutoff; reach; stalk | What type of useful access is sought |
| **Conditional rule** | squeeze→kick; wrong-arm→log or coached kick continuation; scrape→match; penetration→collect | A practiced response, within acquired information |
| **Runner rule** | press down blocks; follow guard; read kick/log; bounce or insert | Runner response should be related to the blocks that actually occurred |
| **Fallback / loss** | redirect; recover; find near work; stop/absorb penetration; miss | Plays must allow imperfect execution and authentic defensive wins |

Do not hardcode `skip_pull` for every second-level job or `kick` for every first puller. Those are **installation choices**.

---

## 2. Footwork: how moving linemen actually move

### 2.1 The release: first 0.1–0.4 seconds

The first step changes the player's **support and orientation**, not just his velocity. The player is emerging from a loaded three- or two-point stance near neighboring teammates; the center and adjacent tackle are also moving. A good departure secures enough clearance while maintaining a route that can hit the threat in time.

A useful generic breakdown:

1. **Unload/open:** transfer weight to the support foot and move the opening foot toward the intended lane. An athlete cannot instantaneously face 90° and accelerate without an attainable angular and traction response.
2. **Clear:** avoid stepping into the center/guard's occupied space or the opponent driving into the vacated gap. A slight depth gain may be required; maximal depth is almost never the coaching goal.
3. **Accelerate:** run or shuffle according to the installed pull family while keeping head/eyes available to see the threat. The player should *not* repeatedly stop to point the torso at a waypoint.
4. **Reorient at the entry:** recognize where down blocks and a kick have left space, open or square the hips as appropriate, and prepare for first meaningful contact.
5. **Gather and strike:** avoid overrunning the moving linebacker or reaching from outside sustainable support. Strike with a physically available contact surface, then drive/recover/release under real load.

**Important:** These are intent/achieved landmarks. A 0.1 s or 0.4 s checkpoint below is a convenient diagnostic sample, **not** an NFL norm or a commanded deadline.

### 2.2 Flat/open/bucket pull — common first-level strike technique

**Coaching family:** A short opening or bucket step by the foot toward the pull, usually with meaningful hip opening and a route parallel/tight to the LOS. In some systems the first foot opens roughly 45°, in others closer to 90°; spacing and intended entry affect the angle. The lineman generally works toward a defensive lineman or edge force target he expects to meet from the inside. [S1][S2][S3]

**What his feet do:** The opening step clears his stance; the opposite foot crosses and runs down the LOS. The hips can rotate toward travel while eyes locate the target. As contact approaches, the player must redirect into the contact half instead of running blindly along the sideline. An arm rip is a teaching cue for turning and clearing the torso; don't convert it into an independent free impulse.

**When appropriate:** Counter kick, short/long trap, first Buck puller, some perimeter pulls. **When inappropriate as a universal response:** a Power insert may require more square shoulders to the LB, and a late shoulder-turn trap is not necessarily the best way to block an active scraping linebacker.

**Expected visible signatures:** prompt side opening; continuous down-line displacement; finite and justifiable depth; target discovery after clearing occupied inside bodies; last-step braking/correction before load; attack of the correct shoulder. A big lateral displacement *without* actual contact or path denial is not success.

### 2.3 Skip/square pull — common second-level insert technique

**Coaching family:** The off-side/backside foot crosses behind the direction-of-pull foot and the player stays relatively square to the LOS, preserving a forward-facing, downhill attack surface. Stanford's public power instruction and Coach Rich Alercio's pull-step classification both emphasize this family for Power or a second-level block. [S2][S4]

**What his feet do:** A brief crossover/skip replacement buys lateral clearance while preserving useful forward support. The athlete advances laterally without completely spinning the upper body, then plants and inserts when the appropriate gap or LB shows. This is not a gliding parallel translation: body inertia, rotation and support still matter.

**Coaching cues:** Eyes at the relevant second-level threat or the block forming at the point of attack; don't outrun the kick; identify inside-out leverage; keep the strike-side shoulder ready; don't bypass a color/penetrator in the path merely because the original LB assignment is upfield. A guard can preserve square shoulders with different degrees of true hip rotation; the observable requirement is **a supportable entry**, not a literal skeleton pose.

### 2.4 Lead / wrap pull — turn the corner and insert downhill

**Coaching family:** A more open lead angle (sometimes taught around 45°) that creates a running path around the line's inside bodies and back toward the point of attack. A tackle wrapping on GT Counter or an uncovered puller in Pin-and-Pull often follows this family. [S2][S5]

**What his feet do:** Clear backside/inside traffic; advance behind the preceding puller; take an arc that neither clips the down-blocker's hip nor becomes a huge deep loop; recognize the kick/log/force structure; plant and turn north/south toward the near linebacker or force player. The *turn* costs time, balance and momentum, but must not trap the athlete in an endless waypoint orbit.

**Reader:** Normally eyes inside-out or on a named fit/nearest dangerous threat, not simply the instantaneous defender nearest his coordinates. If the backer scrapes, the wrap must adapt; if a free down defender penetrates, some installs call for the wrap to collect the first opposite-color threat instead.

### 2.5 Tightness versus depth: the central pulling compromise

**Too shallow:** The puller clips a center's back block, runs into a tackle's hip, crosses the LOS prematurely into a down defender, or gets grabbed before seeing his edge read. **Too deep:** The puller travels farther, arrives late, invites penetration, separates from the RB and gives the linebacker time to fill. Coaching systems deliberately choose different starting depth and aiming landmarks, but all must respect these tradeoffs.

A proper engine should *derive* clearance from actual body radii, stance depths, moving teammates, available acceleration/braking, and whether a first-level defender can penetrate. Do not install a universal “2 yards deep” or “0.3 yards from tackle” as a physics law. Those are coaching examples and should be tunable landmarks.

Useful telemetry per puller:

- Initial feet/stance, `snapReadyAt`, first chosen movement command, and first achieved displacement.
- Lateral distance cleared at 0.25/0.5/1.0/1.5 s, plus depth relative to initial LOS and neighboring OL.
- Minimum actual body clearance to **center, adjacent guard, tackle and blocking partner** during the route.
- Time of center/guard clearance; time of turn-up; first acquired defensive cue; first loaded contact.
- Where the ball carrier is at each event, and whether the puller still arrives before the relevant defender can reach the lane.

### 2.6 Coaching distinction: technique choice versus reactive contact

A coach can install **kick no matter what**—for example, the Texas pull clinic reported by Lauren's First and Goal emphasizes aggressively working into the LOS, so a spill naturally becomes a log through contact, rather than having the puller consciously select two unrelated blocks. Other coaches explicitly teach a *kick-or-log* read. Both are defensible. [S6]

Therefore, give the simulator at least two optional **policies**, not a universal branch:

- `attack_kick_then_adapt`: pull tight, strike the intended inside number, allow physical contact and leverage to turn the defender into a natural log when he wrong-arms.
- `classify_then_choose`: recognize squeeze / spill / upfield charge from the acquired picture, then choose kick / log / trap on an attainable route.

Both still obey real contact, legal reaction time and motor limits. Neither grants the player private defender intent or labels. Do not automatically guarantee a successful log when the end wrong-arms.

### 2.7 Teaching/behavior checklist: shared motor skills

- [ ] **GEN-01** — With identical left/right mirrors, does the first step reverse correctly and produce mirrored **achieved**, not just requested, movement?
- [ ] **GEN-02** — Does the player leave the snap stance with finite reaction, acceleration and achievable body turning?
- [ ] **GEN-03** — Is the opening footwork type appropriate for the **called pull role** rather than hardwired for `G`/`T` roster position?
- [ ] **GEN-04** — Does a tight pull clear the center's actual occupied/support envelope, including the center's back block?
- [ ] **GEN-05** — When a teammate steps backward into the path, does the puller select an achievable clearance instead of phasing through?
- [ ] **GEN-06** — When a teammate does **not** obstruct, does the puller avoid unnecessary deep bellying or lateral detours?
- [ ] **GEN-07** — Can the player accelerate down the line while turning his torso and maintaining a viable planting base?
- [ ] **GEN-08** — Does the movement controller avoid repeated alternating left/right corrective targets (“orbiting”)?
- [ ] **GEN-09** — Does a pulling player retain meaningful eyes/keys through departure and start reacting only to legitimately acquired information?
- [ ] **GEN-10** — Does actual contact with a penetrating DL affect the route and support rather than being ignored by a planner?
- [ ] **GEN-11** — Can a puller change his intended contact target without teleporting, instantly restoring balance, or using impossible grip?
- [ ] **GEN-12** — Does a player who overshoots have to brake, plant and recover rather than snapping directly toward the LB?
- [ ] **GEN-13** — Does a skip/square technique preserve a more upfield working surface than an open/flat pull when both are deliberately installed?
- [ ] **GEN-14** — Does a stationary defender force the puller to arrive and gather, while a scraping defender elicits a different **achievable** interception route?
- [ ] **GEN-15** — Does a blocker whose path is impossible sometimes fail instead of receiving a magic bypass?
- [ ] **GEN-16** — Are the same strength/traction/turn/grip limits used for guards, tackles, TEs and backs with different profiles, rather than special-case pull speed bonuses?
- [ ] **GEN-17** — Does stronger/higher-skill footwork improve approach control without universally increasing every player's raw physical capacities?
- [ ] **GEN-18** — Is the first *loaded* strike measurable independently of engagement acquisition or an assignment arrow?
- [ ] **GEN-19** — When the defender legitimately beats the outside shoulder, can the result be an unsuccessful block and tackle?
- [ ] **GEN-20** — Do neutral observers leave all bodies, decisions and RNG histories unchanged?

---

## 3. Getting around a tackle, then delivering a block

### 3.1 What a guard is actually looking at

Picture a backside guard pulling right around a playside tackle. The tackle is executing a down block into a shaded defensive lineman. The guard's initial plan could be to wrap through the C-gap or to kick the first end outside the down block. The **near hip of his tackle** is a useful approach landmark because it tells him where the wall is being built; it is *not* a GPS waypoint he must run through. The defender's pressure may make that tackle gain depth, squeeze outward, lose leverage or be displaced. This changes the actual corridor. Good eyes and footwork read the physical **surface** rather than a pre-snap point frozen in space.

Before clearing the center/inside OL, the puller should prioritize his installed route and immediate color crossing his face. As the tackle/down-block area comes into view, he can read the end's depth, the moving down-blocker's hip, the kick's inside/outside outcome, linebacker scrape and whether the opening exists **on the appropriate side** of the first block.

Questions the player must answer (at a *coaching* level):

1. **Is someone penetrating the track I must run?** If so, can I fit or collect him without leaving a worse threat behind?
2. **Which physical side of my down block is open?** The intended inside crease may be closed by a tackle being driven back.
3. **Where is the relevant defender heading, not merely standing?** Mike scraping across at 3 yd/s needs a different intercept than Mike staying square.
4. **Can I make supported contact from this approach?** Running past Mike at full speed may give a big distance-to-target number but terrible protection.
5. **Has the runner arrived?** A block made after the RB is already being tackled is not a timely success, even if a clip looks impressive.

### 3.2 “Run tight off the tackle” does **not** mean follow his center

A realistic command sequence must preserve actual collision geometry. Define a **clearance corridor** that respects the moving tackle and defender bodies; choose a lane outside/beneath the tackle's useful hip with a margin for the puller's radius, shoulders and braking. From there, fit an intercept on the next defender's **reachable shoulder**. Movement is continuous: if the line of approach opens, leave the curved corridor; don't keep orbiting the previous defender for a ceremonially completed waypoint. If it closes, redirect with finite momentum or fail.

For a wrap puller, a good first pass is **two coupled problems**:

- **Exit problem:** safely and promptly get beyond the last obstructing first-level body while preserving contact/support limits; goal is an *exit region*, not a single immutable point.
- **Strike problem:** beat or meet the assigned second-level defender at a physically attainable point on his path to the run, with appropriate velocity and facing.

In the project, the earlier saved `CLIMB_EXIT` experiment found an `orbit/stand` failure in double-team departures; that is relevant to pulling guards but **should not be blindly copied** to a still-engaged non-released player. [R3]

### 3.3 How pullers lay a block: kick, log, wrap, seal

**Kick-out:** First-level or force defender is widened or held *outside* the intended inside path. The puller approaches from the inside with an attainable inside-to-out path, prepares the correct shoulder/hand surface, strikes at an angle and keeps moving the feet. This is not guaranteed lateral displacement. A defender who spikes inside, wrong-arms or avoids contact can defeat the intended kick.

**Log:** Defender squeezes/spills underneath the kick, or his body orientation makes a kick unattainable; a properly executed contact can turn/seal the defender *inside*, while the ball goes outside. This can be an explicit decision or an emergent conversion of the coached kick attempt. Look for actual torso/hand torque and continued base—not instant reassignment of the defender's position.

**Wrap/insert:** A second blocker goes inside the kick (or outside a log, depending on the installed response) and takes the most dangerous linebacker or secondary fitter. He must read the *block/result surface* and defender's movement, arrive with a braking/turning budget and protect the actual path. Running straight through a linebacker at full speed with no gather should not be the default.

**Perimeter seal/stalk:** A tackle, guard or receiver arrives at a moving DB/overhang, tries to gain the lane-side shoulder, runs him wider if useful, or walls him off. A DB who refuses contact can still be removed from the lane if he widens, but a blocker cannot claim he was sealed based on distance alone.

**Trap:** A deliberately unblocked defensive lineman penetrates upfield and is struck from a crossing angle by the puller. Success needs a real intercepted half, not a scripted catch-up; a DL squeezing instead of rushing can be harder to trap.

### 3.4 Kick versus log is a **joint play response**

The RB and second puller have to respond coherently to the first block. Against an effective kick, the runner generally tracks **inside** the widened defender and the wrapper inserts inside. Against a log, an outside bounce or different wrapper leverage can become appropriate—but only if outside support is genuinely accounted for. A defender who wrong-arms may spill the ball into a pursuing linebacker. An apparent log is not automatically a free touchdown.

The engine should record both the *called response rule* and *physically observed result*. If the second puller is looking at a delayed first-block picture, imperfect adjustments are credible; reacting instantly to `e.win` or hidden engagement flags is not.

### 3.5 Arrival contact: braking, foot replacement and the last two steps

A puller arrives after a relatively high-speed lateral/downfield approach. This is mechanically unlike a first-level lineman driving directly out of his stance. The last few steps often need **deceleration and support**, not maximal sprint velocity. Key questions:

- Can he shorten strides, gather his mass under his hips and turn to the defender without falling?
- Is his shoulder on the useful lane side? Can he redirect force without opening his own gate?
- Does he strike the defender's near surface or simply run to the center point where the defender *was*?
- If his first hand misses, can the remaining body/contact produce partial delay and a legitimate recovery?
- If the defender runs away, does the blocker stay on a useful angle, pursue, or fall behind?
- If the defender wrong-arms, does the block become a physically credible log/wash, or does the guard penetrate and give up the hole?

**Do not overinterpret rendered foot labels.** The current engine has reduced support and contact representations; one can check requested/achieved deceleration, body orientation, support availability, contact impulse and motion. Literal right-foot placement cannot be *proven* until a suitable foot-placement representation exists. Write the test as “achievable turn, support and strike,” and separately mark precise foot-sequence measurements as **requires new instrumentation/model**.

### 3.6 Shared contact-arrival acceptance checks

- [ ] **ARR-01** — Is the puller's first meaningful defender cue acquired after a realistic opportunity to see him, not from the play's hidden defensive call?
- [ ] **ARR-02** — Does the puller choose a free corridor using the moving *bodies* of center, tackle and prior puller rather than crossing their centers?
- [ ] **ARR-03** — Does path selection distinguish an attainable exit region from a guaranteed blocker-to-LB interception?
- [ ] **ARR-04** — If a direct path becomes clear, does the puller leave the old curve without unnecessary laps around the defender?
- [ ] **ARR-05** — If the hole is not reachable because a DT squeezes or center loses, is a failed/late pull possible?
- [ ] **ARR-06** — Does a kick strike from the play's intended inside/outside relationship rather than simply collide anywhere with the target?
- [ ] **ARR-07** — Can a defender wrong-arm and induce a real log/wash rather than a magic label switch?
- [ ] **ARR-08** — If the kick becomes a log, can the second puller and RB react according to **observed** opening, with delay?
- [ ] **ARR-09** — Does a first puller attacking an upfield mesh charge adjust direction with finite turning, instead of overshooting automatically?
- [ ] **ARR-10** — Does a wrap puller choose the first meaningful linebacker access point on the hole side, not blindly chase the LB's center?
- [ ] **ARR-11** — Does the wrapper gather/brake/plant as required by his actual arrival speed, with a possible miss or overshoot?
- [ ] **ARR-12** — Is every useful blocked route backed by legal, in-range **actual** physical contact and load, not a persistent stale joint?
- [ ] **ARR-13** — Can a first-level defender reach the runner while still “engaged” when geometry genuinely gives him access?
- [ ] **ARR-14** — Is the runner allowed to avoid a free defender even if a prescribed landmark is blocked?
- [ ] **ARR-15** — Do skill ratings change error/recognition/technique execution without making block completion unconditional?
- [ ] **ARR-16** — Are the defender's box/spill, scrape, wrong-arm and pursuit reactions evaluated as independent football jobs?

## 4. Concept-specific coaching and checks

**How to use these sections:** Each begins with a **reference installation**, not a universal rule. The checkboxes ask whether the simulated player is doing the appropriate thing **for that installation**, based on physically reachable geometry and his own observations. If an assignment changes under a front check, grade the changed assignment, not the example's original player labels.

### 4.1 Power O / Power with a wrap guard

**Reference installation:** Playside down blocks build an interior wall. An FB/H/wing or other blocker kicks the EMLOS/force defender. The backside guard pulls across to lead through the B/C-gap region on the identified linebacker. The center blocks back or participates in the required double; backside tackle protects the gap vacated by the guard and hinges against pursuit. Power can also be installed with **the guard kicking** and another lead blocker wrapping, so the actor doing each job is a *parameter*. [S7][S8][S9]

**First steps and route.** On a one-back Power O insert, the guard often uses a *skip/square pull*: lateral crossover replacement with shoulders relatively square to the LOS, eyes on the first opening outside the down block, enough clearance from the center's back block, then a deliberate turn **up** through the first fit. He doesn't loop deep into the RB's mesh. The tackle/down blockers step inside on their gaps and create the wall rather than chase a linebacker immediately. The kicker takes an inside-out course to the edge. The RB presses the established wall and the lead's hip rather than racing ahead of him.

**What the guard is thinking:** “My vacated gap is accounted for. I must get behind the center and the double without running into them; locate the kick, enter the first valid crease, keep my shoulders ready to block the point LB from inside-out. If the linebacker scrapes, acquire and fit his path; if a free defender blows through my doorway, collect/adjust according to the installed rule.” *Do not* make him chase the RB's actual hidden destination.

**Defensive branches:** A squeezing end challenges the kick but may widen the inside crease; wrong-arm/spill can cause the kick to log or redirect the ball outside; a 3-tech penetrating the down block may completely ruin the pull lane; a fast scrape linebacker may force a sharp turn or defeat the wrap; a blitz into the vacated guard gap tests the center/backside tackle's hinge.

**Frequent unrealistic simulation signatures:** guard leaves the stance but stops behind center; guard loops 3 yards deep when a clear tight lane existed; fullback “kicks” with zero force but the edge is magically removed; guard gathers at the LB's old center too early; wrapper fails to turn up when a crease opens; back outruns the guard; a correct down-block wall is discarded to chase an unrelated defender.

**Power checks (reference Power O):**

- [ ] **PWR-01** — At snap, is the play's *actual* kicker identified separately from the backside guard's wrap job?
- [ ] **PWR-02** — Does the playside tackle/guard account for inside/down threats before climbing?
- [ ] **PWR-03** — Is the backside A/B-gap exposure created by the pulling guard assigned to a center/backside tackle/other valid player?
- [ ] **PWR-04** — Does the guard start promptly with installed skip/square behavior instead of a stationary pause?
- [ ] **PWR-05** — Can the guard clear the center's back-blocking body without tunneling or a needless deep arc?
- [ ] **PWR-06** — Does the center still have an achievable back block when the guard begins crossing?
- [ ] **PWR-07** — Is the kicker's first course inside-out toward the correct force/end, not into the guard's lead path?
- [ ] **PWR-08** — Is there actual loaded force when the edge kick is credited?
- [ ] **PWR-09** — Does a hard squeeze or wrong-arm create a *different physical result* from a static wide edge?
- [ ] **PWR-10** — Does the wrapping guard observe the kick/down-block surface and turn up through a real hole?
- [ ] **PWR-11** — Can the wrap adjust to a scraping LB using observed motion and a physically attainable intercept?
- [ ] **PWR-12** — Does the guard decelerate/turn as necessary before striking rather than overrun a lateral LB?
- [ ] **PWR-13** — If Mike runs away, can the guard cut off his path instead of tail-chasing the last position?
- [ ] **PWR-14** — Is a defender through the vacated backside gap able to disrupt the play when the hinge fails?
- [ ] **PWR-15** — Can the first-level double keep a genuinely penetrating DL from instantly splitting the wall, without guaranteed success?
- [ ] **PWR-16** — Does the RB generally press the lead and make a plausible read on the *observed* kick/log?
- [ ] **PWR-17** — When no second-level block is made before RB arrival, is the play allowed to fail despite a “climb” assignment?
- [ ] **PWR-18** — Does changing the kick from H to guard change path/clearance/tempo, not automatically produce identical movement?
- [ ] **PWR-19** — Do Over/Under/Tite/Bear fronts legitimately change who is down-blocked, doubled, pulled and left for the kicker?
- [ ] **PWR-20** — Can the defender win with spill, penetration or a successful backer fill, even if offensive assignments are correct?
- [ ] **PWR-21** — Are 0.5/1.0/1.5/2.0 s puller travel, turn-up and first LB load recorded *before* concluding Power is improved?

**Diagnostic pack:** (A) normal Over with a clean center back block; (B) penetrating backside shade; (C) edge squeeze; (D) wrong-arm spill; (E) fast scraper; (F) untouched front with an ordinary successful kick; (G) mirrored side; (H) identical bodies with kicker role changed and a legal changed installation.

### 4.2 GT Counter / Counter Trey

**Reference installation:** The backside guard is the **first puller**, often a trap/square/open pull, attacking the EMLOS or called kick defender. The backside tackle is the **second puller**, following the guard and wrapping to the point linebacker. Playside players down-block or deuce as called, while center/backside protection must account for threats left by the departing guard and tackle. The RB may take a counter/jab step away then track the kick/wrap; some shotgun variations change the mesh and first steps. This is specifically **GT**, not a label for every counter. [S10][S11][S12]

**Guard's path:** Opening step and hip turn to run tight behind the center/down blockers. The guard must recognize the first dangerous color outside the down block as the kick candidate. If the end squeezes, collide into a usable inside half. If he wrong-arms, a trained kick technique may become a log. If he charges vertically at the mesh, the guard may need to redirect his course to contact the exposed upfield shoulder; he cannot assume the end will wait at a static mark. A kick made beyond the ball's arrival is too late.

**Tackle's path:** The tackle needs an additional separation/turning problem: he is behind the guard and may be blocked by the guard's torso, a folding center, or a penetrating DL. His typical **lead/wrap** or square technique should preserve the order of the two pullers, clear the guard's hip, and enter on the correct side of the kick/log outcome. He then needs to **fit** a pursuing LB, not sprint downfield past the only useful contact point. The tackle might be the larger, slower athlete; his support/acceleration can make some intersections unattainable. Do not award him the LB just because the correct target was selected.

**Second puller thought process:** “Follow the first puller's near hip until I have an honest window. Read the actual end/kick movement and the LB's fit; turn up inside the kick or adapt outside a log under our coached rule. My job is to block the first valid threat to the lane, not automatically the nearest player or the LB's center.”

**Mismatch to watch:** Guards/tackles may start at slightly different depths and widths. Some programs teach the tackle to remain more square; some more open. A play that looks decent in one formation may fail in another because the tackle crosses QB/RB mesh or the guard's starting position. The *down-block wall* and backside hinge must be retained across those transfers.

**GT Counter checks:**

- [ ] **GT-01** — Does the installed plan assign **guard = first kick** and **tackle = second wrap**, except under an explicit variation?
- [ ] **GT-02** — Does the backside guard's first step clear his center/down-blocker rather than advance toward a phantom stationary LB?
- [ ] **GT-03** — Is the guard's initial route tighter/flatter than the tackle's outer wrap route when that is the coached installation?
- [ ] **GT-04** — Does the backside tackle begin promptly after snap and maintain usable spacing behind the first puller?
- [ ] **GT-05** — Do two pullers avoid walking through each other's bodies when cornering?
- [ ] **GT-06** — Is the counter/jab action by RB/QB physically feasible and timed so the guards are not inherently late?
- [ ] **GT-07** — Does the playside down-block wall form before the RB arrives at its entry?
- [ ] **GT-08** — Does an unblocked defender in a vacated backside gap create a genuine risk unless another blocker or read accounts for him?
- [ ] **GT-09** — Can the guard identify the EMLOS after delayed observation without reading a private defender engagement flag?
- [ ] **GT-10** — Against a wide/boxing end, does the kick attempt seek useful inside-to-out contact, not a chase into the end's outside shoulder?
- [ ] **GT-11** — Against a wrong-arm end, is log/wash physically possible (but not guaranteed) and does the runner react appropriately?
- [ ] **GT-12** — Against a vertical mesh charge, can the guard adjust his attack angle while maintaining finite support and momentum?
- [ ] **GT-13** — Does the tackle's wrap react to the **kick result**, not automatically execute the same insertion path after a log?
- [ ] **GT-14** — Does the tackle fit the first relevant LB on the **path to the crease**, not chase him after he has passed the ball?
- [ ] **GT-15** — When a LB runs laterally, is the tackle's intercept updated from the acquired cue while preserving a plausible plant/gather?
- [ ] **GT-16** — Is the tackle's first real hand load against the LB observable before RB entry when the block is timely?
- [ ] **GT-17** — Can a lead blocker arrive within arm reach but miss because of poor angle, overshoot, support or defender reaction?
- [ ] **GT-18** — Does a Tite or Bear front change the availability of the guard/tackle pull and required back block rather than silently allowing both to leave?
- [ ] **GT-19** — Do both physical mirrors preserve the relative route and blocker responsibilities?
- [ ] **GT-20** — Does a slightly slower tackle sometimes miss the same LB while the guard's kick remains unchanged?
- [ ] **GT-21** — Do film/trace events distinguish snap departure, kick load, tackle turn-up, tackle LB load and RB first contact?
- [ ] **GT-22** — Can a legitimate defensive spill force the RB to bounce into an unblocked force DB and get stopped?

**Diagnostic pack:** static end / widening end / wrong-arm / mesh-charge / crossing LB / walked-up LB / 4i Tite / two simultaneous gap penetrators / left-right mirror / faster vs slower tackle / added TE or H alignment.

### 4.3 GH, GY and other two-puller Counters

**Reference installation:** First puller remains a guard kicking or trapping the force/end. Second puller is an **H-back** (G/H) or a **Y tight end** (G/Y), wrapping or kicking a specified second defender. An H starting off-ball has different movement and viewing geometry from an attached Y; G/Y allows the backside tackle to hinge, but the attached Y may have a much harder in-line pull. Other variations reverse which player kicks or require the Y to cross the entire formation—**encode that as installation data**. Coach Dan Casey specifically cautions that attached-TE counter pulling may need a clear game-planned playside answer rather than asking the TE to improvise an unachievable wrap. [S13]

**H-back mechanics:** Because H is already off the line, he may have extra angular space and a more direct arc around the down-block surface. But he must not cut across the QB mesh, intersect the guard's pull, or run into a tackle's back. The H's shorter path can create a timing mismatch if he outruns the kicker; support and speed control matter.

**Attached Y mechanics:** A Y may have to step off the line and cross close to his own or adjacent tackle, often against a live defender. He needs early clearance around the tackle's occupied position, a realistic turning budget and a decided target family. If no path exists under a particular defensive front, a team may choose another play rather than magically make the TE pull through bodies.

**Coaching/engine difference:** The second puller isn't “just another OL with the same start offset.” H and Y can differ in stance, radius, reaction, starting depth, vision and acceleration. The transfer must expose those distinctions without adding role-specific unreal strength.

**GH/GY checks:**

- [ ] **GHY-01** — Does the play specify which of H/Y performs kick versus wrap, with the guard's separate job preserved?
- [ ] **GHY-02** — Does H/Y begin from his actual alignment rather than being repositioned to an artificial OL slot?
- [ ] **GHY-03** — Is H/Y's first achieved step consistent with an off-ball H versus attached Y start?
- [ ] **GHY-04** — Does an attached Y clear his tackle's occupied contact/body region without ghosting through him?
- [ ] **GHY-05** — Does an H crossing the formation preserve the QB/RB mesh corridor or create a credible traffic failure?
- [ ] **GHY-06** — Does the second puller use a meaningful, acquired kicker/defender cue rather than hidden LB status?
- [ ] **GHY-07** — Does the H/Y track maintain order behind the guard and react to guard contact, not race past him by default?
- [ ] **GHY-08** — Does the backside tackle hinge or cover its vacated obligation when G/Y installs that protection?
- [ ] **GHY-09** — Is a Tite-front installation with a specified overhang kick and Will wrap internally accounted for?
- [ ] **GHY-10** — Can the H/Y arrive *too early* and overshoot a squeezing linebacker?
- [ ] **GHY-11** — Does a slower/tighter-space Y legitimately fail where an off-ball H succeeds with the same physical rules?
- [ ] **GHY-12** — Does a crashing overhang create a different kick/contact geometry from a wide secondary force player?
- [ ] **GHY-13** — Is the Y's first loaded contact within real reach and supported by a feasible moving torso, not generated by a role label?
- [ ] **GHY-14** — Does a guard who logs induce the *installed* second puller and RB adjustment, rather than both blindly entering the old inside lane?
- [ ] **GHY-15** — Are two simultaneous assignments to one LB flagged as an installation ambiguity or legitimate combo, not counted as two guaranteed blocks?
- [ ] **GHY-16** — Are achieved times/distances compared separately for H and Y variants and their physically meaningful starting positions?
- [ ] **GHY-17** — Can the offense check away from a front that makes the Y's pull path genuinely infeasible?
- [ ] **GHY-18** — Does same-side RB flow and traditional opposite-flow counter generate different, coherent mesh/defensive reads?

**Diagnostic pack:** detached H vs attached Y, same defenders/roles; wide 9; squeezed 6-tech; Tite 4i; inside blitz at the vacated guard; defensive secondary rotation; Y corner crossing tackle while tackle is down-blocking.

### 4.4 Buck Sweep / Wing-T two-guard sweep

**Reference installation:** Traditional Wing-T Buck Sweep often pulls **both guards toward the sweep**. In a common version, the **playside guard** is the first **kick-out** on the edge/force defender; the **backside guard** is the second **lead/wrap** up the alley. Playside tackle/TE/wing down-block or seal per the call, and the fullback action threatens the interior Buck Trap/Dive companion. The halfback follows the pulling convoy. A singleback variant can reproduce the two-guard jobs without claiming to install the full traditional Wing-T series. [S14][S15]

**Playside guard's first two steps:** Clear his own playside tackle/down block while gaining just enough depth to angle back **into** the outside defender. Some Wing-T coaches teach two initial diagonal depth steps; others emphasize a flatter, quicker kick. Both require an actual exit around the tackle's down block. A guard who runs too flat may collide with his own tackle; one who pulls too deep may arrive after the halfback.

**Backside guard:** Clear the center and the first guard's path, maintain a workable trailing relationship, then lead **inside the first guard's kick** toward a scraping LB/safety. A good wrap need not contact a stationary original LB if he scrapes away; it must react to the available lane. If the first guard logs, the second guard may have to find a different fit under the installed rule.

**Backfield:** Halfback takes a lateral sweep course with enough patience to permit both guards to clear. A credible FB dive/trap fake may briefly influence linebackers **only if** they see the relevant backfield cues. A fake does not grant automatic freeze. The QB pivot/handoff must be physically attainable without crossing a moving guard or wing.

**Buck-specific risk:** The double pull vacates both guard surfaces; nose, tackle, backside fill and down-block integrity become essential. Some fronts require checking out. Do not let two guards leave through an unsecured interior just because the play label says Buck.

**Buck checks:**

- [ ] **BUCK-01** — Are **both guards** installed as pullers in the reference two-guard version?
- [ ] **BUCK-02** — Is the **playside guard's first contact** aimed at the declared edge/force threat rather than a random LB?
- [ ] **BUCK-03** — Does the playside guard's departure clear the **moving playside tackle/TE down-block wall**?
- [ ] **BUCK-04** — Is the first guard's chosen depth justified by tackle clearance, rather than a fixed exaggerated loop?
- [ ] **BUCK-05** — Does the backside guard cross behind center and trail the first puller without mutual collision?
- [ ] **BUCK-06** — Does the second guard turn up through the alley on a **linebacker/second-level** target rather than duplicating the first kick?
- [ ] **BUCK-07** — Can a penetrating nose or backside DL blow up the exposed A gap when nobody accounts for him?
- [ ] **BUCK-08** — Does the center/backside tackle/FB fill arrangement visibly prevent a free defender from crossing the backside gap when executed well?
- [ ] **BUCK-09** — Does the fullback's fake produce real body motion that a linebacker can observe, without forced defender freeze?
- [ ] **BUCK-10** — Does the halfback allow time for both guards to get ahead when physically feasible?
- [ ] **BUCK-11** — Does the RB have to adjust if the first guard fails to reach the edge or the second guard is late?
- [ ] **BUCK-12** — Does the kick remain a useful inside-to-out physical strike, not merely arrive near the EMLOS?
- [ ] **BUCK-13** — Can a defender squeeze and make the first guard log, with plausible adjustment by the second guard and runner?
- [ ] **BUCK-14** — Does the second guard gather into the LB's route before or near runner arrival, rather than chase after the play?
- [ ] **BUCK-15** — If the wing/TE down block is lost, can the edge collapse even if both guards execute their routes?
- [ ] **BUCK-16** — Do Over, Under, Bear and odd fronts change whether the two-guard departure is safe?
- [ ] **BUCK-17** — Do the first guard's and second guard's **distinct** start, turn-up, and load times appear in telemetry?
- [ ] **BUCK-18** — Does a traditional two-back Wing-T fake/mesh differ from a **singleback Buck-inspired** installation without corrupting the common pull rules?
- [ ] **BUCK-19** — Are mirrored Buck sweeps physically symmetric when roster/front geometry is genuinely mirrored?
- [ ] **BUCK-20** — Can defenders legitimately defeat Buck by wrong-arm, scraping under the wrap or run-through in an exposed interior gap?
- [ ] **BUCK-21** — Does an early halfback outrun leave a measurable blocker-to-runner separation and an independent negative outcome?

**Diagnostic pack:** two-guard Buck to TE and to split-end sides; center shaded 1-tech; Bear nose; wide force/box end; wrong-arm end; late scrape LB; delayed FB fake; a slower backside guard; under-center vs singleback mesh. **Do not certify this from the current #99 prototype's singleback runs alone.**

### 4.5 Pin-and-Pull sweep

**Reference installation:** Down/pin players take defenders whose pre-snap alignment makes a favorable inside block; eligible uncovered players pull toward the perimeter to become lead blockers. The identities of pullers **change with the front**. Some coaches treat Pin-and-Pull as an outside-zone variation using man/down techniques, others as a distinct perimeter gap concept. Ed Warinner's Glazier clinic describes declaring the C/D-gap runner entry and letting the front determine the two pullers. [S16][S17][S18]

**First steps:** A covered player executes a short, flat/inward pin step into an inside gap/near shoulder and establishes a down-block wall. An uncovered player opens or skip/lead-pulls according to whether he is a kick/force blocker or linebacker wrapper. The more interior puller may have to clear a covered center or backside shade; the outer puller must clear a tackle or TE that is pinning inside. The two routes require spacing without fixed universal puller IDs.

**Important difference from Buck:** Buck usually declares two specific guards as the pullers; Pin-and-Pull uses a **front-dependent ownership decision**. A four-down front, odd front, shifted nose, walked-up LB or attached TE changes which players are “covered,” which threats must be pinned and who can safely pull. The sim must solve the **whole lineup**; local greedy decisions can leave one DL entirely unblocked or assign both perimeter pullers to the same corner.

**How the pullers read:** Look at the edge/down block first; avoid a cut-through behind a blocked first-level DL that still has outside access; then acquire the force/corner/linebacker on the relevant alley. Not all uncovered players must become pullers if that would leave a penetration unaccounted for; coaches use coverage rules and calls to determine exceptions.

**Pin-and-Pull checks:**

- [ ] **PIN-01** — Does the snap assignment correctly classify “covered/uncovered” under the **selected coaching rule**, including inside-gap shades and an inline Y?
- [ ] **PIN-02** — Does a changed defensive front produce a **legitimately different set of pullers** rather than frozen PSG/BSG identities?
- [ ] **PIN-03** — Are all first-level penetrating threats either pinned/down-blocked, otherwise accounted for, or deliberately unblocked under an explicit read?
- [ ] **PIN-04** — Does a covered tackle/TE close a down-block angle before an uncovered interior lineman pulls past?
- [ ] **PIN-05** — Can a covered TE fail to pin an edge, leading to a real obstruction for the puller?
- [ ] **PIN-06** — Does the first puller take a feasible near-wall route, not run through the defender pinned by the tackle?
- [ ] **PIN-07** — Does the second puller choose a distinct meaningful force/LB responsibility, not duplicate the first?
- [ ] **PIN-08** — Can a center pull **when uncovered and properly relieved**, with his initial snap/support and clearance constraints respected?
- [ ] **PIN-09** — When a center is covered by a nose, does the plan normally prevent a free center pull unless another valid protector is installed?
- [ ] **PIN-10** — Does an under/over shade switch shift down-block/puller relationships as expected under the chosen rules?
- [ ] **PIN-11** — Does a late shift or walked-up defender force a legal recognition/communication response instead of private perfect knowledge?
- [ ] **PIN-12** — Do simultaneous pullers keep independent spacing and pass around the outside corner without deadlocking?
- [ ] **PIN-13** — Are the pullers' actual first loads against *force/second-level* players, not all against the same interior DL?
- [ ] **PIN-14** — Does the RB recognize the installed C/D or outer-gap track and select a seam based on acquired contact geometry?
- [ ] **PIN-15** — If the outer force DB widens, can he create space even without a huge drive block, while a DB staying square can compress the lane?
- [ ] **PIN-16** — Does a run-through into a vacated first-level gap stop the play when down-block assignment fails?
- [ ] **PIN-17** — Do a gun handoff and under-center toss preserve the same pin ownership while producing different runner/puller arrival windows?
- [ ] **PIN-18** — Does switching from two pullers to one valid puller produce fewer perimeter hats without creating artificial force?
- [ ] **PIN-19** — Are the two pullers' clearance, turn-up, target-acquisition, **first load**, and runner arrival captured separately?
- [ ] **PIN-20** — Can real outside defensive support beat both pullers because of initial width, superior movement or a correct scrape angle?
- [ ] **PIN-21** — Is the team able to vary its pin rule without new contact physics or changing every defender controller?
- [ ] **PIN-22** — Does the sim **not** call Buck Sweep and Pin-and-Pull the same play just because both happened to pull two guards in one front?

**Diagnostic pack:** head-up nose vs shaded nose; covered playside tackle vs uncovered tackle; inline Y pin with guard pull; odd/3-4 4i; shifted Bear; center as legal puller; nickel overhang wide; 9-tech; overloaded boundary; under-center toss vs gun handoff. Review [`#99`](https://github.com/tannerthardy/football-simulation-/pull/99) as a separate **held development** installation; it is not proof of production reliability.

### 4.6 Crack Toss / Toss Crack

**Reference installation:** A reduced-split receiver, wing or TE cracks **inside** on a named end/overhang/linebacker while an offensive tackle (and sometimes another OL, FB or TE) pulls or leads **outside** to handle the force/corner. The RB receives an actual toss/pitch and tries to reach the perimeter in the available corridor. Some versions crack the EMLOS with a TE and ask the tackle to attack a corner; other versions crack a second-level overhang and release OL to force. **Specify exactly which.** The underlying advantage is a better blocking angle and potentially a large blocker arriving on a lighter DB, not a guaranteed edge victory. [S19]

**How the tackle gets outside:** The tackle's starting inside/attached TE relationship is different from a guard pulling across center. He must clear the *cracker's crossing path* and any down-block partner, open his hips to the outside, carry enough upfield depth to meet the force player and retain support. He may need to turn the corner wider than a Power wrapper. A waypoint at the CB's current position is not a useful block if the CB can run around it; the tackle wants the defender's **path into the RB alley**.

**Cracker's mechanics:** A receiver from a nasty/reduced split attacks an inside near half of the designated defender. The cracker's angle should actually cross the defender's anticipated movement; the defender can squeeze, widen, avoid the crack, or redirect his fit. If the receiver misses or cannot legally contact from the approach, the tackle's outside path may expose the RB to an unblocked force player. A crack is not automatically a blindside hit: the sim must represent permissible contact and jurisdiction-specific block-foul rules instead of awarding the crack on a line crossing. [S19][S20]

**Toss/motion timing:** The pitch travels through space. The RB must secure it, turn and accelerate, then either press the wide aiming point or cut under a widening tackle/force block. The OL pull and WR crack happen on the snap's clock; the runner's path does **not** teleport to the perimeter at possession. Too fast an RB arrival can make a good developing pull useless; too late exposes the backside and force rotation.

**Crack-specific concern from this repository:** The held #99 prototype installed a reduced-split WR crack and RT force job and achieved real crack loads, yet the RT sometimes did **not** load the CB/force defender before the runner arrived. A successful crack with an unsuccessful outside collection remains a failure of **whole-play protection**. [R2]

**Crack Toss checks:**

- [ ] **CRK-01** — Does the installed formation actually produce the called reduced/nasty split and legal receiver alignments?
- [ ] **CRK-02** — Is the crack assignment tied to a named permissible defensive threat/inside responsibility rather than automatically targeting the nearest hidden defender?
- [ ] **CRK-03** — Does the receiver's first step point toward a feasible inside crossing angle without teleporting across the OL?
- [ ] **CRK-04** — Does the cracker's approach respect the defender's observed movement, body reach, reaction and available acceleration?
- [ ] **CRK-05** — Is a crack counted only when real legal contact/load or path interference occurs?
- [ ] **CRK-06** — Can a defender evade the crack, work over it, wrong-arm or otherwise retain access to the RB?
- [ ] **CRK-07** — Does the pulling RT open and clear the WR/TE cracker's physical path?
- [ ] **CRK-08** — Does the tackle's outside route **actually reach the corner/force player's alley**, not merely the lateral chalk landmark?
- [ ] **CRK-09** — Does the tackle recognize a force player who widens or turns inside based on acquired cues?
- [ ] **CRK-10** — Can the CB/force DB refuse direct contact and still force the runner inside through positioning?
- [ ] **CRK-11** — Does a corner who tries to take on the tackle face physically realistic mass, leverage, contact and possible successful resistance?
- [ ] **CRK-12** — Are the crack and force jobs accounted for **separately**, so two blocks on one defender cannot erase another?
- [ ] **CRK-13** — Does the ball execute a real lateral/backward pitch, with catch/flight/possession timing and potential drop?
- [ ] **CRK-14** — Can the RB outrun his RT or get squeezed between crack and force when the blockers are late?
- [ ] **CRK-15** — Can the RB use a real crease **inside** the force if the outside defender widens?
- [ ] **CRK-16** — Do the crack and tackle coordinate on a DB replacing the vacated inside/edge responsibility (“crack replace”)?
- [ ] **CRK-17** — Does adding a second cracker/FB lead change the actual numbers and routes without fake contact bonuses?
- [ ] **CRK-18** — Do wide, off and press corners produce distinguishable tackle approaches?
- [ ] **CRK-19** — Can a motion look change defender observation/fit without the defense knowing the hidden called crack?
- [ ] **CRK-20** — Does the chosen NFL/NCAA/high-school rule set reject prohibited blindside/crackback contact or at least flag unsupported legality assumptions?
- [ ] **CRK-21** — Is a true edge loss preserved even if the WR delivered an excellent inside crack?
- [ ] **CRK-22** — Do both `crack load time` and `RT force load time`, alongside RB first defender and depth, appear in evidence?
- [ ] **CRK-23** — In the exact current #99 failing witnesses, does the instrumented RT receive an attainable outside-force strike opportunity before runner arrival?

**Diagnostic pack:** nasty split X vs ordinary split; motion receiver; corner aligned wide/deep/press; edge crashes underneath the crack; corner rotates in on crack-replace; multiple receivers crack; CB evades; pitch delayed/poorly located; both strong/weak mirrors; short boundary vs spacious field side. **Do not** declare a crack successful solely from the receiver hitting a defender.

### 4.7 Conventional Toss / Toss Power / Lead Sweep

**Reference installation:** A lateral/behind-the-line toss gives the RB the ball with an earlier perimeter track. The blockers may use ordinary reach/zone, a tackle/guard lead, down-and-kick, or two-puller Power-style blocking. **Conventional Toss is not necessarily Crack Toss**; a receiver crack is a tag or distinct install. [S15][S19]

**Moving OL mechanics:** On a lead/Power Toss, the designated guard/tackle opens and runs toward the edge, staying connected enough to avoid being outrun by the RB. Other OL may pin/down or reach to secure the near surface. The lead must identify whether he owns EMLOS, outside force or scraping LB. A guard reaching the CB without securing a penetrating end behind him does not protect the play.

**Runner:** Secure the pitch, keep a workable depth relative to the lead, evaluate the edge, and choose to press wide or cut north/south. A ball carrier may be faster than the pulling tackle and should occasionally outrun the convoy if coached poorly; no artificial RB speed reduction should prevent this by fiat.

**Conventional Toss checks:**

- [ ] **TOSS-01** — Is toss ball flight, catch and possession physically simulated, with a valid backward/lateral pass relation?
- [ ] **TOSS-02** — Does the installed blocking scheme declare reach, down/kick or pull/lead rather than assign a generic “sweep block” to everyone?
- [ ] **TOSS-03** — Do any pulling OL start to move with sufficient early tempo to plausibly arrive before the RB?
- [ ] **TOSS-04** — Are near penetrators and backside pursuit accounted for when the OL flows outside?
- [ ] **TOSS-05** — Does a blocker clearing the EMLOS physically negotiate the end's body instead of passing through him?
- [ ] **TOSS-06** — Does the lead puller read the **first dangerous force/scrape** threat to the runner's corridor?
- [ ] **TOSS-07** — Can an outside force player widen and make the runner cut underneath rather than require a hook every time?
- [ ] **TOSS-08** — Does the RB show sensible route adjustment after observing the actual pitch and block picture?
- [ ] **TOSS-09** — Can a toss be stopped by an end penetrating underneath the first lead block?
- [ ] **TOSS-10** — Can the toss fail simply because the QB/RB exchange creates a late or too-wide carrier position?
- [ ] **TOSS-11** — Does switching from a toss to a handoff change receiver/puller timing and defender reads without changing gravity or speed capabilities?
- [ ] **TOSS-12** — Is a toss with **no crack call** allowed to work via its normal blocks, and a crack variant handled under **CRK** separately?
- [ ] **TOSS-13** — Does a wide-nickel front alter first force pickup while a compressed 4-3 front alters inside penetration?
- [ ] **TOSS-14** — Does changing tackle/guard mobility affect arrival and contact geometry more than merely the final yardage mean?
- [ ] **TOSS-15** — Is the RB's first contact depth and whether it came from edge/force/LB recorded?
- [ ] **TOSS-16** — Is a defender staying unblocked due to a legitimate chosen read accounted for, not erased?

### 4.8 Trap / Long Trap

**Reference installation:** The offense deliberately allows or influences one first-level defender to penetrate and sends a guard/other puller across to strike him at an advantageous **inside-out** angle, opening an immediate interior lane. A short trap can cross just the center; a *long trap* may cross a larger part of the line to hit a wider DL/EMLOS. Who is left unblocked is **called** and should not become a permission for every defender to run free. [S1][S2][S21]

**Footwork:** Often a flat/square opening step toward the trap: hips rotate quickly enough to run down the LOS, but the blocker does not take a large backward loop. He must clear the center/down blocker; observe the DL's current penetration; strike his exposed side while preserving a supported base. A penetrating defender can actually **help the trap angle**, but a defender who squeezes or sits may make the kick target harder to reach; the puller may miss.

**Why this is difficult to simulate:** Many naive movement planners chase a defender's present center. Trap needs a predicted **meeting point** on the defender's path as both are moving. A target already in the backfield creates an opportunity, not automatic positive leverage. The defender might close the trap line by dropping pad level, turning in, retracing or refusing upfield penetration.

**Trap checks:**

- [ ] **TRAP-01** — Is the designated unblocked/trapped DL explicitly identified from public front/installation rules?
- [ ] **TRAP-02** — Are the other first-level threats correctly down/zone/back-blocked so that “trap” does not leave several free defenders?
- [ ] **TRAP-03** — Does the guard use installed flat/square departure and clear his neighbor's actual body?
- [ ] **TRAP-04** — Is the pull's opening/depth adequate for a quick first-level strike, not a Power-style deep wrap?
- [ ] **TRAP-05** — Does the guard perceive/feel the DL's actual upfield attack and adjust toward an intercept?
- [ ] **TRAP-06** — Can a non-penetrating/squeezing DL make a trap harder, sometimes beating a flying guard?
- [ ] **TRAP-07** — Does the guard strike a **reachable defender half** with actual normal/lateral impulse rather than “trap contact” from arbitrary distance?
- [ ] **TRAP-08** — Can contact occur with high relative speed and appropriate physical redirection, without universal knockout?
- [ ] **TRAP-09** — Does a DL who gets hands on the guard first occasionally defeat the trap?
- [ ] **TRAP-10** — Can a defender who wrong-arms or gets underneath the block cause the RB to redirect?
- [ ] **TRAP-11** — Is the RB's mesh/track quick enough to use a successful trap and late enough to avoid collisions with the puller?
- [ ] **TRAP-12** — Does the RB see the actual opening, not automatically go through a still-occupied named gap?
- [ ] **TRAP-13** — Can the guard strike *after* the RB has already passed, recorded as an untimely block rather than a success?
- [ ] **TRAP-14** — Can a long trap require a longer crossing route and arrive later than a short trap with the same athlete?
- [ ] **TRAP-15** — Does backside DL pursuit remain live if the center/hinge is lost?
- [ ] **TRAP-16** — Are differences under 3-tech, 1-tech and odd-nose fronts explained by actual trap eligibility and angles?
- [ ] **TRAP-17** — Can a player with worse hip turn/first-step acceleration be measurably less effective on the same trap?
- [ ] **TRAP-18** — Do mirrored traps preserve who is intentionally unblocked and first-contact order?
- [ ] **TRAP-19** — Is the contacted target's forward/lateral velocity and supported balance measured before and after the trap strike?
- [ ] **TRAP-20** — Does the engine preserve legal defensive wins and failed traps instead of fitting all trap runs to a desired mean?

### 4.9 Dart / Tackle-lead run

**Reference installation:** A backside tackle pulls across to lead into a playside interior gap or B/C-gap region; the rest of the line generally uses down/inside blocks or zone-compatible rules. The vacated backside B/C area must be accounted for by a guard/center/backside skill blocker or an explicit QB read. “Dart” varies by offensive system and should not be assumed to use one exact pair of pullers. [S22]

**Why the tackle is different:** The tackle starts farther out, with an end commonly aligned near him, and has more distance to travel across center. He's typically bigger, and his first two steps must clear his own guard and whatever defensive edge he is leaving. In some Dart installs he opens and leads through a frontside crease; in others there is a specific kick/hinge exchange. With a credible defense, a tackle who leaves a live EMLOS without protection creates immediate backside run-through.

**Mechanical progression:** open → clear the backside guard/center → accelerate toward frontside → see the double/down-block surface → turn up → gather into LB's path. This is a more difficult long-distance lead than an adjacent guard's short Power wrap; a longer pull should not automatically accelerate faster to preserve arrival time.

**Dart checks:**

- [ ] **DART-01** — Does the backside tackle have an installed pull role and a named lead/fit responsibility?
- [ ] **DART-02** — Does the center/guard/backside blocker account for threats vacated by the tackle, or is the read legitimately unblocked?
- [ ] **DART-03** — Does the tackle clear the backside guard and center without jumping through bodies?
- [ ] **DART-04** — Does the tackle's greater starting lateral distance produce a physically meaningful travel burden?
- [ ] **DART-05** — Can a wide backside 9-tech make the tackle's departure dangerous or require a separate answer?
- [ ] **DART-06** — Does the tackle preserve enough initial depth to clear the line without a huge unnecessary arc?
- [ ] **DART-07** — Is the turn-up selected from a **moving down-block opening**, not a frozen frontside coordinate?
- [ ] **DART-08** — Does the tackle identify a second-level defender's approach to the lane with finite perception?
- [ ] **DART-09** — Can a slower tackle arrive late relative to the RB even if his max requested speed is always high?
- [ ] **DART-10** — Does a tackle who arrives too fast have to gather and can he overshoot a scraping LB?
- [ ] **DART-11** — Can a frontside DL penetrate the down-block wall and stop the tackle's insertion?
- [ ] **DART-12** — Does a linebacker read the tackle's actual pulling movement, with plausible recognition latency?
- [ ] **DART-13** — Do Tite/Over/Wide-9 fronts produce different safe/unsafe pull openings without hand-coded special outcomes?
- [ ] **DART-14** — Do mirrored Dart runs reproduce mirrored body trajectories in an exact geometric mirror?
- [ ] **DART-15** — Can a tackle pull through but legally fail to obtain loaded LB contact before the RB?
- [ ] **DART-16** — Does a front adjustment or late slant change the fitted path only when it is acquired, not from hidden information?
- [ ] **DART-17** — Are pull distance, first acceleration, center clearance, turn-up, final gather and LB load all timestamped?
- [ ] **DART-18** — Does a QB-read Dart differ from a handed-off Dart only in installed assignments/backfield behavior, not in the tackle's physical capacities?

### 4.10 Outside / Wide Zone moving contact

**Reference installation:** All eligible linemen have a coordinated playside direction and **local** covered/uncovered rules. A covered player attempts a reach or acceptable lateral displacement; an uncovered player assists, overtakes or climbs according to the front, physical security and LB response. This is **not** a guard pull in the usual gap-scheme sense, but the lateral footwork/contact principles are vital for Pin-and-Pull, Buck and Crack Toss. [S17][S23]

**First steps:** Lateral first-step/drag, bucket/open hip or running reach depending on the team. One clinic teaches a short lateral step with the playside foot and replacement by the backside foot (square drag). A tackle moving alongside a 5-tech needs a different achieved direction than a guard pressing a 3-tech. Coherent contact must preserve the lateral race after hands engage rather than convert every reach into a static square push.

**Reach is not always a hook.** A defender may widen to maintain outside leverage. The blocker can continue running him wide and create an inside cutback without securing a textbook outside hook. Conversely, a nominally engaged blocker may fail to prevent the defender from moving back across the lane. The player's intended **contact half**, the actual lateral displacement of both players and the lane the RB uses all matter.

**Combinations:** Partners must occupy compatible half-man surfaces while one or both contribute actual hand load. The potential climber must not leave until the keeper can credibly maintain first-level path security; excessively late releases lose LB access. The project has documented genuine tradeoffs and unmerged corrections; avoid one universal “release when win < X” gate. [R1][R3][R4]

**Outside/Wide Zone checks:**

- [ ] **WZ-01** — Does every OL receive a correct **local** playside responsibility based on actual front geometry?
- [ ] **WZ-02** — Is the first step's achieved lateral direction consistent with the called side for normal, unopposed starts?
- [ ] **WZ-03** — Does a covered tackle attempt a plausible reach/steer rather than merely chase the defender's current center?
- [ ] **WZ-04** — Is a defender who widens with the play allowed to be *run outward* into a cutback rather than auto-marked as an OL loss?
- [ ] **WZ-05** — Does a defender who spikes inside create a real backside/inside penetration threat?
- [ ] **WZ-06** — Do the OL and DL move laterally under load with physically coherent contact rather than automatically freezing or moving in opposite directions?
- [ ] **WZ-07** — Is the difference between **requested playside velocity** and **achieved lateral motion** attributed to identifiable contact, support and spacing causes?
- [ ] **WZ-08** — Can a loaded 1v1 be a legitimate defensive win with the DL maintaining access to the RB?
- [ ] **WZ-09** — Do combination members start with consistent installed half-man contact references rather than contact frames that contradict their approach?
- [ ] **WZ-10** — Does a departing climber get out of the original defender's region without an orbit/stand deadlock?
- [ ] **WZ-11** — Does the remaining keeper have real support, reach and usable leverage when the climber leaves?
- [ ] **WZ-12** — Is a stalled climber allowed to miss Mike even after officially receiving a climb assignment?
- [ ] **WZ-13** — Does a stronger/different-speed LB scrape create a different interception/timing problem without hidden clairvoyance?
- [ ] **WZ-14** — Does the RB perceive *defensive bodies in creases*, including an engaged DL, rather than see only OL spacing?
- [ ] **WZ-15** — Does the RB weigh bounce, bang, bend and possible dog-leg paths with finite visual cues and turning cost?
- [ ] **WZ-16** — Can a runner cut inside a defender being washed wide, even though that defender was never technically hooked?
- [ ] **WZ-17** — Can the play be stopped by a playside TE/end matchup legitimately lost before or after combo transfer?
- [ ] **WZ-18** — Do left/right mirrors, Over/Under shifts and formation transfers preserve information limits and physical capabilities?
- [ ] **WZ-19** — Is a potential backside cutoff measured by whether it denies the defender's path to the cutback, not by engagement status alone?
- [ ] **WZ-20** — Are first contact *before LOS*, DL penetration, LB engagement, runner entry and long-run tackle tails reported separately?
- [ ] **WZ-21** — When improving stretch, are inside-zone, Duo, Power and split-zone adverse controls preserved instead of trading away their useful behavior?
- [ ] **WZ-22** — Does a different first-step coaching family change the **method** and physical trajectory without a universal zone-strength bonus?

### 4.11 Split Zone / Slice / Wham / Sift

**Reference installation:** Inside or mid-zone blocking is paired with an off-ball TE/H/FB crossing *opposite or across the formation* to kick, slice, seal or **wham** a backside end/interior DL. “Split” describes the crossing blocker and backfield appearance; the slice may kick the DE, arc past for an option look, or sift to the second level. A wham often strikes a deliberately released **interior** down defender and needs different timing/landmark than a backside end kick. These variants should be separate assignments, not interchangeable labels. [S24]

**Footwork:** From an off-ball location, the H must cross behind the offensive line/mesh at a depth allowing him to meet the selected end's near shoulder. A TE attached to the line and coming across is a different start requiring finite release and clearance. An H that crosses too deep arrives too late; one too shallow runs into the guard, QB or pulling backside blocker. His target's squeeze, surf or backside chase changes the eventual contact angle.

**Read/communication:** A slice blocker may kick the chasing end, maintain backside cutoff or insert on a scraping LB. But an arc/option release must be intentionally **unblocked** or accounted for by the QB/RB read; the engine should not simultaneously count a fake kick and a real H block on the same defender.

**Split / Slice / Wham checks:**

- [ ] **SPL-01** — Is the cross-formation H/TE/FB installed with the correct `slice`, `sift`, `arc`, `kick` or `wham` role?
- [ ] **SPL-02** — Does the H/TE begin from his actual alignment, with appropriate early depth and turning?
- [ ] **SPL-03** — Can the slice clear QB/RB mesh and adjacent OL bodies, rather than move through them?
- [ ] **SPL-04** — Is the end/interior target selected according to the call, not a universally nearest defender?
- [ ] **SPL-05** — Does the crossing blocker's approach intercept the end's *backside pursuit line*, not just the end's old coordinates?
- [ ] **SPL-06** — Does a crashing backside end produce a different collision than a widening/surfing end?
- [ ] **SPL-07** — Does the slice blocker deliver real hand/body load while supported if the kick is considered successful?
- [ ] **SPL-08** — In an arc/read variant, is the end legitimately unblocked but read by the QB rather than simultaneously “blocked” by H?
- [ ] **SPL-09** — Does an interior wham require contact on the actual interior DL rather than an edge defender?
- [ ] **SPL-10** — Can a late wham collide with the RB or allow the DL to enter the mesh?
- [ ] **SPL-11** — Do frontside zone OL keep their own correct jobs while the H crosses backside?
- [ ] **SPL-12** — Can an H that sifts to a linebacker arrive on the wrong side or miss due to defender scrape?
- [ ] **SPL-13** — Does switching attached Y to off-ball H change route feasibility without changing the physical laws?
- [ ] **SPL-14** — Is the zone runner allowed to bend away from actual backside penetration when the slice fails?
- [ ] **SPL-15** — Can a disciplined backside end defeat the slice/read action and make a legitimate tackle?
- [ ] **SPL-16** — Do a real blocking slice, fake slice and arc release create distinguishable observable cues for the defense?
- [ ] **SPL-17** — Are slice departure, cross-mesh clearance, first actual load and RB backside entry recorded?
- [ ] **SPL-18** — Does mirrored cross-formation action preserve target and early geometry with true mirrored alignments?

### 4.12 Jet / Fly Sweep with moving blockers

**Reference installation:** A motion receiver/wing crosses the formation pre-snap at speed, receiving a jet/fly handoff or toss and attacking the outside. OL can execute pin/down, reach, a kick-and-lead pull or an arc/stalk perimeter variant. Jets are **fast-developing** relative to many two-puller sweeps; a late pulling guard may be irrelevant. [S15]

**Footwork:** Guards/tackles may need an extremely clean first exit or an **influence/down block** that makes a fast edge possible. A large curved two-guard departure designed for a patient Buck carrier is not automatically appropriate. The motion player can help create recognition conflict, but defenders should respond to acquired movement rather than immediately know jet was called.

**Jet checks:**

- [ ] **JET-01** — Does the motion receiver travel pre-snap with legal, physically feasible speed and handoff geometry?
- [ ] **JET-02** — Does the installed OL call specify reach, down/pin, kick or lead explicitly?
- [ ] **JET-03** — Do any pulling OL start soon enough to plausibly reach the force defender before the fast carrier?
- [ ] **JET-04** — If they cannot arrive, can the sweep be stuffed despite perfect route assignment?
- [ ] **JET-05** — Does the frontside TE/WR account for the defender occupying the runner's immediate edge path?
- [ ] **JET-06** — Can a wide force/corner maintain an outside shoulder and force a vertical cut?
- [ ] **JET-07** — Does defensive recognition depend on observed motion and team rules, not exact knowledge of the hidden handoff?
- [ ] **JET-08** — Can the QB make a convincing fake without an impossible handoff through another player's torso?
- [ ] **JET-09** — Does the ball carrier's momentum matter when trying to reverse/cut under a force defender?
- [ ] **JET-10** — Can the same motion into an inside counter or pass change defensive anticipation rather than create a binary perfectly recognized play?
- [ ] **JET-11** — Do mirrored directions preserve motion path, legal timing and off-ball OL interaction?
- [ ] **JET-12** — Are arrival order and first force contact recorded in a tighter early window than slow-developing Buck/Counter?
- [ ] **JET-13** — Does a legitimate missed handoff/traffic complication stay possible?
- [ ] **JET-14** — Does the player running outside have to respond to real blockers' achieved position rather than a prescribed sideline path?
- [ ] **JET-15** — If no pull is installed, do checks avoid incorrectly expecting an OL puller on every jet sweep?

### 4.13 QB Power, Counter Read and Bash variations

**Reference installation:** The designed ball carrier might be the quarterback (QB Power/Counter), while the RB supplies a fake, lead, screen or option threat. On Power Read or Counter Bash, the blocking action and potential ball direction can diverge; an edge defender may be deliberately read rather than blocked. The OL's actual run side, the back's sweep path and the QB's possible insertion must be specified separately. Do not conflate the called direction with the actual ball movement after an option decision.

**OL relevance:** The tackle/guard must execute the same physically constrained kick/lead/wrap mechanics appropriate for the designed call. But the QB mesh position and RB fake can overlap puller traffic, and the defense has conflicting observed cues. A backside end read can change who must be blocked after the keep; that is an assignment/option rule, not a pre-snap guarantee that either option works.

**QB movement checks:**

- [ ] **QBR-01** — Does the installation distinguish blocked edge, deliberately read edge, and backside hinge threats?
- [ ] **QBR-02** — Does the chosen QB keep/give depend on an observed defender cue, not a direct hidden `runFit` or play label?
- [ ] **QBR-03** — Does the QB's actual body/ball exchange permit the guard/tackle to cross without ghost collisions?
- [ ] **QBR-04** — Do the OL call and the RB's fake direction remain coherently installed even after a QB keep?
- [ ] **QBR-05** — Can a read defender play the mesh patiently and defeat an option without automatic overcommitment?
- [ ] **QBR-06** — Does the puller preserve the physical same-body capability and technique whether the ball is QB or RB held?
- [ ] **QBR-07** — Does Counter Bash keep the backside run/jet action distinct from the QB's downfield threat?
- [ ] **QBR-08** — Can a defender who crosses the puller's face legitimately disrupt the QB mesh/launch point?
- [ ] **QBR-09** — Are the QB's first two steps, RB fake, puller first step and defender's read correctly time-ordered?
- [ ] **QBR-10** — Does the RB fake move physically enough to be observable without forcing the defense to bite?
- [ ] **QBR-11** — Does the designed QB run use the same tackle laws and basic locomotion restrictions as an RB of similar mass/capabilities?
- [ ] **QBR-12** — Can a puller with correct assigned LB still fail when the defense replaces him via an exchange?
- [ ] **QBR-13** — Does front/box arithmetic correctly count an unblocked read defender only *once*?
- [ ] **QBR-14** — Are mirrored give/keep traces tested with actual formation and read-side symmetry?
- [ ] **QBR-15** — Can a physically poor QB cut make an otherwise blocked lane less productive without a ratings-only penalty?
- [ ] **QBR-16** — Does a failed read show which acquired cue was wrong and when the QB could have observed it?

---

## 5. Common defensive reactions and coaching tradeoffs

A good simulation of pulling cannot exist with passive or instantly omniscient defenders. The same offensive pull should create **different interactions** against a range of legitimate counter-techniques. Defensive “wins” should not be introduced by a global anti-puller force multiplier; the defender attempts actual positions and physical actions and the engine determines whether they succeed.

### 5.1 Edge reactions to kick and perimeter motion

| Defensive answer | What the defender attempts | Expected offensive challenge | What to test |
|---|---|---|---|
| **Box/contain** | Keep outside arm/shoulder leverage; turn carrier back in | Kick/wall must widen enough or RB cut inside; perimeter lead must handle force | Edge remains outside when able; no impossible hook |
| **Spill / wrong-arm** | Strike inside of kicker, reduce gap, force ball outside | Physical kick→log transition; second puller/DB replacement becomes critical | Actual shoulder and force, not label-driven log |
| **Squeeze** | Compress inside gap off a down block, reduce pull entry | Puller must adjust strike; can be delayed/crowded | Real tackle/down-block geometry and changing angle |
| **Upfield / mesh charge** | Race to exchange depth | Puller may trap or redirect contact, or lose the race | First contact depth and first achievable intercept |
| **Sit / slow play** | Refuse penetration, keep balanced two-way leverage | Trap target doesn't obligingly run into contact | A trap may fail against patient defender |
| **Surf / feather** | Stay square/lateral and preserve RB/QB decision leverage | RB/option cannot exploit automatic crash | Observed movement with realistic reaction delay |
| **Stunt/slant** | Cross OL assigned surface early | Down/pin ownership changes; pull gap may be exposed | Perception, reclassification, physical penetration |

### 5.2 Linebacker reactions

- **Fast scrape over top:** LB runs playside off his fitted gap; guard/tackle must intercept path or be defeated. His speed must originate from his movement capabilities and cues, not a pursuit teleport.
- **Shoot interior vacated gap:** LB attacks guard/tackle departure; center/hinge/TE might need to account for him. A missed gap pickup may kill the play early.
- **Plug/downhill fit:** LB inserts at his gap landmark; a runner pressing the wrong landmark can run directly into him.
- **Scrape exchange:** Edge and LB swap gap ownership; the offense should be forced to react according to acquired evidence and installed counters.
- **Slow play/cutback hold:** LB stays backside against moving zone; the RB may find fewer backside windows, but a legitimate cutback may still appear if the OL obtains leverage.
- **Flow to puller:** A defender reads actual pulling motion with finite recognition and misdirection susceptibility, rather than knowing the offensive play's internal `kind`.

**Coaching implication:** A puller cannot always pick a single LB coordinate at snap and sprint there. But he also cannot automatically reassign to whichever defender will tackle the runner. Real coaches define installed rules—point LB, first color in hole, near hip of wall, inside-out force, first threat across face—and athletes execute them with finite observation and movement.

### 5.3 Counterfactual defender checks

- [ ] **DEF-01** — Does a box end preserve outside access when physically able without a universal anti-kick bonus?
- [ ] **DEF-02** — Can a wrong-arm end force a real kick/log challenge and allow an actual second-level force DB to replace him?
- [ ] **DEF-03** — Does a squeeze make the gap visibly narrower before the pulling guard enters?
- [ ] **DEF-04** — Does a penetrating DL create load, collision and RB access problems rather than an abstract block-loss event?
- [ ] **DEF-05** — Does a sit-and-wait defender make some trap blocks harder, not easier by acting as a stationary target?
- [ ] **DEF-06** — Does a defender recognize a pull only after observed shoulder/hip/movement cues become available?
- [ ] **DEF-07** — Does a LB on a backside cutback job preserve that responsibility through generic offensive flow until a legitimate trigger changes it?
- [ ] **DEF-08** — Can an LB initially step incorrectly from misdirection and then recover at an attainable speed?
- [ ] **DEF-09** — Does a fast-flowing LB occasionally outrun a proper wrap while a poor LB is intercepted, using the same shared mechanics?
- [ ] **DEF-10** — Is the defensive front's explicit box/spill/lag/force responsibility preserved through contact-layer updates?
- [ ] **DEF-11** — Does a force/corner play against Crack Toss remain viable even after an inside WR crack is successful?
- [ ] **DEF-12** — Can a defender who is still physically contacted tackle a runner if his actual path and reach are unobstructed?
- [ ] **DEF-13** — Does a defender blocked on the wrong side remain relevant, rather than engagement magically removing him from the play?
- [ ] **DEF-14** — Does a defender's run fit use only acquired OL/RB/QB motion, except for pre-installed team knowledge and haptic contact?
- [ ] **DEF-15** — Do otherwise identical power/counter/jet motions sometimes elicit distinct *learnable but imperfect* defensive reads?
- [ ] **DEF-16** — Is an authentic defensive success retained when an offensive fix removes a real mistake elsewhere?

---

## 6. The cross-concept simulation acceptance suite

### 6.1 Use a layered rubric, not an outcome threshold

Test each concept at six layers; a later layer never retroactively certifies an earlier layer:

| Layer | Simplest question | Suggested observable | Typical failure |
|---|---|---|---|
| **Install** | Is everyone's responsibility accounted for? | IDs, gap ledger, named kicker/wrapper, read defender | Two players take one threat; vacated guard gap uncovered |
| **Departure** | Do the correct players move on time, with appropriate opening? | first motion, body facing vs travel, depth, first-step command | guard stationary, all pullers use same technique |
| **Traffic** | Can they clear moving peers and DL? | swept distance, collision impulses, route changes | clipping center, 0.35-rad orbits, deadlock |
| **Acquisition** | Does the player see/select the right reachable threat? | observed picture/age, key, target switch, intercept feasibility | hidden engagement leak, stale LB position |
| **Contact** | Does meaningful body/hand contact occur? | first positive normal/tangent impulse, support, contact span | assignment tagged as a win without force |
| **Whole football** | Does the block actually protect the runner's route? | corridor denial, first-contact defender, before/after contact, adverse cases | contact on wrong shoulder, RB outruns, scripted touchdown |

### 6.2 “Simple checks” have three statuses

Every checkbox above should produce **Pass / Fail / Not applicable**, plus evidence. A pass might mean “the guard correctly used the coached open-pull approach and cleared center”; it must **not** mean “the team gained at least four yards.” When evidence is missing, return **Not observable** rather than Pass. Distinguish the additional status **Explicit legitimate defensive win** when assignments/requests were correct but the defender prevailed physically.

Test names should say what they prove:

- **Install contract:** exact role/target identity, blocked/unblocked responsibility ledger, no hidden reassignment.
- **Controller contract:** consumed information → chosen move, route, technique and blocker handoff; no physics claims.
- **Physical contract:** body movement/contact/force/support satisfy known rules; no tactical intent claims.
- **Film/football review:** observable on-field quality and errors, qualified by frame/censor limits.
- **Statistical checkpoint:** distribution and NFL reference, not a mechanism proof.

### 6.3 Essential micro-scenario matrix (create once, reuse across all concepts)

| ID | Setup | Primary check | Preserve contrasting result |
|---|---|---|---|
| `M01` | Unloaded guard, open pull right/left | first step, turn and acceleration | unopposed regular first-level approach |
| `M02` | Guard pulls behind center back block | moving body clearance, no looping | direct path when center leaves room |
| `M03` | Center forced backward into pull corridor | adapt or fail without ghosting | original clear control |
| `M04` | Tackle down-blocks with DT driving into him | first guard clearance, protected hip | defender may win physically |
| `M05` | Two guards pull on Buck, matched speeds | sequencing, clearance, kick and wrap | valid stagger maintained |
| `M06` | Second puller slower/faster | no guaranteed arrival or magic acceleration | both legitimate wins/losses |
| `M07` | Static EMLOS near kickoff point | actual shoulder fit and first load | no automatic displacement |
| `M08` | Edge squeezes hard toward down blocker | kick/contact change | still possible to contain |
| `M09` | Edge wrong-arms/spills | log/wash and runner response | edge force/DB replacement alive |
| `M10` | Edge charges QB/RB mesh | first puller angle/penetration | true emergency miss possible |
| `M11` | Linebacker sits square | second-level gather | no useless overrun |
| `M12` | LB scrapes across late | acquired interception | late/failed wrap possible |
| `M13` | LB plugs while DL pin holds | redirect or legitimate stop | correct defensive gap fit |
| `M14` | Down DL slants across a vacated gap | account for first-level threat | do not guarantee play success |
| `M15` | Exact mirror of each 1–14 | geometry/behavior symmetry | real personnel asymmetry if not mirrored |
| `M16` | Power same play vs Over/Under/Bear/Tite | ownership changes | no front-specific teleport |
| `M17` | Pin-and-Pull covered/uncovered front swap | puller identity changes | penetrator still accounted for |
| `M18` | Attached Y vs off-ball H cross action | start/route difference | both physically credible |
| `M19` | Crack WR inside, RT outward, static DB | dual job acquisition | crack alone not a force win |
| `M20` | Crack replacement: DB fills outside | force intercept viability | legal defensive win |
| `M21` | Two-puller + RB mesh in same area | no mesh deadlock | failed exchange scenario retained |
| `M22` | Correct block, early RB outrun | runner timing error | delayed patience can improve without slowing global RB |
| `M23` | Guard first contact at speed, moving LB | braking, support, strike | physical overrun/whiff possible |
| `M24` | Safe blocker changes target after cue | acquired state only | test private-state stripping |
| `M25` | Repeat same fixed seed with observers | exact body/command/event/RNG parity | useful diagnostics remain no-op |
| `M26` | Loaded block run at multiple substeps | contact, support and meaningful ending convergence | legitimate solver limitation reported |
| `M27` | Failed first-level block, excellent second-level wrap | guard cannot retroactively protect runner | second level still recorded useful |
| `M28` | Excellent first-level kick, LB missed | partial success, real tackle | no false complete-play success |
| `M29` | 1st & 10 baseline roster and a new roster | genuine population transfer | do not retune to one team |
| `M30` | Random ordinary games + selected low-gain film | repeat-frequency check | negative results and censored plays preserved |

### 6.4 Required “first difference” workflow for each failed check

1. Identify the **first timestamp where the tested and reference trajectories diverge**, not the final changed rush result.
2. Determine whether the difference begins in *installation*, *perception*, *chosen behavior*, *contact adjustment*, *teammate spacing*, or *World physics*.
3. Capture raw intent, adjusted intent and achieved movement at that timestamp. The same requested path might be limited by support, ordinary collision or wrong physics; don't change planning to conceal a physical law defect.
4. Reconstruct the closest **smallest independent physical or football mechanism** with positive and negative controls. Re-run only the affected scenarios first.
5. Keep a saved defense victory and an unaffected unrelated run family. If the patch changes their whole-play outcomes, determine exactly why; don't rely only on matching yardage totals.
6. Recheck fresh cohorts, both directions, selected fronts and different athletic profiles. Separate *mechanism improvement* from average-yardage improvement.
7. Freeze source commit, flags, roster and seed, operator revision and exact test results. Different branches are not interchangeable baselines.

**Critical:** A positive `e.hands.normalForce` or `tangentForce` is a measurement of load, not automatic lane protection. An engagement or `win ≥ 0.6` is not an independent proof of a legally reachable tackle. A controller's read should not directly inspect those private fields unless it represents its own local proprioception; other players use their own delayed acquired picture. [R1][R3]

### 6.5 Suggested grading shorthand for filmed snaps

To enable fast human/agent reviewing, tag each puller once per play for:

`START` (correct first action) · `CLEAR` (safe timely departure) · `TRACK` (correct corridor) · `READ` (valid cue/target) · `FIT` (usable shoulder/intercept) · `LOAD` (actual contact) · `PROTECT` (runner-route delay) · `FINISH` (support, recovery, sustained effort)

Values: `good`, `incorrect`, `legitimate loss`, `unknown`, `n/a`. Keep **cause** distinct from **outcome**. Add `time`, `defender ID`, `player ID`, `earliest defect` and a five-frame evidence window. This gives agents a finite way to compare hundreds of snaps without claiming all unexpected negative rushes are bugs.

## 7. Instrumentation and proposed implementation interfaces

This is an **instrumentation proposal**, not a claim that the current engine exposes all fields. The repo already has relevant controllers and traces; create **observation-only adapters** first and avoid changing the runtime merely to obtain an attractive dashboard.

### 7.1 Where this maps into the current repository

| Concern | Current related surface | Suggested review |
|---|---|---|
| Blocking installation | [`src/sim/behaviors/blocking.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/sim/behaviors/blocking.ts), `planRunBlocking` | Whole-line threat ledger, covered/uncovered, first vs second puller |
| Individual run technique | `RunBlocker`, `zoneFlow`, `readPull`, `attack`, `plannedClimb` in `blocking.ts` | First-step policy, release/turn-up, near-strike acquisition |
| Joined combo | `keeperCandidate`, `readJoinedCombination`, `resolveJoinedCombination` | Keeper security vs access; never assume release=success |
| Contact execution | [`src/sim/engagement.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/sim/engagement.ts) | Real hand load, shared surface, defender work-off and touch |
| Physical ability | `src/physics/` movement, support and World | Requested vs achieved motion, support, yaw, collision and impulse |
| Peer navigation | [`src/sim/spacing.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/sim/spacing.ts) | Pull corridor before/after spacing; unnecessary loss of intent |
| Gap/read/carry | [`src/sim/live-gaps.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/sim/live-gaps.ts), `run-read.ts`, `behaviors/carrier.ts` | Acquired crease vs commanded path and actual entry |
| Defense | [`src/sim/run-fits.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/sim/run-fits.ts), `behaviors/defense.ts` | Box/spill/scrape, run-fit communication, backside cutback |
| Play definitions | [`src/playbook/concepts.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/src/playbook/concepts.ts), `types.ts`, `formations.ts` | Distinguish called scheme from installation variant and formation |
| Legacy/audit packs | [`scripts/diag/run-concept-process.ts`](https://github.com/tannerthardy/football-simulation-/blob/develop/scripts/diag/run-concept-process.ts), [`docs/VALIDATION.md`](https://github.com/tannerthardy/football-simulation-/blob/develop/docs/VALIDATION.md) | Existing reproducibility and hierarchical assessment |
| Perimeter prototypes | [PR #99](https://github.com/tannerthardy/football-simulation-/pull/99), `docs/reviews/perimeter-runs/README.md` on the prototype branch | Buck/Pin-Pull/Crack Toss are **prototype scope**, not assumed integrated |
| Puller second-level study | [PR #140](https://github.com/tannerthardy/football-simulation-/pull/140) | Acquired wrapper information, job allocation, and deep-force collection |
| Combo surface review | [PR #126](https://github.com/tannerthardy/football-simulation-/pull/126) | Approach frame vs contact frame consistency; still review stage at time of writing |
| Zone lab and oracle | `scripts/diag/zone-lab/` on [`claude/zone-run-breakthrough`](https://github.com/tannerthardy/football-simulation-/tree/claude/zone-run-breakthrough) | Counterfactual entry and film; original experiment, not a live baseline by implication |

**Branch hygiene:** Fetch the accepted `develop` commit again before any implementation. Prototype branches can carry older source, parks and experimental flags; do not merge all their ancestry simply to reuse a concept or diagnostic. For each comparison, pin exact source and flags. A historical matched experiment is evidence for its stated source, not proof of current default behavior.

### 7.2 Proposed per-player trace record

```ts
// Proposed schema only; not a repository type.
type PullerTraceFrame = {
  playId: string;
  t: number;
  stage: 'snap'|'departure'|'clearance'|'kick'|'log'|'wrap'|'climb'|'contact'|'recover';
  actorId: string;
  calledScheme: string; installationVariant: string; role: string;
  // Tactical truth for the offline evaluator (NOT visible to player policy).
  installedGap?: string; installedThreat?: string;
  // Acquired cues: each carries its own read timestamp and uncertainty.
  consumedPicture: Array<{id: string; observedAt: number; pos: [number, number];
    vel: [number, number]; pose?: string; confidence?: number}>;
  selectedTechnique: string; selectedKey?: string; selectedContactHalf?: string;
  rawIntent: {vx:number; vy:number; facing?:number; effort?:number};
  postContactIntent?: {vx:number; vy:number; facing?:number};
  postSpacingIntent?: {vx:number; vy:number; facing?:number};
  achieved: {pos:[number,number]; vel:[number,number]; facing:number;
    supportState?:string; availableTraction?:number; availableTurn?:number};
  // True physics only in observational/offline evidence, not in `sim.see`.
  contacts: Array<{otherId:string; kind:string; impulse?:[number,number];
    normalForce?:number; tangentForce?:number; jointReachValid?:boolean}>;
  progress: {centerCleared?:boolean; tackleCleared?:boolean; turnedUp?:boolean;
    actualAttackSide?:string; runnerEntryT?:number; defenderFirstContactT?:number};
};
```

Recommended event IDs (in addition to frames):

`PULL_FIRST_STEP`, `PULL_CLEAR_CENTER`, `PULL_CLEAR_TACKLE`, `PULL_FIRST_TARGET_CUE`, `PULL_KICK_ATTEMPT`, `PULL_LOG_ATTEMPT`, `PULL_TURN_UP`, `PULL_FIRST_LB_CONTACT`, `PULL_BRAKE`, `PULL_BLOCK_LOST`, `RUNNER_REACH_ENTRY`, `FIRST_RUNNER_CONTACT`, `WHISTLE`.

Use **actual positive impulses** for contact; acquisition/engagement can be recorded separately. A selected target is **not** a contact event. A defender within ~1.5 yards is a proximity proxy, not loaded hand contact.

### 7.3 Small proposed contracts in plain English

**Test: Power guard clears the center.** Set a real center back block and a pulling guard. At the first free-space phase, the guard should ask to move on a credible skip/lead track. In the simulation, his swept body envelope must not pass through center without actual collision. The guard either clears or remains delayed because physical geometry genuinely prevents it. Move center 0.5 yard out of the corridor; the guard should clear more easily, with no speed cheat.

**Test: Counter first puller versus wrong arm.** Give the guard the called EMLOS kick. Run one end squeezing/boxing and one end wrong-arming, with identical body capabilities. The puller should retain the same learned kick *intention* if the team uses that philosophy; contact geometry may then convert the result into a log. Another team's explicit kick/log recognition controller may choose a different technique after acquiring the cue. In either system, the second puller and RB should respond to the achieved surface, not an omniscient event flag.

**Test: Pin-and-Pull eligibility.** One formation, switch a nose from head-up to a shade and add an inside 3-tech. Verify that covered/uncovered roles and pullers change **under the specified pin rule**. Then confirm that every penetrator either has a valid assigned owner or is an explicit unblocked read. Do not certify from the identities of the pullers alone; run the early prefixes to see if paths are executable.

**Test: Crack Toss force collection.** Freeze a reduced WR crack on a DE and a RT leading toward a CB. The WR can make legal loaded contact while the RT legitimately misses the CB: that's a permitted **bad whole-play result**. Perturb only CB width; does the RT select a different attainable approach, with measured first load and runner timing? Preserve a legitimate unblocked force win.

**Test: GT wrap gather.** The first guard makes a good kick and the tackle clears him. Give the LB three behaviors: sit, scrape, sudden reverse. The tackle's contact attempt must be supported by plausible braking and torso turn; arrival inside striking distance doesn't count without actual load and correct lane side. A late reverse must produce a possible miss rather than perfect future knowledge.

### 7.4 Proposed low-cost analysis utilities

```
trace_first_difference(playA, playB):
  compare in order: installed call/roles → acquired cue → command before
  contact → contact adjustment → teammate spacing → achieved movement →
  actual contact → RB path → finishing
  return earliest substantive divergence with both player IDs and time

score_puller_rep(play, actor):
  report role correctness, departure latency, center/tackle clearance,
  distance/depth, first target cue, first actual load, position at RB arrival,
  and first defender to contact the runner; never return a single "win" score

find_unprotected_corridor(play, runner):
  compute actual swept runner path; identify interceptors from their achieved
  bodies and movements; separate direct body blockers from hand-load defenders;
  assess true route access offline and runner's delayed picture separately
```

**Do not let the actor call `score_puller_rep()` or `find_unprotected_corridor()` as an oracle**; those include ground truth and other agents' true state. An agent policy can use its own finite perceptions and felt local contact, while an observer grades outcomes offline.

### 7.5 What is and is not measurable in today's reduced physics

| Measurable now or through modest observation | Needs a richer biomechanical representation if literal |
|---|---|
| Center-of-mass path, velocity, facing, turn delay | Exact left-foot/right-foot landing location |
| Stance readiness, support/lean, momentum and workload | Exact heel/forefoot pressure distribution |
| Collision and hand joint loads, relative slip, forces | Anatomical hand/finger sequence and independent elbow angles |
| Center/tackle clearance and turn-up time | Precise crossover gait phases as measured by mocap |
| Useful protection geometry and runner first contact | Literal helmet/shoulder pad microgeometry in 3D |
| RB-perceived defenders vs true defender positions | Human visual attention without a separately calibrated attention model |

This is why the first acceptance layer should be **supportable physical consequences**, not a claim that the simulator reproduces a textbook's exact foot diagram with anatomical accuracy.

---

## 8. Experiments, benchmarks and agent handoffs

### 8.1 Run small tests before running a thousand games

Suggested sequence **for each newly implemented technique or play**:

1. One **unloaded single-player** departure right and left: initial command, support, facing, speed, turn.
2. Add a **moving teammate** in the departure corridor: clear versus blocked.
3. Add a single **real defender**: kick/squeeze/spill or wrapper vs stationary/scraping LB.
4. Add the adjacent **down block**: test useful side and physically earned contact, not a scripted target.
5. Add the second puller and RB: verify convoy timing, mesh and protection.
6. Add a full **11-on-11** ordinary play with one successful and one legitimate negative defensive counter.
7. Test exact mirrors, fronts, personnel/formation variations and novel roster pairs.
8. Only then compare broad distributions against a common NFL data operator; keep independent holdouts.

That is typically cheaper and much more causal than changing a puller speed parameter and comparing a league rushing mean.

### 8.2 Measure football timing relative to the right events

Align against the snap, first puller readiness, start of physical approach, first load, handoff and runner crossing LOS. A different handoff delay can make an identically timed guard block feel early or late. Use actual event windows and censor unobserved endings; don't extrapolate a short play's final live frame to 3 seconds.

Metrics worth plotting by concept/front:

- Puller lateral displacement at 0.25/0.50/1.0/1.5 s; longitudinal depth; achieved speed; torso and movement directions.
- Guard clearance and turn-up distribution, first contact relative to LOS, speed before contact, deceleration into hit, actual normal/tangent impulse.
- Second puller relative distance/heading behind first, teammate collision counts, times inside a viable first-level opening.
- Attacker and defender movement while attached, first-level security after release, first LB contact before RB arrival.
- Who reaches the RB first (end, DT, LB, force DB), their assignment, their physical engagement state, and **where** first contact happens.
- RB arrival and route choice, yards **before** contact, yards **after** contact, odd long-tail finishing; never treat average yardage as proof of correct pulls.
- Clear/failed/ambiguous/censored examples, conditional on offensive talent, front, run direction and formation.

### 8.3 NFL tracking and film: what can be compared fairly

You can compare **positions, displacements, relative velocity, turn rates, motion-to-line timing, proximity, space occupied, and runner path** after matching the concept, role, game situation and observation window. NFL tracking cannot directly reveal all coach instructions, whether a player intended a kick or log, exact foot loading, actual hand normal force or the chosen runner read. Proxy measurements must be labeled as proxies.

When measuring defensive flow, distinguish the **defender's actual achieved lateral motion** from the simulator's intended play-call side, and avoid insisting that every backside or force player move playside. Comparing Buck Sweep or Pin-and-Pull to generic outside-zone tracking without concept labels is not a clean technique test.

**Suggested benchmark grading:** `correct mechanism / plausible but uncalibrated / contradicted by film / not observable`. Use distribution targets as *diagnostic leads*, not hidden tuning mandates; no universal “first load must happen by 0.8 seconds” rule applies to every play. If an outcome is realistic only because of artificial player strength or impossible knowledge, do not accept it.

### 8.4 Assign separate ownership without an interface tug-of-war

- **Run/OL technique owner:** assign install + selected first-step technique + attack half + pull/clearance/fit response. Must not modify World contact/strength to force a good gain.
- **Physics owner:** verify one shared body/contact/support law; investigate violated force/momentum/turn/foot support with isolated witnesses. Must not hide bad coaching decisions by changing global strength or grip.
- **Defensive owner:** cover box/spill, scrape, exchange, pursuit, recognition and legal defensive outcomes. No automatic knowledge of OL's private target/engagement.
- **RB/decision owner:** consume acquired blocker/defender pictures and physical mobility to choose a real entry. No future counterfactual oracle or read of `e.win`/other agents' hidden flags.
- **Measurement/integration owner:** source/flag/fixture pins; reproducibility, observer parity, held negative cases, exact admitted file scopes and compatibility with passing contracts.

**If two owners disagree**, first preserve a no-change neutral observation of one exact witness. Use the first wrong request vs first wrong achieved motion to resolve ownership. Don't let both teams retune the same problem independently.

### 8.5 Acceptance gate for a new play family

A play family is **not ready** merely because one call reaches 4+ yards in a cherry-picked clip. Promotion should require:

- [ ] **PROM-01** — Written named installation for OL, TE/H/WR, QB/RB and defense-readable cues.
- [ ] **PROM-02** — Front/formation/strength variations have valid responsibility ledgers; no accidental free DL unless explicitly intended.
- [ ] **PROM-03** — Pull footwork and timing physically plausible under normal movement/collision law.
- [ ] **PROM-04** — At least one realistic kick, one adverse squeeze/spill and one legitimate defender victory reproduced.
- [ ] **PROM-05** — If two pullers, both independently acquire **useful** targets and can avoid one another without magic spacing.
- [ ] **PROM-06** — Match first successful contact with actual supported load, not a trajectory label.
- [ ] **PROM-07** — RB decision uses acquired cues; no access to the true plan of defenders or future route outcome.
- [ ] **PROM-08** — Actual 11-on-11 tests include mirrors, Over/Under/odd/Bear/Wide 9 as relevant.
- [ ] **PROM-09** — New lineups/seeds preserve the mechanism, even if result distributions differ.
- [ ] **PROM-10** — Passing controls (normal Duo/IZ/OZ, successful defense, stalled penetration, lost contact) remain in the suite.
- [ ] **PROM-11** — Flags/settings and source hashes pinned; no unrelated changes bundled.
- [ ] **PROM-12** — Explicitly note whether moving-foot literal anatomical details are modeled or only inferred from reduced-body motion.
- [ ] **PROM-13** — No known illegal crackback, chop or impermissible blocking behavior is silently treated as a legal success.
- [ ] **PROM-14** — Whole-play gains and NFL scaling have been checked *after* mechanism acceptance, not used to bypass it.

### 8.6 Ten high-value investigative questions to hand directly to an agent

1. **Does a pulling guard understand the difference between running behind the center and clearing his physically moving body?** Trace smallest path, actual clearance, rejected commands and first physical disagreement.
2. **Can a GT second puller read the first guard's kick/log without using a hidden outcome label?** Compare identical early prefixes with end squeeze and spill after the first acquired picture.
3. **Does the wrap gather when the linebacker starts scraping?** Record intended heading, actual arrival speed and contact relative to the runner's alley.
4. **Do two Buck pullers preserve relative spacing through the turn?** Compare ordinary clean two-guard traffic and intentionally bad line width.
5. **Does front-dependent Pin-and-Pull still account for all penetrating first-level threats?** Trace per-front original assignments and first 1.5 seconds of loaded contact.
6. **Can a Crack Toss RT reach and meaningfully block a force corner *before* the pitch runner arrives?** Keep the legal inside crack but allow authentic force DB wins.
7. **When an edge wrong-arms a kick, does physical contact produce a plausible log with a coherent RB/second-puller response?** Don't change one behavior to guarantee that outcome.
8. **Does Trap use a defender's actual upfield charge against him?** Compare charge, sit, squeeze and slant with same identities.
9. **Can a released combo member depart quickly without exposing a defeated keeper?** Distinguish release judgment, departure execution and remaining physical security.
10. **Are observed good first steps and actual gains robust to new fronts and slower/stronger athletic profiles?** If not, identify exactly which technique lacks transfer.

---

## 9. Quick-reference glossary

| Term | Short coaching meaning | Common simulation mistake |
|---|---|---|
| **Open / bucket step** | Turn and clear the direction-of-pull foot; begin lateral run | Instant full yaw or excessive deep retreat |
| **Flat / square trap pull** | Travel tight along LOS to strike a first-level defender | Drive toward static opponent center while ignoring moving center |
| **Skip / square Power pull** | Crossover replacement, relatively square shoulders, ready for vertical insert | Blocker runs laterally forever without turning up |
| **Lead / wrap pull** | Get around previous blocker, turn into a LB or alley defender | Orbit around an old waypoint or sprint past LB |
| **Down / pin block** | Occupy/seal inside threat, often to free a puller | Graded purely by pushing defender back |
| **Kick-out** | Work inside-to-out to widen/deny a force/edge player | A “kick” tag awarded with no loaded contact |
| **Log** | Wall/turn a spill/wrong-arm defender inward, potentially opening outside | Teleport defender inside because wrong-arm event occurred |
| **Wrong-arm / spill** | Defender attacks inside of the kick to spill the ball outside | End automatically loses block when he should force new threat |
| **Box / force** | Keep ball contained, often outside arm free | Every defender just chases RB laterally |
| **Insert** | Blocker leads up a gap and fits an interior/LB threat | Targeting LB's old center instead of interception |
| **Scrape** | LB moves over the top while keeping gap leverage | LB given perfect fast path at recognition time zero |
| **Wham** | H/TE traps a named intentionally unblocked interior defender | Reusing outside-end slice geometry for nose/3-tech |
| **Slice / sift** | H/TE crosses formation for backside end or 2nd-level work | Ghost collision through RB/QB mesh |
| **Arc release** | Skill blocker bypasses first edge to next-level force/read role | Edge gets counted blocked without actual contact |
| **Crack / crack-replace** | WR/TE blocks inward; another defender may replace force | Crack credited as covering both inside and outside threats |
| **Cutback** | RB turns behind horizontal flow as defenders overrun | Simulator treats a defender being run wide as an OL failure |
| **Coverage/keeper** | Remaining member of double must protect surface while other leaves | One shared `win` scalar used to grant first-level security |
| **First useful contact** | Actual load that interferes with route in time | “engagement created” used as equivalent of block delivered |

---

## Sources and further study

The references below are **coaching/football context**, not calibrations of the physics solver. Accessible portions of paywalled clinic material were used only for what they explicitly state. This handbook is an original synthesis, not a recovered proprietary playbook. Footstep angles and depths are *examples of specific coaching families*; teams vary. References `[R]` are project provenance for **historical or experimental findings** and must not be treated as proof of the current accepted engine.

### Practitioner/coaching references

- **[S1]** Keith Grabowski, USA Football, [*Teaching the square pull*](https://blogs.usafootball.com/blog/1630/usafootball.com/nc19podcast) (2016). Trap/counter opening step, hip aim, inside strike, half/full-line rather than only cones.
- **[S2]** Coach Rich Alercio, [*Pull Steps*](https://olineskills.com/2020/04/16/pull-steps/) (2020). Distinguishes flat, lead and skip pulls and their different hip orientation and first step.
- **[S3]** Chris Booth/USA Football, [*4 blocking drills to apply technique on the offensive line*](https://blogs.usafootball.com/blog/1277/4-blocking-drills-to-apply-technique-on-the-offensive-line) (2016). Stance, open step, kick/lead distinction and grading criteria.
- **[S4]** Stanford pulling instruction summarized by FootballScoop, [*Stanford Skills: pulling guard on Power*](https://www.footballscoop.com/2025/03/04/stanfordskills-video-teaches-you-the-coaching-points-for-the-pulling-guard-on-the-power-play) (original 2015 feature; URL may vary). Skip/square and inside-out LB approach. Summary was retrievable; original page may restrict automated reading.
- **[S5]** Nike Coach of the Year Clinic / Alex Atkins, Coaches Insider, [*Flat & Skip Pulls*](https://coachesinsider.com/football/offensive-line-flat-skip-pulls-with-alex-atkins-florida-state-univ/) (2024). Flat-pull edge reads; second puller's near-hip and LB fit.
- **[S6]** Lauren's First and Goal clinic report, [*Non-Negotiable Kick Outs: Derron Gatewood's Texas pull circuit*](https://lfgclinic.com/post/Derron-Gatewood-Texas-OLine) (2026). Same-side kick mechanics; squeeze, wrong-arm/spill, mesh charge; implicit log vs prescriptive decision.
- **[S7]** Justin Iske, X&O Labs, [*Blocking Problematic Fronts in the Spread Power Scheme*](https://www.xandolabs.com/the-lab/offense/run-game/gap-run-concepts/blocking-problematic-fronts-in-the-spread-power-scheme/) (2015). First-level assignment ledger, back block/hinge, skip/square LB pull. Detailed continuation may be subscriber-only.
- **[S8]** [*Power Run Play: Blocking Rules and Adjustments*](https://www.sportologyx.com/blog/power-run-play/) (2026). Gap wall, kick, wrap, front adjustments and puller clearance; secondary coaching summary.
- **[S9]** Seven Point Lead, [*Power Right*](https://www.sevenpointlead.com/systems/gun-t/plays/power-right). Reference for one-back/wing kick plus backside guard insert; an example install, not universal law.
- **[S10]** Zach Dunn/USA Football, [*Complementing Counter Trey with an RPO*](https://blogs.usafootball.com/blog/6845/complimenting-the-counter-trey-with-an-rpo) (2018). Backside guard kick, tackle wrap and read variation.
- **[S11]** Ed Warinner/Glazier Clinics, [*Creating Chunk Plays with GT Counter*](https://www.glazierclinics.com/football-coach-resources/learn-the-secrets-to-creating-chunk-plays-with-g/t-counter) (2024). Odd/even/Under front, down-gap responsibility, deuce and point LB.
- **[S12]** [*Counter Run Play: GT Counter and Variations*](https://www.sportologyx.com/blog/counter-run-play/) (2026). Misdirection, first kick and second wrap; secondary coaching summary.
- **[S13]** Coach Dan Casey, [*Pulling the TE on Counter*](https://www.coachdancasey.com/new-blog/pulling-the-te-on-counter) (2021). G/Y counter, attached Y difficulty, playside planning, backside tackle hinge.
- **[S14]** Seven Point Lead, [*Buck Sweep Right*](https://www.sevenpointlead.com/systems/wing-t/plays/buck-sweep-right). Common two-guard first kick/second lead installation and FB fake.
- **[S15]** Wing-T Youth Football Coach, [*Pulling Both Guards*](https://wingt-coach.com/wing-t-reader-qa-pulling-both-guards/) (2015). Guard exit depth and tackle/down-block alignment, one authentic coaching style.
- **[S16]** Ed Warinner/Glazier Clinics, [*Dominate Outside Zone with Pin and Pull*](https://www.glazierclinics.com/football-coach-resources/dominate-outside-zone-run-game-with-pin-and-pull) (2024). Alignment-dependent pullers and alternative classification as outside-zone technique.
- **[S17]** Inside the Pylon / Scouting Academy, [*Pin-Pull Sweep*](https://scoutingacademy.com/itp-glossary-pin-pull-sweep/) (2015). NFL examples, front-selected pullers, down blocks, outer alley and carrier reads.
- **[S18]** Chris Haddad, vIQtory Sports, [*How to Install the Pin & Pull Play*](https://www.viqtorysports.com/pin-pull-what-is-it-and-how-is-it-run/) (updated 2026). Covered/uncovered rule and exceptions; selected scheme, not a universal classifier.
- **[S19]** Nick Kehoe, Football Film Room, [*Toss Crack*](https://www.footballfilmroom.com/p/toss-crack) (2025). Receiver/TE inward crack + pulling tackle to corner/force; public preview, detailed film partly subscriber-only.
- **[S20]** [NFL Football Operations: NFL Rulebook](https://operations.nfl.com/the-rules/nfl-rulebook) (Rule 12 and related contacts). Crackback, blindside, chop and low blocks have specific legality conditions; apply the rule set for the simulated level/season, not this handbook as a substitute for exact current rules.
- **[S21]** Jordan Heldreth clinic reported in FootballCoach.com, [*The Pulling Indy*](https://footballcoach.com/8525-2/) (2026), and independent teaching in [S1][S6]. Kick/log, trap, Power and Dart drills. Original article may intermittently fail to load.
- **[S22]** [LINEPLAY: How to Pull as an Offensive Lineman](https://lineplayfootball.com/training/pulling) and [S21]. General pull mechanics and tackle/guard role families; Dart details vary by install.
- **[S23]** Austin Emerson, X&O Labs, [*Square Drag / Skip-to-Hip in Outside Zone*](https://www.xandolabs.com/the-lab/offense/run-game/wide-zone-run-concepts/square-drag-skip-to-hip-technique-in-outside-zone/) (2016). Covered/uncovered and lateral race; detailed continuation may be subscriber-only.
- **[S24]** Mike Kuchar, X&O Labs, [*Zone Wham Concept*](https://xandolabs.com/the-lab/offense/run-game/tight-zone-run-concepts/zone-inserts-special-report-case-4-the-zone-wham-concept/) (2017), plus [*Sniffer alignment and sift*](https://playside.co/football/sniffer). Interior wham is distinct from end slice.

### Project-specific reviews and current working questions

- **[R1]** [`docs/football-handbook/trenches.md`](https://github.com/tannerthardy/football-simulation-/blob/develop/docs/football-handbook/trenches.md) and [`docs/VALIDATION.md`](https://github.com/tannerthardy/football-simulation-/blob/develop/docs/VALIDATION.md). Mechanics versus installed responsibility; layered validation, one shared physical law.
- **[R2]** [PR #99: Buck Sweep / Pin-Pull / Crack Toss prototypes](https://github.com/tannerthardy/football-simulation-/pull/99). Deep-force acquisition remains a hold; adverse outcomes explicitly retained.
- **[R3]** [`zone-run-breakthrough`](https://github.com/tannerthardy/football-simulation-/blob/claude/zone-run-breakthrough/docs/reviews/zone-run-breakthrough.md). RB perceived creases, experimental `CLIMB_EXIT` departed blocker orbit; default-off until accepted review.
- **[R4]** [PR #126: stretch combination contact surface](https://github.com/tannerthardy/football-simulation-/pull/126). Contradiction between approach half and newly acquired contact frame; not a blanket faster-blocking fix.
- **[R5]** [PR #140: wrapper acquisition and allocation](https://github.com/tannerthardy/football-simulation-/pull/140). Acquired information correction and documented adverse second-level role allocation.
- **[R6]** [`docs/reviews/wide-zone-guidance.md`](https://github.com/tannerthardy/football-simulation-/blob/develop/docs/reviews/wide-zone-guidance.md). Distinguish lateral requests, actual loaded motion, keeper security, attainable climb, path protection, and negative controls.

---

**Recommended working order for agents:** Run `M01–M15` as physical/movement contracts; use `PWR`, `GT`, `BUCK`, `PIN`, `CRK` for the initial five concept installations; only then expand the full front × formation × roster matrix. Do not merge wholesale historical experimental branches to get a prototype concept. Preserve the ability of a correctly coached defender to win.
