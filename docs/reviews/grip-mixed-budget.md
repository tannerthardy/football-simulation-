# Bounded mixed normal/tangent grip feasibility

The shared-budget extension matches the existing mechanical law, but its
shared-load runtime is still too high. Keep uniform integration as a diagnostic
reference and reject the current adaptive strategy for integration. Its modest
shared-case speedup does not compensate for slower opposing controls and
expensive refusals. No World law or production behavior changed.

Tested code/harness `927819cfa604415775121be3ae7a765775cce75d`, from experimental
[PR #20](https://github.com/tannerthardy/football-simulation-/pull/20) `1945a34`.
Comparison baseline remains `4ded6b6`; runtime source remains
`f0879d091645ec5c5fb84c8fd163da006fe3c9cdcae71bf95d87d2da62829e12`.
[Receipt](../../data/reviews/current/grip-mixed-budget.json) pins flags, exact
inputs, references, solver settings, tests, raw hashes and adverse evidence.
The previous capped/tangent methods, their fixtures and all `src/` files are
unchanged. Capacities, recovery laws, defaults and RB flags remain unchanged.

## What this boundary required

The earlier bounded method deliberately refused attained normal/reel demand.
The earlier mixed-support reference used an isotropic unbounded attachment and
full lower share. Its scalar mobility cannot be transplanted to a curved,
rotating attachment with acquired changing share.

For the existing bounded Jacobian `J`, contact-frame mobility is
`M_ab = mobility * (J a)·(J b)`. Its normal/tangent cross term matters: tangent
load can move the attachment normally. The diagnostic preserves World's eight
ordered force passes, starting at zero force, including the same shared vector
capacity and original 6-Hz/.8 normal damper. It does not substitute a new
optimal allocator. Normal stiffness still uses translational reduced mass;
normal body rotation and changing torque arms remain in the moving equations.

The extension follows one passive grip, zero requested motor velocity, zero
pull, a fixed slipping phase, monotone opening and the existing zero-extension
hold ratchet. Translation, yaw, material/raw-foot motion, impulse, temporal
moments, body/motor work and the .3-second slipping clock advance together.
The existing tangent operator handles intervals inside its own complete scope.
Scope exit or refinement exhaustion returns no state. There is no World adapter
or proof of complete hidden-event detection.

The normal-only and shared-load inputs come from the saved 45-degree/8 seed-3001
packet, retaining masses, capacity, acquired share (~.1706) and declared curved
material offset. The earlier 3 yd/s opening / 16 yd/s tangent transform spends
the entire capacity on normal force at this lower share: it cannot test sharing.
A declared .3/16 control does; its mirror checks covariance, and reversed
tangent motion checks the opposite cross-coupling direction. These are
mechanical controls, not additional native football outcomes or fitted ratings.

## Accuracy and retained failure

Four independently refined unchanged-World references pass at 32,768/65,536
pieces under the original 1/16 reference allowance. Ground/contact work is
zero, support stays up, the grip remains live, reel is zero and one vector cap
bounds both force components. The collector does not import the new kernel.
Frozen-row force errors shrink about tenfold per tenfold reduction in World
step: shared .250→.0250→.00250 force units, reversed .194→.0194→.00194.
The fully normal-saturated control matches exactly. Audits run after timing,
and the prescribed prototype support hook is restored.

All 21 focused contracts and typecheck pass. Checks cover both methods, moving
references, an independent analytic unsaturated coupled force, shared cap,
five complete existing tangent results, unequal intervals and both angular
moments, rotation of the anisotropic map, zero/tiny loads and refused branches.
Input objects and serialized packets remain unchanged.

| Maximum error against four independent references | Uniform | Adaptive | Existing limit |
| --- | ---: | ---: | ---: |
| Body position / facing / spin | 3.99e-10 / 1.35e-8 / 1.07e-5 | 4.27e-10 / 1.64e-8 / 1.07e-5 | 5e-7 / 2.5e-6 / 2.5e-4 |
| Material / raw-foot position | 2.71e-9 / 1.31e-8 | 2.34e-9 / 1.28e-8 | 5e-7 each |
| Leg share | 2.94e-12 | 2.94e-12 | 1e-6 |
| Impulse / temporal moment | 2.58e-5 / 4.06e-8 | 2.58e-5 / 4.34e-8 | .002 / .00005 |
| Angular impulse / temporal moment | 2.12e-5 / 2.69e-8 | 2.12e-5 / 3.27e-8 | .0005 / .000005 |
| Body / motor / passive work | .000259 / 2.14e-6 / .000258 | .000247 / 2.14e-6 / .000249 | .01 each |
| Body-work balance residual | 1.01e-9 | 1.20e-10 | 1e-8 |

Angular balance stays below 2.2e-11; body/impulse representation stays below
8.6e-14. Capacity and passive-work checks pass. No tolerance was loosened and
independently integrated work was not replaced with kinetic-energy work.

The first adaptive prototype used a time-linear local error budget. Near the
normal-cap takeover (~3.465 ms), the square-root tangent remainder has a finite
impulse but an unbounded slope. Retries reached ~1e-14-second steps and failed
in roundoff in both shared-load mirrors. The prototype and failure logs remain
in `out/grip-mixed/`. The corrected diagnostic allocates local error nonuniformly
and bounds the sum of accepted state estimates and absolute work drift. The
original global state, work, angular and representation gates still apply.
This repairs that numerical refusal; it does not establish practical speed.

## Cost and decision

Node 22.23.3, AMD EPYC 9V74; serial, unobserved/unprofiled timing. Five warmups
per method/input, 21 interleaved repeats with rotating method order. Preparation,
assertions, logs and row audits are outside timed calls. Repeated endpoints are
identical. P95 is the nearest-rank sample statistic, not a population guarantee.
All values are ms per isolated 4.167-ms interval, not game speedups.

| Input | Uniform median / p95 / max | Adaptive median / p95 / max |
| --- | ---: | ---: |
| Normal saturation | .165 / .379 / .407 | .599 / .925 / 1.258 |
| Shared normal/tangent load | 4.778 / 6.254 / 6.370 | 4.637 / 5.388 / 5.394 |
| Reversed tangent control | 1.192 / 1.681 / 1.706 | 2.781 / 3.274 / 3.351 |
| Delegated frontal force-free | .411 / .596 / .700 | .452 / .685 / .737 |

Both shared-load methods miss the provisional median≤2 ms / p95≤5 ms budget.
Adaptive reduces shared-case RHS count 4,088→3,636, but only cuts median cost
about 3%. It increases work in the normal-only and reverse controls. The frontal
labels execute the same delegated operator and exact endpoint, so their sample
timing difference is not evidence of changed mechanics.

Unsupported chart exit, one warmup/seven repeats: uniform median/max .791/1.220
ms, adaptive 27.516/30.297 ms. An explicit higher-input-capacity stress control
forces the unsupported slip ending: uniform 5.968/12.296 ms, adaptive
33.051/47.322 ms. No state is accepted or input mutated. These observations
fail the declared 10-ms refusal screen; they are not global worst-case bounds.
The stress input does not change any player's capacity or force coefficient.

A separate pinned-source gate probe explains the remaining refinement:
at 256 uniform pieces, work already passes (4.92e-9), but normalized motion
coarse/fine difference is 1.287 versus the unchanged 1/16 limit. At 512 it
falls to .0127. Therefore a consistent-work repair alone cannot remove this
cost; impulse/timing accuracy around the allocation corner is also required.
The independent sampled trace brackets normal-only onset at 3.46279–3.46686
ms. That trace spacing is not a precise event uncertainty bound. Probe logs
are diagnostic, separate from the reported accuracy and benchmark endpoints.

Recorded launcher cost is 46.25 seconds, including the new mechanical
references, development/final focused checks, two typechecks and cost collection.
Large traces and rejected prototypes stay in ignored `out/`; the receipt shares
the compact reference inputs, allocation audit and corner evidence.

## Single next step

Stop this adaptive optimization. Use the saved shared-load case and normal-only
control to test event-local integration at normal saturation, preserving the
same force order, vector cap, temporal impulse, moving attachments and work.
Do not collect another reference panel or broaden to World insertion before
that corner meets accuracy and practical cost. Uniform remains the diagnostic
reference; neither strategy is adopted into production.

Multiple contacts/common-foot allocation, active normal/reel work, phase changes,
long holds and exactly-once World effort/fatigue composition remain unproved.
The nine unrelated patch failures remain at their existing 43/52 pin, with no
rerun/re-pin or common-cause claim. Keeper/angular law and the .24-yard support
history remain independent. No new native tackles, games, full suite, baseline
designation or patch promotion occurred. The integration owner retains the
preserved full-suite check on any reviewed combined runtime candidate.

Reproduce local accuracy with the pinned Node and saved literal references:

```sh
npm run baseline:run -- --candidate -- npx vitest run --project core test/grip-mixed.test.ts
npm run baseline:run -- --candidate -- npm run typecheck
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/physics/grip-mixed-evidence.ts --benchmark
```

The evidence collector's post-timing World row audit also needs the preserved
acquired packets in `out/grip-timing/`. Independent reference collection is
separate (`grip-mixed-reference.ts`, default first pair, `--controls` opposing
pair, `--combine` after both pass). Reuse the checked fixture instead of
recollecting it when runtime/input/boundary hashes remain compatible.
