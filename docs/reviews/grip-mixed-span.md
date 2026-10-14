# Passive mixed grip with stored span energy

2026-10-14 (America/Phoenix). Tested code/harness **`a06f02ace09efebe123f2efb20f9919ce3f9d9d0`**, from preserved [PR #38](https://github.com/tannerthardy/football-simulation-/pull/38) `0370053`. Baseline remains **`4ded6b6`**; runtime source `f0879d09…` and all production defaults are unchanged. The [receipt](../../data/reviews/current/grip-mixed-span.json) and [input manifest](../../config/grip-mixed-span-inputs.json) pin flags, inputs, code, references, cost and adverse evidence.

The next accounting question is answered for one passive, below-slip grip: **body energy + stored span energy + common-foot work + damping close together while both normal and tangent forces act.** A separate integration candidate validates a 200µs interval at affordable cost. It still fails an ordinary-length control and the long cost budget; it is not ready for World or football integration.

## Mechanism and bounded correction

[PR #38](grip-world-accounting.md) showed why the original passive work limiter rejects restoring tension at rest: it cannot spend the existing spring's stored energy. Its finite reserve repaired a 1µs event, but 128 World pieces at 200µs still failed strict impulse/dose agreement. Preserve that candidate and failure.

This diagnostic solves the same normal spring/damper and sticking tangent targets together. Let `vn,vt` be body-point velocities, `M=(nn,nt;nt,tt)` the existing material/foot mobility, `e=max(distance−hold,0)`, and `U=k*e²/2`. The original 6Hz/.8 law implies:

```
Fn + d*(vn + nn*Fn + nt*Ft) + k*e = 0    (when tension is active)
vt + nt*Fn + tt*Ft = 0                  (sticking tangent)
Fn <= 0; hypot(Fn,Ft) < .98*capacity    (this candidate's scope)
```

The direct coupled solution matches the original eight ordered force-target passes in every declared frozen case, to below 1e-9. The existing physical capacity is not changed. The `.98` boundary is the existing slipping marker; this candidate refuses that phase rather than supplying a new saturated allocator, sliding law or guaranteed hold.

Body force power and the **one common motor** use the same moving material Jacobian. Spring power is `k*e*pointNormalVelocity`. Their sum is funded once by the actual potential change, with nonnegative damping loss. The common motor includes the normal/tangent cross work; isolated channel work cannot replace it. No active arm work is supplied.

The efficient candidate uses DOP853 on body translation/yaw, the bounded material coordinate, raw foot travel, impulse, temporal moment, body/motor/spring work, loss and force dose together. It does not repeatedly clone or advance World. Whole-interval refinement retains the strict prior tolerances and `1/16` allowance, with 4096 field evaluations maximum. Coarse explicit stages can overshoot cap on a long interval; those trials are recorded and refined, and no out-of-scope state is accepted.

This is an isolated contact-law candidate. It does not run World support-state/recovery, active reeling, collision/release or fatigue lifecycle. Those interfaces and native outcomes remain separate acceptance work. Existing World, recovery, capacities, awareness, controller code and experimental defaults are untouched.

## Evidence for the correction

Use the acquired angled packet from PR #38 (SHA256 `c02db74d…`), its same 2ms loading/stop preparation, and declared mechanical transforms. The manifest was fixed before moving comparisons:

- Loaded mixed: add `.08 yd/s` tangent velocity while retaining stored extension.
- Curved loading and curved return: declared local material point `(-.25L,.125L)`; translate the held COM to preserve the original world grip point and stored extension; tangent `.08` and `−.02` respectively.
- Radial loaded and zero-span opposing controls: unchanged PR #38 preparation. The zero control deliberately removes the stored energy through a rest reset before evaluation.
- Fresh curved input: `(-.20L,.10L)`, tangent `.06` and held spin `.025`. Player capacities remain identical.

The independent reference solves a normal-halfplane SPD system and uses RK4, not the candidate's force elimination or stepper. It shares the physical coordinates/ODE, which is explicit in the protocol. Independent force arithmetic and time integration do not constitute an independent validation of every reduced-body assumption.

All six **200µs** inputs agree with refined 128/256 references. Worst normalized candidate error **.0014405**, reference refinement **.0222682**, below the `.0625` allowance. Initial 64/128 references were not converged and remain recorded. Body work, potential transport, total energy, angular conservation, attachment movement, temporal moment and dose all pass. Maximum force utilization is `.461` of the unchanged shared vector capacity; no slip occurs.

| 200µs scene | Spring-energy change | Body minus motor work | Damping loss | Motor cross work |
| --- | ---: | ---: | ---: | ---: |
| Loaded mixed | −1.73627e-6 | +1.35148e-6 | 3.84792e-7 | 2.53e-14 |
| Curved loading | +3.11443e-6 | −4.44404e-6 | 1.32961e-6 | +1.11844e-5 |
| Curved return | −2.87098e-6 | +1.81473e-6 | 1.05625e-6 | −1.19224e-6 |

These are reduced energy units, kg·yd²/s². Returning energy may produce positive body-minus-motor transfer; the potential pays it. Loading stores energy while dissipating the rest. The two signs of cross work are both retained. Total-energy residuals are below 1.2e-13 on these short inputs; motor composition residuals are below 7e-18.

The new radial 200µs result also matches the preserved PR #38 scalar moving-material reference. Its worst normalized discrepancy is `.0007383`; the earlier funded World128 result was **142.48**, a retained failure. Unchanged World128 is also measured on the exact prepared mixed inputs: normal dose is only `4.57e-7` on loaded-mixed versus the reference's approximately `.00174518`. This does not attribute every body/tangent difference to the missing spring allowance; finite World integration has its own numerical damping and motion differences.

**16 focused tests/typecheck pass** at the exact tested revision: twelve new contracts cover force targets, complete work/potential accounting, moving reference agreement, radial reuse, mirrors/rotation, unequal external partitions and refusals. Four preserved ordinary/local-sweep/resolved/fast tests cover equal physical effort over equal elapsed time. This branch verifies physical dose once in the contact integrator; it has not inserted that dose into a new native World fatigue path.

## Retained ordinary-length failure

At **4.166667ms**, five of six candidate/reference comparisons pass. Mixed inputs require 128 partitions / about 3000 fields; radial needs eight and zero-span two. The curved-return candidate refuses at its accuracy bound, and its 2048/4096 reference pair is still unconverged (`.08520`). It is not a passing control.

One targeted replay identifies the binding error. Tangent force reverses between **.805664 and .806681ms** while normal force remains about `−7`. The absolute tangent-channel dose integrand has a kink there. Comparing the candidate's discarded 64/128 states:

- Absolute tangent-dose discrepancy **2.04268e-7**, normalized **204.27**: fails.
- Physical vector dose discrepancy **1.30641e-11**, normalized `.01306`: passes.
- Normal impulse/dose discrepancy **1.31948e-11**, normalized `.01319`: passes.
- Body/motor/spring work and damping discrepancies are at most 6.24e-13: pass.

This identifies a numerical component-dose integration problem, not a demonstrated football regression, support-law failure or wrong force target. The discarded states are diagnostic evidence; none is returned as accepted. The component-dose gate remains intact. Resolving the reversal and reference convergence is required before claiming this longer control passes.

## Actual cost versus budget

Two serial processes on the same EPYC9V74 / Node22.23.3: five warmups, 21 repetitions, rotating method order. Preparation, observers and profiling are outside the clocks. The target remains **2ms median / 5ms p95**, with **10ms refusal/fallback**; passing a short interval does not pass the ordinary-length budget.

| Operator | Median ms, two runs | p95 ms, two runs | Largest measured ms |
| --- | ---: | ---: | ---: |
| 200µs mixed candidates, including fresh | .630–.848 | .842–1.777 | 3.633 |
| Matched 200µs radial candidate | .217–.258 | .347–.398 | .476 |
| Matched radial funded World128, accuracy failure | 3.448–4.328 | 6.395–8.066 | 8.435 |
| Matched radial original World128, wrong restoring force | 2.822–3.390 | 5.154–5.485 | 6.900 |
| Matched radial reference256 | 2.916–2.974 | 4.251–4.919 | 4.927 |
| 4.166667ms curved loading candidate | 9.416–9.685 | 11.530–12.938 | 13.572 |
| 4.166667ms curved-return refusal | 8.974–9.315 | 10.667–14.002 | 24.687 |

The short mixed cases consume 32–42% of the median budget and at most 36% of p95. The longer valid example costs **4.7–4.8×** the median budget; the observed refusal reaches **2.47×** its bound. Original/funded World speed is not acceptance because their accuracy fails.

A separate profile of 400 curved-loading short operators (310 samples, 500µs period) assigns about 25% of self samples to `frame`, 18% to the explicit step, 14% combined to the force solve, 6% to geometry and 10% to GC. Whole-World repeated solving has been removed, but the long interval still uses roughly sixteen times the short field count. Reducing unnecessary subdivisions is the useful next target; removing accounting gates or a smaller object-copy optimization does not establish accuracy or affordable long behavior.

## Recommendation and next step

Preserve this narrow candidate and its references for review. **Do not integrate or promote it, and do not run a football campaign yet.** The single next question is whether splitting at the actual tangent-force reversal and using local step lengths can preserve these same force, impulse/moment, motion/material, energy and dose gates at ordinary-length cost. Start with curved-return and the successful curved-loading control. Preserve the uniform candidate/reference and measured refusals; do not change a force law or drop the component-dose assertion to make it pass.

After that interval is reliable and affordable, validate its complete World/support/effort interface on matched successful/failed native contacts and fresh inputs. No NFL-average tuning, broad games or awareness combination is justified by this mechanical milestone. The nine unrelated patch failures remain **43/52**; keeper angular-law and support-history tapes stay independent. A future integration owner must claim and run the preserved full suite on the exact combined candidate.

## Reproduction

Use the pinned Node and baseline launcher. Core tests use the committed input manifest and do not require raw native packets. The evidence/provenance and matched World comparisons additionally require the immutable `out/grip-timing/` packet/manifest from PR #38. Missing or mismatched packets fail before comparison; no new snaps are generated.

```sh
node scripts/baseline.mjs --candidate -- npx vitest run --project core test/grip-mixed-span.test.ts test/grip-effort.test.ts --maxWorkers=1
node scripts/baseline.mjs --candidate -- npm run typecheck
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-mixed-span-evidence.ts
# Run these serially with no competing tests or profiler:
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-mixed-span-evidence.ts --benchmark --output=out/grip-mixed-span/benchmark-repeat.json
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/grip-mixed-span-evidence.ts --profile --output=out/grip-mixed-span/profile-repeat.json
```

Raw frames, candidate/reference states, rejected development references, exact reversal replay, samples and profiles remain in ignored `out/grip-mixed-span/`. The compact receipt hashes them. Evidence collector type declarations were repaired before final pinned checks; no physical expectation was rewritten. No runtime or combined engine change was published here, so no full suite/game run was dispatched.
