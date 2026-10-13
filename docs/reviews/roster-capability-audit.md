# Generated rosters, selected roles, and rating sensitivity

2026-10-13 (America/Phoenix). Runtime: `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`, shared `run-game-2026-10-13` profile, Node 22.23.3. Runtime source SHA-256: `8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c`.

**We should improve rating generation and the roster design of our experiments. Roster choice materially changes football results. However, this audit does not support treating low defender balance as the general explanation for excessive YAC, or treating a balance increase as an established repair.** Its effect transfers unevenly from isolated encounters to complete plays. Excessive YAC remains widespread across the sampled rosters.

Production generation, selection, controllers, World, capacities, and feature defaults are unchanged. The additions are a diagnostic runner, an aggregate reporter, experiment-isolation tests, and this review. [Numerical receipt](../../data/reviews/current/roster-capability-audit.json), [collector](../../scripts/roster-audit.ts), [reporter](../../scripts/roster-audit-report.py).

## What was measured

| Panel | Sample and controls |
| --- | --- |
| Profiles and selection | 192 independently generated teams: 64 each at strengths .25, .55, .85; 10,176 players. All six offensive and five defensive packages, fresh, tired-starter, and unavailable-starter conditions; 65,340 successful selection appearances. |
| Quality response | 5,760 generated profiles: 128 seeds per listed position at qualities .35, .65, .90. Each player's RNG, age, identity, and archetype draw stay fixed across qualities. No selection. |
| Isolated encounters | 12 independently generated roster pairs, 8 crossed play seeds, FS/CB_S/LB_M versus the selected Z receiver, 45° and 135° approaches, both mirrors, six profile arms: 6,912 executions. |
| Forced calls | 12 roster pairs × 16 crossed play seeds × four concept/coverage cells × three arms: 2,304 complete snaps. Calls, initial assignments, field position, and play seed fixed; no audibles or accumulated scouting. |
| Full games | Eight new roster pairs, two shared game seeds per pair: 16 games, 2,188 official scrimmage plays, 856 measured receptions. Fixed spread/4-3 schemes and identical coaching settings. |
| Actual field players | 2,278 physical scrimmage snaps, including later-nullified plays, and 50,116 player appearances. Capture listed position, assigned slot, behavior, ratings, measurables, energy, and actual derived profile before execution. |
| Native counterfactuals | First ordinary tackled catch and first 15+ YAC catch in the first game of each pair: 16 saved inputs. Six pre-snap arms plus three interventions after the catch: 144 executions. All 16 original final body/RNG/perception/result signatures reproduce; all 48 after-catch variants match the original bodies/RNG/perception/events through the catch before modification. |

Main seed is 90210; the runner derives named profile, roster, and play seeds. Every full game includes both offensive directions. Each independent roster is held fixed across its play seeds. The profile strengths use independent samples, so their differences are descriptive. The quality sweep supplies the comparison with identical latent draws.

The unavailable-starter condition removes the entire selected `11`/`base43` unit. The tired condition gives those players .55 energy while resting the others. These are severe depth stress tests. Failed selections are retained, rather than silently generating replacements.

## 1. The rating asymmetry is real, but physical compensation matters

The following are actual selected players from strength-.55 teams, using `11` offense and `base43` defense. Groups retain the player's listed position; assigned-slot composition is examined separately below. Physical values are model capacities, not observed acceleration or measured NFL recovery ability.

| Listed position | Selected n | Balance p50 | Top speed p50, yd/s | Braking p50, yd/s² | Recovery stepping p50, yd/s | Support base radius p50, yd |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| RB | 64 | 70 | 9.64 | 6.79 | 3.95 | .150 |
| WR | 192 | 55 | 9.87 | 6.96 | 4.09 | .139 |
| TE | 61 | 29 | 9.06 | 6.30 | 3.50 | .140 |
| LB | 186 | 31 | 9.20 | 6.53 | 3.62 | .138 |
| CB | 152 | 28 | 9.89 | 6.77 | 3.89 | .125 |
| S | 104 | 28 | 9.71 | 6.71 | 3.83 | .126 |

The sparse [tier table](../../src/players/generator.ts) defaults omitted skills to `low`; balance is omitted for LB/CB/S **and TE**. At quality .645, before adjustments, tier expectations are 71.67 core, 57.22 secondary, and 29.74 low. The universal-rating exception excludes balance. Weight slightly modifies it afterward.

That is a systematic difference, rather than one unlucky draw. At strength .55, 281/320 roster LBs, 357/384 CBs, 236/256 safeties, and 165/192 TEs have balance below 40. The within-position balance/shuttle correlation is near zero: .047 LB, .058 CB, .008 S. Correlated combine traits therefore do not imply correlated balance ratings.

But CB braking is only about 3% below the WR median, and recovery stepping about 5% below. CB top speed is slightly higher. Good agility drills compensate for part of the rating gap; mass also affects recovery. Even RBs, with much higher balance, do not have the highest stepping capacity. An audit based only on rating means would overstate the movement disadvantage.

Balance also changes bend, support radius, and stepping recovery in [physical mapping](../../src/players/physical.ts) and [support mapping](../../src/physics/support.ts). These can affect thresholds nonlinearly under load. The same mapping includes offensive `elusiveness` and `routeRunning` in a general lateral-agility term. Defenders receive low values for both. That deserves an explicit design review: general body control should have a stated meaning across positions, and football techniques should affect the appropriate actions.

Other omissions deserve attention. Selected TE ball security has a median of 31, versus WR 58 and RB 72. In the current [contact fumble formula](../../src/sim/tackle.ts), otherwise identical contact has a ball-security multiplier of .94 at 31 versus .53 at 72. This is a concrete model asymmetry to investigate; this audit did not establish an excessive TE fumble rate. Anticipation is another broad consumer of a position-tier rating through `SnapMind` and snap readiness. Audit every shared consumer before deciding which omissions are appropriate.

There is a separate measurement-semantic problem for QBs. Their bench template is `[0, 0]`, so every generated QB has zero reps. The strength formula subtracts `MEAS[pos].bench[0] || 10`, silently applying a **−13-point adjustment** to the named QB strength base of 40. Selected QB strength has median 29. Physical power then consumes the zero bench again. If zero represents an unmodeled or unavailable drill, it should not be treated as measured zero performance. Use explicit missingness and declared positional imputation; validate actual QB capabilities rather than adding strength to rescue sack statistics.

## 2. Assigned slots substantially change the roster we are testing

Fresh nickel selection across 64 strength-.55 teams:

| Assigned slot | Actual listed positions |
| --- | --- |
| FS | 36 S, **28 CB** |
| SS | 37 S, **16 LB**, 11 CB |
| NB | **55 S**, 9 CB |
| DT_S | 53 DT, 11 EDGE |
| DT_W | 50 DT, 14 EDGE |
| RT, `11` offense | 49 OT, 15 OG |

In dime, SS is filled by an LB in 42/64 teams. This is not automatically wrong: hybrid defenders can perform those jobs. It means a package name and a player's listed position cannot substitute for an audit of assigned responsibility and actual capabilities.

The full games confirm that substitutions actually reach the field. FS appearances include 889 corners and 1,387 safeties; SS includes 668 linebackers, 667 corners, and 943 safeties. NB is a listed safety in 1,468/1,819 appearances. RT is a guard in 1,148/2,278 appearances. These are repeated appearances of a small cohort, not independent players.

There is also an implementation inconsistency. [Selection](../../src/league/team.ts) sometimes calls `overallAt`, which applies [familiarity scaling](../../src/players/roles.ts), and sometimes calls `roleSuitability` directly. FS/SS/NB take the latter path. Execution does not independently consume position familiarity. Thus the familiarity treatment depends on which scoring path a slot uses. A corner's body still uses its corner movement baseline when assigned FS; assigned jobs and learned technique should be recorded distinctly.

Selection is greedy in slot order. NB can claim a safety before FS/SS; early line slots can claim versatile players needed later. The depth stress recorded 396 failures out of 6,336 package/condition selection attempts: 192 `10`, 107 goal-line defense, 63 `base43`, 18 `base34`, 16 nickel. **Every failure occurred after removing the entire starter unit. Fresh and tired selections succeeded.** Some are unavoidable shortages; this audit did not prove that a feasible complete lineup existed for every failure. Do not call all 396 selector bugs.

### Fatigue is not exposing backups in these ordinary games

Observed snap energy averages .981 on offense and .978 on defense. No selected appearance is below .8; the minimum is about .815. The selector applies its energy penalty only below .8, so that penalty never activated on these selected players. The severe fatigue panel is useful for depth robustness, but cannot explain these games' YAC. Package changes still expose additional players.

## 3. Equal strength does not ensure equal football capabilities

The generator's strength .55 sets high-quality candidate quality around .645 and backup quality around .3825, with SDs .14 and .12. These distributions overlap. Candidates subsequently compete for roles, so the generation index does not define the final starter.

Across the 64 strength-.55 teams:

| Selected-unit measure | Range across teams |
| --- | ---: |
| QB own-position fit score | 61.05–93.83; p10–p90 68.79–83.50 |
| Mean OL functional power | 148.42–176.62 |
| Mean four-player DL functional power | **119.85–172.86** |
| Mean OL run-block rating | 66.2–86.8 |
| Mean DL block-shedding rating | 67.5–83.75 |

Power is the engine's proxy from mass, bench, and strength. These ranges do not establish true NFL strength ranges, but they describe what the solver actually receives. A roughly 44% DL power spread can change blocking and rush behavior even when both rosters were generated at the same strength setting. Selected DT strength has median 93, versus OT 75 and OG/C 81; the generator does not produce a universal offense advantage on every dimension. Own-position fit scores are selector heuristics and are not commensurate measures of offensive versus defensive effectiveness.

Increasing quality mostly improves skill tiers. In the same-latent sweep from .35 to .90, RB balance rises about 25.3 points, WR about 19.8, but LB/CB/S/TE only about 6.6. Strength rises about 5.5 because it is overwritten by the position/bench formula. WR top speed increases only .037 yd/s; CB .031; LB .041. Do not expect the `strength` knob to turn mediocre bodies into elite athletes, or to equalize unit matchups. Body/archetype variation can dominate the small quality effect on athletics.

There are healthy correlations too: weight/forty correlation is about .36–.58 across relevant position groups, and LB tackling/pursuit about .68. No sampled roster sprint solver hits its tau bounds. The remedy should preserve useful correlations and heterogeneity.

## 4. Ratings affect encounters, but transfer to complete plays is uneven

Assignments and offense are frozen. `balance+25` and `balance+45` affect only listed LB/CB/S defenders; tackling/strength increments affect defenders and clamp at 99. `fresh` replaces defender measurables/ratings with independently generated profiles at their listed positions, quality .645, retaining IDs, assignments, age, familiarity, and energy. Fresh replacements bypass re-selection and remove some original selection advantage; that arm is a profile replacement diagnostic, not an equal-quality league comparison or an NFL reference.

### Isolated approach/contact panel

The receiver requests a straight 6 yd/s run; the defender uses production pursuit/tackle control. Observation ends on tackle, the established clear-and-separating escape condition, or a five-second horizon. Censored cases are retained. No fumbles occurred.

| Arm | Tackled / 1,152 | Tackled % | Gained / lost tackles vs original | Censored |
| --- | ---: | ---: | ---: | ---: |
| Original | 744 | 64.6 | — | 8 |
| Defender balance +25 | 786 | 68.2 | 50 / 8 | 12 |
| Defender balance +45, stress | 928 | 80.6 | 188 / 4 | 12 |
| Defender tackling +15 | 908 | 78.8 | 166 / 2 | 6 |
| Defender strength +15 | 752 | 65.3 | 8 / 0 | 0 |
| Fresh defender profiles | 666 | 57.8 | 84 / 162 | 8 |

Original tackle rates across roster pairs range from 47.9% to 83.3%. Balance +25's net improvement is 3.65 percentage points; the exploratory roster-cluster bootstrap interval is +.35 to +7.81 points. Tackling +15's improvement is 14.24 points, interval +10.42 to +17.53.

These are sensitivities at two bearings and one entry speed. The large balance +45 arm is not a proposed production value. Higher tackling changes approach choices, hold quality, leg targeting, and grip capacity; higher balance changes several derived capacities. Neither is a pure solver-force experiment.

**Do not use pooled mean encounter advance as a football yardage effect.** An escape stops observation early, whereas a successful tackle can remain live longer. The raw advances are retained for traces, but have different exposure durations. Tackle/escape/censor counts are the primary endpoints here.

### Complete forced-call panel

Each row/arm has 192 snaps, 16 seeds on each of 12 roster pairs. Table entries are mean offensive yards per snap; pass entries additionally show YAC and measured reception count.

| Fixed cell | Original | Balance +25 | Tackling +15 |
| --- | --- | --- | --- |
| Slant-Flat / Cover 3 | 8.51; YAC 8.08, n143 | 8.28; YAC 7.63, n147 | 7.68; YAC 6.97, n143 |
| Mesh / Cover 1 | 9.68; YAC 10.86, n120 | 9.82; YAC 11.58, n114 | 9.41; YAC 10.37, n120 |
| Inside Zone / Cover 3 | 3.92 | 3.91 | 3.56 |
| Outside Zone / Cover 3 | 1.56 | 1.83 | 1.16 |

Pooled paired yardage change is **+.041 yd/snap** for balance +25, with an exploratory 95% interval of −.570 to +.639. Tackling +15 gives −.462, interval −.955 to +.062. Resampling uses roster-pair averages, not 768 independent snaps. Equal weighting of these four cells is a diagnostic panel, not an NFL play mix. Conditional YAC can change because the completion cohort changes; report it alongside completion and unconditional gain.

The unchanged-roster pair means range from **3.63 to 19.35** on Slant-Flat, 2.70–16.64 on Mesh, 1.24–8.21 on Inside Zone, and −4.41–6.29 on Outside Zone. Sixteen seeds per pair leave considerable uncertainty, particularly for explosive plays. The endpoints nevertheless show why repeated snaps from a single roster pair cannot establish a general tuning conclusion.

### Saved native catches: distinguish before-catch from after-catch effects

Changing ratings before the snap can alter pressure, coverage, throw choice, catch position, and completion itself. For the after-catch variants the original execution continues through the catch; body state, momentum, support deviation, energy, information and existing holds are retained while future defender capacities change. The prefix identity checks prevent accidentally comparing different catches.

Examples from the same saved inputs:

| Saved play | Original YAC | Balance +25 before snap | Balance +25 after catch |
| --- | ---: | ---: | ---: |
| Pair 2, P3, explosive | 52.30, TD | .57, tackle | **52.30, TD** |
| Pair 6, P3, explosive | 51.52, TD | 23.58, tackle | **1.87, tackle** |
| Pair 1, P4, ordinary | 6.81, tackle | **12.98, TD** | 6.83, tackle |

The first pre-snap rescue cannot be credited to stronger post-catch support. The second exhibits a real post-catch sensitivity worth tracing. The ordinary control exposes an adverse pre-snap consequence. These are diagnostic witnesses, not claims about the first causal divergence without a request/load trace. Witness selection happens at the physical-result stage, before official penalty resolution; the official full-game aggregate separately excludes nullified plays.

Across the deliberately selected eight ordinary/eight explosive catches, mean YAC goes 21.61→17.91 with balance +25 after the catch, 13.90 with tackling +15, and 21.14 with strength +15. Original TDs are 5; resulting counts are 4, 3, and 5. Balance's average is dominated by one large rescue. Its YAC improves by more than .1 yd in three plays and worsens by more than .1 in two. This selected mean is not a league YAC benchmark. Raising values does not uniformly improve individual outcomes.

## 5. The broad YAC pattern survives independently generated rosters

With equal nominal strength, identical coaching settings and fixed schemes:

| Roster pair | Receptions across two games | Mean YAC | 15+ YAC receptions | Points per team-game |
| --- | ---: | ---: | ---: | ---: |
| 1 | 88 | 8.43 | 18.2% | 34.50 |
| 2 | 104 | 9.04 | 22.1% | 40.75 |
| 3 | 106 | 12.09 | 22.6% | 61.75 |
| 4 | 117 | 12.07 | 20.5% | 59.75 |
| 5 | 132 | 8.83 | 18.9% | 60.25 |
| 6 | 109 | 9.81 | 22.9% | 49.00 |
| 7 | 94 | 10.95 | 22.3% | 44.25 |
| 8 | 106 | 10.79 | 18.9% | 48.50 |
| Pooled | 856 | **10.26** | **20.8%** | **49.84** |

Roster variation changes the magnitude; high YAC is not confined to one bad roster pair in this panel. These are fixed-scheme diagnostic games, not representative NFL-season samples. No new NFL cohort was measured and no empirical NFL skill-rating distribution was established. Historical league figures are context, not a matched validation target.

The current baseline retains documented angular-accounting and recovery/convergence limitations. A roster change cannot explain away conservation or timestep-accounting failures. The audit neither clears World nor proves every long gain is a physics failure.

## Recommended changes, in order

### A. Make rating semantics and omission handling explicit

Create a schema distinguishing body capacities, learned football techniques, and perception/control attributes. Require an explicit positional distribution for every shared body-control trait. Retain low passing skill for non-passers; do not infer low general support ability because a position does not list balance as a core football skill. Review TE balance/ball security and the offensive-skill contribution to general lateral capacity alongside defensive balance.

Record generated latent quality, athletic factors, missing-measurement assumptions, and generator version in diagnostic provenance. Use correlated residual traits within appropriate skill families, rather than treating a single quality scalar as a sufficient explanation of all ability. Preserve plausible speed/mass/burst tradeoffs and archetype diversity. Correlation is not inherently better: validate the joint tails and avoid rewarding the same evidence twice through several ratings.

**Gate:** capability distributions and combinations stay within explicitly chosen body/movement envelopes; no accidental default-low shared trait; clamping and impossible sprint combinations reported. NFL combine/tracking can constrain measured bodies and movement. It cannot identify a true 1–99 balance, judgment, or hand-technique score. Treat those as latent model parameters with uncertainty. The +25/+45 probes do not establish the correct new means.

### B. Give lineup selection one consistent contract

Centralize role eligibility, familiarity, fatigue, and scoring. Log the exact selection rationale, not just a displayed overall. Decide whether familiarity affects selection, execution, or both and apply that decision consistently. Preserve legitimate hybrid players.

Compare the current greedy assignment with a constrained maximum-weight assignment across the unit. Explicit role requirements and shared-player costs can prevent one slot consuming the only suitable player for another. Handle genuine depth shortages with declared emergency eligibility or a diagnosed unavailable package. Scheme fit should affect relevant selections and archetype construction; a roster should have both its intended identity and measurable fit.

**Gate:** no duplicate players; actual jobs and eligible pools correct; complete lineups whenever a feasible assignment exists; all swaps and adverse cases retained. Compare aggregate fit and actual capabilities, since maximizing the existing heuristic alone may optimize an imperfect score. Do not impose identical positions or a flat 75 on every player.

### C. Use three different roster products for three different questions

These are choices for different questions, not three required panels per change.

1. **Mechanism fixtures:** versioned, named profiles by role, with low/typical/high dimensions and explicit energy. Same bodies in original, difficult, mirrored and ordinary controls. Include the generated low-balance defenders alongside canonical fixtures. Judge conservation, attainable requests, actual support and contact behavior. Do not require every stronger athlete to win every nonlinear scenario.
2. **Execution panels:** independently generated and selected roster pairs crossed with play seeds and fixed calls. Add empirical position-specific body references, matched on role and relevant body dimensions, and keep inferred techniques uncertain. Publish unit matchup vectors—speed/entry acceleration, braking/step/base, arm capacity, OL/DL mass/power/technique—rather than a claim of equal strength. A balanced diagnostic fixture and a naturally unequal generated league serve different purposes.
3. **League evaluation:** frozen independent teams with varied, declared schemes and talent composition. Separate generator, lineup/policy, and play streams. Keep untouched leagues for final evaluation; use cluster-aware intervals and official statistics. A league generator can model coherent strengths and weaknesses without homogenizing teams or rejecting rosters because their simulated outcomes are inconvenient.

Apply the [tiny default loop](../TESTING_COSTS.md#default-loop-one-question-tiny-evidence): state one question, use the smallest existing reproducer and one opposing control, plus directly affected correctness tests. Only add a transfer subset if a specific transfer question remains; do not climb through 2/8/16/32 snaps. A material adverse result gets one targeted diagnostic before any bigger batch. Before adding tests, name the decision their results could change; otherwise skip them. One owner runs full checks on the exact combined candidate at integration; other agents provide focused evidence. Additional games require interactions that need games. The [regression categories](../BEHAVIOR_REVIEW.md) interpret results, not separate mandatory suites. Report only what changed, evidence for/against, unresolved risk, runtime and next decision, linking compatible existing receipts. The earlier suggestion of 16–32 development pairs is not a routine requirement. More plays on two teams cannot replace independent teams when the question is league transfer.

### D. Trace why a rating change helps before promoting it

Use the preserved after-catch witnesses to split movement capacity, support recovery, perception/control and hold execution. Inspect existing evidence for the first changed request, achieved braking, acquired hold geometry, applied load, lost footing and recovery. Preserve the unrescued 52.30-YAC case and successful ordinary controls. Repeat a witness under the physics owner's validated refinement settings only when an unresolved numerical-stability question could change the decision; keep the baseline defect visible.

**Gate:** a proposed rating/model change has a defensible semantic or measured physical basis, a repeatable mechanism benefit and preserved relevant ordinary controls. Check untouched roster/call transfer only when it remains a material open question; it is not an extra required panel for every edit. Statistical rescue alone is insufficient. The present data favors fixing experiment coverage and trait definitions before choosing a numerical balance patch or globally strengthening grips.

## Reproduction and validation

Use `.nvmrc` Node 22.23.3, `npm ci`, and the shared baseline launcher. This audit used an isolated worktree from the exact commit above. Detailed snapshots, inputs, JSON, plots, and receipts live in ignored `out/roster-audit/`; the compact aggregate is committed under `data/reviews/current/`.

```sh
npm run baseline:run -- --receipt out/roster-audit/profiles-receipt.json -- node --import tsx scripts/roster-audit.ts profiles
npm run baseline:run -- --receipt out/roster-audit/quality-receipt.json -- node --import tsx scripts/roster-audit.ts quality --teams 128
npm run baseline:run -- --receipt out/roster-audit/encounters-receipt.json -- node --import tsx scripts/roster-audit.ts encounters --pairs 12 --reps 8 --checkpoint "Reproduce the broad roster audit"
npm run baseline:run -- --receipt out/roster-audit/contexts-receipt.json -- node --import tsx scripts/roster-audit.ts contexts --pairs 12 --reps 16 --checkpoint "Reproduce the broad roster audit"
npm run baseline:run -- --receipt out/roster-audit/games-receipt.json -- node --import tsx scripts/roster-audit.ts games --pairs 8 --reps 2 --checkpoint "Reproduce the broad roster audit"
npm run baseline:run -- --receipt out/roster-audit/native-receipt.json -- node --import tsx scripts/roster-audit.ts native --input out/roster-audit/native-contexts.json --checkpoint "Reproduce the broad roster audit"
python3 scripts/roster-audit-report.py
# Optional figure, with matplotlib installed:
MPLCONFIGDIR=/tmp/roster-matplotlib python3 scripts/roster-audit-report.py --plot
```

The old historical catch collector's default IDs did not all exist at this baseline, so its attempt failed its missing-context guard. No historical replay identity is claimed. The new game panel collects current witnesses and verifies them directly. Do not weaken the old collector's guard to force old play IDs into new games.

Four new tests verify immutable source lineups, single-rating isolation, reproducible replacements without assignment/seed changes, fatigue/static-capacity separation, and missing/nonfinite measurement handling. All four plus the two existing determinism tests pass. Typecheck and build pass under the baseline launcher; the aggregate reporter runs and Python compilation passes. The native identity checks provide direct replay verification. The full engine suite's published baseline receipt remains separate; this diagnostic-only change does not claim a fresh all-engine test run or physics readiness.
