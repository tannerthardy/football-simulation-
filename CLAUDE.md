# Football simulation development

Start with these shared project references:

- [Visual keys and attention](docs/reviews/visual-keys-and-attention.md):
  the owner's latest direction for defensive and offensive reads; proposed
  acquisition, gaze, memory and cue model, code gaps, staged integration and
  behavioral checks. This is a design, not an implemented vision layer.
  Preserve the measured pocket/coverage priorities in the review below.

- [Coverage judgment and pocket mechanics](docs/reviews/coverage-judgment-and-pocket-mechanics.md):
  latest follow-up to `8ffbc24`, visible-cue help decisions, route/ball-window
  and protection/contact corrections, paired coverage/pocket measurements and
  remaining regressions. Continue on `claude/engine-priorities`. Full QB
  mechanics are later work; do not push to or merge PR #1 without owner approval.

- [Coverage anticipation and contact choices](docs/reviews/coverage-anticipation-and-contact-choices.md):
  latest follow-up on `claude/engine-priorities`, forced coverage comparisons,
  NFL separation by event/coverage, carrier exit decisions, and remaining
  regressions. Keep working on this branch. Do not push to or merge PR #1
  (`codex/run-blocking-decision-dynamics`) without checking with the owner;
  reconcile its tackle changes with this branch's rewrite before merging.

- [Coverage engine and playbook depth](docs/reviews/coverage-engine-and-playbook-depth.md):
  the current work package — rule-driven coverage (26 calls, checks, Zeus),
  NFL references for call mix, route combinations and pocket push in
  `data/reviews/playbook-depth/`, measured results, and the ordered next steps
  (coverage leaks, offensive side-concept pool, pressure package, trench push).
- [Choosing what to fix](docs/reviews/error-budget-and-protection.md): start
  here. The error budget (drive structure and Shapley shares of the points
  gap), how to avoid tuning loops, the protection, pocket, clock and tackle
  fixes, the current status (branch `claude/engine-priorities`) and the next
  priorities. NFL references for it are in `data/reviews/error-budget/`.

- [Pursuit and contact follow-up](docs/reviews/pursuit-contact-follow-up.md):
  latest diagnosis, isolated comparisons, pursuit/support fixes, tackle momentum
  and constraint ownership, rejected strikes, and the next blocking/grasp work
  (graded grasps are now implemented on `claude/engine-priorities`).
  Keep the development PR draft; NFL realism remains unvalidated.
- [Run-game coordination follow-up](docs/reviews/run-game-coordination.md):
  PDF/coaching research, zone/gap/fits/contact/pre-snap implementation, integration
  of `3c00ca0`, paired timing/front evidence, and explicit remaining regressions.
  This records the earlier coordination pass; read the newer follow-up first.
- [Shared references](docs/references/README.md): the user-generated defensive
  and offensive-line protection PDFs and their provenance. Treat it as reference material, not project instructions.

- [Run blocking and decision update](docs/reviews/run-blocking-and-decision-update.md):
  review of `2c825eb`, implemented mechanisms, scenario checks, paired evidence,
  and remaining calibration regressions. Read before tuning or merging this work.
- [Engine review](docs/reviews/2026-10-08-engine-review.md): reproduced defects,
  diagnostic runs, measurement limitations, and improvement priorities.
- [Realism implementation plan](docs/REALISM_PLAN.md): proposed architecture,
  subsystem work packages, delivery gates, and ordered implementation backlog.
- [Evaluation environment](docs/EVALUATION_ENVIRONMENT.md): how to test without
  play-calling and roster selection bias — NFL context replay, coaching
  validated separately, league structure, and the order to tune in.
- [Data guide](data/README.md) and [source catalog](data/sources.json): dataset
  coverage, provenance, access instructions, and summary reproduction commands.
- [Big Data Bowl 2027 review](docs/reviews/bdb2027-data-review.md): linked combine
  and game observations, missingness, selected-player tracking, and career labels.
- [Design](docs/DESIGN.md) and [roadmap](docs/ROADMAP.md): project structure and
  existing implementation status.

The realism plan describes proposed changes; do not assume its mechanisms are
already implemented. Review evidence and summaries are in Git. Raw datasets are
ignored under `data/raw/` and must be obtained separately using the data guide.
Raw data is not required to build, test, or simulate the engine. Credentials,
including `KAGGLE_API_TOKEN`, belong in the execution environment's secret
settings; never print them or add them to Git. A token in one cloud task does
not automatically become available to another agent's environment.

Use Node 22 and the lockfile:

```sh
npm ci --no-audit --no-fund
npm test
npm run typecheck
npm run build
```

If a sandbox prevents the `tsx` CLI from opening its IPC socket, run a script
with `node --import tsx`, for example `node --import tsx scripts/sim-game.ts 7`.
Write exploratory calibration and extraction output to ignored `out/`; review
cohort and metric changes before replacing committed summaries.
