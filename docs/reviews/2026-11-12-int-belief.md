# INT_BELIEF: his interception belief, shaped like how picks happen (2026-11-12)

**Question** (risk work; Integration's next item after engine-46). His interception belief totals right, but does it
rank throws? Where does it put the risk, and what does it cost him in throws he declines?

## Diagnosis

The window (`QBPass.window`) sums three terms per defender at four miss points:

- **path:** a defender who can undercut the ball in flight: `touch · (0.08 + 0.3·ballSkills)`;
- **jumped route:** a defender first to the catch point: `first · (0.15 + 0.35·ballSkills)`;
- **contest:** a defender arriving with the receiver: `max(0, contest − first) · 0.08·ballSkills`.

`scripts/diag/read-plan/hot-games.ts` records his terms at the aimed point and how each pick happened (`intKind`: on
the path before the planned arrival, at the catch point, or off a tipped ball). `int_report.py` tables them.

**Engine-46** (32 league games, 2,639 natural throws, 55 INT): the total was right (1.7% predicted, 1.8% observed),
but picks came 32 at the catch point, 20 tipped and 3 on the path. His path terms summed to about 18 picks and his
catch-point terms to about 13.

**Engine-47 candidate** (f97b93b8: CATCH_CARRY, HANDS_CUE, CATCH_SPEED, CATCH_CHOICE on; 32 games, seeds
101/201/301/401, 2,592 natural throws, 46 INT), flag off:

| His catch-point term (jump + contest) | n | Observed INT |
|---|---|---|
| Under 0.002 | 1,143 | 0.9% |
| 0.002–0.006 | 624 | 1.6% |
| 0.006–0.015 | 525 | 2.7% |
| 0.015 and over | 300 | 4.0% |

- **The catch-point terms rank picks; the path terms barely do.** A touch in flight usually ends in a break-up, not a
  pick.
- **Declined throws:** see below. An earlier read (`declined-risky.ts`, which gave 29% priced against 2.6% INT and
  52% completion) was an artifact. Most of its forced throws were pulled down at the plant and the play went on.

## Change (`INT_BELIEF`, off)

In `QBPass.window`, at each miss point:

- **A touch in flight ends a pick a fraction of the time:** path terms weighted by `PATH_PICK` 0.2.
- **The catch point is weighted up:** jumped-route and contest terms weighted by `CATCH_PICK` 1.75.
- **Defenders combine as probabilities:** 1 − Π(1 − p) over defenders, for the path and the catch point.
- **His knowledge sets how well he knows it.** A multiplicative error `exp((1 − know) · 0.3 · judgment)`, where
  `judgment` is his standard normal draw. It is two-sided: a rookie can over- or under-price picks, while a veteran,
  with know near 1, prices them nearly right. `know` is the same as DEF_BELIEF's and ACC_BELIEF's.

**The weights are fitted by likelihood on natural throws**, INT ~ 1 − exp(−(a·path + b·catch point)), on seeds
101/201 and checked on 301/401.

- The two halves disagree on the level (15 against 31 INT on similar throw counts), which is game noise.
- They agree on the shape: the catch point is worth 7–9× the path.
- A first guess from engine-46 (1.25 / 2.5) made calibration worse and added sacks, so it was refitted.

## Read (engine-47 candidate, 32 league games per arm)

Reliability by his priced risk, natural throws, predicted / observed:

| His intRisk | Off, all seeds | On, all seeds | On, held-out seeds (301/401) |
|---|---|---|---|
| Under 0.5% | 0.15% / 1.25% | 0.15% / 0.45% | 0.15% / 0.74% |
| 0.5–2% | 1.21% / 1.17% | 1.17% / 1.56% | 1.16% / 1.25% |
| 2–5% | 3.18% / 2.31% | 3.16% / 3.10% | 3.16% / 3.10% |
| Over 5% | 6.78% / 4.10% | 6.36% / 5.07% | 6.46% / 3.66% |

| | Off | On |
|---|---|---|
| Dropbacks | 2,867 | 2,969 |
| Sacks | 131 (4.6%) | 121 (4.1%) |
| INT | 46 | 49 |
| Completion | 0.668 | 0.666 |
| Yards a play | 8.05 | 8.23 |
| Free rusher at 2 yd: throws / sacked | 65% / 20% | 68% / 18% |

INT counts near 50 have a standard deviation of about 7, so INT is flat within noise.

## Declined throws (forced-concept panel, seeds 1 and 2)

`scripts/diag/read-plan/declined-looked.ts`, with `--commit`.

- **Which declines:** for each read, the first tick his eyes are on it (`reads[readIdx]`, which is what his facing
  shows the defense) and it is ready, and he evaluates it without throwing. That is a decline made while looking, so
  forcing it is not also an unlooked throw (Integration's caution).
- **The forced throw is committed.** Without `--commit`, 331 of 457 forced throws were pulled down at the plant
  (`pullDown`: its value below zero), and the play went on to another throw, about 0.8 s later. Forced throws
  measured that way, in this probe and in `declined-risky.ts`, describe the rest of the play, not the declined throw.
- **Committed throws are released to that read** (456 of 457), about 0.45 s after the decision.

| His risk | Off: n, his P / risk → cmp / INT / yd | On: n, his P / risk → cmp / INT / yd |
|---|---|---|
| Under 2% | 30, 0.34 / 1.2% → 0.40 / 13% / 17.1 | 19, 0.39 / 1.1% → 0.58 / 11% / 22.1 |
| 2–5% | 49, 0.28 / 3.6% → 0.27 / 12% / 12.0 | 51, 0.29 / 3.5% → 0.35 / 8% / 6.9 |
| 5–10% | 49, 0.25 / 7.5% → 0.31 / 12% / 9.0 | 96, 0.24 / 7.3% → 0.34 / 8% / 9.7 |
| Over 10% | 347, 0.14 / 32% → 0.33 / 9.5% / 5.5 | 290, 0.12 / 27% → 0.28 / 10.7% / 5.7 |
| All, picks priced / observed | 116 / 49 | 88 / 45 |

- **Declined throws are bad throws.** They complete about 0.3 and are picked about 10% whatever he priced them at. With
  the flag on he prices them closer (88 against 45 picks, from 116 against 49), but still about twice too high in
  his top band and too low in his lowest.
- **The arrival of the defender he believes is first is roughly right.** Of 264 such defenders (flag on), 135 reached
  the released aim, at the ball's arrival (median −0.01 s against his believed −0.27 s); the rest ended about 2.3 yd
  away. That is a 0.27 s pessimism, not the large error the artifact suggested.
- **What the tail still says:** on throws he declines, his picks are not ranked by his terms (about 10% in every
  band). That is a question about what makes a bad throw a pick (a ball thrown into coverage that is not undercut or
  jumped, by his terms), for the next item.

## Also seen (not built)

- **Tipped picks on engine-47 are half of all picks** (23 of 46, against 20 of 55 on engine-46).
- **Ten picks came on throws he priced under 0.5%.** Most were short, high-P throws to backs and flats: the ball came
  off the receiver after the planned arrival and a nearby defender caught it. His terms cannot see it.
- For the catch side to check against the engine-47 catch flags.

## Fixture

`test/int-belief.test.ts`, over a named panel of 12 plays at the first tick he is set, before either arm has thrown
(the same tick and QB position checked in both arms). Every read is evaluated both ways:

- a read with no interception terms stays at zero;
- reads whose risk is mostly at the catch point gain at least 1.5× more (median ratio) than reads whose risk is mostly
  on the path.

## Checks

`npx tsc --noEmit -p .` is clean. `test/int-belief.test.ts`, `test/scorecard-provenance.test.ts` and
`test/baseline-runner.test.ts` pass. Raw output is in `out/read-plan/ib*` and `out/v2/` (ignored).
