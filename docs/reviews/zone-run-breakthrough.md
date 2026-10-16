# Zone run game: what was actually failing, and the runner fix that transfers

2026-10-16, Claude. Branch `claude/zone-run-breakthrough` from accepted
`develop` **c3264b0** (#107, which includes the #104 inline-reach admission).
Not integrated; every change is behind a default-off flag and default runs
are unchanged (1,663 fast tests pass with the flags off).

## Summary

The largest repeated failure in the zone run game was not blocking. It was
the **ball carrier's picture of the line**. From the handoff to the line of
scrimmage the back is steered by the crease reader (`runReadAim`) for 65–80%
of his ticks in every zone family, and that reader:

1. built openings only from **offensive** bodies, so a defender standing in a
   gap did not close it;
2. scored risk as a soft linear time margin, so near the line a defender
   already *in* the hole cost about as much as being two yards off the aim;
3. never checked whether the run to the entry crossed bodies;
4. in the open-field evaluator, treated an engaged defender as a delayed
   threat rather than a body in the lane;
5. before reading at all, ran blind at the painted aim ("designed" press),
   whose D-gap landmark sits 0.7 yd outside the end man even when the
   defensive end is standing there.

The result: on outside/wide zone **41–46% of first contacts were by an end
still engaged with his blocker, at a median gain of about 0**, and the back
lost his momentum in the pile (yards after contact 0.9 vs 1.5 against a free
defender, backwards from real football).

`RUN_LANE` rewrites that read from the runner's own perceived picture (no
private state). It **transfers across concepts and formations it was never
developed on**, which is the property asked for. Combined with
`CLIMB_EXIT` (double-team climbers rip off the hip instead of orbiting the old
defender), the matched lab improves:

| Arm (same bodies, seeds, looks) | Plays | Median gain | 4+ yd | Negative | Mean |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ace12 IZ/OZ/WZ baseline | 1,200 | 1.87 | 25% | 16% | 4.03 |
| Ace12 `RUN_LANE` + `CLIMB_EXIT` | 1,200 | **3.31** | **42%** | **11%** | 6.37 |
| Gun/pistol/I zone baseline (never used in development) | 1,800 | 2.24 | 29% | 13% | 4.23 |
| Gun/pistol/I zone, both flags | 1,800 | **3.34** | **43%** | **10%** | 5.93 |

Per family on Ace12: inside zone 2.76 → 4.50, outside zone 1.25 → 2.62, wide
zone 1.42 → 3.10 (median). Every transfer formation × concept cell improved
(9/9; e.g. I-formation wide zone 1.17 → 2.85, gun wide zone negatives 22% → 14%).
Gap schemes, which share the reader, also improve (power, counter, trap,
Duo; table below).

## How this was found (independent of earlier analyses)

A new zone lab (`scripts/diag/zone-lab/`) runs the run-action suite's exact
looks and rosters (10 fronts/coverages incl. pressure, 2 roster pairs) for
IZ/OZ/WZ in both directions, at 0.5 s per play, records 10 Hz film, and
renders frames as images. Diagnostics added there:

- `attrib.py`: who made first contact and in what block state (engaged,
  shed his assigned blocker, assigned but never touched, unassigned).
- `leverage.py`: for engaged first contacts, was the back on the defender's
  free side or his blocker's side.
- `oracle.ts`: a **counterfactual entry oracle**. The sim is deterministic,
  so replaying a play from the snap with an override from the handoff is an
  exact branch; each branch forces the back to one of 15 lateral entries and
  the ordinary carrier takes over past the line. It separates decision error
  from blocking failure (diagnostic only; it uses outcomes no player has).
- `combos.py` / `climbs.py`: double-team release timing and climber travel.

Findings, ranked by frequency × consequence:

1. **Runner vision near the line** (above). Fixed with `RUN_LANE`.
2. **Double-team departures strand the climber.** A released climber whose
   straight line to the backer is blocked "orbits" the old defender 0.35 rad
   per read at walking pace (requested ~1 yd/s), or stands when no route
   shows. Climbers travel 0.5–0.8 yd in the half-second after release;
   36–61% are effectively stuck. Fixed with `CLIMB_EXIT`.
3. **Stretch edge: the end beats the TE/wing around his outside shoulder**
   into the backfield. With both flags, 116 of 129 negative stretch plays
   (90%) have the playside end as first contact, typically 2 yd deep. The
   adjacent double often releases while the keeper is visibly losing.
   Not fixed (see `COMBO_SECURE`, parked).
4. **Double-team release timing is a real trade-off.** Backers start to flow
   at ~0.75 s; doubles release at ~1.2 s median (late), and about a fifth of
   stretch doubles never release. Releasing earlier reaches the second level
   (backers loaded before contact 25% → 41% on OZ) but loses the first level.
   Two attempts did not net-improve; parked.
5. **Open-field finishing.** Runs of 40+ yd were already 2.1% at baseline and
   are 3.5% with the better runner (NFL: well under 1%). They contain about
   two broken or missed tackles each, with a defender within ~1.9 yd: a
   tackle-finishing problem, not a zone-blocking one.
6. **Inside zone is now too productive before contact** (median 1.6 yd at
   first contact vs NFL 0.7). The better reader exposes soft inside-zone
   fits; the defensive response is the next defensive question.

What did **not** cause failures: the line does move laterally (no backward
collapse), handoff/crossing times are within NFL scale (1.5 s / 2.7 s vs
NFL 1.3 s / 2.5 s), and runners do not reverse field (far-backside entries
≤ 2% before and after).

## The changes

All default-off and registered in `config/baseline.json`.

### `RUN_LANE` (carrier.ts) — recommended candidate

`creaseAim` replaces `runReadAim`'s scoring when the flag is on:

- **Openings from every body at the line, both teams**, plus a sample of the
  line every yard (a lateral projection hides seams in front of a defender a
  yard deep; the 2D checks below judge the samples).
- **The earliest defender decides** an entry (as in the open-field read),
  hazard by his time margin, at the entry and two yards beyond.
- **Block leverage from the runner's picture.** A defender is held when a
  teammate's seen body is on him. He is late only for points on his
  blocker's side, by up to ~1.3 s while he is not seen sliding off the block
  toward the point; on his free side he is there now, with the engaged
  defender's shortened reach (the same 0.4 × reach the tackle code uses).
- **Route check**: the better of a straight run or a cutback dog-leg that
  flattens 1.2 yd behind the line before turning up; bodies on either leg
  are obstacles. He runs the chosen route's first leg.
- The **designed press reads** with the same function on the ordinary
  decision beat (designed aim keeps its preference pull; press tempo is
  unchanged), and engaged defenders obstruct lanes in the open-field read.

Information: reads only `sim.see` pictures, perceived pose and public body
size/reach. The existing acquired-entry test that removes private
engagement, fatigue, pose and motion passes with the flag on.

### `CLIMB_EXIT` (blocking.ts `ripOff`) — recommended candidate

A released climber whose straight line to his backer is blocked runs for the
tangent of the old defender's clearance circle on the shorter side, carrying
speed through it (`goTo … through 0.7 vmax`), and the departure ends when
the line is clear. World contact still decides whether he gets by.
Alone on top of `RUN_LANE`: IZ median 3.89 → 4.38, backers loaded before
contact 51% → 60% (IZ), 24% → 31% (OZ).

### Parked, kept for diagnosis

- `ZONE_COMBO`: release on the backer's flow, keeper qualified by hands,
  base and path leverage, climber chosen by distance to where the backer is
  going. More second-level access, worse first level; two attempts.
- `CLIMB_SPACE`: climb to the earliest point on the backer's line to the
  hole that the climber reaches first. Did not change climber geometry; the
  departure (now `CLIMB_EXIT`) was the binding constraint.
- `COMBO_SECURE`: no release from a partner visibly beaten around his
  shoulder (`|phi|` or `win` ≥ 0.5). Cuts outside-zone negatives 17% → 14%
  but holds inside-zone doubles too long (IZ median 4.38 → 3.86).

## Evidence tables

Ace12, 1,200 plays each (10 looks × 2 rosters × 10 seeds × 3 concepts ×
2 directions); same inputs in every arm.

| Arm | IZ med / neg | OZ med / neg | WZ med / neg | All med / 4+ / neg |
| --- | --- | --- | --- | --- |
| baseline | 2.76 / 8% | 1.25 / 20% | 1.42 / 22% | 1.87 / 25% / 16% |
| `RUN_READ=1` (existing parked read) | 2.82 / 9% | 1.32 / 19% | 1.33 / 24% | 1.82 / 23% / 17% |
| `RUN_LANE` first version | 3.86 / 4% | 1.82 / 16% | 2.11 / 18% | 2.41 / 31% / 13% |
| + press reads | 3.70 / 6% | 1.77 / 12% | 2.09 / 13% | 2.33 / 30% / 10% |
| + dog-leg routes | 3.89 / 5% | 1.88 / 16% | 2.70 / 16% | 2.75 / 35% / 12% |
| + `CLIMB_EXIT` | 4.38 / 4% | 2.04 / 17% | 2.55 / 16% | 2.91 / 38% / 12% |
| + 2D line samples, perception-only (final) | 4.50 / 5% | 2.62 / 14% | 3.10 / 14% | 3.31 / 42% / 11% |

Gap schemes (Ace12 and I-pro, 200 plays per cell), baseline → both flags. Power
out of I-pro gains median but not negatives; Duo out of Ace12 (5.96) looks too
productive and belongs with the defensive-fit question below:

| Concept | Ace12 median | I-pro median | negatives |
| --- | --- | --- | --- |
| Power | 1.46 → 4.58 | 1.99 → 3.10 | 27→9%, 20→22% |
| Counter | 1.88 → 3.37 | 1.58 → 3.44 | 23→16%, 24→14% |
| Trap | 3.74 → 4.66 | 2.62 → 4.55 | 9→4%, 18→8% |
| Duo | 4.21 → 5.96 | 3.42 → 4.03 | 2→2%, 6→2% |

Mechanisms at NFL scale (final arm; NFL from the shared 2022 reference, a
scale, not a target): stretch gain 2.6–3.2 (NFL 3.0), yards before contact
0.8–1.1 (0.4), yards after contact 1.5–1.8 (2.6); inside zone gain 4.2–4.5
(3.0), before contact 1.6–1.7 (0.7). The back retreats no deeper after the
handoff and crosses the line at the same time as before.

## Contracts that change when the flags are on

Default (flags off): `npm test` 1,663/1,663 pass; typecheck clean.
With `RUN_LANE=1 CLIMB_EXIT=1`, exactly two existing contracts change, both
deliberate behavior changes on saved trajectories:

- `run-entry-opponent-information` "preserves the saved contrasting entry":
  the legacy reader's saved choice; the new reader chooses differently. Its
  information test (private state removed) passes.
- `planned-climb-fit`: the fixture's RT leaves a double at 0.9 s and with
  `CLIMB_EXIT` is 0.78 yd further upfield by 1.5 s, so the pinned near-strike
  geometry no longer holds. Vitest then exhausts memory rendering the
  failing Agent diff; the simulation itself does not run away.

New tests: `test/run-lane.test.ts` (defender in the called gap closes it near
the line — fails on the legacy reader; block-side protection; mirror
symmetry; cutback dog-leg; `CLIMB_EXIT` leaves at running speed). Four of the
five fail on the legacy code.

## Remaining problem areas and owners' next questions

1. **Stretch edge** (Run/contact): the end beats the TE or wing around the
   outside shoulder 1–2 yd into the backfield; 90% of remaining stretch
   negatives. Question: is the TE's reach technique physically
   achievable but mis-requested, or is the end's route unbounded?
2. **Double-team release** (Run): a principled release still trades first
   level for second level. `ZONE_COMBO` and `COMBO_SECURE` are measured
   starting points, not answers.
3. **Engaged-defender tackling** (Physics/tackling): eligibility is gated by
   `win = max(|phi|, 1 − base)`, where `phi` is the blocker's distance from his
   intended fit, not which side the runner is on. For reach blocks the
   defender is "winning" from the first frame (TE–end solo: 89% of reps). It
   is coarse rather than clearly wrong (occlusion already blocks reaching
   across the blocker); worth a contact-law review.
4. **Open-field finishing** (Physics/tackling): 40+ yd runs at 3.5% with
   ~2 failed tackles each.
5. **Inside-zone fits** (Defense): with a reading runner, inside zone reaches
   first contact a yard further than NFL scale; the backers' fit is the next
   defensive question. Do not cap the runner.
6. **Backside cutoffs on stretch** (Run/contact): engaged backside tackles
   slide with their blockers into the cutback lane; backside entries gain
   ~0 in the oracle.

## Reproduce

Node 22.23.3, from this branch:

```sh
# 4 shards, 1,200 Ace12 plays with film (about 75 s)
scripts/diag/zone-lab/run.sh base
scripts/diag/zone-lab/run.sh final RUN_LANE=1 CLIMB_EXIT=1
python3 -I scripts/diag/zone-lab/summary.py 'out/zone-lab/final-*.jsonl.gz'
python3 -I scripts/diag/zone-lab/attrib.py 'out/zone-lab/final-*.jsonl.gz' oz,wz
# transfer formations and gap schemes
SEEDS=77,71001,1,2,3 scripts/diag/zone-lab/run.sh tf RUN_LANE=1 CLIMB_EXIT=1 -- --formations gun_doubles_11,pistol_12,i_pro_21
SEEDS=77,71001,1,2,3 scripts/diag/zone-lab/run.sh gap RUN_LANE=1 CLIMB_EXIT=1 -- --concepts power,counter,duo,trap --formations i_pro_21,ace_12
# film of one play (needs matplotlib)
python3 -I scripts/diag/zone-lab/film.py out/zone-lab/final-0.jsonl.gz <case id> out/play.png
# counterfactual entry oracle
RUN_LANE=1 node --import tsx scripts/diag/zone-lab/oracle.ts --out out/zone-lab/oracle.jsonl.gz
```

`run.sh` sets a scratch Node path for this environment; elsewhere put
Node 22.23.3 on `PATH`. For a recorded receipt use
`npm run baseline:run -- --candidate --flag RUN_LANE=1 --flag CLIMB_EXIT=1 -- <command>`.
