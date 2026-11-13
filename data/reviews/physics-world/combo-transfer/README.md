# Keeper-based OL combination work: evidence and rerun

Read [the implementation review](../../../../docs/reviews/keeper-based-combination-work.md)
and [the zone/gap coaching review](../../../../docs/reviews/offensive-line-run-technique.md).
Watch [20 paired clips](../../../../viewer/combo-transfer.html) or download the
[offline ZIP](../../../../viewer/combo-transfer.zip). Stable `CT-…` references
identify ten predeclared inputs shown with both sources. Focus on a member to
inspect actual keeper versus installed role, the delayed picture, support,
existing hand identity and the next completed solve. No outcome filtering.

## Scope and source

Baseline commit `a4068854079e4a875c0c8d89d542d65d368a194d` has full engine-content
SHA `cf53e3f0e72915d9798ed0cd411f669ae8bba40db9ed4bd9f6b630173f939316`.
Final source SHA is
`ff641a802030edddaa1eac42b8d0991b4cba43dd9f4fa0f3ef45ee3dd3bcfbac`.
Only `src/sim/behaviors/blocking.ts` changes. World remains
`4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.
Physical capabilities, contact budgets and resolution remain unchanged.

The ordinary panel is **one** .55-strength generated roster pair, seeds 31/32:
IZ, OZ, WZ, Power, Counter, Trap, Duo and Split Zone × Over, Under, Odd, Tite,
Bear × both sides × play seeds 3/11 = 160. Split uses Gun Wing 12; others use
Ace 11. Cover 3, LOS 40 and the remaining inputs stay fixed. Two separately
labelled older inputs use roster 41/42; they are excluded from ordinary results.
All 162 matched initial projections agree, all 324 observed/plain execution
signatures agree, and all inputs finish naturally. A balanced diagnostic panel
is not a natural NFL concept/front distribution or a representative roster pool.

## Findings and limitations

The old blanket helper-support veto can trap an unnecessary helper while the
primary carries sound loaded contact. Departures now validate the keeper's own
support, useful real hands and fit. Both real helper promotions preserve the
existing helper joint. The old primary's cloth grab is released on promotion;
previously recorded holding remains assigned to its original player.

Ordinary climbs change 68→118; keeper joint identity after controller and solve
changes 65/68→118/118. All 118 final keeper pairs transmit positive native force.
Only 102 have OL delivered-load rows; 16 are Y tight ends with native joint force
but **no recorded OL arm impulse**. Per-body arm impulse includes all hands
and strikes; do not attribute it solely to a surviving joint.

Ordinary mean gain changes 1.307→1.389 yd, stuffs 31→37, 10+ runs 1→1 and OL
falls 12→13. One ordinary pair loses ≥2 yd, seven gain ≥2 yd. Duo Odd/right/S3
falls 7.39→2.70 yd: its later adjacent DL/LB exchange retains the wrong old
techniques, a separate shared controller defect. Nine old positive runs become
stuffs and three old stuffs clear. The supplemental OZ Over/left/S11 touchdown
70 yd becomes a 28.49-yd tackle. All adverse results remain recorded.

The separate 144-run three-roster guard changes 1.696→1.789 yd, stuffs 33→36 and
10+ runs 2→3. It verifies seven observed/plain controls per phase. All 64 isolated
tackle rows are exact. Two game guards end without physical timeouts or budget
excess, but scoring rises and paths/calls diverge. This supports improved
transition mechanics, not an overall efficiency claim or isolated passing gain.
Concurrent collection timings are not a performance benchmark.

Two transfers immediately change the climber's target again in the same
controller update (Power Odd/left/S3 LT and Trap Bear/right/S3 RT). Their Y
keepers retain real hands, but a transfer event does not certify a completed
second-level job. Existing shared attention, subsequent target/job coherence
and approximate engagement control during promotion remain limitations.

The 17 new tests use actual contact/World steps and delayed perception. The
baseline fails 10 feature cases and passes 7 controls. Higher recognition reads
a moving backer sooner while preserving horizontal physical capacities; its
observation latency deliberately differs. It does not guarantee yardage. Current
player familiarity is position comfort; no per-call training mastery exists.

All 749 TypeScript tests and 22 Python tests pass; typecheck and build pass.

## Files

- `before.json.gz` / `after.json.gz`: all 160 ordinary and 2 supplemental initial
  projections, naturally completed outcomes, actual scheduled combination
  reads, contact/support/hand IDs, consumed images and next-solve ownership.
  Matching `*-film.json.gz` archives contain the ten fixed full films per source.
- `comparison.json`: all paired outcomes, independent OL versus all-keeper
  native-load scope, continuity, conservative helper-veto reads and adverse pairs.
- `engine.patch`: exact change from the pinned baseline for source reconstruction;
  research provenance, not a patch to apply over the current engine.
- `saved-audit.py` / `.json`, `native-findings.md`, `teaching-review.md`: original
  saved 12-film diagnosis and coaching hypotheses. The optional-post proposal
  was deferred in favor of the clearer reproduced keeper defect.
- `current-runs.json.gz`, `current-tackles.json.gz`, `current-games9.json`:
  unchanged-input guards; their baselines remain in `../zone-reach/`.
  `compare-guards.py` / `guard-comparison.json` retain all adverse run pairs.
- Check logs and `checks.json`; `concurrent-tests.log` retains the first full
  run's worker-RPC timeout while heavy collectors ran. No source change was
  made for the single-worker rerun.
- Film/browser checks and `verify-evidence.py` / `verification-manifest.json`:
  independent immutable evidence verification and source/tool/document pins.
  Default checks historical evidence; `--engine` additionally checks current code
  and reconstructs the recorded baseline source by reversing the exact patch.

Native force is kg·yd/s², impulse kg·yd/s and work kg·yd²/s². Convert to SI with
.9144 for force/impulse or .9144² for work. Joint force is a tick mean; arm
impulse is player-wide accounting. A released assignment or technique intention
does not certify contact, a reached linebacker or a successful running lane.

## Rerun

Use Node 22.23.3 and the repository's installed dependencies. Write new runs to
ignored output paths and keep these published records immutable.

```sh
node --import tsx scripts/diag/combo-transfer-review.ts out/combo/new.json.gz
python3 scripts/diag/compare-combo-transfer.py data/reviews/physics-world/combo-transfer/before.json.gz out/combo/new.json.gz out/combo/new-comparison.json
node --import tsx scripts/diag/run-contact-review.ts out/combo/new-runs.json
node --import tsx scripts/diag/tackle-timing-review.ts out/combo/new-tackles.json.gz
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/combo/new-games9.json 9 --games-only
node node_modules/vitest/vitest.mjs run --maxWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
python3 data/reviews/physics-world/combo-transfer/verify-evidence.py --engine
```

The combo collector creates a matching `new-film.json.gz` automatically and
retains real scheduled reads with next-solve ownership. Native arrays stream
through gzip to avoid constructing an oversized JSON string. The run-contact
guard writes plain JSON regardless of suffix; the published copy is compressed
with identical decoded content. Baseline collection uses an archive of the
pinned commit, the same collector and installed dependencies. Confirm full
source hashes before collection; never replace live source under a collector.

Saved-film export and checks do not simulate:

```sh
node --import tsx scripts/export-combo-transfer.ts data/reviews/physics-world/combo-transfer/before-film.json.gz data/reviews/physics-world/combo-transfer/after-film.json.gz out/combo/replay.html
python3 data/reviews/physics-world/combo-transfer/film-check.py data/reviews/physics-world/combo-transfer/before-film.json.gz data/reviews/physics-world/combo-transfer/after-film.json.gz out/combo/replay.html out/combo/browser
```

The browser test requires Python Playwright and Chromium and may use a local
HTTP server when file URLs are blocked. Unzip the published viewer to watch
offline; the video control exports a small clip of the selected play.
