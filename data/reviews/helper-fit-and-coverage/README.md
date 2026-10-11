# Helper feet and curl-flat responsibility evidence

Read [the review](../../../docs/reviews/helper-fit-and-flat-responsibility.md)
for the recommendation, causal traces, adverse cases and next work. Download
[the offline film](../../../viewer/helper-fit-and-coverage.zip), unzip, and open
`helper-fit-and-coverage.html`. It contains all 20 clips from the original ten
paired inputs, full player cards, inspection layers and WebM export. The
separately selected Power follow-up is retained here rather than mixed into
that original film cohort.

## Sources and populations

- Parent commit: `bf8a487794bf76505262a260572f2882f5190049`, branch
  `claude/engine-priorities`.
- Parent engine: `c2b65e9f02a95a80dde97625d6e2dd1bdf89da327eb15f2eb093860af08e1ff8`.
- Final engine: `601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b`.
- Shared World: `4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`, unchanged.
- Node `v22.23.3`; dependencies from the repository lockfile. Engine hash is
  SHA-256 of sorted relative `src/` paths, each followed by NUL, file bytes,
  and NUL, as implemented by `scripts/source-version.ts`.

Only `src/sim/engagement.ts` and `src/sim/behaviors/defense.ts` change in the
engine. No capability, strength, traction, grip/work budget or physics
resolution is changed. Each raw collector records its own byte hash and
checks its imported source before and after collection. `sourceBefore` and
`sourceAfter` in an individual packet mean that collection's source stability,
not a baseline/candidate pair.

The four original helper inputs are Draw and Inside Zone, both directions,
Gun Doubles, Over/Cover 3, generated rosters 31/32 at strength .55, play seed 3.
The six coverage inputs are the retained roster 41/42 Curl Flat against
Cover 2 and Cover 3 and PA Post-Dig against Cover 3, each direction, seed 3.
They were selected from existing parent failures and include the ordinary
mirrors. These are diagnosis cohorts, not NFL population estimates.

The Power/Over/left case was selected after the fixed broad panel showed
improved helper contact. Its right mirror was declared alongside it before
native collection. Both use Ace 11, rosters 31/32, strength .55 and seed 3.
They are explicitly supplemental, not independent evidence of prevalence.

## Packet map

| Path | Contents |
| --- | --- |
| `native/` | Four original and two supplemental helper inputs, complete native traces, initial states, actual hand-channel impulses, ordinary-run/RNG controls, analyses and receipts. |
| `coverage/` | All six native passing tails before/final, consumed pictures, initial states, intentions, actual movement/contact and component isolation. |
| `runs/`, `passing/` | Final-source fixed 160 ordinary runs plus two separate old recovery witnesses; 96 passing inputs. |
| `comparisons/` | Saved-only broad comparisons and proof that final-source recollections retain every earlier prototype row. |
| `audit/` | Saved early-contact/NFL-reference audit, native timelines and helper-load screen. |
| `experiments/` | Rejected visual-only prototype, component source files, comparisons and explicit source phases. |
| `games/`, `cost/` | Eight-game outcome guard and two-game runtime guard, with sources and caveats. |
| `checks/` | Clean final tests/build/typecheck, baseline-negative feature tests and retained failed/interrupted exploratory checks. |
| `film/` | Export/input checksums, 38 browser checks, screenshots and a real decoded WebM export. |
| `tools/` | Exact collector/analysis/browser bytes; some retain their original path contracts described below. |

Broad parent reports are reused without relabelling from
[`../run-fit-and-recovery/`](../run-fit-and-recovery/README.md):
`runs/final.json.gz`, `passing/final.json.gz`, `games/final8.log.gz`, and
`cost/final.json`. Their hashes and populations are recorded in this packet's
receipts and manifest. Generated balanced panels are not naturally sampled
NFL concepts, coverages or rosters.

## What improved and what did not

The selected Power helper acquires actual useful hand load earlier and
delivers more signed impulse before 1.50 s; gain .68→3.07 yd. Its mirror
stays 2.08 yd. The original Draw/left improves −.23→2.79 yd but still fails
to deliver helper force before the owner's block is lost. Do not call that
a won double team. The two original Inside Zone gains worsen.

The isolated curl-flat repair changes one 70-yard touchdown to a 13.95-yard
physical tackle. Four coverage controls are exact; the mirrored Cover 3
execution changes and its interception return increases. Cover 2 Curl Flat
and PA Post-Dig still have unresolved 70-yard tails.

The ordinary run panel has 22 higher/17 lower/121 equal gains, mean
2.534→2.617 yd, unchanged 28 stuffs, and OL falls 6→7. The adverse Power stuff
and Wide Zone fall are retained. In 96 pass calls, 92 gains stay equal and
four decline; attempts, completions, sacks and interceptions are unchanged.
Clean-completion YAC falls 9.385→8.310 yd, mostly from the one repaired tail.

The eight-game guard **worsens**: points/team 46.50→51.13, YPC 5.94→7.83,
YAC 10.55→10.91, missed/broken tackles .31→.34 per play. Subsequent calls,
random draws and snap populations diverge. The local causal repairs do not
establish overall football calibration. CPU cost is about 8.2% higher in
the coarse two-game guard, including changed contact/play duration and
timing noise. No speed improvement or universal physics readiness is claimed.

Force units are kg·yd/s²; impulse kg·yd/s; work kg·yd²/s². Convert force and
impulse to SI with .9144, work with .9144². Hand impulses are achieved signed
corrections from the existing `World.pairImpulse`, not force inferred from
replay geometry. Helper receipts check shared arm impulse/work limits, work
residual and the absolute 1.1 mg dt ground envelope; that envelope alone
does not certify every instantaneous support-reduced traction bound.

## Reproduction

Commands below run from the repository root with Node 22 and installed
dependencies. Write regenerated outputs under `out/`, preserving published
evidence. Freeze/check source before any new run. A baseline archive can be
made with `git archive bf8a487 src scripts package.json tsconfig.json` into an
empty directory and a symlink to this checkout's `node_modules`. A final
archive uses the commit containing this packet. The private repository's
commit retains complete source; the packet need not duplicate it.

The original collection used `out/run-fit-follow-up/final-source` for the
parent and `out/helper-fit/promoted-source` for the final engine. Set
`physics_source_root` to an absolute frozen source path and
`physics_source_sha` to its engine hash. These names are shell variables;
the helper collectors dynamically import that archive and reject a mismatch.

```sh
node --import tsx data/reviews/helper-fit-and-coverage/tools/helper-surface-review.ts \
  "$physics_source_root" "$physics_source_sha" out/helper-regenerated.json.gz
node --import tsx data/reviews/helper-fit-and-coverage/tools/power-helper-surface-review.ts \
  "$physics_source_root" "$physics_source_sha" out/power-regenerated.json.gz
```

Broad collectors must be run **from the frozen archive root**, where
`scripts/diag/combo-transfer-review.ts` and `scripts/diag/decision-awareness.ts`
keep their original relative imports and hashing convention:

```sh
node --import tsx scripts/diag/combo-transfer-review.ts /tmp/runs-regenerated.json.gz
node --import tsx scripts/diag/decision-awareness.ts /tmp/passing-regenerated.json.gz
node --import tsx scripts/calibrate.ts 8 7 2
node --import tsx scripts/diag/physics-cost.ts /tmp/cost-regenerated.json 2 9
```

The exact native coverage collector retains a workspace-specific reference
and self-hash path: `/workspace/football-simulation-/data/reviews/run-fit-and-recovery/passing/final.json.gz`
and `/workspace/football-simulation-/out/helper-fit/defense/native-tail-panel.ts`.
Copy `tools/native-tail-panel.ts` to that original tool path, retain the
reference file, then run the tool from the declared frozen archive cwd with
arguments `ABSOLUTE_ARCHIVE SOURCE_SHA OUTPUT.json.gz`. On another checkout
path, adapt those two paths explicitly and record the changed collector hash;
do not claim byte identity to the original tool.

The defense-only component has identical complete rows to the final coverage
packet, verified before publication. Restore it without a second 11 MB copy:

```sh
node data/reviews/helper-fit-and-coverage/tools/restore-component.mjs \
  data/reviews/helper-fit-and-coverage/coverage/final.json.gz \
  data/reviews/helper-fit-and-coverage/coverage/component-shared-rows.json \
  out/coverage-component.json.gz
```

The restorer guards payload/source/collector hashes and original decoded
bytes. Exact compressed bytes are separately checked because zlib versions
can differ. Reproduce its source from the parent with only
`experiments/coverage-component-defense.ts` replacing `src/sim/behaviors/defense.ts`.
That isolated prototype predates the final nullable `best &&` type guard;
retain its historical typecheck failure rather than treating it as the final
validated source.

Saved-only broad comparisons accept input/output paths from repository cwd:

```sh
python3 data/reviews/helper-fit-and-coverage/tools/compare_runs.py \
  data/reviews/helper-fit-and-coverage/runs/final.json.gz out/runs-comparison.json
python3 data/reviews/helper-fit-and-coverage/tools/compare_passing.py \
  data/reviews/helper-fit-and-coverage/passing/final.json.gz out/passing-comparison.json
```

Other archived analysis tools retain original `out/helper-fit/` layouts;
restore the filenames from their source/receipt before using them. Their
existing outputs remain available here. Repack the ten original film pairs
without executing the engine:

```sh
node --import tsx scripts/export-helper-coverage-film.ts \
  data/reviews/helper-fit-and-coverage/native/helpers-before.json.gz \
  data/reviews/helper-fit-and-coverage/native/helpers-after.json.gz \
  data/reviews/helper-fit-and-coverage/coverage/before.json.gz \
  data/reviews/helper-fit-and-coverage/coverage/final.json.gz \
  601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b \
  out/helper-fit-and-coverage.html
```

## Checks and historical failures

Final: 1,099 TypeScript tests across 95 files, 66 Python tests, typecheck,
build, 38 browser checks and a decoded video export pass. The clean suite
command is `node node_modules/vitest/vitest.mjs run --maxWorkers=1 --pool=threads`.
The Python command is `python3 -m unittest discover -s test -p 'test_*.py'`.
Tests of achieved helper contact fail six cases against the parent; the
coverage conflict tests fail four. No failed assertion or runner error was
suppressed to produce a pass.

An earlier full run was deliberately interrupted when the nullable coverage
guard required a source freeze. A later fork-worker run passed all assertions
but exited nonzero on Vitest's separate 60-second progress-RPC deadline.
Both logs remain in `checks/`, together with the diagnosis and the clean
thread-worker run. The initial coverage fixture and component typecheck
failures remain explicitly historical. Visual-only helper targeting was
rejected because it fought actual loaded hands and worsened all four gains.
Earlier prototypes serialized mind Maps/Sets incompletely; final helper
packets use canonical arrays and prove exact old execution/checkpoint/RNG
identity. See receipts before comparing source phases.

`manifest.json` records every packet file except itself, plus the external
film, changed source, tests and reused parent references. Validate its hashes
before review or regeneration. No main-branch or PR #1 changes are part of
this increment.
