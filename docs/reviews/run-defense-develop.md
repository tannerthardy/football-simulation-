# After-catch execution on accepted develop (2026-10-21)

Branch `claude/run-defense-develop` from accepted develop
`d91c9014fe5e088f3f43e38236e967d68bd388b0`. The research behind it was done on
`claude/zen-feynman-7712y8` (hosted on unaccepted `claude/run-game-v3@9932066`,
with that branch's contact model on); that host is preserved unchanged and its
numbers do not certify develop. Everything below was measured on develop.

## Integrated: `TIP_AWAY` (default off)

**Question.** On the research host, half of all interceptions followed a
touched ball, most of them the same defender catching his own breakup. Does
`catching.ts` give a defender who has just broken up a pass a second,
independent interception chance on its deflection?

**Answer: yes.** After a breakup or bat, the defender may play the tumbling
ball again 0.25 / 0.3 s later with up to a 40% catch roll, although the
contest had just decided he could not catch it cleanly. A breakup swats the
ball away from his hands. With `TIP_AWAY` he stays out of that flight (the
`noCatchUntil` lockout covers it); teammates and the receiver can still play
the tip. No other law changes.

**Evidence** (`depth/ints.ts`, 8 games each, seeds 101–108, develop profile
vs `TIP_AWAY=1`): interceptions 41 / 614 → 33 / 633 attempts (6.7 → 5.2%; NFL
total 2.2%); touched balls intercepted 19 → 6%; by the defender who touched it
12 → 0; interceptions after a touch 54 → 21%. The rate difference alone is
not significant at this sample (p ≈ 0.25); the mechanism count is. On the
research host, 16 games each: 7.4 → 5.0% (p ≈ 0.02).

**Tests.** `test/tip-away.test.ts` (breakup, then the tumbling ball through the
same defender's hands: off intercepts, on does not). The existing witness
`catch-caller-interval.test.ts` "preserves a genuine defensive PBU" asserted
the old 0.25 s lockout, which is exactly the law the flag changes; its
assertion now states both (0.25 s off, the rest of the flight on), otherwise
unchanged. Core suite 2,777 / 2,777 with the flag off and with it on;
typecheck passes.

**Risk.** Clean interceptions remain about 3–4% of attempts (NFL total
2.2%): about half are undercuts away from the receiver. That is QB decisions
and the in-flight interception roll, not this lockout.

## Withdrawn: `LEG_BIND`

`LEG_BIND` (a hold beside or behind the runner, at the thighs or lower, times
its grip, capped the speed the carrier's gait could hold) was ported and
measured here, then withdrawn from this branch (normal revert `cb53813`).

- It helped: 1v1 panel 135° / 6 yd/s yards after contact 6.9 → 4.5, 180° /
  6 yd/s 5.8 → 4.3 with no unfinished reps, head-on unchanged; with
  `TIP_AWAY`, 8-game mechanism report off-flagged metrics 46 → 33, catch
  broke contact 29.7 → 19.6% (NFL 12.5), YAC p90 34.7 → 20.4 (12.5),
  `run.yards` p90 27.0 → 12.1 (10.0). Run yards after contact got shorter
  (1.95 → 1.62, NFL 2.4).
- It breaks a sound contract when on: `tackle-support-choice.test.ts` "a rear
  finish transmits braking load through center/patch physics" (a planted rear
  holder 3775 vs co-moving 4043 load). The bound runner brakes himself, so the
  tackle's braking no longer goes through the hold. A held runner who keeps
  asking to drive is a sound decision; that his legs still achieve a full
  stride is a physics gap (bound legs and the holder's weight in the support
  model). Under the model rules the repair belongs in physics; the evidence
  (panel cells, `depth/holdtrace.ts`, `depth/holds.ts`, this contract) is
  handed to the contact/physics owner. The flag stays on the research host.

## Pre-snap alignment

Default-off `DEF_ALIGN`, `WR_ALIGN`, `OL_SPLITS` (and research-only
`OL_STAGGER`) in `alignment.ts`, at the user's request; see
[pre-snap-alignment.md](pre-snap-alignment.md).

## Defensive front alignment (`FRONT_ALIGN`, default off, not proposed)

Pre-snap geometry is split with the run-offense session (the workboard has
it). That session owns offensive alignment and the shared operators
(`scripts/diag/align/fronts.py`, `presnap.py` on `claude/run-game-v3`, and
its catalog `docs/reviews/presnap.md`). This side owns `alignDefense` and the
defensive caller. The rule is the user's: alignment comes from the call
against the look, the player and the situation, not from target values.

Develop's 8-game runs against the catalog (2022 runs):
- the weak end is a 5 on 33% (NFL 2%);
- the strong end over a tight end is a 6 or 5 on 47% (NFL a 6 on 13%; a
  wide nine 46%, a 9 31%);
- the 1 and 3 techniques sit mid-gap;
- every depth is a single value;
- the caller draws the front from personnel only.

Tracking at the snap (`nfl-snap.csv.gz`, front defenders under 2 yd off):
- a shaded lineman sits 0.57 yd off his blocker's centre (C and G alike);
- front depth is 0.9–1.0 yd off the ball, which develop already has (the
  operator's 1.15 is measured from our flat offensive line);
- end-man width outside the surface is 1.42 yd with an end there and 2.39
  without. It varies with the player (about −0.025 yd per lb; 235 lb ends at
  1.81 yd, 275 lb at 1.03) and by team (SD of team medians 0.3–0.4 yd), and
  hardly with down and distance.

On:
- shaded techniques sit on their blocker's shoulder;
- each side's end man sets the edge outside the surface: outside the tackle
  with no end there, at least on an end with one;
- his build moves him 0.05 yd per kg off 118 kg (at most 0.6 yd), never
  inside an end he is set on;
- the call's gap is unchanged;
- `playsim` passes each defender's mass in the defensive style.

A first version moved heavy ends a notch tighter, from a 6 to an inside 7
(39% of strong edges); the continuous rule replaced it.

| 8-game runs | develop | `FRONT_ALIGN` | NFL |
| --- | --- | --- | --- |
| Weak edge a 5 | 33% | 3% | 2% |
| Weak edge wide nine / ghost | 42% / 6% | 40% / 33% | 56% / 32% |
| Strong edge 6 / 9 / wide nine | 30% / 12% / 17% | 54% / 21% / 3% | 13% / 31% / 46% |
| Edge outside the surface, strong / weak (`presnap.py`) | 0.07 / 0.93 | 0.10 / 1.76 | 1.46 / 2.05 |
| Report flags (`off`), guard | 46, 12/12 | 36, 12/12 | |
| Run yards p50 / p99 | 2.98 / 27.0 | 2.44 / 14.8 | 3.0 / 10.0 |
| Yards after contact p50 | 1.95 | 1.52 | 2.40 |

The weak side now looks like tracking. The strong side stays tight because
the front calls themselves put the strong end on the tight end (Over's 6).
Next is an edge call within the front: tight, 9 or wide by team habit, the
end man and the situation. After that comes the caller, a short-yardage
package answering the offense's heavy personnel (six or more on the line,
no deep safety: 27% of tracked snaps at 1–3 yd to go). Staged native
witnesses pin `FRONT_ALIGN` off, as for the line flags; `test/front-align.test.ts`.
Core suite 2,828 / 2,828 with it on.

`OL_SPLITS` and `OL_STAGGER` (above) are superseded by the run-offense
session's `OL_ALIGN` as the one line source when the branches meet. It
folds in `OL_STAGGER`'s pass-set depths.

## Defense after the catch on develop (diagnosis, no engine change)

**Question.** On the develop candidate (`TIP_AWAY`, `DEF_ALIGN`, `WR_ALIGN`,
`OL_SPLITS`), what decides the yards-after-catch tail (p90 23.7, NFL 12.5)?
And is the cause a defensive decision, a defensive execution, or something
the defense is reacting to correctly?

**Where it is decided** (`depth/aftercatch.ts`, 6 games):
- Catches with 10+ yards after the catch get their first defensive act at
  +1.55–1.65 s, 6.4–7.7 yd from the catch spot. The wrap then breaks 45–50%
  of the time.
- Short catches: first act at +0.4 s, 1.5 yd away; 2% of wraps break.

**The defender in front** (new `depth/frontact.ts`). With exactly one
defender in front (NFL yards after catch 1.1 / 10.8):
- When he is near (2.6 yd) and closing (2.6 yd/s), his wrap holds and
  yards after catch are 1.7 / 9.1, NFL-like.
- The tail comes from front defenders 4.9–6.7 yd away who are not closing:
  0.96 yd/s, mostly safeties, while someone else makes the first act. And
  from wraps that break.

**Why the front defender is not closing.** The same operator on both
sources (`defense/deepthrow.py`, `defense/cushion.py`):

| At the throw | Sim | NFL |
| --- | --- | --- |
| Two deepest backs' depth | 16 yd | 18 yd |
| Their retreat speed (0.3 s later) | 4.5 yd/s (4.5) | 3.0 yd/s (2.5) |
| Cushion over the deepest nearby receiver | 4.5 yd | 6.8 yd |
| That receiver's downfield speed | 6.5 yd/s | 4.5 yd/s |

The sim's receivers are still running vertically when the ball comes out,
so the deep defenders are right to keep bailing. That is the passing
selection already handed off (more 10–20 yd targets, fewer short ones), not
a coverage-technique flaw. Earlier, keying the QB's windup (`ZONE_ARM`)
moved the break but not the tail. No defensive change is made for it.
Execution must not be tuned to fix calling.

**Press man is too tight early** (new `defense/presspanel.ts`: native
Cover 1 press, X on one route, 12 fixed reps). The jam's hands are on only
0.15–0.25 s and come off at 1.4–1.9 yd depth. After that the corner stays in
phase about 0.7 yd from the receiver at 1.0 s on go, slant, hitch and out.

| Separation at 0.5 / 1.0 / 1.5 / 2.5 s | Press | Off |
| --- | --- | --- |
| Games (same operator, `defense/manpress.py`) | 1.33 / 0.51 / 0.91 / 1.75 | 4.55 / 3.64 / 2.06 / 1.80 |
| NFL | 2.22 / 1.70 / 1.32 / 1.20 | 3.73 / 3.41 / 2.85 / 1.89 |

The press share matches the NFL (55% vs 51% of man snaps). The NFL receiver
wins the release and the corner recovers; the sim's corner wins the release
and loses later. The press `trackReceiver` target sits 0.6–1.3 yd ahead and
0.7 inside the receiver, and the corner achieves it through the release.
Next is to separate decision from execution: whether the corner's flip and
start under a 0.15–0.3 s perception delay should allow that. This is
coverage technique (Catching's on the workboard) plus turn and start
physics. Handed off with the panel; no change made.

## Run defense for the run-offense session (default off, not proposed)

The run-offense session (`claude/run-game-v3`) listed defensive mechanisms its
films keep showing. Two are tried here as default-off flags; one waits on
physics. Measurement: `scripts/diag/runblock/` operators read NFL tracking and
sim exports identically; lab = `run-blocking-lab.ts` (30 reps, seed 7);
games = the 8-game mechanism export against develop with every flag off.

**`BLOCKED_REACH` (`tackle.ts` `tryTackles`).** Off, a blocked defender may
not reach for the carrier until he is winning the block (`win ≥ 0.6`). In
tracking, a blocked defender (an offensive player within 1.2 yd) is the first
contact on 46% of gap runs and 55% of zone runs; develop gives 32% / 41%
(`blockedfirst.py`). A lineman whose blocker has one side of him still has
the other arm. On: when the runner passes on the defender's free side (his
blocker offset at least 0.25 yd to the other side), the defender reaches
with `0.7 − 0.3·control` of his reach; latched inside hands pull it in to
the installed 0.4. A blocker head-up or on the runner's side occupies that
arm and the installed gate holds. The engaged miss penalty is unchanged and
nothing awards the tackle.

Correction: an earlier version of this section reported "gain at a blocked
first contact" from `blockedfirst.py`. That column was the play's final
yards, not where the contact happened (the run-offense session found it).
The operator now reports both, and the numbers below use them.

*First version (any side), 8 games against develop.* Blocked first contact
went 32 / 41% → 48 / 51% (NFL 46 / 55%), broke contact 16.0 → 12.7% (NFL
12.5%), and report flags 46 → 35, guard 12/12. Develop's blocked first
contacts already come 1.0 yd behind the line on gap runs (NFL 0.4 past it).
The flag took them to 1.4 behind.

*Leverage at the pass.* On the run-offense blocking
(`claude/run-game-v3@4723647` plus this patch, its pinned profile,
`open-field/arm.mjs`: gap 1,600 plays, ace zone 1,200), its
`leverage-pass.py` sorts each engaged defender the runner passes by side.
How often he then makes first contact, under-centre gap runs:

| | off | any side | free side only | NFL |
| --- | --- | --- | --- | --- |
| Runner on the blocker's side (covered) | 11% | 17% | 13% | 11% |
| Runner on the defender's free side | 18% | 23% | 23% | 24% |
| Zone: covered / free | 12% / 18% | 15% / 21% | 13% / 21% | 15% / 26% |
| Blocked first contact, gap / zone | 35% / 40% | 41% / 45% | 40% / 43% | 46% / 55% |
| Blocked contact depth, gap / zone (p50) | 0.0 / 0.1 | −0.5 / −0.2 | −0.4 / −0.1 | 0.4 / 0.4 |
| Run yards p50, gap / zone | 5.11 / 3.75 | 4.72 / 3.50 | 4.76 / 3.51 | |
| Stuffs, gap / zone | 3.7% / 8.8% | 5.1% / 8.2% | 4.6% / 8.5% | |

The first version reached through the blocker's body: a covered man converted
17% against tracking's 11%. Restricted to the free side, conversion on each
side is within a few points of tracking. A temporary attempt log on the first
version showed where the added reaches happen on gap runs: the runner behind
the line, outside an end kicked from inside (169 of 341) or inside a man
logged from outside (105). The run-offense session's `coverside.ts` shows the
runner passes on the side his read chose (covered 18 of 18, free 36 of 39),
and that the covered side is closed by the next man, usually an untouched
backer. The blocked contacts that remain come earlier than tracking's
(−0.4 vs 0.4 yd): the runner meets these men behind the line. That is the
back's path and the backers' fill, not the reach. Not proposed until those
two are repaired, so the share and the depth can be judged together.

**`PULL_EARLY` (`run-fits.ts` `pullers`).** Backers read run by 0.5–1.0 s
(`lbtrace.ts`) but the pull read fires about 1.35 s, after the guard has
been seen a yard off his stance. A backer's key is the guard's first step:
opening back and across. On: a surface lineman seen behind his stance
(> 0.15 yd), not moving upfield, and moving across faster than 1.5 yd/s is
a puller. A lineman stepping across at his own depth (a zone step) is not.

| | develop off | `PULL_EARLY` | NFL |
| --- | --- | --- | --- |
| Gap runs: backer flow toward the play at 0.5/1.0/1.5/2.0 s (`lbfill.py`) | 0.0/0.0/0.0/0.2 | 0.0/0.0/0.2/0.6 | 0.1/0.6/1.6/2.8 |
| Lab power flow at 1.5/2.0 s | −0.07/0.33 | 0.59/1.75 | |
| Lab yards before contact, power / counter | 1.55 / 1.06 | 1.35 / 0.71 | |
| Inside-zone runs of 15+ yd (games) | 5 of 52 | 11 of 48 | |
| Report flags (`off`) | 46 | 46 | |

Guard 12/12. Gap flow starts earlier but still trails tracking at 1.0 s:
the guard himself pulls late (offense side, sent to the run-offense session).
The inside-zone tail is the adverse result; its one diagnostic (`lbtrace.ts`
iz_strong / oz_strong, both arms) shows zone backers' reads, requests and
flow identical through 1.5 s with a few extra pull tags at 2.0 s, so the
lab does not reproduce a mechanism. With about 50 runs a concept these counts
are noisy (counter 10 of 39 off, 4 of 36 on), but it is not ruled out:
games call zone against fronts the lab does not. Not proposed: unresolved risk.

**`FORCE_BOUNCE` (`run-fits.ts` `executeRunFit`, force fit): D1, the
outside on power, counter and trap.** The run-offense session's spec
(`claude/run-game-v3`, `docs/reviews/run-offense.md`, "D1"): at the moment
the back reaches 2 yd short of the line, tracking has 0.52 defenders a play
free outside the bounce point (`outfate.py`), and the outside-aligned
backs hold about 4.1 yd outside the surface (`blat.py`). Develop has 0.00,
the same as that branch. `forcejobs.ts` shows the force holds the job; the
landmark is wrong. `forceTrack` aims at the greater of the runner + 0.7 and
the seen surface + 0.5, and the force walks onto it from 0.5 s, before the
handoff (the surface already contains a pulling guard).

On: while the runner he sees is still behind the line, the force keeps
outside the outermost body at the point of attack by the ground the back
covers at full speed in this defender's reaction time (about 2 yd). Bodies
at the point of attack are the line and inline ends as seen, plus blockers
and engaged defenders within 4 yd outside them near the line. Once the
runner is at the line the installed track applies. A first version that
used only the point-of-attack bodies changed nothing in the lab: those
bodies sit inside the seen surface there.

| Gap arms (power/counter/trap, 1,200 plays) | develop off | develop on | run-offense off | run-offense on | NFL |
| --- | --- | --- | --- | --- | --- |
| Free outside the bounce point, per play | 0.00 | 0.18 | 0.00 | 0.15 | 0.52 |
| Free inside the bounce point | 0.28 | 0.11 | 0.23 | 0.06 | 0.20 |
| Outside-aligned deep DBs, lateral outside the surface | | | 0.6 | 2.7 | 4.1 |
| Force width outside the edge at the kick-out (`force.py`, power) | 8.8 | 3.4 | | | 2.4 |
| Runs of 40+ yd | 128 | 127 | 117 | 104 | |
| Power / counter yards p50 | 3.97 / 3.69 | 4.07 / 3.60 | 4.82 / 4.76 | 4.45 / 4.53 | |

Develop's back seldom bounces (inside the kicker 90%, `force.py`), so
develop's outcomes do not move. On the run-offense blocking, where backs
bounce, strong-side bounces fall:
- power: ace 55 → 39%, I 54 → 30%;
- counter: ace 29 → 17%, I 31 → 24%.

Weak-side bounces stay at about 80%. That is the weak side's alignment and
assignment, now part of the front work below.

The native Split Zone Bear helper witness (`zone-helper-check.test.ts`) pins
it off: its recorded double does not release within 2 s once the force plays
wider. Core suite 2,818 / 2,818 with it on. Not proposed yet: the 8-game
mechanism report and the edge and front alignment come first.

**`DL_CHASE` (`engagement.ts` `runContactRead`): D2, the backside line.**
NFL backside linemen move toward the play 0.8 / 1.4 / 2.1 yd at 1.0 / 1.5 /
2.0 s on gap runs (`dlflow.py`). Develop's go −0.1 / −0.5 / −0.9. At 1.0 s
they ask to move 2.5 yd/s away from the play (`dltrace.ts`):
- an interior man holds a shoulder that slides with his cutoff blocker;
- the backside end keeps his outside shoulder and widens with his.

Neither reacts to the guard pulling beside him. Coaching's key for both is
"close and follow the pull". On: a seen puller within 3 yd (an edge: 4.5 yd,
and only a pull going away from his side) flips his shoulder across the
blocker's face toward the pull and feeds its motion as his flow. `DL_FIGHT`
(already on develop, off) holds his ground against a push away from the ball.

| Gap arms (power/counter/trap), backside DL toward the play at 1.0 / 1.5 / 2.0 s | off | `DL_CHASE` | + `DL_FIGHT` | NFL |
| --- | --- | --- | --- | --- |
| develop | 0.1 / −0.5 / −1.1 | 0.1 / −0.5 / −0.8 | 0.1 / −0.3 / −0.4 | 0.8 / 1.4 / 2.1 |
| develop + `PULL_EARLY` | 0.1 / −0.5 / −1.1 | | 0.1 / −0.2 / −0.2 | |
| run-offense profile (`4723647`) | 0.1 / −0.3 / −0.9 | 0.1 / −0.1 / −0.2 | 0.1 / −0.1 / 0.0 | |

The request turns toward the play from 1.5 s (−1.5 → +2.5 yd/s in the lab).
At 1.0 s nothing changes: the pull is seen only around 1.0–1.5 s, and on
develop the guard himself pulls late (0.2 yd across at 0.5 s, NFL 0.5).
Tracked backside linemen are already moving by then, before any pull is
visible, so the rest is not this cue. Outcomes on the run-offense profile
are mild: median 4.96 → 4.74 yd, runs of 20+ 11.3 → 9.7%. On develop with
all three flags the median falls 4.27 → 3.38 and stuffs rise 7.9 → 11.9%,
while flow is still far from tracking. Not proposed: two attempts, stopped
to re-diagnose the first second.

## Diagnostics (observation only)

`scripts/diag/depth/`: `frontact.ts` (the defenders in front of the receiver after the catch), `drives.ts` (drives, results, points by scoring play),
`games.ts` (rolled whiffs and broken holds per run and completion), `ints.ts`
(interceptions by source), `holds.ts` (holds by origin and outcome, full
telemetry), `holdtrace.ts` (one 1v1 panel rep every 0.1 s), `aftercatch.ts`,
and one-operator NFL/sim scripts `yacsplit`, `longpass`, `infront`,
`frontman`, `rally`, `zonebreak`. `scripts/mechanics/nfl_ytg.py` writes the
yards-to-goal filter their `--ytg60` option reads. `scripts/diag/runblock/`:
`blockedfirst.py`, `lbfill.py`, `dlflow.py` (NFL and sim, one operator),
`lbtrace.ts`, `dltrace.ts` (lab backers and backside DL over time).

## Reproduce

```sh
npx vitest run test/tip-away.test.ts test/catch-caller-interval.test.ts test/blocked-reach.test.ts test/pull-early.test.ts
node scripts/baseline.mjs --candidate --flag TIP_AWAY=1 -- npx vitest run --project core
for a in "" "--flag TIP_AWAY=1"; do node scripts/baseline.mjs --candidate $a -- node --import tsx scripts/diag/depth/ints.ts --games 8; done
```
