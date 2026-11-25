# Football drag: k by air-distance band with intervals, and which k reproduces the NFL's flight times and release speeds (proposal only, no build)

Tools/Physics, 2026-11-24, for Integration; follows `2026-11-24-ball-drag-proposal.md` and the QB lane's `docs/reviews/2026-11-23-ball-speed.md` (claude/exciting-cori-hc8l4u 16d2fc93a). BDB 2025 weeks 1-9, 5,931 thrown passes with `pass_forward` and `pass_arrived`; `scripts/diag/ball/drag_fit.py` and `drag_tables.py`; tables `data/reviews/census/drag-tables.md`. No build.

## The ball, from the rulebook

2026 Official Playing Rules of the NFL, Rule 2 Section 1 (static.www.nfl.com copy, read in full text): "prolate spheroid ... long axis, 11 to 11¼ inches; long circumference, 28 to 28½ inches; short circumference, 21 to 21¼ inches; weight, 14 to 15 ounces." So the end-on cross-section (a circle of the short circumference) is pi d²/4 with d = 21 to 21.25 in / pi = 0.170 to 0.172 m: **A = 0.0226 to 0.0232 m²**, mass **0.397 to 0.425 kg**. With rho 1.2 kg/m³, k = rho C_D A / (2 m) = **0.0306 x C_D per yd** (the QB lane's 0.0227 m², 0.42 kg gives 0.029). Our DRAG_SPIRAL 0.003027 is C_D 0.099; Watts and Moore's 0.055 would be k 0.0017. (Rae and Streit, whom Watts and Moore put at about three times their value, was not obtained, and no number of theirs is used here; see the earlier proposal.)

## What is wrong with mid-to-arrival

The QB lane's 0.008-0.011 is a mid-flight to arrival slope, and the NFL ball does not decay at one rate. The decay rate by time before arrival (k x1000 per horizontal yd, passes of 15+ yd air distance; pairs of 0.1 s intervals 0.2 s apart):

| window before arrival | completions | incompletions |
|---|---|---|
| 1.2-1.8 s | 6.9 | 6.0 |
| 0.6-1.2 s | 6.5 | 6.3 |
| 0.3-0.6 s | 14.0 | 13.7 |
| 0.0-0.3 s | **26.1** | **11.0** |

The last 0.3 s of a completion is twice the rate of an incompletion's: that is the catch (the hands taking the ball), which our ball model does not have (the ball is pinned to the catcher on the arrival frame). The rate in the 0.3-0.6 s before arrival is the same for completions and incompletions (14 vs 13.7) and about double the 0.6-1.8 s rate (6-7): it is not the catch. I did not isolate it (candidates: the ball reaching the receivers' hands or the ground on incompletions, the tracker's smoothing at the end of a track, the ball's flare late in the descent; the angle the ball has turned since launch does not collapse the three flight-time classes, and the rate near arrival is the same whether the descent is shallow or steep, which argues against an attitude explanation). So **a constant fitted through arrival over-reads drag**, and the QB lane's mid-to-arrival number contains this tail.

## k by air distance, the tail left out

k per horizontal yd, mean and 95% bootstrap interval over passes, fitted from release + 0.2 s to arrival - 0.6 s (the full-flight slope, to arrival - 0.1 s, in the second block):

| air yd | window | n | k mean (CI) | median | path factor |
|---|---|---|---|---|---|
| 10-20 | to arrival - 0.6 s | 473 | 0.0072 (0.0060..0.0083) | 0.0039 | 1.020 |
| 20-35 | to arrival - 0.6 s | 340 | **0.0057 (0.0050..0.0065)** | 0.0043 | 1.042 |
| 35+ | to arrival - 0.6 s | 121 | **0.0047 (0.0043..0.0051)** | 0.0046 | 1.079 |
| 5-10 | to arrival - 0.6 s | 76 | 0.0150 (0.0081..0.0244) | 0.0054 | 1.023 |
| 10-20 | to arrival - 0.1 s | 1137 | 0.0116 (0.0109..0.0124) | 0.0075 | 1.015 |
| 20-35 | to arrival - 0.1 s | 331 | 0.0073 (0.0068..0.0077) | 0.0068 | 1.042 |
| 35+ | to arrival - 0.1 s | 114 | 0.0064 (0.0060..0.0068) | 0.0062 | 1.080 |

By flight time, to arrival - 0.6 s: 0.9-1.4 s 0.0114 (0.0076..0.0162, n 178), 1.4-1.9 s 0.0065 (0.0056..0.0074), 1.9-2.4 s 0.0059 (0.0052..0.0067), 2.4+ s 0.0050 (0.0045..0.0055, n 138). The path factor (arc length over horizontal distance, from a parabola with the band's median travel and time) converts to per yard of path: divide by 1.02-1.08. The mean is pulled up by the short passes (a short window, a noisy slope, a heavy tail: the medians are 0.004-0.005 throughout); the long passes, which have the longest fit span and the least noise, say **k about 0.0047-0.0057, C_D about 0.15-0.19 on the end-on area**, which is 1.6-1.9 times ours, not three times, and between Watts and Moore's smooth foam ball and the higher wind-tunnel value they cite. **k does vary with distance, downward** (0.0072, 0.0057, 0.0047), but the shorter bands are the noisy ones and their intervals overlap; I do not claim a real dependence.

## Which k reproduces the flight times and the release speeds

A point ball with quadratic drag k and gravity, released at 1.8 yd and reaching the NFL band's median horizontal travel in its median time **to the point 0.6 s before arrival** (so the catch/ground tail is not forced into the fit), then its horizontal speed at the release (0.1 s), mid and that point, beside the NFL medians (the QB lane's release / mid operators):

| air yd | n | travel / time | NFL rel / mid / end | k=0.003 | k=0.0045 | k=0.006 | k=0.0095 |
|---|---|---|---|---|---|---|---|
| 10-20 | 619 | 17.7 yd / 0.80 s | 22.5 / 22.3 / 21.8 | 22.5 / 22.1 / 21.6 | 22.7 / 22.0 / 21.4 | 23.0 / 22.0 / 21.2 | 23.5 / 22.0 / 20.7 |
| 20-35 | 349 | 27.2 / 1.30 | 22.7 / 21.3 / 20.0 | 21.7 / 20.9 / 20.2 | 22.1 / 20.9 / 19.9 | 22.5 / 20.9 / 19.5 | 23.4 / 20.8 / 18.7 |
| 35+ | 123 | 41.5 / 2.00 | 22.8 / 20.6 / 18.4 | 22.0 / 20.7 / 19.6 | 22.7 / 20.7 / 19.0 | 23.4 / 20.6 / 18.5 | 25.1 / 20.4 / 17.3 |

k = 0.0045-0.006 reproduces the NFL's release and end speeds in the two long bands within 0.3-0.6 yd/s (35+: release 22.7-23.4 against 22.8, end 19.0-18.5 against 18.4; 20-35: 22.1-22.5 against 22.7, 19.9-19.5 against 20.0), with the NFL's own measured flight times. **k = 0.0095 does not**: it needs releases of 23.4 and 25.1 yd/s where the tracked releases are 22.7 and 22.8, and arrives at 18.7 and 17.3 where the NFL is at 20.0 and 18.4. Our k = 0.003 is 0.6-0.7 yd/s short on the release and 0.2-0.6 long at the end in those bands: a small error, not a factor of three. The 10-20 band cannot tell the values apart (all four within 1 yd/s); the model's mid speed (21-22) is also a little under the NFL's in the 20-35 band (20.9 against 21.3), the same for every k, so a mid-flight bias of the tracker or the point-ball model of that size cannot be assigned to drag.

## Consequences

- **The law:** one effective k, constant through the flight, **about 0.005 (0.0045-0.0057, C_D 0.15-0.19)**, which is the NFL's drag with the end-of-flight tail taken out. It is a 1.6x change from 0.003, not 3x; no attitude law (the angle turned since launch does not collapse the classes, and the rate near arrival does not depend on the descent angle).
- **QB_DRIVE:** its flight-time law T(d) = 0.0731 + 0.03945 d + 0.00022 d² is what is fitted to the NFL; the launch is `solveLaunch(from, to, T, DRAG_SPIRAL)`, which already solves for the release that reaches the point at T under the ball's drag. So changing `DRAG_SPIRAL` re-derives the release automatically and keeps hang time: at the band medians the release speed rises by about 0.4-1.4 yd/s (22.0 to 22.7-23.4 at 35+ yd), within the NFL's tracked releases; the flight time and apex are unchanged by construction.
- **Arrival speed at the catch roll:** about 0.5-1 yd/s lower on a 25-35 yd throw (exp(-0.002 x path) is 5-7%): our 3D p50 22.3 at the roll becomes about 21, and the share over 24 yd/s roughly halves (25% to about 12-14%) against the NFL's 2-11% at 0.3-0.5 s before arrival. **The hot ball is therefore only partly drag**: the NFL's own speed at 0.6-0.8 s before arrival is over 24 yd/s on 30-41% of throws under 20 yd (p50 22.8-23.4), so the 24 yd/s step in the catch roll is not outside what the NFL ball carries on short balls before the catch; what the NFL does and ours does not is slow by 2-3 yd/s in the last 0.5 s (the tail above). The tail is not drag and I do not propose to model it as drag.
- **What the tracking cannot separate:** wind, air density and the ball's attitude (it measures a path-averaged C_D A); the tail's cause; and the vertical component (2D speed only, so the arc is inferred).

## Recommendation

Raise `DRAG_SPIRAL` to about 0.005 as a stated physical constant (the NFL's measured in-flight deceleration with the arrival tail excluded, an in-situ path-averaged value the wind-tunnel literature neither fixes nor excludes (Watts and Moore's 0.05-0.06 is lower, the higher value they cite about three times it)) behind a flag; no attitude law. Check, in this order, before any promotion: the hang time and apex by distance are unchanged (they should be, by `solveLaunch`); the release speed by distance against the tracked releases; the share of arrivals over 24 yd/s at the catch roll. Do not treat the last 0.5 s of the NFL ball's slowing as drag. Awaiting Integration's go.
