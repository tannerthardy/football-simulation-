# ACC_BELIEF: he prices the throw he will release (2026-11-12)

**Question** (risk work, item 1). After DEF_BELIEF, his belief of what a throw does was calibrated except under
pressure: at urgency 0.5–1 he believed 0.19–0.24 of his throws would be off target and 0.25–0.39 were. Why?

## Diagnosis

`scripts/diag/read-plan/accuracy-belief.ts`: league games, seeds 101 and 201, 8 games each, engine-43 base with
DEF_BELIEF on. For each released throw it records the miss sigma he believed when he decided against the sigma the
release used. The consistency draw is left out of both, since its mean factor is about 1.

| Urgency at the decision | n | Sigma believed / at release (p50) | Urgency: decision / release (p50) | Flicked | Moving | Off target: believed / at the release's sigma / observed |
|---|---|---|---|---|---|---|
| 0 | 879 | 0.75 / 0.71 | 0 / 0 | 0% | 0% | 0.16 / 0.15 / 0.11 |
| 0–0.5 | 334 | 0.80 / 0.84 | 0.25 / 0.34 | 0% | 2% | 0.19 / 0.25 / 0.17 |
| 0.5–1 | 161 | 0.83 / 1.17 | 0.56 / 0.99 | 21% | 14% | 0.22 / 0.41 / 0.34 |

The window and the release priced different throws:

- **The window** (`QBPass.window`, `missSigma(…, urgency)`) uses the decision's urgency, which `update()` scales by
  pocket presence (×0.5–1.0), from the rush as it is now.
- **The release** (`QBPass.release`) uses the rush as it is at the release, after a windup in which it kept closing,
  unscaled. A throw the rush reaches is a flick (`flick`, ×1 + 0.8 of the miss).
- So under pressure his body throws with almost twice the urgency he priced (0.99 against 0.56), and one throw in five
  is a flick he did not expect.

## Change (`ACC_BELIEF`, off)

In the window, the miss is the release's:

- **The urgency is the rush's at the release.** He takes his own picture of the nearest rusher (the time to contact
  he feels: `pressure.time`, from the rushers he sees and feels, as QBPass.pressure computes it) and closes it over
  the windup he is about to make: `pressure.time − wind`. It is not scaled by pocket presence; that scaling stays on
  his bar, where a poised quarterback is coached to keep looking.
- **A flick is expected when that rusher reaches him by the release** (`pressure.time − wind` under 0.15 s, ramped
  over 0.3 s). This is what he sees: a free or beaten rusher closing on him as he starts the motion.
- **His knowledge sets how well he anticipates it.** The urgency he prices is off by
  `(1 − know) · 0.25 · judgment`, where `judgment` is a standard normal draw. The error is two-sided: a rookie can
  over- or under-feel the rush; a veteran, with know near 1, prices it nearly right. `know` = 0.25 +
  0.45·decision-making + 0.3·min(1, experience/8), the same as DEF_BELIEF's.

Nothing changes in the release itself.

## Read (engine-45 base: RELEASE_SEEN, OPEN_CARRY, FORECAST_HOLD, DEF_BELIEF on)

See the PR for the league-game and paired-panel tables on this base. On the engine-43 base, 16 games per arm:

| | Off | On | NFL |
|---|---|---|---|
| Off target at urgency 0.5–1, predicted / observed | 0.22 / 0.34 | 0.25 / 0.26 | |
| P accepted / completion | 0.66 / 0.63 | 0.67 / 0.67 | |
| Free rusher at 2 yd: throws | 73% | 61% | 57% |
| Free rusher at 2 yd: sacked | 17% | 22% | 25% |
| Free rusher at 2 yd: throwaways | 2% | 6% | 15% of throws |

On the engine-44 base the calibration row moved the same way (0.21 / 0.27 → 0.25 / 0.26). The game totals moved
within game noise in opposite directions on the two bases (INT 25 → 17 there, 29 → 37 here; INT counts near 30 have
a standard deviation of about 5.5). The paired panel on engine-44 had 166 plays change, INT 34 → 31, 1 new and 3
removed, and completion and sacks flat.

## Fixture

`test/acc-belief.test.ts`, over a named panel of plays whose rush reaches him: at the first tick the rush is within
his urgency window (pressure under 0.9 s), before either arm has thrown, every read is evaluated both ways. The tick
and QB position are checked equal across the arms. With the flag on he expects more misses: on average by at least
0.02, and on at least 70% of the reads.
