# Physics action/state audit

2026-10-16 (America/Phoenix). **Candidate for independent review; not adopted.**
Accepted comparison: `d682b1f474cb6ba260a7b8b1119a62919c5a2159`, fetched and
matched with queue `bf493d8`. Branch `codex/physics-state-audit`.
Baseline source `bed3c36cf08407762fed67abdf0a1651fe6ed7fc8c09b43ab3d9b33f1dfd4616`;
candidate source `c9478f188928a8c724c3584d298bdee9008f192969eee6e06132c7727a114cf4`.
Node22.23.3, existing44 settings/components1, experiments unchanged. Exact
inputs, settings, outputs and command receipts: [compact evidence](../../data/reviews/current/physics-action-state-audit.json).

## Three demonstrated defects

| Trigger | Accepted behavior | Correction |
| --- | --- | --- |
| A planted dive with acquired spin | Spin survives, but facing freezes for the launch tick | Integrate existing spin through facing; no new torque |
| Lunge/dive, or active feet followed by a fall in the same tick | Lunge work omitted; terminal falling/free state deletes the tick's cost | Retain active exposure and delivered positive action work, charge once after physics |
| Recover from a previous leg-related fall, then receive a new torso hit | Diagnostic cause sums freeze while down and can mislabel the new fall | Continue the existing0.3s diagnostic decay while off feet |

The dive witness loses±0.1rad over50ms with spin±2, including zero launch
force and exactly zero yaw impulse/work. It persists at1/12/48 real
subdivisions and under rotation;11 ordinary/free controls transport spin.
The correction passes the same kinematic contract, mirrors, rotations and
zero/positive launch controls. Launch force and the existing fall timestamp
are unchanged. The previously parked dive-phase timing question is separate.

Matched100kg effort witnesses, each50ms:

| Action | Ground work (kg·yd²/s²) | Accepted energy spent | Candidate energy spent |
| --- | ---: | ---: | ---: |
| Ordinary tiny acceleration |0.5|0.000229888889|0.000229888889|
| Lunge, identical motion/force |0.5|0.000225074074|0.000227481481|
| Full dive from rest |17.396596870|0|0.000311338666|
| Passive/free |0|0|0|
| Ordinary idle |0|0.000225|0.000225|

The existing ordinary work cost uses acceleration times endpoint velocity;
it is a behavioral proxy, not a closed metabolic-energy ledger. Preserve it.
For the previously omitted action channel, integrate delivered positive
specific work using the existing0.03 coefficient and normalization. Force is
already limited by the common ground budget. A reversal splits the positive
part of its linear power; received contact work and passive friction/fall
drive are excluded. Hence ordinary and lunge proxy costs need not become equal.

Fresh per-tick records retain active duration, lean exposure and last active
velocity. Later passive sliding cannot determine sprint or speed exposure.
No fatigue is applied during physical subdivisions. Equal lunge work over
equal elapsed time has identical cost at1/12/48 true subdivisions. A separate
joint-free case verifies unequal **actual local impact pieces**, rather than
only local-sweep's joint fallback. A traction-limited request3 versus30 costs
the same when achieved force/work is the same. Initially passive bodies stay
uncharged; an early fall retains only prior active exposure.

The diagnostic witness naturally recovers down→rising→up over1.25s. On the
accepted build, an old leg sum remains2 through1.20s; the next identical
426.315789kg·yd/s torso collision falls at1.30s but reports `legs` rather than
`contact`. The corrected clean/stale pair both report `contact`, with exactly
identical physical histories after excluding diagnostic fields. An earlier
longer-approach attempt also retained stale sums but allowed enough upright
decay for both labels to be `contact`; that inconclusive attempt is preserved.

## Validation and limits

**94 unique focused tests pass** across compatible stages,133 test executions,
including14 new contracts; typecheck passes. Sustained successful/failed
contact, weak/tiny grip, recovery, dive and mirror controls remain intact in
the existing tackle-support, held-recovery and grasp-world checks. There is
no changed-ending or statistical football-benefit claim. No full suite,
games, NFL scan, roster sweep or parked solver rerun.

Total recorded command cost **42.398s**, including two typechecks27.841s;
the second covers later-authored tests. Test commands cost12.505s; tiny
diagnostics cost2.052s, including the inconclusive longer approach. This is
validation cost, not a claim of measured native-engine speed improvement.

Compatible earlier spin/accounting receipts are reused; the later diagnostic
decay does not change forces. The final accounting/native controls use the
candidate source above. Ordinary movement matches exactly in the matched
effort witnesses and the calibrated-integrator contract. No failures were
hidden by assertion changes; existing test expectations remain unchanged.

## Remaining priorities

1. Review this bounded candidate together with independently reviewable
   [#118](https://github.com/tannerthardy/football-simulation-/pull/118).
   Its directional moment cancellation defect remains absent from this
   accepted-base branch; it has not been implicitly imported or approved.
   Integration owns the exact combined check after review.
2. A separate Game audit found two-point energy writeback missing, unlike
   scrimmage. Its hook-only persistence correction is independently owned;
   it does not justify fatigue-strength tuning here.
3. Retain known center-hand angular/accounting and experimental solver
   holds. Audit did not clear them or discover a reason to restart expansion.
   A concrete feasible-request/response witness can reopen its own question.
4. Preserve real mass and mismatches. Neither this audit nor the reviewed NFL
   associations establish a supported absolute strength calibration. #115's
   calibration interface remains separate; no roster coefficients change.

Preview/new-play reset paths and shared contact budgets produced no additional
confirmed defect in this bounded review. That is limited evidence, not proof
that all physics is bug-free. The single best next step is independent review
and exact combined verification of the demonstrated corrections.
