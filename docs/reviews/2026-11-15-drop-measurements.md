# The drop, measured against the chapter (2026-11-15)

Five measurements the drop design waits on, each beside what
[the handbook chapter](../football-handbook/qb-drops-and-pocket.md) says is coached. One operator for NFL and ours:
`scripts/diag/escape/drop-steps.py` (measurements 1, 2, 3, 5) on BDB 2025 tracking (`out/mechanics/nfl-plays.jsonl.gz`
with `plays.csv`; 5,962 thrown non-designed dropbacks without play action) and on a fresh reference export at
engine-68 with body facing (`EXPORT_FACING=1`, seeds 11 and 23 x 4 games; 517 thrown dropbacks, screens, play
action and designed movement excluded by concept, throwaways out). Measurement 4 is sim-only:
`scripts/diag/escape/drop-reads.ts` + `drop_reads_table.py` (same seeds, 185 dropbacks).

Feet are not tracked and 10 Hz cannot resolve a step. So "per step" is per share of the drop's depth, and the
footwork events come from the body. The plant is the first moment after his fastest backward movement that he is
moving back slower than 1 yd/s. A hitch is a forward movement of 0.3+ yd after the plant.

Operator checks: 12 plays printed per side (`--show 12`), trajectory against labels; all read as labelled.
Two definitions were corrected on that check:
1. The first "top" (his deepest point before the release) made a late drift back impossible by construction. It was
   replaced by the plant.
2. The last-0.6 s row first included plays where the window was still the drop. It now counts only plays planted
   0.6 s or more before the release.
Facing convention: NFL receivers moving faster than 6 yd/s face their travel to a median 22 degrees.

## 1. Drop speed

Backward speed (yd/s, median) as he passes 25 / 50 / 75 / 90% of the depth he reaches, shotgun:

| Drop | NFL | Ours |
| --- | --- | --- |
| 1-3.5 yd (NFL n 3,430; ours 406) | 1.9 / 2.2 / 1.8 / 1.1 | 2.6 / 3.1 / 2.5 / 1.6 |
| 3.5-6 yd (1,933; 74) | 2.6 / 2.9 / 2.4 / 1.5 | 3.0 / 3.3 / 2.4 / 1.1 |

Ours is about 40% faster on the short drops at the same depth. The NFL's drops are deeper: 36% of gun drops reach
3.5 yd or more, ours 15%. Under center we have one dropback in 517 (NFL 363 of 5,962), so there is no row.
The chapter has no measured speed ("we found no source comparing the speed or depth of the two techniques").

## 2. Chest against travel

Median |chest - downfield| / |chest - travel| (degrees) at the same depth shares, shotgun 1-3.5 yd:

| | NFL | Ours |
| --- | --- | --- |
| chest off downfield | 22 / 41 / 55 / 59 | 0 / 0 / 0 / 2 |
| chest against travel | 160 / 139 / 123 / 112 | 180 / 180 / 180 / 180 |

Under center 3.5-6 yd (NFL): 37 / 57 / 68 / 70 off downfield. The chapter: crossover, not backpedal, is the default
for the depth steps; the hips open toward the throw; the thrower carries the ball side-on and squares late.
Ours is a pure backpedal, chest square to the line, because the drop commands `facingDown = 0`
(`src/sim/behaviors/qb.ts`, the drop branch). The physics already prices it: `directionalSpeedFactor` caps speed by
the angle between chest and travel. So opening the hips is a body change with a physical cost and benefit, not a
label.

## 3. The release

| Shotgun | Plant to release p25/50/75 (s) | Speed at release p50 (yd/s) | Released set (< 1 yd/s) / forward / side / back | Hitch 0 / 1 |
| --- | --- | --- | --- | --- |
| NFL 1-3.5 yd | 0.20 / 0.50 / 0.70 | 0.9 | 60 / 8 / 15 / 18% | 85 / 15% |
| Ours 1-3.5 yd | 0.30 / 0.70 / 1.10 | 0.4 | 98 / 0 / 0 / 1% | 71 / 29% |
| NFL 3.5-6 yd | 0.30 / 0.60 / 1.10 | 1.4 | 35 / 16 / 30 / 19% | 69 / 31% |
| Ours 3.5-6 yd | 0.50 / 0.90 / 1.30 | 0.4 | 80 / 3 / 4 / 14% | 81 / 19% |

The chapter: the quick game's ball comes out as the back foot lands with no pause (the punch); the hitch finish sinks
and gathers on the back foot before the ball goes; "reset, not move and throw off one foot".
The NFL thrower is moving at the release more than half the time: still finishing the plant, the hitch, or a reset.
Ours almost always stops first and then throws, 0.2-0.3 s later after the plant. Our hitch is more common on short
drops: that is QB_GATHER's hitch to the read.

## 4. Does the read move with the feet? (ours)

Read changes (the read index moving on) and eye changes (`sim.qbEyes` to a new man, the first placement at the set
excluded) within 0.15 s of a footwork event, against the share of the window such a band covers by chance:

| Drop | n | Chance | Read changes on an event | First change after the plant p50 | Release on an event |
| --- | --- | --- | --- | --- | --- |
| gun5 | 66 | 11% | 29% | +0.40 s | 15% |
| gun3 | 28 | 14% | 33% | +0.30 s | 23% |
| quick | 17 | 14% | 22% | +0.25 s | 7% |
| play action | 32 | 13% | 25% | +0.45 s | 14% |

Of 280 read changes, 202 are on no footwork event. Of the 78 that are on one, 10 are at the plant. At a hitch the
feet came first 22 times and the eyes first 5. At a hitch's end the eyes came first 19 times, which is QB_GATHER's
hitch following his eyes. His reads advance on the dwell clock (0.42 + 0.4 (1 - decision-making) ...), and the
footwork follows the eyes when it follows at all.
The chapter, as installed: read 1 on the plant, read 2 on the first hitch, read 3 on a climb or second hitch; the
ball out on the plant or the hitch.
NFL tracking has no eyes; there is no NFL row.

## 5. The last 0.6 s before the release

Planted 0.6 s or more before the release, nearest defender within 5 yd at the window's start:

| Nearest man | NFL | Ours |
| --- | --- | --- |
| Edge (NFL 10% of dropbacks; ours 10%) | still 19, up 47, across away 27, across toward 7, back 0% | still 15, up 85, away 0, toward 0, back 0% |
| In front / inside (31%; 44%) | still 37, up 20, across away 29, across toward 11, back 3% | still 61, up 29, away 3, toward 0, back 6% |

The chapter: "Edge high, climb. Interior push, slide", small and economical, reset. The NFL climbs the edge and
slides off the interior. Ours climbs both (QB_GATHER and the pocket spring push him up) and almost never moves
across: there is no slide in the default engine. QB_AVOID was two attempts at it and stopped.

## What this changes in the drop design (stage 1: eyes and feet coupled perfectly)

1. The read plan's beats become footwork events: read 1 decided at the plant, the next read on the hitch, a later
   one on a climb or reset. The dwell remains how long a look takes; it no longer moves him on.
2. The throw leaves on a step: on the plant for a rhythm throw, out of the hitch otherwise. The model has no "set,
   then wind up from a stop" in coached football.
3. The drop opens the hips: a crossover side-on drop, chest toward the side of read 1, squaring in the hitch and
   windup. Its pace is his commanded speed under the existing directional cap; the measured backward speeds are the
   check, not a target.
4. Pocket movement inside the footwork: edge, climb; interior, slide one gap and reset, then the next read on the
   reset. This is the slide the default engine lacks, coupled to the read rather than added as a third reflex.
Stage 2 (the coupling's error by experience, decision-making and pressure) is its own flag, after stage 1 is read.
The receiver-speed-at-release witness by route family (Tools' row) is not yet split; it is next with the design.
