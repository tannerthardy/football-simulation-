# The World's dive push-off: what it is, what a coherent one is, and DIVE_STANCE

Tools/Physics, 2026-11-23, for Integration and Run Game (LUNGE_FLIGHT, run/tackle-repair). Develop 0226f0d3 (engine-91). Flag `DIVE_STANCE` (off; `src/physics/dive.ts`, `world.ts`), bench `scripts/diag/body/dive-bench.mts`, test `test/dive-stance.test.ts`. Flag off, the engine is unchanged (the existing dive tests pass).

## The dive as it is

`intent.dive` (a unit vector, or a shorter one for a share of the launch) is a one-tick request (`PlaySim.dives`, consumed on the next step). `World.plan` turns it into `plan.dive` and `plan.launch`; `World.feet` (the `else if (plan.dive)` branch) applies, for the tick, a force

`launch = min(traction, min(1.5, max(0, vmax - speed)) x plan.launch x m / tickDt)`,

along the line, and at the end of the tick (`remaining <= h`) `startFall` takes his feet away (`support.state = 'falling'`, then `down`). `traction = TURF_MU x m x G` (TURF_MU = 1.1, an unsourced "cleat-turf coefficient for a sustained push"). The 1.5 yd/s term is 30 m of force, so for any `vmax - speed` over 0.6 yd/s the traction binds: **the gain is `TURF_MU x G x 0.05 = 0.59 yd/s` for everyone, from a standstill to 8.4 yd/s**, then zero at top speed (`vmax - speed` shrinking below 0.6). It does not depend on his legs (bench: power 0.8, 1.0, 1.3 body weights give the same 0.59), on his speed (0 to 7 yd/s) or on how long he is planted (0.05 s, one tick). He is off his feet 0.05 s after the request. The flight is `FALL_TIP` 3 yd/s² forward and `FALL_FRICTION` 0.25 until down.

That is what Integration said: a lunge adds at most 0.59 yd/s and is gone after one tick. It is also not a leg law: nothing in it is the force the legs give at his speed, which is the law every start and sprint stride uses (`locomotionAccel`; PHY-1, ground drive falls as `1 - v/vmax` along the force).

## What a coherent push-off is, with the model's own legs

A push-off is the legs' ground force over a stance. Three things set it, all already in the model except the duration:

1. **The force** is the stride's: the leg force at zero speed, `pushForce = min(legDrive, traction)` (`legDrive = power x G` x the mass allometry; his strength, capped by the friction on his weight), falling to nothing as his speed along the push reaches top speed (`1 - v/vmax`), scaled by the share of the launch he asked for and by fatigue. Nothing is added to his strength, and nothing is credited to the push because it is a lunge.
2. **The duration** is a stance, not a tick: `DIVE_STANCE_S = 0.12 s` (a stated choice). The planted foot of a sprinter is down for about 0.2 s in the first steps and 0.09-0.11 s at top speed; the take-off foot of a running jump is down about 0.1-0.15 s. A push-off to leave the feet is between: 0.10-0.15 s. These contact times are recalled from the sprint and jump biomechanics literature (Mero and Komi 1992; Rabita et al. 2015; Hay 1993) and could not be confirmed with the search tool this session; check them before relying on the figure. The model rounds nothing to the tick: the impulse is exactly force x 0.12 s (the last substep pushes for the part of the stance left), and the feet go at the end of the tick the stance ends in.
3. **Loss of the feet, flight, landing, recovery** are the existing ones (`startFall`, `FALL_TIP`, `FALL_FRICTION`, `down`, `DOWN_RISE_PLANT`): the push-off ends where the fall begins, and nothing is changed after it.

A real push-off also loads the foot to two or three body weights and so can use more friction, and returns some of its energy elastically. Neither is credited: a lunge does not get a strength the stride does not (stated choice, the same legs applied for a real stance).

**Bench** (lone body, 100 kg, vmax 9 yd/s, average legs = power 1.0 body weight; dive along his line of travel; `dive-bench.mts`). Speed gained at the moment he leaves his feet; yards covered by then; yards covered when he has come to rest in the next 4 s:

| speed at the dive (yd/s) | off: gained / feet gone at / yards by then / at rest | on: gained / feet gone at / yards by then / at rest |
|---|---|---|
| 0 | 0.59 / 0.05 s / 0.01 / 0.31 | 1.27 / 0.15 s / 0.11 / 0.77 |
| 1 | 0.59 / 0.05 / 0.06 / 0.91 | 1.12 / 0.15 / 0.25 / 1.44 |
| 3 | 0.59 / 0.05 / 0.16 / 2.49 | 0.84 / 0.15 / 0.53 / 3.07 |
| 5 | 0.59 / 0.05 / 0.26 / 4.56 | 0.56 / 0.15 / 0.80 / 5.06 |
| 7 | 0.59 / 0.05 / 0.36 / 7.13 | 0.28 / 0.15 / 1.08 / 7.43 |
| 9 (top speed) | 0 / 0.05 / 0.45 / 9.25 | 0 / 0.15 / 1.35 / 10.15 |

The legs matter on: weak (0.8 BW) 1.02 / 0.45 / 0.00 yd/s at 0 / 5 / 9 yd/s, strong (1.3 BW) 1.35 / 0.60 / 0.00; traction caps it (power 2.0 and 4.0 give the same gain).

## What it says, and what it does not

- **The push-off is a speed gain of the size of a stride.** At a run (5 yd/s) the one-tick plant's 0.59 yd/s was almost exactly right (0.56 on); from a walk or a standstill it was about half what a man can do (1.1-1.3); near top speed it gave far too much (0.59 against 0.28 at 7 yd/s, and a diver at 9 yd/s correctly gets none). So the model's old figure was right for a runner and the lunge is not a way to be faster than the legs: "a tackler's legs are always the better option" is the physics for the tackler at speed, not a bug in the push-off. A tackler running at 5-7 yd/s keeps accelerating by about (V - v)/tau = 1.5-3 yd/s², i.e. 0.2-0.4 yd/s in the 0.12 s; the lunge's 0.28-0.56 is that, taken on a line he picks.
- **What a lunge buys instead** is the stance's extra distance (he is on his feet 0.07 s longer: +0.3 yd by the time he leaves them at 5 yd/s, 0.80 against 0.26), the loss of his base (he is in `falling`), and the reach of the body stretched along the ground (`GROUND_STRETCH`, the grasp's `extended` 0.9 yd). That is the "closing" Run Game's flight check should count, not the push.
- **Run Game's `lungeReaches`** (tackle.ts) duplicates the legacy formula (`dv = min(1.5, vmax - speed, TURF_MU x G x sim.dt)`) and then coasts from the launch. With DIVE_STANCE it must use the stance: `diveSpeedGain(profile, speed, vAlong, launch, dt)` in `src/physics/dive.ts` returns the same legacy number flag off and the stance's integrated gain flag on, so the controller's picture of its own push-off and the World's stay one law; and the planted time before the feet go (`DIVE_STANCE_S`, exported; the carrier moves 0.12 s while he is still planted, not 0.05 s). The flight's `fallTime` and the coast are unchanged.
- **Not claimed:** that 0.12 s is the right stance, that the stride's force law is the right force for a loaded push-off, or that the lunge's effect on tackle rates moves in any direction. No game or tackle statistic was run; the flag changes what a launch does and nothing else, and it is off.

## Checks run

`npx tsc --noEmit`; `test/dive-stance.test.ts` (off: one-tick plant, 0.59 yd/s whatever the speed; on: feet gone after the third tick, gain falls with speed and is zero at top speed, stronger legs give more, traction caps it), `test/dive-yaw.test.ts`, `hang-airborne`, `down-rise-plant`, `grasp-world`, `action-effort`, `command-trace`, `contact-legality` (flag off: unchanged).
