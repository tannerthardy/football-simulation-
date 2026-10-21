# Shared traffic and man accounting: reviewed evidence

Read [the handoff](../../../../docs/reviews/traffic-and-man-accounting.md) first.
Physics is **NOT READY**. Baseline commit `78f2002`; source
`e3471f2c0be6e1c4b32c9713d53d216bc835691d868e93e1628ea279fb21498d`.
After source `0f6b4078a3857a2f4664d2e4d91176ccfb252dbcc836c498a3bafdfa32792df7`.
Source hashes cover `src/`, not docs/probes/viewers. No force/profile fitting.

## Retained evidence

- `owner-observations.json`: seven selected original-game packed paths were
  verified exactly by `owner-film.ts`. Retains body profiles/ratings and initial
  assignments, results/events, teammate contact impulses and falls, selected
  command/perception samples. Contacts identify the enclosing 0.05 s tick start.
  Integer-second samples plus possession events, teammate contacts above 1 yd/s
  and falls are retained; full raw paths stay ignored.
- `owner-setups.json`: generated players, original serialized calls, seeds,
  energy and resolved CB_S shadow input. The shadow was recovered from the
  original traced assignment; observed rows/trajectories were not changed.
- `owner-isolated-pairs.json`: before/after from those same inputs, with
  identical body profiles checked. Game scouting and audibles are omitted, so
  the baseline isolated results differ from the original game results. These
  are **not original-clip counterfactuals**. Serialized pressure calls remain;
  current alignment may drop an uncalled edge to restore enough markers.
  G3-P056 regresses to an 80.65 yd TD, and the freed inside-zone back runs for
  a 73 yd TD. Both remain in the report, alongside shorter gains and QB scramble
  losses elsewhere; the isolated stats do not label those losses as sacks.
- `traffic-contact-comparison.json`: all 96 trials/source with identical
  profiles, seed/mirror/substep/scenario keys, first/final recorded samples,
  contact/fall/work/momentum summaries, final-position convergence and full-path
  mirror aggregates. Native 12 has eight trials per scenario. Mean peak closing
  includes zero for no contact; it is not a conditional hit-speed mean. No
  bodies fall in either panel. First retained sample is at 0.05 s; initial
  geometry is in `traffic-contact.ts`. Full frames are regenerated for mirror
  checks. These traffic-only trials do not validate hand-fight convergence.
- `man-accounting-before/after.json`: pure-man catalog audit, all formations,
  flips and three hashes, compatible front/personnel and advertised pressure
  families, Cover 2 presentation, CB_S shadowing X. Missing means an eligible
  receiver has no man target; far means lateral mismatch greater than 1 yd.
  Before catalog has 22,680 cases; after has 19,224 because unsupported
  Double-A/Cover-1 is removed. On the shared 19,224 cases, missing-case count is
  9,072 → 0 and far-marker-case count 19,107 → 0. This is a static assignment
  invariant, not a coverage performance or disguise-fidelity test.
- `film-outcomes-before/after.json`: full non-nullified run/pass cells by
  concept, actual checked/original called coverage, family, front, intersections
  and disguise. Rates retain counts and denominators; empty throw/separation
  samples stay null. Success is 40/60/100% of yards to go, run explosives 10+,
  pass explosives 20+. Pass-play denominator includes sacks/scrambles;
  20+ completions/throw uses throw events. Film teams are fixed and calling
  adapts; these are unmatched descriptive cells. NFL run-direction labels do
  not identify run schemes. Geometric pressure is association, not causation;
  accuracy/decision/mechanics causes remain unclassified. Passing explosive
  completions worsen from 87/512 to 96/512.
- `hand-convergence.json`: nine real-technique fixtures unchanged, native
  12 versus 192 mean closest-path error 0.206 yd, worst 0.822 yd, two fall
  disagreements. Prior long continued-contact and frontal mirror failures
  remain in the preceding evidence, not repaired by these traffic scenarios.
- `calibration-16.txt`, `kinematics.txt`: sixteen games, seed 7, two generated
  leagues; four recorded tracking games, seed 5. Broad noisy guards, not NFL
  tuning targets. Explosives, YAC, interceptions and tackle misses worsen.
  Tracking pressure uses actual defender distance, distinct from QB sensing.
  Legacy target bands and measurement operators need their existing caveats.
  Negative QB scrambles on called passes are currently recorded as rushes,
  not sacks (`PlaySim.endCarrier`); sack/YPC comparison needs a definition audit.
- Verification logs: 274 engine tests, 22 data tests, clean type/build, 20
  browser checks; 884 new clips, six games, 27 concepts, eight pitch exchanges.
  New G/P IDs have new paths. ZIP member equals viewer HTML exactly.

Log whitespace is normalized; values are unchanged. Uploaded RB Markdown is
byte-for-byte. Runtime logs were collected under varying concurrency and are
not controlled performance comparisons. An earlier concurrent test run had
a Vitest RPC timeout; the final clean rerun has no unhandled error.

## Current-source reproduction

Use supported Node (22 here), installed npm dependencies, Python, Playwright
and Chromium. From the repository root:

```sh
node --import tsx scripts/diag/traffic-contact.ts out/traffic-contact-after.json
node --import tsx scripts/diag/man-accounting.ts out/man-accounting-after.json
node --import tsx scripts/diag/owner-film.ts out/owner-feedback-fixed-after.json --reps data/reviews/physics-world/traffic-and-man-accounting/owner-setups.json
node --import tsx scripts/diag/hand-convergence.ts out/feedback-hand-convergence.json
node --import tsx scripts/calibrate.ts 16 7 2
node --import tsx scripts/kinematics-compare.ts 4 5
node --import tsx scripts/export-replay.ts 7 --games 6 --out viewer/film-room.html --doc
python3 scripts/film-outcomes.py viewer/film-room.html --out out/concept-feedback-after.json
python3 scripts/check-replay-viewer.py viewer/film-room.html
npm test
npm run test:data
npm run typecheck
npm run build
```

Package the exact HTML with Python `zipfile.ZipFile`, `ZIP_DEFLATED`, compression
level 9, member `film-room.html`. Verify reading that member equals HTML bytes.

## Original-game and paired-baseline reproduction

Use a fresh ignored archive directory. Do not switch or overwrite someone
else's active checkout. From the current repository root:

```sh
mkdir -p out/feedback-baseline
git archive 78f2002 | tar -x -C out/feedback-baseline
ln -s ../../node_modules out/feedback-baseline/node_modules
cp scripts/diag/owner-film.ts scripts/diag/traffic-contact.ts scripts/diag/man-accounting.ts out/feedback-baseline/scripts/diag/
cd out/feedback-baseline
node --import tsx scripts/diag/owner-film.ts ../owner-feedback-original.json viewer/film-room.html
node --import tsx scripts/diag/owner-film.ts ../owner-feedback-fixed-before.json --reps ../owner-feedback-original.json
node --import tsx scripts/diag/traffic-contact.ts ../traffic-contact-before.json
node --import tsx scripts/diag/man-accounting.ts ../man-accounting-before.json
cd ../..
node --import tsx scripts/diag/owner-film.ts out/owner-feedback-fixed-after.json --reps out/owner-feedback-original.json
python3 scripts/film-outcomes.py out/feedback-baseline/viewer/film-room.html --out out/concept-feedback-before.json
python3 scripts/data/owner_film_report.py out/owner-feedback-original.json out/owner-feedback-fixed-before.json out/owner-feedback-fixed-after.json out/owner-feedback-reviewed
python3 scripts/data/traffic_contact_report.py out/traffic-contact-before.json out/traffic-contact-after.json out/traffic-contact-comparison.json
```

The original diagnostic rejects a mismatched film/source. Archived `src/`
must stay unchanged; instrumenting the tick collects observations but does not
change decisions or RNG draws. Compact report scripts assert matched profiles.
For the man audit's common-catalog comparison, sum before `byCall` rows only
for the keys present in after `byCall`; do not compare unequal catalogs as
equal-sized paired panels. Raw NFL files remain ignored; no new NFL or
AddBiomechanics subject data was acquired for this work.
