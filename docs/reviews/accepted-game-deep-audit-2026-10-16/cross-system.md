# Cross-system: defensive support, pursuit, traffic and continuation

**Evidence access:** [Download the audit bundle, scripts and detailed ledgers](https://github.com/tannerthardy/football-simulation-/tree/23d5f6d4f7e88fdd3225a49cc74ae5582a52522e). Paths below refer to files inside that bundle; [report and reproduction guide](README.md). Source links pin the measured accepted engine.

Saved accepted engine `70b4db6a3ef53acc1a0e90cd055f1087205daa30`, source SHA256 `9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941`, immutable evidence `b9b9c17597970ddc87aa4a4e271fc4cfeef71909`. This appendix inspects saved data only. It runs no engine, game, test suite or installation and changes no production source/configuration/tests.

Two repeated routing problems warrant bounded owner questions: man coverage can discard already available pursuit after a visibly committed QB run, and defensive premesh routing can survive the failed exchange indefinitely. They share a phase-continuity concern but do not establish a need for a coordinator or a shared phase redesign. Ordinary acquired run support and many postcatch finishes are useful and must remain controls.

## Coverage and reproducibility

All **559 filmed physical scrimmages** were screened, including the **28 nullified** exposures separately; the **531 nonnullified** snaps are the official exposure. All **48 fixed ordinary snaps** and **12 separately selected tails** received detailed saved-event, paired position/telemetry and consumed-cue review. The ordinary panel has 24 called runs/24 dropbacks, 12 completions, 1 interception, 1 scramble and 1 capped prefix; tails have 4 runs/8 dropbacks, 5 completions, 3 interceptions and 1 capped prefix. Panel review is through the cross-system lens, with coverage/throw/exchange/contact-law questions referred to their owners. Interception return handovers were checked in the panel; the automated approach flags below concern original defensive players pursuing an offensive carrier.

Additional detailed traces cover all four caps, all 20 recorded scrambles, and source-qualified approach/traffic witnesses and opposing controls. Six strong scramble witnesses are outside the fixed ordinary/tail panels; their recurrence is not an ordinary-panel frequency. The fixed-panel per-play ledger appears below. Native event time is generally 0.05 s resolution; paired physical/telemetry frames are 0.1 s and positions 0.1 yd. No exact continuous minimum, discarded-stage reconstruction or full impulse-budget claim is made.

Reproduce from this checkout with Python standard library only:

```sh
python3 out/accepted-game-deep-audit-2026-10-16/cross-system/screen.py
python3 out/accepted-game-deep-audit-2026-10-16/cross-system/panel.py
python3 out/accepted-game-deep-audit-2026-10-16/cross-system/panel-notes.py
python3 out/accepted-game-deep-audit-2026-10-16/cross-system/scramble-continuity.py
python3 out/accepted-game-deep-audit-2026-10-16/cross-system/cap-continuation.py
```

`inspect.py` additionally extracts selected actors/time windows. The lane folder retains `screen.csv`, `screen.json` (every snap and every flag's exact ID list), `screen-details.json`, all 60 panel JSON timelines, `panel-review.json/.md`, `scramble-continuity*.json`, `cap-continuation.json` and selected deep traffic extracts. Inputs are the root's exact per-native-JSONL split and observation join, with original source hashes in `index.json`; helpers do not import simulator code.

### Screen flags are retrieval rules, not defect counts

| Flag / exact definition | All 559 | Official 531 | Nullified 28 | Ordinary 48 | Tail 12 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Native cap, unknown football ending |4|4|0|1|1|
| At least one individual positive D–D observer report ≥100 kg·yd/s |75|71|4|5|2|
| Same report with either participant within 6 yd of the offensive carrier in nearest saved frame |46|45|1|4|0|
| Positive personally consumed `see` of current offensive carrier beyondLOS+2; defender up, 1–12 yd from carrier, no sampled block/tackle link; final request points away by≥1 yd/s for≥3 consecutive 0.1 s samples |13|12|1|0|0|
| Before the first native playwide `carrier_contact`: defender up, positive acquired carrier picture, distance≤2 yd, then same carrier >3 yd away 0.4–0.6 s later |77|75|2|5|0|
| Explicit `coverage-run-fit` decision |167|166|1|21|3|

The 100 kg·yd/s threshold only selects interpretable contacts; it is not a physical defect threshold. Reports are substep reports, not distinct collisions; their sums cannot be read as a number of impacts. The away-request flag can select useful interception angles, momentum shedding, leverage or traffic responses. The passby rule can select a legitimate cut, blocked reach or subsequent useful support, and an earlier QB contact conservatively closes its exposure. A missing flag is not proof of sound behavior. All exact lists are retained in `screen.json`; the 13 away IDs are G1-P024/P033/P065/P122, G2-P056/P130/P166/P174/P177, G3-P072/P114, G4-P173/P177. The five ordinary hard-traffic IDs are G1-P192, G3-P104, G4-P137/P146/P176; the five ordinary passby IDs are G1-P018/P181/P192, G3-P004, G4-P146.

## Ranked findings

### FLEX-01 / rank 1. A committed QB run can lose pursuit at the man-coverage acceptance gate

**Confirmed routing gap; football opportunity lost is visible, prevented yardage/tackle is unproved.** It occurs in multiple calls/fronts/games, outside the fixed panel. All 20 filmed native-scramble snaps were examined:19 official plus 1 nullified. Seventeen expose some subsequent man/non-run-belief agent consuming positive QB possession, but that is not itself a failure: ordinary coverage should survive a normal dropback, PA fake and an uncommitted QB behind the line. The stronger six official witnesses have a personally consumed positive QB picture **beyondLOS+2**, with a final request away from the QB: **G1-P086/P127, G2-P174, G3-P093, G4-P173/P177**. All six are retained separately; no ordinary-panel case satisfies this strong screen.

Source exposes the producing branch. [`pursueIfLive`](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/defense.ts#L43) observes the carrier and returns chase after the observed LOS criterion, or the scramble path. It also permits observedLOS+2 to bypass the initial read-time gate. [`ManCoverage.coverMan`](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/defense.ts#L246) computes that movement, then accepts it only with run belief, catch or throw. A pass play with no throw/catch and retained pass belief falls through to `trackReceiver`. Thus this attribution does not rely on interpreting a final velocity alone. The early `sim.scrambled` event is unnecessary to establish the six stronger observed-position witnesses, and is not proposed as an information shortcut. The helper still selects the authoritative `sim.carrier` and reads global phase flags: that is inherited INFO-003 information debt, not a newly information-honest handover. Adding `sim.scrambled` to the acceptance condition would not by itself satisfy the acquired-cue contract.

- **First close opportunity, G4-P177, Gun Wing—Four Verticals / Cover 3 Seam:** at 5.70 s LB_M is at[37.1, 25.8], QB[33.4, 27.4], 4.03 ydapart. LOS30.849; LB_M's actual consumed QB picture is[32.96, 27.24],velocity[5.80, 3.41],carrying=true,age 0.35 s. LB_M remains `man:Y`, pass belief; final request[7.40, 3.75] points away radially by 5.30 yd/s. This is a close available responsibility question, not merely a remote corner continuing a vertical. The native result is a 9.02 ydQBslide; no counterfactual tackle is claimed.
- **Repeated G4-P173, Gun Bunch—Curl-Flat /2-Man:** at 5.70 s LB_M[48.3, 37.9] consumes QB[45.18, 12.98],carrying=true,age 0.40 s, beyondLOS43+2, but requests[3.53, 8.65] toward his receiver side. The QB is actually[45.5, 12.7]; the defender continues farther across the opposite field. Final QBslide 11.07 yd is context, not the defect definition.
- **Repeated G2-P174, Gun Bunch—Drive /Cover 0:** after observed commitment, multiple man defenders retain pass belief and receiver-directed work while the QB runs; NB remains `man:Y` at 5–7 s. This follows a real earlier QBescape, so the offensive win stays intact.

Opposing controls are ordinary **G1-P027** (scramble 3.15, slide 5.65; no consumed QB position beyondLOS+2) and PA **G2-P057/G3-P073**, where a normal pass picture must retain coverage. Within G4-P177, CB_W's later run belief coincides with a request reversal from a vertical[10.11,-0.25] at 5.0 to[-4.40, 7.93] at 5.5; far positioning and the time needed to turn remain real costs. That contrast supports the gate diagnosis without promising an instant recovery.

**Owner/next question:** Catching/defensive pursuit with Pass/Awareness, consulted by Flex: what smallest existing man-technique acceptance correction preserves receiver responsibility until a personally acquired QB commitment justifies leaving it? Reuse the six strong saved witnesses and early-dropback/PA controls. A source-qualified routing correction is the scope; do not change QB escape behavior, pursuit capacity or a global phase system. The recorded carrying bit is a perception proxy rather than a skeletal/gaze observation; stronger information semantics belong with Awareness.

### FLEX-02 / rank 2. Failed exchange leaves defense following a premesh expectation indefinitely

**Observed continuation failure with a source-supported routing mechanism; initial exchange failure belongs RUN-006/Run.** The four **G3-P003/P087/P141 and G4-P142** caps retain only snap possession by the QB, no exchange, carrier contact or football terminal finish. All are under-center I/Offset-I Outside Zone; this is not a formation-only diagnosis.

Run's independent exchange trace finds the first sampled possession-independent RB aiming-track commitment at 1.10 s, while sampled QB–RB separation remains 2.91/3.52/3.49/3.67 yd respectively. That commitment is not by itself a proven wrong request or an already failed exchange: the successful Ace control also aims before transfer. The earliest personally available failed/recoverable-exchange cue remains Run's unresolved question; sustained stationary QB requests later supply the unambiguous failed-continuation witness. No positive F–QB/RB body impulse occurs before 2.5 s. An F spacing modifier is not a demonstrated initial physical collision. Flex does not relabel the first failure or repeat Run's historical census.

For defensive continuation, [`executeRunFit`](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/run-fits.ts#L178) defines unkeyed premesh from QB carrier/no scramble/no handoff; it then chooses the RB picture rather than QB and gates pursuit/declaration on `!premesh`. There is no exit from that condition while this failed exchange persists. This is distinct from the useful keyed-fit geometry of a personally identified RB.

**Explicit continuation witness, G3-P003, I-Form Twins—Outside Zone /Cover 2 Match:** QB final request is permanently zero from 3.20 s. At 5.00 s DT_W[54.3, 21.8] consumes QB[51.40, 21.47],carrying=true,age 0.30 s, and RB[57.18, 21.33],carrying=false. DT_W is up with run belief but final request[1.50, 1.27]; FS likewise consumes positive QB/negative RB and requests[0.59, 3.38]. At 10.0 and 24.9 s **all 11 defenders in every cap** have consumed actual `see` pictures of the stationary QB carrying=true, ages 0.20–0.35 s. They still do not create a carrier-contact event. The records expose a persistent information/expectation contradiction; they do not prove any particular defender had an unobstructed immediate tackle path.

At 5 s QB–RB achieved separation is 5.61/7.55/5.72/6.90 yd across the four cases; this is well after the initial failed exchange. It cannot be explained merely as one normal snap delay. Both offense's missing continuation and defense's premesh expectation contribute to the censored stalemate; exact prevented duration/yardage is unknown.

**Controls:** G3-P140, same-game Ace Outside Zone, transfers 1.55 and finishes 3.40; by 2.50 the defenders no longer consume QB carrying=true. It is nonmatched context. Ordinary **G3-P053** successfully exchanges from Offset-I on Wide Zone Weak and finishes 2.90, and G1-P167 Offset-I Trap has useful acquired LB_S support 1.70 and tackle 3.50. Critically, **all 11 defenders also consume positive QB possession at 1.10 s in all four caps and G3-P140**. Positive QB possession alone is not a reason to chase during a normal mesh.

**Owner/next question:** Run owns initial/recoverable exchange and offensive continuation; Catching/Run with Flex owns the defensive contract: what personally acquired contradiction—runner departure, separation and sustained possession history—can retire an expected mesh without prematurely chasing an ordinary handoff/PA/keeper picture? No arbitrary timer or private handoff-state substitute is supported. The sampled positions, carrying proxy and final intents cannot identify every discarded producer/modifier.

### FLEX-03 / rank 3. Repeated postcatch escapes have acquired pursuit and weak oblique reaches; avoidability remains open

**Observed limitation/needs trace, not a confirmed tackle or awareness defect.** The detailed panel supplies repeated approach chains, but also legitimate offensive wins and normal finishes. The 77 passby flags are leads, not 77 failed contracts.

- **G3-P008, Singleback Ace—Mesh /Cover 3 Match:** at catch 2.80 the nearest LB_W is 1.73 ydaway but **rising**, after a contact fall 1.85; he is not an available idle defender. NB acquires positive carrier possession by 3.50, requests[-2.33,-7.23] while actually moving[-2.78,-3.28], wraps 3.70 and slips 4.10. FS dive/hold slips 4.80, CB_W dive/hold slips 6.05. Their later requests pursue the carrier; the 80.70 ydTD does not establish hidden-cue failure.
- **G4-P185, Gun Bunch—Mesh /Cover 1 Off:** catch 2.60, NB wrap 3.25/slip 3.55, CB_W wrap 4.60/slip 4.90, FS dive miss 6.65. At 3.0 NB has a positive carrying picture while closing; at 3.5 its request turns[6.31, 3.76] while body still travels[3.20, 7.49]. This is a real request/achieved-direction distinction and a possible approach-control question, not proof the body violated the request.
- **G4-P024, Gun Doubles—Comebacks /Cover 3 Sky:** the QB escapes a hold before the catch 4.45; receiver wraps later slip 5.90 and 6.85. A playwide first `carrier_contact` at 2.85 belongs to the QB, not receiver. At 5.5 CB_W's positive cue and turning request[3.69, 7.65] coexist with actual[-1.75, 4.54]; momentum and the receiver's turn are legitimate competing causes.

The existing [`chase`/`gatheringApproach`](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/common.ts#L143) and [`chooseApproach`](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/approach-control.ts#L20) separate near gather, a short own-body preview and a constant-velocity observed target. The preview deliberately does not predict future cuts/contacts. Final recorded commands may also include contact, coverage containment and teammate spacing; missing stage provenance prevents assigning every turn/stop to one producer. Broader forecasts, stronger hands or reduced runner outcomes are not established repairs.

**Controls:** ordinary G2-P097 catches 2.65, SS contacts 3.35/tackles 3.90; G3-P089 catches 3.60, FS contacts 3.75/tackles 4.50; G3-P004 lets a DT passby occur but LB_W wraps 3.05/finishes 3.75. Tail G1-P134's same Counter family is stuffed by DE_W2.25→2.95, while G1-P060 has a real early slipped hold 2.20→2.45 and then escape. Preserve both outcomes. G3-P146's 8.70 s contact-to-stop and G2-P063's 4.25 s span an early broken hold, free pursuit and a new tackle; they are not continuous loaded holds.

**Owner/next question:** Catching/approach control owns one named earliest feasible request against the acquired picture; Physics owns achieved movement and contact validity after that request. Reuse selected saved sequences and normal finishes first. The unanswered question is whether a feasible acquired-cue approach was discarded or inadequately requested before a specific weak reach, not whether the receiver gained too much.

### FLEX-04 / rank 4. Converging defenders can hit during useful constrained finishes; impulse rankings do not identify a navigation defect

**Observed traffic/ownership context; avoidability unproved.** Of 75 snaps with an individual hard defender-peer report, 46 place a participant within 6 yd of the carrier. This includes short successful stops, free collisions, blocked players and bound tackle assists. The fixed ordinary five contain no demonstrated common avoidable collision mechanism.

**G4-P171, Gun Spread—Drive /2-Man**, additional trace: LB_M wraps 4.80/dives 4.85; SS assists 5.10. At 5.20 LB_M is falling at[39.2, 10.0], actual[7.66,-5.11]; SS[39.7, 9.6] is up and constrained by the assist, actual[0.28,-0.06], final[6.67,-3.86]. SS has the teammate's actual consumed 0.05 s-old picture[38.78, 10.29],velocity[7.41,-5.57]. Their 429.64 kg·yd/s report occurs 5.30; carrier falls 5.30 and is tackled 5.70. This identifies available peer information and committed grip ownership; it does not prove a free sidestep remained available.

**G1-P006**, opposing finish: NB wraps 4.70/falls 4.85; LB_M slows and adjusts around the occupied tackler, with a 0.05 s-old peer picture, but 155.43 kg·yd/s occurs 5.05. LB_M assists 5.15 and the tackle finishes 5.65. In ordinary G3-P104, NB/DB171.70 kg·yd/s occurs 3.30 during the assist sequence, 0.05 s before a tackle; G4-P137 LB_M/LB_S113.29 kg·yd/s at 3.05 likewise follows initial/assist grips and finishes 3.40. Earlier G1-P192 LB_M/NB153.86 kg·yd/s at 2.80 is a different prethrow coverage approach, owned with Pass.

[`spaceTeammates`](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/spacing.ts#L274) shapes acquired peer headway, but its free motion forecasts exclude engaged/down/jointed/loaded/striking actors; [`PlaySim.tick`](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/playsim.ts#L577) gathers those constraints after contact controllers. Such a forecast is not a multi-body contact solve. The examples support retaining that distinction. No source-supported repeated violation justifies applying free-footwork projection to committed tackle bonds or creating a coordinator.

**Owner/next question:** Flex/Catching identifies the earliest unconstrained approach and consumed peer picture, if any, before a harmful convergence; Physics determines whether the subsequent contact/motion is coherent. Preserve these successful pile controls. Any proposed change needs an identifiable request-stage responsibility error and a feasible opposing path, not a lower summed impulse alone.

## Useful support and remaining limits

Explicit acquired coverage-run support appears in 167 filmed run snaps, 166 official; the fixed ordinary panel has 21 such snaps. These are explicit producer witnesses, not total support counts, and 1 recorded decision peractor does not prove every later tick. Examples include LB_W on G1-P003 at 1.55, multiple support players on G2-P099 at 1.35–2.20, and 4 players on G4-P176 at 1.60–1.70. Their subsequent finishes show useful continuity; the audit does not reopen COV-003's accepted narrow corrections or recommend a permanent run latch. Ordinary offensive wins G2-P125/G4-P146 retain positive support cues and physical blocking/escape costs.

Facing is not gaze. `source:see` records consumed delayed pictures, not every available visible cue; `source:delayed` alone is not acquisition. The carrying bit is a model proxy. Final intents do not expose all original behavior/technique/spacing stages, and sampled last-step contacts are not complete force histories. Caps retain unknown terminal football outcomes. Four generated-roster games cannot establish population defect rates or before/after patch improvement.

Ready PR128 (`ec2a2e9`) separately preserves an acquired flat matcher's force duty inside `CoverageDefender`; it does not cover the legacy `ManCoverage` acceptance gate or indefinite unkeyed premesh routing audited here. This appendix does not duplicate 128 or treat held 127 cushion work as accepted.

The next work is two bounded existing-controller questions for the first two findings and saved-first approach attribution for the latter two. No new game, solver/capacity/fatigue project, global coordinator or outcome tuning follows from this appendix.

## Fixed-panel detailed ledger

All 48 ordinary and 12 separately selected tails reviewed through saved events, paired positional/telemetry action timelines and sampled consumed cues. No engine execution. Actor slots preserve native indexing. The per-play JSON files retain the timeline. Contact statements use exact native events; stop intervals keep the stricter same-carrier definitions.

| ID | Panel | Reviewed observation / disposition |
| --- | --- | --- |
| G1-P181 | ordinary | LB_M misses at 3.75; FS contacts 3.90 and finishes 4.45. Close-passby flag is followed by useful second support; miss alone is not a broken fit. |
| G1-P167 | ordinary | LB_S acquires RB carrying and activates support 1.70; same LB contacts 3.00, tackles 3.50. Useful Offset-I exchange/support control. |
| G1-P140 | ordinary | Draw gives delayed departure; LB_S contacts 4.05 and finishes 4.65. Preserve normal mesh/dropback patience. |
| G1-P018 | ordinary | FS support cue 1.35 precedes DE_S contact 2.55 and finish 3.05. Acquired close-passby lead does not defeat the successful edge stop. |
| G1-P130 | ordinary | LB_S acquired support 1.70; DT_S contact and missed attempt 2.25, carrier legs/final stop 2.70. Do not credit an unrecorded tackler or call the miss a no-support failure. |
| G1-P003 | ordinary | LB_W keyed support 1.55; DE_W keeps feet then wraps 2.00 and finishes 2.60. Useful preview/approach control. |
| G1-P098 | ordinary | Incomplete 3.65; no reception/pursuit handover. No hard D-D observer flag; coverage/throw judgement stays Pass/QB. |
| G1-P027 | ordinary | QB scramble 3.15, slide 5.65. Man/pass-belief exposure exists, but acquired QB never exceeds LOS+2; not one of six strong continuation witnesses. |
| G1-P185 | ordinary | Incomplete 3.65; no after-catch segment and no hard D-D lead. |
| G1-P192 | ordinary | Comeback earns catch 4.55 after corner overshoot; LB_W and CB_W dives miss 5.80/6.15. Both possess positive acquired carrier pictures before misses. Earlier LB_M/NB contact 2.80 is prethrow, not established TD cause. |
| G1-P141 | ordinary | Interception 3.00; offensive Y takes immediate return tackle responsibility and finishes 3.90. Possession-transfer continuity control. |
| G1-P137 | ordinary | Catch 2.45 immediately reaches goal by 2.50. The .05 s ending supplies virtually no postcatch approach exposure. |
| G2-P070 | ordinary | DT_S contact 2.40 slips 2.70; FS later grip also slips 4.45 before FS finish 5.70. Support cue 1.55 remains useful despite offensive escapes. |
| G2-P144 | ordinary | Three acquired support decisions 1.35–2.15 precede DT_S contact 2.30/finish 2.85. Useful coordinated run stop. |
| G2-P099 | ordinary | LB_W/LB_M/SS support 1.35/1.65/2.20, LB_M contacts 2.85 and finishes 3.45. Preserve acquired handovers. |
| G2-P096 | ordinary | LB_W keyed support 1.70; DT_S contact 2.55 and finish 3.40. No hard defender traffic lead. |
| G2-P020 | ordinary | LB_W support 1.20; DT_S contact 1.95 and finish 2.60. Trap defended without inventing a recovery defect. |
| G2-P125 | ordinary | LB_W acquires support 1.35 but blockers retain several other defenders; runner escapes without recorded grasp. Positive carrying cues and pursuit exist. Blocking/load, route to surface and speed separation remain competing explanations. |
| G2-P057 | ordinary | PA incomplete 3.25; no after-catch segment. Legitimate PA uncertainty/receiver responsibility control for any proposed QB handover. |
| G2-P097 | ordinary | SS closes after catch 2.65, contacts 3.35, tackles 3.90. Useful oblique postcatch gather/finish opposing control. |
| G2-P038 | ordinary | QB contacted 2.05 and sack ending 2.30; no receiver-catch handover. Defensive initial pressure belongs QB lane. |
| G2-P120 | ordinary | Mesh incomplete 3.20; no postcatch segment and no hard D-D contact lead. Preserve converging coverage that still supplies a useful throw picture. |
| G2-P093 | ordinary | QB contacted 2.60 and sack ending 2.90; no after-catch segment. |
| G2-P143 | ordinary | Catch and immediate NB carrier contact 2.50, tackle 3.25. Arrival and continuation both produce a useful finish. |
| G3-P049 | ordinary | LB_M/CB_W/LB_W acquired support 1.35/1.85/1.90; LB_S contact 3.95/finish 4.85. Normal flowing support control. |
| G3-P004 | ordinary | DT_W close passby at 2.00 does not finish; LB_W acquires 1.90, wraps 3.05 and tackles 3.75. Keep the runner win and second-level recovery distinct. |
| G3-P053 | ordinary | Offset-I Wide Zone Weak exchanges successfully; LB_W contacts 2.40 and finishes 2.90. Same formation does not identify the failed Outside Zone mechanism. |
| G3-P025 | ordinary | DT_S missed attempt 2.55, then LB_M contact 3.25/tackle 4.05. Useful next-responsibility recovery. |
| G3-P035 | ordinary | DE_W contact 2.70 slips 3.10; LB_W finishes 3.90. One failed hold does not imply absent pursuit. |
| G3-P028 | ordinary | LB_S/LB_M acquired support 1.35/1.70; DT_W contact 2.00 and finish 2.95. Useful run-support continuity. |
| G3-P065 | ordinary | Mesh incomplete 3.80; no after-catch segment or hard D-D observer flag. |
| G3-P073 | ordinary | PA incomplete 5.05; no after-catch segment. Preserve the long legitimate pass responsibility. |
| G3-P089 | ordinary | Catch 3.60, FS contact 3.75 and tackle 4.50. Immediate deep support makes the offensive completion compatible with sound pursuit. |
| G3-P104 | ordinary | Catch/NB contact 2.55; DB assist 3.00, NB/DB peer impulse 171.70 at 3.30, tackle 3.35. Collision occurs during a successful constrained finish, not an established free-navigation defect. |
| G3-P017 | ordinary | PA catch 4.35, CB_W contact 4.95/tackle 5.95. Defensive recognition and later finish remain separate from the completion. |
| G3-P059 | ordinary | Catch 3.00, CB_W grasp 4.45 and OOB5.10. Null terminal-contact interval does not mean untouched after catch. |
| G4-P014 | ordinary | LB_M support 1.75; DE_S contact 2.20/finish 2.85. Useful wide-zone defensive win. |
| G4-P146 | ordinary | FS misses 3.90, SS grasps 4.90/dives 4.95/slips 5.60; LB_M/SS peer contact 6.50 follows loss of availability. Several blockers remain active. Acquired pursuit exists; no hold-strength or collision-cause verdict. |
| G4-P081 | ordinary | CB_S/FS/LB_M support 1.30/1.90/2.70; DE_W contact 2.75/tackle 3.45. Useful support/edge finish. |
| G4-P142 | ordinary | No exchange or carrier contact through 25 s. All eleven defenders consume QB carrying=true later while premesh routing persists. Capped football ending is unknown. |
| G4-P176 | ordinary | Four support decisions 1.60–1.70; DE_S/DT_S peer impulse 166.47 at 2.00, DT_W contact 2.10/tackle 2.70. Traffic does not establish failed run support. |
| G4-P088 | ordinary | LB_S/CB_S/LB_M support 1.60/1.60/2.00; DT_S contact 2.05 and finish 2.60. Useful run stop. |
| G4-P152 | ordinary | Incomplete 3.75; no after-catch segment or hard D-D observer flag. |
| G4-P113 | ordinary | QB contact 3.05/slip 3.35, then incomplete 5.10. Valid QB escape does not imply a receiver-pursuit failure; no native scramble event here. |
| G4-P059 | ordinary | Catch 4.30; CB_S contact 5.40/tackle 6.10. Postcatch closure is present despite the reception. |
| G4-P185 | ordinary | Catch 2.60, NB grasp 3.25/slip 3.55; CB_W grasp 4.60/slip 4.90; FS dive misses 6.65. All have acquired carrier cues before attempts. Repeated weak oblique approaches merit trace, not automatic offensive-win defects. |
| G4-P023 | ordinary | Catch/FS contact 4.80, tackle 5.95. Longer finish retains contact; no demonstrated awareness gap. |
| G4-P137 | ordinary | Catch 2.50; LB_M contact 2.70/dive 2.75, LB_W assist 2.95, LB_M/LB_S peer impulse 113.29 at 3.05, tackle 3.40. Convergence occurs during a successful pile. |
| G2-P029 | tail | Flood catch 3.85; CB_W nearest 2.62 yd, still accelerating after reversal while receiver is already faster. Positive carrier cue and full pursuit follow. No grasp is recorded; ordinary earned separation remains plausible. |
| G1-P060 | tail | Counter contact 2.20 and early hold slips 2.45; later CB_W gets near 2 yd while still carrying opposite transverse velocity. No sufficient source-stage evidence that a different feasible approach would prevent escape. |
| G4-P024 | tail | QB contact 2.85/slip 3.10 precedes catch 4.45. Receiver wraps then slip 5.90 and 6.85. Playwide carrier_contact cannot stand in for receiver-first-contact; preserve QB escape plus receiver wins. |
| G3-P008 | tail | LB_W is rising near 1.73 yd at catch 2.80 after earlier contact fall. NB wraps 3.70/slips 4.10; FS and CB_W dives slip 4.80/6.05. Acquired cue reaches available defenders; unavailable near defender is not idle by decision. |
| G4-P189 | tail | Four acquired support decisions 1.55–1.95; DE_W contact 2.00/tackle 2.85. Useful initial/gather/finish opposing control to explosive Counter. |
| G1-P134 | tail | Five acquired support decisions 1.75–2.15; DE_W wraps 2.25/tackles 2.95. Same Counter family retains legitimate disciplined defensive win. |
| G2-P089 | tail | Interception 3.30; offensive H immediately contacts returner and finishes 4.15. Return-continuation control. |
| G4-P116 | tail | Interception 3.60; offensive Z immediately contacts returner and finishes 4.55. Return-continuation control. |
| G3-P087 | tail | No exchange/contact through 25 s. Late DE_S/LB_M peer contact 21.45 occurs far after initial exchange failure; it cannot explain the first failed mesh. |
| G1-P036 | tail | Mesh catch 3.45, LB_M contact 4.15/tackle 4.65. Large teammate-impulse tail selection is primarily offensive context, not a demonstrated defensive collision defect. |
| G3-P146 | tail | Catch 3.65, NB dive/grasp 4.05/slip 4.50; free pursuit follows until new FS/LB_S wrap 12.00/12.05 and tackle 12.75. The 8.70 s interval is not one continuous loaded hold. |
| G2-P063 | tail | Interception 3.55; X grasp slips 4.05, RB hold slips 6.90, QB tackles 7.80. The 4.25 s interval spans transfers of tackle responsibility, not one failed defensive hold. |
