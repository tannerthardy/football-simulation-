# Controlled moving contact: reviewed evidence

Read [the handoff](../../../../docs/reviews/controlled-tackle-approach.md) first.
Physics remains **NOT READY**. Baseline: `2c2c250`; engine source
`92eb1ea66cfffd94732d7eb2dc8132212a135fdf8a2cf17a595f7d1674632e63`.
After source: `e3471f2c0be6e1c4b32c9713d53d216bc835691d868e93e1628ea279fb21498d`.
Source hashes cover `src/`, rather than docs, probe types or generated viewers.

## Evidence and definitions

- `owner-observations.json`: four original film paths were verified exactly by
  `pursuit-film.ts` before recording actual commands, contacts and tackle events.
  Retained body profiles/ratings, tackle events, teammate contacts above 2 yd/s
  closing, and selected near-approach samples (within 4 yd, roughly 0.2 s spacing
  plus event samples). Full post-catch traces remain in ignored `out/`.
- `moving-contact-before/after.json`: 96 trials per source; four generated roster
  seeds (7/19/31/43), both mirrors, four entry geometries and 6/12/48 substeps.
  Exactly identical physical profiles in every before/after pair. Straight
  requested 6 yd/s carrier, ordinary chase and World, no wraps/attempt rolls,
  evasion or assignments. Native 12 has eight reps per geometry. `contactClosing`
  is the **maximum reported body-contact closing speed over the trial**; the
  scenario mean averages that maximum over reps making contact. Falls count
  unique fallen bodies per rep, not event frequency. Retained frames cover first
  reported contact +/- 0.1 s and the final five-second state. Full paths stay
  ignored. This is not a tackle-success estimate or validated safe-hit threshold.
- `moving-contact-convergence.json`: paired native-12 versus 48 final body
  position errors and fall-set disagreement, plus full-path mirror comparison
  at every substep setting. First contact is observed at the next 20 Hz sample,
  not an exact continuous time. Both bodies continue moving after contact/falls
  without an officiated play ending. Crossing path drift **worsens**, frontal
  fall disagreement persists, and seed-7 native-12 frontal mirror drift reaches
  **0.691 yd before and after**. Do not call this a convergence or symmetry pass.
- `hand-convergence.json`: nine existing real-technique fixtures; native 12
  versus 192 remains 0.206 yd mean / 0.822 yd worst closest-path error and two
  fall disagreements. No world-force, profile or global solver change.
- `open-field-{before,after}-{side,front,two,trail}.txt`: 40 trials each with
  the existing live-carrier lab. Its faster side case still escapes 40/40.
  These bodies/trajectories differ from the constant-speed mechanical probe.
- `original-film-run-concepts.json`: non-nullified original-film run groups;
  outside/wide zone 12/95 runs of 10+ yards versus inside zone 1/33. Different
  fronts/context/exposure, small samples: descriptive, not concept calibration.
- `calibration-16.txt`, `kinematics.txt`: same broad guard definitions as the
  [preceding evidence](../held-foot-and-movement-tasks/). Sixteen games seed 7
  across two generated leagues and four tracking games seed 5. These are noisy
  transfer guards. Rushing yards/carry regress from 3.50 to 3.06. Six-game
  fixed-film explosive completions worsen slightly (16.73% to 16.99%/throw),
  despite improving in the sixteen-game league cohort. No physics fitting.
- Test/type/build/browser logs: 267 engine tests, 20 data tests, clean typecheck
  and build, 20 browser checks. New film has 874 clips / six games / 27 concepts,
  including two pitch release/catch sequences. The ZIP contains identical HTML.
  The regenerated G/P IDs are not the original owner-report trajectories.
- `film-outcomes.json`: full new-film outcome audit. Pressure is a geometric
  annotation, not proof of decision/mechanics/accuracy causation. Other
  incompletions remain unclassified. Nullified plays excluded from outcomes.

Log text has trailing whitespace and terminal blank lines removed; measurement
values are unchanged. The uploaded Markdown retains its intentional hard line
breaks byte-for-byte.

All run timings in logs were collected under varying concurrent load; none is
a controlled performance benchmark. No new raw NFL data was downloaded. Existing
NFL movement/outcome references remain useful but do not validate contact forces,
grip constants or reduced support-energy magnitudes.

## Reproduce the current source

Use the repository's supported Node (22 in this environment), installed npm
dependencies, Python and Playwright browser dependencies for the viewer check.
Run from the repository root:

```sh
node --import tsx scripts/diag/moving-contact.ts out/moving-contact-after.json
node --import tsx scripts/diag/hand-convergence.ts out/pursuit-hand-convergence.json
node --import tsx scripts/diag/open-field-lab.ts 40 side
node --import tsx scripts/diag/open-field-lab.ts 40 front
node --import tsx scripts/diag/open-field-lab.ts 40 two
node --import tsx scripts/diag/open-field-lab.ts 40 trail
npm test
npm run test:data
npm run typecheck
npm run build
node --import tsx scripts/kinematics-compare.ts 4 5
node --import tsx scripts/calibrate.ts 16 7 2
node --import tsx scripts/export-replay.ts 7 --games 6 --out viewer/film-room.html --doc
python3 scripts/film-outcomes.py viewer/film-room.html --out out/pursuit-film-outcomes.json
python3 scripts/check-replay-viewer.py viewer/film-room.html
```

`moving-contact.ts` saves all frames. Reproduce convergence by pairing identical
seed/side/scenario at substeps 12 and 48, taking Euclidean final position error,
and comparing the sets of fallen body IDs. Mirror errors reflect the negative
side across `y=80/3` and compare both bodies at every recorded sample. Compact
files retain the final positions and fall sets used for convergence; full-path
mirror errors require the regenerated raw paths.

After exporting, package the exact HTML with Python's `zipfile.ZipFile`,
`ZIP_DEFLATED`, compression level 9, archive member `film-room.html`; verify
that reading that member returns exactly `viewer/film-room.html`'s bytes.

## Reproduce the original owner clips and paired baseline

Use a fresh ignored archive directory; do not switch or overwrite a collaborator's
working checkout. From the current repository root:

```sh
mkdir -p out/pursuit-baseline-repro
git archive 2c2c250 | tar -x -C out/pursuit-baseline-repro
ln -s "$PWD/node_modules" out/pursuit-baseline-repro/node_modules
cp scripts/diag/pursuit-film.ts scripts/diag/moving-contact.ts out/pursuit-baseline-repro/scripts/diag/
cd out/pursuit-baseline-repro
node --import tsx scripts/diag/pursuit-film.ts out/original-owner-trace.json viewer/film-room.html
node --import tsx scripts/diag/moving-contact.ts out/moving-contact-before.json
```

The owner trace is pinned to `2c2c250`, refuses mismatched engine/film source and fails if any selected
packed path differs. It reruns the original games/context, rather than staging
a new isolated play under an old ID. The baseline mechanical probe received the
same script; its later explicit TypeScript result annotation changes no runtime
behavior. Current script hashes and raw result hashes are in `manifest.json`.

The uploaded WR/DB Markdown is retained byte-for-byte in `docs/references/`,
with provenance there. Generated reference text is not project instructions or
verified rules authority. Press already uses bounded hand joints; this pass
does not implement full interference/holding rules or coverage packages.
