# Live held-recovery evidence

Read [the implementation and cost decision](../../../../docs/reviews/force-coupled-held-recovery.md)
and [results.json](results.json). This is a production repair using a single
massless corrective coordinate only during valid low holds. It does not enable
the inertial/spatial foot research or add an anatomical gait model.

## Sources and cohorts

- Baseline: production `src` at commit `fb3da0a`, SHA-256
  `150d8ed430ec7321c9927cf967eb35824a01c721661e479edd18ec7813c07ff5`.
- Candidate: SHA-256
  `43ff53ab75d3deb3d6570ea067fd82265b4c8fc1c21fe0fed547c1031ab49edf`.
- Source hashes use `scripts/source-version.ts`. Diagnostic script hashes are
  retained separately in [verification.json](verification.json).
- Hand fight: seeds 3/7/11, rusher power .7/1/1.4, physics subdivision
  6/12/24/48/96/192; technique remains 20 Hz. Native comparisons use 12 and
  refined reference 192. Twelve frontal tackles span the same subdivisions.
- Shared capabilities: five tasks, four physical profiles, two mirrors and
  three subdivisions (120 rows). All rows are identical before/after.
- Scenario pack: ordinary technique/controllers, both mirrors. The raw pack
  has no embedded source hash; the producing source and script are pinned here.
- Stationary support: initially still, freely moving bodies, capacities
  absent/0/1/50/900, one or four claims, subdivisions 12/48/192. Both explicit
  support modes are retained; select `legacy` for the production comparison.
- Games: one generated roster pair, seed 9; one excluded warm game, two
  measured games. Roster SHA and all game seeds match between reports.
- Inspection: six full-state controlled fixtures, `LAB-P001` through `006`.
  Download [inspection-room.zip](../../../../viewer/inspection-room.zip), extract
  it, and open the HTML. It works offline. These fixtures are not played games.

## Rerun

Use Node 22 with installed dependencies. Run from the repository root:

```sh
node --import tsx scripts/diag/hand-convergence.ts out/held-recovery/hand.json
node --import tsx scripts/diag/shared-capabilities.ts out/held-recovery/shared.json
node --import tsx scripts/diag/virtual-foot-support.ts out/held-recovery/support.json
node --import tsx scripts/scenario-pack.ts out/held-recovery/scenarios.json
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/held-recovery/football.json 9
node --expose-gc --import tsx scripts/diag/held-recovery-football.ts out/held-recovery/cost.json 9 --benchmark-only
node --import tsx scripts/export-inspection.ts out/held-recovery/inspection.html
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.json
python3 -m unittest discover -s test -p 'test_*.py'
python3 scripts/check-replay-viewer.py out/held-recovery/inspection.html
```

Historical baseline reruns require a separate checkout of `fb3da0a` and the
current `held-recovery-football.ts` diagnostic copied into that checkout.
The API label `legacy` now means improved production behavior, not the old source.
Never edit source or the diagnostic while a measured process is running.

## Measurement limits

The cost reports use identical scripts and fresh 22-body inputs, exclude
construction and three warm fixture blocks, and measure seven blocks of
400 World ticks each. Explicit GC happens after fixture allocation and before
timing. Both are benchmark-only processes: do not compare these with the
embedded game-warmed benchmarks. Process load and GC still introduce noise.
Serialized command metadata omits the Node `--expose-gc` startup flag;
`allocationGcBeforeBenchmark=true` records its use in both cost reports.

The baseline game report precedes the benchmark-only/GC options and has a
different script hash. Game generation, summary and observer semantics are
unchanged. Use the dedicated cost pair to assess solver cost; full-game
histories diverge and cannot isolate it. Benchmark-only physics has no observed
game ticks; zero-initialized maxima there are not physics evidence.

The multi-grip stress fixture fails the provisional cost budget (+33.5% CPU,
+34.8% p95). Ordinary movement/trench costs remain within budget. The small
game sample worsens rushing stuff rate and interceptions. These results are
retained rather than tuned away. No claim of NFL calibration or final physics
readiness is made.

`maxHeldRecoveryExcursionYd` is accumulated correction-chart distance before
rebasing, not anatomical foot displacement. Rebasing preserves actual contact
points and dynamics. Only actual attachment range losses count as
`lowerHoldReleases`. Force capacities are model assumptions, not measured NFL
grip strengths. Inspect surviving contacts, postcontact rushing and pursuit
before expanding support state.
