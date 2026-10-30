# Counter scorecard (Run Game), NFL vs sim, same operator

Positions-only scripts that read NFL 2022 tracking (`out/mechanics/nfl-plays.jsonl.gz`) and sim run traces through
`scripts/mechanics/run_film_reference.py`'s own loaders (`nfl()`, `sim()`, `puller()`). Pull side = the rule
pullers' mean lateral at 1.5 s. Usage: `python3 -I <script> scripts/mechanics/run_film_reference.py out/mechanics/nfl-plays.jsonl.gz <traces...>`.

- `ctrcard.py`: per role (PST PSG C BSG BST, `+pull` = rule puller, TE by side, second back): path (lateral toward the
  pull side / depth at 0.5-2.0 s) and first sustained block (1.2 yd for 0.3 s): level x side relative to the blocker.
- `ctrclock.py`: handoff, carrier crossing time/lateral; backside line DT/DE depth and lateral flow; near-carrier share.
- `ctrback.py`: centre vs the backside line defender over the pulled guard (back block geometry over time).
- `ctrfirst.py`: first-contact defender's snap class; behind-LOS share; sim adds his snap assignment and whether held.
- `kicknone.py`, `wrapdiag.py` (sim only): kick pullers with no contact; wrap pullers' first contact by snap job.
- `wrfirst.py`: receivers' first contact by split, NFL vs sim (PR #382).
- `kicklog.py`: two-OL-puller counters; kick man = kicker's first sustained block on a line defender. At onset + 0.3 s:
  kicked out (kicker inside him by > .25) / logged (outside by > .25), the man's depth and lateral from the snap PST;
  at the carrier's crossing, carrier and wrap lateral relative to the man, split log / mid / out.
- `ctrdbl.py`: dblside's doubles operator on counter (pull side from rule pullers): start, leave, climb share, meet,
  climber speed after leave. `ctrdblwho.py`-style breakdown by snap plan is in `ctrasg.py` / `wrapwho.py` (sim only).
- `wrapwho.py`, `wrapeng.py`, `logcheck.py`, `logfilm.py`, `ctrasg.py` (sim only): pullers' first block by slot vs
  planned target; the wrap's first engagement and his spot when he sits near the kicked end; kicker-outside-end cases
  and whether a log was declared; text film of log cases where the carrier goes inside; snap assignment collisions.

Sim traces: run-only matched restage replays (`scripts/diag/matched-restage.ts replay <seed> <arm> --run-only
--shifts 4 --trace`), with the local replay filter in `matched-restage-concept-filter.patch` (`--concept counter` replays
only run snaps whose scheme is listed; ids keep the capture index). `ctrarm.sh` runs 12 seeds (7..29 odd) in batches of 4.
Captures were taken on develop e70cc2ab (`capture <seed> --run-only`).

Results so far (Run Game session, 2026-10-30): CB0 = develop e70cc2ab + #382; CB2 = + down/back block fits the man's
path to the ball at his intercept. See the session's report on PR #382 / the counter PR for the tables.

- `climbspd.mts` (sim only, `npx tsx climbspd.mts <worktree> 7,9,11`): counter combos after release: the climber's
  requested speed (his MoveCommand) vs achieved speed, gap to the released DL, joints, facing vs requested direction.
- `ctrvariant.py` (NFL): counter variants by OL rule pullers and non-OL wrappers (GT / GH / GY ...).
