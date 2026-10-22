# Historical integration queue

**Historical record; operating instructions superseded 2026-10-22.**
[PLAN](PLAN.md) and [GAPS](GAPS.md) govern current work on `develop`.
The pins, claims, approval requirements and process directions below describe
past checkpoints. They do not select today's trunk, assign current work or
reinstate mandatory integration-owner verification/Git-tracked receipts.
Evidence, links and historical decisions are preserved in place.

---

# Shared integration queue

Updated **2026-10-20 UTC /2026-10-19 America/Phoenix**. Integration in this chat owns queue
triage, exact combined verification and publication. This page is the canonical
accepted-reference and readiness record; [STATUS](STATUS.md) is a signpost and
[WORKBOARD](WORKBOARD.md) records edit boundaries. The [detailed issue register](ISSUES.md)
retains individual mechanisms, adverse evidence and return conditions. Earlier
stages remain below.
The [published queue branch](https://github.com/tannerthardy/football-simulation-/blob/codex/integration-queue/docs/INTEGRATION.md)
receives the actual post-merge pin and owner handoff; an older checkout is a dated
snapshot, not evidence that a later accepted merge should be ignored.

<a id="standing-integration-workflow"></a>
## Standing integration workflow — adopted 2026-10-15

The objective is believable football: informed choices and feasible execution,
with both legitimate offensive and defensive wins. An information correction
does not establish overall coverage, protection or statistical realism.

- Use the single GitHub [`integration-ready` queue](https://github.com/tannerthardy/football-simulation-/pulls?q=is%3Aopen+label%3Aintegration-ready).
  Contributors publish their own fetchable PR/code/evidence pins, minimal scope,
  dependencies, focused checks and known risks. Readiness requests independent
  review; it is not self-approval. An identified blocker stays in the existing
  blocked row with an owner/next action rather than being marked ready.
- Integration processes that queue when resumed and at working checkpoints.
  No background monitor is assumed and the user need not relay each patch.
  Batch compatible reviewed fixes at natural checkpoints while keeping each
  independently reviewable. Integrate genuine unblockers separately. No fixed
  batch size or wait for every agent; a blocked patch holds itself.
- **Standing user authority:** Integration may merge routine corrections within
  approved scope after independent review and required verification. Recheck
  mutable heads, review conditions and the exact merge tree first. Such accepted
  merges naturally advance `develop`. This supersedes older per-merge approval
  requirements for routine work; historical receipts retain their original authority.
- Contributors own focused evidence. Integration owns required verification of
  the exact combined candidate once, using [TESTING_COSTS](TESTING_COSTS.md).
  Reuse compatible evidence; documentation-only changes need documentation
  checks. Do not rerun unchanged verification merely to publish or merge an
  identical source/test/settings tree. A material correction or failed contract
  can justify another check; a new comment or branch push cannot by itself.
- Escalate physical-law or capability/default changes, experimental activation,
  unresolved material correctness risks, historical baselines/default branches
  and destructive cleanup. Do not infer approval for those from routine merge
  authority. Preserve adverse results and original branch/evidence history.
- Consolidate consequential decisions here and notify affected owners on their
  PRs. After adoption, publish the actual accepted commit, included fixes, exact
  verification, held items, football limits and next decision in one handoff.

<a id="accepted-development"></a>
## Accepted development reference

### Reviewed #189 finished-work checkpoint — freeze7d5da0c7

The independently accepted checkpoint is [#189](https://github.com/tannerthardy/football-simulation-/pull/189),
exact tested source `7d5da0c79adea4d7c4b43b85c498876ffe6d8742`. Its publication
preserves the tested source/tests/settings/tooling exactly. **Fetch current origin/develop;
the actual merged accepted pin is published on the canonical queue branch**
linked above.2c98bed9 below is the previous accepted build, not a post189 reference.

Includes169/171/174(172once)/175/176/177/178/180/181/182/183/184/185/186/188;
170/173/179/187 evidence/docs are preserved. New owner-approved shared seams,
fresh175/176 independent decisions, explicit user180motor approval and finished
independently reviewed178/188 rules are recorded in the
[scope/adverse/film report](reviews/finished-controller-integration.md).
[Exact receipt](../data/reviews/current/finished-controller-integration/final-receipt.json):
3007TS/171Python/typecheck/build pass,44settings/components1, no skips/drift.
Four matched evaluation games pass98standard accounting checks and candidate
score/TOP/possession audits; original failures and the old baseline's two missed
turnover credits remain explicit. Runtime+7.2%/+9.0%collection is accepted with
normalized costs/limits. No further unchanged verification to publish/merge.

Whole153, unreviewedFORCE_FLOW/TRAP_READ/LEAD_READ, GAIT_STEP/165,
experimentalhands/solvers and old101/106/137/158/163/164/166 holds remain out.
A blocked item holds itself; no new broad campaign, default switch, historical
baseline change, branch deletion or forced worker rebase. Owners fetch/adopt
this new source at clean checkpoints; source-qualify older investigations.
All older readiness snapshots below are historical relative to this checkpoint.

### Historical accepted #168 checkpoint — previous develop2c98bed9

**Accepted develop is `2c98bed94adad8087c65f381d4090444ad283985`**, merged through
[#168](https://github.com/tannerthardy/football-simulation-/pull/168) under standing
routine-correction authority. Parents are prior acceptedf4146275 and publicationcec68b20;
actual tree equals publication, protected source/tests/settings/tooling equal the
passing freeze. [Actual merged-pin receipt](../data/reviews/current/pr168-merge.json).
Exact freeze `25a7a5919b8eb6de24bf8b604b8d859263052dd9`
passes **2,248 TS/206 files,145 Python,typecheck/build** in261.757 command seconds,
Node22.23.3, no skips/input drift. All44 settings unchanged, components1,
GAIT_STEP0/CF_FLOW unset; World/kinematics/capacities/dependencies/verifier unchanged.

Included minimal scopes: **131/141/148→149/150/152/155/156/157/159/corrected160/161/167**,
plus153's installed-play QB-away direction and end-to-end hundredth-yard film.
50 protected files/17 source files, independently reconstructed from reviewed
pins. The full153 research branch and data-only histories are not imported.
[Scope/adverse/test-input decisions](reviews/latest-reviewed-checkpoint.md),
[final pins/file hashes](../data/reviews/current/latest-reviewed-checkpoint/final-intake.json),
[final receipt/raw evidence](../data/reviews/current/latest-reviewed-checkpoint/final-receipt.json).

Initialbda8 failed13 TS checks; original receipt/log retained. Normal reverts
hold164's useful departure/access tradeoff and165's native motion/spacing
contracts; neither is waived. The materially reduced candidate justified one
new exact run; no unchanged publication/merge rerun or extra game campaign.
Also held:162/new yaw,GAIT_STEP activation,158/163/166,137 joint policy,
broader153 experiments and earlier tooling/Physics. Preserve coverage comeback
space, receiver traffic/falls, delayed shotgun exchange/unproved loaded blitz
pickup, contact lifetime, wide-zone/combo movement and deep-pursuit risks.
Finer film can change output-derived pressure metrics near thresholds; retain
measurement provenance. Correctness repairs do not certify football/NFL realism.

At168 publication the integration-ready queue was empty; the latest169/170/171 intake follows below.
All13 incorporated source PRs are closed with exact extraction dispositions;
all source branches and original/rejected evidence are retained.153 remains open
research;164/165 remain held. [Dispositions](../data/reviews/current/latest-reviewed-checkpoint/dispositions.json).
[Affected-owner handoff](https://github.com/tannerthardy/football-simulation-/pull/168#issuecomment-6281006908).
Fetch this accepted pin at clean checkpoints; preserve genuine research hosts/stack
parents and source-qualify old tapes. Assembly boundary released. Next follow-up
should use a bounded saved witness for wide-zone/combo access or deep pursuit.
Any frozen-panel comparison is separately budgeted; no automatic per-patch game gate.

### Historical Claude153 preparation before #189 — Parts1–13 atbae3fe80

Accepted develop remains2c98bed9; research `bae3fe80d189a7d792aaafbc4eea1ae2baa79573`
already includes it.75 research settings versus44 accepted; original44 values
unchanged. Full research behavior/31 added registrations remain unapproved.
[Current reviewed/unreviewed scope, owner prompts and exact pins](reviews/run-game-v3-review-intake.md#latest-claude-preparation).

First portable candidate: independently reviewed **169@1004b818 +171@6cbdcc4d**,
seven files/five runtime files, sourcef3ed945f. [Patch and manifest](../data/reviews/current/claude-latest-review-intake.json).
Only temporary-index/ref/blob checks completed: not frozen/combined-verified or
adopted. Integration owns final overlap acceptance/exact verification once;
contributor focused receipts are reused.Newly refreshed172@ae6b1d9 already has independent solo-runoff acceptance. Optional
169+171+172 portable composition is10files/7runtime, source094ce734; temporary-index
application succeeds, semantic stepRunRep overlap/adverse review remains Root's.
170@4a5aadcb remains a separate diagnostic/
regression-contract review with no engine/default delta. Neither lane waits for
all research or Physics. Preserve169 WZ7 leverage cost and171 OZ4 adverse ending.

Run independently reviews proposed FORCE_LEAD first and triages mesh/puller/climb
deltas; Catching retains169/171 and coverage duties; Physics continues gait-intent
and separately adjudicates contact validity; Flex continues pursuit and reviews
SPACE_STEER at its checkpoint; Measurement checks changed operators/provenance;
CEO reconciles old154 planning. All seven owner-addressed GitHub requests are
posted; acknowledgment pending. Direct chat dispatch is unavailable.
[Delivery links](../data/reviews/current/claude-owner-delivery.json), [exact prompts](../data/reviews/current/claude-integration-assignments.json).

Earlier UC/mesh/ZONE_TE/STRETCH_FLAT/LB_KEY/drive/departure/FB/alignment and
SHED_PURSUE holds persist unless changed pinned hunks resolve them. New Part9–13
controller families have no blanket independent acceptance. MAN_RUN_COMMIT's
narrow successor is171; it does not approve the original experimental flag.
GAIT_STEP=.5 and162/164/165 remain separately gated. Preserve shotgun49→103/600
negatives, worse low-speed LB/DB acceleration fit, SPACE_STEER IZ/gap costs,
pending carrier-excluded/trap arms and operator qualifications.170 demonstrates
recoverable disruption under its exact conditions, not a universal slowdown law.
No games, broad lab/NFL recollection or shared suite during this preparation.
Only QB-away direction and complete film precision from153 were delivered via168.
All original intakes, receipts, rejected trials, branches and historical4ded6b6 remain.

<details>
<summary>Completed #151 checkpoint and its then-pending queue — historical</summary>

### Completed #151 and next queue

**Adopted #151 asf4146275.** Exact freeze638b1d8 composes reviewed126/132/133/134/135/136/138/140/143/146/147 on accepted914f4d5:38 protected files/16 source files, no diagnostic ancestry. **2113 TS/189 files,145 Python,typecheck/build pass** in209.041s,Node22.23.3,44 settings/components1/CF_FLOW unset,no drift/skips. One exact combined verification; contributor receipts reused; no additional native/panel/game campaign or unchanged publication rerun. [Final receipt and raw logs](../data/reviews/current/controller-checkpoint/final-receipt.json). [Independent scope review](https://github.com/tannerthardy/football-simulation-/pull/151#issuecomment-6245774023).

#126's strict installed-half assertion is independently adjudicated, original failure retained. #140/#143/#146 have pinned nonauthor review0319d2a; GH requires140 and stays outside automatic calling. Shared143 kick allowance preserves140 lead/trap/uncleared gates. QBPass forecast135 and QBHandoff136 remain distinct; reversible projection proves only reviewed hunks. Existing laws/capacities/spacing/carrier/settings/tooling stay accepted. [Pins/dependencies/risks](../data/reviews/current/controller-checkpoint/intake.json).

Held independently:137/148/149/150 await Run/nonauthor controller dispositions;141 has three existing-contract reconciliations/comeback tradeoff;131 is a pure helper without Catching caller hookup. Tooling101/106 and experiments retain their existing holds. A blocked item holds itself. [Posted Run review task](https://github.com/tannerthardy/football-simulation-/pull/150#issuecomment-6245714067). Older checkpoint dispositions below retain their historical evidence; this intake was current at151.


**`develop@f4146275ce7539816bf57b4ed55a0d2be10e48c7`** is accepted through
[#151](https://github.com/tannerthardy/football-simulation-/pull/151).
Actual tree equals publication`97d50ed1918be7cf9f00a647f3a9285596c54976`; protected source/tests/settings/tooling
equal passing`638b1d8e57dea26f1ce62c5b682f61420c3586d7`. [Actual merged-pin receipt](../data/reviews/current/pr151-merge.json).

Included only independently accepted **126/132/133/134/135/136/138/140/143/146/147**:
combo installation/strict contract, acquired QB/mesh/give continuation, official
result credits, observer-owned receiver forecast, contact-support intent,
wrapper/kick contracts, explicit manual GH and acquired blocker work reference.
38 protected files/16 source files; no author research/data-only ancestry.
Physical laws/capacities/shared spacing/carrier/flags/tooling remain unchanged.
GH is outside automatic calling. Both adopted handbooks remain available.

**2,113 TS/189 files,145 Python,typecheck/build pass** in209.041s,
Node22.23.3,44settings/components1/CF_FLOW unset,no drift/skips.
[Final exact receipt/raw log](../data/reviews/current/controller-checkpoint/final-receipt.json).
One combined run, component evidence reused with original sources; no unchanged
publication/merge rerun or additional native/panel/game campaign. Existing
full-suite game assertions ran normally. All11 delivered source PRs closed as
incorporated by extraction; every source branch and adverse/rejected receipt retained.
[Dispositions](../data/reviews/current/controller-checkpoint/dispositions.json).

Preserve earlier Mike/depth/OZ costs, composed LT/RB traffic, nominal forecast/
unknown-progress/residual-QB debt, unresolved long-contact lifecycle, late kick
traffic, GH Under loss/strong collision/censor and147's awareness/availability
limits. The historical composed witness does not certify this larger tree's
ending. Correctness and acquired-information repairs do not certify football/NFL realism.
[One included/held/risk/verification/owner handoff](https://github.com/tannerthardy/football-simulation-/pull/151#issuecomment-6245821495).

Held independently:137/148/149/150 Run/nonauthor dispositions (149→148 genuine stack),
141's three coverage contracts/comeback cost,131 caller hookup; tooling101/106
and experimental/default lanes retain holds. #101 readiness removed pending its
minimal repair/review. Fetch/record this accepted pin at clean checkpoints; preserve
intentional research hosts and never relabel old native tapes as current evidence.
Integration assembly boundary released. Historical4ded6b6/GitHub default unchanged.

</details>

<details>
<summary>Previous handbook-only #144/#145 /914f4d56 adoption — historical</summary>

**`develop@914f4d56a3b7ef2845ff0208f55d626c0ff5f880`** is accepted through documentation-only
[#144](https://github.com/tannerthardy/football-simulation-/pull/144) and
[#145](https://github.com/tannerthardy/football-simulation-/pull/145).
Runtime/source/tests/settings/tooling remain byte-identical to accepted0000e560
and passing82fdc79. Reuse the existing1988 TS/145 Python/typecheck/build receipt;
no code-suite/simulation rerun, experimental activation, baseline/default change.

- [Moving run-game/pulling-guard handbook](football-handbook/moving-run-footwork.md)
  is in the existing chapter index; original128,356characters/SHA25633c3636f preserved.
- [HonestNFL source library](references/honest-nfl/README.md) is in references,
  linked from the handbook and root README:385 original images/OCR,403 original
  mappings,37 familiar families/27 crosswalk entries; all793 payloads match source108.
- Documentation/hash/provenance/deterministic-index/1130 fragment checks pass.
  Original images outrank unproofread OCR and first-pass interpretations. Proposed
  handbook checks are options under TESTING_COSTS, not required suites or installed behavior.

[Actual merged pins and documentation receipt](../data/reviews/current/pr145-merge.json).
[Consolidated placement handoff](https://github.com/tannerthardy/football-simulation-/pull/145#issuecomment-6243511938). #108 is closed as incorporated by
extraction; source branches and evidence retained. Runtime candidate/hold decisions
below are unchanged by this documentation task; no broader runtime queue re-review claimed.

</details>

<details>
<summary>Unchanged runtime acceptance through #130 /0000e560 — retained receipt</summary>

**`develop@0000e560e0dbe31905151465152d412ba838803d`** is accepted through
[#130](https://github.com/tannerthardy/football-simulation-/pull/130).
Included **#128 only**: acquired Quarters flat matches retain the same body's
installed force/inside duty while current run belief and positive acquired
possession support it. Existing cancellation/recognized-flight priority stays.
Two exact reviewed protected files/one runtime file; no other source/tests/
settings/tooling, physical law, capacity or experimental activation changes.

Actual merged tree equals publication`691dda69ee613d1c7b0d131870395d581c20524f`;
protected source/tests/settings/tooling equal passing`82fdc799f2981f72089ae7908caa430685dfac18`.
[Actual merge/ref preservation receipt](../data/reviews/current/pr130-merge.json).
**1,988 TS/175 files,145 Python,typecheck/build pass** in212.180s,
Node22.23.3,44settings/components1/CF_FLOW unset,no drift/skips.
[Exact receipt/logs, reused focused evidence and limitations](../data/reviews/current/zone-force-integration/final-receipt.json).
No unchanged rerun to publish/merge. Initial #126/#128 failure219.553s stays
preserved; total431.733s covers the two different candidates, zero extra
standalone native/panel/game jobs. Existing full-suite game assertions ran normally.

**Held #126** needs Run/original nonauthor adjudication of the planned-double
old ordinary-command guarantee versus intended installed half; no assertion
changed. #127's wheel-versus-swing costs and experiments remain held. Native128
controls establish preservation, not newly won stops/general coverage quality.
Man-QB/premesh/fast#3/cushion work remains unfinished. Audit70b4 is source-qualified
and both data-only evidence histories stay outside develop ancestry.
[One consolidated included/held/risk/verification/owner handoff](https://github.com/tannerthardy/football-simulation-/pull/130#issuecomment-6229797813).
#128 is closed as incorporated by extraction; original branch/evidence retained.
Authors fetch/record current develop and reconcile relevant contracts at clean
checkpoints; no forced rebase, renamed historical film or shared-suite repeat.
Historical4ded6b6/GitHub default unchanged. Integration assembly boundary released.

</details>

<details>
<summary>Previous accepted #125 /70b4db6 reference — historical</summary>

**`develop@70b4db6a3ef53acc1a0e90cd055f1087205daa30`** is accepted through
[#125](https://github.com/tannerthardy/football-simulation-/pull/125).
Entire actual merged tree equals publication `df603380eabc535597c8a6434fd790761589445c`;
protected source/tests/settings/tooling equal passing freeze
`910c0588307ee443e24af9852e564c84a7e932d7`.
[Actual merged-pin preservation receipt](../data/reviews/current/pr125-merge.json).

Included seven independently accepted narrow scopes: **117/122** stretch normal
following/anchored shoulder and verified gentler pacing; **123/124** shallow
observed-runner insertion and Quarters flat/wheel duty distinct from Palms;
**118/120/121** transverse-support, dive/effort/fall-history accounting and two-point
participant energy persistence.24 protected files/seven runtime files, no diagnostic
ancestry. Independent mechanical classification accepts existing-budget/accounting
repairs, not a new force law, capacity, coefficient/default or solver proposal.

**1,980 TS/174 files,145 Python,typecheck/build pass** in219.521 command seconds,
Node22.23.3,44settings/components1/CF_FLOW unset, no skipped phase/input drift.
One exact combined verification; compatible component receipts reused. Four
nonauthor reviewers performed source/receipt/patch/emission checks and only
zero-engine algebra/stubs; no duplicate contributor suite or new native/panel/
evaluation-game campaign. Existing full-suite game assertions ran normally.
[Final receipt and raw log](../data/reviews/current/reviewed-maintenance-integration/final-receipt.json).
Source `9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941`;
validation `dfbff86ef7dbaaf59d308a90383bde5a6d32381c1b2e1fc64079978713a5474e`.

Preserve depth/weak-traffic costs, tackle-sensitive gains and incomplete LG/Mike
protection,123 prefix limits and broader tracker HOLD,124 top-depth/cushion cost,
118 source-qualified postcontact observations and inherited support/fatigue limits.
Corrected effort can change later energy under the existing mapping; no population
football/NFL or calibrated-fatigue claim. Original failed/adverse receipts and raw
retention qualifications remain explicit.115 capacity seam,116/119, departure/
CLIMB_EXIT/initial-surface diagnosis and experimental solver work remain separate.

[Consolidated owner handoff](https://github.com/tannerthardy/football-simulation-/pull/125#issuecomment-6228298079).
Delivered117/118/120/121/122/123/124 PRs are closed as incorporated by extraction;
all original branches, experiments and evidence remain.
[Exact dispositions](../data/reviews/current/reviewed-maintenance-integration/dispositions.json).
Authors fetch/record current origin/develop before new implementation/handoff and
reconcile at clean checkpoints. Intentionally pinned research remains historical;
no forced rebase or old-source relabeling. Integration extraction boundary released.

</details>

### Handbook/reference placement

User-authorized documentation-only #108 extraction is adopted through145 at914f4d5: original source library in `docs/references/honest-nfl/`, linked from the handbook, reference catalog and root README. Independent source/OCR/provenance, fragment and deterministic-library checks pass; no source/tests/settings/tooling or old tracking imported. [Exact review/check receipt](../data/reviews/current/handbook-reference-integration.json). Original diagrams outrank unproofread OCR/first-pass interpretations; this does not install schemes or certify universal aliases. No code suite or game campaign.

### Current checkpoint and audit priorities

**Adopted #130 / #128-only as0000e560:** exact freeze82fdc79,
two reviewed protected files/one runtime file on accepted70b4db6. Source matches
author5b710a1b exactly. **1988 TS/175 files,145 Python,typecheck/build pass**
in212.180s, Node22.23.3,44 settings/components1/CF_FLOW unset, no drift/skips.
[Final receipt and complete logs](../data/reviews/current/zone-force-integration/final-receipt.json).
Contributor74 focused/typecheck and four native preservation controls reused;
no new standalone native/panel/game campaign. No new fit allocation, movement,
physical law/capacity/default or experimental activation. Native controls do not
establish newly won stops; man-QB/premesh/fast#3/cushion failures stay open.

**#126 holds itself:** initial combined7f98ad4 passes typecheck/build/2003 TS,
but fails existing zone-reach double exact-command contract; Python skipped by
fail-fast,219.553s. [Failure, source-only diagnosis and hash correction](../data/reviews/current/zone-force-integration/initial-failure-disposition.json).
Run/original nonauthor must adjudicate the old ordinary request versus intended
installed half; no assertion changed. Original reviewed code and failed freeze
remain. Total integration command cost431.733s includes both different candidates;
no unchanged verification is repeated for publication/merge.

**Audit is evidence, not an engine candidate.** [#129 report](https://github.com/tannerthardy/football-simulation-/blob/94f25c64cf2c471220f6297cb7cddd86a1fc3d4e/docs/reviews/accepted-game-deep-audit-2026-10-16/README.md)
stays pinned to measured70b4db6, even after later accepted fixes. Integration verified
its protected source/tests/settings delta is empty and independently fetched the
permanent evidence tag. [Seven published files/size/SHA256 checks](../data/reviews/current/zone-force-integration/audit-data-check.json)
include the14,192,453-byte archive, SHA256
`5498158a401c95e332e948040384b5dafc1dcd62eb65921ddf134c848dc5ec56`.
Evidence tree23d5f6d/originalb9b9c175 remain outside development ancestry.
No audit source/tooling/history is imported; the existing issue register is reconciled.
No collector, full suite or game is run for audit/source-document publication.

| Owner | Bounded next action | Dependency / evidence boundary |
| --- | --- | --- |
| Run |136 secure/carry continuation is adopted; initial mesh spacing and broader recovery remain distinct. | Keep real transfer-first reach/ordinary mesh/PA. Old70b4 caps remain unknown endings; a better ending on the combined current tree needs one compatible composed witness/control for that claim. |
| Pass/Awareness/Catching |132 man pursuit/134 per-observer mesh retirement and138 contact-support intent adopted. Wider possession/conversion/lifecycle debt remains. | Preserve keyed fits/PA/128 force wrapper; future local continuation and fast3/roof jobs need their own contracts. No general tackle or ending guarantee. |
| Physics + Catching | BALL-001 local relative endpoint query, jointly legal height/reach interval and closest legal opportunity. | Physics helper/tests; Catching tick-entry/end capture and eligibility/order/retry/difficulty. No earliest-reach semantic change, World rewrite or capability/default change. Native nominated INT invalidity remains unresolved. |
| Flex / Do-It-All + Awareness/Pass |135 receiver prior/estimate/observer cache is adopted at QBPass evaluation/release; preserve this interface in future assign/coverage work. | Existing eligibility/range ordering/window/protection/pocket/scramble/option-route reads remain named debt. No automatic teammate refresh/live converted-route prior or global transport promotion. |
| Measurement + Integration |133 GAME-004 official giveaway/safety sack/tackle/pressure credits adopted with own-goal-plane statistical loss. | Physical endX and raw archived observations retained. Keep YAC/elapsed-hold/censor meanings distinct; any audit-index annotation stays metadata, not archive rewrite. |

[Consolidated owner coordination and exact contracts](https://github.com/tannerthardy/football-simulation-/pull/129#issuecomment-6229679789).
#127@f6a3c86 remains HOLD: wheel leverage costs the successful swing
0.5862→6.6145/12.9918YAC. #128 does not adopt either approach. Tooling101/106,
reference108 and experimental Physics retain their existing independent dispositions.
A blocked item holds itself; do not wait for every audit priority or fill a batch
with unrelated findings. Another broad evaluation needs a named transfer question.
Historical4ded6b6/default branch and experimental flags remain unchanged.

### Remaining agent tasks

| Owner | Task / exact starting publication | Cost boundary |
| --- | --- | --- |
| Catching → Measurement |106@706a10cc: preserve resumed failed/wall-cache index/counts/partial evidence; keep no-retry. Independent HOLD682f47c. | Tiny zero-engine regression; no3198-case campaign. |
| Run → Measurement |101@ed2fed9e: finish wall-censor/partial-exception accounting repair with correct attempted/skipped separation. | Tiny stubs; preserve1848-study caches, no recollection/reserve reveal. |
| Reference adoption completed |108@5cade6a5 delivered through145; original images/OCR/provenance and uncertain interpretation labels retained. | Documentation checks passed; no engine/suite/game rerun. |
| Measurement | Independently review the two exact repair pins and reconcile PA full-input identity offline. | Reuse failure repros; no new football campaign for accounting. |

[Full copyable prompts, source pins, posted assignments and decisions](../data/reviews/current/reviewed-maintenance-integration/agent-tasks.json).
Existing football checkpoint carries forward; if already frozen/completed, preserve
its real source/results without automatic restart/recollection. Four-game context
still needs a CEO call. Historical4ded6b6/GitHub default unchanged.

<details>
<summary>Completed #125 integration preparation and independent-review assignments — historical</summary>
## Completed #125 integration preparation

Prepared from acceptedd682b1f; adopted as70b4db6 through125 after exact passing verification. Extraction boundary released.
Integration owns `codex/reviewed-maintenance-integration` from that pin plus queue
bf493d8. Seven narrow corrections have independent ACCEPT dispositions:

| Scope | Exact reviewed publication | Independent lane / remaining integration gate |
| --- | --- | --- |
| #117 normal following/anchored shoulder | fae0a358 | Run-controller review9ea0782; depth/weak-traffic costs retained. |
| #122 verified gentler gathering | cf827df7 | Same independent lane accepts117/122 composition; five-file scope only. |
| #123 shallow observed-runner insertion | 5da02125 | Defensive reviewd01d020; broader Counter/PA tracker remains held. |
| #124 Quarters flat/wheel duty | 9f2206a3 | Same defensive lane accepts duty with disclosed top-depth cost; not full wheel technique. |
| #118 transverse support accounting | 3b426fb1 | Mechanical review4b2664d: existing-budget repair, no new law/capacity/default. |
| #120 dive/effort/fall-history accounting | 35f87c90 | Same mechanical lane; inherited fatigue proxy/calibration limits remain. |
| #121 two-point energy writeback | 1dc41611 | Independent routine bookkeeping, no118/120 dependency. |

Twenty-four protected files, seven runtime files; all unshared blobs equal their
author pins, shared World equals the independently checked118/120 composition.
No diagnostic ancestry or held experiments imported. Component checks and native
receipts are reused with their actual source/retention limits. Exact freeze910c058 passes **1980 TS/174 files, 145 Python, typecheck/build**
in219.521 command seconds, Node22.23.3, same44 settings/components1/CF_FLOW unset.
No skipped phase/input drift; one exact combined run, no unchanged publication rerun.
[Final receipt and complete raw log](../data/reviews/current/reviewed-maintenance-integration/final-receipt.json).
[Merged PR #125](https://github.com/tannerthardy/football-simulation-/pull/125). No additional native, panel or game job.
[Intake and preserved risks](../data/reviews/current/reviewed-maintenance-integration/intake.json),
[exact extraction audit](../data/reviews/current/reviewed-maintenance-integration/extraction-audit.json),
[copyable agent tasks and posted assignments](../data/reviews/current/reviewed-maintenance-integration/agent-tasks.json).

**Independent tasks are work, not self-approval.** Four nonauthor reviewers handled
run controllers, defense contracts, mechanics/accounting and tooling. Source and
saved evidence come first; small extra checks name a decision. No duplicate shared
suite or requirement to verify every old PR again. Original owners keep progressing
and reconcile accepted changes only at clean checkpoints. Readiness labels request
review; exact verification/adoption remain Integration's responsibility.

**Separate tasks/holds:**

- **#106 → Catching repair, Measurement review:** resumed failed/wall-censored
  caches can overwrite the prior index, losing attempted/censored/failure counts
  and relabeling them skipped. Independent zero-engine reproducer confirms it.
  Preserve the blocked index or retain its row/accounting; keep no automatic retry.
  [Pinned HOLD and smallest repair](https://github.com/tannerthardy/football-simulation-/pull/106#issuecomment-6228234519).
  No3198-case campaign. PA identity mapping is offline compatibility work.
- **#101 → Run repair, Measurement review:** existing wall-censor/partial-exception
  trace HOLD remains unchanged. Supply tiny stub controls; no1848-study recollection.
- **#108 → nonauthor reference reviewer:** source/hash/OCR/provenance/link and
  interpretation labels only; exact teaching images outrank OCR. Documentation
  lane does not hold runtime. [Task](https://github.com/tannerthardy/football-simulation-/pull/108#issuecomment-6228199773).
- **#115** optional capacity seam/calibration stays separately held; **#116/#119**
  remain author-HOLD for depth/traffic and runner/loaded-RG costs. #113/#114 research,
  broader tracker, departure/CLIMB_EXIT, initial helper-surface diagnosis and
  experimental Physics remain separate. Do not merge experiments to simplify refs.

Existing measurement checkpoint carries forward; no new panel, game or baseline
recollection merely to validate this intake. Four-game context remains a CEO call.


</details>

<details>
<summary>Previous accepted #112 /d682b1f record — historical</summary>

**`develop@d682b1f474cb6ba260a7b8b1119a62919c5a2159`** is accepted through
[#112](https://github.com/tannerthardy/football-simulation-/pull/112).
Entire actual merged tree equals publication `ea0f6f33ab75eee652f762884b05c7b8a3cea485`;
protected source/tests/settings/tooling equal passing freeze
`df900af6960988dc2eca4bb2ba220ce4ac126cc1`.
[Actual merged-pin preservation receipt](../data/reviews/current/pr112-merge.json).

Included only independently accepted **#110** acquired entry reasoning and final
**#111** emitted-direction connection travel: three runtime files and their three
proper tests. Six exact blobs and sourcebed3c36 match independent reviewde3de0c;
no diagnostic ancestry or experimental activation. All earlier accepted controllers,
contact validity, physical laws, capacities and44 settings remain preserved.

**1,906 TS/164 files,145 Python,typecheck/build pass** in213.321 command seconds,
Node22.23.3,components1,CF_FLOW unset, no skipped phase/input drift. One exact
combined verification; published65/66 focused/typecheck evidence reused rather
than called131 unique checks. No additional focused/native/panel/evaluation-game
execution and no unchanged rerun to publish/merge.
[Final receipt and complete raw log](../data/reviews/current/run-entry-connection-integration/final-receipt.json).
Source `bed3c36cf08407762fed67abdf0a1651fe6ed7fc8c09b43ab3d9b33f1dfd4616`;
validation `accb9a7506f05b82578ff2bb4cdf848123e23a40f90de60af58b178f2cb9c638`.

Preserve the small strong-choice margins, earlier weak/fresh contact, closure-only
weak loss and shorter110 fresh-IZ4.35→3.67 ending. Duo identity applies to adding111:
110 itself advances SS contact3.45→3.25s, both censored3.50s. Strong achieved access
needs both patches; no robust league-gain claim. Old all-off6753 source is not
relabeled literal accepted4658; inherited reader/route/contact limits remain.
[Pinned review and portability/limits](reviews/pr110-111-independent-review.md).

[Consolidated owner handoff](https://github.com/tannerthardy/football-simulation-/pull/112#issuecomment-6226301632).
Run/Do-It-All reconcile entry/closure/keeper and second-level access at clean
checkpoints; Catching/Measurement qualify older coverage/contact tapes. Physics
retains its separate hand-retention/ownership question. No forced rebase or old
source relabeling. Delivered110/111 are closed as incorporated by minimal extraction;
all original branches, experiments, failures and evidence remain.
[Exact dispositions](../data/reviews/current/run-entry-connection-integration/dispositions.json).

Carry forward the existing shared frozen-panel checkpoint, not another collection
merely for this merge. If not frozen, coordinate this coherent accepted pin under
the existing budget; if frozen/completed on107, preserve its real source/results,
with no automatic restart/recollection. Four-game context needs a separate CEO
call. #101 tooling repair, rejected gradient, CLIMB_EXIT/departure/release and
experimental Physics remain separate. Historical4ded6b6/default unchanged.


</details>

<details>
<summary>Completed #112 preparation and earlier #107 integration boundary — historical</summary>
## Completed #112 integration preparation

Prepared on acceptedc3264b0; adopted asd682b1f through112, with actual tree equal publication and protected files equal passing freeze. The extraction boundary is released.
Integration owns `codex/run-entry-connection-integration`, based on that accepted
pin plus queue625f3b4. The independently accepted six-file composition contains
#110's acquired entry reader and #111's final emitted-direction connection travel:
three production files and their three proper tests. All six blobs match the
review; source `bed3c36cf08407762fed67abdf0a1651fe6ed7fc8c09b43ab3d9b33f1dfd4616`
equals the reviewed interaction, without its diagnostic ancestry.

Reuse the published65/66 focused checks and matching typechecks, not131 unique
checks or a composed-suite pass. Exact freeze `df900af6960988dc2eca4bb2ba220ce4ac126cc1` passes **1906 TS/164 files, 145 Python, typecheck/build** in 213.321 command seconds.
Node22.23.3, unchanged44 flags, components1 and CF_FLOW unset; no skips/input drift.
One exact combined run; no unchanged rerun to publish/merge.
[Final receipt and raw log](../data/reviews/current/run-entry-connection-integration/final-receipt.json).
[Merged PR #112](https://github.com/tannerthardy/football-simulation-/pull/112). No remaining
local contract calls for another focused test, native continuation, panel or game.
[Pinned independent review and portable patches](reviews/pr110-111-independent-review.md).
[Intake, exact approval and risks](../data/reviews/current/run-entry-connection-integration/intake.json).
[Blob/source/evidence compatibility audit](../data/reviews/current/run-entry-connection-integration/extraction-audit.json).

Preserve the small strong-choice margins, earlier weak-side contact, shorter fresh
IZ ending and Duo's earlier SS contact from110. Duo identity applies to adding111,
with both arms censored at3.50s. Strong achieved access needs both corrections;
it does not establish robust rushing gains. Old all-off source6753fa98 remains
historical, not relabeled accepted4658. CLIMB_EXIT, rejected gradient, departure/
release trials, tooling101 and Physics retention/force-law questions stay separate.

## Completed #107 integration boundary — 2026-10-16

Adopted as **c3264b0bad72bd2c208602e0ecf0461c00d9669f** through #107. Integration boundary released; all contributor branches/evidence retained.
Integration owns isolated `codex/coverage-run-integration` from that pin plus
queue metadata db0d512. Include only independently accepted **#97+#100** eight-file
composition, separately accepted **#95** installed acquired rat duty, Physics-
accepted **#102** existing-span lifecycle, and **user-approved #104** inline-role
eligibility. The user explicitly overrides #104's author-independent approval
hold; this is user approval, not an independent author review.

Fourteen protected files/six runtime files. Shared acquired entry occurs once;
#95's cut is reconciled separately. #104 retains accepted #96 near-fit work.
Existing20 overlap checks pass; compatible focused/native receipts are reused.
Exact freeze90240f5 passes **1,890 TS/162files,145 Python,typecheck/build**,
226.175s,Node22.23.3,44flags/components1; no drift/skips. Targeted overlap1.873s,
total228.048s. One combined run, no unchanged repeat to publish/merge.
[Final receipt and complete raw log](../data/reviews/current/coverage-run-integration/final-receipt.json).
[Merged PR #107](https://github.com/tannerthardy/football-simulation-/pull/107).
[Intake, approval, reviews, overlay and extraction audit](../data/reviews/current/coverage-run-integration/intake.json).
[Pinned independent coverage/rat adjudication](reviews/coverage-contract-review.md).

Preserve Drive's lost shallow help, exposed seam/changed targets/execution,
rat collision/fall and lost availability, earlier defensive access, and changed
fumble/RNG. Inline native evidence remains contextual, not a current-source gain
claim. Helpers/active pass stay on their legacy span; pass-to-run solo conversions
use the cutoff. The boundary is20Hz, not continuous substep validity. No new
native/panel/game campaign, force/capacity/default or experimental activation.

**#101 stays tooling-HOLD**, now head ed2fed9e204c0e916ea8f788afadb4805016ff05:
wall-censored attempts are omitted from index/censor counts and become skipped
tail; numerical exceptions lose partial traces. Run owns the minimal repair,
Measurement its stubbed execution review. Saved1848-study findings remain
source-qualified; **do not recollect the study**. Additional workflow/report
publication does not clear the defect. #99/perimeter, stranded-mesh diagnosis,
consent proposals and experimental Physics remain separate.


</details>

<details>
<summary>Previous accepted #107 /c3264b0 record — historical</summary>

**`develop@c3264b0bad72bd2c208602e0ecf0461c00d9669f`** is accepted through
[#107](https://github.com/tannerthardy/football-simulation-/pull/107).
Entire actual merged tree equals publication `1b39436f3635aa53e9e12ccad9863f9268245476`;
protected source/tests/settings/tooling equal passing freeze
`90240f5cf1fd55b48ecc10dfa9b65236af42cc66`.
[Actual merged-pin preservation receipt](../data/reviews/current/pr107-merge.json).

Included **#97/#100** acquired entry/provisional block/release cushion/observed-cap
delivery, **#95** acquired installed-rat cut, **#102** existing-span isolated run
lifetime validity, and **user-approved #104** installed-inline role eligibility.
Independent95/97/100/102 reviews accept bounded scope; the user's104 override is
explicitly user approval. Shared entry once; all accepted #105 controllers remain.
Fourteen protected files/six runtime files; no diagnostic/experimental ancestry.

**1,890 TS/162 files,145 Python,typecheck/build pass**;226.175 command seconds,
Node22.23.3,44flags/components1, no skipped phase/input drift. Twenty existing
rat/provisional-block composition checks1.873s,total228.048s. One exact combined
verification; no unchanged repeat to publish/merge and no additional standalone
native/panel/evaluation games. [Final receipt and raw log](../data/reviews/current/coverage-run-integration/final-receipt.json).
Source `4658b9ce14e2ce73ae7784635dcface1e115ebdf9eba2ca1c70c2bec1ca89d8b`;
validation `8545b068b87e4f5e16c37cddeb9497af2bb8c716ea4c25db16519f5f8425ad3f`.

Preserve Drive's shallow-help costs/exposed seam, rat collision/fall/lost availability,
earlier defensive access and changed RNG/fumble. These are coherent contract
corrections, not proof of general football/YAC improvement. Contextual native
sources remain historical; raw archive limits and rejected variants stay visible.
#102 is20Hz validity, helpers/active pass legacy; converted solo pass-to-run gets
the cutoff. No capacity/default/force-law experiment is activated.

[Consolidated owner handoff](https://github.com/tannerthardy/football-simulation-/pull/107#issuecomment-6221613220).
Catching reconciles coverage/support/rat; Run and Do-It-All reconcile keeper security,
attainable collection and runner entry; Physics records isolated validity without
solver promotion. Adopt at clean checkpoints; no forced rebases or historical-tape
relabeling. Integration has released its extraction boundary. Delivered95/97/100/102/104 PRs are closed as incorporated by extraction, with
branches/evidence retained. [Exact closure dispositions](../data/reviews/current/coverage-run-integration/dispositions.json). #101 tooling repair stays held;
Measurement/Run review stub controls, not another1848-study campaign. The existing
frozen-panel comparison is the next shared measurement checkpoint; games need a
separate CEO call. Historical4ded6b6/default/remaining research remain unchanged.


</details>

<details>
<summary>Previous accepted #105 /3723204 record — historical</summary>

**`develop@3723204bd0743713bca3e87f10ca01bfebf00a15`** is accepted after routine
[#105](https://github.com/tannerthardy/football-simulation-/pull/105) adoption.
Its entire tree equals publication `aaa7842a4dfe0f8a59d39bcd140388aad4db05e2`;
protected source/tests/settings/tooling equal passing freeze
`75c76583e5cc5a3a4039f0626cd7c7d88df44573`.
[Actual merge and preservation receipt](../data/reviews/current/pr105-merge.json).

Included five routine corrections: **#92** exact-request forecast reuse, **#94**
jointly consistent free-footwork requests, **#96** existing near fit for planned
climbs, **#98** legal initial pressed-DB stance and **#103** outer D objective
identity. Five runtime files/16 protected files. Run independently accepts94,
Do-It-All96; Integration's independent92/98/103 decisions and exact source proof
are published. Shared92/94 selector/cache/projection contracts compose explicitly;
all unshared blobs match author pins. No diagnostic or experimental ancestry.

**1,816 TS/156 files,145 Python,typecheck/build pass**,222.569 command seconds,
Node22.23.3,44flags/components1, no skipped phase/input drift. One exact combined
run; ten targeted spacing-overlap checks cost1.050s, total223.619s. No extra
standalone native case, roster/panel/evaluation games or unchanged rerun to merge.
Source `cda44ed806395aa3dcbeab8f4516da3e302633e3e28408fbf97119ff82ced318`;
validation `b64484633e311f9d5344bddc82cd0892fc99ccde1af27557d976970c5372183c`.
[Final exact receipt, log and reviews](../data/reviews/current/recent-controller-integration/final-receipt.json).

Preserve adverse evidence: A028 runner progress is slower despite fewer teammate
impacts; #96 A030 loses its old TD with changed late-wrap execution; #98 A002
loses Mike load and gives an earlier defensive win; #103 contact is later but
LOS entry slower/unfinished. These are coherent local corrections, not a yardage
target or general rushing/coverage/YAC certificate. Component and94+96 native
evidence remain source-qualified, not relabeled as a new five-fix panel. Failed
collectors/expected-red controls, old raw retention limits and rejected trials stay.

[Consolidated accepted-pin and affected-owner handoff](https://github.com/tannerthardy/football-simulation-/pull/105#issuecomment-6220557501).
Delivered92/94/96/98/103 PRs are closed as incorporated by minimal extraction;
all branches, evidence and ongoing research history are preserved. Authors adopt
relevant accepted changes at clean checkpoints, without forced rebases or another
shared suite. Held items keep their exact pins and named reviews below; a blocked
patch holds itself. **No further user approval is needed for these routine
accepted scopes.** Any102 physical-law/capability choice must still escalate;
prototype99 and experimental Physics/default/historical changes are not authorized.
Historical4ded6b6, GitHub default, physical laws/capacities/settings and old
scientific receipts remain unchanged. No branch deletion or new baseline.


</details>

<details>
<summary>Previous accepted #91 /bb6d4c7 record — historical</summary>

**`develop@bb6d4c73948d53ba841dd9338dd240146c739f8c`** is accepted after routine
[#91](https://github.com/tannerthardy/football-simulation-/pull/91) adoption.
Its entire tree equals publication `4c3ae29252105baaf33ad290948ec58c010d8557`;
protected source/tests/settings/tooling equal passing freeze
`d8a63f3826af9d85b62dc259ac113127bf59df74`.
[Actual merge/preservation receipt](../data/reviews/current/pr91-merge.json).

Included **#87's exact seven-file post-dependency policy**: existing own-objective
metadata and an achievable compound brake/transverse option for man/zone traffic.
Catching approved producer semantics; Run approved the whole movement policy
and its #89 interaction on accepted9adb7b3. All seven blobs match reviewed9760de0.
Accepted #88 blocking, #89 acquired alley-flow line and original cost tests are
byte-identical; the settled-line proof is preserved in its extracted helper.
Original dependencies/observer/research ancestry are not merged. An eighth
protected file is the independently reviewed test-only module-reload adapter:
all physical command fields and the full own goal remain compared; private key
identity is normalized only across the test's separately loaded flag modules.

**1,780 TS/151 files,145 Python,typecheck/build pass**;200.787 command seconds,
Node22.23.3,44 accepted flags/components1, no skipped phases/input drift.
Final reconciled candidate verified once; initial failed200.811s receipt and
one1.533s focused diagnostic remain preserved. Total command cost403.132s.
The validation tree changed after six module-identity failures, with no runtime
source change or football-assertion waiver. No unchanged repeat to publish/merge.
Source `668acb1784799c93d4704aaaa41233a11627ee0a862b41dc279cd11a0a22eeac`;
validation `709b58e8c0938c5075a36f275c6a99dfbea1901f07dafab8cd242a632f6777f8`.
[Complete exact receipt](../data/reviews/current/mesh-policy-integration/final-receipt.json).
Reused39 focused/typecheck plus source-qualified A044/A008 and Run's one A042
interaction pair. No new standalone native case, panel or evaluation game here.

The traffic repair preserves earned separation. Original A044 drop/catch changes
through existing RNG scheduling at identical probability; no postcatch benefit.
A008 identity ends at3.40; current-composition A042 primary bodies/requests/RNG
remain exact only through3.80, with off-ball changes and both arms live/censored.
An obstructed route remains obstructed; improved local clearance is not a
certified clear path. Necessary extra option forecasts have a cost; no universal
coverage/YAC or whole-engine speedup claim. Earlier #88/#89 adverse outcomes,
failed #81 receipt and rejected trials remain visible.

[#91 accepted-pin and affected-owner handoff](https://github.com/tannerthardy/football-simulation-/pull/91#issuecomment-6208289485).
#87's review/verification gate is complete and its delivered PR is closed as
incorporated by minimal extraction, with branch/evidence history retained.
Do-It-All/Catching/Run reconcile relevant movement/support work at clean
checkpoints, without forced rebases or contributor suite repetitions. The next
queue item needs its own independent readiness; this receipt applies to this
exact tree. Measurement/CEO may choose a separately budgeted checkpoint for a
named open football question; no automatic panel or four-game evaluation.
#76, unused transport/navigation, rejected variants and experimental Physics stay
separate. Historical4ded6b6, GitHub default, physical laws/capacities/defaults,
all branches and prior evidence are preserved.

</details>

<details>
<summary>Previous accepted #90 /9adb7b3 record — historical</summary>

**`develop@9adb7b3f730c5637e5a6547f9bc151a17ce301b2`** is accepted after routine
[#90](https://github.com/tannerthardy/football-simulation-/pull/90) adoption.
Its entire tree equals publication `b19f87bad2a1b931f3749278eb4c27c70b9e56f0`;
source/tests/settings/tooling equal tested freeze
`5e32b7afd69bdf72d01df03c19bd221e67d54c45`.
[Actual merge and preservation receipt](../data/reviews/current/pr90-merge.json).

Included independently approved minimal scope: **#88** post-release collection
to existing strike access; **#81 admission + d80dcd3 cost successor** with the
original zero-preview assertion unchanged; **#89** acquired lateral flow for
the installed fixed-depth alley. Three production files, six tests/fixtures;
all nine blobs match the independent reviews. Earlier #84/#82/#78 and accepted
controllers remain. No research/observer ancestry or #87 policy is imported.

**1,772 TS/150 files,145 Python,typecheck/build pass**,195.589 command seconds,
Node22.23.3,44 flags/components1, no skips/input drift. One exact combined run;
focused/native evidence reused. No extra standalone native execution, panel or
evaluation games; no unchanged rerun to publish/merge.
Source `6532e6d26190d7a42b970307c5699e7920dfd5302cd3712a03c707761e2e1259`;
validation `c8fd0f8b1db0efbbb6d3610eaf285644f1523eb510a146ddf40b51593a75e099`.
[Complete verification](../data/reviews/current/collection-cap-integration/final-receipt.json).

Preserve adverse evidence: A018's later C/LG collision, A030's shorter ending,
D05's unisolated execution draws, A006's broken first hold/later FS acquisition,
and unfinished prefixes. Original #81 failed receipt remains failed; the cost
successor repairs its mechanism, without weakening the assertion. Local
controller support does not establish overall coverage, YAC or statistical realism.

**#87 is independently accepted for exact integration verification.** Run
closes the whole movement-policy/#89 interaction gate at reviewed9760de0 on
accepted9adb7b3; Catching's producer approval remains. Only the seven-file
post-dependency patch is assembled; accepted cost proof, #88 and #89 remain.
[Run acceptance](https://github.com/tannerthardy/football-simulation-/pull/87#issuecomment-6208072709).
No repeat of #90 verification; this new policy changes the protected source.
[#90 accepted-pin and affected-owner handoff](https://github.com/tannerthardy/football-simulation-/pull/90#issuecomment-6207095520).
#88/#89 delivered PRs and superseded #81 host are closed with exact successor
records; every branch, original finding and receipt remains available.
#76, unused transport/navigation, rejected variants and experimental Physics stay
separate. Historical4ded6b6, GitHub default and physical capabilities/defaults
unchanged. Existing audit/panel remains source-pinned; no automatic recollection.

</details>

<details>
<summary>Previous accepted #85 /86250bb record — historical</summary>

**`develop@86250bb4f0c6f421878c204161864d523c3e30b6`** is accepted after
routine [#85](https://github.com/tannerthardy/football-simulation-/pull/85) adoption.
Its entire tree equals publication `b313013b6296707ae6780ff8f14485de3b07cd90`.
[Actual merge receipt](../data/reviews/current/pr85-merge.json).

Included **#84 only**: exact independently reviewed joined Duo admission and
combo-transfer controls, two protected files. Do-It-All accepted exact4af71ac;
source equals the reviewed/tested author dcebbee. Existing keeper security,
physical loads/capabilities and all earlier accepted controllers stay preserved.

Exact final freeze `572711032afeec75aaa83bb6edf8f288f2223db3`: **1,760 TS/148
files,145 Python,typecheck/build pass**,192.598s,44flags/components1,Node22.23.3,
no skips/input drift. Source `dcebbee42fbe4cd64f603740d9b20bdf521ae424ad94e084eb46b30478b297e3`;
validation `5b58b54b18873b3b8d40c52c47162c329fda57c6ed10c1299e3283576f2338dd`.
[Final #84-only receipt](../data/reviews/current/duo-motion-integration/final-receipt.json).
No unchanged check was repeated to publish or merge.

**#81 is not adopted.** First combined bbc4f82 failed one existing zero-preview
cost assertion. One three-lane diagnostic preserves commands/contact/budgets but
adds15/0/14 forecasts. Run consults Do-It-All on that contract; no assertion waiver.
#81 was normally reverted before the separate exact #84-only verification.
[Failed receipt/diagnostic](../data/reviews/current/duo-motion-integration/review-receipt.json)
remain failed/source-pinned. Total command cost396.324s includes both different
candidate runs and the single1.451s diagnostic; no new panel or evaluation games.

A030 simultaneous DT/LB load before runner arrival supports the Duo mechanism.
A018 still misses RG/LB; changed C release/draws, longer doubles and broader
front/formation/contact-law limitations remain. Run resumes that bounded A018
question after reconciling this accepted pin; no new full-game evaluation.
#76 parked; lateral/low-speed/observer/transport/navigation/Physics remain separate.
Historical4ded6b6, GitHub default, branches and scientific evidence unchanged.
Measurement's prior7eb2554 panel is complete; it is not a measurement of this pin.

</details>

<details>
<summary>Previous accepted #82 /7eb2554 record — historical</summary>

**`develop@7eb2554f5dbb497cff169f386704a5b0f4cf43fe`** is the accepted shared
tree after routine [#82](https://github.com/tannerthardy/football-simulation-/pull/82)
adoption under standing user authority. Its entire tree equals publication
`a9e33f65248d77bbdd886505e6d94277791bf130`.
[Actual merge/preservation receipt](../data/reviews/current/pr82-merge.json).

Included: minimal #75 technique-until-recognition and #80 acquired insert/alley
support through receiver reassignment; two production files and three tests.
Catching/Run reconciled the old contracts; independent review accepted production,
expiry/contradiction/attainable-flight controls and the exact test-order correction.
Accepted #69/#78, carrier risk, pass cutoff, gap/cadence/recognition/bookkeeping/
catch acquisition and moving-catch behavior remain preserved.

Tested freeze `e788ccc8a78e49281e4dd1a4256da2bc7ce9d143`: **1,753 TS/148 files,
145 Python,typecheck/build pass**,44 flags/components1,Node22.23.3,192.061s,
no skips or input drift. [Final receipt](../data/reviews/current/coverage-contract-integration/final-receipt.json).
Source `78183dc79c6285939b80875b131584c18c4f0eda020c17bcfde6191823ace965`;
validation `819e6ab368739ce79a14e7cbe446d112d6c2831e632dc0f67a73d73f6b3343b0`.
No unchanged verification rerun to publish/merge. New evaluation games/replays:0;
existing game assertions ran only within the preserved suite.

Original #75 failed receipt, P006/Smash/P045 adverse outcomes and #80 unfinished
windows/earlier fall/adverse SS gap remain. Controller correctness does not prove
overall coverage or statistical improvement. At that adoption #76 was frozen and
#81 supplied diagnosis/rejected behavior; its newer ready admission is tracked below; transport/navigation/P045 variants and experimental Physics excluded.
Historical `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`, GitHub default, physical laws,
capabilities and settings unchanged. No branch deletion/history rewrite.

Measurement completed the one frozen48-case comparison against saved8ca8dee;
[report and complete arm transport](https://github.com/tannerthardy/football-simulation-/blob/40af332f3c988b5abe19d9236b49a43bde27200c/docs/reviews/panel-pr82-comparison.md).
No baseline recollection or repeat comparison for this intake. The independent four-game packet requires a CEO call. Contributors
reconcile relevant accepted changes at clean checkpoints, not forced rebases.

</details>

<details>
<summary>Previous accepted #78 /90edc525 record — historical</summary>

**`develop@90edc52530caa71efdebf257f17d954a8a629ea0`** is the accepted shared tree
after routine [#78](https://github.com/tannerthardy/football-simulation-/pull/78)
adoption under the user's standing authority. Its entire tree equals publication
`fed46a18fdf3f197c51ddacf0050d8466b13a1ab` exactly.
[Actual merge/preservation receipt](../data/reviews/current/pr78-merge.json).

Included now: #69's acquired lost-owner first-strike collection and production-hook
information correction, plus the standing workflow in these four existing records.
Only two production files and two tests differ from prior accepted8ca8dee;
accepted #74 opponent risk, #72 pass cutoff, #63/#65 and #12 remain preserved.
Do-It-All independently accepted exact cdd55b9/evidence084122c. #75, carrier
navigation, unused transport and experimental physics remain separate.

Reuse tested freeze `40be568d9fa19c8361384c677e3ab87ba1321255`:
**1,729 TS/146 files,145 Python,typecheck/build pass**,44 flags/components=1,
Node22.23.3, no skipped phases or input drift,191.361 command seconds.
[Final combined receipt](../data/reviews/current/controller-checkpoint-integration/final-receipt.json).
Source/tests/settings/tooling match the tested freeze; no verification was
repeated to publish or merge. Source
`7ea3e00e2504271133a4384fbdbf1931e8ac8bf352861ee9e812f1372a0bf42b`;
validation `b33f8da879717dfcd835c33f7250a6b9aad9d29a8cf0886bdb9ee17f507f1340`.

Controlled collection parks the runner. Native arrival/yardage, fast-motion
clearance and overall football quality remain unproved; adverse/rejected and
three adjudicated #66-host results retain their sources. Historical comparison
stays `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`; GitHub's default, physical
laws/capacities and experimental settings are unchanged. No branch was deleted.

The [historical inventory](../data/reviews/current/integration-queue.json)
retains its dated pins/dependencies; the current record is above. Recheck mutable
refs and PR review state before acting. An unaccepted remote push does not
silently become approval; investigate a disagreement with this ledger.

</details>

<a id="audit-priorities-and-access"></a>
## Current investigations and saved audit access

Accepted development is3723204 after #105; #69 is complete through #78. Do not repeat
completed reviews or unchanged verification. The saved audit is a separate
**8ca8dee** observation, not a measurement of current3723204 behavior.
[Published diagnosis and caveats](https://github.com/tannerthardy/football-simulation-/blob/58303d6e22a42a5dce78b6ad0b967229140a59e1/docs/reviews/accepted-broad-football-diagnosis-2026-10-15.md).

| Investigation | Accountable owner / smallest next question | Saved evidence and controls |
| --- | --- | --- |
| Second-level blocking access | Run Game: #84 Duo admission and #88 strike-access collection are now accepted through #90. Reconcile ongoing access work against9adb7b3 at a clean checkpoint; trace remaining unachieved jobs and late contacts, without discarding useful keeper load. | A018 now earns Mike load in the saved #88 candidate but retains a later C/LG collision; A030 has a shorter ending. Original A018/A030/A027 and A006/A042 remain source-pinned. Nine unachieved jobs in24 old runs are not nine current defects; distinguish access, upstream loss and legitimate defensive wins. |
| Run-support continuity | Catching owns continuity through zone-to-man replacement; consult Run on installed insertion/alley responsibility. Preserve useful acquired support or identify a legitimate cancellation/handoff inside existing architecture. | Eight of eight selected Quarters runs reverse support requests after reassignment; outcome cost is not isolated. Preserve alley leverage, vertical responsibility and legitimate PA uncertainty; no permanent run-belief latch or hidden possession. #75 contracts are reconciled and #75/#80 adopted; remaining support leverage/outcomes need source-pinned evidence, not a latch. |
| Mesh approach coordination | Do-It-All/Catching/Run reconcile adopted #87 at clean checkpoints. Both independent review gates and exact verification are complete through #91. Address a named remaining mechanism using source-qualified evidence; observer and old trials remain separate. | Saved A020/A044, controls A008/A032 and published #87 prefixes are accessible. Reuse them; no recollection or suite while awaiting review. Preserve A044's unchanged catch probability/changed RNG explanation and unvalidated later offensive block. Final intents cannot recover discarded stages. |

Measurement supports saved-data distribution/validation and a named remaining
geometry/timing question. Use stored body velocities, stable identities, actual
cue ages and recorded responsibilities; facing is not gaze, and tick labels are
not exact collision clocks. Evaluate offense and defense independently of gain.
Counts overlap and come from a selected fixed-call panel, not game-wide rates.
Broad RB-jam tuning and P045-only variants remain parked; experimental Physics
keeps its independent correctness/cost/promotion gates and does not block controllers.

The original48-case archive is40,559,081 bytes, SHA-256
`72a62b95145cd64bb3bf06d60a62adbb7735cf872d777ff35faa5883e138e397`.
[Pinned archive inventory](https://github.com/tannerthardy/football-simulation-/blob/58303d6e22a42a5dce78b6ad0b967229140a59e1/data/reviews/current/accepted-broad-audit/archive.json)
preserves the original full-object checksum. Measurement has now published
both full48 arms at the immutable data-only object linked in the current intake;
Integration previously verified immediate subsets without downloading those arms again. **The immediate access blocker is resolved.** Integration fetched
both data-only subsets independently and verified their archive hashes/sizes,
all eight original raw case hashes and original metadata bytes:

- [Flex A008/A020/A032/A044](https://github.com/tannerthardy/football-simulation-/tree/30285db48245e662f9785c331820b7564ea02f9b):2,543,148 bytes,
  SHA256 `6082578ebf476e4975f51585c958eea31894a0cfc2aa03fe1ac271e31804a5cc`.
- [Run A018/A027/A030/A042](https://github.com/tannerthardy/football-simulation-/tree/2c52a3d100978cde17905102e574f7d169b19aa7):1,947,618 bytes,
  SHA256 `9941dd1103186ff98e1d726971650138bbb1aaeb1ff763c1f243835714af2e77`.

[Access record](../data/reviews/current/accepted-broad-audit-access.json) and
[independent byte checks](../data/reviews/current/coverage-contract-integration/witness-access-validation.json)
retain exact URLs, checksums and consumer delivery. Never merge these data-only
roots into simulator history. No recollection, simulation or full-suite run was
needed for distribution. These remain8ca8dee observations, not current-build
results; final intents cannot reconstruct discarded producer stages/every-tick RNG.

<a id="ready-blocked-experimental"></a>
## Current queue checkpoint

| Disposition | Exact scope / owner | Next decision |
| --- | --- | --- |
| Reviewed controller preparation |169@1004b818 +171@6cbdcc4d; portable sourcef3ed945f | Integration final composition/verification once; no repeated contributor review or research-stack import. [Manifest](../data/reviews/current/claude-latest-review-intake.json). |
| Reviewed runoff preparation |172@ae6b1d9; accepted-base solo-runoff hook | Root reviews actual offensive/defensive stepRunRep composition before optional169/171/172 freeze; preserve earlier access/live censors, reuse existing independent review. |
| Separate diagnostic review |170@4a5aadcb; no src/settings delta | Integration tool/test portability/contract decision; preserves recoverable contact versus proximity interpretation. |
| Claude153 newer families |bae3fe80;75 registered research settings,44 accepted | Proposed FORCE_LEAD author extraction→Run review first; other owners follow named existing lanes, holds unchanged. [Requests](reviews/run-game-v3-review-intake.md#latest-claude-preparation). |
| Delivered via168 |131/141/148→149/150/152/155/156/157/159/corrected160/161/167 plus two153 extractions; develop2c98bed9 | All13 source PRs closed as incorporated; branches/evidence retained. [Actual pin/owner handoff](../data/reviews/current/pr168-merge.json). |
| Combined-contract hold |164@5035aad0,165@d922b7c2 | Preserve original assertions and failed traces; resolve useful earned departure / native motion-spacing contracts before a new review. |
| Law/default decision held |162 ordinary yaw/recovery; GAIT_STEP=.3 | Separate physical-law/default review; preserve zone20+28→63/1200 adverse tail. No activation. |
| Other runtime holds |158 duty/PA cost,163 propulsion/caller,166 objective/traffic,137 joint allocation; full153 package | Each holds itself; source-qualified evidence and focused return condition required. No bulk research merge. |
| Tooling repair held |101@ed2fed9e,106@706a10cc | Existing accounting repair/review conditions; no study recollection. |
| Earlier delivered |126/132/133/134/135/136/138/140/143/146/147 via151 atf4146275 | Prior source PRs closed; branches/evidence retained. |
| Experiments held |99/114/115/116/119/127 and earlier solver/default work | Existing separate decisions; no activation or evidence-history merge. |

Earlier delivered checkpoints below are preserved history; accepted pin/current queue above govern new work.


**Current disposition:**117/122,123/124 and118/120/121 adopted as70b4db6 through125.106/101 tooling blocked with author/Measurement tasks,108 documentation review queued,115/116/119/research held. [All tasks, pins and decisions](../data/reviews/current/reviewed-maintenance-integration/agent-tasks.json). Accepted source is70b4db6; all earlier code/evidence history remains.


**Delivered via #112:**110@a32bdfb and final111@411639c, independent review de3de0c; six-file candidate adopted asd682b1f after its exact passing verification. [Current candidate and receipts](../data/reviews/current/run-entry-connection-integration/intake.json). No experimental scope or new evaluation campaign.


### Retained earlier dispositions after merged #107

- **Delivered:**95/97/100/102/104 are adopted atc3264b0; exact reviewed pins,
  approval, dependencies and preservation are in [intake](../data/reviews/current/coverage-run-integration/intake.json).
- **Blocked tooling:**101@ed2fed9 wall-censor/index and exception partial-trace loss;
  Run supplies minimal repair, Measurement reviews stubbed controls. Original
  study and later diagnosis retained; no new study or contributor suite.
- **Separate/held:**99 perimeter prototype; stranded I21/Wide9 mesh diagnosis;
  consent/transport/navigation/lateral trials; experimental Physics. A blocked
  item holds only itself. No next runtime candidate invented to fill a batch.
- **Next shared checkpoint:** Measurement/CEO coordinate the existing frozen48
  comparison within its existing budget/operator contract; no baseline recollection.
  Four-game context remains a separate CEO decision.

## Ready, blocked and experimental

### Completed #105 recent-controller adoption — 2026-10-16

Accepted develop is **3723204bd0743713bca3e87f10ca01bfebf00a15** through #105. Five routine
scopes were assembled and verified once in `codex/recent-controller-integration`.
Only16 source/test/fixture files; no diagnostics or experimental ancestry.

Passing freeze `75c76583e5cc5a3a4039f0626cd7c7d88df44573`: **1,816 TS/156 files,145 Python,
typecheck/build pass**;222.569s,Node22.23.3,44flags/components1, no skips/input
drift. Ten focused overlap checks cost1.050s; total223.619s.
[Final exact receipt](../data/reviews/current/recent-controller-integration/final-receipt.json).
Publication changed only docs/evidence. Fresh preview and actual merge equal
publication; protected files equal passing freeze.
[Actual merged pin](../data/reviews/current/pr105-merge.json).
No extra native panel, roster screen or evaluation games.
[Exact pins, independent decisions and preservation checks](../data/reviews/current/recent-controller-integration/intake.json).

| Item | Scope | Current decision |
| --- | --- | --- |
| #92 | Exact-request forecast reuse | Integration independent ACCEPT; ten composed92/94 checks pass; no policy change. |
| #94 | Free-footwork joint request projection | Run ACCEPT6210001625; loaded/committed scope excluded. RB delay remains. |
| #96 | Existing near fit for planned climbs | Do-It-All ACCEPT6210210423; Under/A030 composition receipt reused, adverse lost TD retained. |
| #98 | Initial pressed DB stance legalization | Integration accepts setup correctness; A002 earlier defensive win retained. |
| #103 | D position matches outer width/velocity identity | Integration accepts acquired-objective correction; slower LOS entry remains. |
| #97 +100 | Overlapping coverage controllers | Adopted via107 atc3264b0; independent ba399712 ACCEPT; adverse cases retained. |
| #104 | Inline zone-technique role gate | Adopted via107 atc3264b0 under explicit user override/approval; contextual evidence retained. |
| #102 | Isolated contact-span lifecycle | Adopted via107 atc3264b0; Physics ACCEPT6220760634 existing-law validity,20Hz limits retained. |
| #101 | Opt-in run/PA tooling and1848-case evidence | Measurement tooling-HOLD6220802845: wall-censor bookkeeping/partial exception traces; Run repairs, no study rerun. |
| #95 | Rat shallow-cut policy | Adopted via107 atc3264b0; independent ba399712 ACCEPT, separate95 reconciliation and Drive fall cost retained. |
| #93 | Coverage approach diagnosis | Evidence only; unchanged runtime. Link findings, no mandatory merge/suite. |
| #99 | Perimeter development concepts | Explicitly held prototype; no automatic calling/production promotion. |

All13 recent PR heads were refreshed. Included92/94/96/98/103 are now adopted
and closed with exact successor records; all branches remain. Readiness labels request review rather
than self-approve. #92/#94 shared spacing code is explicitly reconciled and ten
targeted checks pass. Other included blobs match their published scopes.
Reuse source-qualified component/94+96 native evidence; the entire five-fix tree
has no new native claim. Initial setup and D-objective corrections can change
trajectories; preserved adverse results are not required to revert to old gains.
No new roster/panel/game campaign. Held work holds only itself. Historical4ded6b6,
default, physical laws/capacities/settings and research branches stay unchanged.

Posted independent review requests (no repeat broad evidence collection):

- [Run / independent coverage review: #100](https://github.com/tannerthardy/football-simulation-/pull/100#issuecomment-6220457199).
- [Run / independent inline-zone review: #104](https://github.com/tannerthardy/football-simulation-/pull/104#issuecomment-6220458186).
- [Physics / independent lifecycle review: #102](https://github.com/tannerthardy/football-simulation-/pull/102#issuecomment-6220459277).
- [Measurement / independent tooling and evidence review: #101](https://github.com/tannerthardy/football-simulation-/pull/101#issuecomment-6220460164).
- [Do-It-All / independent rat-policy review: #95](https://github.com/tannerthardy/football-simulation-/pull/95#issuecomment-6220461119).
- [Catching composed97/100 extraction boundary](https://github.com/tannerthardy/football-simulation-/pull/97#issuecomment-6220462094).

[Copyable exact requests](../data/reviews/current/recent-controller-integration/review-requests.json).


### Completed #91 / #87 policy adoption — 2026-10-15

Accepted develop is **bb6d4c73948d53ba841dd9338dd240146c739f8c** through #91.
Run's independent review b1c75b8 accepted the
exact seven-file post-dependency policy on prior accepted9adb7b3; Catching approved
its own objective producers. The portable patch applied directly; all seven blobs
equal reviewed author9760de0. Source668acb1 includes accepted #88/#89/cost.
Integration completed the exact candidate verifications below in `codex/mesh-policy-integration`.

Passing reconciled freeze `d8a63f3826af9d85b62dc259ac113127bf59df74`: **1,780 TS/151 files,145 Python,
typecheck/build pass**;200.787s,44flags/components1,Node22.23.3, no skips/input
drift. Source668acb1, validation709b58e.
[Final exact receipt](../data/reviews/current/mesh-policy-integration/final-receipt.json).
Final candidate has seven reviewed author files plus the independently reviewed
test-only reload adapter. Initial200.811s failure and1.533s focused diagnostic
remain preserved; total integration command cost403.132s.
Publication changed only docs/evidence. Fresh preview and actual merged tree
equal publication; protected files equal the passing freeze.
[Actual merge](../data/reviews/current/pr91-merge.json).
No additional standalone native cases, panel or evaluation games.

**Initial failed verification — preserved:** freezeb3caeb8 completes all phases with six existing
pull-fit whole-command comparison failures:1,774 TS pass/6 fail,145 Python,
typecheck/build pass;200.811s, no skipped phase/input drift.
[Preserved failed receipt](../data/reviews/current/mesh-policy-integration/failed-receipt.json).
First diagnostic confirms the six differences are module-local Symbol identity
across test reloads. The independently accepted test-only helper compares every
physical field and the complete own-objective value, asserting exactly the
expected private key. All12 pull-fit checks pass in1.533s; no runtime change.
[Contract review](../data/reviews/current/mesh-policy-integration/pull-fit-contract-review.json)
and [candidate reconciliation](../data/reviews/current/mesh-policy-integration/candidate-reconciliation.json).
The original failed receipt remains failed. The final candidate added only this
eighth protected file; required phases completed once for its changed validation
tree before adoption. No additional native cases or football-contract waiver.
[Intake, approvals and thirty evidence hash checks](../data/reviews/current/mesh-policy-integration/intake.json).
[Fetchable exact patch](../data/reviews/current/mesh-policy-integration/traffic-controller.patch).

The correction adds an achievable compound brake/transverse option for man/zone
traffic while preserving the actor's current own responsibility, acquired-peer
pictures, existing World movement and contact/load exclusions. No reassignment,
extra sensing, capability or physical-law change. Accepted zero-preview proof
and original cost tests remain unchanged. Necessary extra alternative previews
are a declared cost; no whole-engine speedup claim.

Reuse39 focused/typecheck and original A044/A008 prefixes within source limits.
A044 collision relief changes catch/drop through existing draw scheduling at
identical probability; no postcatch benefit. A008 actual catcher/wrapper remain
exact only through3.40. Independent current-composition A042 retains runner,
alleySS,FS full bodies/requests and rootRNG through3.80, with off-ball changes;
both arms remain live/censored. Obstructed component remains obstructed; local
relief is not certified clearance. No additional replay/panel/game campaign.
Prior adverse #88/#89 outcomes and rejected variants remain visible.

### Completed #90 collection/cap batch — 2026-10-15

Accepted develop is **9adb7b3f730c5637e5a6547f9bc151a17ce301b2** through #90. Nine reviewed
file blobs from three independently approved corrections are incorporated by
minimal extraction. #88 progressed independently; #87 still holds only itself.

**Passing frozen candidate:** `5e32b7afd69bdf72d01df03c19bd221e67d54c45`,
1,772 TS/150 files,145 Python,typecheck/build pass;195.589s,44flags/components1,
Node22.23.3, no skipped phases/input drift. Source6532e6d, validationc8fd0f8.
[Final combined receipt](../data/reviews/current/collection-cap-integration/final-receipt.json).
Publication changed only documentation/evidence. Fresh preview and actual merge
checks confirm the entire tree equals publication and protected files equal
the passing freeze. [Actual merge](../data/reviews/current/pr90-merge.json).
No additional standalone native execution, panel or evaluation games.
[Exact intake, dependencies, byte checks and portable patches](../data/reviews/current/collection-cap-integration/intake.json).

| Item | Included scope / exact pin | Independent acceptance and remaining football limits |
| --- | --- | --- |
| #88 collection | `6573521bc28ea09c2aa6c05770f20b2089cc9fe6`: post-release blocking.ts clearance, direct test/fixture only | [Do-It-All ACCEPT6206668974](https://github.com/tannerthardy/football-simulation-/pull/88#issuecomment-6206668974). Actual A018 Mike load while RT retains DT; release unchanged. Later C/LG collision49.969 remains; A030 shorter ending/D05 changed same attempt/D07 censored. #86 diagnostic is not a dependency. |
| #81 minimal admission + cost | `f04235ed91ad41ca79cbd22cbfccab48477d06db` + `d80dcd3015358e604f91cb026f562f6f4f4781e5`, evidence `c6c8b4823acb27c13769f32305a79d5628cf19b2`; four files | [Run ACCEPT6206768415](https://github.com/tannerthardy/football-simulation-/pull/81#issuecomment-6206768415). Original clear-lane zero-preview assertion unchanged; counts0/0/0, residual/recovery/crossing still forecast. No movement-law or full-engine speedup claim. Old #81 head/failed receipt stay distinct and unchanged. |
| #89 moving alley | `78a00645e4f821d45604a1ed68c35592de1f5926`: one run-fits.ts lateral velocity input + four coverage contracts | [Run ACCEPT6206768642](https://github.com/tannerthardy/football-simulation-/pull/89#issuecomment-6206768642). Existing acquired lateral motion, fixed longitudinal cap. Better A042/A006 entry; A006 hold still breaks and later FS acquisition worsens3.75→3.90. A003 late changes; censored controls remain censored. |
| #87 adopted through #91; completed record above | `9760de031cae3bda7c926735f8edeb97fa4574e5`, executed52518be | Catching approves objective producers; [Run ACCEPT6208072709](https://github.com/tannerthardy/football-simulation-/pull/87#issuecomment-6208072709) closes the remaining policy/interaction gate on9adb7b3. Seven-file successor assembled above; no #87 was included in completed #90. |

Three disjoint production hunks preserve shared physics/capacities/defaults,
keeper security, acquired-picture ownership and installed responsibilities.
Thirty-three published evidence payload hashes and four source digests verified;
23/71/101 focused checks and typecheck receipts reused. #88/#89 and the superseded
#81 host are closed with successor records; original branches/evidence remain. No new native cases,
roster/panel/game collection or contributor suite. [Independent reviews](../data/reviews/current/collection-cap-integration/cost-alley-independent-review.json),
[#88 audit](../data/reviews/current/collection-cap-integration/pr88-independent-review.json).
Rejected common/gather/shoulder/lateral variants, old research ancestry, #76 and
experimental Physics remain separate. Historical4ded6b6/GitHub default unchanged.

### Previous #85 intake — completed historical stage

Accepted develop is **86250bb** through #85 with #84 only. Independent reviews accepted #84 and #81,
but first exact combined freezebbc4f82 fails one existing #81 zero-preview cost
contract:1,761 TS pass/one fail;145 Python/typecheck/build pass,202.275s, all
phases complete/inputs unchanged. [Preserved failure](../data/reviews/current/duo-motion-integration/review-receipt.json).
One targeted diagnostic of its three original lanes preserves commands, actual
contact-free motion and physical budgets; preview calls are15/0/14. The cost
contract is with Run consulting Do-It-All; no assertion has been changed.

**#85 adopted only independently accepted #84 as86250bb.** Its final protected diff is
blocking.ts + combo-transfer.test.ts, exactly the reviewed blobs/source dcebbee.
#81 runtime/test/fixture are removed by a normal revert; original candidate,
failed receipt, diagnostic and portable patch remain fetchable in history.
Exact #84-only freeze5727110 passes all phases: 1,760 TS/148 files, 145 Python, typecheck/build pass; 192.598s.
[Final #84-only receipt](../data/reviews/current/duo-motion-integration/final-receipt.json).
No skips/input drift. Final ref/tree checks passed; #85 is merged as86250bb. Original
failed combined receipt remains failed. No unchanged verification repeat. No new panel/replay/game campaign.
[Intake, reviews and patches](../data/reviews/current/duo-motion-integration/intake.json).

| Item | Exact scope / pins | Independent decision and owner |
| --- | --- | --- |
| #84 accepted via merged #85 | Head `4af71ac8a8f320456e87a027579200469a0c1ee0`, clean code/tests `aebb0abb3a9e96ec6561274b9fdd4e8e76ce7173`, evidence `70ed238a2246cd89d3c4108d647245baf5ff70bb`; joined Duo admission + existing combo-transfer tests only | [Do-It-All ACCEPT](https://github.com/tannerthardy/football-simulation-/pull/84#issuecomment-6204563280): own acquired surface, necessary climb/crossing-fill controls and preserved defensive wins.66 focused/typecheck and published native evidence reused; A018 missed LB, A030 changed C release and execution-draw limits remain. |
| #81 independently accepted; integration HOLD | Minimal `f27456b5f4cd7e5d628417662a77e4ede5b85bfc`, reconciled `edad30904780523896092f592f4c30f1686cc764`, head/evidence `6e19ad2d4aac73e71ae57c1893a9b389074eeaa5`; spacing.ts + residual-motion test/fixture only | [Run ACCEPT](https://github.com/tannerthardy/football-simulation-/pull/81#issuecomment-6204555966): attainable tube/World preview, acquired peer data and shared spacing contracts.13 focused/typecheck reused. A044 collision/drop/result unchanged; A008 exact. No avoidance/mesh benefit claim; observer excluded. New zero-preview cost conflict is held; Run + Do-It-All disposition required. |
| #76 parked/frozen disposition | Unchanged head `4cf253efead2cac450abe0bc74aa5e0db0306126`, code `2e1dfa343a77f142b02a3a23fa49a88c0b40ef13`, base8ca8dee | [Do-It-All confirmation requested](https://github.com/tannerthardy/football-simulation-/pull/76#issuecomment-6204471833): close as preserved parked research, or name a live objective/current-tree next action. No #81/#84 dependency; not adopted or rejected. No new tests for bookkeeping. |
| Separate lateral trial | `codex/mesh-lateral-approach@498b36ea36fc08e6dad5686244e75e6de79c6df8` | HOLD, not a production candidate. A044 impulse falls but collision persists/robber position worsens; A008 exact. Earlier alternatives remain unproved. Low-speed expansion, observer, #76 carrier override and experimental Physics excluded from this batch. |

[Independent #84 receipt](../data/reviews/current/duo-motion-integration/pr84-independent-review.json)
and [independent #81 receipt](../data/reviews/current/duo-motion-integration/pr81-independent-review.json)
retain exact pins, byte checks, football rationale and limitations. No review
ancestry, observer, #76 carrier override, lateral policy or low-speed trial is
included. #84 preserves simultaneously loaded DT/LB work without extra information
or a capability boost; A018 still misses the LB. #81 adds the missing attainable
forecast without repairing current A044's collision. No blanket football benefit
or unchanged per-case randomness claim.

[Consolidated #85 accepted-pin and owner handoff](https://github.com/tannerthardy/football-simulation-/pull/85#issuecomment-6204783778)
is posted. [#84 is closed as incorporated by extraction](https://github.com/tannerthardy/football-simulation-/pull/84#issuecomment-6204784817),
with its branch/evidence preserved. #81 remains open but `integration-ready` is
removed; its original author body is preserved beneath an explicit Integration
HOLD notice. [Current #81 next decision](https://github.com/tannerthardy/football-simulation-/pull/81#issuecomment-6204786315).
No further unchanged verification, panel or games are requested for publication.

**Measurement's requested #82 comparison is complete**, not awaiting collection.
[Immutable report and full-arm distribution](https://github.com/tannerthardy/football-simulation-/blob/40af332f3c988b5abe19d9236b49a43bde27200c/docs/reviews/panel-pr82-comparison.md).
All eight selected FS support witnesses improve continuity/movement, with mixed
football outcomes; A020's new long TD, A042's adverse finish and A044's drop are
preserved. This evidence is8ca8dee→7eb2554, including #69/#75/#80, not a new
#81/#84 result. No automatic second panel, roster sweep or game campaign.
The separate four-game packet still requires a CEO call.

| State | Exact candidate / evidence | Remaining decision, dependency and owner |
| --- | --- | --- |
| **Accepted and merged** | [#63](https://github.com/tannerthardy/football-simulation-/pull/63), develop `8c891f4cf887b54297efbbc4c7993ba5e2f318b5`; publication `0f70bb2a4205497d7df8ed1ed59391d87084c603`, tested `a862a05713d0b8bbd22683ce8a70d5ac16eb18e2` | Explicit user acceptance/merge authority; [controller approval](https://github.com/tannerthardy/football-simulation-/pull/63#issuecomment-6200453995) retained. Actual merged tree equals the verified publication. No further acceptance gate or rerun for this unchanged runtime. |
| **Independent review/extraction** | #13 `d5447c274e63952c023a171b177a1bd79aa72d6b`; #29 `b8e4d86866a9880c59e2e3f0809114b7667c058b` | Run Game/Integration: review the minimal actual controller corrections against accepted develop, preserving source-specific evidence. Neither is accepted merely because #54/#34 included it. |
| **Gap accepted via #63** | `codex/departed-center-gap@132c27a8f1d9ce9a4366b92f0ede0df42a0dac52`; implementation `d63bf4504e1a17e2f6a32738009a532838fc5e20`, evidence `92566b3b650bb2e855487cbf1eae6a2dbf60918b` | Integration verified the three extracted files byte-identical. Nine author focused passes reused; the original `73b9441` / `badddf4` history remains. No earlier zone/Duo dependency. Do not queue the same fix twice. |
| **Minimal extractions accepted via #63** | #57 `1f11e4546bc75ed6c5d139d3ac75fd09d214eb51`; #58 `f597cec3983e73ac5538f1f68a1ef7db4c49fa43`; #60 `987056fe5b6dec61d8377834c5b277600685cbcd`; #61 `351dcff82b96713b5abbc7602d9a051567d1b00a` | Existing riding mesh satisfies #57; exclude its #54 ancestry. #58 and #61 are independent. #60's final-stat and #61's sensing hunks do not overlap. #58's latest update is docs-only. Their bounded extracted scope is now accepted in develop. Original PR/branch stacks remain; this does not merge their complete ancestry. |
| **Blocked coverage** | [#34](https://github.com/tannerthardy/football-simulation-/pull/34) `306579fda9d496d45606445fd542239cf2f5acf4`, tested `cb240d236b3b5bbc13c855dab251fdf986a3ae77` | Pass Game/Pursuit owner: resolve the supported seam-gap expectation (`coverage-panel.test.ts:75`) and native-scramble fixture precondition (`qb-rusher-recording.test.ts:55`). 1,698 pass / two failures; Python skipped. Explanations have not cleared either contract. Do not rerun unchanged source. |
| **Held awareness promotion** | [#36](https://github.com/tannerthardy/football-simulation-/pull/36) `68284671d062dfd4e7e879bcd037bc21dad3e3ac`, engine/test `98411ef025dcaa3d024e430e1215eec81b13af1e` | Run Game + Awareness: review real rear teammate collision and bounded post-mesh coordination; honest information alone does not establish safe action. Experimental #41/#45/#47/#50/#52 dependencies need their own review. Not needed by #63. |
| **Full navigation trial held; prior rejection preserved** | `codex/run-entry-cues`: candidate `7f9d9a4b2e40946129281ae382c8483f717e8c5d`, evidence `4ee0e2cdc8480f271fc3d8e9178f6abd949b3f9e`; clarification `3246009b951b28912599bb6ef93b4141505c0fc8`, handoff tip `f5618d09f8a25e230217a5a0661098d15eeb5e9b` | Do-It-All! owns achievable approach and teammate-picture uncertainty. The original rejected result remains pinned: contact delays 2.55→2.90s but creates a 69.81 kg·yd/s RB/RG impact with .005 yd forecast clearance. Latest author review says collision alone is insufficient for rejection; private-state removal is independently justified, complete navigation improvement still held. No runtime import; no strength/vision/pass-pro/physics change. |
| **Navigation parked; approved information seam preserved** | Original `codex/run-entry-admission@75dbf46b12a4d186a7da6ebc463b9fba228f0b50`; historical-motion evidence `24160e670034bae6d3ac2c6620e81b76ba61d842` | Do-It-All parked tuning per user. Existing-schema unknown/unsupported treatment and observation-only staging are already owner-approved; no acknowledgment wait. Historical motion narrowed uncertainty but supported none of37 tested entries. Preserve original P032/P019 and rejected trials. Separate information-only60223a8 has an independently reviewed risk/transport split below. No navigation, sampledVel or broader perception campaign is queued. |
| **Active pass diagnosis / contract question** | [#64](https://github.com/tannerthardy/football-simulation-/pull/64) `db77674b0e2493017d8778c5cdc5dd1420e68002`, diagnostic `eba1b61756d7a85b3b8c39dc73196244e7eef719` | Run Game/pass-protection owner: P040 forecast improves in one trial but loses P019's useful edge control; both trials rejected. #67 is a separately reviewable free-approach candidate; the loaded foot-objective algebra remains an owner question, not a proven defect. Experimental #57/#54 host is explicit; do not import ancestry. |
| **Current physics candidate held** | [#66](https://github.com/tannerthardy/football-simulation-/pull/66) `29b00905edee16f00651317364b729c1b377eb5b`; Run adjudication evidence `4f90b6428b98224774bbd63a4adad6bb3e354b53` | [Run-owner adjudication](https://github.com/tannerthardy/football-simulation-/pull/63#issuecomment-6200709352) identifies mirrored missed feasible collection and unsupported compulsory-climb expectations; no runtime/assertion was changed. Hold promotion for collection dependency. Integration still owns two center-history compatibility questions after reconciling accepted #63. Preserve seven original failures and yaw force-selection sensitivity/accuracy limits; no new suite/default promotion here. |
| **Accepted and merged #72 / isolated #67** | Develop `4679a3c260188143bcc66f6f20534327c78d7eaa`; reviewed publication `167547807a23052e04af2199104fc16b9850a501`, tested `64177487272b7e0b2d51460e23ccdb6447508e39`; [merge receipt](../data/reviews/current/pr72-merge.json) | Explicit user merge authority exercised after unchanged source/tests/settings, artifact and review checks. Entire merged tree equals reviewed publication. Existing full passing receipt reused; no reruns. Native RT/RG/LT losses, C/LG traffic, forecast/contact limits and prior failures remain. #69, information/navigation and experimental physics are excluded. |
| **Accepted and merged #74** | Develop `8ca8deebe4afa91c3021bdd119bed8976cf00e47`; reviewed `a8dabeca3030a9760aafb21bd4a4af6e9af303e3`, tested `86a8816bb685a521f60400c6a3fe12e12d02e32f`; [merge receipt](../data/reviews/current/pr74-merge.json) | Explicit user authority exercised after source/tests/settings, artifact, review and conflict checks. Entire merged tree equals reviewed publication. Reused1,726 TS/145 Python/typecheck/build pass; no reruns. Only opponent-risk calculation changes; transport/navigation/#69/physics excluded. Preserve adverse collision and broader legacy carrier-information limits. No additional merge authority follows. |
| **#75 accepted via merged #82** | Reconciled head `43ac5e1835467cbc0914df0df1c82ea74740d1b4` (production unchanged fromec4a3a1); [owner disposition](https://github.com/tannerthardy/football-simulation-/blob/ec4a3a18785513d8016047a9a416c42ca9b2faa4/docs/reviews/man-recognition-back-man-disposition.md) | Catching + Run resolve the old hidden-flight assertion conflict: acquired insertion/alley and installed man technique continue until recognition; recognized ball priority remains. Exact three-file extraction independently accepted. Reuse44 initial focused checks plus38 strengthened back-man controls; preserve failed0f349ef and P006/Smash/P045 adverse evidence. |
| **#80 accepted via merged #82** | Head `0fce2a085ea9f28cbaac65a388b7d3220c36e6d8` (production unchanged from25a73a3), code `5e18fac098b067441e823205d0628a673e9c35c7`; [evidence](https://github.com/tannerthardy/football-simulation-/blob/25a73a3fdf5046c8ed682001458d5fda46bb3c59/docs/reviews/coverage-run-support-continuity.md) | Exact wrapper/test extraction requires current run belief and acquired positive backfield RB/FB picture; no latch. Independent review accepts composition with #75. Reuse53 initial focused checks/typecheck plus11 strengthened wrapper controls and unfinished native controls; preserve adverse SS gap and prior fall. No final-gain or coverage-quality claim. |
| **#76 parked/frozen, not rejected or adopted** | `codex/rb-local-traffic@4cf253efead2cac450abe0bc74aa5e0db0306126`, code `2e1dfa343a77f142b02a3a23fa49a88c0b40ef13`, based on8ca8dee | Flex explicitly freezes broad carrier-jam work in #81 handoff. Focused evidence is preserved, but there is no current independent adoption approval. Resume only for a named carrier-preview priority and portable review on accepted develop; no dependency on #75/#80. Keep PR/branch/evidence. |
| **Historical #81 diagnosis; current admission review above** | `codex/mesh-command-attribution@cb3823ee749a50ab51e4024b3cdc0dd4ce45341c` | Flex's passive observer attributes A020/A044 stages; tested bend is rejected (A020 gap4.608→4.843, A044 impact173.922→191.556). Preserve A008/A032 controls and later Z block. Next is approach/continuation diagnosis, not promotion; observer/tooling also excluded from this batch. |
| **Observation transport approved; integration deferred** | Original60223a8/80c9fa4; unchanged owner core6828467; [separate portable core/PlaySim/test patch](https://github.com/tannerthardy/football-simulation-/blob/cfcbf6b60325ff3fe4dd722f9310d135fae49576/data/reviews/current/run-entry-information-review/observation-transport-only.patch) | Independent of opponent risk. No production query consumer exists; avoid adding per-tick sensing solely for this fix. Original four focused/typecheck receipts and owner approval6201016808 reused. No correctness rejection or new approval wait. Integrate with a reviewed consumer when needed; clocks, stale unknown semantics, catch readiness and spacing contracts remain. |
| **#69 accepted via merged #78** | Develop `90edc52530caa71efdebf257f17d954a8a629ea0`; publication `fed46a18fdf3f197c51ddacf0050d8466b13a1ab`, tested `40be568d9fa19c8361384c677e3ab87ba1321255`; [merge receipt](../data/reviews/current/pr78-merge.json) | [Do-It-All re-review](https://github.com/tannerthardy/football-simulation-/pull/69#issuecomment-6202748101) accepts cdd55b9/evidence084122c. All four phases pass; actual merged tree equals verified publication, with no rerun. Original branch/evidence preserved. Runner-arrival/clearance/global-information limits stay open; #75/navigation/transport/physics excluded. |
| **Owner disposition requested; remain open** | #4, #41, #51, #55, #56 | Handover owner, Awareness and Primary Physics must clarify live objective versus parked research. Requests are linked in the cleanup receipt. No need to finish experiments or run tests to answer. Legacy #1/#2 stay open for their separate owner/reference decisions. |
| **Closed research / preserved experimental branches** | [#54](https://github.com/tannerthardy/football-simulation-/pull/54) `4ae667e29b3ce085f43c5cb911b294349cda2b8f`; earlier zone/Duo `6122fb03c7104c0f9d762591d737cf2cf6a49067`; [#62](https://github.com/tannerthardy/football-simulation-/pull/62) `1f071b9568f3fcc790aff71ddf5ea032cca5cf16` | PR #54/#62 are closed as completed/parked records; every branch/film/receipt remains. #62's historical patch host is parked; primary Physics owns any independently reviewable current-develop contact-law extraction. No hands/grip/helper/turn package or experimental setting is enabled by this queue. |


Latest decision: independently accept only the five-file #75/#80 extraction
on accepted90edc525. Exact freezee788ccc completed all four phases once: 1,753 TS/148 files, 145 Python, typecheck/build pass; 192.061s. Neither depends on
#76, #81 or experimental Physics. Final ref/tree checks passed; routine #82 is merged as7eb2554, with its entire
tree equal to publicationa9e33f6 and protected tree equal to the passing freeze. No contributor suite or native replay
repeat is requested. [Independent review](../data/reviews/current/coverage-contract-integration/independent-review.json)
and [extraction/evidence checks](../data/reviews/current/coverage-contract-integration/extraction-review.json).
[Final combined receipt](../data/reviews/current/coverage-contract-integration/final-receipt.json)
records exact source/tests/settings, outcomes, cost and adverse evidence. No
new replay, panel or evaluation games; preserved game assertions ran in the suite.
The large four-game input JSON is unchanged from the previously published queue
packet, not a new collection or execution.

Delivered contributor PRs #75/#80 are closed as incorporated by minimal extraction,
with every branch/research/evidence history retained; their full ancestry was not
merged. [#75 disposition](https://github.com/tannerthardy/football-simulation-/pull/75#issuecomment-6203899518),
[#80 disposition](https://github.com/tannerthardy/football-simulation-/pull/80#issuecomment-6203900417).
[Consolidated accepted-pin/owner handoff](https://github.com/tannerthardy/football-simulation-/pull/82#issuecomment-6203895704)
and [Measurement follow-up](https://github.com/tannerthardy/football-simulation-/pull/78#issuecomment-6203903194)
are posted. Measurement subsequently completed/published the comparison at40af332;
Integration did not duplicate the panel. This aggregate8ca8dee→7eb2554 comparison includes #69+#75+#80,
so its outcome cannot isolate any one repair. No other code review or evaluation
is required merely to distribute this handoff.

<a id="man-recognition-review"></a>
### #75 — technique continuity and acquired back-man ownership

Review-support heads43ac5e1/0fce2a0 strengthen expiry, contradictory-belief and
attainable recognized-ball priority controls without changing production. Their
38 back-man/11 wrapper checks are reused; include these exact tests in the one
combined run. Independent delta review requires the wrapper tag assertion before
its expected-controller call; Integration applies that test-order correction,
without another scenario or production change. No native recollection or extra suite.

**Reconciled on accepted90edc525:** Catching's ec4a3a1 contracts, agreed with Run,
replace hidden-flight cancellation with mirrored held/unrecognized equivalence
and explicit recognized-ball priority, retaining other acquired/negative/PA/FB
controls. Independent review accepts the three-file extraction and #80's separate
two-file continuity correction together. One new combined verification is
justified by this material contract reconciliation and composition, not a rerun
of the unchanged failed candidate. Preserve its failed receipt below unchanged.

The following is the **historical first-attempt result**:

One question: should an unrecognized throw preserve the installed man action,
including an acquired keyed insertion/alley fit, until existing throw recognition?
The narrow receiver-technique information repair is supported. Its actual author
base is4679a3c; Integration extracted only the exact defense hunk and eight direct
tests onto accepted8ca8dee, retaining #74 and excluding author diagnostic ancestry.
Tested freeze `0f349ef0735402a79d916cff7c9ad496f9424380`, source
`c804b77057c4600cdf5b14b23f798715566c0e162d6e62bdf49764b93d61c742`.
[Fetchable candidate](https://github.com/tannerthardy/football-simulation-/tree/codex/man-recognition-integration-review),
[portable two-file extraction](https://github.com/tannerthardy/football-simulation-/blob/149741c3b1a35f5ff966d5d453e45d3d3f36142f/data/reviews/current/man-recognition-integration/portable-extraction.patch),
[complete review/receipt](https://github.com/tannerthardy/football-simulation-/blob/149741c3b1a35f5ff966d5d453e45d3d3f36142f/data/reviews/current/man-recognition-integration/review-receipt.json).

All four combined phases ran once: typecheck/build and145 Python pass;
1,732/1,734 TS pass across146 files. The eight new direct recognition contracts
pass. Two assertions in `back-man-run-fit.test.ts` (lines255/390) expect generic
ball-in-flight tracking before recognition despite a retained positive runner
picture. The candidate instead continues acquired insertion/alley support.
Neither assertion was edited or discarded. Cost188.094 command seconds;
zero additional native replays, roster screens or game campaigns. No passing
combined receipt or current merge recommendation exists for #75.

Current accepted develop is now90edc525 after independent #69 adoption. Its
`defense.ts` is unchanged from8ca8dee; the failed #75 receipt still belongs to its
exact original source, not a newly executed90edc525 candidate.

**Next action — Catching, consulting Run:** publish acceptance/hold and the justified contract for that exact boundary.
If confirmed, preserve held/unrecognized invariance and explicit recognized-ball
priority in the reconciled tests; do not simply remove the failing expectations.
If an observable cue should cancel the run fit earlier, name it and the smallest
required correction. Integration owns any subsequent exact verification after
that material correction; contributors should not repeat the shared suite.
Do not retry unchanged source or launch a new coverage campaign to answer this.

[Original evidence and broader findings](https://github.com/tannerthardy/football-simulation-/blob/1f2d949409aad9615da2b52df8fddd174e04b2aa/docs/reviews/coverage-technique-recognition.md)
retain their exact sources. P006 contact3.35→3.55s and Smash4.406→5.652YAC with
an FS finish are explained adverse acquisition changes on the earlier source;
P045's no-contact TD persists. The current author47 vertical/trail pair retains
its tackle; comeback is an identical sack, not native plant-transfer evidence.
These are not newly replayed8ca outcomes or population coverage approval.
Catching retains broader diagnosis; parked P045 variants, target/cushion tuning,
upstream judgment, helpers and experimental physics stay separate. No merge,
baseline/default or branch changes are authorized by this review. Standing routine
merge authority does not clear these unresolved contract failures.

<a id="frozen-panel-comparison"></a>
### One frozen-panel comparison after a meaningful accepted controller batch

Carry forward the existing #107 shared checkpoint after #112/d682b1f. If not yet frozen, Measurement/CEO coordinate the new coherent accepted pin with the same frozen48 panel, established compatible operator and existing budget below. If already frozen/completed, retain its actual source and results; no second panel or restart merely for this merge. No baseline recollection or automatic games. #82 results remain historical evidence.

Use the existing48-case panel once at a meaningful accepted controller checkpoint,
after a meaningful independently reviewed controller batch. #82 is now that
accepted checkpoint:7eb2554/source78183dc, unchanged44flags/components1.
Measurement completed/published the comparison at40af332; no duplicate
collection or automatic second panel for the new intake.
This is not a per-patch requirement or a new trigger on every documentation update. Integration coordinates one
comparison with Measurement; contributors supply focused evidence and do not
duplicate the panel or combined suite.

Reuse the saved8ca8dee baseline, exact four lineup fixtures/twelve calls/seeds and
frozen rubric. [Manifest](https://github.com/tannerthardy/football-simulation-/blob/58303d6e22a42a5dce78b6ad0b967229140a59e1/config/accepted-broad-audit.json),
manifest content digest `fbb8ee4147163842758ee308a2d8f4e836d70602358ed777b10a1531a8b4fa53`.
Freeze the accepted candidate source/settings and the compatible measurement
version before execution; new source intentionally differs from baseline, while
input/operator/settings compatibility must be explicit. If reporting changes,
reprocess compatible saved baseline data offline; missing request stages remain
unmeasured rather than silently reconstructed. No baseline recollection merely
to share or compare evidence. Retain the existing ceiling48 candidate snaps,
90s collection batch/five seconds per case, partial failures and unrun tail;
additional spend needs a specific new decision. No outcome-selected replacements.

Judge achieved access/support/approach and useful offense/defense separately from
gain. Preserve adverse cases and eligible denominators; these selected exposures
are not game-caller prevalence or NFL rates. No experiment/default promotion,
new roster sweep or Physics wait is implied.

<a id="accepted-controller-game-checkpoint"></a>
### Separate four-game packet — available only for a CEO-called game-context evaluation

Keep the [prepared four-game plan](../data/reviews/current/accepted-controller-game-checkpoint.json)
and [frozen inputs](../data/reviews/current/accepted-controller-game-inputs.json)
available. **A CEO call for game context is the trigger**, not an accepted patch,
the panel comparison or the packet's earlier proposed next action. No evaluation
games have run. The previous handoff/JSON retain their dated planning record;
this current instruction governs whether a run is started.

The prepared90edc525 packet retains the same424 players/seeds701–704, one accepted
arm only, maximum four games/240 launcher seconds/60s per game. At a later CEO
call, pin the intended accepted source/settings and compatible collector anew;
do not label this older packet's source as the then-current engine or repeat an
unchanged code suite just to publish measurement. Measurement claims one collector
and publishes complete outcomes, film, costs, failures and unrun inputs. No
automatic second arm, new roster matrix, retry or extra seeds. Calling, fatigue,
substitutions and accumulated context are the reason to spend on games.

[Earlier accepted-controller handoff](https://github.com/tannerthardy/football-simulation-/pull/78#issuecomment-6203105618)
and its receipts remain preserved; its general next-game wording is superseded
by the separate panel/CEO-called triggers here. Neither evaluation is routine
per-patch verification, and historical experimental film retains its own source.

<a id="run-entry-information-review"></a>
### Information-only acceptance decision

User authorized and completed **separate risk-only adoption** through #74.
Actual8ca8dee equals the verified publication. Transport remains separate.
The risk path uses existing `see`, recovery and reach machinery; teammate transport
neither supplies nor changes that path. Its core/PlaySim query is owner-approved,
but no controller consumes it yet. Keep the transport patch fetchable for its first
reviewed consumer instead of running unused sensing on every tick.

The [exact independent review](https://github.com/tannerthardy/football-simulation-/blob/cfcbf6b60325ff3fe4dd722f9310d135fae49576/data/reviews/current/run-entry-information-review/review.json) verifies all original evidence hashes,
owner-core identity and original source/validation fingerprints. Both patches
apply independently and sequentially to accepted4679a3c in temporary indexes.
The risk-only source is byte-identical to the author's carrier file, with two
existing fixture controls split out unchanged and one existing Duo declaration
control. Three selected checks/typecheck pass at71d98fc; no World steps, games
or shared suite. Total new launcher23.675s includes the retained initial missing
`it` import failure; final passing checks11.421s. No production/expectation change
was made to fix that packaging error. Original adverse69.81kg·yd/s collision
remains source-specific; this is no new football-gain or global-information claim.

**Final verification:** `86a8816bb685a521f60400c6a3fe12e12d02e32f` passes
1,726 TS/145 files,145 Python,typecheck/build in188.504s, with all44 accepted
flags/components=1, unchanged World defaults and no skipped phases or input drift.
[Final receipt](https://github.com/tannerthardy/football-simulation-/blob/a8dabeca3030a9760aafb21bd4a4af6e9af303e3/data/reviews/current/run-entry-information-review/final-receipt.json)
and [complete log](https://github.com/tannerthardy/football-simulation-/blob/a8dabeca3030a9760aafb21bd4a4af6e9af303e3/data/reviews/current/run-entry-information-review/final-combined.log).
The source/tests/settings are identical to the focused71d98fc pass; its two
initial packaging failures and all prior evidence remain. No extra replays,
game campaign or roster screen was added; existing suite game assertions ran.

**Adoption complete:** the explicit user merge approval adopted this exact
candidate through #74 as8ca8dee. [Actual merge receipt](../data/reviews/current/pr74-merge.json).
No unchanged verification rerun was needed. Original collision, uncertainty and
legacy carrier-information limitations remain. The approved transport patch stays
available for a reviewed consumer; navigation,#69 and physics are not imported.

### Relevant owner updates after #74

- Do-It-All / carrier: preserve the accepted opponent-risk hunk; earlier native
  trials remain source-specific. RB navigation stays parked and broader legacy
  carrier-information callers remain a separate issue.
- Do-It-All / #69 review: continue independently on the new accepted pin at a
  clean checkpoint. Preserve accepted carrier risk and #72 PassProtector contracts
  when composing; no forced rebase or repeated shared suite.
- Awareness: observation transport is approved but unconsumed and deferred. No
  schema/sensing/default change or new acknowledgment wait follows this merge.
- Run Game / Physics: physics laws/capacities remain unchanged. Keep source-pinned
  focused evidence and reconcile relevant interactions only; no experimental
  contact-mechanics promotion or extra campaign is implied.

### Relevant owner updates after #72

- Run Game: preserve the accepted free-cutoff action in forecast/loaded-policy
  follow-up; native protection tradeoffs and original-source film remain valid.
- Do-It-All / #69 reviewer: collection is separate, but its shared-file extraction
  must retain the accepted PassProtector hunk. Reconcile at a clean checkpoint;
  no forced rebase, branch move or unchanged-suite rerun.
- Awareness / entry: check the minimal carrier/PlaySim extraction on4679a3c;
  it does not depend on pass cutoff, and navigation remains parked.
- Physics: retain the separate contact-law/dependency review and known center-hand
  limitations. This controller acceptance does not clear #66 or other experiments.

#63's [shared receipt](https://github.com/tannerthardy/football-simulation-/blob/0f70bb2a4205497d7df8ed1ed59391d87084c603/data/reviews/current/departed-center-integration/receipt.json)
records **1,720 TS / 145 Python checks, typecheck/build pass**, source
`2402d98170109b92a3a862609e6fc2fadd5114d56524a332c024e77b898df9ad`,
validation `bd503123ac660bf6e07e061dd5d74e832309390187aa822b5d6289cb1dfbc495`.
Final pass 200.945s; all recorded validation commands 427.975s, including failed
freezes and diagnostics. No extra game/roster campaign; preserved suite game
assertions did execute. The P069 source-specific golden and zone-key failure
remain visible. [Contract review, adverse results, limits and portable patches](https://github.com/tannerthardy/football-simulation-/blob/0f70bb2a4205497d7df8ed1ed59391d87084c603/docs/INTEGRATION.md#current-candidate-2026-10-15).

The entry trial is not the earlier portable gap correction. Its original
[rejected evidence](https://github.com/tannerthardy/football-simulation-/blob/4ee0e2cdc8480f271fc3d8e9178f6abd949b3f9e/docs/reviews/run-entry-cues/README.md)
reports 43 compatible focused passes and 8.04s native continuation, 25 prefix
scrimmages, zero completed games. These costs/results are reused, not rerun.
The [latest clarification](https://github.com/tannerthardy/football-simulation-/blob/3246009b951b28912599bb6ef93b4141505c0fc8/docs/reviews/run-entry-cues/README.md)
changes no runtime: removing hidden engagement/fatigue/down shortcuts has an
independent information contract. It does not establish attainable safe entry.
The original full trial stays out of this pass; an information-only promotion
needs its own explicit scope/review. Do not use a collision or yardage alone
as an automatic regression verdict, or combine the clarification with gap approval.
The newer [entry-admission report](https://github.com/tannerthardy/football-simulation-/blob/75dbf46b12a4d186a7da6ebc463b9fba228f0b50/docs/reviews/run-entry-admission/README.md)
keeps its information extraction separate. It admits achievable moving approaches
before ranking destinations, with 0.15s gather/no teammate impact through3s on
P032 and the complete P019 opposing result retained. Its native outcomes are
measured on recorded host `f62511a`, not accepted develop; P032 is censored, not
a new completed-run improvement. Source calls confirm the owned-information
interface is a real dependency. No new native run or shared suite is justified
while that host/review decision remains unresolved.

<a id="pr-dispositions"></a>
## Bounded PR cleanup — 2026-10-15

**43 PRs closed; 65 initially open → 23 open after new #67 arrived.**
The pass classified all 66 initial PRs and recorded #67 separately. This is a
bookkeeping decision, not simulation-code or scientific revalidation.
**All 106 starting branches remain; a worker added one, yielding 107.**
Develop, historical comparison, default branch, genuine stack bases, source,
tests, settings, dependency files and existing receipts are unchanged. No
merge, branch deletion, force-push, history rewrite or cleanup of local outputs.

| Closed disposition | PRs | Preservation / successor |
| --- | --- | --- |
| Incorporated / adoption complete | #6, #8, #9, #10 | #6 ancestry and exact #8/develop identity verified; #9/#10 component files match accepted #12. Excluded handover ancestry is not claimed included. |
| Superseded review/documentation vehicles | #17, #24, #37, #49 | #66, #29 and current #65/#63 are explicit successors, not blanket production acceptance. Existing master issue content is retained here in ISSUES. |
| Completed diagnostic/reference/audit | #5, #11, #14, #18, #22, #23, #26, #30, #35, #39, #42, #44, #54, #59 | Immutable reports, shared references, film, adverse results and next-owner questions remain linked. Branches remain available to active children. |
| Completed numerical milestones / rejected strategies | #3, #7, #15, #16, #19, #20, #21, #25, #31, #33, #38, #40, #43, #46, #48 | Each named successor retains the next bounded objective. Original cost/accuracy/fallback failures are not relabeled passing. |
| Parked/rejected controller research | #27, #28, #32, #45, #53, #62 | Preserve original trials; return only for the recorded decision-changing mechanism/host. No implicit promotion from a closed PR. |

[Exact disposition/evidence/successor and preservation receipt](../data/reviews/current/pr-queue-cleanup.json)
records every PR head/base/branch, all 43 durable closure comments, source
incorporation checks, unchanged child bases and owner requests. Closing a PR
retains its branch and committed files; reopen the same PR if its objective
becomes active again. Do not create another PR for another run/receipt of the
same candidate. A genuinely independent review/integration boundary can have
its own PR (#67's runtime correction versus #64's diagnosis, for example).

Subsequent integration event: #63 is now accepted and merged under explicit
user authority; the cleanup counts above remain their dated snapshot. This is
not a new PR-closure batch. #66/#67 and awareness/coverage blockers stay independent.
No new simulation or full-suite run was performed for cleanup or the unchanged merge.

<a id="agent-workflow"></a>
## Agent workflow: stay current without stopping useful work

1. **Start:** read [AGENTS](../AGENTS.md), [CLAUDE](../CLAUDE.md) and the top of
   this ledger. Fetch `origin develop`, compare its full SHA with the accepted
   pin above, record HEAD and a clean/dirty worktree status. In a new task use
   an isolated branch/worktree from the accepted commit; do not start from
   GitHub's old default, historical comparison or an arbitrary experiment.
2. **Claim a narrow boundary:** name the owner, files/functions and question
   in [WORKBOARD](WORKBOARD.md). Another PR is a dependency only when its code
   or contract is required. Shared-file edits can be independent; coordinate
   overlapping functions and behavior assumptions, not whole subsystems.
3. **Keep ongoing work:** commit/push coherent checkpoints on the owner's
   branch. At task start, before extending the affected mechanism and before
   handing it off, check accepted changes since the recorded base. Reconcile
   at a clean checkpoint when they affect the task; no universal rebase after
   every merge. A deliberately old research host is valid when named as such;
   its results do not certify current develop. Preserve its original evidence.
4. **Update safely:** the branch owner can normally merge accepted develop
   into their own clean feature branch; preserve genuine dependency stacks.
   Never reset/clean another checkout, force-push, rewrite published history
   or switch another worker's branch. If the experiment must stay immutable,
   prepare a new extraction branch and leave the original intact. Do not
   merge an entire experimental stack just to get one useful correction.
5. **Hand off something fetchable:** supply PR/branch, full base/code/evidence
   pins, minimal patch/dependencies, enabled settings, focused reproducer and
   opposing control, failures/adverse evidence, runtime and next decision.
   Include source, input and measurement hashes in the existing receipt.
   A different environment's local path alone is not a handoff. No full-suite
   repeat by contributors. See [TESTING_COSTS](TESTING_COSTS.md).

A cheap comparison in the owner's checkout, before deciding to reconcile:

```sh
git fetch origin develop
git status --short
git rev-parse HEAD origin/develop
git log --oneline HEAD..origin/develop -- src
```

Compare the fetched pin with this ledger before adopting it. A branch with
zero accepted commits missing can still have experimental ancestry; inspect
its diff/dependencies. Do not convert every "behind" count into a new test job.

<a id="queue-operation"></a>
## Integration's loop and publication

- Read new/changed handoffs and reviews; pin the actual heads, base and flag
  intent. Update an existing row, not a second competing queue. Classify ready,
  review-pending, blocked with a named owner, rejected or experimental.
- Continue the same PR for the same candidate/objective; a new run or receipt
  updates that PR. Create another only for an independently reviewable change
  or a genuinely different integration boundary. Completed/superseded research
  PRs can close with immutable findings/evidence and a successor while their
  branches stay available to active children.
- Prepare the smallest useful coherent candidate from accepted develop;
  batch compatible reviewed work at natural checkpoints and separate genuine
  unblockers. Do not wait for every owner or a fixed batch size. A blocked item
  holds itself. Poll readiness at resumed work/checkpoints; no background monitor.
- Resolve mechanical conflicts by preserving both intended contracts. When
  behavior, ownership or a test expectation is ambiguous, involve the affected
  owner and preserve both witnesses; do not choose whichever branch is newer.
- Reuse receipts only for compatible source/tests/inputs/measurement/settings.
  Run one exact combined verification when runtime is ready, not one per
  contributor. Fail-fast evidence and skipped phases remain visible. A
  material adverse result gets one targeted diagnostic before a bigger batch.
  Docs/ref/queue changes use Git and link checks; no new games or code suite.
- After independent acceptance and required verification, use the standing
  authority above for routine corrections only. Recheck heads/merge tree, publish
  the actual accepted develop pin, included fixes, receipt, held items/football
  risks and affected-owner updates. Escalate the explicitly excluded decisions.

After accepted #63, use the merged develop pin above. The following active
investigations should reconcile affected contracts at clean checkpoints: gap/lane work must account for stable C-gap
identity; exchange work must include the installed departure window; recognition
and containment work must use acquired blocking cues; catch work must distinguish
incidental acquisition from targeted tracking; analysis adapters must retain
intended versus achieved air depth and actual snap possession. Saved historical
film/results stay pinned; do not rewrite them or rerun every investigation.
No owner is ordered to rebase, migrate all research or repeat the shared suite.

<a id="current-candidate-2026-10-15"></a>
### Included fixes and affected investigations

| Accepted scope | Reconcile when extending affected work |
| --- | --- |
| Stable departing-center gap identity | Do-It-All!: run-lanes, independent gap branch, run-entry admission and its review-only Awareness extraction. Do not queue the gap fix again. |
| Installed riding-mesh departure cadence | Run Game: #57 exchange and #64/#67 saved-input/pass-protection work. Preserve original experimental-film hosts; assess the accepted condition before claiming current-develop outcomes. |
| Acquired blocking recognition and approved zone-key contract | Catching/Pursuit: #58, P045 technique/containment and #34 coverage. Upright waiting is unsure; acquired release/low-pad/own-contact controls remain. #34's two coverage contracts remain blocked independently. |
| Actual possession, holding spot, intended/achieved catch depth | Recording/analysis owners: #60 and downstream adapters. P022's coarse accept/decline policy and historical recordings stay separate. |
| Acquired-flight gating for incidental offensive catches | Catching + Awareness: #61 and #36's proposed PlaySim lifecycle extraction must preserve the incidental-readiness hook/import. Targeted TrackBall and attention/occlusion limitations remain. |
| Unchanged existing contact physics | Physics: #66 is separate; reconcile its two center-history compatibility checks against this accepted controller tree before a future promotion candidate. Run's collection dependency and yaw limits remain. |

The owner-directed publication is on [merged #63](https://github.com/tannerthardy/football-simulation-/pull/63#issuecomment-6200751483).
#65 reconciles the tracking/ownership/navigation records by merging accepted
develop into its own branch and retaining both histories. Its diff against
accepted develop contains documentation and new bookkeeping evidence only.
This reconciliation does not authorize another merge, default switch, historical
baseline change, branch retirement or experimental promotion.

<details>
<summary>Pre-merge #63 verification ledger and prior history — preserved</summary>

The following is the published preparation record. Its pending decisions and
accepted pin are historical; use the accepted-development section above.

# Integration ledger

<a id="pre-merge-candidate-2026-10-15"></a>
## Current candidate — 2026-10-15

**Accepted develop remains `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`.**
Integration owns `codex/departed-center-integration` directly from that commit.
The five contributions below are verified together in [draft PR #63](https://github.com/tannerthardy/football-simulation-/pull/63),
with required review still pending. Experimental stacks were not merged. [Current priorities](STATUS.md),
[issue decisions](ISSUES.md), [ownership](WORKBOARD.md).

**Passing exact candidate:** `a862a05713d0b8bbd22683ce8a70d5ac16eb18e2`.
**1,720 TypeScript checks / 143 files, 145 Python checks, typecheck and build pass**;
all four phases complete, no skips/worker errors/input drift. Final wall
**200.945 s**, source `2402d98170109b92a3a862609e6fc2fadd5114d56524a332c024e77b898df9ad`,
validation `bd503123ac660bf6e07e061dd5d74e832309390187aa822b5d6289cb1dfbc495`.
[Exact launcher](../data/reviews/current/departed-center-integration/combined-final.json) ·
[Shared review/receipt](../data/reviews/current/departed-center-integration/receipt.json) ·
[Five independently applicable patches](../data/reviews/current/departed-center-integration/patches).
The patches together reproduce the exact tested source/tests/scripts. Publication
adds docs/evidence only; a later doc-only #58 head does not invalidate this pass.

| Contribution / exact publication | Independent readiness and smallest portable extraction | Real dependency / excluded ancestry |
| --- | --- | --- |
| Gap `73b94412d1bb9cf6b0e4beb6e59c7aec466e5eee`, evidence `badddf495fa9ff7cfa6579709dec853dc449974e` | Accepted for the candidate: 3-line C-vacancy exclusion, saved-cue test and 96KB fixture. 28 artifacts/6 tools and all source-arm hashes verified; first changed request RB at2.20 with identical preceding bodies/joints and retained DT tackle. | Actual implementation parent `2df3edb`, earlier runtime parent `6122fb0`; same original mapper bytes on accepted develop. Earlier zone/Duo/clearance/detour code is **not** required and is excluded. Coupled controls apply to the author's branch, not this combined tree. |
| [#57](https://github.com/tannerthardy/football-simulation-/pull/57) `1f11e4546bc75ed6c5d139d3ac75fd09d214eb51`, tested `21d7763` | Minimal `RunnerToMesh` departure-window condition plus portable saved-input helper/fixture/tests. Riding mesh and installed time already exist on develop. P038 reaches a real handoff in the combined-source preflight. | PR is stacked on #54's evidence branch; **do not merge its ancestry**. Rejected late-QB chase and all other run/awareness code are excluded. Old experimental P069 film hashes are historical; a same-current-source cadence rollback pair preserves positions/events/stats exactly. Keeper tripwire is installed without requiring the parent's awareness API. |
| [#58](https://github.com/tannerthardy/football-simulation-/pull/58) `cb73b08177ba796b3963c91f7afc53beafe77cf8`, tested `dc0f104` | Two production files and recognition tests, already based on accepted develop. Reuse 66 focused checks/typecheck and selected game/native receipts. | No dependency on #61, #54 or pursuit pilots. Preserve power rushing6.82→1.17 and the matched92→25.31-yard containment evidence; not league calibration. P045 NFL tracking access/research is separate, not a runtime prerequisite. |
| [#60](https://github.com/tannerthardy/football-simulation-/pull/60) `987056fe5b6dec61d8377834c5b277600685cbcd`, tested `d3ea55c` | Three production files, replay fields and directly affected tests. Reuse 56 checks/typecheck and saved holding-boundary receipt. | No cadence dependency: other retained snaps still need actual credit. P022's corrected enforcement still accepts under the coarse heuristic; policy quality remains open. No physics or historical-box rewrite. |
| [#61](https://github.com/tannerthardy/football-simulation-/pull/61) `351dcff82b96713b5abbc7602d9a051567d1b00a`, tested `28018cf` | New incidental acquisition module, one once-per-tick hook, catch filter, saved-window fixture/tests; based on develop. Reuse 29 focused checks/typecheck and red evidence. | Independent of #58. Its tick hook and #60's final-stat edits share a file but not a mechanism/hunk. Body-facing approximation, missing occlusion and privileged targeted TrackBall remain explicit limitations. No claim to repair P023's complete interception ending. |

The first portability screen has **92 passes and one source-specific P069
historical-trajectory mismatch**. The single targeted current-source
cadence-rollback diagnostic passes with complete frame/event/stat equality.
The original fixture and upstream assertion remain preserved; the extracted
regression protects the matching current-source control. No accepted assertion
was changed for P069. The separately reviewed zone-key contract revision below
is explicit; failed evidence and original assertions are preserved.

The first frozen run at `c412d3a` stopped at strict typecheck: #61's JSON
slot index lacked an explicit offense-key type. Build, TypeScript suites and
Python were skipped by fail-fast. The extracted test adds only that static
annotation; no runtime or expectation changes. The failed receipt is retained.
The final refrozen verification passes as recorded above, using Node22.23.3, all44
accepted flags including `RUN_CONTACT_COMPONENTS=1`, and existing center hands /
centered integration / legacy support / per-solve work / speculative impacts /
mean support / bounded attachment / adaptive substeps. Settings, dependencies,
historical profile and unrelated runtime files stay unchanged.

The user's existing conditional gap integration authority is retained. Preparing
this broader candidate does not infer permission to merge unrelated PRs or
bypass required review. Publication, a passing receipt, merge, baseline adoption,
GitHub default and branch retirement remain distinct actions. No fresh full-game
campaign is justified by this local integration question. Follow
[TESTING_COSTS](TESTING_COSTS.md).

### Explicit zone-key contract review

The frozen `47e0da1` run passed typecheck/build and **1,717/1,718 TypeScript
checks**; Python was skipped by fail-fast. Its sole failure was the accepted
zone-key assertion that a stationary upright nearby receiver must produce a
`run` declaration (`defensive-awareness-contact.test.ts`, original line195).
That is the very speed-only blocking inference #58 removes.

Independent contract evidence is the accepted `showsBlock` helper: merely
waiting at the line is not blocking; delayed low pads/forward movement or
personally visible contact are evidence. The zone test's purpose is preserving
which local receiver is keyed, not assigning knowledge of his hidden job.
The [matched diagnostic](../data/reviews/current/departed-center-integration/zone-key-diagnostic.json)
reuses the same fixture and delayed cues with approved versus candidate
Recognition. It runs zero World steps: upright stationary `run→unsure`, release
`pass→pass`, low pads `run→run`, own-contact `run→run`. A different distant X
does not affect the current zone trajectory. No new endpoint is used as truth.

**Reviewed contract repair:** retain the local-key/release assertions, require
ambiguity for the upright cue, and add low-pad/own-contact run controls. Other
man-key/tactile/privacy checks remain. No numeric threshold or runtime changes.
The original failed assertion, full failed receipt and diagnostic remain
published. Thirty focused checks then passed. The new exact `a862a05`
verification passes; it does not convert the failed `47e0da1` run into a pass.


### Separately identified earlier work and remaining decisions

- **Earlier zone/Duo:** code `6ac628b9cd017fb475c477d41904264d463a6a46`,
  publication `6122fb03c7104c0f9d762591d737cf2cf6a49067`, source
  `1c4fe7fdef9377436543fd94571689279be84fa061b16e2b46c0602567565527`.
  The author recommends separate review and reports 201 checks/typecheck.
  Its broader navigation/clearance work consumes `teammateInformation` and
  depends on that experimental run stack; it is not needed by the gap fix.
  [Full prior review and rejected gap-run transfer](https://github.com/tannerthardy/football-simulation-/blob/badddf495fa9ff7cfa6579709dec853dc449974e/docs/reviews/run-lanes/README.md)
  remains preserved. Actual git merge base with approved develop is `a1b16e6`,
  despite older prose mentioning a historical fetched reference.
- **Latest gap handoff:** `codex/run-lanes` moved to `4da1c3a` with workboard
  documentation only. The author also published `codex/departed-center-gap`
  at `132c27a`, code `d63bf45`, evidence `92566b3`, directly from accepted
  develop. All three extracted files are byte-identical to this candidate.
  [Portable author handoff](https://github.com/tannerthardy/football-simulation-/blob/132c27a8f1d9ce9a4366b92f0ede0df42a0dac52/docs/reviews/departed-center-gap/README.md).
  The separate entry-risk trial is rejected after an RB/RG collision; its
  [owner record](https://github.com/tannerthardy/football-simulation-/blob/4da1c3aa82352e9dc4a953f11be494626b96d8eb/docs/WORKBOARD.md)
  preserves pins and the next clearance question. Neither trial nor older zone
  code is imported. No test repeat is needed for these documentation updates.
- **#58 refresh:** newest head `f597cec3983e73ac5538f1f68a1ef7db4c49fa43`
  adds only 17 documentation lines; runtime/tests/tooling match reviewed `cb73b08`.
  Its new P046/P009 tracking-guided native transfer is linked, not rerun. The
  selected #58/#61 native combination is not claimed measured by this receipt;
  the exact combined code suite passes. No new football campaign is automatic.
- **Still held:** #54 wholesale, earlier zone/Duo/detour imports, rejected QB
  late-chase, #34 coverage blockers, experimental hands/grips/helper/physics,
  P022 value policy, P045 approach/secondary support and unfinished run collection.
- **Smallest next decision:** review PR #63's exact candidate and explicit
  zone-key contract repair for integration. Gap already has conditional merge
  authority; the broader batch retains its required review. No new testing is
  justified for unchanged code/inputs/settings. Develop, historical reference,
  default branch and source branches remain unchanged in this preparation pass.

There were three frozen verification attempts: a fail-fast typecheck stop,
a 1,717-pass/one-failure TS run, and the final all-phase pass. Recorded validation
commands total about **428 s**, including failures and focused diagnostics;
source/evidence audit and patch checks are separately timed. No additional
full-game or roster campaign ran; preserved suite game assertions did execute.

<details>
<summary>Published 2026-10-14 integration ledger and prior receipts — preserved</summary>

# Integration ledger

Updated **2026-10-14 (America/Phoenix)**. [Priorities](STATUS.md),
[issue/blocker details](ISSUES.md), [file ownership](WORKBOARD.md).

## Accepted reference and verification ownership

`develop` at **a1b16e666a9ee7d1bc1d2aecba141fc535863b24** contains merged
[#12](https://github.com/tannerthardy/football-simulation-/pull/12).
Historical `4ded6b6` remains a comparison, not the development starting point.
The designated **Integration owner** freezes candidates and owns one combined
verification. Contributors supply compatible focused receipts.

The accepted #12 code was tested at `46a833dd006850a2c83a937bd3444181d8b10588`:
**1,684 TypeScript / 145 Python checks, typecheck/build pass**, 180.530 s,
44 flags/components=1. [Exact receipt](../data/reviews/current/controller-combined-verification.json),
[scope and adverse evidence](reviews/controller-integration.md).
Publication/merge commits are distinct from the tested commit; reuse depends on
source/test/input/settings/measurement compatibility, not PR state alone.

## Candidate dispositions

| Work / exact publication snapshot | Disposition | Remaining decision |
| --- | --- | --- |
| #12 accepted run/catch + shared policy/tooling; develop `a1b16e6` | Integrated | Maintain known limitations; no new baseline designation in this documentation pass |
| [#29](https://github.com/tannerthardy/football-simulation-/pull/29) `b8e4d86`; tested `ce93c3b` | Ready for isolated integration review; **not yet fully verified/merged** | [STALK-001](ISSUES.md#STALK-001): preserve two-line scope and complete required verification, independently if coverage stays parked |
| [#34](https://github.com/tannerthardy/football-simulation-/pull/34) `306579f`; tested `cb240d2` | **Blocked; follow-up parked while Pass Game helps awareness** | [COV-001/002](ISSUES.md#COV-001): supported controller/test-contract adjudication, then one revised combined pass including Python |
| [#36](https://github.com/tannerthardy/football-simulation-/pull/36) `6828467`; tested engine/tests `98411ef` | Focused candidate; **promotion held for Run Game review**, no full-suite claim | [INFO-001/002](ISSUES.md#INFO-001): real rear collision and bounded post-mesh coordination; preserve unchanged yielding/physics |
| [#35](https://github.com/tannerthardy/football-simulation-/pull/35) `fed330a` | Diagnostic preparation, not a runtime feature | D01/Y domain comparison for #36; preserve original incomplete-memory disclosure |
| [#17/#18](https://github.com/tannerthardy/football-simulation-/pull/17) `92743c0` / `b30284c` | Experimental contact correction/evidence; unpromoted | [PHY-001](ISSUES.md#PHY-001); retention review permits bounded controller work, not package adoption |
| Physics #3/#7/#15–#21/#25/#31/#33; latest #33 `abf0e1c` | Research, not a combined production candidate | Local correctness/composition, cost, and named transfer; [PHY-002](ISSUES.md#PHY-002) |
| #23/#27/#28 TE studies/intervention | Diagnostics and parked intervention; do not merge ancestry | [RUN-003](ISSUES.md#RUN-003): adverse transfer retained |
| #22/#26/#30/#32 run audits/reference/rejected alternatives | Evidence, not production changes | Reuse exact references; no automatic campaign or runtime merge |
| #13 RB assessment; #4/#5 hands/handover/helper experiments; Stick/seam/post/QB-pressure prototypes | Separate review/research; excluded from #34 | A named independent question before extraction; no broader candidate by collection |

Relevant #6/#8/#9/#10 code/evidence is incorporated through accepted #12 even
when the older draft PR remains open. Do not confuse code inclusion with PR
closure, or close/delete historical refs from this ledger alone.

## Parked coverage receipt — not a passing verification

[#34 exact receipt](https://github.com/tannerthardy/football-simulation-/blob/306579fda9d496d45606445fd542239cf2f5acf4/data/reviews/current/pass-controller-combined-verification.json):
**1,698 passed / two failed; Python skipped**. Typecheck/build and 94 affected
checks pass. Combined runtime 205.662 s; candidate `cb240d2`, publication `306579f`.
The [register](ISSUES.md#COV-001) preserves numeric failures, intended contracts,
next actions and owner return condition. Existing diagnostics do not clear them.
Do not rerun the same failed source or treat that receipt as covering #29 alone.

## Promotion path

1. Identify the smallest independently useful correction and opposing contract.
2. Resolve named blockers with saved/focused evidence. A changed ending is not
   automatically a defect; an assertion change needs a supported contract.
3. Integration freezes exact source, tests, inputs, flags/model choices and dependencies.
4. One owner performs the required combined verification; every phase must pass.
   Fail-fast skips remain skips, not inherited passes.
5. Publish exact receipt, remaining risks and final decision. Merge/reference
   changes remain separately reviewed; a draft or focused pass is not approval.

Use [TESTING_COSTS](TESTING_COSTS.md). No automatic mode/roster matrices or games.
For current development, use the historical launcher in candidate mode; it still
guards the original historical source hash:

```sh
npm run baseline:info -- --candidate
# Integration owner only, for a reviewed exact combined candidate:
npm run baseline:verify -- --candidate --fail-fast
```

Use Node22.23.3 and preserve accepted resolved settings. Do not edit the historical
profile/source pin simply to make the launcher label current development a baseline.

<details>
<summary>Historical #6 / #12 preparation and original receipts</summary>

The following original records describe their own stage. Then-current ownership,
43-flag and adoption-pending statements are historical, superseded above.

# Current integration ownership and evidence

Current task: [reviewed run/catch controller integration](reviews/controller-integration.md),
owned by the same Codex integration session. It starts from approved `c98c2fa`,
reuses #10's compatible independent verification, and verifies a minimal
catch-only extraction before one frozen combined run. The candidate changes
production requests and registers 44 flags/components=1. It is not merged or
designated a baseline. The #6-only pass and 43-flag receipt below are historical
evidence for their exact pins; their unchanged-production statement is not a
description of this new candidate.

This pass incorporates **PR #6 only** into the previously combined runtime.
The historical comparison stays
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1` on
`codex/run-game-integration`, profile `run-game-2026-10-13`.
The candidate is on `codex/shared-candidate-verification`; its shared verification
receipt records the exact tested commit. This does not designate a new runtime
baseline or promote a feature.

## Owner and scope

**The Codex integration owner in this chat owns the exact combined verification.**
Contributors supply compatible focused receipts, not another shared-suite run.
This current assignment supersedes the generic integration-lead role in older
guidance; historical workboard rows continue to describe their original stages.
Controller and physics ownership/promotion boundaries remain with their owners.

| Contribution | Treatment in this pass |
| --- | --- |
| #6, `f9617dde9456c0ead2d66b46d4b42608adcd3585` | Incorporated: tiny testing loop, interpretation guide, opt-in roster tools, cache/budget guards and their tests. |
| #3, #4, #5 | Leave on existing branches; preserve their focused receipts and adverse evidence. Disabled experiments are not a reason to import runtime changes. |
| #7 | Excluded while marked not ready. |

#6 needs no runtime change from those contributions. The only merge conflict
was adjacent workboard ownership rows; both the current claim and #6's rows are
retained. **Production simulation code is unchanged.** Engine sources,
dependency lock and `config/baseline.json` are identical
to `4ded6b6`. New policy/tool assertions require one current combined suite;
the historical suite receipt does not cover those additions.

Any independently ready runtime correction gets a separate bounded assessment:
identify its commit, smallest dependencies, intended enabled/disabled state,
target question and focused opposing evidence before changing this candidate.
Do not broaden the merge just to collect disabled work. If #6 is later found to
need a dependency, identify the smallest required change before importing it.

## Flag reconciliation

Keep the existing **43 runtime flags** and their values in
[`config/baseline.json`](../config/baseline.json). The launcher checks the engine's
actual inventory, resets inherited values and records the resolved settings.
This pass supplies no overrides. All preserved experiments stay off, `CF_FLOW`
stays unset, and the default-on controllers retain their existing settings.

| Setting | Candidate / receipt treatment |
| --- | --- |
| Existing 43 environment flags | Exactly the historical profile; no additions or promotions. |
| `PULL_HANDOVER`, `RUN_CONTACT_COMPONENTS` from #4/#5 | Not present in this engine/profile; their branch receipts are not candidate receipts. Do not copy their 45-flag configuration into the historical profile. |
| `gripTiming: 'resolved'` from #3 or `'fast'` from #7 | Excluded API choices. Do not document them as available candidate settings. |
| Existing World/API choices | Historical defaults: center hands, legacy support, centered integration, per-solve work, speculative impacts, mean support, bounded attachments and adaptive contact steps. Explicit experimental choices still need input/setting pins in focused receipts. |

## Contributor handoff

Use the five-field report in [testing costs](TESTING_COSTS.md): what changed,
evidence for/against, unresolved risk, runtime and next decision. Link the saved
receipt and witness instead of rerunning a batch or repeating the shared suite.
Existing receipt metadata should identify:

- Tested commit and runtime/test/collector fingerprints, including relevant
  uncommitted changes; a branch label alone is insufficient.
- Exact inputs/fixture, actors/roles, initial state, call/seed and measurement.
- Resolved flags and API choices, Node/environment and relevant dependencies.
- Completed/failed/skipped coverage, opposing control and limitations.

These are compatibility checks on evidence, not new mandatory test groups.
Reuse an existing receipt when its tested code, inputs, settings and measurement
remain compatible. Different global source fingerprints cannot establish exact
candidate verification; any narrower reuse must explain which measured mechanism
and code dependencies remain unchanged. Mark other evidence historical or
branch-specific. #3/#4/#5 receipts remain useful on their own pins and do not
establish an integrated runtime correction here.

## One frozen verification

The owner commits all candidate code, tests, inputs and settings before running
the existing launcher once:

```sh
node scripts/baseline.mjs --verify --candidate --fail-fast --receipt out/shared-integration/verification.json
```

Use `.nvmrc` Node 22.23.3 and the existing lockfile dependencies. Verification
runs typecheck, build, all preserved TypeScript projects and Python checks.
The aggregate fails for a failed/skipped phase or changed inputs/commit.
Existing game assertions inside that suite remain; no additional roster screen,
audit or game campaign is needed to answer this policy-integration question.

Publish the tested commit and exact receipt with phase runtimes, resolved flags,
source/validation fingerprints and known limitations. A later publication commit
may add documentation/receipts only; explicitly distinguish it from the tested
commit and confirm unchanged runtime/validation fingerprints instead of repeating
the suite. Functional success does not erase the known center-hand conservation,
patch promotion, recovery-convergence or football failures in
[the historical baseline](BASELINE.md#known-failures-and-validation).


## Published verification evidence

- **What changed:** #6 at `f9617dde9456c0ead2d66b46d4b42608adcd3585`, plus ownership/flag documentation, incorporated into the existing combined baseline. Production simulation code is unchanged. Exact tested candidate: [`c3080e89c089ffe686596e2b7953062fcff5ac46`](https://github.com/tannerthardy/football-simulation-/commit/c3080e89c089ffe686596e2b7953062fcff5ac46).
- **Evidence for/against:** 1,669 TypeScript tests in 139 files, 145 Python checks, typecheck and build passed. Four phases completed with no skips or worker errors; inputs/commit unchanged. The [exact launcher receipt](../data/reviews/current/shared-integration-verification.json) is copied byte-for-byte, SHA256 `49e672b08efd10c993fa56200fd15ec36e21f2e9f5d3b92d0d5677389fdda0ce`. #6's focused evidence remains on its original pins; no contributor repeated the shared suite for this pass.
- **Unresolved risk:** Functional success does not resolve the historical conservation, contact-promotion, convergence or football defects. #3/#4/#5 remain separate; #7 remains excluded. No runtime correction or new baseline was assessed or promoted.
- **Runtime:** One combined verification, 186.804 s wall. Typecheck 10.821 s; build 12.419 s; all TypeScript projects 162.617 s; Python 0.945 s. No additional roster screen, audit or game campaign. Raw log stays in `out/shared-integration/verification.log`, SHA256 `35c1d6fbb94ebd1bba157963751ba43c7f77e2b664e45cb6d4bdd3cf579f52c4`.
- **Next decision:** Should #8 become the current shared development reference, with `4ded6b6` retained for historical comparisons? The existing receipt supports this decision; another audit or simulation campaign needs a specific unanswered question. Assess any independently ready runtime correction separately with dependencies, settings and focused evidence explicit. Contributors link compatible focused receipts; the integration owner owns the next combined verification only if its material inputs change.

The receipt's UTC interval is `2026-10-13T23:58:40.799Z` to `2026-10-14T00:01:47.603Z`.
It records Node `v22.23.3`, runtime `8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c` and validation
fingerprint `2636006bf58c4d30db9ff67049b18d4d33059ff7f0bf49c51e3e50617a0c9597`, with all 43 historical flag values.
The publication follow-up adds only docs/evidence; it is not represented as
another tested commit. Runtime and validation fingerprints must match this
receipt at publication. `4ded6b6` remains the historical comparison pin.

</details>

</details>

</details>
