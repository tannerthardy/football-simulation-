# FLIGHT_REVISE staged (Flex, 2026-11-25)

`scripts/diag/coverage/defender-flight-stage.mts` on develop 7585be04f: per thrown play (5 cells x 16 seeds), the
non-lineman defender nearest the true landing at the throw. "Recorded" is acquireFlight's store (what his play on the
ball reads); "own first sample" is the estimator's first sample of the ball in his eyes.

## Default (BALL_EST=6145: defenders copy the true flight)

| case | n | no flight recorded | flight recorded after release (s) | own first sample after release (s) | his recorded flight at the true arrival time, off the ball (yd) |
|---|---|---|---|---|---|
| curl_flat vs cover2 | zone | back to QB | 11 | 0 | 0.35 | - (0) | 0.00 |
| curl_flat vs cover2 | zone | back turned | 5 | 0 | 0.30 | - (0) | 0.00 |
| curl_flat vs cover3 | zone | back to QB | 10 | 0 | 0.35 | - (0) | 0.00 |
| curl_flat vs cover3 | zone | back turned | 6 | 0 | 0.35 | - (0) | 0.00 |
| four_verts vs cover1 | man | back turned | 6 | 1 | 1.60 | - (0) | 0.00 |
| slant_flat vs cover1 | man | back to QB | 1 | 0 | 0.55 | - (0) | 3.98 |
| slant_flat vs cover1 | man | back turned | 7 | 0 | 1.00 | - (0) | 3.39 |
| slant_flat vs cover1 | zone | back to QB | 8 | 0 | 0.30 | - (0) | 0.00 |
| stick vs cover3 | zone | back to QB | 16 | 0 | 0.35 | - (0) | 0.00 |

## Estimator on for the defense (BALL_EST=2049), FLIGHT_REVISE off

| case | n | no flight recorded | flight recorded after release (s) | own first sample after release (s) | his recorded flight at the true arrival time, off the ball (yd) |
|---|---|---|---|---|---|
| curl_flat vs cover2 | zone | back to QB | 11 | 1 | 0.35 | 0.50 (8) | 14.06 |
| curl_flat vs cover2 | zone | back turned | 5 | 3 | 1.20 | 0.95 (4) | 2.13 |
| curl_flat vs cover3 | zone | back to QB | 10 | 0 | 0.75 | 0.50 (7) | 9.82 |
| curl_flat vs cover3 | zone | back turned | 6 | 0 | 0.80 | 0.55 (3) | 9.35 |
| four_verts vs cover1 | man | back turned | 6 | 5 | 0.70 | - (0) | 22.53 |
| slant_flat vs cover1 | man | back to QB | 1 | 0 | 0.55 | - (0) | 13.07 |
| slant_flat vs cover1 | man | back turned | 7 | 7 | - | 0.85 (1) | - |
| slant_flat vs cover1 | zone | back to QB | 8 | 0 | 0.30 | 0.15 (6) | 11.39 |
| stick vs cover3 | zone | back to QB | 16 | 0 | 0.35 | 0.20 (9) | 15.75 |

| time since his own first sample | ticks | his recorded flight at the true arrival, off the ball (yd, median) |
|---|---|---|
| 0.0-0.2 s | 8 | 16.85 |
| 0.2-0.4 s | 142 | 10.16 |
| 0.4-0.6 s | 116 | 9.80 |
| 0.6+ s | 188 | 10.75 |


## Estimator on for the defense (BALL_EST=2049), FLIGHT_REVISE on

| case | n | no flight recorded | flight recorded after release (s) | own first sample after release (s) | his recorded flight at the true arrival time, off the ball (yd) |
|---|---|---|---|---|---|
| curl_flat vs cover2 | zone | back to QB | 11 | 1 | 0.60 | 0.40 (10) | 4.10 |
| curl_flat vs cover2 | zone | back turned | 5 | 3 | 1.20 | 0.95 (4) | 3.93 |
| curl_flat vs cover3 | zone | back to QB | 10 | 0 | 0.75 | 0.50 (10) | 3.14 |
| curl_flat vs cover3 | zone | back turned | 6 | 0 | 0.80 | 0.55 (6) | 3.76 |
| four_verts vs cover1 | man | back turned | 6 | 5 | 0.95 | 0.75 (1) | 22.53 |
| slant_flat vs cover1 | man | back to QB | 1 | 0 | 0.80 | 0.60 (1) | 3.87 |
| slant_flat vs cover1 | man | back turned | 7 | 7 | - | 0.85 (1) | - |
| slant_flat vs cover1 | zone | back to QB | 8 | 0 | 0.35 | 0.15 (8) | 4.74 |
| stick vs cover3 | zone | back to QB | 16 | 2 | 0.40 | 0.20 (14) | 2.99 |

| time since his own first sample | ticks | his recorded flight at the true arrival, off the ball (yd, median) |
|---|---|---|
| 0.0-0.2 s | 15 | 14.59 |
| 0.2-0.4 s | 218 | 4.08 |
| 0.4-0.6 s | 169 | 0.45 |
| 0.6+ s | 346 | 0.78 |


Notes:
- The default's slant_flat man rows (3.4-4.0 yd with the true copy) are this stage's measurement, not a stale copy:
  on those plays the ball's path is rewritten in flight (the recorded path starts 0.4-0.9 s after the release while
  the ball is still in the air; a touched ball). The defender copies the current path; the stage compares it with the
  first path's landing.
- Back-turned man defenders on slants record nothing with the estimator either way (7 of 7): no look, no flight.
