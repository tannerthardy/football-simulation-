# Operating plan (read first)

As of 2026-10-22, [docs/PLAN.md](docs/PLAN.md) and [docs/GAPS.md](docs/GAPS.md)
set what to work on and how work is merged. Where they differ from the
integration-queue workflow below, the plan wins.

- Work only on a gap from `docs/GAPS.md`, on a branch named
  `<lane>/<gap-id>-<short-goal>`. Keep one open PR. At most three agents are
  active at once.
- The scorecard (`npm run scorecard`) is a diagnosis, not a verdict. Merge on
  the mechanism's own evidence, and explain stats that moved. Log a regression
  as the gap it exposes rather than rejecting the mechanism.
- Testing stays cheap: unit or scenario tests first, then the quick scorecard
  tier. Use the full tier only for big fixes.
- Register flags in [docs/FLAGS.md](docs/FLAGS.md). Don't add receipts,
  ledgers or evidence files to Git.

# Start here

Build a genuinely great football simulation, eventually supporting a management
game. Outcomes should emerge from shared physics and how well players control
their bodies and make decisions. **We are not tuning toward NFL numbers.** Many
wrong mechanisms can produce 4.4 yards per carry. NFL game statistics are the
final exam, not the objective function.

Use the **accepted `develop` commit in [the shared integration queue](docs/INTEGRATION.md#accepted-development)**.
Fetch and compare the full pin before starting or handing off work; GitHub's
default branch and historical `4ded6b6` are not the current starting point.
Follow the [start/update/handoff workflow](docs/INTEGRATION.md#agent-workflow).
A historical research host may remain pinned deliberately, with its limitations
stated. Ongoing feature owners reconcile relevant accepted changes at clean
checkpoints; do not force rebases or abandon valid dependency stacks.

Commit coherent steps on the assigned feature branch and push only that branch.
Continue the same PR for its candidate/objective; new runs/receipts normally
update it. A new PR needs an independent review or integration boundary.
Read [work ownership](docs/WORKBOARD.md) and claim bounded files/functions before
crossing another owner's boundary. Preserve all branch and evidence history;
do not reset/clean another checkout or force-push. Primary retains physics
promotion; main and legacy PRs #1/#2 remain outside routine integration authority.

Integration in this chat owns queue triage, minimal extraction and exact combined
verification. Contributors supply compatible focused receipts. #63 is accepted
and merged; its actual develop pin and compatible receipt are in the queue.
See the queue rather than an old task
paragraph for current pins, included code, flags and remaining decisions.
Historical comparison, GitHub default, experimental promotion and merge authority
remain separate. This instruction change does not grant additional authority.

## Model rules

- One physics world moves every body and resolves its contacts. Strength, mass,
  traction, balance and reach must transfer across football interactions.
- Ratings affect physical capabilities, perception and control. They do not
  award a block win, tackle, separation or yardage result.
- Fix a bad decision in the controller; fix incoherent execution in physics.
  First distinguish the requested action from what the body achieved.
- Players act on acquired, delayed information. Body facing is not measured
  gaze. A coaching cue needs observable evidence, not a convenient timer or
  access to another player's private assignment.
- Use the simplest coherent model that generalizes. Anatomical feet and sole
  models are paused research, not production requirements.
- **Never ban what works too well.** Do not forbid a technique, cap its
  outcome or steer players away because it is too effective. Find why it
  fails in real football: physical limits, cost, fatigue, information or
  the opponent's response. Repair the missing mechanism and leave the
  player free to choose the technique.

## Pick and prove the next change

Testing has a marginal-cost budget. Follow [selective testing](docs/TESTING_COSTS.md):
state one question, then use the smallest reproducer, one relevant opposing
control and directly affected correctness tests. Before adding tests, name the
decision their results could change; otherwise skip them. Reuse fixtures and
compatible receipts. A transfer screen is optional for a specific open risk;
do not climb automatically through 2/8/16/32 snaps. A material adverse result
gets one targeted diagnostic first. One integration owner checks the exact
combined candidate; everyone else supplies focused evidence. Additional games
need an interaction question. `npm run screen:roster` only plans; its committed
baseline/cache avoid baseline reruns. Broad audits require counts/reasons.

Judge changed behavior with [the shared review procedure](docs/BEHAVIOR_REVIEW.md).
The categories interpret existing tests; they are not separate required suites
or mandatory worksheet fields. State what would answer the question before
results; inspect the first relevant divergence when needed. More
tackles or less yardage is not improvement; worse yardage can follow better
football. Unexplained material changes and broken supported contracts block
promotion. The saved-result worksheet is optional. Report only what changed,
evidence for/against, unresolved risk, runtime and next decision; link receipts.

Read [current status](docs/STATUS.md) and [validation](docs/VALIDATION.md).
Choose repeated visible mechanisms from random ordinary film, ranked by
frequency and consequence. A bad average or one spectacular failure is not a
diagnosis. Keep the same bodies, input, seed and measurement operator for
controlled comparisons. Add difficult, mirrored or unaffected cases only for
distinct unresolved risks. If two attempts do not repair the mechanism, stop
and re-diagnose.

When a matched football-transfer question needs games,
`npm run mech:sim && npm run mech:report`
compares the sim with 2022 NFL all-22 tracking using identical measurement
code, per mechanism and per run concept (no raw data needed). A flag is a place
to look, never a number to tune toward; see [NFL data](docs/NFL_DATA.md). This
collector runs eight games; reuse compatible reports and do not run it as a
routine movement/contact check.

Validate physics laws, movement, contacts and decisions before whole games.
Keep shared capacities fixed during controller work. Never add strength or
solver detail just to rescue a statistic. Old NFL benchmarks have been examined;
they are not blind holdouts. The reserved final exam is described in validation.

## Run checks

Requires Node 22.23.3 from `.nvmrc`. Run `npm ci` once, then:

For a ready combined candidate, the integration owner uses the command below
with pinned settings; it preserves skipped evidence.

```sh
npm run baseline:verify -- --candidate --flag RUN_CONTACT_COMPONENTS=1 --fail-fast
```

It applies recorded flags. Local work uses
`npm run baseline:run -- --candidate -- <focused command>`. Commands below are
available checks, not a per-agent checklist; record feature settings explicitly.

```sh
npm test                 # fast production contracts
npm run test:integration # existing game/ensemble checks
npm run test:research    # paused anatomical/sole checks
npm run test:all         # all preserved TypeScript assertions
npm run test:data        # Python data/extraction checks
npm run typecheck
npm run build
```

Use focused tests while iterating; the designated integration owner runs complete
checks once on the exact combined engine candidate. Other agents link their
focused evidence. Docs or film changes do not need new games. Output belongs
in ignored `out/`, not new giant files under `viewer/` or `data/reviews/`.

## What to read

- [Status](docs/STATUS.md): what is live, limits, random review and next work.
- [Branch map and cleanup plan](docs/BRANCHES.md): current references, PR stacks,
  preserved milestones and exact proposed retirement tips; historical ownership
  rows are not a live branch directory.
- [Validation](docs/VALIDATION.md): layers, existing commands and stopping rules.
- [Testing costs](docs/TESTING_COSTS.md): escalation, bounded screens and cached evidence.
- [NFL data](docs/NFL_DATA.md): the shared sim-vs-NFL mechanism report and
  how to fetch the tracking archives.
- [Data guide](data/README.md): NFL inputs, evidence retrieval and film access.
- [Football handbook](docs/football-handbook/README.md): teaching and sources;
  proposals are not implemented features or measured NFL facts.

Historical reviews live in `docs/archive/`. Consult them for a specific
mechanism or evidence pin, not as a sequential reading assignment.

<details>
<summary>Historical reference and #8/#12 preparation instructions — preserved</summary>

These paragraphs retain their then-current task context; they do not override
the accepted-reference queue above.

The shared development baseline is `codex/run-game-integration`, described in
[BASELINE.md](docs/BASELINE.md) and `config/baseline.json`. Fetch it and record
the exact commit before comparing results; use `npm run baseline:run` so ambient
flags cannot change the experiment. Start new work from this baseline. Existing
feature branches must reconcile it before claiming comparable results.

`claude/engine-priorities` remains the primary physics owner's branch and PR #2's
target; it is not the current combined test baseline. Commit coherent steps on
the assigned feature branch and push only that branch. Keep PR #2 draft and do
not merge it until explicitly instructed. Experimental code can be preserved
with its flag off; promotion requires its law and football controls.
Do not push main, rewrite history, force-push, or touch PR #1 without the owner.
Read [work ownership](docs/WORKBOARD.md) before selecting work; claim it there
and coordinate before editing another session's subsystem.

The current pass prepares the reviewed run/catch corrections on approved #8
`c98c2fa`; follow [controller integration](docs/reviews/controller-integration.md).
The Codex integration owner in this chat owns one exact combined verification.
Reuse #10's compatible run-only receipt and contributors' focused evidence.
Actual candidate settings are 44 flags/components=1, with the original 43 values
retained and no new catch flag. Historical `4ded6b6` stays unchanged; unrelated
hands/grip/helper experiments and #3/#4/#5/#7/#11 ancestry remain excluded.
No merge or reference/baseline designation is authorized. The earlier #6-only
receipt remains in [integration ownership/evidence](docs/INTEGRATION.md).


</details>
