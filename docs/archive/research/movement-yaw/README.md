# Frozen movement-yaw reproductions

These are the actual executed diagnostic sources and generated native inputs,
preserved without rewriting their output paths or relabeling source revisions.
They are not production dependencies or an automatically executed test panel.
The [report](../../../reviews/loaded-movement.md) retains the old failed cost
budget and the final passing correction. These are optional reproductions for
a named review question, not a request to repeat compatible evidence.

## Ready candidate: frozen f96a85f runtime

To repeat the final clean native benchmark from the candidate's repository root:

```sh
mkdir -p out/yaw-readiness/accepted out/loaded-movement/yaw-native
git archive 2c98bed94adad8087c65f381d4090444ad283985 src | tar -x -C out/yaw-readiness/accepted
cp docs/archive/research/movement-yaw/native-cost-final.ts out/yaw-readiness/
cp docs/archive/research/movement-yaw/*-input.json.gz out/loaded-movement/yaw-native/
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 --receipt out/yaw-readiness/native-cost-replay.json -- node --import tsx out/yaw-readiness/native-cost-final.ts
```

Use Node22.23.3 and an otherwise idle machine. The source digest guards enforce
the exact accepted/final engines; no source hashing or copying is inside timing.
The preserved receipt passes both unchanged per-input wall gates. Its p95/max
are repeated 60-tick batch averages, not individual-tick or all-input bounds.
Supplemental Toss CPU tails worsen; this does not replace the wall gate.

The independent final numerical review can be repeated without native plays:

```sh
mkdir -p out/yaw-readiness/held out/loaded-movement
git archive aadac6d8b78bd452ff3bb92b337e027bec4a0d25 src | tar -x -C out/yaw-readiness/held
cp docs/archive/research/movement-yaw/numeric-review.ts out/yaw-readiness/
cp docs/archive/research/movement-yaw/numeric-seed-cases.json out/loaded-movement/yaw-fastpath-reference-evidence.json
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 --receipt out/yaw-readiness/numeric-replay.json -- node --import tsx out/yaw-readiness/numeric-review.ts
```

The seed fixture contains only the existing 24 specs/mirrors; it contains no
candidate answers. The executed script adds deterministic boundary/random
cases and compares all 1,024 against the frozen held function. This is exact
regression parity, not an independent physical oracle. The ordinary executable
yaw tests retain the independent analytic/constrained mechanical checks.

The passive native recorder and exact comparator are also preserved. If a
review requires reproducing the 94-tick parity, prepare the held archive above
and `out/yaw-readiness/original` using `git archive 2637558c5024b84dc23f7de10cffc3058b2dab41 src`.
Copy `capture-current.mjs` to `out/loaded-movement/yaw-native/` and run it with
`node --import tsx .../capture-current.mjs run out/loaded-movement/yaw-native/toss-input.json.gz OUTPUT 6`
through the same baseline launcher. `YAW_AUDIT_HOST` selects the archive root:

| Engine | Host | OUTPUT |
| --- | --- | --- |
| Held exact flow | `out/yaw-readiness/held` | `out/loaded-movement/yaw-native/native/current-fast` |
| Original motor | `out/yaw-readiness/original` | `out/loaded-movement/yaw-native/native/current-candidate` |
| Final candidate | repository root | `out/yaw-readiness/native-final` |

Use the final launch receipt path `out/yaw-readiness/native-parity-launch.json`.
Copy `compare-final-native-parity.py` to `out/yaw-readiness/` and execute it with
Python3 from the repository root. Only `source` and `elapsedSeconds` are excluded;
all body/request/perception/RNG/contact/event/result fields compare exactly.
The source pins in filenames/scripts describe the original executed evidence,
not a new full-game coverage claim.

## Previous held benchmark: aadac6d runtime only

The earlier benchmark below requires the historical held candidate's runtime,
not the revised source. Its failure remains in the immutable prior receipt:

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
published summaries and hashes. Typical cost passes, Toss paired p95 fails at
that old source.

The direct old-versus-fast yaw reference needs the accepted yaw source in that
same archive; that file is identical to the unoptimized2637558 candidate's.
Copy `yaw-fastpath-review.ts` into `out/loaded-movement/` before running it.
The executable tests in `test/yaw-response.test.ts` independently check free
analytic flow, constrained events, partitions, external spin and interior peaks.

Full original native capture/operator/NFL provenance is the immutable
[#162 packet](https://github.com/tannerthardy/football-simulation-/tree/ed6ebd21911a28f07a085094c393ea2613abeb69/data/reviews/movement-continuity).
No NFL trajectories or tracking archive are duplicated here.
