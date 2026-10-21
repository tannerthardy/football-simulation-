# Shared awareness: acquired pictures before more cognition

This audit began at `632fb02`, engine content
`09dd62c7d7cc5002312e93821ea0bf6f7dea3bb764ff75f509c59ff720e72d62`.
It separates information-contract failures from technique and physical capacity.
The [paired decision review](decision-awareness-and-commitment.md) and
[evidence packet](../../../data/reviews/decision-awareness) own the combined
native results and final promotion decision. This chapter does not claim that
less information automatically improves efficiency, accuracy or coverage.

## Recommendation

Keep the existing compact stress, reaction, persistent execution error and
decision cadence. First make those limits constrain the information that a
controller actually uses. Correct a small role's acquired-picture contract
before adding a global gaze budget or a detailed cognitive simulator.

For this increment, the narrow shared-boundary repair is the QB's existing
gaze/memory system. Its field-vision limitation was bypassed both when choosing
which image to acquire and when classifying coverage. The defender and runner
changes in the paired review address separate consumers of evidence. None of
these repairs requires new force, traction, mass or anatomical detail.

## Useful infrastructure already present

`PerceptionBuffer` records position, velocity, visible stance, facing and coarse
off-feet pose. Each returned picture has its actual sample age and is
dead-reckoned with remembered velocity. A changed receiver path can therefore
remain unseen for a defender's reaction delay. This is delayed information,
not a forecast of the opponent's true next move.

`SnapMind` uses agent-local, repeatable per-snap readiness and execution error.
Congestion/contact workload produces smooth stress; fatigue, composure and a
coherent lapse affect focus. Focus affects observation latency, decision
interval, urgency and placement precision. `aim()` briefly holds an instruction
instead of retargeting every tick. These are effective execution assumptions,
not measured psychological parameters. More per-frame mistake rolls would
replace explainable errors with noise.

`Recognition` already combines situation/scouting priors with delayed guard,
QB, back and receiver cues. Its filtered belief and asymmetric commitment
thresholds permit anticipation, false run reads and recovery under stronger
contradictory evidence. `ReleaseReader` separately confirms observed route
declarations. Existing anticipation is bounded by movement and reaction;
better ratings do not provide the next route or a guaranteed successful block.

## Reproduced QB information violations

At the audit baseline, `QBMind.observe()` tested cone membership and the nearby
three-yard exception using a defender's current `d.pos`, then fetched his
delayed picture. A current unobserved movement could determine whether an
otherwise identical stale image entered memory.

An isolated probe keeps the delayed corner picture `(30, 46)`, zero velocity,
0.25-second image age, QB pose and original memory identical. Only the corner's
unrecorded live position changes into the QB's cone. Old code retains initial
memory near `(47, 7.50)` in one case but acquires `(30, 46)` in the other. The
subsequent QB estimate changes, with identical next RNG output. The inverse
case loses a still-in-cone delayed picture because the current body has left.

The coverage classifier bypassed that memory through
`postFeaturesObserved()`: it queried all 11 defenders directly with a 1.2 delay
scale, regardless of the QB's look. Two ungazed corner cases retain identical
memory and estimated location, but their fresh rotation pictures change the
classifier's projected deep count from **1.19588 to 2.19585**. Delaying every
picture does not establish that the QB acquired every picture.

The corresponding small native audit fixes six inputs before outcomes:
Four Verts and Curl-Flat from Gun Doubles 11; PA Post-Dig, Inside Zone, Outside
Zone and Draw from Ace 12; each at play seeds 3 and 11. Teams use generation
seeds 31/32 and strength .55, Over/Cover 3, no audibles, midfield first-and-10.
The six pass executions contain **27 live-versus-delayed clear-acquisition
disagreements in 3,443 defender checks**. For example, PA Post-Dig seed 3 at
0.90 seconds acquires DT_S by current geometry despite a delayed picture
outside the clear sector. This is a native contract witness, not an attribution
of its eventual gain or an NFL error-frequency estimate.

The audit observer only inspects the existing buffer and increments counters.
All **12/12** observed/plain controls match complete result, final bodies,
intents and next RNG. The ignored exploratory probe and receipt are
`out/shared-decision-current/probe.ts` and `baseline.json`; collector SHA-256 is
`89433b559edc3cc2bdafbcf3edb8fef08b2b56c8fa9ba6207fe893dc54e7e252`.
The baseline receipt SHA-256 is
`816a9b20efb112a9cc53824ef82b4287cee725ce98bee6981028e1e74928fb84`.
The dedicated committed tests reproduce the information boundaries without
depending on that exploratory file.

## Narrow implementation and controls

`QBMind.observe()` now gates sector/proximity membership with the normal
delayed picture. Clear looks retain it; peripheral looks retain the existing
older 1.7-scale picture and 0.1-second memory-age allowance. Cone widths,
stress narrowing and local presence rules are otherwise unchanged. A broad
sector-detection query is distinct from acquiring its detailed image into QB
memory. Generic `see` traces therefore include candidate sector pictures of
all defenders; they must not be presented as 11 simultaneous detailed looks.

The classifier uses acquired memory, coasting its recorded motion for at most
the existing 0.5-second bound. It does **not** call `estimate()`: old throw
estimates drift toward the coverage prior, and feeding that drift back into
classification would manufacture confirmation of the prior. A defender not
reobserved after the snap retains his pre-snap picture. No current hidden
position, route or defensive call is substituted for missing observation.

The existing first and second processing thresholds remain. Acquisition occurs
before the classifier summarizes that look and remembered pictures. The
classifier keeps a timestamp ledger of images already represented in the
pre-snap prior or a previous likelihood. If none of the acquired images is
newer, it leaves belief and the post-snap report unchanged. A missed processing
opportunity can retry after real clear or peripheral reacquisition; the
identified/confirmed flags advance only when a new likelihood is processed.
This prevents elapsed time from strengthening confidence in the same held
picture. It also prevents `justIdentified` from triggering a progression
reorder without new evidence.

Independent review reproduced the missing freshness contract in the first
candidate: with all memory unchanged and raw features constant, Cover 3 belief
rose **.8374→.8974→.9126** solely as processing milestones and canonical
time targets advanced. The timestamp guard addresses that specific witness.
Canonical signatures and gains are unchanged. Those signatures were derived
from older engine motion; partial observation and canonical compatibility
remain coarse-model debt. In particular, when one genuine new picture permits
an update, unrefreshed pre-snap pictures still contribute their remembered zero
motion. The model does not yet distinguish that uncertainty from fresh
evidence that a defender has remained stationary.

Fourteen focused tests cover both directions of hidden-position cone invariance,
unseen-rotation invariance, actual reacquisition, peripheral latency,
pre-snap-only memory, bounded coasting, non-circular belief use, milestone
ordering and read-only/RNG-neutral estimates. Four additional controls cover
held-image freshness across both processing thresholds, actual clear and
peripheral reacquisition after a missed opportunity, and fresh evidence for
the second likelihood. The pinned baseline fails nine feature cases and passes
five controls; the candidate passes all fourteen and the existing eight mind
tests. The six recognition tests passed in the earlier focused run; the root
final suite covers all changes together. Module SHA-256
for this frozen candidate is
`cdbd973f6a3b801685b6818e3dc9305d36f3ac7b7d0493e937ddf81ffefa90ef`;
focused test SHA-256 is
`d9c587e60de912432c202326a5dc2e17c958a44af0a26d4a1be476fdb470ee34`.

```sh
node node_modules/vitest/vitest.mjs run test/qb-memory-awareness.test.ts test/mind.test.ts --maxWorkers=1
```

Run with the Node 22 runtime specified by `CLAUDE.md`. Root-owned native pass,
run and game checks decide whether this bounded change is promoted; green
contract tests alone do not establish better football.

## Other shared debt and its appropriate scope

The DL recognition cue formerly treats an engagement's true `type` as run/pass
evidence when blocker stance is absent. A synthetic identical-contact metadata
control yields **95.84% pass belief** for type `pass` and **5.93%** for type
`run`, before any actual hand solve. High/low stance controls correctly ignore
the type. In the 12 ordinary native inputs, the fallback occurs **zero times in
2,306 DL engagement ticks**. Three ticks have zero solved hand load. These are
distinct debts: a label is not a sensed hit, and absence of a stance must not
reveal an installed offensive category. They are not demonstrated causes of
this cohort's rushing or passing production. The paired review covers any
scoped repair to that consumer.

Recognition still queries all five OL, QB and back, and some roles query all
eligible receivers before choosing a key. `keyAttention()` discounts evidence
during a lapse but does not let the unacquired image age. Coverage readers and
run-fit consumers can independently bypass any gate added to recognition
alone. The handbook's [named-role attention pilot](../../football-handbook/shared-model-and-learning.md)
is the correct next design: one installed primary/secondary key, actual acquired
memory shared across those consumers, finite reacquisition and separate tactile
feedback. Body facing remains hips/torso orientation, not the eyes.

The QB's `expectedPos()` still uses live teammate route positions in its man
coverage expectation and falls back to live `d.pos` if no canonical family
can supply that slot. Some normal memories then drift toward that expectation.
That separate debt is intentionally unchanged; the classifier does not consume
it. Existing clocked recognition milestones, global possession declarations,
defensive private QB-read shortcuts and hidden down-state queries also need
bounded native witnesses before a larger information-policy replacement.

Do not broaden attention globally or tune physical capability to repair a
misread. The next useful proof is one observed guard-to-back or inside-receiver
key change, retaining a false key, late recovery and physically unreachable
recovery. Better awareness should improve a relevant acquisition or
interpretation; it should not erase uncertainty, missed contact or difficult
movement.
