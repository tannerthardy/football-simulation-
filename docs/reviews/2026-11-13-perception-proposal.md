# Proposal: looming and body cues in the opponent picture (`PERCEIVE_CUES`, not built)

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

## 2. The proposal: one flag, `PERCEIVE_CUES` (off)

The goal is to keep the delay and give the observer what a person really uses to beat it: a body coming at him gets
bigger fast, and a body about to change speed shows it before it moves. Not a smarter extrapolation of velocity.

**(a) Looming.** For a target closing on the observer in the observer's own picture (closing speed > 0, within about
6 yd), the delay shortens with the time to contact:

    delay x clamp(ttc / 1.0 s, 0.6, 1)

- A rusher 3 yd away closing at 4 yd/s (ttc 0.75 s) is seen at 0.75x the delay. One at 1.5 s or more is unchanged.
- It is floored by human onset detection for a looming body at a few yards (about 0.15-0.25 s).
- It applies to everyone, not only the QB: a blocker seeing his rusher, a tackler seeing a carrier coming at him.

**(b) Body cues instead of held velocity.** A start, plant or cut is visible in the body before the velocity changes:
the lean, the hips, the foot plant. The engine already records facing, stance and pose per sample
(`perception.ts`), but not the lean. Proposal: record the body's acceleration direction (the force it is applying)
with each sample, and let the perceived velocity carry it forward:

    v_seen = v(t - delay) + a(t - delay) x lead,    lead = min(delay, 0.1 + 0.15 x recognition)

So:
- **The observer still sees the past.** What he sees includes where the body was already pushing, which is observable.
- **A poor reader leads less.**
- **It is capped by the body's own acceleration.** It cannot see a cut that has not started; a fake that is all lean
  and no plant fools him, as it should.

Consumers keyed on facing (hips) can keep using it directly.

**(c) The QB's periphery by distance.** A body within about 6 yd in his periphery is seen at 1.0-1.2x the delay. One
across the field keeps 1.7x. Peripheral vision is poor at detail and good at motion close by. Today a rusher 4 yd off
his shoulder and a safety 25 yd away at the same angle pay the same 1.7x.

**What it is not:**
- No change to any rating's meaning.
- No access to an assignment or to private state.
- No outcome award.
- No velocity-history extrapolation beyond the one sample.

## 3. How it would be judged

Matched restage first (same bodies, input, seed and operator), then league games. Per row of section 1:
- **QB, free blitzer:** believed against true closing speed at 0.4-1.0 s (`free-rusher.ts`). Expect the shortfall to fall
  from 1.5-1.8 to about 0.5 yd/s.
- **QB pocket movement after a rusher comes free** (the QB lane's come-off split against the NFL): a mechanism the
  picture enables, not one it awards.
- **COV-4:** jet travel rate against the NFL's 47%.
- **Man coverage at the break:** defender reaction lag against the NFL's, Coverage's operator.
- **Pass protection:** a blocker's set against the rusher's get-off (Flex).
- **Run fits:** the late-Will and climber witnesses (Defense / Flex).
- **Controls that should not move:** COV-1 closing in the flight, and the deep phase. If they move, something else
  changed.

Coarse outcomes are read last and are not the target: sacks, completion against separation, yards after contact.

## 4. Questions for the reviewers

- **QB lane:** is (c) the right fix for the periphery, or does your pocket-movement work want the near-body cue as a
  "felt" channel (`felt()`) instead? Does (a) change anything you are building?
- **Flex:** the pass set and punch timing read the rusher's velocity. Does a looming-shortened delay at 1-2 yd change
  your rep calibration? Which of your witnesses should be in the restage?
- **Coverage:** your defender reaction lag at the break, against the NFL, is the number that sizes (b). Do any coverage
  consumers already read facing in a way (b) would double-count?
- **Defense:** the run-fit keys (blocker release, back's track), and whether a looming term on a pulling guard or a
  lead blocker changes the fit.
