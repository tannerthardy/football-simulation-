# Presented possession: who each player believes has the ball (spec)

Status: spec for review (Integration first; then Coverage, Rules + Coaching, the QB lane). Build after HONEST_READS
(#701) lands. Approved to spec by Integration 2026-11-14 under the user's standing rule ("every time we find
information cheating remove it and figure out a solution").

## The leak

Possession enters every picture as the true holder, delayed. Each recording site calls
`perception.record(this.agents, this.carrier?.idx ?? null)` (playsim.ts:469, 502, 519, 524, 1336), and
`Perceived.carrying` is that bit read back with the observer's delay. Nothing a player sees can disagree with the
truth about *who* has the ball; only *when* he learns it varies. Consequences:

- No fake can be believed. `presentHandoffFake` / `pretendCarry` (playsim.ts:897-910) feed only the holding rule
  (contact-holding.ts:379); perception never sees them. Measured on #711's forced panel (144 PA plays, paired): no
  fake ever held a rusher off the QB; first rusher contact before the throw identical on all 33 plays that had one.
- No outcome exists for contacting a man without the ball: `tryTackles` targets only `sim.carrier`.
- `carryPosture` (agent.ts:171) is declared, recorded and never set or read.

About thirty consumers read `.carrying` (defense.ts, run-fits.ts, possession-read.ts, recognition.ts,
engagement.ts, coverage/defender.ts, force-track.ts, blocker-work-picture.ts, tackle.ts). They need not change:
they keep reading `carrying`; what changes is what the picture holds.

## Football it must produce

Coached and observed, in order of consequence:

1. **The mesh is a read, not a fact.** A backer keys the back and the guard; at the mesh he sees two bodies and
   arms, often through the line. He does not know who has it until something shows him: the back's carry
   (pads down, arms wrapped, the ball visible or not), the QB's hands and drop, the two paths after.
2. **A well-carried fake holds him.** PA holds second-level defenders a step or two (the coaching point: "one
   step and a freeze" for a disciplined backer, more for an eager one). Holding him is the fake's whole value.
3. **Rushers take the back.** An edge or a scraping backer who believes the back has it tackles the back, and the
   QB gets the time. On the give, a defender who believes the QB kept it plays the QB.
4. **Faking costs the faker.** A QB selling PA turns his back to the defense and spends time at the mesh; a back
   carrying out the fake runs a real path and is out of the protection; a QB carrying out a boot fake after the
   handoff is a body moving away from the play.
5. **Some see it and some don't.** A backside end looking down the line sees the ball; a backer behind the guard's
   pads may not; a deep safety at 12 yd sees the QB's hands clearly. Sight lines and gaze matter.
6. **The truth arrives.** The ball reappears (a throw, the QB showing it, a pitch), the back is tackled and comes up
   empty, the paths separate with one body clearly carrying. Belief converges; it does not stay wrong forever.

## Model

### Per observer, per candidate: a belief

Each defender (and each offensive player who reads possession) holds, for the ball's current holder, a belief over
candidates: who he thinks has it, with a weight. Candidates are the bodies that could hold it after the last
exchange he has evidence of (at a mesh: QB and back; at a pitch fake: QB and pitch man; after a handoff: the back
and the QB carrying out; before the snap: the QB / snapper).

`Perceived.carrying` becomes a function of the observer's belief: `true` for his believed holder when the weight
clears a commit margin, `false` for a body he is confident does not have it, `null` otherwise (unknown). Consumers
already treat `null` as unknown (observedHolder, qbRunning, run-fits' premesh), so most need no change.

### Evidence (what moves the belief)

All through his own sight, with his ordinary delay and, where GAZE / SEE_SIGHT is on, his head and occlusion:

| cue | what it shows | strength (to calibrate) |
|---|---|---|
| ball visible in a hand or in flight | that body has it / no one has it | decisive when seen |
| exchange seen (both bodies' hands at the mesh, unoccluded, in view) | ball moved / stayed | strong, by distance and view |
| carry posture (`carryPosture`, new, set by the carrier's controller) | tucked vs open hands | moderate |
| QB arm and hands after the mesh (QB_BODY_SEEN's arm/head) | hands on ball, empty-handed carry-out | moderate |
| paths after the mesh (downhill back vs QB setting / booting) | consistent with give or keep | weak, accumulates |
| contact outcome: the body he (or a teammate he sees) tackles comes up empty / with the ball | resolves it | decisive |

A cue's strength falls with distance and with how much of the exchange is occluded (bodies between observer and
the hands, from the physics world). Without SEE_SIGHT, use the view cone and distance only.

### The offense's side (presentation)

The fake is something a player *does*, with skill and cost, not a label:

- **QB at the mesh** (qb.ts PA branch, handoff branch): presentation quality from his ball-handling / play-action
  rating and how long he rides the mesh; his eyes are off the defense for that time (existing PA cost; keep it) and
  his drop starts later.
- **Back carrying out the fake**: sets `carryPosture: 'tucked'` and runs his track; the better his effort/rating,
  the more he looks like a carrier; it costs him his protection or route timing.
- **QB carrying out after a handoff** (`pretendCarry`): the same, with his own posture and path.
- **Real carrier**: on a give, the back's posture is tucked anyway; on a keep the QB hides the ball (posture and
  arm), which costs him throwing readiness for that time.

Presentation sets what each cue *shows* (e.g. posture tucked on both bodies), never the observer's belief directly.

### The missing outcome: contact with a man without the ball

A defender who believes a body has the ball pursues and tackles it with the ordinary tackle machinery
(`tryTackles` over his believed holder, not only `sim.carrier`). Physics is unchanged; the result for a non-carrier:

- the tackle bond forms and he is taken to the ground or wrapped as usual; it is not a dead ball and not a sack;
- legality: hitting a faking back behind the line is legal (rules lane to confirm edge cases: a QB after the
  handoff carrying out a fake is a runner only while he simulates possession, and protection rules for the QB
  apply; contact-holding.ts already knows `fakeRunners` for holding);
- cost: the defender has spent himself (down, engaged, out of the play) — no other penalty;
- evidence: the tackled body comes up empty; the tackler and those who see it update.

## Witnesses and controls

Witnesses (forced panels, paired off vs on; the flag is one measuring instrument, lands on, old path deleted next
engine):

- **PA holds a second-level defender:** backer step toward the line in the first 0.6 s after the mesh and time to
  his first drop step, PA vs plain dropback from the same look; NFL tracking has both (BDB PA flag), same operator
  both sides.
- **A rusher takes the faking back:** count and timing of tackles on the faking back; QB time to first rusher
  contact on PA vs dropback.
- **Give / keep read on runs:** backside end and backer first commit on the QB vs the back on IZ / OZ with the QB's
  carry-out; boot and option rows when those plays exist (no read option or boot branch in the playbook today; the
  RPO is a pre-snap read).

Controls (must not move beyond placebo): plain handoffs without carry-out (belief resolves at the exchange as
today, within one delay), plain dropbacks with no fake, the fresh run set overall.

## Build order (proposed)

1. Belief store and `Perceived.carrying` from belief; every recording site stops passing the true holder. Cues:
   ball visible, exchange seen, contact outcome. Controls first: plain handoffs and dropbacks unchanged.
2. Presentation: `carryPosture` set by carriers and fakers; the QB's hands after the mesh (with QB_BODY_SEEN).
3. Non-carrier tackle outcome (with Rules + Coaching on legality).
4. Sight: occlusion of the mesh by the line (SEE_SIGHT / GAZE) when that channel exists.

## Reviews requested

- **Coverage:** catch-readiness and possession reads on your side; BALL_EST interplay (a thrown ball is the
  decisive cue that the QB no longer has it).
- **Rules + Coaching:** the non-carrier contact outcome and its legality; seen-contact (#693) as the contact cue.
- **QB lane:** presentation at the mesh (rating, ride time, eyes and drop cost); `carryPosture` and arm/hands on a
  keep; the pump as a related case (QB_BODY_SEEN already shows the arm).
