# Start here

Build a genuinely great football simulation, eventually supporting a management
game. Outcomes should emerge from shared physics and how well players control
their bodies and make decisions. **We are not tuning toward NFL numbers.** Many
wrong mechanisms can produce 4.4 yards per carry. NFL game statistics are the
final exam, not the objective function.

Work on `claude/engine-priorities`. Commit coherent steps and push that branch.
Do not push main, rewrite history, force-push, or touch PR #1 without the owner.

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

## Pick and prove the next change

Read [current status](docs/STATUS.md) and [validation](docs/VALIDATION.md).
Choose repeated visible mechanisms from random ordinary film, ranked by
frequency and consequence. A bad average or one spectacular failure is not a
diagnosis. Keep the same bodies, input, seed and measurement operator for
controlled comparisons; include ordinary, difficult, mirrored and unaffected
cases. If two attempts do not repair the mechanism, stop and re-diagnose.

For movement and contact mechanisms, `npm run mech:sim && npm run mech:report`
compares the sim with 2022 NFL all-22 tracking using identical measurement
code, per mechanism and per run concept (no raw data needed). A flag is a place
to look, never a number to tune toward; see [NFL data](docs/NFL_DATA.md).

Validate physics laws, movement, contacts and decisions before whole games.
Keep shared capacities fixed during controller work. Never add strength or
solver detail just to rescue a statistic. Old NFL benchmarks have been examined;
they are not blind holdouts. The reserved final exam is described in validation.

## Run checks

Requires Node 22. Run `npm ci` once, then:

```sh
npm test                 # fast production contracts
npm run test:integration # existing game/ensemble checks
npm run test:research    # paused anatomical/sole checks
npm run test:all         # all preserved TypeScript assertions
npm run test:data        # Python data/extraction checks
npm run typecheck
npm run build
```

Use focused tests while iterating; run complete checks once before publishing
an engine change. Docs or film changes do not need new games. Output belongs
in ignored `out/`, not new giant files under `viewer/` or `data/reviews/`.

## What to read

- [Status](docs/STATUS.md): what is live, limits, random review and next work.
- [Validation](docs/VALIDATION.md): layers, existing commands and stopping rules.
- [NFL data](docs/NFL_DATA.md): the shared sim-vs-NFL mechanism report and
  how to fetch the tracking archives.
- [Data guide](data/README.md): NFL inputs, evidence retrieval and film access.
- [Football handbook](docs/football-handbook/README.md): teaching and sources;
  proposals are not implemented features or measured NFL facts.

Historical reviews live in `docs/archive/`. Consult them for a specific
mechanism or evidence pin, not as a sequential reading assignment.
