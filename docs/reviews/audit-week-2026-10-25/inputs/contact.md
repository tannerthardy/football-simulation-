# Contact, tackle choice, and push/readiness planning input

Reviewed 2026-10-25 against accepted develop `9ace17336ce8593b9d29454bebaa9ebaf11132e0` and pending #273 `734e70e930b64b9fd2ed7874adf417ede0912bdd`. This is a source/patch planning review, not an independent simulation rerun or acceptance verdict.

## Current state and evidence

- [#273](https://github.com/tannerthardy/football-simulation-/pull/273) supersedes #264 on its own branch. Its wording that #264 was “merged in on develop” is not trunk adoption: accepted9ace has no `src/sim/tackle-geometry.ts` (GitHub404), and its tackle factory still has legacy enlarged reach/ground. The #273 diff includes the original geometry repair plus new layout, target and chooser behavior. No discussion comments were present when fetched.
- #273's first geometry commit is reported as36f7eec; the second chooser commit is734e70e. Exact full pins must be recovered before reproducing its factor comparisons.
- Its reported269 matched constructor replays give7.10→9.11 yards/play (+28%),11 dives/2 held,6/11 reaching a leg target,2 lunges/0 held. These are reported aggregate diagnostics, not proof that the replacement geometry or each explanatory subgroup is correct.
- The scripts/inputs for that269-snap probe are described as Claude project files under tackle-reach/. Repository-only readers have not thereby received a portable executable witness. Require exact constructors/operator/settings and a compact accessible bundle before claiming independent reproduction; do not redo all269 merely to replace missing delivery.
- Tests are reported as3324 passes plus3 baseline-runner failures on Node22.22, while .nvmrc requires22.23.3. The week must resolve this runtime qualification on the candidate; do not relabel that as a clean current-runtime full suite.

## What changed technically

New `handSpan` grows standing center-to-hand reach toward `.72*heightYd` during a dive's World fall clock. `trailingFoot` places a target behind the runner, proportional to speed, up to `.25*heightYd`. `legTarget` takes the nearer of that foot or body surface. Retained reach freezes admitted span plus a target-distance allowance. A lunge is now an upright strike step instead of a dive.

The chooser uses an analytic .2s lunge bound and an11-sample constant-velocity dive forecast with a launch bound and fall-clock span. It is not a production-World rollout of the complete executed request. Policy approach distances were named but remain numerically unchanged (.75 intercept/.65 gather).

## Verify-first issues that should shape the week

### 1. Launch choice versus physical truth must be a real boundary

[Candidate tackle.ts](https://github.com/tannerthardy/football-simulation-/blob/734e70e930b64b9fd2ed7874adf417ede0912bdd/src/sim/tackle.ts) keeps `tryTackles` rooted in live `sim.carrier` and then adds a pre-contact player choice of lunge/dive. Asking `see(d,c)` after selecting hidden current-holder identity is not equivalent to choosing from acquired ball responsibility. It does not require that this picture says carrying=true; legitimate recognized-flight anticipation is also a separate channel.

Moreover, `lungeCanArrive` consumes a Perceived picture, but `beginLunge(d,c)` calls `strike(sim,d,c)`, which computes aim from live c.pos/c.vel. Selection and motor commitment therefore use different information.

**Deciding tests:** freeze own body, consumed pictures, installed responsibility and RNG. Change only hidden holder identity/current unobserved runner state before physical contact. The chosen launch target and proposed aim should remain invariant where the actor has no new evidence. Actual physical admission and possession resolution can differ. Trace exactly which current/observed value supplies each component.

**Repair boundary:** actor-owned launch intent from an acquired/anticipated target; true-state contact admission in tackle/World. Pass the consumed aim into the finite action rather than re-reading true velocity. Coordinate INFO/Defense owners; a file-name-based information guard cannot certify a file that mixes physical rules with policy.

### 2. Admission landmark and retained attachment are not automatically the same

[Current World.graspPoint/syncHeldSupport](https://github.com/tannerthardy/football-simulation-/blob/9ace17336ce8593b9d29454bebaa9ebaf11132e0/src/physics/world.ts#L864) use foot/reference/material/bounded attachments. Even legacy support creates a held corrective foot for leg grasps. #273's comment that the World joint acts “between centers” is incomplete.

**Deciding experiment:** one actually admitted dive hold, one upright hold, and one runner cut/turn. Record admission target, center and actual World.graspPoint distance, attachment/cache/reference, joint reach/ground/hold, point velocity and first load/break. Preserve the full native prefix/private attachment state; do not clone only bodies and lose solver state.

**Acceptance:** the admitted proxy, retained bound and force application have explicit compatible meanings. A moving point's derivative/load/work must agree. No hidden span growth or renewed success trial. No requirement for a full skeleton.

### 3. Layout and quality are assumptions, not established calibrations

.72height is documented hip-to-fingertips while Body.pos is horizontal body center; .25height foot offset has no stride-phase measurement. The isotropic growing span also needs a sideways-cut/wrong-side control before it is treated as laid-out directional reach. Establish landmarks and justify a conservative reduced proxy; do not restore an arbitrary yard margin to recover statistics.

`gripQuality(distance,torso,span)` calls `contactQuality(distance,torso,torso+span)`. With declared sample radii.3/.3 and center-to-hand span1, physical outer admission is1.3 and the function returns.4 there, despite “0 fingertips” wording. This could be an intentional grip/control calibration, but it is not proved by geometry names. Define wrap control versus hand grip explicitly and preserve an offensive escape. Prior T1 already showed old quality/span restoration does not rescue selected P013; do not rerun that closed hypothesis.

### 4. Forecast agreement needs opposing physical execution, not yardage selection

The launch bound is optimistic; support, motor spending, collision, finite posture and unknown runner changes can invalidate it. Show one attainable lunge, one finite dive, a receding miss, a transverse/late-cut miss, an already loaded/traffic exclusion and an inactive unchanged case. Compare forecast versus actual first reachable sample, not just final tackle. A false forecast is not permission to increase capacities.

## Proposed weekly work packages

| Package | Owner and effort | Timing/dependency | Concrete completion |
|---|---|---|---|
| C1 launch-information and commitment contract | Defense/Do-It-All with INFO owner; S–M | Days1–2; inspect #273/#274 current composition | Invariant pre-contact launch under hidden-state changes; observed aim reaches finite motor action; physical admission stays true-state |
| C2 geometry/attachment/quality reconciliation | Defense + Physics; M | Days1–3; can research independently of C1 | One active dive and standing retained-contact witness; matching landmark/span/load meaning; finite miss and genuine slip preserved |
| C3 matched source composition | Measurin independently, Defense supplies inputs; S–M | Days3–5 after C1/C2 pins | Small fixed constructors: current, geometry-only, chooser, INFO-only, identified composition. First changed cue/request/contact, explicit inactive/adverse outcomes |
| C4 independent active transfer and cost | Defense implementation; tools validates; M | Days4–6 after first useful mechanism | New predetermined active opportunities plus discipline/escape; no treating all old269 as holdout; required runtime/checks and one compatible quick pair when production changes |
| C5 push/readiness slice | Physics verifies, Run owns eventual choice, Measurin supports; S diagnosis, M prototype | Later week only if same contact ownership is available | One native brief post/wash from available cues, paired against sustained work and a legitimate failed shove; anticipation changes finite preparation, not an outcome multiplier |

C1/C2 are mechanism work, not merge chores. The project can still research COV-7 and run navigation while pending branches await acceptance. Do not give three agents independent edits to tackle.ts/engagement.ts/common.ts: one actual owner per shared seam.

## Push/readiness: keep it bounded

The root's16 controlled comparisons on50b are reusable evidence of physical capability, not player choice. Same delivered100ms shove slowed an opposing mover3→2.215yd/s; existing imbalance increased displacement; pushing opposite imbalance could aid recovery. Low versus upright stance and90° facing alone did not change the tested stationary translation; changing only reactionTime with identical physical state/commands changed nothing. None of those bodies fell. They establish slowing, redirection and some state dependence; not cognitively “unready” play, actual footfall phase or NFL calibration.

I independently compared Git blob hashes: current9ace and the probe snapshot have identical world.ts, support.ts, kinematics.ts and movement-preview.ts. Do not automatically rerun those probes on the new commit. The remaining discriminating task is native acquired cue→finite preparation→contact→useful disruption, with delivered impulse and recovery/path cost measured.

Do not turn RUN_HANDS/HAND_MOTOR on wholesale, add a surprise/knockdown roll, reward a shove with a success outcome, or multiply force. A player may remain balanced yet lose the pursuit lane. Shoving in the wrong direction may help the opponent. These opposing results belong in acceptance.

## Relationship to the original roadmap

- A07 is now a real pending geometry-and-action program; standing admission is not complete closure of dive opportunity/retention.
- A14's center-hand angular-law defect remains separate. The audit showed broad exposure but did not show it caused selected turns/failed holds. The bundled patch mode changes several mechanisms. Prepare the single-law witness and native loaded control in a later bounded Physics slot; do not make full anatomy or patch-mode promotion a prerequisite for this week's contact work.
- A16 requires preview/forecast workload and same-completed-work runtime checks. Do not add general rollouts to all actors or a finer World timestep by default.
- A19 supports explicit acquired intent and finite preparation now. A common brain, generic extra delay or perfect friendly information is not earned.

## Verification protocol and stop conditions

Each owner first reports confirmed/corrected/unknown premises and proceeds with a smallest deciding experiment. The independent verifier uses the delivered exact input in another checkout and observes the first consumed causal difference, not just assertions or PR prose. Record clocks, units, actor tuple, full source/settings/runtime and source composition. Separate observer-neutral replay from expected treatment divergence.

Stop a local treatment after two failed mechanism attempts; change the hypothesis, not the sample until it wins. Preserve rejected work and adverse football endings. Do not force defensive totals back to trunk by restoring remote contact. If +28% remains after coherent mechanism work, determine which changed cues/commands/contacts explain a nominated matched case and whether the residual is a separate real gap; do not automatically certify or veto from the mean.

## Evidence saved for root review

- evidence/contact-pr273-patch.json (full actual diff)
- evidence/contact-pr273-comments.json (no comments at read)
- evidence/contact-current-tackle-geometry-file-lookup.json (current404)
- evidence/contact-source-excerpts.json (actual current/candidate grasp and World attachment source)

No production changes, test runs, GitHub comments or PR actions were performed by this reviewer.
