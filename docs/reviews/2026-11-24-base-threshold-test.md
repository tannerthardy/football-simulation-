# Base shape: an isotropic threshold test (Tools/Physics, 2026-11-24)

Question (design note section 4, Integration's go): did the removed `BASE_ORIENT` builds raise falls because of the *shape* of the base, or because they moved the whole fall threshold? The commits (`8db325f82`, `dcbb30561`, `b83bd9569`) scaled both the base radius and the recovery step by the same ellipse radius along the push, so the threshold moved by that factor (about -12% along the main load in attempt 1).

**Test (scratch, not committed to `src`):** scale both `baseRadius` and `stepSpeed` in `supportParams` by 0.88, 1.0 and 1.14 (an isotropic threshold of that size: no shape), and count every lineman who leaves state `up` on non-screen dropbacks from the snap to the release (`scripts/diag/blocking/falls.mts`, a read-only tap; two seeds x 6 games per arm, 475-565 dropbacks per run, the same games across arms by seed).

| threshold | dropbacks | OL falls / 100 | DL falls / 100 | hit direction OL (along / oblique / across his facing) | DL |
|---|---|---|---|---|---|
| x1.00 (today) | 978 | 3.7 (36) | 10.3 (101) | 6 / 5 / 25 | 16 / 13 / 72 |
| x0.88 | 1,084 | **6.3** (68) | **15.1** (164) | 15 / 10 / 43 | 18 / 21 / 125 |
| x1.14 | 1,058 | 2.8 (30) | 7.3 (77) | 8 / 6 / 16 | 13 / 15 / 49 |

(Counts are men who leave `up` for any reason: a knock-down counts, so the DL column is larger than the earlier "true falls" proxy; the ratios are what carry.)

## Reading

- **A 12% cut in the threshold alone raises OL falls by 1.7x and DL falls by 1.5x**; a 14% rise cuts them by 24% and 29%. The recorded `BASE_ORIENT` results were OL 3.6 -> 8.5 / 6.7 (x2.4 / x1.9) and DL 4.8 -> 8.2 / 7.4 (x1.7 / x1.5). **The isotropic threshold move reproduces most of the rise** (OL x1.7 against x1.9-2.4; DL x1.5 against x1.5-1.7). The shape was not needed for the effect: scaling the threshold was.
- **Hit direction:** about 70% of lineman falls are hits across his facing (OL 25 of 36, DL 72 of 101 at today's threshold; over 60 degrees off his facing), which fits the earlier record (fallers hit side-on) and says a stagger that adds support *along* his facing buys little against the hits that cause falls.
- **So cause (a) and (b) of plan section 7.3 are one thing seen two ways**: the step is about 82% of the threshold, the old shape scaled it, and the whole threshold moved. The Phase 1 base (support added along the brace axis without shrinking across, an unscaled recovery step) has to be judged against falls across his facing, not along.
- Falls are very sensitive to the threshold (about 1.2-1.5% of the threshold per percent): any change that moves `criticalDeviation`, including the mobility cost on the recovery step and a grip change that alters recovery capacity, must be read against this table.

Reproduce: `SCRATCH_CRIT_SCALE=0.88 node --import tsx scripts/diag/blocking/falls.mts --seed 101 --games 6` with `baseRadius` and `stepSpeed` in `supportParams` multiplied by `Number(process.env.SCRATCH_CRIT_SCALE ?? 1)` (a two-line scratch edit; branch `tools/scratch-crit`).
