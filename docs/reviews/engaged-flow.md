# Engaged run defenders: a lateral request the body can follow

2026-10-27, Defense. Follows [the engaged-stall review](2026-10-27-engaged-stall.md)
(item 1 of its hand-off). Branch `defense/G1-engaged-flow`, base develop
`862eb5ef`, later merged with `1ec115c7`.

## The change (on, no flag)

The engaged run defender's lateral request was `requestToCover`: plan to cover
the gap to his aim within two decision intervals under his sprint lag
(about 1.3 s). That over-commanded. His braking, about 5 yd/s², is much faster
than his speed-up, so every small change of aim reversed him: 1.67 request
flips per second.

Now he follows his held aim point with the flow he read plus a proportional
correction:

    flow = clamp(held + (target − y) · 3, ±lateral cap)

`DL_FLOW` (the old planner) is removed, from `docs/FLAGS.md` and
`config/baseline.json` too. No capacity changed.

## Pair motion (`run_pair_requests.py`, 4 seeds)

| Engaged pairs | develop | this change |
| --- | --- | --- |
| Defender request flips per second | 1.67 | 0 |
| Pair members wanting the same direction | 51% | 62% |
| Pair lateral speed (NFL bar 1.47 yd/s) | 0.52 | 0.65 |
| Pairs agreeing ≥ 0.5 s | 1,335 | 3,804, at 1.80 yd/s |

Main Engine's alternative (a √-braking cap) also reached 0 flips, with 58%
agreement and 0.58 yd/s.

## Matched restage

Run-only captures, seeds 7 and 11, 4 RNG-shifted replays (900 runs).

- **Yards per run:** −0.16 ± 0.37.
- **10+ yd runs:** 10.6% → 10.7%.
- **Edge table:** unchanged.
- **Runs ≤ 0 yd:** 25.6% → 30.3%. That's 86 runs newly stuffed and 43 no longer
  stuffed (sign test p ≈ 0.0002), so it's real. Explained below.

## Why more runs are stuffed

[`dl_contact.py`](../../scripts/diag/dl_contact.py) uses the same code on NFL
(BDB weeks 1–2) and both restage arms. On the 86 newly stuffed runs:

- First contact comes sooner (2.42 s vs 2.90 s).
- It's usually by a DL: 71 of 86, vs 45 on develop.
- 85% of those DL are still beside their blocker at contact.
- The DL led the pair: he moved 1.62 yd toward the carrier, his blocker
  1.28 yd. On develop, the same DL moved 1.10 yd.

| First carrier contact by a DL, runs | NFL | develop | this change |
| --- | --- | --- | --- |
| Share of first contacts | 42% | 42% | 43% |
| Beside an OL/TE (< 1.2 yd) | 69% | 68% | 67% |
| Lateral move toward the carrier before contact | 3.33 yd | 1.11 | 1.43 |
| Carrier behind the OL's snap line | 30% | 61% | 69% |
| Yards after that contact (median) | 1.45 | 0.26 | 0.17 |
| Run ends at ≤ 0 yd | 20% | 50% | 58% |

**Mechanism:** defenders flow toward the ball with their blocker trailing,
and arrive. That's closer to NFL on every pre-contact measure. Two gaps make
those arrivals end at or behind the line far more often than in NFL, and both
predate this change:

1. DL first contact happens behind the line 61% of the time, NFL 30%.
2. The carrier gains a median 0.26 yd after it, NFL 1.45.

These are the run game's line-of-scrimmage displacement and the carrier's
forward drive after contact. This change exposes them; it doesn't cause them.

## Does a backside DL lag?

`run-contact-flow` asserted that a backside lag (and a spill edge) steps
*against* the blocker's seen flow. [`dl_lag.py`](../../scripts/diag/dl_lag.py)
measures from 0.3 to 1.0 s after the snap:

| | NFL | develop | this change |
| --- | --- | --- | --- |
| Backside DL speed toward the play | 1.34 yd/s | 0.57 | 0.61 |
| … faster than 0.5 toward it / against it | 80% / 6% | 49% / 4% | 54% / 4% |
| Playside DL speed toward the play | 0.47 | −0.27 | −0.24 |
| Backside DL behind his blocker at 1.0 s | 74% | 46% | 49% |
| … speed relative to that blocker | −0.05 | +0.10 | +0.17 |

NFL backside DL flow faster than the play side and keep the blocker's backside
shoulder. They don't step against the flow. The test now asserts the relative
claim: lag and spill command less than the 1 yd/s they read, and less than an
unsure fit or a box edge. This change gives lag 0.19, spill 0.25 and unsure or
box 2.84.

The sim keeps that shoulder about half as often as NFL, and its playside DL
drift away from the play. Both gaps predate this change.

## Failing pins: first difference and disposition

In every case the first difference is the engaged defender's request on his
first engaged tick.

| Test | What changed | Disposition |
| --- | --- | --- |
| seal-hold | At 3.3 s the end crosses H's face at 2.8 yd/s; H's seal hits its top mirror request. It's a lost race, not the old runaway (H carried the end 3.7 yd outward). | Run Game re-pins: pinned steps count only while the end is carried outward. |
| zone-helper-check:539 | The end works down the line with Y. Y's angle passes 0.55 rad at 1.0 s, so the double is never secure and the helper keeps it. A legitimate scene. Seeds 1–40 offer no alternative. | Run Game: the per-read contract stays; the scene counts become conditional on a release. |
| combo-strike-access ×3 | A down DT/RT pair walks into the climbing guard's lane at 0.6–1.2 yd/s. His departure never re-plans around it (RUN-13). | Run Game re-records from a native play where the departure clears. |
| planned-climb-fit | Y keeps the end, so the first carrier contact is CB_S at 3.25 s rather than the end before 2.95 s. | Run Game. |
| responsibility-ledger | M7-P051 loses its tie (LB_W alone at 2.75 s). S8-P005 moves a tick (2.1 → 2.15). S10-P006: SS strips the QB at 4.15 s and NB recovers. | Run Game. |
| helper-fit | DT_W's ground impulse 83.19 exceeded the test's unloaded `traction·dt` (82.41). The World's bound for a man pressed down (PAD_LEVERAGE) is 87.01. | Fixed here: the test uses `report.groundImpulseLimit`, as other contact tests do. |
| run-contact-flow ×2 | Lag and spill now move with the flow, slower than it. | Fixed here, per the NFL check above. |

## Caveats

- Sim: seeds 7 and 11, run-only, two generated teams. NFL: two weeks.
- "Beside a blocker" is position-only, not an engagement.
- Play side is the carrier's side of the snap at 1.5 s.
