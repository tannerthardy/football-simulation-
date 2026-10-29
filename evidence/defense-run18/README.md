# RUN-18 (#377) matched restage: provenance

Raw artifacts for the k = 4 matched restage cited in #377 and
`docs/reviews/contain-flow.md`. Not part of develop.

## Arms

- **base:** develop `510f7a6a` (detached worktree).
- **fix:** `f77bba12` (`defense/G2-run18-contain-flow` before the 0ab4bf39
  merge). Its only production change from base is in `src/sim/engagement.ts`:
  the containment bound drops an outward held flow, and the observer gains
  `contain`/`trail`/`squeeze`.

## Captures

`captures/seed{7,9,11,13}-run.json.gz` hold constructor inputs only. They come
from `scripts/capture-run.ts` run on develop `6949f645`: `simulateGame` with
`runOnly: true` and the same playSetup/playResult hooks as
`scripts/diag/matched-restage.ts capture`.

    node --import tsx capture-run.ts 7 9 11 13   # writes out/matched-restage/seed<N>-run.json

## Restage

`scripts/restage-runner.ts` is `scripts/diag/aim-jump/restage.ts` with rows and
common-format traces. It replays every snap k = 4 times: shift 0, then the
play's seed forked `shift:<j>`. It records yards, outcome, scheme,
missed/broken tackles by origin, and squeezes.

    # in each arm's checkout, with the captures under out/matched-restage/
    node --import tsx scripts/diag/aim-jump/restage-runner.ts base 4 7-run 9-run 11-run 13-run --out <dir>
    node --import tsx scripts/diag/aim-jump/restage-runner.ts fix  4 7-run 9-run 11-run 13-run --out <dir>

Output: `restage/{base,fix}.rows.json` (1,932 runs each, ids `S<seed>-run-<snap>-k<j>`),
`restage/{base,fix}.jsonl.gz` (common-format traces) and the run logs.

## Measures

    python3 -I scripts/edge_contain.py NFL=<nfl-plays-w12.jsonl.gz> base=restage/base.jsonl.gz=restage/base.rows.json fix=restage/fix.jsonl.gz=restage/fix.rows.json
    python3 -I scripts/dl_scheme.py  ...same arguments...
    python3 -I scripts/dl_align.py   ...same arguments...

The NFL file is BDB 2023 weeks 1–2 in the common format
(`scripts/mechanics/run_film_reference.py` export). Yards per run and per-scheme
yards are the rows' `yards` paired by id, with shift-level standard error over
the four shifts. Results are in the #377 body.

Node 22.23.3. SHA256SUMS lists every file here.
