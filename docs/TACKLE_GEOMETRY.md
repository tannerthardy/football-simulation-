# Tackle acquisition geometry

This is the reduced-body contract for `src/sim/tackle.ts`, not an anatomical
layout model or a promise that a selected movement will reach its target.

## Landmarks and span

- `Body.pos` is the actor's horizontal body center. `PhysicalProfile.reach`
  is horizontal center-to-hand reach, already including the actor's radius.
- The target is the surface of its horizontal body disc. Center distance at
  acquisition must be at most `holder.reach + target.radius`. A blocked arm
  uses the existing available-arm fraction on `holder.reach` only.
- Upper, thigh and lower holds currently differ in applied height and support
  coupling, not in a separately represented horizontal ankle/jersey landmark.
  Facing is not a modeled articulated arm direction. These are limitations of
  this circular horizontal model, not claims about an athlete's full reach.
- Falling does not add an unrepresented torso segment to that span. A dive's
  existing World launch and off-feet integration translate the body center.
  They must actually close the distance before the hands acquire anything.

`tackleReach` expresses this convention. Arm strikes and handoffs already use
the same center-to-hand plus target-radius convention.

## Commitment, opportunity and time

Standing and blocked attempts test physical reach before technique randomness.
Outside that envelope, the existing launch-window and last-reach policies may
commit a dive, but create no grasp. Those window margins are tactical attempt
selection, never additional arm length.

The committed attempt retains its target while the existing World dive plant
and fall run. It checks physical reach and obstruction at post-World decision
samples. Only the first genuine opportunity consumes a technique trial. A
miss, end of that fall, changed carrier or lost possession retires the attempt;
later samples cannot reroll it. A receding runner need never enter reach.

Acquisition geometry is evaluated at `World.time`, after the step has moved
the bodies. Existing event timestamps label the beginning of that controller
interval; they are not substep impact times. No grasp force exists before
admission; the next World step resolves the admitted contact.

## Retained contact

Tackle-created grasps set both `reach` and `ground` to the same full physical
span. `hold` starts at the actual admitted center distance and may shorten or
slide through the existing solver. Neither acquisition distance nor falling
can grow the span. A freed arm can use its full span after relinquishing a
block. A hold that loads and slips past the span breaks normally.

Wrap quality uses the same horizontal geometry before and after acquisition.
This removes the previous ground-stretch credit from quality as well as the
extra retained-length allowance. Grip/traction/launch capacities, body radii,
contact impulses, support laws and generic World grasp defaults are unchanged.
Synthetic World joints are not silently migrated by the gameplay factory.

## Consumers and limits

The following policies still use radii-derived distances; this repair does not
retune their football decisions or certify those distances as hand contact:

| Consumer | Existing convention | Meaning / remaining boundary |
| --- | --- | --- |
| `behaviors/common.ts` intercept | both radii + .75 holder reach | Estimated arrival region; can exceed physical hand reach by holder radius minus .25 reach. |
| `behaviors/common.ts` gather | both radii + .65 holder reach | Approach/stopping policy; may stop outside the actual contact envelope for some profiles. |
| `behaviors/carrier.ts` threat forecasts | both radii + .75 defender reach | Risk region, not an admitted tackle or guaranteed arrival. |
| `engagement.ts` acquired run trail | both radii + .65 defender reach | Work-off eligibility policy, not an admitted contact. |
| Catch approach / `catchSpot` | receiver center to a point ball, own reach | The ball has no target body radius; this repair adds none. |

Admission correctness is not a new dive chooser. In particular the legacy
desperation-dive branch selects a runner separating faster than 1.6 yd/s,
whereas its existing launch adds at most 1.5 yd/s before subsequent fall motion.
The launch alone cannot overcome that initial recession; the existing fall-tip
force, drag and target motion still need evaluation. The straight receding
control fails to arrive. A future cut/contact can change that, and a nearer
committed lunge can physically arrive. Useful native
dive selection and an explicitly represented layout/ankle geometry remain
separate questions; no distance bonus substitutes for either.

Possession acquisition, coverage policy and engaged work-off are separate
interfaces. This contract does not import pending INFO-1 or work-off changes.
