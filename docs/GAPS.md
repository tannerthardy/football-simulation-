# Gaps

The ranked list of where our football is least realistic. Work goes from the
top, usually three at once. Add gaps whenever they're found, and re-rank at a
review. A "fixed when" number says when a gap stops being the problem. It
doesn't judge any single mechanism ([PLAN.md](PLAN.md)).

[KNOWN_PROBLEMS.md](KNOWN_PROBLEMS.md) is the long list behind these gaps:
every known problem, its evidence, what was tried and what's still open.

"Now" is develop at `57f50fc3`: 24 games (`npm run scorecard -- --tier pr`, seeds 7 and 8), measured on 2026-10-22 after the flag promotion (#210) and #205. "Was" is the first measurement, trunk `d91c9014` (24 games, `calibrate.ts`), taken that morning. Both are places to look, not targets.

| ID | Gap | Lane | Measure | Was → now | Fixed when | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | Shared scorecard | tools | `npm run scorecard`, CI on PRs | Runs in CI on every PR; elapsed timing and provenance (#209) | Runs in CI, repeats within noise, shows where a change moved a stat. NFL play-call replay to follow | In progress: NFL play-call replay next | Archived evaluation plan |
| F2 | Simulation speed | physics | Seconds per game | 31.5 CPU → about 38 elapsed (4 workers; more mechanisms on); #204 and #206 cut 14% and 3.6% with games identical | 5 or less, scorecard unchanged | Guardrail only until G1 and G2 are fixed | `physics/world.ts` takes 43% of a profiled game |
| G1 | Defenders don't finish plays | defense | Missed + broken tackles per play | 0.32 → 0.34 (failed defender opportunities 0.22) | 0.11–0.16 (band's PFF definition unverified, #212) | In work: #205 merged (meetings per run 1.57 → 1.89, NFL 2.69); the rest is with Run Game and Main Engine | Runs past 20 yd reach 40 in 75–90% of cases (NFL 25–35%), PR #190 |
| G2 | Run game too explosive | run | Yards per carry; 10+ yard runs | 9.88 → 6.51; 18.1% → 15.9% | 4.1–4.6; 10–12% | In work | Creases 1–2 yd wider than NFL and don't close, PR #191 |
| G3 | Pass defense late on the throw | coverage | Yards per attempt; YAC per catch | 10.1 → 10.7; 8.4 → 8.8 | 6.8–7.4; 4.8–5.6 | In work (#207) | Nearest zone defender closes 0.12 yd during the flight (NFL 0.65), PR #190 |
| G4 | Too many interceptions | coverage | INT rate | 5.8% → 5.0% | 2–2.7% | Open | Tipped-ball re-catch, TIP_AWAY in PR #190 |
| G5 | Edge protection gives way | trenches | Contact time before an edge rusher releases | 0.4 s (not re-measured); sacks 5.6% → 10.8% once realistic line splits went on | about 1.1 s | In work (Main Engine) | Interior pressure already matches the NFL, PR #191 |
| G6 | Too many penalties | rules | Penalties per team-game | 6.8 → 7.1 | 2.5–4 | Open | Defensive offside about 3x the NFL, PR #190 |
| G7 | Play-calling unlike the NFL | coaching | Pass rate and concept mix by situation | Pass rate 57% → 68%; mix untested | Within NFL bands by down and distance | Open | Archived evaluation plan, E3 |
| G9 | No pass protection calls | trenches, coaching | Edge pressures where the same-side tackle blocked nobody | 86% of unblocked edges (#191, `rg3`) | Near the NFL's 39%, with the protection called from what the line can see | Open, after G5's physics | One generic matcher, no slide/BOB/Mike/back scan, rushers read from assignments; KNOWN_PROBLEMS PRO-5 |
| G8 | No league or season | league | A multi-season league runs | One 238-line file | 10 seasons unattended; rating changes have the expected effect | Later | Roadmap phase 7 |

G1 to G3 overlap: a defender who closes late on a run or a catch also misses
the tackle. Re-measure all three after each fix.

## Who is on what

Sessions are named by lane (2026-10-22). Assignments change only at a review.

| Lane | Session | Branch / PR | In flight | Gaps |
| --- | --- | --- | --- | --- |
| run | Run Game | `claude/zen-feynman-7712y8` | Gap-assigner bugs on aligned fronts (RUN-9); blockers who keep driving a released man; DB fits before 5 yd | G2, G1 support |
| defense | Defense | #205 merged | Holds until the next pick | G1 |
| coverage | Coverage | #207 (`coverage/G3-throw-break`) | Break on the throw; the pinned coverage scenes in COV-3 | G3 |
| trenches, physics | Main Engine | `trenches/G5-*` | Why the tackle's hands can't hold an edge rusher (PRO-1) | G5 |
| physics | Tools/Physics | #217 (`claude/admiring-bell-t3ji19`) | Slipping crowd holds (TKL-1): `GRIP_HOLD` | G1 |
| rules, coaching | Rules + Coaching | — | Holds | G6, G7 |
| tools | ChatGPT chats | `tools/F1-*`, `physics/F2-*` | Scorecard hygiene, play-call replay, speed with identical games | F1, F2 |

Three lanes are active per cycle. The first pick was G1, G2 and G3. On
2026-10-22 Tanner added G5 as a fourth, for Main Engine, because the realistic
line splits doubled the sack rate.
