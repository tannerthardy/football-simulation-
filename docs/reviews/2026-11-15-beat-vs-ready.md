# Installed beats against route readiness (2026-11-15), for Rules' drop marking

QB lane, for Integration and Rules. QB_FOOTWORK bit 1 couples his reads and release to each read's installed step
(`plan.rhythm`), so a beat that lands before its route is ready is a marking fault in the install (Integration's
ruling: the drop is assigned to the concept; the quarterback does not wait inside a beat).

Operator: `scripts/diag/eyes/beat-vs-ready.ts` (installedPlan on every concept and formation of the paired staged
set) and `beat_vs_ready.py`. Engine-68 branch defaults; CONCEPT_DROPS off, then on (five-step class on the deeper set,
first answer on the hitch at set + 0.8 s). Per read: place (1, 2, ... ; outlet), receiver ref, step, beat and ready
times (s after the snap), beat minus ready. EARLY: the beat leads the route by more than 0.2 s. LATE: it trails by
more than a hitch (0.4 s). Reads 3+ and the outlet share the second hitch's beat; in bit 1 reads past the second hitch
move on by his dwell, so their LATE flags mean "open well before his eyes can get there" rather than a step fault.

## Summary by place

| | Read 1 ok / EARLY / LATE | Read 2 | Reads 3+ | Outlet |
| --- | --- | --- | --- | --- |
| CONCEPT_DROPS off | 11 / 21 / 0 | 17 / 15 / 0 | 32 / 1 / 31 | 12 / 0 / 18 |
| CONCEPT_DROPS on | 20 / 4 / 8 | 5 / 7 / 20 | 21 / 1 / 42 | 8 / 0 / 22 |

Off, read 1 arrives at a closed route on 21 of 32 installs (dagger, smash, mesh, drive: 0.7-1.1 s early). On, read 1
fits on 20 of 32, but read 2's beat (the second hitch, set + 1.2 s) comes after a route already open on 20 of 32
(smash, mesh, drive: 1.1-1.3 s late): the five-step's second answer is installed a full hitch after the route it reads.

## Rescored (Rules' keyed place) and #780's marking

A keyed high-low is one look on one beat (Rules + Coaching, #780): he reads the defender on the beat, throws the low on
time and the high when the man commits and it opens within a hitch after. Its two routes are now EARLY only past a
hitch (0.6 s). The plan's rhythm here is develop's (serial steps); Rules' own keyed-place rhythm is on #780.

| | Read 1 ok / EARLY / LATE | Read 2 | Reads 3+ | Outlet |
| --- | --- | --- | --- | --- |
| CONCEPT_DROPS off | 11 / 21 / 0 | 23 / 9 / 0 | 32 / 1 / 31 | 12 / 0 / 18 |
| CONCEPT_DROPS on, develop's marking | 20 / 4 / 8 | 7 / 5 / 20 | 21 / 1 / 42 | 8 / 0 / 22 |
| CONCEPT_DROPS on, #780's marking | 23 / 8 / 1 | 17 / 6 / 9 | 32 / 1 / 31 | 12 / 0 / 18 |

## Full list

```
concept / formation | drop off -> on | per read (place, ref:step beat/ready beat-ready FLAG), off then on
smash / gun_doubles_11 | set 1.9 -> 2.1
   off: 1 S2:set 1.90/2.60 -0.70 EARLY | 2 S1:hitch 2.30/2.00 +0.30 | 3 W1:hitch2 2.70/1.90 +0.80 LATE | 4 W2:hitch2 2.70/2.80 -0.10 | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 S2:hitch 2.90/2.60 +0.30 | 2 S1:hitch2 3.30/2.00 +1.30 LATE | 3 W1:hitch2 3.30/1.95 +1.35 LATE | 4 W2:hitch2 3.30/2.80 +0.50 LATE | outlet B:hitch2 3.30/2.20 +1.10 LATE
smash / gun_trips_11 | set 1.9 -> 2.1
   off: 1 S2:set 1.90/2.80 -0.90 EARLY | 2 S1:hitch 2.30/2.00 +0.30 | 3 S3:hitch2 2.70/1.90 +0.80 LATE | 4 W1:hitch2 2.70/1.90 +0.80 LATE | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 S2:hitch 2.90/2.80 +0.10 | 2 S1:hitch2 3.30/2.00 +1.30 LATE | 3 S3:hitch2 3.30/1.95 +1.35 LATE | 4 W1:hitch2 3.30/1.95 +1.35 LATE | outlet B:hitch2 3.30/2.20 +1.10 LATE
mesh / gun_doubles_11 | set 1.9 -> 2.1
   off: 1 S1:set 1.90/2.70 -0.80 EARLY | 2 S2:hitch 2.30/2.05 +0.25 | 3 W2:hitch2 2.70/2.10 +0.60 LATE | 4 W1:hitch2 2.70/2.70 +0.00 | outlet B:hitch2 2.70/2.00 +0.70 LATE
   on : 1 S1:hitch 2.90/2.70 +0.20 | 2 S2:hitch2 3.30/2.05 +1.25 LATE | 3 W2:hitch2 3.30/2.10 +1.20 LATE | 4 W1:hitch2 3.30/2.70 +0.60 LATE | outlet B:hitch2 3.30/2.00 +1.30 LATE
mesh / gun_trips_11 | set 1.9 -> 2.1
   off: 1 S1:set 1.90/2.70 -0.80 EARLY | 2 S2:hitch 2.30/2.20 +0.10 | 3 S3:hitch2 2.70/1.95 +0.75 LATE | 4 W1:hitch2 2.70/2.70 +0.00 | outlet B:hitch2 2.70/2.00 +0.70 LATE
   on : 1 S1:hitch 2.90/2.70 +0.20 | 2 S2:hitch2 3.30/2.20 +1.10 LATE | 3 S3:hitch2 3.30/1.98 +1.32 LATE | 4 W1:hitch2 3.30/2.70 +0.60 LATE | outlet B:hitch2 3.30/2.00 +1.30 LATE
flood / gun_doubles_11 | set 1.9 -> 2.1
   off: 1 S2:set 1.90/2.30 -0.40 EARLY | 2 S1:hitch 2.30/2.80 -0.50 EARLY | 3 W1:hitch2 2.70/2.90 -0.20 | 4 W2:hitch2 2.70/2.20 +0.50 LATE | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 S2:hitch 2.90/2.30 +0.60 LATE | 2 S1:hitch2 3.30/2.80 +0.50 LATE | 3 W1:hitch2 3.30/2.90 +0.40 | 4 W2:hitch2 3.30/2.20 +1.10 LATE | outlet B:hitch2 3.30/2.20 +1.10 LATE
flood / gun_trips_11 | set 1.9 -> 2.1
   off: 1 S3:set 1.90/1.90 +0.00 | 2 S2:hitch 2.30/2.40 -0.10 | 3 S1:hitch2 2.70/2.70 +0.00 | 4 W1:hitch2 2.70/2.90 -0.20 | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 S3:hitch 2.90/1.95 +0.95 LATE | 2 S1:hitch2 3.30/2.70 +0.60 LATE | 3 S2:hitch2 3.30/2.40 +0.90 LATE | 4 W1:hitch2 3.30/2.90 +0.40 | outlet B:hitch2 3.30/2.20 +1.10 LATE
drive / gun_doubles_11 | set 1.9 -> 2.1
   off: 1 S2:set 1.90/2.90 -1.00 EARLY | 2 W2:hitch 2.30/2.20 +0.10 | 3 S1:hitch2 2.70/2.80 -0.10 | 4 W1:hitch2 2.70/2.70 +0.00 | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 S2:hitch 2.90/2.90 +0.00 | 2 W2:hitch2 3.30/2.20 +1.10 LATE | 3 S1:hitch2 3.30/2.80 +0.50 LATE | 4 W1:hitch2 3.30/2.70 +0.60 LATE | outlet B:hitch2 3.30/2.20 +1.10 LATE
drive / gun_trips_11 | set 1.9 -> 2.1
   off: 1 S2:set 1.90/3.00 -1.10 EARLY | 2 S1:hitch 2.30/2.70 -0.40 EARLY | 3 S3:hitch2 2.70/2.70 +0.00 | 4 W1:hitch2 2.70/2.70 +0.00 | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 S2:hitch 2.90/3.00 -0.10 | 2 S1:hitch2 3.30/2.70 +0.60 LATE | 3 S3:hitch2 3.30/2.70 +0.60 LATE | 4 W1:hitch2 3.30/2.70 +0.60 LATE | outlet B:hitch2 3.30/2.20 +1.10 LATE
sail_corner / gun_doubles_11 | set 1.9 -> 2.1
   off: 1 S2:set 1.90/2.00 -0.10 | 2 S1:hitch 2.30/2.70 -0.40 EARLY | 3 W1:hitch2 2.70/1.90 +0.80 LATE | 4 W2:hitch2 2.70/2.90 -0.20 | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 S2:hitch 2.90/2.00 +0.90 LATE | 2 S1:hitch2 3.30/2.70 +0.60 LATE | 3 W1:hitch2 3.30/1.95 +1.35 LATE | 4 W2:hitch2 3.30/2.90 +0.40 | outlet B:hitch2 3.30/2.20 +1.10 LATE
sail_corner / gun_trips_11 | set 1.9 -> 2.1
   off: 1 S2:set 1.90/2.10 -0.20 | 2 S1:hitch 2.30/2.70 -0.40 EARLY | 3 S3:hitch2 2.70/1.90 +0.80 LATE | 4 W1:hitch2 2.70/1.90 +0.80 LATE | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 S3:hitch 2.90/1.95 +0.95 LATE | 2 S1:hitch2 3.30/2.70 +0.60 LATE | 3 S2:hitch2 3.30/2.10 +1.20 LATE | 4 W1:hitch2 3.30/1.95 +1.35 LATE | outlet B:hitch2 3.30/2.20 +1.10 LATE
corner_flat / gun_doubles_11 | set 1.9 -> 2.1
   off: 1 S1:set 1.90/2.70 -0.80 EARLY | 2 S2:hitch 2.30/1.90 +0.40 | 3 W1:hitch2 2.70/1.75 +0.95 LATE | 4 W2:hitch2 2.70/2.10 +0.60 LATE | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 S1:hitch 2.90/2.70 +0.20 | 2 S2:hitch2 3.30/1.95 +1.35 LATE | 3 W2:hitch2 3.30/2.10 +1.20 LATE | 4 W1:hitch2 3.30/1.95 +1.35 LATE | outlet B:hitch2 3.30/2.20 +1.10 LATE
corner_flat / gun_trips_11 | set 1.9 -> 2.1
   off: 1 S1:set 1.90/2.70 -0.80 EARLY | 2 S2:hitch 2.30/2.10 +0.20 | 3 S3:hitch2 2.70/1.90 +0.80 LATE | 4 W1:hitch2 2.70/1.75 +0.95 LATE | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 S1:hitch 2.90/2.70 +0.20 | 2 S2:hitch2 3.30/2.10 +1.20 LATE | 3 S3:hitch2 3.30/1.95 +1.35 LATE | 4 W1:hitch2 3.30/1.95 +1.35 LATE | outlet B:hitch2 3.30/2.20 +1.10 LATE
trips_sail / gun_doubles_11 | set 1.9 -> 2.1
   off: 1 S1:set 1.90/2.80 -0.90 EARLY | 2 S2:hitch 2.30/2.30 +0.00 | 3 W1:hitch2 2.70/1.90 +0.80 LATE | 4 W2:hitch2 2.70/2.10 +0.60 LATE | outlet B:hitch2 2.70/2.60 +0.10
   on : 1 S1:hitch 2.90/2.80 +0.10 | 2 S2:hitch2 3.30/2.30 +1.00 LATE | 3 W1:hitch2 3.30/1.95 +1.35 LATE | 4 W2:hitch2 3.30/2.10 +1.20 LATE | outlet B:hitch2 3.30/2.60 +0.70 LATE
trips_sail / gun_trips_11 | set 1.9 -> 2.1
   off: 1 S3:set 1.90/1.90 +0.00 | 2 S2:hitch 2.30/2.40 -0.10 | 3 S1:hitch2 2.70/2.70 +0.00 | 4 W1:hitch2 2.70/1.90 +0.80 LATE | outlet B:hitch2 2.70/2.60 +0.10
   on : 1 S1:hitch 2.90/2.70 +0.20 | 2 S2:hitch2 3.30/2.40 +0.90 LATE | 3 S3:hitch2 3.30/1.95 +1.35 LATE | 4 W1:hitch2 3.30/1.95 +1.35 LATE | outlet B:hitch2 3.30/2.60 +0.70 LATE
trips_outs / gun_doubles_11 | set 1.9 -> 2.1
   off: 1 S1:set 1.90/2.80 -0.90 EARLY | 2 S2:hitch 2.30/2.30 +0.00 | 3 W2:hitch2 2.70/2.90 -0.20 | 4 W1:hitch2 2.70/1.90 +0.80 LATE
   on : 1 S2:hitch 2.90/2.30 +0.60 LATE | 2 S1:hitch2 3.30/2.80 +0.50 LATE | 3 W1:hitch2 3.30/1.95 +1.35 LATE | 4 W2:hitch2 3.30/2.90 +0.40
trips_outs / gun_trips_11 | set 1.9 -> 2.1
   off: 1 S3:set 1.90/1.90 +0.00 | 2 S2:hitch 2.30/2.40 -0.10 | 3 S1:hitch2 2.70/2.70 +0.00 | 4 W1:hitch2 2.70/1.90 +0.80 LATE
   on : 1 S1:hitch 2.90/2.70 +0.20 | 2 S2:hitch2 3.30/2.40 +0.90 LATE | 3 S3:hitch2 3.30/1.95 +1.35 LATE | 4 W1:hitch2 3.30/1.95 +1.35 LATE
double_outs / gun_doubles_11 | set 1.9 -> 2.1
   off: 1 S2:set 1.90/2.00 -0.10 | 2 S1:hitch 2.30/2.40 -0.10 | 3 W1:hitch2 2.70/1.90 +0.80 LATE | 4 W2:hitch2 2.70/2.40 +0.30 | outlet B:hitch2 2.70/2.45 +0.25
   on : 1 S2:hitch 2.90/2.00 +0.90 LATE | 2 S1:hitch2 3.30/2.40 +0.90 LATE | 3 W1:hitch2 3.30/1.95 +1.35 LATE | 4 W2:hitch2 3.30/2.40 +0.90 LATE | outlet B:hitch2 3.30/2.45 +0.85 LATE
double_outs / gun_trips_11 | set 1.9 -> 2.1
   off: 1 S1:set 1.90/2.30 -0.40 EARLY | 2 S2:hitch 2.30/2.10 +0.20 | 3 S3:hitch2 2.70/1.90 +0.80 LATE | 4 W1:hitch2 2.70/1.90 +0.80 LATE | outlet B:hitch2 2.70/2.45 +0.25
   on : 1 S1:hitch 2.90/2.30 +0.60 LATE | 2 S2:hitch2 3.30/2.10 +1.20 LATE | 3 S3:hitch2 3.30/1.95 +1.35 LATE | 4 W1:hitch2 3.30/1.95 +1.35 LATE | outlet B:hitch2 3.30/2.45 +0.85 LATE
comebacks / gun_doubles_11 | set 2.3 -> 2.1
   off: 1 S2:set 2.30/2.90 -0.60 EARLY | 2 S1:hitch 2.70/3.30 -0.60 EARLY | 3 W1:hitch2 3.10/3.20 -0.10 | 4 W2:hitch2 3.10/2.90 +0.20 | outlet B:hitch2 3.10/2.20 +0.90 LATE
   on : 1 S2:hitch 2.90/2.90 +0.00 | 2 S1:hitch2 3.30/3.30 +0.00 | 3 W1:hitch2 3.30/3.20 +0.10 | 4 W2:hitch2 3.30/2.90 +0.40 | outlet B:hitch2 3.30/2.20 +1.10 LATE
comebacks / gun_trips_11 | set 2.3 -> 2.1
   off: 1 S3:set 2.30/2.15 +0.15 | 2 S1:hitch 2.70/3.20 -0.50 EARLY | 3 S2:hitch2 3.10/3.00 +0.10 | 4 W1:hitch2 3.10/3.20 -0.10 | outlet B:hitch2 3.10/2.20 +0.90 LATE
   on : 1 S3:hitch 2.90/1.95 +0.95 LATE | 2 S1:hitch2 3.30/3.20 +0.10 | 3 S2:hitch2 3.30/3.00 +0.30 | 4 W1:hitch2 3.30/3.20 +0.10 | outlet B:hitch2 3.30/2.20 +1.10 LATE
dagger / gun_doubles_11 | set 1.9 -> 1.9
   off: 1 S2:set 1.90/2.70 -0.80 EARLY | 2 S1:hitch 2.30/3.00 -0.70 EARLY | 3 W1:hitch2 2.70/2.70 +0.00 | 4 W2:hitch2 2.70/2.10 +0.60 LATE | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 S2:hitch 2.70/2.70 +0.00 | 2 S1:hitch2 3.10/3.00 +0.10 | 3 W1:hitch2 3.10/2.70 +0.40 | 4 W2:hitch2 3.10/2.10 +1.00 LATE | outlet B:hitch2 3.10/2.20 +0.90 LATE
dagger / gun_trips_11 | set 1.9 -> 1.9
   off: 1 S2:set 1.90/2.90 -1.00 EARLY | 2 S1:hitch 2.30/2.90 -0.60 EARLY | 3 S3:hitch2 2.70/2.00 +0.70 LATE | 4 W1:hitch2 2.70/2.70 +0.00 | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 S2:hitch 2.70/2.90 -0.20 | 2 S1:hitch2 3.10/2.90 +0.20 | 3 S3:hitch2 3.10/2.00 +1.10 LATE | 4 W1:hitch2 3.10/2.70 +0.40 | outlet B:hitch2 3.10/2.20 +0.90 LATE
y_cross / gun_doubles_11 | set 1.9 -> 1.9
   off: 1 W1:set 1.90/2.70 -0.80 EARLY | 2 S2:hitch 2.30/1.90 +0.40 | 3 S1:hitch2 2.70/2.80 -0.10 | 4 W2:hitch2 2.70/2.10 +0.60 LATE | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 W1:hitch 2.70/2.70 +0.00 | 2 S2:hitch2 3.10/1.90 +1.20 LATE | 3 S1:hitch2 3.10/2.80 +0.30 | 4 W2:hitch2 3.10/2.10 +1.00 LATE | outlet B:hitch2 3.10/2.20 +0.90 LATE
y_cross / gun_trips_11 | set 1.9 -> 1.9
   off: 1 W1:set 1.90/2.70 -0.80 EARLY | 2 S2:hitch 2.30/2.00 +0.30 | 3 S3:hitch2 2.70/1.90 +0.80 LATE | 4 S1:hitch2 2.70/2.70 +0.00 | outlet B:hitch2 2.70/2.20 +0.50 LATE
   on : 1 W1:hitch 2.70/2.70 +0.00 | 2 S2:hitch2 3.10/2.00 +1.10 LATE | 3 S3:hitch2 3.10/1.90 +1.20 LATE | 4 S1:hitch2 3.10/2.70 +0.40 | outlet B:hitch2 3.10/2.20 +0.90 LATE
four_verts / gun_doubles_11 | set 1.7 -> 1.7
   off: 1 S2:set 1.70/2.70 -1.00 EARLY | 2 S1:hitch 2.10/2.80 -0.70 EARLY | 3 W1:hitch2 2.50/2.70 -0.20 | 4 W2:hitch2 2.50/2.90 -0.40 EARLY | outlet B:hitch2 2.50/2.20 +0.30
   on : 1 S2:set 1.70/2.70 -1.00 EARLY | 2 S1:hitch 2.10/2.80 -0.70 EARLY | 3 W1:hitch2 2.50/2.70 -0.20 | 4 W2:hitch2 2.50/2.90 -0.40 EARLY | outlet B:hitch2 2.50/2.20 +0.30
four_verts / gun_trips_11 | set 1.7 -> 1.7
   off: 1 S3:set 1.70/2.70 -1.00 EARLY | 2 S2:hitch 2.10/2.90 -0.80 EARLY | 3 S1:hitch2 2.50/2.70 -0.20 | 4 W1:hitch2 2.50/2.70 -0.20 | outlet B:hitch2 2.50/2.20 +0.30
   on : 1 S3:set 1.70/2.70 -1.00 EARLY | 2 S2:hitch 2.10/2.90 -0.80 EARLY | 3 S1:hitch2 2.50/2.70 -0.20 | 4 W1:hitch2 2.50/2.70 -0.20 | outlet B:hitch2 2.50/2.20 +0.30
verts_hitch / gun_doubles_11 | set 1.7 -> 1.7
   off: 1 S2:set 1.70/2.70 -1.00 EARLY | 2 S1:hitch 2.10/2.80 -0.70 EARLY | 3 W1:hitch2 2.50/2.70 -0.20 | 4 W2:hitch2 2.50/2.10 +0.40 | outlet B:hitch2 2.50/2.20 +0.30
   on : 1 S2:set 1.70/2.70 -1.00 EARLY | 2 S1:hitch 2.10/2.80 -0.70 EARLY | 3 W1:hitch2 2.50/2.70 -0.20 | 4 W2:hitch2 2.50/2.10 +0.40 | outlet B:hitch2 2.50/2.20 +0.30
verts_hitch / gun_trips_11 | set 1.7 -> 1.7
   off: 1 S2:set 1.70/2.90 -1.20 EARLY | 2 S1:hitch 2.10/2.70 -0.60 EARLY | 3 S3:hitch2 2.50/1.90 +0.60 LATE | 4 W1:hitch2 2.50/2.70 -0.20 | outlet B:hitch2 2.50/2.20 +0.30
   on : 1 S2:set 1.70/2.90 -1.20 EARLY | 2 S1:hitch 2.10/2.70 -0.60 EARLY | 3 S3:hitch2 2.50/1.90 +0.60 LATE | 4 W1:hitch2 2.50/2.70 -0.20 | outlet B:hitch2 2.50/2.20 +0.30
stick / gun_doubles_11 | set 1.7 -> 1.7
   off: 1 S2:set 1.70/1.80 -0.10 | 2 S1:hitch 2.10/2.80 -0.70 EARLY | 3 W1:hitch2 2.50/1.55 +0.95 LATE | 4 W2:hitch2 2.50/1.90 +0.60 LATE | outlet B:hitch2 2.50/2.20 +0.30
   on : 1 S2:set 1.70/1.80 -0.10 | 2 S1:hitch 2.10/2.80 -0.70 EARLY | 3 W1:hitch2 2.50/1.55 +0.95 LATE | 4 W2:hitch2 2.50/1.90 +0.60 LATE | outlet B:hitch2 2.50/2.20 +0.30
stick / gun_trips_11 | set 1.7 -> 1.7
   off: 1 S2:set 1.70/1.90 -0.20 | 2 S3:hitch 2.10/1.90 +0.20 | 3 S1:hitch2 2.50/2.70 -0.20 | 4 W1:hitch2 2.50/1.55 +0.95 LATE | outlet B:hitch2 2.50/2.20 +0.30
   on : 1 S2:set 1.70/1.90 -0.20 | 2 S3:hitch 2.10/1.90 +0.20 | 3 S1:hitch2 2.50/2.70 -0.20 | 4 W1:hitch2 2.50/1.55 +0.95 LATE | outlet B:hitch2 2.50/2.20 +0.30
curl_flat / gun_doubles_11 | set 1.9 -> 1.9
   off: 1 S2:set 1.90/1.90 +0.00 | 2 S1:hitch 2.30/2.70 -0.40 EARLY | 3 W1:hitch2 2.70/2.60 +0.10 | 4 W2:hitch2 2.70/2.10 +0.60 LATE | outlet B:hitch2 2.70/2.45 +0.25
   on : 1 S2:set 1.90/1.90 +0.00 | 2 S1:hitch 2.30/2.70 -0.40 EARLY | 3 W1:hitch2 2.70/2.60 +0.10 | 4 W2:hitch2 2.70/2.10 +0.60 LATE | outlet B:hitch2 2.70/2.45 +0.25
curl_flat / gun_trips_11 | set 1.9 -> 1.9
   off: 1 S2:set 1.90/2.10 -0.20 | 2 S1:hitch 2.30/2.70 -0.40 EARLY | 3 S3:hitch2 2.70/1.90 +0.80 LATE | 4 W1:hitch2 2.70/2.60 +0.10 | outlet B:hitch2 2.70/2.45 +0.25
   on : 1 S2:set 1.90/2.10 -0.20 | 2 S1:hitch 2.30/2.70 -0.40 EARLY | 3 S3:hitch2 2.70/1.90 +0.80 LATE | 4 W1:hitch2 2.70/2.60 +0.10 | outlet B:hitch2 2.70/2.45 +0.25
off: reads ok 72, EARLY 37, LATE 49
on: reads ok 54, EARLY 12, LATE 92
by place (reads 3+ share the second hitch's beat; in QB_FOOTWORK bit 1 they move on by the dwell):
  off: read 1: ok 11 EARLY 21 LATE 0 | read 2: ok 17 EARLY 15 LATE 0 | read 3+: ok 32 EARLY 1 LATE 31 | read outlet: ok 12 EARLY 0 LATE 18
  on: read 1: ok 20 EARLY 4 LATE 8 | read 2: ok 5 EARLY 7 LATE 20 | read 3+: ok 21 EARLY 1 LATE 42 | read outlet: ok 8 EARLY 0 LATE 22
```
