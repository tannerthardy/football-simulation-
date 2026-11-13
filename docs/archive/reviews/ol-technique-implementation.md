# Run-blocking technique implementation and validation

## Status and where to start

Read the [coaching and model review](offensive-line-run-technique.md) for the
expected execution of IZ, OZ/WZ, split zone, Duo, Power, Counter, Trap and
perimeter concepts. This increment promotes a small shared controller repair,
not a new physical backend or a complete installation of every technique.

The shipped changes restore solo keeper jobs after earned combo releases,
classify newly selected work from observed depth, give second-level approaches
bounded moving-body fits with continued strike intent, and extend lost-shoulder
recovery to solo down blocks. The first-step rewrite and excessive approach
braking were tested and rejected. Ordinary contact evidence drove that decision.

Watch the [36 paired clips](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/ol-technique.html), or download the
[offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/ol-technique.zip). There are 32 fixed clips across
eight concepts and four separately labelled prior ordinary recovery witnesses.
The [data README](../../../data/reviews/physics-world/ol-technique/README.md)
contains source pins, retained candidates and rerun commands.

## Why this work

The previous 144-run ownership archive contains real controller defects:
former helpers remain `combo` keepers in 10/40 earned releases, and OL make
53 new linebacker-target transitions across 41 snaps while retaining a
first-level label, excluding pullers. These are repeated controller transitions,
often late in a play, not NFL frequencies or counts of failed blocks.

In the ordinary roster-two Power witness, RG climbs at 2.30 s and RT remains
on DT_S. At 2.75 s the old RT retargets LB_S but requests velocity
(-3.025, -6.675) yd/s using the departed partner's shoulder geometry. RT is
upright, unengaged and moving (+2.167, +0.778), with no arm/contact load.
That request is wrong football work, not evidence that RT needs more strength.
The OZ witness has similar obsolete geometry but the blocker is already falling;
it cannot establish an achievable recovery on its own.

## The selected implementation

**Coherent individual jobs after a real double.** Each generated combination
stores the covered owner's finalized installed solo technique, including
backside cutoff and Draw conversion. An earned release retains the existing
supported-contact/backer decision and actual keeper/contact transfer. Matching
old plan pointers and `climbTo` hints are cleared. A former helper keeper
becomes drive/reach/down/cutoff/Draw as installed, keeping his original drive.
The climber starts the installed upfield backer fit with a vertical drive vector.
This does not create a new hand force or turn cancellation into an earned climb.

**Classify actual newly selected work.** On the existing work-read cadence,
a different selected threat beyond LOS+2 in the consumed picture gets a
`climb` approach and vertical drive. A selected surface threat restores the
blocker's original solo technique/drive. The boundary is a controller
classification convention, not a physical law or NFL measurement. A LB who
has already filled can be a surface threat; a displaced DL can be a new
second-level threat. An existing target is not reclassified every tick merely
because it moved. Pull, lead, stalk and Draw responsibilities retain their
installed roles. This still uses the existing work selector and its responsibility
limits; it does not implement a new global assignment coordinator.

**Arrive on a moving body and keep the feet driving.** Climbs, lead approaches
and completed puller wraps share the existing support/fatigue-aware moving
arrival and short torso-clearance arcs. Their far request tracks the perceived
motion; near contact they gather toward a useful surface behind the intended
drive. Existing aim/placement error remains. The relative arrival request carries
the existing run-contact 2.4 yd/s drive intention rather than stopping the feet
before the strike. Lowering toward the first-level base is requested near the
strike, rather than through the entire climb. Real movement, reach, collision,
hand acquisition and force limits still decide whether contact is possible.
The 2.4 request is inherited technique intent, not a newly measured NFL speed.

**Recover a lost solo down-block shoulder.** Unattached down blockers now use
the same observed lost-leverage check and body-clearance recovery as reach and
cutoff. A healthy downhill down-block request stays intact. Live combinations
and existing physical joints stay outside this individual recovery decision.
Explicit kick/trap pullers retain their existing moving-shoulder controller;
FB lead jobs use shared bounded arrival with their installed kick drive.

Only `blocking.ts` and `run-block-fit.ts` change in the engine. Shared World,
engagement force laws, capabilities, grip/support budgets, resolution and
roster generation stay unchanged. No timestep increase, strength bonus,
automatic block win or anatomy expansion is introduced.

## Candidate decisions from actual football

| Version | Mean gain, 160 snaps | Stuffs | OL fall events | Free obsolete keeper updates |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 1.427 yd | 32 | 17 | 8 |
| Broad startup + stopping approach | 1.162 | 42 | 15 | 0 |
| Same core, original startup | 1.156 | 46 | 13 | 0 |
| Final selective recovery + strike-through | 1.265 | 38 | 11 | 0 |

The broad startup candidate asks reach blockers to lose depth/gain width and
changes down/Duo entry landmarks. In the fixed adverse OZ-left clip, LT ends
up about .091 yd deeper but only .007 yd wider by .40 s, then returns to the
old forward attack. Useful initial hands delay by 50 ms. This is not a complete
reach/run-off/overtake sequence. Restoring startup alone does not remove the
core regressions, so it is not blamed for every loss.

The stopping approach also over-brakes healthy down fits and backer approaches.
Counter Tite right seed11 loses its early healthy strikes and drops 7.45 to
2.19 yd. The final selective down recovery preserves its first hands and
impulses exactly; gain is 7.63 yd. In fixed Duo Over right seed3, all initial
first-level hands match. A stop-before-strike candidate delays RT's LB fit to
2.20 s and never acquires LG's LB before the play ends. The final uses 2.05 s
and 1.65 s respectively, versus baseline 1.90/1.50: still slower, but actual
contact returns. Gain is 1.08 versus baseline 1.24 and stopping candidate -1.15.

These examples support rejection of the over-broad controllers and narrower
promotion. They do not establish that every corrected approach wins its block.

## Matched final evidence and adverse cases

The main panel is one .55 generated roster pair, eight calls, five fronts
(Over/Under/Odd/Tite/Bear), both directions and seeds 3/11: 160 ordinary
11v11 snaps. Split zone uses Gun Wing 12; the other calls use Ace 11. Two
prior roster-two keeper witnesses are separate from pooled summaries.

All 162 input/profile pairs match, all observed/recorded executions match
their plain controls in each phase, and every play ends naturally. Recorded
initial projection equality is not proof that omitted private controller
metadata matches. Complete execution matches in 48/160 pairs, gains in
67/160 and handoff events in all 160. Paths/contact/random draws can diverge.
Direct native checks confirm 72 actual earned releases across the 160+2
inputs preserve keeper work and clear matching pointers. All 34 actual newly
selected free deep jobs use the consumed picture's depth, not hidden position.

The final has 70 earned climbs versus 68, no stale live combinations and no
free obsolete keeper instructions. Native first surviving OL hand-contact
records change 829 to 845 and OL fall events 17 to 11. Mean lateral offset
to planned drive is almost unchanged (.622 to .619 yd). More contacts and
fewer falls are descriptive results, not proof of generally stronger leverage.
Tick-ending surviving hands omit joints removed within the tick; native
delivered arm impulse/work retains those loads.

Rushing efficiency does **not** improve in this panel: mean gain falls from
1.427 to 1.265 yd and stuffs rise 32 to 38. Wide Zone, Power and Trap means
hold steady or rise slightly; IZ, OZ, Counter, Duo and Split decline. The
fixed OZ Over left seed3 loses 2.65 to -1.38 yd despite identical first-level
hands; its C backer contact is later. Split Under left seed3 loses 5.96 to
1.27. Those adverse plays and every changed result remain in the evidence.

Supplemental OZ rises 30.83 to 41.96 yd, while Power declines .84 to .56.
They lose all 130 old obsolete keeper updates, but their later physical
branches differ: final OZ LT still has hands at the old recovery timestamp.
Do not use those touchdowns/gains as isolated effect sizes or pool them into
the fixed-panel mean. Real-joint and independent solo-controller tests prove
the ownership transition directly.

Numerical checks remain bounded, with pooled maximum momentum/work residuals
about 4.7e-12 kg·yd/s and 1.9e-11 kg·yd²/s² and no support-motor work excess.
The independent 144-run guard uses three roster pairs and six calls. Mean gain
rises 1.326 to 1.585 yd, but stuffs also rise 38 to 39; only 48 gains are exact.
First contact averages 3.089 to 3.067 s, YBC .067 to .090 yd, missed holds
20 to 16 and broken holds 5 to 10. No run times out or releases a lower grip
at its attachment boundary. These mixed results do not override the adverse
fixed-panel results. All 64 existing tackle-control rows are exactly unchanged.

Two game guards change scores 41–27 / 25–49 to 57–28 / 29–15. Rushing YPA
changes 2.25 / 5.88 to 1.52 / 2.03. Game clocks, later calls and draws differ;
scores and passing statistics do not measure the isolated OL change. Actual
force/work checks remain bounded with no support-motor excess. Concurrent
collection times are not benchmarks.

All 714 TypeScript tests and 22 Python tests pass; typecheck and build pass.
The 19 new tests reproduce
12 intended failures on the baseline, with seven unchanged controls. Their
real delayed observations deliberately disagree with current hidden defender
depth; actual hand joints survive release, and independent World advances
check achieved movement/traction/work. The old first-step prototype's 22
tests are retained as rejected research, outside the production test suite.

## Next technique work

1. Separate the desired outside shoulder from lateral stretch/run-off and
   eventual seal direction. Use shade/motion and achieved position, not an
   unconditional bucket step with the old chase immediately afterward.
2. Add a measured brief-post/check/climb installation where owner-alone contact
   and the observed near gap support departure. Keep sustained doubles intact.
3. Make Counter wrappers read achieved kick/log wash and traffic; add real
   inside-protect then hinge responsibility and front-specific difficult blocks.
4. Diagnose the retained delayed second-level contacts and missed fits by
   request, support execution and reachable geometry. Preserve the strike and
   ordinary contact controls; do not fix bad fits by adding strength.
5. Finish Draw helper presentation and perimeter installations explicitly.
   This increment preserves Draw recovery metadata, not a complete Draw sell,
   pin-and-pull or crack-toss installation.

Work remains on `claude/engine-priorities`; main and PR #1 are untouched.
