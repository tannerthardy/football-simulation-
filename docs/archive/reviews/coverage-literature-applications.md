# Coverage literature: small applications before deeper scheme work

## Status and scope

Physics remains the priority; see [Physics development](../plans/PHYSICS_DEVELOPMENT.md)
and the current [physics review](physics-step-back-and-local-repair.md). This
review uses all four supplied coverage/receiver/defense references. It adds an
observational rule/ownership lab, not a new coverage family, a coverage-success
coefficient, or an artificial bust probability.

The sources are user-supplied teaching manuscripts. Their coaching examples
are useful hypotheses and installation choices, not independently verified
NFL call sheets or measured human movement/contact constants. The books cite
coaching and rulebook sources; this review does not independently verify every
citation. Missing Markdown teaching figures were not supplied. PDF text was
extracted with `pdftotext -layout` into ignored `out/literature/`; one PDF emitted
a drawing-operator warning, so diagrams are not evidence for measurements.
Keep disagreements between coaching installations visible instead of treating
one book's term or depth as a universal NFL rule.

## Five usable principles

### 1. Coverage, pressure and run support spend the same eleven players

Sources: [Coverage Operating System](../../references/Coverage_Operating_System_Manuscript.md),
§§1.1, 6, 17.1 and A5; [Defensive structure](../../references/football_defense_textbook.pdf),
§§3 and 5.3, printed pp. 8–9 and 12; [Second and Third Level](../../references/football_coverage_mechanics_textbook.pdf),
§§1, 16–18, printed pp. 5–6 and 30–33.

A wide alignment does not make a defender a free force player, and a safety
with a live vertical obligation is not an immediately available interior hat.
The useful simplified model is a small set of *conditional roles*, not a
separate coverage picture and run-fit picture that count the same defender
twice. A spill edge needs outside support; a pressure needs replacement for its
vacated pass and run responsibilities.

Existing implementation: `src/playbook/alignment.ts` allocates actual man
targets and limits rushers; `src/sim/run-fits.ts:buildRunFits` gives force to
flat/curl-flat roles first and boxes an edge when outside support is absent.
The prior 19,224-combination man audit checks static assignment existence.
These are useful safeguards. They do not prove a motion check, support trigger
or route/fit combination is physically executable.

Small application: report called/effective/shown coverage, eligible inventory,
actual defender roles, initial direct relationships, and each spill edge's
same-side force partner. Flag a missing/out-of-position declared partner at
the snap. After the handoff, report a force player who retains a direct route
relationship as an *inspection point*. The retained job label alone cannot
prove he is still moving as a coverage player.

### 2. Name the consumed key before describing a decision

Sources: Coverage Operating System §§4–5 and 26.3; Second and Third Level §§3–4,
printed pp. 9–11; [Route and Mirror](../../references/WR_DB_Mechanics_Textbook.md),
§§2, 12, 14 and 23.

Press man, off man, a quarters safety and a hook linebacker should not receive
identical information policies. The manageable abstraction is
**assigned key → delayed observation → interpreted declaration → intent**.
Receiver hips need not be modeled as a skeleton to distinguish an observed
stem, credible braking, a break and an ambiguous fake. Body facing is not a
measurement of eye direction; an engine line drawn from facing must not be
labeled as a measured gaze cone.

Existing implementation: `ReleaseReader` observes through `sim.see` and
`RouteObservation`, confirms persistent declarations and exposes the cache of
keys actually read. `CoverageDefender` runs its rule and then bounded help
judgment. The rule, judgment and technique can all consume keys during a tick.
There is no general attention budget or communication/acknowledgment model.

Small application implemented: `CoverageDefender.recordedRule(readTick)` copies
the current locked branch, cut target, judgment reason and declarations
actually consumed during that controller tick. It never calls `read`, `see`,
initializes a reader, or advances RNG. A declaration's `since` is when it was
believed, not when the receiver truly began the break. These recorded inputs
are witnesses, not automatically the causal trigger of a branch change.

Keep evidence persistence separate from arbitrary play-clock switches. A
short confirmation interval can model continued visual evidence; "at 1.2 s,
switch to this receiver" cannot substitute for route evidence. The installed
depth/speed thresholds in `reads.ts` are current model choices, not measured
league constants. The same operational definitions should later be applied
to NFL paths before comparing declaration times.

### 3. An assignment loss and a physical coverage loss need different diagnoses

Sources: Coverage Operating System §§20, 23 and 26.2; Route and Mirror §§1,
3, 11–13 and 27; Second and Third Level §36, printed pp. 50–51.

An open receiver can be a correctly owned route beaten through leverage,
braking, transition, traffic or capability. A contested completion can also
beat sound route distribution. Separation and explosives are outcome guards,
not proof that the assignment was busted or that physics is wrong.

Existing implementation: man technique records cushion, leverage, hip-open,
trail/over-top and route-read state; the universal world retains velocity,
support and contact. `ManCoverage` maintains its receiver target even when a
run cue changes its movement. Match walls and traps can remain zone-kind
controllers while owning a receiver relationship. A `kind === 'man'` count
alone therefore misses real ownership and can overstate a bust.

Small application: retain position, velocity, facing and delivered movement
intent beside a rule transition. Audit *marker existence* only for effective
pure-man calls before the throw/scramble or loose-ball transition. Count man,
wall, trap and rob relationships separately from selected zone targets.
Never grade match/zone coverage as busted merely because a route lacks one
of these direct relationships. Next, compare intended versus achievable
movement using the same physics capabilities rather than a new DB-only
agility or win multiplier.

### 4. A pass-off is a continuous overlap, not a depth-triggered disappearance

Sources: Coverage Operating System §§4.1–4.3, 11.1, 14.2 and 21.1–21.5;
Second and Third Level §§9, 12 and 15, printed pp. 18–19, 22–23 and 28–29;
Route and Mirror §14 and Lab 7.

The sender, receiver, help and route distribution need to remain related
through an exchange. Acknowledgment and reachable replacement are different
from omniscient agreement. The same principles explain a seam carry, Palms
quick-out exchange and bunch switch without writing a one-off bust rule for
each concept.

Existing implementation: complementary match rules independently read the
same receiver. `CoverageDefender` changes technique from current momentum,
which gives exchanges a real movement cost. However, `wallTwo`/seam carries
release at installed depth thresholds; there is no explicit sender/recipient
acknowledgment or overlap obligation. `RuleState.mode` locks several branches
for the play. The safety's commitment to one receiver and the hook's release
of another must be inspected together, especially trips and double moves.
This is a mechanism to investigate, not a finding that every locked branch is
wrong. A Palms corner already retains its target after a quick out; whether
its `Trap` movement handles the subsequent wheel is a separate technique
question.

Small application: capture the first transition where a direct relationship
ends, and any overlap with a directly unowned adjacent eligible. Show both
defenders' actual consumed declarations, branch and momentum. These are
candidate handoff points, not inferred communication failures. The later
mechanic should allow the old responsibility to persist until locally
recognized replacement is feasible; no new handoff timer is introduced now.

### 5. Run-fit leverage must survive the route-to-run transition

Sources: Coverage Operating System §§6.1, A1.3, A3.2–A3.5 and A4.5;
Defensive structure §§1 and 5, printed pp. 4–5 and 11–12; Second and Third
Level §§14, 16–17 and 33, printed pp. 27, 30–32 and 47; Route and Mirror
§§16, 21 and Lab 9.

Force, spill, alley and cutback are relationships to the runner, blocker and
help. Correct support does not mean all defenders sprint toward the ball.
Square, patient movement preserves multiple responses until the back or
blocker declares; later pursuit must use a physically achievable intercept.
Crack-replace additionally needs a released coverage obligation rather than
an automatic corner run trigger.

Existing implementation: `blockingIndicator` reads visible pull/slice motion
instead of the offensive scheme; `executeRunFit` keeps secondary alley depth,
distinguishes box/spill and delays chasing a deep mesh. These are promising
controls using common bodies. The initial force selection is still a role/
geometry heuristic; no explicit dynamic crack replacement exists. Recognition
and coverage-rule commitments are not a complete local responsibility ledger.

Small application: keep each fit's partner, gap, side and technique beside its
rule and recognition state. After fixing far pursuit and achievable tackle
approach in physics/control, use the same capabilities for secondary insertion
and crack-replace; do not disguise an unreachable support path with a tackle
success scalar. Count nominal fit jobs separately from bodies that could
actually intervene before the ball reaches the edge.

## The lab and what it can establish

Run from the repository root with Node 22:

```bash
node --import tsx scripts/diag/coverage-contracts.ts out/coverage-contracts.json
node --import tsx scripts/diag/coverage-contracts.ts out/palms-stick.json palms-stick
```

The default panel has eight generated-player fixtures: Cover 0/1 mesh, Palms
stick/verticals, trips Poach verticals, red-zone Cover 2 Match smash, a spill
outside-zone fit, and quarters split zone. Rosters use seeds 21/22 and strength
0.6; fixture seeds, formations, LOS, actual effective coverage and 12 fixed
substeps are saved. Cover 2 presentation and a spill policy are deliberate lab
inputs, not measured league frequencies. It records a source-content SHA-256
and rejects source changes during the run.

It records the initial inventory, first exact narrow contract violation, first
descriptive inspection point, all unique warning categories, and up to 100
actual state/key transitions per fixture. Omitted transition counts are
explicit. Every controller tick is inspected at 20 Hz, so the branch/read
boundaries are not inferred from the viewer's coarser samples. Structured
branch/key fields are live-lab output for now; old standard/full recordings
are not retroactively upgraded or given invented state.

Passing this panel establishes those narrow implemented contracts only. It
does not establish authentic coverage execution, complete route influence,
NFL bust rates, legitimate contact/penalty attribution, or physics readiness.
The first invalid state may be an initial contract inconsistency; later
openness does not establish its consequence without tracing movement.

The final diagnostic run after the local physics repair is pinned to source
`0f1124fde702bfd754944b10bc2d35f2ebf4914c1a2fa864e701afb6683b47ad`.
It found **zero narrow contract violations and seven descriptive inspection
points**, across **342** retained state/key transitions, with none omitted.
Palms stick ended CB_W's direct
relationship to X at 1.65 s; Palms/Poach verticals exposed wall/deep overlaps;
the split-zone fixture automatically checked to Poach and its LB_W retained a
`man:H` label at 1.05 s despite recognizing run. These are useful locations to
inspect, not demonstrated busts. The red-zone landmark and two pure-man
fixtures passed their narrow assignment/destination checks. These small-panel
counts match the initial getter-only smoke run; that is not a coverage effect
estimate for the physics change. Rerun after a further engine change.

Validation: the existing replay telemetry file passes all six tests, including
the new copied-key/full-play/body/RNG noninterference contract. Typecheck passes.
The full final lab remains in ignored
`out/literature/coverage-contracts-final.json`. A
[compact reviewed report](../../../data/reviews/physics-world/coverage-process/README.md)
retains initial inventory/state and all seven points with actual same-boundary
key/state context, plus explicit provenance for the exact force-player witness.
No coverage behavior was changed and no warning was promoted to an invented
communication failure or bust.

## Defer until the shared physics gates are met

The next useful coverage work is a small set of route-pair fixtures that share
rules: out→wheel, under→replacement vertical, switch release, trips #3 bend,
and crack→go. Add explicit exchange/conditional-fit contracts to those before
expanding the call catalog. Develop eye/hip/hand controls and contact legality
with the shared body model. Holding/interference require actual contact,
restriction, ball timing and eligibility evidence; the books' examples do not
justify arbitrary penalties for a long route delay or player collision.

The new offensive books are retained separately for later side-concept,
protection and progression work. They do not override the current physics-first
review or turn this small diagnostic addition into a playbook rebuild.
