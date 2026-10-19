# #131: live simultaneous catch opportunities

2026-10-19 America/Phoenix. The live caller now supplies actual body endpoints for the same interval as the swept ball, then uses #131's unchanged closest-legal-opportunity helper. The original P020 invalid interception becomes an incompletion on its historical source; the valid P107 tipped interception and P143 moving completion remain identical. Three current-develop pairs preserve every recorded frame/event/telemetry/stat. Ready for independent caller/controller review; not merged or self-approved.

## Pins and scope

Accepted/fetched/rechecked `develop@f4146275ce7539816bf57b4ed55a0d2be10e48c7`, queue `9a6bb795179a4b2e61ed59d25bcf23ca5e40f423`. Started isolated `codex/catch-opportunity-caller` from accepted develop, normally merged original #131 `2f9085f1e3dc8e5a19c07fc8f561dc1689413a5e` as `4d24f7309c68dc8d904b56c84535c2c57021602a`; only WORKBOARD conflicted and both scopes survive. Publication fast-forwards the existing #131 branch without rewriting its component history. No other research/candidate ancestry.

- Caller code `8fa7e2044fdde7991a7d2a1d62a55f23537f610e`.
- Accepted runtime `7d23555ad67094fbe2e79726d9b761dd5f068c06fb90ff0796ec61c953750197`.
- Current candidate `a28e1e3aea855c6c7bc3ed1f8c2a126e52315cc91a7bcb01e2d37573e0a9012a`.
- Historical counterfactual `3b41687cae5c59de8d730489fc16b8003c258ff556e5d8adfcc6e3bc97b775fb`, only the same helper/two caller hunks on original accepted70b4db6. Its cached baseline is the original Physics native-parity capture, not a recollection or a current-source measurement.
- [Focused receipt](../../data/reviews/current/same-time-catch-caller.json), [fetchable evidence manifest](https://github.com/tannerthardy/football-simulation-/blob/dfcd7a205040032e38689ead2d866f4e3ba0d353/manifest.json), [restoration instructions](https://github.com/tannerthardy/football-simulation-/blob/dfcd7a205040032e38689ead2d866f4e3ba0d353/REPRODUCE.md).

Runtime scope is three files relative to accepted develop: unchanged Physics helper, `sim/catching.ts`, `sim/playsim.ts`. Relative to the supplied component, only two small caller hunks change. Pure helper/tests/fixture remain byte-identical. Lower-wrap evidence/Physics research remains separate.

## First incorrect operation and correction

The old live query advanced the player's body, then projected that final position onto the entire previous→current ball chord. The selected ball point and player point could describe different instants. It could admit reach to a place the ball had left before the player arrived, or miss a real moving encounter.

`PlaySim.tick` now saves body positions immediately before World advances an airborne ball interval, including a throw initiated by that tick's controller decisions. The local array is passed through `updateBall` to `resolveCatchOpportunities`. No positions persist between ticks or plays. The query combines each saved body start, achieved body end and the ball's matching endpoints, using unchanged reach and height bounds. Physical eligibility uses actual attained geometry; no controller gains observations or future information.

Omitting body starts is an explicit stationary-body query for existing direct/static callers. A supplied array with a missing actor endpoint fails closed. No inferred velocity or previous-tick cache fills the gap. Tests execute real World steps, require a real post-release query, and assert the exact positions actually supplied to the helper. Diagnostic wrappers must forward the new argument; an old wrapper that drops it would remove this correction from that diagnostic.

Existing release exclusion, legal-player eligibility, occupied-hand/bat exception, acquired incidental-flight readiness, target/onBall tracking bonus, leap/top mapping, noCatchUntil retries, increasing closest-fraction ordering, contested-catch handling, facing, inbounds and probability/difficulty formulas remain. Geometry can change the distance/height fed into those formulas. The helper selects the closest simultaneous opportunity on the common legal-height interval; it does not change policy to earliest reach.

## Native comparisons and adverse evidence

All inputs come from the original immutable restoration receipt `b5b4fba9eefa5e59e8db192e77a6502341d81989`;4MB archive SHA256 `7fc78954d2240c86c5bc9092c6a9d1345d9a3acbe3af061cbd33d006bb93f97b`. All41 declared members plus the bundled manifest were verified. Original full constructor RNG, selected IDs/energies and calls match before each snap. Scouting Maps are reconstructed from the original saved prior calls; rounded film is not a checkpoint. Each pair shares the exact inputs/tool/44 flags/components1, Node22.23.3/Linux x64, World defaults and unchanged capacities.

| Source/input | First relevant observation | Result |
| --- | --- | --- |
| Historical70b4 P020 | At4.30s Y's later failed retry changes distance1.073605→1.134277 and probability; same draw still misses. At4.55s NB's final-body distance1.292149 is within reach1.317361, but simultaneous legal-time minimum1.508345 is outside. Source Physics's achieved-substep minimum1.508492 independently agrees. | Invalid INT removed; no chance/draw/retry for that window. Existing ground rule ends incomplete. Recorded frames before4.55s and all consumed opportunity body endpoints match the cached original. |
| Historical70b4 P107 | Valid tipped NB opportunity at3.25s, fraction1, distance1.260763. | Tipped INT and entire native frames/events/telemetry/stats unchanged. |
| Historical70b4 P143 | Valid moving H opportunity at2.50s, fraction1, distance1.258002. | Completion and entire native frames/events/telemetry/stats unchanged; tackle ending8.47yd. |
| Current f414 P020 | Same4.30s probability correction; the existing draw still misses. Current baseline already ends incomplete rather than the old INT. | Complete recorded frames/events/telemetry/stats unchanged. No new current-source INT reversal claimed. |
| Current f414 P107 | Accepted intervening QB/receiver work has changed the original play: current baseline already completes to Y. | Whole native result unchanged; tackle5.55yd. This is not relabeled as the old tipped-INT control. |
| Current f414 P143 | Current baseline already ends incomplete after accepted intervening changes. | Whole native result unchanged. This is not relabeled as the old H completion. |

There is no unexplained adverse native change in these pairs. The material consequence is loss of an invalid defensive win in the historical witness; preserving an impossible interception is not a supported football contract. Y's earlier catch failure remains, rather than being forced into a completion. The opposing native interception and completion are preserved. No average, YAC threshold or changed ending was used to tune the implementation.

## Focused checks, cost and limits

38 distinct focused checks pass using compatible receipts:25 unchanged helper/reach/readiness checks in the first focused run,13 final caller checks after a test-fixture correction. Typecheck passes. New caller checks cover saved selected-player capability mapping, rejecting P020 with no draw/retry/flight mutation, retaining P107/P143, a moving encounter the old projection misses, missing endpoints, direct/static use after a prior query/tick, real two-tick endpoint capture, a newly released throw after the existing0.1s exclusion, full-height tracking catch, genuine PBU, untouched defensive miss, tipped-ball retry and increasing closest-opportunity order.

The initial test failure attempted to structuredClone an Agent graph containing controller callbacks; the corrected test snapshots the flight while retaining actor identity. The new-release test throws once and requires an actual later helper query, avoiding a vacuous exclusion-window pass. No supported assertion or engine behavior was weakened. The fixture-preparation command succeeded with zero World ticks; its outer baseline guard correctly rejected the new validation-file write, so that receipt is preserved as generation/drift evidence, not a passing check.

New native cost: nine short snaps,4.601 collector seconds/5.728 launcher seconds. Six compare accepted/current candidate; three historical counterfactuals reuse the cached original baselines. All nine end natively. Focused launcher cost2.442+1.731s, typecheck9.985s; fixture generation0.580s. No new games, full suites, roster sweeps or NFL collection. Both source patches were independently restored outside the parent checkout and complete runtime digests matched; every publication archive member was checked.

The approximation remains linear body/ball endpoints. No event solver, hand anatomy, awareness rewrite, flight integration or capabilities change is introduced. Contest/facing/inbounds timing retains its existing tick-state semantics. Pitch and loose-ball queries are unchanged. This validity repair does not certify general catching/coverage realism or repair the separate lower-wrap questions.

Independent Physics/caller/controller review remains required; Integration owns the one combined verification and adoption decision. The old "helper has no live effect" blocker is resolved by this candidate, not by marking the standalone helper as a production fix.
