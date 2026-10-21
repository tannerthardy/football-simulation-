# Shared actuation and transfer across football interactions

**Status: NOT READY.** Work on `claude/engine-priorities`. Do not push to or
merge PR #1 without the owner's approval. This follows `aa5fcde`; read
[PHYSICS_DEVELOPMENT.md](../plans/PHYSICS_DEVELOPMENT.md) alongside it. Coverage,
playcalling and full QB mechanics were not expanded. The model is planar
bodies with reduced support and contact height, not full 3D or skeletal physics.

## Status and where to start

The same physical capabilities now bound active hand actions across blocks,
jams, strikes and tackle reeling. Commanded yaw shares ground traction with
translation. A planar kinetic-work ledger accounts for every velocity and
spin change. These are consistency improvements, not validation of the force
magnitudes or an assertion that football interactions are realistic.

The five-task mechanical probe improves, but the real-technique hand-fighting
probe **regresses at default resolution**. Do not overlook that because the
tests pass or scoring falls. The next work is the reproduced coupled
hand/grasp/support disagreement, followed by initial run contact and feasible
tackle approach. Keep the global 12–16 substep policy unchanged while tracing.

1. **Resolve the coupled failure locally.** Start with
   `scripts/diag/hand-fight-trace.ts` and `hand-convergence.json` in the evidence
   directory. Seed 3, power 1 now gives no fall at 12 steps and a QB fall at
   48/192. The disagreement occurs after a wrap, not during a loaded block:
   at 2.55 s QB peak deviation is 0.978/1.019/1.004 of the fall threshold at
   12/48/192. Held-leg fraction differs too (0.647 versus 0.652 at 12/192).
   Examine grip slip, active reel, hold ratcheting, stepping and support load
   integration. The tick trace narrows the transition; it does not establish
   the root cause. Seed 3, power 1.4 also disagrees on a rusher fall. Seed 7,
   power 1/1.4 produces the largest approach error. Preserve all nine fixtures.
2. **Fix initial run contact mechanically.** Small-panel DL get-off at 0.5 s
   remains 1.58 yd/s versus the NFL 1.68; the old 2.06 figure is historical.
   Contact is still early and run-play DL/OL acceleration is high. Inspect
   OL response advantage, forward steps, posture, double-team force geometry
   and defensive penetration together. Do not tune yards or scores directly.
3. **Make tackle attempts feasible from the trajectory.** The real-technique
   pack still includes an oblique wrap that drags a fallen tackler for eight
   yards. A better controller must choose reachable hands, approach speed,
   stance and leverage under these same capacities. Do not add a tackle-win
   roll or a strength bonus for a difficult angle.
4. **Validate physical magnitudes.** Grip strength, arm shortening speed,
   traction, angular inertia and support recovery remain proxies. Use the
   [acquired NFL movement evidence](bdb2027-movement-transfer.md), including
   matched combine/game athletes and pull/fold drills. Tracking constrains
   trajectories, not measured hand forces. AddBiomechanics subject data have
   not been used; avoid another giant download before using the existing NFL
   evidence. Keep held-out athletes/games for eventual fitting and validation.

## What changed in the world

`src/physics/actuation.ts` holds common work and turning limits.

- **Finite strikes:** a request develops over the 50 ms controller tick,
  requires the actor's actual reach and shares the actor's arm capacity. It
  remains equal and opposite. Repeating a request or targeting a remote body
  cannot manufacture impulse. The request is cleared at tick end.
- **Shared arms:** push, tensile hand restraint, steering, strikes and active
  grasp reeling share a body's force budget. Allocation uses request magnitudes,
  rather than giving each joint its own full capacity. A hand joint records
  the muscular actor separately from its tensile holder. A defender controlling
  a shove uses his capacity; an offensive hold belongs to the blocker.
- **Explicit active work:** a pair impulse's exact translational kinetic work
  is `v_rel dot J + |J|^2 / (2 m_reduced)`. Positive work is capped by the
  owner's remaining tick allowance. The solver records signed work separately
  from gross positive muscular work. Passive friction and grasp corrections
  cannot add positive kinetic work; shortening a grasp requires explicit reel
  force. Holds ratchet only after actual closing movement.
- **Passive grip:** duplicate holds share one holder's strongest requested
  structural grip, capped by the previous full-wrap upper envelope. This is
  distinct from active shortening. It does not make passive wrap capacity a
  measured anatomical quantity.
- **Ground actuation:** locomotion and leaning obey traction; the former
  traction bypass and 1.2-times extra lean allowance are removed. Turning uses
  finite torque and inertia, sharing the friction envelope with translation.
  World and standalone free movement still agree exactly. Dive launch develops
  within finite traction over the controller tick rather than one unbounded
  substep impulse.
- **Ledger:** `StepReport` records linear/angular ground impulse and work,
  hand/grasp/strike/contact work, arm allowances and residual. It caught an
  unrecorded spin reset on finishing a rise; that loss is now included.

There are no new task-specific strength boosts in the shared model. Existing
football technique outcome rolls and grip-shape capacity proxies still exist
outside it; this work does not certify or replace those controllers.

### Scope and assumptions

Units are kg, yd and s; multiply kg yd²/s² by `0.9144²` for joules.
Arm force still derives from `0.75 * profile.power * G`. Positive arm work is
bounded by arm force times **3 yd/s** times tick duration. The speed reuses the
former correction-speed ceiling as an explicit **unvalidated** proxy, not
an empirical muscle shortening measurement. Passive grip is bounded by
**3.36 times arm force**, the existing full-wrap envelope (`2.8 * 1.2`), not a
new NFL-fitted constant. Turf coefficient 1.1, support geometry and yaw inertia
are existing assumptions. Yaw response retains the previous 50 ms response
scale; the common friction-wrench approximation also needs validation.

The ledger covers translational and yaw kinetic energy. It does not include
vertical motion, pitch/roll energy, muscle/soft-tissue storage, metabolic energy
or work at actual shoulder/hand landmarks. Torso contact work can temporarily
be positive from compression; existing passive contact plus spring-energy
contracts remain in force. Gravity-driven falling is still reduced horizontal
motion, and off-feet yaw damping is still a proxy. Gross positive work charges
solver impulse corrections conservatively and may itself create iteration
sensitivity. Arm allocation reserves requested channel capacities even when
they are not fully used. These are explicit modeling limits, not physiological
validation or a complete energy model.

## Same capabilities, five tasks

`scripts/diag/shared-capabilities.ts` runs **120 reps**: five tasks × four
profile variants × two mirrors × three substep counts. Every task uses the
same 100 kg base body and the same variants (power 130 instead of 100, mass
125 instead of 100, balance 1 instead of 0.5). Only geometry and control change.
There is no role or scenario fitting. Bodies are slightly staggered so that
reflection does not rely on an ambiguous exactly collinear 180-degree turn.

At 12 steps, increasing the subject's power changes:

| Task | Base | Stronger | Interpretation |
|---|---:|---:|---|
| Anchor, backward travel | 0.484 yd | 0.276 yd | Same feet/traction model better resists drive |
| Double drive, defender displacement | 2.846 yd | 3.410 yd | Additional force moves the defender through the same hand joints |
| Shed, subject lateral progress | 2.540 yd | 2.366 yd | Strength is not a universal win multiplier; positioning and control matter |
| Absorb, subject forward travel | 1.246 yd | 1.248 yd | More arm power barely affects a torso hit; both bodies still fall |
| Jam, receiver forward travel | 5.659 yd | 4.852 yd | A stronger hand fight delays movement, without a jam-success roll |

The heavier carrier travels 1.437 yd forward after the same contact versus
1.246; the heavier driving blocker moves the defender less, because added mass
also increases inertia. Wider support is not beneficial in every controller.
Do not force every rating change to improve every outcome.

Across all final reps: maximum momentum residual `2.28e-12` kg yd/s, kinetic
work residual `5.94e-12` kg yd²/s², arm impulse fraction at most 1 within floating
roundoff, positive-work fraction at most 0.612, overlap at most 0.0087 yd, and
finite states throughout. Mirror position error is below `1.3e-13` yd. Against
48 steps, mean/max subject position error at 12 steps improves from
0.041/0.331 to **0.029/0.068 yd**, with no fall-set disagreements in either
revision. Baseline lacks work telemetry; its absent ledger fields are null.

These are mechanical controllers, not authentic NFL assignment or technique
validation. The real-technique six-interaction pack is a separate guard.

## The convergence failure remains

Real pass-block controllers, nine seed/power fixtures, 192-step reference:

| At 12 steps | Before | After |
|---|---:|---:|
| Mean closest-approach error | 0.127 yd | 0.207 yd |
| Worst closest-approach error | 0.323 yd | 0.822 yd |
| Fall outcome disagreements | 1/9 | 2/9 |
| Corner outcome disagreements | 0/9 | 0/9 |

At 24/48/96 steps the final mean approach error is 0.080/0.031/0.011 yd; fall
disagreements are 1/0/0. A finer numerical reference is not physical ground
truth. The original QB/rusher reversal changed under the new bounded model;
that does not count as resolving it. An experiment integrating contact-induced
yaw immediately did not improve the sweep and was reverted. No global
resolution increase was retained. Its report remains identified as an
abandoned experiment, not final evidence.

## NFL and whole-game guards

Four tracking-style games, seed 5, same generated teams in both revisions.
NFL figures use the existing BDB tracking summaries and their narrow cohorts;
these are descriptive guards, not held-out validation of the new force model.

| Measurement | Before | After | NFL reference |
|---|---:|---:|---:|
| DL speed at 0.5 s, median | 1.58 | 1.58 yd/s | 1.68 |
| Defender within 2 yd before release | 26.3% | 28.8% | 32.49% |
| Pocket depth at 2.5 s, median | 4.22 | 4.12 yd | 4.55 |
| Handoff / reach LOS, medians | 1.35 / 2.70 | 1.30 / 2.60 s | 1.30 / 2.60 |
| First-contact yards on runs, mean | 0.67 | 0.77 yd | 1.16 |
| Run DL maximum acceleration, median | 5.10 | 4.91 yd/s² | 3.28 |
| Run OL maximum acceleration, median | 3.80 | 3.62 yd/s² | 2.99 |

Run RB maximum acceleration remains below the reference (3.78 versus 5.18
yd/s²). CB/S acceleration on passes is still high. Matching a get-off percentile
does not validate cuts, loaded stepping or initial contact.

Sixteen games, seed 7, two independently generated eight-team leagues:

| Guard | Before | After | Current reference |
|---|---:|---:|---:|
| Points / team-game | 34.66 | 30.91 | 21–23.5 |
| Rush yards / carry | 4.45 | 4.12 | 4.1–4.5 |
| Run stuff rate | 18.86% | **24.24%** | 16–20% |
| 10+ yd runs | 8.75% | 7.90% | 10–12% |
| 20+ yd completions / attempt | 13.82% | **15.40%** | 7–9% |
| YAC / reception | 8.96 | 8.89 | 4.8–5.6 |
| Missed + broken tackles / play | 0.28 | 0.22 | 0.11–0.16 |
| Interceptions / attempt | 6.66% | 6.31% | 2–2.5% |
| Sack rate / dropback | 6.20% | 6.14% | 6–7.5% |

Scoring and tackle counts improve, but run stuffs and passing explosiveness
regress. They are not hidden by the passing test suite. Changed trajectories
change later choices and random draws; paired seeds do not isolate each cause.
The game and tracking contact metrics have different definitions/cohorts.

## Owner film observations and new measurements

`owner-film-observations.json` preserves the original **622c45f…** film version
before regeneration. G1-P060/P056 are Flood plays with 10/12.8 yd separation;
they warrant a later assignment/key trace. The suspected pick holds cannot be
called illegal solely from duration in 2D, and packed events do not expose full
hand restraints or foul context. G1-P105 is man against four verticals.
G3-P044, G1-P186/P151 and G6-P195, plus G3-P029, include substantial YAC; some
have catch separation below 2 yd. Do not label every explosive a deep coverage
bust without separating air yards, catch contest and pursuit/tackle behavior.
G2-P186 and G6-P147 preserve the difficult-throw concerns; throw base,
cross-body geometry and causal accuracy telemetry are still needed. G6-P015
preserves the safety-angle/traction concern. None is claimed fixed here.

`scripts/film-outcomes.py` now measures every non-nullified run/pass film play:
success at 40/60/100% of distance on first/second/third-or-fourth down,
explosives at 10 yd runs / 20 yd passes, and event-based pass outcomes. It
separately reports geometric pressure overlap rather than claiming causation.

The final fixed-team six-game film has 551 pass plays and 198 run plays:
pass/run success 46.5%/24.2%, explosive pass/run play rates 17.6%/6.1%.
Of 491 recorded throws, 320 complete, 27 are intercepted, 19 end as drops,
17 as PBUs, and 108 as other incompletions. Drops account for **13.2% of 144
non-interception incompletions**; 25 of those incompletions have the geometric
pressure annotation. Other misses cannot yet be separated into decision,
pressure, accuracy or footwork causes. These fixed film rosters differ from
the league calibration cohort; do not merge their rates or treat these success
definitions as NFL reference values. Existing broad NFL explosive bands are
used only by the unchanged calibration script.

Keep later coverage/anticipation, throw mechanics and situational-risk work
queued. Before adding score/clock behavior, use real play labels stratified by
quarter, score, down/distance and field position, and account for selection
bias. Selected BDB draft-cohort plays alone cannot prove that trailing causes
individual QBs to make riskier or less accurate decisions. No guessed
desperation or coverage change was added in this physics work.

## Validation, evidence and reproduction

**262 engine tests**, **12 Python tests**, typecheck and build pass. Twenty
offline Chromium checks pass on the regenerated **845-clip**, six-game,
27-concept film. Open `viewer/film-room.html`, or its synchronized ZIP; the
template alone contains no plays. Use **Copy play reference** to include the
film version and timestamp. IDs from the old film describe different plays
after regeneration.

Test fixtures changed where the previous input was physically invalid: the
contact-height lab now uses a reachable bounded 40 kg yd/s hand pulse rather
than a remote instantaneous 80 pulse; the dive assertion checks traction;
the lateral-budget test measures actual ground allocation under the same
observed load instead of forcing a pair square with 3000-unit hands. The
three-body convergence test retains its 0.04 yd absolute gate, uses a 512-step
reference, and checks improvement across the grid rather than demanding an
error reduction at every adjacent contact ordering. The failed football
convergence gate above remains separate and explicit.

Evidence is in `data/reviews/physics-world/shared-actuation/`. Its manifest
pins baseline `aa5fcde`, source, scripts, references and artifact hashes.
Final source SHA-256:
`e0ecd30f2c6c160f463f1fbbdeef599b0956587ec61f0e74ab24a222e3041a18`.
No new physical magnitude was fitted to game totals or NFL data.

```sh
npm test
npm run typecheck
npm run build
python3 -m unittest discover -s test -p 'test_*.py'
node --import tsx scripts/diag/shared-capabilities.ts out/shared.json
node --import tsx scripts/diag/hand-fight-trace.ts out/trace.json 3 1
node --import tsx scripts/diag/hand-convergence.ts out/convergence.json
node --import tsx scripts/scenario-pack.ts out/pack.json
node --import tsx scripts/kinematics-compare.ts 4 5
node --import tsx scripts/calibrate.ts 16 7 2
node --import tsx scripts/export-replay.ts 7 --games 6 --out viewer/film-room.html --doc
python3 scripts/film-outcomes.py viewer/film-room.html --out out/film-outcomes.json
python3 scripts/check-replay-viewer.py viewer/film-room.html
```
