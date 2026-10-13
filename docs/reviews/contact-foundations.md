# Contact foundations: a force can have the right dose and the wrong timing

The subsequent [bounded grip-timing candidate](grip-timing.md) implements and
tests the next correction. This document and its receipt retain the original
diagnostic stage; its unchanged-runtime statements refer to that stage.

The reduced body is sufficient to test the next uncertainty. More joints or
larger physical capacities would not fix either defect below. This pass adds
independent mechanical references and an acquired-state replay; it changes no
runtime code, defaults, player capacities or existing test expectations.

Baseline: `codex/run-game-integration` at `4ded6b6`, profile
`run-game-2026-10-13`, Node 22.23.3. Runtime SHA-256:
`8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c`.
Research branch: `codex/contact-foundations`. The [compact receipt](../../data/reviews/current/contact-foundations.json)
records actual flags, World options, tool hash, checkpoint fingerprints,
native endings and every failed patch-promotion control. Raw traces stay in
`out/contact-foundations/`.

## What can currently be trusted

| Layer | Demonstrated behavior | Remaining limit |
| --- | --- | --- |
| Planted response | A stationary issued plant under a modest external hand force follows the independent Newtonian impulse/travel reference, with no invented instantaneous ground reaction. Both mirrors, center/patch, 1/12/48 subdivisions. | This is the first 50 ms of an already-issued request, not proof of realistic athlete stiffness, static anchoring or force capacities. Later leg-drive and recovery responses need separate checks. |
| Contact translation and rotation | Existing off-center hand/torso oracles, shared budgets, material-point motion and yaw controls pass. The common-point model conserves total angular momentum. | Production center hands still omit the sideways force's spin transfer. |
| Grip acquisition and maintenance | Existing invalid-reach, zero/tiny-load, passive-work, acquired attachment, shared grip and release controls pass. | Correct impulse and work do not establish correct timing within an interval. |
| Loaded stepping and recovery | Existing force-transmitted placement, common leg/traction budgets and actual-facing controls pass. | Native loaded paths remain resolution-sensitive; do not infer sound contact mechanics from a similar ending. |

The angular audit reuses the existing independent operator, rather than
inventing another implementation-based test. On the current source, all 72
normal-force controls pass in each mode. All 72 production tangent cases fail
angular conservation: absolute change is 3.71248–3.71276 kg·yd²/s across a
0.2 s isolated interaction, despite closed linear momentum and energy.
All 72 common-point tangent cases pass; largest angular change is 4.1e-12.
This confirms the previously documented production defect, not a new discovery.

## The first loaded rotation error

Use the existing angled witness: 45°, 8 yd/s, difficult carrier, seed 3001,
patch contact, both mirrors. At its first grip at 2.65 s, capture the **whole
acquired World checkpoint**: bodies, material attachments, held support,
pending work, report identity and the already-issued 20 Hz plan. No constructor
re-acquisition, controller decisions or RNG draws occur during replay.

Resolve only the next 4.167 ms into 1/2/4/8/16/64/256 local intervals. The
256-partition result is an engineering reference, not an NFL target or a
proposal to run every play at 3,072 substeps per tick. Ground-only and grip-only
ablations share the same starting state and duration. Ground-only removes the
grip; grip-only removes active ground effort. These are isolation controls.

| Same acquired interval | Tackler spin error, 1 versus 256 partitions | Facing error | Frozen-frame force reference's facing error |
| --- | ---: | ---: | ---: |
| Ground and grip | 0.13907 rad/s | 0.0030269 rad | 0.0000661 rad |
| Grip only | 0.04807 rad/s | 0.0028202 rad | 0.0000584 rad |
| Ground only | effectively zero | effectively zero | not applicable |
| Fresh angled input, seed 4001, ground and grip | 0.09573 rad/s | 0.0004758 rad | 0.0000172 rad |

Both mirrors match exactly in local position increments, spin and facing.
All 210 frozen solves close linear momentum within 6.0e-12 kg·yd/s and work
within 4.7e-11 kg·yd²/s². Yet their motion differs. Active corrective placement
and ground yaw are zero in the selected first interval. This precedes the
previously recorded recovery and fall forks; another recovery rule cannot
repair this first error.

Two discrete approximations are visible in the current grip solve:

1. With support mobility, tangent impulse uses the end-of-interval relation
   `J = -v / (K + M/h)`. In the coarse acquired frame it delivers 5.32146
   kg·yd/s; the independent continuous bounded-force reference delivers
   5.48295. It is a backward-Euler approximation to a fast relaxation, not
   evidence that the athlete has insufficient force capacity.
2. The common-point transport applies half the interval to the whole acquired
   yaw impulse. That is correct for a constant force acting throughout the
   interval. A bounded passive grip can stop removing slip earlier. In the
   grip-only control the impulse magnitude is already correct in the frozen
   frame, but slip ends at 2.450 ms of the 4.167 ms interval. Its force acts
   earlier than the midpoint assumption. The correct first temporal moment
   explains about 98% of the facing discrepancy against the refined World.

The new independent reference solves `v' = -K F`, with
`F = min(capacity, |v|/mobility)` opposing slip. Zero mobility gives bounded
restraint that ends at zero slip. It returns both impulse and
`integral((h-t) F(t) dt)`, which determines translation and yaw travel. It
composes over unequal partitions and matches a separate RK integration,
including force-cap exits and tiny-load controls. No new force limit is fitted.

This reference freezes the acquired tangent direction and moment arms. It
does **not** repair the moving, coupled World. Remaining spin error includes
changing geometry; normal-force sharing, multiple grips and motor-work timing
must remain consistent before adopting a solver correction. The observed
native fall/escape differences cannot yet be assigned to this local error alone.

## Controls, failures and the next change

Ten native inputs were run with and without checkpoint collection at 96
substeps. Results and final bodies/joints/pending strikes match in every case:
the selected angled pair remain censored; the rear witness, frontal controls
in both contact modes, and fresh angled pair finish by physical falls. That is
eight completed plays and two censored plays. No native gain or regression is
claimed because runtime behavior is unchanged.

232 focused tests pass, including nine new reference/isolation contracts;
typecheck and build pass. The current common-point football gate is **43/52**,
with nine retained failures: seven helper/contact/climb controls and two legacy
history hashes. The experimental Tite failure belongs to that patch gate; the
shared baseline's repaired Tite contract remains unchanged. The old 42/50
receipt describes an earlier test stage and is not the current gate count.

**Single next step for primary physics:** on this acquired grip witness, solve
the bounded passive impulse and its temporal moment together, retaining the
same capacities. Carry that moment consistently through body travel, yaw,
material attachment transport and work accounting. Then require the planted,
off-center, zero/tiny-load, frontal and native adverse controls before widening
the change. Do not promote common-point physics until its football failures
are explained. The existing continued-recovery experiment stays separate.

Final fetch also found concurrent Claude work at
[`f20db29`](https://github.com/tannerthardy/football-simulation-/commit/f20db29887ec28e28bc0c13698d54d9265de617b),
on `claude/contact-stability`. Its `HOLD_BALANCE` sub-cycles the support update
of both grasp participants with fixed interval inputs; it leaves the contact,
grip and gait solves unchanged. `TACKLE_DROP` requests an existing dive from a
secure holder inside the roll experiment. Both are default-off. This diff
review does not validate those enabled experiments, and they were not merged
or used for these measurements. Support sub-cycling can address a later balance
integration problem while the first grip torque timing remains unresolved.
Primary can reuse this acquired-state operator alongside that work without
changing the designated baseline or conflating the two mechanisms.

## Reproduce

From the research branch with the pinned Node runtime:

```sh
npm run baseline:run -- -- node --import tsx scripts/diag/physics/contact-foundations.ts
npm run baseline:run -- -- node --import tsx scripts/diag/hand-angular-law.ts out/contact-foundations/center-angular.json
npm run baseline:run -- -- node --import tsx scripts/diag/hand-angular-law.ts out/contact-foundations/patch-angular.json --assert-law --common-patch
npm run baseline:run -- -- npx vitest run --config scripts/diag/common-patch-vitest.config.ts --maxWorkers=1 --reporter=json --outputFile=out/contact-foundations/patch-gate.json
python scripts/diag/physics/contact-foundations-report.py out/contact-foundations
npm run baseline:run -- -- npx vitest run --project core test/contact-foundations.test.ts test/contact-foundation-witness.test.ts
```

The patch gate intentionally exits nonzero. The center audit without
`--assert-law` records its known angular failure while enforcing independent
normal, work and linear-momentum controls; add `--assert-law` to make the
physical-law failure an exit failure too. Neither is evidence of production
test failure. The complete shared-baseline receipt remains in
[BASELINE.md](../BASELINE.md).
