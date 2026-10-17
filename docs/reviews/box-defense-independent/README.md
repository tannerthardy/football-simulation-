# Independent review: open-field tackling and the box

Reviewed 2026-10-17. **Retain the research; hold production activation.**
`DL_ESCAPE` has a coherent trigger and changes real movement without awarding
a shed. Its aggregate NFL agreement does not yet establish better fit/protection
decisions. The claim that this witness establishes a universal follower deadlock
is too strong: the named current-code witness identifies an anchoring transition.

## Pins and boundary

- Reviewed author: `943f1d33c181325d9ba839da4a7b195d60c658b7`,
  [`claude/open-field-tackling`](https://github.com/tannerthardy/football-simulation-/tree/943f1d33c181325d9ba839da4a7b195d60c658b7).
  Its report is stacked on experimental `50f6a08`, based on older `c3264b0`.
- Accepted comparison: `d682b1f474cb6ba260a7b8b1119a62919c5a2159`, independently
  checked against published queue `bf493d881f423540962c6b1ad3b889fe2662e8c8`.
  Accepted engine SHA256 `bed3c36cf08407762fed67abdf0a1651fe6ed7fc8c09b43ab3d9b33f1dfd4616`.
- Temporary **DL_ESCAPE-only** extraction: [portable patch](dl-escape-only.patch),
  engine `24ed3f96c515b3a5b00f20d667065de5df820000f2de875363473245d5a525ec`.
  Accepted 44 settings unchanged, plus registered `DL_ESCAPE=0`, explicitly `1`
  only for candidate arms. Components=1, CF_FLOW unset; Node22.23.3.
  No LB_SHED, DEEP_CAP, RUN_LANE, CLIMB_EXIT or experimental physics imported.
- Final review branch restores **all runtime/config files to accepted blobs**.
  This is an evidence/tooling handoff, not a production feature candidate.
  Historical `4ded6b6` is untouched.

## Findings and decisions

### 1. Do not infer a reach-footwork redesign from the named trace

The author attributes TE's 0.5–0.9 lateral plus2.4 forward request to following
the defender's reduced speed ([report lines252–270](https://github.com/tannerthardy/football-simulation-/blob/943f1d33c181325d9ba839da4a7b195d60c658b7/docs/reviews/open-field-tackling.md#L252)).
I replayed **that exact input** (`oz/strong/ace_12/over3/pair11/77`), accepted
settings, DL_ESCAPE off, all22 players reacting normally, only through2.0s.

| Execution interval ends | Pre-anchor lateral request | Final TE lateral request | Cause | TE achieved lateral velocity | DE achieved lateral velocity |
| --- | ---: | ---: | --- | ---: | ---: |
| 1.00s | 3.002 | 0.901 | Lost-depth anchor, lateral multiplied by0.3 | 1.652 | 1.769 |
| 1.50s | 2.096 | 0.629 | Lost-depth anchor, lateral multiplied by0.3 | 1.901 | 1.765 |
| 2.00s | 2.918 | 2.918 | Anchor inactive | 2.421 | 1.812 |

All lateral magnitudes are toward the play side, yd/s. Decisions at0.95/1.45/1.95s
are compared with the following achieved state, not the entering velocity.
At1.95s the TE already requests more lateral speed than the DE's entering2.082.
The DE's own request changes to the opposite lateral direction during that last
interval; its continued playside velocity is not evidence that it executed the
new request immediately. Forward requests of2.4 in the first two rows are the
anchor override; pre-anchor forward was−0.671/−1.000. The same witness's lateral
limit reaches3.002, so the quoted2.2–2.7 limit is not universal either.

This **does not prove the anchor is wrong**, nor exclude follower coupling in
other intervals. It demonstrates that reduced requested motion here has a
specific upstream reason: felt penetration and backward motion cause anchoring.
The next discriminating question is whether that response protects against the
actual penetration and preserves an attainable reach. Preserve the defensive
win/control; do not remove anchoring or redesign hand coupling on this evidence.
[Exact sampled commands, cues and subsequent execution](../../../data/reviews/current/box-defense-independent/accepted-oz-opening.json).

### 2. The new DL action is real, but default activation is not justified yet

The two authored trigger tests reproduce on the isolated current host. Four
opposing trigger checks additionally retain ordinary work for load without
backward motion, motion without load, and each opposite-sign component.
This is a legitimate own-body cue; the patch does not introduce a new opponent
observation or change force, reach, support, work or capacities.

Direction is **the existing `e.side` in the contact frame**, selected from the
held acquired aim earlier in the production hook. It is not a guaranteed fixed
field-side gap direction ([author lines983–987 and1023–1028](https://github.com/tannerthardy/football-simulation-/blob/943f1d33c181325d9ba839da4a7b195d60c658b7/src/sim/engagement.ts#L983)).
An oblique surface turns this into substantial longitudinal work too. At the
first strong change, DT_S requests `(−1.5,−0.170) → (−4.530,−1.830)`.
At the first weak change, DE_S requests `(−1.5,+0.846) → (+3.889,−2.847)`.
The latter gives ground longitudinally while working across the shoulder.
That can be a defensible escape, but direction/fit costs need explanation before
calling it improved assigned-gap defense. This review establishes no direction
or information defect in that choice.

The author's own accounting says **one actual shed in517 activations**. Therefore
the principal effect is movement while connected, not correcting block-release
frequency. The report's "what changes is when defenders come off blocks" is
unsupported as the principal mechanism.

### 3. Historical experimental measurements are not current production evidence

The report correctly names `RUN_LANE=1 CLIMB_EXIT=1`, but its summary's
"develop" is the older source. Both the held experimental departures and the
older runner/contact behavior differ from accepted #110/#111. Keep its paired
results as evidence about that host; do not import that parent or transfer its
NFL percentages to today's engine.

I reused the compatible accepted-source three-case tape and collected only the
isolated candidate. No baseline census or full suite was repeated:

| Full-context control | Accepted | DL_ESCAPE only | First contact | Interpretation |
| --- | --- | --- | --- | --- |
| Ace WZ strong, Over3, pair11/77 | 2.53yd, tackle4.15s | 1.39yd, tackle3.90s | CB_S at3.30s in both | Lower ending is not an earlier DL stop; candidate later adds FS assist. |
| Ace WZ weak, same bodies/look/seed | 5.34yd, tackle4.00s | 5.88yd, tackle4.30s | LB_M2.80→2.85s | The weak success remains, but the action does not uniformly improve containment. |
| Saved useful-climb Duo | Censored3.50s | Censored3.50s | SS3.25s in both | RT/Mike useful load persists; trajectories are changed, not an identical ending. |

All three have zero offensive teammate impacts. Maximum new work residual is
1.33e−11 and arm-limit excess2.85e−14. These are accounting checks, not complete
physical-realism certificates. Strong/weak are installed direction controls,
not exact geometric mirrors. Do not claim formation/roster transfer from them.

To attribute the first change, six short native prefixes compare the first
escape interval with identical initial bodies, minds and execution RNG. First
changes are DT_S at0.95→1.00s in strong, DE_S at0.85→0.90s in weak, DT_S at
0.85→0.90s in Duo. End-of-interval execution RNG remains equal in each pair.
These establish a controller request difference, not an initial lucky force
draw. Later coupled outcomes are not isolated execution comparisons.
[States, commands, source/input hashes and receipts](../../../data/reviews/current/box-defense-independent/summary.json).

### 4. Keep the NFL signals; qualify their causal interpretation

- **Tail opportunity differs.** Every native lab run starts with70 yards to
  the goal; the NFL run mix does not.46/49 long runs end at that ceiling.
  Even `P(40+ | 20+)` differs in opportunity when an NFL play has20–39 yards
  available. Stratify/restrict existing records before using this as evidence
  for a controller. No recollection is needed merely to note the mismatch.
- **"Get-off" is time to travel0.15yd**, not a direct reaction-time measurement.
  It includes movement intent, acceleration, facing/contact and sample timing.
  The latency sensitivity is useful, but does not identify a0.2s sensory defect
  or justify fitting shared pass/run reaction to that number.
- **Weight association is not a mass-only causal experiment.** The fresh table's
  raw per-pair data/operator are not committed. The cited trench report is
  explicitly historical research. Force-budget saturation is worth Physics's
  review, but a differently composed tracking sample with little mass correlation
  does not establish that current blocks ignore technique or require mass to stop
  mattering. Use a matched mechanical witness for a solver/capacity proposal.
- **Contact operators are proxies.** `firsttackler.py` picks the nearest defender
  at contact time; `lbpass.py` calls a defender blocked when an OL is within1.5yd.
  Neither measures actual force, retained reach, nor protection of the runner's
  route. Same code on both datasets helps comparison, not causal identification.
- **Evidence provenance needs completion.** Reproduction commands and the broad
  manifest are published, but per-batch code/settings/input hashes, raw result
  hashes, error/censor counts and final tested-tree receipts are absent. `run.sh`
  inherits ambient flags and its bare background `wait` does not check each child
  status. The report is candid about experiments; its exact aggregate values
  remain author-reported rather than independently reproduced here.

The safety-depth observation and the correction to the "two missed open-field
tackles" explanation are useful. Keep DEEP_CAP/LB_SHED parked independently.
Their football contracts need review by coverage/physics owners; matching the
tail or first-contact share is not an adoption criterion. A genuinely recurring
chase-wait defect also deserves its own saved production-hook witness even if
its aggregate tail effect was small; the removed threshold patch is not reviewed
or proposed for adoption here.

## Validation, reproduction and next decision

**15 focused checks and typecheck pass** on the temporary extraction. The first
two authored checks also ran separately;17 assertion executions are not17 unique
checks. New commands16.203s, including9.760s typecheck. Native continuations1.432s,
paired prefix collectors1.145s, named OZ opening0.506s. Zero games, no broad panel,
no repeated integration suite. All failures/adverse/limited results above remain.

The final branch changes no runtime or setting. On a clean review checkout,
the archived extraction can be replayed without the author's experimental parent:

```sh
# Node22.23.3; accepted runtime/config blobs as pinned above.
git apply docs/reviews/box-defense-independent/dl-escape-only.patch
cp docs/reviews/box-defense-independent/dl-escape.test.ts.txt test/box-review-dl-escape.test.ts
npm run baseline:run -- --candidate -- npx vitest run --project core test/box-review-dl-escape.test.ts test/stretch-closure.test.ts test/run-entry-opponent-information.test.ts
npm run baseline:run -- --candidate --flag DL_ESCAPE=1 -- node --import tsx scripts/diag/box-defense-review/native.ts out/box-defense-review/native.json.gz
# If the published compatible cache is unavailable, baseline can be regenerated
# with the same command and DL_ESCAPE=0; no need to repeat a compatible cache.
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/box-defense-review/first-difference.ts out/box-defense-review/first-off.json
npm run baseline:run -- --candidate --flag DL_ESCAPE=1 -- node --import tsx scripts/diag/box-defense-review/first-difference.ts out/box-defense-review/first-on.json
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/box-defense-review/opening.ts out/box-defense-review/opening.json
```

**Recommendation to Integration:** preserve this review/reproduction and the
author's research. Do not merge the experimental parent, enable any of its three
new policies, or schedule its broad panel again. `DL_ESCAPE` may continue as a
separate default-off candidate, with first-changed fit/protection evidence as the
next gate. For Run, the concrete next question from this review is the TE's
lost-depth anchoring/contact transition in the named OZ witness. For Physics,
require a portable force/work witness before adopting the proposed weight-law
interpretation. These are distinct contracts; no new strength or release tuning.
