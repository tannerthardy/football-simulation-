# The receiver's feet under a ball he is tracking: a control law on what he sees

Coverage, 2026-11-15. Status: design note for Integration; not built.

## The fault
With the gaze fixed (#760 18977615: he looks to the passer, picks the ball up at 0.25 s and tracks it the whole flight
through `lookJoints`; ball in his eyes 86/90 at mid-flight, 16-29 samples, speed through the flight 8.5 -> 7.5 yd/s
against the NFL's 7.1 -> 6.5), he still arrives 2.9-4.2 yd from the ball and catches accurate balls (0-1 yd miss) 4 of
14 times, against 10 of 15 when he ran his line blind. TrackBall steers his feet to a fitted 3-D landing point
(`chooseCatchPoint` on his estimate, re-read every 0.1 s, committed for the last 0.3 s). That point is 4.0 yd wrong at
mid-flight (n 93; the estimator's own information allows about 1.2, and his own samples refit without the prior give
2.7: a prior-weighting bug, named separately), and his goal lags even the estimate (4.2 yd at the end against 1.4).
Steering by a mid-flight landing estimate is also not how people catch.

## What the catching literature says
- Chapman (1968, *Am. J. Phys.* 36, "Catching a baseball"): a fielder in line with the ball's path who runs so that the
  tangent of the ball's elevation angle rises at a constant rate (zero optical acceleration) arrives where it lands;
  optical acceleration cancellation (OAC).
- McBeath, Shaffer & Kaiser (1995, *Science* 268, 569-573,
  [pdf](https://palab-cn.github.io/source/Materials/PSY_380_ECO_PSY/WEEK05/McBeathShafferKaiser_Science1995.pdf)): for
  balls off to the side, fielders run so the ball's image follows a straight line (linear optical trajectory, LOT),
  turning a timing problem into a spatial one; no landing point is computed.
- Fink, Foo & Warren (2009, *J. Vis.* 9(13):14, [PMC3816735](https://pmc.ncbi.nlm.nih.gov/articles/PMC3816735)):
  experienced players in VR, with physically impossible flights that separate the theories; the results confirm OAC
  and are at odds with LOT and with trajectory prediction (an internal model of the flight).
- Lateral interception on foot: holding the target's bearing constant relative to the direction of travel
  (constant bearing angle; Fajen & Warren, interception on foot, 2004/2007).
The common point: the body runs on a servo of what it sees (angles and their rates), which converges as the ball
arrives; nothing needs to be right at mid-flight.

## The proposal (feet only; the estimator keeps its other jobs)
Inputs are his own samples' **bearing and elevation from his head** (which he measures to under a degree), not range
(5-10%). From the last few samples (the same pursuit stream): elevation angle e(t) and its rate; the ball's bearing
relative to his heading b(t) and its rate.
- **Depth along his line** (OAC): his speed command along his running direction changes to hold the optical
  acceleration of tan(e) at zero: d/dt v_along = k_d * d^2(tan e)/dt^2, with the sign set by whether the ball is
  coming from behind (the receiver's usual case) or in front. Bounded by his real acceleration and braking, and by the
  speed `lookJoints` already prices for a turned trunk and hips.
- **Lateral** (constant bearing): his lateral velocity changes to null the bearing rate: d/dt v_lat = -k_b * db/dt.
- **Hands**: the existing catch timing (looming / time to contact, BALL_EST bit 8) stays.
- **The estimator** stays for the slow, conscious judgments: is this ball mine at all; roughly where (break off the
  route, or keep running it); do I go up for it or come back to it. It no longer places his feet.
- Gains k_d, k_b: if the papers' fitted gains map to yd and s they are used and cited; otherwise they are stated
  choices with a sensitivity read, never picked by outcome.

## Where football differs (and what that changes)
- He starts on a route line at speed, not standing in the outfield: the servo acts on top of his running speed and the
  route line is the default (no correction = keep running the line), which is why an accurate ball must come back first.
- The ball comes from behind or over the shoulder, not toward him: the OAC sign flips, and the look costs speed
  (`lookJoints`), so the servo trades what the eyes need against what the legs can do.
- Flights are shorter and lower (1-2.5 s): convergence time is short, and the early elevation rate carries most of it.
- He must keep a defender off the catch point: the lateral servo's target can be held on the shoulder away from the
  defender (a later step; out of scope here).

## Witnesses (stated before any run)
- Completion by miss band on the forced deep probe: the 0-1 yd row (4 of 14 now, 10 of 15 blind) must come back first;
  the 2-3.5 yd row should hold or rise.
- Receiver-to-ball distance at the arrival by band (now 2.9 / 3.6 / 4.2 / 3.8 yd).
- NFL against sim on deep targets: speed through the flight (7.1 -> 6.5) and heading change through the flight; the
  catch point against his release-velocity line (NFL +0.08 yd on verticals).
- Controls: short and intermediate targets unchanged; no change with BALL_EST off.
