# Climb access: stop planning through the first level

The repeated, fixable error is **an assigned linebacker interception planned in
empty space while a defensive lineman occupies the approach**. The blocker can
be aiming at the correct man and still spend the useful part of the play pushing
on somebody else's block. Later teammate yielding is then mistaken for the
initiating failure. This is distinct from failing to release a double, missing a
fast scraping backer, or losing an acquired grip.

Candidate code: `403d7a9f114e39fb069aa3d5cb2ede648c33cbe9`, independently based on
accepted `914f4d56a3b7ef2845ff0208f55d626c0ff5f880`. Accepted runtime
`5b710a1b8b2bdf9bb874aa9c788424cd3c71185df9993f9f6db7eb80cf6b4482`;
candidate runtime
`06869378092c467aa529ffbb86abf8d1d2b76128e5f5d20a99c69bbf50347469`.
Accepted develop and queue `e8d806b940a84c7cff7e5ee066022079723c78ef`
were fetched again before publication and remain unchanged. #148/#149 and
Run's #146 are separate; this candidate includes none of their changes.

**Decision: supported local approach correction for independent Run review;
not integration-cleared.** The outside-zone costs below need a football
contract disposition. Existing protected assertions were preserved and pass.
Integration owns the combined check, after review.

## What actually broke

In Z14 (`iz_weak`, Ace12, Over, flipped), Y owns Will and LT owns DE_W. The
first changed request is Y at **0.25 s**. The relevant acquired DE picture is
stationary and 0.30 s old; the candidate does not use his later motion. The
original empty-space interception proceeds into DE_W at 0.65 s, accumulating
**31 torso-contact steps / 1127.98 kg·yd/s** before the ending. These are actual
World impulses, not a presumed obstruction from a line between centers. Spacing
redirects Y's request later, after he is already rubbing along that body.
Will reaches the runner at 2.70 s without Y ever loading him.

The same initial-climb traffic appears in saved Z16/Y, Z20/C, fresh T01/LG and
fresh T02/Y. Saved Z18 and Z27 oppose the hypothesis: glancing first-level
contact can coexist with a timely successful linebacker join. Removing every
incidental touch is not the success criterion.

## The correction

`RunBlocker.plannedClimb` retains the existing target and meeting-point search.
On the **same ordinary read beat**, it acquires first-level body pictures through
existing `sim.see`, using static OL/inline/DL identities to choose whom to inspect.
Only an acquired position within six yards enters the local surface list. It
never selects a surface using a hidden current position, private engagement or
live controller intention.

For a distant assigned backer, `climb-access.ts` previews the original request
through the existing 0.6-second free-movement horizon. If swept body clearance
predicts a meaningful overlap, it compares the two ordinary short foot-replacement
arcs around that acquired body. Both use existing corner speed, moving arrival,
braking, support and fatigue. A trial must stay upright, create no other predicted
collision and deepen no already acquired overlap. Among admissible requests it
prefers the one closer to the observed backer at the next normal read. If none
qualifies, the original request remains. This is a local navigation choice, not
a guarantee of a complete collision-free route or a block.

The access objective expires on the existing climb read cadence. An ordinary
near-fit substitution does not overwrite it mid-beat; real physical strike
eligibility still runs first. No extra persistence timer, guaranteed clearance,
teleport, awarded contact, new random draw, perception-speed multiplier or
movement-capacity change was added. Keeper/release rules, installed assignments,
spacing, hands and Physics are unchanged.

`climbRead.attainable` continues to describe its **empty-space** forecast, not a
certificate that traffic or later motion permits a block. The passive recorder
now saves the separate `climbAccess` objective, consumed pictures, departure
state, requests, achieved bodies, support, forces, contacts and RNG.

## Native comparisons and adverse evidence

Times in the table name the **recorded loaded World step**; its completed native
tick is 0.05 s later. Event clocks remain unchanged. Forces/phi are the recorded
rep values; body/velocity are step-entry geometry, not invented substep contact
coordinates. Complete raw tapes preserve identity and both clocks.

| Frozen input / blocker | Accepted → candidate evidence | Football interpretation |
|---|---|---|
| Z14 Y→Will | No load → first loaded step1.50; no Y/DE torso impulse; Will no longer makes first runner contact. First contact2.70 Will→3.40 FS; ending2.45→5.96yd. | Clears the intervening body and performs the assigned second-level job. Real loaded contact, not just a closer waypoint. |
| Fresh T02 Y→Will | No load →1.60–2.55; incidental DE impulse1018.6→0. Ending5.47→5.56yd. | Same mechanism transfers to different generated players; yardage barely changes. |
| Z20 C→Mike | First load1.75→1.70; intervening DT impulse568.3→0; last load2.15→2.25. Ending5.55→9.76yd. | Cleaner actual access; still an extended, imperfect entry, not a square-block guarantee. |
| Fresh T01 LG→Mike | First load remains1.55; incidental DT impulse314.0→0; last load2.00→2.05. Ending4.35→3.88yd. | Clears traffic and preserves the join; another defender still wins. |
| Z26 RT / C01 RT | Complete body/request/RNG/physics histories exactly unchanged. | Preserves the successful join and protected loaded finish. |
| C02 RG | Protected departure, first strike2.30, load through3.65 and ending12.78yd preserved. RG request first differs at4.25, after that job; RNG unchanged. | Do not call the entire tape identical. The committed first-strike/keeper assertions pass unchanged. |
| Z16 Y→Will, adverse | First load2.90→1.45. Will starts falling in candidate step1.70; Y remains upright and later seeks Mike. First runner contact3.35 CB_W→2.20 DE_W; ending5.72→−0.96yd. | Shorter original hold is not grip failure: Will falls. But loss of incidental Y help and changed first-level geometry expose LT/DE. Worse offensive ending remains visible. |
| Z18 Y→Will, adverse | First load1.30→1.40; last3.95→2.85. DE first runner contact2.55→2.40; ending4.60→−0.07yd. | Existing glancing join becomes later, shorter and a worse ending. Needs review; not erased by other gains. |
| Z27 H→Mike, opposing insert | First load1.60→1.70, last2.05→2.15; ending2.78→3.56yd. | Keeps the genuine join, with a timing cost. |
| Z06 / Z13 / Z19 | Z06 RG still misses; LG first changes at2.65. Z13's stalled LG still never loads Mike; another LT request first changes1.10, ending2.22→2.18. Z19 entire history unchanged. | This patch does not repair the other initiating mechanisms. |
| Fresh T03/T04 | Complete histories unchanged,7.15/5.06yd endings. | No initial free climb to trigger the traffic intervention. |

The outside-zone adverse paths are not dismissed as random. In Z16 the original
Y/DE impulse begins0.60; removing it changes the first-level block before the
first RNG divergence1.45. In Z18 Y's changed route also changes LT's spacing and
entry before the first RNG divergence1.30. Original and candidate retain real
LT/DE hands, but the achieved locations differ. The original incidental Y body
help assists LT; the candidate frees Y for Will while DE gains access to RB.
Later execution draws differ as well. This establishes the initiating geometry
change, **not** a claim that the entire yardage difference has been assigned to
one cause. No draw was replaced or frozen to manufacture a better ending.

Run's review question is whether this installed climb should clear that owned
first-level surface at these acquired pictures, or needs an explicitly coached
help/collection responsibility. Do not invent hidden knowledge that LT will
lose, tune the route to preserve one ending, or silently turn every climb into
a double. Shared movement/spacing changes belong with Flex.

## Other hypotheses tested and held

These were isolated arms against the unchanged accepted source, not additions
to the chosen patch:

- **Departure waypoint tempo:** Z13/Z19 repeatedly station-keep on short arcs
  beside the old double. Treating that point as a through waypoint creates
  Z19 Mike load2.20–2.65, but C01 loses its protected finish after2.40 and permits
  Mike/RB contact3.00. Held; no release-rule change or assertion relaxation.
- **Bounded velocity trend / coherent near fit:** two acquired pictures improve
  some late Z06 estimates and worsen early ones. Closest pre-contact distance
  only improves1.38→about1.33yd; still no RG/Mike contact. Not promoted.
  Trend Z26 remains live at5s and has no terminal gain, unlike the completed
  accepted control. That censor is retained.
- **Advecting the held meeting point**, **existing `CLIMB_PLAN=0` interception**,
  and **the already installed zone first step** also fail to create the missed
  Z06 join. A lower resulting gain is not an approach repair.
- **Maximum strike versus body-fit scoring:** a pure replay verifies the original
  chosen meeting point against the actual consumed body/picture. Changing that
  criterion does not change Z06's selected point. No needless native variant.
- **Held-command versus composed forecast:** two exact native prefixes plus
  empty-space controller-only forecasts show a discrepancy in some Z14 plans,
  but do not explain most of Z06's miss. No closed-loop planner rewrite.

There is no supported reason here to force the fast scraping Z06 backer into a
block, globally accelerate climbers or strengthen grips. The largest supported
next questions are the held departure objective and the outside-zone
first-level/help contract, separately.

## Correctness, cost and reproduction

**77 focused TypeScript checks pass; typecheck passes.** Actual controller tests
hold acquired pictures constant while the hidden DE moves, show a new acquired
clear picture changes the request, and prove held reads/repeated decisions add
no surface queries or RNG/body movement. The native Z14 check requires real
hand load, zero Y/DE torso impulse, ordinary work residual and arm budgets.
Existing planned-climb, first-strike, keeper, release/attention and retarget
assertions are unchanged.

All15 final-source continuations reproduce their prototype body/request/RNG/
physics histories exactly. All15 finish naturally within5s. Their original
baselines use the same frozen setups; four saved baseline tapes are reused from
the previous accepted-source publication. No broad games, full-suite repeat or
rating sweep ran. Across the investigation: **83 new native continuations plus
two1.8s diagnostic prefixes**,36.504s collector wall time; all launch commands
including failed/pure probes and checks total76.580s. Focused checks cost4.595s,
typecheck9.948s. One initial forecast launch failed before a World tick; its
receipt is retained. These timings exclude saved-tape analysis/packaging and
previously collected baselines; they are not a production performance claim.

The exact code pin, seven bounded archives, per-member SHA256, all original
inputs, saved consumed cues, complete raw tapes, all failed/held arms and
restorable source patches are published in the accompanying
[artifact receipt](../../data/reviews/current/climb-access.json). Fetch/extract
instructions are in its evidence commit's `REPRODUCE.md`.

Normal reproduction uses Node22.23.3 and the existing pinned lockfile:

```sh
node scripts/baseline.mjs --candidate --receipt out/climb-checks.json -- \
  npx vitest run --project core test/climb-access.test.ts \
  test/planned-climb-fit.test.ts test/combo-strike-access.test.ts \
  test/combo-transfer.test.ts test/combo-attention.test.ts test/run-combo-retarget.test.ts
node scripts/baseline.mjs --candidate --receipt out/climb-Z14.json -- \
  node --import tsx scripts/diag/climb-approach.mjs run out/climb-Z14 Z14 5 \
  out/climb-objective-access/inputs.json.gz native
```

Every launcher records all44 resolved settings and unchanged World defaults:
`RUN_CONTACT_COMPONENTS=1`, `CF_FLOW` unset, accepted flags otherwise. Only the
explicit opposing `intercept` arm changes `CLIMB_PLAN=0`. `--candidate` labels
source differences from the historical config pin; it does not promote flags.
The observer still uses the engine's existing latency/peripheral abstraction,
not measured gaze or occlusion. Other awareness consumers, assignments,
first-level techniques and post-contact execution remain outside this repair.
