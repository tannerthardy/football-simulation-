# Random saved-play nitpick: possession knowledge, useful access and catch support

**The clearest bugs are inconsistent possession-driven job changes.** A man defender can consume a carrying QB beyond the line and keep covering a receiver; after a catch, the engine instead changes every defender to pursuit immediately, without an observer-specific possession gate. The first has a separate candidate already in review. The second supplies a concrete remaining information-boundary question for both teams, including situations where it can help the defense.

The other repeated concerns are **blocking that does not become useful before the runner arrives**, and **catch support that arrives with poor position/momentum and never reaches contact**. These are observed football limitations with unresolved producing stages, not newly proved universal controller or force-law defects. This sample does not establish the simulator's dominant defect ranking.

## What was actually examined

Selection was committed at **`72ed5b0` before inspecting this selection's outcomes**. Within each of four games, rank `SHA256(UTF8(seed + LF + stablePlayId))` and take the first six. Seed: `measurement/random-play-nitpick/2026-10-17/v1`. Calls, gain, duration, prior flags and outcomes are absent from the selection operator. No redraws.

- Population: 531 filmed, nonnullified scrimmages: G1 135, G2 140, G3 117, G4 139. Six per game is equal game weighting, not exposure-proportional sampling.
- Excluded by the declared population: 28 nullified filmed scrimmages, 179 special/admin logs and two physical tries without film. This audit cannot judge special-teams movement, penalty execution or the unfilmed tries.
- All four known censored prefixes remained eligible; none was selected. They still have unknown football endings. This is not evidence that the timeout problem is fixed.
- Selected: **24/24 reviewed**, 11 called runs / 13 dropbacks; 12 throws / eight completions / one scramble. Endings: 14 tackles, four TDs, four incompletions, one slide and one OOB. Native carrier contact occurs in 17 plays.
- All 24 original JSONL byte hashes, 22-player index/slot/team/unique-ID joins and **1,197 paired frames / 26,334 actor-frame samples** check out. No selected missing frame interval above .10s, nonfinite position/velocity, failed extraction or unrun tail.
- Read every selected native event sequence, screened every paired frame and inspected **72 phase-path panels**. Detailed release/exchange, catch/arrival and contact/body/request ledgers cover all 24. This does not claim every animation frame was watched.
- Three overlaps with the earlier 48 ordinary plays: G1-P140, G3-P035, G4-P152. No earlier selected-tail overlap. G1-P127 and G2-P024 also have prior mechanism/accounting work. All four games were previously screened; this is **not a blind holdout**.

The [frozen selection](../../data/reviews/current/random-saved-play-selection.json) and [complete compact review/identities/events/receipt](../../data/reviews/current/random-saved-play-review.json) preserve every selected outcome. They extend the [existing master play index](https://github.com/tannerthardy/football-simulation-/blob/a2a61fde768622c536452a88d6e136373c18c05e/data/reviews/current/accepted-game-play-index.csv), without a replacement dashboard or changed play IDs.

## Source pins and current relevance

| Boundary | Pin |
| --- | --- |
| Actual saved game engine | `70b4db6a3ef53acc1a0e90cd055f1087205daa30` |
| Runtime source SHA256 | `9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941` |
| Original immutable archive | [`b9b9c17597970ddc87aa4a4e271fc4cfeef71909`](https://github.com/tannerthardy/football-simulation-/tree/b9b9c17597970ddc87aa4a4e271fc4cfeef71909) |
| Earlier deep-audit evidence | `23d5f6d4f7e88fdd3225a49cc74ae5582a52522e` |
| Audit/index publication checked | `a2a61fde768622c536452a88d6e136373c18c05e`, PR #129 |
| Fetched accepted develop, start and end of review | `0000e560e0dbe31905151465152d412ba838803d` |
| Canonical integration queue, start and end | `aa9ed35272cc334ce0a7c79eec709970e5c628fc` |

The current accepted runtime adds #128's narrow acquired Quarters force-duty gate. The seven source files used for this review's assignment, man/zone technique, receiver, blocking, engagement, tackle and telemetry trails have identical Git blobs at 70b4 and 0000e56; both sets of blob IDs are in the receipt. That establishes source compatibility for the cited boundaries, not identical whole-game behavior after #128. These films are **not post-#130 or post-candidate football evidence**. #132/#134/#135/#136 and #133 result repairs remain separate candidates; their descriptions/compatible focused receipts are reused as status, not new approvals or executions.

## Three mechanism nominations

### 1. Possession knowledge and responsibility changes: two opposite gates

**Confirmed source boundaries; yardage effects unisolated.** Keep the two gates independently reviewable under existing [CTRL-001](../ISSUES.md#CTRL-001) and [INFO-003](../ISSUES.md#INFO-003).

**Acquired commitment can be ignored.** G1-P127 is a pressured Smash scramble, not an untouched free run. DE_W/H1-EDGE5 produces pressure at2.20, grasps2.35, loses the hold2.70, and misses a dive3.00. Preserve that rush and the QB's earned escape.

At **5.40s**, LB_M/H1-LB1 consumes QB/A1-QB1 carrying=true at **(45.05,32.30)**, age **.15s**, beyond **LOS43+2**. Its belief still says pass, probability .21. Its recorded job is man:H; final request **[+7.92,+4.26]yd/s**, achieved velocity **[+6.31,+5.77]**. It continues away downfield while the QB runs behind it. The first run belief arrives7.70. [`ManCoverage.coverMan`](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/defense.ts#L224) computes `pursueIfLive` but conditions its use on retained belief/throw/catch flags. This reproduces an existing routing failure in an outcome-independent selection. It does not prove a timely alternative tackle from the defender's already distant position.

**Use existing #132, not a second patch or panel.** Its saved-stage acquired-QB and PA/unknown/recognized-flight controls are the relevant focused checks. This audit neither reruns nor independently accepts that candidate. #134's unkeyed expected mesh and #136's offensive exchange recovery are different boundaries; no failed exchange was randomly selected here.

**Private catch completion can instead notify everybody.** In [`assign.ts:onBallCaught`](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/assign.ts#L310), every off-ball offensive player becomes `DownfieldBlocker` and **every defender becomes `Pursuit`**, with no observer check. [`Pursuit.update`](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/defense.ts#L863) obtains `sim.carrier` and calls `chase`; the latter delays coordinates but already receives the true carrier identity. Rules and physics may know possession; this is a player-choice boundary.

Across this selection's **eight catches**, all **88 defender actor updates** in the first strictly later saved frame are pursuit while their consumed receiver-possession cue is still **false**. This is an exposure count, not 88 demonstrated bad movement requests. Legitimate flight anticipation can also motivate pursuit-like movement before secure possession; a false cue alone would not prove a wrong choice. The unconditional source conversion establishes the bypass.

The inspectable witness is **G3-P079 CB_W/H3-CB3**. H/A3-WR2 catches3.75. At3.70 the corner has man:X, request[1.66,9.73]; at **3.80** it has pursuit, request **[6.85,5.19]**, achieved[4.97,4.04], while its H cue is carrying=false, age **.40s**. Its first sampled positive H-possession cue is4.20. It is roughly25yd across the field. The earlier flight already influenced its approach, so this does not attribute the entire turn to the catch or claim no legal anticipation. It does show the global conversion takes effect before local positive possession evidence. The same completion runs69yd: offensive success does not excuse defense-favoring hidden knowledge.

**Consumer/next decision:** Catching + Awareness/Flex, after the currently owned boundaries. Name the legal cue that retires each role; preserve an anticipatory ball approach and G1-P075/G4-P015's immediate close catch/contact. Freeze observer information and vary an unseen possession transition to ask whether a player choice changes. The immediate question is the existing local conversion/consumer boundary, not a universal phase manager or a full awareness rewrite. #135's receiver forecast does not repair this gate. Offensive downfield conversion and its live target-selection reads need the same distinction; no offensive yardage benefit is quantified here.

### 2. Useful blocking access, measured at runner arrival

**Repeated observed limitation; some valid defensive wins.** Continue [RUN-007](../ISSUES.md#RUN-007) and the existing Run-owned approach work. A climb event or a positive gain is insufficient evidence of protection.

| Witness | What actually becomes useful, or fails before contact |
| --- | --- |
| G3-P035 Counter, +3.86 | RG kick and RT wrapper have no sampled block membership or native block_contact during the play. At runner contact2.70, RG is2.90yd from the end it was assigned. The end wins a first grasp; the runner slips it and the secondary finishes. Positive gain hides absent kick/wrap access. |
| G4-P109 Counter, −3.56 | Neither puller establishes a recorded engagement. At2.10, RG–DE_W separation1.43yd, RG achieved[−1.50,+3.09], request[−1.20,+1.50]. End grasps runner2.15; block_log2.40 is too late to explain initial access. This is failure to obtain the block, not a block losing after contact. |
| G4-P041 Power, +4.95 | Y and later RT perform actual first-level work. LG kick has no recorded engagement before Mike contacts the runner3.20. Successful first-level work and an unfulfilled other job coexist. |
| G1-P195 Inside Zone, +6.54 | C leaves toward Mike1.65, retargets NB, first new loaded contact3.35; runner contact is3.25. RT reaches Mike3.80. A long enough gain cannot validate late support. |
| G3-P123 Power, +1.97 | RG kicks DE_S2.50 and LT joins Mike2.30 before runner arrival3.10. C leaves NT1.05 but never collects LB_W, who tackles. Do not call the successful kick a physical failure because another fitter is free. |
| G2-P142 Inside Zone, −1.05: opposing control | C actually engages Mike1.90 before runner contact2.35, yet DT_S wins against LG and makes the tackle. Useful second-level blocking exists in a losing play. |
| G2-P062 Trap, +3.43: opposing control | RG reaches DE_S2.10, before runner contact2.95. LB_W remains available to finish. A puller can achieve useful work with existing physical capacity. |

The two Counters are **2/2 selected Counter contexts with no acquired kick/wrapper block**, not a Counter-wide defect rate. Block-event absence is paired with the sampled membership check; a body bump or unsampled membership is not silently converted into proven useful loaded protection. The full saved events would record a new primary engagement. Sampled links also include helpers, so a missing `block_contact` event alone was never used to declare a missing combo join.

**Consumer/next decision:** Run. Reuse the existing G2-P099/G1-P164 forecast/request/spacing/body diagnosis and #126's preserved command-contract hold. For a selected pull, identify the first feasible acquired target picture, held ordinary request, modifier and actual strike access before runner arrival. These recordings preserve final intents and achieved velocity, but not all discarded requests or pull-state decisions. Coordinate missing-stage capture with Flex only if that boundary remains the decision. No earlier universal climb, strength change, spacing bypass or automatic Counter rerun is supported.

### 3. Catch support must be assessed before tackle execution

**Observed approach/geometry limitations, not two proved broken tackle laws.** Link [PASS-004](../ISSUES.md#PASS-004) while keeping these current-cohort half-field plays distinct from experimental P045.

| Measured actor | G3-P079 Dagger vs half/quarters, catch3.75 | G4-P066 Comebacks vs Cover2, catch3.75 |
| --- | --- | --- |
| Receiver ID | H/A3-WR2 | Z/H4-WR3 |
| Receiver stored velocity, last pre-catch sample3.70 | [8.03,−.87]yd/s | [2.44,+2.67]yd/s |
| Same half safety ID | SS/H3-S1 | SS/A4-S2 |
| Safety stored velocity3.70 | [3.80,−4.36]yd/s | [.27,+4.43]yd/s |
| Safety separation3.70 | 4.43yd | 4.41yd |
| Minimum same-safety sampled separation after catch | 3.748yd | 3.000yd |
| Native first carrier contact | None | None |
| Native gain / physical YAC | 69.00 /46.707yd | 71.90 /55.184yd |

In P079 the half safety initially works toward the outside receiver while H continues vertically; its recorded target changes to H around2.50. In P066 it already reads Z but loses longitudinal momentum while widening. At2.00 it consumes Z velocity[6.55,0], age.25, while achieving[1.05,.55] and requesting[1.13,.57]. These are different cue/role/approach situations, not one established shared cause. A half safety can face a legitimate two-route conflict; the chosen offensive patterns can earn wins.

The late pursuit requests acceleration in both cases, but the safety starts the catch poorly positioned and moving mostly laterally. No actual carrier contact occurs anywhere in either completion. They **cannot test grip force, continuous hold, tackle strength or contact response**. Preserve the offensive catches, cuts and speed. An unchanged current catch source does not prove either native catch opportunity invalid.

Useful contrasts: G2-P002's safety closes and grasps.50s after catch; G1-P075/G4-P015 obtain contact at the catch; G1-P180's inside support reaches the slant3.10. **G3-P120** has actual NB grasp5.25, slip5.65, new CB/SS wraps6.20/6.35 and OOB6.70. Its first-contact-to-ending elapsed1.45s is not one continuous hold. Its receiver nearly stops at catch4.00; it is not an in-stride P045 analogue.

**Consumer/next decision:** Catching/Pass. Compare a named half-safety threat/turn/arrival choice with a short completion that retains useful approach. Establish the legitimate assignment conflict and producing request before changing pursuit or capacity. No new general coverage-motion packet, broad acquisition or NFL query was launched. Existing BDB weeks1–9 and isolated AMF work remain preserved and separate; their narrow samples do not certify these routes or show what P045 should look like.

## Other nitpicks that should not become unsupported fixes

- **Actual negative YAC:** G2-P024 catches while moving backward, stored vx−4.63 at5.10; physical catch→stop x105.0343→102.4442 produces−2.590yd. It starts requesting a turn while momentum is still backward. This is not the six end-zone-credit artifacts from the earlier accounting review. Optimal postcatch steering remains a separate question; negative YAC alone is not a bug.
- **Teammate traffic survives both good and bad outcomes:** six selected snaps expose positive all-step teammate impulses. G4-P066 LG/F contact peaks1.40; G4-P152 C/LG contact begins1.70; G3-P137 includes28 positive step entries during overlapping loaded front work. Counts are steps, not distinct incidents. Source units are kg·yd/s. Neither PBU nor TD identifies the traffic's cost or proves a feasible avoided route.
- **Contact can be useful despite continued gain:** G1-P075 has grasp at catch3.30, fall3.85 and terminal tackle4.25 while the receiver still advances5.48yd. These are actual contact/execution observations; the saved cadence lacks the complete impulse/support ledger needed to attribute continuing movement to a bad law. Do not replace this with “defender failed to reach.”
- **Keep real defensive ball wins:** G2-P122/G4-P152 named PBUs and G4-P042's line bat have direct events. G2-P154's uncaught vertical has no named PBU/drop and cannot be assigned to bad hands from absence alone.
- **Goal-line ordering is not settled by a tied event timestamp:** G1-P177 records grasp and TD at2.75. Both occur in one native interval; that does not establish a valid stop before the plane or a bad TD. G3-P137 has no runner contact before scoring; blocked defender traffic deserves review without inventing a free tackle.
- **Clock display can mislead:** G4-P109 starts with16.413s, no offensive timeout and a Counter. The adjacent FG G4-P110 displays0s. Existing `entry()` rounds the game clock; `step()` checks period expiry after each play. A positive sub-half-second snap can display0. No exact pre-FG clock is saved here, so this does not prove an illegal extra down. It also does not establish optimal late-half playcalling. Adjacent index rows are contextual checks, not additional randomly sampled snaps.

## Every selected play: both teams judged independently of gain

| Play / outcome | Offense | Defense / limitation |
| --- | --- | --- |
| **G1-P075** Gun Spread — Dagger · +21.74yd / tackle | Protection keeps four rushers outside5.7yd at release2.00. Y makes a moving tight catch3.30; real offensive completion. | NB obtains immediate grasp at3.30, receiver falls3.85, stop4.25. 5.48 physical YAC after grasp is an execution ledger question, not a missed-approach label. |
| **G1-P127** Gun Doubles — Smash · +27.86yd / slide | LT loses DE_W access: pressure2.20, grasp2.35; QB slips hold2.70 and earns escape. Scramble3.20, slide8.65; 27.86yd includes a real broken tackle. | LB_M consumes carrying QB beyondLOS+2 at5.40, age.15, while pass belief persists; continues man:H until run read7.70. CTRL-001 repeats. Preserve DE pressure and earned escape; #133 handles already emitted pressure credit. |
| **G1-P140** Singleback Ace — Draw · +4.13yd / tackle | Draw sell and successful1.45 exchange; first-level work lets RB redirect to4.13yd. Y/C release2.85/3.25 does not prove timely second-level work. | CB_S contacts4.05, NB assists4.20, runner falls4.25, stop4.65. Useful outside-in finish; no blanket support failure. |
| **G1-P177** Singleback Twin TE — Duo · +1.34yd / touchdown | Duo creates1.34yd needed at goal line. Existing first-level loaded blocks survive runner arrival; TD2.75. | Mike earns grasp at2.75 as goal plane is crossed. The recorded2.75 wrap is not an opportunity that should automatically erase a TD; event interval/order lacks exact crossing chronology. |
| **G1-P180** Gun Trips Open — Slant-Flat · +12.13yd / tackle | Slant wins moving completion2.45;12.13yd. Protection works despite a later DE_S/DT_S teammate bump. | CB_W trails cut; LB_W closes from interior and grasps3.10, fall3.30, stop3.70. Preserve complementary pursuit and legitimate first down. |
| **G1-P195** Pistol Doubles — Inside Zone · +6.54yd / tackle | C leaves DT_S1.65 toward Mike, later retargets NB. New block3.35 is after runner contact3.25, despite6.54yd gain. RT only gets Mike3.80. | DT_S stays involved against RG and grasps3.25; FS assists3.45. Useful defensive win within a positive offensive play; second-level timing unresolved. |
| **G2-P002** Gun Wing — PA Post-Dig · +25.62yd / tackle | PA Post-Dig creates cut/separation and25.62yd completion4.30. Edge reaches1.94yd from QB at2.90 release; no native pressure event. | CB_S follows and FS closes/grips4.80, CB assists5.15, stop5.60. The completion and short YAC are earned; proximity to QB alone is not a pressure credit. |
| **G2-P024** Gun Doubles — Comebacks · +10.34yd / tackle | Comeback caught5.10 with stored vx-4.63yd/s. Requests begin turning after catch; physical YAC-2.590 from105.0343 to102.4442. This is actual backward motion, not end-zone credit artifact. | CB_S closes from4.00yd at catch to grasp6.20, fall6.45, stop6.85. Preserve catch while moving backward and finite braking; exact optimal postcatch steering unproved. |
| **G2-P062** Gun Trips — Trap · +3.43yd / tackle | Trap RG earns DE_S contact2.10 before RB contact2.95; actual access control. LT releases1.60 but no LB_W engagement before tackle. | LB_W stays free to grasp2.95 despite successful trap elsewhere.3.43yd does not certify second-level protection; later block_log3.05 cannot explain earlier success. |
| **G2-P122** Gun Spread — Dagger · +0.00yd / incomplete | Dagger throw2.25 before Mike blitz reaches QB; no lost-protection outcome invented. | CB_S PBU3.10 and incomplete3.75. Preserve real defensive ball win; source catch-opportunity uncertainty does not invalidate this named PBU. |
| **G2-P142** Singleback Ace — Inside Zone · -1.05yd / tackle | C climbs1.10 and actually links Mike1.90 before RB arrival2.35. Useful second-level work exists in a-1.05yd loss. | DT_S beats/works past LG into RB2.35; fall2.50, stop2.85. Opposing control against globally earlier/later climbs or stronger blocks. |
| **G2-P154** Gun Trey (TE attached) — Four Verticals · +0.00yd / incomplete | Four Verticals throw2.05; no PBU/drop/catch named, incomplete4.20. No hands failure diagnosis without exact opportunity/draw. | NB follows H, FS converges. Their late proximity cannot establish which initial ball/player query or execution failed; valid defensive stress, cause unknown. |
| **G3-P012** Gun Doubles — Inside Zone Weak · +4.56yd / tackle | Inside Zone Weak exchange1.05; C releases1.75, only reaches LB_W2.75. RB earns4.56yd through first-level work. | CB_W grasps3.15, falls3.25, runner falls3.30, stop3.65. Contact/fall sequence exists; no automatic tackle-strength defect. |
| **G3-P035** Gun Doubles — Counter · +3.86yd / tackle | Counter gains3.86 despite neither RG kick nor RT wrapper acquiring a sampled block or native block_contact. RG is2.90yd from end at runner contact2.70. | DE_W wins initial access2.70; RB slips hold3.10; LB_W/CB_W complete tackle3.90. Genuine escape plus useful defense; positive gain hides failed blocking access. |
| **G3-P079** Gun Trips — Dagger · +69.00yd / touchdown | Dagger completion3.75 for69.00yd,46.71YAC. H/A3-WR2 already carries8.03 forward/.87 lateral speed at3.70. Protectors buy2.55s throw. | Half safety H3-S1 is already behind/wide at3.70, forward3.80/lateral-4.36. No carrier-contact event; same-safety postcatch min3.748yd. CB_W globally switches to pursuit while its catch cue remains false. No grip claim. |
| **G3-P120** Singleback Trips — Y-Cross · +17.12yd / oob | Y-Cross reaches third-and11 with3.13air/13.99YAC. Y/A3-TE2 stops near catch then accelerates; completion is not a running in-stride P045 analogue. | NB initially walls H; late Y flat support is8.82yd away at catch4.00. NB actually grasps5.25 then slips5.65; CB_S/SS rewrap6.20/6.35 and force OOB6.70. SS/CB traffic6.65 occurs after new contacts, not proof of missed approach. |
| **G3-P123** Singleback Twin TE — Power · +1.97yd / tackle | Power RG actually kicks DE_S2.50. LT joins Mike2.30 before RB arrives3.10; C releases NT1.05 but never reaches LB_W. | LB_W makes first grasp3.10 while Mike is occupied; FS assists3.75, stop3.85.1.97yd reflects a free other fitter, not failure of the successful kick. |
| **G3-P137** I-Form Pro — Duo · +1.40yd / touchdown | Goal-line Duo wins1.40yd with loaded first-level work and no runner contact; F reaches DE_S2.40. | NT/DT_S and DE_W/DT_W teammate contacts overlap while blocked;28 positive all-step teammate entries,678.04kg*yd/s total. This is a traffic lead, not28 avoidable mistakes; no free clear stopper demonstrated. |
| **G4-P015** Gun Bunch — PA Shot · +19.88yd / tackle | PA Shot complete3.60 for19.88yd despite RB falling2.30 against blitz. QB releases2.45 before free blitzer can finish; OL work still useful. | CB_W stays close and grasps at catch3.60, runner falls3.90, stop4.30. Preserve direct catch-to-contact defensive execution even after protection access deteriorates. |
| **G4-P041** Singleback Trips — Power · +4.95yd / tackle | Power gains4.95; first-level block and RT join2.35 work. LG kick has no recorded engagement before runner contact3.20. | Mike reaches RB3.20 and FS assists3.55, stop4.00. Useful defense and successful first-level offense coexist; gain does not validate the missing kick. |
| **G4-P042** Gun Empty — All Hitch · +0.00yd / incomplete | All Hitch throw2.30; current protection still cannot remove every line-of-flight bat. | DT_S bats at2.45, incomplete3.35. Explicit line deflection is a legitimate defensive win; no receiver drop inferred. |
| **G4-P066** Strong Offset I — Comebacks · +71.90yd / touchdown | Comebacks completion3.75 for71.90yd/55.18YAC. Receiver is slowing at3.70, stored velocity[2.44,2.67]; legitimate catch then acceleration. LG/F teammate impulse1.40 occurs independently of final score. | A4-S2 half support is4.41yd away at3.70, moving[.27,4.43]; postcatch same-safety min3.00yd, no carrier contact. A4-CB5 never closes inside4.71yd. Untouched chase is not a missed grip. |
| **G4-P109** Singleback Trips — Counter · -3.56yd / tackle | Counter loses3.56: RG kick/RT wrapper never acquire block; RG gap1.43yd at2.10 before runner grasp2.15. Source/request-stage choice versus finite body turn unresolved. | DE_W wins access and real tackle2.15, fall2.40, stop2.75. block_log2.40 happens after access is already lost. Context16.41s/noTO: following FG displays0s but rounded clock cannot prove illegal snap. |
| **G4-P152** Gun Doubles — Dagger · +0.00yd / incomplete | Dagger throw2.00 while C/LG have positive teammate impulses beginning1.70; no attribution of PBU to this jam. | NB earns PBU2.85; incomplete3.75.20 all-step teammate contact entries are not20 incidents or proof of absent protection. Preserve defense and examine only named request stage if owner needs it. |

## Reproduce without playing football again

Raw selected extracts remain **outside the simulation repository** at `/workspace/datasets/random-play-audit`; all originals remain in the existing immutable archive. Use the existing cached archive objects, not another acquisition campaign. The bounded reader does not import engine modules or construct players. On a different host, restore/access those same original archive objects first; `git show` can lazily fetch missing blobs, so coordinate existing data rather than unknowingly downloading309MB again.

```sh
python scripts/diag/random-saved-play-audit.py \
  --extract --measure --data-root /workspace/datasets/random-play-audit
# Optional phase-path plots from the same saved records; matplotlib/numpy required.
python scripts/diag/random-saved-play-audit.py \
  --plots --data-root /workspace/datasets/random-play-audit
```

The query verifies original raw-line hashes, identities, paired timestamps and extracted-file hashes, then emits `out/random-play-audit/measurements.json`. It records event original index/time, bracketing frame offsets, stored velocities, final intents, consumed cues/ages, sampled block memberships and per-defender postcatch minima. The compact review stores human judgments and the exact named frame excerpts. The four optional plot sheets use the existing raw replay schema; they are static inspection aids, not a second dashboard or new collection framework.

**Cost:** zero simulations, games, new rosters/seeds, engine suites, baseline reruns or new dataset bytes. One pass through cached archives took32.181s; the two measurement passes took.947/1.692s. Other offline inspections/plots were not recorded as one unified wall-time bill. The first plot failed when a local `inspect.py` shadowed Python's standard module; renaming it resolved the import and all four sheets completed. No engine ran on either path. Final syntax/selection/receipt/data checks are reported in the handoff, without repeating unchanged engine tests.

Positions are rounded.1yd, stored velocities mostly.01yd/s, frames.10s with terminal.05s intervals and some negative-time pre-snap history. Event labels occur on native50ms boundaries and need not sort chronologically in the event array. Keep bracketing states distinct from exact event states. Nearest defenders can change identity; the named safety minima retain one ID throughout. Sampled links and last-step contacts cannot establish uninterrupted grip, full force/work history or continuous clearance. Final intent cannot recover discarded requests. Modeled `see()` is consumed evidence/latency, not NFL gaze. Tracking cannot measure grip force. No causal outcome counterfactual, population defect rate, current-build panel or NFL-wide validation is claimed.

The existing owners should receive the exact relevant cases and reuse their focused checks. Integration owns any later combined verification and one agreed post-batch comparison; this audit does not schedule or launch one automatically. Preserve #129's play index/issue links and #133's independent accounting delta. The practical next step is local possession-boundary review plus useful-arrival diagnosis, with valid offensive/defensive controls retained.

Published to the existing [audit consumer/#129](https://github.com/tannerthardy/football-simulation-/pull/129#issuecomment-6241836058), [Catching/#132](https://github.com/tannerthardy/football-simulation-/pull/132#issuecomment-6241836629), and [Run/#136](https://github.com/tannerthardy/football-simulation-/pull/136#issuecomment-6241837184), with a separate Integration handoff on #130. These are evidence handoffs, not candidate approvals.
