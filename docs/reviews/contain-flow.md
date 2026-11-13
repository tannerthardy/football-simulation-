# RUN-18: an engaged edge past his containment bound stops widening

2026-10-29, Defense. Base develop `510f7a6a`. Lands before the squeeze read
(#365), whose seal-hold scene exposed it.

## The defect

The engaged-flow law (#347) asks for

    flow = clamp(held + (target − y) · 3, ±lateral cap)

with `held` the blocker flow the defender read. Containment (EDGE_CONTAIN)
bounds an edge's widening: once he is wider than containing the runner
needs, `target` becomes his own y, and the comment says he "stops and holds
his ground". But `held` was still added, so he kept drifting outward.

An independent trace on #365's seal-hold scene (I-jumbo duo) found it. At
1.00 s the strong end is at y 29.19, outside his bound (26.39), and asks
+1.11 yd/s outward, exactly his held flow. On develop the old squeeze
misread usually overrode the request inward and hid the defect. #365's
squeeze read removes that misread, and the end travels 2.02–2.72 yd outward
under a loaded seal.

## The change (on, no flag)

While the bound applies, an outward held flow is dropped; an inward one is
kept. Nothing else changes: no capacity, no new read.

`test/edge-contain-flow.test.ts` checks the stated contract on both
mirrors of the scene. Every engaged tick where an edge is wider than his
bound (not trailing, not squeezing, not working off) must not ask wider.

| | Ticks past the bound | Asking wider |
| --- | --- | --- |
| Without the change, flip false / true | 98 / 67 | 45 / 56 |
| With it | 74 / 63 | 0 / 0 |

The run-contact observer's `defender-movement` record now also carries
`contain`, `trail` and `squeeze` (observation only).

## Where does the bound put the edge? (the open RUN-18 question)

[`edge_contain.py`](../../scripts/diag/edge_contain.py): on outside and
wide zone, the play-side edge DL (aligned outside the play-side tackle),
measured as yd outside the outermost offensive surface body. NFL BDB weeks
1–2; sim run-only captures, seeds 7/9/11/13, k = 4.

| | 0.5 s | 1.0 s | 1.5 s | 2.0 s |
| --- | --- | --- | --- | --- |
| NFL | +0.93 | +0.31 | −0.03 | −0.18 |
| develop | +1.01 | +0.12 | −0.03 | −0.16 |
| develop + this change | +1.01 | +0.10 | −0.13 | −0.23 |
| #365 (squeeze read) | +0.98 | +0.19 | +0.18 | +0.14 |
| #365 + this change | +0.98 | +0.14 | +0.07 | −0.01 |

The #365 rows come from the r7/r11 restage (k = 4).

NFL edges squeeze to just inside the last blocker by 1.5 s. Once the old
misread is gone (#365), the defect leaves our edges outside him, too wide.
This change moves them toward NFL. On develop the misread already pulls
some edges in, so here the change moves them about 0.1 yd inside NFL's
position. So the bound is not too tight.

The earlier note in RUN-18, that play-side zone DL flow moved away from
NFL with the fix, counted this outward drift as "flow with the play". NFL
edges don't drift outward like that.

## Matched restage

Develop `510f7a6a` with and without the change: run-only captures, seeds
7/9/11/13, k = 4 RNG shifts, 1,932 runs, 707 of them changed.

| | develop | this change |
| --- | --- | --- |
| Yards per run | 6.18 | 5.82 (−0.36 ± 0.22) |
| ≤ 0 / 10+ / 20+ yd | 21.1% / 16.6% / 5.8% | 21.2% / 15.3% / 5.3% |
| Missed + broken tackles per play | 0.413 | 0.411 (−0.002 ± 0.004) |
| Wide zone | 8.19 | 7.07 (−1.12 ± 0.71) |
| Toss | 6.09 | 4.74 (−1.35 ± 0.91) |
| Trap | 5.46 | 4.78 (−0.68 ± 0.23) |
| Outside zone | 6.65 | 6.26 (−0.39 ± 0.28) |
| Inside zone | 6.83 | 7.12 (+0.29 ± 0.28) |
| Power / counter / draw | 4.35 / 3.96 / 6.17 | 4.29 / 3.92 / 6.25 |

**Why the yards move.** The loss is on runs that attack the edge (wide
zone, toss), where an edge no longer drifts outside the runner's path, and
on trap, where the kicked-out end no longer widens away from the kick.
Interior runs and the tackling count don't move.

DL lateral speed toward the play
(`dl_scheme.py`, added with #365) is unchanged except
play-side zone DL at 1.0–2.0 s: +0.95 → +0.87 yd/s. That's the edges no
longer widening (see above).

## Tests re-pinned on develop

- `responsibility-ledger` M29-P036: LG's second reread (to SS at 3.75) no
  longer comes. The case pins one reread with its kind (2.25, to LB_W,
  reach).
- `responsibility-ledger` M7-P051: LB_W alone a tick sooner, at 2.8.
- `pursuit-arrival`: seed 4's first 6 completions no longer hold a native
  pursuit case. Seed 6 passes all 6 contracts on develop, with this change,
  and on #365's tree with and without it.

## Limits

- Sim: four run-only seeds, two generated teams. NFL: two weeks. The edge
  measure is position-only.
- The bound itself (where containing the runner is, from his seen track)
  is unchanged and is not re-derived here.
