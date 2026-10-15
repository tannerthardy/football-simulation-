# First broad diagnosis of the accepted simulator

The strongest leads from this checkpoint concern **coordination before contact**:
getting a blocker to the next relevant threat, preserving run support through a
coverage reassignment, and keeping two defenders from spoiling an approach.
These deserve the next deep investigations. This is a ranking of concerns in a
small current panel, not an established ranking of causes across the whole game.

Accepted runtime: `8ca8deebe4afa91c3021bdd119bed8976cf00e47` (develop, verified
before collection). Engine SHA-256:
`f56a2156a0c1dcecfc3de128581ec875ca1ef93ac813a389d391282be585c956`.
Panel and review protocol were committed **before any outcome was inspected** at
`4b159048aee2735d8dd56db029f66bbfe5cbf262`. No engine, ratings, defaults,
contact law or playbook changes were made.

## What was reviewed

All **48 complete native plays**: four existing actual lineups selected by
capabilities before outcomes, crossed with twelve fixed calls. Each matchup has
IZ, OZ, WZ, power, counter and duo; slant/flat, mesh, smash, four verticals,
PA flood and Y-Cross. The panel includes three fronts, man/two-high/three-deep
coverages and one pressure call. Exact calls, seeds, rosters and settings are in
[the config](../../config/accepted-broad-audit.json) and existing
[roster fixture](../../config/roster-screen.json).

Collection completed once: **48/48**, **18.85 seconds**, zero partial/skipped
cases, no 25-second simulation timeouts. The launcher confirms unchanged inputs.
Every case retains all 22 player identities, initial state, original events,
native positions, velocities, final requests and full existing telemetry.
All 48 setup/hash/identity/event/cadence checks passed. Native positions are
quantized to 0.1 yd; telemetry velocities/requests to 0.01 yd/s. Use stored body
velocity, not differentiated rounded positions. Frame labels identify the enclosing
physics tick after its step; event timestamps remain native. These are tick bins,
not independent continuous contact clocks.

Review included full sequences, all outcomes and useful actions on both sides.
Domain reviews and source checks were performed separately, then reconciled.
The [frozen rubric](accepted-broad-audit-protocol-2026-10-15.md) distinguishes a
visible concern from a demonstrated cause and a hypothetical outcome improvement.

## Provisional priorities

| Priority | Recurring observation | Exposure and consequence | What is established |
| --- | --- | --- | --- |
| 1 | Planned second-level blocking does not become useful access to the next threat | **9/24 runs**, across all four matchups: four IZ, three WZ, two duo. An intended next job remains unachieved; some run losses already occur upstream. | Repeated assignment/access nonrealization. The nine observations are **not nine proven blocking defects**: takeover security, approach geometry, execution and legitimate defensive wins remain competing causes. |
| 2 | A later coverage reassignment reverses an established run-support request | **8/24 runs**, comprising **8/8 selected Quarters MOD runs** (WZ and duo). Receiver-directed requests recur after run recognition. Outcome cost is not isolated. | A current, source-supported inconsistency between zone and man run transitions. Not eight proven missed tackles or eight outcome-causing bugs. |
| 3 | Two defenders spoil or interrupt a catch approach | **2/24 called passes**, both mesh (**2/4 mesh exposures**). One has actual defender/defender contact before the catch; the other has a prethrow stop. | Specific coordination concerns. One eventual touchdown makes the consequence worth investigating, but does not prove the collision caused the touchdown. The stop's producing controller remains unknown. |

These categories overlap: **12 unique run plays** and **2 unique pass plays**
have the listed concerns. Do not sum category counts into a defect total or call
14/48 an unrealistic-play rate. Priorities 1 and 2 are close: blocking access is
the broader recurring sequence concern; the coverage transition has stronger
local causal evidence. This sample does not establish a stable ordering of their
whole-game importance.

A useful broader warning is **opposing errors hidden by the gain**. Weak runs
coexist with suspect defensive support in this panel. A short gain cannot clear
the defense, and a long gain can include useful offensive execution. A single
team statistic cannot adjudicate the quality of both sides' decisions.

### 1. Run blocking needs a shared account of the useful next job

The repeated problem is more specific than "runs gain too little." In all four
IZ cases, the intended RT combination toward LB_M never becomes an achieved
LB_M block. Three WZ cases similarly fail to produce useful precontact access.
In two duo cases, early release/climb still fails to intercept the backer.
Changing runner intelligence or block strength before explaining those sequences
would assume the cause.

Keep the opposing evidence: **A027** does achieve a useful Y-to-LB_M block before
the backer finishes the run, so it is excluded from the nine nonrealizations.
An engagement and a later defensive win can both be legitimate. **A006/A042**
duo create useful access and gains of **23.25/9.99 yd**; **A028** power gains
**4.50 yd**. All four counter plays gain **2.35–5.91 yd**. Those sequences must
survive any subsequent blocking change.

Next discriminant: on saved IZ/WZ/duo states, trace the original approach request,
security/release decision, later intent modifiers and achieved interception.
Separate an unsafe takeover from a missed attainable approach and a block that
protects the wrong path. Do not begin by awarding more force or earlier releases.

### 2. Recognition and action ownership can disagree

In all eight selected Quarters run cases, FS commits to run at **0.45–0.70 s**
and initially requests his installed alley fit. A coverage rule assigns `man:X`
at **1.60–1.75 s**. At **2.00 s**, run belief persists (rounded pass probability
0.01), and an actually requested RB picture says `carrying=true`, age
**0.20–0.25 s**. The movement request now points toward X and away from that RB
picture. The body is still moving inward at that moment: a reversed request is
not an already completed retreat.

The source explains the transition: [CoverageDefender](../../src/sim/coverage/defender.ts#L83)
can replace its subtechnique while evaluating receiver rules.
[ZoneCoverage](../../src/sim/behaviors/defense.ts#L375) fits upon a run read.
[ManCoverage](../../src/sim/behaviors/defense.ts#L214) requires narrower triggers:
its personally marked back carrying, a live carrier past the LOS, or its marked
receiver showing a block. Here X is beyond the block-look boundary and the
acquired RB remains behind the LOS, so receiver tracking resumes.

This is a demonstrated routing mechanism. Its football correction needs a
contract review: backside alley support still owes leverage, and a safety must
not chase every apparent run or abandon legitimate play-action responsibility.
Do not infer gaze from facing or require omniscient possession. `rob:X` labels
alone are insufficient: the Rob technique already honors run belief.

The overlooked system question is whether a new assignment can silently undo an
already acquired phase responsibility. Review that ownership transition before
adding faster recognition. The existing recognition is often already decisive.

### 3. Approach coordination includes useful offense and harmful teammate traffic

**A020**, mesh versus Cover 1, contains an SS final request of `[0,0]` at
**2.25–2.40 s**, before the **2.50-s** throw, while the receiver continues across
the field. The catch occurs at **3.35 s** at **8.36 yd/s**. The same LB_M's
receiver separation increases **1.87 → 4.08 → 5.38 yd** at release/catch/+0.5 s.
Final requests include spacing and other modifiers; this does not identify the
original behavior as the cause of the stop. The offense's speed and direction
change are real advantages, and CB_S eventually finishes the play.

**A044**, another mesh, has a sampled **LB_M–SS contact at 2.70 s**, before the
**2.90-s** catch. Recorded closing is **3.49 yd/s** and sampled impulse **173.92**
in the engine's impulse units. SS transverse velocity changes **−5.18 to −3.06
yd/s** across that tick while H continues. Both defenders had been approaching H.
H catches at **6.95 yd/s** and finishes with **69.88 YAC** without carrier contact.
This exposes a coordination concern, not a grip-strength failure.

There is also useful offense in A044. At **5.00 s**, CB_S is near H but engaged
with Z in a real downfield block (recorded hand tangent force about **203 kg·yd/s²**).
That explains a late low final movement request which would look like a frozen
pursuer if the blocker were omitted. Do not remove that offensive win to repair
the earlier defensive collision. Nor can this single play establish how much
the collision, pursuit geometry, speed advantage or block contributed to the TD.

Next discriminant: recover the pre-modifier requests and peer pictures at A020's
stop and A044's converging approach, preserving the same actors. Test a proposed
coordination contract against the immediately contained mesh controls A008/A032.

## What this panel does not support as the leading diagnosis

There is no repeated precontact stalled-runner finding here: the review finds
no posthandoff, pre-first-recorded-opponent-contact RB body-speed sample below
1 yd/s in 24/24 runs. This does not clear every runner read or mesh choice.

Every designed run terminates in a tackle. Of 17 actual catches, **16 have
recorded receiver contact and all 16 end in tackles**; the remaining catch is
A044's no-contact touchdown. Median first recorded contact-to-terminal-tackle
interval is **0.675 s for runs** and **0.775 s for those catches**, with adverse
longer sequences retained. These are event-defined intervals, not independent
physical contact clocks. They support investigating access and approach, while
preserving the separately proven numerical/contact defects. They do not prove
realistic forces or universal tackle quality.

There are **two sacks and two scrambles** among the 24 called passes. The failed
scrambles are already under real multi-rusher pressure and do request movement;
the saves do not establish a general frozen-QB defect or an available escape.
High-confidence QB coverage-family mismatches merit a secondary check, but
hidden-label mismatch alone establishes neither a bad throw nor material harm.

Useful defense includes A008/A032's immediate mesh wraps, A031's near-zero YAC,
A043's safety PBU, A046's short finish and A047/A048's rush-and-sack sequences.
Useful offense includes deep-corner windows in A021/A045, the duo gains above
and A044's downstream block. Preserve these as controls, not outcomes to suppress.

## Scope, evidence and reproduction

This is a balanced diagnostic panel, **not random ordinary-game usage**. Calls,
fronts, coverages and seeds vary together. Four selected matchups share the same
call template; 48 observations are not 48 independent football situations. There
is one seed per call, fresh energy, fixed first-and-ten field position, 11 versus
nickel, no accumulated scouting or game context. No inference about overall NFL
rates, heavy/empty packages, goal line, fatigue, substitutions, play selection,
clock management or special teams follows. Statistical return-yard resolution,
reduced bodies and catch-completion limits are separate model boundaries, not
demonstrated dominant causes from this panel.

Historical selected failures and experimental builds did not supply this ranking.
The Big Data Bowl result remains separate; no NFL query was rerun or broadened.
No restricted Hudl/StatsBomb data or derived calibration was incorporated.

Use Node **22.23.3** and the locked dependencies. The existing launcher records
the accepted source under `--candidate` because its historical baseline pin is
older; the collector verifies source identity with accepted 8ca8dee. No flags
are overridden. Default invocation only plans. On the frozen panel revision:

```sh
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/accepted-broad-audit.ts --plan
npm run baseline:run -- --candidate --receipt out/accepted-broad-audit/run-receipt.json -- node --import tsx scripts/diag/accepted-broad-audit.ts --run --checkpoint "Rank recurring visible football problems on one accepted build across preselected ordinary runs and passes before another feature wave"
python scripts/diag/accepted-broad-audit-index.py
```

Reuse the saved result before considering a repeat. The collector refuses to
overwrite run evidence; the index reads JSON only and runs zero simulations.
The manifest content digest is
`fbb8ee4147163842758ee308a2d8f4e836d70602358ed777b10a1531a8b4fa53`.
The [collection receipt](../../data/reviews/current/accepted-broad-audit/collection.json)
records case hashes and settings; the [adjudication](../../data/reviews/current/accepted-broad-audit/adjudication.json)
reconciles all 48 reviews and computes event-defined contact intervals. The
[run review](accepted-broad-audit-run-notes.md) and
[pass review](accepted-broad-audit-pass-notes.md) link the individual ledgers.
No cases were excluded or replaced; A027 remains in the panel and is excluded
only from the missing-access category because its backer block actually occurs.

Native case files total **680,803,129 bytes**. The full local film is
`out/accepted-broad-audit/film.html`. A preservation archive is outside the
repository at
`/workspace/datasets/simulator-audits/accepted-8ca8dee-48snap-v1.tar.gz`:
**40,559,081 bytes**, SHA-256
`72a62b95145cd64bb3bf06d60a62adbb7735cf872d777ff35faa5883e138e397`.
[Archive receipt](../../data/reviews/current/accepted-broad-audit/archive.json).
It contains native cases, frozen manifest, collector receipts, saved-data phase
index, full existing-format viewer and trajectory review plots. Restore it with
`tar -xzf /workspace/datasets/simulator-audits/accepted-8ca8dee-48snap-v1.tar.gz -C out`
into a checkout with an empty corresponding output directory, then run the
JSON-only index. The source/config can regenerate the panel if the archive is
unavailable; do not rerun merely to read it. This local archive is not yet hosted
on GitHub; moving environments needs only this 40.6-MB file, not recollection.
Collection used **25.79 CPU-seconds**; archive creation took **5.01 wall-seconds**.
The new collector's specific TypeScript check passed in **3.02 s**. The saved-data
validator verifies every raw hash, identity and exact setup, reconciles the
ledgers and computes the reported counts. No full shared suite was rerun.

Keep this same panel for the next accepted checkpoint. First investigate the
three sequences above with their opposing controls; do not launch a new broad
batch per fix. Once a leading mechanism is explained, use a small relevant game
context or fresh preselected case to check its transfer. This checkpoint changes
the research priorities; it does not authorize engine tuning or certify the full
simulator's problem ranking.
