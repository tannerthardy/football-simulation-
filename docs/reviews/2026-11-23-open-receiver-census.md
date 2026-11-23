# Open-receiver census, NFL vs ours (develop 0226f0d3, engine-91)

Tools/Physics, 2026-11-23, for Integration (the user's film finding: "we're just leaving dudes way too wide open too often"). One operator on both sides (`scripts/diag/census/`): `nfl_plays.py` and `sim_plays.mts` write the same play format, `open_census_report.py` reads it. NFL: BDB 2025 weeks 1-9 (2022), 9,657 dropbacks. Ours: 24 games (seed 101 Ironmen v Comets, 8 games; plus 16 games on seeds 202, 303, 404, 505, each with its own team pair), 2,128 dropbacks; read-only tap on `PlaySim.tick`. Wide open is d1 beyond the NFL's own p90 for that (moment kind, depth band).

## Answer in short

- **In aggregate we do not leave receivers more open than the NFL, and the extreme cases are not more common in ours.** Dropbacks with at least one wide-open receiver at the release (ours, 24 games): .361 against the NFL .338; at any fixed time .525 / .550. Per dropback, a main route runner (not behind the line, not a back within 3 yd of it) with d1 over 8 / 10 / 12 / 15 yd at the release: NFL .071 / .021 / .007 / .002, ours .070 / .013 / .002 / .001; any fixed time: NFL .072 / .012 / .003 / .001, ours .067 / .007 / .001 / .000. Man: NFL .022 / .003 at 8 / 10 yd at the release, ours .013 / .002. Zone: NFL .091 / .026, ours .088 / .017. So F09 (15.7 yd) and F13 (15.5 yd) are real but rare in both: about 1 in 500 dropbacks in the NFL at the release, about 1 in 1,000 in ours.
- **Leverage: wide open with the nearest defender over the top (more than 1 yd downfield of him) is the norm on both sides.** Wide-open receiver-moments at the release (over the top / level / trailing): NFL .63 / .06 / .30, ours .61 / .06 / .33; at fixed times NFL .71 / .06 / .22, ours .66 / .07 / .27. Ours has slightly more trailing defenders, not more "open behind everyone".
- **The one place ours is wider holds on the new games: 10-15 yd while the ball is held, Cover-2 and Cover-6.** Wide-open share of receiver-moments at fixed times, 10-15 yd: Cover-2 NFL .177 (n 1,801); the 8 original games .573 (n 124); the 16 new games .441 (n 186). Cover-6 NFL .096 (n 1,240); .305 (n 105); .216 (n 134). At the release: Cover-2 NFL .188, ours .391 / .348; Cover-6 NFL .097, ours .218 / .157. The excess shrinks on the new games but stays at about 2.5x (Cover-2) and 2.2x (Cover-6) the NFL's.
- **Rungs.** Refinements off (rung 1) leaves roughly as many receivers open as the default; the spot arm (rung 2) leaves clearly more: wide-open receiver at the release .571 (rung 2) against .395 (rung 1) and .361 (default); targeted receiver d1 median 4.9 against 3.7 / 3.7. By Coverage's reading: the match layer is not what leaves men open; it closes spot drops (rung 2 is the worse, by a wide margin in Cover-3, Quarters and Cover-2). Rung 1 against rung 0 by family: Cover-6 .647 against .463 and Cover-1 .139 against .108 at the release (the refinements close Cover-6); Cover-2 .558 against .620 and Cover-3 .376 against .391 (the refinements are not what closes those). Rung samples are 8 games each, so each family cell is 70-280 dropbacks.
- Operator checks (unchanged): formation label agrees with PFF's receiverAlignment on .915 of NFL plays; a second implementation matches the operator exactly on 54 NFL and 58 sim receiver rows at the release.
- Caveats: the z values in the cell tables treat receiver-moments as independent but receivers in one play are correlated, so they overstate; route runner = PFF `wasRunningRoute` (NFL) and a behavior that is a route (ours); NFL tracking is the 2022 season weeks 1-9. I did not cut by concept. The census does not say why the QB does not use the 10-15 yd windows.

Rung 2 is harness only: `scripts/diag/census/spot-harness.patch` wraps `installCoverage` (CENSUS_SPOT=1) in a separate worktree, never applied to the engine: coverage mapped to cover1 / 2 / 3 / 4 by family (cover0, cover1, cover2man to cover1; cover2, tampa2 to cover2; cover3 to cover3; cover4, cover6 to cover4), a pressure that brings its own coverage keeps its rushers (a creep needs its blitzer) and loses that coverage, zone calls play `zoneStyle = 'spot'`, no structure checks. Rung 1 and 2 run Coverage's flag set `QUARTERS_CHECK=0 MATCH_DECLARE=0 MUSH_MATCH=0 MUSH_TRAP=0 C2_APEX=0 SQUAT_TOPDOWN=0 Q_APEX=0 CUT_WALL=0 BOX_IN=0 SCREW=0 TAMPA_PIPE=0 FLAT_SINK=0 FLAT_CARRY=0 CURL_SINK=0 OPEN_CARRY=0 HALF_KEY=0`; sim seed 101, games 0-7, the same teams as the original sample.

Wide-open exports for Coverage's attribution (play, concept, coverage, receiver, time, d1 / d2, nearest defender and relation, every defender's behavior kind, seat and technique): `data/reviews/census/wide-open-all24.json.gz` (default), `wide-open-r1.json.gz`, `wide-open-r2.json.gz`.

## The three rungs

| sample | wide-open WR at the release | at any fixed time | two consecutive fixed times | targeted receiver d1 p10/25/50/75/90, wide |
|---|---|---|---|---|
| NFL (9,657 dropbacks) | 0.338 (2922/8638) | 0.550 (4776/8691) | 0.250 (2172/8691) | 1.2 / 2.0 / 3.5 / 5.5 / 7.4, 0.138 |
| Rung 0, default (24 games, 2,128 dropbacks) | 0.361 (675/1868) | 0.525 (1116/2126) | 0.273 (581/2126) | 1.4 / 2.5 / 3.7 / 5.1 / 6.8, 0.147 |
| Rung 1, refinements off (8 games, 703) | 0.395 (245/620) | 0.537 (377/702) | 0.271 (190/702) | 1.6 / 2.5 / 3.7 / 5.0 / 7.1, 0.163 |
| Rung 2, spot (8 games, 690) | 0.571 (362/634) | 0.684 (472/690) | 0.432 (298/690) | 1.6 / 3.0 / 4.9 / 6.4 / 8.5, 0.314 |


### By coverage family (our label mapped to PFF's; dropbacks with a wide-open receiver at the release, and at any fixed time)

**Rung 0, default (24 games)**

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 740 | 3161 | 3.0 / 6.0 | 0.102 | 0.391 | 10801 | 3.1 / 5.9 | 0.110 | 0.648 |
| Cover-1 | 437 | 1815 | 1.8 / 4.6 | 0.024 | 0.108 | 6409 | 2.1 / 4.7 | 0.025 | 0.255 |
| Quarters | 333 | 1436 | 3.1 / 6.4 | 0.121 | 0.448 | 4702 | 3.3 / 5.9 | 0.108 | 0.628 |
| Cover-2 | 270 | 1137 | 3.4 / 7.7 | 0.208 | 0.620 | 4279 | 2.8 / 5.8 | 0.116 | 0.633 |
| Cover-6 | 212 | 913 | 3.0 / 6.4 | 0.123 | 0.463 | 3090 | 3.0 / 5.7 | 0.101 | 0.590 |
| Cover-0 | 108 | 343 | 1.5 / 4.4 | 0.023 | 0.087 | 1349 | 1.3 / 4.2 | 0.016 | 0.102 |
| 2-Man | 28 | 117 | 1.9 / 4.4 | 0.000 | 0.000 | 418 | 2.3 / 4.9 | 0.033 | 0.357 |

**Rung 1, refinements off**

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 260 | 1093 | 2.8 / 6.1 | 0.091 | 0.376 | 3790 | 2.9 / 5.7 | 0.097 | 0.592 |
| Cover-1 | 125 | 517 | 2.0 / 4.7 | 0.029 | 0.139 | 1959 | 2.1 / 4.7 | 0.024 | 0.280 |
| Cover-2 | 123 | 488 | 3.4 / 6.9 | 0.160 | 0.558 | 1881 | 2.9 / 5.7 | 0.108 | 0.607 |
| Quarters | 83 | 385 | 3.1 / 6.6 | 0.125 | 0.481 | 1168 | 3.3 / 5.9 | 0.112 | 0.627 |
| Cover-6 | 72 | 330 | 3.2 / 6.9 | 0.170 | 0.647 | 1110 | 3.1 / 5.9 | 0.131 | 0.792 |
| Cover-0 | 29 | 92 | 1.7 / 4.1 | 0.033 | 0.136 | 350 | 1.6 / 4.4 | 0.026 | 0.172 |
| 2-Man | 11 | 49 | 1.4 / 4.8 | 0.020 | 0.100 | 163 | 1.9 / 4.3 | 0.000 | 0.000 |

**Rung 2, spot**

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 282 | 1263 | 3.9 / 7.5 | 0.194 | 0.658 | 3843 | 3.8 / 6.6 | 0.188 | 0.780 |
| Quarters | 154 | 697 | 4.5 / 8.0 | 0.247 | 0.731 | 2097 | 4.5 / 7.2 | 0.273 | 0.877 |
| Cover-1 | 145 | 581 | 1.7 / 4.7 | 0.021 | 0.095 | 1972 | 1.7 / 4.4 | 0.019 | 0.179 |
| Cover-2 | 109 | 479 | 4.4 / 7.8 | 0.273 | 0.710 | 1614 | 3.6 / 6.5 | 0.199 | 0.835 |

### Leverage and extreme openness, by sample

**NFL**

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 39701) | 0.50 | 0.32 | 0.18 |
| all, fixed (n 111216) | 0.52 | 0.32 | 0.16 |
| wide open, release (n 3972) | 0.63 | 0.06 | 0.30 |
| wide open, fixed (n 11121) | 0.71 | 0.06 | 0.22 |

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 8638 | 0.071 | 0.021 | 0.007 | 0.002 | 0.0065 |
| all | any fixed time | 8691 | 0.072 | 0.012 | 0.003 | 0.001 | 0.0022 |
| man | release | 2281 | 0.022 | 0.003 | 0.001 | 0.000 | 0.0012 |
| man | any fixed time | 2345 | 0.025 | 0.002 | 0.000 | 0.000 | 0.0003 |
| zone | release | 5927 | 0.091 | 0.026 | 0.008 | 0.002 | 0.0077 |
| zone | any fixed time | 5909 | 0.090 | 0.013 | 0.002 | 0.000 | 0.0017 |
| behind the line (separately), any moment | all | 7550 | 0.153 | 0.054 | 0.015 | 0.002 | 0.0203 |
| back within 3 yd of the line (separately), any moment | all | 2856 | 0.069 | 0.021 | 0.006 | 0.001 | 0.0148 |

**Ours, default (24 games)**

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 8922) | 0.48 | 0.31 | 0.21 |
| all, fixed (n 31048) | 0.54 | 0.29 | 0.17 |
| wide open, release (n 897) | 0.61 | 0.06 | 0.33 |
| wide open, fixed (n 2706) | 0.66 | 0.07 | 0.27 |

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 1868 | 0.070 | 0.013 | 0.002 | 0.001 | 0.0034 |
| all | any fixed time | 2126 | 0.067 | 0.007 | 0.001 | 0.000 | 0.0007 |
| man | release | 454 | 0.013 | 0.002 | 0.000 | 0.000 | 0.0006 |
| man | any fixed time | 541 | 0.015 | 0.002 | 0.000 | 0.000 | 0.0002 |
| zone | release | 1414 | 0.088 | 0.017 | 0.003 | 0.001 | 0.0043 |
| zone | any fixed time | 1585 | 0.085 | 0.008 | 0.001 | 0.000 | 0.0009 |
| behind the line (separately), any moment | all | 1592 | 0.152 | 0.063 | 0.024 | 0.001 | 0.0214 |
| back within 3 yd of the line (separately), any moment | all | 814 | 0.032 | 0.006 | 0.002 | 0.000 | 0.0041 |

**Rung 1**

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 2954) | 0.44 | 0.32 | 0.24 |
| all, fixed (n 10421) | 0.51 | 0.30 | 0.18 |
| wide open, release (n 301) | 0.57 | 0.07 | 0.36 |
| wide open, fixed (n 904) | 0.65 | 0.07 | 0.29 |

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 620 | 0.097 | 0.031 | 0.008 | 0.002 | 0.0078 |
| all | any fixed time | 702 | 0.091 | 0.019 | 0.004 | 0.000 | 0.0017 |
| man | release | 136 | 0.029 | 0.000 | 0.000 | 0.000 | 0.0000 |
| man | any fixed time | 160 | 0.031 | 0.000 | 0.000 | 0.000 | 0.0000 |
| zone | release | 484 | 0.116 | 0.039 | 0.010 | 0.002 | 0.0099 |
| zone | any fixed time | 542 | 0.109 | 0.024 | 0.006 | 0.000 | 0.0022 |
| behind the line (separately), any moment | all | 529 | 0.147 | 0.055 | 0.015 | 0.000 | 0.0173 |
| back within 3 yd of the line (separately), any moment | all | 265 | 0.026 | 0.008 | 0.004 | 0.000 | 0.0039 |

**Rung 2**

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 3020) | 0.51 | 0.26 | 0.23 |
| all, fixed (n 9526) | 0.55 | 0.26 | 0.20 |
| wide open, release (n 560) | 0.70 | 0.06 | 0.25 |
| wide open, fixed (n 1653) | 0.71 | 0.05 | 0.24 |

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 634 | 0.174 | 0.028 | 0.000 | 0.000 | 0.0077 |
| all | any fixed time | 690 | 0.186 | 0.017 | 0.000 | 0.000 | 0.0019 |
| man | release | 126 | 0.024 | 0.000 | 0.000 | 0.000 | 0.0000 |
| man | any fixed time | 145 | 0.028 | 0.000 | 0.000 | 0.000 | 0.0000 |
| zone | release | 508 | 0.211 | 0.035 | 0.000 | 0.000 | 0.0095 |
| zone | any fixed time | 545 | 0.228 | 0.022 | 0.000 | 0.000 | 0.0024 |
| behind the line (separately), any moment | all | 523 | 0.193 | 0.107 | 0.040 | 0.002 | 0.0353 |
| back within 3 yd of the line (separately), any moment | all | 253 | 0.071 | 0.012 | 0.004 | 0.000 | 0.0062 |

### Does the Cover-2 / Cover-6 10-15 yd excess hold on new games?

## Does the Cover-2 / Cover-6 10-15 yd excess hold? (wide-open share of receiver-moments, NFL p90 threshold; each sim file on its own)

| sample | Cover-2 fixed n | Cover-2 fixed wide | Cover-6 fixed n | Cover-6 fixed wide | Cover-2 release n | wide | Cover-6 release n | wide |
|---|---|---|---|---|---|---|---|---|
| NFL | 1801 | 0.177 | 1240 | 0.096 | 1153 | 0.188 | 714 | 0.097 |
| sim-default.jsonl.gz | 124 | 0.573 | 105 | 0.305 | 69 | 0.391 | 55 | 0.218 |
| sim-x16.jsonl.gz | 186 | 0.441 | 134 | 0.216 | 141 | 0.348 | 89 | 0.157 |



## Full tables (NFL, then ours on 24 games)

NFL: 9657 dropbacks, 9257 with a route runner at a sampled moment, 150917 receiver-moments. Wide-open thresholds are the NFL p90 of d1 by (moment kind, depth band):

| moment | behind LOS | 0-5 | 5-10 | 10-15 | 15-20 | 20+ |
|---|---|---|---|---|---|---|
| release | 8.6 | 6.8 | 5.2 | 5.2 | 6.0 | 6.1 |
| fixed 1.5-3.0 s | 6.2 | 6.0 | 5.1 | 5.1 | 5.8 | nan |

## NFL

9258 dropbacks, 150917 receiver-moments (release 39701, fixed 111216).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 6648 | 1.6 / 2.9 / 4.3 / 6.4 / 8.6 | 3.5 / 4.7 / 6.8 / 9.2 / 11.7 | 24865 | 1.0 / 1.8 / 2.8 / 4.3 / 6.2 | 2.7 / 3.5 / 4.7 / 6.5 / 8.7 |
| 0-5 | 12123 | 1.0 / 1.6 / 3.2 / 5.1 / 6.8 | 3.8 / 5.4 / 7.1 / 9.1 / 11.4 | 45399 | 1.0 / 1.5 / 2.9 / 4.6 / 6.0 | 3.4 / 4.8 / 6.4 / 8.4 / 10.5 |
| 5-10 | 10489 | 0.9 / 1.3 / 2.3 / 3.8 / 5.2 | 3.6 / 5.0 / 6.8 / 9.1 / 12.0 | 28535 | 0.9 / 1.4 / 2.5 / 3.9 / 5.1 | 3.6 / 4.8 / 6.4 / 8.5 / 10.9 |
| 10-15 | 6711 | 0.9 / 1.4 / 2.5 / 3.9 / 5.2 | 4.2 / 5.5 / 7.2 / 9.2 / 12.4 | 10810 | 1.0 / 1.6 / 2.7 / 3.9 / 5.1 | 4.3 / 5.4 / 7.0 / 8.8 / 11.4 |
| 15-20 | 2567 | 1.0 / 1.5 / 2.5 / 4.3 / 6.0 | 4.8 / 6.4 / 8.1 / 10.3 / 13.3 | 1585 | 1.1 / 1.6 / 2.7 / 4.3 / 5.8 | 4.8 / 6.2 / 7.8 / 9.5 / 11.7 |
| 20+ | 1163 | 0.9 / 1.4 / 2.4 / 4.2 / 6.1 | 4.4 / 6.3 / 8.9 / 12.1 / 16.0 | 22 | 1.2 / 2.0 / 2.4 / 4.1 / 6.3 | 4.9 / 7.2 / 8.6 / 9.4 / 11.3 |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.28 | 0.36 | 0.36 | 0.50 | 0.19 | 0.31 | 0.48 | 0.19 | 0.32 |
| fixed | 0.25 | 0.35 | 0.40 | 0.47 | 0.20 | 0.33 | 0.59 | 0.15 | 0.27 |

### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 39701) | 0.50 | 0.32 | 0.18 |
| all, fixed (n 111216) | 0.52 | 0.32 | 0.16 |
| wide open, release (n 3972) | 0.63 | 0.06 | 0.30 |
| wide open, fixed (n 11121) | 0.71 | 0.06 | 0.22 |

### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 8638 | 0.071 | 0.021 | 0.007 | 0.002 | 0.0065 |
| all | any fixed time | 8691 | 0.072 | 0.012 | 0.003 | 0.001 | 0.0022 |
| man | release | 2281 | 0.022 | 0.003 | 0.001 | 0.000 | 0.0012 |
| man | any fixed time | 2345 | 0.025 | 0.002 | 0.000 | 0.000 | 0.0003 |
| zone | release | 5927 | 0.091 | 0.026 | 0.008 | 0.002 | 0.0077 |
| zone | any fixed time | 5909 | 0.090 | 0.013 | 0.002 | 0.000 | 0.0017 |
| behind the line (separately), any moment | all | 7550 | 0.153 | 0.054 | 0.015 | 0.002 | 0.0203 |
| back within 3 yd of the line (separately), any moment | all | 2856 | 0.069 | 0.021 | 0.006 | 0.001 | 0.0148 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 2922 of 8638 thrown dropbacks (0.338); receiver-moments 0.100
- at any fixed time while the ball was held: 4776 of 8691 dropbacks (0.550); receiver-moments 0.100
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 2172 of 8691 dropbacks (0.250)
- d1 tail at release: p90 6.5, p95 7.8, p99 10.6; share of receiver-moments with d1 over 5 yd 0.214, over 7 yd 0.077, over 9 yd 0.025
- d1 tail at fixed: p90 5.7, p95 6.7, p99 9.0; share of receiver-moments with d1 over 5 yd 0.162, over 7 yd 0.041, over 9 yd 0.010
- the targeted receiver at release (n 8293): d1 1.2 / 2.0 / 3.5 / 5.5 / 7.4, wide open 0.138; untargeted route runners at release d1 0.9 / 1.5 / 2.8 / 4.4 / 6.2

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 2964 | 12528 | 3.4 / 6.8 | 0.119 | 0.409 | 34850 | 3.2 / 6.0 | 0.125 | 0.659 |
| Cover-1 | 1960 | 8206 | 1.8 / 4.8 | 0.024 | 0.098 | 23259 | 1.9 / 4.8 | 0.043 | 0.310 |
| Cover-2 | 1297 | 5732 | 3.8 / 7.4 | 0.171 | 0.530 | 16852 | 3.0 / 6.0 | 0.118 | 0.648 |
| Quarters | 1200 | 5293 | 3.3 / 6.7 | 0.112 | 0.404 | 14180 | 3.2 / 6.1 | 0.130 | 0.705 |
| Cover-6 | 873 | 3910 | 3.2 / 6.9 | 0.119 | 0.418 | 11286 | 2.9 / 5.8 | 0.101 | 0.614 |
| other | 460 | 1984 | 2.0 / 5.6 | 0.070 | 0.212 | 5827 | 2.4 / 5.5 | 0.082 | 0.350 |
| Cover-0 | 341 | 1349 | 2.1 / 6.1 | 0.071 | 0.226 | 2866 | 2.1 / 5.6 | 0.089 | 0.387 |
| 2-Man | 162 | 699 | 1.5 / 3.9 | 0.011 | 0.052 | 2096 | 1.6 / 3.9 | 0.021 | 0.188 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 6334 | 27463 | 3.4 / 6.9 | 0.129 | 0.434 | 77168 | 3.1 / 6.0 | 0.121 | 0.659 |
| Man | 2463 | 10254 | 1.8 / 5.0 | 0.029 | 0.113 | 28221 | 1.8 / 4.8 | 0.046 | 0.311 |
| Other | 460 | 1984 | 2.0 / 5.6 | 0.070 | 0.212 | 5827 | 2.4 / 5.5 | 0.082 | 0.350 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 2x2 | 3826 | 16367 | 2.9 / 6.3 | 0.093 | 0.322 | 46015 | 2.7 / 5.6 | 0.092 | 0.538 |
| 3x1 | 3636 | 15455 | 2.9 / 6.6 | 0.102 | 0.343 | 44247 | 2.7 / 5.8 | 0.103 | 0.547 |
| 3x2 | 1181 | 5447 | 3.0 / 6.7 | 0.112 | 0.381 | 13418 | 2.9 / 6.1 | 0.126 | 0.604 |
| 2x1 | 450 | 1738 | 3.1 / 6.7 | 0.100 | 0.293 | 5680 | 2.7 / 5.4 | 0.079 | 0.507 |
| 4x1 | 136 | 617 | 3.2 / 7.5 | 0.147 | 0.492 | 1556 | 3.0 / 6.3 | 0.129 | 0.718 |
| 1x1 | 14 | 42 | 2.4 / 4.9 | 0.024 | 0.077 | 148 | 1.9 / 3.9 | 0.007 | 0.071 |
| 3x0 | 8 | 20 | 2.2 / 4.3 | 0.050 | 0.200 | 108 | 2.9 / 5.5 | 0.093 | 0.625 |
| 2x0 | 6 | 15 | 2.6 / 4.2 | 0.000 | 0.000 | 44 | 2.4 / 4.4 | 0.045 | 0.167 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 7934 | 33611 | 2.9 / 6.4 | 0.097 | 0.329 | 96181 | 2.7 / 5.7 | 0.096 | 0.539 |
| True | 1323 | 6090 | 3.0 / 6.8 | 0.116 | 0.393 | 15035 | 2.9 / 6.1 | 0.126 | 0.615 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 5194 | 22037 | 2.9 / 6.5 | 0.102 | 0.341 | 63617 | 2.7 / 5.8 | 0.103 | 0.549 |
| True | 4063 | 17664 | 3.0 / 6.5 | 0.097 | 0.335 | 47599 | 2.7 / 5.7 | 0.096 | 0.551 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 8737 | 37251 | 2.9 / 6.5 | 0.099 | 0.334 | 105638 | 2.7 / 5.7 | 0.099 | 0.546 |
| True | 520 | 2450 | 3.1 / 6.8 | 0.114 | 0.400 | 5578 | 3.0 / 6.1 | 0.124 | 0.613 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 6906 | 30390 | 2.9 / 6.5 | 0.100 | 0.341 | 81748 | 2.8 / 5.9 | 0.106 | 0.561 |
| True | 2351 | 9311 | 3.0 / 6.5 | 0.100 | 0.329 | 29468 | 2.7 / 5.4 | 0.082 | 0.517 |

## Ours: sim-all24.jsonl.gz

2128 dropbacks, 39970 receiver-moments (release 8922, fixed 31048).

### Nearest-defender distance (yd) p10 / 25 / 50 / 75 / 90 by depth band

| band | release n | release d1 | release d2 | fixed n | fixed d1 | fixed d2 |
|---|---|---|---|---|---|---|
| behind LOS | 1123 | 0.9 / 1.7 / 3.6 / 6.5 / 9.3 | 2.3 / 3.7 / 6.3 / 9.6 / 12.2 | 5371 | 0.9 / 1.5 / 2.5 / 4.0 / 6.1 | 2.1 / 2.9 / 4.2 / 6.2 / 8.4 |
| 0-5 | 2088 | 1.2 / 2.2 / 3.6 / 5.1 / 6.9 | 3.1 / 4.4 / 6.3 / 8.4 / 11.1 | 14421 | 1.1 / 2.0 / 3.2 / 4.6 / 5.8 | 3.2 / 4.3 / 6.0 / 8.2 / 10.5 |
| 5-10 | 3660 | 0.9 / 1.5 / 2.7 / 4.0 / 5.1 | 2.9 / 4.1 / 6.0 / 8.3 / 11.3 | 8908 | 0.9 / 1.4 / 2.5 / 3.8 / 4.9 | 2.9 / 4.3 / 6.3 / 8.8 / 11.5 |
| 10-15 | 1482 | 0.8 / 1.2 / 2.1 / 3.3 / 5.1 | 3.1 / 4.6 / 6.8 / 9.2 / 12.0 | 2234 | 0.8 / 1.3 / 2.1 / 3.2 / 5.5 | 3.5 / 5.4 / 7.7 / 10.0 / 12.9 |
| 15-20 | 499 | 1.0 / 1.3 / 2.1 / 3.3 / 6.3 | 4.2 / 6.1 / 8.8 / 11.6 / 14.7 | 114 | 1.0 / 1.2 / 1.5 / 2.1 / 7.1 | 5.2 / 7.1 / 9.5 / 11.4 / 13.1 |
| 20+ | 70 | 0.8 / 0.9 / 1.7 / 3.3 / 4.9 | 4.7 / 6.7 / 9.7 / 13.5 / 17.3 | 0 | - | - |

### Relation of the nearest defender (share of receiver-moments)

| moment | front | level | behind | inside | head-up | outside | closing | steady | opening |
|---|---|---|---|---|---|---|---|---|---|
| release | 0.29 | 0.34 | 0.37 | 0.54 | 0.17 | 0.29 | 0.42 | 0.19 | 0.39 |
| fixed | 0.26 | 0.31 | 0.43 | 0.54 | 0.17 | 0.29 | 0.62 | 0.12 | 0.26 |

### Leverage of the nearest defender relative to the goal line (over the top: more than 1 yd downfield of him; trailing: more than 1 yd behind him)

| receiver-moments | over the top | level | trailing |
|---|---|---|---|
| all, release (n 8922) | 0.48 | 0.31 | 0.21 |
| all, fixed (n 31048) | 0.54 | 0.29 | 0.17 |
| wide open, release (n 897) | 0.61 | 0.06 | 0.33 |
| wide open, fixed (n 2706) | 0.66 | 0.07 | 0.27 |

### Extreme openness per dropback: any route runner with d1 over T yd (main receivers: not behind the line, not a back within 3 yd of the line)

| group | moment | dropbacks | >8 yd | >10 yd | >12 yd | >15 yd | receiver-moments >10 yd |
|---|---|---|---|---|---|---|---|
| all | release | 1868 | 0.070 | 0.013 | 0.002 | 0.001 | 0.0034 |
| all | any fixed time | 2126 | 0.067 | 0.007 | 0.001 | 0.000 | 0.0007 |
| man | release | 454 | 0.013 | 0.002 | 0.000 | 0.000 | 0.0006 |
| man | any fixed time | 541 | 0.015 | 0.002 | 0.000 | 0.000 | 0.0002 |
| zone | release | 1414 | 0.088 | 0.017 | 0.003 | 0.001 | 0.0043 |
| zone | any fixed time | 1585 | 0.085 | 0.008 | 0.001 | 0.000 | 0.0009 |
| behind the line (separately), any moment | all | 1592 | 0.152 | 0.063 | 0.024 | 0.001 | 0.0214 |
| back within 3 yd of the line (separately), any moment | all | 814 | 0.032 | 0.006 | 0.002 | 0.000 | 0.0041 |

### Share of dropbacks with at least one wide-open receiver, and of receiver-moments wide open

- at the release: 675 of 1868 thrown dropbacks (0.361); receiver-moments 0.101
- at any fixed time while the ball was held: 1116 of 2126 dropbacks (0.525); receiver-moments 0.087
- wide open at two consecutive fixed times (0.5 s apart, same receiver): 581 of 2126 dropbacks (0.273)
- d1 tail at release: p90 6.1, p95 7.6, p99 10.5; share of receiver-moments with d1 over 5 yd 0.175, over 7 yd 0.066, over 9 yd 0.023
- d1 tail at fixed: p90 5.6, p95 6.4, p99 8.4; share of receiver-moments with d1 over 5 yd 0.151, over 7 yd 0.032, over 9 yd 0.006
- the targeted receiver at release (n 1838): d1 1.4 / 2.5 / 3.7 / 5.1 / 6.8, wide open 0.147; untargeted route runners at release d1 0.9 / 1.4 / 2.5 / 4.1 / 5.9

### By coverage family

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Cover-3 | 740 | 3161 | 3.0 / 6.0 | 0.102 | 0.391 | 10801 | 3.1 / 5.9 | 0.110 | 0.648 |
| Cover-1 | 437 | 1815 | 1.8 / 4.6 | 0.024 | 0.108 | 6409 | 2.1 / 4.7 | 0.025 | 0.255 |
| Quarters | 333 | 1436 | 3.1 / 6.4 | 0.121 | 0.448 | 4702 | 3.3 / 5.9 | 0.108 | 0.628 |
| Cover-2 | 270 | 1137 | 3.4 / 7.7 | 0.208 | 0.620 | 4279 | 2.8 / 5.8 | 0.116 | 0.633 |
| Cover-6 | 212 | 913 | 3.0 / 6.4 | 0.123 | 0.463 | 3090 | 3.0 / 5.7 | 0.101 | 0.590 |
| Cover-0 | 108 | 343 | 1.5 / 4.4 | 0.023 | 0.087 | 1349 | 1.3 / 4.2 | 0.016 | 0.102 |
| 2-Man | 28 | 117 | 1.9 / 4.4 | 0.000 | 0.000 | 418 | 2.3 / 4.9 | 0.033 | 0.357 |

### By man / zone

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| Zone | 1586 | 6779 | 3.1 / 6.5 | 0.126 | 0.448 | 23309 | 3.0 / 5.8 | 0.108 | 0.628 |
| Man | 542 | 2143 | 1.8 / 4.5 | 0.021 | 0.093 | 7739 | 1.9 / 4.6 | 0.023 | 0.222 |

### By formation (receivers each side)

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| 3x1 | 900 | 3792 | 2.8 / 6.3 | 0.103 | 0.361 | 12872 | 2.9 / 5.6 | 0.088 | 0.539 |
| 2x2 | 817 | 3362 | 2.7 / 6.0 | 0.096 | 0.344 | 12031 | 2.7 / 5.5 | 0.086 | 0.524 |
| 3x2 | 321 | 1398 | 2.8 / 5.8 | 0.108 | 0.416 | 4756 | 2.9 / 5.6 | 0.093 | 0.520 |
| 2x1 | 77 | 315 | 2.5 / 6.0 | 0.076 | 0.290 | 1184 | 2.4 / 4.9 | 0.059 | 0.390 |
| 4x1 | 13 | 55 | 3.1 / 6.1 | 0.145 | 0.545 | 205 | 3.0 / 5.5 | 0.107 | 0.538 |

### By empty backfield

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1794 | 7469 | 2.8 / 6.2 | 0.099 | 0.350 | 26087 | 2.8 / 5.5 | 0.086 | 0.526 |
| True | 334 | 1453 | 2.8 / 5.8 | 0.109 | 0.421 | 4961 | 2.9 / 5.6 | 0.094 | 0.521 |

### By motion

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1134 | 4733 | 2.8 / 6.3 | 0.104 | 0.369 | 16580 | 2.8 / 5.6 | 0.089 | 0.537 |
| True | 994 | 4189 | 2.7 / 5.9 | 0.096 | 0.352 | 14468 | 2.8 / 5.5 | 0.085 | 0.512 |

### By motion with empty

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1891 | 7889 | 2.8 / 6.1 | 0.099 | 0.352 | 27552 | 2.8 / 5.6 | 0.086 | 0.526 |
| True | 237 | 1033 | 2.7 / 5.7 | 0.112 | 0.433 | 3496 | 2.9 / 5.6 | 0.093 | 0.519 |

### By play action

| group | dropbacks | release n | release d1 p50 / p90 | wide at release | dropbacks with a wide-open WR at release | fixed n | fixed d1 p50 / p90 | wide at fixed | dropbacks with one at any fixed |
|---|---|---|---|---|---|---|---|---|---|
| False | 1515 | 6437 | 2.9 / 6.3 | 0.112 | 0.391 | 22069 | 2.9 / 5.7 | 0.098 | 0.563 |
| True | 613 | 2485 | 2.5 / 5.4 | 0.072 | 0.285 | 8979 | 2.5 / 5.1 | 0.060 | 0.430 |

## Does the Cover-2 / Cover-6 10-15 yd excess hold? (wide-open share of receiver-moments, NFL p90 threshold; each sim file on its own)

| sample | Cover-2 fixed n | Cover-2 fixed wide | Cover-6 fixed n | Cover-6 fixed wide | Cover-2 release n | wide | Cover-6 release n | wide |
|---|---|---|---|---|---|---|---|---|
| NFL | 1801 | 0.177 | 1240 | 0.096 | 1153 | 0.188 | 714 | 0.097 |
| sim-all24.jsonl.gz | 310 | 0.494 | 239 | 0.255 | 210 | 0.362 | 144 | 0.181 |

## Largest cell differences, wide-open share (ours minus NFL), cells with at least 40 receiver-moments on each side

### By coverage family (sim-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -12.2 | fix | 0-5 | Cover-2 | 6565 | 1910 | 0.104 | 0.035 |
| +10.6 | fix | 10-15 | Cover-2 | 1801 | 310 | 0.177 | 0.494 |
| -9.9 | fix | 10-15 | Cover-3 | 3757 | 844 | 0.104 | 0.028 |
| -8.3 | fix | 0-5 | Cover-0 | 1540 | 736 | 0.094 | 0.019 |
| -7.8 | fix | 5-10 | Cover-1 | 5803 | 1768 | 0.040 | 0.012 |
| -7.2 | fix | 5-10 | Cover-0 | 602 | 364 | 0.118 | 0.014 |
| -6.5 | fix | 5-10 | Cover-3 | 8952 | 3109 | 0.139 | 0.097 |
| -6.4 | rel | 10-15 | Cover-3 | 2116 | 551 | 0.118 | 0.045 |

### By man / zone (sim-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -10.5 | fix | 5-10 | Man | 6943 | 2125 | 0.045 | 0.010 |
| -7.6 | fix | 0-5 | Man | 13192 | 3811 | 0.044 | 0.022 |
| -5.8 | fix | 0-5 | Zone | 29528 | 10610 | 0.128 | 0.107 |
| -4.9 | fix | 5-10 | Zone | 20078 | 6783 | 0.120 | 0.099 |
| -4.4 | fix | 10-15 | Man | 2025 | 482 | 0.018 | 0.002 |
| -3.7 | rel | 5-10 | Man | 2955 | 908 | 0.034 | 0.014 |
| +3.6 | rel | behind LOS | Zone | 4823 | 868 | 0.121 | 0.171 |
| -2.7 | rel | 5-10 | Zone | 6924 | 2752 | 0.132 | 0.113 |

### By formation (sim-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -15.6 | fix | behind LOS | 3x2 | 1528 | 250 | 0.165 | 0.004 |
| -7.2 | fix | 5-10 | 3x1 | 11585 | 3624 | 0.103 | 0.067 |
| -4.5 | fix | 0-5 | 3x2 | 6617 | 2421 | 0.133 | 0.100 |
| -4.2 | fix | 0-5 | 3x1 | 17410 | 6032 | 0.100 | 0.083 |
| +3.7 | rel | behind LOS | 3x1 | 2798 | 513 | 0.100 | 0.164 |
| -3.3 | rel | 5-10 | 3x1 | 3914 | 1582 | 0.096 | 0.070 |
| -3.0 | fix | behind LOS | 2x1 | 2002 | 452 | 0.081 | 0.046 |
| -3.0 | fix | 5-10 | 2x2 | 11497 | 3293 | 0.096 | 0.080 |

### By play action (sim-all24.jsonl.gz), top 8 by |z|

| z | moment | depth | group | n NFL | n ours | NFL wide | ours wide |
|---|---|---|---|---|---|---|---|
| -13.9 | fix | behind LOS | True | 10037 | 1830 | 0.066 | 0.014 |
| -5.4 | fix | 5-10 | False | 22031 | 6446 | 0.100 | 0.079 |
| -4.8 | fix | 0-5 | False | 36025 | 10406 | 0.108 | 0.092 |
| +4.6 | rel | behind LOS | False | 4265 | 778 | 0.114 | 0.183 |
| -4.3 | rel | behind LOS | True | 2383 | 345 | 0.074 | 0.029 |
| -4.2 | rel | 0-5 | True | 2432 | 617 | 0.097 | 0.052 |
| -3.6 | fix | 5-10 | True | 6504 | 2462 | 0.099 | 0.076 |
| +3.5 | fix | 10-15 | False | 7793 | 1582 | 0.089 | 0.119 |

## Operator check

Formation operator vs PFF receiverAlignment on NFL: 8469 of 9258 agree (0.915); most common disagreements: 2x2 for 2x1 x148, 3x1 for 2x1 x115, 2x2 for 3x1 x106, 3x1 for 2x2 x81, 2x1 for 3x1 x56.

### NFL: 12 plays at the release, every route runner: the operator against a second implementation (stacked norms, polar angles)

- 2022102301-1438 Cover 6-Left rel frame 24 QB (-8.3, 29.5): 44901 d1 4.1 d2 4.3 front/inside/opening; 46093 d1 3.7 d2 15.3 behind/inside/closing; 53488 d1 2.4 d2 15.4 front/inside/opening; 53512 d1 1.3 d2 8.1 level/outside/opening; 53633 d1 6.7 d2 7.4 front/inside/opening
- 2022101601-151 Cover-3 rel frame 27 QB (-9.1, 26.9): 43324 d1 3.3 d2 8.7 level/inside/closing; 45185 d1 7.1 d2 9.9 behind/inside/steady; 48097 d1 1.4 d2 3.8 level/inside/closing
- 2022092502-107 Cover-3 rel frame 23 QB (-10.8, 18.8): 47842 d1 2.3 d2 6.3 behind/outside/closing; 48118 d1 2.5 d2 6.5 front/inside/closing; 52442 d1 1.6 d2 13.8 level/inside/steady; 52449 d1 2.5 d2 7.9 behind/inside/closing; 54538 d1 2.8 d2 4.4 behind/outside/closing
- 2022101000-3436 Cover-0 rel frame 12 QB (-4.8, 24.5): 40011 d1 3.5 d2 3.5 front/inside/opening; 44874 d1 1.2 d2 1.9 level/head-up/closing; 46243 d1 1.4 d2 9.2 level/inside/steady; 52440 d1 4.1 d2 7.4 front/inside/closing; 54519 d1 2.6 d2 3.3 level/inside/closing
- 2022101603-1957 Cover 6-Left rel frame 26 QB (-7.4, 23.5): 47842 d1 2.0 d2 5.6 level/inside/steady; 52442 d1 6.1 d2 6.2 front/outside/opening; 53556 d1 3.8 d2 7.5 front/inside/opening; 53703 d1 10.7 d2 11.7 front/inside/steady; 54518 d1 1.5 d2 4.3 behind/outside/closing
- 2022092600-865 Cover-3 rel frame 17 QB (-5.2, 23.6): 43329 d1 4.1 d2 8.3 behind/head-up/closing; 46071 d1 3.4 d2 4.0 level/outside/closing; 46309 d1 7.1 d2 10.6 level/inside/steady; 48489 d1 5.5 d2 7.7 front/inside/closing
- 2022091113-630 Quarters rel frame 35 QB (-9.5, 30.1): 43293 d1 7.1 d2 9.9 front/inside/opening; 45052 d1 3.6 d2 6.5 behind/outside/opening; 52425 d1 1.9 d2 9.0 behind/outside/opening
- 2022110604-56 Cover-3 rel frame 36 QB (-7.7, 30.7): 41282 d1 1.8 d2 14.5 level/inside/steady; 44931 d1 4.2 d2 5.7 front/outside/opening; 47749 d1 1.2 d2 13.3 level/inside/closing; 47807 d1 3.6 d2 7.5 level/inside/opening; 47920 d1 3.8 d2 8.3 behind/outside/closing
- 2022091104-2736 Quarters rel frame 25 QB (-9.0, 23.7): 44930 d1 2.6 d2 4.5 behind/outside/closing; 44947 d1 2.3 d2 3.9 front/inside/opening; 46130 d1 3.8 d2 12.4 behind/inside/closing; 47791 d1 5.8 d2 9.9 behind/inside/closing; 53541 d1 2.9 d2 5.0 front/inside/opening
- 2022092600-1316 Cover-2 rel frame 13 QB (-6.1, 24.1): 43329 d1 0.9 d2 8.8 level/outside/steady; 46071 d1 2.8 d2 3.9 behind/inside/closing; 46309 d1 3.7 d2 8.0 behind/outside/steady; 48489 d1 0.8 d2 6.2 level/outside/closing
- 2022091200-931 Cover-3 Seam rel frame 32 QB (-6.2, 31.8): 42358 d1 5.1 d2 10.8 level/inside/opening; 46109 d1 3.6 d2 8.2 level/outside/closing; 52423 d1 2.7 d2 8.4 behind/outside/closing; 52454 d1 1.4 d2 9.2 level/inside/steady; 52526 d1 6.2 d2 7.1 front/inside/opening
- 2022091100-458 Cover-2 rel frame 12 QB (-4.7, 24.4): 48374 d1 6.8 d2 8.5 front/inside/opening; 52489 d1 5.1 d2 7.5 front/inside/opening; 53433 d1 1.7 d2 3.4 behind/head-up/closing; 53612 d1 1.8 d2 5.6 front/inside/opening; 54473 d1 1.2 d2 11.9 level/head-up/closing

Second implementation: 54 receiver rows, max |d1|, |d2| difference 0.0000 yd, relation / side mismatches 0.

### ours: 12 plays at the release, every route runner: the operator against a second implementation (stacked norms, polar angles)

- 101-6-69 cover1_lurk rel frame 35 QB (-8.3, 23.6): RB d1 2.5 d2 12.4 front/inside/closing; Y d1 1.7 d2 2.6 front/head-up/closing; X d1 1.9 d2 4.1 level/inside/closing; Z d1 1.0 d2 1.6 level/inside/steady; H d1 10.0 d2 10.2 front/inside/opening
- 101-4-6 cover9_grab rel frame 29 QB (-8.6, 26.8): RB d1 2.7 d2 4.4 front/inside/opening; Y d1 2.0 d2 5.7 level/inside/opening; X d1 6.0 d2 8.7 behind/outside/opening; Z d1 5.8 d2 11.0 behind/inside/opening; H d1 2.2 d2 5.7 level/inside/opening
- 202-3-5 deuce_dot rel frame 31 QB (-7.1, 27.8): RB d1 9.3 d2 9.8 front/inside/opening; Y d1 4.3 d2 5.8 behind/outside/steady; X d1 9.1 d2 11.2 front/inside/opening; Z d1 2.3 d2 7.3 level/outside/opening; H d1 1.7 d2 1.9 level/inside/closing
- 202-3-91 cover1_banjo rel frame 24 QB (-7.1, 23.5): RB d1 0.5 d2 1.9 level/head-up/closing; Y d1 1.1 d2 5.1 level/inside/opening; X d1 3.5 d2 5.2 behind/inside/closing; Z d1 0.8 d2 2.4 level/inside/closing; H d1 2.7 d2 3.6 behind/outside/opening
- 101-6-102 cover1_lurk_trips rel frame 29 QB (-9.3, 29.9): RB d1 5.6 d2 6.0 front/inside/opening; Y d1 0.6 d2 1.1 level/head-up/closing; X d1 1.2 d2 20.1 level/outside/opening; Z d1 0.7 d2 12.2 level/outside/opening; H d1 1.8 d2 2.5 level/inside/closing
- 101-1-10 cover4_box rel frame 35 QB (-8.6, 29.8): RB d1 12.8 d2 12.8 front/inside/opening; Y d1 2.3 d2 8.9 behind/outside/opening; X d1 4.4 d2 7.3 front/inside/closing; Z d1 0.4 d2 5.9 level/head-up/closing; H d1 2.8 d2 13.2 front/inside/closing
- 202-3-58 cover0 rel frame 33 QB (-9.8, 25.7): Y d1 1.5 d2 4.6 front/inside/steady; X d1 1.2 d2 19.2 level/head-up/opening; Z d1 1.1 d2 4.2 level/outside/opening; H d1 1.5 d2 5.6 level/inside/steady
- 101-6-24 cover2man rel frame 33 QB (-8.7, 24.8): RB d1 1.6 d2 12.6 level/inside/closing; Y d1 2.3 d2 3.1 front/head-up/opening; X d1 2.7 d2 12.8 front/inside/opening; Z d1 0.8 d2 2.9 level/inside/closing; H d1 2.8 d2 5.6 behind/head-up/steady
- 202-0-55 cover0 rel frame 38 QB (-8.1, 27.0): Y d1 1.2 d2 14.3 front/head-up/closing; X d1 1.3 d2 13.7 behind/head-up/opening; Z d1 1.0 d2 15.0 level/head-up/steady; H d1 0.5 d2 4.9 level/head-up/steady
- 303-0-64 cover3_match rel frame 34 QB (-7.8, 29.8): RB d1 5.3 d2 7.7 front/outside/opening; Y d1 3.5 d2 9.8 front/inside/closing; X d1 1.3 d2 2.2 level/inside/closing; Z d1 2.1 d2 2.2 behind/outside/opening; H d1 5.1 d2 7.0 level/inside/opening
- 101-0-51 cover3_buzz rel frame 28 QB (-8.4, 23.7): RB d1 2.1 d2 5.2 behind/outside/steady; Y d1 5.5 d2 7.6 behind/inside/closing; X d1 4.0 d2 9.5 behind/outside/steady; Z d1 1.8 d2 5.3 behind/outside/closing; H d1 0.8 d2 6.5 level/inside/opening
- 303-2-79 cover6 rel frame 34 QB (-6.7, 23.7): Y d1 4.5 d2 7.3 behind/head-up/steady; X d1 4.6 d2 14.7 behind/inside/closing; Z d1 3.3 d2 10.7 front/inside/steady; H d1 2.2 d2 2.2 level/outside/opening

Second implementation: 57 receiver rows, max |d1|, |d2| difference 0.0000 yd, relation / side mismatches 0.

## Corner cushion on #1 (added)

Operator in `scripts/diag/census/corner_cushion.py`. #1 = the widest route runner on a side (at least 7 yd from the center), his corner = the defender nearest to him at the snap. Break = the largest heading turn (at least 35 degrees) in the sampled track, which ends at the release, so only breaks with 0.4 s of track after them count (6% of NFL sides, 10% of ours) and they skew late. Cushion = the corner's depth past #1 (plus: downfield of him).

Readings: at the snap ours sits about 1 yd deeper in zone (median cushion 4.2 vs 3.0; Quarters 4.7 vs 3.5, Cover-6 4.9 vs 2.9, Cover-2 4.0 vs 3.0, Cover-3 3.8 vs 2.9); in man the median is equal (2.5 vs 2.5). At #1's break the corner is more often trailing him in ours in Cover-2 (.73 trailing against .36 NFL; on top .10 against .40; n 115 vs 124) and Cover-6 (.64 vs .40; n 45 vs 87), about the same in Cover-3 (.48 vs .39) and Cover-1 (.12 vs .15), where ours is more often level (.49 vs .26). Distance at the break in Cover-2: ours median 3.0 yd (p25 2.0, p75 6.8), NFL 4.2 (1.6, 9.2): closer, but behind him more often.

## Corner cushion on #1, at the snap and at #1's break

### NFL (BDB 2025)

| group | #1 sides | snap cushion (depth past #1) p25 / 50 / 75 | snap dist p50 | snap on top / level / trailing | with a break | break dist p25 / 50 / 75 | break nearest defender p50 | break on top / level / trailing | break time p50 |
|---|---|---|---|---|---|---|---|---|---|
| all | 16666 | 2.0 / 2.8 / 5.5 | 4.2 | 0.99 / 0.01 / 0.00 | 1041 | 1.5 / 4.0 / 9.1 | 2.2 | 0.49 / 0.19 / 0.31 | 2.40 |
| man | 4427 | 2.0 / 2.5 / 3.6 | 3.0 | 0.99 / 0.01 / 0.00 | 351 | 1.2 / 1.7 / 4.0 | 1.5 | 0.56 / 0.27 / 0.16 | 2.10 |
| zone | 12239 | 2.0 / 3.0 / 6.0 | 4.7 | 0.99 / 0.01 / 0.00 | 690 | 2.3 / 5.8 / 11.4 | 2.8 | 0.46 / 0.15 / 0.39 | 2.60 |
| Cover-3 | 5287 | 1.9 / 2.9 / 6.3 | 5.0 | 0.98 / 0.02 / 0.00 | 282 | 3.1 / 6.1 / 11.5 | 3.2 | 0.51 / 0.09 / 0.39 | 2.60 |
| Cover-1 | 3532 | 2.0 / 2.5 / 3.4 | 2.9 | 0.99 / 0.01 / 0.00 | 292 | 1.2 / 1.7 / 4.0 | 1.5 | 0.59 / 0.26 / 0.15 | 2.10 |
| Cover-2 | 2384 | 2.1 / 3.0 / 5.3 | 4.0 | 0.99 / 0.01 / 0.00 | 124 | 1.6 / 4.2 / 9.2 | 2.8 | 0.40 / 0.23 / 0.36 | 2.50 |
| Quarters | 2158 | 2.0 / 3.5 / 7.1 | 5.7 | 0.99 / 0.01 / 0.00 | 121 | 3.3 / 6.2 / 15.8 | 2.5 | 0.53 / 0.12 / 0.35 | 2.70 |
| Cover-6 | 1609 | 2.0 / 2.9 / 5.5 | 4.5 | 0.98 / 0.02 / 0.00 | 87 | 1.9 / 5.3 / 12.0 | 2.7 | 0.40 / 0.20 / 0.40 | 2.70 |
| Cover-0 | 593 | 2.0 / 2.7 / 5.3 | 3.8 | 0.99 / 0.01 / 0.00 | 37 | 1.1 / 1.7 / 2.9 | 1.4 | 0.41 / 0.32 / 0.27 | 2.10 |
| 2-Man | 302 | 2.1 / 2.5 / 3.6 | 2.7 | 0.99 / 0.01 / 0.00 | 22 | 1.2 / 1.5 / 7.7 | 1.4 | 0.50 / 0.36 / 0.14 | 2.45 |

### Ours: sim-all24.jsonl.gz

| group | #1 sides | snap cushion (depth past #1) p25 / 50 / 75 | snap dist p50 | snap on top / level / trailing | with a break | break dist p25 / 50 / 75 | break nearest defender p50 | break on top / level / trailing | break time p50 |
|---|---|---|---|---|---|---|---|---|---|
| all | 4042 | 2.3 / 3.7 / 6.5 | 5.5 | 1.00 / 0.00 / 0.00 | 416 | 1.4 / 2.7 / 7.8 | 2.2 | 0.30 / 0.25 / 0.45 | 2.45 |
| man | 1021 | 2.3 / 2.5 / 6.0 | 3.4 | 1.00 / 0.00 / 0.00 | 109 | 0.9 / 1.0 / 2.3 | 1.0 | 0.32 / 0.58 / 0.10 | 2.80 |
| zone | 3021 | 2.1 / 4.2 / 6.7 | 5.9 | 1.00 / 0.00 / 0.00 | 307 | 2.1 / 3.1 / 10.4 | 2.4 | 0.29 / 0.13 / 0.58 | 2.40 |
| Cover-3 | 1388 | 2.1 / 3.8 / 6.8 | 6.3 | 1.00 / 0.00 / 0.00 | 109 | 2.5 / 3.8 / 11.4 | 2.5 | 0.41 / 0.11 / 0.48 | 2.40 |
| Cover-1 | 824 | 2.3 / 2.5 / 6.2 | 4.1 | 1.00 / 0.00 / 0.00 | 90 | 0.9 / 1.1 / 2.8 | 1.0 | 0.39 / 0.49 / 0.12 | 2.70 |
| Cover-2 | 514 | 2.5 / 4.0 / 5.1 | 4.4 | 1.00 / 0.00 / 0.00 | 115 | 2.0 / 3.0 / 6.8 | 2.4 | 0.10 / 0.17 / 0.73 | 2.40 |
| Quarters | 648 | 2.1 / 4.7 / 7.2 | 6.7 | 1.00 / 0.00 / 0.00 | 29 | 1.5 / 2.5 / 11.2 | 2.1 | 0.59 / 0.07 / 0.34 | 2.40 |
| Cover-6 | 410 | 2.5 / 4.9 / 6.8 | 5.8 | 1.00 / 0.00 / 0.00 | 45 | 1.5 / 2.9 / 9.4 | 2.3 | 0.20 / 0.16 / 0.64 | 2.30 |
| Cover-0 | 204 | 2.3 / 2.3 / 2.6 | 2.5 | 1.00 / 0.00 / 0.00 | 24 | 0.8 / 0.9 / 1.1 | 0.9 | 0.21 / 0.79 / 0.00 | 2.90 |
| 2-Man | 54 | 2.3 / 2.5 / 6.0 | 3.2 | 1.00 / 0.00 / 0.00 | 4 | 2.8 / 6.4 / 9.7 | 3.1 | 0.25 / 0.25 / 0.50 | 2.40 |

## Cover 2 / Cover 6 half side: corner sink against half-safety depth (added)

Operator in `scripts/diag/census/half_window.py` (definitions in its header): #1 releases vertical (depth 8-18 yd at 2.5 s, lateral at most half of it); corner = the defender nearest #1 at the snap; half safety = the deepest safety on that side at the snap; moments only while the ball is held. Cover-2 #2-not-in-the-flat is the large sample (NFL n 380, ours 123); with #2 in the flat NFL 39, ours 18. Cover 6 uses the side whose corner is shallower at 2.0 s; the NFL's Cover-6 corner medians (width 17.5 yd from the sideline against #1's 13.9) say the nearest-defender "corner" is sometimes not the corner, so the Cover-6 rows are weaker than the Cover-2 rows.

Cover 2, #2 not in the flat, median at 2.5 / 3.0 s, NFL against ours: corner depth 7.6 / 9.4 vs 4.4 / 6.5 yd (quartiles at 3.0 s 2.2-11.9 vs 5.9-7.7); corner under #1 by 2.3 / 4.0 vs 5.2 / 6.8; corner width from the sideline 12.4 / 12.2 vs 13.3 / 13.5; half safety depth 20.4 / 22.5 vs 18.7 / 20.6; safety width from the sideline 17.2 / 17.0 vs 17.5 / 17.6; safety over #1 9.8 / 8.5 vs 8.8 / 7.3. With #2 in the flat at 3.0 s: corner depth 6.8 vs 3.7, under #1 by 5.0 vs 8.8; safety depth 20.9 vs 20.0, width 15.6 vs 15.4.

So the larger gap is the corner's sink (about 3 yd short at 2.5-3.0 s, and uniform where the NFL's spreads from squat to bail); the safety is about 1.7-1.9 yd shallower with the same width. The corner is also inside #1 by +1.4 / +1.6 yd where the NFL's is level to outside (-0.7 / -0.8).

## Cover 2 and Cover 6 half side: corner and half safety while #1 releases vertical (median, quartiles; yards)

### NFL (BDB 2025)

| coverage | #2 in the flat | moment | n | corner depth | corner width | corner over #1 | corner inside #1 | safety depth | safety width | safety over #1 | #1 depth | #1 width |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Cover-2 | yes | 1.5 s | 39 | 3.5 (-2.2-5.9) | 12.7 (10.5-18.3) | -0.7 (-7.1-1.6) | -0.3 (-1.8-4.4) | 15.6 (13.8-17.9) | 17.8 (16.6-21.1) | 11.6 (9.9-13.5) | 4.0 (3.4-4.9) | 13.4 (11.5-15.7) |
| Cover-2 | yes | 2.0 s | 39 | 5.3 (-3.1-6.8) | 12.3 (9.9-19.3) | -2.3 (-11.4--0.3) | -1.0 (-2.9-5.2) | 17.0 (15.3-19.4) | 17.1 (15.6-19.4) | 10.2 (7.7-11.7) | 7.4 (6.6-8.3) | 13.7 (11.8-15.8) |
| Cover-2 | yes | 2.5 s | 39 | 5.9 (-4.4-8.7) | 11.9 (8.8-20.5) | -4.2 (-15.1--1.6) | 0.3 (-4.6-6.6) | 18.9 (16.9-21.5) | 16.2 (15.1-18.1) | 8.5 (5.9-10.7) | 11.1 (10.0-11.9) | 13.4 (12.4-16.3) |
| Cover-2 | yes | 3.0 s | 39 | 6.8 (-4.4-11.0) | 10.8 (7.6-21.3) | -5.0 (-17.9--3.5) | 0.4 (-5.7-7.5) | 20.9 (18.4-23.6) | 15.6 (14.5-17.6) | 6.9 (3.9-9.2) | 14.4 (12.7-15.5) | 13.0 (11.1-16.9) |
| Cover-2 | no | 1.5 s | 380 | 3.9 (0.2-6.1) | 13.2 (10.0-18.3) | 0.5 (-3.3-2.0) | -0.5 (-1.4-3.1) | 16.5 (14.4-18.7) | 18.2 (16.8-20.4) | 12.7 (10.6-15.1) | 3.9 (2.9-4.7) | 13.7 (10.3-16.1) |
| Cover-2 | no | 2.0 s | 380 | 5.6 (0.7-7.5) | 12.8 (10.0-18.6) | -0.9 (-6.7-0.4) | -0.7 (-2.0-2.9) | 18.3 (16.1-20.4) | 17.7 (16.3-19.6) | 11.3 (9.0-13.7) | 7.0 (6.1-8.0) | 13.9 (10.8-16.2) |
| Cover-2 | no | 2.5 s | 380 | 7.6 (1.5-9.8) | 12.4 (9.7-18.8) | -2.3 (-9.6--0.7) | -0.7 (-2.8-3.0) | 20.4 (18.1-22.4) | 17.2 (15.7-19.2) | 9.8 (7.5-12.3) | 10.6 (9.5-11.7) | 14.0 (11.2-16.1) |
| Cover-2 | no | 3.0 s | 380 | 9.4 (2.2-11.9) | 12.2 (9.1-18.6) | -4.0 (-11.4--1.7) | -0.8 (-3.9-3.2) | 22.5 (20.0-24.5) | 17.0 (15.2-19.0) | 8.5 (5.8-10.7) | 13.8 (12.7-15.2) | 14.1 (11.5-16.3) |
| Cover-6 | yes | 1.5 s | 34 | -0.9 (-3.0-3.5) | 16.4 (11.0-18.3) | -4.1 (-7.7-0.5) | 1.2 (-0.1-2.7) | 15.6 (13.2-16.9) | 19.0 (17.1-20.2) | 11.0 (9.7-13.5) | 4.3 (3.3-4.8) | 15.0 (12.5-16.2) |
| Cover-6 | yes | 2.0 s | 34 | -1.6 (-4.6-4.7) | 16.5 (10.7-18.5) | -8.9 (-12.6--1.6) | 0.9 (-2.1-3.1) | 17.1 (14.7-18.6) | 18.3 (16.3-19.9) | 9.6 (7.7-11.3) | 7.6 (6.5-8.2) | 14.8 (13.4-16.6) |
| Cover-6 | yes | 2.5 s | 34 | -1.7 (-6.2-6.8) | 16.7 (9.7-19.3) | -13.4 (-17.5--3.7) | 0.7 (-3.1-3.8) | 18.7 (16.6-20.4) | 18.0 (15.7-19.6) | 8.1 (5.7-9.7) | 10.8 (10.0-11.6) | 14.9 (13.1-17.1) |
| Cover-6 | yes | 3.0 s | 34 | -1.2 (-7.5-8.6) | 17.0 (8.8-20.3) | -16.6 (-21.2--4.9) | 1.2 (-2.3-3.9) | 20.4 (18.5-22.5) | 18.0 (15.6-19.6) | 6.5 (4.6-8.6) | 13.5 (12.9-14.7) | 15.0 (12.8-18.2) |
| Cover-6 | no | 1.5 s | 209 | 1.8 (-2.4-5.0) | 17.6 (10.8-20.3) | -1.5 (-6.9-1.1) | 2.6 (-0.6-5.9) | 15.9 (13.8-17.5) | 19.1 (17.6-20.7) | 12.0 (9.8-13.4) | 3.8 (3.2-4.7) | 13.9 (10.5-16.3) |
| Cover-6 | no | 2.0 s | 209 | 2.5 (-3.7-6.8) | 17.6 (11.0-21.2) | -4.6 (-11.6-0.0) | 2.3 (-0.8-6.8) | 17.5 (15.1-19.3) | 18.9 (17.3-20.9) | 10.3 (7.8-12.1) | 7.2 (6.3-8.2) | 13.7 (10.9-15.9) |
| Cover-6 | no | 2.5 s | 209 | 3.8 (-4.6-9.4) | 17.5 (10.9-21.9) | -7.5 (-16.0--0.7) | 1.7 (-0.9-7.2) | 19.4 (16.8-21.6) | 18.8 (16.7-21.0) | 8.5 (5.7-11.1) | 10.6 (9.7-11.6) | 13.9 (11.2-16.0) |
| Cover-6 | no | 3.0 s | 209 | 4.7 (-5.7-11.7) | 17.5 (10.6-22.4) | -9.4 (-19.7--1.2) | 1.5 (-1.0-7.9) | 21.2 (18.0-23.8) | 18.9 (16.6-21.3) | 7.0 (3.8-10.0) | 13.7 (12.6-15.2) | 14.0 (11.3-16.6) |

### Ours: sim-all24.jsonl.gz

| coverage | #2 in the flat | moment | n | corner depth | corner width | corner over #1 | corner inside #1 | safety depth | safety width | safety over #1 | #1 depth | #1 width |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Cover-2 | yes | 1.5 s | 18 | 3.5 (3.0-4.7) | 13.2 (12.6-15.5) | 0.0 (-0.2-1.6) | 2.3 (1.7-3.2) | 15.0 (14.2-15.6) | 18.3 (16.9-21.5) | 11.8 (11.0-12.6) | 3.2 (3.0-3.3) | 10.9 (10.7-14.2) |
| Cover-2 | yes | 2.0 s | 18 | 2.7 (2.4-4.8) | 13.8 (13.2-16.3) | -3.7 (-4.3--1.7) | 2.2 (1.8-3.3) | 16.8 (15.6-17.0) | 17.0 (14.9-20.2) | 10.3 (9.9-10.7) | 6.5 (6.1-6.6) | 11.3 (10.8-14.5) |
| Cover-2 | yes | 2.5 s | 18 | 2.4 (1.5-4.6) | 14.0 (13.3-17.0) | -7.4 (-8.4--5.2) | 2.2 (1.8-3.2) | 18.6 (16.8-19.0) | 16.3 (13.4-19.5) | 8.7 (7.6-8.9) | 9.9 (9.5-10.3) | 11.7 (10.9-14.7) |
| Cover-2 | yes | 3.0 s | 18 | 3.7 (2.7-5.4) | 13.9 (13.2-16.9) | -8.8 (-10.3--7.3) | 3.1 (1.7-3.6) | 20.0 (17.1-21.0) | 15.4 (11.7-18.9) | 7.3 (5.9-8.0) | 12.4 (11.8-14.4) | 11.5 (10.8-13.8) |
| Cover-2 | no | 1.5 s | 123 | 3.0 (2.0-3.6) | 13.4 (12.3-16.3) | -0.3 (-1.0-0.8) | 2.1 (1.5-2.7) | 15.0 (13.6-15.5) | 18.4 (16.5-21.4) | 11.9 (10.7-12.5) | 2.9 (2.7-3.3) | 11.3 (10.6-14.7) |
| Cover-2 | no | 2.0 s | 123 | 3.0 (2.4-3.8) | 13.3 (12.3-16.2) | -3.3 (-3.9--2.2) | 1.7 (0.9-2.6) | 16.8 (15.4-17.3) | 17.5 (16.1-20.3) | 10.6 (9.1-11.1) | 6.1 (5.7-6.6) | 11.7 (10.8-14.8) |
| Cover-2 | no | 2.5 s | 123 | 4.4 (4.0-5.4) | 13.3 (12.1-16.5) | -5.2 (-6.3--4.2) | 1.4 (0.3-2.3) | 18.7 (17.4-19.1) | 17.5 (15.8-19.5) | 8.8 (7.7-9.6) | 9.6 (9.1-10.2) | 11.8 (11.0-15.0) |
| Cover-2 | no | 3.0 s | 123 | 6.5 (5.9-7.7) | 13.5 (12.0-16.6) | -6.8 (-8.3--4.7) | 1.6 (0.1-2.5) | 20.6 (19.4-21.3) | 17.6 (15.4-19.3) | 7.3 (5.9-8.4) | 12.9 (12.2-13.9) | 12.1 (11.1-14.5) |
| Cover-6 | no | 1.5 s | 59 | 3.0 (2.0-3.9) | 13.5 (12.4-17.8) | -0.1 (-0.8-1.0) | 2.2 (1.3-4.1) | 14.8 (13.2-15.5) | 17.5 (16.6-19.5) | 11.5 (9.9-12.4) | 3.2 (2.8-3.5) | 10.6 (10.4-14.7) |
| Cover-6 | no | 2.0 s | 59 | 3.1 (2.5-5.5) | 13.7 (12.2-18.1) | -3.2 (-3.9--0.8) | 1.8 (0.9-3.6) | 16.7 (14.2-17.2) | 17.4 (15.7-19.3) | 10.2 (7.8-10.9) | 6.5 (5.8-6.8) | 10.9 (10.3-14.7) |
| Cover-6 | no | 2.5 s | 59 | 4.6 (3.6-7.0) | 13.9 (12.0-17.9) | -5.1 (-6.6--2.0) | 1.5 (0.6-3.3) | 18.5 (16.1-19.1) | 17.2 (15.6-19.1) | 8.7 (5.6-9.4) | 10.1 (9.0-10.6) | 11.4 (10.5-14.9) |
| Cover-6 | no | 3.0 s | 59 | 6.8 (5.5-9.1) | 14.0 (12.0-18.1) | -6.2 (-8.9--3.8) | 1.6 (0.4-3.1) | 20.3 (17.8-21.4) | 16.8 (15.6-19.2) | 7.0 (3.7-8.2) | 13.2 (12.0-14.6) | 11.4 (10.4-14.1) |
