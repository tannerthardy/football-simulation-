> Historical research rescued from `claude/pass-rush-hands` at `724a94cf4cf821d22dd30d3ed8cf2bfeadc737b9`.
> Its experiments and measurements describe that source. This integration
> imports the document only; it does not install that branch’s engine changes.

# Pass rush: independent hands, physical spins, partial recovery (experiment)

Flagged prototype, off by default: `HANDS2=1` (and `HANDS2_RECOVER=0` to
disable recovery). Production is unchanged. Inspired by the cross-chop, spin
and inside-hand recovery rep: the rusher chops the tackle's hands down and
spins, but the tackle gets one hand on him and slows him.

## What the engine did before

- Every rush move was a success roll: `rng.chance(logistic(skill - counter ...))`.
- A won spin flipped the rusher's working side (`e.side = -e.side`) with no
  body rotation.
- "Hands knocked off" scaled one center-to-center hand joint down for 0.3 s.
- The rep ended when the rusher's angle around the blocker reached 90 degrees
  (`|phi| >= 1`), unless a holding roll saved it.
- The World's tangential hand force fails the angular-momentum audit
  (`scripts/diag/hand-angular-law.ts`, KNOWN FAILURE, about 3.7 kg yd^2/s per
  case): the steering force pair acts at the two body centers with no spin.

## The prototype (`src/sim/hand-pair.ts`, hooks in `engagement.ts`)

No articulated arms; no World changes.

1. **Two hands.** Each blocker hand is an ordinary World hand joint with half
   the existing two-hand capacity, attached at a point on the rusher's torso
   in the rusher's body frame. Two hands equal today's joint exactly.
2. **Hands stay or go by geometry.**
   - A pressing hand slides over the jersey to the nearest graspable point:
     within reach of that shoulder, on the side of the torso facing the
     blocker.
   - It comes off when no such point exists, or when the torso turns under it
     faster than the arm can follow (yaw rate x torso radius > arm speed,
     scaled by hand technique).
3. **Chop.** `club`/`swim` become a chop on the blocker hand on the rusher's
   working side. It succeeds when the chop impulse beats that hand's grip
   impulse. Both come from arm force and hand technique, with timing noise.
4. **Spin.** The rusher requests continuous rotation away from the blocker and
   an inside heading. The World's yaw limits, traction-for-yaw cost and
   balance decide what he achieves.
5. **Recovery.** A free hand re-attaches on the blocker's next decision beat
   if a graspable point is in reach in his own delayed picture and on the live
   body.
6. **Rep end.** The rep ends at 90 degrees only when no hand is attached.

Other moves (bull, rip, speed, longarm, snatch) still use the success roll.

## 1v1 panel (`scripts/diag/passrush/panel.ts`)

Right tackle vs edge rusher, QB fixed at 7 yd, everyone else removed. Same
start, players, ratings and seeds in every arm; moves scripted identically.
30 seeds per cell; two matchups, **even** (tackle 75, rusher 75) and
**rusherEdge** (tackle 65, rusher 90).

| Even matchup | Pressure | Reached QB | Closest to QB | Hands 2/1/0 (share of engaged time) | Rusher fell |
|---|---|---|---|---|---|
| Baseline, speed / chop / chop-spin | 0.67 / 0.67 / 0.67 | 0.47 each | 2.07 yd each | single joint | 0.20 |
| HANDS2 speed | 0.63 | 0.63 | 1.98 | 0.98 / 0.01 / 0.01 | 0.03 |
| HANDS2 chop | 0.80 | 0.77 | 1.62 | 0.92 / 0.07 / 0.01 | 0.07 |
| HANDS2 chop-spin | 0.90 | 0.87 | 1.19 | 0.86 / 0.07 / 0.07 | 0.00 |
| HANDS2 chop-spin, no recovery | 1.00 | 0.90 | 0.85 | 0.36 / 0.60 / 0.04 | 0.07 |
| Baseline bull | 0.83 | 0.60 | 1.45 | single joint | 0.27 |
| HANDS2 bull | 0.83 | 0.83 | 1.18 | 0.99 / 0.01 / 0.00 | 0.00 |

- **Spin rotation:** 5.6-6.0 rad in chop-spin vs 3.7-4.3 otherwise; peak yaw
  7.0-7.6 rad/s.
- **Recovery:** 1.5-1.9 hands regained per chop-spin rep, 0.9 per chop.
- **rusherEdge** shows the same ordering. There recovery barely changes the
  closest approach (0.92 vs 0.91 yd).

**Timestep consistency.** Fixed 12 vs 48 World substeps agree in both arms:
closest approach within about 0.05 yd, identical hand fractions, spin rotation
within about 0.4 rad.

**Native games** (two 8-game seeds):

| | Baseline | HANDS2 | NFL 2022 |
|---|---|---|---|
| Pass blocks still engaged at 2 s (mean) | 0.91 | 0.89 | 0.82 |
| Pressure within 2 yd before throw | 0.21 / 0.29 | 0.22 / 0.29 | 0.31 |
| Nearest defender to QB at throw (median) | 4.1 / 3.9 yd | 3.8 / 3.4 yd | 3.0 yd |
| Points per team | 55.9 | 55.3 | - |

All 12 guards hold.

**Tests.** With the flag off, all 1069 tests pass. With it on, only the frozen
solo pass-rep hash fails, as designed for any change to that rep. The
angular-law audit is unchanged; the World is untouched.

## Assessment

**What it improves**

- Finesse moves now have physical consequences. In the baseline, speed, chop
  and chop-spin were indistinguishable.
- A spin is a rotation bounded by the body's own yaw and traction limits.
- One-hand states exist and recovery happens.
- Rushers stop falling from scripted failure punches.
- About 220 lines, isolated, no new physics.

**What it does not do (failures)**

- **Recovery does not slow the rusher in time.** It increases the closest
  approach (0.85 to 1.19 yd, even matchup) but not pressure timing (1.80 s
  either way), and does nothing in the rusherEdge matchup. A single
  center-to-center hand cannot pull a shoulder or turn the rusher. That needs
  hand forces applied at the contact point with a matching body spin, which is
  the open angular-law repair.
- **One hand on a beaten rusher keeps the rep alive** with no holding check.
  A hand on his back should usually be a hold. Not modeled.
- **Bull rush changed:** longer engagements, later pressure (1.85 to 2.35 s,
  even), more rushers reaching the QB (0.60 to 0.83). This comes from the
  one-hand rule, not from physics the bull rush needed.
- Chop success is still a force comparison from ratings with noise, not a
  solved arm interaction.
- Rip, swim (except as a chop), speed, longarm and snatch still roll dice.
- Pass reps only. Run reps (a DL ripping one hand off a run blocker) are not
  covered.

**Recommendation.** Keep it behind the flag; do not merge. The simple model
reproduces the visible sequence (chop, rotation, lost and regained hands). But
the football payoff the clip shows, a single hand that slows the rusher just
enough, needs contact-point hand forces with rotation, the same repair the
angular-law audit already asks for. Do that repair first in the World, then
re-run this panel. Add holding for hands behind the rusher before any
production use.

## Reproduce

```sh
node --import tsx scripts/diag/passrush/panel.ts --seeds 30
HANDS2=1 node --import tsx scripts/diag/passrush/panel.ts --seeds 30
HANDS2=1 HANDS2_RECOVER=0 node --import tsx scripts/diag/passrush/panel.ts --seeds 30 --out out/passrush/h2-norecover.json
HANDS2=1 node --import tsx scripts/diag/passrush/panel.ts --seeds 15 --substeps 12   # and 48
node --import tsx scripts/diag/passrush/debug-rep.ts club,spin,speed 1000           # one rep, tick by tick
```
