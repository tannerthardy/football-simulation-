# Offensive skill and playcalling: translating a call into achievable action

This is an original, engine-oriented teaching chapter for quarterback, running
back, fullback, receiver and tight end play. Its purpose is to make ordinary
football decisions inspectable and to identify small experiments worth building.
A richer vocabulary alone will not make the simulation better. A useful install
tells a player what relationship to create, what to watch, how the answer can
change, and what remains achievable with his current body.

The first priorities are reachable run entry, consistent protection accounting,
and independent receiver/QB interpretations of a small route choice. These
problems can produce poor football with perfectly conserved momentum. Continue
using the shared World for actual movement and contact; prove the instruction
before changing strength, traction or anatomy.

## 1. How to read this chapter

The production snapshot inspected here is commit `7ce3559` on
`claude/engine-priorities`, dated 2026-10-11. Its current priorities and evidence
are in [position technique and awareness](../archive/reviews/position-technique-and-awareness.md).
The installed OL cutoff repair is shipped. The QB torso-direction experiments
and RB entry prototype are **withheld**, not current features. The
[offensive-skill audit](../archive/reviews/offensive-skill-technique-audit.md) describes
the preceding baseline; the source paths inspected again for this chapter are
listed at the end.

Four evidence categories apply throughout:

| Category | What it supports | What it does not support |
| --- | --- | --- |
| **Inspected source fact** | What an existing controller actually reads, requests or stores | Its NFL frequency or whether a particular film outcome was caused by it |
| **Public coaching source** | A named coach's published teaching distinction, within the inspected text | Every team's install, private NFL terminology or a calibrated motor/force law |
| **Coaching synthesis** | An original way to connect coaching problems to this engine | A claim that real players consciously run this exact algorithm |
| **Proposed model/test** | A small falsifiable implementation idea and its acceptance evidence | A shipped feature, measured error rate or guaranteed improvement |

The supplied RB, WR/DB and playcalling books are useful teaching aids. Their
unverified references, invented installations and missing figures do not become
authority merely because they appear in a long textbook. This chapter cites
their exact relevant sections and independently checked public material where
available. It avoids reproducing their prose, tables or an authenticated team
playbook. Team variation is part of the model, especially for landmarks, read
order, release freedom, protection checks and receiver adjustments.

### The common decision contract

For every position, keep five things separate:

1. **Installation:** the called responsibility, teammates' expected jobs and
   allowed answers. It is legitimate to know your own play.
2. **Observation:** the picture the player actually consumed, its age, and what
   he could not currently see. It is not the true defensive call.
3. **Belief:** a revisable interpretation or anticipated future relationship.
4. **Request:** the movement, posture, hand target or ball action chosen.
5. **Achievement:** actual travel, acquired contact, transmitted load, ball
   transfer, release and catch.

A better player should often select a useful key sooner, remember a threat,
arrive with a usable base and make a more precise request. He should not receive
a hidden block-win bonus or access a teammate's private controller state. A
correct decision may lose against a superior opponent; a wrong decision may
survive because the opponent also errs.

## 2. Build small installations rather than a library of guaranteed answers

**Coaching synthesis.** A pass or run name is a family of problems. Two staffs
can call the same concept and teach different points, progressions or emergency
responses. Represent a small install with the following fields before adding
more named plays:

| Install field | Offensive example | Information boundary |
| --- | --- | --- |
| Purpose | Hold an underneath defender with width while creating an inside window | Does not announce what defense will actually do |
| Initial geometry | Split, track, landmark, route distribution and launch area | Establishes expectations, not achieved positions |
| Primary key | Assigned DL/block relationship, apex, point backer or deep help | Must be located and updated through personal observation |
| Adjacent answer | Bend behind a slant; pivot from leverage; throw an installed outlet | Must be authorized and physically attainable |
| Invalidating cue | Penetration, late rotation, lost edge, blocked release or threatened launch point | A timer alone cannot declare the cue occurred |
| Communication | Protection point, receiver tag, motion check or kill | A sent adjustment and a received adjustment differ |
| Situation | Distance needed, boundary, clock, score and field position | Public game state is available; the opponent's intentions are not |

This is a proposed design, not an existing complete schema. Start with one run
read and one option route. Do not implement the entire supplied glossary before
these contracts work. `Player.familiarity` currently means comfort at a position;
it is not evidence that a player has practiced a particular call. If call
training becomes a trait, define its effect on interpretation, coordination and
execution rather than silently repurposing familiarity.

**Ordinary test:** repeated execution of one installed call against its expected
look retains spacing and communication. **Adverse test:** present the same shell
but change one relevant post-snap defender. The player may be late or wrong; he
must not acquire the changed assignment through hidden knowledge.

## 3. Quarterback: protection, information, platform and delivery

### 3.1 Account for the rush before grading the pocket

**Coaching synthesis, informed by playcalling chapters 18–22 and RB section 26.**
A protection plan is a set of responsibilities plus a passing answer. The point
declaration is an accounting reference, not necessarily the anatomical middle
linebacker. A five-player line cannot individually block six simultaneous
threats without another answer. That answer may be a back/TE protector, a hot
throw, an altered release, movement or an accepted risk under an installed rule.

Classify each potential pressure path as:

- Line-owned, including its exchange rule.
- Back/TE-owned, including scan order and release permission.
- Intentionally unblocked with a specific QB/receiver response.
- Unaccounted for, uncertain or miscommunicated.

These are coaching/diagnostic categories, not permissions for a defender to
become a rusher instantly. A mugged player may drop; a deep safety may arrive
late; a nominal DL may exchange into coverage. Grade what was observed and
what actually happened. A correctly counted rusher can still win physically.

**Inspected source fact.** `ProtectionCoordinator` in
[blocking.ts](../../src/sim/behaviors/blocking.ts) provides ordered, sticky
matching. Its `isRusher` also reads defenders' real behavior kinds before
falling back to motion/depth. This is an information shortcut. In
[qb.ts](../../src/sim/behaviors/qb.ts), expected blitz can reorder the progression
to its quickest estimated route; that is not a full shared hot contract with
ownership of a particular free threat.

**Proposed first step:** record the responsibility ledger without changing its
behavior. A pressure report should distinguish a point/count error, missed
exchange, back scan error, individual physical loss, QB hold and unanswered hot.
Do not infer all of these from rusher proximity or assign an OL loss whenever
someone comes within two yards of the QB.

**Minimum tests:** a normal four-man rush; two mugged players with only one
rushing; the same presentation with an actual extra rush; a delayed rusher
after a back's check-release; and a correctly owned rusher winning his block.
Use actual path/time to the launch point, active contact and QB response. No
test should demand that a correctly identified rusher cannot get pressure.

### 3.2 Read the part of the defense relevant to this throw

**Coaching synthesis.** A QB does not need the exact name of every coverage to
execute a useful answer. He needs the relevant safety/help structure, leverage,
conflict defender and pressure path. A corner traveling with motion supports a
man-related hypothesis; it does not prove Cover 1. A two-high shell does not
prove both safeties remain deep. Match rules can resemble man after release.

Use a progression, conflict read, coverage-confirmation branch or
alert-to-progression according to the install. These are different demands:

| Reading system | Primary question | Believable error |
| --- | --- | --- |
| Ordered progression | Can the current route deliver a safe window before its opportunity closes? | Remains on a capped read and reaches the outlet late |
| Conflict read | Which of the paired windows did the observed key surrender, and is help still present? | Sees an apex widen but misses a deeper robber |
| Structure branch | Which installed branch best fits the evolving help/rotation picture? | Anchors to the initial shell despite contrary evidence |
| Alert then progression | Does this particular matchup satisfy its release, help and timing requirements? | Treats favorable cushion as sufficient despite pressure or deep help |

**Inspected source fact.** [QBMind](../../src/sim/qbmind.ts) already has coverage
belief, gaze-related defensive memory and finite confirmation. Preserve those
useful ideas. The pass controller still predicts through the live
`RouteRunner.predict`, including its private path state, and re-aims using that
prediction at release. Knowing the called route is reasonable; knowing a
receiver's independently chosen conversion and exact future after contact is a
stronger assumption. The
[offensive audit](../archive/reviews/offensive-skill-technique-audit.md) documents that
distinction. This chapter does not claim to have measured its causal effect.

**Proposed narrow repair:** the QB predicts an installed route branch plus a
delayed observed receiver state; the receiver chooses his own allowed branch
from his own picture. The QB can correct his expectation only when evidence or
received communication permits. Keep the existing ball law and accuracy model
unchanged for that first experiment so mismatch is distinguishable from poor
delivery.

### 3.3 Make the platform explain delivery limitations

**Coaching synthesis.** The drop and hitch organize where the QB can release
from and when a route reaches its window. Good movement protects the launch
point and gives a usable base. Stepping up may shorten the edge arc, but it can
also move into interior push. A slide may avoid an interior load while exposing
the throw to an edge. A rollout can make one side easier to see and the opposite
side harder to deliver to.

Useful observable cues include the threatened launch area, the QB's own
velocity and body orientation, occupied reset space, the receiver's current
path, throw direction and the available ball-flight window. Do not make a QB
automatically panic because the protection label says “blitz.” Do not let him
escape an approaching rusher through a reach formula that assumes an instant
cut his body cannot execute.

**Inspected source fact.** The existing throw error in `missSigma` depends on
distance/accuracy, urgency/composure, running speed/throw-on-run, energy and
tackle attachment. It does not explicitly simulate the full plant/base/torso/
arm sequence. Throws use a simplified release height and physical flight. This
is useful existing depth, but it does not establish accurate cross-body or
unstable-platform passing. Current throw-window selection and scramble checks
also contain approximations; an attractive computed window is not proof of a
deliverable throw from the actual platform.

**Proposed model:** begin with a compact throw readiness state derived from
achieved movement/support and finite reorientation. Let it affect whether the
QB can start a particular throw and the uncertainty of its placement. A moving
throw can remain possible; requiring every pass to be fully stationary would
remove real football. Do not add named footwork animations, skeletal arms or
independent “cross-body interception” probabilities before the state explains
matched simple cases.

**Minimum platform tests:** the same QB and route from a stable reset, residual
lateral motion, a late failed reset, a glancing hold and a narrowing interior
lane. Record chosen target, perceived pressure, intended aim, actual launch and
ball placement separately. Include a successful moving throw and a bad throw
despite a correct read. A platform hypothesis should alter the action before
the result rather than assigning a miss retrospectively.

### 3.4 Grade incompletions by chain, not one final label

Keep identification, target decision, timing, platform, ball placement,
receiver agreement, physical release, catch attempt and defender disruption
separate. A late window can produce a contested catch without the ball being
poorly placed. A receiver may be in the expected location but have an arm tied
up by contact. A pass can be intentionally discarded. A tip that is caught by a
defender is not the same failure as throwing into a robber's lane.

The local nflverse/FTN references provide drops, catchability and related
charting labels within stated cohorts; they cannot identify the precise causal
thought or throwing mechanics of every play. Preserve unknowns instead of
forcing every incompletion into “pressure” or “drop.”

## 4. Running back: create the read, then take an achievable lane

### 4.1 The first job is a clean, consistent mesh

**Coaching synthesis, RB sections 4, 17 and 29.** Alignment and the early track
shape both timing and what the runner can see. A sidecar gun exchange is not an
under-center exchange with the same timer. The QB must present the ball where
the back can receive it, and the back must preserve a useful transfer posture
while moving toward his track. Read-option makes the QB's give/keep decision
part of the transfer; it does not authorize the RB to improvise a separate read
of the same unblocked defender.

**Inspected source fact.** [handoffReach](../../src/sim/ball-transfer.ts) uses
passer reach plus receiver radius; a distant toss belongs to ball flight rather
than that torso handoff. This is an effective reduced exchange geometry, not a
complete two-arm handoff model or an NFL distance distribution.

**Minimum mesh tests:** matched under-center/gun tracks, an interrupted path,
a late back, a legal moving receiver and an unreachable separation. Verify
transfer ownership and actual reach at transfer; do not credit an exchange
solely because its scheduled time arrived. Replay possession must match the
engine event and interpolation. An apparent far-away handoff may be a rendering
problem, a wrong event frame or a real transfer defect; diagnose those separately.

### 4.2 Track, key, entry and escape are different decisions

**Public coaching fact.** The inspected Glazier summary of Kevin Smith's Ole
Miss inside-run teaching gives a specific inside-zone track toward the center,
controlled tempo, square shoulders and line pressure. It stresses that the
back sees changing first- and second-level pictures. Elijah Brooks' inspected
Glazier summary organizes runs by alignment, landmark, read, steps and tempo,
with personnel adaptation. Neither page establishes a universal NFL aiming
point or numerical patience duration. Full clinic video was not analyzed.

**Coaching synthesis.** An initial track can hold a backer, stretch a front or
allow a puller to form the block. The final entry comes from what the controlling
relationship actually allows. A back who immediately picks the largest visible
hole may release a defender from his conflict; a back who rigidly preserves the
track after penetration may run directly into a tackle.

| Run family | Useful installed question | Adjacent answer, when allowed | Mistake to retain |
| --- | --- | --- | --- |
| Inside/tight zone | Which side of the controlling down block/combo remains viable, then where is the fitter? | A short vertical entry or bend behind observed flow | Bounce into untouched force, or wait for a gap that never opens |
| Outside/wide zone | Did the stretch earn outside access or a vertical seam beside the moving block? | Continue stretch, turn up, or bend with backside security | Continue to the sideline after usable vertical space appeared |
| Split zone | What did the interior read permit, and is the slice actually securing the backside? | Interior entry with a verified adjacent outlet | Assume the called slice equals a completed seal |
| Duo | Which fitted backer/point player declared against the installed double relationship? | Press one side of the double, then use an allowed adjacent entry | Treat any “Mike” as the same universal key |
| Power/Counter | Did the edge block kick or log, and where can the insert/wrap create a path? | Enter beside the resulting leverage without overtaking the lead | Follow the puller directly into his target or outrun his arrival |
| Trap/Wham | Can the invited penetrator be cut off before the runner arrives? | Pass behind the actual trap relationship or take an installed escape | Arrive at the penetrator before the trapper, or wait until recovery closes the seam |
| Toss/Pin-and-pull | Who owns force, where will the first lead fit, and when can the runner turn up? | Stretch or insert beside an actually secured edge | Confuse pitch reception with an already completed handoff |
| Draw | Did rush depth and the second-level response create a usable entry? | Enter the vacated space while honoring retracing pursuit | Assume pass posture means every defender abandoned run responsibility |

This table is a teaching synthesis, not a standardized installation. The exact
key can differ by front, tags and staff. Give each installed call only the
answers it teaches; avoid turning every family into the same unrestricted
search across every gap.

### 4.3 Judge the approach, not only the hole

**Inspected source fact.** `runReadAim` in
[carrier.ts](../../src/sim/behaviors/carrier.ts) creates entries from observed
adjacent blocker centers and checks width, preference and defender reach. The
near-line branch can bypass the broader `evaluate` corridor check and request
top speed toward the entry. A staggered surface can have an attractive endpoint
with an occupied approach. The shared World prevents unrestricted passage but
cannot make that instruction intelligent. The rejected RB prototype retains
evidence of preview/executed differences; it is not a shipped fix.

**Proposed decision:** compare a tiny set of allowed approaches to the moving
near hip of the controlling block. A useful candidate has:

- Sufficient body/ball clearance along the *approach*, including staggered depth.
- A turn and arrival speed attainable under existing movement limits.
- An opening likely to remain until arrival, with uncertainty about blocker motion.
- A usable exit past the block instead of immediate collision with the next fitter.
- A pace/hold alternative only while waiting is safer than observed penetration.

This is a feasibility estimate from consumed observations, not a full future
22-player oracle. A short production movement preview may help an unheld runner;
loaded contact requires either the appropriate loaded preview or conservative
headway. Preview and executed posture must agree. Do not shrink bodies or boost
traction merely because an otherwise valid endpoint is difficult to reach.

**Minimum cases:** an open midpoint with a blocked approach; a legitimately
passable shoulder-turned crease; a late opening; penetration making patience
unsafe; and an ordinary clear entry. Require the chosen approach, rejected
alternative, speed request and achieved contacts. Include a loss where the back
chooses sensibly but the defender closes the lane. Zero collision is not a
universal success condition for an inside run.

### 4.4 Tempo is arrival control

**Coaching synthesis.** Slowing down is useful when it preserves a forthcoming
block or forces a fitter to declare. It is harmful when it allows penetration or
backside pursuit to catch the runner. Distinguish mesh pace, press pace and
entry acceleration, but allow their transitions to arise from observed geometry.

**Inspected source fact.** [onHandoff](../../src/sim/assign.ts) installs an
aiming point and `aimUntil` from handoff time plus patience/puller terms. The
carrier can end the phase earlier in some circumstances; lead pacing already
checks closing threats, and split-zone slice is excluded from the lead read.
Those useful existing behaviors should be preserved. Expiry is not evidence
that a gap has opened or the block has completed.

**Proposed replacement:** a small press state ends when an installed entry is
observably usable, the controlling picture invalidates the track, or continued
press becomes physically unsafe. Finite decision cadence and motor response
remain legitimate effective laws. They must not impersonate visual recognition.
Avoid another family-specific “cut at time T” rule.

### 4.5 Getting skinny, evasion and contact use the same body

**Coaching synthesis, RB sections 5 and 18–21.** Turning a shoulder can reduce
exposure in a crease, but it changes contact readiness and the next available
cut. A juke is useful if it changes the defender's feasible intercept before
the runner loses his own support. A stiff arm requests a reachable contact and
finite force; it is not an automatic broken tackle. A spin consumes finite
reorientation, visibility and ball-security opportunity. A lateral hit can
redirect an upright runner without immediately causing a fall.

Keep these as changes in posture, path, pace, reach and intent under common
contact/support laws. Do not create a separate power-back momentum exception,
small-receiver collision immunity or highlight-move success roll. An occasional
violent collision or teammate pileup can be realistic; its frequency and first
invalid instruction still matter.

**Minimum tests:** the same back enters a clear crease, a marginal turned-shoulder
crease and an actually closed crease; one glancing hit preserves travel; a
square loaded hit prevents the same move; and a delayed cut lets a disciplined
tackler retain leverage. Change physical profiles only in a declared second
panel. Grade requests, support, forces and achieved motion before yards.

### 4.6 Boundary choice is a conflict of football values

The [boundary review](../archive/reviews/carrier-boundary-control.md) already separates
an accidental exit despite an inward request from a deliberate exit to avoid a
costly hit. Preserve that distinction. Contact avoidance can be believable,
especially when protected yards are already secured, but a vague universal
“fear factor” does not explain an uncontested run out of bounds.

**Proposed value model:** the runner weighs attainable yards/conversion, clock,
possession security, predicted contact and the chance that a reversal makes the
result worse. Personal risk preference can influence this decision without
revealing a defender's true intention or claiming measured fear. A four-minute
back often values remaining inbounds; a hurry situation can reverse that value.
Those are situational coaching hypotheses. Historical score-state associations
alone cannot establish a psychological coefficient.

**Minimum tests:** open space with outward momentum, a genuinely unavoidable
exit, an imminent costly contact, a conversion needing one more yard and paired
hurry/clock-preservation situations. Keep both deliberate and accidental exits
observable rather than forcing every runner to stay inbounds.

## 5. Fullback and tight end: a moving responsibility, not a strength multiplier

### 5.1 Separate slice, lead, kick, wrap and sift

**Coaching synthesis from RB sections 9, 12–15 and playcalling chapters 14–18.**
A player crossing behind the line may have very different work:

| Role | Relationship to create | Observable continuation | Characteristic mistake |
| --- | --- | --- | --- |
| Slice on split zone | Meet the backside edge while the RB reads interior leverage | Edge squeezes, widens or crosses the intended fit | Becomes an unintended lead blocker or chases the edge too deep |
| Lead/insert | Put a usable block between the runner and the fitted backer | Backer fills, scrapes or crosses the fit | Runs directly at current backer center and loses the runner's intended side |
| Kick | Control an edge outward relative to intended entry | Edge boxes, spills/wrong-arms or defeats contact | Arrives too fast to fit or assumes any collision is a successful kick |
| Wrap | Pass the first edge relationship and fit the next defender | First puller's result and next fitter's motion | Overtakes the first blocker or collides in the narrow alley |
| Sift/protect | Cross to account for a changed launch-side threat | Actual edge rush/contain response | Treats a route fake as permission to ignore an owned threat |

Exact names and continuation rules vary. An installed log response must be a
real permitted contingency, not a silent change applied after the back gets
tackled. Record which body owns which threat and why a role changes.

### 5.2 Motion creates momentum and a read cost

An off-line TE moving before a split-zone snap can arrive with substantial
lateral momentum. That changes the achievable block angle and braking need; it
does not grant greater strength. The edge's own momentum, posture and response
change what the slicer can reach. The most useful stress test pairs identical
post-snap role geometry with different initial velocities, then varies the
edge's observed reaction.

The [existing stress-test plan](../FOOTBALL_STRESS_TEST_PLAN.md), ST-01, defines
this controlled family and its legality inventory. It distinguishes actual
contact loads from an engagement label. A loaded slice-contact test is not proof
that the full presnap motion/defensive communication system is implemented.

**Minimum cases:** stationary slice, motion with an attainable gather, excessive
momentum, edge squeeze and late wider edge. Preserve an honest miss or spill.
The same support, arm-force and grip budgets must govern the TE's block and an
OL's equivalent contact.

### 5.3 Blocking, release and receiving compete for time

A TE or FB may chip, check-release, leak or run immediately. A chip can alter a
rusher's path but makes the receiver late; a check-release can preserve the QB
and then provide an outlet, but must honor remaining owned threats. A leak uses
convincing movement to change a defender's belief; it cannot invisibly turn off
the defender's responsibility. A max-protection concept gains bodies near the
QB by losing route threats, which changes coverage spacing.

Use the same route/catch and blocking physics as the other positions. The
interesting differences are installed responsibility, observed cue, target
selection, movement capability and execution. A heavy TE can still lose a late
reach fit to a smaller defender with a good angle.

## 6. Receiver: preserve the concept while defeating a changing opponent

### 6.1 A release plan needs a counter and a route deadline

**Public coaching fact.** Drew Lieberman's inspected USA Football article
describes releases as conditional rather than a prescribed move against every
reaction. It emphasizes a preplanned answer, a counter if the DB changes, gaining
useful space and attacking leverage. It also gives an important qualification:
the release that wins a vertical race may not be ideal for a stopping route.
This is one coach's framework, not proof that every receiver should attack the
same side or use the article's precise landmark on every route.

**Coaching synthesis.** Start with the intended final space and timing. A quick
slant has less time for a long release exchange than a deep isolation. Outside
space is limited by the boundary; inside space is shared with teammates and
underneath defenders. The receiver reads the DB's actual feet/body/hand movement
and help, then uses a small conditional tool set. A speed release, leverage
threat and hand clear may suffice before named animations.

**Inspected source fact.** `RouteRunner.handleRelease` already uses bounded
physical palm contact. Preserve its support and hand limitations. A new release
should change intended shoulder, hand target, timing and path; it should not
assign a win or ignore an acquired hand. Hand/body events also need a rule state
to distinguish lawful contact from restriction. Exact penalty classification
requires the applicable NFL rules; the supplied book alone is insufficient.

**Minimum release tests:** square press, inside shade, outside shade, a late
opposite-hand recovery and a quick route with insufficient time for a long
counter. Include the correct initial plan being defeated by a good DB. Retain
both hands' achieved contact/load, route displacement and release delay.

### 6.2 Stems create conflicts; they are not arbitrary waypoint races

**Coaching synthesis, WR/DB sections 4–9.** A stem must threaten something the
defender owns while retaining the route's shared spacing. An off-man defender
may need to respect vertical speed before a comeback can create room. A safety
may widen to a seam, opening a neighboring in-breaker. A route that attracts the
right defender can perform its job without being targeted.

Keep split, release, stem, break and finish distinct. The receiver can choose a
small variation in stem or pace when the install permits, but cannot abandon a
clearout merely because unrelated grass appears open. A credible double move
has actual braking/redirection and a real cost to the receiver. A head movement
without convincing path/posture evidence should not reliably create a full DB
turn; the system must define what the defender actually detects.

At the break, finite deceleration and support constrain the route. A rounded
speed cut is sensible in some designs; a comeback needs an earlier gather and
return path. Abruptly demanding a waypoint behind a fast receiver can create
overshoot without any inadequate turf friction. Use feasible arrival control
before raising agility.

**Minimum stem/break tests:** one ordinary vertical-to-stop route; the same
route under press delay; a boundary-constrained outside break; a clearout that
must preserve a neighboring window; and a credible double move against both a
patient and an aggressive DB. Separation is a consequence to record, not the
only acceptance condition.

### 6.3 Option routes are shared rules with separate observers

**Inspected source fact.** The `sitVsZone` conversion currently runs after an
awareness-related `readAt` and reads the actual
`sim.defAlign.coverage.man` flag, with a possible random reversal. Settling and
scramble logic also use actual defensive positions in places. This is not a
fully observational option read. The QB's live route prediction can then reveal
the receiver's conversion. The offense may therefore agree for the wrong
information reason.

**Proposed first install:** choose one existing route with a small branch set,
one observed leverage key and a spatial decision region. The receiver makes a
personal commitment; the QB holds his own expectation from the shared rule and
his own view. An observer who reacquires the rotation late can choose the wrong
branch or throw to an old expectation. Error should arise from detection,
interpretation, commitment or execution—not a random post-result bust.

**Minimum cases:** ordinary agreement; different observation ages around a late
rotation; ambiguous leverage where one observer remains uncertain; correct
agreement but a physically blocked break; and a stale expectation that creates
an actual interception opportunity. An interception must still require a
defender to reach and secure the ball; mismatch does not award possession.

### 6.4 Catch and transition must account for achieved movement

**Coaching synthesis, WR/DB section 10 and RB section 27.** A catch requires an
achievable meeting between ball and receiver, useful orientation, available
hands and finite preparation. An over-the-shoulder ball is different from one
behind a receiver who must brake. A defender's hand contact can occupy an arm
without knocking the whole body down. A runner can secure the ball but emerge
with a poor turn-up angle.

Do not label every failure “drop” just because the intended receiver was nearby.
Separate an unreachable delivery, a late ball acquisition, constrained hands,
contact disruption and possession loss after an initial touch. A deliberately
back-shoulder placement should be a permitted shared answer, not merely a
generic inaccurate vertical pass treated as intentional afterward.

**Minimum catch tests:** an in-stride ball, a reachable trailing ball requiring
braking, an unreachable ball, one occupied arm, legal close contest and a
sideline catch with finite landing room. Keep the same physical/catch
capabilities across tests and record the achieved platform. Full articulated
fingers are not a prerequisite for these distinctions.

### 6.5 Perimeter blocking is path denial with legal limits

**Coaching synthesis, WR/DB sections 18–22.** A stalk blocker often needs to
close under control and preserve the relevant side rather than sprint directly
into a DB. A crack changes the force/support problem for the defense; another
defender may replace. A screen blocker must know whether he takes force, the
first inside pursuer or a declared man. Abandoning an existing useful seal to
chase the nearest defender can make the screen worse.

Shared physics explains leverage, strike, redirection, displacement and loss of
balance. Controller choice determines which path the block should deny and
whether it is worth attempting. Rules determine what contact is permitted in
the actual pass/run context. A pick-looking collision, continued restriction
and incidental crossing traffic are different events. A blocking label should
not make every contact legal; a crossing route should not automatically earn a
foul either.

**Inspected rules fact.** In the served 2026 NFL article, Rule 8-4 distinguishes
initial contact, continuous contact, lost/reinitiated contact, the five-yard
zone and whether the snap receiver still has the ball in the pocket. The
five-yard area is not unrestricted grabbing space. Rule 8-5-1 starts defensive
PI restrictions at the throw and offensive PI restrictions at the snap; both
run to a ball touch. Its PI definition concerns acts more than one yard beyond
the LOS, while nearer acts may still be holding. These are distinct event
predicates, not one generic “physical route” penalty rate. Check complete
exceptions and Rule 12 before implementing a foul; this chapter is not a
complete officiating specification.

**Minimum cases:** stalk against a patient force player; a sudden trigger; crack
with a correct replacing defender; a delayed screen blocker with a difficult
angle; and crowded traffic where pursuing a second target loses a previously
useful relationship. Record contact timing/locations, ball state, force path
and actual assistance to the carrier, not merely blocker collision count.

## 7. Playcalling, motion and situation: create coherent player problems

### 7.1 Compose distributions with compatible timing and protection

**Local measured fact.** The retained 2022 BDB route study in
[playbook-depth review](../archive/reviews/coverage-engine-and-playbook-depth.md)
reports only about 4% of eligible studied plays with the same route tuple on
both sides. This supports investigating separate side concepts, not a precise
universal mirroring penalty. A route-label tuple does not reveal the team's
private progression, option tags, all motion or exact release mechanics.

**Coaching synthesis.** Compose each side's spacing and purpose, then the back
role, protection and QB reading design. A quick outlet on one side can pair
with an intermediate concept on the other; a max-protection shot trades away
route numbers. Compatibility is not simply independent sampling of familiar
route names. Check that routes do not occupy the same window, releases have
physical access, protection can support the relevant timing, and there is a
defined answer when the primary conflict does not resolve favorably.

Do not encode “Dagger beats Cover 3” as a completion bonus. Test which defender
is stressed, whether help can recover and whether rush arrives before the
window. A call with a sound purpose can be defeated by a good defensive answer.

### 7.2 Motion tests recognition and physically changes the play

**Coaching synthesis, playcalling chapters 10–13.** Motion can probe matchups,
change release access, move a support defender, change receiver numbering,
alter the protection count or create initial velocity. These are six different
mechanisms. A defense following motion is evidence of a responsibility; a bump
or switch is also a possible man-related response. Neither response reveals
the hidden call with certainty.

For each motion install, specify its legal starting alignment, path, allowed
snap state, assignment/check authority and what remains unchanged if the defense
does not follow. The offense must receive its own late change, and the defense
must actually observe and communicate its answer. A drawing that instantly
relabels every defender at the snap does not test that process.

**Inspected rules fact.** The official rulebook page retrieved by this team's
defensive research agent and read for this chapter gives these distinctions:

- Rule 7-4-6/7 requires the simultaneous all-set second after a shift. Sequential
  one-at-a-time eligible backfield motions do not require a new full-second
  pause if the first player fully stopped; overlapping movement is another
  shift and requires the reset. T-formation QB provisions differ.
- Rule 7-4-8 allows one backfield player moving parallel to or away from the LOS
  at the snap, with the others stationary. An eligible on-line mover must stop.
- Rule 7-5-1 requires at least seven on the line, eligible endpoints and
  ineligible interior players, with number/reporting and clear on/off provisions.
  Rule 8-1-5/6 separately determines receiver eligibility and exceptions.

The retained [stress-test plan](../FOOTBALL_STRESS_TEST_PLAN.md) provides legal
worked versions of a two-TE motion bubble, off-line TE split-zone motion and an
empty quad diamond. On/off status and eligibility need explicit inventory;
letter names or an approximate alignment depth are insufficient. These checked
rules do not establish that the engine enforces every exception today.

**Minimum motion tests:** one moving eligible with no changed coverage; travel;
bump/switch; a delayed receiver-number exchange; and a missed offensive
protection adjustment when the back leaves the core. Track observation age,
message receipt, resulting jobs and achieved initial velocity. Motion has no
intrinsic offensive bonus.

### 7.3 Screen geometry is a particularly useful stress test

A motion bubble combines a fast-moving receiver, immediate ball flight,
perimeter blockers and an aggressive force reaction. A quad diamond adds legal
eligibility, traffic, multiple possible screen blockers and defensive sorting.
A slow screen adds rush depth, release timing, the QB's diminishing safe area
and ineligible/downfield concerns. These families stress the common movement,
contact and information system with unusual geometry while still resembling
ordinary football.

Start with a legal fixed install and a small controlled interaction. A single
slice/contact lab or diamond traffic test does not establish that a complete
scheme, all checks or officiating exist. ST-01 and ST-04 in the
[stress plan](../FOOTBALL_STRESS_TEST_PLAN.md) already give useful bounded
scenarios. Preserve their separation of acquisition, physical load and outcome.

### 7.4 Situation changes the value of an action, not its laws

**Coaching synthesis, playcalling chapter 24 and RB section 30.** Down/distance,
field position, score, remaining time, timeouts and boundary are legitimate
known inputs. They alter acceptable choices: a short third-and-long completion
can be a defensive success; a conversion can be worth more than an explosive
gamble; clock preservation can favor contact over a voluntary exit. Red-zone
routes and safety depth must respect finite available field. The back of the
end zone is not an extra retreat landmark.

The user suggested that trailing QBs may take more risks or act differently
after repeated pressure. Public play-by-play can test score/time associations;
it cannot directly measure fear or establish their psychological causes. Team
quality, opponent, down/distance and personnel also differ across score states.
Fit or select a simple situational policy only after those confounders and
denominators are explicit. Keep player preference and staff authority separate.

**Minimum situation tests:** identical football geometry under ordinary early
down, third-and-long, low red zone, clock-preservation and hurry contexts. The
chosen answer may change; attainable acceleration, reach and force must not.
The existing ST-05 third-and-27 run against eight coverage jobs is a stress case
for responsibility and empty-box opportunity, not a demand for a particular
rushing average.

## 8. Separate physics, movement control and football judgment in the review

| Film symptom | First question | Evidence needed before changing physical capability |
| --- | --- | --- |
| RB runs into a blocker | Was the approach corridor actually clear in his consumed picture? | Candidate path, prediction, command, body/contact trace |
| TE overshoots a slice | Did he prepare a reachable angle and speed from his initial momentum? | Cue age, intended shoulder, braking request, actual support/contact |
| WR rounds a comeback | Did the controller gather before demanding reversal? | Approach speed, waypoint/control choice, achieved deceleration |
| QB makes an implausible moving throw | What platform and throw direction were achieved at release? | Intentional target/aim, actual base proxy, support, launch and flight |
| Back releases before a free rush | Was the threat owned, observed, communicated and cleared? | Protection ledger, consumed rush picture, check-release cause |
| Two receivers spoil a window | Did the install preserve separation, or did one independently convert? | Installed branches, each observation, chosen path and communication |
| Open runner exits field | Was exit chosen, braking unattainable or inward command insufficient? | Exit utility/choice, actual outward momentum, achievable redirect |
| Physical release becomes a hold | What contact and rule state actually persisted? | Hand acquisition, restriction direction/duration, ball/pass context |

A physics defect remains possible when the instruction is coherent but the
shared body transmits unbounded load, gains unexplained work, loses support
inconsistently or changes qualitatively with an unjustified timestep choice.
Those require physical oracles and native load traces. Poor football technique
cannot be repaired by violating the force law, and a wrong force law cannot be
excused because a coach could have asked for a different block.

## 9. Use existing NFL data for the questions it can answer

The [source catalog](../../data/sources.json) and
[data guide](../../data/archive/catalog-2026-10-11.md) are the access/provenance authority. Reuse
their extractors and audited artifacts before collecting another broad dataset.
This chapter introduces no newly fitted parameter or raw-data download.

| Question | Best current local reference | What remains unobservable or needs careful annotation |
| --- | --- | --- |
| Route distribution, coverage/rush pairing and approximate pocket geometry | 2022 BDB playbook-depth aggregates and extractor definitions | Private read order, actual hands/load and whether proximity is pressure |
| Early pass protection, rush and blocking labels | BDB2023 scouting labels and documented short tracking scope | Full tackle/return aftermath; summary metadata is not processed tracking |
| Conditional success, explosives, calls, drops and roster composition | nflverse 2022–23 PBP, 2022 FTN charting and pinned anonymous roster benchmarks | Causal cognition/platform; ratings cannot be recovered from combine/roster alone |
| Sprint, curved pull and harder reversal demand | BDB2027 drill/game movement extraction and current movement audit | All-22 context, exact plants/ground forces, grip strength, full contact and run/sack cohorts |
| How motion changed one defender's responsibility or a back's actual read | Source-labelled coaching/film annotation joined to tracking where allowed | The exact true private rule generally remains uncertain |

Tracking task comparisons must use compatible windows, role, initial speed,
units, smoothing, body profiles and missing-data rules. Separate free sprint
capacity from the player's requested effort and from contact-limited movement.
Selected draft-cohort pre-throw paths are not league-wide running-back traffic
or complete tackle observations. Position direction and body orientation do
not reveal eyes or intention.

For run/playcall validation, report concept/front/situation sample counts,
generated-roster variation and the definition of success/explosive. The
nflverse reference explicitly distinguishes yards-based 40/60/100 success from
EPA-positive success. Do not blend them. The generated players need believable
conditional distributions, not an exact league average earned by tuning forces.
Matched process tests remain essential because aggregate improvement can hide
a worse instruction.

### Small owner annotation tasks worth more than another giant archive

Ask for a few source-labelled plays with these questions marked **before** the
outcome is known: Which defender/block relationship should the back key? When
does the path actually become usable? What was the acceptable pace? Which
option branch would the receiver and QB be taught? Which rusher was owned or
intentionally hot? Where would the TE/FB gather for a difficult fit?

Record “uncertain,” alternative interpretations and the installed rule when
known. A knowledgeable viewer's diagnosis can propose a cue to test, but should
not become a universal timing rate. Preserve examples of a correct decision
losing and of a credible mistake. Annotating only touchdowns selects for
explosive failures and cannot estimate their prevalence.

## 10. A bounded development sequence

1. **Record the true decision chain.** Retain installed job, consumed cue/age,
   chosen answer, request, actual contact/support and ball state. A recording
   hook copies existing state; it must not invoke another perception query or
   evaluation and thereby change the player.
2. **Prove one feasible path repair.** Begin with the reproduced traffic/turn
   forecast issue using the same production movement operator. Use ordinary,
   mirrored and deliberately adverse cases. The withheld RB prototype is
   evidence to learn from, not a shortcut to promotion.
3. **Install one RB read/tempo contract.** Compare a small allowed branch set
   against slant, scrape, late opening and penetration. Keep force/profile laws
   fixed. Do not let a supposedly smarter runner know every gap.
4. **Audit protection answers, then replace one shortcut.** A line/back/hot ledger
   exposes unaccounted threats before adding pressure packages. Only then test
   an observed scan or a limited received communication.
5. **Build one independent option agreement.** QB and receiver read the same
   relevant relationship through separate evidence, then the actual ball/body
   system resolves agreement or mismatch. Retain bad native outcomes.
6. **Extend to a controlled motion or screen.** Use a legal fixed install and
   existing shared contact; prove sorting, timing and actual block help before
   adding more scheme names.
7. **Only afterward expand situational policy and platform detail.** Use
   conditional data and generated-roster variability; avoid compensating for
   broken reads with stronger bodies or outcome bonuses.

Each candidate needs focused causal tests, observer/RNG neutrality and a
source-pinned native football comparison with adverse pairs retained. Run the
appropriate final suite after freezing source. One small game panel is a guard
against unexpected coupling; it does not calibrate NFL realism. Use the existing
[practical validation guide](../archive/reviews/practical-validation-and-stable-physics.md)
for baseline reuse and promotion discipline.

## References and provenance

### Public text fetched and inspected for this chapter

The three coaching pages returned HTTP 200 and their extracted article text was
read on 2026-10-11 UTC. The receipts and full extracted text are exploratory files
under ignored `out/football-handbook/offense-sources/`; copyrighted article text
is not copied into this chapter. HTML hashes identify the inspected response,
including surrounding page material; they do not guarantee a future response
will be identical. Embedded clinic video, paid course content and related linked
articles were not inspected.

The official rulebook was fetched by the defensive research agent on the same
date; this chapter inspected its extracted Rule 7/8 article text and checked the
HTML hash. Its receipt is `/tmp/football-defense-research/access.json`; HTML is
`rules.html`, and `rules-article-text.txt` decodes the page's rendered article
payload. Some internal/PDF assets name 2025. No PDF was fetched or claimed to
match; the exact served URL and article prose identify the checked rule source.

| Source | Narrow use here | SHA-256 of inspected HTML |
| --- | --- | --- |
| [Glazier Football, Kevin Smith: Ole Miss Inside Run Footwork](https://www.glazierclinics.com/football-coach-resources/ole-miss-inside-run-footwork), page dated 2024-02-02 | Particular inside-zone landmarks, changing pictures, square shoulders and controlled tempo | `c210abe5d5edfcfab0c2aa079c9cfaa9e6493f00f3c8974db345c319d7091e07` |
| [Glazier Football, Elijah Brooks: Build Consistent Success in Your Run Game with Alignment, Landmarks, and Tempo](https://www.glazierclinics.com/football-coach-resources/build-consistent-success-in-your-run-game-with-alignment-landmarks-and-tempo), page dated 2024-10-14 | Consistent run installation fields and adaptation to personnel | `0cb1f571efbb79f35bd688f2b7610ae9bc1922d6f9def81d1ba070d2cc654bca` |
| [Drew Lieberman, USA Football: Coaching the Wide Receiver — The Press Release](https://blogs.usafootball.com/blog/7121/coaching-the-wide-receiver-the-press-release), dated 2019-03-26 | Conditional release plan/counter, leverage and route-dependent timing | `f0e9b7022d84216f338e50c4d1bf3223e5f3dcca806c7a81956f3ca40a6e5d17` |
| [NFL Football Operations: served 2026 NFL Rulebook](https://operations.nfl.com/rules-officiating/2026-nfl-rulebook), generic rulebook URL redirected here | Rule 7-4-6/7/8, 7-5-1, 8-1-5/6, 8-4-1/2/3 and 8-5-1: shifts, motion, alignment/eligibility and differentiated contact/PI state | `4b5493b0a3ff47bde3323a91c66f07d1db3daa378c2c3349e6d85749973dd064` |

### Supplied aids inspected

- [Running Back Mechanics](../references/Running_Back_Mechanics_Textbook.md),
  sections 1–21, 26–30 and its source notes: moving pictures, mesh, scheme keys,
  block hips, tempo, contact, protection, receiving and boundary/situation.
- [WR/DB Mechanics](../references/WR_DB_Mechanics_Textbook.md), sections 4–10,
  17–22 and source notes: releases, stems, breaks, choices, catch and perimeter
  interactions. Its official-rule references are not a substitute for a checked
  rulebook implementation.
- [Offensive Playcalling](../references/Offensive_Playcalling_Textbook.md),
  chapters 10–13, 16–20, 22–24 and appendix C: motion, communication, protection,
  reads and situation. Unchecked trend percentages in that aid are not used as
  engine targets here.
- [Offensive Glossary](../references/Offensive_Playcalling_Glossary_453_Terms.md),
  section headings inspected as a vocabulary map, not as 453 required features.
- [Reference catalog](../references/README.md): provenance and missing-figure
  limitations of uploaded/generated aids.

### Existing engine research and inspected source

- [Position technique and awareness](../archive/reviews/position-technique-and-awareness.md),
  [offensive-skill audit](../archive/reviews/offensive-skill-technique-audit.md),
  [offense literature applications](../archive/reviews/offense-literature-applications.md)
  and [carrier boundary control](../archive/reviews/carrier-boundary-control.md).
  Their historical cohorts/source pins retain their original scope.
- [Football stress-test plan](../FOOTBALL_STRESS_TEST_PLAN.md), legality research
  and ST-01/ST-04/ST-05. Its public formation pages retain their original checked
  date/scope; today's official NFL rulebook receipt is listed separately above.
- [Coverage engine and playbook depth](../archive/reviews/coverage-engine-and-playbook-depth.md),
  NFL route/rush/pocket aggregates; [BDB2027 movement transfer](../archive/reviews/bdb2027-movement-transfer.md),
  cohort/operator limitations; [nflverse evidence README](../../data/reviews/nflverse/README.md),
  conditional outcome/charting definitions and attribution; and
  [source catalog](../../data/sources.json).
- Inspected implementation: [QB controller](../../src/sim/behaviors/qb.ts),
  [QB mind](../../src/sim/qbmind.ts), [receiver](../../src/sim/behaviors/receiver.ts),
  [carrier](../../src/sim/behaviors/carrier.ts),
  [blocking/protection](../../src/sim/behaviors/blocking.ts),
  [assignment/handoff installation](../../src/sim/assign.ts) and
  [handoff reach](../../src/sim/ball-transfer.ts).

FTN-derived charting references retain attribution to FTN Data via nflverse and
the upstream [CC-BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
terms documented in the local evidence README. Coaching articles, competition
tracking and other nflverse releases have separate provenance/terms. Neither a
private repository nor this original chapter expands their redistribution rights.
