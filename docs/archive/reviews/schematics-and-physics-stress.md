# Coherent calls and football stress tests

The most useful schematic improvement is to make **a small number of complete
calls** agree about eligibility, routes, protection, quarterback answers,
coverage, rush and run fits. The physics must execute those instructions with
the same capacities in every situation. Adding more independent route or
coverage names will multiply incomplete installations before it adds depth.

This review covers the 2026-10-11 audit of `beae5c7` and the resulting bounded
repairs on `claude/engine-priorities`. The baseline engine content SHA is
`0d2387ee2350df36a6af9b881a6efeee586b61cb4a2967ef7722431cc8e921b2`;
the final engine content SHA is
`11b97574138bdd4a99b373e4089261519bd4484f2e5ae5c87f90276a07215f85`.
The shared World remains
`4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.
No movement, mass, traction, grip, support, force/work or resolution law changed.

Read the [offensive audit](offensive-scheme-system-audit.md),
[defensive audit](defensive-scheme-system-audit.md), and original
[schematic-package chapter](../../football-handbook/playcalling-and-schematic-packages.md)
for the detailed teaching/code analysis. Those audits describe the pinned
baseline; this review identifies what was actually repaired. Twelve newly
inspected written coaching/tactical sources have dated response hashes in the
[catalog](../../../data/research/schematic-coaching-sources.json). Generated
textbooks are aids, not verified NFL measurements or project instructions.

## What was wrong, and what changed

### Offensive eligibility and installed receiving work

Four stock formations—Singleback Twin TE, Pistol Twin TE, I-Form Jumbo and Heavy
Wing—had both an attached left TE and the exterior X declared on the line.
With five OL and the other on-line TE, that produced eight declared line
players and covered the left TE. Sixty of the 306 formation/pass-concept pairs
still sent that covered TE on a route. This invalidates a football comparison
before contact, route technique or quarterback accuracy becomes relevant.

X is now off the line in those four formations. Both attached TEs remain
on-line eligible ends; their core width, side counts and personnel remain
intact. Tests inspect every catalog formation at both hashes and the center,
with both flips. The audit uses the engine's declared depth convention, not
an anatomical NFL head/waist/jersey eligibility model. Custom laboratory calls
are separately checked rather than silently corrected.

PA Shot also made its first QB read a permanently protecting inline TE in nine
installations. The QB could spend read time waiting for a receiver whose job
would never release. Installed behaviors now expose a small receiving-option
contract: a route is an option; permanent protection is not; a protection check
with a release remains an option. A play-action fake preserves its underlying
job's receiving responsibility. The QB builds his progression from that
contract and still waits for a legitimate outlet's actual route readiness.
This changes known offensive installation, not the QB's knowledge of a
defender or a receiver's future option decision.

### Defensive deep help and pressure compatibility

Coverage-family compatibility was too coarse. Fire Zone was permitted with
Cover 3 Cloud or Cover 9, although those variants make SS responsible for an
essential deep third or the post. Making SS blitz deleted that responsibility
without installing a replacement. Goal-line personnel has no FS, but the
automatic caller could select variants requiring FS at the post or deep half.

The automatic caller now filters actual variants for all their explicitly
named zone players, including its shown shell. A pressure must have its named
participants on the field and retain the variant's required deep zones. An explicitly supplied
replacement is permitted. Stock Fire Zone must also install its promised five
rushers: Odd/Tite and base43 Under previously produced six because front-based
defaults already supplied five before the package's blitz/drop changes.
Ordinary nickel Fire Zone remains supported. Dime Cover 0 now uses an available
pressure rather than forcing a package naming its absent Will slot.

The guard preserves the existing man allocator's ability to drop an uncalled
edge to provide markers. It does not assign new perfect runtime exchanges.
Tests inspect actual `alignDefense` jobs, including current checks/Zeus
resolution, rather than merely asking the guard whether it approved itself.

**A rejected intermediate matters:** filtering only for deep help removed the
measured roof failures but increased missing-FS underneath goal-line calls from
3 to 142 of 300 goal-line selections. Cover 9 and Inverted 2 retained their roof
but lost their explicitly named weak-flat player. That version was withheld.
The promoted guard also requires named zone players, so those unsupported
variants are excluded; all 300 goal-line selections use the existing Cover 0
installation. A supported goal-line zone package needs an explicit participant/
replacement before it can join that menu. This restricts current installation,
not what real NFL defenses may call.

**Remaining limit:** this still does not certify complete coverage legality or
execution. Other front/call combinations derive default rushers from alignment;
pressure can intentionally replace an underneath role. Generic underneath pools
and optional man preferences remain flexible. Explicit diagnostic calls can
bypass the automatic caller, and checks/Zeus priority remains unchanged.

## What the evidence establishes

The [engine packet](../../../data/reviews/schematics/engine/README.md) preserves
frozen reports, native films, all per-case changes, tools and checksums.

| Contract census, 306 formation/concept pairs | Baseline | Repaired |
| --- | ---: | ---: |
| Pairs with a covered skill player | 68 | 0 |
| Pairs sending a covered skill player on a route | 60 | 0 |
| First QB read is a permanent protector | 9 | 0 |
| Pairs with some absent progression reference | 177 | 177 |

The last row is intentionally unresolved. An absent optional back or late
outlet is not the same failure as an absent defining route. Ten Drive
installations lack the W2 shallow, and Bunch Mesh lacks its second crosser.
Blindly rejecting every missing progression reference would discard legitimate
installs while failing to teach what makes each concept coherent.

The fixed native pass panel has two generated roster pairs, six calls and both
flips: 24 plays. Twelve ordinary/check/degraded-install controls retain exactly
the same result, final bodies, intents and RNG state. Six prescribed observed
witnesses per revision also match plain execution. The recorded QB set-state
samples pointing at a permanent protector fall from 167 to zero.

Passing outcomes remain mixed: 17 attempts/12 completions become 18/14, with
two interceptions in both. Mean time to throw among attempts changes from
3.035 to 2.947 seconds, but the attempt populations differ; this is not a
paired NFL calibration claim. One Ace PA Post/Dig play improves from 2.35 to
65.35 offensive yards; another loses 20.70 to 16.60. These legal-install changes
expose coverage/pursuit debt and different random paths. All adverse rows are
retained. The unchanged vertical control already contains a 59.73-yard gain.
There are no physical timeouts in this panel.

The defensive matrix measures static installed jobs across 4,320 automatic
calls: all stock formations, three defensive schemes, five coaching trees,
four situations and four seed draws. It includes goal-line, third-and-27,
trips/check, Zeus and disguise cases. Played missing-deep-job calls fall from 232 to zero; shown-shell failures
from 293 to zero; absent pressure participants from seven to zero; stock
Fire Zone budget failures from 64 to zero. These flags overlap: 366 of 4,320
baseline calls have at least one selected defect, versus zero promoted calls.
All 101 promoted Fire Zones install five rushers. Named and unfilled
underneath-player debt also reaches zero in this matrix. Its claims concern
actual responsibilities and named participants, not whether the defenders
execute them successfully. The cohort intentionally forces high blitz/disguise
settings and evenly samples situations; these proportions are not NFL or
ordinary-game frequencies.

## Runnable football stress suite

The new [lab](../../../src/lab/schematic-stress.ts) executes ten fixed native
installs in both directions—**20 full 11v11 plays**—plus eight reduced
moving-TE/contact witnesses. Every native play uses normal production
controllers and World through its whistle or physical timeout. It records
snap jobs, player profiles, consumed delayed reads, requested intents, support,
delivered contact, climbs and outcomes. It awards no predetermined block win
or gain.

Watch [seven saved clips](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/schematic-stress.html) or use the
[offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/schematic-stress.zip). These include five fixed
adverse native cases and the PA Shot read-repair pair, with source-labelled
IDs and actual installed rush counts. The reduced slice remains in the raw
packet and is not presented as a completed football play.

| Pair | Question | What is deliberately different or limited |
| --- | --- | --- |
| SS-01/02: Split Zone vs Over/Wide-9 | Can the same slice path acquire a wider edge and sustain actual load? | Stationary legal 12 personnel; front changes. This is not offensive motion. |
| SS-03/04: Counter vs Over/Under | Can kick/wrap work find leverage through changed traffic? | Both use a spill policy. Under actually installs five rushers; the treatment includes that ownership change. |
| SS-05/06: Bunch Mesh vs off/press man | Does compressed release/traffic make ownership or physical contact fail? | Stock 3x1 Mesh has one shallow crosser. Coverage also changes its underneath seat, so this is not a pure press comparison. |
| SS-07/08: Empty 3x2 vs quad diamond 4x1 | Does a dense side expose numbering, check or collision mistakes? | Legal static geometry and stock Quick Outs; the quad's remaining routes are fallback clearouts. No screen or observed presnap motion is claimed. |
| SS-09/10: Inside Zone at third-and-27 | Can a real run exploit space against different actual rush/drop roles? | Same situation, roster and snap geometry. A real edge drop creates three rush/eight cover; it is not new three-DL prevent personnel or extra-deep safety technique. |
| Reduced TE/end: stationary/moving slice, ordinary/penetrating edge, both mirrors | Does initial lateral momentum alter achievable fit/contact using unchanged capacities? | Two active bodies, parked bystanders, analytical staged history, 2.5-second inspection censor. No football yardage or native motion credit. |

All 20 native plays finish naturally: 13 tackles, six incompletions and one
out-of-bounds finish. Maximum native momentum residual is `2.99e-12` and work
residual `2.04e-11` in native units; arm-impulse budget excess is at floating
point noise (`2.84e-14`), with zero measured arm/support work excess. These
checks reject material inconsistency above the declared `1e-6` tolerances.
Maximum reported body penetration is about .0139 yards; this is a measured
diagnostic, not a newly chosen NFL acceptance threshold. All six prescribed
native/reduced observer controls pass. Reduced endpoint reflections agree to
about `7.1e-15` yards, with matching profiles/contact classification; native
flips preserve role-specific traits and are not exact mathematical mirrors.

The eight reduced rows all acquire actual hand/body load, without falls in the
inspection window. This is a narrow momentum/control witness, not a survey of
misses or tackle outcomes. Existing reduced reach-negative fixtures remain
available in [the stress plan](../../FOOTBALL_STRESS_TEST_PLAN.md).

Third-and-27 gains before penalties are 5.96/6.64 yards against four rushers
and 10.08/3.20 against three; none converts. One four-rush row has holding.
These four samples demonstrate attainable short gains and unsuccessful
conversions, not a reliable directional effect or a target average. Current
empty recognition still mistakes a detached RB slot for a backfield back;
that mismatch is recorded, not concealed by a laboratory override.

## The next few increments

### 1. Complete one existing pass package before expanding the pool

Start with **Drive in a supported 2x2 install**. Preserve its shallow/dig
relationship, clearout and back outlet. Install one explicit protection
direction, back scan and declared hot threat together with the QB's answer.
The new coaching chapter documents Troxler's example; his exact terms and
timings are one installation, not universal NFL requirements.

Use a small compiled manifest attached to the existing call/assignment path:
actual eligible identities, required component routes, optional outlets,
block/release jobs, progression/key, rush/drop responsibilities and any explicit
unsupported answer. Both ordinary selection and audibles must consult it.
Reject an absent defining role; preserve a missing optional outlet. Derive
receiving work from the same assignment that creates the behavior. Do not
build a parallel generic AI framework or count a reachable hot threat as
automatically blocked.

Validate ordinary four-man pressure, an overloaded slide, a delayed opposite
threat, and a covered shallow. The same installed answers must remain available
to both QB and receivers, but their post-snap option interpretations need not
agree perfectly. Production still shares private receiver conversion state in
throw prediction; remove that debt in its own measured increment.

### 2. Make rush/drop membership explicit for a few supported fronts

Separate presentation from participation. A five-body odd front can rush four,
five or bring a replacement; alignments alone must not choose the budget.
Compile the actual pressure ledger once and have coverage and fits consume it.
Start with Over, Under and one Odd/Tite pressure, including force replacement.
Use the retained valid five-man nickel fire zone as a control and the rejected
SS-post/six-rusher cases as negatives. A six-man zone pressure can be supported
later as its own correctly named/installable package.

Then repair empty/4x1 and bunch checks as actual distribution rules. An inside
receiver changing sides can provoke a check or a local request; it must not
instantaneously transfer perfect knowledge to every defender. Preserve finite
movement and fallible exchanges rather than freezing identities or teleporting
players to the answer.

### 3. Introduce real motion history, then one complete screen

The user's motion bubble and moving-TE Split Zone are good targets. They need
an offensive motion descriptor, a legal off-line mover, finite presnap World
movement, and observations consumed while the defense adjusts. Start with the
moving split-zone TE because the run/slice contact controller already exists;
retain stationary, late-snap and physically unreachable blocks. The current
reduced slice establishes only the contact portion.

Follow with one fast perimeter screen: release/access, backward/forward ball
classification, possession, OL/receiver release and block ownership, and legal
downfield/contact decisions. Static quad Quick Outs proves none of those.
Use its dense-side geometry as a traffic control, not as a completed screen.

### 4. Add a small compatible side-concept pool and situational menu

Pair a few side purposes: stretch a flat defender, clear a reception area,
hold a backside defender, provide an outlet. A tag must change the related
routes/protection/read rather than add a free-floating name. Drinkall's
corner-to-corner-post example also changes the backside route so two receivers
do not compete for the same useful area. A sprint-out launch change still has
to be physically attained and protected.

Only then evaluate clock, conversion and score choices by context. The
[NFL pilot](schematic-data-context-pilot.md) processes 67,488 observed calls
from the pinned 2022/2023 regular seasons. Trailing 9+ teams show 70.1% dropbacks
versus 48.4% leading 9+ after common-cell standardization, but named-target
20+ yard share is 11.89% versus 12.39%. This supports more pass volume in some
situations, not a universal desperation/deep-throw personality bonus. It is an
associative comparison, not a causal rule or roster-independent target.

## Choosing physics versus football work

Trace **install → acquired cue → choice → request → achieved support/contact**.
A covered TE, absent post safety, abandoned marker or impossible hot answer
starts in the installation/controller. Unexplained momentum/work, a force
exceeding capacity, disappearing support or a feasible turn that diverges with
resolution starts in physics. Count both, rather than tuning strength to repair
missing assignments or judging the body from final yards alone.

The next valuable physical stress extensions are trap kick/log after a late
wrong-arm; a double-team keeper transition with a moving climber; screen
disengagement then acceleration; a moving receiver jam then pivot; pursuit
gathering into a difficult cross-angle tackle; and a rollout requiring braking
on each throwing side. Keep an attainable control and an impossible/adverse
case for each. The detailed audits/chapter supply further cases without making
all of them prerequisites for the next repair.

Shared capacities must transfer across these cases without scheme-specific
strength bonuses. Current conservation and accounting are encouraging, but do
not establish calibrated contact forces, complete convergence, or a percentage
of possible physics gains exhausted. Follow
[physics development](../plans/PHYSICS_DEVELOPMENT.md) and
[practical validation](practical-validation-and-stable-physics.md): reopen a
physical law when a retained witness challenges it, rather than restarting a
biomechanics research campaign for every schematic defect.

## Final validation and delivery

The frozen final engine passes all **869 TypeScript tests in 78 files**, all
**37 Python data tests**, typecheck and build. The same focused installation
tests run against baseline reproduce four failures with two controls passing;
the repaired engine passes all six. Twelve ordinary native passing controls
retain identical result, body, intent and RNG signatures. These checks establish
the bounded repairs, not NFL outcome calibration or universal coverage quality.

The saved film room passes 31 Chromium browser checks with seven clips and no
JavaScript errors. Extracted ZIP HTML also loads with HTTP/HTTPS requests blocked.
Direct `file://` navigation could not be tested because the cloud browser blocks
that protocol; the offline-content check and this limitation are retained in the
[evidence packet](../../../data/reviews/schematics/engine/README.md), alongside the
export receipt, full test logs and artifact hashes. The exporter consumes saved
recordings without rerunning the engine.
