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
is within 0.5 yd and 0.3 s of the truth at every sample but four, all Y to DT_W at 3.0 to 4.5 s: error 0.9 to 2.0 yd at ages 0.65 to 1.15 s. That is the plain path's `recog.read === 'run'` branch (a
man outside the observer's blocking view gets 0.15 s more delay and a held sample), the only stale offensive picture I found, and it is bounded at about 1.2 s and a couple of yards.
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

## 8. Stage 1 as built (2026-11-15), and what it found

`NEAR_FIELD` (off; bits 1 felt, 2 peripheral, 3 both; `src/sim/near-field.ts`, wired in `PlaySim.see` after the gated pictures and in the tick after the World step). Reads the physics contact and the delayed record only; the error
is a smooth seeded function of time, so the sim's random stream is untouched and flag off is the same engine. Sources: the touch latency 0.15 s is a stated choice anchored on a **secondhand** 155 ms simple reaction time to
touch (Robinson 1934, as cited in a review of factors affecting reaction time; I could not open the source); Holmes et al., *Exp Brain Res* 238:995 (2020), https://pmc.ncbi.nlm.nih.gov/articles/PMC7181441, measured 580 to 700 ms for
weak vibrotactile detection, a different task. Range error 10%, central zone 30 deg: stated choices (read 5 / 10 / 20 percent and 20 / 30 / 45 deg); I found no clean source for peripheral range error. Not built: Coverage's detection
test (M T(e)): inside the field a near body moves at tens of deg/s, far over it everywhere, so the field and the existing delay decide.

**What I found about the design.** The gated pictures' view (1.8 rad, or the head cone) IS the visual field, at full quality to its edge. So a vision-only notice has nothing to add for a body inside it and nothing for a body behind;
the real additions are the bump (bit 1) and the loss of exactness in the outer field (bit 2).

**Picture error, the 6 yd probe (`near-field-probe.mts`, 13 concepts x 4 seeds; position error against truth now, median / p90, yd).**

| | NEAR_FIELD=0 | =1 felt | =2 peripheral | =3 |
| --- | --- | --- | --- | --- |
| carrier, touched in the last 0.15 to 0.65 s | 0.22 / 2.24 (n 128) | 0.24 / **0.81** (n 121) | 0.24 / 1.50 | 0.40 / 1.94 |
| carrier, behind (> 103 deg) | 0.48 / 2.26 | 0.48 / 2.21 | 0.80 / 2.25 | 0.86 / 2.49 |
| carrier, 60 to 103 deg | 0.21 / 0.85 | 0.21 / 0.82 | 0.57 / 1.53 | 0.55 / 1.54 |
| carrier, within 30 deg | 0.16 / 0.61 | 0.16 / 0.62 | 0.27 / 0.79 | 0.27 / 0.81 |
| man or zone defender, behind | 0.27 / 0.53 | 0.27 / 0.53 | 0.40 / 1.14 | 0.64 / 1.60 (before the key fix) |
| defender, 60 to 103 deg | 0.22 / 0.45 | 0.22 / 0.45 | 0.36 / 0.95 | |

Defenders have no view bound at all under `SIGHT_COVER` (occlusion only), so behind and beside are full quality today; the carrier's picture of a man behind him is the stale one (age 0.55 s, p90 2.3 yd).
Bit 1 cuts the touched carrier's p90 error from 2.2 to 0.8 yd; it does nothing for defenders (their pictures are already good). Bit 2 roughly doubles the error outside 30 deg and removes the velocity beyond 60 deg.

**Dither panel (135 plays):** `NEAR_FIELD=1` passes (carrier / spacing 0.1487, coverage / spacing 0.1089); `NEAR_FIELD=3` fails coverage / mode switch (0.044 against 0.039): noise on the picture is noise on every threshold that reads it. Bit 2 is a real
information reduction with a dither cost, not a free floor.

## 9. Stage 2 (design only): every offensive `sim.see` consumer

Offence is omniscient with a delay today (section 1). Gating it with a head field (HEAD) and occlusion touches 145 call sites in 14 files (count by `grep` for `sim.see(`, `.see(`, `track(`, `felt(`, `seenDown`, `seenTaken`, `seenEngaged`):

| Consumer (sites) | What it reads, at what range | Without a head want of its own it would be blind to |
| --- | --- | --- |
| Blockers, `blocking.ts` (62) + `screen.ts` (4) + `space-block.ts` (2) + `block-look.ts` (1) + `assign.ts` (1) + `blocker-work-picture.ts` (1) | His assigned man's position and velocity at 1 to 4 yd (engaged or about to be); the next defender in a combo (the backer) 4 to 10 yd; a twist or stunt partner 2 to 3 yd; teammates' positions within 6 yd (combo mates, the pull path); the runner (1508, 3449, 3512); pull targets 3 to 8 yd; the pass set's rusher (486, 495) | A lineman scanning for a twist (two rushers, one peripheral: 2949, 2727, 2728); a climbing lineman reaching for the backer while engaged on the DT (3379, 3476, 3508, 3727, 3758); a puller's kick-out man and his hole; the combo's second man |
| QB, `qb.ts` (36) + `qbmind.ts` (3) | Rushers through `felt()` (all-round with a blind-side delay, already special); receivers' positions and poses through `see` for the read (1627, 1660, 2300, 2568, 2577, 2626, 2629, 2679) at 5 to 40 yd; the back at the mesh (2828, 2850); defenders for the coverage read (qbmind 420, 429, 485) | Every receiver outside the head's field while he is on the progression: the checkdown, the hot receiver, the back, a safety shell at 15 to 25 yd. He needs a scan behaviour (a head want per read) |
| Receivers, `receiver.ts` (18) | The QB's position (288, 378, 474, 495, 500, 787) at 5 to 25 yd for facing and settle; defenders for route craft (141, 309, 413, 616, 627, 673) within 12 yd: get-off, release side, the crosser scan, `nearestDefender`; downfield-block targets and pursuers (849, 873) at 5 to 30 yd; a teammate's down or taken state (54, 55) | The QB at the break (a head want 'qb' on the settle); the defender he is beating (a head want on the man); a crosser at the side; a downfield blocker's pursuer |
| Ball carrier, `carrier.ts` (10) | The run key (165), the kick-out man (169), blockers (177, 522, 571, 816) and defenders (477, 559, 820) within 6 to 8 yd | Already gated by `SIGHT_CARRIER`; stage 1 covers him |
| `pa-look.ts`, `open-field.ts`, `catch-choice.ts` (1 each) and `common.ts` (4, shared with defence) | Play-action look, open-field defender read, catch-point choice, pursuit and tackle reads | Each needs a want; `common.ts` is the defender's, covered by `SIGHT_COVER` |

So the large pieces are blockers (62, 43%) and the QB (39, 27%): about 70% of the sites. The receivers (18) and the carrier (10) are smaller. A gated offence needs, at minimum, wants for: the QB on a progression (the receiver he reads and a
scan), the receiver's QB look and his defender, the lineman's man and his climb target, the pull path, and a twist scan. None of these exists as a want today (`HEAD`'s `want` exists for the ball and the passer's release belief); without them
a gated lineman is blind to his own combo partner's man. That is the size of stage 2: a head want per technique (a rough guess of the order of 20, not counted), not a change to the 145 reads.

## 10. Lane read: the run set (1,321 plays, paired, engine-68)

| | mean yards (capped at 20) | stuffs | 10+ yd | 20+ yd | missed + broken open, a run |
| --- | --- | --- | --- | --- | --- |
| reference | 3.30 | 13.1% | 5.4% | 1.4% | 0.260 |
| `NEAR_FIELD=1` (felt) | 3.30 (-0.01, SE 0.01) | 13.2% | 5.5% | 1.4% | 0.260 |
| `NEAR_FIELD=2` (peripheral) | 3.57 (+0.26, SE 0.11) | 13.4% | 7.0% | 2.3% | 0.270 |
| `NEAR_FIELD=3` (both) | 3.58 (+0.27, SE 0.12) | 13.3% | 7.3% | 2.3% | 0.266 |

The felt channel does nothing on this set: a touch on the carrier is rare and the touched picture is already about as good (the 6 yd probe, section 8). The peripheral bit moves the run game by a quarter of a yard and
puts 10+ yd runs from 5.4 to 7.0%: the carrier and the defenders see the outer field with error and without velocity, and the defenders, who read blockers and the runner at the side, pursue worse. That is the card's risk,
as predicted, and it is a bigger change than the information floor suggested: **bit 2 is an information removal that raises yards**, and it is not the flag to promote without the defenders' reads designed for it.
Dither panel: `=1` passes; `=3` fails coverage / mode switch (0.044 against 0.039).
