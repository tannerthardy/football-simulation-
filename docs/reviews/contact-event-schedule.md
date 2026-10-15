# Event schedule: consistent mechanics, faster application, remaining cost hold

The cost split is now measured. A reduced event state and one endpoint
reconstruction preserve the saved mechanical references and improve the difficult
field's paired median by **19%**. Applying an already selected history takes
**.43–.62 microseconds**. **Selection still exceeds the unchanged budget:** the
complete difficult field costs **14.07–14.47 µs**, against10 µs. Keep this as a
bounded numerical/interface candidate; do not adopt or expand the World solver.

Runtime `c3d90fb529c6b6d6cb9060dc6d0ab04f8afb4b8b`; final diagnostic/typecheck
`af2eeb9e867932d430aa7a2a7f3644d44432c916`; source
`5fe694911cda2806e5c4392e5f5d97aaf09abb593d8f98a106fa80fab88a7565`.
Base is PR71 `a33ddc4`, not a new baseline. [Exact manifest, all runs and costs](../../data/reviews/current/contact-event-schedule.json).

## Measurement and bounded change

Observation-neutral stage instrumentation of PR71 preserves the complete returned
result, including bodies and phases, exactly on all four fields. On the three-phase
motor transition, instrumented selection medians are **4.78–8.32 µs**,
motion/accounting **4.25–7.40 µs**, setup **1.06–1.93 µs**. Clocks and JIT
effects perturb those values; do not subtract them from independent medians or
claim their sum is uninstrumented runtime. Full return construction is outside
the final-energy stage. Copying alone is not the demonstrated answer.

[`selectMotorEvents`](../../src/physics/motor-event-schedule.ts) now carries
only slip, heading error and spin through events. It prepares fixed numeric
motor coefficients once and returns the actual phase history, signed impulse,
first temporal moments, work and absolute force/torque amounts. It owns its
initial snapshot, so later edits to the caller's field do not change application.

`applyMotorEvents` reconstructs full translation and yaw once from those
integrals. Constant leg-force work follows the same achieved displacement;
ground yaw work and passive hand work retain their phase integrals. No mean
impulse substitutes for a temporal moment. No force, work or velocity projection
was introduced. The same body application can be repeated as a pure calculation
without accumulating a second dose; actual World mutation/charging is not wired.
The schedule and its owned snapshot must be treated as immutable.

This removes repeated full-pose reconstruction, rather than only optimizing
copies. It does not alter the motor/contact law, capacities, event-count bound,
heading/deadline rejections, recovery, defaults or original tests. PR71's
corrected slow reference is unchanged. The saved overloaded NT still loses
sticking legitimately after reaching its requested spin.

## Accuracy and opposing evidence

Reuse the independent70-/100-digit Decimal reference and the same three saved
fields plus the explicit zero-hand control. Nothing was recollected or re-seeded.

| Maximum discrepancy across the four fields | Result |
| --- | ---: |
| Motion versus independent reference | 7.11e-15 |
| Integral/work/energy versus reference | 4.48e-14 |
| Combined kinetic-energy/work closure | 4.96e-14 |
| Three unequal partitions, motion and accounting | 8.53e-14 |

All remain within the existing **1e-11** accuracy gate. Every phase obeys the
supplied ground/tangent caps and the preserved **1e-14 passive-work** gate.
Mirrors, equivalent headings, interior heading-wrap rejection, zero/tiny loads,
zero time, controller deadline and input/snapshot ownership are checked.
**11 new focused checks and typecheck pass.** PR71's44 focused checks are
compatible inherited evidence, not a new run or a combined-suite certificate.
No full suite, new football inputs or games were run.

Supported scope remains one frozen two-body tangent field with fixed moment
arms, leg accelerations and capacities. Moving force-point/material attachments,
normal/tangent budget reallocation, multiple rows, support/recovery interaction
and actual World fatigue are not validated here. The old seven affected
assertions and nine historical patch-gate failures remain separately retained.

## Actual runtime, including the adverse runs

Uninstrumented emitted ES2022, Node22.23.3 / TypeScript5.9.3, same container,
no competing collectors. Per case/kernel:1,000 warmups, two interleaved passes
of101 individual calls. Complete calls include validation, owned snapshot,
selection, work/effort integration, motion reconstruction and result creation.
The unchanged gate is **median <=10 µs / p95 <=25 µs**, per complete field.

| Final paired comparison | Candidate median µs | PR71 median µs | Candidate p95 µs | Candidate max µs |
| --- | ---: | ---: | ---: | ---: |
| Motor transition | 14.071–14.472 | 17.456–17.847 | 16.725–16.885 | 249.795 |
| Prior slip event | 10.646–11.277 | 12.690–13.209 | 12.989–13.010 | 563.758 |
| Sliding control | 6.930–7.351 | 6.930–7.271 | 8.302–9.344 | 42.333 |
| Unloaded control | 9.864–10.255 | 11.216–11.438 | 10.776–12.158 | 149.234 |

The difficult field improves **18.9–19.4%**; the sliding control has a small
**0–1.1% median cost regression**, retained rather than hidden. Paired
`selectOnly` costs13.55–14.17 µs on the difficult field; applying an already
selected history costs.43–.62 µs. Separate medians need not add to the combined
median. The observed complete-candidate worst call is **563.758 µs**; no hard
maximum or individual tail cause is established.

The first unprepared schedule measured13.94–14.20 µs while PR71 measured
17.02–17.17. A later prepared run passed all local median/p95 gates, measuring
7.95–9.02 µs on the difficult field, **but the unchanged PR71 reference also
became faster**, to9.79–10.79. Do not attribute that whole difference to code.
The final same-process prepared/unprepared comparison isolates a **10.1–10.5%**
representation gain, with bit-identical compared physical outputs, and still
fails the complete median gate. All passing/adverse runs remain indexed.

One compiled selector profile (100,000 calls over all four fields) shows
preparation, event-loop processing and16% garbage-collector samples. It does
not prove one dominant removable arithmetic cost or explain the runtime tails.
Stop after the interface change and coefficient preparation; no more small
allocation edits or new mechanics in this pass. Indexed launcher commands cost
**21.222 s**, excluding independent Python generation and report/Git work.

## Concrete World boundary and next decision

There is **no World import or adapter**. The insertion point is after
[`jointRows` in `integrateSubstep`](../../src/physics/world.ts#L1159), replacing
the selected row's coupled ground-yaw/tangent path before its ordinary hand
solve. It cannot be appended afterward:

- `feet` has already moved yaw/velocity and reported ground work; those
  provisional contributions must be reconciled once.
- Ordinary hand solving, centered yaw/travel adjustments and the shared
  position update would otherwise apply the same history again. They need
  its actual moments, not half of net impulse times elapsed time.
- The row's current net-impulse arm counter cannot represent a reversal's
  absolute force amount. Keep force feedback and charged effort distinct.
- Recovery reserve must respect the attained phase/peak ground torque;
  net torque alone cannot prove unused traction. Metabolic cost remains at
  the existing once-per-tick call. Unsupported rows must fall back before
  mutating anything.

**Recommendation:** preserve the faster schedule as a reference/interface
candidate, retain PR71, and hold World adoption. The cost question is narrowed:
body application is cheap; event selection is still expensive in the declared
operator. The next step is a bounded design/measurement of the **incremental
World insertion budget** at this exact boundary, accounting for work it replaces
and the required recovery/effort interfaces. This can decide whether to pursue
a different event-selection method or explicitly reconsider the engineering
allocation. The10-µs gate has not passed reliably and is not silently changed;
do not infer readiness from the one favorable run.

Develop was fetched at `7d1451b2c31786e075550183a6a93bbda23da29b`; the research
pin, historical `4ded6b6`, all44 flags/components=1 and production defaults
remain unchanged. Run's controller/helper work stays independent.

```sh
python scripts/diag/physics/local-slip-motor-reference.py out/event-schedule/reference100.json 100
node scripts/baseline.mjs --candidate --receipt out/event-schedule/replay.receipt.json -- node --import tsx scripts/diag/physics/event-schedule-accuracy.ts
node scripts/baseline.mjs --candidate --receipt out/event-schedule/cost-replay.receipt.json -- node scripts/diag/physics/event-schedule-cost.mjs
```
