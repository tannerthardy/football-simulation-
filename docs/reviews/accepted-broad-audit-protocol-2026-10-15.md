# Accepted-build broad football audit: frozen review protocol

This audit asks which visible football problems recur in a modest, deliberately
varied panel of the accepted simulator. It does not estimate league-wide defect
rates or rank bugs from selected historical failures. No engine change is under
test. Freeze the panel and this rubric before inspecting its results.

Accepted build: `8ca8deebe4afa91c3021bdd119bed8976cf00e47`.
The collector records the engine source hash, exact setup, source/measurement
versions, runtime flags, toolchain, full initial state and receipt for each case.

## Panel and stopping rule

Use the four existing capability-selected actual lineups in
`config/roster-screen.json`: `speed-gap`, `technique-elusive`, `ordinary`, and
`offensive-advantage`. Their names describe input capabilities, not expected
winners. Do not regenerate players or select seeds after observing outcomes.

Run twelve predeclared calls per matchup: inside zone, outside zone, wide zone,
power, counter and duo; slant/flat, mesh, smash, four verticals, play-action flood
and Y-Cross. The frozen collector manifest supplies exact concept, formation,
defense, field position, seed and setup identifiers. One fixed seed per call
produces 48 complete 22-player snaps, 24 designed runs and 24 called passes.
Use full existing telemetry at every native 0.05-second tick. Retain all outcomes,
partial failures, penalties, terminal reasons and an unrun tail if a budget ends.
No favorable-prefix stopping, replacement seeds or extra outcome-selected cases.

This balanced call panel broadens mechanism exposure. It is **not a random
sample of the simulator's game caller**. Fresh snap energy, fixed field context,
four related frozen roster fixtures, one seed per call and the declared schemes
limit transfer. It cannot establish game-wide calling, accumulated fatigue,
special-teams or season behavior. Do not weight its frequencies as NFL/game rates.

## Review each complete sequence

Review in manifest order, including successful football. Inspect snap/release,
mesh or pass development, possession transition, approach/contact and termination.
For every concern retain case ID, player ID and slot, phase, first concerning
tick, observed action/geometry, apparent lost opportunity, consequence and a
legitimate competing explanation. Verify actual call and recorded responsibility.
Do not declare a failure from yardage, a missed tackle or an engagement endpoint.

| Symptom category | What can justify a concern |
| --- | --- |
| Runner and teammate coordination | Mesh or track conflict, repeated same-team collision, a runner stalled by teammate traffic, or a puller/runner sequence that loses useful access. Ordinary defensive squeeze remains a possible explanation. |
| Blocking access and continuation | A relevant threat receives no useful interference, a blocker approaches an unusable surface, abandons useful work, misses a pickup, or cannot progress to an apparently available next job. A defender shedding or winning a matchup is not itself a defect. |
| QB pocket and ball decision | A visible pressure/space sequence warrants checking pocket adjustment, throw commitment, target choice or escape. Record the actual threat and time available; a stationary QB alone does not establish a frozen decision. |
| Coverage and recognition transition | A responsibility appears unaccounted for, an exchange/help response loses useful coverage, or a recorded acquired cue conflicts with the retained action. A completion alone does not establish a bust. |
| Pursuit, arrival and gathering | A repeated bad approach angle, unnecessary retreat/stop, unreachable aim point, or inability to gather removes a useful defender. Check earlier disadvantage and opponent speed before attributing a loss. |
| Contact, support and recovery | Unexpected overlap/displacement, abrupt motion, persistent nonproductive contact, implausible recovery or a contact transition needs explanation. Identify actual contact evidence; proximity, a bond and a broken-tackle event are insufficient proofs of force or grip failure. |
| Possession, termination and rules | The visible ball/possessor/event sequence disagrees, play ends inconsistently, or a concrete legality concern changes the sequence. State the applicable rule and avoid treating every collision as a foul. |

Record useful offense and useful defense alongside concerns: coherent blocking,
earned sheds/pressure, valid coverage, feasible pursuit, successful evasion and
supported finishes. A play may contain a local concern and a legitimate opponent
win. A concern-free play is evidence reviewed, not a certificate of realism.

## Counts, consequence and confidence

Count each symptom category at most once per play, even when several actors or
ticks show it. Retain actor/time details separately. Categories can overlap;
their counts must not be summed as the number of bad plays. Where one early
problem propagates through blocking, pursuit and contact, identify that common
sequence and do not present three downstream observations as three proven causes.

Primary report: flagged plays / all reviewed panel plays, with designed-run and
called-pass denominators. Called passes include sacks, scrambles, incompletions
and throwaways; do not condition pocket quality on completed or attempted throws.
Report completion/post-catch concerns over plays with actual catches separately.
For a phase-specific rate, show the manually verified eligible exposures and its
definition: e.g. live carrier segments for pursuit or actual recorded contact
plays for contact review. Keep no-exposure and unavailable evidence distinct from
clean execution. Do not use nearest-defender proximity as a contact denominator.

For every category report observed incidence, number with a material sequence
consequence, confidence and examples for/against. Consequence is described as
local/transient, a lost useful action, or an apparent drive/score/possession effect;
these are review judgments, not estimated counterfactual yards. A touchdown does
not prove the concern caused it. Prioritize frequent consequential observations
with strong evidence, then identify the cheapest discriminating trace for the
top few. Do not create a weighted score that hides those dimensions or claim a
stable ordering when small counts or uncertainty overlap.

| Cause class | Required evidence |
| --- | --- |
| Demonstrated | A reproducible contract violation or trace-supported information/request/physical defect precedes the symptom. State exactly what is established; demonstrating a local cause does not establish how many yards it caused. |
| Plausible | Geometry and observed state support an explanation, but another football or implementation cause remains. Name that alternative and the missing discriminant. |
| Unknown | The visible concern is real enough to inspect, but evidence cannot identify its cause or establish that an achievable better action existed. |
| Coherent or no clear concern | The visible sequence supports a legitimate result or supplies no specific contrary evidence. Preserve both offensive and defensive successes. |

The final ranking concerns **panel-observed symptoms**. A demonstrated mechanism
can occur within a rarer category; that does not automatically make it the largest
whole-simulator problem. Historical selected reproductions may help explain a
current witness only after source/contract compatibility is established.

## What the existing trace can establish

Stable roster indices join player IDs, slots and teams to all-22 positions,
facing, events, current targets/jobs, final movement intents, body velocity,
support state, energy, block links/control/hands, tackle state, recognition belief,
actual requested perception samples and QB read/pending state. Keep native event
times and original IDs. Follow the same actor across phases; nearest endpoints
can switch identity.

The current recorder stores positions after the physics step at the enclosing
tick's existing `t`, before advancing simulation time. Events also identify their
enclosing tick. Treat these as native tick bins, not exact continuous collision
instants. The staged `t=0` frame is replaced by the first live tick: use the saved
initial state when assessing release/alignment, rather than reconstructing it
from that frame. Rounded replay positions are weaker evidence for derivatives
than recorded body velocity.

Stored intents have already passed through engagement, tackle-bond and teammate
spacing refinements. They separate a final request from achieved movement but
cannot alone identify which earlier controller created it. Perception samples
are actual `see`/QB calls, deduplicated by pair/source within the tick; calls can
come from spacing and other helpers. A recorded cue establishes an available
input, not that the target behavior causally used it. Missing causal choices and
rejected alternatives remain missing. Facing is not gaze.

Contacts and hand/grip fields describe sampled simulator state, not a complete
force/work history or independent evidence of real football. A contact interval
must be excluded from an approach-speed claim; report contact and post-contact
motion separately. Full snapshots alone cannot establish a numerical law defect,
counterfactual block delay, grip force realism, or whole-play causal improvement.
Use a saved targeted trace or existing controlled reproduction only when it can
resolve a leading uncertainty. No automatic second panel or general framework.

Policy: [selective testing](../TESTING_COSTS.md),
[football validation](../VALIDATION.md) and
[behavior interpretation](../BEHAVIOR_REVIEW.md).
