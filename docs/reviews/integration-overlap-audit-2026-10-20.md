# Integration overlap audit and owner handoff

Checked 2026-10-20 UTC. **There is a substantial adoptable checkpoint here,
but the 71 candidate PRs are not 71 independent changes waiting to merge.** The
recent work needs two explicit source reconciliations, one duplicate removal,
and review of a few shared information/execution contracts. Do not merge the
research stacks wholesale or make every held experiment a prerequisite.

This is Flex's source/provenance/portability review, not independent football
acceptance of every component, an assembled runtime, or a merge instruction.
Integration retains exact assembly, verification and adoption ownership.

## Checked references and scope

- Accepted `develop`: `2c98bed94adad8087c65f381d4090444ad283985` (#168).
- Current canonical queue: `6575988fe9e72bd0aaf9e3573787f0dcb81ebf52`.
  Its accepted pin agrees with the actual branch. `4cc3337d` is the preceding
  metadata snapshot, not the latest queue.
- Claude research: `bae3fe80d189a7d792aaafbc4eea1ae2baa79573` (#153).
  It includes current accepted develop but still contains ten changed source
  files and 75 research settings versus 44 accepted. Current ancestry does not
  make the whole package accepted.
- Inventoried the initial70 open PRs, then added newly published186 (excluding
  this audit's own187); inspected the recent #169–#186 source boundaries,
  reports, PR handoffs and current owner summaries in detail. Earlier open
  work is classified from its published disposition; it was not all subjected
  to a new independent line-by-line football review.
- Performed 20 pairwise `git merge-tree --write-tree --merge-base=<accepted>`
  checks for recent pairs sharing runtime files. No checkout/index was merged.
  Two pairs have source conflicts; all20 have workboard conflicts. Those
  administrative conflicts do not establish incompatible football behavior.
- Zero engine runs, native plays, games, tracking queries, benchmarks or
  full-suite executions. Existing component reviews and receipts were read,
  not rerun. Git merge-tree writes temporary Git objects only.

[Pinned PR inventory and classifications](../../data/reviews/current/integration-overlap-audit/inventory.json)
and [pairwise merge results](../../data/reviews/current/integration-overlap-audit/pairwise.json)
record the exact inspected heads and conflict paths. Refresh mutable refs before
assembly; a later changed source requires a delta review.

## Recent candidates: what can advance

| PR | Inspected publication | Integration treatment |
| --- | --- | --- |
| [169](https://github.com/tannerthardy/football-simulation-/pull/169) | `1004b818f2f7692df595a237ec9eec05a9ef2587` | Reviewed support work-off timing. Reconcile with177; preserve first-attempt-only bypass and RNG convention. |
| [170](https://github.com/tannerthardy/football-simulation-/pull/170) | `4a5aadcbbdfe3065ec41d73e0c0de3ee1272c070` | Diagnostic/scripts and three regression checks; no runtime correction or generic slowdown. Can advance independently. |
| [171](https://github.com/tannerthardy/football-simulation-/pull/171) | `6cbdcc4dc70e6ce5b644582c6ca14f77f5c28bbf` | Reviewed acquired blocking-support continuity and explicit fit inputs. Preserve real release/PA/recognized-flight priority. |
| [172](https://github.com/tannerthardy/football-simulation-/pull/172) | `ae6b1d940124debdc71eb6fe24f20c98d87be5ae` | Already contained in174's coherent contact candidate. Import once through174, retain original evidence. |
| [173](https://github.com/tannerthardy/football-simulation-/pull/173) | `3d4db3bab9d80740c151c92582255553f922227d` | Rules documentation/index, no runtime. Source-fact tables are about2c98bed; qualify/update current wording if178 is adopted. Not a runtime dependency of178. |
| [174](https://github.com/tannerthardy/football-simulation-/pull/174) | `1e2415a70953f69f4e7e71a86136196370f25204` | Independent acceptance of runoff+drive pair; use this boundary instead of applying172 again. |
| [175](https://github.com/tannerthardy/football-simulation-/pull/175) | `628ae0c09f4854513bb87fb03b6e54a9116ecadb` | Installed force shoulder candidate. Report recommends acceptance; no separately linked nonauthor disposition found in inspected PR/receipt. Owner should surface one if it exists; otherwise obtain read-only narrow review. Not labeled ready at refresh. |
| [176](https://github.com/tannerthardy/football-simulation-/pull/176) | `0b2addbece94bc47f69ea729af27911398cf85fd` | Moving force boundary. Report/comment record independent acceptance of narrow request contract; publish its exact reviewer disposition/link and readiness intent. No175 dependency. Not labeled ready at refresh. |
| [177](https://github.com/tannerthardy/football-simulation-/pull/177) | `2ebaaf11dcd6455875411423dcbb2910013d7903` | Reviewed support exit. Existing169+171+177 interaction evidence can be reused; it does not cover174. |
| [178](https://github.com/tannerthardy/football-simulation-/pull/178) | `7d475e5efdc81257c2f19efbf468c59cb93e2834` | Coherent rules/detector/caller slice. Existing exact isolated verification passed; larger composition is unverified. Keep physical and official results distinct. |
| [179](https://github.com/tannerthardy/football-simulation-/pull/179) | `8a76ab9a1f0851ce6f4727bfedeacbad0bf49c4b` | NFL query is now completed:12/12, zero exclusions. Evidence/tooling adoption is separate from runtime acceptance; do not download or execute it again. |
| [180](https://github.com/tannerthardy/football-simulation-/pull/180) | `2c6d53ecce9f5eb54e7a086c7723dd21aa68320a` | Latest motor extraction is READY for isolated Integration review. Old cost hold is superseded by final parity/cost review, not erased. Explicit motor/recovery scope decision remains with Physics/Integration. |
| [181](https://github.com/tannerthardy/football-simulation-/pull/181) | `8239e8d89a8f326c95318ab62b73d807550ec683` | Reviewed complete gathered-command preview; reconcile chase return with182, preserve175/176 force policy. |
| [182](https://github.com/tannerthardy/football-simulation-/pull/182) | `4f29315039a0a9b397e53424354355eba108c839` | Reviewed current acquired pursuit-objective producer. Does not require held166 or a new navigation framework. |
| [183](https://github.com/tannerthardy/football-simulation-/pull/183) | `dceec577baee5ea9b4f7fcf24d63bbef94385177` | Reviewed closest joint projection under unchanged limits. Ready label present at final refresh. Review link is still described as to-be-published in compact receipt; make existing disposition fetchable. |
| [184](https://github.com/tannerthardy/football-simulation-/pull/184) | `0d13a208e233103fae11373ce67eca3d9b9c1d65` | Reviewed announced-versus-achieved teammate prediction. Independent from180. Preserve flipped-WZ climb/collection regression. |
| [185](https://github.com/tannerthardy/football-simulation-/pull/185) | `d0f767666208f6f22081e8f81ad10c7f7461b288` | Reviewed square pull clearance/acquired corner; one blocking.ts file. Keep GH contract adjudication and adverse impacts; no propulsion or PULL_STEP activation. |
| [186](https://github.com/tannerthardy/football-simulation-/pull/186) | `7b70c343cf30f0066fc46f223ad134d1249f6188` | Newly published, independently reviewed local man/zone routing. Requires183's source/test scope, included in its branch once; does not require181/182. Review the increment after183 and explicitly assess its new activation if182 is also chosen. |

Draft state, readiness label, author recommendation and independent acceptance
are different facts. Missing labels/links require a small handoff correction,
not a repeated native campaign or a declaration that the mechanism failed.

## Actual conflicts and interactions

| Boundary | What the source check establishes | Required resolution |
| --- | --- | --- |
|169+177, `engagement.ts::stepRunRep` | **Text conflict.**169 changes admission/readiness;177 hoists `supportRunner` and selects a runner-directed exit. | Define support eligibility once; retain169's `t >= nextMoveAt || (supportRunner && !runSheds.has(e))`, and177's current `read.aim`/loaded-versus-acquired blocker checks. Do not restore a fresh random wait or give unconditional runner steering. Existing three-way169/171/177 source/evidence already supplies a reconciliation reference. |
|181+182, `common.ts::chase` | **Text conflict.**181 returns the exact gathered command scored;182 attaches current moving-objective metadata outside the old blend. | Put metadata inside the pure composer: `command => ownApproach(blendApproach(command, near, gather))`; return `chooseApproach(...)` directly. Keep full-gather annotation and bonded-tackle bypass. Do not blend/annotate a second unscored command afterward. |
|174 versus172 | Duplicate hook, runoff realization and test, not a second feature. | Use174 once. Preserve172's original provenance; do not reapply/review it as a separate missing fix. |
|169/177+174, shared `stepRunRep` |174's offensive tangent/connection hunks merge outside defensive work-off logic.177+174 has no source conflict. | Run+Catching review the shared frame/eligibility/request ordering. Existing177 interaction covers169+171 only; it is not four-component acceptance. Preserve useful offensive load and earlier exposed defensive access. |
|171+176+181, `run-fits.ts` | Pairwise source merges cleanly. They alter input resolution, retained moving force target and gather preview respectively. | Keep expected backfield separate from affirmative keyed runner; retain point and velocity on the same beat, use observation compensation once, and preserve complete gathered-command preview. No new live-holder cue or double lead. |
|175+181+182, `common.ts` |175 merges textually with either. It changes actual force shoulder offset in both intercept and gather. | Use175's installed signed shoulder consistently in182's current-objective metadata and181's scored command. Generic midpoint fade/near-contact closure remain controls. |
|183+184+182, spacing producer/consumer chain | No shared source files between these PRs, but184 changes peer inputs,182 supplies own goal, and183 chooses a closest feasible request. | Preserve source semantics: observed velocity is not an announced speed, current moving goal is not future intercept, and constraints remain acquired. Existing isolated native gains cannot be added or called a combined benefit. |
|186+183;186+182/184/180 |186 includes183's runtime/test scope; their shared spacing.ts merges cleanly.186 routes eligible man/zone actors only when an own goal exists;182 adds that goal during pursuit.184 changes peer geometry and180 changes the physical preview. | Include183 once, retain186 as a separately reviewed increment. A clean merge does not establish its newly enabled pursuit behavior. Assess one saved blocked-pursuer encounter (OZ4 Will behind Mike is already named), retaining goal/unknown/load gates and first-touch closing guard.186's native passes end incomplete, so later pursuit/blocking is not established. Preserve residual A008 cost. |
|185+174, `blocking.ts` | Clean pairwise source merge.185 changes pull/read/clearance;174 changes loaded contact hook. | Preserve the handoff from acquired corner/kick to loaded drive. No invented RT/Sam job or compulsory contact, private retarget, new clearance timer, or resurrected163 propulsion. |
|178+184, `playsim.ts` | Clean source merge.184 changes spacing picture around old589;178 adds rules lifecycle, loaded-pair sampling and result resolution elsewhere. | Preserve world/contact/event order and the spacing callback; do not replace the entire old file from either branch. |
|178+169/174/177, `engagement.ts` | Clean pairwise source merges.178 changes legacy holding bookkeeping in `tryHold`, not the work-off/runoff section. | Preserve legacy holding draw convention and actual-load OPI evidence. A changed block can change lawful foul facts; a changed official gain must not masquerade as changed physical protection. |
|180 with movement consumers | No same-file overlap with these controllers, but it changes World and stepBody yaw response and recovery's peak-torque reserve. | Physical preview/execution must use the same accepted motor. Do not mix old native outcomes with new motor results. Retain170's recoverable-contact/square/miss contracts if both are included. #184's predictor still uses a fresh free-body estimate, not hidden current load/spin. |

All pairwise source merges are portability evidence only. Multiway composition,
passing checks and football benefit are separate questions. Conflict-free
workboard resolution should retain current owner claims/history, not choose
one branch's entire documentation or import all its ancestry.

## Instructions by owner

### Integration

1. Refresh accepted develop and all chosen heads. Update the canonical intake:
   it still describes169+171(+172), while174 now incorporates172;177–186 add
   separate reviewed boundaries. Link179's completed query and180's new readiness.
2. Assemble minimal reviewed source/tests and necessary fixtures into one
   isolated candidate. Resolve the two source conflicts above explicitly,
   using the existing owner compositions; ask owners only about remaining
   semantic questions. Never use wholesale common.ts/engagement.ts checkout.
3. Obtain/record175's nonauthor disposition and176/183's existing exact review
   links. If these cannot return promptly, hold those scopes alone. Do not wait
   for old experiments, a new NFL study or a general navigation project.
4. Decide178's coherent rules boundary and180's isolated motor boundary
   explicitly. They may progress independently; if included in a larger freeze,
   its source/settings/test identity differs from their isolated receipts.
   Preserve separate scope/adoption decisions even if verification is batched.
  186 can advance with its genuine183 dependency, or hold independently while
   the smaller projection advances. If also choosing182, review the new route
   activation before attributing a composed pursuit benefit; name the smallest
   existing witness if static/saved evidence cannot settle that interaction.
5. Reuse compatible component receipts. At the reconciled seams run the
   existing relevant controls once on the chosen combined source, then required
   exact combined verification once under the existing launcher/cost policy.
   A new native witness is justified only by a named unresolved interaction;
   select the existing input and opposing control, not a new panel or full game.
6. Record actual merge tree/accepted pin, included and held scopes, flags and
   receipts. Ordinary corrections have existing standing merge authority;
   physical-law/default promotion retains its separate boundary. This review
   grants no additional promotion or destructive-cleanup authority.

### Run Game

- Keep174 as the sole runoff+drive boundary; keep185 independently reviewable.
  No re-review of172 and no extra standalone yardage-win requirement.
- With Catching, disposition174's offensive contact versus169/177's defensive
  continuation in the merged `stepRunRep`. Reuse source and saved traces first.
- Confirm185's acquired wall/phase progression survives174's loaded-contact
  handoff. Retain the mirrored/obstructed and earned GH-memory controls;
  preserve the original failed GH prefix assertion and its explicit adjudication.
- Preserve strong OZ DT contact2.50s and live8s censor, weak WZ1.60yd finish,
  Power4.15→0.77 defensive counterplay, K01 regression and late K04 RB/X impacts.
  Do not tune the combination to recover those yardage endpoints.
-101 remains a separate tiny wall-censor/partial-exception repair for
  Measurement review. No1848-case rerun. Broader FORCE_LEAD/mesh/climb work is
  a future minimal extraction decision, not a prerequisite for these deliveries.

### Catching And Defensive Pursuit

- Supply Integration the existing169+171+177 reconciliation pin
  `2302b48fb56298605ec17aaa39cc7950f62b6c08`/source
  `cfee04784b7f3ae7cd5050db641b4471361b8f3f892d679d24a6275a7a8b70f2`,
  including its65 focused overlap checks and three existing native interactions.
  It is an interaction reference, not the final combined candidate or174 evidence.
- Co-own the two-line181/182 composer reconciliation and confirm175/176's
  force objective semantics. Use current acquired runner picture/current shade,
  not the future intercept as another moving target. Keep bonded ownership.
- Preserve false-rescue removal versus earned renewed WR blocks, adverse OZ4,
  ordinary assist/PA/recognized-flight controls, WZORD Mike approach and delayed
  fresh FS contact. None of these local repairs certifies an explosive-tail fix.
-106's resumed failed/wall-cache accounting repair stays separate; publish its
  minimal pin to Measurement without running3198 cases or replacing newer tooling.

### Do-It-All!

-175: publish a fetchable exact nonauthor disposition if already completed;
  otherwise request its narrow read-only installed-duty review. Native benefit
  remains unproved because both saved ordinary OZ prefixes are identical.
-176: make the reported independent narrow acceptance and intended readiness
  discoverable at the actual reviewed code9ae5a737; preserve AFTER-04 lost edge
  and AFTER-14 defender fall/helped tackle0.10s later. It does not require175.
-183: link the existing `middle_evidence` review at its exact runtime7749e37a;
  readiness is now labeled. Preserve the unchanged constraints, actual earned
  strike/tackle and later contact/load changes. No repeated native campaign.
-186 is now published with its independent review, rather than still unfinished.
  Supply its net increment after183 (bb458e8b/5402d71d/5248e884), keep183 once,
  and assess its newly enabled pursuit scope with182's owner. Existing A008,
  A042 and A044 recordings do not cover that composition or historical later
  offensive blocking. Retain A044's worsened H/NB geometry and A042's no-benefit
  result. A008's .810s versus accepted .691s is a single-capture cost, not a
  representative benchmark or an established budget failure. Integration must
  explicitly disposition residual cost; do not presume180's speed offsets it.
- Review the goal/picture/projection/route seam with Catching and Physics.
  Keep held166 material-progress policies and old discovery ancestry out;
  neither is a dependency of183,182 or the portable186 increment.

### Physics Sim

-180's final runtime is `f96a85fdd818b6fd860554e7a9881083ae0dd60c`, source
  `03233b05ba0cbdfc1fe4fe6787caec2dc41fe4b09ef07726917c3edf0f9ebee1`.
  Keep its current independent readiness/cost disposition attached; do not
  describe it as still blocked by the superseded1.267x paired-p95 result.
- Reuse1024 exact numerical parity cases,94-tick native parity and the final
  unchanged wall gates (Toss median/p95 .9083/1.0169; Pass .9253/1.0254).
  These are Node/tsx prefix-batch costs, not all-input or compiled speed claims.
- Confirm the adopted boundary is ordinary yaw target/response and peak-torque
  recovery allocation, with World/stepBody compatible. If an adoption decision
  changes physical/default policy, flag that exact decision to Integration;
  do not silently expand into165, GAIT_STEP, capacities or solver replacement.
- Preserve later Toss contact, the censored pass and loaded-slip adverse case.
  State that84.4% is correction-amplitude reduction, not fewer full spins or
  solved travel-heading jitter. Keep moderate-speed propulsion/gait research
  separate. No repeat cost benchmark for unchanged source.

### CEO of Football / rules owner

-178's coherent runtime/detector/caller patch has its own full passing receipt
  atad494e5c. Supply Integration that exact protected-file/settings mapping and
  the existing nonauthor rules/caller dispositions; do not split away callers
  needed to prevent an illegal gain/score from standing.
- Review its shared PlaySim lifecycle with184 and actual-load foul evidence
  with174. Preserve legacy holding's randomness and the distinction between
  physical replay, called incidents, enforcement choices and official credits.
-173 is a dated accepted-source inventory. If both are adopted, add a small
  current implementation note/link so its singular-penalty/no-OPI statements
  are not mistaken for post178 behavior. Retain original source fingerprints.
- Keep unsupported holding legality, DPI/contact detectors, multi-possession
  credits and complex combinations explicitly limited. No full-NFL-compliance
  claim or new foul-rate campaign. Prioritize adoption questions without making
  every rules or Physics gap a condition of all controller progress.

### Measurement Man

-179 is completed at8a76ab9a:12/12 measured, zero exclusions,4.986239s;
  four archives and consumed CSVs verified. No remote-data-holder action or
  duplicate query/download remains. Preserve the all-play/exposure accounting.
- Apply the result to the named useful-blocking/arrival question:41/75 observed
  plane arrivals occur after first contact, so interposition at those arrivals
  cannot prove prevention of the earlier contact. NFL geometry is not assigned
  responsibility, a labeled blocker engagement, gaze, grip or force.
- Deliver existing source-qualified observations directly to174/185/Catching
  and Integration. Keep the six original172 native arms/censors separate from
  newer174 combinations and any eventual integrated source.
- Independently review101/106 accounting repairs when exact pins arrive using
  tiny failure stubs. Preserve completed P045 and restricted AMF work. No new
  collection or broad comparison is requested by this audit.

### Claude / research author

- Keep153's experiments and evidence intact. Existing169/171/174/177/180/181–186
  successor boundaries do not justify importing153's settings/other hunks.
- When continuing FORCE_LEAD or mesh/climb/lead/trap work, publish the smallest
  genuine dependency group with exact producing source/settings/inputs and
  existing AFTER-04/14/adverse witnesses. Coordinate with Run and current
  force-fit owners before duplicating175/176 or185.
- UC mesh scheduling and exchange execution can be genuine dependencies;
  shared files, contemporaneous experiments and improved pooled TVD are not
  dependency proofs. Missing or pending SPACE_STEER=2/TRAP_READ arms remain
  unrun/unavailable until actually published, not favorable evidence.
- No full research merge,31 new flag registrations, .6s administrative
  re-grab immunity, GAIT_STEP activation or new broad lab to clear this batch.

## Older open work: preserve, do not silently integrate

The remaining53 open PRs are included individually in the inventory:

- Explicit recent holds:137 joint allocation;158 installed-gap/PA tradeoff;
 162 historical yaw (180 is the new extraction);163 propulsion/caller;
 164 loaded arrival and165 attained-pose gait (both removed after168's
  combined failures);166 broad objective/traffic. Their old passing component
 receipts do not clear the later combined contracts. A changed exact minimal
 candidate or independent disposition is needed, not automatic resurrection.
- Tooling101/106: pending accounting repairs, independent of runtime batch.
- Diagnostics/planning154/142/139/129/113/109/93/86: reusable evidence or plans,
  not new engine corrections waiting for production adoption.
- Research/prototypes153/127/119/116/115/114/99/83/79/77/76/73/71/70/68/66/
  56/55/52/51/50/47/41/36/34/4/2/1: preserve their individual holds, dependencies
  and historical artifacts. No current independently ready promotion was
  established by this inventory. Some have accepted successors or scoped
  extractions; open status alone does not imply their full remaining diff belongs.
- Earlier stack/extraction records67/64/61/60/58/57/29/13: compare a proposed
  surviving hunk with current accepted implementation and published successors
  before calling it missing. Do not re-import old parents for code already
  delivered. This audit does not close PRs or delete their branches.

## Completion criterion

Eight owner-addressed instructions were posted on168 (Integration),174 (Run),
182 (Catching),186 (Do-It-All),180 (Physics),178 (rules/CEO),179 (Measurement)
and153 (Claude). Exact comment bodies were read back successfully;
[delivery receipt](../../data/reviews/current/integration-overlap-audit/delivery.json)
records the links. Delivery is not acknowledgment, technical acceptance or an
assumption that an idle owner is running. Direct chat messaging is unavailable
in this tool session.

The next checkpoint is ready when chosen scopes have exact reviewable pins,
the two reconciliations preserve both owners' contracts, duplicate172 is absent,
the actual assembled source has its required passing receipt, and the adopted
pin/included/held/adverse handoff is published. That is achievable without
waiting for universal football realism or merging every historical PR.
