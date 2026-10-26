# Why pursuers re-steer twice as often as NFL pursuers (TKL-2, Move 6)

2026-10-26. Diagnosis only: no behavior change in this PR. This review follows
[the pursuit effort read](pursuit-effort-read.md) and three failed pursuit
attempts (effort read, intercept lifetime, heading damping). Its job is to name
the mechanism behind the re-steering excess before anyone proposes another
change. #273 (tackle reach) is held until this is understood.

## Question and operators

Question: which mechanism produces the excess of pursuer heading changes over
15° in 0.2 s (sim 10.0%, NFL 4.9%)?

- **Same-operator comparison:** [`scripts/mechanics/pursuit_aim.py`](../../scripts/mechanics/pursuit_aim.py)
  on BDB2025 week 1 (620 carries) and on a develop `sim-export` (seed 7, 8
  games, 680 carries). A sample is a defender 1.5–15 yd from the carrier,
  moving faster than 2 yd/s, not behind him and not within 1 yd of another
  offensive player. The new outputs split re-steering by distance band and by
  the pursuer's speed divided by the carrier's.
- **Layer attribution:** [`scripts/diag/resteer-cause.ts`](../../scripts/diag/resteer-cause.ts)
  on the frozen TKL-2 case set: 512 approach episodes, inputs in
  `/mnt/project-files/tackle-reach/setups.bin`, list in
  `/mnt/project-files/pursuit-effort/frozen-cases.json`. It restages each
  episode with the selected-actor command trace from 3 s before the closest
  moment to 0.3 s after. Windows use the same sample filter (8,438 windows,
  run on #273 734e70e, where the set was classified). Each 0.2 s window is
  attributed to the first `chase` layer whose output turned.

## Result: the excess is pursuers who are slower than the runner

Same operator, re-steer share (>15° in 0.2 s) by distance band and speed ratio
(pursuer ÷ carrier):

| Band | Speed ratio | NFL share of samples | NFL re-steer | Sim share of samples | Sim re-steer |
| --- | --- | --- | --- | --- | --- |
| 1.5–3 yd | below 0.8 | 36% | 15.2% | 41% | **44.1%** |
| | 0.8–1.1 | 35% | 3.4% | 32% | 15.7% |
| | above 1.1 | 29% | 1.3% | 27% | 13.0% |
| 3–6 yd | below 0.8 | 33% | 11.8% | 32% | **27.5%** |
| | 0.8–1.1 | 37% | 3.2% | 35% | 3.6% |
| | above 1.1 | 30% | 1.3% | 33% | 2.4% |
| 6–10 yd | below 0.8 | 31% | 11.1% | 25% | **20.0%** |
| | 0.8–1.1 | 34% | 2.1% | 38% | 2.7% |
| | above 1.1 | 35% | 1.6% | 37% | 1.6% |
| 10–15 yd | below 0.8 | 34% | 7.8% | 27% | **18.8%** |
| | 0.8–1.1 | 34% | 1.1% | 40% | 3.1% |
| | above 1.1 | 33% | 0.9% | 33% | 1.7% |

- The speed mix is NFL-like: about a third of samples are below 0.8 in both.
- Beyond 3 yd, a pursuer at or above the runner's speed re-steers at the NFL
  rate.
- A slower pursuer re-steers 2–3× as often as an NFL pursuer with the same
  speed deficit, at every distance.
- Weighting each cell by its sample share, slow pursuers account for about
  **76% of the excess** (4.2 of 5.5 points). Matched and faster pursuers inside
  3 yd make 0.8 of the remaining 1.3 points.

The frozen set says the same: slow windows are 36% of windows, but **81% of
body re-steers** (991 of 1,224), at a rate of 32%. All other windows re-steer
at 4.3%, about the NFL's overall rate. On develop eacec91 the committed script, with no
hook, gives the same picture over 5,507 windows: slow pursuers re-steer at 30%
against 6.9% for everyone else, and make 67% of body re-steers (529 of 786).
55% of those come from the close gather.

## Which layer turns a slow pursuer

Body re-steers of slow pursuers on the frozen set, by the most recent command
layer that turned (within 0.3 s):

| Layer | Count | Share |
| --- | --- | --- |
| Close gather: the near-hip command rotates while he is in it | 338 | 34% |
| Motion layer: body turns with a steady command | 180 | 18% |
| Close gather: entering it (intercept sprint to near-hip arrival) | 158 | 16% |
| Aim: intercept-time switch | 93 | 9% |
| Aim: forecast change | 43 | 4% |
| Post-decision `spacing` rewrite | 44 | 4% |
| Close gather: exit, blend ramp, approach-choice switch | 81 | 8% |
| Other (controller switch, around-bodies, contact) | 54 | 5% |

The close gather accounts for 58% of the slow pursuers' re-steers. In 1,593
slow windows in the close gather, the re-steer rate doesn't depend on whether
he is closing: 37% when closing under 1 yd/s, 36% at 1–3 yd/s, 38% at 3+ yd/s.
Non-slow pursuers in the gather run 5–6%. Most of these slow pursuers were
already slow (32%) or were accelerating (43%). Only 25% had braked by more than
1 yd/s in the previous 0.5 s, so the gather's own braking isn't the main
source.

Aim-bearing changes (994 windows, all speeds) split into:

- intercept-time switches: 565 (57%; 403 of them at 3–6 yd);
- forecast change: 408 (41%; spread over 3–15 yd);
- closing geometry: 21;
- leverage: almost none;
- target switches: none.

Summed absolute degrees give the same order: time switch 21.6k, forecast
13.2k, geometry 3.8k, leverage 0.9k. The aim matters at 3–10 yd and is a minor
part of the slow excess.

## Named mechanism: the slow hip chase

Inside about 3 yd (`gatheringApproach`'s `close` term: contact + 2.5 yd, ramped
over 0.75 yd), `chase` bypasses the intercept and steers with
`movingArrivalVelocity` toward the runner's current hip. That command matches
the runner's velocity across the line of sight and closes along it. A pursuer
slower than the runner can't produce that across speed. So the line of sight
rotates every step, the next command rotates with it, and the body, which turns
easily at low speed, follows. He arcs in behind the runner instead of holding a
line ahead of him.

NFL pursuers with the same speed deficit hold their line about 3× better
(15% vs 44% inside 3 yd). They also lead more close in: 0.85 s against our
0.40 s, and 1.5× the time to contact against our 1.0×
([aim evidence](/mnt/project-files/pursuit-effort/aim-evidence.md)).

## Reproducers (frozen set, #273 734e70e, `resteer-cause.ts` examples)

- **s7 P006 LB_M, missed-attempt, t 2.10–2.75.** At 2.7 yd/s against a
  runner at 4.3–5.4 yd/s, he enters the close gather at 2.7 yd. The command
  turns from 141° to 95° and the body from 180° to 96° in 0.6 s while he
  closes only from 3.2 to 1.5 yd. He misses.
- **s7 P036 SS, short-braked, t 2.75–3.05.** At 4.1 yd/s against 7.6–7.9 yd/s,
  he enters the gather at 2.8 yd. The command turns from −119° to −80° in
  0.3 s and the body follows from −119° to −96°. He never gets inside the
  envelope.
- **s7 P051 LB_M, short-outrun, t 3.65–3.95.** At 4.4 yd/s against 7.8–8.1
  yd/s, he holds about 2.9 yd while the command rotates from −84° to −39° and
  the body from −108° to −86°. He is outrun.

Each is restaged by `resteer-cause.ts` with the frozen inputs.

## Why the three earlier attempts failed

They all acted on the aim layer, which is a small part of the slow excess:

- The effort read changed speed, not where he steers inside 3 yd.
- The intercept lifetime held stale aim points.
- Heading damping made the forecast worse (3 s error from 5.3 to 6.2 yd)
  without reducing re-steering (11.2% to 10.8%).

Yards rose with aim error. On the frozen set, re-steering within 0.6 s after a
runner's cut is about as common in finished episodes (33%) as in failed ones
(28%). So nothing here shows that the re-steering is what lets pursuers recover.

## Proposed fix (not built)

Keep the gather's near-hip arrival for a pursuer who can match the runner. When
he can't, keep the intercept line:

- In `gatheringApproach` (`src/sim/behaviors/common.ts`), the close-gather
  bypass applies only when the pursuer's attainable speed (current speed plus
  about 0.3 s of acceleration, from his own body) covers the runner's observed
  speed across the line of sight.
- Otherwise `chase` keeps the intercept point at his own speed (which already
  exists and is feasible or fallback), blended toward the near hip only within
  contact + 0.5 yd for the grab itself.
- This uses only his own picture and body. No new knob or flag: the condition
  is the physical question "can I get in front of him from here?"

Checks for that change, using the same operators:

- slow-pursuer re-steer share falls toward the NFL's (15 / 12 / 11 / 8% by
  band) while the matched rows stay where they are;
- the three reproducers hold a line ahead of the runner;
- the tackle-reach thread's 49 never-inside-envelope snaps
  (`/mnt/project-files/tackle-reach/develop-6ae4bd8/`) and s8 P111 DT_W;
- matched yards per play on develop and on #273, with every moved statistic
  explained;
- stop after two attempts.

## Caveats

- One NFL week and one sim seed for the same-operator table. The frozen set is
  seeds 7 and 8, game 1.
- Speed ratio and heading come from positions on a 0.1 s grid on both sides.
  The 0.8 split is a reading aid, not a fitted threshold.
- Attribution is "first layer whose output turned". A downstream layer's
  separate contribution isn't counted.
- Some of the 1.5–3 yd excess is from matched and faster pursuers (about 0.8
  points). That is part of the gather too but is not explained by speed.
- The approach-choice split needs an uncommitted `__approachHook` in
  `chooseApproach`. Without it those windows read `none`, and no other number
  here changes.
