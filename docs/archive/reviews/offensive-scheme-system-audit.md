# Offensive scheme system: make the existing calls coherent before expanding them

This audit inspected revision `beae5c7`, whose engine content identifier is
`0d2387ee2350df36a6af9b881a6efeee586b61cb4a2967ef7722431cc8e921b2`.
The subsequent [repair and native stress review](schematics-and-physics-stress.md)
identifies the four corrected line inventories and installed receiving-option
repair. Baseline findings below remain historical; the current progress and
published comparison are in that review.
It describes that baseline, not any repairs subsequently published alongside
this document. The constructor audit below uses the same source before and
after collection. No live outcome or NFL prevalence is inferred from it.

The biggest opportunity is **a small executable installation layer between
play names and player controllers**. We already have useful physical blocks,
meshes, routes and defensive responses. But a call can silently lose its
defining receiver, turn its first read into a permanent blocker, or use an
ineligible tight end. More named concepts would multiply those inconsistencies.

## 1. What exists, and what those features actually mean

| Layer | Installed baseline | Important limit |
| --- | --- | --- |
| Offensive identity | Five team scheme labels; personnel/formation/concept weights; talent and in-game reward weighting | Identity is mostly a sampling bias, not a practiced set of compatible installations or a response map |
| Situation | Coordinator knows down, distance, score, clock, field position and hurry | Live `PlaySim` exposes down/distance/field/hurry, but not the full score/clock/timeout context; QB risk mostly follows pressure and internal clock |
| Formation | 18 exact formation templates, flips, receiver numbering and core geometry | No independent on-line/eligibility inventory or universal covered-receiver check |
| Pass design | 17 complete templates, strong/weak numbered route maps, back usage, ordered progression, drop, play-action and TE protection tags | Optional versus essential roles are not distinguished; no composed side pool or explicit protection/read contract |
| Run design | 13 catalog calls over zone/gap/duo/trap/draw/toss families | Initial ownership is a centralized geometric construction; front-specific teaching choices and per-call mastery are not explicit |
| Protection | Ordered initial match, sticky ownership, late leftovers, physical set/contact, spare help and timed check-release | One policy for every pass; no called slide/man side, point, intentional hot threat or coordinated sight adjustment |
| Recognition | Delayed cue-driven defender run/pass belief; coverage matching; QB coverage belief | Some offensive option/assignment controllers still read private opponent state |
| Pre-snap movement | Defensive front stem and blitzer creep move through the World and leave perception history | No offensive shift/motion execution or defensive communication system |
| Screens/movement passes | Types admit `screen` and `boot`; ordinary routes, blocking and possession machinery exist | No shipped screen call, full screen-blocking install or actual boot launch path |

Code anchors are [call vocabulary](../../../src/playbook/types.ts),
[catalog](../../../src/playbook/concepts.ts), [formations](../../../src/playbook/formations.ts),
[alignment](../../../src/playbook/alignment.ts), [coordinator](../../../src/game/playcaller.ts),
[snap assignment](../../../src/sim/assign.ts), [QB](../../../src/sim/behaviors/qb.ts),
[receivers](../../../src/sim/behaviors/receiver.ts),
[blocking](../../../src/sim/behaviors/blocking.ts) and
[live setup](../../../src/sim/playsim.ts). A type name is not implementation evidence:
`PassAssignment`, `PassConcept.minReceivers` and the `beats` lists currently
have no execution consumer. `fake:'insideZone'` versus `'outsideZone'` does not
install corresponding zone action; the controllers mainly test whether a fake
exists. `boot` currently shares PA drop depth/time without a lateral boot track.

## 2. Concrete baseline failures

### 2.1 Covered tight ends are receiving threats

Four templates—`ace_12`, `pistol_12`, `i_jumbo_22`, `heavy_13`—put both X and
the inside H on the left on-line surface. Under the repository's declared
`ON=.6` convention there are eight on-line players, with X outside H. H is
covered, yet numbered as an eligible route threat. In the native 306-pair
formation/pass audit, 60 pairs assign that H a `route` controller; the other
eight protect him under the two max-protection PA tags.

Rule 7-5-1 requires eligible endpoints with ineligible interior line players;
Rule 8-1-6 identifies a player who is neither an endpoint nor sufficiently
behind the line as ineligible. These are independent of his TE position, slot
letter or route-running rating. The official text was inspected from the
retained served 2026 rulebook article payload; see provenance below.

**Small repair:** make the intended catalog formations legal—e.g. X off while
the two attached TEs are the on-line endpoints—and retain an explicit
on/off/eligible inventory. Do not remove physically useful covered-TE blocking
from future unbalanced packages: an intentional covered TE can block, but the
receiver set, numbering and QB answers must acknowledge his ineligibility.
The `.6/1.2` depth convention is an effective alignment approximation, not a
complete NFL officiating/body-plane model.

### 2.2 Max protection deletes a primary route without changing its read

`assignBehaviors` makes an inline TE a permanent `PassProtector` whenever
`teBlock` is true. `QBPass.init` resolves the original progression by receiver
number without checking that job. At baseline:

- Gun Doubles + PA Shot: S2 is Y, the called first post/read, but Y permanently
  protects. The QB keeps him first. `ready` is false and he burns the normal
  unready dwell plus 0.6 seconds before advancing.
- Across the 306 assignments, 20 include a permanently protected inline TE in
  the original progression; nine PA Shot pairs put one first.

A QB should know his teammate's called job. That is legitimate shared
installation knowledge, different from knowing the defender's future action.
Keep a check-release back as a later conditional read; merely filtering every
initial pass protector would delete legitimate outlets. Either install the
shot with a detached second receiver or give its max-protection variant a
defined outside-receiver distribution and progression. Removing the dead read
is a useful narrow repair but does not restore a deleted post-dig relationship.

### 2.3 A call can lose its defining relationship

`choosePass` offers every concept in every formation. `assignBehaviors` silently
defaults unspecified numbered routes to go/seam; `QBPass.init` silently skips
missing references. Ten formation installs lack Drive's first W2 shallow
receiver. The remaining dig/clearout routes can still create a completion, but
the call no longer has the installed shallow/dig problem its name suggests.
I-Form Jumbo + Mesh similarly loses W2, one of its opposite crossers.

The audit finds 177 pairs with at least one missing progression reference.
**That is not 177 invalid plays.** Missing optional S3 or B outlets can be
legitimate adaptations. The absent essential crosser or high-low partner is a
different problem. Declare essential route purposes and intentional adaptations
rather than requiring every listed progression reference to exist.

### 2.4 Empty is confused with the roster slot named RB

Gun Empty still has `formation.slots.RB`, so `snapContext.empty = !f.slots.RB`
is false. Its RB is physically detached and numbered S3; there is no B.
Consequently `back:'block'/'check'` supplies no core back protector, the
recognition/scouting prior is keyed incorrectly, and a PA fake can send the
detached RB toward the generic mesh. The light-box pass-to-run check only tests
`sim.slot('RB')`, allowing an ordinary handoff call with a detached RB.

Empty means no eligible back in the conventional core backfield, not no player
with position RB. Use actual aligned roles, require a valid mesh participant,
and only permit a practiced QB-run or return-motion alternative in empty.
A screen or empty concept may still deliberately use the detached RB as a
receiver. No automatic offensive disadvantage/advantage is needed.

### 2.5 Strength and talent calculations disagree with actual alignment

The coordinator's “strength to field 70%” flip assumes each unflipped template
is right-strong. Actual alignment chooses receiver count, then TE surface, then
field. I-Form Twins is left-strong by receiver count, so that policy commonly
puts its strength to the boundary; balanced no-TE spread remains field-strong
regardless of flip. `firstReadSlot` breaks equal counts right instead of using
the TE/hash rule, and evaluates the best roster player at that position rather
than the actual player selected for that slot/energy state. Zone/gap talent
weighting averages all roster OL, including reserves.

Separate passing distribution strength, run/core surface, called run side and
field/boundary. Reuse exact alignment/selected personnel where a choice depends
on them. This changes which problem is called, not a player's physical ability.

### 2.6 The protection “coordinator” knows more than the players

`ProtectionCoordinator.isRusher` reads actual defensive `behavior.kind`; later
matching uses true current position, velocity, engagement and down state.
After a fixed .35-second gate, a distant called blitzer is a known rusher even
without personal evidence. There is no called protection direction, point or
threat intentionally answered by the QB. Every pass shares the same ordered
geometric matching policy. The QB's “hot” is whichever of its first four reads
has the quickest route `breakTime`; there is no receiver agreement to replace
the space vacated by a specific free rusher.

The existing policy helps avoid crossing OL paths and should remain an explicit
legacy fallback while one improved installation is proved. Do not replace it
with a giant perfect-information assignment optimizer. Begin with a declared
five-man half-slide, a sixth back with a bounded opposite scan, and one shared
hot answer. Players acquire movement evidence independently, retain ownership,
and exchange only when the installed condition and perceived threat warrant it.

Related smaller accounting issue: `QBMind.preSnapCheck.blockersOn` checks slot
`'FB'`, while the actual fullback slot is `'F'`. A naive spelling replacement
still misses the centered I-back because the function partitions by side.
Count a mobile support job according to its installed path/capacity, not merely
add one to both sides or treat every fullback as an immediate line blocker.

### 2.7 Independent option decisions cannot yet create honest disagreement

Stick/hook option conversion reads `sim.defAlign.coverage.man` directly at a
timer, flips it with rating-dependent noise, and changes the actual route path.
QB evaluation predicts through that live `RouteRunner`, thereby inheriting the
receiver's private converted branch. The QB does not have his own fallible
prediction of the shared option rule. A future stronger anticipation model
must not mean perfect knowledge of a teammate's new decision.

Start one sit-versus-out install with explicit receiver/QB keys, separate
delayed evidence and remembered expected branch. Retain agreement and credible
miscommunication. Do not apply the previously withheld body-direction/hip
proxies as if they were validated eyes; their limitations remain documented in
the [position audit](position-technique-and-awareness.md).

## 3. The minimum reusable scheme contract

Compile a chosen call once into a **role ledger**, while preserving each
player's fallible live read. It needs six small fields, not an elaborate new
generic framework:

| Contract | Question it answers | Example |
| --- | --- | --- |
| Legal presentation | Who is on/off, eligible, attached, detached or in the core backfield? | Covered H blocks; detached RB is #3, not the scan back |
| Purpose/ownership | Which route window or pressure/run threat is intentionally handled? | Drive needs shallow and dig; Power reserves exactly one kick target |
| Initial technique | What is the practiced starting movement/contact request? | Half-slide gap set, zone check/post, controlled slice entry |
| Observable continuation | What acquired cue may change this player's job? | Guard sees a spike cross his gap; receiver sees apex wall instead of expansion |
| Shared answer | What do adjacent players/QB expect, and who can communicate a change? | Back leaves core; QB/line acknowledge the sixth threat becomes hot |
| Failure/fallback | What happens if the branch or timing is unavailable? | Keep protection and lose the outlet; abandon an unsafe fake; reset to an allowed read |

The ledger describes responsibility, not a win. Contacts remain real joint/body
interactions; clamps and force budgets are shared. An OL knowing the called
partner is normal; an OL knowing that partner's future hand-control outcome is
not. A QB knowing where the receiver is taught to go is normal; reading his
private conversion choice without evidence is not.

Keep existing controller classes. Add resolved role data and a few branch
policies to them rather than replace every behavior with a new planner.
Record installed job, actual controller, expected branch, consumed cue and
acquired/loaded contact separately. Unknown cause remains unknown in telemetry.

Two newly inspected public coaching examples make this contract concrete.
Jarrett Troxler's public Drive preview teaches slide toward the shallow, man
protection away, a named Will hot, shallow→dig→swing and an optional backside
post alert. That is a specific install, not a universal definition of Drive.
Matt Drinkall's sprint-out article connects a moved launch point, seven-man
gap/waterfall protection, flat/corner/pig distribution and opposite-handed
alignment/footwork adjustments. When the corner becomes corner-post, the pig
automatically becomes a dig so it stays out of the new reception area. A route
tag is therefore a coordinated change to another player's work, not an isolated
extra waypoint. Those examples support a small role/answer ledger far better
than importing hundreds of labels. See the new
[schematic packages chapter](../../football-handbook/playcalling-and-schematic-packages.md)
for broader source-qualified examples and adverse witnesses.

## 4. Development order with bounded demonstrations

### Increment A — Legal and coherent installs for the existing catalog

Fix the covered-TE/empty/dead-read witnesses first. Build a cheap constructor
matrix across existing formations, both flips, center and both hashes,
personnel and concepts. Essential-purpose declarations should reject or
explicitly adapt impossible installs; optional outlets must stay optional.
The coordinator and audible path must use the same compatibility function.
Retain direct lab calls where the caller intentionally supplies a restricted
teaching variation, with that variation identified in metadata.

### Increment B — One real protection/pressure-answer relationship

Install half-slide plus opposite back scan on one familiar concept. Show a
sixth threat coming versus bluffing/dropping from the same initial picture.
Use the existing line/hand mechanics. Grade identification, ownership, exchange,
individual loss and QB timing independently. The QB may throw quickly into a
dropping replacement and be wrong; a free rusher can be intentional only if
the answer was actually taught. Progress to twist exchange after that ledger
holds. Do not promise a global pressure percentage improvement from one install.

### Increment C — Compose compatible side problems

Implement a small pool: isolated receiver, slant-flat, hitch-seam, smash,
curl-flat, dig-shallow, stick/spacing and flood, with side size and required
roles. Pair side purpose, back assignment, protection and read mode explicitly.
Keep whole-field Mesh/Drive/Dagger/Y-Cross/verts as coordinated installations.
Avoid two independently sampled sides that collide in a middle window or each
assume the same back outlet. The retained 2022 route tuple study motivates this
work, but its approximately 4% mirrored share is not a universal tuning target
and route labels do not reveal the private progression.

### Increment D — One shared fallible conflict/option read

Use Stick as a compact test of apex, flat threat, cloud/Palms trap and receiver
conversion. Preserve ordered progression as a valid installed reading style;
do not force every QB into an omniscient conflict-defender optimizer. Installed
read modes can be ordered progression, a named conflict, structure-confirmation
or alert-to-progression. Names and branches vary by staff.

### Increment E — Legal motion with history, then one screen

Generalize the existing bounded pre-snap movement machinery to one eligible
off-line TE/RB, retaining achieved snap velocity and actually observed history.
Define what stays fixed and who receives a numbering/protection change; do not
re-solve all assignments perfectly at t=0. First demonstrate a stationary and
moving split-zone slice. Then a fixed bubble/now screen with two explicit
perimeter block jobs, short ball timing and a disciplined force defender.
Only then move to quad diamond or a slow OL-release screen.

### Increment F — Response maps, practice and situational menus

Coordinator learning currently pools concept reward over situations. Prefer a
small response map: pressure path/coverage rotation/force response actually
observed, counts and uncertainty, and a compatible practiced alternative.
Do not let one explosive play teach “this play is best” everywhere. Pass-call
reward and run/pass preference should separate third-down conversion, clock
value and turnover exposure. Add live situation inputs only where decisions
use them, with immutable physical capabilities. Per-call training is future
learning state; `Player.familiarity` presently means position comfort.

## 5. Scheme/coverage/protection tests before outcome fitting

| Test | Ordinary control | Adverse witness | What must be measured |
| --- | --- | --- | --- |
| Formation grammar | Standard Doubles; legal dual-TE ends | Covered TE, missing endpoint, motion from on-line | Independent eligible/on-line inventory; received route/protection job |
| Essential route roles | Drive 2x2; Mesh two crossing sides | 3x1 Drive or heavy Mesh lacking W2 | Explicit adaptation/rejection; active purpose and QB progression |
| Max protection | Three-route shot with legal TE protectors | TE originally first read becomes permanent blocker | Installed versus actual read; no dead read, delayed check-back retained |
| Five/six/seven protection count | Four honest rushers | Double-A bluff, overload, zero pressure | Every threat owned/hot/unaccounted; actual identification and contact |
| Protection exchange | Two independent rush lanes | T/E twist; delayed LB insert as back considers release | Seen crossing cue, overlap/dead gap, acquired hand load, release cause |
| Option agreement | Receiver/QB see same apex relationship | Cloud rotation, delayed key, defender jumps a predicted sit | Each player's evidence and expectation; disagreement without shared private state |
| Field/boundary and red zone | Open-field 2x2 at center and hashes | Condensed short field or 4x1 distribution | Actual lane/route spacing, help arrivals, legal boundaries; no blanket coverage bonus |
| Situation | Same install on first-and-ten | Third-and-27, must-score, clock protection | Different utility/choices where supported; unchanged mass/traction/reach |

Use native actual execution after constructor checks. Test the mathematical
mirror with fixed profiles/inputs separately from a formation flip. Freeze
initial geometry, perception histories, collector/schema and RNG inputs; retain
observer/recording neutrality. A change in decision order can change later random
draws, so same seed alone is not a causal proof. Validate first invalid decision
or physical boundary before aggregating yards, completions or explosives.

## 6. Additional football stress witnesses with high diagnostic value

The [stress plan](../../FOOTBALL_STRESS_TEST_PLAN.md) already covers slice momentum,
trap/Counter changes, combo release, diamond traffic, third-and-27 run and two
converging tacklers. The three-rush/eight-cover long-yardage fixture is actually
installed in [long-yardage diagnostic](../../../scripts/diag/long-yardage-run.ts);
it is a controlled job ledger, not a full NFL prevent system. Keep those cases
instead of restarting their evidence each turn. The following are additions,
not claims of new implemented concepts:

| Witness | Distinct stress | Minimum bounded version and negative control |
| --- | --- | --- |
| Condensed switch release | Two WRs exchange lanes while one DB jams; teammate path gathering competes with route timing | Two receiver/DB pairs in the same World; physical press versus no press; fixed stems; no automatic assignment exchange or release win |
| Bunch shallow against banjo/lock | Receiver traffic can disrupt a marker or produce an illegal pick | Correct legal routes with pursuit/contact; retain contact location and restriction; intentional receiver block cannot be called incidental just because it is Mesh |
| Return-motion scan back | A player changes from detached receiver to protector with residual lateral momentum | First a snap-time arrival witness using explicit added initial kinetic energy; later real motion history and received protection check |
| Trap against a late wrong-arm | Puller must brake, fit or log while runner follows an achievable alley | Existing Trap/Power pair with edge controllers; change end path, not block strength; retain kick acquisition and failed gathers |
| Draw versus interior twist | Pass-looking line requests become run leverage while penetrator moves into the mesh | Existing Draw with explicitly controlled moving rush paths; three/eight long-yardage case is a distinct situational control |
| Screen retreat then release | OL must stop anchoring, disengage and accelerate without carrying a persistent hand constraint | Reduced real protector/rusher plus moving recipient; scheduled laboratory release explicitly labelled; a free-flight screen is not yet a whole installed screen |
| Backside sift versus boot edge | Same TE must choose an achievable block when a disciplined end refuses to chase | Fixed reduced TE/end/QB launch track; accurate momentum/work and ball limits; root does not presently have a full boot controller |
| Two blockers bracket one force defender | Screen blocker ownership, multiple hand contacts and pursuing support create a load island | Stalk/lead controller pair and force/alley bodies; all contacts retained; no per-screen hold capacity multiplier |
| Goal-line drive into a legal short route | Max protection and compressed routes compete for the same limited field | Same body profiles at open field versus low red zone; exact boundary states and legal assignments; no extra end-zone retreat space |

A stress test earns a permanent unit assertion for a forbidden behavior—illegal
inventory, duplicate incompatible ownership, private-state dependence,
unbounded work/force, invalid acquisition—not for a promised gain. Short native
panels grade trajectories, actual loads, correctable/uncorrectable support and
adverse outcomes. Longer game and NFL conditional distributions are integration
checks after those mechanics are coherent.

## 7. Evidence and sources

**This turn's baseline constructor audit:** 18 catalog formations × 17 pass
concepts, one flip/center hash, generated teams 21/22 at strength .6, nickel
Over/stock Cover 3, LOS 40, first-down line 50, seed 5, no audible and no live
ticks. It measures assignments only. Exploratory collector and complete rows
are `out/scheme-audit/offense-contracts.ts` and
`out/scheme-audit/offense-contracts.json`; they are ignored working output,
not a promised permanent data artifact. Collector SHA-256:
`e3ac5919aa18a8a36f5d5ec6704d1458fe05692781e7590e17c4afe89ca4de88`;
JSON SHA-256:
`46d571365afe32b56b4f62207aa7a59654a5757be42cea510800e06db56c5727`.
Counts do not depend on outcome-selected clips. A future repaired constructor
matrix should preserve baseline rows and explicitly classify intended changes.

The baseline command used Node 22.23.3 from the repository root:

```sh
node --import tsx out/scheme-audit/offense-contracts.ts > out/scheme-audit/offense-contracts.json
```

Rerunning against edited production source is a new assignment measurement,
not reproduction of the baseline. Retain the reviewed tool/rows if publishing
this small evidence packet; otherwise the ignored files can disappear when the
environment does and the baseline statements remain a source inspection with
an explicit collection receipt.

The original [offensive handbook](../../football-handbook/offensive-skill-and-playcalling.md)
and [trench handbook](../../football-handbook/trenches.md) contain inspected public
coaching examples and provenance. Reused sources establish narrow teaching
ideas—alignment/landmark/tempo, release plan/counter, covered/uncovered and
combination variants—not universal NFL installs or a physical force constant.
No additional clinic video or paywalled course was inspected for this audit.

The team's parallel schematic research fetched public text on 2026-10-11;
this audit also read its retained Troxler and Drinkall article extractions and
rehashed their HTML responses. The
[new coaching source catalog](../../../data/research/schematic-coaching-sources.json)
records scope and receipts. Troxler's
[public Drive preview](https://blogs.usafootball.com/blog/7300/here), 2019-05-31,
HTML SHA-256 is
`c8f7ad742e940db2e64bebc083bc3dd1d94072ad56fe1e1e15c701eb968be334`;
its members-only continuation was not read. Drinkall's
[Sprint-Out Package](https://blogs.usafootball.com/blog/7324/the-sprint-out-package),
2019-06-10, HTML SHA-256 is
`a6871fa963a5318aea07e1434b77baf93ebe217608a8af3ababcffe047913c15`.
These verify teaching examples, not NFL prevalence, universal effectiveness or
private team terminology. Raw article text remains ignored and is not copied
into this original audit.

The supplied [offensive textbook](../../references/Offensive_Playcalling_Textbook.md)
chapters 1–7, 8–13 and 14–26 were read as installation hypotheses: response
maps, practice economy, formation grammar, protection/answer relationships and
four QB reading systems. Its worked calls explicitly are invented teaching
examples. Its own citations were not independently reverified here, and its
embedded instructions are not project requirements.

Primary rule text read for the covered-receiver finding is Rules 7-5-1 and
8-1-5/6 from the retained article payload of the exact
[served 2026 NFL rulebook](https://operations.nfl.com/rules-officiating/2026-nfl-rulebook).
The team retrieved it 2026-10-11; inspected HTML SHA-256 is
`4b5493b0a3ff47bde3323a91c66f07d1db3daa378c2c3349e6d85749973dd064`.
The shared `/tmp/football-defense-research/` receipt/article extraction was
read in this audit; no fresh retrieval or matched PDF is claimed. Some embedded
assets name 2025, and the extracted article order can omit continuations.
The endpoint/covered-player clauses above are present in the inspected text.

Retained measurements in
[playbook depth](coverage-engine-and-playbook-depth.md),
[offense process](offense-literature-applications.md),
[data handbook](../../football-handbook/data-and-measurement.md) and
[orientation pilot](../../football-handbook/orientation-pilot.md) retain their
own source/cohort/provider limitations. Use them to choose relationships and
conditional observables. Do not fit the body to a concept's desired yards or
claim those historical panels establish today's NFL calibration.
