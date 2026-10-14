# TE approach base: production transfer and disposition

**Park the proposed TE-base adoption.** The isolated historical contact trial
has a real initial support effect, but it does not establish improved protection
on accepted production. Its two current-production candidates preserve end
blocking, yet the successful Y run loses its clean crossing to LB_M. Weak keeps
the same initial DE_W contact. There is no demonstrated controller error or
unlawful defensive win that justifies tuning this action or expanding the panel.

The test reuses integration's [shared PR #26 reference](https://github.com/tannerthardy/football-simulation-/pull/26):
`develop` **a1b16e666a9ee7d1bc1d2aecba141fc535863b24**, source
**e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54**,
all44 accepted flags/components1, center hands/centered integration/legacy/mean.
Its publication is `ba9544f23029c634cb6e22b14ecad617fcdd3470`; the781 KB packet
hash is `ad462904b23c6864d902107f6a0aa3a876b4e35d3247db8dfaebb835276ae10b`.
No baseline case was replayed to its ending. Historical comparison remains
`4ded6b6`; the [PR #27 isolated-law result](https://github.com/tannerthardy/football-simulation-/pull/27)
keeps its own c6 source/43 flags/patch-legacy selection.

## Action and outcome

The experiment changes only the named playside TE's returned reach/cutoff
approach posture to the existing `.70`, while upright, unengaged and without
an explicit posture command. All movement fields, information, cadence,
assignments and profiles stay unchanged at the intervention. Existing loaded
owner `.85` and helper `.75` intents subsequently own contact, followed by
unchanged teammate spacing. This is the same bounded action as #27; no lateral
track, grip strength, new policy, runner correction or release timer is bundled.

| Current-production measure | Shared reference | Base-action trial |
| --- | --- | --- |
| Y first declared carrier contact | CB_S grasp3.65, depth+.3754 | LB_M grasp3.00, depth−.04025 |
| Y crossing | 3.60, before contact | 3.10, after contact |
| Y end | Tackle4.30, gain+1.49458 | Tackle3.75, gain+.23297 |
| C departure to LB_M, Y case | 1.20 | 1.20 |
| Y departure / RT keeper | 2.00 | 1.65 |
| Weak first declared carrier contact | DE_W grasp2.30, depth−.9623 | DE_W grasp2.30, depth−.93006 |
| Weak crossing | 2.60 | 2.60 |
| Weak end | Tackle3.40, gain+2.36770 | Tackle3.85, gain+4.88415 |
| Weak H departure / LT keeper | 1.25 | 1.25 |

Contact labels are controller entry times, with the corresponding World
interval ending .05 seconds later. Gains are unrounded dead-ball values;
neither better gain nor a changed football ending supplies an automatic verdict.

The adverse Y result is **not an end-block failure**. The changed front surface
feeds the existing acquired live-gap system; the first changed RB request is
at1.60. No RB rule, scoring weight or capability was edited. The runner then
encounters a different developing lane on a different timetable. The earlier
Y departure is the existing secured-keeper decision, not a new release timer.
This trial does not demonstrate that either release time or RB route is wrong.

At the3.00–3.05 carrier-contact interval, C already transmits tick-average
normal946.56 and lateral586.02 to LB_M. Pre-World positions are C(40.4999,22.1307),
LB_M(40.6599,21.5507), RB(39.8403,21.0515). The linebacker is on the runner's
side of C and can reach him while C is engaged and loaded. C's final requested
movement is(+2.4,−2.1944), achieved execution remains under World. That is
actual failed protection despite hand load, not a missing assignment or a
reason to increase strength. Its hand acquisition is earlier than the
reference (native `block_contact`2.60 versus2.75); earlier collection alone
also does not establish a useful blocking surface.

The original Y clean crossing is lost, which is material adverse evidence.
The candidate still crosses sooner and the weak ending gains more, so yardage
alone would hide the protection tradeoff. This small test cannot demonstrate
net football benefit or decide whether the new LB_M access is a lawful geometry/
timing tradeoff versus a separate collection defect. No corrective C heuristic
is proposed. Candidate first-contact states, requested/final movement, support,
profiles, report and mean loads are preserved in the receipt.

## What changes in the RT/RG assignment

Use the production traces now. Shared Y retains RT load beyond the historical
isolated-law reach-loss window. No RG/DE_S collision appears in the production
controls. Current H-strong first contact is **DE_S**, not isolated-law DT_S.
The old RT capacity-loss and RG collision cannot be asserted as current defects.

In the shared H-strong2.65–2.70 encounter, loaded RT sits at(40.4746,21.0030),
DE_S at(40.3185,20.3285), runner at(39.6384,20.7128). RT is already upfield and
interior of the end, whose backfield route remains open despite mean normal/
lateral766.45/471.52. RT requests(+.5313,−.6938) and is actually moving
(+1.4729,−.9118); the defender moves(−1.6114,−1.2656). RG/DT_S remain separately
loaded, and DT_S is not the first runner contact. These observed states identify
the next route/cue/attainability question; they do not prove an earlier feasible
recovery route or authorize a new heuristic. Future shared movement changes
still require YAC coordination. No shared movement file changed here.

## Reproduction and test cost

[Frozen input manifest](../../config/te-base-production.json),
[probe](../../scripts/diag/zone/te-base-production.ts),
[exact receipt and first-contact witness](te-base-production-receipt.json).
Tested commit **bea6d6299e682487e2b0a6ea8158d99f5bdabcf9**. All `src` bytes
match the accepted pin. Both two-tick unmodified prefixes exactly match the
shared state/RNG hashes; full shared references are reused. The observer invokes
each original see/World call once and records values without acquiring new cues.

```sh
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 --receipt out/te-base-production/native-checks.json -- node --import tsx scripts/diag/zone/te-base-production.ts out/te-base-production/native.json.gz
```

Two candidate natural endings, two .10-second reference prefixes, work/arm/
support budget assertions and typecheck pass. The receipt records exact runtime.
No new baseline executions, full games, roster panel, full-suite repeat or third
candidate case. The preserved H-strong input was not run with the posture action.
No experimental law or production controller is imported. The known center-hand
angular defect is not newly certified by passing work/budget checks.

The transfer test was added for one decision-changing risk: a successful
production front may respond differently from the historical experimental
contact failure. That risk materialized. **Stop this TE-base proposal here**;
keep the independent support result and adverse production trace visible.
Resume bounded RT/RG route work from the shared production evidence, with C's
loaded-but-unprotected LB_M encounter available as a separate future question.
