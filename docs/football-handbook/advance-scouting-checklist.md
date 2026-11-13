# Advance scouting checklist and engine coverage

A 46-question scouting sheet for an opponent's defense, and a map of how much of it
the engine can **simulate** (a defense does it), **recognize** (an agent in the
simulation perceives or adapts to it) and **chart** (our logs and tools record it).
It is a reference for the later scouting-and-prep layer and a quick way to see what
the engine lacks. It is not a feature list or a promise to build any of it.

**Source.** The Reamon Report, "Advance Scouting: Opponent Defense" (46 questions, tips
and alerts; @ReamonReport; copyright 2026 The Reamon Report, all rights reserved).
The sheet was supplied by the user as an image. This file keeps only its 46 topic
names, in short form, and its section order; the sheet's tip text and layout are
not reproduced, and every description below is written for this project. Its closing
advice is worth keeping as a rule for any scouting feature we build: **verify the tell.**
Record game, quarter, time, frequency and exceptions before calling it a tendency.

**What was read.** Engine source on develop `516d8729`, by reading code and flag
defaults, not by running games. "Simulated" means a mechanism exists, not that its
frequency matches the NFL (several carry NFL-sourced weights in their comments;
none was validated for this file). Flags are as they default in source. Where a
defense is "simulated", the thing to scout exists; where the answer is "No", a scout
would find nothing to find.

## Result

| | Yes | Partly | No |
| --- | --- | --- | --- |
| Simulated: the defense does it | 23 | 18 | 5 |
| Recognized: an agent in the sim perceives or adapts to it | 16 | 16 | 14 |
| Charted: our logs or tools record it | 10 | 16 | 20 |

Reading it:

1. **The defense is the strong side.** Personnel, fronts, coverage family, shell and
   rotation, motion response, trips and bunch checks, mugs, simulated pressures, red-zone
   and goal-line calls are all produced, mostly with NFL-sourced weights.
2. **Recognition is mostly in-game and mostly the defender's.** Defenders key cues
   (run keys, pullers, play action), the QB reads shell and structure, and both
   coordinators and the defensive run/pass expectation learn within a game. All of it
   starts from league priors each game: nothing carries over between games and nothing
   is prepared for one.
3. **Charting is good for defensive structure and thin for everything else.**
   `PlayPlan` (`src/game/game.ts`) records defensive personnel, front, creep,
   called vs played vs shown coverage, shell, check, pressure and rushers, in the
   same fields as the NFL extractor. It does not record strength, mug, box count,
   motion response, hash, tempo or line games.
4. **The offense does not adapt to a specific defender or to protection.** It adapts
   by play family. No slide or max-protect calls, no pre-snap identification of a
   mugged front, no hot routes, no "attack that corner."
5. **Absent:** read option, field/boundary tendencies, back or motion checks that cancel
   pressure, after-explosive adjustment, and any game plan ("best answers this week").

## The 46 questions

Each row: Simulated / Recognized / Charted, each as Yes, Partly or No, with the evidence.
Paths are relative to the repository root.


### Defensive structure

| # | Topic | Simulated | Recognized | Charted |
| --- | --- | --- | --- | --- |
| 01 | Base front | **Yes.** Front chosen by defensive personnel, down/distance moment and scheme (`src/game/playcaller.ts` MENU/menuWeight; a dozen-plus fronts in `src/playbook/defense.ts`) | **No.** No offensive agent picks plays by the front it sees | **Yes.** `plan.front`, `plan.defPersonnel` |
| 02 | Strength set | **Partly.** Passing/opposite strength drawn per call from the coach's style (`FRONT_STRENGTH`, on). No rule for TE, field or back strength; no reason attached | **No.** Nothing reacts to it | **No.** Not in `PlayPlan` |
| 03 | Box count | **Partly.** Box count is computed from the alignment and backers creep (`BACKER_CREEP`, on). It is a result of front + coverage, never chosen by situation | **Partly.** The offense counts box threats against its protectors (`src/sim/assign.ts` PRO_CALL) | **Partly.** `boxCount` is on the alignment, not in the log |
| 04 | Personnel packages | **Yes.** Base / nickel / dime / heavy / goal line / 3-3-5 by offensive personnel and down, distance, goal line (`defPackage`, `SHORT_PACKAGE`) | **Partly.** The defense's run/pass expectation starts from the personnel it sees (`SnapContext`) | **Yes.** `plan.defPersonnel` |
| 05 | Formation checks | **Yes.** Secondary checks to trips, empty, bunch, stack, nub, iso and reduced sets (`src/playbook/structure.ts` tags; Trix / Book / Stubbie) | **Yes.** The secondary identifies the structure before the snap | **Yes.** `plan.checkedOn` |
| 06 | Motion response | **Yes.** Defense bumps or locks on the motion man (`MOTION`, `MOTION_CHECK`, both on; `src/sim/motion.ts`); the front is held | **Yes.** Defenders read the final formation after a reaction time | **Partly.** The call carries the motion; the response is not recorded |
| 07 | Tempo response | **Partly.** Hurry-up is a clock state: about 16 s between snaps, no defensive substitutions,  defensive substitutions, softer calls when trailing. No alignment or communication cost | **No.** Nothing is learned from tempo | **No.** Only a `hurry` flag in the snap context |
| 08 | Field / boundary tendencies | **No.** Ball position and strength-to-field are computed (`strongToField`) but no defensive decision reads them | **No.** None | **No.** Hash is not recorded as a call input |

### Defensive line and edges

| # | Topic | Simulated | Recognized | Charted |
| --- | --- | --- | --- | --- |
| 09 | Alignment tells | **Partly.** Front stems and creeps change the look before the snap; no stance or weight cue is modelled as a tell. Called line games (`DL_GAMES`) are off by default | **No.** No agent reads a pre-snap tell for a slant or stunt | **Partly.** `plan.stemFrom`, `plan.creepSlot` |
| 10 | Get-off and cadence | **Yes.** Defenders go on the ball movement or time the cadence; hard counts can draw a timer; offside and encroachment emerge from the body (`src/sim/snap-count.ts`) | **Yes.** Cadence timing is the mechanism | **Partly.** Fouls are logged; get-off is not |
| 11 | Gap control | **Yes.** Gap-match fits, live gaps, double-team displacement (`run-fits.ts`, `live-gaps.ts`, `engagement.ts`) | **Partly.** The back reads the key and the lane | **No.** Film or telemetry only |
| 12 | Block reaction | **Yes.** Reach, down, base and pull blocks are physical engagements; defenders react to pullers (`PULL_READ`) | **Partly.** Fits use acquired pictures | **No.** Film or telemetry only |
| 13 | Spill or box | **Partly.** Edge policy is fixed by scheme: 3-4 spills, 4-3 boxes (`runPolicy`); `EDGE_CONTAIN` shapes it. It is not chosen by situation | **Partly.** The back reads where the edge goes (`run-read.ts`) | **No.** Not recorded |
| 14 | Read-option response | **No.** No option, veer or zone-read concepts; the one RPO family tags a run with a screen. No edge-takes-back-or-QB rule | **No.** None | **No.** None |
| 15 | Pass-rush plan | **Partly.** Ten rush moves chosen per engagement from approach and finesse/speed fit (`engagement.ts` `planMove`); lane and contain come from the called pressure. There is no named "best rusher" plan | **Partly.** QB and OL feel pressure; nobody identifies the rusher in advance | **No.** Film or telemetry only |
| 16 | Stunts and screen pursuit | **Partly.** Twists, slants and pinches exist but are off by default (`DL_GAMES`); six screen concepts exist, and screen reaction rides on ordinary run/pass recognition | **Partly.** Defenders keep or change their read from cues | **No.** Not recorded |

### Linebackers

| # | Topic | Simulated | Recognized | Charted |
| --- | --- | --- | --- | --- |
| 17 | Depth and alignment tells | **Partly.** Backer depth comes from the front; box backers creep from anticipation (`src/sim/backer-creep.ts`); called blitzers creep (`BLITZ_CREEP`) | **No.** Nobody reads a creep as a tell before the snap | **Partly.** `plan.creepSlot` for called creeps only |
| 18 | Run keys | **Yes.** Each defender weighs cues his position keys: linemen firing out, guard pull, QB mesh, back's path (`src/sim/recognition.ts`; `READ_EYES`, `FLOW_READ`) | **Yes.** This is the recognition model | **No.** Not recorded |
| 19 | First step and fit | **Yes.** Gap-match fits, backer plans, flow over the top (`run-fits.ts`, `LB_PLAN`) | **Yes.** Fits use acquired pictures | **No.** Film or telemetry only |
| 20 | Puller response | **Yes.** Backers read pullers (`PULL_READ`, on) | **Yes.** Same | **No.** Film or telemetry only |
| 21 | Play-action discipline | **Yes.** Expectation from situation and tendencies makes a defender bite or hold (`Recognition`; `PA_CALL`) | **Yes.** Same | **Partly.** `plan.playAction` |
| 22 | Coverage matchups | **Partly.** Back and tight end coverage comes from the called roles; the man-call rate includes a corner-vs-receiver matchup term (`matchupEdge`). Nobody is picked to cover a back because of what he can do | **Partly.** The QB works progressions by openness, not by matchup | **No.** Not recorded |
| 23 | Blitz and green-dog tells | **Partly.** Blitz is a pre-snap call; creeps are the tell. No post-release "his man blocked, so he rushes" decision | **Partly.** Blitzers from depth are identified by the line after a recognition delay (`blocking.ts`) | **Partly.** `plan.pressure`, `plan.rushers` |
| 24 | Tackling and pursuit | **Yes.** Tackle windows, wraps, pursuit prediction (`tackle.ts`, `pursuit-prediction.ts`) | **Yes.** Pursuit uses acquired pictures | **Partly.** Tackle opportunities captured by `scripts/scorecard/tackles.ts` |

### Secondary

| # | Topic | Simulated | Recognized | Charted |
| --- | --- | --- | --- | --- |
| 25 | Shell vs actual coverage | **Yes.** The call carries a shown shell that may differ from the coverage played, rotating at the snap; the habit depends on the coach and his safeties' recognition (`SHELL_SHOW`) | **Yes.** The QB forms a pre-snap belief from the shown shell and a post-snap read from where defenders go (`src/sim/qbmind.ts`) | **Yes.** `plan.shown`, `plan.called`, `plan.coverage`, `plan.shell` |
| 26 | Corner leverage and cushion | **Yes.** Leverage and cushion come from the coverage technique and physics (`coverage-leverage.ts`, `coverage/techniques.ts`) | **Partly.** Receivers and the QB see where the defender is | **No.** Not recorded |
| 27 | Press technique | **Yes.** Hand contact, mirror and bail through the contact model (`press-contact`, `ARM_PRESS`) | **Partly.** Receivers choose a release against it | **No.** Not recorded |
| 28 | Man / zone / match clues | **Yes.** The motion lock or trade is the clue; coverage roles give the rest | **Yes.** The QB weighs structure and post-snap heading signatures; one traveling defender is not proof (`POST_SIG` in `qbmind.ts`) | **Partly.** Called, shown and played are recorded; clues are not |
| 29 | Safety rotation | **Yes.** Safeties rotate at the snap from the shown shell (`DefensivePlayCall.shown`) | **Yes.** The QB reads it after the snap | **Yes.** `plan.shown` vs `plan.coverage` |
| 30 | Trips and bunch checks | **Yes.** Poach, Trix, Book and Stubbie checks by structure, and the coordinator moves to the other check if the offense beats the first (`checkPrefer`) | **Yes.** Structure identification | **Yes.** `plan.checkedOn` |
| 31 | Run support and force | **Yes.** Force and alley fits (`force-track.ts`, `run-fits.ts`) | **Partly.** The back reads fitters | **No.** Film or telemetry only |
| 32 | Player to attack or avoid | **Partly.** The defense shadows or doubles the best receiver (`coach.shadow`, "Zeus"). Individual weaknesses come from ratings and physics | **No.** The offense adapts by play family, never by the defender it is attacking | **No.** Not recorded |

### Pressure and protection

| # | Topic | Simulated | Recognized | Charted |
| --- | --- | --- | --- | --- |
| 33 | When they pressure | **Partly.** Blitz rate from the coach, a bump on 3rd and 3-8, the QB's pocket presence, a cut when trailing in a hurry, and the shell behind it (`PRESSURE_BY_SHELL`) | **No.** The offense does not learn blitz tendencies; the learned tendencies are run/pass only | **Yes.** `plan.pressure`, `plan.rushers`; down, distance, zone and personnel splits in `scripts/scorecard/metrics.ts` |
| 34 | Where it comes from | **Partly.** Each pressure names its blitzers by slot (`src/playbook/defense.ts`). The trigger is a draw, not field, TE or back strength | **No.** None | **Partly.** Pressure name is in the play label, not a field |
| 35 | Mugged front response | **Yes.** Mugs of one or two backers with a pressure package at tracked shares (`MUG_CALLS`, `MUG_PRESSURES`, on) | **Partly.** Protection finds the blitzers after the snap; no pre-snap identification or slide | **Partly.** Label only |
| 36 | Overload and edge pressure | **Partly.** Pressures can bring more than the protection holds (for example `zero_6`) | **Partly.** Protectors are counted against box threats and a back stays in short of the count; no slide protection | **Partly.** `plan.rushers` |
| 37 | Simulated pressure | **Yes.** Four-man pressures with a dropper (Whip, Slug, Sting), favored by two-high trees | **No.** Nothing identifies it before the snap | **Partly.** `plan.rushers` equals four with `plan.pressure` true |
| 38 | Coverage behind pressure | **Partly.** Only pressures installable behind the called coverage are used (`pressureIsInstallable`); zero keeps a pressure | **Partly.** The QB reads whatever is open after the snap; no hot or sight adjustment was found | **Partly.** Coverage and pressure are both recorded |
| 39 | Back and motion checks | **No.** Motion and shifts keep the front and the pressure; nothing cancels or redirects it | **No.** None | **No.** None |

### Situations and game-plan answers

| # | Topic | Simulated | Recognized | Charted |
| --- | --- | --- | --- | --- |
| 40 | Early-down tendencies | **Yes.** Fronts and coverages are weighted by down and distance (`EARLY_DOWN`, `MENU`) | **Yes.** Both coordinators and the defense's run/pass expectation adapt within a game | **Yes.** Down, distance and zone splits |
| 41 | Third and fourth down | **Partly.** Third-down weights are distinct (short, medium, long). Fourth down is treated like third | **Yes.** Same adaptation | **Yes.** Same splits |
| 42 | Red zone and goal line | **Yes.** Goal-line personnel, bear front, zero and single-high weights inside the 5 and 20 | **Yes.** Same adaptation | **Yes.** Field-zone split |
| 43 | Two-minute and end of half | **Partly.** Hurry with a deficit softens coverage and cuts the blitz. No sideline protection or clock-context rule | **Partly.** The offense's calls change with hurry | **Partly.** `hurry` in the snap context |
| 44 | After explosives and sudden change | **No.** No momentum or after-explosive adjustment; explosive plays are only counted | **No.** None | **Partly.** Explosive-play counters in team stats |
| 45 | Repeated success and counters | **Partly.** In a game, each coordinator shrinks his calls toward what has worked (`learned`); the defense also moves between trips checks | **Yes.** Both coordinators, the defense's run/pass expectation (`ScoutingReport`) and the QB's coverage expectation (`CoverageScouting`) update within a game | **No.** Not charted |
| 46 | Best answers this week | **No.** No game-plan layer; every game starts from league priors (`new ScoutingReport()` and `new CoverageScouting()` in `Game`) | **No.** None | **No.** None |

## If we build scouting and prep

- **Cheapest first.** Add to `PlayPlan`: strength, mug, box count, motion kind and
  response, hash, pressure id, tempo and called line game. These already exist in the
  call or alignment, so recording them reads state and needs no football change.
- **Cross-game memory.** `ScoutingReport` and `CoverageScouting` are created per game.
  A prep layer would persist them by opponent and let a user or coordinator seed them.
  Keep the sheet's rule: a tendency needs frequency and exceptions, which the shrinkage
  in both classes already does.
- **Football gaps a scouting sheet would expose** (Absent or Partly above): read option,
  boundary/hash decisions, protection calls and identification, hot or sight
  adjustments, after-explosive and two-minute behavior, targeting a specific defender,
  and a defensive pressure decision that reads the offense after the snap.
  Model rules still apply: fix a bad decision in the controller, give players only
  acquired information, and never tune toward a sheet or a number.
- **Handbook neighbors.** [Defense and perception](defense-and-perception.md),
  [Playcalling and schematic packages](playcalling-and-schematic-packages.md) and
  [Data and measurement](data-and-measurement.md) cover the coaching and NFL-data side
  of these questions.
