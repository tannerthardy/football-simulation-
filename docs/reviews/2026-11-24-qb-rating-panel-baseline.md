# The rating panel on the old controller (harness item 2): passers at 35 / 60 / 88, engine-95

Tools/Physics, 2026-11-24, for Integration and the QB lane. The QB lane's panel (`scripts/diag/eyes/rating-panel.ts` and `rating_panel_table.py` on claude/exciting-cori-hc8l4u, copied unchanged to `scripts/diag/qb/`) run on engine-95 (develop 703fc628c) with every other thing fixed: one passer on the same staged plays (8 concepts x 4 coverages x 2 rosters x 2 seeds x 2 flips = 256 plays per level, `gun_doubles_11`), his seven mental ratings (playRecognition, decisionMaking, awareness, composure, discipline, anticipation, consistency) at 35 / 60 / 88 (experience 0 / 4 / 10), plus two mixed profiles: "stare" (slow processing 35, calm 88) and "dart" (processing 60, calm and discipline 30). Arm, accuracy and body are his roster's, so any difference comes through how he reads. Rows `out-panel/` (not committed; 5 x 256 plays, about 4 minutes on 4 cores); table `data/reviews/qb/rating-panel-engine95.md`.

| level | plays | thrown | complete | INT | sacks | away | time to throw p50 | reads reached p50 (mean) | dwell per read p50 / p90 (s) | reads left with under 0.2 s of eyes on | read 1 still held past its step | release - break p50 (n) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 35 | 256 | 235 | 146 | 2 | 17 | 0 | 2.95 | 2 (2.45) | 0.30 / 0.70 | 72 of 370 (19%) | 112 of 239 (47%) | +0.50 (161) |
| 60 | 256 | 237 | 163 | 3 | 15 | 0 | 3.00 | 2 (2.56) | 0.25 / 0.55 | 142 of 398 (36%) | 116 of 239 (49%) | +0.55 (185) |
| 88 | 256 | 240 | 177 | 3 | 12 | 0 | 2.85 | 3 (2.78) | 0.20 / 0.45 | 289 of 472 (61%) | 96 of 240 (40%) | +0.55 (183) |
| stare | 256 | 232 | 152 | 0 | 16 | 2 | 2.90 | 2 (2.44) | 0.30 / 0.70 | 65 of 378 (17%) | 112 of 237 (47%) | +0.60 (157) |
| dart | 256 | 237 | 159 | 3 | 16 | 0 | 3.05 | 2 (2.48) | 0.25 / 0.55 | 138 of 389 (35%) | 121 of 241 (50%) | +0.35 (179) |

## What it says (measured, not a verdict on the rebuild)

- **Ratings act on the old controller through dwell and the number of reads, not through when he throws against the route.** The low passer holds each read longest (dwell p50 0.30 s, p90 0.70) and reaches fewer (2.45 reads on average against 2.78 for the high one); the high passer moves through reads fastest (0.20 / 0.45) and reaches more. Time to throw is nearly the same (2.95 / 3.00 / 2.85 s) and **release minus break is the same at every level (+0.50 to +0.55 s)**: the three passers throw equally late against the break. The mixed "dart" profile throws 0.2 s earlier against the break (+0.35) and the "stare" one later (+0.60), the only profile that moves it.
- **The taught pattern is the other way round on the one measure that says whether he looked.** A read left with under 0.2 s of his eyes on it is a read he moved past without seeing it. It is 19% of the low passer's reads, 36% of the mid's and **61% of the high passer's**; the mixed "stare" profile has 17% and "dart" 35%. So on this controller the best passer darts the most (his reads advance on the clock, not on a resolved look) and the low-rated one is the one who stays on a read: the rebuild's target (the low one stares down or leaves early; the high one is on time and sees) is not what the old controller does with ratings, and "no rating awards an outcome" holds only in the sense that ratings change timing, not the result.
- **Outcomes by level (256 plays each): completions 146 / 163 / 177 (62% / 69% / 74% of the throws), sacks 17 / 15 / 12, interceptions 2 / 3 / 3.** Interceptions are too few to read; the stare profile throws none and gives two throw-aways.
- Read 1 held past its step (the footwork beat's own measure): 47% / 49% / 40%: the better passer is moved off read 1 more often, by the same clock.

## Caveats

- Staged plays (gun doubles, concepts from the QB lane's panel, no play action, no blitz, no pocket collapse), seeds 1 and 2; counts of 12-240; differences of a few points are noise. The reads and dwell come from the panel's tick log (`phase`, `readIdx`, head angle to the current read), the old controller's private fields.
- `lookLog` (the step-clock branch) is not on develop, so the "resolved look" the plan describes is not measured here; this panel reports where his head is, not what he resolved.
