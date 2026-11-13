# Pursuit, run support, and tackle constraints

The largest reproduced causes of the previous run-game breakaways were pursuit
decisions and defensive support that never executed its assigned fit. Tackling
also had mechanical defects: a wrap could create momentum, a tackler could
remain in two movement constraints, and a whiff counted as contact. Those
defects are corrected. The next run-game priorities are front-specific blocking,
initial lateral footwork, and graded grasps. Lower rushing averages alone do
not establish realistic football.

This compares `62d0cb2` with the implementation identified by the source hash in
[the manifest](../../../data/reviews/pursuit-contact/evidence-manifest.json).
It incorporates `3b5bf9b`, the newer evaluation-plan commit, which changes
documentation rather than execution. The prior
[coordination review](run-game-coordination.md) contains the PDF/coaching sources.
Follow the separate execution/context/coaching/league tests in
[the evaluation plan](../plans/EVALUATION_ENVIRONMENT.md). Its newer 2023–2025
published figures are verification leads, not new tuning targets.

## Reproduced defects and fixes

### Pursuit forecasts and approach

The old forecast accelerated every target to maximum speed and bent its heading
upfield, inventing movement for a stationary pocket QB or a slowly pressing
back. Its breakdown branch activated several yards away on oblique approaches,
flattening interception angles. A permanent shade toward the field middle could
remain outside tackle reach near the sideline.

[Pursuit](../../../src/sim/behaviors/common.ts) now forecasts observed heading and
recent delayed acceleration over a short decay window. It uses functional reach
for interception, preserves the force/box approach contract, and closes the
shade onto the hip near contact. Breakdown requires a substantially head-on
approach within a braking/closure window. Distance and steering use perceived
carrier state. Per-play angle errors use a named local stream, so entering
pursuit does not consume the shared outcome stream.

These are bounded forecasts, not access to the carrier's next intended cut.
Reach estimates still simplify turning/facing; opponent ratings and fatigue
are not yet imperfect capability estimates.

### Assigned support was bypassed

Zone coverage let underneath defenders execute their run fits after reading
run, but explicitly excluded deep defenders. A safety could correctly read run
and keep dropping until the ball crossed the line. The assigned alley cap
existed but was not used by this common behavior path.

[Zone coverage](../../../src/sim/behaviors/defense.ts) now executes its run-support
contract when its own recognition says run, including deep players. The alley
fit retains depth through the mesh and intercepts when the back declares. A
wrong read can expose play action. Secondary-specific key priorities and
confidence-dependent support remain work to do; the binary read is coarse.

### Rejected strikes stopped the blocker

Pass protection's shoulder-punch window exceeded central functional reach. A
protector could request contact, have it rejected, and still stop his feet.
[Blockers](../../../src/sim/behaviors/blocking.ts) now stop for a strike only when
engagement succeeds. Otherwise they continue fitting. Run strikes and stalk
blocks follow the same rule. A regression scenario explicitly places the
protector inside his requested-punch window but outside physical reach.

### Contact, momentum, and constraint ownership

[Tackling](../../../src/sim/tackle.ts) waits for better contact only when the relative
trajectory predicts a reachable improvement. A glancing runner is not allowed
to pass while the defender waits for an unreachable square shot. A whiff neither
sets contact nor applies an unexplained carrier speed loss. Opponent body bumps
record contact in the collision solver; successful/broken grasps and successful
dives also count.

Impact applies equal and opposite normal impulses. A successful wrap shares
mass-weighted velocity among the carrier and all tacklers. An arriving assist
shares momentum with the entire pile. Stopping and leg-drive accelerations use
total pile mass. The pile advects together before finite mass-weighted grasp
corrections, which preserve its center of mass. Tests verify two-axis momentum,
non-increasing attachment kinetic energy, assist momentum, and center-of-mass
movement. Ground forces are external, so momentum is not expected to remain
constant through subsequent pile motion.

A wrapping defender releases his old block. [Engagement creation](../../../src/sim/engagement.ts)
rejects bodies already in a tackle bond, preventing two solvers from moving the
same body. This is not a full three-body block/tackle or simultaneous contact
solver. New replay events `carrier_contact` and `tackle_wrap` expose body impacts
and low-impact wraps that previously lacked a `hit` event.

**Contact definitions changed:** old YBC included whiffs. Before/after contact
statistics must not be reported as a pure mechanical improvement.

## Paired execution evidence

[The lab](../../../scripts/pursuit-contact-lab.ts) holds calls and roster pairs fixed:
four roster seeds (7,19,31,43), six concepts, ace/gun 11, Over/Tite, both flips,
20 repetitions: **3,840 plays per variant**. Physical fouls are included. Lost
fumbles credit offensive gain to the fumble spot, never the defensive return
spot; touchdowns and tackle attempts are restricted to offensive carriers.
Over uses base43 and Tite uses base34, the first compatible personnel for each
front; this deliberately does not reproduce NFL defensive personnel versus 11.

Isolated variants change only pursuit, deep run support, or contact/tackling.
The combined variant also fixes rejected strikes. Initial named seeds match;
later random draws can diverge after movement/contact changes. Moving pursuit
error to its own stream is part of that variant. These are fixed-roster
mechanism comparisons, not independent NFL samples or formal causal estimates.

| Variant | Yards/carry | Stuffs ≤0 | 10+ runs | Offensive TD | TD without a tackle attempt |
|---|---:|---:|---:|---:|---:|
| `62d0cb2` | 6.64 | 23.00% | 13.57% | 5.44% | 1.61% |
| Pursuit only | 4.02 | 23.85% | 12.71% | 1.77% | 0.31% |
| Support only | 4.84 | 23.26% | 7.08% | 3.65% | 1.09% |
| Contact/tackling only | 5.74 | 27.37% | 11.04% | 5.00% | 1.46% |
| Combined | 2.31 | 27.45% | 3.33% | 0.94% | 0.08% |

The combined sample has **3 touchdowns without a tackle attempt versus 62
before**. Those plays may include non-tackle body bumps. Misses against
offensive carriers change from 0.140 to 0.147 per run, broken tackles from
0.062 to 0.054. Increasing tackle-success probabilities was not the remedy for
missing support/angles. Contact fixes improve mechanical invariants but leave
most unattempted touchdowns when applied alone.

The combined controlled rushing average is too low and its stuff rate too high
to call calibrated. [Cell metrics](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/pursuit-contact/paired-run-diagnostics.json)
retain these failures and the isolated comparisons.

The open-field lab adds **2,400 plays per revision**: the same four rosters,
five geometries, both mirrors, straight 6 yd/s carriers or live evasion, and
30 repetitions. Wide diagonal mean gain against the slower straight carrier
falls from about 28.7 to 12.1 yards; the narrower diagonal against live evasion
falls from about 18.1 to 14.2. The fast wide-diagonal case still escapes every
time. A feasible-trajectory reference is needed before classifying every
escape as a pursuit defect: speed, initial velocity, turning, and leverage
constrain what is physically reachable. That case is not NFL-validated.

See [open-field evidence](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/pursuit-contact/paired-open-diagnostics.json)
and [selected first-repetition traces](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/pursuit-contact/representative-traces.json).
These traces are explicitly selected scenarios, not league averages.

## Broader checks and NFL limits

The final six-front development check has **7,200 runs** across seeds 7/19,
four formations, both flips, and eligible concepts.
[Its summary](../../../data/reviews/pursuit-contact/development-summary.json) still
shows inside-zone OL lateral movement at 0.5 s of only **0.129 yd**, versus
**0.410 yd** in the prior NFL cohort. Sustained OL proximity averages 0.522 s
versus 0.635 s; LOS crossings average 2.223 s versus 2.782 s. Those are broad,
unmatched cohorts and different contact proxies, not movement multipliers.
They identify footwork/development questions requiring concept, formation,
situation, and surface matching.

Counter against Under has one initially unassigned down threat per snap in this
matrix. Power/Counter/Trap against Odd also usually leave one. Ace-11 inspection
shows backside edges. Some installations deliberately leave an edge for a read
or timing constraint; these calls do not carry an explicit explanation of that
choice. Count, block geometry, TE/wing availability, and runner path must decide
between a hinge, back-block, tag, read, or an unsuitable call. A distant blocker
must not acquire instant control to satisfy assignment accounting.

The held-ball protection lab uses 250 repetitions each for roster seeds 7/19.
Early pressure was **58.8%/64.8%** before; final rates and sacks are in
[the trench log](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/pursuit-contact/after-trench.log). The
rejected-punch scenario and pursuit forecast explain a real failure path. This
lab holds the QB for up to seven seconds and is not an NFL sack-rate estimate.
Assignment/get-off/rep strength remain roster-sensitive.

Eight-game checks use seed 7 and two generated leagues:

| Metric | Before | After |
|---|---:|---:|
| Points/team-game | 33.44 | 32.56 |
| Rushing yards/carry | 7.00 | 5.09 |
| Stuffs | 21.51% | 25.21% |
| 10+ runs | 16.94% | 9.74% |
| Sack rate/dropback | 14.16% | 10.12% |
| Passing yards/attempt | 9.27 | 9.23 |
| YAC/reception | 6.26 | 6.18 |
| Separation at catch/incompletion | 4.07 | 3.88 |

See [before](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/pursuit-contact/before-games.log) and
[after](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/pursuit-contact/after-games.log). Calls and game states
change with execution, so these are ecology checks. Eight games are not a
stable league estimate. Passing/sacks remain high; stuffs worsen. YBC changes
from 3.10 to 0.98 yd, but its definition correction invalidates a direct comparison.

The existing all-22 NFL reference covers 1,394 designed runs from the 2022
season, weeks 1–2. Sparse blocking labels, ambiguous front proxies, and
unverified MAN/Duo and outside/wide/split mappings remain limitations. No new
NFL sample or validated mapping was fabricated in this pass.

## Next implementation priorities

1. **Front-specific blocking and development.** Separate unassigned backside
   threats from interior penetration. Build allowed down/back-block/hinge
   exchanges before combos, retain reachable owners, and record intentionally
   unblocked/read responsibilities. Check mirrored Under/Odd/Bear cases and
   whether leverage arrives before the back commits. Zone lateral footwork
   remains too small.
2. **Grasp quality and balance.** Quality currently influences miss/break
   chances, but a successful fingertip grasp becomes a full coupled wrap.
   Model weak reaches, establishment, torso wraps, and failed grasps from
   separation, relative velocity, strength, and leverage. Add finite rotational
   balance loss and grounding while preserving momentum invariants. Do not
   compensate with outcome probabilities.
3. **Simultaneous collision/constraint response.** Compound piles still use
   ordered pair corrections. Add swept contact where needed, mass-consistent
   block/pile reactions, and overlap/correction/timestep diagnostics. The
   shoulder-turn footprint is implemented; crowded squeeze/tackle interactions
   still need dedicated scenarios.
4. **Secondary decisions and difficult pursuit.** Separate route-key support
   from generic run belief, retain a credible cap, and test play action/misreads.
   Add a physically executable interception reference and turning/facing-aware
   estimates for wide-angle escapes. Use bounded beliefs and held actions,
   rather than frame-to-frame jitter.
5. **Passing execution and policy.** Freeze contexts to separate coverage/route
   separation, pocket failures, release decisions, and YAC. Measure coaches and
   league ecology separately. Season-tag every NFL context/target, as required
   by the updated evaluation plan.

Release gates include momentum/ownership scenarios, mirrored front rules,
forced-context timing/penetration distributions, and held-out tracking weeks.
Keep the development PR draft until those checks explain the remaining stuff,
passing, and roster/front sensitivity.

## Verification and reproduction

**115 TypeScript tests, six Python fixtures, typecheck, and build pass.**
[Regression tests](../../../test/pursuit-contact.test.ts) cover perceived steering,
stationary forecasts, oblique/sideline approach, deep support, rejected strikes,
glancing/head-on contact, whiffs/body bumps, solo/assist momentum, pile movement,
and constraint ownership.

The standalone replay contains 177 log entries, 129 filmed plays, three
negative-time sequences, and new contact events. Embedded JavaScript syntax,
frame timestamps, and data strides pass. Browser interaction was not tested.

```sh
node --import tsx scripts/pursuit-contact-lab.ts runs 20 out/pursuit/runs.json
node --import tsx scripts/pursuit-contact-lab.ts open 30 out/pursuit/open.json
node --import tsx scripts/run-development-lab.ts 10 7 out/pursuit/development-7.json
node --import tsx scripts/run-development-lab.ts 10 19 out/pursuit/development-19.json
node --import tsx scripts/calibrate.ts 8 7 2
node --import tsx scripts/trench-lab.ts 250 7
node --import tsx scripts/trench-lab.ts 250 19
node --import tsx scripts/export-replay.ts 7 --out out/pursuit/replay.html --doc
```

Archive `62d0cb2` into an ignored directory under the repo, copy the current lab
into its `scripts/`, and execute there. Pursuit-only replaces
`src/sim/behaviors/common.ts`; support-only replaces `behaviors/defense.ts`;
contact-only replaces `tackle.ts`, `engagement.ts`, `playsim.ts`, and `types.ts`
with this revision's versions. The manifest records source and script hashes.
Raw diagnostics stay ignored; compact cells, selected traces, and review
summaries are committed and accessible to collaborators, including Claude.
