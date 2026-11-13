# Lower attachment-bound diagnosis

**Production physics is unchanged; this release is not fixed.** A small actual-World
restart reproduces the retained Counter witness's abrupt low-hold release. This
is evidence for a localized reduced-model experiment, not a requirement to expand
the foot solver before the current tackle-controller work can ship.

## Reproducer and retained evidence

Run from the repository root:

```sh
node --import tsx scripts/diag/lower-attachment-review.ts out/lower-attachment-review/report.json
```

The [retained baseline report](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/tackle-timing/lower-attachment-baseline.json.gz)
uses engine source `2b405d9a79bbb09c21e5e1146a32632c62263fb9e67f319091196f45d8a80ef4`
and diagnostic SHA-256 `ddac9c79e135369f1a352bd57d7d044e54ff805df0002a69bee368edac3e9aa0`.
It records the compressed input trace's checksum, historical source, profiles,
inputs, actual World state transitions, observer signatures and accounting.

The input is the historical broader-controller witness
`RC-R2-counter-under-R-S11`, retained in
[the approach-control evidence](../../../data/reviews/physics-world/approach-control/README.md).
It is separate from the final controller's football results. The restart restores
the runner, grounded corner and already acquired grasp at 7.80 or 7.85 seconds,
then executes the ordinary World with recorded commands as exogenous inputs.
The 36 primary cases vary both mirrors, 12/24/48 subdivisions and grip capacity
at 0.15/1/2 times the recorded value. Eight additional cases test equivalent chart
rebasing and an alternative reconstruction of the missing acceleration filter.
Four negative controls remove capacity or put the holder beyond his reach.
These are variants of one diagnosed interaction, not 48 independent NFL samples.

This is **not an exact replay of the historical play**. The trace contains
positions, velocities, profiles, facing, energy, reduced support and actual held
points, but omits optional yaw, squeeze, sprint-load and support-filter/history
state. The script discloses every omitted field and supplies defaults; its
previous-acceleration sensitivity is not a reconstruction of the missing exact
filter. It removes other bodies and does not rerun football decisions or tackle
acquisition. It restores the private attachment reference to preserve the
recorded held point; all subsequent solving uses the production World.

## What is reproduced

All 36 primary cases and all eight sensitivities release through the lower-body
attachment bound. The negative controls release through their own capacity/reach
path, with no lower-bound release. Mirror endpoints and release classifications
are exact. Maximum momentum/work residuals are approximately
`4.9e-12` / `3.9e-11`, with no support-motor work excess. Four observer/control
signature checks establish that the onset instrumentation does not alter their
trajectories. Conservation alone does not validate the attachment law.

In the native 7.85-second, 12-subdivision restart, the first invalid state occurs
at approximately 7.89167 seconds:

| Quantity | Value |
| --- | ---: |
| Holder to held point | 0.598 yd |
| Held point to runner body | 1.080 yd |
| Runner's profile-derived body bound | 1.071 yd |
| Effective grip capacity | 937 kg·yd/s² |
| Previous completed tick's mean grip force | 86.9 kg·yd/s² |
| Mean force during the release tick | 35.1 kg·yd/s² |
| Slipping at the release | false |

The grip is within the holder's reach and has ample capacity. It breaks because
the runner's reduced attachment exceeds his own body bound. During a World
substep, `joint.force` stores accumulated impulse; only at tick completion is it
converted to mean force. The report labels that in-flight field separately.

Two plausible explanations are ruled out here. `foot.offset` integrates achieved
**corrective** velocity; nominal body transport appears only in
`foot.anchor = body.pos + foot.offset`. Subtracting nominal travel therefore
does not address this excursion. A chart rebase preserves
`body.pos + legShare * offset + reference`; equivalent rebased starting charts
give identical endpoints. This is not a coordinate-reset discontinuity.
The mismatch is treating accumulated averaged recovery as an indefinitely
transported anatomical lower attachment, then terminating the grip at its bound.
The resulting grip loss also removes the held-support state and allows recovery.

## Smallest useful experiment

Try a **default-off bounded attachment map** before a hard-stop foot/contact
lifecycle. With correction coordinate `q`, leg share `s`, reference `r0` and the
existing profile reach `L`, define:

```text
z = s*q + r0
r(z) = L*tanh(|z|/L) * z/|z|       (continuous zero limit)
held point = body.pos + r(z)
J = s * derivative(r, z)
```

This uses a finite radial map and one small shared Jacobian rather than a new
anatomical body or strength parameter. Preserve `z` during share changes and
chart rebases. Acquiring or restoring a nonzero material point must initialize
the reference through the inverse map so enabling it does not jump the contact.
That inverse requires the acquired point to lie strictly inside `L`. Points at
or beyond the bound need an explicit rejected/legacy fallback; do not initialize
an infinite coordinate or silently clamp a live attachment. Retain near-bound
initialization and continuity checks before promotion.
The particular `tanh` form is an explicit model assumption, not a measured NFL
limb law or a uniquely justified function.

Every affected path must use the same derivative:

| Site | Required matching operation |
| --- | --- |
| `graspPoint` | Bounded material-point geometry. |
| `graspVelocity` | Body-relative velocity plus `J * achievedCorrectionVelocity`. |
| `supportImpulse` | Motor impulse `Jᵀ * gripImpulse`; unchanged equal/opposite body impulses. |
| `supportWorkChange` and motor ledger | Work of that same projected aggregate motor impulse. |
| `jointRows` / normal effective mass | Body inverse mass plus `mobility/h * |Jᵀ*n|²`. |
| `solveGrasp` / tangent effective mass | Separate tangent term `mobility/h * |Jᵀ*t|²`; do not reuse normal mass after the mapping becomes anisotropic. |
| Active reel demand | The same directional mobility and shared grip budget. |
| `syncHeldSupport` and duplicate-row checks | Preserve mapped point and derivative across reference changes; replace this release only when the bounded map actually owns the geometry. |
| Reach validation and diagnostic observations | Inspect the same mapped physical point. |

Normal/tangent coupling must follow the updated aggregate motor force during
the existing solve. Recovery allocation and capture-point response continue
using actual achieved correction; they receive no new strength multiplier.

Deleting the bound alone permits unbounded lower attachment travel. Clamping
`q` after the solve changes achieved placement without accounting for the force,
velocity, work or balance that created it. Changing only `graspPoint` would pair
bounded geometry with the old velocity/Jacobian and repeat the inconsistency.
A hard unilateral support stop is another option, but its active-set, onset and
multiple-attachment behavior impose more complexity than this first experiment.

The map has a material tradeoff: near full extension it reduces how strongly a
single lower hold opposes averaged corrective support, while the grip continues
to oppose body motion. That may let carriers recover too easily. It is a stated
reduction, not a literal held-sole model. Keep it default-off unless finite-
difference derivatives and virtual-work checks pass, weak/medium/strong grips
remain progressive, ordinary frontal tackles survive, mirrors and local
refinement remain stable, and the retained low-hold and football cases improve
without retuning strength or fitting gains. A plausible escape remains valid;
preserving the hold is not itself the target outcome.
