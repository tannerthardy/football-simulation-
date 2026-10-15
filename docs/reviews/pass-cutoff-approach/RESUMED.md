# Resumed pass investigation after the helper review

2026-10-15. The independent #66 helper adjudication is published at
`4f90b6428b98224774bbd63a4adad6bb3e354b53` and delivered to
[Physics](https://github.com/tannerthardy/football-simulation-/pull/66#issuecomment-6200708794)
and [Integration](https://github.com/tannerthardy/football-simulation-/pull/63#issuecomment-6200709352).
Two controlled collections expose feasible missed routes; the recovery,
Under and Tite old mandatory-climb/compression expectations are not invariant.
The promotion hold for collection remains a separate dependency. No helper
or physics patch was imported into this pass branch.

Returned to the clean `e33ac76` checkpoint. #67 has no new review feedback;
Integration has queued its independent current-develop extraction/review,
separate from frozen #63. Reused the exact `81b9085` candidate traces to inspect
the remaining forecast claim, without starting another variant or simulation.

| First proposal | Forecast deadline | Actual blocker/rusher distance then | Rusher position prediction error |
| --- | --- | --- | --- |
| P040 LT | .45s | 2.394yd | .987yd |
| P040 RT | .50s | 2.344yd | .990yd |
| P019 LT | .25s | 1.602yd | .463yd |
| P019 RT | .25s | 1.718yd | .463yd |
| Preselected P020 LT | .50s | 2.303yd | 1.016yd |
| Preselected P020 RT | .60s | 2.557yd | .990yd |

All are outside the first proposal's nominal contact envelope at that deadline
(LT1.290/RT1.272yd). Native future requests resample normally, so this is not a
proof that holding any one selected command would fail, nor a certificate that
no other interception is achievable. The existing P040 LT held-request free
probe independently misses the proposed inside point by .817yd; its approximate
reach estimate is .729s versus a .400s forecast interval. The rusher minimum-speed
and acceleration/turn forecast still supply a materially different future path.

Thus #67 fixes a demonstrated **forecast/action mismatch**, but doesn't turn
the selected point into a reliable interception deadline. Its supported claim
remains improved useful opening position and loaded shoulder acquisition, with
the adverse P040 RT/P019 RG outcomes preserved. Don't call the free forecast
a planning guarantee or infer that contact duration alone proves protection.

**Next decision:** independently review/extract the narrow approach patch and
its adverse evidence on the exact current accepted source. Keep forecast
replacement separate; #64's rejected predictor-only arms already show that a
more conservative estimate can lose useful P019 protection. Those results
remain relevant constraints on any later planner correction. No new controller
variant, physics change, suite or game is justified by this offline inspection.

[Recomputed measurements and input hashes](../../../data/reviews/current/pass-cutoff-approach/forecast-resume.json)
reuse the same three inputs, settings and runtime source as the main report.
Reproduce with `python3 scripts/diag/pass-cutoff-forecast-review.py`; this reads
existing recordings and simulates zero ticks. The original costs/checks remain
unchanged. Historical4ded6b6, #57 cadence and its rejected late-QB chase stay
separate.
