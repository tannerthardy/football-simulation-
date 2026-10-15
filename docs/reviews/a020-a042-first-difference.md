# A020 first difference, checked against A042

**A020 first changes through different positioning caused by retained man
technique, not a newly lost assignment or a demonstrated execution-randomness
fork. A042 does not share that initiating cause.** Both later enter a weaker
first-contact geometry, but their contact/finish sequences are different too.
No new behavior correction is justified by these endings alone.

This review reads the existing full native recordings behind Measurement's
`40af332f3c988b5abe19d9236b49a43bde27200c` comparison. Saved baseline is accepted
`8ca8deebe4afa91c3021bdd119bed8976cf00e47`, source
`f56a2156a0c1dcecfc3de128581ec875ca1ef93ac813a389d391282be585c956`;
candidate is accepted #82 `7eb2554f5dbb497cff169f386704a5b0f4cf43fe`, source
`78183dc79c6285939b80875b131584c18c4f0eda020c17bcfde6191823ace965`.
[Integration acceptance](https://github.com/tannerthardy/football-simulation-/pull/82#issuecomment-6203895704)
resolves the older ledger embedded in that merge. The combined panel contains
#69 and #75/#80; the first-fork interpretation below uses their actual source
boundaries rather than attributing every changed yard to one PR.

## A020: a legitimate assignment continuation changes the later encounter

Actual catcher H is **S74O-WR2/index10**. Original marker SS is
**S74D-CB4/index21**. Eventual tackler CB_S is **S74D-CB3/index17**; his man
at release is **Z S74O-WR5/index9**, not H. The mesh Y is a different player,
S74O-FB1/index7. Keep those identities separate.

All22 recorded agent states agree before2.50s. At the2.50s throw, five man
defenders first change their final requests; their assignment labels do not
change. For the eventual tackling corner:

| Recorded fact | Baseline | Accepted #82 |
| --- | --- | --- |
| CB_S job at2.45 and2.50 | man:Z | man:Z |
| CB_S final request at2.45, yd/s | (+6.95,−1.71) | same |
| CB_S final request at2.50, yd/s | (+5.04,−.26) | (+7.22,−1.69) |
| Last recorded consumed Z picture at2.50 | age.25s; velocity(4.77,.06) | age.15s; velocity(5.11,.06) |
| CB_S achieved velocity at2.50, yd/s | (4.89,−.25) | (4.96,−.60) |
| First recorded CB_S query of eventual catcher H |2.90s|2.90s|
| CB_S at H's3.35 catch, yd |(47.3,9.9)|(47.7,9.9)|

#75 explains the first difference: before existing throw recognition, the new
controller continues `coverMan` with its installed press/leverage, route history,
gain and bounded stable-route interpretation. The baseline instead switches to
the generic `playBall` unaware tracking fallback as soon as global flight begins.
Its different gain/objective and ordinary-delay picture slow the corner before
he recognizes the release. Z is still an acquired moving vertical threat; asking
the corner to abandon him for future catcher H at that instant would add hidden
information. The new branch preserves this responsibility. The consumed pictures
are genuinely different ages; this is not a same-picture execution comparison.

The catch itself remains earned. H catches at3.35 in both arms at the same
position, with the same4.601yd SS gap. The prethrow SS zero requests2.25–2.40
remain unchanged; Do-It-All's existing spacing attribution still applies. That
older defect is distinct from the first **new** difference at release.

H's complete recorded agent state remains equal through3.55. At3.60 his final
request becomes(3.85,−8.89), versus baseline(9.69,0): the candidate takes a sharper
outside path. His acquired CB_S picture already differs in position and velocity,
as do other defenders/blockers; FS/SS pictures at this decision remain equal.
The unchanged carrier evaluator chooses lanes from the available threat/blocker
picture and does not draw random execution noise in this open-lane choice.
Thus a changed field precedes a changed offensive choice. Saved final intents
do not isolate CB_S as the sole cause of that choice or expose every scoring term.

The later tackle is a materially different encounter:

- Same CB_S first wraps at4.60→4.65. Post-step sampled body separation is
  .707→1.304yd. Baseline carrier/defender velocities are(6.46,−3.99)/(1.13,1.86);
  candidate velocities are(4.62,−7.75)/(−1.32,−2.13). This is a crossing/side
  encounter, not evidence that every rear leg grip is defective.
- Existing opportunity telemetry reflects the difference. Baseline at4.55
  forecasts observed quality.60/best1.00 and keeps moving. Candidate at4.65
  forecasts.20/best.26 and attempts the current opportunity. Those are the
  controller's estimates, **not** the acquired grip's random quality or load.
- Baseline hold survives through the5.35 tackle; candidate slips at5.00 after
  .35s. The first tackler stays upright in both. Baseline has sampled body contact
  at4.70; candidate has none recorded for this pair. Absence of sampled body
  contact does not mean absence of grasp force.
- At the candidate break, FS/SS are7.63/6.04yd away, both about5.7yd behind when
  projected along H's achieved velocity. They cannot be described as near,
  established support at that instant. H then scores; YAC9.752→68.246.

**Classification:** the initiating change is valid man continuity producing
different positioning. The catch and changed lane have defensible football
explanations. The entire touchdown is not thereby certified as an earned win:
the marginal approach/contact/containment continuation still merits review.
Restoring a hidden-release slowdown to recover the old tackle would be unjustified.

## A042: different initiating cause, different failed first hold

Actual runner is **RB S69O-RB1/index6**. First tackler is
**SS S69D-S1/index21**; new helper is **FS S69D-CB3/index20**.
All22 recorded states agree before1.60s. The first changed actors are CB_S,
CB_W and FS. There is no throw: #80's positive acquired carrying-RB picture plus
current run belief activates installed alley support while they retain man:Z/X.
FS switches zone→man:X at that boundary; baseline reverses his request toward X,
whereas candidate preserves its existing support request. SS changes later at2.00.
The1.60 FS picture is carrying=true, age.20s; it was false at1.55.

The runner stays record-identical through2.55; his first request changes2.60.
At the old3.25 first-contact time, FS gap improves8.213→3.162yd, but SS gap
worsens1.360→1.726yd. Both runner path and SS approach differ by then; those gaps
do not establish that the help itself caused a worse contact.

The original SS wraps3.25 and stays upright; its hold survives to the4.05 finish.
Candidate SS wraps3.30 from sampled1.703yd, after a recorded **take last reach**
decision (estimated current/best quality0/0). It then falls at3.35 with explicit
cause **dive**, before its hold slips3.60. This is a committed layout, not proof
of an unexplained balance collapse under a normal standing wrap. The original
standing reach budget is about1.545yd; rounded sampled distance alone is not the
exact acquisition distance, while the dive event independently confirms commitment.

Help is present: FS assists3.55, CB_S assists3.65, and FS finishes4.70. Candidate
gains12.73 versus9.99. A042 therefore does **not** demonstrate A020's unrecognized-
throw trigger or the same absence of remaining containment. It shares the broad
symptom of a more marginal first grasp after the runner responds to a changed
defensive field. That symptom is insufficient to start a separate grip project
or merge the two cases into one proven defect.

## Decision, remaining uncertainty and reproduction

Keep the accepted information/responsibility corrections. Keep A020's unchanged
prethrow spacing problem with Do-It-All. The smallest shared next controller
question, if pursued, is whether the achieved approach before the first grasp
offers an attainable better entry from the defender's acquired picture, or
whether the runner has already earned the marginal contact. A042's dive is a
useful opposing context for that question, not a second project. Neither case
justifies speed/braking, capability, grip, persistence or helper-rule tuning.

The recorded first differences are concrete objective/positioning changes;
randomness alone does not explain them. The contact outcomes remain confounded:
the tackle code draws execution/leg placement, but these recordings retain only
final RNG state, not attempt-level draws, grasp quality or joint force histories.
Different geometry and different consumed draw paths cannot be separated into
percentages of the final gain from these tapes. No shared physics edit is proposed.

[Same-actor saved evidence](../../data/reviews/current/a020-a042-first-difference.json.gz)
contains first forks, acquired cues, requests, achieved velocities, grasp geometry,
opportunity decisions, falls, sampled body contacts, helpers and completed endings.
[Restoration and exact launcher receipts](../../data/reviews/current/a020-a042-first-difference-receipts.json)
pin the two source trees, identical inputs/initial bodies, all44 flags/components1,
Node22.23.3, World defaults, operator and raw hashes. The existing data-only
artifact `ebef199a3986b2749e5c8c86921cfd6c7e42b2b4` supplies both archives;
only the four named native members and existing manifests/receipts were restored.
Both archive hashes and all four native hashes match Measurement's publication.
No NFL query, new data pipeline, simulation, game or shared-suite run occurred.

The final saved-only operator costs.737s internally/.915 launcher seconds;
raw restoration3.141s. Its first.720s attempt asked for5.40 in baseline A020,
whose last completed-play frame is5.35. That failed receipt is preserved; the
operator now marks after-terminal samples unavailable. Both plays are completed
outcomes, not censored cases, and no post-whistle state was invented.

```sh
npm run baseline:run -- --candidate -- python3 scripts/diag/a020-a042-first-difference.py --saved /path/to/restored-review --out /tmp/a020-a042.json
```

The saved root contains Measurement's original `paired.json.gz` and separate
`baseline/A020.json`, `baseline/A042.json`, `candidate/A020.json`,
`candidate/A042.json`. The operator checks the four hashes, equal inputs/initial
state and complete recorded prefix. It imports no simulator. No further capture
is required to establish the first-difference classifications above.
