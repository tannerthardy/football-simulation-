# Movement and NFL validation audit

## Recommendation

Keep the reduced World. The most useful next movement work is a better approach
request and a small, consistently measured conditional reference panel, not a
more anatomical foot solver or another global acceleration reduction. Finish
the retained OL approach/contact-frame contradiction first. Then compare the
same body's requested pace, braking, facing and achieved motion against the NFL
tasks we already own.

The existing evidence shows that movement can be numerically coherent while its
capacity mapping and controllers remain imperfect. It does **not** establish
that current players accelerate too fast everywhere, that turf friction is too
low, or that our physics is NFL-calibrated. Game averages mix physical capacity,
effort, role, contact, reaction and scheme. Separate those causes before changing
the body.

This is a read-only engine audit at commit `80e8151`, source
`246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469`.
The small native check ran from its immutable archive, not the concurrently
edited working tree. No production parameter, physics law, extraction script or
historical evidence changed. A later controller revision does not inherit these
specific football measurements automatically.

## What is actually measured

| Evidence | Real coverage | Engine coverage | What it establishes |
| --- | --- | --- | --- |
| [BDB2027 movement extraction](../../../data/reviews/physics-world/nfl-movement/bdb2027-movement.json) | All 463,189 combine rows; 6,310 player drill paths, 56 drill labels. All three game seasons read: 22,654,290 rows, 176,707 retained player-play paths. | No engine run in this extraction. | Descriptive movement demands and athlete-matched combine/game differences. |
| [Matched task panel](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/held-foot-and-movement-tasks/movement-tasks.json) | 888 paths, 420 athletes; forty, shuttle, three-cone, OL long pull right and backpedal-drill geometry. | 3,552 paired trials at historical source `92eb1ea6…`. | Feasibility with neutral ratings, missing-measurement proxies and a controller that knows the path. Not current-engine or trained-model accuracy. |
| Small current check below | 18 existing paths, measured shuttle and three-cone, 2025 draft; six task groups. | 72 paired native World trials at source `24693159…`. | Several historical capacity/control findings persist in this deliberately small subset. |
| [2022 tracking reference](../../../data/bdb2025-summary.json) | Weeks 1–2 tracking; nine weeks of labels. | Historical four-game `kinematics-compare` outputs at several source versions. | Approximate game-demand guards. NFL motion comes from provider `s/a`; engine motion comes from rounded replay positions. |
| [2023 selected-player pass reference](../../../data/bdb2026-summary.json) | Selected pass plays/players, weeks 1–18. | Historical game guards. | Pre-throw role demand, not all-22 motion or complete contact geometry. |
| BDB2019 / BDB2023 | One 2017 tracking game analyzed; 2021 pass/protection labels analyzed, separate week-1 completeness audit. | No new matched current motion study. | Useful catalog/protection information; acquisition and completeness audits are not movement extraction. |

The BDB2027 game extraction excludes nullified plays and paths without a pass
label, snap or release. It stops at release, labelled first contact or three
seconds. Runs and many sacks are excluded. The 156/318/448 retained players in
2023/2024/2025 overlap: those counts cannot be summed as distinct athletes.
Its combine groups are DB, DL, OL, TE and WR; **RB, QB and LB physical profiles
are absent**. Opponents are incomplete and unlabelled blocking/collisions can
remain in the purported pre-contact window.

The old task panel is still valuable and its inputs/tools are unchanged. Its
source predates subsequent support, contact, integration and controller repairs.
Keep its numbers labelled historical rather than claiming that its 3,552 trials
have been repeated on today's engine.

## Current movement model: enough structure, uncertain mappings

`players/physical.ts` derives a sprint curve from ten-yard and forty times, then
scales speed for padded play and multiplies its time constant by `GAME_BURST =
2.2`. Thus the body's maximum initial drive is approximately the measured sprint
curve's initial drive divided by 2.2. This changes **capacity**, not just chosen
game effort. The mass-dependent speed adjustment and burst adjustment are model
mappings; they were not fitted with the athlete-matched BDB2027 data.

Braking and lateral acceleration come from shuttle/cone times plus balance and
skill, then `GAME_CUT = .55`. Directional speed caps represent forward running,
shuffle and backpedal. Facing has finite yaw response. Fatigue, sustained sprint
load, low posture and squeezing alter the usable envelope. A movement command's
`effort` chiefly scales desired speed; it is not an independently measured
muscular-effort fraction. Technique `cutSkill` changes the lateral envelope,
bounded in ordinary callers but not inferred from a measured ground-force trial.

World applies the requested acceleration, actual contact and recovery within
shared ground/arm budgets. Its default is the reduced support model, with a
held corrective coordinate when needed. Translation and yaw share traction;
recovery uses actual remaining effort. The current model does not need an
alternating articulated foot to represent every ordinary run. Its traction
coefficient, support width, recovery speed, directional technique factors and
rating-to-capacity maps remain effective assumptions. Tracking curvature is not
a direct measurement of any of those forces.

There are also controller approximations worth isolating: a known-path follower
can chase an error through a sharp turn, `track` uses a simplified stopping-speed
estimate, and an unspecified facing defaults toward travel. A defender turning
his torso away while dropping cannot be diagnosed as incorrect eye discipline
from position alone. Our replay facing is body facing, not gaze.

## Small current native check

Before running, select three paths per listed group using the lowest SHA-256 of
`athlete:event:drill`, from the existing eligible 2025 fixtures with both agility
measurements. Selection does not use errors, gains or visual outcomes. The pools
contain 12 eligible OL athletes per task, six DB backpedal paths and eight WR
forty paths. The resulting 18 paths are repeated under the existing four
mode/response combinations. This is not a population estimate or a newly
calibrated holdout evaluation.

Median path RMSE in yards, three paths per row, 0.15-second feedback setting:

| Task | Current football mapping | Diagnostic measured sprint V/tau |
| --- | ---: | ---: |
| WR forty | 4.22 | 0.29 |
| OL forty | 4.83 | 0.26 |
| OL long pull right | 2.36 | 1.57 |
| OL shuttle | 2.32 | 1.82 |
| OL three-cone | 2.42 | 1.64 |
| DB backpedal-drill **path** | 1.23 | 0.27 |

The diagnostic changes only V/tau on a cloned profile. It is not a production
recommendation to restore full sprint burst on every snap. Trials start at
observed moving velocity, trim derivative edges and run for the observed path
duration; these RMSEs do not verify official ten/forty times from a stationary
start. They show inability to keep up with the measured task even when its path
is known.

Control remains a material cause. On the **same** sprint-fit OL three-cone
bodies, changing the feedback setting from .15 to .40 seconds reduces median
RMSE from 1.64 to .56 yards. Long-pull RMSE changes 1.57 to 1.08. These settings
are gains, not fitted reaction times. Faster error closure is not automatically
better movement.

In the three shuttle paths, observed median peak speed is 5.72 yd/s and braking
demand 7.26 yd/s². The .15-second sprint-fit follower produces 7.34 yd/s and
5.07 yd/s². It arrives too fast for its reversal rather than simply lacking
forward acceleration. Increasing everyone's burst would worsen this mismatch
without better turn planning. The .40-second response is also not a universal
solution: its shuttle RMSE is 1.85 versus 1.82, while DB path RMSE worsens .27
to .31.

All 72 trials remain finite and upright; none of their motion measurements are
rejected. Maximum ground-impulse fraction is 1.0 and maximum planar work
residual is `2.69e-12` model units. These are accounting checks, not contact-force
or athletic-realism proof. The backpedal drill has no observed body orientation
in combine tracking, and this follower faces travel. OL dummy/contact geometry
is not simulated. Neutral control ratings remain artificial even when agility
measurements are complete.

## Why the older acceleration comparisons should not drive tuning

`scripts/kinematics-compare.ts` normally observes 10 Hz replays rounded to .1
yard. It derives speed over adjacent frames and smooths it over five samples
before differentiating. The corresponding older NFL scripts summarize provider
`s` and `a`, not the same position-derived operator. Those methods can differ at
contact, derivative edges, short windows, quantization and velocity reversal.
The matched BDB2027 task scripts already use one operator on both paths and
trim edges; use that method for new comparisons.

Other limitations of the old guard:

- Per-play maximum acceleration is not acceleration conditional on current
  speed, desired effort or whether a collision has occurred. Run maxima include
  contact; a hit can look like a burst. DL and OL are especially affected.
- NFL plays and engine plays have different lengths. Longer plays have more
  opportunities to generate a maximum. Pre-throw windows also change with QB
  decisions, whereas the BDB2027 window has a three-second cap.
- The old guard weights player-play observations rather than each athlete
  equally, lacks uncertainty bands, and samples generated teams at one strength.
- Named positions are not executed roles. A slot CB, rushing LB, blocking WR,
  pulling OG and setting OT should not share one movement-demand distribution
  merely because of a roster label. Simulated QB scrambles are excluded while
  the selected NFL cohorts use their own selection rules.
- The current task detector requires a 60-degree change over .5 seconds and
  entry/exit speeds of at least 1.5/1.0 yd/s. Absence of a qualifying turn is not
  evidence of good footwork or no plant. In the full combine extraction,
  backpedal/90-degree-break has only **one** qualifying turn athlete.

For example, the historical held-foot guard reported run RB peak acceleration
3.69 versus 5.18 yd/s², DL 5.09 versus 3.28 and OL 3.79 versus 2.99. Those
contradict a blanket burst reduction, but neither prove a position-specific
strength defect. Their source is `92eb1ea6…`, not the current audit source.
The old CB/S acceleration mismatch can also be driven by route and drop demand.

A later [traffic/man-accounting guard](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/traffic-and-man-accounting/kinematics.txt),
source `0f6b4078…`, still reports RB 3.65 versus 5.18, DL 4.92 versus 3.28 and
OL 3.74 versus 2.99 yd/s². Its first-contact mean improved to 1.10 versus 1.16
yards and DL speed at .5 seconds stayed 1.58 versus 1.68 yd/s. This reinforces
that early speed, loaded acceleration and contact are different measurements.
It is also historical: the current OL attention panel does not record an
equivalent league movement distribution.

## Generated rosters are already different cohorts

A cheap profile-only check generated 16 teams at strength .55, seed 90210, then
selected `11` offense and `base43` defense through the actual role selectors.
This produced 352 active players from 848 roster profiles. It simulated no games.
Grouping below uses the selected player's listed position, so replacements can
make group sizes differ from the nominal slot count.

| Group | Generated active n | Weight lb, generated / combine | Forty s, generated / combine | Shuttle s, generated / combine |
| --- | ---: | ---: | ---: | ---: |
| DB | 63 | 199 / 195 | 4.46 / 4.49 | 4.16 / 4.26 |
| DL | 66 | 273.5 / 279 | 4.82 / 4.80 | 4.45 / 4.58 |
| OL | 80 | 315.5 / 313 | 5.22 / 5.15 | 4.70 / 4.70 |
| TE | 15 | 250 / 248.5 | 4.64 / 4.70 | 4.31 / 4.34 |
| WR | 48 | 195.5 / 199 | 4.44 / 4.46 | 4.14 / 4.26 |

These are descriptive medians, not a quality validation. The NFL weight groups
contain 122/118/121/42/107 athletes; forty participation is
104/94/95/34/97 and shuttle participation only 33/46/64/20/38. Missing agility is
not random. The NFL sample is selected combine rookies, while our depth chart
selects archetype/rating suitability from an artificial roster. Mixing CB/S and
EDGE/DT further changes composition. Generated starters and backups also have
different quality distributions. A league-mean difference is not automatically
a body-law error.

Generated QB/RB/LB medians have no equivalent BDB2027 combine group. Use
nflverse combine/roster inputs already downloaded for those body distributions,
with joins, participation, age and missingness recorded. Keep names randomized;
match plausible distributions and correlations before claiming actual NFL skill
ratings. Neither combine time nor a team's EPA alone identifies a player's
decision-making, hand technique or grip strength.

## Highest-value next measurements

1. **Repair the retained approach/contact mismatch on unchanged bodies.** Read
   the actual observed target, intended contact surface, requested velocity and
   facing, body speed at contact, keeper/load state and achieved displacement.
   Keep an ordinary control and the failed cutoff. A better feasible request is
   a controller fix; a feasible request executed incoherently reopens World.
2. **Use one measurement operator on a small conditional motion panel.** Retain
   position-derived tangential acceleration/braking and lateral acceleration at
   10 Hz with the current smoothing and edge exclusions. Report entry-speed bins
   `[0,2), [2,4), [4,6), 6+` yd/s, facing/travel category, requested pace and
   before/during/after-contact categories. NFL pace intention is unobserved: use
   declared role/task proxies and do not pretend they are measured commands.
   Preserve short-window/failed-task denominators, not only peak percentiles.
3. **Use the existing BDB2027 game orientation.** Raw game CSVs have `o` and
   `dir`; the current movement extractor ignores both. Circular orientation
   handling can identify sustained forward, shuffle and backward movement and
   hip-turn transitions within each actual alignment role. For example, a
   sustained facing/travel difference above 120 degrees is a candidate backward
   window, not proof of gaze or technique. Verify the dictionary and angular
   convention, require sufficient speed/duration, preserve missing orientation,
   and compare the body-facing command separately from its velocity.
4. **Treat pulls and hard cuts as different geometry.** The full combine
   extraction's long-pull-right turn retention median is .825 (65 athletes),
   versus .141 shuttle (169) and .220 three-cone (159). Compare curvature,
   approach speed, minimum/exit speed and contact arrival error in like windows.
   Add fold/slice path geometry only when the drill's observed window and contact
   are understood. Do not require a puller to stop at every waypoint or use a
   smooth-pull number to tune reversal capacity.
5. **Then separate capacity from chosen demand.** Keep the measured sprint
   envelope available while making ordinary pace/braking/facing control choose
   lower game demand. Prototype one bounded command interface, not per-scheme
   strength boosts. Preserve the current routine game envelope and test the
   same bodies in a maximal sprint, a gentle approach, a sharp reversal and a
   loaded block before promoting a mapping change. The current capacity
   shortfall makes this valuable; the overchasing reversal makes it risky to do
   without the preceding control checks.
6. **Extend loaded comparisons when the right tracking is available.** Earlier
   all-22 BDB2025/BDB2023 raw archives are absent in this workspace; BDB2027 and
   nflverse inputs are present. Restore a reviewed tracking week when needed,
   rather than downloading another general motion archive. Measure OL/DL early
   displacement, contact onset, relative fit velocity, maintained distance and
   recovery; use PFF role/opponent labels where defined. Tracking distance and
   changed speed are observable proxies, not hand-force or grip-strength labels.

Use player-grouped development/reserved cohorts, and report roster/position/role
and week variation alongside athlete counts. Predeclare the filters and geometry
metrics before changing movement parameters. A useful acceptance is that the
same capabilities produce believable free and loaded behavior across several
body sizes, with errors explained by requests or bounded physical response.
Exact league mean rushing yards, points or explosiveness is not that test.

## Reproduction and provenance

Existing scripts and published hashes remain unchanged. The native subset used
`movement_task_fixtures.py`'s existing ignored inputs and the unmodified
`movement-tasks.ts` / `movement_task_report.py`, with the selection above. The
runner hash is `f945412b4fafb62f222dbdd973d28f2e49f0cc312324b587b6efe9130e535845`;
reporter `ad903efe49292b6e4fa183486c0ae0c222e975a89859b6233ac8655efcfb9605`;
measurement `6f68795e3e441d7de5acb039473a2d6668d464d794e476543208afb1c0dc2925`.
Run only against a pinned source if interpreting these exact numbers.

The [published movement-audit manifest](../../../data/reviews/physics-world/position-technique/movement-audit/manifest.json)
pins the small native inputs/trials/report and generated-profile summary. Gzip
timestamps are zero; decompression restores the originally measured JSON bytes.
These are optional audit artifacts, not prerequisites for tests/build:

| Published artifact | Original decompressed SHA-256 (plain summary hash for last row) |
| --- | --- |
| [current-subset-inputs.json.gz](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/position-technique/movement-audit/current-subset-inputs.json.gz) | `d6e1a492f11326a05b76d298ee86b9c753c6d4f21b6a3d57755fe20b907f2155` |
| [current-subset-trials.json.gz](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/position-technique/movement-audit/current-subset-trials.json.gz) | `00cc3c261d17476233f6fda9c5fc5e994eccd38d3f33f5ba71d3cbfff2f32778` |
| [current-subset-report.json.gz](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/physics-world/position-technique/movement-audit/current-subset-report.json.gz) | `36abed00421018373df08e8c882a93e96421fefbe89a856f905f9af5aa91b66c` |
| [generated-profile-summary.json](../../../data/reviews/physics-world/position-technique/movement-audit/generated-profile-summary.json) | `db7cce17efb4b2d1980763e14ada1a2994fb27e8898d9f5f6e54c394115d0abc` |

The full generated-profile file stays ignored and its hash is retained in the
small manifest. The real fixture source hash is recorded in the existing task manifest; its raw
inputs match the downloaded BDB2027 snapshot. This check consumed cached inputs,
performed no historical resimulation and downloaded nothing. The present Python
environment already supplied numpy/pandas; the documented `.venv-movement` path
was absent, so the unchanged reporter ran with `python`. No dependency or setup
configuration changed.

The most useful additional owner input is a few source-labelled clips with the
expected pace, facing, fit and acceptable mistake marked. A clear example of a
good lineman settling before contact versus a wrong approach would distinguish
control from physical inability more directly than another large dataset.
