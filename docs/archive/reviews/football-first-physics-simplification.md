# Football-first physics: the smallest useful support model

**Cost-benefit update:** read [the newer philosophy review](physics-cost-benefit-and-development-philosophy.md)
first. Independent reviews recommend a bounded effective-support contender
before making universal two-foot gait a prerequisite. This document retains
the comparison evidence and two-slot fallback design.

## Recommendation and current priority

**Pause expansion of the spatial foot/ground solver. Build and evaluate a small
two-foot support model inside the existing football `World`.** Keep the current
planar player bodies, mass, yaw, reduced posture/contact-height moments and fall
state. Add persistent, reachable support points and couple their achieved
movement to the same bounded ground, leg and grip reactions.

The owner explicitly requested this review before more 3D expansion. This
recommendation supersedes the spatial-integration prerequisites and “next”
lists in the earlier research handoffs. Those reports retain their original
results; they are references, not the current implementation order. Work on
`claude/engine-priorities`; do not merge or modify PR #1 without checking with
the owner.

This is a recommended reduction, **not a newly implemented production model**.
Production still defaults to legacy support. The overall physics is not ready
for the owner's final OK. The next milestone is demonstrably better live
blocking, tackling and movement, rather than a more complete biomechanics
backend.

## What the evidence actually supports

The newest spatial work has useful mechanical checks, but it is unused by
football `World`. It cannot explain improvements in current replays or establish
that anatomical detail is needed to fix their remaining problems. Several
research increments added lifecycle, inertia and material assumptions before
demonstrating transfer to an actual football scenario. That order has become
too expensive in complexity and too remote from the product goal.

We reran existing **actual-World** diagnostics at source `7cda8ef`, using the
same bodies, capabilities, controls and runtime with either legacy support or
the existing default-off `virtual-foot` option. The refined run is a numerical
comparison, not ground truth. See [the evidence and commands](../../../data/reviews/physics-world/football-first/README.md).

| Live-World comparison | Legacy | Virtual-foot | Meaning |
| --- | ---: | ---: | --- |
| Native hand-fixture fall disagreements against 192 substeps | 3/9 | 0/9 | Force-opposed corrective movement addresses one instability |
| Worst hand-fixture closest-distance difference | 0.822 yd | 0.822 yd | The pre-wrap/block path problem remains |
| Five-task native mean position difference against 48 substeps | 0.030 yd | 0.129 yd | The experimental support path does not generalize yet |
| Five-task native worst position difference | 0.069 yd | 1.323 yd | Strong/heavy press-jam cases expose a major regression |
| Ordinary frontal tackles across the hand panel's resolutions | All succeed | All succeed | Improving coupling need not remove ordinary tackling |

Both models conserve momentum to numerical precision in these panels. That
does **not** make their football behavior equivalent or establish calibrated
contact magnitudes. Zero fall disagreements can also mean both resolutions
produce the same wrong answer. No new full-game run or 22-player speed
comparison is claimed here.

Three specific mechanisms guide the smaller design:

1. **Legacy restraint can act without transmitted force.** `World` computes
   `feetLock` from grasp geometry and the previous slipping flag before solving
   the current grasp. Recovery is then reduced independently of actual grip
   impulse. The fresh stationary-start panel confirms that capacities 1, 50
   and 900 each transmit zero impulse yet leave the same extra recovery error.
   At native resolution, free final error is `(0.03816, 0.00636)` yd versus
   `(0.04382, 0.00730)` yd with any of those holds. These controlled initial
   conditions establish inconsistent restraint, not its game frequency. This
   needs coherent force coupling, not foot inertia.
2. **The experimental support point is not a planted foot.** Its anchor is
   transported with the body plus a cumulative corrective offset. The earlier
   telemetry reached 7.27 yd of offset. Resetting or clamping that point would
   conceal the missing placement/support mechanics.
3. **Not every failure involves a grip.** The retained no-grasp frontal case
   falls differently after a roughly 3.1 ms contact-onset discrepancy despite
   nearly equal tick-integrated impulse. Foot support is a priority, but it is
   not a universal explanation for contact timing or controller feedback.

The fresh recovery panel also keeps a separate synthetic drift probe: manually
resetting support error repeatedly lets the averaged offset grow to 3.99 yd.
That tests missing finite geometry, not repeated-hit response. The earlier
[force/work and impact review](constraint-work-and-impact-timing.md) and
[virtual-foot review](virtual-foot-coupling-and-biomechanics.md) retain live
telemetry and controlled traces. Their measurements have historical source
pins and are not relabeled as fresh runs.

## Necessary complexity versus optional detail

| Keep or add now | Why football needs it | Simplify or defer |
| --- | --- | --- |
| One body mass, planar momentum, yaw and finite collision geometry | Determines displacement, redirection and collisions between all 22 players | Anatomical torso/limb rigid bodies |
| Two stable support identities and actual world positions | Distinguishes a real plant, a moving step and a held foot; permits load transfer | Foot segment mass/inertia, toe/heel patches and joint chains |
| Finite reach and achieved recovery movement | Prevents remote footing and intended steps counting as completed support | Full muscle/joint dynamics |
| One shared ground/leg effort budget | Anchoring, drive, braking, turning and recovery must compete for capacity | Separate role or technique strength multipliers |
| Bounded hand/grip forces with continuous attachment | A weak hold slips; a sustainable hold changes actual movement | Per-finger anatomy and special leg-lock strength |
| Reduced posture, contact height, support error and fall lifecycle | Distinguishes a high shove, low wrap and loss of footing | Full 3D pitch/roll and vertical ground-contact integration |
| Persistent contact state, local coupling and physical-interval work checks | Sustained loads and simultaneous constraints need stable results | A dense spatial nonlinear solve for every player |

This is a **2.5D football model**: planar body motion with reduced height and
balance information. A ball can retain its existing vertical flight without
giving every player anatomical vertical dynamics. Rendering detail and physics
state do not need to have equal complexity.

Flat-ground normal loading may initially be a stated quasi-static approximation:
nonnegative support shares determine `N_i = w_i m g`, and loaded shares sum to
at most one. A settled grounded stance normally carries bodyweight; lost or
unavailable support must not be renormalized back into a full base. An unloaded
slot receives no ground reaction; an off-feet player uses the existing
body-ground path. Each plant has friction
capacity `mu N_i`, with one player-owned total allowance. Two feet must not buy
twice the player's traction. Turning and translation must also share that
allowance.

This approximation does not reproduce measured running force peaks, flight,
vertical suspension of a held foot, or complete limb energy. Keep those limits
explicit. Start with grounded bracing and recovery, where the reduction is
strongest. Retain a simplified nominal running gait and prove it behaves
plausibly; add a reduced dynamic load estimate only if observed movement shows
the bodyweight approximation is the limiting error. That still would not
require a full shoe-compression solver.

## The small support model must remain physically coherent

Each player owns two support slots with stable IDs, actual XY points, grounded
or unloaded/placing state, load share, a reachable requested placement and
actual placement progress. A planted point stays in world coordinates until
it actually slips or unloads. A target is not an achieved landing. A low grip
references the same slot through support transfer; it cannot switch feet to
evade a constraint.

Use a small finite support region around each point, rather than a zero-width
line between two mathematical points or an unlimited support circle. Placement
aims may turn with the player; already planted world points do not. Changing a
grip's body/foot coupling must be an explicit slip/regrip transition with its
motion and work accounted for, not a silent attachment relocation.

Solve the affected support/ground/grip rows with the existing body/contact
constraints **before integrating the same interval**. Do not run a second
support world after moving the player, or apply a second traction allowance.
Use local small blocks where grip and ground rows are nearly dependent. Other
contact islands keep the ordinary solver. A full coupled 18D spatial Newton
solve is not required by this plan.

The existing massless placement law is a plausible first experiment: a bounded
free placement command changes according to actual aggregate resisting load
through a finite effective mobility. It is a reduced control assumption, not
measured anatomical muscle behavior. Pair it with finite geometry, actual
ground reaction and an explicit active-work/passive-loss ledger. Reuse the
finite prototype's attachment geometry, matching velocity response and local
block ideas, rather than copying its whole gait driver.

Finite reach is a feasible placement condition, not permission for an infinite
leg reaction. If the current plant cannot remain reachable under sustainable
forces, represent slip, unloading or failed support. Do not teleport the foot,
add an unbounded corrective impulse or introduce a new leg-lock multiplier.

Constrain all slot efforts from one profile-derived capability set. Retain
equal/opposite interaction impulses, shared grip capacity, aggregate final
physical-interval work, and atomic failure handling. Numerical corrections are
solver guesses, not additional muscle actions. Duplicate grip or ground rows
cannot create strength or energy. Do not remove those safeguards in the name
of simplicity.

Bound aggregate active effort as well as net ground force: two opposing foot
forces can cancel translation while still consuming effort and generating
yaw. Zero-work static force still needs a force limit, and negative work in
one channel cannot pay for unrestricted positive work in another.

Balance then consumes actual loaded support and achieved corrective motion.
There is no additional geometric `feetLock` debuff on this path. Remove the
overlapping legacy trip/recovery terms when their effect is already represented
by actual support loss; do not count the same restraint twice. Intended
plants do not cancel collision-induced instability before they occur. If a
moderate shove admits a reachable recovery step, the player can recover; if
load, reach or grip prevents that step, the same support model can fail.
Unrecovered instability must not disappear into a changing reference frame.

### The critical running-gait trap

The unused massless finite prototype limits relative foot movement with the
corrective stepping speed. A player moving at 7 yd/s needs a stationary
planted foot to travel at **-7 yd/s relative to his body**. Capping that at
roughly 3.4 yd/s artificially brakes ordinary running. Adding foot mass is
not the only solution to this coordinate/control error.

Separate nominal gait transport from additional corrective placement. Both
still use one actual force/work budget. Keep support instability as an error
relative to executed nominal gait; replacing it with a raw static capture
point would make healthy running appear unstable. First prove an unopposed
run retains its speed with reachable support transfers, then add disturbances.

## Get back to football in three bounded increments

1. **Stationary support in actual World.** Add the default-off two-slot path
   for a brace, a moderate/strong shove and an attempted held-foot recovery.
   Trace requested/achieved placement, transmitted grip/ground impulse, support
   error and fall state. Keep the ordinary player mass and contact model. Do
   not expand normal-material events as a prerequisite.
2. **Transfer the same capabilities.** Run anchor, double-drive, shedding,
   absorbed contact, press/release and ordinary tackles with the same profiles.
   Then demonstrate free running, braking and cuts without hidden braking or
   extra agility. Clear finite reach, persistent attachment, shared-budget,
   passive-work and mirror checks. A successful isolated tackle cannot excuse
   worsening jam or movement behavior.
3. **Resolve live divergence and show film.** Replay the first divergent
   QB-wrap, no-grasp and strong/heavy jam intervals. Separate identical-command
   physics probes from closed-loop technique runs. Localize onset, slipping,
   support transfer and fall transitions; use persistent/warm-started rows or
   local refinement only when the trace warrants them. Export labeled before/
   after football clips and run a small same-seed game guard before promotion.

The first increment must live in `World`, not another unused backend. It may
borrow well-tested prototype algebra, but should have one selector and a narrow
integration surface. The research kernels remain isolated references; do not
add more parallel physics implementations while these gates are open.

After a candidate earns promotion, retire obsolete experimental World branches
rather than maintaining every combination indefinitely. Historical commits and
pinned reports preserve reproducibility. Keep one supported production path and
one narrowly scoped candidate while developing the replacement.

## Acceptance and stopping rules

- **Force and geometry:** achieved points remain reachable; stationary plants
  do not advect with the body; controlled weak/medium/strong holds oppose the
  same step progressively. A grip with zero transmitted force cannot impose
  physical recovery restriction. Ordinary successful tackles survive.
- **Generalization:** one mass/strength/traction/balance profile works across
  all five mechanical tasks and real-technique scenarios. No hidden per-task
  strength bonus, capacity increase or tuning to points/yardage.
- **Numerical behavior:** native hand fall disagreements and trajectory error
  improve together without the current jam regression. Compare 6/12/24/48
  subdivisions and the existing refined hand reference. Preserve mirror and
  slot-swap results. Near-threshold cases may be sensitive; identify the margin
  instead of demanding arbitrary bit-exact outcomes or hiding rejected cases.
- **Cost:** measure repeated paired 22-player runs on the same host, reporting
  CPU per player/tick, contact-island iterations and tail costs. Alternate run
  order after warmup. A provisional engineering budget is at most 10% median
  CPU overhead and 20% p95 World-tick overhead; these are proposed cost limits,
  not measurements. Normalize for changed snap counts. Single standalone
  research timings cannot establish a football speedup; no global resolution
  increase is planned.
- **Football behavior:** the same model must show sensible yielding/anchoring,
  progressive hold failure, sideways absorption, finite stop/turn and recovery.
  Film should expose achieved plants and force paths. Keep assignment, pursuit
  and approach-controller defects separate from the body's capabilities.

Use existing BDB movement references next: a small fixed development/reserved
subset covering acceleration, stopping, curved/cut paths and OL pull paths.
The existing 888-path panel already distinguishes physical-profile mapping
from controller response. It does not validate observed backpedal orientation
or OL dummy contact. Compare conditional distributions by role, speed and
measured body; retain generated-roster variation. AddBiomechanics helps bound
support timing and recovery assumptions, but cannot calibrate NFL grip strength
or padded contact loads. No new giant dataset is needed for this decision.

Do not use points per game as the physics acceptance criterion. Pocket
displacement while engaged, contact/approach speeds, braking distance, load
duration, falls and yards after first contact are closer to the mechanisms.
Coverage, route choice, tackle intention and playcalling can still produce
explosives with correct physics.

**Resume additional physical detail only after a retained football case fails
this simpler model for a demonstrated mechanical reason.** Define the missing
observable, compare a minimal extension, and retain it only if it improves
transfer and cost remains acceptable. Foot inertia or dynamic vertical support
could eventually earn that place; they have not earned prerequisite status.

The practical readiness point is when changing techniques and decisions
explains most remaining errors, while bodies consistently obey their reachable
movement and contact limits across the shared scenario set. There is no honest
percentage of “all possible physics gains” to certify. We can make a useful,
stable football foundation without completing a biomechanics simulator.
