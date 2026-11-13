# Physics development

The current process is in [validation](VALIDATION.md), with the live model and
next work in [status](STATUS.md). These replace the chronological reading chain.

Keep the reduced shared World. Prove physical laws and cross-interaction
transfer; distinguish a bad movement request from an incoherent response.
Add physical detail only when a demonstrated mechanism requires it.

The [previous guide](archive/plans/PHYSICS_DEVELOPMENT.md) remains historical.

## Reviewing proposed physical detail

The user's [reduced-model review](references/reduced-physics-design-review.md)
argues for a football brain controlling a simple, constrained body. That is
the right direction. Its feasibility ratings are opinions, not measured costs
or proof that its proposed feet and hands are necessary. This code assessment
uses `96bf698`; later engine changes require another check.

| Proposal | What is already live | What remains unproved |
| --- | --- | --- |
| Bracing and recovery | Capture-point support, posture, finite recovery latency/speed, support-limited movement and timed falls. | Ordinary support has no left/right plants or stance-oriented base. A repeated failure must depend on that missing geometry before we expand it. |
| Physical rotation | Angular velocity, inertia/traction-limited turns, torso-friction yaw and rotational work. | Hands have no lateral attachment points and do not directly produce shoulder torque. Adding physical yaw from scratch would duplicate existing work. |
| Independent hands | Each run helper earns his own contact control; promotion preserves the keeper's joint. | This is independence between blockers, not two hands on each blocker. Contact acquisition and hand recovery remain reduced approximations. |
| Uncertain execution | Movement and force remain bounded; pass moves still need achieved corner clearance. | Move-success draws can change hand-clearance windows, and run shedding can directly disengage. Those abstractions need causal scrutiny, not an automatic conversion to a larger solver. |

Keep responsibility, acquired evidence, technique request and achieved contact
separate. Do not assume an intelligent target makes a physical approach
possible, or that nearby bodies imply secure hands. Diagnose the first wrong
read/request/response before adding a new physical state.

Two small studies could justify extensions later:

- **Directional support:** find a plausible request that fails specifically
  because planted-foot side, stance direction or finite placement is absent.
  Compare a directional base or one effective support placement with explicit
  bilateral feet. Do not add gait phases merely to draw better-looking steps.
- **Shoulder control:** find a repeatable asymmetric-contact failure. Compare
  the existing joint, one off-center effective contact and two contacts. Keep
  the total arm/ground/work budgets fixed; include mirrored loads, one-contact
  loss, out-of-reach and recovering-base cases. Additional contacts must earn
  their cost through a case the simpler contact cannot explain.

Off-center hands require attachment velocity, angular effective mass and
rotational work in the solve. Adding torque afterward would not establish
physical coherence. Check timestep refinement, shared capacities, unaffected
football cases and runtime before adopting an extension. NFL position tracking
does not identify the hand forces or foot pressures that caused a trajectory.

The [current OL review](reviews/ol-interactions.md) now distinguishes one proven
law gap from hypothetical anatomical detail. The isolated hand audit conserves
linear momentum and work but loses angular momentum under tangential restraint,
without ground reaction or body spin. Refinement does not remove that defect.
Use `scripts/diag/hand-angular-law.ts --assert-law` as the independent oracle;
it currently fails, explicitly. A common contact patch must couple force and
moment in the same solve before richer shoulder-control techniques are built.

Keep the reduced World and the priorities in [status](STATUS.md): coherent
angular transfer, achieved climber contact and attainable tackle approaches.
Outside-zone lateral technique is being studied separately. The combination
and solo-drive recovery repairs demonstrate useful gains without additional
degrees of freedom; they do not excuse the shared contact-law gap or establish
that foot/hand extensions will never be useful.
