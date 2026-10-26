> Publication note: this is the frozen Phase II research report. Source pins, local paths, commands and numerical results describe the retained evidence package. See the [publication index](README.md) for remote evidence access and the next-work plan.

# Independent challenge of the opportunity evidence

The retained data supports a ledger of 53 initial installed jobs, not 53 obligations that remain unchanged for the whole play. It does not establish a count of missed useful blocks. Source-aware physical load, actual-carrier contact, dynamic responsibility, and conditional access must remain separate.

This review reads the historical/current raw and compact observer artifacts, observer and analysis source, and current blocking source. It independently postprocesses compact data with `independent-opportunity-check.py`; no simulations are rerun. Source versions are historical `58e0f5ee13e1c29e9e6ab91cc22cccc576cfe3d7` and current `a5b024b9fbf8c51fc31401eefb79737be586814a`.

| Count | Historical | Current |
|---|---:|---:|
| Captured inputs / native live snaps | 40 / 37 | 40 / 37 |
| Full observer result/state comparisons passing | 40 | 40 |
| Initial jobs / direct jobs | 53 / 2 | 53 / 2 |
| Initial member→initial target hand load at any endpoint | 16 | 16 |
| Such load endpoint at or before first actual-carrier contact timestamp | 14 | 14 |
| Initial target ever makes actual-carrier contact | 11 | 12 |
| Initial target contacts at earliest carrier-contact timestamp | 7 | 8 |
| Released/direct job rows with subsequent `block_threat` | 9 | 9 |

Load threshold is >1 native force unit (`kg·yd/s²`, about .9144 newtons), sum of magnitudes for the job members' hands on the installed target. Load magnitudes are not net directional opposition or impulse. Event contact roles are carrier=`a`, defender=`b` for `carrier_contact`, and defender=`a`, carrier=`b` for `hit`, `tackle_wrap`, `tackle`. This includes actual QB possession. It does not use the non-QB depth denominator.

“At or before” compares recorded hand-load endpoint with event timestamp. Event timestamps use the update tick; endpoints are generally .05 seconds later. It is a conservative timestamp category, not a claim that endpoint load and contact events have substep ordering. Seven/eight also does not mean a unique first defender. S7-P067 has LB_M and LB_W at 2.5 in both sources; historical S8-P005 has DE_W and DT_W at 2.2. Preserve ties rather than relying on event-array ordering.

## Dynamic responsibility is material

The physics lane nominated S9-P062 J1; this review independently confirms it from the full frame data and events. C releases toward initial LB_W at event time 1.05. At 1.25, `block_threat` changes its target to LB_M. The first C→LB_M hand load >1 is endpoint 2.25; there is no C→LB_W load. Start-of-tick snapshots show the new plans at 1.10 and 1.30 respectively, consistent with event versus frame timing. This is not evidence that C attempted an unchanged LB_W path and failed.

Current `RunBlocker.rereadThreat` (`src/sim/behaviors/blocking.ts:1788–1825`) permits a free climb/lead blocker to switch based on its acquired runner/defender/teammate pictures. It requires its current man to be sufficiently distant, another threat's distance/closing score to be clearly more dangerous, access to that threat, and no nearer teammate. It does not prove the switch is optimal; that would require acquired-packet decision scrutiny and a counterfactual preserving the competing duty. It does prove initial target is not a permanent obligation.

The nine initial-job rows with subsequent rereads in each source are S10-P047 J1, S7-P067 J1, S8-P005 J1, S8-P039 J0, S8-P076 J0, S9-P009 J0, S9-P026 J0, S9-P027 J0, and S9-P062 J1. There are ten events because S9-P027 has two. Three of the current rows and four historical rows subsequently load a retargeted defender. Some occur after initial contact or after another change; these counts are not useful-block counts. The machine file retains each event and load time. Here “nine” counts a later `block_threat` by the actual departing/direct actor, irrespective of resulting plan kind; it does not count every reassignment. The separate historical plan timeline finds six rows with another non-null target while kind remains `climb`. Only three rows overlap: six event-only rows become `drive`/`reach`, and three timeline-only rows switch through other mechanisms without `block_threat`. Both operators track the departing actor, not a keeper. See `responsibility-reconciliation.json`. The target selected at S8-P039 differs between historical and current source, showing how a runner-only accepted change can alter later blocking decisions without a blocking-source edit.

Among ten historical no-load jobs whose initial target later contacts the carrier, the two positive actual-release free-World access nominations cannot be called two proven path failures: S9-P062 includes a new obligation. S7-P070 remains a route/access investigation candidate, with later assistance and carrier deadline ordering to preserve. No two-case “missed useful” lower bound follows from these islands.

## Adverse methodology checks

The native observer honors `snapAssessment.snapPermitted` through native `run`; the three prevented snaps are retained as captured inputs but contribute no live jobs. The old Phase I manual-tick ghost-play artifact is not carried into this panel. Observer state equality covers graph state, functions by name, maps/sets/typed arrays, identities, and WeakMap values over known agents/bodies/current joints, excluding the diagnostic command sink. It does not inspect unreachable weak keys or establish a universal future-state theorem.

The scalar opportunity screen is an optimistic nomination using a future recorded carrier trace. It is not an online controller, achievable route, or utility certificate. Its radius convention differs from the corridor operator: scalar uses defender body radius + carrier radius + .3, while corridor uses defender profile reach + carrier radius, with .8/1/1.2 sensitivity. These metrics are not interchangeable.

The wider-arc corridor comparison fixes baseline carrier positions but uses candidate defender positions generated while responding to the candidate runner path. It is a hybrid geometric reference, not a matched-defender-task causal restraint estimate. Apparent delay can include pursuit retargeting. Root has corrected its method label accordingly. Candidate absent access is censored at common end. New S10-P015 load without a target threat to that actual reference corridor is not a verified useful improvement. S7-P025's changed access can be an indirect effect of another combination.

Conditional hand ablation removes joints/strikes but retains engagement controllers, body collisions and other assignments. A null access result does not show blocking was irrelevant. Conversely, load alone does not show useful restriction. The independent runner islands found native Y and C pairs loaded every following tick but substantially different conditional restriction; those are mechanism examples, not replacements for the native opportunity denominator.

The free-World islands retain body/support/ratings, use unloaded goal pursuit toward a hindsight future target point, omit obstacles and future keeper loss, and use fresh caches. Positive access is a permissive nomination; failed sampled pursuit is not impossibility. The source also inserts a distant zero-capacity hand joint to retain the joint-bearing World integration path. At review time the keeper start filter admits any nonzero hand resultant, while the ledger's load threshold is >1; those start cohorts should be labeled separately or aligned. These limitations preclude interpreting reach positives as achievable useful missed blocks.

An earlier reproducibility issue in `opportunity-screen.py` attempted to parse aggregate compact data as a per-play object. The current code explicitly skips non-dictionaries/missing snap metadata, so the glob issue is closed. No root measurement files were edited by this review.

## Closure

The independently reproduced counts and the corrected observer are usable. A factual 53-row ledger should retain initial job identity, release actor/time, later target changes, carrier window, load direction and endpoint, event-contact roles, access censoring, and competing obligations. “Unresolved” is the correct result where those records do not establish a feasible, useful counterfactual. No evidence here supports automatically making every initial target load or treating every no-load target as a blocking failure.
