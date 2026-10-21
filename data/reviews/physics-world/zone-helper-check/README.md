# Original zone-helper check/climb evidence

Read [the implementation review](../../../../docs/reviews/zone-helper-check-and-climb.md)
and [common OL controller recommendation](../../../../docs/reviews/universal-ol-controller.md).
Watch [ten paired clips](../../../../viewer/zone-helper-check.html) or the
[offline ZIP](../../../../viewer/zone-helper-check.zip). The same five inputs
were chosen before outcomes: IZ/Over and Split/Tite, both sides, seed3, plus
Duo/Odd/right/S11. Split/Tite/right focuses the original RT helper.

## Provenance and cohort

Reuse `../ol-job-exchange/candidate.json.gz` and `candidate-film.json.gz` as
the baseline; no copy or resimulation. Baseline commit `f641f31` has source
`206cb45f54841596ae01fa3ecccb2a6cd192d77664563595cbe82c05c443cae9`.
Final source is
`d6dfa190412da52725780c71db02f73305b3e3f5541b4c8e9d755a3296ee568f`.
Only blocking.ts changes; World retains SHA
`4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.
Physical profiles, force/work caps and resolution are unchanged.

The same collector records 160 balanced ordinary inputs (roster31/32, strength
.55; eight concepts × five fronts × two sides × seeds3/11) plus two separately
labelled prior roster41/42 witnesses. All 162 recorded initial projections
match and all 324 observed/plain controls match; all finish naturally.
This is not a natural NFL concept distribution or representative roster pool.

## Files and findings

- `candidate.json.gz` / `candidate-film.json.gz`: final raw native panel and ten
  generic fixed films. The viewer selects the five predeclared inputs above.
- `comparison.json`: compact paired outcomes, actual helper images/requests,
  keeper/contact/native limits and later achieved backer contacts. Raw records
  are referenced rather than duplicating every native tick.
- `engine.patch`: final source delta from the pinned baseline, for historical
  reconstruction. Do not apply it over later source.
- `controlled-tests.ts`, focused/red/full logs and `checks.json`: frozen actual
  18-case source, five baseline feature failures/13 controls, two rejected-
  candidate cadence failures/16 controls, final791 TS/22 Python checks.
- `pre-cadence/`: explicitly unpromoted512a source/evidence. Its five sensible
  checks masked unintended optional→joined shared-clock coupling. The final
  candidate is compared directly to the original baseline, not this prototype.
- Browser/integrity records and independent verifier/manifest retain source,
  tools, raw files and all adverse results. Default checks immutable history;
  `--engine` additionally checks current source and exact baseline reconstruction.

Final ordinary check climbs0→5; total climbs118→119; mean1.3894→1.4026 yd;
stuffs37→37; OLfalls13→14. 151/160 complete signatures are exact, including
all120 out-of-scope plays. All119 ordinary keepers and3 supplemental keepers
retain loaded hands. Each new climber later has actual positive-force hands
on the assigned backer;4 have body contacts and1 later retargets. This is
achieved contact, not a guaranteed second-level block or running lane.

Both adverse yard pairs remain: IZ/Odd/left/S3 .24→.22 and Split/Tite/right/S3
.03→.01. No≥2yd pairs. The rejected Bear5.12→3.00 regression is repaired;
final result/events and ordinary climb times match baseline, while the complete
final signature is not identical. The extra RG fall is separate from the five
check climbers. Arm-budget excess is ≤2.85e−14 native impulse; other recorded
caps have no positive excess. Accounting is not empirical NFL force calibration.

## Measurement limits

Helper visual checks mean actual consumed owner+DL images, not merely an
advance of legacy `nextRead`. That field can perform unjoined bookkeeping.
The old collector omits new helpPolicy/checkNextRead/checkSince, full pre-update
World joint lists and TE-only delivered-body loads. Private cadence/dwell,
future corridor endpoint and foreign-grip exclusions rely on frozen source and
controlled tests. Present corridor geometry and consumed images are independently
recomputed. Missing TE arm rows are not zero native joint force.

Replay frames are post-physics with tick-start timestamps. Native solve details
appear only once completedAt≤visual time, which can lag the displayed positions
one tick and excludes the final+.05s solve from seeking. Original phases remain
unretimed; the integrity check preserves exactly their recorded content.

Native forcekg·yd/s², impulsekg·yd/s, workkg·yd²/s². SI conversions are×.9144
for force/impulse and×.9144² for work. Joint mean force differs from player-wide
arm impulse/work across all hands/strikes. No full-game, speed or league-rate
claim follows from this narrow controller panel.

## Rerun

Use Node22.23.3 and installed lockfile dependencies. Keep source frozen during
collectors and write new results to ignored `out/`; published history is immutable.

```sh
node --import tsx scripts/diag/combo-transfer-review.ts out/check/new.json.gz
python3 scripts/diag/zone-helper-compare.py data/reviews/physics-world/ol-job-exchange/candidate.json.gz out/check/new.json.gz out/check/comparison.json
node --import tsx scripts/export-zone-helper.ts data/reviews/physics-world/ol-job-exchange/candidate-film.json.gz out/check/new-film.json.gz out/check/film.html
node node_modules/vitest/vitest.mjs run --maxWorkers=1
npm run typecheck
npm run build
python3 -m unittest discover -s test -p 'test_*.py'
python3 data/reviews/physics-world/zone-helper-check/verify-evidence.py --engine
```

The saved-film export does not simulate. The offline ZIP embeds its data and
exports short selected-play videos where MediaRecorder is supported. Browser
verification uses Python Playwright/Chromium, with local HTTP if file URLs are
blocked. Follow the [practical validation policy](../../../../docs/reviews/practical-validation-and-stable-physics.md)
for focused iteration, final frozen checks and source-matched baseline reuse.
