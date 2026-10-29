# Squeeze read (#365) matched restage: provenance

Raw artifacts for the k = 4 matched restage cited in #365 and
`docs/reviews/squeeze-read.md`. Historical: measured before the #377 / #372 /
#381 merges. Not part of develop.

## Arms

- **base:** #347's merged head `e8dd41e8`.
- **sq1:** the squeeze read ("attempt 1") on `e8dd41e8`. Its production
  change is the `DL_SQUEEZE` read in `src/sim/engagement.ts` (blocker's
  first seen step plus a seen carrier's lateral track).

## Captures

`captures/seed{r7,r11}.json.gz` are run-only captures (constructor inputs
only), the `seedr7` / `seedr11` sets used throughout the squeeze work.

## Restage

`scripts/restage-runner.ts` replays every snap k = 4 times: shift 0, then
the play's seed forked `shift:<j>`. It records yards, outcome, scheme,
missed/broken tackles by origin (engaged / free / dive, broken), squeezes
and common-format traces.

    node --import tsx scripts/diag/aim-jump/restage-runner.ts base 4 r7 r11 --out <dir>   # base checkout
    node --import tsx scripts/diag/aim-jump/restage-runner.ts sq1  4 r7 r11 --out <dir>   # squeeze checkout

## Measures

- `scripts/dl_scheme.py` gives DL lateral speed toward the play by scheme
  and side. Gap backside DL at 1.0–2.0 s is the RUN-17 cost.
- The rows' `org` gives the missed-while-engaged split (TKL-6).
- NFL: BDB 2023 weeks 1–2, common format.

Node 22.23.3. SHA256SUMS lists every file here.
