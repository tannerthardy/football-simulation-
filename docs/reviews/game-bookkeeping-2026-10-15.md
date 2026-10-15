# Spread/air bookkeeping candidate

**A focused correction is ready for review; no merge or reference promotion.**
Tested commit: `d3ea55c88ef4ea9d84c994abf1677fe507fb6540`, based only on accepted
`develop@a1b16e666a9ee7d1bc1d2aecba141fc535863b24`.
Runtime SHA256: `dbb35834d10c418059816f70efdc070edca08cb66eb23ffe6e39c675c300f0f2`.
[Shared focused receipt](../../data/reviews/current/game-bookkeeping-review/receipt.json)
and [saved observations](../../data/reviews/current/game-bookkeeping-review/saved-observations.json).

## What changed

The question is whether the official record follows the actual possession and
correct enforcement spot without repairing or concealing controller behavior.

- **P022 holding:** the NFL's previous-spot floor also applies when no pass was
  thrown. The old code enforced from a foul behind the line. Correcting that
  floor makes the accepted alternative 1st-and-20 at own 25, rather than the
  old 1st-and-24 at own 20.95. Saved progress bounds the loss at roughly
  7.85 yd; the existing coarse heuristic still accepts there. An exact
  eight-yard control instead declines for 2nd-and-18 at own 27. The heuristic
  is unchanged; the enforcement fix does not settle football decision quality.
- **P038 retained snap:** final stat construction credits a run's sole completed
  snap possession to its actual possessor when no rusher has been assigned.
  The QB gets the five-yard rushing loss. `retainedSnap` and the description
  preserve “snap retained; no exchange.” No transfer, fumble, scramble or
  successful keeper decision is invented. Existing handoff/keeper credit wins.
- **P004/P024 catch depth:** `airYards` remains intended aim depth;
  `completedAirYards` records actual LOS-to-catch depth from the catch segment.
  Completion text uses achieved depth. The old saved prefix measures P004 at
  −5.6461 yd versus 16.5127 intended, and P024 at −4.7170 versus 6.6832 intended.
  Neither was a QB-selected dump-off to the actual catcher.
- **Future records/export:** logs retain possession segments; film exports retain
  target, receiver and rusher IDs plus both depths. Existing `stats.air` remains
  intended depth; `stats.completedAir` is achieved depth. Legacy records lacking
  the new field do not acquire invented catch depth. Boxes already credit the
  actual receiver and retain the intended player's target; that contract is
  explicitly checked and preserved.

The three production files are `src/game/game.ts`, `src/sim/playsim.ts` (final
`buildResult` bookkeeping only), and `src/sim/types.ts`. The replay packer and
three directly affected test files also change. There are no controller,
exchange, catching-contest, physical capability, RNG, flag or dependency edits.

## Evidence for and against

**56 focused checks and typecheck pass** on the exact tested commit with Node
22.23.3 and all 44 recorded flags, including `RUN_CONTACT_COMPONENTS=1`.
The [focused launcher](../../data/reviews/current/game-bookkeeping-review/focused.json)
and [typecheck launcher](../../data/reviews/current/game-bookkeeping-review/typecheck.json)
record unchanged source/validation inputs and no failed or skipped commands.

Controls include a real native handoff, ordinary pass, native scramble with
identical movement/perception/randomness, half-distance enforcement, downfield
holding, safety, third-down stop and turnover preservation, actual-recipient
box credit, and legacy export behavior. New spot/credit scenarios script final
records or construct terminal possession directly; they do not claim to replay
the original physical encounter. Existing native rusher tests execute four
small scrimmage simulations; zero completed games or roster screens were run.

P022's exact raw `PlayResult` was not stored in the original game. Its focal
test uses the described eight-yard sack and the old foul spot inferred from
the recorded next state, not a claimed exact physical replay. The new holding
decision can change later game state and random history; old game results are
historical evidence, not forecasts of this candidate.

[One zero-simulation boundary diagnostic](../../data/reviews/current/game-bookkeeping-review/holding-boundary.json)
calls the candidate's decision method at 7.83/7.84/7.85-yard losses, accounting
for the saved telemetry's .01-yd quantization. All correctly offer own 25 and
still accept. The ball's final spot can improve on forward progress, giving a
smaller loss that only strengthens acceptance. This adverse policy evidence is
preserved rather than rounding P022 into a favorable decline. No exact native
sack result is claimed.

## Unresolved risk

P038's missed mesh and defensive recovery remain Run Game's controller task.
The earlier audit's nine clean experimental uncredited losses (−45.73 yd) remain
visible in their original recordings. This candidate does not rewrite those
boxes or claim to fix the entire run-game distribution. The catch readiness,
hidden deflection, coverage and pursuit work remains with its owners.

The acceptance heuristic is still a coarse distance/down policy, not a calibrated
expected-points model. Post-catch foul timing and more complex multi-possession
stat allocation are outside this correction. Existing research adapters that
use `airYards` still mean intended depth; changing those measurements requires
their own versioned decision. No full combined-suite result is claimed here.

## Runtime and next decision

Focused checks cost **3.309 s**, typecheck **10.324 s**, and offline extraction of
the four saved observations **1.494 s**. No new full games, shared-suite reruns,
fresh rosters or new diagnostic prefix replay. Reuse compatible #54/#57/#58
and prefix receipts rather than repeating their campaigns.

Review this isolated candidate for the next combined integration tree. One
integration owner should freeze and verify that actual combined tree once;
contributors supply focused evidence. No merge, baseline designation, default
switch or adoption of #54/#57/#58 is performed by this branch. Historical
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1` remains unchanged.

## Original film, reusable evidence and rule sources

Evidence publication is
[`4ae667e`](https://github.com/tannerthardy/football-simulation-/commit/4ae667e29b3ce085f43c5cb911b294349cda2b8f),
recording runtime `f62511a513f2187884d74ae3b94435835e43309c` / source
`dd173a3ef44f22b5ee74f3cc17ef15b2137203cea58dd2fa12fbaad12c4784ba`.
These differ from the candidate and its accepted parent.

- [All 21 user notes and owner prompts](https://github.com/tannerthardy/football-simulation-/blob/4ae667e29b3ce085f43c5cb911b294349cda2b8f/docs/reviews/spread-air-film-notes-2026-10-14.md)
  remain preserved on the evidence branch, including believable controls and
  adverse results. The new candidate does not import that experimental ancestry.
- Local original film, in a checkout of that evidence commit:
  `data/reviews/current/experimental-game-checkpoint/experimental/spread-air/film.html`;
  annotated clips: `data/reviews/current/spread-air-film-notes/index.html`.
  Select `G1-P022`/`G1-P038`, or use annotated `#w=p022&t=2.3` /
  `#w=p038&t=1.0`. The exact game is experimental 26–38, seeds 27101/27102,
  game seed 702. GitHub displays the HTML source; open the local file to watch.
- [Existing verified prefix receipt](https://github.com/tannerthardy/football-simulation-/blob/4ae667e29b3ce085f43c5cb911b294349cda2b8f/data/reviews/current/spread-air-film-notes/prefix-receipt.json):
  all 45 original entries match, with missing-state catch observations. No rerun.
- [Run Game #57](https://github.com/tannerthardy/football-simulation-/pull/57),
  head checked `e8a76a7f7cdc19dece85288f93a8d1e1273be0db`, remains diagnostic.
  [Recognition #58](https://github.com/tannerthardy/football-simulation-/pull/58),
  head checked `cb73b08177ba796b3963c91f7afc53beafe77cf8`, remains separate.
- [Official 2026 NFL rulebook PDF](https://static.www.nfl.com/image/upload/fl_attachment/league/tqivdkzt9mu6wdgsh1ku.pdf),
  14-3-6 exceptions 1–3, 14-2-1 and 14-4-5 (PDF pages 62–63), accessed
  2026-10-15: behind-line offensive fouls use the previous spot, with end-zone
  and half-distance provisions preserved.
- [Official NFL GSIS Guide for Statisticians](https://www.nflgsis.com/gsis/documentation/stadiumguides/guide_for_statisticians.pdf),
  Rushing Plays (page 11), sacks (page 14), aborted plays (page 27), accessed
  2026-10-15: rushing credit follows possession; a retained mesh without a
  fumble is not the guide's mishandled-backward-pass aborted-play category.

Follow [the existing cost policy](../TESTING_COSTS.md). A larger suite or games
need a specific remaining integration/interaction question, not another handoff.
