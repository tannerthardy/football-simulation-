# Pursuit, coverage and yards after catch

Why the sim gives up so many long catch-and-runs, what was changed, and what
is left. Every number compares the sim with NFL tracking using the same
measurement code (`scripts/mechanics/metrics.py` and the scripts in
`scripts/diag/pursuit/`). NFL is 2022 (BDB 2025), with 2017 (BDB 2019) shown
where it matters. The sim is two 8-game samples, seeds 101 and 202.

## Is YAC where the scoring comes from?

Mostly, yes. In a 4-game breakdown at the starting code, completions averaged
about 13 yards after the catch and 8 air yards (NFL roughly 5 and 6). About
three quarters of the extra passing yardage is YAC.

| Per completion | Sim (start) | NFL 2022 |
|---|---|---|
| YAC median / 90th pct | 4-5 / 32-48 | 3 / 12.5 |
| Completions with 30+ YAC | 11-16% | 1% |
| YAC share of completion yards | 0.58-0.62 | 0.46 |

The sim also throws far more (about 110 passes a game for both teams), which
is play calling and the QB's read, not pursuit.

## Is the QB too accurate?

No. A receiver catching in stride is not the problem; the problem was the
opposite.

- Receiver speed at the catch: sim 4.3 yd/s, NFL 4.8.
- How far the receiver had to leave his course at the throw to make the catch:
  sim 1.7-1.9 yd median, NFL 1.2-1.35. Sim receivers were adjusting *more*.

The cause was the receiver's ball-tracking controller, not the QB. It sent the
receiver to the *earliest* point on the flight he could reach, at just enough
speed to get there, and then had him brake to wait. He slowed through the
whole flight (5.5 to 4.2 yd/s; NFL receivers hold 6.3-6.6) and then sprinted
again after the catch.

## What breaks down after the throw

The nearest defender to the target at the throw (within 3 yd), through the
flight:

| | Gap at throw | Gap at arrival | Defender speed throw / arrival |
|---|---|---|---|
| NFL 2022 | 1.77 | 1.50 | 5.1 / 6.4 |
| Sim (start) | 1.4-1.75 | 2.0-2.5 | 4.1-4.3 / 3.8-4.0 |

NFL defenders accelerate through the flight and close. Sim defenders do not,
so the receiver catches it with more room. After the catch:

- Pursuers that get within 1.5 yd of a long-YAC carrier: sim about 1 per play,
  NFL 2.1-2.4. Within 3 yd the counts are similar, so pursuers arrive but
  don't finish.
- Near misses from behind: sim 67-69%, NFL 33%. The carrier is running
  5.7-6.0 yd/s at a sim near miss, 3.0 in the NFL.
- Contact on a catch that the carrier breaks (still 4+ yd/s and 5+ more
  yards): from the side, sim 30-41% vs NFL 8%; from behind on a fast carrier,
  sim 44-53% vs NFL 23%.

Ruled out:

- **Physical capacity.** DBs' and WRs' turning and speed-up accelerations
  (p75, p95, p99 by speed band) match the NFL within a few tenths of a yd/s².
  Bodies can do it; controllers don't ask for it.
- **Coverage tightness at the catch.** The nearest defender's median distance
  is 2.6-2.85 yd in the sim and 2.87 in the NFL.

## Changes on this branch

1. **Pursuit angle: no systematic lean behind the runner**
   (`src/sim/behaviors/common.ts`). `pursuitPoint` subtracted a fixed
   (1 - pursuit) x 0.3 s from the intercept time on top of its random angle
   error, so every average pursuer aimed at where the carrier had been. The
   delayed perception of the carrier already supplies lag. The angle error is
   kept as zero-mean noise scaled by the pursuit rating.
   - One contract test asserted the resulting backward command sign. It now
     checks the braking intent instead (`test/back-man-run-fit.test.ts`).
2. **In-stride catches** (`src/sim/behaviors/receiver.ts`; on the stacked
   branch `claude/in-stride-catch`, not on `claude/pursuit-coverage`). The receiver
   takes the catchable point on the flight closest to where his current
   running line puts him, and steers by how far that line misses the ball.
   A led ball needs no change; a short one makes him throttle down or come
   back.

| Seeds 101 + 202 | NFL 2022 | Start | Angle only | Angle + in-stride |
|---|---|---|---|---|
| Points per team | ~22 | 55.9 | 47.5 | 68.1 |
| Completions with 30+ YAC | 1% | 11-16% | 7-11% | 16-18% |
| YAC 90th pct | 12.5 | 32-48 | 22-37 | 46-50 |
| Pursuers within 1.5 yd of a long run | 2.1-2.4 | 1.0 | 1.1 | 0.8-1.0 |
| Receiver speed at catch | 4.8 | 4.3 | 4.3 | 4.85-5.15 |
| Course deviation to the catch | 1.2-1.35 | 1.7-1.9 | - | 1.04-1.10 |

The angle fix is the scoring gain: 56 to 47.5 points per team, with fewer
long catch-and-runs on both seeds. It is on `claude/pursuit-coverage`.

The in-stride change makes receivers correct: catch speed and course
deviation now match the NFL. That also makes them harder to tackle, and with
the defense still losing ground in the air, scoring rises to 68. It is kept
on its own stacked branch, `claude/in-stride-catch`, to land together with
the pre-throw coverage fix below. It belongs in the engine; the answer to the
extra yards is fixing the defense, not keeping receivers slow.

## Tried and dropped

Each was measured on both seeds and removed:

- **Full-effort rally** for pursuers more than 12 yd away. Their speed share
  barely moved (0.61 to 0.62-0.64 of top speed). Effort is not what caps them.
- **Looser in-flight breakdown** (arrive at 4.5 yd/s instead of 2.2-4.7). The
  close defender's loss in flight went from -0.9/-0.6 to -0.6/-0.5 yd; NFL is
  +0.1.
- **Close on the receiver in flight.** Two versions: relative-speed arrival on
  the receiver's body, then a straight sprint at the catch point with the
  breakdown applied only to speed relative to the receiver. Defenders were
  commanded about 8.5 yd/s but gained only 0.7 yd/s in 0.7 s, because the
  command was 35-45 degrees off their current path and the turn used the
  traction. No change in the flight gap.

## What to do next

1. **Coverage before the throw (biggest coverage lever).** At the throw, sim
   defenders near the target are slower (4.5 vs 5.2 yd/s) and less aligned:
   the turn they need to head for the catch point is a median of 28-33
   degrees (NFL 20), 69-84 at the 75th percentile (NFL 43). Trail and
   underneath technique should run with the receiver's stem so a break on
   the ball is a small turn, not a re-route. Check with
   `throw_alignment.py` and `flight_profile.py`.
2. **Tackles that slip on fast carriers (biggest YAC lever).** The grasp in
   `src/sim/tackle.ts` breaks ("hold slipped") on side and behind contacts
   with fast carriers several times as often as the NFL proxy. This is
   tackling physics (open task: missed/broken tackles) and should be checked
   as a physics law first: grip force against the carrier's momentum at
   contact.
3. **Late ball adjustment.** With in-stride catches, the share of catches
   with under 15 degrees of heading change in the last 0.5 s overshoots
   (0.80-0.84 vs NFL 0.68). The receiver now spreads his correction over the
   flight; real receivers find the ball late. A tracking delay that grows
   with distance and shrinks with the ball-tracking rating is the
   coherent fix.
4. **Pass volume.** About 110 pass plays a game for both teams is a
   play-calling and QB-read question, separate from pursuit.

## Reproduce

```sh
scripts/diag/pursuit/ab.sh LABEL [ENV=VAL ...]   # both seeds -> out/pc/LABEL-{101,202}; or directly:
node --import tsx scripts/mechanics/sim-export.ts --seed 101 --games 8 --out out/pc/x-101.jsonl.gz
python3 -I scripts/diag/pursuit/after_catch.py sim=out/pc/x-101.jsonl.gz nfl=out/mechanics/nfl-plays.jsonl.gz
```

Each script in `scripts/diag/pursuit/` takes `LABEL=path.jsonl.gz` arguments
(sim or NFL common-format plays) and prints one comparison. NFL plays come
from `npm run mech:nfl` (needs the raw archives); sim plays need nothing.
