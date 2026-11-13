# Evaluation environment: separating execution from selection

Most of what we tune is judged against NFL numbers produced by simulated games.
An NFL statistic, however, is not a measurement of execution alone. It mixes
four things:

1. **Execution** — what the players do once a call meets a look. This is what
   the engine models.
2. **Selection of calls** — which concepts get called, in which situations,
   against which fronts and coverages. Coaches call what their players do well
   and avoid what they can't run.
3. **Selection of people** — which personnel group is on the field, who fills
   each spot, and how rosters were built for the scheme.
4. **League structure** — how unequal teams are, and how game state (score,
   clock) feeds back into the calls.

If our coaches call differently from NFL coaches, or our leagues are built
differently, an aggregate comparison mixes engine error with policy and roster
differences. We then "fix" the engine to compensate for a coaching or roster
difference and break something that was right. This document plans a testing
environment that keeps those four apart. It complements the realism plan's
calibration section ([REALISM_PLAN.md §18](REALISM_PLAN.md)), which sets the
general rules (tune in layers, conditional distributions, held-out cohorts);
this is the concrete environment design for the selection problem.

## 1. Evidence: the NFL is heavily selected, and we are not selected the same way

Measured from the 2025 Big Data Bowl (2022 season, weeks 1–9, every play,
personnel derived from who was on the field). Extractor:
`scripts/data/bdb2025_tendencies.py`. The simulation is measured identically by
`scripts/tendencies.ts` (64–96 games over several generated leagues).

### Teams specialize, and specialization is selection

| | NFL 2022 | Simulation |
|---|---|---|
| 11 personnel share | 65% (team range 13% BAL – 97% LA, SD 16) | 59% (range 51–64%, SD 4) |
| 12 / 21 / 13 / 10 personnel | 17.8 / 8.7 / 4.1 / 0.4% | 18.0 / 9.5 / 0.8 / 10.2% |
| Pass rate in 11 / 12 / 21 / 22 | 71 / 50 / 46 / 32% | 77 / 65 / 60 / 47% |
| Defense vs 12 personnel, base share | 54% (team range 0% BUF – 97% HOU/JAX, SD 26) | 51% (range 34–69%, SD 12) |
| Defense vs 21, base share | 56% (range 3% BUF – 98% MIA) | 100% for every team |
| Defense vs 11, base share | 5% (ARI 47%) | 8% |
| Outside zone share of runs | 29% (team range 9–54%) | 18% (11–34%) |
| Trap / counter share | 1.9% / 6.6% | 13.3% / 13.5% |
| A team's most-used run concept (median) | 35% of its runs | 23% |
| Play-action share of dropbacks | median 24% (11% NO – 47% ATL) | median 11% (9–16%) |
| Single-high share of coverage, team SD | 9.9 points (37% MIN – 78% MIA) | 2.5 points |

Teams call more of what works for them. For each team and run concept with
enough carries, compare the concept's EPA with the same team's other runs (so
overall team quality cancels), then correlate that with how heavily the team
calls it: **r = +0.27** over 143 team-concept cells. Heavy outside-zone teams
average 4.60 yards and 17.6% stuffs on it; light users 3.87 and 21.4%. A
league-average "outside zone" number is therefore a usage-weighted average
dominated by teams built for it.

Situation selects too: NFL runs average 4.81 yards with 15.8% stuffs on 1st and
10, 3.70 and 22.2% on 2nd/3rd and 1–2, and 6.33 and 11.8% on 3rd and 7+ (the
defense is playing pass). A run-quality target that ignores down and distance
measures where runs were called as much as how well they were blocked.

### What this does to our comparisons: the stuff-rate example

Our run stuff rate is 40.8% against the NFL's 18%. Per concept (simulation):

| Concept | Sim carries share | Sim YPC | Sim stuff | NFL share | NFL YPC | NFL stuff |
|---|---|---|---|---|---|---|
| Inside zone | 19.8% | 5.0 | 30% | 24.0% | 4.19 | 14.3% |
| Outside zone | 18.2% | 6.8 | 40% | 28.7% | 4.38 | 18.7% |
| Power | 14.2% | 2.7 | 49% | 9.4% | 5.13 | 17.7% |
| Counter | 13.5% | 2.4 | 46% | 6.6% | 5.15 | 20.7% |
| Trap | 13.3% | 2.4 | 47% | 1.9% | 6.33 | 13.5% |
| Duo (≈ PFF "man") | 9.5% | 4.9 | 32% | 16.9% | 4.01 | 17.7% |
| Draw | 7.2% | 3.3 | 52% | 3.3% | 5.82 | 17.4% |
| Toss | 4.2% | 17.3 | 28% | (pin-pull, in OZ) | | |

Reweighting our per-concept results to the NFL's concept mix moves the stuff
rate from 40.8% to 37.4%: about 3.5 of the 23-point gap is *what we call*; the
rest is *how the engine executes*. Both errors are real, and an aggregate
target conflates them. Note also that the NFL's gap concepts look efficient
partly because they are called by teams built for them and in the situations
where they work; our coaches call them broadly.

### Team-to-team spread: two errors pointing opposite ways

Noise-corrected team SD (observed variance minus expected sampling variance),
NFL 2022 (≈172 carries per team) vs simulation (two leagues, ≈226 carries per
team):

| | NFL SD (true) | Sim SD (true) |
|---|---|---|
| Rush yards per carry | 0.28 | 0.26 |
| Run stuff rate | ≈0 (all sampling noise) | 4.4 points |
| Sack rate | 1.4 points | 3.7 points |
| Pass rate | 6.2 points | 3.6 points |

Our **coaches are too alike** (pass rate, personnel, coverage shell, concept
concentration) while our **execution varies too much between teams** (sacks,
stuffs). The first hides the selection that makes NFL averages look the way they
do; the second makes any one league a noisy, roster-dependent sample.

### Published league context, 2023–2025

Figures reported by analytics sites for recent seasons. They were gathered from
search excerpts rather than full articles, so treat them as leads to verify
against charting data before they become targets.

- **The league moves.** 11 personnel fell to about 56% in 2025 from 62% in 2023;
  12 rose to about 23% and 13 to about 6%
  ([Sumer](https://sumersports.com/teams/offensive/personnel-tendency/)). Base
  defense rose from about 21% of snaps (2023) to about 30% (2025)
  ([PFF](https://www.pff.com/news/fantasy-football-tracking-base-nickel-and-dime-trends-to-exploit-2026-fantasy-matchups)).
  Under-center snaps rose from 29% to 35%. Our 2022 measurements are one era;
  every target needs a season tag.
- **Rosters drive personnel.** The Rams ran no 13 personnel while Puka Nacua was
  healthy in 2025 and about 45% after his injury
  ([ESPN](https://www.espn.com/nfl/story/_/id/48750958/2026-nfl-tight-ends-13-personnel-rams-mcvay-trends-draft-jumbo-barnwell));
  the Ravens' 12 personnel went from about 11% (2023, tight ends hurt) to 44%
  (2025). Coordinators matter too: Houston's 12 rate jumped under a new
  coordinator.
- **Defenses differ by identity and players.** Seattle played base on about 6%
  of 2025 snaps and kept five or more defensive backs on 81% of snaps against two
  or fewer receivers; Detroit led the league in base (about 60–66% of all
  snaps) because Alex Anzalone could cover, and played base on about 26% of
  snaps against 11 personnel through week 12 — second-most in the league,
  against a league norm near 5% in 2022
  ([Detroit Lions](https://www.detroitlions.com/news/lions-looking-to-make-defense-more-versatile-adaptable),
  [Pride of Detroit](https://www.prideofdetroit.com/detroit-lions-game-preview/150671/green-bay-packers-vs-detroit-lions-thanksgiving-preview-4-key-stats)).
  With Anzalone gone, their 2026 plan is more nickel.
- **Run identity is concentrated.** In 2024 Atlanta ran outside zone on about
  62% of running-back carries and San Francisco on about 53%, while the Rams ran
  man/gap on about 43%
  ([CBS/TruMedia](https://www.cbssports.com/fantasy/football/news/the-key-to-unlocking-fantasy-football-running-back-breakouts-rookie-rb-fits-with-nfl-rush-schemes/)).
  Frequency and efficiency are only loosely linked: zone-heavy teams were the
  best rushing teams overall, yet Atlanta was inefficient on its zone runs
  ([FTN](https://ftnfantasy.com/nfl/a-deep-dive-into-the-nfls-best-rushing-attacks)).
  Our +0.27 within-team correlation is consistent with a real but partial link.
- **Play action and coverage.** Play action is about 23–26% of dropbacks, from
  about 15% (Kansas City) to 35% (Rams) in 2025; its tie to run scheme is
  suggestive, not strict (the 2024 Chargers led in play action from a gap
  scheme). Split-safety shells were 42% of 2025 dropbacks and man coverage about
  23%. Some coordinators game-plan coverage heavily week to week (Chargers'
  Cover 1 went from 70% to 15% in consecutive games) while box-count tendencies
  are stable under the same coordinator
  ([NFL Football Operations](https://operations.nfl.com/gameday/analytics/stats-articles/which-nfl-teams-mix-up-defensive-coverages-the-most-week-to-week),
  [FiveThirtyEight](https://fivethirtyeight.com/features/are-defensive-play-callers-consistent-enough-to-be-exploitable)).
- **Game plans are small.** A weekly plan trims the playbook to roughly 100
  plays, 30–35 of them core
  ([NFL.com](https://www.nfl.com/news/producing-a-game-plan-takes-into-account-months-of-work-09000d5d8192b29f));
  call sheets are built by situation (early downs, third down, red zone,
  backed up, two- and four-minute), with about 20–24 scripted openers.
- **Selection is acknowledged in the field.** Counter's explosive rate is
  "inflated by selection bias" (called on a pre-snap tell, per FTN); defenses
  set box counts in response to pass probability, so run efficiency by box
  count is confounded; fourth-down conversion estimates need selection models
  ([Sloan](https://sloansportsconference.com/research-papers/correcting-for-preferential-bias-in-nfl-fourth-down-decision-making));
  expected-points models trained on observed plays lean toward good teams
  ([Sabin](https://sabinanalytics.com/blog/2024/01:05:slow-down-using-epa-for-everything/)).
  No causal estimate of individual run concepts or play action was found.

## 2. Principles

1. **Judge execution conditionally on the call and the look.** Compare a sim
   inside zone against an over front with a seven-man box to NFL inside zone
   against the same look — not sim runs to NFL runs.
2. **Coaching is a model with its own targets.** Validate play calling with
   distributions of calls (by situation, personnel, roster and opponent), not
   with outcomes. Do not tune execution to fix a coaching difference, or the
   reverse.
3. **The league is a model too.** Talent dispersion, roster construction and
   scheme fit decide how unequal teams are. Calibrate them against team-level
   spreads before trusting league-level outcomes.
4. **Tune bottom-up; full games are the holdout.** Mechanics (controlled
   scenarios) → execution in NFL contexts → calling → league structure → full
   games. A full-game aggregate is a check, not a tuning target, until every
   layer below it passes.
5. **One measurement for both.** The same metric code, cohort, exclusions and
   uncertainty for NFL data and simulation; paired seeds for simulated
   comparisons.

## 3. Four test environments

### E1 — Mechanism scenarios (exists; extend)

Fixed players, fixed calls, scripted starts, paired seeds: the labs in
`scripts/` (trench, open field, zone style, recognition) and the scenario tests.
Use for physical envelopes, technique, assignments and textbook behavior (the
companion's tactical tests). No league data, no coaches. Acceptance is
behavioral (a seam is carried, a fit is kept) and against tracking envelopes.

### E2 — NFL context replay (new; the main calibration environment)

Replay the NFL's *choices* and let the engine supply the *execution*:

1. From NFL data, build the distribution of contexts actually called: situation
   bucket and hash; offensive personnel and formation family; the call (run
   concept, dropback or play action, quick/dropback family where known); the
   defensive answer (personnel, box count, front family, coverage family,
   man/zone, pressure).
2. Sample contexts from that distribution, force both calls in the simulator
   (no audibles, no coach), and simulate each with paired seeds.
3. Compare outcome distributions cell by cell with the NFL outcomes for the same
   cells (yards quantiles, stuff and explosive rates, sacks, pressures,
   completion and depth), with counts and confidence intervals, partially
   pooled across sparse cells.

This removes call selection and defensive-response selection, because both
sides' choices are the NFL's. It does not remove:

- **Roster–call fit.** Teams that call a concept are built for it (r = +0.27
  above). Run E2 in two roster modes — a league-average roster, and a fit-matched
  roster whose relevant unit is drawn from the profile of heavy users (zone-fit
  linemen for outside zone, a gap-fit line and a pulling guard for power) — and
  compare against NFL heavy-user and light-user cohorts. Treat the gap between
  the two NFL cohorts as the uncertainty band of the target.
- **Information we don't see.** NFL plays are post-audible and include protection
  calls, motion and tags we don't model. Restrict cells to what both sides
  represent, and keep the residual cohort labeled.

Data product: a committed aggregate table of context cells (counts and outcome
summaries per cell) plus mapping tables (NFL formation, concept and coverage
labels → engine ids). No raw rows are committed; the sampler draws contexts
from cell counts. Box counts and fronts need the tracking files at the snap.

Engine requirements: force personnel, formation, calls, coverage (exist);
force a front that produces a given box count (to add); disable audibles and
in-game learning (flags).

### E3 — Policy validation (coaching without outcomes)

Targets, each with the NFL's league value *and team-to-team dispersion*:
situational pass rate; personnel usage; pass rate by personnel; defensive
personnel against 11, 12 and 21; run-concept shares and concentration; play
action rate and its link to the run scheme (NFL teams' PA rate correlates +0.32
with their outside-zone share); single-high share; pressure rate; audible rate.
Measure on fixed leagues from E4 with `scripts/tendencies.ts`.

What the coach model needs to produce those (to build later, not now):

- **Roster evaluation with error.** Coaches estimate their own and the
  opponent's strengths with noise that shrinks with coaching skill.
- **Identity and dogmatism.** A scheme prior (e.g. wide zone, match quarters)
  and a weight on it; dogmatic coaches force their system on a roster that
  doesn't fit it, adaptive ones lean toward the players.
- **Package decisions by value.** 12 personnel when the second tight end beats
  the third receiver by enough to matter; nickel vs 12 when the nickel defender
  and scheme can hold up against the run (Buffalo plays nickel against 12
  personnel on every snap; Houston and Jacksonville were in base 97% of the time
  in 2022); base vs 11 when the linebackers can cover.
- **Game plans.** From the full playbook, a weekly plan of roughly 30–35 core
  calls: a small set of run families with their complements (wide zone → boot,
  keep and play action off the same look; power → counter and play-action
  power), pass answers by coverage and pressure, and a call sheet by situation
  (early downs, third down, red zone, backed up, two- and four-minute, openers).
- **Coordinator style.** Some coordinators change coverage mix heavily by
  opponent, others stay in a narrow band; the spread between them is a target.
- **Bounded in-game learning.** Adjust within the game plan, with shrinkage,
  so early adaptation can't mask a broken concept.
- **Installation (later).** Familiarity from reps: a call the defense rarely
  practices is busted more often.

### E4 — League ecology (full games; holdout)

Full games and seasons with coaches, generated rosters and game flow. First
calibrate the league generator against noise-corrected team spreads (table
above) and scheme-coherent roster construction (teams are mostly built for what
they run, some are not). Then use full games to check joint outcomes, team
variation and drive/scoring distributions on frozen leagues and seeds. Do not
tune mechanics here.

### Diagnostic callers

Run the same leagues and seeds under three callers, so outcome differences can
be attributed to policy rather than execution:

- **uniform** — every legal call equally often (mechanics with no selection;
  shows which concepts are broken);
- **nfl-mirror** — calls drawn from NFL conditional distributions by situation
  and personnel, independent of roster (NFL-like mix without fit);
- **coach** — the coach model.

## 4. Statistics and hygiene

- Paired comparisons use the named random streams (each subsystem's draws stay
  fixed when another changes).
- Sample sizes: a stuff rate near 18% has a standard error of about 2.2 points at
  300 carries and 1.0 point at 1,500; yards per carry (SD ≈ 6) has about 0.35 at
  300 carries. Plan cell sizes from the effect being tested, and report counts.
- Team-level spread: compare noise-corrected SDs, at comparable samples per team.
- Bootstrap by game; partial pooling for sparse cells; keep one NFL holdout
  (e.g. weeks 7–9) and frozen simulation seeds and leagues for release checks.
- Version every target: dataset, season, cohort, exclusions, mapping version,
  extractor. The league drifts (11 personnel 65% in 2022, about 56% in 2025;
  base defense about 21% → 30% from 2023 to 2025), so E2 contexts, E3 targets
  and E4 checks must come from the same season.

## 5. Order of work

1. *(Done)* Structured call records in the game log (`PlayLog.plan`) and
   matching NFL/simulation tendency extractors.
2. E2 data product: NFL context cells from the 2022 all-22 data (box count from
   tracking at the snap), mapping tables, committed as aggregates.
3. E2 harness: a forced-context runner with box-count control, audibles and
   learning off, and a per-cell report against the NFL cells.
4. Fix what E2 exposes, in E2: gap runs (power, counter, trap, draw stuffed about
   half the time), toss explosiveness, then pass protection and coverage cells.
5. E3: policy dashboard with NFL bands; uniform and nfl-mirror callers.
6. Coach model upgrades for E3: personnel and defensive packages by roster and
   opponent, concept concentration and identity, play action tied to the run
   scheme, weekly game plans, coach skill and dogmatism.
7. E4: league generator calibrated to team spreads; scheme-coherent rosters.
8. Only then, full-game calibration on frozen leagues.
