# Spread versus air raid: user film notes and agent handoffs

Prepared October 14, 2026 (America/Phoenix); diagnostic receipts use UTC.

**All 21 user observations are recorded, with recommended owners and complete
copy-paste prompts.** They are not 21 confirmed bugs. Plausible plays, uncertain
technique questions and confirmed modeling/recording failures remain distinct.
The user considers unlisted plays normal; automatic diagnostic flags are not
a reason to turn every unlisted play into a new workstream.

[Open the 21 annotated original clips](../../data/reviews/current/spread-air-film-notes/index.html) ·
[Observation/fact index](../../data/reviews/current/spread-air-film-notes/review.json) ·
[Missing-state diagnostic receipt](../../data/reviews/current/spread-air-film-notes/prefix-receipt.json) ·
[Full diagnostic trace](../../data/reviews/current/spread-air-film-notes/prefix-trace.json.gz) ·
[Publication receipt](../../data/reviews/current/spread-air-film-notes/receipt.json)

## What to share, and with whom

These are the existing chat names, checked through their recent status. No
messages were sent and no new agent/chat was created. Proposed routing does
not claim that another owner has accepted an assignment or changed priorities.

| Destination | Send this complete prompt | Scope / priority |
| --- | --- | --- |
| **Catching And Defensive Pursuit** | [Catching, coverage and readiness handoff](spread-air-handoffs/catching-and-defensive-pursuit.md) | Start P004/P024 protection-only incidental catches versus P034's valid check-release; include P023's hidden deflection and P043 geometry. Coverage P002/P003/P045 follows existing #58 work. |
| **Run Game** | [Exchange and protection handoff](spread-air-handoffs/run-game.md) | P038 exchange first, reusing #57; wide-rush protection P005/P018–019/P040 is a separate next question. |
| **Do-It-All!** | [Runner, guard and awareness handoff](spread-air-handoffs/do-it-all-run-awareness.md) | P009/P011/P033/P037/P039 feed the existing lane, climb and traffic investigation. Coordinate function boundaries with Run Game. |
| **Integration — keep here** | [Rules and credit handoff](spread-air-handoffs/integration-rules-and-credit.md) | P022 enforcement/acceptance, failed-exchange rushing attribution, intended versus achieved air yards; one eventual combined verifier. |
| **CEO of Football — bounded consultation** | [Coaching assignment questions](spread-air-handoffs/ceo-football-assignment-contracts.md) | Green-dog versus stay/spy, legitimate alignment spacing, PA/match responsibilities, concept fit and legal throwaway. Design evidence, no new controller branch. |
| **Physics Sim — conditional only** | [Mechanical escalation boundary](spread-air-handoffs/physics-conditional-escalation.md) | Send when a controller owner identifies an implausible achieved response to a coherent request. These clips alone do not justify another physics campaign. |

Each prompt is self-contained: exact game/source, original and annotated film
paths, play IDs/times, native data, flags/API settings, compatible prior work,
factual corrections, opposing controls, scope and marginal-cost policy. Paste
the relevant file's entire content into the named chat. Do not send the same
implementation problem to several agents with overlapping file ownership.

### Existing work to reuse

- **Run Game [PR #57](https://github.com/tannerthardy/football-simulation-/pull/57)**
  already diagnoses ordinary-run coordination and the failed shotgun exchange,
  including three exact full-game diagnostic replays. Those games need not be
  repeated for this handoff.
- **Catching And Defensive Pursuit [PR #58](https://github.com/tannerthardy/football-simulation-/pull/58)**
  has an isolated receiver-blocking recognition correction, 66 focused checks
  and selected native controls. It is not merged. Compare its current source
  before duplicating the earlier false-run-read diagnosis; new catch-readiness
  findings are a different contract. Preserve its adverse rushing evidence.
- **Do-It-All!** is already working on lane/climb/clearance decisions, including
  the smallest clear detour and a defender-risk veto. Its current candidate is
  not included in the frozen film. New notes supplement that work rather than
  initiating another avoidance system.

## Important distinctions established from this review

**P004 and P024 are not QB-selected dump-offs.** In P004 the QB targets Z;
permanent protector Y catches at 2.35 s with a .86817 first-window chance. In
P024 the QB targets X; permanent protector RB catches at 1.70 s with a .67099
first-window chance. Both protectors have `passOption=false`, no release
installed and no engagement at that opportunity. The catch resolver's legal
eligibility test is not an acquired-readiness contract. Emergency eligible
catches are allowed; the question is why these players receive routine catch
opportunities without a corresponding modeled acquisition/transition.

**P034 is an opposing control.** Its RB is installed as check, becomes a route
runner at 1.30 s and is targeted at 2.20 s. He is not still a protection-only
player. Preserve check-releases and distinguish initial assignment from current
behavior when reading the film.

**P023 is a hidden incidental catch failure, then an interception.** A released
RB fails a .43975 receiver-contest chance at 2.05 s. The ball changes to the
deflected state without an explicit drop/PBU/line-bat event; DT_W intercepts
on the next tick using the .18265 deflected-ball chance. This mechanism was
not recoverable from event labels alone. It does not establish the league-wide
share of tipped interceptions or justify changing all defensive hands.

**P043 is a real failed opportunity, not an established easy drop.** Z fails a
.57542 first-window chance. The segment endpoint is 2.96 yd high; reconstruct
the actual segment point, horizontal extension, height and ball speed before
grading its difficulty. The absence of a drop label does not mean there was
no failed catch window.

**P003 has no recorded defender run declaration.** Its NB declares pass at
1.10 s and SS at .85 s. A hesitant read step and a committed run bite are
different. The user's plausible-PA-win assessment should remain a control,
not become an assertion that PA always works.

**P022 is a down/spot tradeoff, not simply 8+10 yards.** Holding is accepted
and nullifies the sack. From 1st-and-10 at own 35 the next snap is 1st-and-24
at own 20.95; declining would preserve roughly 2nd-and-18. The current rule
uses `stats.attempted` to identify a pass for enforcement, making a sack choose
different spot logic from a thrown pass. Verify the authoritative NFL rule
and evaluate both complete states before declaring the acceptance wrong.

**P045 is Quarters MOD match, not Cover 0.** Route ownership, leverage and
post-catch support need review under the actual call.

## Every observation, retained

User observations are paraphrased in `review.json`, separately from verified
facts. `Pnnn = log.index+1`, including kicks; film IDs look like `G1-P004`.

| Play | User concern / assessment | Routing and interpretation |
| --- | --- | --- |
| P002 PA Post-Dig | Man technique, crowded defense, defender's job when his man blocks | Catching/coverage + CEO contract. SS marks TE Y; two defender center pairs begin .57/.90 yd apart. Correct formation-specific spacing remains open. |
| P003 PA Shot | Apex bites; plausible play, worry about reliability | Coverage follow-up. No hard run declaration in events; preserve plausible deception. |
| P004 PA Shot | Blocking TE suddenly catches near a sack | Catch-readiness priority. QB targets Z; permanent-protection Y intercepts the path. |
| P005 Drive | LT loses a wide rush; quick release masks severity | Run Game protection. Shed 1.70 s, throw 1.90 s; retain normal completion. |
| P006 Slant-Flat | Believable play; perhaps a better read existed | Keep normal control. No demonstrated missed QB alternative. |
| P009 Outside Zone | RB cutback into defenders; center execution uncertain | Do-It-All! + Run Game. C/LG share DT_W; C climbs 1.80 s. Trace keeper/runner arrival. |
| P010 Levels | Convincing corner INT despite excessive aggregate INT rate | Keep positive defensive control; no global hands nerf inferred. |
| P011 Trap | RB undercuts guard toward Will; collection is slow | Do-It-All! + Run Game. RG traps DT_S; LG climbs toward LB_W at 2.40 s. Verify achieved protection. |
| P012 Levels | Covered play, hit/fumble believable; concept/throwaway question | Keep fumble control. CEO/QB review must establish a legal, attainable alternative. |
| P018 (actual Drive), adjacent P019 Y-Cross | Repeated wide-rush losses | Run Game protection. Include both adjacent clips to preserve the intended observation. |
| P022 Curl-Flat | Holding accepted after sack seems wrong | Integration: spot/down/value and NFL enforcement review; no blanket decline-after-sack rule. |
| P023 Stick | Apparent bat into INT | Catching: RB failed incidental catch deflects it, then DT_W catches. Missing event distinction matters. |
| P024 Slant-Flat | Protection RB catches a dump-off, then plausible YAC | Catch-readiness priority. Intended X; actual permanent-protection RB. |
| P033 Inside Zone Weak | RB bounces despite apparent inside seal | Do-It-All! acquired read versus achieved seal, attainable turn and traffic override. |
| P034 Y-Cross | RB labeled protection seems an invalid target | Keep legitimate check-release control: route 1.30 s, throw 2.20 s. |
| P037 Power | Successful gain hides a lost guard | Do-It-All! pull/climb. LG pulls to NB; +45.51 yd is not a path-quality certificate. |
| P038 Wide Zone Weak | Failed handoff and awareness deadlock | Run Game first, already diagnosed in #57. Integration handles rushing credit. |
| P039 Inside Zone | Plausible DT win; verify shedding/guard execution | Joint run review. No explicit shed event; distinguish penetration while engaged. |
| P040 Y-Cross | Wide edge rush beats protection again | Run Game: LT shed 1.75 s, pressure 2.40 s, sack 3.00 s. |
| P043 Speed Outs | Apparent easy catch fails, possibly high ball/hands | Catching lower priority: measured opportunity fails, difficulty/calibration unresolved. |
| P045 Y-Cross | Lost top leverage and man technique | Coverage: actual Quarters match, 49.52 YAC after a 2.5-yd-separation catch, no recorded carrier attempt/contact. |

An offline count of the same saved spread/air game finds at least one recorded
`pass: turned the corner` shed before/at release (or before ending without a
throw) on **81/104 pass calls**, including flagged plays. This establishes
recurrence of that engine event label. It is not a measured NFL speed-rush loss
rate and does not prove every shed or request is wrong.

## Evidence, cost and preservation

Original runtime: `f62511a513f2187884d74ae3b94435835e43309c`, source
`dd173a3ef44f22b5ee74f3cc17ef15b2137203cea58dd2fa12fbaad12c4784ba`.
Original game SHA256:
`15e553e26449ff44806293f1611bffd3362cbf2e4dd80d3f1447f0264681057f`.
Roster input SHA256:
`c1c7cef835d143da40c62e6572e6e1d024dff281058a98215ecb78c93e6b5870`.

A deterministic prefix was needed to settle otherwise unrecorded receiver
opportunities/deflection and readiness. There were **two attempts, each 35
physical scrimmages**, because the first verifier compared in-memory JS values
against JSON and rejected omitted `undefined` fields and signed zero. The
corrected verifier compares the exact JSON storage contract, preserving every
native field except newly collected telemetry. The successful attempt matches
**all 45 native log entries, positions, profiles and events**. It takes 7.54 s
internally; both launchers together take about **16.2 s wall**. The failed
launcher receipt remains preserved.

The full recorder and passive wrappers request no new observations/random
draws. No candidate behavior changes, new rosters, completed full games or
shared-suite runs occurred. Original games, source/settings, adverse evidence,
receipts, active workers and references remain unchanged. The viewer shows
original film, not a resimulated animation. New trace data are a shared
diagnostic receipt, not a request for every contributor to repeat the replay.

Runtime, flags/input hashes, exact native matches, Python/JS syntax,
documentation links and all 21 annotated selections/seeks are checked. The
publication receipt records artifacts and limitations. `develop` and historical
`4ded6b6` are unchanged. No messages were sent to other agents.

The bounded diagnostic command is preserved in
`prefix-launcher-normalized.json`; run it again only for a new question.
Offline annotation export is:

```sh
python scripts/diag/spread-air-film-notes.py
```

Follow [the existing marginal-cost policy](../TESTING_COSTS.md). A new risk
or failed focused control can justify another diagnostic; another conversation
or handoff does not justify another suite/game campaign.
