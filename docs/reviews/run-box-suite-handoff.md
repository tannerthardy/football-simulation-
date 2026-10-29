# Equal-box reference handoff, 2026-10-29

**Bounded v4 window repairs accepted independently; NFL/sim comparative
conclusion and climber diagnosis remain held.** This note integrates received
findings; it changes no measurement rules, runtime code or historical result.

## What was verified and what was received

Tools [accepted the window repairs and completed the nominated anchor audit](https://github.com/tannerthardy/football-simulation-/pull/373#issuecomment-6485101237)
on `379d9031ded6aa364a3f05276b2729d14de749d8`, script SHA
`273e45b751fb9c54bb6556aed1c4c4d14e4def640a1ede37a507d032ef497e03`.
Its independent owner28/28 and portable14/14 controls pass. The immutable
[review and controls](https://github.com/tannerthardy/football-simulation-/blob/35e06f8479d39cfcc611e884ae772f248bd88655/docs/reviews/box373-repair-recheck.md)
do not approve a sim/NFL comparison or gameplay. Run verified the unchanged
script hash, portable manifest bytes,25 parsed review entries and rejection
against the unrelated Week1 input; no nine-week/raw query was repeated here.

The nominated review covers23 screen hits plus two predeclared controls:
**22 invalid anchors,2 valid controls,1 pending**. It is not a certification
of every snapshot. These source artifacts are distinct:

- Tools' run-only NFL input:6,223 rows/136 games/2022 weeks1–9,
  `07d8afc85706184f6214a9271b7a913def6188f95f4521b2e652d83639433cde`.
- Portable25-entry review JSON (one trailing newline), provided in the linked
  handoff: `dd6bf93c2dba5eba7ba24c28977340001cda73221af475bd602952a1e74e2308`.
- Full ledger used in the reported query:
  `577125b03efa5b6b7ac0397b28d9d378caa6bb8cf3ffa01e69b6ecf59550ebd7`.
  Tools verified equal parsed review maps. Run has not received that full
  private ledger/evidence or independently repeated the map comparison.
- Tools' NFL-only v4 report:
  `b5acc9646229826ae32bcb511b3fadffb2fe7c2f2103a3547640af0804c47f9e`.
  The single cached query reportedly took22.016s. Numbers below are the
  independently supplied Tools receipt, not an owner rerun on local data.

## Reviewed NFL-only reference

All-input accounting retains6,223 rows: **6,196 counted/27 unknown**. Unknown
comprises22 reviewed anchors and five listed-position/side ambiguities.
Those five IDs are2022091809-795,2022092502-1594,2022101609-1174,
2022103010-1943,2022110608-1003. This establishes the independent input's
pre-anchor6,223→6,218 chain; it does not prove that the external all-play
cache/old receipt used identical bytes or the same five decisions.

| SNAP surplus | Counted runs | Proximity-positive / eligible backers | Fraction | Game-cluster95% interval |
|---|---:|---:|---:|---|
| ALL |6196|9716/11264|86.26%|85.45–87.02%|
| Light |1517|2337/2710|86.24%|84.70–87.81%|
| Even |2485|4121/4696|87.76%|86.60–88.79%|
| Defense+1 |1714|2595/3082|84.20%|82.80–85.59%|
| Defense+2plus |480|663/776|85.44%|82.72–88.32%|

The primary includes the pending case. Excluding it as a labelled sensitivity
gives6,195 counted;9,715/11,262=86.2635% overall; even stays4,121/4,696.
Small numerical effect does not resolve its integrity. All6,196 counted rows
have observed touch horizons in this source. No sim input means zero common
support here is **not a failed match**. The6,198 rows unreviewed by this
nominated-case ledger are not automatically certified valid. Bootstrap:
400 game-cluster draws, seed20221009; no tracking/role/selection error modeled.

## One unresolved anchor: Wildcat timing/reference ambiguity

`2022101606-1288`, full-input ordinal3895, remains **pending**. Tools' raw
summary has ball offsets−2.20/−2.82/−3.33yd from official LOS at S−1/S/S+1,
with listed OL−1.57…−.19yd at S. Run inspected the cached, source-matched
plays metadata: Q2 5:39, NYG/BAL, **WILDCAT**,4x1, PULL LEAD with
INVERTED;READ OPTION, direct snap to Barkley followed by Breida's run.
The same `plays.csv` bytes are pinned by Tools:
`a103cbc3a1ddf7678cb6d77ea5f9919c4292b5d55c7876f7cad6cce3d62dca04`.

Moving-ball timing is plausible; this summary cannot establish the common
authoritative snap instant. Run requested the already saved small evidence
document, SHA
`290e1c4ac0aa8c4baada1057b34a48aef923f3a77791acc8a8377922e88930da`.
The raw Week6 frames are not present in Run's Week1-only executor. This is
an inspection of the supplied summaries and independently joined metadata,
not an independent raw-frame adjudication. Keep primary plus sensitivity;
do not invent an offset cutoff or reconstruct LOS to match an expected box.
The run result/declined penalty does not determine eligibility. A non-carrier
back can be the direct-snap/read player, not a guaranteed blocker: equal
counts do not certify equivalent responsibilities.

## Independently reproduced archived sim chain

This section supersedes the earlier missing-artifact status. The
[author's delivery](https://github.com/tannerthardy/football-simulation-/pull/373#issuecomment-6502679076)
is on evidence-only branch `evidence/run-report3-provenance`, bundle
`52ec63308c483c7d6b987237790d61adedf2d627`, README correction
`e0e03dac8b118658256b43bc09063c829c9449eb`. Run fetched and materialized only
its evidence directory into ignored `out/`; nothing was merged. All supplied
compressed/uncompressed file sizes and hashes match the manifest,
`9eb668ddb375b9720074f19229d8639900de3f8f89f74c96553bbf9bd019c014`.
The exact original report3 is
`e01f94503dbe9ce0ef2c583823f46a54794faaa5ec171a740c771f63a794a5da`.

| Tape seed | Tape SHA256 | Bytes | Loaded runs |
|---|---|---:|---:|
|7|`4b96719441fc2689f63281b0b935b1bb44383be36e9423e962141bbd655d1adb`|30721987|541|
|9|`bde7e2e9309df2c36836128fff7f3828cf03edf8253e21b255b9f74297fd3a4f`|28154673|520|
|11|`2a642bca0c5fec211928b4ce2395ba96533f938691921fd8b7c784ca7bc86c1d`|28319427|503|
|13|`7fa8b4cfb05ec74001832027bfcab66f2f181df2627721f5f11158009b44e71b`|25780019|481|

### Source, settings and selection verified

Producer is `542d938d3b4eeec315abc55105a2f317210e09ae`, Node22.23.3.
Run independently reconstructed the source digest
`7829f2f6bce53d7655fb5c54a4659d32da01a269b86fe9747a75c69942fccf01`
and full validation digest
`e5355fa28cff247d5e2b9416d1402fb6a812d50a749c1e02ee1950dad6c53264`
from that commit plus the supplied three-file patch and untracked recorder.
Both equal all four actual launcher receipts. All87 flags and world-default
metadata match its committed profile; decoded constructors have no explicit
physics/alignment overrides. Source `src/` is byte-identical to3779a4ed.
These are historical sources, not a claim about current develop.

The four receipts bind `replay N DEV542 --run-only --shifts 4 --trace`,
exit0, inputs-unchanged and the actual overlay. `--candidate` bypasses the
profile's source pin, but still applies its flags. The old `box-settings.json`
was a handwritten summary, not a resolved receipt. V4 recomputation instead
hashes receipt `run-1793219606355-306.json`,
`df96ba12b20abb0a25a6ddace16fb9cdf3be53c950bd5d83e1966775a0b05784`.
All four resolved flag/default records agree. This changes metadata, not play
execution. The provided Python overlay is not the loader used in report3:
its recorded common-loader hash is the committed `c78ed2da…` used here.

Run independently decoded and hashed every saved constructor, verified the
accounting lists, and matched every taped execution ID in order:

| Selection stage | Count |
|---|---:|
|Saved constructors,117/115/115/109 by seed|456|
|Five replay streams per constructor|2280|
|Pass-flagged constructors not taped,3×5|15|
|Actual tape records|2265|
|No run concept|10|
|Overlay holding-flag exclusion|170|
|No non-QB carrier|40|
|Loaded/countable rows|2045|

The15 omissions follow the **saved pass flag**, not independent proof of the
replayed call. The170 `nullified` flags are set when the PlaySim result has
any offensive holding call; this is not verification of game-layer accepted
penalty/nullification. Non-QB-carrier selection also excludes failed exchanges.
These restrictions are part of this archive's population, not interchangeable
with an ordinary-game or NFL selection. Four tape hashes map to four supplied
parent-seed clusters; the saved RNG plus four deterministic forks are repeated
executions, not2,045 independent games.

### Historical reproduction and current-operator results

Run executed the historical b9e99966 operator and unchanged v4 script on these
same four tapes in7/9/11/13 order. **All2,045 historical sim rows and every sim
summary table match report3 exactly**, including its seed-cluster intervals.
Only the sim component was reproduced: an explicitly empty offline NFL fixture
satisfied the CLI's required NFL argument. No NFL observations or full-report
comparison are implied by that placeholder.

| SNAP surplus | Runs | Eligible backers | Historical positive | V4 positive | V4 fraction | Four-seed bootstrap95% interval |
|---|---:|---:|---:|---:|---:|---|
|ALL|2045|3720|2434|2455|65.99%|61.23–70.16%|
|Light|135|189|122|122|64.55%|42.97–75.73%|
|Even|643|1120|803|810|72.32%|64.04–76.89%|
|Defense+1|883|1646|1021|1032|62.70%|57.83–67.50%|
|Defense+2plus|384|765|488|491|64.18%|60.06–68.80%|

All2,045 have observed v4 touch horizons; all snap counts are unchanged.
Against b9,21 rows each gain one proximity-positive backer under the repaired
terminal-sample rule; admitted-frame counts are unchanged. These are
measurement corrections on identical tapes, not additional blocking work.
No carrier-credit correction is active here. Even-zone subsets are
IZ162/210=77.14% over133 runs and OZ415/543=76.43% over303 runs; this concept
mapping pools Duo/split-zone into IZ and wide-zone/toss into OZ.

The supplied Tools NFL-only v4 even fraction87.76% remains above this archive's
72.32%, but this is a **descriptive, separately selected cohort contrast**,
not proof of a release defect or an OL performance target. NFL source/review
bytes differ from report3's all-play cache. The exact Tools current-v4 report
is needed to join raw B,D/personnel/concept common-support cells; its published
aggregate table alone cannot establish that match. Four sim clusters are few,
and these intervals do not model tracking, taxonomy or selection error.

Raw local output hashes (not committed): historical sim-only report
`29710c00ceb0e1084ee119cdafeaf365389912ade4e098005aa57d1c699c32df`;
v4 sim-only report
`f8cea6f00f9a4b0d053fb4379d82c5876ec3e8897c72f45840f079374fb10ad2`.
To reproduce, materialize the bundle outside Git and run the CLI with its
four `--sim` inputs, full producer `--sim-source`, actual receipt
`--sim-settings`, and `--sim-clusters box-clusters.json`. Use the pinned b9
script/common loader for the historical comparison, current script SHA
`273e45b7…` for v4, and an explicitly labelled empty NFL fixture only for
sim-component verification. Retain a real source-pinned NFL input/review
ledger for any actual NFL query; do not transplant review ordinals to another
cache. Bootstrap400, seed20221009, same tape order.

### Manual verification and current-source distinction

Fetched develop is `6949f6454af3a88ff0d0bb41ca424f4ff4174b0d`; this is a
report-only follow-up from working HEAD39fd09e7, not a replay of that newer
engine. The unchanged v4 operator was tested on379d9031 and its script hash
is verified here. Python3.12.14; Node22.23.3 used only to deserialize saved
constructors, not run football. Manual owner controls:
`python3 -m unittest discover -s test -p 'test_run_box_suite.py' -q`:
**28/28 pass,0.084s, no skips**. `git diff --check` passes. Prior unchanged
276-test offline receipt and Tools' independent14 controls remain applicable;
no core/build/game campaign was repeated for this documentation-only update.
Both cached-data recomputations finished successfully; their wall times were
not recorded. Launcher249–281s times belong to the historical producer, not
today's measurement work. No Actions.

### Remaining historical limitations and disposition

The constructor capture source/command and original game/roster provenance
were never saved. All456 constructor records lack game IDs. Current metadata
and constructor bytes cannot retrospectively recover that chain or prove the
sample represents ordinary observed game selection.

Run inspected the recorder and its transitive getters at the exact producer:
position/velocity/facing, down state, held carrier and run target are pure
reads there. No RNG draw, acquire/see call or movement command was found.
This supports a passive-recorder interpretation, but no saved with/without
trace execution exists; dynamic noninterference is **not established**.
No replacement games/captures were run to manufacture missing history.

**Accept the exact archived sim arithmetic/provenance reproduction, with
these limits. Hold causal NFL calibration, candidate#375 claims and the
climber diagnosis.** Request the existing Tools v4 report for compatible-cell
assessment and the existing pending-anchor packet; do not download tracking,
rerun games or silently promote this historical source to current production.

## Candidate #375 does not close the evidence hold

Draft [#375](https://github.com/tannerthardy/football-simulation-/pull/375),
`run/G2-climb-on-secure`, is preserved at
`4684e96c3df0562ea0c6431fd1c71f256fa508d3` and marked **hold**. No candidate
code, historical experiment or adverse result was removed. The coordinator
reports publication after Tanner's hold; GitHub records creation at
2026-10-29T00:47:22Z. **When development occurred is not established by
publication timing.** This is not a claim of development after the hold.

Its description treats the old even-box0.717sim/0.876NFL as established and
reports gains such as0.717→0.736 overall and0.762→0.800 outside zone. These
remain author-reported candidate measurements under an uncommitted overlay,
not independently verified current-v4 comparisons. The reviewed NFL-only
reference is0.8776=4121/4696 on its own pinned input/review cohort. The old baseline sim numerator/denominator now reproduces, as documented
above. That does not establish identical NFL cohorts or any candidate improvement.

The producer/source bridge must also be explicit: old report3 declares
542d938d; #375 declares baseline3779a4ed and candidate4684e96c. Run verified that542d938d and3779a4ed have byte-identical `src/`; this
source bridge does not supply the missing candidate tapes or capture receipt. Its release/closing/keeper
metrics need the exact analysis scripts/definitions alongside the producing
tapes and overlay. The claim that the release read is the cause remains an
author hypothesis for later review, not an accepted finding from #373.

Keep the rejected all-double-release treatment, and the reported outside-zone
41new/21removed DL backfield-first-hit cases (32attributed to later keeper
loss), visible at their actual source. They are not an automatic rejection
or an instruction to restore old yardage. The author-reported focused/core
and integration checks do not certify an NFL comparison or this mechanism.

The [hold/provenance reconciliation](https://github.com/tannerthardy/football-simulation-/pull/375#issuecomment-6501542511)
now has the original report3 artifact request fulfilled as qualified above.
Any candidate comparison still needs its separately existing tapes and metric
scripts; no replacement tapes or game campaign are requested. #375 and the climber/behavior diagnosis stay
held. No behavior review, experiment, Actions or merge was started here.
