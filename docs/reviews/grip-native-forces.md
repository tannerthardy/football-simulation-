# Native reel and ground: bounded World candidate

2026-10-14 (America/Phoenix). Comparison baseline remains `4ded6b6`; parent is preserved PR #46 `baf7ed5`. No default or baseline promotion.

**Result:** four saved native intervals now run through a separate active-force callback with their actual requests. All four pass the unchanged independent interval gates. The selected angled tick continues through 80 accepted intervals. This is useful experimental scope progress, not established football benefit or a complete tackle solver. One runtime tail fails its budget; one stricter long-reference convergence check remains inconclusive.

## What changed and why

- Seven analytic-channel tests crashed because their synthetic fixture lacked the now-required attachment reference and fixed grip share. Supply those physical fixture coordinates; retain its exact closed-form impulse/moment/work expectations. All seven pass. No solver tolerance or expected answer changed.
- The old fast dry-cap test remains a genuine **numerical acceptance/search failure**. Its later slip exit is around 4.306ms. At 16,384 uniform pieces, phase uncertainty is `5.01379e-6`, against `1e-6`; at 65,536 it is still `1.25345e-6`. Endpoint leg-share differences are tiny, but cannot certify within-interval timing. This dominates the acceptance error; body yaw also under-resolves on coarser grids. Keep its failing assertion and old bound. It is outside the new callback path and does not automatically bar unrelated experimental work.
- The first native angled interval is saturated. Keep that refusal. Advance the saved native group 16 original intervals within the **same issued 50ms tick** to a below-slip interval with positive reel and ground forces. No request, pull, capacity, body state or recovery rule is disabled/replaced.
- `activeGrip` is a separate, absent-by-default World callback. Native feet still allocates force, traction, yaw limits and recovery once. Integrate its delivered ground force and existing bounded yaw response together with the moving attachment, normal spring/damper, tangent constraint and existing reel request. Preserve the controller tick in the reel denominator, existing arm/grip limits and one shared normal/tangent cap. A slack shortening span is permitted by the existing tension-only law.
- Integrate body/attachment/foot motion, impulse and temporal moment, contact/ground/yaw/common-foot work, spring energy, damping and active reel work together. Positive reel effort spends the native remaining arm-work budget. World validates before committing, replaces the already-computed ground ledger once, then runs native support/release and tick fatigue once. Unsupported cap/slip, impact, active recovery, multiple contacts and off-feet cases retain native fallback; failed trials commit no contact state.

The independent force oracle uses separate SPD elimination/reel arithmetic and RK4/event roots. The tiny-step **old native force** also approaches this field: tangent discrepancy falls 6.006 → .639 → .0644 → .00644 as width drops `1e-5` → `1e-8` seconds. Original passive solver and reference remain intact. Physical capacities and support/recovery/kinematic laws are unchanged.

## Accuracy and continuation

Four original 0.520833ms intervals: angle, mirror, frontal closing control and fresh angle. Worst normalized comparison **.011667**, allowance **.0625**; independent 1024/2048 convergence worst **.014552**. Active angular/energy residuals remain inside existing gates. The front requests positive pull but correctly delivers zero reel while already closing. Angles deliver positive reel and ground loads.

For the remaining 80 angled intervals (41.667ms), candidate and independent references keep bodies/support/material very close. Absolute-coordinate reference refinement **does not converge** at the single-interval ledger allowance: 2048/4096 body-work discrepancy `2.066e-10`. Preserve that evidence.

A separate centered-coordinate reference retains the same law, restores the original external angular impulse, and reduces that precision problem. Angle candidate/ref position discrepancy `2.11e-13 yd`, support `3.30e-14 yd`, work `2.66e-11`; fresh work `9.24e-13`. However, angle reference arm-work refinement is **`6.522e-11` versus `6.25e-11`**, narrowly outside the deliberately stricter continuation check. Mark that check **inconclusive**, not converged or a proven candidate defect. Fresh continuation converges. Do not relax tolerances or extrapolate this to loaded histories.

## Three-way football controls

Yards below start at the **actually acquired grip**, not proximity or an NFL YAC measure. The legacy panel's separate first-contact marker includes tackle attempts; keep it distinct from accumulated physical torso impulse. Both difficult angles have zero torso-contact impulse and remain censored.

| Native input | Legacy execution | Ownership only | Ownership + active solver | Accepted solver intervals |
| --- | ---: | ---: | ---: | ---: |
| Front, seed3001 | .448973 | .449062 | .449062 | 149 |
| Angle, seed3001 | 22.274864 | 24.199731 | 24.203259 | 249 |
| Mirror, seed3001 | 22.274864 | 24.199731 | 24.203259 | 249 |
| Fresh angle, seed4001 | 13.319271 | 14.405497 | 13.787723 | 499 |

Front stays tackled at the same .85s panel duration. Fresh stays tackled; solver versus ownership alone changes advance by **−.617774yd** and panel duration **2.90→2.75s**. Angles stay live at the 4.4s censor. These changes do not establish better or worse physics. Full native fallback counts/reasons, including bounded solver refusals, are retained in the receipt. Most difficult-angle fallback occurs after the holder leaves his feet; fresh also spends substantial time requesting recovery outside this scope.

The ownership defect is independently demonstrated: patch transport advances held material during an unrelated group's interval despite unchanged held body/foot and zero grip work. The accepted **center** mode does not execute that loop; its control is identical with/without the option. Keep ownership opt-in and reviewable alone. The earlier extra1.09yd is a trajectory change, not proof of improvement or regression.

## Cost, checks and review decision

Two serial uninstrumented processes, same machine, 5 warm/21 measured rotating runs, setup outside clock. Original native 22-body group, one 0.520833ms interval: combined medians **.199–.928ms**, p95 up to **6.887ms**, worst **8.460ms**. All medians pass2ms. Fresh p95 fails5ms in process A (6.887), passes in B (3.234). Retain the miss; no favorable-case retiming or passive micro-optimization. This is not game-wide cost or a wall-clock fallback guarantee.

Full validation on `0938ab2`: **1905 passed / 1 retained dry-cap failure**, 145 Python passed, typecheck/build passed, input fingerprints unchanged. Final runtime hash is unchanged (`4070e13c…`). Later edits package identical inputs and reference diagnostics; final `ee481c8` focused38 checks/typecheck/build pass with scratch-checkpoint reads deliberately denied. Reuse the full run; do not claim it used the later validation fingerprint. Portable native inputs are 5.5–5.7KB each and exactly reproduce their original interval's body/support/point/work. No solver answers are stored in them.

[Compact receipt](../../data/reviews/current/grip-native-forces.json) pins revisions, flags, manifests, component results, failed/inconclusive checks and raw hashes. Nine unrelated experimental patch failures remain43/52; keeper angular-law and support-history work remain separate.

**Recommendation:** retain this native-force candidate for review with defaults off; do not promote the full patch. The next bounded physical question is the **first cap/slip transition at the saved acquisition**, using this verified below-slip phase as control. Preserve the old dry-cap witness and both continuation references. Keep the failed runtime tail and stricter reference-convergence gap visible before any broader integration.

Reproduce with Node22.23.3 and the baseline runner (`--candidate -- node --import tsx`): `scripts/diag/physics/grip-native-forces-evidence.ts`, `grip-dry-cap-budget.ts`, `grip-native-law-limit.ts`, and `grip-native-continuation.ts --centered --fine=4096`. Raw output stays in `out/grip-native-forces/`. `grip-native-packets.ts` regenerates the small inputs only from the original checksum-verified archive; normal tests/evidence need no scratch archive.
