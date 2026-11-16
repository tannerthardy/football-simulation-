# FOUR_VERTS_SEAMS: four_verts' seams first, traced (2026-11-16)

Rules + Coaching, for Integration and the QB lane. The flag is off and **held on this branch, not carded**. It is to be
re-read once the QB's grass read (`QB_FOOTWORK=11 GRASS_READ=1`, #802) is on the tree; if it works there it rides with
that bit, not alone.

## The change
`FOUR_VERTS_SEAMS` (off; with PLAN_KEYS; `src/playbook/read-compiler/runtime.ts`):
- four_verts reads its seams first, in their compiled order, then the outside gos.
- Source: Gonzalez via Smart Football. The first read "must be thrown as soon as the back foot hits"; else "hitch up and
  move his eyes to the seam read".
- From 2x2 the second seam (W2) moves from the second hitch to the first:

| | order | rhythm (step, at, ready) |
|---|---|---|
| off | S2, S1, W1, W2 | S2 n0 1.7/2.7; S1 n1 2.1/2.8; W1 n2 2.5/2.7; W2 n2 2.5/2.9; B n2 2.5/2.1 |
| on | S2, W2, S1, W1 | S2 n0 1.7/2.7; W2 n1 2.1/2.9; S1 n2 2.5/2.8; W1 n2 2.5/2.7; B n2 2.5/2.1 |

From trips the seams were already first, so trips is unchanged.

## Result and trace
**Setup.** `scripts/diag/escape/fv-trace.ts`: four_verts, gun_doubles_11, 8 coverages × 4 rosters × 6 seeds (192
plays), develop e90c204c defaults. For each play it records:
- the QB's read timeline;
- the second seam's picture when his eyes reach it;
- the target and the outcome.

| | completions | INT | sacks | no throw | to B | to W2 |
|---|---|---|---|---|---|---|
| off | 68 | 5 | 17 | 68 | 59 | 1 |
| on | 61 | 5 | 15 | 76 | 45 | 5 |

**He sits on the first seam in both arms.** His eyes are on S2 from 0.55 s and move on at a median of 3.1 s (3.15 s on).
- The seam is not ready until 2.7 s, and he holds it.
- So the first-hitch slot (2.1 s) is never used, and W2 is not read on the first hitch: it is read at about 3.1 s, as
  the second look after a 3 s first read.
- At that point W2 is a median 13.7 yd deep with 3.3 yd separation, and in 91 of 126 looks a defender is under him.
- So the second seam is past the hook by then. The clock is the problem, not the hook.

**The reorder puts one more look ahead of the checkdown.**
- Realised orders: off, S2 → W1 → W2 → B (S1 skipped; 97 plays); on, S2 → W2 → S1 → W1 → B (105 plays).
- The back comes 0.25 s later.
- All 15 completions lost were throws to B off. On, 7 of them became no-throws and 7 a later throw to B.
- By coverage: cover3 4, cover6 4, tampa2 3, cover4 2, cover1 1, cover2 1. Won back: 8, mostly W2.

## Reading
**The question is the same as verts_hitch's "not past the hook yet".** Read 1 is a vertical that is not ready until
2.7 s, so nothing after it is on rhythm. Gonzalez's "as soon as the back foot hits" is a decision taken at the plant on
the seam's grass, not a wait for the seam to clear (design note #25).

**Under the grass read** (QB_FOOTWORK=11 GRASS_READ=1), the seam is decided at the plant and he moves on with no dwell.
- That is the condition the reorder needs.
- So it may work there and nowhere else.
- Re-run fv-trace.ts with those flags on, off vs on, once #802 and the QB lane's footwork are on the tree.
