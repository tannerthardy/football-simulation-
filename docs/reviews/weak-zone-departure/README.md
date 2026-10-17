# Weak wide zone: departure alternatives and the earlier helper frame

**Park both departure alternatives. This is diagnosis, not an integration-ready
controller correction.** The moving-corridor trial advances LG substantially,
but neither alternative protects the runner from Mike. The later LT spacing
adjustment has a demonstrated clearance purpose. An independent contract audit
now demonstrates that the authored playside combination landmark falls on the
side rejected by the fallback recovery frame for wide/outside zone. Which
approach or initial contact surface should change remains unresolved. Review
that contract before first hands; keep the independent pace correction in
PR #122 separate.

## Comparison and input

Accepted production is `d682b1f474cb6ba260a7b8b1119a62919c5a2159`, engine source
`bed3c36cf08407762fed67abdf0a1651fe6ed7fc8c09b43ab3d9b33f1dfd4616`.
The full baseline passive replay matches the previously saved accepted native
histories for all 22 players. Historical `4ded6b6` remains the historical law
comparison; it was not relabeled or rerun here.

The saved native input is Ace12 under center, wide zone weak, pair11 offense
seed 11/defense seed 12, strength .55, play seed 77, Over43 Cover3 box/stack,
LOS 40/ballY 26.67, no audible or hurry. All 22 players retain ordinary reactions.
Weak runs toward +y: LT reaches DE_W, H owns Will, C/LG combine DT_W with Mike
as the next job. Positive x is upfield. This attached-H surface is not an open
tackle edge or an exact mirror of the strong call.

Node 22.23.3 and all 44 accepted settings remain fixed, including
`RUN_CONTACT_COMPONENTS=1`, `CLIMB_INTERCEPT=1`, `CLIMB_PLAN=1`, `KEEPER_TORSO=1`,
`RUN_CONTACT_TRACK=0`, active hands off and `CF_FLOW` unset. No capacities,
rosters, contact laws, release times or other controllers were changed.
The [portable manifest and small traces](../../../data/reviews/current/weak-zone-departure/manifest.json)
record exact flags, defaults, script/input/output hashes and receipts.
The [6,028-byte frozen setup](../../../data/reviews/current/weak-zone-departure/ace-weak-over3.setup.json.gz)
preserves all 22 initial bodies/profiles exactly; its SHA256 is
`d0924ac559b25f6a00a5ba31fb2b3f0d9b009c6cddcd23de66d3dcbdafd127c5`.
Exporting this input advances no World ticks.

## Two rejected alternatives

All times below are native event/controller times unless explicitly labeled
post-World body samples. The body endpoint following an event is .05s later.
LOS crossings use post-World body samples.

| Arm | Change | Release / keeper | LOS crossing | First runner contact | LG/Mike load | Gain / terminal time | Offensive teammate impacts |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Accepted | None | LG 1.10 / C | 2.60 | Mike grasp 2.80 | None | 5.34 yd / 4.00s | 0 |
| Same-waypoint through | LG requests continuous movement through its existing acquired escape waypoint; cadence, waypoint, other command fields and spacing stay intact | Same | 2.60 | Mike grasp 2.80 | None | 5.24 yd / 4.00s | 0 |
| Moving corridor | Departure uses the existing acquired moving-backer interception forecast for its corridor and arc destination | Same | 2.60 | Mike grasp 2.80 | None | 5.35 yd / 3.95s | 0 |

The first alternative tests whether station-keeping at the short waypoint is
the sufficient cause. It is not: faster traversal of the same waypoint does not
produce useful collection. It remains a diagnostic override, not a production
solution. Preserve this negative result rather than increasing its speed again.

The moving-corridor trial is saved in held commit
`9099d19b2cdc1e4a3326c892fe197c050d5e2857`, source
`c639a7ef432b702a112d72ef2cf00b65dea6b7abe6780024f594a57b1d119eb1`.
Its runtime patch is withdrawn from the current working implementation. Neither
PR #117's contact-following candidate nor PR #119's runner assessment nor
PR #122's pace correction is included in these comparisons.

At release 1.10, LG observes Mike at (44.046,26.464), moving (-1.784,+1.278),
age .25s. LG is at (39.909,28.090), moving (-.444,-.530). Using Mike's current
position selects the inside/backfield exit (39.626,27.857). The existing
interception estimate selects the outer exit (39.810,28.443). Both pass the
existing acquired-pair corridor check. This establishes a selectable difference,
not that either complete route is physically achievable or superior.

The forecast trial's first achieved difference is LG at post-World 1.15.
At 2.80, LG reaches (40.198,31.421), compared with accepted (39.203,29.428):
+0.995 yd upfield and +1.993 yd laterally. Mike remains 2.083 yd away, beyond
LG's 1.182 yd fresh-strike range. The improved access does not become loaded
protection. RB body histories remain exact through 2.85, including the unchanged
LOS crossing and first contact. DE_W's 2.45 missed tackle is present in both arms
at the same event position; it is not a new adverse event.

Comparison of the alternatives on the saved accepted read states does not show
recurring shoulder oscillation. At 1.35, the current position's preferred inside
arc is blocked by C, so both approaches choose the outer exit. At 1.60/1.85,
their arc direction remains the same. This is a matched-state geometric
inspection, not a claim that the changed native continuation retains those
later states. A forecast segment
can appear clear while the interception estimator returns its horizon with an
estimated arrival later than that horizon. Clearance is not a certificate of
collection before the runner arrives.

## Why the later LT traffic adjustment stays

A passive modifier replay matches every saved forecast body history exactly.
At controller 2.50, LG's raw request (-.075,7.328) becomes (-.514,4.065).
This is the existing radial headway projection against the acquired LT picture,
not a half-speed gather. The independently reconstructed projected command is
exactly the production final command.

Under the same own-body state, held command, .60s free-movement preview and
acquired constant-velocity LT picture:

| Request | Minimum LT torso clearance |
| --- | ---: |
| Raw | -.257824 yd |
| Production final | +.074424 yd |

The raw route predicts overlap; the adjustment preserves clearance. At 2.60 LG
is upright and unloaded, but that does not make the route through loaded LT
available. This approximate preview excludes future contact and peer decisions.
It demonstrates the adjustment's useful purpose, not that every possible route
is infeasible. Bypassing LT or disabling spacing is unsupported.

## Demonstrated approach/recovery mismatch; replacement surface unresolved

The accepted-source opening observer matches all 22 native body histories through
the 1.15s prefix exactly. Intent-array write stacks identify the source of LG's
backward/inward requests during the combination: `helperIntents` receives a
recovery command from `helperFit`, and teammate spacing preserves it exactly.

| Controller time | Helper request (x,y), yd/s | Prior actual hand force (normal,tangent), kg·yd/s² | Helper minus DT position dotted with reference axis, yd |
| --- | --- | --- | ---: |
| .75 | (-2.149,-2.564) | (0,0) | -.321 |
| .80 | (-1.681,-2.474) | (139.020,123.278) | -.296 |
| .85 | (-1.756,-2.438) | (562.753,-250.662) | -.242 |
| 1.00 | (-1.840,-2.274) | (572.499,-256.660) | -.067 |

The reference axis is (-.485643,-.874157), the fallback `-drive`, because this
combination has no `surfaceAxis`. With negative contact projection,
`helperFit` classifies LG as being on the far side even when his hands transmit
substantial force, and continues toward its held recovery landmark. The raw
command source is established. An installed diagonal displacement direction can
be legitimate, and hand force alone does not prove a useful surface or permission
to drive through the DT.
The small trace preserves actual body geometry, consumed pictures, commands,
force and write stacks for that review.

An independent contract audit establishes a narrower, stronger result than an
unusual native ending. The combination approach authors a half-man landmark
relative to the observed defender at `(-.35, side*.55)`. Its fallback contact
axis is `-norm(1, ps*k)`, where `ps` is the play side and `k` is the installed
lateral drive coefficient. For the playside half (`side=ps`), their projection
is:

```text
authored half-man offset · fallback axis = (.35 - .55*k) / sqrt(1+k²)
```

| Installed technique | k | Authored playside half projection |
| --- | ---: | ---: |
| Wide zone | 1.8 | -.310811 yd |
| Outside zone | 1.1 | -.171532 yd |
| Inside zone | .6 | +.017150 yd |

The opposite half has positive projection. Thus wide/outside zone's authored
playside destination and its fallback recovery-side test disagree: the approach
directs a player toward a landmark that recovery calls the far side. This
algebraic contradiction does not require a particular seed, force amount or
football ending. Actual contact may begin before the landmark is reached; the
native opening trace separately establishes negative projection, loaded hands,
backward/inward recovery requests and the momentum carried toward release.

**The approach/recovery mismatch is demonstrated; the replacement frame is
not.** This does not establish that the old route protects the runner, that
loaded hands should ignore signed position, or that a vertical replacement axis
is automatically correct. `helperFit` follows the declared persistent surface.
Its useful-side gate should not be weakened, and an already loaded rep should
not be rotated merely to relabel that helper useful.

PR #117 does not remove this question: its saved LG/C/DT_W body prefix through
1.10 is exactly the accepted prefix. Its stretch-specific correction requires
an acquired surface axis, which this joined combination does not have.

**Next decision:** review the initial combination approach together with its
`RunContactSurface` contract before first hands. Determine which acquired
working surface and neighboring helper foot lane the call actually intends,
then make the authored approach and initial persistent frame agree. Preserve
real displacement, torque, work, retained hands and truly far-side recovery.
The existing [helper-fit controls](../../../test/helper-fit.test.ts) already
cover useful loaded hands, genuine far-side recovery, rotated surfaces, observer
memory, pass behavior and RNG preservation; this pass inspected them without
rerunning them. An eventual correction must retain those contracts and improve
actual protection through runner arrival. Do not force earlier release,
increase strength, rotate a loaded rep by decree or start another exit-arc trial.

## Cost and evidence limits

| Receipt | Command seconds |
| --- | ---: |
| Baseline passive full replay | .807004837 |
| Same-waypoint through trial | .787805852 |
| Moving-corridor trial | .963805611 |
| Passive modifier replay | .758780845 |
| Saved-state LT traffic check | .225350260 |
| Passive accepted opening prefix | .442891916 |
| **Total** | **3.985639321** |

All six commands completed successfully. Baseline/through receipts identify host
commit 13dfe18 while their recorded engine source is accepted `bed3c36`; source
hashes and explicit override scripts, rather than the host branch name, identify
what actually ran. The moving-corridor and modifier receipts identify the dirty
accepted host before the held trial was committed; the saved source is `c639a7e`.
The opening receipt identifies commit 9099d19 with the runtime deliberately
restored to accepted `bed3c36`.

The separate zero-tick input export cost is **.297420860 command seconds**;
including it, the seven-command total is **4.283060181s**. Its receipt is
`freeze-input-receipt.json`, with accepted source `bed3c36` and unchanged inputs.

This pass adds no games, broad panel, roster scan, full suite or new physics
claim. Rejected alternatives were stopped before expansion or promotion tests.
Integration's verification of the independent pace candidate remains separate.
