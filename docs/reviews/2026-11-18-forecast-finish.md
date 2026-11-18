# FORECAST_FINISH: the speed out to the numbers, not the boundary (Rules' lead item), off

QB lane, 2026-11-18. Patch: `docs/reviews/patches/engine71-footwork/forecast-finish-on-021a42a7.patch`, on develop
021a42a7.

**What led the ball to the sideline.** The quarterback's forecast of the receiver ran past the route's finish.
- Under ROUTE_FINISH an outward route that runs out of field ends at its margin, 5 yd from the sideline, at speed 0:
  the receiver stops there, in bounds.
- The forecast, at the end of a 'continue' route, kept his velocity.
- quick_outs, cover3, gun_trips_11, seed 2, flipped, ROUTE_SHAPE (`scripts/diag/routes/out-forecast.mts`):
  - the forecast had him 31 yd from the ball at 2.2 s, against a sideline at 29.75;
  - the ball was aimed 2.2 yd from the sideline;
  - the receiver stopped near his finish, and the ball was incomplete.
- ROUTE_SHAPE's rolled quick out ends at the margin more often, which is why the defect showed there. It is on develop
  without it too.

**Built (FORECAST_FINISH=1).** A route whose last point is its finish ends there in the forecast, as the receiver does.
No knowledge beyond the installed route he already holds.

**Result.** Rules' out-trace on develop + ROUTE_SHAPE (`out-trace.mts`; trips_sail, double_outs, trips_outs, quick_outs ×
cover 1/2/3/4 × doubles / trips × seeds 1–2 × flip):

| route | completions | miss on completions |
|---|---|---|
| quick_out | 42 → 44 of 56 | 0.91 → 0.78 yd |
| out | 26 / 33, unchanged | unchanged |

- Of Rules' six lead plays, quick_outs against cover3 and cover2 (trips, seed 2, flipped) now complete. The aim moves
  0.6–1.0 yd in.
- The out is unchanged: it ends inside its margin.
- Not changed: the remaining quick-out misses (cover4, cover1 thrown at 3.5 s) are not the finish.

**Checks.** Typecheck, reference-stack, guard, scan and provenance pass. qb-receiver-forecast fails on clean develop
in this container too.
