# Bounded lower attachments and contact transfer

## Status and where to start

Bounded lower attachments are now the live default in the actual `World`.
It replaces an indefinitely transported lower-grip point with a smooth bounded
point, using the same derivative for contact velocity, transmitted load, solver
mobility and work. It keeps the existing held-recovery motor, body capabilities,
grip budgets and balance model. No anatomical feet or new strength parameter.

The reduced model earned promotion through a matched natural football witness,
mechanical checks, ordinary tackle/run guards and a repeated isolated cost check.
The explicit `boundedAttachment:false` option retains the linear comparison law;
the paused `virtual-foot` research backend keeps its own default unchanged.
Start with the
[paired evidence and reproduction commands](../../../data/reviews/physics-world/bounded-attachment/README.md).
The [paired tackles](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/bounded-attachment-tackles.html) and
[paired runs](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/bounded-attachment-runs.html) label **Linear** and
**Bounded experiment** separately despite sharing one engine source. These films
were recorded before promotion; their labels describe those measured modes.
The [natural field witness](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/bounded-attachment-natural.html) shows
the diagnosed release and the repaired hold through their actual finishes.

This follows [attainable tackle timing](tackle-timing-and-lower-attachment.md)
and the [lower-bound diagnosis](lower-attachment-bound.md). Earlier reports
retain their historical source pins and unfixed status. Full spatial foot/ground
expansion remains paused; this increment uses the cheaper shared model.

## Why the old interaction fails

The recovery coordinate integrates corrective movement. The old grip uses that
accumulated correction as a body-relative lower attachment, then releases when
the point travels outside the runner's own body bound. The reproduced holder
still has reach and force capacity; this is not ordinary grip failure.

The candidate maps `z = legShare * correction + reference` to
`r = L * tanh(|z| / L) * z / |z|`, where `L` is the existing profile-derived
body reach. It gives a finite point without resetting a grip or silently
clamping its geometry. Near zero it agrees with the linear law. The derivative
becomes directional at extension, so normal and tangential solver mobility
must differ. All load and motor-work calculations use that same derivative.

New grips bind at their acquired body point. A restored nonzero attachment
uses the inverse map, preserving its point; at/outside the inverse domain it
explicitly retains the linear law and ordinary validation. Changes in leg share
and coordinate rebases preserve the acquired point. Converting a restored
nonzero attachment intentionally changes its constitutive derivative: this is
not a claim of identical old/new initial contact velocity or load response.

## What the evidence establishes

| Check | Linear | Bounded experiment |
| --- | ---: | ---: |
| Reduced restart: positive cases releasing at the lower body bound | 44/44 | 0/44 |
| Capacity/reach negative controls retaining the invalid grip | 0/4 | 0/4 |
| Primary tackle panel: attempts / tackle whistles / broken holds | 48 / 42 / 6 | 48 / 42 / 6 |
| Primary tackle panel: live inspection windows | 14/56 | 14/56 |
| Separate crossing witnesses ending in tackles | 8/8 | 8/8 |
| Matched 11v11 runs: mean pre-penalty forward progress | 1.843 yd | 1.860 yd |
| Matched runs: stuffs / 10+ gains | 23 / 4 | 24 / 4 |
| Matched runs: missed attempts / broken holds | 15 / 12 | 15 / 12 |
| Matched runs: physical timeouts / lower-bound releases | 0 / 0 | 0 / 0 |
| Four full-game guards: physical timeouts / lower-bound releases | 0 / 7 | 0 / 0 |

The 48 restart rows are variants of **one** historical interaction: 36 primary,
eight representation/filter sensitivities and four negatives. They restore two
bodies and a grasp, disclose missing optional state, and replay recorded commands
as external inputs. They are not exact historical play replays or NFL samples.
All 44 surviving candidate holds end the short inspection window with the runner
upright: surviving grip is not a credited tackle. The candidate's native-to-48
maximum endpoint difference is 0.00554 yd; mirror error is below `1.5e-15` yd.
Initialization moves the acquired point by at most `1.2e-16` yd. Work/momentum
close to numerical precision, with no motor-work excess.

The ordinary tackle panel keeps all first-attempt decisions and geometry.
Changes start after acquisition. All eight faster-runner escape signatures stay
identical. Weak, medium and strong controlled holds transmit progressive force;
strong holds still topple the controlled runner. Duplicate constraints, two
holders, chart changes, near-bound initialization, mirrors and refinement have
independent actual-World regression checks, including finite-difference contact
velocity and virtual-work checks of real solver impulses.

The 144 run inputs use three unchanged generated roster pairs, six concepts,
Over/Under fronts, both directions and two reused play seeds. First-contact
timing and geometry remain identical. These are forward-progress results before
game-level penalty enforcement. Their mean is neither a target nor a league
estimate. The largest changed run, `RC-R2-counter-under-R-S11`, is inspected
separately rather than hidden in the small aggregate change.

All 120 shared capability trials outside the lower-grip channel are identical.
They test anchoring, double-team driving, shedding, absorbing contact and jamming.
That is useful non-regression evidence, **not** proof that this new attachment
law positively generalizes to all five interactions. All 12 frontal tackle
guards still finish in tackles. Sustained hand-fighting's maximum native-to-192
closest-approach error remains about 0.822 yd; this repair does not fix it.

Full-game guards have the same starting rosters and seeds. Once an early play
changes, later calls, draws and fatigue diverge. Scores, tackle counts and game
timings cannot establish the causal realism or runtime cost of this change.

## How to choose the next step

Keep the model small. A bounded point's radial derivative tends to zero
near extension: a stronger grip can continue pulling the body while offering
less opposition to its corrective coordinate. That may be a sensible reduced
description of a stretched, dragging hold, or it may make recovery too easy.
Resolve this with retained actual football and local refinement, not extra
anatomical bodies, strength fitting or an automatic fall at a distance threshold.

The natural witness resolves the practical transfer gate. The first diagnosed
release occurs on play 31 of fixed guard game `1085687574`, play seed `1293629916`:
I-Form Twins Drive against 4-3 Over Palms. All 30 preceding plays stay linear;
the complete selected pre-play state, decision state, perception and RNG match
before only that play switches laws. A truly unobserved/unrecorded baseline
matches the detailed baseline's physical endpoint. Selection uses the first
bound release, not the candidate's result.

At 9.87083 seconds the old point lies 1.19253 yd from its carrier against a
1.1825 yd bound. The holder is only 0.64211 yd from the point, has spare grip
capacity and is not slipping. Releasing that hold permits recovery and a
77.50-yard touchdown. With the bounded law, the 116.6 kg tight end carries the
88.5 kg grounded corner briefly, slows, and receives a safety assist. The carrier
falls and the play ends in a natural tackle at 75.88 yd. The achieved point stays
below 0.891 of its body bound; existing grip strength, slip and force/work limits
remain active. This proves a localized repair, not universally better tackling
or a league-rate improvement. The film shows the carry and assist, not just the
changed final label.

Keep the adverse Counter witness too: its native gain moves 28.89 to 31.28 yd,
with carrier fall delayed from 7.80 to 8.15 seconds. Force reaches its existing
capacity and the point stays bounded. Whole-play 12/24/48 gains differ sharply
in the old law too (28.89/7.56/6.74 yd); meaningful positional differences begin
at 0.50 seconds before any grasp. Do not attribute that inherited refinement
problem to this map or demand whole-play path equality as its promotion gate.
The matched reduced restart supplies the isolated local refinement check.

The initial implementation repeats map/derivative evaluation inside the force
iterations. An exact-coordinate/reach cache removes that redundant work without
changing the law: all 48 reduced restarts, 64 tackle encounters and 144 runs per
mode preserve physical signatures. The uncached multiple-grip fixture costs
about 68–70% more CPU than linear. A cached repeat in reversed mode order costs
about 17% more; the unchanged trench fixture is within 1%. An earlier cached
process is noisy even on unchanged trenches, and is retained rather than hidden.
These are fresh one-tick synthetic fixtures, not a measured full-game speedup
or a confidence interval. Support is allocated only under actual lower holds.

Both independent promotion reviews judged the coherent mechanics, controlled
refinement, ordinary tackle preservation and exact-history field repair sufficient
for this reduced football model. No force, outcome or NFL-average tuning. Use
the same body capabilities across interactions and retain failed candidates.
Next localize sustained hand-contact trajectory error at its first meaningful
divergence, keeping geometry, force budgets and persistent constraint state
consistent. Early run-contact get-off and football technique remain separate
measured priorities; no full anatomical expansion is justified by this repair.

Start the hand investigation with the retained redirect fixture **seed 7,
rusher power 1.4**, at 12 versus 192 subdivisions. Its closest-approach error
is 0.82204 yd even though both finish without a fall. Reproduce the current
source, then find the first meaningful body/support/contact divergence rather
than changing stiffness, strength or resolution globally. Inspect actual hand
geometry, steering load, shared effort and contact-state transitions. Only add
persistence or local solver work if that trace identifies the need. Keep the
same tackle/run/field and cost guards for the next candidate.

The engine has not earned the final physics OK. The useful readiness standard
is stable, capability-consistent football interactions with believable control,
not exhaustive anatomical detail or exact NFL scoring averages.
