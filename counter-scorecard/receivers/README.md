# PR #382 receipts (receiver stalk eligibility)

- `stkprobe.mts <worktree>`: planned stalk targets over every formation x 6 runs x 4 looks x flip (no play run).
  Run once per tree; compare the two TSVs (2,448 rows).
- Matched restage (shift 0 receipt in the PR): `matched-restage.ts replay <seed> <ARM> --run-only --trace` on captures
  seeds 7/9/11/13 (run-only), base develop 7a56d790 (REV) vs 7a56d790 + the change (STK); traces in ignored out/.
  Scored with `python3 -I <script> scripts/mechanics/run_film_reference.py out/mechanics/nfl-plays.jsonl.gz traces...`:
  `../wrfirst.py` (receivers' first contact by split, NFL vs sim), `backertoucher.py` (box backers' first toucher /
  untouched, NFL vs sim), `asgreview.py` (assignment review; sim only, `asgreview.py rfr.py traces...`), `stalk.py`.
- `gap-assignment-witness.test.ts`: the gap-assignment counter/under and trap/odd cases (4 mirrors x seeds 7-11) played
  to the end on both trees; prints Z/X end-of-play target, first carrier-contact defender, time, yards.
