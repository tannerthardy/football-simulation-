# Trench timeline: where runs lose the line, by concept

Measurement correction (2026-10-12): requested timestamps now require `Play.live(t)` before clamped frame lookup; velocities stop at the last live frame, short plays retain their early samples, and every metric reports sample counts. First-block endings at the last available frame are flagged as censored. The exact late-time figures below are historical and must be recomputed on the original cohorts before use; the original NFL and 16-game inputs are not present in this workspace.

`scripts/diag/trench/timeline.py` applies one operator to NFL tracking (2022,
BDB 2025 with PFF concepts) and sim exports (16 games, `claude/live-gaps` at
`ff973ff`: physical shed, stalk ledger). Play side is the carrier's lateral
direction from the snap to crossing the line, measured the same way on both.
"Engaged" is the shared 1.5 yd proximity rule. Medians; quartiles are in the
script output.

```sh
python3 -I scripts/diag/trench/timeline.py out/mechanics/nfl-plays.jsonl.gz out/rb/LABEL-101.jsonl.gz out/rb/LABEL-202.jsonl.gz
```

## What already matches

- Handoff timing (1.05-1.3 s sim vs 1.2-1.3 s NFL).
- Engaged DL depth in the first second (0.7 / 0.4 yd past the line at
  0.5 / 1.0 s, NFL 0.6-0.7 / 0.3-0.5).
- Inside zone over three seconds: DL depth 1.2 vs 1.37 at 3 s.
- Duo's vertical drive (DL driven back 2.1 yd at 3 s, NFL 1.4).
- Number of double teams (about 2 per run on both).
- Free (unengaged) OL lateral speed: outside zone 2.0 vs 2.5, inside zone
  1.5 vs 1.25 yd/s.

## What does not

**1. Engaged pairs do not move sideways.** OL lateral speed while engaged,
0.5-2.0 s:

| | Sim | NFL |
|---|---|---|
| Outside zone | 1.0 | 3.0 |
| Inside zone | 0.5 | 1.25 |
| Gap/pull | -0.25 | 0.5 |

Free linemen are close to NFL; the deficit is in contact. Lateral flow at
1.5 s: outside zone OL 1.4 / DL 0.7 / LB 0.85 vs NFL 3.4 / 2.8 / 3.0.

**2. The defense does not start moving sideways.** At 0.5 s on outside zone
the sim DL and LB have moved 0.00 yd laterally; NFL 0.33 and 0.25. On gap
runs the sim linebackers never flow (0.0 at 2.0 s, NFL 2.45) and the DL drift
away from the play (-0.4 at 2.0 s, NFL +0.8).

**3. Pullers are late.** Same handoff time (1.3 s), but:

| Puller | Sim | NFL |
|---|---|---|
| Lateral at 0.5 / 1.0 / 1.5 s, yd | 0.1 / 0.9 / 2.2 | 0.5 / 1.8 / 3.6 |
| Peak lateral speed, yd/s | 3.0 | 3.75 |
| Time to the point of attack, s | 2.4 | 1.9 |
| Pullers per gap run | 1.07 | 1.88 |

A puller who arrives 0.5 s after the NFL one meets a defense that is already
there; this alone can break power, counter and trap.

**4. Blocks on lateral schemes lose late.** Engaged DL depth at 3 s:
outside zone -0.2 vs NFL +1.0; gap/pull +0.2 vs +1.0. First block duration on
gap runs 1.4 s vs 2.3 s (down blocks come apart early). Inside zone and duo
are fine, so this is about blocking while moving sideways or at an angle,
not drive blocking.

**5. Doubles start early and stay too long** on outside zone (1.8 s vs 1.1)
and duo (2.4 vs 1.7). Inside zone matches (1.4 vs 1.5).

## Implications

- The largest shared problem is lateral motion in contact (1) and the
  defense's lateral start (2). Both touch every run family.
- Gap schemes have their own timing failure: pullers (3). This is a
  controller and footwork question first (first step, pull depth, tempo).
  It is not evidence for more speed.
- (4) and (5) belong with run blocking.
- None of this is a reason to tune toward these numbers. Each is a place to
  look on film.
