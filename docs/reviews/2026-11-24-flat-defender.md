# The flat defender: man on a back, underneath carries, the hook's expansion, drop pace (Flex, 2026-11-23/24)

For Integration, from Tools' flat-catch report: at the throw our flat defender stood 5.7 yd deep where the NFL's stood 3.7. At the catch he was behind the receiver on 54% of flat catches, against 35%. The user: "this is something I've been noticing a lot overall". Every NFL figure here uses PFF's per-defender coverage assignment in BDB 2025 (weeks 1-9 unless stated), positions only, and the same operator as ours (`scripts/diag/flat-seat/`).

## Built (all off; patch `docs/reviews/patches/flat-package-hook-expand-c14-squat-sink-b346e56f.diff` on coverage/C14-squat-sink)

### `MAN_BACK` (carded and cleared by Integration)

Man on a back squeezes from the line and mirrors him while he is in the backfield. The cause it fixes is OFF_PEDAL's floor, together with the feed-forward of the back's upfield speed: they made the defender back-pedal while the back walked toward the line from 9-10 yd away.

| man defender on a back, depth (yd) | 0.0 s | 1.0 s | 1.5 s | 2.0 s | 2.5 s |
|---|---|---|---|---|---|
| NFL | 3.6 | 3.0 | 2.5 | 2.1 | 1.8 |
| ours, off | 4.6 | 4.9 | 5.2 | 5.4 | 5.1 |
| ours, MAN_BACK | 4.7 | 3.7 | 3.3 | 3.2 | 3.0 |

Interceptions rose 8 → 10 (noise; one was a squeezed defender on a checkdown, and the QB's pictures were fresh). Rush yards per carry fell about 0.1: the man defender stands 1.7 yd nearer the line at the handoff, which is the honest depth.

### `UNDER_CARRY` + `CARRY_RELEASE` (a pair; neither ships alone)

`UNDER_CARRY`: a match carry in a zone call, with deep help, rides the receiver from on top at his shoulder, not with a corner's off-man pedal.

| depth over a climbing receiver within 5 yd | 1.0 s | 1.5 s | 2.0 s | 2.5 s |
|---|---|---|---|---|
| NFL | 2.9 | 1.8 | 0.6 | -0.3 |
| ours, off | 4.0 | 3.2 | 2.0 | 0.6 |
| ours, UNDER_CARRY | 4.0 | 2.8 | 1.3 | 0.5 |

Alone it exposed the missing half of the curl-flat rule: open flats where the owner had left for something else rose from 6 to 17.

`CARRY_RELEASE` supplies that half, as taught: carry #2, then go first to the flat. The curl-flat or flat seat releases a climbing #2 to the deep help he sees. The trigger is a back or #3 declaring to the flat on his side, held for his recognition time. He then breaks to the flat receiver inside-out. Its first cut never fired, because it waited for the back to be outside him.

### `HOOK_EXPAND`

The back belongs to the hook unless he is the flat threat of a free flat seat. When the back declares flat to a side with no free flat seat, the Mike (or the hook whose #3 is the back) expands with him as man, inside. He does not expand while a crosser or a #3 vertical is in his window.

### Results: Tools' 24 games on Coverage's #872 base (FLIGHT_BREAK and SQUAT_SINK on in every arm)

Arms are off, then MAN_BACK + UNDER_CARRY + CARRY_RELEASE, then all four flags.

| | off | three flags | four flags | NFL |
|---|---|---|---|---|
| open flats per game | 2.96 | 2.83 | 2.21 | 1.50 |
| open-flat YAC per game | 37.9 | 37.2 | 25.8 | 17.4 |
| flat YAC p50 / p75 / p90 | 4.6 / 9.5 / 16.4 | 4.5 / 9.2 / 17.2 | 4.4 / 7.8 / 15.2 | 5.6 / 9.4 / 14.2 |
| flat 10+ share | .235 | .223 | .180 | .221 |
| first defender trailing | .195 | .155 | .163 | .123 |
| class (a), no seat by the call | 37 | 42 | 24 | - |
| middle catches 5-15 yd per game | 11.38 | 10.04 | 10.08 | - |

The 10-15 yd window does not open. The dither budget passes with all six flags on.

## Measured, not built

### Drop pace: two neutral attempts, then the diagnosis

**Attempt 1, `ZONE_PACE`.** The no-target drop was capped at the deepest route in the dropper's band plus 2 yd. It fired on 33% of seat-plays and changed no depth: the cap rises as fast as the route does, so it never binds.

**Attempt 2, `DROP_CONTROL`.** Spot seats got a read gate, and drops were made facing the QB at the body's own capacity. The sprint disappeared, but depth was unchanged: our backers' backpedal capacity is already about 2.6-3 yd/s. The patch is kept in `docs/reviews/patches/drop-control-attempt2-on-flat-package-b346e56f.diff`.

**Diagnosis** (`drop-labels.mts`, `first_move.py`, `settle_trigger.py`, `pace_driver.py`):

- **Recognition is not early.** Box backers make their first committed move at 0.7-0.8 s on both sides. On a dropback our first move is backward more often (35% vs 23%) and downhill less often (19% vs 27%).
- **NFL droppers mostly never settle before the throw.** Only 7-12% do, against our 19-30%. The QB's set does not trigger them.
- **The NFL pace does not follow the drop the QB shows** (R² 0.01-0.03), so the timing rule is out.
- **From 2.0 s the pace follows the threat in front.** It explains R² 0.09 of the variance at 2.0 s and 0.24 at 2.5 s. The dropper matches part of the climbing receiver's upfield speed and stops gaining once that receiver is 2+ yd past him. With a vertical in his area the pace is 2.04 yd/s at 2.5 s; without one, 1.00.
- **Before 1.5 s neither variable explains the pace.** It is a uniform slow start: 0.4 yd/s at 1.0 s and 1.2 at 1.5 s. This part is parked; no invented glide speed.

### Curl-flat width

| curl-flat seat at 0 / 1.0 / 1.5 / 2.0 / 2.5 s | NFL | ours |
|---|---|---|
| width from the ball (yd) | 7.5 / 8.1 / 8.9 / 9.9 / 10.5 | 6.9 / 7.1 / 7.3 / 7.7 / 8.1 |
| relative to #2 (+ = inside him) | -0.2 / -0.4 / -0.6 / -0.9 / -1.1 (ends outside #2) | +0.1 / +0.5 / +0.6 / +0.2 / +0.1 (level) |

Open-flat class (c) is not a width problem: 11 of its 13 cases are "too deep", and half of the 13 are Cover 2/6 squat corners (Coverage's). Not built.

### Also measured on the way

- The NFL drop rate on clean balls is 4.9% against our 7.0% (the `dropped_pass` tag).
- The NFL edge against a wing is the same alignment as ours. What differs is the contact rate: 14% NFL against 52% ours, from how often our edge rushes.
- The pre-snap movement study is in `docs/reviews/data/2026-11-23-presnap/`.
