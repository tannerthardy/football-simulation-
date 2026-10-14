# Grip force inside one interval: bounded feasibility

Question: can the existing passive-grip mechanical witness carry impulse,
temporal moment, motion, rotation, attachment and work at lower cost without
repeatedly advancing World? This tests feasibility, not a chosen replacement.
PR #7's runtime, the corrected slow reference `8e36cce`, baseline `4ded6b6`,
capacities, recovery laws and defaults are unchanged. All new code is diagnostic.

## Smallest meaningful experiment

Reuse the acquired 45°/8 seed-3001 packet and its existing `grip-only` mechanical
isolation. That variant was already measured at 4096 World partitions, with
zero ground forces, support mobility and passive normal load. The actual grip
point is the held COM: its body-relative material offset is zero. Both acquired
mirrors reuse those exact reference poses; the saved ordinary frontal 0°/3
packet supplies the opposing control. No new native snaps or game panel are
needed for this question. The frontal interval is newly checked at 4096 pieces.

[The receipt](../../data/reviews/current/grip-force-feasibility.json) pins each
packet, original/corrected source, runtime, flags, input, kernel/collector,
fixture, Node and CPU. The existing World primitives have not changed between
the corrected reference and this diagnostic. The scoped fixture is
[grip-force-feasibility.json](../../config/grip-force-feasibility.json).

## What changed in the experiment

A frozen-row calculation stops tangential force once slip stops. In moving
geometry that misses the subsequent sticking reaction. For this existing
single-COM-point dry row, let `r` be separation, `vn` relative radial speed,
`vt` relative tangent speed and `w` holder spin. Material slip is `vt-r*w`;
its derivative is `Keff*F-2*vn*w`. Thus sticking requires
`F=2*vn*w/Keff`, within the same structural cap. While sliding, the original
force cap applies. No new coefficient or strength is fitted.

The diagnostic kernel integrates that smooth local body/force system with
RK4 and locates the slip-stop event in the kernel. It carries vector impulse,
its remaining-time moment, torque impulse/moment and passive work together.
Body travel and facing are recovered from those moments and checked against
the directly integrated state. It never steps World. Collision, tensile/reel
demand and a renewed cap-limited sticking reaction are explicitly refused.
The loader also refuses multiple joints, nonzero attachment offset or mobility.

The local coarse/fine search retains the existing position, velocity, angle,
spin and work requirements, reserving 15/16 of those budgets for reference
discretization and later operator composition. Its finest kernel grid is
bounded at 128 partitions; a failed/unsupported case produces no live state.
It does not insert a fallback into World or silently broaden applicability.

## Evidence for and against

Both acquired mirrors stop initial sliding at 2.45265 ms and accept four
kernel partitions, with 328 small derivative evaluations including event
search. Against the saved 4096-piece reference, the largest differences are:

| Quantity | Difference |
| --- | ---: |
| Body position | 3.43e-10 yd |
| Body velocity | 1.98e-7 yd/s |
| Facing | 2.02e-8 rad |
| Spin | 1.16e-5 rad/s |
| Vector impulse | 2.01e-5 kg·yd/s |
| Vector temporal moment | 3.49e-8 kg·yd |
| Angular impulse | 2.31e-5 kg·yd²/s |
| Angular temporal moment | 4.02e-8 kg·yd² |

Work residual is 1.10e-9, angular-momentum residual ≤1.79e-10 and the motion
reconstruction residual ≤6.07e-15. Passive work is negative. Force dose remains
below `capacity*duration`; normal, arm and support-motor work are zero in this
scope. The attachment-point error is 3.13e-10 yd. The frontal control supplies
zero impulse/work and preserves ballistic motion. Unequal physical partitions,
zero/tiny capacities and refused collision/reel branches also have contracts.

This does **not** establish simultaneous normal/tangent budget competition,
nonzero material-offset motion, active reeling, multiple contacts, loaded ground
response, support histories or exactly-once fatigue after World composition.
Those are unsupported here, not passing by omission. The nine existing patch
promotion failures remain separate; their zero timing invocation does not
establish a shared cause. Keeper angular-law diagnosis is independent.

## Cost and next decision

Unobserved same-machine measurements warm once, then run seven identical
restored intervals per mode, serially with construction/cloning outside clocks.
No profiler or World observer is present. AMD EPYC 9V74, Node 22.23.3:

| One 4.167 ms grip-only interval | Median | p95 / observed maximum |
| --- | ---: | ---: |
| Corrected slow World | 30.9 ms | 42.6 ms |
| Diagnostic kernel | .784 ms | 1.17 ms |

This is about 39× faster for the isolated witness, not a football/game speedup
or evidence that PR #7's overall 360× cost gap is solved. Observed maxima are
panel samples, not universal worst-case bounds. The detailed samples remain
in the receipt. The three tiny mechanical comparisons and benchmark collection
took 1.60 seconds; local correctness tests take about 20 ms of test body
time (runner startup is recorded separately). No new full suite/game screen.

**Decision:** within-interval integration is feasible for this dry isolated
mechanism; it remains a diagnostic prototype, not a production replacement.
Next test the existing witness's nonzero support mobility and simultaneous
normal/tangent work/budget requirements before a World interface or native
panel. A cheap but inconsistent composed solve would not qualify.

Support owner receives the already saved long-hold tape and the negative
identical-4.95-second checkpoint result, linked in
[the earlier report](grip-fast.md#remaining-24-yd-discrepancy). Locate earlier
consequential state drift; no recovery rule at 5.0 seconds is changed here.
This handoff and solver feasibility do not block an independent components-only
correction's integration path. Combined-candidate verification remains with
the designated shared integration owner, using the
[PR #6 policy](https://github.com/tannerthardy/football-simulation-/blob/f9617dde9456c0ead2d66b46d4b42608adcd3585/docs/TESTING_COSTS.md).

## Reproduce

Use the pinned Node runtime and original packets/receipts from PR #3/PR #7:

```sh
npm run baseline:run -- --candidate -- node --import tsx scripts/diag/physics/grip-force-feasibility.ts
npm run baseline:run -- --candidate -- npx vitest run --project core test/grip-force-feasibility.test.ts --maxWorkers=1
```

The collector rejects changed packet hashes/settings. It reuses compatible
cached witness references instead of launching a new reference/native panel.
The six local contracts use the tracked small fixture and run without ignored
packets. No claim of a new full-suite pass is made; the preserved 1,687-test
receipt describes production defaults at its recorded revision.
