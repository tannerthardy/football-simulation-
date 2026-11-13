# Proposal: body cues in the opponent picture (`PERCEIVE_LEAN`, `QB_PERIPH`; not built)

Rules + Coaching, 2026-11-13. **This is for review before anything is built.** The QB lane, Flex, Coverage and
Defense review it; Integration reads the reviews. Shared perception has about 200 consumers, so nothing here changes
behaviour until a matched restage says so.

The engine's picture is described in `docs/PERCEPTION.md` (on `rules/qb-gather`). In short:
- **Every opponent is one recorded sample from `delay` seconds ago**, delay = reactionTime + focus and stress terms,
  typically 0.25-0.35 s.
- **Position is extrapolated by the held velocity; the velocity is held.** So at a start, a plant or a cut, the perceived
  velocity is short by a·delay, and from rest it reads 0 for one whole delay.
- **The delay does not depend on distance or on the target closing.**
- **The QB's periphery is purely angular** (1.7x the delay at any range).

## 1. How much of each "late" finding the a·delay lag explains

The test is simple: a finding is late *because of the picture* only if the read is keyed on a perceived velocity at a
moment of real acceleration. The predicted lateness is then a·delay in velocity, or about the delay in time.

| finding | what the read is keyed on | a at the moment | predicted by a·delay | measured | share |
|---|---|---|---|---|---|
| QB's believed closing speed of a free blitzer (`free-rusher.ts`) | rusher's perceived velocity | about 4.2 yd/s² (closing 1.8 -> 4.3 yd/s over 0.4-1.0 s) | 1.1-1.3 yd/s short (QB delay 0.25-0.30) | short 1.8 / 1.8 / 1.8 / 1.5 yd/s at 0.4 / 0.6 / 0.8 / 1.0 s | most of it: about 1.2 of 1.5-1.8 yd/s. The rest at 0.4 s is the start from rest (perceived 0 for one delay) |
| COV-4: man defenders travel with the jet 8% (NFL 47%) | jet's perceived velocity | the jet speeds up in its last few tenths | a 0.3 s reaction beaten by the acceleration: KNOWN_PROBLEMS' own confirmed cause | travel rate only (8 vs 47%) | the stated cause. Not sized: needs the travel rate with the lag removed |
| Man defender at a receiver's break (plant and cut) | receiver's perceived velocity | the cut: velocity turns 60-90° in about 0.2 s | late by about the delay on every cut (0.25-0.35 s) | **Coverage to fill:** their defender reaction lag at the break against the NFL's, same operator | open |
| Deep defender loses phase in flight (deep catch point, today) | receiver on a go: near-constant speed | small | under 0.3 yd/s | defender closer to the ball than the receiver 11-19% (NFL 29-40%) | small. The cause is elsewhere: the ball-path estimate (Coverage) |
| COV-1: zone defenders barely close in the flight | the throw (`throw-sight.ts`, the arm) | not an opponent's velocity | none | 0.12 yd vs 0.65 | none: release recognition is a different cue |
| BLOCK_SEEN: a bull rush or ride read as a fresh sprint | rusher in contact | - | - | read 0.35-0.6 s *short* (early, not late) | opposite sign, fixed by pacing (on since engine-38) |
| Run fits: late Will, climbers delayed 0.2-1.0 s (KNOWN_PROBLEMS) | blocker's release, the back's track | depends on the key | about the delay where the key is a release velocity | **Defense / Flex to fill** | open |

**Reading:**
- **The lag is real and sized where it applies:** the QB's rusher picture and the jet. The QB row is the cleanest: the
  measured shortfall is the a·delay prediction, plus the start from rest.
- **Two well-known "late" findings are not this:**
  - COV-1 is the trigger on the throw (release recognition);
  - the deep phase loss is the ball-path estimate.

  Fixing perception would not touch them, and they should not be used to judge it.
- **Two rows need their lane's number** before the size of the change can be predicted: the man defender at a break
  (Coverage), and the run-fit keys (Defense / Flex).

## 2. The proposal: two flags, each read on its own (revised after Integration's read)

Each mechanism gets its own flag and its own restage row, so it can land or miss alone. Every shape below either cites
perception evidence or is marked **chosen**. Sources are Tools' pack: `docs/football-handbook/ball-in-air-perception-sources.md`
on `claude/admiring-bell-t3ji19` (ac1c6c66). As the pack warns, no millisecond constant is imported from it.

### Dropped: looming as a shorter delay

Lee 1976 says time to contact can be read from the rate of optical expansion (tau = θ/θ̇) without knowing distance or
speed. That supports a time-to-contact *channel*. It does not support a shorter latency.
- **In our engine,** tau from the delayed picture equals range over closing rate at the sample time. That is what held
  velocity already gives.
- **So looming does not fix the a·delay lag.** A body speeding up still expands faster than the old sample shows.
- The earlier draft's `delay x clamp(ttc / 1 s, 0.6, 1)` was a chosen multiplier with no evidence for its shape, and it is
  withdrawn.
- A tau channel may still be worth having for consumers that combine distance and speed separately, but it is not a
  lateness fix and is not proposed here.

### `PERCEIVE_LEAN` (off): what the body shows before it moves

A start, plant or cut shows in the body before the velocity changes: the lean, the first step, the foot plant. The
evidence:
- readers use sequential cue streams of posture (Huesmann et al. 2023);
- experts gain from better cue choice, not faster reaction (Savelsbergh et al. 2002);
- fakes look like genuine motion until close to release, so committing early has a deception cost (Helm et al. 2017).

**The form, from what is seen.** Each recorded sample also stores the body's applied acceleration: the force it is
putting into the ground, which the lean and first step show. Perceived velocity becomes:

    v_seen = v(t - delay) + a(t - delay) x lead,    lead = w x delay

- **What falls out:**
  - he never sees past what the body is already doing (a(t − delay) is real and old);
  - a jab step is real force that reverses, so a reader leading on it is fooled by exactly the fakes that should fool
    him;
  - a body at constant speed shows nothing extra.
- **Chosen:** w, how much of the lean a reader trusts. Proposed 0.3–0.8 by recognition, an estimate to be set from the
  restage rows below, not from an outcome.
- **Not used:** a velocity-history extrapolation, or any rating that awards the read.

### `QB_PERIPH` (off; the QB lane's call, since `qbmind.ts` is theirs): periphery by the target's angular speed

Today the QB's periphery costs 1.7× the delay at any range. The evidence says the cost is not one angle penalty:
- eccentricity slows reaction and lowers perceived speed for slow motion, with little effect for fast motion (Tynan and
  Sekuler 1982);
- off-gaze timing degrades (Hirano et al. 2023);
- peripheral vision signals change and place, while identifying needs fixation (Vater, Wolfe and Rosenholtz 2022).

**The form, from what is seen:** the target's angular speed at his eye, ω (its motion across his view, which falls with
distance on its own):

    periphery cost = 1 + 0.7 x clamp(1 - ω / ω0, 0, 1)

- A rusher 4 yd off his shoulder moving at 4 yd/s (about 1 rad/s) is near 1.0×.
- A safety drifting 2 yd/s at 25 yd (about 0.08 rad/s) keeps about 1.7×.
- Periphery gives place and motion, not identity: it stays a detection channel.
- **Chosen:** ω0 and the 0.7, kept from today's 1.7× at the slow end.

## 3. How each is judged

A shared-perception change is judged like shared physics: matched restage first (same bodies, input, seed and operator),
then league games. Coarse outcomes are read last and are not the target.

| flag | rows that should move (restage, NFL operator where one exists) | fixtures expected to move |
|---|---|---|
| `PERCEIVE_LEAN` | QB's believed closing speed of a free blitzer at 0.4-1.0 s (`free-rusher.ts`; expect the shortfall 1.5-1.8 -> about 0.5 yd/s); COV-4 jet travel against 47%; man defender reaction lag at a break against the NFL (Coverage's operator); a blocker's set against the rusher's get-off (Flex); late-Will / climber run-fit witnesses (Defense / Flex) | `motion-check`, `man-phase`, `man-trail-carry`, `man-cushion-compression`, `cushion-break`, `pursuit-prediction`, `pursuit-arrival`, `qb-feel`, `block-seen`, `pass-feel` (its sight half), `hot-look` (alarm timing), `back-man-run-fit`, `run-fit-crossover` |
| `QB_PERIPH` | QB's believed closing speed of a rusher off his shoulder; QB pocket movement after a come-off (the QB lane's split) | `hot-look`, `qb-feel`, `gaze-field-of-view`, `seen-eyes` (if it reads the QB's view) |

**Controls that must not move:**
- **`dither-budget`.** A lean that reverses on a jab step can make readers re-aim and undo. If the budget rises,
  `PERCEIVE_LEAN` is making players dither, not read, and it fails.
- **`throw-sight` and COV-1 closing in the flight.** That read is keyed on the throw, not on an opponent's velocity.
- **The deep catch-point phase** (`deep-catch.ts`: defender closer to the ball than the receiver, 11-19% against
  40%). That is the ball-path estimate.

The physics-law and contact suites are untouched by either flag.

## 4. Questions for the reviewers

- **QB lane:**
  - `QB_PERIPH` is yours to take or drop. Is angular speed the right axis for your pocket-movement work, or do you
    want the near body as a felt channel (`felt()`) instead?
  - Does `PERCEIVE_LEAN` on the rusher's picture change anything you are building?
- **Flex:** the pass set and punch read the rusher's perceived velocity.
  - Would the lean lead change your rep calibration, and which of your witnesses belong in the restage?
  - For the late-Will / climber rows, which key does each read?
- **Coverage:**
  - Your defender reaction lag at the break, against the NFL, is the number that sizes `PERCEIVE_LEAN`.
  - Do any coverage consumers already read facing (the hips) in a way the lean would double-count?
- **Defense:** the run-fit keys (the blocker's release, the back's track, the pulling guard), and any defensive consumer
  of perceived velocity you want in the restage.
