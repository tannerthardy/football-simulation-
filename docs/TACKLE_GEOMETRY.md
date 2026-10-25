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
- One function, `handSpan(holder, mode, progress)` in
  `src/sim/tackle-geometry.ts`, gives center-to-hand span for every branch:
  - **standing** and **lunge**: `holder.reach`. A lunge is an upright step,
    not longer arms.
  - **dive**: grows from `holder.reach` toward the laid-out length
    `0.72 × heightYd` (hip to fingertips, about 1.46 yd for a 6'1" defender)
    as the fall runs, on the World's own fall clock (`support.since` and
    `fallTime`). Progress is 0 when he leaves his feet and 1 when he is flat;
    no one has layout span before his body has gone down.
- A diver aims at the runner's legs: the nearer of his body surface and his
  trailing foot. Without a modeled foot (the default legacy support model),
  the trailing foot sits behind the runner's center along his velocity, up to
  `0.25 × heightYd` at top speed and proportionally less when slower (model
  assumption). A runner pulling away at full speed exposes that foot; one
  coming head-on does not.

## Commitment, opportunity and time

Standing and blocked attempts test physical reach before technique randomness.
Outside that envelope, the existing launch-window and last-reach policies may
commit a motion, but create no grasp. Those window margins are tactical attempt
selection, never additional arm length.

- **Lunge.** The existing strike impulse (`sim.lungeAt`, bounded by traction
  over a 0.2 s push-off) drives the body at the hip. While the legs are still
  adding that velocity (`support.strike`), each post-World sample tests
  standing span. The first sample inside it makes the ordinary attempt. A
  step that ends outside it is one missed lunge, and the committed lean then
  costs him his base as before.
- **Dive.** The committed dive keeps its target while the World plant and fall
  run. Each post-World sample during the fall tests the leg target against
  `handSpan(d, 'dive', progress)` at that World time.

Only the first genuine opportunity consumes a technique trial. A miss, end of
the step or fall, changed carrier or lost possession retires the attempt;
later samples cannot reroll it. A receding runner need never enter reach.

Acquisition geometry is evaluated at `World.time`, after the step has moved
the bodies. Existing event timestamps label the beginning of that controller
interval; they are not substep impact times. No grasp force exists before
admission; the next World step resolves the admitted contact.

## Retained contact

Tackle-created grasps set both `reach` and `ground` to the span the hands had
at admission, plus how much nearer the admitted target was than the runner's
center (his radius, or a trailing foot's offset for a diver). The World joint
acts between centers, so this keeps it starting inside its own span. `hold`
starts at the actual admitted center distance and may shorten or slide through
the existing solver. The span cannot grow afterwards: a lunge that lays out
after grabbing keeps its standing span, and a hold that loads and slips past
the span breaks normally. A freed arm can use its full span after relinquishing
a block.

Wrap quality is `gripQuality(distance, torso, span)`: one at body contact, and
falling with the holder's own arm extension past the torso, with the admitted
span as the denominator (not that span less his radius a second time). It is
the same before and after acquisition. Grip/traction/launch capacities, body
radii, contact impulses, support laws and generic World grasp defaults are
unchanged. Synthetic World joints are not silently migrated by the gameplay
factory.

## Consumers and limits

Approach, arrival and threat forecasts call `approachDistance(holder, target,
share)`: both radii plus a named share of the holder's reach (`APPROACH`). The
values are unchanged; the share now says how far short of full reach each
policy stops, so these consumers no longer disagree by accident. None of them
is contact, which only tackle admission grants.

| Consumer | Distance | Meaning / remaining boundary |
| --- | --- | --- |
| `behaviors/common.ts` intercept | `APPROACH.intercept` (.75 reach) | Estimated arrival region; can exceed physical hand reach by holder radius minus .25 reach. |
| `behaviors/common.ts` gather, `run-fits.ts` chase contact | `APPROACH.gather` (.65 reach) | Approach/stopping policy; may stop outside the actual contact envelope for some profiles. |
| `behaviors/carrier.ts` threat forecasts, `run-read.ts` | `APPROACH.intercept` | Risk region, not an admitted tackle or guaranteed arrival. |
| `engagement.ts` acquired run trail | `APPROACH.gather` | Work-off eligibility policy, not an admitted contact. |
| `catchSpot` / catch-approach ball forecast | .8 own reach / own reach to a point ball | The ball has no target body radius; this repair adds none. |
| `movingCatchApproach` receiver proximity / arrival | both radii + own reach / both radii + .65 own reach | These receiver-body policy distances are distinct from point-ball reach and remain unmodified, not certified hand contact. |

Admission correctness is not a new dive chooser. The legacy desperation-dive
branch selects a runner separating faster than 1.6 yd/s from 0.8 to 1.1 yd
beyond standing reach, while its launch adds at most 1.5 yd/s. In the matched
seed 7/8 probe every such dive's closest leg gap during the fall stayed 0.8 to
1.25 yd beyond even the growing laid-out span. Laying out adds about 0.4 yd;
those launches start about 0.9 yd short and lose ground. Choosing a dive only
when the fingertip arc can meet the forecast trailing foot is the next
separate change; no distance bonus substitutes for it.

Possession acquisition, coverage policy and engaged work-off are separate
interfaces. This contract does not import pending INFO-1 or work-off changes.
