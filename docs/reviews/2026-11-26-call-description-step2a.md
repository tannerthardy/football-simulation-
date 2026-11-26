# Call description, step 2a: the legality and accounting checker (2026-11-26)

Rules + Coaching, for Integration's grammar plan. Base: develop 13a649079. Default flags; no env flags.

## What changed
- **`src/playbook/ir/check.ts`** (new). Nothing in the sim imports it, and it feeds no play's outcome.
  - It reads only a description and the alignment resolved from it. It reads no preset name.
  - `checkOffense(desc, alignment, routes?)` and `checkDefense(desc, alignment, offense)` return issues of the form
    `{ level, kind, detail }`.
  - Bodies: `MIN_BODY_RADIUS = 0.22` yd is the smallest radius in the player model (`src/players/physical.ts`:
    `clamp(0.24 + (weight − 180) / 1100, 0.22, 0.42)`).
    - Two bodies overlap when their centres are under 0.44 yd apart.
    - A defender is in the neutral zone when his centre is under 0.22 yd past the line.
- **`src/playbook/ir/offense.ts`**: three facts added as data, written by the describer from today's tables.
  - `who.position`: the personnel's body for the slot.
  - `who.eligible`: true for the skill players, false for the linemen.
  - `requires`: what the call cannot run without, such as a split zone's slicer or a screen's receiver by number.
  - `motion` (slot and direction): the catalog calls none, so it is written only by hand.
  - The step-1c equality still holds: 9,360 alignments, 0 unequal.
- **`test/ir-offense.test.ts`**: the step-1c bunch+stack acceptance description had 12 men (six skill players and a
  back). The checker caught it. That backfield is now empty, so the formation has 11 men. No assertion changed.
- **`test/ir-check.test.ts`** (new; in the engine-pin defaults).

## Rules
| level | kind | rule |
|---|---|---|
| error | offense-count / defense-count | 11 men |
| error | line-count / backs-count | at least 7 on the line, at most 4 off it |
| error | end-ineligible | each end man of the line is eligible |
| error | covered-route | an eligible player covered on the line is given a route (not `block`) |
| error | motion-count / motion-forward | at most one man in motion, and he is not moving toward the line |
| error | overlap | two bodies whose centres are under 0.44 yd apart (both teams) |
| error | neutral-zone | a defender whose centre is under 0.22 yd past the line |
| error | unaligned | a described defender with no spot (playsim.ts:422) |
| error | structural:slicer | split zone with no slicer, using blocking.ts:999-1001's definition (blocking.ts:1001) |
| error | structural:receiver | the screen receiver's number is not in the formation (assign.ts:717) |
| error | structural:stem | a stem from a front that lacks this personnel (playsim.ts:531) |
| error | structural:creep | the creep slot is not on the field, or is not a blitzer (playsim.ts:543/545) |
| error | structural:presnap-time | a stem or creep that does not start within 0-3 s of the snap (playsim.ts:529) |
| warning | gap-unfit | a live gap with no fitter: a defender within 7 yd whose spot carries that gap and side (A, B and C each side, plus D outside an attached end; with no attached end, a D-labelled wide technique fits the C) |
| warning | receiver-unaccounted | in man, eligible receivers left without a man outnumber the spare underneath zone players; in zone, fewer coverage players than eligible receivers |
| warning | no-deep | the shell is not zero, and nobody is in a deep zone or man over the top |
| warning | pressure-off-field | a pressure's blitzer or dropper is not on the field |
| warning | front-spot-ignored | the front places a slot this personnel does not field |

## The catalog (run in the test; not fixed)
The run covers the following, with no flip and the ball in the middle:
- **Offense:** 24 formations × 65 play contexts, which is 1,560 calls. Pass contexts carry the concept's routes.
- **Defense:** every formation × front × personnel × coverage (25,344), plus each pressure × compatible coverage ×
  front × personnel on gun doubles and gun trips (13,244). That is 38,588 calls.

**Offense, errors:**
- **overlap, 64 calls.** In gun split 11, gun split 21, gun split twins 21 and gun split 20, the gun run's
  `backsToPlay` moves both backs to the same spot, 0.00 yd apart. This happens on inside zone, outside zone, wide zone,
  split zone and counter, to both sides. For example, `gun_split_11 run iz_strong`: RB and H are 0.00 yd apart.
- **structural:receiver, 18 calls.**
  - `te_screen` needs S3, and 17 formations have no S3 (for example `gun_doubles_11`).
  - `rb_slip_screen` needs B, and `gun_empty_11` has no B.
- **structural:slicer, 24 calls.** Split zone has no slicer in 12 formations × 2 directions: gun doubles, trips, trey
  and bunch; gun empty; ace; pistol; ace trips; gun spread 10; gun trips 10; ace 12; and pistol 12. In 12 personnel
  the second tight end is attached, so he is not off the ball.
- There are no count, line, end, covered-route or motion errors.

**Defense, errors:**
- **overlap, 82 calls.**
  - Against gun split twins 21 in dime, on the over, wide9, even and okie fronts, DE_S and DB are 0.43 yd apart.
  - Against I jumbo 22 on bear heavy, DE_W and CB_W overlap.
- There are no count, neutral-zone, unaligned or structural errors.

**Defense, warnings** (calls showing each kind):
- **gap-unfit: 29,235.** The kind is concentrated by front:
  - Fronts with a 0-technique nose (tite, odd, bear, penny, mint, okie, bear34 and under34 in some calls) are missing
    one A gap, because the nose's spot carries one gap and one side.
  - Under, in base and nickel, leaves the weak A gap unfit.
  - Wide9 nickel and dime leave both A gaps and the strong C unfit.
  - Over dime leaves the weak B unfit.
  - Stack 3-3 leaves both B gaps and the weak A unfit.
  - Over and even in base and nickel warn on 5-8% of calls.
  - Example: `gun_doubles_11 over nickel cover3_buzz`: the strong-side D gap is unfit.
- **front-spot-ignored: 14,032, which is 8 front × personnel pairs:** bear×heavy, even×dime, even×nickel, okie×dime,
  over×dime, over×nickel, under×nickel and wide9×dime.
- **pressure-off-field: 1,948.** For example, `will_b cover1 over dime`: LB_W has a pressure job and is not on the
  field.
- **receiver-unaccounted: 496.** For example, `mug_fire cover2man tite base34` against gun doubles: W2 has no man, and
  no spare player is underneath.
- **no-deep: 228.** For example, `bear goalline cover1`: the shell is one-high, and nobody is deep.

## Hand-written descriptions
- **Tackle over:** clean.
- **Bunch+stack:** clean, after the 12-man fix. Every number was given a go route.
- **5-1 nickel:** no errors. One warning: the weak A gap is unfit. Its one backer is at the ball.

**Negative controls:** one illegal description per error kind, all caught: offense-count, line-count, backs-count,
end-ineligible, covered-route, motion-count, motion-forward, overlap (both teams), structural:receiver,
structural:slicer, defense-count, neutral-zone, structural:stem, structural:creep, structural:presnap-time and
unaligned.

## Structural throws in src/sim (call structure)
- **blocking.ts:**
  - 989: the H pull tag is valid only for Counter GH.
  - 1001: split zone requires a slicer. **Checked.**
  - 1269: Counter GH requires a pulling backside guard and an off-ball H, and no tackle pull.
  - 1278: Counter GH requires an installed second-level backer.
- **block-look.ts** 19, 46 and 48, and **assign.ts** 113 and 114: the block look needs a detached perimeter receiver,
  a positive release time and a visible corner.
- **assign.ts:717:** the screen receiver is not in the formation. **Checked.**
- **playsim.ts:**
  - 417 and 422: a lineup slot has no alignment. **422 is checked as `unaligned`.**
  - 450: no QB. Implicit: the description always has one.
  - 529: pre-snap movement must start within 0-3 s. **Checked.**
  - 531: a stem front requires compatible personnel. **Checked.**
  - 543 and 545: the creep slot is missing, or the creep requires a called blitzer. **Checked.**
- **lineup.ts** 15 and 23: an unsupported or invalid lineup slot.
- **Not call structure:** the flag-combination throws in engagement.ts (986, 1089, 1402 and 1633) and the runtime or
  trace throws.

## What the rules could not express
- **Protection.** The description carries no protection, so a protection count (who blocks whom against how many) is
  out of scope.
- **Counter GH and the block look.** These are not described today: the scheme and the look are behind a name, and the
  pullers, backer and corner are chosen in code. So blocking.ts 989, 1269 and 1278, block-look.ts and assign.ts
  113/114 are not checked.
- **Two-gap techniques.** Each defensive spot carries one gap and one side, so a 0-technique nose's second A gap is not
  data. In odd fronts, gap-unfit mostly reports that missing fact. Fixing it needs a two-gap fact on the technique or
  the player.
- **Motion.** It is only data written by hand. The catalog has no motion, so it shows no motion errors.
- **Eligibility by number** (a jersey-number rule) is not modelled. `who.eligible` is the position's default.
- **Lineup slots** (lineup.ts) are not checked, because the description has no lineup.
