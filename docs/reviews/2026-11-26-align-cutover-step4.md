# Step 4: the sim lines up from the description, and new looks run end to end (2026-11-26)

Rules + Coaching, for Integration. Base: develop 52ddaac52.

## 1. The alignment cutover (no flag; plumbing only, no behaviour change)
- **`alignOffense`** is now `alignOffenseFromSnap(describeOffenseSnap(formation, ctx), flip, los, ballY)`.
- **`alignDefense`** is now `alignDefenseFromDescription(describeDefense(call), off, present, prefs, style)`.
- **Every runtime caller now lines up from the description:**
  - PlaySim: the snap, and the stem's shown front;
  - the motion re-check (motion.ts);
  - the QB's canonical looks (qbmind.ts);
  - the read compiler's features;
  - concept fit.
- **One input the description lacked, added as data:**
  - **The team's receiver-room habit** (`AlignStyle.wrRoom`). The describer had folded it into the room. Today's code
    subtracts it after the room, `toSideline − room − habit`, so the two differed by up to 4e-15 yd on 899 of 20,130
    alignment calls in a real game.
  - It is now its own field, `Room.habit`, and the resolver subtracts in today's order.
  - With it: 0 of 18,172 calls differ (temporary in-process comparison of the old and new paths, `isDeepStrictEqual`).
- **One flag-off path the description lacked, added as data:**
  - **`WR_ALIGN=0`.** The describer threw "not described". The off rule is that a slot stands at
    max(5.5, 0.45 × widest + 0.5), and a #3 at max(4.6, 0.62 × that).
  - It is now the share anchor's `plus` and `then` fields.
  - The red-diff found it: align-style, def-align, wr-align and the qb-rusher-recording tests construct sims with
    `WR_ALIGN=0`.

### The proof
- **Game digests, 8 games.** Seeds 1-8, `scripts/sim-game.ts` teams, `simulateGame(home, away, { seed })`. The digest
  is the SHA-256 of `JSON.stringify({ log: g.log, score: g.score })`: the full play-by-play log of every play, plus
  the final score. Run on clean develop 52ddaac52 (a separate worktree) and on this branch. **All 8 are identical:**

| seed | plays | score | digest |
|---|---|---|---|
| 1 | 172 | 12-44 | `29de518bedb83a02` |
| 2 | 182 | 40-33 | `8b885f842836d13d` |
| 3 | 156 | 27-36 | `23eeac490d7697d0` |
| 4 | 165 | 47-24 | `8f32e403ed55cb1d` |
| 5 | 188 | 57-53 | `fdae7b3247c67c70` |
| 6 | 164 | 27-23 | `805cd33156c9da2f` |
| 7 | 174 | 33-43 | `722396231b2f8148` |
| 8 | 179 | 29-26 | `643df4fbd9872965` |

- **Every flag the removed bodies read, toggled, on both trees.**
  - 25 flags. For each, an order-insensitive hash of 50,880 alignments: 24 formations × 4 contexts (including a full
    `AlignStyle`, short yardage, a pass and two runs) × 2 ball spots, and fronts × personnel × a coverage sample, with
    and without a pressure and a disguise.
  - Develop and branch are **identical for all 25.**
  - COUNTER_OFFSET, MIRROR_SCATTER, SAM_ON_TE and SITU_DEPTH do not change this sample's hash; the game digests and
    the red-diff cover them.
- **The existing equality suites** pass: ir-roundtrip, ir-align, ir-offense, ir-check and ir-fits. ir-align and
  ir-offense now compare the description path with itself, because `alignOffense` and `alignDefense` *are* that path.
  The digests and the flag sweep are the proof of identity with today. The two suites keep their acceptance cases
  (the 5-1 and the unbalanced line).

## 2. The duplication collapsed
- **Removed from alignment.ts:** the name-reading bodies of `alignOffense`, `alignDefense` and `alignDisguised`,
  801 lines (1,566 → 765). ir/align.ts and ir/offense.ts are the one source.
- **alignment.ts keeps only the shared geometry and vocabulary** both paths always used:
  - techniques → offsets and gaps;
  - zone landmarks and spots;
  - line splits, `gapY` and the depth rules;
  - the flags.

  Every remaining export is used elsewhere (FLAT_DEPTH is used only inside the file).
- **Nothing still needs the old path.**

## 3. A call with no preset, and three new looks
**The entry point:**
- `PlaySetup.offDesc` / `defDesc` (src/sim/playsim.ts): the snap aligns from the descriptions themselves.
- `src/playbook/ir/entry.ts`:
  - `callOfDescription` (the lowered defense) for the code that still reads call fields;
  - `formationOfSnap` for a formation synthesized from the offense description.
- A described defense skips the secondary's coverage check (`installCoverage`, by coverage name).
- Run fits read `sim.defDesc` when it is given.
- Lab: `scripts/diag/ir/new-looks.ts`, 16 seeds each, checker first.

| case | checker | throws / NaN | result | run-fit jobs (FIT_RULES, no code added) |
|---|---|---|---|---|
| (a1) 5-1 nickel vs gun doubles, inside zone | warning: A gap weak unowned | 0 / 0 | 5.26 yd mean | DE C ±; DT B ± (2s); stand-up LB_W edge D weak; Mike A weak; NB force weak; SS force strong, fold A |
| (a2) 5-1 nickel vs gun doubles, slant-flat | the same warning | 0 / 0 | 4.82 yd; 11 completions, 5 incomplete; Z targeted 15 | as (a1) |
| (b) tackle over (I, under center), inside zone to the heavy (two-tackle) side vs Over base cover 3 | clean | 0 / 0 | 2.80 yd mean | Over base as usual: Mike A strong (the Y side); Will force weak (heavy side), fold B; Sam D strong; SS force strong |
| (c) bunch + stack (empty), stick vs Over nickel cover 3 | warning: front-spot-ignored (LB_S off the field: nickel) | 0 / 0 | 4.44 yd; 10 completions, 5 incomplete, 1 TD; targets: RB 10, H 4, X 1 | NB inside the box: insert D strong; Will force with fold B |

**On the field:**
- **(a1)** Before first contact these box defenders were never blocked: the SS 15/16, the stand-up Will 14/16, DE_W and
  DT_W 9/16 each.
  - Inside zone with six on the line against five blockers leaves the backside edge by count. That is football, and
    blocking's own line/backer split (`classify`) is geometric.
  - The 9/16 on the weak 2i and end, and a 5.3-yd mean, deserve a look on film.
- **(b)** Blocking treats the tackle-over LT and the covered RT as "the tackles" by label (zone widths, outside sign,
  set rules). The run still averaged 2.8 yd, but the covered RT is played as an end-of-line tackle.
- **(c)** The stacked player is the `RB` body (no personnel fields Y, Z, F, X and H, so F → H and H → RB). The QB
  targets him on 10 of 16, as the back by label.

## 4. Not yet general: ranked by how badly it breaks a new look (not fixed here)
1. **The back is the slot labelled `RB`.**
   - Locations:
     - assign.ts 272, 306, 393, 430, 458: the runner and the mesh;
     - blocking.ts 3512, 3575, 3793: the runner; 1046, 1090, 1179, 1445: never a wing or stalker;
     - qb.ts 1971-1972: the checkdown is `slot === 'RB'`; 1125, 1807;
     - qbmind.ts 821.
   - An empty set's receiver in the RB slot is the QB's outlet (case c: 10/16). A carrier who is not the RB slot cannot
     be the runner.
   - Data that would fix it: the description's backfield flag and `numbering.B`.
2. **Tackles, guards and interior linemen by label in blocking.**
   - Locations: blocking.ts 155, 209, 231, 315, 365, 375, 400 (LT/RT: zone width 5.5, outside sign from home y,
     sets); 631 (LG/C/RG interior); 1258-1259 (guards and tackles for pulls).
   - Any unbalanced or covered line (case b) is played by label, not by where each man stands on the line.
3. **Paths that re-describe a lowered call.**
   - The stem's shown front (playsim.ts 547), the motion re-check (motion.ts 526, 534) and the QB's canonical looks
     (qbmind.ts 300, 389, 394) call `alignDefense(call)`.
   - For a described defense, `describe(lower(desc))` loses its alignment data (`secondLevel`, `frontRules`, a front
     id not in the tables). A new front would line up differently the moment a stem, motion re-check or QB look runs.
   - The coverage check (`installCoverage`, by coverage name and family) is skipped for described defenses.
4. **The defensive line by label in the blocker's surface picture.** blocking.ts 2230
   (`['DE_W','DE_S','DT_W','DT_S','NT']`): a stand-up end or a walked-up backer on the line (the 5-1's Will) is not a
   surface a climbing blocker steers around.
5. **Stance and read time by label.** assign.ts 92-96 (`k === 'DE'`, `base34`); READ_BASE 39. The 5-1's on-line Will
   gets a backer's stance and read time.
6. **A Formation cannot hold a line.**
   - `formationOfSnap` carries only skill players.
   - The playcaller's motion choice, concept fit and anything else that reads `formation.slots` see no unbalanced line
     and no description-only anchors (share, sideline).
7. **Personnel are slot maps** (types.ts OFF_PERSONNEL). A look needs slot labels that its personnel fields, so the
   bunch + stack had to relabel F and H.

The run fits (FIT_RULES) and the alignment needed no code for any of the three looks.

## Red-diff (`node scripts/red-diff.mjs`, one clean run on the head)
- **Totals:** 4,625 tests; 36 failing, all on the ledger.
- **New red 0.** Fixed 4: concept-menu and three baseline-runner tests.
- **An earlier run, before the WR_ALIGN-off description, had 9 new reds:**
  - align-style, def-align and wr-align "off";
  - six qb-rusher-recording tests, which construct sims with `WR_ALIGN=0`.

  All nine came from that one missing flag-off path, now carried as data.
