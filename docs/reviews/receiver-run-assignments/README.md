# Receiver run assignments: eligibility first, then joint allocation

**Recommend the eligibility repair for integration review.** The subsequent
joint-allocation correction is separately reviewable and retains its individual
costs. Both repair the installed assignment mechanism; no achieved blocking or
RB-yardage benefit is claimed.

Accepted base **`0000e560e0dbe31905151465152d412ba838803d`**, canonical queue
`aa9ed35272cc334ce0a7c79eec709970e5c628fc` (fetched again at handoff).
Branch `codex/receiver-run-assignments`.

- Eligibility-only code: **`1cce4086494f8531b207d9090dc5ab0dfd8db3c1`**.
- Joint candidate: **`dc679b83fe93732d275a82f611234393cf874750`**.
- Combined runtime SHA256:
  `3b9c401bb7fd70af4bb46d507f1507f276133683c03f9d7896be6c2a1b90db17`.

The [combined three-file patch](promotion.patch) contains blocking.ts, the focused
test and its geometry fixture. The [eligibility-only extraction](eligibility-only.patch)
retains its original six new controls, before the joint-allocation assertion.
Collector, ownership record and reports are separate tooling/evidence. No #126,
#135, experimental parent, physics or coverage change is imported.

## What went wrong

`classify()` groups any defender within2yd of LOS and9yd laterally of the ball
as a down threat. This is a geometric grouping, not a physical-position label:
a press corner or nickel can fall inside it. The receiver pool used only `db`
and unclaimed `lb`, dropping **all** of `dl`, even when no lineman, puller,
fullback or slicer actually owned that body. Changing DB labels or defensive
private roles would not repair that distinction.

The first correction derives reservations from the finalized offensive plans:
current targets, climbTo and combination backers. It restores unowned shallow
bodies to receiver eligibility while retaining real down-block ownership.
Reserved pull/kick/trap, lead, slice and future combo work stay reserved. The
existing help fallback remains; this is not a universal prohibition on helping
an already owned man. Classification itself is unchanged.

After that repair, a second defect remains: greedily taking the globally closest
pair can spend one bunch receiver's shared nearby fit while leaving a teammate
with unnecessarily distant work. The saved geometry has a nearly equal Y fit
on CB_S/NB; choosing CB_S first sends Z toward SS, whereas Y→NB and Z→CB_S
produce less collective travel. The exact mirror exposed dependence on a tiny
floating difference in that greedy tie. Eleven inspected rows have an explicit
lower-total-travel alternative using the same available bodies.

The second correction retains the same geometric objective and solves the
receiver allocation together: maximize distinct filled jobs, then minimize the
sum of initial Euclidean distances. The mask covers at most five receivers
(32 states), processed over the available defenders. It introduces no clearance
promise, private defensive assignment, lateral mandate, size/strength change,
distance threshold, future-route or movement optimizer. It does not change the
inline `zoneOwnership` helper or its contracts.

## Saved G1-P018 and a current-base reconstruction

Evidence source is accepted70b4, data-only commit
`23d5f6d4f7e88fdd3225a49cc74ae5582a52522e`, archive
`accepted-games-deep-audit-v1.tar.gz` (SHA256
`5498158a401c95e332e948040384b5dafc1dcd62eb65921ddf134c848dc5ec56`).
Only the saved run/physics first geometry was read; no games were rerun. The
committed fixture records all22 rounded first-nonnegative positions and the
original target ledger. Generated31/32 profiles are used for assignment-only
reconstruction, not to impersonate the original game roster/state.

The first fixture mixed recorded logical `flip:true` with normalized offensive
coordinates. That failed fixture/receipt is retained. `installationFlip:false`
reconstructs the actual minus-y bunch side; original `recordedFlip:true` remains
in the fixture. Before changing runtime, this corrected installation reproduces
**all nine original target identities**, including LG→DT_W with LB_M climb,
RT→DE_S and Z→LB_W. The mirrored control reflects the same geometry and install.

| Receiver | Before | Combined candidate |
| --- | --- | --- |
| Y | SS,5.016yd | NB,1.931yd |
| X | CB_W,2.012yd | CB_W,2.012yd |
| Z | LB_W,12.763yd | CB_S,3.008yd |
| H | FS,10.045yd | SS,5.941yd |

The originally unowned CB_S/NB are3.008/3.640yd from Z. Eligibility-only restores
both targets but still leaves Z→SS6.689yd in one greedy arm; joint allocation
gives the same Y/Z/H target identities in the exact mirror.

**The cost to the saved RB remains unproved.** That film's first runner contact
is DE_S at2.55s, after RT's real contact/load from.70/.80s. RT→DE_S and the entire
inline ledger are preserved. Neither these assignment arrows nor shorter travel
prove a successful block, lost defender opportunity or different gain.

## Own constructed plays: coverage and results

`scripts/diag/receiver-run-assignments.ts` constructs **72 catalog-derived
installations**: all18 formations, two representative concept/look choices per
formation, each mirrored. Together they cover14 run concepts (including an
explicit QB-draw control for Empty, which has no RB exchange), all six fronts
and five coverages. Zone/weak-zone/Duo/draw/toss, power/counter/trap and three
valid split-zone formations are represented. Defense includes press/zero and
off/zone/odd looks. One generated roster pair, seed3, no audible. The two saved
geometry arms bring the total to74. This is a bounded assignment inspection,
not a roster campaign or independent sample of football outcomes.

All phases use the same cases and measurement code. **Zero engine ticks,
reacting continuations or new games.**

| Assignment screen | Before | Eligibility only | Joint |
| --- | ---: | ---: | ---: |
| Cases leaving a closer unowned shallow body out of all receiver work |15|0|0|
| Cases with receiver lateral-order inversion |14|11|1|
| Nonreceiver exported ledgers identical to before |—|74/74|74/74|

Eligibility changes15 rows. Joint allocation changes11 rows relative to that
candidate, for21 total changed rows versus accepted development;53 remain
identical. Exported nonreceiver comparisons include job, target, climb target,
drive and combination membership/defender/backer. Source edits are confined to
the final receiver block and do not mutate the preceding plans.

Other concrete examples: Gun Trips OZ versus Wide9 press changes H from
LB_W11.118yd to NB2.446yd (mirror11.573→2.573). Bunch Duo versus Tite shortens
Z12.398→7.735yd, but H's job grows7.754→10.214yd. Gun Trips Open IZ versus Tite
changes the complementary backer pairing and shortens the previously longest
receiver job11.802→9.099yd. These are responsibilities/travel, not observed load.

## Adverse results and remaining assignment questions

Minimum collective travel redistributes individual costs. **14 receiver jobs
get longer relative to eligibility-only**, recorded individually in the
[summary](../../../data/reviews/current/receiver-run-assignments/summary.json).
For example G1-P018 H's restored-NB job3.158yd becomes SS5.941yd to free Z for
CB_S. Bunch Power sends Y1.861→5.048yd and H5.951→8.841yd while shortening
Z10.688→3.508yd. No row's largest distance increases in this panel, but the
algorithm does not promise that universally. Run should review the distribution
of meaningful jobs; lower total distance alone does not establish better football.

One endpoint-order inversion remains in mirrored Bunch Power/Over/Cover0.
Inversion means opposite lateral ordering at assignment endpoints; it is not
proof that paths intersect or bodies cannot execute them. It is preserved, not
removed by a route veto or forced same-side rule.

Counter versus Odd without an attached TE still installs receiver work on an
unowned DT and end (Y→DT_S3.260yd, H→DE_S4.785yd). Two offensive linemen pull;
C/LG own NT, LT owns DT_W, RG kicks DE_W and RT leads LB_M. The corrected ledger
accounts for the remaining threats, but whether those receiver crack jobs can
provide timely access is a **scheme/approach question requiring reacting
evidence**, not permission to silently change pullers, classification or physics.

Existing dynamic stalk live-target reads remain recorded STALK-001 debt; this
patch only repairs installation. No new live reads are added. Do not expand this
result into general receiver technique, OL collection or a yardage claim.

## Verification, runtime and next decision

Eligibility-only:14 focused checks pass. Final: **17 focused checks and typecheck
pass** (nine new controls plus eight existing stalk-ledger cases). Controls retain
inline targets, combo backer, pull/kick/trap, fullback lead and split-zone slice
ownership, distinct receiver work, the explicit bunch alternative and its mirror.
Corrected base red: two fail/four pass; joint red: one fails/eight deliberately
unrun. Initial flip-mismatched red is retained separately, not treated as a
supported regression.

Node22.23.3, existing44 baseline settings, components1, CF_FLOW unset, native
World defaults. **22.135s measured validation-command wall time**, including
all initial/corrected red, four before/candidate assignment panels, focused
iterations and typecheck. Inspection, saved-data extraction, figure generation
and Git/publication time are separate; this is not a per-play performance claim.
No full suite. Integration owns exact combined verification.

Reproduce without games:

```sh
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/receiver-run-assignments.ts out/receiver-run-assignments/panel.json
npm run baseline:run -- --candidate -- npx vitest run --project core test/receiver-run-eligibility.test.ts test/stalk-ledger.test.ts --maxWorkers=1
```

[Input/provenance/settings](../../../data/reviews/current/receiver-run-assignments/input-manifest.json),
[all74 compact before/after ledgers](../../../data/reviews/current/receiver-run-assignments/assignment-ledger.json),
[cost, failures and individual tradeoffs](../../../data/reviews/current/receiver-run-assignments/summary.json).

Ownership coordinated with [Run #126](https://github.com/tannerthardy/football-simulation-/pull/126#issuecomment-6241739169)
and [Integration #130](https://github.com/tannerthardy/football-simulation-/pull/130#issuecomment-6241739886)
before source edits; the joint scope was [posted separately](https://github.com/tannerthardy/football-simulation-/pull/126#issuecomment-6241819701).
No approval is inferred from silence. Next: independently review/adopt the
eligibility repair; review the joint allocation and its longer individual jobs
separately or together. The next behavior evidence should ask whether one
newly coherent perimeter/crack assignment achieves useful access, preserving
the saved real RT/DE_S contest. Do not rerun a broad game campaign.
