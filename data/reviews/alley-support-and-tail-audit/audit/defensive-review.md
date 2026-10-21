# Retained defensive tail continuation: diagnose arrival before rewriting coverage

## Recommendation

Keep the installed Cover 2 and Cover 3 responsibilities for this increment.
Neither retained touchdown proves a pre-catch assignment abandonment. The
stronger next candidate is the shared **late-to-the-ball arrival controller**:
it has a personally observed receiver picture, but drives toward a static
plausible catch point without using the receiver's movement or the defender's
available support/braking in the requested arrival. This can leave a defender
running across the receiver's future exit path when possession changes.

That is a hypothesis worth a bounded native intervention, not proof that the
current physics cannot brake or that every downfield break is wrong. Do not
change safety run belief, roof depth, traction, pursuit ratings or grip limits
to reduce these two plays' yards. Preserve reachable-ball contests and the
ordinary coverage choices; demonstrate a changed request and actual contact.

## Source and operators

- Parent commit: `7a25bc9`.
- Saved engine source: `601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b`.
- Raw native packet: `data/reviews/helper-fit-and-coverage/coverage/final.json.gz`.
- Exact collector tool SHA: `ed6132bd1393bf35fe18bd851f1df8be1817729d3cba576851a87a88bfad1164`.
- Selected Cover 2 requests/cues: `out/coverage-continuation/cover2-pre-catch-audit.json`.
- PA independent review: `out/coverage-continuation/post-dig-read-only.md`.

This review uses already-saved frames, steps and personally requested pictures;
it performs no engine simulation or observer calls. Original six-tail packets
already retain observed/plain execution and next-RNG parity. Setup defaults
remain roster seeds 41/42, strength .55, play seed 3, LOS 40, ball at field
center, first down 50, down 1, nickel Over, match style and audibles false.
These retrospective cases are not NFL play frequencies or a fresh population.

The native `world.step` requests are **after** engagement, tackle-bond and
teammate-spacing refinements. They are achieved input to World, not necessarily
the original behavior command. Repeated `see` calls at one tick are retained
observations; the trace does not expose each call's stack. A zero request alone
therefore cannot be attributed to pursuit, loss of vision or a freeze.

## Cover 2 curl-flat right: plausible opening, then no contact

The completion is to strong-side **Z/#1**, not H/#2. The actual stock Cover 2
installation has CB_S in `flat_s` and SS in `deep_half_s`; numbering S1=Z,
S2=Y, W1=X, W2=H. The strong side is negative field-y on this input.

CB_S initially keys Z and exchanges to the personally acquired shallow Y as Y
widens toward the strong flat (around 1.95 s). At 2.30 the consumed Y picture
is position (41.106,16.960), velocity (+1.753,-4.518), depth 1.106 yd, age .20.
The corner's movement toward Y is consistent with an installed first-to-flat
job; it does not demonstrate abandoning a permanent man assignment. SS caps Z
in the deep half and is already reading pass by .50 s. The other visible
strong-side receiver stays shallow, so no second vertical forces a roof split.

At the 2.55 throw SS is (56.964,11.120), velocity (+2.559,-4.655). His consumed
Z picture is (50.537,8.667), velocity (+6.119,0), age .20; the actual receiver
is already slowing at (50.429,8.667), velocity (+5.033,0). Delayed recognition
of a curl is expected. A safety protecting a still-climbing outside stem is
not obliged to know the called break or eventual throw target.

At **2.75** the saved request first exhibits the common late-air branch: SS at
(57.358,10.237), velocity (+1.403,-4.127), requests (-6.883,-.009) without the
earlier explicit QB-facing command. The available Z picture at that tick is
(51.435,8.667), velocity (+5.033,0), age .20. The source's late branch computes
a direction and allowed speed to a static `observedCatchWindow.p` (or arrival
fallback); it does not consume that receiver velocity to organize arrival.
The first such request is a **candidate controller deficiency**, not yet a
counterfactual proof of a preventable touchdown.

Before the catch step at **3.50**, SS is (56.947,8.126), velocity
(-2.282,-1.257), still requesting (-6.073,+3.444). Z is (53.260,10.204),
velocity (+1.338,+1.968); SS's consumed picture is (53.301,10.264), velocity
(+1.888,+2.768), age .20. The defender's momentum and requested target are
different from the receiver's exit direction. World has not exceeded a force
budget or teleported either player: the issue is what the controller asked
the body to prepare for while knowing it was late to the catch.

The receiver catches at 3.50 (recorded gain/segment start uses the completed
physics step), separation 4.2 yd. He then gains 56.678 YAC for a 70-yard TD.
There is **no carrier contact, tackle wrap, missed-tackle or broken-tackle
event**. This is not evidence of a weak grip or a tackle that physics failed
to finish; nobody acquired one. The later SS requests at 4.20 and 4.25 are
zero, but their attribution needs the separate command-refinement audit.

The ordinary mirror throws to Y at 2.60, catches at 3.70 and ends 9.97 yd OOB.
It acquires SS contact and wrap at 5.25. Different receiver traffic and target
choice matter; the mirror is an adverse ordinary control, not a guarantee
that all intermediate pictures are exact reflections or should have equal
yards.

Existing coaching support distinguishes an allowed completion from a bust:
`docs/research/coverage-terminology.md` §1.2 describes the Cover 2 hole shot
between a flat/sinking corner and half safety, with #1/#2 release-dependent
help. Stock Cover 2 and Cover 2 Match/Palms/Cut are distinct installations.
Do not silently replace this call with perfect man coverage or infer actual
teammate assignment ownership from a post-catch screenshot.

## PA post-dig right: the cap and band obey their current contracts

The independent saved-state review finds the FS in `deep_mid` with an alley
run-fit home depth of 13 yd. Both right and left versions believe run at .40 s;
right returns to pass at 2.20 and left at 2.15. FS retains the installed 8-yard
run cap through the fake rather than chasing the mesh: minimum achieved depth
is right 8.564 yd and left 8.578 yd, both at 2.65. A mistaken run belief alone
is not an invalid request; fake deception is explicitly part of this model.

The first pass request on the right at 2.20 is (+7.600,-2.214), returning to
the deep-middle landmark. The middle band is field-y 14.778–38.556. At 3.15
the personally observed post Z is (56.128,9.522), velocity (+7.275,+1.961);
the existing .7-second lateral forecast is 10.895, outside that band. Dig X
is (53.035,44.224), velocity (+3.530,-1.480), forecast 43.188, also outside.
The inside TEs block. Neither outside #1 has been acquired as a middle-band
vertical by the release recognition tick. The generic no-vertical/QB-eyes
branch is therefore consistent with the installed lane test; no failed
inside roof exchange is demonstrated.

Catch separation is 1.8 yd on the right and 1.4 on the ordinary left mirror.
The right runs 70 yd and the left is physically tackled at 41.96. These are
large post-catch results despite defenders reaching a close catch window.
Investigate their actual pursuit/attempt transitions before making the FS
omniscient about a future post or adding extra deep defenders to the call.
The separate pursuit reviewer owns contact causality and should supply the
first deficient request/refinement before a final repair claim.

The right completion is to **X/dig**, not Z/post. CB_W's first ball-play
request is at 3.40: (-.852,-9.145). At the last air step at 4.45 it is 1.817 yd
from X, moving (-.394,-5.117) versus receiver (+2.641,-6.032), and requests
(+3.635,-4.878). Its first chase request at 4.50 is (+1.557,-9.506). A
separating dive misses at 5.00 and the corner falls at 5.05. The ordinary left
mirror instead completes to Z/dig and acquires an immediate wrap at 4.60;
its last-air request is (+5.155,-3.640), then chase at 4.65 (+5.604,-6.466).
That real wrap slips at 4.85 and a later tackle finishes at 7.80. The mirror
changes which generated receiver runs the dig, so it must remain a control
with different profiles/traffic rather than be presented as exact mirrored
physical initial conditions.

## Smallest intervention and exclusions

If the native late-air branch is the chosen repair, keep its existing
personally observed candidate/window selection and preserve uncertainty.
Retain the candidate's already-consumed velocity in the window estimate and
use the existing movement/support/braking envelope to organize arrival when
the ball itself cannot be contested in time. Do not add `see`, RNG, route IDs,
the intended receiver, future possession or stronger movement capabilities.

`window.p` is already a **future ball/catch landmark**, not a current receiver
position. Avoid extrapolating it forward again simply by adding receiver
velocity. A moving-arrival request needs a clear current-versus-future target
contract and should not plan an automatic tackle before a catch is known.
If the observed window is uncertain or unavailable, keep the old fallback.

Preserve these paths exactly where applicable:

- Reachable ball with the existing `goTo` contest and catch-time condition.
- Unseen throw: ordinary installed coverage and delayed release read.
- No plausible receiver window: current arrival-point fallback.
- Existing PA run belief and cap/force responsibilities.
- Real horizontal/vertical conflict; no perfect target switch because a QB
  will later throw to one of them.
- Actual traction, support, mass, force, grip and resolution budgets.

## Validation before promotion

Use all six original native inputs with the same setup and explicit plain
signature/copied next-RNG receipts. Retain the repaired Cover 3 curl-flat
13.95-yard tackle, both remaining TDs, both ordinary mirrors and the Cover 3
mirror interception/return (including its adverse 13.79-yard return and broken
grip). Record changed target choice, timing, catch point, pursuit and finish;
do not present lower YAC alone as a successful physical interaction.

Small controlled branches should include a stationary catch, a moving
horizontal catch and its reflection, an away-running vertical, a genuine
two-vertical conflict, a receiver drop/no completed possession, no plausible
window and a reachable ball. Hold profiles/support/input observations fixed.
Demonstrate that the first changed behavior request occurs only after the
personally visible late-window cue, that movement stays bounded, and that any
improved finish comes from actual contact and solved load rather than a
whistle, timeout or fabricated receiver identity.

Broaden only after the local cause is reproduced: fixed 96 passing calls for
ordinary/excluded coverage regressions, then a small full-game guard with
changed population/RNG stated explicitly. NFL YAC or points are guardrails;
these generated calls do not justify tuning forces to a league mean.

## Limits

No new production code or tests were written for this review. No invalid
installed pre-catch roof/flat request is proven by these four inputs. The
shared late-air arrival hypothesis still needs native intervention evidence;
the separate pursuit trace may locate an even earlier actionable defect.
Inherited authoritative QB-eyes identity/current QB position and exact ball
flight prediction remain existing information-model debt, not new visual
capabilities or excuses to widen every defender's knowledge.
