# Route timing chart: when receivers break, NFL against ours (2026-11-24)

Rules + Coaching, for Integration and the QB lane. The user asked: "When do NFL receivers break on different routes?
Do we have any way from the film to identify what routes players are running and when they break?" This is
measurement only. Route fixes come from it afterwards.

**Answer.**
- **What route:** PFF's `routeRan` label on every route runner (BDB 2025 `player_play.csv`, 2022 weeks 1-9).
- **When he breaks:** found from the tracking with one rule on both sides (below). Labels mix routes of different
  depths, so every comparison is matched by **break-depth band**, not by label.
- **On our side:** the route id each receiver was installed with.

## How it was measured

- **NFL:** `scripts/diag/routes/nfl_routes.py`. 9,674 dropbacks, every route runner (not in motion), tracked from the
  snap past the release to the ball's arrival, or 6 s.
- **Ours:** 24 games (seeds 101-124) on develop **engine-92 `7b36c6e55`** via `npm run ref`, with Tools'
  `sim_plays.mts --full --all` (tools/open-census 0a0c86fa5). 2,178 dropbacks. Screens are left out on both sides.
- **Operator:** `scripts/diag/routes/route_chart.py`, identical code on both sides.
  - **Track cut:** the target at the ball's arrival (ours: the catch, else the release + 0.7 s); everyone else at the
    release + 1.5 s.
  - **Stop family (HITCH):** the plant, the first frame after his peak speed that he is under half of it.
  - **Other planted families:** the frame of his largest heading change between the leg 0.6-0.2 s before and the leg
    0.2-0.6 s after, 35° or more, moving faster than 1.5 yd/s at both ends, at least 1 yd past the line. NFL breaks are
    rolled over about a second: outs turn only 15-26° within 0.3 s, so a short window found 13% of them.
  - **Unplanted families** (CROSS, GO, FLAT, WHEEL): depth and width every 0.5 s, plus the bend (the largest heading
    change, 20° or more).
- **Not found:** the route is counted and left out of the break columns. Either the track ends before a turn (a ball
  thrown early, a play ending), or he never turns that much.
- Runtime: about 25 min of sim on 4 cores; the operator takes 10 s.

**How often the break is found:**

| family | NFL | ours |
|---|---|---|
| HITCH | 83% | 95% |
| OUT | 76% | 94% |
| IN | 89% | 92% |
| SLANT | 47% | 85% |
| POST | 26% | 28% |
| CORNER | 28% | 69% |
| ANGLE | 24% | 34% |

- The NFL slant's track often ends at 2.6 s (thrown on the break).
- Posts and corners turn under 35° on the NFL side more often than on ours.
- The QB lane's 50% of outs and 12% of crosses came from tracks cut at the arrival and a ±0.2 s window.

**What each label mixes** (from the NFL's break-depth distribution):
- **HITCH:** hitch, curl and comeback. Bands: 3-7.5 yd 51%, 7.5-12 23%, 12-18 20%.
- **OUT:** speed or quick out (under 7.5 yd, 63%), out (7.5-12, 23%) and deep out (12+, 14%).
- **IN:** short in or whip (under 7.5, 38%) and dig (7.5-18, 60%).
- **SLANT:** under 7.5 yd (95%).
- **POST, CORNER:** the found "break" under 7.5 yd is often the release bend; the real break is at 7.5 yd or deeper.
- **ANGLE:** the back's angle, under 3 yd.
- **CROSS:** shallow and drag with the over.
- **GO:** go, fade and seam.
- **FLAT:** WR, TE and back flats. Ours are mostly the back's flat (511 of 838).

## Summary for the QB lane (family × break-depth band, p50)

Release - break is for targets only; negative means thrown before the break.

| family | band (yd) | NFL depth | ours depth | NFL time (s) | ours time | NFL release - break | ours release - break |
|---|---|---|---|---|---|---|---|
| HITCH (hitch) | 3-7.5 | 5.0 | 5.4 | 2.3 | 2.3 | -0.1 | +0.3 |
| HITCH (curl) | 7.5-12 | 9.7 | 7.8 | 2.7 | 2.8 | 0.0 | +0.4 |
| HITCH (comeback) | 12-18 | 14.1 | 15.0 | 3.2 | 3.3 | +0.1 | +0.1 |
| OUT (quick / speed) | under 3 | 2.0 | 1.8 | 2.0 | 2.4 | +0.5 | +0.9 |
| OUT (quick / speed) | 3-7.5 | 4.6 | 4.0 | 2.0 | 2.0 | +0.2 | +0.5 |
| OUT | 7.5-12 | 9.8 | 9.5 | 2.6 | 2.8 | 0.0 | +0.2 |
| OUT (deep) | 12-18 | 13.9 | 12.7 | 3.1 | 3.5 | -0.1 | (1) |
| IN (short) | 3-7.5 | 4.8 | 5.5 | 2.1 | 2.4 | +0.4 | +0.5 |
| IN (dig) | 7.5-12 | 10.0 | 10.3 | 2.6 | 2.9 | +0.2 | +0.6 |
| IN (deep dig) | 12-18 | 14.0 | 12.1 | 3.1 | 3.4 | +0.2 | (3) |
| SLANT | under 3 | 1.9 | 2.8 | 1.5 | 1.6 | +0.6 | +0.9 |
| SLANT | 3-7.5 | 4.1 | 3.1 | 1.8 | 1.7 | +0.3 | +0.8 |
| POST | 7.5-12 | 9.7 | 9.7 | 2.5 | 2.4 | +0.1 | - |
| POST | 12-18 | 14.6 | 13.2 | 3.2 | 3.1 | -0.1 | - |
| CORNER | 7.5-12 | 10.4 | 10.6 | 2.6 | 2.6 | +0.5 | +0.7 |
| CORNER | 12-18 | 14.3 | 12.3 | 3.1 | 2.9 | +0.2 | - |

The NFL's rhythm in one line: the break comes at **2.0 s at 3-7.5 yd, 2.6 s at 7.5-12 and 3.1-3.2 s at 12-18**. The
ball leaves within 0.2 s of the break on the hitch, the out and the dig, and 0.3-0.6 s after it on slants and short
ins. Ours break at about the same times but throw 0.2-0.5 s later against the break.

## The three largest differences, by family

- **HITCH** (3-7.5 yd):
  - ours turn 96° at the plant against 43°, and exit at -2° against +33°: ours reverse toward the line, the NFL's
    turn into the window;
  - ours are below 0.8 of their entry speed for 1.7 s against 1.0;
  - the ball comes 0.3 s after the plant against 0.1 s before it.

  Also: our curls are shallower (7.8 vs 9.7 yd, 7.5-12 band). Speed at the catch (0.2 s into it): 0.6 against
  1.5 yd/s.
- **OUT:**
  - the out and the deep out come in slower and stay slower (7.5-12: in 5.0 vs 6.3 yd/s, lowest 4.8 vs 5.7; 12-18:
    5.0 vs 6.6, 3.9 vs 5.8);
  - the deep out is shallower and later (12.7 yd at 3.5 s vs 13.9 at 3.1);
  - the ball comes 0.2-0.4 s later against the break. Under 3 yd, ours break 0.4 s later (2.4 vs 2.0 s).
- **IN:**
  - the dig comes later (2.9 vs 2.6 s) and slower (5.2 vs 5.9 yd/s in);
  - the short in is deeper and later (5.5 yd at 2.4 s vs 4.8 at 2.1);
  - the ball on the dig comes 0.6 s after the break against 0.2. The deep dig is shallower (12.1 vs 14.0, n 28).
- **SLANT:**
  - ours break at one fixed depth (2.8-3.1 yd) where the NFL spreads from 1.3 to 5.0;
  - ours exit steeper upfield (48° vs 35°) and run faster after the break (6.0-6.4 vs 5.1-5.4 yd/s at +0.3 / +0.6 s);
  - the ball comes 0.8-0.9 s after the break against 0.3-0.6.
- **POST** (small n on ours, 41 found): deeper posts are shallower (13.2 vs 14.6 yd) and climb more after the break
  (6.3 vs 2.6 yd from +0.5 to +1.5 s). At 7.5-12 they match.
- **CORNER:**
  - at 7.5-12 yd, depth and time match (10.6 / 2.6 s against 10.4 / 2.6);
  - ours climb more after it (5.2 vs 3.7 yd);
  - the 12-18 corner is shallower (12.3 vs 14.3 yd).
- **ANGLE:** our back's angle is rarely found (34%) and is too small a sample to read.
- **CROSS:**
  - ours are less far across: width at 3.0 s -6.4 against -9.8 yd (across the ball), at the same depth;
  - ours catch slower: 4.5 against 7.2 yd/s;
  - ours bend harder: 40° against 30°.
- **GO:**
  - no outside drift: at 3.0 s ours are 0.5 yd wider than the start, the NFL's 3.9 yd (the fade and the stem to the
    numbers);
  - ours are deeper at 3.0 s (14.0 vs 12.8 yd);
  - speed at the catch 5.1 against 5.4.
- **FLAT:**
  - ours bend much harder: 58° against 32°;
  - ours are wider at 3.0 s (10.3 vs 7.6 yd) and deeper behind the line;
  - ours catch slower: 3.2 against 6.1 yd/s.

  Ours are mostly the back's flat. Read with FLAT_SHAPE, which is not on engine-92.
- **WHEEL** (n 57 ours): ours are narrower and lower at 3.0 s (6.3 yd wide, 2.4 deep, against 11.9 and 4.5).

By cushion and leverage (the split tables in the data file): the NFL's break depth and time barely move with press or
off, or with inside or outside leverage (HITCH: 7.0 vs 6.7 yd, 2.6 s either way). Ours are the same. Nothing in the
split points at a mechanism yet.

## Caveats

- **The labels are PFF's,** one per route runner; ours are route ids mapped onto them (the mapping is in the script).
  Positions are not separated: WR, TE and back are together on both sides.
- **The track cut differs a little:** ours, for an incomplete target, is release + 0.7 s.
- **Speed at the catch** is the 0.2 s into the catch frame, so it is lower than Flex's centred speed (NFL stop routes
  1.5 here against 2.7 there), on both sides alike.
- **The hitch's "turn"** is read on a receiver who has nearly stopped, so its angle is noisy. The direction (exit vs
  the line) is the robust column.

## Full tables

Per family, NFL beside ours: `docs/reviews/data/2026-11-24-route-timing/chart-tables.md`. Rows by break-depth band,
with depth and time p25 / p50 / p75; speed in, lowest and at +0.3 / +0.6 s; duration; turn; exit angle; drift;
release - break; speed at the catch; and the cushion and leverage splits. Regenerate with:

```
python3 -I scripts/diag/routes/nfl_routes.py DATA_DIR out/chart/nfl-routes.jsonl.gz
npm run ref -- -- node --import tsx scripts/diag/census/sim_plays.mts --games 24 --full --all --out out/chart/sim.jsonl.gz
python3 -I scripts/diag/routes/route_chart.py NFL=out/chart/nfl-routes.jsonl.gz OURS=out/chart/sim.jsonl.gz --md chart-tables.md
```

`sim_plays.mts` is Tools' (tools/open-census 0a0c86fa5); it is not on develop.

## QB gates: release - break and what is thrown when (2026-11-24)

The NFL side of the passer's gates (docs/reviews/2026-11-24-qb-decision-plan.md, section 4), with the same operator on
ours: `scripts/diag/routes/qb_gates.py`, table `data/2026-11-24-qb-gates/gates.md`. Dropbacks without play action,
targets only. Release - break uses this chart's break rule. Classes: screen, back, flat, quick (break under 7.5 yd),
intermediate, deep. `--check N` lists plays to check by hand; 25 per side were checked.

**Release - break, p50.** Negative means the ball is out before the break.

| route | NFL | ours |
|---|---|---|
| stops, 3-7.5 yd | -0.1 | +0.3 |
| stops, 7.5-12 yd | 0.0 | +0.5 |
| outs, 3-7.5 yd | +0.2 | +0.5 |
| ins, 7.5-12 yd | +0.2 | +0.6 |
| slants, 3-7.5 yd | +0.3 | +0.8 |

The NFL figures are biased late. A planted route caught within about 0.6 s of its break has no detectable break,
because the track ends at the ball's arrival. That drops 221 NFL stops, 163 slants and 146 outs, the earliest throws.

**What is thrown when, share of targets by release time.**
- 1.5-2.0 s: the NFL throws quick routes on 49% of these, ours 9%; screens are 13% NFL, 73% ours.
- 2.0-2.5 s: quick routes 44% NFL, 62% ours.
- 2.5-3.0 s: quick routes 19% NFL, 54% ours; intermediate 31% NFL, 13% ours; deep 24% NFL, 4% ours.
- Backs are 16-19% of NFL targets in every band from 1.5 s; ours rise from 5% at 1.5-2.0 s to 32% at 3.5+ s, the
  last resort.
- Median release time by class: quick 2.2 NFL, 2.6 ours; back 2.5 NFL, 3.0 ours; flat 2.2 NFL, 2.8 ours.
