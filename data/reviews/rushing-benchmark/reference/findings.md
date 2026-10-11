# Four-season NFL rushing benchmark: findings and use

The useful benchmark is a **matched distribution for the run's job**, plus a
mechanical diagnosis of how the simulator produced it. A single 4.3 YPC target
would hide the difference between a goal-line touchdown, a third-and-long draw,
an ordinary first-down run and an attempted QB escape.

The final reproducible collector is `scripts/data/rushing_benchmark.py`; its
22 tests pass. `nfl-benchmark.json.gz` is the complete compact report,
`query-receipt.json` freezes its operators before the final collection, and
`artifact-manifest.json` pins the files. `verification.json` verifies 62 exact
prior operators/witnesses against the existing two-season report. Inputs are
the previously pinned 2022/23 nflverse files plus newly pinned complete 2024/25 PBP,
season rosters and 2023/24/25 FTN. The old files/reports are not overwritten.

The four seasons contain 1,087 regular-season games, 52,883 live observed designed
runs and 4,091 observed scrambles. Primary clean outcomes retain 52,113 designed
runs and 3,883 scrambles after requiring `penalty=false` and finite whole-play
`yards_gained`. All clean gains are known in this snapshot. This is a flag
filter, not a reconstruction of accepted/enforced penalties. The 10,110 REG
no-play penalty rows outside the live pass/run selection are separately
audited; their hidden original calls cannot be assigned to a rushing
denominator. Scramble-only stuff rates exclude failed escapes recorded as sacks.

## Reference distributions

All rates below retain their separate numerators/denominators in the report.
40/60/100 is our declared yard-based rule, not a universal NFL standard. EPA>0
is a provider expected-points-model result; immediate conversion is another
operator. The conversion denominator also requires a known valid down, matching
the prior operator; all selected NFL clean runs have valid downs. Yard success retains gained yards on lost fumbles, while separate
turnover-aware measures require a known possession result.

| Clean population | n | Mean / median yards | Stuff<=0 |10+ |20+ |40/60/100 | Immediate distance conversion |
|---|---:|---:|---:|---:|---:|---:|---:|
| All designed carries |52,113|4.29/3|18.56%|10.47%|2.30%|49.65%|24.53%|
| Listed RB/FB designed carries |46,621|4.31/3|17.77%|10.13%|2.25%|48.75%|22.60%|
| Declared ordinary RB/FB witness |15,315|4.70/3|15.01%|10.79%|2.62%|46.86%|10.96%|
| Late-down short yardage |4,455|3.14/2|25.79%|7.05%|2.20%|69.88%|69.88%|
| Goal line 1–5 yards |2,814|1.04/1|33.19%|0%|0%|57.46%|44.10%|
| Third-and-at-least 20 |146|6.97/6|2.74%|26.71%|0%|0%|0%|
| Final 2 minutes, leading 9+ |350|3.65/3|18.86%|7.43%|2.57%|38.00%|26.57%|
| Positively FTN-charted sneaks |1,171|1.58/2|18.27%|0.26%|0.09%|77.37%|77.03%|
| Recorded scrambles |3,883|7.43/6|0.13%|26.06%|4.64%|62.79%|40.48%|

The ordinary witness is exactly: designed run, listed RB/FB, first/second down,
8–10 to go, outside the 20, score within 8, regulation before the final 600 seconds.
Late-down short means third/fourth and 1–2 to go and keeps all carrier positions.
The 146 third-and-20+ observations cannot establish a target for an identified
inside-zone call against three rushers; PBP lacks both labels. The recorded
sneak with 25 yards remains in the source rather than being silently discarded.

Designed gains have p90/p95/p99 of 10/14/29 yards. Their 15+, 30+ and 40+ rates are
4.51%, 0.94% and 0.51%. Only 2.30% of runs gain 20+, but those runs contribute 17.20%
of net rushing yards. Ten+ gains contribute 41.96%. Report both event frequency
and tail-yard contribution: a high average can be a handful of breakaways.

Negative gains are 9.52% and zero gains 9.04%; combine them only when reporting
stuff 18.56%. Positive EPA is 40.78%, and replacing 40% first-down yard success
with 45% reduces 49.65% to 43.98%. Those different labels must not be conflated.

Field geometry changes the opportunity to produce a tail. All-run 20+ is 2.30%,
whereas field-eligible 20+ is about 2.77%. The report keeps matching eligibility
at 10/15/20/30/40 yards, unknown/invalid field counts and TD-at-goal censoring.
A five-yard TD provides no evidence about a hypothetical 20-yard finish.

## Situations and retrospective temporal replication

The report contains 1,401 pooled/per-season joint down×distance×field rows,
84 margins, 95 score×clock rows, 460 exact chart margins and 1,058 charted box/context
rows. A large total sample still leaves many narrow tails thin. Run direction
(`left/middle/right`) and gap (`end/tackle/guard`) are observed direction/location,
not inside/outside zone or named blocking scheme. Unknown direction must remain
unknown: the 435 clean unknown-direction designed runs have unusually poor
outcomes, and should not be interpreted as a normal named-run family.

Examples of selected designed-run margins:

| Situation | n | Mean | Stuff |10+ |40/60/100 |
|---|---:|---:|---:|---:|---:|
| First down |28,704|4.42|17.46%|10.44%|48.66%|
| Fourth down |1,075|2.50|28.84%|5.67%|68.65%|
| Exactly 1 to go |5,547|2.89|27.47%|6.18%|72.53%|
|7–10 to go |32,985|4.59|17.05%|11.18%|45.29%|
| Own 51–89 yards from goal |24,826|4.73|16.66%|11.65%|50.10%|
| Shotgun |24,259|4.50|16.83%|10.85%|48.99%|
| Under center/PBP shotgun=false |27,854|4.11|20.07%|10.14%|50.22%|

These margins reflect player/call/opponent choices, not a causal effect of
changing down or shotgun. The location/end margin averages 5.05 yards with 21.96%
stuffs and 16.30% ten-plus: higher stuff and higher upside can coexist. It is not
an outside-zone target.

Ordinary RB/FB per-season mean gains are 4.59, 4.60, 4.81, 4.82 yards in 2022–25;
their stuff rates 15.60%, 15.68%, 14.97%, 13.69%. The 2022/23 witnesses exactly
reproduce the prior 4095/3826 observations. 2024/25 is a **retrospective temporal
replication**, not a blinded validation holdout: the data have already been
inspected. Reporting a trend does not establish why it changed.

Common-support standardization fixes the kind/carrier/down/distance/field mix.
For listed RB/FB designed carries it retains 22,936 reference gains and 22,970
newer gains from 23,272/23,349 available. Matched mean changes 4.23→4.37, stuff
18.08→17.58%, chosen success 48.66→49.52%, ten-plus 9.98→10.17%, twenty-plus 2.26→2.27%.
The report retains all excluded mass and does not average cell quantiles.

Score/clock standardization has much less overlap: only 4,561 trailing 9+ and
4,871 leading 9+ RB/FB gains are retained from 6,646/7,842. Matched means 4.69/4.74
are close, while stuffs 15.30/17.31% and ten-plus 10.70/12.31% still differ. Selection,
opponents, calls and unmeasured personnel remain. Do not turn these into
automatic score-dependent strength/aggression bonuses. QB/other narrow
score cells fail the declared support threshold and stay unavailable.

FTN joins every selected run/scramble in all four seasons by exact game/play.
Motion means before OR at the snap; it does not establish velocity at snap.
Positive integer box counts remain presentation counts, not Over/Under/Bear.
Zero values appear often in the raw chart and are labelled `zeroUnverified`,
not inferred to mean zero defenders or folded into light boxes. Actual offense
backfield counts are not 11/12 personnel labels. All FTN-derived aggregates
retain attribution and CC-BY-SA-4.0 terms in the provenance.

## Uncertainty, generated rosters and acceptance

250 deterministic, shared bootstrap draws sample whole games within each season,
keeping both offenses and all selected events together. Each metric has its own
known-denominator and game-exposure gate. Conditional games with zero
qualifying runs contribute zero. Intervals require at least 100 known metric
observations across at least 20 games, plus the overall gain-exposure gate. For all designed carries, the 95% game-cluster percentile
intervals are mean 4.23–4.35, stuff 18.17–18.92%, ten-plus 10.24–10.77%, twenty-plus 2.17–2.44%.
These measure resampling this observed schedule, not the acceptable range for
every generated roster. Repeated teams/players across games still create
dependence. Under 10 events are flagged rare; a zero-event [0, 0] interval describes
the observed resamples, not proof zero-risk or a credible unseen-event bound.

Across 128 RB/FB team-seasons, p10/p90 means are 3.68/4.84, stuffs 14.65/22.23%,
ten-plus 7.29/12.76%, twenty-plus 0.95/3.69%, chosen success 43.84/54.08%. Counts have p10/p90
317/418.4. This spread includes real schedules, call mixes, opponents, health
and situations. It cannot isolate talent or justify a 95% generated-roster
acceptance band. Retain a few contrasting roster seeds and native profile
capabilities, and look for sensible relationships before forcing exact means.

Reference lookup requires 100 gains and 20 games. Thin exact context broadens by
removing field, then distance, then down while retaining kind/carrier. It names
every discarded dimension and returns unavailable if nothing qualifies. An
engine-standardized reference must report unsupported engine mass and use its
actual situation weights; exact scheme/front laboratory calls remain separate
from observed mixed games. Continuous engine yardage stays primary, with
nearest-whole-yard sensitivity supplied by the engine adapter.

## Recommendation

1. Use ordinary RB/FB, goal-line/short and third-long cohorts as separate jobs.
   Compare mean/median, negative/zero, success, tails and turnovers together.
2. Before retuning any capability, inspect the first wrong consumed movement or
   support request on each oversized tail. No-contact breakaways, early missed
   fits, unusable OL approach lanes and pursuit cancellations are controller
   mechanisms until evidence identifies a physical inconsistency.
3. Keep force/work, support/grip and numerical-convergence gates unchanged.
   Fix a physics rule when achieved contact/load violates them or the same
   capability fails across interactions; final YPC alone cannot identify it.
4. Use exact BDB concept labels as the separate concept study and map only
   verified installations. Standardize actual games for situation/carrier mix,
   then check several generated rosters. Preserve adverse film and ordinary
   controls, not only an improved average.
5. Football-controller refinement can start now where a wrong instruction is
   proved. This outcome study neither certifies physics readiness nor warrants
   a general stronger/weaker-player tuning pass.

Rerun declaration and collection:

```bash
python3 scripts/data/rushing_benchmark.py --seasons 2022 2023 2024 2025 \
  --plan-only out/rushing-benchmark/query-receipt.json
python3 scripts/data/rushing_benchmark.py --seasons 2022 2023 2024 2025 \
  --input-dir data/raw/nflverse --manifest data/reviews/nflverse/input-manifest.json \
  --input-dir data/raw/rushing-benchmark --manifest data/raw/rushing-benchmark/acquisition-manifest.json \
  --query-receipt out/rushing-benchmark/query-receipt.json \
  --out out/rushing-benchmark/nfl-benchmark.json
python3 test/test_rushing_benchmark.py
```

