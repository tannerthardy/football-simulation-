# Reproduce the initial stretch-combination correction

Use a clean disposable checkout, Node 22.23.3 and the committed lockfile.
Do not overwrite another owner's uncommitted work. The candidate branch is
`codex/zone-combo-surface`; runtime/tests after reconciling accepted develop are
`78a2574557d957d81a1c2bd255aff13420aad8fa`.

Production extraction is only the two-file [promotion.patch](../promotion.patch).
It applies to accepted `70b4db6a3ef53acc1a0e90cd055f1087205daa30` without
importing diagnostic parents. The accepted build already contains #117 and #122.
No feature flag or World setting changes accompany this patch.

The manifest records all 44 resolved flags and World defaults. The existing
launcher supplies those settings and records the actual runtime source and
validation hashes, including dirty changes. It requires Node 22.23.3.

On the candidate checkout:

```sh
node scripts/baseline.mjs --candidate --info
node scripts/baseline.mjs --candidate --receipt out/combo-surface/checks.json -- npx vitest run --project core test/zone-combo-surface.test.ts test/helper-fit.test.ts test/combo-attention.test.ts test/stretch-anchor-footwork.test.ts test/stretch-normal-follow.test.ts
node scripts/baseline.mjs --candidate --receipt out/combo-surface/types.json -- npm run typecheck
node scripts/baseline.mjs --candidate --receipt out/combo-surface/native-receipt.json -- node --import tsx scripts/diag/box-defense-review/protection.ts out/combo-surface/native.json.gz
node scripts/baseline.mjs --candidate --receipt out/combo-surface/fresh-receipt.json -- node --import tsx scripts/diag/box-defense-review/runner-motion.ts out/combo-surface/fresh.json.gz --concept=oz --direction=weak --until=20
```

Expected candidate runtime SHA256:
`4dbe2201f31fc0b114c8aa9f35705fb4fce7350503e97d0770b4a737b5dd97a4`.
The collectors retain all 22 players, fresh ordinary observer histories and normal
controller reactions. `protection.ts` completes the three Ace runs and explicitly
censors the useful Duo opposing control at 3.50s. The fresh collector completes
weak OZ. Commands fail on wall/error budgets; inspect terminal/error fields and
do not interpret an unfinished prefix as a finish.

For a baseline comparison in that disposable checkout, reverse only the patch's
`blocking.ts` hunk, leaving diagnostic tooling and tests available. Verify source
`9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941`
before collecting the identical inputs. The new contract tests are expected to
fail against the old controller. Restore the candidate hunk afterward.

The original diagnostic runtime was `45106c1`; source/provenance for its isolated
and #117/#122 compositions is preserved separately in the manifest and report.
Do not substitute those hashes for the current candidate. Historical `4ded6b6`
remains a law-comparison reference, not the current production baseline.

`traffic.ts.txt` and `edge-execution.ts.txt` archive exact diagnostic source.
They originally ran from `out/zone-combo-surface/` and expect the relative files
named in their code. Only native passive edge capture was run: no optional
variate-exchange continuation was performed. The manifest contains both captured
physical states, actual miss draws and the strong RB's acquired traffic witness,
so their inference does not require recovering ignored output files.

The small committed plot data regenerates the chart independently of native
traces: `python docs/reviews/zone-combo-surface/plot.py`. The chart's historical
source qualification must remain. Integration owns any final full suite; these
commands are reproducibility instructions, not a request to rerun unchanged work.
