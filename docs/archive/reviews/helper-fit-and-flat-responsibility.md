# Helper footwork and curl-flat responsibility

## Recommendation and current scope

Keep the reduced shared World. The demonstrated failures in this increment
were wrong movement requests and conflicting responsibilities, not insufficient
strength or missing anatomical detail. A helper must replace unusable feet
without abandoning real hand load; a curl-flat defender must widen against an
observed flat instead of duplicating the corner on the outside receiver.

The engine changes only `src/sim/engagement.ts` and
`src/sim/behaviors/defense.ts`. World, support, traction, mass, arm/grip/work
limits, ratings and integration resolution stay unchanged. The
[evidence packet](../../../data/reviews/helper-fit-and-coverage/README.md) retains
native traces, controls, adverse outcomes, component isolation and checks.
The [offline film](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/helper-fit-and-coverage.zip) contains all ten
original diagnostic pairs, including unchanged and adverse clips. The two
additional Power witnesses are explicitly selected mechanical follow-ups,
with a mirrored control; they are not mixed into that original cohort.

## Hands and eyes are different information

The old helper always added the normal drive velocity to a target on the
owner's hip. That target could lie beyond the acquired defender surface.
`helperSupport` correctly allowed no useful push there, but the feet kept
requesting the ordinary driving action. The retained Draw/left has nine such
ticks with measured zero directional hand impulse; this is actual World
evidence, not an inference from rounded replay dots.

The first visual-only experiment is withheld. Delayed constant-velocity
extrapolation predicted a defender moving much farther backward than the
hands actually felt. It made already useful helpers retreat: one had actual
normal hand force about 998 native force units and a useful surface factor
.921, yet requested about−4.39 yd/s downfield. All four diagnostic gains
worsened. This is why better visual targeting cannot replace local contact
feedback during a sustained block.

The promoted controller preserves the previous command while a real helper
hand joint transmits normal or tangential load. For unloaded run helpers,
it acquires a personally observed owner/defender picture on the existing
decision beat and retains a joining side and foot landmark. A genuinely
reachable first hand point is immediate local acquisition information; merely
creating a relationship beyond its working extension supplies no such cue.
Subsequent remote targeting uses the delayed picture.

If that picture shows an unusable helper or hip surface, the helper requests
foot replacement rather than ordinary drive. The requested landmark keeps
owner/helper width, respects the acquired surface independently of drive,
and navigates around the observed torso. Ordinary placement error remains.
The existing movement/braking/support envelope bounds arrival; the landmark
is stationary for that decision beat rather than chasing an already
extrapolated velocity again. No body, hand extension, control or support
anchor is relocated. Loaded/initially useful helpers and pass helpers retain
their prior requests. The normal helper branch's immediate geometry remains
older controller debt; this is a bounded recovery repair, not a full vision
or footwork rewrite.

## Achieved football, including the failed recovery

Two mirrored controlled contacts now physically recover useful helper
support and actual arm impulse under the same budgets. Both fail against the
parent. These tests advance through World; they do not declare a completed
block, impose an impulse or freeze either player's body.

The native Power/Over/left/seed 3 follow-up gives the stronger football
example. At .70 s LG's request changes from (+.132,+.357) to (−1.646,+1.869)
yd/s while helping LT on DT_S. Actual helper hand impulse begins at 1.15 s
instead of 1.20. Before 1.50 s the measured signed impulse on the defender is
(75.744,84.072), against (58.247,68.922) kg·yd/s in the parent. At 1.95 s the
actual useful surface improves .813→.901, with real upright support and
bounded hand impulse. Gain changes .68→3.07 yd, YBC .047→1.027. The mirrored
right control stays 2.08 yd. Shorter final duration makes total loaded-tick
counts incomparable without a common inspection window.

The original Draw/left remains an important limit. Its helper now moves
toward replacing the bad feet earlier, but never obtains useful hand force
before the owner sheds at 1.45 s. Gain −.23→2.79 comes from later changed
traffic and contact, not a successful original helper block. It remains a
natural carrier-down finish with bounded grips. Do not present those extra
yards as proof that the helper won. The other core controls retain adverse
Inside Zone gains,3.11→1.38 and 2.38→2.10; Draw/right 6.78→6.77.

## Curl-flat conflict, not a new perfect defender

The retained Cover 3 curl-flat/right tail exposes a separate instruction
error. At 1.70 s the nickel defender selects outside #1 by generic
nearest-landmark lane scoring while #2 is visibly breaking wide underneath.
The corner already caps #1. The nickel's consumed flat picture has depth
2.69 yd and velocity(+2.92,+3.93) yd/s; he instead requests(+5.68,+5.78)
while chasing #1. By the throw, the flat threat is about 11 yd away.

The new branch applies only to match curl-flat work with pass belief, an
installed two-receiver side, the existing lane choice on #1, and a consumed
shallow #2 picture declaring outside the curl landmark. It widens beneath
#1 with outside leverage. Trips, an observed fast back creating another
outside threat, vertical carries, spot drops, run belief and other zone
jobs retain their existing paths. It consumes existing route observations,
adds no perception/RNG calls, and does not identify the eventual throw
target. Existing hesitation, delayed pictures and ordinary physical movement
can still fail. The first expansion has a recorded cue and alternative.

An isolated defense-only component turns the 70-yard touchdown into a
13.95-yard physical tackle, and the combined version retains that result.
Four of the six control executions are exact; the mirrored Cover 3 result
stays 0 yd but its execution/duration changes. Cover 2 curl-flat/right and
PA post-dig/right still score 70-yard touchdowns. They are distinct open
failures, not silently omitted controls.

## Broad validation and limits

The fixed ordinary 160-run panel moves 2.534→2.617 yd, YBC .631→.672,
28→28 stuffs and 4→5 gains of 10+. It has 22 higher,17 lower and 121 equal
gains;105 complete executions remain exact. One new Power stuff and one
resolved Outside Zone stuff offset. OL falls 6→7 remain visible; the extra
Wide Zone/Tite/right fall worsens 4.59→1.64 yd. These generated, balanced
diagnostic calls are not NFL call frequencies.

In the 96 fixed pass calls,92 gains stay equal and 4 decline. Attempts 78,
completions 55, sacks 1 and interceptions 7 remain unchanged. The retained
clean-completion YAC mean falls 9.385→8.310; most of the gain reduction comes
from the repaired 70→13.95 tail. This does not establish complete coverage,
QB or tackle calibration. Coverage reports remain identical on all 96 calls.

Eight games with the same seed 7/two initial generated leagues worsen:
points/team 46.50→51.13, designed-run YPC 5.94→7.83, YAC 10.55→10.91 and
missed/broken tackles .31→.34 per play. Stuffs remain 23.45%; interception
rate 7.54→6.96%. Later calls, RNG consumption and snap populations diverge,
so these are full-game guardrails rather than paired controller experiments.
This increment is demonstrated local mechanics/responsibility progress, not
an overall NFL calibration win. Those explosive tails are the next priority.

The coarse two-game/seed 9 CPU guard is 104.67 ms/play versus the pinned parent's
96.73, with 382 logged plays in both. It includes changed play duration/contact
and runtime noise, not an isolated cost of the new controller. There is no
resolution increase or demonstrated speed gain.

Native observed/plain controls verify execution and copied next RNG;
paired initial bodies, minds and capabilities match. Force/work limits and
accounting remain checked. Meaningful new tests cover achieved recovery,
loaded contact, actual touch range, delayed targeting/cadence, pass and
useful-helper compatibility, reacquisition, flat conflict and excluded jobs.
The packet distinguishes interrupted/failed exploratory checks from final
passes. Small games and quiet cost checks are guardrails, not tuning targets.
All 1,099 TypeScript tests across 95 files and 66 Python tests pass; typecheck
and build are clean. The final full suite uses one thread worker. The earlier
fork-worker run passed every assertion but failed its separate 60-second
Vitest progress-RPC deadline; its nonzero exit remains in the packet.
No test timeout, assertion or error handling was disabled. All 38 browser
checks pass and an actual WebM export decodes successfully.

Use the [current NFL reference](run-reference-current.md) to agree populations
and measurement operators before comparing early contact. Recent DL get-off
is 1.58 yd/s at .5 s versus the reference 1.68; the historical 2.06 concern
does not justify slowing today's DL. BDB contact coordinates alone change
the reference mean substantially. Do not increase strength or tune grip
limits to recover league scoring, YPC or a particular play's gain.

## Next work

Trace the retained Cover 2 curl-flat and PA post-dig tails through their first
invalid consumed request, roof responsibility, pursuit and actual contact.
Keep an ordinary mirror and a genuine horizontal/deep conflict. For the OL,
trace another overloaded or unattainable helper/keeper surface and the new
adverse Power/Wide Zone cases before broadening recovery. A zero helper load
can be correct during acquisition, beyond reach or after the block is lost.

There is no universal physics OK yet. This increment demonstrates a useful
principle for the simpler model: installed work, delayed visual beliefs,
immediate hand feedback, requested movement and achieved load must agree.
Fix a proved controller contract before adding force or solver complexity.
