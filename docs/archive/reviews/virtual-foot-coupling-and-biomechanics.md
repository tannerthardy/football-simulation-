# Virtual support coupling and small biomechanics reference

## Status and where to start

**Physics is NOT READY. The new support motor is experimental; the default
world still uses the previous support model.** This pass builds a force/work
coupling that the geometric leg lock could not express, tests it with actual
football controllers, and identifies why it cannot yet be promoted. Do not
interpret experimental convergence or improved pressure rates as readiness.

Work on `claude/engine-priorities`. Read this review alongside
[PHYSICS_DEVELOPMENT.md](../plans/PHYSICS_DEVELOPMENT.md). PR #1 remains separate.
The owner's seven priorities are the working order: virtual support; shared
foot/grip solve; balance from achieved support; local sustained convergence;
executable approach control; a tiny biomechanics subset; cross-situation
validation. The first three are **prototyped, not completed physical footing**.
Priority six has an acquired subset, with important measurement limitations.

Evidence lives in `data/reviews/physics-world/virtual-foot/` and
[the biomechanics reference](../../../data/reviews/biomechanics-support/README.md).
The preceding production repair and its baseline are in
[constraint-support-and-ground-friction.md](constraint-support-and-ground-friction.md).

## What the trace established

The seed-3 QB wrap is sensitive to support, not simply insufficient grip force.
Its first two tick-integrated grip impulses were identical at 12 and 192
substeps, approximately 104.12 and 106.41 kg·yd/s. Legacy geometric restraint
starts firm, then observes the previous substep's slipping flag. The duration
of that first firm interval depends on resolution. The coarse QB peaks below
the fall threshold, while the refined QB falls.

The seed-19 frontal continued-contact failure has **no grasp**. Its first
speculative torso contact differs by about 3.1 ms at 12 and 48 steps; nearly
equal tick-total impulse produces different support history and a safety fall
at the refined resolution. Replaying the same coarse pursuit commands at the
refined resolution retains the disagreement. A new grip formula cannot solve
all sustained failures.

The legacy stationary recovery probe is particularly decisive: initially still
bodies, zero locomotion commands, and a displaced capture point. Valid leg
grips of capacity 1, 50 and 900 transmit **zero** impulse in that scene, yet
geometric restraint affects recovery. There is no calculation of the force
needed to oppose the corrective placement.

## What is implemented experimentally

`new World(bodies, { supportModel: 'virtual-foot' })` selects the candidate.
`PlaySetup` and lab options expose the same explicit research option. Fresh,
restored or reused bodies follow their world's selected model; a foot record
alone cannot silently enable a hybrid. Legacy worlds clear experimental foot
state. Normal games and viewers continue to use the existing default.

Each candidate body owns an **averaged corrective support coordinate**:
anchor, desired next location, requested/achieved corrective velocity, total
external load, active command allocation and mobility. It is not an anatomical
planted sole or articulated leg. Body transport and corrective placement are
separate; the recovery-speed ceiling is not a limit on sprinting world speed.

The quasi-static motor uses the existing leg force and placement-speed bounds:

`B = C / u_max`, `u_achieved = u_requested + F / B`.

Here `C` bounds active motor command, not every passive load a leg can receive.
A stronger external force can backdrive/drag the coordinate. The passive
viscous response is an explicit unvalidated constitutive assumption; no
tissue-load limit or measured NFL force/velocity law is claimed.

Corrective command effort shares the existing stance-drive allowance, and
turning accounts for that reserved effort in its traction budget. A leg grasp
uses one common body-owned motor, while active reel, normal tension and sliding
continue to share the existing grip circle. Identical numerical copies of a
grasp share one compliant attachment, rather than creating extra springs.

The attachment is `body.pos + legsShare * foot.offset`. Reach, separation,
normal, velocity Jacobian and achieved displacement use this same coordinate.
The required impulse includes both COM inverse masses and support mobility.
The spring/damper retains its body-derived stiffness when this effective mass
changes; substituting mass alone would make transmitted force vanish at fine
steps. The holder receives the equal and opposite body impulse and is never
an immovable world anchor.

Signed planar work is decomposed into body work, support-motor work and passive
grip loss. Motor work is evaluated from the **final aggregate impulse of each
physical substep**. Positive numerical guesses inside solver iterations are
not separate muscle actions. An isolated review demonstrated that counting
those guesses changes expenditure when identical rows are duplicated.
Passive grip work remains nonpositive; normal ground and arm ledgers remain
distinct. Reduced pitch/vertical/limb energy is still not closed.

Balance uses achieved corrective placement and actual contact loads. In this
mode geometric `feetLock` no longer lowers the free recovery ceiling or the
locomotion availability threshold. Its reported value describes lost commanded
placement. The low-contact moment is still applied once through the shared
load path; there is no second geometric held-foot travel penalty.

## What the measurements show

The manifest distinguishes the early frozen candidate from the final source
with the model-isolation repair. Candidate mode is recorded separately from
source identity. Physics resolution, force constants and player profiles were
not increased or fitted.

A late default-path guard caught mathematically equivalent rearrangements
changing floating-point rounding and later game histories. The original legacy
operation order is restored. Final eight-game printed metrics and all 1,013
counted plays match the published baseline exactly; the four-game tracking
report matches byte for byte. These are aggregate/report checks, not a claim
that every full-game trajectory was compared. The rejected intermediate runs
remain in the evidence. Final-source hand and shared-task results exactly
match the earlier experimental runs; game evidence retains its original source
pin rather than being relabeled as a fresh final-source run.

| Check | Production baseline | Experimental candidate |
| --- | --- | --- |
| Native hand-fixture fall disagreement versus 192 steps | 3/9 | 0/9 |
| Mean closest-approach error versus 192 steps | 0.208 yd | 0.231 yd |
| Worst closest-approach error | 0.822 yd | 0.822 yd |
| Identical pre-wrap path, QB fall across six resolutions | Disagrees | Upright at all six |
| Frontal 4/7 yd/s tackles across six resolutions | All succeed | All succeed |
| Native frontal/crossing mirrored tackle guards | Pass | Pass |
| Native five-task mean/max position error versus 48 steps | 0.030 / 0.069 yd | 0.129 / 1.323 yd |
| Five-task fall-set disagreements | 0 | 0 |

Stationary-start recovery now transmits progressive grip loads: over 0.4 s,
capacities 1/50/900 deliver about 0.4/20/136.26 kg·yd/s. Weak, medium and strong
holds produce different support response; the strongest case falls. One and
four identical copies preserve motion and motor work. A separate initially
stationary 50 ms check verifies progressively less achieved placement as grip
capacity rises. These are controlled mechanics, not NFL tackle probabilities.

The candidate's remaining shared-task convergence regression is concentrated
in **press/jam**, particularly the stronger and heavier profiles. There are
no leg grasps in those probes: changed support placement and stance allocation
alone cause it. Ordinary tackles surviving does not prove universal transfer.

A separate diagnostic switches the support model **only at the first incoming
grasp**, retaining the exact legacy first-wrap snapshots at 2.35 s. The QB is
then upright at all six resolutions, with peak threshold fractions 0.873–0.877.
This separates the coupling effect from changes in the earlier hand-fight path.
It establishes numerical agreement, not whether that real tackle should succeed.

Eight games, seed 7, two independently generated leagues:

| Guard | Production baseline | Experimental candidate |
| --- | --- | --- |
| Counted scrimmage plays | 1,013 | 998 |
| Points/team-game | 31.06 | 32.44 |
| Sack/dropback rate | 3.11% | 5.75% |
| Missed + broken tackles/play | 0.25 | 0.28 |
| Passing yards/attempt | 9.58 | 9.69 |
| Rushing yards/attempt | 3.81 | 3.75 |
| Yards after catch | 8.40 | 7.42 |

Four-game tracking guard, seed 5: pressure within two yards rises from 24.3%
to 31.7%; pocket depth at 2.5 s falls from 4.17 to 4.06 yd, against the NFL
reference 4.55. Run DL peak acceleration falls from 4.94 to 4.69 yd/s²,
still above 3.28; first-contact rushing distance changes 0.94 to 0.95 yd.
These are small conditional guards with generated rosters, not fitting targets.

Closer pressure/sack averages coexist with a serious geometric failure:
accumulated support offset reaches **3.93 yd in two-second shared tasks**, 6.37
yd in the tracking cohort, and **7.27 yd in the eight-game guard**. A synthetic
direct-state recovery sequence also reproduces the accumulation while the body
remains stationary; it is explicitly not a repeated-impact experiment. This
coordinate cannot be interpreted as a reachable physical foot. The candidate
therefore remains experimental despite closing force/work contracts.

## How the small dataset helps

Four AddBiomechanics core subjects, 12 windows, 5,892 frames and 5,431 valid-force
frames were acquired using about **101 MB**, rather than multi-gigabyte full
Moore files. The committed extractor, exact hashes, attribution and aggregates
make the findings available to every collaborator; raw files remain ignored.

Hamner plate-loading medians shorten from 0.324 to 0.204 s and 0.357 to 0.224 s
between 2 and 5 m/s. Use measured loading and heel/toe paths to constrain finite
gait/placement, with speed-dependent support periods. These are not automatically
identified individual stance events, and they are not NFL cleat/grip forces.

Moore windows have measured loading and marker motion, but original perturbation
events, belt-speed traces and segment time mapping are absent. **Disturbance-
aligned recovery is not yet measured.** The most useful additional files would
be that small metadata for original trials **T046 and T031**, plus their mapping
to the processed segments. Do not download another giant archive to fit an
unsupported constant. Force-fitted COM outputs are not independent validation
of ground forces; `.b3d` COM acceleration already subtracts gravity.

## What's next

1. Replace the cumulative averaged coordinate with **two persistent reduced
   point-support slots**: load-bearing planted support and candidate placement.
   No skeletal limbs are needed. Give the slots finite leg reach, actual plant
   eligibility and a support-transfer lifecycle.
2. Planted support stays in ground coordinates until lift or friction slip.
   Candidate movement changes balance only after reachable contact carries
   nonnegative normal load. Transfer load/CoP while sharing ground traction and
   active leg effort. Preserve the distinction between an attempted step and
   an achieved loaded plant.
3. Keep a live leg grasp attached to its physical slot through transfer. Never
   reset a held anchor or clamp offset to hide drift. Changing leg-share must
   account for continuous attachment movement/slip, rather than moving geometry
   without corresponding velocity/work.
4. Use Hamner observations to check ordinary support timing and reach. Obtain
   the small Moore event/belt metadata before fitting disturbance recovery.
   Passive deformability and football contact magnitudes remain separate gaps.
5. Rerun the same stationary hold panel, ordinary tackles, jam/anchor/double/
   shed/absorbed-contact tasks, and the first-divergence wrap/no-grasp traces.
   Require bounded achieved support and reduced sustained trajectory error
   before promoting. Do not raise global substeps or add role strength bonuses.
6. Then continue the owner's remaining priorities: local persistent contact
   convergence; initial run push/get-off/OL advantage; achievable tackle and
   pursuit rollouts. Keep small game/conditional NFL guards and their regressions.

## Reproduce

Use Node 22. The experimental preload is a diagnostic-only explicit model
selector; production imports do not include it. The preload makes existing
probes and game commands run the same controllers/RNG under the candidate.

```sh
node --import tsx scripts/diag/virtual-foot-support.ts out/virtual-foot/support.json
node --import tsx --import ./scripts/diag/enable-virtual-foot.ts scripts/diag/hand-convergence.ts out/virtual-foot/hand.json
node --import tsx --import ./scripts/diag/enable-virtual-foot.ts scripts/diag/wrap-feedback.ts out/virtual-foot/wrap.json
node --import tsx --import ./scripts/diag/enable-virtual-foot-on-grasp.ts scripts/diag/wrap-feedback.ts out/virtual-foot/wrap-switch.json
node --import tsx --import ./scripts/diag/enable-virtual-foot.ts scripts/diag/shared-capabilities.ts out/virtual-foot/shared.json
node --import tsx --import ./scripts/diag/enable-virtual-foot.ts scripts/scenario-pack.ts out/virtual-foot/scenarios.json
node --import tsx --import ./scripts/diag/enable-virtual-foot.ts scripts/kinematics-compare.ts 4 5
node --import tsx --import ./scripts/diag/enable-virtual-foot.ts scripts/calibrate.ts 8 7 2
node node_modules/vitest/vitest.mjs run test/virtual-foot.test.ts
npm test -- --maxWorkers=2 --minWorkers=1
npm run typecheck
npm run build
python3 -m unittest discover -s test -p 'test_*.py'
```

Omit the preload to measure the production support model. Raw extended traces
stay under ignored `out/`; reviewed summaries and source/script hashes travel
with Git. The existing viewer library was not regenerated for this experiment.

For sampled offset/command/work diagnostics, preload
`scripts/diag/support-telemetry.ts` after the model selector and set
`SUPPORT_TELEMETRY_OUTPUT` to an output JSON path. This port reproduces the
frozen shared-task telemetry exactly and leaves its main output byte-identical.
The complete 296-test suite passes with two workers, as do 22 Python data tests,
typecheck and build. A first concurrent test run completed its assertions but
hit a worker RPC timeout; the bounded rerun is the successful verification.
