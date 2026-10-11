# Full engine review — 2026-10-11

The engine has a substantial, reproducible foundation, but it is not yet a
credible NFL game simulator. The next work should improve a few repeated
football sequences: catching and effective contact, ordinary run coordination,
and pocket decisions. A confirmed hand-contact law defect needs a bounded
repair alongside that work. More anatomical detail, new playbooks and a
management layer have lower priority.

This review covers the current production path, experimental hand patch,
major controllers, game wrapper, roster generation, replay/data tools and
validation. It combines source inspection with existing pinned reviews and
fresh checks. It is not a claim that every line or NFL rule was independently
verified. No engine code, capacities or test assertions were changed.

Reviewed branch: `claude/engine-priorities`; base commit `b922353`.
Engine source SHA256:
`4c56c12876883fbe0e84bdc3172d284fbc099c3a035a73852255cb4a44255302`.
The compact [receipt](../../data/reviews/current/full-engine-review.json)
pins fresh checks and their local outputs. Earlier evidence is in the
[NFL gap review](nfl-gap-review.md), [zone prototype review](zone-flow-prototype.md),
[status](../STATUS.md) and [validation](../VALIDATION.md).

## What is already valuable

- One shared World executes movement, collisions, support, hands and grips.
  Controllers request actions and cannot simply assign a block win or yards.
  Force/work budgets and achieved recovery are meaningful improvements over
  independent outcome rolls for every interaction.
- Measurables, mass, reach, movement limits and ratings are shared across tasks.
  Seeded randomness, finite decision cadence and delayed perception make
  controlled comparisons possible.
- Run assignments, combinations, keeper continuity, run support, coverage
  rules and QB progressions are substantial implementations. This is beyond
  players following route lines until a random result is selected.
- Replay telemetry can distinguish intent, acquisition, load, support and
  actual movement. Source hashes and observer-neutrality checks make evidence
  auditable. The data pipeline now separates actual catcher from intended target.
- Game accounting covers drives, clocks, substitutions, fatigue, turnovers,
  overtime, special teams and official-stat handling. Recent repairs preserve
  offense yardage through fumbles and nullify accepted holding before crediting
  stats.
- At this engine source, the latest completed validation reports 1,236
  TypeScript assertions in 106 files, 141 Python checks, typecheck and build
  passing. These are preserved contracts, not a football-realism certificate.

## Broad evidence: where the football is distorted

The current-source default was checked on two eight-game cohorts: seeds
101–108 and 202–209. Each cohort holds one generated roster pair, so this is
four teams, not sixteen independent talent samples. The first current-source
cohort was reused from the immediately preceding validation; the second was
freshly exported for this review. Native outcomes reproduce the earlier pinned
review: 2,156 clean plays, 1,637 dropbacks, 1,479 throws, 933 completions and
519 designed runs.

NFL outcome values below come from the already examined 2022–23 clean
regular-season reference. They locate problems; they are not targets for tuning.
Clean selection excludes all flagged fouls, including declined ones. Completion
gain is offensive whole-play gain, not a newly measured credited-passing stat.

| Measure | Current default | NFL reference |
| --- | ---: | ---: |
| Completion rate per throw | 63.1% | 64.5% |
| Mean gain per completion | 20.17 yd | 10.90 yd |
| Mean yards after catch | 12.32 yd | 5.16 yd |
| YAC, 90th percentile | 39.68 yd | 12.0 yd |
| YAC of 20+ yd per completion | 18.3% | 3.6% |
| Interceptions per throw | 6.1% | 2.3% |
| Passing TD per throw | 12.9% | 4.1% |
| Sacks per dropback | 3.9% | 6.7% |
| Designed-run success | 27.7% | 49.2% |
| Designed-run median gain | 1.9 yd | 3.0 yd |
| Designed-run mean gain | 5.32 yd | 4.27 yd |

Success uses the shared 40%/60%/100% down-distance rule, not EPA. The rushing
mean hides too many failed ordinary runs and a few very long escapes. Similarly,
a plausible completion rate does not validate catch state, QB risk or coverage.
About 77% of the arithmetic excess completion gain sits in recorded YAC; that
does not prove that post-catch pursuit caused 77% of the problem.

The earlier common down/distance/field comparison retains the same direction:
YAC 13.49 versus 5.48 yd and run success 26.1% versus 46.1%. It covers common
supported cells only and does not match talent, scheme, score or clock.
Both cohorts preserve all twelve existing mechanism guards despite these
large gaps. Guard coverage needs to grow; a passing guard does not establish
acceptable play.

## Ranked priorities and acceptance evidence

| Order | Work | Why now | What would demonstrate progress |
| --- | --- | --- | --- |
| 1 | Catch window → arrival → pursuit → first effective contact | Largest repeated football distortion; huge completion/YAC tails | Matched ordinary native cases show better attainable requests or coherent contact execution; useful existing gathers, wraps and escapes survive |
| 2, alongside 1 | Hand-contact angular transfer and promotion regressions | Confirmed shared-physics defect; prototype is not ready | Independent laws plus resolved native helper/climb/mirror failures, step-refinement checks and unaffected football controls |
| 3 | Ordinary run coordination, then loaded zone flow and runner track | Low run success; poor gap/pull behavior; isolated zone change incomplete | Actual kick/wrap/climb contact, retained keeper security and attainable runner timing improve across concepts/fronts/mirrors |
| 4 | QB pocket decisions, risk and pressure evidence | High interceptions, low sacks, nominated late adjustment | Trace perceived pressure, held command, achieved pocket motion and throw choice on matched cases; retain good quick throws and legitimate escapes |
| 5, throughout | Information boundaries and measurement coverage | Some decisions use hidden state; aggregate guards miss severe conditional errors | Decisions react to acquired cues, telemetry remains observational, and diverse roster/geometry controls reproduce improvements |
| 6 | Rules and special-teams completeness, then league/management depth | Important product gaps, but smaller immediate effect than core scrimmage behavior | Rule-specific witnesses, credible return interactions and persistent league systems after the core engine stabilizes |

### 1. Catch-to-contact sequence

Investigate the whole sequence rather than strengthening all tackles or
tightening all coverage. Early route separation is already small, catch speed
is lower than the NFL reference, and there are more nearby defenders at catches.
Those mixed populations do not certify individual coverage, but they argue
against those broad adjustments.

Existing tracking shows especially large gains after side approaches and
fast-carrier contact. A random 48-completion engineering path review nominates
10 approach/pursuit concerns and six acquisition/support concerns, with overlap.
Light paths did not prove a wrong command or contact-law failure. Start with
`S108-P143` and `S107-P233`; preserve ordinary controls `S107-P214`,
`S204-P60`, `S207-P161` and `S204-P41`.

Record the consumed picture, selected catch window, requested braking/facing,
achieved velocity/support, actual reach, first grasp, load, slip and assists.
Distinguish a whiff, glancing collision and acquired grip that fails. A tracking
"broken contact" proxy is not a labeled missed tackle.

Fresh controlled pursuit checks reinforce this caution: all eight existing
22-body trials (four seeds, both mirrors, one active chaser) ended in a tackle.
Every recording matched its unrecorded witness. This establishes useful control
behavior, not the native-game tackle success rate.

Catch height and extension currently change catch opportunity/probability
without an achieved airborne/landing/support transition. That is a real model
gap. A reduced physical transition may be appropriate after diagnosis; a fixed
post-catch delay would impose an outcome without demonstrating execution.

### 2. Shared contact physics

Production center-based tangential hands have a demonstrated angular-momentum
defect under no-ground isolation. Passing linear momentum and work ledgers
does not repair it. The opt-in common patch conserves angular transfer in all
144 isolated audit cases and improves WZ lateral OL travel in the paired panel.

It remains experimental: eight unchanged assertions fail, comprising two
historic source-equivalence checks and six actual helper/check/climb or mirror
controls. Its eight-game candidate guard also fails yards before contact.
Trace the first mirror divergence and actual helper contact/keeper continuity
before promotion. Treat historical equality separately from meaningful football
regression; preserve the behavioral controls.

The patch does not solve zone flow: WZ OL displacement at 2 s changes from
0.736 to 1.057 yd, OZ from 0.779 to 0.830; RB travel stays unchanged on those
concepts. Other run concepts change too. These are designed paired inputs, not
native-game frequency or empirically established target displacements.

Fresh shared-capability checks ran 120 mechanical reps across five contact
tasks, four profiles, two mirrors and three substep counts. All stayed finite,
mirrored to numerical precision, respected recorded budgets and had matching
fall sets. However, the heavy jam subject ends about 0.46 yd apart at 12 versus
48 substeps; the 12-step mean across tasks/profiles is about 0.039 yd. The
outlier is concentrated and the refinement difference is not monotone. This
needs contact/support transition diagnosis; 48 steps is a comparison resolution,
not exact physical truth. More substeps alone are not a demonstrated repair.

### 3. Ordinary run coordination and outside/wide zone

Fix the ordinary failure distribution, not average rushing yards. Gap/pull
tracking median/p90 is 1.18/5.57 yd versus 3/12 in the reference. The current
controller receipts contain useful recoveries, but native climb outcomes remain
mixed, and some lost contacts are never reacquired before the play ends.

Review puller entry, kick/wrap geometry, helper departure, keeper load, actual
climber contact and runner arrival as one coordinated sequence. Run tackles also
show low tackler entry speed, too many head-on proxy approaches, and short
contact-to-whistle times alongside a long fast-entry escape tail. A global
grip increase could worsen the already abrupt ordinary stops.

For OZ/WZ, distinguish the early free step, constrained loaded block, defensive
moving-gap response and independent runner track/mesh. The two attempted
early-footwork controller changes were rejected and reverted. Some free
interior fits still refer to snap geometry, while engaged first-level moving
shoulder reads and edge surface reads already exist. Do not describe every
defensive fit as static or replace physical handoff reach with a timer.

### 4. QB decisions and pocket behavior

High interceptions and low sacks coexist with a somewhat early time to throw.
The current data does not support simply making QBs hold the ball longer,
raising accuracy or making every rusher stronger. Most interceptions are by
CB/S, not the old dropped-ball/DL pathway.

The random all-snap review nominated late QB adjustment on 11 of 36 passes;
these are engineering concerns, not an adjudicated NFL error rate. Start with
the pinned pocket cases and trace perceived arrival time, protection geometry,
held decision, escape path and the chosen throw's risk. Pressure measurement
also needs consistency: native `pressured` misses portions of windup and differs
from the geometric operator. Neither label proves pressure caused an incompletion.

There is a separate release-capability gap: `minFlightTime` returns an optimum
time even for an unreachable target, while final `solveLaunch` is not checked
against arm speed after re-aim/noise. A 100-yd helper probe requires 37.21 yd/s
with a 26.84 yd/s arm limit. However, a fresh 48-snap ordinary panel produced
41 releases and zero over-limit throws (maximum ratio 0.970). Harden this
contract without claiming it explains current interceptions or is frequent.

## Subsystem assessment

| Area | Current strength | Remaining limitation and recommended action |
| --- | --- | --- |
| Physics and support | Shared planar bodies, bounded work/force, posture, recovery and real joints | Known hand angular defect; some transition sensitivity; reduced geometry and capacities lack strong empirical validation. Repair laws and matched behavior before adding anatomy. |
| Movement and player profiles | Measurables feed shared speed, acceleration, braking, radius and reach | Game burst/cut scaling, turf traction and yaw inertia are assumptions, not validated matched-task parameters. Audit acceleration/deceleration/contact transfer across roles rather than fit one game statistic. |
| Perception and mind | Delayed sampled body/possession states, stable errors and finite decisions | No measured gaze/occlusion model; body facing is a proxy. Information use is inconsistent across controllers. Repair specific leaks with acquired cues. |
| OL and run fits | Real contact acquisition, doubles, keeper transfer, pulls and moving shoulder reads | Lost contact, missed climbs, loaded refits and some snap-based gap references remain. Compare requested versus achieved motion before changing forces. |
| Ball carrier and tackling | Leverage-aware pursuit, support-aware approaches, grips, assists and down-by-contact | Conditional approach/contact errors; quality/miss/fumble probabilities remain partly heuristic. Keep useful variability, but tie outcomes to physically available opportunities. |
| Routes and coverage | Named coverage rules, release reads, caps, match decisions and physical route motion | Coverage correctness is not established by names/contracts; catch windows and pursuit transition need trace evidence. Option routes still read the actual man/zone flag. |
| Catching and ball flight | 3D drag/gravity/wind, ball-segment catch geometry, actual-recipient recording | Catch envelopes use sampled body state and probability-based leap benefits without achieved landing. Final throw capacity is unchecked. Avoid extra timers. |
| QB and protection | Progressions, timing, throw alternatives, pressure and escape evaluation | Partly privileged pressure/route knowledge; questionable late adjustment; heuristic risk; windup pressure logging gap. Review decisions at their consumed-information boundary. |
| Game rules and stats | Substantial clock/drive/OT, turnover, fatigue, substitution and holding accounting | Partial rule coverage. Live holding and pre-snap false start/offside exist; DPI is declared but no live DPI detection/enforcement path was found. Do not claim a complete NFL rulebook. |
| Special teams | Ballistic FG/punt foundations, wind and dynamic-kickoff conventions | Returns, some blocks, muffs and onside recovery use abstract probabilities rather than 22-body play. Extend after core scrimmage credibility. |
| Rosters and coaching | Position generation, correlated ratings, depth charts, suitability and situation-dependent calling | Only four teams in broad current evidence; uncertain scheme/talent response; generated teams are not NFL population samples. Add deliberate roster diversity and matchup transfer controls. |
| League/management | Team and player data provide a starting point | Persistent seasons, contracts, draft, progression and management UI are not implemented as a complete product. Defer expansion until core behavior is trustworthy. |
| Replay and tooling | Seed/source pins, detailed observers, local film, shared NFL measurement operators | Light film is insufficient for requests/loads/perception; packet event/catcher/contact semantics require care. Preserve segment-based observational measurements. |
| Architecture/performance | Clear top-level layers and repeatable Node22 workflow | World and blocking/defense modules are large; many paused physics experiments remain. Modularize when boundaries are understood; no fresh production performance budget or viewer UX/browser certification was performed here. |
| Validation | Extensive maintained assertions, law probes, mirrors, conditional references and receipts | Passing contracts omit known angular failure and severe outcome tails. Expand meaningful guards and diverse task evidence; do not weaken assertions or repeatedly inspect the reserved exam. |

Specific information leaks are visible in `DownfieldBlocker`, which selects
using true carrier/defender states and teammates' private targets; it also
returns `stand()` when `engage()` rejects contact. Fixing that can improve
blocking and increase YAC, so it is not a presumed YAC cure. Option-route
conversion reads `sim.defAlign.coverage.man`; QB pressure mixes delayed
positions with live engagement quality, and route prediction accesses the
runner's actual state. Read-latency work elsewhere does not make these decisions
uniformly information-limited.

Source entry points: [World](../../src/physics/world.ts),
[support](../../src/physics/support.ts), [profiles](../../src/players/physical.ts),
[perception](../../src/sim/perception.ts), [blocking](../../src/sim/behaviors/blocking.ts),
[run fits](../../src/sim/run-fits.ts), [QB](../../src/sim/behaviors/qb.ts),
[receivers](../../src/sim/behaviors/receiver.ts), [defense](../../src/sim/behaviors/defense.ts),
[coverage](../../src/sim/coverage/defender.ts), [catching](../../src/sim/catching.ts),
[tackling](../../src/sim/tackle.ts), [game](../../src/game/game.ts),
[special teams](../../src/game/specialteams.ts), [teams](../../src/league/team.ts).

## Practical next work

1. Export rich traces for the nominated native catch/contact cases and opposing
   ordinary controls. Locate the first wrong request or incoherent physical
   transition. Choose one mechanism and repair it with the same bodies/seeds.
2. In a separate bounded change, resolve the hand-patch mirror/helper witnesses
   and inspect the heavy jam refinement outlier. Require isolated laws and
   cross-task transfer before considering production promotion.
3. Build on the existing native run witnesses to repair one repeated
   pull/climb/runner-coordination failure; include OZ/WZ and ordinary IZ/power
   controls, then inspect the independent runner track and mesh.
4. Review pocket decision witnesses and pressure logging, then protect release
   capability. Add roster diversity to the same mechanism panels before using
   whole games to check downstream consequences.

Preserve shared capacities during controller changes. If two attempts fail to
repair the selected mechanism, stop and re-diagnose. Do not change tackle
strength, turf friction, completion probability, playbook mix or thresholds to
make summary statistics look right. The obsolete one-yard `playBall` stand-off,
old dropped-ball/DL narrative and repaired accepted-holding/fumble accounting
should not be reintroduced as current defects.

For this documentation review the completed full suite was reused; fresh work
ran the second eight-game export/measure/guard, pooled native analysis, the
120-rep capability probe, eight approach-control witnesses, and 48 pass snaps.
No reserved final-exam data was read. Large outputs remain ignored under
`out/full-review/` and `out/zone-development/`; the receipt retains their hashes.
