# Call description, step 1c: the offense's alignment from the description alone (2026-11-26)

Rules + Coaching, for Integration's grammar plan. Base: develop d39266db7.

## What changed
- **`src/playbook/ir/offense.ts`** (new). Nothing in the sim imports it.
  - **`describeOffenseSnap(formation, ctx)`** is the preset step. It reads today's split-kind names, the QB alignment
    and the play by name, once, and writes the description for that call:
    - **Linemen:** each one's lateral spot from the ball and depth, from today's fixed splits and the snap's line set:
      short yardage, the team's width, pass or run stance depth.
    - **QB:** his depth.
    - **Each skill player** has an anchor:
      - a fixed lateral offset (a number, an attached end, a wing, the core);
      - a width from his sideline, his room by whether his side is the strong side, with the #1's route room and the
        team's habit already chosen;
      - or a share of the widest receiver on his side (a slot).
    - **Plus** his final depth and the on-line, backfield, attached and counts-toward-strength facts.
    - **A zone run's attached end:** may set off the ball (a hash of his spot), and the wide receiver on his side comes
      up.
    - **A gun stretch, inside-zone or counter run:** moves the backs to the play side (`backsToPlay`).
  - **`alignOffenseFromSnap(d, flip, los, ballY)`** places from the description with no formation, personnel, scheme or
    concept name read. Strength, numbering, the core edge and the counts are computed by today's geometric rules.
- **`src/playbook/alignment.ts`:** `export` added to 16 more declarations (offense constants and helpers). That is an
  export-only diff; no existing file's behaviour changed.

## Equality (`test/ir-offense.test.ts`): all equal
- 24 formations × 65 play contexts × flip × 3 ball spots = **9,360 alignments, 0 unequal.**
- The 65 contexts: no play; each of the 32 pass and 6 screen concepts; each of the 13 run concepts to both sides.
- Remainder: none. The step-1 and step-1b tests still pass.

## Acceptance (descriptions only, no code added)
- **Unbalanced, tackle over (I formation).**
  - On the line, 7, from left to right: Y as the attached end, 3.10 left; LG 1.54; C; RG −1.54; RT −3.10; LT −4.66 (the
    left tackle outside the right tackle); X wide right at −13.17.
  - Off: Z 15.67, 1.2 deep; H −5.96, 1.2; QB under center; RB 6.5.
  - The ends of the line are Y and X, both skill players.
  - A legality check would need to say:
    - seven on the line and at most four backs;
    - both end men eligible (Y and X), and the others on the line ineligible: here the tackle-over LT stands between
      the RT and X on the line, so he must be an ineligible number, and the RT is covered;
    - the short side's eligible end is the Y;
    - an eligible player covered on the line (none here) would be ineligible.
- **Tight bunch right with a stack left (gun).**
  - On the line, 7: Y attached at −4.62; X at 13.17; plus the five linemen.
  - The bunch: Z −6.62 at 1.2 deep, F −5.62 at 2.0.
  - The stack: H directly behind X at 13.17, 2.2 deep (a share of 1 of the widest on his side, the "relative to another
    player" anchor).
  - RB 1.0 offset at 4.5.
  - The ends of the line are Y and X, both eligible.
  - A legality check would need to say:
    - seven on the line, with the bunch's Z and F off it;
    - the stacked H is a back, off the line behind X;
    - no eligible end is covered.
  - The check caught my first draft, which had eight on the line (Z on the ball too).

## The play context, now data
- **`ctx.run.scheme`:**
  - the zone tight end's set off the ball becomes per-player `offBall`, with the hash share, his depth, and the wide
    receiver who comes up and his depth;
  - the gun backs' mirror to the play side becomes `backsToPlay`.
- **`ctx.pass` #1's route:** each side's room, by whether that side is strong, goes into the `sideline` and `share`
  anchors.

## Where the two resolvers still treat a slot label as a position (the next piece's map)
**Defense** (src/playbook/ir/align.ts, ported from alignDefense):
- **Linebackers by label:**
  - `['LB_W','LB_M','LB_S']` (134, 298, 316): off-ball backers, the apex and BOX_ALIGN walkers, depth shifts;
  - `['LB_M','LB_W']` (153): the mug;
  - `slot.startsWith('LB')` (148, 296, 616): not a lineman, a spent walker, the blitz creep;
  - `apexLB` LB_S / LB_W (257);
  - LB_S on the line rushes (340); LB_W and LB_M on the line rush (344).
- **Linemen by label:**
  - `dlSlots` DE_S, DE_W, DT_S, DT_W, NT (337): rush by default;
  - `end.startsWith('DE')` (96): the nickel end's technique;
  - DE_S and DE_W (410-413): the uncalled edge takes a man in a short man budget;
  - `frontSlots.DE_S?.depth` as the Sam's on-line depth;
  - `FRONT_PLAYERS` (327, 353): whose sides follow the front.
- **Defensive backs by label:**
  - `slot.startsWith('CB')` (174): zone corner depth habit;
  - `slot === 'NB' || 'DB'` (172): the slot zone spot;
  - `placeCorner('CB_S' / 'CB_W')` (195-196), `placeSlotDB('NB' / 'DB')` (216-217), and `has('NB')` (133, 259, 442):
    nickel present means no apex walk and no corner travel;
  - SS and FS by label (220-238): two-high deep halves, the one-high post and the down safety;
  - the man-matching order CB_S, CB_W, NB, DB, SS, FS, LB_S, LB_W, LB_M, DE_S, DE_W (428);
  - `corner` and `slotDB` (436); `boxMan` (447); `db` (466); `isCorner` (493, 651);
  - `['NB','DB']` (539): SLOT_LEV;
  - `/^(CB|NB|DB|SS|FS)/` (561): TIGHT_OFF;
  - FS and SS (658): SHELL_SHOW.

**Offense** (src/playbook/ir/offense.ts):
- `'RB'` (190): the primary back (B) is the RB by label;
- `'QB'` (137, 196): the passer by label;
- the zone tight end's off-ball hash uses his slot label as part of the seed, so a different label gives a different
  pick.

Every one of these is a position or role decided by the label, while the description already carries the body
(`who.position` on defense) and could carry the role. None of them is a preset name.
