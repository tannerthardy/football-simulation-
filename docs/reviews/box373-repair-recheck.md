# Independent #373 repair and provenance recheck

Review scope: immutable `72e2ae0edb21ac626075591950f8e8ccf1cb5e3f`, script SHA256 `c1720847afc4d10cff9b6742fba000273b4978ce234cffb60db3527872164d5f`. Run owns implementation; Tools owns these independent controls. Blocking diagnosis remains held. No owner code, shared loader, physics or runtime setting was changed.

## Decision

**Qualified ACCEPT of the five repaired mechanisms; HOLD numerical comparison/adoption.** Independently rerun owner tests: **21/21 pass**, 0.074 seconds. Independent saved witnesses: **12/14 pass; two fail**, retained in the portable runner below (exit 1). The missing producing-input chain also prevents endorsement of the reported NFL/sim gap.

The wrapper retains immutable f725 historical code (`42e02117fe3bcec7a192ab15d4f0d208915b5084338ef2ba8bc0b2303786857a`) and public loader (`c78ed2da8d62c5d2a223e1de00fd625dd1fe5ee751ecbada541f84d1a522d7d7`). Independent observations confirm:

- Post-end-only proximity is removed while earlier live proximity stays.
- OL/TE carrier self-credit is removed exactly once; an already split-out TE gets no additional subtraction. Historical counts and listed composition remain distinct.
- Nonfinite snap positions make counts unknown, not a lighter known box.
- Full/partial duplicate IDs and native duplicate actor indices are unknown. Unique partial IDs are admitted without claiming complete identity certification.
- Invalid later live timing keeps a valid initial count but makes touch unknown. Drift solely after the declared ending remains flagged without discarding valid earlier measurements. Native truncation before a declared ending correctly makes touch unknown.

The original f725 control failures remain historical evidence. This wrapper has different admission entrypoints, so the new consumer-level witnesses test the same requirements through `observe`/`streams`; they do not pretend that the unmodified historical function itself was repaired.

## Two remaining sample-window witnesses

These are analytic inputs, not native football outcomes. They reuse the prior saved geometry without retuning.

**A valid final admitted sample is lost.** Using the existing owner's `play()` fixture:

```python
p = play()
p['end'] = .55
p['xy'][5][2] = (4, 0)  # sole C/LB proximity at .50, strictly before ending .55
historical = m.observe(p, OP, live=False, correct_carrier=False)  # touched 1
current = m.observe(p, OP)                                     # touched 0
```

Clipping correctly retains frame 5, but the historical operator's never-arrives fallback becomes `arrive = len(xy)-1 = 5`; `range(3, arrive)` then excludes that valid sample. This is not merely a choice about whether a sample exactly at the whistle counts: .50 is strictly earlier than .55. The changed-run count therefore cannot be described as only post-ending positives removed. Preserve the post-end-only and earlier-live opposing controls. Clarify/version the sample frontier without padding invented motion or silently retagging old reports. Run owns the narrow correction.

**An NFL tape truncated before its declared end is still a known negative.**

```python
p = play()               # declares end 3.0
p['xy'] = p['xy'][:16]   # observation stops at 1.5
m.observe(p, OP)         # touch_status observed, touched 0
```

The comparable native input is correctly unknown because the sim branch checks tape length. The generic/NFL path lacks that guard. Preserve valid initial composition while marking an unobserved touch horizon unknown consistently. This is an admission witness, not a claim that a supplied NFL empirical file contains such a tape.

Portable independent controls:

```sh
python3 -I scripts/mechanics/box_suite_recheck_controls.py \
  --suite /path/to/72e2ae0e/scripts/data/run_box_suite.py
```

This runner reports each assertion/evidence and exits nonzero for any failed requirement. It invokes the owner's operator rather than implementing a competing box counter. Compile/whitespace checks pass; no full suite or native campaign was run. The earlier diagnostic generator emitted JSON with two failed conditions; the committed test runner correctly returns exit 1.

## Concurrent a545 snapshot policy is separate evidence

During review, #373 advanced to `a545dad96e1c07ad8e41445d4565502baaa618f7` for source-pinned snapshot reviews. Its diff adds review policy/manifest handling; `observe` and `streams` remain unchanged. Thus the two numerical witnesses remain applicable to those unchanged routines. This is a source inspection, **not execution or approval of all a545 policy behavior**. Owner-reported 24 checks retain their own attribution. Pending screened cases must not become automatic exclusions or approvals.

## External b9 cross-check: what is and is not established

[External receipt](https://github.com/tannerthardy/football-simulation-/pull/373#issuecomment-6484144260) applies to `b9e99966b9bf5aea11332f059afc1796217f7a20`, not 72e/a545. It reports NFL even 0.876 / 4,710 backers and sim 0.717 / 1,120 backers; all sim 0.654 / 2,045 snaps. Reported report checksum is `e01f94503dbe9ce0ef2c583823f46a54794faaa5ec171a740c771f63a794a5da`. No report bytes, exact tapes or recording overlay have been transferred here, so those cells/intervals are **reported, not independently certified**.

The same receipt says “456 run-only matched-restage snaps,” seeds 7/9/11/13 plus four shifts. The unit accounting is unresolved. If 456 were unique constructors and each had five executions, the arithmetic would be 2,280; 235 fewer accepted rows would reach 2,045. That is **not** a verified explanation. Need existing per-file input/selection counters and constructor/shift identities:

1. Raw records and unique constructors, each parent seed/roster and execution shift.
2. Pass/no-concept, nullified, no-nonQB-carrier/failed-exchange, loader and metadata exclusions.
3. Loaded rows, count unknown/excluded, counted rows, touch-observed rows and eligible backer denominators.
4. Repeated logical IDs versus distinct RNG executions; exact tape hashes and input-to-parent-cluster mapping.

The NFL receipt says 6,218 runs versus the independently reproduced raw query's 6,223. Need the existing status/exclusion reasons and affected five IDs, not an invented reconciliation or replacement historical number. A shared filename or converter label is not proof of identical cohort bytes. The other host's full cache and this host's enriched run-only cache are different hashes.

The reported producing engine is `542d938d3b4eeec315abc55105a2f317210e09ae`, Node 22.23.3, under `npm run baseline:run -- --candidate`, profile `run-game-2026-10-13`, with an uncommitted restage/recording overlay. Static source checks establish that this declaration is possible:

- That commit's profile exists, SHA256 `ca06e2841a586945dea8518ddaa4cf1101b301505bc4f5e91b21c26c100deaf4`.
- Launcher `scripts/baseline.mjs` SHA256 `a6f29ea2e69c8005319572d1f3ec9749929518a9dadbe42a5acafcb4da9bbe23`; profile/source flag inventories have no missing/stale names.
- `--candidate` bypasses pinned source-hash equality only. It **still applies profile flags**, followed by any explicit overrides; it does not mean unqualified source defaults. The profile's old engine anchor is not the actual producing engine.

These checks do not certify the execution. Need actual resolved receipt/settings bytes, runtime/roster/seed identities, baseline command/config, exact overlay patch/files and hashes, tape hashes and parent-cluster manifest. The wrapper's `--sim-source` and settings hash are declarations, not proof that those settings produced the tape. With only four supplied parent-seed clusters, nonoverlapping conditional bootstrap intervals do not remove selection/scheme/personnel/front or measurement-window differences. Keep unstratified comparisons, exact B,D and common-support strata; do not treat 2,045 continuations as independent games or forced sampling as NFL incidence.

## Existing anchor-screen handoff

[`snap_anchor_screen.py`](../../scripts/mechanics/snap_anchor_screen.py) materializes the original inline screen for reproducibility; it is **not an eligibility rule or another box operator**. It checks ball-y outside [0,160/3] or mean(all listed OL snap x) outside the deliberately broad −5…+2 screen. Its exact output was checked against the original saved 23-hit list, without reading raw CSVs again.

The transferable packet pins full input SHA `07d8afc85706184f6214a9271b7a913def6188f95f4521b2e652d83639433cde`, filtered-run ordinals, actual IDs, predicate source SHA and the known raw contradiction's evidence bytes/hash. One case (`2022101603-4087`) is confirmed invalid from its raw SNAP football outside the field. **Twenty-two remain pending raw adjudication here**; this is not a completed symmetric 23-case ledger. Run's separately inspected Week1 `2022091102-467` is among the pending nominations, but its differently hashed source is not silently relabeled as this input's review.

The packet may not be applied to the other host's differently hashed Week1/full cache without a new source-qualified join/review. Pending hits remain included with flags, not auto-excluded. No alternative LOS was fabricated, no result was selected by yards and no new raw-data pipeline or physics work was started.

## Next owner decisions

Run fixes/adjudicates the two bounded sample-window witnesses, retaining the old failures and live opposing controls. The original external receipt remains historical b9 evidence; a repaired report needs its own version/source/settings and actual denominators. Tools can verify exact inputs/receipts once transferred. No sim/NFL conclusion is approved, no held blocking diagnosis resumed, and no Actions or merge occurred.
