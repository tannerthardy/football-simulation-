# QB, pass protection and ball audit — saved accepted 70b4 cohort

**Evidence access:** [Download the audit bundle, scripts and detailed ledgers](https://github.com/tannerthardy/football-simulation-/tree/23d5f6d4f7e88fdd3225a49cc74ae5582a52522e). Paths below refer to files inside that bundle; [report and reproduction guide](README.md). Source links pin the measured accepted engine.

The strongest finding is about mechanism attribution: **27 of the 34 official interceptions follow an already altered flight**—10 explicit PBUs/deflections, six explicit drops and 11 target-clearing transitions without a corresponding PBU/drop event. The seven remaining interceptions need direct-contest versus unsampled-tip attribution. This does not establish 34 bad QB decisions, a catch-rate target or a need for stronger protection.

A narrower physical opportunity question deserves the next trace: catch opportunities intersect the swept ball with the body's final position, and three late tipped interceptions are sensitive to that time mismatch in offline sampled interpolation. The saved frames cannot certify their native invalidity. Separately, source inspection confirms existing information debt in live receiver prediction, protection and scramble-lane choices, while the QB's defensive memory actually preserves delayed observations.

## Provenance and coverage

Runtime is `70b4db6a3ef53acc1a0e90cd055f1087205daa30`, source digest `9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941`; immutable evidence root is `b9b9c17597970ddc87aa4a4e271fc4cfeef71909`. These are the same four seed-701–704 games, not comparisons with earlier builds. No engine, game, test suite, install, source/config/test edit, commit or push was performed by this lane.

The screen loads every native snap indexed as `called-dropback`, including nullified exposure. It joins actual replay events, existing QB pending values, read/phase transitions, actual requested `qb` estimates, protection links, requested motion, achieved body motion and ball target/arrival transitions. It never evaluates an unthrown option or calls simulator code. `pending` is the actual stored choice, not a new retrospective evaluation; sampled perception can miss its precise decision tick.

| Game | All dropbacks | Official | Nullified | Official throws / completions / INT | Sacks / scrambles |
| --- | ---: | ---: | ---: | --- | --- |
| G1 | 97 | 85 | 12 | 72 / 38 / 11 | 7 / 6 |
| G2 | 97 | 92 | 5 | 80 / 43 / 9 | 7 / 4 |
| G3 | 68 | 64 | 4 | 56 / 32 / 6 | 3 / 5 |
| G4 | 104 | 99 | 5 | 93 / 60 / 8 | 2 / 4 |
| Total | **366** | **340** | **26** | **301 / 173 / 34** | **19 / 19** |

The remaining official dropback is **G2-P140**, a QB safety without attempted/sacked/scramble credit; Measurement owns that accounting finding. The 26 nullified snaps contain 25 throws, 17 completions, no interceptions/sacks and one scramble. They are retained in the screen and excluded from official denominators. Official recorded exposure also includes 51 pressured snaps, three throwaways and 20 explicit drops. No population/NFL-rate inference follows.

All 24 fixed ordinary dropbacks and eight relevant tails received detailed timeline review, with all 34 INT and all 19 sack sequences inspected. Their union is 79 snaps; five additional mechanism controls bring the retained compact trace receipts to 84. Detailed study is separate from the all-366 screen. The fixed ordinary panel has 12 completions, eight incompletions, two sacks, one scramble and one interception; that composition was not chosen by outcome.

Artifacts are in `out/accepted-game-deep-audit-2026-10-16/qb-ball/` (`qb-ball/` in the audit bundle). `all-dropbacks.csv/json` retains all 366 IDs, definitions and metrics; `deep-coverage.json` lists the exact ordinary/tail/census/control coverage; each `Gx-Pxxx.json` contains a condensed actual timeline. The shared index preserves hashes and raw native paths.

## 1. Interceptions frequently arise after failed collection or a defensive touch

**Observed, high confidence; not a QB-defect count.** All 34 INT have a saved pending evaluation. Their expected completion and risk apply to the selected initial trajectory; subsequent miss execution, actual arrival and altered flights are distinct stages.

| Pre-INT evidence | Count | Exact IDs |
| --- | ---: | --- |
| Explicit PBU/deflection | 10 | G1-P044, G1-P156, G2-P027, G3-P062, G3-P068, G3-P121, G3-P153, G4-P069, G4-P128, G4-P193 |
| Explicit drop | 6 | G1-P028, G1-P112, G2-P107, G2-P134, G3-P100, G4-P116 |
| Target cleared while air, without explicit PBU/drop | 11 | G1-P020, G1-P049, G1-P078, G1-P163, G2-P078, G2-P089, G2-P124, G2-P150, G3-P030, G4-P053, G4-P085 |
| Direct contest or alteration hidden between samples | 7 | G1-P135, G1-P141, G1-P170, G2-P054, G2-P063, G4-P008, G4-P175 |

The silent transitions are source-qualified: [catching.ts](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/catching.ts), `receiverContest`, emits `drop` only for difficulty below `.35`, then calls `deflect(..., .2, 'drop')` for every initial failed receiver opportunity. `deflect` clears the target. More difficult failed collections can therefore redirect the ball without a named touch event. A cleared target alone does not reveal exact probability, roll, contact location or causal request.

**Representative chains:**

- **G1-P020:** A1-QB1's Y choice is pending by **2.40**, completion `.7105`, risk `.00445`; throw **2.55**. Y/A1-TE2 stops near `(40.8,45.3)` while the ball descends toward him. Target disappears by **3.70** at ball height `3.23`, with no PBU/drop event; NB/H1-CB3 is still over three yards from the ball in that sample. Interception is **4.55**, after the altered-flight interval. Pass/Awareness independently observes Y's lateral reversal before this opportunity. A confident initial decision did not guarantee easy execution, and this is not a defender simply jumping the intended route.
- **G4-P116:** A4-QB1's Z choice is pending **2.30**, completion `.7642`, risk `.00118`; throw **2.40**, **Z/A4-WR1 drops 3.30**, **CB_S/H4-CB3 intercepts 3.60**. At `3.50` the sampled ball and receiver centers coincide horizontally, but the failed catch has installed the receiver's `.6 s` retry exclusion. That exclusion and the following defensive opportunity are separate from initial QB selection.
- **G2-P089:** H2-QB1 throws **2.05** to H/D.Freeman; pending completion `.7037`, risk `.0142`. Target disappears by **3.00**, followed by NB/A2-CB3 interception **3.30**. The initial failed opportunity is at a high, stretching ball; this is a repeated difficult-collection chain, not evidence that the QB perceived no nearby defender.
- **G1-P141 is the ordinary opposing direct case:** H1-QB3 works Z→X→Y, pending by **2.30** at completion `.7440`, risk `.01697`, throws **2.40**, and NB/J.Allen intercepts **3.00**. The ball remains targeted through `2.90`; the receiver and NB are within approximately a yard at the ending. The recorded NB estimate near the choice differs from current sampled position by only `.14 yd`, with memory age `0` **before ordinary visual latency**. A legitimate contested INT draw remains plausible. The exact opportunity/roll is absent; no illegal-awareness verdict follows.

**Controls:** G2-P029 has **CB_W/K.Taylor PBU 3.80 → X/Z.Hayes catch 3.85**, so a tip is not automatically a turnover. Ordinary G4-P152 has **NB/J.Crawford PBU 2.85 → incomplete 3.75**. Six official completions follow a sampled target-clearing transition (G1-P107/P118, G2-P029/P060, G3-P037/P051). The law already supports different football outcomes.

The retry law also matters: a failed **tipped-ball** defensive attempt sets that defender's `noCatchUntil` one second ahead; a PBU excludes its defender for `.25 s`, and the failed initial receiver for `.6 s`. Thus these sequences do not demonstrate the same defender getting fresh tipped-ball rolls every tick. An unaltered defensive opportunity that neither catches nor tips has no analogous retry exclusion, so exact opportunity counts would be needed before alleging repeated-draw inflation. Two bodies reaching a tip can legitimately receive different opportunities.

**Owner / smallest action:** QB/Ball with Catching should expose one existing opportunity's actor, `s/dh/z`, catch difficulty, probability, roll, target-clearing cause and retry deadline for a failed-reception witness and an opposing completion. This is a bounded attribution question. The QB estimator's absence of a secondary dropped-ball hazard is a defined approximation, not proved miscalibration. Do not tune risk, hands or INT rates from these four games.

## 2. A swept-ball versus final-body timing mismatch is a concrete catch opportunity lead

**Source limitation confirmed; saved-case invalidity remains needs-trace.** In [playsim.ts](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/playsim.ts), `tick` advances player physics before `updateBall`. [catching.ts](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/catching.ts) lines 55–67 project the player's **current/final** position onto the **whole previous→current ball segment**, then evaluate reach and height at that segment fraction. The body and ball are not interpolated to the same fraction. `updateBall` resolves catches before its ground-ending check, which is correct for a legitimate earlier airborne opportunity but makes temporal consistency consequential near the ground.

The existing calculation is the target of the question: can final body reach to a vacated point create an opportunity absent in a simultaneous relative sweep? No added reach/capacity/system is proposed.

`geometry-sensitivity.py/json` retains offline arithmetic using sampled ball motion, sampled previous body position and the exact native event body position, with the **generous tracking reach bonus**. It checks distance only while interpolated ball height remains at least `.1 yd`. This is sensitivity analysis, not reconstructed native physics.

| Saved witness / first questioned opportunity | Tracking reach | Final-body/ball-segment minimum | Same-time linear minimum | Interpretation |
| --- | ---: | ---: | ---: | --- |
| G1-P020 NB/H1-CB3, INT 4.55 | 1.317 | 1.270 | 1.500 | Candidate reaches an earlier low ball point only under the final-body construction |
| G2-P124 SS/A2-S1, INT 3.55 | 1.282 | 1.211 | 1.369 | Repeated sensitivity after target clears by 3.00 |
| G2-P150 NB/A2-CB3, INT 4.65 | 1.275 | 1.244 | 1.421 | Repeated sensitivity after target clears by 4.00 |
| **G2-P107 CB_S/H2-CB1, INT 3.25** | 1.275 | 1.264 | 1.264 | **Opposing low tipped-ball control reaches in both constructions** |

For G1-P020, the `4.50` sample has ball `(41.6,47.2)`, height `.16`, NB `(41.4,45.7)`; the `4.55` INT event locates NB at `(41.44,45.94)`. The last sampled ball is `1.513 yd` from the earlier NB but `1.270 yd` from his later body. A real moving ball is not at its old point when the body arrives. However, the missing `0.05 s` states, `.1 yd` coordinate rounding, vertical nonlinearity and unknown native contact fraction prevent an exact saved-case verdict. None of the three is counted as a confirmed impossible interception.

**Owner / smallest action:** Catching + Physics should inspect the exact existing opportunity inputs and compare a relative-time swept-envelope calculation on one witness, with G2-P107 and a valid moving catch as opposing controls. Establish native order/geometry first. Preserve genuine tip catches, leaping catches and interceptions. This is a potentially consequential bounded calculation issue under the existing PASS-001/catch-opportunity boundary, not a reason to rewrite ball physics or forbid second collections.

## 3. QB defensive memory is bounded; live receiver/protection inputs retain known information debt

**Named source boundaries confirmed; contribution to these outcomes is unmeasured.** [qbmind.ts](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/qbmind.ts), `observe/estimate/postSnapRead`, uses delayed `see` pictures, gaze-sector acquisition, memories and belief drift. The recording contains the estimates actually returned, and post-snap classification requires newly acquired memory. Memory age `0` is not zero total visual latency. G1-P028 even retains an interceptor estimate with memory age `.30 s` and about `2.64 yd` error near the decision; it subsequently drops and is intercepted. Wrong beliefs and delayed pictures are present, rather than every QB inheriting the correct installed coverage.

The following player choices remain outside that boundary:

- **Receiver prediction:** [QBPass.evaluate](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/qb.ts) line 367 and `release` line 493 call `RouteRunner.predict`. [receiver.ts](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/receiver.ts), `predict` line 343, clones the receiver's **current** position, velocity, facing, energy and private route progress/settled state. The route itself is a legitimate installed expectation; refreshed live execution is different information. All **323** sampled targeted pending choices, including nullified exposure, target a current `route` behavior, so this is an active production consumer rather than an unused helper. Its earliest use is the first evaluated ready read; pending timestamps only bound that use.
- **Protection:** [ProtectionCoordinator](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/blocking.ts), `isRusher`, identifies `rush`/`blitz` from the opponent's actual behavior class. Declaration/reassignment consumes current positions, down/engagement availability; `PassProtector` fits from current rusher position/velocity. Pre-snap declarations and felt own contact are legitimate; hidden installed rusher identity and refreshed remote state are separate.
- **Scramble lanes:** [QBPass.shouldScramble](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/qb.ts) line 535 checks every defender's current position/velocity, current down/engagement and current speed scale. `window` uses acquired defensive position but still reads current down/engagement/speed scale. These are named INFO-003 residual consumers, not a finding that the entire QBMind path is omniscient.

**Controls / limits:** Ordinary G3-P059 completes despite wrong cover0 belief against actual cover1; G2-P097 and G2-P120 retain cover2man belief against actual cover3 yet end differently. Coverage belief alone is neither an error verdict nor a guarantee. All sampled targeted windups selected an installed route, with no permanent protector selected as a pass option. The two different-recipient official catches, G2-P108 and G3-P051, remain subject to the existing incidental-flight acquisition gate; source review found that gate present, so there is no PASS-003 regression claim.

**Owner / smallest action:** Awareness + QB/Protection should reuse INFO-001/INFO-002/INFO-003 and trace one live receiver prediction's actual input picture against its installed route prior. Then choose one bounded consumer; do not combine a new protection coordinator, global perception migration and QB retuning. Exact hidden-state invariance and a newly visible moving-receiver control would answer that future change's question. This saved cohort establishes active source use, not its counterfactual contribution to 34 INT or 19 sacks.

## 4. Repeated edge pressure includes earned defensive wins and useful offensive responses

**Observed positive/control finding; no protection-law defect established.** In **18 of 19 official sacks**, the first QB-contact defender already had a recorded pass block followed by a native `shed` with note `pass: turned the corner`. First-contact rushers are DE_W in 18 sacks and DE_S in one; that asymmetry nominates an access/plan review, not a reason to balance rates. G1-P019 is the exception: Cover0 DE_W reaches the QB without an earlier recorded block. These histories are not evidence that tackles still station-keep under the resolved PASS-005 contract.

- **Ordinary G2-P038:** RT/J.Woods contacts DE_W/T.Patterson **.95**, edge sheds **1.35**; QB/D.Lewis is set on Z by `1.50`, requests forward escape by **2.00**, is grasped **2.05** and sacked **2.30**. Requested escape is not proof the body could outrun a rusher already closing from `1.35`.
- **Ordinary G2-P093:** RT/E.Sanders contacts DE_W/V.Jones **1.40**, sheds **1.55**. QB/M.Hayes progresses Z→Y and requests `(5.15,.71) yd/s` at **2.50**, achieving `(1.31,.34)` before grasp **2.60** and sack **2.90**. Physics independently reviewed the grasp finish as valid; the committed defender dive/fall at `2.65` does not invalidate a retained grasp.
- **Opposing ordinary G1-P192:** edge sheds **1.65**, pressure **2.60**, missed tackle **2.85**; QB/B.Taylor keeps moving/progressing and releases **3.40**, catch **4.55**. Pressure can produce a difficult successful pass. Its later TD is not evidence every earlier decision was correct.
- **Opposing ordinary G1-P027:** the pocket supports multiple reads; QB/B.Taylor declares scramble **3.15** just after an edge shed **3.10**, achieves forward movement and slides **5.65** for `2.41 yd`. This is a useful coverage/escape response, separate from Flex's later defensive scramble-continuity finding.

**Owner / smallest action:** Run/Protection owns the first cutoff request and contact access; Physics owns a demonstrated execution-law failure. Reuse these ordinary opposing examples. Before another protection change, identify a first missed fit or physically achievable request that failed; a sack total and the `shed` label alone do not establish it. Do not raise capacities or reverse PASS-005 from these outcomes.

## 5. Windup re-aiming and scramble declaration require request/achievement separation

**Observed behavior and bounded uncertainty.** QB pending state freezes its expected completion/risk/value at windup. `release` updates the aim with the latest route prediction and recomputes execution pressure/miss variance; it does **not** re-evaluate the pending risk. Across the 298 official targeted throws, median recorded pending→release horizontal aim shift is `.167 yd`; five exceed `1 yd`: G1-P028 (`1.763`), G2-P160 (`1.683`), G1-P142 (`1.542`), G2-P090 (`1.249`) and G2-P073 (`1.086`). These shifts are leads, not defects.

G1-P028 is the largest shift: pressure **2.50**, a missed tackle **2.60**, pending choice by **3.00** at completion `.3886`/risk `.0173`, grasp **3.10**, release **3.15**, drop **4.20**, INT **4.25**. The lower-completion choice is compatible with the existing urgent/panic branch, and an already-started windup is expressly allowed to finish through contact. Both skill/random execution and changed prediction remain plausible. **G2-P090** completes after a `1.249 yd` re-aim, providing an opposing control against removing useful re-aiming just because it occurs in a turnover.

**G2-P138** separates intent from achievement more sharply: QB/D.Lewis is grasped **2.70**; recorded grip stays below the `.6` QB decision-freeze threshold. By **3.30** he is falling with balance `0`; at **3.50** the controller declares scramble and requests `(8.94,-1.76)`, while body velocity is only `(.01,.12)`. Tackle is **3.65**, gain `-8.75`. This is a failed escape request while falling, not achieved rushing access. Measurement owns the resulting statistical classification question; no separate escape-capacity defect is asserted.

**Owner / smallest action:** QB + Awareness should first determine whether re-aim uses an acquired receiver picture and whether the changed point materially crosses a newly acquired risk boundary. Preserve G2-P090's useful re-aim and valid urgent throws. Measurement should keep failed scramble declarations distinct from achieved escape. Neither request warrants aggregate QB tuning.

## Fixed ordinary review ledger

Each row's compact trace contains the phase/read, selected pending values, actual perceived defender samples when available, requests/achieved motion and ending. `C/I/INT` describe the observed pass result, not quality grades.

| ID | Selected action / timing | Observed result and assessment |
| --- | --- | --- |
| G1-P027 | Multiple reads, scramble 3.15 | Slide 5.65, +2.41; coherent escape control |
| G1-P098 | Z→H; throw 2.00 | I 3.65; protected choice, arrival/execution unresolved |
| G1-P137 | Audible All Hitch; H throw 1.85 | C 2.45; wrong post belief does not prevent useful quick response |
| G1-P141 | Z→X→Y; throw 2.40 | INT 3.00; close contest, acquired NB picture, draw missing |
| G1-P185 | Y/Z progression; Z throw 2.30 | I 3.65; no initial pressure; no hindsight unthrown-option verdict |
| G1-P192 | Z→X under edge pressure; throw 3.40 | C 4.55; useful pressure response, later explosive separate |
| G2-P038 | Set on Z; forward escape request | Earned edge grasp 2.05, sack 2.30 |
| G2-P057 | PA, H throw 2.10 | I 3.25; rusher 2.55 yd away at pending sample, urgent execution plausible |
| G2-P093 | Z→Y; forward escape request | Earned edge grasp 2.60, sack 2.90 |
| G2-P097 | Y throw 2.05 | C 2.65; wrong cover2man belief, valid moving target |
| G2-P120 | RB throw 2.05 | I 3.20; high expected completion, not certainty |
| G2-P143 | H throw 1.90 | C 2.50; useful moving-target/re-aim control |
| G3-P017 | PA Z→X; throw 3.15 | C 4.35; protected later progression |
| G3-P059 | X→Z; throw 2.20 | C 3.00; wrong cover0 belief versus cover1 |
| G3-P065 | Heavy Mesh H throw 2.60 | I 3.80; moving QB/near rush, not forced outcome |
| G3-P073 | Four reads, late Y throw 3.90 | I 5.05; no chosen-window trace proves a missed earlier throw |
| G3-P089 | Y vertical throw 2.00 | C 3.60; deeper anticipation control |
| G3-P104 | H Mesh throw 2.00 | C 2.55; cover1 belief versus actual cover2 |
| G4-P023 | Y→X; throw 3.30 | C 4.80; deeper second-read response |
| G4-P059 | X→Z; throw 3.00 | C 4.30; successful curl arrival |
| G4-P113 | X→Z→H; throw 3.65 | I 5.10; edge escape request before later throw |
| G4-P137 | Z Mesh throw 2.05 | C 2.50; close edge, useful quick release |
| G4-P152 | Y throw 2.00 | PBU 2.85, I 3.75; defensive opportunity succeeds without INT |
| G4-P185 | Y Mesh throw 2.00 | C 2.60; cover3 belief versus cover1, later pursuit separate |

Relevant tails reviewed: **G1-P036, G2-P029, G2-P063, G2-P089, G3-P008, G3-P146, G4-P024, G4-P116**. G2-P063's urgent lower-probability throw and ensuing return, G3-P146's long same-carrier contact and G4-P024's broken-contact escape are preserved without assigning their later contact/pursuit mechanisms to QB/Ball. The four capped run exchanges are outside this lane and remain in Run's inventory.

## Reproduction and stopping point

From repository root, run only the retained offline readers:

```sh
python out/accepted-game-deep-audit-2026-10-16/qb-ball/screen.py
python out/accepted-game-deep-audit-2026-10-16/qb-ball/trace.py
python out/accepted-game-deep-audit-2026-10-16/qb-ball/geometry-sensitivity.py
```

The scripts require only the saved checkpoint packet, root's exact per-snap extraction and Python standard library. `trace.py` optionally accepts stable IDs; the five additional controls are listed in `deep-coverage.json`. No test, game or engine execution is hidden in these commands.

The retained recording is sampled every `.1 s`, positions every `.1 yd`, other numbers rounded; native event positions/times are more precise but do not expose ball/body state at the opportunity fraction. Body facing is not gaze. Missing decision causes, alternative evaluations, catch rolls, retry state and exact opportunity geometry remain missing. The next authorized work should choose a bounded existing contract from the findings above; this audit does not promote a fix, new reference, capacity or rate target.
