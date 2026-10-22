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
3.8 -> 6.0 / 3.0; outside and wide zone about unchanged. All arms ran with
the source unchanged.
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

  Who limits it (`scripts/diag/zone/reach-flow.ts`, play-side guard, tackle
  and end on the lab's outside-zone cases): from the snap the NFL play-side
  guard keeps accelerating sideways (0.55 / 1.72 / 3.23 yd at 0.5 / 1.0 /
  1.5 s; tackle 0.48 / 1.66 / 3.08); ours levels off near 1.6 yd/s (guard
  0.37 / 1.16 / 1.98, tackle 0.39 / 1.50 / 2.44). The deficit builds after
  the first second, mostly while engaged: solo reach, runoff and seal and
  helping blockers request about 2 yd/s and achieve 1.6-1.9, and their
  defensive linemen request 1.6-2.0. A climbing guard requesting motion
  back toward the backside (about a fifth of his ticks then) accounts for
  about 0.25 of the guard's 1.25 yd. A pair's motion resolves both
  requests, so the blocker's tempo alone cannot reproduce NFL flow against
  a man who does not widen. The run-defense session owns the defensive
  lineman's read of the blocker's first step (press and widen on a reach);
  the blocker's tempo on the angle of the back (Ravens OL manual pp. 17-18,
  via the playbook session) is judged after it, on the same operators.
- **Shotgun inside zone** losses 1.0% -> 6.0% (2 -> 12 of 200): 9 of the 12
  are within 1.3 yd of the line, and the two large paired differences are
  chaotic divergences. NFL backs stay about 1.8 yd inside the play-side
  tackle 1.0 s after the handoff; ours drift out to him on both lines
  (installed +0.04, tracked -0.44), and on the tracked line the ends meet
  them there. That is the inside-zone bounce read (R9), not the line.

### Depth set by the call (`OL_ALIGN`)

Concept does not move the line's depth (2022 runs, guard / tackle: zone
0.84 / 1.02, gap 0.87 / 1.02, duo 0.81 / 0.96; Ravens: "we cannot tip run
or pass"). Formation, call and situation do (`olsplits.py --kind run|pass`):

| Guard / tackle depth | runs | passes |
|---|---|---|
| under center | 0.83 / 0.98 | 0.83 / 1.00 |
| shotgun | 0.85 / 1.04 | 0.92 / 1.15 |
| 1-2 yd to go | 0.80 / 0.94 | 0.87 / 1.09 |
| 3rd or 4th and 7+ | 0.93 / 1.10 | 0.97 / 1.18 |

Under center the stance is the same for both; off the ball a pass sets the
tackles about 0.1 yd deeper for the rush. `lineDepth` adds formation, pass
off the ball, passing down and short yardage (every cell within 0.02 yd)
and the caller puts it on the call with the splits.

Games on the current profile (`sim-ps3` at `28c782f3`, seeds
301-316, vs `sim-ps2`, the tracked line before the spacing fix, gap
accounting and called depth): points per game 70.8 -> 66.5; runs median
3.99 -> 4.14, mean 8.20 -> 7.87. Pass protection: the line's retreat by 2 s
2.48 -> 2.30 yd (NFL 3.04) is expected, since the set aims at a fixed point
and a deeper start reaches it sooner; rushers' depth at 2 s is unchanged
(2.90 -> 2.92); nearest defender at the throw 2.90 -> 2.69 (NFL 2.96) and
pressure share 42% -> 46% move within about two standard errors, with
every run play also changed. No isolated pass-protection effect is
claimed.

## The snap: reaction, timing and pre-snap fouls (`SNAP_REACT`, off)

User: "defensive linemen probably react damn near as soon as the offensive
lineman in front of them reacts, and sometimes anticipate snap counts, but
they're not perfectly instantaneous. This is what will ultimately lead to
false starts and encroachment/offsides."

Question: when does a line defender start relative to the man in front of
him, and can early starts produce the pre-snap fouls as represented acts
instead of a rolled flag (`game.ts` `preSnapFoul` returns null "until those
acts are modeled")?

**Measurement.** `scripts/diag/align/getoff-rel.py`: first movement 0.15 yd
from the snap position, each line defender (< 2 yd off the ball, inside the
tackles + 2 yd) minus the offensive lineman nearest him at the snap. The
difference is relative, so it cancels the tracked snap frame's offset (the
tracking snap frame lags the snap by about 0.1 s: 56-63% of linemen of both
sides are already moving in its first 0.1 s, so absolute start-up from the
tracked frame was misread earlier, see `run-offense.md`).

| DL minus the OL in front (s) | p10 | p25 | p50 | p75 | p90 | DL first |
|---|---|---|---|---|---|---|
| NFL 2022 runs | -0.17 | -0.05 | +0.03 | +0.10 | +0.17 | 40% |
| sim before (`sim-ps3`, all plays) | -0.01 | +0.05 | +0.12 | +0.17 | +0.22 | 12% |
| sim `SNAP_REACT` runs (10 games, 301-310) | -0.18 | -0.11 | +0.00 | +0.11 | +0.17 | 49% |
| NFL 2022 passes | -0.24 | -0.11 | -0.02 | +0.05 | +0.12 | 59% |
| sim `SNAP_REACT` passes | -0.18 | -0.12 | -0.04 | +0.06 | +0.13 | 61% |

From his start time a defensive lineman takes 0.25 s to move 0.15 yd and an
offensive lineman about as long (`scripts/diag/align/getoff-probe.ts`), so
the start time alone sets the difference. The old start was one latency,
readiness lag + 0.8 x recognition reaction (about 0.27 s), and no defender
ever anticipated.

**Model** (`src/sim/snap-count.ts`, `PlaySim.planSnapCount`):
- The offense knows its count and goes on it after its readiness lag
  (`SnapMind.snapDelay`, unchanged).
- A defender who does not time the count responds to seen motion (the ball
  or the man in front) after a simple visual response, 0.10 + 0.3 x
  recognition reaction (0.13-0.23 s, the range for athletes and an expected
  single cue), plus his readiness lag.
- A defender on the line may time the cadence instead, going on his own
  estimate (whichever comes first). He aims behind the snap by a margin his
  discipline sets, because going early costs a flag and going late costs a
  step. Error SD is 0.03 + 0.05 x (1 - anticipation). Share is 0.55 + 0.5 x
  anticipation, +0.15 on passing downs. The share is the one parameter set
  from the tracked relative get-off above, never from fouls.
- A hard count (an extra sound a beat, 0.55 s, before the snap; offense
  uses it 10% of snaps, 30% on third or fourth and two or less) can draw a
  timer early (2% + 10% x (1 - discipline)). He stops once he registers that
  the ball did not move (his response + 0.08 s) and tries to get back.
- An offensive lineman may lose a hard count and go on the extra sound
  (0.5% + 3% x (1 - discipline)). A lineman who wants a head start (a tackle
  on a passing down most of all) times the count with a small error.
- Early bodies move before the snap in the same world, on the existing
  pre-snap timeline (the stem/creep loop). A down lineman crowds the ball:
  his helmet and hands set at the line, ahead of the represented torso
  (tracked torsos 0.92 yd off the ball). So any step forward puts him in
  the neutral zone, and his lead across the ball's length (0.31 yd) into
  the man across is contact.
- Linemen across from an early defender may flinch (10% + 40% x
  (1 - discipline)) after their own response.

The rules engine (`presnap-rules.ts`, unchanged rules) classifies the acts:
- An offensive lineman's visible start (> 0.05 s before the snap), or his
  flinch at a defender still on his side, is a false start.
- A flinch at a defender in the neutral zone is a neutral zone infraction.
- Contact is encroachment.
- A defender who started early and is still past the line at the snap is
  offside (live ball).

Dead-ball acts block the snap, and `Game.applyNativePresnap` enforces them
(no play, down replayed). Standing bodies settle by hundredths of a yard
before the snap, so only a man who started early can be offside.

**Fouls** (12 games, seeds 401-412, about 1,700 snaps;
`scripts/diag/align/snap-fouls.ts`), vs NFL 2022 accepted totals per
scrimmage snap
([Pro-Football-Reference](https://www.pro-football-reference.com/years/2022/penalties.htm)):

| Foul | Sim | NFL |
|---|---|---|
| False start | 0.9% | ~1.7% (578) |
| Offside | 1.2% | ~0.4% (139) |
| Neutral zone infraction | 0.7% | ~0.24% (82) |
| Encroachment | 0.6% | not broken out (rare) |

Defensive fouls are about three times NFL. Nearly all come from hard-count
bites, whose propensity is an assumption with no independent evidence; the
foul totals are not used to set it. The offense's false starts are half of
NFL with no crowd noise, silent counts, motion or tight-end/receiver starts
represented.

**Run game** (lab, called looks, control `s08` vs `sr8` on the same commit;
the control reproduces `c8` exactly):

| | Control TVD | `SNAP_REACT` TVD | Notes |
|---|---|---|---|
| Zone, under center | 6.7 | 3.7 | outside/wide-zone losses 11.5/12.8% -> 9.8/9.5% |
| Gap | 9.2 | 7.5 | counter losses 8.8 -> 10.2%, power 7.8 -> 7.2% |
| Shotgun zone | 10.8 | 11.2 | losses 5.2 -> 6.8% (NFL 7.6%) |

The zero-latency diagnostic (`DEF_GETOFF=0`, `dg8`) moves zone and gap the
same way (3.4 / 7.6), so the direction follows the defense starting
earlier. But the operators that would explain it are unchanged at their
medians: outside-zone guard and tackle lateral flow (`meshwidth.py`),
defensive-line wash (`dlwash.py`), linemen's first contact (`olcontact.py`)
and backer fit (`lbfit.py`). The zone shift is about two standard errors in
the largest bins. It is reported as an unexplained shift, not a run-game
improvement.

Contract: `test/snap-count.test.ts`: fouls follow the represented acts,
standing men are never offside, and reactors never start before 0.1 s.

Reproduce:

```sh
python3 scripts/diag/align/getoff-rel.py out/mechanics/nfl-plays.jsonl.gz --kind run
EXTRA="SNAP_REACT=1" node --import tsx scripts/mechanics/sim-export.ts --seed 301 --games 10 --out out/snap/sr1.jsonl.gz
python3 scripts/diag/align/getoff-rel.py out/snap/sr1.jsonl.gz --kind run
node --import tsx scripts/diag/align/snap-fouls.ts 401 4   # with SNAP_REACT=1 in the environment
node --import tsx scripts/diag/align/getoff-probe.ts iz,power,oz,duo 77,1,2,3,4
bash out/runarms-call.sh sr8 "SNAP_REACT=1" zone gap gun   # arm.mjs with --looks call1..call10
```

Open:
- Hard-count bite propensity (sets the defensive foul rate).
- Crowd noise, silent count and offensive motion as false-start sources.
- The defense's legal pre-snap movement (stems, sugar) as flinch cues.
- Whether the zone shift traces to a mechanism.

## Next

- Offense (this session): the play-side linemen's lateral flow on stretch
  runs (reach and bucket requests vs what the bodies achieve), measured with
  `meshwidth.py`; the defensive linemen's flow is the run-defense
  session's fit controller (numbers sent); the blocker's tempo after it.
  Called split levels beyond the team rule and the package (manuals: tight
  / normal / wide by game plan) wait for tracking evidence that teams vary
  them within a game; team and package explain the measured spread.
- Defense (run-defense session): technique placement, width and depth per
  front with variation from the player, the call and the situation;
  adjustments to the end's side, wings, trips and motion; the caller's front
  and check choice by look and situation.
- Then re-score the run game on the new base before any more run tuning.
