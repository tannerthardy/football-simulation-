# Native601 explosive-tail audit and selected alley-policy counterfactual

## Recommendation

Keep the reduced shared physics model. The strongest newly demonstrated defect
is the FS responsibility transition in native G4-P127, before any external load.
After personally seeing his original backfield man carrying the ball and reading
run, FS still requests pass-coverage cushion despite an installed alley fit.
The parent's narrow insert-or-alley repair changes that request and creates real
contact without altering mass, traction, strength, grips, work limits or solver
resolution. This demonstrates one useful controller repair, not universal
physics readiness or NFL-calibrated outcomes.

## Source and execution scope

Baseline archive: `out/helper-fit/promoted-source`, engine SHA
`601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b`.
Candidate archive: `out/coverage-continuation/alley-v1`, engine SHA
`3cbabd8fbb1fb4fea34c6bb98725a97f3f6de175c0bb59bece69f3c1e7371a7f`.

The four selected pairs reproduce native baseline Game history and the actual
baseline PlaySim constructor, then swap only `ManCoverage.update` for the selected
snap. These are single-method policy counterfactuals, not full candidate games.
Every selected phase naturally finishes and undergoes normal Game bookkeeping.
No future full-game parity is claimed. Initial/prefix/full-tick/RNG receipts are
in `counterfactual-analysis.json`; the selection was declared in
`counterfactual-selection.json` before candidate outcomes were inspected.

## First invalid native request

G4-P127: Gun Wing 12, Outside Zone Weak, Base 4-3 Under/Cover 0/Zero Blitz,
six rushers, LOS 24, game seed 1397778264, snap seed 225467937. FS 20 is actually
assigned RB 6, with alley/A/+1 and initial man cushion 10.2.

FS reads run by .50 s; actual handoff 1.00 s. At 1.20 s a secondary anticipation picture
shows carrying, but the guard-consumed receiver picture remains negative. The
first guard-consumed positive carrying picture is 1.30 s: age .25 s, RB position
(19.786650,27.560795), velocity(1.068387,-.362303). FS is upright at
(29.146238,27.153075), velocity(-.192281,-.639226), without body contact or
external support load. Baseline request (+.581295,-1.167956) retains man cushion.
There is no recorded coverage-run-fit transition. Later generic observed-LOS
pursuit begins around 2.35 s. The baseline naturally scores an untouched 86-yard TD.

Candidate request at exactly 1.30 s is (-.292476,+2.971113), with the same consumed
picture, initial state and every prior tick. Its installed deep-mesh alley cap
is preserved. Actual FS grasp 3.15 s / YBC 6.108282 yd, slip 4.90 s, regrasp 5.20 s, runner
legs fall 5.70 s and down-by-contact 6.05 s produce a natural 31.34-yard tackle. The
remaining 31-yard gain should not be treated as calibrated success.

## Complete retained pairs

| Input | Baseline -> selected policy | First fork | Interpretation |
| --- | --- | --- | --- |
| G4-P127, OZ/Under/Cover0 | 86 TD → 31.34 tackle | 1.30 s; before-state exact | Actual useful contact creation. |
| G3-P099, goal-line Duo/Base43/Cover0 | 2.07 TD → 2.07 TD | 1.70 s; before-state exact | Physical execution changes despite equal result; retained original control. |
| G4-P012, OZ/Under/Cover3 | 3.59 tackle → 3.59 tackle |None | Complete execution, result, final state and next RNG are exact. |
| G2-P188, midfield Toss/Base43/Cover0 | 3.62 tackle → 1.93 tackle | 1.05 s; before-state exact | Added/predeclared ordinary midfield control; changed traffic, not an FS solo tackle claim. |

All initial selected-state and earlier native-history signatures match. Each
observed execution matches its fresh plain counterpart for complete whole-tick
signatures, raw result, full final state and copied next RNG. The candidate
plain settled-log checksum is not separately retained; the target log is captured
after normal Game bookkeeping. Baselines additionally check original light-game
result/final/next RNG and settled target log. The historical recording-only
tickCount comparison failure is retained in logs and the state-diff packet;
only that recording bookkeeping field was excluded from the full-state projection.
External module WeakMaps are not independently serialized or hashed.

Across 754 actual World tick reports: maximum work residual 3.50e-11, momentum
residual 2.69e-12, arm-impulse/work excess 2.84e-14 roundoff, support-motor-work
excess 0. The absolute 1.1 mg dt ground envelope reaches 1.0000000000000004; this is
not proof of every instantaneous support-reduced substep bound. Negative signed
support motor work is retained as dissipation. The pairImpulse observer misses
lower-grasp supportImpulse, so empty grasp rows do not prove zero force.

## Current native game distribution

`collect-games.ts` reproduces the ordinary seed7/two-league calibration recipe
with original generated teams, all 1,029 official non-nullified scrimmage rows,
307 called runs and complete light game films. Native601 yields 51.125 points
per team, 2,402.48 rush yards / 7.825668 YPC, median 1.88, p90 15.38, p95 51.70,
72 stuffs,49 runs 10+,30 runs 20+. Top 10 runs account for 33.08% of yards;
without them mean 5.4131. Outside Zone 44 calls averages 16.96 with 10 twenty-plus;
Counter 26 averages 2.015 with 14 stuffs; Draw 15 averages 1.216 with 11 stuffs.
These are generated-call diagnostics, not equivalent NFL concept populations.

Field-bearing clean-completion YAC is 10.911145 over 401 catches. Attempted passes
632, interceptions 44. Missing YBC is an absent field, not proof of no physical
contact. Historical noAttempt in the saved anatomy JSON means only absent YBC
and zero missed/broken counters; actual no-attempt anatomy is independently
established for G4-P127 by full native events/controllers. Saved-only
`summarize-games.py` reproduces both original summaries and documents definitions.

## Other retained full native witnesses

G1-P077 Power/Under/Cover 3-match, 87.2 yd: first RB contact is a DE brush 3.05 s / YBC .382 yd.
LB_W's long reach 3.25 s is immediately force-limited and slips; physical hold
1.663 exceeds 1.655 reach at 3.55 s, event 3.60 s. FS assistance 3.50 s also saturates,
then hold 1.419 exceeds 1.402 reach at 3.75 s, event 3.80 s. LB_W also brushes Z while
trying to hold. Neither RB nor tacklers falls. This proves actual held/slip load
and approach/traffic debt; it does not justify raising grip strength or establish
an invalid applied movement request. Full actor profiles, joints and loads remain.

G3-P030 Comebacks/Pistol12/Cover9 produces 72.028 YAC without contact/attempt.
At throw 3.30 s CB_S is 1.040 yd from receiver but moving downfield 7.449 yd/s while
the receiver is already breaking out. At catch 4.50 s separation is 6.2 yd; later pursuit
gets roughly 2.29 yd close around 6.0 s without an attempt. This needs cue/controller
and pipeline analysis before changing friction. The parent's moving-air arrival
experiment remains withheld because of its retained adverse PA mirror; it is not
part of the alley repair.

## Metadata correction provenance

Executed counterfactual collector bytes are preserved as
`selected-counterfactual.executed.ts` (d83327fbdd5a5fba013e9f8652feed88b1d802ea866090e2ae9df89f3ef53e29).
Four original candidate packet bytes are preserved under `metadata-original/`.
`normalize-counterfactual-metadata.py` changes only descriptive method/limits,
verifies entire row digests unchanged, and retains the actual executed tool hash.
`metadata-normalization-receipt.json` records original/final file hashes and the
later corrected collector hash. No simulation was rerun for this metadata repair.

## Files to preserve

Preserve common/collect-games/selected-native/selected-counterfactual executed
and corrected tools, their logs including original recording-only failure,
games/index plus all eight light game files, three full native witnesses and state
diff, all four counterfactual pairs and originals, selection/generation/normalization
receipts, saved-only audit/summarization tools and outputs. The parent publishes
separate broad candidate guards; their future callstreams diverge after altered
plays, so aggregate gains are not single-snap causal estimates.
