# Continued recovery under a sustained load

The smallest diagnostic now has a common held/unheld response that continues a
started step through the balance boundary and winds it down after unloading.
It passes independent affine-flow checks, increasing/held/removed load checks,
weak-load limits, reflected/rotated cases, and equal/unequal time partitions.
It substantially reduces the rear witness's numerical disagreement, but does
not finish that hold. The angled witness still disagrees and escapes at the
coarse native resolution. **Keep this experimental; do not promote it.**

Production `src/` remains at
`f14d849a51e031087a1971e5cc83db6146c4c5cebc17d4df2b6feb549e5106cb`.
No capacities, inertia, ratings, controller requests, fall threshold or default
resolution changed. `claude/live-gaps` was not edited or merged. The previous
[rejected achieved-support and phase/source trials](recovery-phase-reconstruction.md)
and their permanent negative controls remain intact.

## The reduced response and its assumption

The isolated one-body kernel uses the existing capture deviation, base radius,
pendulum rate, step mobility/capacity/speed and 0.12-second response. Its frozen
input is a prescribed load and the existing displacement source. World coupling
is tested separately with actual transmitting grips and delivered foot forces.

Write `xi' = w*(xi - ankleTarget) - achievedPlacement + source`. The existing
inner damping corresponds to `ankleTarget = 2*xi`; this candidate clips that
target to the existing base radius. It keeps exact ordinary inner damping when
the deviation is within half the base. A step begins at the existing outer
boundary, retains its response through the inward crossing, and geometrically
reduces its command to zero at half the base, where the ankle request fits again.
An inactive step inside the base receives no new readiness. There is no held
flag, added timer, projection onto the base, or extra capacity.

**This changes unheld recovery in the outer half of the base.** It is a proposed
reduced-model completion of the old incompatible boundary responses, not merely
a timing fix, anatomical feet, or a measured center-of-pressure law. The ankle
target bound is geometric; the existing World budgets still bound delivered
forces. Local placement motor work and dissipation close on the same motion,
but this does not certify a complete vertical-body energy model.

Placement speed is limited by the existing speed and mobility times remaining
capacity. An assisting load derates active command when needed to obey the
existing power ceiling. The support ODE alone uses adaptive integration; World
contact intervals and controller decision times are unchanged. Component-wise
error scaling prevents accumulated work from loosening the small response-clock
error bound. A changing-load assertion exposed that numerical defect; it passed
after tightening the kernel, with its original assertion intact. Evaluation or
coupling failures throw explicitly; no failed trial is silently accepted.

The diagnostic adapter solves mean requested placement and the actual delivered
force/source to consistency within one existing physical interval. It accepts
one converged scratch state, preserving live bodies/profiles/joints/plans/report
identities. Rejected trials spend no physical time, impulse or work. It does not
increase the grip iterations or introduce another controller decision. This
scratch adapter is an expensive diagnostic, not a proposed production design.

## One-body evidence

One fixed body starts at deviation 0.151 yd with a reacted step. Its base is
0.15 yd, rate 3.2/s, speed 3.4 yd/s and existing force capacity 1,100. At 0.8 s:

| Opposing load | Deviation (yd) |
| --- | ---: |
| 0 | 0.007098 |
| 20 | 0.024701 |
| 100 | 0.076640 |
| 300 | 0.091312 |
| 600 | 0.113320 |
| 1,000 | 0.142664 |
| 1,500 | 4.774502 |

Increasing load produces increasing error; overload can escape the base rather
than being clamped. A separately unreacted body starts inside, receives loads
0/100/300/600 at fixed physical times, holds 600, and unloads at 0.6 s. It crosses
outward, begins recovery, crosses inward while still loaded, then winds down
into exact inner damping. Equal and unequal partitions agree in final deviation
within 3e-13 yd and net work within 3e-8. Mirroring retains the same work and
clock. Loads 1e-3/1e-5/1e-7 approach the same common unheld law; real World grips
also approach it down to capacity 1e-9, including an exactly zero transmitting
live grip. The old achieved-support negative still fails as intended.

The independent fully reacted affine solution inside the placement band checks
both final deviation and the command integral. The checks also verify continuity
at both boundaries, force/power ceilings, overload, unloading, assisting loads,
coordinate rotation, and command work minus net motor work equals dissipation.
The reproducible plot retains the overload on a logarithmic axis:
[one-body response](../../out/continued-recovery/final/one-body-response.png).

## Reintroduced tackles and controls

The same source, body/profile pins, seed 3001 and frozen 20 Hz decision tapes
are reused for the rear center 180-degree/6-yd/s and angled patch
45-degree/8-yd/s witnesses, both mirrors at 12/24/48/96 and also 15/35 steps.
Maximum position difference at matched decision endpoints against 96 steps:

| Candidate | Rear 12 / 24 / 48 | Angled 12 / 24 / 48 |
| --- | --- | --- |
| Previous phase + completed dive | 2.218 / 1.681 / 0.831 | 3.835 / 2.838 / 0.0984 |
| Continued bounded recovery | 0.06254 / 0.02436 / 0.01520 | 3.45291 / 0.61713 / 0.03981 |

At 15/35, rear errors are 0.02888/0.02327 yd; angled errors are
3.10202/0.07102 yd. These are numerical comparisons, not a claim that 96 is
ground truth. All replay intervals satisfy the same requested/achieved mean,
force, arm/support work and work-ledger checks; the compact receipt contains
both mirrors and the maximum residuals.

Actual native rear runs remain censored at every resolution and mirror, with
the carrier upright. The angled native run escapes at 12 in both mirrors and
is censored at 24/48/96. Neither a tighter trajectory comparison nor a censored
hold is an ordinary successful tackle.

The 24-case ordinary panel keeps every ending: 20 physical tackles, two censored
patch 45-degree/6-yd/s cases and two escaped patch 90-degree/6-yd/s cases. It
changes some advances: six adverse pairs remain in the receipt, with a maximum
increase of 0.582 yd in the censored angled patch case.
The unchanged helper, genuine-double transfer, blocking and scenario assertions
run with the candidate explicitly installed: center **48/50**, with only the
two historical run/pass hashes failing; patch **42/50**, retaining wrong-side
helper failures in both mirrors, joined transfer, Split Zone Under/Tite/Bear,
and the two historical hashes. No assertions or hashes were re-pinned.

## First remaining fork and next work

At the first loaded angled interval, 2.650000 to 2.654167 s, the 12-versus-96
holder spin difference first exceeds 0.1 rad/s. Both bodies start with zero
deviation, finish well inside half the base, and request zero active recovery
placement. The first support marker follows at 2.725000 s; the holder's fall
state first differs at 3.108333 s. The full short packet retains initial/end
bodies, grip geometry/Jacobian, delivered ground/reel/passive/torso yaw impulses,
placement/source and work in the compact receipt.

Inspect that grip/yaw evolution and the later achieved fall transition using
frozen geometry/load intervals and an independent torque/motion calculation.
Zero active placement at the early angular marker does not prove all later
support coupling innocent, but it does not justify another recovery adjustment.
Keep the present one-body law as a tested candidate; the angular trajectory,
native conversion and existing patch controls still block adoption.

## Checks and reproduction

This stage passes **1,312 core assertions**, **225 research assertions**,
**141 Python checks**, typecheck and build. All **48 candidate lower-grip law
cases** pass; the unchanged production law audit also passes 48/48. The previous
complete-suite game-record timeouts and isolated pass remain explicitly recorded
in the earlier receipt. Integration was not repeated for this diagnostic-only
stage; there is no new full-suite passing claim.

Large data stay in ignored `out/`; the
[compact receipt](../../data/reviews/current/continued-recovery.json), collector,
reducers and 21 new assertions survive a fresh checkout. Reconstruct the frozen
input only when absent, using the earlier source-pinned collector; do not claim
new bytes were recovered from the disconnected session.

```sh
set -o pipefail
# Only if the earlier frozen input is absent:
node --import tsx scripts/diag/tackle/phase-refinement.ts --variants full --steps 12,24,48,96 --out out/phase-recovery
node --import tsx scripts/diag/tackle/continued-recovery-one-body.ts out/continued-recovery/final/one-body.json
node --import tsx scripts/diag/tackle/phase-refinement.ts --inputs out/phase-recovery/inputs.json.gz --variants continued-recovery --steps 12,24,48,96,15,35 --out out/continued-recovery/final
node --import tsx scripts/diag/tackle/continued-recovery-panel.ts out/continued-recovery/final/native-controls.json
npm test
npm run test:research -- --maxWorkers=1 2>&1 | tee out/continued-recovery/final/research-tests.log
npm run test:data
npm run typecheck
npm run build
# Expected nonzero exits, retaining all original assertions and hashes:
node node_modules/vitest/vitest.mjs run --config scripts/diag/continued-recovery-vitest.config.ts --maxWorkers=1 2>&1 | tee out/continued-recovery/final/center-controls.log
RECOVERY_CONTACT=patch node node_modules/vitest/vitest.mjs run --config scripts/diag/continued-recovery-vitest.config.ts --maxWorkers=1 2>&1 | tee out/continued-recovery/final/patch-controls.log
node --import tsx --import ./scripts/diag/continued-recovery-test.setup.ts docs/archive/research/contact-mechanics/grasp-law.ts out/continued-recovery/final/candidate-lower-law.json . --stress-lower --assert-law
python3 -I scripts/diag/tackle/continued-recovery-report.py out/continued-recovery/final
MPLCONFIGDIR=/tmp/football-mpl python3 -I scripts/diag/tackle/continued-recovery-plot.py out/continued-recovery/final
```

The reducer also expects the research and candidate-control logs shown in the
receipt. Preserve command exit status when capturing them; the expected control
failures are distinct from failed collectors or physical-law checks.
