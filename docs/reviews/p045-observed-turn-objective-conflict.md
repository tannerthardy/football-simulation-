# P045 acquired-turn assigned-man test: stop and review the objective

**Decision: stop adding variants; no controller change is ready for integration.**
The existing bounded hip/plant interpretation uses legitimately acquired cues
and improves on plain assigned-man tracking. Against the accepted controller,
it still trades arrival alignment and across-route position for speed without
earning contact. This is an unresolved football-objective conflict, not evidence
for a speed, perception, grip or physics adjustment.

## Question, source and boundary

Can retaining the acquired assigned receiver, interpreted by the existing
`RouteObservation`, improve P045's achieved approach after the ball contest
becomes infeasible? Compare position, velocity and leverage together; neither
a tackle nor a touchdown reversal is required.

Research branch: `codex/yac-observed-turn-native`, based on fetched develop
`7d1451b2c31786e075550183a6a93bbda23da29b`. A handoff fetch and GitHub branch
query confirm that pin. The repository's narrow remote fetch mapping leaves
`origin/develop` stale; the explicit fetch result is `FETCH_HEAD`. The accepted
runtime remains `8c891f4cf887b54297efbbc4c7993ba5e2f318b5`; the intervening
authorized #65 merge changes documentation only. Source, tests, scripts,
config and dependency files match the accepted runtime before this experiment.

| Arm | Engine source SHA256 | Evidence |
| --- | --- | --- |
| Accepted point arrival | `2402d98170109b92a3a862609e6fc2fadd5114d56524a332c024e77b898df9ad` | Reused accepted native tape from the [previous experiment](https://github.com/tannerthardy/football-simulation-/blob/f5db48929b28bc914e53bce39eb530bdd469d3e9/docs/reviews/p045-assigned-man-native.md). |
| Plain assigned-man retention | `78b6de605643c981158d617d0b5a7aa1606aa9a3f700d94385bf7bb1c60083b2` | Reused previous rejected prototype, unchanged. |
| Existing bounded hip/plant interpretation | `f0e1fafae495ba95c150f8cf13d1c204702d131bf1df318a3bd7dbd4af0fc17c` | One new native candidate, archived and then removed from active source. |

All arms use the same frozen P006/P010/P045 setups, actual players, seeds,
44 accepted flags/components=1 and ordinary World defaults. Per-arm provenance
in the [compact evidence](../../data/reviews/current/p045-observed-turn-summary.json)
records every flag, collector, lock, Node and source fingerprint. Node is
22.23.3, Linux x64. Input SHA256 is
`60c1f27e6f940b13eb8dc95a447ceeac449ea3ef11bf633264694b4a7649168d`.
No new game prefix, fresh-player batch or NFL collection was needed.

The prototype only connects `ManCoverage`'s existing observation reader to
`playBall`'s no-window, unattainable-ball assigned-man request. It maintains
that reader from pictures already acquired before throw recognition, while
preserving those pre-recognition requests. Genuine receiver windows and
reachable ball contests keep their original priority and original pictures.
There is no new sensing, draw, persistence timer, private route or intended
target input. The interpretation law, controller capacities, helper policy,
movement machinery and all contact physics remain unchanged.

## The cue was acquired in time

Actual defender: **H2-CB2 / CB_W / index18**. Actual receiver:
**A2-WR1 / X / index8**. Saved consumed images are checked against the exact
past sensing boundary at `decision time - picture age`: velocity and facing
match; position matches the model's dead reckoning within 1e-9. All 32 images
from 2.20 through 3.75 seconds pass. Historical bodies serve only this audit;
the controller receives the delayed picture, never future receiver movement.

| Decision time (s) | Sample time (s) | Acquired speed (yd/s) | Facing minus velocity heading |
| --- | --- | ---: | ---: |
| 2.45 | 2.20 | 7.812 | 0.00 degrees |
| 2.50 | 2.25 | 7.728 | 0.00 degrees |
| 2.55 | 2.30 | 7.441 | 0.00 degrees |
| 2.60 | 2.35 | 7.149 | 0.00 degrees |
| 2.65 | 2.40 | 7.219 | -3.74 degrees |
| 2.70 | 2.45 | 7.282 | -17.57 degrees |
| 2.75 | 2.50 | 7.351 | -29.75 degrees |

Observed deceleration supplies the existing plant interpretation before the
first changed request. The first acquired torso-turn cue is available at
2.65 seconds, when the no-contest request first changes. Here “plant” means
deceleration evidence; it is not an anatomical foot observation. Facing is a
simulation visual cue, not measured gaze or guaranteed receiver intention.

The passive recorder captures both the judgment reader and the man reader.
The audit reconstructs the actual movement request to identify which forecast
was used: **23 uniquely matched man interpretations**, all from consumed
pictures and within the existing lateral-capacity turn bound. At 2.65 the
used confidence is .48147 and horizon .24376 s; the separate higher-confidence
judgment forecast is not mislabeled as the movement input. Record/plain
native signatures match, so instrumentation adds no behavioral information.

## Achieved football movement

At the catch boundary, 3.75 seconds, the receiver's actual body trajectory is
identical across arms. These are achieved velocities and positions, not requests.

| CB_W relative to X | Accepted | Plain retention | Bounded hip/plant |
| --- | ---: | ---: | ---: |
| Speed (yd/s) | 7.553 | 8.634 | 8.620 |
| Velocity-heading difference from X (degrees) | 2.04 | 12.59 | 10.29 |
| Separation (yd) | 2.485 | 2.697 | 2.523 |
| Radial closing speed (yd/s; negative means opening) | -1.164 | -1.122 | -.821 |
| Along X's current travel direction (yd; negative means behind) | -2.421 | -2.457 | -2.379 |
| Signed across X's current travel direction (yd) | -.563 | +1.111 | +.842 |

The bounded read corrects part of plain tracking's angle and separation cost.
It also retains more speed than accepted arrival and opens the gap more slowly.
However, the apparent .861-yard improvement along field x is mostly movement
across the bending route: the corner still trails by about 2.4 yards along the
receiver's actual travel, while the across-path offset changes side and grows
in magnitude. A heading difference alone is not an interception-quality score;
the joint position/velocity result does not establish useful arrival leverage.

There is a real later gain worth preserving in the record. At 5.00 seconds,
separation is 3.091 yd accepted, 2.122 yd plain and 1.990 yd bounded. The bounded
arm reaches 1.968 yd at 5.30, versus plain's 2.094 yd minimum and accepted's
2.485 yd minimum at the catch. **None earns receiver contact or a grasp.** Grip
entry, survival, transmitted load and runner recovery therefore remain
unavailable, not failed. All three plays finish as 49.504-YAC touchdowns.
Their common ending is neither the reason to reject the prototype nor proof
that the approaches are equivalent. #2's vertical threat and safety assignment
remain in place; helper coordination is not changed or credited with a repair.

## Why stop here

The fixed landing objective commits across the route earlier, then brakes
toward a point. Assigned-man tracking carries more speed with the acquired
receiver motion, but mostly follows that moving image rather than earning a
receiver-relative interception corridor. The existing bounded turn read
improves the forecast; it does not resolve that objective choice. Both arms
remain outside the existing moving catch approach because P045 supplies no
receiver catch window.

The first divergence is during flight at 2.65, over a second before the catch,
so this is not evidence for an isolated one-tick catch-to-pursuit repair.
The previously diagnosed earlier off-man cushion request also remains outside
this edit; a late objective change has not recovered the lost leverage.

Review should settle what reachable receiver-relative corridor and arrival
velocity a defender should pursue when a ball contest is infeasible, and how
that objective relates to existing ball/window interception priorities. Do not
stack another forecast parameter, arrival gate or speed adjustment onto this
tradeoff. This bounded experiment does not determine an optimal corridor or
establish the population cause of explosive YAC. No further variant or transfer
batch is started; the current local mechanism does not justify promotion.

## Controls, cost and reproduction

**44 affected TypeScript checks pass** across catch-phase control, catch reach,
coverage mechanics and coverage rules. They cover reachable ball contests,
genuine alternative receiver windows, hidden-state invariance, acquired plant
and hip changes, pre-recognition observation history, and no extra read/draw.
The existing turn-cap/braking contracts are reused without changing the law.

P006 and current-source P010 retain identical signatures, every saved World
row, consumed picture and request. P006 remains a completed tackle with
-.079 YAC; current-source P010 remains a completed tackle with .323 YAC.
P010 was an interception on the older research source; this experiment does
not claim that historical ending on accepted develop. There are no censored
plays. The previous plain-retention fresh-play result is reused as adverse
evidence: its smaller ending followed changed tackle execution draws with an
identical entry approach, so it cannot supply missing causal transfer here.

New work costs **six native executions** (three selected cases, recorded/plain)
and **15.828 launcher-command seconds** including focused tests and saved-data
audits. The audits execute no World steps; they are not extra native plays.
No full suite, typecheck/build campaign, roster sweep or game campaign ran.
[Launcher receipts](../../data/reviews/current/p045-observed-turn-receipts.json)
retain exact commands, source/test fingerprints, flags, exit status and runtime.

Active source and tests are restored to accepted bytes. The complete rejected
[controller patch](../archive/research/catch-contact/p045-observed-turn.patch)
and [test additions](../archive/research/catch-contact/p045-observed-turn-tests.patch)
remain reviewable. Applying both with `git apply --unidiff-zero` in an isolated
checkout at the base above reconstructs the tested prototype; reconstruction
was verified using a temporary Git index. They are archives, not integration
instructions. Native replay uses the [frozen inputs](../../data/reviews/current/p045-defensive-inputs.json):

```sh
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/p045-native.mjs flight data/reviews/current/p045-defensive-inputs.json out/your-review/bounded.json.gz
# Reuse compatible tapes, or recreate each arm at its exact source above.
# This comparison derives cue timing from the baseline tape; no separate data pipeline.
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/p045-observed-turn-review.mjs out/p045-assigned-man/accepted-native.json.gz out/p045-assigned-man/candidate-native.json.gz out/your-review/bounded.json.gz out/your-review/summary.json --compact
```

Full body/step archives stay in ignored `out/`. Published compact evidence
SHA256: `5693b5959ad09d2c0ca68427ce13196e044ab55b00b697f816bd575784cf9f21`.
