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
| **Second Drive batch** (user-shared folder, same link; files kept outside Git) | Downloaded with the share link | Mostly attributed team material; identities from file names unless noted | |
| ↳ 2018 Ravens OL individual manual (PowerPoint export "94 - OL Individual Section"), 120 pp. | Text. SHA-256 `ae9b206e287656edccd0c8cec1bb7555f7abe628b62172d272de8540573b33bf` | Stance, splits, zone/gap technique, the double-team release rule, full pass-protection system | **Read** (run and protection sections above) |
| ↳ 2012 Ravens QB manual, 111 pp. | Text. SHA-256 `ed2a3dd004bb9d1c139c15269581ac38e2389e0cea33cb0aef519599d277414a` | Drops, read families, per-concept keys, coverage recognition | **Read** (section above) |
| ↳ **Generic file name:** 2022 Dolphins offense ("MIAMI DOLPHINS 2022" on its pages), 433 pp. | Text. SHA-256 `15137d3620e6087f10b8a0f4356f6fde97da4af021476cd3b681e37d7b3550b7` | Full install: formations and motion, zone/gap combinations, RB landmarks, protections, route tree | Indexed; top pick for offense |
| ↳ 2022 Jaguars pass concepts (17 families), 108 pp. | Text (from a scan). SHA-256 `18b815143f33d2954a490be0ff1b3d3ee8e069593926973cf4fcdeffb7d3a996` | Route depths, break angles and option rules (e.g. Outback: vertical stem to 14 yd); QB reads by coverage | Indexed; top pick for routes |
| ↳ 2016 Colts defensive call book (team inferred from opponent tags), 579 pp. | Text. SHA-256 `25b0224450b6f3209599bebb6f9cc22eb46a42b911a8228728e251e9807cdb7f` | DL techniques per call; coverage match rules by formation and motion | Indexed; top pick for defense |
| ↳ 2012 Raiders defense (inferred), 319 pp. | Text (diagrams are images). SHA-256 `aed35d8f505844614be3f315d11a479f97d1e3a6c9a007a673ddb9309dd7b888` | Alignment / key / responsibility tables per position, with depths | Indexed |
| ↳ 2012 Packers pass install (GB cover logo), 511 pp. | Text. SHA-256 `0405d7391b33d7b56073f74473a21f98f2278d4bdd67e69eacc2f2e00b253d42` | Concepts with depths and coverage conversions; box count and shell rules; red-zone and third-down menus | Indexed |
| ↳ 2019 Browns offensive reference, 171 pp. | Text. SHA-256 `99a20b65186fe0eec90b8c86c080915a306ffbbd28085b7538caef6c3118a120` | Route tree and concepts; protection vs. labelled fronts | Indexed |
| ↳ 2015 Texans Cover 1 manual and game-plan calls, 149 pp. | Text. SHA-256 `4c92a89a7adc58de60e33e213a89707158db2ec20f1fff00360575b0cdc439ea` | Man-coverage rules; five-man pressures | Indexed |
| ↳ 2015 Falcons coverage adjustments, 45 pp. | Text. SHA-256 `cab8c5025703d2573638611a55df82b495d9992fc2afbda41dc71f52f60d4ec0` | Motion and formation checks; zone/match rules | Indexed |
| ↳ 2013 Jets defense (Rex Ryan), 217 pp. | Text (noisy OCR). SHA-256 `398122f98e7983cf379a9a09e66f33088fcb2c14ebb324077781a3fcb8f49aa8` | Front-setting rules; rush games | Indexed |
| ↳ **File name omits the side:** the same 2013 Jets **defense**, color scan, 190 pp. | Scanned. SHA-256 `f0ef31fb9f2ec82ef9a8aee28a92508717376c362cb7f8d479945134f6b62c04` | Clean diagrams of fronts, games and coverage calls | Indexed |
| ↳ 2020 Bills situational install (inferred), 79 pp. | Partial text. SHA-256 `20f565f8e79923cd4886e346d681033ed28df7623c888ae18f6cb1881ca94275` | Low red-zone play mix | Indexed |
| ↳ 2020 XFL Dallas Renegades offense (unverified), 28 pp. | Text. SHA-256 `48f0e46cb3fcc7e0b3f548fbff53e42eb6ba1e6e5271b6715c8e1adc2d7a4339` | Compact Air Raid concept rules | Indexed |
| ↳ 2013 Patriots defense (handwritten notes plus printed sheets), 370 pp. | Scanned. SHA-256 `56df7ab32ebad4add453562c17529120ec3a1864d18760a8d22c7d3d81be0061` | Coverage checks by formation | Indexed (light) |
| ↳ 2015 Dolphins pass concepts, 93 pp. | Scanned. SHA-256 `624a54bb94566e5365c4def06aa0f1241b682d64fc02c4a43cb788ddaa1ca5a2` | Route technique; QB reads by shell | Indexed (light) |
| ↳ 2016 Patriots offense (inferred), 344 pp. | Scanned. SHA-256 `905c5781a2720e45e611bab139b32168b824ec3234327e11b3c413078572d9a3` | Formation splits; run blocking vs. fronts | Indexed (light) |
| ↳ 2017 Fangio defense (team inferred Bears), 194 pp. | Scanned. SHA-256 `d4af15db00a5773f8e5beb81f5b560e3350068e7036e4610e7e5c803831bfc95` | Quarters/match rotation rules; DL games | Indexed (light) |
| ↳ Lions defense (2017 per file name), 214 pp. | Scanned. SHA-256 `96661181149c7098745052a98d00245157d27f97fa55ded5779e3b990a1708dc` | Alignment/key/responsibility with depths | Indexed (light) |
| ↳ 2018 Eagles training-camp installs, 52 pp. | Scanned. SHA-256 `3960aaeeb8ed6cea2320004912054b4416dc0e24cb202b4b8ae35a815f0444e8` | Gap-scheme blocking vs. labelled fronts | Indexed (light) |
| ↳ Buccaneers defense, Tampa-2 era (year unknown), 73 pp. | Scanned. SHA-256 `be0bae688ebb103f5f6edabaeaf02ebd21f7b399ef44809173db54d2c5658b3d` | Front technique table; zone landmarks | Indexed (light) |
| 1999 Buccaneers DL manual (Dungy/Kiffin), 62 pp. — user-supplied | **Scanned**; OCR'd page by page for reading. SHA-256 `bc950ad4c904dd753a4435420153d47115240c3caf2e5c497480a391c87aec80` | DL philosophy, get-off, run rules, alignments, block reactions by position, pass rush, nickel games | **Read** (block reactions; section below) |
| Dallas Cowboys 4-3 Over Stack LB fits, 6 pp. (user-supplied) | **Scanned**; OCR plus diagrams. SHA-256 `757f9998bbcf41099b5e4c8ebcfeb7d7469c7256e881637b5f15ea5f4d03e68d` | LB alignment, depth, keys and fits per play | **Read** (section below) |
| Georgia Military College "3-5-3 LB Fundamentals" (2009), PowerPoint | Text. SHA-256 `f20ab13bfe5c52b6a324d6a82bbc751f29eb1afcc8e648479dbbe33ef1199b05` | College 3-5-3 LB stance, depth, OL-block keys | **Read** |
| Jon Svec, "Linebacker Toolbox 2.0" (2024), 55 pp. | Text; copyrighted book (paraphrased only). SHA-256 `4bc060b59eb420eeb716e9a9cff4ea352df8be3210070cd9076bf356cc5b3b86` | LB movement, reads, block defeat, tackling; no numbers | **Read** |
| Mike Walker, "Coaching Defensive Linemen", 28 pp. | Text. SHA-256 `1053505832cc850b952233e636d18480895faaff55209db7337c65ca517dfca3` | DL stance, block reactions, pass rush (high-school coach) | **Read** |
| Notre Dame DB manual, 39 pp. (Holtz era by inference) | Text. SHA-256 `05ed0c801cc7d67da13293aed9af518d4cab4759571770f2d188b841b66434c1` | DB alignment, pedal, man and zone technique with numbers | **Read** (section below) |
| Patrick Daberkow, "Developing Defensive Backs" (Concordia), 23 pp. | Text (slides). SHA-256 `bc9362d9a8020e20440b53bbf10d02f5bf20e3b8129d44e427d67724adcbba15` | DB stance, transition, ball skills | **Read** |
| "HonestNFL.zip" (user's Drive) | 403 images | The same set already in `docs/references/honest-nfl/` (names and sampled hashes match the catalog) | Nothing new |
| "Coaching the Defensive Line" (Drive), 156 pp. | **Scanned**; OCR'd. SHA-256 `5c06b8641d9b0bd0c610bcaad25f0068c133aa29d5a2ba6d4ddb781f44884e29` | DL book | Being read |
| McKendree College WR manual, 37 pp.; "FUNDOS REC 2015", 13 pp. | Scan (OCR'd) / text | Receiver technique | Being read |
| Links from the user's resource list: Coach Allen DL and LB manuals; 2014 Michigan LB, rush-end and DB manuals; 2009 Texas A&M WR drill book; 1999 Ravens and 1998 Rams DL manuals (scans); 2016 Oregon LB (diagrams); Olivadotti "Coaching Pattern-Read Coverage" (copyrighted, paraphrase only); USA Football and AFQ articles | Downloaded; most have text | DL, LB, DB and WR technique | Being read |
| [Other footballplaybooks.net items](https://footballplaybooks.net/document-tag/nfl-playbooks/) | **Locked** behind an email/sign-up gate | Attributed team material | Needs the user |
| [2014 49ers (Roman) preview](https://pdfcoffee.com/2014-49ers-greg-roman-playbook-pdf-free.html) | HTTP 403 through the proxy | Marked "Confidential Property" | Not used |
| [FootballXOs offense clinics](https://www.footballxos.com/downloads/offense/?cp=2), [NDSU run-fit analysis](https://www.footballxos.com/how-north-dakota-state-executes-their-run-fits/) | Public pages | Clinic and analysis articles | Good next reads for zone technique and fits |

## Reading map

| Engine question | Read first | Then |
|---|---|---|
| Run-blocking assignments by front (`planRunBlocking` in `src/sim/behaviors/blocking.ts`) | [Run-blocking assignment audit](../reviews/run-blocking-assignment-audit.md); spread playbook pp. 62–64 trap, 66–68 power, 83–85 counter; Browns OL manual pp. 19–37 | [Trenches](../football-handbook/trenches.md), [moving run-game footwork](../football-handbook/moving-run-footwork.md); zone clinics |
| Run fits and fronts (`FRONTS` in `src/playbook/defense.ts`, `src/sim/run-fits.ts`) | HonestNFL run-defense and fronts sheets | Cowboys Over Stack fits and NDSU article, if the user approves them |
| Protection declaration (`ProtectionCoordinator`) | Browns OL manual pp. 38–51; spread playbook pp. 94–99 | [OL protection textbook](offensive_line_protection_textbook.pdf); HonestNFL protection sheets |
| Coverage checks | [Coverage rules source audit](../reviews/coverage-rules-source-audit.md); [HonestNFL concept guide](honest-nfl/CONCEPTS.md) | 2008 Alabama, only if the user decides the rights question |
| OL splits and depth off the ball (offensive alignment) | Browns OL manual pp. 9–10 | Spread playbook pp. 41–42 for back depths |
| Formations, motion and strength (`Formation`/`Split` in `src/playbook/types.ts`, `src/sim/called-motion.ts`) | Spread playbook pp. 11–50 | [Playcalling and schematic packages](../football-handbook/playcalling-and-schematic-packages.md) |
| Which fronts a play avoids (play-caller `beats`) | Spread playbook pp. 53, 63, 67, 84 | — |
| Route definitions and QB reads | Jaguars 2022 pass concepts; Ravens QB manual pp. 75–107 | Packers 2012 install, Browns 2019 reference |
| Defensive calls, fronts and coverage checks | Colts 2016 call book; Colts 2017 and Ravens 2020 installs | Raiders 2012 position tables, Falcons 2015 adjustments, Texans 2015 man rules |
| Whole-offense install (formation, motion, run, protection) | Dolphins 2022 ("FULL PLAYBOOK copy") | Cowboys run install, Rams 2022 |

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

## What the Ravens OL manual gives us (pass protection)

Pages 42–91 and drills 105–113 of the same manual. The engine's
`ProtectionCoordinator` re-matches blockers to rushers each tick; the
manual instead **declares who blocks whom before the snap** and names an
answer for every rusher the line does not block.

- **Launch points** (p. 48, also p. 43): Quick (3-step) at 4½ yd, Firm
  (5-step) at 6½ yd, D (7-step) at 8½ yd. Run action adds a lateral spot,
  e.g. "8½ yards over PSG" (pp. 50–52).
- **Set angle** (p. 46): flat (22°) for quick protection, 45° on the callside
  of run action, angle (70°) when the turn comes to you, vertical for man and
  pocket protections. **Set footwork by DL alignment** (p. 45): inside shade =
  post/kick, head-up = post and hold the kick, outside shade = kick/post, a
  defender off the pad = set by protection and launch point. Stay square until
  the rusher clears your outside hip; hands above the elbows (p. 44).
- **Mike declaration** (p. 54): against a four-down front the Mike is the
  middle of the three linebackers by count from the strength call; against
  three down, Mike and Jack are the inside two. The center makes the call
  (p. 66); the QB can redeclare right or left ("Roger"/"Louie", pp. 49, 87).
  Base: the five linemen take the four down linemen plus the Mike, and the
  backs take the remaining linebackers. Dual (pp. 58–59): the line takes the
  four down linemen plus Mike and Sam (or Will), and one lineman blocks "the
  1st 2 of 3" (p. 68). "Big Dual": the tackle sets vertical and takes the near
  linebacker or the end, whichever comes (p. 69).
- **Turn and full turn** (pp. 70–83): backs block to the call and the line
  turns away. The turn "starts with 1st uncovered inside" (p. 71); each
  lineman takes the gap outside him and the last man takes the declared
  defender. "Always block any defender that rushes through your gap
  responsibility" (p. 79). A full turn starts with the playside tackle and
  blocks every rusher to the backside out to the widest. On a full turn the
  back does not scan and the QB never redeclares (pp. 51, 75–76).
- **The unblocked rusher always has a named answer:** the back scans to #4
  ("#4 Late = H scan to #4", p. 73), or a sight or hot read ("SITE vs Will +
  #4", p. 56; "HOT = Off 2 of 3", pp. 61, 73; "HOT vs 2 Outside OT/TE",
  p. 77). With a slot away from the call and a linebacker possibly topped by a
  DB, "if in doubt … always turn to the slot" (p. 80). When an edge defender
  shows in a force position, a "Lawn"/"Rake" call redeclares (p. 80).
  Against Solid or Bear (all three interior linemen covered), base and dual
  protections go "5 Down" and turn protections usually switch to a full turn
  (p. 86).
- **A gaps** (p. 47): "In" vs. "Hard" calls decide who takes an A-gap mug;
  quick protection is always "In". **Twists:** "Zone off Twists / Games"
  (p. 81); "Don't chase loopers" (p. 85); flatten the crossing defender and
  pick up the looper (p. 112). No page gives punch timing in seconds.
- **Screens** (pp. 88–91): the inside screen blocker's landmark is 3 yd
  outside the TE.

For the engine, a weak-side free rusher means the declaration left a rusher
unaccounted for. In this system that is a declared hot or sight
responsibility, or a missed scan. Telemetry should tell those apart from a
blocker who lost his man.

## What the 2012 Ravens QB manual gives us

111 pp., text layer; title page "2012 BALTIMORE RAVENS QB MANUAL". Contents
(p. 2): philosophy, preparation, system (cadence, audibles, run checks),
technique (drops pp. 44–45, passing pp. 46–47), drills, reads and
progressions (pp. 75–78), 24 route concepts (pp. 79–107), coverage
recognition (pp. 108–111).

- **Drops** (pp. 44–45): before the snap, shift 80–90% of the weight to the
  pivot foot. Three-step is "a one step drop with two 'stopping steps'",
  planting on step three with no hitch for timing routes. Five-step depth is
  "6½ - 7 yards", either with a hitch or planting on time for timing routes.
  Seven-step is 3 acceleration steps, 1 sustained and 3 stopping steps at
  about 8½ yd; no seven-step from the gun (p. 65). These match the OL
  manual's launch points (4½ / 6½ / 8½ yd).
- **Timing words, not seconds:** the go route is thrown on the hitch, never
  held (p. 71); seam throws go 18–22 yd (p. 70); "windows open and close
  rapidly", so throw with anticipation (p. 55). No page gives a time or
  trigger for moving to the next read.
- **Pre-snap process** (pp. 52, 108–111): a walk-to-line checklist of front,
  linebackers, safeties, corners, audible and hot/sight receivers. Disguise
  shows in defenders' eyes, depth and width (p. 109). Audibles avoid a bad
  play rather than chase a better one (p. 8); four kinds: Alert, Check, Kill,
  Opposite (pp. 31–32).
- **Read families** (pp. 74, 77–78): Straight, Right/Left, High/Low, In/Out,
  Triangle, 1A-to-1B and "Is He Open". Each concept names its key on
  pp. 80–82: Stick reads the flat defender, Middle Read reads the open or
  closed middle plus safety leverage and Mike depth, Verticals read the
  safety, Smash and Delays take the best-look side, Naked reads the contain
  player.
- **Pocket and mechanics** (pp. 46–47, 71–72): feel the rush rather than look
  at it, slide compactly, never square the shoulders to the line; hips before
  shoulders, about a 45° shoulder turn, step to where ball and receiver meet.

**Compared with the engine** (`dropSpec` in `src/sim/behaviors/qb.ts`):
under-center depths are 5.0 yd quick, 8.0 yd five-step and 9.5 yd seven-step,
which its comment ties to tracked QB depth at the throw (median 7.9 yd). The
manual's launch points are about a yard shallower. A launch point is where
the drop ends; tracked throw position also includes any hitch, climb or drift
and the shotgun's deeper start. So compare like with like before changing
anything.

## What the Running Back Technique Book gives us

User-supplied, 21 pp., Word document (2019, author field "Anthony"), SHA-256
`a02320982e7b93dc614a58b2fcb8aa0295c73865f8ab3caece627fae8d0d383f`. It uses
the Cowboys run install's play names (Slash 36/37, Ride, Jab), so it is
probably the same system; authorship is not verified. It is the most
explicit source on the **runner's reads and cut decisions**.

- **Inside zone** (pp. 12–13): 7 yd (heels or toes by tempo);
  open-crossover-roll with the shoulders square on the third step; aim at the
  B gap; read the first down lineman head-up to playside, then the backside
  down lineman. Cut mix to drill: jump cut about 60% (the primary read
  crosses your face), cram cut 30–35% (stay on track), bounce about 10%
  (feel the 4 or 5 technique spike). Against a backside 6 or 7 technique,
  watch for the backdoor cut.
- **Outside zone** (pp. 14–15): drop step opposite, then a **five-step
  rhythm**. Know the cut by step 3, make it off step 5 (outside foot), and be
  at the linemen's heels or a yard behind the line on step 5. Aim at the TE's
  initial alignment. Read the playside end: a 9 means the ball won't reach the
  perimeter, a 6 means it is probably going inside, a 7 means it probably
  reaches the perimeter. Then read the next down lineman, and feel for the
  wind-back.
- **Power and counter** (pp. 16–18): drop step opposite, aim at the A gap,
  enter A/B/C "inside the wrapper" and never the D gap; adjust tempo to the
  puller's speed. Counter: shuffle-gather, read the fullback, and come
  outside when the EMOL spills.
- **Duo, sprint, toss, draw, misdirection** (pp. 18–20): duo reads the Mike's
  flow; sprint aims 2 yd outside the TE and reads the puller; toss keys the
  force player; draw aims at the playside guard's butt and reads his
  technique; misdirection aligns at 8 yd.
- **Contact and protection** (pp. 4–10): flat-back entry, "take half a man",
  feet running on contact; RB pass protection closes space toward the line,
  aims at the rusher's inside number, stays square and punches and recoils.

## What the 1999 Buccaneers DL manual gives us

A 62-page scan (OCR'd; quotes are from OCR, checked for sense). It is the
defensive counterpart to the Ravens OL manual: for each position it gives
the stance, alignment, key, run responsibility and a reaction to every block
type. Physical pages.

- **Get-off and keys** (pp. 5–6): crowd the ball ("credit card" alignment),
  go on ball movement, not sound; the first step attacks the near shoulder of
  the blocker; "Key head of the lineman you're on"; "get your hat in the
  crack" and play your gap.
- **Alignments** (p. 8): 9, 6 (stack), 5, loose 5, 3, 1; "Loose 5 can turn
  into a 6 tech". The under end's **loose 5 is "one yard outside tackle"**,
  keyed on the tackle's head (p. 24).
- **Run responsibility:** the 1 technique has the A gap, squeezing the A gap
  when the run goes away (p. 9); 3 technique the B gap, squeezing and
  releasing to A (p. 13); 5 technique the C gap, releasing to B (p. 18); the
  7 technique (stack end, inside shade of the TE) has the C gap, "power
  through TE block" (p. 28).
- **Reactions:**
  - *Reach/hook:* flatten the blocker on the line and keep outside leverage
    (pp. 13, 18). Against an outside-cylinder hook, wheel back door and
    replace the linebacker. From a loose 5, "widen and give ground … can never
    be hooked" (p. 24).
  - *Scoop/zone combo:* get in the seam, "make guard push you into the play
    (hold on to center as long as you can) … can not allow center off on LB"
    (pp. 9, 14, 21).
  - *Double team:* drop the hip, turn the shoulder to the second blocker and
    split it, staying low.
  - *Down block:* "DOWN BLOCK = TRAP!": redirect, close and spill the trapper
    with the upfield shoulder; the guard's course tells trap (flat) from BIM
    (deep), and "if in doubt, play trap" (p. 23).
  - *Cutoff:* squeeze the blocker inside, protect your gap, shed when there
    is no threat.
  - *Pass and draw:* "High hat = pass!" Rush in your lane; against a draw set,
    retrace your steps and divert the back.
- Also present, not yet summarized: rush principles and moves (pp. 29–39),
  tackling (p. 40), and nickel/dime fronts and games (pp. 57–62).

## Defensive line: more block-reaction sources

Coach Allen DL manual, Mike Kuchar's two USA Football DL articles, the 2014
Michigan rush-end manual, and Fritz Shurmur, *Coaching the Defensive Line*
(Harding Press, 1997; ISBN 0-9624779-8-2), a 156-page scan from the user's
Drive (book page = scan page − 15). Shurmur numbers techniques differently:
5 = head-up on the tackle, 6 = outside the tackle, 8 = head-up on the TE.

- **Reach, the main split:** one-gap programs flatten and stay outside.
  Allen: "PUSH & PRESS: Used on Reach or Zone Blocks … throw hips outside"
  (p. 4); Kuchar: a fast second step, push with the outside hand and pull
  with the inside; Michigan: "Do not run outside" while steering the blocker
  outside (p. 10). Shurmur's two-gap tackle instead keeps going upfield
  against a flat-step reach and **exchanges gaps with the linebacker**, never
  getting doubled off the reach (book pp. 33–39). That gap exchange is the
  only replacement rule any source gives for a reached lineman.
- **Base:** play body on body and shed only when the ball commits (Kuchar);
  keep knocking the blocker back until the carrier picks a side, then throw
  him the other way to shrink the cutback (Shurmur book p. 23).
- **Scoop and double team:** play the scoop like a reach and "get skinny"
  (Kuchar) or let it knock you inside (Allen, "ricochet"); against a double
  team, drop the pressure leg when the second blocker arrives (Kuchar) or
  turn narrow and split (Shurmur book p. 126).
- **Down, trap and kick-out:** close to the down blocker's hip, which warns of
  the kick-out (Michigan pp. 10, 18). Shurmur squeezes ½–1 yd into the
  backfield, meets a puller about 1 yd deep, and rejects the wrong-arm that
  Kuchar teaches (book pp. 27, 36, 41–42).
- **Pass vs. draw:** a tackle who shows pass but gives no ground is blocking a
  draw (Michigan). **Boot:** linemen not crossing the line ("elephants on
  parade"), with the tackle's helmet inside but not downfield (Michigan).
- **Alignment numbers:** Michigan's 5 sits 18 in outside the tackle beside a
  1-technique and 24 in beside a 3-technique; Shurmur's wide 6 sits at 1.5 yd.
- **Stunt timing:** Shurmur runs games quick, delays only after crossing the
  line and against seven-step drops, and picks the first or second man by how
  the guard and tackle set (book pp. 98–105). Michigan's loopers take 1–2
  steps (pp. 27–28), the Bucs three. An event trigger with a minimum step count
  covers all three.

## Linebackers: depth, keys and fits

- **Depth: heels at 5 yd.** Cowboys Over: "SAM - Nose to outside eye of OT;
  heels at 5 yds", "MIKE - Stack on 1 tech (weak); heels at 5 yds" (tighter
  against an influence-trap team), Will's inside foot on the end's outside
  foot, heels at 5 yd (p. 1). Georgia Military College: "LB HEELS ARE AT 5
  YARDS FROM LOS" in base fronts (slides 3–6). This Cowboys Over keeps the Sam
  inside; the Colts Over puts him at "90", outside the TE.
- **Keys and flow** (Cowboys p. 2): "1. TAILBACK OR NEAR RB 2. 2ND BACK
  3. GAP RESPONSIBILITY", and see pullers through your gap. *Full* flow
  (cutback threat; inside zone, power, iso): the backside linebacker
  shuffles for the cutback. *Fast* flow (no cutback; toss, outside zone): "ALL
  LB'S CROSS-OVER AND RUN; MIRROR RB'S". *Counter*: outside linebackers go over
  the top, the Mike bores under the down block. Kuchar (USA Football, 2018)
  reads the playside guard, then the near back: *tight* = attack and shock,
  *full* = shuffle and press the next window, *fast* = open up and run,
  *split* = shuffle then rock step on seeing a puller. GMC reads blocks first
  ("guard to near back"): down/out = shoot B, down/down = shoot C, pull =
  "attack the down".
- **Cowboys Over fits** (pp. 3–6): gap labels Sam "CA", Mike "AB", Will "BD"
  (first letter for plays strong, second for plays weak, read from the
  diagrams). Inside zone strong: Sam C, Mike strong A, Will beats the tackle
  to weak B for the cutback. Outside zone strong: all cross over and run.
  Counter strong: Sam spills the puller, Mike bores under, Will plays the
  spill. Play-action cue (p. 5): on waggle the fullback's path is "deeper and
  much faster"; a TE releasing instead of down-blocking turns the Mike's zone
  drop into man.
- **Commitment and block defeat** (Svec, Linebacker Toolbox 2.0; paraphrased,
  no numbers): movement rises from shuffle to scrape to shoot only when
  leverage on the back is lost; read the center–guard–tackle triangle before
  the backfield; come off a controlled blocker when the ball carrier
  declares; pursue as front-hip and back-hip defenders, with a curved
  "banana" angle on a back moving away.

- **More programs** (Coach Allen LB manual; AFQ "Inside Linebacker Play &
  Progression", Vanatta, 2006; 2014 Michigan; 2016 Oregon):
  - *Depth:* Allen "Toes at 4 yards from LOS", backing up a full step on
    twist calls (p. 4); Michigan's key drill is "5 yards deep" (p. 77). Across
    programs that is 4–5 yd.
  - *Reaction by guard action* (AFQ, keying guard → back → third threat):
    down → "step away and play downhill"; base → "step away and attack hard";
    pull → step with it and read the back's flow; zone → step with it and work
    up a level; scoop → short step, then read the back (a false key); pass →
    false step and drop. In Michigan's key drills (pp. 78–81), power and
    counter draw the same linebacker path because he follows the pulling
    guard.
  - *First step:* Michigan's is "always forward … at a 45°" (p. 7); the
    Cowboys, AFQ and Svec teach a shuffle or read step. Treat it as a
    system choice.
  - *Against pullers and lead blockers:* Allen and AFQ squeeze ("reduce &
    rip": inside foot and shoulder into the block, rip inside); Michigan meets
    them on the offense's side of the line and turns the blocker's nose to the
    sideline (pp. 8, 15); Oregon decides over or under the puller by a
    pre-snap call ("Overlap", "Backer", p. 34). With the Cowboys' spill on
    counter, spill vs. squeeze is a defensive call, not a fixed rule.
  - *Pass:* hold for run until the ball passes the deepest back (Allen p. 4);
    Michigan reads the QB's depth, shoulder and hand (p. 13). Hook-curl drop
    depths differ by program: 8–10 yd (AFQ) vs. 12–15 yd (Michigan p. 45).

## Defensive line pass rush and stunts

From the Bucs manual (pp. 29–40, 57–62) and Walker; physical pages.

- **Move by the tackle's set** (Bucs pp. 34–36): read the set (short, deep,
  "lunger"); quick move against a short setter, inside move against a fast
  setter; power rush only once or twice a game. Ends start with a speed rush
  along the tackle's set line; if he oversets, "plant your outside foot hard
  and club him out"; if he floats, bull rush; if deeper than the ball, spin
  or club back. Every move finishes with a swim or a rip.
- **Lanes:** never give up two consecutive rush lanes (Bucs p. 34). Walker
  rushes ends to the QB's near ear and tackles to his near eye, keeping the QB
  inside and in front (p. 11). The two disagree on the throw: Walker jumps
  with arms high, the Bucs say never leave your feet.
- **Stunts:** the penetrator is "the man going 1st on game" (Bucs p. 41);
  "Exit" = end first, "Tex" = tackle first. The penetrator works to the
  blocker's back; "the key to all good games is the second man", who sells a
  one-on-one rush and runs the game tight (p. 37). The Bucs run games "on a
  three-step delay" or with a grab; a footballtoolbox clinic summary counts no
  steps and wraps on contact. Delay and grab games push a zone protection into
  man; quick games push a man protection into zone (p. 37).

## Defensive backs

Notre Dame DB manual (Holtz era by inference; no names or year printed) and
Daberkow's clinic. Physical pages.

- **Alignment:** press 2–3 yd, inside leverage (pp. 7–9); off man 7–9 yd
  from the receiver (p. 10); never closer than 6 yd to the sideline; deep
  outside third 7–9 yd, middle third 10–12 yd (12–15 in passing situations);
  cloud corner 3–7 yd (pp. 17, 19); deep-half safety drops 2–3 yd outside the
  hash (p. 20).
- **Cushion and turn:** keep 3–5 yd vertically (p. 13); turn and run when it
  drops under 4 yd, usually 12–16 yd downfield (p. 5); open the hips at 3–4 yd
  (p. 6).
- **Eyes:** in man, the receiver's belt buckle, seeing him through the break
  before looking to the QB, and looking back only when he does (pp. 6–7).
  Daberkow: look back only when in phase (slide 11). In zone, break when the
  QB's front shoulder points and the front hand leaves the ball (p. 16).
- **Breaks:** never break under a receiver without a sure two-hand
  interception; never break under an out (pp. 11, 13). Pattern rules: in
  "mix", two verticals put the safety on #2 and the corner on #1; #2 to the
  flat turns it to cloud (pp. 36–37).
- **More numbers and match rules** (2014 Michigan DB manual; Saban Cover 3
  match per USA Football; AFQ trips article; Olivadotti, paraphrased):
  - Michigan: off corner 7–8 yd (a true third at 8), outside leverage, moving
    inside against a wide split and outside against a tight one (pp. 1, 4,
    24). "Man any vertical stem by #1 past 5 yards." The seam player carries
    #2 10–12 yd (p. 6); the squat corner's front foot is at 4.5 yd (pp. 8–9);
    the half safety plays 12–14 yd deep (p. 13).
  - Saban Rip/Liz: the call sets which safety rotates down. The matching
    defender stays on top of #2 vertical. An "Under" call, made within the
    first five yards for a route under 5 yd, turns that side into spot-drop
    Cover 3. Hook defenders sit 10 yd deep, 2 yd inside the hash, and take the
    "final 3". Trips check "Skinny" puts the backside corner man on #1 and the
    free safety on the back or the first crosser.
  - AFQ vs. trips: the rolled strong safety keys #3 (vertical or inside →
    take #2; toward him → take #3); the free safety sits 10–12 yd deep between
    the #1s and takes #3 vertical.
  - The engine comparison is in the
    [coverage rules source audit](../reviews/coverage-rules-source-audit.md).
- **Run support:** play pass until sure; outside-third players fill
  outside-in, middle and half safeties fill the alley inside-out; break down
  3 yd from the pile (pp. 28–30).

## Receivers

Texas A&M 2009 WR drill book (TAMU), McKendree College WR manual (scan,
2006 PDF, no author), "Offense Receiver Fundamentals" 2015 (FUN), and Drew
Lieberman's press-release articles (USA Football, 2019). College material;
physical pages.

- **Release from the DB's leverage:** attack the side he shades (head-up
  counts as outside), aiming 1–2 yd past his leverage so he must declare;
  stopping routes take a modest release and win at the break (Lieberman).
  Full steps against cushion, half steps against tight press; move him with
  the feet and use the hands when he shoots his. Against press, sell one side
  for 1–3 steps until he turns his hips, then cross under (TAMU p. 21).
  Against a Cover 2 corner, attack his outside leg and rip inside if he takes
  it (FUN p. 3); against a cloud corner at 5 yd, release outside and slip
  inside if he widens (TAMU p. 20).
- **Depth by drop** (FUN p. 3): "3 step drop by Qb = routes run at 6 yards
  depth", 5-step = 12 yd, 7-step = 17 yd. McKendree route tree (pp. 22–24):
  hitch and slant 5–6 yd on three steps, curl 13–15 back to a window,
  comeback 17 back to 15, crosser 10 yd building to 20, post breaking at
  8–10 yd. Break by planting the foot opposite the break; no rounded cut
  except a speed cut (p. 13).
- **Conversions:** cross bursts away against man and settles over the ball
  against zone (TAMU p. 12); the #2 "get-open" route runs a post if the hook
  defender blitzes and sits if he drops; with no middle safety, think post
  (FUN). V route reads the safety at 15 yd; the post splits the near safety
  against Cover 2 and stays thin against Cover 3 (McKendree p. 24).
- **Splits** (McKendree p. 21): normal = top of the numbers, medium = 4 yd
  inside the numbers, tight = split the distance to the end man. Run plays
  align at the bottom of the numbers (FUN p. 3).
- **Blocking:** stalk closes to a 3–4 yd cushion, breaks down, mirrors and
  denies inside, engaging only when the defender commits (McKendree pp. 7,
  14, 19); first force blocks a safety who comes downhill, else the corner
  (TAMU p. 16); crack the end's outside shoulder from about 1.5 yd (TAMU
  p. 17).
- The sources conflict on stance (FUN inside foot back; Lieberman assumes it
  up) and give no technical catching data.

## Tackling

Pete Carroll's Seahawks tackling clinic, as summarized by FootballScoop
(2015): track the ball carrier's near hip ("run and gather", near-foot
position); compression tackles "own the hip" with the leverage shoulder;
hawk tackles are "eyes through the thighs", wrap and squeeze, drive for five;
profile tackles aim the shoulder at the near pec. Svec adds the head off the
near hip and a front-hip and back-hip "vice" in pursuit.

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

**Front details for the run-defense session (2026-10-21).** From the 2016 and
2017 Colts and 2012 Raiders books, with key quotes re-checked:

- *Nickel "Auto":* the closed call goes to the TE when the TE is attached or
  the RB is at home, to the RB when the TE is off the ball or detached
  (2017 p. 13). A near back gets a 6, a dot or far back a 9; in the gun,
  "Near Gun = 6 Tech", "Far Gun = 9 Tech" (2016 p. 436).
- *Open-side 5 width* is set by the call, often with a stunt: the Raiders
  print "LOOSE 5" (p. 33), "WIDE 5 … PIRATE STUNT" (p. 37) and "TITE 5"
  (p. 81). The Bucs define the loose 5 as one yard outside the tackle
  (p. 24). No book ties width to down, distance or the tackle's split.
- *Under vs. Over:* the Colts' base is Under; "Any 2-Back with Y in Normal
  Alignment = Reduce", "Everything Else = Check Under" (2017 p. 82). Over has
  no selection rule in these books.
- *Goal line:* a six-man line with both safeties as edge "supports" (2016
  pp. 505–511); the Raiders goal-line Banjo is "6 DL, 4 LB and 1 DB"
  (p. 232). Triggers are by personnel.
- *Linebacker depths in yards:* none in any book; only alignment numbers
  such as the Raiders' Over 40 / 10 / 40.

**A linebacker's first step before he knows run from pass (2026-10-22, for
the run-defense session).** No source gives seconds, but none teaches
standing still. AFQ steps *with* a zone or pull block, *away* from a down or
base block, takes a "short initial step" on a scoop and a false step on a
pass set. The Cowboys shuffle on full flow and cross over and run on fast flow.
Michigan's run step is "always forward … at a 45°". Svec lists a jab read step
as an option he does not use. So the first step starts at the snap in the
key's direction, shortened when the key is ambiguous, and the commitment comes
on the second key (the back's flow).

**Tackle pass-set depth.** The Bucs DL manual has the end measure the tackle
against a "tackle set line" at about 70° from the line back to 7–10 yd deep
(p. 36). The Ravens OL manual uses vertical or 70° angle sets for dropback
protection and the flat (22°) set only for quick three-step protection
(p. 46).
