# Run game diagnosis on run-only film (develop 55cc9e5, corrected on 5235708, 2026-10-27)

Tanner's ask: the run game still looks bad and is now the only focus. His
named complaints: pulling guards and any lineman who has to move to space and
block; a counter where the kick-out went after a wide-9 end who was already by
the QB; wide-9 ends taking themselves out of runs.

This review builds a run-only harness, traces 894 run plays end to end and
measures them against 1,218 NFL runs (BDB2025, weeks 1-2) with identical
position-only definitions. It ranks what is wrong, names the first wrong stage
for each item where the trace shows it, and assigns an owner. It changes no
football behavior.

## Harness

- `GameOptions.runOnly` (`src/game/game.ts`, `src/game/playcaller.ts`): every
  offensive scrimmage call is a designed run. Kicks, fourth-down and try
  decisions are unchanged, and the pass/run draw is still taken so the call
  stream stays aligned. Default games are unchanged (option unset).
- `--run-only` on `npm run replay` and `npm run weird`, so film and detectors
  share play ids (`G1-P037` on seed 11 is the same play in both).
- `scripts/diag/run-film-trace.ts <seed> [--games 2]`: 10 Hz trace of every run
  play (positions, velocity, facing, engagement, current target, job, events)
  to `out/run/trace-seed<seed>.json`. Reads only.
- `scripts/mechanics/run_film_reference.py <nfl.jsonl.gz> <traces...>`: the
  tables below, NFL and sim through the same code.

Reproduce (about 1 minute per seed):

```sh
for s in 7 9 11 13; do node --import tsx scripts/diag/run-film-trace.ts $s --games 2; done
python3 -I scripts/mechanics/nfl_bdb2025.py --weeks 1 2 --plays-out out/mechanics/nfl-plays-w12.jsonl.gz --out out/mechanics/nfl-w12.json
python3 -I scripts/mechanics/run_film_reference.py out/mechanics/nfl-plays-w12.jsonl.gz out/run/trace-seed{7,9,11,13}.json
node --import tsx scripts/weird-film.ts 11 --games 2 --top 0 --run-only
node --import tsx scripts/export-replay.ts 11 --games 2 --run-only --out out/run/film-s11.html
```

Sample: seeds 7, 9, 11, 13, two games each, 894 run plays (37 nullified by
holding, excluded). Mix: zone 60%, power 8%, counter 8%, trap 6%, draw 5%,
toss 2%. Fronts: over 43%, even 19%, under 15%, wide-9 10%, bear/tite the rest.

## Correction after review (2026-10-27)

The first version of this review had two measurement faults:

- `run-film-trace.ts` recorded frame k at t = 0.1k + 0.05 s, while
  `run_film_reference.py` read it as 0.1k, so every sim timing below was
  0.05 s flattering. The tracer now records a frame at the snap and every
  0.1 s after, and the script refuses traces that are off that clock.
- NFL pullers were picked by "3+ yd lateral by 1.5 s" and sim pullers by their
  installed pull plan; only 4 of 135 sim pullers passed the NFL rule. Both
  sides now use one rule: 3+ yd lateral within 2.5 s, no more than 0.5 yd past
  the LOS until 2 yd lateral. It catches 97% of the sim's installed power
  pullers, 84% counter and 64% trap (the script prints this as "sim plan").

Re-run on develop `5235708` (after #297), same seeds, both fixes. Every
direction in the findings survives; the sim side is slightly worse than first
reported. Read the sections below for the mechanisms and this table for the
numbers.

| Measure | NFL | Sim, first version | Sim, corrected |
| --- | --- | --- | --- |
| Power puller distance at 0.5 / 1.0 / 1.5 s, yd | 0.49 / 1.77 / 3.31 | 0.26 / 0.9 / 2.1 | 0.22 / 0.83 / 2.13 |
| Counter puller distance at 1.0 s, yd | 1.82 | 0.9 | 0.80 |
| Power puller 3 yd lateral / first touch, s | 1.5 / 1.6 | 1.8-1.9 / 2.2 | 1.9 / 2.3 |
| Puller touch before carrier crosses, power / counter / trap | 84% / 82% / 96% | 42-53% | 56% / 46% / 49% |
| All OL distance at 0.3 / 0.5 / 1.0 s, yd | 0.19 / 0.46 / 1.44 | - / 0.33 / 0.91 | 0.08 / 0.27 / 0.86 |
| Box backers touched before the carrier arrives | 85% | 56% | 54% |
| Backside / playside wide end in on the play | 18% / 23% | 1% / 14% | 0% / 14% |
| Never past LOS, power / counter / trap / draw | 12% / 15% / 3% / 10% | 35% / 35% / 53% / 58% | 38% / 45% / 46% / 68% |

The claim in 1.1 that `GAIT_STEP=0.3 PULL_STEP=1` "fix this exactly" came
from the offset traces and the old NFL puller rule. It does not hold; treat
those flag probes as directional only until they are re-run on the corrected
clock with a matched restage.

## Ranked findings

Ranked by how often it happens times how bad it looks on film. Yards are
reported for context only; nothing here is tuned toward yards.

### 1. Linemen who move to space arrive late and block nobody (Tanner's #1)

| Pullers (power/counter/trap) | NFL | Sim |
| --- | --- | --- |
| Distance from snap spot at 0.5 / 1.0 / 1.5 s, yd | 0.6 / 2.0 / 3.7 | 0.26 / 0.9 / 2.1 |
| Time to 3 yd lateral, s | 1.3-1.4 | 1.8-1.9 |
| Deepest point behind the LOS, yd | 1.3-1.4 | 1.6-1.7 (kickers 1.8-2.2) |
| First touch on a defender, s | 1.6-1.7 | 2.2 |
| Touch comes before the carrier crosses the LOS | 82% | 42-53% |

Engagement census (sim, actual engagements, 4 seeds): the counter lead puller
engages anyone on 7% of snaps (4% before the runner is first hit). Kick-out
pullers engage someone on 51% (counter) and 70% (power) of snaps. Zone/iso
lead backs 37%. NFL puller selection (3+ yd lateral by 1.5 s) finds 0.9 power
pullers and 1.1 counter pullers per play, so it is not dropping slow NFL pulls.

Three layers, in order:

1. **The first second.** The whole line is slow off the ball, not only pullers:
   every OL on runs is 0.33 yd from his stance at 0.5 s and 0.91 at 1.0 s (NFL
   0.46 and 1.44). A puller's first waypoint drops him straight back 1.25 yd at
   his own width, square to the line (`blocking.ts` `pullPath`), which is the
   slowest thing a 140 kg body can do. Two default-off flags documented in
   `docs/reviews/gait-step.md` close much of this (measured on the offset
   traces, see the correction above): with `GAIT_STEP=0.3
   PULL_STEP=1` puller distance at 0.5 / 1.0 / 1.5 s becomes 0.6 / 2.0 / 3.9
   and 3 yd lateral comes at 1.3-1.4 s, matching NFL. `PULL_STEP=1` alone moves
   1.0 s distance only 0.9 to 1.1; the ramp is the physics. `GAIT_STEP=0.3`
   also pushes backs past NFL (RB 2.03 yd at 1.0 s vs NFL 1.49), so it is a
   per-body acceleration question, not a flag to flip as is.
2. **Path and target, once the speed is fixed.** With both flags on, kickers
   still go 2.3-2.5 yd deep and 56% (counter) never touch anyone. The kick
   target and the path corners are fixed at the snap from the end's pre-snap
   spot (`blocking.ts` around the `pullers` loop), and `attack` only starts
   within 1.2 yd (`RUN-7`). The puller runs to where the end was.
3. **Who to block when the end leaves.** A wide-9 end who rushes upfield is
   followed into the backfield. In `s11-G1-P037` the end reaches -5.5 yd and the
   kick-out guard follows him to -4.9 yd at 2.75 s while the runner goes
   through the hole without him. This is the counter Tanner described (the
   puller is the backside guard in our counter; the playside tackle blocks
   down). Kick-outs that first engage a defender deeper in the backfield than
   the runner: 24 in 146 counter/power plays (16%). Coaching rule: kick out the
   first man past the down block at the line; an end who has run himself
   behind the play is no longer the kick target, so the puller turns up
   inside him to the next threat.

### 2. Second-level backers go unblocked

| Box backer touched by a blocker before the carrier reaches him | NFL | Sim |
| --- | --- | --- |
| All runs | 85% | 56% |
| Inside zone | 83% | 68% |
| Outside zone | 86% | 50% |
| Power / counter | 91% / 86% | 71% / 56% |
| Trap / draw | 94% / 77% | 55% / 20% |

This is the largest measured gap after the start. It overlaps the Run Game
lane's open climb work (#311: zone climbers release with the backer 4-6 yd
away, NFL about 2.5) and the counter lead puller above. Film example
`s11-G2-P002`: LG comes off the double, climbs to the line and slows to a walk
2.5 yd from LB_W, who makes the tackle. The "free climber requesting near-zero
movement" detector fires on 6-8% of run plays.

### 3. Wide-9 ends get upfield at the NFL rate but never come back (Tanner's #3)

| Wide edge (1.5+ yd outside the surface) | NFL | Sim |
| --- | --- | --- |
| Playside: 2+ yd into the backfield / in on the play | 29% / 23% | 28% / 14% |
| Backside: 2+ yd into the backfield / in on the play | 28% / 18% | 31% / 1% |
| Backside: carrier's first contact | 6% | 0% |

The overrun itself is NFL-like. The failure is what happens after it. The
backside end is in on the play 1% of the time against 18%, because the edge
fit keeps its landmark and only chases once the runner is 2 yd past the line
(`pursueIfLive` `preserveEdge`, `run-fits.ts` edge branch). Film:
`s11-G1-P144` (backside end averages 0.3 yd/s from 1.5 to 3.5 s of a 51-yard
run). This is the Defense lane's open "chase entry" question; it now has its
NFL number. The pass-rush miss Tanner also named is the same end on dropbacks
(PRO-1) and is out of scope here.

### 4. Gap runs and draws are stuffed in the backfield

| | NFL median carrier x at first contact | Sim | NFL never past LOS | Sim |
| --- | --- | --- | --- | --- |
| Inside zone | +0.8 | +1.0 | 10% | 21% |
| Outside zone | +0.2 | +1.0 | 15% | 12% |
| Power | +0.8 | +0.5 | 12% | 35% |
| Counter | +0.7 | +0.6 | 15% | 35% |
| Trap | +1.5 | -1.5 | 3% | 53% |
| Draw | +1.5 | -3.3 | 10% | 58% |

Handoff timing is NFL-like on every concept (1.1-1.3 s), so the backfield is
not the cause. Gap runs fail mostly from item 1 (the puller is not there) and
item 2. Draw is its own failure: the draw blockers stand at their stance for
about a second and meet a charging line flat-footed (`s11-G1-P021`: no set, no
punch, the end sheds on contact and tackles 5 yd deep). Zone runs are close to
NFL on these timeline measures.

### 5. Runner reads (candidate detectors)

The candidate "runner leaves installed aim toward a nearby defender" detector
fires on 59% of run plays (530 of 894). It is unvalidated, so it is a lead,
not a finding. Rules + Coaching's carrier exit/trend read work (#308) and the
live-gaps seam (#326) are the owners; the runner's read is worth judging after
the blocks it reads are fixed, since many of these are a runner choosing
between two unblocked men.

### Not ranked

- "Blocker on a man out of the play": 422 of 894 plays, 82 of the 163 seed-7
  events are receivers' stalks. Counted, not yet split by cause.
- "Lineman backpedaling facing his own backfield": 407 plays. A position-only
  check (OL moving toward his own goal faster than 2 yd/s for 1 s) shows 1.8%
  of plays against NFL 10%, so this detector's facing rule needs review before
  it is used as a target.
- Holding on runs: 37 of 894 (4.1%).

## Owners

| Item | Owner | Already in flight |
| --- | --- | --- |
| 1.1 Line start (per-body acceleration; `GAIT_STEP` question) | Main Engine | #297 force-velocity (leg force falls with speed; the start is the other end of the same curve) |
| 1.1 Pull step (`PULL_STEP` on, square drop removed) | Run Game | none |
| 1.2-1.3 Puller path, kick target that updates, turn-up rule | Run Game | RUN-7 logged, no work open |
| 2 Climbers and lead blockers reaching backers | Run Game | #311 (release distance, stuck climbers) |
| 3 Backside edge chase | Defense | chase-entry diagnosis assigned 10-26 night |
| 4 Draw blocking | Run Game | none |
| 5 Runner reads | Rules + Coaching | #308 research, #326 live-gaps seam |
| Detector review (backpedal, phantom lane) | Tools | #312 film pack |

## Film

Run-only film room for seeds 11-12 with eight clips pinned (the
`export-replay.ts 11 --games 2 --run-only` output plus a clip list): `G1-P037` counter kicker chases the
wide-9 to the QB; `G1-P119` counter where neither puller blocks anyone;
`G2-P076` and `G1-P010` power kick-outs 4.7-5 yd deep; `G1-P112` trap behind
the runner; `G1-P021` draw; `G2-P002` stalled climber; `G1-P144` backside
wide-9 standing still.

## Limits

- NFL is two weeks of one season. Sim is eight games of two generated teams at
  strength 0.55.
- "Touch" and "in on the play" are proximity proxies (1.2 and 1.5 yd), the same
  on both sides; they are not engagements or credited tackles.
- Sim concept mix differs from the NFL's (more zone, fewer man/duo calls), so
  compare within concept.
- The flag probes in item 1 are whole-game runs, not matched restages; they
  only show what the start costs. Any change that lands needs the matched
  restage with k>=4 RNG-shifted replays.
