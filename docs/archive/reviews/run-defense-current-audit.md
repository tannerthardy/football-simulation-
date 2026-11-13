# Run defense and pursuit: current audit

## Recommendation

Within run defense, the strongest general controller opportunity is preserving
the installed fit through acquired contact. The most readily isolated small
repair is pursuit instructions, not stronger tackling
or more turf friction. The current approach controller can change its requested
speed by 3.30 yd/s across an almost identical carrier heading. Its close
head-on branch also discards the installed force/box shoulder. These are
reproduced instruction discontinuities, before the shared physical executor
acts. Prove a smoother, physically attainable approach on ordinary and adverse
native encounters before promoting it.

The larger football contract is preserving a defender's fit after he
acquires a block. Today the free fit controller distinguishes gap, force, spill,
box and support partners; the engaged controller largely replaces that with
working toward the actual carrier. That discontinuity can make a coherent
physical contact execute the wrong defensive technique.

Five priorities, in expected value order, with scope kept explicit:

1. Preserve gap/shoulder/read objectives across the free-to-engaged transition.
   First diagnose one native contact; this is a broad contract, not a safe
   one-line force change.
2. Remove the reproduced approach-mode discontinuity and test attained movement
   and force leverage. This is the best bounded pursuit experiment.
3. Give attack/control distinct physical requests, using the same capacities,
   only after a native Tite/control witness identifies the missing instruction.
4. Validate front-specific optional exchanges before enabling them in caller
   policy. The current manual exchange debt is not an aggregate-rate cause.
5. Expand matched conditional movement/contact references and then focused
   visual keys. Resolve definitions first; do not calibrate forces from scoring.

The current whole-run evidence also makes OL approach, lane ownership and
handoff development high priorities alongside this defensive list. Pursuit
counterexamples do not establish that missed tackles explain the poor run
panel. Let the first invalid native instruction choose the next implementation.

No source or test was changed for this audit. It does not declare the physics
complete, assign a percentage of remaining physics work, or establish the rate
of these defects in games.

## Version and evidence

Audited checkout: `d08710461be2c905ccf0b1813536c082d849f790` on
`claude/engine-priorities`; engine content SHA
`11b97574138bdd4a99b373e4089261519bd4484f2e5ae5c87f90276a07215f85`.
World SHA is
`4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f`.

The published [schematic packet](../../../data/reviews/schematics/engine/README.md)
has the same engine and World identities. It contains actual native controller
and load recordings, not prescribed successful blocks. Its defensive caller
repair already prevents the selected missing named zone seats, erased roofs
and unsupported stock fire-zone rush budgets found in the
[earlier defensive audit](defensive-scheme-system-audit.md). Those historical
automatic-call defects should not be counted as outstanding current findings.

Two additional read-only receipts are under ignored `out/run-defense-current/`:
`pursuit-baseline.json` and `fit-exchanges.json`. They are staged source-law
counterexamples, not representative play samples. Retain them locally for
candidate comparisons; use the published packet for immutable native evidence.

## What is already present

- [Run fits](../../../src/sim/run-fits.ts) are derived from the front and coverage,
  not from the offense's scheme name. Inside backers fill available A/B/C
  bubbles; flat/curl-flat players get priority as force; remaining secondary
  support retains depth before the runner declares.
- A spilling edge requires an initially available outside support player.
  Without suitable support the installation changes it to box. The edge then
  reads observed kickout movement and requests the inside or outside half of
  that blocker. The blocker may physically answer with a log.
- Pull indicators use delayed visible movement. The runner is observed at the
  mesh instead of treating the stationary QB as a declared crease.
- [Pursuit](../../../src/sim/behaviors/common.ts) forecasts delayed carrier movement,
  includes a short acceleration horizon and a persistent player execution
  error, and fades leverage toward tackling reach. A free crossing approach
  uses current support and movement limits. Far pursuit has a short ordinary
  World preview, not a guaranteed interception.
- [Tackle timing](../../../src/sim/tackle.ts) can wait for a better achievable wrap,
  using the previously issued command rather than another behavior/RNG draw.
  Holds, strikes, support and teammate collisions execute through the World.
- Snap reaction is already implemented in [Agent](../../../src/sim/agent.ts) and
  gated in [PlaySim](../../../src/sim/playsim.ts). An old replay's first block at
  zero is insufficient evidence that the current engine lacks reaction time.

These mechanisms are useful foundations. Their presence does not establish
complete coaching, real visual attention, or successful achieved technique.

## Persistent gaps and their first wrong transition

### 1. Open-field approach switches are discontinuous

`chase()` treats an incoming-to-speed ratio strictly greater than `.7` as
head-on. That branch requests a square/mirror approach using raw profile
limits. The crossing branch below it uses support-aware limits; the far branch
uses `pursuitPoint()` and `chooseApproach()`. Thus a small heading change selects
a substantially different braking and steering rule.

Read-only witness: generated offense/defense seeds 19/20, play seed 83, FS
stationary at `(56, FIELD_WIDTH/2)`, receiver at `(50, FIELD_WIDTH/2)` moving
6 yd/s. Record consistent delayed histories. Change the velocity's x/speed
ratio from `.6999` to `.7001`, retaining speed and mirroring lateral motion.
The requested speed changes from **9.728 to 6.428 yd/s** on each mirror, while
carrier velocity changes by about **.00168 yd/s**. This is a command witness;
the actual body cannot instantly make that requested velocity jump.

The same probe places the FS 4 yd ahead and 1.5 yd outside a runner moving
6 yd/s near the sideline. Giving the same body a force job versus an alley job
produces the exact same head-on command on both mirrors. The head-on and close
crossing branches return before the force/box offset used by far pursuit.
Closing the leverage at actual strike range is sensible; silently discarding
it at this earlier approach boundary needs a demonstrated football reason.

**Small repair hypothesis:** use a common attainable near-hip target and
support-aware arrival limits through the approach transitions. Preserve the
force shoulder while it remains meaningful, then close onto the hip as the
runner commits. A narrow smooth transition or state hysteresis is preferable
to globally increasing agility. Do not require a permanent two-yard shade
outside tackling reach or perfect prediction of a future cut.

### 2. Engaged run defense loses its installed fit

`executeRunFit()` returns `stand()` when the player is engaged. Then
`stepRunRep()` in [engagement](../../../src/sim/engagement.ts) supplies his action.
That action does not consume `runFit.gap`, `edge`, `kind`, `partner` or
`technique`. It sets lateral work from the true carrier position, even before
handoff, rather than the defender's consumed observation or installed leverage.
Shed eligibility also uses true carrier distance, with a QB-mesh exception.

The engaged read uses `d.recog?.read === 'run' || !sim.isPass`. On a called run,
even an unsure or pass-reading defender receives full lateral work. This is a
private play-type shortcut, not a recognition decision. Correct body movement
under that request cannot validate the read or fit.

**Repair hypothesis:** carry a small defensive contact objective into the
engagement: preserve assigned shoulder/gap, compress the block, or work toward
a declared visible runner. Update it from the defender's delayed/haptic cues
and actual acquired support. Keep the same drive, hand and traction budgets;
do not add separate spill, box or two-gap strength multipliers. Test the
free-to-engaged transition before adding broad shed intelligence.

### 3. Tite/control is metadata, not a distinct contact action

`RunFitJob.technique` supports attack/control/lag. The front's override is
recorded, but only `lag` has a branch in `executeRunFit()`. Engaged action has
no technique branch. Calling a defender `control` therefore does not make him
extend, stay square, feel pressure and decide which side to shed.

This is an incomplete controller contract already acknowledged by earlier
reviews, not a newly reproduced force failure. Implement a compact objective
only after a fixed attack-versus-control contact witness shows what is missing.
The same physical capacities should explain both techniques.

### 4. The optional gap exchange hardcodes the end into B

`buildRunFits()` transfers the end's old gap to the backer, then always assigns
the end B. A static current-source fixture, ace11 inside zone with Cover 2,
generated rosters 11/12, strength .55, seed 77 and LOS40, gives:

| Front / weak side | Before exchange | After DE_W/LB_W exchange | Problem |
| --- | --- | --- | --- |
| Over / base43 | End C, DT A, LB B | End B, LB C | Two jobs remain complementary. |
| Under / base43 | End D, DT B, LB A | End B, LB D | B duplicated; A vacated. |
| Odd / base34 | End D, DT C, LB B | End B, LB D | This two-job ledger is complementary. |
| Tite / base34 | End D, DT B, LB C | End B, LB D | B duplicated; C vacated. |

The current automatic caller does not select `gapExchange`, so this cannot
explain its aggregate run outcomes. It is an installation defect to fix before
expanding those calls. Define the intended spike gap and the replacement of
every vacated duty, with front-specific eligibility. Blindly swapping the two
old gaps preserves a ledger but may still ask an edge to make an impossible
path. The existing Over-only exchange test does not protect Under/Tite.

### 5. Wrap quality is radial before the body establishes position

`tryTackles()` computes wrap quality from distance. A good radial opportunity
bypasses the movement preview and has no current body-facing/reach-direction
test. In a stationary staged receiver/FS pair, with all other bodies parked,
the carrier is `.804` yd directly behind the FS, beyond body-touch distance
`.453` yd. The FS obtains the same high-quality grip facing away or toward
the carrier: `.8003` at seed83 and `.7096` at seed131.

This shows an acquisition simplification, not an impossible solved grip force
or a measured missed-tackle rate. Rear jersey reaches and peripheral awareness
are real possibilities. A bounded correction should distinguish an established
wrap from a reach/turn opportunity, preserving legitimate rear attempts rather
than globally banning them or pretending body facing is eye direction.

### 6. Support contracts are installed once; attention remains broad

The force partner is chosen from initial roles/positions. There is no explicit
accepted handoff between a squeezed edge and his support player. A lineman
dropping into coverage remains a primary front-gap owner in the run-fit build;
that may be intended, but the coverage drop and run-recognition transition
must be inspected together. Eight coverage seats do not mean eight immediate
run fitters or a guaranteed rushing gain.

Pull detection accepts the first matching observed blocker; slice is recognized
as a category but has no separate interior-response branch. Broad delayed OL
and runner sampling is not finite eye discipline. The empty prior also still
uses absence of an RB slot rather than actual backfield geometry. These are
later perception/installation debts. Keep current observed body directions
distinct from hypothetical gaze and avoid adding a universal perfect exchange.

## Actual football witnesses to retain

The root's new current-source baseline is
`out/run-current-dive/baseline.json.gz`: 160 balanced runs plus two separate
recovery witnesses, with all observed/recorded executions matched to plain
execution. The pooled 160 cover eight concepts, five fronts, both directions,
two seeds and one generated roster pair. Mean **offenseYards is 1.280**;
39 gains are nonpositive and one is at least ten yards; all finish naturally.
Whole-play events include 112 climbs, 15 missed tackles and six broken tackles.
The legacy command-local `earnedClimbs=5` misses prepass decisions and must not
be used as a climb rate. An event label still does not prove an achieved block.

One Outside Zone/Odd/left/seed11 row fumbles and ends on a defensive return.
Its `endX` is the defensive endpoint: use `offenseYards` or the offensive
possession segment for rushing gain. Contact-to-LOS measurements are not yet
harmonized with the NFL operator, so their near-zero panel mean is a diagnostic
lead, not evidence that the shared force law must be weakened. This balanced
panel and its low explosive count point first toward precontact fit/block/lane
development, while leaving the isolated pursuit instructions worth repairing.

Use the published native rows in `stress-panel.json.gz` and their saved films.
They use roster seeds31/32, strength .55, play seed3, LOS40, 20Hz controllers.
The opposite-side rows are native flips, with different player assignments;
they are not strict mathematical reflections.

| Native pair | Current outcomes | Best diagnostic question |
| --- | --- | --- |
| SS-03/04, I-Pro Counter, Over/Under, spill | Flipped Over +1.70 yd; flipped Under -.86 yd with first contact -1.323 yd from LOS. Neither has a recorded miss/broken tackle. | Follow puller arrival, edge contact objective and replacement gap before blaming pursuit or force strength. |
| SS-01/02, Wing Split Zone, Over/Wide9 | Written gains -.07/+3.38 yd; first contact -.683/+3.171 yd. | Does the slice reach the appropriate shoulder and what did the edge request before/after contact? Wider geometry legitimately changes timing. |
| SS-09/10, Inside Zone, third&27, four rush / actual edge drop | Written gains 5.96/10.08 yd; flipped gains 6.64/3.20 yd. None converts. | Follow edge read, inside fit, carrier approach and traffic; do not assume dropping eight must help every run. |

SS-10 written has 40 recorded teammate-contact intervals and one missed tackle,
against one interval and no miss in SS-09 written; first contact is 8.237 versus
4.922 yd from LOS. That is a useful adverse witness, not proof the drop caused
bad pursuit, a count of 40 separate collisions, or a population rate.

All 20 current native stress rows have explained momentum/work and no reported
arm/motor budget excess at their stated tolerances. That supports internal
accounting, not correct coaching or NFL strength calibration. Historical DL
speed-at-.5s comparisons and earlier long-yardage panels have different sources;
do not present their values as measurements of today's controller.

## Minimal validation for the next repair

1. Preserve the `.6999/.7001` command witness and both mirrors. Execute an
   ordinary World rollout rather than accepting a smoother command as success.
   Include square, crossing, retreating and last-second-cut carriers, plus
   fatigued/loaded defenders and a force-versus-alley pair.
2. Keep native SS-10 written and its SS-09 control unchanged as inputs. Inspect
   the first changed instruction, attained support and contact sequence. Include
   both native flips and the adverse Counter/Under row, not only the improved
   gain or missed-tackle total.
3. For engaged-fit work, stage identical body/contact state with box/spill and
   unsure/run reads, then change only the defender's consumed picture. Confirm
   the request follows the installed objective and observed cue while force,
   arm impulse/work and traction remain shared and bounded. Run the full native
   approach/contact afterwards; a staged target alone is insufficient.
4. For exchange work, census gaps before/after across Over/Under/Odd/Tite/Bear,
   with unavailable or force-assigned backers as negative controls. Then inspect
   the real spike/scrape paths. Unique labels do not prove achievable execution.

The retained [practical validation guide](practical-validation-and-stable-physics.md)
defines when to reopen the mechanical oracles. A controller-only change needs
its affected contact checks and native guards, not another global solver rewrite.
Reopen physics if a correct request yields unexplained work, exceeds shared
capacities, violates contact geometry, or produces a material fixed-intent
timestep divergence. A poor pursuit goal by itself is a different failure.

## Reproduction and data priorities

From the frozen audited checkout, use Node22.23.3:

```sh
node --import tsx scripts/diag/pursuit-technique-probe.ts \
  --expected-source=11b97574138bdd4a99b373e4089261519bd4484f2e5ae5c87f90276a07215f85 \
  --output=out/run-defense-current/pursuit-baseline.json
node --import tsx scripts/schematic-stress.ts out/run-defense-current/stress.json
```

Scope warning: the older pursuit probe's **traffic section** calls
`spaceTeammates()` without the production spacing context. It exercises the
legacy/headway path and must not be cited as failure of the current achievable
turn repair. Its cone, role and rear sections are current-law probes. Production
traffic evidence is in the published schematic and
[traffic-turning review](traffic-turning-and-football-handbook.md).

The most useful next NFL comparisons are conditional distributions: free
defender closing/crossing speed and deceleration before contact; DL/OL movement
and actual contact timing by aligned technique; linebacker trigger and fit path
relative to observed pull/runner declaration; contact-to-down time by relative
speed and player-size pair. Big Data Bowl trajectories can constrain movement,
with scouting contact labels constraining event intervals. They cannot reveal
eyes, installed gap duties, grip force or the exact reason for a shed. Report
missingness and contact definitions; match generated size/movement profiles
before interpreting outcomes. Do not tune shared friction or force to guarantee
NFL yards, stuff rates or points.
