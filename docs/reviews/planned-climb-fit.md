# Planned climb: arrive on a useful strike surface

Recommend independent review of **the standalone near-fit correction only**.
It keeps a clear Under climb on the runner's side of Mike through arrival.
The current wide/inside-zone release misses remain unresolved; earlier release
and more contact were not demonstrated cures. This is not an overall rushing
or NFL-realism certification.

Accepted comparison: `bb6d4c73948d53ba841dd9338dd240146c739f8c`, source
`668acb1784799c93d4704aaaa41233a11627ee0a862b41dc279cd11a0a22eeac`.
Re-fetched develop agrees with queue `bb1c44dcdfdd6f767b9750d1d1724f7914df1175`.
Historical `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1` is preserved, not relabeled
as current production. Measurement's new accepted48 report `92ff2cf2` nominated
N1: installed RT/Y→Mike duties without useful Mike load in eight IZ/WZ cases.
That does not establish eight controller defects. All four current Duo jobs
already load before arrival; old A018 is not evidence of a current miss.

## Demonstrated cause and minimal patch

`RunBlocker.attack` returns `plannedClimb`'s interception command before the
existing `secondLevelBlockApproach` can fit the acquired near shoulder. Other
climbs/leads already use that near fit. A successful empty-space interception
is insufficient: arriving upfield of a flowing linebacker can leave his route
to the runner open even with hands attached.

Patch `353d8caaedb141a58bb29d1f52b14db4a670eceb` applies that existing fit only
inside the existing `contact + bodyContact` envelope, then returns the original
planner command outside it. Source:
`6d16f77e41a5f02805b110da04cf09b767c0c2bf2b95e0cc66857db31cf5ccc7`.
No new technique chooser, planner, timer, sensing, random draw, assignment,
release permission, strength, grip, spacing bypass or physical law. The planner
keeps its original cadence/held meeting point. Body execution remains World's.

## Under: installed job through achieved protection

Same saved22-player input
`8ee8f7d7179633eba26c5919a744026b5e5a6b887aa6d03d039d854057173596`.
Both RT release at0.85 from Y's secured DE_S; C leaves for Will at1.00. The
handoff stays1.45. Departure and original planner are unchanged through1.45.

**First raw-request divergence is1.50**, with identical entering bodies and
preceding root RNG. RT's request changes `(1.862,1.271)`→`(.447,1.457)`yd/s,
posture .7, from his already acquired Mike picture. This is a request for a
near strike, not an instantaneous reduction of the entering body velocity.
Ordinary movement, spacing and contact determine the subsequent trajectory.

Positions after World interval `[2.75,2.80]`, yards; offense advances +x:

| Arm | RT position | Mike position | Actual relation/load |
| --- | --- | --- | --- |
| Accepted | (37.874,24.808) | (36.280,24.677) | RT has passed Mike upfield; 0 normal, −340 lateral |
| Near fit | (36.875,25.551) | (37.260,25.997) | RT remains on the backfield surface; 788 normal, −23 lateral |
| Near fit, reference first hands | (36.836,25.515) | (37.214,25.966) | Same useful side; 636 normal, −47 lateral |

Force units are kg·yd/s², actual native joint reports. Compression alone is
not the protection criterion. The accepted Mike reaches RB at2.95; candidate
keeps his route away through arrival and SS reaches RB first at3.50. Candidate
RT/Mike first load is **later**,1.85 versus1.80; it is better positioned. Y's
original loaded joint remains through2.95. Ending4.25/8.63yd versus4.20/4.23yd
is context, not the acceptance target. Both end in legitimate tackles.

### Execution attribution

Initial hands also differ under the naturally changed global draw schedule:
the accepted RT/Mike exchange creates control .035843, candidate .212077
(after the same tick's evolution: .053364/.220736). One declared matched
diagnostic records the reference four range/normal variates, then substitutes
them only in candidate's first named RT/Mike exchange **while still consuming
candidate-native draws**. All22 players otherwise react normally. No body,
command, control, force or future runner path is set directly.

The candidate then creates the identical .035843 first control; at2.50 its
control .1893 is close to reference .1800. It still retains the backfield
surface and real normal load, prevents Mike's2.95 access, and SS reaches RB
first at3.45. This prefix is explicitly **live/censored at3.60**. Later native
noise is not matched, so this isolates the initial exchange confound rather
than claiming identical whole-play randomness. Geometry benefit survives it.

## Opposing and transfer evidence — same bodies, no new panel

| Saved case | Actual protection/control result | Ending/limitation |
| --- | --- | --- |
| A002 speed-gap OZ | RG/Mike load2.35→2.30; same DE first runner contact2.75. Earned edge win survives. | 5.04→5.24yd, both tackles; no guaranteed block win. |
| A015 technique-elusive WZ | Still no useful Mike collection; same Mike first contact2.90. Y remains in departure, so this patch cannot cure its earlier access problem. | Same−.49yd, tackle3.85. Keep as adverse/unresolved. |
| A030 ordinary Duo | Timely RG/Mike collection in both; RT/DT and C/Will useful loads preserved through arrival. Same SS first runner contact3.30. | **75yd TD→15.45yd tackle.** Retained and diagnosed below. |
| DuoUnder | Clear climb still develops real Mike load, keeper retained; useful route protection improves despite first load1.80→1.85. | SS first contact replaces Mike; see matched diagnostic. |

A030's original75yd touchdown depends on three broken holds. Candidate retains
SS's3.30 first wrap and3.55 break, FS's3.80 wrap and4.10 break, CB_W's3.90
assist; the third hold persists and runner falls at4.50 instead of slipping it.
One passive existing-input prefix pair to4.55 records the actual hold creation:

| CB_W→RB at3.90 | Accepted | Candidate |
| --- | --- | --- |
| Native execution | .582481 | 1.195644 |
| Initial grip quality | .172091 | .353556 |
| Hold capacity, kg·yd/s² | 204.414 | 334.738 |
| Initial leg share | .163548 | 0 |

Both bodies' maximum position-component difference is below .0005yd and
velocity-component difference below .0005yd/s at this wrap. The first two
wraps have identical execution draws. This is a materially different third
execution under changed root draw scheduling, not evidence that the blocker
sent the runner into an earlier unprotected defender. No tackle code/law
changes. It does not prove every later physics outcome correct; retain the
existing contact-law limits and adverse ending. No old touchdown requirement.

## Rejected branches and unresolved zone access

All source patches, plans, exact receipts and compact traces are retained in
[`zone-second-level-access`](../../data/reviews/current/zone-second-level-access/evidence-index.json).
Every changed variant was isolated before an interaction. None below is part
of the production correction:

| Trial | Result relevant to protection |
| --- | --- |
| A025 loaded helper depth retention | No earned Mike protection; first contact2.85 versus2.95. |
| A025 pre-contact check footwork | Later initial join; no useful release, Mike contact2.75. |
| A025 keeper proxy diagnostic | Y can leave1.70; still no Mike protection, contact2.75. |
| A025 earlier optional RT check | RT leaves1.25; misses Mike, contact2.75. This is not a proposed release rule. |
| A039 installed optional stretch check alone | Trajectory unchanged; no protection. |
| A039 check plus acquired flow cue | RT leaves1.45; still Mike access2.55. |
| A039 same, acquired chest criterion | Earlier RT exit1.25 and Mike hands2.35; **still** Mike access2.50. Contact is not protection. |
| A039 check + near-fit | Mike hands2.40, still Mike access2.50; not promotion evidence. |
| A039 same + ordinary maximum-speed approach | Mike hands2.35, Mike access2.45; rejected. No sprint/capacity addition. |

A025's primary Y genuinely loses hand control while RT's useful support depth
decays; changing a gate is insufficient. A039 can gain a second-level engagement
yet remain on the exposed side as the runner arrives. A015 still spends its
window departing. These are separate earlier geometry/access limits; this pass
does not justify more force, an earlier timer or another one-play escape tweak.
The current transferable principle is **finish an attainable interception on a
reachable, useful strike surface, then judge the defender's route through runner
arrival**. Different concepts still have different keeper/track responsibilities.

## Checks, reproducibility and cost

Node22.23.3,44 accepted flags, **RUN_CONTACT_COMPONENTS=1**, CF_FLOW unset;
all experimental hands/support/contact flags remain as recorded. World defaults
are recorded in every receipt, unchanged. No observer warm start or substituted
observation history: ordinary PlaySim initialization and native perception.

Test freeze `c39e5983cba67ec19fde6f85268d159224137ced`:
**62 focused tests and typecheck pass**. New checks execute the real production
hook in native and reflected acquired geometry; far command/held cadence remain,
near command gathers without placing bodies or drawing execution, and an actual
all22 continuation retains keeper/Mike load through arrival within work/arm
limits. Existing #69 hidden-state/obstruction, #88 mirrored strike/blocked
departure, combo transfer and run-fit contracts all pass unchanged. No full
suite/build/panel/game campaign: Integration owns final combined verification.

Research branch `codex/zone-second-level-access` includes frozen full inputs,
all predeclared plans,9 isolated variant patches and native observers. The index
records each tested source, full input hash, original manifest commit, operator
hash, flags, Node, censoring, raw hash and compact-payload hash. Rejected tapes
are sampled every.25 plus contact windows; candidate/Under tapes retain every
tick. Frozen input/source reconstruct the omitted support/profile internals.
Current saved panel references come from data-only `96cf6365` (do not merge its
ancestry), archive SHA256 `91c9e1d3713e2ce6e84610c319b7638dddfddec492363dadf66d9475e69dbc84`.
Under reference is reused from completed `bf9f610`; its source/input/flags match.

```sh
# On this research branch; no extra baseline batch is launched.
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 -- \
  node --import tsx scripts/diag/zone-access-capture.mjs run \
  out/replay-near-fit A030,DuoUnder 5 \
  data/reviews/current/zone-second-level-access/inputs.json
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 -- \
  npx vitest run --project core --maxWorkers=1 test/planned-climb-fit.test.ts \
  test/run-block-fit.test.ts test/collection-approach.test.ts \
  test/combo-strike-access.test.ts test/combo-transfer.test.ts
```

Native spend for this investigation: **21 short continuations/18 launches**, on
seven frozen inputs;12.286 collector seconds/21.612 launcher-command seconds,
including rejected variants. Focused tests4.781s + typecheck9.811s;
**36.204 total recorded launcher-command seconds**. One unsupported `--cwd`
invocation failed before simulation; corrected by using the copied launcher in
the isolated reference host. Existing baseline/panel costs are reused, not
counted as new. Matched/hold prefixes remain censored, never treated as gains.

## Next decision

Integration/independent Run-controller reviewer: review the ten-line blocking
delta and native protection contract, then verify the exact composed candidate.
Extract only blocking.ts + new planned-climb test/fixture; diagnostics/rejected
release/helper/grip/physics ancestry stay separate. Do-It-All's pending #94 can
change free movement after these requests, so this evidence does **not** prove
that composition; retain Under arrival and A030 useful collection if combined.
Do not rerun compatible baselines or start games for this local change. Adopt
the bounded near-fit only if independent review accepts it; keep N1's upstream
zone access limitation open rather than designating a new baseline ourselves.
