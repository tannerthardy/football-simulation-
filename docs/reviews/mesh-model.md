# The handoff mesh: what NFL tracking shows, and the model to build

Run Game, 2026-11-09. The operator is `scripts/diag/run-operators/mesh.py`: the same code on the 2022 NFL tracking file and on a sim dump. The sim run is the run-game stack (Defense 975e2294 + run/G3 fd06f842, MESH_TEMPO, MESH_GUN_SIDE, STRETCH_MESH; MESH_NFL off).

## Why a model, not another landmark

The gun mesh has been patched six times:
- MESH_GUN_SIDE;
- MESH_NFL;
- MESH_TEMPO;
- GUN_STRETCH_T (retracted);
- IZ_GUN_A;
- COUNTER_OFFSET.

Each moved a spot or a time. The model under them is unchanged: both men go to a fixed spot and the ball changes hands when they are close enough. Two consequences follow:
- the QB is a parked landmark;
- the back aims at the QB's body, and he must brake for it.

Neither matches the tracking. The numbers below are medians at the handoff event: lateral is + toward the play, and "RB rel QB" is the back's position from the QB (depth + = the back is nearer the line).

### Shotgun

| | QB speed | QB lateral | RB rel QB lateral / depth | Centre separation | RB speed | RB heading (deg off vertical) |
|---|---|---|---|---|---|---|
| NFL IZ (774) | 0.8 | −0.03 | −0.70 / +0.46 | 0.94 | 3.83 | 45 |
| Sim IZ (154) | **0.0** | 0.00 | **−1.27 / −0.06** | **1.27** | **2.21** | 55 |
| NFL OZ (255) | 0.8 | +0.12 | −0.16 / +0.53 | 0.81 | 4.74 | 72 |
| Sim OZ (85) | **0.3** | +0.01 | **−0.95 / +0.25** | 0.98 | **3.84** | **60** |
| NFL power / counter / trap | 1.0 / 1.4 / 1.1 | −0.1 to −0.2 | −0.5 to −0.8 / +0.5 | 0.9–1.1 | 3.8 / 3.6 / 3.5 | 53 / 55 / 33 |
| Sim power / counter / trap | 0.0 | 0.0 | −1.2 / 0.0 | 1.2 | 2.3 / 3.6 / 2.2 | 53 / 52 / 55 |

The NFL gun back crosses in front of the QB, half a yard nearer the line, at 3.5–4.7 yd/s. Ours takes the ball a yard short of the QB's face, level with him, at full arm's length, and on IZ, power and trap he is braking into it (2.2 yd/s). The NFL gun QB is still moving (0.8–1.4 yd/s: he steps to the ride); ours stands.

### Under center and pistol

| | QB depth at the handoff | QB lateral | QB speed | RB rel QB lateral / depth | RB speed / heading |
|---|---|---|---|---|---|
| NFL UC OZ (1236) | 4.3 | +1.87 | 4.3 | +0.91 / +0.72 | 5.50 / 50 |
| Sim UC OZ (228) | 4.1 | +2.13 | 3.5 | +1.07 / +0.56 | 4.73 / 48 |
| NFL UC IZ (433) | 4.4 | +0.89 | 4.2 | +0.79 / +0.57 | 4.46 / 23 |
| Sim UC IZ (60) | **3.3** | +0.46 | **1.1** | +0.49 / +1.18 | 4.68 / 18 |
| NFL UC power / counter | 4.5 / 4.8 | **−0.17 / −0.48** | 4.2 | +0.9 / +0.5 | 4.3 / 3.8 |
| Sim UC power / counter | 3.4 | **+0.48** | **0.1–0.2** | +0.5 / +1.0 | 4.2 / 4.3 |
| NFL pistol OZ (112) | 5.1 | **+1.32** | 1.7 | +1.01 / +0.61 | 5.13 / **56** |
| Sim pistol OZ (17) | 4.5 | +0.20 | 0.1 | +0.45 / +1.07 | 4.14 / **23** |

- **Under-center OZ (STRETCH_MESH) is close.**
- **The other under-center meshes stop short.** The QB's reverse pivot and drop stops 1–1.5 yd short and he stands. On counter he opens to the wrong side: the NFL QB opens away from the play, ours toward it.
- **Pistol OZ is meshed like inside zone.** The NFL QB opens play side about 1.3 yd and the back leaves at 56°; ours stays put and the back goes straight up.

The handoff time is close everywhere (gun 1.0–1.1 s NFL vs 1.0–1.4 s sim; UC 1.2–1.3 vs 1.1–1.6).

## The model

**1. The back runs his own track.**
- Each concept installs his aiming point and his path to it:
  - IZ and power press a gap at about 20–25°;
  - the stretch runs about 50° under center and about 70° from the gun;
  - from the gun every concept first crosses in front of the QB.
- The mesh point is a point **on that track**, chosen so his tempo needs no braking.
- He leaves hard: about 3.8–4.7 yd/s at the exchange in the gun and 4.3–5.5 under center.
- His eyes are on his read key through the mesh (RUN_READ). He cannot cut until he has the ball, and he forms a pocket with his arms.

**2. The QB delivers the ball to the back's track.**
- His footwork is concept-specific:
  - under center, a reverse pivot or open step and a drop to 4.3–4.8 yd, play side 1.9 yd on the stretch and 0.9 on IZ, and *away* (−0.2 to −0.5) on power and counter;
  - from the gun, a step or ride toward the mesh at about 1 yd/s.
- He arrives moving. He is not a landmark.
- He extends the ball when the back is a stride away. The exchange happens at a centre separation of about 0.8–0.9 yd in the gun and 1.1 yd under center: the ball is in the back's pocket, not at the edge of the QB's reach.

**3. Timing comes from the QB's footwork against the back's tempo.**
- No deadline slows the back.
- If the back is early, the QB's ride is shorter. If the QB is late, the back's track carries him past and the play is a fake (that can be the read-option keep later).

**4. The same parts give the later concepts.**
- **Read option:** the ride is a window on the back's track, during which the QB reads a key and gives or pulls.
- **Jet sweep:** the back's track is a motion man's path at 7 yd/s. The tracking "TRICK" rows are there to check against: UC handoff at 0.7 s, back heading 96°, at 7.2 yd/s.

## Steps, one at a time, each paired on the matched restage with this table

1. **Gun:** the back's track crosses in front of the QB (exchange 0.5 yd in front; −0.2 lateral for the stretch and pull, −0.6 for IZ, power and trap). He keeps his tempo, and the QB rides about 1 yd/s toward him.
2. **Under center:** concept-specific drops (depth 4.3–4.8; lateral per concept, counter and power away), and the QB keeps moving through the exchange.
3. **Pistol stretch:** the QB opens play side like the under-center stretch.
4. **Ride and read window:** the hook for read option and jet sweep.

## Acceptance

- The mesh table per alignment and concept: QB speed, depth and lateral, the back's position from the QB, separation, and the back's speed and heading.
- The back's width at 3/2/0 yd off the line, and his lateral speed at 0.5/1.0/1.5 s.
- Yards, ≤0 and 10+ by alignment.
