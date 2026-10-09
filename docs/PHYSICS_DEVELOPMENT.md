# Physics development and testing

A short guide for agents working on the physics. It covers how to think about
the physics, what the test suite is, how to make a change, and how much testing
is enough. For current status, evidence and the ranked work list, read
[physics-world-and-readiness](reviews/physics-world-and-readiness.md).

## 1. The philosophy

**Football skills are different ways of controlling the same physical body.**

The physics engine decides what is possible: mass, momentum, friction, reach,
balance, grip, and the forces that legs and hands can deliver. Motor control and
football intelligence decide how well a player uses those possibilities.

Take tackling. An elite tackler and a poor tackler have the same kind of body
under the same physics. The elite tackler does better because he:

- gets his body into a better position;
- applies force at better angles;
- times his hands;
- keeps leverage and balance;
- chooses correctly between anchoring and redirecting;
- recovers efficiently when he misses.

The poor tackler's weaknesses show up as worse choices and worse execution of
those same controls. They are never a lower tackle-success number.

What this means for code:

- **No outcome rolls.** Do not decide "the tackle succeeds with probability p"
  or "the block wins if rating A > rating B". Outcomes emerge from bodies, joints
  and forces.
- **Ratings map to control, not results.** A rating may change reaction delay,
  aim error, hand timing, posture, step frequency or force limits. It must not
  scale a win chance or multiply yards.
- **Few parameters, each physical.** Add a rating or constant only if you can
  name the physical quantity it controls and roughly how large it is in real
  players. Prefer measured numbers (tracking data, biomechanics) to tuned ones.
- **No timers pretending to be physics.** A block lasts as long as the hands
  hold and the feet keep the base. It does not last "0.8 s".
- **One world.** Every body moves through `src/physics/world.ts`. A technique
  works by sending intents (feet, hands, grasp, lunge) into it. A technique
  never moves bodies directly.

A useful check for any change: *could two players with identical bodies get
different results only because one controls his body better?* If yes, the change
fits. If the result depends on a number that was set to produce that result, it
does not.

## 2. The test suite

The suite has five layers. They run from cheap and exact to expensive and noisy.
Each layer has its own job; do not use a noisy layer to answer a question a
cheaper one can.

| Layer | What it checks | Where | Cost | When to run |
|---|---|---|---|---|
| 1. Contracts | Conservation and correctness of the world: momentum accounted for by recorded ground impulse, no energy created by contacts, inelastic collisions, bounded penetration, finite state, rotation and mirror invariance, results that do not change with the substep count | `test/world-physics.test.ts`, `test/grasp-world.test.ts`, `test/physics.test.ts` | seconds | every change |
| 2. Scenarios | The owner's six interactions (redirect, squeeze, release, seal, approach tackle, side hit), run with the real techniques. Asserts the contracts plus coarse physical directions: a harder hit displaces more, both sides of the field match | `test/scenario-pack.test.ts`; full report from `scripts/scenario-pack.ts` | seconds | every change |
| 3. Technique regressions | Pursuit, tackle and pass-contact behavior that was diagnosed and fixed before | `test/pursuit-contact.test.ts`, `test/pass-contact.test.ts` | seconds | every change |
| 4. Probes and convergence | Repeatable measurements, not pass/fail: interaction readiness, results across substep counts (6/12/24/48), labs that isolate one interaction | `scripts/interaction-readiness.ts`, `scripts/diag/pack-converge.ts`, `scripts/open-field-lab.ts`, `scripts/tackle-lab.ts`, `scripts/trench-lab.ts`, `scripts/diag/*` | a minute or two | when you change a mechanism, before committing |
| 5. Real-world comparison | Speed, acceleration, get-off and yards before contact against NFL tracking summaries; whole-game calibration | `scripts/kinematics-compare.ts`, `scripts/calibrate.ts` | minutes; games are noisy (about ±3 points over 8 games) | before committing a change that moves players; as a guard, not a tuning target |

`npm test` runs layers 1–3 together with the rest of the project's tests. It
currently takes about 40 s. Write probe and calibration output to the ignored
`out/` folder. Commit only summaries you have reviewed, under
`data/reviews/physics-world/`.

**Weight the layers by how directly they show the physics is right.** A failing
contract is a bug, always. A scenario that looks wrong is very likely a bug. A
tracking mismatch is strong evidence. A game statistic (points, punts, drives)
is weak evidence about the physics, because play calling, clock and coverage all
feed into it. Never tune physics to move a game total.

## 3. How to make a physics change

1. **Start from an observation.** Choose one thing that looks physically wrong,
   in a scenario, a trace or a tracking comparison. Write down what a real
   player's body would do instead.
2. **Trace it before fixing it.** Use a diag script to find which force, joint
   or intent produced the result. Most "wrong outcomes" come from one bad
   number or a missing term, not from a missing rule.
3. **Fix the cause in the physics or in the control.** Decide which one it is:
   - something the body *cannot* do, or does in a way no body could, belongs in
     the world (`src/physics/`);
   - a poor choice belongs in control (techniques and behaviors).
   Do not add an outcome adjustment downstream to cover either.
4. **Add the cheapest test that would have caught it.** Prefer a contract or a
   small scenario. One test per bug is usually enough.
5. **Run the layers in order.** Run `npm test` and `npm run typecheck`. Run the
   probe or lab for the area you changed, and its convergence check if the
   change touches contact. Then compare tracking. Run games last, only as a
   guard.
6. **Record the evidence.** Update the readiness doc with what changed, the
   before/after numbers, and what is still wrong. Regressions belong in the doc;
   do not hide them.

Change one mechanism at a time. If a change needs two compensating constants to
look right, the model is probably wrong. Stop and trace.

## 4. How much testing is enough

Tests cost something. Each one adds run time, maintenance, and a bit of
resistance to future correct changes. A test is worth keeping when it catches
real mistakes cheaply and fails only for real reasons.

**Worth it (high benefit, low cost):**

- Invariant tests for every mechanism: conservation, symmetry, finiteness,
  no penetration, substep independence. They are exact and cheap. When they
  fail, something is wrong.
- One or two scenario tests per owner interaction, asserting directions
  ("harder hit, more displacement") rather than exact values.
- A regression test for each bug that was hard to find.

**Usually not worth it:**

- Exact football outcomes ("this tackle gains 2.3 yards"). These break on every
  correct improvement, and they freeze the current tuning in place.
- Tests that repeat a contract already checked at a lower layer.
- Statistical pass/fail tests on whole games. They are slow and flaky, and they
  pull the work toward tuning. Keep games as a measurement you read.
- Very large parameter sweeps in the default suite. Run them as probes when
  you need them.

**Too much testing** looks like this:

- `npm test` takes more than about 2 minutes, so people stop running it.
- A correct physics fix requires editing many test thresholds.
- Tests describe the current numbers instead of the physical requirement.

When that happens, delete or loosen tests rather than adding more. A test that
fails for a correct change is a cost, not a safety net.

**Too little testing** looks like this:

- A mechanism has no conservation or symmetry check.
- A bug comes back after it was fixed.
- Nobody can say whether a change made the physics better or worse without
  running full games.

## 5. Tests worth adding next

Keep this list short. Add each test together with the physics work it guards.

1. **Same body, different control.** Two players with identical bodies, one
   with good control (angle, hand timing, posture) and one with poor control,
   in the approach tackle and in a block. The good controller should win more
   often *only because of* the control inputs. This test checks the philosophy
   directly. It is the most valuable missing test.
2. **Contact height and leverage.** Once contact height exists, add
   scenarios showing that the lower man, at equal mass and effort, gains
   leverage, and that a high tackle on a big back can be broken.
3. **Convergence gates.** Turn the substep convergence probe into a test with a
   tolerance for each interaction. The redirect scenario does not yet converge
   (closest approach 3.24 → 2.13 yd from 6 to 48 substeps).
4. **Tracking bands.** Once DL get-off and yards before contact match NFL
   tracking, add a loose band test so they cannot drift again. Do not add it
   before they match: a test that locks in a wrong value is worse than none.

## 6. Quick reminders

- Physics first. No coverage, play pool or pressure work until the owner gives
  an explicit OK on the physics.
- The test count is not readiness. The gates in the readiness doc are.
- Keep `npm test` fast. Put slow measurements in scripts.
- Use real units (kg, yd, s) and cite a source for every physical magnitude
  you introduce.
- If you are unsure whether something is physics or control, ask whether a
  better player with the same body could do it differently. If he could, it is
  control.
