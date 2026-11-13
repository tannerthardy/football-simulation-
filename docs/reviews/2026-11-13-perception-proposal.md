# Proposal: perception as three channels (tracking, recognition, anticipation; not built)

Rules + Coaching, 2026-11-13; restructured after the user's objection ("why is everything so delayed all the time... there's conscious actionable reaction time, and a whole lot of subconscious processing that's much quicker"). **This is for review before anything is built.** The QB lane, Flex, Coverage and
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

## 2. The defect: one delay for everything

Every opponent is seen through one delay, `reactionTime` (0.16-0.40 s) plus focus and stress, with velocity frozen at the
sample. That number is a choice reaction time. The engine applies it to everything:
- **continuous tracking** of a man the player is already watching (mirroring, closing, pursuit, a set on a rusher);
- **recognising a new event** (run or pass, a break, a blitzer, the ball out);
- and, implicitly, to **anticipation**, which has no channel of its own: a tell is either ignored or read through the same
  delayed sample.

The code shows the cost. Lanes have already patched the stale picture locally, at least six times:
- `KEY_REACT`: a primed key at 0.35x, floored at 0.1 s;
- the touch channel: 0.06 s engaged, `PASS_FEEL`;
- `RouteObservation` ages a seen deceleration forward;
- CARRY_READ's `seenAcceleration`;
- the pursuit forecast's two-sample trend;
- SET_DECIDE's `feltClosing`.

Each is a reasonable fix to the wrong structure, and any new perception term would double-count them.

## 3. The evidence for three channels

Each row says whether I read the original or a summary. Following Tools' caution, the numbers are not imported as
constants: they set the scale and shape, and each constant the build uses is marked "chosen" and set from a restage.

**Tracking** (a continuous, attended target):

| source | finding | read |
|---|---|---|
| Brenner and Smeets 1997; Voudouris, Smeets and Brenner 2013 | Hand movements correct for a target jump at about 100 ms, scaled to the jump and the time left | summary (abstracts and the group's later papers) |
| Aivar et al. 2015 | People respond to an unexpected target change in about 120 ms; 150 ms in their obstacle task | summary |
| Ferrera and Lisberger 1995 | Smooth pursuit starts about 100 ms after target motion (humans about 100-130 ms) | summary |
| Brouwer, Brenner and Smeets 2002 | People do not detect acceleration directly over short presentations; they detect a change in velocity (about 25% needed). Acceleration is not used in the simple way in interception | abstract |

- **Reading:** tracking is a short-latency loop (about 0.1-0.15 s) that keeps correcting.
- **It does not extrapolate acceleration.** That corrects the "state estimate includes acceleration" idea: the evidence
  says a short delay plus continuous correction, not a predictor that knows a.
- **What it predicts for us:** most of the a·delay error disappears because the delay shrinks 2-3x, not because anyone
  sees acceleration.

**Recognition / decision** (a discrete new event):

| source | finding | read |
|---|---|---|
| Hick 1952; Hyman 1953 | Choice reaction time grows with the information in the choice (log2 of equally likely alternatives); with unequal probabilities, expected events are faster | summary; Hyman's design confounds the number of alternatives with bits (Wifall et al. 2015) |
| Chase-and-escape (PMC6872552; 12 adults, joystick disks, no body cues) | A defender's response to the attacker's direction change: 264-270 ms; 304-317 ms when it follows another change within 350 ms (refractory) | original, read for this |

- **Reading:** a reversal by a man whose body gives no cue costs about 0.25-0.3 s, and more right after another reversal.
  Our 0.16-0.40 s is the right size here.
- **What it must vary with:** the number of live alternatives and how expected the event is (preparation, the call),
  not one rating.

**Anticipation** (acting on a tell before the event; can be wrong):

| source | finding | read |
|---|---|---|
| Brault, Bideau, Kulpa et al. 2010 and 2012 (rugby 1v1) | Deception exaggerates upper-trunk yaw, head yaw and outside-foot displacement while keeping the centre of mass's lateral displacement small. Expert defenders tune to the centre of mass (honest) and wait longer before committing, so they err less | summary (abstracts, later summaries) |
| Abernethy and Russell 1987 (badminton occlusion) | Experts pick up earlier and spatially different cues from the opponent's action | summary |
| Mann, Williams, Ward and Janelle 2007 (meta-analysis, 42 studies) | Experts are more accurate and faster on sport-specific anticipation, with fewer, longer fixations | abstract |
| Savelsbergh et al. 2002; Helm et al. 2017 (Tools' pack) | Experts wait longer and choose better cues; fakes look genuine until close to release | via Tools' pack |

- **Reading:** anticipation reads tells (head, trunk, foot, the QB's shoulders) that can lie. The honest signal (the
  centre of mass) is read by tracking.
- **What skill is:** knowing which cue is honest and how long to wait, not reacting faster. A good reader is fooled
  less, and later.

## 4. The channels as an engine design

1. **Tracking** (`PERCEIVE_TRACK`):
   - **Which targets:** a target in the observer's attention (his key, the man he mirrors, the carrier he pursues, the
     rusher he blocks or feels).
   - **What he sees:** the target's centre of mass (position and velocity) at a short latency, the time constant of a
     continuous correction. Chosen in the 0.1-0.15 s range, by the restage, not imported.
   - **Error:** grows with eccentricity, distance, occlusion and the number of tracked targets.
   - **No acceleration term.** The existing local patches (pursuit trend, feltClosing, seenAcceleration,
     RouteObservation's ageing) are retired on that consumer when it moves to tracking, not stacked.
   - **Touch keeps its 0.06 s.**
2. **Recognition** (today's `reactionTime`):
   - **Where it applies:** discrete events only (run or pass, a break declared, a blitzer, the ball out, a fake, a
     rotation).
   - **Its size:** grows with the live alternatives and with surprise; shorter for the called or expected event. That
     is where preparation and recognition act.
   - The 0.16-0.40 s stays here.
3. **Anticipation:**
   - **What he reads:** the tells that today's facing and pose channels carry: head, trunk and shoulders.
   - **When he commits:** before recognition, when a tell he trusts appears.
   - **It can be wrong.** The tell is a real body feature that the offence can exaggerate (a jab, a pump, a head fake),
     while the centre of mass stays honest.
   - **Skill:** how much a reader trusts tells against waiting for tracking to confirm.
   - Several existing reads are already this, though not named as such: SEEN_EYES, readsHandsAt, HANDS_CUE, SHOULDER_READ.

The earlier `PERCEIVE_LEAN` and `QB_PERIPH` are folded in: the lean is anticipation, and the periphery is tracking error by
eccentricity.

## 5. The census: who reads a perceived opponent today

The full census is `docs/reviews/2026-11-13-perception-census.md`: 11 groups, file:line, channel, delay, and whether
each already compensates. What changes the design:

- **The tracking channel half exists already, ad hoc.** Pursuit sees the carrier at a scaled 0.12-0.24 s
  (`common.ts` ~95). Touch is 0.06 s. KEY_REACT is 0.35x, floored at 0.1 s. Each was a lane reaching for a short
  tracking latency through `delayScale`.
- **A scaled delay is not short.** `observationDelay` adds the focus and stress terms (up to 0.18 s) *after* the scale
  (`mind.ts` ~60). So touch, pursuit and KEY_REACT are all 0.06-0.24 s staler than their comments say. A tracking
  channel needs its own latency, not `delayScale`.
- **Two hidden delays hit tracking reads too:**
  - the run-read attention penalty (+0.15 s on a defender reading run, for anyone outside his blocking view). This
    slows pursuit of a WR/TE carrier;
  - `eyes.peripheral` (+0.08-0.25 s on the carrier's view).
- **Some opponent reads are true state, not perception.** The largest is the pre-contact pass set (`blocking.ts`
  ~340-443, `cutOffPoint`), which reads the rusher's real position and velocity. Others: the QB's blind-side test and
  pressure distance (`qb.ts` ~1104, 1212), the QB slide check (`carrier.ts` ~439), the post-catch blocker's pick
  (`receiver.ts` ~682). Some are touch (the engaged ride), some are leaks. Tracking gives the leaks an honest channel.
- **Self-compensators that a tracking channel retires on migration, rather than stacks on:**
  - `RouteObservation`;
  - CARRY_READ's `seenAcceleration`;
  - the pursuit forecast's two-sample trend;
  - SET_DECIDE's `feltClosing`;
  - `readPull` / `kickPicture`'s braking;
  - the stem `routeRead` 0.65x;
  - the QB memory's prior;
  - GAZE `remembered()` (off).
- **The stale flag comments:** KEY_REACT and CARRY_READ are documented "off" but are on.

**The ten that matter most by consequence:**
1. pursuit and chase;
2. the tackle window;
3. man mirror and break;
4. zone and deep carry;
5. pass set and engaged mirror;
6. QB pocket feel;
7. run/pass recognition;
8. key reads (guard, man in front, KEY_REACT);
9. run-fit steering and line flow;
10. climb and combo release.

Rows 1-6, 9 and 10 are tracking. Row 7 is recognition. Row 8 is tracking a key whose first movement is a recognition
event.

**The hard cases are mixed call sites,** where one picture drives both a continuous action and a decision:
- man coverage: the mirror and the hips-open / open-carry latches;
- zone threats: the classification and the carry;
- the QB's `felt()`: pocket movement and the scramble/throw decision;
- the DL key: first step and squeeze pace;
- combo release: the climb decision from tracking intercepts;
- pass protection: identifying the rusher by sight, setting on true state.

Each needs its decision split from its tracking before it migrates.

## 6. The late findings by channel, and what the corrected channel predicts

| finding | channel | what the corrected channel predicts | lane |
|---|---|---|---|
| QB's believed closing speed of a free blitzer (short 1.5-1.8 yd/s) | tracking (an attended rusher in his feel) | at 0.1-0.15 s, the shortfall falls to about a x 0.12, roughly 0.5 yd/s, plus a short start-from-rest gap. The blind-side and pressure-distance true-state reads become honest at the same time | QB lane |
| COV-4: man defenders travel with the jet 8% (NFL 47%) | tracking (his man, already attended) | travel rises toward the NFL's as the delay shrinks 2-3x; the jet's late burst is caught in the correction loop | Coverage |
| Man defender at the break | recognition of the cut (264-317 ms with no body cues), shortened by anticipation of the plant | no-cue reaction stays about today's size; a good reader starts on the plant; a double move fools the early committer. Needs Coverage's same-operator lag at the break | Coverage |
| Late Will / climbers (0.2-1.0 s) | tracking of the key from rest (about 0.25-0.35 s recoverable, Defense's estimate); the rest is the read decision and a square body | the first 0.25-0.35 s recovers; the long tail does not (decision and body, outside perception) | Defense, Flex |
| Pass set against the get-off | today true state (an oracle) | becomes honest tracking: expect pass protection to get slightly *worse* on the set and jab steps to work. That is a correction, not a regression | Flex |
| COV-1: zone defenders barely close in the flight | recognition (ball out); the NFL's early drive is anticipation of the QB (eyes, shoulders) | tracking does not move it (control for tracking). Anticipation would, and a pump should then fool it | Coverage |
| Deep catch-point phase | the ball-path estimate | none of the three (control) | Coverage |
| Play-action bite, draw | recognition (run or pass) fooled by the fake | must stay: tracking must not shorten recognition. Controls | Defense, Flex |

**The controls that must stay late:**
- COV-1 under tracking;
- the deep phase;
- play-action bite and draw recognition;
- `dither-budget`: shorter latency must not raise re-aim-and-undo;
- falls (`fall-rate.mts`);
- the touch channel's engaged rep (`punch-strike`, `rush-arm-balance`, `hold-facing`, `tackle-set`).

## 7. The build order: one channel, one flag, one restage at a time

**0. Before any channel: plumbing that changes nothing by default.** A `track(observer, target)` entry point next to
`see()`, with its own latency term (not `delayScale`), its eccentricity, distance and occlusion error, and an attention
set. Off, it returns exactly `see()`. Fix the two stale flag comments. No restage needed; the fixtures prove identity.

**1. `PERCEIVE_TRACK` first**, as Integration guessed. It touches pursuit, coverage mirror and the QB's feel at once,
and it has the clearest evidence. Migrate one consumer group per step, each with its own restage row, and retire that
group's self-compensator in the same step:
- **1a. Pursuit and the tackle window** (Defense). Witnesses: pursuit re-aim rate and bearing jumps (PURSUIT_COMMIT
  probe); BACKSIDE_DUTY's chase pace at 1.5 s against the NFL's 2.7; QB_RELEASE's drift-then-run. Retires the
  two-sample trend.
- **1b. The QB's feel** (QB lane). Witnesses: believed against true closing speed (`free-rusher.ts`); come-off pocket
  movement against the NFL. Retires `feltClosing`; the blind-side and distance true-state reads move onto tracking.
- **1c. Man mirror** (Coverage). Witnesses: COV-4 jet travel against 47%; mirror separation at 2.0 s. The
  hips-open / open-carry decisions stay on recognition and are split out first. Retires `RouteObservation`'s ageing
  for the mirror.
- **1d. Pass set** (Flex). Witnesses: `tackle-retreat.py` at 0.5-2.0 s against the NFL's, plus come-off, rep-end,
  walkback and fall rate as rows that must not drift. Moves the true-state set onto tracking. The touch channel stays
  exempt.
- **1e. Run-fit keys and climbs** (Defense, Flex). Witnesses: the counter backer's fill against the guard's first
  step; the IZ/OZ backer's request at 0.6 s against the NFL's 1.35. Folds KEY_REACT in rather than stacking on it.

  Controls for every step: COV-1, the deep phase, PA bite and draw, `dither-budget`, falls.

**2. `PERCEIVE_RECOG` second.** Recognition latency for discrete events grows with the live alternatives and with
surprise, and is shorter for the expected event (Hick-Hyman shape; the coefficients chosen). This touches run/pass
recognition, break declarations and blitz recognition. Its controls are its own subject: play action must still bite.

**3. `PERCEIVE_ANTICIPATE` last.**
- **What:** tells (head, trunk and shoulder yaw, the plant foot) as a channel with a trust weight by skill.
- **Deception:** the offence exaggerates tells while the centre of mass stays honest (Brault et al.).
- **Reuse:** it builds on the existing facing and pose channels and the reads that already use them (SEEN_EYES,
  readsHandsAt, HANDS_CUE, SHOULDER_READ).
- **What it moves:** COV-1's early drive, pumps and double moves.

Nothing is built before Integration approves. The lanes are asked about the channel split, not the old terms.

## 8. Questions for the reviewers, on the channel split

- **All lanes:**
  - Is each of your consumers in the census on the right channel?
  - Where a call site is mixed, where does the decision end and the tracking begin?
  - Does your self-compensator retire cleanly when its group moves to tracking?
- **Defense:** 1a and 1e. Are pursuit and the tackle window one group or two?
- **QB lane:** 1b. Does your pocket-movement work want to land on `track()` from the start?
- **Coverage:**
  - 1c. The split of the mirror from the hips-open / open-carry latches.
  - Your same-operator lag at the break (routeRan plus speed drop) is the row that sizes recognition against
    anticipation at a cut.
- **Flex:** 1d. Moving the pass set from true state to tracking will cost protection a little. Is that acceptable as
  a correction, and which witness decides it?
