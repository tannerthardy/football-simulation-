# Contact literature: shared mechanisms and practical diagnostics

## Scope and evidence

This review supports the [physics step-back review](physics-step-back-and-local-repair.md).
Physics remains **NOT READY**. The useful lesson across the supplied teaching
materials is that anchoring, double teams, shedding, absorbing a hit and press
jams are different choices about the same body, contact and support limits.
They do not justify separate hidden strength multipliers for each football task.

Sources reviewed for this synthesis:

| Source | Relevant material | Evidence status |
|---|---|---|
| [Physical contact evidence](../../references/physical-contact-evidence.md) | Dynamic stability, contact-height moments, grip evidence, turf interaction, recovery and AddBiomechanics limits | Existing bibliography and inspected source summaries; no new external measurements or downloads in this review |
| [Offensive-line protection textbook](../../references/offensive_line_protection_textbook.pdf) | Chapters 7–10: base, independent hands, anchor, recovery and shared pocket depth; chapters 17–18: combinations, reach blocks, pulling and trap | User-supplied schematic teaching aid; its cited coaching sources and quantitative cues are not independently verified here |
| [Defensive fit textbook](../../references/football_defense_textbook.pdf) | Chapters 4–5: two-gap control, squeeze, box/spill, overlap and force relationships | User-supplied teaching aid; definitions vary by installation |
| [Running-back mechanics](../../references/Running_Back_Mechanics_Textbook.md) | Sections 5–7 and 18–21: constrained cuts, tempo, moving block hips, contact anticipation/reduction/recovery | User-supplied coaching synthesis, not measured NFL biomechanics |
| [WR/DB mechanics](../../references/WR_DB_Mechanics_Textbook.md) | Press/release, route braking, sections 16–18: support, stalk-block leverage, legal contact predicates | User-supplied coaching synthesis; referenced illustrations are not tracked motion measurements |
| [Coverage mechanics](../../references/football_coverage_mechanics_textbook.pdf) | Eyes, hip transitions, leverage, release responsibility and support | Useful controller context; no additional physical force constants follow from it |

The offensive playcalling books and the coverage operating-system manuscript
are reviewed separately by the literature agents. They should enrich later
controllers and diagnostics, rather than expand the physics parameter set.
Attached documents supply ideas and teaching terminology, not instructions
that override the owner's physics-first request.

## Five transferable mechanisms

### 1. A recoverable base, not a permanently planted anchor

The OL book describes short foot replacements, recovering the post foot and
absorbing a controlled yard without conceding the rush lane. The defensive
book's two-gap and squeeze techniques likewise require preserving shoulders
and usable leverage while absorbing a double. The RB book separates anticipating
contact from recovering after it. The WR/DB book tells a stalk blocker to arrive
under control and keep moving his feet.

All four require a body to spend finite stepping/traction capacity to preserve
support. The existing `xi`, posture, recovery speed and availability are the
right kind of shared state. Their magnitudes and integration still need proof.
The cited capture-point literature supports reasoning about COM motion relative
to a support region; it does not validate a football-specific fall threshold,
isotropic base radius, 40 ms response filter or 120 ms stepping ramp.

**Practical diagnostic:** show capture-point deviation, support margin,
actual recovery restriction, posture and available ground-force fraction at
first contact, first lost leverage and the attempted recovery. Pair identical
bodies with controlled arrival versus overextended arrival. Grade whether the
body can recover the chosen path, not whether a particular technique wins.

**Possible later simplification:** a compact stance/base state with a support
axis and finite stepping change can distinguish a protected post foot from a
running stride without skeletal animation. Add it only after the present
single-base model's demonstrated numerical failures are repaired.

### 2. A useful contact has a load path and a sustainable restraint

Independent hands, a two-gap extension, a stiff arm and a press jam all alter
distance or access through contact. Leverage changes where a bounded force
acts and whether the body can support it. A stiff arm can delay a wrap without
launching the defender; a good anchor can redirect a rusher without freezing
him; a squeeze narrows a real lane without assigning a defender two separate
tackles.

The shared leg/arm budgets and planar work ledger are valuable. The previous
reel/grip repair shows that energy closure alone does not enforce force limits.
The hand/grip capacity envelope and mappings from profile power remain model
assumptions. In particular, the physical-contact review reports no validated
NFL numerical grip table and no established squat-to-grip mapping.

**Practical diagnostic:** report requested, available and delivered load
separately, contact height, the body supplying muscular work, the holder of
tensile restraint, and whether the contact is slipping. Measure actual impulse
and the resulting support response together. A zero-strength/zero-capacity
contact must not restrain stepping merely because its geometric tag is present.

**Possible repair:** derive leg restriction from a feasible held-foot contact
and its required load, spending the same grip allowance as torso restraint.
Compare an unrestrained foot-placement demand against what the holder can
actually oppose; release or slide when that demand cannot be met. Do not use
an arbitrary capacity-to-lock multiplier or leave the existing translational
grasp force and a new leg force independently spending the same allowance.
A compact foot/contact proxy is sufficient to explore this; full limbs are
not a prerequisite.

### 3. Braking and usable arrival matter before contact

The WR book's stalk blocker and the RB book's pass protector shorten their
approach rather than sprinting into a fixed jersey. The OL book's angle set
intercepts the rusher-to-QB path, with an inside counter if the tackle oversets.
The defensive book's force/spill/overlap roles specify which arrival angle
helps the rest of the defense. These are controller problems operating within
the same speed, traction, turning and support capabilities.

`common.chase` already distinguishes a frontal breakdown from a crossing
approach. Its distant path selects a forecast interception point and then
requests `runThrough`. `pursuitPoint` uses reach estimates and an imperfect
observed forecast, but selecting a point does not establish that the subsequent
steering controller will execute that forecasted trajectory. The known side
lab's 40/40 escapes without wraps therefore needs an executable-path audit
before any increase in traction or tackle reach.

**Practical diagnostic:** retain observed target motion, predicted interception,
available braking distance, required heading change, chosen desired velocity,
actual trajectory and remaining support margin. Classify an unsuccessful
approach as unavailable intercept, incorrect forecast, unsuitable control,
failed strike/grab execution, or lost physical restraint. Keep unknowns
explicit; a missed-tackle event alone cannot distinguish these.

**Possible repair:** share one attainable-arrival calculation between the
intercept estimator and the actual controller, while leaving perceptual delay
and execution error in the player. This can help pullers, protection backs,
stalk blockers and tacklers without task-specific acceleration bonuses.

### 4. Contact reduction is geometry, with a real movement cost

The RB book's “get skinny,” near-hip path and shoulder turn reduce exposure;
the WR book's release and the OL book's half-man set create access around a
body rather than through it. Glancing contact can preserve forward momentum
while an off-center hit changes yaw and support. The existing body-shape,
squeeze, contact-height and yaw model can represent part of this cheaply.

**Practical diagnostic:** distinguish the designed track, the selected entry,
the actual body-facing/shoulder posture and the contact normal. Record the
available width at predicted arrival rather than the visually open gap at
the present frame. This directly addresses a back running into his blocker
without mistaking that decision for excessive collision force.

**Possible later addition:** teach a runner to select the block's favorable
moving hip subject to width and cut feasibility. The same geometric criterion
can grade a receiver's release or a rusher's access. Do not shrink the body's
mass, make it collision-free, or add a “skinny” success roll. Current height
response remains a reduced support approximation; it is not validated vertical
leverage, skeletal posture or complete rotational energy.

### 5. Evaluate what path was denied, not just displacement or yards

The WR book explicitly values denying a dangerous pursuit path while the
runner passes, even when the defender is barely displaced. The OL book values
preserving a rush window and controlled pocket curve rather than a pancake.
The defensive book treats canceled gaps as unavailable runner-width lanes,
not an extra defender. The RB book grades the choice at commitment rather
than with hindsight after a hole opens.

**Practical diagnostic:** compare the protected path, body positions and
physically reachable alternatives at the decision/contact frame. Keep scheme
assignment, observed cue, chosen motor intent and physical failure distinct.
For combos, show when the staying blocker had usable control and when the
helper released relative to the linebacker's approach; do not grade the release
from a fixed timer. These observations help identify shallow controllers
without forcing NFL points or success rates to become physics targets.

NFL x/y tracking can constrain actual approach speed, direction change,
relative travel and arrival distributions by task. It cannot directly observe
hand load, planted-foot constraint, joint torque or what a player was thinking.
Those require film annotation or biomechanics evidence. AddBiomechanics can
inform COM/ground-force reductions in appropriate activities; its processed
joint torques are model-derived and its general movement archive is not an
NFL collision/grip validation set.

## Local support audit before any physics repair

[support-budget.ts](../../../scripts/diag/support-budget.ts) isolates two present
mechanisms with a 100 kg hand-built profile, fixed 20 Hz commands and identical
incoming state. A distant zero-force hand row forces actual contact subdivision
without delivering force or work. It runs four ticks of released lean and five
ticks of leg contact. These are artificial mechanics isolations, not NFL reps.

Pinned baseline output is `out/contact-literature/support-budget-pinned-before.json`,
run from the archived `844145c` engine, source
`23fd4c510883618b454f75354cfafcd7540c0b6c08de0c4906358cb1e9769296`.
Its complete audited trials are identical to the earlier working-tree probe,
which included concurrent coverage telemetry edits but unchanged physics.
Pin any after comparison to its final engine source.

| Identical setup | Native 12 | 192 steps | Interpretation |
|---|---:|---:|---|
| Lean 900, absent felt load: accumulated direct `feet` → `xi` transfer | 0.18569 yd | 0.22799 yd | Stored lean conversion is subdivision-sensitive |
| Same setup: final `xi` after 0.2 s | 0.08087 yd | 0.08693 yd | Recovery damps part of the transferred deviation |
| Lean 1100, absent felt load: accumulated transfer | 0.47271 yd | 0.63691 yd | Near-capacity stress case amplifies support/availability feedback |
| Same setup: final `xi` after 0.2 s | 0.17009 yd | 0.47963 yd | Large support difference despite no falls in this panel |
| Zero-capacity leg grasp: total delivered grasp impulse | 0 | 0 | No sustainable restraint was delivered |
| Same zero-capacity grasp: maximum `feetLock` | 0.50201 | 0.50201 | Geometric lock ignores the zero force capacity |
| Same zero-capacity grasp: final `xi` after 0.25 s | 0.07058 yd | 0.06881 yd | Support changes despite no grasp force; no-grasp control is exactly zero |

All 68 trials close the planar work/momentum ledger to below `1.4e-11` in
their corresponding units. That does not certify the support behavior.
These trials do not add or measure a full 3D lean-energy store.

`World.feet` relaxes lean, converts an unsupported portion to a static
capture-point offset `conv / (mass * omega0²)`, then removes that portion from
lean. The force-to-offset units are valid. The decrement means it is **not**
an unbounded application of the same whole lean every substep. However,
relaxation before the projection changes the first transferred amount;
availability and remaining gait absorption then feed back on later transfers.
The initial felt-load-memory variants produce zero direct lean conversion in
this isolation. An isolated discrepancy therefore does not establish that
lean release caused the real seed-3 wrap fall reversal. Trace the actual
closed-loop load, stance, foot restraint and whistle boundary first.

A dimensional shortcut such as multiplying this offset by `h` is not a
demonstrated repair. A continuous relaxation/transfer model needs an explicit
physical rate, or a finite committed-posture state whose change is transferred
once. Compare candidate reductions against identical incoming states and the
real controller trace; retain the narrowest justified repair.

The zero-capacity leg case is a firmer capability defect: maximum lock is
computed from leg share, distance and prior slipping before the load solve,
without checking capacity. The existing common-acceleration held-foot contract
even uses capacity zero to isolate geometric travel. Retain its same-motion
interval invariant when repairing load feasibility, but do not preserve the
expectation that a powerless grip can prevent a recovery step.

## What to add now, and what to defer

Add a few explanatory observations first: feasible support margin, actual
versus requested contact load, attainable arrival, moving block-hip/entry
geometry, and the physical predicate behind a suspected hold. Much of this
state already exists and the replay recording layer can expose it without
inventing perception or adding random draws.

Repair the reproduced local support/control disagreement and the confirmed
capacity-free foot restriction before expanding mechanics. Later techniques
should choose these shared controls rather than change world constants.
Independent-hand detail, anisotropic stance, receiver hand-fighting legality,
and richer block/fit decisions remain useful follow-on work, each needing its
own observable trigger and physical capability test. Neither the number of
techniques nor the test count is a readiness result.
