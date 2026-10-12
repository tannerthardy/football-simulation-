# Run blocking: what stops runs, and what moves the line

Work in progress on `claude/run-blocking`, cut from `claude/engine-priorities`
at `12ccf98`. Two native 8-game cohorts (seeds 101, 202) reproduce the
current review's baseline exactly (67.4 and 44.4 points per team). NFL
comparisons use the shared operator in `scripts/mechanics/metrics.py`.

## Who stops runs

`scripts/diag/runblock/run-attrib.ts` observes every designed handoff (no
reads, decisions or RNG) and classifies the first defender to reach the back.

- 39-42% of designed runs gain 1 yd or less.
- On those, 67-71% of first stoppers had **shed** their block, almost all
  DL, meeting the back 1.1-1.4 yd behind the line.
- 93% of sheds are the automatic leverage break (`|phi| >= 1.1` against the
  blocker's fixed drive line); the rated shed roll is only 7%.
- In the 0.5 s before a stopper's leverage shed, the defender gains 0.5-0.6 yd
  toward the ball relative to his blocker while the blocker travels 0.3-0.4 yd
  along his own drive line: the pair circles, the blocker does not brace
  against where the defender is going.
- 10+ yd runs come from the opposite failure: second-level defenders never
  assigned or never reached.

## The line does not move laterally

`scripts/diag/runblock/line-flow.py`, NFL 2022 vs sim at 1.5 s:

| Mean lateral motion | NFL OL | NFL front | Sim OL | Sim front |
|---|---|---|---|---|
| Outside zone | 3.42 yd | 2.80 | 0.72 | 0.45-0.53 |
| Inside zone | 1.80 | 1.50 | 0.82-0.90 | 0.38-0.46 |
| Gap/pull | 0.82 | 0.80 | 0.28-0.30 | 0.26-0.33 |

NFL zone linemen move laterally from the snap (0.58 yd by 0.5 s) and fronts
flow with them at arm's length. Sim zone linemen take a short first step,
attack the defender's current shoulder and stall chest to chest. Engaged pairs
then move laterally at about the defender's requested speed.

**Change on this branch:** zone linemen (OZ/WZ run, IZ/split press) run the
track toward the play side before contact and meet the playside shoulder while
moving (`RunBlocker.zoneFlow`). Doubles/checks keep their own coordination.
Outside-zone line flow rises from 0.72 to about 1.1-1.4 yd; outcomes on its own
are mixed. All 12 guards hold. Contract tests: `test/zone-flow.test.ts`.

## Pullers start late

`scripts/diag/runblock/pullers.py`: NFL power/counter pullers are 0.5 / 1.9 /
3.5 yd wide at 0.5 / 1.0 / 1.5 s; sim 0.1 / 1.0 / 2.5. Peak speed and depth
match. A diagonal first waypoint barely helped, so the delay is in the start.

## Tried and not kept

- Lane-frame leverage (blocker keeps the defender's path to the installed
  track): fewer stuffs, but blockers gave ground; a second variant was worse.
- Keeping the stretch drive after the zone read; moving gaps from observed OL
  positions; felt (touch) flow for engaged defenders: little or conflicting.
- Defenders stepping around a blocker instead of driving through him: cleaned
  up the backfield picture and improved outcomes, but it bans a behavior
  instead of asking why driving through a set blocker works. Not kept.

## Next: why does driving through a blocker work?

Engaged DL end 0.7-0.8 yd in the backfield at 3 s (NFL +0.2 pushed back).
Before any controller rule, run a controlled 1v1 panel: an average DL drives
straight through a set blocker for 2 s across mass, strength, fatigue and
blocker bracing. Candidate physics causes, each testable:

1. No anchor advantage: yielding resistance costs the same force as driving.
2. The blocker's feet push along a fixed drive line, not against the load.
3. Effort is nearly free: two seconds of maximum isometric push costs about
   0.07 energy, under 1% force loss; recovery between plays is fast.
4. Push force saturates at strength about 73 (trench deep dive).
