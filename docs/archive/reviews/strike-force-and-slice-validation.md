# Finite strike forces and correctly installed slice-block tests

## Status and where to start

The shared World now centers travel from the **achieved finite strike impulse**,
using the existing arm-force, work and reach limits. This is the same numerical
principle as the preceding hand-force repair: an action developed over an
interval must not carry its end velocity through that entire interval. There
are no new anatomical states, physical capacities or solver subdivisions.

This review also corrects two errors in the previous slice-block lab. Its
declared formation strength opposed the staged TE's side, and its first-contact
predicate omitted the real finite-strike channel. Neither error justified
increasing agility or forcing an engagement to survive.

Watch the [corrected 14-clip film](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/motion-contact.zip) and read the
[evidence and rerun commands](../../../data/reviews/physics-world/strike-contact/README.md).
The exact final engine content identifier is
`623b1c16aca5c6aa1a5f99bf178b789edaa1a12951058b75ef7ecd177a84217f`.
Historical films and measurements remain available with their original source
and schema labels. This increment does not establish NFL realism or settle the
owner's remaining OL path and pursuit observations.

## What changed physically

`World.strike` requests a technique impulse. The World already doses that
request as a bounded force throughout the controller tick, shares arm capacity
with hand actions, rejects unreachable/down-actor strikes, and caps positive
muscular work. Position integration previously treated each delivered dose as
if it arrived at the beginning of its physics interval. That adds half of the
achieved acceleration times the interval squared to travel.

Four equal-and-opposite midpoint corrections now accumulate into the existing
travel adjustment after the actual force/work-limited fraction is known.
Velocity, load and work accounting remain unchanged; neither requested impulse
nor a hypothetical force is used for the correction. Instantaneous torso
impacts retain their existing treatment. No new comparison option is needed:
the retained before-World file identifies the preceding integration exactly.

An independent Newtonian constant-force oracle uses unequal masses, three
rotations, four 50-ms controller ticks and 1/6/12/48/192 physical subdivisions.
Before the repair, maximum position error is 0.00125 yd at one subdivision and
0.00010417 yd at 12. Afterward, the maximum across every case is below
`4.5e-15` yd. Final velocity is unchanged to roundoff. This is a restricted
numerical correctness test, not a claim that football contact trajectories are
identical at every resolution.

The new `StepReport.strikes` records **delivered** actor/target impulses and
signed kinetic work, aggregated over each requested action. Rejected requests
have no physical contact record. A strike can remove kinetic energy; negative
work is legitimate. Requested contact height is labelled as requested because
the support model applies its existing body-height clamp. This small reporting
addition lets diagnostics distinguish actual force from a label or intent.

## The slice-block correction

The historical fixture staged H on `side`, with a slice toward `-side`, but
used `flip: side < 0`. That placed the declared formation strength on the other
side. The production kick/log read consequently used the opposite direction
from the custom slice path. The corrected fixture uses `flip: side > 0` and
checks declared strength, staged TE side and slice direction together before
running a trial.

In the historical stationary highlighted witness, the TE acquires at 2.15 s
on the wrong drive half-plane and immediately sheds for leverage. Its old
`firstContact` is empty, yet reported strike work is about -56.0 and the
defender supplies about 44.6 kg·yd/s arm impulse. This is a reachable bounded
first-contact swipe, not proof that no physical force acted. Deleting such
strikes would remove a plausible defender action.

In the correctly installed fixture, the existing visible-cue log adjustment
fires before acquisition. `MC-S7-wideSurface-R-V0-P12` acquires and receives
hand load in the 2.20–2.25 s interval, then remains engaged through the 2.5 s
inspection endpoint. This particular improvement already occurs **before**
the strike-position repair: it belongs to the installation correction.

Version 2 records acquisition, first achieved body/hand/strike force,
first hand/body load, sampled engagement/load intervals, and accumulated
impulses separately. An acquisition, a single strike or a nonzero interval is
not a successful sustained block. Observation bins do not establish continuous
loaded duration between samples. The updated exporter labels v1's missing
strike accounting and inconsistent installation explicitly.
The channel list names forces observed within the same 50-ms interval; its
order does not identify their exact onset order. Absolute mean hand force times
the interval measures absolute net impulse, not the integral of absolute force
when force rapidly reverses within that interval.

The paired corrected-installation panel holds fixture/tool bytes, rosters,
inputs, 20-Hz controls and recording policies fixed while changing strike
quadrature. It uses 72 primary rows and six separately labelled far-edge
negatives. Native primary reps establish hand/body load in 8/8 at each initial
speed; all far-edge negatives remain no-contact. Maximum refinement endpoint
error changes from 0.05364 to 0.05209 yd, with no contact/fall classification
disagreements. Mirror error remains below `2.3e-14` yd and force/work budgets
close. These reused geometries, mirrors and resolutions are not independent
NFL samples or evidence of a universal block success rate.

## Rejected approach changes and next work

Two small OL alternatives were checked on four retained plays before adding
any live approach change. Pointing cutoff drive at the initially assigned
defender improved one wide-zone acquisition angle but made the inside-zone
shed earlier. Replacing the full-speed cutoff approach with existing moving-
point tracking postponed one wide-zone shed by only one controller tick,
left the repeated bad fit, and again worsened inside zone. Neither ships.
Their ignored probes and source-pinned compact evidence are retained separately
from the corrected lab and physical integration comparison.

The next useful OL work is to distinguish approach, reachable hand acquisition,
actual transmitted load and established fit. The overloaded `drive` currently
serves as first-step direction, desired displacement and leverage reference;
changing it globally trades errors between techniques. Start with the retained
cutoff's wrong-side regrab and compare a tiny achievable fit/recovery shortlist
using consumed delayed observations and existing movement limits. Keep normal
downhill blocks, real doubles, crossing slants and impossible fits beside it.

Do not preserve a bad block with a time grace, suppress every first-contact
defender strike, reverse every cutoff, or increase traction to hide the request.
Contact onset, active reeling, nonlinear refinement and empirical physical
capabilities remain separate limits of the reduced model. Expand the model only
when a retained interaction demonstrates a missing shared capability.

## Publication checks and practical limits

All **606 TypeScript tests**, **22 Python tests**, final typecheck and build
pass. The four new physical tests include simultaneous actions under the
existing force/work limits; two fail against the retained before integration.
All 14 corrected films pass offline browser, raw-recording decoding and ZIP
integrity checks. Observer controls preserve physical history and RNG.

The production transfer checks deliberately retain ordinary football errors:

- **144 controlled runs:** identical input cohort, profiles and measurement
  tool. Stuffs remain 33/144; 10-plus-yard runs change from 4 to 5, mean credited
  gain from 1.93 to 2.13 yd and median from 0.95 to 0.80 yd. All finish without
  physical timeouts or lower-hold reach releases. Only 65 gains are identical;
  seven finish categories change. The largest gain change is an outside-zone
  OOB at 18.29 yd becoming a 70-yd touchdown. These are sensitive trajectories,
  not evidence that higher yardage is more realistic. Retained per-concept
  rows include the inside-zone and wide-zone decreases.
  Excluding that one outside-zone rep, the mean paired gain change is
  -0.159 yd: the overall mean increase is entirely outlier-driven.
- **64 tackle encounters:** every saved physical/outcome payload, input and
  profile is identical to the previous version. Fourteen primary encounters
  remain live at their six-second inspection limit; that is a censor, not a
  timeout or an automatic missed tackle.
- **Hand fighting:** all 54 redirect rows, five refinement summaries and 12
  frontal tackle rows are identical to the preceding centered-hand panel.
  Native closest-distance error remains 0.0617 yd mean / 0.1817 yd maximum,
  with 0/9 fall or corner disagreements. Previously worsened individual
  refinement rows remain unresolved; strike integration does not improve them.
- **Two games:** same starting rosters and seeds, with later calls and draws
  diverging. Both finish without physical timeouts, lower-hold reach releases
  or motor-work excess; maximum momentum/work residuals stay below
  `1e-11` / `5.4e-11`. One final game ends 68–29, against 24–25 in the parent.
  That bad-looking result remains visible. Two games do not establish a
  scoring or explosive-play trend, and this repair earns no NFL-fit claim.

The [verification manifest](../../../data/reviews/physics-world/strike-contact/verification-manifest.json)
pins sources, commands, retained reports and check results. Game timings were
collected alongside other diagnostics and are not a cost benchmark. The
physics model remains reduced and its empirical capacities remain uncertain.
The next football-facing improvement should show better achievable OL fits
in retained ordinary and difficult blocks before changing global capabilities.
