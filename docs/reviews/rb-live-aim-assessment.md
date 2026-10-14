# One RB assessment-reference candidate

Prepared candidate changes only the designed runner's assessment reference:
pass the live aim already acquired for movement into `BallCarrier.evaluate`.
Its candidate heading and existing 2.5-weight designed-track penalty use that
same reference. The four-argument/default evaluator retains its previous
fixed-aim behavior for other calls. Cue acquisition, cadence, command generation,
scoring weights, release rules and lane preferences retain their implementations.

Tested engine commit: **`139f55bfecf62b61f8ebee49647e6e2b6999764f`**, source
`973d4ab84f80e5aa74a25c918fb96ef0189b938f4d22c8350aba9d121bb7f965`.
Parent diagnosis stays at **`45a35bbe1b09554e874370604c83df47fca809f6`**;
historical comparison remains **`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`**.
Exact settings/revisions/fingerprints are in the
[preparation receipt](rb-live-aim-preparation.json).

## Explicit hold point

The preparation-stage native comparison waited on the user's prerequisite:
“After the physics owner reviews the existing RT/DE_S angular-law interval”.
At preparation no interval review disposition was found on the PR #2 handoff, PR #11
thread, shared-review discussion, or sole owner's published
`claude/engine-priorities` tip `862258c` at preparation. This is a user-defined
technical prerequisite, not a new permission or promotion request.

The prerequisite is now satisfied by sole physics-owner [PR #14 at `22d3b34`](https://github.com/tannerthardy/football-simulation-/pull/14).
That review verifies the angular defect and the existing patch's mechanical
repair, while retaining adverse football results and precontact ground-facing
confounding. The authorized three-control RB comparison proceeds with the
original contact law fixed in both arms. No full-patch result is imported as
evidence for the isolated reference correction or a legitimate defensive win.

That prerequisite calls for review; it does not authorize importing another
contact law into this comparison. Both arms must keep the existing World hash
`ed1708d764c355da60bd31c115f557baf3d81af18c89f3479c471bf981732ca2`.
The 13,076-byte passive-law witness is preserved, including its +15.153603
clean free-pair angular change and unproved football endpoint causation.
The physics owner can record the law limitation and the disposition needed
to interpret this independent controller comparison. Shared-solver ownership
remains entirely with that owner.

## Focused evidence already complete

- The new held-controller reference consistency check fails on the unchanged
  runtime at `7e5b7d2`: identical acquired live tracks have different assessment
  scores when only the obsolete snap landmark differs. Its fixed-aim opposing
  control passes. The expected failure is retained in the receipt.
- Both new checks plus the six existing decision-cadence contracts pass on
  `139f55b`. They exercise held controllers without native play ticks or contact
  solves. The opposing control preserves distinct genuine fixed aiming points;
  cadence, consumed cue sequence and own physical profiles are retained.
- Typecheck passes on the same candidate. Source diff is confined to four
  changed lines in `carrier.ts`; the diagnostic listener additionally records
  the actual assessment argument already supplied to the evaluator.
- The three declared Ace input records, pinned **1.4327105054356863-yd** witness,
  13 KB angular input, config, blocking/collection, spacing, movement preview,
  kinematics and World are byte-unchanged. All 45 resolved flags are unchanged:
  live aim on; experimental read/turn, components, handover, active hands,
  motor, hand fight and reach-track off.

Three recorded commands cost **13.22 seconds**, including the expected pre-fix
failure, eight focused passing checks and typecheck. Zero new native observed/plain
pairs, games, roster panels or full suites. No route/arrival/ending improvement
or regression is claimed before the gated comparison.

## One comparison to run after review

Preserve exactly `uc12-wz-s3` (successful Y-playside), legacy
`uc12-wz-s3-mirror` (adverse rightward H-playside placement contrast), and
`uc12-wz-weak-s3` (adverse leftward H-playside). Both manifests are unchanged.
The source-compatible saved default packets at
`/workspace/football-under-center-zone/out/under-center-zone/carrier-design.json.gz`
and `carrier-design-weak.json.gz` already match actual 4ded6b6 complete histories.
Reuse them; no second baseline campaign is needed. The weak direction is against
the same asymmetric Over front, not a complete geometric reflection.

After the review disposition is recorded, use Node **22.23.3**, no diagnostic
hand intervention, and the unchanged baseline profile to collect the candidate
only (two calls plus the one weak call), each observed/plain through its natural
ending or the existing explicit 25-s cap:

```sh
env -u HAND_REMOVE -u HAND_KEEP \
  FLOW_INPUTS=docs/reviews/under-center-zone-inputs.json \
  FLOW_STOP=25 FLOW_TRACE=1 FLOW_PEERS=1 CONTACT_TRACE=1 FLOW_CARRIER=1 \
  npm run baseline:run -- --candidate --receipt out/rb-live-assessment/ace-checks.json -- \
  node --import tsx scripts/diag/defense/hand-action-panel.ts out/rb-live-assessment/ace.json.gz
```

Repeat with `under-center-zone-direction-inputs.json`, `weak-checks.json` and
`weak.json.gz`. Do not run the old diagnosis reducer on the candidate: it asserts
the reference mismatch and writes the pinned witness. Reduce new packets into
separate candidate evidence.

Measure the earliest changed assessment/abandonment condition, responsibility
ending, chosen entry/heading, native requested/delivered/achieved RB and keeper
movement, LOS arrival and first-level end contact. Trace the consumed pictures
and existing momentum at a changed decision; a different score or better gain
does not prove the chosen route was feasible. Preserve the successful arrival,
both adverse H cases, legitimate defensive wins, useful runoff and helper
collection. Keep unsafe early-release evidence secondary and visible.

One candidate, no tuning toward gain or presumed inside cuts. Expand only for
a specific transfer uncertainty that changes the decision. No production merge
or baseline designation: PR #11 remains diagnostic, and this child branch is
an isolated comparison candidate. Any later approved integration must extract
the small controller correction with its necessary checks, without importing
the diagnosis-branch ancestry or unrelated experimental runtime.
