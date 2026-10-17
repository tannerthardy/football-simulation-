# Two-point energy persistence

2026-10-16 (America/Phoenix). Candidate for review on `codex/two-point-effort`,
independent of Physics #120. Exact accepted/fetched base:
`d682b1f474cb6ba260a7b8b1119a62919c5a2159`.

`Game.twoPointTry` passes persistent energy into the snap but discards the
participants' resulting energy. Ordinary scrimmage already writes it back.
The one-line correction applies that same all-agent writeback after the try,
for both teams and either outcome. Recovery, score handling, capacities,
World and runtime settings remain unchanged.

The hook-only public touchdown→try reproducer fails on accepted defaults for
both successful and failed tries; its ordinary-scrimmage control passes.
Afterward all3 focused checks pass, including22 participants, bench exclusion,
existing recovery and official score/ending. No live snap or game is run.
Tests and root/independent read-only review support this bounded correction.

Node22.23.3,44 flags/components1, CF_FLOW unset. Candidate source
`a0bdc872ca8d4812251603c233ce553abeea249955c365a55a360efa2445c354`.
[Original failing receipt](../../data/reviews/current/two-point-energy.json)
(2.564385s) and [passing receipt](../../data/reviews/current/two-point-energy.json)
(2.459667s), total5.024052s; both preserve unchanged inputs.
Reproduce with the baseline runner and `npx vitest run --project core
test/two-point-energy.test.ts`. No full suite, game, typecheck or broader fatigue
retune; Integration owns the exact combined verification after review.
