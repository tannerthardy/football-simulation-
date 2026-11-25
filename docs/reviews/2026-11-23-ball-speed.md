# Throw velocity, like for like (2026-11-23)

Tools' catching read, through Integration (docs/reviews/2026-11-23-uncontested-drops.md, tools/open-census a7b4bdcb8):
our throws arrive hotter than the NFL's. Ours is 3D at the catch roll, p50 22.3 yd/s and 25% over 24; the NFL tracker
is 2D in flight, p75 19.8 and 0.5% over 24 at arrival. The catch model steps at 24 yd/s. Measurement only.

## One quantity on both sides

`scripts/diag/eyes/ball_flight.py`: the ball's horizontal speed from its 10 Hz positions.
- Sources: BDB 2025 raw tracking weeks 1–3, the football's rows, 2,471 passes with pass_forward and pass_arrived; ours
  is the export's `bxy` (engine-92, seeds 11/23 × 4, 657 passes; no throwaways).
- Release is the first 0.2 s, mid is the 0.2 s around the middle, and arrival is the 0.2 s ending one frame before
  pass_arrived. On the arrival frame the sim places the ball with the catcher: the last frame jumped to 50–120 yd/s at
  p90 and is excluded.
- Air distance is the arrival point past the line. Throw type comes from the targeted receiver's route.
- **What cannot be compared:** apex and the vertical component (the NFL track has no z). Tools' 3D 22.3 includes the
  descending vertical and is not this quantity.

Horizontal speed p50 (p90), yd/s; NFL → ours:

| air yd | n | release | mid | arrival | over 24 at arrival | flight p50 / travel |
|---|---|---|---|---|---|---|
| 0–5 | 885 / 253 | 22.4 (30.4) / 23.4 (28.7) | 21.9 / 22.6 | 20.5 (23.5) / 22.3 (27.4) | 6.1% / 27.7% | 0.70 s, 14.1 yd / 0.70, 13.8 |
| 5–10 | 403 / 202 | 23.8 / 23.8 | 22.6 / 22.7 | 21.1 / 22.5 | 8.4% / 32.7% | 0.90, 18.4 / 0.70, 16.0 |
| 10–20 | 468 / 101 | 24.5 / 22.6 | 22.8 / 21.4 | 20.7 / 21.0 | 6.4% / 21.8% | 1.10, 25.0 / 1.20, 23.5 |
| 20–35 | 132 / 21 | 24.0 / 25.4 | 21.0 / 24.2 | 17.1 / 23.1 | 3.8% / 28.6% | 1.90, 36.7 / 1.40, 31.5 |
| 35+ | 42 / 0 | 23.9 | 20.1 | 16.2 | 0% | 2.60, 51.3 |
| behind the line | 541 / 80 | 19.3 / 21.9 | 19.8 / 21.4 | 18.8 / 21.2 | 6.5% / 10.0% | 0.70 / 0.60 |

By throw type (release / arrival p50, NFL → ours):

| type | release | arrival |
|---|---|---|
| flat/screen | 20.4 / 22.2 | 18.9 / 21.2 |
| quick in | 22.5 / 23.9 | 20.6 / 22.8 |
| in | 24.4 / 22.2 | 21.1 / 21.0 |
| out | 24.7 / 23.6 | 20.7 / 22.2 |
| stop | 24.0 / 23.4 | 21.2 / 22.3 |
| cross | 21.4 / 23.9 | 19.6 / 22.9 |
| vertical | 22.7 / 24.1 | 17.5 / 22.1 |

## What it says

1. **Release speeds match.** The difference is what happens in flight.
   - The NFL ball's horizontal speed falls 2.1 yd/s from mid-flight to arrival on 10–20 yd throws (22.8 → 20.7);
     ours falls 0.4 (21.4 → 21.0). On 20–35 yd throws the NFL's falls 3.9 (21.0 → 17.1); ours 1.1.
   - Horizontal speed in a drag-free flight is constant whatever the arc, so this is drag.
   - Our spiral is k = 0.003 /yd (src/physics/ball.ts: C_d ≈ 0.10, nose-on area 0.0227 m², 0.42 kg). That predicts
     what we see: 22 → 20.5 yd/s over 1.1 s.
   - The NFL track implies k ≈ 0.008–0.011 from mid-flight to arrival, about C_d 0.3. A spiral's axis does not follow a
     descending trajectory: its angle of attack grows through the flight, and the drag with it. That would be a physics
     cause, not a fitted one.
   - The release frames are noisy in the NFL track (p90 30+ yd/s), so the mid-to-arrival estimate is the one to trust.
   - The drag law is Tools/Physics': this is evidence for them, not a change for the QB.
2. **The arrival gap then follows from the flight-time fit.** QB_DRIVE fits his natural flight time to NFL flight
   times by distance. With a low-drag ball, the same flight time needs less launch speed and keeps it, so the ball
   arrives at about its launch speed. With NFL drag, NFL launches are as fast or faster and arrive slower. Fixing drag
   and refitting the flight-time law to the same NFL flights would bring the arrival down without touching the
   catching model.
3. **He does not take anything off short or moving-receiver throws.**
   - The NFL's flats and screens are released at 20.4 against our 22.2, and its crosses at 21.4 against our 23.9: about
     2 yd/s of touch.
   - In the code (behaviors/qb.ts `bestOption`, `naturalFlightFor`) his options are:
     - the natural ball: QB_DRIVE's fitted flight time 0.0731 + 0.03945·d + 0.00022·d² s over d yd release-to-catch,
       scaled by his arm by at most ±6% (armEdge ±0.5 × 0.12);
     - a ×1.2 touch ball, only for throws over 15 yd;
     - a fastball (to 0.75 of the flight, not below his arm's minimum) only when the natural ball's P is under 0.6;
     - slow screens and spot throws, which have their own chosen touch.
   - Release speed is tied to the fit and his arm, not chosen for the receiver. A coached passer chooses pace for the
     receiver and the window: touch on a flat, crossers and backs; firm into a tight window.
   - The proposal (not built) is to give the window a slower option on short throws as well (×1.2 to ×1.3 at any
     distance), priced by its longer flight as the deep touch ball is. A caught-ball model that charges a hot ball is
     what makes the choice matter: the catch roll's step at 24 yd/s is Tools'. The price, not a rule, then chooses
     touch when the window is open and the receiver is moving.
4. **Flight time:** in the 5–10 band the NFL flies 0.90 s over 18.4 yd, ours 0.70 over 16.0, a shorter release-to-catch
   distance.

## Revision (2026-11-24, Tools/Physics' drag reconciliation)

Tools/Physics reconciled the drag reading (docs/reviews/2026-11-24-ball-drag-reconciliation.md, tools/open-census
04eb1b5a8): the NFL ball's speed decay roughly doubles in the last 0.6 s before pass_arrived, in completions and
incompletions alike, and the catch adds more in the last 0.3 s of completions.
- **The drag figure above over-reads.** A slope through arrival over-reads drag. With the last 0.6 s excluded, k is
  0.0047–0.0057 /yd on 20+ yd throws (C_D about 0.15–0.19). The 0.0095 above is inconsistent with the tracked releases:
  it needs 23.4–25.1 yd/s where they are 22.7–22.8.
- **The conclusion to carry** is k about 0.005 against our 0.003, not 0.008–0.011. The late tail is not drag.
- **The arrival column.** `ball_flight.py`'s arrival window (the 0.2 s ending one frame before pass_arrived) sits inside
  that tail on both sides. Its arrival speeds are the speed after the tail, not at contact.
- **Unchanged:** the release-speed comparison, the operator, and the observation that he takes no pace off short
  throws.
- QB_DRIVE's launch is solved through DRAG_SPIRAL (solveLaunch), so a changed constant re-derives the release by itself.
