# QB receiver forecast: acquired picture and installed prior

Recommend independent review of the **information repair**, followed by
Integration's exact combined verification. This does not establish better live
passing outcomes or whole-QB decision invariance.

Candidate **`0bed61d74f2e0d375a9a08239a4f4c1100855eab`**, branch
`codex/qb-receiver-estimate`, accepted base
**`0000e560e0dbe31905151465152d412ba838803d`** (#130), queue
`aa9ed35272cc334ce0a7c79eec709970e5c628fc`.
Source SHA256 `bbb59c82260e3c4bcd28ebe6ee33da6827602440cdba0c833a1865d02fa577d8`;
validation SHA256 `e1953155dba44dfebff64a20d2df8c4bee9c13fb2380732921c1a988ea2edfe9`.

## Demonstrated defect and correction

Previously evaluation and release called `RouteRunner.predict(receiver, dt)`.
Its ghost cloned live receiver position, velocity, facing, energy and sprint
load, along with private waypoint, settled state and mutable/converted path.
The cache was attached to that live route and the global simulation tick.
Ordinary teammate `see()` refreshes automatically after .05s; QBMind's existing
acquired memory contains defenders. Neither established an acquired QB receiver
estimate. Using live receiver position to aim gaze would also leak acquisition.

The new local boundary has two inputs:

- An immutable prior registered during pass assignment from the installed call,
  snap alignment, outside sign, known route-running/capability profile and
  installed delay. It builds its own path from the route definition. Deferred
  checkdowns are registered **before** protector release; neither their later
  release position nor a converted receiver path is copied as an installation.
- A QB receiver picture acquired inside the **existing** QBMind clear/peripheral
  sectors, using buffered reaction latency and the existing focus factors.
  The separate adapter does not use teammate `see()` or its automatic refresh.
  It preserves acquisition and original sample timestamps and reconstructs the
  raw sample position from the buffer's explicitly dead-reckoned picture.
  It adds no random draw or defender classification/gate change. The near-pocket
  defender-feel exception does not grant automatic teammate acquisition.

The route geometry and steering functions are extracted unchanged for the real
receiver and forecast. The ghost still uses `stepBody`, with nominal fresh
capacity as an explicit model prior; it does not read private current condition,
support, press contact or fatigue. It is a point forecast, not a promise that a
receiver can execute it through contact.

Acquired route progress is inferred from the sampled position/motion and
installed geometry. An off-route, opposed/perpendicular or ambiguous picture
retains `progress:null` and projects the **historically observed** motion under
the same movement physics. The route-centre tolerance is the installed physical
body radius; it changes neither collision geometry nor clearance policy. An
unobserved protection/fake release returns no forecast, rather than declaring a
stationary receiver. Observing a back still at his starting spot does not reveal
a private release. Installed-route prediction before acquisition is explicitly
an expectation, with unknown acquired progress.

Each forecast belongs to one observer/receiver pair and caches its immutable
estimate/picture. Absolute prediction time ages the held estimate without
refreshing it. Evaluation's initial range and release's re-aim use this forecast;
the direct live position/velocity fallback is removed. Receiver gaze targets
also use the held estimate or installed alignment. No global observation
transport, navigation/avoidance policy, movement capacity or collision code is
added.

## Focused evidence

Question: freeze legitimate inputs, diverge unseen receiver body/path/progress,
and check the two forecast consumers until a new acquisition.

| Consumer perturbation | Accepted70b4 before | Candidate after |
| --- | --- | --- |
| Evaluation aim displacement | 3.868 yd | exactly 0 |
| Evaluation flight time / completion estimate / value | all change | all identical |
| Later release aim displacement | 5.418 yd | exactly 0 |
| Release launch and arrival time, same random state | launch changes | all identical |

The regression file is identical in the corrected accepted-base and candidate
runs. It holds down/engagement eligibility and surrounding QB/defender inputs
fixed; it changes receiver position, velocity, facing, energy, sprint load,
private waypoint/settled state and mutable path. Evaluation compares held
pictures at .20/.40/.60s. Release advances .20 → .25s without acquisition.
The **first** before run passed release because the old same-tick cache masked
the leak; that receipt remains. The corrected later-release control exposes both
consumer failures. No assertion was weakened.

**31 focused checks pass** (11 new + 14 existing defender-memory + six existing
pass-installation). These include observer/estimate cache separation, unknown
conditional activation, ambiguous progress, delayed sector membership, unchanged
RNG, a before-break route bend, an actual QB `update()` starting an anticipatory
throw in a controlled open-window fixture, and a visible deviation reaching
**both** evaluation and release after acquisition. The anticipation fixture sets
the QB's own phase and an acquired empty defensive window; it is not a naturally
reacting play or evidence of live benefit. Typecheck passes. No new full snaps,
games, NFL scans or broad suite.

Runs used Node22.23.3, the 44 pinned baseline settings, components1, CF_FLOW unset
and native World defaults. See the [input manifest](../../../data/reviews/current/qb-receiver-forecast/input-manifest.json),
[summary/cost/compatibility](../../../data/reviews/current/qb-receiver-forecast/summary.json),
[corrected before log](../../../data/reviews/current/qb-receiver-forecast/before.log)
and [focused log](../../../data/reviews/current/qb-receiver-forecast/focused.log).
Measured validation command wall cost **31.302s**, including the first masked
release run, both candidate iterations and final typecheck. One earlier
uninstrumented typecheck passed; its duration was not captured. A missing
`/usr/bin/time` command exited127 without launching tests. Source inspection,
publication and Git/network time are excluded. This is validation cost, not a
forecast performance benchmark.

## Current-base portability and ownership

Initial implementation/test host
`5e15381af4b2ab0b9eb65c0ad3f97cdd5b7b12ca` is based on accepted70b4.
During work develop advanced through #130 to0000e56. A normal merge reconciles
that accepted change; the only conflict was WORKBOARD, and both entries remain.
The candidate differs from current accepted base in **six runtime files and two
test files**, plus its ownership record. No experimental dependency is imported.
The [portable patch](promotion.patch) contains exactly those eight source/test
files; documentation/evidence can be kept separately.

The focused evidence is reused, **not relabeled a fresh current-base run**.
All eight protected blobs match tested5e15381 exactly. The sole intervening
accepted runtime delta is a force-support condition in `CoverageDefender.update`;
none of these four test files calls that method or PlaySim tick/run. Dependencies,
config, physics and the rest of the runtime match. The final typecheck ran on
the original host; #130 already supplies accepted validation of the unrelated
delta. Full manifest/blob receipts support review; Integration owns one combined
verification and any live interaction question.

Coordination was posted **before runtime editing** to
[Awareness #36](https://github.com/tannerthardy/football-simulation-/pull/36#issuecomment-6229684442)
and [Pass/Integration #125](https://github.com/tannerthardy/football-simulation-/pull/125#issuecomment-6229684874),
then directly to [Pass #34](https://github.com/tannerthardy/football-simulation-/pull/34#issuecomment-6229754232).
No reply or owner approval is inferred from silence. Defender coverage gates,
the held Pass candidate and Run/Physics files are untouched by the extraction.

## Limits and next decision

The independently justified repair removes a forecast information leak.
No football-benefit or full decision-invariance claim is made. Remaining live
reads include receiver eligibility/behavior readiness, matchup/range ordering,
decoy-side selection, pocket-facing/play-action targets, defender condition and
engagement in window/protection calculations, and scramble/option-route policy.
Those are recorded debt, not silently migrated or prerequisites for this patch.

The prior describes the installed base route; an unobserved option conversion
is unknown. Observed deviations can change the motion forecast without granting
the converted path. Historical velocity is not current-motion certainty.
Nominal condition, contact-free prediction, geometric phase inference and stale
motion remain modeling uncertainty. There is no route-clearance certificate,
new memory expiry/refresh policy for existing Awareness, or claim to resolve
press, protection, scramble or live pass outcomes.

Next: Pass/Awareness independently review this narrow contract and Integration
verify the exact combined extraction. Keep broader behavior tuning and global
collision avoidance deferred.
