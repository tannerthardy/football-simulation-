# Push bench: who wins the vertical in a run block

Main Engine, 2026-11-06. Develop `9a19ced9`, restage environment `54199f26`.
No engine change.

## Question

Defense and Run Game both measured DL who are rarely driven back.

| | NFL | Sim |
|---|---|---|
| DL driven back ≥ 0.5 yd at 2.0 s, OZ | 13–15% | 1–7% |
| DL driven back ≥ 0.5 yd at 2.0 s, IZ | 15–18% | 9% |
| OZ front DL depth at 1.0 / 1.5 / 2.0 s | +0.59 / +0.84 / +0.84 (plateaus) | +0.79 / +1.00 / +1.19 |

The question is whether the push law lets a set blocker or a double team
displace a DL who presses into it, or whether the gap is in the requests.

## Bench

`scripts/diag/_pushbench.mts` uses the World only, with no controllers.
- A centre and a DT start head-up in latched hands, with control 0 and the
  shared hand law frozen.
- Each requests a fixed velocity into the other with `push: 1` for 1.0 s,
  posture 0.85 unless noted.
- "Matched" gives the DT the centre's derived profile (144 kg, strength 97).

| Case | Blocker gains | Defender gains | Pair moves toward the defender's side |
|---|---|---|---|
| Matched, both 1 yd/s into each other | 0.09 | 0.09 | 0.00 |
| Blocker also asks 3.0 yd/s sideways | 0.29 | 0.71 | −0.21 |
| Blocker also asks 4.2 yd/s sideways | 0.19 | 0.73 | −0.27 |
| Blocker asks 2 yd/s, defender 1 | 0.09 | 0.08 | 0.00 |
| Blocker's pads lower (posture 1.0 vs 0.6) | 0.31 | −0.13 | +0.22 |
| Blocker's pads higher | −0.13 | 0.31 | −0.22 |
| Blocker strength 40 | −0.11 | 0.28 | −0.20 |
| Blocker strength 40, defender anchors (asks 0) | 0.33 | −0.16 | +0.24 |
| Matched, defender anchors | 0.45 | −0.28 | +0.36 |
| Blocker on the shoulder (0.4 yd offset), driving 1 yd/s along the contact normal | 0.04 | 0.15 | −0.06 |
| Shoulder, defender presses 1.5 yd/s | 0.05 | 0.19 | −0.07 |
| Head-up, defender presses 1.5 yd/s | 0.08 | 0.09 | 0.00 |
| Double team, second blocker on his hip | 0.44 | −0.33 | +0.38 |
| Double team, first blocker asks 3.0 sideways | 0.37 | 0.16 | +0.10 |

Yards in 1.0 s. The first 0.09 is closing the 0.1 yd start gap.

## What the law says

- **A matched pair both driving is a stalemate.** Asking for more speed
  changes nothing, because with `push: 1` both are at their leg limit.
- **The things that should win, win, at 0.2–0.4 yd/s:** lower pads,
  strength, a defender who sits rather than presses, and a square double
  team. At 0.38 yd/s, a sustained double team moves a matched DL past 0.5
  yd in about 1.3 s. That is the NFL's "driven back" event.
- **A matched pair never produces a push-back.** That holds even with the
  blocker on the shoulder and driving: pushing along the contact normal from
  the shoulder spends part of the push sideways. A defender driven back needs
  a mismatch (pads, strength, a sitting defender) or a double team.
  - Run Game tried a shoulder-holding reach blocker driving at pace in game.
    OZ went −0.92 yd and DL depth was unchanged, which matches this.
  - Whether our OL/DL strength, pad and mass spread per snap is as wide as
    the NFL's has not been checked.
- **Lateral demand costs vertical.** Legs that push sideways do not also
  push forward, so a reach blocker asking 3–4 yd/s across loses 0.2–0.3
  yd/s of vertical to a pressing DL.
  - It also takes most of a double team's drive: +0.38 falls to +0.10.

Run Game measured engaged OZ solo pairs with the OL asking 3.0–4.2 yd/s
across and both asking about 1 yd/s into each other. In those, the DL keeps
gaining 0.3–0.6 yd/s. That is what this law predicts for those requests.

## Conclusion

The push law is coherent: what should win does, and the costs are
physical. The gap with the NFL is in the requests.
- **OL (Run Game).** The NFL OZ DL depth plateaus after 1.5 s; ours keeps
  growing.
  - One candidate: the reach blocker still asks about 3 yd/s sideways once
    level with his man (Run Game's measurement).
  - A blocker who has reached the shoulder and keeps running sideways
    spends the legs he needs to stop the press. The NFL plateau is what
    turning back upfield would look like. That is his controller's
    decision.
- **DL (Defense).** A DL who keeps pressing into a set double team is
  displaced at about 0.38 yd/s. One who sits down is displaced at a similar
  rate in a solo rep.
  - So the IZ shortfall is more likely how often a square double team
    happens than the law itself.

## Reproduce

```sh
env $(cat restage-env.txt) node --import tsx scripts/diag/_pushbench.mts
```
