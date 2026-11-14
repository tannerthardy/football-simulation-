# The urgency bar: what he accepts as the rush nears (2026-11-12)

**Question** (Integration). As urgency u rises, his bar falls: `thr − 0.32u` for completion and `maxInt + 0.08u` for
interception risk (`QBPass.update`). With a free rusher at 2 yd ours throws 81–93% (NFL 57%), and two thirds of those
throws never reach the alarm (docs/reviews/2026-11-12-hot-look.md). Integration's expectation: the lowered bar plus an
optimistic window makes a bad throw look acceptable, so he always has one.

To test it: for read-logic throws under rising urgency, what P and intRisk he accepted against what happened, by
urgency band; and how the throws the lowered bar admits, but the normal bar would not, compare with the NFL's
pressured throws (48% complete, 6.8 yd/att, 3% INT).

Diagnosis only; nothing in the engine changed.

## Instrument

- `QBPass.throwRec` (diagnostic, no effect on play): at each started throw, his urgency, the P and intRisk he
  accepted, his bar at that urgency, and whether the throw would clear his normal bar (u = 0).
- Population: `scripts/diag/read-plan/hot-games.ts`, league games on engine-40 (develop fb479ad2 with this branch's
  diagnostics), HOT_LOOK off, seeds 101 and 201, 8 games each.
- Report: `scripts/diag/read-plan/urgency_report.py`. It counts throws that went to the receiver the throw was
  started to, and leaves out throwaways.

## By urgency band

FREE_BOUND off (1,508 passes, 1,055 throws recorded):

| u band | n | Mean P accepted | Completion | Mean intRisk | INT rate | Yards per attempt | Share clearing the normal bar |
|---|---|---|---|---|---|---|---|
| u = 0 | 619 | 0.72 | 0.64 | 0.017 | 0.019 | 10.0 | 0.99 |
| 0–0.25 | 147 | 0.71 | 0.68 | 0.020 | 0.014 | 10.6 | 0.76 |
| 0.25–0.5 | 148 | 0.67 | 0.59 | 0.024 | 0.027 | 10.3 | 0.57 |
| 0.5–0.75 | 121 | 0.67 | 0.47 | 0.024 | 0.041 | 6.3 | 0.62 |
| 0.75–1 | 20 | 0.53 | 0.60 | 0.032 | 0.000 | 12.3 | 0.40 |

FREE_BOUND on (1,550 passes, 1,177 throws recorded):

| u band | n | Mean P accepted | Completion | Mean intRisk | INT rate | Yards per attempt | Share clearing the normal bar |
|---|---|---|---|---|---|---|---|
| u = 0 | 642 | 0.72 | 0.65 | 0.018 | 0.017 | 10.3 | 0.99 |
| 0–0.25 | 159 | 0.68 | 0.70 | 0.020 | 0.031 | 11.0 | 0.70 |
| 0.25–0.5 | 128 | 0.67 | 0.54 | 0.025 | 0.016 | 7.6 | 0.62 |
| 0.5–0.75 | 169 | 0.66 | 0.57 | 0.026 | 0.018 | 7.6 | 0.67 |
| 0.75–1 | 79 | 0.62 | 0.49 | 0.032 | 0.063 | 8.1 | 0.56 |

## Throws under urgency (u > 0), by the bar that admits them

| | n | Mean P accepted | Completion | Mean intRisk | INT rate | Yards per attempt |
|---|---|---|---|---|---|---|
| FREE_BOUND off: clears the normal bar | 280 | 0.74 | 0.62 | 0.011 | 0.029 | 9.3 |
| FREE_BOUND off: only the lowered bar | 156 | 0.56 | 0.53 | 0.043 | 0.019 | 9.5 |
| (of which hot path) | 23 | 0.51 | 0.35 | 0.042 | 0.000 | 3.6 |
| FREE_BOUND on: clears the normal bar | 348 | 0.74 | 0.63 | 0.013 | 0.026 | 8.2 |
| FREE_BOUND on: only the lowered bar | 187 | 0.53 | 0.52 | 0.048 | 0.032 | 9.6 |
| (of which hot path) | 56 | 0.47 | 0.46 | 0.058 | 0.036 | 6.0 |
| NFL pressured throws | | | 0.48 | | 0.03 | 6.8 |

The free rusher at 2 yd, thrown under urgency:

| | n | Only the lowered bar | Mean P | Completion |
|---|---|---|---|---|
| FREE_BOUND off | 112 | 46 | 0.66 | 0.50 |
| FREE_BOUND on | 146 | 55 | 0.65 | 0.53 |

## Reading it

1. **The lowered bar is not where bad throws come from.**
   - About a third of throws under urgency clear only the lowered bar. They complete 52–53% for 9.5 yd/att with 2–3%
     INT.
   - That is about what the NFL's pressured throws earn (48%, 6.8 yd/att, 3%), and more than a sack, a throwaway or
     most scrambles.
   - On them, his P is calibrated: he accepts 0.53–0.56 and completes 0.52–0.53.
   - So a QB judging the value of throwing against not throwing would take most of them. The repair is not "accept
     fewer of these".
2. **The optimism is in the window, and it grows with urgency.**
   - At u = 0 he accepts P 0.72 and completes 0.64–0.65.
   - In the throws that clear even his normal bar under urgency, he accepts 0.74 and completes 0.62–0.63.
   - By band (FREE_BOUND off) the gap widens from 0.08 at u = 0 to 0.20 at u 0.5–0.75 (0.67 vs 0.47).
   - Free-rusher throws: P 0.65–0.66 against 0.50–0.53 complete.
   - This is the window's defender model (the next item): defenders watching him break about 0.20 s after the
     decision while he assumes 0.43 s, and every run under-rated by about 0.24 s. Under urgency he throws sooner,
     into windows still closing, where those errors cost most.
   - Urgency's own accuracy cost (missSigma's urgency term) is already inside the P he computes, so it is not
     the gap.
3. **Why he throws 81–93% with a free man at 2 yd when the NFL throws 57%.** Not because the bar admits bad throws,
   but because he almost always has a throw by his own reckoning when the rusher arrives:
   - two thirds of these throws clear even his normal bar;
   - his reckoning is optimistic by about 0.13 in P on exactly these plays.
   - With the window corrected, some of those throws fall below even the lowered bar. That is the population where
     "no acceptable throw" (the seam to Flex's evade / throw away / take it) should fire more often.
   - Whether the rest of the gap is the window, or receivers being open earlier than in the NFL when the rusher
     arrives (timing of the rush against the routes), the window repair will show. If a gap remains after it, measure
     separation at the throw on pressured throws, NFL vs ours, before touching the bar.

## Recommendation

- Leave the urgency bar's slopes alone for now.
- Repair the window's defender model first (reaction for defenders watching him; the run-estimate bias, held as
  his belief so his experience and decision-making set how well he knows it).
- Then read this table again. The test: P accepted against completion by urgency band. The gap should close, and the
  throw share with a free man at 2 yd should fall through the seam into Flex's behaviour.
- Only if pressured throws then still earn less than not throwing does the bar's slope need a value-of-not-throwing
  term (the sack's, the throwaway's and the scramble's value, by his traits). That needs Flex's choices to exist.

## Limits

- Two seeds, 16 games per arm. The 0.75–1 band is small (20 and 79 throws).
- P is the throw's expected completion at his urgency on his pictures, taken when the throw started. A pump that
  re-aims is recorded at its last start.
- Completion includes Coverage's catch contest (engine-39 on), which lowered completions on contested throws. The
  gap at u = 0 (0.07–0.08) partly reflects that the window does not yet price the contest.
