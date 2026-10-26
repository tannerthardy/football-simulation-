# Parked: QB escape lanes, step 2 (Move 2)

This is a WIP patch, not a feature, and it is not wired to develop. The QB's `shouldScramble` asks the ball carrier's own evaluator (`BallCarrier.scout`) for a lane he could run if he tucked the ball now. It does that from his own pictures. A coverage defender gets a start lag until the QB's run shows outside the pocket box, which is pictured from his tackles. Offline, on forced-escape labels, it finds **44 real escapes, against 24 for the endpoint lane check**. It has **not** been replayed in whole plays.

- **Base:** the patch applies cleanly to `c2302d9` (#292, "The ball carrier scores lanes from his own pictures"):
  `git checkout c2302d9 && git apply research/qb-escape-step2/step2-wip-evaluator-scout.patch`
- **On develop it conflicts** in `carrier.ts` and `qb.ts`:
  - `carrier.ts`: #306 moved the threat list into `arrivalEvidence()`. #302 added the command trace and the `routes` record.
  - `qb.ts`: `shouldScramble` now reads `felt()`/`held()` pictures.
  - Porting means threading `seen` and the `lag` hook through `arrivalEvidence()`, and returning `gain`/`clean` next to the trace.
- **Evidence scripts and data** live outside the repo, in the project files `qb-escape-lanes/` (capture, replay, forced-escape labels `cf*.mts`, `search*.py`). The method: re-run each QB scramble consult with a scramble forced at that moment, and record whether the escape gains.

Next step: port the patch onto develop and replay it in whole plays (matched restage, k≥4 RNG-shifted replays per arm). Before then, check that the patch doesn't read hidden state.
