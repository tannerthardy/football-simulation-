# Pursuit operator (Defense, 2026-11-23)

One operator, NFL and sim, positions and velocities at 10 Hz only.

- `pursuit-dump-nfl.py DATA_DIR WEEK... OUT.json`: BDB 2025, every completion, carrier and defender tracks from
  `pass_outcome_caught` to the end event. Run with `python3 -I`. DATA_DIR holds plays.csv, player_play.csv and
  tracking_week_N.csv.
- `pursuit-dump.mts SEEDS OUT.json` (env `COVS`): the same rows from the sim. Run from the repo root.
- `pursuit-an.py ROWS.json`: writes ROWS-an.json, one record per play: distance bands at the catch, nearest
  defender's position in the carrier's frame, constant-velocity closest approach, first-defender outcome (stopped /
  contact then beaten / beaten without contact / trailing), failure class, per-0.1 s geometry and what is left after a
  beat.
