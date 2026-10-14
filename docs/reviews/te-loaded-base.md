# Loaded TE approach base: isolated historical test

**Subsequent checkpoint:** integration published the shared accepted-production
replay in PR #26 during this investigation. The separate
[PR #28 transfer](https://github.com/tannerthardy/football-simulation-/pull/28)
loses the Y clean crossing despite loaded C/LB_M contact and retains the weak
initial DE_W contact. **TE-base adoption is now parked.** The historical
support/keeper benefit below remains valid on its own source/profile; it is
not a current-production improvement. No extra TE panel or tuning follows.

Carrying the existing .70 base into first contact has a meaningful local benefit
in the saved Y-strong case. Y's early support displacement decreases and the
unchanged RT controller develops a keeper block through the runner's encounter.
The successful H-weak control remains successful, with a later crossing and
narrower end clearance. This earns a separate current-production comparison
after integration publishes the shared Ace replay; it does not establish a
general TE policy or authorize importing this diagnostic branch.

The [PR #18 contact review](https://github.com/tannerthardy/football-simulation-/pull/18#issuecomment-6173825589)
cleared this investigation. Historical comparison remains `4ded6b6`. This test
uses PR #17's unchanged isolated runtime `c6b2c179a896aa1c9593def9af01c4869306a63bba9196a04e450e53f55d1904`,
explicit patch hands/legacy ground and the exact 43 historical flags. It is
**not** the approved 44-flag/components=1 production profile. Observed `develop`
is still `a1b16e666a9ee7d1bc1d2aecba141fc535863b24`; integration's new replay was
not published at this checkpoint. Neither experimental contact nor TE posture
is promoted. There are no production source changes relative to PR #17.

## One intervention, before the existing contact technique

The prior [unloaded study](https://github.com/tannerthardy/football-simulation-/pull/23)
found little free-path cost, but could not assess loading. In the saved native
run, Y enters contact at posture .1995. The loaded technique already requests
.85, yet reaching it takes about .26 seconds under the existing finite rate.

The diagnostic wraps **only Y's returned approach command** in strong, and
**only H's** in the weak opposing control. When the installed job is reach or
cutoff, the actor is upright and unengaged, and its ordinary command has no
explicit posture, it adds `.70`. It preserves every other returned field.
Contact refinement and teammate spacing run afterward, unchanged. Engaged
owner .85 and helper .75 requests retain ownership; climbers and other actors
are untouched. The assignment supplies the action eligibility, with no new
opponent picture, decision cadence, target, lateral track or release condition.

The body reaches the base through World; it is never reset in either native
run. All physical profiles remain identical. No grip, strength, roster,
movement capacity, hand policy, RB reference, solver or default changes occur.
This is an action experiment rather than a demonstrated production-controller
error correction. Numeric .70 remains the existing model action, not a
calibrated stance for every TE.

## Actual protection and adverse evidence

| Measured behavior | Isolated reference | TE-base intervention |
| --- | --- | --- |
| Y first contact interval | .40–.45, starts .1995 posture | .40–.45, starts .6995 posture |
| Y maximum support displacement, matched .40–1.65 window | .462838 yd | .339568 yd |
| RT first delivered load | 1.50, lateral only | 1.40, useful normal and lateral load |
| Y release to existing LB_S job | Never earns release | 1.65, existing secured-keeper decision |
| Runner's first declared contact, Y case | DE_S grasp, 2.35, depth −1.608 yd | LB_M grasp, 3.55, depth −.269 yd |
| Y runner crossing | None | 3.75, after linebacker contact |
| Weak H release / LT keeper | 1.25 / retained | 1.25 / retained |
| Weak runner crossing | 2.40 | 2.50 |
| Weak closest torso clearance from DE_W before first contact | .144651 yd | .029979 yd |

Contact event times above are controller entry stamps; their physics interval
ends .05 seconds later. Saved hand fields are **signed tick averages**, not
instantaneous samples or proof of continuous anatomical attachment.

RT's commands and hand eligibility remain the original controller. In the
reference it delivers lateral load without normal compression, separates and
loses functional reach near2.00. In the trial it delivers positive normal load
from1.40 through the 3.55–3.60 first-carrier-contact interval, remains loaded at
the runner's closest end encounter around2.60, and holds useful COM distance.
DE_S never acquires the runner or delivers a runner torso impulse in this native
trial. The reference DE_S grasps him first and later transmits body impulses.
This is improved first-level protection, not an inference from a job or force
alone. The runner still reaches LB_M in the backfield: the whole run is not
fixed. The improvement does not implement RT joining/recovery and cannot erase
its independent route/information question.

The opposing weak case keeps its existing first-level handoff and has no DE_W
runner impulse or carrier acquisition. Its closer pass remains outside the
World's actual torso footprint: `.9 × (bodyRadiusA + bodyRadiusB)`, not the
unscaled radius sum. The .10-second crossing delay and .115-yd loss of clearance
are material tradeoffs to retain. They do not disappear because final gain
increases. Both TEs stay upright, but later whole-run support peaks increase:
Y .3793→.3955, H .0274→.1801, mainly outside the matched first-level comparison.
There is no claim that lower posture improves every phase.

Both candidates reach natural tackle endings. Y changes −.856→+.166 yd,
end4.40→4.65; weak changes +9.500→+41.651, end4.10→8.65, with LB_M first
contact2.85→3.25. These endings are archived, **not** optimization targets or
proof of realism. The weak run's long later carry is not established to converge
under grip refinement. No attempt is made to restore the original historical
Y gain. H-strong remains a declared saved adverse control in the input manifest;
it was not run with this intervention. Acceptance across all three controls
therefore remains unestablished, and the panel was not expanded.

## Direct physical effect, with random execution excluded locally

The additional [117,244-byte portable input](te-loaded-base-fixed-contact.json)
holds all22 native bodies, movement requests, acquired joints and hand capacities
fixed for the first loaded Y interval. A conditional arm substitutes **only the
posture already attained by the finite native trial**. This is a synthetic
same-state sensitivity check, not another native route or an instantaneous
controller action. The unchanged arm reproduces all native poses/velocities/
spins and mean hand outputs exactly. No RNG, fresh perception, teammate removal
or synthetic future contact enters the operator.

At12 substeps, Y support displacement falls .0053309→.0033368 yd. Mean normal
force remains0 and lateral force remains357.9917: the improvement is not
stronger hands. The larger existing support base permits ground yaw impulse
7.03878→9.01887 kg·yd²/s against almost identical hand impulse −8.88890.
The resulting +.7652-rad/s spin difference is accounted for by actual hand
and ground torque; the ledger residual is at most3.56e-15. At48 subdivisions
the support benefit and spin difference remain close (−.001913 yd and+.76485).
Support availability is1 in both arms. This establishes an initial support/yaw
effect, not extra sustained arm capacity or a guaranteed defensive ending.

For H-weak's first meaningful hand load at.95, both native histories have already
reached the existing helper's .75 posture. The same-state posture comparison has
**zero achieved difference** at12 and48. Weak's later differences therefore
cannot be attributed to an ongoing base advantage at that interval; preceding
approach, geometry, teammate interaction and subsequent decisions matter.

First-contact native Y hand requests are identical (push716.3014, hold0,
steer357.9917) and engage at the same tick. Later native paths still can alter
execution and RNG ordering; the fixed-state test does not lock that randomness
or prove the whole ending converges. Work and arm/support budgets pass in the
two native candidates and all fixed intervals.

## Reproduction, cost and next decision

[Input manifest](../../config/te-loaded-base.json),
[native probe](../../scripts/diag/zone/te-loaded-base.ts),
[fixed-contact probe](../../scripts/diag/zone/te-loaded-base-fixed-contact.ts),
[offline protection reducer](../../scripts/diag/zone/te-loaded-base-report.py),
[receipt](te-loaded-base-receipt.json).

Use Node22.23.3. The portable fixed input does not require the large raw files:

```sh
npm run baseline:run -- --candidate --receipt out/te-loaded-base/fixed-checks.json -- node --import tsx scripts/diag/zone/te-loaded-base-fixed-contact.ts
```

For the native comparison, reuse the neutral PR #17 packet at the manifest path
or supply identical compressed bytes as the second probe argument:

```sh
npm run baseline:run -- --candidate --receipt out/te-loaded-base/native-checks.json -- node --import tsx scripts/diag/zone/te-loaded-base.ts out/te-loaded-base/native.json.gz /path/to/protection.json.gz
python scripts/diag/zone/te-loaded-base-report.py out/te-loaded-base/native.json.gz /path/to/protection.json.gz
```

Two full candidate plays and two .10-second neutral reference prefixes cost
4.60 wrapped seconds; the saved full reference endings are reused. Two
eight-interval mechanical executions cost .314+.250 seconds; the second adds
the torque ledger omitted from the first output. Two typechecks cost
10.30+9.68 seconds, with the final check covering the added ledger. Total
recorded wrapped simulation/check time is25.15 seconds, excluding offline
JSON reduction and setup. There are no games, broad panel, full-suite repeat or
additional TE candidate. The ledger diagnostic was added to distinguish real
posture torque from unaccounted contact rotation; local48 refinement answers
that same physical question and does not certify whole-run convergence.

Keep the base action isolated for one current-production transfer question
when integration publishes its exact-pin Ace reference. Do not promote it
from this historical experiment, expand to other TEs, or bundle it with RT
track/recovery, RG anchoring, release or strength changes. RT's changed joining
surface is useful evidence for that separate assignment; RG/DT_S's H-strong
traffic constraint remains untouched. No shared movement file was edited, so
YAC has no overlapping source change to reconcile in this branch.
