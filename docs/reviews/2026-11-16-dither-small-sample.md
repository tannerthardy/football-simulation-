# The dither budget on small-sample rows (Tools, 2026-11-16, develop e9023c6f)

Question (Integration, after engine-72 re-recorded the pursuit row 0.411 → 0.622): how should `test/dither-budget.test.ts` treat a row with little moving time? Measured: the same 135 plays, same calls and flips, the play seeds shifted by 100 (`DITHER_PANEL_SEED=100 DITHER_PRINT=1 npx vitest run test/dither-budget.test.ts -t "per controller"`, a multiple of 2 keeps the flips), eight draws 0-700 on engine-72, nothing else changed. Draw 0 reproduces the recorded 0.6220 / 135 s / 84 events exactly.

| row | pooled rate | sd across draws | Poisson sd of one draw | ratio | moving s per draw | range of draws |
|---|---|---|---|---|---|---|
| pursuit | 0.437 | 0.084 | 0.058 | 1.43 | 99-210 | 0.358-0.622 |
| pursuit facing | 0.560 | 0.119 | 0.127 | 0.94 | 28-64 | 0.421-0.803 |
| carrier | 0.355 | 0.035 | 0.035 | 1.00 | 241-339 | 0.318-0.410 |
| QB | 0.059 | 0.011 | 0.014 | 0.76 | 259-318 | 0.044-0.076 |
| QB facing | 0.180 | 0.016 | 0.025 | 0.65 | 259-298 | 0.155-0.203 |
| route | 0.122 | 0.023 | 0.009 | 2.46 | 1246-1435 | 0.090-0.166 |
| block / rush / coverage | 0.311 / 0.225 / 0.369 | 0.027 / 0.016 / 0.013 | 0.009 / 0.009 / 0.010 | 3.0 / 1.8 / 1.3 | 2200-4300 | within 10% of the pool |

Pursuit by draw, rate (moving s, events): 0.622 (135, 84), 0.445 (99, 44), 0.364 (151, 55), 0.358 (103, 37), 0.409 (210, 86), 0.404 (154, 62), 0.440 (121, 53), 0.473 (116, 55).

What this says:

* The recorded 0.622 is the highest of eight draws, 2.2 sd above their mean. No group of flags moved it: the engine change re-drew the panel's random numbers (any change to which plays happen does), and the draw landed high. The earlier 0.411 was an ordinary draw (0.8 sd under the mean), but its budget, 0.411 x 1.10 + 2 sqrt(42) / 102 = 0.58, sits 1.7 sd over the mean: about one engine change in twenty fires on noise alone, which is what happened.
* Re-recording to 0.622 fixed the alarm and loosened the gate: the budget is now 0.82. A true rise of half (0.437 → 0.656) is caught by about 3% of draws; a doubling by about 75%.
* The budget's slack `2 sqrt(events) / moving s` is two Poisson sds of the row. It is right for `carrier`, `pursuit facing` and the QB rows, short for pursuit (ratio 1.4: reversed re-aims come in bursts inside one play) and short for the large rows (ratio 2-3), where it does not matter because their draw sd is 4-9% of the rate.
* Recording a single draw is the fault, more than the slack: the record itself carries the draw's error, once up (now) and once down (before).

Options, each test-only (Gaussian approximation from eight draws; budget = record x 1.10 + 2 sd of what the gate reads; record = the pooled rate 0.437; "+50%" is a true rate of 0.656):

| gate reads | cost | budget | fires with no change | catches +50% |
|---|---|---|---|---|
| one panel (now, pooled record) | 1.0 x | 0.65 | 0.6% | 53% |
| two draws pooled ("two-seed mean") | 2.0 x | 0.60 | 0.3% | 83% |
| three draws pooled | 3.0 x | 0.58 | 0.2% | 95% |
| four draws pooled | 4.0 x | 0.57 | 0.2% | 99% |
| now, record 0.622 | 1.0 x | 0.82 | about 0 | 3% |

Recommendation: record every small row from the pooled mean of several draws, never from one; and pool three draws of the plays that feed `pursuit`, `pursuit facing` and `carrier` in the gate. Pooling the whole panel three times triples a test that already takes about a minute; the screens are 40 of its 135 plays, and if they are where the pursuit time comes from (to measure first: the accumulator is per controller, not per play) three blocks of them cost about 80 plays more. Failing that, two draws of the whole panel. If neither is wanted, keep one panel and record the pooled rate 0.437 with slack of 2 x 1.4 Poisson sds (budget 0.65): the same noise protection as now with the gate no longer loosened by one draw.

Not done here: no MEASURED value is changed in this note. The only change is the `DITHER_PANEL_SEED` knob (default 0: the recorded panel, byte-identical). Defense's seed-100 read of 0.571 is on their seeding; this re-draws the play seeds only, and reads 0.445. Both are inside the spread above.
