# Isolated stalk visual-information correction

The far-contact stalk movement request now uses the defender's acquired
`sim.see` position. The production diff is only the two-line correction
proposed in [PR #24](https://github.com/tannerthardy/football-simulation-/pull/24).
No diagnostic ancestry was merged. Contact eligibility, the existing fit,
1.2-yard stand-off, nonretreating x landmark, .85 speed fraction, through-speed
1, braking, hands, collection and all shared physics remain unchanged.

The user lifted the PR #18 hold and assigned this extraction. The existing
worktree had unrelated local inputs; a separate worktree preserves those
files and the unmerged seam/Stick candidate. This branch starts from accepted
`develop` **`a1b16e666a9ee7d1bc1d2aecba141fc535863b24`**, runtime
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`.
`4ded6b6` remains historical, not the current-source comparison.

The one question is whether the **actual `RunBlocker.update`** uses acquired
evidence for its far movement while preserving fresh behavior and felt
contact. [The small frozen witness](../../config/stalk-visual-request-witness.json)
is copied exactly from PR #24 `765c25c3bc781ed572fdb5d4f39531453d58b31a`.
It preserves the Z/CB_S identities (indices 9/17), own body, defender body,
installed drive and recorded command at 2.35 s. Its held old picture and
position substitutions remain **synthetic available-input controls**, not
native receiver observations or physically evolved counterfactuals.

## Actual controller results

The probe calls the production controller in both source arms; there is no
shadow movement formula. Own body/capabilities and assignment stay fixed.
Hidden substitutions remain outside strike range so they cannot create felt
contact. Near-contact eligibility has its own opposing control.

| Same-input comparison | Accepted source | Isolated correction |
| --- | --- | --- |
| Held picture, hidden +.25-yard target shift | Request changes .289613 yd/s; no target picture consumed | Request change exactly zero; one acquired picture consumed |
| Fresh picture, visible +.25-yard target shift, hidden body fixed | Request does not change | Correct lateral response +.289613 yd/s |
| Fresh picture matching current defender | Recorded `(0, +4.774649)` request | Exact same serialized command |
| Physically reachable engage, old visual picture | Engage/stand | Same engage/stand; no new visual prerequisite |
| Held synthetic old picture | Live-coordinate request +4.774649 yd/s | **Adverse request +2.550517 yd/s retained** |

Seven new contracts include a generated Agent/PlaySim controller control,
hidden invariance, visible response, exact fresh compatibility, held loss,
no double advancement of `Perceived.age`, and unchanged contact eligibility.
Together with 22 existing block-fit contracts, **29 pass**. Typecheck passes.
No code assertion was removed or weakened. An initial probe representation
assertion failed because explicit `undefined` optional fields are omitted
from archived JSON; comparing the exact serialized command repaired the
harness while the production source remained unchanged. The failed receipt
is retained.

## Is the stale slowdown appropriate?

**Its information source is appropriate.** A far defender's hidden new
coordinates cannot improve the request. The controller must act on the
picture it actually receives. `Perceived.pos` is already projected by the
ordinary perception operator; this patch does not advance it again by age.

**Its physical execution is bounded by the unchanged law.** In the held
control, the fit is only .632996 yards away. Existing stationary-arrival
braking requests `sqrt(1 + 2 * (.8 * brake) * (distance - .15))`, giving
2.550517 yd/s. The fresh fit is 2.062395 yards away and requests 4.774649.
Neither request changes a capability or directly sets achieved velocity.

From the exact same body moving laterally at 4.435590 yd/s, one unchanged
50-ms free-motion step achieves **4.107553** with the held request versus
**4.503130** with the fresh request. Held acceleration is
`(-2.698521, -6.560738)` yd/s², within the existing gait envelope. These
are free steps without contact loads, not World contact replays or native
continuations. Existing block-fit contracts separately retain their World
controls.

**It is not proof of good moving-target collection.** The held picture itself
reports the defender moving laterally at 4.584311 yd/s. A 2.550517 request
therefore concedes 2.033795 yd/s of relative separation if those velocities
continue. The retained static fit ignores the known defender velocity;
removing privileged position does not repair that collection objective.
Restoring hidden coordinates or increasing speed/braking would conceal the
question. No broader stalk or interception policy change is included.

The magnitude also needs its correct scope. Separately applying the ordinary
dead-reckoning operator to the archived raw sample supplies a fit 2.008289
yards away and requests **4.709627** yd/s; its free step achieves **4.500514**.
This operator control is not the original native perception history. It
shows why the large held-input loss must not be presented as the measured
effect of normal .30-s perception. Both controls remain in the receipt.

## Pins, cost and disposition

[The portable receipt](stalk-visual-request-receipt.json) records both actual
controller arms, supplied evidence, requested/achieved movement, input and
harness hashes, all **44 accepted flags/components=1**, World defaults,
exact commands, failed probe and focused checks. The accepted comparison
was tested at `a6e90c3a57155b9f554d3ec324758041693214f7`; only diagnostic files
were added to accepted runtime. The extraction/contracts/typecheck are at
**`ce93c3bcca17832b16950988703ca95a8aff6492`**, runtime
**`1eb3b26a97eacc6896c2ee510ef5afefe9583381307f5d754925cb4a5d1d544d`**.

Diagnostics completed 12 free steps total, zero World ticks, zero native
plays/games and no full-suite repeat. The receipt accounts for every launcher,
including the failed representation check. No new native ending, improved
protection or complete collection/transfer claim is made.

The small information correction is supported for isolated integration review.
Keep it separate from the existing moving-fit, TE track, hands and contact
questions. The designated integration owner runs preserved combined checks
on the exact candidate. If collection work is separately assigned, the next
bounded experiment is the same acquired pictures/capabilities with a static
fit versus an attainable moving fit, opposed by a slowing/turning defender.

Reproduce through the accepted-profile launcher:

```sh
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 --receipt out/stalk-review/controller.json -- node --import tsx scripts/diag/stalk-visual-request.ts candidate config/stalk-visual-request-witness.json out/stalk-review/result.json
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 --receipt out/stalk-review/contracts.json -- npx vitest run --project core test/stalk-visual-request.test.ts test/run-block-fit.test.ts
```
