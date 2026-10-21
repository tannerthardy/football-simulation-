# Pre-snap geometry: where everyone lines up

User priority (2026-10-21): fix where players line up before the snap first,
offense and defense, before more run-game tuning. Players put their feet in
the best spots they can before the snap; a step from the right spot can be
the difference between making a block and being washed out. Results tuned on
an unrealistic base are tuned to the wrong thing.

Alignment must come from scheme: the front or protection called against the
look the opponent shows, the player in the spot and the situation. It is not
a set of base values to hit. Defensive alignments are especially variable and
move with trends (below: edges widened between 2017 and 2022), so tracking is
a catalog of what teams do, not a target.

Split of the work (user): the run-defense session owns defensive alignment
(`alignDefense` techniques, depths, widths and adjustments) and the defensive
caller's front and check choice by offensive look; this session owns
offensive alignment (line splits and depths by scheme and situation, ends
and backs) and the shared measurement below.

## Operators (one code path for 2017 and 2022 tracking and sim exports)

- `scripts/diag/align/fronts.py FILE --kind run|pass|all`: each snap's front
  classified from its shape: technique per blocker (0, 1, 2i, 2, 3, 4i, 4, 5;
  over an end 7, 6, 9; outside the last blocker `6g` ghost or `w9` wide nine),
  edge per side, interior shape, front count, backers, deep safeties; counted
  by offensive look (gun/under center, inline ends, backs), down, distance,
  season and, in sim exports, the called front.
- `scripts/diag/align/olsplits.py FILE`: line splits and depths by concept,
  play side, situation and team.
- `scripts/diag/align/presnap.py FILE`: one-line summaries (box, front and
  backer depth, edge width, outside DB depth).
- `scripts/mechanics/sim-export.ts` now records the called front, defensive
  personnel and formation in each play's `cell`.

## The offensive line: one fixed set vs set by team and situation

| Runs | width tackle to tackle | C-G / G-T split | depth G / T |
|---|---|---|---|
| NFL 2022 (5,880) | 6.18 [5.95, 6.45] | 1.54 / 1.56 | 0.84 / 1.01 |
| NFL 2017 (3,804) | 6.37 [6.12, 6.63] | 1.61 / 1.57 | 0.87 / 0.98 |
| NFL 2022, 1-2 yd to go | 6.00 [5.65, 6.30] | 1.47 / 1.51 | 0.80 / 0.94 |
| NFL 2022 team medians | 5.84 (TEN) .. 6.98 (GB) | | |
| Ours, every snap | 5.20 | 1.30 / 1.30 | flat 0.55 |

The team is the largest source of variation (1.1 yd of width between team
medians), then the situation (short yardage tightens 0.2 yd); concept barely
moves it (zone play-side guard-tackle split 1.61 vs backside 1.53; gap 1.55
both). Guards set about 0.55 yd and tackles 0.7 yd behind the center's
depth, a little shallower in short yardage.

## The defense: NFL fronts by shape, and ours by the front called

NFL runs (2022, 6,222): four men on the line on 50% of snaps, five on 37%
(six or more on 12%); two backers 49%, three 33%; one deep safety 43%, two
38%. Most common interior shapes (weak | center | strong): 2i | | 3 10.5%,
2i | | 4i 7.7%, 1 | | 3 6.4%, 2 | | 3 6.1%, 3 | | 2i 4.1%. The strong
edge over an inline end is a wide nine 46%, a 9 31%, a 6 13%, a 7 4%; with
no end there it is wide (ghost or wide nine) on 88% or more of snaps.

Situation and season move the mix: in 1-3 yd to go, six or more men on the
line rise from 7% to 27% and no deep safety from 2% to 27%; on third down the
bear family rises to 8%. From 2017 to 2022 the 1 | | 3 shape fell from 11.5%
to 6.4% while 2i | | 4i rose from 4.3% to 7.7%, two-deep shells rose 33 ->
38%, and wide edges without an end rose from about 35% to 51-57%.

Our 16-game export (`sim-ps1`, 894 runs), by the front called:

| Called front | strong edge | weak edge | notes |
|---|---|---|---|
| nickel over | 6 56%, ghost 29%, 5 9% | **5 88%** | NFL weak edges are 5 on 1-2% of snaps |
| nickel under | **5 52%, 7 31%** | wide nine 86% | NFL strong edge is 5 on 1%: the end stays uncovered |
| nickel wide 9 | wide nine 83% | wide nine 94% | |
| base 3-4 odd / tite | 9 47% | wide nine 68% | the shapes they claim (odd 95%, tite 99%) |

- Every alignment is one value: defensive linemen 1.15 yd off the ball on
  every snap (NFL 0.92 [0.76, 1.10]), backers 4.85-5.24, outside DBs 6.25.
- The 1 and 3 techniques sit in the middle of the A and B gaps, not on a
  blocker's shoulder; head-up techniques are rare.
- The front is a weighted draw from the defensive personnel, never chosen
  against the formation, the end's side or the backs; the lab's ten looks are
  likewise fixed whatever the offense shows.
- Six or more on the line: 1% of our snaps (NFL 12%).

## Next

- Offense (this session): the line set by a team's split rule and the
  situation, with defensive techniques placed from the actual line (not the
  1.3 yd table); then why the tracked line exposed counter's kick-out and
  zone's 0-3 yd crowding (`OL_ALIGN` notes in `run-offense.md`).
- Defense (run-defense session): technique placement, width and depth per
  front with variation from the player, the call and the situation;
  adjustments to the end's side, wings, trips and motion; the caller's front
  and check choice by look and situation.
- Then re-score the run game on the new base before any more run tuning.
