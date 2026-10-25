# Defensive lateral start: shared witnesses

Baseline: `03d5470`. Second-sim owns defensive recognition/free fit instructions. The blocking owner owns offensive contact movement; shared physics and tackle work remain elsewhere. Neither this diagnostic nor a defensive candidate may change offensive block policy or capacities.

The [shared input manifest](../../data/reviews/defensive-flow/input-manifest.json) freezes 24 reps: two seeds of mirrored OZ, IZ, power and counter in Ace 11 versus Over/Cover 3, roster 31/32 at strength .55; mirrored draw, outside/inside play action and OZ gap-exchange controls. LOS 40, ball at midfield width, first down 50, default center-hand World; experimental RB read/turn switches cleared. Runs are observed through the whistle or 3.5 s, with missing late samples marked absent. Mirrored calls are paired controls, not guaranteed identical bodies because the roster/front have different players and responsibilities on each side.

`scripts/diag/defense/flow-panel.ts` records every actual opponent observation consumed by defenders, recognition state, pre-contact-layer behavior commands, final applied intents, achieved velocity/position, hand loads, contacts and support. A standing behavior command on an engaged DL is not his final request: the contact controller replaces it. Each recorded rep is checked against an uninstrumented execution with per-tick state fingerprints. No extra perception or random draws are introduced.

```sh
env -u RUN_READ -u RUN_READ_TURN node --import tsx scripts/diag/defense/flow-panel.ts out/defensive-flow/baseline.json
```

Use the same manifest, source baseline and default World for the four comparisons: baseline; defensive-only; offensive-only; both changes. Identify the offensive change by commit and isolate it from unrelated physics changes. Record stage source hashes. The remotely available October 8 `codex/run-blocking-decision-dynamics` and October 11 `claude/trench-investigation` change a different engine/physics stage; they are not valid clean offensive arms for this baseline. A current offensive contact-intention patch is still needed for the final combined comparison.

The late-sample operator is repaired in `scripts/diag/trench/timeline.py`: requested seconds require a live recorded sample before frame-index clamping. Velocity windows stop at the whistle and start at an actual frame inside the requested interval, short plays retain early samples, block episodes at the final live frame are censored, and puller rates use observable two-second plays. Four synthetic counterexamples verify the ended-frame clamp, short-run inclusion, post-whistle velocity contamination and an ended frame incorrectly substituted for the start of the speed window. Historical exact 3-second deficits await recomputation on the original NFL/game files; those files are absent here.

## Result: planner activation is a real omission, but insufficient

The one experimental change activates the existing body-aware lateral planner for an insert's already-read pull when his held target agrees with that pull. It changes no cue threshold, target, decision interval, fit responsibility, speed/acceleration/traction capacity, offensive controller or contact policy. `PULL_PLAN=1` enables it; **default remains off**. `RUN_READ` and `RUN_READ_TURN` also remain off. A newly observed pull cannot amplify a still-held action away from it; eight focused tests check that phase boundary, mirrored requests, unchanged bodies/targets and edge/force/cutback/lag exclusions.

We ran the original 24 witnesses and a [fresh 16-input set](../../data/reviews/defensive-flow/fresh-input-manifest.json), seeds 11/19 and rosters 41/42. Both arms of all 40 inputs were observer-neutral. The updated probe also records actual desired and held `mind.aim()` targets, without extra observations. All 24 default-off trajectories exactly match the first baseline fingerprints. The [matched summary](../../data/reviews/defensive-flow/summary.json), [fresh summary](../../data/reviews/defensive-flow/fresh-summary.json), [selected cue/body witnesses](../../data/reviews/defensive-flow/witnesses.json) and [raw trace receipts](../../data/reviews/defensive-flow/trace-receipts.json) retain source/probe hashes and adverse cases. Both arms use source SHA-256 `4bf29af60ba98e1b24f4c9db89d98f300887339a2a2028a16c4df6d2c31c1b01`; only `PULL_PLAN` differs. Recorded commit `1a3ef1e` identifies the parent; source hashes identify the then-uncommitted candidate exactly.

Mean LB lateral displacement at exactly 2 s, in yards toward the called side (all three backers, including distinct backside/support duties):

| Inputs | Baseline | Pull planner | Reps |
| --- | ---: | ---: | ---: |
| Shared power | -0.236 | -0.243 | 4 |
| Shared counter | -0.201 | -0.178 | 4 |
| Fresh power | 0.126 | 0.132 | 4 |
| Fresh counter | 0.000 | 0.002 | 4 |

This is a descriptive paired movement comparison, not a target requiring every backer to flow playside. OZ/IZ trajectories are exactly unchanged in both panels; OZ exchange and PA Flood controls are also unchanged. Both Draw controls and both PA Post Dig controls change, starting at 1.9/2.1 s and 1.35/1.45 s respectively. Their observed gain is unchanged, but the candidate has not established that its altered movement preserves misdirection responsibility. The movement benefit is too small to justify promotion.

## Separate the mechanisms

**Cue arrival:** In `power-s3` and its mirror, the puller's true lateral speed first exceeds 1.5 yd/s behind the line at 0.75 s; LB_M's consumed picture first shows it at 0.95 s, age 0.20 s. In `counter-s3`, those times are 0.85 and 1.05 s. LB_M already reads run at 0.35 s in all three. Lowering generic run/pass recognition latency therefore does not directly repair these failures. The pull is acquired later than the run belief, with part of the delay belonging to actual offensive movement and part to observation.

**Block classification and target adoption:** The useful pull-fit adjustment appears at 1.10 s in power, 1.30 s in mirrored power and counter. There is an additional, concrete instability in `power-s3`: `linePicture()` calls a lineman departed after a half-yard backstep and a one-yard lateral shift. The guard hovers around that depth boundary while visibly continuing his pull:

| Decision time | Seen guard depth from stance | Seen lateral speed | Newly desired LB_M y | Held y |
| --- | ---: | ---: | ---: | ---: |
| 1.10 | -0.501747 | -2.091 | 25.706 | 26.688 |
| 1.15 | -0.497269 | -2.262 | 26.819 | 26.819 |
| 1.20 | -0.516717 | -2.406 | 25.242 | 26.819 |
| 1.30 | -0.548022 | -2.678 | 24.815 | 26.819 |
| 1.35 | -0.542349 | -2.790 | 24.608 | 24.608 |

At 1.15 the classification drops out just when the next held target is adopted, although lateral pull speed has increased. The old-side target is then retained until 1.35. This is a block-picture/decision-phase failure, not proof of inadequate player capacity. `fit-pull-read` tags persist; their continued presence must not be treated as evidence that the current tick still recognizes a pull. No shared `live-gaps.ts` policy was changed in this investigation.

**Recognized cue, weak request:** The baseline planner gate recognizes a moving gap or the back's declared flow, but excludes a pull-adjusted target unless those other conditions also happen to apply. For `counter-s3`, at body time 1.50 s the baseline lateral behavior request is 4.32 yd/s; the candidate requests 9.21. Targets and decision cadence are the same. An initial ungated activation also strengthened the old target before adoption; the final candidate excludes that phase mismatch instead of forcing an early target change.

**Requested work, constrained execution:** At that same counter instant, spacing reduces 4.32 to 2.16 in the baseline and 9.21 to 4.60 in the candidate; achieved velocity is only 0.15 versus 0.21. By 2 s the middle backer's displacement is 0.547 versus 0.569 yd. In `power-s3`, at 1.5 s spacing reduces the baseline's 3.72 request to 0.94, and the candidate's 9.21 to zero. At 2 s RG is engaging him and the contact layer supplies the request. Increasing the earlier free-fit request has not improved his arrival.

OZ has a different limit. In `oz_strong-s3`, LB_M already requests 9.21 at the decision before 1 s, achieves 1.54 at 1 s and 3.48 at 1.5 s, and moves 2.79 yd by 2 s. DT_S is engaged with RG at 1.5 s: its final lateral request is 4.56, achieved speed 1.20; RG's final request is 0.47, achieved speed 1.38. The defender consumes RG's delayed 1.44 speed cue and holds a shoulder target about 0.61 yd playside. That is substantial defensive intent under contact, while offensive intent is much smaller. In mirrored OZ another DT requests against the called flow to preserve its shoulder, and an engaged LB's final request also differs from his pre-contact standing command. Calling all these cases “defenders do not ask to move” would miss both fit geometry and contact execution.

## Contact and outcome evidence

Contacts here mean the first positive native RB/defender **body impulse after handoff**, with time bounded by its 0.05-s step. Depth is the RB's position after that step. No contact by 3.5 s is censored, not a guaranteed clean arrival. Gain is the observed spot at whistle or stop; many gap plays are still live, so these are not final rushing averages.

- `power-s3`: first contact starts at 2.75 s in both arms, depth -1.50 versus -1.55 yd; completed gains -1.496 versus -1.543. Stronger asking did not help.
- `power-s3-mirror`: contact 2.90 s, depth 1.24 yd in both; completed gain 2.639 in both.
- `counter-s3-mirror`: contact shifts from 2.55 s/-1.65 yd to 2.80 s/-1.15 yd. Baseline finishes at -1.436; candidate is still live at 3.5 s, spot -0.631. This later contact is adverse for the defense and cannot be reported as an improvement merely because the RB gains more.
- `counter-s7-mirror`: observed RB spot 0.970 versus -0.284, both still live and without a positive body impulse by the stop. This goes the other way; neither is a final gain.
- Fresh `counter-s19`: contact shifts from 3.00 s/-0.84 yd to 3.40 s/0.04 yd, observed spot -0.943 versus 0.046, both censored. Fresh `counter-s19-mirror` goes the other way, 3.40 s/1.21 yd versus 3.35 s/0.87 yd. Every individual result, including missing contacts, is retained in the summaries.

## Handoff and next priority

The strongest new defensive lead is **unstable recognition of an already-visible pull at the line-departure boundary, coupled to adoption of a held fit target**. A separate comparison should address that cue/phase continuity before stronger lateral requests are promoted. Contact work is a second, distinct question: preserve fit geometry while comparing requested intent, spacing reductions, hand load and achieved motion on these same bodies. These observations do not establish that blockers alone explain the deficit, or that physics capacity needs raising.

Use `power-s3`, `power-s3-mirror`, `counter-s3`, `oz_strong-s3` and its mirror as the shared first witnesses; keep the full controls. The offensive owner should supply an isolated contact-intention change against `03d5470`, not the older parked leverage/physics packages. The four-arm protocol is ready, but **offensive-only and combined arms are pending that actual patch**. On its isolated stage, run this same manifest with `PULL_PLAN=0` for offensive-only and `PULL_PLAN=1` for combined; rerun baseline/defensive-only with the same probe and compare source hashes. Combining with this rejected experiment is diagnostic only, not an endorsement of either default.

Validation: 1,513 native tests pass, with the same single pre-existing Tite failure at `test/zone-helper-check.test.ts:440`; 145 Python tests pass; build and typecheck pass. Physical source, blocker instructions, engagement policy, recognition timing, mesh and RB policies are unchanged. No final 3-second NFL deficit is used as a tuning target.
