# Perimeter run support on run-only film

Coverage lane, run-game week. Three questions on #329's run-only film:
why receivers' stalk blocks trip the "blocker on a man who is out of the play"
detector; how defensive backs support outside zone and toss compared with
the NFL; and which stage first goes wrong. Diagnosis only: no engine change,
so no restage.

Built on #329 (run-only harness, `run-film-trace.ts`, NFL loaders). NFL:
BDB2025 common plays (2022 season), 1,641 outside zone runs. Sim: run-only
film, seeds 7, 9, 11 and 13, 2 games each.

## 1. Stalk events: why they fire

`scripts/diag/stalk-causes.py` on `npm run weird -- 11 --games 2 --run-only --all`
and `run-film-trace.ts 11 --games 2` (same play ids). The detector fired 239
times on seed 11; 88 of those are receivers on stalk blocks (65 plays).

| Cause | 20-event sample (first per play) | All 88 |
| --- | --- | --- |
| Receiver stays on a defender who left coverage for the run | 0 | 3 |
| Defender still in coverage, man or zone, retreating with the receiver; no contact | 19 | 73 |
| Block in contact (a driven defender, not a missed one) | 1 | 12 |

- **The receiver is not the problem.** In 73 of 88 the "far" defender is a
  corner, nickel or safety still in his coverage controller, bailing with the
  receiver who is running at him. That is a stalk doing its job: the defender
  is out of the play because the receiver took him there. Only 3 are a
  receiver left on a man who has gone to the run.
- **The detector's "free" defender is mostly a lineman in the backfield:** a
  rushing DL in 54 of 88 (4 of them actually engaged), a coverage defender in
  31. The runner is at or behind the LOS in 76 of 88 (median 3.1 yd behind).
  No receiver can reach a 3-technique in the backfield; the event is real
  football going wrong, but the blame lands on the wrong blocker.
- So this detector mostly re-reports interior penetration (the stuffed
  trap/draw/power runs #329 found), not perimeter blocking. A refinement for
  Tools to consider: don't count a blocker whose man is still in coverage
  while the runner is behind the LOS, and require the free defender to be
  one that blocker could have reached.

## 2. DB run support on outside zone and toss

`scripts/mechanics/run_perimeter_support.py` (position-only, both sources).
The edge: the carrier 1.5 yd outside the widest lineman before he is 4 yd past
the LOS. The force player: at that moment, the defender nearest him among
those level with or outside him on the playside. Defender classes from snap
spots: DB 8+ yd wide = corner, other DB 7+ yd deep = safety, other DB = nickel.

| Outside zone | NFL (1,404 reached the edge) | Sim OZ (241) |
| --- | --- | --- |
| Reached the edge | 86% | 79% |
| Edge time (from the snap) | 1.9 s | 2.4 s |
| Force player | DL 65%, LB 29%, nickel 3%, corner 2% | DL 45%, LB 34%, corner 12%, nickel 8% |
| Force depth, p50 | −0.18 yd | +0.77 yd |
| ...LB force depth | −0.32 | +1.44 |
| ...corner force depth | +1.36 (n 24) | +2.84 (n 28) |
| Force squeezing the edge (outside him, ≤ 3 yd deep) | 81% | 68% |
| Force unblocked | 12% | 30% |
| First defender to the runner after the edge | DL 50%, LB 37%, DBs 13% | DL 37%, LB 31%, DBs 27% |

Toss alone is too small to read (26 runs).

DB movement from the snap, outside zone, playside:

| | NFL | Sim |
| --- | --- | --- |
| Corner: downfield speed at 1.0 / 2.0 / 2.5 s | 1.0 / 0.65 / 0.1 | 0.8 / −0.05 / −0.8 |
| Corner: starts downhill (faster than 1 yd/s) | 2.1 s | 2.0 s |
| Safety: starts downhill | 1.8 s | 1.4 s |
| Nickel: downfield speed at 0.5 / 1.0 / 1.5 s | −0.4 / −1.0 / −1.25 | +0.4 / −0.4 / −0.4 |
| Nickel: starts downhill | 0.8 s | 1.2 s |
| Nickel depth at 2.0 s | 2.24 yd | 3.98 yd |

- In the NFL the edge is set by a blocked lineman or backer near the line,
  and defensive backs rarely force. Ours force four times as often, from
  deeper, and the force is unblocked two and a half times as often.
- Corners and safeties move about like the NFL's in the first two seconds;
  our safeties come down earlier. The playside nickel is the exception: he
  backs up at the snap and triggers 0.4 s later than the NFL's.

## 3. The first wrong stage: the back's track to the edge

`scripts/diag/oz-mesh-track.ts` and the same loaders:

| Outside zone | NFL | Sim |
| --- | --- | --- |
| Handoff | 1.3 s | 1.05 s |
| Carrier's lateral offset at the handoff | 2.72 yd | 0.96 yd |
| Handoff to the edge | 0.5 s | 1.4 s |
| Lateral speed, handoff to edge | 4.58 yd/s | 2.65 yd/s |

Inside the sim, seed 11 (23 OZ/toss runs), the back's playside lateral speed:

| | 0.3 s | 0.6 s | 0.9 s | 1.2 s | 1.5 s | 1.8 s |
| --- | --- | --- | --- | --- | --- | --- |
| Requested | 6.4 | 6.1 | 5.5 | 4.3 | 4.7 | 5.4 |
| Achieved | 1.1 | 1.9 | 1.5 | 2.3 | 2.0 | 2.9 |

- The back takes the ball almost square: the gun mesh point is 0.9 yd outside
  the ball (`meshPoint` in `src/sim/assign.ts`), approached on a timed pace
  that brakes into it, and only after the exchange does he turn the corner.
- Through the mesh his body achieves a third to a half of the lateral speed
  he asks for. The parked `GAIT_STEP=0.3` start doesn't change that (1.3–1.8
  yd/s achieved at 0.3–0.9 s), so it isn't only the start model.
- He reaches the edge 0.5 s late. By 2.4 s the corners and safeties have come
  down, which is why DBs force and fill twice as often, from deeper.

**So the first wrong stage on the perimeter is the backfield track, before any
DB acts.** The DB-specific difference, the nickel triggering late, is real but
second: force and alley geometry depend on when the runner gets there, so
judging DB support before the track is fixed would tune the defense to a late
runner.

## Not proposed here

- No DB change until the track is fixed. Then re-measure the force table; the
  nickel's 0.4 s late trigger is the first DB question.
- The mesh point and the back's achieved-vs-requested speed through the mesh
  belong to the run game owners (`RunnerToMesh` in `src/sim/assign.ts`, and the
  body's start). The first question: why does a back requesting 5–6 yd/s
  playside achieve 1–2 yd/s for a full second.
- The detector refinement above is Tools'.
