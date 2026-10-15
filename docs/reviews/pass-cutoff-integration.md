# Independent #67 extraction on accepted develop

**Decision: hold #67 runtime promotion on one replay-test contract; #65
documentation is independently ready for adoption approval.** Integration review from accepted develop
`8c891f4cf887b54297efbbc4c7993ba5e2f318b5`, separate from #65 documentation,
#66 physics and entry-admission. No merge or new baseline/default is authorized.

## Scope and portable extraction

Authored candidate `81b908586416070145b5b89ee9517380c4fe09fe`; publication
`01ed8d2e68e85e673e07ac0aa042cd851ac2fa92` on #67 is stacked on #64/#57/#54.
Do not merge that ancestry. Extract only the published `pass-cutoff.patch`,
four existing focused checks and their 9,671-byte native-input fixture.
The production diff is ten insertions/one removal in PassProtector's free
edge-cutoff action. One ordinary `goTo` approaches the same forecast point
through the existing .75*vmax budget. Loaded policy, fallback/ride, assignment,
forecast, perception, spacing, contact, capacities and flags are unchanged.
The runtime extraction is `b405a0e15efc5163bf9c435d50b35013e3e9883a`.

Source SHA256:
`1822455c3fdf15aecfd362fd01d54c80a2e1f7e12c97b0a2d9b611141adba4a7`.
All accepted #63 fixes remain included. No Awareness API, experimental helper,
stretch/zone implementation or physics dependency is required by this patch.

## Evidence and adverse results

[Author evidence audit](../../data/reviews/current/pass-cutoff-integration/author-evidence-review.json)
verifies 47 artifact hashes and the original runtime hash. Reuse its native
P020 transfer and retained-initial RT/RG diagnostics for their original source;
they do not certify current-develop trajectories. The shared code suite from
#63 remains compatible with its unchanged tree, not this new runtime.

Seventeen directly affected checks pass on the extraction. Two fixed inputs
are replayed as accepted-method/candidate pairs through3.50s, without game
prefixes. Both pairs start with identical22 bodies/RNG. Their first changed
request is LT/RT at .05s, with identical incoming bodies and one prior World
frame. No strength, contact law or privileged state is changed.

| Case | Accepted method | Extracted candidate | Interpretation |
| --- | --- | --- | --- |
| P040 LT | First load1.45, absolute phi .584; shed1.75; sack3.00 | Load1.20, phi .436; shed2.60; throw3.00 | Better useful opening and protection through the throw window; candidate remains live at3.50. |
| P040 RT | Load1.25, phi .482; holds through original sack | Load.95, phi .348; sheds1.55 | Real adverse opposite-edge result; improved shoulder does not guarantee a win. Initial execution/control and original retained-draw evidence remain visible. |
| P019 | Both edges useful through throw3.00 | Both useful through actual throw3.15; RG sheds2.40 | Opposing edge control passes; guard/interior outcome remains adverse and later execution coupled. |

P019 RG has identical pre-contact positions, acquired approach and .75s
initial contact geometry. Earlier edge engagements change the shared RNG:
its initial move changes swim→club. This is not a newly changed RG approach
request. It does not establish that every later contact is realistic.

Current P019 also has more sustained C/LG contact through3s:3 positive contact
samples/35.996 kg·yd/s →16/662.856. Closing speed peaks .218yd/s; this sums
repeated loaded contacts rather than16 independent crashes. This adverse
native evidence is preserved; it is not dismissed from the raw yardage result.

One targeted diagnostic retains only original C/DT_N initial-contact variates,
still consumes native draws, and changes no positions/requests/law. Extra
C/LG contact falls to2/22.667 through3s, while the RG loss2.40 and throw3.15
remain. This supports changed execution ordering as the traffic cause rather
than a new direct C/LG approach defect. It is not a production RNG fix, full
retained-randomness comparison or certificate of unit-wide protection.

[Compact outcomes and interpretation](../../data/reviews/current/pass-cutoff-integration/adverse-review.json)
link [paired raw capture](../../data/reviews/current/pass-cutoff-integration/paired-native.json.gz)
and [single diagnostic](../../data/reviews/current/pass-cutoff-integration/traffic-diagnostic-native.json.gz).
P019 and candidate P040 remain live at3.50s; no endings are inferred. No new
games, rosters, P020 replay or matrix was added. The original report's forecast
deadlines remain unproven: approaching its point better does not validate the
forecast. Predictor replacement and original rejected #64 trials stay separate.

## Cost and reproduction

New spend: one17-check focused command, four short paired segments across two
existing inputs, then one targeted center-execution diagnostic. Five segments,
zero completed games; exact launcher times are preserved in the packet. Small
metadata-label corrections were derived offline; original capture is retained.
The one exact combined attempt at `be6225436498a43d8d98437a69069434e51565aa`
passes typecheck/build and1,723 TypeScript checks across144 files, with one
failure; Python is explicitly skipped by fail-fast. No full green pass is
claimed. [Complete failed receipt](../../data/reviews/current/pass-cutoff-integration/combined-failure.json)
and [log](../../data/reviews/current/pass-cutoff-integration/combined-failure.log)
remain unchanged. All new command times, including diagnostic harness failures,
are in the [review receipt](../../data/reviews/current/pass-cutoff-integration/review.json).

The failed assertion at `test/replay-telemetry.test.ts:55` assumes every
recorded decision belongs to CoverageDefender. The existing fixture now also
records a legitimate DE_W `tackle-opportunity` at2.20s. A same-fixture
accepted/candidate diagnostic confirms all six actual coverage-job histories,
copied source immutability, perception, QB beliefs and unavailable-cause checks.
Its first two harness attempts repeated the same all-kinds assumption; both
failures and exact scripts are preserved, rather than counted as passes.

This is also adverse football evidence: in that ordinary pre-existing fixture,
candidate LT sheds1.20 and allows pressure2.15, while accepted has no LT shed
or pressure before the2.25s inspection boundary. Neither arm is a completed
play. The later tick after deliberately moving QB10yd tests copy immutability
only; it is excluded from native football interpretation. A faulty assertion is not a reason to omit that protection loss.
The diagnostic establishes the recording-kind mismatch, not universal blocking
improvement or full realism of the changed execution.

Smallest proposed contract repair: filter `coverage-job` entries before the
coverage-specific assertions. The [one-line patch](../../data/reviews/current/pass-cutoff-integration/telemetry-contract-proposal.patch)
is **uninstalled** and applies cleanly; no existing assertion, seed, threshold
or runtime was changed. Run Game's handoff owner and Catching/replay reviewer
should accept or reject that scope. Integration then freezes the final candidate
and owns its verification. No rerun of the unchanged failed tree is useful.

Use pinned Node22.23.3, locked dependencies, all44 accepted flags with
`RUN_CONTACT_COMPONENTS=1` and unchanged World defaults. Reproduction commands
are for a named unresolved question, not a requirement to repeat these runs:

```sh
node scripts/baseline.mjs --candidate --flag RUN_CONTACT_COMPONENTS=1 -- node --import tsx data/reviews/current/pass-cutoff-integration/replay.mjs out/cutoff-pair
node scripts/baseline.mjs --candidate --flag RUN_CONTACT_COMPONENTS=1 -- node --import tsx data/reviews/current/pass-cutoff-integration/replay.mjs out/cutoff-diagnostic out/cutoff-pair/trace.json.gz
```

The accepted-method arm compiles the exact accepted PassProtector update with
unchanged helpers; the candidate arm invokes native production code. All other
production files are byte-identical to accepted develop. No body/state is
hydrated from a future tick. The original author report/evidence remain pinned
on #67; this packet adds current-source evidence without replacing them.

## Adoption boundary

#65's exact reconciled documentation is independently recommended by the
[documentation review](../../data/reviews/current/pass-cutoff-integration/pr65-adoption-review.json).
Its source, tests, tooling/settings and88 existing receipt files match accepted
develop; merge preview matches its reviewed tree. No runtime check is needed
for that adoption. It requires explicit merge approval.

This runtime candidate remains held on that explicit contract disposition and
final verification; recommendation and merge authority remain separate. Neither candidate imports
#66, entry-admission or another experimental stack. GitHub default, historical
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`, branches and adverse history remain.
