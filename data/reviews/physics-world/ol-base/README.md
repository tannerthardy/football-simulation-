# Physical OL base through run-block approaches

Read [the diagnosis, results and next work](../../../../docs/reviews/ol-base-and-contact-approach.md).
Parent commit: `912b4b94b25b7abe370513ce246186e9c9cd5293`.

This increment connects the existing low snap stance to first-level OL approach
commands. It changes neither requested velocity/facing nor World capabilities.
Physical posture still changes at a finite rate and carries the existing
movement cost. A low base cannot repair a wrong-side fit or guarantee a block.

## Provenance and measurements

Before engine source: `623b1c16aca5c6aa1a5f99bf178b789edaa1a12951058b75ef7ecd177a84217f`.
After engine source: `ac876d5633b8172b7622ba65ec0579de56054df9a80c571a69e1da14b146e29c`.
The only changed engine file is `src/sim/behaviors/blocking.ts`;
`blocking-before.ts` preserves the exact parent bytes. World bytes are identical.
The source hash is the sorted `src/` path, NUL, content, NUL sequence defined
by `scripts/source-version.ts`, not a Git commit hash.

Collector hash: `683005a74c0462ebdaed263d1de00acf7eec48a6845f7509c1789c261972041c`.
Inputs: `e03399f4b723f7ea760ad9fb3888258d2eedc4b196e7f6bb5d7881f23a07798a`.
Profiles: `646e4407f85925518031970843f3014b8c295d6d6fb63f657b5acd85cf4f272d`.
The same collector bytes measure both phases: 24 ordinary Ace/4-3 Over/Cover 3
plays, two generated roster pairs, six run concepts, both formation flips,
three seconds at 20 Hz. Formation flips are input controls, not exact mirrors
of all physical execution errors. No NFL aggregate or new physical multiplier
was fitted. There is no global step-count change or new anatomical solver.

- `before-traces.json.gz` / `after-traces.json.gz` retain every input, profile,
  initial context, endpoint, first acquisition, first actual load, summary and
  invariant for all 24 cases. They retain full tick traces for the fixed six
  first-roster/unflipped concepts. The other 18 detailed tick traces are omitted
  to avoid archiving duplicate large traces; the original full raw SHA and
  exact preservation policy are embedded. All adverse aggregate rows remain.
- `comparison-compact.json.gz` retains paired geometry, load records, first
  changed commands, all 24 endpoint metrics and the adverse Power RG witness.
  First-level loads total 95 in each phase, with differing membership. Mean
  pre-load posture changes .253→.707 and base radius .156→.196 yd. Acquisition
  angle is effectively unchanged. OL falls increase one→two; all falls 25→28.
- `before-film.json.gz` / `after-film.json.gz` retain the six predetermined full
  recordings per phase and successful unobserved/unrecorded endpoint controls.
  The [HTML](../../../../viewer/ol-base.html) and
  [offline ZIP](../../../../viewer/ol-base.zip) export those recordings without
  resimulation. Inspect requested and achieved physical posture in the player
  panel. All 12 endpoints are live inspection censors, not credited gains.
- `current-runs.json.gz` contains all 144 current run outcomes/contact windows;
  the parent is `../strike-contact/current-runs.json.gz`. Mean credited gain
  2.13→1.37 yd, median .80→.89, stuffs 33→35, 10+ yd runs five→two. All concepts
  and adverse rows remain. These changes alone do not establish better physics.
- `current-tackles.json.gz` contains 64 encounters whose payloads match the
  parent exactly except collection timestamp/source. Fourteen primary cases
  are live inspection censors, not misses. `current-games9.json` contains two
  measured games with one warm game excluded. Both have zero physical timeouts,
  lower-hold releases or motor-work excess. Later game calls/draws diverge;
  outcomes and concurrent diagnostic timings are not calibration or benchmarks.
- `base-before-tests.log` retains the intentional seven-failure/eight-pass
  oracle. `focused-tests.log` has 68 passes; `tests.log` has all 621 TypeScript
  tests; `python.log` has 22 Python tests. Empty successful typecheck/build logs
  are paired with exit codes in `verification-manifest.json`. Browser/export
  integrity reports cover all clips and the byte-exact ZIP/HTML pair.

An acquisition label is not delivered force. First actual loads are observations
within 50-ms bins, not precise onset times, continuous support or block wins.
Pooled unengaged samples include reapproaches. Center-of-mass/pad heights are
model proxies, not measured 3D anatomy. Availability of 1 at first load does
not show a guaranteed successful recovery later. Last frame label 2.95 s and
completed physical endpoint 3 s retain the production recording convention.
First-carrier-contact fields in the broader run collector sometimes describe
a defensive fumble returner and must not all be called RB yards-before-contact.

## Reproduce

Use the pinned Node 22.23.3 toolchain and installed dependencies. Keep sources,
fixtures and tool files fixed. Run the full suite separately from heavy
diagnostics; the saved games were safety guards, not a speed benchmark.

```sh
node --import tsx scripts/diag/ol-base-review.ts out/ol-base-review/current
node --import tsx scripts/export-ol-base.ts data/reviews/physics-world/ol-base/before-film.json.gz data/reviews/physics-world/ol-base/after-film.json.gz out/ol-base-review/reproduced.html
node --import tsx scripts/diag/run-contact-review.ts out/ol-base-review/current-runs.json
node --import tsx scripts/diag/tackle-timing-review.ts out/ol-base-review/current-tackles.json.gz
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/ol-base-review/current-games9.json 9 --games-only
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
python3 data/reviews/physics-world/ol-base/transfer-validation.py
python3 data/reviews/physics-world/ol-base/verify-evidence.py --engine
```

For the before/after panel, archive this publication's commit into an ignored
scratch checkout, reuse installed dependencies and run the collector twice.
In the before scratch root replace only `src/sim/behaviors/blocking.ts` with
the retained `blocking-before.ts`. Verify the collector's source equals
`623b1c16…` before and `ac876d56…` after. Do not substitute a later engine HEAD
or alter the live checkout. The first commit adding this evidence folder is
the publication snapshot. The exact collector reuses fixed seeds; the original
full raw files remain in ignored output and are reproducible from that snapshot.

Given regenerated full `INPUT/before/raw.json.gz` and `INPUT/after/raw.json.gz`:

```sh
python3 data/reviews/physics-world/ol-base/compare-panel.py INPUT
python3 data/reviews/physics-world/ol-base/pack-traces.py INPUT/before/raw.json.gz OUTPUT-before.json.gz
python3 data/reviews/physics-world/ol-base/pack-traces.py INPUT/after/raw.json.gz OUTPUT-after.json.gz
```

These tools transform saved measurements only. Collection timestamps and
gzip container hashes may differ on regeneration; compare decoded measured
payloads separately from original byte-level provenance. `transfer-validation.py`
checks pinned saved baseline/current inputs, observer controls and finite values,
then writes `transfer-validation.json` without simulation or NFL fitting.
`verify-evidence.py` checks archived hashes, paired profiles/contexts, actual
first-load posture means, fixed trace/film selection and the ZIP. Its optional
`--engine` verifies this publication's exact current and reconstructed parent
source; omit that flag when inspecting saved evidence after later engine edits.

Optional film smoke reproduction uses Python Playwright and local Chromium;
external font requests are blocked and no network data is required:

```sh
python3 data/reviews/physics-world/ol-base/film-check.py data/reviews/physics-world/ol-base/before-film.json.gz data/reviews/physics-world/ol-base/after-film.json.gz viewer/ol-base.html out/ol-base-review/film-checks
```

It checks saved telemetry/positional packing, all 12 browser clips, filters,
player inspection, mobile layout, and regenerates the deterministic ZIP.
