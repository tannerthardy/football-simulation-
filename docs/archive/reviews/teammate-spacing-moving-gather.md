# Teammate spacing: keep moving when a slower turn safely clears traffic

## Recommendation and boundary

Promote the bounded moving-gather controller repair if the combined football
guards remain acceptable. A player should not choose a full stop merely because
stopping has more clearance than a collision-free slower turn. Keep the same
physical movement law, finite braking, support, collisions and imperfect peer
pictures. This is a controller correction, not evidence that tackling physics is
finished or that explosive-play rates are calibrated.

The final combined source reviewed here is
`8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942`.
Its pre-spacing V4 source is
`a1cca44e8d2b82c661a211de347e00bea3dd4b274dd0138657445e7135a3d7df`.
World remains
`4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.
The integrated final includes other controller repairs; final yards below must
not be attributed solely to spacing.

## The first invalid instruction

The retained `Split-Over-L-S11` Free Safety has an upright, unconstrained body
at 2.65 s. His raw pursuit command and scalar headway command both request
(-7.249, 5.963) yd/s. His achieved velocity is (-5.246, 1.796) yd/s. The original
turn's swept path misses LB_S's consumed picture by -.024 yd over .60 s, so
some collision avoidance is justified. Both a three-quarter request and a
half-speed request remain upright and clear every consumed teammate picture:

| Held request | Minimum swept clearance to any consumed peer |
| --- | ---: |
| Original turn | -.024 yd |
| Three-quarter speed | +.467 yd |
| Half speed | +.924 yd |
| Full stop | +1.481 yd |

The old turn controller has only original-turn and full-stop candidates.
It chooses the stop, even though continuing a slower turn safely preserves
progress. The defect is unnecessarily extreme collision avoidance. It is not
a missing traction allowance or evidence that the teammate should become
nonphysical. Similar held zero requests recur through 3.05 s. At 3.00 s the
carrier is about 5.7 yd away: pursuit requested (-3.65, 8.65), but spacing
requests zero. The half-speed path remains upright and clears all peers.

The same mechanism occurs in ordinary `IZ-Over-R-S3`: three turn gathers
request zero despite upright, nonnegative-clearance half-speed forecasts.
Its native mirror and the Split Zone mirror have no such FS stops in the
inspected window. These four inputs do not estimate a population frequency.

## Implemented repair

After detecting a real curved-path conflict, `spacing.ts` evaluates one
half-speed request with the original facing, posture, skill and other intent
fields. It returns that request only when all twelve production movement
samples stay upright and its swept path has nonnegative clearance against
**all** already consumed teammate pictures. Otherwise the existing stop
candidate and its no-new-conflict/improvement guards remain unchanged.

The free preview remains unavailable during own contact constraints,
engagement, grip, held foot, strike, lean or external load, downed support,
push, squeeze, dive, lunge or free-motion override. Scalar headway braking
is unchanged. No teammate's next command, hidden intent or future cut is read;
the acquired velocity stays constant within this short forecast. Real bodies
still collide when the held request cannot stop them in time.

One half-speed option is intentionally a small candidate set. It is not an
optimal crowd-navigation solver or a football-specific speed multiplier.
The request is checked through the same World used for its actual execution.

## Controls and feature receipt

`test/spacing-yield.test.ts` adds eight focused controls. Two mirrored
moving-gather cases physically execute sixteen ticks with no body contacts,
upright support, bounded motor work and negligible work residual; they retain
facing/skill and resume the original full turn. Two unsafe-half cases still
stop. Two mirrored trailing-peer cases reject both alternatives, in either
peer order. Constrained and empty-lane controls preserve the original request.

The identical new test file against a copied genuine V4 source has **two
feature failures and six passing controls**: its safe moving-gather cases
stop rather than continue. The repaired source passes all eight. Combined
with the fifteen existing traffic tests, **all 23 pass**, and typecheck passes.
Machine reports and matching test/source hashes are in
`out/tackle-breakthrough/review/spacing-feature-receipt.json`.

Five existing command-only assertions had required exactly a full stop.
They now require a positive request below full speed. Their no-contact,
upright support, work/force budgets, delayed-picture invariance and eventual
reacceleration assertions are preserved. The pre-correction receipt keeps
the original failures visible in `spacing-pre-fixture-tests.json`.

The existing trailing-peer fixture's -.4 yd lateral offset lets the new
moving gather pass safely, so its unchanged-command assertion no longer
tests the intended unsafe alternative. Moving that rear picture .4 yd to
the center preserves the assertion while testing both alternatives: original
turn clearance +.213 yd, half -.026 yd, zero -.473 yd. No physics assertion
was weakened. The new test also checks that geometry in both mirrors/orders.
The stationary forward picture at lateral .9 yd makes both full and half
turns unsafe (-.261/-.114 yd), while zero remains clear (+.451 yd).

Other existing controls retain actual loaded grip forces, shoulder squeezes,
fast straight/parallel/passable lanes, far traffic and a genuinely unavoidable
collision with a player already too close to stop. Avoidance does not erase
that physical collision.

## Native witness and remaining limits

The archived `spacing-final-boundary.json.gz` compares the fixed four inputs
between V4 and the integrated final source. It observes only production's
existing reads and before-World boundary. All **eight** observed/plain runs
agree on raw result, final bodies, held commands and RNG; every eligible free
reconstruction matches the native held command. It uses neither extra looks
nor future teammate decisions. Source archives remain unchanged.

| Native input | V4 gain | Final gain | FS full stops, 2.00–4.05 s |
| --- | ---: | ---: | --- |
| Split Zone Over/left/seed 11 | 70 | 13.05 | 8 → 0 |
| Split Zone Over/right/seed 11 | 1.80 | 1.80 | 0 → 0 |
| Inside Zone Over/left/seed 3 | 6.43 | 6.47 | 0 → 0 |
| Inside Zone Over/right/seed 3 | 3.01 | 2.91 | 3 → 0 |

At the first Split Zone fork, body and raw command are identical: V4 requests
zero; final requests (-3.625, 2.982), with the same +.924 yd half-path clearance.
The final FS wraps at 3.60 s, falls on a dive at 3.65 s and loses the hold at
3.85 s. CB_S assists at 3.80 s and completes the tackle at 4.65 s. The new request
does not award a successful safety tackle or remove a legitimate broken hold.

These outcome-selected/ordinary witnesses demonstrate the mechanism and
preserved controls, not NFL rates or global improvement. The parent review
owns the broad fixed run/pass panels and eight-game guards. A passing short
forecast also cannot guarantee collision-free future play: teammates replan,
the runner changes direction, and perception remains delayed. Reciprocal
crowd yielding can still need attention if both candidates are genuinely
unsafe. Reopen controller coordination after reproducing that case rather
than adding more anatomical physics or granting extra force.

The local cost receipt is `out/tackle-breakthrough/review/spacing-cost.json`.
When the half request clears, original plus half uses the same 24 movement
steps as old original plus zero. When half fails and zero is considered,
the decision can use 36 steps instead of 24. Empty/clear lanes retain the
existing early exits. The receipt measures an isolated spacing decision
with ten cached peer pictures; it does not claim whole-game performance.

Five alternating 120-call measured batches after warmup on the shared host
give these median costs. Treat them as a local bound/check, not a deployment
benchmark or an estimate of how frequently a football play takes each branch.

| Staged branch | V4 per decision | Final per decision |
| --- | ---: | ---: |
| Safe moving gather | .174 ms | .186 ms |
| Half unsafe, zero considered | .177 ms | .278 ms |
| Traffic outside attainable tube | .0055 ms | .0052 ms |
