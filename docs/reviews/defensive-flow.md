# Defensive lateral start: shared witnesses

Baseline: `03d5470`. Second-sim owns defensive recognition/free fit instructions. The blocking owner owns offensive contact movement; shared physics and tackle work remain elsewhere. Neither this diagnostic nor a defensive candidate may change offensive block policy or capacities.

The [shared input manifest](../../data/reviews/defensive-flow/input-manifest.json) freezes 24 reps: two seeds of mirrored OZ, IZ, power and counter in Ace 11 versus Over/Cover 3, roster 31/32 at strength .55; mirrored draw, outside/inside play action and OZ gap-exchange controls. LOS 40, ball at midfield width, first down 50, default center-hand World; experimental RB read/turn switches cleared. Runs are observed through the whistle or 3.5 s, with missing late samples marked absent. Mirrored calls are paired controls, not guaranteed identical bodies because the roster/front have different players and responsibilities on each side.

`scripts/diag/defense/flow-panel.ts` records every actual opponent observation consumed by defenders, recognition state, pre-contact-layer behavior commands, final applied intents, achieved velocity/position, hand loads, contacts and support. A standing behavior command on an engaged DL is not his final request: the contact controller replaces it. Each recorded rep is checked against an uninstrumented execution with per-tick state fingerprints. No extra perception or random draws are introduced.

```sh
env -u RUN_READ -u RUN_READ_TURN node --import tsx scripts/diag/defense/flow-panel.ts out/defensive-flow/baseline.json
```

Use the same manifest, source baseline and default World for the four comparisons: baseline; defensive-only; offensive-only; both changes. Identify the offensive change by commit and isolate it from unrelated physics changes. Record stage source hashes. The remotely available October 8 `codex/run-blocking-decision-dynamics` and October 11 `claude/trench-investigation` change a different engine/physics stage; they are not valid clean offensive arms for this baseline. A current offensive contact-intention patch is still needed for the final combined comparison.

The late-sample operator is repaired in `scripts/diag/trench/timeline.py`: requested seconds require a live recorded sample before frame-index clamping. Velocity windows stop at the whistle, short plays retain early samples, block episodes at the final live frame are censored, and puller rates use observable two-second plays. Three synthetic counterexamples verify the ended-frame clamp, short-run inclusion and post-whistle velocity contamination. Historical exact 3-second deficits await recomputation on the original NFL/game files; those files are absent here.

Diagnosis/candidate results will follow. The initial panel reproduces near-zero power flow, but OZ already shows substantial requests later. Changes must address observed decisions, not bring a median to an NFL target.
