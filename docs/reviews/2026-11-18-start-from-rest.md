# Starts from rest: magnitude and direction, NFL and the sim (Coverage's bench via Integration, 2026-11-18)

Measurement only. Develop fe150600. Tools: `scripts/diag/body/start_accel.py NFL.pkl SIM.jsonl.gz` (the operator for both) and `scripts/diag/body/start-bench.mts` (lone LB in the World).

**Operator.** Defenders on a pass play, ball not yet thrown: a start is a frame with speed under 1.0 yd/s now and for the 0.2 s before; the move is real if his speed reaches 3.5 yd/s within the next 1.0 s. Speed 0.2 / 0.4 / 0.8 s later (medians), by position group, by his travel heading 0.6 s on against `o` at the start (forward under 45 deg, lateral 45-135, backpedal over 135), and by whether he has turned onto his travel by +0.4 s. NFL: BDB 2025 weeks 1-9 dropbacks (provider speed, which is the distance over the last 0.1 s, `o` the shoulders, `dir`), 26,748 starts. Sim: 16 games on develop 2f5315d9 (`facing_speed_sim.mts`), 5,327 starts, speed taken as the distance over the last 0.1 s like the provider's, `o` hips plus trunk.

| yd/s at 0.2 / 0.4 / 0.8 s | NFL | sim in games | lone body (ask 3.5 / 5 / 8) |
|---|---|---|---|
| all | 1.03 / 1.75 / 3.30 | 1.50 / 2.40 / 3.61 | |
| LB | 1.14 / 1.93 / 3.44 | 1.42 / 2.30 / 3.62 | 1.24 / 2.05 / 2.90, 1.30 / 2.27 / 3.51, 1.36 / 2.49 / 4.20 (forward) |
| DB | 0.86 / 1.55 / 3.21 | 1.43 / 2.24 / 3.33 | |
| DL | 1.47 / 2.32 / 3.58 | 1.61 / 2.62 / 3.98 | |
| forward | 1.45 / 2.37 / 3.73 | 1.66 / 2.66 / 3.98 | = lateral at ask 3.5 and 5 |
| lateral | 0.95 / 1.67 / 3.28 | 1.57 / 2.50 / 3.63 | 1.24 / 2.05 / 2.90 (ask 3.5), 1.30 / 2.27 / 3.51 (5), 1.33 / 2.38 / 3.87 (8) |
| backpedal | 0.86 / 1.56 / 3.19 | 0.91 / 1.65 / 3.19 | 1.24 / 2.05 / 2.90 (3.5), 1.29 / 2.21 / 3.34 (5 and 8: the cap binds) |

**Direction is real in the NFL and survives the controls.** Lateral and backpedal starts are 0.66 and 0.59 of a forward start at 0.2 s, 0.70 and 0.66 at 0.4 s, 0.88 and 0.86 at 0.8 s. Within LBs: forward 1.45 / 2.43 / 3.93, lateral 1.03 / 1.78 / 3.33, backpedal 0.90 / 1.63 / 3.22. At the same peak speed (3.5-4.5): 1.37 / 2.20 / 3.50, 0.92 / 1.61 / 3.20, 0.89 / 1.57 / 3.16. And it is not the turn: starts that have turned to within 45 deg of their travel by +0.4 s start like forward (1.43 / 2.33 / 3.75), while those still off their travel are the slow ones (0.89 / 1.60 / 3.22).

**The body is isotropic; the games are not.** The lone body gives identical speed forward, lateral and backward at the same ask until a cap binds (the backpedal cap at 0.8 s). In games the backpedal start matches the NFL (0.91 / 1.65 / 3.19 against 0.86 / 1.56 / 3.19), because the controllers ask less going backward and the cap prices it; the lateral start does not: the sim's is 0.95 of its forward start (NFL 0.66-0.70), 0.6 / 0.8 yd/s faster than the NFL's at 0.2 / 0.4 s (DBs +0.8 / +1.1; at the same peak band +0.6 / +0.8), the same at 0.8 s. Forward starts are 0.2-0.3 yd/s fast at 0.2-0.4 s, within what the provider's speed smoothing and the 0.1 s grid can account for.

**Reading.** If the start acceleration should depend on where the legs push relative to the pelvis, the body lacks it: a lateral or crossover start from rest should be about two thirds of a forward start for the first 0.4 s and reach 85-90% by 0.8 s, and nothing in the model says so. The same law would touch backpedal drops (the cap already carries it), shuffles and breaks. I have not built it: the evidence is observational, `o` is the shoulders, and the lateral class mixes shuffles with crossovers.
