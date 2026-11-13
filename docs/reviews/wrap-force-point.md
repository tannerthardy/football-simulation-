# Reach wraps: height explains the rescue; recovery explains unstable gains

Lowering the saved slow-rear hold repairs it by changing its pitch moment,
not by binding corrective recovery more tightly. A paid release/retry can
acquire a lower hold through the existing model, but it worsens successful
controls. No re-grab policy is installed.

The better-looking gait alternative also exposes a physics problem: several
new coarse finishes disappear or change at finer resolution. Primary's existing
continued-recovery candidate removes the unstable finish on the fast rear and
brings its live 12/96-step trajectories into close agreement. **Validate that
recovery mechanism before promoting gait or adding a finishing rule.**

Started from `codex/slow-rear-contact` `23de24f`, clean. Read primary
`c2cd220` and live-gaps `0945b92`; preserve Claude's gait, blocking and planned
hanging-weight work. Final production engine is unchanged, source
`b74545da8e72fd35321ef4e16bbdb54153262711eb40deb361a1d10b6de63e88`.
Experimental/RB defaults remain as before.
[Receipt](https://github.com/tannerthardy/football-simulation-/blob/67301d24ef56a72b4a205185fb6c76b6dd845c7b/data/reviews/current/wrap-force-point.json) retains every
changed finish, worse completed spot, censor, source and diagnostic intervention.

## Isolate the two effects of the depth substitution

Use the saved 180°/3, seed-3002 rear pair, successful earlier shallow hold,
repaired fresh 135°/6 pair and diving 90°/6 controls. Within each factorial,
incoming bodies, movement requests, capacity and secure-wrap estimates are
identical. Only height, corrective coupling, both, or neither changes. Natural
physical slide is allowed; no recorded slip, break or fall is imposed.

| Slow-rear arm | First fall at 12 / 24 / 48 / 96 steps |
| --- | --- |
| Original | None at every resolution |
| Lower contact, original coupling | 3.85 / 3.80 / 3.80 / 3.80 s |
| Higher coupling, original contact | None at every resolution |
| Both | 3.85 / 3.80 / 3.80 / 3.80 s |

The depth proxy changes contact height from 0.725 to 0.557 of current COM
height. Actual executed load buffers show the original moment uses the thigh
brace branch, with zero direct trip source. The lower contact enters the
existing knee-transition region: about 42% of its pitch moment goes directly
to the trip source. Coupling alone changes motion slightly but cannot reproduce
this source. No strength, traction, grip or bracing parameter is adjusted.

The successful shallow hold still falls without changing height; height is
not universally required. The repaired rear and diving control remain falls.
Collinear rear mirrors duplicate the incoming state, rather than providing
independent confirmation. The intervention boundary at 2.85 s is the existing
proximity gate (`torso + .15`); actual torso impulse occurs during 2.85–2.90 s.
Proximity does not establish a physical re-grab.

## Pay for an actual new acquisition

The model's `reach` is horizontal, and `height` is a force parameter. There is
no resolved vertical hand-motion actuator. Instead of inventing one, test the
existing release and ordinary tackle-acquisition primitives, once after the
holder's first actual torso impulse. Keep the existing 0.5 s attempt cooldown,
reach/occlusion checks, miss/fumble attempts and execution draws. Releasing
changes only the grasp; the incoming bodies and their support history remain.

The slow rear releases at 2.90 s. It cannot retry until 3.10 s, acquires the
new grasp by 3.15 s, and draws depth 0.963 rather than receiving a prescribed
target. It physically falls and advances 5.750 yd rather than remaining
censored after 13.415 yd. This is feasible within the existing reduced
acquisition model; it does not prove an anatomical hand path.

That cost matters. The same trigger makes several completed 45° controls
advance roughly 2–4 yd farther. The selected fresh rear still finishes, but
its spot worsens. An automatic release-after-contact policy is rejected.
These bounded legacy-law probes are not a population or promotion test.

## Compare the existing gait alternative separately

Use only `src/physics/kinematics.ts` from Claude's `839bf3b` on base `23de24f`,
in an isolated checkout. No other upstream/controller changes are imported.
Runtime source is
`f3ac3676d4cf2090b6556ef46d76480d3dd7f9e996b048d1a8754f34403e909a`.
Gait-off factorial trajectories exactly reproduce the previous kernel.
`GAIT_STEP=0.3` keeps the existing force/traction/work envelopes; this session
does not tune its value. Finish controls use `LEG_BRACE=1 TACKLE_ROLL=1 WRAP_BIND=1`.

| Native coarse finishes | Matched 144 | Previously inspected fresh 96 | New 48 |
| --- | ---: | ---: | ---: |
| Finish controls | 104 | 74 | 40 |
| Controls + gait | 114 | 76 | 40 |
| Controls + early contact | 100 | 74 | 40 |
| Controls + gait + early contact | 106 | 76 | 40 |

New inputs were declared before collection: roster 101/102, seed 6001, all 24
cells and mirrors. They are generated checks, not a blind NFL final exam.
Gait loses no coarse finishes versus controls. Adding early contact to gait
loses sixteen matched finishes and gains eight. The gait-only matched arm has
112 physical falls, two stopped-progress finishes, twenty escapes and ten
censored plays. Fresh has 76 falls/twenty escapes; new has forty falls/eight
escapes. Completed absolute field spots worsen by >0.1 yd on thirty matched,
thirty fresh and twelve new paired inputs. Acquisition-relative clocks/spots
are not substituted for comparable field positions.

## The gains are not yet dependable

Replay all ten mirrored gait gains at 12/24/48/96, keeping requests and grip
updates fixed. Native coarse boundaries reproduce within 1e−7 yd. Three of
the five distinct input types remain upright on finer frozen tapes.
Then rerun **live controllers** at 48 and 96 to check the phase-feedback limit:

| Input, same mirrored seeds | Gait at 12 | Gait at 48 | Gait at 96 | Gait off at 48 / 96 |
| --- | --- | --- | --- | --- |
| 90°/3 straight, 3000 | Fall | Fall | Fall | Fall / fall |
| 90°/3 cut, 3001 | Fall | Censored | Censored | Censored / censored |
| 135°/3, 3001 | Fall | Censored | Fall | Censored / censored |
| 180°/3, 3001 | Fall | Fall | Fall | Censored / censored |
| 180°/8, 3001 | Fall | Censored | Censored | Censored / censored |

Only the 180°/3 new mirrored finish persists as an added finish at both finer
resolutions. The straight 90° case is already a finish without gait there.
The 135° case remains unstable. Do not treat 114/144 as a validated gain or
claim the NFL early-speed gap is repaired.

## The physics handoff

Fast rear 180°/8, seed 3001: legacy gait physics falls at 4.45 s with 12 steps,
but stays upright at 96. Observed acquisition-relative advance is 17.495 versus
31.430 yd. Before the coarse support jump, at 3.80 s, capture deviation is
0.1526 yd. It rises to 0.5771 at the next boundary.

Reconstruct World-owned attachment history by replaying the same native
prefix at 12, then fork resolution **from identical incoming state** at 3.80.
Every resolution reproduces the jump (0.5771/0.5816/0.5838/0.5838 yd). Thus the
final interval alone does not cause the large disagreement; earlier recovery
history and subsequent live feedback matter.

Reuse primary's unchanged `continued-recovery` diagnostic implementation.
With that law active from the shared initial state, its prefix avoids the
repeated return-to-base jump; deviation stays around 0.13–0.14 yd in the
3.80–4.10 s window. The legacy and continued prefixes intentionally have
different incoming states at 3.80; each resolution fork within a variant is
identical. This is not a same-state local substitution claim.

Live candidate controllers on the fast rear at 12 and 96 both remain
upright/censored. Maximum path disagreement is **0.01243 yd**, and observed
advance is **30.534728 / 30.534706 yd**. No deeper hold, stronger grip, forced
fall or hold timer is added. The continued candidate repairs agreement in
this test; the upper hold's actual failure to finish remains.

[Compact prefix witness](../../data/reviews/current/loaded-wrap-prefix-witness.json)
contains initial bodies/joint, physical prefix decisions and native boundary
positions. The replay reconstructs attachments, rather than restoring a foot
without its acquired reference. On the isolated kernel:

```sh
LEG_BRACE=1 GAIT_STEP=0.3 node --import tsx scripts/diag/physics/loaded-wrap-interval.ts data/reviews/current/loaded-wrap-prefix-witness.json out/wrap-force-point/replay.json
```

Add `--continued-recovery` for primary's candidate. On a changed physics source,
use `--candidate` explicitly; native equality is then unclaimed. The candidate
helper hashes are separate from the `src` hash because diagnostic adapters
change executed laws without editing production files.

All panels/candidate captures are exact observed/plain endpoint and RNG
neutral. Actual arm impulse/work, passive work and support motor limits pass.
The isolated gait kernel passes **97 focused checks** with the companion
flags enabled. Typecheck/build pass for the final diagnostic package. The
unchanged engine retains its prior complete-suite receipt and existing Tite
failure; no new full-game or production-promotion claim is made.

The single best next step is primary's **continued-recovery validation on
additional native loaded cases**, including these five gained inputs and
the retained angled/patch failures. Establish agreement and preserved law
controls before assessing an earned re-grab or Claude's hanging-weight finish.
