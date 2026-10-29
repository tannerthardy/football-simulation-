# DEV6949: the same 456 matched constructors on develop 6949f645

Run-only matched restage (seeds 7/9/11/13, 4 named-stream shifts, `--trace`) on
`6949f6454af3a88ff0d0bb41ca424f4ff4174b0d` with the restage overlay applied
uncommitted. The overlay diff sha256 is `91fb76b3c4b92db33b9915ca60c3597f7df09d765d8112615a8cc0d145c6af88`,
identical to `../overlay.patch`, plus `../run-trace-watch.ts` (sha256 `305aa029…c304`, identical).
Launcher: `../arms3.sh`. The four launcher receipts are the `run-*.json` files here. They record
the commit, flags and sourceSha256 `32c33cf4…2bdd`.

Purpose: tell apart a code difference from a capture-set difference in IZ LB depth at the
climb. Defense measured 2.79 on its full-game captures; on these snaps it was 2.40 on DEV542.

izclimb operator vs NFL weeks 1-9 (`nfl-plays.jsonl.gz` sha 9aa1b087…0726):

| arm | IZ n | LB depth at climb | climber depth | close | LB downhill |
|---|---|---|---|---|---|
| NFL | 269 | 2.78 | 1.60 | +0.19 | +0.34 |
| DEV542 (`../trace-seed*-run-DEV542`) | 185 | 2.40 | 1.86 | +0.01 | +0.08 |
| DEV6949 (here) | 183 | 2.41 | 1.85 | +0.00 | +0.14 |

OZ is unchanged between the arms as well: LB depth 2.59 / 2.59 vs NFL 2.76.
