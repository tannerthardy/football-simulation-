# Presented possession: who each player believes has the ball (spec)

Status: spec for review. Integration OK'd the shape 2026-11-14 with six points folded in below (marked I1-I6); now with
Coverage, Rules + Coaching and the QB lane. Built after the honesty batch (HONEST_READS #701, HONEST_TACKLE #711) lands;
this replaces HONEST_TACKLE's identity half (I6). Approved to spec by Integration 2026-11-14 under the user's standing rule ("every time we find
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

`Perceived.carrying` becomes a function of the observer's belief: `true` for his believed holder, `false` for a body
he is confident does not have it, `null` otherwise (unknown).

**Commitment (I2).** The belief is a decision, held: `true` is entered when the weight clears an enter margin and kept
until evidence drives it past an exit margin on the far side (the hysteresis CLAUDE.md requires of every mode switch).
Once he believes the back has it he keeps believing it, which is what makes him step and what makes the keep work;
re-scoring the same picture every tick is not new evidence. Only a new cue moves the weight.

**The observer's skill and role (I3).** Skill acts on which cues he weights and how fast he integrates them, never on a
"bite chance": an experienced, aware defender keys what is diagnostic (the ball, the hands, the carrier's centre of
mass, and he waits for it, as Rules + Coaching's rugby result found for experts), a raw one weights the loud cues (the
back's downhill path, the QB's turn). His role sets what he is looking at: a backer keying the guard and back sees the
mesh through the line; an end squeezing on the mesh sees the hands; a safety sees the QB's hands from depth. That comes
from his existing key / gaze, not a new rating.

**What the consumers do with `null` today (I5).** Every `.carrying` read in `src` (develop fe59480c):

| consumer | test | with `null` |
|---|---|---|
| recognition.ts:267 QB keep cue, :321 `seesGive` | `=== true` | no give / keep cue: run-pass read unchanged |
| run-fits.ts:436 acquiredBack, :475 split cap, :493 force, :557 edge trail, :622 free fit, :640 insert | `=== true` (split also `=== false`) | stays in his pre-mesh fit (premesh) |
| run-fits.ts:451-453 contradicted mesh | `=== false` / `=== true` | no contradiction |
| defense.ts:155 CATCH_CARRY refutation, possession-read.ts:60 catcher refutation | `=== false` | no refutation (hypothesis kept) |
| defense.ts:627 takeOn carrier gap, :1000 man-on-back keyed fit | `=== true` | treats him as not (yet) the carrier |
| possession-read.ts:76 observedHolder | `=== true` | not a holder; null everywhere = no read |
| possession-read.ts:112-113 qbRunning | `=== false` clears / `=== true` starts | latch unchanged ("unknown neither starts nor ends") |
| engagement.ts:1890 caught, :1983 / :2005 trails, :2130 support, :2162 pursue, :2544 squeeze track | `=== true` (trails also need QB `=== false`) | no carrier action |
| coverage/defender.ts:124 back run support, force-track.ts:21 | `=== true` / `!== true` | no run support / no outward boundary |
| tackle.ts:155 (HONEST_TACKLE) skip, :207 last reach | `=== false` skip; `=== true` last reach | not skipped (unknown still counts); no last-reach upgrade |
| blocker-work-picture.ts:21 (offense) | truthy | not a carrier |

So `null` already means "not confirmed" everywhere: a defender whose belief is unresolved at the mesh holds his
pre-mesh fit and takes no carrier action. That is the freeze the fake should produce, and it needs no consumer change.
What changes is that `true` can now be wrong (the believed holder), which is what makes him step and tackle the back.

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

A cue's strength falls with distance and with whatever `see()` says he can see. **Occlusion is not built here (I1):**
SEE_SIGHT (Rules + Coaching, approved: geometry by body height and posture, no dice) is the occluder. The belief store
consumes whatever `see()` reports, so the fake gets stronger when SEE_SIGHT lands without a second occluder. Until
then, view cone and distance only. Order: this build can land first (fakes believed at all, by distance and view);
SEE_SIGHT then hides the mesh behind the line; the two are coordinated with Rules + Coaching so cue visibility goes
through one `see()` query.

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

- **PA holds a second-level defender (I4, NFL twin stated before the build):** for each off-ball backer aligned 3-7 yd
  deep inside the tackles, his displacement toward the line of scrimmage in the first 0.6 s after the snap, and the
  time to his first drop step (first frame his velocity points away from the line by more than 1 yd/s). PA vs plain
  dropback from the same look (personnel, formation, shell). NFL: BDB 2025, plays with the play-action label vs
  without, same operator code on both sides; the sim forced panel paired off vs on. The gap to close is PA minus
  no-PA, not either level.
- **A rusher takes the faking back:** count and timing of tackles on the faking back; QB time to first rusher
  contact on PA vs dropback.
- **Give / keep read on runs:** backside end and backer first commit on the QB vs the back on IZ / OZ with the QB's
  carry-out; boot and option rows when those plays exist (no read option or boot branch in the playbook today; the
  RPO is a pre-snap read).

Controls (I5; must not move beyond placebo): plain handoffs with no carry-out resolve within one delay of the
exchange and nothing in the run table moves (fresh set within placebo, missed + broken unchanged); plain dropbacks
with no fake unchanged (sacks, time to first rusher contact, completion); the consumers above keep their `null`
behaviour (unit test per consumer group: unresolved belief equals today's unknown picture).

## Build order (proposed)

1. Belief store and `Perceived.carrying` from belief; every recording site stops passing the true holder. Cues:
   ball visible, exchange seen, contact outcome. Controls first: plain handoffs and dropbacks unchanged.
2. Presentation: `carryPosture` set by carriers and fakers; the QB's hands after the mesh (with QB_BODY_SEEN).
3. Non-carrier tackle outcome (with Rules + Coaching on legality).
Two attempts each, after the honesty batch lands. Occlusion is SEE_SIGHT's, not a step here (I1).

## Reviews requested

- **Coverage:** catch-readiness and possession reads on your side; BALL_EST interplay (a thrown ball is the
  decisive cue that the QB no longer has it).
- **Rules + Coaching:** the non-carrier contact outcome and its legality; seen-contact (#693) as the contact cue.
- **QB lane:** presentation at the mesh (rating, ride time, eyes and drop cost); `carryPosture` and arm/hands on a
  keep; the pump as a related case (QB_BODY_SEEN already shows the arm).
