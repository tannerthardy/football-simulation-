# Validating the "runner leaves installed aim toward a nearby defender" detector

Date 2026-10-27. Code: develop `55cc9e57` with the run-only harness from #329
(`4039cc84`). Diagnostic only; no behavior change.

## Question

The candidate detector `phantomlane` (`scripts/scorecard/weird/detectors.ts`)
fires on 59% of run plays on run-only film. Are its events real bad reads by
the runner, forced choices between unblocked defenders, or detector false
positives?

## What the detector measures

It fires on any tick, in front of the installed aim point, where both of these
hold:
- the runner's travel direction is more than 30° off the bearing to the
  **static installed aim**;
- some defender is 0–3 yd ahead along that direction and within 1.5 yd of it.

It does not check:
- whether that defender is blocked;
- which carrier branch is steering;
- whether that branch's target is still the installed aim.

## Method

**Sample.**
- Run-only seed 11, 2 games:
  `npm run weird -- 11 --games 2 --run-only --all` on the #329 head.
- 170 `phantomlane` events.
- 20 drawn by a fixed shuffle (mulberry32, seed 11), excluding nullified plays.

**Evidence.**
- Each play is re-run from its captured setup; its yards match the film's
  yards on all 20.
- Everything is measured at the detector's worst qualifying tick: the named
  defender ahead and closest.
- What is recorded there:
  - which carrier branch is steering: designed phase, post-design crease read
    (`runReadAim`) or open-field evaluator;
  - the named defender's true engagement and blocker;
  - unblocked front-seven defenders within 4 yd;
  - a passive shadow `evaluate` (a fresh carrier, no trace, tags restored)
    for whether any unblocked lane existed.

Labels were fixed before any event was inspected:

| Label | Rule |
| --- | --- |
| Detector false positive | The named defender is engaged by a blocker (the runner is pressing or cutting off a block), or the runner is steering to his own current target rather than leaving one. |
| Forced choice between unblocked men | The named defender is unblocked and the runner's shadow evaluation finds no unblocked lane. |
| Real bad read | The named defender is unblocked and the shadow evaluation had an unblocked lane the runner did not take. |

An unblocked front-seven defender in the runner's path is also flagged as an
**upstream blocking failure**.

## Result

| Label | Count | Events |
| --- | --- | --- |
| Detector false positive (defender engaged) | 15 | G2-P149, G2-P137, G2-P021, G1-P086, G1-P106, G1-P125, G2-P167, G1-P050¹, G2-P159, G2-P104, G1-P087, G1-P018, G2-P072, G2-P047, G2-P030 |
| Forced, no unblocked lane (all upstream blocking failures) | 3 | G2-P036 Wide Zone, G1-P105 Trap, G1-P145 Power |
| Possible real bad read (weak) | 2 | G2-P160 Counter, G2-P118 Duo |

¹ No tick in my recomputation met the detector's window. At the closest approach the defender is DE_W, engaged by LG, 1.56 yd lateral.

**Detector false positives.** 15 of 20 name a defender who is engaged at that
tick, blocked by C, LG, RG, RT, H or X. The runner is pressing or cutting off
the block, which is what the design asks of him.

Separately, 13 of the 18 events with a qualifying tick happen in the
post-design crease read. There the runner steers to `runReadAim`'s entry
point, not the installed aim, so the detector's "leaves installed aim"
premise does not describe a decision.

**Forced, upstream blocking.** In all three the shadow evaluation's best lane
is itself blocked, and two or three front-seven defenders are unblocked
within 4 yd:
- **G1-P105 Trap:** the trap target DT_S is unblocked 0.42 yd ahead in the
  designed phase, so the kick-out had not arrived.
- **G1-P145 Power:** DT_S, LB_M and LB_W are free.
- **G2-P036 Wide Zone:** DT_W and LB_M are free, with a DB ahead.

These belong to the blocking findings in the run-game diagnosis (pullers late,
backers unblocked 44% vs NFL 15%), not to the runner.

**Possible bad reads, both weak.**
- **G2-P160 Counter, crease read.** DE_W is free at the edge of the window
  (2.95 yd ahead, 1.52 yd lateral). The shadow evaluation had an unblocked
  lane 24° from his travel.
- **G2-P118 Duo, open field.** He holds his previous decision beat's heading
  (20°) while a fresh evaluation would pick 0°. That is decision cadence, and
  LB_W, the Duo's climb target, is unblocked in front of him.

## Conclusion

Real bad reads are not common: at most 2 of 20 (10%), and neither is clean.
So, per the brief, I did not look for a first wrong stage in `carrier.ts`.
The detector mostly flags runners pressing blocked defenders (15 of 20), and
its "installed aim" reference is stale whenever the crease read is steering
(13 of 18). Where the runner really had no lane, the cause was an
unblocked front-seven defender upstream.

**Suggested detector repair** (tools owner; not done here). These changes are
cheap and follow from the evidence:
- Ignore defenders that are engaged, or seen touching a blocker.
- Compare against the runner's current steering target (`opts.aim`, the press
  entry or the crease entry), not the installed aim.
- Report the steering branch with each event.

That would leave roughly the 5-in-20 residue above to judge, most of it
blocking.

## Reproduce

Scratch tools live in ignored `out/runonly/`, run from a #329 worktree:
- `film-setups.ts 11 2` captures each film play's setup under its film id.
- `label-probe.ts 11 out/weird/ro-s11.json 20` prints one JSON line of
  evidence per sampled event.
