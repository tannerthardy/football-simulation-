# Quarterback decision-making research: four sources and what they mean for us

Reviewed 2026-11-13 at the user's request, as input for the quarterback decision-making
work. These are four outside sources; none is NFL tracking evidence we have matched,
and nothing here changes the engine. Companion to the
[LaFleur note](qb-playing-quarterback-lafleur.md) (a coach's rules) and the
[read-compiler design](../research/2026-11-11-qb-read-compiler-design.md).

**How they were read.** Fetched 2026-11-13 through a summarizing page reader, so every
number below is a reading of a summary, not a copy from the paper: check a figure
against the original before citing it anywhere. The Powless paper was read to about
five-sixths of its text (full methods and results; the last part was not). The Kittel
paper (Sage) returned a 403, so only its abstract metadata was read: **its findings
are abstract-level only.** The user's list repeated the Sage link and the MDPI and
Sage titles were not given, so they were identified from the DOIs.

## 1. PFF: Evaluating NFL quarterbacks' decision-making process

[pff.com/news/nfl-evaluating-quarterbacks-decision-making-process](https://www.pff.com/news/nfl-evaluating-quarterbacks-decision-making-process).
Arjun Menon and Judah Fortgang, Pro Football Focus, 2022-07-06. An analytics article,
not peer reviewed.

**Idea.** Public QB metrics (EPA, QBR, PFF grade, CPOE) judge what happened. Separate
the **decision** (the opportunity he creates by picking a target) from the
**execution** (how well he converts it).

**Method.** Two gradient-boosted models on PFF charting from 2019 on (over 50,000
dropbacks). (1) A completion-probability model for every route run, thrown or not, from
situation, route type, the defender's opponent-adjusted ability, separation, men in the
box and similar. (2) A decision model predicting the EPA of throwing to each route. The
"optimal" throw is the highest predicted EPA; the **decision score** is the average
predicted EPA of the throws he chose; **execution** is results above that expectation.
Most important predictors, in their order: completion probability, situation (down,
distance, time), the covering defender's cumulative grade, route type and depth, open.

**Findings (their numbers).**

| Finding | Value |
| --- | --- |
| Average predicted EPA of his decisions vs actual EPA | r = 0.72 |
| Share of throws that were "optimal" vs EPA | weak (they blame selection: every QB gets easy throws right) |
| Execution predicting next year's EPA | R = 0.46, against 0.43 for current-year EPA |
| Execution vs EPA on non-optimal plays / optimal plays | 0.75 / 0.33 |
| Season EPA vs performance on non-optimal / optimal plays | 0.81 / 0.47 |

Brady and Rodgers lead the decision score; Watson and Brees rank high on execution
with weaker decisions; Newton is above average on decisions and worst on execution;
Stafford, Herbert and Prescott are top ten on both. About five or six QBs separate
from the pack at the extremes.

**Limits they state.** Targeted-player data only; PFF's own coverage data (tracking
could cut human error); **they do not know the play call**, so the "optimal" throw is
sometimes a late read the design intended.

**What it helps with.**
- The split is the right shape for our own model. Unlike PFF, the engine **knows the
  call and the designed progression** and has ground truth for every receiver, so it
  can score three things apart: the best option that existed, the option the design
  asked for, and what he chose; then execution on the chosen throw. Ratings affect
  perception and control, so the split also tells us which of the two a rating moves.
- Where QBs differ is on hard and broken plays (execution on non-optimal plays carries
  most of the signal). A QB model checked only on clean pockets would miss it: test
  pressure, off-schedule and late-read throws.
- A caution rather than a target: their "optimal" is a model's prediction, and the
  0.72 is a correlation inside their model. Do not tune toward it.

## 2. Frontiers in Psychology 2025: cognitive abilities and NFL quarterbacks

[frontiersin.org/…/fpsyg.2025.1540498/full](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1540498/full).
Boone, Zambrotta, Manocchio and Bowman, "Head in the game: the impact of cognitive
abilities on performance of National Football League quarterbacks", published
2025-01-29. Peer reviewed; secondary analysis.

**Method.** The Athletic Intelligence Quotient (AIQ; ten tablet subtests, about 35-38
minutes; four subscales: Visual Spatial Processing, Reaction Time, Decision Making,
Learning Efficiency) was taken by 46 draft-eligible QBs at the Combine, 2014-2020; 42
kept (more than three games played). Hierarchical regressions entered draft pick first,
then the subscales; mixed models for yearly PFF metrics.

**Findings (their numbers, as summarized).**
- **Reaction Time** was the steadiest predictor beyond draft pick: games started
  (about 6-7% added variance), career approximate value per year (beta 0.36, 13%
  added), QBR (beta 0.28, 8%), rushing yards per game (0.30, 9%), throwing accuracy
  (b 1.89).
- **Visual Spatial Processing** predicted passing yards per game (beta 0.27, 7%).
- **Decision Making** mattered for **turnover-worthy plays** (b -0.77) and, with
  Visual Spatial, **interacted**: higher spatial scores went with more turnover-worthy
  plays when decision making was average or low, and not when it was high. High on
  both: about 6% more accurate than average on both.
- **Learning Efficiency**: no effect. Big-time throw rate: only draft pick.

**Limits.** N = 42; correlational; no coaching, line or scheme control; draft pick and
games started are proxies; trimmed models and post-hoc interaction tests invite
spurious findings; two small internal inconsistencies (6% in the text, .07 in a table).
One author co-developed the AIQ, so independent replication is the real test.

**What it helps with.**
- **Separate "seeing" from "choosing."** The finding that seeing more options hurts
  unless the choice is good is a clean prediction for our model: a QB with wide vision
  and poor choice should turn the ball over more than one with narrow vision and the
  same choice. Whether our ratings produce it is a cheap 2x2 test on saved snaps
  (`scripts/diag/rating-channel.ts` and the matched restage are the tools). It is a
  check that a rating reaches the field, not a number to match.
- **Latency as its own capacity.** Reaction time was the best single predictor. In our
  model decision speed comes from several places (identification delay, read dwell,
  release); check that processing latency is one capacity that rating
  changes act on, separate from decision noise, before adding anything.
- **Management game.** A combine-style cognitive profile is a natural scouting
  signal with measurement noise; draft position already carries most of the signal.
  Treat it as a hidden-attribute layer for later, not an engine input.
- Do not import the betas. N = 42 and these are variance shares.

## 3. Powless et al. 2020, Sports: video training for high school QBs

[mdpi.com/2075-4663/8/2/18](https://www.mdpi.com/2075-4663/8/2/18) (DOI
10.3390/sports8020018; the MDPI page itself returned 403, text read from
[PubMed Central](https://pmc.ncbi.nlm.nih.gov/articles/PMC7077253/)). Powless,
Steinfeldt, Fisher, McFadden, Kennedy and Bellini, "Utilizing Video-Based Trainings to
Improve Decision Making in High School Quarterbacks", published 2020-02-06.

**Method.** Four high-school QBs (14-18) with different working-memory capacity (a
counting-span score from 0.29 to 0.86). Sideline film of the team's own passes: 119
candidate plays, 51 kept where a QB coach and two outside experts agreed on all four
decisions (212 clips). Each play was cut by **temporal occlusion** at four moments:
**T1** huddle break to just before the snap (what coverage could this be?), **T2** snap
to the corners' first two or three steps (what coverage is this?), **T3** snap until
the QB has the ball and is looking downfield (which route or pass?), **T4** until just
before release (which option now?). Plays where the answer changed from T3 to T4 were
"adaptation sets." Learning modules gave wrong answers a replay and right answers an
expert explanation of the cues ("feedforward"). Single-subject multiple-baseline
design; analysis by visual inspection and improvement rate difference.

**Findings.** No evidence of a causal gain in **accuracy**; **moderate** evidence of
faster decisions (three of four). Mean times: 4.23 s to 2.78 s, 2.21 to 1.41, 2.63 to
2.54, 4.91 to 2.89; accuracy 78.1 to 83.5%, 77.9 to 80.5%, 63.8 to 64.5%, 50.5 to
62.5%. The lowest-working-memory QB improved most (accuracy and speed, and the only
one to get both adaptation items right in one test). All four liked it.

**Limits.** Four boys; ceiling effects for the two stronger QBs; one expert-consensus
answer scored as correct, so valid alternatives were counted wrong; no content
validity statistic; testing effects possible; few adaptation items.

**What it helps with.**
- **A measurement structure we already have.** T1 to T4 is our `QBMind`: pre-snap belief,
  post-snap confirmation, then the throw. The sim could be read at those four moments
  without changing the play, to ask what the QB believes and decides at each, and
  how belief accuracy and latency move with his ratings. This is the sim's analogue of
  an occlusion test and uses its ground truth, which the study had to approximate with
  experts.
- **Decisions have several valid answers.** The study's biggest self-criticism applies
  to any decision score we build: score a **set** of acceptable options, not one.
- **Training moves speed before accuracy** (moderate evidence, n = 4). For a
  management game this suggests film work shortens recognition time more than it
  improves accuracy, and helps the least experienced most. Weak evidence; a design
  hint only.
- **Working memory.** The paper and its sources treat it as attentional control and
  as how many things a player can hold. Our `QBMind` already dead-reckons defenders he
  is not looking at; a cap on how many he can hold would be a candidate capacity,
  only if a decision it changes can be named.
- The literature it cites (expert advantage from search, cues and knowledge, and
  recognition-primed or take-the-first decisions) matches the first-open-throw
  progression: experience should reduce the options considered, not add evaluation.

## 4. Kittel et al. 2026, Int. J. Sports Science & Coaching

[journals.sagepub.com/doi/10.1177/17479541251407997](https://journals.sagepub.com/doi/10.1177/17479541251407997)
(403 from here; metadata read through Crossref). Kittel, Larkin, Lindsay, Broadbent,
Bruce and Wilkins, "Athlete perceptions of in-person training, extended reality and
video technologies for perceptual-cognitive development: a qualitative exploration of
developmental American football quarterbacks' perspectives", published online
2026-01-16.

**Abstract-level only.** Three developmental QBs from an Australian team completed four
training approaches (on-field, 360-degree video, virtual reality, traditional video)
and were interviewed after each; interpretive phenomenological analysis. Themes:
opportunities to train perceptual-cognitive skill (making decisions, **knowing where to
look**, awareness and reflection) and what shapes development (control of movements and
**realism**). All three preferred on-field; two ranked 360 video highest of the
technologies and one VR. The authors use ecological dynamics and ask for longitudinal
work to see whether the perceptions become performance.

**What it helps with.** Perceptions of three players, not performance, so a design hint
at most.
- **Where to look is a trained skill**, which supports representing QB gaze and
  search as acquired behavior (our rule: body facing is not gaze) rather than a
  free view of the field.
- **Realism and movement control** matter to how decisions develop. For a management
  game, training modes could differ in how well they transfer, with on-field reps the
  most realistic.

## What to think about

1. **Decision vs execution on our own plays.** The engine has more than PFF had: the
   call, the designed progression and every receiver's true window. A diagnostic that
   reports the best existing option, the designed read and the chosen option, then the
   execution on that throw, would say whether a bad throw was perception, choice or
   body. Cheapest first: log, per decision, his estimate against the true window (read
   only). Counterfactual replays of a saved snap with each target forced would
   need a forced-target hook that does not exist. Name the decision it would change
   before building it.
2. **Check that seeing and choosing are separate in the model.** A 2x2 on saved snaps
   (perception rating, decision rating) asks whether interceptions rise when vision
   is wide and choice poor, as the Frontiers interaction predicts. If not, find out
   which stage swallows the rating before touching anything.
3. **Probe the four occlusion moments** in the sim, read only, to see belief and
   decision at each and how they respond to ratings. A way to test whether the pre-snap
   and post-snap stages carry information, independent of the throw.
4. **Test hard and broken plays specifically.** PFF's signal is there. Pressure,
   off-schedule and late-read throws are where a QB model could look fine on average
   and wrong in the tail.
5. **Score a set of good answers,** and score against the designed read as well as the
   best option (PFF's missing play call).
6. **Management game, later:** noisy cognitive scouting (combine-style profile), film
   study that mainly cuts decision time, training modes with different realism. All
   weakly supported; keep them as design hints.
7. **Do not:** copy the correlations (0.72, 0.46, the AIQ betas) as targets; add a
   reaction-time or working-memory rating without a named decision it changes; treat
   four small studies as measured NFL behavior. The model rules apply: ratings change
   capacities, perception and control, never a throw's result, and players act on
   acquired, delayed information.

## Not read, worth finding

- Full text of the Kittel paper (Sage 403).
- A 2025 BYU thesis proposing tracking-data QB decision metrics (for example "Decision
  Efficiency"), surfaced in a search and **not reviewed**: it would be the closest
  tracking-based counterpart to the PFF method for our NFL comparison.
