# Keep the closest request across teammate closing limits

2026-10-20 UTC. **Recommend ACCEPT of the narrow request-projection correction
for Integration review.** Independent technical review accepts this contract;
Integration adoption remains pending. A staged physical comparison demonstrates
better progress toward the same goal with existing capabilities. The current
native control demonstrates a real request/motion change, with preserved
defensive success; it does not establish a new football win or recurring
simulator-wide benefit.

- Accepted base: `2c98bed94adad8087c65f381d4090444ad283985`.
- Runtime correction: `7749e37a9d3c9c3780514acc5d7e88edcd5a5c79`.
- Final code/tools/input: `0491f07b5728a149c3f4ac35008ceba14e392694`, branch
  `codex/joint-spacing-projection`.
- Final engine source SHA256:
  `253ddf49fe63d7f57a995b710da8b8c72f4828fee1e63d5b629d44a1647f1508`.
- [Compact evidence, inputs, checksums, settings and complete scoped cost ledger](../../data/reviews/current/joint-spacing-projection.json).

## First broken contract and smallest correction

`spacing.ts:jointClosingRequest()` projects a free actor's requested velocity
against acquired teammate closing limits and the existing speed cap. Its early
return accepted the sequentially corrected velocity whenever it satisfied those
limits. Feasibility alone does not make that velocity the closest admissible
request: one correction can add an unnecessary diversion while still respecting
every preceding constraint.

The correction retains that feasible ordinary response as the initial best,
then evaluates the function's existing boundary/intersection/cap candidates.
It replaces the ordinary response only when a feasible candidate is closer to
the original requested velocity. Near-equal squared errors retain the existing
response within `16 * Number.EPSILON * max(1, error, bestError)`. This preserves
numerical ties, not an added football clearance margin.

Only this small projection hunk changes in production. Existing free-footwork
eligibility, contact/tactile ownership, half-planes, speed cap and all
non-velocity command fields remain. It adds no observation, random draw,
maneuver, route, assignment, body change or physical-law change. The separate
experimental traffic-route helper is absent from this branch. Unknown peer
information is not replaced with private live state.

## Same-state physical proof and opposing controls

The mechanical operator reuses a saved real RT body/profile from the existing
joint-spacing fixture, then **explicitly stages** two acquired neighbors with
different closing normals and a requested velocity `(2,2)`. This is not the
historical A028 runner-restoration trial or a claim about that original play.
One matched operator runs the ordinary sequential response beside the selected
production response for .60 seconds under the unchanged World.

The two active-boundary intersection is independently certified as the closest
request by positive optimality multipliers, rather than by copying a selected
implementation result. Peer live-position/velocity/body/engagement getters
throw if accessed; the ordinary two acquired reads, own body and pictures are
unchanged by selection.

| Staged ordinary scene | Sequential response | Closest response |
| --- | ---: | ---: |
| Requested velocity after spacing, yd/s | `(−.284609, 1.394282)` | `(.065102, 1.192376)` |
| Achieved progress along original request after .60 s | .396290 yd | .485270 yd |
| Distance to the same fixed goal after .60 s | 8.108018 yd | 8.011564 yd |
| Positive torso contacts / upright | 0 / yes | 0 / yes |

Motor work stays within its bound and work residuals stay below 3e-13 in this
scene. The evidence establishes an achievable local improvement; it is not a
promise of future reacting clearance. Both physical arms above come from the
same final published operator version, not from unmatched historical producers.
Its tape was collected on source `490b2f…`; final-source focused checks repeat
the material oracle/physical contract after the numerical tie correction.

The clear-route control retains its entire original request and actual motion.
The tactile-owned control retains ordinary contact-controller authority. The
single-neighbor obstruction preserves its braking request and **five actual
positive contact samples** when existing momentum is already too close to stop.
No body is shrunk and no collision is disabled. Existing inconsistent-limit,
loaded/parked, residual-momentum and compound-traffic controls also remain.

## Current accepted native control: request fidelity, limited consequence

The saved A042 constructor is Singleback Ace Duo strong against Wide9 nickel
Quarters MOD, seed71002, LOS35. The accepted baseline and final candidate each
run normally to the 4.10-second tackle ending. The observer records existing
producer returns, refinements, acquired pictures, World requests and achieved
bodies without adding queries or draws. Plain/observed endpoint signatures
match within each arm. Setup and operator hashes match across arms.

After numerical tie preservation, **all applied commands are exactly equal
before t=2.25**. The first real change is LB_W16 at 2.25, with all entering
bodies, raw decisions and consumed pictures still equal:

| First changed request / following step | Before | Candidate |
| --- | ---: | ---: |
| Same original request, yd/s | `(5.665000, −7.175767)` | same |
| Spacing request, yd/s | `(.238147, −.296176)` | `(−1.191891, −2.312392)` |
| Squared distance from original request | 76.779518 | 70.669380 |
| Achieved .05-second displacement, yd | `(−.069424, −.047617)` | `(−.073359, −.057489)` |

Residual momentum remains: the new request does not instantaneously make the
body travel along its requested direction. LB_W's position difference is .079 yd
at 2.55, .134 yd at 2.80 and .178 yd at 3.05. The later difference reaches .556 yd
at the ending step. These are physical trajectory differences, not improvements
in native goal error: **this first changed pursuit request has no command-local
pursuit-point metadata**, so that stronger claim is not supported.

The offensive block remains real. RG5 strikes LB_W16 at the same 2.45 interval;
its torso impulse increases **88.219 → 98.651 kg·yd/s**. Neither arm has a LB_W
teammate torso impact. No positive contact pair/tick is added or removed between
2.25 and 3.00. Later, candidate contact samples add RG5/DT_W14 at 3.65 and
C3/DT_W14 at 3.70, while RG5/LB_M15 samples at 3.30–3.40 and RG5/DT_W14 at 4.05
are absent. RG5/LB_M15's nominal `block_contact` changes **3.50 → 3.45**.
These changes are retained; useful blocking load is not claimed identical.

Handoff1.35, SS grip3.30, runner fall3.65, FS assist3.65 and tackle event4.05
remain. Both recordings end at4.10. Final runner body/credited-end-spot changes
are only **+0.00000107 yd x / +0.00003216 yd y**. This one native case preserves
the legitimate defensive finish while showing a more faithful immediate
request. Older captures did not establish recurrence; no prevalence or
importance estimate is inferred.

## Failures retained, verification and cost

The accepted-source reproducer first fails the actual closest-request contract:
selected x is −.284609 versus the independently justified +.065102. Its second
failure is an overstrict exact floating-point equality in a loaded ordinary
response; tolerance corrects that bookkeeping while retaining every command
field. The first candidate pass then exposes `structuredClone` dropping symbol
goal metadata in a scene-equality assertion. Explicit goal snapshots and cloned
scene comparison correct the assertion without changing behavior. Failed
receipts remain. The baseline report's erroneous **unused** clear-scene
`closest` diagnostic is excluded; clear-control claims use the final operator's
selected arm and focused tests.

The initial candidate also introduced an approximately 1e-15 QB request change
at .95. The scaled machine-epsilon tie retention removes that numerical drift;
the final native first change is the material LB_W decision at2.25 above.

Final **24 checks across five focused files pass**, covering the new projection,
existing joint spacing, basic traffic, compound traffic and residual motion.
Standalone typecheck passes in **11.450 seconds**. The exact engine hash is
`253ddf49…`; original receipt HEADs/settings and the publication pin remain
separate in the compact evidence. No shared integration suite, additional game
campaign or fresh roster panel was run.

| Joint-scope recorded commands | Seconds |
| --- | ---: |
| Accepted failing reproducer | 1.546 |
| Mechanical baseline / candidate | .544 / .521 |
| Initial failed / corrected / final focused checks | 1.950 / 2.074 / 2.055 |
| Reused current native baseline / initial candidate / final candidate | 4.582 / 3.962 / 3.967 |
| Standalone typecheck | 11.450 |
| **Scoped recorded total** | **32.652** |

This ledger includes the already collected 4.582-second A042 baseline as reused
evidence; do not bill it again in a combined navigation total. The remaining
joint work is28.069 seconds. Tangent/local-passage/gather-goal research is
excluded. Node22.23.3, the 44 accepted settings and World defaults remain fixed;
all listed launch receipts report unchanged inputs, including expected failures.

Advance this portable projection correction with independent narrow acceptance
to Integration's combined verification. Broader navigation and native football
benefit remain separate questions. No next maneuver or approach-policy
expansion is included.

The previously completed [independent decision](joint-spacing-projection-independent-review.md) is now published at its exact runtime/code pins. This is a documentation-only readiness update; no review or checks were repeated.
