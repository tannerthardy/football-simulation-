# Football drag: what the sources say, what the tracking can and cannot separate, and a proposed law (proposal only, no build)

Tools/Physics, 2026-11-24, for Integration. The QB lane's record: `docs/reviews/2026-11-23-ball-speed.md` (claude/exciting-cori-hc8l4u 16d2fc93a; operator `scripts/diag/eyes/ball_flight.py`): release speeds match the NFL's (22-25 yd/s), the NFL ball slows in flight and ours barely does; our `DRAG_SPIRAL` k = 0.003 /yd (C_d about 0.10) predicts our curve; the NFL implies k about 0.008-0.011 from mid-flight to arrival (C_d about 0.3).

## What I checked in the sources, and what I did not

Read (full text extracted from the PDFs the fetch tool saved):

- **Watts and Moore, Am. J. Phys. 71 (8), 791-793 (2003)**: drag coefficient of a football with its major axis into the wind, in a wind tunnel, from a foam-rubber ball (length 20.8 cm, diameter 12.7 cm, length-to-diameter 1.8) on a pendulum suspension, speeds 10-30 m/s: **C_D = 0.05-0.06, about 10% lower when spinning at 600 rpm**, nearly independent of Reynolds number above 10^5. They state that Rae and Streit (2002) found about **0.15 at 60 mph (26.82 m/s)**, that Cunningham and Dowell's data imply about 0.5, and that Brancazio assumed about 0.1; they do not explain the factor of 2-3 against Rae and Streit, noting that Rae and Streit said their measurement may have been affected by wires through the ball and that their own ball may be smoother than a game ball.
- **Price, Moss and Gay, "The paradox of the tight spiral pass in American football" (LLNL-JRNL-809624, 2020)**: the attitude. The spin axis stays near its launch direction (gyroscopic stability) while the velocity vector rotates downward under gravity (about 0.37 rad/s in their example, a 27.4 m/s, 30 degree launch), so an angle of attack develops after launch; the aerodynamic torque it causes (Rae and Streit: proportional to sin 2 of the angle) makes the axis precess so the ball's nose follows the trajectory, and **the misalignment stays small** (they quote about 9 degrees of yaw at one point of Rae's trajectory). They neglect the drag on the centre of mass; the paper does not give a C_D against angle of attack or a speed loss in flight.

Not read (the fetches returned 403): Alam et al. (aerodynamic drag measurement of American footballs), the UNL toppling-ball paper and the ASME "modeling the dynamics" paper. A search summary says a 2022 modeling paper uses a C_D of 0.2 at zero angle of attack, 0.5 at 45 degrees and 0.8 at 90 degrees and attributes it to Rae and Streit; **I could not check that attribution against Rae and Streit's paper** (Sports Engineering 5, 165-172, 2002, not obtained). Treat those three numbers as unverified. The NFL ball's size and mass (about 17 cm at its widest, 28 cm long, 14-15 oz) are from the league's published specification, recalled and not checked here.

So the literature fixes this much and no more: end-on C_D for a spinning ball is somewhere between 0.055 (Watts and Moore) and 0.15 (Rae and Streit, quoted by Watts and Moore), a factor of three between two wind-tunnel measurements, and it is larger at an angle of attack (Rae and Streit's torque law is evidence of an attitude dependence; the numbers I could not verify). **A published C_D cannot decide the constant; the in-situ NFL deceleration is the better constraint.**

## Converting between the constants

For quadratic drag on a ball of mass m and frontal area A, dv/ds = -k v with k = rho C_D A / (2 m). With rho = 1.2 kg/m^3, A = pi x (0.171/2)^2 = 0.0230 m^2 (end on), m = 0.43 kg, and 1 yd = 0.9144 m: **k = 0.029 x C_D per yd**. Our 0.003 is C_D 0.10 end on, as the QB lane says (inside the published 0.055-0.15 range). The NFL's 0.008-0.011 is C_D 0.28-0.38 on the end-on area.

My own check of their numbers from the means they quote: 10-20 yd (mid-flight about 7 yd before arrival) 22.8 to 20.7 gives k about 0.013 /yd; 20-35 yd (about 14 yd before arrival) 21.0 to 17.1 gives about 0.015 /yd. That is higher than their 0.008-0.011; I do not know whether theirs uses path rather than horizontal distance, or a different mid-flight point, and the two should be reconciled by re-running their operator by air distance with intervals before any constant is chosen.

## Is an attitude-dependent drag needed?

An angle of attack raises both the presented area (end-on 0.023 m^2, broadside about 0.038 m^2 for an ellipsoid of those dimensions) and C_D. Using Rae and Streit's end-on 0.15-0.2 and the unverified 0.5 at 45 degrees, an angle of attack of 5-10 degrees puts the effective C_D (on the end-on area) at about 0.26-0.35, which is the NFL's range; with Watts and Moore's 0.055 it would need 20 degrees or more, which the attitude papers do not support. So **an angle of attack of a few to ten degrees through the flight is enough to account for the NFL's deceleration** if the higher wind-tunnel value is the right end-on one. That is plausible for real passes (wobble, imperfect spirals, a ball that is not tight) and the QB lane's candidate (the axis does not follow the descent) is the right mechanism, but the same paper says the misalignment saturates, so the angle does not grow without bound through the flight.

My recommendation is the simplest law that is consistent with the evidence: **one effective drag constant k, constant through the flight, set from the NFL's measured in-flight deceleration (a physical measurement of the ball, not an outcome), and the attitude mechanism recorded as its explanation.** An attitude-dependent law (angle of attack from the axis lag, then C_D(alpha) and A(alpha)) would add three constants none of which the tracking can identify, because tracking gives the ball's position, not its nose. It is warranted only if the NFL's k differs systematically by flight length or by a pass type in a way a constant cannot fit; from the means above it rises only slightly with distance (0.013 to 0.015) and is within what the intervals will probably cover.

## What the measurement can and cannot separate

- It is 2D horizontal speed from 10 Hz positions: speed along the ground is v cos(flight angle); its relative decay with drag is dv_h / v_h = -k ds along the path (so the path, a little longer than the horizontal distance on a lofted ball, is the distance to use), and it carries tracker smoothing and noise (the QB lane says release frames are noisy, p90 above 30 yd/s, and uses mid-flight onward).
- Wind (unmeasured, the games' mean headwind is not zero for a given pass; it adds variance and, on one-sided stadium samples, bias), air density (altitude, temperature), a wet ball, and the ball's attitude are not separable: **the tracking measures a path-averaged effective C_D A, not an angle of attack.**
- The arrival frame: on both sides the speed at the arrival frame is not a ball speed (ours jumps to the catcher on `pass_arrived`; the NFL's `pass_arrived` falls after the catch on many plays and gives a speed of 5 yd/s). The QB lane excludes it.
- Selection: passes with a mid-flight and an arrival sample are the longer ones.

## What changing the drag does (my arithmetic, a toy trajectory, not the QB lane's code)

A point ball with quadratic drag k and gravity, thrown from 1.8 yd and caught at 1.3 yd, with the flight time T held fixed (T = 1.44, 1.96, 2.48 s for 25, 35, 45 yd; invented nominal times, only to show the direction). The QB_DRIVE launch is fitted to NFL flight times by distance, so it must be re-derived from the same times with the new k. With the flight time held:

| air distance | k | release speed | arrival speed | horizontal arrival speed | apex |
|---|---|---|---|---|---|
| 25 yd | 0.003 | 19.5 | 18.5 | 16.7 | 4.3 yd |
| 25 yd | 0.0095 | 21.1 | 17.2 | 15.4 | 4.3 yd |
| 35 yd | 0.003 | 21.6 | 19.9 | 16.9 | 6.7 yd |
| 35 yd | 0.0095 | 24.0 | 18.1 | 15.0 | 6.7 yd |
| 45 yd | 0.003 | 23.7 | 21.4 | 16.9 | 9.8 yd |
| 45 yd | 0.0095 | 27.1 | 19.2 | 14.5 | 9.8 yd |

- **Hang time and apex are unchanged by construction** (the time is the fit); the release speed must rise by 1.6, 2.4 and 3.4 yd/s and the arrival speed falls by 1.3, 1.8 and 2.2 yd/s. If the launch is not re-derived (same release), the same pass takes 0.13, 0.26 and 0.46 s longer and lands 1.8, 3.5 and 5.7 yd short at the old time: the deep ball hangs longer and falls short.
- **A consistency check the proposal needs to pass:** the QB lane finds ours already match the NFL's release speeds (22-25 yd/s) while the NFL's flight times are what the fit reproduces. A drag of k 0.0095 would need release speeds of 24-27 yd/s for the long balls to hold their times, above the matched range. Either the NFL's long-pass times are longer than the fit assumes (the fit should be re-derived from the times, as Integration says), or the NFL's k is lower than 0.0095 on the long balls, or the tracked release speeds on long balls are underestimates (the p90 noise). Re-deriving QB_DRIVE from the NFL flight times with candidate k values and comparing the implied release speeds with the tracked ones will say which, and that is a stated check, not a retune.
- **Arrival speed.** The fraction of arrivals above 24 yd/s (ours 22-33%, the NFL's 4-8%) falls with the new drag: with release speeds held at 22-25 and k 0.0095, the 35-yd arrival speed is about 18-19 in my toy, well under 24. In the catch roll the hard-ball step at 24 yd/s (1.16 points of expected failure on our on-target rolls, 14% of it) then rarely fires, which would take about one point off our uncontested drop rate: a consequence to check, not a reason to choose the constant.

## Proposed path (nothing built)

1. QB lane re-runs `ball_flight.py` by air distance with intervals on both horizontal distance and path length, on all weeks, and reports k with its band and the release speeds it implies. Reconcile the two estimates above.
2. Take the effective k from that measurement (a physical constant of the ball in flight, stated with its band), constant through the flight, behind a flag.
3. Re-derive QB_DRIVE's release speed and angle by distance from the NFL flight times with that k; check the implied release speeds against the tracked ones (the consistency check above) and the hang time against the NFL's by distance before anything else.
4. Then read the arrival-speed distribution and the share over 24 yd/s, and only then the catch roll's hard-ball step.
5. Keep the spiral attitude as the documented explanation; add an attitude law only if the intervals show k varying with distance or pass type in a way a constant cannot fit.
