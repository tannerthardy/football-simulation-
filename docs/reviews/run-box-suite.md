# Run suite: compare box composition before interpreting blocking

This is an offline report on existing observed runs. It changes no player,
play call, roster, target, physics capacity, or acceptance band. Keep the old
catalog and results; this report complements them at meaningful checkpoints.
Small controller changes still use focused cases, not another full campaign.

## Source and ownership

Tanner supplied a scratch counting script through the coordinator on
2026-10-28. Its body is preserved in `scripts/mechanics/box_count_original.py`
(HTML comparison entities decoded). It writes only stdout. It contains no
play-side/backside surplus calculation, regardless of earlier descriptions.

The published source was then identified as `tools/run-box-count`,
`f7251869ed0f9c9f59242a9a799523c31f685fcb`, based on accepted
`3779a4ed71eadbdc24dc9b023f67b7b80b95a505`. Its
`scripts/mechanics/box_count_reference.py` is included byte-for-byte, SHA256
`42e02117fe3bcec7a192ab15d4f0d208915b5084338ef2ba8bc0b2303786857a`.
Run owns the suite wrapper; Tools independently validates definitions and
opposing controls. Neither edits the common loader or another owner's branch.

The committed `run_film_reference.py` at this base is
`c78ed2da8d62c5d2a223e1de00fd625dd1fe5ee751ecbada541f84d1a522d7d7`.
It provides every field the original count needs; no unpublished overlay is
required for that count. The published `run_films()` adds explicit filtering
of missing run concepts before that loader, which also excludes nullified
sim snaps and snaps without a non-QB carrier. Those exclusions are counted
in the suite report. They are not automatically the same NFL population.

## What the supplied count actually measures

Both coordinates are already offense-normalized by the existing adapters:
x is yards beyond the line, positive toward the defense's goal, and y is
lateral yards. NFL leftward conversion rotates **both** axes. Do not supply
raw tracking coordinates directly.

The count uses frame zero: NFL SNAP, sim initial t=0 before its first update.
**This is a SNAP-only comparison, not verified common pre-snap timing.**
The converted NFL cache has no last-BEFORE_SNAP frame. A future strict
pre-snap comparison needs that measured picture and an equivalent sim
observation; do not relabel this output to fill that gap.

- All listed OL are counted, requiring at least five. Six-OL formations are
  retained. The center is the mean y of **all** those OL, not necessarily
  the football or the anatomical center.
- Defenders are the listed DL/LB/DB groups with x **<7.5** and lateral
  distance **<6.5** from that mean. Boundaries are strict; there is no lower
  x bound. An unusual deep-backfield defender still counts literally.
- Potential blockers are every OL, every TE within that lateral window
  regardless of depth, and non-carrier RB-group players with x **<−1** in
  that window. Split-out TEs outside the window do not count. A deep or
  advanced TE inside it still counts. WR and QB blocks are not represented.
- RB combines RB/FB in the common format. The source's two-digit personnel
  proxy counts RB-group players and TEs on the field; it is not validated
  charted personnel or evidence of installed responsibilities.
- Surplus is D−B: light <0, even 0, defense +1, defense +2 or more. Keep
  B and D themselves: 5v5, 6v6 and 8v8 are all "even" but different pictures.

The audited wrapper excludes **every carrier from his own blocker count**.
The supplied source already excludes an RB carrier but accidentally includes
an OL or in-window TE carrier. `published_counts` preserves its original B,D
and stratum; `carrier_blocker_credit_removed` identifies the correction.
Listed personnel and the OL-mean anchor remain unchanged. An already
split-out TE outside the envelope gets no additional subtraction. This is
`live-window-carrier-clock-v2`, not a silent revision of the original table.

The claim that this is the QB's identical count is too strong. `qbmind.ts`
uses the same hard window dimensions in its pre-snap branch, but anchors to
ball y and adds position noise. Another branch uses smooth logistic counts.
`metrics.Play.box_count()` instead uses x in [−0.5,7] and lateral <=6.5
around the ball; `box_defenders()` uses [−0.5,2]/4.5; `rallybox.py` uses
[−0.5,7.5]/8. These operators are not interchangeable reference bands.

## Touch, live admission, and denominators

The published touch operator selects each LB-group defender initially
2.5–8 yd deep and within **<6 yd** of OL mean y. It counts him as touched
when an OL/TE/non-carrier RB with x **>−0.5** gets **<1.5 yd** away after
0.3 s but before the carrier reaches the backer's contemporaneous depth−1.
It allows a different blocker each sample. It measures proximity, not hand
contact, load, useful leverage, an assignment or a missed feasible block.

The published loop scans all recorded frames and ignores `play.end`; a
post-whistle encounter can therefore become a touch. The wrapper preserves
the original operator and reports its per-play historical value, but its
primary `live-window-v1` admission truncates positions to samples at or
before the existing loader's end. It does not change the count geometry.
End can itself be a last-recorded fallback, which remains a source limit.
Unknown end or missing live positions keeps the valid count but marks touch
unknown. Missing post-end coordinates cannot invalidate a live measurement.
The complete sim clock is now audited beyond the shared loader's initial
30-sample check. In-window misalignment or a tape ending before its declared
end makes touch unknown while keeping a valid initial count. Clock drift
only after the live end is flagged in `full_clock_valid` without discarding
the valid earlier metric. A bad snap clock or duplicated native actor/player
identity makes the count unknown. Missing IDs cannot be certified; partial
known IDs are still checked for duplicates before the loader discards them.
NaN positions are unknown, never an omitted defender that lightens the box.
Alignment retains the shared 0.011s tolerance. Early shifted clocks still
fail the shared loader; nonfinite snap times that escape its legacy check
are marked unknown by this wrapper instead of being certified as snap data.

No-arrival and short-live-window plays remain visible; do not select only
runs that cross or backers who were reached. A false touch result can mean
the play ended before a climb had any opportunity. It is not proof of bad
blocking. The ratio is **sum touched backers / sum eligible backers**,
not a mean of per-play fractions or a fraction of runs.

### Terminal-sample and incomplete-horizon repair

`live-window-carrier-clock-reviewed-v4` corrects the published never-arrives
fallback. The original uses `len(xy)-1` as an exclusive stop, accidentally
discarding the last **valid live** sample after clipping. The audited path
uses `len(admitted_xy)` when arrival is unobserved: all real samples from0.3s
through the last sample at/before end are eligible. An observed arrival
sample remains excluded. No position is copied, padded or interpolated to
force this result. The immutable historical source remains available; the
audited proximity predicates are the same, with a runtime check that its
eligible-LB count agrees with the published source.

The same horizon-completeness check applies to generic/NFL and sim inputs.
End3.0 with positions only through1.5 makes touch **unknown** while preserving
the valid snap count. End0.55 with valid samples through0.50 is a complete
10Hz observation window: the next sample would be after the ending. This
does not certify unobserved subframe motion. At this first scope truncation
censors the play's touch measure conservatively rather than reporting a
complete negative from a partial tape. Historical versions remain qualified
by their old admission rules; no receipt is silently retagged.

## Use

```sh
python3 -I scripts/data/run_box_suite.py \
  --nfl /existing/cache/nfl-plays.jsonl.gz --nfl-label 'BDB2025 2022 weeks1-9' \
  --sim /existing/cache/trace-seed7.json /existing/cache/trace-seed9.json \
  --sim-source FULL_40_CHARACTER_ENGINE_COMMIT \
  --sim-settings /existing/cache/exact-settings.json \
  --sim-clusters /existing/cache/parent-clusters.json \
  --out out/box-suite/report.json
```

No download, conversion or new game is necessary when those inputs exist.
Omit sim arguments for an explicitly NFL-only report. Raw data stays outside
Git. The parent-cluster JSON maps each exact sim **input SHA256** to its
parent roster/seed identity, grouping all saved-dice shifts together. Do not
invent independent game IDs from trace ordinals. Missing clusters mean no
sim interval. Source/settings and input hashes accompany the report.

The metadata join reuses the published loaders and verifies initial geometry,
concept and carrier. NFL game/play IDs come from the existing converted raw
record. Duplicate source files/digests and duplicate NFL game/play IDs fail.
Repeated sim logical IDs can be legitimate shifted executions: retain and
flag them as execution-unverified, rather than silently dropping or calling
them independent. Input hash plus filtered-run ordinal identifies a row.
Explicit duplicate player IDs and invalid rosters/positions become unknown,
not smaller counts; without IDs, loader indices are not an independent
identity audit. The verified NFL converter constructs tracks by unique ID.

The report keeps unstratified results, all four surplus strata, concept /
listed-personnel / carrier-group strata, exact B,D strata and original raw
counts. It exposes unknowns/exclusions, raw backer denominators and common
support by exact counts and full listed-position composition. Source
formations remain **unmatched**, not quietly equated by naming. Sparse and
missing cells are retained, never replaced after seeing an outcome.

Percentile bootstrap intervals resample complete NFL games or declared sim
parent-seed clusters (400 draws, seed20221009). They recompute pooled ratios;
they do not treat all OL, backers or RNG shifts as independent observations.
Fewer than two clusters or missing identities means no interval. Fewer than
ten is flagged as fragile. Zero-backer draws make the touch interval
unavailable, not silently discarded. Intervals exclude unmeasured definition
error, new seasons/rosters and coaching intent.

## Football interpretation and remaining mismatch

### Snapshot integrity review, applied symmetrically

`--snap-reviews` accepts a `box-snap-reviews-v1` JSON with `reviews` records:
`input_sha256`, `filtered_run_ordinal`, optional verifying `play_id`, `status`
(`confirmed_invalid`, `valid`, `pending`), `reason`, and `evidence_sha256` for
confirmed/valid decisions. The evidence pin must be independently checked;
formatted metadata is not proof of a sound finding. Wrong input hashes,
conflicting/duplicate row identities, play-ID mismatches and unobserved
review rows fail instead of silently applying a different exclusion set.
Raw review/evidence packets stay outside Git.

The policy is identical for NFL and sim:

- Independently demonstrated invalid time/coordinate/reference anchor makes
  count and related touch **unknown**. Keep the row in all-input accounting,
  omit it from valid-count means/shares, and retain untrusted original counts
  only in a labelled diagnostic field. Do not turn it into a light box or
  impute zero backers. This matters to box incidence even if its old backer
  denominator was zero.
- Internally coherent extreme alignments remain valid. Box surplus, rushing
  gain or a surprising football ending is not an integrity criterion. Do not
  automatically reconstruct a new LOS from the OL just to obtain a useful
  result; a source repair needs an independently trusted reference.
- Screening hits are not confirmed corruption. Pending hits remain flagged
  in the provisional primary rows; a separate pending-excluded sensitivity
  is exported. Neither is a finalized comparison until the nominated screen
  set has been reviewed. No threshold is chosen to improve NFL/sim agreement.

Version `live-window-carrier-clock-reviewed-v3` preserves prior v1/v2 results.
The audit is source-qualified, not an ID-specific football exception. The
absence of a review is not proof of integrity or a self-awarded readiness
decision. Tools' nominated23-hit review has now been received with one case
still pending. See the [source-qualified handoff and remaining sim dependency](run-box-suite-handoff.md).
It replaces the earlier missing-list blocker, not the comparative hold.

If sim has more defense+1/+2 boxes, part of an aggregate access gap can come
from the calls it chooses to run. Recompare within concept, listed personnel,
carrier group and exact B,D before attributing that difference to blocking.
Keep the original unstratified distribution beside it: fielding a different
mix is itself a football finding, not something to force into an NFL target.

Even identical numerical boxes do not equate front leverage, coverage,
formation geometry, player quality, down/distance, motion, call/check policy
or information. NFL runs are selected by real game situations and checkouts;
run-only sim films and fixed catalogs are selected differently. NFL QB runs
and failed sim exchanges have different loader admission. The shared mapping
pools sim Duo/split zone into IZ and WZ/toss into OZ; primary NFL labels do
not certify exact scheme identity. Equal-box stratification reduces one
composition confound; it does not establish a causal OL defect or a corrected
football engine. The preliminary .88/.72 requires its exact source receipt,
window, denominator and uncertainty before independent endorsement.

That sim figure and production adoption remain **held** until the exact
producing tape, source, settings, overlay and parent-seed provenance have
been independently checked. Synthetic controls do not close that dependency
or authorize resuming the held blocking diagnosis.
