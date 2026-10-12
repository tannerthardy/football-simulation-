# Current status

Updated 2026-10-12. Work on `claude/engine-priorities`; main and PR #1 are
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
pins; they are not measurements of this combined engine. Combined-source
checks and held-input comparisons are being recorded before publication.

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

**Next shared-physics milestone:** explain the first diverging helper/keeper
request or achieved contact/support response while preserving the corrected
point laws. Contact onset/release and sustained constraints deserve attention
before more shoulder anatomy or global solver resolution.

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
