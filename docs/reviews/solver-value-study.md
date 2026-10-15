# Solver value checkpoint: park expansion, investigate actual leg-grasp braking

**Do not continue expanding the passive-hands integrator now.** We have useful
mechanical references, but no demonstrated football return from this method.
The highest-value next physics question is the first .2 seconds of an actual
support-coupled leg grasp, including active reel and passive restraint. Those
are the loads changing the runner's momentum in the selected native contacts;
the current one-passive-hands kernel does not support them.

This is a priority decision, not a claim that numerical accuracy or conservation
doesn't matter. Preserve PR73/PR77 and the corrected slow references. PR77's
moving-geometry failure remains a failure; it is not waived for promotion.
Keep the independently reviewable contact-law extraction separate from this
new-solver decision. No historical solver package is imported or enabled.

## The test that can change the investment decision

Diagnostic `69716a67faad84b162d4e4541eea49c7ca25abe0`, source unchanged
`5fe694911cda2806e5c4392e5f5d97aaf09abb593d8f98a106fa80fab88a7565`,
from draft [PR77](https://github.com/tannerthardy/football-simulation-/pull/77)
`25787e0`. [Exact manifest/results/receipts](../../data/reviews/current/solver-value-study.json).

Reuse O31/D32, seed3, gun_wing_12 Split Zone, Cover3, Tite/base34 and
Under/base43. Options are `handContact:'patch', groundMovement:'legacy'`,
ordinary split ground/hand selection; all44 baseline flags, components=1,
RUN_READ=0. This is the pinned PR77 host, not a merged/current-controller
validation or a new baseline. Current remote develop remains `8ca8dee`.

Temporarily refine just the .35–.40 World tick to192/768/3072 subdivisions,
then restore ordinary stepping. The entire near-contact tick is refined;
other bodies are included. No bodies, impulses, work or controller states are
injected. This tests whether improving the disputed interval has useful
downstream consequences; it is **self-refinement, not independent physical
truth or a new solver's validated accuracy**.

Both cases have exact null12 controls and exact instrumented/uninstrumented
body/command/intent/mind/RNG/event/joint/report fingerprints. The Tite .30–.35
ordinary-ground refinement preserves the complete native trajectory exactly.
Every candidate has the same body/request/RNG input through its intervention.

The initial2-second pilot censored every carry before first runner contact.
We retained it, then extended the **same inputs** to dead or8 seconds. All11
observed continuations and two plain controls finish: no skipped/censored final
plays, no new inputs and no game campaign. A truncation at2 seconds would have
been insufficient to make the football-value claim.

## Football result: no demonstrated benefit from the disputed interval

| Same native input | Native | Refine192/768/3072 for the disputed tick |
| --- | --- | --- |
| Tite credited gain | 4.04 yd | 4.04 /4.04 /4.04 yd |
| Under credited gain | 1.57 yd | 1.57 /1.57 /1.57 yd |
| Tite first actual carrier contact / tackle event | 2.75 /4.30 s | Same times and primary opponents |
| Under first actual carrier contact / tackle event | 2.90 /3.60 s | Same times and primary opponents |
| Target helper release/check/climb | No release/climb, both cases | Same decisions |

Use actual acquired-grasp/body-contact events and exact first-contact x, not
proximity. The maximum Tite first-contact-depth change is **.000962 yd**;
Under's is **.00000211 yd**. The maximum credited-spot-x change is
**.001240 yd** / **.000151 yd** respectively. Official gains are rounded to
.01yd; the unrounded spots are preserved too. The largest final runner
*two-dimensional body-position* change is .018225yd / .000828yd; that is a
different measurement from the credited spot.

The Tite linemen are **not** unchanged. At2 seconds, some body positions differ
by up to .0305yd and facing by .1473rad. Later, other-body differences exceed
2yd and RNG histories first fork at3.30–3.90 depending on the refinement.
The fine continuations do not converge monotonically in every body coordinate.
Preserve those differences as unadjudicated trajectory sensitivity; neither
call them harmless nor label them football improvements. The observed runner
and helper results above survive them. No league-level inference from two reps.

The old helper failures also aren't a valid success target for this solver.
[Run's review](https://github.com/tannerthardy/football-simulation-/blob/4f90b6428b98224774bbd63a4adad6bb3e354b53/docs/reviews/helper-contact-adjudication.md)
shows that Under/Tite's former guaranteed climbs are not demonstrated earned
opportunities under the changed law. Two separate mirrored collection failures
are feasible controller-routing errors. Do not force the solver to restore
those old endings or claim this study fixes that routing dependency.

## The proposed scope misses the relevant runner contacts

Read-only screening of PR68's existing single-passive-row preconditions finds
eligible geometry in24/960 native Tite near-island solve calls (**2.50%**) and
9/792 Under calls (**1.14%**). These are an **upper bound**, before local motor
deadline/heading checks, not actual event-kernel invocations or a fraction of
all physical contacts. The current World combines near bodies into one island;
multiple rows or an unrelated impact can conservatively exclude it.

The eligible Tite ticks are .35/.40; Under is part of .45. **None is in the
runner's first loaded contact window.** A new native leg grasp also lies outside
the passive-hands force/support scope independently of that island restriction.
Expanding to support those mechanisms would be another substantive project;
speeding up the present kernel doesn't establish their readiness.

## Actual runner loads: a better research target

Instrument the two native baselines' actual velocity changes at `feet`,
`pairImpulse`, `supportImpulse` and `solveContact`. No force is altered.
The plain/null controls remain exact. Momentum and carrier translational
kinetic-energy sums close (maximum residual5.18e-14kg yd/s and1.27e-11kg yd²/s²
across the native plays). This is delivered-load attribution, **not independent
validation of the force law or total pair/support energy**.

A grasp is acquired after the event tick's physics. Start the .2-second loaded
window on the next World tick: Tite2.80–3.00, Under2.95–3.15. Do not charge an
impulse merely because the acquisition event exists. Both use the actual
99.33672903kg RB and preserve requests, support history and opponents.

| Native .2-second window | Tite | Under |
| --- | ---: | ---: |
| Runner speed before → after, yd/s | 6.913 →3.592 | 4.341 →3.384 |
| Feet/ground: change along initial travel, yd/s | +1.163 | +.610 |
| Support-coupled active grasp/reel | -1.894 | -.743 |
| Support-coupled passive grasp | -3.335 | -.554 |
| Body contact | 0 | -.275 |

The projected components sum to the change **along initial travel**, not the
nonlinear change in speed magnitude; the runner also turns. Per-component
carrier translational energy is preserved in the manifest. Negative work on
the carrier can be energy transferred to the defender, rotation or the support
system; it is not automatically pair dissipation or an accounting error.

Tite's sharp early speed reduction occurs without a body-collision impulse in
that window. This is a counterexample to treating every slow first contact as
a torso collision. Under retains a genuine collision contribution. Neither
case establishes that the braking is excessive: a supported leg tackle may
legitimately stop the runner. Do not weaken a grip to recover an NFL average.

## Cost and decision

The final collector costs5.391 seconds internally /6.209 with launcher;
typecheck15.542 seconds. All earlier measurements, including the censored pilot,
an initial TypeScript annotation error and incomplete audit instrumentation
that missed `supportImpulse`, remain indexed. The latter was a measurement
gap, repaired without changing physics or relaxing its accounting checks.
These are research-command costs, **not uninstrumented solver benchmarks**.
All unique recorded launcher durations sum to77.130 seconds, including the
pilot, failed instrumentation/annotation checks and typechecks; parallel calls
overlap, so that sum is not session wall time.

Reuse PR73's local transition cost14.07–14.47µs versus its10µs median target,
and563.758µs observed worst across controls. Complete World replacement cost
is still unmeasured; the <=2x paired World median feasibility target has not
been validated. No fresh runtime claim, full-suite run or production promotion.
The seven extraction assertions and nine historical patch failures stay separate.

**Recommendation: park passive-hands solver expansion.** Retain the reference
and the known correctness holds. Resume this method only for a named native
mechanism it can support, with a material demonstrated defect and a measured
budget—not merely to improve another local accuracy digit.

**Single next physics question:** in the saved Tite first-leg-grasp window,
is the dominant reel/restraint braking a legitimate response to the requests
and available support/grip, a force/work/shared-budget error, or consequential
native timestep error? Reuse the complete acquisition prefix and this Under
collision control. Inspect both bodies and support, then change one demonstrated
cause. This is a more direct route to a football benefit than broadening the
one-passive-hands solver. Keep Run's collection routing and minimal contact-law
adoption review independently owned; no capacity or recovery retune.

```sh
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/physics/solver-value-study.ts
```
