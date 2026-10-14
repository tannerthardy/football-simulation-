# Reviewed run/catch controller integration

Owner: the Codex integration session named in [INTEGRATION.md](../INTEGRATION.md).
[Controller review and preparation conditions](https://github.com/tannerthardy/football-simulation-/pull/8#issuecomment-6159236995),
[owner acknowledgment](https://github.com/tannerthardy/football-simulation-/pull/8#issuecomment-6159281489).
Preparation/verification only: no merge, reference adoption or new baseline.

## Exact scope

Approved base: `c98c2fa0e8de760c980ad3852e0ec85abcfadc8f` (#8).
Later #8 navigation at `545d9b8` is not silently included; it has the same
runtime and retains its separate publication. Historical comparison remains
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`.
Candidate branch: `codex/controller-integration-review`.

Catch-only extraction: `b3a55ac2a877a8610efda4f2560e0513c54932a0`.
Reviewed contribution: `0d50f2611a56f740df246b9b24941bfc541d1b57`, tested
production `c0002355a6dbee610ba96e4dbf6bc9e205de13a2`.
Only `src/sim/catch-approach.ts`, the defense import/return, and the added
catch-phase contract are extracted. Production source exactly matches reviewed
runtime `cab57308d6166cbbbef8effbc1c89f592b6a1edb2b6586968ac5ef4490cbc108`.
No added observation/RNG, ratings, common pursuit/spacing or shared-law change.

Run-only reuse: #10 tested `41bfb2c152e7ebdcda4cf1cd11eacefc2c186f6c`,
published `84490bd32b4bca48d4a4f36213a513794ad4a623`.
Its [unaltered receipt](../../data/reviews/current/contact-components-combined-verification.json)
has SHA256 `fd5fb89b20a987e3b0490440a3ba41495473ed6e80819a086346396269cc2b54`.
Source, harness, resolved flags, World defaults, Node/platform/architecture and
clean publication match the tested run-only receipt. All four phases passed;
its full suite is reused, not repeated. It is independent evidence, not a pass
for the newly combined source.

The combination adds only #10's exact contact helper/engagement/test, one flag
registration and necessary readonly historical-worksheet pin adaptation.
Production touched files are **contact-motion.ts, engagement.ts,
catch-approach.ts and behaviors/defense.ts**. Physics, players, tackle,
run-fits, common pursuit/spacing, dependency lock and other source stay exact
to the approved base. All original 43 values remain; the sole addition is
`RUN_CONTACT_COMPONENTS=1` (44 flags), with no catch flag or handover flag.
Original center hands/centered integration/legacy support defaults remain.
The worksheet keeps 43-flag historical evidence separate; no screen baseline
is regenerated or relabeled.

## Bounded evidence and costs

Catch-only passed [59 focused contracts](../../data/reviews/current/controller-catch-focused.json)
and [15/15 frozen complete final-state references](../../data/reviews/current/controller-catch-parity.json),
with [launcher provenance](../../data/reviews/current/controller-catch-parity-launcher.json).
No timeout, failed/skipped case or input drift. Only the portable parity
collector and three immutable input/signature packets were copied; no
prototype/hip/shading/helper/spacing study implementation was imported.

The [original compact catch receipt](../../data/reviews/current/moving-catch-improvement.json)
is retained byte-for-byte. Exact production/43 flags/World/Node/lock/input
compatibility supports reuse of its baseline, transfer and four retained-draw
observed/plain pairs. The catch diagnostic harness differs from the source
branch because unrelated studies were excluded; it is not a claim of identical
global validation hashes. Saved measurements stay on their original pins.
Retained-draw collectors need not be imported or rerun just to reuse receipts.

Combined focused checks use the existing contact, zone-reach, launcher,
worksheet and catch-phase contracts. A three-play spot check reuses P58, P4
and interception P16 to ask whether the run request correction unexpectedly
changes reviewed pass/catch/ball-contest histories. No new roster/game campaign
or automatic transfer staircase is needed.

After freezing the exact combined tree, the owner runs the preserved verifier
**once**, with the existing suite game assertions retained:

```sh
node scripts/baseline.mjs --verify --candidate --flag RUN_CONTACT_COMPONENTS=1 --fail-fast --receipt out/controller-integration/combined-verification.json
```

## Adverse evidence and interpretation

| Existing evidence | Review interpretation retained |
| --- | --- |
| P58 and fresh H10831/C1 | Improved achieved entry and hold survival; fresh case uses identical natural execution. |
| P4: original natural tackle becomes TD | Material adverse stochastic ending remains. Retained strong execution tackles; weak execution escapes. No claim of universal improvement or favorable-draw selection. |
| P95 +.22 yd; changed P16 interceptor/return | Adverse gain and legitimate ball-contest/return change, not an offensive-YAC target. |
| H11842/C4 OOB → inbounds tackle, +.82 yd | Gain/clock tradeoff remains adverse for review. |
| H11842/C1 failed whole-world equality assumption | Original failed expectation retained; football events/ball/receiver are unchanged and actual-source observer parity explains changed eligible-defender paths. |
| P173: unchanged 76.25-YAC TD | Remaining coverage/containment failure; zero changed requests, no gate widening to force it into scope. |
| #10's lower-gain WZ and historical law/convergence defects | Preserved limitations, not erased by functional success. |

Excluded: #3/#4/#5/#7/#11 ancestry, experimental hands/grip solvers, handover,
helper rules, hip/shading variants, spacing bypasses, roster corrections and
new recovery laws. Return the exact combined commit/receipt for final review;
reference adoption and runtime promotion remain separate decisions.
