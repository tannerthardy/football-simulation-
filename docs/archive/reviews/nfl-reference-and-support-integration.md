# NFL references and shared support physics

**Read first on `claude/engine-priorities`. Physics remains NOT READY.**
The owner wants the same body capabilities to explain blocking, shedding,
jamming, absorbing contact and tackling before expanding football features.
The [physics development guide](../plans/PHYSICS_DEVELOPMENT.md) still governs that
work. This update repairs three support/contact inconsistencies and makes the
NFL comparison more useful without fitting outcome multipliers.

## What changed in the world

Active reeling and passive tension now act through the **same grasp landmark**.
Previously, an implicit active grasp pulled at pad height while its passive
restraint acted at the carrier's COM or lower leg location. A leg pull also
previously entered the braced torso moment instead of the unbraced foot moment.
This could change balance without moving the hand. An isolated COM-pull test
now verifies that the arms can accelerate a pair without inventing a tipping
moment at that landmark. This retains the existing reduced contact-height
mapping; it does not validate that mapping against anatomy.

Recovery stepping now integrates its existing response ramp over the actual
interval. Previously the end-of-step recovery speed acted for the entire
substep, giving coarse steps extra recovery. The ramp equation is integrated
exactly before switching to the constant-speed portion. A subdivision test
covers intervals before, across and after the response ramp. A second check
found a mid-step crossing error: once stepping reached the controlled base,
the coarse solver held deviation at its boundary until the next substep.
It now solves the crossing time (bounded root solve during the ramp, analytic
afterward) and applies the existing ankle/hip damping for the remaining time.
The crossing test checks both regimes against a subdivided interval.
No force, strength,
latency, solver-floor or outcome constants were changed.

Two old tackle checks were corrected after tracing their failures. Joining an
assist still changes no momentum instantly; subsequent motion must account for
recorded turf impulses if a member falls. The stopped-progress rule is now
tested with a stationary, standing held carrier, separately from down-by-contact.
It previously assumed a full physical rep always survived to the progress
whistle; the corrected moment can knock that carrier down earlier. The original
full-suite failure log is retained rather than presented as an engine fix.

## Evidence and limitations

Engine source SHA-256: `e6f1cea4f7c3d2d1a5660c00b31d12cef68a8e1c73d6574931053e7937b5ab57`.
Baseline: `dfcd686`, source `e0ecd30f2c6c160f463f1fbbdeef599b0956587ec61f0e74ab24a222e3041a18`.
Reviewed evidence is in `data/reviews/physics-world/support-integration/`;
the manifest pins source, inputs, scripts and artifacts.

- **265 engine tests, 17 data tests, typecheck and build pass.** All 20 replay
  browser checks pass on 870 clips, six fixed-team games, 27 concepts.
  This film cohort contains no pitches: the browser check reports that absence
  and verifies ordering where present instead of requiring a random library to
  contain every exchange. Dedicated run-execution tests still exercise pitches.
  One concurrent full-suite run had passing assertions plus a worker RPC
  timeout; the subsequent quiet run exited cleanly. Both logs are retained.
- **120 shared-body mechanical reps:** at 12 versus 48 substeps, mean subject
  position error is 0.030 yd, worst 0.075 yd, no fall disagreements. Momentum
  residual is below `3e-12 kg·yd/s`; planar work residual below `9e-12 kg·yd²/s²`.
  Active arm impulse/work stays within its limits, with reflection errors below
  `4e-13 yd`. These are mathematical contracts, not physiological validation.
- **Football convergence still fails:** nine real-technique fixtures at 12
  versus 192 substeps have mean closest-distance error 0.206 yd, worst 0.822 yd,
  and **two fall disagreements**, essentially unchanged from the baseline.
  Seed 3, ordinary power: QB peak support deviation is 0.949 of critical at
  12 steps, versus 1.011/1.006 at 48/192; the whistle ends all three at 2.55 s.
  The coupled trajectory is near a fall boundary. That explains sensitivity
  but does not resolve it. Seed 7's larger path error develops before the wrap;
  a grasp-only patch cannot solve the entire sweep.

Same seeds/cohorts as the preceding handoff; games are guards, not tuning targets:

| Measurement | Baseline | This change |
|---|---:|---:|
| 16-game points/team-game | 30.91 | 27.22 |
| Designed-run yards/carry | 4.12 | 3.42 |
| Stuff rate | 24.24% | 23.96% |
| 20+ yd completions/attempt | 15.40% | 14.32% |
| Interceptions/attempt | 6.31% | 7.12% |
| Completed YAC | 8.89 yd | 8.06 yd |
| Missed + broken tackles/play | 0.22 | 0.21 |
| Four-game DL speed at 0.5 s, median | 1.58 yd/s | 1.58 yd/s |
| Four-game run DL peak acceleration, median | 4.91 yd/s² | 5.03 yd/s² |
| Four-game geometric pressure | 28.8% | 29.3% |
| Four-game first-contact YBC, mean | 0.77 yd | 0.81 yd |

Interceptions and rushing efficiency regressed; YAC and points fell, and
first contact/geometric pressure changed little. These coupled full-game results do not establish the causal effect
of either repair. A physical inconsistency should not be restored to make a
statistic look better. Do not tune grip strength to fix interceptions.

The refreshed fixed-team film has 527 recorded throws: 341 completions,
21 interceptions and 165 non-interception incompletions. Drops account for
28/165 (**17.0%**), versus 658/5,929 (**11.1%**) in the clean 2022 FTN-matched
NFL cohort. Film and league cohorts differ. Our remaining incompletions are
not yet causally separable into mechanics, accuracy, pressure and read errors.
A defender within two yards and a charted QB hit are different annotations;
neither proves pressure caused a given miss.

## Where the Big Data Bowl studies stand

| Source | Actually studied | What it supports / what remains |
|---|---|---|
| BDB2019 / 2017 | 91-game archive audited; tracking summary uses **one game** | Historical pocket/movement definitions, not a broad tracking validation |
| BDB2023 / 2021 | Eight weeks' metadata/scouting: 8,557 plays, 188,254 scouting rows; separate week-one tracking audit | Valuable all-22 trench/pressure labels; full tracking extraction still outstanding |
| BDB2025 / 2022 | Nine-week metadata; tracking summaries use **weeks 1–2** | Movement, run first-contact, pocket and coverage geometry, including 1,394 designed runs |
| BDB2026 / 2023 | All 18 weeks of supplied selected-player passing tracking | Receiver/defender movement and separation; not all-22 contact data |
| BDB2027 | All three supplied game seasons: **22,654,290 rows**, 176,707 retained player-play trajectories; all **6,310 combine trajectories** | Matched athletic-drill versus role/effort demands; descriptive, not fitted or held-out validated |

These sources already exposed free-movement acceleration, early contact,
pocket attachment, separation and timing problems. Earlier tracking summaries
informed the current gentler game-burst mapping and subsequent movement checks.
The newer 2027 extraction has **not** fitted fresh physics parameters. Its 407
matched forty/game athletes show why observed football speeds should not be
treated as maximum capacity: OL movement in a short protection window is a
different task from sprinting forty yards. Curved OL pulls also retain much
more speed than hard shuttle reversals. Neither comparison measures hand
forces or turf friction. See [the complete movement study](bdb2027-movement-transfer.md).

The highest-value next utilization step is a portable **matched movement task
panel** through the existing world: sprint, brake, shuttle/reversal, curved pull,
backpedal-to-run. Use the same position-derived measurement method, geometry,
duration and athlete weighting as the references; vary controller inputs on
fixed bodies. This panel is still unbuilt. Keep every attempt/season of an
athlete on the same side of a development/holdout split. Tiny qualifying
backpedal/fold samples cannot justify universal capacity parameters.

## New public references we can reproduce

`scripts/nflverse-reference.py` uses public
[nflverse-data releases](https://github.com/nflverse/nflverse-data/releases),
documented by [nflreadr](https://nflreadr.nflverse.com/) and
[nflfastR](https://www.nflfastr.com/). The official
[nflreadpy](https://github.com/nflverse/nflreadpy) is another Python access route.
Our extractor uses the standard library and verified CSV/checksum manifests.
Raw files are ignored; the reviewed aggregates travel with this private repo.

- Complete **2022–2023 REG play-by-play**: 66,782 clean scrimmage plays;
  64 team-season comparisons; 407 down/distance/field/score/time cells.
  Penalized live plays remain in calling-choice cohorts but are excluded from
  physical yardage outcomes. Sacks/scrambles are dropbacks; sacks are excluded
  from actual throw denominators. Kneels, spikes and nullified plays are excluded.
- **2022 FTN charting:** exact game/play join matches every one of the 17,783
  clean throws. Drop, throwaway, catchability, contested catch, out-of-pocket
  and interception-worthiness labels add information absent from plain PBP.
  Final completion/interception status takes priority over overlapping labels.
  Attribution: **FTN Data via nflverse**; charting and derived charting aggregates
  are **CC-BY-SA 4.0**. Code licenses do not establish every upstream data license.
- **Roster snapshots, player-ID crosswalk, combine and snap counts:** measured
  body pairs and actual participation rather than equal weighting of reserves.
  Crosswalks fill 21 Chiefs and 23 Eagles missing PFR IDs using exact GSIS IDs;
  no guessed name matches. Forty times alone cannot identify acceleration.

Useful additional sources, **reviewed but not downloaded by this update**:
NGS weekly/season aggregates (2016+, minimum-attempt qualification) for time to
throw, separation and rushing context; PFR advanced stats (2018+, availability
depends on table) for pressure, hits, hurries, drops and contact summaries;
participation/personnel (2016+, source changes to FTN from 2023) to align actual
lineups and looks. Preserve each provider's definitions and source/season
coverage. They are not continuous all-22 trajectories or contact-force sensors.
Their access definitions were checked in nflreadr commit
`23f915a5be30415aeaa0c5c80cd23b2c69cda122`.

## How to use references with randomized players

**Strict physical contracts, conditional movement distributions, broad outcome
guards.** The first must hold for every generated roster. For movement, compare
similar positions, task geometry, entry speed, posture, facing, fatigue, contact
state and play phase. For outcomes, compare matched down/distance/field/score
mixes and report distributions over players, games and independently generated
rosters. Include denominators, tails and uncertainty; a small game panel is not
a season. Reweight shared situation cells before comparing different play pools.
The cells are now available; common-mix reweighting is not yet automated.

Examples of observed 2022–2023 **team-season p10–p90 means**, not mandatory bands:
completion 60.6–68.1%; sack/dropback 4.6–9.4%; 20+ yd completion/throw 6.7–11.1%;
stuff/designed run 15.9–23.5%; YAC/completion 4.53–5.91 yd. A generated team can
legitimately lie outside these ranges, but persistent extreme tails across many
rosters need an explanation in bodies, controllers, schemes or observation
definitions. Do not fit one average by distorting contact mechanics.

Track success with an explicit definition: the current yards heuristic is
40/60/100% of distance by down. NFL EPA-positive success is separately available
and uses a statistical model; EPA, WP, CP/CPOE and expected YAC are useful
contextual outcomes, not direct physical truth or a rating of a player's mind.
Trailing-team pass rates are observational, not proof that pressure or score
causes particular psychological choices. Keep full QB mechanics for later.

The **2022 Chiefs and Eagles benchmark seeds** preserve 109 anonymous observed
height/mass profiles and historical combine missingness. Participation coverage
is 98.5% and 100% of scrimmage player-snaps. Snap-weighted OL mass is 145.5 and
142.7 kg. Observed live dropback shares are 66.9% and 56.6%, with state-cell
counts retained. These are two successful, distinct teams, not a typical NFL
sample. Broad position labels and a season roster snapshot have limits.

For a future optional generator mode, sample whole physical tuples within role
and preserve their correlations; randomize identities and bounded variation.
Match participation/role composition and situation-specific calling tendencies,
then estimate technique/decision traits with explicit uncertainty and shrinkage
from multiple kinds of evidence. Do not infer blocking strength from yards,
grip force from bench reps, or awareness from team wins. **No generator or
playcalling changes are implemented here.** The default randomized pool stays
available. A management game can later own identity, development, scouting and
coaching above this reusable world/controller interface.

## What to do next, in order

1. Continue the local hand/grasp/support trace. Separate block-path error from
   near-critical wrap error; inspect foot-lock velocity sampling, slip/slide
   transitions and load filtering. Keep 20 Hz controls fixed. Repair demonstrated
   integration/constraint errors before considering local refinement; do not
   raise the global 12–16 step floor to hide a failure.
2. Build the matched movement task panel above and hold out athletes. Use
   BDB2027 drill paths to identify geometry/effort/controller issues separately
   from body capacity. This is more useful now than another giant generic dataset.
3. Revisit loaded initial run contact with front/alignment and OL/DL participation
   controls. The old 2.06 yd/s DL get-off concern is obsolete: current median
   0.5 s speed is 1.58 versus NFL 1.68. Loaded run DL acceleration remains high
   (5.03 versus 3.28); OL is 3.77 versus 2.99. Study posture, OL response advantage,
   double-team force transfer and actual first-contact geometry together.
4. Improve achievable tackle approach: use imperfect observed trajectory,
   remaining braking/turning distance, reach, current support and grip location
   to select a physically feasible attempt. Preserve the same body limits.
5. Reduce the remaining unsupported magnitudes using contact/grip/ground-force
   evidence and sensitivity studies. AddBiomechanics remains metadata-only;
   it may help COM/support recovery, not NFL wrap force or cleat friction.

We cannot honestly measure "95% of all possible gains." A defensible physics
handoff needs convergent shared interactions across body sizes/control quality,
finite force/work/reach and support budgets, credible held-out movement, and
loaded-contact behavior robust to plausible parameter uncertainty. Then remaining
film errors should be demonstrably caused mostly by decisions/techniques/schemes.
**We have not reached that point.** Planar kinetic accounting is not a full
support/potential/vertical energy ledger; grip/support magnitudes are still
assumptions and technique convergence still fails. Passing tests alone do not
earn the owner's physics OK. PR #1 remains separate.
