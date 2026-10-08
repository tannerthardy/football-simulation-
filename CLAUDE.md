# Football simulation development

Start with these shared project references:

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
