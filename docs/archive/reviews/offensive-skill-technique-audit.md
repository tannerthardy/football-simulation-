# Offensive skill players: small controller repairs worth testing

The next useful skill-player improvement is a **reachable, traffic-aware run
entry**, followed by a small installed RB read/tempo contract. The shared World
should continue to enforce the resulting movement. There is no evidence here
for increasing traction, shrinking bodies, adding a strength bonus or building
more anatomy. Receiver/QB information consistency is another concrete issue,
but it can follow the reproduced OL approach repair and the RB work.

This is a read-only audit of commit `80e8151`, engine source
`246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469`.
No simulation, controller change, new viewer or game-rate calibration was done.
The audited baseline carrier file is exactly the controller retained in the earlier
[boundary repair](carrier-boundary-control.md), SHA
`4ba684552d96b4eb4dd0e8d0954b395d6b4eb4754c0665507e59c5b5e5861d66`.

## Evidence categories

- **Source-confirmed:** the current instruction or state flow can be inspected
  directly. This does not establish its prevalence or its NFL effect.
- **Retained native observation:** an actual saved command, consumed image,
  physical state or event from a pinned run. Proximity alone is not a contact
  impulse; a facing mark is not gaze; an assignment label is not successful work.
- **Coaching hypothesis:** a useful simplification suggested by the supplied
  literature. The generated textbooks are aids, not project instructions,
  independently checked NFL coaching rules or measured force constants.
- **Unknown:** the required observation was not recorded, or the proposed repair
  has not been executed. Do not turn those gaps into a diagnosis by assertion.

The main aids are the [RB manual](../../references/Running_Back_Mechanics_Textbook.md),
sections 1–6, 7–13, 18–19, 27 and 30; the
[WR/DB manual](../../references/WR_DB_Mechanics_Textbook.md), sections 2, 4–10 and
18–19; and the [offensive playcalling text](../../references/Offensive_Playcalling_Textbook.md),
chapters 13–16 and 18–20. Exact tracks, reads and vocabulary differ by install.
Their external citations were not independently verified in this audit.

## 1. Validate the path to a moving crease, not only its endpoint

**Source-confirmed.** `runReadAim` in
[`carrier.ts`](../../../src/sim/behaviors/carrier.ts) lines 38–79 sorts OL/inline-TE
observations by lateral position and creates points between adjacent centers.
The width test only considers the two bodies' lateral radii; the point's depth
comes from their average depth. A staggered or crossing surface can therefore
offer an endpoint whose approach passes through another body. The score checks
defender reach and distance from the preferred lateral landmark, but never
checks the runner-to-entry corridor. Runner arrival is distance divided by
`max(2, speed)`, without braking or turn feasibility.

At lines 156–165, a non-null near-line entry skips `evaluate` entirely and
requests top speed toward the point. This bypasses the own-blocker swept-segment
check at lines 264–278. `command` requests shoulder squeeze, and the shared
spacing/World still prevent free passage, but those protections cannot turn an
occupied approach into a good offensive decision. They may simply slow or
deflect the back after he repeatedly requests the wrong route.

Even outside that branch, `evaluate` forecasts a straight sprint with an
instantaneously reduced initial speed for the selected heading. It is not a
turn/braking rollout through the existing movement law. This is the same
forecast limitation already acknowledged by the boundary review, not newly
discovered evidence that cleats have inadequate traction.

**Retained native illustration.** In the current
[`witness-after.json.gz`](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/combo-attention/witness-after.json.gz),
`CA-R1-iz_strong-over-L-S3`, the 2.40 s telemetry asks the RB for approximately
9.52 yd/s while his achieved speed is 2.73 yd/s. The corresponding recorded
frame places Y 1.12 yd away, nearly along that requested direction; at 2.50 s
Y is 1.00 yd away and the speed request remains about 9.52 yd/s. This is a useful
traffic inspection seed, **not proof of a collision or a wrong selected lane**:
the carrier's selected endpoint/private phase and full collision impulses are
absent, bodies can move out of his way, and standard telemetry rounds values.
Original post-physics frames retain tick-start stamps. Use the
[fixed paired film](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/combo-attention.html) to locate the context,
then instrument the actual next read before deciding what to change.

**Small repair to investigate.** Keep a few installed adjacent entry options.
For each, validate the *approach corridor* against the runner's actual delayed
blocker pictures, including blockers at different depths and their short
velocity continuation. Add a pace/hold option when the corridor is temporarily
closed, with an escape if observed penetration makes waiting untenable. Use a
bounded short free-movement preview or conservative reach/braking query with
the existing capabilities; it need not run a miniature 22-body World per option.
The preview is a feasibility estimate, not a guarantee of future blocker motion.
Pass the chosen heading and speed to World, which owns contact, support and
actual travel. Keep finite observation/cadence and execution error.

**Minimum proof.** One staggered surface with an open endpoint but obstructed
approach; one genuinely passable shoulder-turned crease; one blocker opening
the lane late; and one penetrator making patience unsafe. Retain the chosen
point, rejected corridor, requested speed, actual contacts and achieved path.
A runner must not pass through bodies or stop indefinitely to satisfy the test.
Use the same physical profiles throughout and keep an adverse case where the
correct decision still loses. Grade the request and contact separately from yards.

## 2. Give the RB a small read/tempo contract rather than a universal daylight search

**Source-confirmed.** `onHandoff` in
[`assign.ts`](../../../src/sim/assign.ts) lines 252–265 supplies an aiming point and
an absolute press expiry: handoff time plus a patience/puller-dependent duration.
The press can end early when the generic lane score clearly favors an alternative,
or when runner depth clears the gate. Lead-block pacing already exists and checks
an imminent closing threat; split-zone slice is correctly excluded from that
lead/puller read. Preserve those useful distinctions.

Most calls then share the same all-surface gap search. Only Duo explicitly uses
a backer key; kick/trap uses a kick/log offset. The backer key is chosen from
actual defender positions at handoff rather than an installed pre-snap count or
the RB's own observed picture. Entry evaluation runs at a fixed 0.1 s interval,
while `SnapMind.decisionInterval` affects the lead-threat horizon but not that
read cadence. These are real simplifications, not a complete modeled sequence
of zone keys, press, declaration and vertical entry.

**Coaching hypothesis.** RB sections 1, 3, 6–13 and 18 distinguish initial track,
controlling block/defender, second-level fit and final entry. Patience means
arriving when a relationship resolves, not merely being slow. Inside zone,
wide zone, Duo and a kick/wrap play should share the same movement feasibility
logic while having different *questions* and permitted adjacent answers.

**Small repair to investigate.** Add an installation record containing only
track, first-level key/block relationship, second-level key and allowed adjacent
outlets. Start with one zone call and Duo, not every playbook term. A finite
personal read should say what became available or invalid: controlling defender
crossed the block face, entry closed, backer declared, puller turned up, or
penetration arrived. A motor-response/attention interval is legitimate; expiry
alone should not assert that the gap became open. Known teammates' installed
jobs may guide expectations, but their achieved leverage remains an observation.

**Unknown.** The current six native combo films do not record the RB's selected
key, entry candidates, score or private press expiry. They cannot establish that
early/late expiry caused an individual stuff. The earlier
[84-rep process evidence](offense-literature-applications.md) establishes useful
diagnostic fields, but its source and four-second censored window are historical;
do not present its counts as current full-play rates.

**Minimum proof.** Hold a surface fixed and change a visible slant, scraping
backer or late opening. A good reader should request a sensible different
track/tempo from different evidence; a poorer reader may be late or wrong but
must not get special strength. Include a correct press with no eventual opening.
Record mesh completion, true observation ages, read cause, chosen outlet, command
and actual lane/contact. Then check ordinary mirrored formation directions and
generated-roster variation before comparing NFL concept/front distributions.

## 3. Make receiver/QB agreement follow independent observations

**Source-confirmed.** `RouteRunner.update` in
[`receiver.ts`](../../../src/sim/behaviors/receiver.ts) lines 114–128 converts a
`sitVsZone` route after a fixed awareness-dependent time. It reads
`sim.defAlign.coverage.man`, the actual installed coverage classification, then
occasionally reverses it with a chance draw. It consumes no defender picture
for that classification. `settle` and the scramble drill also choose space from
actual defender positions. These are information shortcuts, even though the
route's achieved movement remains physically constrained.

The QB already has gaze-limited defensive memory/belief in `QBMind`, finite
progression timing and pressure-dependent throw error. Those are valuable.
However, `Quarterback.evaluate` and `release` in
[`qb.ts`](../../../src/sim/behaviors/qb.ts) lines 362–403 and 486–495 query the live
receiver's exact `RouteRunner.predict`, including his current path/index and a
fresh re-aim at release. That forecast also omits the receiver's active press
contact and support/collision history. Knowing the called route is reasonable;
knowing the teammate's hidden conversion and precise post-contact future is a
stronger assumption. It can suppress disagreement or mispredict a physical
release. This audit does not measure how often either effect changes a pass.

**Coaching hypothesis.** WR/DB sections 2, 4 and 9 describe an option as an
agreed small decision tree, with observer disagreement distinct from poor
athletic execution. Implement that narrow distinction before full QB footwork,
paranoia, complete arm anatomy or dozens of release animations.

**Small repair to investigate.** On one existing option route, let the WR/TE/RB
read its named underneath/leverage key through `sim.see`, preserve an uncertain
personal branch choice, and commit only at the installed spatial decision cue.
The QB predicts his expected branch from his own observation plus the known
installation, rather than reading the receiver controller's private state.
Observed teammate displacement can correct his expectation with finite delay.
Keep ball flight, physical reach and the current accuracy law unchanged in the
first comparison. A mismatch must occur before the outcome, not be imposed as
a random incompletion.

**Minimum proof.** Two players see the same rotation at different times; two
players agree but the receiver cannot execute the cut under contact; a correct
rhythm throw has no disagreement; and a disguise produces a plausible wrong
interpretation. Record both actual observers/cues, expected versus committed
branch and launch point. No current saved native witness proves this repaired
mechanism, so it remains proposed. Do not use old interception/explosive rates
to select a new disagreement probability.

## What to preserve, and what not to infer

The press release already uses a real bounded palm joint, support availability,
finite hand sliding and removal on escape/throw. It has no tensile jersey hold.
Preserve that shared-contact foundation; new techniques should change target,
timing and intent before adding a different force law. TE/RB routes share the
same receiver/catch controller, and their blocks share `RunBlocker` or
`DownfieldBlocker`; they do not need isolated positional physics.

The clean-space Counter exit was already traced and repaired with persistent
braking using the same movement limits. The retained
[`remaining-outside-zone-exit.json`](../../../data/reviews/physics-world/carrier-boundary/remaining-outside-zone-exit.json)
instead records `RC-R2-oz_strong-over-L-S11` deliberately choosing the sideline
at 6.75 s while FS is 1.60 yd away, then later aborting with insufficient room.
That is a historical whole-engine recording, not a current C outcome; only the
carrier-file SHA still matches. It is valid evidence that choice and control
differ, not proof that every exit is sensible or that fear needs another
multiplier. Better feasible forecasts may help late switching;
intentional contact avoidance, clock-stopping exits and unavoidable momentum
must remain possible. Facing alone does not establish whether he saw FS.

Catch review also has a concrete information boundary to inspect later:
`TrackBall` marks `onBall` immediately, delays its tracking movement, and uses
the exact precomputed remaining ball path. `catching.ts` grants target/onBall
tracking reach/height independently of that delay and resolves acquisition
from a probabilistic geometric opportunity. A planned quick throw may be
anticipated before release, so simply imposing one mandatory reaction delay
would be wrong. First record anticipated ball, actually acquired ball, hand
availability and candidate envelope as distinct states. No current native
sample here establishes a premature catch. Keep this as a focused follow-up,
not justification for a skeletal catch solver or an accuracy retune.

For NFL validation, use conditional approach speed, braking, track/entry
geometry, handoff-to-entry timing and catch/throw context distributions with
generated-roster ranges. Success/explosive/YBC/YAC rates are guards after the
mechanism is explained; they cannot decide whether a particular blocker,
receiver or runner issued the wrong instruction. The next recording should be
a few matched football witnesses, not another large outcome panel.
