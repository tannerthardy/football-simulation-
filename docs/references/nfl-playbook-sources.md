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
fronts**, plus formation and motion vocabulary.

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
| [2013 Seahawks defense](https://footballplaybooks.net/download/2013-seattle-seahawks-defense-pete-carroll/) (19.66 MB), [2020 Browns OL manual](https://footballplaybooks.net/download/2020-cleveland-browns-ol-manual-bill-callahan/) (1.81 MB) and other footballplaybooks.net items | **Locked** behind an email/sign-up gate | Attributed team material | Needs the user |
| [2014 49ers (Roman) preview](https://pdfcoffee.com/2014-49ers-greg-roman-playbook-pdf-free.html) | HTTP 403 through the proxy | Marked "Confidential Property" | Not used |
| [FootballXOs offense clinics](https://www.footballxos.com/downloads/offense/?cp=2), [NDSU run-fit analysis](https://www.footballxos.com/how-north-dakota-state-executes-their-run-fits/) | Public pages | Clinic and analysis articles | Good next reads for zone technique and fits |

## Reading map

| Engine question | Read first | Then |
|---|---|---|
| Run-blocking assignments by front (`planRunBlocking` in `src/sim/behaviors/blocking.ts`) | [Run-blocking assignment audit](../reviews/run-blocking-assignment-audit.md); spread playbook pp. 62–64 trap, 66–68 power, 83–85 counter | [Trenches](../football-handbook/trenches.md), [moving run-game footwork](../football-handbook/moving-run-footwork.md); zone clinics |
| Run fits and fronts (`FRONTS` in `src/playbook/defense.ts`, `src/sim/run-fits.ts`) | HonestNFL run-defense and fronts sheets | Cowboys Over Stack fits and NDSU article, if the user approves them |
| Protection declaration (`ProtectionCoordinator`) | Spread playbook pp. 94–99 | [OL protection textbook](offensive_line_protection_textbook.pdf); HonestNFL protection sheets |
| Coverage checks | [HonestNFL concept guide](honest-nfl/CONCEPTS.md) | 2008 Alabama, only if the user decides the rights question |
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

**Name collisions.** RIP/LIZ is a protection direction here but a coverage
strength call in Saban-family defenses. "H (over)" is a formation modifier,
not the Over front. HonestNFL's term finder records similar collisions; keep
source terms in records and map them to engine ids explicitly.

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
