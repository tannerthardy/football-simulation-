# Commitment: how often players change what they ask for (measurement only, 2026-11-12)

Integration, for the owner: our players re-request movement at a different angle nearly every tick, where real
players go and stay with it. No build; this is the table the shape of a change will be decided from.

Tools:
- `scripts/diag/effective-mass/commitment-probe.mts`: the engine's requests, seeds 101-102, every tick (0.05 s) of
  every scrimmage play, engine-44 + this branch with flags off.
- `scripts/diag/pass-operators/heading-change.py`: achieved headings, the same code on NFL tracking (BDB 2025) and
  our export (seed 201, 8 games), 0.1 s frames, moving faster than 1.5 yd/s.

## (1, 3, 4) Requests, by controller

Direction changes are over 20 deg between consecutive ticks, both requests over 1 yd/s. Dither is a change undone
within 0.3 s. The speed change is over the next tick, after a change against after a steady request.

| controller | moving s | direction changes /s | dither | behaviour changes /s | partner changes /s | speed change, after a change / steady | losing > 0.2 yd/s, after / steady |
|---|---|---|---|---|---|---|---|
| coverage | 7925 | 1.42 | 34% | 0.11 | 0.04 | −0.065 / +0.052 | 33% / 13% |
| block | 7849 | 0.93 | 30% | 0.16 | 0.40 | −0.051 / +0.029 | 24% / 11% |
| rush | 5581 | 1.04 | 22% | 0.00 | 0.43 | −0.025 / +0.043 | 18% / 8% |
| route | 3027 | 0.98 | 33% | 0.00 | 0.00 | −0.030 / +0.069 | 26% / 9% |
| QB | 681 | 0.30 | 34% | 0.00 | 0.00 | −0.027 / +0.030 | 33% / 14% |
| carrier | 524 | 1.40 | 29% | 0.41 | 0.00 | −0.006 / −0.021 | 16% / 15% |
| pursuit | 316 | 1.64 | 38% | 0.78 | 0.05 | −0.095 / −0.008 | 37% / 21% |
| loose ball | 44 | 1.76 | 18% | 2.51 | 0.48 | −0.076 / +0.021 | 34% / 19% |

## (2) Achieved headings, ours against NFL (per second moving)

| group | heading change > 20 deg in 0.1 s, NFL / ours | turn flips (rate sign change, \|rate\| > 30 deg/s), NFL / ours |
|---|---|---|
| DB | 0.03 / 0.08 | 0.36 / 0.26 |
| LB | 0.03 / 0.09 | 0.40 / 0.35 |
| DL | 0.01 / 0.05 | 0.61 / 0.59 |
| OL | 0.01 / 0.03 | 0.88 / 0.70 |
| WR | 0.01 / 0.06 | 0.28 / 0.19 |
| TE | 0.01 / 0.05 | 0.40 / 0.30 |
| RB | 0.01 / 0.04 | 0.33 / 0.30 |
| QB | 0.01 / 0.03 | 0.66 / 0.55 |

Reversals (over 120 deg in 0.3 s) and 20-degree wobble round to 0.00/s on both sides at 0.1 s.

## Reading

- **Large re-requests.** Most controllers ask for a new direction (over 20 deg in one tick) about 1-1.6 times a
  second of moving time, about one every 0.6-1.0 s. That is not every tick: per-tick changes under 20 deg are not
  counted here.
- **Dither.** About a third of those changes (22-38%) are undone within 0.3 s, which is shorter than a reaction time.
  It concentrates in pursuit (1.64/s, 38%), coverage (1.42/s, 34%), routes (0.98/s, 33%) and the ball carrier
  (1.40/s, 29%). Pursuit also changes behaviour 0.78 times a second.
- **The cost is real.** After a request change the next tick loses speed on average (−0.03 to −0.10 yd/s a tick)
  where a steady request gains (+0.03 to +0.07). It loses more than 0.2 yd/s 18-37% of the time against 8-21%.
- **Physics filters most of it.** Our players turn sharply (over 20 deg in 0.1 s) 2-8 times as often as NFL players
  by position. But they flip their turning direction no more often than the NFL (often less: DB 0.26 vs 0.36, WR
  0.19 vs 0.28). The body does not follow every changed request, so the dither costs speed more than it shows as
  wobble.
- **Not measured.** The owner's "nearly every tick" may be the small changes under 20 deg. A distribution of per-tick
  request angle (with a 5 deg threshold) is the next cut if wanted.
