# Pressure observation contract

`sampled-geometric-pressure-v2` is an observation operator, shared by
`metrics.Play.pressure`, `diag/pass-pressure.py`, `diag/edge-rep.py`,
`diag/passpro/pressure.py` and `diag/passpro/qbdrop.py`. Common synthetic
witnesses live in `test/test_pressure_window.py`. They check measurement
meaning, not NFL validity or a controller improvement.

## Admission and denominator

The operator needs a QB index and the common play's position samples. Callers
select dropbacks and their own cohorts. Positions retain `Play`'s existing
0.1-yard quantization for both sources.

- Start at 0.5 seconds after the snap. Admit only recorded timestamps inside
  the closed interval, including an exactly sampled release.
- With `pass_forward`, stop at the earlier of that event and `end`. Without
  it, stop at the earlier of `end` and 4 seconds. Do not round a subframe
  endpoint to a later sample, clamp a pre-window ending to the last frame, or
  extrapolate beyond the recording. Numerical tolerance is 1 ns.
- An observed positive means at least one defender is **at most** 2.0 yards
  from the QB at an admitted sample. All defenders are eligible; this common
  format has no standing/down filter. No between-sample interpolation or
  continuous pressure onset is inferred.
- A negative requires a nonempty window, all its expected samples, and finite
  x/y coordinates for the QB and every defender in every admitted frame.
  Otherwise an observation without a positive is unknown. A known positive
  survives missing observations or recording truncation.
- The pressure rate is positive observations divided by positive plus
  observed-negative observations. Unknowns remain explicit: the mechanics
  summary adds `pass.pressure_2yd_unknown`; the diagnostic rates print known
  and unknown counts. An empty denominator prints `unknown`.
- `pass.time_to_pressure` is the first **observed sample**, not necessarily
  the first pressure if earlier observations are missing. The passpro hazard
  uses only windows with complete sampled coverage; positive incomplete
  windows remain in the headline pressure count. Its clean/live risk bins
  are still the existing diagnostic, not a new survival estimator.

For the known rusher-count failure, a defender observed at least one yard
behind the line is still a known rusher even if some samples are missing. An
otherwise missing path makes the total unknown, rather than raising after
the pressure observation or counting the defender as a non-rusher. Other
mechanics metrics retain their existing missing-data behavior; successful
pressure observation does not certify that every metric can consume an
arbitrarily incomplete play.
The rusher count and non-pressure rep/depth measurements retain their
separate existing sampling definitions; v2 versions the pressure observation.

## Related measures remain distinct

| Measure/tool | Population and meaning | Endpoint/eligibility differences |
| --- | --- | --- |
| Mechanics geometric pressure | Common-format dropbacks with an offensive QB; sampled proximity under the contract above | No standing filter; snap clock; no causal protection credit |
| `diag/pass-pressure.py` and `diag/edge-rep.py` | No play action, five observed OL, a QB, measurable line start | Pressure samples use the same contract. Reported times subtract line start. Engagement is within 1 yd of any offensive non-QB for two consecutive frames; release/escape and edge-rep outcomes are separate proxies |
| `diag/passpro/pressure.py` | Includes play action; exactly one QB, five OL; existing endpoint at least 0.6 s | Same pressure samples, snap-clock times. Most-frequent protector within 1.5 yd identifies a blocker; 0.3 yd nearer the QB defines getting past him. This differs from “still engaged” above |
| `diag/passpro/qbdrop.py` | Includes play action; exactly one QB, five OL; existing endpoint at least 1 s; depth/set observations required for the tercile split | Same pressure observation; unknown pressure omitted from the tercile denominator and counted separately |
| Native pressure credit (`src/sim/behaviors/qb.ts`) | A QB decision tick records pressure when forecast arrival is under 0.7 s and the selected defender is under 2.5 yd | Standing defenders only; forecast incorporates acquired information, engagement and pocket presence. No 0.5 s observation start |
| QB-perceived threat | The QB's acquired/forecast estimate of arrival time, used for urgency and evasion | Can influence a decision without satisfying native credit or geometric proximity. Body facing alone is not gaze |

The tools' different play-action populations, observation eligibility,
engagement definitions and clocks explain legitimate differences. Their
“on the block” numbers must not be pooled. Native credit, perceived threat,
geometric proximity and causal protection failure answer different questions.
The scorecard record schema and engine statistics do not change in this repair.

## Version and remaining limits

V1 used nearest-frame rounding/clamping and admitted a sample at 0.8 s after
a 0.76 s release. Both the #191 and #198 diagnostics shared this defect.
V2 corrects admission and separates unknown observations. Do not relabel the
published #191/#198 or known-problems numbers as v2 validation; no historical
study or result was overwritten or rerun.

New mechanics summaries carry `pressureOperator`. `compare.py` withholds
pressure shifts/flags when saved operator versions differ, including legacy
unversioned evidence versus v2. A guarded incompatible pressure metric is
unavailable and exits nonzero; it cannot receive a passing guard. Other
metrics remain available. The outcome analyzer preserves unknown pressure
in its own group instead of coercing it to `False`.

The current common exporter recognizes `throw` as `pass_forward`, but does
not preserve a `throwaway` release or a scramble transition in that channel.
Sacks usually end at their native event; scrambles can be observed after the
QB starts running. The common `end` also conflates a known whistle with a
fallback recording cutoff. V2 detects missing samples before a supplied
endpoint; it cannot recover these missing event distinctions. A sampled
negative through the supplied endpoint is not proof that a censored play
stayed clean until its real ending.

**Next decision:** can preserving actual throwaway release, scramble onset
and known-versus-censored endings change which apparent pressures justify a
protection investigation? Coordinate that additive export contract with the
replay owner and use compatible saved traces before collecting new games.
