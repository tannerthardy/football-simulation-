# QB scramble rusher recording

The existing scramble transition now records the actual QB's player ID. This is one scalar assignment in `src/sim/behaviors/qb.ts`; no thresholds, movement requests, observation calls or random draws were added.

Current source: `8f8cf4b49052fae4dac2d7858b42aa6ddcd9bdd13fa3e541c5c41f03e344b15d`. Exact isolated baseline copy: `3cbabd8fbb1fb4fea34c6bb98725a97f3f6de175c0bb59bece69f3c1e7371a7f` from immutable `out/coverage-continuation/alley-v1`. The archive was not edited. The quarter-gather experiment is absent from both sources.

`test/qb-rusher-recording.test.ts`: **3/3 candidate tests pass**. Baseline: **2 pass / 1 expected failure**, the missing actual QB ID on a naturally occurring scramble. Full repository typecheck passes.

All cases use the real native PlaySim/World and generated rosters with ordinary 11-on-11 calls; no private QB transition or decision mock is used:

- Gun doubles four verticals versus Over Cover 3, team seeds 91/92 and play seed 0, naturally scrambles. A twin run with only the recorded rusher field suppressed produces identical full achieved bodies, controller requests and final physical intents on every tick, identical consumed `see` calls, identical RNG call count/state, and identical events/result after removing that one field. This is a recording-independence control; it does not assert zero observations or draws for normal football decisions.
- Same native call with play seed 1 naturally attempts an ordinary pass and retains no rusher ID.
- Native gun doubles inside zone with play seed 0 actually hands the ball to RB and continues to credit the receiving RB, rather than the QB.

All `src` uses audited: the successful handoff records its actual recipient (`playsim.ts`), the received backward pitch records its actual recipient (`playsim.ts`), and the designed QB keeper already records the QB (`qb.ts`). The scramble transition was the missing path. `game.ts` consumes rusher ID for rushing credit and ordinary run narration; the prior scramble QB fallback remains unchanged, so box-score credit is compatible. No physics, movement, perception or decision consumer reads `stats.rusher`.

Candidate/baseline logs: `qb-tests-candidate.log`, `qb-tests-baseline.log`; isolated typecheck: `qb-typecheck.log`. The final eight-game compatibility receipt establishes all 1,149 normalized native final snapshots, inputs, next RNG, scores and outcomes match; 54 overall scramble IDs were added. The separate 96-pass receipt retains identical outcomes/recorded state apart from 17 carrier IDs and their derived hashes. Final logs retain 1,108 passing TypeScript tests, 118 passing Python tests, typecheck and build. Only the new rusher output is normalized; external module WeakMaps remain outside the existing enumerable snapshot contract.
