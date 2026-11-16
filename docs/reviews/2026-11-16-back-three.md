# BACK_AS_THREE: the back as #3 for stick, flood and pa_flood from 2x2 (2026-11-16)

Rules + Coaching, on Integration's ruling: build it straight after CONCEPT_FIT, as its own off flag. It is carded as
CONCEPT_FIT alone and as CONCEPT_FIT plus this flag. It is stacked on rules/concept-fit
(docs/reviews/2026-11-16-concept-fit.md).

## Why
CONCEPT_FIT takes stick, flood and pa_flood off the menu wherever there is no #3. That is half the formations, and those
concepts are staples from 2x2 with the back filling #3, so taking them off is its own unrealism.

## Sources
**Stick.**
- Emory Wilhite, "Learning to teach Y-Stick" (subtitled "Out of 2x2"; page checked): "The running back runs one of
  two routes: a flare ... or a shoot route", and "The running back's shoot or flare route is the outside route".
- The back is the stick's flat answer, outside the stick, from 2x2. Ours: `back_flat`.

**Flood.**
- Youth Football Online, "Flood Passing Concept" (page checked): "the flat route who is normally a Tight End or Running
  Back".
- The 3x1 flood series gives the flat to #3 (Gridiron Strategies). From 2x2 the flat is the back's.

**pa_flood.**
- Our pa_flood already sends the back to the flat (`back: 'back_flat'`), so the flat is his by install.
- I did not find a checked page naming the boot's flat runner specifically. The Shanahan boot and leak write-ups I found
  were summaries or behind a 403, and are not cited.
- So for pa_flood this flag changes only the fit and the reading, not the route.

## The change (`BACK_AS_THREE`, off; with CONCEPT_FIT)
- **Data.** `PassConcept.backThree` is the back's route as #3: `back_flat` for stick, flood and pa_flood.
- **The fit.** `conceptFits` counts #3 as present when the concept installs `backThree`, the field has no #3, and there
  is a back.
- **The call** (`asBackThree`, tagged `+b3`) says the back is #3:
  - his route is `backThree`, on the strong side (#3's);
  - he is read where #3 is read: the progression's S3 becomes B;
  - `backIsThree` is set.
- **Assignment** (`assign.ts`). A back who is #3 releases on the snap to the strong side. He is not a protector and is
  not in PRO_CALL's count.
  - The protection is the line (and a blocking inline end) alone.
  - One more rusher than that is the quarterback's hot (the protection-call note's item 4; not built here).
- **The plan** (`installedPlan`). The call is installed from its concept's tables (its key, order and looks).
  - #3's place in a key is the back's: stick's key is S2 high, B low, on the flat defender.
  - He is a read, not the outlet: pa_flood reads S2, W1, B.

## Results
**Staged, from gun doubles.** `scripts/diag/escape/back-three-staged.ts`: 8 coverages × 4 rosters × 6 seeds = 192
plays a cell, develop defaults. Off is the 2x2 call as it was made before CONCEPT_FIT: no #3, the back on his check.

| cell | completions | sacks | INT | no throw | yards a play | throw p50 | to the back |
|---|---|---|---|---|---|---|---|
| stick off → on | 129 → 163 | 0 → 0 | 4 → 0 | 0 → 1 | 9.19 → 6.31 | 2.65 → 2.50 s | 11 → 94 |
| flood off → on | 144 → 145 | 12 → 1 | 1 → 0 | 4 → 3 | 16.02 → 6.82 | 3.35 → 2.90 s | 11 → 156 |

**Stick.** The stick (S2: 82 → 90 throws, 7.3 → 8.1 yd) and the back's flat (94 throws, 3.6 yd) now make the concept,
in place of the outside receivers' routes (W1 94 → 5).

**Flood.**
- Off, the 2x2 call was not a flood: the QB threw the backside dig (W1) 110 times for 24.7 yd a throw. That is where its
  16 yd a play came from.
- On, it is a flood: the flat 156 times for 7.3 yd, the out 25.
- The sacks fall 12 → 1 with the back out of the protection, because the ball is out 0.45 s sooner.
- The flat is thrown on 81% of plays in every coverage (17–23 a coverage). The flat being the primary read fits the
  teaching ("the QB hitting it immediately if it is open", cfbtrack, summary only). Whether the out is read before it,
  on time, is a question for the QB lane's cell.

**8 league games** (seeds 101–108, with CONCEPT_FIT):
- 23 of 701 calls had the back as #3: pa_flood 10, flood 5, flood+pa 4, stick 4.
- Shares of concept calls, against CONCEPT_FIT alone:
  - stick 1.2 → 3.3%
  - pa_flood 0.8 → 2.6%
  - flood 2.9 → 3.1%
- Misfits: 0, counting the back as #3.
- Route class of the routes run, against CONCEPT_FIT alone (11.2 / 5.8 / 10.1 / 37.1 / 35.8% before CONCEPT_FIT):

| class | CONCEPT_FIT alone | with this flag |
|---|---|---|
| breaking | 13.0% | 12.7% |
| cross | 4.4% | 5.7% |
| flat | 10.9% | 10.8% |
| quick | 37.3% | 36.6% |
| vertical | 34.4% | 34.0% |

## Notes
- **A pre-existing gap**, not changed here. The read compiler looks up its tables (KEYS, INSTALL_ORDER, ONE_LOOK,
  CLEAR_OUTS) by the call's id, so a play-action-tagged call (`smash+pa`, `flood+pa`) misses its concept's key and order
  on develop. This flag looks up `+b3` calls by their concept, but `flood+pa+b3` still misses, as `flood+pa` does today.
  It is reported to Integration as its own item.
- **The hot** for the sixth rusher is the protection-call note's design (item 4), not built.
