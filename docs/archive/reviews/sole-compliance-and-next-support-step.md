# Sole compliance and the next support step

For the current traction increment, read
[Sole traction and the next physics step](sole-traction-and-next-physics-step.md).
The source and measurements below retain this normal-support increment's pin.

**Physics is not ready.** This increment makes the research foot/contact model
more consistent; `World`, live football trajectories and replay behavior are
unchanged. The new source pin is
`05375672a5a6a56904169fc33627dd0fc2ba1ff03bf0088bcd3c7bddb344dfe9`.
Read this before the preceding
[pivot barrier review](foot-contact-events-and-pivot-barrier.md).

## The review's main finding

The most valuable next change is still the relationship between actual foot
support, transmitted force and body response. More football moves will not
repair that relationship. The production support reduction still does not
have finite feet whose ground loads, slips and grips determine achieved
support in the same connected physical solve. Its sustained-contact fall
disagreements remain unresolved; this research increment does not claim to
reduce the preceding 3/9 hand-fight disagreements or .822 yd trajectory error.

The preceding spatial research model exposed a narrower structural problem:
choosing one normal impulse to close a rotating toe's endpoint gap preserves
work but does not also close its instantaneous endpoint normal velocity.
Adding a third sole constraint suppressed the pitching mode instead of fixing
it. A post-step pose or velocity correction would create another uncoupled
response. Globally increasing resolution would reduce the symptom while
retaining the incompatible contact method.

Two alternatives were reviewed. A genuinely constrained rigid integrator
needs enough temporal force information to satisfy configuration and velocity
together, derived on actual material attachments. A finite shoe/turf interface
permits indentation and stores its energy, so a toe can move normally while
its compressive load changes. The latter is the smaller coherent experiment
and represents a real physical degree of freedom. It changes the material
model explicitly; it is not numerical compliance added to make a singular
rigid solve converge. Keep the independent rigid reference as a target and
retain the constrained-integrator alternative if a plausible finite material
cannot pass support, event and efficiency gates.

## Implemented mechanics

`src/physics/spatial-sole-compliance.ts` uses the existing finite torso/two-foot
material model and passive leg law. All 18 endpoint linear/angular momentum
coordinates are solved together. Sole point forces are recomputed from each
candidate pose and enter that same residual. No foot is advanced separately,
no planned support share supplies a normal, and no endpoint is projected.

For a sole point above a fixed plane, signed gap is `g`. Compression is
`max(0,-g)`, and surface energy is `U = K*w*compression²/2`. The spring's
discrete-gradient **force** is `-ΔU/Δg`; its impulse is that force times the
interval. Actual material-point torque and work use the same attachment
geometry. Positive unloading work comes from the recorded surface potential.
It is not free active work or negative damping.

The initial passive dashpot acts only on closing compression. It dissipates
energy and never attracts the foot during separation. Rebound remains
undamped by this deliberately limited law. Per-foot stiffness and damping
are distributed with positive normalized area weights. Splitting a coincident
point preserves force, torque, stored energy and numerical guard values;
changing the sole geometry still changes the physical load distribution.

Known external work is summed from known input load rows, separately from sole
spring/dashpot work. Reports retain actual work versus the constitutive law,
surface energy, all-body and per-body momentum residuals, actual gaps, modes
and local phase/damping estimates. The local material stiffness/damping trace
includes shared leg and sole point mobility. It is an accuracy estimate, not
a nonlinear prestress bound or an event certificate. Only compressed sole
points contribute their contact-mode trace; a distant free foot does not
acquire a fictitious stiff constraint.

The kernel accepts only candidate paths uniformly free, compressed or exactly
coincident. The material-plane enclosure rejects unresolved or interior mode
changes. A zero-gap endpoint is accepted only with an additional strict signed
derivative enclosure excluding a hidden cross-and-return. Physical/numerical
rejection is atomic; known load IDs cannot impersonate generated sole forces.
Overflowed energy, NaN ledgers and inaccurate material attachments reject.
These guards do not implement a complete touchdown/release driver.

## Independent evidence

The [mechanics report](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/sole-compliance/mechanics.json)
records **9,632 intervals**, zero ordinary rejection and zero independent
budget violation. The audit reconstructs potential, forces, impulse, torque
and work from inputs and returned states, rather than trusting solver reports.
Maximum energy/work residual is `2.10e-10`, linear residual `2.90e-10` and
world-origin angular residual `3.78e-9`, in the declared kg/yd/s units.

- **One-point pivot:** four stiffnesses, two damping values and three local
  resolutions. A separately integrated continuous compliant ODE supplies the
  fixed-material target. Endpoint errors decrease approximately fourfold when
  the interval halves. Increasing stiffness approaches the separately
  published positive-normal rigid reference: zero-damping continuum error
  falls from .02742 at K=250 to .0003913 at K=16000. These maxima mix the
  recorded coordinate units; inspect individual endpoint coordinates too.
- **Heel/toe rocking:** a 2 kg foot with .008 kg yd² isotropic inertia, two
  actual rotating weighted points and a known 500-unit total normal demand.
  Both points remain compressed while pitch oscillates. Independent continuous
  multi-point equations agree under refinement, with error ratios 3.89–4.16.
  The finest pitch-speed errors are .00017–.00067 rad/s. Damped rows dissipate
  energy; undamped rows retain it. This supports rocking mechanics, not a
  completed roll-off/replant cycle.
- **Loaded torso/feet:** 96 kg torso, two 2 kg feet with .008 inertia, passive
  legs, four sole points per foot, two material stiffnesses, two damping values,
  with/without a known shoulder load. Static equilibria do not drift. Reflected,
  translated and split-point variants agree below `1.19e-12`.
- Oversized elastic intervals, oversized damping intervals and interior
  contact onset reject without changing the saved state. An independent
  harmonic check also matches the analytic midpoint oscillator response to
  about `2e-16`; a finite-input overflow witness no longer accepts NaN work.

The support normal forces are constitutive ground reactions, not player
strength. K, C, sole shape and area are explicit sensitivity fixtures, **not
NFL-calibrated values**. Well-prepared smooth supported stiffness convergence
does not establish a plastic-impact limit. The high-stiffness rocking panel
also shows why a converged implicit residual alone does not establish temporal
accuracy: its coarse pitch-speed error is .011 rad/s, falling to .00067 under
two halvings. Use local accuracy control, not more substeps everywhere.

## Persistent gaps and the best next work

1. **Ground friction in the same compliant solve.** Couple actual sole slip to
   a friction disk sized by the achieved spring/dashpot normal. Static grip and
   sliding must spend that same contact budget. Preserve split-point invariance,
   material work and torque, including one/two-point rocking. Reuse the existing
   maximum-dissipation machinery; do not use scheduled bodyweight traction or
   relax old rigid rows into this different material law.
2. **Actual contact lifecycle.** Handle approach, first compression, unloading,
   release and replant across connected intervals. Re-solve candidate prefixes
   from the saved state; the full-step path cannot certify a changed prefix.
   Simultaneous events, endpoint ambiguity and failure snapshots remain explicit.
   This finite normal law has no plastic impulse at first sole compression;
   future rigid body/grip impacts require their own connected impact treatment.
3. **Bounded spatial control and restrained feet.** Extend the already tested
   series-rest actuation to the spatial model, then swing/placement and posture.
   A low grip acts on an actual foot attachment and opposes its achievable step
   through the existing shared grip allowance. No leg-lock multiplier or
   geometric recovery-speed penalty. Balance observes achieved support.
4. **Torso-ground and one World response.** Add body-ground contact before full
   falls/recovery, preserve total mass when splitting body parts, and replace
   connected production response coherently using the
   [adapter seams](spatial-world-adapter-seams.md). Do not combine solved normal
   loads with legacy planar traction or move a player again after this solve.
5. **Transfer and computational viability.** Prove the same force/work limits
   across anchoring, doubles, shedding, absorbing contact, press and tackling;
   resolve the retained native QB/grip and hand-fight failures. Measure local
   stiff-island cost before promoting a 22-player path. Then compare matched
   NFL movement/contact distributions and small game guards.

The useful simplification remains finite torso/feet plus material points,
isotropic inertias and controlled force-limited attachments. Full articulated
limbs are not required for these gates. Persistent terrain deformation,
cleat anisotropy, measured bottom-out and detailed shoe layers can wait unless
an independently reproduced failure requires them. Separate technique errors
from physical capability; do not select stiffness from sacks or yards per carry.

The acquired AddBiomechanics subset informs mass/inertia and movement-demand
checks, but does not identify shoe/turf stiffness, damping or cleat geometry.
NFL tracking cannot identify those either. Synchronized indentation/load or
instrumented footwear data would narrow that material assumption; it is not
needed to prove the implementation's mechanics. NFL movement/roster validation
becomes more useful after executed feet/control enter the actual World path.

## Reproduction and status

Pinned commands and source/script identifiers are in the
[evidence README](../../../data/reviews/physics-world/sole-compliance/README.md).
All **440 TypeScript tests and 22 Python tests pass**, with clean typecheck and
build under the pinned Node 22 runtime.
The new files are unused by production `World`; no football cohort was rerun
and no improvement in pressure, tackle success or replay appearance is claimed.
PR #1 remains untouched. The goal is not complete: normal compliant support
now passes a useful mechanics gate, while traction, contact lifecycle, active
recovery and coherent production integration remain necessary.
