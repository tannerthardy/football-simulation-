# Gaps

The ranked list of where our football is least realistic. Work goes from the
top, at most three at once. Add gaps whenever they're found, and re-rank at a
review. A "fixed when" number says when a gap stops being the problem. It
doesn't judge any single mechanism ([PLAN.md](PLAN.md)).

[KNOWN_PROBLEMS.md](KNOWN_PROBLEMS.md) is the long list behind these gaps:
every known problem, its evidence, what was tried and what's still open.

The numeric reference is **`dev-24` at `d91c9014`**, 24 games measured on
2026-10-22, not a measurement of today's trunk. The separate `dev-12` reference
at `3f26d694` is in [KNOWN_PROBLEMS](KNOWN_PROBLEMS.md#baseline-develop-at-3f26d694).
Keep their source and measurement definitions distinct; checkpoint status and
readiness belong in the relevant PRs. Source defaults are listed in [FLAGS](FLAGS.md).

| ID | Gap | Lane | Measure | Now | Fixed when | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | Shared scorecard | tools | `npm run scorecard`, CI on PRs | First version on `claude/project-thread-xqusc8` | Runs in CI, repeats within noise, shows where a change moved a stat. NFL play-call replay to follow | In progress | Archived evaluation plan |
| F2 | Simulation speed | physics | CPU seconds per game | 31.5 (30–80 by game) | 5 or less, scorecard unchanged | Guardrail only until G1 and G2 are fixed | `physics/world.ts` takes 43% of a profiled game |
| G1 | Defenders don't finish plays | defense | Missed + broken tackles per play | 0.32 | 0.11–0.16 | Next | Runs past 20 yd reach 40 in 75–90% of cases (NFL 25–35%), PR #190 |
| G2 | Run game too explosive | run | Yards per carry; 10+ yard runs | 9.88; 18.1% | 4.1–4.6; 10–12% | Next | Creases 1–2 yd wider than NFL and don't close, PR #191 |
| G3 | Pass defense late on the throw | coverage | Yards per attempt; YAC per catch | 10.1; 8.4 | 6.8–7.4; 4.8–5.6 | Next | Nearest zone defender closes 0.12 yd during the flight (NFL 0.65), PR #190 |
| G4 | Too many interceptions | coverage | INT rate | 5.8% | 2–2.7% | Open | Tipped-ball re-catch, TIP_AWAY in PR #190 |
| G5 | Edge protection gives way | trenches | Contact time before an edge rusher releases | 0.4 s | about 1.1 s | Open | Interior pressure already matches the NFL, PR #191 |
| G6 | Too many penalties | rules | Penalties per team-game | 6.8 | 2.5–4 | Open | Defensive offside about 3x the NFL, PR #190 |
| G7 | Play-calling unlike the NFL | coaching | Pass rate and concept mix by situation | Pass rate 57%; mix untested | Within NFL bands by down and distance | Open | Archived evaluation plan, E3 |
| G9 | No pass protection calls | trenches, coaching | Edge pressures where the same-side tackle blocked nobody | 86% of unblocked edges (#191, `rg3`) | Near the NFL's 39%, with the protection called from what the line can see | Open, after G5's physics | One generic matcher, no slide/BOB/Mike/back scan, rushers read from assignments; KNOWN_PROBLEMS PRO-5 |
| G8 | No league or season | league | A multi-season league runs | One 238-line file | 10 seasons unattended; rating changes have the expected effect | Later | Roadmap phase 7 |

G1 to G3 overlap: a defender who closes late on a run or a catch also misses
the tackle. Re-measure all three after each fix.

## Who is on what

Sessions are named by lane (2026-10-22). Assignments change only at a review.

| Lane | Session | Existing branch / research host | Gaps |
| --- | --- | --- | --- |
| run | Run Game | `claude/run-defense-develop`; research `claude/zen-feynman-7712y8` | G2, G4 |
| defense | Defense | `claude/amazing-allen-j37e4r` | G1, G5 |
| coverage | Coverage | `claude/friendly-bardeen-56kqo2` | G3 |
| rules, coaching | Rules + Coaching | `claude/great-mccarthy-85uf8b` | G6, G7 |
| tools, physics | Tools/Physics | `claude/project-thread-xqusc8` | F1, F2 |
| research | Main Engine | `claude/run-game-v3` | — |

Three lanes are active per cycle. The first pick is G1, G2 and G3, so Defense,
Run Game and Coverage work, and the rest hold or support.
