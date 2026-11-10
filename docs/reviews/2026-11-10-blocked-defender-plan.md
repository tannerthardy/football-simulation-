# Blocked defenders beside the runner: plan (Flex, 2026-11-10)

Status: plan only. No code. Piece 2 is the parked grip-break question and needs Tanner's go-ahead before
any code.

## The gap

At the runner's first contact on zone runs, a second defender is within 1.0 yd by +0.5 s on 57% of NFL runs and 39% of
ours (`secondman.py`, same code on both). Free defenders within 2 yd arrive as often as the NFL's (70% against 65%). The
gap is blocked defenders within 2 yd:

| Blocked defenders within 2 yd | NFL | Ours |
|---|---|---|
| Arrive within 1.0 yd by +0.5 s | 46% | 26% |

In the NFL, blocked defenders make 54–60% of first contacts (`hitblk`). Getting off a block, or reaching from one, is the
norm.

`held-split.mts` (run-ref-11, 310 men) splits ours into three groups:

| Group | Share | Arrive | Attempt a tackle | What stops them |
|---|---|---|---|---|
| Engaged throughout the 0.5 s | 51% | 23% | 14% | the blocker (below) |
| Engagement ends (median 0.30 s) | 13% | 10% | 10% | released too late for the window |
| Beside an offensive body, no engagement | 36% | 34% | 41% | torso contacts (−1.04 yd/s); a tackle decision |

The unengaged third has gone to Defense: they are in range on 87% of ticks, but 41% attempt. `CONTACT_LAYER` raises their
arrivals from 34% to 47%; that goes into the layer's record.

This plan is about the engaged half. The defender's legs drive +1.64 yd/s toward the runner over 0.5 s; the hands row
takes −0.97, torso contact −0.47, and the net is +0.27. Three things a real defender in that spot can do are missing or
limited. They separate into three pieces.

## Piece 1: the engaged defender's reach (a correction to an existing rule)

- **The physical question.** A blocked man has one arm, and sometimes two, not controlled by the blocker. How far can
  he reach the runner, given where the blocker's hands are and which shoulder is free?
- **Today.** `tryTackles` (`tackle.ts`) gives an engaged defender `0.4 × reach` without a free side, and
  `0.7 − 0.3 × control` of reach with one. The free side is the blocker's lateral offset (≥ 0.25 yd, on the far side from
  the runner).
  - These men are eligible on 64% of ticks but in range on only 17%.
  - Half of them are 1–2 yd from the runner, beyond any 0.4-arm range.
- **Candidate law.** Replace the constants with geometry the engine already holds:
  - the free arm is the shoulder away from the blocker's hands, from the hands row's patch point and control side;
  - its reach is the arm's length from that shoulder, minus what the blocker's control removes, as `GRIP_REACH` does
    for where hands land.
  - No new constant: arm length and shoulder width come from the profile.
- **Bench.** A fixed engaged pair with the runner passing at 0.5–2.0 yd on each side.
  - Measure the reach distance against the blocker's hand position and control.
  - With the blocker's hands inside, the defender's near-side reach should fall toward zero. With the free shoulder
    toward the runner, it should approach a full arm.
- **Gates.**
  - Blocked second-man arrival and first contacts by blocked defenders (hitblk: NFL blocked 54–60% of first contacts).
  - Broken and missed tackles, since one-arm holds slip more.
  - Stuffs and yards on the fixed runs.
  - Unchanged: pass protection, where an engaged rusher's reach for the QB uses the same rule.
- **Costs.** More one-arm grabs from blocks means more broken holds. Those are physics, and that cost is correct.
- **Owner.** Physics (Flex) for the geometry; Defense for when he chooses to reach. The reach rule already lives in the
  tackle decision.
- **Approval.** A rule correction like `GRIP_REACH`, so it can go first behind an off flag.

## Piece 2: ending the engagement when the ball arrives beside it (a new two-sided mechanism; parked)

- **The physical question.** A defender who comes off his block toward the runner breaks the blocker's hands, or steps
  laterally past their reach. Which is it, and what does it cost him?
- **Today.** Nothing ends an engagement because the runner is beside it. Engagements end on:
  - a body down;
  - separation;
  - a shed (`beat`, rule-based);
  - "runner passed defender", which needs the runner 2.5 yd past him.
- **Measured.** The median engaged man has win 0.51 and control +0.51 at contact (the blocker's hands inside); 41% are
  at win ≥ 0.6.
- **Candidate.** Two halves:
  - **Decision (Defense).** He chooses to come off the block toward the ball when he sees the runner within reach. He
    gives up his gap and his leverage: if the runner cuts back he is out of position, and the blocker can pin or wash
    him as he turns.
  - **Mechanism (Flex).** Disengaging is a hand strike against the blocker's grip capacity: the grip-break proper. The
    alternative is a lateral step past the hands' reach, on the free side and with the hands outside.
  - Either way the World decides whether he gets off. No timer, and no rule that ends the rep for him.
- **Bench.**
  - An engaged pair, blocker hands inside or outside, the defender striking with his free arm while stepping toward a
    runner 1 yd away.
  - Time to break the grip against the blocker's grip capacity and strength, and the defender's position after.
  - Mirrored with the runner on the blocker's side.
- **Gates.**
  - Second-man arrival (23% against the NFL's ~46%).
  - Trench solo-pair rotation (56–59° against 43°) and DL depth at 2.0 s (+0.69 against +0.70).
  - Pressure timing on the pass grid (median 2.50 s against 2.7 s), since rushers also come off blocks.
  - Cutback yards, since a defender who comes off early is out of position.
  - Stuffs and yards.
- **Costs.**
  - More early disengages could empty gaps on cutbacks; that is real football and should show up as cutback yards.
  - The same mechanism changes pass rush.
- **Owner.** Defense (decision) and Flex (grip mechanism).
- **Approval.** Tanner's go-ahead before any code. This table is the evidence for it.

## Piece 3: dragging the blocker (checked: no correction needed)

- **The physical question.** Is the hands row's −0.97 yd/s the blocker driving him away, or a weld that holds their
  relative position regardless of strength?
- **Measured** (`held-split.mts`, the engaged-throughout group, split by the blocker's request toward the runner):

| Blocker's request toward the runner | Men | Defender's ground | Hands on him | Blocker's ground | Pair velocity toward the runner | Defender's velocity relative to the blocker |
|---|---|---|---|---|---|---|
| Away (< −0.5) | 65 | +3.00 | −2.04 | −1.79 | −1.22 | +0.35 |
| Still | 31 | +1.54 | −0.78 | −0.73 | +0.16 | +0.20 |
| Toward (> +0.5) | 63 | +0.28 | +0.02 | +0.24 | +1.67 | +0.08 |

- **Reading.**
  - When the blocker drives him away, the hands transmit a real contest: the blocker's legs win, and the pair moves away
    from the runner.
  - When the blocker goes toward the runner, the pair travels there together at 1.67 yd/s. Dragging works; the
    blocker's body simply stays between them.
  - The hands' −0.97 is the blocker's drive, not a weld.
  - This group arrives 20–29% of the time whatever the blocker does. So what limits it is pieces 1 and 2 (reach and
    getting off), not the hands' coupling.
- **Open question for later.** Whether the blocker should win the leg contest as often as he does (−1.22 yd/s pair
  velocity away) is a strength-matching question for the trench gates. It is not part of this gap.

## Order

1. **Piece 1 (reach), behind an off flag**, with the bench and the gates above. It is the smallest and needs no new
   mechanism.
2. **Piece 2, once Tanner approves:** Defense's decision and the grip-break mechanism together, judged on the same gates.
3. **Re-measure after both:** second-man arrival, hitblk's share of first contacts by blocked defenders, and the
   unengaged third after Defense's attempt fix.

## Piece 1: result (`ENGAGED_REACH`, off; `reach-bench.mts`; `held-split.mts`)

The flag stays off. Piece 1's premise was wrong.

**The rule is not what limits these men.** A DT's reach is 1.05 yd: a 0.25 yd shoulder offset plus a 0.80 yd arm. From
the free shoulder, the full arm covers a carrier whose centre is at most about 1.3 yd from his. So most blocked men 1–2 yd
from the runner are out of reach by anatomy, not by the rule's 0.4.

**Bench.** DT facing his blocker, carrier beside the pair; margin = arms − centre distance (yd), + = in range.

| Carrier | Old rule | Free-shoulder arm, control 0 | Control 0.5 | Control 1 |
|---|---|---|---|---|
| 1.0 yd, free side | +0.36 | +0.31 | −0.08 | −0.48 |
| 1.0 yd, blocker's side | +0.05 | −0.19 | −0.58 | −0.98 |
| 1.5 yd, free side | −0.14 | −0.19 | −0.58 | −0.98 |
| 2.0 yd, either side | −0.95 | −1.19 | −1.58 | −1.98 |

- A well-blocked man cannot reach: control 1 takes the whole arm.
- At the median control of 0.5, the geometric arm is shorter than the old rule on both sides.

**Game** (`held-split.mts`, engaged throughout the 0.5 s, run-ref-11):

| | Off | On |
|---|---|---|
| Attempts | 14% | 8% |
| Arrivals | 23% | 22% |

The engaged men reach less and arrive no more. Piece 1 does not close the gap; the men have to move, which is piece 2.
`ENGAGED_REACH` stays off as a tested description: it is the right answer to "can a well-blocked man tackle" (no), not to
the second man.

## The engaged leg contest, and what the NFL's blocked men do (2026-11-10)

Integration asked whether the contest in an engaged pair is too one-sided: whether the blocker wins it too often, or the
hands add force.

**Mirror bench** (`contest-mirror.mts`, equal bodies in a run engagement, 1.0 s):
- The man who drives moves the pair 0.35 yd whichever side he is on, with the ground at 0.86–0.91 of traction.
- Equal drives give 0.00.
- The hands row is internal (pair momentum is exact), so it cannot add force that neither man's feet supply.
- The outcome follows the bodies and their requests, not the labels.

**NFL against ours** (`secondman.py`, same code; blocked defenders within 2 yd of the runner at his first contact):

| | NFL | run-ref-11 |
|---|---|---|
| Blocked men within 2 yd (per run) | 0.80 | 0.58 |
| …within 1.25 yd | 0.19 | 0.07 |
| Still blocked through +0.5 s | 85% | 88% |
| Their velocity toward the runner, mean over 0.5 s | +0.29 yd/s | +0.24 yd/s |
| The runner's velocity toward them | −0.41 | −0.27 |
| Arrive within 1.0 yd by +0.5 s, starting at 1.25–1.5 yd | 49% | 34% |
| …starting at 1.5–1.75 yd | 34% | 26% |
| …starting at 1.75–2.0 yd | 28% | 10% |

**This changes the case for piece 2.**
- NFL blocked men beside the runner also stay blocked (85%), and they move toward him no faster than ours.
- The contest is not one-sided, and getting off the block is not what the NFL's do more of.

**The gap has two parts:**
- **Fewer blocked bodies near the runner.** We have 0.58 per run within 2 yd against 0.80, and 0.07 against 0.19 within
  1.25 yd. The run's crowd near the ball is thinner: a question of where first contact happens and of blocking geometry.
- **At equal starting distance, more NFL arrivals despite similar mean closing.** The spread, the shoulder-pad tracking
  points (which sit inside the body outline in a crowd and jitter by about 0.1 yd a frame) or a tail of men who do close
  could all produce that. It needs a per-man distribution, not a mean, before it is read as football.

**Piece 2 should wait for that check.** The "blocked men get off and close" reading came from our engaged men's request
(+1.7 yd/s) being cancelled. But the NFL's blocked men do not close faster than ours either, so a mechanism that lets ours
get off may overshoot. Piece 2's evidence is now:
- **For:** our engaged men cannot reach and cannot end the rep.
- **Against:** the NFL's blocked men do not, on average, come off toward the runner either.

## (b) is not measurement, and it is the runner (2026-11-10, later)

**Not jitter.**
- NFL positions are smooth: a position's deviation from the midpoint of its neighbouring frames is 0.011 yd at p50 and
  0.025 at p90.
- Blocked men starting 1.25 yd or more away whose distance changes by under 0.15 yd almost never "arrive": 8%, 1% and 0%.
- So noise does not make NFL arrivals.

**The distances genuinely shrink more in the NFL.** Over 0.5 s, the median change is −0.25 to −0.41 yd against our −0.13
to −0.17.

**Who closes,** along the line between them at contact over 0.5 s (blocked men within 2 yd):

| Median (p75), yd | NFL | run-ref-11 |
|---|---|---|
| Defender toward the runner | +0.09 (+0.69) | +0.19 (+0.77) |
| Runner toward the defender | +0.61 (+1.26) | +0.29 (+0.89) |
| …among men who arrive | +0.99 | +0.69 |

- The NFL's arrivals come from the runner carrying on into the blocked men after the first hit, not from the blocked
  men coming off.
- The per-frame "runner's velocity toward him" above was negative because the line rotates as the runner passes. The
  fixed-line split is the measure to use.
- This is the post-contact course gap again: gain after contact 1.85 against 2.84 yd, contact to end 1.0 against 1.5 s.
  Our runner stops sooner and goes less far into the crowd.

**(a) Crowd density** (per run, by concept and depth of first contact):

| Concept | Contact depth (yd) | Runs, NFL / ours | Blocked within 1.25 yd | Blocked within 2 yd | Second man |
|---|---|---|---|---|---|
| OZ | < −1 | 30% / 22% | 0.10 / 0.06 | 0.46 / 0.44 | 42% / 22% |
| OZ | −1..0 | 19% / 33% | 0.18 / 0.11 | 0.81 / 0.98 | 62% / 44% |
| OZ | 0..2 | 29% / 26% | 0.27 / 0.11 | 1.02 / 0.74 | 68% / 40% |
| IZ | −1..0 | 20% / 18% | 0.16 / 0.00 | 0.93 / 0.26 | 61% / 18% |
| IZ | 0..2 | 41% / 34% | 0.31 / 0.11 | 1.23 / 0.66 | 69% / 35% |

- On OZ the crowd within 2 yd is about the NFL's, but less tightly packed within 1.25 yd.
- On IZ our crowd near the line is far thinner.

**Conclusion for piece 2: it is not needed for the second man.**
- The NFL's blocked men stay blocked and do not come off toward the runner.
- The gap comes from our runner going less far into the crowd after the first hit (the contact course), and from a thinner
  or looser crowd near the ball, especially on IZ (blocking geometry, Run Game).
