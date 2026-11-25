# Touch: what the throw does today (inventory, no design)

Parked behind the defender-job model. Read from `src/sim/behaviors/qb.ts`, `src/physics/ball.ts` and
`src/sim/catching.ts` on the QB lane branch at engine-68 (develop fbeeef9b merged). Line numbers are approximate.

## 1. What the throw solver controls

Flight time is chosen from a few discrete options per receiver, not a range (`evaluate`, qb.ts ~1935-1993):
- the natural ball: `T = max(minFlight x 1.05, natural(d))`, `natural(d) = (0.38 + 0.022 d + 0.00065 d^2) x
  (1 - 0.12 x armEdge)` (a measured fit by distance, scaled by arm speed; `naturalFlightFor`, ~95);
- a touch ball, `1.2 T`, only when the target is more than 15 yd away;
- a fastball, `max(Tmin, 0.75 T)`, only when the natural ball's chance is under 0.6;
- the aim height is 1.6 yd beyond 20 yd downfield, otherwise the catch height.
What chooses: each option is priced by `window()` and the highest `value` wins. The underneath-hand test is inside
`window()`: points along the arc are compared with each defender's believed leap; the arc's height is what a touch
ball buys (`pClear`).
Screens are separate: a quick screen thrown to its spot takes `clamp(lead, natural, 1.8 x natural)` (`toSpot`, ~1764);
a slow screen is float or firm by `screenTouch` (~1999: a rusher in his near lane says float, a defender closing on the
catch point says firm), with SCREEN_QB's firm NFL timing. No per-route flight times otherwise.
At release the chosen T is jittered by 3% (normal) and floored at the arm's minimum flight with the arm reduced 20% x
flick; the launch velocity is solved with drag and wind (`solveLaunch`, ~2388).

## 2. What error exists, and on what

Aim point only (`release`, ~2359-2381): the intended point is perturbed along x by N(0, 0.8 sigma), across by N(0,
sigma), in height by N(0, 0.45 sigma); then the flight is re-solved to that point. There is no separate error on
speed or launch angle; the 3% jitter on T is the only pace error and it is not rating-scaled.
`missSigma` (~2245): `0.25 + d x (0.013 + 0.034 x (1 - acc)) + 0.0007 x max(0, d - 15)^2`, with acc interpolated from
accShort / accMid / accDeep by distance; times `1 + 0.7 x urgency x (1.1 - composure)`; times a moving-thrower step
(`1.15 + 0.45 x (1 - throwOnRun)` above 2.2 yd/s) or THROW_PLATFORM's spread along his motion; times fatigue
`1 + 0.25 x (1 - energy)`; times `1 + 2.5 x heldBy`; at release times `1 + 0.8 x flick` (a cut load, a hold, a bad
platform) and a log-normal scatter by consistency.
No effort-accuracy trade: the fastball option does not raise sigma; throwing near his maximum velocity costs nothing.

## 3. Whether pace or hang time reach the catch

- Ball speed: one fixed term, `+0.08` difficulty when the ball's speed exceeds 24 yd/s (catching.ts ~229). No
  reaction-time dependence on a hot ball at short range.
- Hang time: `trackPen` for flights over 1.4 s (`(1 - ballTracking) x 0.25`, off under BALL_EST bit 2) and
  CATCH_SPEED's run-and-track term grows with air time (~80-85). Otherwise hang time acts only through defenders'
  travel time and the receiver's own adjustment (BALL_EST).
- A soft ball hanging for a defender is not modelled as such; it appears only as more time for defenders to arrive.

## 4. Ratings that touch it

- accShort / accMid / accDeep: sigma by distance band.
- throwPower: arm speed `22.5 + 8.6 x power/99` yd/s (ball.ts ~116): the natural flight's scale (+/-6%) and the
  minimum flight.
- release: the load time. throwOnRun: the moving-thrower step. composure: urgency's effect on sigma. consistency:
  sigma's scatter.
- `touch`: generated for quarterbacks (players/generator.ts ~52, the Gunslinger archetype lowers it) and read nowhere
  in `src`.
