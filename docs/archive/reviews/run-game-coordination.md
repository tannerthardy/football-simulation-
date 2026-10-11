# Run-game coordination: implementation, evidence and remaining work

For the subsequent pursuit/support/contact implementation and current priorities,
see [the newer review](pursuit-contact-follow-up.md). Contact accounting changed
there, so do not directly compare its YBC with the whiff-inclusive figures here.

This follow-up develops the run game beyond `6bf0c80`, incorporating the user's
defensive PDF and the evaluation work in `3c00ca0`. Power and Counter execute
more credibly in the controlled matrix: fewer plays die at the mesh, blockers
respond to penetration, and support players retain distinct jobs. The branch
still fails important realism checks. Zone runs remain too explosive, rushing
results vary markedly between rosters/fronts, and the full-game sack check
regresses. Keep PR #1 draft; these changes are a development baseline, not a
validated NFL engine.

The implementation prioritizes causal mechanics. It does not add a gain bonus,
stuff-rate floor, automatic block win, or concept-specific NFL outcome
multiplier. New numerical technique landmarks and travel limits are explicit
model assumptions that still need film/tracking validation.

## What informed the change

The user's [31-page PDF](../../references/football_defense_textbook.pdf), *The
Geometry of the Fit*, is shared in this private repository for collaborators.
It is generated reference material, not project instructions or a verified
coaching authority. Its most useful proposals are:

- Treat the fit as a coordinated first-level, insertion, force, alley and
  cutback system. One player does not provide two simultaneous independent hats.
- Separate a defender's alignment technique from his called gap/job. A 4i in a
  Tite structure need not be a C-gap rusher.
- Coverage determines who can actually support the run. Flat force, a
  quarters safety and a man defender following a receiver have different
  availability and travel costs.
- Front movement, pull/slice reads, spill support and exchanges need linked
  responsibilities and real timing. An end spike must have someone replacing
  the vacated edge.

Public coaching references read during this work:

| Reference | Specific lesson used | Limit of the evidence |
|---|---|---|
| [Tyler Manes, Run Fits in Football, July 6, 2023](https://throwdeeppublishing.com/blogs/football-glossary/run-fits-in-football-the-complete-guide) | Coverage-linked fit inventory; stack/track/fallback and spill/overlap are different techniques | Scheme examples, not a universal NFL fit rulebook |
| [Alex Kirby / Sam Parker, Ferris State Inside Zone, March 9, 2022](https://throwdeeppublishing.com/blogs/news/the-inside-zone-blocking-scheme-in-the-ferris-state-offense) | Look–lean–climb: collect gap movement before leaving; square feet and leverage make the double useful | College zone/read installation; its unblocked read defender is not copied into ordinary handoff zone |
| [AJ Forbes, Power, May 29, 2023](https://throwdeeppublishing.com/blogs/football-glossary/the-complete-guide-to-the-power-play) | Back-block/hinge against odd/even fronts; kickout plus wrap; runner inside the pulling guard | Multiple valid versions and TE/FB assignment swaps exist |
| [Alex Kirby / Sam Parker, GT Counter, March 18, 2022](https://throwdeeppublishing.com/blogs/news/the-ferris-state-gt-counter-run-play) | Pull clearance and separation; log a defender when inside-out kick leverage is lost; wrap outside the wash | Option and perimeter tags are not all implemented |
| [AJ Forbes, Trap, June 4, 2023](https://throwdeeppublishing.com/blogs/football-glossary/the-complete-guide-to-the-trap-play) | Trap the first on/outside-guard threat, not every playside DL or a convenient center shade | Exact target changes with the front and installation |

Terminology varies. This engine's outside-zone and wide-zone variants specify
progressively wider aiming/lateral intent; that is an explicit playbook choice,
not a claim that every NFL team distinguishes the names that way. Duo uses
vertical doubles and an inside-backer read. The PDF helps propose that
separation; the available PFF `MAN` label does not independently validate Duo.

## Implementation and the football problems it addresses

### 1. Front plus coverage supplies a fit contract

[src/sim/run-fits.ts](../../../src/sim/run-fits.ts) builds a known per-snap job from
the defensive call and actual presentation. It records gap, side, kind,
attack/control/lag intent, box/spill policy, stack/plug pace and an exchange
partner. It does not inspect the offensive concept to decide how to fit.

Flat and curl-flat players receive force priority over deep/man players.
Force is reserved before inside backers fill remaining bubbles, so the same
backer is not also counted as an immediate interior owner. Cover 6 support
can be asymmetric. If useful outside support is absent or too deep, the edge
falls back to box rather than spilling into an unsupported perimeter.

Tite's interior 4i players now have B-gap jobs with control intent; its nose
has a lag intent. Attack/control are recorded job intents using the current
single-lane approach; distinct control hand mechanics remain future work. An optional called end/backer exchange gives the end the inside job
and the backer the vacated edge. A force player cannot silently be reassigned
into that exchange. These are simplified fit contracts, not full two-gap
hand techniques or a complete Mint/Penny personnel installation.

### 2. Support maintains depth through the mesh

Inside backers insert/track toward a surface landmark rather than chasing the
back merely because his lateral position matches a gap at a deep mesh. The
edge/force player holds outside or inside-half leverage against an arriving
kickout; he retains that responsibility until the observed run clears the
surface. The remaining alley support holds a cap through the mesh, then takes
an interception angle when the runner declares.

An early experimental version brought that cap to linebacker depth and
produced excessive breakaways. That was diagnosed and corrected before the
committed final evidence. It demonstrates why adding “aggressive run reads”
to all 11 defenders is not a realistic defensive model.

Pull and off-ball wing/FB slice indicators come from delayed visible motion,
not a scheme name. Their meaning is still limited: this version implements a
pull-flow adjustment and recognizes slice motion; it does not implement every
installation's slice/fold response.

### 3. Zone, Duo and split flow have distinct jobs

[src/sim/behaviors/blocking.ts](../../../src/sim/behaviors/blocking.ts) retains the
snap covered/uncovered allocation, then adds local decisions at each
blocker's decision interval:

- Adjacent unengaged owners can exchange crossing threats when both gain a
  clearly better fit. Engaged opponents/live doubles are not remotely traded.
- An uncovered lineman collects actual penetration in his lane before climbing.
  Abandoning a double clears its shared release state instead of leaving a
  stale remote claim.
- First-step landmarks establish feet/pad angle before full target pursuit.
  Zone gains lateral ground; Duo's displacement/doubles stay vertical.
- Wide zone has wider reach intent and an outside press point. Split zone
  reserves one backside edge for an off-ball core TE/FB slice. Invalid
  formations are rejected; the existing Gun Wing formation is reused.
- Split-zone slice movement is excluded from the runner's lead/puller pacing
  and kickout read. The slice flows against the run and is not its lead escort.

Duo now owns nearby down threats, uses adjacent vertical doubles to inside
backers, and has no pulling guard or zone reach step. This is a meaningful
separation from inside zone, though the MIKE key and double selection remain
simplified.

### 4. Gap rules account for the vacated surface before doubling

Power/Counter/Trap reserve the intended kick/trap target, backfill the pulling
guard's nearby backside threat, and account for widened odd/reduced front
bodies before spending a spare blocker on a double. A bounded assignment
fallback does not claim a distant defender just to make an ownership count
look complete. Over/Under and Odd/Tite/Bear remain geometric inputs to rules,
not a lookup table awarding gains against a named front.

Pullers now advance immediately to the next waypoint rather than aiming at the
block target for one tick between waypoints. Their initial clearance is shorter
than the previous unconditional deep retreat, while nearby offensive bodies
can still force a deeper path. Losing the target's inside shoulder can change
a kick to a log; the wrapper then aims outside the wash. A fullback kickout
can trigger the same response. Contact and sustained leverage decide what
actually happens.

Some Counter/front combinations still leave an initial DL without a named
owner. The detailed matrix exposes them; assignment coverage is not a block
success metric. The next install must distinguish intentional backside reads
from actual orphaned threats, with no silent conversion of an ordinary handoff
into a zone-read play.

### 5. Contact requires useful geometry and develops over time

[src/sim/engagement.ts](../../../src/sim/engagement.ts) centrally rejects a remote
engagement, including direct callers. A helper contributes force only while
within functional reach, on a useful force angle, with time to establish his
base; fatigue reduces his contribution. Coupled helper inertia uses the same
support fraction. Run strikes preserve incoming mass-weighted drive momentum,
which then transitions toward the ongoing foot-force contest.

Combo release additionally requires useful helper contact. Hand control,
remaining-blocker position, balance and filling backer still determine who can
climb. There is no mandatory release at handoff time.

Diving tackles now honor the same intervening-body obstruction check as normal
tackles. The previous branch could dive through a blocker. The existing
shoulder-turn collision ellipse continues to let the back get skinny through a
physically passable opening, with finite posture change and acceleration costs.
It does not shrink tackle reach or let him pass through occupied bodies.

This is still a reduced-order contact model: force coefficients, hand fighting,
rotational leverage, grip release and pile behavior are approximations. Helper
fatigue/support and momentum are improvements to that model, not a full rigid
body biomechanical solver.

### 6. Carrier reads use the moving surface

[src/sim/behaviors/carrier.ts](../../../src/sim/behaviors/carrier.ts) adds near-line
entry reads between current blocker bodies and outside the surface. The back
presses his design, then evaluates physically passable creases using perceived
threat arrival, cut travel and known blocking intent. Duo can bend away from a
declaring inside backer; a gap runner can follow the inside of a kick or outside
of a log. Open-field heading evaluation resumes after clearing the surface.

The new crease read uses a modest visible-block time allowance rather than
predicting a block winner. The older design/open-field evaluator still reads
current engagement state, including `win`; replacing that information with
perceived grip/posture cues is unfinished. Commitment, multi-cut hysteresis,
hole-specific press timing and backside vision also need further work.

### 7. Pre-snap movement is physical and observable

`DefensivePlayCall.frontStem` and `.creep` specify when a compatible shown front
starts toward its called alignment, or a called blitzer walks toward his gap.
[src/sim/playsim.ts](../../../src/sim/playsim.ts) applies finite walking,
acceleration, facing, collisions and neutral-zone bounds. An unfinished move
retains position and velocity into the snap. Offensive blockers assign against
the actual arriving bodies; the delayed history starts with the shown front,
not the hidden destination. QB pre-snap observation happens after the staging.

Coaches can select these movements from a named movement RNG stream and their
disguise tendency. Replay records negative-time frames, and the viewer's
scrubber/event offsets include that interval. Official live duration starts at
zero; staging uses the existing between-play interval.

This does not yet model legal offensive shift/motion paths, one-second shift
resets, jet timing, lock/bump/rotate communication or correlated adjustment
busts. Those require an offensive pre-snap phase and a communication state, not
more random alignment jitter.

## Evidence and how to reproduce it

[paired-run-matrix.json](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/run-game-coordination/paired-run-matrix.json)
compares `6bf0c80` with this implementation. Each revision runs 3,600 physical
plays: two fixed generated roster pairs, seeds 7 and 19, three formations,
five runs, Over/Under, both flips, 30 repetitions/cell. Cover 3, no pressure,
midfield, no coaches/audibles. Roster and initial named seeds are paired; later
RNG consumption can diverge after different contact/decision paths. These are
controlled comparisons, not NFL frequency-matched estimates.

| Concept | Before YPC | After YPC | Before stuffs | After stuffs | Before 10+ | After 10+ |
|---|---:|---:|---:|---:|---:|---:|
| Inside zone | 11.40 | 10.71 | 15.28% | 9.44% | 18.19% | 18.75% |
| Outside zone | 3.58 | 8.17 | 29.31% | 14.58% | 7.22% | 12.22% |
| Power | 2.05 | 4.87 | 58.19% | 26.11% | 6.11% | 8.19% |
| Counter | 1.97 | 4.40 | 67.64% | 23.33% | 4.86% | 6.11% |
| Trap | 6.04 | 6.22 | 26.53% | 20.97% | 10.56% | 11.53% |

Power and Counter no longer fail at the old extraordinary rate in this cohort.
Inside-zone stuffs becoming even rarer is a remaining problem, not a success.
Outside-zone YPC is 5.28 in roster seed 7 and 11.06 in seed 19: aggregate
improvement hides a serious roster/front interaction. Trap also moves differently
between the two rosters. Report both seeds and per-cell evidence before tuning.

The broader [development matrix](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/run-game-coordination/development-matrix.json)
uses four existing formations, six fronts, both flips and 10 repetitions/cell
for each of those roster seeds: 5,760 baseline runs and 7,200 after runs. There
are 5,760 matched plays/revision; wide zone and split zone have only after data.
Per-cell quantiles are retained, but combined summaries only pool n-weighted
means. Averaging cell medians would not produce a valid pooled median.

Use `scripts/run-blocking-lab.ts` for the historical paired matrix and
`scripts/run-development-lab.ts` for the broader timing/front view:

```sh
node --import tsx scripts/run-blocking-lab.ts 30 7 out/run-7.json
node --import tsx scripts/run-blocking-lab.ts 30 19 out/run-19.json
node --import tsx scripts/run-development-lab.ts 10 7 out/development-7.json
node --import tsx scripts/run-development-lab.ts 10 19 out/development-19.json
```

Run the same development lab in a source archive of `6bf0c80` for comparison.
Missing new concepts are omitted. The baseline lacks strike/exchange/collect/log
telemetry; missing events are not evidence those football actions never occurred.
The older climb telemetry exists in both revisions.

## What the NFL data can actually teach us

[scripts/data/run-game-reference.py](../../../scripts/data/run-game-reference.py)
streams the available full all-22 BDB 2025 weeks 1–2 (2022 season), joining play,
player and carry labels. It retains one labeled rusher and all 22 players plus
ball at a unique snap, excludes nullified plays/dropbacks/kneels/spikes, and
keeps each metric's own denominator. Left-direction plays rotate both axes.

The [NFL reference](../../../data/reviews/run-game-coordination/nfl-reference.json)
contains 1,394 runs. These are observations, not final simulator targets:

| Observation | n | Mean | Median | 90th percentile |
|---|---:|---:|---:|---:|
| Handoff time | 1,276 | 1.282 s | 1.3 s | 1.5 s |
| Runner crossing snap LOS | 1,210 | 2.782 s | 2.6 s | 3.7 s |
| First annotated contact | 1,310 | 2.955 s | 2.8 s | 4.1 s |
| Yards before annotated contact | 1,310 | 1.164 yd | 0.57 yd | 4.7 yd |
| First sustained OL/opponent proximity | 1,394 | 0.635 s | 0.6 s | 0.9 s |
| Mean five-OL forward displacement at 0.5 s | 1,328 | 0.130 yd | 0.126 yd | 0.282 yd |
| Mean five-OL absolute lateral displacement at 0.5 s | 1,328 | 0.410 yd | 0.374 yd | 0.700 yd |
| Defense mean absolute lateral movement in final second | 1,386 | 0.240 yd | 0.183 yd | 0.485 yd |
| Defenders moving laterally more than 0.5 yd in final second | 1,386 | 1.456 players | 1 | 3 |

Sustained proximity means the same OL/opponent pair is within 1.0 yard at two
consecutive 10 Hz frames, within the first four seconds. It does not identify
hands, first strike, control, a double team, a won block or a combo release.
The simulation lab uses the same geometric/time definition separately from its
internal strike events. It is not yet a single shared implementation of every
NFL/engine metric, nor the proposed E2 context sampler.

For example, inside-zone mean first proximity moves from 0.415 to 0.526 s in
the six-front controlled cohort. Forward OL motion at 0.5 s moves from 0.584 to
0.246 yd. Those components become more plausible. Lateral motion moves from
0.381 to 0.128 yd and is now too small relative to the broad NFL envelope.
Line-crossing means remain about 2.22 s on inside zone, considerably earlier
than the overall NFL sample. A better displacement number alone does not
validate the first-step model. Match concept/personnel/surface/situation and
inspect trajectories before changing its timings.

The extractor produces **front geometry proxies**, not labeled defensive calls.
Over/Under require an attached TE and an identifiable outside-guard shade.
Overlapping Bear/4i windows remain `Reduced_ambiguous_proxy`. A stem, slant,
read technique or gap exchange cannot be inferred solely from a snap coordinate.
Sparse proxy cells require film checks and uncertainty reporting; do not use
them to declare a particular named front solved.

Across the all-week designed-run player rows, only 251 of 136,905 rows have a
blocking-opponent ID. These sparse labels cannot supervise complete run
assignments or combo-release timing. `MAN` is not verified Duo; outside-zone
labels do not isolate wide zone; split-zone tags are not established here.
Block/contact annotations, player positions and cadence also limit comparisons.
Keep missing/censored LOS crossings and contacts missing, not zero.

```sh
python3 scripts/data/run-game-reference.py \
  /path/to/bdb2025/big-data-bowl-data out/nfl-run-reference.json --weeks 1 2
```

The committed reference includes file hashes, cohort/exclusion definitions,
per-concept/proxy summaries and counts. Raw tracking remains outside Git.

## Integrating the evaluation work in 3c00ca0

The commit is merged, including [EVALUATION_ENVIRONMENT.md](../plans/EVALUATION_ENVIRONMENT.md),
structured `PlayLog.plan`, `scripts/tendencies.ts`, and the matching all-week NFL
tendency extractor. Game plans additionally log the called front, stem origin
and creep slot. This preserves the difference between a known simulator call
and an inferred NFL presentation.

The simulation's mix-sensitivity tool pools wide-zone/toss with outside zone and
split zone with inside zone, and explicitly flags unverified MAN-to-Duo mapping.
That calculation is an approximate sensitivity analysis, not a validated
concept mapping. NFL usage/relative-EPA correlation and simulated usage/relative-
yards correlation also have different estimands; their values are not directly
interchangeable.

The new [NFL tendency reference](../../../data/reviews/run-game-coordination/nfl-tendencies.json)
reproduces the upstream extractor on the full metadata. It uses a different
cohort from the two-week run-tracking extractor (including different sneak and
personnel restrictions). The before/after tendency logs use eight games/two
leagues as an exploratory policy check; those small samples do not estimate
reliable team-to-team dispersion. The baseline archive was instrumented with
3c00ca0's logging-only `game.ts` and tendency script without changing its
physical execution or callers.

## Full-game check, verification and release limits

The before/after full-game logs use eight games, seed 7, two generated leagues.
The final check reports points/team-game 41.13 → 33.44, YPC 7.24 → 7.00,
run stuffs 34.56% → 21.51%, and 10+ runs 18.04% → 16.94%. However, sacks
increase from 9.49% to 14.16% and YBC from 2.17 to 3.10 yd. These are smoke/
holdout-style checks, not isolated execution estimates: new
concepts, legality filters and called pre-snap movement also change selection,
game flow and later RNG consumption. See the committed logs for final values.
Rushing explosiveness and pass protection remain release blockers even when
Power/Counter mechanism scenarios pass.

Verification: 100 TypeScript tests, six Python tracking-fixture tests, typecheck
and build pass. Scenarios cover Cover 2/Cover 6 support, mirrored Tite/split
rules, odd/even/Bear Duo, deep-mesh insertion and alley cap, a called gap
exchange, visible guard/wing cues, adjacent crossing threats, penetration before
climb, kick/log/wrap, MIKE read, remote/helper contact, blocked diving tackle,
finite legal late stems, creeps, and recording-independent deterministic results.
Python fixtures cover coordinate rotation, censoring, incomplete snaps,
ambiguous reduced geometry and cohort exclusions. Existing full-game tests
also check the new structured call records.

A standalone replay was generated and its embedded JavaScript/data checked.
Browser interaction and a coach's visual film grading remain separate checks;
this task does not claim an end-to-end browser test. Replay timestamps include
pre-snap movement, while play duration remains live time.

## Highest-impact next work, in order

1. **Build E2 forced NFL contexts with trustworthy mappings.** Share situational
   and personnel/formation cells, coverage, box geometry, raw observed cadence
   and censoring definitions. Keep unknown Duo/wide/split/front labels unknown.
   Match roster-fit cohorts, hold out games/weeks, and report cell counts and
   uncertainty. Use uniform calls for mechanism diagnosis and NFL mix only as
   an explicitly mapped second mode.
2. **Correct zone first-step, contact and press timing together.** Lateral
   movement is currently too small and many runners reach the line too early.
   Compare individual OL/runner trajectories, first/second steps, attempted
   reach leverage and contact onset. Avoid repairing stuffs by accelerating
   defenders or slowing all backs with a global multiplier.
3. **Finish front-specific gap installations.** Trace remaining Counter
   orphan/hinge problems and difficult Bear/Tite surfaces. Add front/surface
   point calls, legal intentional read tags, moving pull clearance, exchanges
   within shared combinations and penetration recovery after contact. Grade
   who owns each live threat and who has useful physical contact over time.
4. **Repair explosiveness and pass-protection regressions.** Separate run-fit
   cap/pursuit geometry, stalk shedding, missed tackle mechanisms, and perceived
   engagement cues. Because central contact changes affect pass protection,
   examine helper arrival/support and pocket context in the trench/pass labs
   before drawing conclusions from league sack rates.
5. **Add coordinated offensive motion and defensive communication.** Model
   legal shift/reset and motion paths, snap timing, surface/distribution keys,
   lock/bump/rotate policies and a bounded communication delay. Mistakes should
   arise from a stale or conflicting job, not an independent random teleport.
6. **Extend dynamic decisions with interpretable state.** Keep readiness,
   attention, urgency and placement bias local; add practiced job familiarity,
   key confidence and commitment/recovery. A lost guard key can create a false
   first step; pressure can rush a combo release; overcommitment can widen a
   cutback. Make those consequences visible in telemetry and replay. Do not
   attempt to infer private psychological states from tracking.
7. **Optimize after behavior is stable.** The fit/crease scans add work. Cache
   observer-local keys and surface reads at existing decision intervals, profile
   allocation-heavy loops, and verify seeded traces plus timing distributions
   before and after optimization. Do not globally cache one omniscient defensive
   picture and give it to every player.
8. **Validate coaches and league ecology independently.** Run 3c00ca0's larger
   tendency cohorts, repair concept concentration/personnel selection and roster
   fit, then evaluate frozen full-game leagues. Eight games and good-looking
   league averages are insufficient release evidence.

The release gate is coordinated, physically possible execution across matched
contexts, with coherent movement/contact/tackle timing and held-out outcome
checks. Fewer stuffs alone does not satisfy it.
