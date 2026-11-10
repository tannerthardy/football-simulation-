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
