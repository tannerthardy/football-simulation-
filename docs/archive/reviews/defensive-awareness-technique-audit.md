# Defensive awareness and technique: bounded next work

Read-only coaching/controller audit of baseline `80e8151`, engine content
`246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469`.
Line references below describe that baseline, before concurrent candidate work.
This is a design recommendation, not a measured coverage improvement.

The best small change is to remove zone defenders' access to the quarterback's
exact internal read target. The largest remaining awareness gap is the absence
of an acquisition cost: linebackers and safeties can obtain many delayed
pictures without choosing which key receives attention. Route delivery is the
next coordination problem to reproduce. None requires more anatomy, traction,
force capacity, or a new universal cognition framework.

## What already works and should remain

The coverage engine is not simply a collection of static landmarks. Its
`ReleaseReader` classifies delayed receiver movement and confirms declarations
(`src/sim/coverage/reads.ts:77–125`). Rules distinguish carry, wall, trap, cut,
match and deep help. Existing man and zone controllers calculate closing speed
and hip-opening time against actual backpedal and turn limits
(`src/sim/behaviors/defense.ts:239–250,431–443`). The quarters/deep-third zone
controller prioritizes its installed receiver before helping on another
vertical (`defense.ts:380–391`). It already reacts before the later seven-yard
match declaration; lowering every match threshold is not a demonstrated fix.

`CoverageJudgment` already retains a confirmed uncapped primary vertical
(`src/sim/coverage/judgment.ts:43–54`) and checks whether a nearby observed roof
persists through the observer's next decision plus image age (`:78–87`). The
older [roof audit](coverage-roof-priority-audit.md) is partly superseded by the
implemented [near-help study](near-help-persistence-and-current-priorities.md).
Its unpromoted far forecast had no additional ordinary physical benefit in the
retained ablation. Keep the six-yard upper bound until new evidence warrants a
different distant-help model.

Body facing is torso/hip orientation, not measured eye direction. A linebacker
turning to run with a crosser is not, by itself, evidence that he stopped watching
the ball. Nor does a wall and safety simultaneously relating to one receiver
prove a bust: temporary overlap can be the correct exchange.

## 1. Remove the exact QB read oracle first

**Current loop.** `ZoneCoverage` directly reads `sim.qbEyes`, an `Agent` selected
by the QB controller. It uses both exact receiver identity and current true
position to drift from a landmark, split verticals and rank underneath threats:
`src/sim/behaviors/defense.ts:396,422,505,514,547–558`. Calling `see(a, eyes)`
after receiving the hidden identity still leaks which receiver was selected.
This bypasses the defender's own delayed picture and makes an internal
look-off/read change immediately knowable.

**Small repair.** Consume the delayed QB body pose/facing and compare its coarse
direction with already consumed route corridors. A route near that direction
can receive a modest preference; two routes in the same direction remain
ambiguous. An unavailable or behind-observer QB cue should preserve the called
landmark/responsibility. Do not resolve a receiver from its hidden ID, true
position, intended throw or QB evaluation. Responsibility and an uncapped
vertical take priority over this cue.

There is already a usable, imperfect visible signal: QB `pocketMove` faces the
current read or look-off decoy (`src/sim/behaviors/qb.ts:258–260,590–591`), and
windup faces the pending throw point (`:199`). Physical turning and delayed
observation prevent instant updates. Gun drop and evade can face straight
downfield (`:229,559`), so those pictures do not identify the QB's eyes. This
change should be labelled **body-direction inference**, not eye tracking.
`CoverageJudgment` already uses the corresponding delayed angular comparison
for a break confidence adjustment (`judgment.ts:59–63`).

**Evidence and limit.** The source proves the knowledge violation. The saved
native projected-help pass panel contains `HELP-R1-gun_doubles_11-four_verts-cover4-S3`
and the full QB/defender trajectories, but belongs to earlier source `704158…`,
not the current `246931…`. There is no retained counterfactual that changes only
`qbEyes` while preserving all visible inputs. Do not attribute its separation,
interception, or explosive outcome to this oracle from the recording alone.

**Acceptance.** Holding every consumed picture fixed while changing only the
internal QB read must leave the zone command unchanged. Changing the *delayed
visible* QB orientation may alter a cue in the appropriate role; changing only
the QB's current hidden orientation must not. Include same-direction ambiguity,
behind/unavailable QB, mirrored lateral looks, and primary vertical controls.
Then compare a fixed ordinary pass panel with unchanged capacities and profiles,
retaining every adverse transition. Do not promise fewer explosives before that
field comparison.

### Post-audit promotion decision: withhold the QB proxy

The information-boundary prototype was tested, including a repair for a native
false cue in which neutral QB torso facing moved empty zones before receivers
released. Its final sixteen public-controller tests pass; four release controls
also pass on C and fail on the rejected first proxy. The exact test and source
are retained under
[`qb-cue/unpromoted-source-test/`](../../../data/reviews/physics-world/position-technique/qb-cue/unpromoted-source-test/test/coverage-qb-cue.test.ts),
with [pinned native comparisons](../../../data/reviews/physics-world/position-technique/qb-cue/README.md).
These establish removal of private read/current-position dependencies, not the
football value of the replacement cue. Fixed `confidence = 1` and a universal
35-degree cone around delayed torso direction remain unvalidated assumptions;
body direction does not identify actual eye direction during drop or evasion.

The final unpromoted combined source `d73aaed8…` raised mean offensive yards
from 8.65 to 10.54 in the 22 paired natural endpoints of the 24-pass panel. Two
identical-seed full-game smoke pairs changed from C scores 20–23 and 47–33 to
29–35 and 61–58. Those are descriptive warnings from two generated-roster games,
not league/NFL rates or isolated proof that the QB cue caused every change.
Do not fit the cone, confidence or physical capacity to recover those scores.
Ship the independent cutoff repair, source
`dd4cbb75c981e82e8a33d8e5d1c30d72d922d824de99fd9cba77403d0c7f9843`,
while retaining the QB oracle in production as explicit known debt. The proxy
and its evidence remain useful unpromoted research.

Next select one retained adverse ordinary pass, such as
`QBCUE-R2-gun_doubles_11-four_verts-cover4-S3`, and trace the first changed
responsibility, hip/pace request and consumed picture before the outcome.
Compare C, **oracle removal only** (delayed geometry, called responsibility and
landmark fallback), and that same removal plus **released-route body-direction
weighting**. Keep capacities, players and all other controllers fixed. Include
an ordinary successful control, primary vertical, same-bearing ambiguity,
unreleased/rear-QB and mirrored controls. This separates the cost of losing
perfect information from harm introduced by its replacement. Promote only after
the observed decision sequence is defensible; neither a larger framework nor
matching final yardage is the acceptance criterion.

## 2. Pilot an actual key progression, not another attention scalar

**Current loop.** `PlaySim.see` can sample any requested player, with opponent
delay and a run-belief delay surcharge but no gaze/acquisition budget
(`src/sim/playsim.ts:320–334`). `Recognition.cues` reads all five linemen plus
QB and back in one update (`src/sim/recognition.ts:267–305`); some roles then
inspect all eligible receivers to find the nearest (`:308–328`). `keyAttention`
discounts line evidence during a lapse, rather than making an unacquired key's
image stale (`src/sim/mind.ts:59–69`). Zone controllers acquire every eligible
route before band filtering (`defense.ts:359–367`), while deep judgment acquires
route reads before its body-visibility filter (`judgment.ts:34–41`).

**Current native witness.** In
`data/reviews/physics-world/combo-attention/witness-after.json.gz`, ordinary
`CA-R1-power-under-L-S3` at `t=0.50s`, LB_M and LB_W each consume 18 distinct
targets: all five OL, QB, RB, Y, and ten defensive teammates. LB_M's OL/QB/RB
samples all have age 0.20s; LB_W's all have age 0.25s. Y is 0.35/0.40s old.
The source before/after is exactly `246931…`. This establishes simultaneous
line/backfield acquisition. It does **not** establish 18 conscious visual keys:
teammate samples also come from physical spacing, and the recording does not
separate acquisition purpose. It is a run witness, not a measured pass bust.

**Small next experiment.** Install one linebacker role's near-guard/back key
and a limited receiver triangle. On the existing attention/decision cadence,
acquire the primary key and one secondary glance when the role's evidence
permits it. Preserve remembered route samples between acquisitions. A run/pass
declaration changes the key progression; it must not grant instantaneous reads
of every new threat. First scope this to one hook/Mike rule and one matching
safety family, not every `see` call in the engine. Physical teammate spacing
should not accidentally consume the same visual budget.

An experienced or attentive defender should acquire/interpret the relevant
key more effectively through existing recognition/focus/reaction traits. Do
not add a separate eye-discipline multiplier or random bust roll. Knowing the
call means knowing which cues matter and what transitions are allowed; athletic
ability controls whether the resulting movement is achievable.

**Acceptance.** Show a missed secondary cue because the player actually stayed
on his primary key, a correct primary read, a successful later glance, and a
play-action/route conflict. Report actual acquisition, remembered age, chosen
job and requested versus achieved movement. Removing omniscience can initially
make coverage worse; coherent mistakes and preserved fundamental responsibility
matter more than forcing a lower explosive total. Native NFL tracking contains
positions and some body orientation, not dependable true gaze or human thoughts,
so it cannot directly fit this attention policy.

## 3. Diagnose route delivery and roof urgency together

**Current loop.** Several deliveries end solely at a receiver depth or geometric
boundary: seam carry (`src/sim/coverage/rules.ts:93–105`), hook/back carry
(`:139–156`), and apex wall (`:192–200`). The crosser cut ends when the receiver
leaves its area or turns upfield (`:113–120`). These can be valid *installed*
rules, but the sender does not observe whether replacement coverage is available.
New directives instantiate new technique controllers
(`src/sim/coverage/defender.ts:88–107`), preserving the physical body but resetting
technique-local memory. Declaration depth alone therefore does not establish a
safe physical delivery or a continuous roof response.

**Saved inspection points, not bust verdicts.** The historical
`data/reviews/physics-world/coverage-process/coverage-contracts.json` is source
`0f1124…`; all eight fixtures have zero structural contract violations.
Its ordinary `palms-verticals` fixture has LB_M wall:Y plus SS man:Y at 2.00s,
and NB wall:H plus FS man:H at 2.05s. On the latter transition FS remains
6.52yd longitudinally above his delayed H picture but moves only vx0.75 while
the observed receiver moves vx6.73; the new man controller requests vx0.22.
That is a useful roof-compression/transition inspection point, not proof that
the FS should immediately sprint or that physical acceleration is insufficient.
The fixture ends incomplete. Its zone controller was already relating to H
before the seven-yard match lock.

`poach-trips` at 1.70s similarly changes FS to man:Y with about 11yd lateral
distance from the consumed route picture; the preceding deep-mid controller
had already moved toward Y. At 3.95s LB_W releases man:RB to hook-mid after the
back visibly stops. The lack of a direct man edge is explicitly not a bust:
zone space/help may still account for that throw. Neither fixture is current
evidence of failed delivery, and the old body/intent snapshots are captured
after the ensuing World step at the labelled controller boundary.

**Minimum next diagnosis.** Reproduce one current ordinary seam/crosser exchange
and a successful control. At the first lost roof/throwing lane compare the
sender's consumed receiver and replacement pictures, declaration, requested
movement, actual hip/velocity/support, and remaining time to the route threat.
Only then trial a short role-specific delivery overlap or preserve relevant
technique state across one zone-to-match switch. The receiving defender's hidden
job or future intent cannot be an input; installed responsibilities plus observed
position/motion can support an imperfect estimate. Do not introduce a general
message bus or make every depth handoff conditional on a deep-roof predicate.

## Coaching basis and practical limits

The user-provided manuscripts are useful teaching hypotheses, not verified NFL
playbooks or authoritative rules. The existing [reference inventory](../../references/README.md)
records that limitation. Relevant points:

- [Coverage Operating System](../../references/Coverage_Operating_System_Manuscript.md),
  §§4.1–4.3 and5: key, declaration, transition, replacement; an exchange must be
  physically possible; extra targets have an attention cost.
- [WR/DB Mechanics](../../references/WR_DB_Mechanics_Textbook.md), §§11–14: patient
  release technique, cushion/hip transition, in-phase versus recovery behavior,
  and different visual priorities for man, quarters and cloud.
- User coverage PDF, extracted to ignored
  `out/literature/football_coverage_mechanics_textbook.txt`, printed pp9–11,
  27–29 (§§3,14,15): near guard/back reads, controlled first steps, seam/curl/flat
  relationships, and carry versus chase. Its wording does not justify treating
  every quarterback-facing hip pose as the player's eye target.
- [Coverage terminology research](../../research/coverage-terminology.md) documents
  disagreement among coaching systems about vertical-declaration depth. A fixed
  depth is an installed rule, not a universal NFL parameter.

These priorities concern information and technique controllers. A request that
the shared World cannot execute remains a physical/motor-control issue and must
be diagnosed separately. Existing traction, turn rate, balance, body mass and
contact budgets should stay unchanged for these experiments. Success is the
same understandable visual sequence working in normal, mirrored and conflicted
plays with plausible imperfect reactions, not matching an NFL aggregate by
granting better vision or faster feet.
