## Speed roughness on the 0.1 s export grid, NFL vs ours (open movement, 2 yd/s and over)

Quantisation alone (a smooth 6 yd/s run with a slow 0.15 yd/s wobble, rounded to 0.01 yd; its own A and B are not zero because the wobble accelerates a little): A p50 1.00, p90 1.00 yd/s2.

| sample | n | A p50 / p90 | B p50 / p90 | C (0.2 s speed) p50 / p90 | heading change per 0.1 s p50 / p90 (deg, 3 yd/s and over) |
|---|---|---|---|---|---|
| nfl-plays2.jsonl.gz | 1449808 | 1.79 / 4.12 | 1.08 / 2.81 | 1.70 / 4.08 | 1.7 / 5.1 |
| defall-all24.jsonl.gz | 356372 | 2.12 / 5.00 | 1.04 / 3.00 | 2.11 / 4.53 | 2.2 / 8.0 |