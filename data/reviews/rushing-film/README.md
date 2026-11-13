# Native rushing film review

[Download the offline pack](../../../viewer/rushing-benchmark-review.zip), unzip
it, and open `rushing-review.html`. The pack also contains `all-runs.html` and
the [review guide](../../../docs/reviews/rushing-film-review-guide.md).
The standalone [guided viewer](../../../viewer/rushing-benchmark-review.html)
contains the same 24 selected clips.

The reel uses production source
`8f8cf4b49052fae4dac2d7858b42aa6ddcd9bdd13fa3e541c5c41f03e344b15d`,
the exact eight-game benchmark and its native log indices. All 24 selections
belong to the strict-clean 302-run cohort. The full library includes every one
of those 302 runs, with its original contexts and outcomes. These are simulated
plays, not NFL video or controlled causal pairs.

The four review sets cover ordinary runs, Counter/Trap/Draw, short yardage and
goal-line play, and extreme gains. `selection.json` contains the exact choices,
review questions and recorded event markers. The guide recommends six starting
plays. Every clip can also be grouped by actual concept, front, coverage,
formation or game and searched by benchmark ID. Copying a reference preserves
the source, ID, actual snap seed, situation and selected time.

Positions, facing, ball and native events come directly from the saved light
recordings. The exporter reuses existing tenth-yard display packing and retains
the original frame times and native settled outcome. It runs no simulation and
adds no observations, controllers, forces or fabricated mental state. Role
colors stay consistent across all eight games; the actual clubs and score appear
in each play's native context. Missing assignment/intent/perception/force channels
remain unavailable. Recorded facing is not measured eyes.

## Reproduce

If the source-pinned full game files already exist, skip the collector. Otherwise
generate them using the existing benchmark collector from this exact source.
Raw game files stay ignored; the downloadable pack already includes all film.

```bash
npx tsx data/reviews/rushing-benchmark/tools/collect-recording-games.ts \
  . out/rushing-film/games \
  8f8cf4b49052fae4dac2d7858b42aa6ddcd9bdd13fa3e541c5c41f03e344b15d
npx tsx scripts/export-rushing-benchmark-film.ts \
  out/rushing-film/games \
  data/reviews/rushing-benchmark/validation/recording-games-index.json.gz \
  data/reviews/rushing-benchmark/engine/productionRecording8f8cf-engine-benchmark.json.gz \
  data/reviews/rushing-film/selection.json \
  out/rushing-film/room
```

The exporter verifies the benchmark/index byte relationship, complete selected
metadata, native log outcomes, all 22 players and all frames before packing.
Collection wall times and receipt paths may differ; the source-pinned simulation
and saved replay content must agree. IDs deliberately match the benchmark's
native log index, overriding the generic exporter's extra one.

## Validate

```bash
npm run typecheck
python3 scripts/check-replay-viewer.py out/rushing-film/room/rushing-review.html \
  --video-out out/rushing-film/export-check.webm
python3 data/reviews/rushing-film/tools/check-offline-film.py \
  out/rushing-film/room/rushing-review.html out/rushing-film/room/all-runs.html \
  --receipt out/rushing-film/offline-check.json
```

Browser checks cover all guided clips, grouping/filtering, transport, exact
references, events, player inspection, mobile layout, failure/cancellation paths
and an actually downloaded, decoded WebM. Both standalone documents were also
checked with external requests blocked. This cloud's managed Chromium blocks
file URLs, so its standalone check used `--document-content`, loading the same
embedded HTML directly without changing browser policy. That method and both
24/302 clip counts are explicit in `offline-check.json`.

`export-receipt.json` preserves original execution paths and all consumed file
hashes. `artifact-manifest.json` pins the published viewer, ZIP, guide, selection,
exporter and checks. These film checks leave the engine and physical model
unchanged; the preceding benchmark's full suite remains historical evidence.
