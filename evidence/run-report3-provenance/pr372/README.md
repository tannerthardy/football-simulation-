# #372 matched-restage arms: sources, receipts, results, traces

Existing files only; nothing here was re-simulated. One snap set for every arm: the 456 run-only constructors in
`../seed{7,9,11,13}-run.json.gz`, byte-identical to the files each arm replayed, each replayed on 4 named-stream shifts
(`--run-only --shifts 4 --trace`). Base DEV542 is `542d938d`; its results/traces are one level up. Launcher:
`../arms3.sh`. Restage overlay diff sha256 `91fb76b3…af88` (= `../overlay.patch`) and recorder `../run-trace-watch.ts`
(`305aa029…c304`) are identical in every worktree that ran these arms.

Source digest = `scripts/source-version.ts` (sha256 over `src/` only), as recorded in each receipt and rebuilt here:

| Arm | Receipt HEAD | Source digest | Source | What it is |
|---|---|---|---|---|
| RB1 | 542d938d | 2307debf… | `sources/RB1-src-on-542d938d.patch` | REJECTED all-concept version: every run back reads the hole from 2 yd off the line (−4.5 → −2), plus route threat time around seen blocker bodies / free interceptors |
| RB2 | 542d938d | 2ebbdeaf… | `sources/RB2-src-on-542d938d.patch` | REJECTED: all-concept read from 2 yd only |
| RB3 | 542d938d | dca69e0b… | `sources/RB3-src-on-542d938d.patch` | REJECTED: route threats around bodies only |
| RB4 | 542d938d | 0b1b75bb… | `sources/RB4-src-on-542d938d.patch` | REJECTED: RB2 plus a field-fixed down-block side (engagement.ts) |
| RB5 | 225f1534 (uncommitted tree) | 8f0f892c… | commit `6a7c917a` | counter/power follow their pullers to 2 yd; all other schemes unchanged |
| RB6 | 6a7c917a (uncommitted tree) | 7678afac… | commit `e6922271` | RB5 + a free upright defender in the track ends the follow |

The RB1 source was rebuilt from the session's saved base file plus the recorded edit, the RB2–RB4 sources from the
worktrees still holding them. Each reproduces its receipt digest exactly. RB5/RB6 digests equal those commits rebuilt
from git. RB6 has 8 receipts: the first 4 (exit 1) are an aborted attempt, where I removed the overlay mid-run. The 4
exit-0 receipts are the run used. The current head `1d401d2d` (track check against the pressed live aim) has digest
`8ab93ab7…` and was **not** restaged.

Missing, stated plainly: RB2 results and the RB1–RB4 traces were deleted before this bundle (disk cleanup). RB1/RB3/RB4
result files are here; RB2 has receipts and source only. Counter never-crosses for the rejected all-concept arms
(25% → 29–30%) and their pull-side shares were measured on those deleted traces, so they cannot be re-derived here.

Matched comparisons (`compare.txt`; matched-restage.ts compare, `--run-only`, 5 stream pairs per snap):

| base → arm | snaps changed (shift 0) | at any shift | at every shift | run yd | mean abs yd moved by arm (dice alone) |
|---|---|---|---|---|---|
| DEV542 → RB1 | 423 | 454 | 356 | 7.39 → 5.92 | 5.41 (9.1) |
| DEV542 → RB3 | 422 | 454 | 349 | 7.39 → 5.78 | 5.28 (9.1) |
| DEV542 → RB4 | 409 | 443 | 324 | 7.39 → 5.81 | 5.06 (9.1) |
| DEV542 → RB5 | 83 | 98 | 48 | 7.39 → 7.15 | 1.23 (9.1) |
| DEV542 → RB6 | 82 | 98 | 48 | 7.39 → 7.15 | 1.23 (9.1) |
| RB5 → RB6 | 9 | 34 | 0 | 7.15 → 7.15 | 0.01 (8.9) |

RB5 → RB6 changes only counter/power snaps; every zone, trap and other snap is identical in all 5 pairs. Pull-side
crossing (same operator as NFL, weeks 1–9): counter 0.68 → 0.68, power 0.91 → 0.91, trap 0.79 → 0.79 (NFL counter
0.90). Yards are reported, not the objective.

## RB7 (added): head `58da9718`, source digest 918b24d6…

Receipt HEAD `1d401d2d` (uncommitted tree); the digest equals commit `58da9718` rebuilt. Contents: `1d401d2d` (track
check against the pressed point) plus the kick read. The counter/power follow also ends when the back sees his kick
puller at the line with an upright man on his hands. The read decides kicked-out vs logged from where that man stands
in the back's picture, not from the puller's private `block-log` tag. Same 456 constructors × 5 stream pairs.

| | DEV542 | RB6 | RB7 |
|---|---|---|---|
| run yd (shift 0) | 7.39 | 7.15 | 7.29 |
| counter pull side / no crossing | 0.46 / 43 | 0.68 / 50 | 0.65 / 50 |
| power pull side / no crossing | 0.85 / 57 | 0.91 / 63 | 0.89 / 58 |
| trap pull side / no crossing | 0.79 / 37 | 0.79 / 37 | 0.80 / 38 |
| counter mean yd / loss share (all 5 pairs) | 6.44 / 0.23 | 5.18 / 0.26 | 5.86 / 0.26 |
| power mean yd / loss share | 6.78 / 0.21 | 4.42 / 0.25 | 6.64 / 0.21 |
| trap mean yd / loss share | 6.10 / 0.22 | 6.10 / 0.22 | 5.88 / 0.23 |
| all other runs | 7.19 | 7.19 | 7.19 (identical) |

RB6 → RB7: 52 snaps changed at shift 0, 90 at any shift, 10 at every shift. Mean abs yd moved by the arm 0.62 (dice
alone 8.91). NFL pull side: counter 0.90, power 0.89, trap 0.78.
