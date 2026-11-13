# Offensive awareness: finite decisions and honest information

This audit began at commit `632fb02`, engine source
`09dd62c7d7cc5002312e93821ea0bf6f7dea3bb764ff75f509c59ff720e72d62`.
That source already repairs run-contact trait selection and the carrier's
negative off-feet recovery forecast. It retains the weak balanced run panel,
mixed passing/game outcomes and withheld broad entry experiment documented in
the [current run diagnosis](run-game-current-diagnosis.md). None is solved by
adding arbitrary mistakes or making a player physically stronger.

The narrowly implemented increment makes **carrier tactical reads use the
existing player-specific decision interval**. A chosen lane remains committed
for that beat; the motor controller, contact and boundary recovery still run
each native tick. The carrier file is
`62b024decbecd81d8b4c990ed094283d3eb4356b3f97c859678af1767c101bf4`.
The [parent decision-awareness review](decision-awareness-and-commitment.md)
and [evidence packet](../../../data/reviews/decision-awareness) own the final
combined source, native comparisons and retained adverse outcomes. Other
agents' QB/defensive changes are separate treatments, not effects of this
carrier correction alone.

## What a compact decision model needs

An offensive player knows his own call, landmarks and allowed answers. He does
not know which defender will ultimately win, what coverage was secretly called,
or what an independently deciding teammate will do next. Keep five boundaries:

1. The installed responsibility and allowed contingency.
2. The personally acquired picture, its age and what remains uncertain.
3. The interpretation and anticipated consequence of that picture.
4. The action committed long enough to execute, with imperfect placement.
5. The achieved movement/contact that feeds the next observation.

This does not require a free-form thought generator, complete eye rig or
dozens of mental traits. A small memory, finite read beat, a few installed
answers, stable interpretation errors and common physical limits can make
mistakes have causes. A poor player can identify the correct opening late;
a veteran can anticipate incorrectly; either can be physically beaten after
the right decision. Do not award a block/cut merely because its label is sound.

The [shared execution chapter](../../football-handbook/shared-model-and-learning.md)
and [offensive-skill chapter](../../football-handbook/offensive-skill-and-playcalling.md)
provide coaching synthesis, inspected public examples and explicit proposals.
The supplied RB textbook sections 2, 6–10 and 13–17 distinguish track, key,
tempo, entry and escape. These are teaching aids, not direct measurements of
NFL cognition or one universal team's read system.

## Useful mental depth already exists

[`SnapMind`](../../../src/sim/mind.ts) already supplies coherent per-snap readiness,
alignment/placement error, anticipation/aggression bias and occasional lapses.
Workload smooths into stress; congestion, energy and composure affect focus.
Focus/stress lengthen observation delay and the declared decision interval.
Judgment errors persist by opponent instead of rerolling every frame. These
are effective controller assumptions, not inferred private human thoughts.

[`PlaySim.see`](../../../src/sim/playsim.ts) returns delayed position, motion,
stance, facing and coarse visible pose. Facing is body orientation, **not eyes**.
Observation requests are recorded; recording does not establish that a player
actually directed his gaze at every requested object. Most callers can ask for
all opponents every tick. Delay alone is not attention selection or occlusion.

The run OL already uses `decisionInterval` for rule changes, solo stretch reads
and personal combination decisions. Its short motor requests can update more
often without constituting a new tactical assignment. The distinction matters:
slowing every foot/hand action to a mental read beat would make ordinary
tracking and stabilizing artificially unresponsive.

`QBMind` already maintains imperfect coverage beliefs and directional defender
memory. The QB has a progression, read dwell, urgency/risk thresholds, pressure
sense and coherent reach-estimate error. Preserve those useful mechanisms while
repairing information shortcuts; do not replace them with an independent
random interception or "panic" outcome.

## Reproduced carrier integration mismatch and repair

In the audited source, both carrier scheduling sites used `nextEval = t + .1`,
regardless of the player's declared `mind.decisionInterval`. Stress could worsen
his delayed picture and placement, but he still reconsidered every lane at the
same fixed speed. This affected designed carries, catches, scrambles and return
carriers because all use `BallCarrier`.

The read-only native probe inspected eight predeclared calls: Inside/Outside
Zone × Over/Under × both directions, roster seeds 31/32 at strength .55, Ace 11,
play seed 3, LOS 40, first-down marker 50. All **153** actual read schedules used
**.100 s** while the same runner's existing declared intervals were
**.18479–.20913 s**. Each observed execution matched a plain execution in result,
bodies, tags, events, intents, minds, perception and next RNG. This is one
generated roster diagnostic, not an NFL cognition-frequency estimate.

The repair uses `a.mind.decisionInterval` in both design and free/crease reads.
It retains the chosen heading between those beats. A fresh carrier starts with
an immediate read. When the installed press phase ends or is explicitly
abandoned, the free phase receives a first read rather than inheriting the
longer press beat. Installed press expiry remains its existing effective tempo
assumption; it is not newly claimed as visual recognition. Crease geometry,
forecast values, risk utility, capabilities, physical profiles and World stay
unchanged.

The motor command still evaluates own achieved position/momentum each tick for
boundary recovery, and actual hands/grips/collisions constrain movement. More
commitment can let a changing lane close before reassessment. That is a possible
adverse consequence, not a reason to guarantee immediate perfect correction.
Do not infer from a slower scan that the runner now has a full attention or
mental-stress simulation.

### Focused checks

Six dedicated tests use the existing evaluator and real public profiles in
controlled held-body scenes:

- An opposite visible threat cannot change the selected heading before the
  next beat; a later read does change it, on both lateral mirrors.
- Lower focus/stress stretches commitment while physical profiles remain
  identical.
- A press responsibility ending triggers the free-phase first read.
- A fresh possession can read even while the previous carrier would be held.
- Own boundary momentum triggers braking between tactical reads.

The nine existing recovery checks retain their strict same-picture/hidden-state
invariants. Only their source-specific native assertion at exactly 3.35 s and
heading −.58125 is replaced: finite individual cadence legitimately changes
invocation times and trajectories. Its native integration now checks actual
consumed off-feet pictures, finite decisions and bounded recovery allowances
through the ordinary whistle, without demanding an open lane or positive gain.
Six boundary and twelve mesh/pull controls also pass: **33 focused tests**.
These scenes test the controller contract; no new elapsed interval is fitted
to an NFL result.

### Eight native controls, including worse outcomes

The exact same read-only collector was rerun on combined source
`8863cafc764390fb31f0675fb8eaf7756da8a53019dd0281a11d9482c26703f1`.
Its tool SHA-256 is
`72817992e8cc1bea63df533e8ab40c5f9ddc53ff16d13dfbd01f224ddfdc4671`.
All eight observed/plain signatures match and all plays end by tackle.
There are **97** scheduled reads; each actual schedule equals the player's
declared interval, now .18479–.20845 s. Read counts also depend on each changed
play's length, so 153→97 is not a fixed-duration processing-speed estimate.

| Fixture | Baseline gain | Combined gain | Baseline/candidate reads |
| --- | ---: | ---: | ---: |
| IZ Over right | 2.27 | 3.58 | 16/11 |
| IZ Over left | 3.06 | 4.68 | 23/11 |
| IZ Under right | 4.80 | 6.23 | 21/14 |
| IZ Under left | 1.09 | 1.64 | 17/10 |
| OZ Over right | 1.91 | −.19 | 17/11 |
| OZ Over left | −1.67 | 2.70 | 14/15 |
| OZ Under right | −.23 | 1.23 | 22/15 |
| OZ Under left | 2.28 | −.17 | 23/10 |

The two worse Outside Zone cases remain visible. These selected results include
the defensive contact/recognition and QB-memory changes; they do **not** isolate
carrier cadence or establish a new NFL rushing rate. The root-owned broader
panel determines integration scope and guards against favoring these eight
cases. Candidate sector controls also preserve identical QB estimates when
hidden cone location changes under the same picture, as covered in the
[shared audit](shared-decision-current-audit.md).

## Remaining information debt, ranked by demonstrated mechanism

| Area | Audited source behavior | Small next experiment and controls |
| --- | --- | --- |
| Relevant visual picture | Carrier visibility range/backside eligibility uses true defender position before fetching its delayed picture. `runReadAim` still skips true down bodies. | Let one acquired picture govern its own eligibility and forecast; same consumed image must give the same decision under hidden pose/location changes. Keep legitimate unseen pursuit. |
| Protection accounting | `ProtectionCoordinator.isRusher` reads true defensive behavior kinds; coordinator matching and `PassProtector` approach use live defender geometry. | Record an installed line/back responsibility ledger, then compare own delayed closing cues and communicated exchanges. Include identical mug looks that rush/drop, late rush after release, and a correctly owned rusher winning physically. |
| Receiving work | `DownfieldBlocker` selects/approaches from actual opposing positions/velocities and shared teammate private targets. | Preserve installed claims; choose a personally observed, reachable threat with finite cadence. Keep unblocked immediate danger, teammate ownership and adverse lost reach. |
| Option routes | A `sitVsZone` receiver consults the actual coverage's man flag after a fixed read time, then adds a small random misread. | Use a tiny local marker/help interpretation instead of the secret coverage label; man-match and spot-zone can resemble each other. QB and receiver must independently interpret the same allowed branch. |
| QB receiver forecast | Window and release use private `RouteRunner.predict`, including current converted path and exact route-following state; `ready` uses route timing. | Separate own installed route expectation from personally acquired branch/contact evidence. Do not remove legitimate anticipation or replace receiver prediction and accuracy simultaneously. |
| QB field scan | Aggregate post-snap recognition reads every defender; `bestOption` can evaluate every receiver immediately under pressure. | Restrict one install to a relevant conflict/helper read and a finite emergency scan. An unseen open target may remain missed; a hot answer must actually belong to the protection/pass installation. |
| Healthy old OL work | A healthy free target can retain the chase even when another job might be useful. Current ten-film audit lacks a proven dead-work/reachable replacement cue. | First reproduce one personally observed expired threat plus reachable unowned replacement. Keep the backside threat while the runner is still behind and preserve a live keeper. |

The QB audit also reproduces cone acquisition debt: `observe` decides whether
to refresh memory from a defender's **true current position**, then asks for
the delayed image. Held-picture scenes with the same initial memory and gaze
produce different refresh/estimates when only hidden cone location changes.
For example, an identical outside-cone image can replace memory when the true
body moved inside, but not when it remains outside. These are staged controller
counterexamples, not evidence of how often it happens in NFL or native football.
The separate shared/QB agent owns any promoted QB correction.

## Simplify errors by cause and validate decisions before outcomes

Useful persistent error causes include: trusting an initial false key;
remembering a stale peripheral threat; correctly reading the down block but
missing the backer; choosing a sound shoulder too late; staying on an expected
route branch after the receiver made a different legal choice; or sensing
closing pressure but lacking a physically attainable escape. Their causes can
appear across concepts without per-play success bonuses.

Do not make every new cue force an immediate rethink. Do not combine delayed
vision with live eligibility/assignment knowledge and then call the result
fallible. Per-call familiarity remains future work: `Player.familiarity` is
position comfort, not how often the lineman practiced this installation.

The next acceptance panel should preserve source/input/collector/recording
identities, normal and adverse cues, actually transmitted block load and all
paired gains. Grade acquisition, interpretation, commitment and achieved motion
separately. Conditional NFL tracking can constrain speeds, paths, contact
development and arrivals; it cannot directly identify gaze, stress, confidence
or private processing speed. First demonstrate coherent decisions, then use
NFL outcomes as broad conditional guards rather than repairing a low mean by
adding force or perfect awareness.

## Integration fixture audit after persistent defensive fit repair

The final integration source is
`178751b67048eeaa91741090a4a19e43c108add8c5f1c5e0a586c09d57b3402c`.
This is distinct from the eight-call intermediate comparison above; those
results remain labeled with their actual source.

Six failing `combo-attention` assertions exposed two fixture assumptions. Its
reduced loaded-contact fixture disables behavior and recognition updates, yet
left the DL's read as `unsure`. The former `!sim.isPass` shortcut had silently
supplied recognition from the offensive call. The fixture now explicitly stages
an already-recognized run (`read='run'`), while retaining real acquired hands,
World load, support, independent keeper proposals and adverse lost-hand controls.
It does not set engagement control, a winning outcome or physical capacity.
The cadence check now observes each member's actual `readAt/nextRead`, not how
many incidental `see` calls candidate evaluation makes. Its processing-trait
contrast is wide enough to survive native .05-second sampling; the previously
used intervals both rounded to the same ticks. Every newly scheduled read still
must equal its own current decision interval.

The old native Split Zone/Tite Y–RT positive witness changed for a valid cue:
at RT's 1.00-second due read, Y still transmits 383 N through real hands with
phi .426 and base .999, but RT's consumed backer is 4.604 yd away (outside the
4.2-yd arrival gate) and the consumed RB is 4.643 yd behind the line (short of
the 2.8-yd gate). At the next due read Y's phi is .701, beyond the .55 secure
surface limit. RT stays, then acquires loaded contact on the end after Y sheds.
The test now preserves this historic input as a causal stay/collect control,
checking consumed images and actual read opportunities in a declared two-second
inspection window. It makes no claim about final rushing efficiency.

A positive native check-release control remains: the predeclared
`CT-R1-split_zone-under-R-S3` panel input earns RG's unjoined check-climb off RT
at 1.25 seconds. The test requires live loaded RT hands, unchanged bodies and
contact state through the decision, one real climb event, and no invented RG
hand constraint. This is a mechanism witness selected from the declared cohort,
not an estimate of how often checks should succeed. All 40 focused
combo-attention/zone-helper tests and typecheck pass after these fixture repairs.
