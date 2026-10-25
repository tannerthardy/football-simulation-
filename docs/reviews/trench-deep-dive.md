> Historical research rescued from `claude/trench-investigation` at `b6a48f1dafa1ed747290edc22111ef99abeb508a`.
> Its experiments and measurements describe that source. This integration
> imports the document only; it does not install that branch’s engine changes.

# Trench deep dive: why defensive linemen get driven back

Local investigation on branch `local/trench-investigation` (not pushed). All
experiments are behind environment flags; production behaviour is unchanged
unless a flag is set. NFL numbers come from Big Data Bowl tracking (2022, with
2017 as a check) measured by the shared mechanics code; sim numbers come from
two independent 8-game samples (seeds 101 and 202) unless stated.

## Short answer

Defensive linemen get driven back because a run-block rep in the sim is a
**straight-line shoving match decided by body weight**, while an NFL rep is a
**lateral, leverage-and-position battle in which weight barely matters**.

Three things combine:

1. **The defender's request mirrors the blocker's drive.** In `stepRunRep`
   the engaged defender asks to move along `-drive × 1.5`: exactly against the
   blocker's drive vector, including its lateral part. On zone runs this
   cancels the lateral flow that defines the play, and turns every rep into a
   head-on push.
2. **In a head-on push, the force ceiling is proportional to body weight.**
   `pushForce = min((0.55 + 0.75·strength)·m·g, 1.1·m·g)`. For a strength
   rating above about 73, the ceiling is exactly 1.1 × body weight (80% of sim
   offensive linemen and 59% of defensive linemen). An engaged defender who is
   being driven back is at that ceiling on 98% of ticks. So a 5% weight edge
   becomes a steady drive. Pad level only affects tipping, not force or
   traction, and the existing 1.2× eccentric term never takes effect because
   total force is capped at the same push-force number.
3. **Nothing makes resistance grow as a defender is driven.** No anchor, no
   lowering of the pads, no escape. Once a mismatch starts moving him, it keeps
   moving him until the whistle (74% of driven reps end at the whistle; only
   2% end in a shed).

## Evidence

### The NFL shape of line play is lateral; the sim's is not

Lateral movement toward the side the back went, at 2.0 s, medians (yd):

| Concept | NFL OL | NFL engaged DL | NFL back | Sim OL | Sim engaged DL | Sim back |
|---|---|---|---|---|---|---|
| Outside zone | 5.0 | 4.5 (98% playside) | 5.3 | 0.4 | 0.0-0.1 (about 30% playside) | 1.9-2.0 |
| Inside zone | 2.6 | 2.3 (87% playside) | 1.6 | 0.4-0.5 | 0.1 | 1.4 |
| Gap / pull | 2.2 | 1.1 | 2.3 | -0.2 | 0.1 | 1.3-1.5 |

Engaged NFL defensive linemen move a median 2.3 yd sideways by 2 s (90th
percentile 5.3); sim ones 0.4-0.5 (90th percentile 1.3-1.4).

### Moment to moment, pushing is similar; what differs is the outcome shape

Backward speed of engaged defenders: about 15% of ticks above 1 yd/s in the NFL
and 11-22% in the sim, with similar 90th percentiles. Persistence is also
similar (NFL 85% still moving back 0.5 s later, sim 73-76%). The differences
are the lateral component above and the tail: furthest drive at 3 s, 90th
percentile, NFL 2.5 yd (2017: 2.5) vs sim 4.1-4.6.

### Weight decides sim reps and not NFL ones

Median backward speed of engaged defensive linemen by blocker/defender weight
ratio (yd/s, + = driven back):

| Ratio | 0.90 | 0.95 | 1.00 | 1.05 | 1.10 | 1.20 | 1.30 |
|---|---|---|---|---|---|---|---|
| NFL 2022 (nearest OL within 1.5 yd) | +0.05 | -0.05 | -0.05 | 0.00 | -0.02 | -0.18 | -0.15 |
| Sim baseline (single blocks) | -0.37 | -0.05 | +0.20 | +0.52 | +0.45 | +0.15 | +0.38 |

Tighter NFL controls agree: true single blocks on zone runs drift a similar
+0.2 to +0.5 yd per second at every ratio from 1.00 to 1.30, and PFF-labeled
interior pass-block pairs (guard/center vs defensive tackle) let the rusher
gain 3.5-3.9 yd by 2 s whatever the ratio (0.85-1.20). Tracking cannot see
forces, so this shows that *outcomes* do not track weight in the NFL, not that
weight is physically irrelevant.

### Double teams

NFL backward speed is the same with one or two offensive linemen on the
defender (share above 1 yd/s: 0.16 vs 0.15). In the sim, doubles drive more
(0.17-0.22 vs 0.11-0.13) and last longer (spells of 1.5 s or more: 43% vs NFL
30-36%).

### Which force limit binds

Engaged run-block ticks, from an instrumented world:

| Situation | Defender at force ceiling | Blocker at force ceiling |
|---|---|---|
| All engaged ticks | 89% | 59% |
| Defender being driven back > 0.5 yd/s | 98% | 43% (+48% on his force-velocity curve) |
| Stalemate | 76% | 63% |

The traction term itself binds under 0.2% of the time; the binding limit is
`pushForce × direction factor`, which for saturated players equals
1.1 × body weight × direction factor.

## Experiments (all behind flags, both seeds)

| Variant | Furthest drive at 3 s, p50 / p90 (NFL 1.0 / 2.5) | Weight sensitivity | Zone lateral flow (OL/DL, NFL IZ 2.6/2.3, OZ 5.0/4.5) | Run yards p50 / p90 (NFL 3 / 10) |
|---|---|---|---|---|
| Baseline | 1.1-1.5 / 4.1-4.6 | strong | 0.4 / 0.1 | 2.0-2.1 / 11-12.6 |
| `TRENCH_LEV=1` leverage → ground load | 1.0-1.7 / 3.9-4.0 | flatter to 1.2, strong above | unchanged | 1.9-2.6 / 10.6-11.5 |
| `TRENCH_FLOW=2` keep gap shoulder, flow, lead the blocker | -0.3 / 3.0-3.4 | flat, but defenders gain ground everywhere | IZ 1.3-1.6 / 1.6-1.8, OZ 1.8-2.1 / 1.9-2.2 | 1.9-2.7 / 9.6-11.2 |
| `TRENCH_FLOW=3` as 2, but hold/attack the point of contact | -0.2 to -0.1 / 3.2 | flat (-0.05 to -0.13) | IZ 1.4-1.7 / 2.0-2.2, OZ 1.8-2.1 / 2.0-2.3 | 1.8-2.9 / 8.3-11.7 |
| `TRENCH_FLOW=3 TRENCH_ATTACK=0` pure hold | 0.2-0.3 / 4.0 | flat | similar | 2.5-3.1 / 12.2 |

| `TRENCH_ECC=0.4` eccentric reserve only | 0.3-1.3 / 3.5-3.6 | reduced, still rises above 1.2 | unchanged | 1.9-2.3 / 10.0-10.9 |
| **`TRENCH_FLOW=3 TRENCH_ATTACK=0 TRENCH_ECC=0.4`** technique + anchor | **0.1 / 2.6-2.9** | **flat (+0.01 to +0.05; +0.13 at 1.35)** | IZ 1.9-2.1 / 2.0-2.5, OZ 1.4-1.5 / 1.7-1.8 | 2.4-3.3 / 10.4-15.9 |

The combination matches the NFL tail (2.6-2.9 vs 2.5) and the NFL's
indifference to weight, without changing strength or mass. Inside-zone lateral
flow reaches the NFL's (about 2 yd). Still off: the median drive is too small
(0.1 vs 1.0 yd: defenders give too little ordinary ground), outside-zone flow
is about a third of the NFL's (the back and the offensive line still don't
stretch the play), gap/pull plays drift backside, and outside zone keeps a
noisy long-run tail. Leverage coupling (`TRENCH_LEV`) adds little on top of the
technique change in these samples.

Run yards and points stay dominated by other problems (the passing game and
open-field tackling): use the mechanism rows, not the scoreboard, to judge
these variants.

## What we are doing wrong, broadly

1. **Run-blocking reps are modelled as a duel along one axis.** The real
   battle is two-dimensional: blockers try to get their head across and turn
   the defender; defenders try to keep a shoulder free and beat the blocker to
   a spot. Most real displacement is sideways, with the flow of the play.
2. **Defender technique is a single fixed request.** Every engaged defender
   pushes the same way at the same speed with the same posture (0.85), whatever
   his assignment, the blocker's movement or how the rep is going. The model
   has no notion of holding a point, giving ground grudgingly, anchoring, or
   escaping.
3. **Gaps are fixed points on the field.** `gapY` is measured from where the
   ball was at the snap. Real gaps are the spaces between moving blockers; on
   zone they move several yards.
4. **Force ceilings are body weight with a cap.** Strength above about 73 is
   invisible, and in a head-on push weight decides. How well a player can
   *apply* his force (base, stance width, pad level, direction) has little
   effect on the ceiling.
5. **The tail has no brake.** Nothing in physics or control makes a driven
   defender harder to move the further he goes.
6. **The back doesn't stretch the play.** On outside zone the sim back is
   about 2 yd lateral at 2 s against 5.3 in the NFL, so the defense is never
   forced to flow.

## Proposed path

Ordered by value and risk. Each step is gated by the measurements above, not by
yards or points.

1. **Engaged defender technique (controller).** Replace the mirrored request
   with: keep the assigned gap-side shoulder on the blocker, anticipate his
   lateral movement, and hold (or, for an attacking fit, win) the point of
   contact. This is variant 3; it removes the weight dependence without
   touching physics. Gate: weight-sensitivity curve flat near 0; lateral flow
   per concept; drive median near 1 yd and p90 near 2.5.
2. **Gaps relative to blockers (controller).** Define each gap from the
   current, perceived positions of the blockers that bound it, for both free
   and engaged fits. Gate: unblocked defenders' lateral flow per concept.
3. **Zone footwork and landmarks (controller).** Offensive linemen's lateral
   first steps and run-to-landmark on outside zone; the back's outside-zone
   landmark (NFL about 5 yd lateral at 2 s). Gate: OL and back lateral at 2 s.
4. **A brake on long drives (physics, careful).** The eccentric reserve
   (`TRENCH_ECC`) is the simplest version that worked: a braced player being
   driven against his own lean resists up to about 1.4 times his concentric
   limit, rising within a few tenths of a yard per second. It needs a source
   for the 1.4 and the rise rate before it ships, and an alternative to test is
   a defender anchor response (lower pads, wider base) that the physics rewards.
   Gate: drive p90 near 2.5 yd without moving the median below about 0.5.
5. **Strength and application (physics, research first).** Separate leg
   strength from traction so ratings above 73 matter; make usable force depend
   on base and direction (the direction factor already does part of this);
   consider leverage coupling to ground load. Gate: weight sensitivity stays
   flat, pad level and base become measurable advantages in controlled reps.
6. **Double-team release.** Release the second blocker on a visible
   linebacker cue, so doubles last about as long as the NFL's.

Add the lateral-flow, weight-sensitivity, persistence and double-team checks
to the mechanics report so every later change is measured against them.

## Reproduce

```sh
git checkout local/trench-investigation
node --import tsx scripts/diag/drive-trace.ts 3 21 out/trench/drive-base.json   # per-tick rep trace
python3 out/trench/analyze.py out/trench/drive-base.json                        # driven vs held
python3 out/trench/doubles.py; python3 out/trench/persistence.py; python3 out/trench/flow.py
python3 -I out/trench/mass_nfl.py; python3 -I out/trench/mass_nfl2.py           # NFL weight studies
out/trench/ab.sh flow3 TRENCH_FLOW=3 TRENCH_LEAD=0.5                             # an experiment, both seeds
python3 out/trench/compare_ab.py flow3
```
