# Copy to “Run Game”

This handoff concerns the user's first-45-play review of the **experimental spread versus air-raid game**, home/away final **26–38**, roster seeds **27101/27102**, game seed **702**. It does not concern the accepted comparison's 38–21 game.

Pin the recorded runtime: commit `f62511a513f2187884d74ae3b94435835e43309c`, source SHA256 `dd173a3ef44f22b5ee74f3cc17ef15b2137203cea58dd2fa12fbaad12c4784ba`. Original film/audit already exists at evidence publication `3617df38070f23aa0a813e8f5014225b77dd7210` on [PR #54](https://github.com/tannerthardy/football-simulation-/pull/54). The new user-note packet is published on `codex/experimental-game-checkpoint`; refresh it read-only and pin its current head before citing new files. Do not reset your worktree or import the branch's runtime merely to read its evidence. Compare your current source with the recorded source before claiming a finding is still present.

**Where to watch and inspect, relative to any repository clone:**

- Complete original film: `data/reviews/current/experimental-game-checkpoint/experimental/spread-air/film.html`. Open the self-contained HTML in the film room and select `G1-P002`, etc. Play number is `log.index+1`, including kicks.
- Annotated user clips, with direct time links: `data/reviews/current/spread-air-film-notes/index.html#w=p004&t=2.35`. Change the dropdown for all 21 notes.
- Complete original native data: `data/reviews/current/experimental-game-checkpoint/experimental/spread-air/game.json.gz`; input and roster manifest: `data/reviews/current/experimental-game-inputs.json`.
- User observations versus verified facts: `data/reviews/current/spread-air-film-notes/review.json`; index: `docs/reviews/spread-air-film-notes-2026-10-14.md`.
- New missing-state evidence: `data/reviews/current/spread-air-film-notes/prefix-trace.json.gz` and `prefix-receipt.json`. The successful replay through P045 matches all 45 native log entries, positions and events, with 35 physical scrimmages. It supplies full replay telemetry plus passive catch/ball snapshots. These are diagnostic observations, not serialized World restart states. Reuse them; do not automatically replay the prefix.
- Shared existing failure inventory: `docs/reviews/experimental-film-audit-2026-10-15.md`.

In the integration workspace, prefix those paths with `/workspace/football-experimental-games/`. GitHub renders HTML as source; obtain the HTML locally to watch it.

The original and replay use Node **22.23.3**, **44 recorded flags including RUN_CONTACT_COMPONENTS=1**, and accepted center hands / centered integration / legacy support / per-solve work / speculative impacts / mean support / bounded attachments / adaptive contact substeps. Read the exact flag map from the receipt; do not rely on inherited environment values. Accepted comparator is `develop@a1b16e666a9ee7d1bc1d2aecba141fc535863b24`; historical comparison stays `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`. No merge, reference adoption, default switch or experimental mechanics promotion is authorized by this handoff.


**Continue your [PR #57](https://github.com/tannerthardy/football-simulation-/pull/57) diagnosis; these are additional user film annotations, not a request to redo the audit or its three recorded full-game replays.**

**First priority: P038 exchange integrity and recovery.** Gun Wing Wide Zone Weak never hands off, has no identified rusher, keeps the QB as holder and reaches the 25-second cap at −5 yd. Your existing exchange traces already identify the RB passing the mesh around .50 s before transfer opens around 1.00–1.05 s, with the QB requesting zero movement and no early QB/RB body contact. Reuse that evidence. The shared audit finds nine experimental failures and eleven accepted failures; this is not solely a new bundle regression.

Repair the attainable QB/RB exchange/cadence and recovery from failed possession transfer, starting with the known failing scene and a saved successful gun exchange (experimental west/spread P069, handoff 1.05 s, +5.13 yd). Preserve genuine keepers and PA. Do not teleport the ball, extend reach, grant possession on an expired mesh clock, or import rejected gather/release trials. Defensive run fits can remain in a premesh RB-key state while the QB holds; coordinate that acquired-possession recovery separately, without global omniscience. Integration retains missing rushing credit/bookkeeping.

**Separate next question: wide-edge pass protection**, flagged on P005, P018/P019 and P040, with P012 a plausible hit/fumble control. The user's P018 label was Y-Cross; actual P018 is Drive, adjacent P019 is Y-Cross. Inspect both rather than losing the observation to a label mismatch.

- P005 Drive: LT is shed at 1.70 s, QB throws at 1.90 s; +6.16 yd completion. A quick release hides whether the set is sound.
- P018 Drive: recorded corner-turn sheds at 1.70 and 2.15 s; release 2.30 s.
- P040 Y-Cross: DE_W sheds LT at 1.75 s, pressure 2.40 s, sack 3.00 s, −7.36 yd.
- P012 Levels: shed sequence, pressure 2.40 s and fumble 2.60 s. Preserve a legitimate bad offensive outcome.
- Across the saved experimental spread/air game, **81/104 pass calls** contain at least one recorded “pass: turned the corner” shed at/before release, or before ending if no throw. This is an engine event-label rate, including flagged plays, not an NFL speed-rush loss rate or proof every event is incorrect.

The protection controller already tries an arc cutoff, an inside shoulder fit and a beaten-rusher ride. Read `ProtectionCoordinator`, `PassProtector.update` and `cutOffPoint` in `src/sim/behaviors/blocking.ts`, along with the rusher request and engagement transition. Trace the *first* target, kick depth/angle, facing, achievable acceleration/turn/brake, acquisition and eventual shed. Show whether a reasonable request fails, or whether the tackle follows the wrong meeting point. Do not blindly add more kick depth, pass-block strength, grip or speed. Route a short mechanical failure to Physics Sim only after showing the requested movement/contact was coherent.

The user's **P009/P011/P033/P037/P039** runner/guard notes are jointly routed to Do-It-All!'s existing lane/climb work. You supply blocking assignment/keeper/collection expertise; that agent owns its existing spacing/detour branch. Do not independently implement another traffic policy or both edit all of blocking.ts. Agree on function boundaries: protection versus RunBlocker/puller/climber, and carrier read versus final spacing request. P037's +45.51 yd does not certify a sound guard path, while P039's loss does not automatically indict a legitimate DT win.

**Cost and delivery:** follow `docs/TESTING_COSTS.md`. Name one decision first, inspect compatible saved evidence, then use the smallest failing case and one relevant opposing control if a new check is necessary. A material adverse result gets one discriminating diagnostic, not a larger batch. No automatic roster screen, full games or shared-suite rerun. One integration owner verifies an actual combined runtime candidate once. Return: question/change; evidence for and against with exact source/input/measurement/settings pins; unresolved risk; elapsed runtime; next decision. Keep adverse outcomes and plausible offensive/defensive wins. Check the workboard and claim a bounded file/function scope before implementation; do not treat this proposed routing as another worker's acknowledgment.
