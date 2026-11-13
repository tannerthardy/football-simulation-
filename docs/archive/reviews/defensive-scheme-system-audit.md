# Defensive playcalling, responsibility and stress-test audit

This is an original read-only audit of `beae5c7`, on 2026-10-11. The inspected
engine source identifier is
`0d2387ee2350df36a6af9b881a6efeee586b61cb4a2967ef7722431cc8e921b2`.
The subsequent [repair and native stress review](schematics-and-physics-stress.md)
documents variant/named-zone/pressure eligibility, its rejected roof-only
intermediate, and the published comparisons.
Later repairs should retain this baseline rather than relabeling its findings
as current behavior. No physical force, contact, movement or coverage technique
was changed during this audit.

The best next schematic improvement is **to compile a defensive call into an
explicit eleven-player responsibility ledger before selecting or executing
it**. The catalog already has many useful coverage rules. Its shallow point
is the join between personnel, front, pressure and coverage: a family name can
permit a pressure that removes the variant's actual deep defender, and a heavy
personnel group can retain a coverage label without supplying its deep role.
These are assignment construction errors. Faster safeties or stronger rushers
cannot repair them consistently.

Use this alongside the [defensive handbook](../../football-handbook/defense-and-perception.md),
[new schematic packages chapter](../../football-handbook/playcalling-and-schematic-packages.md),
[coverage literature applications](coverage-literature-applications.md),
[coverage-engine history](coverage-engine-and-playbook-depth.md) and
[previous man-accounting evidence](../../../data/reviews/physics-world/traffic-and-man-accounting/README.md).
The handbook distinguishes inspected coaching, supplied aid synthesis and
model hypotheses. This audit independently inspects current code; it does not
authenticate every historical coaching citation or call name.

## 1. What currently happens

| Stage | Implemented behavior | Missing contract |
| --- | --- | --- |
| Coordinator personnel | Responds to offense personnel, passing down, goal line and team scheme | Formation geometry, bunch/stack spacing and offensive motion are not inputs to `DefensiveCoordinator.call`; its `offSlots` are player records, not alignments. |
| Front | Filters catalog fronts by personnel, then weights team preferences | A front primarily stores alignment and optional run fits. Its number of pass rushers is inferred downstream rather than explicitly installed. |
| Coverage | Samples a situational NFL-based family, then a team-weighted variant | The variant is not checked against required available roles before selection. |
| Pressure | Samples by coach blitz habit, situation and opposing QB pocket rating; filters by coverage family and present blitzers | No actual rusher/coverage budget, essential-role replacement or variant-level compatibility check. |
| Presentation | Chooses another shell, occasional front stem and one blitzer creep | No explicit safe presentation envelope or defender-local agreed check. Shown coverage can itself lack named roles for the personnel. |
| Snap check | Central `PlaySim` constructor applies distribution check, or Zeus | No local message/acknowledgment state; Zeus takes a separate path and skips ordinary formation checking. |
| Role allocation | Pressure roles first, front rush defaults next, named coverage roles next, then greedy underneath seats or man matching | Optional help and man-marker shortages receive safeguards; missing named deep roles and zone-seat shortages do not. |
| Post-snap | Each match defender reads delayed receiver pictures and changes technique from current position/momentum | Several relationships use snap-fixed numbering and locked branches; there is no explicit sender/recipient exchange state. |
| Run support | Links fits to actual front, coverage and support location; boxes an edge if support is unavailable | Coordinator always chooses stack backers and chooses spill/box from broad team scheme. The available gap-exchange tag is not selected by the coordinator. |
| Learning | Shrunk success-rate multipliers by coverage family | A family-wide failure does not distinguish bad call construction, matchup, disguise, wrong key, physical execution or a well-defended exceptional throw. |

Source path: [coordinator](../../../src/game/playcaller.ts),
[types](../../../src/playbook/types.ts), [catalog](../../../src/playbook/defense.ts),
[coverage catalog/checks](../../../src/playbook/coverages.ts),
[alignment](../../../src/playbook/alignment.ts), [PlaySim construction](../../../src/sim/playsim.ts),
[behavior installation](../../../src/sim/assign.ts),
[run fits](../../../src/sim/run-fits.ts), [match rules](../../../src/sim/coverage/rules.ts).

## 2. Reproduced construction errors

### 2.1 A family-compatible pressure can remove the only deep owner

`Pressure.coverages` currently contains family strings. The coordinator checks
`p.coverages.includes(coverage.family ?? coverage.id)` and whether each named
blitzer exists. Alignment gives pressure overrides priority over named coverage
roles. These two locally reasonable steps produce an invalid join.

`fire_zone` sends SS and Will, drops DE_W to weak curl-flat, and advertises
compatibility with `cover3`. On nickel Over with all eleven players present:

| Actual variant + fire zone | Rushers | Called deep roles | Resolved deep roles |
| --- | --- | --- | --- |
| Cover 3 Sky | 5 | CB_S strong third, CB_W weak third, FS middle | All three retained |
| Cover 3 Match | 5 | Same three | All three retained |
| Cover 3 Buzz | 5 | Same three | All three retained; SS's low hook obligation is replaced |
| Cover 3 Cloud | 5 | SS strong third, CB_W weak third, FS middle | **Strong third removed**: SS blitzes while CB_S remains in the flat |
| Cover 9 | 5 | CB_S strong third, CB_W weak third, SS middle | **Middle removed**: SS blitzes while FS remains weak curl-flat |

These are static role-allocation results, not claims about measured explosive
rates. Independent safety help can sometimes rescue the route after the snap;
that does not make the installed call sound. A five-rusher label also fails to
identify this defect: the numerical rush count is correct while the roof is
wrong.

Evidence: baseline [coordinator](../../../src/game/playcaller.ts) lines 364–368;
[pressure](../../../src/playbook/defense.ts) `fire_zone`;
[coverage variants](../../../src/playbook/coverages.ts) `cover3_cloud` and `cover9`;
[role priority](../../../src/playbook/alignment.ts) lines 431–452.

**Small first repair:** reject a pressure that consumes an essential named
deep responsibility unless the pressure explicitly installs its replacement.
Check the actual variant, not just its family. Keep Sky/Match/Buzz positive
controls; retain unsupported pairs as explicit negative fixtures. Do not
silently change the safety's job or convert the coverage name after bodies
start moving. A later pressure-specific replacement is a separately installed
call requiring its own technique and arrival tests.

### 2.2 Five aligned front players become five automatic rushers

Both stand-up edge slots and interior DL slots default to rushing. Base34 Odd
and Tite therefore start with five rushers even when `pressure` is null.
Base43 Under adds its on-line Sam as an implicit rusher in zone calls, also
starting with five. Adding a package designed around four creates an extra
rusher and removes underneath structure.

Read-only allocations using Gun Doubles at midfield:

| Front/personnel | Sky without pressure | Sky + fire zone |
| --- | --- | --- |
| Over / nickel | 4 rush, 3 deep, 4 under | 5 rush, 3 deep, 3 under |
| Under / base43 | 5 rush, 3 deep, 3 under | **6 rush, 3 deep, 2 under** |
| Odd / base34 | 5 rush, 3 deep, 3 under | **6 rush, 3 deep, 2 under** |
| Tite / base34 | 5 rush, 3 deep, 3 under | **6 rush, 3 deep, 2 under** |

Five-man rush with a suitable coverage is real football. The defect is not that
five is prohibited. It is that **alignment decides the pass rush implicitly**,
and pressure/coverage components retain semantics from a different base rush.
The present fire-zone call drops only one edge; on a five-rusher base, sending
two more produces six, not the intended five-rusher three-under distribution.
The catalog must deliberately install a six-rusher two-under coverage if that
is desired; it should not emerge as an unnoticed truncation of underneath
seats.

In man calls, alignment already converts optional low help/brackets and then
an uncalled edge into markers when necessary. That previous fix is useful.
It also shows why the rush ledger belongs above allocation: an edge-drop
decision should be installed and recorded rather than discovered solely from
a marker shortage. A stand-up edge covering an eligible has a real matchup,
orientation and footwork burden; a completed target assignment is not proof
that the matchup is sound.

**Next contract:** separate `front presentation` from `rush plan`. Store actual
rusher identities, rush lanes and named drops for a small supported set of
packages. Preserve an intentional five-man base as a distinct package. The
same front can show five and rush three, four or five without changing the
physical laws.

### 2.3 Goal-line personnel can lose required deep help

The goal-line personnel table has CB_S, CB_W and SS, but no FS. The caller
selects this personnel against heavy offenses within two yards of the goal
line, then still samples the ordinary coverage family and variant pool.
Named roles are applied only to slots present on the field.

Bear + stock Cover 3 consequently retains both corner thirds but has no
deep-middle owner. Bear + stock Cover 1 can cover the eligible inventory but
has no post safety. Bear + stock Cover 2/2-Man lacks the weak half; quarters
lacks the weak inside quarter. These are not cured by red-zone depth
compression. Inverted Cover 2 is a different example: its halves are the
corners, but the missing FS still removes the installed weak-flat named role.
Eligibility must distinguish mandatory responsibilities from truly optional
help rather than forbidding all calls by a coarse safety count.

Evidence: [personnel table](../../../src/playbook/types.ts) lines 331–336;
[goal-line personnel choice](../../../src/game/playcaller.ts) lines 284–291;
[family pool](../../../src/game/playcaller.ts) lines 311–348;
[present-only named roles](../../../src/playbook/alignment.ts) lines 448–452.

The older [19,224-case man audit](../../../data/reviews/physics-world/traffic-and-man-accounting/README.md)
checks eligible marker existence and lateral placement. It passes calls that
have lost a deep helper because deep-helper existence is outside that
invariant. Expand the assignment audit's stated contract; do not describe its
old result as a full schematic correctness proof.

**Small repair:** require each call's indispensable role or explicitly
installed substitute to exist in the personnel. Filter variants before
sampling, with a documented supported fallback if a family has no eligible
variant. Goal-line Cover 0 is a legitimate simple option; a new heavy red-zone
zone distribution should be taught as a distinct call rather than pretending
ordinary Cover 3 still has its post defender.

## 3. Depth already present, and where it remains shallow

### Checks, empty, bunch and motion

The current catalog has useful 3x1 checks: quarters can become Poach/Stubbie,
and three-match can become Mable. `PlaySim` applies them centrally before
bodies are created. `formationKey` returns `empty` for a no-back 3x2 formation,
before the later `3x2` branch, and the catalog defines checks only for 3x1.
Gun Empty therefore stays ordinary quarters or three-match unless separately
called. Empty is not intrinsically invalid in those coverages; the missing
feature is an explicit distribution/install decision.

Bunch exists as static splits and a formation tag. It receives the same 3x1
key as widely spread trips. There is no bunch/stack key, point-man/inside-out
relationship, banjo declaration or communicated switch responsibility.
`ReleaseReader.sideNow` can derive a current observed outside-in distribution,
but currently has no caller. The rules use snap-fixed S#/W# receiver identities.
An installation can intentionally lock identities; it should make the choice
explicit for switch releases rather than assuming that snap numbering and
final route distribution are interchangeable.

The new [schematic packages chapter](../../football-handbook/playcalling-and-schematic-packages.md#p3--bunch-follow-pivot-and-defensive-sorting)
records inspected public tactical examples with a locked bunch point plus
in/out sorting, and an alternative staggered press/off answer. Those analyst
descriptions support testing multiple installed traffic policies, not declaring
one universal Banjo rule or assigning a fixed probability of defender confusion.

Zeus resolution bypasses `applyCheck` in the constructor. In a reproduced
trips fixture with an inside target, Zeus resolves to stock quarters, whereas
ordinary stock quarters checks to Poach. That can be a deliberate call
priority, but the current data does not specify that priority as an installed
policy. Applying every check blindly afterward could also undo the intended
bracket. Store a short resolution receipt: original call, distribution, tag,
check, final obligations and why a check was suppressed.

Production pre-snap movement stages front stems and one called blitzer's
creep, with finite movement and inherited snap velocity. Offensive motion is
not represented in `OffensivePlayCall`, and no offensive motion is staged by
`PlaySim`. The [motion-contact lab](../../../src/lab/motion-contact.ts) is a useful
reduced initial-momentum witness, not a completed legal 11v11 motion/check
system. The two-stage motion/bubble and motion-to-split-zone plays proposed by
the owner need that missing capability before they can serve as full-play
schematic evidence.

### Communication and responsibility exchanges

Complementary match rules already read their own delayed pictures. New
techniques start from the player's current body state. These are strong
foundations for fallible decisions and real exchange costs.

The next useful simplification is a **small accepted responsibility state**,
not a universal thought simulator. A defender has a known call/version, a
key, an obligation, a pending locally observed check and an allowed fallback.
A sender can announce a short event such as `under`, `push` or `switch`; an
adjacent defender can hear/accept it with finite delay and imperfect attention.
An exchange must distinguish a requested pass-off from a recipient who has
actually accepted responsibility and can influence the threat. Depth alone
should not prove that recipient is ready.

Do not add random coverage-bust coins. Good and poor defenders should differ
through observation age, interpretation, key selection, communication and
achievable movement. A missed message or ambiguous receiver release can
produce a bust without injecting an unrelated turnover probability. Preserve
correct-assignment technique losses as a different diagnostic category.

### Pressure, containment and protection attacks

The six pressure entries are additive gap assignments and one dropper. The
entry called Double-A Mug sends both backers; it does not itself encode a
two-player mug presentation with rush/drop choices. Creep may move one chosen
blitzer. No coordinated simulated-pressure plan, three-rusher package,
two-man DL game, explicit contain lane or peel rule is represented in
`Pressure`. Independent pass rushers choose power/finesse/speed from their
tools; this is not a coordinated T-E/E-T stunt.

The minimum expansion should be one correctly installed package of each
important topology: four-man straight rush, five-man pressure with hot-lane
replacement, four-man simulated pressure, three-man rush/eight coverage, and
one penetrator/looper game. Reuse ordinary movement, hands, support and contact.
The penetrator's job is to attack a landmark/leverage and occupy protection;
the looper reads actual engagement/clearance before looping. No teleport,
automatic blocker confusion or stunt-success multiplier is needed.

The [protection coordinator](../../../src/sim/behaviors/blocking.ts) currently
identifies rush/blitz behavior and uses true rusher positions in its central
declaration. Testing disguise against that shortcut does not establish that
the OL diagnosed the look. The offense audit should distinguish installed
protection from delayed visible threats before evaluating how much a mug,
creeper or late edge swap fools protection.

### Run fits and situation

`buildRunFits` already makes coverage availability matter, chooses force by
role/location, allocates interior bubbles and boxes unsupported spill edges.
`blockingIndicator` reads observed pull/slice movement instead of the called
offensive run concept. These mechanisms are worth retaining.

The current caller's run policy is broad: 3-4 teams spill, other teams box,
all choose stack linebackers. Gap exchange is supported by the schema and
tests but not selected by the coordinator. The next installation should vary
support by actual coverage, edge technique, available player and anticipated
blocking family. Run fit still triggers from the defender's own evidence.
Do not make every safety an immediate extra interior fitter or silently
rewrite run responsibility whenever a receiver moves.

Third-and-long boosts deeper families but cannot explicitly call three rush
and eight drop. `spy` is a schema role whose installation becomes ordinary
robber zone, not a dedicated QB mirror. Red-zone depth compression fixes
destinations relative to the end line; it does not supply tighter route
relationships, compressed passing windows, goal-line communication or a
missing player.

## 4. A small architecture that supports further depth

Keep the existing catalogs/controllers. Add one planning boundary with a
short, inspectable output rather than dozens of special-case selectors:

1. **Observable formation picture:** personnel, actual receiver counts/splits,
   attached surfaces, backfield, hash, field zone and motion history. Exclude
   called routes, private blocking assignments and future ball decisions.
2. **Installed package:** front presentation, actual rushers/drops, coverage
   variant/check policy, essential pass relationships, conditional run support
   and named replacements. Responsibilities spend the same eleven players.
3. **Eligibility result:** supported/unsupported plus concrete reasons. Missing
   player, overwritten deep owner, insufficient marker budget and incomplete
   pressure replacement are separate reasons. An optional rat may be removed;
   a required post role may not vanish unnoticed.
4. **Resolution receipt:** called, checked and effective package, all final
   assignments, optional roles sacrificed and any fallback. Family is a
   reporting/scouting category; it is not the entire installation.
5. **Execution:** each player receives his obligation/key and makes fallible
   local decisions. Physics decides whether his action works. Role eligibility
   gives a sound call, not perfect defensive execution.

Select from eligible variants/packages once, using explicit weights. Avoid
unbounded random retries until a valid call happens; those conceal distorted
probabilities and make reproduction harder. Preserve a manually requested
unsupported fixture as a diagnostic negative, with an explicit test mode if
needed. Normal game calling should never accidentally select that negative.

Required named roles can begin as a small annotated installation table. A
full symbolic coverage theorem prover is unnecessary. Begin with exact static
contracts the catalog claims, then add only transfers the controller actually
executes. A tactical overlay cannot increase body traction, grip capacity or
recovery power.

## 5. Stress tests that distinguish scheme from physics

Every scenario needs an ordinary control, adverse condition, mirror and
physically unreachable negative. Use fixed profiles/initials and source/tool
pins. First test installation, then decisions, then achieved contact/movement;
yardage alone cannot identify which layer failed.

| Scenario | Why it is useful | First falsifiable checks |
| --- | --- | --- |
| Cloud/Cover 9 plus safety fire-zone pressure | Reproduces an exact join defect before a play runs | Required deep owner survives or the pair is explicitly ineligible; Sky/Match/Buzz remain supported; no extra twelfth responsibility. |
| Under/Odd/Tite plus five-man fire zone | Separates aligned front count from actual rush count | Intended five rush and three-under/three-deep ledger, or explicit different installation; edge drop moves from real stance/momentum. |
| Heavy goal-line play-action to leak/corner | A short field exposes lost help and support conflict | Essential cap/flat owners exist; fake is acquired locally; defender chooses run/pass from observed cues; no destination beyond end line. |
| Empty 3x2 plus double-A presentation | Stresses numbering, fifth eligible and protection declaration | All eligibles have installed distribution; late mug drop is not teleported; dropping backer cannot be counted as both rush and immediate seam help. |
| Bunch switch wheel against man and Palms | Tests identity versus route-path ownership and traffic | Intentional lock/banjo policy; receiver transfer receipt; real body traffic without fabricated rub penalty or guaranteed pass-off. |
| Fast back release under a carried #2 seam | Tests shared coverage/run-support resource limits | Overhang carries its key; another named defender owns released back/flat; overlap ends only on admissible replacement evidence. |
| Motion bubble with two settled receivers shielding pursuit | Tests moving snap state, density and braking | Legal one-player motion after required set; actual inherited velocity; defense's old accepted check persists until acquired update; stalk/rub contacts physically bounded. Requires production offensive motion first. |
| TE motion to split zone against wide edge | Generalizes motion momentum into hands/base/block fit | TE cannot acquire unreachable grip; gathered/log/kick choice uses observed end leverage; momentum/work/traction budgets remain identical to stationary control. |
| Third-and-27, three rush/eight drop versus inside zone and draw | Tests intentional concession and delayed support | Exactly three rush/eight coverage, coherent lanes/caps, no false run oracle; compare achieved fit arrival and contact, not an imposed conversion limit. Requires explicit three-rusher package. |
| Creeper: nickel rushes, end replaces seam/flat | Tests continuous pressure replacement | Replacement has installed key and actual arrival time; exposed hot window remains possible; OL recognition uses visible evidence. |
| T-E/E-T against slide and man protection | Tests shared blocking under crossing load | Penetrator/looper paths physically feasible; blocker exchange/contact persists only while force allows; no auto stunt win. Requires installed game/protection variants. |
| Boot away from flow with an edge peel constraint | Tests lane patience and conflicting cues | Called contain/peel differs from speed rush; run fake can fool defender but does not override physical turning capacity. |

A useful diagnostic record contains: installed/effective/accepted call;
responsibility owner; key and consumed picture age; interpreted release;
requested movement/contact; actual contact/load/support; relationship
transition; and whether the endpoint was natural or censored. Classify the
first invalid link as construction, communication, recognition, technique,
physics or execution variance. Do not call every open receiver a bust.

## 6. Use the available NFL data before inventing probabilities

The [BDB 2025 defense-call reference](../../../data/reviews/playbook-depth/nfl-defense-calls.json)
contains 9,713 charted 2022 weeks 1–9 dropbacks for coverage and 9,698 for rush
counts. Its observed rush distribution is 67.52% four, 22.26% five, 5.77% six+
and 4.44% three or fewer. These help establish that a three-rusher installation
is worth representing. They are not targets for rescaling grip strength or
forcing a fixed mixture for every generated roster.

Use its conditioned tables: coverage by field zone/personnel/alignment,
actual rush count by coverage, and pressure outcomes by rush topology.
Preserve the separate Red Zone/Goal Line charted family; the present caller
omits that distinct family and approximates it by weighting ordinary calls.
The reference does not reveal every team's complete installation or prove a
particular banjo/check policy. Receiver alignment labels do not identify an
exact motion path or what an individual defender heard.

For further data work, join native trajectories to labels for selected tasks:
pre-snap travel and momentum, rusher/dropper identification, edge versus
interior pressure, replacement arrival, vertical cap survival, run-support
arrival and actual contact proxy. The
[data handbook](../../football-handbook/data-and-measurement.md) covers public
nflverse/participation/NGS/FTN documentation and provider/denominator caveats.
The [orientation pilot](../../football-handbook/orientation-pilot.md) measures
provider angle differences, not defender eye targets or communicated intent.
PFF pass-role labels are strong retrospective evidence of actual role
distribution; they are not information the simulated OL may privately know.

## 7. Recommended order and proof required

1. Repair essential-role eligibility first: safety fire zone with Cloud/Cover
   9 and absent named helpers in goal-line personnel. Extend static allocation
   checks and run a few native ordinary/adverse fixtures. Publish every changed
   endpoint rather than claiming automatic scoring improvement.
2. Install a small explicit rush/drop ledger for four, five and three rushers.
   Add pressure replacements and variant compatibility. Preserve deliberate
   aggressive calls; reject accidental seat truncation.
3. Add resolution receipts and richer formation facts: actual 3x2 empty,
   bunch/stack and explicit Zeus/check priority. Preserve existing plain
   formations as controls.
4. Add legal offensive motion with finite movement, then one simple late-check
   acceptance/fallback path. Build moving split-zone and motion-bubble witnesses
   before multiplying motion families.
5. Improve one actual exchange, such as carried seam plus fast back release,
   using local key memory and explicit replacement. Keep ordinary technique
   losses and valid offense wins visible.
6. Install one simulated pressure and one penetrator/looper game; improve
   protection's observable-threat contract before interpreting disguise wins.
7. Revisit learned playcalling utility by conditioned exposure and error cause.
   Keep aggregate success/explosiveness as consequence guards, with generated
   roster variation and common observation operators.

The baseline reproduction is retained in ignored
`out/defensive-scheme-audit/static-allocations.json`: 35 static allocations,
five fire-zone variant overrides and three distribution/tag traces, pinned to
the source identifier above. It is a small local code audit, not a league
sample or full-play physical validation. A promoted repair should publish a
compact frozen before/after packet with its own native scenarios and exact
tools; do not mutate older published evidence to make a new claim.

The baseline `fire_zone` override results above are directly reconstructible
from `alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 40, 26.67)` and
`alignDefense` with all keys of `DEF_PERSONNEL[personnel]`, the named front,
variant and pressure, without `shown` or shadow overrides. The check traces use
the same LOS/hash and `formationKey`/`applyCheck`/`resolveZeus`. These calls do
not create bodies or run physics. If automatic-caller eligibility is repaired,
manual baseline allocation can remain a useful intentionally unsupported
negative; it must not be mistaken for a call still selected in normal games.
