# The drop-back concepts we were missing (2026-11-11)

Rules + Coaching, for Tanner via Integration. Flag `CONCEPT_MENU` (off):
`src/playbook/concepts.ts` (`MENU_CONCEPTS`), the new `back_out` route, and
`backRelease` in `src/sim/assign.ts`.

**The question.** The playbook-coverage count
([report](2026-11-11-playbook-coverage.md), BDB `routeRan` on drop-back passes)
found that only 54% of NFL formation sides, and 22% of drop-backs with both
sides, were combinations our 17 concepts ran. Build the missing drop-back
concepts in order of NFL frequency, screens excluded, as real concepts:
- the routes;
- the quarterback's progression, with a note of the intended key;
- the coverages each is meant to beat.

**Caveat.** C9 (the break on the ball) and C14 (completion barely depending on
openness) are unfixed, so any pass concept looks too productive. These are
judged on whether the routes and reads are right, not on yards.

## The concepts

Fifteen concepts.
- **Strong side:** #1–#2 is a missing two-receiver pair, and #3 a missing trips
  side.
- **Weak side:** a common NFL pair.
- **The back:** runs angle, out or wheel, the NFL back routes we lacked (16.8%,
  7.4% and 2.0% of drop-backs). Two backs check instead, because the
  quarterback checked down to a released back.
- **`read`:** a plain-text note of the intended key and rule. The quarterback
  runs `progression`, ordered to match. The read schema waits for Tanner's
  research document.

| concept | strong #1 / #2 / #3 | weak #1 / #2 | back | beats | first reads |
| --- | --- | --- | --- | --- | --- |
| double slants | slant / slant / flat | go / hitch | block | Cover 3, man | S2, S1 |
| fade-flat | go / flat / hitch | hitch / go | check | Cover 2, man | S1, S2 |
| hitch-post | hitch / post / flat | go / hitch | angle | Cover 3, Cover 1 | S2, S1 |
| double outs | out / quick out / hitch | hitch / out | angle | Cover 3, Cover 1 | S2, S1 |
| hitch-out | hitch / quick out / hitch | slant / hitch | out | Cover 3, Cover 4 | S2, S1 |
| seam-slant | go / slant / hitch | slant / go | block | Cover 1, Cover 3 | S2, W1 |
| hitch-cross | hitch / cross / flat | go / shallow | out | Cover 1, Cover 3 | S2, W2 |
| post-cross | post / cross / hitch | go / hitch | block | Cover 3, Cover 1 | S1, S2 |
| corner-out | corner / quick out / hitch | hitch / go | check | Cover 2, Cover 4 | S1, S2 |
| corner-flat | corner / flat / hitch | slant / hitch | check | Cover 2, Cover 3 | S1, S2 |
| trips hitch-flat | hitch / hitch / flat | go | angle | Cover 3, Cover 4 | S3, S2 |
| trips sail | go / out / hitch | hitch / hitch | out | Cover 3 | S2, S3 |
| seam-hitch | hitch / seam / hitch | hitch / seam | wheel | Cover 3, Cover 1 | S2, S1 |
| trips outs | go / out / quick out | hitch / go | block | Cover 3, Cover 1 | S2, S3 |
| verticals-hitch | go / seam / hitch | go / hitch | check | Cover 3, Cover 1 | S2, S3 |

**The back's named route.** With `BACK_RELEASE` (off; Integration approved it
for Run Game), a concept that names the back's route gives it to him. The
release decides only whether he is free to run it, or checks first against a
full box (`test/back-release.test.ts`).

## Fixtures (`test/concept-menu.test.ts`)

1. **Completeness.** Every route exists, the progression is on the concept's own
   receivers, and each concept has a read note and a coverage it beats.
2. **The routes run as drawn.** Each numbered receiver runs his assigned route,
   and its last leg goes the way it is drawn (lateral direction; a deep route
   still climbing). The drawing is checked until the quarterback scrambles.
   - Throws are held here, so he eventually leaves the pocket.
   - A deep route with a defender on him is excused: a slot post stalled 0.8 s
     against a man nickel standing in his lane, an execution finding for the
     receiver lane.
3. **The first two reads get the ball** against the coverage each is drawn to
   beat, 12 plays each:

   | concept | first two reads / throws |
   | --- | --- |
   | double slants | 8/9 |
   | fade-flat | 8/10 |
   | hitch-post | 4/8 |
   | double outs | 10/10 |
   | hitch-out | 12/12 |
   | seam-slant | 4/8 |
   | hitch-cross | 5/8 |
   | post-cross | 4/6 |
   | corner-out | 5/9 |
   | corner-flat | 7/9 |
   | trips hitch-flat | 6/11 |
   | trips sail | 7/10 |
   | seam-hitch | 12/12 |
   | trips outs | 10/12 |
   | verticals-hitch | 6/9 |

4. **Trips #3 is read as #3.** For every trips concept, the hook defender's own
   release reader, through his perception, declares the release #3's route
   shows before the route breaks. The C12 recount will depend on this.
   - A stem reads vertical first; a flat reads flat.
   - In 3x1 our #3 is an attached tight end, whose release through the edge
     takes longer than a slot's.

## Gates

**Playbook coverage** (BDB drop-back passes, `routeRan`):

| | before | with the menu |
| --- | --- | --- |
| formation sides we run | 54.2% | **66.4%** |
| drop-backs, both sides run | 21.7% | **38.5%** |
| drop-backs, exactly one concept | 5.1% | **8.6%** |

The largest NFL pieces still missing (each 0.5–0.8% of sides):
- in + post, cross + in;
- out + corner, out + flat, in + out, out + in, in + flat;
- post + go.

**Target mix by route class.** League-sampled, coach-sampled games
(`collect.ts`, two 16-game sets per arm, seeds 101 and 201, unpaired) against
NFL drop-backs (no play action, no screens):

| | off | on | NFL |
| --- | --- | --- | --- |
| quick < 10 yd | 27.5% | **37.8%** | 39.6% |
| breaking 10–19 yd | 27.0% | **20.5%** | 12.2% |
| flat / angle | 17.7% | 14.9% | 19.7% |
| cross | 12.1% | 9.1% | 9.2% |
| vertical / deep | 15.6% | 17.8% | 19.3% |
| outs (label) | 9.6% | 15.7% | 16.6% |
| ins (label) | 13.0% | 6.8% | 7.6% |
| slants (label) | 5.8% | 7.8% | 7.8% |
| the back's angle (label) | 0% | 1.3% | 4.8% |
| hitches (label) | 25.4% | 26.3% | 19.5% |

- Every class except flat moves toward the NFL; flat moves away, because two
  concepts now check the back.
- Yards an attempt fall from 9.65 to 8.93 (NFL 6.84). Completion is 59.0% →
  59.6% (NFL 61.9%). Sacks are 2.4% → 2.5%.

**Can our quarterback execute them?** The same games, new concepts only:

| concept | called | completion | Y/A | first two reads | where the ball goes |
| --- | --- | --- | --- | --- | --- |
| trips sail | 3.8% | 59% | 9.0 | 82/109 | #2 out 68, #3 hitch 14 |
| double outs | 3.3% | 50% | 7.9 | 69/98 | #2 quick out 59 |
| corner-out | 4.2% | 55% | 8.3 | 80/119 | #2 quick out 41, #1 corner 39 |
| seam-slant | 2.4% | 65% | 7.7 | 56/68 | #2 slant 30, W1 slant 26 |
| hitch-out | 2.2% | 50% | 6.8 | 47/66 | #2 quick out 38 |
| trips outs | 3.1% | 69% | 13.6 | 61/87 | #2 out 52 |
| double slants | 2.2% | 61% | 7.6 | 42/62 | #2 slant 33 |
| hitch-post | 3.2% | 58% | 8.1 | 57/88 | post 29, hitch 28 |
| hitch-cross | 4.1% | 69% | 8.0 | 63/115 | weak shallow 63, hitch 29 |
| post-cross | 4.3% | 55% | 7.8 | 63/114 | cross 33, post 30 |
| seam-hitch | 4.1% | 63% | 8.9 | 58/116 | seam 38, W1 hitch 34 |
| verticals-hitch | 3.1% | 63% | 6.9 | 48/89 | seam 26, #3 hitch 22 |
| trips hitch-flat | 2.0% | 64% | 8.1 | 26/59 | #2 hitch 19, back angle 13 |
| corner-flat | 3.9% | 57% | 10.1 | **46/112** | corner 38, **checkdown 26** |
| fade-flat | 3.7% | 56% | 8.4 | **34/102** | **checkdown 31**, fade 23 |

**Two concepts are not executed as drawn.** On fade-flat and corner-flat the
quarterback goes past both high-low reads to the checkdown.
- With fade-flat's back released on an angle at once, the angle took 27 of 61
  throws. Making him check still leaves 31 of 102 checkdowns.
- A deep route over a flat is a keyed read: throw the flat when the corner
  sinks, the fade when he squats. A fixed progression that waits on the deep
  route doesn't run it.
- This is "the quarterback has no keyed read", recorded in GAPS, for the QB
  document Tanner is writing. The concepts are drawn correctly.

## Checks

- `npm run typecheck`: clean.
- `npm test`: 419 files / 3,984 tests pass at a9bcc941.
- `test/concept-menu.test.ts` and `test/back-release.test.ts` pass.
