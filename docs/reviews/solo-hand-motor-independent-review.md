# Independent solo-hand snapshot adjudication

Reviewer: Integration subagent `movement_composition`, independent from the
motor implementation and test repair. **ACCEPT** the test-only qualification
at `bae5ebbe94b02b8a9ab03a4123339dec6c7c725b`, with complete evidence publication
`84e22f7147efae585829eba30204fa1fcf3ebd67`, conditional on including approved
#180. This decision applies only to the two historical physical snapshots.

I read the exact test diff and the accepted / isolated #180 / combined complete
six-tick traces. All 14 artifact hashes match their summary. Requests, contact
control and next execution RNG agree exactly with accepted source in both
fixtures. Independently recomputed Node/JSON policy digests match both new
assertions. Isolated #180 and combined trace JSON agree exactly in every field;
accepted reproduces both original full physical hashes. The first physical
difference is tick six: pass changes yaw/work, while run also changes body
motion/support, contact, arm and ground loads through the shared dynamics.

The repair pins the unchanged accepted commands/control/RNG separately and
retains a complete physical snapshot, qualified to the independently isolated
#180 motor. Old physical hashes, original failed logs, capture code, full traces
and exact source/settings receipts remain available. It changes no engine,
settings, tooling, fixture step, per-tick work closure, force/traction/support
budget assertion, tolerance, or unrelated control. This is attributable source
qualification after a diagnosed motor change; it is not a blind snapshot refresh.

[Detailed diagnostic and complete evidence](https://github.com/tannerthardy/football-simulation-/blob/84e22f7147efae585829eba30204fa1fcf3ebd67/docs/reviews/solo-hand-motor-contract.md) ·
[Independent readback receipt](../../data/reviews/current/solo-hand-motor-independent-review.json).

No new test, simulation, game or physics benchmark was run for this review.
If #180 is excluded, keep the original accepted-motor physical snapshots.
This decision does not waive motion/contact, mirror, helper, redirect or
football-result failures. Integration owns verification of the final exact tree.
