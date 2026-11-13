# Trench football: responsibilities, useful surfaces and recoverable movement

This chapter is an original coaching-to-engine synthesis. Its purpose is to
make blocking and defensive-line decisions teachable, observable and testable
with the reduced shared physics model. It is not a recovered NFL installation,
a biomechanical calibration, or a claim that the proposed controllers exist.
Teams disagree about footwork, technique names, combination releases and
protection authority. An engine should represent those choices explicitly.

The development baseline for the findings here is the position-technique review
following `80e8151`; the promoted cutoff-only source is `dd4cbb75…`. Read
[the current status](../STATUS.md)
before using a historical report as a description of today's engine. The
cutoff repair demonstrated actual containment with unchanged physical laws;
it did not improve every run or earn an NFL realism claim. The QB torso-direction
and RB corridor prototypes in that review were withheld.

## 1. A block protects a path, not a label

A lineman does not need to put every defender on the ground. He needs to deny
a relevant path long enough for the offense's runner or pass to use another
path. An end ridden beyond the QB can lose his useful rush without losing all
contact. A DT displaced a short distance but turned away from the crease can
be effectively blocked. Conversely, a large displacement in the wrong
direction can carry a defender into the runner.

Use five separate descriptions for every job:

| Description | Football question | Engine representation |
| --- | --- | --- |
| Installed responsibility | Which threat, gap or relationship belongs to me? | Call, side, target or target-selection rule, partner, protected path, replacement rule |
| Acquired evidence | What did I actually see, hear or feel? | Delayed picture, source/age, remembered cue, received call, local contact load |
| Intended surface | Which shoulder/half should I reach or preserve? | Approach/contact frame defined before arrival |
| Requested action | What do I attempt with feet, posture and hands? | Attainable movement request, orientation, strike/contact request, effort |
| Achieved result | What did contact and support allow? | Actual separation, hand contact/load, support, displacement, denied access |

The same mass, traction, reach, support, hand/grip and work budgets govern each
case. A reach technique changes the useful surface and approach; it does not
add a reach-strength multiplier. Two blockers contribute their own constrained
loads; a double-team tag does not double one body's power. A shed can clear
hands and create access, but it does not teleport the defender around a hip.

The latest cutoff defect illustrates why these descriptions matter: the
blocker could reach the installed shoulder while the engagement's displacement
frame graded that same shoulder as a loss. The repair installs the contact
surface separately and still grades actual arrival. See
[“A coherent installed cutoff surface”](../archive/reviews/position-technique-and-awareness.md#a-coherent-installed-cutoff-surface)
and [the independent physical verification](../archive/reviews/position-technique-repair-verification.md).
That narrow result does not authorize rewriting every reach/contact frame.

## 2. Feet, base and hands: the useful reduction

The first step should improve access without making the second action
impossible. A lateral reach step buys width; a short down step closes an inside
angle; a pass kick gains depth. Each can become an error if it leaves the body's
support too far behind the next contact. The next foot replacement recovers a
workable base rather than merely continuing the first step's velocity.

Useful coaching concepts to preserve are:

- **Supported arrival.** Contact while balanced enough to redirect, absorb or
  drive, rather than leaning toward a jersey from an unrecoverable position.
- **Base replacement.** Feet continue to move under load. An anchor is a
  recoverable stance, not a permanently fixed location or infinite friction.
- **Shoulder and hip relationship.** The blocker tries to place a useful half
  of his body on a relevant half of the opponent. A square drive, lateral reach,
  down wall and pass ride require different relationships.
- **Hands with feet.** Hands can delay, steer or displace only through acquired
  contact and finite force. Reaching with the upper body before the base arrives
  exposes a snatch, rip or loss of balance.
- **Independent recovery.** One missed strike need not erase both hands or all
  footwork. Preserve physically surviving contact and attempt a new useful fit.

The model can approximate these through body orientation, support/foot-anchor
state, finite replacement motion and bounded contact. It cannot certify that
an anatomical knee or foot used a literal clinic sequence. Do not add skeletal
detail simply to render the name “gallop” or “kick-slide.” Add a state only when
two mechanically different situations currently cannot be distinguished.

**Mechanism T1 — approach and gather.** The cue is relative distance, closing
speed and the opponent's observed near surface; touch adds actual local load.
The action adjusts approach speed/orientation while preserving the required
shoulder. The characteristic error is overshooting a moving target, reaching
from a poor base, or stopping so early that penetration wins uncontested.
The minimal witnesses are a clear ordinary drive fit, an adversarial moving
shoulder/late picture, and the exact same-body mirror. Record desired versus
achieved path, first useful contact, support and delivered load. Tracking can
constrain approach trajectories; it cannot reveal literal foot placement or
inside hand ownership. A blanket slower approach is not acceptance.

## 3. Zone football is local work within a coordinated direction

Covered/uncovered is a starting classification, not a complete assignment.
“Covered” concerns a first-level defender over the blocker's surface under the
installed rules; a walked-up linebacker can count. “Playside” of an individual
blocker is relative to the run direction, not simply which half of the line he
occupies. The same lineman can face a playside shade on one call and a backside
shade on the next.

Kuchar's public description [C1] separates covered playside, covered backside,
uncovered open gap and uncovered closed gap. Penree [C3] uses explicit technique
tables, including near-knee movement to decide reach versus climb. These support
local conditional rules; they do not prove that one table is universal.

### Inside zone and brief help

The covered blocker fits the relevant half while the uncovered player checks
the adjacent near gap. A defender slanting into that gap becomes immediate
first-level work. A defender moving away can allow the uncovered player to
advance to his assigned backer. Both should preserve the runner's possible
entries rather than treating the initial track as the only legal hole.

There are materially different helper installations. Grabowski [C2] describes
a brief punch/post with the uncovered blocker keeping an ability to respond
to the linebacker, and explicitly warns that prolonged four-hand contact can
turn his hips away from that job. Other installations emphasize a sustained
combination before release. The engine needs a brief-check policy and a
sustained-combination policy with their own evidence and constraints, not a
single timer shortened for every inside-zone call.

**Mechanism T2 — check, collect or climb.** The cue is the near DL hip/knee
moving toward or away from the uncovered player's gap, plus personally acquired
backer flow. The action is a brief check, collected penetration or a supported
second-level approach. The error is climbing while the near gap is being
penetrated, or staying buried in unnecessary first-level work while the backer
fills. Test ordinary zone-away hips, an into-gap slant/run-through, and mirrors
with exactly reflected cues. Record read age, owned threat before/after, near
gap geometry, first-level load and actual backer arrival. Sparse BDB blocker
IDs cannot label every helper's intended rule or prove that a climb was timely.

### Outside zone, wide zone and overtakes

A wider track asks the line to gain enough width and depth to reach or stretch
the front. A defender still even with the blocker and a defender widening
hard are different physical problems. Penree [C3] distinguishes regaining a
base against an even defender from running with a widening one. It is useful
to preserve this conditional distinction without reproducing every anatomical
instruction or treating a crossover as always good or always bad.

An overtake is earned: the assisting blocker gets a useful surface and real
contact so his partner can leave. If nobody reaches the outside shoulder, the
offense may still stretch the defender and create a bend/bang lane. A reach
attempt should not silently become an accomplished hook because the call
wants an outside run. “Outside zone” and “wide zone” may be synonyms or
different aiming-point/tempo installations depending on the staff.

**Mechanism T3 — reach or run with the threat.** Use observed relative width,
depth and widening velocity to choose an attainable surface. Keep the intended
seal distinct from the present lateral travel. Test an ordinary attainable
reach, a faster widening defender that cannot be hooked, and mirrored pairs.
Record when outside access actually exists, whether hands acquire/load, the
defender's still-reachable path to the runner and the back's corresponding
entry. Do not demand an outside seal in the adverse case. Tracking helps with
width/depth/time; determining intended reach versus deliberate stretch needs
film and call context.

### Split zone, sift variants and Draw

Split zone adds a crossing H/TE to the installed zone work, usually accounting
for a backside edge. The slicer must clear actual traffic and fit the moving
edge. His momentum may help deliver contact, but it may also prevent him from
recovering against squeeze or a changed angle. Slice-to-arc/sift variants need
an explicit separate read and responsibility; an ordinary slice cannot acquire
that option because a kick looks difficult.

Draw pairs a pass presentation with later run work. All helpers need to belong
to that presentation. An owner retreating in a pass set while his helper fires
out instantly is a coordination defect even if the eventual run gains yards.
Transition cues can include actual release/mesh and installed QB communication;
do not claim that a fixed delay visually recognized Draw.

**Mechanism T4 — presentation and crossing fit.** Test a clear ordinary slice,
a motioning slicer meeting a squeezing edge with traffic, and a mirror; also
retain an ordinary Draw presentation control. Record real presnap momentum,
consumed edge motion, clearance, first loaded contact and possession transfer.
A staged velocity lab is not validation of the full motion/check package.
See [run-game coordination §7](../archive/reviews/run-game-coordination.md#7-pre-snap-movement-is-physical-and-observable)
and [current motion/mesh limits](../archive/reviews/run-block-fit-and-current-priorities.md#review-across-systems).

## 4. Doubles: two contributors and a fallible transfer

A sustained double needs adjacent bodies delivering compatible loads without
crowding each other's feet. The owner and helper may use different approach
paths. A downhill Duo helper can close inside/up and replace his base; a wide-zone
helper may need to overtake laterally. The second-level assignment determines
who should leave when the geometry permits. The labels “owner” and “helper”
must not predetermine the leaving player after the DL slants.

Janak's visible Duo teaching [C4] emphasizes vertical displacement and an RB
Mike read. Its odd-front example changes the leaving member for an inside
slant or nose direction, and keeps the tackle on the double when the Mike
scrapes. This is an installation example. It does not mean every Duo back reads
the same player, every front offers two doubles, or Duo has negligible negative
play risk. Bear can remove the spare helpers through geometry.

**Mechanism T5 — retain and transfer.** Each potential climber acquires his own
picture of the remaining surface and assigned backer, with local hand/support
feedback. He proposes his own departure; he does not remotely send his partner
away using his personal picture. Physical eligibility rechecks surviving keeper
contact when the job changes. The error can be premature release, late release,
two departures, or a legitimate disagreement from different observation ages.
Use an ordinary secured double with a filling backer, an adverse slant/keeper
loss or scrape, and exact mirrors. Require unchanged bodies through the job
transition, continuity of actual keeper hands/load and real subsequent backer
contact when attainable. A release event alone passes none of those tests.

This personal-read structure already exists for joined combinations; the
[joined-combination review](../archive/reviews/joined-combination-attention.md#one-installation-two-readers-shared-physical-ownership)
documents its bounds and adverse outcomes. “Secure” physical eligibility is not
omniscient confidence in a teammate. The helper sees delayed body/contact
evidence and may infer incorrectly despite an objectively admissible release.
Per-call familiarity/training has not been installed; position familiarity is
not a substitute.

## 5. Gap concepts: account for the vacated surface before pulling

Gap calls create favorable angles, but a pull also removes a body from his
original area. Before choosing an attractive double, account for the resulting
interior threat and designate the exact kick/trap target. Do not leave two DTs
free and expect a single trapper to solve the count.

| Installation | First-level work | Moving blocker | What changes the useful action |
| --- | --- | --- | --- |
| Power, two-back example | Down/double wall; protect pulling guard's vacated surface | FB kicks, guard wraps through achieved lane | Edge wrong-arm/squeeze, LB insert, wall movement |
| Power, one-back example | Explicit alternate edge account and backside rules | Guard kick or distinct H contribution as installed | A personnel change may alter which player kicks/inserts |
| Counter GT | Down wall and vacated guard/tackle area protected | Guard kicks/logs; tackle wraps separately | Penetrator depth, actual wash, second puller clearance |
| Counter GH | Same accounting principle with a different second contributor | Guard plus H/TE jobs | H alignment/motion changes approach and available timing |
| Trap | Leave precisely the intended interior target for the trapper | Guard crosses behind first-level work and fits target | Upfield penetration, a sitting/squeezing target, congestion |
| Duo | Available vertical doubles; no necessary OL pull | Helper eventually becomes second-level work | Backer fill/scrape and DL slant; not merely zone with no width |
| Pin-and-pull perimeter | Pin a suitable inside threat; explicitly free eligible puller | Pullers reach force/alley work | Crack replacement, edge width, penetrator in vacated gap |

A down block establishes an inner wall by closing a useful angle while
preserving support. It should not aim through a distant target's center at
maximum speed. A backside hinge initially protects interior penetration and
only then turns to backside pursuit when the installed responsibility permits.
The current Toss is a stretch/reach installation; naming it Toss does not
implement pin-and-pull or crack mechanics.

**Mechanism T6 — gap account and down/hinge transition.** Trigger from the
installed reservation and observed slant/cross-face threat. Protect the
interior account before seeking a convenient double or turning outside.
Test a normal even front, an adverse reduced/Bear surface or into-gap slant,
and mirrored full assignments. Record every first-level rush/run path, its
responsible player or intentional free status, the actual interception/contact,
and when a hinge changes surfaces. A perfect assignment map still needs
reachable paths; snap alignment alone cannot prove a front's post-snap gaps.

### Pull clearance, kick and log

Pullers need depth/separation from engaged teammates, not merely an empty
starting point. The first puller's target and the second puller's insertion are
different. Kirby's account of Parker's Counter teaching [C5] identifies both
clearance and a trap-to-log response when useful inside-out kick leverage is
lost. Its unusual successful two-player block is expressly not the normal
teaching goal. An ordinary handoff should not inherit a free read edge from
the article's option examples.

A log attempt changes the intended direction of control; the wrapper and back
should react to achieved wash and access. A tag saying “log” is not proof that
the defender moved inside or that an outside lane exists. Trappers similarly
fit the target's moving upfield surface rather than the DT's snap coordinate.

**Mechanism T7 — clear, fit, then insert.** The cue is observed teammate traffic,
target approach and achieved kick/log geometry. The action gathers into the
moving surface or inserts around actual wash. The error is collision with the
wall, overshooting a sitting target, following an unrealized log, or chasing
two separated linebackers. Test ordinary stationary kick, adversarial
penetration/wrong-arm plus a congested wrapper, and exact mirrors. Record
predicted/achieved clearance, approach velocity, contact normal/support, target
displacement, and wrapper/RB path. No guaranteed kick, log or minimum yards.

## 6. Front names organize questions; geometry supplies the work

| Picture | Run question | Protection question |
| --- | --- | --- |
| Over/Under | Which guard is covered by the outside shade, which adjacent gap is open, which backer is reachable? | Where is interior help available and which DT/DE exchange stresses it? |
| Odd | How are nose/ends accounted for; who preserves backside/edge and available doubles? | Which stand-up threats count to line/back and who is intentionally hot? |
| Tite/Mint | Do inside-tackle shades close B-gap access or disrupt a pull's clearance? Who owns each edge? | Can the tackle protect his inside shade while the back/TE accounts for a wide threat? |
| Bear | Covered interior surfaces may eliminate spare doubles; who still protects vacated work? | Five immediate surfaces can consume five OL; an extra insert requires another answer |
| Wide edges | Can a reach or slice arrive without exposing inside penetration? | Width/depth needed to intercept the rush arc without oversetting inside |
| Mug/late stem | Does a walked-up player change covered status or the first-level account? | Is the threat credible, which gap/scan owns it, and has the final check reached others? |

Technique numbers are alignment vocabulary, not behavior. A 4i can attack,
squeeze or participate in an exchange; a 0 can control, penetrate or lag under
different calls. Exact TE-side numbering and what staffs call Over/Under also
vary. A named front supplies no strength modifier, bonus reaction speed or
permanent deleted gap. Compression closes a runner-width lane for an interval;
movement can reopen it.

**Mechanism T8 — late declaration.** A visible stem/shift triggers a permitted
local alert or whole-protection check. The action changes only responsibilities
authorized by the install, with real receipt/acknowledgment. Test an ordinary
stable front, a late nose shift/mug bluff where not everyone receives the same
picture, and a mirror. Record what was declared, sent, received, inferred and
executed. Uncertain calls can produce plausible disagreement. Presenting a
new front should not automatically reveal who will rush.

## 7. Pass protection is linked to the throw and launch point

### Families and counts

BOB/man starts with defender-based distribution but still needs defined game
exchanges. Full slide distributes gap responsibilities in one direction.
Half-slide combines slide-side gap work with a defined man-side account and
back scan. Fan/turn variants change the allocation under an explicit install.
Five-man protection has five bodies, not six: the remaining threat may be
handled by a hot/sight answer, quick throw or deliberate QB movement. That
answer must be shared by the QB and eligible receiver as well as the line.

The declared “Mike” is often a count reference, not a claim about the defender's
roster identity or a promise that the center blocks him. Back protection needs
an ordered scan, interception depth and check-release condition. A back cannot
block two independent paths that arrive simultaneously. Releasing while his
first key drops may still be premature if a credible second key is inserting.

The current `ProtectionCoordinator` provides ordered matching and live work
redistribution; it is not a complete distributed slide/back/hot system.
`isRusher` reads behavior participation, and some engagement geometry uses the
live QB location. These are information shortcuts to diagnose separately from
physics. See [protection anatomy](../archive/reviews/error-budget-and-protection.md#protection-89-of-sacks-were-by-unblocked-rushers),
[blocking.ts](../../src/sim/behaviors/blocking.ts) (`ProtectionCoordinator`,
`PassProtector`) and [engagement.ts](../../src/sim/engagement.ts)
(`axisOf`, `passSetDepth`, `stepPassRep`).

**Mechanism T9 — threatened paths and back scan.** Use a communicated install
plus acquired alignment/movement, not the opponent's hidden behavior type.
Test ordinary four rushers, a double-A bluff with delayed edge insert or a
five-man overload requiring a declared hot, and exact mirrors. Record the
perceived threat ledger, scan changes, blocker interception, unblocked status
and whether the QB/receiver actually acquired their answer. Keep a legitimate
overload loss. A free rusher can be a count bust, late read, unreachable fit,
physical block loss or intentionally unblocked threat; do not combine them.

### Sets, inside protection and controlled depth

Vertical, angle and jump sets trade depth, width, runway and recovery. A wide
edge does not justify chasing laterally: that can open the shorter inside
counter. A purely vertical set without needed width can surrender the outside
corner. A jump set challenges space early but has less recovery if the strike
misses. The right interception depends on the rusher's approach, the intended
launch point, nearby help and pass timing.

The tackle's inside post relationship protects the short route to the QB.
Guards and center need shared depth and accessible shoulders for exchanges;
they should not bury an uncovered center in help so completely that an interior
insert becomes invisible. The QB's climb changes useful protection geometry,
but that change must reach a blocker through observation, communication or
local contact feedback rather than perfect current coordinates.

**Mechanism T10 — set and answer the counter.** Trigger from an observed rush
arc, closing relationship or opponent's direction change. Intercept a useful
surface, preserve inside access, then mirror or ride from actual contact.
Test ordinary wide speed rush, an adversarial inside counter after an overset,
and mirrored same-profile reps. Record predicted and achieved interception,
inside-path availability, first hands, actual contact load and time/path to the
launch point. A ride past the QB can succeed despite being labelled losing
leverage; a square engagement can fail through pocket compression.

### Anchor, re-anchor and pressure while attached

Under a bull rush the blocker absorbs load, replaces support and tries to keep
his body between the rusher and launch lane. Going backward is not automatically
a shed. Losing base should affect delivered resistance and recovery; it need
not delete good hands or imply a clean rusher path. A square heavy rusher can
compress the pocket while still blocked, forcing the QB's decision before
any clean win. “Nobody won” in a replay can therefore mean unrecorded pocket
load, poor QB response, weak drive instructions or poor force calibration;
the label alone does not decide which.

**Mechanism T11 — anchor under sustained load.** Local felt force, actual
support and observed relative movement trigger controlled yielding/replacement.
Test a recoverable ordinary bull, an adversarial stronger/faster load or badly
extended arrival, and mirrors. Require finite traction/work, continuous hands
when physically possible, plausible retreat and eventual access if support
cannot recover. Retain a blocked pressure and a clean escape control. Compare
pocket depth with voluntary set depth separated; center trajectories cannot
measure the transmitted force or the coach's anchor intention.

### Twists and communication

A penetrator attacks one surface to occupy/block access while the looper works
behind into another lane. Whether the line passes it off depends on the
installation, relative depths, contact and the looper's arrival. A guard must
not leave a live penetrator merely because a hidden stunt label says the tackle
will take him. An alert is a delivered message; successful transfer still needs
an attainable contact/path for the receiving blocker. Late loops can legitimately
beat an otherwise good pair.

**Mechanism T12 — exchange an actual game.** Trigger from acquired cross-face
movement and local communication, with contact feedback. Test a normal T/E
exchange, an adverse fast penetrator/late looper or missed alert, and mirrors.
Record received call, departing/receiving ownership, preserved penetrator load,
looper path and actual new contact. No same-tick teleported hand transfer. The
submitted protection aid's chapter 19 labs are useful scenario designs, not
measured NFL stunt-success targets.

## 8. Defensive-line technique has its own intention

### Run reads and control

A one-gap defender attacks a called surface without allowing useless
penetration to create a cutback behind him. A control/two-gap technique first
strikes and maintains extension/square access, then selects a side from acquired
flow. Gap-and-a-half instruction protects a primary lane while physical squeeze
influences its neighbor; it does not produce two independent defenders.

A DL's initial key can be the near blocker's first motion and posture. Down
step, reach flow, pull vacancy and pass-set depth are evidence. They are not
certain play labels. Mesh/back track is an additional cue only when actually
acquired. Contact load is immediate local information, not knowledge of every
other block or possession across the field. Pulls and split flow need cutback,
boot and exchange rules; chasing the most obvious ball appearance can break
the called defense.

These DL descriptions are coaching synthesis informed by the supplied
[defensive aid, chapters 4–5](../references/football_defense_textbook.pdf),
not independently measured universal NFL rules. The current
[defensive-awareness audit](../archive/reviews/defensive-awareness-technique-audit.md)
and [run-fit implementation](../../src/sim/run-fits.ts) should be checked before
adding a duplicate key system.

**Mechanism T13 — attack versus squeeze.** Observed down/reach step and local
load trigger the installed attack/control response while preserving the
primary lane. Test an ordinary down block, an adverse reach/double with
opposite back flow, and exact mirrors. Record key acquisition, body/load
direction, primary gap access and actual lane width at runner arrival.
Do not award a canceled-gap tag without physical compression. Tracking plus
film can assess geometry; it cannot tell whether a defender was coached to
two-gap from alignment alone.

### Box, spill and the puller

A box/force response tries to preserve outside leverage and turn the runner
toward interior help. A spill response attacks the kick's inside surface to
send the ball toward available outside support. Both need a named support
relationship; wrong-arming into empty space is not automatically good defense.
A squeeze narrows the down-blocked surface while the defender remains able to
react to a puller. A suddenly arriving slicer/puller changes the achievable
contact and may beat him even with a correct read.

**Mechanism T14 — meet the kick in the called direction.** Use acquired puller
path and actual block pressure, with the installed force/spill/help contract.
Test normal Power with available help, an adverse log or motion slice and late
replacement, and mirrors. Record actual contacted shoulder, runner exit,
support arrival and whether the edge stayed reachable. A wrong-arm event is
not proof of a spill, and a spill without arriving support can be an explosive.

### Pass-rush attack and counter

The rusher should approach a half-man surface or power lane appropriate to his
tools, then retain that intention through initial contact. Contact should not
turn a speed arc into an unrelated bull solely because a new engagement was
created. Later choices can respond to an observed overset, shortened corner,
lost hand control or opponent's extended base. Speed-to-power requires a
supported redirection/load; a rip, club, swim or snatch changes contact/access
and cannot provide an unexplained burst of energy. Rush-lane contain and
coordinated games may make a defender wait or redirect; not every end pursues
the fastest direct sack path.

`PassRusher.plan` and `firstMove` already preserve the approach family; later
move selection and some rep state still use direct internal geometry. See
[defense.ts](../../src/sim/behaviors/defense.ts) (`PassRusher`) and
[engagement.ts](../../src/sim/engagement.ts) (`firstMove`, `chooseMove`,
`resolveMove`, `stepPassRep`). A probabilistic execution choice can be a useful
reduction, but its physically achieved effect and information source need
separate grading. Do not assume a move-name roll establishes an anatomical
hand fight.

**Mechanism T15 — attack, feel and counter.** Trigger a counter from acquired
opponent direction or actual hand/base feedback. Test ordinary outside speed
and interior power, an adverse inside counter with real blocked access or a
contain obligation, and mirrors. Record approach-family continuity, timing of
acquired cues, strike/hand changes, active work and actual rush path. Keep a
soundly blocked rep as well as a win. Sack counts alone do not validate rush
technique, because launch movement, coverage and release timing also matter.

## 9. Intelligent imperfection without random assignment deletion

The smallest useful mental model is an installed responsibility, a primary
key, remembered adjacent evidence, uncertainty and a feasible response. Add
communication receipt where a job is shared. Better trained execution can
mean an earlier useful look, less variable placement, a supported first step,
quicker reacquisition or a better interpretation of an ambiguous cue. It should
not mean global sight, more traction or an assigned block win.

Plausible mistakes have a mechanism: a helper watches the backer and misses a
slant; a tackle widens before recovering his inside base; a puller misjudges a
DT that sits; a center does not receive the changed count; a DL commits to
initial flow and reacquires the cutback late. Retain the underlying job until
observed change, contact loss or an explicit exchange justifies a new one.
Deliberately abandoning assignments at random would produce superficially
human errors without teachable football.

Touch can supplement vision cheaply. A helper can feel the partner leave;
the keeper can feel growing force; the defender can feel pressure from the
second blocker. None of that reveals a distant backer's exact current location.
The minimum diagnostic should show **key sought, evidence consumed, belief,
chosen action, physical result**, with age and uncertainty. Facing remains
body orientation rather than eye direction.

Contact legality is a further classification, not another force model. A
blocker's real restriction of an escaping opponent, location of hands/contact,
relative direction and relevant play state matter more than the presence of an
engagement tag. Losing a block is not automatic holding; sustained restriction
is not automatically legal because the engine calls it steering. Screen
release, downfield work, chop combinations and blocks below the waist need the
current official rulebook and code-specific exceptions before penalty logic.
The generated teaching aids are not a rules authority. Record the underlying
contact state first so a later rule check does not invent a foul from outcome.

## 10. What real data can constrain

The locally inspected [run reference](../../data/reviews/run-game-coordination/nfl-reference.json)
contains 1,394 designed runs from BDB 2025 weeks 1–2, with exclusions, hashes and
per-metric denominators. Its annotated handoff/contact observations and
10 Hz all-player trajectories support conditional travel, arrival and
displacement checks. The [run-data review](../archive/reviews/run-game-coordination.md#what-the-nfl-data-can-actually-teach-us)
defines first sustained OL/opponent proximity as the same pair within one yard
at two consecutive frames. That is a geometric proxy, not first hands, a secure
double, a won block or a combo release. Only 251 of 136,905 designed-run player
rows have blocker-opponent IDs in the audited all-week labels; do not infer a
complete assignment truth set from them.

The inspected [pocket reference](../../data/reviews/playbook-depth/nfl-pocket-push.json)
has 1,948 traditional dropbacks in its two-week primary tracking cohort.
“Attached” means a listed blocker within a stated proximity; it does not
measure grip or force. OL depth includes voluntary set and displacement.
Later time slices contain only surviving live plays, so late pocket depth is
not an unconditional average. Its primary restriction excludes most scrambles;
use the explicitly different cohort for a pressure-to-scramble question.

BDB 2027's athlete-matched combine/game paths can study capacity versus chosen
football movement, including OL pull/fold drills. The
[movement audit](../archive/reviews/movement-and-nfl-validation-audit.md) identifies
cohort/missing-position limits and why a known-path fitting exercise is not
holdout validation. Use matching differentiation/filtering on engine and NFL
paths, and retain `o` versus `dir` to distinguish turning the torso from
changing travel. Selected draft-player paths are not the complete NFL trench
population or an all-22 run/contact dataset.

The most useful small addition is film annotation synchronized to these
trajectories: installed surface where known, first meaningful read, useful
contact, actual takeover, departure and attainable backer arrival. Mark unknown
call/hand state unknown. Public play-by-play helps characterize situations,
run/dropback mix and outcomes; it cannot resolve hand placement or foot support.
General biomechanics can bound support/recovery assumptions, but cannot
calibrate NFL jersey grip or a DT's football diagnosis by itself.

## 11. Development order and acceptance

Start with one invalid request or physical transition in a pinned ordinary
play. Use the mechanism's ordinary/adverse/mirrored witnesses above, then a
small common front/concept panel and full-game guards. Reuse immutable native
baselines and verify observer/RNG neutrality. Preserve failed prototypes and
all adverse pairs; do not select only improved yards.

The best next trench opportunities are:

1. Make short approach prediction agree with achieved turning/braking around
   traffic; free-movement previews cannot safely promise paths for loaded or
   gripped bodies. This transfers to pullers, reaches, climbs, rush counters
   and protection backs.
2. Pilot an explicit near-surface key plus local tactile feedback, with
   personally remembered adjacent/backer evidence. Keep the successful
   self-owned combination reads; do not create an omniscient team blackboard.
3. Separate contextual run versus pass execution while keeping shared physical
   capabilities. Current `traits` blends techniques, with OL hands/feet strongly
   influenced by pass ratings. Demonstrate one identical-body run execution
   control before introducing a new training/mastery attribute.
4. Diagnose observed protection threat accounting independently of adding
   slide names. One mug/bluff/back-scan witness can expose private-state reads
   and communication gaps much more clearly than a larger playbook.

Promotion requires a coherent requested surface, physically achieved load and
useful path denial in more than one relevant interaction. Stable bounded
physics is a necessary foundation; believable teaching, correct counts and
fallible evidence are separate requirements. No league scoring target or
mandatory yards threshold should replace those checks.

## Run-film coaching checks

The [combo diagnosis](../../data/reviews/current/run-combo-audit.json)
separates three questions often hidden by a prolonged double:

- **Can the remaining blocker keep the surface?** Grade that player's acquired
  contact and support, rather than the departing player's fit. Loaded hands
  establish transmitted force; they do not establish won inside hands.
- **Can the climber actually leave?** A linebacker target does not make a path
  through the original defender available. Departure and second-level arrival
  still need achievable movement and body clearance.
- **Does the defender have a recovery response?** Inspect supported posture,
  local load, changed surface and foot replacement before changing strength.
  A short displacement can be an effective block; continued drive can also be
  valid when no backer threatens. Do not impose a universal stall distance.

The [implemented combination increment](../../data/reviews/current/run-combination-security.json)
now carries each keeper's earned hands through the handoff and checks an
observed first departure step. It also separates loaded contact from useful
contact: a helper on the wrong side must still replace his feet. These rules
use the same physical capacities; a possible climb can still miss its backer.

Jerry Campbell's public [DL run/pass teaching][dl] and [continuation][dl2]
describe defeating one member's fit, reducing exposed surface and keeping feet
under the body. These are useful reduced-model hypotheses, not evidence for an
immovable defender. The articles contain older head/leg-contact instructions;
they are not a modern NFL legality authority. Only their available public prose
was inspected, not clinic video or measured NFL block outcomes.

Counter and Trap need another distinction: **clearing the wall is followed by
reading a moving target**, rather than finishing an immutable snap-coordinate
route. Preserve the kick/trap versus wrap jobs and use a delayed picture on the
normal decision cadence. An invited defender can defeat the puller; that is
different from the puller never observing him. Draw's pass influence must also
retain contact responsibility; that remains separate work.

[dl]: https://footballtoolbox.net/defensive-line-play-run-and-pass-techniques
[dl2]: https://footballtoolbox.net/defensive-line-play-run-and-pass-techniques-part-2

## Sources and evidence status

The following public pages were fetched and their available text inspected on
2026-10-11. Retrieval URLs, HTTP status, HTML hashes and extracted text are
retained in ignored `out/handbook-trenches-sources/`. The citations concern
teaching choices, not empirically measured NFL distributions. No member-only
continuation or full clinic video was inspected. Survey/popularity and
promotional success claims are not model acceptance criteria.

- **C1 — Mike Kuchar, USA Football, 2015-09-24:**
  [Strategies for blocking covered vs. uncovered in inside zone runs](https://blogs.usafootball.com/blog/590/strategies-for-blocking-covered-vs-uncovered-in-inside-zone-runs).
  Inspected the four categories, covered definitions and open-gap near-hip
  climb/combination response. Its “front irrelevant” phrasing means the local
  classification can be reused; it does not mean front geometry is irrelevant
  to a reachable block or the offense's total account.
- **C2 — Keith Grabowski, USA Football, 2016-04-25:**
  [Building an Offensive Line: Coaching the inside zone](https://blogs.usafootball.com/blog/1428/building-an-offensive-line-coaching-the-inside-zone).
  Inspected vertical emphasis, uncovered brief punch and the explicit concern
  about sustained four-hand contact delaying the backer response.
- **C3 — George Penree, Utica OL coach, X&O Labs, 2012-03-11:**
  [“Pod Teaching” the Inside and Outside Zone Schemes](https://www.xandolabs.com/the-lab/position-groups/offensive-line/run-game-mechanics-offensive-line/pod-teaching-the-inside-and-outside-zone-schemes/).
  Inspected public covered/uncovered technique tables and drive, check/climb,
  reach, stab/climb and takeover coaching points. Teaching text is available;
  member continuation and complete practice/film evidence were not inspected.
- **C4 — Michael Janak, Cy-Fair OC/OL coach, X&O Labs, 2020-07-02:**
  [The Duo Concept: Power Without a Puller](https://www.xandolabs.com/the-lab/offense/run-game/tight-zone-run-concepts/the-duo-concept-power-without-a-puller/).
  Inspected public coaching points and Duo-versus-3-4 spacing, including
  restored helper base, fill/scrape/slant releases and Bear double scarcity.
  That high-school installation's exact alignments and low-negative-play
  claim are not universal NFL constants or engine outcome requirements.
- **C5 — Alex Kirby describing Sam Parker's Ferris State teaching, Throw Deep
  Publishing:**
  [The GT Counter Run Play in the Ferris State Offense](https://throwdeeppublishing.com/blogs/news/the-ferris-state-gt-counter-run-play).
  Inspected public three-play explanations of pull depth/separation,
  trap-to-log response, actual wash and option variants. This is a secondary
  account of a coach's presentation; full clinic video was not audited.

The supplied [protection aid](../references/offensive_line_protection_textbook.pdf)
was inspected at selected pages in chapters 2–11, 13–14 and 17–19; its count,
scan, set, exchange
and laboratory organization informed the synthesis. The
[defensive aid](../references/football_defense_textbook.pdf), chapters 4–5,
informed DL control/squeeze and box/spill descriptions. The
[offensive playcalling aid](../references/Offensive_Playcalling_Textbook.md),
§§14–16 and glossary protection terms, provides installation vocabulary.
All are user-supplied generated aids, not independent authenticated coaching
authorities; their citation lists were not adopted without separate checking.
Their provenance and original-byte hashes are in the
[reference catalog](../references/README.md).

Engine facts were inspected in `RunBlocker`, `ProtectionCoordinator`,
`PassProtector`, `PassRusher` and the engagement functions cited above.
Implementation evidence is source-pinned in the linked reviews. Witnesses
proposed in this chapter are designs until implemented and measured; they are
not additional tests already passed by the engine.
