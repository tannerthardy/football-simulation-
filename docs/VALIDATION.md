# How we validate football

We build the mechanism first. NFL game statistics are the final exam, not
parameters to fit. A different generated roster can produce different numbers.
Neither a better average nor a good-looking touchdown proves a repair works.

Use the smallest existing check that can disprove the proposed explanation.
The [current status](STATUS.md) identifies the next work; the
[data guide](../data/archive/catalog-2026-10-11.md) locates reference inputs and saved evidence.

## Five layers, in order

| Layer | What we must establish | Existing tools |
| --- | --- | --- |
| Physics | Loads explain momentum changes; passive contacts do not create energy; ground and arm forces share bounded budgets; force produces the correct travel. Check independent analytic cases, mirrors and relevant timestep refinement. | `world-physics`, `actuation`, `constraint-work`, the hand/strike/reel integration tests; `diag/hand-convergence.ts`. |
| Movement | Comparable bodies can accelerate, brake, turn, backpedal and recover plausibly in comparable tasks. Separate capability from the controller's requested motion. | `diag/movement-tasks.ts`, BDB2027 task fixtures and extraction tests. |
| Contact | One set of mass, traction, strength, balance and reach capabilities works across anchoring, double-team driving, shedding, absorbing a hit, press and tackling. Vary geometry, speed, posture and shared player profiles, not hidden scenario strength. | `scripts/scenario-pack.ts`, `diag/shared-capabilities.ts`, contact and support tests; tackle/approach panels. |
| Decisions | The installed job, available observation, interpretation and requested action form a plausible coaching sequence. Delayed or missing information can cause mistakes; perfect knowledge cannot silently fix them. | `diag/run-concept-process.ts`, `diag/coverage-contracts.ts`, `diag/decision-awareness.ts`; the [football handbook](football-handbook/README.md). |
| Full games | Calls, fatigue, penalties, clock and all interactions remain credible together. Review ordinary plays and distribution tails. NFL outcomes can reveal a problem but cannot identify its cause. | Fixed native game cohorts, `scripts/calibrate.ts`, the situation-specific rushing benchmark and a reserved final exam. |

Passing a lower layer does not prove the layer above. A recorded engagement
does not prove useful transmitted load. A climb event does not prove an achieved
linebacker block. A missed tackle does not prove weak grip strength.

Movement comparisons need the same coordinate system, sample rate, smoothing,
time window and missing-data policy on both sides. Match entry speed, role,
travel/facing, contact status and relevant measurables where they are available.
NFL intent and effort are usually unknown; label proxies. The old
`kinematics-compare.ts` compares provider motion fields with motion derived from
rounded engine replays: keep it as a broad guard, not a calibration oracle.
The matched task follower knows the whole desired path; it tests feasibility,
not a player's football awareness. BDB2027 combine data lacks RB/QB/LB groups.

## Pick the next problem from ordinary film

1. Freeze a native game cohort and its source, roster and seed identifiers.
   Sample actual run/pass snaps with a recorded seed before looking at gains
   or flags. Do not choose only explosives. Keep nullified plays as a separately
   labelled group if included; distinguish native games from balanced lab calls.
2. Review the sampled clips in their drawn order. Use the rubric below. Record
   play ID, player, first wrong timestamp, visible evidence and uncertainty.
   Multiple flags can belong to one play; count each category once per play.
3. Report flagged plays over reviewed plays, with run/pass denominators where
   appropriate. Rank repeated, clearly observed problems ahead of rare or
   speculative ones; within those, prioritize failures that remove a defender,
   lose a block or corrupt several later decisions.
4. Choose one mechanism. Retain an ordinary example, a difficult example,
   a mirror and a case where the proposed intervention should do nothing.
   Selected bad clips diagnose that mechanism; they are not frequency estimates.

| Coaching question | Flag when visible; do not infer from the result alone |
| --- | --- |
| Is the responsibility coherent? | A receiver is unaccounted for, two players abandon the same space, or an OL loses useful work without a plausible exchange. Verify the actual call and job before calling it a bust. |
| Is the player using available evidence? | A recorded acquired cue contradicts the retained decision. Body facing alone is not gaze; positions alone do not establish what the player saw. |
| Is the approach achievable? | The request/path enters contact too fast, cannot reach the intended surface, crosses a teammate's path unnecessarily, or preserves a bad pursuit angle without gathering. |
| Does contact make sense? | Unexplained displacement, persistent overlap, sudden velocity changes, an impossible reach or support recovery. Use load/command traces to separate collision response from a bad request. |
| Is the next action timely and legal? | No plausible recovery, pickup, climb or coverage exchange after the cue; or sustained contact that needs a holding/interference review. Confirm legal restrictions rather than labelling every collision a foul. |

Light replays show paths, facing, ball and events. They cannot establish hidden
perception, applied force or the cause of a fall. Mark those cases **needs trace**,
not confirmed physics failures. Use existing recording levels to collect the
missing state only for the selected mechanism. Preserve unsuccessful examples.

## Change and stopping rules

Write a short explanation before coding: first wrong request or physical
response, evidence, proposed cause, and the check that would prove it wrong.
Bad decisions belong in controllers; incoherent execution belongs in physics.
Ratings affect observation, control and physical capabilities, not a final win
or yardage roll. Keep shared capabilities fixed for a controller experiment.

Compare identical situations: same bodies, initial state, call, seed and
measurement method. Useful examples include lone defender/carrier in space,
the same run against light/loaded boxes, and the same pull against box/spill.
Declare inputs and controls before candidate results. Include every adverse
pair. Changing whole games changes later calls and RNG histories; do not claim
their later plays are still paired counterfactuals.

If **two attempts** fail to repair the visible mechanism, or a repair breaks an
ordinary control, stop stacking adjustments. Inspect the first divergence,
reconsider the cause and reduce the experiment. Do not add strength, traction,
timers or global solver resolution to rescue a football statistic. Extend the
model only when the simpler shared mechanism cannot represent the observed need.

## Checks already available

Run from the repository root with Node 22. Output belongs in ignored `out/`.
Focused checks during iteration precede the complete checks before publication.

```sh
npm test
npm run test:integration
npm run test:research
npm run typecheck
npm run build
npm run test:data
```

`npm test` covers the production contracts. Integration keeps the existing slow
game/ensemble checks; research keeps the paused anatomical/sole experiments.
Before publishing an engine change, `npm run test:all` runs all three projects
without omitting any preserved assertion. Docs-only work needs no new games.
Complete and integration runs use one worker to avoid the worker RPC timeout
observed in the old parallel full suite; the fast default remains parallel.

Useful collectors; run only the layer affected, with unchanged source while
collecting. These execute the current engine, unlike reading saved reports:

```sh
node --import tsx scripts/scenario-pack.ts out/checks/scenarios.json
node --import tsx scripts/diag/shared-capabilities.ts out/checks/shared.json
node --import tsx scripts/diag/hand-convergence.ts out/checks/hands.json
node --import tsx scripts/diag/run-concept-process.ts out/checks/runs.json --verify
node --import tsx scripts/diag/coverage-contracts.ts out/checks/coverage.json
node --import tsx scripts/diag/decision-awareness.ts out/checks/decisions.json.gz
node --import tsx scripts/diag/physics-cost.ts out/checks/cost.json 2 9
```

For movement, restore authorized fixtures or extract them with the existing
numpy/pandas environment, then run the identical measurement operator:

```sh
python3 scripts/data/movement_task_fixtures.py /path/to/authorized/bdb2027 out/movement-inputs.json
node --import tsx scripts/diag/movement-tasks.ts out/movement-inputs.json out/checks/movement.json
python3 scripts/data/movement_task_report.py out/movement-inputs.json out/checks/movement.json out/checks/movement-report.json
```

The old fixture label `holdout2025` is historical: inspected trials are no
longer a blind test, regardless of their stored split name.
The refined solver is a numerical comparison, not biomechanical ground truth.
Record CPU/wall time per play with matched cost inputs and no competing heavy
collectors; a changed play count prevents a simple game-time speed claim.

Saved evidence describes its pinned historical engine, not today's engine.
Reuse compatible baselines instead of duplicating them. Record engine/tool,
input/profile hashes and measurement definitions. A recording observer must
preserve execution and RNG; use the existing observer controls, not extra
perception calls. Follow the data guide to restore archived packets. Historical
source verification is expected to reject a different later engine.

## Keep an honest final exam

All 2022–2025 outcome benchmarks have been inspected. They are descriptive
references and retrospective replication, **not a blind holdout**.

Reserve **2026 regular-season weeks 10–18** before those games occur. Do not
inspect, extract or tune toward their aggregate outcomes during development.
Before opening them, freeze the candidate, its generated-roster cohorts and the
evaluation query. Apply the existing clean designed-run operator: exclude
kneels, spikes, two-point attempts, sacks and flagged penalties; retain fumbles
and short touchdowns. Report gain bins, stuff, 40/60/100 success and inclusive
10/20/40-yard gains by down, distance and field position, with known counts,
missingness and game-cluster uncertainty. Scrambles remain separate.

Match supported contexts and show omitted exposure. NFL intervals describe an
NFL population; they are not pass/fail limits for generated rosters. Open this
exam once for the frozen milestone. If its results lead to further work, it
becomes a diagnostic set: reserve new untouched data for the next honest exam.
This holdout is a committed plan awaiting future data, not completed validation.
The first declared query covers rushing. Passing and special teams still need
their own frozen definitions before this whole-engine exam is complete; do not
peek at the reserved weeks to choose those definitions.

## Biggest remaining gaps

- Comparable movement still mixes sparse roles, missing orientation/contact
  labels and uncertain capability mappings. Tracking does not measure grips.
- Controlled contacts have strong accounting checks but limited measured NFL
  hand-force, grip, support and recovery evidence. Do not call those capacities
  empirically validated because residuals are small.
- Light game films cannot establish consumed visual cues or applied loads;
  coaching review needs targeted traces and independent football judgment.
- Random reviews currently cover small generated cohorts. Repeat with new
  seeds/rosters before treating the ranking as a league-wide failure rate.
- The untouched final exam is not available yet. No existing averages certify
  the whole engine, and no evidence establishes a percentage of work remaining.
