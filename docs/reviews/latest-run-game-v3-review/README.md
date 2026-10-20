# Latest run-game v3: scoped independent integration review

Reviewed research **`6184040fb0e2190b8799a2bd925df9e8af6494da`** on
accepted **`f4146275ce7539816bf57b4ed55a0d2be10e48c7`**. The actual merge
base is that accepted commit. Reviewed runtime SHA256 is
`0217d437fa8ca0dd526ffa479150a9974e0ca254125f9c0a19785d9b2397f53a`.
This is a documentation/portable-patch publication, not a merge or activation.
Runtime, settings, existing tests and tooling in the publication remain accepted.
[Exact blobs, extraction trees and checksums](manifest.json).

## Useful immediate extractions

### ACCEPT the precision encoding/viewer pair; complete native recording separately

[viewer-precision.patch](viewer-precision.patch) is the exact three-file delta
from the reviewed research: `scripts/replay-data.ts`,
`viewer/replay.template.html` and `test/replay-export.test.ts`. It adds an
explicit frame scale of 100 and retains legacy missing-scale/scale-10 decoding.
It preserves existing event/telemetry/time/carrier meanings. No flags or
simulation mechanics change. Existing replay-export checks: **21 pass**.

**A missing upstream piece matters:** accepted and latest research
`PlaySim.recordFrame` still round native agent/ball data to tenths before
`packReplayPlay` sees it. Encoding those numbers as hundredths does not recover
lost native detail. NFL/external fixtures already containing hundredths benefit;
the original exporter patch alone cannot substantiate a finer native film claim.

[native-recording-precision.patch](native-recording-precision.patch) supplies a
separate minimal completion for Integration's review: use existing `round2` for
native agents/facing/ball, remove unused `round1`, and add two zero-tick pipeline
and legacy-decoder checks. It does not move bodies, change observations available
to agents, contacts, statistics, capacities, flags, sampling cadence or frame time.
This observation-only completion is independently identifiable rather than
silently attributed to the author. The new pipeline check fails against the
original recorder and passes after completion. Combined focused result:
**23 pass**, including native recording → packing → actual viewer decode and
old/unscaled/explicit-tenths clips beside new clips. This is data preservation,
not evidence that controller jitter is repaired. Existing archived film remains
unchanged; new precision cannot restore old rounded recordings.

### ACCEPT the narrow carry-out direction correction for Integration verification

[qb-carryout-direction.patch](qb-carryout-direction.patch) extracts only the
original side-selection correction from QB_CARRYOUT, without a new flag or the
moving-exchange feature. The accepted comment already says carry the fake away
from the play. Its current sign comes from the QB's accidental offset relative
to his mesh point; after crossing that point the request goes toward the play.
The correction derives away from the installed run direction/formation strength.
The installed play is the QB's own information. Depth remains LOS−6, destination
four lateral yards away and speed `.4`; no strength, extra information or
movement law changes. Calls with no installed run retain the original fallback.

This is a routine direction bug fix, not promotion of UC_MESH/QB_CARRYOUT's
pocket/drop timing experiment. It has no runtime dependency on any branch flag,
GAIT_STEP, formation correction or other PR. It changes only QBHandoff's existing
post-transfer branch. Four real-controller strong/weak/mirrored checks fail on
accepted source and pass with the correction; a pre-exchange/no-run fallback
control passes both. **Five checks pass; zero World steps.** The initial local
fixture incorrectly demanded movement at time 0, where the preserved pivot
requires standing; that setup failure is retained and was corrected to time .1.

The larger package's faster handoff, spacing rates, gains and NFL comparisons
are not evidence for this isolated direction change. No new native benefit,
full-game fake effectiveness or reduction of all QB/RB interference is claimed.
Integration should preserve this scope if combining it with other QB changes;
it must not pull in the new constructor, pocket, through-speed or drop code.

## Held scope and actual dependencies

| Scope | Current disposition and smallest boundary |
| --- | --- |
| UC_MESH | HOLD experimental installation. `assignBehaviors`/`meshFor`: deeper ordinary under-center spot, own-body meeting time, back ride; QBHandoff through-speed is separate required plumbing only if that speed is retained. Draw exclusion is repaired. Full geometry/timing activation remains separate. |
| MESH_TEMPO | HOLD. RunnerToMesh wait/start/ride scheduling in `assign.ts`; shotgun scheduling is independent of UC. Under-center gate now requires UC because original installed OZ/WZ times plus stopping QB lose the tested gives. A compatible meeting is a functional dependency; it does not prove every UC depth/time/through constant necessary. |
| GUN_MESH_SIDE | HOLD separately. `meshFor` gun RB point only; no hard dependency on scheduler. Original 2×2 must distinguish geometry-only and combined effects. Adverse gun-OZ remains. Formation #156 changes the starting point, so old native tapes do not validate that composition. |
| QB_CARRYOUT moving exchange | HOLD. Constructor through-speed, pocket side/offset, no stand on give tick, eight-yard deep straight drop are excluded from the narrow direction patch. Part6 tests and package arms support investigation, not automatic activation. |
| PACE_LEAD | HOLD. `carrier.ts` helper plus its existing lead-press branch; structurally independent of mesh/QB changes, but published native comparisons are on that package. Three arithmetic checks do not independently establish achieved clearance when the crossing blocker changes motion. No universal runner pace promotion. |
| DEPART_TEMPO | HOLD. `blocking.ts` captures departure origin, adds climb tempo to old-man flow and advects the exit with that augmented velocity. This changes the desired point beyond the selected exit, not merely its travel speed. Existing mirrored first-departure checks assert a larger along-chord request; they do not establish achieved clearance around the old defender or preservation when the backer closes. Reuse saved w9 and an opposing loaded/obstructed case for that question, not a lab rerun. No DRIVE_CONNECT code dependency, although published arm contrasts use it. |
| FB_TRACK | HOLD. Plan lane for under-center backfield lead/kick plus an initial lane stage in `RunBlocker.engage`. No direct source dependency on GAIT_STEP or OL_ALIGN, but the installed lane changes arrival/protection. Published negatives worsen Power34→57, Counter29→67 and Trap23→54/400. #163's saved composition still fails to unblock it. Earlier kick loading is not sufficient protection. |
| OL_ALIGN | HOLD. Global offensive stance/split geometry, defensive gap landmarks and legacy hole/aim mapping are one coordinated installation scope, not a local puller constant. Counter negatives66→125/400 and trap4+193→154 persist; pass protection under this geometry remains unmeasured. |
| ZONE_TE | HOLD full feature. The near-surface return to ordinary fit is a supported repair to the held experiment, not approval of its activation. Gun-IZ protection remains adverse and the later drive-line mechanism is unresolved. |
| DRIVE_CONNECT | HOLD under existing independent review pending its one selected adverse OZ attribution. `stepRunRep` non-stretch forward-request blend only; no hard dependency on mesh, DEPART_TEMPO or physical-law changes. Preserve original forward drive and existing seal/anchor/contact budgets. Review [7f3b30fb](https://github.com/tannerthardy/football-simulation-/blob/7f3b30fbf0eddf443cf5f961304403f2d6748a28/docs/reviews/pr153-part5-controller-review.md): first native change is RT/DE at.60s, not exclusively the later LG/LB block; OZ40+10→22/400 remains unresolved. |
| LB_KEY | HOLD; reject current actor association. The earlier keyed-fullback mismatch is repaired, but remembered contradicted mesh can label a current RB picture as QB. `run-fits.ts` remains at the failing reviewed implementation. Do not import it beside newer acquired-support scopes. |
| STRETCH_FLAT | HOLD. Global x clipping changes normal/tangent components on a rotated contact surface. Prior controls do not certify runoff/recovery preservation. |
| SHED_PURSUE | HOLD both hunks separately. Existing [contact review](https://github.com/tannerthardy/football-simulation-/blob/fed3de03f1d47d7964235cb8dfe7ee2c854deb11/docs/reviews/shed-pursue-independent-review.md) preserves contradictory possession/held-mode conflicts and unproved administrative-end→.6s reachable re-grab prohibition. Both native toggles change together; neither ending isolates either hunk. |
| BACK_CHASE / RUN_LATERAL / DEEP_CAP / DEF_GETOFF | Separate experimental behavior/capacity/latency changes. Not included by implication in the latest analysis. GAIT_STEP and #162/#165 receive separate mechanical review; they are not prerequisites for the precision/direction corrections. |

The source heads retain earlier work and rejected trials rather than making a
single integration-ready package. Prior reviews of the repaired UC draw and TE
near-surface guard are reused; no duplicate controller review or test rerun is
needed just to republish those unchanged decisions.

## Diagnostics: preserve but do not import wholesale

The new branch tracer and relative-path usage lines are useful research tools.
The current `scripts/diag/stretch/instrument.sh` is **not acceptable as a shared
preservation-safe launcher**. When DIR already names a checkout, it detaches it,
then executes `reset --hard` and `clean -fd`. This can erase local work in a
worker's existing checkout, and conflicts with repository instructions. It also
uses `ln -sfn` in reused directories. A portable launcher should require a fresh
nonexistent destination, create only its own detached scratch worktree, and fail
on existing paths; no cleanup/reset of a caller-supplied checkout is needed.
Do not run this script on an existing worktree to review it.

`arm.mjs` usefully pins registered settings and source/tool hashes, but removes
previous same-label shard files before running, and its captured dirty-patch hash
does not publish the actual patch. These manifests are provenance observations,
not a reason to overwrite prior evidence or claim exact restoration from a hash.
The broad diagnostics depend on the branch's lab helpers and flag inventory;
copying every script would unnecessarily broaden this engine checkpoint.

Part8 manifests disclose dirty runtime files and explicit experimental flags.
Their reported source hashes, reverted experiments and saved patches must stay
with those arms. The `k0` arm uses the held mesh package, not accepted develop.
Do not relabel its body-motion evidence as the current accepted controller tree.
The six rejected steering experiments remain saved in
`docs/reviews/run-game-v3/part8/experiments-off.patch`; local scratch combinations
of #162/#164/#165 are not published evidence or integration dependencies.

## Cost, evidence and next decision

New work was bounded to source/ref review, portable extraction, 21 existing
export checks, two pipeline/legacy checks, five direct controller checks and
necessary failing-source controls. **7.759 seconds** summed receipt wall time,
including one corrected test setup and expected failures. No World steps,
continuations, rosters, NFL scans, lab arms, games or shared-suite rerun. One
initial command referenced an obsolete Node path and did not launch; all actual
receipts use Node22.23.3, the44accepted settings and components=1.

- [Exact exporter receipt](viewer-focused.json).
- [Complete precision receipt](precision-pipeline-focused.json) and
  [retained original-recorder failure](precision-upstream-failure.json).
- [Direction receipt](qb-carryout-focused-final.json),
  [accepted-source failures](qb-carryout-accepted-failure.json) and
  [corrected test setup](qb-carryout-test-setup-failure.json).

Next: Integration can review the two tiny completion/direction hunks, include
compatible approved corrections in its exact candidate, and own combined
verification once. Do not activate the research package merely to accept its
precision or installed-direction repair. The named remaining blockers hold their
own scopes; no new game campaign is requested.
