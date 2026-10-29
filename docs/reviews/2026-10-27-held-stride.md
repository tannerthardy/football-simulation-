# A hold on his legs binds his stride

Main Engine, Stage 1, 2026-10-27. Base: develop `1ec115c7`. This follows
[the after-contact diagnosis](2026-10-27-after-contact.md) (#346). That
review found two things:
- Carriers fell 0.4 s after contact. A hold slid to the shins on a 0.3 s
  clock, and its thigh moment tripped him with no hip brace.
- The existing default-off finish package fixed the falls, but left lone
  tacklers unable to finish. A hold on his legs did not limit his stride.

## The law

Each hold on a runner's legs resists his stride, with magnitude
`legs share × min(grip, the holder's footing)`:
- The holder's footing is his traction while up, or his sliding friction on
  the ground.
- The share is where the arms are on him: a waist hold binds nothing.
- While the runner asks to keep moving his way, that resistance opposes his
  travel through his feet. It stays within his traction and never reverses
  him.
- A man standing, or carried along by the hold, is not striding.

The force goes to the ground, not into the joint, so no arm, grip or leg
capacity is added. Each hold records the share it took (`GraspJoint.strideForce`)
for whoever reads its causes.

## The package, all on, no flags

| Part | Was | Now |
|---|---|---|
| Held stride (new, `world.ts`) | none | the law above |
| Slide by slip (`world.ts`) | a slipping hold slid toward the ankles on a 0.3 s clock (`LEG_SLIDE`) | moves down him by the distance the arms actually slipped |
| Hip brace (`world.ts`, was `LEG_BRACE`) | off: a thigh moment tripped him in full | on: the hips brace above the knee, below-knee holds still trip |
| Wrap binding (`tackle.ts`, was `WRAP_BIND`) | off | on: a secure wrap couples to his corrective step |
| Roll finish (`tackle.ts`, was `TACKLE_ROLL`) | off | on |
| Arm span (`tackle.ts` `updateBond`) | judged the hold by body centers, so a wrap on a trailing leg read as "extended" and the holder jogged along | judges it by the arms' span (`armDistance`) |
| Holding caller (`contact-holding.ts`) | took the feet only through grip tension | also through a hold's stride force |

The three flags are removed from `config/baseline.json` and `docs/FLAGS.md`.

## 1v1 tackle panel (`scripts/diag/tackle/panel.ts`, 576 reps)

| | develop | package alone | package + slide | this PR |
|---|---|---|---|---|
| Ordinary tackled | 0.82 | 0.81 | 0.79 | 0.85 |
| Difficult tackled | 0.82 | 0.55 | 0.48 | **0.77** |
| Censored (held, unfinished) | 0 | 103 | 123 | **14** |
| Escaped | 103 | 121 | 133 | 107 |
| Finish by fall / stopped progress | 467 / 3 | 324 / 28 | 292 / 28 | 244 / 211 |

Yards after contact (median) by cell, develop → this PR:

| Cell | develop | this PR |
|---|---|---|
| 135° at 3 / 6 yd/s | 3.3 / 6.4 | 1.3 / 4.1 |
| 180° at 3 / 6 yd/s | 3.2 / 7.9 | 1.1 / 6.1 |
| 90° at 3 yd/s | 2.3 | 1.1 |
| 45° at 8 yd/s, with a cut | 5.4 | 7.1 |

- A lone holder from behind now stops a 3 yd/s runner in about a yard. The
  finish is a stall or a fall, where develop got a trip.
- Censored reps: 3 of 12 in the 45° cut at 8 yd/s, and 1 each in four
  other cells. In the ones traced (45° cut at 3 yd/s with an earlier arm),
  an upper-body side hold (legs share about 0.3) leaves the runner crawling
  on at about 1 yd/s, just above the stopped-progress threshold. A side
  hold at the waist binds little of the stride, so the finish has to come
  from the holder, and 2D has no hanging weight. Open risk below.

## Games (`carry-end-probe`, run-only, seeds 7/9/11/13)

| | develop | this PR | NFL (film operator) |
|---|---|---|---|
| Live 0.8 / 1.0 s after contact | 0.39 / 0.18 | 0.74 / 0.54 | 0.76 / 0.65 |
| Contact → end (median) | 0.75 s | 1.05 s | 1.30 s |
| Yards after contact p25 / p50 / p75 / p90 | 0.58 / 1.34 / 2.56 / 4.28 | 0.74 / 1.56 / 2.95 / 5.75 | 1.26 / 2.42 / 3.97 / 6.98 |
| Mean / ≥ 10 yd | 3.44 / 5.0% | 3.17 / 3.8% | 3.40 / 5.0% |
| Legs falls 0.4 s after contact | 323 / 439 | 281 / 422, later | — |
| Carrier speed 0.5 s after contact (seeds 7/9) | 2.86 | 2.27 | 3.35 (film operator) |

- Carriers now stay up about as long as in NFL.
- They move slower while held: speed 0.5 s after contact fell from 2.86 to
  2.27 yd/s, away from NFL's 3.35. The open risk is the first adverse
  measure below.

## Matched restage (seeds 7 and 11, 270 snaps × 4 RNG shifts)

`scripts/diag/aim-jump/restage.ts`. The arms differ, paired by snap, mean
over shifts ± SE.

| Per play | develop | this PR | difference |
|---|---|---|---|
| Run yards | 4.76 | 4.50 | −0.26 ± 0.34 |
| Pass yards | 7.95 | 7.70 | −0.25 ± 0.19 |
| Runs ≥ 10 yd | 11.0% | 11.9% | +0.9 ± 0.8 pts |
| Runs ≤ 0 yd | 25.9% | 24.4% | −1.5 ± 1.1 pts |
| Passes ≥ 20 yd | 14.2% | 14.1% | −0.1 ± 0.5 pts |
| Missed tackles | 0.181 | 0.174 | −0.006 ± 0.004 |
| Broken tackles | 0.127 | 0.097 | **−0.030 ± 0.008** |
| Touchdowns | 0.062 | 0.055 | −0.007 ± 0.003 |

670 of 1,080 replays change. Fewer holds slip and break, which TKL-1 (too
many broken tackles) points toward. Touchdowns −0.007 is 2.3 SE: holds that
used to break on long gains now hold.

## Open risks

1. **Carrier speed while held.** It is 2.27 yd/s, against NFL's 3.35. The
   resistance is the hold's full grip times the legs share, whenever he
   strides. A real runner can still churn through a loose leg hold, so the
   stride's resistance may need the hold's slack: how far the leg can move
   before the arms are loaded. That is the next question if the speed gap is
   confirmed on the film operator.
2. **Side holds at the waist** (14 censored panel reps, develop 0). The
   finish needs the holder's weight, which 2D does not model.
3. **`test/contact-holding-rules.test.ts`, "can remove the rip exception for
   an isolated native cloth-caused loss of support"** (rules lane, G6).
   - With the hold binding his escape stride, the victim falls at 0.85 s.
   - The caller judges the hold episode once, at 0.65 s, before the feet are
     taken. So the scene records the unresolved rip no-call instead of the
     call.
   - The caller code already supports the call. The scene, or a later
     re-judgment when feet are taken in the same hold, is the rules owner's
     choice.
   - Left failing for that decision; nothing was skipped.

## Physics-owner review and a second attempt (stop rule reached)

Two objections to the law above:
1. **No reaction on the holder.** The resistance is sized by the holder's
   footing but taken off the runner's ground force without loading the
   holder.
2. **Slack holds bind as much as taut ones.**

**Attempt 2, scratch (`STRIDE_V2`, not committed).** A taut hold limits the
runner's own propulsion along his travel by legs share × tension share
(last-step grip force over grip capacity). It is an internal limit; nothing
external is added.

Same seeds and operators:

| | develop | this PR (attempt 1) | attempt 2 | NFL |
|---|---|---|---|---|
| Panel: difficult tackled | 0.82 | 0.77 | **0.50** | |
| Panel: held, unfinished | 0 | 14 | **131** | |
| Film: speed 0.5 s after contact | | 2.60 | 3.09 | 3.35 |
| Film: yards after contact p25/50/75/90 | | 1.13 / 2.04 / 3.23 / 5.14 | 0.94 / 2.05 / 3.62 / 6.13 | 1.26 / 2.42 / 3.97 / 6.98 |
| Film: live 0.8 / 1.0 s | | 0.68 / 0.53 | 0.66 / 0.47 | 0.76 / 0.65 |

Film is seeds 7/9, `scripts/diag/after_contact.py`.

- Attempt 2 keeps carriers closer to NFL speed.
- It fails the finishing bar: lone tacklers from behind again cannot finish.
- Attempt 1 finishes, but brakes held carriers too hard, and its force has no
  holder-side reaction.

**Stopped (two laws).** The missing mechanism is how a bound stride is resolved
between the two bodies: how much of the runner's stroke the holder's arms
absorb, and what that costs the holder. A real finish comes from his weight
and the bound legs; in this 2D model the holder cannot hang weight on the
runner.

That needs a design decision before a third law:
- (a) model the holder's weight on a leg hold as vertical load on the runner,
  which cuts his traction (feet unloaded or overloaded); or
- (b) accept attempt 1 with its two risks stated.

## Attempt 3, landing: hanging weight (Tanner chose to land it, 2026-10-27)

Commits `93d4182`, `612a2c1` (Main Engine). This replaces attempt 1's law.
§1–5 above describe attempt 1 and are kept as history.

- A holder off his feet who still holds the runner's legs hangs half his
  weight on the hold (`HANG_SHARE`).
- To keep striding, the runner's hip has to swing that weight through. That
  uses the same hip torque that braces a thigh hold, so the bound share of his
  stride is lost from his own drive. No external force is added, and his
  traction is unchanged.
- A tackler drops his weight only after planting has failed: a secure leg
  hold, held 0.4 s, and he is still being dragged.

Main Engine's measurements, against develop and NFL:

| | develop | attempt 3 | NFL |
|---|---|---|---|
| Speed 0.5 s after contact (seeds 7/9) | — | 3.29 | 3.35 |
| Yards after contact p25/50/75/90 (4 seeds) | 0.58 / 1.34 / 2.56 / 4.28 | 0.94 / 1.91 / 3.62 / 6.52 | 1.26 / 2.42 / 3.97 / 6.98 |
| Still up 0.8 / 1.0 s after contact | 0.39 / 0.18 | 0.72 / 0.53 | 0.76 / 0.65 |
| 1v1 hard-angle / ordinary tackled (10 s) | 0.82 / 0.82 | 0.77 / 0.83 | — |

Matched replays vs develop (1,080):
- run yards +0.50 ± 0.34, pass yards +0.26 ± 0.15
- broken tackles −0.017 ± 0.007, runs of 10+ yd +2.4 ± 1.1 points

### Known problem: the holder's weight is counted twice

The hanging holder still slides on the ground with his full weight
(`DOWN_FRICTION · G · m`) while half of that weight hangs on the runner.

A follow-up thread tested removing the double count. The patch and its
numbers are in the project files under `held-stride/`. A grounded holder's
friction then uses his weight less what hangs, and the hung weight is capped
by grip capacity.

1v1 panel, 576 reps:
- difficult tackled 0.69 → 0.56
- censored 51 → 129

Matched restage, seeds 7 and 11, 274 snaps × 4 shifts:
- run yards +0.37 ± 0.18
- missed and broken tackles −0.009 ± 0.004

The fix is correct, but on its own it lets runners drag holders further. In
real tackles the finish also comes from the tip a low hung load causes: the
legs are pinned and the body keeps going. Nothing models that yet.

**Follow-up:** a tip law for hung leg loads, landed together with the holder
unload. Until then the double count stays, as a known shortcut that errs
toward finishing tackles.
