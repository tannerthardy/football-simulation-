# Live gaps: a run game that reads the bodies, not snap coordinates

Controller session, `claude/live-gaps`. Work in progress, **not merged**:
outside-zone outcomes regress until the run leverage shed is repaired (below).

## The problem

- Defensive gaps were snap-time coordinates (`gapY`: ball + 0.65/1.95/3.25/
  4.2-4.6 yd). They did not move when the line moved.
- Free defenders reacted to only the first pulling guard/tackle, by at most
  1.5 yd.
- Zone blockers took a fixed short first step, then attacked the defender's
  current shoulder. Doubles never ran the track.
- The runner pressed a fixed snap-time aiming point.

## What changed (each switchable for A/B)

1. **Live gaps** (`src/sim/live-gaps.ts`, `LIVE_GAPS=0` off). Gaps are counted
   outward from the center in the observer's delayed picture of the surface
   (OL and inline ends). A puller or climber leaves the surface; if his stance
   lay between present bodies he leaves a vacancy, so neighbours keep their
   gap names. Equal to `gapY` at the snap. Used by free run fits and the
   engaged first-level stack shoulder. Tests: `test/live-gaps.test.ts`.
2. **Read the guards** (`PULL_READ=0` off). Every puller a free fit sees
   (off the surface, behind the line, moving across) shows where a blocker
   will arrive; the fit flows to keep box/spill leverage on his arrival, never
   against the pull.
3. **Zone track** (`ZONE_FLOW=0` off). Before contact, zone linemen (and
   stretch doubles) ask for the lateral speed that puts them on the
   defender's predicted playside shoulder when they meet, **planned with their
   own acceleration law** (speed approaches the request with time constant
   tau, so a short early distance needs an explosive start). Hips open half
   way toward the track. The first step uses the same plan.
4. **Teammates know the call.** Teammate spacing predicted a neighbour from a
   0.2 s old picture (standing still at the snap), so every zone lineman
   braked for the man beside him. A lineman running the called track now
   publishes the call's tempo (`Behavior.calledMotion`), and spacing predicts
   him from it. Private live decisions stay private.

Inside/split-zone doubles keep their own check/help/climb coordination.

## Findings on the way

- In the first second of outside/wide zone, about 45% of lineman decisions
  were unreleased doubles that never ran the track.
- From a standstill the body law gives about 0.35 yd/s after 0.3 s for a
  1.7 yd/s request, but full effort covers about 0.55 yd in 0.5 s (NFL OL
  0.58). The body could; the controller never asked.
- With OL spacing disabled entirely, OL displacement at 1.5 s rose 0.94 to
  1.28 yd: the stale teammate picture was a major brake.

## Results

`scripts/diag/zone-flow.ts` (paired inputs), median OL / DL play-side
displacement at 1.5 s:

| | Before | After |
|---|---|---|
| Outside zone | 0.60 / 0.63 | 1.13 / 0.94 |
| Wide zone | 0.67 / 0.70 | 1.14 / 0.98 |
| Inside zone | 0.61 / 0.61 | 0.94 / 0.82 |
| Power, counter | unchanged | unchanged |

Games (two 8-game cohorts, `scripts/diag/runblock/ab.sh`):

| | All off | Package | NFL |
|---|---|---|---|
| OZ OL lateral flow at 1.5 s | 0.68 / 0.66 | 1.48 / 1.54 | 3.40 |
| IZ OL lateral flow | 0.74 / 0.68 | 1.06 / 0.94 | 1.80 |
| Gap/pull OL flow | 0.26 / 0.28 | 0.30 / 0.34 | 0.82 |
| OZ front (box) flow | 0.42 / 0.45 | 0.65 / 0.57 | 2.80 |
| Outside zone median / <=1 yd / 4+ | 2.2 / 0.45 / 0.37 | 1.3 / 0.47 / 0.26 | - |
| Inside zone median / <=1 yd | 2.7 / 0.26 | 2.5 / 0.27 | - |
| Gap/pull median / <=1 yd | 1.4 / 0.43 | 1.4 / 0.44 | - |

All 12 mechanism guards hold. Live gaps alone (no OL change) slightly
improved runs in both cohorts (median 1.57/2.09 to 1.90/2.24).

## Why outside zone got worse: the leverage shed

OZ/WZ runs of 1 yd or less are stopped by a DL who **shed before contact**
(47 of 68 before, 61 of 77 with the package), 1.3-1.5 yd in the backfield.
`stepRunRep` frees a defender whenever `|phi| >= 1.1` measured against the
blocker's **fixed drive line** (`engagement.ts`). A running zone blocker who
gets ahead of his man produces exactly that angle; the rule awards the
defender a free release. In real football the same picture is the backside
of a reach: the cutback lane. This is an awarded outcome, not physics, and it
is the next repair. A live runner aim (aiming point read from live gaps) was
tried and made it worse (OZ median 0.9); it was reverted.

## Next

1. Replace the run leverage shed with an outcome the bodies decide (hand
   load and position relative to the runner's lane), in controller scope.
2. Then the runner: press, then read the frontside defender (bounce / up /
   back) from live gaps.
3. Defensive gap exchange when a defender is reached or washed.
