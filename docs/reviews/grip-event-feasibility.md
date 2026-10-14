# Bounded implicit grip-tail feasibility

Neither tested implicit prototype is ready for World integration. Gauss preserves
the mechanical contracts but costs roughly three times the existing local
adaptive kernel on loaded cases. Radau is substantially slower. Preserve this
negative result and the strict reference; do not broaden either prototype.

Code and collector: `59724bf206110f3fd98beef77f79443ea76f39f0`, branch
`codex/grip-event-integration`, from PR #15 `3bd8d5e`. Comparison baseline remains
`4ded6b6`. Runtime source remains `f0879d09…`; no `src/` changes. All 43 baseline
flags and five literal inputs are pinned in the [receipt](../../data/reviews/current/grip-event-feasibility.json).
No physical law, capacity, recovery rule, default or existing tolerance changed.

## Question and implementation

Can a small implicit integration of the existing viscous tail remove its
stiffness cost without repeatedly advancing the World? Start with the saved
acquired angled grip and frontal force-free control. Reuse the independent
bounded World references; the [strict acceptance correction](grip-state-convergence.md)
already verified their compatibility with this unchanged physical operator.

The original kernel localizes cap exit and the 98%-capacity slip marker. Its
tail then uses explicit RK4 step doubling. Effective tangential mobility is
small at partial leg share, creating a short relaxation time. The new optional
`gauss` and `radau` methods replace only that tail step with two-stage implicit
collocation. A rank-one Jacobian preconditions Newton's iteration; each residual
still evaluates the full moving bounded geometry, force cap, material Jacobian,
body torque and independent work. The approximation does not become the force
law. Caps, slip-share clock, impulse and temporal-moment ledgers are unchanged.
Accepted nodes and the endpoint must pass the original channel/scope checks.
The implicit methods also refuse output violating the existing `1e-10`
body/impulse representation contract, including nonfinite results.
Refinement, retries and iterations are bounded; exhaustion returns no state.

Gauss is fourth order and A-stable; Radau is third order and L-stable. Stability
alone did not deliver efficiency. In an instrumented initial draft, Gauss cut
accepted tail steps from 217 to 95 but increased tail force evaluations from
2,628 to 3,336. After the invariant correction below, total acquired evaluations
fall to 3,050 versus adaptive's 3,248, yet Newton's repeated vector operations
and stage solves still make it slower. This rejects these implementations,
not every possible implicit method.

## Correctness and retained adverse evidence

Gauss matches all five independent references: acquired mirrors, frontal, and
displaced-material mirrors. The displaced controls initially failed the existing
`1e-10` body/impulse representation limit at `1.0953e-10`. Newton's approximate
search direction had corrected body momentum without the corresponding impulse
ledger direction. Carrying those linear identities through the search direction,
plus tightening its normalized residual threshold from `1e-8` to `1e-9`, reduces
maximum final representation error to `3.55e-14`. Physical acceptance tolerances
were not relaxed. The first failure and exact draft snapshots remain under
`out/grip-event/`, with hashes in the receipt.

Final Gauss maxima against the independent references:

| Quantity | Error | Existing limit |
| --- | ---: | ---: |
| Body position | 1.86e-10 yd | 5e-7 yd |
| Facing / spin | 6.82e-9 rad / 7.24e-7 rad/s | 2.5e-6 / 2.5e-4 |
| Material / common-foot position | 6.20e-10 / 2.10e-9 yd | 5e-7 yd |
| Leg share | 7.13e-8 | 1e-6 |
| Translational impulse / temporal moment | 1.24e-6 / 1.18e-8 | .002 / .00005 |
| Angular impulse / temporal moment | 1.44e-6 / 1.36e-8 | .0005 / .000005 |
| Body / motor / passive work | 3.93e-7 / 8.72e-6 / 9.11e-6 | .01 each |
| Work / angular conservation residual | 1.67e-9 / 2.11e-10 | 1e-8 / 1e-7 |

All 23 focused contracts and typecheck pass. Unequal partitions across the slip
marker, rotated anisotropic geometry, zero/tiny loads and refused normal/reel,
active-motor and over-reach inputs are included. Radau was checked only on the
initial acquired witness and frontal control; its cost rejection makes a wider
transfer panel unnecessary. The collector verifies exact unchanged adaptive
results on all five inputs. No new World references, tackles, games or full suite
were run. The nine unrelated patch promotion failures remain as documented;
keeper/angular-law and the .24-yard support-history fork remain independent.

## Same-machine runtime

Node 22.23.3, AMD EPYC 9V74, serial, one warmup and seven repeats per method/input.
Input preparation and checks are outside the timer; no observers or profilers
run during timing. Sample p95 equals the sample maximum with seven observations;
these are not population tail estimates. Results are milliseconds per interval.

| Input | Existing adaptive median / max | Gauss median / max | Radau median / max |
| --- | ---: | ---: | ---: |
| Acquired angled | 5.292 / 6.858 | 14.427 / 18.757 | 150.472 / 300.109 |
| Displaced material | 4.820 / 5.597 | 20.066 / 25.391 | Unrun |
| Frontal force-free | .095 / .248 | .407 / 1.186 | .342 / .735 |

All are measured on identical inputs in the same process; every repeated
endpoint is identical. The provisional mechanical budget remains median ≤2 ms
and sample p95 ≤5 ms. Both new methods miss it on loaded inputs and regress
force-free cost. PR #15's strict whole-World reference costs about 1,063 ms
resolved / 711 ms fast on the acquired interval; that preserved evidence is
reused, not recollected or treated as a production-runtime claim. This pass's
recorded launcher cost is 51.13 s, including failed/repeated focused checks and
three typechecks; exploratory probes are separately retained.

## Decision and next step

Keep these methods diagnostic. The next bounded experiment should integrate the
viscous force response analytically, including its first temporal moment and
force-squared work, while updating moving geometry under the same strict gates.
Merely making a step stable or reducing its number of subdivisions is insufficient
when each step still performs repeated nonlinear force solves. Do not replace
independent work with an energy delta to force ledger agreement.

The scope remains one passive tangent grip with prescribed free support and zero
attained normal/reel demand. Shared normal/tangent budgets, multiple contacts,
active drive, support-state changes and exactly-once World effort/fatigue
composition are not established here. Node/endpoint checks also do not prove
that every hidden subinterval event is detected. These risks must be addressed
before any World insertion, with a bounded fallback to the preserved reference.

Reproduce the focused evidence without a full suite:

```sh
npm run baseline:run -- --candidate -- npx vitest run --project core test/grip-bounded.test.ts
npm run baseline:run -- --candidate -- npm run typecheck
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/physics/grip-event-evidence.ts --benchmark
```
