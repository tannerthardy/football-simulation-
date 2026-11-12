# FORECAST_BREAK: the quarterback expected the flat to break at the sideline (2026-11-11)

**Defect.** `pathBreak` (`src/sim/receiver-forecast.ts`) puts the receiver's break at the waypoint the route slows
him most for. Past an installed flat, arrow, swing or back's flat, `routePath` adds a continuation: to the sideline
margin, then up. That continuation is slower (the turn up is at s 0.75 or 0.6) than the installed cut (s 0.9).

So the quarterback expected those routes to break at the turn-up. His `ready()` waits for the expected break, so
the receiver was not ready until about 6 s after the snap, by when the hand-written order had run out.

The defect turned up while building the read-compiler Phase 1 fixture (#592). On the current engine, corner-flat
against Cover 2 with the corner sinking left the flat open, rated 0.77 to complete, and it was never thrown; the
ball went to the back at 3.95 s.

This is the mechanism behind the concept-menu report's finding that fade-flat and corner-flat were checked down
rather than run (docs/reviews/2026-11-11-concept-menu.md).

**Change** (`FORECAST_BREAK`, off):

- `routePath` marks its continuation points `ext` (`src/sim/route-motion.ts`).
- `installReceiverRoute` keeps the mark on its frozen path.
- `pathBreak` skips marked points when the flag is on.

The route the receiver runs is unchanged; only what the quarterback expects of it changes.

## Expected break time, off → on

From the quarterback's own forecasts one tick after the snap, for every installed concept that carries one, from
2x2 and 3x1 (`scripts/diag/forecast-break/breaks.ts`):

| Route | n | Off: p25 / p50 / p75 (s after the snap) | On: p25 / p50 / p75 |
|---|---|---|---|
| flat | 18 | 5.35 / 6.20 / 6.25 | 0.80 / 0.95 / 0.95 |
| swing | 2 | 5.20 | 1.60 |
| arrow, back_flat | — | in no installed concept | — |

No other route's expected break changes: no other route's continuation is slower than its own cut.

## Fixture

Test: `test/forecast-break.test.ts`. Setup: corner-flat against Cover 2, the strong corner sinking under the corner
route from 0.6 s, on the current engine. Seeds 1–6.

| | Expected break | Flat thrown | Otherwise |
|---|---|---|---|
| Off | 6.2 s | 4/6, at 4.15 s | W1 |
| On | 0.95 s | 6/6, sooner on the whole | — |

With the flag on, the flat still leaves at 3.3–4.1 s. The hand-written order reads the corner first (S1, S2, W1, B):
the QB holds the corner to 2.5 s, starts a throw to it, pumps at 2.8 s, and only then reaches the flat. Read
order is #592's subject; here the flat is at least available when he gets to it.

## Forced-concept panel, off vs on (READ_PLAN off)

**Setup.** Every ordinary pass concept from 2x2 and 3x1 against Cover 1, 2, 3 and 4, seeds and rosters 1–3, both
flips, on the current engine: 1,536 plays per arm (`scripts/diag/forecast-break/panel.ts`, report
`flat_report.py`).

The 13 concepts carrying a flat or swing are: slant_flat, stick, curl_flat, mesh, flood, y_cross, pa_flood,
double_slants, fade_flat, hitch_post, hitch_cross, corner_flat, trips_stick.

**Those 13 concepts, 624 plays:**

| | Off | On |
|---|---|---|
| Attempts | 606 | 615 |
| Completion | 0.553 | 0.543 |
| Time to throw p50 / p75 | 2.70 / 3.15 s | 2.60 / 3.05 s |
| Sacks | 14 | 9 |
| INT | 16 | 18 |
| Yards a play | 7.57 | 9.00 |
| Flat/swing share of attempts | 0.051 | 0.211 |
| Back share of attempts | 0.158 | 0.109 |

**When the flat (or swing) is actually thrown:**

| | n | Completion | INT | Yards an attempt | Time to throw p50 | Air yards p50 |
|---|---|---|---|---|---|---|
| Off | 31 | 0.677 | 0 | 11.4 | 2.15 s | 3.5 |
| On | 130 | 0.554 | 2 | 13.3 | 2.70 s | 5.8 |

**Yards a play / flat-swing share / INT, by concept:**

| Concept | Off | On |
|---|---|---|
| slant_flat | 6.8 / 0.02 / 1 | 6.8 / 0.21 / 1 |
| stick | 10.6 / 0.02 / 2 | 11.9 / 0.04 / 2 |
| curl_flat | 8.5 / 0.02 / 0 | 8.0 / 0.11 / 0 |
| mesh | 9.6 / 0.12 / 2 | 9.6 / 0.12 / 2 |
| flood | 10.4 / 0.00 / 2 | 10.6 / 0.00 / 2 |
| y_cross | 6.8 / 0.11 / 0 | 12.4 / 0.50 / 0 |
| pa_flood | 12.3 / 0.06 / 1 | 11.6 / 0.15 / 1 |
| double_slants | 5.0 / 0.07 / 5 | 9.5 / 0.23 / 5 |
| fade_flat | 3.4 / 0.02 / 0 | 3.3 / 0.36 / 0 |
| hitch_post | 8.4 / 0.04 / 0 | 8.4 / 0.11 / 0 |
| hitch_cross | 5.1 / 0.07 / 1 | 6.1 / 0.20 / 1 |
| corner_flat | 5.3 / 0.02 / 1 | 7.5 / 0.35 / 3 |
| trips_stick | 6.2 / 0.08 / 1 | 11.2 / 0.38 / 1 |

Across all 32 concepts, off → on: yards a play 7.18 → 7.75; sacks 42 → 37; INT 48 → 50; flat share of attempts
0.016 → 0.080.

## Reading it

- **The flat is now a real option.** With the flag on, the ball goes there about a fifth of the time on these
  concepts (on fade_flat, corner_flat and trips_stick, over a third). Throws to the back fall, and sacks fall. The
  QB has somewhere to go on time.
- **When it is thrown, the flat completes only 55%,** worse than the few flats thrown off (68% of 31, mostly the
  ones open so early nothing could stop them). It is also thrown later (2.70 s) and deeper (5.8 air yards).
  - This is the flat throw's own problem, which Integration noted: over-leads, and a catch judged at the edge of
    reach.
  - engine-31's CATCH_POINT addresses the catch half. These flat throws should be read again on that base once it
    lands before anything is concluded about the throw.
  - What changed here is only that the flat is reached at all.
- **fade_flat throws the flat 36% of the time but gains nothing** (3.4 → 3.3 yards a play). The flat is reached
  late in the hand-written order (fade first). That is a read-order question, #592's subject.
- **Two more interceptions on corner_flat** (1 → 3) come with the flat share going from 0.02 to 0.35. They are
  small numbers. A flat thrown late against a squatting corner is the risk the key read in #592 is meant to
  remove.

## Checks

`npx tsc --noEmit -p .` and `test/forecast-break.test.ts` (2/2) pass. `npm test` results are reported in the PR.
