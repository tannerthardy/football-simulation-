# Independent Run/controller review of #153

Follow-up at`8d3c41f2`: see the [response review](pr153-run-controller-response-review.md).
The dispositions below preserve the original`1c578afb` review. The follow-up
recognizes repaired contracts, corrects the under-center dependency assessment,
and records one remaining actor-identity defect.

**Do not promote the package. No proposed changed runtime scope is accepted for
extraction at this pin.** The scheduling idea is reasonable, but its independent
football evidence is incomplete. Two specific experimental defects can already
be rejected. This is a disposition of evidence and code, not a demand that old
yardage or an NFL histogram be preserved.

Reviewed [PR153](https://github.com/tannerthardy/football-simulation-/pull/153)
submission`1c578afb38f2eb6fc4886639e63fccc4e79c4354`, runtime
`c8d638086e69961de2ff45d41df0a9871947ca83`, accepted base
`f4146275ce7539816bf57b4ed55a0d2be10e48c7`.
The submission and runtime source/test/config trees agree. Merge base is exactly
accepted develop. [Intake packet at9a6bb795](https://github.com/tannerthardy/football-simulation-/blob/9a6bb795179a4b2e61ed59d25bcf23ca5e40f423/docs/reviews/run-game-v3-review-intake.md).
This reviewer is independent of the author. No source/default/law/capability,
recovery implementation, feature activation or historical baseline change.

## Exact dispositions

All source line references below are at the pinned submission, not this
documentation branch's accepted engine. HOLD means the stated missing evidence
could change the decision; REJECT identifies a demonstrated defect in that scope.

| Exact scope | Decision | Reason / smallest unresolved question |
| --- | --- | --- |
| `MESH_TEMPO` arrival scheduling: `assign.ts` ordinary-run `tempo` gate, flag, default-false constructor field, `going`, update branch298–312 and existing `runThrough`/`timeToReach` imports | **HOLD** | Uses installed cadence, own position/velocity/profile/speedScale and acquired QB bearing while settling; no opponent assignment or future path is read. It requests ordinary motion, not extra force or a guaranteed exchange. However the saved UC football comparisons include UC_MESH and the power adverse is unresolved. Need an accessible selected paired mesh/power witness, then scheduling-only comparison only if existing evidence cannot separate it. Higher handoff speed alone is not sufficient. |
| `MESH_TEMPO` shotgun RB spot: `assign.ts:225–229`, from playside`(-4.4, .9)` to own-side`(-4.6, .7)` relative to LOS/ballY | **HOLD separately** | Own-side exchange is a valid installed technique and can avoid a route through the QB. `mtrtf` vs`mt2tf` is the author's intended geometry contrast. But producing-source/settings and a shared native command/spacing witness are missing. Neither the93% NFL IZ observation nor package outcomes proves this fixed point appropriate for every gun concept. Read the known back's own initial side, preserve normal spacing and real transfer reach; do not prohibit a legitimate across-face installation by inference. |
| `UC_MESH` ordinary under-center IZ/gap depth (`assign.ts:217–218`) | **HOLD** | A deeper installed exchange is plausible; OZ/WZ already use4.4/5.0yd mesh landmarks on accepted source. No hard scheduling dependency. Need to separate its geometry from time, riding and QB motion; NFL depth median alone does not prove the old installation erroneous. |
| `UC_MESH` under-center time (`assign.ts:231–236`, snapReadyAt + .2 + timeToReach, clamped to called minimum) | **HOLD** | This is an approximate own-team installation forecast, not an actually executed pivot or a proof of reachable meeting. It ignores facing/traffic/contact and zeroes initial velocity. No demonstrated law defect follows if it is optimistic. Not needed to execute the scheduling algorithm. Keep called delay and actually achievable QB/RB arrival distinct. |
| `UC_MESH` ordinary-run QB through-speed/default-zero QBHandoff parameter (`assign.ts:243`; `qb.ts:620–623,671–676`), and inside-mesh RB ride (`assign.ts:241–242`) | **HOLD for ordinary runs** | These may improve a moving exchange, but are separate policy changes, not automatic prerequisites. MESH_TEMPO's own branch already rides through without reading `ride`; its code does not consume the QB through-speed. A nonzero speed passed by UC_MESH logically requires the new QBHandoff parameter/uses; scheduling/shotgun geometry do not. |
| `UC_MESH` applies that time/through policy to under-center **draw** | **REJECT as submitted** | `underMesh` excludes only toss. Draw excludes RB ride, but still receives QB through-speed and potentially the new time. A zero-World-step production-controller check in both orientations changes the near-mesh QB request from stop to backward3.866yd/s. The existing draw test checks only `.tempo === false`. Preserve the accepted draw QB arrival behavior before reconsidering this scope. |
| `ZONE_TE`: `blocking.ts:841–845` surface eligibility plus1041–1045 inside-shoulder response | **HOLD** | Lateral-first TE technique can be right, but these two general hunks have unresolved useful-protection costs. The report shows weaker gun-doubles IZ results with this flag alone and later/separating TE contacts in its selected stretch losses. Do not accept reduced long runs if produced by losing useful offensive work. Nor does a changed gain prove the technique wrong. Need the selected acquired target/footwork/spacing/contact/runner-arrival comparison from a gun adverse and successful Ace opposing control. |
| `STRETCH_FLAT`: `engagement.ts:1161` global-x negative-request clamp | **HOLD** | Ordinary force budgets/anchor remain intact. But this is a blanket field-depth rule for every qualifying stretch surface, not merely a correction of one mistaken retreat. In a rotated surface frame, clamping global x changes both normal and tangent requests. Existing vertical-axis assertions verify the clamp, not preservation of useful runoff or attainable recovery. Need one selected backward request's runner-route/protection explanation and a legitimate recovery/runoff opposing control. No additional strength or Physics repair is justified by this evidence. |
| `LB_KEY`: `run-fits.ts:318–322` home/step/flow cue | **REJECT as submitted** | It subtracts the RB's home from a `seen` picture that may belong to a keyed fullback. With a stationary offset F, the real ManCoverage production hook invents first-step flow in both directions. Prior reproduction is reusable: run-fits.ts, its production caller and relevant blocking source are byte-identical to the previously reviewed dcb47f9 source. Pair the acquired actor with that actor's legitimate starting reference; keep opposite/uncertain/misdirection duties. Do not bypass the production hook. |

**ACCEPT as preserved contracts, not new feature promotion:** MESH_TEMPO's
existing draw/toss exclusions and qbDraw bypass with UC off, real transfer/pitch
reach, and the personally observed failed-exchange secure-and-carry decision.
These constraints do not require adopting any experimental flag. The new
default-zero QBHandoff parameter leaves the accepted fallback conditions intact;
the small direct check also preserves recovery with a positive through value.
No renewed late-QB chase, extended reach or guaranteed handoff is accepted.
The draw rejection preserves the requested scope; it does not claim that every
possible moving-QB draw installation would be unrealistic.

SHED_PURSUE's acquired intent and new re-acquisition trigger remain the
Physics/contact reviewer's two separate decisions. DEEP_CAP/BACK_CHASE/
RUN_LATERAL/nonidentity DEF_GETOFF and shared gait/contact flags are outside
this review's adoption scope. They are not dependencies or remedies prescribed
by these dispositions.

## Dependency conclusion

**UC_MESH is not a demonstrated prerequisite for either MESH_TEMPO hunk.**
The scheduler consumes the installed `mesh`, `meshTime`, `aim` and own body;
accepted source already supplies them. The gun geometry hunk is in a separate
formation branch from UC_MESH. Under-center QB motion can be stripped from a
scheduling-only proposal by retaining the accepted four-argument QBHandoff call.
No blocking or shedding flag appears in the dependency chain. Shared imports or
one flag registration do not establish a football dependency.

The author's UC tests use UC_MESH=1 for both arms. They therefore show a marginal
scheduling effect **in that installation**, not that the scheduler needs the
deeper spot, revised time or QB through-speed. The `mt` report likewise enables
both UC_MESH and MESH_TEMPO. Failing to rescue UC_MESH's exposed OZ/WZ losses is
not evidence that the stretch flags are necessary components of a correct mesh.

Within UC_MESH, the changed QB through call requires its interface field,
constructor parameter and two goTo uses if kept. The depth/time/ride choices are
otherwise independently selectable installed policies. A final minimal proposal
needs distinct settings or fixed extraction boundaries for scheduling and gun
geometry; today's single MESH_TEMPO flag cannot activate them independently.

## Material adverse evidence

**Power tail:** `report-rec2gap.txt` to`report-mtrgap.txt` reports18/400 to40/400
40+ power runs (4.5% to10.0%); adding SHED_PURSUE reports33/400 (8.25%). Accepted
`d0gap` is17/400 (4.25%). NFL reference is3/237 (1.27%), with different sampling.
These are marginal counts in reported arms, not22 identified paired-case errors.
The apparent marginal change is MESH_TEMPO in the UC/package context, pending
producer provenance. It is material and cannot be dismissed as noise without
analysis. Nor is it automatically a bad controller decision: a properly timed
runner can expose an existing pursuit, fit or block lifecycle problem. Published
rows do not establish whether the additional breakaways follow legal exchange
and useful blocking, an error in timing/protection, execution draws or downstream
defense. **Do not cap the runner or accept/reject his speed from the histogram.**

**Gun TE:** with ZONE_TE alone the reported gun IZ negatives rise6.0% to10.5%,
4+ falls40.5% to33.5%. Stretch-loss traces report later initial contact and more
separation endings. The latter are conditioned on losing plays, not a matched
estimate for all TE blocks. They flag a real review risk, not proof that every
changed defensive win is illegitimate. The proposed correction needs to show
role-appropriate achieved position/load controlling defender access through
runner arrival. Requesting more sideways motion is insufficient.

Keep ace10+ falling to6.2%, the unresolved middle and the standalone
SHED_PURSUE adverse rows visible. Do not offset these with improved aggregate
TVD. Existing NFL comparisons remain supporting descriptions, not calibrated
causal tests. No new NFL scan was needed for this disposition. Measurement owns
first-contact/whistle/proximity/sample-mixture qualification; this review does
not recertify those statistics or the claim that remaining problems must be Physics.

## Verification, reuse and smallest next handoff

The [small packet](../../data/reviews/current/pr153-run-controller-review/decision.json)
contains exact flags/source/checksums, logs, portable test text and this decision.
Current source hash matches intake:
`013858af1c0313799995e10bdfe1d70358744e707ba9bb5844dab81db966f3d8`.

New work: **six direct controller/installation checks, four pass and two draw
preservation failures**, Node22.23.3,2.207s command wall. **Zero World steps,
native continuations, games, lab arms or shared-suite runs.** The two failures
are retained; this is not a passing verification receipt. Test source separately
marks interpreted cue staging. The candidate source remains unchanged.

Reuse: the previous20 focused assertions and two LB production-hook failures
retain their original source/pin/settings/cost; the unchanged code paths support
the latter rejection, not a new whole-engine verification. Author's1913 core/
typecheck and1200 flags-off rows remain contributor evidence, not independently
rerun or silently recertified here. No activation or merge is requested.

**Next handoff to author:** publish the already-saved selected mesh witness and
opposing control, one adverse power and one gun-TE case, with input/roster,
observer initialization, RNG/settings, producing source/operator and checksum.
Link`mtrtf`/`mt2tf` to their actual intermediate code; do not label both final
source. No new census or indiscriminate raw upload. These are the missing
accessible witnesses already requested in the intake.

Only if those saved cases cannot decide scheduling or geometry independently,
request a bounded isolated comparison on the selected state plus its relevant
opposing control. It must change one of these HOLD decisions and preserve all22
ordinary reactions, spacing and real transfer. Do not add another package or
Physics/gait trial. Until then these are precise evidence holds; the two rejected
defects can be repaired independently. Integration alone owns any later exact
combined verification after an independently accepted minimal candidate exists.

### Reproduce the zero-step contract check

Export this pinned source into an ignored review snapshot (no checkout or Git
worktree change), reuse matching installed dependencies and Node22.23.3, and copy
`contracts.test.ts.txt` from the packet to that snapshot's
`test/pr153-review-contracts.test.ts`. Apply the snapshot baseline environment
with `environment(process.env)` from its`scripts/baseline.mjs`; the test explicitly
sets UC_MESH/MESH_TEMPO for each arm. Run only that test with Vitest core,
one worker. The archived runner text shows the exact execution and source-drift
check. Two draw assertions are expected to fail at the reviewed pin.
