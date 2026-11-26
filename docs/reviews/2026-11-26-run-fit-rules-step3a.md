# Run-fit assignment as shared structural rules, step 3a (2026-11-26)

Rules + Coaching, for Integration. Base: develop fade14770. This piece is a sidecar: run-fits.ts runs as it is, and
nothing in the sim imports the new file.

## What changed
- **`src/playbook/ir/fits.ts`** (new). `runFitJobs(description, resolved alignment, observed offense, { pos?,
  labelFree? })` returns each player's job (today's `RunFitJob`) plus two lists:
  - `unowned`: A, B or C on a side that no one owns after the front, the blitzers and the second level are spent, or a
    side with no force player;
  - `conceded`: the unowned gaps that the call declares as intended concessions (new description field `concede`).
  - It reads no sim state. `pos` gives the bodies where they stand; without it, each man is on his resolved spot.
- **`src/playbook/ir/check.ts`.** The gap warning now reads this function, replacing one gap per spot:
  - `gap-unowned` is a warning;
  - `gap-conceded` is a note, a new issue level;
  - `checkDefense(..., { labelFree })` selects the mode.
- **Unowned report only, not the jobs.** With no attached end on a side, the last gap is C, and a line player claiming
  D there (a wide technique) owns it. `buildRunFits` still offers that C to the second level as a bubble, so the jobs
  are unchanged.

## Equality: faithful mode against `buildRunFits` on the default engine
- **Catalog, 43,340 calls, 0 unequal.** `buildRunFits` ran on a stand-in sim with the bodies on their resolved spots.
  - formation × front × personnel × coverage: 25,344;
  - pressures on 2x2 and 3x1: 13,244;
  - 4,752 call variations: the six line games (angle, slant or pinch, to either side), both gap exchanges, and spill
    with plug, over 4 formations × fronts × personnel × 6 coverages.
- **Bodies as a real play places them: 60 plays, 0 unequal.** The plays come from the game's call flow, with the
  `PlaySim` constructor's bodies passed as `pos`.
- **Remainder:** none.

## Where today's assignment is decided by a slot label, and the taught rule for each
1. **`run-fits.ts:58`, line games.** Interior = `DT_S`, `DT_W`, `NT`; end = `DE_S`, `DE_W`.
   - Taught: the line players inside the tackles' outside shoulders are interior; those outside them are ends.
2. **`run-fits.ts:86`, `frontSlot`.** A `DE`, `DT` or `NT` slot is a front gap player, even when man matching moved him
   off the line.
   - Taught: a man the front places on or near the line (within 3 yd, which takes in the 2.6 yd stand-up rover) and who
     is not a called blitzer is a gap player of the front. So is a man who rushes from the line. A blitzer owns his
     blitz gap either way.
3. **`run-fits.ts:91`, kind.** `slot.startsWith('LB')` makes him 'insert'; anyone else is 'alley'.
   - Taught: an off-ball second-level defender inside the box (within 5.5 yd of the ball, at most 7 yd deep) is an
     inserter, whoever he is and whatever his zone (a Tampa Mike reads run first). Every other off-ball, non-force
     defender is an alley player.
4. **`run-fits.ts:171`, the backer pool.** `slot.startsWith('LB')`, then the same 5.5 yd lateral limit.
   - Taught: rule 3. The insert pool is whoever is inside the box at second-level depth.
5. **Adjacent, not assignment** (assign.ts, right after the fits; not ported):
   - `READ_BASE` by slot prefix (39, 122): read time by label. Taught: read time by job and depth (a box defender keys
     the backfield, a deep player reads through the line).
   - `setFrontStance` (92-96): `k === 'DE'` stands up in zone, man or spy, or in `base34`. Taught: stance by role and
     alignment (a dropper or man defender on the line stands).
6. **Call data, not a label leak.** `gapExchange` names the end and backer by slot, because the call pairs those men.
   As data it is acceptable.

## Faithful against label-free across the catalog (43,340 calls)
**Totals:**
- 16,282 calls differ.
- Calls with an unowned gap: faithful 26,247, label-free 21,675.

**Player-call changes by kind:**

| change | player-calls |
|---|---|
| alley → insert | 6,266 |
| insert → alley | 5,104 |
| insert → insert (other gap) | 2,879 |
| force → force (other inside duty) | 1,677 |
| force → edge | 1,666 |
| alley → force | 1,563 |
| edge → edge | 1,375 |
| edge → insert | 1,078 |
| insert → edge | 990 |
| edge → alley | 753 |

The largest groups:
- **Dime DB: alley → insert, 237 calls per dime front.** This is the expected first difference: where the DB aligns
  inside the box, he takes the interior gap the absent Will left.
- **NB inside the box: alley → insert.** About 130-205 calls per nickel or dime front.
- **A backer outside the box: insert → alley.** This is the apex or walked-out Sam or Will at 6.1 yd or wider, and a
  man-to-man backer over a slot.
  - Today such a backer keeps the label 'insert' but is outside the pool, so he fills no bubble.
  - Label-free, he plays the alley.
- **Bear: the Sam in a 9 technique on the line.** He goes from force (or insert) to edge, and the SS becomes the force.
  The man on the line is a front gap player.
- **An end converted to man and aligned on a back at 5 yd: edge → insert.** Today the label keeps him a line player.
- **A 4i end in mint and penny under a line game: interior → interior with a different step.** By where he stands he
  is interior, not an end, so a pinch does not move him. This is a difference in how a line game reads its players;
  I flag it for you.

## Perturbation cases (label-free; `test/ir-fits-cases.test.ts` prints every table)
The notation is depth / lateral from the ball, then job.

- **(a) 4-3 Over base, cover 3.**
  - Against `ace_11`:
    - DE_S C strong; DT_S 3 technique B strong; DT_W 1 technique A weak; DE_W C weak.
    - Sam (−5.2) A strong; Mike B weak.
    - Will (6.1, walked out over the two weak receivers): force weak.
    - SS (rolled down): force strong.
    - Nothing unowned. The faithful mode gives the same jobs.
    - Sam→A and Mike→B is a near tie in GAP_MATCH's set cost (7.43 against 7.53 yd of travel). That pairing is
      today's, not a taught preference.
  - Against `i_pro_21`, the textbook picture: Mike A strong; Will force weak with B weak inside; Sam D strong; SS force
    strong.
- **(b) A safety's body in the Sam's spot** (the `SS` and `LB_S` labels exchanged, each man on his own spot).
  - Label-free: the jobs are identical. The test asserts it.
  - Faithful: the man in the Sam's spot turns from insert A strong into alley, and A strong becomes unowned. That is the
    label leak.
- **(c) The Sam widened 1, 2 and 3 yd** (`ace_11` and `gun_doubles_11`).
  - At −5.2 he is insert A strong.
  - From −6.2 outward he is alley D strong, and A strong becomes unowned.
  - The job changes at the box limit (5.5 yd from the ball), about 0.3 yd outside his spot. Past it he is a C/D
    and alley player, and no one inside picks up his old gap.
  - The rule is a cliff, not a reach. Whether a 6-yd apex can still own A in time is a body and timing question (his
    speed, the back's mesh). From where he stands, the pre-snap rule cannot know it.
- **(d) Nickel and dime Over, cover 3.**
  - **Nickel:** Mike A strong; Will B weak; NB (9.1, over the slot) force weak; SS force strong. Nothing unowned. The
    Sam's job went to the SS (force) and the Will's to the Mike sliding.
  - **Dime as aligned today:** the DB is at −6.8 to −7.0 (over the strong side as its curl-flat seat), outside the box,
    and is force strong. The SS is alley, the Mike alone takes B weak, and **A strong is unowned** in both modes.
  - **Dime with the DB beside the Mike, as the sources put him** (4.7 / −3.0): he takes A strong as his inside duty,
    and nothing is unowned. But he remains the strong force, because his coverage seat (curl-flat strong) designates
    him.
  - So the fit rule does what the sources say once he stands inside. Today's dime alignment does not put him there,
    and his seat is an apex's, not a dime backer's: that is the coverage's seat assignment.
- **(e) 12 personnel (`ace_12`), Over base.**
  - **Single-high (cover 3):** the SS rolls down as the force strong; Sam D strong; Mike A strong; Will force weak with
    B weak inside.
  - **Quarters (cover 4):**
    - The Sam is the strong force and the Will the weak force (B weak inside).
    - Mike A strong.
    - Both safeties (12 yd, over the ends) are alley players.
  - **Cover 2:** both corners force; Sam D strong; Mike A strong; Will B weak; safeties alley.
  - The extra D gap goes to the box safety in single-high, to a backer as force in quarters, and to the corner's force
    with a backer inside in Cover 2. Nothing is unowned in any of the three.
- **(f) An overload pressure.**
  - Over nickel against gun doubles: `nickel_edge` (and `whip`) leave **B weak unowned**. It is reported as unowned, a
    warning, not an error.
  - The same call with `concede: [{ gap: 'B', side: 'W' }]` reports it as conceded and nothing unowned. The test
    asserts it.

## Against the reference matrix (Gemini; a reference, not truth)
- **Over base: Mike strong A, Will weak B, Sam D/force. Agree** against a pro set:
  - Mike A strong;
  - Will B weak (as the inside duty of his weak force);
  - Sam D strong;
  - force from the SS in cover 3.

  Against an 11-personnel singleback set the Will is walked out to force weak, and the Sam and Mike split A strong and
  B weak.
- **Even: the backers take both A gaps. Agree:** Mike A strong, Will A weak (as inside duty).
- **Tite: 4i's control B, nose lag A, backers C. Partly.**
  - Agree: the 4i's take B (`fits` gives control) and the nose takes A weak (lag).
  - Disagree: the Mike takes A strong, not C, and C strong is unowned.
  - The bubbles count the lag nose as owning one A gap, so the second level fills the other A first (GAP_MATCH weights
    an open A gap worse). "Nose lag A, backers C" needs the nose to own both A gaps, which is two-gap, out of scope.
- **3-4 Bear: Mike strong C, Will weak A. Agree** against a pro set: Mike C strong; Will A weak (inside duty of his
  weak force).
- **Force from the flat defender (Cover 2 corner, Cover 3 rolled safety). Agree:** the Cover 2 corners are force and
  the Cover 3 SS is force.
- **Dime: the dime back, not the strong safety, takes the interior gap. Agree in principle, not with today's dime
  alignment.**
  - The label-free rule gives him the gap when he aligns inside.
  - As aligned today he is outside the box over the strong side and is the force. The SS is alley, and the interior gap
    is unowned.
- **Gaps:** A-D only, no E gap.
- **Odd:** our `odd` is drawn 5-0-5. In it the 5 techniques take C, the nose takes A strong, and against a pro set B
  weak is unowned. BAL05 (docs/references/defensive-alignment-sources.md:298) is 4-0-4 two-gap. Nothing is changed.

## Information and scope checks
- **Information.** Every rule here uses what a player has before the snap:
  - his own and his teammates' alignment and the call (his coverage seat, the front's fits, the pressure, the line
    game);
  - the observed offense: its strength, its attached ends and the gap spots.
- **Two cases a rule from where he stands cannot produce:**
  - The dime back's gap depends on where the coverage seats him, so it is an alignment and seat question.
  - Whether a widened apex still owns an interior gap depends on his body and the play's timing, so it is a staged
    physics question, not a pre-snap rule.
- **Not in this piece:** the sim cutover, the two-gap nose, the adjacent label reads (READ_BASE, stance), and the
  warnings' fit data beyond this.
