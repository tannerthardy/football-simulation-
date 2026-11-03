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

## Rungs 4–6 (same day)

**D4. Lateral race** (both start at 3 yd/s playside, ball 10 yd playside and running). The drill LB requests (−1.50, −1.73): it pushes back and works *away* from the ball, whatever his read. The pair goes from 3 to 0 yd/s in 1 s.

The drill LB's read pipeline is not live, so I moved to cut-outs.

**Cut-out drills** (`_cutout.mts`). Run a real OZ snap to the first C-on-box-LB engagement with the runner holding the ball. Then either continue it, or move every other body 60 yd away and continue with only C, LB, QB and runner. 40 engagements, playside lateral over 1 s, p50:

| | C | LB | Carrier | LB engaged request | C request |
|---|---|---|---|---|---|
| full | 1.68 | 1.71 | 2.96 | 1.17 | 2.25 |
| alone | 1.79 | 1.96 | 3.39 | 1.06 | 2.26 |

The pair's flow is a two-man property; traffic is not the cause.

**Which branch writes the engaged LB's intent** (observer, 544 steps): `legacy` 251 and `shed: across face` 293. Neither branch is "run where the ball is going". Across-face work is in the contact frame.

**Experiments**, temporary hooks reverted, on the "alone" condition:

| Change | LB request | Pair (C / LB) |
|---|---|---|
| none ("alone" baseline) | 1.06 | 1.79 / 1.96 |
| Legacy `work` coefficient ×(0.35…1.0) | — | does not raise the pair |
| LB intent from his own controller (engagement does not write it) | 1.72 | 1.83 / 2.00 |
| Own LB + blocker lateral cap raised to 0.6–0.8 vmax (C request 3.0) | 2.08 | 2.03 / 2.21 |

**D5. Raw physics, joined bodies moving sideways together** (both ask 3 yd/s, starting at 3):

| Case | Lateral speed over 1 s |
|---|---|
| Joined, facing each other or facing the run, or apart | 3.0 throughout |
| Joined, with the blocker also driving forward at 2.4 | 2.63 at 1 s |

Physics does not cap an engaged pair.

**Conclusion.** An OZ engaged pair moves at the LB's own chosen flow speed, about 2 yd/s. Free OZ LBs flow at a similar fraction of NFL (`lbtempo`: 1.2–1.55 vs 2.65 at 1 s). The binding constraint is **defensive flow tempo**, not blocker footwork or physics.

Still open from the engine map:
- The engagement layer authors both players' engaged motion every tick.
- The legacy box-LB branch ignores the ball.

Those are structural choices for Defense and Main Engine.

## Rebuild stage 1 (committed, default off): `run/G2-engaged-technique` 1c58f213

- `ENGAGED_TECHNIQUE`: the engaged blocker's goal comes from his controller:
  - drive, at his own pace (0.4 vmax);
  - wall, from the ball-side shoulder;
  - run-with, for a backer flowing hard across with the runner behind his flow.

  The 2.4 yd/s forward drive dated from the pre-physics rep law (fa084410), where it was the scripted drive speed.
- `ENGAGED_DEFENDER`: a neutral hook for Defense. An engaged non-stack defender keeps his own controller's request.

**Restage** (stream 0, `ENGAGED_TECHNIQUE=1` vs off), first contact:

| | off | on |
|---|---|---|
| IZ | +0.65 | +0.40 |
| OZ | +0.21 | +0.22 |
| Power | +0.57 | +0.24 |
| Counter | +1.10 | +0.91 |
| Draw | −1.77 | −1.12 |

Not ready to turn on: the drive pace still needs checking.

## Football 101: "why doesn't our run game punish slow linebackers?" (`_punish`, `_dlwin`, `ozpath.py`)

**Punish test** (416 OZ/WZ matched snaps): box LBs normal, frozen at the snap, or removed.

| | Mean | Median | 10+ yd | ≤0 yd | First contact x | DL first hitter |
|---|---|---|---|---|---|---|
| Normal | 4.4 | 2.0 | 9% | 17% | +0.3 | 52% |
| LBs frozen | 9.7 | 4.4 | 27% | 12% | +0.8 | 53% |
| LBs removed | 10.5 | 4.1 | 31% | 12% | +0.7 | 54% |

With no linebackers at all, the median OZ run is still 4 yd and the play still meets a DL at the line. Football says it should be into the secondary.

**DL first hitters, no-LB arm** (218 of 416):

| How he got there | Count |
|---|---|
| Grabbed the runner from inside his block (grasp releases the block: `tackle.ts`, `BLOCKED_REACH`) | 97 |
| Hit while still engaged | 40 |
| Never blocked | 44 |
| Body down / separation | 36 |
| A real shed | 1 |

The block holds a median 1.85 s. At the hit the carrier is a median 5.2 yd wide, at the line.

**The back's path** (`ozpath.py`, NFL vs sim, after the handoff):

| | NFL | Sim |
|---|---|---|
| OZ lateral at +0.5 s | 2.2 | 1.1 |
| OZ depth at +1.0 s | −1.5 | −2.1 |
| OZ heading at +1.5 / +2.0 s | 38 / 41° | 49 / 53° |
| OZ handoff → LOS | 1.5 s | 2.0 s |
| IZ lateral at +2.0 s | 2.5 | 4.6 |
| IZ heading at +2.0 s | 38° | 44° |

Our zone backs are slow to the edge, deeper, and stay horizontal longer. That keeps them in arm's reach of blocked linemen along the line. **The offense fails to punish because the carrier's path never stresses the defense.** This is carrier work: the run-game lane.

## Zone back tempo (`ozpath.py` speeds, `meshspeed.py`, `_rbspd`)

**Carrier speed after the handoff** (yd/s, trace operator):

| | At handoff | +0.5 s | +1.0 s | +1.5 s | +2.0 s |
|---|---|---|---|---|---|
| OZ, NFL | 5.13 | 5.85 | 5.65 | 4.97 | 3.89 |
| OZ, sim | 3.21 | 3.94 | 4.46 | 5.11 | 4.61 |
| IZ, NFL | 3.83 | 4.60 | 4.59 | | |
| IZ, sim | 3.49 | 4.66 | 5.40 | | |

IZ is roughly NFL pace.

**OZ offset-far in detail:**

| | NFL | sim |
|---|---|---|
| Alignment depth | −4.76 | −5.50 |
| Mesh depth | −4.13 | −4.73 |
| Speed at 0.9 / 1.1 s | 3.72 / 4.57 | 3.35 / 3.89 |
| Speed at the handoff | 4.61 | 3.62 |

Our OZ backs line up deeper, take the ball deeper and slower, and reach full speed only when NFL backs are already slowing to cut.

**`STRETCH_TEMPO` probe** (stretch mesh and press at 0.8 vmax instead of 0.55): +0.25 yd/s at the handoff, punish-test yards unchanged. Dropped. The deficit is mostly alignment and mesh depth, not the tempo cap.

Next: OZ back alignment and mesh landmark depth (offensive alignment and `meshFor`, both run-game owned).
