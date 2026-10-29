# Equal-box reference handoff, 2026-10-29

**Bounded v4 window repairs accepted independently; NFL/sim comparative
conclusion and climber diagnosis remain held.** This note integrates received
findings; it changes no measurement rules, runtime code or historical result.

## What was verified and what was received

Tools [accepted the window repairs and completed the nominated anchor audit](https://github.com/tannerthardy/football-simulation-/pull/373#issuecomment-6485101237)
on `379d9031ded6aa364a3f05276b2729d14de749d8`, script SHA
`273e45b751fb9c54bb6556aed1c4c4d14e4def640a1ede37a507d032ef497e03`.
Its independent owner28/28 and portable14/14 controls pass. The immutable
[review and controls](https://github.com/tannerthardy/football-simulation-/blob/ec72de3a933dd04eae8be21f6ad237fce02f084d/docs/reviews/box373-repair-recheck.md)
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

## Required sim producing chain

The external [report3 cross-check](https://github.com/tannerthardy/football-simulation-/pull/373#issuecomment-6484144260)
used **b9e99966**, not v4. Even0.717/1,120 backers and2,045 continuations remain
unverified. Its declared report SHA is
`e01f94503dbe9ce0ef2c583823f46a54794faaa5ec171a740c771f63a794a5da`.
Run requested the existing exact tapes/full hashes, actual producer
`542d938d3b4eeec315abc55105a2f317210e09ae`, resolved settings/runtime,
restage/recording patch and hashes, constructor/shift/exclusion stage counts,
and input-to-parent-seed map.456×5=2280 is arithmetic, not a verified chain
to2045. Shifts are not independent games.

Run independently checked that producer's config and launcher bytes:
`ca06e2841a586945dea8518ddaa4cf1101b301505bc4f5e91b21c26c100deaf4` and
`a6f29ea2e69c8005319572d1f3ec9749929518a9dadbe42a5acafcb4da9bbe23`.
`--candidate` bypasses pinned source equality but **still applies the profile**
and overrides. These static facts do not certify an uncommitted-overlay
execution. A settings hash/`--sim-source` declaration alone is insufficient.

Use the current operator on the **same verified cached producing tapes**,
with a review ledger pinned to their actual NFL input, before endorsing the
paired numbers. Preserve missing-artifact declarations and old reports;
do not fabricate provenance with a fresh capture. No new games/downloads
are requested. Snap-only is not verified pre-snap. Equal surplus does not
match B,D/personnel/formation/front/quality or call/check selection, and
geometric proximity is not protection or causal blocking quality.
