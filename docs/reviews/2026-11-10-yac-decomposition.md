# YAC decomposition and the break on the ball (2026-11-10)

Report only. Operators in `scripts/diag/pass-operators/` (`yac-stages.ts` / `nfl_yac_stages.py`, `targets.ts` / `nfl_targets.py`, `zone-squeeze.ts` / `nfl_zone_squeeze.py`, `qb-facing.ts` / `nfl_qb_facing.py`, summary `yac_summary.py`). NFL: BDB 2025 weeks 1-3 (1,929 receptions, 3,078 targeted throws). Sim: the 732-dropback matched-restage panel with `WR_SNAP`, `QB_RHYTHM`, `PRESS_MIRROR`, `PRESS_RELEASE` (run-ref-14), 413 receptions. Contact: a defender's centre within 1.0 yd of the carrier.

## Where the excess YAC is

YAC a reception: NFL 5.19, sim 7.52 (+2.33). By air yards at the catch:

| air yards | share NFL / sim | YAC NFL / sim | excess inside the bucket | from the mix |
|---|---|---|---|---|
| behind the LOS | 21.2% / 4.4% | 8.87 / 7.30 | -0.07 | -1.49 |
| 0-5 | 34.8% / 24.5% | 4.35 / 8.83 | +1.10 | -0.45 |
| 5-10 | 20.2% / 34.1% | 3.75 / 6.84 | +1.05 | +0.52 |
| 10-15 | 11.8% / 22.3% | 3.65 / 6.03 | +0.53 | +0.38 |
| 15-20 | 6.6% / 10.7% | 5.22 / 9.12 | +0.42 | +0.21 |
| 20+ | 5.4% / 4.1% | 4.89 / 9.43 | +0.19 | -0.06 |

Not "deep catch with nobody over the top": receptions with no defender deeper are 1.2% (NFL) and 0.5% (sim) and explain none of it.

Stages (median unless stated):

| | NFL | sim |
|---|---|---|
| nearest defender at the catch | 2.78 yd | 3.01 yd |
| his closing speed on the carrier | 2.48 yd/s | 1.21 yd/s |
| catch to first contact | 0.60 s, mean 2.67 yd | 0.90 s, mean 3.96 yd |
| after first contact (mean) | 2.16 yd | 2.61 yd |
| no contact before the end | 10.1% (YAC 4.9) | 14.3% (YAC 11.7) |
| YAC over 30 | 0.8% of receptions | 2.9% |

## Targets by depth

| air yards | share NFL / sim | completion | separation p50 | yards a throw |
|---|---|---|---|---|
| behind the LOS | 17.6% / 4.4% | 83% / 60% | 5.24 / 1.71 | 5.08 / 2.48 |
| 0-10 | 49.3% / 53.0% | 72% / 66% | 2.82 / 3.24 | 6.02 / 8.63 |
| 10-20 | 23.1% / 33.4% | 55% / 64% | 1.96 / 2.23 | 9.93 / 13.28 |
| 20+ | 10.0% / 9.2% | 35% / 30% | 1.21 / 2.05 | 11.94 / 9.28 |

## Why defenders arrive late

The defender nearest the catch, speed toward the eventual catch point (yd/s), relative to the release:

| | -0.6 s | -0.4 | -0.2 | release | +0.2 | +0.4 |
|---|---|---|---|---|---|---|
| NFL zone | 0.79 | 1.15 | 1.58 | 2.15 | 2.88 | 3.53 |
| sim zone | 0.31 | 0.01 | -0.19 | 0.19 | 0.65 | 1.63 |
| NFL man | 2.28 | 2.89 | 3.47 | 4.17 | 4.84 | 5.42 |
| sim man | 1.32 | 1.76 | 2.18 | 2.47 | 3.21 | 3.76 |

In flight our controller requests full speed at the catch point (5.4 yd/s toward it at the release, 7.1 mid-flight); the body faces within 45 deg of the request in 330 of 390 cases; the deficit is where his velocity points at the release (74 deg off the catch point vs NFL 48 deg). Flight is also shorter (0.85 vs 1.10 s).

Zone plays, every non-rushing CB/S/LB and the nearest receiver within 7 yd at the release, his speed toward that receiver:

| | -0.8 s | -0.6 | -0.4 | -0.2 | release |
|---|---|---|---|---|---|
| NFL, target | -0.84 | -0.62 | -0.28 | +0.29 | +0.95 |
| NFL, not target | -0.73 | -0.69 | -0.57 | -0.43 | -0.34 |
| sim, target | -1.42 | -1.28 | -1.16 | -1.00 | -0.45 |
| sim, not target | -1.69 | -1.33 | -0.83 | -0.67 | -0.47 |

The NFL squeeze is on the target only, from about 0.4 s before the release (about one throwing motion). The NFL QB's body is not squared to the target before the release (`o` within 20 deg: p50 0.0 s), so the cue is not his facing. Our QB's motion is a fixed 0.45 s, and `sawThrow` lets a defender key that motion but not act on it until the ball is in the air.

## Attempts (not merged)

- ZONE_SQUEEZE 1, underneath lane squeeze on the QB's facing: fired on 33 receptions; 732 paired -0.10 +/- 0.18 yd.
- ZONE_SQUEEZE 2, any non-deep zone defender (and man on his own man) squeezes the nearest receiver the QB is set and squared to: target / non-target toward-speed at the release -0.45 / -0.47 -> -0.27 / -0.50; catch to contact 0.90 -> 0.80 s; YAC 7.52 -> 7.32; 732 paired -0.05 +/- 0.13 yd. Wrong cue (see above). Next: act on the seen throwing motion.

## Provisional: stage (a) is largely downstream of route mix and throw timing

Added after the route-by-route comparison (NFL BDB 2025 weeks 1-3 non-PA dropbacks, 11,947 routes; sim the 732 panel on develop f52e3a0d, 2,844 routes; depth from the ball on both sides). Like-for-like routes are thrown at about NFL depth (hitch 5.0 vs 5.7 yd, slant 5.3 vs 4.0, shallow cross 4.7 vs 4.1, go 10.2 vs 10.0), but 35.6% of our targets are comebacks, digs, 10-yd outs and curls at 10-15 yd, flats + screens + angles are 3.6% of our targets against 24.8% in the NFL, and on thrown outs, digs, quick outs and short ins the ball leaves before the receiver's break (NFL: 0.5-1.0 s after it). The late-closing defenders measured above are covering receivers still running deeper; the defender-side attempts (ZONE_SQUEEZE, MOTION_BREAK, ZONE_PLANT, OFF_THROTTLE) moved nothing and stay off develop.

Do not build a defender-side fix from stage (a) until the panel is recaptured with per-seed team identities (all diagnostic games were IRN vs COM, whose alignment habits put both teams' safeties shallow) and the route mix and throw timing are re-read. The NFL gaps above involving safety depth, shell and defenders over the top are biased by that sample.

## Re-read on the league-sampled panel (2026-11-11)

Panel recaptured on develop 01b9037e with per-seed team identities (#527): capture 7 (165 snaps) and 11 (132), 197 dropbacks x 4 dice = 788, four defences (safetyDepth -0.66 / -0.20 / +1.05 / +1.56). YAC stages read on run-ref-18 candidate 73b5cee4 (CATCH_EYES on; CATCH_EYES=0 for the off arm). YAC is reported as median / trimmed mean (30+ yd removed) / mean +/- SE. NFL rows as above (BDB 2025 weeks 1-3).

| | NFL | sim, CATCH_EYES off | sim, CATCH_EYES on |
|---|---|---|---|
| YAC median / trimmed / mean | 3.22 / 4.90 / 5.19 +/- 0.15 | 4.90 / 5.95 / 8.46 +/- 0.59 | 4.50 / 5.44 / 7.83 +/- 0.59 |
| catch to first contact, p50 | 0.60 s | 0.90 s | 0.90 s |
| yards to first contact, p50 / mean | 1.08 / 2.67 | 1.81 / 3.81 | 1.50 / 3.35 |
| no contact before the end | 10.1% (YAC 4.9) | 15.7% | 14.8% (YAC 19.3) |
| nearest defender's closing speed at the catch | 2.48 yd/s | 1.04 | 1.04 |
| YAC over 20 | 3.5% | 10.2% | 9.7% |

Survives:
- YAC is the largest excess, inside every catch-depth bucket, and not "deep catch with nobody over the top" (98% of receptions have 2+ defenders deeper).
- Defenders close late: speed toward the catch point at the release, zone 0.94 vs NFL 2.15, man 1.81 vs 4.17; the off corner thrown at is still retreating at 3.73 yd/s vs 1.61, at NFL cushion (3.60 vs 3.67 yd).
- Untouched catches carry most of the excess: 14.8% of receptions at 19.3 yd YAC (about 2.4 of the 2.64 yd mean excess); nearest defender 3.5 yd away, closing 0.26 yd/s (NFL 3.2, 0.77).
- The QB's choice: shallow cross 19% of targets, read #1 58% of the plays it is run.

Did not survive (IRN/COM rosters or a measurement defect):
- Tight-coverage completion: at 10-20 yd and under 2 yd of separation the base completes 42% (NFL 39%; 0-1 yd 28% vs 26%). The IRN/COM panel had 52%. CATCH_CONTEST (attempt 1, local) is more physical but has no gap to close.
- Pressure accuracy: with arrival snapshotted on the tick (the earlier task1 table dropped end-of-play incompletions), completion clean / pressured is 0-10 yd 67% / 62% (NFL 74% / 64%) and 10-20 yd 58% / 62% (52% / 51%). No pressure gap to build for.
