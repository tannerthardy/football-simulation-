# The lead back by role; inside-zone stuffs with FIT_RULES on film (2026-11-27)

Rules + Coaching, for Integration. Base: develop 1a4201ec0.

## 1. The lead back from the roles (blocking.ts `secondBack`)
**The rule.** The lead back is a backfield player who is:
- not the carrier (the description's `roles.carrier`) and not the passer;
- level with or ahead of the carrier (no more than 0.25 yd deeper).

A back aligned behind the carrier does not lead: on the fullback dive from the I, the tailback carries out his fake.
In the I or an offset set with the tailback carrying, the lead back is the fullback. Split backs stand level.

- **Two such backs** (a three-back set; the catalog has none): the taught rule is that the playside back leads, the
  one nearer the point of attack, then the one ahead.
- **No named carrier:** B2, as before.

**Catalog: digest-identical, no flag.** All 8 game digests (seeds 1-8) equal develop's.
- Develop's `src` equals the step-6 head, and these are step 6's both-on digests: seed 1 `1aef6c0da9088114`.
- In the catalog the carrier is always the RB slot, and no formation has three backs.

**I pro, inside zone, F carrying** (16 seeds; `out/fcarry.ts`, the step-5 probe):

| | the RB's plan | F mean yards |
|---|---|---|
| develop | stalk FS | 3.00 |
| this branch | stalk LB_M | 2.68 |
| a first try in which the tailback led from behind | lead on LB_S | 2.26 |

- **On develop**, the carrier F was "the second back". His phantom lead plan claimed the Mike, so no blocker took the
  Mike, and the RB fell into the stalkers on the FS.
- **Now** the carrier has no lead plan. The RB, behind the carrier, gets no lead and still falls into the stalkers,
  now on the unclaimed Mike.
- Leading from 7.5 yd behind a 4.3-yd carrier cost 0.4 yd more. That fits the taught reason a trailing back does not
  lead: he arrives behind the ball.
- **Left alone, as asked:** the body and depth difference (F 109 kg, 8.96 yd/s, 4.3 yd deep; the RB 103 kg,
  9.46 yd/s, 7.5 yd deep).
- **Not done:** a back with no job falls into the stalkers. A tailback on the fullback dive should carry out a fake.

## 3. Inside-zone snaps that flip to or from a stuff with FIT_RULES (paired)
**Source.** The engine-111 replay cache: 16 games per path, A = all three off, B = FIT_RULES alone.
- 13 inside-zone snaps flip: 11 to a stuff (yards ≤ 0) and 2 away from one.
- Each was refilmed with its pre-snap jobs: kind, gap and side, with + meaning +y.
- Spots are given as depth/lateral from the ball.
- "Off" and "on" below are the A and B replays.

**Material flips (off ≥ 2.9 yd):**
1. **g9 #40, ace_11 vs nickel cover 3 seam, weak: 7.0 → −1.4.**
   - The only job change: the SS force gains a fold, C−.
   - The stop is DT_S (3 technique, B−, unchanged) at 1.90 s, before the line. Off, the back hit the A gap at 2.35 s.
   - **Indirect, plausibly right:** the fold changed the back's cut, not anyone's fill.
2. **g16 #96, gun_doubles_11 vs dime cover 2 man, strong: 8.1 → −1.1.**
   - The SS, man on the back at 3.6/1.3, becomes insert A−. The Mike moves from A− to B+.
   - Off, the run bounced to y −4.2 and the alley CB and FS tackled it.
   - **Right football:** the man on the back fits with his man, and the second level fills its interior gaps. It is
     step 3b's man-on-a-back extension, at work.
3. **e3 g5 #96, ace_trips_11 vs nickel cover 4 meg, strong: 5.3 → −0.5.**
   - The rolled-down SS (3.4/−5.6) becomes insert B−. Off, the run hit y −2.0, B−, for 5.3.
   - The Mike crosses 3.3 yd to A+ (the inside-out order among SS, Mike and Will) and the Will takes C+.
   - DT_S and DT_W make the stop.
   - **Right football:** a second-level defender with an interior gap fills the gap the run hit.
4. **e3 g6 #124, pistol_11 vs nickel cover 4, strong: 6.6 → 0.0.**
   - Off, the Will (5.7/−2.1) had A+ across the ball, and the run went through the B− he left (y −2.2).
   - On, he keeps his own B− and the Mike's force gains an A+ fold.
   - **Right football:** a crossing fit is removed.
5. **e3 g15 #69, gun_doubles_11 vs nickel cover 1, strong: 2.9 → −0.3.**
   - The Will is walked up at 1.0/−1.5, in man on the back. He goes from insert A+ to **edge D+**, 5 yd away, the gap
     the NB force also owns. A+ is left to no one.
   - DE_W (B+, unchanged) makes the stop.
   - **Wrong fit, right result:** two men in D+ and an open A gap. See the finding.

**Marginal flips (off within 0.5 yd of zero; the stuff line decides them):**
6. **g1 #110 (0.0 → −0.6):** the mugged Will (1.2/−0.7) goes from force D+ to interior A−, the gap he stands in.
   Right.
7. **g2 #132 (0.3 → 0.0):** the mugged Mike's job becomes interior at his own A+; the NB force gains a B− fold. Right.
8. **g9 #77 (0.3 → 0.0):** the Sam on the line (0.9/−6.0) becomes an edge; the SS becomes force. Right.
9. **g9 #82 (0.3 → −0.6):** a quarters corner at 6.1/6.3 gains insert B+. Doubtful: a corner as an interior fitter
   from 6 yd outside. DT_W (unchanged) makes the stop.
10. **e3 g16 #21 (0.3 → −0.6):** the press NB at 1.3/**+6.9** gets insert **D−**, the far side, about 11 yd away.
    Wrong, and inconsequential here: the line made the stop.

The two flips away from a stuff (g5 #86, g8 #121) are marginal. In each, a safety gains an insert (B+ or C±) and the
Mike changes gap.

**Read.**
- Of the five material flips, three are right football (2, 3, 4) and one is an indirect consequence of a fold (1).
- One has a wrong fit that the line covered (5).
- The marginal ones mostly put a walked-up backer into the gap he stands in. That is right.

## Finding (not fixed; reported first, as asked)
**Label-free fits can give a man a gap far from where he stands.** In the on-path run snaps (663 snaps, 4,138
gap jobs), 275 jobs had the gap more than 3 yd from the man with FIT_RULES on, against 145 in the faithful path. There
are two sources:
1. **A front player keeps his alignment spot's gap** (`sp.gap` and `sp.gapSign` in fits.ts), not the gap he stands in.
   A backer walked onto the line keeps his off-ball gap.
   - Example: e3 g15, the Will at −1.5 keeps D+.
   - Counted on-line: edge 13, insert 22.
2. **The second level takes leftover gaps inside-out with no reach limit.** R1's "wherever the zone aligns him" lets
   an apex at 11 yd lateral take the A gap on the far side.
   - Examples: NB at y 11.0 → A−, 11.7 yd; SS at 7.4 → A+, 6.7 yd; FS at −5.9 → A−.
   - Counted: off-ball zone 183, man 44, blitz 13.

Both put a man where he cannot arrive in time and leave the gap he stands near to someone else. That is the "two men
in one gap, a lane behind" pattern.

**A taught repair to rule on:**
- a front player fits the gap he stands in (by `gapY` from his position);
- a second-level fitter takes a leftover gap only within reach (his own side, or the nearest gaps); beyond reach, a
  gap is unowned or goes to the next fitter, which FIT_RULES already reports.

Census: `scripts/diag/paired/fit-reach.ts` on the replay cache's setups.
