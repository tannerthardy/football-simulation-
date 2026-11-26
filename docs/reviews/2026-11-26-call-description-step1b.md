# Call description, step 1b: alignment from the description alone (2026-11-26)

Rules + Coaching, for Integration's grammar plan. Base: develop a23279b28.

## What changed
- **`src/playbook/ir/align.ts`** (new).
  - `alignDefenseFromDescription` is a port of `alignDefense` and `alignDisguised`. Every read of a front, coverage,
    pressure or personnel name is replaced by description data. The working call it places carries no front name, so
    a name read left behind could not match.
  - `alignOffenseFromDescription` lowers the formation description and calls `alignOffense`. That function reads no
    formation name; see below.
- **The description gains `alignment`.** The describer writes it from today's tables (the preset step), and it holds
  three things:
  - `subPackage`: nickel or dime. Today: `personnel === 'nickel' || 'dime'`.
  - `secondLevel`: the off-ball backers' spots by count, `[gap units, depth]`. Today: `BACKERS[FAMILY[front.id]]`.
  - `frontRules`: the front's conditional placements, each a typed condition on the observed offense:
    - `samOnTE`: a Sam-on call against an attached end on the front's strength, no wing, no detached #2 making him the
      apex. Today: front id over or even.
  - `samOverEnd`: against an attached end on the front's strength, head-up on a wing at the end's depth, else on the
    end's outside shoulder unless he is the apex. Today: front id over.
  - `samBearEnd`: against an attached end on the front's strength, on the line in a 9 technique. Today: front id bear.
- **The disguise** is in the description only when the shown coverage differs. Today: the coverage-id compare.
- **`src/playbook/alignment.ts`:** `export` added to 29 existing declarations (helpers, constants and engine
  switches) so the port can import them. That is an export-only diff; every changed line differs only by `export`. No
  existing file's behaviour changed.

## Equality (`test/ir-align.test.ts`): all equal

| set | count | unequal |
|---|---|---|
| offense: formations × flip × 3 ball spots | 144 | 0 |
| defense: formation × front × personnel × coverage | 25,344 | 0 |
| pressures × compatible coverages × fronts × personnel, on 2x2 and 3x1 | 13,244 | 0 |
| disguises (every coverage shown as every other) | 2,256 | 0 |

There is no remainder. The step-1 round trip (`test/ir-roundtrip.test.ts`) still passes.

## Geometry vocabularies and typed conditions the resolver uses (shared, not per preset)
- **Technique → lateral offset and gap:** `techniqueOffset`, `techniqueGap`, relative to the actual line
  (`inlineOf`, `tackleOf`, line splits), plus the edge technique set and the edge call (`EDGE_TECH`, `EDGE_CALL_TE`).
- **Zone id → pre-snap depth and shade, and landmark:** `zoneSpot`, `zoneLandmark`, `isDeepZone`. Prefix rules on the
  zone id also apply: `quarter*` safeties; `flat*`, `deep_third*` and `*_out` corner depth jobs.
- **Seat → role:** `seatRole`, `seatZone`. A side flip uses `flipZone`, `flipRef` and `otherSide`.
- **Situation depth by job** (`situationDepth`), and the coverage depth limit near the goal line (`coverageDepth`).
- **Typed conditions on the observed offense:** attached end on a side (`hasTE`), a wing, a near back, a detached #2
  or #3, the counts, strength (`frontSign`), and the receivers' numbering. These are inputs to the three `frontRules`
  and to the generic rules: the apex, BOX_ALIGN's answers, TIGHT_OFF, SLOT_LEV.
- **Split kind → width rule** (wide, slot, slot2, inline, wing, core, or a number) and **QB alignment → depth**
  (under, pistol, gun), inside `alignOffense`.

## Still not data (found doing this)
- **Slot labels are read as positions.** `slot.startsWith('CB')`, `'LB…'`, `/^(CB|NB|DB|SS|FS)/`, the man-matching
  order `CB_S, CB_W, NB, DB, SS, FS, LB_S, LB_W, LB_M, DE_S, DE_W`, corner and slot-DB checks by label, and the nickel
  and dime placement by `NB` and `DB`. A description that put a linebacker's body in a `CB` slot would be placed as a
  corner. The player's position is in the description (`who.position`); the code reads the label instead.
- **The offensive line is not described per player.** Its spots are today's fixed splits (alignOffense). An
  unbalanced line or a covered tackle cannot be written as a formation description today, so the acceptance case is a
  front. Writing an unbalanced line needs the line's five players in the description, which is the next offensive
  step.
- **The play context in alignOffense** (`ctx.run.scheme`: the back's stretch, inside-zone and counter offsets and the
  zone TE off the ball; `ctx.pass`: #1's route room) is still read by name. The catalog test passes no play context.
- **The three `frontRules`** are data on the front, but each rule's geometry is shared code: a typed condition plus a
  placement, not a per-player spot. A new conditional placement would need a new rule kind.

## Acceptance: a front not in the catalog, from a description only
A 5-1 in nickel personnel, cover3, against gun doubles: five on the line (the Will walked up as the weak stand-up
edge) and the Mike alone at 4.5 yd. `secondLevel` has one backer at the ball. It aligns through
`alignDefenseFromDescription` with no code added (depth past the line / yards from the ball):
- **On the line:**
  - DE_S 0.9 / −6.1 (the edge rule widens a 5 to a wide 9 with no tight end);
  - DT_S 0.9 / −1.5 and DT_W 0.9 / 1.5;
  - DE_W 0.9 / 3.7;
  - LB_W 1.0 / 4.7, a rusher.
- **Second level and coverage:**
  - LB_M 4.5 / 0, hook;
  - CB_S 7.3 / −14 and CB_W 7.3 / 16.5, deep thirds;
  - NB 4.5 / 9.1, curl-flat weak;
  - FS 14.5 / 0, deep middle;
  - SS 5.2 / −6.1, curl-flat strong.

That is five rushers on the line and eleven distinct spots. It does not run in the sim.
