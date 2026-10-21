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
(`blockedfirst.py`). A lineman whose blocker has his chest still has a free
arm. On: an engaged defender reaches with `0.7 − 0.3·control` of his reach
(latched inside hands pull it in to the installed 0.4); the ordinary engaged
miss penalty is unchanged, nothing awards the tackle.

| | develop off | `BLOCKED_REACH` | NFL |
| --- | --- | --- | --- |
| Blocked first contact, gap / zone | 32% / 41% | 48% / 51% | 46% / 55% |
| Gain at a blocked first contact, gap / zone (p50) | 0.9 / 1.2 | 0.5 / 1.5 | 3.0 |
| Broke contact | 16.0% | 12.7% | 12.5% |
| Yards after contact p50 | 1.95 | 1.70 | 2.40 |
| Run yards p99 | 27.0 | 12.2 | 10.0 |
| Report flags (`off`) | 46 | 35 | |
| Lab yards before contact, IZ/OZ/power/counter/trap | 1.82/1.78/1.55/1.06/1.71 | 1.29/1.16/1.35/0.80/1.29 | |

Guard 12/12. Who makes first contact now matches tracking; where does not.
The NFL blocked tackler meets the carrier 3 yd downfield, the sim's at the
line, and that was already so off (0.9). Blocks stalemate at the line rather
than moving the defender, which is a run-blocking question, not the gate.
Yards after contact also move away from tracking. Not proposed until the
blocking owner looks at where the block is when the reach happens.

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

**Backside DL flow (no flag).** NFL backside linemen flow toward the play
0.8/1.4/2.1 yd at 1.0/1.5/2.0 s on gap runs, 1.0/1.9/3.0 on zone
(`dlflow.py`); develop's go −0.1/−0.5/−0.9 and about 0. `dltrace.ts`: they
are held in an engagement from 1.0 s and request only 0.4–0.5 yd/s across.
The request is low because the glued pair cannot move together; that is the
run-offense session's glued-pair physics (its item 4). No controller change.

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
