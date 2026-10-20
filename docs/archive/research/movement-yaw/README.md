# Frozen movement-yaw reproductions

These are the actual executed diagnostic sources and generated native inputs,
preserved without rewriting their output paths or relabeling source revisions.
They are not production dependencies or an automatically executed test panel.
The [report](../../../reviews/loaded-movement.md) retains the failed cost budget.

To repeat the clean native benchmark from the candidate's repository root:

```sh
mkdir -p out/loaded-movement/yaw-archive out/loaded-movement/yaw-native
git archive 2c98bed94adad8087c65f381d4090444ad283985 src | tar -x -C out/loaded-movement/yaw-archive
cp docs/archive/research/movement-yaw/yaw-native-cost-repeat.ts out/loaded-movement/
cp docs/archive/research/movement-yaw/*-input.json.gz out/loaded-movement/yaw-native/
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 --receipt out/loaded-movement/cost-replay.json -- node --import tsx out/loaded-movement/yaw-native-cost-repeat.ts
```

Use Node22.23.3 and an otherwise idle machine. This repeats existing inputs,
not new football coverage. The benchmark declares immutable comparison pins;
if code changes, record a new source/pin rather than claiming this old receipt.
Raw round timings are written under `out/`; the compact receipt preserves the
published summaries and hashes. Typical cost passes, Toss paired p95 fails.

The direct old-versus-fast yaw reference needs the accepted yaw source in that
same archive; that file is identical to the unoptimized2637558 candidate's.
Copy `yaw-fastpath-review.ts` into `out/loaded-movement/` before running it.
The executable tests in `test/yaw-response.test.ts` independently check free
analytic flow, constrained events, partitions, external spin and interior peaks.

Full original native capture/operator/NFL provenance is the immutable
[#162 packet](https://github.com/tannerthardy/football-simulation-/tree/ed6ebd21911a28f07a085094c393ea2613abeb69/data/reviews/movement-continuity).
No NFL trajectories or tracking archive are duplicated here.
