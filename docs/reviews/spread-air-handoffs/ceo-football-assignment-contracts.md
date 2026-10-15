# Copy to “CEO of Football” — coaching review, not another implementation branch

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


**Resolve the football contracts that the user's film notes correctly leave uncertain.** Supply a small coaching decision for the existing coverage/run owners; do not create a broad tuning project or another overlapping controller implementation.

**P002: coverage when the assigned man blocks.** Cover 1 Off has SS on **Y, a TE who remains in protection**; LB_S is on RB. The user's “man on the linebacker” description refers to a defender's assignment question, not a literal linebacker receiver. SS and Y remain involved near protection. The likely coaching term for an assigned man defender adding to the rush after his man stays in is **green-dog / add-on pressure**; distinguish this from a coffeehouse disguise, a QB spy, a low-hole robber, and a peel rule.

Recommend a call-specific contract: who is eligible to add, which personally observed cues establish that the assigned eligible is blocking, what delay/position keeps a late check-release covered, how front pressure/QB contain/crossers and backfield responsibilities interact, and when the defender should stay rather than rush. Cite credible coaching/scheme references where available and label model assumptions. Do not grant knowledge of the offensive call or let every defender blitz whenever a receiver momentarily slows. Keep play-action deception possible.

**P002 alignment:** native snap centers place LB_W/LB_S .57 yd apart and LB_M/SS .90 yd apart. That supports reviewing crowding, not a universal minimum spacing rule. Check inside/outside leverage, wing/inline eligible spacing, gap fits, depth, pressure and clear release paths. Give the coverage owner the smallest formation/call-specific invariant to investigate, including when a tight/bunched alignment is legitimate. Do not tell them to spread all eleven players uniformly.

**P003 PA Shot:** the film looks like a plausible PA win to the user. Recorded defenders do not declare run; the apex NB declares pass at 1.10 s and SS at .85 s. Decide how an unsure read step differs from a false run commitment and which observations should trigger recovery. One result does not demonstrate that PA always works, and #58 addresses a different slow-receiver blocking cue.

**P045:** actual defense is **Quarters MOD match**, not Cover 0. The question is quarter/match route ownership, top leverage and secondary support when the receiver crosses or breaks. Don't prescribe pure Cover 0 technique as its standard.

**P012 Levels:** the user accepts the pressure/fumble as plausible but doubts concept/formation fit and the QB's available escape. Evaluate intended spacing and legal/achievable throwaway opportunities before recommending a policy. Do not turn every covered play into an automatic safe incompletion.

Return a short decision note with the installed responsibility, acquired cue, allowed mistake, recovery and opposing example for each question you can settle. Explicitly separate real-world coaching practice from our modeling choices. Hand a concrete contract back to Catching And Defensive Pursuit or Run Game. No simulations or suite runs are needed for this coaching review.

**Cost and delivery:** follow `docs/TESTING_COSTS.md`. Name one decision first, inspect compatible saved evidence, then use the smallest failing case and one relevant opposing control if a new check is necessary. A material adverse result gets one discriminating diagnostic, not a larger batch. No automatic roster screen, full games or shared-suite rerun. One integration owner verifies an actual combined runtime candidate once. Return: question/change; evidence for and against with exact source/input/measurement/settings pins; unresolved risk; elapsed runtime; next decision. Keep adverse outcomes and plausible offensive/defensive wins. Check the workboard and claim a bounded file/function scope before implementation; do not treat this proposed routing as another worker's acknowledgment.
