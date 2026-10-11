# Football simulation development

## Start here

Work on `claude/engine-priorities`. Existing authorization covers work and pushes
on this branch. Do not push to main, or push to or merge PR #1
(`codex/run-blocking-decision-dynamics`), without the owner's approval. That PR
also changes tackling; reconcile its implementation before any eventual merge.

Read [schematics and physics stress](docs/reviews/schematics-and-physics-stress.md)
first. It connects the offensive/defensive audits to bounded legal-install and
receiving-work repairs, actual call-role matrices, and the new native stress
panel. The first roof-only guard was withheld after exposing more missing
underneath goal-line work. The promoted guard also requires explicitly named
zone players; optional man preferences remain flexible. Motion/screens and
complete protection/hot contracts remain future installations, not lab features.
The [schematic-package chapter](docs/football-handbook/playcalling-and-schematic-packages.md)
provides inspected teaching examples. The [situational NFL pilot](docs/reviews/schematic-data-context-pilot.md)
supports conditional pass volume, not a universal desperation/deep-throw bonus.

Read [traffic turning and the football handbook](docs/reviews/traffic-turning-and-football-handbook.md)
for the preceding increment. Free teammates can gather when their achievable curved path conflicts;
the shared physical laws stay unchanged. Its native adverse case avoids a real
RB/RG impact while losing yards. Keep the mixed run/pass/game results visible.
The [original handbook](docs/football-handbook/README.md) separates inspected
coaching, measured evidence and proposals; do not implement every teaching as
a universal rule. The orientation pilot measures provider angle differences,
with current `o` semantics still provisional and no eye-tracking claim.

Read [position technique and awareness](docs/reviews/position-technique-and-awareness.md)
for the preceding audit: it separates controller defects, coaching hypotheses and physical
uncertainty across positions. Follow its final evidence, scope and next steps.
The installed cutoff shoulder uses unchanged shared physics and capacities.
Both delayed QB body-direction experiments and the RB entry prototype were
withheld; their tests/evidence remain available. Production coverage retains
the documented private-read shortcut until a better replacement is demonstrated.
Do not interpret contact labels or changed yards as proof of better football.
Body facing remains distinct from eyes.
The movement audit includes 72 source-pinned trials and explains why historical
NFL comparisons do not establish today's calibration.

[Joined-combination attention](docs/reviews/joined-combination-attention.md)
records the preceding increment: personal reads, self-owned climbs and real
keeper contact. The old command-local collector misses prepass decisions;
use whole-play events and common native witnesses. The
[common OL controller](docs/reviews/universal-ol-controller.md),
[zone-helper](docs/reviews/zone-helper-check-and-climb.md) and
[work-exchange](docs/reviews/ol-work-exchanges.md) reviews retain earlier context.
Do not treat unmeasured candidates as proven fixes.

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
