# A near-field channel: how a player comes to know a body close to him that he is not looking at (Tools, 2026-11-15; design note, nothing built)

Asked by Integration after Rules' trace of a receiver who released inside and ran into the strong end's rush. This note says what the engine gives a player today, who already has a
near-field channel and through what code, and proposes one general channel (peripheral notice plus felt contact), flagged off, built on Coverage's ball-detection model so that there is one
perception model. Probes: `scripts/diag/effective-mass/see-probe.mts` (what `sim.see` returns) and `near-field-reach.mts` (how much of the game is near field). Both are read-only.

## 1. What `sim.see(observer, opponent)` returns today (engine-67 defaults)

`PlaySim.see` has one plain path and four gates on top of it (`src/sim/playsim.ts`):

| Observer | What he gets for an opponent he has not fixated |
| --- | --- |
| Any player, plain path | The perception record's state `observationDelay(reactionTime)` ago (0.2 to 0.3 s), dead-reckoned. **All around him, at any range, through bodies.** No field of view and no occlusion. A teammate is the record 0.05 s ago |
| Ball carrier (`SIGHT_CARRIER`, on) | `sighted()`: the newest moment at which the man was inside 1.8 rad of the carrier's body facing and no body stood across the line (`lineOfSight`). Never seen: the record's oldest picture (about 1.2 s back); not seen for a while: that last picture, ageing |
| Man or zone defender (`SIGHT_COVER`, on); a recognition key (`SIGHT_RECOG`, on) | The same `sighted()`, occlusion only unless HEAD, then the cone of the recorded head |
| An observer with a gaze set (`GAZE`, off) | `inView`/`remembered`: a held picture of a man outside the cone, projected on constant acceleration for up to one second, then frozen |
| QB (`felt()` in qb.ts) | The plain path with a longer delay behind his shoulder (`2.2 - 1.4 pocketPresence` times the delay beyond 1.8 rad), or `sim.track` in front (TRACK_FEEL) |

**Probe** (`see-probe.mts`: a stick concept, cover 3, the inside receiver Y, the outside receiver X and the QB asking for their nearest rusher every 0.4 s, seed 2; `HEAD`, `GAZE` on or off give the
same numbers): Y to DE_S true 1.9 yd, pictured 2.2 yd, age 0.30 s; true 0.6 yd, pictured 0.8; X to the far end true 11.6 yd, pictured 11.6; QB to DT_W true 5.2, pictured 5.3. Over 4.9 s the picture
is within 0.5 yd and 0.3 s of the truth except twice (Y to DT_W, 1.4 yd at age 1.15 s and 2.0 yd at 1.05 s, while that tackle was not the one nearest to him: the plain path with a larger delay scale).
**An offensive non-carrier on engine-67 defaults is omniscient with a delay: nothing is "never fixated" for him through `sim.see`.** A picture 59 yd away and stationary at 1.6 s cannot come from this
path on this engine. I could not reproduce it; it has to be a path on Rules' branch (a gated picture for the receiver, a different stack, or a read that does not go through `see`). Rules: which
branch and flags, and which call returned it? Without that I am describing the information the engine gives, not the trace.

## 2. Who has a near-field channel today

* **Touching men.** `recordContact` (seen-contact.ts) writes `contactWith` and `held` from the engagements and the hand and grasp joints every tick, strongest first, at most two partners. Every
  other player reads it through perception (delayed, gated). The two men in contact "keep their touch channel": engaged blockers and rushers read each other through `feltMan` under `ENGAGE_FELT`
  (on), which is the true engaged man as he feels him (`measurePhi`, the blocker giving ground). Under `GAZE` only, `inView` treats any pair in last tick's World contacts, a tackle bond or an engagement as
  in view, so a bump keeps the picture of the man for that tick and no longer.
* **The QB** has `felt()` per rusher (blind-side delay, track in front) and `held()` for a rusher still in a block. That is a delayed all-round picture, not a notice: a rusher at his back is "known" because
  `see` is omniscient, only later.
* **A receiver or any free-running player who is bumped gets nothing.** No code in `receiver.ts`, `carrier.ts` or `common.ts` reads `lastStep.contacts`, `contactWith` or `held` for himself; the World changes his
  velocity and nothing tells him. I confirmed by search; my suspicion was right.

So the only near-field channels are contact for the engaged pair, the QB's blind-side delay and GAZE's one-tick contact view. There is no peripheral notice for anyone, and none of the gated pictures
(carrier, man and zone defenders, recognition keys, GAZE) has a floor: a man outside the cone is the last picture, ageing, or the oldest in the record.

## 3. How much of the game is near field (`near-field-reach.mts`: 7 dropback concepts and 6 runs, 5 seeds each, 0.1 s samples snap to whistle, body facing as the head)

| Role | Player-s | Opponent within 2 yd | Of those: engaged | Free, inside +-95 deg | Free, outside +-95 deg | Free outside the field, s |
| --- | --- | --- | --- | --- | --- | --- |
| Receiver / TE | 1,485 | 34% | 15% | 53% | 32% | 160 |
| Back | 253 | 11% | 1% | 35% | 63% | 18 |
| QB (in the pocket) | 226 | 16% | 2% | 68% | 30% | 11 |
| QB with the ball in carrier mode | 159 | 6% | 0% | 54% | 46% | 4 |
| Ball carrier | 186 | 51% | 0% | 55% | 45% | 42 |
| Offensive line | 1,921 | 73% | 43% | 44% | 13% | 183 |
| Defensive line | 1,535 | 72% | 48% | 34% | 19% | 205 |
| Back seven | 2,690 | 28% | 12% | 61% | 27% | 202 |

A free opponent within 2 yd and behind a +-95 deg field is a third to a half of a ball carrier's and a back's near time, nearly a third of a receiver's and a back-seven man's, a fifth of a lineman's. This is what the
channel is for: it is where a gated picture has nothing and a real player has something.

## 4. The proposal: one near-field channel, flagged off, for every player

`NEAR_FIELD` (off). Two inputs, one return, and `see` uses it only as a floor.

**Peripheral notice (the same form as Coverage's ball detection, `docs/reviews/2026-11-14-ball-detection.md`, #760, so one perception model).** For each body inside 8 yd of him (a larger range gains nothing:
the ball's detection is for far objects):
1. He detects a body with probability `1 - exp(-dt / tau0)` per tick, `tau0 = 0.1 s`, when the body is in the visual field about his head (+-95 deg) and not occluded (`lineOfSight`) and its angular
   speed across his line of sight exceeds `M T(e)` (e the eccentricity off his head; `M = 10`, `T(e)` Coverage's table, from 0.03 deg/s near the fovea to 2.15 deg/s at 90 deg). Their numbers, their sources, their
   scaling with anticipation and focus, unchanged. The mapping: a body 2 yd away at 4 yd/s crossing moves 115 deg/s, which is far over `M T(e)` anywhere in the field, so, as for the ball, **the field and
   latency decide, not the threshold**; the threshold binds for a man running straight at him.
2. Detection yields a coarse picture, not a trajectory: bearing with sd `2 deg + 0.1 e` (Coverage's choice), range with a relative error (Weber-like; Coverage uses 5 to 10% for the ball, I propose **10%
   as a choice**, from size cues at near range, source to find), and **no velocity** (a second notice at least 0.1 s later gives a crude one). Posture and facing are not part of it.
3. The notice holds for `HOLD = 0.4 s`, ageing with the constant velocity from two notices if he has them, else frozen with growing range uncertainty.
4. Orienting (the saccade at 0.20 s and the head turn) is HEAD's and the player's decision, not this channel's: a notice makes a head turn possible, it does not make one.

**Felt contact.** When the World puts his body in contact with a body that is not a teammate, after a tactile latency he knows: that he was touched, the bearing of the contact on his body (about 15 deg), the
direction and rough size of the impulse, and, from that, a picture of the man at the contact point plus radius (position error 0.3 yd, no velocity beyond the impulse's direction). The latency is a **choice, 0.05 s
reflex and 0.15 s to a decision-grade read; both need a source** (my recollection of mental-chronometry reviews is about 0.15 s simple reaction time to touch; I have not checked it). It holds 0.5 s, then decays
unless he sees the man. ENGAGE_FELT's `feltMan` already is this for a man tied up in a block; this extends it to a bump.

**The return.** `sim.near(observer, target): { pos, sd, age, source: 'notice' | 'felt' } | null`, built from the delayed perception record only (never the true body now), using a per-player seeded stream so the
sim's own RNG sequence does not move. `sim.see` calls it only where the plain or gated picture of a close opponent is older than the notice or outside his view: the notice **replaces a stale, remembered or
occluded picture** (it is a floor); it never overrides a fixated one. Teammates stay as they are (0.05 s).

## 5. Who would start behaving differently (the card's risk)

Because an offensive non-carrier is omniscient today, **the flag changes nothing for receivers, backs, linemen and the QB on engine-67 defaults**. It changes the players whose pictures are gated:

| Player | Today | With the channel |
| --- | --- | --- |
| Ball carrier (`SIGHT_CARRIER`) | A man outside 1.8 rad is the last picture; a trailing tackler at 1 to 2 yd behind is not "known" | Knows a tackler within 8 yd in his field and, on a touch, the man who touched him. **Most affected** (45% of his near time is outside the field) |
| Man and zone defenders (`SIGHT_COVER`, `SIGHT_RECOG`) | A crosser behind the cone or behind a body is unseen or old | A man inside the field notices him at once (a rub or a crosser who picks him is felt) |
| QB | `felt()` is already all-round with a delay; the proposal adds nothing behind his shoulder | Unchanged outside the field (a rusher he does not see he does not move from); inside it at 2 yd he notices |
| Receivers in traffic | Omniscient with a delay: unaffected today | Matters only if receivers are moved to gated pictures (HEAD, GAZE, the sight flags) as Rules' trace implies: then the channel is what keeps a gated receiver from running into a man at 2 yd |
| Linemen and rushers | Engaged pairs have `feltMan`; a free lineman outside a block gets the plain delayed picture | Unchanged while engaged; a free rusher noticing a back out of the field |
| Trailing tacklers | Plain path (omniscient delayed) | Unchanged |

So the channel is chiefly **a floor under the gated pictures**. Its card risk is not the flag alone, it is the flag together with whichever stack makes pictures honest (HEAD, GAZE, SIGHT_*): on the current
default stack it moves the carrier and the defenders in gated pictures; on a stack that gates the offence it would move the receivers and the QB as well. Direction: each of these players gets more information
than the gated stack gives them, never less than today's (only the carrier and defenders are gated today).

## 6. Witnesses I would define before building

* First-notice latency by bearing and range (should be 0.1 s in the field, never behind 95 deg): and the share of near-time with a notice, by role, against the table above.
* The picture's error at 1 to 2 yd for a man outside the cone: now (last picture) against with the floor.
* A gated receiver's collisions with an unseen rusher (Rules' case) with and without; the carrier's trailing-tackler contacts and the tackle rate with and without.
* `NEAR_FIELD` off: bit for bit; with every body fixated: bit for bit; no read of true state beyond the delayed record (the information guard's `perception` class holds it).

## 7. What I need from Integration

1. Rules' trace: which branch and flags returned a 59 yd stationary picture. On engine-67 defaults it cannot.
2. Whether the floor applies to the carrier and defenders first (the only gated players today), or waits for the offence to be gated.
3. The tactile latency and the 10% range error need sources; I will not pick them from memory. If you have a perception source for either, send it.
