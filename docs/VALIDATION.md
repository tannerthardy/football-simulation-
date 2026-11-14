# How we validate football

**Process precedence:** [PLAN](PLAN.md) and [GAPS](GAPS.md) supersede the
older workflow requirements in this reference. Keep the football-model,
mechanism-review and marginal-cost reasoning; use PLAN for current assignments,
merge criteria and testing tiers. Integration-owner/full-suite obligations,
receipt publication and historical flag profiles below are not current gates.
Documentation-only navigation changes need documentation/path checks, not games.

We build the mechanism first. NFL game statistics are the final exam, not
parameters to fit. A different generated roster can produce different numbers.
Neither a better average nor a good-looking touchdown proves a repair works.

Use the smallest existing check that can disprove the proposed explanation.
The [current status](STATUS.md) identifies the next work; the
[data guide](../data/README.md) locates reference inputs and saved evidence.

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

## Building the film pack

```sh
npm ci --no-audit --no-fund
npm run film-pack -- --seed 101 --games 12 --out out/film-pack/review
npm run film-pack -- --seed 11 --games 2 --run-only --out out/film-pack/run-s11   # run-game film
```

`--run-only` plays the same games with every offensive scrimmage call a designed run
(`GameOptions.runOnly`); enabled manifests record `runOnly: true` and its input
hash. Omitting the switch preserves ordinary call selection.

New packs also retain only their selected constructors in a private `inputs/`
sidecar, checked against the original clips on the same source/settings. See
[selected film inputs](FILM_PACK_INPUTS.md) for the bounded second pass, existing
F2 saved-path selector, unavailable cases and legacy-pack limits.

Use Node 22.23.3 and a fresh ignored output directory. This plays the same
Ironmen/Comets teams and consecutive game seeds as `npm run replay`. The
existing detectors read those same recorded games. `manifest.json` records the
develop base, actual HEAD and engine/tool/lockfile hashes, resolved settings,
roster/input identity, selection version, exclusions, strata and selected IDs.
Keep the manifest with its source: later engine changes can change the plays
behind the same IDs. Build duration is separate in `build.json` so the manifest
contains no wall-clock values.

Watch the HTML parts in `index.md` order, using the default **Film review order**
grouping. Each standalone part uses the existing replay renderer, light body
frames and fewer than 15,000,000 UTF-8 bytes. The ordinary group is a seeded
proportional sample of 120 eligible run/pass plays across kind, down, distance
(≤3, 4–7, 8+) and offensive field zone (own 20 and in, middle, opponent 20 and
in). Every non-empty cell gets at least one play; if cells exceed the quota,
the tool explicitly expands it. Nullified, unfilmed and invalid situations are
excluded and counted. Ordinary selection precedes any inspection of gains or
detector results.

The remaining unique plays supply up to 40 **watch first** clips, ranked by
uncapped eligible detector-event frequency times severity, with at most ten
selected per detector; then up to 20 **big plays** (20+ yard gains, sacks or
turnovers). Shortages are reported, never padded. Alerts indicate where to look,
not confirmed defects, and this enriched queue is not a population defect rate.
The 20 before/after pair slots are explicitly empty for F2, which writes a
separate source-qualified sidecar. No play appears in two groups.

Raw original clips and uncapped detector events stay in the pack's `raw/`
directory for offline inspection. Only the indexed HTML parts are publication
size-limited; do not commit the generated pack. Light film shows body facing
and travel, not hidden perception, intention or applied force. Those questions
still need the existing selected-play traces. The small native determinism
test builds one game twice and requires identical manifest and film bytes;
synthetic tests cover stratification, caps, exclusions and duplicate prevention.

### Before/after pairs from one saved snap

`npm run film-pairs -- --base <ref> --head <ref> --plays out/selection.json --out out/film-pairs/name`
captures once on the declared source and replays the identical constructor on
both pinned refs. Saved IDs resolve through exact paths/hashes; seed/game/play
triples use film-room numbering, not scorecard IDs. See [FILM_PAIRS](FILM_PAIRS.md)
for the versioned input, compatibility checks and measurement limits. Open the
standalone index.html for synced playback and first recorded differences.
Keep generated inputs/films in ignored out/ and deliver them through the film-pack
artifact channel. Same-ref pairs must say no change; whole-game comparisons do
not replace these paired snapshots.

## Film weirdness detectors

A person watching ordinary film finds things the averages hide: a motion man
running into the quarterback, a defender with his back to the runner. The
detectors in `scripts/scorecard/weird/` are cheap rules that read the games the
scorecard already plays and point at clips, so an agent can notice these before
a person has to. **A detector says where to look, never what number is right.**
They only read: games are identical with them on
(`scripts/weird-identity.ts`, `test/scorecard-weird-games.test.ts`). Fixing a
mechanism a detector exposes is the owning lane's job, and nothing here is tuned
to a target count.

| Detector (`id`) | Fires when | Constants | Logged beside the event |
| --- | --- | --- | --- |
| Pre-snap teammate contact (`presnap`) | Two offensive bodies touch before the snap, from the physics world's contact log. Reports the motion kind and who the motion man is. Control: with no motion called it should give zero (`weird.presnap.control`). | None. | Closing speed, impulse. Nothing is requested before the snap. |
| Defender turned away (`turned`) | After a handoff, catch or scramble (not a QB in the pocket): a defender within 5 yd of the carrier, facing more than 120° from the bearing to him, for 0.25 s, not engaged, down or in the tackle. | 5 yd, 120°, 0.25 s are chosen; 120° is "an analysis category, not a coaching truth" in `docs/football-handbook/orientation-pilot.md`. | Requested facing (or travel direction) against achieved facing. |
| Blocker on a man out of the play (`stuck`) | A run play with a carrier: a blocker engaged with, or planning against, a defender more than 5 yd from the carrier and moving away at over 0.5 yd/s, while a free defender (not engaged, not down, no offensive teammate within 1 yd) is within 3.5 yd of the carrier. | 5 yd and 3.5 yd are RUN-12's; the 0.5 yd/s and the 0.25 s are chosen. RUN-12 is rebuilt from its text, since no script exists. | The blocker's requested and achieved velocity, and his job. |
| Lineman backpedaling facing his backfield (`backpedal`) | An unengaged offensive lineman, while the offense still has the ball, faces more than 120° from downfield and moves back faster than 1 yd/s, for 0.25 s. Run and pass plays both; the play kind is logged. | 120°, 1 yd/s, 0.25 s are chosen. | Requested against achieved velocity and facing. The rate is a share of OL frames. |
| Sliding through a cut (`slide`, **candidate**) | A sharp turn (60° or more over 0.5 s, entered at 3 yd/s or faster) in which no window of the turn shows him slowing: speed retention at or above the NFL 90th percentile for his role. | The turn operator and the retention percentiles are sourced from BDB2027 tracking (`scripts/data/bdb2027_movement.py`; the table in `detectors.ts` is checked against `bdb2027-movement.json` by a test). The 3 yd/s entry floor is chosen. **No plant-deceleration threshold exists anywhere**, hence "candidate". | Requested turn angle and speed ratio against achieved. The rate is a share of sharp turns. |
| Free second-level OL requests stop (`frozen`, **candidate**) | Live designed run, OL job climb/lead, unengaged/up/out of tackle bond; request under 0.3 yd/s for at least 0.4 s of consecutive 20 Hz samples, including before handoff. | 0.3 yd/s and 0.4 s are chosen review thresholds, not NFL calibration. | Requested and achieved speeds and job. A stop may be lawful braking/traffic; not a failed-block verdict. |
| QB down without nearby defender (`downalone`, **candidate**) | New QB down onset on a pass/scramble, with complete preceding 0.5 s of samples, no engagement/bond, and all defender centers over 2 yd away throughout the lookback and onset. | 2 yd and 0.5 s are chosen. Missing history/defenders mean unknown. | Smallest sampled defender distance and onset; positions do not establish valid/invalid reach or cause of fall. |
| Trailing man body stays turned from ball (`blindball`, **candidate**) | At flight end, man marker stayed within 2 yd of the target and behind along flight direction, body over 120° from ball throughout recorded undeflected/non-throwaway flight, accumulating no more than 30° facing travel. Missing/partial flight is skipped. | 2 yd, 120°, 30° and the 20 Hz window are chosen. | Target, sampled offsets, facing travel and signed arrival angle/left-rear or right-rear shoulder side. Body facing is not gaze or proof of missed recognition. |
| Runner departs static installed aim toward defender (`phantomlane`, **candidate**) | Before passing the installed aim on a designed run, achieved travel at least 0.3 yd/s departs its bearing by 30°+, with an upright defender 0–3 yd forward along that ray and within 1.5 yd perpendicular. | 30°, 0.3 yd/s, 3 yd and 1.5 yd are chosen geometry heuristics. | Achieved/requested travel headings, installed-aim bearing and defender offsets/engagement. Static aim is not a newly evaluated live-gap route, and a nearby defender does not establish a wrong cut. |

The four additional candidate definitions landed in
[#318](https://github.com/tannerthardy/football-simulation-/pull/318) at
`58ae15d7dd285d33ddd058f3743f706b4f4f886c` (head `0f6329e3`).
Their chosen thresholds nominate review clips; they are not calibrated football
limits or automatic defect verdicts.

The retention table describes how NFL players turn (their typical turn is
entered at about 1.9 yd/s, so it is generous to a run-speed cut), not when a foot
is planted. Windows that touch a block, a fall or a tackle are skipped, and a
cut spans several overlapping windows, so it is judged by its worst one.

**Reading the output.**
- The scorecard report has a *Watch these first* section: the three most
  severe events per detector as `play @ time: description`, plus rate rows
  (`weird.*` metrics) that move like any other metric. Severity is duration,
  smallest distance, closing speed or, for slides, speed carried through the cut.
- The full list is `<saved card>.weird-events.json` (or `--weird path`), written
  next to `--out`/`--md`; retain it with local `out/` for review. It keeps the worst 25 events
  per detector per game; rate counts are never capped.
- Scorecard ids look like `sc7/G2-P014` and belong to that run's own games, not the
  film room's. `npm run weird -- 7 --games 6` plays the film room's games (the same
  teams and seeds as `npm run replay`), so its ids (`G1-P007`) match the film.
  `--expect list.json` scores a hand-made list of flagged plays for hits and
  misses (see the header of `scripts/weird-film.ts`).
- "Needs trace" still applies: the detectors see paths, facing, engagement and
  requests, not hidden perception or applied force. Body facing is not gaze
  ([BEHAVIOR_REVIEW](BEHAVIOR_REVIEW.md)).

### Review saved scouts without more games (PERF-5 / VIEW-1)

```sh
node --import tsx scripts/film-scout-review.ts --card out/scorecard/head.json --seed 243 --out out/scout-review
```

This offline command freezes twelve official retained episodes (1 pre-snap,
3 turned, 3 stuck, 3 backpedal, 2 slide), or the available smaller set. It saves
the input-card checksum, actual source/settings/input identities, population
counts, seed and selection recipe in `queue.json`; `review.md` is the index.
It does not run a detector or simulate a play. Use a single saved arm. A
historical card remains historical; scorecard `sc7/` IDs must not be joined
to ordinary film-room IDs by play number alone.

Six opposing half-second windows are sampled after 1s from the same saved
plays: three negative for `turned`, three for `slide`. A game's official stored
and uncapped event counts must agree for that detector. Missing/capped streams
cannot prove absence. Controls are conditioned on another alert in the play;
eligibility in the selected window is unknown until its film/trace is inspected.
They expose questions, not a reliable population recall estimate. Nullified
events remain in the input and population counts but are not sampled.

Keep agent dispositions and optional Tanner observations in a per-play notes
file, alongside the report in ignored `out/`, as with existing film notes.
`notes-template.json` supplies `sourceCardSha256`, `sourceSha256` and `notes`.
Each note uses an episode `key`, `verdict` (`defect`, `legitimate`, `unresolved`),
`reason` and `competingExplanation`; resolved labels also need `evidence` links.
`userObservationParaphrase` is optional. Re-render with `--notes review.json`.
Regeneration preserves existing notes. Unreviewed alerts are not errors;
uncertain labels are not successes. Counts describe this small stratified
sample, including its uncertain cases; they do not certify detector precision.

If the producer supplies existing replay/trace files, add `--films films.json`.
The sidecar has `entries: [{key, path, sha256, engineSha256, settingsSha256,
inputSha256, playId}]`; paths are relative to that sidecar. Each entry links the
existing standalone replay envelope, with its source, actor and interval
checked. Settings/input must match the queue's recorded hashes, but this is an
owner-declared join, not an independent execution proof. Do not fill missing
legacy identity from today's defaults. Optional `traces: [{key, path, sha256,
inputSha256}]` consume existing selected-actor command-trace JSON (see
[COMMAND_TRACE](COMMAND_TRACE.md)); the tool checks its source/settings/play
and actor, then copies only recorded steps. Missing steps and useful-intervention
opportunities remain unknown. Commands are displayed, never executed.

Use the viewer's existing **Copy reference** and **Export clip** controls;
search the exact play, select its player and seek to the reported interval.
Only unresolved notes with `needsFootballJudgment: true` **and matching film**
enter Tanner's shortlist. Missing artifacts are an agent access task. Request
the existing evidence rather than recollect a panel or invent an intent/contact
diagnosis from dots. Contact-owned facing, legitimate coverage turns, an unused
stale cache and a far-side player with no achievable useful intervention are
opposing explanations to check, not automatic false-positive labels.

**What they miss, on purpose or by definition.** Anything outside the rule: a long
curved glide that never turns 60° in half a second, a defender turned from the
quarterback before there is a runner, a blocker on a man who is close and closing.
When a clip like that matters, add a detector.

**Add a detector in about 30 lines.** A detector is a pure function of one tick.
1. In `scripts/scorecard/weird/detectors.ts`, write a `Detector` and append it to
   `DETECTORS`:
   ```ts
   const holdSlot: Detector = {
     id: 'cbBackToBall', label: 'Corner with his back to the ball',
     minHold: 0.25,                       // seconds it must persist (0 = every hit)
     hit(f) {                             // f: WFrame, one tick; return [] or Hit[]
       if (f.phase !== 'live') return NONE;
       const out: Hit[] = [];
       for (const a of f.agents) {
         if (a.team !== 'D' || !a.slot.startsWith('CB') || a.engaged || a.down) continue;
         // ... compute from a.x, a.y, a.vx, a.vy, a.facing, a.rfacing (requested), f.runner
         out.push({ key: String(a.idx), players: [a.idx], sev: 1, data: { /* numbers for the text */ } });
       }
       return out;
     },
     describe: (p, dur, slots) => `${slots[p.players[0]]} ... for ${dur.toFixed(2)} s`,
   };
   ```
   A `Hit` can carry `intent` and `achieved` records; the tracker merges ticks into one
   event per (detector, key) and keeps the worst tick. For a windowed rule, read
   `History` (10 Hz positions for 0.8 s) as `slide` does.
2. Add the id to `DetectorId` in `types.ts`.
3. Add one scene where it fires and one where it must not to
   `test/scorecard-weird.test.ts` (frames are object literals; no simulation).
4. Add its metrics to `scripts/scorecard/weird/probe.ts` (`pair('id', ...)` gives
   "plays with one or more" and "events per 100" rows). Counts, the events file
   and *Watch these first* pick the new detector up with no other wiring.
5. If it needs a field the adapter does not copy, add it to `WAgent`/`WFrame` and
   fill it in `observe.ts` (`fill`), reading only.

## Change and stopping rules

Use the [tiny default loop](TESTING_COSTS.md#default-loop-one-question-tiny-evidence):
one question, smallest reproducer, one relevant opposing control and directly
affected correctness tests. Before adding checks, name the decision their results
could change. [BEHAVIOR_REVIEW.md](BEHAVIOR_REVIEW.md) supplies interpretation
categories when needed, not mandatory suites or a worksheet. A material adverse
result gets one targeted diagnostic before a larger batch; distinguish a defect,
a football tradeoff and changed randomness. Apply the same standard to favorable
yardage. Report what changed, evidence for/against, unresolved risk, runtime and
next decision; link compatible evidence instead of rerunning it.

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
ordinary control's supported mechanism contract, stop stacking adjustments.
A changed ordinary outcome alone needs adjudication, not automatic rejection.
Inspect the first divergence,
reconsider the cause and reduce the experiment. Do not add strength, traction,
timers or global solver resolution to rescue a football statistic. Extend the
model only when the simpler shared mechanism cannot represent the observed need.

## Checks already available

Run from the repository root with Node 22. Output belongs in ignored `out/`.
Focused checks during iteration precede shared checks on the combined candidate.

```sh
npm test
npm run test:workflows
npm run test:integration
npm run test:research
npm run typecheck
npm run build
npm run test:data
```

`npm test` covers engine/controller contracts. `test:workflows` selects native
capture/replay, film/CLI and lab contracts for focused work. The integration
command includes those workflows plus the existing slow game/ensemble checks,
so the required core-plus-integration path retains every former production
check exactly once. Do not also run the complete workflow tier when that
integration command is the chosen gate. Research keeps the paused
anatomical/sole experiments.
At integration, one designated owner runs `npm run test:all` on the exact combined
engine candidate, without omitting any preserved assertion, alongside the other
required full checks. Local agents supply focused receipts and link the shared
result rather than each launching the suite. Reuse only compatible tested code,
inputs and settings. Docs-only work needs no new games.
Complete verification uses one shared isolated thread pool, capped at three
workers; the combined workflow/game integration command caps it at two.
Standalone workflow selection uses one worker. Every test file retains module
and environment isolation. On a constrained host use
`npm exec -- vitest run --maxWorkers=1` for all projects, or
`npm exec -- vitest run --project workflows --project integration --maxWorkers=1`
for integration. Appending a duplicate worker option to the npm scripts is an
error, not an override. Preserve and report any timeout or worker failure;
lower concurrency does not authorize changing a deadline or assertion.
The native game tests yield between synchronous games so worker reports can
be delivered. Their simulation inputs, assertions and test timeout are unchanged.

Useful collectors; run only the layer affected, with unchanged source while
collecting. These execute the current engine, unlike reading saved reports:

```sh
node --import tsx scripts/scenario-pack.ts out/checks/scenarios.json
node --import tsx scripts/diag/shared-capabilities.ts out/checks/shared.json
node --import tsx scripts/diag/hand-convergence.ts out/checks/hands.json
node --import tsx scripts/diag/run-concept-process.ts out/checks/runs.json --verify
node --import tsx scripts/diag/run-support-install.ts out/checks/support.json
node --import tsx scripts/diag/coverage-contracts.ts out/checks/coverage.json
node --import tsx scripts/diag/decision-awareness.ts out/checks/decisions.json.gz
node --import tsx scripts/diag/physics-cost.ts out/checks/cost.json 2 9
```

The isolated angular-law audit fills a missing law check. Its normal-force
controls validate momentum, force/travel, work, mirrors and coordinate changes.
Tangential hand restraint currently loses angular momentum with no ground
reaction; the measurement reports **KNOWN FAILURE**, and `--assert-law` exits
nonzero. This is a tracked defect, not a passing readiness check:

```sh
node --import tsx scripts/diag/hand-angular-law.ts out/checks/hand-angular.json --assert-law
```

The [common-patch prototype](reviews/zone-flow-prototype.md) is opt-in because
native helper/mirror controls and the candidate YBC guard still fail. Its isolated
law audit passes; a passing law is not permission to promote a football regression:

```sh
node --import tsx scripts/diag/hand-angular-law.ts out/checks/patch-angular.json --common-patch --assert-law
node --import tsx scripts/diag/zone-flow.ts out/checks/zone-flow.json
```

Movement and contact mechanisms against 2022 NFL all-22 tracking, measured by
the same code on both sides (no raw data needed; see [NFL data](NFL_DATA.md)):

```sh
npm run mech:sim      # record 8 games (seed 101) in the common play format
npm run mech:report   # sim vs NFL table and guard -> out/mechanics/report.md
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

## Testing cost and selective roster diversity

Follow [TESTING_COSTS.md](TESTING_COSTS.md). Tests are not multiplied by rosters.
Use the tiny default loop. Choose an affected subset of the frozen 32-snap screen
only if a specific transfer question remains; never automatically step through
2/8/16/32 snaps. One owner runs full checks on the combined candidate at integration.
Additional games require an interaction question that needs games.
`npm run screen:roster` runs
zero simulations without an explicit collection/comparison request. Compatible
committed baseline evidence supports candidate-only execution and per-case
caching. Generator/selector changes need fresh profile checks too: frozen
bodies bypass them. Budgets, failures, skipped cases and timings are recorded;
partial/favorable-prefix evidence does not pass a planned screen. Optional
`npm run baseline:verify -- --candidate --fail-fast` stops failed cheap phases
and records the omitted tail without weakening assertions.

## The fixed run set is a used benchmark

`ref:report`'s fixed run set (`config/reference-stack.json` `runSet`, 1,321
runs) has been the yardstick for dozens of promotions, so the default engine is
partly fitted to its exact plays. Measured 2026-11-13 with placebo arms (one
body nudged 0.05 yd after the first tick, nothing else changed; see
[TESTING_COSTS](TESTING_COSTS.md#noise-floor-of-the-fixed-run-set-refreport---placebo-n)):
on `runSet` every arm loses yards (mean -0.10 a run, IZ -0.14); on
`runSetFresh`, captured on engine-55 with new seeds, the overall bias is -0.00.
Read run-set deltas on `ref:report -- --set fresh`, against the placebo mean and
spread at a matching share of changed plays. Keep `runSet` for continuity and
the operators. When `runSetFresh` has in turn judged several promotions,
capture another and retire it the same way.

## Reading the card's rush row and the paired run set together

Two instruments, two questions. `ref:report` replays the same captured runs under two engines and asks what the change
did to those plays (each run capped at 20 yd). The scorecard plays whole games under each engine and asks what the
change did to football, so its plays differ between arms after the first divergence.

**What the card's `Rush yards / carry` counts.** Every play logged `kind: run`: designed runs, draws, sneaks and tricks, uncapped.
QB scrambles are logged as passes (their own row, `QB scramble yards / scramble`), kneel-downs have their own kind, and sacks
are passes. The card now also prints the mean with each run capped at 20 yd (the `ref:report` convention) and the part
beyond 20 yd, and a **Run-situation mix** section (run share of plays, share of runs by down, distance and field zone).

**How big the noise is.** About 2% of runs go 20 yd or more and supply about 0.5 of the roughly 4.1 yd a carry, so a few plays
decide the uncapped mean. Measured 2026-11-14 on the engine-61 candidate (two arms, 4-game cards, 12 independent
cards, 48 games an arm): the difference between arms varied from card to card with a standard deviation of 0.54 yd uncapped and 0.41
capped, which is about +/-0.45 and +/-0.34 at 90% for a 16-game card and +/-0.27 and +/-0.21 for 48 games. A single 16-game card
that moves the row by 0.5 is inside that spread.

**What the candidate's defensive-honesty arm did** (`HONEST_READS`, `INFO_HONEST=63`, `HONEST_TACKLE` on; receivers and tracking
off; 48 games an arm): uncapped rush yards a carry 4.12 -> 4.25 (+0.13, 90% -0.24 to +0.48); capped at 20 yd 3.61 -> 3.75 (+0.14, -0.09 to +0.38);
the part beyond 20 yd 0.50 -> 0.50; runs of 20+ yd 34 -> 38, of 40+ 22 -> 23, of 60+ 12 -> 13; run share of plays 33.9% -> 33.8%, and the
down, distance, field-zone and personnel mix agree within noise. The paired fresh run set read +0.02 to +0.04. So the capped means
agree with the run set, the breakaway count did not move, and the 16-game cards that read +0.5 are samples from the same spread. One
cell did move: runs of 0 yd or less fell from 11.6% to 9.6% (-2.0 points, 90% -3.4 to -0.5). With all six flags on (the
tracking flags included) the same 48-game comparison read -0.33 uncapped (-0.83 to +0.10), capped -0.24.

**How to read them together.**
1. A change to how a run is blocked, defended or tackled belongs on `ref:report --set fresh`: same plays, so no divergence noise.
2. Use the card for what the run set cannot see: whether the offence ran in different situations (the mix section), and whether
   a rise in a game-level number comes with a rise in the capped row. A move in the uncapped row with no move in the capped row, the
   mix or the 20+ count is the tail.
3. Do not call a card move a bias before 48 games an arm, the capped row and the run set disagree, and the beyond-20 row or the 20+
   count explains the gap. Name the plays: `scripts/diag/rush-card-split.ts` splits saved two-arm cards by run concept, lists the
   longest runs and prints the mix, with intervals from resampling whole games.
4. `npm run ref -- --off` and `ref:report --flag` set numeric flags (`INFO_HONEST`) explicitly: `--off` zeroes them and `--flag
   INFO_HONEST=7` gives a candidate arm one item.

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

### Paired ordinary scout recording

`node --import tsx scripts/paired-scout-recording.ts out/paired-scout 24`
records a bounded seed-7 ordinary prefix twice, first without observers and then
with composed constructor capture and existing scouts. Complete GameResult JSON
must match. It keeps at most two alerts per existing detector and their source-
qualified native inputs and original standalone replay. This is a new sample,
never a restoration of the unavailable historical #262 cohort.

Use the recorded `index.json` identities and `events.json`, open each play's
`original.html`, and regenerate a selected trace with:

```sh
node --import tsx scripts/diag/command-trace.ts --capture out/paired-scout/G1-P006/play.bin --actor O:Y --from 2.5 --to 4 --out out/paired-scout/selected.json
```

The existing command verifies source/settings/Node/lockfile and independently
restores the complete native result before tracing. The prefix is not a full
game or a population precision sample. Keep raw artifacts in ignored out/.

### Review the delivered paired recordings

`paired-scout-review.ts` adapts the exact selected episodes from the paired
producer into the existing film-scout queue, notes and report consumer. It does
not resample a scorecard or replace the unavailable historical18 recordings.
Retrieve the [original #265 bundle](https://github.com/tannerthardy/football-simulation-/blob/d91e50665d2e3b2cbac9e5065769059e31e53b92/artifacts/pr265/README.md)
into ignored `out/`, then use Node22.23.3:

```sh
node --import tsx scripts/paired-scout-review.ts --paired out/pr265-transfer/paired-scout --out out/paired-review
# Reapply source-qualified agent notes when supplied:
node --import tsx scripts/paired-scout-review.ts --paired out/pr265-transfer/paired-scout --out out/paired-review --notes out/notes.json
```

The adapter verifies the manifest, constructor bytes, source/settings/runtime,
recorded restoration results, roster index/player/team/slot, and every20Hz step
of the selected interval. It copies the actual owner, raw request, rewrites,
final command, contact/support and consumed reads through the existing consumer.
Counts describe only this selected prefix. Notes never become automatic grades.
Paths in `queue.json` and `review.md` are relative to their output directory;
move that directory together with the original recordings. Trace commands use
bundle-relative capture paths: resolve them from the original-recordings folder,
then invoke the script from its source checkout with absolute capture/output paths.

Offline attachment validates saved evidence; it does not simulate restoration.
For fresh restoration, use the recorded producer source `cac9e1000b27e9222d47a23db6ebdf65eaac25f9`,
Node22.23.3 and its lockfile in a separate checkout. Current develop includes a
later pursuit change and must not be relabelled as that original execution.
