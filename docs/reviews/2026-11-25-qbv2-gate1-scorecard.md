# QB_V2 Gate 1 scorecard, develop 7585be04f (2026-11-25)

QB lane. V2 (`QB_V2=1 QB_QUICK_DRIFT=3`) against the old controller (flags off). 8 staged cells × 30 seeds, a mid
passer.

The decision operator is #936's, as built and hand-checked in `2026-11-25-qbv2-key-operator.md` and applied locally (diag
only). Labels are read both at the 0.85 s cap and at the release. The eligible share is from whole games with
`CALL_COMPOSE=1`.

## Verdict

**Gate 1 does not clear as written. The decisions row fails at the cap label.** Every other row clears.

| Row | Old | V2 | Clears? |
|---|---|---|---|
| Decisions, taught answer at the 0.85 s cap | 154 | 143 | **no** |
| Decisions, taught answer at the release | 142 | 146 | yes, by 4 |
| Timing (release minus the planned break, p50) | quick out S1 +0.25 s; stick flat −0.10 | quick out S1 −0.30; stick S2 −0.35, flat −0.20 | yes: on or ahead of the break |
| Stalls (no throw by 3.0 s, not sacked) | 49 | 4 | yes |
| Side, like for like (decisive plays, thrown to the softer corner) | 8 / 13 | 12 / 16 (pick 14 / 16) | yes |
| Completions (context, not a gate row) | 167 | 189 | — |
| Invariants 1–4 (cycle, judge, picture-age, scan tests) | — | all pass | yes |
| Boundary (qbv2-information debt) | — | 2 listed, deferred with reasons: the DB rule via call personnel and slot (Flex, to perception); pose via sim.see (gate 2, Tools) | yes |
| Audit rows | — | closed or deferred with a reason (landing note, corrected 2026-11-25) | yes |

## Decisions by cell (taught answer, /30)

| Cell | Cap: old / V2 | Release: old / V2 | Note |
|---|---|---|---|
| Quick outs vs cover3 | 10 / 24 | 19 / 29 | V2 ahead |
| Quick outs vs cover2 (cell 1) | 29 / 15 | 8 / 13 | Corner "squatting" at the cap, "sitting mid" at the release. V2 throws the out, which is open in our physics (the corner never drives; `2026-11-25` cell 1 trace). |
| Quick outs vs cover1 | 30 / 30 | 30 / 30 | |
| Quick outs vs 2-man | 30 / 30 | 30 / 30 | |
| Slant-flat vs cover3 (cell 2) | 13 / 3 | 15 / 3 | **Operator caveat below** |
| Slant-flat vs cover1 | 16 / 14 | 16 / 14 | |
| Stick vs cover3 (cell 3) | 3 / 6 | 4 / 6 | As labelled. "Widening" scored either-valid (upper bound): old 9 / 22, V2 11 / 20. |
| Stick vs cover2 | 23 / 21 | 20 / 21 | |
| **Total** | **154 / 143** | **142 / 146** | |

**The cell 2 operator caveat (not a rescoring).** #936's apex reads "widening" on all 30, so the taught answer is the
slant unless "the hook walls the slant", which makes it backside. The operator's walled check (a hook within 2.5 yd of the
slant receiver at t_eval) fires on 0 of 30 under both controllers. The judge prices the hook in the slant's throwing lane
on every traced seed (`2026-11-25` sf_c3 role trace).

Since the plant fix (#951), V2 throws the backside flat on 21 of 30, and 22 of 22 backside throws complete. The cell
scores them wrong. If the operator's hook check were right, cell 2 alone would move V2's total by up to about 20 at both
labels.

I report it as the caveat, not a rescoring. Checking the walled operator by hand on 10 plays is the next step for the
scorecard, not for V2.

## Eligible share

`CALL_COMPOSE=1`, 4 games (`scripts/diag/qbv2/coverage-share.ts 1-4`): V2 runs **64 of 423 pass plays (15.1%)**. Before
planFor and CALL_COMPOSE it was 2.6%. The rest stay on the old controller.

## Reproduce

- **Scorecard:** `scripts/diag/qbv2/decision-card.ts` with `docs/reviews/patches/qbv2/key-operator-936-on-890558713.patch`
  applied. It applies to 7585be04f.
- **Rows:** computed as in that note: k936 cap and late answers; side from `sideThrown` on plays with corner cushions at
  least 1 yd apart; timing from `relPlan`.
