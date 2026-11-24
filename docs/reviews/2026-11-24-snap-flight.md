# The gun snap's flight: measured on the football's own track (Tools/Physics, 2026-11-24)

QB lane's timing table (NFL BDB 2025 against QB_V2, from the Part 2 operator): snap -> ball in the passer's hands, NFL 0.70 s against ours 0.49 s. Integration's go: a flagged correction (`SNAP_FLIGHT`, off), as its own card arm.

## Measurement

`scripts/diag/snap/snap_flight.py`: BDB 2025 tracking weeks 1-3, the football's own track (the `football` rows) and the QB's, 2,585 shotgun and pistol dropbacks (no play action) with a ball at least 2.5 yd from the QB at the `ball_snap` frame. Flight = the frames from the first ball motion above 2 yd/s to the first frame the ball is within 0.75 yd of the QB.

| quantity | p25 | p50 | p75 |
|---|---|---|---|
| event lag (the `ball_snap` frame to the first ball motion) | 0.0 s | 0.0 s | 0.1 s |
| flight to within 0.75 yd of the QB | 0.6 s | 0.7 s | 0.8 s |
| snap distance at the event | 4.17 yd | 4.58 yd | 4.88 yd |
| per-step ball speed, peak (during the flight) | 6.4 yd/s | 7.4 yd/s | 13.2 yd/s (the upper end includes later frames' hand movement) |

So the ball covers the (4.58 - 0.75) = 3.83 yd to his hands in 0.70 s: **5.5 yd/s**, and the NFL ball is in his hands about 0.70 s after the snap, 0.80 s when seated (+0.1 s `SNAP_SECURE`).

## Why the old value was wrong

`GUN_SNAP` (run-ref-4) set `SNAP_SPEED = 11.5 yd/s` from "the gun QB gets the ball 0.4 s later than the under-center QB over a 4.6 yd snap". That difference assumed the under-center exchange is instant; it is not (a hand-to-hand exchange takes time of its own), so the difference understated the flight. At 11.5 yd/s plus 0.1 s the sim secures the snap at 0.50 s (0.40 s of flight); the track says 0.70 s of flight.

## The change

`SNAP_FLIGHT=1`: `snapSecured = (d - 0.75) / 5.5 + SNAP_SECURE` for d >= 2 yd (4.6 yd: 0.80 s secured); off, unchanged. Readers (every gun play): `plannedSnapAt` (the QB's drop clock and the called pocket schedule the linemen know: `called-drop.ts`) and the gun back's handoff pacing and the mesh (`assign.ts`).
It moves the passer's clock by +0.30 s on every gun dropback, the mesh on gun runs, and the rush's reference timing. The QB lane's quick drift was set from the secure (their 1.1 s) against the NFL's set at 1.6 s from the snap, so it comes down by the same 0.30 s.

## What is measured and what is a choice (Integration's question: why 0.80 against the measured 0.70)

- **Measured:** 0.70 s (p25-p75 0.6-0.8) from the snap event to the ball **within 0.75 yd of the QB** (first touch), over 4.58 yd: 5.5 yd/s over the 3.83 yd to that point.
- **A choice, not measured:** the 0.1 s `SNAP_SECURE` that seats the ball in his hands after first touch, GUN_SNAP's own constant, kept. **The total 0.80 s is the 0.70 s first touch plus the 0.10 s seat.** If "secured" is defined as the same 0.75 yd rule the QB lane used, the secure is 0.70 s and `SNAP_SECURE` would be 0 (a one-constant change); the QB lane's 0.49 s for ours is the model's `snapSecured`, which already includes the seat, so the like-for-like comparison is NFL 0.70 (first touch) against ours 0.40 (first touch), or 0.80 against 0.50 with the seat on both.
- **Coupling that moves with it:** `QB_EXTEND` (0.6 s, the QB's handoff action) was derived from the measured gun handoff at 1.2 s after the snap event (0.1 s of it the event's lag): 1.1 - the old secure 0.50 = 0.6. With the secure at 0.80 and `QB_EXTEND` unchanged the gun handoff would move to 1.4 s, 0.2 s *past* its measurement. `gunHandoffReady` re-derives it the same way under the flag: `max(secure + 0.2, 1.1)` = 1.1 s at the 4.6 yd snap, so **the gun runs' handoff does not move** and the +0.30 s lands on the passer's clock and the called pocket schedule only.

## Caveat

The 0.75 yd threshold is mine (the QB lane's Part 2 used the same). The seat time after it (0.1 s) is `SNAP_SECURE`, kept; no measure of it exists in tracking. Tracking is 0.1 s; positions are quantised to 0.1 yd.
