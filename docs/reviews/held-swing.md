# Held legs: a leg hold costs the runner his steps

Main Engine, 2026-11-06. Develop `9a19ced9`, matched-restage captures for
seeds 7–8 (`b5cf5276`, `87ebf3d8`), restage environment `54199f26`. The flag
`HELD_SWING` is off by default.

## Question

Defense counted 82 broken DB tackles on 20+ yd runs. 45% were lunges at the
legs (hold 1.5–2.0 yd, legs 0.4–0.9) and 38% were arm's-length grabs.

Traced, a typical break (s11-24) looks like this:
- the safety dives from 1.7 yd behind and holds the lower legs from the
  ground;
- the back slows from 6.2 to 3.6 yd/s over 1 s but never leaves his feet;
- the hold slides out and slips.

So should a firm leg hold trip a back within a step or two?

## What the law did

`World` has a held-stride law, and it applies only when the holder is off his
feet. His hanging weight takes a share of the back's drive force, measured
against hip torque. It does two things only:
- it slows the runner;
- it does not stop the held leg from coming through, so the base keeps up with
  the body and balance is never threatened.

An upright holder binds nothing.

## Change (`HELD_SWING=1`)

1. **Arms around the legs resist the leg's swing, up to their grip.** This
   uses the same hip-torque budget as the hanging-weight law, whether the
   holder is up or down (the larger of grip and hanging weight).
   - One holder has one pair of arms. Joint copies share his grip
     (`gripCapacity`), so duplicates cannot add restraint.
   - Different holders' moments add.
2. **The strides it binds are steps the base does not take.** While he keeps
   travelling, his base falls behind his body by that share of his travel
   (`updateSupport`, recorded as the `legs` cause).
   - The existing capture-point balance and recovery stepping decide whether
     he falls.
   - Speed, the tightness and height of the hold, and his recovery ability all
     act through physics already in the World.

## Bench

`scripts/diag/_legtrip.mts` uses the full tick with real dice. A back runs
straight upfield with an SS directly behind him, 20 seeds per row.

| Case | Off: down / time / yards after | On |
|---|---|---|
| Dive from 1.8 yd, losing 2 yd/s (legs 0.82) | 1 of 19, 7.8 yd, 9 slip | 14 of 19, 0.25 s, 3.9 yd, 5 slip |
| Same, back at 5 | 2 of 19, 5.9 yd | 12 of 19, 0.25 s, 3.4 yd |
| Grab from 1.5 yd, same speed | 13 of 20, 1.25 s, 10.5 yd | 18 of 20, 0.60 s, 7.0 yd |
| Grab from 1.2 yd | 17 of 20, 0.95 s, 8.5 yd | 20 of 20, 0.35 s, 4.4 yd |
| Form wrap from 0.9 yd | 19 of 20, 0.95 s, 8.3 yd | 20 of 20, 0.25 s, 4.1 yd |

## Line-level contact (risk check)

Line contacts were already too abrupt (`docs/reviews/line-contact-finish.md`).
Using the same operator:

| | Off | On |
|---|---|---|
| Carrier speed at +0.3 s | 2.65 | 2.60 |
| Time to end | 0.95 s | 0.95 s |
| Front-branch speed at +0.3 s | 2.37 | 2.32 |
| Behind-branch speed at +0.3 s | 2.84 | 2.65 |

The change acts mainly on holds from behind, as intended.

## Matched restage

k = 5, 283 snaps, 1415 replays, paired, snap-clustered SE.

| | Off | On | Paired d |
|---|---|---|---|
| All | 7.94 | 7.07 | −0.87 ± 0.11 |
| Runs | 5.10 | 4.19 | −0.92 ± 0.21 |
| Passes | 9.59 | 8.75 | −0.84 ± 0.13 |

- Touchdowns: 138 → 117.
- Runs:
  - median unchanged (2.2 → 2.1);
  - 20+ yd: 4.6% → 3.3%;
  - 40+ yd: 2.5% → 1.3% (NFL IZ/OZ 0.1–0.8%).
- Passes: 20+ yd 16.8% → 14.0%.
- The largest changes are breakaway runs and catch-and-runs that now end at
  the first wrap from behind:
  - S8-122 goes from a 74 yd TD to 5.4 yd;
  - S7-48 goes from a 74 yd TD to 19.2 yd.
- Rows sha: off `100f3b7f559edb42`, on `cfc88f22c20ff0f1`.

This is a material change. The mechanism is the one the bench isolates:
tackles from behind now finish. Fewer long plays is not by itself
improvement.

## Tests

- **Flag off:** `npm test` 3741/3741, typecheck clean.
- **Flag on:** these contracts change, and promotion has to update them.
  - `held-stride` "binds nothing while the holder is on his feet": this is
    the old law by name.
  - `tackle-support-choice` "a rear finish transmits braking load", center
    and patch: the plant still slows him more, but less of it goes through
    the joint, because he loses his own stride.
  - `contact-legality` hip-drop, trap=true: the leg trap carries no force
    because the bound runner cannot drive against it. The no-hip-drop
    contract still holds.
  - `baseline-runner` (3) and `scorecard-provenance` fail only because a
    flag is set in the environment.

## Defense's combined stack (2026-11-07)

Run Game's and Defense's flags, without `ONE_ARM_HOLD`; 1,315 matched runs,
paired.
- 20+ yd runs: 3.5% → 2.9%. 40+ yd runs: 1.6% → 1.3%.
- Run yards capped at 20: −0.51 (SE 0.04). The median falls from 2.5 to 2.2;
  OZ −0.47, IZ −0.48.

It cuts breakaways modestly but shortens every run, the median included. That
makes the NFL yards-after-first-contact check below the gate before
promotion.

**Break origins, same stack** (`_bigrun.mts` fd60fdaf, HELD_SWING 0 → 1):
- DB breaks 82 → 76; plays with a DB break 25 → 22.
- **Lunge breaks** (leg holds) fall 39 → 31, about a fifth.
- **Reach breaks** stay at 33 → 33. These are arm's-length grabs at 1.1–1.5 yd, mostly on the upper body (legs ≤ 0.3), which this law does not touch. They are now the largest bucket.
- How well an extended upper-body grip holds a 6–7 yd/s back is a separate open question.

## Open

- Defense owns the commit-distance decision: grabbing at arm's length or
  diving instead of closing to form range.
- Before promotion, compare yards after first contact for tackles from
  behind against NFL with the same operator.
