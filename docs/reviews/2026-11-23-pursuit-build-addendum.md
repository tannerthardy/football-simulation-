# Pursuit build addendum: CARRIER_ACCEL, PASS_ROLES, CATCH_STRIDE, turn at speed, F74 (2026-11-23)

Follows `docs/reviews/2026-11-23-pursuit-diagnosis.md`. Branch `defense/carrier-accel`; flags off by default; develop untouched.

**Population set.** 6 coverages (cover1, cover2, cover3, cover4, cover6, tampa2) × 32 concepts × 2 formations × 2 seeds
× flip: about 985 completions, 362 of them outside catches. One operator.

## Built

**CARRIER_ACCEL** (`src/sim/carrier-forecast.ts`): one shared forecast of a carrier's run. It feeds the meeting spot, the
held spot, the on-top point and the close gather.
- **Believed post-catch run (stated):** 5.8 yd/s with a 2.4 s time constant, from the NFL catch-speed rows. A combine
  sprint forecast 2.0 → 6.2 yd/s in one second, against the NFL's tracked 2.0 → 3.3.
- **Heading weight:** continuous, from the seen speed and a held facing (30° margin).
- **Close gather:** matches the forecast velocity and halves the arrival speed allowance when the carrier has not
  committed to a heading.
- **Attempt 1 failed the dither budget.** The gather led its goal along the forecast run, and that lead was the source
  (dither panel: coverage 0.395 → 0.426/s; with the gather leading nothing, 0.395).

**PASS_ROLES** (`src/sim/pass-pursuit.ts`): the taught Rally rule, applied from each defender's own seat and picture.
- **Force:** outside the carrier, or a corner / flat seat within 5 yd inside him. He takes the outside shoulder.
- **Alley:** everyone else. He takes the inside shoulder.
- **Never trail a teammate seen ahead on the same shoulder:** take the other shoulder, then the cutback lane. Margins
  apply.
- **Deeper angle by distance:** the assumed carrier speed rises toward 7.3 yd/s between 5 and 15 yd (NFL p50 play-max for
  catches at 6+ yd/s).

## Measured

**Stale-spot row** (nearest defender, outside catches; the forecast's own speed at +0.5 s minus the actual).

| | gap |
|---|---|
| no flags | −1.8 yd/s (assumed 2.2 vs actual 4.1) |
| attempt 1 | about 0 |
| attempt 2 (NFL belief) | about −0.9; our carriers accelerate harder than the NFL's |

**Failure table, outside catches.**

| | off | roles | CA+roles | stride | stride+CA+roles |
|---|---|---|---|---|---|
| n | 362 | 362 | 364 | 355 | 357 |
| catch speed p50 (yd/s) | 1.9 | 1.9 | 1.9 | 3.7 | 3.7 |
| YAC mean (yd) | 6.5 | 6.3 | 6.4 | 12.6 | 11.6 |
| first defender stops him | 71.0% | 71.8% | 71.7% | 59.2% | 59.1% |
| old angle / overrun | 25 / 19% | 29 / 17% | 27 / 20% | 28 / 15% | 29 / 15% |
| outrun on a fair angle | 19% | 19% | 17% | 36% | 35% |
| yards after the beat p50 | 5.0 | 5.9 | 6.4 | 10.6 | 9.6 |

"roles" is attempt 2 with the deeper angle. All completions look the same: no flag combination moves the failure shares
beyond noise (about 60 failures per cell).

**CATCH_STRIDE (Flex) is the large mover.**
- Catch speed rises toward the NFL's (3.7 vs 5.3 yd/s).
- Our first defender then stops the carrier less often: 71% → 59%.
- Outside YAC doubles (mean 12.6 yd; NFL 4.5).
- Against NFL-like carriers our pursuit fails worse, mostly outrun on a fair angle.

**Spacing cuts on pursuers** (a request turned by more than 20° or slowed by more than 1 yd/s):

| | all | outside |
|---|---|---|
| off | 10.5% | 5.3% |
| CA+roles | 9.9% | 5.0% |
| stride | 9.3% | 4.0% |
| stride+CA+roles | 9.0% | 3.8% |

Roles barely change it.

**Dither budget** (`test/dither-budget.test.ts`):

| flags | result |
|---|---|
| CARRIER_ACCEL attempt 2 alone | passes |
| CARRIER_ACCEL + PASS_ROLES | fails one row: the carrier controller, 0.391/s against a 0.378 budget (before 0.296). Carriers react to the new defender aims. |

**Why the flags do not move the population.** When the first defender is beaten by an old angle or an overrun, his
ticks between the catch and the beat are spent like this (flags off; CA+roles is the same within 2 points):

| stage | share |
|---|---|
| OPEN_FIELD on-top point | 30% |
| close gather | 31% |
| still in his coverage behaviour, no pursuit stage | 27% |
| tackle bond | 7% |
| meeting spot (where most of both flags act; the forecast also feeds the on-top point and gather) | 5% |

The failures live in the on-top mirror, the gather, and the late hand-off from coverage to pursuit. They do not live in
the meeting-spot forecast.

**Turn at speed** (pursuit-turn.py: a defender crossing the carrier's path at 7+ yd/s; positions only).

| | NFL (n 1,727) | sim (n 2,389) |
|---|---|---|
| turned toward the carrier, p50, after 0.5 s / 1.0 s | 3° / 7° | 8° / 19° |
| within 45° of the carrier's travel by 1.5 s | 20% | 27% |

NFL defenders turn less at speed. There is no evidence for a turning-capacity gap. NFL pursuers appear to be on their
line before they are fast.

**After the beat** (NFL from Flex, 2b4f0c35; outside catches).

| | NFL | sim |
|---|---|---|
| next defender reaches contact range | 74.8% | 75.4% |
| time until then, p50 | 0.6 s | 0.5 s |
| carrier's gain until then, p50 | 1.4 yd | 2.2 yd |
| second defender closing at the beat | 73% | 71% |

They are close: the second wave is there.

## Film plays

**F74 (pa_post_dig vs cover3).** After SS's broken tackle at +1.1 s, the two who can make the play are CB_S and FS (the
user's reading; the LBs start behind the carrier).
- Both are 12 yd downfield and 16-19 yd inside him.
- Both aim at a meeting spot built on the carrier's 4.9 yd/s, and run downhill at about 3 yd/s toward it.
- The carrier accelerates to 7.8 yd/s. They reach him level with almost no speed along his path.
- CB_S slides behind and misses at +3.3 s. FS wraps at +3.55 s. Spacing never touches either.
- Yards by flags: off 28.5; roles 25.6, CB_S wraps instead of missing; CA+roles 25.8; stride 33.8; all three 29.9.

**F09.** Yards by flags: off 21.9; roles 29.1; CA+roles 22.8; stride 25.2; all three 20.9, with no missed tackle.

Single plays swing both ways.

## Next (proposed)

1. **Trace the on-top mirror and the close gather on the old-angle and overrun plays.** OPEN_FIELD keeps a cushion and
   mirrors. What does the mirror request when the carrier accelerates past the cushion? The NFL defender is upfield and
   gives ground at the runner's pace.
2. **Coverage-to-pursuit hand-off.** About 27% of the beaten first defender's time after the catch is still coverage.
   Measure the time from the catch to the first pursuit request, against the NFL's time to turn toward the carrier.
3. **Keep CARRIER_ACCEL and PASS_ROLES parked.** They are correct football and do no harm, but they do not move the
   failure, and PASS_ROLES breaks the carrier dither row. Revisit them after 1-2 and with CATCH_STRIDE, which changes the
   carrier they face.
