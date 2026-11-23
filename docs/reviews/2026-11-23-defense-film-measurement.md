# The defense's assignment on film: NFL against ours (Flex, 2026-11-23)

Integration's assignment from the user's film room (docs/reviews/2026-11-18-film-room-notes.md): pre-snap
alignment and run fits by coverage, disguise, motion, whether play action draws defenders too far, and blitzers
stopped in traffic. Measurement only. No build.

**Operator.** One operator reads both sides in one per-play format:
- NFL: BDB 2025 weeks 1-2 (3,703 plays: 1,386 runs, 659 play action).
- Ours: develop 0226f0d3 (engine-91, frozen), eight whole games. Seeds 101-108, generated teams at strength 0.55,
  leagueSample: 1,055 plays (335 runs, 174 play action).
- Scripts: `scripts/diag/defense-film/` (`nfl-defense-film.py`, `sim-defense-film.mts`, `defense_film.py`).

**Seats.** Seats are classed by geometry on both sides, not by labels:
- a DB 8+ yd deep is a deep safety;
- other DBs sit over the nearest receiver laterally: a corner over the widest, a slot defender otherwise;
- a box backer is an LB 2-8 yd deep within 6 yd of the ball.

**Labels.** The labels used are the coverage family (NFL: PFF), man / zone, run / pass, play action, the motion man
and the blitzers.

**Flag.** `<<` marks a sim median more than half the NFL's interquartile range from the NFL median.

**Cards.** Rules' coverage cards (rules/coverage-cards fdadf554) are cited where their rows are high confidence.

## Tables

### 1. Alignment at the snap (p50 [p25, p75], yd; leverage + = inside the receiver)

Where ours differs beyond the NFL's spread:

| family | seat / measure | NFL | ours |
|---|---|---|---|
| Cover 0 | box backer depth | 3.91 [3.30, 4.54] | **2.40 [2.40, 2.40]** |
| Cover 0 | box count | 5 [5, 6] | **6 [6, 7]** |
| Cover 0 | corners pressed (cushion < 2.5) | 25-50% (p75 = 1) | **p50 = 1** |
| Cover 0 | deep safety depth | 9.72 [8.85, 10.95] | **11.53** (n 6) |
| Cover 1 | slot leverage | **outside** −0.33 [−0.81, 0.11] | **inside** +0.17 [−0.21, 0.77] |
| 2-Man | corner cushion | 2.63 [2.19, 4.45] (n 49) | **6.43 [2.27, 6.74]** |
| 2-Man | slot cushion | 3.62 [2.55, 4.52] | **6.48 [5.64, 7.20]** |
| Cover 2 / Cover 4 | box count | 5 [4, 5] | **4 [4, 5]** |

Everywhere else ours sits inside the NFL's spread. That covers corners' cushion and leverage in Cover 1 / 2 / 3 / 4 /
6, safety depth and width in every two-high and one-high family, the safeties' split and box backers' depth.

Ours is much narrower than the NFL's: the interquartile ranges are often a third as wide or less (Cover 3 corner
cushion [6.11, 8.13] against [3.83, 7.91]). The defense aligns the same way every snap.

Quarters against the card (high confidence: safeties 10-12 yd on the inside eye of #2, corners 7-8 yd with outside
leverage):
- safeties: ours 11.58, NFL 12.09;
- corner cushion: ours 7.89, NFL 7.42;
- leverage: ours −0.57 outside, NFL −0.77.
Both sides are on the card.

### 2. Disguise: shell shown at the snap → coverage played (pass plays)

Shown: two-high means two DBs 9+ yd deep, 8+ yd apart. Played is the coverage label.

| | NFL (2,188) | ours (720) |
|---|---|---|
| two-high shown, two-high played | 35.1% | 28.5% |
| one-high shown, one-high played | 32.1% | 34.4% |
| **rotate down** (two-high shown, one-high or zero played) | **19.7%** | **18.5%** |
| **rotate back** (one-high or zero shown, two-high played) | **7.2%** | **10.1%** |
| zero shown | 5.3% | 10.0% |

The user's rule holds in both: defenses show two-high and rotate down; showing one-high and rotating back is
rarer. Ours rotates down at the NFL rate and rotates back a little more often (10% against 7%). F08 (quarters shown
single-high) is a 7-10% event in both, not a systematic fault.

The sim's own call: rotation from a two-high look on 67 of 720 (9%). The rest of the measured "rotate down" is a
shell the geometry reads as two-high: a deep safety the coverage then spins down.

### 3. Motion (one motion man moving 3+ yd across)

Lock: a defender moves at least 0.6 of the motion's width and ends within 3 yd of the motion man. Bump only:
defenders shift 0.5+ yd with it, nobody locks.

| | NFL man (244) | ours man (93) | NFL zone (742) | ours zone (250) |
|---|---|---|---|---|
| lock | 56% | 65% | 17% | 18% |
| bump only | 43% | 33% | 82% | 72% |
| nobody moves | 1% | 2% | 2% | **10%** |
| a deep safety rotates (2+ yd) | **35%** | **9%** | **39%** | **10%** |
| defenders moving with it (p50) | 3 | 2 | 3 | 2 |

Pre-snap collisions between defenders (centres under 0.6 yd at any pre-snap frame):

| NFL | ours |
|---|---|
| **34 of 3,702 plays (0.9%)** | **88 of 827 plays with a pre-snap phase (10.6%)** |

That is about twelve times the NFL rate. It is F05, and it is a pattern, not one play.

### 4. Play action: depth change from the snap (yd, − = toward the line), p50 [p25, p75]

| seat | | NFL | ours |
|---|---|---|---|
| box backer, straight dropback | 1.5 s | 0.33 [−0.97, 1.15] | **1.21** [−0.20, 1.98] |
| | 2.5 s | 1.16 [−1.41, 3.00] | **2.99** [−0.12, 4.54] |
| box backer, play action | furthest step in by 1.5 s | −0.98 [−1.77, −0.36] | −1.22 [−1.91, −0.45] |
| | 1.5 s | −0.96 [−1.77, −0.22] | −1.22 [−1.90, −0.45] |
| | 2.5 s | −0.42 [−2.25, 1.35] | −0.57 [−1.94, 0.83] |
| | speed back, 1.5-2.5 s (yd/s) | 0.60 | 0.46 |
| deep safety, play action | 1.5 s / 2.5 s | 1.59 / 4.36 | 1.33 / 3.87 |
| deep safety, straight dropback | 1.5 s / 2.5 s | 1.64 / 4.11 | 1.70 / 4.24 |

Play-action deficit against straight dropbacks:

| | at 1.5 s | at 2.5 s |
|---|---|---|
| NFL box backers | −1.29 | −1.58 |
| our box backers | −2.43 | −3.56 |
| NFL safeties | −0.05 | +0.25 |
| our safeties | −0.37 | −0.37 |

### 5. Run fits by coverage (runs with a carrier)

At the carrier's arrival at the line: lanes are the six A / B / C gaps from the OL at the snap; a lane is filled
when a defender is within 1 yd of it laterally and 3 yd deep.

| family | unfilled lanes (of 6) NFL / ours | nearest defender at the line NFL / ours | time to the line NFL / ours | safeties to the carrier at 1.5 s NFL / ours |
|---|---|---|---|---|
| Cover 1 | 2 / 3 | 1.67 / 1.79 | 2.2 / 2.1 | 18.2 / 16.3 |
| Cover 3 | 3 / 2 | 1.70 / 1.83 | 2.3 / 2.1 | 19.3 / **16.1** |
| Cover 2 | 3 / 2 | 1.63 / 1.92 | 2.3 / **2.0** | 20.6 / **17.6** |
| Cover 4 | 3 / 2 | 1.77 / 1.76 | 2.3 / **2.0** | 17.1 / 15.8 |
| Cover 6 | 3 / 2 | 1.90 / 1.97 | 2.4 / 2.3 | 20.0 / 17.4 |
| Cover 0 | 2 / 2 | 1.27 / 1.25 | 2.2 / 2.3 | (n 14 / 0) |

Deep safeties reach 5 yd from the line by 3.5 s on under a quarter of runs in both (p50 "never").

### 6. Blitzers stopped by a non-blocker (F15)

A blitzer here is an LB or DB 2+ yd off the ball who rushed. He counts as stopped when he comes within 0.8 yd of an
offensive player who is not blocking and is under 1.5 yd/s 0.3 s later.

| NFL | ours |
|---|---|
| **2 of 645 (0.3%)** | **9 of 198 (4.5%)** |

That is about fifteen times the NFL rate.

## What it says

1. **Alignment is mostly right and too uniform.** Every one-high and two-high family's corners and safeties sit
   inside the NFL's spread, and quarters matches the card. What differs:
   - Cover 0: a fixed backer depth (2.40 on every snap) and one more man in the box;
   - 2-Man: corners and slot defenders sit off (6.4 yd) where the NFL presses or trails tight (2.6);
   - Cover 1: the slot defender is inside his man where the NFL is outside;
   - Cover 2 / 4: one fewer in the box.

   The spreads are a third of the NFL's, so offenses face one alignment per call.
2. **Disguise is NFL-like.** Ours rotates down from two-high 18.5% of the time (NFL 19.7%) and rotates back 10% (NFL
   7%). F08 is an ordinary event, not a habit.
3. **Motion is where ours is wrong.**
   - Deep safeties rotate with motion a quarter as often (9-10% against 35-39%).
   - In zone, nobody moves on 10% of motions (NFL 2%).
   - Defenders run into each other before the snap twelve times as often. The bodies colliding are mostly the
     second level crossing while someone follows motion: NB with SS, the Mike with SS or NB. There is also a Cover 0
     cluster at the snap, where the end overlaps a mugged backer or safety.
4. **Play action does not draw our backers further than the NFL's.**
   - Their furthest step toward the line by 1.5 s is −1.22 yd (NFL −0.98), and they stand −0.57 at 2.5 s (NFL
     −0.42). Their recovery is slightly slower (0.46 against 0.60 yd/s back).
   - What differs is the other side of the comparison: on straight dropbacks our box backers drop three times as
     deep (1.21 against 0.33 yd at 1.5 s; 2.99 against 1.16 at 2.5 s).
   - So the play-action deficit against a dropback is twice the NFL's (−2.4 / −3.6 against −1.3 / −1.6) because the
     dropback is deeper, not because the bite is bigger.
   - If play action "looks too effective", the place to look is where the zone landmarks are (how deep a backer must
     be to defend the window behind him) and what keys a defender (F68's back who neither blocks nor runs), not the
     size of the bite.
   - Safeties are NFL-like on both.
5. **Run fits are not weaker than the NFL's by these operators.** Ours leaves 2 lanes unfilled against the NFL's 3,
   has a defender as close to the carrier at the line, and our safeties are closer at 1.5 s. Runs reach the line
   about 0.2-0.3 s sooner in ours.
6. **F15 is a pattern.** A blitzer is stopped by a non-blocker 15 times the NFL rate, mostly safeties and backers on
   a back, fullback or tight end in the route.

## What was checked, play by play

- **Motion and collisions:** the first dozen rows per side were read against their samples.
  - NFL collisions: mostly ILB with ILB, and CB with FS / ILB on motion.
  - Sim collisions: NB with SS (13), the Mike with SS (12), the Mike with NB (10), CB_S with NB (7); 76 of the 102
    collision plays had motion.
- **Run fits:** a dozen rows per side, with play id, family, unfilled lanes, nearest defender and time.
- **Blitzers:** every stopped case (NFL 2, ours 9).
- **Seat classes (corner / slot / safety / box by geometry), against the labels, all plays and a dozen per side:**
  - Ours: corners are CB_W / CB_S (96%); slot defenders NB / SS; safeties FS / SS; box backers LB_M / LB_W.
  - NFL: corners are CB 88%; box backers ILB / OLB / MLB.
  - The check found one fault, now fixed. A DB 8+ yd deep was counted as a safety even when he was the outermost
    defender on his side, i.e. a deep corner. That was 21% of the NFL's "safeties" (9% of ours), and a corner was
    among the deep DBs on 25% of the NFL's two-high reads (9% of ours).
  - Now a deep DB who is the outermost defender on his side is a corner. The NFL safety seat is 97% FS / SS. A first
    fix (within 3 yd of the widest receiver) took safeties for corners in compressed sets and was replaced.
  - The disguise table, the quarters numbers and the safeties' run-support column above are from the fixed rule. The
    conclusions did not change.

## Caveats

- **Coverage on runs:** coverage labels on NFL runs are PFF's; on ours, the call.
- **Gap fill:** "filled" is geometry (a body near the lane), not a fit that holds the block.
- **2-Man's NFL sample is small:** 49 corners.
- **F68 not measured:** the backs-who-neither-block-nor-route key is not measured here. It needs the defenders'
  keys, which Rules' cards now list (row 2).
