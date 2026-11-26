# Run-fit rules, step 3b: rulings R1-R3, the label-free revision, dime seating, cutover impact (2026-11-26)

Rules + Coaching, for Integration. Base: develop e98c496a1. This piece is a sidecar: run-fits.ts and the faithful mode
are untouched.

## Rulings (Integration, by research and reasoning, at Tanner's request)
- **R1. The insert pool by job, not by distance or label. High confidence.**
  - A second-level defender with an underneath-zone job keeps a run fit wherever the zone aligns him. An apex is the
    force-and-fold player: force if the run goes outside him, fold to his interior gap otherwise.
  - A man defender on a detached receiver is out of the interior fit. His gap goes to the next second-level zone
    defender inside out, then to a low safety; otherwise it is unowned.
  - Sources: the apex aligns "between the EMOL and #2, 4–5 yd off" (defensive-alignment-sources.md:256, 368).
- **R2. Fits are relative to flow. Medium-high confidence.** A job may be flow-relative:
  - lag nose: the A gap away from flow;
  - playside inside backer: the open playside A;
  - backside backer: overlap and cutback;
  - edges: C on an open side; on an attached end's side, squeeze.
  - Sources: fangio-system.md:51 (gap + ½: "the backers overlap to fit off of the front"); outside Tite clinic material.
- **R3. The dime back is the Will with a defensive back's body. Medium confidence.** He takes the absent Will's seat
  (the weak hook, beside the Mike), and he walks out to the apex by R1 when the offense detaches a receiver to his side.
  - **Push-back (sources):**
    - fangio-system.md:21 defines the repo's dime as "`DB`, or `LB_W` in nickel personnel (the weak apex)": by
      default, the dime is the weak apex.
    - Only line 234 (HNFL-056, the "Danger" call) puts "Mike & Dime align inside", and in that call the FS is the weak
      apex.
    - So the sources support R3's dime inside for that call. As a default rule they support the weak apex, which is
      close to where today's code puts him (see Dime seating). R3's weak hook against an attached end and a back is
      not contradicted, but neither line states it as the default.

## The label-free revision (`src/playbook/ir/fits.ts`; the faithful mode is unchanged)
- **The insert pool, by job (R1).** It is the second-level defenders (at most 7 yd deep) who meet any of these:
  - an underneath zone, wherever it aligns him;
  - a deep zone at second-level depth inside the core (a Tampa Mike reads run before the pipe);
  - man on an attached end or a back;
  - a spy.

  A second-level blitzer is an inserter on his blitz gap. A man defender on a detached receiver is an alley player.
  The 5.5-yd box limit applies only in faithful mode.
- **Low safety (R1).** An underneath-zone defender deeper than 7 yd (a robber) takes a gap only when the second level
  leaves one.
- **Inside-out (R1).** The second level takes the leftover gaps with no two fits crossing. So widening a man does not
  trade his gap with another's, and the Mike, being inside, takes the inside gap.
- **Flow (R2).** Each job carries its flow-relative form (`flow`). A gap closed by a flow rule is reported in `byFlow`,
  not `unowned`:
  - squeeze: C on an attached end's side, with a line player claiming D;
  - lag: an A gap whose partner is owned by a lag nose, with an insert backer present.

**What the sim already does after the snap (run-fits.ts):**
- **Lag** is flow-relative. When the runner's lateral speed is over 0.8 yd/s, the lag nose takes the A gap away from
  flow (`run-fits.ts:645`).
- **Force-and-fold** is R1's shape. A force player with an inside duty plays it unless the runner is already outside
  the blocking surface (`run-fits.ts:508-515`).
- **Insert backers** flow inside-out with the ball's track (FLOW_READ, LB_LINE_FLOW). There is no backside overlap or
  hold: every insert moves toward the ball. Only `cutback` (from a called gap exchange) holds the backside.

## Faithful against revised label-free
**Catalog (43,340 calls):**
- Label-free differs on 35,267.
- Calls with an unowned gap: faithful 21,138, label-free 5,092.
- Faithful still equals today on all 43,340 and on 60 game-flow plays.

**Game-flow calls (6,000 drawn by the coordinators, game-weighted):**
- Jobs change on 4,624 (77.1%).
- Calls with an unowned gap: faithful 2,476 (41.3%), label-free 555 (9.3%).

**Groups (share of calls), with my judgement:**

| change | calls | judgement |
|---|---|---|
| NB in an underneath zone: alley → insert | 17.6% | correct (R1; the nickel is a box fitter) |
| NB as force gains a fold | 14.3% | correct (R1 force/fold) |
| SS in an underneath zone: alley → insert | 14.2% | correct (a rolled-down safety is a fitter) |
| the Mike's gap changes, inside-out | 11.3% | correct (the inside man takes the inside gap; it agrees with the matrix) |
| other backers' gaps change, inside-out | 5.4% | correct |
| other forces gain a fold (LB 5.3%, SS 4.5%, DB 4.2%, Mike 2.6%) | — | correct |
| a blitzing NB or SS: alley → insert | 4.0% / 1.0% | correct (a blitzer attacks his gap) |
| DB in a zone: alley → insert | 3.7% | correct (R1/R3) |
| a walked-up Mike: insert → interior | 2.0% | correct (a mugged backer is a front gap player) |
| a backer in man on a detached receiver: insert → alley | 1.8% + 1.2% | correct (R1) |
| bear: Sam on the line force → edge, SS → force | 1.7% / 1.4% | correct |
| a safety or DB in man on an attached end or a back: alley → insert (SS 8.9%, FS 7.2%, CB 1.3%, DB 1.2%, NB 1.1%) | ~19.7% | **doubtful.** My extension of R1, the man-run rule "if my man blocks, I fit". R1 rules only on detached receivers. |
| a Cover-2 corner as force gains an interior fold | 6.8% | **doubtful.** A hard flat corner folding inside may be wrong. |
| a man-converted end aligned off the line: edge → insert or force | 1.2% + 0.8% | **doubtful** |
| a backer walked onto an end in man: insert → edge | 0.8% | **doubtful** |

**Not cut over.** If run-fits.ts read the revised function, jobs would change on about 77% of game calls. Most of that
change is the nickel, the rolled safety and the inside-out ordering, which I judge correct. About a fifth of calls
carry the doubtful man-on-inside extension.

## Perturbation cases and fronts (label-free; `test/ir-fits-cases.test.ts` prints the tables)
- **(a) Over base, cover 3, against ace_11.**
  - DE_S C strong; DT_S B strong; DT_W A weak; DE_W C weak.
  - **Mike A strong;** Will force weak, folding to B weak; Sam insert D strong; SS force strong.
  - Nothing unowned.
  - It now matches the matrix outright. Faithful mode had Sam on A and Mike on B, a GAP_MATCH near-tie.
- **(b) The safety's body in the Sam's spot:** the jobs are identical, and the test asserts it. Faithful mode leaves A
  strong unowned.
- **(c) The Sam widened 1, 2 or 3 yd:** he keeps the same job at every width (insert D strong; the SS is the strong
  force by his curl-flat seat), and nothing becomes unowned. The test asserts it.
- **(d) Nickel and dime.**
  - **Nickel:** Mike A strong; Will B weak; NB force weak; SS force strong.
  - **Dime as aligned today:** Mike A strong; NB force weak, folding to B weak; DB (strong apex, curl-flat) force
    strong; SS insert D strong. Nothing unowned. Faithful mode leaves A strong unowned.
  - **Dime with the DB beside the Mike:** he is force strong, folding to A strong; Mike B weak.
- **(e) 12 personnel.**
  - **Cover 3:** SS force strong; Sam D strong; Mike A strong; Will force weak, folding to B weak.
  - **Quarters:** Sam force strong; Mike A strong; Will force weak, folding to B weak; the safeties are alley.
  - **Cover 2:** corners force; Sam D, Mike A, Will B.
  - Nothing unowned in any of the three.
- **(f) nickel_edge from Over nickel against 2x2:** B weak unowned; declared, it is conceded. The test asserts it.
- **Tite, Penny and Mint against ace_11, gun_doubles_11 and ace_12, cover 3 and quarters.** Nothing is truly unowned
  in any of them.
  - **Tite:**
    - the 4i's take B and B (control); the nose takes A weak (lag: the A away from flow); the Mike takes A strong;
    - the C gaps are the forces' folds (SS and Will in cover 3);
    - in quarters, C strong is closed by the **squeeze** flow rule (the 9 technique outside the attached end), and the
      Mike, holding the strong curl-flat seat, becomes the strong force folding to A.
  - **Penny:** the 4i's take B and B; the nose lag A weak; the Mike A strong; LB_W on the line at D weak; the NB and SS
    fold to C.
  - **Mint:** the same front; the Will (4.3 / 3.9) takes C weak or A strong, depending on which backer the coverage
    seat makes force.
  - R2's honest Tite picture holds:
    - B and B closed by the 4i's;
    - the A gaps shared by the lag nose (backside) and the playside backer;
    - C by squeeze or fold.

    Pre-snap, the function writes the lag as "the A away from flow" and the inserts as "flows inside-out with the
    ball", which is how the sim plays them.

## Dime seating (report only; no behavior change)
**What decides it today (alignment.ts):**
- **Spot by label (`placeSlotDB`, 1059-1077).**
  - The nickel goes to the side with a detached #2 (strong by default) and the DB to the other side.
  - Each is over his side's detached #2, or at a 6.5-yd apex when that side has none, at 5 yd (1.5 against press).
- **Seat by distance (1216-1244).** In zone, the call's underneath seats in priority order go to the free defenders
  by the least total distance to the seat landmarks.
  - From the apex, the DB takes his side's curl-flat or hook.
- **Man by label order (1288).** Man matching runs CB_S, CB_W, NB, DB, SS, FS, LB... (`DB` before the backers).

**What R3 assigns instead** is the seat and spot the nickel Will has in the same call: at 4.6 yd, 2.2 yd weak of the
ball, beside the Mike. Columns: today, the dime DB; R3, what the nickel Will has.

| family | against 2x2 or an attached end (ace_11, gun_doubles_11) | against trips, 12 or 21 |
|---|---|---|
| cover3 | today: curl-flat strong at the strong apex (+6.8). R3: hook weak (or hook strong or mid, by call) inside | today: curl-flat weak at the weak apex. R3: curl-flat weak from inside (4.6 / −2.2), or hook weak |
| cover2, tampa2 | today: hook strong or curl-flat strong at the strong apex. R3: hook mid, hook weak or hook strong inside | today: hook weak or curl-flat weak at the weak apex. R3: the same seat from inside |
| cover4, cover6 | today: curl-flat strong (curl strong) at the strong apex. R3: hook mid or hook strong inside | today: curl-flat weak, hook weak or hook mid at the weak apex. R3: the same seat from inside |
| cover1, cover2man | today: man on B at 5 yd (as the Will); man on S2 at 4 yd; or hook-mid or hole at the apex. R3: man on B | today: man on S3 (trips; pressed at 1.3 or 6 yd off), W2 (12) or B2 (21). R3: man on B |
| cover0 | today: robber at the apex (1.5 / +6.5) or man on S3. R3: robber at 4.6 / −2.2 | the same |

**Where R3 is unclear:**
- **Man families against trips.** Today the dime takes #3, inside, because label order gives a DB a receiver before
  any backer. R3 would give him the back. In dime against 3x1, a DB on #3 is the common teaching, so R3 should probably
  say the dime takes the Will's man only when the Will's man is the back.
- **The default seat.** fangio-system.md:21 has the dime as the weak apex by default, and today's code puts him at an
  apex. R3's inside-hook default rests on line 234's Danger call.
- **The side.** Today the DB goes opposite the nickel, which is the strong side when the nickel goes weak (against
  ace_11). R3's weak hook is relative to the Mike. Against an attached end and a back, "weak" needs the passing-strength
  definition (line 21's E1 note).

## Information check
Every rule uses what a player sees before the snap: alignments, the call's seats, the front's techniques and the
offense's structure. Flow is read after the snap, as the sim already reads it. No rule needs private information.
