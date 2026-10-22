# Gaps

The ranked list of where our football is least realistic. Work goes from the
top, at most three at once. Add gaps whenever they're found, and re-rank at a
review. A "fixed when" number says when a gap stops being the problem. It
doesn't judge any single mechanism ([PLAN.md](PLAN.md)).

[KNOWN_PROBLEMS.md](KNOWN_PROBLEMS.md) is the long list behind these gaps:
every known problem, its evidence, what was tried and what's still open.

The numeric reference below remains **`dev-24` at `d91c9014`**, 24 games
measured on 2026-10-22. It is not a measurement of the current trunk.
The separate `dev-12` reference at `3f26d694` remains in
[KNOWN_PROBLEMS](KNOWN_PROBLEMS.md#baseline-develop-at-3f26d694).
Do not combine their numbers or relabel them after a merge.

### Checkpoint status — 2026-10-22 America/Phoenix

- **Merged code:** `develop` was rechecked at
  `53d5c241fcd10ac3192e33478cd4f0ffe752060f` after #204. Fetch it again before
  work. #190/#191/#192/#193/#194/#196/#198/#199/#200/#201 are already merged;
  their old ownership rows are not a pending integration queue.
- **Enabled defaults:** [FLAGS](FLAGS.md) records 77 source switches: 22 on,
  54 off and one identity scale. Merging default-off research does not enable
  it or validate its claimed football improvement. Historical baseline profiles
  can override code defaults and remain distinct.
- **Verified, awaiting merge authorization:** #202 navigation and #203's
  `sampled-geometric-pressure-v2` measurement repair compose with #204. #203
  is not a protection/controller fix; historical pressure results retain their
  original operator. The [contract and endpoint limits](https://github.com/tannerthardy/football-simulation-/blob/ed8c250b373b6bbd446a119a9e4b0d8bb695435a/docs/reviews/pressure-measurement.md)
  are published in [#203](https://github.com/tannerthardy/football-simulation-/pull/203).
- **Validated scope:** #204 removes repeated World closure allocations. Its
  six-game one-worker benchmark uses 14.3% less measured CPU / 16.3% less elapsed
  time; a compiled ordinary-game control saves 5.7% CPU / 6.1% elapsed.
  Two detailed native traces and six quick-game records match; the existing
  12-game-per-arm CI also has identical non-timing records/probes. This supports
  bounded performance/equivalence claims, not better pursuit, blocking or tackles.
  [Pinned evidence and limitations](https://github.com/tannerthardy/football-simulation-/pull/204).

No gap is closed or re-ranked by this checkpoint. Existing lane assignments
remain; no new worker or broad game campaign is assigned.

| ID | Gap | Lane | Measure | Measured reference / implementation | Fixed when | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | Shared scorecard | tools | `npm run scorecard`, CI on PRs | Initial scorecard merged through #199 | Runs in CI, repeats within noise, shows where a change moved a stat. NFL play-call replay to follow | Implemented; measurement repair #203 verified/pending; NFL replay open | Archived evaluation plan; #199/#203 |
| F2 | Simulation speed | physics | CPU seconds per game | 31.5 (30–80 by game) | 5 or less, scorecard unchanged | Guardrail retained until G1/G2; bounded #204 allocation repair merged | #204: full profile 58% World, not the earlier partial 43% tally |
| G1 | Defenders don't finish plays | defense | Missed + broken tackles per play | 0.32 | 0.11–0.16 | Open; assigned defense | Runs past 20 yd reach 40 in 75–90% of cases (NFL 25–35%), PR #190 |
| G2 | Run game too explosive | run | Yards per carry; 10+ yard runs | 9.88; 18.1% | 4.1–4.6; 10–12% | Open; #192 merged, gap remains | Creases 1–2 yd wider than NFL and don't close, PR #191 |
| G3 | Pass defense late on the throw | coverage | Yards per attempt; YAC per catch | 10.1; 8.4 | 6.8–7.4; 4.8–5.6 | Open; #193 merged, gap remains | Nearest zone defender closes 0.12 yd during the flight (NFL 0.65), PR #190 |
| G4 | Too many interceptions | coverage | INT rate | 5.8% | 2–2.7% | Open | Tipped-ball re-catch, TIP_AWAY in PR #190 |
| G5 | Edge protection gives way | trenches | Contact time before an edge rusher releases | 0.4 s | about 1.1 s | Open | Interior pressure already matches the NFL, PR #191 |
| G6 | Too many penalties | rules | Penalties per team-game | 6.8 | 2.5–4 | Open | Defensive offside about 3x the NFL, PR #190 |
| G7 | Play-calling unlike the NFL | coaching | Pass rate and concept mix by situation | Pass rate 57%; mix untested | Within NFL bands by down and distance | Open | Archived evaluation plan, E3 |
| G8 | No league or season | league | A multi-season league runs | One 238-line file | 10 seasons unattended; rating changes have the expected effect | Later | Roadmap phase 7 |

G1 to G3 overlap: a defender who closes late on a run or a catch also misses
the tackle. Re-measure all three after each fix.

## Who is on what

Sessions are named by lane (2026-10-22). Assignments change only at a review.

| Lane | Session | Existing branch / published disposition | Remaining scope | Gaps |
| --- | --- | --- | --- | --- |
| run | Run Game | `claude/run-defense-develop`: #190 merged; research `claude/zen-feynman-7712y8` retained | G2 remains open; TIP_AWAY/alignment/line-set experiments are default off, not adopted improvements | G2, G4 |
| defense | Defense | `claude/amazing-allen-j37e4r`: #192/#196 merged | Gap-scheme rules are code; pursuit/protection gaps remain. #196 experiments remain off | G1, G5 |
| coverage | Coverage | `claude/friendly-bardeen-56kqo2`: #193 merged; #194 merged separately | Existing match/call work is not proof of closing the G3 reaction gap; see FLAGS for off switches | G3 |
| rules, coaching | Rules + Coaching | `claude/great-mccarthy-85uf8b`: #191 merged; passpro #198 merged | Saved diagnostics retain their cohorts/operators; pressure-v2 repair #203 is reviewed, not yet merged | G6, G7 |
| tools, physics | Tools/Physics + Measurement | #199 scorecard and #204 allocation repair merged; `tools/F1-pressure-window` #203 verified/pending | F1 endpoint semantics remain open; F2 guardrail retained. No new performance campaign | F1, F2 |
| repository | Integration/repository | `tools/F1-repository-navigation` #202 verified/pending | Current instructions/navigation and this factual refresh; no archival removals | F1 support |
| research | Main Engine | `claude/run-game-v3`: #153 closed without merging the whole branch | Preserve research and unique evidence; no new research activation assigned | — |

Three lanes are active per cycle. The current priority remains G1, G2 and G3, so Defense,
Run Game and Coverage work, and the rest hold or support.
