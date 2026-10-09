# Shared grip budget: reviewed evidence

Read [the physics handoff](../../../../docs/reviews/grip-budget-and-replay-foundation.md)
and [the replay handoff](../../../../docs/reviews/replay-telemetry-and-export.md).
Physics is **NOT READY**. Baseline commit `60c149b`, engine source
`0f6b4078a3857a2f4664d2e4d91176ccfb252dbcc836c498a3bafdfa32792df7`.
Final engine source
`23fd4c510883618b454f75354cfafcd7540c0b6c08de0c4906358cb1e9769296`.
Source hashes cover lexically sorted `src/` path strings and bytes (NUL
separators), not docs, scripts or HTML. The manifest separately hashes them.
No physical constants/profiles or outcomes were fitted.

## What is retained

- `grip-budget-before/after.json`: actual delivered active reel and passive
  normal/tangential grip vectors at each physics substep. Nine isolated
  capacity/resolution trials plus nine redirect seed/power fixtures at three
  resolutions. Artificial profiles and units are specified in the probe.
  The first 32 excess samples are retained before; totals include all sampled
  substeps. Max force is instantaneous substep impulse divided by duration,
  distinct from the public interval-mean joint force. The diagnostic's active
  lookup groups by body pair; these fixtures use one hold per pair. Duplicate
  holds are covered independently by the delivered-total contract test.
  Missing football sample fields mean no grasp was formed, not zero measured
  force. Momentum/work residuals can close while force limits fail.
- `hand-convergence.json`: all nine real-controller fixtures, six solver
  resolutions, native 12 vs 192 closest-path mean/max 0.206/0.822 yd and two
  fall disagreements. At 24 steps fall disagreements regress one→two; 48/96
  have zero. The prior baseline is in `../traffic-and-man-accounting/`.
- `grasp-support-before/after.json`: identical 192-step first-wrap setup
  (all bodies/profiles/support, intents and joints), eight fixed-input world
  ticks per resolution, selected actor samples, conservation/work residuals;
  plus real-controller pre/post-wrap resolution switches. The frozen input
  trials exclude football decisions, stochastic execution and officiating;
  they are not the original-play counterfactual. First-wrap setups are
  generated separately per revision and identical across resolutions within
  that revision. The switched trials preserve each real controller and its
  draw stream; changed physics paths can change later choices. The record's
  initial `since` fields can be null where JSON serialized negative infinity;
  recreate the setups using the probe rather than treating the JSON as a
  complete reusable PlaySim save. A finer solution is not physical truth.
- `shared-capabilities.json`: 120 mechanical reps across the same five tasks,
  four profile variants, mirrors and 6/12/48 substeps. Includes profiles,
  physical ledger/budget checks and convergence summaries. Useful transfer
  evidence, not an authentic technique/NFL validation claim.
- `scenario-pack.json`: the six owner interactions with real controllers and
  ordinary shared world. Physical directions/invariants, not outcome targets.
- `open-field[-before]-*.txt`: 40 ordinary controller reps per front, side,
  two-defender and trailing setup. Identical generation procedure/seeds.
  Side pursuit still never creates a wrap. Do not infer cause from yardage
  alone; this is a guard on controller transfer, not a grip-strength dataset.
- `kinematics.txt`, `calibration-16.txt`: four recorded tracking-style games,
  seed 5; sixteen games, seed 7, two generated eight-team leagues. Baseline
  reports are reused from `../traffic-and-man-accounting/` (same baseline
  engine hash). Noisy descriptive guards, not matched NFL play experiments
  or targets for tuning forces. Read the historical sack/rush definition
  defect and conditional-cohort limits in the handoff.
- `film-outcomes-after.json`: all non-nullified scrimmage film plays; counts
  and denominators for success, explosives, concept/front/coverage cells and
  event-based pass outcomes. Baseline is the preceding pass's **after** film
  report. Film teams/seeds are fixed, calling adapts, and trajectories change;
  these are unmatched descriptive cells. Pressure association is not a causal
  incompletion label. Fresh G/P paths differ from the prior film version.
- Verification/export/browser logs: final commands, actual downloaded WebM
  decoded with ffprobe, backward compatibility, offline/mobile behavior and
  packaging. Original uploaded coverage Markdown remains byte-for-byte in
  `docs/references/`; it is not a physics validation source.

Runtime logs were collected under varying concurrency, so elapsed times are
not controlled performance comparisons. Raw large exports and prototype
experiments remain ignored in `out/`; only reviewed evidence is retained.

## Reproduce current results

Use Node 22, installed npm dependencies, Python, Playwright, Chromium and
ffprobe. From the repository root:

```sh
node --import tsx scripts/diag/grip-budget.ts out/grip-budget.json
node --import tsx scripts/diag/grasp-support-convergence.ts out/grasp-support.json
node --import tsx scripts/diag/hand-convergence.ts out/hand-convergence.json
node --import tsx scripts/diag/shared-capabilities.ts out/shared-capabilities.json
node --import tsx scripts/scenario-pack.ts out/scenario-pack.json
node --import tsx scripts/diag/open-field-lab.ts 40 front
node --import tsx scripts/diag/open-field-lab.ts 40 side
node --import tsx scripts/diag/open-field-lab.ts 40 two
node --import tsx scripts/diag/open-field-lab.ts 40 trail
node --import tsx scripts/kinematics-compare.ts 4 5
node --import tsx scripts/calibrate.ts 16 7 2
node --import tsx scripts/export-replay.ts 7 --games 6 --telemetry standard --doc --out viewer/film-room.html
node --import tsx scripts/export-inspection.ts viewer/inspection-room.html
python3 scripts/film-outcomes.py viewer/film-room.html --out out/film-outcomes.json
python3 scripts/check-replay-viewer.py viewer/film-room.html --video-out out/film-clip.webm
python3 scripts/check-replay-viewer.py viewer/inspection-room.html --video-out out/inspection-clip.webm
npm test
npm run test:data
npm run typecheck
npm run build
```

For baseline grip/wrap probes, archive `60c149b` under ignored `out/`, link
the installed `node_modules`, and copy the current two new probe scripts into
its `scripts/diag/`. Run there; their source hash must match the baseline
above. The unchanged baseline open-field script can run directly. Do not
check out old code over the current branch or combine baseline and final
measurements. Existing baseline game/film/hand logs are already retained and
need not be rerun just to duplicate them.

Each ZIP contains its corresponding standalone HTML byte-for-byte. The full
inspector is a small, labeled set of generated LAB fixtures, not a film-game
or NFL sample. Main standard detail is for browsing the game library; the
replay handoff specifies the exact channels, causal gaps and format limits.
