# The defense as module D must describe it (Coverage C14, 2026-11-24)

This note answers Integration's request in [the QB decision plan](2026-11-24-qb-decision-plan.md) §6. It gives the
defender-side facts that the passer's three roles (coverer, driver, lane man) depend on, measured on engine-95 (develop
cb163c727, every experimental flag off). It also lists what a defender does that the passer cannot know.

Measured with `scripts/diag/coverage/qb-roles.mts` on Tools' game set: seeds 23–33, odd seeds, 2 games each, 12
games, 1,020 throws. The summary comes from `scripts/diag/coverage/qb_roles_report.py`. Raw rows are in `out/` and are
not committed.

The operator, read with these caveats:
- **Coverer.** The defender nearest the target at the release, judged from true positions (the auditor's view). His
  technique is the behaviour, zone and technique label he returned that tick.
- **Break.** The receiver's last heading change over 30° within 0.4 s, or a stop from over 4 to under 2 yd/s. It
  must start no later than 0.2 s after the release.
- **Response.** For a turn: the time until the coverer's velocity is within 45° of the receiver's new line ("already"
  means he was on it at the break). For a stop: the time until his speed along his own line has halved.
- **Drivers.** Every other defender whose FLIGHT_BREAK began between 0.6 s before the release and the arrival, kept
  only if he was within 2.5 yd of the catch point at the arrival.

These are inferred categories (break, response). Read them as typical values to seed module D's role models and its
calibration test, not as targets.

## 1. The coverer, by technique

Medians. Cushion is positive when the coverer is deeper than the receiver; leverage is positive when he is outside
the receiver (on the sideline side).

| technique at the release (n) | break before release | cushion / leverage / separation at the break (yd) | response p50 / p90 (s); already on the line | separation at release → arrival (yd) | completion |
|---|---|---|---|---|---|
| man, off or press, opening to run (man-open, 149) | 0.65 s | 1.3 / −0.5 / 1.9 | 0.30 / 0.80; 34 of 85 | 1.8 → 1.7 | .54 |
| man, pedal (44) | 0.5 s | 4.0 / −0.6 / 4.2 | 0.30 / 0.55; 5 of 30 | 4.4 → 3.1 | .68 |
| match curl-flat converted to man (carry, 65) | 1.0 s | 3.3 / −0.8 / 4.6 | 0.40 / 0.95; 9 of 41 | 4.1 → 2.0 | .72 |
| match flat seat in man (carry, 50) | 0.85 s | −0.9 / 0.0 / 4.8 | 0.75 / 1.30; 6 of 33 | 5.0 → 4.8 | .74 |
| match deep third in man (carry, 28) | 0.35 s | 5.1 / 1.0 / 5.2 | 0.20 / 0.65; 3 of 21 | 4.2 → 2.3 | .71 |
| match quarters corner in man (carry, 28) | 0.35 s | 5.7 / 0.8 / 5.7 | 0.30 / 0.55; 1 of 16 | 6.1 → 5.8 | .93 |
| hook in the lane (36) | 0.6 s | 2.3 / −0.9 / 2.9 | 0.60 / 1.00; 9 of 32 | 2.9 → 2.0 | .61 |
| hook, other zone play (32) | 0.35 s | 2.6 / −0.8 / 2.8 | 0.50 / 1.10; 4 of 21 | 3.2 → 3.3 | .69 |
| curl-flat in the lane (26) | 0.5 s | 1.6 / −0.6 / 3.2 | 0.55 / 1.00; 4 of 19 | 3.6 → 4.3 | .73 |
| curl-flat widening (18) | 1.05 s | 1.9 / 0.0 / 3.5 | 0.75 / 1.45; 2 of 16 | 4.4 → 4.3 | .61 |
| spot-drop curl-flat, settled (19) | 0.75 s | 4.3 / 1.9 / 5.1 | 0.50 / 1.05; 6 of 14 | 5.7 → 4.9 | .89 |
| deep third carrying (24) | 0.65 s | 4.5 / 0.8 / 4.6 | 0.30 / 0.75; 1 of 22 | 3.7 → 2.7 | .83 |
| quarters carrying (15) | 0.55 s | 5.5 / 0.9 / 5.6 | 0.35 / 0.45; 0 of 13 | 5.3 → 3.0 | .80 |

What each technique does before the break, and what releases him:

- **Man (press or off, opening to run).**
  - Before the break: he runs with the receiver from a small cushion, about 1.3 yd at the break, roughly head-up.
  - What releases him: the receiver's own movement as he sees it (his man's seen velocity).
  - Response: 0.3 s at the median after the break, and in 40% of breaks he is already on the new line. He reacts
    late on comebacks and outs, so the window before the break is real but small.
  - The pedal variant keeps a 4 yd cushion and responds as fast, so a stop in front of him is open by about his
    cushion.
- **Match conversions** (a zone seat that took his man: curl-flat, flat, deep third and quarters seats in man).
  - These are man from a zone alignment. In our engine about half of underneath seat-moments are carries (Flex's
    width trace).
  - The flat seat in man responds slowest: 0.75 s, with a long tail.
  - Deep thirds and quarters keep 5–6 yd of cushion and are 0.2–0.35 s to the new line.
  - The coverer role should be judged by what he is doing, man or zone, as seen from his movement, not by the call.
    See §3.
- **Underneath zone in the lane or settle** (hook, curl-flat).
  - Before the break: he holds depth (cushion 1.6–2.6 yd), inside the receiver by about 0.6–0.9 yd.
  - What releases him: the throw, not the break. His response to the break itself is 0.5–0.75 s and often does not
    happen.
  - A window under or outside him clears before the break and stays open until he breaks on the ball. In that case
    he is a driver (§2) more than a coverer.
- **Deep third, quarters.**
  - Before the break: a 4.5–5.5 yd cushion over the receiver, outside him by about 1 yd.
  - Response to a stop: 0.3 s.
  - A curl or comeback under them is open by the cushion. The body law with his backpedal or turned hips decides
    whether he gets back.
- **Cover 2 squat corner.** Not in this sample: SQUAT_SINK is off on develop. On develop the Cover 2 corner plays
  his flat seat (flat_s / flat_w rows above).

## 2. Drivers: who breaks on the throw from where, and from what cue

FLIGHT_BREAK (engine-94) gives every defender one break on the throw. The cue is his own release belief:
- **'arm':** he saw the passer's delivery. He must have the passer in view: zone eyes, a settled underneath defender,
  a robber.
- **'ball':** he saw the ball in the air. Everyone else, including man defenders with their eyes on their man.

| driver within 2.5 yd at the arrival (per 100 throws) | cue | break start after the release, p10 / p50 / p90 | distance to the catch point at the start, p50 / p90 | at the arrival, p50 |
|---|---|---|---|---|
| hook (2.9) | arm | −0.05 / 0 / 0.15 s | 3.4 / 6.7 | 1.7 |
| hook (1.7) | ball | 0.20 / 0.25 / 0.60 s | 2.4 / 4.3 | 1.8 |
| hook middle (1.4 arm, 0.9 ball) | arm / ball | 0 / 0.25 s | 3.9 / 2.5 | 1.2 |
| curl-flat (0.9) | arm | 0 s | 4.6 / 9.7 | 1.6 |
| robber (0.5) | arm | 0.05 s | 3.1 / 3.9 | 1.7 |
| man defender, not the coverer (2.4) | ball | 0.25 s | 4.0 / 5.0 | 1.6 |
| deep half / middle / third (1.6 / 1.0 / 0.8) | ball | 0.25–0.45 s (p90 0.75–0.9) | 2.0–4.4 / 4.7–5.4 | 1.2–1.7 |

How far a driver can be and still arrive within 2.5 yd, over all breaks (flight median 1.1–1.2 s):

| start distance | arm cue arrives | ball cue arrives |
|---|---|---|
| 0–3 yd | 74% | 84% |
| 3–6 yd | 30% | 15% |
| 6–9 yd | 4% | 1% |
| 9+ yd | ≈ 0 | ≈ 0 |

Points for module D:
- A non-coverer driver ends within 2.5 yd on 13% of throws (133 of 1,020).
- The drivers that matter are the underneath droppers with eyes on the passer (hooks, hook middle, curl-flat,
  robber). They start at the passer's delivery, about 0.25 s before a ball-cued defender, and some reach from 3–6 yd.
- Deep defenders and man defenders start on the ball and only matter from about 3 yd or closer.
- This supports §7.2 of the plan. The start cue is the delivery for a defender whose eyes are on the passer, and the
  ball otherwise. The passer can see which defenders are facing him.
- 351 of 9,183 breaks (3.8%) started before the release: an arm cue on a pump or an early delivery read. Among the
  drivers that arrived, 13 did, nearly all hooks and hook middles.

The lane man: not measured separately here. The ball's arc against an underneath defender's reach is geometry the
passer has. Those defenders are the same droppers as the arm-cued drivers above.

## 3. What a defender does that the passer cannot know from what he sees

Module D should not ask the passer to predict these. It should judge them as a coach teaches the read: by role,
from what he sees.

1. **The call and each defender's assignment.**
   - Whether a seat is zone or man, which pattern-match rule converts it (HALF_KEY, MUSH_MATCH, the match carries)
     and whom a defender carries are internal.
   - The passer sees alignment, then movement. So the coverer is "the defender moving with this receiver in my
     picture", and a converted match seat is a man coverer once he is seen carrying.
   - The 0.75 s flat-seat response above is a hand-off behaviour the passer can only learn from what he sees, not
     from the call.
2. **A defender's release belief and latency.**
   - When a defender believes the ball is out is his own perception: arm or ball cue, his reaction, a pump bite.
   - The passer knows only who is facing him (which defenders can take the arm cue). He knows his own pump, not
     whether it was bought. Use typical values by role from a scouting report: reaction, and the arm-cue lead of
     about 0.25 s.
3. **True ratings.** Reaction, speed and ball skills come from the scouting report (plan §3 D). Never truth.
4. **Where zone defenders look and lean.** Zone eyes, SPOT_LEAN and the hook's lane read follow the passer's seen
   head.
   - The passer knows where he is looking. He does not know each defender's read of it, nor the ZONE_HOLD margins
     that keep it.
   - A look-off works on the defender's picture, not on a rule the passer can query.
5. **Hand-offs inside the defense.** CARRY_RELEASE, flat hand-offs, the squat corner's choice, deep carry hand-offs.
   They are decided on each defender's picture. The passer sees the result as movement, after his own perception
   delay.

Information-honesty review of module D's design note: I'll review the QB lane's note against this list when it
arrives. On the coverer, the specific check is that "keeps his seen relation until the break" uses the seen relation
and a typical reaction by technique, not the coverer's assignment or his own break time.

## Reproduce

```sh
for s in 23 25 27 29 31 33; do node --import tsx scripts/diag/coverage/qb-roles.mts $s 2 out/diag/coverage/qb-roles-$s.jsonl; done
python3 scripts/diag/coverage/qb_roles_report.py out/diag/coverage/qb-roles-*.jsonl
```
