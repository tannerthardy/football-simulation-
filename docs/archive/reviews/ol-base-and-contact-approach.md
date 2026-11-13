# Keep the OL's intended run-block base connected to physics

## Status and where to start

The latest repair connects first-level OL approach commands to the existing
physical low stance. The blocker keeps the same `.7` posture used at the snap;
World still controls how quickly he lowers, his actual support, balance and
movement costs. This is a small controller-to-physics repair, not a new foot
solver or an approach redesign.

Watch the [12 matched clips](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/ol-base.zip), inspect requested and
achieved posture, and read the
[evidence and reproduction commands](../../../data/reviews/physics-world/ol-base/README.md).
The preceding [strike-force repair](strike-force-and-slice-validation.md)
remains the numerical foundation. Wrong-side fit, stale shoulder pursuit and
regrab decisions remain separate issues.

## The diagnosed mismatch

`RunBlocker.update` publishes `stance = 'low'`. That is a cue other players can
read through perception; it does not set physical posture. Unengaged approach
commands previously omitted `posture`, so World targeted its upright `.2`
default. At the existing finite transition rate, the OL's snap posture `.7`
was largely gone after about .20 seconds of active control. Engagements later
requested `.85`, making the player lower again after acquiring contact.

The before tests reproduce this through actual PlaySim ticks: a blocker
approaching a distant defender falls to about `.200` physical posture despite
his low cue. Seven new checks fail before the repair; the transport, reaction
and receiver controls already pass.

The fix adds an explicit `.7` posture to the first foot movement and active
attack command for OL executing `drive`, `reach`, `down`, `combo` or `cutoff`.
It leaves the requested velocity, facing, target and drive direction intact.
Running pullers, climbs, lead/stalk blocks, Draw selling and unassigned
downfield movement retain their existing control. Established engagements and
helpers keep their existing contact controllers. Pre-snap reaction gates still
hold the actual body state rather than waking movement early.

Scope follows the current plan kind, not a perfect classification of the
observed opponent. A stale `drive` plan retargeted to a linebacker can therefore
keep the low stance; retarget/technique selection remains controller debt.

No body state is reset by the controller. A player who has risen lowers over
time, and one who loses balance still falls under the shared physical model.
The `.7` target is an existing dimensionless model stance, not a measured NFL
knee angle or individualized foot-placement prescription.

## Why the physical connection matters

The same support laws already use posture for center-of-mass height, pad
height, support radius and contact tipping. At fresh `.7` versus `.2`, support
radius changes from `.85` to `1.10` times the profile's base radius. The same
movement model applies a roughly 4.8% maximum-effort cost to playing this low.
Both effects apply; there is no new strength, arm, traction or block-win bonus.

This does not replace footwork. It prevents good footwork decisions from being
executed in a contradictory physical stance. Requested motion remains the
same, but achieved motion and later decisions can change through that stance's
existing costs and contact response. The balance/height model is a reduction,
not an articulated skeletal or full vertical-energy simulation.

## Matched football inspection panel

Twenty-four ordinary 11v11 plays use Ace against 4-3 Over/Cover 3: Inside Zone,
Wide Zone, Outside Zone, Power, Counter and Trap, two generated roster pairs
and both formation flips. Source, inputs, profiles, measurement tool and initial
contexts are pinned. Left/right calls are input controls, not exact mirrored
physical states. Six predetermined clips per version have full recordings;
their unobserved/unrecorded controls match endpoint bodies, decisions and RNG.

The first-level OL load observations total 95 in each phase, but membership
differs: R2 Outside Zone's C loses his baseline load within the inspection
window, while R2 Trap's RT gains a strike. Mean physical
posture immediately before first delivered load changes from `.253` to `.707`;
mean support radius from `.156` to `.196` yd. Achieved speed changes only
slightly, about `1.519` to `1.511` yd/s. Availability remains 1 at these first
loads: the old upright posture had not necessarily already caused a fall.

Acquisitions total 98 in each phase. Mean absolute acquisition angle is almost
unchanged (`.498` to `.498`), as is relative closing speed (`2.419` to `2.409`
yd/s). These measurements support the physical stance repair; they do not
support a claim that block approaches, angles or success rates are fixed.

All endpoints are still live at the three-second inspection limit. They have
no forced whistle or invented credited gain. The last recorded sample retains
its ordinary 2.95-second label; completed physics and load intervals are
separately labelled. A first delivered force, an acquisition and continuous
sustained control are distinct. Pooled unengaged posture bins include regrabs,
not only the first approach.

Adverse outcomes remain visible. In the first-roster unflipped Power, RG now
falls during the 1.85–1.90-second interval. OL falls across this short panel
increase from one to two; total player falls from 25 to 28. Poor acquisitions
remain, including angles beyond the useful drive half-plane. The repair does
not guarantee that a lower stance wins or prevents later falls.

## Transfer guards and validation

The 144 paired production runs retain the same inputs and recorded RB profiles.
Mean credited gain changes from 2.13 to 1.37 yd, median from .80 to .89 yd,
stuffs from 33 to 35 and 10+ yd runs from five to two. Seventy-seven gains fall,
66 rise and one matches; 17 finish categories change. First block-contact times
are unchanged. The largest negative shift is a 70-yard Outside Zone touchdown
becoming a 26.23-yard tackle with a new holding flag; Counter also has a
25.73-to-1.90-yard shift. Every row and contact window is retained. These are
descriptive guards, not evidence that lower rushing production means better
physics. First-carrier-contact fields sometimes describe a defensive fumble
returner and must not all be treated as RB yards-before-contact.

All 64 controlled tackling encounter payloads match the parent exactly, apart
from collection time and source pins. Fourteen primary encounters remain live
at the inspection limit, not forced misses. Two measured games use the same
initial rosters and seeds, but subsequent calls and draws diverge. They have
no physical timeouts, lower-hold reach releases or motor-work excess; numerical
momentum/work residuals remain near roundoff. Neither game scores nor timings
are NFL calibration or isolated performance benchmarks.

The intentional before-oracle failure is retained (seven failures/eight passes).
Afterward all 15 base tests, all 621 TypeScript tests, all 22 Python tests,
typecheck and build pass. Offline browser and saved-film roundtrip checks pass
for the 12 clips, including exact full telemetry, profiles, event times and
live censored endpoints. Only existing position/facing packing is quantized.
The engine source hashes are `623b1c16…` before and `ac876d56…` after; World
bytes are identical. See the evidence manifest for complete hashes and commands.

## What to do next

Keep posture and approach changes separately measured. The retained WZ cutoff
still uses a shoulder landmark approximately .313 yd on the wrong side of
its intended drive half-plane, while the corresponding IZ landmark is on the
useful side. This explains why prior blanket direction reversal and generic
slowing traded errors between concepts.

Next compare a tiny achievable fit shortlist while preserving the intended
displacement direction: the existing downhill strike, a bounded arrival behind
the drive axis, and matching the observed defender's motion to brake. Use the
already-consumed delayed observation; it is already dead-reckoned and must not
be extrapolated a second time by its age. Actual movement remains limited by
the same World. Impossible fits should still fail, and a bad angle must not
receive an automatic leverage grace or extra strength.

Retain ordinary downhill blocks, real doubles in both acquisition orders,
crossing slants, Trap, Draw and impossible wraparound approaches. Measure
requested versus achieved movement, physical base, contact geometry, actual
load and recovery separately. NFL gain averages remain secondary guards until
these decisions consistently look like football.
