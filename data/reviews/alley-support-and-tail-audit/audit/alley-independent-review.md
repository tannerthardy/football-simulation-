# Independent review: known-back man/alley support

Reviewed the current working diff to `src/sim/behaviors/defense.ts`, its new `test/back-man-run-fit.test.ts` cases, G4-P127 native/counterfactual receipts and archived arrival-v1. No production edits or new football simulations. Tests were inspected, not rerun by this reviewer.

## Recommendation

Keep the small **installed alley support** increment, subject to the current validation panels. I found no production correctness blocker. This removes inappropriate receiver cushion after a man marker has personally acquired that his known back has the ball; it does not add a defender, invent an interior fit, or change physical capabilities. Rejecting arrival-v1 as a general promotion is also reasonable: the six retained tails demonstrate a benefit and an important regression without yet establishing a transferable correction.

## Guard and responsibility

The sole behavioral expansion is installed `insert` to installed `insert | alley`, still requiring all three of:

1. The marked player's original formation spot is backfield and his known roster role is RB or FB.
2. This defender's existing recognition says run.
3. His already-consumed marked-player picture explicitly says `carrying === true`.

Originally split-out backs, ordinary receivers, unknown/negative possession, pass/unsure interpretations, force/cutback/edge/interior jobs and absent run-fit jobs do not enter this addition. Airborne-ball technique still owns the first branch. All production defenders receive Recognition in PlaySim construction; `believesRun`'s legacy no-recognition fallback is not newly introduced here.

The branch passes the *same* target and consumed cue into `executeRunFit`; it does not confirm authoritative current carrier, handoff time or run-call identity. Existing alley logic holds the final defensive level through a deep mesh, then pursues a declared observed run. Thus a safety marking the RB does not inherit the linebacker's insertion gap. Existing physical World traction, turn, balance, fatigue and contact constraints still determine whether the request is achievable. The guard is reused across installed man responsibilities rather than keyed to FS, Cover0, this snap ID or its final gain.

## Native first-decision evidence

The reproduced native baseline and selected-policy counterfactual have identical rosters, full initial-state pin `3bd1a9992908284f3a84216f86fcd5b90ed641874319185c741195d27ce8ad48`, initial/prefix receipts and first differing tick's **before** hash `a0d1b1e7e4ceb8d6157c19e93846c473e217eccf1dd0e7355dc4565b65227a01` at **1.30 s**. Earlier ticks match. At that decision FS has installed alley/A/+1, run belief, body position (29.14624,27.15307), velocity (-.19228,-.63923), upright support and no engagement. Its same .25-s-old RB picture is position (19.78665,27.56080), velocity (1.06839,-.36230), `carrying=true`.

| Request at 1.30 | Native baseline | Selected-policy candidate |
|---|---|---|
| Velocity yd/s | (+.58129,-1.16796) | (-.29248,+2.97111) |
| Facing | pi | pi |
| Responsibility | Receiver cushion | Existing alley cap |

This is a credible first-command repair. The retrospective result changes from untouched 86-yard touchdown to 31.34-yard tackle with one broken hold; that is **mechanism evidence**, not a desired tuning target or an NFL-rate estimate. The counterfactual borrows only the candidate ManCoverage.update into the unchanged native baseline Game prefix/PlaySim; it is not a full candidate-game claim. `ordinaryLightVerified=false` there means the altered play does not equal the original light result; its candidate observer/plain control remains true.

## Cues, randomness and diagnostics

No extra RNG call is added. The first-fit logger is guarded once and carries the actual installed kind, consumed picture age and target identity. `keyedFitRecorded` is advanced in recorded and plain runs alike. Alley `mind.aim` uses the established decision commitment, not a new snap timer or physical multiplier. New reads inside the existing run-fit controller can legitimately differ after the decision; subsequent trajectories and tackle draws need not preserve the original sequence.

The new tests cover the native alley contract/cap, controlled mirrored requests and World response, unchanged traction/work bounds, hidden current possession/position/handoff control, negative/unknown carrying, pass/unsure reads, play action, split-out backs, FB keys, airborne priority and recorded/plain body/RNG equality. The cue tests correctly state that they control interpreted pictures; the separate native receipt proves actual acquisition.

Useful small additions if another concern appears, not blockers for this diff:

- A true→false→true acquired-picture sequence while run belief remains fixed, checking appropriate responsibility changes and one-time logging.
- An already-engaged alley marker, proving existing contact owns its movement and the new branch supplies no extra drive or grant of reach.
- A naturally executed back-field pass release/checkdown under man, as an integration control for cue acquisition and ordinary coverage retention.

Do not require the 31.34-yard outcome in a unit test. Full suites, native panel observer parity and comparable broad regression panels remain the parent's shipment checks.

## Why arrival-v1 stays rejected

Archive source `485d383b354801a17e1f6c35edc2dc6b521a65447cd8425abc6809cd33bcc5f4` replaces every late-air catch-window fallback with `movingArrivalVelocity` carrying the first plausible receiver's observed motion and radius. C2-R improves 70→22.40 yards, C3 curl-flat R improves 13.95→12.12, PA-R remains 70, while PA-L degrades **41.96→70**. It is not justified to promote from the target tail alone.

The PA-L regression does not prove that arrival physics is wrong. Its initial CB_W wrap still occurs at 4.60; pre-solve separation at 4.65 changes only 1.41565→1.43365 yd. Both initial holds slip, and the later CB_S hold at 6.80 now slips at 7.30 instead of finishing the runner. Small state/geometry/RNG differences can change these outcomes. Diagnose the first changed cue/command before attributing the final touchdown to insufficient force or adding scenario-specific tackle strength.

## Next narrow diagnosis after alley

Start with **credible visible catch-window selection and commitment**, before another blanket movement replacement. In the saved baseline PA-L query, the first fallback at 3.35 selects blocking Y at (35.9794,28.4175), t3.40, only .05 s in the future. LB_M is at (44.9531,28.1678), moving (+3.7506,+1.7432), and requests (-9.1928,+.2557) toward this incidental near-release prospect. At that exact shared physical state arrival-v1 first changes LB_M's request to (-9.1180,+1.1407). The later defender-reachable catch spot is (58.6180,37.4374), t4.60.

`observedCatchWindow` treats every eligible offensive body as a full-leap catch prospect (maxCatchHeight*.92). Actual `catching.ts` gives nontracking players reactReach and excludes engaged players. Saved Y is physically pass-protecting with slow movement/high stance; ball height is approximately 3.24→3.43 yards across the relevant telemetry ticks. These actual readiness/contact facts cannot be handed to a defender as hidden `engagement`, called scheme or `ball.target`. First establish whether the already-acquired posture, orientation, movement, and visible contact cues support a conservative catch envelope or uncertainty. The exact flight sample and reactReach comparison must be retained before claiming a definite height failure.

A minimal next experiment should preserve the same ordinary World and record selected prospect, catch-window height/time, actual consumed cue and raw versus applied command. Retain real TE quick releases, short dump-offs, stationary receivers awaiting the ball, deflections/tips and reachable interceptions as controls. Only after eliminating phantom or implausible windows should a limited late-air turn/arrival change be judged on attainable separation/base rather than touchdown count. There is no evidence here that new anatomical detail or stronger contact forces is the next useful investment.

## Input byte receipts

- `out/coverage-continuation/native/G4-P127.json.gz`: `8ccfbce5654247f3091238c0b6360848337694e3d2eff6e6e25bbe8cdd0941bb`
- `out/coverage-continuation/counterfactual/G4-P127-baseline.json.gz`: `8ccfbce5654247f3091238c0b6360848337694e3d2eff6e6e25bbe8cdd0941bb`
- `out/coverage-continuation/counterfactual/G4-P127-candidate.json.gz`: `cb74077d845830fbb02387ec1b400d6a24b58413b588357c49328d67b97d9360`
- `out/coverage-continuation/arrival-v1.json.gz`: `35f75a50c8b526478329c6df150a32ce111543435a6ec974f65ce2aabc7bd163`
