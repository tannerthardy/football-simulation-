# Independent #373 repair and provenance recheck

**Latest verdict:** the [v4 retest below](#v4-independent-retest-and-completed-nominated-anchor-review) closes both window witnesses on `379d9031`. Owner 28/28 and independent 14/14 checks pass. The nominated raw review is complete with one explicitly pending case. The sim/NFL comparative conclusion remains held for missing producing inputs and provenance. Earlier sections preserve the historical findings at their actual versions.

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

## Historical anchor-screen handoff (before raw review)

[`snap_anchor_screen.py`](../../scripts/mechanics/snap_anchor_screen.py) materializes the original inline screen for reproducibility; it is **not an eligibility rule or another box operator**. It checks ball-y outside [0,160/3] or mean(all listed OL snap x) outside the deliberately broad −5…+2 screen. Its exact output was checked against the original saved 23-hit list, without reading raw CSVs again.

The transferable packet pins full input SHA `07d8afc85706184f6214a9271b7a913def6188f95f4521b2e652d83639433cde`, filtered-run ordinals, actual IDs, predicate source SHA and the known raw contradiction's evidence bytes/hash. One case (`2022101603-4087`) is confirmed invalid from its raw SNAP football outside the field. **Twenty-two remain pending raw adjudication here**; this is not a completed symmetric 23-case ledger. Run's separately inspected Week1 `2022091102-467` is among the pending nominations, but its differently hashed source is not silently relabeled as this input's review.

The packet may not be applied to the other host's differently hashed Week1/full cache without a new source-qualified join/review. Pending hits remain included with flags, not auto-excluded. No alternative LOS was fabricated, no result was selected by yards and no new raw-data pipeline or physics work was started.

## Historical next owner decisions (72e review)

Run fixes/adjudicates the two bounded sample-window witnesses, retaining the old failures and live opposing controls. The original external receipt remains historical b9 evidence; a repaired report needs its own version/source/settings and actual denominators. Tools can verify exact inputs/receipts once transferred. No sim/NFL conclusion is approved, no held blocking diagnosis resumed, and no Actions or merge occurred.

## V4 independent retest and completed nominated-anchor review

**ACCEPT the bounded window repairs on `379d9031ded6aa364a3f05276b2729d14de749d8`; HOLD the sim/NFL comparative conclusion.** The historical 72e/a545 findings above are retained at their actual pins. V4 script SHA256 is `273e45b751fb9c54bb6556aed1c4c4d14e4def640a1ede37a507d032ef497e03`. No Run implementation, common loader, historical counter, engine or settings was edited in this review.

Manual Python 3.12.14 evidence: the owner's 28 tests independently pass (0.152s); the portable independent runner passes **14/14**, exit 0. It closes both saved failures: proximity at .50 with ending .55 is retained, and a generic/NFL tape stopping at 1.5 before declared end 4.0 yields unknown touch while preserving valid initial counts. The owner's declared-end-3.0 variant also passes. Early-live, post-end-only, observed-arrival exclusion, no-padding, native truncation, mirror/boundary and the five earlier defect controls are retained. No broad suite, games or Actions ran.

```sh
python3 -I -m unittest discover -s test -p test_run_box_suite.py -v
python3 -I /path/to/review/scripts/mechanics/box_suite_recheck_controls.py \
  --suite /path/to/379d9031/scripts/data/run_box_suite.py
```

The raw review is now complete **for the 23 nominated screen hits**, with two predeclared controls; it does not certify all 6,223 snapshots. One targeted pass over the seven relevant cached tracking weeks (1,3,4,5,6,7,9) took 135.503s and pinned each file's bytes/hash. It retained SNAP−2…SNAP+2 for the exact IDs, joined the actual listed OL identities and official LOS, and checked the pre/snap/post sequence. No new download, conversion, inferred LOS repair or gain-based selection occurred.

Of the **22 previously outstanding nominations**, 21 show a converted-reference inconsistency: the recorded football is already behind every listed OL before SNAP, remains displaced from the official line across adjacent samples, and becomes the converter's fixed longitudinal origin. This identifies an unsuitable reference for the snap-relative counting geometry; it does **not** declare the NFL movement/formation itself impossible or diagnose whether the underlying cause is ball tracking or event timing. Together with the previously confirmed out-of-field case, 22 nominated anchors are marked invalid/unknown. The screen threshold itself was not used as an automatic exclusion rule.

**One stays pending:** `2022101606-1288`. Oriented ball offsets at S−1/S/S+1 are −2.20/−2.82/−3.33 yd; the SNAP OL range is −1.57…−.19 relative to official LOS. Unlike the clearer cases, fast ball motion near the snap leaves an unresolved timing/reference interpretation. The primary table includes it with the pending flag; a separately labelled sensitivity excludes it. The missing observation is a verified common pre-snap ball/player instant (or equivalent authoritative snap-time adjudication), not another arbitrary offset cutoff.

**Controls retained:** extreme D1 `2022091105-1913` and ordinary outside zone `2022091200-64`. These are coherent against the gross-reference screen; they are not gold-standard exact pre-snap spot calibration. The ordinary control itself has some ball/event-time offset. A small box is not an exclusion reason.

The following values are yards oriented toward offensive advance, relative to the official LOS. They are evidence summaries, not new thresholds. Ordinals address the exact run-only input hash below.

| Filtered ordinal | Play | Review | Ball offset S−1 / S / S+1 | Listed OL range at S |
|---:|---|---|---:|---:|
| 613 | 2022091101-2980 | confirmed_invalid | -3.94 / -4.05 / -4.06 | -1.68…-0.49 |
| 616 | 2022091101-3125 | confirmed_invalid | -3.43 / -3.57 / -3.64 | -1.24…-0.18 |
| 526 | 2022091102-322 | confirmed_invalid | -3.11 / -3.22 / -3.31 | -1.51…-0.60 |
| 579 | 2022091102-3981 | confirmed_invalid | -2.55 / -2.65 / -2.76 | -0.82…-0.04 |
| 580 | 2022091102-4019 | confirmed_invalid | -2.50 / -2.33 / -2.18 | -0.62…+0.12 |
| 528 | 2022091102-467 | confirmed_invalid | -7.65 / -7.65 / -7.64 | -1.40…-0.62 |
| 388 | 2022091105-1913 | valid | +0.12 / +0.12 / +0.12 | -1.35…-0.51 |
| 113 | 2022091108-2724 | confirmed_invalid | -3.42 / -3.32 / -3.39 | -1.27…-0.56 |
| 276 | 2022091109-3116 | confirmed_invalid | -3.32 / -3.15 / -3.04 | -0.63…-0.10 |
| 0 | 2022091200-64 | valid | -1.11 / -1.47 / -1.84 | -1.53…-0.83 |
| 1786 | 2022092505-1347 | confirmed_invalid | -3.19 / -3.19 / -3.24 | -1.20…-0.30 |
| 2832 | 2022092900-904 | confirmed_invalid | -3.20 / -3.30 / -3.37 | -1.29…-0.49 |
| 2664 | 2022100204-3385 | confirmed_invalid | -3.83 / -3.90 / -3.93 | -1.60…-0.88 |
| 2355 | 2022100210-1018 | confirmed_invalid | -3.64 / -4.01 / -4.28 | -1.45…-0.50 |
| 2389 | 2022100210-4013 | confirmed_invalid | -2.91 / -3.16 / -3.36 | -0.88…+0.86 |
| 2346 | 2022100210-488 | confirmed_invalid | -2.62 / -2.90 / -3.23 | -0.67…+0.59 |
| 3253 | 2022100906-1522 | confirmed_invalid | -2.60 / -2.69 / -2.79 | -0.68…-0.04 |
| 2917 | 2022100913-761 | confirmed_invalid | -3.79 / -3.66 / -3.71 | -1.36…-0.49 |
| 4221 | 2022101300-2202 | confirmed_invalid | -3.47 / -3.46 / -3.55 | -1.43…-0.43 |
| 4048 | 2022101603-4087 | confirmed_invalid | +21.26 / +21.26 / +21.31 | -1.37…-0.75 |
| 3893 | 2022101606-1017 | confirmed_invalid | -3.99 / -4.15 / -4.38 | -1.27…-0.43 |
| 3895 | 2022101606-1288 | pending | -2.20 / -2.82 / -3.33 | -1.57…-0.19 |
| 4593 | 2022102305-2058 | confirmed_invalid | -3.72 / -4.24 / -4.60 | -1.82…-0.73 |
| 5821 | 2022110607-3454 | confirmed_invalid | -3.30 / -3.72 / -4.07 | -1.71…-0.81 |
| 5655 | 2022110700-3195 | confirmed_invalid | -2.82 / -3.48 / -4.08 | -1.62…-0.90 |

## Source-pinned nine-week NFL-only result

A single cached query on v4 took **22.016s**, exit 0. The exact input is 6,223 run-only records / 136 games / 2022 weeks 1–9, SHA256 `07d8afc85706184f6214a9271b7a913def6188f95f4521b2e652d83639433cde`. This is not the other host's differently hashed all-play file. All-input accounting retains **6,223 rows: 6,196 counted, 27 unknown** (22 reviewed anchors plus five listed-position/side ambiguities). All 6,196 counted rows have observed touch horizons here; none of this supplies a native sim tape.

| Snap surplus | Counted runs | Proximity-positive / eligible backers | Fraction | Game-cluster 95% interval |
|---|---:|---:|---:|---:|
| ALL | 6,196 | 9,716/11,264 | 86.26% | 85.45%–87.02% |
| +1 | 1,714 | 2,595/3,082 | 84.20% | 82.80%–85.59% |
| +2 or more | 480 | 663/776 | 85.44% | 82.72%–88.32% |
| even | 2,485 | 4,121/4,696 | 87.76% | 86.60%–88.79% |
| light | 1,517 | 2,337/2,710 | 86.24% | 84.70%–87.81% |

400 game-cluster bootstrap draws, seed 20221009, 136 games. The endpoint is the existing geometric backer-proximity proxy, not actual contact, shedding, load, protection or coaching assignment. Equal surplus is not equal raw B,D, personnel, concept, formation or selection. Unstratified results are retained.

Excluding the one pending run gives **6,195 counted; 9,715/11,262 = 86.2635%** (95% 85.4614–87.0308%); even remains **4,121/4,696 = 87.7555%**. The primary includes pending: **9,716/11,264 = 86.2571%**. Review status is 22 invalid, one pending, two valid controls, 6,198 not reviewed by this nominated-case ledger. Unreviewed does not mean certified valid.

The five additional count-unknown IDs are `2022091809-795`, `2022092502-1594`, `2022101609-1174`, `2022103010-1943`, `2022110608-1003` (`listed_position_side_ambiguous`). This establishes the local 6,223→6,218 pre-anchor count chain; it does not independently prove that the external receipt's 6,218 used those exact bytes/exclusions.

Exact hashes (full raw files and individual case evidence are in the transferable PR review manifest; raw tracking is outside Git):

- Raw extractor: `2501fce6c0e87fbf77e7157eb93067725a0d9714d4ad670e8e9fcf313605a9b4`; screen: `3cb0ebe7c5f6e66a289d901d3a1065f4ac35590431307fa7002b12154f8cdb68`.
- Raw private evidence receipt: `1718e269e5250cd61137278b3fb9a400abcac5de647bc9b1f78a0928833212bb`.
- Full review manifest: `577125b03efa5b6b7ac0397b28d9d378caa6bb8cf3ffa01e69b6ecf59550ebd7`.
- NFL-only v4 report: `b5acc9646229826ae32bcb511b3fadffb2fe7c2f2103a3547640af0804c47f9e`.

Portable manifest SHA256: `dd6bf93c2dba5eba7ba24c28977340001cda73221af475bd602952a1e74e2308`. A portable manifest strips only the duplicated embedded evidence documents, keeping all 25 source/ordinal/ID/status/reason/evidence-hash records and raw/source manifests. The v4 loader returns **exactly equal 25-entry review maps** from full and portable files (manual check, no new query); each of the 25 evidence-document hashes was verified. The portable file has its own hash, not the full manifest's hash. A rerun using it should match numeric results but must report its actual review-manifest hash. The query recorded no sim source/settings/inputs; zero common-support cells here means no supplied sim, not failed matching.

## Remaining owner decision

The two window holds are closed on exact v4. The nominated raw screen now has explicit decisions with one unresolved timing case visibly pending. **Keep numerical comparison/adoption and blocking diagnosis held** until the exact sim producing files, resolved profile/overrides, recording/restage overlay, constructor/execution/exclusion counts and parent-seed identities are transferred and verified. Old b9 results cannot be silently retagged v4. No new gameplay work, Actions or merge is authorized by this review.

Source-qualification correction: actual remote `develop` is `2cf225efb2e581fe8d135732711b5d943fe8e137`, confirmed independently with `git ls-remote origin refs/heads/develop` and GitHub's `git/ref/heads/develop` API. The previously quoted `5235708c6db09838e65692350a7f31510fa352aa` is the older #297 merge, read from a stale local `origin/develop`. This checkout has a narrow fetch refspec for `claude/football-sim-engine`; `git fetch origin develop` updated `FETCH_HEAD` without updating that tracking ref. An explicit `git fetch origin refs/heads/develop:refs/remotes/origin/develop` now makes both refs agree with the remote. The independent review branch remains based on `3779a4ed71eadbdc24dc9b023f67b7b80b95a505`. The literal tested operator `379d9031`, 28/14 test results, input/review/report hashes and NFL-only table are unchanged. No current-develop gameplay result is inferred from these pinned measurement checks.
