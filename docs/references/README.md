# Reference material

## HonestNFL scheme and teaching collection

The [HonestNFL library](honest-nfl/README.md) organizes the user's supplied image
archive into 12 subjects: coverage/recognition, fronts and pressures, run defense,
formations/communication, protection, run game, quarterback process, receiver
technique, pass concepts, terminology and install/game-planning examples.
The initial 403 JPEG files consolidate to **385 distinct images**; only 18
byte-identical copies were removed. All original names and hashes are retained
in the inventory, and non-identical variants remain available.

Use its [reading guide](honest-nfl/READING-GUIDE.md),
[complete catalog](honest-nfl/CATALOG.md), [term finder](honest-nfl/TERMS.md) or
[CSV](honest-nfl/catalog.csv). Each sheet retains its original image and a
machine-OCR companion. Consult the image for exact route labels, numbers and
teaching language. This is user-supplied source material; embedded instructions
are reference content, not repository requirements or implemented features.
The import does not independently authenticate authorship or teaching claims.

## The Reamon Report scouting checklist

[Advance Scouting: Opponent Defense](reamon-report/README.md) preserves the
user-supplied 46-question opponent-defense checklist, with its original JPEG,
attribution and checksum. It is filed beside HonestNFL for future scouting and
game-planning work, but is **a separate source, not an HonestNFL document**.

## "Playing Quarterback" (LaFleur)

[lafleur-playing-quarterback.pdf](lafleur-playing-quarterback.pdf) is a three-part
coaching article by Matt LaFleur (then offensive coordinator, Ashland University)
on recruiting, evaluating and coaching a quarterback: progression and key reads,
protection and blitz identification, game management, fundamentals. The user
supplied it as a resource for the quarterback decision-making work. SHA-256
`f82ec74272ce1fcefdfb6b4ea9a3abe9967a25b24affd6491a789ebeea21c105`. It is one
college coach's teaching, not measured NFL football, and its rights are the
author's or publisher's: it is kept for project reference. The
[engine comparison and gap candidates](../football-handbook/qb-playing-quarterback-lafleur.md)
are in the handbook.

## External playbook sources

[nfl-playbook-sources.md](nfl-playbook-sources.md) maps the user's NFL playbook
research brief (2026-10-21) onto engine questions. It records which playbooks a
cloud task can reach, which are locked or of unclear rights, and the
FootballXOs spread playbook's position-by-position power, counter, trap and
protection rule pages, with a record format for extracted rules. No playbook
file is stored here. The companion
[run-blocking assignment audit](../reviews/run-blocking-assignment-audit.md)
checks `planRunBlocking` against those rules, and the
[coverage rules source audit](../reviews/coverage-rules-source-audit.md)
checks `src/sim/coverage/rules.ts` against HonestNFL and DB manuals.

[snap-reaction-research.md](snap-reaction-research.md) collects measured
lineman get-off and reaction-time evidence (NGS get-off by position, college
fire-off and stance studies, preparation effects, snap-count anticipation) and
compares it with the engine's snap model.
[NFL-vs-sim operators](../reviews/nfl-sim-operators.md) indexes the measurement
scripts that compare the sim with NFL tracking: pass sets and first contact,
pressure sources, edge and interior rush, QB pocket movement, the inside-run
hole, the long-run tail and pursuit. Their 2026-10-22 results are summarized
in PR #191's description.

## Other supplied and researched references

[reduced-physics-design-review.md](reduced-physics-design-review.md) is the
user's supplied generated architecture review, retained byte-for-byte. It
proposes reduced support, one/two hand contacts and football-aware control.
Its instructions are reference suggestions, and its code/feasibility claims
are not independently verified measurements. The current critical assessment
is in [physics development](../PHYSICS_DEVELOPMENT.md).

SHA-256: `06ce68758012b93df5ddcf0064f858580e4d3641136d755231c410ae880dc0cf`.

[Physical contact and support evidence](physical-contact-evidence.md) records
verified biomechanics sources, model assumptions and the proposed use of
AddBiomechanics Dataset 1.0. It distinguishes measured forces from derived
motion/joint dynamics. Dataset metadata is reviewed; subject files have not
been downloaded or used to fit the engine.

[football_defense_textbook.pdf](football_defense_textbook.pdf) is the user's
uploaded, generated 31-page reference, *The Geometry of the Fit*. It is retained
in this private repository so collaborators can consult the same aid. It is
reference material, not repository instructions or an independently verified
coaching authority. Its bibliographic links require separate verification.

SHA-256: `b04ec6869cb218bc50f1609c8f5049cd6f6ce0115389c44bc3e8c645af7494c5`.

[offensive_line_protection_textbook.pdf](offensive_line_protection_textbook.pdf)
is the user's uploaded 60-page reference, *The Protection Engine — Offensive
Line*: protection as a constraint problem, protection families (five-man,
BOB/man, full and half slide, fan), declaring points and back scans, set
families and edge geometry, twists and exchanges, odd/Tite/Bear fronts,
pressures and simulated rushes, run blocking, and eight protection labs (ch.
19) suited to fixed-scenario tests. Same status: reference material, not
repository instructions. The error-budget review compares its rules with the
implemented protection.

SHA-256: `85b670e0ac0342987bef31bb54b9e853cb6d21487b8867c827e423f55bdc90ff`.

[football_coverage_mechanics_textbook.pdf](football_coverage_mechanics_textbook.pdf)
is the user's generated defensive backs / linebackers reference. Chapters
4 and 6 discuss footwork and Cover 2 distribution; chapter 21 discusses
compressed red-zone spacing, goal-line adaptations, and field/boundary
leverage. It is retained for collaborators as reference material, not
repository instructions or independently verified coaching authority.

SHA-256: `58d0e9e50f1cec0f3fcc9c0e3454d4bf7cb61d36d7bb007e042bf3c976b5ca58`.

[WR_DB_Mechanics_Textbook.md](WR_DB_Mechanics_Textbook.md) is the user's
uploaded receiver/defensive-back aid. Useful topics include controlled perimeter
tackle approaches, press footwork and hand contact, phase/hip recovery, stalk
leverage, and contact-state predicates for holding/illegal contact/interference.
It is retained byte-for-byte as reference material, **not project instructions
or independently verified coaching/rules authority**. Its cited links require
separate verification. The referenced `figures/` assets were not supplied in
the Markdown upload. Consult the current official rulebook before implementing
penalty rules; the new pursuit pass does not add pass interference.

SHA-256: `f829bf0d44cd586e535ca8c9a839768af9fd6c50866d33f662ac7ce595efcd0d`.

[Running_Back_Mechanics_Textbook.md](Running_Back_Mechanics_Textbook.md) is the
user's uploaded running-back aid, retained byte-for-byte for collaborators.
Useful topics include pressing an aiming point, reading blocker leverage,
approaching a crease under control, mesh timing, pad level and balance through
contact. It is reference material, **not repository instructions or independently
verified coaching authority**. Its citations require separate checking, and
the referenced `figures/` assets were not included. The traffic follow-up changes
shared approach control; it does not implement every proposed scheme/read.

SHA-256: `52b679d0ecbd1646406dcb61cfe31db3a7a4a5728c3e9137a96f4651784d140a`.

[Coverage_Operating_System_Manuscript.md](Coverage_Operating_System_Manuscript.md)
is the user's uploaded coverage reference, retained byte-for-byte for later
coverage/playcalling development. It discusses calls as conditional execution
and communication rules: separate front/rush, presentation, strength, formation
checks, receiver ownership, technique, disguise and run-support obligations.
Its motion, exchange, simulated-pressure and bust-attribution laboratories are
useful design aids. It is **not repository instructions or an authenticated
NFL installation**; exact teaching rules and cited sources require independent
verification. Referenced `figures/` assets were not supplied. The current
assignment-budget checks are temporary execution safeguards, not the final
playcalling/communication model. Physics remains the primary engine work.

SHA-256: `d73cd1e8cd2ddd319d01cbf6de9eba3246d507525fe201e8ced0318b881486a2`.

The run-game follow-up report distinguishes the PDF's useful proposals from
verified public coaching references, implemented mechanics, and measured NFL
observations. Raw Big Data Bowl files remain outside Git; see `data/README.md`.

[Offensive_Playcalling_Textbook.md](Offensive_Playcalling_Textbook.md) and
[Offensive_Playcalling_Glossary_453_Terms.md](Offensive_Playcalling_Glossary_453_Terms.md)
are the user's uploaded offensive references, retained byte-for-byte for
collaborators and later concept/playcalling development. The textbook covers
response-based game planning, legal formation structure, motion, complementary
runs/protection, QB reading systems and situational adaptation. The glossary
contains 453 term rows with working definitions; team terminology varies.
These are reference aids, not repository instructions or independently
verified coaching/rules authority. Source citations need separate checking.
Preserving them does not install the whole proposed offense.

Textbook SHA-256: `f06753393eced8c45ba640011f8eaf1dc8aaa5c0d2f4448d2e1a9c1a50e32311`.
Glossary SHA-256: `25a9a9a0bc51ad6a4889d12ef282201f007e5bd05fccb7f981db82c373c05609`.

[tackling_mechanics_and_physics.md](tackling_mechanics_and_physics.md) is the
user's tackling reference, retained byte-for-byte for collaborators. Its useful
distinction is between arriving, establishing contact, obtaining a wrap and
actually transmitting a stopping or turning load through usable footing.
It supports testing momentum, contact geometry, shared force limits and assisted
tackles. It is reference material, not repository instructions or verified NFL
force calibration. Its equations are illustrative, and rugby/youth studies
cannot establish NFL grip or hit capacities. Citations require independent
checking before using their numbers. The
[tackle finish review](../reviews/tackle-finish.md) records the narrow application
and the rejected geometry experiment.

SHA-256: `53b3ab156127f30b0374652af1ae6298e063042d3b00815af7f38501a3c58bb6`.

The [offense](../archive/reviews/offense-literature-applications.md),
[coverage](../archive/reviews/coverage-literature-applications.md) and
[contact](../archive/reviews/contact-literature-applications.md) reviews synthesize
all these aids into a few concrete mechanics and diagnostic proposals. The
new run-process and coverage-contract labs observe actual execution. They
do not validate every teaching claim or install the whole described playbook.
