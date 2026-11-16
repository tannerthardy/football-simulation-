# The catch process: research and our model's limitations (2026-11-15)

Coverage lane, at the user's request. This note covers how NFL catches happen, how receivers prepare for them, and
how defenders break them up. It then lists what our catch model cannot represent and where the most progress lies.

It draws on three web-research passes (about 100 distinct sources; the main ones are linked below). Each finding is
tagged by the kind of evidence behind it:

| Tag | Meaning |
|---|---|
| [PR] | peer-reviewed research |
| [DATA] | measured or charted data |
| [RULE] | the 2026 NFL rulebook |
| [CO] | coaching or player opinion |
| [OWN] | our own computation from the 2022 Big Data Bowl tracking (weeks 1-9) or nflverse play-by-play |

**Caveat.** Almost all the precise timing comes from lab catching of small balls at 5-14 m/s. No published
eye-tracking or kinematic study of NFL receivers exists, so transfer to a 0.41 kg ball at 15-25 m/s caught on the run
is an inference. Nothing published measures grip force against a strip, contact time in a football catch, or how
often a bobble is then secured. Those must be stated choices, not fits.

## 1. What a catch is (the rules)

Rule 3-2-7 and Rule 8-1-3 [RULE] require three things in order:

- (a) complete control with hand(s) or arm(s);
- (b) both feet, or any body part other than the hands, completely down inbounds;
- (c) then clearly an act common to the game (extend the ball, an extra step, tuck and turn upfield, ward off an
  opponent), or control long enough to do one.

Notes to the rule:

- Movement of the ball is not automatically loss of control.
- If (a) and (b) are done but not (c), and the ball comes loose on the ground, the pass is incomplete. This is the
  limited "survive the ground" rule kept after the 2018 rewrite.
- Heel-toe: any part of a foot out during a normal step makes it out. A drag counts as in.
- Simultaneous catch: the ball belongs to the passers, unless one player had control first.
- The receiver is defenseless through the whole catch process. Head and neck hits, lowering the head, and launching
  are 15-yard fouls (12-2-9).

How the timing of contact decides the call:

| Contact lands | Ruling |
|---|---|
| Before the hands close | Deflection or muff |
| After (a) but before (c) | Ball out is incomplete; ball out on landing is incomplete |
| After (c) | Fumble |

Pass interference applies from the throw until the first touch. Once both players are playing the ball, incidental
contact and gained position are legal for both. Grabbing an arm, an arm across the body, playing through the back,
and hooking that turns him are fouls.

"Time enough" for (c) has no number in the rulebook. A bang-bang play is incomplete when in doubt. College needs one
foot; StatsBomb models that as worth up to about 4 points near the sideline.

## 2. How a receiver catches

**Tracking**

- Gaze leaves the ball about 0.12 s before arrival. Nobody watches it into the hands. The length of smooth pursuit,
  not its quality, predicts success. Success falls sharply below about 0.55 s of flight (Cesqui 2015) [PR].
- Brief mid-flight occlusion barely matters. Failure comes from a late pickup with under about 0.2 s left to correct
  (Lopez-Moliner 2010) [PR].
- Seeing the thrower's release starts the hand earlier, and success goes from 87% to 96% (Stone et al.) [PR].
- Corrections show up about 100 ms after a target's position jumps, and more than 150 ms after a change of angle
  [PR]. A tipped ball can be followed only if that much time remains.

**Commitment and the hands**

- Coarse arm transport starts about 0.28 s before contact (Mazyn 2007) [PR].
- Closure begins about 0.1 s before impact and takes about 0.23 s, so most of it happens after contact.
- Good catchers time peak closing speed within about 5 ms of impact; poor ones peak after it. Everyone touched the ball
  on over 90% of trials, yet grasp success ran from 2% to 85% (Cesqui 2016) [PR].
- Touching the ball is easy; securing it is timing. The one-hand tolerance is about +/-15 ms at 10 m/s (Alderson 1974,
  via Stone) [PR, secondary].
- Arm muscles pre-tense about 100 ms before an expected impact, scaled to its momentum (Lacquaniti & Maioli 1989) [PR].
  A hit or ball he expects finds him braced; a blind one does not.
- Balance load costs catching accuracy: poor catchers approached good ones when seated (Davids et al. 2000) [PR].

**Technique** [CO]

- Diamond hands above the chest, basket below and over the shoulder.
- Fingertips first, which checks the spin. Palm, pad or facemask contact gives a hard, unpredictable rebound.
- Clapping (gator) catching needs more timing precision than letting the ball arrive in still hands.
- Arms out in front keep the hands visible and add stopping distance.
- Late hands keep sprint speed and hide the catch point from a defender reading the hands; their cost is less
  correction time.
- Secure, then tuck (three to five points of pressure, "high and tight"), then turn. Turning or looking upfield early
  is the most cited cause of drops.

**Physics** [derived from sourced inputs]

- Ball: 0.41 kg; throws average about 20 m/s and reach about 27 m/s at most; spin about 600 rpm.
- Momentum at 20 m/s is about 8 N.s.
- Stopping force by how long the ball takes to stop:

  | Contact time | Peak force |
  |---|---|
  | 10 ms (rigid) | about 820 N |
  | 100 ms (giving with the arms) | about 80 N |

- Hand friction coefficient: dry glove about 1.64, dry bare hand about 1.37, and about equal when wet (MIT).

**Size** [DATA, fan analytics]

- Hand size shows at most a weak link to drops: r about 0.17 to catch rate, p about 0.05-0.10 for drops. One estimate
  puts an extra inch of hand at about a third of a drop a season; another finds no relationship.
- I found no study of body size and body catches.
- Drop and contested-catch rates barely repeat year to year: drops over expected r 0.21 (PFF); tight-end contested
  0.05 and drops 0.10 (4for4). Most drop variation is situational, not a fixed trait.

## 3. How a defender breaks a catch [CO, consistent across sources]

The choice turns on observable cues, never a timer.

**In phase** (touching the hip, step for step):

- He may turn and find the ball, high-point it, or swat it if he can't get both hands on it.
- Getting ahead of the receiver opens back-shoulder and comeback throws.

**Out of phase:**

- He never looks back. He reads the receiver's eyes and hands.
- When the hands rise he drives the near arm up through them ("break the glass") or rakes down across them.
- Too early is interference (arm across the body); too late, the catch is made.
- Running with the hands up costs speed.

**After the catch:**

- Punch-pull-rip, or hook and swat. The hook and the swat must be simultaneous, or it is interference.
- The peanut punch at the back of the ball by the elbow, ideally as the second man in. Tillman forced 44 fumbles.

**The legal big hit** is to the body below the neck, without the head lowered and without launching.

## 4. Physics of contact at the catch point

- Head-to-head NFL hits measured 9.3 m/s closing, about 7,200 N peak over about 7 ms (Viano & Pellman 2005) [PR].
  Hits to the arms and torso are longer and softer; that is an inference.
- Holding a 0.41 kg ball against a 30-50 g jolt takes about 125-205 N on it, so about 80-130 N of squeeze per side for a
  fingertip grip at a friction of 0.8. Grip on a convex ball with the arms out is far below a dynamometer's 500 N
  [derived].
- A punch easily beats fingertip friction. Security comes from wrapping the ball (elbow crook, ribs, chin), not
  squeeze. That is why the fragile moment is just caught and not yet tucked.

## 5. Numbers to check games against (not to tune toward)

| Quantity | NFL | Source |
|---|---|---|
| Completion given arrival, by separation | <=0.5 yd 41%, 1-1.5 64%, 1.5-2 74%, 2-3 84%, 4-6 91% | [OWN] BDB 2022, n 6,739 |
| Completion within 1 yd of the sideline, given arrival | 45% | [OWN]; separation <1 yd and within 2 yd of the sideline: 24% |
| Completion by receiver speed at arrival | <=2 yd/s 87%, over 9 yd/s 65% (confounded with depth) | [OWN] |
| SIS openness x accuracy | wide open 95 / 45%, normal 78 / 27%, contested 52 / 9% | [DATA] |
| Contested-catch rate | 47.7-50% | PFF [DATA] |
| Passes defensed / interceptions | about 13% / 2.3% of attempts | nflverse 2023 [OWN] |
| Fumbles per completion | 1.1-1.2% (about 0.5-0.6% lost) | nflverse 2023 / 2024 [OWN] |
| Contact within 0.5 s of arrival, on completions | 13.5% | [OWN] |
| Drop tag share of arrived targets | 4.3% (22% of incompletions) | [OWN] |
| Deep (20+ air yd) completion | 38 / 30 / 26% at 20-29 / 30-39 / 40+ (2024); 39.6% (2025) | nflverse, PFF |

## 6. Our model against this: limitations, ranked by frequency x consequence

The model is `src/sim/catching.ts`, with CATCH_SECURE, CATCH_HANDS, CATCH_POINT, DEFLECT_BALL and CATCH_SPEED on.

1. **Ratings award the catch and the dislodge directly. This conflicts with our own model rules.**
   - The catch is a roll: `pCatch` is built from stretch, height, ball speed, the run-tracking term and `hands`.
   - The defender's breakup or dislodge is a roll on `ballSkills`, `manCoverage`, `contestedCatch` and distance.
   - The research says the catch is a timing event: closure against contact, with timing error from the perception
     noise. Skill belongs in latency, tracking noise, closure timing variance, hand compliance and grip.
2. **Contact during the catch is one shot.**
   - A won roll pins the ball to his chest for 0.12-0.45 s. Each defender gets one try, through one probability that
     fades over the window.
   - What it cannot express: where the hit lands (hands, ball, arms or torso); the stage of the catch (closing, two
     hands, pinned, tucked); grip and wrap against the impulse; bracing for a hit he sees; a second strike; going to the
     ground.
   - This is the situation the user named: a defender closing in, contact, the ball dislodged or not fully controlled.
3. **The rulebook's catch process is absent.**
   - There is no (a)/(b)/(c). Inbounds means his centre point when the window ends.
   - Also missing: feet or heel-toe, survive the ground, simultaneous catch, and the incomplete-or-fumble boundary.
   - After the window, fumbles are the tackle model's (hit severity x ball security). Nothing makes a just-caught,
     untucked ball fragile.
   - The NFL's sideline drop-off (45% within 1 yd, given arrival) is something we cannot produce.
4. **Defender technique is partly there.**
   - Present: a defender plays the ball when he faces it and can reach it, otherwise through the hands (CATCH_HANDS).
     The man defender's look (BALL_EST bit 256) uses an observed phase.
   - Missing: the read of rising hands as the trigger, its timing cost (arms up while running), and the arm-across and
     hook interference exposure.
5. **Receiver technique is absent.**
   - No hand shape (diamond, basket, clap), no late hands, no arms-out versus body catch.
   - No "turned upfield before securing", the most cited drop cause and a direct trade against yards after catch.
6. **Size is partial.**
   - Reach and maximum catch height exist.
   - Hand size (pocket depth, one-hand hold) and torso trap surface do not.
   - Expected effect: modest.
7. **Bobble and keep-alive.**
   - A failed catch squarely in the hands pops up and can be re-caught (DEFLECT_BALL).
   - Missing: the clumsy reflex to get any surface under it, feel versus sight, and the clamp.
   - Rare in the NFL, and no published frequency exists. Last in order.
8. **The ground is not a contact body.** Diving and layout catches cannot be jarred loose on landing.

## 7. Where the most progress is

The first step is a catch state machine with a hold that competes against impulse. It replaces the one-shot securing
roll (items 1-3), on code we already have (CATCH_SECURE's window and `secureStep`).

**Stages:** hands closing → in the hands → two hands → pinned to the body → tucked.

- **Hold capacity rises with each stage.** It is set by geometry (wrap) more than squeeze. Grip and hand size scale
  it.
- **Closure timing error comes from his own perception.** That means his look, pursuit length and pickup time (the
  glance rule's error). It sets whether he reaches "in the hands" or the ball pops (a muff or bobble).

**Every contact applies an impulse to the ball-arms system.** That covers a defender's hand, a punch, a rake, a body
hit, and later the ground. The impulse depends on:

- the striker's speed, effective mass and where he lands;
- bracing, if the receiver perceived the hit at least about 100 ms before.

**Rules layer.** Outcomes come from the stage at the moment the hold is beaten: deflection, incomplete, or fumble after
(c), plus (b) feet and the defenseless and interference flags. "Time enough" for (c) is a stated policy (bang-bang plays
go incomplete).

**Constants are choices.** Stage hold capacities, closure timing noise and bracing are stated and read at two or three
values. The section 5 table is the final exam.

**Scenario tests before games:**

- an open catch;
- a hit at arrival;
- a hit 0.2 s after arrival;
- a rake as the hands rise;
- a sideline catch;
- a catch going to the ground.

Each runs many times, with no ratings in the outcome path.

**Later:** receiver technique (hand shape, late hands, early turn), hand size and trap surface, then bobble and
keep-alive as its own stage. The bobble should be a crude, error-prone reflex: late perception, noisy aim, one
committed choice, a clumsy clamp. Skill should help it only a little, because players do not drill it.

## Main sources

- **Perception and motor control:**
  - [Cesqui 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4368737/)
  - [Cesqui 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4938428)
  - [Stone et al.](https://research.stmarys.ac.uk/id/eprint/1368/1/Stone%20et%20al%20%20Temporal%20and%20Spatial%20Occlusion_Author%20Copy%20Accepted%20Version.pdf)
  - [Brenner & Smeets](https://personal.fbw.vu.nl/~jsmeets/2015/Temporal_precision-JOV15.pdf)
  - [Lopez-Moliner 2010](https://research.vu.nl/en/publications/catching-a-gently-thrown-ball/)
  - [Lacquaniti & Maioli 1989](https://pubmed.ncbi.nlm.nih.gov/2913200/)
  - [Davids et al. 2000](https://shura.shu.ac.uk/13146)
  - [Savelsbergh 1991](https://link.springer.com/doi/10.1007/BF00227789)
  - [Land & McLeod 2000](https://www.nature.com/articles/nn1200_1340)
- **Rules:** [NFL rulebook](https://operations.nfl.com/the-rules/nfl-rulebook/),
  [2018 catch rule](https://www.nfl.com/news/nfl-teams-unanimously-approve-simplified-catch-rule-0ap3000000923342),
  [safety rule history](https://www.nfl.com/playerhealthandsafety/equipment-and-innovation/rules-changes/nfl-health-and-safety-related-rules-changes-since-2002),
  [NCAA 2-4-3](https://sdcfoa.org/ncaa/rule-2-definitions/college-2-4-3)
- **Data:**
  - [SIS openness x accuracy](https://www.sportsinfosolutions.com/2024/09/05/using-accuracy-and-openness-to-provide-context-for-receiver-play)
  - [PFF contested 2025](https://www.pff.com/news/the-10-best-pass-catchers-in-contested-situations-from-the-2025-nfl-season)
  - [PFF drops](https://www.pff.com/news/nfl-drops-quarterback-receiver-justin-herbert-mac-jones-2021)
  - [NGS completion probability](https://www.nfl.com/news/next-gen-stats-introduction-to-completion-probability-0ap3000000964655)
  - [Deshpande & Evans](https://arxiv.org/abs/1910.12337)
  - [StatsBomb one-foot rule](https://blogarchive.statsbomb.com/articles/football/playing-by-the-rules-nfl-vs-ncaa-modeling-considerations/)
  - [nflverse](https://github.com/nflverse/nflverse-data/releases)
- **Hits:** [Viano & Pellman 2005](https://nflps.org/wp-content/uploads/2012/08/Neurosurgery-2005-10-1.pdf)
- **Coaching:**
  - [USA Football WR](https://blogs.usafootball.com/blog/6924/coaching-the-wide-receiver-catching)
  - [RSP on gator catching](https://mattwaldmanrsp.com/2022/10/18/rsp-nfl-scouting-glossary-clapping-or-gator-catching/)
  - [USA Football DB deep ball](https://blogs.usafootball.com/blog/5006/how-to-coach-defensive-backs-to-play-the-deep-ball)
  - [Daberkow clinic](https://ncacoach.org/uploads/DaberkowFB11-1.pdf)
  - [Punch-pull-rip](https://glazierclinics.com/football-coach-resources/winning-the-moment-of-truth-for-dbs-punch-pull-rip-technique)
  - [AFCA forced fumbles](https://www.afca.com/attack-the-ball-force-the-fumble-win-the-recovery/)
- **Gloves:** [MIT via Globe and Mail](https://www.theglobeandmail.com/sports/article-sticking-it-to-the-man-how-sticky-gloves-have-changed-football/),
  [NOCSAE ND019](https://nocsae.org/wp-content/uploads/2021/12/ND019-10m15aMfrdfootballplayersglovesStdperformance.pdf)
- **Hand size:** [Pads of the Hands](https://padsofthehands.blogspot.com/2016/10),
  [PlayerProfiler](https://www.playerprofiler.com/article/combine-hand-size-nfl-player-profile-advanced-stats-metrics/)
