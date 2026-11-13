# Contact forensics: acquisition, angular transfer, and a misleading defensive turn

Source: `c4a03f6463eacb23ce63d01bd32b4f8b547b9bc0`, current `develop` fetched by coordinator. Node 22.23.3. All production source and approved plans unchanged. Experiments reside in ignored `out/forensic-contact`; copied evidence is under `evidence/contact`.

## What changed in the first audit's conclusions

**Strengthened:** the tackle reach problem is a shared geometric-contract inconsistency, not just an unfortunate dive probability. Its effects occur in ordinary football, and removing one acquired hold removes a specific fall in a replay with an identical native prefix. Several other ordinary acquisitions use the same incompatible reach interpretation.

**Strengthened but bounded:** the center-hand angular defect is exercised throughout the observed ordinary game. It is not confined to the original synthetic fixture. This does **not** establish that it explains the most conspicuous turning/pursuit failures, or how much it biases outcomes.

**Weakened as a causal generalization:** an observed defender facing away can be an engagement technique request, and correcting the displayed orientation can leave his meaningful physical contribution almost unchanged. A broadly smarter responsibility model cannot be justified from this symptom alone.

**Explicitly rejected:** “every remote dive produces a fall,” “a corrected dive must improve defensive statistics,” and “the common-patch option is a single-variable experiment on angular conservation.” The experiments below supply counterexamples to all three.

## C1. Native P048: a remote dive causes a fall, but removing it makes the final defensive result better

### Competing explanations

The QB appears to fall with a defender well behind him. Possible explanations include a QB slide decision, a voluntary motor command, torso collision, balance failure from ordinary locomotion, or a long leg hold acquired by the dive branch. Prior documentation favored the last explanation. I tested it in the current native game rather than merely accepting that account.

### Reproduction and intervention

The architecture investigator captured immutable constructor input for ordinary seed-7 `G1-P048`, including generated players, energy, scouting state, calls and RNG seed. Restaging the input under unmodified production source reproduced the **complete native result and event list exactly**.

Three arms were run:

1. Native.
2. Remove only the freshly created `DE_W → QB` dive grasp and its membership in the tackle bond, after `tryTackles` had already drawn its random result and queued the original dive.
3. Remove only the later `SS → Y` dive grasp in the same way.

The bodies, intents, RNG state and event list hashed identically at each arm's intervention point. Neither intervention rescinds the defender's dive request. Subsequent decisions remain live; later replanning and RNG consumption can therefore diverge. These are causal interventions on the acquired contact, not proposed fixes or matched whole-play outcome estimators.

### Result

The first dive grasp appears at the state boundary `t=3.05`:

| Measurement | Native |
|---|---:|
| Holder/target | DE_W / QB |
| Center distance at acquisition | 2.178881 yd |
| Granted hold reach | 2.441432 yd |
| Holder/target height | 2.127778 / 2.088889 yd |
| Simple layout proxy `.71*hD + .25*hC` | 2.032944 yd |
| First post-step state with QB falling | 3.25 s |
| Cause reported by support | `legs` |
| Center distance then | 2.470369 yd |
| QB pass release | 3.40 s |

The fall event's engine timestamp is 3.20, while the first resulting body state is at 3.25. The distinction is a tick-boundary convention, not a second event. The QB still has possession when he begins falling, then throws while falling. Throwing while falling can be legitimate football; this is not automatically a rule violation.

At 3.25, the native QB velocity is `(1.364677, -0.274297)` yd/s and his support is `falling/legs`. With only the acquired DE_W hold removed, support remains `up`, with velocity `(1.892102, -0.411930)`. The original DE_W dive still occurs. This identifies the acquired hold as the cause of the native leg fall; a locomotion or QB-decision explanation is unnecessary for this event.

The final outcomes move in a direction a superficial evaluation might misread:

| Arm | Final gain | What subsequently happens |
|---|---:|---|
| Native | +23.10 yd | QB throws while falling; Y catches and runs |
| Remove DE_W→QB hold | −6.17 yd | Another defender acquires a wrap and the QB is ruled in the grasp before release |
| Remove SS→Y hold | +23.79 yd | Y continues upright; later tackle shifts |

The final yardage is not an isolated estimate of the physical defect's value. The important observation is that repairing the visible fall need not make a simple defensive metric worse—or better. A causal correctness decision cannot be reduced to the sign of yardage.

The later `SS → Y` acquisition is a useful opposing example. It occurs at 5.85 s and 2.319225 yd, with 2.469225 yd granted reach. The hold breaks by 6.00; Y remains upright in both native and removal arms. At 5.90 his velocities are `(6.191072, 3.021773)` with the hold and `(6.374456, 2.828386)` without it. The contact influences motion but does not automatically trip its target.

**Classification:** reproduced current ordinary contact consequence. One game/play is not a population estimate. The layout proxy is the earlier project's simplified anthropometric assumption, not a measured ankle/hand trajectory; the stronger conclusion is instantaneous acquisition beyond inconsistent model envelopes, not millimeter-level human reach certification.

Evidence: `evidence/contact/native-dive.ts`, `native-dive.json`; input `evidence/architecture/G1-P048-setup.json`; native result `evidence/architecture/ordinary-census.json`.

## C2. The problem begins before the dive: multiple meanings of “reach”

The declared `PhysicalProfile.reach` is **horizontal reach from body center**, in yards (`src/players/physical.ts:32`). The generated mapping is `.25 + .85 * armIn/36` (`:153`). Its consumers disagree:

| Operation | Center-to-center envelope | Source |
|---|---|---|
| Arm strike validity | actor.reach + target.radius | `src/physics/world.ts:758` |
| Handoff to torso | actor.reach + target.radius | `src/sim/ball-transfer.ts:5` |
| Free standing tackle | actor.radius + target.radius + actor.reach | `src/sim/tackle.ts:136–138` |
| Free lunge | above + .45 yd | `tackle.ts:141` |
| Dive admission | lunge envelope + .30 yd | `tackle.ts:200–209` |
| Granted extended hold | max(two radii + .9*reach + .9 yd, acquired distance + .15 yd) | `tackle.ts:356–360` |

Pose-specific techniques can legitimately have different reaches. But an extra body movement must be represented and timed, rather than silently adding a radius to a quantity already defined from the center. The dive branch creates its grasp immediately; the planned dive has not yet moved the body. The subsequent solver respects the enlarged hold it has been given. Increasing its precision cannot correct bad acquisition geometry.

The same radius convention influences pursuit stopping distance (`behaviors/common.ts:109,220`), carrier threat evaluation (`behaviors/carrier.ts:121,433`), run support (`run-fits.ts:344`) and catch approach (`catch-approach.ts:29`). This is why simply clipping the dive branch may transfer the defect into a different technique or change arrival behavior. The recent project's own layout gate eliminated every dive because the lunge envelope already occupies its distance band. That is evidence to reconcile technique geometry, not a reason to ban dives.

### Ordinary exposure

The passive neutral seed-7 census observed 160 newly acquired grasp joints in 127 live simulations. Of 122 acquisitions tagged free standing `form` or `reach` (including assists/behind variants), **56 occurred beyond the arm-strike/torso-handoff envelope** `own.reach + other.radius`. All those holders were up; 17 of the 122 targets were already falling. The 56 are 27 reach assists, 13 rear reaches, 9 reaches and 7 rear reach assists. There were no form grabs in this beyond-envelope subset.

This is **not** a count of 56 proven impossible human tackles. It is a count of ordinary decisions for which the engine's stated center-reach interpretations disagree. It establishes that the interface matters outside hand-built witnesses. It should be addressed by a shared, explicit contact-landmark contract with technique-specific movement, not by forcing every action to have the same scalar radius.

### Controlled capability panel and failed hypothesis

A 27-cell panel varied defender type (FS/DE/DT), carrier speed (3/5/7 yd/s) and separation speed (1.7/2.5/4 yd/s). Each cell ran a successful dive with/without only its newly acquired hold. The success draw was deliberately forced; this is a geometry/physics experiment, **not a tackle-rate estimate**.

- 16 held arms caused a carrier fall within .20–.55 s; no corresponding no-hold arm fell.
- At least one fall occurs for each defender type.
- Faster separation often makes the grip slip before it trips the runner.
- A separate FS-versus-QB case at 6 yd/s with 4 yd/s separation acquires the hold, transmits force, and slips without a fall. This directly defeats “every remote dive trips the runner.”

A standing reach control also acquires the same hold under body facing 0°, 90° and 180°. That demonstrates orientation-independent admission in this reduced model. It does not, by itself, prove all rear reaches should be disallowed: tactile control, nearby wrap geometry and torso rotation require a more specific action model. It does show why improving body-facing film can have little effect on tackle eligibility.

Evidence: `acquisition.ts/.json`, `dives.ts/.json`. Source paths above. These use generated current profiles, fixed requests and exact forced-execution controls, with other defenders parked.

## C3. Center-hand angular defect: broad exposure, unproven football error magnitude

The original passive law witness still establishes a genuine conservation defect: tangential equal/opposite impulses at body centers change orbital angular momentum without the corresponding spin impulses. More substeps do not cure it, and a balanced kinetic-work ledger does not check this law.

I added a **passive** census at `World.pairImpulse` (`world.ts:808`) to measure each actually delivered internal impulse's instantaneous planar moment:

`ΔL = ((positionB-positionA) × impulseOnB + angularImpulseA + angularImpulseB) * deliveredFraction`

Translation of the reference origin cancels. Contributions are summed by body pair and controller tick before taking their absolute value. This avoids presenting each solver iteration as an independent event. This is not a whole-world residual: ground forces/moments are excluded, and finite-force midpoint transport can produce discretization terms. It is particularly diagnostic for the default center hand law's absent angular channels. Do not call it energy.

The instrumented game's packed replay was **exactly identical** to the existing ordinary film. It recorded:

- 127 live simulations, including two-point simulations; this differs from the viewer's 125 filmed play records.
- 11,493 physics steps; 7,663 began with at least one hand joint.
- Nonzero hand-channel internal angular moments in **all 127 simulations**.
- 24,857 body-pair × tick hand-channel contributions exceeding `1e-8 kg·yd²/s` in magnitude.
- Largest single pair/tick magnitude: 55.789449 kg·yd²/s.

There is no NFL reference distribution for this internal bookkeeping quantity. The game-wide absolute sum is not an interpretable “amount of football wrongness.” The result proves broad exposure to the approximation; it does not identify resulting yards, missed tackles, or turning errors.

### Why the obvious experiment is confounded

A current-default lab panel compared `handContact:'center'` and `'patch'` with identical controllers, inputs and seeds: 12 redirect cells (3 rosters × 2 rusher powers × 2 mirrors) at 12 and 48 substeps, plus six tackle approach cells per resolution.

The hand-contact mode strongly changes redirect behavior. At both resolutions, the fixture's `cornerTurned` result changes from 2/12 to 12/12. Median absolute change in closest approach to QB is about 3.195 yd. For roster 3/strong rusher, closest approach changes 2.897→.770 yd at 12 substeps. Both mirrored arms agree.

**This is not a valid single-law causal estimate.** Patch mode also changes the gait estimate and yaw target (`world.ts:1095–1102`), torso impact timing (`:1312–1328`), angular hand transport (`:1351–1354`), and several grasp coordinate/force paths. These are compositional changes, not merely “add the missing torque.” The six basic tackle approach cells retain the same tackled/not-tackled classifications in this panel; changes are not universally transformative. The refined solver is a comparison, not ground truth.

### A narrower counterexample

A small grounded, no-torso-contact, passive-tangential-hand scene held the same movement and facing requests for .5 s. A diagnostic surrogate added only the common-point tangential angular Jacobian and effective mass to hand rows, while retaining all center-mode defaults and normal/contact policies. At 12 substeps, the defender's facing changed about 3.63°, with position changing less than .001 yd; both bodies remained up. At 48 steps the same qualitative result holds. Ground yaw resists the new torque.

The surrogate is **not a proposed physical repair**: full finite-force midpoint/angular transport is deliberately not implemented. It exists to challenge the idea that any missing hand torque must explain 180° defensive turns. The actual native turning experiment below is stronger on that point.

Evidence: `contact-hook.ts`, `ordinary-census.json`, `law-transfer.ts/.json`, `law-transfer-summary.json`, `tangent-channel.ts/.json`.

## C4. Native P019 LB_W: engagement asks him to face the blocker

This investigation corrected an initial bookkeeping mistake: **LB_W is index 16 in this play; index 18 is CB_S.** A separate CB_S episode starts its engagement rewrite at 4.05. Do not combine the two players' timelines.

The LB_W case has raw pursuit requests directed toward the runner, but the run-engagement controller owns the final technique. `src/sim/engagement.ts:1434–1439` explicitly replaces desired facing with the bearing to the blocker; its velocity may still work off toward the runner. The technique is not necessarily ignoring the ball. Body orientation is not gaze.

### Discriminating interventions

The native constructor input was restaged exactly; full result/events equality is true. For steps starting at 4.05 through 4.40 (physical endpoints 4.10 through 4.45), while LB_W remained engaged with C:

1. Native execution.
2. Change only final requested facing to the raw pursuit request's facing/direction. Keep movement, hand constraints and other physical laws.
3. Preserve all requests/engagement but set hand push/hold/steer capacities touching LB_W to zero. Keep torso contacts. This is a causal probe, not a playable alternative.

Both interventions have the same hash of bodies, intents, RNG and events at the first intervention boundary.

| Step start 4.40; physical endpoint 4.45 | Native | Pursuit-facing only | Zero hand force |
|---|---:|---:|---:|
| Body angle away from runner | 143.3° | 2.5° | 135.5° |
| Body facing | 3.091 rad | .633 rad | 2.977 rad |
| Position difference from native | — | .001041 yd | .186 yd |
| Final play gain | 8.78 yd | 8.78 yd | 8.78 yd |

The saved `t` field is the controller step start; `post` and `runner` hold state after `World.step`, whose clock has advanced by .05 s. The native hand's tangent force over this step is 606.68 kg·yd/s²; the facing-only arm gives 605.99, with the same engagement-control estimate to displayed precision. Zeroing the hand forces does not remove the away-facing request. Changing only the request removes almost all the visual symptom without materially changing this player's location or the final result.

**Supported conclusion:** engagement command ownership explains this away-facing episode. It is not caused principally by insufficient yaw speed or tangential hand torque. The core pursuit decision was already runnerward. A generic responsibility/opportunity wrapper would not address the observed request replacement unless the contact interface also changed.

**Not established:** that always facing the ball is the right fix. A blocked defender may need to face/control his blocker, and existing hand admission/force geometry does not establish the cost of rotating his chest away. The facing-only intervention can therefore make the film look better while leaving a questionable technique model intact. Validate body-relative hand availability, ability to shed, and useful displacement before treating the visual change as football improvement. Use an actual engaged stance/control example as an opposing case; do not demand eyes-on-ball torso orientation in every blocked frame.

Evidence: `blocked-facing.ts/.json`, architecture `G1-P019-setup.json` and `G1-P019-trace.json`. The script labels by slot, not a presumed common player index.

## C5. A smaller independent blind spot: ball release does not follow body posture

P048's QB begins falling before releasing the pass. `PlaySim.throwBall` (`src/sim/playsim.ts:675`) always creates a release at `z=2.2` yd, independent of current support, body posture, height or fall progress. The release's horizontal offset follows body facing.

This is a concrete interface limitation between the reduced body/contact model and ball flight. It does **not** prove this particular falling pass is illegal or impossible; a player can release before his knee reaches the ground, and the model has no measured knee trajectory here. It does mean a claim that all execution comes from a shared body model would overstate the implementation.

Track the limitation under body/ball execution contracts. Do not create an anatomy program merely to address it. The next useful experiment is a controlled release-height/support panel and film check for falling/reaching throw/catch actions, with the event clock and a defensible body-height approximation made explicit.

## Architectural and priority implications

1. **Repair acquisition geometry before tuning physical finishing.** A solver can faithfully trip a runner through an invalidly acquired joint. New grip strength or balance refinements will otherwise calibrate around the wrong opportunity.
2. **Share meaning and boundary facts, not necessarily one decision framework.** A common center/landmark/reach/time contract has direct demonstrated value. A universal role decision envelope is not needed to fix C1/C2.
3. **Separate command ownership from missing forces.** C4 establishes a technique-level facing request; the angular defect is a different concern. Do not merge them into a general “players cannot turn” diagnosis.
4. **Keep angular law work bounded.** Broad exposure warrants a physical correctness task, but no measured full-game benefit estimate exists. Isolate the law from the bundled patch and demonstrate transfer under unchanged controller semantics before promotion.
5. **Retain opposing outcomes.** C1's final defensive improvement after contact removal and its non-falling SS dive are valuable permanent local counterexamples. C4's largely cosmetic facing change is equally valuable.
6. **Use ordinary-prefix restaging as the default forensic primitive.** The native setup snapshots with neutral-result and pre-intervention equality made these questions cheap. Broad new scorecards would have been less discriminating.

## Remaining exact experiments

- Split common patch into independent hand angular Jacobian, angular transport, gait estimate, yaw target, torso timing and grasp-coordinate arms. Hold requests and capacities fixed for short loaded prefixes; then re-enable native control. Reject any claim that a full-mode result isolates one law.
- Build one explicit contact geometry schema: origin landmark, target landmark, body pose, finite sweep/arrival time, ability to retain grip. Reevaluate the 56 ordinary standing envelope disagreements against it; do not label them all impossible in advance.
- Replay P019 LB_W with physically meaningful hand availability under chest rotation. Does the facing-only arm still preserve leverage/contact? If not, a visually pleasing solution was exploiting another approximation.
- Add ordinary seeds only to answer prevalence after the mechanism is identified. One game can establish occurrence and a native causal effect, not distributional importance.
- Test falling-body ball release geometry before inferring support state or intent from a drawn dot and a ballistic trajectory.

## Reproduction

Use the pinned source and existing `npm ci` installation. Copy the TypeScript files to `out/forensic-contact/` so their `../../src` imports remain correct. Run with Node22:

```sh
node --import tsx out/forensic-contact/acquisition.ts
node --import tsx out/forensic-contact/dives.ts
node --import tsx out/forensic-contact/law-transfer.ts
node --import tsx out/forensic-contact/tangent-channel.ts
AUDIT_ARCHITECTURE_DIR=/path/to/evidence/architecture node --import tsx out/forensic-contact/native-dive.ts
AUDIT_ARCHITECTURE_DIR=/path/to/evidence/architecture node --import tsx out/forensic-contact/blocked-facing.ts
```

The ordinary contact census is installed by `installContactAudit(World)`, then `onSim(sim,{id,kind})` before each native play, and `finish()` after the game. Its independent neutrality evidence is architecture `ordinary-census.json:neutralEqualPackedReplay`, which is true. It performs no perception read, behavior evaluation, random draw or extra physical step.
