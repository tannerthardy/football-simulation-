# A small situational playcalling reference

The strongest reference in this pilot is **more observed dropbacks when behind,
especially late in the game**. It does not support a universal increase in deep
target share when trailing. Build situation-aware choices and opportunities
before inventing a desperation trait or a downfield accuracy/risk bonus.

This is a data-only study of the existing pinned 2022/2023 regular-season
nflverse play-by-play and 2022 FTN charting. It changes no engine policy, physics,
ratings or outcome targets. Its predeclared
[query receipt](../../../data/reviews/schematics/context/query-plan.json),
[report](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/schematics/context/report.json.gz) and
[provenance](../../../data/reviews/schematics/context/manifest.json) preserve the
definitions, source identities and all joint cells.

## Findings and denominators

The collector retains **67,488 live calling observations**, including 945 rows
with a penalty flag. Result/depth/screen cohorts contain **66,543 clean plays**,
where clean means the penalty flag is explicitly false. That is not a new
interpretation of penalty acceptance. Of 35,790 actual clean throws, 34,419
have both a named receiver and known target depth. Missing targets/depths remain
outside that depth denominator.

| Observed measure | Trailing by at least 9 | Leading by at least 9 | Interpretation |
| --- | ---: | ---: | --- |
| Raw dropback share, both seasons | 9,425 / 13,168 = **71.6%** | 4,032 / 8,194 = **49.2%** | Includes sacks/scrambles as dropbacks; describes realized action. |
| Common-cell standardized dropback share | **70.1%** | **48.4%** | 91 common season/down/distance/field/clock cells; 11,662 trailing and 7,581 leading observations retained. |
| Raw 20+ yard share among named targets with known depth | 926 / 7,890 = **11.74%** | 412 / 3,450 = **11.94%** | Depth perpendicular to LOS; not total air distance or tight-window risk. |
| Common-cell standardized 20+ yard target share | **11.89%** | **12.39%** | 70 cells; 6,141 trailing and 3,089 leading depth observations retained. This small difference is not a significance or causal claim. |
| Raw motion annotation, 2022 only | 1,886 / 6,419 = **29.4%** | 1,470 / 3,905 = **37.6%** | Charted motion before/at snap, among matched live calling plays with known labels. |
| Raw screen annotation, 2022 only | 305 / 4,548 = **6.7%** | 176 / 1,880 = **9.4%** | Known screen label among clean matched observed dropbacks. |

Clock context changes the observed call mix strongly:

| Season / regulation phase | Trailing 9+: observed dropbacks / calling plays | Leading 9+: observed dropbacks / calling plays |
| --- | ---: | ---: |
| 2022, before last ten minutes | 2,981 / 4,503 = 66.2% | 1,638 / 2,867 = 57.1% |
| 2022, last ten minutes | 1,633 / 1,916 = 85.2% | 274 / 1,038 = 26.4% |
| 2023, before last ten minutes | 3,152 / 4,786 = 65.9% | 1,838 / 3,250 = 56.6% |
| 2023, last ten minutes | 1,659 / 1,963 = 84.5% | 282 / 1,039 = 27.1% |

These clock rows are still mixtures of down, distance, field position and
teams. The full joint cells and common-support comparison help distinguish
composition, but do not make teams/QBs/opponents interchangeable. Higher pass
volume creates more deep attempts even if their share per target stays similar.
Therefore “more passing while behind” and “more aggressive individual throws”
are different claims.

Other useful context checks are also conditional observations:

- First down has 14,853 dropbacks in 29,455 calling plays (**50.4%**); third
  down has 11,288 in 14,065 (**80.3%**). These margins do not supply one staff's
  rules or a complete scheme mix.
- Red-zone named targets have 45 20+ yard depths in 4,360 observations
  (**1.0%**), versus 2,543 in 19,854 in own territory (**12.8%**). Field
  compression changes available geometry; it does not prescribe a particular
  coverage or abolish vertical route concepts.
- The 64 observed team-season dropback shares have p10/p90 **54.6%/66.6%**.
  These are descriptive team-season percentiles, not uncertainty intervals or
  required generated-roster limits. Team quality, opponents and game scripts
  contribute to that variation.
- All 33,652 selected 2022 calling plays join exactly to FTN; the motion label
  is known on all of them. The 2022 screen label is known on 19,926 clean
  observed dropbacks, with 1,707 positive labels (**8.6%**). The pinned snapshot
  has no 2023 FTN file: missing 2023 charting is not zero motion or screens.

The standardized 2022 motion/screen contrasts also remain in the report, with
their distinct support: motion **30.0%/37.8%**, trailing/leading, across 57
common cells (5,997/3,792 observations); screens **7.3%/9.9%** across 35 cells
(3,636/1,685 observations). Motion time, huddle/no-huddle, formation and who was
moving are not measured here. Do not translate these associations into a fixed
motion penalty for being behind.

## A relevant extreme: third and at least twenty

This predeclared witness is deliberately broader than exactly third-and-27.
It identifies distance and down, not a three-rusher/eight-drop defensive call.

| Season | Calling plays | Observed designed runs | Clean designed runs: mean gain / conversion | Clean dropbacks: mean gain / conversion |
| --- | ---: | ---: | ---: | ---: |
| 2022 | 156 | 21 | 21: 6.67 yd / 0 of 21 | 132: 7.85 yd / 5 of 132 |
| 2023 | 189 | 35 | 34: 6.94 yd / 0 of 34 | 150: 6.08 yd / 4 of 150 |

The 55 clean designed runs average **6.84 yards**, with no distance conversions
in this sample. The 2022 screen label appears on 36 of 132 clean dropbacks
(**27.3%**). Median named-target depth is three yards in both seasons.
This is consistent with teams sometimes taking attainable short gains in a
difficult conversion situation. It does not identify every motive or establish
that inside zone against eight deep defenders should average 6.84 yards in our
engine. Runs were selected, schemes/fronts are unobserved here, and the sample
is small. Use it to motivate normal-versus-long-yardage stress cases, retaining
both useful gains and failed conversions.

## Query definitions were chosen before results

The saved receipt was declared **2026-10-11 10:54:39 UTC**, before collection
finished at **10:54:59 UTC**. It fingerprints both the query and collector.
Changing either makes that receipt unusable for the script. This is a modest
descriptive pilot, not registered hypothesis testing or fitted prediction.

- Select regular-season `play_type=pass/run` rows; exclude kneels, spikes and
  two-point attempts. Special teams, no-play rows and postseason are outside
  the cohort. Kneels/spikes already fall outside these live type labels in the
  inspected data; explicit checks prevent future schema assumptions.
- “Observed dropback” includes attempts, sacks and scrambles. “Designed run”
  excludes scrambles. Actual clean throws require a recorded completion,
  incompletion or interception and no sack; depth additionally needs a named
  receiver and finite `air_yards`.
- Depth bins are below zero, `[0,10)`, `[10,20)` and `20+` yards. FTN screen
  labels are not inferred from negative air yards. Motion and screens have
  separate chart-match/nonmissing denominators and different penalty filters.
- Down bins are 1–4; distance is 1–3, 4–7, 8–10, 11–19 or 20+; field position
  is own territory, plus territory or red zone; score is trailing 9+, within
  eight or leading 9+. Unknown values are retained explicitly. No selected
  observation has an unknown context in this snapshot.
- Regulation clock is before versus within the last 600 seconds. Overtime is
  separate even though `game_seconds_remaining` can be zero there.
- Common-cell score comparisons require both groups in the identical
  season/down/distance/field/clock cell, with at least 20 calling observations
  per group for dropback share or ten relevant observations for other metrics.
  Each retained cell receives weight proportional to the sum of both groups'
  metric denominators. Both score groups use those same weights. This reports
  a descriptive overlapping context mixture, not an effect of changing score.

There are 666 joint cells. Of 213 candidate trailing/leading context cells,
only 91 meet the dropback comparison support rule and 70 meet named-depth
support. Thin/unmatched cells remain visible in the full report rather than
being silently discarded from the source population or turned into certainty.

## What this can teach the simulator

Treat public situation as an input to choosing an installed solution: usable
time, distance needed, field/boundary, score and available personnel. Let a
coordinator prefer some calls, a QB choose among available observed answers,
and the defense anticipate those tendencies imperfectly. Do not give either
side hidden knowledge of the actual opponent's call.

These references can help check a small model's *conditional* choices after
its instructions work: Does a late leading offense preserve clock? Does a
trailing offense generate more dropbacks? Does field compression change route
spacing? Can the defense still react to a real run on third-and-long? Can a
short screen develop without being guaranteed a conversion? Those are useful
relationships; copying this cohort's exact percentages into hard rules would
erase team/roster variety.

Realized action is not the hidden original call. An RPO pass could begin with a
run option; a scramble begins with a dropback; a protection failure can destroy
a screen. A target is a selected receiver after coverage, pressure and QB
decisions, not the set of available routes. An unthrown deep route does not
appear as a deep target. Catchability, interception-worthiness, pressure,
mechanical platform, eye discipline and receiver branch agreement are separate
questions not measured by this query.

Score-state selection also correlates with clock, tempo, team/QB ability,
injuries, opponents, personnel, prior drives and defensive strategy. Opponents
can trade short gains for deep prevention when ahead; shorter targets do not
necessarily mean the QB is timid. Common-cell standardization controls only
the declared coarse context fields. No causal psychological effect, population
uncertainty interval or scheme-specific success inference is claimed.

## Sources, verification and reproduction

No new dataset was downloaded. The three raw files exactly match size/SHA-256
entries in the existing
[nflverse acquisition manifest](../../../data/reviews/nflverse/input-manifest.json).
Its hash and actual input checks are included in the report; the old manifest
and reference aggregates are unchanged. Duplicate selected PBP or FTN game/play
keys fail collection instead of being guessed or multiplied. Source definitions
are grounded in the checked
[data handbook/catalog](../../football-handbook/data-and-measurement.md) and
[existing reference guide](../../../data/reviews/nflverse/README.md).

The collector uses Python **3.12.14** and the existing standard-library reference
helper, whose byte hash is pinned with the new collector and test file. Eight
measurement tests protect named-target/throwaway/sack denominators, distinct
motion/screen filters, overtime, long-distance conversion, exact chart keys,
source checksum rejection and common-cell weighting. The synthetic weighting
test deliberately reverses a raw association by changing context composition;
it verifies why raw score margins require care, not football reality.

```sh
python3 -m unittest discover -s test -p test_schematic_context_audit.py
python3 scripts/data/schematic_context_audit.py \
  --plan-only out/schematic-context/query-plan.json
python3 scripts/data/schematic_context_audit.py \
  --query-receipt out/schematic-context/query-plan.json \
  --out out/schematic-context/report.json
```

A fresh receipt/report have new timestamps. Their query and metric values should
match on the same pinned input/helper/collector bytes. Keep the published receipt
for the actual measured run. Raw source records remain ignored; Git holds only
aggregates, metadata and tests.

**Attribution:** FTN Data via nflverse. FTN charting and derived charting
aggregates are under **CC-BY-SA 4.0**. Changes: exact PBP/FTN join, declared
regular-season/live-play and penalty filtering, conditional aggregation,
named-target depth selection and common-cell descriptive standardization.
Other PBP fields retain their NFL/nflfastR provenance; the code license does not
replace a data source's terms.
