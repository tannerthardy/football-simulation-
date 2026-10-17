# Saved accepted-game audit: Pass / Awareness

**Evidence access:** [Download the audit bundle, scripts and detailed ledgers](https://github.com/tannerthardy/football-simulation-/tree/23d5f6d4f7e88fdd3225a49cc74ae5582a52522e). Paths below refer to files inside that bundle; [report and reproduction guide](README.md). Source links pin the measured accepted engine.

**The strongest next coverage question is the installed trips #3-flat takeover. A separate shallow-crosser boundary can repeatedly replace man and zone techniques on adjacent ticks.** Early over-top depth surrender and several information shortcuts also remain visible, with distinct limits below. These findings do not certify a ready behavioral patch or assign the cohort's scores, interceptions or YAC to one cause.

This is an offline review of engine `70b4db6a3ef53acc1a0e90cd055f1087205daa30`, runtime source `9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941`, immutable dataset `b9b9c17597970ddc87aa4a4e271fc4cfeef71909`. No engine execution, games, installs, tests, production/configuration changes or changed-game counterfactuals were used. Historical accepted #75/#97/#100/#123/#124 contracts are context; the observations here belong only to this saved source.

## Coverage and measurement

The reproducible machine screen covers **366/366 called dropbacks**, including **340 nonnullified and 26 nullified**, through 18,539 positional/full-telemetry frame pairs. Per-game exposure/nonnullified is G1 97/85, G2 97/92, G3 68/64, G4 104/99. There are no capped dropbacks; the four capped run prefixes remain outside this lane's outcome denominator. Nonnullified passing exposure contains 298 targeted native `throw` events plus three throwaways (301 attempts), 173 completions, 34 interceptions, 19 sacks and 19 scrambles. One other dropback ends in a safety. These are descriptive exposure counts.

Detailed review covers all **24 fixed ordinary pass IDs** and **eight pass tails**. Eight additional/deeper mechanism prefixes are retained with exact actors, native events, jobs, sampled requested perception, requests and achieved movement. The ordinary panel has 12 completions, eight incompletions, two sacks, one scramble and one interception; no ordinary pass was replaced for its outcome.

All distances below use rounded planar body centers at the nearest 0.1-second film frame, not a catch contest envelope. Native catch/job clocks can fall between those frames. Requested perception is a channel actually queried by the simulation; its presence does not identify the producing stage, prove gaze/occlusion acquisition, or establish why the final command was chosen. Body facing is not measured gaze. Source `PlaySim.see()` primarily provides latency/dead reckoning; this limitation is particularly material to information claims. Requested input coverage can precede a native check: G4-P184's input/display says Palms, while the actual native plan/index is **Stubbie**. Actual plan/index coverage is used throughout this review.

Reproduce from repository root using the saved, engine-independent scripts:

```sh
python out/accepted-game-deep-audit-2026-10-16/pass-awareness/screen.py
python out/accepted-game-deep-audit-2026-10-16/pass-awareness/mechanisms.py
python out/accepted-game-deep-audit-2026-10-16/pass-awareness/deep-packets.py
python out/accepted-game-deep-audit-2026-10-16/pass-awareness/trace.py G2-P180 Y,H,NB,SS 2.5 3.0
```

The lane folder contains `full-screen.json` (one record per dropback), `summary.json`, `mechanism-screen.json`, 32 ordinary/tail packets, and `deep-manifest.json` with eight deep-prefix/source-file hashes. Automated flags are candidate-selection evidence, not defect counts. No raw archive or shared helper was changed.

## Findings and opposing controls

### 1. Trips #3-flat responsibility remains incomplete after the #2 wall — repeated observed lead, source-supported boundary

**G2-P180, Gun Trips Flood, native Cover 6, quarters strong/half weak:** A2-CB3 (NB, idx19) reads H, walls H from 1.25 and returns to `zone:curl_flat_s` at **2.60**. A2-S1 (SS, idx21) carries H from 2.05; the strong corner carries Z. At 2.60 the NB still targets H: NB `(65.8,15.9)`, H `(65.8,14.6)`, while H2-TE1/Y `(58.7,9.6)` runs the low flat. The NB's requested Y picture is `(58.62,9.99)`, velocity `(0.60,-5.73)`, age **0.30 s**; H is also present in that requested sample. At throw 3.00, NB and SS still target H. Y catches at **4.30**, nearest defender about **9.21 yd** away; 54.50 terminal gain is subsequent context, not proof of the prethrow cause.

**G4-P184, Gun Trips Stick, native Quarters Stubbie:** A4-TE2/Y releases to the #3 flat. H4-S2/NB walls H until **2.30**; H4-LB1/LB_M's `hook_s` also targets H at the 2.10 throw. Both have requested delayed Y pictures (ages 0.25/0.20 s) showing outward velocity about 5.8 yd/s. Y catches at **3.05**, nearest defender about **8.38 yd** away. At 2.30 NB has already requested a hard redirect `(-6.45,7.17)` while achieved velocity remains `(1.17,-0.77)`, so later nonarrival includes real redirection cost. The 35.82 gain is not assigned solely to a responsibility error.

The installed budget matters: an apex wall underneath a safety roof is intentional while #2 is vertical; Flood legitimately stretches high/low coverage. These clips do not prove that both high and low routes could have been covered. The narrower missing contract is **who accounts for the acquired #3 low release as #2's wall ends**, rather than a requirement that the flat never be open. [`quarterFlat`/`wallTwo`](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/coverage/rules.ts#L214) read #2; the generic [two-route flat-expansion shortcut](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/defense.ts#L565) explicitly excludes trips/Fast-3. Stubbie's hook also has its vertical/crosser duties; this review has not established that he should abandon them.

Controls preserve the useful installed jobs. G2-P067, Gun Bunch Four Verticals/Stubbie, has A2-CB3/NB `wall:Y` and A2-LB5/SS `man:Y` at 2.00, with A2-LB3/LB_M on H. Wall plus roof is sound there; Y's 3.90 catch has a defender about **0.92 yd** away despite the TD. G4-P092, Pistol Doubles Curl-Flat/Quarters, retains LB_M `man:Y` from 1.10 and NB `man:H` from 1.15 through the later sideline turn-up. G4-P086 is the **actual Palms** control: CB_S traps Z at 0.95, SS takes X at 1.00, and the apex zones off rather than duplicating the corner's flat match.

Exposure is **53 actual-coverage q_apex-seat dropbacks, 47 nonnullified**; six snaps show a #2-flat-to-man lock, five nonnullified. The two trips witnesses were deliberately traced and are not a failure-rate estimate. **Owner:** existing Pass/Catching coverage-rules owner, consulting Flex on feasible exchange geometry. **Smallest next action:** account for the first requested #3-flat cue, the #2 wall/roof handoff and attainable NB/hook paths on G2-P180 versus the three-vertical and two-route controls. An observation-only producer-stage trace may be needed; no new global coordinator or broad YAC tuning follows.

### 2. Shallow-crosser acquisition and continuation have different entry boundaries — source-supported controller discontinuity; football consequence unresolved

**G3-P008, Mesh/Cover 3 Match:** A3-LB2/LB_M changes `man:H` **1.70 → `zone:hook_s` 1.75 → `man:H` 1.80**. H remains declared `under` in all three native job records. At 1.70 the defender is approximately `(36.2,26.8)` and the requested H picture is `(33.65,18.44)`, age 0.20 s: lateral separation **8.36 yd**, planar distance about **8.74 yd**, moving toward him. The exact intermediate 1.75 motion/request is unsampled; its job change is recorded.

**G3-P104, Mesh/Cover 2 Match:** H3-CB5/DB similarly changes `man:H` **2.05 → `zone:hook_w` 2.10 → `man:H` 2.15**, with H still `under`. This is a useful opposing football outcome: H3-S2/NB carries the observed running catcher from 2.25–2.55, H's 2.55 catch is contested in center-distance terms (**1.06 yd**), and the play ends after 3.95 yd.

The [cut rule](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/coverage/rules.ts#L128) can acquire an approaching under route at planar distance `<9`, but retain it only at absolute lateral distance `<8` and depth `<8`. A receiver approaching through the 8–9-yard annulus can therefore earn a match that fails continuation on the next tick, then earn it again. [CoverageDefender](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/coverage/defender.ts#L86) replaces the subtechnique when that directive changes, resetting its technique state. The source supports this discontinuity; the saved final requests cannot prove how much distance it costs.

The broad rapid-job heuristic flags **28/366 snaps (27/340 nonnullified), including five Mesh calls**; it also includes legitimate handoffs/help decisions and must not be relabeled 28 instances of this mechanism. G3-P008's 80.70-yard TD is not evidence that the short discontinuity caused the finish. **Owner:** Pass/Catching producer, coordinating existing PASS-007/Flex ownership. **Smallest next action:** trace the exact acquired `cut` entry/continuation picture and requested movement around these two three-tick sequences, opposed by a receiver genuinely leaving the area/turning vertical. Any later boundary repair must preserve real delivery and earned crossing-route separation.

### 3. Over-top technique often spends initial depth before the release develops — repeated source-supported cost; no universal defect verdict

The early-depth triage asks only whether an `overTop` man, with a receiver no deeper than four yards, requests x velocity below -1 while still over two yards ahead during 0.30–1.20 s. It finds **97/111 exposed dropbacks** (89/102 nonnullified), including seven ordinary passes. Seventy flags are Cover-3 variants; **27 are other calls**. These are command-pattern counts, not losses or defect rates.

**G1-P192, Comebacks/Cover 3 Cloud:** H1-CB1/CB_W starts 6.6 yards above A1-WR3/X. At **0.50** he requests `(-4.94,1.95)` and achieves `(-1.38,0.33)` while X accelerates upfield. At 2.00 he is about 0.8 yards behind X and requests full upfield recovery. The [over-top branch](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/defense.ts#L311) sets its aim to the seen receiver plus `0.8 + 0.15*positive_vx`, overriding the earlier unreleased-cushion floor. This explains the requested depth compression without invoking extra contact capacity.

Keep the later offensive win separate: X's comeback visibly brakes and reverses; the corner's request responds from positive x at 3.50 to strong negative x by 4.00, but his body must brake. The nearest gap grows **1.08 yd at the 3.40 throw → 6.30 yd at the 4.55 catch**. That is compatible with earned comeback separation and finite redirection. G1-P185's tight Hitches coverage/incompletion and G3-P089's 1.55-yard catch arrival show that this early command pattern does not automatically lose the play. G2-P067's vertical roof remains useful. No population top-leverage certification or historical #124 improvement claim is made.

**Owner:** Pass/Catching man-technique owner; Physics only if an achievable request fails. **Smallest next action:** decide whether the early roof compression is justified by the acquired release/plant on one vertical witness and one real hitch/comeback control. Preserve the ability to close a planted receiver; do not impose a permanent cushion or cap offensive separation.

### 4. Named receiver/coverage choices still use information outside an acquired-picture boundary — source-confirmed debt, not an explanation of these outcomes

The common [perception query](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/playsim.ts#L329) supplies requested delayed opponent pictures and 0.05-second teammate refreshes without observer-owned acquisition/occlusion gating (existing INFO-001/INFO-003). Full telemetry faithfully records those requests; it does not turn them into evidence of a visual acquisition mechanism.

There are also narrow direct consumers: [RouteRunner's option conversion](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/receiver.ts#L125) selects man/zone from `sim.defAlign.coverage.man` plus a misread draw; its [settled-window drift](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/receiver.ts#L224) and [scramble drill](https://github.com/tannerthardy/football-simulation-/blob/70b4db6a3ef53acc1a0e90cd055f1087205daa30/src/sim/behaviors/receiver.ts#L189) score actual defender positions. Zone no-threat fallback uses `sim.qbEyes.pos`, and Rob's window uses actual QB position. Physics eligibility and installed own-call knowledge are not being classified as player-information defects.

Ordinary G4-P137 Mesh/Cover 2 Match and G2-P143 Drive/Cover 1 contain the relevant route/coverage execution, but the recordings do not expose the conversion's producing picture or rejected options. There is no claim that a hidden read caused their gain, or that an interception proves omniscience. The current incidental offensive catch gate is present; no PASS-003 regression is inferred. The G1-P020 target's tracking reversal/difficult opportunity and later interception were checked with QB/Ball, which owns catch/deflection classification.

**Owner:** Awareness with the named receiver/coverage owner; reconcile existing INFO-001/INFO-003 rather than opening a global migration. **Smallest next action:** identify one actual option-route conversion or settled-window drift and compare the information consumed with an acquired defender picture, opposing hidden divergence with a visible man/zone response. No broad recollection or automatic promotion of the held information branch follows.

## Ordinary pass review ledger

This ledger records what the detailed pass/coverage review established, without turning every failed pass into a coverage defect. `Gap` is nearest defender center distance at an offensive catch, not catch probability. Interception recipients are kept separate from intended offensive target geometry.

| ID | Actual call / coverage | Review and opposing interpretation |
| --- | --- | --- |
| G1-P098 | Slant-Flat / C3 Match | H incomplete; flat expansion is recorded on both sides. No simple abandoned-flat conclusion. |
| G1-P027 | Four Verticals / C3 Mable | Scramble; deep responsibilities remain relevant. No catch/arrival outcome to classify. |
| G1-P185 | Hitches / C3 Match | Z incomplete with 1.30-yard nearest gap at throw; useful tight-coverage control. |
| G1-P192 | Comebacks / C3 Cloud | Early top compression plus earned comeback reversal; X catch gap 6.30. Deep trace above. |
| G1-P141 | Hitches / C1 Off | Intended Y; interception at 3.00. Target and interceptor are separate; QB/Ball owns flight/catch diagnosis. |
| G1-P137 | Hitches / C3 Mable | H catches at 2.45, gap 1.25, 5.64-yard TD. Tight catch defense can coexist with a score. |
| G2-P057 | PA Post-Dig / C1 Robber | H incomplete; nearest throw gap 0.57. Legitimate coverage pressure, no automatic PA-read error. |
| G2-P097 | Drive / C3 | Y catch gap 6.10, 7.77-yard finish. Underneath separation is credible; no isolated wrong handoff. |
| G2-P038 | Quick Outs / C3 Match | Sack; no thrown/caught window. Preserve coverage/protection interaction and QB ownership. |
| G2-P120 | Mesh / C3 | RB incomplete; target has space at throw (4.03). An open target does not guarantee catch execution. |
| G2-P093 | Dagger / C3 | Sack; no catch-phase claim. |
| G2-P143 | Drive / C1 | H catch gap 0.45, 8.47-yard finish. Strong man-arrival control. |
| G3-P065 | Mesh / C0 | H incomplete; 2.64-yard throw gap. No sampled convergence defect established. |
| G3-P073 | PA Shot / C1 Robber | Y incomplete; 0.58-yard throw gap. Useful defensive win with PA uncertainty retained. |
| G3-P089 | Four Verticals / C3 Seam | Y catch gap 1.55 despite 26.93-yard gain. Coverage arrival and downfield offensive success coexist. |
| G3-P104 | Mesh / C2 Match | Cut boundary churn plus NB observed-receiver carry; H gap 1.06, 3.95-yard finish. Deep opposing control. |
| G3-P017 | PA Post-Dig / C1 | X catch gap 2.58, 14.33-yard finish. Sharp route/finite recovery is credible. |
| G3-P059 | Hitches / C1 | Z catch gap 1.39, 8.70 yards out of bounds. No blanket man-release failure. |
| G4-P152 | Dagger / C0 | Y incomplete; 1.49-yard throw gap. Coverage/contact need no defect designation. |
| G4-P113 | Comebacks / C3 | H incomplete; 0.61-yard throw gap. Opposes universal comeback inevitability. |
| G4-P059 | Curl-Flat / C1 | Z gap 0.85 at throw → 4.40 at catch; visible plant/recovery question, not proof of hidden throw recognition. |
| G4-P185 | Mesh / C1 Off | Y catch gap 2.72, 34.40-yard TD. Separation and postcatch continuation split with Flex. |
| G4-P023 | Y-Cross / C6 Reverse | X catch gap 0.94, 33.03 yards. Defensive arrival remains real despite the gain. |
| G4-P137 | Mesh / C2 Match | Z catch gap 1.75, 4.60-yard finish. Retain as useful contained Mesh. |

## Tails, deep selection and exclusions from causal claims

The eight relevant tails are **G2-P029, G4-P024, G3-P008, G2-P089, G4-P116, G1-P036, G3-P146, G2-P063**. G2-P029's 98.95-yard Flood play includes PBU/altered-flight context (QB/Ball owns classification); its X catch gap is 2.62. G4-P024 X gap 2.94, G3-P008 Y 1.73, G1-P036 Y 4.87 and G3-P146 Y 2.14 are catch-arrival measurements; later escapes/contact finishes belong to Flex/Physics. G2-P089, G4-P116 and G2-P063 are interception contrasts, not automatic proof of poor QB choice or perfect coverage. These eight never enter ordinary-panel frequency claims.

The **eight deep-prefix IDs** are **G1-P192, G2-P180, G4-P184, G4-P092, G4-P086, G3-P008, G3-P104, G2-P067**. Selection follows repeated mechanisms and their opposing controls. G4-P107 is a separate cross-lane contact check: A4-S1/NB marking Y and A4-S2/SS marking H converge, with sampled 115.80 impulse at 2.00 just after a 1.95 throw to RB; RB catches at 2.55 and gains only 2.26. The actual contact is a useful PASS-007 lead, but its avoidability/producing modifier and impact on the targeted play remain unproved. It does not justify forbidding natural man convergence.

The generic non-rush-defender contact screen finds **13/366 snaps**, all nonnullified. Its last-step flags can include trench defenders after a behavior transition (for example G3-P097), so even a flagged actor pair is not automatically a coverage collision. Contacts are sampled reports, not a complete collision census. Only two route-stop flags exceed 0.4 s: **G1-P086 and G1-P127**, both X on Smash before a scramble, compatible with the installed settled hitch. They do not reproduce a proven universal prethrow route-stop defect. Recognized-flight carry decisions appear in 144/366 snaps (133 nonnullified); this is branch exposure, not successful-contest certification.

The recommended ordering is to settle the bounded Fast-3 responsibility question, then the cut-entry/continuation discontinuity. Early top-depth policy and named information consumers require their own football/control decisions. Legitimate wall/roof combinations, tight man catches, real offensive breaks, play-action uncertainty and finite achieved redirection must survive any subsequent work.
