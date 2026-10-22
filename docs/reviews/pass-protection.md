# Pass protection: where tackles meet edge rushers

Question: our tackles meet edge rushers at the line, a quarter second after
the line starts. Tracked tackles kick back and meet them 2.8 yd deep. Is
this the request or the body, and what makes meeting early costly?

**Measure.** `scripts/diag/pass-contact.py`, from the playbook/research
session (claude/great-mccarthy-85uf8b, `docs/reviews/pass-set-contact.md`).
It times from each play's line start (the median first movement of its five
OL), so the tracked snap lag cancels. Dropbacks without play action:

| Dropbacks, no play action | Sim before (6 games, 301-306) | `PASS_CORNER` | NFL 2022 |
|---|---|---|---|
| Tackle retreat at 0.3 / 0.5 / 1.0 / 1.5 s (yd) | -0.4 / -0.4 / 0.5 / 2.1 | -0.1 / 0.1 / 1.2 / 2.7 | 0.5 / 0.9 / 2.1 / 3.5 |
| Edge contact, median s after line start | 0.56 | 0.88 | 1.25 |
| Rusher depth at contact, median (yd) | 0.4 | 2.2 | 3.4 |
| Interior contact, median s | 0.63 | 0.59 | 0.79 |
| Pressure (defender within 2 yd before the throw) | 51.7% | 45.3% | 30.5% |

**Cause: the request.** `cutOffPoint` sends the tackle to the earliest point
on the rusher's predicted arc that he can reach first, at 0.75 of his top
speed. That point is at the line, so he steps up 0.4 yd to get there. It
replaced a set on the straight line to the QB, which left him on the chord
inside the arc; that geometry is kept.

**Change.** `PASS_CORNER` (default off; on in this branch's profile;
`blocking.ts` `cutOffPoint`):
- He cuts the rusher off only where the rusher's arc has turned toward the
  QB (heading within 0.5 rad of the QB's direction), the earliest such point
  he can reach first, looking up to 1.6 s ahead.
- Football reason: before the corner the rusher can still counter inside
  ("make him declare", "make the rusher come to you").
- Nothing is forbidden. Where the rusher commits early he is still met early
  (contact p25 0.46 s).

Contract: `test/pass-corner.test.ts`: on the recorded P040 rep the tackle
meets the end later and deeper, and does not step up first.
`pass-cutoff-approach` and `qb-rusher-recording` stay on the old law; in
P019 one tackle is not yet engaged at the throw under `PASS_CORNER`.

**Still open.**
- Tackle retreat is about half the NFL's by 1.0 s.
- Pressure was already 46% on this branch before this session's flags
  (`sim-ps3`). It is the next pass-protection question: interior contact is
  NFL-like, so the rushers' wins after contact are the place to look.
- Edge alignment. The def-alignment session (`claude/def-alignment`,
  `docs/reviews/defensive-alignment.md`) measures the widest front player per
  side on dropbacks: 1.5+ yd outside the tackle on 51% of sim snaps without
  flags, 89% in the NFL. Its `FRONT_ALIGN` (#190) brings that to 88-92%.
  - `PASS_CORNER`'s evidence above was gathered without `FRONT_ALIGN`, so
    its edge rushers start about 1 yd tighter than tracked ones.
  - The cause holds within matched width bins (playbook session). Contact
    timing should be rechecked once `FRONT_ALIGN` is in this profile.

## The vertical set (`PASS_KICK`, on in the profile) and `FRONT_ALIGN`

Question: after `PASS_CORNER`, pressure stayed at 41% (4 games, seeds
301-304; NFL 30.5%). The playbook session's decomposition
(`docs/reviews/pressure-and-run-hole.md` on claude/great-mccarthy-85uf8b)
puts the whole excess on edge rushers who are engaged first. Tracked edge
pressurers are still on the tackle 73% of the time; ours had come free 76%
of the time after 0.4 s of contact (NFL 1.1 s). How does the rep end?

**Measure.** `scripts/diag/pass/tackle-kick.py`: the tackle and the edge
rusher outside him on each dropback, from the snap. Same code for tracking
and exports. Medians:

| s after snap | Tackle depth, NFL / before / `PASS_KICK` | Rusher past the tackle (yd), NFL / before / `PASS_KICK` | Tackle width, NFL / before / `PASS_KICK` |
|---|---|---|---|
| 0.5 | 1.34 / 0.93 / 1.47 | -1.87 / -1.37 / -1.89 | 3.29 / 3.46 / 3.41 |
| 1.0 | 2.17 / 1.42 / 2.29 | -1.30 / -0.45 / -1.11 | 3.62 / 3.84 / 3.92 |
| 1.5 | 3.42 / 2.57 / 3.59 | -0.77 / +0.08 / -0.51 | 3.73 / 4.24 / 4.37 |
| 2.0 | 4.72 / 4.12 / 5.25 | -0.54 / +0.77 / -0.40 | 3.41 / 4.61 / 4.58 |

"Before" is 2 games and `PASS_KICK` 4 games, both seeds from 301. Tracked
tackles go nearly straight back and keep the rusher about half a yard
shallower than themselves for the whole rep. Ours were shallow and wide, and
the rusher was level with them by 1.5 s.

**Cause, before contact.** `cutOffPoint` aims at the rusher's projected arc.
At the snap his velocity is near zero, so the arc's heading defaulted to the
QB's direction and counted as a turned corner. The meeting point lay at the
line: the tackle was asked to step forward and run laterally (traced
requests: 0 back, 6 yd/s out). He was still moving outward when the rusher
turned inside (the playbook session measured +1.25 yd/s outward at contact
on free reps).

**Cause, in the rep.** `stepPassRep`'s kick stops at the set spot (2.8 yd
short of the QB). The rusher keeps going upfield, reaches the tackle's hip
(`|phi| >= 1`) and the rep ends ("turned the corner"). At those sheds the
tackle stood 4.7 yd deep and the rusher 5.4. Tracked tackles are 5.7 yd
deep at 2.5 s.

**Change.** `PASS_KICK` (default off; on in this branch's profile):
- Before contact (`blocking.ts`), against an edge rusher, the tackle sets
  vertically instead of cutting off the arc. He stays deeper than where the
  rusher will be 0.4 s from now (0.8 yd), on his inside shoulder. He never
  takes ground back toward the line and never passes the launch point. The
  beaten-to-the-corner chase is unchanged.
- In the rep (`engagement.ts`), against an outside rusher, he keeps kicking
  with him: level with him or 0.3 yd deeper, short of the launch point. He
  matches the rusher's upfield speed as well as closing the gap. Closing
  alone (gap / 0.55 s) trailed a moving rusher.
- Nothing about the rusher changes. He can still win the corner, counter
  inside or bull.

Edge contact (`scripts/diag/pass-contact.py`, s after the line starts):

| | Contact | Rusher depth at contact | Tackle retreat at contact |
|---|---|---|---|
| NFL | 1.25 s | 3.4 yd | 2.8 yd |
| Before | 1.06 | 0.8 | 0.3 |
| `FRONT_ALIGN` | 0.56 | 0.3 | -0.3 |
| `PASS_KICK` | 1.09 | 3.2 | 2.3 |
| `PASS_KICK` + `FRONT_ALIGN` | 1.10 | 2.7 | 2.0 |

Pass results (4 games each, seeds 301-304; `scripts/mechanics/measure.py`):

| | Pressure | Time to pressure | Time to throw |
|---|---|---|---|
| NFL | 30.5% | 2.71 s | 2.75 s |
| Before | 40.6% | 2.38 | 2.28 |
| `PASS_KICK` | 34.2% | 2.61 | 2.48 |
| `FRONT_ALIGN` | 46.9% | 2.32 | 2.27 |
| `PASS_KICK` + `FRONT_ALIGN` | 36.9% | 2.52 | 2.36 |

Edge rushers whose rep ended at the corner (in-sim probe, 2 games): 103 per
100 dropbacks before, 72 with `PASS_KICK`. Sheds followed by that rusher's
own pressure, hit or sack: 40 -> 21.

**`FRONT_ALIGN`** (def-alignment session's port, PR #195, merged here and on
in the profile) puts edge rushers at tracked widths. Against the arc
cut-off it made contact earlier and at the line, with the tackle stepping up,
and raised pressure 41 -> 47%. Against the vertical set its contact timing
and depth match the no-alignment arm. That was the recheck the edge-width
caveat above asked for.

A ride before the vertical set did nothing: edge sheds were unchanged and
interior sheds rose (the run-defense session found the same with a
phi >= 1.5 threshold). The rep was lost before the hip, not at it. With the
set fixed, it acts; see `PASS_RIDE` below.

Contract: `test/pass-kick.test.ts`. On the three recorded dropbacks
(`pass-cutoff-inputs` fixture) the left tackle never steps toward the line
before contact and is deeper at 1.0 s than with the cut-off.
`pass-corner`, `pass-cutoff-approach`, `qb-rusher-recording` and
`redirect-protection` are recorded under the cut-off and pin `PASS_KICK`
off.

**Still open.**
- Pressure is 34-37% vs 30.5%.
- After 1.5 s our rushers run deeper upfield and wider than tracked ones
  (rusher depth 4.8 vs 3.6 yd at 2.0 s, width 4.4 vs 3.6). The tackle
  follows them, so he ends up deeper than tracked tackles. This is the rush
  plan's arc, the run-defense session's side.
- Unblocked edges (playbook session: never engaged 5.0 per 100 vs 1.1) are
  rare by the engine's own engagements: 4 such events in 163 dropbacks,
  mostly late nickel hits. The proximity definition counts reps that the
  engine starts and ends within a frame or two.

## The ride (`PASS_RIDE`, on in the profile)

With `PASS_KICK` the tackle meets the rusher where tracked tackles do, but
edge pressurers still came free after 0.6 s engaged (NFL 1.1). The rep ended
the moment the rusher reached the tackle's hip (`stepPassRep`, `|phi| >= 1`,
"turned the corner").

`PASS_RIDE` (`engagement.ts`): a rusher at the hip is not free while the
blocker's hands are still on him (control not lost, no landed finesse move)
and his body is not past the blocker's toward the QB (by half their combined
radius). The blocker opens his hips and runs with him on his inside hip,
hands pushing him past the launch point. The rusher still flattens through
that, and wins by his hands or his feet.

In-sim count, 2 games, `PASS_KICK` on: corner sheds 69 -> 50 per 100
dropbacks (edge), 21.5 -> 15.0 (interior).

Pressure (playbook session's `pass-pressure.py`, dropbacks without play
action, 4 games, seeds 301-304, `PASS_KICK` + `FRONT_ALIGN`):

| | Without | `PASS_RIDE` | NFL |
|---|---|---|---|
| Pressured | 32.8% | 26.2% | 31.3% |
| Edge engaged, per 100 dropbacks | 25.3 | 18.1 | 16.9 |
| Interior engaged, per 100 | 4.3 | 5.9 | 8.7 |
| Engaged edge reps free before the window ends | 26.1% | 23.3% | 15.4% |
| Edge pressurers still on the blocker | 19% | 10% | 73% |

- Correction: the 4-game pressure change is mostly noise. On 8 games, the
  run-defense session measured 23.5% with `PASS_KICK` alone and the playbook
  session 24.0% with `PASS_KICK` + `PASS_RIDE` (same operator). The ride's
  evidence is the mechanism: corner sheds 69 -> 50 per 100 dropbacks on
  matched seeds.
- For: the edge share moves to the tracked one.
- Against: edge pressurers still arrive free rather than ridden (the
  operator's "still on the blocker" is position-based: a ridden rusher who
  reaches the QB beside the tackle counts as engaged only within 1 yd).
- Interior pressure is low. Interior pressurers take 1.4-1.9 s from contact
  to free (NFL 1.4): the rusher side.

Contract: `test/pass-ride.test.ts`. On the three recorded dropbacks, reps at
the hip occur only with the ride, and corner sheds do not increase.
`redirect-protection` stages a rusher who turns the corner and pins it off.

## Tried: the protection back reads before moving (`BACK_READ`, reverted)

Tracked backs who stay in on dropbacks barely move early: 0.14 yd by 0.5 s
(none forward) and 1.1 yd by 1.0 s (0.4 forward). Ours ran 0.8 yd forward by
0.5 s toward a set point 1.2 yd in front of the QB's snap spot, then braked
to a stop. Their peak deceleration came in the first second on 126 of 243
pass-play backs, against 14 of 2,385 tracked (`out/rbdisp.py`-style probe,
mechanics export).

`BACK_READ` held an unassigned back at his alignment depth (giving ground
only with the QB's drop) at half speed. His motion matched: 0.5 yd by 0.5 s,
none forward. But pressure rose 26.2 -> 38.0% (4 games, seeds 301-304),
nearly all in shotgun (29 -> 39%). The early step-up was standing in the
rushers' paths. Holding him without the read-then-step-up pickup tracked
backs make (0.4 yd forward by 1.0 s, 1.1 by 1.5 s) loses protection. That
pickup timing is the change to make, not the hold alone. Reverted.

Second version: hold until the QB's drop (as the back sees it) has taken the
launch point behind him, then step up to the pickup spot at a jog. Motion:
none forward by 1.0 s, 0.6 yd forward by 1.5 s (tracked 0.4 and 1.1).
Pressure 26.2 -> 32.4% (NFL 31.3), but pressure by off-ball rushers doubled
(2.3 -> 4.6 per 100 dropbacks; tracked 2.75): the later back meets blitzers
nearer the QB. Mixed, and the remaining choice (when he steps up) would be
tuned rather than read. Reverted. It belongs with the coordinated protection
work (rusher moves, protection duration).

## The QB's drop settles (`QB_SETTLE`, off) and what it exposes

Tracked QBs peak at the same drop speed as ours (2.75 yd/s) but stop at 2.8
yd/s^2 (median of each dropback's largest deceleration before the throw).
Ours stopped at 5.0: the drop asked for the generic arrival at 0.8 of
maximum braking, then the set phase stopped him. `QB_SETTLE` (`qb.ts`) plans
the drop's last steps at 2.5 yd/s^2.

4 games, seeds 301-304, profile with `PASS_RIDE` (`r1` vs `q1`):

| | Before | `QB_SETTLE` | NFL |
|---|---|---|---|
| QB largest deceleration (all plays) | 3.75 | 2.98 | 3.03 |
| Time to throw | 2.38 s | 2.53 s | 2.75 s |
| Pressure (2 yd before the throw) | 31.7% | 41.3% | 30.5% |
| Time to pressure | 2.43 s | 2.44 s | 2.71 s |

The QB now holds the ball as long as tracked QBs nearly do, and pressure
rises because protection breaks down about 0.3 s sooner than tracked
protection (time to pressure 2.44 vs 2.71). The pass profile's NFL-like
pressure total partly rested on quick throws. Off until protection
duration is understood (interior rush, the post-contact rep).
`test/qb-settle.test.ts`: on the three recorded dropbacks the QB's largest
deceleration before the throw is lower.

## Tried: the QB slides away from a level edge (`QB_SLIDE`, reverted)

The playbook session's `qb-pocket.py` (section 8 of its
`pressure-and-run-hole.md`): after an edge rusher gets level with the QB,
tracked QBs slide 0.2 / 0.5 / 2.6 yd (p50/75/90) before the throw; ours 0.0
/ 0.0 / 0.2. Climbing after edge level is already NFL-like (0.3+ yd: 27-29%
vs 20%).

`QB_SLIDE` moved the pocket spot away from a level edge until he had 3 yd of
width (scaled by pocket presence): slide 0.0 / 0.1 / 0.4. A level edge is
usually 3-4 yd wide already and the throw follows within about 0.3 s, so a
fixed width barely moves him; picking the width to match the tracked slide
would be tuning. Reverted. Note on arm noise: at about 200 dropbacks a 4-game
arm's pressure moves by several points between runs that change nothing
relevant (26-34% on this profile).

## Edge pressures come after a clean beat (two attempts, both off)

`pass-pressure.py` on today's profile (8 games, seed 301) against tracking:
edge engaged pressures 23.3 per 100 dropbacks (NFL 16.9) at 2.09 s (2.39);
the edge pressurer is still engaged at pressure 14% of the time (NFL 73%) and
has gone through his blocker 68% (11%), 0.6 s after contact (1.1 s). Pass
reps end "turned the corner" 63 times per 100 dropbacks (`out/rideprobe.ts`),
the rusher 0.54 yd nearer the QB than his blocker.

- `RIDE_FACING` (with `PASS_RIDE`): the ride frees the rusher only when the
  hands come off or he is behind the blocker's shoulders (the run rep's
  facing test), not once he is 0.4 yd nearer the QB. Corner sheds 63 -> 27
  per 100 dropbacks; edge pressure 23.3 -> 19.6, interior 6.7 -> 7.8, the
  interior pressurer still engaged 66% (NFL 67%). Edge still through 55%.
- What then frees the ride: `e.control < -0.3` in 102 of 129 frees, the pass
  rep's ratings walk. `PASS_HAND_FIGHT` takes pass control from the run rep's
  leverage law; frees are then mostly landed moves (dip 51 of 80). Edge
  pressure 22.6 per 100, through 53%, still engaged 17%.

Both are within 8-game noise on pressure and neither moves the edge
pressurer's state. Stopped for re-diagnosis: the next question is what the
QB's depth and the rusher's arc are when tracked edges pressure while still
engaged. `HAND_FRICTION` on this profile raises edge pressure further (23.3
-> 29.1 per 100), the wrong way.
