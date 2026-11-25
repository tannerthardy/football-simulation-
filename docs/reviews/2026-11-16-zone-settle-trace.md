# The zone-settle defender: request against body (Tools, 2026-11-16; report, nothing built)

Integration's isolated-body check on Defense's decel-census.mts (zone-hold f7e17730): the largest group of underneath zone defenders who slow into the throw are "zone-settle", request about 4.5 yd/s, achieved falling 3.1-3.3 to 1.3-1.4. Scripts: `scripts/diag/defense/settle-replay.mts` (staged as decel-census, `ZONE_HOLD=18 CURL_SINK=1 SETTLE_DEPTH=1`, seeds 1 and 2, 7,374 underneath zone defenders; settlers = label zone-settle at -0.5 s and at the throw: 599, 8%), `settle-isolated.mts` (a lone body). Defense counts 12% of underneath defenders as settlers; the difference is their population (a label at either end versus both).

## Result

Settlers, p50 at -0.5 s / -0.25 s / the throw:

| | -0.5 s | -0.25 s | throw |
| --- | --- | --- | --- |
| the behaviour's request, speed | 5.11 | 5.53 | 4.44 |
| the intent the world received, speed | 5.11 | 5.53 | 4.44 |
| achieved, in play | 2.39 | 2.08 | 1.74 |
| achieved, stepBody alone under the same intents | 2.34 | 2.02 | 1.72 |
| intent angle off his facing | 100 | 96 | 74 deg |
| intent angle off his velocity | 67 | 50 | 69 deg |

1. **Equal to the isolated body**: in play and alone under the same intents agree (1.74 against 1.72). Nothing between the behaviour and the body changes the request: the behaviour's request and the intent are the same vector on every tick (0 degrees apart), so no command-shaping stage (spacing, containment, orientation) acts on these defenders.
2. **The directional capacity is not the limit.** A lone LB, S or CB held square (facing fixed) and asked 5 yd/s at 0, 45, 90, 135 or 180 degrees off his facing reaches 2.6 yd/s along the request at 0.5 s from rest and 3.6 from 2 yd/s, at every angle up to 135 degrees (180: 2.5 and 3.4), and 4.5 by 1.5 s: `settle-isolated.mts`. He is asked to move about 100 degrees off his facing and nothing is lost to that.
3. **The request reverses.** Over the last 0.5 s the intent's heading differs by 90 degrees or more between two ticks for 45% of settlers (68% for 45 degrees or more; p50 76 degrees). Their achieved speed change over the half second, p50: swing under 45 degrees -0.04 yd/s (n 190), 45 to 90 -0.48 (n 141), 90 or more -0.77 (n 268). A steady request does not slow him; the settlers who slow are the ones whose request turned around. Examples, per 0.1 s (field heading, request speed): 0.81 yd/s at -97 degrees then 6.58 at +90; 5.11 at 101, 1.04 at 90, then 5.71 at -90, 6.0 at -90, 6.9 at -90 with the body still going +100 at 4.3 yd/s and braking to 1.5 to turn round; the body is turning round, so the achieved speed falls with a request that points back.
4. Tick to tick the intent is steady (p50 change 0.2 degrees) and 12% of ticks turn more than 20 degrees: the reversals are a few large jumps, not noise.

So of Integration's three outcomes it is the third: not the body and not a post-behaviour stage, but the request reversing, in the behaviour itself.

## Where it comes from (reading the code, not measured)

`ZoneCoverage` returns `goTo(a, settle(tgt), { facing: facingQB, speed: zs })` with `tgt = lerp(lm, eyes, 0.25 * anticipation)` and `settle(t)` giving `x = min(t.x, max(a.pos.x, los + 3))` (`src/sim/behaviors/defense.ts`). `goTo` returns `arriveVelocity(body, t, vmax)`: the speed falls toward 0 as he nears the target, and the target moves with the QB's eyes and, through `max(a.pos.x, ...)`, with his own depth. A target that moves across him as he arrives flips the request from "brake to the target" (0.8) to "go the other way" (6.6). The labelled-settler dump shows lateral flips (plus or minus 90 degrees) as often as depth ones. Defense's two guesses: the directional cap (not it, 2 above), and arrive braking near a moving target (consistent with the dump, not isolated: I did not log the target per tick). The next measurement would be the target and the distance to it per tick for the reversing settlers.

dither-core's attribution would name the behaviour (`ZoneCoverage`), not a stage, since the intent equals the behaviour's request: I did not run it.
