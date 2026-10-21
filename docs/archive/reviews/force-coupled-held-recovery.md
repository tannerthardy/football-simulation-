# Smaller live recovery model

## Decision and implementation

Keep the existing planar bodies, posture, capture-point balance, bounded
traction and hand/grip constraints. Production now solves corrective recovery
against a lower-body hold through one massless effective support coordinate.
It creates that coordinate only for a valid low hold, retains it through the
connected hold lifetime, and retires it after the last hold releases.
Ordinary gait, blocking and jams continue to use analytic recovery. No new
global physics mode, anatomical gait cycle, inertial foot or 3D solver was added.
The existing `supportModel: 'legacy'` API name now selects this improved default;
historical comparisons require their pinned source, not that label alone.

The former geometric `feetLock` penalty could restrict recovery under a
positive-capacity grip that transmitted **zero impulse**. Removing it alone
failed ordinary frontal tackles: 12/12 successful cases became 0/12. The
replacement keeps the missing physical interaction: attempted recovery loads
the grip, its bounded reaction acts on both bodies, and achieved corrective
motion affects balance. Stronger actual restraint progressively opposes
recovery. Existing ground/leg/arm capacities and work accounting are shared;
there is no separate tackle-strength multiplier or final tackle outcome roll.

Free and held recovery use the same analytic base-crossing calculation. Only
the solved velocity perturbation changes the held result. This also fixes a
weak-hold discontinuity: creating a motor record previously stopped normal
inside-base damping. Zero-capacity and unreachable holds are released before
they transmit force or reserve recovery effort.

Each low attachment uses `point = COM + share * correction + reference`.
When a hold slides down, its reference changes to preserve the physical point;
when another holder joins, it binds at the acquired point. Velocity and row
mobility use the same share. Duplicate claims cannot create extra grip or motor
capacity. Getting up cannot reset a coordinate still held by someone else.

Only the **actual held attachment offset** has a finite validity range, using
the existing fixed profile COM-height proxy. Beyond that range, the attachment
releases. If the common correction chart accumulates more than that range while
the attachment remains reachable, change coordinates: `q'=0, r'=r+share*q`.
This preserves every surviving world attachment, velocity, motor and balance
state; a small leg share cannot pop merely because the chart traveled farther.
Positions and velocities are never physically clamped. This is an effective
contact-range assumption, not an anatomical leg measurement. A native interval
can overshoot before release. `maxHeldRecoveryExcursion` records the chart before
rebasing, **not** anatomical foot displacement; `lowerHoldReleases` counts only
actual attachment range losses. Balance consumes the just-solved force
**before** cleanup, so a breaking hold retains its final physical effect.

## Evidence

The source-pinned reports, paired game guard, cost measurements and exact
cohorts are in [the evidence directory](../../../data/reviews/physics-world/held-recovery/README.md).
Read `results.json` for the numerical comparison. It retains adverse results,
not just improved counts. Supporting probes include:

- Five shared-capability tasks: anchor, double drive, shed, absorb and jam;
  four profile variants, both mirrors, three resolutions.
- Nine real-technique hand-fight cases at six resolutions and ordinary frontal
  tackles at each resolution. The refined solver is a convergence reference,
  not empirical football truth.
- Weak/medium/strong stationary-start recovery and duplicate grips, including
  the vanishing-force limit, force/work budgets and momentum.
- Six full-state inspection clips with the existing football controllers.
- Two games with identical generated rosters and seed streams, excluding a
  warm game. Game histories can diverge after small physical changes; this is
  a regression guard, not a representative NFL cohort.
- Warmed matched-input 22-body cost probes. The multi-grip stress fixture has
  four simultaneously restrained bodies and eight low grips; distinguish its
  cost from ordinary unheld movement and trench contact.

Twelve new tests cover progressive actual resistance, unusable holds,
vanishing-force continuity, shared budgets, duplicate claims, attachment
transitions, ordinary unheld movement, retirement, reach validity, standing up
while held, consuming the last interval's solved recovery before release, and
chart rebasing without moving a reachable small-share attachment.

The initial timing experiment retained hundreds of newly allocated Worlds
without controlling collection. CPU time included allocation-related background
collection and cannot isolate solver overhead. The retained final benchmark
uses `--expose-gc`, completes fixture collection before timed blocks, excludes
construction, and compares one tick from identical fresh 22-body states. Keep
both CPU and median/p95 wall timing; neither makes full-game histories identical.
Both cost processes use benchmark-only warmup. Mixing game-warmed and
fixture-warmed processes gives a different JIT history and a misleading cost.

## Results and cost decision

The candidate source is `43ff53ab75d3deb3d6570ea067fd82265b4c8fc1c21fe0fed547c1031ab49edf`;
the baseline is the production source at `fb3da0a`. All 488 TypeScript tests,
22 Python tests, typecheck, build and the six-clip browser check pass.

| Controlled check | Before | After |
| --- | ---: | ---: |
| Native hand-fight fall disagreements against refined solver | 3/9 | 1/9 |
| Worst hand-fight closest-distance error | 0.822 yd | 0.822 yd |
| Ordinary frontal tackles, six resolutions | 12/12 | 12/12 |
| Scenario-pack approach tackles | 14/24 | 16/24 |
| Shared anchor/drive/shed/absorb/jam rows | 120 | 120, identical |

Weak, medium and strong held-recovery probes now transmit actual impulse and
progressively oppose recovery. Force/work limits hold; the largest game momentum
and planar work residuals are about `1.0e-11` and `6.9e-11` in engine units.
Chart rebasing removed artificial reach losses; the final two-game guard has
two actual lower-attachment range releases. This does not establish empirical
grip strength or complete biomechanical energy accounting.

Matched CPU cost changed by +3.5% in free movement, -5.5% in trench contact,
and **+33.5%** in the simultaneous eight-low-grip stress fixture; its p95 tick
cost rose 34.8%. Ordinary fixtures pass the provisional 10% CPU/20% p95 budget;
the stress fixture fails it. Accept that targeted cost for the repaired coupling,
and profile before spreading the motor to ordinary movement. Separate-process
noise prevents claiming that the trench path became faster.

The two fixed-roster games retain adverse outcomes:

| Game guard, not NFL calibration | Before | After |
| --- | ---: | ---: |
| Missed / broken tackles | 34 / 28 | 29 / 29 |
| Rushing yards per attempt | 2.31 | 1.94 |
| Runs stuffed at zero yards or less | 25.0% | 42.3% |
| Mean run yards after first contact | 2.11 | 1.56 |
| Interceptions per attempt | 5.1% | 7.4% |
| Completions of 20+ yards per attempt | 15.3% | 14.3% |

There are no physical timeouts. These small, diverging game histories do not
isolate causation or justify force fitting. Postcontact rushing response needs
inspection alongside the remaining sustained-contact and pursuit failures.

## Limits and next work

This is a useful live repair, not the owner's final physics-readiness OK.
One averaged corrective coordinate cannot represent two independently planted
feet. Individual grasp force/work paths remain separate, but their recovery
motion shares that coordinate. Do not claim independent-foot restraint from
aggregate cancellation tests.

Recovery uses a frozen direction and phase within one interval. A strong
outward load beginning inside the base can cross outside while that interval
still uses inside damping. Refine that local transition only if a retained
football case needs it. Selective held recovery explicitly reserves leg effort;
analytic unheld recovery represents that effort implicitly. Vanishing-force
stationary continuity is verified, but every moving zero-load situation is not
guaranteed to have identical effort allocation.

Finite-range release can lose a strong grip where a real player might instead
fall. Inspect release counts and short film traces before changing the range;
do not fit it to rushing averages. The worst sustained hand-fight trajectory
error remains a separate problem even if binary fall agreement improves.
Full-game rushing, explosives, broken tackles and interceptions remain mixed
and depend heavily on pursuit, coverage and technique. Score changes alone
cannot validate these physics.

Next: localize the remaining sustained-contact divergence, inspect postcontact
rushing and finite-range releases, and improve tackle approaches/braking within the shared
movement envelope. Retain this small model unless a reproduced football case
shows that two persistent support identities are the simpler solution. Full
inertial/spatial feet remain off the critical path.
