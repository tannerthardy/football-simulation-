# Conservative teammate-turn forecast broadphase

Read-only cost review, 2026-10-11. Reviewed the frozen `0cc15` controller in
`src/sim/spacing.ts` and the unchanged production free-body World. No engine or
test source was edited. This note proposes one cheaper rejection test, not a
different movement law or additional physical detail.

## Recommendation

Use a constant-current-velocity swept segment **expanded by the maximum
physically possible displacement from that segment**. A peer outside the
expanded segment is provably irrelevant to both held-command forecasts.
Checking whether the unexpanded current or desired ray is clear is insufficient:
both are clear in the reproduced FS/NB 90-degree collision.

For a fully conservative broadphase, examine all the already-consumed peer
pictures. Replace the current `vmax`/distance near filter with the acceleration
tube, rather than requiring its heuristic gate first. Alternatively, applying
the tube inside the existing near set is a safe cost optimization of the
current policy but does not prove the old distance gate itself conservative.
No extra perception acquisition is necessary.

For each observed peer:

```
r0 = ownPosition - observedPeerPosition
w  = ownVelocity - observedPeerVelocity
H  = 12 * 0.05 = 0.6 s
A  = supportParams(ownProfile).traction / ownProfile.massKg
t* = clamp(-dot(r0, w) / dot(w, w), 0, H)   // zero w: t* = 0
d  = length(r0 + w * t*)
R  = 0.5 * A * H * H
```

Skip that peer only when `d > touch + R + outwardRoundoffMargin`. Unknown or
non-finite arithmetic must retain the peer, not certify it safe. If no peers
remain, return the original intent without calling `previewFreeMovement`.
Otherwise run the existing one/two forecasts and unchanged candidate scoring
against the retained set. The bound applies to both original and gather, so
omitted peers cannot become a new gather conflict within this forecast model.

`touch = .9 * (ownRadius + peerRadius)` matches the current scoring circle.
If claiming geometric clearance against every allowed shoulder-turn footprint,
use `.9 * 1.12 * (ownRadius + peerRadius)` instead: `bodyRadius` can extend a
squeezed torso's long axis by 12%, and World already uses this maximum in its
contact broadphase. This is a static shape upper bound, not knowledge of the
peer's hidden posture. The observer is already excluded from active squeeze.
Neither version certifies clearance against an unknown future peer cut or a
contact impulse; the forecast still assumes observed constant peer velocity.

## Why the displacement bound is valid here

`previewFreeMovement` constructs/reuses a one-body World with no joints or
contacts. Its currently eligible observer has no dive, lunge, strike, squeeze,
support foot, meaningful lean/load, engagement or tactile constraint. No
external contact impulse is included. Yaw and support recovery change facing
or support state, not the COM position directly.

While upright, `World.feet` caps horizontal ground force by
`sp.traction * availability`, with availability no greater than one. The
possibly large requested locomotion acceleration is scaled to that force
budget. Strength, recovery, yaw and fatigue only reduce it. Therefore the
COM acceleration magnitude is at most `traction / mass`.

The preview can fall, so an upright-only argument is insufficient. In the
current World, falling adds at most `FALL_TIP = 3 yd/s²` and friction at most
`.25 * G`; down/rising friction is at most `.75 * G`. Those bounds are
`5.681171` and `8.043512 yd/s²`, both below the current upright traction bound
`TURF_MU * G = 1.1 * G = 11.797151 yd/s²`. State transitions do not teleport
or reset translational velocity. A future change to these constants must
revalidate this inequality; a tighter locomotion-only bound is unnecessary.

With constant per-step acceleration and midpoint integration, the position
error after N ordinary steps is

```
pN - p0 - v0 * N * dt = sum_j a_j * dt² * (N - j - 0.5)
```

Its magnitude is at most `.5 * A * (N * dt)²`. The passive-ground early-stop
correction integrates the finite friction stop rather than creating travel;
it has the same bounded-acceleration envelope. The swept score linearly
interpolates neighboring samples. Every interpolated position is a convex
combination of their errors, so the uniform radius `.5 * A * H²` also bounds
every scored segment. The extrapolated peer has zero forecast acceleration.

At H = .6, the uniform radius is **2.123487 yd**. This is deliberately broad:
it is an exclusion proof, not a calibrated intended turn envelope.

## Native corroboration and retained adverse witness

The ignored `turning-bound-probe.ts` was executed against the current unchanged
free movement law with Node 22.23.3. Its JSON receipt is next to this note.
This numerical probe corroborates the derivation; it is not its mathematical
proof or an NFL population estimate.

- 53 generated roster profiles; 954 forecasts / 11,448 samples.
- Initial speeds 2, 9 and 15 yd/s; three large turns; explicit facing;
  low posture, fatigue, substantial yaw; ordinary and deliberately disturbed
  capture-point/filter states. Source bodies remained unchanged.
- 633 forecasts entered a non-upright support state.
- All samples were inside `.5 * A * t²`; largest bound utilization was
  .886182. No sample exceeded the bound.
- 35,304 stationary/moving grid peer pictures certified safe by the uniform
  tube had zero subsequent swept-circle crossings in their native forecasts.
- The actual FS/NB adverse fixture has nominal touch .469636 yd and current
  ballistic separation 1.1 yd. Its expanded threshold is 2.593124 yd, so the
  broadphase retains it in both mirrors and both explicit-facing variants.

The current-velocity line has genuinely been expanded; this does **not**
reintroduce the clean-ray veto that caused the original failure.

## Cost, simplicity and optional follow-up

The supplied native-panel measurements were collected on a loaded host:
baseline 36.59/46.41 s wall/CPU versus candidate 51.32/63.27 s; passing-panel
execution 7.52 versus 9.0 s. They show a worthwhile cost concern but do not
establish an idle-host benchmark or an exact slowdown. This proposal avoids
up to twelve one-body World advances, report allocations and support updates
using one short segment calculation per peer. No extra World resolution,
cache of stale predictions or simplified duplicate movement integrator is
necessary.

If the uniform tube rejects too few peers, a later cheap refinement can test
each of the twelve ballistic time bins with radius `.5 * A * tEnd²`. Retain
a peer if any bin remains uncertain. That is also conservative for the
scored sample polygon; it costs more segment checks but still no World
steps. Start with the uniform capsule and count actual avoided forecasts.

Before publication, preserve the actual 90-degree collision/gather-release
tests, mirrors, explicit-facing metadata, multi-peer adverse checks and loaded
exclusions. Add a genuinely turning but tube-certified-clear control that
asserts no preview is called. If changing the old near filter, compare the
same native panel against the frozen controller and inspect any behavioral
differences: a broader conservative set can reveal conflicts the old heuristic
never inspected. Report forecast-call reduction separately from wall/CPU time.
