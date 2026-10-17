# Accepted-game checkpoint and deep-audit handoff

**Four games ran once on accepted `70b4db6a3ef53acc1a0e90cd055f1087205daa30`; all completed in 185.123 seconds.** The user explicitly called this checkpoint. This is new observation data and preparation for a deeper football audit, not that completed audit, a new baseline or evidence that individual patches improved game statistics.

The post-merge queue `c933dbc3c2ee3a2d230b70ee1032b9ac4ea49d0b` establishes accepted #125; checkout STATUS/INTEGRATION sections are premerge snapshots. Runtime source is `9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941`. Node 22.23.3, 44 accepted settings/components=1/CF_FLOW unset; fixed 424-player inputs, native calls/rules/condition. No source, tests, capabilities, defaults, ratings, rosters or accepted reference changed. Existing #125 verification and recording-parity evidence were reused; no shared-suite repeat.

| Game | Seed | Home offense / away offense | Final home–away | Filmed scrimmages |
| --- | --- | --- | --- | --- |
| G1 |701| Wide Zone / West Coast |71–38|147|
| G2 |702| Spread / Air Raid |34–27|145|
| G3 |703| Power / Wide Zone |31–19|123|
| G4 |704| West Coast / Spread |73–49|144|

## What the packet contains

740 native log entries; 559 filmed scrimmages with full telemetry; 561 physical observations including two unfilmed two-point tries, with 27,784 paired positional/telemetry frames. There were 28 nullified scrimmages. The 531 nonnullified scrimmages contain 191 called runs and 340 called dropbacks (sacks/scrambles stay dropbacks), 301 throws, 173 completions, 19 sacks, 19 scrambles, 34 interceptions and 42 offensive scrimmage TDs. These are descriptive counts, not defect classifications or NFL targets.

All four game attempts completed; no failed, retried, hard-timeout, unfinished-game or unrun input. **Four individual snaps reached the native 25-second cap**: G3-P003, G3-P087, G3-P141 and G4-P142. Their football terminal yardage/YAC are unknown. The report preserves administrative native values separately and excludes them from terminal gain/stuff calculations; there are 527 known terminal scrimmage endings. Do not call 559 films 559 completed football endings.

The frozen collection budget was 60 seconds/game and 240 total launcher seconds, with 55 seconds soft collection time to reserve artifact writes. Actual native collection including full recording took 115.046 seconds; artifact serialization took 66.788 seconds; the whole batch took 185.123 seconds. The launcher confirms no input/source/tooling drift during collection. Append-only recovery prefixes and explicit interrupted-state handling were prepared before collection, but no failure path was exercised by these four games.

[Compact exact receipt](../../data/reviews/current/accepted-game-checkpoint-2026-10-16.json) · [input/cohort manifest](../../data/reviews/current/accepted-game-audit-inputs.json) · [collector](../../scripts/accepted-game-audit.mjs) · [supervisor](../../scripts/accepted-game-batch.mjs) · [saved-data report](../../scripts/accepted-game-audit-report.mjs).

## First observed lead, with its limits

The four cap cases share **under-center Outside Zone from I/Offset-I formations, sole QB snap possession, no exchange, and no carrier-contact/tackle event**. QB/RB remain in `qb-handoff`/`mesh`; sampled late QB requests become stationary. F approaches the exchange region, but the passive live observer reports no positive F–QB/RB body impulse before 2.5 seconds in these four snaps. Spacing/request interference is a hypothesis, not an observed physical collision. All four such I/Offset-I calls in this cohort cap. The nine other under-center Outside Zone calls use Ace variants and transfer successfully. This is a useful formation/phase clue, not proof that formation alone causes failure.

It corroborates the existing [RUN-006 failed-exchange investigation](../ISSUES.md#RUN-006), not a newly created issue or a demonstrated regression from #125. Reuse #101's saved study and its existing controls; do not repeat that census. Same-game G3-P140 provides **nonmatched context**: same A3-QB1, Ace11 Outside Zone, handoff 1.55 seconds and tackle 3.4 seconds. Coverage, formation and prior state differ, so its outcome is not a counterfactual.

**Run owns the next decision:** locate the first failed/recoverable exchange cue and compare requested paths with achieved reach. Distinguish initial disruption from the lack of a recovery/continuation after it. Flex helps only with an identified responsibility boundary; Physics helps only if requested and physically achievable motion fails. These recordings do not justify more contact capacity or a solver rewrite.

## One shared deep audit

The saved-data tool selected **48 ordinary logged scrimmages**: six called runs and six called dropbacks per declared game, sorted by SHA256 of literal salt `accepted-game-audit-2026-10-16-ordinary-v1`, NUL, fixture ID, NUL, zero-based native log index. Eligibility is a verified, filmed, nonnullified scrimmage; selection never uses gain, TD, sack or scramble outcome. No shortfall, replacement or join ambiguity occurred. **G4-P142 is a capped prefix within that ordinary panel**; keep it.

Twelve separate tail clips cover offensive explosives/contact/escape, defensive stops/interceptions, teammate impulse context and long same-carrier contact-to-stop sequences. They do not enter ordinary-panel frequency claims. Teammate impulse reports are not distinct collisions or evidence of a defect. Long-contact clocks require the same carrier and no intervening possession transfer. The remaining capped IDs stay in the inventory even when outside either panel.

Every owner uses the same stable G1–G4/Pxxx IDs. Review assignment → acquired cue → requested action → achieved response → next responsibility. Record first concerning time/player, a legitimate opposing explanation, what is observed versus inferred, and one useful control. Then deep-trace approximately 6–8 consequential sequences, chosen for repeated mechanisms. Missing causes stay “needs trace”; no automatic resimulation.

| Owner | Saved-data audit question / next action |
| --- | --- |
| Measurement | Maintain one play index, sampling manifest and evidence/issue ledger; verify exposure/precision and link findings to existing issue IDs. No duplicate collector or new games. |
| Run | Start with the four exchange caps and existing RUN-006 evidence. Across the shared panel, assess initial block access, secure combinations/release, second-level interception and runner gathering; separate real defensive wins from broken jobs. |
| Pass / Awareness | Review recognition and responsibility handovers, Quarters top leverage, catch arrival/pursuit and actual thrown-ball decisions. Investigate interceptions through available cues/decision/execution rather than treating the count as a tuning target. Preserve PA uncertainty and legitimate coverage wins. |
| Physics | Inspect suspicious achieved motion/contact in the shared panel alongside normal finishes. G3-P146/G2-P063 are long same-carrier contact contrasts. Distinguish contact validity, requested action and supported movement; sampled data cannot close exact torque/work budgets. No new solver/capacity/fatigue project from a bad ending alone. |
| Flex | Trace cross-system ownership, teammate/defender traffic and phase continuity. For exchange caps, assess continuation only after Run identifies the initial failure; do not duplicate exchange or contact-law ownership. |
| Integration | Preserve this exact accepted pin and evidence; no verification rerun or promotion decision is needed to inspect saved games. Keep compatible approved fixes batching at natural checkpoints. An unresolved finding holds only its proposed fix. |
| CEO | Reconcile repeated mechanisms across owners and choose at most three active fixes with clear owners/interfaces. Football mechanism and transfer outrank improved averages. |

**Paste-ready common instruction:** “Audit the saved 70b4db6 cohort using the shared 48 ordinary IDs and separately labeled tails. Return your two most consequential repeated mechanisms, exact play/player/time evidence, confidence, a legitimate football control and the smallest unresolved question. Separate observations, causal hypotheses and recommendations. Reuse existing issue/evidence ownership. Do not launch games, tune aggregate stats, create a new coordinator/solver or implement fixes during this first review.”

## Retrieval and limits

Local entry point: `out/accepted-game-checkpoint-2026-10-16/index.html`. It links four standalone full-telemetry films plus `report/play-index.{json,csv}` and `report/audit-panel.json`. Raw native results are `accepted/<fixture>/game.json.gz`. Large outputs stay outside git; named draft-release assets and hashes are recorded in [artifact retention](../../data/reviews/current/game-checkpoint-artifacts.json). Draft release tag: `evidence-accepted-games-70b4db6-2026-10-16`, an evidence attachment rather than a build/reference promotion.

```sh
gh release download evidence-accepted-games-70b4db6-2026-10-16 \
  --repo tannerthardy/football-simulation- --dir out/game-checkpoint-download
# Extract each named archive into one directory, then open index.html.
# Reporting is offline; it does not run the engine.
node scripts/accepted-game-audit-report.mjs out/accepted-game-checkpoint-2026-10-16
```

Frame cadence is 0.1 seconds and positions are rounded to 0.1 yard. Full numeric telemetry is sampled/rounded; last-step contacts are not the complete force history. Facing is not gaze; final intents cannot reconstruct unrecorded stages. Two-point native film is absent in the current Game path. Four generated-roster games cannot establish population defect rates, and whole-game calls/condition/RNG diverge from historical builds. These are not paired historical patch comparisons. Native capped ends have unknown football outcomes.

Defer play-calling strategy, season/practice development, detailed fatigue calibration, new rosters/seeds, automatic full-game repeats and unrelated experimental physics. Basic accounting correctness still matters. Use varied saved individual snaps to decide the next realistic-football improvements.
