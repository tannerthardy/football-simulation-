# #69 production-hook information repair

**Corrected candidate ready for Do-It-All's re-review.** Remove the new
collection gate's dependency on the defender's private `engagement` flag.
Keep the installed original check-helper responsibility, acquired owner
torso-loss/clearance, ordinary read cadence and the helper's own contact/joint
state. Actual hand acquisition still goes through unchanged physical
`sim.engage` eligibility. No new observation channel, release rule, strength,
spacing, carrier movement or contact-law change is introduced.

Do-It-All's [independent review](https://github.com/tannerthardy/football-simulation-/pull/69#issuecomment-6202205906)
correctly identified a demonstrated information defect. The original geometry
unit did not exercise the production gate. Its older information-safety claim
does not establish this full path; the new production-path regression does.

## Exact candidate and boundaries

- Controller/test commit **`cdd55b955421744ae6ba688de5f73ab87d13b8ab`**;
  runtime source **`cf8d726d81b1d562fd4c2a959f3bff3ed9c3b0f60fcf2587481386db9394e08a`**.
  Follow-up changes one condition, its explanation and one regression test.
  Original #69 implementation `3b4ea69` and evidence `bb430b1` remain preserved.
- #69 stays independently based on accepted runtime `8c891f4`. No #67,
  carrier-risk, entry-navigation or Physics ancestry is imported into this
  controller branch. The current accepted develop pin at handoff is
  **`8ca8deebe4afa91c3021bdd119bed8976cf00e47`** (#72 then #74 accepted).
- The [complete controller/test extraction](../../data/reviews/current/helper-collection-information/controller-and-tests.patch)
  applies cleanly to that current develop tree. Static application changes
  exactly the two controller and two test files, preserving accepted
  PassProtector and carrier-risk source. Resulting tree
  `cddd8ee326df33bf52fe3ff34e7d8ae18e466d06`, source
  `7ea3e00e2504271133a4384fbdbf1931e8ac8bf352861ee9e812f1372a0bf42b`.
  **This is application evidence, not combined runtime verification.**
- Separately pinned historical #66 context host
  **`72cfe3d1f31159753e2b53286fc366a60bb17403`**, branch
  `codex/helper-collection-information-law`, source
  `355d14b11d3f53e700689a9ed80d5e1cac01507f61d484da755f4becca642c47`.
  It cherry-picks only this same controller/test repair onto `4b8c6c4`.
  No Physics source/settings are edited. Do not import this context ancestry.

## Regression through the real production hook

The added `collection-approach.test.ts` control invokes public
`RunBlocker.update`, with a call-through spy confirming its original `attack`
method executes. It never mocks out that method or substitutes the geometry
helper for the controller. The nonoverlapping, obstructed C/RT fixture keeps
the helper outside strike range and records the same acquired pictures.

Before the fix, changing only the remote flag turns the held zero-speed
braking request into `(6.987817,-2.997026)`yd/s and discards the cached choice.
The [red receipt/log](../../data/reviews/current/helper-collection-information/red.log)
fails at the production request comparison, reproducing the reviewer's defect.
Its runtime is the original `f22dc431...` source, not an altered geometry test.

After the fix, the same test verifies:

- The held production request and exact held read survive a hidden flag change
  with unchanged acquired pictures, own body and RNG.
- A fresh RunBlocker selection with the nonempty private flag gives the same
  request/choice as the empty-flag arm. Retaining an existing choice alone
  cannot conceal a first-selection leak.
- No physical hands or climb are manufactured; the helper retains its original
  first-level target. Normal engagement eligibility remains separate.
- A genuinely newly delivered owner-facing cue changes the next ordinary
  read back to its ordinary moving approach. The fix is not a blanket stop.

The poison flag references a real but detached former rep; this no-step
counterfactual isolates information dependence, not a proposed physical
continuation. Existing broader target selection, joining and release contracts
are unchanged. This focused fix does not certify every legacy live-state
consumer in RunBlocker.

## Retained collection and opposing controls

**64 focused checks and typecheck pass** on the exact corrected controller pin.
This includes both center-law collection mirrors, foot-fit/retarget contracts,
the existing geometry check, new production-hook check and genuine obstruction.
The obstruction test executes eight ordinary World steps from nonzero velocity:
finite travel while braking, no helper impacts, invented hands or climb, and
unchanged arm/support/work limits.

Because removing the remote gate also allows the acquired-cue evaluation while
another block exists, replay the *existing* saved Under/Tite contexts as well
as the two lost-contact mirrors. No new front, roster or game is added. On the
separate #66 context host, **all10 recorded scenarios have identical bodies,
requests, reports and events to the original #69 packet**:

| Existing context | Result after information repair |
| --- | --- |
| Two isolated-law lost-contact mirrors | Same acquisition2.55/load by2.60; zero C/LG impacts through3.40. Final normal load534.654kg·yd/s², separation.65046yd, upright, reachable and installed side retained. |
| Both successful center-law collection mirrors | Entire saved3.40s continuation remains exact, including the original2.40 control window. |
| Under/Tite, both laws | Native body/request/mind/RNG/event fingerprints remain exact through their live2s censors. Observer-neutral repeat remains exact. |
| Recovery, both laws | Exact saved history, including adverse isolated-law behavior. |

[New raw control capture](../../data/reviews/current/helper-collection-information/law-controls.json.gz),
[offline assertions/application receipt](../../data/reviews/current/helper-collection-information/summary.json)
and all launcher receipts preserve exact hashes, fixture/collector fingerprints,
resolved44 flags and World defaults. Node22.23.3; `RUN_CONTACT_COMPONENTS=1`,
active hands off. The law comparison explicitly uses center or patch hands with
legacy ground; no default/law promotion is implied. The setup, capability and
observation initialization are the same O31/D32/seed11 controlled collection
and seed3 native contexts from the original report.

The runner remains parked in the controlled collection witnesses. These results
establish the collected surface, not native runner-arrival protection or yardage.
The prior three adjudicated law-host assertion failures are unchanged, not
repaired or deleted; their histories remain exact here. Physics accuracy/yaw,
retention and historical-compatibility limits stay separately owned. The local
six-direction clearance rule is still approximate, not a general guarantee for
fast residual momentum or between-read crossings.

## Cost, reproduction and next decision

New launcher wall **18.244548s**: expected-red1.393424, corrected64-check
command3.412355, typecheck10.171604, saved-law/control collector3.267164.
The latter records six controlled continuations and four native control cases
with neutral-recording repeats (eight native executions). Zero games, fresh
rosters, broad panels or repeated shared suite. Offline comparison runs zero
World steps. The red failure stays visible; it is not counted as passing.

```sh
# Exact controller/test pin cdd55b9, Node22.23.3:
node scripts/baseline.mjs --candidate -- node node_modules/vitest/vitest.mjs run --project core test/collection-approach.test.ts test/zone-helper-check.test.ts test/run-block-fit.test.ts test/run-combo-retarget.test.ts --maxWorkers=1
node scripts/baseline.mjs --candidate -- npm run typecheck
# Only on separately pinned context host72cfe3d:
node scripts/baseline.mjs --candidate -- node --import tsx scripts/diag/zone/helper-contract-review.ts out/collection-information/law-controls.json.gz --collection-window
# Offline on this publication; no simulation:
python3 scripts/diag/collection-information-review.py
```

The original [collection report](helper-collection-correction.md) retains its
rejected ungated/full-landmark variants and adverse evidence. The new packet
provides both a complete extraction and the small information-only follow-up.

**Recommendation:** return the exact correction to Do-It-All for disposition of
its specific information hold. Integration then owns extraction onto its pinned
current develop and one final combined verification. No additional controller
experiment is proposed. Preserve current accepted pass/carrier corrections,
Physics ownership, parked navigation and historical `4ded6b6`. No merge or
default change was performed.
