# Engaged-block drills (2026-11-03)

These drills put two players on an empty field: a centre (144 kg) and one defender. Every other body is parked 50 yd away and the carrier is held somewhere fixed. Engagement is real (`sim.engage`), so `stepRunRep` runs.

Tools are in `tools/ts`:
- `_drill.mts`: the harness.
- `_drill1`: ball position and defender size.
- `_drill2`: raw hand-joined physics with no engagement layer.
- `_drill3`: wall push.

## How an engaged run rep works now (`engagement.ts` `stepRunRep`, ~420 lines plus `runContactRead`, ~170)

While engaged, the engagement layer **rewrites both players' intents every tick**. Neither controller drives his body.

**The blocker:**
- forward = 2.4 yd/s along `e.drive` whenever the man is ahead of him;
- plus a lateral seal: the mirror of the man's lateral velocity, a feel term, and an offset correction toward `sealTarget`, capped at roughly shuffle speed;
- stretch, anchor and seal-hold branches.

**The defender:**
- First-level interior and edge fits use the stack-read path: depth, flow, squeeze, work-across, fight pressure.
- Everyone else, including **box LBs (`insert`) and unassigned men**, uses the legacy path: `vel = -drive·1.5 + lat·side·work`, with `work = lateral·(0.2+0.25·shed)·(reading ? 1 : 0.3)`.
- While "shedding", the request is an across-the-face work-off at full lateral speed.

**Sheds** are physical exits under `SHED_PHYSICAL`, with `beat()` on leverage or support loss.

## Findings

**D0. No reason to move.** Head-up, ball 12 yd away.
- The pair still moves 0.9 yd downfield and 0.55 yd sideways in 1 s, still accelerating (1.46 yd/s at 1 s).
- Blocker requests (2.40, −0.85…−1.55). LB requests (−1.50, −1.73), the legacy work.

**D1. Ball location is irrelevant** for an unread or insert LB. Ball directly behind the C and ball 12 yd wide give identical results. The sideways direction comes from the gap or the engagement side, not the ball.

**D2. Raw physics** (hand joint only, no engagement layer) **is sensible.** Mass and strength decide the result:

| C vs | Pair forward in 1 s (both push) |
|---|---|
| CB (94 kg) | +1.16 (at the blocker's 2.4 yd/s cap) |
| LB (108 kg) | +0.90 |
| DE (113 kg) | +0.52 |
| DT (151 kg) | −0.15 |

A bracing blocker is not moved by a defender pushing at 1.5 yd/s.

**D3. Wall push from head-up separates the pair.** The C goes +0.72 one way and the LB −0.72 the other; at 2 yd/s the engagement ends. You can only push a man away from the ball from his ball-side shoulder. This is coherent football.

**Frame correction** (`lbfit4.py`, develop + branch, stream 0). Measured in the **play-side frame**, NFL OZ blocked pairs flow with the play at about 3 yd/s. Ours flow at half that, and our runner ends up outside the LB 75% of the time vs 50%. Power and counter pairs barely flow, or flow backside.

| 1 s after contact | NFL blocker | NFL LB | Our blocker | Our LB | Carrier outside the LB (NFL / ours) |
|---|---|---|---|---|---|
| IZ | +0.89 | +0.63 | +0.72 | +0.77 | 42% / 56% |
| OZ | +2.98 | +3.01 | +1.57 | +1.92 | 50% / 75% |
| Power | +0.40 | +0.39 | −0.31 | −0.97 | 45% / 26% |
| Counter | +0.64 | +0.70 | −0.01 | +0.09 | 47% / 40% |

The earlier "drift toward the carrier" (`lbfit3`, W1–W4, Defense's relay) was a **frame artefact**: it is measured relative to where our runner goes. The real gap is the opposite. Engaged pairs flow too slowly, because the engaged LB's lateral request is capped by the legacy `work` term (about 1.7 yd/s) and the blocker's mirror by shuffle speed. NFL engaged OZ pairs travel about 3 yd/s.

## Next drills (ladder)

1. **Lateral race.** Climber and LB both moving playside at 3 yd/s at contact. What pair speed does the engagement allow? Expected: about 3, like NFL.
2. **Engaged LB with a real read and assignment** (stack-read path vs legacy).
3. **Rip/dip** off a squeezing DL hip (pressed release).
