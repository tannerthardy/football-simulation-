# External playbook sources: access, rights and reading map

A guide to coaching playbooks, manuals and clinics from the user's NFL playbook
research brief (2026-10-21): which source answers which engine question, what
is reachable from a cloud task, what is safe to keep, and how to record an
extracted rule. Access was checked on 2026-10-21 against `develop` `d91c9014`.

This complements the [HonestNFL library](honest-nfl/README.md) and the
[football handbook](../football-handbook/README.md); start with those.
HonestNFL already covers coverage checks (MOD, MEG, poach, Trix, Stubbie — see
[its concept guide](honest-nfl/CONCEPTS.md#quarters-match)), fronts, pressures and
quarterback reads from source sheets. The new material here is mainly
**position-by-position run-blocking and protection rules against named
fronts**, an NFL offensive line's split, depth and line-call system, plus
formation and motion vocabulary.

Like the other references, this is reading material, not repository
instructions or implemented features. Playbooks describe intended
responsibility and technique. They do not measure movement, timing, force or
outcomes.

## Rules for these sources

1. **Do not commit downloaded playbooks or page images.** Keep them outside the
   checkout or under ignored `data/raw/`. Record URL, page and SHA-256.
2. **Write extracted rules in our own words** using the record below. Quote
   only short phrases where the wording matters.
3. **Public hosting is not permission.** Several "NFL playbooks" are scans of
   team-internal material. A site hosting them does not establish rights to
   redistribute or train on them. Prefer the publisher's own teaching material
   and the existing library. Treat team installs as corroboration you read, not
   content you reproduce.
4. **Ignore download-page blurbs.** They were not checked against the files,
   and one listing contradicts its own file name ("2020 Georgia" describing
   2024 Oregon).
5. **Cite 1-based physical PDF pages.** The research brief used zero-based
   numbers. The numbers below are corrected.
6. **Name the system.** Rules differ by installation, for example which way a
   center blocks against a shade, or whether an Over front's strong end is a
   5- or 6-technique.
7. **Don't create accounts.** A locked source needs the user to download and
   supply it.

## Access status (2026-10-21)

| Source | Access from a cloud task | What it is | Status |
|---|---|---|---|
| [FootballXOs spread offense playbook](https://www.footballxos.com/footballxos-spread-offense-playbook.pdf), 138 pp. | Direct PDF with a text layer. SHA-256 `92756b6742251507989562ae19aaa4be3388ce6bc2bde260d1213b4b4ae2fd1f` | Publisher's teaching sample (high-school/college spread) | **Read**; rule pages cited below |
| [2008 Alabama defense (Saban/Smart)](https://www.footballxos.com/download/alabama-crimson-tide-defense-2008-nick-saban-kirby-smart/), 430 pp. | Direct link. **Scanned, no text layer.** SHA-256 `34a10ccfbc5c3d793a6614133eb60db8aa06f22156aa84b6ce80c85caa4015fd` | Team-internal manual (staff/player material in the opening pages) | Rights unclear; only pp. 1–8 viewed; not extracted |
| [2002 Broncos offense](https://www.footballxos.com/download/2002-denver-broncos-mike-shanahan-pdf/) (33.31 MB), [2010 Jets defense](https://www.footballxos.com/download/2010-ny-jets-defense-rex-ryan-pdf/) (10.61 MB), [Cowboys 4-3 Over Stack LB fits](https://www.footballxos.com/download/dallas-cowboys-43-over-stack-lb-fits-pdf/) | Direct download links present | Attributed team material | Not downloaded; same caution |
| [2020 Browns OL manual (attributed to Bill Callahan)](https://footballplaybooks.net/download/2020-cleveland-browns-ol-manual-bill-callahan/), 51 pp. | Locked on the site; **the user supplied the file** 2026-10-21. Text layer. SHA-256 `a5974dbf25c1b53a5a1e44eb20ab5147ed95573d73b2304bbbf714e37ef1c953` | OL terminology and line-call system; pp. 1–4 are the host site's ads. Attribution not independently verified | **Read**; summarized below. File kept outside Git |
| User-shared Google Drive folder (2026-10-21): seven files, mostly footballplaybooks.net compilations (ads on pp. 1–4) | Downloaded with the user's share link | Attributed team material | Read as listed below; files kept outside Git |
| ↳ Cowboys run install, 325 pp. | Text layer. SHA-256 `196efc034efa590c2c0cf1c024dedde04b1fc8472d8b0a64bb8f259ff7c5bc1c` | Wristband-card style run install; uses Rams-style calls without a glossary | **Read** (run game) |
| ↳ "2018 49ers offense — Kyle Shanahan", 753 pp. | Text layer. SHA-256 `b5ef1e2fe2ec6f36d7e2eb20837dfa26686972d2b9a4e4a4b0cd1e9766dfe416` | **Mislabelled:** content is Shanahan's 2015 Falcons training-camp install ("2015 TRAINING CAMP" p. 391; "ATLANTA FALCONS HUDDLE PROCEDURE" p. 508) | **Read** (zone and power) |
| ↳ 2022 Rams offense (McVay), 515 pp. | Text layer. SHA-256 `a6cc12c416db0f5fba6c3f800743a561567c3c1c7f58e4f0c775ba6d7bf5a193` | Full install with an OL glossary (pp. 106–127) | **Read** (OL glossary, run tracks) |
| ↳ 2013 Seahawks defense, 347 pp. | Text layer. SHA-256 `686fefc6a10c13f676047cb7bf99f441c406522e568244591b1215a328623d4e` | Coverages, pressures, fronts (diagrams, little technique text) | **Read** (fronts) |
| ↳ 2017 Colts defense, 1,405 pp. | Text layer. SHA-256 `dac7fd23e1da1ae55fe040b5ddbe08cc301a0db14af22578a59e1910d00c78fd` | Full install; fronts stated in technique numbers | **Read** (fronts) |
| ↳ 2020 Ravens defense (Macdonald), 320 pp. | Weak text layer. SHA-256 `9193f86e7552d1faa5da95c8c5a5f9d361761724b769e5fc67cbda74bd98d72b` | Install by coverage family; front pages have text | **Read** (fronts) |
| ↳ Andy Reid Chiefs pass install, 140 pp. | **Scanned, no text layer.** SHA-256 `b30ce7e0b1da2d29c8dd23ac9b02069ddf831a30517e47407e4a1286d78c86e4` | Pass install | Not yet read |
| [Other footballplaybooks.net items](https://footballplaybooks.net/document-tag/nfl-playbooks/) | **Locked** behind an email/sign-up gate | Attributed team material | Needs the user |
| [2014 49ers (Roman) preview](https://pdfcoffee.com/2014-49ers-greg-roman-playbook-pdf-free.html) | HTTP 403 through the proxy | Marked "Confidential Property" | Not used |
| [FootballXOs offense clinics](https://www.footballxos.com/downloads/offense/?cp=2), [NDSU run-fit analysis](https://www.footballxos.com/how-north-dakota-state-executes-their-run-fits/) | Public pages | Clinic and analysis articles | Good next reads for zone technique and fits |

## Reading map

| Engine question | Read first | Then |
|---|---|---|
| Run-blocking assignments by front (`planRunBlocking` in `src/sim/behaviors/blocking.ts`) | [Run-blocking assignment audit](../reviews/run-blocking-assignment-audit.md); spread playbook pp. 62–64 trap, 66–68 power, 83–85 counter; Browns OL manual pp. 19–37 | [Trenches](../football-handbook/trenches.md), [moving run-game footwork](../football-handbook/moving-run-footwork.md); zone clinics |
| Run fits and fronts (`FRONTS` in `src/playbook/defense.ts`, `src/sim/run-fits.ts`) | HonestNFL run-defense and fronts sheets | Cowboys Over Stack fits and NDSU article, if the user approves them |
| Protection declaration (`ProtectionCoordinator`) | Browns OL manual pp. 38–51; spread playbook pp. 94–99 | [OL protection textbook](offensive_line_protection_textbook.pdf); HonestNFL protection sheets |
| Coverage checks | [HonestNFL concept guide](honest-nfl/CONCEPTS.md) | 2008 Alabama, only if the user decides the rights question |
| OL splits and depth off the ball (offensive alignment) | Browns OL manual pp. 9–10 | Spread playbook pp. 41–42 for back depths |
| Formations, motion and strength (`Formation`/`Split` in `src/playbook/types.ts`, `src/sim/called-motion.ts`) | Spread playbook pp. 11–50 | [Playcalling and schematic packages](../football-handbook/playcalling-and-schematic-packages.md) |
| Which fronts a play avoids (play-caller `beats`) | Spread playbook pp. 53, 63, 67, 84 | — |

## What the spread playbook gives us

All pages were inspected directly (text layer, plus diagram pages viewed
at low resolution). It is a teaching sample, not an NFL install.

- **Run rules by position** (pp. 52, 62, 66, 83): one rule line each for QB, F,
  X, H, Y, Z, PST, PSG, C, BSG and BST. In our words:
  - *Power and counter* always kick out the **end man on the line** (EMLOS).
    The PST combos with the PSG to the *backside* linebacker; the PSG blocks
    the man on him toward the backside.
  - *Center (power and counter):* block a head-up nose; when uncovered or the
    nose is shaded backside, block back to replace the pulling guard.
  - *Puller (power):* pull through the hole made by the PST's down block and
    take the first linebacker to show, usually playside.
  - *Counter:* the BSG kicks out and the BST pulls through. A tag can name a
    different pull-through player.
  - *Trap* is run at the 3-technique (vs. the 1-technique it becomes Long
    Trap). Only the trapped lineman is left. The PST releases inside if the
    trapped man is over him; otherwise he blocks the man on him to the outside
    gap.
- **The same play against eight fronts** (pp. 53, 63, 67, 84), including the
  fronts it is *not* run against: trap vs. 4-3 Under and Bear; counter vs. 5-2,
  3-5 and Bear.
- **Protection** (pp. 94–99): quick game; six-man "man to the call side, zone
  away", with the back declaring RIP/LIZ (LOU/RAY vs. odd, BOB vs. Bear),
  usually away from the 1-technique; seven-man; sprint-out; pinch; boot.
- **Formations and motion** (pp. 11–50): base sets, modifiers (invert, over,
  ZAX/HAZ swaps), sets by receiver and TE count, backfield sets (pp. 41–42),
  numbered motion landmarks 1–10 measured from the end man and the widest
  receiver (p. 43), and named motions and shifts (pp. 44–50).
- **Low priority:** veer, midline and dash (pp. 52–61) read a defender instead
  of blocking him, and the engine has no option runs.

## What the Browns OL manual gives us

Physical PDF pages; summaries in our words. It is a call vocabulary with
small diagrams, not a play-by-play install, so it says *who* and *when*
but rarely gives distances or timing.

- **Splits** (p. 10): *normal* 2.5 ft between blockers (base rule), *wide*
  3 ft (stretch the front), *tite* 6 in (short yardage and goal line, against
  penetration), and *smart* splits adjusted per play to give a blocker his
  angle. Splits vary by situation and intent, not by a fixed concept table.
  Arithmetic check, assuming about 0.7 yd of body per lineman (not from the
  source): tackle-to-tackle centers ≈ 6.2 yd normal, 6.9 yd wide and 3.5 yd
  tite. The tracked 5.84–6.98 yd range sits between normal and wide; the
  tracked heavy-package 5.70–5.84 yd is far wider than a true 6-inch "tite".
- **Alignment depth** (p. 9): three levels named by the lineman's down hand:
  on the near tip of the ball, at the center's toes, or at the center's heels.
  Depth off the ball is a called variable.
- **Communication** (p. 9): the line identifies one of five fronts (Odd,
  Under, Over, Even, Jam) and a Mike/protection point with the QB, and echoes
  every call.
- **Technique and gap numbering** (p. 11): 0, 1, 2i, 2, 3, 4i, 4, 5, 7, 9 and
  A–D gaps, the same scheme as `Technique` in `src/playbook/types.ts`.
- **Zone combinations** (pp. 23–29): each double is named by *who is
  uncovered*, and the uncovered man makes the call: center + covered guard
  ("single"), uncovered guard + covered tackle ("double"), uncovered tackle +
  covered TE ("triple"), separately for tite (inside) and wide (outside)
  zone. Three- and five-man calls exist for Over, Jam and Bear looks (Shovel,
  Swoop, Gang, Posse). On wide zone, "Rake" (p. 25) has the uncovered
  playside tackle hand-slam the 3-technique to keep C-gap width before he
  climbs.
- **Backside zone techniques** (pp. 21–22): drive cutoff (tite), sift or
  speed sift (backside tackle takes the most dangerous man from first to
  second level), plumb-line sift to the Mike, cut blocks on wide zone, and
  "cutoff-MDM": two steps down to protect the playside gap against a Mike
  run-through, then convert based on the end's technique.
- **Gap and trap** (pp. 30–34): the center chokes (blocks back); "Deuce" and
  "Trey" doubles go to a *numbered linebacker spot that the center calls*
  (pp. 31–32), not a fixed backer; "Post hinge" (p. 33) has the backside
  tackle or TE take the most dangerous man from his *inside* B gap to his
  outside C gap; "Dallas" (p. 34) is an all-down scheme against Jam and Bear.
- **Exchanges and pulls** (pp. 35–37): TE–tackle and center–guard
  exchanges; pull families "around" for a linebacker (Car, Gar, Tar), the G
  pull on the EMOL, and trap or **long trap ("log") of the EMOL** at named
  holes (p. 37). "Sammy" (p. 32) tells a pulling guard that the Sam is on the
  line as force.
- **Protection** (pp. 38–51): area, slide and sort calls built on a center
  "point". The center drops a plumb line and points to the first
  linebacker-type inside-out (Ringo/Lucky, Roger/Louie). Rip/Liz is a
  Mike-point protection with most-dangerous-man rules past the point.
  Ralph/Lester and R/L are five-man slides for overloads. The QB can "flipper"
  (flip) the call; the back scans for the fifth rusher. There are man/area
  calls too (Stick, Bang, Fan, Hard). The tackle away from the slide watches
  a 3-technique loop.

**Name collisions.** RIP/LIZ is a protection call in both the spread playbook
(an RB-declared direction) and the Browns manual (a Mike-point area scheme),
but a coverage strength call in Saban-family defenses. "H (over)" is a formation modifier,
not the Over front. HonestNFL's term finder records similar collisions; keep
source terms in records and map them to engine ids explicitly.

## What the NFL run installs give us

Cowboys run install, the Shanahan file (really the 2015 Falcons) and the 2022
Rams offense. Physical pages; our wording. The Cowboys cards use Rams-style
calls without definitions; rules decoded with the Rams glossary
(pp. 106–127) are reasonably interpreted.

- **Double-team release:** no book gives a trigger (time, backer depth or a
  named keeper). Combos are named by pair, down lineman and a *pre-snap
  declared* linebacker: "[pair] on [DL] to Declared LB" (Falcons pp. 742–747;
  Rams pp. 117–120). The target is shifted by Push/Pull (Falcons p. 745) or
  Pulse/Shove (Rams p. 126). Release speed follows the declared backer's
  leverage: "Tite" = the backer behind the DL, "Rico" = stacked or playside,
  and on Rico the playside man "will be quick off combo" (Falcons pp. 743,
  746). Chip-then-climb: the center "chips DT then climbs for Sam" (Falcons
  p. 751). Rams "Chip Double" has the PST "stab and slam the 3 Tech" (p. 118),
  like Browns "Rake". HonestNFL HNFL-320 (Duo): "surface the block to
  displace the DL, then climb."
- **Back alignment and track (under center unless noted):**
  - *Outside or wide zone:* 7½ yd; aim at the outside hip or leg of the TE
    (a ghost TE when weak); key the EMOL; one cut (Cowboys pp. 6, 35;
    Falcons pp. 177, 184). The Rams track the D gap (p. 233).
  - *Inside or tight zone:* 7½ yd, a 6-inch lead step to the inside hip of
    the PSG, read the first covered lineman playside (Cowboys p. 19). The
    Falcons attack the inside hip of the playside tackle (p. 200), as does
    HonestNFL HNFL-126/127. Rams from the gun: the inside leg on the guard's
    outside leg (p. 305).
  - *Duo:* track the B gap and read the first playside linebacker (Rams
    p. 329). HNFL-319/321: 7 yd, aim at the PSG's outside leg.
  - *Power:* 7½ yd, aim at the inside hip of the PSG, "press A gap; if no A
    gap, read pulling guard"; from the gun, straddle the guard's outside leg
    (Cowboys p. 166).
  - *Counter:* aim at the inside hip of the PSG (Cowboys p. 170); the Rams
    read the trapper, then the wrapper (p. 346).
  - *Toss:* "chase outside hip" of the FB or puller (Cowboys pp. 240, 248).
  - *Draw:* "Heels at 6" (Cowboys p. 162).
- **Line splits and depth:** the Rams use the Browns template with a 2 ft
  normal split, 3 ft wide and 6 in tite (p. 109), and the same three depth
  levels (p. 108). The Cowboys tie the depth level to the concept: level 3
  (deepest) for wide zone, level 2 for tight zone and duo, level 1 for gap
  plays.
- **Gap schemes:** on Cowboys Post (power), the BSG pulls "for No. 2" and
  wraps for the first defender inside, and the BST hinges (p. 166). On Load
  Power the FB kicks the EMOL and the puller takes the "1st opposite color"
  (pp. 236, 265). Falcons power: the FB kicks the first defender outside the
  TE, the center blocks back and the BST hinges (pp. 304–305). Cowboys
  counter: the guard kicks the EMOL and the FB or Y wraps for the first
  linebacker (pp. 170, 174).
- **Not given anywhere:** release timing, pistol depth, bang/bend/bounce
  criteria, and lineman step and pull mechanics.

## What the Ravens OL manual gives us (run game)

A PowerPoint export titled "94 - OL Individual Section" (created 2018,
120 pp., text layer). A technique manual: it states footwork, landmarks and
the double-team release rule. Physical pages, our wording, short quotes.

- **Stance** (p. 8): guard stagger, kick toe to the midpoint of the post foot;
  tackle stagger, kick toes to the post heel or deeper; at most 20% weight on
  the down hand; "We cannot tip run or pass." Two-point stance for tackles to
  an open end, in two-minute and in the gun.
- **Splits** (p. 8): lateral *normal* 18 in, *tite* 1 ft (goal line and short
  yardage), *wide* 2–2½ ft (game plan). That is about a foot narrower than
  the Browns (2½ ft) and Rams (2 ft) templates; systems differ. Vertical:
  "Off" = eyes through the center's beltline (normal), "On" = down hand on the
  center's toe, "Crowd" for goal line.
- **Drive block** (p. 9): "2 Step Down, Strike", with the second step on the
  ground before contact.
- **Outside zone** (pp. 17–18): 18-inch splits, aligned off the ball.
  Landmarks: covered man the DL's playside armpit, uncovered man the middle
  of the DL. **"Usually 3 step timing on Zone combos up to 2nd level."** The
  uncovered man watches the linebacker peripherally and overtakes the DL; if
  there is "no color of DL to overtake by 3rd step", he feeds the DL over and
  drives up to the linebacker's playside number. If the DL hangs inside, the
  roles flip: the covered man feeds the DL inside and drives to the
  linebacker, and the uncovered man overtakes the DL. Back: 8 yd, timing
  step, landmark the outside butt of the (ghost) TE, read the first DL
  outside-in to the next DL inside, press the line, one cut.
- **Inside zone** (p. 20): the covered man takes a lateral or lead step to get
  his helmet past the DL's midline; the uncovered man keys the DL's head for a
  slant or pinch and works straight up to cover the linebacker square. If the
  DL hangs inside, the uncovered man one-hand feeds him to the covered man;
  if the DL plays toward the uncovered man, the covered man carries the DL
  down to him.
- **Vertical double team** (lead and power, p. 33; drill p. 102): both
  blockers "Eyes off hip of DL for LB"; **"LB to Me – Feed (push) DL to
  partner and climb LB square. LB Away from Me – accelerate feet to drive
  eyes across and overtake DL."** So whichever blocker the linebacker flows
  toward climbs, and the other keeps the DL. The drill asks for "4 hands to
  defenders chest".
- **Gap scheme backside** (p. 30): the covered man slams the inside half, then
  works through the heels of the next DL inside to the backside linebacker.
  "Always block PSLB run through and force BSLB over top."
- **Power pull** (p. 31): a 1-foot step with the backside foot to the crotch
  midline, crossover with hips square, "Eyes on Mike LB", enter vertically
  through the first hole past the PSG and block the linebacker's inside
  number; the puller must know whether the guard is covered (Over) or not
  (Under). Pulling points (p. 119): step in the direction of the pull, low
  plane, dip the inside shoulder at the turn, accelerate on contact.

## Extraction record

```yaml
source: FootballXOs spread offense playbook
url: https://www.footballxos.com/footballxos-spread-offense-playbook.pdf
page: 66                       # 1-based physical PDF page
type: installation | manual | clinic | breakdown | secondary
confidence: directly_seen | reasonably_interpreted | disputed
system: spread (FootballXOs)   # whose rule this is
scheme: power (gap)
role: C                        # source role, then engine slot
engine_slot: C
trigger: nose head-up | uncovered | weak shade
assignment: block man on | block back to replace BSG
branches: …                    # front, shade, slant, motion, flow
coordination: …                # combo partner, exchange, release evidence
not_specified: release evidence, footwork distance, contact force
engine_anchor: src/sim/behaviors/blocking.ts planRunBlocking
reproducer: scripts/diag/run-plans.ts i_pro_21 power under
```

Per the [handbook's chain](../football-handbook/README.md#how-to-turn-a-teaching-point-into-an-engine-change),
a record fixes the *installed responsibility* and the *cue* that changes it.
Technique, achieved movement and contact belong to the controller and physics
layers.

## Checked questions

Answers given to other sessions, kept here so they are not re-derived.
Technique numbers follow the Browns OL manual p. 11: 6 = head-up on the TE,
7 = inside shade, 9 = outside shade.

**4-3 Over strong side against an inline TE (2026-10-21, for the run-defense
session; corrected the same day).** The question: is our Over map (DE_S at 6,
Sam at 7 off the ball) supported?

- *Strong end:* **head-up (6) in the NFL team installs.** Colts p. 77: "Over
  Front = 3 Technique & 6 Technique to Closed Call. Shade & 5 Technique
  away", moving to a 9 against a pair of TEs (p. 79). The Seahawks
  Over-family diagrams agree, and against motion: "STAY IN 6 TECH" (p. 85).
  The first answer said "not head-up", from HonestNFL HNFL-129 (a generic
  recognition sheet, read as a 7) and the generated textbook (p. 29, "strong
  5-tech"). The team installs outrank both. Confidence: high for these
  installs.
- *Sam:* Colts p. 77, "Vs. single TE align at LB depth in a 90", i.e. outside
  the TE at linebacker depth, tightening to the line head-up on a wing. The
  Seahawks put the Sam weak and the strong safety down outside the TE (p. 5).
  Neither stacks him inside at 7. Confidence: medium-high.
- *Under, the more common base front:* Colts p. 6 has the strong end at 5 and
  the Sam on the line at 9 ("Tough" = 4 technique). Ravens p. 98 has "Sam - 9
  Tech", "End - 4 Tech or Heavy 5". Seahawks p. 121: "ROCK SEATTLE IS A BASE
  UNDER FRONT". The Colts book has about 4 Over call sheets against about 50
  Under, so a head-up strong end should be uncommon in league tracking even
  though Over itself uses a 6.
- *Nickel:* the Colts and Ravens use Plus (9 and 3 closed), Flex (6 and 3
  closed) and Rush (9 and 3 closed, 2i open) (Colts p. 5; Ravens pp. 12–17).
  The Colts "Auto" call (p. 13) picks between them by the back: "Any Dot or
  Far RB = 9 Tech", "Any Near Back = 6 Tech". HonestNFL HNFL-081/082 show
  the same Cheat/Flex split, with Flex labelled "Over family for run downs".
