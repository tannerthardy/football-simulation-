# NFL rules, legality and officiating

The target is convincing **legal NFL football**. A block, catch or tackle can
obey the physics model and still violate a football rule. An absent flag does
not certify legality; NFL-looking tracking does not certify it either.

This is the implementation contract and coverage entry point, first published
2026-10-20 America/Phoenix. It does **not** claim that full officiating is built.
[Current implementation and next assignments](reviews/nfl-rule-readiness-2026-10-20.md).

## Authority, edition and coverage

Use the official [2026 NFL rulebook][book] and its [linked PDF][pdf]. The PDF
explicitly identifies the 2026 season. Article citations below refer to that
edition. Rule definitions, notes, exceptions and Rule 14 control; the official
penalty summary is an index, not an executable enforcement specification.

[The coverage register](../data/reviews/current/nfl-rules-coverage-2026.json)
indexes **19 rules, 116 sections, 347 explicitly numbered articles and 143
penalty-summary rows**. Summary rows overlap and are not 143 distinct fouls.
Sections without numbered articles remain included. The register also records
the current implementation facts, source fingerprints and next owners.

An indexed article is not an implemented or individually audited article.
Most article-level semantics remain `not_individually_qualified`. Existing
partial behavior and absent foul pipelines are identified separately; do not
interpret an unknown assessment as either full support or proof of illegality.

The proposed ruleset is `NFL-2026`. Adoption must make the edition explicit in
game/replay/evidence settings; this document changes no runtime default. Our
2022 tracking reference remains useful motion evidence, but not automatic
precedent for 2026 legality. Later hip-drop and kickoff rules illustrate why
reference season and simulated rules edition must remain separate.

## Current implementation boundary

At accepted `2c98bed94adad8087c65f381d4090444ad283985`:

- Offensive holding is the only native live-play foul producer. Its technique
  choice and visibility are sampled; it is not a general achieved-contact
  holding adjudicator. Existing accepted/declined enforcement is useful but limited.
- False start and offside are sampled game-level abstractions. Offside always
  becomes dead ball, without the live-ball/free-play distinction.
- DPI is a name in the event/penalty types, with no detector or enforcement path.
  OPI, illegal contact, defensive holding, roughing and the requested illegal
  blocking/tackling families have no general foul pipeline.
- The receiver press technique has useful five-yard/throw/scramble release
  guards and no cloth tension. Preserve them; they are not complete officiating.
- Catches, passes, fumbles, boundaries, progress, scoring, clock and overtime
  have working reduced models. Those are not full rulebook qualifications.
  Special teams are outcome abstractions, not native kick-contact simulations.

## The contract: facts through official result

Keep these stages distinct, extending existing events and Game state:

1. **Achieved incident.** Who acted on whom, when, where, with what represented
   contact/action and ball/possession context? A requested strike or nearby body
   is not achieved contact. Record a continuous act once, with its interval.
2. **Legal assessment.** Apply a versioned rule to supported facts: demonstrated
   violation, no violation under that evaluated rule, or unresolved because a
   required fact is missing. Include the rule reference and decisive facts.
3. **Official call.** Keep the call separate from the act. A missed call must
   not erase an observed violation. Legacy sampled calls must be labeled as
   abstractions until their legal predicates are qualified. Referee error is a
   later optional model, not a prerequisite for deterministic adjudication.
4. **Enforcement options.** Calculate the legal choices for the offended team
   from all called fouls and the actual play context. Choosing among legal
   options is a policy problem; calculating them correctly is a rules problem.
5. **Official result.** Apply the selected option exactly once to possession,
   spot, score, down/distance, clock, statistics and player eligibility. Retain
   the linked raw physical result and foul history for replay and diagnosis.

The smallest coherent implementation migrates the existing holding path
through this boundary first, with compatibility adapters for old replays.
Replace singular `penalty`/`foul` storage where necessary with incident/call
lists; preserve multiple acts until Rule 14 selects their treatment. Do not
create a new physics World, controller coordinator or duplicate event pipeline.

Suggested minimal records, to be finalized by the rules owner:

| Record | Required meaning |
| --- | --- |
| Incident | Stable act ID; actor/victim; achieved start/end time; field spot; team and possession phase; represented contact mechanism/region; native evidence references; missing facts explicitly unknown. |
| Assessment | Rules edition/article; act ID; violation/no violation/unresolved; elements and exception considered. A body-part intent is not proof of achieved contact there. |
| Call | Linked assessment/act; called or uncalled; deterministic or declared legacy/referee model. Do not hide an incident behind a visibility roll. |
| Enforcement option | Accepted/declined/offset/carryover treatment; enforcement basis and spot; yards; automatic first/loss of down; clock/score/possession and disqualification effects. No generic yardage-only shortcut. |

Truth assessment can inspect actual simulation facts without giving them to
players. Player decisions remain acquired-information limited. Recording and
pure predicates must add no execution RNG draws. Any later call-model RNG is
separate; migrating the current shared holding/visibility draws needs a declared
compatibility decision, not an assumption that all endings remain identical.

## Contact and pass rules that need distinct predicates

| Family / official reference | Contract and important opposing case |
| --- | --- |
| Offensive holding, 12-1-2/3(c) | Material restriction through prohibited grabbing/hooking/turning and context, with the article's notes/exceptions. Duration, a long successful block, hands inside/outside or tensile force alone cannot decide it. |
| Defensive holding/hands, 12-1-5/6/7 | Preserve legal warding/pulling while being blocked or reaching a runner/loose ball. Defensive holding is not a mirrored offensive predicate. Illegal head/neck hand use is separate. |
| Block in back, 12-1-3(b) | Achieved block/push from behind above waist affecting movement, subject to exceptions. Side contact and an opponent turning when contact is imminent can differ. Preserve initiation and continuing-contact history. |
| Blindside, 12-2-7 | Initiated path toward/parallel to the blocker's own end line plus forcible helmet/forearm/shoulder contact, with close-line/ball-location exception. A defender not looking, or contact from behind, is not the full definition. |
| Clipping/peel-back/low/chop/crackback, 12-2-1/2/4/5/6 | Separate height, approach, snap alignment, field area, possession and combined high/low conditions, including still-confronting/lure and reverse-order cases. A legal high-high combo is not a chop; preserve permitted low-contact exceptions. |
| DPI/OPI, 8-5 | Qualifying forward pass from behind LOS; act more than one yard beyond LOS; material hindrance. DPI applies release-to-first-touch, OPI snap-to-first-touch. Retain prethrow offensive acts until pass context resolves. |
| PI legal controls, 8-5-3/4; 8-3 | Equal rights to the ball, incidental contact, foot tangling and nonrestricting hand contact matter. Clearly uncatchable usually excludes PI, with explicit offensive-blocking exceptions. Don't flag all contact or excuse all downfield blocks. |
| Illegal contact, 8-4 | Eligible receiver, contact continuity/re-contact, receiver position, five-yard area and snap-recipient pocket/possession conditions. Contact within five yards is not automatically legal; leaving the pocket does not legalize defensive holding. |
| Roughing passer, 12-2-11 | Passing posture, release/first-step/avoidance, continued drive, head/neck/low contact, landing and forced-contact/pocket exceptions. No universal milliseconds-after-release threshold. Some branches apply before release. |
| Kicker/holder, 12-2-12/13 | Distinguish running into from roughing; plant/kicking leg, actual kick, contact cause and exceptions matter. Current abstract kick outcomes cannot certify unseen contact. |
| Defenseless/helmet/late/OOB, 12-2-8/9/10 | Protect actual player status, achieved contact and dead-ball/boundary sequence. Becoming a carrier does not instantly end every receiver protection. |
| Facemask/horse collar/hip-drop/tripping, 12-2-14/15/16/18 | Require the actual prohibited grip/action and exceptions. A falling grasp, swivel or low coupling alone is not a hip-drop foul; the prohibited unweight/drop and leg landing/trapping sequence is essential. |

Current contact records lack enough location/anatomical history to prove every
branch. Add only the achieved contact point/normal, region or continuous-grip
fact required by the first delivered rule, reusing existing joints/impulses.
Keep unknown branches explicit. An event label cannot invent missing anatomy;
a full articulated skeleton is not a prerequisite for every supported rule.

## Full-book completion map

| Rules | Work still requiring article-level qualification |
| --- | --- |
| 1–3 | Field/ball assumptions; possession/control, live/dead states, defined regions, direction, progress and boundary/ball spots. Administrative specifications may be documented assumptions. |
| 4–5, 7 | Game/play clocks and runoffs; timeouts; personnel, numbering/reporting, substitution, formations, set/shift/motion, legal snap, false start, encroachment/NZI versus live offside, progress and whistle. |
| 8 | Legal/second forward pass, grounding, eligibility and illegal touching/downfield, catch/control/inbounds process, backward passes/handing, fumble OOB and fourth-down/late-half/try advancement restrictions; pass-contact rules above. |
| 6, 9–10 | 2026 free-kick setup/landing/recovery, safety/onside kick, scrimmage kicks, fair-catch rights/signals, touching, return/block restrictions and kicker protection. Keep the current abstraction explicit until delivered. |
| 11, 14, 16 | Ball-plane scoring, safety/touchback/impetus, tries and carryover; foul enforcement and clock effects; editioned regular/postseason overtime. Existing tests are a starting point, not full certification. |
| 12–13 | All contact and non-contact conduct, bench/non-player interference, player removal and disqualification history; not just the common safety fouls. |
| 15, 17–19 | Reviewable rulings/authority and corrections; emergencies/unfair acts; captain options; officials and 2026 consultation. State the adopted administration abstraction instead of claiming simulated crews or appeals. |

Completion means each register item has an owner and explicit implemented/tested
contract, documented abstraction, administrative assumption or deferred gap.
For a represented on-field act, a deferred detector means no claim that the act
is legally adjudicated. Documentation of a gap is not implementation of the rule.

## Enforcement requirements

The rules owner must implement the applicable Rule 14 branches and article
exceptions, rather than one general `yards` field:

- Previous, foul, end-of-run and succeeding spots; three-and-one and its
  exceptions; half-distance and safety; line-to-gain effects.
- DPI spot and automatic first down, including its special defensive end-zone
  placement. OPI is ten from previous spot; DPI is not capped at fifteen.
- Accepted/declined choices; multiple same-team fouls; double-foul exceptions;
  dead-ball/between-downs sequencing; acts before/after possession changes.
- Touchdown/try/kickoff carryover, disqualification, loss of down, untimed down,
  clock restart/runoff/restoration and official stat/score effects as applicable.

Do not erase every play stat for every accepted foul or always offset every
pair of opposing flags. Keep existing holding scenarios and their source pins;
review them against the selected edition before broadening the resolver.

## Use in ordinary investigations

Follow Measurement's adopted [NFL evidence process](reviews/nfl-agent-evidence-plan.md):
relevant saved reference → native cause → smallest correction and opposing
control. For a changed contact/pass mechanism, identify the **relevant** rule
and whether its decisive facts are available. Record demonstrated violation,
evaluated legal control, or unresolved coverage in the existing Evidence/Risk
fields. No separate all-rule worksheet, NFL query or full-game gate is created.

A known illegal technique cannot be presented as a legal football improvement.
An unresolved rule cannot silently become "no foul"; nor does missing evidence
prove that the technique is illegal. Independent correctness fixes can continue
with appropriately bounded claims while the named rules gap is addressed.
Do not impose forced sheds, block-duration caps or random flags to make gains
look right. Preserve the action and its physical consequences; adjudicate it.

For each delivered predicate, begin with an unequivocal foul, a relevant legal
exception/control and affected enforcement contracts. Use scripted incidents
and native event boundaries before games. Test phase/possession/goal/clock edges
only when they affect that delivery. Integration retains one exact combined
verification; documentation does not require an engine suite. A nonauthor must
review the legal elements/exceptions and native producer-to-enforcement path;
combined verification does not replace that substantive review.

[book]: https://operations.nfl.com/rules-officiating/2026-nfl-rulebook
[pdf]: https://static.www.nfl.com/image/upload/fl_attachment/league/tqivdkzt9mu6wdgsh1ku.pdf
