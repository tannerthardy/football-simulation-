# Same-time catch geometry and retained lower-wrap evidence

2026-10-16 America/Phoenix. Physics component for Catching review, **not an
integrated production fix**. [PR131](https://github.com/tannerthardy/football-simulation-/pull/131).
Accepted/fetched base `70b4db6a3ef53acc1a0e90cd055f1087205daa30`, queue `c933dbc3`.
Accepted source `9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941`;
component source `1b79ca653c71dd6f40cdd032037e658e38d616378581c545d4999765b43324a9`.
Existing44 settings/components1; center/centered hands, legacy/mean support,
adaptive nearby-body subdivision. All experimental settings remain unchanged.

Post-work fetch confirms `develop@0000e560e0dbe31905151465152d412ba838803d`
(#130), now published as accepted in queue `aa9ed352`. The
runtime difference is only `coverage/defender.ts`, with its direct test. There
is no geometry/World overlap. This candidate and saved-input evidence remain
intentionally pinned to70b4; no later-source native result is implied. Catching
and Integration compose the caller fix on the current accepted publication.
For a clean handoff, this branch subsequently merges accepted0000e56 normally.
Only WORKBOARD conflicted; both owners' sections were preserved. The resulting
candidate source is `840a6778439c3c005f2d646f70b36c45037a4efce1d69f7244bf1af862bcad2a`.
The helper/core vector types are unchanged, so compatible focused evidence is
reused; there is no new combined-suite or native-result claim on that source.

## Result and caller boundary

`closestCatchOpportunity(body0,body1,ball0,ball1,{reach,low,top})` minimizes
horizontal separation of **simultaneous** linear paths on their common legal
height interval, then checks the existing reach. It returns `{s,dh,z}` or null.
With relative displacement `r(s)=r0+s·dr`, squared distance is convex; its
constrained minimum is the clamped projection, or the legal interval's start
for zero relative motion. Thus no earlier/later legal reach can be missed by
rejecting this minimum. Endpoints/boundaries are inclusive. No capacity is added.

This selects **closest opportunity**, not first reach. The analytic static
control reaches at fraction.2 but selects its closest point at.5. Choosing first
reach would change difficulty and sometimes order; that policy is excluded.
The helper imports no World, RNG, agent, eligibility or catch-probability code.
Neither `catching.ts` nor `playsim.ts` changed, so native production behavior
has not yet changed. Catching owns the caller and football semantics.

The independent analytic counterexample is rejected: over50ms, ball X0→1 and
body X−1.5→−1.25 at legal height1 with reach1.3 never meet. Freezing the final
body grants1.25 reach to the earlier ball; same-time separation is1.5+.75s.
Static, moving, stationary-ball, height-intersection, reverse-height,
zero-relative-motion, boundary and frame-transformation controls pass.

## Exact saved-input native captures

Only G1-P020, recorded-tip G2-P107 and ordinary moving completion G2-P143 were
captured for the native geometry question. Inputs use immutable original
rosters, selected players/energies, snap RNG key, calls, situation, deterministic
shadow preference and legitimate scouting reconstructed from prior saved calls.
Full constructor RNG state, final call, participant IDs and energies match.
**All recorded frames, events, full telemetry and statistics match exactly**
through each entire snap. No original game is resimulated. Unrecorded original
doubles cannot be compared bitwise; exact endpoints below belong to these fully
matched reproductions, rather than an extrapolation from rounded film.

| Capture | Existing query | Same-time query | Decision |
| --- | --- | --- | --- |
| G1-P020 NB,4.55 | fraction0, distance1.292149, reach1.317361 | no opportunity; legal-time minimum1.508345 | False opportunity in the matched native reproduction |
| G2-P107 tip INT,3.25 | fraction1, distance1.260763 | identical reachable point | Valid opposing tip retained |
| G2-P143 H completion,2.50 | fraction1, distance1.258002 | identical reachable point | Valid moving completion retained |

P020's ball chord crosses the existing minimum height.1 at fraction.14147481.
Its old tipped-ball probability is.31122449 and draw.15203559, yielding the INT.
One additional P020-only trace observes achieved World substeps for the named
curvature question: its closest eligible piecewise body/ball-chord distance is
**1.508492**, margin**.191131yd beyond reach**. This supports the local time
mismatch; it is not evidence for another integration method. Body/ball endpoint
paths are the declared approximation, not full anatomical/continuous flight.

P020's initial Y failure at3.70 retains identical geometry; the later failed
Y attempt at4.30 changes distance1.073605→1.134277. Difficulty formulas must stay
unchanged, but their geometrical inputs can change. No caller counterfactual or
changed football ending is asserted here. P124/P150 remain untraced leads.
Retry/readiness, tracking, old opportunities, probability calls and actual RNG
draws are preserved in the raw captures. The [portable fixture](../../test/fixtures/same-time-catch.json)
contains original endpoints and old measurements, not solver-derived answers.

## Lower-wrap follow-up: three complete short ledgers, one explicit hold

The same saved-input reconstruction fully reproduces G1-P036, G1-P130 and
G3-P069. For each, seven controller ticks around first contact retain91 physical
pieces across the complete World: all body/support snapshots, requests, delivered
ground impulse/work/yaw, contact/hold source impulses and height moments, filtered
support inputs, requested corrective speed, foot force/motion, grip/slip state
and work channels. The offline reduction retains265 source-moment rows and129
carrier-support updates. Momentum residual is at most**2.374e−13kg·yd/s**;
World planar/yaw work residual at most**2.745e−11kg·yd²/s²**. Signed support work
is already included in grasp work and must not be added a second time.

| Case | What the short ledger establishes | What it does not establish |
| --- | --- | --- |
| G1-P036, grasp4.15/fall4.25 | First loaded tick4.20; strong lower restraint plus subsequent same-pair torso contact. Deviation reaches(.48336,.20943) after the first loaded tick, then crosses the existing recovery threshold. Ground and received impulses close. | A rapid fall is not itself an incorrect recovery law or grip capacity. Do not attribute it to the lower grip alone. |
| G1-P130, body contact2.25/fall2.30 | Initial internal impulse≈(−387.492,+141.316); no lower grip or trip channel. Valid opposing impact mechanism. | Matching fall latency does not make it the same mechanism as a wrap. |
| G3-P069, rear grasp5.95 | Carrier stays up throughout the short interval; first loaded tick6.00, weaker/slipping restraint and smaller trip input, with useful continuing motion. Later native fall7.50 remains preserved. | The short trace does not adjudicate the later history-dependent fall. |
| G1-P167, grasp3.00/fall3.10 | Original saved film/observations retained. | **HOLD:** pre-snap stem means observed energy is post-constructor. Original pre-constructor energy/support/perception inputs are missing; no approximate replay or complete ledger is claimed. |

The reduced pitch/roll height-moment ledger is not a complete3D angular-energy
proof. Center-hand angular-law and support-history research remain held and
separate. These observations do not justify LEG_BRACE activation, stronger or
weaker grip, strength/recovery changes, or reopening solver expansion.
Completing P167 needs one original pre-constructor input capsule or a complete
post-constructor state capsule; the missing boundary is identified without
requesting another cohort/game campaign.

## Reproduction, cost and integration decision

[Compact settings/results and original receipts](../../data/reviews/current/same-time-catch-physics.json).
[Immutable4MB evidence archive, source tools and manifest](https://github.com/tannerthardy/football-simulation-/tree/b5b4fba9eefa5e59e8db192e77a6502341d81989).
Data-only root: never merge its history. Archive3965581bytes,
SHA256 `7fc78954d2240c86c5bc9092c6a9d1345d9a3acbe3af061cbd33d006bb93f97b`.
Extract at repo root; verify the41 declared file hashes and the manifest. Its readme gives the bounded
Node22.23.3 replay commands and zero-engine ledger reduction. Captures are
observations, not arbitrary World restore checkpoints; rebuild scouting Maps
from the saved calls using the supplied tool.

**10 unique focused geometry checks pass;17 executions across stages. Typecheck
passes.** One failed typecheck exposed an untyped Vitest fixture table; the
subsequent explicit fixture type fixes it without runtime/assertion changes.
The original failed receipt remains. Recorded launcher cost**47.839s**, including
all typechecks and diagnostics. Six constructor-only checks, six unique complete
native snaps and one additional P020 path capture; no games or full suite.
Input archives were downloaded/hashed/extracted once, not recollected.

The isolated production fix becomes `integration-ready` when Catching supplies
the minimal caller hookup and independently reviews these contracts:

1. Save body tick-entry and attained endpoints for the **same interval** as
   the ball chord; reset correctly for new plays and direct/static test calls.
2. Keep existing eligibility, acquired-flight readiness, capability/top mapping,
   retry deadlines, increasing-fraction ordering, contests and difficulty
   formulas. Do not replace closest opportunity with earliest reach.
3. Run the caller counterexample/control checks and compare the three frozen
   native inputs after hookup; investigate meaningful adverse changes by first
   divergence. A corrected invalid INT need not remain an INT.
4. Obtain independent review; Integration owns one exact combined verification.

This is an existing-validity correction, not a new-law/default activation request.
The helper is ready for interface review; **the production fix remains HOLD for
the Catching-owned caller**, independently of the P167 follow-up. No user approval
round-trip, World rewrite, new experiments or broad game campaign is needed.
