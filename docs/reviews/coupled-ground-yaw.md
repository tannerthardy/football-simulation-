# Coupled ground yaw and passive hands: affordable motion improvement, work blocker

**Bounded experimental candidate; do not adopt as the complete correction.**
The simultaneous force selection reduces the saved C/NT packet's yaw
sensitivity at practical local cost. It also **worsens hand-work convergence**.
A balanced ledger does not close that adverse result. Keep the candidate
separate from PR66's contact-law extraction and production defaults.

Runtime `2bc8cc8fd0a19d2e1a58922b254faaf9bc10e918`, final diagnostic
`6e2a005c13a9a289561ad6ac3692697c87741ba9`, source
`91ae4d680e6d29c3ea5b5bedf90e0cb1d3d01a49ccc61dc7eb4dfb594d5b0dc9`.
[Exact settings, inputs, results and costs](../../data/reviews/current/coupled-ground-yaw.json).
Base is PR66 `29b0090`, not a newly designated baseline. Historical `4ded6b6`
and all44 flags/components=1 are unchanged. This does not reopen the closed
[delivered impulse/temporal-moment investigation](current-contact-yaw.md).

## Small correction tested

First reject a symmetric half-ground-yaw / hand / half-ground-yaw ordering.
On native12 it increases spin discrepancy .12563→.24471 rad/s and facing
.004424→.006488 rad against the same12288 refinement. Motion also worsens.
Changing order alone does not solve the coupled selection.

The retained prototype solves one bounded scalar equation at the existing
force frame. With tangent impulse `H`, each ground motor selects
`G = clamp(I*(targetSpin-spinBefore) + arm*H, -existingLimit, existingLimit)`.
The existing heading/remaining-tick target, torque capacity, translational
mobility and hand limit determine the solution. At most four motor-cap
breakpoints make this a small piecewise-linear root, not repeated World steps.
The existing hand solve then delivers and charges its attained impulse once.
Centered travel, yaw and work entries follow the changed ground impulse.
The existing recovery allocator receives the actual remaining ground reserve;
its law, gains and capacities do not change.

Select explicitly in **World only**:

```ts
new World(bodies, {
  handContact: 'patch', groundMovement: 'legacy', groundYawCoupling: 'hands'
});
```

Default is `groundYawCoupling:'split'`; no environment flag or PlaySim/Game
plumbing was added. The supported prototype interval has exactly one passive
non-material hands row, no active normal constraint, no torso contacts/strikes,
legacy ground/support, and no acquired foot. Normal loads, multiple rows,
material points, grasps, active drive, other ground/support modes and inactive
controls retain the original path. This is deliberately narrower than a
production football contact solver.

## Evidence for the method

Use the exact saved .35–.40 s C/NT packet and acquired requests. At12/48, independent
force-tape reconstruction closes translation, rotation and temporal moments
below4e-14; combined represented work residual is below1e-13. Ground torque
excess is at rounding scale (1.3e-15), and the jointly requested motor equation
matches attained hand load within1.5e-15. Arm impulse/work limits hold.
Observed complete bodies **and reports** equal the unobserved replay.

| Direct12→48 subdivision discrepancy | Split | Coupled |
| --- | ---: | ---: |
| Position yd | .000116095 | .000036079 |
| Velocity yd/s | .00472736 | .000854018 |
| Facing rad | .00337167 | .000522654 |
| Spin rad/s | .126699 | .0101529 |

Against retained196608 angular refinement, native12 facing discrepancy falls
.00442373→.000559335 (**7.91×**) and spin .125198→.0108625 (**11.53×**).
Against a fresh12288 full-motion reference, position falls .000169457→.000040795
yd and velocity .00650278→.000988862 yd/s. These are self-consistency results,
not an independent physical-force oracle. The original finest reference still
has a last-grid spin tail .000290928 rad/s; candidate3072 differs from it by
.000125480 rad/s and .000000773 rad facing. Do not claim zero error or
whole-play convergence.

**102 distinct focused checks pass**, including the18 new cases, original
run/pass history contracts, contact/angular/ownership checks and mirrored
response. Native center and split-patch endpoints remain exact. Zero-hand/free
controls preserve full body/report identity. Unsupported normal/material/
multiple/torso/strike/falling/response/virtual-foot cases retain exact split
execution. A supported step followed by active normal loading also returns to
the original path without stale yaw. Typecheck passes. No new full suite/games.

## Adverse evidence and the precise blocker

The same comparison gets worse for reported passive hand work (kg·yd²/s²):

| Subdivisions | Split | Coupled |
| --- | ---: | ---: |
| 12 | -3.077055 | -3.235264 |
| 48 | -2.165681 | -2.123456 |
| 12288 | -1.722663 | -1.721415 |

Relative to the split fine reference, native hand-work discrepancy increases
about**12%**. Direct12→48 hand-work change increases .911374→1.111807,
about**22%**. Total kinetic energy is closer and every combined ledger closes;
those facts do not erase the work-allocation sensitivity.

The cause can be exposed without a new solver or changed law. In a frozen
row, selected impulses treated as concurrent constant forces do hand work
`H*(slipBefore+slipAfter)/2`. The existing ordered ground-then-hand accounting
differs by the independently evaluated cross term
`sum((groundLinearImpulse dot handLinearImpulse)/mass
+ groundYawImpulse*handYawImpulse/inertia)/2`.

At native12 that ordered-minus-concurrent term is **-1.439028 split** and
**-1.627974 coupled**. The identity closes below4.5e-16 per interval.
The new force coupling increases this contribution while leaving the ordered
work evaluation and its budget gates in place. This explains why improved
motion and a balanced ledger can coexist with worse hand-work convergence.
It is not evidence of a new recovery-law defect.

The concurrent calculation is conditional on the frozen force tape, not a
reference for the unknown continuous moving geometry. Both methods also have
positive-work subintervals in that calculation near slip changes (4 split,
3 coupled at12). Counts alone do not establish improvement. **Do not merely
relabel work afterward:** passive work gating and the sign change in the
within-interval slip must agree with whichever force history is actually used.
No work law was changed and no clipping/budget gate was bypassed here.

## Cost, coordination and recommendation

Two final uncontended, uninstrumented passes on the same container/Node22.23.3;
20 warmups,31 interleaved samples per mode per pass. Includes input cloning
and World construction:

| Mode | Median ms | Observed p95 ms | Observed maximum ms |
| --- | ---: | ---: | ---: |
| Split12 | .135–.155 | .265–.457 | .466 |
| Coupled12 | .195–.226 | .524–.550 | .552 |
| Split48 | .448–.450 | .664–1.885 | 1.970 |

Coupled median cost is **1.44–1.46×** split12, meeting the declared≤2× local
feasibility target. Earlier uncontended startup passes had candidate maximum
1.630 ms; a separately marked run overlapping a rejected CLI invocation had
maximum1.727 ms. All passes are retained in the receipt. These small-sample
tails and two-body costs are not a football runtime guarantee. There are no
extra World advances or uniform subdivision increases.

Run's [completed adjudication at4f90b64](https://github.com/tannerthardy/football-simulation-/blob/4f90b6428b98224774bbd63a4adad6bb3e354b53/docs/reviews/helper-contact-adjudication.md)
finds two feasible collection-route errors and invalid guaranteed outcomes in
the other helper expectations. Those controller/contract decisions remain
independent; this candidate changes neither their tests nor Run policy.
Develop advanced to `8c891f4cf887b54297efbbc4c7993ba5e2f318b5` during this pass;
its physics tree equals approved `a1b16e6`. The deliberate saved-input research
pin remains valid. This is not a combined verification on newer controllers.

**Recommendation:** preserve this as a default-off feasibility candidate, but
do not integrate/promote it as an accepted numerical correction. Force-only
coupling is affordable and improves motion, yet leaves a demonstrated work
tradeoff. Stop after these two methods rather than tune recovery, loosen checks
or import the old solver stack. Original PR66 failures and historical patch
failures are not relabeled fixed; production defaults remain unchanged.

**Single next physics step:** use the first saved slip-change interval to
resolve its local force history and work gate together under the same laws.
A sign/zero-slip event is the specific issue to test, using this scalar solve
inside the interval if useful. Require work convergence as well as motion
before expanding scope or spending on football transfer.

```sh
node scripts/baseline.mjs --candidate --receipt out/coupled-yaw/replay.receipt.json -- node --import tsx scripts/diag/physics/coupled-ground-yaw.ts
```

The final collector is .720 s internally /1.073 s with launcher. The indexed
launcher cost totals68.619 s, including rejected trials, failed development checks and corrected checks;
no failed command or adverse benchmark is silently discarded.
