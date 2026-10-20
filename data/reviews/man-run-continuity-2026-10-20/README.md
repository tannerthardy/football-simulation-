# Acquired blocking-support continuity evidence

This is a data-only publication. It does not change the engine or accepted
baseline. Runtime `11ef1703a59b1ab13bbebf2eeb51ed7a8eba8e05`, tests
`0dca4f09ec876a65949242221ad712f493ec51bf`, accepted base
`2c98bed94adad8087c65f381d4090444ad283985`.

`manifest.json` binds full source/input/tape/archive/member hashes, settings,
cost and final results. Every archive member was read back and checked against
its original bytes. The runtime/source projection is in `source-proof.json`
inside common.tar.gz; runtime.patch changes only four source files.

- final-native.tar.gz: seven final-source terminal tapes, including the five
  files completed before the aggregate recording failure and the passing tail.
- developmental-native.tar.gz: all saved predecessor tapes, qualified by their
  actual source. They are not final results.
- fresh-baseline.tar.gz: only the one newly needed accepted-source baseline.
- common.tar.gz: exact inputs, collectors, pure reducers, source/contract patches,
  all passing/failed launch and focused receipts, independent review, football
  interpretation and the broader intelligence note.
- purpose-continuity.png: actual requests and achieved movement, with adverse
  OZ4 ending and random-stream boundaries shown.

Six unchanged baselines are reused, not duplicated: fetch data-only commit
`32977c642075c94f1b4ea7f1f6bb5aacc6161385`, path
`data/reviews/db-stalk-workoff-2026-10-20/baseline.tar.gz`.
Verify its published manifest first (SHA256
`53f30c6429a29e75bb0957ddca10d3808922a044e7feca77551694bb35d94a3b`).

Restore these four archives into `out/man-run-continuity`, and the older
baseline archive into `out/db-stalk-workoff`. Then this command reduces saved
data only, without queries, randomness or simulations:

```sh
python out/man-run-continuity/summarize.py \
  --baseline out/db-stalk-workoff \
  --fresh-baseline out/man-run-continuity/fresh-baseline
```

To reproduce native evidence, use Node22.23.3 and the chosen runtime patch in a
separate accepted-base checkout. Restore common.tar.gz into the same out path:

```sh
git apply out/man-run-continuity/runtime.patch
node scripts/baseline.mjs --candidate --receipt out/reproduction-launch.json -- \
  node --import tsx out/man-run-continuity/capture-rules.mjs run \
  out/man-run-continuity/seven-inputs.json.gz out/reproduction 8
```

This is a reproduction recipe, not an instruction to repeat finished evidence.
The corrected collector passively copies cached rule metadata. Original
reader-native-launch.json failed while serializing PA13; it remains failed.
completion-ledger.json separately proves seven completed final cases. Repeated
recording never creates extra sightings, controller updates or random draws.

129 distinct final-source focused checks and typecheck pass. 22 native attempts,
21 saved terminal cases over all stages; six compatible baselines reused. All44
settings unchanged, components1, GAIT_STEP0 and CF_FLOW unset. No games, full
suite, NFL download/query or experimental flag activation. Integration owns
exact combined verification. See the candidate report for the adverse result
and remaining physical escape/approach limitations.
