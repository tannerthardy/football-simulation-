# Coverage spacing, leverage and run fits by coverage and look

Tanner: "work on the relationship between coverages, leverage, alignment and
also who has run fits. What kind of spacing is every coverage against certain
formations and looks." This note is the deep dive: what the sim does, what
coaches teach, what NFL tracking shows, the first refinement built
(`SITU_DEPTH`), and the ranked list of what to fix next.

## Sources and operators

- **NFL tracking.** BDB 2025, all 9 weeks: 16,062 plays at the snap frame, with
  PFF coverage on every play and PFF coverage assignments per defender (passes
  only; runs carry almost none). Script: `snap_extract.py` writes one row per
  play; reports read those rows.
- **Sim.** A run grid (`out/simsnaps.ts`, `out/simalley.ts` on the branch):
  - **Coverages:** 8 (Cover 0, 1, 2-Man, 2, 3, 3 match, 4, 6).
  - **Formations:** 6 (gun doubles, gun trips, ace, pistol, ace 12, I-pro 21).
  - **Runs:** 7 concepts.
  - **Also varied:** front (Over, Under), flip, 2 rosters.
  - **Total:** 2,688 runs.

  Rows go in the same format as the NFL rows, so the same report code reads both.
- **Coaching.** Literature review: project references (DAS, DCL, FAN, HonestNFL
  index, PSA, PRS) plus Bowen, AFCA, Svec, Wilhite, MatchQuarters, SumerSports,
  NFP and USA Football. Claims are graded [M] measured, [S] secondary, [L] lore,
  [L\*] primary team playbook.
- **Sim inventory.** Code reading of `alignDefense` (`src/playbook/alignment.ts`)
  and `buildRunFits` / `executeRunFit` (`src/sim/run-fits.ts`).

## What coaches teach (summary)

- **Leverage follows help.** Inside help means outside leverage; no help, or
  the sideline as help, means inside leverage. Saban divider: a line one yard
  inside the top of the numbers [L]. Measured [M]: corners shade inside within
  9 yd of the sideline.
- **Spacing = 11 minus the players with no run fit** [S]:
  - 7-man (Cover 2, Tampa, pass-first quarters);
  - 8-man (Cover 1, Cover 3);
  - 9-man (run-first quarters, Cover 0).

  A two-high shell gives up the plus-one in the box and earns it back with
  technique (two-gap, fold, slant) [S].
- **Force, alley and cutback by family:**

  | Family | Force | Alley | Cutback |
  |---|---|---|---|
  | Cover 1 | playside edge, then the corner [L\*] | post safety | backside apex |
  | Cover 3 Sky | rotated safety | post | — |
  | Cover 3 Cloud | corner | post | — |
  | Cover 3 Buzz | backer at curl-flat | — | — |
  | Cover 2 / Tampa | corners | safeties, late | — |
  | Quarters, Fangio | apex | inside-quarter safety, keyed off #2 | backside apex |
  | Cover 6 | each side keeps its own table | | |

- **Quarters force is call-dependent.** Apex (Fangio) or safety (2-read), or Will
  force with the SS in the alley (4-2-5). This is a coordinator's choice.
- **Deep safeties:** halves and post defenders play pass first and "support
  late". Quarters safeties flat-foot read #2 and fill when he blocks.
- **Formation answers** (all checks a coordinator picks):
  - 3x1: Solo, Poach, Trix, Stubbie, Mable, Strap, Cover 8.
  - Bunch: Box, Banjo, Clue, Buster.
  - Empty: Book, Read, Grab.
- **Strength and motion.** Front strength goes to the tight end and coverage
  strength to the passing side; motion across the ball changes strength [L\*].

Full reference with grades and URLs: the research hand-off summarized in the PR.
The coaching references already in `docs/references/` hold the primary pages.

## What the sim does (inventory, condensed)

**Alignment:** `DEF_ALIGN`, `BOX_ALIGN` and `FRONT_*` are all tracked numbers.
- **Corners** depend on the role:

  | Role | Depth | Shade |
  |---|---|---|
  | Press man | 1.3 | +0.15 |
  | Off man | 6 | −0.2 |
  | Deep-third or quarter-out | 7.3 | +0.8 |
  | Flat | 4 | +0.5 |
  | Inside 9 yd of the sideline | — | inside |

- **Nickel, zone:** 4.5 deep, 0.5 inside the detached #2.
- **Safeties:**
  - halves 14 deep, 6.9 off the middle;
  - quarters 12 deep, 6.65 off;
  - post 14.5 (man-free 14.7);
  - down safety 4.4–5.8 deep outside the strong end of the line.
- **Backers** come from a table by front family. Their depth changes on 3rd down
  (the only situational rule before this change).

**Fits:**
- **Front gaps** come from the technique.
- **Backers** take the open A–C gaps as a set (`GAP_MATCH`).
- **One force per side:** the call's flat or curl-flat seat. Without one, a
  geometric fallback picks, in which deep defenders rank ahead of man defenders.
- **Every other DB is an `alley` player:** he holds near alignment depth until
  the runner nears the line, then chases.
- **The one-high post's alley side is fixed weak.**
- **Cutback** is never assigned in games.

**Not modeled:**
- depth by situation for the secondary (fixed here);
- safety width by formation;
- field/boundary-based calls;
- a box count that drives a rotation;
- the `nub`, `two_back` and `iso_weak` structure tags (never read).

## What NFL tracking shows

**Run plays: sim against NFL on one operator.** Medians.

| Coverage | Box (|y|≤5.5, d≤7) NFL / sim | Deepest defender NFL / sim | Second safety NFL / sim | Safety tacklers' depth at the snap NFL / sim | Run tacklers NFL (DL / LB / S / CB) |
|---|---|---|---|---|---|
| Cover 1 | 6 / 6 | 13.2 / 14.7 | 5.8 / 5.0 | 7.4 / **14.7** | 33 / 37 / 21 / 9 |
| Cover 3 | 6 / 5 | 13.5 / 14.5 | 7.6 (corner) | 8.2 / **14.5** | 33 / 38 / 18 / 11 |
| Cover 2 | 6 / 5 | 14.0 / 14.0 | 9.9 / 14.0 | 10.7 / 14.0 | 30 / 37 / 19 / 14 |
| Quarters | 5 / 5 | 11.8 / 12.0 | 10.0 / 12.0 | 10.3 / 12.0 | 36 / 37 / 17 / 11 |
| Cover 6 | 5 / 5 | 13.1 / 14.0 | 10.8 / 12.0 | 11.5 / 12.0 | 32 / 38 / 18 / 13 |

- **The box matches.** Tackle shares by position group are close (sim S 13–17%,
  CB 10–17%).
- **The sim's safety tackles come from the post** (median depth at the snap
  14.5–14.7) in Cover 1 and 3. NFL safety tacklers were at 7–8 yd: the down
  safety.
- **The second safety in two-high is about 2 yd shallower in the NFL.** On pass
  plays with PFF assignments, the shallower of the two sits 1.4–3.2 yd above the
  deeper. It is on the receiver-strength side only 41–49% of the time and the TE
  side about 60%. Sorting two noisy depths always produces a gap, so this is
  spread around the same depth, not a rule.

**Deep safeties on runs** (aligned 9+ yd; weeks 1–4):

| Coverage | Trigger downhill p50 | Depth at 0.5 / 1.5 / 2.5 s |
|---|---|---|
| Quarters | 1.9–2.0 s | 11.5 / 11.6 / 10.1 (flat-footed, no gain) |
| Cover 2 | 2.3–2.4 s | 13.4 / 14.7 / 14.5 (drifts back) |
| Cover 3 | 2.1–2.2 s | 13.4 / 14.5 / 13.6 |
| Cover 1 | 2.1 s | 13.5 / 14.3 / 13.0 |
| Sim (all) | 1.9–2.1 s | 14.0 / 13.4–13.9 / 10.9–12.2 |

- **Trigger timing matches.**
- **NFL Cover 2 and 3 safeties gain depth first.** The sim's alley rule eases
  every safety *forward* (to `max(5, home − 1)`).
- **Laterally, play-side safeties match** at the moment the runner is 3 yd past
  the line: NFL +0.3 yd outside, inside 44%; sim +0.2, inside 47%. The idea that
  the alley should fill inside-out is not borne out as a gap.
- **The sim's backside safety is farther from the play:** 8.1 yd from the runner,
  6.2 deep beyond him. NFL: 5.7 and 3.4.

**Yards per carry by coverage** (NFL designed runs; sim grid, develop):

| | Cover 3 | Cover 1 | Quarters | Cover 2 | Cover 6 | 2-Man |
|---|---|---|---|---|---|---|
| NFL | 4.41 | 4.78 | 4.52 | 5.20 | 4.87–5.07 | (n small) |
| Sim | 3.19 | 6.75 | 6.88 | 4.77 | 4.36 | **10.65** |

The offense picks calls differently in a game, so these are not targets. But a
2–3× spread between coverages in the sim, against a narrow NFL band, points at
per-coverage fit mechanisms (below).

**Situational depth of the deep secondary.** Pass plays with PFF assignments;
change in the median depth versus 1st & 10 against 11 personnel.

| Job (base) | 2nd & 7+ | 2nd & 3–6 | ≤2 to go | 3rd/4th & 3–6 | 3rd/4th & 7+ | 12/21 | 13/22+ |
|---|---|---|---|---|---|---|---|
| Post safety (14.3) | −0.2 | −0.8 | −1.2 | −0.5 | 0.0 | 0.0 | −0.3 |
| Half safety (13.6) | −0.3 | −0.8 | −0.4 | −1.4 | −0.1 | −1.2 | −1.2 |
| Quarter safety (12.2) | −0.3 | −0.9 | −1.1 | −2.2 | +0.3 | −1.0 | −1.6 |
| Deep-third corner (7.1) | −0.1 | −0.5 | −1.0 | −0.4 | +0.6 | −0.5 | −1.4 |
| Quarter corner (6.8) | −0.1 | −0.2 | −0.1 | −0.7 | +0.8 | −0.3 | −0.9 |
| Flat corner (3.7) | −0.2 | −0.2 | −0.8 | −1.0 | +0.8 | −0.6 | −1.1 |

- **Adding situation and personnel** was checked against the joint cells
  (n 14–90). They agree within noise.
- **The bases match the sim's constants within 0.4 yd.**

## Built: `SITU_DEPTH`

- **The rule.** Deep safeties (post, half, quarter) and zone corners (deep-third,
  quarter-out, flat) add the table's change for the snap's down, distance and
  offensive personnel to their alignment depth. This is information the defense
  has before the snap; it sees the substitution.
- **Not touched:** man and press defenders, the down safety, nickels and
  backers (backers already had their rule).
- **Where:** `situationDepth` in `src/playbook/alignment.ts`. The situation now
  carries `personnel` (`src/sim/playsim.ts`).
- **Flag:** on by default; `SITU_DEPTH=0` turns it off. Registered in
  `docs/FLAGS.md` and `config/baseline.json`.

**Evidence**
- **`test/situation-depth.test.ts`** reads the table and checks the aligned
  depths. Quarters safeties: 12.0 on 1st & 10; 10.9 on 3rd & 1; 11.0 against 21
  personnel. Cover 3 corners +0.6 on 3rd & 12 with the post unchanged. It fails
  with the flag off.
- **Matched restage**, seed 7/11 saved snaps × 4 RNG shifts, flag off versus on,
  same code:
  - Passes: 396 of 732 changed; −0.16 ± 0.17 yd per play; completions 63.8%
    either way; interceptions 28 against 30; sacks equal.
  - Runs: 176 of 392 changed; −0.28 ± 0.28 yd per carry; 10+ yd runs 15.1%
    against 15.8%.

  No material outcome shift. It is a spacing refinement, not a stat move.
- **Fixtures:**
  - `long-yardage-run`: its contract is "situation changes only roles", so it
    turns `SITU_DEPTH` off as it already does `BOX_ALIGN`.
  - `pursuit-arrival`: re-selected to seed 1 (its native case moved; all 6
    contracts pass).

## Ranked next (each its own step)

1. **No force from deep defenders (`DEEP_NO_FORCE`, flag off today).**
   - **The problem:** without a flat seat (man calls), the fallback makes the
     2-Man deep-half safeties the force on both sides, from 14 yd.
   - **Measured cost:** in the sim grid, 2-Man allows 10.65 yd per carry; with
     the flag on, 6.59. Cover 1 goes 6.75 to 6.50; the others are unchanged.
   - **Who forces with the flag on:** the edge contains, and the nickel, the
     backer on the back or the corner becomes force. That is coaching's "1st
     force edge, 2nd force corner".
   - **Evidence it is wrong today:** NFL DBs set the edge on about 5% of outside
     zones (PRS), and deep safeties trigger at 2.1–2.4 s from 13–15 yd.
   - **Who decides:** FLAGS.md says Defense, Run Game and Coverage agree before
     it is promoted. Proposal sent to them.
2. **Quarters and Cover 1 leak runs** (sim 6.9 and 6.8 per carry, against 4.5
   and 4.8). Next, the first wrong stage on matched quarters runs:
   - the apex force's fit;
   - the safety's alley timing off #2's block;
   - the Mike's scrape.

   The coaching table above is the yardstick.
3. **Alley safeties in two-high zone should gain depth first** (NFL Cover 2 and 3
   drift back about 1–1.5 yd before triggering), while quarters safeties hold.
   Today all alley safeties ease forward. A role-specific pre-declaration depth,
   with the trigger unchanged.
4. **Backside safety as cutback/pursuit:** sim 8.1 yd from the runner against the
   NFL's 5.7.
5. **The one-high post's alley side follows the run,** not a fixed weak side.
6. **Smaller items:**
   - a blitzing DB is classified `alley`, so on a run read he abandons his blitz
     gap;
   - `cutback` is never assigned in games;
   - the structure tags `nub`, `two_back` and `iso_weak` are never used (no 2-back
     or nub-side adjustments);
   - the box count is never read by the defense.
