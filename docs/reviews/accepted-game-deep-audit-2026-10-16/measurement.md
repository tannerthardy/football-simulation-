# Measurement: complete saved-cohort census and accounting

**Evidence access:** [Download the audit bundle, scripts and detailed ledgers](https://github.com/tannerthardy/football-simulation-/tree/23d5f6d4f7e88fdd3225a49cc74ae5582a52522e). Paths below refer to files inside that bundle; [report and reproduction guide](README.md). Source links pin the measured accepted engine.

This appendix screens **all 740 native logs, 561 physical observations and 559 full-telemetry scrimmages**, including 28 nullified snaps. It finds three source-qualified accounting losses: one defensive touchdown omitted from team turnovers, one safety omitted from sack/tackle/yardage credit, and eight pressure credits lost when the QB becomes a scrambler. These are bookkeeping findings; the distributions below do not classify football outcomes as defects.

Runtime/evidence remain accepted `70b4db6a3ef53acc1a0e90cd055f1087205daa30`, source SHA256 `9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941`, immutable data root `b9b9c17597970ddc87aa4a4e271fc4cfeef71909`. No engine, tests, simulation, dependencies, capacities or source/configuration changed. The existing hash verification is reused. Analysis uses the coordinator's exact per-play splits and `auditlib.py`, one play at a time.

## Exposure and accounting boundary

| Game | All logs | Filmed scrimmages | Nonnullified | Nullified | Physical tries without film | Known nonnullified endpoints |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| G1 /701 |199|147|135|12|1|135|
| G2 /702 |185|145|140|5|1|140|
| G3 /703 |158|123|117|6|0|114|
| G4 /704 |198|144|139|5|0|138|
| Total |740|559|531|28|2|527|

The 740 logs contain 193 called runs, 366 called dropbacks, 64 kickoffs, 42 punts, 41 extra points, 13 field goals, 13 kneels, 6 presnap penalties and 2 two-point tries. Only the 559 run/dropback rows have film. The two tries, **G1-P093 and G2-P181**, have initial rosters/condition and passive physical observations, but no native events, final positions or telemetry. All 179 other rows remain audited as log/statistical context; they cannot support assignment/contact film claims.

All four games completed without a failed/retried/unrun game. **G3-P003, G3-P087, G3-P141 and G4-P142** reached the 25-second snap cap. Their terminal football gain is unknown. They remain in exposure and play counts, while terminal gain/stuff/YAC comparisons exclude them. Native administrative rush gains are respectively −4.30, −4.33, −4.46 and −4.30 yards; the analysis never substitutes these for a completed football ending. G4-P142 remains in the ordinary panel and G3-P087 in the separately labeled tail panel.

The exact 740/561/559/531 ID lists and all 28 nullified IDs are preserved in `measurement/summary.json.ids`. All 48 fixed ordinary anchors and 12 fixed tails received the same measurement screen; their exact IDs and results are in `measurement/panel-measurement-screen.json`. That anchor screen supplements the complete census. It does not replace it or supply whole-cohort defect frequencies.

## Ranked observed accounting findings

### MEAS-DA-01 — defensive touchdown bypasses team turnover credit

**Observed 1 of 36 official takeaways; source-qualified.** G1-P156 starts with A1 at its 52.4, third and 14, Q4 clock 816. A1-QB1 throws at 1.80; H1-LB1 intercepts at 2.55, fumbles at 4.45, recovers his own return fumble at 5.60, and scores at 10.70. The final A1 QB line correctly has 9 interceptions, and H1 defenders total 9 interception credits; A1 team turnovers is 8. No lost offensive fumble explains the gap.

`Game.scrimmage` handles a defensive touchdown and returns before the later `r.turnover` branch increments the offensive team's turnovers ([game.ts](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/game/game.ts), lines 678–702). The returner's fumble does not restore offensive possession. This is an accounting loss, independent of whether the return's football execution is convincing.

**Control:** ordinary G1-P141, H1-QB3 throw 2.40 → A1-S1 interception 3.00 → H1-TE2 tackles the returner 3.90. H1's two interceptions reconcile with its two team turnovers. Actor/team attribution must follow the return: the tackler is now an offensive player.

**Smallest owner action:** Game/statistics should count the takeaway once independently of the scoring branch, retaining the scoring and return-fumble sequence. No contact/controller change is implicated by this finding.

### MEAS-DA-02 — safety bypasses the underlying sack/tackle and yardage credit

**Observed 1 of 1 safety endings; source-qualified.** G2-P140 is a called Mesh dropback by A2-QB2 from its own 5, first and 10, Q4 clock 762. H2-EDGE4 grasps the QB at 2.55. The sampled tackle bond continues through 2.80; the safety event occurs at 2.80, and its credited spot is x7.502919, giving a native −7.50-yard gain from LOS 15. The result has no attempt, scramble, sack, passer or tackler credit. H2 receives the correct two points.

`PlaySim.finishCarry` returns from the safety branch before its later sack/tackler logic ([playsim.ts](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/playsim.ts), lines 788–811). `Game.recordStats` consequently records no offensive gain for this dropback ([game.ts](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/game/game.ts), lines 999–1056). G2's summed team yardage is 918.42, exactly 7.50 above its 910.92 official native log yards. The result also explains why 340 called dropbacks comprise 301 attempts + 19 sacks + 19 scrambles + this one safety.

**Control:** ordinary G2-P093, same A2-QB2 and H2-EDGE4: contact 2.60, sack 2.90, native −7.48 yards, sack/tackler credit present. It ends in the field rather than the end zone. The safety's physical validity is separate from this demonstrated missing credit.

**Smallest owner action:** preserve the safety result while recording the underlying tackled prethrow QB result and responsible defender. Resolve the safety yardage convention at the PlayResult/Game statistics boundary: native log −7.50 versus zero box yardage is established, but goal-plane clipping could instead credit the 5 yards available to the goal line. This audit does not certify −7.50 as the correct final box value. Do not infer a pressure cue that was never emitted.

### MEAS-DA-03 — scramble branch discards existing player pressure credit

**Observed 8 of 51 official pressure cues; source-qualified.** The eight IDs are G1-P127, G1-P162, G1-P187, G2-P083, G2-P138, G3-P032, G3-P142 and G4-P082. All contain `pressured=true` and a valid defensive `hurriedBy`, followed by `scramble=true`. Defensive player box scores contain 43 pressure credits rather than 51. The missing total is exactly these eight cues.

G2-P138 supplies a trace: A2-EDGE2 earns the pressure event at 2.60 against H2-QB1, carrier contact 2.70, scramble event 3.50 and tackle 3.65. The pressure occurred before the controller changed phase. A scramble label describes that controller transition; it does not prove the requested escape was achieved.

**Control:** ordinary G2-P038 has the same H2-QB1/A2-EDGE2 pair: pressure 1.95, contact 2.05 and sack 2.30. Its pressure survives the non-scramble pass branch. `Game.recordStats` places `hurriedBy` credit inside that branch ([game.ts](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/game/game.ts), lines 1048–1053).

**Smallest owner action:** credit the already-recorded `hurriedBy` once outside the rush-versus-pass yardage split. This does not broaden the definition of pressure or diagnose the scramble choice.

## Integrity, roster and context checks that passed

All 561 physical observation joins reconcile with chronological native logs, declared concept, down, yardline and native clock rounding. Python's ties-to-even `round()` is deliberately avoided: G3-P087 starts at native clock 880.5, logged 881 by JavaScript's rounding. There is no join defect.

Every physical lineup has 22 distinct players, 11 on each side, all belonging to the correct frozen roster. All 424 roster identities are distinct; 216 players receive physical scrimmage exposure. Listed position and live slot remain separate: a CB playing FS or an EDGE playing DT is not an actor-ID mismatch. Every recorded event index, statistical actor, possession segment and required offensive/defensive stat side resolves to the correct snap participant. Receiver, intended target, interceptor and return tackler are kept distinct.

All 27,784 positional frames pair with 27,784 telemetry frames at identical strictly increasing times, covering 611,248 agent/frame samples. Agent array dimensions match 22 players. Replay LOS equals 10 + the offense-relative yardline, and the display flip agrees with the possessing side. Both offenses physically attack +x; away-film display flipping does not reverse the coordinates used for measurement. All 740 native log contexts pass basic down/clock/yardline/team bounds and same-quarter clock-order checks.

For all eight teams, player snap counts equal the 559 filmed physical exposures, including nullified snaps; player attempts, completions, receptions and interceptions reconcile with official result flags. Player passing minus sack yards plus rushing yards equals each team's reported total. That last identity is an internal consistency check, and does not conceal the safety omission above. All 173 official completion gains equal achieved catch depth + native YAC within 0.011 yard. Two official catches differ from the intended target (G2-P108: H2-WR1 → H2-TE1; G3-P051: A3-TE2 → A3-RB2); they remain correctly attributed to the actual receiver. The complete census finds no credited rusher whose first-contact YBC actor is a different carrier.

Scores reconstruct exactly as 71–38, 34–27, 31–19 and 73–49. The 342 points comprise 43 scrimmage TDs (42 offense, 1 defense), 41 successful extra points, 13 successful field goals, one successful two-point try and one safety. Both teams' possession clocks sum to 3,600 seconds in each game. Kicker/punter box counts and log prose remain available; special teams have no positional telemetry. The safety free kick is executed by a separate unlogged native path, so the 64 logged kickoff rows do not include that event. Kickoff/punt prose, initial field coordinates and conversion labels are not full special-team film.

Native `team.plays` counts the 531 official physical scrimmages. The 13 unfilmed kneels alter field/down/clock and third-down accounting but do not enter native player rushes, yards, snaps or team.plays. Therefore 544 official scrimmage-plus-kneel log actions and 531 native box plays describe different operators; this appendix does not silently combine them. Six presnap fouls plus 28 accepted/nullified live holds produce 34 accepted penalties; eight additional live holds were declined.

## What the metrics mean

**Pressure:** 51/340 official dropbacks emit the QB controller's specific cue: estimated pressure time <0.7 seconds and distance <2.5 yards. It is evaluated in particular controller phases and bypassed while held or winding up. Five of the 19 official sacks have no emitted pressure cue (G1-P063, G2-P084, G2-P093, G4-P010, G4-P161). This is not evidence that those rushes exerted no pressure. `pressureCalled` is the defense's call, a different quantity. None of these operators is offered as an NFL-comparable pressure rate.

**Throw/catch:** `timeToThrow` is time from snap to actual release for 301 attempts; three throwaways have no intended depth, leaving 298 intended-air-yard observations. Intended depth is LOS-to-aim point; achieved completion depth is LOS-to-actual receiver catch position. The 173 achieved completions have median 6.78-yard catch depth and 3.30 native YAC; p10/p90 YAC are −0.17/23.85 yards. These marginal distributions do not show whether an individual throw, catch choice or pursuit was correct.

**End-zone YAC:** 19 official completions have negative native YAC. Six are goal-plane accounting artifacts: G1-P137, G2-P067, G3-P149, G4-P048, G4-P099 and G4-P164. For example, G4-P048 H4-WR1 catches and scores at 2.70, x117.452, with no post-catch advance. Native achieved air yards 8.052 + YAC −7.452 = the 0.60 yards available to the goal line. This negative YAC is not a backward run. The other 13 negative cases are distinct; control G2-P024 H2-WR6 catches at 5.10/x105.034 and is credited down at x102.444, yielding −2.590 YAC. Retain actual catch coordinates and goal-plane credit separately before making any comparison about receiver advance. The six artifacts total −22.841 native YAC yards.

**Run entry/contact:** 191 official called runs contain 187 known endings and 4 unknown caps. 182 known runs have first carrier contact; five finish as TDs without an emitted contact. YBC is the first opponent body collision or successful grasp, relative to LOS; it is not the location of the first missed tackle or merely a nearby defender. All 182 YBC actors agree with the eventual credited rusher in this cohort. Median YBC 0.99 yards applies only to those 182, and does not assign zero to the other nine. A visible held-rusher crossing of LOS appears in 144/191 calls; 43 known runs stop before it, five contact-free TDs are included among crossings, and four caps never exchange. Median crossing time 2.60 seconds applies to the 144 observed crossings at 0.1-second cadence, not to all runs or an intended crease.

**Contact and falls:** 357/531 official snaps have a valid same-carrier, no-transfer first-contact-to-terminal-stop interval: median 0.75 seconds, p90 1.20, maximum 8.70. 170 official snaps lack that interval and 4 are capped. This is elapsed time, not continuous restraint. G3-P146 H3-TE1 is contacted 4.05 and stopped 12.75; Physics separates the broken initial hold and later re-engagement. G2-P063 H2-CB2 is an interception returner, contacted 3.55 and stopped 7.80, so its 4.25 seconds are not offensive runner contact time. The all-carrier interval must not be mislabeled a rushing-only tackle statistic.

There are 872 official fall events across 452/531 snaps: 490 offensive and 382 defensive. Called runs account for 362 events on 185/191 snaps; dropbacks 510 events on 267/340. The 28 nullified snaps add 44 falls on 22 snaps. Events can repeat for one player and are neither tackle counts nor proof of bad balance. The passive all-step teammate observer reports 2,589 positive-impulse rows across all 561 observations; those rows are reports, not distinct collisions. Sampled last-step contact rows cannot recover complete force, work or torque histories.

## Condition correctness and exposure

The 561 physical starts supply 12,342 player-energy exposures, all within [0, 1]: median 0.9823, p10 0.9593, minimum 0.7477. The minimum includes an unfilmed try; the minimum among official filmed snap starts is 0.856661. The 559 films supply 12,298 last-sampled player energies (the two tries' 44 endings are unavailable): median 0.94, p10 0.88, range 0.21–0.99. These are player exposures, not 424 independent player means.

Condition persists across snaps and recovers between them. In capped G4-P142, H4-OT2 reaches sampled energy 0.24 at 24.90; he starts G4-P143 at 0.856661 after native recovery, rather than resetting to 1. G3-P141 A3-OT4 reaches the cohort's sampled minimum 0.21 at 24.90. Film's last sample can precede the actual play endpoint by 0.05–0.10 seconds, so exact end-to-next-start work/recovery budgets cannot be reconstructed from rounded film. These observations establish range, identity and persistence; they do not validate fatigue calibration or justify a stamina/condition project.

## Descriptive distribution tables

All following tables exclude nullified snaps. Throws/completions/interceptions use their own denominators; sacks and scrambles remain called dropbacks. Differences combine call, roster, score, field and condition exposure and are not controlled patch effects. The full machine-readable census also groups exact coverage ID, formation, front, offense, personnel, quarter, down, distance, score context, pressure call and play action, plus joint concept×coverage cells with explicit `n` and metric-specific sample counts.

### By game

| Game | Official snaps | Runs / dropbacks | Throws / completions | Pressure cues | Sacks / scrambles | INTs | Fall events |
| --- | --- | --- | --- | --- | --- | --- | --- |
| zone-reference | 135 | 50 / 85 | 72 / 38 | 21 | 7 / 6 | 11 | 206 |
| spread-air | 140 | 48 / 92 | 80 / 43 | 16 | 7 / 4 | 9 | 226 |
| power-zone | 117 | 53 / 64 | 56 / 32 | 8 | 3 / 5 | 6 | 212 |
| west-spread | 139 | 40 / 99 | 93 / 60 | 6 | 2 / 4 | 8 | 228 |

### Called runs

| Concept | Calls / known endings | Median known gain (yd) | YBC n / median (yd) | Observed LOS crossings / median t (s) | Fall events |
| --- | --- | --- | --- | --- | --- |
| counter | 25 / 25 | 3.38 | 25 / -0.86 | 14 / 3.40 | 51 |
| draw | 11 / 11 | -1.42 | 11 / -2.59 | 3 / 3.00 | 17 |
| duo | 25 / 25 | 4.29 | 23 / 1.63 | 25 / 2.50 | 47 |
| insideZone | 30 / 30 | 3.90 | 30 / 0.95 | 24 / 2.60 | 63 |
| outsideZone | 29 / 25 | 2.18 | 25 / 0.99 | 18 / 2.50 | 61 |
| power | 20 / 20 | 3.77 | 19 / 1.41 | 19 / 3.00 | 41 |
| splitZone | 3 / 3 | 1.61 | 3 / 0.25 | 2 / 2.55 | 4 |
| toss | 4 / 4 | 5.14 | 4 / 4.04 | 3 / 2.80 | 6 |
| trap | 15 / 15 | 1.97 | 15 / 0.99 | 12 / 2.85 | 30 |
| wideZone | 29 / 29 | 2.43 | 27 / 1.00 | 24 / 2.65 | 42 |

### Called dropbacks

| Concept | Dropbacks | Throws / completions | Pressure cues | Sacks / scrambles | INTs | Median release t (s) | Median completion YAC (yd) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| comebacks | 26 | 21 / 10 | 12 | 3 / 2 | 0 | 3.35 | 1.15 |
| curl_flat | 20 | 18 / 10 | 3 | 1 / 1 | 4 | 2.55 | 5.05 |
| dagger | 19 | 18 / 9 | 1 | 1 / 0 | 1 | 2.40 | 6.11 |
| drive | 25 | 22 / 16 | 1 | 0 / 3 | 0 | 2.38 | 6.52 |
| flood | 13 | 10 / 6 | 5 | 3 / 0 | 2 | 3.15 | 5.58 |
| four_verts | 29 | 22 / 13 | 3 | 0 / 7 | 3 | 2.05 | 5.62 |
| hitches | 19 | 19 / 13 | 2 | 0 / 0 | 2 | 2.30 | 0.20 |
| levels | 25 | 24 / 15 | 2 | 1 / 0 | 1 | 2.45 | 2.65 |
| mesh | 31 | 30 / 17 | 0 | 0 / 0 | 4 | 2.05 | 1.98 |
| pa_flood | 8 | 5 / 3 | 3 | 1 / 2 | 0 | 3.15 | 1.61 |
| pa_post_dig | 21 | 20 / 10 | 4 | 0 / 1 | 4 | 2.62 | 2.00 |
| pa_shot | 18 | 14 / 6 | 8 | 4 / 0 | 1 | 2.70 | 6.65 |
| quick_outs | 13 | 12 / 6 | 3 | 1 / 0 | 3 | 2.38 | -0.08 |
| slant_flat | 29 | 29 / 15 | 0 | 0 / 0 | 4 | 1.70 | 2.81 |
| smash | 16 | 13 / 8 | 1 | 0 / 3 | 2 | 2.25 | 2.72 |
| stick | 10 | 10 / 4 | 0 | 0 / 0 | 2 | 2.08 | 2.21 |
| y_cross | 18 | 14 / 12 | 3 | 4 / 0 | 1 | 3.05 | 10.72 |

### Actual coverage family

| Family | All snaps | Runs / dropbacks | Throws / completions | Pressure cues | Sacks | INTs | Fall events |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cover0 | 38 | 12 / 26 | 23 / 10 | 3 | 2 | 3 | 46 |
| cover1 | 176 | 61 / 115 | 105 / 60 | 20 | 7 | 16 | 274 |
| cover2 | 56 | 22 / 34 | 28 / 22 | 8 | 2 | 1 | 110 |
| cover2man | 17 | 3 / 14 | 10 / 6 | 2 | 1 | 1 | 20 |
| cover3 | 141 | 48 / 93 | 83 / 43 | 13 | 5 | 10 | 231 |
| cover4 | 50 | 19 / 31 | 27 / 16 | 3 | 1 | 1 | 96 |
| cover6 | 42 | 20 / 22 | 20 / 12 | 2 | 1 | 2 | 72 |
| tampa2 | 11 | 6 / 5 | 5 / 4 | 0 | 0 | 0 | 23 |

### Field and score context

| Context | All snaps | Runs / dropbacks | Throws / completions | Pressure cues | INTs |
| --- | --- | --- | --- | --- | --- |
| middle | 397 | 141 / 256 | 227 / 129 | 40 | 26 |
| own-20 | 78 | 26 / 52 | 47 / 28 | 7 | 5 |
| red-zone | 56 | 24 / 32 | 27 / 16 | 4 | 3 |
| leading | 230 | 104 / 126 | 111 / 61 | 23 | 10 |
| tied | 33 | 13 / 20 | 18 / 15 | 3 | 2 |
| trailing | 268 | 74 / 194 | 172 / 97 | 25 | 22 |

### Called pressure and play action

These are call strata, not randomized treatments. Non-play-action includes 191 called runs, so dropback denominators are shown separately.

| Call stratum | All snaps | Dropbacks | Throws / completions | Pressure cues | Sacks / scrambles | INTs |
| --- | --- | --- | --- | --- | --- | --- |
| pressureCalled=False | 428 | 268 | 236 / 135 | 39 | 14 / 17 | 29 |
| pressureCalled=True | 103 | 72 | 65 / 38 | 12 | 5 / 2 | 5 |
| playAction=False | 484 | 293 | 262 / 154 | 36 | 14 / 16 | 29 |
| playAction=True | 47 | 47 | 39 / 19 | 15 | 5 / 3 | 5 |



## Reproduction, evidence and limits

Run from the repository root after the coordinator's shared per-play split exists:

```sh
python3 out/accepted-game-deep-audit-2026-10-16/measurement/census.py
python3 out/accepted-game-deep-audit-2026-10-16/measurement/details.py
```

These stdlib-only scripts read saved data, never import simulator modules, and write only their own ignored `measurement/` directory. `summary.json` contains complete coverage IDs, checks and stratified distributions; `play-metrics.jsonl` contains 559 compact play records with actors/events; `accounting-details.json` covers all 740 log contexts, special/administrative representation, score checks and negative-YAC attribution; `player-exposure.json` preserves condition/slot exposure; `panel-measurement-screen.json` preserves the 48/12 anchor screen; `findings.json` is the compact ranked handoff. Zero-exposure kicker/punter entries in the player file originate from box-score reconciliation, not filmed participation.

No causal football hypothesis is promoted from these distributions. The accounting findings are established by native result/box disagreement plus source branches and opposing controls. Their smallest action is a bounded statistics contract repair. Physical/controller diagnoses remain with their owners; RUN-006's four exchange caps retain the existing issue and unknown endpoint status. Four generated-roster games are diagnostic exposure, not an estimate of league defect prevalence. 0.1-second/0.1-yard rounded film, phase-limited pressure recording, two unfilmed tries and absent special-team film bound what can be concluded. No incompatible NFL comparison, statistical tuning target or new simulation is introduced.
