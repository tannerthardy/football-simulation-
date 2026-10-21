# Achievable teammate turns and a researched football handbook

The new [football handbook](../../football-handbook/README.md) connects coaching
ideas to observable reads, physical technique and validation. It covers the
trenches, offensive skill players, defense/perception, shared execution/learning
contracts and data. It is original synthesis, not an authenticated playbook or
a declaration that those proposed features are implemented. Its position audit
started at `7ce3559`; historical measurements retain their original versions.

The implemented change is narrower: free players can briefly gather when their
achievable curved turn would hit a teammate. Shared physics, physical profiles,
coverage responsibilities, route choices, tackle/grip laws and OL installation
remain unchanged. Two simulation files change; the World does not.

## Why the requested ray was inadequate

The retained [pursuit audit](pursuit-and-tackle-technique-audit.md) reproduces a
safety moving 9 yd/s who requests a 90-degree turn beside his nickel teammate.
The requested ray and current straight lane are both clear. The actual body
cannot change direction instantly, curves into the nickel and contacts him at
0.55 seconds. This happens in both mirrors even with exact feedback each tick.
Increasing friction or removing collision impulses would hide a bad planning
assumption. Existing movement can avoid the impact after a short gather.

## Bounded policy, unchanged body

After existing headway spacing, compare only the current request and a zero
desired-speed gather through the ordinary free-movement preview. The gather
retains facing, posture, effort and other request fields. It is a braking
request, not instantaneous stopped velocity; the World limits the achieved
deceleration. Reconsider each 50-ms tick.

Use the same teammate pictures the spacing pass already consumed. Predict peers
at their observed constant velocity over 0.6 seconds; never inspect their next
intent. Score swept trajectory segments against all potentially reachable
pictures. Select a gather only if its worst clearance improves by over 0.05 yd,
it remains upright and it does not create a conflict with an originally clear
peer. Both choices can remain unsafe: collisions are still physical outcomes.

The policy requires an upright, materially turning free body moving at least
2 yd/s. It excludes engagements, actual joints, bonds, recent touch, foot/strike
constraints, loads/lean, dives/lunges/pushes and requested or active shoulder
squeeze. Loaded bodies keep existing headway control; this is not an empty-space
forecast of hand fighting or tackling. A constant circle cannot grade a rotated
shoulder crease, hence the explicit squeeze exclusion.

Before forecasting, reject a peer only when it lies outside a conservative
reachable tube around the observer's initial-velocity line. The current empty
World bounds COM acceleration by `traction / mass`; midpoint integration bounds
path deviation over horizon H by `0.5 * accelerationBound * H²`. Test relative
linear motion against that enlarged radius. This applies to every already
consumed peer and cannot reject the retained curved-contact witness. It changes
forecast cost, not force or traction. Revisit the proof if the free movement or
integration law changes.

The horizon, minimum turn/speed gates, circular clearance and improvement margin
are effective controller assumptions, not fitted NFL constants. No new random
draw or perception query is introduced. Source-pinned results and commands are
in the [evidence packet](../../../data/reviews/football-handbook/traffic-turning/README.md).
Final source is `0d2387ee2350df36a6af9b881a6efeee586b61cb4a2967ef7722431cc8e921b2`.
The screening change preserves the preliminary candidate's complete recorded
signatures on all 162 runs and 24 passes. Independent numerical corroboration
covers 954 free forecasts, including 633 that fall, and 35,304 certified-clear
peer pictures without a false-safe crossing. That corroborates the current
nominal-circle/constant-velocity forecast; unknown peer cuts and contact remain
outside its guarantee. Loaded-host collector times are retained, not advertised
as an idle-engine speedup percentage.

## Evidence and limitations

Twelve new controls cover mirrored real turns, explicit facing, stale pictures,
memory/body/RNG neutrality, multiple neighbors, live grasp exclusion, clean
lanes, unavoidable impacts, requested/active squeeze and the conservative
forecast screening. Five feature cases fail the exact `7ce3559` baseline; seven
safety controls pass it. Native World checks retain bounded arm/support work
and actual unavoidable contacts.

The unchanged 160-run collector is compared with the published cutoff-only
baseline `dd4cbb75…`, not its older baseline C. All 162 initial input/profile
projections, IDs and observer/plain executions match. Ordinary runs finish
naturally. These balanced concepts/fronts and two generated roster pairs are
diagnostic inputs, not NFL frequencies.

| Ordinary160 measurement | Before | Candidate |
| --- | ---: | ---: |
| Mean offense yards | 1.3422 | 1.2799 |
| Gains at/below zero | 41 | 39 |
| OL falls | 19 | 11 |
| OL downs | 17 | 9 |
| Whole-play climbs | 114 | 112 |

Four ordinary runs lose at least two yards and five gain at least two. Both
supplemental results remain separately reported. These mixed results do not
establish fewer collisions across all players, better OL assignments or better
NFL rushing. The old collector observes selected RunBlocker updates and OL
loads, and misses prepass climb decisions. Use whole-play events for climbs.
Observed saved native budgets remain bounded; tiny momentum/work residuals
demonstrate accounting consistency, not human strength calibration.

The largest adverse run, InsideZone/Under/right/seed3, drops from 7.63 to 2.60 yd.
At its first difference, 2.45 s, actual bodies, raw commands, joints and consumed
pictures are equal. The RB's original achieved-path forecast passes 0.312 yd
from the delayed RG picture against 0.586 yd touch distance. A gather improves
clearance while leaving other teammates clear. The baseline later really hits
RG at 3.00 s with 78.98 kg·yd/s impulse and 1.29 yd/s closing speed; candidate
has no RB/RG contact. Gathering ends at 2.70 s, and the linebacker arrives
earlier. This is a real avoided teammate impact with a worse run outcome. RG
falls on the baseline contact tick, but combined native loads—not that
association alone—would be needed to attribute his fall solely to the runner.

The matched24 passing control retains 23 attempts, 15 completions and mean
throw time 2.463 s in both versions. Target/throw-time/air-yard choices stay
equal; defender geometry and catch outcomes can change. Interceptions rise
from one to two, and two Cover1/FourVerts separation values change. One baseline
play still live at the eight-second inspection endpoint becomes a 6.10-s tackle
in the candidate; do not assign the censored baseline final yards. Recording
matches plain native state/results/next RNG on all controls.

Two descriptive game seeds change scores from 39–29 / 26–34 to 35–50 / 39–35.
Higher scores are retained as a warning for future native coverage/pursuit
review, not hidden or used to fit this local repair. Two divergent games cannot
establish scoring prevalence or whether avoidance itself worsened a coverage
assignment. The small pass panel is reassuring about throw decisions but does
not settle every coverage family or long game sequence.

## Research and data use

The [data chapter](../../football-handbook/data-and-measurement.md) distinguishes
acquired data from processed data and identifies the next useful small public
addition: one completed-season participation snapshot, with provider-specific
pressure/time-to-throw definitions. The source catalog records 30 public
documentation/coaching retrievals. Public article examples are installation
choices, not league-wide prevalence or measured reaction constants.

The [orientation pilot](../../football-handbook/orientation-pilot.md) uses two games
selected by IDs before measuring angles: 244 pass windows, 15 draft-cohort
athletes, 6,751 frames and 5,143 sustained-motion frames. Seven data tests check
the circular/window operator. The `o` semantics remain provisional for the
current release; neither it nor `dir` measures gaze. No engine capacity or eye
model was fitted to those angular differences.

## Next work

1. Use acquired/remembered pictures in one hook/Mike role, consistently across
   recognition, receiver-release and fit consumers. Preserve owned obligations
   and separate tactile feedback. Test normal run, play-action, motion and the
   final inside receiver before making a global attention system.
2. Diagnose pursuit gather discontinuity and unattainable rear wrap acquisition
   with the native witnesses already retained. Continue/gather controls should
   respect actual base and approach instead of adding agility or grip strength.
3. Audit protection ownership and receiver/QB option information. Remove an
   oracle independently of inventing a torso/eye cue; the earlier torso proxy
   remains withheld. Reopen RB entry only with prediction/execution squeeze and
   loaded-contact scope demonstrated.

Keep the reduced shared World. Physical transition and empirical capacity
uncertainty remain, but the next useful improvements have concrete controller
and information witnesses. No universal physics OK or percentage of remaining
gains has been established.
