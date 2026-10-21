# Football data and measurement

Use data to test a specific football explanation: what was available to a player,
what he tried to do, and whether the shared movement/contact model could execute
it. The best immediate additions are conditional movement and protection panels
from sources we already have, then one small participation/charting snapshot.
Another large motion archive is a lower priority.

This chapter is a research guide, not a fitted player model or a claim that the
engine matches the NFL. It was written on 2026-10-11 after inspecting the local
catalog, extractors and evidence. The companion
[source catalog](../../data/research/football-handbook-sources.json) records exact
documentation URLs, retrieval receipts and the difference between inspected
definitions and proposed measurements. Dataset acquisition pins remain in
[data/sources.json](../../data/sources.json); this chapter does not replace them.

## Ask questions that the observations can answer

Tracking gives positions and some motion/event/assignment labels. It does not
give the intended playbook rule, a player's actual eyes, certainty, hand grip,
muscle effort, foot plant or force transmitted through an opponent. Charting
adds judgments; expected-value models add predictions. Keep those evidence
types separate.

| Football question | Useful observation | What remains inferred or unavailable |
| --- | --- | --- |
| Does a puller arrive under control? | Path curvature, entry/arrival speed, relative approach, orientation/travel relationship and arrival time | Intended footwork, precise plant, whether his hands actually fit |
| Does an OL hold an anchor while the pocket moves? | Paired blocker/rusher positions, proximity persistence, displacement toward the QB, labelled protection opponent and disruption | Ground reaction, hand force, strength, whether an apparent hold was legal |
| Does a DB retain top leverage? | Receiver/defender relative depth and speed, initial cushion, route and coverage labels, release/catch events | His actual key or communicated switch, whether a mistake came from eyes, instruction or technique |
| Does a tackler gather before contact? | Approach speed/angle, braking before proximity, contact-to-end movement, tackle/miss labels when defined | Grip placement/strength, exact fall cause, unobserved near-miss opportunities |
| Does pressure affect a throw? | Labelled pressure/hurry/hit, time to throw, throw location and charted catchability/throwaway | Causal effect of pressure on footwork, intended throw, fear or cognition |
| Is a runner needlessly leaving the field? | Boundary distance, opponent approach, in-bounds/out-of-bounds ending, game clock and gain opportunity | Willingness to absorb a hit and alternatives he actually saw |

An engine explanation should record both a command and its achieved motion.
NFL tracking supplies the achieved path, not the command. A poor pursuit path
therefore cannot, by itself, identify weak traction. Conversely, a controller
asking for a reasonable turn does not prove that the body executed it correctly.

## What we own, and what has actually been used

Competition year and football season are different identifiers. Preserve both.
Do not sum overlapping players, games or repeated frames as independent samples.

| Source | Reviewed scope and present utilization | Best next use | Main limit |
| --- | --- | --- | --- |
| BDB2019 / 2017 | 91 tracked games in the pinned supplied archive; existing summary derives tracking metrics from one game | A few complete all-player plays for long trajectories, pursuit and general geometry | Older cohort; missing plays; less detailed role/concept labeling. Raw archive is absent in this workspace. |
| BDB2023 / 2021 | 122 games, 8,557 selected pass/dropback plays; all eight weeks of scouting labels reviewed; separate week-1 audit covers 1,175 plays | Protection opponent/role joins, rush paths, first contact and pocket push through release | Tracking generally ends about .5 seconds after release. Eight acquired weeks are not eight processed movement weeks. Raw archive is absent here. |
| BDB2025 / 2022 | Nine weeks of play/player labels; summary motion uses weeks 1–2, with additional dedicated run, coverage and pocket analyses | Concept/front-conditional run development, presnap motion, all-player contact/pursuit and separation | Each analysis has its own filters and denominator; a geometric front is a proxy for the called front. Raw archive is absent here. |
| BDB2026 / 2023 | Selected pass plays and selected players, weeks 1–18 summarized | Matching selected-player pre-throw role demand | Selected trajectories do not provide all-22 pocket or tackle geometry. |
| BDB2027 / 2023–2025 | Raw inputs present. All 6,310 combine drill trajectories and all three game seasons processed: 22,654,290 game rows, 176,707 retained player-play paths | Same-athlete capacity versus game demand; previously unused orientation/travel fields; OL pull and reversal geometry | Draft cohort, incomplete drill participation and incomplete opponents. Current game extraction excludes runs and many sacks and stops at release, first contact or three seconds. |
| nflverse / 2022–2023 | Eight pinned inputs already downloaded: complete regular-season PBP, rosters, ID crosswalk, historical combine, 2022 snap counts and FTN charting | Conditional outcome/decision references, incomplete-pass attribution and realistic anonymous roster composition | These are play records/charting and body/drill records, not body-contact measurements or known player mental ratings. |
| AddBiomechanics core 1.0 | Four selected subjects already acquired/audited: 12 windows, 5,892 frames, 5,431 force-valid frames | Sanity checks on support/recovery timing and force-normalized movement | Small, non-football participants/tasks; processed model outputs and force-fitted dynamics are not independent NFL contact calibration. |

The full BDB2027 extraction is descriptive rather than fitted. An older engine
movement panel used 888 paths/420 athletes and 3,552 trials at a historical source.
The newer small movement audit uses 18 existing paths/72 trials at pinned source
`246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469`.
Neither automatically evaluates a later engine revision. Read
[the movement audit](../archive/reviews/movement-and-nfl-validation-audit.md) and
[BDB2027 transfer review](../archive/reviews/bdb2027-movement-transfer.md) before using
their numbers. The older BDB2027 acquisition review still describes its original
2023-only trajectory audit; the later transfer review records all-season use.

Current world laws remain useful to test before/after a controller repair with
unchanged bodies. Physical coefficients are not validated just because the
resulting league yardage looks reasonable.

## Useful public sources beyond the tracking archives

The following availability and field meanings were inspected in primary
nflreadr documentation **1.5.1.9002**, retrieved 2026-10-11. Documentation access
was checked; additional season datasets were not downloaded or audited here.

**Participation data is the most useful small new reference.**
[The loader](https://nflreadr.nflverse.com/reference/load_participation.html)
documents seasons since 2016, and
[its dictionary](https://nflreadr.nflverse.com/articles/dictionary_participation.html)
lists formations/personnel, players on the play, rush count, target route,
`time_to_throw`, `was_pressure`, and coverage/man-zone labels. The provider
changes from NFL NGS before 2023 to FTN from 2023. FTN participation becomes
available after the season's postseason is complete. Start with one completed
season and measure actual field completeness before relying on these columns.
They can separate four-rusher pressure, quick-game pressure and coverage outcomes
without estimating pressure solely from a two-yard circle. They do not identify
force, whether a blocker maintained hands, all receiver routes or exact QB vision.

**FTN charting provides a better incompletion breakdown.**
[The dictionary](https://nflreadr.nflverse.com/articles/dictionary_ftn_charting.html)
includes drops, throwaways, catchable/contested passes, interception-worthy
passes, motion, screens, RPOs, blitz/rush counts and the read thrown. Its
catchable label means generally on-target throws that are not defended away;
contested means the receiver faces physical contact at the catch. These are
charting judgments, not tracking thresholds or measured QB mechanics.
`read_thrown="0"` identifies the primary read **only from 2023 onward**;
2022 primary reads appear missing. Missing values must not become a failed
progression. Retain overlapping labels, and separately define mutually exclusive
final outcomes. A completed or intercepted ball can coexist with another label.
The already downloaded 2022 charting remains useful for incompletion attribution;
one 2023 snapshot would add a cleaner progression reference later.

**Public NGS statistics are player-week aggregates.**
[The loader](https://nflreadr.nflverse.com/reference/load_nextgen_stats.html)
documents passing/receiving/rushing from 2016 and minimum attempt qualifications.
[The dictionary](https://nflreadr.nflverse.com/articles/dictionary_nextgen_stats.html)
defines time to throw with sacks excluded; receiving separation at catch **or
incompletion**; snap cushion relative to the defender lined up opposite the
WR/TE on targets; and rushing time to the line of scrimmage. They are useful
checks on selected qualified players, not full tracking downloads. Season
summary rows have `week=0`; do not count them again alongside weekly records.
A mean separation among completed engine throws is not the same statistic as
NGS receiving separation over its target cohort. Match the target/outcome and
player-volume filters, or name the different statistic explicitly.

**PBP gives decision context and outcomes, not technique.**
[The dictionary](https://nflreadr.nflverse.com/articles/dictionary_pbp.html)
defines `qb_dropback` to include attempts, sacks and scrambles; `pass_attempt`
includes sacks. Our throw denominator must explicitly exclude sacks when
matching actual throws. `qb_hit` measures a hit annotation, not all pressure.
`air_yards` is depth perpendicular to the line of scrimmage, not the cross-field
distance the ball traveled. EPA and completion probability are model outputs,
not forces or decision truth. Use the existing
[reference script](../../scripts/nflverse-reference.py) to retain separate
designed runs, scrambles, dropbacks, throws, penalties and outcome denominators.

**Roster, snap and combine data can improve the generated population.**
[Roster fields](https://nflreadr.nflverse.com/articles/dictionary_rosters.html)
and [PFR-derived combine data](https://nflreadr.nflverse.com/reference/load_combine.html)
provide body composition, positions, identifiers and historical drills. Combine
availability is documented from 2000. Preserve position/age, missing drills,
starter/backup selection and correlations between mass and movement rather than
sampling each trait independently. The existing anonymous 2022 KC/PHI inputs
are composition/tendency examples from two strong teams, not NFL-average skill
ratings. Roster weight, bench repetitions, EPA or awards cannot identify actual
grip strength, present-day agility, anticipation or technique by themselves.

**Official rules supply constraints, not observed frequencies.**
[The rulebook URL](https://operations.nfl.com/the-rules/nfl-rulebook/) resolved
to the served **2026 rulebook URL/title** on retrieval. Some internal links/PDF
assets still name 2025; those PDFs were not fetched or verified. The offensive
and defensive chapters cite the actual served article prose, rather than
claiming a PDF/edition match. Use an explicit rules-season configuration
for formation, motion, illegal contact, holding, pass interference and player
safety rules. A rule definition cannot calibrate officiating judgment or tell us
how often an engine contact should be penalized. Retain the actual contact and
decision evidence needed to interpret the rule.

**Public film supplies explanatory examples.** An official team/NFL coaching
clip, clinic lecture or selected game clip can demonstrate a key, approach or
exchange. Record the exact URL, date, presenter/level, view, game/play if known,
and the point being taught. A highlights compilation has no denominator.
Broadcast angles can hide away-side leverage and assignment; a discussion of
one team's rule does not establish a universal NFL rule. Full all-22 archives
and commercial coaching libraries should not be described as open datasets
without checking their actual access and reuse terms. Film is strongest as a
falsifying witness paired with a controlled engine case, not as a source of
numerical force constants.

## An immediate small orientation and movement pilot

The existing BDB2027 game CSV headers contain `o` and `dir`; the current movement
extractor consumes neither. The
[pinned original BDB2019 schema](https://github.com/ryurko/Big-Data-Bowl/blob/0dac66ce81e5fd22ca48f35ea6a637c523dda12b/schema.md)
independently defines `dir` as motion angle in degrees, but does **not** include `o`.
Fresh Kaggle data-page and official NGS glossary requests returned page shells
without their field definitions. Thus the interpretation of 2027 `o` as body
orientation is a **provisional mapping**, not a verified gaze measurement. The
orientation pilot must retain that caveat even if the arrays look plausible.

1. Predeclare a small, deterministic set of selected-player game trajectories
   across two seasons and several actual aligned roles. Select by keys before
   seeing whether a play is good or bad; do not choose only explosives. Keep
   the full eligible/excluded denominator, missing orientation, gaps and duplicate
   times. Preserve raw snapshot fingerprints and exact selected keys locally.
2. Verify `dir` against position-derived travel direction at adequate speed,
   checking unit convention, zero direction, clockwise sign and attack-direction
   normalization. Circular differences and interpolation must wrap correctly
   across 359/0 degrees. Do not assign a direction to nearly stationary noise.
   The absolute signed difference between `o` and `dir` is insensitive to a
   shared angular origin, but that alone does not establish what `o` measures.
3. First report descriptive **orientation/travel relationships**: e.g., sustained
   relative angle below 45 degrees, 45–120 degrees, and over 120 degrees. These
   are declared candidate classifications, not validated run/shuffle/backpedal
   labels. Repeat with nearby thresholds and minimum speeds/durations. Record
   transition rate/duration, speed at transition, braking, curvature, and role.
4. If provider semantics and representative film support the mapping, compare
   observed body/travel relationships with native engine body facing and velocity
   under equivalent tasks. Keep eye/gaze/controller attention out of that claim.
   A linebacker can move backward while keeping his body toward a threat; actual
   eye direction and the threat he perceived remain unobserved.
5. Run the same **position-derived** speed/acceleration operator on both sets:
   10 Hz resampling, documented central difference, smoothing and edge trims.
   Preserve native unsmoothed data for separate physical work/load checks.
   Report entry-speed/role/phase bins and short-window exclusions. Do not compare
   filtered provider `a` with unfiltered native acceleration as if they were the
   same measurement.

The [first small pilot](orientation-pilot.md) now retains 244 pass windows and
6,751 frames from the earliest tracked regular-season games in 2023 and 2025.
It measures circular `o`/`dir` differences conditional on a shared convention,
with athlete/role counts and exclusions. It does not verify the field semantics,
identify true backpedaling, or compare a current engine motion panel. The
position-derived convention check and matched engine comparison above remain
future work.

This can diagnose default-facing commands that rotate a defender toward travel,
overfast reversal approaches, or unrealistic movement transitions without
inventing an eye model or retuning friction. The separate pilot collector owns
its eventual cohort and results; this proposed sequence is not a completed
all-season orientation study.

## Define contact, pressure and separation before comparing

Keep three separately named pressure measures: a **geometric opportunity**
(distance, closing speed and path to the QB), a **charted disruption**
(hurry/hit/sack/pressure label), and the engine's **perceived pressure**.
A rusher within two yards might still be controlled by a blocker; an unblocked
rusher farther away can force an early throw. Timing starts at the actual snap
and stops at the relevant release/sack endpoint. Missing release, rollout and
scramble paths need distinct cohorts. Pocket depth among OL at 2.5 seconds also
selects plays still developing then; it is not an unconditional pocket average.

For run contact, distinguish the tagged `first_contact` event from the engine's
first physical joint/strike/body collision and from a proximity proxy. The
existing run extractor's same OL/opponent within one yard for two consecutive
10 Hz frames is **sustained proximity**, not hand contact or a successful block.
Report contact time, yards before contact, contact-to-end time, carrier-relative
displacement and endpoint type separately. Missing or window-censored contact
does not mean zero yards before contact. A run ending out of bounds is not a
completed tackle and must remain in the overall ending denominator.

For coverage, report at least separation at release, arrival/catch and final
outcome, conditioned on target depth, route family, coverage responsibility,
help and field compression. A nearest defender is not necessarily the assigned
marker. Incomplete targets cannot be silently excluded from a target-level
comparison. For tackling, near approaches are not automatically attempts;
distance-only inferred misses will overcount pass-by defenders and teammates
blocked from a feasible attempt. Record the attempt definition and eligibility.

For success/explosiveness, retain the existing distinct yardage-based
40/60/100-percent down-success and positive-EPA measures, and explicitly name
10+ yard runs and 20+ yard pass/dropback thresholds. Report both ordinary and
extreme situations. A 3rd-and-27 run that gains 12 yards is an explosive under
one definition and unsuccessful under another; the contradiction is only in
the labels, not in football.

## Compare distributions while respecting randomized rosters

Generated players should remain varied. Build population checks in layers:

- **Bodies/capacity:** role-conditioned height/mass, sprint and reversal
  distributions with realistic correlations and missingness. Test several
  generated rosters and strength bands, not one optimized depth chart.
- **Task execution:** matched motion/contact geometry for the same body under
  different requests and techniques. Preserve a poor read or difficult leverage
  condition instead of compensating with physical strength.
- **Football distributions:** situation, personnel, concept, front/coverage,
  score/clock state and opportunity. Report player/team-season variation as well
  as means. An average from different players and calls is a broad reference,
  not a compulsory exact target.

Group repeated frames/attempts within player and plays within team-game or
team-season. For uncertainty, resample players for athlete-motion questions and
games/team-seasons for outcome questions; do not bootstrap tracking frames as
independent observations. Keep every season/attempt from an athlete on the same
side of a development/holdout split. Keep overlapping archives on that same
side too. Publish rare-cell counts rather than smoothing them into certainty.

Score-state associations can justify conditional playcalling references; they
do not prove that a trailing QB is psychologically reckless. Control or stratify
for down/distance, clock, team/QB, game script and opponent before interpreting
risk selection. An engine can choose more downfield opportunities by situation
without assigning an unmeasured fear or desperation trait.

Use predetermined ordinary panels alongside owner-reported anomalous clips.
Retain all adverse pairs, censored endpoints and rejected prototypes. A handful
of impressive touchdowns cannot estimate explosiveness, just as a shortlist of
physics failures cannot establish their league frequency.

## What a useful new evidence packet contains

Record the source season/provider and snapshot hashes; joins and exclusions;
player/play counts; derived versus supplied fields; units, temporal windows and
filtering; script/runtime versions; and the canonical engine source digest.
NFL coordinates here use yards, while AddBiomechanics uses meters/newtons.
The native World uses kg, yards and seconds: force is kg·yd/s², impulse
kg·yd/s, and work kg·yd²/s². Use `1 yd = 0.9144 m`; multiply native force/impulse
by 0.9144 to obtain N/N·s, and native work by 0.9144² to obtain joules. Keep
angular quantities and torque dimensions explicit. Convert once at the boundary,
not again inside a comparison.
Separate the body profile, initial installation, consumed perceived image,
requested command, achieved trajectory and contact/work ledger. Source pins
must identify the engine that actually ran, including rejected intermediate
versions. Saved baseline observations can be reused after their input guards
are verified; that is cheaper than resimulating everything.

Keep NFL source data subject to its actual source terms. The pinned BDB2019
README contains contest-specific NGS restrictions; repository visibility alone
does not establish redistribution permission. FTN documentation explicitly
requires **FTN Data via nflverse** attribution under **CC-BY-SA 4.0**. Participation
has its own documented NFL NGS/FTN attribution split. AddBiomechanics core
documents **CC BY 4.0** and selected-file attribution. These terms do not become
the code license. Prefer pinned access instructions, dictionaries and reviewed
aggregates to committing large raw archives.

The next evidence should show one controller using the same physical
capabilities across a sprint, a controlled approach, a reversal and loaded
contact. Then extend one football interaction at a time. If its outcome changes,
show the first changed observation/request and the subsequent achieved force or
motion. That is a stronger realism claim than finding a parameter that makes
season scoring closer to the NFL.
