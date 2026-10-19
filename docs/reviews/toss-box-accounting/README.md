# Toss technique and unassigned-linebacker accounting

**Recommend independent review of one small QB box-count repair. Do not expand
Toss technique or manufacture an owner for every extra defender.** The inspected
ordinary fronts account for their linebackers. The preserved Bear control has
more nearby threats than core blockers. That is a real defensive advantage.

Accepted base `f4146275ce7539816bf57b4ed55a0d2be10e48c7`, queue `9a6bb795`.
Code **`b242de8b29619a6f50cbdb65bedf5941ef32631b`**, branch
`codex/toss-box-assignments`; runtime SHA256
`c6eed919bec29229b9cda00c08b11e522bafa0795612c272ea0c585eabe718cc`.
[Minimal two-file patch](promotion.patch). No author self-acceptance or adoption.

## Latest work inspected

Claude Part5 report `336e8fc940d08d119926276b7a4c7242eafb437a`, selected
witnesses `e95db58` / producing source `4702192c…`; latest head at handoff
`65db81d710bc0ff75fcd6a81cc4fa8b5f1b89e5f`. The two newer commits add film
recorders/pages; **no src change**. Preserve experimental DRIVE_CONNECT,
DEPART_TEMPO, mesh, ZONE_TE and LB_KEY reviews rather than importing that stack.

Also inspected Run's [response review025bcf2](https://github.com/tannerthardy/football-simulation-/blob/025bcf25be4c4695392b0940bf708b1c3a708411/docs/reviews/pr153-run-controller-response-review.md),
[contact reviewfed3de0](https://github.com/tannerthardy/football-simulation-/blob/fed3de03f1d47d7964235cb8dfe7ee2c854deb11/docs/reviews/shed-pursue-independent-review.md),
[free-blocker #152](https://github.com/tannerthardy/football-simulation-/pull/152)
and held climb/perimeter scopes #148–150. #155 eligibility stays frozen and
independent; #137 joint allocation stays held. This task does not re-adjudicate
those scopes or duplicate their campaigns.

## What the free-LB rate establishes

Claude's `scripts/diag/stretch/climb.ts` asks at the first carrier crossing:
for an upright LB within4yd who is not defending a rep, does **any current**
RunBlocker target/climb/combo-backer point at him? It reads mutable current
plans, not the original snap ledger. Its denominator is runs reaching the
crossing before the horizon. It is a useful diagnostic, not a count of wrong
installations or a required rate of zero.

The exact printed rates differ by arm. Default IZ/OZ/Power/Counter are
.13/.20/.13/.06 per crossing run. DRIVE_CONNECT gives .14/.20/.14/.04;
adding DEPART_TEMPO gives .15/.18/.14/.05. The quoted .14–.18 is not one
accepted-develop population. These remain source-qualified experimental reports;
no NFL scan or larger lab was repeated here.

**34 constructor-only checks** reuse the published pair31/77 inputs: Ace12 and
I-Pro21; Over/Under/Odd/Bear; IZ/OZ/Power/Counter strong, plus two Ace Toss
installs. All initial unowned roster-LBs occur in the **eight Bear cases**:
**five immediate down threats plus four depth threats versus seven core
blockers**, with the receivers already accounting for the corners. Ordinary
fronts' LBs have installed current/future owners. This is a bounded count
check, not a frequency estimate or proof of optimal unblocked identities.
A shared double's present DL and future backer are sequential work, not two
extra blockers. An assigned backer can still win his encounter.

Three short accepted-source prefixes distinguish actual current ownership:

| Existing input, pair31/77 | Crossing | Nearby LB evidence |
| --- | ---: | --- |
| IZ strong / Ace / Under |2.80s|Mike remains RG's job and in his rep; Sam remains Y's job and in his rep.|
| OZ strong / Ace / Over |2.60s|Sam remains RT's assigned job and in his rep.|
| IZ strong / Ace / Bear |2.65s|Mike has RG assigned but is not in a rep; Sam has no owner at either install or crossing. Nine threats versus seven core blockers.|

The Bear control preserves both an assigned-but-free defender and a genuinely
extra unassigned defender. No collision, defender, load or assignment is removed.
No full-play ending or yardage benefit is inferred. This selection does not
settle every individual in Claude's aggregate. The narrow return condition is
one identified unowned threat with a legitimately available blocker, or a
previously installed responsibility that disappears without a justified
replacement. The diagnostic now retains initial and current ledgers and each
observed plan transition to make that distinction reviewable.

## Supported correction: QB omitted his own fullback

`QBMind.preSnapCheck` counted `slot === 'FB'`; the installed fullback is **F**.
The live run installer already gives him a lead/kick job. A centered F would
also fail the old strict side test even with the spelling corrected.

The local count now includes an installed **backfield F**. Centered F contributes
half to each side, **one total**; offset F contributes one on his installed
side. Existing OL/inline counts, center weighting, defensive-picture noise,
authority, quick-check/flip thresholds and random calls remain. It uses already
installed own-team knowledge; no extra observation or private state is read.
No blocker is forced to win or reach a defender.

| Decision control | Before | Candidate |
| --- | --- | --- |
| Nine box threats / I-Pro or Offset-I seven blockers, both flips |F omitted; treated as six; check to pass|F counted once; retains run under the existing2.5-extra threshold|
| Ten threats / centered F seven blockers |Check to pass|Check to pass; no duplicate F credit|
| Nine threats / Ace11 six blockers |Check to pass|Check to pass|
| Seven threats, five called-side/two opposite |Offset F omitted; unnecessary flip|Offset F credited on his side; retains run. Centered F still permits a valid flip.|

The count correction **does not explain or repair the free-LB lab rate**:
those inputs set `audibles:false`. It changes pre-snap decision arithmetic only.
Retaining an I-form run against two extra threats may have adverse football
outcomes; no native advantage is claimed. Existing QB defensive-position/
quick-check information modeling is unchanged, not recertified by this repair.

## Toss decision

Toss explicitly enters zone-like installation and assigns reach at the surface,
with no pullers in its current concept. `zoneFlow`, acquired `zoneEligible` and
engaged stretch-contact selection explicitly admit outside/wide zone, excluding
Toss. Thus Toss uses ordinary reach/combination/drive collection rather than the
OZ/WZ lateral-track/contact package. This is a coherent **ordinary reach Toss**
variant; the code does not document why that variant was chosen. It is not a
claim to have implemented every NFL Toss/Crack/Power Sweep.

The [installed football reference](../../football-handbook/moving-run-footwork.md)
allows reach/zone or down/kick/pull/lead Toss variants. The current saved results
do not identify a first avoidable wrong acquired/achievable Toss movement
request. Similar yardage totals cannot certify NFL mechanics, and would not
justify preserving a demonstrated defect. **Leave technique expansion held**
until a concrete edge/penetration encounter demonstrates which variant and
movement would help. Do not add Toss to three gates just to make it look wider;
that changes precontact tempo, double coordination and loaded contact together.

## Verification, cost and extraction

**Eight distinct focused decision checks pass** (six primary, two added side/flip
checks; prior six deliberately unrun in the latter command). Scoped TypeScript
checks pass for the diagnostic/import graph and final test/diagnostic scope.
No new production suite, whole game, NFL measurement or native panel.

Initial test used an invalid `singleback_11` fixture name: four real F failures,
one fixture error, one passing overload. Correcting to canonical `ace_11` before
runtime editing yields **four failures/two passing opposing controls**. Both red
receipts remain; no assertion was relaxed for the runtime correction.

Total new launcher child-command wall **17.954s**, including that setup failure,
all red/green/side checks, two scoped types, constructor checks and three native
prefixes. Those prefixes cost2.038s command wall and8.05s simulated time total;
zero native endings collected. Node22.23.3,44 accepted settings/components1,
CF_FLOW unset, native World defaults. Inspection/publication time is separate.

The native evidence is explicitly accepted source `7d23555a…`, before the QB
count correction. The correction is gated out when audibles=false, as in those
inputs; do not relabel them candidate football benefits. [Receipts, cost and
scope hashes](../../../data/reviews/current/toss-box-accounting/summary.json)
include protected QB forecast, blocking, run-fit, spacing, engagement and physics
blobs. Source before/after the private count closure is byte-identical.

Integration's portable runtime scope is **qbmind.ts's local count plus
qb-installed-box-count.test.ts only**. [Observer-only diagnostic](../../../scripts/diag/toss-box-accounting.ts),
reports and gzip/hashed evidence are separate support, not a runtime dependency.
#155/#137/#141/#152 and all experiments are independent. Recommend review of
this small count correction, followed by Integration's exact combined checks.
No reason is demonstrated to change LB assignment policy or Toss technique here.
