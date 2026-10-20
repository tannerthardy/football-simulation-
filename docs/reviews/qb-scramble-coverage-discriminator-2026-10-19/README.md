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

## One current coaching-control attempt: rejected

After publication of the A/B receipt, Root authorized at most one current
installed-coverage control. I selected **Cover2-Man**, before running it: tight
man beneath two vertical caps should deny the read without forcing the QB.
Bodies, seed0, Four Verticals and Over front stayed unchanged. No seed search
or rating/phase manipulation occurred.

The actual recording-versus-suppressed-recording pair ran, but the assertion
`stats.scramble === true` failed. **0 pass /1 fail /5 intentionally unrun**,
2.005516s launcher wall, two additional native snaps. The test stops before
its movement/observation/RNG equality assertions; do not claim they passed.
The [rejected fixture proposal](two-man-rejected-test.patch),
[failed receipt](two-man-bookkeeping-receipt.json),
[exact failure](two-man-bookkeeping-vitest.json) and
[disposition](control-disposition.json) remain published. The proposal is not
an adoption patch and was removed from the review worktree. No second current
coverage or seed was tried.

The smallest honest next decision is whether to install an **explicitly pinned
historical coaching fixture** for this bookkeeping integration control: retain
the original deep-coverage policy as test-only input, while running current QB
decisions, all22 bodies, shared physics and result bookkeeping. Label that
fixture as a preserved pre141 coverage-held situation; do not claim it tests
current coverage quality. Keep the native scramble/event/rusher and full
movement/observation/RNG equality requirements. Preserve current Cover3 seed0
as an opposing no-rusher native pass input. A future coverage improvement may
change current Cover3's outcome legitimately.

That requires an explicit Root fixture-scope decision: freezing an old policy
as test input has maintenance costs and must not silently replace production
coverage or mock a QB decision. I have **not implemented** an archived coverage
controller, forced scramble, disabled141 in the test, weakened an assertion,
or conducted a lucky-input search. Total investigation so far: four native
snap executions, zero games, one focused failing test selection, no suite.
