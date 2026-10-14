# Keeper runoff and the RB's actual wide-zone read

The keeper's runoff and the runner's route must be evaluated together. A loaded
block can protect an inside route while leaving an outside route contested.
Conversely, a visible inside opening is not useful if the runner cannot redirect
through it before the end closes, or if his helper is still occupying that path.
The evidence supports this principle, rather than a rule to release sooner or
forbid runoff.

There is one independently reproduced default-controller inconsistency: the
runner commands the **live moving aim** during his press phase, but evaluates
early abandonment against the **original snap aim**. In the failed rightward
control those points differ by **1.433 yd at 2.20 s**. This is a demonstrated
assessment mismatch, not proof that changing the assessment rescues the run.
The successful control also has it. No controller policy is changed while the
passive angular-law witness remains unresolved.

## Scope and the runner's information

Comparison remains `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`. The same three
declared inputs are preserved: `uc12-wz-s3`, legacy `uc12-wz-s3-mirror`, and
`uc12-wz-weak-s3`. All use under-center singleback `ace_12`, two attached TEs,
Over/Cover 3, no fullback, seed 3, roster seeds 31/32, strength .55, LOS 40.
The legacy mirror is a TE-placement contrast; the weak call is the opposite
direction against an asymmetric front. Neither is a complete reflection.
G73-I48 and the withdrawn unsafe early-release control remain secondary and
unchanged. There are no new controls, games or census.

The actual reference runner uses `BallCarrier`'s default press/crease policy.
`RUN_READ=0` and `RUN_READ_TURN=0`; the experimental key-read policy is not
silently enabled. At the recorded decisions he consumes teammate pictures
with .05-s age and an end picture with .25-s age. Position is already
dead-reckoned from the old velocity. These are available observations, not
current truth or knowledge of the next defensive move. The diagnostic listener
records existing calls and already-computed results; it makes no extra `see`
call and consumes no RNG.

He can observe the end's location/velocity/pose, the keeper's location, moving
inline bodies, apparent apertures and threats around proposed entries. He
does not consume the keeper's private runoff calculation, hand forces, future
grip survival or a promised block win. The default selector nevertheless reads
current `d.engagement` and gives a .25-s tied-up allowance; this is an existing
state shortcut, not a recorded visual observation. It scores arrival at the
entry, with defender body radius, rather than screening the entire approach
for arm access. These are model limitations; they do not prove another lane
was safe or that the current football ending was wrong.

## Three different protection/read interactions

| Control | Acquired options and actual decision before contact | Interpretation |
| --- | --- | --- |
| Rightward, Y playside | At 2.30 the RT/RG aperture is .426 yd, above the selector's .386-yd threshold. The RB selects that inside crease. At 2.50 he asks to redirect further inside, but traffic and momentum keep him moving outward. At 2.95 he selects bounce; by 3.20 the acquired end is .412 yd inside the keeper, and his outside approach clears the end. | Useful runoff plus a developing inside-to-outside route. RT retains end load, Y/C collect linebackers, LOS crossing is 3.60. The intentionally free SS first contacts at 3.65. Preserve this ordinary clean arrival. |
| Same rightward call, H playside | At 2.30 the helper occupies the space between RT and RG. RT/H apparent width is negative and H/RG is only .292 yd, so neither near crease is offered. The next inside candidate is RG/C at (40.677,23.393). The end is .480 yd outside RT in the RB's acquired picture. Bounce at (40.642,20.270) has slightly more threat risk (2.039 vs 1.876), but wins total score (2.435 vs 3.885) because it follows the preferred track. He chooses bounce again at 2.50. | This is not an obviously free bang lane ignored by the RB. An unloaded inside request still carries him outward through the next beat and predicts keeper traffic. H really collects LB_S at 2.00, while DE_S contacts the RB at 2.65 with RT's hands still loaded. Route selection is questionable, but a superior safe alternative and a physically legitimate end win are both unproved. |
| Explicit weak call, H playside | The early-abandon condition succeeds at 2.20; the actual crease choice starts at 2.25. Bounce is the lowest-scored available entry. At that time the acquired end is .500 yd outside LT, and even the unloaded runner cannot instantly reverse his outward momentum. The end grips him at 2.30, only one tick later. | The last read leaves little physical room to change the approach. That does not prove a better earlier read existed: it needs the same acquired information and a feasible route, not a forced early cut. H/RT have not collected their backers before contact, but the first stopper is the assigned, loaded first-level end. Positive ending gain (+2.372) is not clean protection. |

The ordinary seven inline assignments account for four DL and three LBs; the
receivers handle corners, leaving safeties free. The successful play's SS is
intentionally unblocked. In both adverse approaches, the first stopper is an
assigned end with a loaded keeper, not a defender omitted from the assignment
ledger. Failed or late linebacker collection is a separate later risk.

## Requested movement is not achieved movement

The [trace](under-center-zone-runner-trace.json) retains each precontact read,
consumed pictures, aperture constraints, requested/delivered/achieved native
movement, keeper forces/support and a compact 50-ms runner path. Blocker
behavior-level stand is not the contact foot request.

For the failed rightward run at 2.50 s, RT's contact foot request is
(-2.034,-1.981) yd/s. Before World, spacing changes the delivered request to
(+1.534,-2.117); achieved velocity is (+.921,-1.185). The downfield sign change
already occurs before physics, so it must not be blamed on World. It also does
not by itself prove a spacing error: teammate collision avoidance has a real
contract. No shared movement file is changed; any future change belongs with
the YAC owner.

At the same instant the RB requests (+7.862,-5.354), receives
(+1.979,-5.169) after spacing, and achieves (+2.716,-3.160). He cannot teleport
to the entry or instantly cancel lateral speed. In the successful control at
2.50 he requests (+8.398,+4.466), receives (+.733,+.684), and still achieves
(+1.347,-1.476): even a clean approach includes temporary failure to execute
the requested inside turn.

Scratch movement controls use the runner's exact own body/support/profile,
existing World in empty space, full speed without squeeze, and the recorded
finite decision beat. They re-aim toward a frozen observed entry for at most
1.5 s. A separate held-heading result avoids calling a fixed-heading miss
physical impossibility; their first steps match existing `previewFreeMovement`
within 1e-12 and never mutate the source body. Constant-velocity peer and end
screens expose contested paths, but neither those screens nor free reach
estimates predict a defender constrained by a hand joint. No alternative live
ending is generated, and a missed .65-yd entry tolerance is not a proof that
all possible movement commands fail.

## Precise independent controller witness and physical blocker

The [27 KB read witness](under-center-zone-runner-read-witness.json) retains
the failed rightward 2.20-s interval and its exact source/flags/input.
`BallCarrier.update` commands `liveAim` (x40.6,y20.634), while
`BallCarrier.evaluate` uses `this.opts.aim` (x40.6,y22.067) for `aimHeading` and
the designed-lane penalty. Its recorded score improvement is .789241, below
the .897959 early-abandon threshold, so it keeps pressing. That check assesses
a different lane from the one it is driving. At the same beat the successful
control has a 1.386-yd mismatch; the weak control has .888 yd and does abandon.
Thus the inconsistency transfers beyond the losing play, while improvement in
actual protection remains untested. No new timer or lane preference is added.

The existing **13,076-byte RT/DE_S World input** remains unchanged. Its clean
passive free pair has angular change +15.153603 with no external ground,
contact or strike; reduced native replay error is 8.44e-15. The defect is
proved, its effect on the football endpoint is not. We cannot certify these
end wins as physically legitimate or declare every loss a runner error.

The sole physics owner has the [pinned handoff on PR #2](https://github.com/tannerthardy/football-simulation-/pull/2#issuecomment-6159265851).
The audit/integration owner has existing exact PR #9 evidence on
[PR #9](https://github.com/tannerthardy/football-simulation-/pull/9#issuecomment-6159266104)
and [its PR #10 extraction](https://github.com/tannerthardy/football-simulation-/pull/10#issuecomment-6159266455).
Those nine earlier pin/default/component pairs and small adverse component
changes remain applicable. They do not verify the exact combined extraction.
PR #11 remains diagnostic and must not be merged as a production feature.

The next decision is bounded: obtain the reviewed law on the same keeper
interval/control, then test whether aligning the existing RB assessment with
the live aim improves protection through arrival. Keep cadence, capacities,
assignments, runoff, free safeties and all release/hand policies unchanged.
Any candidate must beat its opposing control on actual information and
achievable movement, rather than a yardage target. No new baseline before review.

## Reproduce and reuse

Use Node **22.23.3**. Runtime source is still PR #4
`09c65f70ff3835dba17fb08487582d65f49eaea827f4e6e48f396f93210b773c`.
Full resolved flags, exact collection/analysis revisions and costs are in the
[runner receipt](under-center-zone-runner-validation.json). Components,
handover, motor, active hands, hand fight and reach-track remain 0. Both input
manifests and the angular witness are byte-unchanged from `f867fa3`.

Only if saved packets are unavailable, collect the initial two controls with
the command below, then repeat using `under-center-zone-direction-inputs.json`,
`carrier-design-weak-checks.json` and `carrier-design-weak.json.gz`. Existing
`native`/`weak` and actual-pin packets are reused for complete-history checks.
The earlier guide explains obtaining those packets; no fresh pin or component
run was needed in this task.

```sh
env -u HAND_REMOVE -u HAND_KEEP \
  FLOW_INPUTS=docs/reviews/under-center-zone-inputs.json \
  FLOW_STOP=25 FLOW_TRACE=1 FLOW_PEERS=1 CONTACT_TRACE=1 FLOW_CARRIER=1 \
  npm run baseline:run -- --candidate --receipt out/under-center-zone/carrier-design-checks.json -- \
  node --import tsx scripts/diag/defense/hand-action-panel.ts out/under-center-zone/carrier-design.json.gz

npm run baseline:run -- --candidate --receipt out/under-center-zone/runner-compact-final-checks.json -- \
  node --import tsx scripts/diag/under-center-zone-runner.ts
```

Six new observed/plain replays (two diagnostic passes on the same three
controls) match the saved and actual-pin complete histories through the same
native endings. The second pass resolves the specifically missing early-abandon
result without a second evaluation call. Collection costs 12.82 recorded
command-seconds. Including offline refinements, one failed argument invocation
retained in the receipt, and typecheck, total recorded commands cost **35.75 s**.
Typecheck passes on the final diagnostic source. Zero additional games, full
suites, new football inputs or behavior changes; no protection improvement or
regression is claimed from observational work.
