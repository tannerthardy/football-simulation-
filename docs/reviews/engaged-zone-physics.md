# Engaged zone: hand force, actual turning and lost width

**The strongest width witness is a controller request reversal, not false hand
drag.** Claude's anchor reverses a correct playside request while the pair is
flowing sideways. The release rule also credits turning the loaded body has
not achieved. Fix those separately, with unchanged capacities.

This review answers the five physics questions from `claude/live-gaps`.
Controller reference: `ebff3938494b0e343df4aa00c9b8c492b60e881f`.
Nothing from that branch was merged. Eight designed plays combine those
controllers with explicitly pinned physics; they are not a random film sample
or measurements of the integrated branch. The compact
[receipt](../../data/reviews/current/engaged-zone-physics.json) keeps source,
input and operator pins. Large traces stay in ignored `out/engaged-zone/`.

## 1. Hand steering does not oppose shared travel

Steering limits the impulse resisting **relative motion at the hand point**:

```text
pointSlip = (velocityB - velocityA) dot tangent
            - armA * spinA - armB * spinB
impulseNext = clamp(impulsePrevious - effectiveMass * pointSlip, -cap, cap)
```

The historical center joint omits the spin terms; it retains the known angular
momentum defect. The experimental common-point patch uses the matching arms,
inertias and moments. Neither law brakes equal translation just because a
large steering capacity is available. Eleven new contracts prove zero force
for shared translation and equal achieved acceleration, preserve true-slip
response under a common free-motion velocity boost, and independently check
the force/moments from material-point yaw. Grounded motion is not required to
be boost-invariant: the turf defines rest.

A hand can remain loaded while keeping final point slip near zero. That load
canceled the preceding relative motion. Equal final lateral COM speeds are
not proof of zero hand-point slip; yaw and unequal ground effort both matter.
Absolute tangent force also does not tell which body is being braked in the
field's lateral direction: normal force can contribute to that direction too.

In the eight native probes, from 0.9–1.6 s:

| Measurement | Center | Patch before gait repair | Patch after gait repair |
| --- | ---: | ---: | ---: |
| Mean absolute tangent force, kg·yd/s² | 349 | 192 | 185 |
| Mean absolute normal force, kg·yd/s² | 553 | 510 | 509 |
| Blocker playside speed, yd/s | 1.019 | 0.989 | 1.001 |
| Mean absolute pre-solve point slip, yd/s | 0.697 | 0.229 | 0.247 |

Less tangent load did **not** restore the lateral track. Do not weaken steering
to obtain an NFL width. The original probe's 60–80% traction is net tick
translation divided by nominal traction. Cancellation, support availability,
directional strength and simultaneous yaw prevent treating the remainder as
guaranteed spare force. Our per-interval combined ratios still use mean torque;
they are not peak-budget certificates.

## 2. The native anchor reverses a useful track

Predeclared witness: roster seeds 31/32, Ace 11, Wide Zone Strong, Over Cover 3,
no flip, play seed 3. Play side is negative Y. At tick start 1.15 s, completed
1.20 s, RG owns DT_S without a helper:

| State or request | X | Y |
| --- | ---: | ---: |
| RG velocity, yd/s | +0.042 | −1.171 |
| DT velocity, yd/s | −0.061 | −1.021 |
| RG seal/stretch request before anchor, yd/s | −0.265 | −1.664 |
| RG request after anchor and at World, yd/s | +2.162 | +0.542 |
| Filtered felt load, kg·yd/s² | −1258 | −606 |

The blocker moves forward in X, but velocity along aggregate felt load still
triggers anchoring. The anchor discards the useful lateral request and sends
him the other way. Spacing does not change this request afterward. Thirteen
of 26 inspected ticks repeat that exact reversal; this is recurrence within
one witness, not a frequency estimate across football. The first reversal is
tick start 0.95 s, completed 1.00 s. A read-only observer preserves the original
full endpoint, including minds, requests, events and RNG.

**Recommendation to Claude:** distinguish loss of useful depth/support from
co-flow under lateral load. Preserve appropriate tangential surface work while
anchoring against a normal threat. Keep a genuinely driven-back blocker,
unsupported keeper, widening defender, lost shoulder and both mirrors as
controls. Do not disable anchoring everywhere. Next inspect `felt()`: it
turns a scalar tangent force into inferred opponent velocity on the current
COM frame; a patch's actual force and moment distinguish resistance to own
yaw from observed lateral movement.

## 3. Release must use achieved geometry

For the same 150 kg profile, `turnRate * 0.05` grants 0.30 rad. A bounded motor
starting from rest achieves about 0.079 rad without translation and 0.034 rad
while translation spends 90% of traction. At full translation load it cannot
create that turn. In a matched patch hand rep, actual yaw is about 0.034 rad
versus 0.068 without hand load. These are controlled capacity examples, not
NFL yaw calibration. Native patch pair ticks all turn less than raw rate credit.

**Recommendation to Claude:** physical release reads current World-achieved
torso, reachable hands and acquired shoulder geometry. Keep desired facing as
an intention, not evidence of completed recovery. If a controller predicts a
future recovery, use its own achieved spin/support, last effort and sensed
load with uncertainty. Do not grant `profile.turnRate * dt` as achieved yaw,
or simulate an unloaded body to forecast a loaded block. No new gaze or
perception API is needed for an existing body pose.

## 4. Small World repair: stop borrowing a future gait pose

The same optimistic turn was used inside `World.plan` to raise the directional
desired-speed cap before turning occurred. At a 3.6 yd/s sideways shuffle cap,
a request for 5 yd/s produced 0.888 yd/s² of propulsion from a hypothetical
0.30 rad turn. The first actual turn was only 0.00040 rad at 12 subdivisions.
More physics steps did not remove the error: the force plan was held for the
whole 50 ms beat. General traction, force and work laws still passed; the
error was the pose used to plan the gait request.

Patch mode now plans locomotion from **actual tick-entry facing**. The facing
goal still goes to the bounded yaw motor. Center retains historical behavior.
This is one conditional, with no new strength, speed, damping, solver or feet.
It keeps the calibrated 20 Hz force plan; recomputing it at every physics step
would change braking/relaxation and make subdivision change the body controller.
The body can use newly attained turning at its next ordinary control beat.
Contact-induced momentum is not clipped to a directional speed cap.

That first candidate exposed a numerical mirror failure in the six-second
redirect: one post-shed request differed by 1.06e−9 yd/s against the existing
5e−10 tolerance. The first fork was a 2.84e−14 reflected lean difference,
before a changed movement plan or contact transition. Adding then subtracting
pi during angle wrapping lost different low bits in mirrored loads. Patch
World now reduces the signed difference directly and adjusts by a full turn
only when needed. It removes that first fork and passes the unchanged mirror
test; no state rounding, tolerance change or global math replacement. Center
keeps its old arithmetic. At an exact half turn, patch retains the input sign.

Twelve contracts pass, versus seven failures on the frozen source. Fixed-facing
motion, below-cap propulsion, mirrors, loaded/unloaded subdivisions and observer
parity are preserved. In the original eight patch plays, only 13/1200 primary
pair actor commands activated this discrepancy: OL 1/600, DL 12/600. It is
real but rare here, and is not the principal width explanation. All eight
default center traces remain exactly unchanged after this repair.

The final independent hand oracle passes 144 cases; the material-contact graph
passes 36. Source pins distinguish the first gait candidate and the final
angle-stability repair, including the rejected first mirror result.
All 1,472 TypeScript tests in 119 files pass (159 s including integration and
preserved research). Typecheck and build pass; all 141 Python checks pass.

## 5. Capacity questions remain separate

| Question | Next useful experiment |
| --- | --- |
| Strength saturates; mass determines saturated pushing | Separate muscle-limited drive from traction-limited anchoring, with speed, posture and actual support recorded. Saturation itself is physically possible. Do not invent an eccentric bonus below an already binding traction cap. |
| Pad-line vertical leverage | Keep parked until interval load ownership, translation/yaw sharing and multi-contact allocation close; the earlier proposal failed those controls. |
| Fatigue almost free | Retain the repeated-effort panel. Establish what a temporary high-effort store represents and its evidence before choosing depletion/recovery constants. |
| Rear grip carries little force | A co-moving hold can correctly carry little load. Compare the tackler's requested/achieved plant and support before changing grip strength; capacity is not actual transmitted force. |

The angular patch is **not ready for promotion**. The unchanged gate remains
42/50: six helper/transfer football controls fail and two historical center
hashes differ. No assertions were weakened or hashes re-frozen. Native angled
tackles still need the previously nominated moment/support diagnosis. The next
physics work remains achieved contact geometry and support under a loaded wrap,
while Claude fixes anchoring and release on its own branch.

## Repeat the checks

Use Node 22. Native collection accepts a pinned source tree and verifies a
plain first-play replay in each mode:

```sh
npx vitest run --project core test/hand-comoving.test.ts test/gait-facing-contract.test.ts
node --import tsx docs/archive/research/contact-mechanics/material-hand-law.ts out/engaged-zone/material-law.json
npx vitest run --config scripts/diag/common-patch-vitest.config.ts --maxWorkers=1
mkdir -p out/engaged-zone/snapshot
git archive ebff3938494b0e343df4aa00c9b8c492b60e881f src | tar -x -C out/engaged-zone/snapshot
cp -a src/physics/. out/engaged-zone/snapshot/src/physics/
node --import tsx docs/archive/research/contact-mechanics/engaged-zone.ts out/engaged-zone/snapshot out/engaged-zone/center.json center
node --import tsx docs/archive/research/contact-mechanics/engaged-zone.ts out/engaged-zone/snapshot out/engaged-zone/patch.json patch
```

The explicit promotion command is expected to retain its eight failures.
The snapshot is an ignored archive of the immutable controller commit with the
declared physics files copied in, not a merge. Fetch that commit if absent.
Use a fresh snapshot/output folder for later repetitions. See receipt pins; replacing
physics makes a new evidence stage. Ordinary NFL width, orientation, joint
capacities and season outcomes are not certified by these eight cases.
