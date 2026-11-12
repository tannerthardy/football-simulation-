# The underneath plant (SHOULDER_READ, repurposed)

C14 underneath zone break timing, 2026-11-12, develop d6e3f56f (engine-47). Flag `SHOULDER_READ`, off. It was Defense's flag; Coverage repurposed it with their agreement.

## Diagnosis

Instrument: `scripts/diag/risk/under-break.ts`.

- **Population:** zone completions caught 0–10 yd.
- **Defender:** the underneath ZoneCoverage defender nearest the catch point at the release.
- **Break:** the first tick at 1.5 yd/s or more within 45° of the catch point.

| | hook | curl/flat |
|---|---|---|
| observation delay `observationDelay(reactionTime × (1 − 0.4 anticipation))` p10 / p50 / p90 | 0.15 / 0.18 / 0.21 s | 0.14 / 0.18 / 0.21 s |
| windup start | −0.35 to −0.40 s | −0.40 s |
| windup + delay matured | −0.20 s (100% before the release) | −0.20 s |
| keysQB fires | +0.05 s | +0.05 s |
| facing the QB at the windup | 96–97% | 86–88% |
| speed toward the catch point at the release, p25 / p50 / p75 | −1.5 / −0.25 / +1.2 yd/s | −1.4 / +0.1 / +1.4 |
| break p50 | +0.40 s | +0.30 s |

**What the table shows:**

- **The delay is not too long.** Its p50 is 0.18 s.
- **The cue is thrown away.** `sawThrow` returns false until the ball is in the air, so the matured cue waits for the release.
- **The delay is not charged twice.** `acquireFlight` copies the whole true ball path at once.
- **The rest of the lateness is the body.** About half these defenders are still dropping at the release.

**The original SHOULDER_READ (the eyes-directed lean)** fired on 59–69% of these plays but did not move the break. The QB's eyes, as the defender sees them, were on the eventual catcher only 35–45% of the time.

## The mechanism

At windup + his observation delay, an underneath defender keying the QB as keysQB does stops his drop. The part of his zone command taking him away from the line is dropped, and his lateral and downhill zone play continue.

- A pump is a windup. He plants on it and restarts once he sees the ball pulled down (`sim.windupEndAt`, after his delay).
- A quick release gives him little time planted.

**Attempt 1 (reverted):** a full stop, squared to the QB. It cancelled his movement toward threats too:

- Hook speed toward the catch point at the release fell from −0.24 to −0.43 yd/s on seed 11, and from −0.09 to −0.49 yd/s on seed 23.
- At +0.3 s it was no better: 0.81 → 0.78 and 0.96 → 0.67 yd/s.

## Results

`under-break.ts` and `scripts/diag/risk/plant-games.ts`, seeds 11 / 23, 8 games each, off → on:

| | seed 11 | seed 23 |
|---|---|---|
| hook break p50 | 0.50 → 0.35 s | 0.50 → 0.40 s |
| hook break at or before the release | 11 → 14% | 10 → 10% |
| curl/flat break p50 | 0.40 → 0.35 s | 0.40 → 0.30 s |
| curl/flat break at or before the release | 11 → 15% | 13 → 16% |
| toward the catcher, hook, at −0.3 / 0 / +0.3 s | −0.61 / −0.24 / 0.81 → −0.60 / −0.12 / 0.98 | −0.52 / −0.09 / 0.96 → −0.79 / −0.17 / 1.02 |
| toward the catcher, curl/flat, at −0.3 / 0 / +0.3 s | 0.00 / 0.29 / 1.20 → −0.29 / 0.24 / 1.20 | −0.19 / 0.05 / 1.00 → 0.03 / 0.33 / 1.23 |
| plants per dropback with a windup | 1.68 | 1.68 |
| pumps; wrong plants per pump | 61; 0.07 | 78; 0.12 |
| zone catches 0–10 yd: yd/catch, YAC | 12.13 / 7.49 → 12.29 / 7.70 | 10.58 / 6.10 → 10.94 / 6.25 |
| zone throws to digs (n, comp, yd/att) | 19, 53%, 9.36 → 14, 64%, 12.37 | 24, 50%, 7.74 → 27, 48%, 9.47 |
| zone throws to seams | 10, 60%, 15.84 → 6, 33%, 7.91 | 22, 50%, 9.00 → 18, 50%, 9.45 |

**The NFL comparison** is Defense's `underarrival.py`, BDB 2025 dropbacks. The zone LB's speed toward the catcher is 0.0 / +1.1 / +2.4 yd/s at −0.3 / 0 / +0.3 s, and 32% break at the release (hook 41%).

The two operators differ. Ours measures toward the eventual catch point; `underarrival.py` measures toward the catcher. Treat the NFL numbers as the direction of the gap, not as a matched number.

**Commitment** (seed 23, windup to release + 0.6 s, per underneath defender, off → on):

- Turns over 90° within 0.3 s: 2% → 2%.
- Depth-direction flips: any 23% → 22%; two or more 1% → 1%.
- Restarts after a pulled-down motion: 8 of 1,292 plants.

There is no added stop-and-go on pumps (Defense's concern).

**Wrong plants on a pump:** depth change from the windup to the pump + 1.0 s p50 is −0.29 / 0.00 yd. With n of 4 and 9, that is too few to read.

## Reading

**The plant is real but small.** Breaks come 0.05–0.15 s sooner by p50, and he is faster toward the catcher at +0.3 s on three of four rows. The dig and seam rows and YAC are within game noise at this n.

**Most of the NFL gap is direction before the release** (+1.1 yd/s at the release vs our −0.2 to +0.3). The motion cannot supply that.

**Where the remaining direction could come from:**

- The eyes lean was as often wrong as right on these plays. It is not in this PR.
- The lean becomes worth revisiting when the QB's eyes carry real information and can lie (a look-off; Rules+Coaching's list).

## Noted, not fixed

`acquireFlight` gives the defender the whole true ball path the instant he reads the throw. A real defender reads direction from the release and refines it over the first part of the flight. If break direction is ever too good, look there first.
