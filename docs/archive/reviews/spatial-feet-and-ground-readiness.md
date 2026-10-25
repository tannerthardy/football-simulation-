# Spatial feet and ground: review and next step

**Status: the physics is not ready for the owner's OK.** This increment builds
standalone three-dimensional torso/foot mechanics; `World` still uses the
existing production support path. It does not change football replay motion.
The canonical source pin for the evidence below is
`85380f9939728fcab866857478016f7707865fe06bf79634e08e003f90895148`.

## The most consequential remaining problem

The production model does not yet consistently tie the force a contact can
transmit to the foot support actually achieved by the body. Sustained grips,
hand fights, steering and recovery can therefore disagree even when their
individual accounting checks pass. Adding another balance filter, grace
period, strength multiplier or global physics step increase would obscure that
coupling problem. The previous native hand-fight result remains **3/9 fall
disagreements and 0.822 yd worst trajectory error**. This increment has not
changed that production result.

The next physical substrate needs three things together: material contact
points, a body's rotational response, and real unilateral foot support. A
hand cannot provide unlimited anchoring; ground friction cannot be granted
without an achieved normal load; a recovery step cannot exist merely because
a controller selected it. The same rules must govern a tackle, pass block,
double team, press release and cut.

## What is implemented

`spatial-support.ts` represents one finite torso and two finite rigid feet,
with explicit material hip and ankle points. Its passive axial leg springs
retain energy, have capped force and damping, and act at the actual rotated
attachments. All 18 linear/angular endpoint coordinates are solved together.
Opposing leg impulses conserve total linear and angular momentum, including
orbital momentum. A material point's work uses its actual displacement;
rotation does not produce unaccounted steering work.

`spatial-ground.ts` adds sole-point impulses to that **same** nonlinear solve.
It does not solve vertical support and subsequently impose horizontal
traction. Each normal is nonnegative, each friction disk uses that point's
achieved normal impulse, and sliding dissipates work. Empty contact lists
allow a genuinely airborne second foot. All participating bodies respond to
the accepted state together. `knownExternalWork + groundWork` separates the
load channels; the inherited `externalWork` already includes both and must not
have ground work added again.

`sole-contact.ts` provides pose-preserving plastic foot impacts and a separate
instantaneous force-level reaction oracle. The latter includes actual ankle
torque and centrifugal point acceleration. It is useful for checking whether
a held heel should release. An interval-average positive normal alone is not
enough to establish that the heel stayed planted.

These are explicitly isotropic rigid-body reductions, not articulated legs or
full skeletal anatomy. The processed Hamner shape priors help bracket mass,
attachment and inertia sensitivity; they do not measure NFL muscle capacity,
cleat geometry or maximum traction. No scenario-specific strength bonus was
introduced.

## Problems found while validating the increment

Low foot inertia exposed contact conditioning that larger-inertia fixtures
missed. A quiet stance and repeated small shoves failed at ordinary local
intervals. Initializing the sole unknowns from the actual force-level reaction
fixed those cases without changing mass, inertia, friction, strength or final
residual tolerance. The warm start is a numerical guess: it must still satisfy
the original, unregularized coupled equations.

Multi-point impact iteration also needed a normal active-set block and a
safeguarded fixed-point extrapolation. Both retain the original Coulomb and
complementarity checks. No extra contact force or artificial compliance is
accepted because convergence improved.

The instantaneous audit initially omitted the ankle force's moment. Aligned
leg fixtures would not have exposed it. The current oracle includes this
actual material torque. Independent reconstruction also avoids subtracting
nearly equal spring energies to estimate force: a piecewise integral remains
accurate when a planted leg's length barely changes.

## What the evidence establishes

The [input fixtures, reports and commands](../../../data/reviews/physics-world/spatial-support/README.md)
record source and diagnostic hashes at both start and end. Independent checks
reconstruct work and momentum from states, supplied impulses and constitutive
laws rather than trusting the solver's own ledger.

| Panel | Accepted | Rejections / independent violations |
| --- | ---: | ---: |
| Spatial free flight | 216 trajectories, 3,024 intervals | 0 / 0 |
| Spatial attachment impacts | 120 trials | 0 / 0 |
| Established ground contact | 432 trajectories, 6,552 intervals | 0 / 0 |
| Frozen-pose sole impacts | 4,000 trials | 0 / 0 |

All 24 free-flight and 48 ground-contact comparisons improve when the local
interval is reduced from .004 to .002 s relative to .001 s. This is finite
sensitivity evidence, not a claim of convergence for all inputs. Ground
fixtures cover one or two planted feet, small foot inertia, three traction
levels, repeated torso loads, mirrors and translations over .012/.04 s.
At low traction the feet actually slide; higher traction holds the same load.
Maximum independent ground work residual is `8.50e-11 kg yd²/s²`, and maximum
total angular-momentum residual is `5.69e-9 kg yd²/s`. Successful final states
are summarized by hashes; the pinned scripts regenerate the complete outputs.

All **420 TypeScript tests and 22 Python tests pass**; typecheck and build pass
on Node 22.23.3. The first full-suite attempt overlapped large diagnostics and
reported a worker RPC timeout despite passing assertions. A serial rerun
completed cleanly with no runner errors. No football cohort was run because
the production `World` path is unchanged.

The three known long hidden-release controls reject on the local elastic
phase budget. That rejection is a discretization guard, **not a certificate of
first liftoff timing**. The ground report explicitly records
`interiorEventCertification: 'not-provided'`.

## Why feet are not ready yet

The spatial ground kernel accepts already-established, zero-normal-velocity,
noncollinear sole patches. It does not locate touchdown, heel/toe release,
sliding stops, or a support transfer. Its initial/endpoint reaction checks
and .5 angular/elastic phase limits cannot prove that a hidden interior event
did not occur and return. A closed work ledger can coexist with a geometrically
wrong plant. This is the largest immediate gap in the new substrate.

Spatial legs are passive, with fixed rest lengths. Bounded series-rest control
exists in the older 1D solver but is not yet part of the spatial ground solve.
There is no physically executed swing, posture correction, active hip torque,
shared spatial motor power budget, or torso-ground collision. The torso and
feet are rigid proxies without finite body collision shapes. Falling/recovery,
leg grips, universal multi-player contact and production performance are not
validated by these panels.

## Next implementation, in order

1. **Contact geometry and earliest events.** Detect hidden sole-plane crossings
   on the declared material trajectory, then re-solve prefixes from the saved
   state to locate real numerical touchdown/release. Keep active point IDs
   persistent; support one/two-point heel or toe contacts. Bound force and
   geometric history before accepting an event-free interval. Ambiguous
   grazing/chatter rejects atomically; do not snap a foot onto the ground or
   accept a failed candidate as an event boundary.
2. **Bound executed control.** Couple spatial series rest motion and hip/swing
   correction to the same solve. Rate, travel, shared force and positive work
   limits must account for load and backdrive. A desired recovery step is not
   an achieved plant. The one-dimensional actuator remains a useful restricted
   reference, not a shortcut to prescribing spatial support.
3. **Body-ground contact and actual recovery.** Give the torso enough collision
   geometry to prevent passing through turf, and establish when support can
   physically recover. Do not use a fall timer to repair missing geometry.
4. **Gated World replacement.** Use the
   [adapter seam review](spatial-world-adapter-seams.md). Replace the full
   connected island's old support/contact response coherently; a new foot
   solver beside old grip/steering impulses is not the intended architecture.
   Preserve complete rollback, replay state and supported performance.
5. **Transfer gates.** Re-run the native hand-fall failure at several local
   resolutions, the six universal interaction scenarios and profile/technique
   sweeps. Only then compare matched NFL movement/contact strata and small
   full-game guards. No fitting physics to scoring, explosives or tackle rates.

The [physics development guide](../plans/PHYSICS_DEVELOPMENT.md) remains the governing
process. Production readiness means these capabilities transfer across
interactions, not that the research modules have many passing tests.
