# Sim vs NFL mechanisms (0f90363)

NFL: Big Data Bowl 2025: 2022 regular season weeks 1-9 (all 22 players) (5462 runs, 9713 dropbacks).  
Sim: sim 0f90363, seed 101, 8 games (258 runs, 830 dropbacks).

Values are median [25th, 75th percentile] 90th percentile; rates are shares of plays.
Shift and tail are the sim's median and 90th percentile minus the NFL's, in NFL interquartile ranges.

| Metric | NFL | Sim | Shift | Tail | Flag |
|---|---|---|---:|---:|---|
| move.max_accel.DB | 4.24 [3.43, 5.05] 5.88 | 4.72 [4.13, 5.41] 6.15 | +0.30 | +0.16 | check |
| move.max_accel.DL | 3.73 [3.07, 4.42] 5.05 | 4.42 [3.79, 5.27] 6.16 | +0.51 | +0.82 | off |
| move.max_accel.LB | 4.42 [3.65, 5.25] 5.91 | 4.38 [3.78, 5.04] 5.88 | -0.03 | -0.02 | ok |
| move.max_accel.OL | 3.11 [2.54, 3.72] 4.37 | 3.48 [2.79, 4.10] 4.66 | +0.32 | +0.25 | check |
| move.max_accel.QB | 3.84 [3.12, 4.75] 5.73 | 3.75 [3.12, 4.71] 5.35 | -0.05 | -0.23 | ok |
| move.max_accel.RB | 5.02 [4.18, 5.81] 6.56 | 4.41 [3.65, 5.36] 6.36 | -0.37 | -0.12 | check |
| move.max_accel.TE | 4.75 [3.78, 5.62] 6.27 | 4.88 [4.38, 5.58] 6.15 | +0.07 | -0.07 | ok |
| move.max_accel.WR | 5.55 [4.62, 6.25] 6.82 | 5.62 [5.00, 6.25] 6.28 | +0.05 | -0.33 | check |
| move.max_decel.DB | 3.12 [2.09, 4.37] 5.56 | 4.13 [2.65, 5.61] 6.64 | +0.44 | +0.47 | check |
| move.max_decel.DL | 2.79 [2.09, 3.67] 4.51 | 3.71 [2.71, 4.74] 5.66 | +0.58 | +0.72 | check |
| move.max_decel.LB | 3.39 [2.48, 4.46] 5.52 | 4.10 [2.78, 5.27] 6.28 | +0.36 | +0.38 | check |
| move.max_decel.OL | 2.53 [1.93, 3.16] 3.86 | 3.75 [2.74, 4.53] 5.25 | +0.99 | +1.13 | off |
| move.max_decel.QB | 2.92 [2.17, 3.75] 4.58 | 5.62 [3.75, 5.62] 6.25 | +1.72 | +1.06 | off |
| move.max_decel.RB | 3.60 [2.69, 4.53] 5.50 | 4.75 [3.19, 6.48] 7.25 | +0.62 | +0.95 | off |
| move.max_decel.TE | 3.19 [2.34, 4.25] 5.27 | 4.55 [3.49, 5.62] 6.25 | +0.71 | +0.51 | check |
| move.max_decel.WR | 3.60 [2.59, 4.68] 5.82 | 5.18 [4.05, 6.17] 6.85 | +0.76 | +0.49 | off |
| move.max_speed.DB | 5.49 [4.37, 6.61] 7.70 | 6.52 [5.15, 7.83] 8.86 | +0.46 | +0.52 | check |
| move.max_speed.DL | 4.07 [3.25, 5.06] 6.02 | 4.07 [2.93, 5.80] 6.82 | +0.00 | +0.44 | check |
| move.max_speed.LB | 5.06 [4.03, 6.13] 7.16 | 5.52 [3.90, 6.96] 8.06 | +0.22 | +0.43 | check |
| move.max_speed.OL | 3.26 [2.61, 4.03] 4.81 | 3.25 [2.36, 4.10] 5.32 | -0.01 | +0.36 | check |
| move.max_speed.QB | 3.54 [2.51, 4.60] 5.52 | 3.54 [3.01, 4.74] 6.52 | +0.00 | +0.48 | check |
| move.max_speed.RB | 5.64 [4.70, 6.66] 7.57 | 5.34 [4.26, 6.33] 7.39 | -0.15 | -0.09 | ok |
| move.max_speed.TE | 5.27 [4.00, 6.58] 7.50 | 5.51 [3.81, 6.75] 7.50 | +0.09 | +0.00 | ok |
| move.max_speed.WR | 6.45 [5.03, 7.59] 8.40 | 7.00 [5.01, 7.75] 8.75 | +0.21 | +0.14 | ok |
| pass.box_rusher_depth_2s | 2.60 [1.30, 3.60] 4.50 | 2.50 [1.60, 3.10] 3.70 | -0.04 | -0.35 | check |
| pass.box_rusher_speed_0_5s | 1.77 [1.27, 2.24] 2.55 | 1.46 [1.25, 1.68] 1.90 | -0.32 | -0.67 | check |
| pass.nearest_defender_to_qb_at_throw | 2.96 [2.19, 3.80] 4.69 | 4.08 [2.62, 5.00] 5.51 | +0.70 | +0.51 | check |
| pass.ol_depth_given_2s | 3.04 [1.82, 3.60] 4.00 | 2.72 [2.08, 2.98] 3.20 | -0.18 | -0.45 | check |
| pass.pressure_2yd_before_throw | 30.5% | 20.4% | -0.33 |  | check |
| pass.qb_depth_at_throw | 7.20 [6.10, 8.30] 9.40 | 7.90 [7.70, 7.90] 8.20 | +0.32 | -0.55 | check |
| pass.separation_at_arrival | 3.14 [1.65, 5.21] 7.21 | 2.61 [1.55, 3.91] 5.33 | -0.15 | -0.53 | check |
| pass.time_to_throw | 2.60 [2.10, 3.20] 3.90 | 2.35 [2.05, 2.85] 3.30 | -0.23 | -0.55 | check |
| run.carrier_cross_los_s | 2.50 [2.30, 2.80] 3.30 | 2.70 [2.40, 2.90] 3.20 | +0.40 | -0.20 | check |
| run.carrier_peak_speed_before_contact | 5.67 [4.95, 6.60] 7.75 | 4.96 [3.95, 6.17] 7.52 | -0.43 | -0.14 | check |
| run.engaged_dl_driven_back_1s | -0.60 [-0.90, -0.30] -0.10 | -0.30 [-0.60, -0.10] 0.00 | +0.50 | +0.17 | check |
| run.engaged_dl_driven_back_2s | -0.50 [-1.40, 0.20] 0.70 | -0.30 [-0.90, 0.70] 1.50 | +0.13 | +0.50 | check |
| run.engaged_dl_driven_back_3s | 0.20 [-0.90, 1.20] 2.00 | -0.30 [-0.90, 1.30] 3.00 | -0.24 | +0.48 | check |
| run.first_contact_s | 2.70 [2.40, 3.20] 3.90 | 2.80 [2.45, 3.25] 3.65 | +0.12 | -0.31 | check |
| run.handoff_s | 1.30 [1.20, 1.40] 1.50 | 1.30 [1.05, 1.50] 1.50 | +0.00 | +0.00 | ok |
| run.max_engaged_dl_driven_back_3s | 1.00 [0.10, 1.80] 2.50 | 1.90 [0.60, 3.10] 4.40 | +0.53 | +1.12 | off |
| run.ol_forward_1s | 0.40 [0.20, 0.58] 0.76 | 0.56 [0.34, 0.74] 0.86 | +0.42 | +0.26 | check |
| run.yards | 3.00 [1.00, 6.00] 10.00 | 1.70 [0.04, 5.39] 12.11 | -0.26 | +0.42 | check |
| run.yards_after_contact | 2.40 [1.30, 3.80] 6.20 | 1.57 [0.84, 2.75] 6.01 | -0.33 | -0.08 | check |
| run.yards_before_contact | 0.60 [-0.80, 2.20] 4.70 | 0.10 [-1.20, 2.30] 4.70 | -0.17 | +0.00 | ok |

## Runs by concept family

| Metric | NFL | Sim | Shift | Tail | Flag |
|---|---|---|---:|---:|---|
| inside_zone: handoff_s | 1.20 [1.10, 1.30] 1.40 | 1.30 [1.05, 1.50] 1.50 | +0.50 | +0.50 | check |
| inside_zone: carrier_cross_los_s | 2.30 [2.10, 2.50] 2.70 | n=28 | | | too few |
| inside_zone: yards_before_contact | 0.70 [-0.40, 2.10] 4.00 | 0.40 [-1.00, 1.50] 3.30 | -0.12 | -0.28 | check |
| inside_zone: yards_after_contact | 2.20 [1.10, 3.40] 5.50 | 1.75 [1.23, 2.32] 3.91 | -0.20 | -0.69 | check |
| inside_zone: max_engaged_dl_driven_back_3s | 1.10 [0.30, 1.90] 2.60 | 3.10 [1.80, 3.80] 4.50 | +1.25 | +1.19 | off |
| inside_zone: yards | 3.00 [1.00, 5.00] 9.00 | 2.23 [0.74, 5.19] 11.11 | -0.19 | +0.53 | check |
| outside_zone: handoff_s | 1.30 [1.20, 1.40] 1.50 | 1.05 [1.00, 1.30] 1.50 | -1.25 | +0.00 | off |
| outside_zone: carrier_cross_los_s | 2.60 [2.40, 2.90] 3.30 | 2.50 [2.40, 2.80] 2.80 | -0.20 | -1.00 | off |
| outside_zone: yards_before_contact | 0.40 [-1.10, 2.10] 4.40 | 2.20 [-0.80, 4.50] 8.50 | +0.56 | +1.28 | off |
| outside_zone: yards_after_contact | 2.60 [1.50, 3.90] 6.40 | 3.13 [1.74, 5.56] 11.39 | +0.22 | +2.08 | off |
| outside_zone: max_engaged_dl_driven_back_3s | 1.00 [0.00, 1.90] 2.70 | 1.90 [0.40, 3.00] 4.20 | +0.47 | +0.79 | off |
| outside_zone: yards | 3.00 [1.00, 6.00] 10.00 | 5.57 [1.49, 12.22] 18.46 | +0.51 | +1.69 | off |
| gap_pull: handoff_s | 1.30 [1.20, 1.40] 1.50 | 1.30 [1.20, 1.50] 1.50 | +0.00 | +0.00 | ok |
| gap_pull: carrier_cross_los_s | 2.60 [2.30, 3.10] 3.60 | 3.00 [2.80, 3.20] 3.40 | +0.50 | -0.25 | check |
| gap_pull: yards_before_contact | 0.70 [-0.90, 2.50] 5.30 | -0.50 [-1.40, 0.70] 2.10 | -0.35 | -0.94 | off |
| gap_pull: yards_after_contact | 2.50 [1.20, 4.30] 7.50 | 0.91 [0.56, 1.65] 2.95 | -0.51 | -1.47 | off |
| gap_pull: max_engaged_dl_driven_back_3s | 0.80 [-0.20, 1.60] 2.40 | 1.40 [0.50, 2.60] 4.50 | +0.33 | +1.17 | off |
| gap_pull: yards | 3.00 [1.00, 7.00] 12.00 | 0.42 [-0.56, 2.26] 4.40 | -0.43 | -1.27 | off |
| man_duo: handoff_s | 1.30 [1.20, 1.40] 1.50 | n=28 | | | too few |
| man_duo: carrier_cross_los_s | 2.40 [2.20, 2.60] 3.00 | n=17 | | | too few |
| man_duo: yards_before_contact | 0.50 [-0.60, 2.00] 3.90 | n=28 | | | too few |
| man_duo: yards_after_contact | 2.30 [1.20, 3.50] 5.60 | n=28 | | | too few |
| man_duo: max_engaged_dl_driven_back_3s | 1.10 [0.40, 1.80] 2.40 | n=21 | | | too few |
| man_duo: yards | 3.00 [1.00, 5.00] 9.00 | n=28 | | | too few |
| draw: handoff_s | 1.50 [1.30, 1.60] 1.70 | n=11 | | | too few |
| draw: carrier_cross_los_s | 2.70 [2.40, 3.10] 3.40 | n=5 | | | too few |
| draw: yards_before_contact | 1.20 [-1.10, 4.80] 9.10 | n=11 | | | too few |
| draw: yards_after_contact | 2.70 [1.20, 4.30] 6.20 | n=11 | | | too few |
| draw: max_engaged_dl_driven_back_3s | -0.20 [-1.70, 0.80] 1.40 | n=9 | | | too few |
| draw: yards | 4.00 [1.00, 9.00] 14.00 | n=11 | | | too few |

9 ok, 35 check, 17 off, 13 without enough sim plays.

Definitions: see `definitions` in either JSON, or scripts/mechanics/metrics.py.
