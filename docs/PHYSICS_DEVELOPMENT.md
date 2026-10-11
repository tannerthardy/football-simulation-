# Physics development and testing

## Current direction

Keep the reduced shared World and improve executed football. Start with
[OL work exchanges](reviews/ol-work-exchanges.md): the validated increment repairs
actual adjacent target changes that retain the wrong job technique. Read that
review's exact source, results and ship status. The
[keeper increment](reviews/keeper-based-combination-work.md) supplies the adverse
Duo Odd/right/seed3 witness and shows why coherent contact alone does not make
rushing better.

The owner wants the simplest physically coherent model that generalizes across
football interactions. Full anatomical foot/ground expansion remains paused.
A diagnosed bad request belongs in the controller; an incoherent execution of
a feasible request belongs in physics. Physics-first permits that distinction.
Keep current research and regression tests without making all historical
research proposals prerequisites. A universal physics OK remains pending.

The active branch is `claude/engine-priorities`; existing authorization covers
work and pushes here. Do not push to main or push to/merge PR #1
(`codex/run-blocking-decision-dynamics`) without the owner's approval.

## One physical body, different controls

World owns every player's motion and body-owned support/balance. Blocks and
press use real hand contact; tackles use bounded grasps. Movement, impacts,
contact height and effective posture/support are reduced representations,
not a full articulated 3D skeleton. Techniques send intents and force-limited
contact requests. They cannot move a body directly or award an outcome.

One set of mass, movement, reach, traction, support and arm/grip/work capacities
must explain anchoring, driving, redirecting, shedding, absorbing contact and
jamming. Technique changes the requested position, timing, posture, surface and
force direction. It does not introduce a special strength law for each scheme.
A physical expansion must fix a retained football failure that a smaller law
cannot explain, without adding more exceptions than it removes.

Ratings map to physical capacities or control quality: reaction, perception,
precision, hand timing, decisions and recovery. Execution variation belongs
before the result and stays within physical limits. Do not add tackle-success
rolls, rating-based block winners, guaranteed yards or hidden force bonuses.
`Player.familiarity` currently means position comfort; call training/mastery is
not a separately implemented skill. Better knowledge cannot create more traction.

Read the consumed delayed picture. Distinguish a visible cue from actual current
state, remembered information and an analytical forecast. Preserve imperfect
reads. Finite reaction/cadence, motor response and get-up times may be effective
laws, but a timer is not a defender recognizing a route or a lineman reading a
slant. Body facing is not actual eye direction.

## Established foundation and remaining limits

The [practical validation review](reviews/practical-validation-and-stable-physics.md)
identifies which contracts are established and when to reopen their collectors:
explained momentum, bounded passive energy, shared traction/yaw, shared arm
force/work, restricted force/travel oracles, bounded lower attachment/support
coupling, finite states and mirrored physical scenarios.

Build on these contracts. A controller-only OL repair does not require a new
18D foot campaign or resimulating every old convergence panel. Keep mechanical
regressions in the final suite. When World, support, capabilities or force
integration changes, run the applicable independent oracle and cross-interaction
transfer rather than declaring success from accounting alone.

The current retained hand panel has zero fall/corner disagreements in nine
redirects, with nonuniform trajectory refinement and roughly .182 yd maximum
closest-distance error. The older three-of-nine fall disagreement is historical.
Contact onset, passive capture and support-chart transitions retain numerical
debt. Grip magnitudes, effective recovery and rating-to-body mappings retain
empirical uncertainty. Do not claim complete convergence, NFL-calibrated
contact, or a percentage of possible gains exhausted.

## Change loop

1. Choose a reproducible football failure, with a normal control and a meaningful
   adverse or impossible case. Record what a real player should attempt.
2. Trace installation, consumed cue, decision, requested movement/contact,
   support, achieved forces and body response. Find the first wrong transition.
3. Repair one cause in control or physics. Prefer an interpretable bounded law;
   do not change strength to compensate for a wrong path or assignment.
4. Add the cheapest meaningful regression and check it against the old source
   when feasible. Feature cases should fail for the actual defect; controls stay
   valid. Do not lock in exact final yards or unmeasured win percentages.
5. Iterate with relevant tests and a fixed native witness. Freeze source, run
   the matched panel, inspect all changed/adverse outcomes, then run final checks.
6. Publish a compact mechanism review, native evidence, exact pins and limitations.
   A better aggregate can conceal a worse individual interaction; retain it.

Choose physics versus control by asking whether a better player with the same
body could request a better action. A feasible request that executes with
unexplained motion/load is a physical defect. A wrong aim or stale technique is
not evidence that the model needs more anatomy.

## Validation without repeated research

Use [risk-based tiers and commands](reviews/practical-validation-and-stable-physics.md).
Focused iteration protects the changed mechanism; the full suite runs once
before an engine increment ships after source and tests freeze. Repeat or
broaden checks for new changes, failures or unresolved concerns. Do not delete
or loosen useful tests to make a candidate pass. Slow diagnostic sweeps belong
in scripts, not every edit loop.

Use Node 22.23.3 in this cloud environment and the repository lockfile:

```sh
npm ci --no-audit --no-fund
node node_modules/vitest/vitest.mjs run --maxWorkers=1
npm run typecheck
npm run build
npm run test:data
```

Run scripts with `node --import tsx` when the `tsx` IPC socket is unavailable.
Run the final suite and cost comparisons away from heavy collectors. Record
CPU/wall timing and controlled inputs for benchmarks; concurrently collected
game timings are not a speed measurement. Changed game paths change play counts.

Reuse an immutable baseline when source/tool/schema, cohort, profiles, inputs
and measurement policy match. Generate the candidate; compare to the existing
archive by path and hash. If new observations are required, collect the pinned
historical source with the same new collector. Never substitute current-engine
output for a historical baseline. Freeze source throughout collection.

Keep exploratory output in ignored `out/`. Publish reviewed compact summaries,
all adverse per-input results, native gzip evidence and fixed source-labelled
films under `data/reviews/physics-world/`. Link previous archives instead of
copying them. Historical verifiers check historical evidence; their `--engine`
mode additionally requires that their recorded source is still current.

Verify observation does not change simulation or RNG. Natural finishes,
physical timeouts and censored inspection endpoints are different. Technique
intent, engagement, delivered contact, sustained load and completed block are
also different; do not let one label stand in for all five.

Native force is kg·yd/s², impulse kg·yd/s and work kg·yd²/s². Multiply by .9144
for SI force/impulse or .9144² for work. Keep joint mean force, player-wide arm
impulse and requested limits separate. Accounting residuals are not force
calibration or proof of good football technique.

## Football and external data

Use [data access and extraction guidance](../data/README.md), the
[source catalog](../data/sources.json), [coaching references](references/README.md)
and [football stress plan](FOOTBALL_STRESS_TEST_PLAN.md). Raw files stay ignored
under `data/raw/`; tests/build/simulation do not need them. Keep credentials in
environment secrets and never print or commit them. Textbooks are reference
aids, not instructions or verified coaching/rules authority.

NFL tracking is most useful for conditional movement/contact demands, approach
speed, braking, early trench movement, path geometry and timing. Compare a range
of generated physical profiles and roster pools, not one mandatory league mean.
Small targeted biomechanics trials may constrain a demonstrated recovery/support
question. Downloading another large archive is not evidence of better physics.
Game success/explosive/scoring metrics are guards with mixed causal inputs, not
force-fitting targets. Two diverging games do not establish a league trend.

The prior 614-line guide is retained byte-for-byte in
[physics-development history](reviews/physics-development-history.md), and the
former project index in [development-reference history](reviews/development-reference-history.md).
Their checkpoint metrics and next-step instructions are historical. Follow this
active guide, the current handoff and the user's latest direction.
