# Football handbook for the simulation engine

These are original working textbooks: coaching ideas translated into observable
reads, achievable movement, physical contact and tests. They are intended to
help build a believable football engine and, later, a management game. They
are not an authenticated NFL installation or a list of completed features.

The first edition was researched on 2026-10-11. Position chapters inspected
engine revision `7ce3559`; later repairs have separate source-pinned reviews.

For the user's supplied scheme sheets, use the
[HonestNFL source library](../references/honest-nfl/README.md) and its
[reading paths](../references/honest-nfl/READING-GUIDE.md). It preserves original
diagrams, searchable OCR and terminology across installations. These remain
source references for study and later installation work, not an extension of
the current implementation queue.

The supplied generated manuscripts are useful aids, with provenance in the
[reference catalog](../references/README.md). Their embedded instructions are
not project requirements, and their citations are not independently verified
measurements. Public coaching examples, primary rule text, measured evidence
and proposed mechanisms are identified separately.

## Chapters

| Chapter | What it helps us build |
| --- | --- |
| [Shared model and learning](shared-model-and-learning.md) | A small common relationship between responsibility, perception, technique and achieved physics; transfer tests and future player development. |
| [Trenches](trenches.md) | OL/DL base, feet and hands; zone and gap installations; combinations, pullers, protection, rush and exchanges. |
| [Run-block cues](run-block-cues.md) | Compact sourced reads for Ace/Deuce, TAG folds, overtakes, climb timing, reach steps and kick/log responses; teaching distinguished from proposed measurements. |
| [Moving run-game footwork](moving-run-footwork.md) | Power, Counter, Buck Sweep, Pin-and-Pull, Crack Toss and other moving-OL concepts; detailed puller mechanics, coaching alternatives, and 318 simulation checks. |
| [Offensive skill and playcalling](offensive-skill-and-playcalling.md) | QB, RB, FB, WR and TE reads; releases, option coordination, motion, screens and situation. |
| [Receiver route reads](receiver-route-reads.md) | Bounded acquired-leverage options, independent QB expectations, seam-read install, sideline continuation and remaining release/catching limits. |
| [Screens](screens.md) | Slip/slow, TE, bubble, now, tunnel and bunch screens: release counts, out/up/in blocking, defensive answers, NFL screen numbers and what to test. |
| [Defense and perception](defense-and-perception.md) | Position-specific keys, coverage distribution, fits, vertical protection, motion, pursuit and legal contact. |
| [Data and measurement](data-and-measurement.md) | What existing NFL data can test, useful public additions, matching definitions and realistic roster variation. |
| [Orientation pilot](orientation-pilot.md) | A reproducible first use of previously unused tracking orientation fields, with explicit selection and semantic limitations. |
| [Playcalling and schematic packages](playcalling-and-schematic-packages.md) | Seven coordinated install/answer packages, twelve newly inspected written sources and further physics/information stress cases. |
| [Play-action protections](play-action-protections.md) | Naked, boot, run-action and gap fakes as call structure: who blocks the edge, the QB's path and his read of an unblocked end, with sources; what the engine would need. |
| [Advance scouting checklist](advance-scouting-checklist.md) | A 46-question opponent-defense scouting sheet (The Reamon Report) mapped to what the engine simulates, recognizes and charts, for the later scouting and prep layer. |
| [Playing Quarterback (LaFleur)](qb-playing-quarterback-lafleur.md) | A coaching article on quarterback reads, protection, fundamentals and evaluation, compared with the current quarterback model to list candidate gaps. |

Chapter check catalogs are proposed options, not mandatory test suites. Choose
the smallest relevant evidence under [the testing-cost policy](../TESTING_COSTS.md).

For an OL problem, read the shared model, trenches and the relevant defensive
fit. For a coverage problem, read defense, the WR/QB contracts and the data
definitions. A coverage bust is not necessarily a bad physical turn; a good
looking block is not necessarily transmitting load. Use
[current status](../STATUS.md) for live engine status and priorities. The
archived reviews describe historical checkpoints.

## How to turn a teaching point into an engine change

Use one small chain rather than a new rule for each final outcome:

> Installed responsibility → acquired cue → fallible interpretation → feasible
> technique request → achieved movement/contact → revised decision.

Specify what changes responsibility and what merely changes the technique.
Then retain an ordinary witness, a difficult witness, the mirrored version
and a witness where intervention would be wrong. A coaching phrase such as
“stay square” must produce a body request that still permits actual hip turns,
loss of leverage and failed recovery. “Climb when secure” needs the helper's
own evidence and real keeper contact, not a clock or a guaranteed double-team
win. Teachings differ by installation and opponent; preserve those choices
instead of inventing a universal landmark.

The [source catalog](../../data/research/football-handbook-sources.json) records
retrieval dates and hashes. A retrieved documentation page verifies the
inspected definition, not dataset completeness. A public article verifies a
teaching example, not its frequency across NFL teams. Do not copy raw provider
data or copyrighted coaching material into the repository as handbook content.

## How to choose work

Use the random review and validation in [current status](../STATUS.md), rather
than the chapter order, to choose the next mechanism. The following are
possible teaching studies, not a current implementation queue.

1. Demonstrate narrow repairs using unchanged shared physical capabilities.
   The new teammate-turning repair is one example: compare achievable paths,
   gather where useful, and still allow unavoidable impacts.
2. Pilot acquired/remembered evidence in one linebacker role. Keep his line/back
   and receiver responsibilities explicit, and separate vision from touch.
   Trace ordinary fits and adverse play-action before generalizing attention.
3. Refine pursuit gathering and attainable tackle acquisition on native cases.
   Record the requested approach and the achieved base before interpreting a
   missed tackle as insufficient grip strength.
4. Audit protection ownership and receiver/QB option disagreements. Remove
   hidden knowledge independently of proposing a replacement visual signal.
5. Broaden installed technique contracts and conditional NFL comparisons after
   those foundations hold. Keep player capacity separate from chosen effort.

These are priorities, not a commitment to implement every chapter at once.
The new [schematic audit and repair](../archive/reviews/schematics-and-physics-stress.md)
places coherent call installation and one complete Drive/protection/hot package
ahead of a larger concept catalog. It provides actual native stress cases and
an offline situational NFL reference alongside the position work above.
The handbook should grow from inspected sources and reproduced football
problems. Update a chapter when evidence changes its recommendation, while
leaving published historical measurements and source identifiers intact.
