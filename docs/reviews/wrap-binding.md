# Secure lower wraps: force-transmitted recovery coupling

The latest thigh-brace/roll experiments exposed a missing distinction: hold
height and how tightly a wrap couples to the runner's corrective step were
represented by the same `legs` value. A tight, loaded wrap could leave enough
step freedom for a long dragging hold even when its arms were secure.

One new **default-off** experiment, `WRAP_BIND=1`, separates those properties.
With the existing `LEG_BRACE=1 TACKLE_ROLL=1`, it converts many time-limited
holds into physical finishes. It does not solve every tackle, repair the roll's
existing mirror failure, or certify the fast angled patch trajectory. **No
flag is promoted.** Offensive-line work stays parked.

## Starting point and ownership

Started from clean `codex/run-game-contact` at `e478826`; that branch and its
offensive-line evidence remain intact. Read the latest primary physics source
at `7646bb4`, its continued-recovery candidate and workboard. Then created
`codex/wrap-binding-physics` from `claude/live-gaps` `5a18887`, which includes
the primary work, the default-off thigh brace and the replacement roll.
Claimed this bounded coupling task through the workboard; primary retains
the independent angled-grip/yaw and recovery-integrator investigation.

Original runtime source:
`36fa5bce7adcb4f596b58d2e1f203729d8f72852c3efffafab3f559442d93dab`.
Candidate runtime source:
`2ff52b84ad0f4fe57c5e8f4dad430ee82d3463a7b8f212c4c2d6b0d9b19ccf85`.
[Receipt](../../data/reviews/current/wrap-binding.json) preserves the source
pins, raw-file checksums, native outcomes, all adverse changes, live-only game
samples and both refinement arms. Large histories remain in ignored
`out/wrap-binding/`.

## The minimal change and its assumption

`GraspJoint.recoveryCoupling` is an optional contact/placement coefficient.
Omission retains the existing height-derived coupling. `legs` still determines
default force height and its existing slide toward the ankle; the new field
does not make the hold lower, stronger or longer. Upper holds cannot use it to
bind recovery.

For a lower hold, the flagged controller uses its existing acquired grip and
actual closing quality, including the existing ground-stretch allowance:

```
secure = acquiredGrip * closingQuality
recoveryCoupling = legs + (1 - legs) * secure
```

This is a **reduced-model hypothesis about tighter wrap geometry**, not measured
two-leg encirclement or new anatomical limbs. The same quality already controls
the experimental roll; no extra observation, decision beat or RNG draw is added.

World uses that coefficient consistently in the acquired point's corrective
motion, velocity Jacobian, effective mobility, generalized load and support work.
Changing it preserves the acquired point rather than teleporting the grip.
Coincident duplicate claims use the same derivative and shared budgets. There
is no direct `feetLock` assignment, unavailable-step multiplier or guaranteed
fall. A zero-capacity full-binding claim buys no restraint; capacity approaching
zero makes full/partial responses converge. Real transmitting forces must
oppose a real attempted correction. Force, traction, inertia, grip capacity,
ratings, support integrator, fall thresholds and resolution are unchanged.

## Demonstrated mechanism

Native center 45-degree/6-yd/s, seed 3001, both mirrors: the two arms have
identical incoming bodies and profiles at the first grasp input, 2.65 s.
The initial lower share is .268 and grip capacity 2,267 kg·yd/s² in both.
The candidate's coupling starts at .848 and becomes 1 as actual closing
secures the wrap. Its lower share stays .268; it does not slip down to win.

At 2.80 s, ordinary brace/roll has capture deviation .375 yd and delivered
corrective load approximately `(-276,+222)` kg·yd/s². Binding has deviation
.703 and load `(-1188,+521)`. Actual grip forces are similar, about 1,261
versus 1,271: stronger **transmission to attempted corrective placement**,
not a higher grip capacity, explains the change. The carrier still requests
6 yd/s and can actually lose support. Its first fall is recorded in the
3.05–3.10 World step; native advance after acquired grip falls from a censored
19.114 yd to a completed physical finish at 3.503 yd.

On one frozen 20 Hz decision tape per arm, all 12/24/48/96-step replays of the
candidate finish in a physical fall. Maximum decision-endpoint position
disagreement against 96 is .0117/.0031/.0012 yd at 12/24/48. The predecessor
remains upright and has 2.036/1.856/1.651 yd disagreement on its own tape.
The tapes between arms are allowed to differ after the changed physics; they
are not interchangeable future opponent paths. Ninety-six is a numerical
comparator, not biomechanical ground truth.

## Native results and adverse controls

Original 288 inputs: 24 approach/speed/cut cells, six seeds, both mirrors,
generated rosters 61/62. The baseline, brace-only and brace/roll arms are also
collected before the change. Their entire native result rows reproduce exactly
afterward with binding off.

| Arm | Physical falls | Stopped progress | Escapes | Censored |
| --- | ---: | ---: | ---: | ---: |
| Current default | 234 | 0 | 52 | 2 |
| Brace | 144 | 0 | 54 | 90 |
| Brace + roll | 142 | 2 | 54 | 90 |
| Binding alone | 226 | 4 | 52 | 6 |
| Binding + brace | 184 | 4 | 54 | 46 |
| Binding + brace + roll | 192 | 6 | 54 | 36 |

Binding supplies most of the newly demonstrated finishing effect; roll adds
some finishes. Relative to brace/roll, 48 censored plays become physical falls
and six become stopped-progress finishes. One mirrored side-cut input
(90 degrees, 6 yd/s, seed 3005) changes from a fall to an escape; another
mirrored input changes from escape to fall. Twenty paired completed finishes
allow more observed advance, retained individually. Binding alone does not
improve current-default finishing and is not proposed for independent promotion.

Fresh 96 inputs use rosters 71/72 and 81/82, all 24 cells, both mirrors, new
decision seed 4001:

| Arm | Physical falls | Stopped progress | Escapes | Censored |
| --- | ---: | ---: | ---: | ---: |
| Current default | 78 | 0 | 18 | 0 |
| Brace + roll | 42 | 8 | 22 | 24 |
| Binding + brace + roll | 74 | 0 | 22 | 0 |

All 24 censored holds finish physically here, and all eight stopped-progress
endings become falls. There are no new lost tackles relative to brace/roll,
but ten completed paired finishes permit more advance. The remaining escapes
and every changed outcome remain in the receipt. Censored advances in the
original panel are observed endpoints, not completed tackle distances or NFL
yards after contact.

Two unresolved refinement controls prevent a wider conclusion:

- Rear center 180-degree/6-yd/s remains a moving censored hold. Binding reduces
  native observed advance from 22.530 to 18.070 yd, but 12-versus-96 position
  disagreement worsens from .225 to .477 yd.
- Fast patch 45-degree/8-yd/s changes from a censored hold to a native escape.
  Its frozen-tape 12-versus-96 disagreement worsens from .0217 to .628 yd;
  the finer errors are nonmonotonic. No physical fall is produced. This
  remains a control for primary's grip/yaw investigation.

The ordinary center side control remains a physical finish in both arms.
All eight cases per arm have matching observed/plain endpoint signatures,
including bodies, requests, minds, RNG and events. Each replay retains its
incoming body/profile and decision hashes, achieved slides/breaks and explicit
work/force-budget checks. The earlier phase-reconstruction observer assumes
the unbraced pitch source and correctly rejects use under `LEG_BRACE`; its
assertion was preserved. This collector uses a separate read-only World-boundary
observer rather than weakening that historical contract.

## Fresh games: diagnostic, not a promotion certificate

Six games: two fresh generated-roster seeds 211/212 in each of three arms,
with matching initial roster hashes. Later calls, situations and RNG diverge.
Canonical `carrier_contact` after possession defines the run contact; misses
and proximity do not. Curves include moving carriers only, use the common
0.1-second tracking/derived-speed operator and stop at live available samples.
Speed medians at later offsets have survival selection; counts are explicit.

| Arm | Legal run snaps | Moving actual-contact runs | Live at +.8 s | Yards/run, seed 211 / 212 |
| --- | ---: | ---: | ---: | --- |
| Current default | 65 | 56 | 24/56 | 2.364 / .836 |
| Brace + roll | 87 | 68 | 33/68 | 2.856 / 2.615 |
| Binding + brace + roll | 93 | 79 | 56/79 | 7.390 / 3.037 |

The large seed-211 run-gain change is an exposure/outcome shift to investigate,
not proof that finishing is fixed or an NFL average to target. New matched
tackle inputs support the local mechanism; these small adaptive games do not
certify broad realism, explosiveness or a general improvement.

## Validation and next step

Thirty new contracts pass for default equivalence, real loaded response,
zero/tiny-capacity limits, point continuity through coefficient zero, impulse/
Jacobian consistency, mirrors, duplicate claims, upper-hold exclusion and
independent patch linear/angular momentum and work at achieved deformed points.
Existing held-recovery and lower-grip law controls also pass.

The complete default suite has **1,596 passes and the same existing Tite
failure** (`test/zone-helper-check.test.ts:440`). All **141 Python checks**,
typecheck and build pass. The combined enabled center controls have 176 passes
and two failures: Tite and the approach-tackle mirror assertion. That mirror
assertion already fails with binding off and brace/roll on (.0245 yd reflected
endpoint difference); binding increases the mismatch to .0405. No assertion
or endpoint was re-pinned.

The unchanged 50-case common-patch controls are run on this current combined
source too: **43 pass / 7 fail** with all flags off, **42 / 8** with binding,
brace and roll enabled. The extra failure is the same approach mirror control.
The source-pinned historical 42/50 recovery-stage result remains separate;
neither the current default-patch nor enabled-patch result is a promotion pass.

No default was flipped. The support/recovery integrator and primary's
continued-recovery candidate remain separate. The next smallest step is to
repair the **existing roll's unreflected direction choice in a square tackle**
on the unchanged scenario contract, then repeat that control together with
the rear/fast-angle negatives. In an exactly collinear picture, `|| 1` chooses
the same world side in both reflected runs. Do this separately from another
binding or recovery adjustment; promotion still needs the preserved physical
and football controls.

```sh
# Node 22, from repo root. Change flags/output name for each table arm.
WRAP_BIND=1 LEG_BRACE=1 TACKLE_ROLL=1 node --import tsx \
  scripts/diag/tackle/panel.ts --seeds 6 --out out/wrap-binding/after-bind-brace-roll.json
WRAP_BIND=1 LEG_BRACE=1 TACKLE_ROLL=1 node --import tsx \
  scripts/diag/physics/wrap-binding-fresh.ts out/wrap-binding/fresh-bind-brace-roll.json
WRAP_BIND=1 LEG_BRACE=1 TACKLE_ROLL=1 node --import tsx \
  scripts/diag/physics/wrap-binding-refinement.ts out/wrap-binding/refinement-bind
# Preserve the expected nonzero default Tite and enabled mirror exits.
npm run test:all
npm run test:data
npm run typecheck
npm run build
python3 scripts/diag/physics/wrap-binding-report.py out/wrap-binding data/reviews/current/wrap-binding.json
```
