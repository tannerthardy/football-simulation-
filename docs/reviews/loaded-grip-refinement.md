# Loaded grip refinement: support coupling, not stronger hands

Continuation: [reconstructed phase experiment](recovery-phase-reconstruction.md).
The achieved-support proposal below is now a **permanent negative control**:
a live grip transmitting zero force can change recovery. Its force/work audit
and improved angled path are insufficient. Do not restore it into production.

**Production physics is unchanged.** Engine source remains `f14d849a51` from
`db9c74d`. The angular patch stays experimental; its existing promotion result
is still 42/50. No ratings, strengths, raw grip capacities, inertia or global
substep settings changed. All experiments below live in the diagnostic runner.

The rear and angled witnesses have different failure paths. There is not yet
one proven repair for both. The strongest remaining lead is that held-body
balance and the grip's recovery motor credit different corrective movement.

## First divergence, before the final outcome

Both cases use seed 3001, both mirrors and 12/24/48/96 local substeps. Native
runs retain their real controllers. For isolation, one 96-step run supplies the
same initial bodies, 20 Hz intents, RNG record, grip acquisition and controller
capacity updates to every resolution. Grip slip, point movement and balance
remain achieved physics, rather than replayed observations.

| Case | First relevant divergence | What it means |
| --- | --- | --- |
| Production, 180°, 6 yd/s | At **2.095833 s**, 12 steps switch the tackler to falling at the start of the last launch interval. At 96 the switch is at 2.099479 s. The plant ends at 2.100000 s. At that endpoint, tackler support deviation differs by **0.009292 yd**. | Early loss of support changes the actual grip load, not just the tackle label. Over the same last 4.167 ms, normal impulse is −1.505 versus −2.069 kg·yd/s; coarse reeling has already stopped. |
| Patch, 45°, 8 yd/s | At **2.654167 s**, tackler angular speed differs by **0.132509 rad/s**. This shrinks to 0.016251 by 2.70 s. The first continuing carrier support-deviation difference above 0.002 yd is at **2.729167 s**. | The initial passive tangent impulse has ordinary resolution error, but it largely settles. Larger divergence comes with grip/support feedback and later fall/release transitions. There is no active reel work in that first angular interval. |

The visible-error markers were declared separately from outcomes: 0.01 yd for
position, 0.002 yd for support deviation, 0.05 rad/s for spin, 0.01 rad for facing.
They locate traces to inspect; they are not NFL targets or readiness tolerances.

These are not threshold-only outcome differences. The rear case develops yards
of path error and falls at 48/96 while remaining upright at 12/24. The angled
12-step native play actually loses its hold and separates; finer plays still
have a live hold at the inspection limit. Frozen decisions retain the large
path disagreement, so later controller/RNG choices cannot explain it away.

## Smallest reproductions and isolation

A **no-grip, two-body scripted dive tick**, starting from the rear acquisition
input at 2.05 s, reproduces the early support error. A diagnostic experiment
moves the dive transition to its achieved tick boundary: no-grip 12-vs-96 support
error falls from 0.008640 to 0.000022 yd. But full rear-hold path error stays
about 2.06 yd. The timing defect is real; repairing it alone is not the solution.

For the angled case, restart just the **two bodies and one grip at 2.65 s**, then
feed the recorded intents/capacity updates without calling a controller again.
That reproduces the support feedback. At an actual base crossing at 2.783333 s,
`advanceRecovery` stays in its inside-base formula for the entire interval even
though support crosses outside after 1.266 ms. Its scalar result is 0.167328 yd;
the frozen-input event-aware result is 0.168826 yd. Phase handling remains a
separate confirmed source of bias, not a claim that it explains all later error.

Maximum body-position difference against 96 steps over the fixed-decision
inspection, in yards (same results on both mirrors):

| Included mechanism | Rear, 12 / 24 / 48 | Angled, 12 / 24 / 48 |
| --- | --- | --- |
| No grip, same local partition | 0.0187 / 0.0080 / 0.0027 | 0.00041 / 0.00005 / 0.00003 |
| Passive grip, full support/balance | 3.334 / 2.330 / 0.676 | 2.970 / 0.114 / 0.043 |
| Full grip, continuous balance update disabled | 0.0374 / 0.0165 / 0.0054 | 0.248 / 0.117 / 0.118 |
| Full grip and balance | 2.066 / 2.010 / 1.054 | 4.090 / 2.838 / 0.0886 |
| Diagnostic achieved-support proposal | 1.949 / 1.883 / 1.186 | **0.178 / 0.110 / 0.0406** |

The runner also isolates free passive/active grips, constant movement, launch
requests, support without automatic falls, integrated filtered following and
32 instead of 8 local grip iterations. The no-fall ablation can grow an
unsupported capture point enormously: that expected pole growth is not a
prediction of viable football or evidence of an exploding contact solver.

## Explanations ruled out or limited

- Changed inputs, profiles, RNG or extra decisions: source/input hashes and
  sixteen native observer/control endpoint comparisons agree exactly.
- Angular-momentum loss as the rear cause: all yaw is zero there. The isolated
  patch passive/active grips retain momentum and angular momentum; recorded
  kinetic work closes and shared work budgets hold.
- Reeling as a necessary trigger: passive grips with full balance also diverge.
- Too few grip iterations: 32 local iterations leave these paths unchanged.
- Nonlinear filtered-follow averaging as the main cause: the existing
  integrated option barely changes the path errors.
- A universally inadequate one-point wrap: not established. Fix the support
  coupling and phase timing before adding contact detail or increasing force.

## One minimal repair proposal and its rejection test

For an existing held support motor, advance balance from **the same achieved
corrective movement** that transports its grip point. Currently balance starts
with an ideal free recovery and subtracts only `achieved - requested`; near
reaction/base crossings, that free recovery is not the motion actually requested
or achieved. Retain the existing gravity and ankle/hip assumptions, force/work
budgets and the unheld path. Add no strength bonus or new anatomical state.

The diagnostic `achieved-support` experiment makes only that substitution. It
cuts the angled path error sharply and leaves unheld trajectories byte-identical.
It does **not** repair the rear case. It is a proposal, not a production flag.

Falsify it with a constant achieved-motion oracle outside the base: with frozen
outward correction `u`, the radial solution must be
`rb + (e - rb - u/w) * exp(w*h) + u/w`, independent of unused free step capacity.
The new research test checks that identity against the recorded physical
interval, plus unheld parity and force/work limits. Before any World change,
require at least a halving of angled pre-transition error with mirrors and laws
intact. Reject it as a universal fix unless the rear witness also converges;
that test currently fails. Preserve both adverse paths and all promotion failures.

## Reproduce

Use Node 22 from the repository root. Detailed traces are gzip files in ignored
`out/`; [the compact receipt](../../data/reviews/current/loaded-grip-refinement.json)
records source/collector/input hashes, the matrix and checks. The original
208-run collection used diagnostic commit `417900a`; the later runner adds only
an explicit proposal path and observer fields outside `src`.

```sh
node --import tsx scripts/diag/tackle/grip-refinement.ts --out out/grip-refinement/final
python3 -I scripts/diag/tackle/grip-refinement-report.py out/grip-refinement/final
node --import tsx scripts/diag/tackle/grip-refinement.ts --proposal-from out/grip-refinement/final --out out/grip-refinement/proposal
npm run test:research -- test/research/grip-refinement-observer.test.ts --maxWorkers=1
```

Five observer/proposal checks, 146 retained physics/tackle contracts, the 48-case
lower-grip law collector, typecheck and build pass. The promotion suite still
has its same eight failures. No new games or NFL outcome tuning were needed.

## Research supplied during this diagnosis

Checked on 2026-10-12; retrieval hashes and notebook versions are in the receipt.
None of these sources justifies a grip-strength change or resolves numerical
refinement by itself.

- [Uncovering Missed Tackle Opportunities](https://www.kaggle.com/code/matthewpchang/uncovering-missed-tackle-opportunities)
  separates reaching an opportunity from converting it. Its features include
  relative velocity, approach angle, surrounding help and blockers. Use those
  dimensions to select ordinary comparison encounters. Its 75% probability and
  0.5 s window are analysis choices, not physical reach or tackle rules. Training
  on made/missed tackles also limits extrapolation to every pursuit frame.
- [Fractional tackles](https://www.nature.com/articles/s41598-025-85993-1)
  measures unrecovered forward-speed reduction across contact windows. This is
  useful for spotting a hold that never slows the carrier and for separating
  first contact from help arriving. Its 1.5 yd window is a proximity proxy; the
  authors explicitly cannot confirm contact from 2D tracking. It cannot identify
  which grip transmitted force or prove causal credit for an individual defender.
- [No Edge No Chance](https://www.kaggle.com/code/devinbasley26/no-edge-no-chance)
  gives coach-informed examples of early edge positioning forcing a cut toward
  help. Its cohort is filtered inside-zone-like runs, and its edge metric excludes
  defensive backs. Use it for controller film questions, not a universal safety
  pursuit rule or a law for loaded hand contacts.
- [The Components of a Tackle](https://www.kaggle.com/code/stevenpatton97/the-components-of-a-tackle-a-physics-driven-study)
  adds relative motion, blocker leverage and reachable path choices. Its dynamic
  window approach is a useful comparison for bounded movement previews. Its
  elastic-impact feature and fitted tackle probabilities are predictive features,
  not a force solver; the described path planner also does not predict defenders'
  positions at the carrier's future arrival. Do not transplant those assumptions
  into World.

The [Twente recovery dataset](https://doi.org/10.4121/19307225.v2) is the strongest
new support evidence. The 1.8 MB CC-BY-4.0 archive was downloaded and inspected.
It records COM velocity, COP relative to COM, horizontal ground force, applied
pelvis/upper-body perturbation forces, GRF moment arm and whole-body angular
momentum for ten walking subjects, with opposing perturbations at toe-off.

Important limit: these CSVs contain **sagittal-plane, per-subject averages of six
repetitions**, resampled to 50 points in each of five gait phases. They are not
250 equally spaced real-time samples. They can test recovery ordering, support
motion and the relationship between measured force and angular momentum. They
cannot supply NFL axial-yaw inertia, grip capacities, cleat traction or an
absolute reaction latency without additional timing information. Next use one
subject's unperturbed and opposing-perturbation curves as a support check;
preserve event phases and units instead of fitting a recovery-speed multiplier.

The authenticated Big Data Bowl 2024 listing succeeds but now contains only a
78-byte README: **"The dataset for this competition has been removed at the
request of the host."** This is dataset withdrawal, not a missing token. The
three public notebook sources remain available through Kaggle's kernel API;
no 2024 tracking or tackle-label files were acquired.
