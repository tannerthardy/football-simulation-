# Shared player awareness and the run-lane attention pilot

The common model is **own-team installation → personal evidence → uncertain
interpretation → feasible request → achieved feedback**. Every position needs
that separation, with different coached keys. The [all-role chapter](../football-handbook/player-awareness-model.md)
defines pre-snap knowledge, eyes, responsibility changes and mistakes without
granting the opponent's call or teammates' private execution.

The first run pilot establishes those contracts and identifies an attention
failure. It does **not** demonstrate useful anticipatory coordination in the
retained H/Y encounters. Keep `PlaySetup.runAwareness` at its default `off`;
neither the primary acquisition change nor the glance policy is promoted.

## Exact candidate and ownership

This separate branch is `codex/run-awareness-model`, based on frozen PR #36
`68284671d062dfd4e7e879bcd037bc21dad3e3ac`. Accepted `develop` was reverified as
`a1b16e666a9ee7d1bc1d2aecba141fc535863b24`; no baseline, merge or physics change
is implied. The source-tested candidate is
`9d60854e60cd319c974eba351cd6d2d18f8456de`, runtime SHA-256
`420eeed611af5a17d21dcede6e9f297049f70a9b960c44603a7f5822a34c1d29`.
Subsequent review/receipt commits contain no engine, test or harness edits.

The new module owns installed knowledge and coarse acquisition/attention. It
uses PlaySim sensing hooks and the existing teammate store. No behavior
controller, spacing calculation, World/contact law, speed/braking, capability,
hands, collection or release rule changed. PR #36 stays independently
reviewable; this follow-up must not be merged wholesale into its bounded repair.
Run Game owns any later movement/combination policy. Integration owns the exact
combined suite when a combined candidate is designated.

## Interface and information contracts

| Interface | Meaning / limit |
| --- | --- |
| `installed(observer)` | Copied own-team role and run scheme/lane, or own defensive role/fit. Defensive fit is deeply copied. Defense receives no offensive scheme/lane. Installation is not refreshed by hidden possession, position, engagement or private job changes. |
| `expectedLane(observer, now)` | Installed mesh-to-press corridor, widening range, approximate arrival interval and search landmark. Uses the observer's own position and copied call; no successful handoff or achieved RB point. It is not fed to spacing as a live body. |
| `prepare(agents, previousIntents, peers, now, dt)` | One sensing/attention boundary; own previous request, position, mind, and felt block association may select a look. Queries cannot perform it. |
| `visualAttention(observer)` | A requested glance from installed/remembered geometry and own torso, re-clamped as the torso turns. Actual bodies determine whether sensing succeeds; they never secretly aim the request. |
| `primaryPicture(observer, target, now)` | A dated acquired picture for an eligible OL's original near-line key. Prediction caps at .30 s; last observed motion/pose and age remain. Other keys return null to the legacy caller, not a claim they are repaired. |
| `teammateInformation(observer, target)` | PR #36's acquired/remembered/called/tactile/unavailable query; no truth fallback. Extra glance samples have the same ownership and delivery discipline. |

Modes separate two changes: `off` retains PR #36; `primary` acquires one
original zone-OL key; `glance` additionally selects runner-lane attention.
Eligibility is outside/wide-zone LT/LG/C/RG/RT with an initial
drive/reach/cutoff/combo job and an acquired pre-snap key. Other roles, retargeted
work and the original assignment-selection machinery remain legacy.

A lane check spends primary-key sampling for one normal decision beat. Old
queued samples can arrive while looking away. Foreground teammate acquisition
remains; extra glance acquisition adds coarse solid-body occlusion and the
foreground outside that glance incurs .15 s additional processing. Gaze yaw
100°, half-cone 25°, range 25 yd, prediction .30 s, corridor and timing numbers
are explicit **model assumptions, not measured NFL vision**. No extra RNG,
fixed persistence timer, online learning or head rig was introduced.

One minimal correction rejects a selected look landmark outside the existing
125° body envelope/range before spending primary attention. That tests the
chosen point only: it does not prove the entire uncertain corridor is invisible
or rule out a reasonable peripheral search elsewhere in it.

## Native evidence: acquisition, cost and football

All arms use Node 22.23.3, all 44 accepted flags, components=1, fixed physical
profiles and identical input seeds. Later decision timing can change execution
draw consumption; these are native counterfactuals, not forced matched-execution
replays. [The machine-readable receipt](../../data/reviews/current/run-awareness-model.json)
contains exact sources, flags, World defaults, launcher hashes and metrics.
[The evidence archive](run-awareness-model/assets/evidence.zip) retains the
complete native timelines and adverse arm, not just favorable gain summaries.

Inputs: O/D roster seeds31/32, strength .55, play seed3, `ace_12/wz_strong`,
Over/Cover3, base43, LOS40, centered ball, first down50. H is
`uc12-wz-s3-mirror` (`flip=true`); Y is `uc12-wz-s3` (`flip=false`). These are
actual placement variants, not geometrically mirrored trajectories. Preserve
RT idx2/O-OT2, RB idx6/O-RB1, DE_S idx12/D-DT1 and DT_S idx13/D-EDGE1. The
position labels do not correct the generated roster; capabilities stayed fixed.

| Arm | H ending / duration | Y ending / duration | Y first RT–RB impulse / closing speed |
| --- | --- | --- | --- |
| PR #36 unchanged reference, reused | Tackle +1.14 yd / 3.20 s | Tackle +.62 yd / 4.15 s | 132.37 kg·yd/s / 2.234 yd/s at entry2.45 |
| Acquired primary only, `4ad4ac0`, source `b687900b…` | Tackle −.16 / 3.10 | Tackle −.36 / 3.25 | 129.10 / 1.775 at entry2.55 |
| Initial glance, same source/input | Tackle −.19 / 3.10 | Tackle −.41 / 3.30 | 164.19 / 2.017 at entry2.55 |
| Selected-landmark correction, `9d60854`, source `420eeed6…` | Tackle −.19 / 3.10 | Tackle −.34 / 3.30 | 129.10 / 1.775 at entry2.55 |

`off` at the final source reproduces **54/54 PR #36 controller/physical/RNG
hashes in each case**. Those two final off prefixes stop at2.70 and are censored;
their endings in the table are explicitly reused PR #36 evidence. The other
six new endings completed naturally. Three earlier paired2.70 prefixes are
also unfinished evidence, subsequently extended on compatible source/inputs.

Primary acquisition alone diverges from PR #36 at boundary .35 in both cases,
before any glance. It changes quantized sampling, field access and later block
geometry. Its changed tackles are not evidence of smarter anticipation and
cannot be attributed to the glance. Keep this prerequisite separate.

**Repeated consequential error:** an eligible crossing can select an
unattainable look, miss the runner, and age the block key. On Y the RT looks
at1.65–1.85 and2.15–2.35. At2.20–2.35 the selected point is about162–168° from
his torso, outside the entire125° envelope. The clamped gaze leaves that point
62–68° away, outside its25° cone. The real RB is about163–166° behind and also
unattainable. No runner visual sample arrives before contact. The key's age
reaches .55 s. First achieved motion differs from primary at entry2.00
(boundary hash2.05): RT's final requested velocity changes from
`(-.038407, -.793397)` to `(-.028050, -.787668)` yd/s. Later collision is stronger;
the RB achieves x speed2.332 rather than2.792 yd/s over its first impact interval.
This is an adverse physical comparison, not an isolated claim about all final
yardage or solely about the second glance.

The correction removes Y's unattainable RT glances and restores its .30-s key
age and first collision/requested/achieved witness to primary-only. RG can still
glance: the corrected whole play first diverges from primary by boundary2.40,
with achieved motion at entry2.50. Consequently −.34 vs −.36 yd does not certify
an RT-only outcome benefit. The RB remains unseen before contact and tactile
information arrives at2.60. This improves attention choice locally; it does
not solve the remaining rear collision.

H retains a legitimate but late look. The first delivered RB picture is at2.70,
sampled at2.40, after DT_S wraps at2.30 and the RB falls at2.65. On the saved
primary-only trajectory even an ideally aimed glance first admits the RB into
the125° body envelope at2.25; .30-s delivery gives2.55, already after the wrap.
Y has no such opportunity from snap through its3.25-s primary-only ending.
These are generous visibility bounds on fixed trajectories; occlusion can
only remove opportunities. They are diagnostic truth measurements, never
controller inputs, and do not prove the same bound under a different movement
policy. H's first physical divergence is RG movement at entry2.30, not RT.

Loaded RT hands on its actual key remain in all arms; the archive preserves
normal/tangent load and achieved support per frame. These retained native plays
show zero support integration failures/error; initial Y glance's maximum
penetration .01678 yd drops to .00755 with the correction. There was no numeric
blocker or justification for changing shared physical laws. Existing baseline
physics limitations still apply.

## Focused checks, cost and limitations

The initial engine/test revision `7e0a72d`, runtime `b687900b…`, passed53 checks
across six affected files. The final candidate passed its17 awareness tests and
typecheck: launcher receipts `run-1792012108299-103965.json` (2.76 s) and
`run-1792012108288-103958.json` (11.36 s). Reuse the unaffected teammate/spacing
checks; do not add53 and17 as unique tests or claim a new full suite.

Controls advance divergent hidden reality snapshots, preserve installation
value/availability, forbid opposing call leakage, deep-copy defensive fits,
retain wrong expectations after a stalled mesh/cut, distinguish visible and
occluded/unattainable observations, require dated delivery before spacing
responses, and preserve primary-key opportunity cost. Repeated queries,
recording and same-boundary sensing do not improve evidence or consume RNG.
The earlier loop/control receipts retain actual rear tactile contacts and
ordinary foreground traffic. The added control keeps a150° installed look
unattainable while retaining a visible60° primary key under different hidden
RB paths. It acquires the key normally.

Total work recorded here is111.42 aggregate launcher seconds, including failed
checks; native commands29.58 s. Fourteen native case executions (seven paired runs) produced815
ticks: eight censored windows and six completed outcomes, all on the same two
retained inputs. Zero fresh native players/plays, games or full suite. The
mechanism failed to deliver useful pre-contact coordination, so a transfer
screen would not change the current hold decision.

Development failures remain visible: five failed fixture checks used unchanged
production source `e8b972ac…` (9.28 s total). One incorrectly demanded an unconditional
return despite an aged picture; subsequent spacing fixtures lacked support,
then had swept clearance .6026 yd above their .5768 contact band. Correcting
the fixture to an actual admissible obstruction made the response check pass.
These were test-development retries, including an avoidable retry, not five
production policies. Discarded fixture variants/stdout were not archived;
their exact validation hashes, costs and failures remain in launcher receipts.
One nullable diagnostic access failed typecheck on `7e0a72d` (12.19 s), corrected
by caching the recorded snapshot once in `a2f282c`; typecheck then passed.

The prototype still retains original-key motion indefinitely with age; it has
no nullable unknown-key response, general acquisition/retargeting or hearing.
Other opponent/teammate `see` consumers and the mind's all-opponent proximity
workload remain unrestricted. Assignment, private block-state membership,
handoff notifications and coverage/runner consumers in [PR #36's audit](teammate-information.md#remaining-consumers-and-limits)
are not repaired here. No all-player honesty or football calibration claim.

## Smallest next experiment and handoff

Run Game: evaluate **own movement through an uncertain installed runner lane**
using the existing movement preview, personally acquired block key and felt
load. Begin with a request-only feasibility comparison on these saved states:
can an alternative gather/step preserve useful block work while conceding less
expected lane overlap? Never instantiate a precise unseen RB body or certify
the exchange from the call. Retain the stalled handoff, unseen cutback, already
clear lane and necessary maintained block as opposing cases. A reasonable
peripheral search can miss; a full lane-region attention preview remains a
separate hypothesis from the selected-point guard.

Only if a feasible, informed choice works should the controller owner execute
the small native pair and then a selected fresh-player/play transfer. Measure
requests, achieved paths, block load, collision and loss of useful work before
gain. Keep helpers, roster changes and physics separate. Do not enable either
awareness mode globally to obtain an average yardage target.

Integration: review the shared model/interface and the isolated PR #36 repair
independently. Keep this child pilot disabled/held. Its exact source and native
adverse evidence are available; it has not earned enabled-behavior integration.

## Reproduction

Extract the child archive's `references/accepted-observations.json.gz` to
`out/teammate-information/accepted-observations.json.gz`. Extract the parent
[PR #36 archive](teammate-information/assets/evidence.zip)'s
`packets/candidate-outcomes.json.gz` to
`out/run-awareness/pr36-outcomes.json.gz` (SHA-256
`c8b55083a18a08daf990f233e6fd891e8ceb538dd04401102e8b8aec3f2ddbbf`).
Use Node22.23.3 and the accepted launcher; no flag overrides. On the exact
candidate:

```sh
npm run baseline:run -- --candidate -- npm exec -- vitest run --project core test/run-awareness.test.ts
npm run baseline:run -- --candidate -- npm run typecheck
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/teammate-information-prefix.ts --awareness glance --candidate-reference out/run-awareness/pr36-outcomes.json.gz --capture-from 0 --end-time 5 --out out/run-awareness/feasible-glance-timeline-outcomes.json.gz
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/teammate-information-prefix.ts --awareness off --candidate-reference out/run-awareness/pr36-outcomes.json.gz --out out/run-awareness/feasible-off-prefix.json.gz
```

The saved primary/initial-glance arms use `4ad4ac0` and the same command with
`--awareness primary`/`glance`. Preserve their source when reusing evidence.
The archive SHA-256 and every contained packet/launcher hash are in the receipt;
no historical NFL review or frozen physics/body-only replay substitutes for a
current native measurement.
