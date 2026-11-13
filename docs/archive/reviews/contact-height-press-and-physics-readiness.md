# Contact height, bounded press hands and physics readiness

Historical evidence. The [current handoff](snap-mesh-pull-and-nfl-movement.md)
updates snap response, exchanges, puller approach, NFL utilization and the
owner's ordered next priorities. Preserve the unresolved failures below.

**Status: NOT READY.** Continue physics work on `claude/engine-priorities`.
This follows `627964cc44f6c6829d04898ebd7a563b26dc12d7`; the measurements below
identify the final engine source in `data/reviews/physics-world/contact-height/manifest.json`.
Do not merge or push PR #1 without the owner's approval. Football concepts,
coverage families, play selection and full QB mechanics were not expanded.

## Start here

Read this status, the mechanism and measurement limits below, then the ordered
next work. The previous [physics-world handoff](physics-world-and-readiness.md)
explains the single-world architecture. It remains valid background; this
review updates contact height, press release and the resolution decision.

The owner wants an explicit OK only when the underlying physics is very good.
Passing contracts for one part of the model is not that OK. This engine remains
a planar body simulation with reduced height/support geometry, not a full
3D rigid-body or skeletal simulation.

## Development process

Use [PHYSICS_DEVELOPMENT.md](../plans/PHYSICS_DEVELOPMENT.md) for the shared-body
philosophy and five test layers. This pass traces load/lean behavior before
changing the world; checks controlled contacts, symmetry and real techniques;
then reads tracking and whole games as guards. Press comparisons hold bodies
fixed while changing hand-control skill, and use physics limits rather than
win rolls. The default suite remains about 31 seconds. Expanded resolution
and roster sweeps remain probes outside it. Reviewed summaries are under
`data/reviews/physics-world/`; raw experiments remain in ignored `out/`.

The guide's lower-man directional test needs vertical leverage/posture physics
before it can be asserted universally. Current horizontal height/support
geometry is partial; making the test pass through a force bonus would violate
the same guide. Contact-height and hand-speed constants remain explicitly
unvalidated physical proxies, with source/measurement limits in the evidence
review. Add tests for the listed remaining mechanics together with their fixes.

## What changed

- **Contact height affects support.** Torso contacts use a common pad height;
  hands and grasps can specify their contact height. The same pair impulse
  still changes linear velocity. Its moment above/below each COM produces a
  reduced pitch/roll contribution to body-owned capture-point deviation.
  Low grips retain held-foot restrictions as well as the height moment.
- **Steady pressure can be braced.** Applied lean balances the settled load;
  ankle/hip control has a bounded `weight × base radius` moment budget. A
  cancelled COM acceleration alone does not erase the contact moment.
  Brief impacts still disturb balance. This is an active support reduction,
  not a 3D torque solver with rotational energy accounting.
- **Removed pad-level outcome heuristics.** The lower body no longer receives
  a direct force multiplier or stands up its opponent by `STAND_UP`.
  Height, COM, base size and support availability now explain the difference.
  Horizontal geometry alone cannot establish that the lower man always wins.
- **Motion sensing continues while down.** The acceleration and tipping
  filters used to freeze during a fall. They now follow physical motion while
  down/rising, so a player does not receive the old impact again on getting up.
- **Press uses real hands.** A reachable, facing, upright corner acquires a
  bounded hand joint. A palm jam pushes/steers without a jersey tether;
  relative motion and finite hand placement/swiping/re-gripping let it slip.
  The receiver moves around a shoulder through the normal movement solver.
  A jam event requires actual measured joint force. Ball transitions clear
  only the press controller's joint, including wrapped ball-tracking behavior.
  This replaces the random jam win/strike and direct balance manipulation.
- **Contact islands use 12–16 adaptive substeps.** Free movement keeps its
  exact tick plan. The [convergence audit](hand-fight-convergence.md) records
  accuracy, cost, rejected experiments and the remaining threshold disagreement.

The neutral yaw and inelastic-hit fixtures now isolate a moderate collision
from the separate fall response. The pass-drive fixture now establishes a real
force advantage: doubling an end's strength can still leave him traction-capped
below a heavier tackle. Restoring an old displacement expectation with a power
bonus would have hidden that physical limit.

## Evidence and its limits

Final source hash:
`6368ce73ec217e52860d34533d9de102b028725b23688735c5f0b58aace472c5`.

| Check | Result |
|---|---|
| Tests / typecheck / build | 244 / 244 pass; typecheck and build clean. Final suite run without overlapping game panels exits successfully. |
| Prescribed height pulses | Same 0.8 yd/s velocity change at COM, ±0.3 yd; opposite tipping direction; linear momentum residual zero; rotation/mirror agree; 12-to-48-step deviation difference <0.004 yd. These are **active prescribed stimuli**, not passive energy tests. |
| Sustained hand pressure | Five seconds at two postures, 6/12/24/48 steps: no falls, zero momentum residual. No endless accumulation of steady tipping load. |
| Six-interaction pack | All finite; maximum momentum residual 1.3e-12 kg yd/s; maximum overlap 0.014 yd. This validates accounting and geometry, not the football outcome of every fixture. |
| Press/control pairs | Five roster seeds × both sides × 6/12/24 steps. At 12 steps the jam costs 0.20–0.62 yd of route depth at 1.2 s; carries load for 0.25–0.50 s. Tick-mean peak force 270–539 kg yd/s². Mirror error <3e-11 yd; coarse/fine depth/reroute difference <0.016 yd. |
| Hand-fight convergence | Against 192 steps, mean closest-approach error 0.196/0.127 yd at 6/12; worst 0.575/0.323. Corner disagreements 2/9 → 0/9; **one fall disagreement remains**. |
| Cost | Isolated paired snapshot probe: ~15% more CPU/play at minimum 12; repeat ~6%. These are measured guards, not a universal runtime guarantee. |

The stationary-corner press/control experiment leaves ordinary torso contact
active in both arms/no-arms conditions. It isolates hand contact, not all
receiver/corner collision effects. Palm speeds and force mapping remain
assumptions. The route prediction ghost still does not predict future opponent
contacts. NFL press effectiveness/frequency is not validated by these fixtures.

A low stance improves the neutral planted hit and sustained-pressure fixtures,
but does **not** universally improve the football side-hit fixture. At the
six-yd/s side hit, peak fall-threshold fraction is 0.584 upright versus 0.621 low.
Both stay up and recover in 0.35 s. This exposes coupled movement/support
behavior that still needs validation; do not tune a posture multiplier to make
all examples tell the same story.

### Paired football guards

32 games at seed 7 over four independently generated eight-team leagues,
using unchanged measurement code at both revisions. This is a football guard,
not an isolated attribution to any one mechanism.

| Metric | `627964c` | Final | Reference |
|---|---:|---:|---:|
| Points / team-game | 36.22 | 34.69 | 21–23.5 |
| YAC / reception | 9.82 | 8.87 | 4.8–5.6 |
| Rush yards / carry | 3.93 | 3.92 | 4.1–4.5 |
| Run stuff rate | 24.95% | 23.24% | 16–20% |
| Game run yards before contact | 0.43 | 0.86 | 1.5–2.3 |
| Sack rate / dropback | 7.06% | 6.75% | 6–7.5% |
| Interception rate | 6.86% | 7.76% | 2–2.5% |
| Missed + broken tackles / play | 0.29 | 0.27 | 0.11–0.16 |
| Penalties / team-game | 8.72 | 8.50 | 2.5–4 |

There are 4,009 baseline versus 4,131 final scrimmage plays. The final panel
has two ties. The range of points across leagues remains broad, so the modest
points reduction does not establish accuracy. Interceptions regress; YAC,
tackling, stuff rate and penalties remain excessive. Run contact improves
without materially improving overall YPC. The first eight-game development
panel overshot rushing efficiency; the larger paired panel is the published
guard and should take precedence. Do not tune outcomes to the eight-game result.

Tracking-style measurements use four games at seed 5 with the same generated
team pairs. Run first-contact mean improves **0.13 → 0.83 yd** against **1.16**
in the NFL; median **−0.25 → 0.10** against **0.57**. DL get-off remains too
fast: median speed at 0.5 s **2.06 yd/s**, NFL **1.68**. DL run acceleration
also remains excessive. Pocket depth at 2.5 s moves **4.44 → 4.16 yd** against
**4.55**: that regresses. Those outcomes cannot be certified from the mechanical
contracts. Tracking contact definitions and game-contact metrics differ;
compare each to its matching cohort, not to the other script's denominator.

## AddBiomechanics and physical parameter evidence

The [evidence review](../../references/physical-contact-evidence.md) verifies the
AddBiomechanics Dataset 1.0 catalog, CC BY 4.0, reader, source studies and
proposed small subsets. `data/sources.json` makes them accessible to other
repository collaborators. **No subject files were downloaded or parameters
fitted from them.** Start with a few Hamner running subjects and Moore treadmill
perturbation subjects, filtering missing/invalid force measurements and
recording actual trial residuals and provenance.

This can constrain COM/posture, segment inertia, foot placement, ground-force
impulses and recovery mechanics. Joint torques/COM are derived estimates. It
does not supply football grip forces, jersey friction or padded collisions.
Measured ground-force ratios show demanded traction, not maximum cleat grip.
The grip/squat study also cautions against deriving arm grip directly from leg
power. Keep current force/grip, turf, recovery latency and pad/inertia constants
labelled as assumptions until measured against an appropriate cohort.

## What still prevents the owner's OK

1. **Active technique force/work budgets.** `World.strike` still accepts
   instantaneous internal impulse requests from trench techniques. Equal and
   opposite forces preserve momentum, but do not by themselves bound muscular
   work. Audit reach, finite arm-force duration, shared force capacity and
   active work accounting. Include commanded foot yaw: its angular acceleration
   is response-limited, but ground yaw torque/work is not in the current ledger.
   Hand normal/steering limits also need a shared arm-capacity check.
   The passive-contact tests do not certify all active
   techniques or account for full rotational/vertical energy.
2. **The coupled hand-fight solver.** Trace the seed-3/power-1 near-QB encounter:
   QB falls at 6–48 steps, rusher at 96/192. Improve load/lean/constraint
   integration without changing the high-resolution solution to hit a game
   target. Raising the floor reduced error; it did not solve this seam.
3. **Tackle approach and grasp feasibility.** High tangential-speed arm grabs
   still often slip. Use perceived closing motion, reachable footing and grip
   capacity to choose an achievable approach rather than accepting a reach by
   default. Validate using actual tackle geometry/contact-to-down data.
4. **Run first push and physical posture.** First contact improves but is
   still early; get-off remains excessive. Isolate offense snap advantage,
   attainable ground force, contact height and double-team load sharing before
   changing any run outcome distribution. Standing a blocker up requires
   vertical forces/joint posture beyond the current planar moment reduction.
5. **Holding from observable restraint.** Holding remains a roll on a beat,
   with repeated short engagements producing too many penalties. It should
   follow an actual tensile hold against a defender who has won position.
6. **Parameter and transfer validation.** Grip is still tied to arm/leg power;
   pad height and pitch inertia are assumed; downed torso geometry remains
   compact. Measure movement/support from the proposed small biomechanics
   subset, then cross-check all six interactions and NFL tracking. Do not
   expand specialized moves until these mechanics support them reliably.

## Reproduce

```sh
npm test
npm run typecheck
npm run build
node --import tsx scripts/contact-height-lab.ts out/height.json
node --import tsx scripts/press-contact-lab.ts out/press.json
node --import tsx scripts/scenario-pack.ts out/pack.json
node --import tsx scripts/diag/hand-convergence.ts out/convergence.json
node --import tsx scripts/interaction-readiness.ts out/readiness.json
node --import tsx scripts/kinematics-compare.ts 4 5
node --import tsx scripts/calibrate.ts 32 7 4
```

Use Node 22. Run the full test suite without simultaneous long game panels:
all 244 assertions passed during the overloaded first check, but Vitest's worker
shutdown timed out. The clean rerun is recorded in the final evidence. Baseline
source was archived from `627964c`; the manifest pins scripts, references,
commands and artifacts. The film room is regenerated from the same final source;
report its source version with a play ID because new physics changes game paths.
