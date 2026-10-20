# Native pull-corner continuity audit

Read-only review of the two already-collected, full-22-player native continuations. No new simulation, test, movement override or source change. This supplements `intent-switching.md`; it does not establish that removing wall clearance is safe.

## Provenance

- Accepted comparison: `develop@2c98bed94adad8087c65f381d4090444ad283985`; simulation source SHA-256 `4273994fa50f0f11a54bff53b374ad87d80766be471ca727ce43f76fdef83571`.
- Collector/receipt commit `10c052b9fa1076f500442fad3bea39f3d2d2d1db`, Node `v22.23.3`. Exact 44 flags and physics defaults are in `k01-baseline-receipt.json` and `k04-baseline-receipt.json`; notably `PULL_READ=1`, `PULL_STEP=PULL_CUE=PULL_PLAN=0`, `GAIT_STEP=0`.
- Fixture `test/fixtures/puller-access-inputs.json.gz`, SHA-256 `9b8273f316aa21c307070b9117aad0985261083f70eabbc6c56f4675062a4614`.
- K01 input SHA-256 `d46d95a3ada575ef41049ead6847bcfc98f7027301ad97cdf0727ec1884167b0`; trace `k01-baseline.json.gz`, 90 frames, uncensored tackle/6.33 yd. Passive body/RNG/events equivalence was verified by the collector.
- K04 input SHA-256 `99a8a36ecc81b83d78512cf449b5020886d13dad2d2754ecfb0fbdd8a5043568`; trace `k04-baseline.json.gz`, 89 frames, uncensored tackle/5.37 yd. Do not infer K01's explicit passive-equivalence check was also run for K04.
- Coordinates here use increasing x as upfield and increasing y as these fixtures' pull direction. Reported velocity is yd/s; position is yd. Raw means the controller's newly emitted command; final means after normal modifiers, before physical integration.

## Finding: stable jobs, inconsistent local corner objective

Neither trace shows the target switching suspected by the user: RG retains DE_W, RT retains LB_S. Their path indices advance monotonically. The native issue is narrower: during phase 1 a nearby teammate repeatedly replaces the stored corner's x with `min(wp.x, own.x - .35)`, while phase progress still uses the stored corner. This local goal can travel backward with the puller after its acquired rear-wall criterion has already declared clearance.

Source: `src/sim/behaviors/blocking.ts`, approximately lines 908–950. The non-`pullSurface` near-wall predicate directly reads live actual OL positions within 1.2 yd and ahead of the puller. The held acquired `readPull` clearance and stored path do not become the common steering/progress reference. The source information leak is definite; the native records below establish actual opposite-depth commands, not that the encountered teammate was irrelevant.

| Trace / puller | Phase-1 window | Near-wall ticks / phase ticks | Material local x rewrite | Stored corner ahead, local corner behind |
| --- | --- | --- | --- | --- |
| K01 RG kick | .25–1.50 s; phase 2 at 1.55 | 20 / 26 | 15 | 8 |
| K01 RT lead | .30–2.35 s; phase 2 at 2.40 | 15 / 42 | 9 | 8 |
| K04 RG kick | .25–1.50 s; phase 2 at 1.55 | 19 / 26 | 14 | 7 |
| K04 RT lead | .30–2.15 s; phase 2 at 2.20 | 18 / 38 | 12 | 2 |

These are exposures within two selected fixtures, not a population frequency or a measure of lost protection. A true gate does not always materially change the target: early in the pull the stored corner is already deeper than `own.x-.35`.

## First native causal intervals

### RG: both cases first command additional depth after clearing

The C triggers near-wall at .35 s; the first material added depth occurs at .60 s. At .35 s the acquired rear wall is genuinely uncleared (`cleared=false`), and the unmodified corner is already deeper than the local minimum. This is a useful opposing situation: a correction must still clear the line before crossing.

At **1.15 s** in both cases the nearby player is LG, not C. RG is `(38.83874,26.41347)` with entry velocity `(-.07274,2.57317)`. Its stored corner is `(38.85,29.07026)`, just **.01126 yd ahead**. The live gate instead requests local x `38.48874`, **.35 yd behind RG**. Raw and final velocity become `(-.64971,4.93184)`.

This is not a retarget, new defender decision, or failed physical execution of a forward request. The controller itself requests retreat while its held rear-wall read is already cleared: own front surface x `39.20055` is behind clearance x `39.41469`. LG is nevertheless genuinely nearby (1.132 yd, ahead), so an additional route-clearance requirement could still be defensible. The report cannot label the resulting avoidance unjustified without checking the continuous route.

K01 keeps this retreat through 1.50 s, then phase 2 requests `(+3.30535,+.18571)` at 1.55 s while actual entry vx is still `-.77282`; after execution vx is `-.5553`. That is normal braking after previously commanded backward motion. K04's gate turns off at 1.50 s and emits `(+.94350,+4.05312)` before entering phase 2 at 1.55 s.

### RT: K01's second wall episode reverses an already-forward request

K01's gate is on .95–1.25 s (C), off 1.30–1.65, on 1.70–2.05 (LG), and off from 2.10. The first material rewrite at 1.25 s is small (.01608 yd), so the clearer consequential interval is the later LG episode:

| Time | Own x / entry vx | Stored corner x | Local corner x | Raw vx | Final vx | Achieved vx after tick |
| --- | --- | --- | --- | --- | --- | --- |
| 1.65 | 38.6973 / −1.1431 | 38.85 | 38.85 | +.29594 | +.29594 | −1.00657 |
| 1.70 | 38.64360 / −1.00657 | 38.85 | 38.29360 | −.67575 | −.67575 | −.8465 |
| 2.05 | 38.41648 / −.68325 | 38.85 | 38.06648 | −.88180 | −.88180 | −.75539 |
| 2.10 | 38.38051 / −.75539 | 38.85 | 38.85 | +1.38490 | +1.38490 | −.5404 |

At 1.70 s the stored corner is .20640 yd upfield, but the new local target is .35 yd backfield: a .55640 yd target displacement in x. Raw/final vy is 4.28157. RG/RT are not choosing a new job here. RT's same held read expires at 1.73392 s, so this new retreat precedes the next target/clearance decision. Its front surface x `39.01178` is already behind held clearance x `39.24906`.

RT turns up after the gate releases, but starts that turn with actual backward momentum. It reaches phase 2 at 2.40 s with entry vx `+.57670`. Do not compare 2.10's entry velocity with its new forward request and call the difference a physical-response defect.

K04 shows the same class of local retreat, with the LG gate on 1.55–2.00 s, but less geometric overrun: only its final two gated ticks put the stored corner ahead. At 2.00 s raw/final vx is `-.95707`. At 2.05 s the gate releases and raw vx becomes `+.37483`, while ordinary modifiers produce `+.31389` (vy `3.17374→2.45402`). At 2.20 s, after phase 2 starts, raw `(3.38649,1.94515)` becomes final `(1.02426,-.29669)`. The RG is then 1.167 yd away and ahead by .209 yd. This later substantial traffic response is a **separate shared-spacing effect**, not proof that phase-1 corner correction fixes collection. Leave it with Flex's spacing boundary.

## Information qualification

The real consumed teammate picture generally agrees with the live near-wall switch at these native boundaries: K01 RT's delivered LG picture is 1.22309 yd away at 1.65 s, 1.15950 at 1.70, and 1.24408 at 2.10 (picture age .05 s). K01 RG's acquired LG distance at 1.15 is 1.132 yd. Therefore these cases do **not** establish that private information, rather than legitimate close traffic, causes their specific turnbacks. Replacing live positions with acquired pictures repairs the contract but may leave essentially the same native command.

The strongest native finding is a steering/progress/clearance disagreement. It warrants testing a common consumed rear-clearance objective; it does not warrant ignoring close bodies, disabling spacing, forcing an earlier climb, or declaring all repeated depth requests wrong.

## Smallest next test and opposing control

1. Through the real production hook, freeze own state and acquired/held pictures at a phase-1 near-wall boundary. Alter only an unobserved teammate's actual body position across the live predicate; the request must not change. Mirror it. This isolates the definite information defect without claiming it rescues native collection.
2. Native targeted comparison: use the same initial full-player K01 and K04, changing only the demonstrated corner mechanism. If the candidate shares consumed rear clearance across steering and progress, compare raw target, swept teammate separation, achieved corner, phase transition, defender route and real protection at runner arrival. Preserve all other controllers and the runner's reactions. A phase transition alone is not success.
3. Opposing control: retain an acquired, genuinely obstructed rear-wall approach. The existing K01 RG at .35–.60 s is useful context (`cleared=false`, crossing C); stage a material still-uncleared version through the production hook if necessary, rather than relying on a case where the local override has no effect. It must still gain adequate depth and avoid the C. Preserve K04's later RG traffic response as a separate control rather than smoothing it away.

Do not ask Physics #163 to explain these raw-command reversals. Physical execution becomes the question only if a sensible, achievable final request fails. Shared spacing remains Flex-owned. No target-retarget repair, release timer or general commitment heuristic is supported by these two traces.

## Decision

Proceed with one bounded controller consistency test, not a generic intention-persistence rewrite. The evidence supports a real information boundary repair plus investigation of an inconsistent retreating corner objective. It does not yet support accepting a native protection improvement or eliminating the close-wall response. Incremental simulation/test cost for this audit: **0 s**; existing receipts retain the collection costs.
