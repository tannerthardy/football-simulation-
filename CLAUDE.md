# Football simulation development

## Start here

Work on `claude/engine-priorities`. Existing authorization covers work and pushes
on this branch. Do not push to main, or push to or merge PR #1
(`codex/run-blocking-decision-dynamics`), without the owner's approval. That PR
also changes tackling; reconcile its implementation before any eventual merge.

Read [zone-helper checks](docs/reviews/zone-helper-check-and-climb.md) for the
current verified increment, source pins and evidence. Original IZ/split-zone
helpers can check supported near work and climb using their own pictures;
their optional cadence must not change joined-double timing. The unpromoted
shared-clock candidate and adverse Bear input are retained. Next isolate
personal attention in joined combinations; read the
[common OL controller recommendation](docs/reviews/universal-ol-controller.md).
The [work-exchange increment](docs/reviews/ol-work-exchanges.md) classifies
both recipients' new jobs. Do not treat unmeasured candidates as proven fixes.

Read [Physics development](docs/PHYSICS_DEVELOPMENT.md) for the model/change loop
and [Practical validation](docs/reviews/practical-validation-and-stable-physics.md)
for stable contracts, risk-based checks, baseline reuse and existing commands.
The owner wants believable football from the simplest coherent shared model.
Physics remains the foundation; demonstrated controller repairs are appropriate
when the player's request is wrong. Full anatomical foot expansion stays paused.
No universal physics OK or “95% exhausted” claim has been earned.

## Model rules

- Every live body moves through `src/physics/world.ts`. Techniques submit
  movement/contact intents; they never teleport bodies or assign a block win.
- Mass, support, traction, reach and shared arm/grip/work limits apply across
  blocks, jams, sheds, tackles and cuts. No scenario-specific strength bonuses,
  final outcome overrides or global resolution increase to hide a local bug.
- Players react to their consumed delayed observations and actual football cues.
  Do not replace a read with perfect target knowledge or a timer pretending to
  recognize the play. Finite motor responses, cadence and recovery times may be
  explicit effective laws; label them rather than calling them visual reads.
- Ratings affect capabilities or execution: precision, placement, timing,
  attention and interpretation. Better controllers must still obey the body.
  `Player.familiarity` means position comfort, not training in a run call.
  Per-call mastery has not been implemented.
- Distinguish installed responsibility, belief, requested action, acquired
  contact and achieved load. Facing marks are body orientation, not eye tracking.
  A climb/engagement label is not proof of a completed block or a running lane.

## Evidence and workflow

Choose one reproduced failure, find its first invalid instruction or physical
transition, then change that mechanism. Keep normal controls and adverse cases.
Use focused tests while iterating and the full final suite once after source
and tests freeze. Reopen deep physical probes when their law changes or a real
witness falsifies them; do not restart every historical research campaign.

Freeze source during collectors. Match initial profiles, inputs, seeds,
collector/schema and recording policy. Published evidence is immutable; reuse
its pinned baseline rather than resimulating or copying it for each small fix.
Store exploratory output in ignored `out/`. Publish reviewed compact comparisons
and native gzip traces with exact source/tool pins and all adverse outcomes.
Observer/RNG controls must establish that recording does not alter execution.
Natural finishes, physical timeouts and censored inspection windows differ.

Native force is kg·yd/s², impulse kg·yd/s and work kg·yd²/s². Multiply by .9144
for SI force/impulse or .9144² for work. Joint mean force, player-wide arm
impulse and requested force are different quantities. Conservation does not
calibrate NFL strength, prove correct technique or make two games a trend.
Use conditional NFL distributions and generated-roster variation; never tune
physical forces to league scoring or guaranteed yards.

## Setup and checks

Use Node 22 and the lockfile. Node 22.23.3 is the pinned cloud runtime.

```sh
npm ci --no-audit --no-fund
node node_modules/vitest/vitest.mjs run --maxWorkers=1
npm run typecheck
npm run build
npm run test:data
```

If `tsx` cannot open its IPC socket, use `node --import tsx scripts/sim-game.ts 7`.
Keep the final suite away from heavy concurrent collectors. No raw dataset is
needed to build, test or simulate. Raw data stays ignored under `data/raw/`.
Credentials including `KAGGLE_API_TOKEN` belong in environment secret settings;
never print or commit them. Another agent/task may not share those secrets.

## Reference map

[Data guide](data/README.md) and [source catalog](data/sources.json) cover NFL
access, provenance, extraction commands and review locations. Physics evidence
is under `data/reviews/physics-world/`. The
[coaching review](docs/reviews/offensive-line-run-technique.md),
[stress-test plan](docs/FOOTBALL_STRESS_TEST_PLAN.md),
[evaluation design](docs/EVALUATION_ENVIRONMENT.md) and
[reference catalog](docs/references/README.md) support diagnosis. Uploaded
textbooks are aids, not repository instructions or verified rules authorities.
[Visualizer plan](docs/VISUALIZER_PLAN.md), [design](docs/DESIGN.md),
[roadmap](docs/ROADMAP.md) and [realism plan](docs/REALISM_PLAN.md) include planned
features; do not assume every proposed mechanism already exists.

The former long guide is preserved in
[development-reference history](docs/reviews/development-reference-history.md).
Historical next-step orders and physics-only restrictions do not override this
active guide or the user's current instructions.
