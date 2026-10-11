# Sim vs NFL mechanisms (2dfc5fd)

NFL: Big Data Bowl 2025: 2022 regular season weeks 1-9 (all 22 players) (5462 runs, 9713 dropbacks).  
Sim: sim-plays.jsonl.gz at 2dfc5fd (265 runs, 793 dropbacks).

Values are median [25th, 75th percentile] 90th percentile; rates are shares of plays.
Shift and tail are the sim's median and 90th percentile minus the NFL's, in NFL interquartile ranges.

| Metric | NFL | Sim | Shift | Tail | Flag |
|---|---|---|---:|---:|---|
| move.max_accel.DB | 4.24 [3.43, 5.05] 5.88 | 4.68 [4.13, 5.35] 6.04 | +0.27 | +0.10 | check |
| move.max_accel.DL | 3.73 [3.07, 4.42] 5.05 | 4.41 [3.75, 5.14] 6.15 | +0.51 | +0.82 | off |
| move.max_accel.LB | 4.42 [3.65, 5.25] 5.91 | 4.37 [3.75, 5.07] 5.86 | -0.03 | -0.03 | ok |
| move.max_accel.OL | 3.11 [2.54, 3.72] 4.37 | 3.49 [2.79, 4.05] 4.65 | +0.32 | +0.24 | check |
| move.max_accel.QB | 3.84 [3.12, 4.75] 5.73 | 3.75 [3.12, 4.62] 5.33 | -0.05 | -0.24 | ok |
| move.max_accel.RB | 5.02 [4.18, 5.81] 6.56 | 4.40 [3.58, 5.24] 6.28 | -0.38 | -0.17 | check |
| move.max_accel.TE | 4.75 [3.78, 5.62] 6.27 | 4.95 [4.27, 5.59] 6.17 | +0.11 | -0.05 | ok |
| move.max_accel.WR | 5.55 [4.62, 6.25] 6.82 | 5.62 [5.00, 6.25] 6.28 | +0.05 | -0.33 | check |
| move.max_decel.DB | 3.12 [2.09, 4.37] 5.56 | 4.17 [2.62, 5.56] 6.59 | +0.46 | +0.45 | check |
| move.max_decel.DL | 2.79 [2.09, 3.67] 4.51 | 3.64 [2.72, 4.66] 5.62 | +0.53 | +0.70 | check |
| move.max_decel.LB | 3.39 [2.48, 4.46] 5.52 | 4.16 [2.91, 5.34] 6.28 | +0.39 | +0.38 | check |
| move.max_decel.OL | 2.53 [1.93, 3.16] 3.86 | 3.67 [2.65, 4.51] 5.25 | +0.92 | +1.13 | off |
| move.max_decel.QB | 2.92 [2.17, 3.75] 4.58 | 5.62 [3.75, 5.64] 6.25 | +1.72 | +1.06 | off |
| move.max_decel.RB | 3.60 [2.69, 4.53] 5.50 | 4.79 [3.24, 6.42] 7.44 | +0.64 | +1.05 | off |
| move.max_decel.TE | 3.19 [2.34, 4.25] 5.27 | 4.67 [3.41, 5.63] 6.37 | +0.77 | +0.58 | off |
| move.max_decel.WR | 3.60 [2.59, 4.68] 5.82 | 5.28 [3.88, 6.20] 6.88 | +0.80 | +0.50 | off |
| move.max_speed.DB | 5.49 [4.37, 6.61] 7.70 | 6.52 [5.06, 7.81] 8.94 | +0.46 | +0.56 | check |
| move.max_speed.DL | 4.07 [3.25, 5.06] 6.02 | 4.07 [2.85, 5.74] 6.86 | +0.00 | +0.47 | check |
| move.max_speed.LB | 5.06 [4.03, 6.13] 7.16 | 5.59 [3.78, 7.04] 8.08 | +0.25 | +0.44 | check |
| move.max_speed.OL | 3.26 [2.61, 4.03] 4.81 | 3.16 [2.31, 4.12] 5.30 | -0.07 | +0.34 | check |
| move.max_speed.QB | 3.54 [2.51, 4.60] 5.52 | 3.54 [3.00, 4.71] 6.50 | +0.00 | +0.47 | check |
| move.max_speed.RB | 5.64 [4.70, 6.66] 7.57 | 5.27 [4.05, 6.25] 7.35 | -0.19 | -0.11 | ok |
| move.max_speed.TE | 5.27 [4.00, 6.58] 7.50 | 5.52 [3.64, 6.75] 7.50 | +0.10 | +0.00 | ok |
| move.max_speed.WR | 6.45 [5.03, 7.59] 8.40 | 7.00 [5.01, 7.75] 8.69 | +0.21 | +0.11 | ok |
| pass.box_rusher_depth_2s | 2.60 [1.30, 3.60] 4.50 | 2.50 [1.70, 3.10] 3.70 | -0.04 | -0.35 | check |
| pass.box_rusher_speed_0_5s | 1.77 [1.27, 2.24] 2.55 | 1.46 [1.25, 1.68] 1.90 | -0.32 | -0.67 | check |
| pass.nearest_defender_to_qb_at_throw | 2.96 [2.19, 3.80] 4.69 | 4.05 [2.59, 4.96] 5.46 | +0.68 | +0.48 | check |
| pass.ol_depth_given_2s | 3.04 [1.82, 3.60] 4.00 | 2.70 [2.14, 2.98] 3.16 | -0.19 | -0.47 | check |
| pass.pressure_2yd_before_throw | 30.5% | 19.3% | -0.37 |  | check |
| pass.qb_depth_at_throw | 7.20 [6.10, 8.30] 9.40 | 7.90 [7.20, 7.90] 8.20 | +0.32 | -0.55 | check |
| pass.separation_at_arrival | 3.14 [1.65, 5.21] 7.21 | 2.62 [1.58, 3.90] 5.76 | -0.15 | -0.41 | check |
| pass.time_to_throw | 2.60 [2.10, 3.20] 3.90 | 2.35 [2.05, 2.80] 3.20 | -0.23 | -0.64 | check |
| run.carrier_cross_los_s | 2.50 [2.30, 2.80] 3.30 | 2.70 [2.40, 3.00] 3.20 | +0.40 | -0.20 | check |
| run.carrier_peak_speed_before_contact | 5.67 [4.95, 6.60] 7.75 | 5.06 [3.95, 6.13] 7.40 | -0.37 | -0.21 | check |
| run.engaged_dl_driven_back_1s | -0.60 [-0.90, -0.30] -0.10 | -0.30 [-0.60, -0.10] 0.00 | +0.50 | +0.17 | check |
| run.engaged_dl_driven_back_2s | -0.50 [-1.40, 0.20] 0.70 | -0.30 [-0.90, 0.70] 1.40 | +0.13 | +0.44 | check |
| run.engaged_dl_driven_back_3s | 0.20 [-0.90, 1.20] 2.00 | -0.20 [-0.80, 1.30] 2.90 | -0.19 | +0.43 | check |
| run.first_contact_s | 2.70 [2.40, 3.20] 3.90 | 2.80 [2.45, 3.20] 3.70 | +0.12 | -0.25 | ok |
| run.handoff_s | 1.30 [1.20, 1.40] 1.50 | 1.30 [1.05, 1.50] 1.50 | +0.00 | +0.00 | ok |
| run.max_engaged_dl_driven_back_3s | 1.00 [0.10, 1.80] 2.50 | 1.50 [0.40, 3.00] 4.10 | +0.29 | +0.94 | off |
| run.ol_forward_1s | 0.40 [0.20, 0.58] 0.76 | 0.56 [0.36, 0.80] 0.92 | +0.42 | +0.42 | check |
| run.yards | 3.00 [1.00, 6.00] 10.00 | 1.95 [0.10, 5.11] 11.10 | -0.21 | +0.22 | ok |
| run.yards_after_contact | 2.40 [1.30, 3.80] 6.20 | 1.41 [0.78, 2.85] 4.93 | -0.40 | -0.51 | check |
| run.yards_before_contact | 0.60 [-0.80, 2.20] 4.70 | 0.40 [-1.00, 2.20] 4.50 | -0.07 | -0.07 | ok |

## Runs by concept family

| Metric | NFL | Sim | Shift | Tail | Flag |
|---|---|---|---:|---:|---|
| inside_zone: handoff_s | 1.20 [1.10, 1.30] 1.40 | 1.30 [1.05, 1.50] 1.50 | +0.50 | +0.50 | check |
| inside_zone: carrier_cross_los_s | 2.30 [2.10, 2.50] 2.70 | n=22 | | | too few |
| inside_zone: yards_before_contact | 0.70 [-0.40, 2.10] 4.00 | 0.30 [-1.30, 1.90] 3.50 | -0.16 | -0.20 | ok |
| inside_zone: yards_after_contact | 2.20 [1.10, 3.40] 5.50 | 1.41 [0.83, 3.31] 4.30 | -0.34 | -0.52 | check |
| inside_zone: max_engaged_dl_driven_back_3s | 1.10 [0.30, 1.90] 2.60 | 2.20 [0.80, 4.00] 4.60 | +0.69 | +1.25 | off |
| inside_zone: yards | 3.00 [1.00, 5.00] 9.00 | 2.01 [-0.09, 4.61] 7.70 | -0.25 | -0.32 | check |
| outside_zone: handoff_s | 1.30 [1.20, 1.40] 1.50 | 1.15 [1.00, 1.50] 1.50 | -0.75 | +0.00 | off |
| outside_zone: carrier_cross_los_s | 2.60 [2.40, 2.90] 3.30 | 2.50 [2.40, 2.80] 2.90 | -0.20 | -0.80 | off |
| outside_zone: yards_before_contact | 0.40 [-1.10, 2.10] 4.40 | 1.30 [-0.80, 4.10] 6.30 | +0.28 | +0.59 | check |
| outside_zone: yards_after_contact | 2.60 [1.50, 3.90] 6.40 | 3.02 [1.65, 5.05] 10.68 | +0.17 | +1.78 | off |
| outside_zone: max_engaged_dl_driven_back_3s | 1.00 [0.00, 1.90] 2.70 | 1.30 [0.30, 2.60] 4.10 | +0.16 | +0.74 | check |
| outside_zone: yards | 3.00 [1.00, 6.00] 10.00 | 4.36 [2.03, 9.78] 15.09 | +0.27 | +1.02 | off |
| gap_pull: handoff_s | 1.30 [1.20, 1.40] 1.50 | 1.30 [1.20, 1.50] 1.50 | +0.00 | +0.00 | ok |
| gap_pull: carrier_cross_los_s | 2.60 [2.30, 3.10] 3.60 | 3.10 [2.90, 3.20] 3.50 | +0.62 | -0.13 | check |
| gap_pull: yards_before_contact | 0.70 [-0.90, 2.50] 5.30 | -0.40 [-1.40, 0.80] 2.50 | -0.32 | -0.82 | off |
| gap_pull: yards_after_contact | 2.50 [1.20, 4.30] 7.50 | 1.01 [0.56, 1.87] 2.85 | -0.48 | -1.50 | off |
| gap_pull: max_engaged_dl_driven_back_3s | 0.80 [-0.20, 1.60] 2.40 | 0.80 [0.20, 2.10] 3.00 | +0.00 | +0.33 | check |
| gap_pull: yards | 3.00 [1.00, 7.00] 12.00 | 0.80 [-0.52, 2.43] 5.32 | -0.37 | -1.11 | off |
| man_duo: handoff_s | 1.30 [1.20, 1.40] 1.50 | 1.30 [1.05, 1.50] 1.50 | +0.00 | +0.00 | ok |
| man_duo: carrier_cross_los_s | 2.40 [2.20, 2.60] 3.00 | 2.70 [2.40, 2.70] 2.80 | +0.75 | -0.50 | off |
| man_duo: yards_before_contact | 0.50 [-0.60, 2.00] 3.90 | 0.90 [0.30, 2.10] 3.00 | +0.15 | -0.35 | check |
| man_duo: yards_after_contact | 2.30 [1.20, 3.50] 5.60 | 1.36 [0.84, 2.42] 2.95 | -0.41 | -1.15 | off |
| man_duo: max_engaged_dl_driven_back_3s | 1.10 [0.40, 1.80] 2.40 | 3.30 [2.50, 3.70] 4.30 | +1.57 | +1.36 | off |
| man_duo: yards | 3.00 [1.00, 5.00] 9.00 | 1.85 [1.20, 3.91] 7.91 | -0.29 | -0.27 | check |
| draw: handoff_s | 1.50 [1.30, 1.60] 1.70 | n=13 | | | too few |
| draw: carrier_cross_los_s | 2.70 [2.40, 3.10] 3.40 | n=6 | | | too few |
| draw: yards_before_contact | 1.20 [-1.10, 4.80] 9.10 | n=11 | | | too few |
| draw: yards_after_contact | 2.70 [1.20, 4.30] 6.20 | n=11 | | | too few |
| draw: max_engaged_dl_driven_back_3s | -0.20 [-1.70, 0.80] 1.40 | n=8 | | | too few |
| draw: yards | 4.00 [1.00, 9.00] 14.00 | n=13 | | | too few |

13 ok, 36 check, 18 off, 7 without enough sim plays.

Definitions: see `definitions` in either JSON, or scripts/mechanics/metrics.py.

Guard: 8/8 matched metrics still match.
