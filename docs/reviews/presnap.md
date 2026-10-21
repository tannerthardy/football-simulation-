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
| NFL 2022, 1-2 yd to go (any down) | 6.00 [5.65, 6.30] | 1.47 / 1.51 | 0.80 / 0.94 |
| NFL 2022 team medians | 5.84 (TEN) .. 6.98 (GB) | | |
| Ours, every snap | 5.20 | 1.30 / 1.30 | flat 0.55 |

The team is the largest source of variation (1.1 yd of width between team
medians), then the package called for the situation, not the down alone
(tackle-to-tackle width, 2022):

| | heavy (2+ ends or a sixth lineman) | regular personnel |
|---|---|---|
| 1st/2nd down, a yard or less | 5.84 | 6.22 |
| 3rd/4th down, a yard or less | 5.70 | 5.95 (shotgun 6.04) |
| everything else | 6.14 | 6.23 |

A short-yardage package sets tight on any down (I formation 5.63, jumbo
5.97 elsewhere); a must-have yard tightens regular personnel a little.
Averaged over packages, first and second down with a yard to go looked
untightened (6.13) only because half those snaps are regular personnel.
Concept barely moves the line (zone play-side guard-tackle split 1.61 vs
backside 1.53; gap 1.55 both). Guards set about 0.55 yd and tackles 0.7 yd behind the center's
depth, a little shallower in short yardage.

### The tracked line in games (`OL_ALIGN=1`, 16 games each, seeds 301-316)

The first export with the tracked line ended near 14-12: the installed-snap
neutral-zone check flagged the center whenever his body reached the ball's
line, so nearly every snap drew offside on the offense (201 in one game).
The snapper may be over the ball; with that exemption (`presnap-rules.ts`,
no change with the installed line):

| Branch profile, games | installed line | tracked line by team |
|---|---|---|
| Points per game (both teams) | 83.6 | 70.8 |
| Runs: mean / median / losses / 20+ | 8.83 / 4.19 / 11.7% / 10.1% | 8.26 / 3.98 / 8.8% / 7.4% |
| Passes: mean / median / negative | 8.01 / 4.34 / 12.3% | 7.26 / 3.38 / 15.3% |
| Nearest defender to the QB at the throw | 3.86 yd | 2.90 (NFL 2.96) |
| Line depth given at 2 s | 2.90 | 2.48 (NFL 3.04) |

By concept (about 100 runs each, noisy): counter losses 24 -> 15%, trap
11 -> 1%, draw 47 -> 31%, wide zone 11 -> 6%; power 10 -> 15% and inside
zone 4 -> 8%. Scoring stays far above the NFL's (about 44) either way; the
long-run tail is a separate, known problem.

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

## The tracked line as the base (`f5c6c67d`: `OL_ALIGN=1`, `GAP_ACCOUNT=1`)

Lab arms (same bodies, seeds and looks; 400 runs per concept), installed
line `b8` vs tracked line `o8` vs tracked line with gap accounting `p8`:

| Lab arm | gap: losses / 0-3 / 4-9 / 10-19 / 20+ | gap TVD | zone: losses / 0-3 / 4-9 / 10-19 / 20+ | zone TVD |
|---|---|---|---|---|
| NFL, 60+ yd to go | 7.4 / 36.8 / 39.2 / 11.3 / 5.3 | | 7.6 / 44.7 / 36.8 / 8.6 / 2.3 | |
| `b8` installed line | 3.6 / 33.1 / 46.9 / 6.9 / 9.6 | 13.4 | 8.8 / 44.6 / 37.2 / 4.5 / 5.0 | 4.2 |
| `o8` tracked line | 5.8 / 33.9 / 43.1 / 6.3 / 10.9 | 11.0 | 10.4 / 52.4 / 30.8 / 4.0 / 2.4 | 11.5 |
| `p8` tracked + `GAP_ACCOUNT` | 4.8 / 34.1 / 44.2 / 6.1 / 10.7 | 12.4 | 10.2 / 52.8 / 30.5 / 4.1 / 2.4 | 11.7 |

By concept (losses %, median yd), `b8` -> `o8` -> `p8`: counter 6.8 / 4.8 ->
14.0 / 4.6 -> 8.8 / 4.7; power 4.5 / 4.8 -> 6.0 / 4.2 -> 7.2 / 4.3; trap and
duo about unchanged; outside zone 10.5 / 3.8 -> 14.8 / 2.5; wide zone 12.5 /
3.8 -> 13.2 / 2.7; inside zone unchanged. Shotgun zone: inside zone 1.0 /
3.8 -> 6.0 / 3.0; outside and wide zone about unchanged. The gun inside-zone
change is unexplained so far. All arms ran with the source unchanged.
Gap-run TVD is not the criterion: `GAP_ACCOUNT` installs the written
assignments, and its effect is judged by who is left unblocked.

What moved, and why:

- **Assignment windows** were written in yards on 1.3 yd splits. They are
  now measured in the line's own spacing (`c58a310c`; the backside backer
  preference in `f5c6c67d`), so the same blocker takes the same man on
  either line (`test/line-spacing-plans.test.ts`).
- **Counter** lost 14% of carries on the tracked line (6.8% installed). The
  backside end made the first stop on 24 of 56 losses (7 of 27 installed).
  With the wider line, the backside H's nearest man became the 9 technique
  outside him, so the 5 technique in the gap the pullers vacated went free.
  That is the playbook audit's second error, hidden before by the narrow
  line's geometry. `GAP_ACCOUNT` installs gap schemes by the written rules
  ([assignment audit](run-blocking-assignment-audit.md) on PR #191): the
  backside cutoff takes his playside gap first, the lead puller's backer is
  reserved after direct climbs and before doubles, and an idle fullback
  takes the unblocked box man. Counter losses fell to 9.2%
  (`test/gap-account.test.ts`).
- **Outside zone** got worse (under 3 yd on 38% -> 56% of carries; the
  play-side 3 technique first holder 18 -> 41 of 400). The cause is not
  the line. `scripts/diag/align/meshwidth.py` (one code path for NFL and
  sim) shows the tracked line puts the back on the NFL path relative to his
  tackle, while the trench moves sideways about half as far as NFL:

  | Under-center outside zone, after the handoff | NFL (1,189) | installed | tracked |
  |---|---|---|---|
  | back minus play-side tackle, 0 / +0.3 / +0.6 / +1.0 s | -0.32 / +0.94 / +2.15 / +3.54 | +0.25 / +1.47 / +2.48 / +3.65 | -0.25 / +0.92 / +1.94 / +3.13 |
  | play-side interior DL lateral, +0.3 / +0.6 / +1.0 s | +2.97 / +3.87 / +5.00 | +1.14 / +1.62 / +2.42 | +1.39 / +1.99 / +2.80 |
  | play-side guard lateral, +0.3 / +1.0 s | +3.76 / +5.80 | +1.10 / +2.18 | +2.26 / +3.50 |
  | play-side tackle lateral, +0.3 / +1.0 s | +3.49 / +5.42 | +2.32 / +3.71 | +2.79 / +4.26 |
  | DL minus back, +0.3 / +0.6 / +1.0 s | +1.23 / +0.94 / +0.59 | -0.62 / -1.18 / -1.57 | 0.00 / -0.34 / -0.76 |

  NFL linemen on both sides flow 3-6 yd and the back stays inside them. On
  the installed line, a back too wide for his line ran around a trench that
  barely moved; on the tracked line he runs the NFL path into it. The
  missing mechanism is the trench's lateral flow on stretch runs (W1), not
  the alignment. Keeping the old line would tune zone on a base that hides
  it.

## Next

- Offense (this session): the play-side linemen's lateral flow on stretch
  runs (reach and bucket requests vs what the bodies achieve), measured with
  `meshwidth.py`; the defensive linemen's flow is the run-defense
  session's fit controller (numbers sent). Then the called split and depth
  levels on the play call (normal / wide / tight; pass-set depths).
- Defense (run-defense session): technique placement, width and depth per
  front with variation from the player, the call and the situation;
  adjustments to the end's side, wings, trips and motion; the caller's front
  and check choice by look and situation.
- Then re-score the run game on the new base before any more run tuning.
