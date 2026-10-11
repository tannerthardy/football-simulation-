# Shared traffic control and man-assignment accounting

**Read first on `claude/engine-priorities`. Physics remains NOT READY.**
Follow [PHYSICS_DEVELOPMENT.md](../plans/PHYSICS_DEVELOPMENT.md). This pass reproduces
seven owner observations from the `78f2002` film, improves shared movement
planning, and repairs the confirmed man-alignment/cardinality bugs the owner
asked us to investigate. Physical profiles, collision forces, grip constants,
support response and solver resolution are unchanged. PR #1 was not touched.

## What the original clips show

Original source: `e3471f2c0be6e1c4b32c9713d53d216bc835691d868e93e1628ea279fb21498d`.
`scripts/diag/owner-film.ts` reruns the six original games and verifies all seven
selected packed trajectories exactly before collecting commands, perceptions,
assignments, contacts and falls. Contact times below identify the enclosing
20 Hz tick, not exact continuous contact time. Reviewed records and saved
inputs are in `data/reviews/physics-world/traffic-and-man-accounting/`.

| Original clip | Diagnosis |
|---|---|
| G2-P031 | Inside Zone Weak, 1.88 yd. RB hits LG at 2.70 s, closing at **4.15 yd/s**, impulse 306.79 kg·yd/s. The back's selected gap endpoint is clear enough, but his approach crosses the blocker. The old spacing window starts too late to brake |
| G6-P166 | Inside zone, 7.77 yd. QB/F collide at 0.75 s, closing at **3.88 yd/s**; handoff occurs at **2.90 s**. This really is obstruction delaying a reachable exchange. The RB waits for the QB; the ball does not teleport |
| G3-P056 | Stick vs Cover 1, 17.65 yd, out of bounds. CB_S/NB collide at 3.30 s, closing at **8.70 yd/s**, impulse 388.81 kg·yd/s. Both fall next tick. Genuine shared-world contact following poor approaches; this does not prove the balance/contact magnitudes are NFL-correct |
| G2-P081 | Flood vs Cover 1, 26.8 yd TD; 10.1 yd catch separation. A shadow override assigns CB_S to X across the field, then disguise replaces his position with the old side's zone look. Roughly 35 yd of lateral distance is introduced before the snap. He is trying to reach his assigned receiver, rather than abandoning him |
| G4-P042 | Comebacks vs Cover 0, 16.42 yd TD; 12.3 yd separation. Same disguise/shadow error. The other corner loses his preferred receiver to the shadow, then greedy allocation gives him an interior target and leaves an LB crossing to the outside WR |
| G6-P121 | Levels vs Cover 0, 20.68 yd; 4.7 yd separation. Seven rushers leave only four markers for five eligible receivers. Slot H is unassigned. FS is assigned Y but disguised roughly 12 yd deep and 15 yd away |
| G6-P133 | Drive vs Cover 0, 73.4 yd TD; 18.3 yd separation. Both cross-field shadow placement and unsupported seven-rusher pressure. The brief blocking cue does not trigger a run-fit abandonment in the traced corner |

## Shared traffic planning

`spaceTeammates` now budgets closure using the player's **existing braking
envelope**, current relative velocity, fatigue and support availability.
Players use delayed teammate positions/velocities through `sim.see`; they do
not get a teammate's next cut or future command. The body's stopping distance
can extend awareness beyond the old fixed 1.2 yd gap.

The controller checks whether the requested relative path actually intersects
the teammate's torso footprint. A teammate beside a clean crease does not
automatically slow the runner. When the path conflicts, allowable relative
closing speed budgets headway plus braking distance. The player takes his own
correction instead of assuming that an occupied blocker or grounded helper
will supply half. Requested speed remains bounded; World executes the request
with its ordinary forces and may still fail to stop or turn in time.

The retained **0.3 s headway, 1.2 yd awareness floor and 0.9 torso-touch factor**
are inherited control/contact assumptions, not newly measured NFL thresholds.
This is a shared approach-control improvement. It adds neither a special RB
strength multiplier nor a collision exemption. It is not a full obstacle-path
planner, block-leverage reader, plant simulator or revised contact solver.

### Mechanical transfer

`traffic-contact.ts`: four roster seeds, both mirrors, four geometries and
6/12/48 substeps, **96 trials per source**. Paired physical profiles are verified
identical. Ordinary waypoint controllers and World, delayed teammate perception,
no opponent/tackle/block outcome rolls. Eight native-12 reps per geometry:

| Geometry | Reps with teammate contact before → after | Mean final goal distance before → after |
|---|---:|---:|
| RB approaching a moving blocker | **8 → 0** | 0.107 → 0.105 yd |
| Two defenders converging | **8 → 2** | 0.285 → 0.127 yd |
| Clean crease between two blockers | **0 → 0** | 0.104 → 0.105 yd |
| QB/FB crossing mesh paths | **8 → 0** | 0.106 → 0.102 yd |

No body falls in either panel. Mean peak closing in the converging trials falls
from 2.96 to 0.27 yd/s **averaged over all eight trials**, with zero for no
contact. The two trials still contacting average about 1.08 yd/s. Momentum and
planar work residuals are below `1.3e-12` and `5.8e-12` in native-12 reps.
Full paths mirror exactly in this panel. Worst native-12 versus 48 ending-body
error decreases from 0.01005 to **0.00142 yd**, with no fall-set disagreements.
This does not establish general convergence: these trials have no hand fight,
wrap, persistent block or opponent evasion.

## Repairing supported man calls

1. A shadow override trades the outside receivers between corners before
   unmatched targets go to interior defenders.
2. Disguised man defenders keep their actual matchup's lateral alignment.
   Shown cushion is limited by the existing normal off-man depth budget.
   They still travel physically during pre-snap staging; no post-snap teleport.
   This is a conservative executable disguise, not a complete NFL disguise policy.
3. The stock Zero package now has two additional blitzers, leaving five markers
   with a four-player front. Double-A no longer advertises Cover 1: six rushers,
   a post safety and five man markers would require twelve players.
4. On pure man calls, optional underneath help or a bracket takes a vacated
   assignment before an eligible receiver is left unaccounted for. Called deep
   help remains. With five-player odd/goal-line fronts, an uncalled edge drops
   into a man responsibility if the budget requires it; explicit blitzers remain.
   The edge uses the existing man controller and his own body capabilities.

The static catalog audit covers every formation, both flips, three hashes,
compatible fronts/personnel, advertised pure-man/pressure combinations,
Cover 2 presentation and CB_S shadowing X. Across **19,224 supported cases**,
missing-matchup cases fall from **9,072 to zero** and cases with a marker over
1 yd laterally from his assigned man fall from **19,107 to zero**. The original
catalog also advertised 3,456 Double-A/Cover-1 cases now excluded. These are
assignment invariants, not pass defense or NFL disguise-fidelity results.

### Frozen scenarios are separate from the original film

Saved calls, generated players, seeds, energy and the resolved CB_S shadow are
retained. The same isolated inputs are run on both sources. Game scouting and
audibles are omitted, so **baseline isolated results already differ from the
original clips**. Old pressure objects stay serialized; the new assignment
budget may drop an uncalled edge. Do not label these original-clip counterfactuals.

The isolated QB/FB handoff advances from **2.80 to 1.65 s**, with its fast
QB/F collision gone. The original G2-P031 setup's isolated RB/LG collision is
avoided, but its gain changes from 1.31 yd to a 73 yd TD. That does not validate
the ensuing pursuit. G3-P056 **worsens** from an incompletion to an 80.65 yd TD.
Three other isolated man cases become an incompletion or QB scramble tackles
for losses (the isolated stats flag them as scrambles, not sacks); G6-P121 falls
from a 31.3 yd TD to 9.21 yd, with 2.5 yd catch separation. All seven pairs,
including regressions, are retained. They are exploratory cases, not calibration.

## Concept/front/coverage outcomes

`film-outcomes.py` now saves success, explosive rate, yards, stuffs, throw and
completion denominators, completed separation and YAC by concept, actual checked
coverage, original called coverage, family, front, concept/coverage,
concept/front and disguise. Success means 40/60/100% of yards to go on downs
1/2/3–4; pass explosives are 20+ yd, run explosives 10+ yd. Nullified plays
and kneels are excluded. Pass-play rates include sacks/scrambles; completion
explosive rates use **throw events**. Missing labels remain unknown.

All non-nullified runs in the six fixed-team games:

| Concept | Attempts before → after | Success before → after | 10+ before → after | Mean yards before → after |
|---|---:|---:|---:|---:|
| Inside zone | 33 → 25 | 6/33 (18.2%) → 8/25 (32.0%) | 2/33 (6.1%) → 2/25 (8.0%) | 4.07 → 2.94 |
| Outside zone | 47 → 48 | 31/47 (66.0%) → 20/48 (41.7%) | 10/47 (21.3%) → 7/48 (14.6%) | 10.07 → 5.81 |
| Wide zone | 40 → 42 | 13/40 (32.5%) → 13/42 (31.0%) | 7/40 (17.5%) → 3/42 (7.1%) | 5.16 → 6.06 |
| Trap | 20 → 19 | 2/20 (10.0%) → 0/19 (0.0%) | 0 → 0 | 0.84 → 0.68 |

Outside zone versus Under has 5/15 explosives before and 4/17 after; versus
Over, 3/18 before and 2/17 after. These small, unmatched cells change as calling,
clock and execution change. The disparity the owner saw is real in this cohort,
but this does not isolate a physics cause or establish an NFL concept target.
Existing public nflverse run-direction labels **do not distinguish inside from
outside zone**. A claim that outside zone should be less successful needs matched
scheme labels/context, not a compensating run-concept multiplier.

Passing explosives are spread across calls, not explained solely by Cover 0.
In the new film, Cover 6 has 12/65 explosive pass plays; Cover 3 Match 7/23;
Cover 1 Off 7/35. These are triage cells with different route, front and
game-state exposure. Full cross-tabs preserve counts for further investigation.
Do not rank tiny cells as proof that a coverage rule is broken.

## Football guards, including regressions

Sixteen games, seed 7, two independently generated leagues; four tracking
games, seed 5. Same definitions as the preceding handoff. These are transfer
guards, not outcome targets or matched counterfactuals. Legacy `calibrate.ts`
target bands are coarse; use the reviewed conditional NFL distributions for
research. Its yards-before-contact band differs from the tracking operator.
There is also a known classification limitation: `PlaySim.endCarrier` excludes
an already-scrambling QB from sacks even when a called-pass play ends behind
the line. `calibrate.ts` counts those as scrambles/rushes. Its sack rate and
yards/carry therefore need a separate NFL-stat-definition audit before treating
them as directly comparable. The film concept tables keep called-pass scrambles
in pass-play denominators; geometric pressure is unaffected by that label.

| Measurement | Before | After |
|---|---:|---:|
| Points/team-game | 28.91 | **29.47** |
| Missed + broken tackles/play | 0.18 | **0.19** |
| 20+ yd completions/throw, league cohort | 13.63% | **14.55%** |
| Completed YAC | 7.94 yd | **8.01 yd** |
| Interceptions/throw | 6.65% | **8.48%** |
| Run yards/carry | 3.06 | 3.37 |
| Run stuffs | 23.60% | **24.59%** |
| Run 10+ rate | 6.55% | 6.77% |
| Run first-contact YBC, league guard | 0.77 yd | 0.76 yd |
| Sack rate/dropback | 6.91% | 6.97% |
| Time to throw | 2.55 s | 2.55 s |
| Catch/incompletion separation, guard | 3.38 yd | 3.16 yd |
| Four-game geometric pressure | 26.4% | 30.9% |
| Four-game pocket depth at 2.5 s | 4.10 yd | 4.22 yd |
| Four-game DL speed at 0.5 s | 1.58 yd/s | 1.58 yd/s |
| Four-game run DL peak acceleration p50 | 5.04 yd/s² | 4.92 yd/s² |
| Four-game first-contact YBC mean | 1.48 yd | 1.10 yd |

Geometric pressure counts a defender within 2 yd of the QB before the throw;
it is distinct from the QB's internal sensed-pressure flag. Four-game tracking
and sixteen-game guard cohorts are different. NFL tracking references are
1.68 yd/s DL get-off at 0.5 s, 3.28 yd/s² run DL peak acceleration and 1.16 yd
first-contact YBC mean. Neither improved separation nor assignment accounting
guarantees better passing outcomes. **League and film passing explosives both
worsen.** No force/strength parameter was tuned to repair those results.

New film: **884 clips, six games, 27 concepts**, 512 throws, 332 completions,
27 interceptions and 153 other incompletions. Drops account for 26/153 (17.0%).
20+ completions rise from **87/512 (16.99%) to 96/512 (18.75%)**. Recorded pressure
overlaps outcomes; it does not establish why a pass missed. Decision, mechanics
and accuracy causes remain unclassified. New G/P IDs belong to new trajectories.

## Readiness and next work

After source: `0f6b4078a3857a2f4664d2e4d91176ccfb252dbcc836c498a3bafdfa32792df7`.
**274 engine tests and 22 data tests pass; typecheck and build are clean.**
All 20 viewer browser checks pass, including eight ordered pitch release/catch
sequences. The ZIP contains byte-identical viewer HTML. An initial concurrent
suite run had a Vitest worker RPC timeout; the clean rerun after the simulations
completed passes without unhandled errors. Timing logs are not controlled
performance benchmarks.

The nine real-technique hand-fight fixtures remain **0.206 yd mean / 0.822 yd
worst closest-path error** at native 12 versus 192, with **two fall disagreements**.
The preceding continued-contact probe's 8.502 yd frontal drift and 0.691 yd
native-12 frontal mirror error are **not repaired or revalidated by the traffic
panel**. Contact magnitudes and reduced support energy remain unvalidated.
Physics has not earned the owner's OK.

The [running-back textbook](../../references/Running_Back_Mechanics_Textbook.md)
is retained byte-for-byte with provenance in the reference index. It is an
uploaded design aid, not instructions or independently verified authority;
linked figures were not supplied. Its separation of pressing/reading a block,
choosing an achievable entry, and executing it under balance/traction constraints
fits the shared-body architecture. No full RB decision rewrite is claimed here.

1. **Local contact convergence first:** reproduce the pre-wrap hand/load/lean
   divergence and near-critical QB/rusher fall reversal at fixed 20 Hz control.
   Trace force, work and support state; refine the failing interaction locally
   before increasing resolution globally.
2. **Executable pursuit and tackle choice:** far interception must budget turns,
   braking and feasible arrival posture. Evaluate sustainable reach/grip before
   committing. Use the same bodies across contact/approach tasks, with delayed
   cues and fallible execution. A back escaping a blocker must not automatically
   escape every defender too.
3. **Loaded run contact:** compare initial OL/DL response, contact height,
   doubles and posture under identical bodies, then the existing matched NFL
   movement panel. Preserve the distinctions between physical capacity,
   commanded effort and measurement window. Trap paths remain poor.
4. **Contact-magnitude evidence:** sensitivity and suitable measured forces are
   still needed; NFL trajectories cannot identify grip force by themselves.
5. **Later football controllers:** RB block/hip/read cues and crease-path
   evaluation; coverage phase/assignment transitions; WR/DB contact history
   with authoritative holding/illegal-contact/interference predicates. Keep
   QB mechanics and playbook expansion separate from physics readiness.

Commands, retained inputs, hashes and verification logs are in the evidence
README. No additional raw NFL or AddBiomechanics subject data was downloaded.
