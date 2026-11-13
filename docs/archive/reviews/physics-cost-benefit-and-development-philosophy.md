# Physics cost-benefit: how simple can the football engine be?

Implementation follow-up: [Smaller live recovery model](force-coupled-held-recovery.md)
records the first shipped reduced repair, validation, costs and limitations.
The statements below about unchanged production and unmeasured candidate cost
describe this review's original checkpoint; the follow-up supersedes that status.

## Decision

**Try a smaller support/recovery repair before committing to universal two-foot
gait.** Keep the existing World body, collisions, bounded hand/grip forces,
posture and balance. Evaluate one effective support region with finite achieved
recovery and a consistent shared force path. Add persistent lower attachment
geometry only where the interaction requires it. Two compact massless support
slots remain the next option if they are the clearer way to represent a retained
failure. Full inertial/spatial feet remain paused.

The [previous two-foot recommendation](football-first-physics-simplification.md)
is a useful fallback design, not an established minimum. The evidence proves
that support and restraint must be coupled; it does not prove that all 22
players need independently simulated plant/swing/land/load cycles.

Four agents independently reviewed minimum mechanics, numerical/maintenance
cost, football value, and the development philosophy. Their common conclusion
is to test the minimum coherent representation against live football cases.
This is an architectural review, not a new solver implementation or a measured
comparison of candidate runtime. Production physics is unchanged.

Work on `claude/engine-priorities`. PR #1 remains separate. This review is the
current priority and refines the previous simplification plan.

## Cost-benefit comparison

| Option | What it buys | Engineering and validation cost | Recommendation |
| --- | --- | --- | --- |
| Existing body + force-coupled effective support/recovery | Targets inconsistent restraint, sustained yielding and recovery while preserving ordinary movement | Lowest expected incremental surface; reduced balance assumptions still need validation | First bounded contender |
| Effective support + persistent lower attachment | Maintains the geometry of a low hold without simulating every running stride | Bind/transfer history and force/work consistency can become complex | Use only where the retained interaction needs geometry |
| Two compact massless support slots | Distinguishes held/supporting feet and asymmetric plants explicitly | More lifecycle, gait, load-transfer and coupled-constraint obligations | Adopt if simpler state cannot generalize, or exceptions become harder than two stable slots |
| Inertial/3D feet with compliant soles | Foot inertia, vertical loading, rocking and material response | Highest algorithmic and calibration exposure; no demonstrated World benefit | Research reference, off the critical path |

These cost rankings are engineering judgments. No integrated candidate benchmark
supports a percentage speedup or an implementation-time estimate. Two points
are cheap to store; maintaining their lifecycle is the larger cost. A complicated
selective-foot system could be worse than two always-present lightweight slots.
Choose fewer exceptions and assumptions, not merely fewer state fields.

Current World uses scalar constraint rows and fixed sweeps. The spatial research
uses an 18-unknown finite-difference Newton solve, dense linear algebra, line
searches and contact-phase handling. That establishes a larger cost surface,
not a measured multiplier for complete football games. More detail also brings
more parameters that tracking alone cannot identify.

## Evidence that changes the recommendation

The [source-pinned live-World comparison](../../../data/reviews/physics-world/football-first/README.md)
is unchanged by this review:

- Legacy recovery changes under a positive-capacity low hold even when the
  represented grip transmits zero impulse. Actual attempted recovery and its
  resisting load need a coherent path.
- Virtual-foot removes native hand fall disagreements, 3/9 to 0/9, but leaves
  the worst closest-distance difference at 0.822 yd and worsens the five-task
  worst difference from 0.069 to 1.323 yd. Better conservation or one better
  fall count is insufficient.
- Its support coordinate can drift beyond reachable geometry. That disqualifies
  using it as a planted or held foot, but does not prove ordinary nominal gait
  requires physical soles.
- A retained no-grasp case has contact-onset/support-history sensitivity.
  Explicit foot identity cannot automatically fix every sustained-contact error.

There is also substantial **historical controller evidence**, with its original
source pins, not freshly rerun here:

- [Tackle approach](controlled-tackle-approach.md) reduced crossing contact
  speed from 10.43 to 3.23 yd/s and native crossing falls from 14 to zero using
  the same physical capabilities.
- [Traffic planning](traffic-and-man-accounting.md) removed all eight RB/blocker
  and eight QB/fullback collisions in their paired mechanical panels without
  weakening contact. Other owner clips exposed alignment/cardinality failures,
  rather than bodies failing to obey their instructions.

These samples do not quantify the proportion of remaining physics versus
control errors. They do show that added anatomy is not the only path to more
believable football.

The unused finite kernel's latest comparison completes 160/160 lifecycle cases
and 240/240 original stress cases; wider seeds still retain rejections. See
[the later inertial evidence](../../../data/reviews/physics-world/inertial-support/README.md).
Older 138/160 counts are historical. Numerical completion still does not
validate nominal gait: body-relative stance retraction must not compete with
additional corrective stepping under the same speed cap.

## What we should simplify—and what must stay consistent

Keep one physical body per player, actual momentum, finite collision geometry,
yaw, contact-height effects, bounded force/reach and persistent balance history.
Use the same profile capabilities across anchors, drives, sheds, jams, cuts
and tackles. No technique receives extra strength to make its named result
happen.

Balance, stance and recovery can be effective models. They need not emerge
from anatomical limbs. Normal running can use an effective movement envelope,
and visual foot animation can remain separate from physical state. Neither
claims measured per-foot ground forces or complete limb energy.

An effective nominal support reference may move with executed gait because it
is **not a planted sole**. Actual held attachment geometry and unrecovered
disturbance cannot be moved or erased with that reference. Keep grip position,
velocity, reaction and work consistent. A coordinate change cannot relocate a
held point for free.

Do not replace `feetLock` with a force-ratio debuff after the solve. The intended
recovery must demand force; sustainable restraint must affect achieved movement
and produce the matching reaction in the same interval. If the aggregate model
cannot express this consistently, add the minimum persistent support coordinate.
Do not keep an unrestricted recovery motor beside an unrelated held point.

Ground drive, braking, steering, lean and recovery share one capability budget.
Multiple holders or support points cannot buy extra effort. Passive constraints
cannot generate unexplained energy in represented motion. Keep the existing
work/momentum audits while stating what the reduction does not represent.

An aggregate response cannot depend only on net grip force. Opposed lower holds
may cancel translation while consuming effort, creating torque or restricting
different recovery directions. Retain individual force paths. If representing
those distinctions needs bespoke penalties, two stable lower support identities
are the simpler choice.

## Revised development philosophy

1. **Optimize for football observables.** Start from a retained clip or scenario,
   isolate the error, and change the least state needed to explain it. More
   mechanically complete models do not get priority without transferable gains.
2. **Allow honest reductions.** Effective slip, recovery response, stance and
   execution laws are legitimate when named, bounded and falsifiable. Avoid
   arbitrary final tackle/block win rolls or yardage overrides. Execution
   variation may enter decisions, timing, placement or grip acquisition before
   contact; it cannot redraw physical strength each solver iteration.
3. **Use practical convergence standards.** Require accurate ordinary contact,
   bounded errors and meaningful refinement across football intervals. Keep
   exact analytic checks where applicable. Do not demand bit-identical whole
   plays at every resolution or mistake agreement near a threshold for truth.
   Post-whistle drift is a secondary numerical diagnostic; live errors remain
   primary. The current 0.822/1.323 yd discrepancies still warrant investigation.
4. **Calibrate identifiable parameters.** Matched movement can constrain
   acceleration, braking and recovery timing. Use conditional NFL distributions
   and reserved examples. Prefer measurements, but label reasonable effective
   assumptions where data cannot identify anatomy. Do not fit hidden force
   multipliers to points or rushing averages.
5. **Keep physics primary without freezing competent control.** Fix diagnosed
   braking, pursuit, re-anchoring or target errors alongside their scenarios
   using existing physical limits. Record controller changes separately. Broad
   scheme/coverage expansion remains secondary; poor commands must not become
   reasons to build more physical machinery.
6. **Maintain one production path and one candidate.** Preserve useful references
   and bug fixtures. Retire obsolete selectable branches after promotion, rather
   than maintaining an expanding matrix of physics modes. Do not silently fall
   back between support models mid-play when a candidate fails.

## The next bounded experiment

First test effective support/recovery inside actual World, retaining ordinary
free movement. Include zero-force restraint, controlled weak/medium/strong
holds, moderate/strong shove recovery, anchor, strong/heavy jam and ordinary
frontal tackles. Use the same profiles and commands; compare identical-command
physics with the real closed-loop techniques.

Then run the existing five-task and real-technique panels, free run/brake/cut,
and the first divergent wrap/no-grasp traces. The contender must reduce the
diagnosed error, preserve successful tackles and avoid unbounded support or
the current jam regression. Passing a stationary fixture alone is insufficient.

Review after two small implementation/evaluation cycles. A further cycle needs
a specific retained local fault and a bounded repair; do not automatically
expand into another backend. If separate simultaneously held/supporting feet,
asymmetric plants or transfer history are the demonstrated limitation, move
to two compact slots in the same World interface. If conditional attachment
handling needs many exceptions, two stable IDs may already be simpler.

Show a small labeled before/after football film set. Measure repeated warmed
22-player workloads with alternating baseline/candidate order and normalized
tick/play costs. The earlier 10% median/20% tail overhead targets are provisional
engineering budgets, not measured outcomes. A new full-game baseline without
an integrated candidate would not answer the comparison.

No new giant dataset or 3D contact research is needed for this decision. Use
the existing BDB movement panel and selected contact labels for task-specific
validation. Preserve population and control uncertainty instead of requiring
generated rosters to reproduce identical NFL means.

## What “pretty good” should mean

The next useful milestone is a **football-capable foundation**: the same body
capabilities yield sensible displacement, anchoring, recovery, contact and cuts
across ordinary scenarios; defects are traceable; typical outcomes are stable;
simulation cost is acceptable. Explicit anatomical limitations can remain.

At that point most development can shift to anticipation, technique, pursuit,
protection, assignments and roster differences. Full product readiness later
adds broad scheme execution, rules and season-scale performance. This is more
actionable than certifying a percentage of every conceivable physics gain.

Simpler is likely to get us there sooner because we can tune and diagnose a few
observable mechanisms instead of many unmeasured anatomical/material states.
That benefit remains conditional on passing the shared football cases. Neither
the effective support model nor two slots have yet earned promotion.
