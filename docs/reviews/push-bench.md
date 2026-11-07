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

## What these scenes show

These are 14 constructed scenes. Each has fixed requests, hands frozen at
control 0, and lasts 1.0 s. They test whether the push law behaves
consistently in those scenes. They do not isolate the cause of the NFL–sim
gap, and they do not rule out differences in contact, capacity or model.

- **In these scenes, a matched pair both driving is a stalemate.** Asking for
  more speed changes nothing, because with `push: 1` both are at their leg
  limit.
- **What should win, wins.** Lower pads, strength, a defender who sits rather
  than presses, and a square double team each move the pair 0.2–0.4 yd in the
  1.0 s scene.
  - Any rate beyond 1.0 s is an extrapolation and is not measured. That
    includes whether a double team keeps its push long enough to make the
    NFL's "driven back 0.5 yd" event.
- **In these scenes, a matched pair is never pushed back.** That holds with
  the blocker on the shoulder and driving too: pushing along the contact
  normal from the shoulder spends part of the push sideways. In these scenes,
  pushing a defender back took a mismatch (pads, strength, a sitting
  defender) or a double team.
  - Run Game tried a shoulder-holding reach blocker driving at pace in game.
    OZ went −0.92 yd and DL depth was unchanged, which is consistent with this.
  - Whether our OL/DL strength, pad and mass spread per snap is as wide as
    the NFL's has not been checked.
- **Lateral demand costs vertical.** Legs that push sideways do not also push
  forward. A blocker asking 3–4 yd/s across loses 0.2–0.3 yd of vertical to a
  pressing DL in the 1.0 s scene.
  - It also takes most of a double team's drive: +0.38 falls to +0.10 yd.

Run Game measured engaged OZ solo pairs with the OL asking 3.0–4.2 yd/s
across and both asking about 1 yd/s into each other. In those, the DL keeps
gaining 0.3–0.6 yd/s, which is consistent with these scenes.

## Reading (limits)

In these scenes, the push law behaves consistently: what should win does, and
the costs follow from the leg budget. That makes **request selection a
supported candidate for investigation**. It is not shown to be the only cause
of the NFL gap.

- **OL request (Run Game).** The NFL OZ DL depth plateaus after 1.5 s; ours
  keeps growing.
  - One candidate: the reach blocker still asks about 3 yd/s sideways once
    level with his man (Run Game's measurement).
  - In these scenes, lateral demand costs vertical.
- **DL and double teams (Defense).** A square double team displaced a
  pressing matched DL by 0.38 yd in 1.0 s.
  - How often a square double team happens in games may matter more than the
    law. That is a hypothesis, not tested here.
- **Not excluded:** contact geometry beyond these fixed scenes, live hand
  fighting, capacity spread, and model differences.

## Reproduce

The bench reads no captures. Its settings are the `flags` of
`config/baseline.json` at develop `9a19ced9`, nulls dropped. Their sha256 is
`54199f265835db49668516501399b59dd4c29ce3b4d43ac28e2bde09d7ae9d6c`, the same
as the settings file used in the other reviews.

```sh
git show 9a19ced9:config/baseline.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const f=JSON.parse(s).flags;process.stdout.write(Object.entries(f).filter(([k,v])=>v!==null).map(([k,v])=>k+"="+v).join(" ")+"\n")})' > restage-env.txt
env $(cat restage-env.txt) node --import tsx scripts/diag/_pushbench.mts
```
