These are the exact scripts that produced the saved receipts, archived without
changing their paths or measurements. They execute from `out/weak-departure`,
where their relative imports and self-hashes were recorded. They do not belong
to production code. Native scripts use the pinned `inputs.ts` factory; the
separate frozen setup records the same 22 players and initial physical state.

For an explicit reproduction in a clean checkout of this research publication
(accepted runtime, source `bed3c36`), stage the scripts as below. Never replace
another investigator's existing output. The identity projection contains only
the fields checked by the passive baseline guard; it is not a full contact tape.

```sh
mkdir -p out/weak-departure out/stretch-access
cp docs/reviews/weak-zone-departure/reproduce/*.ts out/weak-departure/
test ! -e out/stretch-access/final-interaction.json.gz
cp data/reviews/current/weak-zone-departure/accepted-identity.json.gz out/stretch-access/final-interaction.json.gz
npm run baseline:run -- --candidate --receipt out/weak-departure/baseline-receipt.json -- node --import tsx out/weak-departure/through-exit.ts baseline out/weak-departure/baseline.json.gz
```

Run one named alternative only when its result could change a decision. The
same-waypoint diagnostic changes LG's requested velocity in its wrapper;
the engine source stays accepted. It is rejected, not a production proposal.

```sh
npm run baseline:run -- --candidate --receipt out/weak-departure/through-receipt.json -- node --import tsx out/weak-departure/through-exit.ts through out/weak-departure/through.json.gz
```

The second diagnostic is preserved in commit `9099d19` and in the adjacent
`forecast-diagnostic.patch`. Apply that patch only to the clean accepted runtime
to recreate source `c639a7e`. It is withdrawn from this publication's runtime.
No other candidate is required or intended.

```sh
git apply docs/reviews/weak-zone-departure/forecast-diagnostic.patch
npm run baseline:run -- --candidate --receipt out/weak-departure/forecast-receipt.json -- node --import tsx out/weak-departure/forecast-exit.ts forecast out/weak-departure/forecast.json.gz
```

`modifier.ts` passively checks that forecast continuation, `traffic-check.ts`
reads the modifier output without simulating a play, and `opening.ts` requires
the accepted runtime again. The frozen setup export advances zero ticks.
These are optional reproduction commands, not instructions to rerun completed
experiments. Original full native outputs remain in ignored `out/` with their
hashes in the manifest; the published small traces and identity projection are
qualified reductions for inspection, not substitutes for resumable World and
observer state.
