# Independent review: initial stretch-combination surface

**Support the narrow correction for Integration's explicitly tested #117 + #122
cohort. Do not promote it as a standalone correction or claim weak wide zone is
solved.** Integration retains ownership of exact combined verification and
adoption. This review inspected code, preserved tests and saved evidence; it
added no simulations, test runs, source edits or numerical tuning.

Reviewed code: `45106c1b3c0f30cc35bed722931207cbaf9d676d`, based on accepted
`d682b1f474cb6ba260a7b8b1119a62919c5a2159`.
Tested cohort engine source:
`0ac630a214a03fc9a96077e2c0d9e8dbab918b35d7f9356ff98cf30293907f0e`.
The comparison cohort containing #117 and #122 without this correction is
`048be756a6ecda65d10c8f77f6de15ac214d82191746e16657cd5a3d715aeab1`,
preserved in `out/run-pace-gather/contact-composed.json.gz`.
Exact cohort receipts and resolved settings are in
`out/zone-combo-surface/cohort-{strong,weak,ozstrong,ozweak}-receipt.json`.

## Demonstrated contract and correction

The old combination could request a half-man approach that its acquired-contact
reference subsequently classified as an unusable surface. Its reference defaulted
to the opposite of diagonal displacement. For the playside half's authored
offset `(-.35, +playside*.55)`, the projection on that reference is
`(.35-.55*k)/sqrt(1+k*k)`: negative for wide zone's `k=1.8` and outside zone's
`k=1.1`. An otherwise correctly approached half could therefore trigger recovery.
This is a concept-and-combination-half interaction, not a universal weak-side
defect. Hand load alone does not establish useful protection.

The reviewed correction gives active outside/wide-zone combinations a shared
installed normal and signed first-actor half-angle. The normal follows from
bisecting the declared neighboring half-man landmarks; it is not a universal
vertical contact rule. Both near-contact approaches use the same installation.
The bucket-step/zoneFlow phase remains unchanged. The original covered reach
owner's previous approach was slightly different, so this is a coherent shared
installation, not a claim that both old paths were already identical.

The bounded `RunBlocker.combinationFit` helper uses known formation slot order.
Either member can contact first; the selected angle belongs to that actor's
installed half. Passing the authored surface through the existing `sim.engage`
call preserves the constructor's early return for existing contact. Joining does
not rotate acquired hands, rewrite the frame, or grant new hand control. No new
read of a defender's private engagement state is introduced.

The code leaves helper recovery/support, assignments, release logic, spacing,
ratings, capacities and shared physics unchanged. Actual torque, work, support
and contact forces remain governed by the existing World. Preserved tests cover
both mirrors and arrival orders, true far-side recovery, useful loaded contact,
delayed landmark information, custom acquired surfaces, reacquisition, pass
compatibility, keeper transfer and RNG behavior.

## What the saved cohort establishes

The three existing Ace cohort cases match their previous initial-state hashes.
Weak wide zone now has LG carrying approximately **649 kg·yd/s²** at two seconds
while continuing playside keeper work, instead of the earlier inward recovery
followed by an unloaded departure. C can consequently become the climber.
This is coherent achieved combination work under the unchanged physical law.

The old C keeper also prevented DT_W contact with the runner. More LG load and
more DT playside displacement therefore do not, by themselves, establish
additional useful runner protection. DT_W is closer to the runner's lateral
line in the new case. Protection must still be assessed through arrival, not
credited from force or sideways distance alone.

| Existing Ace case | #117 + #122 | Plus initial surface correction |
| --- | ---: | ---: |
| Strong wide zone, completed gain | 6.68 yd | 7.23 yd |
| Weak wide zone, completed gain | 3.08 yd | 3.11 yd |
| Strong outside zone, completed gain | 7.99 yd | 7.11 yd |

These endings are consequences, not acceptance targets. Recorded work residuals
and arm/support budget excesses remain within floating-point error. No saved
cohort observation demonstrates a new contact-law violation.

## Adverse and unresolved evidence

- **Weak second-level access remains incomplete.** Mike's first wrap moves
  from **3.10 to 3.00 seconds**, despite nearly identical final gain. The changed
  keeper allocation does not produce timely C/Mike protection. Do not hide the
  earlier defender access behind the final-yardage comparison.
- **Strong first-level depth is sacrificed.** RG is **2.13 yards less upfield**
  at two seconds while gaining lateral position. DT_S remains loaded and has
  no runner contact in this saved continuation, but that geometric tradeoff
  remains relevant to future fronts. It is not automatically better blocking.
- **Strong outside zone has a shorter ending**, 7.99 to 7.11 yards. Retain its
  changed geometry and continuation rather than requiring the previous gain.
- **Fresh outside zone does not establish a general collection rescue.**
  Frame-only LG/Mike contact does not transfer as the same job in the cohort:
  C climbs, LG keeps, and Mike wraps at 2.95 seconds. The frame-only edge grasp
  also cannot be attributed entirely to changed execution draws; the old
  variate still yields grasp under the new geometry/threshold.
- **The standalone intervention is not the recommended integration boundary.**
  It exposes the existing near-Y braking problem. Installing `surfaceAxis`
  also activates the existing stretch movement branch, including the diagonal
  feed-forward issue corrected by #117. A surface-policy result must not be
  described as an isolated change to helper recovery. #122's independently
  reviewed pace correction is part of the supported cohort.

## Recommendation

Submit this narrow code/test extraction for Integration's combined verification
with the exact reviewed #117 and #122 candidates and settings. The evidence
supports repairing the incompatible approach/contact installation while retaining
legitimate defensive wins and visible depth costs. It does not support a claim
that weak wide zone, keeper selection or second-level collection is solved.
Keep that unfinished protection work as the next specific question rather than
adding strength, an earlier-release rule or another exit variant.

This independent pass incurred **zero new simulation or test runtime**. It reused
the author's focused receipts and saved continuations; Integration owns the
remaining combined check.
