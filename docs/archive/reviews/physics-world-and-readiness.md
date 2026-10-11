# Physics world, readiness pack and next physics research

Latest follow-up: [contact height, press hands and physics readiness](contact-height-press-and-physics-readiness.md).
It updates height/support geometry, press contact, the 12–16-substep decision
and paired football evidence. Read it first; this document records the earlier
single-world implementation and its original next-work list.

Branch `claude/engine-priorities`. Commits `6ec7a81` (physics world
integrated into play simulation), `d6474ef` (teammate spacing, in-game burst
matched to tracking), and the commit that adds this document (inelastic
contacts, exact support integration, readiness scenario pack, mirror fix).

**Status: NOT READY.** The owner asked for an explicit OK only when the
physics is very good. The physical contracts now hold and are tested. Transfer to
football outcomes is still clearly short in several places, listed below.
Football concepts (coverage, play pool, pressure packages) stay frozen until
the physics passes. Earlier edits touched coverage tests only to keep them
valid after physics changes.

## What the engine now is

- **One physics world** (`src/physics/world.ts`) moves every body.
  - **Free movement:** the gait is planned once per 20 Hz tick, exactly as
    the calibrated integrator does. A lone body moves bit-exactly at any
    substep count.
  - **Contact islands:** bodies near others, held, or struck share 6–16
    adaptive substeps.
  - **Torso contacts:** swept time-of-impact detection, a speculative guard,
    compliant contact with Coulomb friction and spin.
  - **Relax pass (new):** a velocity-only pass like Box2D v3's. Collisions
    are inelastic and step-independent, and pushing an overlap apart adds no
    energy.
  - **Joints:** hand joints for blocks (bounded push, hold and steer). Grasp
    joints for tackles have a bounded grip.
    - A slipping grip slides down to the legs.
    - A holder pulled off his feet hangs on, stretched along the ground.
    - A leg hold makes the held foot move with the holder, so the body runs
      on past it (trips).
  - **Strikes and drops:** a strike is the tackler's last step into the
    carrier: extra velocity delivered within traction. If it meets nothing,
    he is overextended. A drop is a dive with no launch.
  - **Accounting:** every ground impulse and its work is recorded. Total
    momentum changes only through them.
- **Body-owned support** (`src/physics/support.ts`), a capture-point model.
  - Impacts beyond what the feet can follow, overextension, held feet and
    overspeed all displace it.
  - Gravity diverges it beyond the base; stepping recovers it after a
    latency. Falls, time down and getting up are physical, and nothing
    resets them.
  - The 40 ms gait filter and the divergence are now integrated exactly per
    substep.
- **Free-movement envelope fix** (`src/physics/kinematics.ts`). The friction
  ellipse used the speed-up control law as its axis, which choked lateral
  acceleration whenever a player eased to a moderate speed. It now uses the
  legs' capability and heads straight for the wanted velocity.
- **In-game burst:** `GAME_BURST` went from 1.75 to 2.2, matched to 2022–23
  NGS tracking for free-running positions.
- **Teammate spacing** (`src/sim/spacing.ts`): players do not plan to close
  on a teammate faster than they could absorb the contact. Offensive-line
  falls came mostly from teammates crashing into each other in the pocket.
- **Techniques on the world:**
  - Tackles create grasp joints. The finish depends on geometry: drive
    through when in front of the carrier; run with him and drop the weight
    when beside or behind.
  - Open-field approaches use constant-bearing interception, the strategy
    people use to intercept on foot.
  - Blocks run through hand joints and intents.
- **Mirror symmetry fix:** pursuit leverage now fades out at mid-field, so a
  play and its mirror image are played the same way.

## Evidence (all reproducible; outputs in `data/reviews/physics-world/`)

| Check | Result |
|---|---|
| `npm test` / typecheck / build | 224 / 224 pass; typecheck and build clean |
| World contracts (`test/world-physics.test.ts`) | Free-movement exactness. Momentum = ground impulse. Passive energy never rises. Rotation and mirror invariant. Swept fast crossings, tick-phase detection. Bounded crowded pile. Inelastic hits (same Δv at 6/12/48 substeps). Convergence vs 128-substep reference |
| Grasp/strike/drop (`test/grasp-world.test.ts`) | Passive hold within grip, no reel-in without arm work, reach break, slide-to-legs, ground stretch, rotation invariance, strike within traction, strike into air overextends, drop has no launch |
| Scenario pack (`src/lab/scenarios.ts`, `scripts/scenario-pack.ts`, `test/scenario-pack.test.ts`) | All 6 interactions × variations × both field sides: momentum residual ≤ 8e-13 kg·yd/s, mirror difference ≤ 1.4e-13, max overlap 0.028 yd, all finite (`scenario-pack.json`) |
| Interaction probes (`scripts/interaction-readiness.ts`) | Grasp momentum error 5e-14. No kinetic energy beyond ground work. 0 support resets. Head-on crossings detected; 0 pass-throughs (`interaction-readiness.json`) |
| Substep convergence of outcomes (`scripts/diag/pack-converge.ts`) | Tackles converge (end spot within 0.05 yd from 12 to 48 substeps). Side-hit peak deviation error at 6 substeps fell from 18% to ~3–5% after the relax pass. **Pass-rush redirect converges slowly:** closest approach 3.24 / 2.64 / 2.25 / 2.13 yd at 6/12/24/48 |
| Tracking (`kinematics-compare.txt`, 4 games vs 2022–23 NGS) | Pre-throw max accel p50, sim vs NFL: WR 5.28/5.04, TE 4.61/4.58, RB 4.35/4.55, LB 3.80/3.95, CB 4.39/3.8, S 4.04/3.41. WR max speed 14.3/17.4 vs 14.05/17.1 mph. Pocket depth 2.5 s 4.44 vs 4.55. **DL speed at 0.5 s 2.06 vs 1.68. DL run-play max accel 5.11 vs 3.28. Run yards before first contact median −0.25 vs 0.57** |
| 8-game calibration (`calibration-8games.txt`) | Points 33.8 (21–23.5). YAC 10.1 (4.8–5.6). Missed+broken tackles 0.31/play (0.11–0.16). Penalties 8.1 (2.5–4). Sack 6.0% OK. Completion 64.5% OK. Single league: about ±3 points of noise between runs |

Before the world, the old default engine scored about 30 points/team-game, but
its tackle was a probability plus an instant momentum merge. The first
integration of the world reached 81 points/team-game. The fixes in this pass
brought it to 32–35.

## Gates (from the readiness reviews)

| Gate | Status | What is left |
|---|---|---|
| Contact-transition momentum/work accounting | **Pass** | Keep the per-tick check in every new scenario |
| Graded bounded contact | **Pass (mechanics)** | Grip/hand limits are assumptions; see research 4 |
| Body-owned support, finite recovery | **Pass (mechanics)** | Posture barely changes balance under a hit (LIP cancels it); see 1 |
| Shared traction | **Pass** | Lean, gait, strike and push share one budget; linemen often traction-capped |
| Fast/crowded encounters | **Pass** | — |
| Angular/height/contact geometry | **Open** | Contact height not modeled. Hits act at the COM. Pad-level leverage is a heuristic. See 1 |
| Transfer across the six interactions | **Partial** | Pack runs, contracts hold, outcome expectations still loose. Press release is still a skill roll followed by a strike, not a hand joint. See 3 |
| Temporal stability | **Partial** | World and impulsive interactions converge. Sustained hand fights under 20 Hz technique converge slowly; see 2 |
| Football transfer | **Fail** | Tackling, run-game first contact, holding and DL get-off; see 5–8 |

## Next physics work, in order

1. **Contact height (angular geometry).** Every contact is a horizontal
   impulse at the COM. A hit above someone's COM should tip him in the
   push direction. A hold or hit below it trips him. This generalizes the
   existing leg-trip term: Δξ = (J/m)·(z_c − h)·h/k²/ω0, where z_c is the
   contact height. Take z_c from the lower player's pad height (a function
   of posture), so the lower man wins.
   - Apply it only to the *unbalanced* part of the load. The existing lean
     balances steady pushes; otherwise every sustained block topples.
   - Then retire the heuristic `LEVERAGE_GAIN`/`STAND_UP`.
   - Test with the side-hit scenario: posture should change the peak
     substantially (today 0.55 vs 0.51). Low tackles should trip; high hits
     on low runners should do less.
2. **Closed-loop convergence of hand fights.** The bare-world hand fight
   converges (`scripts/diag/world-hands-converge.ts`). The redirect diverges
   because the 20 Hz blocking technique reacts to slightly different
   tangential forces. Options:
   - Raise `MIN_SUBSTEPS` to 12. Measured cost: 7.5 to 8.9 s/game; it
     halves the error.
   - Reduce the first-order error in the lean, felt-load and hand-steer
     coupling (look at `PUSH_GROWTH` and the felt-load filter inside the
     substep loop).

   Decide using the pack's convergence table, and document the accuracy
   and cost before choosing.
3. **Press release on a hand joint.** In `receiver.ts handleRelease`, a
   score decides the outcome and then a strike is applied. Instead, the
   corner's punch should acquire a hand joint (bounded push and hold). The
   receiver's release (feet, swipe or rip) should defeat or slip it through
   the physics, and the jam outcome should come from loads and footing.
   The pack's `release` scenario is ready for this; today it rarely jams.
4. **Grip and hand-force magnitudes.** These are assumptions:
   - grip ≈ arm force·(0.3 + 2.5q²); hand push = arm force share;
   - traction μ = 1.1;
   - stepping speed 2.3–4.8 yd/s; base radius 0.11–0.2 yd.

   Look for biomechanics sources: tackling force plates, grip strength,
   lateral perturbation recovery in athletes, padded-collision restitution.
   Record them in `data/sources.json`.
5. **Tackling transfer.** Broken holds are mostly arm grabs at high
   *tangential* relative speed (6–10 yd/s): tacklers arriving behind or
   across the runner (`scripts/diag/grasp-audit.ts`,
   `broken-hold-trace.ts`). The physics is behaving correctly. Two fixes:
   - Attempt policy: the tackler should estimate from what he perceives
     whether his grip could stop the relative motion within the slack.
     Reaching anyway is a desperation choice, not the default.
   - Approach angles: `pursuitPoint` deliberately aims behind for poor
     pursuers; check this against tracking.

   The BDB 2024 tackling data (tackle geometry and contact-to-down) is the
   right reference; raw data is not in the repo.
6. **Run first contact and line push.**
   - Tracking-style yards before first contact: median −0.25 vs NFL 0.57.
     Defensive linemen win the initial push: in the run rep lab
     (`scripts/diag/rep-lab.ts`) they displace the blocker about 1.3 yd.
   - DL get off too fast: 2.06 vs 1.68 yd/s at 0.5 s; the p10 depth at
     1.0 s is +0.10 vs −0.58. The rush behaviors command a sprint at the
     snap.
   - Investigate the snap-count advantage (offense moves first), the get-off
     command speed, the pad-level leverage at the first collision, and
     double-team mass.
7. **Holding.** Holding is rolled once per "beat", and run plays produce
   about 3.5 beats each because short blocks keep re-forming. Make holding
   observable instead: a hold that actually restrains a defender who has
   won leverage (grip load plus his displacement).
8. **Movement control law.** Speeding up is effort-proportional:
   (cap − v)/τ. Moderate speeds therefore come slowly and routes develop
   late. A quick level-off was tried and reverted: with the current
   behaviors it pushed accelerations above tracking and moved handoff,
   time-to-line and pocket depth away from it. Revisit together with
   behavior tempos.
   - Also add a vector-acceleration measure to
     `scripts/kinematics-compare.ts`. NGS `a` is probably the magnitude of
     the acceleration vector, while the sim measures d|v|/dt.

## How to test and implement

- **Order of evidence:** a physical contract first, then the scenario pack,
  then tracking comparisons, then game calibration last. Never accept a game
  number that needs a contract broken.
  - A new mechanism needs: a world-level test (`test/world-physics.test.ts`
    or `test/grasp-world.test.ts`); its effect in the pack; mirror and
    substep checks.
- **Commands:**
  ```sh
  npm test && npm run typecheck && npm run build
  node --import tsx scripts/scenario-pack.ts out/scenario-pack.json   # six interactions, invariants, mirror
  node --import tsx scripts/diag/pack-converge.ts                     # outcomes vs substeps
  node --import tsx scripts/interaction-readiness.ts out/ir.json       # contract probes
  node --import tsx scripts/kinematics-compare.ts 4 5                  # vs 2022-23 tracking
  node --import tsx scripts/diag/open-field-lab.ts 60 front|trail|two  # tackling labs
  node --import tsx scripts/diag/rep-lab.ts 40 run|pass [driveY]       # block reps
  node --import tsx scripts/calibrate.ts 8                             # game guard (noisy)
  ```
- **Diagnostics:** in `scripts/diag/`:

  | Script | What it shows |
  |---|---|
  | `grasp-audit.ts` | Holds by origin and geometry |
  | `broken-hold-trace.ts` | Approaches to holds that broke |
  | `yac-anatomy.ts` | Catch to contact to down |
  | `line-accel.ts`, `line-peaks.ts` | Where linemen's accelerations come from |
  | `block-anatomy.ts` | How engagements start and end |
  | `ol-falls.ts` | Traces before linemen fall |
  | `of-trace.ts`, `drag-trace.ts` | Single tackles |
  | `world-hit-converge.ts`, `world-hands-converge.ts` | Bare-world convergence |
  | `time-games.ts` | Cost |
- **Rules that held up:**
  - Change one thing at a time and A/B it with fixed seeds. One 8-game
    league moves about ±3 points/team-game.
  - Trace a failing case tick by tick before changing anything. Every real
    bug in this pass came out of a trace:
    - the ellipse choke
    - stale ground impulses
    - mid-field leverage asymmetry
    - teammate collisions
    - restitution changing with the substep
  - No outcome multipliers. No time-based rules unless the real thing is
    timed. Players should act on what they perceive.
- **Housekeeping:** the backup branch `claude/physics-world-wip` is
  superseded by these commits. The git proxy refused to delete it; it is
  safe to delete on GitHub. PR #1 is untouched.
