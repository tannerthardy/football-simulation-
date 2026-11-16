# The underneath zone closer: execution against an isolated body and against the NFL (Tools, 2026-11-16; report, nothing built)

Integration's check after Defense's cue_onset.py and closer-census.mts: underneath zone closers reach 2.57 yd/s at the throw against the NFL's 3.72 and close at 1.72 against 2.26, while requesting 5.66 and achieving 2.35 at -0.25 s. Is that the body, the state he moves in, or when he starts? Same treatment as the redirect law. Scripts: `scripts/diag/defense/closer_onset_curve.py` (one operator for NFL and sim exports), `closer-replay.mts` (staged plays, stepBody replay), `closer-isolated.mts` (a lone body). Raw output in `out/closer/`. Defense's tree: `defense/C14-zone-hold` 16d87ebd.

## Operator

cue_onset.py's, unchanged: zone calls, completions caught 0 to 12 yd, `pass_forward` > 0.5 s, the first arriver is the defender nearest the target at the catch, underneath = 2 to 9 yd off the line at the snap; his onset is the start of his last run of closing on the target (his velocity along the line to the target) above +0.5 yd/s that lasts to the throw. Time since onset is read at 10 Hz, closing and speed by the +/-0.2 s central difference (`metrics.Play`).

## 1. The same body stepped alone under the same request (staged, 768 zone plays, 224 closers, Defense's staging)

stepBody from the body's state just before his onset tick, under the intents the play gave him, p50 by time since onset 0.0 to 0.6 s:

| | 0.0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| closing, in play | 0.71 | 1.11 | 1.51 | 1.83 | 1.97 | 1.99 | 2.15 |
| closing, alone | 0.71 | 1.12 | 1.52 | 1.85 | 2.01 | 2.01 | 2.23 |
| speed, in play | 1.27 | 1.61 | 1.94 | 2.26 | 2.52 | 2.71 | 2.83 |
| speed, alone | 1.27 | 1.62 | 1.95 | 2.28 | 2.53 | 2.73 | 2.93 |
| request, speed | 4.25 | 4.40 | 4.87 | 5.57 | 5.60 | 5.79 | 5.33 |
| request, closing | 2.92 | 3.13 | 3.48 | 3.58 | 3.38 | 3.29 | 3.34 |

In play equals alone: the world (solver, trunk, contacts) takes nothing from him. He is never off his feet. His facing is 43 to 50 degrees off the line to the target throughout, and that costs nothing: a lone CB, S or LB at 1.3 yd/s asked to run at 5.6 yd/s along his velocity has the same speed at facing 0, 20, 45 and 70 degrees off the run line (`closer-isolated.mts`; the directional cap does not bind below about 6 yd/s).

## 2. An isolated body against the NFL

A lone CB at the onset's 1.3 yd/s asked 5.6 yd/s straight ahead reaches 2.37, 3.18, 3.78 and 4.24 yd/s at +0.2, +0.4, +0.6 and +0.8 s (S 4.13, LB 4.09 at +0.8). The NFL closers' speed since onset is 2.26 / 2.57 / 2.93 / 3.26 / 3.40 / 3.64 / 3.76 at +0.1 to +0.7 s (all closers) and 3.40 at +0.5 s for those whose run lasts 0.5 s or more. So the body's capacity is not below the NFL's. What he achieves in play is below what he could straight ahead because the request is not along his velocity: the requested closing is 2.9 to 3.6 against a requested speed of 4.3 to 5.8, 50 to 60 degrees off the line to the target, and the NFL closers' velocity is the same angle off the line (closing 2.25 over speed 3.40 at +0.5 s: 48 degrees; ours 1.99 over 2.71: 43 degrees).

## 3. Ours against the NFL at equal time since onset (one operator, games)

NFL 2022 (922 underneath closers) against the zone-hold build's export (8 games, seed 101, 118 closers), p50, since onset -0.4 to +0.8 s:

| | -0.4 | -0.2 | 0.0 | +0.1 | +0.2 | +0.3 | +0.4 | +0.5 | +0.6 | +0.8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| closing NFL | -0.65 | -0.08 | 0.71 | 1.13 | 1.50 | 1.81 | 2.06 | 2.25 | 2.43 | 2.62 |
| closing ours | -0.80 | -0.11 | 0.74 | 1.21 | 1.62 | 2.04 | 2.26 | 2.55 | 2.69 | 2.87 |
| speed NFL | 1.77 | 1.60 | 2.00 | 2.26 | 2.57 | 2.93 | 3.26 | 3.40 | 3.64 | 3.76 |
| speed ours | 1.52 | 1.00 | 1.41 | 1.75 | 2.06 | 2.51 | 2.85 | 3.02 | 3.26 | 3.51 |

The closing is equal to the NFL's through the first 0.2 s and a little above it after (+0.2 to +0.3 yd/s); both start from the same negative closing (moving off the target) and turn at the same rate. The speed is lower by 0.4 to 0.6 yd/s at the onset and by 0.25 to 0.4 later: ours are slower before he starts (1.0 yd/s at -0.2 s against 1.6), and the closer starts from a slower pace.

At the throw (the zone-hold build's export, cue_onset.py): ours 118 of 278 underneath first arrivers close (0.42; NFL 0.54, 922 of 1,699), closers' closing 2.02 (NFL 2.26), speed 3.0 (NFL 3.72), all first arrivers' closing 0.08 (NFL 0.79). Defense's staged census (closers 1.72, speed 2.57) is a different, staged population and lower than this export's.

## 4. Reading

It is not execution. The closer is as fast as an isolated body under the same request, the world adds nothing, facing costs nothing, and from his onset his closing builds as fast as the NFL's. What differs:
* **Fewer close at all** (0.42 against 0.54): the controller's decision to break on the ball, not the body's. The non-closers (0.58) are what makes "all first arrivers" 0.08 against 0.79.
* **They start slower** (speed at the onset 1.4 against 2.0 yd/s; 1.0 against 1.6 at -0.2 s): in the zone, before he breaks, ours move less than the NFL's, which are moving about 1.7 yd/s (backpedal or shuffle) while ours are close to standing. That speed gap carries through the closer's run (about 0.4 yd/s) and is most of the gap at the throw.
* The requested 5.66 against achieved 2.35 at -0.25 s is the sprint curve from a low start, not a defect: a body at 1.3 yd/s asked 5.6 straight reaches 3.18 in 0.4 s and 2.4 in 0.2 s.

Cautions: ours are 118 closers in 8 games against 922 in 9,713 passes; the NFL's pre-onset speed is a median over defenders who then close, a selected group; and the onset operator is a 10 Hz central difference, which blurs the first 0.2 s on both sides equally.
