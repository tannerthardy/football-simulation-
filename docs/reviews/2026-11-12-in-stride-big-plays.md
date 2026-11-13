# IN_STRIDE_CATCH big plays: where the extra yards come from (Coverage, 2026-11-12)

Status: a diagnosis. `IN_STRIDE_CATCH` stays held on `catch/C14-in-stride`. It will be re-run after `CUSHION_BREAK` lands, with the before-contact table below as the check.

## Populations

- **Sim:** develop 61fe0c99 plus `catch/C14-in-stride` 8e132adb, with `IN_STRIDE_CATCH` off vs on.
  - sim-export seeds 11 and 23, 8 games each.
  - The export records each target's installed route as `players[i].route` (family:id).
- **NFL:** BDB 2025 weeks 1–3.
- The tools are `bigplay.py`, `yac_split.py` and `catch_pursuit.py` in `scripts/diag/pass-operators/`.
  - `yac_split.py` and `catch_pursuit.py` run the same code on NFL and sim.
  - `bigplay.py` is sim only.

The exports reproduce Integration's league cards:

| | off | on |
|---|---|---|
| 20+ completions per attempt | 18.8% | 24.8% |
| yards per attempt | 10.6 | 12.7 |
| YAC per reception | 7.3 | 9.9 |
| completion | 67.3% | 66.6% |

## 1. Where the extra 20+ completions come from (+98)

**By route:**

- Back routes and flats: +37 (back_flat +22, flat +18).
- Intermediate: +27 (dig +18).
- Deep: +22 (corner +12, seam +8).
- Quick: +7. Crossers: +5.

**By air yards** (20+ completions per 100 attempts):

| air yards | off | on |
|---|---|---|
| behind the line | 5.6 | 9.1 |
| 0–10 | 10.3 | 14.8 |
| 10–20 | 31.3 | 37.4 |
| 20+ | 44.8 | 49.7 |

The deep ball caught in stride is about a fifth of it. The largest term is short catches that turn into long runs.

## 2. The yards come before contact

Mean YAC split into yards before first contact + yards after it (`yac_split.py`):

| catch depth | NFL | off | on |
|---|---|---|---|
| all | 2.96 + 2.03 | 3.92 + 3.37 | 6.20 + 3.67 |
| 0–5 yd | 2.62 + 1.98 | 3.50 + 3.26 | 7.27 + 3.43 |
| 5–10 yd | 1.75 + 1.48 | 2.93 + 2.73 | 4.81 + 3.27 |

- **Catches with no contact:** on 0–5 yd catches, NFL 19%, off 9%, on 18%.
- **Yards after contact barely move with the flag.** They are already about 1.6× the NFL in both arms; see `2026-11-12-finish-after-contact.md`.
- **How 20+ plays end** is almost unchanged:
  - carried a wrap 5+ yd: 39 → 35%;
  - tackled: 28 → 28%;
  - untouched: 12 → 17%;
  - broke: 15 → 12%;
  - missed: 7 → 8%.

## 3. Why: the slow catcher was hiding the slow defender

Catches 0–10 yd downfield (`catch_pursuit.py`):

| | NFL | off | on |
|---|---|---|---|
| nearest defender's speed at the catch | 5.5 | 4.1 | 4.0 yd/s |
| his closing speed | +2.7 | +1.7 | +1.7 yd/s |
| catcher speed | 4.7 | 3.3 | 4.2 yd/s |
| nearest gap 1.0 s later | 0.9 | 1.0 | 1.3 yd |

- With the flag off, our slow catcher roughly cancelled our slow defender.
- With the catcher at closer to NFL speed, the defenders' missing ~1.5 yd/s turns into free yards.
- That makes it Defense's arrival work (`CUSHION_BREAK`, `PEDAL_CAP`, pursuit), not the catch.

## 4. Catch speed is within route speed

- **Catch speed vs route speed:** the receiver's speed at the catch exceeds his top speed in the 1.5 s before the throw (by more than 0.5 yd/s) about equally often in both arms:
  - 6% / 6% on 0–10 yd catches;
  - 3% / 3% on 10–20;
  - 8% / 8% on 20+.
- **Top speed in flight:** it exceeds his pre-throw top by 1+ yd/s on 3 → 4% of catches, and 5 → 7% on deep ones.
- **Reachability:** the stride point uses the same reach test as the old rule (`timeToReach` ≤ time left), so it cannot pick a point he can't reach.
- **Deep completion:** 51 → 53%.

## Next

Re-run these three tables with `IN_STRIDE_CATCH` on once `CUSHION_BREAK` is a candidate. The check is the defender's speed and closing at the catch, and the before-contact yards on 0–5 yd catches.
