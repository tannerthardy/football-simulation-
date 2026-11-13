# Offensive literature: useful depth while physics remains first

The supplied offensive manuals support a smaller, better specified installation,
not hundreds of new calls. Our run game already has real covered/uncovered
ownership, doubles, shoulder fits, puller braking, kick/log responses, reachable
meshes and moving-gap reads. The persistent weakness is being able to explain
**which relationship a player was reading, whether it became actionable, and
whether his body could execute the answer**. Improving that evidence helps
separate physics failures from shallow technique or decision rules.

No offensive controller, physical capacity or outcome distribution is changed
by this review and its diagnostic. The new playcalling documents are retained
as source references for a later installation pass. Physics readiness remains
NOT READY; use the [step-back review](physics-step-back-and-local-repair.md) for
the current repair work.

## What was reviewed and how much to trust it

- [Offensive Playcalling Textbook](../../references/Offensive_Playcalling_Textbook.md):
  chapters 1–6, 14–20 and 26, with the protection and motion laboratories.
- [453-term glossary](../../references/Offensive_Playcalling_Glossary_453_Terms.md):
  run/blocking, protection and QB-read definitions. This is a vocabulary aid,
  not a list of concepts we must implement.
- [Running Back Mechanics](../../references/Running_Back_Mechanics_Textbook.md):
  sections 2–13, 32–38 and the inside/wide-zone, duo, counter, trap and
  protection laboratories.
- [Offensive Line Protection](../../references/offensive_line_protection_textbook.pdf):
  chapters 1–6, 10–18 and protection labs; especially zone doubles on printed
  pages 42–44 and duo/gap coordination on pages 45–47.

These user-provided works describe themselves as independent teaching
syntheses. They explicitly note that names, progressions and aiming points vary
by staff, and their worked calls are invented installations. Their cited web
sources have **not been independently verified in this review**. Some reference
links are incomplete or unusual, and referenced SVG figures for the Markdown
books were not supplied. Consequently, the teaching claims below are design
hypotheses, not measured NFL timing, verified team rules, officiating authority
or evidence for a force constant. The diagnostic observations are reproducible
facts about our engine; they are a separate evidence category.

## Five principles that are worth carrying into the engine

| Principle from the supplied aids | Existing behavior and missing depth | Bounded next application |
|:--|:--|:--|
| **A concept is an initial relationship plus contingencies.** Playcalling ch. 14.2; RB secs. 7–13. An aiming point is a track to pressure a defender, not a promise that a named gap will survive. | `RunConcept` stores a scheme, aim and pullers. `runReadAim` finds moving creases, distinguishes duo, and accounts for kick/log. It lacks explicit first-level key and installed outlet rules for most zone calls. | Record an installation card: initial track, first-level key/block, second-level key, allowed outlets and what invalidates the press. Do not give a route or run a static “beats Cover X/front Y” outcome bonus. |
| **Patience is arrival control.** RB secs. 4, 6, 10, 12–13; playcalling ch. 14. Runner tempo depends on mesh, moving blocker and fitting defender. | `BallCarrier` already paces a lead block and checks closing threats. However, the designed phase still expires at `aimUntil`, set from a fixed duration plus patience. A gap can be relevant after expiry or invalid before it. | Inspect the current gate alongside actual mesh, puller arrival, runner depth and block leverage. Eventually end press from visible invalidation/entry cues and reachable cuts, retaining human read latency. Do not substitute another concept-specific duration. |
| **A combo releases when one blocker can keep the first level and the backer demands the other.** OL ch. 17.3–17.4; RB secs. 7, 11. Which member leaves depends on movement. | `readCombination` already checks shared engagement, helper support, hand control, blocker base, angle, backer proximity and runner arrival; it can choose either member. It also requires a 0.15 s secure dwell, and keeper-alone load feasibility is not explicitly established. | Distinguish planned doubles from actual loaded doubles, true climbs from penetration cancellations, and record the keeper's support/angle/load at release. Replace dwell only after a keeper-alone feasibility observation exists. Removing it immediately would merely make release faster. |
| **Protection is a responsibility/answer contract.** Playcalling ch. 18; OL ch. 1, 4–5, 10–16; glossary protection terms. A free rusher can be intentional if the QB has the corresponding answer. | `ProtectionCoordinator` supplies sticky inside-out matching and backs find leftover threats. Its rusher classification reads true behavior kind; pass concepts have route progressions/back usage, but no explicit complete protection/hot-response contract. | First audit every pressure path as line-owned, back/TE-owned, intentionally hot, or unaccounted; distinguish loss, exchange, identification and late-ball failures. Later replace hidden rush-role knowledge with observed pressure cues and communication, keeping physical engagement authoritative. |
| **Grade process separately from yards.** Playcalling ch. 26.1; RB secs. 33–34 and OL ch. 20. A correct read can lose to superior defense; a wrong read can be rescued by talent. | Library outcome/concept breakdowns exist. Replay state does not yet expose carrier candidate-lane scores or every decision cause. A touchdown alone cannot identify whether the called rules were sound. | Use conditional concept/front cells and event-boundary process traces, with confidence/unknown fields. Avoid declaring an aim departure a bust without the installed rule and what the player actually saw. |

## What was added now

[`scripts/diag/run-concept-process.ts`](../../../scripts/diag/run-concept-process.ts)
is an observational live panel. It records initial blocking rules and track,
actual sampled hand loads for both members of planned combinations, climb or
penetration-collection transitions, puller contact arrival/relative velocity,
handoff separation, carrier movement/intents and the existing absolute aiming
gate. It never invokes another perception read, carrier evaluation, decision or
random draw. An optional paired verification compares complete final bodies,
intents, events, stats, outcome and the next RNG value with an uninstrumented
rep. Every one of the 84 final-source reps passes that check.

The panel makes several mistakes harder to diagnose incorrectly:

- A **planned combo** is not a physical double; both members must actually
  transmit hand load in the sampled interval.
- The `Combination.released` flag can mean a **penetration collection**, not
  a successful climb. Those transitions are counted separately.
- A puller contact's relative lateral speed is a useful approach measurement,
  not proof of a whiff. The subsequent grip, displacement and recovery matter.
- An aiming-point departure is a measurement, not a wrong-read diagnosis.
  The initial aim is deliberately not rewritten from the eventual successful
  lane.

No WebM/viewer/schema changes are needed to run this diagnostic. A future
recording hook can expose the same real state and decisions in the inspector;
it must preserve the same observational contract.

## Source-pinned process evidence

The reviewed process panel is in
`data/reviews/physics-world/offense-process/run-process.json`.
It was rerun after the final physics source freeze at
`0f1124fde702bfd754944b10bc2d35f2ebf4914c1a2fa864e701afb6683b47ad`;
all 84 observer/plain comparisons still match.
It uses generated team pools 7/8; play seeds 3/11; Ace 11 personnel; stock
Cover 3; both formation flips; Over, Under and Tite fronts; seven existing run
calls; and four seconds of play. Defensive personnel follows each front
(`base43` for Over/Under and `base34` for Tite), so front comparisons are **not
identical defensive elevens**. Flipping a formation is not a mathematical
mirror test, and two seeds do not establish scheme quality.

| Run, 12 reps each | Planned combinations | Sampled loaded doubles | Genuine climbs | Planned pullers / contact events |
|:--|--:|--:|--:|--:|
| Inside zone | 14 | 10 | 4 | 0 / 0 |
| Outside zone | 14 | 9 | 1 | 0 / 0 |
| Wide zone | 14 | 6 | 2 | 0 / 0 |
| Duo | 16 | 13 | 8 | 0 / 0 |
| Power | 12 | 7 | 4 | 12 / 9 |
| Counter | 8 | 8 | 3 | 24 / 16 |
| Trap | 16 | 8 | 3 | 12 / 10 |

Across 84 reps: 94 planned combinations, 61 sampled loaded doubles, 25 true
climbs, two combinations dissolved for penetration, 35 contact events among
48 planned pullers, and 84 reachable handoffs. No genuine climb lacked an
earlier sampled double load. All handoffs begin from the same 1.1566 yd
boundary separation in this particular under-center roster/alignment; this is
not a measured NFL exchange distribution. Four-second truncation, earlier
whistles, lost assignments and 20 Hz sampling can explain a missing contact
or climb. These are diagnostic counts, not success rates or targets.

The carrier's tick-end support state is `up` in 3,047 recorded samples and
`falling` in 472, across 3,519 post-handoff carrier samples. All 84 reps include
an upright carrier sample; 66 include a falling sample. Those rep counts
overlap. All 35 recorded puller contacts have the puller `up` at the sampled
tick end. These are our reduced support model's state labels, not NFL fall,
missed-tackle, completed-tackle or injury rates. A rep can end at the whistle
before ground/rising states become observable; four-second truncation and
conditional carrier sampling also affect the counts. Support-state
availability deepens process diagnosis but does not validate the balance model.

Outside/wide-zone climbs are less common than duo in this small panel. That
does not prove a technique defect, but it directs the next trace toward
**why the initial double never became loaded, why a keeper could not take over,
or whether a relevant backer cue arrived too late**. Counter's apparently
available lanes also need synchronized runner/puller/defender analysis before
adding plays or changing speed.

## One precise controller improvement to consider after tracing

The best bounded candidate is to replace `readCombination`'s 0.15 s secure
dwell with a **keeper-alone fit/support/load feasibility cue**, together with
the already observed backer/runner demand. Keep physical acquisition, hand
forces, mass and traction unchanged. Use actual maintained stance, hand load
and relative defender drift to ask whether the remaining blocker can hold the
relationship after the helper leaves; a recognition error can still select a
bad moment. This is a coaching hypothesis from OL ch. 17, not an NFL-validated
formula. The current panel does not establish that feasibility signal, so no
behavior change is justified yet. First reproduce one held combo and one
split combo with the same bodies and altered controllers, and test whether
the proposed cue distinguishes them without concept-specific force factors.

Next after that: give the RB a named first-level read plus allowed adjacent
outlets, and end the designed press from observed block/fit relationships and
physical arrival rather than `aimUntil`. This must be paired against slant,
scrape and edge replacement; early random daylight must not make every
concept collapse into the same omniscient lane search.

## Reproduce

Use the project's Node 22 environment. Raw output belongs under ignored `out/`;
commit only the reviewed panel. The script records and checks the engine source
hash at both ends, so it refuses to publish a mixed-source panel while another
agent is editing the engine.

```sh
node --import tsx scripts/diag/run-concept-process.ts out/run-process.json --verify
node --import tsx scripts/diag/run-concept-process.ts out/zone-process.json --runs iz_strong,oz_strong,wz_strong --fronts over,under,tite --seeds 3,11 --seconds 4 --verify
```

Do not use the supplied glossary's volume as implementation scope. These few
process additions deepen diagnosis and preserve the shared physical model;
new motion families, route pools, option/RPO logic and adaptive playcalling
remain later work.
