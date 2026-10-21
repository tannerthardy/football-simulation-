# Orientation and travel: a small NFL tracking pilot

This pilot starts using the `o` and `dir` columns already present in our local
BDB2027 files. It changes no engine physics, capabilities or controllers. The
useful next step is a source-labelled facing/travel comparison, rather than
another global acceleration adjustment.

## What the fields can tell us

The raw header contains `time,x,y,s,a,dis,o,dir,event`; player-play labels provide
the lined-up role and play direction. An older
[Big Data Bowl dictionary](https://github.com/ryurko/Big-Data-Bowl/blob/0dac66ce81e5fd22ca48f35ea6a637c523dda12b/schema.md)
defines `dir` as the angle of player motion, but does not include `o`.
The current Kaggle pages retrieved during this review returned JavaScript shells
without a field dictionary. Consequently, the 2027 `o` field is a **provisional
orientation proxy**, and the older definition of `dir` is not independent
verification of the new file's convention.

The report computes the absolute shortest circular difference between the two
provider angles. For example, 355° and 15° differ by 20°, not 340°. A common
rotation of both fields leaves the difference unchanged, so this calculation
does not need a left/right attack rotation. This does **not** establish that the
two fields actually share a convention. That must be checked before treating
these distributions as validated body-facing versus travel direction.

Neither field measures gaze, attention, receiver recognition, a foot plant or
successful technique. Large angular differences are not automatic backpedal or
shuffle labels. Contact, torso rotation and provider filtering can contribute.

## Selection and exclusions

Before measuring any angles, choose the numerically earliest tracked regular
season game in each declared season, using `games.csv` and an ID-only tracking
inventory. This selects:

| Season | Game | Selected raw rows | Retained pass windows | Retained athletes | Distinct retained plays |
| --- | --- | ---: | ---: | ---: | ---: |
| 2023 | 2023090700, KC–DET | 5,435 | 49 | 4 | 39 |
| 2025 | 2025090400, PHI–DAL | 30,108 | 195 | 11 | 56 |

The initial inventory showed that choosing the earliest game without the REG
condition selects preseason Hall of Fame games. The regular-season restriction
was declared before computing orientation results; it was not selected for a
favorable outcome.

Of 492 selected player paths, exclude 182 without a pass label, 41 without both
snap and release, and 25 nullified paths. Each remaining window runs from the
snap to the earliest later release, labelled first contact or three seconds.
This retains 6,751 frames. The cohort is selected draft/combine athletes, **not
all-22 or the NFL population**. The same athlete can appear under several roles;
adding role-specific player counts would overstate the number of people.

Sustained motion requires four consecutive valid 10 Hz frames, spanning at least
0.3 seconds, with provider speed at least 1 yd/s. Missing/invalid angles and clock
gaps break the run; no interpolation bridges them. Exact duplicated rows can
collapse, but conflicting duplicate timestamps reject a whole path. The gross
position/speed screen is explicit, not a fitted NFL performance limit. All
retained windows pass these checks, with zero missing angles, malformed clocks,
conflicting duplicates, coordinate/speed rejections or non-10Hz steps.

## Descriptive findings, conditional on field semantics

There are 5,143 valid sustained-motion frames. The following examples show why
body orientation should be measured separately from travel. All role/speed
strata, including thin or empty ones, remain in the report.

| 2025 lined-up role | Role total athletes / paths | Provider speed yd/s | Frames | `abs(o-dir) >=120°` frame fraction |
| --- | ---: | --- | ---: | ---: |
| C | 1 / 33 | [1,2) | 499 | 78.6% |
| C | 1 / 33 | [2,4) | 218 | 30.3% |
| G | 2 / 56 | [1,2) | 628 | 69.7% |
| G | 2 / 56 | [2,4) | 478 | 55.2% |
| CB | 1 / 33 | [1,2) | 143 | 64.3% |
| CB | 1 / 33 | [4,6) | 190 | 12.6% |

The 120° threshold is an analysis category, not a coaching truth or a calibrated
engine transition. Pooled frames favor athletes with more sampled plays. The
report also gives within-athlete angular medians and opposed-frame fractions,
then distributions across athletes; with these tiny groups, neither weighting
establishes league prevalence or uncertainty bands.

A separate slow-orientation marker uses non-overlapping 0.5-second windows
entirely below 1 yd/s and an absolute endpoint `o` change of at least 45°.
There are 121 opportunities and zero triggers; the largest change is 41.5°.
That is a result for this declared marker and cohort. It does not establish that
players did not turn their heads or reorient. Endpoint differences miss a turn
which reverses or completes a circle, and the pre-release window is short.

## How to use this next

First obtain a current first-party field dictionary, then inspect a few matched
clips to confirm convention and what body segment the orientation represents.
If verified, compare engine **body facing** and achieved velocity with the same
circular/speed/window operator, by executed role and before/during-contact
status. Record requested facing separately: a bad instruction, delayed yaw
response and contact-induced rotation are different causes.

This panel suggests useful conditional questions, not new constants: does an OL
keep his chest toward a threat while setting backward, can a defender gain depth
without always facing travel, and how do those relationships change with speed?
The existing reduced World already supports distinct facing and velocity. Test
controller instructions before adding physical detail. No force, balance,
traction, gaze or rating can be identified from these angles alone.

## Reproduce

The collector reads only existing local files and pins their exact bytes,
selection, script and Python/pandas/numpy versions. It reads full file ID
inventories to choose two games; it does not copy the raw tracking files.

```sh
python3 scripts/data/orientation_motion_audit.py \
  data/raw/kaggle/nfl-big-data-bowl-2027/nfl-big-data-bowl-2027 \
  out/football-handbook/orientation/report.json
python3 -m unittest discover -s test -p 'test_orientation_motion_audit.py'
```

Seven measurement tests cover circular invariance, gaps, missing angles,
ambiguous clocks, low-speed endpoint rotation and athlete weighting. They
validate the operator, not NFL semantics or the engine's football realism.
The published [derived report](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/football-handbook/orientation/report.json.gz),
[manifest](../../data/reviews/football-handbook/orientation/manifest.json),
[verification](../../data/reviews/football-handbook/orientation/verification.json),
[collection log](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/football-handbook/orientation/collection.log)
and [measurement test log](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/data/reviews/football-handbook/orientation/tests.log)
retain the exact frozen result. The manifest pins original source files without
copying them into the evidence packet.
