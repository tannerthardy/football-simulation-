# D01: loaded RT, end access and the real runner corridor

The accepted H-strong run is a **positional failure while RT's hands remain
loaded**, not the historical helper-reach failure. At the decisive interval,
the runner's personally acquired picture restricts RT's backfield movement.
This is an identified command-composition mechanism, but does **not** establish
that spacing is wrong or that a feasible alternative would stop the end. The
successful Y control has the same kind of runner-spacing intervention.

## Reused reference and cost

This is a read-only reduction of PR #26's
[observation packet](../../../data/reviews/current/ace-production-observations.json.gz),
SHA256 `ad462904b23c6864d902107f6a0aa3a876b4e35d3247db8dfaebb835276ae10b`.
Accepted source `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`, source SHA256
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`, collector
`ac6f663f958f4d59cb0f3e0e9d25c84e1c06dd79`. All 44 resolved flags and original
profiles/inputs are copied to `out/run-drills/d01-analysis.json`, including
components `1`, contact track/active hands/read experiments `0`. Production
center/centered hands and legacy/mean support remain selected. This is not a
relabeling of historical `4ded6b6` or patch-contact data.

The cases retain roster seeds 31/32, strength .55, play seed 3, under-center
singleback `ace_12`, Over/Cover 3, LOS 40 and exact ball Y
26.666666666666668. Strong Y and strong placement-flipped H run toward
decreasing Y; the weak call runs toward increasing Y. The placement flip is
not a geometric mirror. The source setup/profile/history hashes are preserved
per case in the JSON.

Run `python3 scripts/diag/zone/d01-drill-analysis.py` from the repository root.
First measured offline runtime **0.080205 s**, zero new plays, zero World steps.
The script changes no engine state. No controller or law candidate is applied.

## Assignment and information

H-strong installs H owning DE_S with RT the combination helper, and conditional
LB_S work. These are `panel[1].actors[*].initialBehavior.plan` assignments, not
a nearest-body guess. H climbs at native event label **1.75**, with completed
World boundary **1.80**; the event says `secured DE_S; RT stays`. RT becomes
the installed keeper. DE_S is a box end, D gap, side -1, attack/stack technique
with SS partner (`initialRunFit`). The end is assigned and accounted for.

The all-tick `series[].pictureCallCounts` establishes that RT's DE_S pictures
are consumed at 1.75, 2.00, 2.25 and 2.50. Only the first two actual pictures
are retained in the compact detailed packet: ages **.25** and **.30 s**.
Calling an opponent picture every .25 s is not proof that the picture is
fresh. At 2.30–2.65, RT's consumed RB and H pictures are **.05 s old**, with
their actual perceived positions/velocities preserved in `detailedFrames`.
Those pictures drive the spacing arithmetic below.

DE_S consumes RB pictures three times per tick and RT pictures twice per tick
from 1.75 onward, according to the saved counts. The compact packet omits their
contents. The sole new native prefix capture below supplies those missing
pictures and verifies the actual shed side. Facing here is body orientation,
not eye gaze.

## First causal command difference: real RB traffic

`series[].actors[].requested` is the behavior command. An engaged RT's behavior
command is `stand`; it is **not** the complete contact request. The raw contact
request is `detailedFrames[].contactPhases[]` with `phase="movement"`, keeper
RT/defender DE_S, `data.command`. `delivered[2]` is the final World input after
contact composition and teammate spacing. Achieved velocity is the post-World
body. These three stages must remain separate.

| Controller entry → World boundary | Raw RT contact request, yd/s | Final World request, yd/s | Achieved RT velocity, yd/s | RT/DE average N / T |
| --- | --- | --- | --- | --- |
| 2.30 → 2.35 | (-.184753, -1.044257) | (+.892425, -1.354882) | (+.874677, -.545516) | 751.832 / 459.147 |
| 2.35 → 2.40 | (-.896233, -1.468630) | (+.810634, -1.878018) | (+.872707, -.705143) | 753.989 / 460.972 |
| 2.40 → 2.45 | (-1.613912, -1.869872) | (+1.127149, -2.379522) | (+.839981, -.886725) | 752.885 / 460.038 |
| 2.45 → 2.50 | (-1.998215, -2.045936) | (+1.141773, -2.402167) | (+.800116, -1.069271) | 769.171 / 473.818 |
| 2.65 → 2.70 | (-2.279962, -1.538791) | (+.531349, -.693816) | (+1.390379, -.825081) | 766.449 / 471.515 |

The pure saved-picture fold reproduces the final RT request at those five
checkpoints to **0–2.70e-15 yd/s** using the existing `spacing.ts` radial closure
rule, existing `followAccel` and actual support/profile. RB is the only active
captured spacing peer through 2.45. At 2.65, RB restricts first, then H. The
recorded RT support is up and its capture-point deviation is inside the base,
so its spacing availability is 1; no reduced support guess is needed.

For the 2.35 decision, RT consumes RB at **(38.827895, 21.608418)** moving
**(+2.516105, -2.246837)**, age .05. The raw keeper request closes this picture
at **3.499732 yd/s**; permitted closure is **1.744456 yd/s**. The resulting
request sends RT upfield while retaining playside movement. This prevents a
requested sweep into the back. It is not an oracle about the runner's future
route. At this point the end is moving backfield while RT continues upfield.

The compact packet retains RG/RB/Y/H spacing pictures, not every teammate
picture. Omitted calls were not invented. The full native capture subsequently
certifies the same result against all ten other offensive peers over the
entire 2.20–2.70 interval: maximum fold error **2.70e-15 yd/s**. RB is the only
restricting peer through entry 2.60, then H also restricts at 2.65. The Y control
remains a saved-picture partial fold; no second control execution was added.
Source references: [`playsim.ts`](../../../src/sim/playsim.ts):562–594,
[`spacing.ts`](../../../src/sim/spacing.ts):121–179 and
[`kinematics.ts`](../../../src/physics/kinematics.ts):219–237.

## Contact and the first decisive protection interval

The end travels around RT's playside shoulder and into the back's route. It
does not pass through RT's torso in the saved record. RT/DE_S torso contact is
reported through the **2.50–2.55** interval, then none is reported during
2.55–2.70. Hands remain nominally acquired and transmit nonzero average load.
These are signed full-tick impulse/dt fields, not instantaneous latch force
or proof that the connection was continuously reachable.

To measure the developing geometry without pretending to solve interception,
the reduction projects RT onto the simultaneous DE→RB center segment and
subtracts the nominal collision radius
`.9*(RT.radius+DE.radius) = .6488181818 yd`. This is a **static circular
clearance measurement**, not an attained-route forecast or proof that hands
cannot obstruct the path. The shared packet does not serialize every squeeze
or attachment state. The new native capture verifies **zero actual squeeze
for RT, DE and RB throughout 2.20–2.70**, so the circular body radii are the
native H footprints here. This still does not make center-segment clearance
an attainable-intercept test.

| Saved World boundary | RT (x,y) | DE_S (x,y) | RB (x,y) | Nominal center-path clearance | DE/RB separation |
| --- | --- | --- | --- | ---: | ---: |
| 2.55 | (40.3555,21.1072) | (40.4506,20.4653) | (39.3758,21.0503) | -.130485 | 1.2236 |
| 2.60 | (40.4081,21.0517) | (40.3916,20.3944) | (39.5069,20.8858) | -.066198 | 1.0121 |
| 2.65 | (40.4746,21.0030) | (40.3185,20.3285) | (39.6384,20.7128) | +.015168 | .7812 |
| 2.70 | (40.5463,20.9591) | (40.2414,20.2613) | (39.7657,20.5464) | +.106436 | .5546 |

The first sampled transition to this unobstructed direct center segment is
**2.60–2.65**. The end is already backfield of RT by boundary 2.60 and stays on
the playside/runner side of its shoulders. During **2.65–2.70**, DE_S actually
contacts RB with a **313.196193 kg·yd/s** torso impulse, closing speed
**5.377643 yd/s**. Native carrier-contact event label 2.65 belongs to this
completed-World interval, not to the pre-World body snapshot.

RT remains upright, reaches posture .840984 at entry 2.65, and faces its actual
end within about .2023 rad before the contact interval. This is not an off-feet
loss or an unloaded missing assignment. The run ends naturally at 3.25, with
no LOS crossing, unrounded dead-ball depth approximately -.2064 yd and official
gain -.21. There is no criterion requiring a different gain.

## Opposing controls prevent a simplistic repair

The successful Y-side control keeps the same RT/end responsibility, but Y
climbs at **2.00** instead of 1.75. Its RT/end hand load begins 1.60–1.65,
compared with H's 1.40–1.45. Both contrasts retain their actual execution/RNG
histories; they are not equal-state randomized defender trials.

Y's final RT request also exactly matches the same RB-spacing fold at
2.30–2.50. Thus “RB spacing changed the request” is **not sufficient evidence
of a bad spacing rule**. Its nominal direct corridor opens earlier, at boundary
**2.40** (clearance +.035391). DE_S reaches a closest sampled separation about
**1.0309 yd** from RB at 2.60 and records a **missed tackle at event label 2.55**.
That successful run contains a real defensive opportunity; it cannot be graded
as perpetual geometric denial. The end then runs past/backfield of the runner,
who crosses LOS at 3.60 and takes first recorded contact from CB_S at 3.65–3.70.
Useful runoff, a failed grasp and the runner's attained route together produce
this outcome. An opened centerline alone cannot identify a wrong block.

The weak call is preserved on its original accepted receipt: RT belongs to
RG/DT_S with conditional LB_S work, H/LT handle DE_W, Y cuts off DE_S. Its first
contact is DE_W grasp at 2.30–2.35, before LOS crossing 2.60; the hold breaks
before the natural tackle ending 3.40. It is a successful opposing football
outcome, not a clean no-contact arrival or an RT/DE_S keeper mirror. The
withdrawn early-release control remains separate; this analysis supplies no
release-timing recommendation.

## The sole new native measurement: consumed cues and command ownership

The full native prefix was regenerated from the original installed input and
compared against the shared saved history: **all 54 complete state/RNG hashes
through boundary 2.70 match exactly**. Capture starts at 2.20 and stops at the
declared diagnostic boundary 2.70, after the first carrier contact. The original
natural ending is reused, not repeated. No controller action changes, reduced
fixture or physical counterfactual was executed.

Packet: `out/run-drills/native-prefix.json.gz`, SHA256
`0be4172745d5d93c9c0eab409be0718eea291c1033587cbf845bfa1f6fa9c8eb`;
collector revision `e21bbfee29b11950b72235079faf285decb85e06`, unchanged source
and the same 44 flags. Internal collector time **.817244 s**. Reduction with
the new packet takes **.121724 s**, still zero new physics steps in the reducer.
The root owner retains the wrapped command/typecheck receipt separately.

The first captured defensive carrier picture at **2.20** is .30 s old,
**(38.613120,21.955337)** with velocity **(+4.194930,-2.325818)**. Relative to
the end's current body, its projection along the installed contact lateral
axis is **+1.205351 yd**, supporting the already-held +1 shed side. This is the
first *captured supporting cue*, not a reconstruction of the earlier shed's
initial decision.

At the next visible shed renewal, **2.35**, the actual `runContactRead` carrier
picture remains .30 s old: **(39.044081,21.571366)**. Its distance from DE_S is
**1.726591 yd**, within the ordinary 3.5-yard threat gate. Its lateral projection
is **+.937305 yd**, again selecting +1. The engagement's next-move deadline
advances from **2.333146** to **2.783644**. The existing work-off formula
`lat*(+1)*td.lateral + axis*.6` gives exactly
**(-2.624660,-.771769) yd/s**. Intent-write provenance shows this request comes
from `stepRunRep`, and teammate spacing leaves it unchanged. No hidden future
runner path or incorrect shed-side command is demonstrated.

RT's newly recovered end pictures at **2.25** and **2.50** both have age .30.
At 2.25, the picture is **(40.644128,20.869869)** moving
**(+.671080,-1.035884)**; the actual end is **(40.568298,20.877864)** moving
**(+.113228,-1.089780)**. At 2.50, RT sees **(40.612170,20.624148)** moving
**(+.169413,-1.021169)**, while the actual end has already turned backfield:
**(40.496400,20.540933)**, velocity **(-.793334,-1.538803)**. These are real
delivered pictures, not same-state synthetic information.

Both technique reads choose **runoff**, with their existing .10-s read-aid
estimates reporting required lateral travel **.884047/.965581 yd** versus
available **.055679/.132096 yd**. As `zone-reach.ts:29–32` explicitly states,
this estimate ignores loaded contact and traffic; it is not proof that all
recovery routes are unavailable. Nevertheless, the stated picture supports
the existing choice to attempt useful runoff rather than forcing a hook.
The raw contact controller responds backfield by 2.30 and increasingly
thereafter using its acquired contact state. The record therefore does not
demonstrate “RT never requests recovery” or a wrong-side request. The final
request is constrained by the real back arriving in that same workspace.

## Attainability verdict and precise blocker

The saved execution proves that **the original final movement request loses
the positional screen while still loaded**. It does not prove RT had an
available safe alternative in the runner's arrival window. In particular,
free-body forecasts or cap-times-distance arithmetic cannot certify loaded
recovery: hands, torso geometry, bracing, runner traffic and finite turning
share the same physical interval. No .1/.3/.6-s alternative is declared
attainable here, and no earlier departure is prescribed.

The only authorized new continuation has closed the acquired-information and
command-composition gaps. Full 22-body states, World input/output joints before
tackle cleanup, all spacing pictures, raw writes and reports are now portable
in the native packet. Boundary **2.30** is the smallest useful future restoration
state for the loaded arc; it preserves all native context and acquired state.
No additional simulation or miniature was run after that capture.

**Verdict: the defensive work-off decision is consistent with acquired cues;
RT's attempted recovery is restricted by actual runner traffic. Whether a
safe alternative recovery was physically attainable remains unresolved.** This
could be a coherent defender win or a correctable block/runner-path interaction;
the current evidence does not justify changing either controller. The center contact
law has known accounting caveats and does not expose the patch-only hand
vectors/torques; a finite work residual is not an angular-law certificate.
Any solver repair stays with Physics. No strength, grip, traffic, release or
keeper policy change follows from this saved analysis alone.
