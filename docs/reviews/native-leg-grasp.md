# Native leg-grasp braking: bounded audit

**Preserve this tackle. No excessive-restraint or double-counting defect is
demonstrated in the selected window, so there is no runtime correction.** The
runner's slowdown comes from delivered active pulling and passive grip impulses;
the tackler receives their reaction. Weak/slipping controls lose that restraint.
This establishes consistency with the existing reduced model, not human grip
calibration or a cleared global contact law. Solver expansion remains parked.

## Exact scope and reproduction

Collected revision `2bf21884f2e129f22c3534d38bec08209ac420b2`, unchanged engine
source `5fe694911cda2806e5c4392e5f5d97aaf09abb593d8f98a106fa80fab88a7565`,
from [PR79](https://github.com/tannerthardy/football-simulation-/pull/79)
`4254655`. Reducer/typecheck revision `90f8eee`. Historical comparison baseline
`4ded6b6` stays unchanged. This is the pinned experimental host, not a combined
current-develop validation. The fetched develop tip was `90edc52`; no controller
or physics work from it was imported here.

Reuse the complete acquired histories from the
[previous study](solver-value-study.md): O31/D32, strength .55, seed3,
gun_wing_12 Split Zone, Cover3, Tite/base34 and Under/base43. Explicit World
overrides are `handContact:'patch', groundMovement:'legacy'`; the launcher
resolves all44 baseline flags, components=1 and RUN_READ=0. Capacities, recovery,
requests, defaults and expectations remain unchanged. Diagnostic controls only
scale the selected acquired joint's capacity after normal native updating;
player attributes are untouched. Controllers continue normally afterward.

[Input manifest](../../config/native-leg-grasp.json) and
[compact results, hashes, flags and receipts](../../data/reviews/current/native-leg-grasp.json)
pin both complete pre-intervention fingerprints. No checkpoint is injected.
Raw traces remain under ignored `out/native-leg-grasp/`.

```sh
node scripts/baseline.mjs --candidate --receipt out/native-leg-grasp/audit-ground.receipt.json -- node --import tsx scripts/diag/physics/native-leg-grasp.ts
node --import tsx scripts/diag/physics/native-leg-grasp-summary.ts
```

Use Node22.23.3. The reducer simulates zero additional plays. It includes earlier
cost receipts when available; a clean rerun records its new receipt. This
session's complete cost history remains in the committed evidence.

## Where the first .2 seconds of braking went

Acquisition occurs after that tick's physics. The first loaded windows are
Tite2.80–3.00 and Under2.95–3.15, following events at2.75/2.90. This distinction
avoids crediting force just because a grasp exists.

| Delivered source: velocity change along initial runner travel, yd/s | Tite | Successful Under control |
| --- | ---: | ---: |
| Active support-coupled grasp/reel | -1.894 | -.743 |
| Passive support-coupled grasp | -3.335 | -.554 |
| Ground | +1.163 | +.610 |
| Body contact | 0 | -.275 |
| Runner speed before → after, yd/s | 6.913 →3.592 | 4.341 →3.384 |

The source rows add as projections, not speed magnitudes: the runner also turns.
Tite's99.337kg runner receives combined grasp impulse
`(-236.299,+505.278) kg yd/s`. Its139.706kg DT receives the exact opposite;
his speed rises2.296→3.951yd/s, velocity changes
`(-1.591,-1.656)→(+.604,-3.905)`, and spin changes-2.301→+6.645rad/s.
He is not an immovable anchor. Ground impulse `(+70.408,+191.153) kg yd/s`
partly opposes his motion; neither athlete falls during the first .2 seconds.
The Under control also includes other contacts, retained separately rather
than treating every runner impulse as this one defender's reaction.

The observer independently reconstructs each athlete's COM and spin impulses
from actual delivered solver arguments, including returned fractions, then
checks them against momentum changes. Work uses pre-impulse velocity/spin and
the quadratic kinetic-energy term. Across all eight executions and .4-second
audit windows, residuals stay below the declared1e-8 checks; no tolerance is
relaxed. Tite and Under work residuals are at most1.71e-12/3.00e-12 in
`kg yd²/s²`. These are model units, not joules; runner energy loss alone is
not pair dissipation. In Tite, the tackler gains658.760/1101.529 work units
from active/passive grasp while the runner loses748.930/1525.615.

## What sustains the hold, and whether it is counted twice

Native Tite grip capacity rises3381.59→3817.34kg yd/s² across the four ticks.
This is a structural grip claim, distinct from active muscular effort; native
allocation still caps a holder's shared claims at3.36 times arm force and
reduces an off-feet holder's allocation. The audit neither enlarges nor validates
that empirical capacity assumption.

For every selected physical row, the independent delivered impulse agrees with
`normal*(passiveNormal-reel) + tangent*tangentImpulse`. Its magnitude stays
within the **one shared row limit**: active reel does not receive another full
passive normal/tangent allowance. Tite reaches the cap; Under uses at most58.75%.
Arm impulse, arm work and support motor work remain within their existing limits.

Support work independently telescopes the aggregate impulse potential
`-P·desired - mobility*|P|²/h`. It agrees with the reported increment once per
physical interval; maximum native residual3.56e-15. This checks local accounting
without assuming every intermediate numerical correction is another physical
expenditure. Actual ground translation/yaw impulses are observed separately and
reconcile with the whole tick exactly.

Both athletes' stance translation and yaw share the available traction budget;
all first-window samples stay within it, up to floating-point roundoff. The
corrective command also stays inside the residual **structural** strength/traction
budget. An important model distinction remains: that corrective reserve uses
the full structural ceiling, not the availability-scaled stance ceiling. Combined
stance/correction demand reaches1.00024 times the latter in Tite and1.35589 in
Under, while staying within the structural ceiling. This is existing recovery
behavior, not proof of physical support or a newly demonstrated accounting bug.
Do not describe this audit as validating an anatomical plant or all loaded
ground-force assumptions.

## Weak/slipping grips and stepping

The held coordinate is averaged corrective support, not an anatomical swing leg.
It obeys `achieved = desired + mobility*force`; it is not rigidly immobilized.
External passive load may drag that coordinate even when active corrective
reserve is zero. The force/velocity mobility remains finite.

| Tite selected hold | Runner speed after .2s, yd/s | Peak absolute correction-velocity deficit, yd/s | Peak corrective offset, yd |
| --- | ---: | ---: | ---: |
| Native | 3.592 | 1.3760 | .21539 |
| 5% capacity | 7.070 | .30684 | .03387 |
| .1% capacity | 7.249 | .00589 | .00067 |
| Zero capacity | 7.255 | 0 | 0 |
| Removed hold | 7.255 | 0 | 0 |

Both weak holds slip on the first loaded tick and break during tick3.00–3.05.
Their leg-coupling fraction grows while slipping, but applied restraint still
shrinks with delivered force. Zero capacity and removal produce **exactly equal
selected body/support histories through .4 seconds**; merely retaining a weak
or powerless joint does not freeze stepping here. Other bodies may differ in
the tiny/zero cases, so this is not full-World convergence of those interventions.

Under provides a genuine restraining control: its strong leg coupling .827
can temporarily report100% loss of a requested corrective component, with
peak absolute deficit2.607yd/s. That is a ratio of corrective velocities, not
proof that the runner's leg or gait has stopped. Its successful native tackle
still ends at3.65s with1.57 credited yards. Tite still ends4.35s/4.04yd.
Complete saved native fingerprints match exactly, including all agents and RNG.

## Numerical uncertainty and decision

Refining only the loaded .2-second window12→48→192 subdivisions retains the
large slowdown: final speed3.592→3.563→3.552yd/s. The last two estimates differ
.001787yd in runner position, .022982yd/s in velocity and .002629rad in facing.
Support geometry is more sensitive: final capture-point xi differs.03394yd
between48/192, and the48-step path briefly slips where the192 path does not.
This is self-refinement, **not an independent converged force-law reference**.
It supports attribution of the large braking to the hold, not a general
accuracy or support-history acceptance claim. Do not tune recovery to erase it.

Six weak/refined continuations are deliberately censored live at3.20s; their
eventual gains or tackle endings are unknown. There is no claimed football
improvement or regression from a runtime candidate because none was changed.

Final instrumented collection:2.027s internally,2.539s including launcher.
Four incremental audit collections cost10.467s total. Final typecheck passes
in14.656s; all four typechecks cost51.597s, including one initial missing-type
failure that was corrected. No full suite, new input panel or games. These
are audit costs, not an uninstrumented production solver benchmark.

**Recommendation:** close this witness without weakening its earned restraint
under the current model. The next useful physics input is a portable Run/Flex
case where an independently feasible request fails because of physical response;
prioritize that over more solver expansion or adjusting grip from YAC alone.
Grip-capacity and corrective-support calibration remain open physical assumptions.
Controller progress can proceed independently.

[PR77's moving-geometry/World-replacement HOLD](world-contact-events.md) remains;
no adapter or universal World accounting/fallback/native-cost acceptance is
claimed. Keep the seven extraction assertions, nine historical patch failures,
older dry-cap budget failure and independent references separate and visible.
This audit's local spin ledger does not clear those global mechanical defects.
