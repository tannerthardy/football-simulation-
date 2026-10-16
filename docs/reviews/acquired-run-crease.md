# Acquired run-entry routes: corrected successor to the Claude zone review

Recommend independent review for adoption of this **runner-only extraction**.
A nearby teammate no longer grants a defender an invented retention delay;
an entry occupied by that defender is not a clear route. The runner reads the
bodies on both teams and the path to an entry, including a possible cutback
behind the line, on his existing decision beat. Speed, contact and blocking
controllers remain ordinary. This is a new proposed controller behavior, not
approval of the original experimental bundle or an NFL calibration result.

Claude's useful contribution is a two-dimensional approach read rather than
an opening inferred only from the lateral spacing of offensive linemen. The
original #109 hold, its adverse evidence and author branch remain preserved.
This successor removes the demonstrated false-protection inference, includes
segment endpoints and retains visibly fallen defenders in future threat
assessment instead of permanently discarding them. It also holds a null press
read through its deadline rather than rescanning every tick.

## Exact extraction and settings

- Base: accepted `c3264b0bad72bd2c208602e0ecf0461c00d9669f` (#107), checked
  against published queue `625f3b4f545cf0c7f414b672e3776f916928f158`.
- Tested patch: **`d157356379ec387a8548e95775d8377e317b7e89`** on
  `codex/acquired-run-crease`; engine source
  **`811cd00e20ea564a12d446f5d79bf280386c5c07774d32015c8ec7b43a95d4d7`**.
- Source origin: Claude `50f6a080eacb8bf5d12fec8c9af53550ee8b4a96`.
  Extracted entry/approach reader only, corrected as above. No experimental
  ancestry, `blocking.ts`, open-field evaluator change, five-flag profile or
  `CF_FLOW="None"` imported. The proposed entry reader is ordinary behavior;
  no RUN_LANE activation is needed. Its adoption requires independent review.
- Node **22.23.3**, all **44 accepted flags**, components=1, CF_FLOW **unset**;
  World defaults, capacities, rosters, assignments and teammate spacing unchanged.
- [Exact input manifest](../../data/reviews/current/acquired-run-crease/input-manifest.json),
  [source/validation/settings/cost receipts](../../data/reviews/current/acquired-run-crease/source-manifest.json),
  [extracted requests, poses, loads and adverse results](../../data/reviews/current/acquired-run-crease/summary.json).
  Full detailed tapes stay in ignored `out/acquired-crease/`; the portable
  collectors below regenerate them. No film was generated.

## What the evidence establishes

The exact mirrored #109 witness runs through `BallCarrier.update`: a receiver
.10 yd clear of the defender, beyond him and moving away, previously changed an
occupied entry's risk to zero and requested a straight full-speed collision.
Now the entry's risk is **12.06166** with or without that receiver; both commands
agree and avoid that entry. There is no private engagement check or mandatory
compression requirement. The valid protected-side and open-gap controls still
pass; the fix does not categorically forbid running toward a defender.

The three prior native baselines were reused from the immutable #109 report.
All 22 players react normally. Candidate changes start with RB execution at
1.65 s strong, 1.60 s weak and 1.50 s Duo; there is no earlier OL/DL change.

| Saved situation | Accepted baseline | Corrected reader | Interpretation |
| --- | --- | --- | --- |
| Ace12 WZ strong / Over3 | DE_S first contact 2.30 s, −1.19 yd; tackle −.67 yd | DE_S 2.30 s, −.97 yd; tackle +.39 yd | End still earns access. No rescue by force or forced protection. |
| Ace12 WZ weak / Over3 | DE_W 2.70 s, −.48 yd; tackle −.03 yd | LB_M 2.85 s, +1.57 yd; tackle +4.96 yd | Changed route buys actual entry access. Finishing gain includes changed contact/draws. |
| Saved Ace11 Duo useful climb | RT/Mike load 1.85–3.50 s; SS contact 3.45 s at +5.06 yd | RT/Mike load 1.85–3.50 s; SS contact 3.25 s at +4.75 yd | Useful climb retained; safety arrives .20 s earlier. Explicit 3.50 s censor in both, no terminal-gain claim. |

There are zero positive teammate impacts in these three candidate continuations.
The Duo runner progresses more quickly through 2–3 s and takes a different
route; SS first changes at1.75 s, after the runner. This is an adverse route/
arrival change, not the CLIMB_EXIT failure: RT continues loading Mike and the
runner's first contact is still the safety. No old ending is required.

One fresh transfer was declared before execution: **Ace12 IZ strong / Under3,
pair11, seed71001**. Baseline first read selects y30.9208, away from its live
preference y24.72; the candidate selects a nearer available entry y23.67.
RB first executes differently at1.85 s. First contact changes from LB_W at
2.65 s/+0.52 yd to DT_S at2.95 s/+2.42 yd. **Final gain decreases 4.35→3.67 yd.**
That downside is retained. The existing RT/RG impact at1.25 s is identical;
subsequent baseline RG/RB impacts are absent in the candidate. C/DT_S remains
loaded to2.95 s and DT_S still gets access, illustrating why load is not a
promise of lane protection. New contacts and finishing draws differ; this is
not a matched-execution estimate of post-contact ability or a proven unlawful
DT win. No case was replaced after seeing its result.

## Focused correctness and cost

**65 focused assertions across eight files and typecheck pass** at the exact
patch/source above. These cover actual carrier-hook incidental-contact and
hidden-state invariance, mirrored occupied entries, valid protected side,
clear approach, cutback, press cadence, visible recovery, existing boundary
recovery, Duo read, useful climb and run-system contracts.

One old assertion pinned the previous scorer's exact y in a saved waiting
control. Its .125 yd shift remains in the same clear corridor. The replacement
checks the acquired straight-route clearance for both old and new choices;
it does not accept a changed coordinate by itself as improvement. Original
failure and two new-test setup failures are retained in the receipts, with
causes. The final source/validation hashes agree between focused/type checks.

New spend: **42.03 command-seconds**, including failed/setup checks and both
local typechecks. Standalone collectors: **3.22 command-seconds**, five native
continuations (three candidate controls plus one fresh paired comparison).
Three baseline continuations are cached; no games, broad panel or full suite.
Focused tests include their existing bounded native assertions. Integration
owns one exact combined full verification after independent review.

```sh
# Node22.23.3; existing 44-flag profile. No experiment overrides.
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/acquired-crease/decisions.ts out/acquired-crease/decisions.json
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/acquired-crease/native.ts out/acquired-crease/native.json.gz
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/acquired-crease/native.ts out/acquired-crease/transfer.json.gz --transfer
```

The first native three and fresh pair were collected before committing the
patch: receipts truthfully record parent c3264b0 plus the modified engine hash
811cd00. That source is byte-identical to tested patch d157356. Final focused
and typecheck receipts record d157356 and exact validation hash441f93f8. No
runtime was altered to publish the evidence.

## Adoption limits and next decision

Recommend this acquisition/entry-route correction for independent review,
with the two adverse comparisons visible. It is not a promise of the same
football endings or an endorsement of Claude's unpublished aggregate gains.
The local sample is four situations; the historical 4ded6b6 law comparison is
unchanged and is not current-production evidence.

Arrival forecasts remain approximate: existing `timeToReach` includes current
velocity/redirect costs, but the dogleg's second leg uses a coarse cruise
estimate. Static perceived body clearance does not guarantee that a gap will
stay open. There is no added future hold duration; this conservative reader
can undervalue a genuinely sustained block. General carrier evaluation and
lead/kick information policies are outside this extraction, as are shared
contact-law realism limits. They are not newly certified by these checks.

Keep **CLIMB_EXIT held and separate**: #109's useful RT/Mike loss and tangent
read-cadence concern are not repaired here. Do not combine it merely because
runner-only native results are promising. Integration should review this exact
runner patch, then verify its accepted combined tree once. Broader run-suite
measurement belongs at that integration checkpoint, not before every edit.
