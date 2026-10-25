# Football stress tests for the shared physical model

Use unusual but recognizable football pictures to expose a small number of
general failures: entering contact with lateral momentum, braking into leverage,
changing work when an assignment becomes impossible, several simultaneous
contacts, and preserving an attainable pursuit path. Keep ordinary football
controls beside them. The goal is a reliable movement/contact model, not a new
playbook or a prescribed number of yards for every call.

The current bounded-attachment repair is intentionally subtle in most run
clips. It changes a specific loaded lower grip, not initial run assignments,
receiver sorting or every pursuit decision. Similar-looking baseline/candidate
clips can be a correct nonregression result. Use the
[natural held-runner comparison](archive/reviews/bounded-attachment-and-contact-transfer.md)
to inspect the particular failure it fixes.

## What is supported today

- All bodies use the production `World`; the same movement, hand, grasp,
  traction, support and work accounting must remain authoritative in labs.
- Existing calls include inside/outside/wide zone, split zone, Power, Counter,
  Trap, Duo, Draw and Toss. Existing controls include run blocks, downfield
  blocks, routes and pursuit. `src/lab/scenarios.ts` supplies six small physical
  interactions; `scripts/diag/run-concept-process.ts` observes combos, climbs,
  puller contact and mesh without changing decisions or RNG.
- There is no installed pre-snap motion/shift execution model in the current
  `OffensivePlayCall`. `PassConcept.family` admits `screen`, but the shipped
  concept pool has no screen entry or complete screen-blocking install.
- A lab can start a body with lateral velocity and test the resulting contact.
  That is a **snap-time mechanical witness**, not evidence that the defense
  correctly saw, communicated or handled the preceding motion.
- A custom pressure/drop ledger can test three rushers and eight coverage jobs
  on the existing defensive eleven. This is different from installing a true
  three-DL prevent package or a late-game coordinator policy.

Do not add a physical mechanism just to make one of the pictures look right.
First determine whether the fault is the legal setup, ownership/read, requested
movement, physical execution, contact, or possession/whistle rule.

## Research and formation legality

The following public pages were fetched and their text inspected on
2026-10-10. Search snippets alone are not treated as evidence.

| Checked source | Useful claim | Limit |
|:--|:--|:--|
| [NFL Rulebook](https://operations.nfl.com/the-rules/nfl-rulebook/), Rule 7-4-6/7/8 and 7-5-1 | Seven or more players on the line; eligible endpoints; a legal shift ends with everyone set together for at least one full second; one backfield player may be moving parallel to or away from the line at the snap | Current served rules, not proof that the engine enforces them. Contact/eligibility also require Rules 8 and 12. |
| [Coach Dan Casey, “Running ‘Boot’ 4 Verts out of Empty Quads”](https://www.coachdancasey.com/new-blog/running-boot-4-verts-out-of-empty-quads), 2020-07-21 | Describes Memphis in “Quads Lt. Diamond with a Boundary Nub TE”; the diamond presents a screen threat, followed by a bubble fake, LG boot pull, #3 bender and diamond-point leak | A college example of a screen constraint, not measured NFL screen frequency or an authenticated team install. The linked video was not quantitatively analyzed. |
| [Oliver Connolly, “Quads, Quads, Quads, Quads, Quads, Quads — Everybody!”](https://www.readoptional.com/p/quads-quads-quads-quads-quads-quads), 2021-12-02 | Discusses NFL four-strong formations, trips plus a same-side back, empty 4x1 and diamond groupings; gives Packers/Cowboys examples and notes NFL hash/spacing constraints | Qualitative film analysis. Claims about league trends are not extracted rates or calibration targets. |
| [Football Toolbox, “Quads Formation”](https://footballtoolbox.net/offense/quads-formation), 2023-03-30 | Describes Kevin Kelley's quads passing package and the need for defensive adjustment | High-school/college teaching article and course preview; “unstoppable” is promotional language, not a test requirement. |

The supplied [offensive textbook](references/Offensive_Playcalling_Textbook.md)
chapters 11–12, 14–15, 17 and 26, the
[WR/DB textbook](references/WR_DB_Mechanics_Textbook.md) sections 15–22 and
Labs 7–9, the [RB textbook](references/Running_Back_Mechanics_Textbook.md)
sections 7–16, and the
[coverage manuscript](references/Coverage_Operating_System_Manuscript.md)
Labs 10–14 supply useful installation hypotheses. They are user-provided
teaching syntheses, not measured motion, official rules or repository
instructions. Their figures were not supplied. See
[reference provenance](references/README.md) and the
[offense literature review](archive/reviews/offense-literature-applications.md).

### Legal versions of the proposed motion pictures

**Twin-TE, stack, then motion bubble.** In 12 personnel there are two WRs, two
TEs and one RB, not two field WRs plus another WR on the opposite side. A legal
version begins with Y/H as the two on-line ends and X/Z off the line, one WR on
each side. Move X across to form the field stack, let him stop, then move Z
laterally toward the target side and snap with only Z in motion. This keeps
both attached TEs uncovered because the exterior WRs are off the line. A
conservative lab script can insert an all-set second between stages.

That extra second is not universally required between two sequential
one-at-a-time backfield motions: Rule 7-4-7 expressly permits the next motion
after the previous backfield player has completely stopped. If players overlap
in motion, it is another shift and the simultaneous one-second reset applies.
If an on-line X changes position, adjust the other on/off alignments and verify
the legal endpoints before the next stage. Never snap while he is still moving
on the line.

**2x2, slot TE into split zone.** Use five OL, one on-line WR on each side,
off-line slot WR and off-line slot TE, plus QB and RB. The TE can motion
laterally behind the core and be moving parallel to the LOS at the snap. His
post-snap slice crosses behind the OL to the backside edge; it is not the RB's
lead track. Being called Y or X does not itself establish eligibility.

**Quad diamond screen.** Define exact geometry because “diamond” also names a
backfield formation. The intended stress case is an empty 4x1: the boundary
eligible and the field diamond point are the two on-line ends, the other three
diamond receivers are off the line, and the QB is the fourth backfield player.
The point is the outermost *on-line* player on its side, so no eligible is
covered. A TE can be the boundary nub and the RB can be one of the diamond
players. A catch behind the LOS does not grant permission for holding,
blindside contact, low blocks or every other kind of screen block. Record the
actual pass/contact locations and rule state; do not call every contact legal
or award a foul from the play name.

The engine's `0.6`/`1.2` depth convention is an alignment approximation, not a
complete officiating model. Save a separate on-line/off-line and eligible
inventory for these test definitions. Refuse an illegal or ambiguous install
before collecting its football outcome.

## A common measurement contract

Every scenario should store its ID, source-content hash, script hash, exact
roster profiles, player/role mapping, RNG seed/state, snap setup, body state,
intent policy, physics mode/substeps, controller tick duration, horizon and
recording level. Save the installation rule beside actual assignments. Do not
quietly regenerate a more favorable roster or select only dramatic plays.
The same seed preserves the initial random inputs; after a treatment changes
decisions, later draw order and game histories can diverge. Label that limit
rather than treating every later difference as an isolated physical effect.

Three paired questions are distinct:

1. **Mechanics:** same bodies, geometry and commands, change only approach
   velocity, angle or available support. Extra initial velocity is extra
   initial kinetic energy, not free motor work.
2. **Execution:** same physical capabilities, change the installed footwork,
   key or read response. A useful comparison can replace a poor approach with
   a better legal approach; neither may move a body directly during play.
3. **Information:** same physical starting state, change what the player was
   able to see during motion. This needs an actual pre-snap perception/history
   path; a seeded velocity alone cannot answer it.

Record the first useful or invalid boundary, not just a final win:

| Layer | Observables |
|:--|:--|
| Setup and ownership | Eligible inventory, called and effective assignments, unowned threats, duplicate incompatible jobs, run-fit gaps/force/alley partners |
| Read and control | Stored delayed observation/key, actual branch and target, requested velocity/facing/posture, next reassessment, why the old assignment became unavailable; unknown if no causal record exists |
| Achievable movement | Actual velocity, acceleration, required/achieved braking, approach angle, path obstruction and lateral momentum at first contact |
| Contact and support | Actual hand/grasp acquisition, relative point velocity, force/capacity, load direction, slip/release reason, support/base/capture-point state, corrective movement and fall onset |
| Football consequence | Mesh/catch timing, first contact/LOS crossing, displacement/containment, first reliable tackle opportunity, after-contact movement, exit cause and conversion |

All participants remain in one World. In a reduced fixture, parked bodies must
be far away and cannot secretly push the test island. Use the complete contact
island for momentum accounting; a participant subset may exchange momentum
with an outside body. Account for ground/external impulse rather than requiring
player momentum to be conserved against the turf. Separate motor work, passive
contact work/loss and numerical correction according to the World reports.
Finite state, bounded forces/reach, penetration within declared solver
tolerances, valid ownership and no unexplained work are requirements; an exact
gain or automatic tackle is not.

For a mathematical mirror, reflect positions, velocities, facing, targets,
paths, posture/lean and roles while retaining the same player profiles and
random inputs. `offCall.flip` can change responsibilities and is not by itself
a mirror test. Translate away from field boundaries as a separate invariance
check. Use native physics resolution first, then 24/48 on retained interactions
that expose a problem; keep 20 Hz controller ticks unchanged. Save the first
point of refinement disagreement. Do not demand bit-identical whole-play paths
after a discontinuous contact/decision change, or increase resolution globally.

Observers and full recordings must preserve bodies, intents, outcomes, events
and the next RNG value compared with an unobserved run. Read existing stored
perception/decision fields; do not invoke an extra player read to populate a
diagnostic. Sampled proximity is not automatically a block, and a planned
double is not a loaded double.

## First six scenario families

These are small lab additions using existing movement/contact controls. Some
are reduced witnesses for concepts whose full execution is not installed.
They do not commit the project to building a motion system or screen playbook
before repairing the retained sustained-contact divergence.

### ST-01 — Split-zone slice with momentum at the snap

**Question:** Can the same hand/contact/support model explain both a controlled
moving cutoff and a fast arrival that carries the TE past good leverage?

Start a TE behind the OL track and a backside end outside the tackle, using
the existing slice/pull block control. Keep snap positions, profiles and end
control identical; vary TE lateral velocity between stationary and two moving
inputs within his profile's attainable envelope. First isolate TE/end, then
add OT and RB as a traffic guard. The TE must pass behind the OL, not through
their occupied bodies. Use a square/squeezing end as the ordinary control and
a penetrating end as the difficult case. Initial velocities are declared
experimental inputs, not measured NFL motion-speed constants.

Record first contact angle/speed, hands/base/posture, capacity/load/slip,
cutoff duration, TE overshoot/braking/recovery and the end's actual return path.
Higher momentum can produce more displacement *or* a worse fit; no general
“moving TE wins” assertion is justified. A late or missed kick may be correct
physical execution of a bad approach. A far-backfield end can make the original
block infeasible; show that before diagnosing a lost assignment.

**Ready now:** reduced snap-time contact witness. **Later:** legal pre-snap
motion, opponent vision/communication and real split-zone mesh in the same
history. Keep that distinction in the film caption.

The first diagnostic being implemented is
`scripts/diag/motion-contact-review.ts`: two roster seeds, both mathematical
mirrors, TE lateral speeds 0/2.5/4 yd/s, surface/penetrating end depths and fixed
12/24/48 physics subdivisions, for 72 primary reduced witnesses over 2.5 s.
Separate out-of-initial-reach/high-speed negatives check acquisition boundaries.
The speed inputs are declared sensitivities. Its evidence must retain source,
observer and initial-energy accounting; these planned cells are not a claimed
pass or a measured NFL motion cohort.

### ST-02 — Trap/Counter against a changing edge or penetrator

**Question:** Does a puller choose and physically execute an attainable kick,
log or abort, rather than chase a defender's obsolete point or stop in traffic?

Use existing Trap and Counter against Over/Under, with the same bodies in a
contained control and a penetrating/slanting witness. Inspect the actual run
plan before altering anything. Pair existing approach control with a bounded
alternate legal approach, holding force/profile limits fixed. Start with one
puller/defender/RB; then restore the complete line to include backside clearance
and a second puller. Avoid prescribing which named guard must win every rep.

Record pull-path waypoints, attainable interception/braking, target exchanges,
collision-free route availability, first hand contact and relative velocity,
kick/log state, helper arrival and where the RB presses. “No block” must be
split into infeasible assignment, late read, obstructed approach, failed
acquisition and failed sustain. A whiff is permitted; repeatedly choosing an
unreachable target after seeing penetration is a control diagnosis.

**Ready now:** current play/approach and process labs. **Later:** fuller
front-specific contingency installation. This is particularly useful for the
owner's reported trap overshoots without assuming the physical motor is wrong.

### ST-03 — Zone combo that has to hand off and climb

**Question:** Can a helper leave at a physically defensible moment, and can he
reach the linebacker with usable leverage instead of running at his old spot?

Use one actual covered/uncovered pair, a first-level defender, a scraping
backer and an RB. Pair inside zone and outside/wide zone with a stationary
backer control and a moving/slant witness. Compare early, late and observed
feasible release choices using the same bodies. Test both the obvious keeper
and the exchanged keeper. Do not tune how fast the helper runs or give a
double-team strength bonus to manufacture a climb.

Record **both** members' actual loads, keeper-alone support/load feasibility,
observed backer cue, genuine climb versus penetration collection, vacancy
created by release, helper approach and reacquisition. A visible lane does not
by itself prove the keeper can handle the first level alone. Conversely, an
unthreatened first level must not keep a helper attached forever. Existing
`run-concept-process` output is a starting point, not proof of the keeper's
counterfactual ability.

**Ready now:** explicit small fixture and current process observations.
**Later:** production release/read repair after a retained witness establishes
which cue is missing. Review process, not just yards or climb count.

### ST-04 — Quad diamond screen contact and traffic

**Question:** Do three perimeter blockers and several defenders retain finite
individual capabilities when the carrier enters a compact multi-contact area?

Begin **after a documented hypothetical catch**, with one carrier, three
eligible blockers and three or four defenders. Use existing downfield/stalk
block controls and pursuit. Compare an ordinary spaced trips-screen geometry
with legal compact diamond spacing, stationary carrier with laterally moving
carrier, and a force defender outside versus an inside-out pursuer. Specify
whether the catch is behind or beyond the LOS. This is a contact/traffic
witness, not a simulated successful QB bubble throw.

Observe which blocker takes force/alley/inside pursuit, duplicate targets,
legal approach angle, teammate collision or obstruction, shared loads in a
double, carrier braking/cut choices, defender shed and reachable tackle path.
More blockers cannot multiply one body's hand/ground capacity. A crowded
diamond may create interference and worse leverage; it does not guarantee an
advantage. Count tackles missed from late reads separately from holds that
physically slip. Preserve glancing contact and ordinary single-block controls.

**Ready now:** reduced post-catch witness. **Later:** a real 4x1 formation,
pass timing, screen-blocking install, receiver eligibility/contact predicates
and defensive exchange/force rules. Pair real bubble with bubble-fake-to-leak
only after those exist; Casey's boot constraint is a useful future hard read.

### ST-05 — Inside zone/Draw on 3rd & 27 against eight coverage jobs

**Question:** Does a pass-oriented defense give up underneath space while
still recognizing the run, preserving a fit and making achievable tackles?

Use a matched eleven and a 2×2 factorial: 1st & 10 versus 3rd & 27, and stock
four-rush/seven-coverage versus a documented three-rush/eight-coverage ledger.
Run Inside Zone and Draw from the same Gun Doubles formation. Use the same
roster and named play seed in all paired cells. Count actual jobs; an Odd
front name does not ensure three rushers. A dropped edge remains a real body
with an explicit coverage/run obligation, not a parked exemption.

The first implementation should use stock coverage landmarks and label them
accurately. A defender set twelve yards deep is not an invented 27-yard-deep
prevent rule merely because the line to gain is 27 yards away. A full deep
prevent witness requires an explicit installed depth/support policy and must
be a separate treatment.

Measure first-level blocking angle, first contact, time/gain to LOS, reaction
and insertion of each underneath defender, tackle opportunity and after-contact
movement. Report raw gain, negative runs, explosive runs and conversion
separately: an eight-yard gain can be productive running yet a failed 3rd & 27.
The two treatments change recognition and responsibility; they need not have
identical event histories after the snap. Do not assume a light pass look must
concede a fixed number of yards or compare one generated roster's mean with an
unconditional NFL rush average.

**Ready now:** explicit lab ledger using existing drop/coverage behavior.
**Later:** true three-DL personnel, full prevent playcalling and situation
strategy. These are football/controller investigations, with physics guards,
not evidence for changing traction to tune conversion rate.

The initial harness is
[`scripts/diag/long-yardage-run.ts`](../scripts/diag/long-yardage-run.ts): two
fixed roster pairs (31/32 and 41/42), Inside Zone/Draw, both formation flips,
the two situations and the two rush/drop ledgers, for 32 actual 11v11 reps.
It uses Dime Over and spot Quarters; only DE_W's drop changes between defensive
looks. Its reported snap audit, source/profile pins, observation controls and
physical outcomes must be read before treating the setup as sound. This plan
does not predeclare the still-to-be-reviewed measurements a pass, an NFL rate,
a perfect mirror or a true prevent implementation.

### ST-06 — Open space, boundary force and two converging tacklers

**Question:** Does the carrier remain in usable field space when it is open,
and do converging defenders brake/fit without routinely taking each other out?

Use the existing sideline lab's clean, head-on, boxed-boundary and sticks
geometries. Add a second pursuer and an outside-zone exit snapshot only after
the two-body baseline is understood. Keep a center-field carrier control with
identical relative opponents. Pair lateral exit momentum with a controlled
upfield heading; distinguish physical inability to stop from a choice to exit.
If game clock/score is not provided, do not invent a clock-preserving reason
for running out of bounds.

Record candidate steering/exit cost when available, actual chosen heading,
inward braking distance, nearest reachable threat, forced displacement,
boundary crossing and missed-tackle/teammate collision timing. A safe exit can
be a reasonable choice against a closing defender after the needed gain. An
unpressured carrier repeatedly choosing the boundary with a feasible upfield
lane points to control, rather than weak traction. Some teammate collisions
are credible; their occurrence alone is not a physics defect. Check whether
the same physical state makes the different approach executable.

**Ready now:** `scripts/sideline-lab.ts` and current pursuit/carrier controls.
**Later:** validated clock/risk personality and explicit multi-defender fit
coordination. Do not add a generic “fear” probability to explain clean exits.

## Further hard reads and difficult blocks to retain

These are catalogue entries, not immediate implementation requirements.

| Fixture | Shared interaction under stress | Important control / limitation |
|:--|:--|:--|
| Return jet/orbit motion into bubble, then counter away | Momentum continuity, teammate clearance, secondary redirection | Future motion history and updated fit ownership; defense need not follow every fake |
| Stack switch or bunch mesh versus lock and banjo | Incidental collision, hand contact, recovery and traffic | Compare installed ownership; avoid making holding/OPI judgments from proximity alone |
| Bubble fake, diamond-point leak, opposite boot | Defender trigger/brake/recover, pulling protection | Real ball/receiver cues; no automatic screen trigger or omniscient fake detection |
| Crack-replace outside zone | WR/DB contact, force/alley pursuit, safety approach | Legal contact rule and actual replacement ownership; blanket crack blocks are not legal |
| Wham against a penetrating interior lineman | Oblique contact between unequal masses and moving bases | Caller/TE approach must not require a blindside/low illegal hit; ordinary down-block control |
| Pin-and-pull versus a hard spill | Two arrival paths, kick/log and runner tempo | Future installed rules; same capabilities as Trap/Counter, no scheme multiplier |
| Split-flow naked boot with an unblocked edge | Feasible redirect and rush/contain approach | Intentional unblocked job with a QB answer; not every free rusher is a protection error |
| Scrape exchange against split zone or zone read | Two threats, delayed read and moving fit | Zone-read decision is not currently installed; first test explicit roles without pretending the QB read is modeled |
| Inside zone backed up at own goal line / compressed red zone | Boundary-aware movement, push, balance and whistle | Translate control in open field first; goal/end-line decisions change the football problem |
| Slow RB/TE screen with OL releasing through traffic | Sustained contact release, acceleration and downfield approach | Future pass/contact eligibility and protection-release rules; no arbitrary timed block disappearance |

## Cost, promotion and ordinary controls

Build ST-01 first as a small observational script, not a new physics backend.
Use a stationary control and two declared moving speeds, two roster pairs and
both mirrors: twelve primary trials at native resolution, about two or three
seconds each. Retain the most informative regular contact and difficult
penetration cases for 24/48 refinement. Keep initial kinetic energy and all
profiles visible. A 2-body witness is cheap enough to locate the first wrong
contact before running a whole play. The live slice uses existing World and
RunBlocker commands; never force a block or edit velocity after contact to
make the answer look football-like.

The reduced script cannot prove full motion handling. It can establish whether
a carried-in velocity exposes a common geometry, force, support or approach
failure. If it shows a bug, fix that one cause and carry the resulting contract
into normal blocks, press contact and tackles before adding more detail.

For each later family begin with 8–12 primary reps, one or two diagnostic
counterexamples and two observed/plain controls. Add a wider sweep only if
those reveal sensitivity worth measuring. Keep raw output under ignored
`out/`; retain reviewed summaries, exact setup and a small fixed film panel.
Measure elapsed and CPU time on the actual host; do not promise an unmeasured
runtime or put long factorial panels into the normal test suite.

Current ordinary control commands, using the project's Node 22 environment:

```sh
node --import tsx scripts/scenario-pack.ts out/stress-normal-scenarios.json
node --import tsx scripts/diag/run-concept-process.ts out/stress-zone-process.json --runs iz_strong,oz_strong,wz_strong,split_zone,trap --fronts over,under --seeds 3,11 --seconds 4 --verify
node --import tsx scripts/sideline-lab.ts 1 out/stress-sideline.json
```

These commands exist now. They are separate diagnostic views, not a complete
implementation of the catalogue, a common cohort, or an aggregate readiness
score. Existing movement/contact regression panels remain promotion guards.
Use identical sources and input hashes for baseline/candidate films; include
quiet normal plays as well as difficult fixtures.

A test earns a permanent assertion when it identifies a physically impossible
response or a reproducible contract error. A believable missed block, delayed
read or failed tackle belongs in a process distribution and film review, not
an exact-yardage assertion. NFL tracking can later anchor conditional approach
speeds, get-off, contact timing and acceleration by role/phase; it cannot infer
every assignment or why a player chose a path. NFL success/explosive figures
should be matched to concept/front/situation and player cohorts before use.

This catalogue complements the current priority of diagnosing sustained
hand-contact refinement. It does not make a motion/screens expansion a gate
for that repair, and does not award the owner's final physics OK. Read
[PHYSICS_DEVELOPMENT](archive/plans/PHYSICS_DEVELOPMENT.md) for the shared model, validation
layers and limits on parameter fitting.
