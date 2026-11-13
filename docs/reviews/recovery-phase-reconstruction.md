# Reconstructed recovery timing: local repairs, unresolved loaded holds

Resumed from remote `f8ba412304d684e83dc5a8296e21e507f1362487` on
`claude/engine-priorities`. The prior uncommitted phase experiment and ignored
grip traces were absent. The committed runner, reviews and compact receipts
were recovered; the experiments below were **reconstructed**, not recovered.
The only pre-existing local output was the earlier onboarding replay.

Production `src/` remains unchanged, with content identifier
`f14d849a51e031087a1971e5cc83db6146c4c5cebc17d4df2b6feb549e5106cb`.
No strength, inertia, ratings, controller requests, default resolution or
automatic tackle ending changed. `claude/live-gaps` was neither edited nor
merged. Angular patch promotion remains **42/50**.

## Reconstructed experiment and first remaining error

`recovery-phase.ts` locates outward/inward base crossings in the existing
frozen radial recovery law and advances the response clock from the achieved
outward crossing. `phase` applies that diagnostic correction;
`phase-timing` also defers the dive transition until the launch interval ends.
The latter retains upright support through the final plant and timestamps the
dive at 2.100000 s in every rear refinement, rather than at the start of the
last substep. Neither candidate substitutes achieved-foot motion for free
recovery. Existing correct integration is retained exactly when no new outward
crossing needs correction.

Independent midpoint integration of the differential equation agrees on the
pinned frozen crossings within 2e-7 yd. Unequal subdivisions compose to 1e-12.
This establishes local frozen-input integration, not a biological recovery law
or convergence of the coupled two-body system.

The first remaining rear support marker under `phase-timing` is at
**2.133333 s**: carrier deviation differs by **0.00204370 yd** at 12 versus
96 steps. Inspect the preceding interval beginning at **2.125000 s**:

| Quantity | Value |
| --- | ---: |
| Initial carrier deviation | 0.1555501220 yd |
| Frozen base radius | 0.1572572748 yd |
| Delivered displacement input over the interval | 0.0048189829 yd |
| Grip-induced recovery velocity deficit | −0.7800798798 yd/s |
| Interval length | 0.0041666667 s |
| Independent continuous-source outward crossing | 0.0011912103 s after the start |
| Outside time after that crossing | 0.0029754563 s |
| Phase-only clock credited | 0.0041666667 s |

The two half-interval displacement kicks move support outside before the phase
solver starts. It therefore bypasses the outward crossing. At 2.1291667 s the
coarse support motor still requested zero placement over the preceding interval;
the fine run has begun requesting correction. Actual motor load and placement
subsequently differ. The input already includes the filtered contact/tipping
and low-grip displacement; it is not an extra controller command. Frozen
decisions retain the disagreement, and rear yaw is zero. This is a support
integration/timing defect, not evidence for stronger hands or a run-controller
handoff. Other non-dive fall timestamps remain unchanged in these diagnostics.

## The continuous-source trial is rejected

`phase-source` integrates the same displacement as a frozen continuous source
instead of two kicks, retaining free recovery plus the actual force-induced
deficit. Its short rear interval agrees with an independent calculation and
unequal partitions. It **does not repair the rear hold**.

More importantly, it exposes opposing vector fields at the base. The 12-step
rear run reaches that condition at **4.195833 s**. Its frozen radial law gives
an inside-boundary outward rate of **+1.590186 yd/s** and an outside-boundary
inward rate of **−0.652750 yd/s**. Immediate regime switching has no ordinary
classical crossing there: it can chatter. The kernel reports that condition;
it does not silently introduce sticking, a reaction reset, or another timer.

All twelve angled source trials (both mirrors, 12/24/48/96/15/35 steps) and
both 12-step rear trials stop with that explicit failure. The other ten rear
source runs complete, but their trajectories still disagree. Completed rear
24/48-step differences against 96 reach 1.709/0.643 yd; the failed 12-step run
cannot be presented as a completed tackle. These findings do not prove that
chatter is the sole cause of the original long rear disagreement. The radial
direction and sources are frozen within each diagnostic interval; a vector
response and moving base still need independent treatment.

After these two unsuccessful repairs, stop stacking adjustments. The next
decision is how an already-reacted, force-bounded support correction continues
through the base under a sustained outward load. Establish that response in
one loaded body, preserving the ankle/hip and placement contributions and the
zero-force limit, before another native hold collection or World change. A
silently clamped base, arbitrary hysteresis, stronger grip or finer default
solver would choose an answer without establishing the physical response.

## Matched refinement and adverse results

One observed 96-step native run supplies each case/mirror's initial bodies,
profiles, 20 Hz intentions, acquisition and capacity updates. Observer/control
execution and RNG match. Slip, grip geometry and support evolve under physics.
Maximum position disagreement against the matched 96-step numerical comparison
over the fixed decision tape, in yards:

| Candidate | Rear 12 / 24 / 48 | Angled 12 / 24 / 48 |
| --- | --- | --- |
| Production replay | 2.066 / 2.010 / 1.054 | 4.090 / 2.838 / 0.0886 |
| Phase crossings | 2.066 / 1.741 / 1.054 | 3.835 / 2.838 / 0.0984 |
| Phase crossings + completed dive | 2.218 / 1.681 / 0.831 | 3.835 / 2.838 / 0.0984 |

Both mirrors and the 15/35-step runs are retained in the
[compact receipt](../../data/reviews/current/recovery-phase-reconstruction.json).
The rear phase/timing errors at 15/35 steps are 0.784/0.324 yd; this
nonmonotonic ordering is another reason not to treat 96 as ground truth.
The existing large ablation collection was not repeated.

## Permanent controls and checks

The rejected achieved-support proposal now has a permanent executable negative
control. With stationary COMs and deviation just outside the base, a live grip
transmits **exactly zero force and work** yet changes final deviation from
0.1030179490 to 0.1127925424 yd. The difference persists at capacities
1e-3, 1e-6 and 1e-9. Production and all three phase variants retain the
zero-force limit. A separate loaded near-base control transmits nonzero force
down to approximately 1e-9, yet the old proposal's recovery error tends to
0.01739872 yd instead of zero. Production and phase variants pass that limit
too. Passing separate work accounting does not rescue the old law.

New research assertions cover independent base-crossing/recovery clocks,
unequal partitions, the zero-force negative control, vanishing loaded grips,
force/momentum, yaw and arm/support work budgets, completed launch timestamps,
unheld movement, ordinary hand blocking and frontal tackles. The phase and
phase/timing ordinary controls preserve exact endpoints; no tolerance was
relaxed. The continuous-source trial stays rejected despite passing its local
continuity and physical-accounting controls.

All eight unchanged patch promotion failures remain visible:

| Failure | Count |
| --- | ---: |
| Useful wrong-side helper contact, both mirrors | 2 |
| Joined genuine-double earned transfer | 1 |
| Split Zone Under supported check/climb | 1 |
| Split Zone Tite unfinished first-level work | 1 |
| Split Zone Bear joined reads/transfer | 1 |
| Preserved legacy run and pass hashes | 2 |

The receipt records retained-suite outcomes separately from these intentional
promotion failures and the rejected source-trial failures. No candidate was
adopted into production.

## Reproduce and survive another disconnect

Use Node 22 in the repository root. Large tapes/traces stay in ignored `out/`;
the committed receipt and assertions survive a new checkout. If the tapes are
absent, reconstruct them once; their newly collected hashes are recorded rather
than claimed to be recovered historical bytes.

```sh
node --import tsx scripts/diag/tackle/phase-refinement.ts --variants full --steps 12,24,48,96 --out out/phase-recovery
node --import tsx scripts/diag/tackle/phase-refinement.ts --inputs out/phase-recovery/inputs.json.gz --variants phase,phase-timing --out out/phase-recovery/final
# Expected nonzero exit: preserves all 14 boundary failures and partial traces.
node --import tsx scripts/diag/tackle/phase-refinement.ts --variants phase-source --out out/phase-recovery
python3 -I scripts/diag/tackle/phase-refinement-report.py out/phase-recovery
npm run test:research -- test/research/recovery-phase.test.ts test/research/recovery-phase-world.test.ts test/research/grip-refinement-observer.test.ts --maxWorkers=1
npm run test:all
npm run test:data
npm run typecheck
npm run build
node --import tsx docs/archive/research/contact-mechanics/grasp-law.ts out/phase-recovery/lower-law.json . --stress-lower --assert-law
# Expected nonzero exit: unchanged 42/50 promotion result.
node node_modules/vitest/vitest.mjs run --config scripts/diag/common-patch-vitest.config.ts --maxWorkers=1
```

Finish collectors/reducers before timing-sensitive retained game tests. The
first complete run here encountered a 60-second game-record timeout and a
worker-report timeout; that run is retained rather than described as passing.
The affected two-test file passed an isolated rerun with its original
60-second limits and assertions (51.90/46.50 seconds).
A subsequent complete run without collectors/reducers timed out in the other
game-record assertion (81.20 seconds). Concurrent collection does not fully
explain the variability; neither complete run is a passing full-suite result.
