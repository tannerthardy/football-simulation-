# Bounded run-block contact fits

Read [the broad review, implementation and priorities](../../../../docs/reviews/run-block-fit-and-current-priorities.md).
Parent commit: `ab1d4a9ff39d27719d6faca3a02cae3931747be4`.

Before engine source: `ac876d5633b8172b7622ba65ec0579de56054df9a80c571a69e1da14b146e29c`.
After engine source: `ad945eb091cb8a699dbff4f020ed183266e492a18f5afb585716d3acaf958aeb`.
Source hashes use sorted `src/` paths, NUL, file contents, NUL as defined in
`scripts/source-version.ts`; they are not Git commit hashes.
Only `src/sim/behaviors/blocking.ts` and new `src/sim/run-block-fit.ts` change
the engine. `blocking-before.ts` retains exact parent bytes; omit the new
helper when reconstructing the parent. World bytes and player capacities are
unchanged. Both versions already use the preceding `.7` OL base request.

## Retained evidence

- Baseline traces/film are `../ol-base/after-traces.json.gz` and
  `../ol-base/after-film.json.gz`. These are the low-base baseline, **not** that
  report's earlier missing-posture version. `after-traces.json.gz` and
  `after-film.json.gz` here preserve the new candidate.
- The unchanged `ol-base-review.ts` collector uses 24 fixed ordinary 11v11
  Ace/4-3 Over/Cover 3 inputs: six concepts, two generated roster pairs,
  both flips, seed 3, 20-Hz decisions, three-second inspection. All 24 initial
  contexts/profiles, first acquisitions, first loads, summaries, endpoints and
  invariants are archived. Detailed tick traces and full film are retained for
  the six predetermined R1 unflipped calls; the other 18 tick traces are
  reproducible and their original raw SHA is retained. Formation flips are
  input controls, not exact physical mirrors.
- `comparison.json.gz` includes every case, all successful acquisitions, actual
  first-load records, all OL/defender force summaries and adverse changes.
  Counter's four endpoint signatures are unchanged. The highlighted WZ LT
  first load stays .55–.60 s; hand bins change 4→15, body 2→11, strikes 4→2.
  All-OL first-load coverage changes 116→115; first-level subset 95→94.
  Two lost loads are late combo-plan strike-only contacts, one late load is
  gained, and five other first loads delay by one bin. OL falls remain 2→2;
  all falls 28→26 with two individually worse cases retained. Maximum overlap
  .01502→.01889 yd remains visible.
- Force windows are 50-ms reports, **not continuous contact duration**. Hand
  sums use absolute net reported normal/tangent joint impulses, body sums
  nonnegative normal impulses, and strikes use net vector norms. They do not
  reconstruct substep absolute force or prove leverage, sustainability or wins.
  Acquisitions 210→176 and lost-angle acquisitions 69→36 are partly the direct
  consequence of the new observed-commitment gate, not independent validation.
  Requested commands in the collector are final post-spacing World requests.
- The [HTML](../../../../viewer/block-fit.html) and
  [offline ZIP](../../../../viewer/block-fit-film-room.zip) embed six baseline
  and six candidate recordings, exported without resimulation. Every endpoint
  is live at the three-second inspection limit; there is no credited gain or
  synthetic whistle. The final sample label remains 2.95 s, while the completed
  physical endpoint is 3 s. Full telemetry and events are retained; ordinary
  position/facing packing alone is quantized. Inspect the LT's target, intent,
  physical posture and block contact. Body-facing ticks are not eye tracking.
- `current-runs.json.gz`, `current-tackles.json.gz`, `current-games9.json` pair
  with the same names in `../ol-base/`. `transfer-validation.json.gz` retains all
  144 run cases, recorded RB profiles, finish/contact changes and adverse gains.
  Mean credited gain 1.366→1.327 yd, stuffs 35→38, two 10+ yd runs each; WZ
  mean 1.72→1.04 yd is an adverse result. All 64 tackle payloads match except
  source/time; 14 primary encounters remain live, not forced misses. Two games
  have no physical timeouts, lower-hold releases or motor-work excess, but later
  calls/draws differ and passing is still too explosive. Game timing is omitted
  from the comparison. These are regression guards, not NFL calibration.
- `cost-before.json` / `cost-after.json` use identical tool/input/profile bytes
  with observers and recording disabled: six excluded warmups, 24 inputs twice,
  forced GC outside timing, including roster construction and endpoint hashes.
  Sequential idle measurements are roughly equal (5.03 vs 4.92 s total wall;
  104 vs 105 ms median). `cost-rejected-forecast.json` retains the +54% wall
  prototype measurement. That temporary implementation was not archived and
  cannot be exactly reconstructed from this publication. Do not treat it as a
  reproducible shipped alternative or infer full-game overhead/significance.
- `coverage-cap-witness.json` and its diagnostic preserve a staged false deep
  roof discovered during the broad review. Actual support is labelled apart
  from consumed observations; this is not natural incidence or a shipped fix.
- `tests.log` has all 635 TypeScript passes; `python.log` has 22 Python passes.
  Successful empty typecheck/build logs have recorded exit codes in the
  verification manifest. Browser/integrity reports cover all 12 offline clips,
  filters, inspection, mobile layout and the byte-exact ZIP/HTML pair.

Collector: `683005a74c0462ebdaed263d1de00acf7eec48a6845f7509c1789c261972041c`.
Inputs: `e03399f4b723f7ea760ad9fb3888258d2eedc4b196e7f6bb5d7881f23a07798a`.
Profiles: `646e4407f85925518031970843f3014b8c295d6d6fb63f657b5acd85cf4f272d`.
All six recorded/unrecorded observer controls per phase match endpoint bodies,
decision state and RNG. No new vision queries or outcomes are selected.

## Reproduce

Use Node 22.23.3 and installed dependencies. Run the full suite separately from
heavy simulation. These commands use the publication's exact engine/tool bytes:

```sh
node --import tsx scripts/diag/ol-base-review.ts out/block-fit/current
node --expose-gc --import tsx scripts/diag/run-block-fit-cost.ts out/block-fit/current-cost.json
node --import tsx scripts/export-block-fit.ts data/reviews/physics-world/ol-base/after-film.json.gz data/reviews/physics-world/block-fit/after-film.json.gz out/block-fit/reproduced.html
node --import tsx scripts/diag/run-contact-review.ts out/block-fit/current-runs.json
node --import tsx scripts/diag/tackle-timing-review.ts out/block-fit/current-tackles.json.gz
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/block-fit/current-games9.json 9 --games-only
node --import tsx scripts/diag/coverage-cap-review.ts out/block-fit/coverage-cap-witness.json
node node_modules/vitest/vitest.mjs run --maxWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
python3 data/reviews/physics-world/block-fit/transfer-validation.py
python3 data/reviews/physics-world/block-fit/verify-evidence.py --engine
```

For a fresh paired panel, archive this publication's commit into ignored
scratch checkouts and reuse installed dependencies. In the before scratch
root, restore `blocking-before.ts` over `src/sim/behaviors/blocking.ts` and
remove `src/sim/run-block-fit.ts`; do not change the live checkout. Verify
source hashes `ac876d56…` before / `ad945eb0…` after. Collect both with the
same `ol-base-review.ts` bytes. The first commit adding this folder is the
publication snapshot. Keep cost measurements sequential with other heavy work
idle; each version warms its own process.

Given full regenerated raw/film outputs, compare and pack the candidate:

```sh
python3 data/reviews/physics-world/block-fit/compare.py BEFORE/raw.json.gz AFTER/raw.json.gz OUTPUT
python3 data/reviews/physics-world/block-fit/transfer-validation.py --candidate-dir out/block-fit
```

The raw comparison needs all 24 detailed traces; the compact archive omits 18
of them. Comparison and packing transform saved observations only. Container
hashes/timestamps can differ on regeneration; compare measured decoded payloads
as well as original-byte provenance. `verify-evidence.py` checks archived asset
hashes and paired measured contexts. Omit `--engine` when inspecting saved
evidence after later engine edits.

Optional offline browser validation uses Python Playwright/local Chromium,
with font/network requests blocked:

```sh
python3 data/reviews/physics-world/block-fit/film-check.py data/reviews/physics-world/ol-base/after-film.json.gz data/reviews/physics-world/block-fit/after-film.json.gz viewer/block-fit.html out/block-fit/film-check
```

NFL gain rates and these generated-player means are not force calibration.
First-carrier contacts can include defensive fumble returners; do not label
every recorded contact as RB yards before contact. Keep all failed approaches,
live censors and adverse case rows rather than selecting only attractive clips.
