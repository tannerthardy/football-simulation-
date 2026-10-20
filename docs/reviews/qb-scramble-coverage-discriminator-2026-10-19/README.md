# Native scramble fixture: isolated coverage discriminator

Exact candidate: `2a1c034021768620c6a1a26ee7018972512220fd`.

One fixed input, the existing `test/qb-rusher-recording.test.ts` fixture(0),
was run once with the current source and once reversing only the six runtime
files in reviewed deep-coverage `12487de7`. Same bodies, seed0, Four Verticals,
Over/Cover3, 44 accepted settings, components1/GAIT_STEP0/CF_FLOW unset.
No QB decision, rating, installation or physics setting was forced.

- Current source `4273994f`: native Y throw2.10, incomplete, duration4.05.
- Without141 source `b63caa70`: native QB scramble3.05, slide, duration5.50.
- Total launcher wall: **1.422602s**; two standalone native snaps, zero games,
  no full suite or existing-test run.

At the first Y evaluation1.90, current completion estimate .70134/risk .00719/
value16.64616 versus without141 .40133/.09531/3.67178. At1.90 the current FS
is deeper (x55.896 versus54.565), moving upfield faster (vx4.049 versus.691),
while QB/Y positions are identical. This supports a changed throw opportunity
from the reviewed vertical-protection policy, not new bookkeeping influence.
The resulting incomplete does not establish overall football improvement.

The natural-scramble expectation is therefore stale for this particular current
Cover3 input. Preserve the positive native-scramble bookkeeping-invariance
contract: do not weaken its assertion, force the QB phase or reinstate old
coverage to recover an outcome. A separately reviewed explicit coverage control
may provide the positive witness; this A/B alone does not select that control.

[Exact arm receipt and hashes](ab-receipt.json), [current tape](current.json),
[reverse141 tape](without141.json), launcher receipts, passive [probe](probe.ts)
and exact [reversed source patch](141-source-only.patch) are preserved here.
The probe wraps each existing evaluate call once and returns its result unchanged;
it adds no sensing or random draw. It records limited early states, not a full
restorable midplay state or all individual consumed pictures.

No production or test changes in this review publication. Root owns any fixture
adjudication and final exact candidate verification. Experimental gait/contact
mechanics remain held separately.
