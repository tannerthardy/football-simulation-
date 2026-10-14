# Passive grip: integrating the normal-cap transition

The normal-cap corner now has a substantially cheaper accurate integration path.
The numerical change passes eight independent two-body World references,
including four predeclared fresh states. It also succeeds on a valid fresh
contact where the preserved uniform solver exhausts its refinement budget.
This is a bounded diagnostic candidate, not a production World replacement.

Tested revision: `804e889505e10e3a2816b788e4d90e94af237cbd` on
`codex/grip-saturation-event`, from PR #21 `9e1ac9e`. Comparison baseline stays
`4ded6b6`; runtime source stays
`f0879d091645ec5c5fb84c8fd163da006fe3c9cdcae71bf95d87d2da62829e12`.
The exact 43 flags, literal input hashes, validation receipts and both benchmark
runs are in [the compact receipt](../../data/reviews/current/grip-saturation-event.json).
Production defaults, capacities, mobility, recovery laws, previous numerical
references and experimental RB settings are unchanged. No `src/` edits.

## Cause and correction

As normal force approaches the shared grip capacity, the remaining tangent
budget approaches zero as a square root. Uniform physical-time steps resolve
that corner poorly. PR #21 needed 512 partitions on the original sharing
witness; its adaptive alternative still spent thousands of evaluations.

The first event-clock prototype preserved the accuracy gates but lost on actual
runtime: 8.339 ms versus 6.057 ms for the uniform reference. Its repeated
whole-approach shooting and small nonlinear solves outweighed the savings.
A CPU profile supported changing the integration coordinate, rather than
optimizing cloning or changing physical limits. That rejected result remains
in the receipt; raw prototypes and traces stay under ignored `out/grip-saturation/`.

The new candidate follows the force angle. Define
`beta = vn / (C * (Mnn + 1/damping))`, the current normal demand divided by
capacity, and `theta = acos(beta)`. Before normal takeover, integrate with
`theta = theta0 * (1-s)` and
`dt/ds = theta0 * sin(theta) / (d beta/dt)`.
The analytic directional derivative includes body motion, rotation, curved
material transport and changing common-foot share. This is a chain-rule time
change. Every force evaluation still calls the preserved eight ordered
normal/tangent passes; no replacement allocation or frozen force is used.

Three-stage Gauss integration carries physical time, translation, yaw, material
and raw-foot motion, impulse, temporal moments, work and effort together. Stage
closure explicitly includes raw-foot state, material coordinates, lower share
and physical time. A bounded local correction finds `beta=1` by advancing the
same equations, including a tiny backward step when it must undo a numerical
overshoot. It never overwrites state or energy to force agreement. Afterwards,
the same stages integrate ordinary physical time. Trial stages do not commit
effort; the accepted dose is integrated once.

This scope is one passive grip in a fixed slipping, opening phase, with zero
desired motor motion and zero reel. Non-event and existing tangent controls
retain their checked operators. Non-monotone clocks, chart/phase changes and
exhausted iteration budgets refuse an interval without mutating the input.
There is no claim of complete hidden-event detection or multiple-contact support.

## Accuracy and retained failures

Twenty focused tests and typecheck pass at the tested revision. The four saved
mixed references are reused; the four fresh references independently run the
unchanged World at 32,768 and 65,536 pieces. They vary opening velocity, mirror,
initial spin, curved material position and duration, with the same capacities
and recovery coefficients. All four reference pairs converge and satisfy their
physical accounting checks. Literal fixtures are in
[`config/grip-saturation-reference.json`](../../config/grip-saturation-reference.json);
replay traces remain in `out/`.

All eight candidate results satisfy the original accuracy requirements. Worst
candidate agreement is 0.0474 of the declared tolerance, with body-position
difference at most `5.51e-10 yd`, raw-foot difference `1.37e-8 yd` and lower-share
difference `2.99e-12`. Event-path work residual is at most `4.45e-12` and angular
momentum residual `1.46e-11`, below unchanged `1e-8` and `1e-7` gates. Impulse,
temporal moments, attachment position, normal/tangent allocation, passive work
and the common dose budget also pass. Refined motion/foot/share/work and ledger
differences must remain within `1/16` of their original tolerances.

Opposing controls include normal-only contact, reverse tangent motion, five
complete earlier tangent results, zero/tiny loads, proper rotation, unequal time
partitions and an analytic common-foot/clock witness. The pressure derivative
also agrees with an independent finite-difference check, including origin,
small and curved material coordinates and fixed/changing share.

The fresh lower-opening control is a real numerical refusal in the preserved
uniform method: its final 1,024-partition motion refinement error is `0.1131`,
above `0.0625`, although work residual has already fallen to `8.64e-11`.
The candidate passes at eight partitions. The comparison records that uniform
call as **no returned state**, not a successful baseline or a discarded case.

Some numerical agreement worsens slightly: on the fresh moving-arm case, the
candidate's normalized reference difference is `0.0474`, versus `0.0344` for
uniform. Both satisfy the accuracy contract; this is not a measured football
regression. On the fresh higher-opening mirror it improves `0.1690` to `0.0393`.

The nine unrelated patch-gate failures remain documented at **43/52**. No patch
panel, native tackle endings or full default suite was rerun for this isolated
diagnostic. Earlier default-suite passes describe their own revisions. Zero
timing invocation excludes timing as the cause of those nine failures; it does
not identify a common cause. The keeper angular-law witness and earlier
support-history divergence remain separate.

## Actual cost

Two separate uninstrumented processes on the same AMD EPYC 9V74 machine,
Node 22.23.3; five warmups and 21 alternating-order samples per method/input.
Preparation, observer-free accuracy comparison and repeatability assertions
are outside the accepted-call clock. No concurrent profiling or typecheck.
Ranges below show both runs, retaining every sample and spike in the receipt.

| Contact | Uniform median / p95 / worst ms | Candidate median / p95 / worst ms |
| --- | --- | --- |
| Original sharing | 3.781–4.983 / 4.926–7.533 / 6.396–7.904 | 1.073–1.315 / 1.424–4.204 / 4.310–8.102 |
| Fresh moving arm | 4.302–5.383 / 5.179–8.261 / 6.289–8.269 | 1.095–1.540 / 1.441–2.340 / 1.496–3.220 |
| Fresh lower opening | **refusal**, 8.182–10.184 / 10.214–16.178 / 27.596–28.849 | 1.030–1.192 / 1.259–2.414 / 1.340–2.851 |
| Normal-only control | .185–.555 / .505–6.479 / .529–9.226 | .255–.592 / .320–11.601 / .546–12.538 |
| Reverse control | 1.104–1.105 / 1.433–1.543 / 1.542–1.761 | 1.113–1.192 / 1.391–1.631 / 1.431–1.848 |
| Frontal control | .360–.496 / .721–.726 / .832–.898 | .387–.472 / .590–.718 / .743–.853 |

The two event witnesses with accepted uniform results improve typical cost
**3.5–3.9×**. Original sharing goes from 512 to eight partitions and 4,088 to
648 evaluations. The earlier shooting prototype was explicitly rejected;
fewer counters alone would not have established this result.

The proposed event-path budget remains median ≤2 ms and p95 ≤5 ms. Both event
paths and the newly accepted control meet it in both runs. **A global wrapper
cost claim is not established**: normal-only fallback has a 12.538 ms first-run
spike, and the existing slip-phase refusal reaches 10.223 ms in the candidate,
slightly above the proposed observed-refusal limit of 10 ms. Second-run values
are smaller; first-run spikes are retained. Reverse and normal-only fallback
also pay some classification overhead. Chart-exit and slip-phase controls still
return no state and leave inputs unchanged.

## Decision and next step

Keep this candidate experimental and retain PR #21's uniform method and the
corrected slow reference. The bounded feasibility question now has a positive
answer: resolve the demonstrated mixed-budget corner accurately without
repeatedly advancing an entire World or replacing the physical law.

The single best next step is the saved **common-foot/two-grip mechanical scene**.
Integrate its contacts and shared budget together, retaining this witness and
the frontal success as controls. Independently composing these one-grip results
would not preserve the shared foot or allocator. Establish that interface before
World insertion, active reel, recovery changes or broader tackle promotion.
One solver owner remains responsible for that change; support-law experiments
stay separate. The integration owner runs the preserved full suite only after
an exact combined candidate is designated.

Reproduce the focused checks and benchmark from the tested revision:

```sh
npm run baseline:run -- --candidate --receipt out/grip-saturation/focused.json -- npx vitest run --project core test/grip-saturation.test.ts
npm run baseline:run -- --candidate --receipt out/grip-saturation/typecheck.json -- npm run typecheck
npm run baseline:run -- --candidate --receipt out/grip-saturation/bench-launcher.json -- node --import tsx scripts/diag/physics/grip-saturation-evidence.ts --benchmark --output=out/grip-saturation/bench.json
```

Fresh World collection additionally requires the preserved acquired packets
from the earlier grip-timing diagnostic:

```sh
npm run baseline:run -- --candidate --receipt out/grip-saturation/fresh-launcher.json -- node --import tsx scripts/diag/physics/grip-saturation-reference.ts --coarse=32768 --fine=65536
```
