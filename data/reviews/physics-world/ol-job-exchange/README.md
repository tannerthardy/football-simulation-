# OL work-exchange evidence

Read [the implementation review](../../../../docs/reviews/ol-work-exchanges.md).
Watch [eight paired fixed clips](../../../../viewer/ol-work-exchanges.html) or
download the [offline ZIP](../../../../viewer/ol-work-exchanges.zip).

## Scope

Baseline commit `6b8c566` has full engine-content SHA
`ff641a802030edddaa1eac42b8d0991b4cba43dd9f4fa0f3ef45ee3dd3bcfbac`;
candidate SHA is
`206cb45f54841596ae01fa3ecccb2a6cd192d77664563595cbe82c05c443cae9`.
Only blocking.ts changes; World SHA remains
`4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.
Physical profiles, capacities and resolution are unchanged.

Reuse immutable `../combo-transfer/after.json.gz` as the 162-input baseline.
It is not copied or resimulated. The unchanged combo collector records 160
ordinary inputs (roster31/32, .55; eight concepts × five fronts × two sides ×
seeds3/11) and two separately labelled older roster41/42 witnesses. All initial
projections match, all 324 observed/plain execution checks match, and all finish
naturally. This is a balanced diagnostic panel, not an NFL outcome estimate.

## Records and results

- `candidate.json.gz` and `candidate-film.json.gz`: native fixed panel and ten
  generic fixed films. `comparison.json` retains every paired outcome and
  compact exchange/keeper summaries; it references raw records rather than
  duplicating every native tick. Its general exchange tap records only the
  active initiator, so recipient pictures are explicitly absent.
- `witness-before.json.gz` / `witness-after.json.gz`: the pinned old and new
  engine with the same new actual-event witness collector. Four fixed inputs
  are Duo/Odd and Power/Under, both sides, seed3, roster31/32 at .55. Eight
  separate observer/plain controls pass. `WX-…` identifiers are stable.
  Every actual exchange retains both participants' consumed images, event-boundary
  jobs and unchanged bodies/joints, then the completed physical tick's requests,
  support and achieved contact loads. No extra decision read or RNG draw occurs.
- `engine.patch`: exact pinned source delta, for historical reconstruction;
  do not apply it over a later engine. Check logs and `checks.json` distinguish
  final full suite, focused feature/control tests and red baseline run.
- `film-check.py`, browser/integrity records and `verify-evidence.py` /
  `verification-manifest.json`: independent saved-data, browser and source checks.
  Default verification checks immutable history. `--engine` additionally requires
  current source to equal the recorded candidate and reconstructs the old source.

All 18 initiator exchanges now match the own-picture depth rule (old: 11/18).
Ten exchanges change kind. 149/160 ordinary complete executions are exact;
mean gain1.3888→1.3894 yd, stuffs37→37, climbs118→118, OLfalls13→13.
The sole adverse gain, WZ/Under/right/S3 .40→.38 yd, is retained. No ≥2yd pairs.
All 118 ordinary keeper joints and three supplemental joints remain continuous
and physically loaded. Tight ends lack OL-only impulse rows in the general tap;
missing is not zero. Dedicated witnesses record both participants' actual loads.
Arm-cap excess is at most2.85e−14 native impulse; other recorded caps have no
positive excess. Accounting consistency is not empirical NFL force calibration.

24 new tests pass; baseline fails17 feature cases and passes7 controls. Final
checks:773 TypeScript tests,22 Python tests, typecheck and build. Shared physics
and deep collectors are reused under the [risk-based validation policy](../../../../docs/reviews/practical-validation-and-stable-physics.md).
No new league-rate or isolated performance claim follows from this cohort.

Native force:kg·yd/s²; impulse:kg·yd/s; work:kg·yd²/s². Multiply force/impulse
by .9144 and work by .9144² for SI. A changed assignment is not a completed block;
per-body arm impulse includes all hands/strikes, not just one joint.

## Rerun

Use Node22.23.3 and installed lockfile dependencies. Write new outputs to ignored
`out/`; retain published history. Freeze source during collection.

```sh
node --import tsx scripts/diag/combo-transfer-review.ts out/exchange/new.json.gz
python3 scripts/diag/ol-exchange-compare.py data/reviews/physics-world/combo-transfer/after.json.gz out/exchange/new.json.gz out/exchange/comparison.json
node --import tsx scripts/diag/ol-exchange-witness.ts out/exchange/witness-new.json.gz
node --import tsx scripts/export-ol-exchange.ts data/reviews/physics-world/ol-job-exchange/witness-before.json.gz out/exchange/witness-new.json.gz out/exchange/film.html
node node_modules/vitest/vitest.mjs run --maxWorkers=1
npm run typecheck
npm run build
python3 -m unittest discover -s test -p 'test_*.py'
python3 data/reviews/physics-world/ol-job-exchange/verify-evidence.py --engine
```

The dedicated historical witness requires the pinned old source with the exact
same witness collector. The witness tap separates event emission from later
contact acquisition in the same update; recorded physical joints are identified
by their actual object IDs. Saved-film export does not simulate. Browser checks
require Python Playwright/Chromium and may serve local HTTP when file URLs are
blocked. The offline ZIP embeds its data; the viewer exports the selected play
as a short video when the browser supports MediaRecorder.
