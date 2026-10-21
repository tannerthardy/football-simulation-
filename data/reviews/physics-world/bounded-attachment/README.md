# Bounded attachment evidence

Read [the implementation, decision and limits](../../../../docs/reviews/bounded-attachment-and-contact-transfer.md).

## Pins and mode selection

Parent commit: `931289d7976cae4cdfad71cbf52ef824425bf4aa`.
Its production engine SHA is
`bbfaf460a9962459702dc5702b62b5b5e5933eac7c7e5ab1986095690d1759db`.
The controlled experiment commit is `0edf1d6`; its cached engine SHA is
`6baaf595de49f1118ac2044933a9c3a749678412cebfdaec91f91a44dd1096df`.
Promoted production engine SHA:
`34f408b5ecee53740d9c61218e46b5ae0842e74f3d0f9cd0e3256dd8685abb02`.
Earlier uncached measurements use
`38de2ab7f8ce0e575483d3156128b3abde52d13e2dd5c9d7586e1227b5e884c9`.

**Both controlled modes use the same cached experiment source.** `linear-*` uses
that source's linear default. `bounded-*` explicitly enables the experiment with
`--import ./scripts/diag/enable-bounded-attachment.ts`, except the restart tool,
which has its own `--bounded-attachment` flag. The bounded law is now the live
production default. `production-*` is rerun on the promoted source with no
preload: all 64 tackle and 144 run physical signatures match the controlled
bounded mode, and all four official game summaries match the uncached bounded
guard. `cache-equivalence` and `production-equivalence` disclose the comparison
scope. No force, player, controller or execution-roll overrides; resolution is
varied only in explicitly labelled mechanical/refinement trials.

Older guard schemas hardcode a command without preloads/`--expose-gc` and do not
record mode. Their filename alone is not independent proof of mode. The retained
verification manifest pins the declared invocation, preload and scripts; the
film captions disclose this schema limit. Engine/source equality means code
equality, not experimental-law equality. Never compare these reports by source
hash alone. New targeted traces record their actual argv and selected mode.

## What is retained

- `linear.json.gz` / `bounded.json.gz`: 48 actual-World restarts of one historical
  low-hold case; 36 primary, eight chart/filter sensitivities, four capacity/reach
  negatives. Omitted optional state and exogenous commands are disclosed. Not
  exact historical play replay. Each mode passes four observer controls. Restored
  point is preserved on conversion; the derivative intentionally changes.
- `*-tackles.json.gz`: 56 primary isolated encounters and eight separate crossing
  witnesses, with 64 observer and nine full-recording controls per mode. Live
  windows are censors, not failed tackles/engine timeouts. `tackle-comparison`
  keeps the primary and witnesses separate. All eight faster-carrier physical
  negative signatures remain identical; first attempts remain identical.
- `*-runs-compact.json.gz`: 144 matched actual 11v11 inputs, seven observer
  controls per mode and full traces for the unchanged 13 film fixtures.
  `run-comparison` retains paired changes and concept/front breakdowns.
  Forward progress is measured **before game penalty enforcement**.
- `uncached-*-shared.json.gz`: 120 same-capability mechanical reps across five tasks.
  All are identical between modes; they do not contain this changed lower-grip
  channel, so establish non-regression rather than positive transfer.
- `uncached-*-hands.json.gz`: nine sustained redirects at six resolutions plus 12 frontal
  tackle guards. All frontal tackles still finish. Existing native hand-trajectory
  error is unresolved; no broad solver-convergence claim.
- `uncached-*-games9.json` / `uncached-*-games17.json`: four full games per mode, starting roster
  and seed matched. Warm games excluded. Later state, calls and RNG diverge;
  these are small safety guards, not causal estimates of football rates/cost.
- `counter-*` and `counter-refinement-comparison.json` retain the uncached
  retrospective largest run delta at 12/24/48 subdivisions. Native signatures
  match the controlled panel; inherited refinement differences precede grasping.
- `natural-witness.json.gz` / `natural-witness-comparison.json` retain the first
  actual bound release with 30 identical earlier plays and complete selected
  pre-state/RNG. True unobserved/unrecorded control matches detailed recording.
  The old TD becomes a natural tackle with bounded force; this is one selected
  interaction, not a league effect. `pre-promotion-natural-*` retains the cached
  experiment measurement separately; the final witness uses promoted source.
- Cost reports use sequential independent processes after all other CPU
  workloads finish. Same fresh 22-body fixtures, allocations/GC outside timing,
  three warm blocks excluded, seven measured blocks of 400 one-tick reps.
  These start near zero attachment coordinate; not a sustained-extension cost
  or full-game speedup claim. `uncached-cost-*` retains the initial ABA.
  `cost-*` retains cached ABA plus reversed-order repeat, including a noisy
  process on unchanged trenches. Stable reverse-repeat multiple-grip CPU is
  about 17% above linear; no confidence interval or full-game overhead claim.
- Test logs include the initial failed prototype-only fixture (missing the new
  attachment map state), its repair/recheck and the final 568-test pass. The
  initial concurrent run also had a Vitest RPC timeout; the isolated final run
  completes without it. Typecheck/build and 22 Python data tests pass.

## Reproduce

Use pinned Node 22.23.3 from the repo root with installed dependencies. Keep
source/scripts frozen. Commands below use the promoted source; linear now needs
the explicit disable preload. To exactly recreate the controlled cached films,
use commit `0edf1d6` with the updated exporter files and omit the disable preload,
because that source's default is linear. Baseline/candidate are selected by mode:

```sh
node --import tsx scripts/diag/lower-attachment-review.ts out/bounded/linear.json
node --import tsx scripts/diag/lower-attachment-review.ts out/bounded/bounded.json --bounded-attachment

node --import tsx --import ./scripts/diag/disable-bounded-attachment.ts scripts/diag/tackle-timing-review.ts out/bounded/linear-tackles.json.gz
node --import tsx --import ./scripts/diag/enable-bounded-attachment.ts scripts/diag/tackle-timing-review.ts out/bounded/bounded-tackles.json.gz
node --import tsx --import ./scripts/diag/disable-bounded-attachment.ts scripts/diag/run-contact-review.ts out/bounded/linear-runs.json
node --import tsx --import ./scripts/diag/enable-bounded-attachment.ts scripts/diag/run-contact-review.ts out/bounded/bounded-runs.json
python3 scripts/diag/compare-tackle-timing.py out/bounded/linear-tackles.json.gz out/bounded/bounded-tackles.json.gz out/bounded/tackle-comparison.json
python3 scripts/diag/compare-run-contact.py out/bounded/linear-runs-compact.json out/bounded/bounded-runs-compact.json out/bounded/run-comparison.json

node --import tsx --import ./scripts/diag/disable-bounded-attachment.ts scripts/diag/shared-capabilities.ts out/bounded/linear-shared.json
node --import tsx --import ./scripts/diag/enable-bounded-attachment.ts scripts/diag/shared-capabilities.ts out/bounded/bounded-shared.json
node --import tsx --import ./scripts/diag/disable-bounded-attachment.ts scripts/diag/hand-convergence.ts out/bounded/linear-hands.json
node --import tsx --import ./scripts/diag/enable-bounded-attachment.ts scripts/diag/hand-convergence.ts out/bounded/bounded-hands.json
node --expose-gc --import tsx --import ./scripts/diag/disable-bounded-attachment.ts scripts/diag/held-recovery-football.ts out/bounded/linear-games9.json 9 --games-only
node --expose-gc --import tsx --import ./scripts/diag/enable-bounded-attachment.ts scripts/diag/held-recovery-football.ts out/bounded/bounded-games9.json 9 --games-only
```

Repeat full games with seed `17`. Run the matched cost processes sequentially,
with no tests/simulations/browser active: use the same game tool with
`--benchmark-only`, `--expose-gc`, and Linear / Bounded / Linear order. Preserve
all three reports; do not turn noisy game wall time into a speedup claim.

The natural witness chooses the linear prefix internally and only enables the
candidate for its selected play. Do not give it a global preload. Counter
refinement changes subdivisions explicitly; repeat `12` with `24` and `48`:

```sh
node --import tsx scripts/diag/natural-lower-attachment.ts out/bounded/natural-witness.json
node --import tsx --import ./scripts/diag/disable-bounded-attachment.ts scripts/diag/trace-run-approach.mts out/bounded/counter-linear-12.json 2 counter under R 11 12
node --import tsx scripts/diag/trace-run-approach.mts out/bounded/counter-bounded-12.json 2 counter under R 11 12
```

```sh
node --import tsx scripts/export-tackle-timing.ts out/bounded/linear-tackles-film.json out/bounded/bounded-tackles-film.json viewer/bounded-attachment-tackles.html --bounded-attachment-comparison
node --import tsx scripts/export-run-contact-review.ts out/bounded/linear-runs-film.json out/bounded/bounded-runs-film.json viewer/bounded-attachment-runs.html --bounded-attachment-comparison
node --import tsx scripts/export-natural-lower-attachment.ts out/bounded/natural-witness.json viewer/bounded-attachment-natural.html
python3 scripts/check-replay-viewer.py viewer/bounded-attachment-tackles.html --video-out out/bounded/tackle-example.webm
python3 scripts/check-replay-viewer.py viewer/bounded-attachment-runs.html
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
```

The [18-clip tackle library](../../../../viewer/bounded-attachment-tackles.html)
and [ZIP](../../../../viewer/bounded-attachment-tackles.zip), plus the
[26-clip run library](../../../../viewer/bounded-attachment-runs.html) and
[ZIP](../../../../viewer/bounded-attachment-runs.zip), retain the fixed film
selection and honest clock/result labels. Export/ZIP/telemetry integrity is
pinned separately from physics source.

The [two-clip natural field witness](../../../../viewer/bounded-attachment-natural.html)
and [ZIP](../../../../viewer/bounded-attachment-natural.zip) use the final promoted
source, with the earlier linear game history held fixed. They show the actual
carrier, first holder, assist, slowdown and finish. Recording starts at snap;
missing pre-snap frames and quarter/clock are disclosed rather than invented.

`natural-film-validation.json` pins that exporter, HTML/ZIP, final raw witness
and comparison. The two natural clips passed a custom offline Chromium smoke:
both full telemetry payloads load, contact/movement layers and TE/corner/safety
inspection render, scrub captions retain the selected seed and timestamps,
and the touchdown filter and exact-ID search select the appropriate recording.
No page errors occurred. This is a focused natural-film check, not the complete
generic checker (which hardcodes controlled-fixture captions). Agent/ball paths,
frame times, possession, full telemetry and event details decode identically
to the saved recordings; the existing packer's carrier-posture display values
round to tenths, with at most 0.05 difference. The ZIP contains identical HTML.
