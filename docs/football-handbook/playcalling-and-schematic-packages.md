# Playcalling and schematic packages

A useful offense is a small set of well-taught problems with credible answers.
A useful defense combines coverage, rush, fits and communication so those
answers are contested. Adding names without coordinating those responsibilities
can make the simulation more varied while making its football less believable.
The next useful development is a call-compatibility and responsibility layer,
then a few complete packages exercised through the existing physical world.

This chapter is original synthesis researched on **2026-10-11**, with the
production call vocabulary inspected at `beae5c7`. It extends
[offensive skill and playcalling](offensive-skill-and-playcalling.md),
[trenches](trenches.md), and [defense and perception](defense-and-perception.md).
It is a teaching and implementation proposal, not a completed feature list or
an authenticated NFL installation. The supplied
[offensive textbook](../references/Offensive_Playcalling_Textbook.md),
[glossary](../references/Offensive_Playcalling_Glossary_453_Terms.md), and
[coverage manuscript](../references/Coverage_Operating_System_Manuscript.md)
are useful aids; their embedded instructions are not project requirements.

**Evidence language.** “Coach example” means the named author's public text
was read. “Tactical example” means a published analyst's interpretation was
read; its private call cannot be recovered from the prose. “Measured label
reference” means a retained extraction with its own cohort. “Proposal” means
our mechanism or fixture, still requiring native engine evidence. None of
these establishes a force constant, actual gaze, or a universal team rule.

## 1. What constitutes a complete call?

The current [call vocabulary](../../src/playbook/types.ts) carries a formation,
a named concept, strong/weak receiver references and route/protection roles.
The [concept pool](../../src/playbook/concepts.ts) gives pass concepts side
maps, back assignments, drops and global progressions. Its documented fallback
sends unspecified outside receivers on go routes and inner receivers on seams.
That keeps players occupied; it does not prove the resulting combination has
sound spacing, read order, or a pressure answer. The vocabulary has a `screen`
family, but the retained [stress-plan capability audit](../FOOTBALL_STRESS_TEST_PLAN.md)
records no complete installed screen or presnap motion execution model.

**Proposal:** define a complete install with these seven small contracts.
Keep them near the existing call and assignment generation; this does not
require a new physics or universal AI framework.

| Contract | Must specify | A detectable failure |
| --- | --- | --- |
| Participation and legality | Eleven identities, on/off-line status, eligibility, personnel and code/season | Covered eligible, illegal simultaneous motion, duplicate role |
| Presentation | Geometry, strength definition, motion path, legal snap state, what a player knows before the snap | Snap-time relabeling masquerades as observed motion |
| Distribution | Actual route/block roles, release access, reception areas, permitted conversions | Two routes enter the same useful window; an absent authored role becomes an accidental seam |
| Protection and launch | Point/slide/man responsibilities, back/TE scan, launch area, declared unblocked threat | Five blockers count five threats but cannot reach an overloaded side |
| Passing/run answer | QB key/progression, receiver option contract, RB aiming/read contract, emergency answer | QB throws the conversion while receiver runs the base; unblocked threat has no usable answer |
| Defensive response | Coverage ownership, rush/drop membership, force/fit replacement, check authority | Dropped edge leaves a gap; two defenders acquire the same receiver while another has no marker |
| Adjustment and situation | Who may change what, how others receive it, clock/field/conversion priorities | One player's valid adjustment invalidates a teammate's work or abandons the needed line to gain |

Compile identities and static feasibility first. Runtime movement, contact and
fallible interpretation remain runtime problems. A validator should reject an
impossible install or explain its unsupported branch, while allowing an
intentionally difficult block, a declared hot defender, and a realistic missed
communication. A difficult assignment is different from no assignment.

Receiver numbers are local descriptions, not permanent player identities.
Formation numbering can be recomputed after an observed change; ownership
changes require the installed exchange and its cue. A late back release becoming
“new #3” does not instantly teleport a weak linebacker into the new window.
Strong/weak, field/boundary and motion direction also need separate names:
receiver-count strength is not always the run surface or protection direction.

## 2. Select executable menus, not the largest catalog

**Coach example — Keith Grabowski, game planning [S1].** His public article
organizes offense around situations and constrains its volume by actual
practice periods, repetition rate and teaching time. This supports a small base
menu with situational overlays. It does not supply NFL call shares or a numeric
learning-rate model for our players.

**Proposal:** keep three layers distinct:

1. **Install:** what the roster has been taught and can execute, with shared
   adjustments and practiced adverse branches.
2. **Weekly menu:** a small subset selected for opponent hypotheses, personnel,
   protection feasibility and situation. A player cannot execute a new answer
   perfectly just because the coordinator selected its name.
3. **Live call:** choose among that menu using known situation and observations.
   Track why the call was available, its intended stress, and the actual answer.

Start with fixed menu membership and explicit technique/read variants. Player
learning can later improve recognition, communication and consistency. Keep
strength, traction and acceleration independent of knowing a concept.

The retained [route-side study](../archive/reviews/coverage-engine-and-playbook-depth.md)
reports approximately 4% matching route tuples on both sides in its 2022 BDB
cohort. **Measured label reference:** this supports examining separately
composed sides. It does not establish a universal mirroring penalty, exact
concept labels, or private NFL progressions. Compatibility comes before a
sampler that recombines every tuple independently.

A call's purpose is a hypothesis about relationships. “Stress the flat player
while the deep player is occupied” is usable. “Beats Cover 3” is metadata that
can guide a caller, but should not grant receivers separation or completions.
Test what happens when that flat player has help, passes the threat correctly,
or a rusher reaches the launch point before the window opens.

## 3. Seven worked package contracts

These are **illustrative installs**. Exact terms, landmarks, progression orders
and defensive checks vary. The source examples explain why the pieces must
agree; they are not copied team playbooks. Do not promote all seven at once.

### P1 — Drive with a declared pressure answer

**Coach example — Jarrett Troxler [S2].** The inspected public preview pairs
shallow-to-dig-to-swing with a slide toward the shallow, a named weak-linebacker
hot, and an optional backside post when the weak safety drives the dig. Its
members-only continuation and video were not inspected.

**Proposal:** preserve those distinctions rather than labeling every quick
receiver a hot. The line/back ledger knows who is protected; the QB and hot
receiver share the named threat and the fast answer. The safety's real movement
can make a post alert attractive, but cannot extend protection by fiat.

- **Cue:** an acquired weak-side pressure path that the installed protection
  leaves to the pass, or a safety genuinely vacating the post area.
- **Action:** take the installed fast answer, or move through shallow/dig/outlet
  with an attainable base. Do not skip directly to a delayed deep route because
  its current distance to a defender is large.
- **Failure:** receiver does not convert; QB misses the cue; a simulated rusher
  drops into the answer; the line changes its point but the back does not.
- **Witnesses:** actual unblocked rush, the same presentation with that defender
  dropping, successful ordinary protection, late hot recognition, both sides.

**Why it matters:** this separates free-rusher pressure from a blocker losing a
physical contest. Otherwise stronger OL can hide an accounting fault and extra
coverage intelligence can hide a missing pressure answer.

### P2 — Spacing plus backside access

**Tactical example — Zach Dunn [S3].** The public analysis describes a bunch
spacing side paired with snag/flat on the weak side, a presnap access throw,
and post-snap movement keys that can remove it. This is a described Cardinals
example, not a universal definition of “Spacing.” Its coverage-beater claims
are the author's interpretation, not guaranteed results.

**Proposal:** the access throw is permission to inspect a plausible matchup,
not a commitment. If the underneath defender expands into that lane, the QB
must acquire the change and reset toward a compatible next window. The receiver
and QB must share any press/cloud conversion. The other side should have its
own coherent two-player relationship rather than automatic mirrored routes.

**Witnesses:** soft access, late squat under it, access removed before the snap,
and a failed foot reset with the same physical capacities. Grade throw corridor,
release time, decision evidence and receiver/QB disagreement before completion.

### P3 — Bunch follow, pivot and defensive sorting

**Tactical examples — Ted Nguyen [S4, S5].** The inspected articles explain an
example with man responsibility on the bunch point and in/out release sorting
for the two other receivers; follow/pivot routes can exploit the resulting
leverage. They also describe staggered press/off levels as another traffic
answer. “Banjo” describes different arrangements in other installs. Assertions
about frequency, officiating leniency or defenders losing faith are not measured
references and are not incorporated as probabilities here.

**Proposal:** treat the bunch as three physical releases and a local ownership
contract. The point player can remain locked while two others sort by release.
The defenders must see those releases and avoid one another with normal
movement limits. A later pivot changes receiver trajectory; it need not erase
ownership and restart the sorting every frame.

The offense can create legal route traffic, but may not gain a universal
“pick immunity” flag. Contact location, ball state, obstruction and applicable
rules matter. Use the served official-rule inspection in
[defense and perception](defense-and-perception.md#11-legal-disruption-is-separate-from-disruption-strength),
not the analyst's claim that officials rarely call picks.

**Witnesses:** clear inside/outside releases; near-simultaneous release ambiguity;
late pivot; unintentional teammate traffic; deliberate prolonged route
obstruction; defender too shallow/deep to execute the exchange. Compare literal
man, point-plus-sort and staggered-level approaches without changing physics.

### P4 — Four verticals with shared conversions

**Public coaching report — A.J. Smith/Mumme, written by Brendan Leister [S6].**
The article distinguishes 2x2 from trips, describes a two-high bender read shared
by QB and receiver, switch tags, a back outlet and a shallow constraint. It gives
particular landmarks and a handedness-dependent progression. These are that
installation's teaching choices; the linked podcast was not listened to.

**Proposal:** install 2x2 and 3x1 as distinct role maps even if they share a
family name. Give the bender a cue from observed safety structure, not the true
coverage enum. QB and receiver can acquire rotation at different times and
therefore disagree. A switch tag alters releases and traffic; a match defender
must interpret that actual path rather than read the receiver's future route.

**Witnesses:** stable one-high/two-high; late spin; switch with an attainable
match exchange; safety capping the correct vertical; one observer missing the
rotation; shallow constraint against underneath defenders overcommitting deep.
The counter must lose value when those defenders stay underneath. Keep ordinary
four-vertical controls to avoid judging only deliberate edge cases.

### P5 — Fast screen, access tag and screen-and-go

**Public coaching summary — Matt DeBerry via Glazier [S7].** The inspected
written page describes tailback fast screens with perimeter dangerous-man
blocks, opposite-side quick routes, numbers/leverage access tags and an
and-go counter. It references video and a longer course; neither was inspected.
Its quick-set/cut-protection advice concerns the illustrated coaching context,
not automatic permission for NFL low blocks.

**Proposal:** give blockers prioritized defender relationships such as force,
inside pursuit and alley, with a response when one is unreachable. “Most
dangerous” needs a local arrival/leverage estimate, not an oracle ranking of
who ultimately tackles the runner. Fast motion, ball flight, catch position and
blocker support should determine whether the carrier actually reaches the edge.
A backside access throw and the base screen need compatible ball timing.

The and-go counter presents the same early receiver behavior and becomes a
vertical request when the installed cue/tag permits it. Defenders can recognize
it, recover or be wrong. Do not apply an automatic anticipation bonus after one
screen; keep observation and uncertain tendency memory distinct.

**Witnesses:** screen against wide force, aggressive outside pressure,
stationary versus moving receiver, two nearby blockers with a changing first
threat, and-go with defender holding deep position, interception of a poorly
placed screen. The [existing quad-diamond legal inventory](../FOOTBALL_STRESS_TEST_PLAN.md)
is a separate useful fixture; “diamond” is not a unique formation definition.

### P6 — Sprint-out with coherent protection and a counter

**Coach example — Matt Drinkall [S8].** The public article connects a moved
launch point, seven-man gap/waterfall protection and two flat/corner variants.
Its corner-post tag automatically converts the backside post/dig to a dig so
it stays clear of the new reception area. It describes different footwork and
spacing when rolling toward the non-dominant side. This is an install, not a
claim that seven-man protection is best for every team or down.

**Proposal:** moving the QB changes what protection must preserve. Blockers need
launch-relative leverage, and the QB needs a reachable throw platform. A counter
that changes the receiving window must change the affected complementary route.
A hidden extra protection multiplier is unnecessary and would defeat the test.

**Witnesses:** ordinary flat/corner; force staying outside; edge defeating the
seal; corner-post with the companion route correctly moved; the same tag with
an intentionally stale companion; dominant/non-dominant roll with base reset.
Exact physical mirror tests remain useful, while handedness-specific football
controllers need not produce identical throw outcomes.

### P7 — Four-strong post/wheel/out/flat against real exchanges

**Tactical example — Zach Dunn [S9].** The inspected article describes four
receiving threats to one side, particular quarters/trips checks, linebacker
3–4 pushes, and a contrasting weak rotation that alters the run-fit picture.
It is a published interpretation of examples, not independently verified
league prevalence or an authenticated Chiefs call. “Solo,” “Poach,” “Stubbie”
and “Mable” do not establish identical detailed rules across teams.

**Proposal:** the late fourth release tests ownership and physical reach at the
same time. A defense can push underneath responsibilities, travel in man, or
have an installed flood check. It cannot simply acquire a new numeric receiver
and jump across the formation. The offense's out/sit decision also needs a
shared window interpretation with the QB. A weak rotating fitter can make a
presnap light box misleading; an RPO key must actually own the relevant fit.

**Witnesses:** static four-strong, late back release, correct/delayed/failed
push, weak rotation with a legitimate extra fitter, and a run alternative with
the same eleven. Grade acquisition, ownership, reachable windows and fit
replacement rather than requiring an explosive gain.

## 4. Defense is an integrated response

A front is not a rush count, and a coverage name is not a complete assignment.
A mugged linebacker can rush, drop or replace another role. The final defense
must account for:

- All rush paths and who contains or replaces the edge.
- Coverage of every participating eligible, including unusual four-strong and
  bunch releases, with explicit allowable double teams.
- Interior fits, force/spill/box policy and the player replacing a departing
  fitter. A good coverage exchange can still make a run fit late.
- Presentation versus actual responsibility, and communication that can arrive
  late. Defensive checks should preserve the same physical bodies and expose
  which obligations changed.

**Proposal:** begin with an explicit responsibility ledger and a small compatible
set of pressure/drop plans. Expand pressure variety after protectors and QB
answers can account for those plans. Generic “add another blitzer” can silently
remove the last marker; generic “drop an edge” can silently remove contain.
A deterministic compile audit establishes that the install is satisfiable.
Native tests then establish whether players recognize and execute it.

Do not make a flawless global dispatcher necessary for every valid snap.
Static game-plan responsibility can be exact, while real-time acquisition,
messages and recovery remain local and fallible. A diagnosed missed message is
more useful than assigning an independent random bust chance every play.

## 5. A compact physics and schematic stress ladder

The cases below are **proposed teaching fixtures**, separate from installed
features. They extend, rather than replace, the retained
[football stress plan](../FOOTBALL_STRESS_TEST_PLAN.md). A snap-time body with
motion velocity tests initial momentum; it does not establish that presnap
motion was seen or communicated. An open-field run against three rushers/eight
droppers tests conditional space, not an expected NFL yardage distribution.

| Fixture | Difficult football request | Physical system it stresses | Ordinary/adverse control |
| --- | --- | --- | --- |
| PK-01 Drive hot | Acquire named pressure; receiver and QB share a fast answer | Protection contact, throw-base recovery, attainable release timing | Same threat drops; actual protection holds; late recognition |
| PK-02 Bunch follow/pivot | Sort releases, then stay with a changing owned receiver | Turning, braking, hand contact, teammate traffic | Clear wide releases; ambiguous simultaneous release; legal versus obstructing traffic |
| PK-03 Moving bubble | Catch while moving; blockers gather into dangerous-man leverage | Initial kinetic energy, ball transfer, angled block, pursuit | Stationary catch; overfast blocker; force holds width |
| PK-04 Quad diamond | Three blockers allocate a crowded perimeter without overlapping work | Multi-body contacts, constrained movement, achievable block entry | Ordinary trips screen; strong/weak blocker; defender beats first block |
| PK-05 Motion slice | TE crosses with momentum and fits a wide edge | Braking, shoulder placement, bounded grip, foot support | Stationary split zone; early/late/too-fast arrival; mirrored field geometry |
| PK-06 Sprint-out counter | Protection preserves moved launch; tagged routes retain separate windows | Edge redirect, QB braking/base, sideline boundary | Normal flat/corner; edge wins; stale companion route |
| PK-07 Four-strong push | Weak LB changes work after observing late fourth release | Reachable lateral movement, traffic, recovery | Static distribution; no push; delayed message; force/run-fit cost retained |
| PK-08 Three-rush long-yardage run | Back presses a light box while defenders protect conversion distance | OL displacement, delayed fits, open-field pursuit | Four-man ordinary front; aggressive fit check; short gain is defensive success |
| PK-09 Switch verticals | Defense caps deep paths while receivers cross releases | Acceleration, hip/torso turn, jam forces, boundary awareness | Straight releases; late spin; phase advantage held |
| PK-10 Puller through narrow traffic | Blocker finds an achievable fit while teammate contact changes entry | Shared traction, multiple contacts, gather/recovery | Clear alley; unavoidable congestion; no automatic blocker teleport |
| PK-11 Low-red-zone bunch | Preserve route and coverage leverage in finite depth | Boundary braking, short cuts, body obstruction | Open field same concept; defender correctly caps; lost throw platform |

Each fixture needs four separable experiments:

1. **Installation:** validate legality, identity and responsibility; intentionally
   broken installs must fail with a useful explanation.
2. **Mechanics:** fixed actual commands and capabilities, varying angle, speed,
   load and support. Mirror these commands to test physical symmetry.
3. **Execution:** same bodies, varying installed technique or correction choice.
   Let the production movement/contact world determine achieved action.
4. **Information:** same physical setup, varying what was acquired or received.
   Record observation age and branch trigger; do not substitute hidden true
   assignments for evidence.

For contact witnesses record work, momentum exchange, traction/grip use,
support and achieved foot/body response. For schematic witnesses record intended
responsibility, actual target, cue, alternative considered and change reason.
For football witnesses record pressures with their definition, possession,
separation, first contact, outcome and censorship. Do not turn a dropped pass or
an early whistle into a complete measured interaction.

An unusual fixture should reveal a limitation, not supply its own tuned force
coefficient. Use the same physical capacities in an OL anchor, slice, screen
block, defensive jam, tackle and recovery control. If only one scenario requires
extra unexplained strength, investigate its technique/geometry before expanding
the physical model.

## 6. Recommended implementation sequence

**First: audit and expose call compatibility.** Produce legal-player,
receiver-role, protection/hot and rush/drop/fit ledgers from current calls. Keep
missing authored roles visible even when existing fallback remains available.
The most valuable new diagnostic is *why a free player or abandoned window
exists*, not another aggregate touchdown target.

**Second: complete one existing package.** Drive is a useful choice because it
already exists and exposes shallow/dig/outlet timing, protection direction and
a pressure answer. Pair it with an ordinary defense, an actual overload and a
simulated-pressure drop. Compare the same bodies, not a new roster with every
candidate. An alternative is one bunch-spacing install if release sorting is
the reproduced higher-priority failure.

**Third: add one momentum fixture without pretending motion is complete.**
Motion slice or moving bubble can test initial speed and gathering through the
shared world. Build full presnap execution only after the bounded snap-time
case and legal inventory pass. Then add acquired motion history and one local
check; avoid making every defensive adjustment synchronous by default.

**Fourth: compose a small side-concept pool with compatibility constraints.**
Keep familiar distributions, back roles and explicit answers. Increase variety
by pairing coherent sides and changing presentation, not by independently
sampling every route or giving a larger call pool a success bonus.

**Fifth: evaluate calling and sequencing.** Situation-conditional NFL samples
can inform what calls are plausible, while opponent response maps inform live
choices. Restrict awareness to public game state, prior observed responses and
installed staff authority. Do not let the caller inspect the opponent's hidden
coverage or next random draw. Source a pressure/route response before assigning
psychology such as fear, trust collapse or compulsory hero ball.

Maintain small ordinary 11-on-11 panels beside edge fixtures. Report adverse
pairs and counts by concept/front/coverage/situation; yards alone will confound
call compatibility, skill, physics and pursuit. The
[data chapter](data-and-measurement.md) specifies eligible denominators, provider
boundaries, repeated-player weighting and the limitations of route labels.

## 7. Inspected sources and limitations

All twelve public pages below returned HTTP 200 and their **written text** was
read on 2026-10-11. Their exact URL, byte count, response SHA-256 and inspected
scope are in the [schematic source catalog](../../data/research/schematic-coaching-sources.json).
Raw HTML/text remain in ignored `out/scheme-research/`; no article, private
playbook, video or course content is republished. Three supplementary articles
support terminology/variation without being required to implement a package.

| ID | Source | Inspected use and limit |
| --- | --- | --- |
| S1 | [Keith Grabowski, effective offensive game plan](https://blogs.usafootball.com/blog/990/how-to-create-an-effective-offensive-game-plan), 2016-01-27 | Situation buckets and practice economy; coach planning example, not NFL rates. |
| S2 | [Jarrett Troxler, Shallow/Drive preview](https://blogs.usafootball.com/blog/7300/here), 2019-05-31 | Public slide/hot/progression/post-alert install; paid continuation and videos not inspected. |
| S3 | [Zach Dunn, Spacing](https://blogs.usafootball.com/blog/7510/detailing-the-spacing-concept), 2019-08-27 | Analyst's complementary side and access/movement-key example; not private-call verification. |
| S4 | [Ted Nguyen, Falcons bunch](https://blogs.usafootball.com/blog/4226/why-the-atlanta-falcons-bunch-formation-succeeds), 2017-08-24 | Point-man and in/out sorting example, follow leverage; frequency and psychological assertions not measured. |
| S5 | [Ted Nguyen, rub and defensive answers](https://blogs.usafootball.com/blog/4177/rub-concepts-how-to-defend-them-and-how-offenses-can-counteract-it), 2017-08-17 | Banjo/staggered-level/pivot interpretation; do not use its officiating-leniency claim as NFL rule text or rate. |
| S6 | [Brendan Leister reporting A.J. Smith, Four Verticals](https://blogs.usafootball.com/blog/7368/podcast-review-aj-smith-talks-all-things-about-4-verticals), 2019-06-27 | Written coaching report of conversions, switch/trips and back outlet; podcast not inspected. |
| S7 | [Glazier, Matt DeBerry screen summary](https://www.glazierclinics.com/football-coach-resources/screen-game-essentials-simple-concepts-that-move-the-chains), 2025-04-08 | Public screen/tag/and-go outline; course/video and NFL low-block legality not established. |
| S8 | [Matt Drinkall, Sprint-Out](https://blogs.usafootball.com/blog/7324/the-sprint-out-package), 2019-06-10 | Coach's launch/protection/route-counter dependencies and handedness adjustments; broad effectiveness claims not adopted. |
| S9 | [Zach Dunn, four-strong](https://blogs.usafootball.com/blog/7594/how-andy-reid-is-stressing-defenses-with-a-4-strong-passing-concept), 2019-10-02 | Analyst's distribution/check/push/run-fit example; frequency and universal nomenclature not established. |
| S10 | [Keith Grabowski, protection postseason audit](https://blogs.usafootball.com/blog/4912/build-a-plan-to-improve-pass-protection-for-next-year-by-conducting-this-postseason-analysis), 2017-11-13, updated from 2015 | Distinguishes hurry/hit/sack and assignment/technique/protection weakness; its timing heuristics are not causal cutoffs or NFL calibration. |
| S11 | [Stephen Spiewak reporting Josh Herring, Y Cross scan](https://blogs.usafootball.com/blog/3692/inside-josh-herring-s-y-cross-play-and-scan-read-concept), 2017-06-02 | Backside access then macro/micro reads in a specific install; podcast not inspected. |
| S12 | [Justin Whitlatch, West Virginia 96](https://blogs.usafootball.com/blog/7019/learn-how-west-virginia-utilized-the-air-raid-concept-known-as-96), 2019-02-08 | Tagged first read and changed personnel/back-protection examples; embedded film/install figures not independently analyzed. |

For official legality use the exact served-rule provenance already retained in
[the handbook source catalog](../../data/research/football-handbook-sources.json).
The generic rulebook URL served a 2026 URL/title with some internal assets naming
2025. This chapter does not verify those PDFs, refetch that page, or infer a
current NFL permission from a college/high-school technique example.
