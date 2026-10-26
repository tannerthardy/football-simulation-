# Gaps

The ranked list of where our football is least realistic. Work goes from the
top, usually three at once. Add gaps whenever they're found, and re-rank at a
review. A "fixed when" number says when a gap stops being the problem. It
doesn't judge any single mechanism ([PLAN.md](PLAN.md)).

[KNOWN_PROBLEMS.md](KNOWN_PROBLEMS.md) is the long list behind these gaps:
every known problem, its evidence, what was tried and what's still open.

"Now" is develop at `211db9cc`: 24 games (`npm run scorecard -- --tier pr`, seeds 7 and 8, averaged), measured on 2026-10-25 after #248–#271. The previous "now" (develop `ccdb69cb`, 2026-10-23) is kept in [KNOWN_PROBLEMS](KNOWN_PROBLEMS.md#where-numbers-come-from). "Was" is the first measurement, trunk `d91c9014` (24 games, `calibrate.ts`), taken on 2026-10-22. Both are places to look, not targets. Bands are the scorecard's sourced NFL team-season p10–p90 where one exists.

| ID | Gap | Lane | Measure | Was → now | Fixed when | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | Shared scorecard | tools | `npm run scorecard`, CI on PRs | Runs in CI on every PR; provenance (#209), sourced bands (M3), film detectors (#243) | Runs in CI, repeats within noise, shows where a change moved a stat; same input plays the same game; guards fail on missing data | Games-identical tools done (#249, #250, #252–#254, #257, #262, #265, #270: PERF-3, PERF-4, PERF-6, saved-play replay, review queues). Next: detector precision (PERF-5) | Outside audit 2026-10-23 |
| F2 | Simulation speed | physics | Seconds per game | 31.5 CPU → about 38 elapsed in CI (4 workers); #204 and #206 cut 14% and 3.6% with games identical. 53–55 s elapsed in a 4-core cloud container on 2026-10-23, not comparable with CI | 5 or less, scorecard unchanged | Guardrail only until G1 and G2 are fixed | `physics/world.ts` takes 43% of a profiled game |
| G1 | Defenders don't finish plays | defense | Missed + broken tackles per play | 0.32 → 0.26 | 0.11–0.16 (band's PFF definition unverified, #212) | In work: pursuit request repairs landed (#259, #263, #267); reach (#264) held for rework; new: far pursuers jog on breakaways (TKL-2) | Runs past 20 yd reach 40 in 67% of cases (NFL 25–35%); TKL-2, TKL-5 |
| G2 | Run game too explosive | run | Yards per carry; 10+ yard runs | 9.88 → 5.60; 18.1% → 14.1% | 3.70–4.83; 7.6–12.9% | In work: RUN-12 leftovers; backside crack and helper-veto cases closed as negative findings (#261, #266); combo preparation next, #268 held | Creases 1–2 yd wider than NFL and don't close, PR #191 |
| G3 | Pass defense late on the throw | coverage | Yards per attempt; YAC per catch | 10.1 → 9.7; 8.4 → 7.9 (up from 9.1 and 7.0 on `ccdb69cb`; not yet explained) | 6.35–7.89; 4.53–5.91 | Next: COV-6 (big fast turns), now that ACT-1 has landed; COV-7 cost fixture landed (#271) | Nearest zone defender closes 0.12 yd during the flight (NFL 0.65), PR #190 |
| G10 | Players act on stale or hidden state at the seams | engine (shared) | Stale aims that reach a command; carrier reads before the player's own picture shows the catch; holds granted beyond the arm envelope (outside audit census on its saved seed-7 game) | 2 of 13 stale aims moved a body; 367 of 3,844 carrier reads early; 56 of 122 standing grabs beyond the envelope | Zero stale aims executed and no reads of true possession, while anticipation from the ball's flight still works and same-target controls stay identical; one reach rule for every tackle branch | In progress: ACT-1 landed (#251), #238 gate on acquired pose (#258); INFO-1 (#260) and TKL-5 (#264) held for rework | ACT-1, INFO-1, TKL-5 |
| G4 | Too many interceptions | coverage | INT rate | 5.8% → 4.2% | 1.47–3.15% | Open | Tipped-ball re-catch, TIP_AWAY in PR #190 |
| G5 | Edge protection gives way | trenches | Contact time before an edge rusher releases | 0.4 s (not re-measured); sacks 5.6% → 10.8% after the line splits → 7.9% now (NFL 4.6–9.4%) | about 1.1 s | In work (Main Engine) | Interior pressure already matches the NFL, PR #191 |
| G6 | Penalty mix unlike the NFL | rules | Accepted penalties per team-game, by type | 6.8 → 3.8 total (NFL 2022 5.6, team range 4.8–6.5). Too many illegal contacts (0.7 vs 0.12), groundings (0.2 vs 0.08) and pre-snap defensive fouls (offside plus neutral zone about 0.7 vs 0.45); no DPI, roughness, face mask or delay of game | Each modeled type within the NFL team-season range | Open. The old 2.5–4 total target was unsourced and below the NFL's own total | `data/reviews/nflverse/game-layer.json`; RULE-1 |
| G7 | Play-calling unlike the NFL | coaching | Pass rate and concept mix by situation | Pass rate 57% → 66% (NFL 54–66%); mix untested | Within NFL bands by down and distance | Open | Archived evaluation plan, E3 |
| G9 | No pass protection calls | trenches, coaching | Edge pressures where the same-side tackle blocked nobody | 86% of unblocked edges (#191, `rg3`) | Near the NFL's 39%, with the protection called from what the line can see | Open, after G5's physics | One generic matcher, no slide/BOB/Mike/back scan, rushers read from assignments; KNOWN_PROBLEMS PRO-5 |
| G8 | No league or season | league | A multi-season league runs | One 238-line file | 10 seasons unattended; rating changes have the expected effect | Later | Roadmap phase 7 |

G1 to G3 overlap: a defender who closes late on a run or a catch also misses
the tackle. Re-measure all three after each fix. G10 is a cause behind G1 and
G3, not a symptom: its fixes are judged on restaged plays and controls, and
their stat moves are explained, not targeted.

## Who is on what

Lanes paused on 2026-10-23 after #235–#246 merged; this table was updated on 2026-10-25 after #248–#271. The next cycle follows
[PLAN's "Next after the film threads"](PLAN.md#next-after-the-film-threads);
assignments change only at a review, so the "Proposed next" column is a proposal until
Tanner confirms it.

| Lane | Session | Proposed next | Gaps |
| --- | --- | --- | --- |
| tools | Tools/Physics | Done: games-identical tools. Open: turning measurement (#255, held); detector precision (PERF-5) | F1 |
| engine (shared) | Main Engine | ACT-1 done (#251). INFO-1: rework #260 with an acquired scramble cue, then recompose #256 | G10 |
| defense | Defense | TKL-5: rework #264 with the laid-out span, grip and consumer radii. TKL-2: breakaway effort and the held reduced budget | G1, G10 |
| coverage | Coverage | COV-6 big fast turns; COV-7 pilot (#269) on the #271 fixture with Defense; #224 cushion after ACT-1 | G3 |
| run | Run Game | RUN-12 combo preparation; #268 held | G2 |
| trenches | Main Engine | PRO-1, after G10's first fixes | G5 |
| rules, coaching | Rules + Coaching | Holds | G6, G7 |
| tools | ChatGPT chats | Measurement tasks; each PR verified before merge | F1, F2 |
