# Finite strike-force integration and corrected slice validation

Read [the review and next priorities](../../../../docs/reviews/strike-force-and-slice-validation.md).
Parent commit: `9be35b25e77c8f49a4b13bd2164002180ef1fbb3`.

Two different comparisons are retained:

1. **Corrected installation, before versus after strike quadrature.**
   Before source `e931efde36934de1231dc9c1fad7a2179b61026bbb78a4d1eabb6e252d9747e8`;
   after source `623b1c16aca5c6aa1a5f99bf178b789edaa1a12951058b75ef7ecd177a84217f`.
   Same fixture/tool bytes, profiles, inputs, controller cadence and recording
   policy. The only engine difference between those sources is the eight-line
   achieved strike midpoint correction. `world-before.ts` retains that exact
   preceding World, including the same new observational strike records.
2. **Historical v1 versus correctly installed v2.** Historical source
   `bf3da801c3f8ad3b9729d6e808665bb6f67f9e59c0dbdb0262316267307cf631`
   belongs to the preceding commit. Its fixture declared strength opposite
   the staged TE side and its first-contact predicate omitted delivered
   strikes. This is an installation/accounting correction, not an isolated
   physical treatment. Original v1 data are untouched in `../motion-contact/`.

No strength, traction, grip, athletic profile, step count, outcome roll or NFL
average was fitted. The v2 endpoints are censored contact-inspection windows,
not credited football gains, missed-block rates or block wins.

## Retained evidence

- `strike-before.json.gz` / `strike-after.json.gz`: independent Newtonian
  constant-force references, unequal masses, rotations, 20-Hz controls and
  five resolutions. The prior native position error is .00010417 yd; after
  repair every case is within `4.5e-15` yd. No ground force or torso collision
  acts in this restricted oracle. Actual delivered strike impulse/work is
  retained rather than the request alone.
- `motion-before-raw.json.gz` / `motion-after-raw.json.gz` and their summaries:
  72 correctly installed primary rows and six separate far-edge reach
  negatives, fixed before outcomes. Acquisition, achieved force sources,
  hand/body load, observation bins and accumulated impulses remain distinct.
  All native primary reps receive hand/body load at each speed; negatives
  receive none. Maximum refinement endpoint error is .05364 before and .05209
  yd after, with no contact/fall classification disagreement. This is not a
  rate estimate or a promise that every block should survive.
- `motion-film.json.gz`: 14 fixed final-source full recordings. Each recording
  matches its unrecorded/uninstrumented physical history and RNG exactly.
- `historical-accounting-audit.json`: source/hash-pinned strike-work witnesses
  in all 24 native historical primary rows. This demonstrates omitted force
  channels; it cannot reconstruct old missing per-pair strike impulse records.
- `world-before.ts`: exact before-World bytes for mechanical reproduction.
  The publication manifest pins it and the current files separately.
- Transfer reports, rejected-approach traces, test logs and offline film
  validation have their own sources/scopes in the publication manifest.
  A failed before-oracle test is deliberately retained beside the passing
  after suite; no checks were disabled.

The updated [HTML](../../../../viewer/motion-contact.html) and
[offline ZIP](../../../../viewer/motion-contact.zip) show corrected v2 fixtures.
The [historical HTML](../../../../viewer/motion-contact-historical.html) and
[ZIP](../../../../viewer/motion-contact-historical.zip) preserve the original
v1 bytes. Current exporter versions accept either saved schema and label v1's
installation/accounting limits. Nothing is resimulated during export.

Signed strike work may be negative. Delivered impulse is accumulated per
requested action, with equal/opposite body responses and shared force/work
limits; an out-of-reach request never becomes a contact record. Its optional
height is requested, not a newly measured anatomical contact height. Sampled
loaded interval counts do not measure continuous support between samples.
Channel order is a reporting priority within a 50-ms bin, not exact physical
onset order. Absolute mean hand force times dt is absolute net interval impulse
and may undercount rapidly reversing force.

## Transfer guards and publication gates

`transfer-validation.py` compares retained before/after inputs, profiles,
measurement tools and outcomes without resimulation. Run it from any directory
with `python3 data/reviews/physics-world/strike-contact/transfer-validation.py`
from the repository root. `transfer-validation.json` is its reproducible output.

- `current-runs.json.gz`: all 144 current run records and contact windows.
  Parent reference: `../hand-force/centered-runs-compact.json.gz`. Credited
  gains are distinct from event/first-contact quantities and penalties. Stuffs
  stay 33; explosives change 4→5; mean 1.93→2.13 yd; median .95→.80 yd.
  Only 65 gains match exactly; seven finish categories change. The largest
  gain shift is 51.71 yd (OOB becomes touchdown). All concepts and worsening
  rows remain available. No physics timeouts or lower-hold reach releases.
  `paired-run-witnesses.json.gz` retains full baseline/current contact windows
  for the largest positive and negative gain shifts, selected afterward for
  diagnosis. The prior compact archive omitted those windows. The largest
  positive shift develops gradually; both reps have three broken holds and
  neither runner falls. The windows cannot explain later pursuit/exit choices.
- `current-tackles.json.gz`: 64 encounters, compared with
  `../hand-force/current-tackles.json.gz`. Every payload except collection
  timestamp/source pins is identical, including profiles and observer checks.
  Fourteen primary encounters remain live at their inspection limit.
- `current-hands.json`: all 54 redirects, five summaries and 12 frontal rows
  equal `../hand-force/panel-centered.json`. This preserves existing numerical
  limits and previous adverse refinement rows; no new convergence claim.
- `current-games9.json`: two measured games, one warm game excluded. Same
  initial roster hash/seeds as `../hand-force/centered-games9.json.gz`, with
  diverging calls/draws later. No physical timeouts, lower-hold reach releases
  or motor-work excess. One game ends 68–29. These are safety observations,
  not proof of improved NFL scoring, passing or explosiveness.
- `tests.log`: 606/606 TypeScript tests pass; `python.log`: 22/22 Python tests
  pass. Empty final `typecheck.log` and `build.log` accompany successful exit
  codes recorded in `verification-manifest.json`.

The manifest also hashes tooling, current films and preserved historical film
bytes. The prior hand-force manifest's original motion-contact viewer hashes
now refer to the byte-identical `motion-contact-historical` files. Its historical
measurement claims are annotated rather than rewritten as v2 evidence.

## Reproduce current checks

Use the repository's pinned Node 22.23.3 toolchain and installed dependencies.
Keep engine, fixture and tool files fixed while collecting reports. Do not
run heavy simulation concurrently with the complete test suite or a benchmark.

```sh
node --import tsx scripts/diag/strike-force-review.ts out/strike-contact/current-force.json
node --import tsx scripts/diag/motion-contact-review.ts out/strike-contact/current-motion
node --import tsx scripts/export-motion-contact.ts out/strike-contact/current-motion/film.json.gz viewer/motion-contact.html
node --import tsx scripts/diag/run-contact-review.ts out/strike-contact/current-runs.json
node --import tsx scripts/diag/tackle-timing-review.ts out/strike-contact/current-tackles.json.gz
node --import tsx scripts/diag/hand-convergence.ts out/strike-contact/current-hands.json
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/strike-contact/current-games9.json 9 --games-only
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
```

To recreate the corrected-installation before source after publication, archive
the publication commit into a separate ignored scratch directory, reuse the
installed dependencies there, and replace only its `src/physics/world.ts` with
the retained `world-before.ts`. Run the diagnostics from that scratch root and
verify the reported content hash equals `e931efde…`. Keep the live checkout
unchanged. This compares the actual old integration, not an exporter label or
an inferred source mode. Future engine edits require the pinned historical
publication commit rather than a newer HEAD.

The run panel's parent reference is the prior commit's existing centered-mode
production evidence in `../hand-force/`; the lab fixture change is unused by
ordinary games. Later game calls, draws, fatigue and histories diverge. Game
results are safety guards; their recorded timings are not isolated cost
benchmarks and must not be used to claim a speedup. This repair adds a few
arithmetic operations and small observational records, not more physics steps.
