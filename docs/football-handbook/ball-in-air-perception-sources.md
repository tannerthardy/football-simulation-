# Ball-in-air defense and player perception: sources and what they mean for the engine

Reviewed 2026-11-13 for Coverage, Defense, the quarterback decision-making lane and the
Fable sim agent. Input is a user-supplied research pack
(`ball_in_air_perception_research_2026-11-13.md`, about 5,400 words, 50-plus links) and
the sources it cites. Companion to the
[underneath-plant](../reviews/2026-11-12-underneath-plant.md) and
[window-defenders](../reviews/2026-11-12-window-defenders.md) reviews, the
[coverage rule audit](../reviews/2026-11-11-coverage-rule-audit.md) and
[Defense and perception](defense-and-perception.md). Nothing here changes the engine.

**Bottom line.**
1. The pack's central hypothesis is right, and reading the code makes it sharper. Three
   things in the engine decide how a defender handles a ball in the air, and none matches
   what the sources teach (section 4): **whether he sees the ball is a body-facing cone;
   whether he finds it is one dice roll per flight from his ball-skills rating, with no
   regard to phase and no cost; and once he has seen the throw he is handed the true
   full flight path, height included.** The last is the strongest finding: the defender
   does not discover the catch point, he is told it.
2. The coaching sources agree with each other on the rule that matters: **in phase,
   look and play the ball; out of phase, do not look back, recover the relationship and
   attack the receiver's hands.** Our locate decision ignores phase.
3. The 2026 Big Data Bowl data is usable here. **The raw archive was not present locally;
   I fetched it with the existing script (checksum verified; Git-ignored `data/raw/`),
   so Kaggle access is not needed.** Facts about it are in section 3. Several comparison
   cautions in the pack hold up against the data: the NFL cohort is about seven coverage
   defenders per play, not eleven, and flights of 1.5 s or longer are a small slice.
4. I could not read the Kaggle writeups (they render in the browser), so the pack's
   descriptions of them are second-hand here.

## How the sources were read

| Source | Read how |
| --- | --- |
| Daberkow, *Developing Defensive Backs* (Concordia, slide deck) | **Full text** (PDF extracted) |
| Grayvold, USA Football deep ball; Coach & AD man drills; AFQ defensive back techniques; Kelly press-conference quote | Through a summarizing page reader |
| Coomes, *Defensive Back Techniques* (Chadron State) | PDF is an **outline only** (headings "Out of Phase", "In Phase", no content) |
| X&O Labs (Fields) in/out-of-phase article; Flores book; Texas Coach; Swedish drills workbook; youth hands drill; Brooks NFL.com; Aire Athletics | **Not read** (403, binary, or not fetched) |
| Perception papers: Lee, Hirano 2023, Tynan and Sekuler, Vater review, McBeath, Postma 2014 and 2017, Shaffer and Maynor, Vater 2019, Savelsbergh 2002, Huesmann 2023, Helm 2017, Aksum 2020 | Abstract or full text through a summarizer |
| Other pack papers (C02-C05, C10-C13, C15, C18, C21-C30) | **Not read**; the pack's one-line descriptions only |
| BDB 2026 Kaggle writeups (Ghostbusters, Eraser, Reaction Phase, Convergence Efficiency, Ball-Hawk, others) | **Not read** (pages render client-side; titles only) |
| BDB 2026 data | **Inspected directly** (schema, cohort counts, week 1) |

Check any number against the original before quoting it. Most perception studies are
baseball, soccer, handball or screen tasks; nothing here is an NFL measurement.

## 1. What the coaching sources teach

**Phase, defined (Daberkow, college head coach).** *In phase*: your shoulder is locked in
front of the receiver's shoulder and you are running in step. **Only when in phase can you
look back for the ball: "your body tilt will cause you to lose the WR if you look back
before you are in phase."** *Out of phase*: you are not shoulder-locked and in step; your
only goal is to get in phase, eyes locked to the near hip, sprinting, "NEVER looking back."
Once in phase, look while putting pressure on the receiver with the near hand. He says
not to teach "arms up and through" on a fade ("makes sense when you're walking and
coaching, but doesn't correlate to game scenarios") and that there is no one finish;
back-shoulder and end-zone jump balls "play hands, aim for far hand". His method:
Stance, Release, Transitions, Finish, "Plant, Gather, Go", "Tilt-Point-Drive" turns.

**Kelly (Notre Dame, 2013 press conference), verbatim as read:** "In phase, hip to hip, turn,
and play the ball. Out of phase, don't turn and rake through the basket" (strip or dislodge).

**Grayvold (USA Football).** Turn when the receiver pushes past the cushion, roughly 2 to
4 yd depending on his speed, with a man turn into his near hip; hand on his hip, trail with
your body on his back hip close to even; **accelerate to match his speed and do not get
ahead, which invites a back-shoulder throw or comeback**; "look and lean": lean to
narrow the window, eyes up "to the sky, not to the quarterback", pick up the flash of the ball;
attack the ball at its highest point. Out of phase: ignore the quarterback, catch the
receiver and "break the glass" (drive the near arm up through his hands as they rise)
for a one-handed catch; hands up only when breaking the glass.

**Coach & AD (written drill article).** Eyes on the receiver's inside hip ("where the
hip goes, the DB goes"); in press eyes move to the **ear hole**; the ear hole disappears
when the receiver turns for the ball, so **switch to his eyes**; **"when the receiver's eyes
get bigger, the ball is coming. Look for his hands"**; as the hands rise, place yours inside
his, then turn the head and play the ball; if you cannot get inside, rake down his arms or
punch up between his hands; if you cannot secure the ball, be in position to tackle.

**AFQ (defensive back techniques).** The "interception point" is about **6 to 8 yd in front
of the receiver** when the DB recognizes the pattern: drive to it rather than shadow
him ("don't sit in the dead area"); accelerate to close the cushion, then turn to find the
ball; "look for the ball when you hear 'BALL'"; **on deep routes read the receiver's hands
and eyes first, on in-stride throws look for the ball**; play through the receiver to the
ball and do not come underneath unless sure of both hands; rip the "backstop" arm.

What this adds up to for a model, as the pack says: **being in position to defend the
receiver is not being in position to intercept the ball**, and the receiver's head,
eyes and hands are visible evidence of a ball arriving even when the ball is not seen.
These are coached rules at college, high-school and professional-press-conference
level, not measurements of how often NFL defenders play each way, and Daberkow's
"no one way to finish" applies.

## 2. What the perception papers support, and what they do not

| Source | Finding as read | What it supports | What it does not |
| --- | --- | --- | --- |
| Lee 1976 (driving) | Time to collision can be obtained from the rate of optical expansion without knowing distance and speed | Looming as a cue for an approaching object (a rusher) | A football constant; lateral movers do not loom |
| Hirano et al. 2023 (20 students, dot on a screen at 4-12 degrees) | Motion-onset reaction time rose from 285 to 299 ms with eccentricity; timing of an occluded target was early by 173 ms at 4 degrees falling to 79 ms at 12; no eccentricity effect when the target stayed visible | Peripheral motion can be noticed but its timing degrades off-gaze | Any NFL angle-to-detection mapping (one slow target, young students) |
| Tynan and Sekuler 1982 | Eccentricity slows reaction and lowers perceived speed for **slow** motion; little effect for fast motion | **Not one angle penalty for all events**; speed, size and contrast interact | Numbers (abstract has none) |
| Vater, Wolfe and Rosenholtz 2022 (review of 60 driving, walking and aviation papers) | Gaze pivot, gaze anchor, "foveal spot"; peripheral vision signals change and place, identifying usually needs fixation; hazards detected 200-400 ms before fixation; foveal region about 4-5 degrees | Distinct gaze states with a refixation cost; **detect versus identify** | Football numbers (sports content is from outside the review) |
| McBeath et al. 1995 (baseball) | Fielders can run a path that keeps the ball's linear optical trajectory, a spatial rule, without solving the landing point | Continuous optical control as an alternative to "predict the landing spot then sprint" | That a DB uses it |
| Postma et al. 2014 (8 women, tennis balls) | Eyes on the ball in 95.5% of frames of caught trials, 92.9% when judged uncatchable; the only drop was the last 100 ms | Fielders track the ball almost continuously in the open | Defensive backs, who also guard a receiver |
| Postma et al. 2017 (6 people) | Uncatchable calls came at about 46% of maximum speed, so catchability is not judged from locomotor limits | Graded, uncertain judgments of whether he can get there | |
| Shaffer and Maynor 2011 | Quarterbacks were about 80% successful throwing to a moving receiver with vision occluded, no worse than with vision; their own predictions explained little of their success | A throw can be set from earlier movement cues | That a QB can read hidden defenders |
| Huesmann et al. 2023 (6 handball experts, interviews) | Context first, then later cues: shoulder, arm, wrist, hand, ball, posture | **Sequential cue streams** when reading a thrower; a close analogue for reading a quarterback | Probabilities; interviews, not tested |
| Savelsbergh et al. 2002 (soccer goalkeepers, film) | Experts: more accurate, **waited longer before responding**, fewer corrections, fewer and longer fixations on the kicking leg, non-kicking leg and ball | Better anticipation can come from better cue choice, not earlier reaction | Football thresholds |
| Helm et al. 2017 (1,580 handball penalty throws) | Disguised throws were harder to tell from genuine ones for experts (error 4.6% spatial, 29.6% temporal) than for novices (1.0%, 20.2%); the difference grows toward release | A pump or double move can be a convincing fake until close to release: **committing early has a deception cost** | NFL pump rates |
| Vater et al. 2019, soccer 3v3 | Defenders used a pivot or a direct (anchor) gaze strategy depending on ball and opponent | A zone defender can watch two things relationally | |
| Aksum et al. 2020 (5 midfielders, eye tracking) | Mean fixation 242 ms; in defense most viewing time went to the player in possession (ball and opponent together) | Context-dependent gaze | |

**The caution the pack and I both land on:** these give architecture (detect versus
identify, a gaze state with a switching cost, cue streams, graded confidence), not football
constants. Do not import 285 ms, 200-400 ms or any reaction time.

## 3. The 2026 Big Data Bowl data

What I checked directly (`data/raw/bdb2026/.../train/`, week 1 unless noted):
- **It was not on disk.** `scripts/data/fetch_nfl_data.py bdb2026-2023` downloaded the
  archive listed in `data/sources.json` (108 MB, checksum verified), then extracted it.
  Nothing entered Git. The Kaggle 401 does not block this.
- **Input files** (pre-release frames) carry `x, y, s, a, dir, o` (**orientation `o` and
  direction `dir` at release are available**), `player_role`, `player_side`,
  `player_to_predict`, `num_frames_output` and `ball_land_x, ball_land_y`.
- **Output files** carry only `game_id, play_id, nfl_id, frame_id, x, y` at 10 Hz:
  **no post-throw speed, acceleration, orientation or ball height**, as the pack says.
- **Cohort.** Roles are Passer, Targeted Receiver, Other Route Runner and
  **Defensive Coverage**; in week 1 there are 819 plays and 155,397 coverage rows
  against 23,103 targeted-receiver rows, about **6.7 coverage defenders per play**, not 11.
- **Flight length.** Median `num_frames_output` is 10 (1.0 s); **15.8% of week-1 plays are
  1.5 s or longer.** A "medium-long flight" slice is small in any one week; pool the 18.

Not verified: the in-house **"defender nearer the ball on medium-long flights, 8% against
27%"**. I did not find it in the repository docs, so I do not know its operator, cohort or
definition of "nearer", and the pack itself says it did not re-estimate it. The Kaggle
writeups' methods (Ghostbusters, Eraser, Reaction Phase, Convergence Efficiency,
Ball-Hawk) are as the pack describes them, second-hand. Its warnings are sound and I
repeat them: a retrospective "ideal path to the true landing spot" is not information the
defender had; a heading-alignment reaction time (the Ball-Hawk "about 0.55 s median" on a
three-week cohort) is not a biological reaction time, because a defender guarding his man
looks misaligned to an oracle catch point for good reasons; composite scores use
author-chosen weights.

## 4. What the engine does now (develop `516d8729`)

Read from `src/sim/behaviors/defense.ts`, `src/sim/throw-sight.ts` and
`src/sim/possession-read.ts`; nothing run.

1. **Seeing the throw is a cone on body facing.** `ThrowSight` marks a defender as having
   seen the ball the first tick it is within a cone of his body facing: cosine above
   **-0.2 for zone eyes, 0.1 for a man** (`viewCone`). Then he reacts after
   `observationDelay(reactionTime x (1 - 0.4 x anticipation))` (plus 0.05 s in man).
   There is no angular size, eccentricity, motion salience or looming, and no
   difference between detecting something and identifying it.
2. **Cues before the ball is seen exist.** A zone defender with eyes on the quarterback
   "keys" the windup (`keysQB`); a man defender within 3 yd reads his receiver looking
   back or hands coming up (`readsHandsAt`, `HANDS_CUE`). The cue starts a reaction; it
   gives no direction.
3. **Finding the ball is a dice roll, not a decision about phase.** `findsBall`
   (`LOOK_ONCE`, default on): once per flight, with chance **0.25 + 0.6 x ballSkills**, he
   "finds" it after 0.25 s plus up to 0.35 s if his back is to the passer, shortened by ball
   skills; otherwise he plays the flight without the look. The result is a `looking` tag
   that mostly gates his ability to contest the catch (`catching.ts`: `facingBall` or
   `looking`). Nothing in it depends on whether he is in phase, and **looking costs
   nothing**: the source comment says "looking over the shoulder doesn't turn the body".
   The coaching says the opposite: looking back out of phase tilts the body and loses the
   receiver.
4. **Once he has seen the throw he knows the whole flight.** `acquireFlight` returns
   `sim.ballPath.map(p => ({...p}))`: a **copy of the true predicted path, every sample
   of the flight with height**, kept as his acquired trajectory. `playObservedFlight` then
   steers on `catchSpot` and `arrivalPoint` from that path. The defender's later
   uncertainty is only in the receivers he sees and in his own reach, not in where the
   ball is going.
5. **Phase exists only as an off-by-default stem rule.** `MAN_PHASE` (off) puts a man
   defender in phase on the stem once his hips are open. `playObservedFlight` has a
   guard so a defender "already carrying the visible catcher must not brake out of phase
   toward a stationary point". `DEF_BELIEF` gives the *quarterback* a belief about
   defender closing (a partial move with the target), a QB-side model.
6. **Other relevant parts that are in:** `CUSHION_BREAK`, `CARRY_READ`, `SHOULDER_READ`
   (the underneath plant on the windup), `ARRIVE_LEAD`, `DRIVE_CATCH`, `CATCH_SECURE`,
   `CATCH_CHOICE` (the receiver chooses where on the path to play it). `GAZE` (field of
   view with a head that turns at 6 rad/s within 90 degrees of body facing) exists, off.
7. **The quarterback's side** (`src/sim/qbmind.ts`): a clear view cone plus a delayed
   periphery that widens with awareness, so detection is angle-based as the pack says;
   unseen defenders are dead-reckoned and drift toward his coverage belief.

## 5. What the sources add: candidates, in the order I would look at them

Each is a candidate. Name the decision it would change before building it; fix a bad
decision in the controller and incoherent execution in physics; defenders get only what
they acquire; do not tune a speed or a statistic.

1. **Stop handing the defender the flight (Coverage / Defense).** `acquireFlight` is a true
   oracle at acquisition. A defender who has just turned for the ball should hold an
   estimate that is refined from the ball positions he sees (the McBeath family gives a
   continuous-control alternative to "know the landing spot"), with more uncertainty when
   he has not looked, and an uncertainty that includes height. The pack's order has it
   second; I would test it first because it is the plainest information leak. It also
   bears on the project's information rule (players act on acquired, delayed
   information): check how the information-guard test treats this file before touching it.
2. **Phase-aware locate decision (Coverage / Defense).** Replace the ball-skills dice with a
   choice from state the defender can acquire: shoulder-lock and relative speed to the
   receiver, hip orientation, the receiver's head and hands. In phase: turn and play the
   ball. Out of phase: eyes on the near hip, recover, read hands and eyes, rake. Give
   looking back a real cost (the body tilts, the relationship loosens) and let ball skills
   change how well and how quickly he finds it, not whether he may. Keep the three finishes
   apart: reach the ball at its high point, hands-through disruption, and secure-window
   dislodgement. Leave the technique to the player; do not ban looking back out of phase,
   charge for it.
3. **The pack's key experiment, with one addition.** Run the same deep-ball saved snaps with
   observation delays unchanged and the phase-aware choice on (item 2). **Also run it with
   the oracle path removed (item 1) separately**, so the two effects can be told apart. If
   the share of defenders nearer the ball at the catch moves, part of the gap is the
   decision after acquiring information, not perceptual speed. The matched restage tool
   (`scripts/diag/matched-restage.ts`) replays saved snaps with a dice noise floor.
4. **Match the cohort before judging any number (Integration / data).** The pack's six
   gates are right. The NFL data supports a specific comparison: the targeted receiver
   and the Defensive Coverage players, pooled over weeks, flights binned (note 1.5 s and
   over is about 16% of plays), release orientation `o` available for phase and facing at
   release. Define "nearer the ball" in 2D, since the data has no ball height, and say so.
5. **Cue evidence and deception (Coverage).** The receiver's head and hands, and the
   quarterback's windup, are the observable cues; pumps and double moves should cost an
   early committer (Helm: fakes resemble genuine throws until close to release; Savelsbergh:
   experts wait longer, not react faster). The pump cost already exists for the underneath
   plant (`SHOULDER_READ`); extend the principle, do not add a rating.
6. **Richer visibility (QB lane, later).** The papers support distinguishing detecting
   motion from identifying what it is, an eccentricity-dependent cost, and looming for an
   approaching rusher (a free rusher closing on a QB in peripheral vision). That belongs
   with the quarterback decision work and the `qbmind.ts` view cone. Tynan and Sekuler's
   speed dependence argues against one angle penalty. Treat any constant as an estimate.

## 6. What not to do

- Do not import 285 ms, 200-400 ms, 0.55 s or any perception or reaction time from these
  sources; they come from dots on a screen, driving, goalkeepers and competition entries.
- Do not raise defender speed or acceleration to close a decision or information gap.
- Do not compare a selected NFL cohort with all eleven simulated defenders, and do not
  use a retrospective ideal path to the true landing point as what a defender knew.
- Do not read a defender's final path as evidence of which cue he used (the pack's Marken
  caution): paths resembling a controller do not prove it.
- Do not treat coaching sources as frequencies. They describe what is taught; NFL
  defenders mix techniques, and Daberkow himself says there is no one way to finish.
- Do not give a receiver the catch point before he has seen the same evidence.

## Sources

- Daberkow, [Developing Defensive Backs](https://www.ncacoach.org/uploads/DaberkowFB11-1.pdf); Coomes,
  [Defensive Back Techniques](https://ncacoach.org/wp-content/uploads/2024/07/FB-Wes-Coomes-Chadron-State.pdf) (outline only)
- Grayvold, [Playing the deep ball](https://blogs.usafootball.com/blog/5006/how-to-coach-defensive-backs-to-play-the-deep-ball);
  [Coach & AD man drills](https://coachad.com/articles/Drills-to-Develop-Man-to-Man-Coverage-Skills-for-Defensive-Backs/);
  [AFQ defensive back techniques](https://americanfootballquarterly.com/article/6352-defensive-backs-techniques-fundamentals-tips-and/);
  [Kelly, 2013 transcript](https://fightingirish.com/news/2013/10/15/brian-kelly-usc-preview-press-conference-transcript-2)
- Lee, [Perception 1976](https://pubmed.ncbi.nlm.nih.gov/1005020/); Hirano et al.,
  [Physiol Rep 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10659946/); Tynan and Sekuler,
  [Vision Res 1982](https://pubmed.ncbi.nlm.nih.gov/7101752/); Vater et al.,
  [peripheral vision review](https://pmc.ncbi.nlm.nih.gov/articles/PMC9568462/)
- McBeath et al., [Science 1995](https://pubmed.ncbi.nlm.nih.gov/7725104/); Postma et al.,
  [2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC3966785/) and [2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5383721/);
  Shaffer and Maynor, [quarterbacks 2011](https://pubmed.ncbi.nlm.nih.gov/21692429/)
- Huesmann et al., [handball 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10591308/); Savelsbergh et al.,
  [2002](https://pubmed.ncbi.nlm.nih.gov/11999482/); Helm et al., [2017](https://pubmed.ncbi.nlm.nih.gov/28628849/);
  Vater et al., [2019](https://pubmed.ncbi.nlm.nih.gov/31631809/); Aksum et al., [2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7596273/)
- NFL Big Data Bowl 2026: [Analytics](https://www.kaggle.com/competitions/nfl-big-data-bowl-2026-analytics),
  [Prediction](https://www.kaggle.com/competitions/nfl-big-data-bowl-2026-prediction); in-repo
  `data/sources.json` (`bdb2026-2023`), `data/bdb2026-summary.json`, `scripts/data/bdb2026.ts`
