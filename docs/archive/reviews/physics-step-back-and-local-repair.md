# Physics: step-back review and local repair

## Review first: baseline and judgment

Baseline is `844145c` on `claude/engine-priorities`, engine source
`23fd4c510883618b454f75354cfafcd7540c0b6c08de0c4906358cb1e9769296`.
This review is written before the new physics repair. Read
[PHYSICS_DEVELOPMENT.md](../plans/PHYSICS_DEVELOPMENT.md) and the
[previous force-budget handoff](grip-budget-and-replay-foundation.md).
PR #1 stays separate. The offensive textbooks are retained for later;
this pass does not expand the offensive playbook or coverage.

**Physics is not ready.** Its architecture is much more useful than its
current validation: one world, body-owned support, common movement/arm/traction
budgets, physical hand and grasp joints, contact heights, and an inspectable
planar momentum/work ledger. These can support many football techniques
without a skeletal simulation. However, conserving momentum and accounting
for work do not prove credible balance, sustainable restraint, numerical
stability or human force magnitudes. The previous reel/grip defect demonstrated
that distinction directly.

We should retain this reduced model and repair demonstrated defects. Adding
full limbs now would add parameters and contact complexity before resolving
the problems already reproduced in the simpler world. Translation and yaw
are planar; height and posture influence reduced support. This is not a 3D
anatomical model, and its ledger is not a complete human energy budget.

## Persistent problems and what their evidence supports

### 1. Coupled balance/contact integration is not reliable enough

The nine real-controller hand-fight fixtures retain **0.822 yd worst approach
error and two fall disagreements** at native 12 versus 192 substeps. At 24
there are also two disagreements; 48/96 happen to agree on falls in this small panel.
Long continued frontal contact has shown **8.502 yd defender / 11.842 yd carrier
final drift** and **0.691 yd mirror error**. Those are readiness failures, even though short
conservation/symmetry contracts pass. A finer simulation is a numerical
reference, not observed physical truth.

The previous switched-resolution probe isolates two different paths. Seed 3 /
power 1 QB fall follows *post-wrap* resolution even with the same pre-wrap
resolution. Seed 3 / power 1.4 rusher fall follows *pre-wrap* resolution. With
football controls frozen, all five first-wrap fixtures make the QB fall at
every resolution. We must inspect the real closed loop, not infer the cause
from the frozen trial or fix both with one coefficient.

The world filters forces, follows acceleration, applies height moments and
held-foot travel, recovers capture-point deviation, and switches support
states. Several nonlinear/discrete boundaries feed the next 20 Hz decision.
Potential errors include stale versus current leg restriction, thresholded
slip/ratcheting, integrating an unsupported lean as a displacement each
substep, and fall/whistle boundary ordering. These are hypotheses to trace,
not established causes of the QB reversal yet.

### 2. Restraining a foot is not yet force-feasible

In `World.substep`, a leg grip's geometric overlap and `legs` value determine
`feetLock` before forces solve. `updateSupport` then restricts recovery and
adds carrier-versus-holder travel to support deviation. This restriction does
not check the available grip capacity. A zero-capacity leg joint can therefore
restrict stepping even though its active/passive grip force is zero. A small
grip can influence balance strongly without a demonstrated load budget.

A reduced foot model is reasonable, but its restriction needs a sustainable
load or reachable contact explanation. Merely multiplying an arbitrary
lock factor by strength would hide the problem. We need to distinguish a
hand brushing the leg, a foot actually held, a foot pulled through the grip,
and a holder carried along by the body.

### 3. Hand fights amplify path, ordering and support differences

The worst seed-7 approach error occurs before a wrap. Grasp-only repairs cannot
fix it. Hand control, slip, grip loss, contact normals and lean release need
the same local audit as tackles. A finite-iteration sequential solve can also
favor order in a near-critical multi-body case. Stable pair ordering or more
iterations is not automatically a fix: isolate a shuffled/mirrored failure
and inspect residuals before changing the algorithm.

### 4. Pursuit and tackle approach remain physically inconsistent

Shared braking and crossing approach control improved some approaches without
changing strength. Yet all **40/40 fast side-pursuit reps escape without a
wrap**, and owner clips retain overpursuit/teammate collision concerns.
This may combine unreachable intercept plans, limited observations, bad
breakdown decisions, and actual physical limits. A tackler can be correctly
unable to catch a runner; the relevant question is whether he chose a feasible
intercept when one existed. Don't increase traction until that is separated.

Tackle acquisition still has miss/dive probabilities and a sampled grip
quality influenced directly by ratings. Subsequent interaction is physical,
but the initiation has not reached the project's control-only philosophy.
Eventually uncertainty should affect aim, timing, reach and foot placement;
contact geometry should determine whether hands arrive. Replacing those
abstractions before restraint/convergence works would mix too many changes.

### 5. Loaded locomotion and effort are only partially validated

In the current four-game guard, DL speed at 0.5 s is **1.58 yd/s** versus
**1.68** in the reference, while run peak acceleration is **4.75 yd/s²** versus
**3.28**. Those do not justify simply reducing all DL acceleration. Initial
get-off, demand, posture, loading, OL response and later bursts are different
measurements. Run yards before contact average **0.77 yd** against a reference
of **1.16 yd**, but these descriptive cohorts and contact labels differ.

The matched NFL drill panel is valuable: 888 paths / 420 athletes / 3,552
paired world trials. It exposes capacity-versus-effort and reversal-control
issues. Tracking paths identify executed movement, not maximum capacity or
grip force. Keep athletic ceilings separate from chosen effort and compare
like tasks, surfaces, speeds and loads.

### 6. Forces and reduced support need empirical bounds

The 3.36-arm structural grip envelope, turf coefficient, torso compliance,
base radius, stepping speed, height proxy and fall transitions are model
assumptions. Some have plausible dimensions, but they have not been validated
as a coherent human model. NFL position tracking alone cannot identify all
of them. AddBiomechanics metadata is reviewed; no subject force/motion files
have yet calibrated support. Lab ground-force and balance-recovery evidence
would be more useful here than another large unlabeled trajectory download.

### 7. Outcome guards remain poor physics estimators

The last 16-game guard worsened points **29.47→32.03**, YAC **8.01→8.88 yd**
and missed/broken tackles **0.19→0.26/play**, while passing explosive rate and
interceptions decreased. The six-game film has different trends/cells. Calling,
coverage, roster exposure, officiating and changed random draw paths confound
these means. Behind-line called-pass QB scrambles are also misclassified as
rushes in an existing metric. Keep those regressions visible, but don't tune
forces until points or outside-zone success match an NFL mean.

## Candidate fixes: mechanisms and falsifiable checks

These are alternatives, not a promise to implement all of them together.

| Candidate | Mechanism it would repair | Evidence needed before adoption |
|---|---|---|
| Integrate lean release as a finite transfer | Moving stored committed lean into capture-point deviation must not repeat the same transfer once per numerical subdivision. | Same incoming state with disappearing load; displacement/time response converges, mirror and work remain closed. Trace actual wrap to establish relevance. |
| Couple feasible leg restraint to available force | Estimate/supply the force needed to hold a stepping foot; slip when the grip cannot sustain it, use the common grip allowance. | Zero capacity produces no restraint; weak versus firm grip has sensible scaling; equal common motion does not trip; duplicate grips cannot add strength. |
| Integrate slip continuously | Replace threshold-driven full slipping behavior with demand/capacity residual and finite motion, if binary slip is the reproduced discontinuity. | Identical input load crossing capacity slowly; same slip distance/leg transition across resolutions; no extra grip work. |
| Resolve fall time within a substep | Locate a demonstrated support threshold crossing before changing contact/control state; preserve ordinary decision rate. | Local fall timing/position converges; no invented recovery or suppression of physically unstable states. |
| Improve contact/support coupling locally | Consistent evaluation of load, posture and stepping restriction, or bounded local refinement of a stiff contact island. | The specific reversal and its force/support residual improve without raising every player's resolution or introducing scenario multipliers. |
| Remove demonstrated pair-order bias | Symmetric sweeps or residual-driven iteration for the failing island. | Body permutation and long mirror tests identify the defect; altered solve reduces it without creating energy or excessive load. |
| Use executable pursuit plans | Short deterministic forward rollouts of the same movement envelope, using delayed observed runner velocity; compare intercept and arrival-relative speed. | Feasible crossing/side scenarios improve; impossible catches remain impossible; no future runner cuts or hidden state access. |
| Improve tackle acquisition control | Choose sustainable approach/plant/reach before reaching; put uncertainty into aim/timing rather than success rolls. | Same bodies with different controls transfer across approach angles, traffic and loaded holds, within common force/work limits. |
| Separate effort from movement ceilings | Fit executed demand distributions conditionally, preserve maximum sprint/drill ceilings; use the same limits under load. | Matched held-out movement tasks at several speeds, braking/reversal, pulls and backpedals; no role-specific contact strength. |
| Bound reduced balance and contact parameters empirically | Small complete ground-force/recovery subsets and sensitivity ranges; distinguish measured force from inferred inverse dynamics. | One consistent parameter set across anchor, double, shed, absorbed hit and press. Plausible uncertainty matters more than exact league averages. |
| Complete unaccounted physical storage | Audit planar work, lean/support changes and modeled fall acceleration separately; add only energy states justified by the reduced model. | No technique can generate repeated positive work without muscle/gravity/storage accounting; don't claim skeletal energy closure. |

## Chosen next repair and stopping rule

First instrument the seed-3/power-1 real wrap from an identical pre-wrap path,
including per-substep intents, lean/support changes, grip load/slip/legs,
feet restriction and whistle timing. Investigate **finite lean transfer**
before broad solver changes: the current code directly adds converted lean
to `xi` inside `feet`, making this a concrete suspect worth isolating.
That observation alone does not establish the fix.

Adopt a change only if a direct paired mechanical reproduction confirms the
cause and the cheaper conservation/transfer checks hold. Then rerun the nine
hand fixtures and prolonged-contact/mirror guard, followed by tracking and
games as descriptive guards. If the local hypothesis fails, retain the trace
and move to feasible leg restraint. No global step increase or outcome tuning.
Record improvements and regressions together before publishing.

Readiness will mean bounded and convergent sustained interactions, plausible
loaded movement and recovery, symmetry under real controls, and one shared
set of capabilities transferring across the owner's interactions. We cannot
honestly claim that 95% of possible gains are exhausted yet.

## Implementation results

### What the local trace established

The new `wrap-feedback.ts` diagnostic keeps the real football controllers,
20 Hz decisions and officiating. Each resolution uses the same 192-step
pre-wrap trajectory and switches only at the incoming grasp. It separately
records the feet phase's direct `xi` transfer, grip load/slip/legs, sensed
forces, support, selected intents and event boundary. The incoming physical
state is identical across resolutions within each revision.

Before the repair, seed 3 / power 1 has no direct lean-to-`xi` transfer in its
first three recorded wrap ticks. The final recorded tick transfers **0.28376
yd at 12 steps versus 0.31399 at 192**. This is before a protective whistle;
the finer QB starts falling and the native QB does not. Lean release is a
real contributor, but that does not establish it as the entire failure.

The new 68-trial `support-budget.ts` panel isolates the mechanism with an
identical 100 kg incoming body, absent load, fixed controls, and a distant
zero-force joint to force actual numerical subdivision. A sensed-load-memory
condition is separate. These artificially committed states are not a claim
about how an NFL player reaches that posture.

| Initial committed lean, kg·yd/s² | Before: total direct transfer at 12 / 192, yd | After: 12 / 192, yd |
|---|---:|---:|
| 900 | 0.18569 / 0.22799 | 0.23482486 / 0.23482486 |
| 1100 | 0.47271 / 0.63691 | 0.66202007 / 0.66202007 |

In the 1100-unit trial, final support deviation was **0.17009 versus 0.47963
yd** before; now it is **0.52749050 versus 0.52749063**. This is evidence for
the isolated release, not full football convergence or validated human balance.
The zero-capacity leg condition still produces zero grip impulse and nonzero
foot restriction: it is deliberately retained as an unresolved defect.

### Repair: preserve finite committed geometry and settle its feedback

`World.feet` now transfers existing unsupported committed lean **before**
exponential force relaxation can erase it. It then develops the finite new
lean request and handles any newly unsupported share. Each transfer removes
exactly that force-equivalent amount from the remaining lean state and adds
`converted / (mass * omega0²)` along its direction to capture-point deviation.
No impulse, new muscle or scenario strength factor is added by this operation.

The first transfer changes the same body's support availability. The old code
continued using the availability from before the transfer and needed another
numerical substep to discover reduced absorption. A bounded local projection
now re-evaluates the existing common availability after each finite transfer,
before applying ground forces. It consumes only the remaining lean; it never
refills a technique's force/work allowance. The existing support/force model,
physical parameters and global 12–16 step budget are unchanged.

The projection permits at most 64 local iterations and exposes its remaining
force-equivalent residual rather than hiding truncation. In this panel the
largest residual is **3.16e-9 kg·yd/s²**, and the hardest case reaches the
iteration limit. This is negligible relative to the artificial 1100-unit
input, but it is a reported numerical residual, not an exact root claim.
Availability is radial; with opposing initial support deviation it can rise
before falling. We do not claim global monotonicity, a unique physical
equilibrium or a validated anatomical energy model.

`StepReport.leanRelease` records the actual transferred geometry per body;
`maxLeanReleaseResidual` and `maxLeanReleaseIterations` record solver quality.
The new contract checks the transfer across subdivision, mirrored states and
initial deviations that first recenter under the lean. A later fall freezes
deviation at its threshold-crossing sample; that separate event-timing error
prevents using final frozen `xi` as an exact release contract. Full-path/fall
probes remain in the evidence and continue to fail readiness.

### Transfer: improvements and regressions

| Real hand-fight measurement | Before | After |
|---|---:|---:|
| Native-12 mean approach error vs 192 | 0.20605 yd | 0.20840 yd |
| Native-12 worst approach error | 0.82215 yd | 0.82204 yd |
| Native-12 fall disagreements | 2/9 | **3/9** |
| 24-step fall disagreements | 2/9 | 1/9 |
| 48/96-step fall disagreements | 0 | 0 |

The identical-pre-wrap live QB probe still differs: 6/12 do not fall, while
24/48/96/192 do. The release repair therefore **does not fix the QB reversal**.
The full panel's additional native fall disagreement is a regression; it is
not hidden by raising global resolution or tuning forces.

The 96-rep unwrapped approach panel's worst sustained frontal ending-position
drift improves **8.50170→8.10155 yd for the defender** and
**11.84205→10.94313 yd for the carrier**, but its two native/fine fall disagreements
and **0.69060 yd** full-path mirror error remain. Contact counts/entry closing
are unchanged. These are ongoing failures, not tolerable errors justified by
the slight improvement.

The 120-rep shared-capability panel transfers one unchanged capability set
across anchor, double, shed, absorbed contact and jam. Native mean/max subject
position differences versus 48 are **0.02973 / 0.06903 yd** (previously
0.03017 / 0.07510), with zero fall-set disagreements in that mechanical panel.
Mirrors stay within `1.2e-14` yd, arm impulse stays within budget up to roundoff,
and native momentum/work residuals stay below `5.7e-13` / `2.2e-12`.
Those tasks do not validate NFL techniques or excuse the live failures.

### Small applications from all supplied literature

Three reviewers read the offensive, defensive/receiver and contact aids. The
new offensive textbook and 453-row glossary are retained verbatim. Their
citations/teaching installations are not independently verified NFL rules.

- [Offense review](offense-literature-applications.md) adds a read-only
  run-concept process lab: intended rules versus loaded doubles, actual climbs,
  puller arrival, reachable mesh, carrier support and existing press timers.
  Across 84 four-second reps there are 94 planned combinations, 61 observed
  loaded doubles, 25 climbs, 35/48 puller contact events and 84 handoffs.
  Every observer/plain pair preserves full state/events and the next RNG draw.
  Power/Under has no runner LOS crossing in four reps: investigate ownership
  and arrival before blaming force. Small unmatched cells do not grade NFL
  scheme quality. Keeper-alone feasibility and explicit press/read/outlet
  contracts are proposed next; no new offensive controller is installed here.
- [Coverage review](coverage-literature-applications.md) adds copied locked
  branches and already-consumed receiver declarations, plus an eight-fixture
  initial/first-invalid-contract lab. There are zero narrow contract violations
  and seven inspection points. Relationship loss, legitimate overlapping
  carries and a nominal force player retaining a man label are distinguished
  from proven busts. Inputs are witnesses, not synthesized causal explanations.
- [Contact review](contact-literature-applications.md) connects recoverable
  base, sustainable restraint, achievable arrival, geometric exposure and
  finite commitment across the same universal world. It supplies the
  controlled lean/leg panel and documents why grip capacity alone cannot
  validate held-foot restraint.

These additions deepen observable execution without multiplying plays or
football-specific strength parameters. The previous published film remains
pinned to its recorded source; it is not regenerated as evidence for this pass.

### Next physics work

1. Give foot restraint a sustainable load path using the same grip allowance.
   Zero-capacity and weak holds must not freely restrict recovery. Inspect the
   live wrap's load/slip/held-foot/support path together, keeping the decisions
   and incoming state matched; no ad hoc capacity-to-lock multiplier.
2. Resolve actual fall/whistle transition timing and the pre-wrap hand-path
   failure. Repeat the native nine-fixture panel, long frontal and mirror guard.
   A stronger algebraic release is not sufficient to pass these gates.
3. Audit executable far pursuit and achievable strikes/grasps, then loaded
   run contact and effort/capacity separation against matched NFL tasks.
4. Validate reduced contact/support magnitudes with complete measurements
   and sensitivity bounds before installing more detailed techniques.

**Still NOT READY.** Whole-game guards and final verification follow below;
the evidence is in `data/reviews/physics-world/lean-release/`.

### NFL movement and whole-game guards

The four-game seed-5 tracking guard retains **1.58 yd/s** DL speed at 0.5 s
and **4.18 yd** pocket depth at 2.5 s. Geometric two-yard pressure rises
**31.4→33.6%**; first run contact YBC rises **0.77→0.91 yd**; run DL peak
acceleration is **4.74 yd/s²**. The reference values are 32.49%, 1.16 yd and
3.28 yd/s² respectively. This is a descriptive generated-roster cohort, not
a matched-force experiment or an NFL pressure attribution model.

The sixteen-game seed-7/two-league guard changes as follows:

| Measurement | Before | After |
|---|---:|---:|
| Points/team-game | 32.03 | **35.28** |
| 20+ yd completions/attempt | 14.26% | **16.14%** |
| YAC/completion | 8.88 yd | **9.17 yd** |
| INT/attempt | 6.77% | **7.38%** |
| Missed + broken tackles/play | 0.26 | **0.27** |
| Run yards/carry | 3.91 yd | 4.46 yd |
| Run stuffs | 23.34% | 22.11% |
| 10+ yd runs | 6.47% | 9.21% |
| Mean time to throw | 2.56 s | 2.57 s |

The new two leagues span **28.38–42.19** points/team-game and **4.28–4.63**
run yards/carry. Passing/scoring regressions are material and remain visible.
Changed contact paths change later execution, RNG consumption, calling and
roster exposure; identical league seeds do not isolate each causal effect.
Do not suppress correct finite geometry or tune a strength factor to repair
these means. Diagnose contact feasibility and the actual controller/coverage
failures. The historical scramble/sack definition issue and mismatched YBC
definitions remain open; calibration's generic printed targets are not the
conditional NFL task reference.

Final verification: **287 tests**, **22 Python data tests**, clean typecheck
and build. The run observer passes 84 exact state/event/next-RNG comparisons;
the copied coverage getter passes observation noninterference. Recording and
the previous viewer remain unchanged. Runtime logs were collected under
varying concurrency and do not establish a performance regression or speedup.
