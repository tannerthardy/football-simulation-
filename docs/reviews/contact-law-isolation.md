# Common-point contact with baseline ground movement

The contact package can be separated without suppressing torque or borrowing
movement capacity. Select `handContact: 'patch', groundMovement: 'legacy'`.
It fixes the angular accounting defect and removes the full patch's pre-contact
ground drift. It **does not preserve the successful Y-playside protection**.
This is an experimental review candidate, not a default or baseline promotion.

Comparison remains `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`. The branch starts
from PR #14 at `22d3b34df18124ffad1a5eebd30d6f41bbb67d57`. Tested runtime source is
`c6b2c179a896aa1c9593def9af01c4869306a63bba9196a04e450e53f55d1904` throughout.
The [receipt](../../data/reviews/current/contact-law-isolation.json) preserves
each tested revision, validation hash, all 43 flags, input hashes, outcomes,
requested/delivered/achieved movement and adverse evidence.

## The separation

World's optional `groundMovement` selects the existing ground-facing arithmetic,
locomotion planning and yaw response independently of `handContact`. Omission
retains the historical center/legacy and patch/response pairing, including the
existing identical-prefix mode-switch diagnostic. Production remains center.

PlaySim passes that optional selection through. One `plannedClimb` selector in
`blocking.ts` now routes its **existing** free-movement preview by the resolved
ground model. Otherwise the isolated World would still use the full patch's
ground forecast inside helper collection. Existing center/full-patch routing
is identical. This is model plumbing, not a new collection or release policy.
The integration/YAC owner was notified before that edit; shared movement
libraries, kinematics, actuation and spacing are untouched.

The existing common-point contact package is retained intact: the force frame,
relative point velocity, effective mass, delivered body torque, centered force
travel, represented work, matched torso ordering and grasp Jacobians. It is
not a hand-torque-only insertion into inconsistent torso/transport frames.
No PR #7/#15/#16 grip integration, RB consistency correction, handover,
active hands, release heuristic, capacity or roster change is imported.

## Mechanical and no-contact gates

The original **13,076-byte RT/DE_S 2.40–2.45-s input is unchanged**. It was
replayed first; center pose/velocity/spin error is **8.44e-15**. Isolated contact
retains normal load 752.89 kg·yd/s², delivers tangent -168.91 and real moments
+55.56/+54.04 kg·yd²/s. Native ground torque is present, so a zero-total-angular
test would be incorrect for that loaded interval. Its work residual is
-2.82e-13. The isolated load need not equal either center's +460.04 or the full
patch's +135.63: point slip includes attained spin and the retained ground
response differs from the full patch.

Free versions at 1/12/48 substeps and both true mechanical reflections close
angular momentum to **3.64e-12 or better**, versus center's 15.15 error at 12.
They retain nonzero force-point torque and close linear momentum and work.
Simultaneous torso/hand controls also close angular momentum and work at all
three resolutions in both reflections. Arm impulse, arm work and support
motor budgets remain bounded.

Turning, reversing and falling no-contact controls retain every body and
ground report exactly, including reflected motion. In the three native runs,
all eight complete state/RNG hashes through the state at **0.40 s** match the
saved baseline. This contrasts with the full patch's first no-contact change
at 0.00–0.05 s. Default and existing full-patch routing are preserved.

## Earliest changed behavior

All three first differences occur during **0.40–0.45 s**, with the same 22
pre-World bodies, delivered intents, joint requests and consumed visual cues.
There is one hand connection and **zero torso contacts or strikes**. It is
Y/DE_S in the successful control, H/DE_S in the rightward adverse control,
and backside Y/DE_S in the weak call. Do not call the latter a playside mirror.

The [three portable reduced intervals](contact-law-isolation-first-contact.json)
reproduce both center and isolated native body states **exactly**. At the first
acquired force frame:

| Input | COM tangential slip | Rotational contribution | Common-point slip |
| --- | ---: | ---: | ---: |
| Successful Y playside | +.631 | -4.799 | -4.168 |
| Adverse H playside, rightward | +.271 | -3.098 | -2.827 |
| Weak call, backside Y pair | -1.653 | -3.493 | -5.146 |

Units are yd/s; the original center frames have almost identical COM values
but omit rotational point velocity. Thus the rightward controls' passive
lateral force reverses direction. `HAND_MOTOR=0`, drive is zero, and requested
limits/capacities are unchanged. This is a different response to **existing
motion**, not a new offensive or defensive hand command.

An independent ledger verifies, for each body,
`I * deltaSpin = deliveredHandMoment * dt + groundYawImpulse`, to ≤3.56e-15.
For example, Y's -8.889 hand impulse and +7.039 external ground impulse produce
-1.850 spin impulse; DE_S's -10.437 hand and -12.933 ground produce -23.370.
Removing either moment to preserve a football ending would break the ledger.

One bounded 12/48 comparison was added because a numerical artifact could
change attribution of these large native regressions. In the first interval,
maximum refinement disagreement is .00000743 yd, .000749 yd/s and .01280 rad/s;
the law changes reach .00751 yd, .27156 yd/s and 3.48885 rad/s. The earliest
law effect survives refinement. This **does not establish whole-ending
convergence**; no 48-substep football campaign was run.

Delivered intent/facing first changes on the next tick, .45 s. The earliest
original behavior requests change later: RT at .55 s in both rightward controls,
CB_S at .65 s in the weak call. Their acquired state has already changed.
There is no demonstrated wrong-side controller policy that warrants tuning.

## Protection through actual runner arrival

Only the same three under-center `ace_12` inputs were used: O31/D32, seed 3,
strength .55, Over/base43/Cover3, LOS40, no pressure, declared 25-s cap. All
43 baseline flags are unchanged, including active hands and experimental run
reads off. The legacy `mirror` is a tight-end placement contrast; the weak
call attacks the other side of the same asymmetric front.

| Input | Center baseline | Isolated contact, legacy ground |
| --- | --- | --- |
| Successful Y playside | Clean LOS 3.60; CB_S grasp 3.65; ending +1.496 yd | DE_S grasp 2.35 at -1.608 yd; no LOS arrival; tackle 4.40, ending -.856. **Protection regresses.** |
| Adverse H playside, rightward | DE_S body contact 2.65; no LOS; ending -.206 | DT_S body contact 2.40 at -1.227; no LOS; tackle 3.65, ending -.969. **Still fails; a different first-level defender arrives.** |
| Adverse H playside, weak call | DE_W grasp 2.30 before LOS2.60; ending +2.372 | Clean LOS2.40; LB_M grasp2.85 at +3.135; tackle4.10, ending +9.500. **First-level protection improves.** |

All three finish naturally; zero censored. A changed gain is neither the
acceptance criterion nor proof of realism. In particular, the weak result is
an observed transfer on one retained input, not an outcome-distribution claim.

Follow-up [PR #18](https://github.com/tannerthardy/football-simulation-/pull/18)
corrects the earlier blanket claim about RT: he acquires lateral load from
1.50 through 1.95 s, develops no compression, then loses functional reach at
2.00. He is unloaded at runner arrival. At first runner contact RT is about
**2.094 yd** from DE_S. See the [source-pinned trace and retention handoff](https://github.com/tannerthardy/football-simulation-/blob/830f6e2fe7ef19604b5033e9c9115413d5d2ef4c/docs/reviews/ace-protection-traces.md);
original receipts, witnesses, source/flags and mechanical results are unchanged.
Y remains alongside the end, carries **103.98 lateral load** in the actual
physics interval, but has no compressive load; it does not protect the runner's
approach. Y never earns the baseline's 2.00-s climb. At 2.10 s Y requests
(-3.650,-4.773) yd/s through the engagement and achieves (-.663,-1.509);
the end achieves (-2.560,-.548). At 2.35 Y/end and RB are all still upright.
The failure cannot be attributed to a newly earlier helper release or a fall.

In the rightward H case, H's existing climb changes 1.75→1.70 s, but RT still
delivers **850.18 normal /84.78 lateral end load** when the runner meets DT_S.
RG/DT_S's compressive load falls to zero while its lateral load is 103.83;
DT_S delivers **133.38 kg·yd/s torso impulse to RB**. The interior surface
fails despite maintained end contact. This is not evidence that stronger
end retention alone fixes the runner's protection.

In the weak case, the original RT .90-s and H1.25-s climbs are unchanged.
The runner clears LOS before an end contact; the first acquisition is instead
LB_M downfield. Delivered hand load, maintained geometry, interception and
runner arrival must be assessed together; an engagement or early departure
alone is not successful protection.

The collector preserves World joint outputs **before** tackle acquisition can
remove blocking joints. Post-wrap empty joints would wrongly classify Y's
loaded contact as an earlier release. The enriched observer matches every
previously collected state/RNG hash, reusing the existing neutral plain runs.

## Review boundary and reproduction

The local common-point response is mechanically accounted for and justified
by acquired motion. That does not certify the entire later defensive win:
closed-loop acquisition, control and contact maintenance still determine lane
protection. There is no basis here for a release timer, stronger grip, earlier
RB cut or forced yardage. The physics owner should review this **separation**
and the zero-compressive-load/retained-lateral-contact assumptions on the saved
Y/DE_S interval before declaring those native losses realistic. Keep the
legacy-ground candidate and the existing response-ground package separately
identified. Baseline remains 4ded6b6; the integration owner decides final
combined verification after review.

**89 focused tests and typecheck pass**, with source-identical receipts across
the tested revisions. No new roster inputs, broad census, full suite or games.
Recorded launcher cost is **83.38 s**, including a .25-s failed output save and
a 48.97-s interrupted offline reducer that repeatedly decoded saved packets.
That reducer was cached; no physics/native simulation was interrupted. Native
neutral pairs take 4.37 s; the pre-wrap output extension reuses those complete
histories and takes 3.87 s. Final packet reduction takes 4.15 s. Later receipt
compaction/publication advances no simulations.

Use Node22.23.3. These independent scripts work from this checkout without the
large ignored native packets; the portable first intervals retain the original
two-body bodies/profiles/requests and both expected native states:

```sh
npm run baseline:run -- --candidate --receipt out/contact-isolation/witness-final-checks.json -- node --import tsx scripts/diag/physics/contact-isolation-mechanics.ts out/contact-isolation/mechanics.json
npm run baseline:run -- --candidate --receipt out/contact-isolation/first-checks.json -- node --import tsx scripts/diag/physics/contact-isolation-first.ts out/contact-isolation/first.json
npm run baseline:run -- --candidate --receipt out/contact-isolation/native-checks.json -- node --import tsx scripts/diag/physics/contact-isolation-native.ts out/contact-isolation/native.json.gz
npm run baseline:run -- --candidate --receipt out/contact-isolation/protection-checks.json -- node --import tsx scripts/diag/physics/contact-isolation-native.ts out/contact-isolation/protection.json.gz out/contact-isolation/native.json.gz
npm run baseline:run -- --candidate --receipt out/contact-isolation/focused-checks.json -- npx vitest run --project core test/contact-ground-isolation.test.ts test/keeper-contact-law.test.ts test/hand-angular-transfer.test.ts test/hand-force-point.test.ts test/contact-angular-transfer.test.ts test/hand-comoving.test.ts test/gait-facing-contract.test.ts
npm run baseline:run -- --candidate --receipt out/contact-isolation/typecheck-final-checks.json -- npm run typecheck
```

Run only checks relevant to the next decision; this command list is a
reproduction inventory, not a mandatory testing ladder. Full offline reduction
can reuse PR #11's saved `carrier-design.json.gz` and `carrier-design-weak.json.gz`
by passing their directory to `contact-isolation-report.py`. Their hashes and
compatibility with the pinned baseline histories are recorded in the receipt.
