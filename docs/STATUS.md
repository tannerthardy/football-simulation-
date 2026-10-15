# Current project status

Updated **2026-10-15 (America/Phoenix)**. The canonical accepted commit and
short ready/blocked/experimental record are in [the integration queue](INTEGRATION.md).
Do not use the historical sections below as a current starting-reference pin.

- Accepted develop includes merged #12; historical `4ded6b6` stays separate.
- #63's five narrow corrections are verified, with controller contract approval
  recorded; final integration/merge decision remains. They are not merged. Reuse its exact receipt; no suite rerun is requested.
- The gap correction is portable; earlier zone/Duo work and the rejected
  entry-risk trial remain separate. Its latest information-versus-navigation
  clarification is recorded without promoting it. #34 coverage and #36 awareness retain
  their named blockers/owners. #54 and physics packages remain experimental.
- New entry-admission work has a real owned-information interface dependency;
  it stays separate from #63 pending Awareness/Run Game review.
- PR bookkeeping: 43 finished/superseded PRs closed; 23 remain open after #67
  arrived. All starting branches and evidence remain. [Disposition record](INTEGRATION.md#pr-dispositions).
- #66 has seven contract failures to adjudicate; new #67 stays separate from
  frozen #63. Neither is promoted by cleanup.
- New work starts from accepted develop. Existing owners check relevant
  accepted changes at clean checkpoints; [workflow](INTEGRATION.md#agent-workflow).

<details>
<summary>Historical status retained from accepted develop a1b16e6</summary>

The original source/counts and then-current instructions below are preserved.
The queue above supersedes their live-status claims.

# Current status

Current shared baseline: [BASELINE.md](BASELINE.md), `codex/run-game-integration`.
Its profile and validation receipt supersede the branch/count guidance below;
the dated sections retain their historical source pins. Main and PR #1 remain
outside this work. NFL figures diagnose mechanisms, not values to fit.

## What is live

One reduced physics World moves every body and resolves collisions, bounded
ground traction, hand/grip force and work, posture, balance and achieved recovery.
Bodies are planar with height/posture approximations; the ball is three-dimensional.
There are no skeletal limbs. Controllers request actions and World executes them.
Ratings change capabilities, information and control, not an awarded outcome.

Physics accounting and controlled interactions are useful foundations, not proof
of finished football, measured NFL contact capacities or universal convergence.
Some controllers still use private state. Body facing is not measured gaze.

The latest [tackle finish repair](reviews/tackle-finish.md) requests a plant
along a secured hold instead of following the runner forever. Existing physics
executes it with unchanged capacities; a moving runner is no longer ruled down
by a four-second hold timer. In the matched 144-rep panel, production physical
falls rise 106→122; patch falls rise 62→92, with unfinished adverse reps retained.
That repair's source `f14d849a51` passed its **1,486 TypeScript tests**, **141 Python checks**,
typecheck and build. The two-game smoke check holds 12/12 existing guards.
Patch promotion stays **42/50**. The diagnostic-only
[loaded-grip investigation](reviews/loaded-grip-refinement.md) now compares both
pinned witnesses and mirrors at 12/24/48/96 steps with frozen decisions. It finds
an early dive transition and grip/support recovery disagreement. The achieved-foot
proposal is now rejected: a live grip can change recovery at zero force, and a
finite error persists as nonzero transmitted force vanishes. The
[reconstructed phase continuation](reviews/recovery-phase-reconstruction.md)
preserves it as a permanent negative control. Local base-crossing and completed
dive timing pass independent short-interval checks, but rear disagreement still
reaches 2.218 yd at 12 versus 96 steps. Continuous-source integration exposes
opposing responses at the base and is rejected, with all failed runs retained.
The next [one-body continued-recovery candidate](reviews/continued-recovery.md)
now passes sustained/removed/increasing and weak-load checks, both crossings,
mirrors and unequal partitions. It bounds the ankle target to the existing base
and continues a begun step until the inner ankle request fits again. This changes
unheld recovery in the outer half of the base and remains diagnostic only.
Matched rear disagreement falls to 0.063 yd at 12 versus 96, but native rear
holds still do not finish. Angled disagreement remains 3.453 yd; native coarse
cases escape while finer ones are censored. All 24 ordinary endings remain,
with adverse advance pairs retained. Candidate center controls are 48/50 (two
historical hashes); patch stays 42/50. Next: trace the first loaded angled
grip/yaw fork at 2.650000–2.654167 s and its later achieved fall transition,
before another support adjustment. Production and capacities remain unchanged.
This stage passes 1,312 core, 225 research and 141 Python checks, typecheck/build
and 48 candidate law cases. Earlier native game-record timeouts despite an
isolated pass remain recorded; no new full-suite pass is claimed.

## Prior validated repair stage

The [pursuit review](reviews/pursuit-coverage.md) and
[contact receipt](../data/reviews/current/contact-coupling.json) record two
controller repairs after the earlier pursuit-angle fix:

- Partial tackle gathering now turns toward the acquired hip. Reversed angle
  arguments turned away in 22/24 randomly selected ordinary completions.
- A defender can take the existing marginal lunge when acquired possession
  and a held-command movement preview show the last attainable reach is now.
  It retains waiting for a better wrap, limited information and physical costs.

The original 69-YAC escape had **no grip or opposing body impact**. On its same
preplay input it now ends after 4.75 YAC, through an ordinary weak leg hold and
later support failure. Three ordinary source-only controls retain exact final
bodies/intents/minds/RNG relative to the gather repair. No grip capacity, rating
or solver resolution increased. Twenty of the 24 ordinary catches acquire
grips; all 30 grips carry load. Four break, but those plays are later tackled.

The 128 encounter and 32 approach panels retain their endings/censoring and
initial/profile pins. Some gather-repair cells allow slightly more carrier
advance; every adverse cell is retained. The last-reach increment introduces
no physical change in those panels. A repaired nominated play is not a global
tackling-success claim. Jump/landing is still an unachieved transition: one
ordinary catch exceeds the modeled partial-leap reach. Its frequency and causal
effect need matched high/low catches before adding a new mechanism.

Sixteen games at our pre-integration source retain all 12 existing mechanism guards in each roster
cohort and pooled. **They do not show a broad outcome improvement:** mean clean
YAC is 10.51→10.53 yd, YAC p90 28.02→30.63 yd, and points per team-game
47.5→48.8. One cohort scores more and the other less. Run success stays about
29.9%; run explosives increase. Later calls, situations and RNG diverge, so
these are diagnostic cohorts, not paired plays. Keep the visible mechanism
repairs; investigate ordinary current failures rather than tuning these averages.

At that source, all **1,251 TypeScript tests**, including integration and preserved research,
and **141 Python checks** pass; typecheck and build pass. Full-suite time with
concurrent game exports was 182 s; the preceding identical physical stage ran
in 129 s. These are full-suite timings, not a claim about fast `npm test`.

## Concurrent catch-phase integration

Remote `fb08bd6` is now integrated, preserving its
[moving-catch and rejected-contact repair](reviews/catch-contact-repair.md) and
[receipt](../data/reviews/current/catch-contact-repair.json). It lets nearby
running defenders carry an observed catcher instead of braking toward a fixed
ball point, estimates moving-hand reach, and keeps a downfield blocker moving
when the real engagement guard rejects contact. Actual catch reach and shared
physics capacities are unchanged. This is separate from full in-stride catches.

The earlier tables above and in both receipts retain their original source
pins; they are not measurements of this combined engine. At source `929fbda8`,
all **1,259 TypeScript tests** in 110 files and **141 Python checks** pass;
typecheck and build pass. Both eight-game cohort guards and the clean pooled
guard pass 12/12. Mean clean YAC is 10.78 yd, p90 33.01, points per team-game
48.1 and designed-run success 28.3%. Broad YAC/scoring problems remain.

The original S105-P159 retains its exact repaired endpoint and RNG. The three
ordinary controls remain tackles, with changed paths/gains. Six independently
recollected incoming contexts reproduce their original baseline outcomes;
all 18 source/recording checks pass. S108-P143 changes from a 37.54-YAC TD to
a 10.88-YAC tackle. S107-P233 remains an unresolved 69.28-YAC TD, and an
ordinary wrap permits more YAC. These tradeoffs remain in the contact receipt.
The recollected context bytes differ from the unavailable old artifact; we do
not claim historical byte identity. The patch hand oracle still passes 144
cases and promotion remains 43/50, with the same five football failures.

## Shared-contact prototype: not promoted

The [contact prototype review](reviews/zone-flow-prototype.md) separates the
opt-in patch from production **center hands**, which retain the known angular
momentum defect. Patch hands now use achieved mean transport, and torso impulses
use a single point with normal/tangent moments and rotational effective mass.
The independent 144-case hand oracle and six no-ground torso cases pass.
A synthetic redirect mirror also had an unreflected protection home; the lab
installation is corrected and extended post-shed controls pass in both modes.

Promotion still fails **five football controls**: useful wrong-side helper
contact, recovered keeper confirmation, Under check/climb, Tite unfinished work,
and Bear release. Two preserved legacy source hashes also differ. Do not weaken
these controls, promote the patch or strengthen hands to rescue them. Prolonged
heavy-jam refinement is nonmonotonic, and strong-jam falls disagree at 6 versus
48 steps. A passive damping trial restored one helper condition and broke
another; it was rejected. Conservation is improved; convergence and football
readiness remain unproved.

The [angular-contact follow-up](reviews/angular-contact-repair.md) fixes a
second defect: mixing torso impacts with finite hand forces used inconsistent
transport timing. Start impacts now precede hand-point construction and acquired
yaw advances in the same interval. An optional persistent local torso point
delivers normal and steering torque, using the same work/force limits. Coincident
half-cap hands share compliance. Actual force vectors and moments are available
to controllers. All changes remain behind the existing `patch` option.

At source `97612098`, **1,298 TypeScript tests in 111 files** and **141 Python
checks** pass; typecheck and build pass. The 144-case hand oracle and 36 shared-body
material-contact law cases pass. Unchanged patch promotion is still **43/50**.
The blocker sometimes interprets force opposing its own yaw as lateral opponent
motion; removing that cue or changing material-point geometry does not repair
the sustained keeper. [Work ownership](WORKBOARD.md) now assigns that controller
diagnosis to the confirmed controller session. Both default hash witnesses pass.

The [sustained-contact follow-up](reviews/sustained-contact.md) fixes an unbounded
spin reset when getting up in production. Patch mode adds fixed-response bounded
turning, using existing torque/rate limits and peak torque for recovery allocation.
At source `f2eb1e3a`, all **1,337 TypeScript tests in 115 files**, typecheck and build
pass. The combined default also passes **141 Python checks**. No new grasp law,
leg anatomy or force bonus is added. Patch promotion is **42/50**, with six football
failures and two preserved historical hash differences. Ordinary jam refinement
worsens; heavy refinement improves. Keep both results and the opt-in boundary.

The controller owner's [anchor and diagnostic work](reviews/controller-easy-gains.md)
is integrated. Get-up-stage four-game guards pass 12/12; these are not measurements
of the later combined stage. Live-gap controller work is claimed separately.

The [upper-grip repair](reviews/upper-grip-angular-repair.md) now closes upper
grasp yaw and mixed hand/grasp transport in patch mode, with unchanged capacities.
Source `e901bb5b` passes all **1,388 TypeScript tests**, **141 Python checks**,
typecheck and build; default hashes pass. Patch promotion remains **42/50**.
The [lower-grip follow-up](reviews/lower-grip-angular-repair.md) now combines
yaw, material contact and the existing recovery motor in patch. All **1,449
TypeScript tests**, **141 Python checks**, typecheck and build pass; default
native tackle results remain exact. The old faster lower-transition law failures
close, but native angled tackles regress (120 → 94 of 144 panel reps), so patch
stays experimental. **Next:** explain the first loaded grip's moment, body
rotation and support response, including real wrap geometry. Strength tuning
or the existing four-second hold whistle cannot substitute for a physical stop.
Keep helper/transfer controls through the separate live-gap controller work.
Neither this upper law repair nor six selected catches justify stronger tackles.

The [engaged-zone audit](reviews/engaged-zone-physics.md) answers the live-gap
physics questions. Hands do not drag pure co-motion; a native anchor reverses
useful lateral requests, and release credits turning the loaded body has not
achieved. Those controller fixes belong to Claude. Patch gait now plans from
actual facing rather than borrowing a future turn, and signed angle arithmetic
preserves reflected loads; default zone traces remain exact. At source
`a6459b85`, all 1,472 TypeScript tests, 141 Python checks, typecheck and build
pass. The angular patch still fails promotion at 42/50; capacities stay fixed.

The [interior flow/climb follow-up](reviews/wide-zone-guidance.md) finds no new
universal pair-speed barrier. Requests often reverse useful flow, and combined
turning/translation saturates during individual plants. Climbs split into
fixed-frame keeper vetoes, legitimately unsafe takeovers, missed approaches
and acquired blocks protecting the wrong path. Selected calls account for all
backers through the full installation; historical unassigned calls need their
original ledgers. The free-movement preview now accepts the actual hand-contact
model, with isolated scratch state and unchanged default callers. Source
`621ad936` passes all 1,482 TypeScript tests, 141 Python checks, typecheck and
build. The native audit retains its separate older combined source pin.

## Other branch work

The `claude/run-blocking` leverage/anchor package at `88bfc45` was reviewed
read-only and **not merged**. Its useful idea is that lower pads and self-load
anchoring matter. Three executable witnesses reveal coupling gaps: a distant
bystander changes inferred load, turning and translation exceed their combined
actual traction allowance, and two contacts unload more than a body's weight.
See the contact receipt and prototype review. Fix interval ownership, shared
normal-load budgets and simultaneous-contact allocation before integration.
Anchor can be tested separately with unchanged capabilities and lateral-zone
negative controls. Outside/wide-zone work still belongs to the other session.

The core rule in `CLAUDE.md` is retained: **never ban a successful technique to
fix a statistic**. Find its missing physical cost, information limit or opponent
response. This does not remove physical force or traction limits.

## Football work and existing evidence

The prior [random 48-snap review](../data/reviews/current/random-play-review.json)
nominated pocket adjustment, puller timing and pursuit concerns; most needed
richer traces. The latest 24-catch review above establishes the repeated gather
error. Do not interpret either small sample as a complete ranking of all football.
Next, sample current ordinary approaches and pre-throw coverage before expanding
in-stride catches. Early route separation is already small; blanket coverage
tightening or tackle-strength changes are unsupported.

Run-controller receipts preserve [combination security](../data/reviews/current/run-combination-security.json),
[support installation](../data/reviews/current/run-support-install.json),
[OL leverage](../data/reviews/current/ol-leverage-review.json) and
[DL flow](../data/reviews/current/trench-controller.json).
Missed climbs, loaded primary/DL refits, backside gap/pull work and defensive
support remain incomplete. Historical outcomes retain their original sources;
do not relabel them as current engine measurements.

The [NFL review](reviews/nfl-gap-review.md) and [data guide](NFL_DATA.md) identify
references and limitations. Most public benchmarks have already been examined;
they are not blind holdouts. Physical-profile mappings and measured contact
capacity remain major evidence gaps.

## Keep the project light

Read [validation](VALIDATION.md) for layer-by-layer checks, matched controls,
random-film review, the two-attempt stopping rule and the future untouched exam.
`npm test` runs production contracts; `test:integration` keeps slow game checks;
`test:research` preserves paused anatomical/sole assertions. `test:all` runs all.
Research probes stay outside production/default tests; generated films and
traces go to ignored `out/`. Old large evidence remains recoverable at `663193d`
through [the retrieval guide](../data/README.md). History was not rewritten.

</details>
