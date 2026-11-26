# Call description, step 1: today's football as players, with an exact round trip (2026-11-25)

Rules + Coaching, for Integration's grammar plan ("one description, three readers"). Base: develop 47226b55d.

## What was built (`src/playbook/ir/`, new files only)
- `types.ts`: the description.
  - **Offense, per skill player:** who (slot) and where (side, split kind, depth). Call-level: personnel, the QB's
    alignment, tags. A pass gives each number a route by reference; the back's job is `block`, `check` or a route.
    A run carries its scheme as a reference.
  - **Defense, per fielded slot:** who (slot and the personnel's body), where (the front's technique, side and depth,
    when the front places him), fit, and what (coverage role, pressure rush gap or drop).
  - **Call-level:** coverage shell, man/press, look, family, underneath seats, checks, structure checks, needs; the
    pressure's counts and compatibility; the disguise; and every other call field the sim reads.
  - Names are namespaced `Ref`s (formation, front, coverage, coverage-family, pressure, concept, route, run-scheme,
    drop, pass-family): carried, never interpreted.
- `describe.ts`: presets → description.
- `lower.ts`: description → the Formation, DefensivePlayCall, PassConcept and RunConcept today's readers take. These
  are built from the description alone.
- No sim file imports any of it. No existing `src/` file changed; no export had to be added.

## The round trip (`test/ir-roundtrip.test.ts`)
Deep equality between today's alignment and the alignment rebuilt from the description:

| set | count | equal |
|---|---|---|
| formations × flip × 3 ball spots (`alignOffense`) | 24 formations, 144 alignments | all |
| formations × fronts × each front's personnel × coverages (`alignDefense`) | 24 × 14 fronts × 48 coverages = 25,344 | all; none throws |
| pressures × compatible coverages × fronts × personnel, on gun doubles and gun trips | 14 pressures, 13,244 | all |
| disguise: every coverage shown as every other (over, nickel, 2x2) | 2,256 pairs | all |
| concepts, as data (description → concept) | 32 pass, 6 screen, 13 run | all |

**Negative controls** (scratch script): changing one defender's technique in the description moves him (DT_S
24.56 → 25.70 yd across). Adding 1 yd to a receiver's depth moves him. The rebuilt alignment comes from the
description, not from the preset.

The round trip holds on the default flags. Alignment reads many environment flags (FRONT_ALIGN, BOX_ALIGN, OL_SPLITS
and others), and the description carries none of them.

## Still behind a name
These are the map for later steps. The description carries the name; the football lives in code.
1. **Front id**, read by name in alignment.ts:
   - `FAMILY[front.id]` → `BACKERS` (961): the linebackers' spots by front family;
   - Sam-on for over/even (967);
   - over's TE rule (1104);
   - bear's short package (1403).
2. **Coverage id:** compared only for the disguise (888).
3. **Zone id** (coverage role, underneath seat):
   - spot depth and shade (`zoneSpot`, 877);
   - landmark (`zoneLandmark`, 782);
   - the deep set (`DEEP_ZONES`, 862);
   - the zone's technique (radius, style, keys) in sim/behaviors/defense.ts.
4. **Underneath seats:** which remaining defender takes which seat is decided in alignDefense, in priority order, not
   by data.
5. **Vocabularies whose geometry is a table in code:**
   - technique (`techniqueOffset` 599, `techniqueGap` 672);
   - split kind (wide, slot, slot2, inline, wing, core: alignOffense, wideOffset, ROUTE_ROOM);
   - QB alignment (under, gun, pistol);
   - personnel (the bodies per slot: DEF_PERSONNEL and the offensive personnel tables).
6. **The play's football:**
   - run scheme (blocking.ts, assign.ts);
   - pass family and drop (called-drop.ts, qb.ts);
   - route (geometry by reference: the route table, BREAK_DECL);
   - coverage family and match rule (sim/coverage/rules.ts);
   - zone style (match, spot);
   - structure checks (structure.ts tags) and formation checks (`FormationKey`).
7. **Inputs outside the call that alignment reads:** the alignment context (team habits, line splits), the situation
   (down, distance, field), the style and the man preferences. These are a team's habits and the game state, not the
   call.

## Inconsistent or surprising in today's data
- **Fronts give spots to linebackers the personnel doesn't field.** 8 front × personnel pairs: over with nickel (no
  LB_S) and dime (no LB_S or LB_W); under, even and okie similarly; wide9 with dime; bear with heavy (no LB_W). The
  spot is silently ignored, so in nickel and dime who stands where among the second level comes from code (the family's
  `BACKERS` and the coverage seats), not from the front's data.
- **Alignment never threw** on any of the 40,844 defensive combinations, including fronts × personnel × coverages a
  coordinator would never pair. Nothing in the data marks a combination as illegal; that is the validator's step.
- **Pressures:** every pressure has at least one compatible coverage, and every compatibility name and check target
  resolves to a catalog coverage.
