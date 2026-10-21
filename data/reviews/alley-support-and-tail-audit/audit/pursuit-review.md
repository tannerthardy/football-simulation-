# Native pursuit review: six retained passing tails

Reviewed source `601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b`, parent commit `7a25bc9`.
Input: `data/reviews/helper-fit-and-coverage/coverage/final.json.gz`; SHA256 `1e4729d68cf34ac3d741d2cca82ee999253e2c834189f717982f8d9060252cb1`.

Read-only inspection of existing native body, applied-intent, consumed-picture, contact, event and decision records. No production edits, new football simulations or capability changes. All six rows report observer verification and matched source pins. Saved `steps` are before the World solve; their intents already include engagements, tackle-bond control and teammate spacing. Events such as catches are stamped with the tick start while occurring after that tick's solve. A snapshot at 3.50 therefore precedes the physical catch reported at 3.50; the 3.55 snapshot contains the resulting body state.

## Recommendation

The highest-value bounded repair is the **late-air approach controller**, before increasing tackle strength or changing contact physics. When a defender cannot beat the visible ball to the catch window, `playBall` (defense.ts:760–776) requests a radial velocity toward a stationary point, with speed from distance and a scalar profile brake. It ignores the defender's transverse momentum, facing, available support and observed receiving motion. The World enforces those limits anyway, so this is a request/execution mismatch rather than evidence of an impossible physical force.

Do not extend the physical solver. Compare that existing request with an arrival/gather request using the same delayed receiver picture and ordinary movement limits. Preserve the reachable-ball contest branch and do not promise the receiver's future cut or actual catch. Plain `goTo` uses another scalar radial braking formula, so renaming this fallback would not prove a solution. `movingArrivalVelocity` accounts for radial available braking and target transverse motion but still cannot guarantee a large redirect. A tiny held-command forecast can adjudicate an ambiguous redirect if an analytical request fails the witness.

## C2 curl-flat R: no tackle opportunity, not failed grip

`DA-R2-curl_flat-cover2-R`: Z catches at 3.50, physical catch position (53.3221,10.30), 4.2-yard separation, then 56.678 YAC / 70-yard touchdown. There are **zero tackle attempts, missed tackles, broken tackles or carrier-contact events**. The nearest defenders remain outside even the desperation-dive envelope.

First identified mechanical request mismatch is SS's switch to the late-air fallback at **2.75**. Exact inversion of the existing fallback speed formula at 2.75, 2.90, 3.20 and 3.50 reconstructs the **same** target `(53.2336248563,10.2316883368)` each time. SS tackling is .5510204, so the fallback through-control speed is 3.32245 yd/s.

| Native tick | SS position | SS velocity | Applied requested velocity |
|---|---|---|---|
| 2.75 | (57.358,10.237) | (+1.40,-4.13) | (-6.88,-.01) |
| 2.90 | (57.51,9.65) | (+.57,-3.68) | (-6.95,+.94) |
| 3.50, before catch | (56.95,8.13) | (-2.28,-1.26) | (-6.07,+3.44) |
| 4.00 | (55.64,8.22) | (-2.50,+1.70) | (+.44,+6.82) |
| 4.25 | (55.13,8.78) | (-1.45,+2.27) | (0,0), after spacing |

At 2.75 support is upright with zero lean/load and no engagement. The actual consumed Z picture is age .20, position (51.4353,8.6667), velocity (5.0328,0). The new request does not acknowledge that SS is already moving away from the catch window at over four yd/s laterally. By the catch, SS is 2.23 yards laterally outside the receiver, with forward velocity toward his own goal. No extra traction, grip capacity or balance detail is needed to explain the miss.

Post-catch closest pre-solve SS separation is **2.471 yd at 4.25**, standing reach **1.478**, maximum desperation-dive radius **2.228**. LB_M gets to **2.498 yd at 4.70**, standing reach **1.596**, dive radius **2.346**. The later free FS closes to 2.306 yd only at the touchdown tick. Tackling correctly makes no attempt in these states. The root problem is failing to create a reachable approach, not a grip failing under load.

The SS zero requests at 4.20/4.25 must **not** be attributed to pure chase. Its delayed LB_M picture at 4.20 is position (52.9388,14.0100), velocity (3.9858,-5.3521), age .05. SS and LB_M are closing on the same crossing lane. `spacing.ts:92` explicitly supplies a zero-speed gather when its exact free forecast predicts a teammate collision and the slower turn fails to clear it. The native file does not retain the pre-spacing command or selection provenance. An isolated same-state reconstruction or narrow command observer is necessary to prove whether this is an excessive traffic yield. Disabling spacing would hide a legitimate teammate collision risk.

## C3 PA post-dig R: approach plus real failed attempts

`DA-R2-pa_post_dig-cover3-R`: X catches at 4.45 at (56.0494,37.46), separation 1.8, then 53.951 YAC / 70-yard touchdown. Unlike C2, this includes real tackle commitments:

- CB_W misses a desperation dive at 5.00; it physically falls at 5.05. At the decision's resulting body state (the 5.05 snapshot), carrier/defender distance is about 2.13 yd, outside ordinary standing reach 1.524 but within the desperation-dive radius 2.274. The runner is separating. This is a legitimate low-quality escaping-carrier attempt, not a missed form wrap.
- CB_S establishes an extended hold at 6.40, falls from its committed dive at 6.45, then loses the hold at 6.65. Its 6.40 opportunity record says observed current and attainable future wrap qualities are both 0.00. A full-extension hold slipping under load is plausible; no unexplained contact-force failure is demonstrated here.
- FS never acquires standing reach: closest pre-solve separation is 3.176 yd at 5.05 versus arms 1.523. It carries positive lateral momentum as the runner crosses toward decreasing y. Its zero requests at 4.80/4.95 also occur near a CB_W traffic conflict and need the same command-provenance check before blame.

The PA middle safety's pre-catch roof/read is owned by the separate coverage review. Do not collapse its starting coverage disadvantage, CB_W's separating dive, CB_S's weak hold and FS's missed approach into one physics diagnosis.

## Remaining saved counterparts

| Retained input | Result | Diagnostic use |
|---|---|---|
| C2 curl-flat R | untouched 70-yard TD | Primary late-air/rally witness |
| C3 curl-flat R | 13.95-yard tackle, 2.526 YAC | Preserve successful ordinary rally/contact |
| C3 PA post-dig R | 70-yard TD, one dive miss and one slipped hold | Distinguish approaching from grip execution |
| C2 curl-flat L | 9.97-yard out of bounds, 6.437 YAC, SS contact | Preserve approach to a moving flat receiver |
| C3 curl-flat L | interception, 13.788-yard return | Preserve reachable-ball interception/return behavior |
| C3 PA post-dig L | 41.96-yard tackle, 24.069 YAC | Preserve successful later recovery/assist |

These are mirrored input counterparts, not mirrored trajectories or controlled paired tackle opportunities: the QB may select a different receiver. This six-play retained-tail pack cannot establish an NFL rate or a global improvement.

## Small validation sequence

1. Save the late-air actor's native body/support, flight/catch-window time and the consumed receiver picture; record the **raw playBall command separately from applied spacing**. Freeze that first decision's physical state and RNG.
2. Compare bounded requests over only the visible remaining flight time with ordinary free movement. Report achievable catch-window separation, transverse displacement, forward/base velocity, support/falls and whether the request abandons the catch. Mark unavailable loaded forecasts rather than treating them as free.
3. Rerun these six unchanged inputs with observer/plain equality, then retain the existing reachable-contest, crossing, head-on, faster-escape, turning/traffic and successful-contact controls. Do not score candidates only by TD reduction or guaranteed tackle counts.
4. Broaden to the established passing and full-game regression panels only after a first-command improvement is proved. Keep physical capabilities/source separate from controller changes, and measure bounded preview activation/cost.

The evidence supports an ordinary controller improvement with existing World mechanics. It does **not** prove new physical constraints, anatomy detail or stronger tacklers are needed, and it does not prove that every one of these retained touchdowns should disappear.
