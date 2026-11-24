# Football model and diagnostic guide

<a id="operating-plan-read-first"></a>
<a id="start-here"></a>

[PLAN](docs/PLAN.md) and [GAPS](docs/GAPS.md) govern current work; follow
[AGENTS.md](AGENTS.md) for the short start/handoff path. This guide preserves
football-model and diagnostic rules. It does not reinstate the retired
integration queue, WORKBOARD claims or mandatory receipt workflow.

Build a genuinely great football simulation, eventually supporting a management
game. Outcomes should emerge from shared physics and how well players control
their bodies and make decisions. **We are not tuning toward NFL numbers.** Many
wrong mechanisms can produce 4.4 yards per carry. NFL game statistics are the
final exam, not the objective function.

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
- Rules that players are coached to follow (coverage rules, protection rules,
  run fits, route and read rules) are football, not model complexity. Build
  them as they are taught, from what the player can observe. The preference
  for simple models applies to machinery we invent, not to the sport's own
  structure.
- A coached rule is the player's intent, not a script. Players execute it
  imperfectly, by their skill and what they perceive, and improvise within
  it when they think it helps: a receiver bends his stem or changes his
  footwork and hips against the coverage he sees, leans into a defender and
  pushes off. Model the rule, then the execution and the freedom around it;
  both the mistakes and the craft come from the player, not from the rule.
- **Never ban what works too well.** Do not forbid a technique, cap its
  outcome or steer players away because it is too effective. Find why it
  fails in real football: physical limits, cost, fatigue, information or
  the opponent's response. Repair the missing mechanism and leave the
  player free to choose the technique.
- **Commit to a decision.** Real players go and stay with it; ours must not
  re-request a direction and take it back without a reason.
  - Only a decision (the behaviour, on the player's own picture) changes
    direction.
  - Stages after the decision (containment, orientation, spacing,
    engagement, tackle bond) only bound the request continuously. They may
    scale its speed or limit a component smoothly with the player's state.
    They may never zero or flip it as a step function of his own velocity.
  - A threshold that switches mode or target has an enter and an exit
    margin, with the exit on the far side of the entry. This matters most
    when the quantity it cuts depends on the switch, such as his own speed
    or stopping distance.
  - A goal persists until a perceived change clears a margin. Re-scoring
    the same picture every tick is not a new decision.
  - `test/dither-budget.test.ts` holds each controller and post-decision
    stage to its recorded rate of reversed re-aims.
    `scripts/diag/effective-mass/dither-core.ts` attributes each re-aim to
    the stage that caused it.

## Pick and prove the next change

Use PLAN's review/testing tiers. For local diagnosis, state one question and
use the smallest reproducer, a relevant opposing control and affected tests.
Reuse compatible saved inputs and evidence. Before adding a check, name the
decision it could change. A material adverse result first needs an explanation
or targeted diagnostic, not an automatic larger batch. Navigation edits use
only documentation checks.

Judge the mechanism with [the behavior-review definitions](docs/BEHAVIOR_REVIEW.md).
More tackles, less yardage or a better NFL average alone do not prove an
improvement. Preserve adverse cases and explain changed statistics under
[PLAN's merge criteria](docs/PLAN.md#merging): a worse statistic is not a veto;
a regression caused by a bug in the new mechanism is a blocker. The definitions
are interpretation aids, not extra required suites or worksheets.

Use the assigned gap in [GAPS](docs/GAPS.md), its evidence in
[KNOWN_PROBLEMS](docs/KNOWN_PROBLEMS.md), and [validation](docs/VALIDATION.md).
Choose repeated visible mechanisms from random ordinary film, ranked by
frequency and consequence. A bad average or one spectacular failure is not a
diagnosis. Keep the same bodies, input, seed and measurement operator for
controlled comparisons. Add difficult, mirrored or unaffected cases only for
distinct unresolved risks. If two attempts do not repair the mechanism, stop
and re-diagnose.

When stuck, stage the simple case that should obviously work: one concept
against the look it is drawn to beat, one block the stronger man should win,
one tackle with nobody in the way. Run it, and when it fails ask why at each
stage (what he saw, what he decided, what his body did) until the stage at
fault is found. Fix that, re-run the same case, add a case where it should
fail, and only then widen. Whole games hide which stage is wrong.

When a matched football-transfer question needs games,
`npm run mech:sim && npm run mech:report`
compares the sim with 2022 NFL all-22 tracking using identical measurement
code, per mechanism and per run concept (no raw data needed). A flag is a place
to look, never a number to tune toward; see [NFL data](docs/NFL_DATA.md). This
collector runs eight games; reuse compatible reports and do not run it as a
routine movement/contact check.

NFL comparisons are how we find problems, and they are not all equally
reliable. Outcomes and direct measurements (rates, speeds, distances, where a
player is) are strong evidence. Categories we infer from tracking (engaged,
beaten, open, a route's break, came free, which coverage) are weaker, and
weaker again in small cells: before building toward such a gap, check on a
few plays that the operator sees what it claims. Use fine-grained measurement
to find the cause; then prefer the largest gap in a coarse outcome and the
missing mechanism behind it over many small corrections. When football built
as it is coached disagrees with a fine-grained inferred number, the number is
as likely to be wrong as the football.

Validate physics laws, movement, contacts and decisions before whole games.
Keep shared capacities fixed during controller work. Never add strength or
solver detail just to rescue a statistic. Old NFL benchmarks have been examined;
they are not blind holdouts. The reserved final exam is described in validation.

<a id="run-checks"></a>
## Available checks

Requires Node 22.23.3 from `.nvmrc`. Install with `npm ci`. These are available
commands, not a per-agent checklist; PLAN sets the applicable review tiers.
There is no GitHub CI: run the applicable checks locally and report them in
the PR ([No GitHub Actions](AGENTS.md#no-github-actions)).

```sh
npm test                 # production contracts; select relevant tests locally
npm run test:workflows   # native capture/replay, film/CLI and lab contracts
npm run test:integration # workflow plus existing game/ensemble checks
npm run test:research    # paused anatomical/sole checks
npm run test:all         # all preserved TypeScript assertions
npm run test:data        # Python data/extraction checks
npm run typecheck
npm run build
```

`npm run scorecard` defaults to six games; PLAN describes the PR/full tiers.
Do not run it for documentation-only navigation edits. Output belongs in ignored
`out/`, with summaries in the PR. Preserve existing committed fixtures/manifests.
The [historical baseline guide](docs/BASELINE.md) documents profile-based replay;
its launcher and verifier remain tools, not current operating requirements.

<a id="what-to-read"></a>
## Reference material

- [Plan](docs/PLAN.md), [gaps](docs/GAPS.md) and [known problems](docs/KNOWN_PROBLEMS.md): current direction and diagnosis.
- [Run-game reference stack](docs/REFERENCE_STACK.md): the flag combination every agent measures against, and since 2026-11-09 the engine's default. `npm run ref:report` is the standard run-game table; `npm run ref -- --off -- <command>` runs the legacy engine. The test suites are still pinned to the legacy engine (`vitest.config.ts`) until re-recorded.
- [Flags](docs/FLAGS.md) and [parked ideas](docs/PARKED.md): switches and unresolved alternatives.
- [Validation](docs/VALIDATION.md), [testing costs](docs/TESTING_COSTS.md) and [behavior review](docs/BEHAVIOR_REVIEW.md): diagnostic references; PLAN supersedes old process requirements.
- [NFL data](docs/NFL_DATA.md) and [data guide](data/README.md): inputs, evidence retrieval and film access.
- [Football handbook](docs/football-handbook/README.md): teaching and sources; proposals are not implemented features or measured NFL facts.
- [Branch map](docs/BRANCHES.md): verified entry points and dated preservation records.

The [former integration record](docs/INTEGRATION.md) and `docs/archive/` preserve
older decisions and research. Consult them for a specific mechanism or source
pin, not as a sequential reading assignment. The superseded operating paragraphs
remain recoverable in the [pre-cleanup version of this file](https://github.com/tannerthardy/football-simulation-/blob/50a1858cb6ff49bc7000e3e4b91a0be5134f79ba/CLAUDE.md).
