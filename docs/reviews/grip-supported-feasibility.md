# Moving support and shared grip capacity: bounded feasibility

The next question was whether the existing grip law can integrate a moving
support attachment and simultaneous normal/tangent loads without repeatedly
advancing World. The experiment remains diagnostic: no runtime insertion,
capacity, recovery, fatigue or default changes. Comparison baseline remains
`4ded6b6`; corrected slow reference `8e36cce` and PR #7 are preserved.

## Mechanism and candidate

Nonzero support mobility changes a dry stop into a viscous tail. For a full
lower grip with linear support response, achieved foot velocity is `u=mu*F`
when its prescribed request is zero. The force therefore moves the material
attachment immediately, producing a held-body torque arm as well as the
holder's arm. Using only total impulse or only the holder's yaw misses this.

[The local kernel](../../scripts/diag/physics/grip-force-supported.ts) evaluates
the moving material point, body-relative velocity and both torque arms in
one small ODE. It carries vector and angular impulses, their remaining-time
moments, material/world-foot transport, body work and motor work together.
Motion recovered from these moments is independently checked against the
integrated states. Normal damping retains the existing 6 Hz, .8 damping law
and translational reduced mass. Tangent force consumes the capacity left by
normal; there is one vector cap. Motor work uses physical mobility, while the
normal damper also dissipates passive work. No force coefficient is fitted.

For a fixed slip phase and monotone point distance, the existing hold ratchet
has an exact algebraic form: slipping uses `max(initialHold,distance)`;
nonslipping tightening uses `min(initialHold,max(distance,touch))`. This avoids
integrating an artificial stiff hold equation. Phase changes, direction
reversals and opening tensile extension are refused. The candidate also
refuses nonzero support requests, zero mobility (which has the existing dry
reference), over-reach holds and excessive angular travel. Its force-only
refinement is bounded at 1024 pieces; exhaustion returns no physical state.
There is no World fallback/insertion or multi-contact graph implementation.

## Independent evidence and retained failures

[The fixture](../../config/grip-supported-reference.json) declares four
transformed mechanical inputs from the saved acquired 45-degree/8 seed-3001
packet and its mirror. Each uses full lower share, linear unbounded material
geometry, passive arms and prescribed mobility `stepSpeed/pushForce`, with
zero requested support velocity and free ground plans. One pair preserves
the acquired velocities. The mixed pair applies normal opening speed 3 and
tangent speed 16 to exercise the common cap. These are controlled mechanical
inputs, not additional native football outcomes or altered player capacity.

The independent collector advances unchanged World primitives with that
prescribed boundary. The initial 4096/8192 comparison failed its declared
reference allowance: attachment drift was still too large. Its inputs,
collector bytes, failed receipt and traces remain in `out/grip-supported`.
Only this named reference uncertainty was refined. The 65536/131072 comparison
passes the original allowance: worst attachment/foot difference 2.22e-8 yd,
spin 4.28e-6 rad/s and work .0000432. Ground force/contact work are zero,
support stays up and both mixed components use the same finite capacity.

The first candidate tests passed pose agreement but exposed a 2.45e-6 energy
residual in both tangent mirrors. The candidate now requires actual body
energy/work residual <=1e-8 in addition to coarse/fine motion and work
agreement. This was corrected by force-only refinement, without relaxing
the test or changing the law. Eleven focused contracts cover the converged
mirrors, independent analytic viscous and normal-damper channels, shared cap,
both torque moments, unequal intervals, common translation, resting stretched
holds, zero/tiny load and refused branches. The six existing dry contracts
remain successful, including their actual frontal opposing control.

The old `frozenInterval` diagnostic treated every unbounded attachment as
zero mobility. It now queries the actual Jacobian for both attachment types.
The historical selected acquired checkpoint is bounded, so this reporting
repair does not alter its earlier frozen-row finding or stored evidence.

At code/harness `0afa982`, 17 focused checks and typecheck pass. The cost and
accuracy collection ran at `cc06e8a`; the intervening commit only adds static
fixture typing to the test. Exact kernel/collector/World/input hashes match,
so the benchmark is reused. The failed first typecheck remains in the receipt.
Final test bodies took 122 ms (2.24 s command); typecheck 12.90 s. Four-case
reference refinement took about 15.4 s; serial benchmark command 5.48 s.

Largest candidate differences against the refined World reference:

| Quantity | Difference |
| --- | ---: |
| Body position / velocity | 2.15e-10 yd / 7.27e-8 yd/s |
| Facing / spin | 1.26e-8 rad / 4.28e-6 rad/s |
| Material attachment point | 2.22e-8 yd |
| Vector impulse / temporal moment | 7.39e-6 / 2.17e-8 |
| Angular impulse / temporal moment | 8.53e-6 / 2.51e-8 |
| Body / motor / passive work | .0000103 / .0000432 / .0000330 |
| Represented-energy / angular-momentum residual | 9.29e-9 / 3.64e-11 |

The energy residual is close to the unchanged 1e-8 acceptance bound. It is
reported rather than replaced by energy-derived work or a larger tolerance.

## Decision boundary

Accuracy, cost, exact tested revision, settings and input hashes are recorded
in [the focused receipt](../../data/reviews/current/grip-supported-feasibility.json).
Benchmark clocks exclude construction/restore and observers; all World
scratch/live intervals receive the same prescribed motor boundary. The
midpoint comparator is the unchanged primitive on this branch, not a new
whole-baseline validation. Median, p95 and observed maximum describe seven
same-machine repetitions of each isolated interval, not game runtime.

| 4.167 ms mechanical interval | Midpoint median / p95 / max | Corrected slow median / p95 / max | Kernel median / p95 / max |
| --- | ---: | ---: | ---: |
| Mobile tangent | .413 / 1.098 / 1.098 ms | 381.75 / 402.25 / 402.25 ms | 1.612 / 2.512 / 2.512 ms |
| Mixed normal/tangent | .097 / .828 / .828 ms | 200.28 / 212.98 / 212.98 ms | .196 / .364 / .364 ms |

Both midpoint results fail the declared accuracy while closing their physical
ledgers. The corrected slow solver passes with 8192/4096 accepted pieces and
zero limit hits. The kernel accepts 64/8 pieces and 504/56 derivative
evaluations: roughly 237/1020 times cheaper than that scoped slow comparison.
Seven samples make p95 equal the observed maximum; neither is a universal
worst-case guarantee. The unsupported slip-phase case costs 3.108 ms median,
8.387 ms maximum, returning no accepted result. This search/fallback overhead
must be included in a future integration decision.

A provisional feasibility budget is accepted-interval median <=2 ms,
p95 <=5 ms, and observed refusal maximum <=10 ms on these inputs/machine.
This experiment meets that screen. The prior full-tick 5/10/50 ms proposal
remains unproved, as does aggregate cost with many contacts.

This supports continued feasibility work. Actual bounded/anisotropic
attachments, partial/changing leg share, hold-phase changes, active reeling,
multiple holders sharing one foot, body/ground composition and exactly-once
effort at World insertion remain unproved. The earlier .24-yard native
support-history divergence and nine uninvoked patch-gate failures remain
separate. No new games/full suite were needed; the historical 1,687-test pass
describes its own pinned production-default revision.

The single next step is the actual bounded attachment and partial leg share
on the same acquired witness, with the existing reference and opposing
control, before considering World insertion or a native-football claim.
