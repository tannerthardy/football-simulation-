# Why a slow pursuer's chosen intercept jumps (TKL-2, Stage 4)

2026-10-26, develop `a27ccd84` (reproducers rechecked on `4e6fed4e`). Diagnosis only: no behavior change. It follows
[the re-steer cause](pursuit-resteer-cause.md) and #296 (slow gather, stop
rule). Slow pursuers re-steer at about 2× the NFL rate at 6–15 yd, outside the
close gather, so the aim layer owns part of that excess. Question: why does the
chosen intercept switch or flip when the carrier hasn't really changed?

## Operators

- **Scan:** [`scripts/diag/aim-jump/scan.ts`](../../scripts/diag/aim-jump/scan.ts)
  restages every play once per defender, with the selected-actor command trace
  from the first non-QB carrier to the end. Each chase step keeps
  `pursuitPoint`'s inputs and its choice:
  - his position, velocity and speed scale;
  - the consumed runner picture: position, velocity and the older velocity;
  - the forecast: heading, speed, acceleration, relaxed speed V and τ;
  - the effort request, horizon and radius.

  Every restage gave the same yards and end time as its untraced play: 0
  mismatches in 4,070.
- **Sets:**
  - 2 ordinary league games, seed 7, 300 plays;
  - the seed 7 and seed 8 audit games (`capture-game-play.ts`, Ironmen v Comets),
    280 plays.
- **Attribution:** [`attribute.ts`](../../scripts/diag/aim-jump/attribute.ts)
  re-runs `interceptPoint` offline from the traced inputs
  ([`chooser.ts`](../../scripts/diag/aim-jump/chooser.ts)). The re-run matches
  the traced choice on 99.4% of rows. The other 0.6% differ only because the
  inputs are stored to 0.001, which shows how close to a tie those choices
  were.
  - A window pairs rows 0.2 s apart. It counts when he is under 0.8 of the
    runner's speed, 6–15 yd away, and moving faster than 2 yd/s.
  - A **jump** is either a feasible↔fallback flip, or a chosen time more than
    0.3 s off steady motion. Steady motion moves it 0.2 s earlier in 0.2 s.
  - Each window is then re-read with one input group held equal, alone and
    cumulatively.
- **Runner motion:** [`runner_speed.py`](../../scripts/diag/aim-jump/runner_speed.py)
  is the same operator on BDB2025 (5,418 carriers) and a seed-7 sim export
  (4 games). It measures how much a carrier's speed changes over 0.2 s while he
  holds his line.

## Result

Slow pursuers at 6–15 yd, 8,375 windows. "Aim turns" counts forecast-point
bearing changes over 15° in 0.2 s.

| Inputs held equal | Jumps (league / audit 7 / audit 8) | Aim turns |
| --- | --- | --- |
| None (as traced) | 834 / 677 / 409 = **1,920** | 363 / 222 / 170 = **755** |
| Acceleration term only | 540 / 489 / 222 = 1,251 (−35%) | 170 / 133 / 67 = 370 (−51%) |
| Heading only | 786 / 647 / 422 = 1,855 (−3%) | 270 / 210 / 135 = 615 (−19%) |
| Observed speed only | 828 / 590 / 356 = 1,774 (−8%) | 293 / 184 / 129 = 606 (−20%) |
| Effort budget/horizon only | 796 / 637 / 399 = 1,832 (−5%) | 364 / 214 / 172 = 750 (−1%) |
| Accel term, effort, observed speed, heading | 198 / 236 / 83 = 517 | 32 / 78 / 16 = 126 |

- The **acceleration term** is the largest single input on every set. Holding
  it equal removes about a third of the jumps and half of the aim turns.
- What's left after all four are held equal is his own motion and the
  runner's displacement. That residual is mostly fallback switches and flips
  on near-tied curves.
- **The runner hadn't really changed** in 828 of the 1,920 jumps: his heading
  held within 10° for 0.6 s. Holding the acceleration term equal removes 240 of
  those 828 jumps and 127 of their 256 aim turns.
- **Runner motion is ordinary.** Holding a line at 4+ yd/s, the speed change
  over 0.2 s is:

  | | p50 | p90 | p99 | Over 2.5 yd/s² |
  | --- | --- | --- | --- | --- |
  | NFL | 1.25 | 3.75 | 6.2 | 25% |
  | Sim | 1.12 | 2.83 | 6.3 | 15% |
  | Raw body velocity the pursuer reads | 1.69 | 3.76 | 7.1 | 33% |

  Sim speed reverses within 0.4 s more often (2.3% of samples vs 0.7%). That's
  minor and noted below.
- **How far the term moves the forecast.** For slow pursuers at 6–15 yd,
  |V − observed speed| has p50 0.9 yd/s and p90 1.9; it is over 1 yd/s 44% of
  the time. V moves more than 0.5 yd/s in a single 0.05 s tick 17% of the
  time.

## Named mechanism: forecast acceleration whiplash on a marginal chase

1. **The input.** `pursuitPoint` (`src/sim/behaviors/common.ts`) forecasts the
   runner relaxing toward `V = speed + acceleration·τ`, with τ = 0.3–0.6 s.
   Here `acceleration = (|seen velocity| − |velocity 0.2 s earlier|) / 0.2` is
   one finite difference of two delayed pictures.
   - A runner's ordinary stride and cut speed changes, which are realistic by
     the NFL operator, become a forecast trend.
   - A 0.3–0.8 yd/s change in 0.2 s moves V by 1–3 yd/s, which moves the
     forecast point at 2–3 s by 2–5 yd.
   - The difference reverses when the change ends, so V swings back.
2. **The amplifier.** For a pursuer slower than the runner, the slack curve
   (sample time minus estimated arrival) runs close to its best value across a
   wide range of times. `interceptPoint` (`src/physics/reach.ts`) returns the
   first feasible sample, else the least deficit, with no memory of its last
   choice. So when the best value is near zero or tied, a small change in V
   moves the choice a long way:
   - feasible↔fallback flips when the best slack crosses zero (often at the
     horizon edge);
   - fallback hops between t = 0 ("where he is now") and t = 3 s (the horizon).
     The two ends were tied within 0.1 s in about half of the hops (242 of
     490).

   The aim then turns, and the command follows it: 192 of 242 jumps on the
   audit sets that turned the aim more than 15° also turned the final command
   more than 15°.

This is a **bug, not football**: a pursuer reading a 0.2 s speed change as a
lasting trend. It's in the chase layer this lane owns (Defense), so there is
nothing to hand off. The close-gather mechanism from the earlier review is
separate.

## Frozen reproducers (exact setup)

```sh
node --import tsx scripts/diag/aim-jump/repro.ts --frozen s7-P115 --slot LB_W --at 3.05 --from 2.8 --to 3.75
node --import tsx scripts/diag/aim-jump/repro.ts --frozen s8-P111 --slot LB_M --at 3.6 --from 3.2 --to 4.4
```

`--frozen` replays the exact constructor input saved in
`scripts/diag/aim-jump/frozen.bin.gz` (14 KB, captured at `a27ccd84`). It also
checks the result against the result recorded at capture. Use `--seed S --play
N` to capture any audit-game play instead (`captureOrdinaryPlay`); later engine
changes can move which play that is. On develop `4e6fed4e` both frozen plays
replay with traces identical to `a27ccd84`.

The script prints, step by step:
- the true runner, the picture and the forecast;
- the choice, the aim and command bearings, and his body heading.

At `--at` it re-runs the chooser with the previous step's inputs and one new
input group at a time. It also shows the same inputs with a longer horizon and
without the acceleration term.

### s7 G1-P115, LB_W

Gun Trey Four Verticals vs 4-3 Even Cover 1 Off, after the catch. Setup sha256
`3961211925154fa5…`, restage identical. Through the first flip the runner is
at 5.9–6.2 yd/s on a 44–45° heading; he bends to 30–36° after it. LB_W is at
4–5.7 yd/s and 10–11.5 yd.

| t | Runner true sp / hd | Seen sp | Accel | V | Choice | Aim / command bearing |
| --- | --- | --- | --- | --- | --- | --- |
| 2.95 | 5.86 / 44 | 5.56 | −2.62 | 4.35 | F 2.6 | −5 / −5 |
| 3.00 | 6.01 / 45 | 5.63 | −1.03 | 5.16 | F 2.9 | 5 / 5 |
| 3.05 | 6.15 / 45 | 5.73 | 0.46 | 5.94 | **B 3.0** | 12 / 12 |
| 3.20 | 5.89 / 31 | 6.15 | 2.60 | 7.36 | B 3.0 | 18 / 18 |
| 3.35 | 5.36 / 30 | 5.89 | −0.61 | 5.61 | **F 3.0** | 5 / 5 |
| 3.55 | 5.63 / 35 | 5.22 | −3.34 | 3.67 | F 1.9 | −7 / −7 |
| 3.60 | 5.42 / 36 | 6.04 | 1.31 | 6.65 | **B 3.0** | 12 / 12 |

- **First changed input at 3.05:** the acceleration term goes from −1.03 to
  +0.46 yd/s², so V rises from 5.16 to 5.94. Swapping it alone into the 3.00
  inputs reproduces F 2.9 → B 3.0. Each other input alone keeps a feasible
  choice: his state, the runner's position, the heading, the observed speed
  and the request.
- **Why it jumps:** the slack curve rises to the horizon, and its best value
  moves from +0.04 to −0.10 s.
- **The flip follows the acceleration term.** In this 3.00 → 3.05 step the
  observed speed rises only 0.10 yd/s, while the term swings 1.5 yd/s², and
  it swings back and forth over the window. Without the term the choice is
  B 3.0 at both 3.00 and 3.05, so this flip doesn't happen.
- **At 3.60:** a 0.8 yd/s step in the seen speed becomes a 3 yd/s swing in V.
  The choice moves from F 1.9 to B 3.0 and the command turns 19° in 0.05 s.
  Without the term it would move from F 2.5 to B 3.0.

### s8 G1-P111, LB_M

Gun Trips Inside Zone vs 4-3 Over Cover 3 Seam, fallback hop. Setup sha256
`0f31e1ab970bbeb2…`, restage identical. The runner holds −34° at 7.2–7.9 yd/s,
and LB_M is at 3–4.6 yd/s and 7–10 yd.

- At 3.60 the observed speed slips 0.07 yd/s and the acceleration term goes
  from −0.06 to −0.80, so V falls from 7.87 to 7.45.
- The deficit curve is U-shaped, with its ends −1.33 and −1.35 s apart by
  0.02 s. The least deficit hops from t = 0 to t = 3.0, and the aim turns from
  −55° to −36°.
- At 4.05 the term turns positive (+1.77) and it hops back to t = 0. At 4.20 it
  hops to 3.0 again.

## What it isn't

- **Not a "barely open" sliver at the earliest feasible point.** That was my
  first reading, and it was an artifact: the traced slack curve stops at the
  first feasible sample. On whole curves (league set), feasible jumps are split
  142 / 328 between curves whose best slack is below 0.25 s and wider ones.
- **Not the chooser rule** (league set). Reading the whole curve's best point instead of
  the earliest feasible one doesn't reduce jumps (848 vs 834).
- **Not the horizon.** A 6 s horizon nearly doubles jumps (1,514 vs 834),
  because later points move more with V.
- **The effort switch at 12 yd is real but small** (league set): 37 jumps in the cumulative
  step (38 alone). That's the documented "planner keeps the reduced budget" item.
- **Heading changes are mostly real cuts** (league set). Holding heading equal
  removes 48 jumps alone, or 158 after the others. 130 of those 158 are where
  the runner turned.

## Proposed fix (not built)

The forecast estimates the runner's speed trend from the pictures he has
already seen over a longer window, about 0.4–0.6 s. For example, use a
least-squares slope of seen speed, or the mean speed when the slope isn't
clear. Use the trend only while it is consistent, and stop extrapolating a
single 0.2 s difference as a burst.

- It is the same acquired, delayed information, with no new knob or flag.
- Anticipation can still set how far ahead he extrapolates.
- It is not heading damping or intercept lifetime, the two earlier failed
  attempts. Heading damping touched heading, which is a small share here.
  Intercept lifetime held stale points, so it ignored real changes too.

Checks, in this order:

1. The two reproducers: P115 holds one choice from 3.00 to 3.60, and P111
   doesn't hop back to t = 0 at 4.05.
2. The decomposition above: jumps and aim turns fall about as the "acceleration
   term" row says, with the heading-turned rows unchanged.
3. The same-operator re-steer table for 6–15 yd: slow-band re-steer falls
   toward the NFL's, with the matched band unchanged.
4. Matched yards per play on develop and on #273.

If the fallback hops remain material after that, the second step is a
commitment rule inside `pursuitPoint`: keep his previous intercept time unless
the new one is better by a margin. That's a decision, not a capacity, and it
uses only his own plan.

## Dispositions

- **#296** (slow gather) can close. Its residual 6–15 yd excess is this
  mechanism, outside the gather.
- **#273** (tackle reach) stays held until the forecast fix exists to pair
  with it.
- **Not mine:** sim runners reverse speed within 0.4 s about 3× as often as
  NFL runners (2.3% vs 0.7%). One reproducer step shows a 0.8 yd/s rise in a
  single 0.05 s tick (P115, about 3.45 s). It's a minor share, but Run Game or
  Main Engine may want to look.

## Caveats

- Two league games and two audit games, all at develop `a27ccd84`. Last
  week's 512 frozen episodes weren't available in this container, so the
  counts aren't directly comparable with its 469 / 222 / 303 split.
- The counterfactuals re-read the chooser only. They don't re-run the play, so
  they say which input moves the choice, not what the play would do under a
  fix.
- The cumulative decomposition depends on its order. The one-at-a-time rows
  give the same ranking.
- Forecast-point bearing ignores the per-player time bias and leverage, which
  are constant or slowly changing within a window.
