# Run-game v3 — independent review intake

Prepared 2026-10-19 UTC. [Draft PR #153](https://github.com/tannerthardy/football-simulation-/pull/153)
preserves the author's complete research branch. **Review preparation only:**
no runtime acceptance, flag activation, integration freeze or merge. Integration
has run zero engine ticks, code tests, lab arms or games for this intake.

## Exact scope and evidence

| Reference | Full pin / status |
| --- | --- |
| Accepted develop, freshly checked | `f4146275ce7539816bf57b4ed55a0d2be10e48c7` through #151; unchanged |
| Research head | `1c578afb38f2eb6fc4886639e63fccc4e79c4354`, `claude/run-game-v3` |
| Latest runtime checkpoint | `c8d638086e69961de2ff45d41df0a9871947ca83`; final head changes documentation only |
| Earlier implementation checkpoints | `ee7fb77ad12aa47ccaaf900fd366fbe3ff534f51`, `afdd134b1f59f8a08a74a74f19da93bb28208c13` |
| Actual merge base | Exactly accepted `f4146275…`; five new commits, no older experimental parent |
| Historical comparison | `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`; unchanged |

The branch changes 140 files: six runtime files, five new test files, one flag
configuration, diagnostics, reports and its workboard row. It does not change
`src/physics`, `src/players`, dependency files, the verifier or test-project
configuration. All 44 existing configured values remain; ten registrations add
nine off-by-default experiments and diagnostic `DEF_GETOFF=1` (identity scale).
Do not merge the entire branch merely because experiments default off.

- [Author's report and original interpretation](https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/docs/reviews/run-game-v3.md).
- [Part 3 observations, geometry, re-latch counts and arm labels](https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/docs/reviews/run-game-v3/part3.txt).
- [Gap-scheme adverse results and rejected arms](https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/docs/reviews/run-game-v3/part3-gap.txt).
- [Earlier hold observations](https://github.com/tannerthardy/football-simulation-/blob/1c578afb38f2eb6fc4886639e63fccc4e79c4354/docs/reviews/run-game-v3/holds.txt)
  and [superseded reports](https://github.com/tannerthardy/football-simulation-/tree/1c578afb38f2eb6fc4886639e63fccc4e79c4354/docs/reviews/run-game-v3/superseded).
- [Machine-readable intake, file hashes and source/flag fingerprints](../../data/reviews/current/run-game-v3-review-intake.json).

## Independent decisions, smallest extraction boundaries

These are review questions, not a new mandatory test matrix. Start with saved
evidence and source. Any additional check must change the next decision under
[TESTING_COSTS](../TESTING_COSTS.md).

| Scope | Smallest code boundary | Review decision / dependency |
| --- | --- | --- |
| `MESH_TEMPO` | `assign.ts`: flag, `RunnerToMesh` scheduling/pass-through, ordinary-run constructor gate, shotgun mesh hunk; direct tempo tests plus only its registration | Scheduling and own-side geometry are distinct decisions. Neither runtime hunk directly requires `ZONE_TE`, `STRETCH_FLAT`, `LB_KEY` or `SHED_PURSUE`. Under-center tests currently use `UC_MESH`; do not imply standalone football evidence. |
| `UC_MESH` | `assign.ts`: under-center spots, own-body time, ride, `qbThrough`; `QBHandoff` default-zero through parameter/use; own tests/registration | Separate depth/timing/QB movement proposal. Decide compatible installed timing and draw/toss/keep behavior. It is experimental context, not an automatically approved tempo prerequisite. |
| `SHED_PURSUE` intent | `engagement.ts`: acquired carrying/post-LOS extension of shed-attempt gate; direct contract and its registration | Can positive acquired possession justify working off at longer range while existing hand-fight/contact determines success? No dependency on the mesh or stretch flags. |
| `SHED_PURSUE` re-acquisition | `engagement.ts`: `shedBy` update on runner-passed rep end, with direct contract | Separate decision: does this ending justify the existing **0.6-second** same-blocker prohibition? An actual shed uses that delay already; the runner-passed ending does not itself prove a shed occurred. The change affects legal re-acquisition, even though body collisions remain. |
| Earlier package | `ZONE_TE`: two blocking hunks; `STRETCH_FLAT`: blocker normal request; `LB_KEY`: acquired first-step cue | Each needs its own nonauthor mechanism/adverse-case disposition. Shared files do not make them logical prerequisites. Do not accept all four older flags through the two newer ones. |
| Parked alternatives | `DEEP_CAP`, `BACK_CHASE`, `RUN_LATERAL`, nonidentity `DEF_GETOFF`; existing physics/pull arms | Not proposed for the immediate controller candidate. No capacity/default/law change or activation authorized. |

The shared `run-game-flags.test.ts` combines four proposals: extract only the
relevant imports/helper/describes after disposition, not unrelated contracts.
Both new shed hunks are behind one flag today; independent review must explicitly
accept both or request an author-supplied smaller extraction. No alternate
implementation or promotion patch is being invented during intake.

Actual overlaps to recheck when composing: accepted #135 receiver forecasts and
#136 `QBHandoff` recovery in assign/QB; accepted #138 support intent/contact
lifecycle; accepted #126/#140/#143/#146/#147 blocking contracts; accepted #134
mesh contradiction in run-fits. Pending #141 also touches assign/run-fits and
#150 blocking. None is an implementation prerequisite; only accepted scopes
may enter a candidate. Other blocked work holds itself.

## Findings to preserve and qualify

- The published re-latch trace records **644** DL runner-passed endings and
  **492** same-blocker, in-front re-engagements within a tick, plus two at the
  side. With the flag, those same-blocker categories disappear, while other-
  blocker re-engagements remain. LB in-front repeats are 79. This is evidence
  of repeated lifecycle transitions; whether preventing a particular reachable
  grab is correct still needs adjudication. Do not report that every instant
  re-engagement vanished.
- Reported DL still-in-rep at crossing +1s drops **70% to 37%**. This differs
  from the roughly **80%** proximity-to-blocker proxy, which remains high.
  Neither proxy alone proves NFL-equivalent freedom or pursuit execution.
- Reported under-center IZ handoff speed **2.24 to 4.37 yd/s**, NFL **4.43**;
  shotgun IZ **1.25 to 2.30**, NFL **3.82**. Those rows come from named package
  arms, not isolated proof that every mesh hunk helps. NFL own-side IZ frequency
  is evidence for review, not a universal rule for all shotgun concepts.
- Proposed six-flag package `UC_MESH MESH_TEMPO ZONE_TE STRETCH_FLAT LB_KEY
  SHED_PURSUE` reports TVD **0.161 to 0.159** (ace), **0.145 to 0.135**
  (zone transfer), **0.125 to 0.118** (gap). Preserve **power 40+ at 8–10%**
  versus reported NFL 1.3%, **ace 10+ at 6.2%** versus 13.1%, weaker/delayed
  `ZONE_TE` gun-doubles protection, and larger cap-on box leaks.
- `SHED_PURSUE` alone on develop reports 40+ **3.75% to 4.25%** and TVD
  **0.161 to 0.166**. Its package outcome effect is small-count evidence;
  no formal uncertainty analysis was found in the cited report. No general
  yardage improvement or statistical equivalence is established.
- A double-team displacement gap, slow achieved pull/flow, short held-carrier
  intervals and slipping open-field holds are observations/hypotheses for
  their owners. They do not prove that controller investigation is exhausted
  or authorize Physics changes. Counterfactual `GAIT_STEP` affects every body.

Integration confirmed the sim emits first contact for opposing body collisions
as well as tackle events. **That does not establish identical NFL event
labeling**, sampling/time origin, end/whistle definition or conditioning.
The 0.8-vs-1.4s comparison and physical-cause claims need Measurement's qualified
interpretation. Likewise, an NFL distance-based blocking/contact proxy is not
the engine's engagement or continuous hold. The pooled TVD mixes a fixed lab
concept/look/roster design with an NFL sample: per-concept and population
differences matter; matching the pooled histogram is not the objective.

## Review handoffs — copyable bounded requests

**Run/controller reviewer, independent of the author:** Review #153 at the
pins above. Decide MESH_TEMPO scheduling and shotgun geometry separately from
UC_MESH depth/QB-through timing, and disposition the older ZONE_TE/STRETCH_FLAT/
LB_KEY contracts separately. Reuse existing tests and saved adverse power/gun
evidence; identify a real dependency before bundling. Preserve accepted exchange
recovery, draw/toss/keep and ordinary legitimate defensive wins. If existing
evidence cannot settle one question, request only its smallest reproducer and
one opposing control. Return exact accepted hunks, held hunks and rationale;
no full suite or broad lab.

**Physics/contact reviewer with Run consulting:** Review SHED_PURSUE's two
hunks independently: acquired post-LOS shed intent and 0.6s same-blocker lockout
on a runner-passed ending. Is the latter a supported lifecycle correction or
an artificial immunity interval? Inspect original reason/count evidence and
the existing shed/eligibility contracts, including reachable useful re-acquisition,
cooldown expiry and body contact. Reuse controls where available; do not create
a required matrix. Return a bounded disposition or the smallest missing
observation. No law/capacity edit or experimental activation.

**Measurement:** Review only the measurement/provenance claims, not candidate
football acceptance. Check NFL first-contact versus simulated collision/wrap,
end/whistle/continuous-hold distinctions, proxy definitions, concept mapping
(including NFL MAN used for Duo), weighting and small tails. Link each reused
arm to its producing source, resolved settings, input/roster/seeds and operator.
Separate unavailable provenance from a failed result. No study or panel rerun.

**Author:** Publish the smallest existing saved mesh witness/control and re-latch
witness/control, with raw/native traces or film, full producing source/settings,
checksums and commands; retain adverse power/gun examples. Current committed
text is accessible on GitHub, but the cited `out/open-field/all/*.jsonl.gz` and
NFL inputs are local paths, not a shared archive. Supply a fetchable existing
archive or selected artifacts, without recollection or indiscriminate ignored-
file upload. Recover test logs/runtime and intermediate-arm provenance if
available; mark missing items honestly. Superseded reports remain valid historical
observations, but the README says some producing code was reverted/unpublished;
do not claim the final branch reproduces those arms.

## Verification and next decision

Author reports **1,913 core TS checks plus typecheck**, Node22.23.3, and a
**1,200-play flags-off identity comparison**. These are not #151's 2,113 all-
project checks or a new Integration receipt. Full phase logs, compatible exact
source/settings and runtime were not established by this intake. Existing report
text remains evidence, with those limits, rather than being silently recertified.

One tooling detail for reproducibility: `DEF_GETOFF=0.5` is accepted by the
research source but rejected by the unchanged baseline launcher's boolean
override parser. Raw launchers also inherit ambient settings rather than
sanitizing the accepted profile. Record actual resolved values from existing
runs; do not expand launcher behavior or rerun arms to conceal this limitation.

Next decision: independently accept/reject the smallest controller/lifecycle
scope first; hold the full package and parked experiments. If a routine scope
is accepted, publish its portable implementation/tests/registration on freshly
checked accepted develop, freeze compatible composition and run required combined
verification once. Any activation or unresolved material contact-rule change
needs its separate decision under the standing policy. No full-game evaluation,
new historical baseline, default switch or branch deletion is part of this review.
