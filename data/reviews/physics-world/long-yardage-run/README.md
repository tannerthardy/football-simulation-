# Third & 27 run / drop-eight job-ledger probe

Measured on engine content SHA256 `bf3da801c3f8ad3b9729d6e808665bb6f67f9e59c0dbdb0262316267307cf631` with the current centered-hand integration and bounded lower attachments. This is a small actual 11-on-11 diagnostic panel, not an NFL gain-rate target or a complete prevent scheme. No controllers, force limits, alignments or gains were overridden for the probe.

## What was exercised

32 complete plays: two generated roster pairs `[31,32]` and `[41,42]`, strength `.55`, play seed `3`, Inside Zone / Draw, both called directions, two situations, and two defensive looks. Every four-cell situation/look comparison keeps selected physical profiles, actual starting geometry and the declared play seed identical.

- **Situations:** 1st & 10 and 3rd & 27. The existing recognition prior sees the real down/distance. Third & 27 belongs to the existing third-and-7+ bucket; no new prior was invented. First & 10 separates this from the same third-long prior. This comparison changes both down and distance intentionally.
- **Offense:** stock Gun Doubles (11 personnel), ordinary Inside Zone and Draw, audibles off, hurry off.
- **Defense:** stock dime / Over / spot Quarters. The four-rusher look has seven coverage seats. The three-rusher look uses the existing `Pressure.droppers` interface to send `DE_W` to `curl_flat_w`, leaving three actual rushers and eight coverage seats. This is **four front players with a dropped edge**, not three-DL NFL personnel.
- **Depth:** actual FS/SS starting depth is **12 yards in every fixture**. Third & 27 does not move them to the line to gain or add a new prevent depth policy. Actual seat zones, landmarks and starting depths are saved.
- **Run response:** every defender retains a run-fit contract and begins with an unsure read. Existing perception, run/pass recognition, fit and pursuit code decide what happens. Three/eight is an audited snap/first-step job count, not a command to keep eight defenders covering a declared runner forever.

The observer records the actual first native-step rush-controller count, every recognition transition, eight fixed tick snapshots of intended/achieved movement where the play lasts that long, first RB crossing of the LOS, first carrier contact, tackles and field gain. It does not fabricate explanatory decision causes from those observations.

## Results and interpretation

Four snaps per row; means are descriptive of this deliberately tiny debugging panel.

| Concept | Situation | Four rush / seven cover | Three rush / eight cover |
| --- | --- | ---: | ---: |
| Inside Zone | 1st & 10 | 1.79 yd | 1.55 yd |
| Inside Zone | 3rd & 27 | 5.46 yd | 2.59 yd |
| Draw | 1st & 10 | 1.26 yd | 2.59 yd |
| Draw | 3rd & 27 | 1.47 yd | 2.47 yd |

All 32 finished with natural tackle whistles and no physical timeout. No third-and-27 play reached the line to gain. A 5–10-yard gain and a failed conversion can coexist; the script reports these separately. Gains precede game-level penalty acceptance/enforcement, and penalties remain separately recorded.

The defense demonstrably does not receive the hidden run call at the snap. In the three-rusher Inside Zone cases, mean `DE_W` first run-read time changed from **0.95 s** on 1st & 10 to **1.25 s** on 3rd & 27. The Mike changed from **0.825 s** to **1.275 s**, and all four third-long Mikes first committed to pass and then changed their minds. Draw also produced wrong initial pass reads. These are existing observed recognition events; timing alone does not establish that any particular footstep was correct football technique.

The lower rush count did **not** automatically increase rushing gains. Three rushing seats do not remove the dropped edge's body or run responsibility. Blocking targets, read timing and pursuit also change. No success bonus was added to make the panel match an expectation.

Accounting over the panel: maximum planar momentum residual **3.48e-12**, work residual **1.28e-11**, support motor-work excess **0**. These are consistency checks of the current reduced physics model, not proof of full biomechanics or correct scheme technique. Four predetermined observer/full-recording controls matched their unobserved, unrecorded result/events, final body state, intents and enumerable primary RNG state.

Changing the pressure removes one `PassRusher` constructor, so the existing primary RNG draw sequence changes. The same play seed does not guarantee identical component-level random choices across looks. This is a matched whole-system probe, not an isolated one-force causal experiment. Controller/perception state can diverge normally after either treatment. The observer signature does not serialize private solver WeakMaps or the complete controller object graph.

## Film and retained evidence

[Open the offline viewer](../../../../viewer/long-yardage-runs.html) or unzip [the viewer package](../../../../viewer/long-yardage-runs.zip). The four films were fixed before outcomes: first roster, right direction, third & 27, both concepts and looks. Their individual gains differ from group means; they are not outcome-selected examples.

- `LY-R1-iz_strong-3rd27-rush4-R`: 7.31 yd; first contact 5.76 yd beyond LOS.
- `LY-R1-iz_strong-3rd27-drop3-R`: 6.93 yd; first contact 5.78 yd beyond LOS.
- `LY-R1-draw-3rd27-rush4-R`: 10.05 yd; first contact 8.51 yd beyond LOS.
- `LY-R1-draw-3rd27-drop3-R`: 6.14 yd; first contact 4.22 yd beyond LOS.

All are failed third-and-27 conversions. Frames begin at the snap, with full recorded telemetry, profiles, contact and movement intent. No game quarter, score or clock was retained or invented. `clockStops` is the engine's isolated-play flag, not game clock management.

`panel.json.gz` retains all 32 rows, actual job ledgers, source/script/roster/profile/input pins, read transitions, controller samples, accounting and observer checks. `panel-film.json.gz` retains four full recordings. `summary.json` is a convenient extracted summary with additional interpretation limits. `film-integrity.json` verifies packed time, positions, ball, possession, lossless full telemetry, profiles, contexts and the ZIP's exact HTML bytes. Position/ball/facing display retains the existing tenth-unit packing; telemetry is lossless gzip.

`browser-checks.json` and `browser-smoke.log` record an offline Chromium check of four clips, assignment/contact/movement layers, edge/Mike/safety/carrier inspection, stable fixture search, and no JavaScript errors. The inspector check waits for the render frame. A first smoke assertion checked the old heading before rendering and was corrected; no viewer behavior change was required. The reusable smoke script is retained as `browser-smoke.py`.

The focused fixture tests assert legal 11-per-side counts, unique identities, field bounds, actual three/eight versus four/seven seats/controllers, meaningful delayed recognition, stock safety depth and matching physical geometry/profiles. They do not assert exact yards. Source pins and artifact/tool checksums are in `manifest.json`.

## Reproduce

Use the pinned Node 22 runtime in this checkout. The diagnostic is import-safe, so fixture invariant tests do not run the entire panel.

```sh
node --import tsx scripts/diag/long-yardage-run.ts out/long-yardage-run/panel.json
node --import tsx scripts/export-long-yardage-run.ts out/long-yardage-run/panel.json out/long-yardage-run/panel-film.json.gz viewer/long-yardage-runs.html
node node_modules/vitest/vitest.mjs run test/long-yardage-run.test.ts --maxWorkers=1 --minWorkers=1
python3 data/reviews/physics-world/long-yardage-run/browser-smoke.py
```

The browser smoke requires the installed Python Playwright and `/usr/bin/chromium`, opens only a local HTTP page and aborts external HTTPS requests. The current source is rejected if it changes during a panel. Runtime numbers include observations, recording and concurrent work and are **not** a solver speed benchmark.

Next football work from this probe should audit whether stock run fits and the dropped edge's path are taught correctly, then add an explicit genuine long-yardage depth policy when football-controller work is prioritized. A physics failure should first be reproduced by replaying the same inputs and checking local force/contact/momentum changes, without fitting a desired gain or expanding the foot solver.
