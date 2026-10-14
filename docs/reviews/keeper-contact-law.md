# Saved keeper contact: law repaired experimentally, promotion still blocked

The ordinary RT/DE_S reproduction confirms a real center-hand angular defect.
The **existing** common-patch law already repairs its independent mechanical
control. No additional solver implementation was needed to repair this witness.
Its football transfer remains adverse and confounded by other behavior selected
by the same mode. Do not enable the full patch or tune the keeper to regain a
historical result.

This separate diagnostic branch, `codex/keeper-contact-law`, starts from the
unchanged comparison **`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`**. Code/checks
are pinned at **`86fe58926c03529ca7522af27019a666d617b16d`**. Runtime hash remains
`8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c`;
World hash remains `ed1708d764c355da60bd31c115f557baf3d81af18c89f3479c471bf981732ca2`.
PR #7's slow reference, timing optimizations, bounded-force kernels and support
history handoff remain separate. Capacities, recovery laws, controllers, test
expectations and production/RB defaults are unchanged.

## What the recent run-game work establishes

[PR #11 at `45a35bb`](https://github.com/tannerthardy/football-simulation-/blob/45a35bbe1b09554e874370604c83df47fca809f6/docs/reviews/under-center-zone-runner.md)
preserves three under-center `ace_12` inputs and two independent problems:

- The RB presses toward a live aim but evaluates early abandonment against the
  snap aim. The failed rightward decision's mismatch is 1.433 yd. Its effect on
  the ending is untested; no new read rule is justified by that fact alone.
- The keeper's 13,076-byte World witness reproduces the native interval, but
  center hands violate angular conservation in the clean free pair. This is a
  law failure with active hand drive disabled, not proof of endpoint causation.

The witness here is copied **byte-for-byte**, with its original provenance.
The original successful/failed/rightward and explicit weak calls are retained.
The legacy “mirror” changes tight-end placement; neither it nor the weak call
is a full geometric reflection. The independent mechanical reflection is real.

One prose correction matters: the successful baseline's first stopper is
**CB_S**, at 3.65 s, rather than SS. PR #11's saved receipt itself records CB_S,
and all three recreated complete histories match that receipt exactly. Therefore
the prose's claim about an intentionally free safety is not supported by this
event. Protection through LOS is still observed; the later corner assignment
requires its own assessment.

## Cause and exact mechanical replay

Center hands deliver lateral impulses at two different COMs without balancing
body moments. Linear momentum and work can close while orbital angular momentum
changes. A correct common force point uses the same arms for relative point
velocity, effective mass, torques and kinetic work. Ground and torso timing must
also agree with the finite hand force's centered travel.

The saved native center step at 2.40–2.45 s reproduces within **8.44e-15** across
pose/velocity/spin. In free motion, with no ground impulse/yaw, torso contact or
strike, the existing patch closes the angular defect:

| Fixed World substeps | Center angular change | Patch angular change |
| --- | ---: | ---: |
| 1 | +16.278731 | 0 |
| 12 | +15.153603 | −3.64e-12 |
| 48 | +15.079236 | 0 |

Units are kg·yd²/s. Both mechanical reflections have opposite center errors
and the same near-zero patch residuals. Refining the center law does not repair
the defect. Maximum patch linear residual is 8.04e-14 and work residual is
8.89e-14 in these free controls. Unequal partitions, a purely passive dissipative
tangent and force-free co-motion also pass. Existing hand/material-point/mixed
torso laws supply the directly affected opposing controls.

In the **loaded native two-body interval**, patch mode changes mean tangential
load from **460.04 to 135.63 kg·yd/s²**; normal load remains 752.89. RT endpoint
spin changes −2.18262→−1.53096 rad/s, DE_S −4.17398→−3.29002. The old COM-slip
calculation and common-point slip are different; a smaller delivered load is
not a weaker capacity. Native ground torques are present, so its angular change
is not evaluated as a zero-external-torque conservation control.

## Preserved football controls and adverse transfer

All settings use the 43-flag baseline profile, including `RUN_READ=0`,
`RUN_READ_TURN=0`, `HAND_MOTOR=0` and `HAND_FIGHT=0`. The experimental law is
selected explicitly through the existing World API. Three arms reuse exactly
the saved rosters, calls, seeds, formation, strength .55 and LOS 40:

1. Default center law.
2. Existing full patch from the snap.
3. Identical center history through 2.40 s, then the existing full patch.

Each continuation preserves **48 ticks of complete state/RNG hashes** exactly.
The failed rightward witness's actual pre-World bodies and intents also match
the portable input exactly. These are whole-mode diagnostic interventions:
patch additionally selects different ground-facing behavior, torso ordering and
grasp laws. They cannot isolate the causal contribution of hands alone.

| Existing control | Center | Patch after identical 2.40-s prefix | Patch from snap |
| --- | --- | --- | --- |
| Successful rightward, Y playside | Clean LOS arrival at 3.60; CB_S grasp 3.65, +.375 yd; ending +1.496 | LB_M grasp 3.45, −.042 yd, before LOS 3.55; ending +1.392. Protection regresses. | DT_S body contact 3.05, −1.033 yd; no LOS crossing; ending −.204. Protection regresses. |
| Failed rightward, H playside | DE_S body contact 2.65, −.234 yd; no crossing; ending −.206 | DE_S body contact still 2.65, −.246 yd; no crossing; ending −.881. No rescue. | DE_S grasp 2.35, −1.109 yd; no crossing; ending −.930. Earlier adverse contact. |
| Explicit weak call | DE_W grasp 2.30, −.962 yd; crosses 2.60; ending +2.372. Interrupted approach. | First contact/crossing unchanged; ending +3.093. Switch occurs after contact, so this is not a protection improvement. | Crosses 2.40 before DE_W grasp 2.45, +.539 yd; ending +1.480. Protection improves while final gain decreases. |

Every new arm ends in a tackle; **zero censored plays**, with the declared 25-s
cap retained. First contact is the native event, sampled at 20 Hz. Exact first
contact depth is stored separately from the event's rounded position. A grasp
event denotes acquired contact; body records separately report delivered
impulse. Nearby bodies alone do not count as contact. At the failed rightward
2.65-s body contact, RT still has genuinely loaded end hands in both center and
prefix-patch arms; an active engagement alone would not establish protection.

## First divergence and the remaining causal boundary

The from-snap patch's **first state difference is 0.05 s**, with identical
requests, **zero hand joints and zero body contacts**. Ground-facing/planning
behavior already changes RB/OL rotation and movement. This rules out treating
that initial event as a grip-timing error or interpreting the full-play
regression as evidence against the isolated hand conservation repair.

At the identical-prefix switch, delivered requests are the same for the 2.40-s
step; achieved movement/rotation changes first. The failed keeper's first
changed movement request follows at **2.45 s**: (1.14177, −2.40217) becomes
(1.15559, −2.27043) yd/s. This is not a demonstrated reversal of lateral intent.
The end still reaches the runner at 2.65. The successful prefix arm instead
loses protection to LB_M; C has loaded linebacker hands on the preceding step.
Neither observation isolates why that block fails or certifies a legitimate
defensive win under an independently corrected complete model.

The single best solver next step is to **separate the existing common force-point
contact correction from its ground-facing/locomotion changes**, then rerun this
same interval and these controls. Preserve the old ground law for that bounded
comparison, not by weakening torque, force or work accounting. Include the
mixed torso/hand law control: simply adding torque to a center impulse while
retaining an inconsistent collision/force frame is insufficient. No new solver
variant is installed in this diagnostic pass.

## Evidence, cost and reproduction

[Compact receipt](../../data/reviews/current/keeper-contact-law.json) records
the original evidence pin, exact flags, collector/operator hashes, native
history checks, mechanical errors, budgets, adverse outcomes and validation.
**68 focused tests and typecheck pass at `86fe589`**. An initial diagnostic
typecheck found two packet/event typing errors; both were corrected, and the
failed command remains in the cost record. No games, new football inputs,
broader census or full suite were run. Nine historical patch-gate failures
remain documented in [PR #7](https://github.com/tannerthardy/football-simulation-/pull/7);
they were not rerun, repinned or assigned one common cause. The integration
owner retains responsibility for the exact combined candidate's full suite.

Final nine native executions take **5.13 s in the collector**; all recorded
launcher commands, including the failed check and corrected reruns, total
**46.68 s**. This is validation cost, not an uninstrumented solver benchmark.
Raw packets stay under ignored `out/keeper-contact-law/`.

Use Node 22.23.3, fetch PR #11's evidence commit, and run from this checkout:

```sh
mkdir -p out/keeper-contact-law
npm run baseline:run -- --candidate --receipt out/keeper-contact-law/mechanical-final-settings.json -- node --import tsx scripts/diag/physics/keeper-contact-law.ts out/keeper-contact-law/mechanical-final.json
npm run baseline:run -- --candidate --receipt out/keeper-contact-law/native-final-settings.json -- node --import tsx scripts/diag/physics/keeper-contact-native.ts out/keeper-contact-law/native-final.json
npm run baseline:run -- --candidate --receipt out/keeper-contact-law/focused-final-settings.json -- npx vitest run --project core test/keeper-contact-law.test.ts test/hand-angular-transfer.test.ts test/hand-force-point.test.ts test/contact-angular-transfer.test.ts test/hand-comoving.test.ts
npm run baseline:run -- --candidate --receipt out/keeper-contact-law/typecheck-final-settings.json -- npm run typecheck
python3 scripts/diag/physics/keeper-contact-report.py
```

The reducer reuses the exact saved PR #11 receipt from Git and verifies all
three complete histories, initial bodies/profiles/inputs and continuation
prefixes. It runs no simulations. Documentation/reducer publication after the
tested code pin does not change runtime or the checked TypeScript sources.
