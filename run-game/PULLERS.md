# Pullers run fixed landmarks (2026-11-01, develop f476187d)

Question (Tanner, from film): counter's pulling linemen follow set landmarks and then turn, too static to get off the
route and make a better block at a better angle.

Measurement: `tools/py/pullshape.py` (same operator on 2022 NFL and sim), sim = develop `f476187d` (#385 merged),
captured run-only snaps seeds 7..29 odd, counter + power, streams 0..4 (`--concept counter,power`).
Full output: `results/pullshape-DEV.txt`. Per-tick requests: `tools/ts/pullreq.mts <worktree> <seed> <index>`.

## How the pull is built (src/sim/behaviors/blocking.ts)

- At the snap each puller gets three fixed points (`pullPath`): a drop behind his own spot, a flat-leg corner
  behind the down wall (kick: 0.65 yd inside the end's snap spot; wrap: 0.5 yd short of the hole), and an end point
  (kick: at the end's shoulder on the line; wrap: the installed hole, `los + 0.5`, B gap).
- He runs each point with `goTo` (arrive control) and `through = cornerSpeed(radius 0.65)`, so he brakes to ~2 yd/s
  at every point, and only advances when within 0.65 yd of it (`pullIdx`); the corner can also hold him until the
  wall clearance read passes (`observedCorner`).
- The kick fit can leave the route when the end is in front of him; the wrap has no such read: his route ignores
  his target, which is re-picked separately while he runs.

## Film: seed 7 #22 (ace_11 counter vs over), wrap LT

0.5-1.6 s flat at x -1.33 toward the corner point, requested speed falling 6.8 -> 3.2 as he arrives; 1.7 s the end
point (0.5 yd further, 1.8 yd upfield) snaps the request to 115 deg while he still runs 168 deg; speed 3.9 -> 2.9 ->
2.0 -> 0.7 by 2.8 s; path ends at the hole at 2.5 s. Target relabels LB_W -> LB_M -> DT_W -> DE_W; he ends on the
backside end chasing, never a backer.

## NFL vs sim (medians, IQR in results)

| | NFL | sim |
|---|---|---|
| Counter wrap: turn lateral IQR (yd from snap) | 3.98-7.03 | 5.17-5.45 |
| Counter wrap: turn depth IQR | -0.85..+0.83 | -0.72..-0.55 |
| Counter wrap: r(turn lateral, his man's lateral) | 0.78 | 0.39 |
| Counter wrap: speed at 2.0 s | 3.30 | 2.64 |
| Counter wrap: first block relative to turn | 0.8 s before | 0.1 s before |
| Counter wrap: heading at block | 21 deg | 36 deg |
| Peak heading rate in the turn (kick / wrap / power) | 100 / 90 / 92 deg/s | 174 / 140 / 176 deg/s |
| Speed dip into the turn (kick / power) | 1.88 / 1.13 | 2.38 / 2.56 yd/s |
| Power puller: min speed around turn | 2.06 | 1.02 |
| Power puller: turn time / depth | 2.0 s / -0.02 | 2.5 s / -0.80 |
| Power puller: heading at block | 39 deg | 10 deg |

Sim wrap turn point by formation: +2.3..2.4 yd from the ball, 0.65 deep, at 2.3 s in every formation (the hole
landmark). The kick puller's turn does follow his man (r 0.96 vs NFL 0.94) because the kick fit tracks the end, but
it still brakes into points and corners ~1.7x sharper than NFL.

## Reading

NFL pullers carry speed through a rounded path (about 90-100 deg/s of turn), start bending toward their man while
still flat, and engage on the way (wrap blocks ~0.8 s before reaching 45 deg upfield). Sim pullers brake into each
landmark, pivot at it, and the wrap's turn point is the installed hole regardless of where his man is.

## Proposed change (not implemented)

Controller, not physics: keep the wall-clearance constraint (`readPull` clearanceX) but replace point-to-point
arrival with path following: a lookahead point along the current route with speed limited by the curvature the
body can hold (`lateral` capacity), so the turn is a curve, not a stop. Let the route's turn-up come from his own
picture of his man (wrap: the backer/threat he sees; kick: the end, as now), re-read each decision beat, and open
the fit on time-to-intercept rather than 1.2 yd proximity. Measure with `pullshape.py` (turn-point spread and r,
heading rate, dip, block-before-turn) plus the counter card (wrap near box backer, behind-LOS first contact) and
power/trap controls.

## Fix: run/G2-puller-path 452b8acf (2026-11-01)

Corners rounded on the radius his speed and lateral grip hold; the route's end point is passed, not circled
back to; the lead runs through the hole, fits a man he can reach within 0.8 s past his corner, keeps a man he
can reach, ignores men behind his flow (a beat ahead), and leads the runner when no threat is left.
Matched (develop f476187d vs fix, 12 seeds, counter+power, 5 streams; NFL same operator):

| | develop | fix | NFL |
|---|---|---|---|
| Counter wrap speed at 2.0 s | 2.64 | 3.16 | 3.30 |
| Counter wrap heading at first block | 36 deg | 22 | 21 |
| Wrap first block before his 45-deg turn | 0.1 s | 0.5 | 0.8 |
| r(turn lateral, his man) | 0.39 | 0.57 | 0.78 |
| Wrap target switches >= 2 before engaging | 79% | 66% | - |
| Behind-LOS first contact | 38% | 41% | 41% |
| Wrap within 1.2 yd of a box backer | 26% | 21% | 39% |
| Play-side backers untouched | 32% | 34% | 13% |

Scope (all concepts, stream 0): only power, trap, counter and 5 split-zone snaps change. Not addressed: power
puller meets his man flat (11 vs 39 deg); counter wrap late into a crowded hole (behind the LOS at the carrier's
crossing on 2/3 of no-block plays, two bodies within 1.3 yd).

## Where else (pivots.py, develop, all concepts stream 0, brake-and-pivot share per player-play)

| | NFL | sim |
|---|---|---|
| Power TE (Y climbing, re-targeted to a new man mid-climb) | 0% | 11% |
| Draw TE / OL (pass set, then a hard flip to run block ~2.0-2.3 s) | 3% / 0% | 11% / 5% |
| Power back (FB lead) | 0% | 8% |
| Inside zone non-carrier back | 1% | 7% |

Peak heading rate is ~2x NFL for every role in sim, but NFL tracking is filtered and sim is not, so that
number needs both smoothed the same way before it is evidence.

## Task: counter wrap "late into a crowded hole" (2026-11-02)

The wrap is not late. Base: `run/G2-puller-path` 452b8acf (PP6 traces); counter, 12 run-only seeds, 5 streams.
Same operator for both sides: `tools/py/wrapcar.py`, `tools/py/carlat.py` and `kicklog.py` (`KCON=COUNTER KPULLS=2`).

| At the carrier's LOS crossing | NFL counter | sim counter | NFL power | sim power |
|---|---|---|---|---|
| Carrier lateral from OL centre | +3.12 | +0.83 | +3.02 | +3.00 |
| Carrier lateral from snap PST | +0.36 | −1.99 | +0.00 | +0.15 |
| Carrier lateral at 2.0 s | +1.29 | +0.42 | +1.83 | +1.74 |
| Wrap lateral from OL centre | +3.87 | +3.35 | — | — |
| Wrap outside carrier by > 1 yd | 41% | 81% | — | — |
| Wrap deeper than carrier | 53% | 30% | — | — |
| Carrier vs kicked man (kicklog) | −0.43 | −2.80 | — | — |
| Carrier vs kicked man, logged ends | +2.85 | −2.56 | — | — |

- The wrap's path and speed match NFL (`wrapmeet.py`: distance to nearest box backer 3.3/2.5 yd at 2.0/2.5 s, both sides).
- NFL counter backs hit the same off-tackle point as power. The sim counter back hits the B gap, so the wrap ends up 2.5 yd outside him.
- The sim back never bounces outside a logged end.

Three mechanisms, found by `tools/ts/backagg.mts`, `tools/ts/backaim.mts` and `_pic` (live line picture):

1. **Counter installs `aim: 'B'`** (`src/playbook/concepts.ts`); power installs `'C'`. Captures serialize the concept, so a replay must re-read it; the local overlay's `installed()` does that.
   - Aim C alone: crossing +0.83 → +1.49.
   - But the pullers' hole (`blocking.ts` hole = 3.6 for C) also widens, so the wrap gets ahead of the back less often: 30% → 12%.
   - Not shipped. The hole for the back and the hole for the pullers need separating first.
2. **Flat pullers count as line bodies** in `linePicture` (`live-gaps.ts departed()` needs depth < −0.5 from his stance). Counter pullers run 0.2–0.4 yd behind their stance, so at 1.5 s the back's live C gap is computed between the two crossing pullers.
   - Fix: `patches/linepic-departed.patch` counts a body as departed when it is more than a split across, behind its stance, and has no defender on it.
   - Scope, all concepts stream 0: power 98/155 snaps change, trap 88/153, counter 127/138, zone 7–32%.
   - Power's carrier track is unchanged (+2.81 vs +2.89), so the change is in defensive gap fits and line-flow reads, which use the same picture. Handed to Defense; not shipped here.
3. **The open-lane race after the kick lands.** `followEnded` fires on `kickLanded` at 1.6–1.9 s, about 4 yd deep. `runReadAim` then prices the preferred spot (median +0.7 from PST, which is right) at risk about 13, against about 4 for the seam 2 yd inside.
   - m1 < 0 on 115/124 snaps. The earliest arrival is the kicked end (about 35%), a free backer (the wrap's man, about 30%) or the down-blocked DT (about 25%).
   - Tried: the defender must go around a touching blocker's body (`screenedDetour`). No change. The end stands over the kicker at the line, so the entry point is genuinely within his reach.
   - Open: the race treats the lead puller's future body as nothing, but NFL backs run off the wrap's hip into a contested hole. This needs a design decision before more code. Candidates:
     - keep pressing the read point (kick read sets the side) until −2 yd;
     - forecast teammates' bodies along their seen motion in `blockedBy` and `threatTime`.

Arms: PP6 (base); AC1 (aim C, replay re-reads the install); AC2 (aim C + departure); ALLD (departure only, all concepts).

## Where-else fixes (2026-11-02, PR #390)

Base `run/G2-puller-path` 452b8acf. Tools: `tools/py/tepivot.py` lists pivots with plan and target context; `tools/ts/slotreq.mts` traces one slot's request vs achieved motion and logs blocking changes.

**Power Y climb retarget, dec477ad.**
- Cause: `rereadThreat` switched a climber onto a man he had climbed past. Film S11-P007: the Y turned back 126° for the DE in the backfield.
- Fix: a passed man, judged a beat ahead (same rule as the wrap), is pursuit, not a block.
- Power, 5 streams: Y pivots 36 → 29 (reread-driven 14 → 2); OL pivots 20 → 13. 90/697 snaps changed, mean +0.33 yd.
- Test: `climb-reread-passed`. S8-P005 ledger pins re-recorded.
- Remaining Y pivots: climbers overrunning a backer who fills under them.

**Draw flip, fc838b0c.**
- Cause: the pass show ran each covered owner to a yard mark (LOS − 1.2, his own y), so a draw tackle stood still for 1 s while a wide end ran by (S11-P037). The "flip" was him trailing that end.
- Fix: the pass protector's kick without the launch-point depth floor. NFL draw tackles sit 0.9 yd deeper than their rusher at 1.0 s, about `KICK_LEAD`. Edge rushers only; interior owners already matched NFL depth.
- Draw:
  - OL pivots 5% → 0% (NFL 0%); TE 11% → 2% (NFL 3%); peak heading rate 80 → 35 °/s (NFL 43).
  - Plays at or behind the LOS 34 → 25 of 77.
  - Tackle depth at 1.0 s is still −1.04 vs NFL −1.63 (`tools/py/drawwide.py`).
- Iterations tried and rejected:
  - chord set: tackles slid +1.2 yd wide;
  - full pass-pro floor: tackles 2.4 deep, guards 2.2 deep.

**Lead and zone back pivots (develop: power 8%, IZ 7%).**
- On the current branch: power 1/26, IZ 3/41, trap 1/19.
- The lead-FB cases (S13 #66 IZ, S13 #30 power, S17 #8 trap) are traffic. He asks for 5–9 yd/s on a sensible heading, gets 1–1.7 yd/s at LOS −1 behind his own linemen, and slides sideways.
- Not changed: 3 cases. A lead path that reads the line's bodies (like the climber departure access) is the candidate.

## Task #93: power kicker vs the end (2026-11-02)

Defense's film: 64/189 NFL power kicks hit an inside-aligned man; 50 of them are the kicker taking the first DL past the down blocks.

Same-operator check, power with one OL puller (`tools/py/kickwho.py`, `tools/py/pstdl.py`):

| Kicker's first block | NFL (348) | sim (607) |
|---|---|---|
| The end | 39% | 84% |
| A man on the line inside | 17% | 5% |
| A backer | 34% | 0–1% |
| Nobody | 3% | 11% |

**End behaviour is the same in both.** Lateral from the PST at 1.3/1.6 s: NFL +1.48/+1.03, sim +1.43/+0.94. Wide at 1.6 s: NFL 35%, sim 41%.

**The difference is who has the end when the kicker arrives.** End on a teammate 0.3 s before the kicker's first block:

| Who has the end | NFL | sim |
|---|---|---|
| Anyone | about 60% | about 15% |
| TE | 113 | 42 |
| OL | 48 | 21 |
| RB | 18 | 7 |

- In NFL, when someone has the end, the kicker goes elsewhere: backer 46/113 when it's the TE, 31/48 when it's an OL.
- In the sim, the TE and PST are installed to block down, so the end is free and the kicker correctly kicks him.

**Three read attempts, none adopted** (`patches/kick-read-attempts.patch`):

| Attempt | What it did | Result |
|---|---|---|
| KT1 | Take the first unblocked man in his lane to the end | Fired on 6–9% of plays, no change |
| KT2 | Turn up when the end is seen on a teammate | Fired at about 0.8 s on a snap-time TE touch, then re-picked the same end |
| KT3 | Same, decided within 3 yd, with the end excluded | Almost never fired, because the end is rarely held at arrival |

**Next: an install decision, not a read.** Power's blocking rules (the TE or PST base-blocks the end, the kicker leads to the backer) vs the current down-down-kick. A PST/TE variant needs Tanner's call.
