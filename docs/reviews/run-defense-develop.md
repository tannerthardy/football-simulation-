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

The weak side now looks like tracking. The strong side stayed tight
because the front calls themselves put the strong end on the tight end
(Over's 6). So the call now carries an edge (tight, base, wide). The
coordinator picks it per snap from the team's fixed lean (around the
tracked 46 / 31 / 17% over an end), in its own forked stream so that every
other choice draws as before. The coordinator does not use down and
distance: tracked width barely moves with them.

With the build term at the full tracked slope, our heavy strong ends
(median 124 kg) pulled every call back in. Tracked light ends are wider
partly because they get the wide calls, so the build term is now half the
slope (0.025 yd per kg, at most 0.4). A wide nine over an end now stands
2.0 yd outside him; the catalog counts a wide nine past 1.5.

| 8-game runs, strong edge | 6 | 9 | wide nine | edge outside the surface |
| --- | --- | --- | --- | --- |
| develop | 30% | 12% | 17% | 0.07 |
| front on bodies (`5220725`) | 54% | 21% | 3% | 0.10 |
| + edge call (`34c4502`) | 39% | 23% | 19% | 0.35 |
| + build within the technique (`e2a257f`) | 27% | 33% | 23% | 0.46 |
| NFL | 13% | 31% | 46% | 1.46 |

Guard 12/12; 39 flags (develop 46). Head-up ends were still three times
tracking, so the work stopped to re-diagnose rather than tune further. A
scan of every front, edge call and mass gave the answer. The tight call
(about 17%, matching tracking's 13% head-up) was not the excess. Heavy
strong ends (130 kg and up, about a third of ours) on a base 9 were pulled
by the build term into the head-up band. A 9 is the end's outside shoulder,
so build now moves an end only within his called technique: at most 0.2 yd
in (0.4 from a wide nine).

The playbook session (`claude/great-mccarthy-85uf8b`) checked the front
maps against the in-repo sources (HonestNFL front sheets HNFL-081/082/086/
088/129; the generated textbook p. 29), at medium confidence:
- no source shows a head-up 6 as the base Over strong end; it is a 7 or a 5
  in base, with the Sam on the line outside the end or overhanging him;
- in nickel the strong end takes the edge outside the end at a 9;
- a head-up 6 appears only in a run-down nickel call (Flex).

The installed Over map (DE_S 6, Sam 7 at 4.1) matches none of them. The
edge call now overrides the end man's technique, so it no longer decides
the end's alignment under the flag. The Sam's spot is still to revisit.

With the change, guard 12/12 and 44 flags (game noise: 39 on the previous
run, 46 on develop). Head-up ends are about double tracking and wide
nines half. Wide calls are 46% of snaps, but only 23% read as a wide nine:
that is the next diagnosis. After that comes the caller, a short-yardage
package answering the offense's heavy personnel (six or more on the line,
no deep safety: 27% of tracked snaps at 1–3 yd to go). Staged native
witnesses pin `FRONT_ALIGN` off, as for the line flags; `test/front-align.test.ts`.
Core suite 2,828 / 2,828 with it on.

### The installs' rules replace the random edge call

The playbook session read the team installs (2017 Colts pp. 13, 77, 79;
Ravens and Seahawks front sheets; HNFL-129). Their answer to the 23% wide
nines was that the edge is a rule against the look, not a lean drawn per
snap, so the random edge call is gone:
- vs a pair of ends (a wing) the end plays a 9 on the end's outside
  shoulder, inside the wing (p. 79), in base too;
- in nickel ("Auto", p. 13) the closed end plays a 6 vs a near back and a
  9 vs a dot or far back;
- a 9 over an end stands 1.5 yd outside him, a wide nine 2.5;
- the Over Sam is a "90", the end's outside shade at linebacker depth, and
  on the line head-up on a wing (p. 77);
- with no end on his side, a called 6 or 7 is a ghost, standing where the
  end would (it was 1.0 yd outside the tackle, read as a 5 on 47% of our
  empty-set strong edges; 2% tracked);
- the coordinator weights fronts as the installs use them: base personnel
  Under three to one over Over; nickel on passing downs mostly the wide
  Rush front (`installWeight` in `playcaller.ts`).

| 8-game runs, strong edge | 6 | 9 | wide nine | 5 | edge outside the surface, strong / weak |
| --- | --- | --- | --- | --- | --- |
| + build within the technique (`e2a257f`) | 27% | 33% | 23% | | 0.46 |
| installs' rules | 22% | 45% | 12% | 11% | 0.45 |
| + 9 at 1.5, pair 9 inside the wing (`e245812`) | 11% (+6% ghost) | 43% | 23% | 13% | 1.28 / 2.03 |
| NFL | 13% | 31% | 46% | 1% | 1.46 / 2.05 |

Guard 12/12; 37 flags. The remaining 5s were the empty-set ghosts, fixed
after that run (`test/front-align.test.ts`). The strong edge is still a 9
more often and a wide nine less often than tracking. The installs give
rules for the 9; the wide nine comes from the Rush front and from team
lean, which the playbook session is still reading. Front families: Over
44% and Under 28% of our runs, against Over 22%, Under 13%, Even 18% and
Tite 12% tracked. Our caller has no even or tite front in its nickel mix;
that is the next caller question, not a width one.

### Short-yardage package (`SHORT_PACKAGE`, default off)

Tracking: 27% of snaps at 1–3 yd to go have six or more on the line and no
deep safety. Develop calls goal-line personnel only inside the 2-yard line.
On, the coordinator answers the offense's heavy package anywhere on the
field: goal-line personnel and the Bear at 2 yd or less against 13, 21 or
22, and against 12 at a yard or less. The Bear's Sam is on the line outside
the attached end ("Dubs" 9, HNFL-129). `test/short-package.test.ts`; the
Duo doubles witness pins it off (the Sam on the line changes the
offense's count, a question for the run-offense session).

| 8 games, snaps at 1–3 yd to go (`fronts.py --kind all`) | develop | `SHORT_PACKAGE` | NFL |
| --- | --- | --- | --- |
| Snaps | 108 | 116 | 2,179 |
| Six or more on the line | 5% | 24% | 25% |
| No deep safety | 22% | 50% | 25% |
| Goal-line personnel called | 8 / 116 | 45 / 129 | |
| Runs converted / passes converted | 77% / 46% (52, 56) | 67% / 58% (57, 59) | |

The front now carries the tracked share of heavy looks. Zero-deep shells
doubled: the package plays no safety deep, and the rest of the caller kept
its own 22%, which already matched tracking without any heavy front. The
next caller question is whether that 22% belongs to these situations at all,
not a cap on the package. The conversion rows are about 55 plays each and
show no settled change (the heavy box gives up more passes).
Exports `sim-sy0`/`sim-sy1` at `e245812` with `--review-out` for the
situations; `scripts/mechanics/sim-export.ts` carries no down or distance.

The zero-deep doubling was the package itself. Goal-line personnel has no
free safety, so it played no one deep at midfield: 100% of its six-man
fronts, against 55% of tracked heavy fronts at 1–3 yd (lighter fronts 15%;
`fronts-joint`, a scratch join of `fronts.py`'s classifier with the
situations). The installs use goal-line personnel only at the goal line;
elsewhere their heavy calls keep a safety deep (Colts "36 Heavy" Cover 1,
"44" 6-2). Now: goal-line personnel and the Bear inside the 5; elsewhere a
new heavy personnel group (five down, Sam and Mike, both safeties) in the
Bear, in a one-high or zero coverage by the caller's ordinary weights. A
first cut that allowed only one-high was a ban on the zero call and was
replaced.

| 8 games at 1–3 yd to go | six or more on the line | none deep with them | none deep otherwise |
| --- | --- | --- | --- |
| develop | 5% | 80% (5 snaps) | 19% |
| goal-line package anywhere (`e245812`) | 23% | 100% | 35% |
| heavy package, one-high only (`6b8a715`) | 32% | 24% | 25% |
| heavy package, one-high or zero (`bc53b18`) | 33% | 38% | 36% |
| NFL | 25% | 55% | 15% |

Runs converted 75% and passes 49% in the last arm, about 60 each. Lighter
fronts play no one deep 19–36% across these arms with unchanged caller
code: about 100 snaps each, situation mix diverging. Their zero rate is
the ordinary caller's Cover 0 weighting at 2 yd or less, which predates
the package; it is the next caller question if it holds up.

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

## Breaks after the catch on develop (diagnosis; two attempts dropped)

**Question.** With the recommended set (`PAD_LEVERAGE`, `DL_ANCHOR`,
`DL_FLATTEN`, `SNAP_REACT`; 8 games, `sim-levs`), catch contacts are broken
24% of the time (NFL 12.6%). Is that the tackle (physics), the tackler's
approach (controller), or what happens before the catch?

**Only fast carriers break too often** (`depth/catchbreak.py`, one operator):
- Mid-speed carriers (3–5.5 yd/s): sim 7% broken, NFL 9%.
- Fast carriers (5.5+): sim 47%, NFL 23%.
- Approach angles match: from behind 71% vs 66%.
- On fast carriers, sim first contact is made from further away: 36% at 1.5 yd
  or more between the bodies' centers (NFL 7%), and those break 60%.

**What the first act is** (`depth/catchact.ts`, 6 games): on fast carriers,
25% of first acts are lunges from 1.7 yd. The tackler is at 4.8 yd/s against
the carrier's 6.7, closing at about 0. Lunges get away 77%; form tackles 20%.
One second earlier, the lunging tackler was 2.6 yd ahead and 3.3 yd to the
side, asking for 9.1 yd/s and running 3.8. The receiver ran past him.

**The situation, both sources** (`depth/sidepass.py`). A defender 1.5–4 yd
ahead of the receiver along his path and 1.5–4.5 yd to his side, the receiver
at 3–6 yd/s, before any contact. Over the next 1.0 s:

| | Met | Passed | Receiver speed change, 0.5 s | Defender velocity along the path |
| --- | --- | --- | --- | --- |
| NFL | 52% | 23% | −0.14 | 0.0 |
| Sim | 27% | 65% | +1.0 | −1.7 |

The sim defender's momentum is coming back at the receiver, who accelerates
past a body that cannot reverse in time. Turning and speed-up capacity match
tracking (`pursuit/turn_capacity.py`), so this is not a body limit.

**Two defender-side attempts, both dropped** (8 games each, same flags):
- `PURSUIT_ACCEL`: `pursuitPoint` forecasts a runner seen speeding up to top
  speed. Over a 0.7 s intercept that moves the aim only 0.4 yd. Breaks
  24.3%, met 37% (about 100 situations), YAC p90 23.5 → 30.4, mismatch flags
  28 → 39.
- `PURSUIT_BODY`: `chase` aims for the earliest point where it can put its body
  in the runner's path, falling back to arm's length. At window entry the
  aim is still 0.8–1.2 yd behind the defender (`depth/sideprobe.ts`), because
  the earliest meeting point is behind him whatever the radius. Breaks 25.3%,
  met 21%, flags 28.

**Re-diagnosis: the race starts in the air.** `pursuit/accel_by_side.py` and
the new `depth/airclose.py` read the defender at the catch and through the
flight:
- At the catch, the nearest defender (within 4 yd) closes at:
  - beside the receiver: 0.89 yd/s (NFL 2.46);
  - behind him: −0.25 (NFL 0.73).
- Only 5% of those defenders are ahead of the receiver (NFL 12%).
- Through the flight in zone, the nearest defender closes 0.12 yd (NFL 0.65)
  while the ball is in the air longer (1.0 s vs 0.8). He arrives at 1.5 yd/s
  (NFL 2.1), into tighter windows (3.4 yd at the throw vs 4.4).
- Man coverage is closer (−0.03 vs +0.36 yd).

**The break itself** (`depth/breakcurve.py` on both sources,
`depth/breakprobe.ts` inside the sim). Take the defender nearest the target at
the throw, in zone coverage:
- His speed from the release to +0.8 s:
  - NFL: rises steadily, 3.8 → 5.6 yd/s (separation 2–5 yd at the throw).
  - Sim: dips, 4.0 → 3.4 at +0.4 s, then 4.1.
- With the receiver tight (under 2 yd), ours loses ground until +0.6 s
  (closing −1.6 yd/s at +0.4 s, NFL −0.25).

Inside the sim:
- He recognizes the throw at +0.25 s (`onBall`).
- Until then his coverage asks him to face 60–80° off his travel, eyes on the
  quarterback; 21–39% are backpedaling.
- After that he asks for 7.6–9.7 yd/s within 15–37° of his travel but has
  only 3–3.8 by +0.6 s: the hip turn and start come after recognition. NFL
  defenders are already accelerating at the release.
- There is a throw-selection part too. On zone throws with 5+ yd of
  separation, our target is running away from the nearest defender at
  2.7 yd/s at the release (NFL 0.4): the vertical-route finding already
  handed to passing.

NFL defenders are driving on the catch point when the ball arrives. Ours start
the after-catch race nearly flat-footed and come at the receiver from where he
is, so the receiver who accelerates wins. That is coverage technique on the
throw (`sawThrow`/`playBall`, Catching on the workboard), plus the passing
side's flight time. It is handed off with these operators, and no engine
change is proposed here. The receiver's open-field speed (`BallCarrier`
commands `vmax` in the open; NFL receivers cruise near 6 yd/s) belongs to
the run-offense session. Slowing him would steer a player away from what works,
so it is not proposed either.

## Rally to the runner: linemen stay on blocks (diagnosis; `DL_ESCAPE` dropped)

**Question.** With the line set on, the run break rate matches tracking (13.2%
vs 12.6%, `depth/runbreak.py`). But fewer defenders are around the runner at
first contact: 1.55 others within 3 yd vs 2.44. Who is missing, and why?

**By where the contact is** (`depth/runrally.py`, one operator):

| First contact | Others within 3 yd, sim / NFL | Closing of men 3–10 yd away, sim / NFL |
| --- | --- | --- |
| Behind the line | 1.04 / 1.97 | +1.0 / +1.5 yd/s |
| 0–2 yd | 2.05 / 2.91 | 0.0 / +1.2 |
| 2–5 yd | 1.52 / 2.46 | −2.5 / +0.3 |
| 5+ yd | 1.00 / 1.45 | −3.5 / −0.5 |

Defensive linemen are most of the gap. Those 3–10 yd from the runner move
1.5–1.9 yd/s (NFL 2.4–4.0). With contact 2–5 yd past the line they fall
behind the runner at 4.3 yd/s (NFL 1.5). Backs are fine.

**Why** (`depth/dlpursuit.ts`): at first contact, 63–85% of those linemen are
still engaged with a blocker and winning by the leverage measure (win
0.7–0.96).
- Off, a first-level man tries to shed only when the runner is within 3.5 yd.
- `DL_ESCAPE` let him try once the runner had declared anywhere: attempts
  13 → 31%, 37 → 51% and 52 → 86% by band, but he stays engaged.
- A second variant gave him the support players' direct exit toward the runner
  when the blocker is not between them. Still about 80% engaged.
- At those sheds the hand joint carries about 690 N, the bodies touch
  (−0.02 yd), and the blocker controls the hands 65% of the time.

Two pieces hold him:
- `setContactHands` gives a blocker with inside hands steering up to 0.7 of
  his arm force, plus a pull up to 0.25 × control.
- The shed's work-off request presses into the blocker (axis × 0.6) while it
  works across his face, so the bodies never come apart.
- The experimental `DL_HANDS` + `HAND_MOTOR` rip only moves 2–5 yd from 62% to
  47% engaged.
- Linemen who are free also start slowly: they ask for 5–7.7 yd/s and move
  1.3–2.1.

Two attempts did not repair it, so `DL_ESCAPE` is not committed. The escape
execution (hand law, the work-off request, a released man's start) is handed
to the contact owner on the workboard. The run outcomes it would move already
match tracking with the line set, so this is realism, not a bad statistic.

**#194's calling with and without the line set.** Rerun of the def-alignment
session's arm B at `ecba815`, 8 games, seed 101:

| | Their B | B + line set | NFL |
| --- | --- | --- | --- |
| Run broke contact | 18.8% | 12.7% | 12.5% |
| Run yards, median p90 | 3.95, 17.9 | 3.46, 11.7 | 3.0 |
| Report flags | 50 | 37 | |

Their adverse run result is mostly line play, which the set addresses.
On runs, two deep at the snap is 50% there vs 26% tracked (told to that session).

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

**`DL_KEY` (`defense.ts` `PassRusher`): the first step.** The re-diagnosis
measured lateral movement under centre on outside zone at 0.3 / 1.0 s after
the handoff (`meshwidth.py` on the run-offense session's branch). Tracked
linemen move 2.97 / 5.00 yd and the playside guard 3.76 / 5.80. On the
run-offense profile ours move 1.39 / 2.80 and the guard 2.26 / 3.50. Our
linemen already track their blocker at nearly the tracked ratio, so the
gap is mostly the blocker's lateral speed, on the offense's side. On, a
lineman whose run fit is interior or edge keys the man in front of him: a
low hat stepping across at 0.35 yd/s or more (not a pass set or a
release) and he steps with it, aiming at the blocker's seen spot plus his
own shade. It adds 0.12 yd at 0.3 s and nothing later, so it stays off;
the finding went to the run-offense session.

**`LB_TEMPO` (`run-fits.ts` `executeRunFit`, insert fits): backer tempo.**
The run-offense session asked for it from `lbfit.py` (its branch): our box
backers come down about twice as fast as tracked ones in the first 1.5 s.
Two attempts, on the run-offense profile (`879c1d9`, zone arm 1,200 runs
under centre; gap arm the same within 0.2 yd):

| Zone arm | downhill yd/s at 1.0 / 1.5 / 2.0 s | depth at 1.0 / 2.0 / 2.5 s | first contact past the ball, time |
| --- | --- | --- | --- |
| off | 2.40 / 1.95 / 0.75 | 3.63 / 1.81 / 1.68 | +0.18 yd, 2.60 s |
| 1: hold the depth he can still close at speed | 0.0 / 0.0 / 0.15 | 4.58 / 4.36 / 3.89 | +2.17 yd, 2.80 s |
| 2: the pace that meets the back at the line | 0.90 / 1.20 / 1.30 | 4.17 / 3.06 / 2.41 | +0.81 yd, 2.60 s |
| NFL (all runs under centre) | 1.45 / 1.40 / 0.60 | 3.67 / 2.35 / 2.27 | +0.32 yd, 2.80 s |

The flag holds the second form; neither is proposed. The two miss from
opposite sides, so the work stopped to re-diagnose rather than blend them.
Off already matches tracked depth at 1.0 s. The miss is between 1.0 and
2.0 s: tracked backers settle about 2.3 yd off the ball, while ours keep
coming to the installed 1.5 yd landmark. The first thing to read is where
and when climbing linemen meet the backers, tracked against ours (an
interaction with the run-offense session's climb). `test/lb-tempo.test.ts`.

The run-offense session's `climbphase.py` answered that read. Tracked and
our climbers meet the backer at nearly the same time and depth (zone 2.0 s,
2.01 vs 1.76 yd past the ball). What differs is the backer's flow: tracked
backers have moved 4.10 yd sideways by the meeting, ours 2.05, and tracked
outside-zone backers scrape 3.05 yd/s at 1.0 s against our 1.50. Our
outside-zone back moves sideways as tracked backs do (0.5 / 1.0 s: 1.40 /
3.50 yd/s, NFL 1.40 / 3.45), so the cue is there.

Probe, not committed (`LB_MIRROR`, run-offense profile, zone arm): before
the mesh, a declared backer carried his landmark with the back's travel,
with the key lineman's low-hat zone step as an early cue. Scrape at 1.0 /
1.5 s rose 1.50 / 3.05 → 1.90 / 3.80 and lateral travel by the meeting 1.99
→ 2.43 yd. But outside-zone runs of 20+ yd went 8 → 17 of 400, crossing the
line 1.4 yd further inside. The arithmetic shows why: the mirror acts only
where it carries a backer past the existing inside-out spot (a yard inside
the back's projection), so its gain was overflow, and the back cut up
inside it. Dropped. In this code, backer scrape follows the gaps' motion,
which follows the offensive line's lateral speed (`DL_KEY` above): the
offense's lever. One defensive piece remains: a backer does nothing until
his run read at about 0.5 s (`lbtrace.ts`), while the coaching tables have
the first step go with the key's flow before run or pass is known.

Probe, not committed (`LB_STEP`): before his read, an underneath zone backer
moved with a seen low-hat zone step of the lineman across from him, at his
own depth (AFQ, Cowboys, Svec per the playbook session). Lateral speed at
0.5 s rose only 0.07 → 0.17 yd/s. The key's step becomes visible at about
the same time as the run read: our line has moved 0.37 yd by 0.5 s (NFL
0.55) and the backer sees it 0.25 s late. After the read he asks for 9.25
yd/s sideways and has 1.83 by 1.0 s. The run-offense session's guard shows
the same start: 1.95 yd/s asked over the first 0.5 s, 0.80 achieved. The
common limit is start-up acceleration from a stance, a movement-law
question for the physics owner (the run-offense branch carries `GAIT_STEP`).

### Pad level in the push (`PAD_LEVERAGE`, `DL_ANCHOR`; user-requested physics, off)

Against Duo's vertical double team our linemen were driven back +1.49 yd by
2.5 s (single-blocked +0.34); tracked linemen hold at +0.06 (−0.32)
(`dlwash.py`, `drive-push.ts` on the run-offense branch). The cause was in
the law. Posture already set centre-of-mass height, pad height, base width
and the tipping moments of a contact, but each body's traction was the
friction of his standing weight whatever the contact geometry. In a neutral
two-body push (`out/lev-probe.mts` pattern, now `test/pad-leverage.test.ts`)
a low man against a high man and a high man against a low man came out
identical to the hundredth of a yard.

`PAD_LEVERAGE` (`world.ts` `addLoad`, the feet budget): a push runs from
pads to pads. When one man's pads are lower, its line of action tilts up
into the higher man (rise over run, credited to 0.6). The vertical part
lifts the higher man and presses the lower man down, and each man's
traction is Coulomb friction on that normal load (`TURF_MU`, unchanged).
Only compression has the wedge; a pull does not. No strength or solver
detail is added.

| Neutral push, defender's travel at 2 s | off | on |
| --- | --- | --- |
| low (posture 0.9) vs high (0.3) | +0.05 | +1.95 |
| high vs low | +0.05 | −1.84 |
| equal pads | +0.05 | +0.05 |
| low vs two high | −3.12 | −2.68 |

`DL_ANCHOR` (`engagement.ts`): an engaged run defender who is doubled, or
is being driven back by a real load, sits into his stance (posture 1.0
from 0.85; "stay low", "drop the pressure leg": Bucs, Kuchar, Shurmur). A
blocker already anchors the same way when driven. It matters only where pad
level has a physical path.

| Run-offense profile (`879c1d9`) | Duo doubled DL driven back, 2.5 s | single-blocked | Duo median | gap 40+ / 1,200 | zone 40+ / 1,200 |
| --- | --- | --- | --- | --- | --- |
| off | +1.31 | +0.21 | 5.72 | 134 | 21 |
| `PAD_LEVERAGE` | +1.04 | −0.43 | 5.03 | 110 | 42 |
| + `DL_ANCHOR` | +0.80 | −0.61 | 4.77 | 126 | 39 |
| NFL (MAN, under centre) | +0.06 | −0.32 | 3.0 | | |

Single blocks now hold as tracked linemen do; doubles still give ground.
Two blockers' summed drive still beats one defender's strength-capped
resistance, so the rest is not pad level. Zone runs of 40+ doubled under
the law (a fresh all-off control reproduced 21 exactly; other changes to
this profile land at 27–30). Two diagnostics did not locate it: tacklers at
posture 0.9 change nothing (41). Runners in the open go further (20+ from
about 305 open runs: 28 → 52), with more passes without contact (211 →
236). (Correction: an earlier version said broken wraps were unchanged,
321 vs 311. Those were holds made with the runner already in the open, the
trace's `open` field; the fate is `broke`. Wraps 8+ yd past the line break
5 of 83 off and 9 of 89 with the law, 12 / 160 → 20 / 160 over both seed
sets: a small rise, same direction both times.)

Staged witnesses pinned off: `combo-strike-access`, `planned-climb-fit`
(recorded plays), `redirect-protection` (its rusher must turn the corner
first), `pass-contact-rules` (a staged "non-dispositive" receiver contact
becomes dispositive when the receiver's pads are up). Core suite 2,854 /
2,854 with both flags on and off. Promotion of a physics law stays with the
primary physics owner.

| 8 games on develop (`83ab603`) | off | `PAD_LEVERAGE` + `DL_ANCHOR` |
| --- | --- | --- |
| Run yards mean / median / p90 / p99 | 8.59 / 2.98 / 27.7 / 78.7 | 6.34 / 2.61 / 12.0 / 80.4 |
| Runs for a loss | 21.8% | 17.0% |
| Pass yards median | 5.43 | 6.38 |
| Pressure within 2 yd before the throw | 20.0% | 20.6% |
| Report flags (`off`), guard | 46, 12/12 | 32, 12/12 |

Flags cleared include Duo's engaged DL driven back at 3 s, Duo and overall
run yards, and yards after contact; new ones are inside-zone run yards
and box-rusher speed in the first half second.

**The zone tail under the law, traced.** Single plays cannot show it:
`attempt()` draws its miss chance from the shared `sim.rng`, so any change
upstream shifts which roll each later tackle gets (a paired play had
identical bodies through 3.30 s and a different roll). Over distributions,
on two seed sets (1,800 runs), 20+ went 52 → 88. Carriers are 0.15–0.55
yd/s faster from 0 to 3 yd past the line; open-field wraps break slightly
more (8+ yd: 12 / 160 → 20 / 160; see the correction above). The
carrier is lifted, not loaded, by the defenders he meets there (backers 9%,
corners 39% of his weight), so the speed comes from his blockers. On zone
our engaged linemen already ran upfield: the 'attack' technique requested
1.5 yd/s into the backfield whatever the block. Single-blocked on outside
zone they finish 1.61 yd upfield at 2.5 s (tracked 0.62), and the law
added more (1.78), opening the cut-ups behind them.

`DL_FLATTEN` (`engagement.ts`, off): an attacking lineman who sees the man
on him move across (over 1 yd/s, more across than at him) holds the depth
where he met him ("flatten the guard on the L.O.S. and keep outside
leverage", Bucs; "push & press", Allen). A vertical drive keeps the attack.
`test/dl-flatten.test.ts`.

| Outside zone, 2.5 s (`dlwash.py`) | single-blocked | doubled | zone losses |
| --- | --- | --- | --- |
| control | −1.61 | −0.87 | 10.2% |
| law + anchor + flatten | −0.51 | −0.33 | 4.1% |
| NFL | −0.62 | −0.59 | 7.6% |

The zone 40+ count then moves with almost any front change (control 21;
flatten alone 37; all three 42 on one seed set and 7 against 16 on the
other). Runs past 20 yd reach 40 88% of the time here (NFL 25%): there is
no last level, because the safety fits the alley at linebacker depth.
Holding him deep fails while the box leaks: with the three flags plus
`DEEP_CAP`, gap 10+ goes 18 → 39% (safeties only: 35%), and runners
reach 5 yd on 63% of gap runs (NFL 37%). Two attempts; stopped. The root
is the box's second level, where backers start late (start-up
acceleration, with the run-offense session).

| 8 games on develop | run mean / median / p90 | losses | 20+ | flags, guard |
| --- | --- | --- | --- | --- |
| off | 8.59 / 2.98 / 27.7 | 21.8% | 10.8% | 46, 12/12 |
| law + anchor | 6.34 / 2.61 / 12.0 | 17.0% | 6.3% | 32, 12/12 |
| + flatten (`280396e`) | 6.50 / 2.70 / 10.1 | 13.3% | 5.6% | 26, 12/12 |

Core suite 2,857 / 2,857 with all three on and off.

**The last level, re-diagnosed (probes on the run-offense profile, none
committed).** When a runner reaches 20 yd, tracked defenses still have 1.9
men downfield of him and the nearest defender is 1.7 yd away; ours have
0.18 and 4.9 yd, behind him 91% of the time, and P(40+ | 20+) stays
0.75–0.92 in every arm (NFL 0.25).
- The start: the tracked snap frame lags the snap by about 0.1 s (the
  run-offense session's `getoff-rel.py`), so `startup.py --shift 0.1` for
  NFL. Shifted, our interior linemen start as tracked ones do (0.65 / 1.26
  vs 0.65 / 1.19 yd/s at 0.2 / 0.4 s). Box backers are late (0.07 / 0.42 vs
  0.41 / 0.73), then too fast (2.46 / 3.28 vs 1.93 / 2.56 at 0.8 / 1.0 s):
  late, then rushing downhill. The run-offense session's `SNAP_REACT`
  (claude/run-game-v3, off) times the defense's start against the offense.
  Defenders stand still until their full reaction time. `DEF_GETOFF=0.5`
  (the run-offense session's scale, ported at identity) gives 0.25 / 0.57.
  Lab tails fall (zone 40+ 42 → 32, gap 137 → 122), but 8 develop games
  with the three flags get no better (flags 26 → 35, 20+ 5.6 → 7.8%, within
  game noise either way); it stays a diagnostic.
- Capping the deep defenders (`DEEP_CAP`, all, safeties only, corners only)
  with the front fixes and the faster start: gap 10+ 16–18% → 19–38%.
- A pursuit cushion for a defender still in front of the runner past the
  line changes nothing: the safety is already level with the runner when
  the runner reaches 5 yd (`capahead.py`).
The safety comes to linebacker depth to make the stops the box does not
(runners reach 5 yd on 46–48% of our gap runs, NFL 37%); holding him deep
opens the middle every time. The tail is a box problem that shows in the
secondary.

**`SNAP_REACT` (ported from claude/run-game-v3, off), adopted into the
defensive set at the user's direction as the realistic get-off.** The
defense's start is measured late against the offense in front of it (the
run-offense session's `getoff-rel.py`, frame lag cancelled): DL minus OL
+0.12 s ours, +0.03 tracked on runs. `SNAP_REACT` times it from the count
(+0.04). It stays in the set even where outcomes do not improve. On the
run-offense profile it starts the line sooner (0.05 → 0.19 yd/s at 0.2 s;
tracked 0.47 with the 0.1 s frame shift) but not backers or DBs, whose
first movement waits on their run read. Tracked backers' first move is
small, a read step of 0.23 yd by 0.5 s (ours 0.09; `lbfirst.py` pattern in
`startup.py`'s notes), so the start is not the backers' main gap: theirs
is coming downhill too hard after the read (1.8 yd off the ball at 2.0 s,
tracked 2.35). DBs come up too fast (0.98 / 1.66 / 2.70 yd/s at 0.4 / 0.6 /
1.0 s, tracked 0.61 / 0.85 / 1.65), the alley fit at linebacker depth.

| 8 games on develop | flags | run mean / p90 | losses | 20+ | pressure (NFL 30.5%) | defensive offside |
| --- | --- | --- | --- | --- | --- | --- |
| off | 46 | 8.59 / 27.7 | 21.8% | 10.8% | 20.0% | |
| law + anchor + flatten | 26 | 6.50 / 10.1 | 13.3% | 5.6% | 17.6% | |
| + `SNAP_REACT` (`4061541`) | 28 | 6.76 / 14.4 | 17.5% | 7.3% | 26.1% | 10 in 1,141 plays (about 3x NFL; assumed hard-count bite) |

Seven staged witnesses pin `SNAP_REACT` off. Core suite 2,858 / 2,858 with
the four on and off.

**`LB_LANDMARK` (`run-fits.ts`, off, not in the set).** The stack backer's
pre-declaration landmark, an installed 1.5 yd, moved to 2.25 yd, where
tracked backers meet the climbing lineman (2.01 yd median, `climbphase.py`).
On the run-offense profile with the line set it moves every backer measure
toward tracking: depth at the meeting 1.57 → 2.08, at 2.0 s 1.82 → 2.21
(NFL 2.35); zone 20+ 4.0 → 2.9% (2.5), 40+ 3.5 → 2.2% (0.9); short zone
runs rise (0–3 yd 55.7 → 58.8%, NFL 45.4). On develop's own games its
backers already settle at the tracked depth without it (2.35 yd at 2.0 s,
meeting 1.92), and with it they overshoot (2.74, 2.42): run mean 6.76 →
8.05, 20+ 7.3 → 9.1%, flags 28 → 29. The shallow backer belongs to that
profile's faster offense, not to a wrong landmark, so it stays off.
Develop's own backer gap is the scrape: 0.25 yd/s toward the play at 1.0 s
against 1.85 tracked (all runs under centre). `test/lb-landmark.test.ts`.

**`DL_FLATTEN_WON` (with `DL_FLATTEN`, off, not in the set).** A lineman
already beside or past the man on him keeps attacking instead of
flattening ("beat the reach, penetrate"). On the run-offense profile:
single-blocked outside-zone linemen −0.51 → −0.63 yd at 2.5 s (NFL −0.62);
zone losses 4.1 → 4.8% and 1.8 → 3.3% on two seed sets (NFL 9.9%). On
develop's games, where linemen beat the reach far more often, losses go
17.5 → 23.3% and report flags 28 → 44. Profile-dependent; left off.
`test/dl-flatten.test.ts`.

Zone and gap arms against tracking (run-offense profile, under centre):
zone 10+ is 6.4% ours against 10.2% tracked and 40+ 1.8% against 0.9%;
the deep-cap arms put zone 10+ at 14–17% and 40+ at 2.5–2.8%. On this
profile `DL_FLATTEN` cuts zone losses 10.2% → 4% (tracked 9.9%), taking
away backfield wins that real linemen still get; on develop's own games
the same flag moves losses 21.8% → 13.3%. Gap runs on this profile reach 5
yd on 42–44% (tracked 34%), the offense's blocking there.

### The run tail and the secondary (diagnosis; two probes, neither committed)

The run-offense session's `geometry.py` (its branch) puts the 40+ tail in
the open field. When a gap run reaches 10 yd, the deepest defender is 0.3 yd
ahead of the runner (NFL 4.8), and runs past 20 yd reach 40 92% of the time
(NFL 25%). New operators in `scripts/diag/runblock/` read NFL and sim alike
(`capahead.py`, `dbdepth.py`, `downfield.py`, `backlat.py`). Gap arm on the
run-offense profile (`879c1d9`), 1,200 runs:

| | NFL | ours |
| --- | --- | --- |
| Deepest DB depth at the snap / handoff / handoff + 1 s | 13.1 / 14.1 / 14.0 | 13.0 / 11.4 / 8.2 (power) |
| His lead on the runner at 0 / 5 / 10 yd | 12.5 / 5.4 / 2.1 | 6.8 / 0.2 / −4.3 |
| DBs downfield of a runner at 10 yd: inside / wide | 1.19 / 1.47 | 0.10 / 0.54 |
| Runs reaching 5 yd | 37% | 46% |

Our secondary plays as a third level of backers. The alley fit takes a
safety to 5–8 yd as soon as he reads run, and the box leans on him there.

- **`DEEP_CAP`** (the run-offense branch's flag, alone): the deep defender
  keeps his depth until the ball crosses. His lead at 0 / 5 / 10 yd becomes
  11.4 / 5.9 / 0.1, NFL-like to 5 yd, but runs reaching 5 yd go 46 → 59%,
  10+ 18 → 36%, and 40+ stays about 11%. In Cover 3 it also holds the
  deep-third corners. Holding the secondary deep exposes the box.
- **`PURSUIT_MARGIN` (probe):** a pursuer aims at the first point on the
  runner's path he reaches with his reaction time to spare. Gap 40+ 134 →
  93 of 1,200, but zone 40+ 21 → 40. Restricted to a runner heading
  downfield (the coaching meaning of a deeper angle), gap 134 → 122 and
  zone 21 → 27. So the first form's gain was wider lateral flow, which
  helps against bounced gap runs and hurts against zone cut-ups: a trade,
  not a repaired mechanism. Two attempts; stopped.

The tail starts in the box, not the secondary: too many runners reach the
second level, and the safety who would be the last level is already
filling there. Next is the box's second level (backer flow, above), then
holding the deep defender back.

## Diagnostics (observation only)

`scripts/diag/depth/`: `frontact.ts` (the defenders in front of the receiver after the catch), `drives.ts` (drives, results, points by scoring play),
`games.ts` (rolled whiffs and broken holds per run and completion), `ints.ts`
(interceptions by source), `holds.ts` (holds by origin and outcome, full
telemetry), `holdtrace.ts` (one 1v1 panel rep every 0.1 s), `aftercatch.ts`,
and one-operator NFL/sim scripts `yacsplit`, `longpass`, `infront`,
`frontman`, `rally`, `zonebreak`, `catchbreak`, `sidepass`, `airclose`, `breakcurve`, `firstgroup`, `runbreak`,
`runrally`, and lab probes `dlpursuit.ts` (linemen at a run's first contact), `catchact.ts`, `sideprobe.ts` (the side window from inside the
chase), `breakprobe.ts` (the nearest defender through the flight). `scripts/mechanics/nfl_ytg.py` writes the
yards-to-goal filter their `--ytg60` option reads. `scripts/diag/runblock/`:
`blockedfirst.py`, `lbfill.py`, `dlflow.py` (NFL and sim, one operator),
`lbtrace.ts`, `dltrace.ts` (lab backers and backside DL over time).

## Reproduce

```sh
npx vitest run test/tip-away.test.ts test/catch-caller-interval.test.ts test/blocked-reach.test.ts test/pull-early.test.ts
node scripts/baseline.mjs --candidate --flag TIP_AWAY=1 -- npx vitest run --project core
for a in "" "--flag TIP_AWAY=1"; do node scripts/baseline.mjs --candidate $a -- node --import tsx scripts/diag/depth/ints.ts --games 8; done
```
