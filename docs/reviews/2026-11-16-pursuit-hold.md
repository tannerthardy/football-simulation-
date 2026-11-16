# PURSUIT_HOLD: hold the pursuit intercept (attempt 2, a miss) (2026-11-16)

Defense lane, zone YAC. Base: engine-73 candidate e3ba53f7. Flag `PURSUIT_HOLD`, numeric bits, default 0.
This is the second attempt after LAY_OUT (`2026-11-16-lay-out.md`). Two misses: stop and re-diagnose.

## What the trace said
On 707 zone pursuers 2.5-6 yd from a carrier moving > 6 yd/s, from the side or behind (`pursuit-trace.mts`, with a
local tag on `commitSpot`):
- PURSUIT_SPOT held its spot on 59% of ticks. It released on 41%: miss > reach 26%, late 5%, near 4%,
  fresh-earlier 3%, horizon 3%.
- On release ticks the steering point jumped (p50 17.8 yd/s) and its bearing turned 36 deg/s; on held ticks, 11 deg/s.
- While holding, the spot was re-laid along the carrier's current heading each tick (`path(along / V)`).
- The carrier was not accelerating on these ticks (−0.05 yd/s per s held), so case (i) did not apply.

## The change
- bit 1: steer at the held spot itself; re-plan only when the carrier's seen heading has turned 25 deg since the spot
  was chosen, or the spot is 1 yd beyond reach off his path (both stated choices).
- bit 2: OPEN_FIELD's on-top aim only for a carrier coming at him (45 deg to enter, 60 to stay); its lead is the
  meeting time solved from both speeds.

## Measured (staged, the same 1,230-completion design; `arms-report.py`, `pursuit-report.py`, `pursuer-speed.py`)
| arm | zone YAC | 20+ | never reached | request heading rate p50 | speed change over 0.5 s |
|---|---|---|---|---|---|
| engine-73 | 5.91 | 5.2% | 7.1% at 28.1 | 36 deg/s | −1.09 |
| PURSUIT_HOLD=1 | 6.15 | 5.8% | 7.6% at 29.8 | 35 deg/s | −0.84 |
| PURSUIT_HOLD=3 | 6.25 | 6.4% | 8.1% at 28.0 | 33 deg/s | −1.11 |

- The 73 tail plays' closest approach: 1.67 → 1.74 (bit 1), 1.52 (bits 1+2).
- Head-on control: the carrier gains 5+ in the next second 1.4% → 3.0-3.2%.
- Man: 3.13 → 3.46-3.51.
- The dither budget was not run: both arms are misses.

## Why it missed, and what that says
Holding the spot fixed did not slow the request's turning. His velocity sits 24-25 deg off the request (p50). At
6.5 yd/s and 4 yd out, that alone turns the line to a fixed point by about 6.5 · sin 25° / 4 ≈ 0.69 rad/s ≈ 39 deg/s.
So the request "following the bearing" is the body lagging its own request, not the planner re-aiming. The cause sits
in how fast the body comes onto the line it is asked to run (the turn and acceleration at 6-7 yd/s). That is Tools'
turn-cost check against tracking (Integration's (b)), not another controller change.
