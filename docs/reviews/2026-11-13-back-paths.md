# BACK_PATHS: the back's flat, angle and out on their tracked paths (2026-11-13)

**Question** (Integration, from Coverage's yards-per-drop-back split). Targets behind the line are 2.2% of our
drop-backs against the NFL's 11.8%. Our back runs NFL-like routes by label (flat 35%, angle 17%, out 7% of
drop-backs, `back-routes.ts`), so why isn't he thrown the ball behind the line?

## Diagnosis

**NFL behind-the-line targets** (BDB 2025 drop-backs; this operator counts 15.5% of drop-backs targeted behind the
line):

| Target and route | Share of drop-backs |
|---|---|
| Screens: WR / RB / TE | 3.5 / 2.6 / 1.2% (7.3% together) |
| Back to the flat | 4.0% |
| WR crossers behind the line | 1.0% |
| TE flat | 0.7% |

The causes, in order of size:

1. **Screens:** they are not in our play caller's pool (`SCREEN_CONCEPTS`, called only from the screen lab). Measured
   separately; see the screen scorecard.
2. **The back's routes are the wrong shape.**
   - **NFL backs' FLAT routes** (non-PA drop-backs, n 968) are run behind the line, about 4.5 yd deep, while widening.
     They climb only late, and are caught at a median −1.0 yd (56% behind the line).
   - **Ours** went to the line at once, so the catch was at +2.3 yd (6% behind).
   - **Angle and out** broke 1.5–2 yd past the line (caught at +4.4 and +5.3 yd; NFL +3 and +2).
3. **Our QB prices the back rationally against our defense.** `checkdown-probe.ts` looked at 534 throws to 5–10 yd
   with the back a pass option, 179 of them with the back ready behind the line.
   - He priced the back safer: P 0.69 against 0.645, risk 0.9% against 2.0%.
   - He priced the back lower in value: 4.7 against 6.3. The intermediate throws completed 73% for 6.4 yd, more than
     the NFL back's flat (4.9 yd an attempt).
   - So the fix there is coverage and tackling, not his pricing.

## Change (`BACK_PATHS`, off)

`src/playbook/routes.ts`, from the tracked paths (`scripts/diag/concepts/nfl_back_path.py`):

| Route | Points (depth from the line, lateral from his start) |
|---|---|
| `back_flat` | (−4.5, 3), (−4.2, 7), (−3.5, 10), (−1.5, 13), then on to the sideline and up |
| `angle` | break at the line (0, 3), then to (3.5, −6) |
| `back_out` | (0, 2), (2, 4), (2, 14) |

## Read: league games, develop (engine-50 tree), seeds 101–401 × 8 games (`back-path.ts`, same quantities)

| | Off | On | NFL |
|---|---|---|---|
| Flat: depth at 1.5 / 2.5 s | −2.9 / +0.8 | −4.5 / −3.7 | −4.6 / −3.7 |
| Flat: width at 1.5 / 2.5 s | 4.0 / 7.1 | 5.6 / 11.3 | 5.4 / 10.3 |
| Flat: aim p50, behind the line | +2.3, 6% | −0.1, 50% | −1.0, 56% |
| Flat: completion, yd/att | 0.67, 10.0 | 0.73, 9.7 | 0.83 (all back flats), 4.9 |
| Angle: aim p50 | +4.4 | +2.7 | +3 |
| Out: aim p50 | +5.3 | +2.4 | +2 |

- **Where the back is caught now matches the NFL.**
- **Yards per attempt to the back barely change and stay about twice the NFL's.** That is the YAC gap on our catches
  (Coverage's split: +1.4 yd a drop-back from YAC on zone catches), not the route.

## Fixture

`test/back-paths.test.ts`, the installed paths from a gun alignment:
- **On:** every flat point but the last is 3+ yd behind the line, it is 10+ yd wide before it climbs, and the angle
  and out break at the line.
- **Off:** the flat is at the line at once, and the angle and out break past it.

## Checks

- `npx tsc --noEmit -p .` is clean.
- `back-paths`, `scorecard-provenance` and `baseline-runner` pass.

## The flat's pace at equal time (2026-11-13, after the first card)

**The route-labelled check.** NFL FLAT routes by backs (BDB 2025 weeks 1–2, `routeRan` FLAT, n 916), against ours, at
equal time after the snap, until the throw (`scripts/diag/backs/flat_path.py`, same quantities on both sides). Columns
are depth past the line / distance from his start toward the flat, in yd, medians:

| | 1.5 s | 2.0 s | 2.5 s | 3.0 s | 3.5 s |
|---|---|---|---|---|---|
| NFL FLAT | −4.7 / 3.1 | −4.5 / 5.3 | −4.3 / 7.4 | −3.6 / 9.3 | −2.7 / 11.3 |
| Off | −2.5 / 2.1 | −0.3 / 3.7 | +1.3 / 6.0 | +2.0 / 9.1 | +2.0 / 12.7 |
| On, before (the family's 0.8 effort) | −4.5 / 3.7 | −4.2 / 6.5 | −3.6 / 9.6 | −2.1 / 12.6 | 0.0 / 15.5 |
| On, with the flat's pace (0.55) | −4.5 / 3.2 | −4.3 / 5.4 | −4.0 / 7.8 | −3.4 / 10.2 | −1.9 / 12.5 |

**The path was right in depth but run too fast.** It widened at about 6 yd/s against the NFL's steady 4.2 from 1.5 to
3.5 s. A route point's `s` is the speed through that point, the break speed, so slowing the points did little (at
0.6, 8.7 yd at 2.5 s). The flat is coached as run under control, timed to the drop, so the route now carries a pace:
`RouteDef.pace`, the fraction of top speed between its points, which replaces the family's effort and is still
adjusted by the back's route running. The flat's pace is 0.55.

**Where the ball arrives.** With the path matched at equal time, the remaining width at the ball's arrival comes from
the QB: he throws the flat at 2.9 s against the NFL's 2.4 (`rb_table.py`), so the back is further along. That is
proposal 2, measured separately.

**Correction to the first card.** The first card compared catch width and depth with NFL RB catches made within 10 yd
of a sideline. That proxy selects on width, so it could not confirm width. Against route-labelled FLAT targets at
`pass_arrived`, the NFL arrives 11.7 yd from the sideline and 1.3 yd behind the line; ours, before the pace, arrived
7.2 yd from it and 1.4 yd past it.
