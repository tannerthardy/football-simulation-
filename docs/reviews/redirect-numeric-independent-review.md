# Independent redirect numerical-contract review

**ACCEPT** the narrow geometric-contract patch reviewed at
`/tmp/redirect-geometric-contract.patch` (SHA256 below), conditional on its two
affected checks and Integration's exact combined verification. No production
motor, force, assignment or controller source changes are approved here.

Reviewed the complete patch, `redirect`'s existing detached request capture,
and preserved evidence at `2ce93896` / `cf67e430`, accepted source
`2c98bed94adad8087c65f381d4090444ad283985`, combined source
`075e2148a8c94c80ba90743a324e4670091998c0`. Independently read both compressed
four-arm trace archives and verified all12 manifest member SHA256s. Zero new
engine executions or tests for this review.

The candidate's patch-hands mirrors keep35 exact DE_S targets and exact
timestamps. Maximum request mismatch is7.118794442817489e-10yd/s; maximum
achieved RT/DE/QB positional mismatch is7.5168316016061e-11yd. Closest-QB
separation differs3.3233416019129436e-11yd. The center-hands opposing control
has16 exact matched requests and maximum positional mismatch1.0658e-14yd.
The accepted patch trace has the same initial floating perturbation but a
different symmetric approach. This evidence does not isolate #180 or establish
which component amplifies roundoff. The diagnostic's spin summary reads an
`omega` property rather than `Body.spin`; it is not used as evidence of spin
symmetry or zero angular drift in this acceptance.

The proposed fixture contract states an absolute achieved-position accuracy
budget of1e-9yd and derives request velocity accuracy as that displacement
per ordinary DT=.05s (2e-8yd/s). This is an explicit physical accuracy choice,
not a claim of exact arithmetic or a mathematical global error bound. It is
appropriate for this six-second reacting witness after the saved first-divergence
diagnosis. It relaxes the old request-only subnanoyard/s threshold while adding
actual three-body path checks, retaining exact target/timing/count and the
original stricter closest, home and facing checks. The original failure is
preserved. A material .003yd mirror error would still fail by orders of magnitude.

Capturing copied RT/DE/QB positions beside an already-copied request neither
calls sensing nor changes state/RNG. The capture order should be documented
and the test should explicitly require three positions (a compatible strengthening).
No tolerance change outside this named fixture is justified. Existing genuine
motion-contact asymmetry, helper failures and gameplay risks retain their own
dispositions; this acceptance cannot waive them.

Reviewed patch SHA256: `a7027ba62ff8225b817113c9c09e6fc0ed72197a155b2e0efcf86bf7af45336c`.
