# Constraint loads, foot support and passive ground friction

## Status and where to start

**Physics is NOT READY.** The owner's proposed priority is correct: a contact
must be reachable, transmit only a sustainable load, and affect the same body's
movement and support over time. Persistent constraints cannot independently
freeze movement, spend force, and decide balance.

This pass repairs two demonstrated violations: unusable grips acting on a body
before release, and independent sliding/yaw friction for an off-feet body. It
also rejects a broader held-foot shortcut. That shortcut improved a numerical
fall result while destroying a basic tackle. The intended foot-support coupling
is still missing; passing contracts do not certify it.

Start with the controlled foot and mirrored-contact evidence in
[constraint-support](../../../data/reviews/physics-world/constraint-support/README.md),
then the remaining failure list below. Read [PHYSICS_DEVELOPMENT.md](../plans/PHYSICS_DEVELOPMENT.md)
alongside this handoff. Work on `claude/engine-priorities`; PR #1 remains separate.
No physical profiles, force coefficients, global substeps, coverage or football
controllers were retuned here.

Baseline commit: `ba42c297883f8d1308ba47dbf44fa1a52aa561a2`.
Baseline engine source:
`0f1124fde702bfd754944b10bc2d35f2ebf4914c1a2fa864e701afb6683b47ad`.
Adopted engine source:
`d040bd04f864b12ba5f49250b7ca53b3609dd25bd41dfa3326d0b0181917fd4a`.
These identifiers hash sorted relative path strings and file bytes under `src/`.
Diagnostics, tests and documentation have separate manifest hashes.

## What the trace established

### A grip could affect support before it was known to be usable

`World.substep` assigned geometric `feetLock` before solving forces. A
zero-capacity leg grip therefore restricted recovery and created held-foot
deviation, despite transmitting zero grip impulse. An already unreachable
grasp could deliver one substep of force before its end-of-step release.

The world now checks effective grip capacity, standing/ground reach, current
distance and stored hold length before arm allocation, foot restriction and
forces. An unusable grasp releases immediately. The existing standing and
ground reach rules and common grip-capacity calculation remain authoritative.

| Controlled native 12-step trial | Before | Adopted |
|---|---:|---:|
| Zero-capacity separation grip: maximum foot lock | 0.502008 | 0 |
| Same trial: maximum support deviation | 0.095935 yd | 0 |
| 900-unit unreachable standing grip: delivered impulse | 3.75 kg·yd/s | 0 |
| 900-unit unreachable ground grip: delivered impulse | 2.625 kg·yd/s | 0 |

The 162-trial panel includes six geometries, no-grasp controls, capacities
0/1/50/900, one/four duplicate grips and 12/48/192 actual subdivisions. A common
zero-force hand island ensures the ungripped control is also subdivided.
The observer reads foot restriction in the support phase, after force and
interval-motion integration. Missing foot-force telemetry is **null**.

**Not repaired:** reachable positive-capacity leg grips still use geometric
restriction. In the recovery fixture, capacities 1, 50 and 900 all restrict
feet by 0.502008 while measured body-level grip impulse is zero. This exposes
the missing foot-load path. Zero body impulse alone does not prove a real
hand/foot hold should exert zero force: an attempted recovery step can load
the hold without appreciable COM travel. The engine does not yet represent
that attempted foot motion and reaction force.

### Ground rotation and translation spent separate friction allowances

Standing yaw already shared the body's traction allowance. Off-feet translation
used bounded Coulomb drag, while yaw decayed on an independent 0.15 s time
constant. The angular impulse was recorded, but its magnitude did not share
the available friction force. Near rest, a full-substep trapezoid also moved
an already stopped body too far.

The passive body now requests stopping force and stopping torque together:

`sqrt(Fx² + Fy² + (torque / lever)²) <= mu * mass * gravity`.

Both requests receive one common scale, with no motion reversal. The friction
coefficients are unchanged. The lever is `2 * radius / 3`, the mean radius of
a uniformly loaded circular footprint. This is an explicit geometric proxy,
**not measured prone-athlete contact geometry** or an exact distributed
friction solution. The normal-load approximation remains `mass * gravity`;
vertical body motion and foot-specific normal loads are not simulated.

For a down/rising body with no fall drive, the solver integrates translation
and yaw only until their finite stopping time. The same mean translation goes
to position integration and held-foot interval comparison. Falling translation
with the existing gravity-derived fall drive is not claimed to have an exact
stopping-time solution. Work and angular impulse remain observable in the
existing ledger; this is planar kinetic accounting, not full human energy closure.

Two new contracts fail on the archived engine and pass after repair: combined
sliding/spinning stays within the pure-slide friction allowance, and a passive
early stop gives the same final position/facing at 1/12/48 subdivisions and
under reflection. The unusable-grip contract separately verifies exact equality
to the ungripped body trajectory, including balance.

## Sustained interaction and convergence evidence

The new `long-contact-trace.ts` uses the existing frontal movement fixtures
with generated body profiles. Ordinary pursuit runs independently on each
side in one mode. A second mode reflects the positive-side commands, separating
the physics world from amplified differences in pursuit feedback. Each pair
runs five seconds; full-path position errors include **both bodies**.

| Measurement | Before | Adopted |
|---|---:|---:|
| Seed 7, native 12, ordinary pursuit: maximum mirrored error | 0.690597 yd | 0.00009279 yd |
| Seed 7, native 12, identical reflected commands | 1.304481 yd | 0.00000005448 yd |
| Entire 96-trial movement panel: maximum native mirror error | 0.690597 yd | 0.00019706 yd |
| Movement panel: worst carrier ending error, 12 versus 48 | 10.943127 yd | **11.741297 yd** |
| Movement panel: worst defender ending error, 12 versus 48 | 8.101550 yd | **8.696990 yd** |
| Movement panel: fall-set disagreements, native versus 48 | 2 | 2 |
| Nine hand fixtures: fall disagreements, 12 versus 192 | 3/9 | 3/9 |
| Nine hand fixtures: worst closest-approach error | 0.822040 yd | 0.822040 yd |
| Shared-capability native mean/max position error versus 48 | 0.02973 / 0.06903 yd | 0.02970 / 0.06903 yd |

The friction repair strongly reduces the reproduced mirror amplification. It
does **not** resolve subdivision-dependent falls. The worst ending error
increases: seed 19's frontal case has different fall sets at 12 and 48, and
the revised passive response changes the refined post-fall path. Seed 19's
native mirrored path remains about 0.0002 yd apart. A refined simulation is
a numerical reference, not a measured physical truth.

The live seed-3/power-1 QB wrap still does not fall at 6/12 and falls at
24/48/96/192. Its pre-wrap trajectory is identical within each revision.
Native hand-fight mean closest error is 0.208393 yd. The six real-technique
interaction families retain their contracts, including the successful frontal
tackles. Across the 120 five-task shared-capability trials, native fall
disagreements remain zero and mirror error is about 1.2e-14 yd. Delivered grasp
force stays within the common grip allowance in nine isolated and 27 real
football trials. These are limited transfer checks, not NFL fidelity claims.

## Rejected foot-restraint experiment

The candidate moved foot restriction after force solution and bounded it using
actual resisting body-level grip impulse, relative interval travel and a
support-equivalent recovery demand. A second variant used the actual ramped
recovery demand rather than the full stepping ceiling. Neither creates new
force capacity, but neither establishes the actual force on an attempted foot.

The first variant removed the live QB fall reversal and reduced hand fall
disagreements from three to two. However, clean frontal tackles at 4 and 7 yd/s
ceased to finish at every tested resolution. The revised recovery-demand
variant still fails the ordinary frontal tackle contract. That is sufficient
to reject the abstraction; tests and tackle forces were not weakened to accept it.

The second variant's patch, source identifier, failed focused test and eight-game
guard are retained as rejected evidence. Its outcome means were also worse,
but rejection rests on the faulty load representation and failed physical
transfer, not on fitting points or yards/carry. None of the experimental foot
budget fields is in the adopted engine.

## NFL and football guards

The NFL data continues to inform matched movement, get-off, pocket shape and
contact timing. Tracking identifies executed paths and external net-motion
demands; it does not identify hand/foot forces or maximum human capacity.
Existing extraction cohorts and reference-file hashes remain pinned.

Eight games use seed 7 and two independent generated leagues, four games each.
The baseline has 1,014 counted scrimmage plays; adopted has 1,013. These are
descriptive guards with changed downstream decisions/draws, not paired plays
or statistically precise estimates of a physical coefficient.

| Eight-game metric | Before | Adopted |
|---|---:|---:|
| Points/team-game | 30.75 | 31.06 |
| Yards/pass attempt | 9.91 | 9.58 |
| 20+ yd completions/attempt | 14.78% | 12.73% |
| YAC/completion | 8.31 yd | 8.40 yd |
| Interceptions/attempt | 5.19% | **6.44%** |
| Sack rate/dropback | 5.62% | **3.11%** |
| Run yards/carry | 3.80 yd | 3.81 yd |
| Run stuff rate | 25.96% | **28.57%** |
| Missed + broken tackles/play | 0.26 | 0.25 |

The four-game seed-5 tracking guard also regresses two-yard QB pressure
**33.6%→24.3%**. Pocket depth at 2.5 s stays about 4.18→4.17 yd (reference
4.55), and DL speed at 0.5 s stays 1.58 yd/s (reference 1.68). Run DL peak
acceleration increases 4.74→4.94 yd/s² (reference 3.28). First-contact run
yards rise 0.91→0.94 yd (reference 1.16). These passing, tackling and loading
limitations remain visible; no force was fitted to erase them. Legacy generic
YBC targets and called-pass scramble classification issues also remain.

Validation: **290 TypeScript tests in 28 files, 22 Python data tests, typecheck
and build pass.** The new Python reduction verifies before/after source pins.
No claim is made about runtime improvements; elapsed guards had different
concurrent loads.

## Next: establish a real reduced support load path

1. Represent a support-foot placement/anchor and its attempted recovery motion
   explicitly enough to compute load. Keep the compact body; full skeletal
   simulation is not required. Document the relation between COM/capture-point
   state and foot motion instead of treating `xi` itself as a material limb.
2. Couple foot-ground traction, hand/leg restraint, and the body's support
   response in the same contact island. A held foot may prevent a plant only
   while its reachable grip can carry that load. Excess demand causes slip,
   altered placement or release; the equal-and-opposite reaction acts on the
   holder. Do not add hidden strength for tackles versus blocks or press.
3. Record attempted placement, constraint demand, delivered force/impulse,
   residual slip, contact height and support response. Share the existing grip,
   leg/traction and active work allowances; separate passive restraint from
   active stepping work. A zero geometric error can still carry load.
4. First require no restraint from an unusable grasp, feasible scaling of weak
   and strong valid holds, no false trip under common motion, no strength from
   duplicate constraints, and successful ordinary tackle/block transfer.
   Then trace the specific QB support/fall/whistle boundary and pre-wrap hand
   path. Persistent constraint state and event timing follow this coupling.
5. Re-run long contact, permutation/reflection and subdivision guards locally.
   Do not raise resolution everywhere to conceal the error. Improve executable
   pursuit and loaded initial run contact after the support model is coherent.

The present balance proxy, assumed inertias, constant normal loads, ground
footprint and fall transitions remain unvalidated. Readiness needs bounded
and convergent sustained/multiple contacts, plausible loaded motion and recovery,
and one capability set transferring across anchor, double, shed, absorbed hit
and press. We cannot quantify “95% of all possible gains” from the current evidence.

## Useful data and the owner's lab observations

[The physical evidence review](../../references/physical-contact-evidence.md)
identifies small AddBiomechanics subsets and their limitations. No subject
force/motion files have yet been downloaded or analyzed. The most useful next
files are **two complete Hamner running subjects** with measured ground forces
and foot timing, and **two Moore perturbed/unperturbed walking subjects** with
force/CoP, motion, masses, missing-force flags and processing-pass metadata.
Walking recovery is a baseline model check, not an NFL lateral-hit calibration.
Original synchronized video plus body profiles and visible foot/contact states
would separately help validate tackling/blocking; 2D video cannot directly
identify grip force. Keep raw data out of Git and publish checksummed inputs,
attribution, exclusions and small measured tables.

The owner's six lab IDs refer to `viewer/inspection-room.html`, recorded source
`23fd4c510883618b454f75354cfafcd7540c0b6c08de0c4906358cb1e9769296`,
not this pass's engine. That artifact has not been regenerated. Preserve it
for comparison. Body-facing ticks are not eye/head direction; a shared visual
acquisition/attention budget remains a design, not implemented vision.

| Owner observation | Next diagnostic, before changing controls |
|---|---|
| LAB-P004 Stick / Cover 2 Match: LB eyes/body | Separate facing, intent, consumed receiver key and delayed observation; do not infer gaze from the facing tick. |
| LAB-P001 Four Verticals / Palms: safety roof | Check ownership/read transition and reachable recovery before changing anticipation or speed. |
| LAB-P003 Counter / Cover 1: RG/RT lose useful work | Trace actual target invalidation and available blocking work; distinguish a stalled controller from physically unreachable contact. |
| LAB-P002 Inside Zone Weak / Cover 3: LG climb | Record keeper-alone leverage/support, LB threat and climb intent; an open geometric lane alone does not prove the remaining block can be sustained. |
| LAB-P005 Toss / Cover 3: center/runner track | Check installation in Gun Doubles, pitch geometry, designed aiming point and actual block targets against the front. |

These are queued observations, not confirmed defect frequencies or coverage
fixes. The earlier run-process and coverage-key literature labs remain available.
Do not overwrite the source-specific lab IDs with changed plays or mix their
observations into an NFL frequency estimate.
