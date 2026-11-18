# Zone YAC and deep-close operators (Defense, 2026-11-18)

Run sim scripts from the repository root (`node --import tsx scripts/diag/zone-yac/<script>.mts ...`); NFL scripts read
BDB 2025 raw files (path at the top of each script) and take weeks then the output path.

- `deep-close.mts SEEDS OUT` / `deep-close-nfl.py WEEKS... OUT`: throws of 15+ air yards vs zone. Deep man = defender
  10+ yd past the LOS at the release nearest the ball's arrival spot. Speed toward the spot at +0/0.4/0.8/1.2 s, backward
  speed and facing at release, distance at arrival. Sim: staged throw at snap + TS (env, default 2.5; the saved rows used
  TS=2.2,2.8) to each eligible receiver, kept when the arrival spot is 15+ yd past the LOS. `dc-an.py FILE...` tables.
  Saved rows: `docs/reviews/data/2026-11-18-deep-close-sim-engine82.json` (develop bcb27ea1, 3 seeds) and
  `docs/reviews/data/2026-11-18-deep-close-nfl-wk1-9.json`.
- `zone-yac2.mts SEEDS OUT` / `zone-yac-nfl2.py WEEKS... OUT`: completions of 10+ air yards vs zone. Nearest defender at
  the catch front / level / behind (±1 yd), YAC, untouched path and time to first contact (any defender within TOUCH,
  default 1.0 yd), path after contact, out of bounds / touchdown, sideline distance, last touch. `CONCEPTS` env filters.
  `zy-an.py FILE...` tables.
- `tail-trace.mts COV CONCEPT FORMATION SEED FLIP(0|1)`, `tail-tags.mts ROWS.json`: one play, and per-play tags for
  never-touched 20+ rows.
