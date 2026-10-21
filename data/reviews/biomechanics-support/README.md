# Tiny movement and support reference

Four AddBiomechanics core subjects are now downloaded and audited. These are
movement/support observations, **not validation of the football contact model**.
No engine coefficient, player rating or game outcome was fitted.

The public core catalog contains individual `.b3d` subjects. We downloaded both
complete Hamner subjects and only selected byte ranges from the two large Moore
subjects. Actual selected data totals **101,357,312 bytes**; the full Moore files
would total approximately 4.15 GB. Raw data and the reader stay ignored under
`out/virtual-foot-data/`. Git retains this review, the source manifest, the
extractor and aggregate measurements. All public downloads used certificate
verification; the range downloader rejects servers that ignore `Range`.

## What was acquired

| Study / subject | Header body profile | Selected data | Frames with valid force flags |
| --- | --- | --- | --- |
| Hamner `subject01` | 72.84 kg, 1.768 m | Four complete processed segments at 2, 3, 4 and 5 m/s; 8.36 s | 840 / 840 |
| Hamner `subject02` | 76.48 kg, 1.819 m | Same four speeds; 8.733 s | 1,052 / 1,052 |
| Moore `subject3` | 60 kg, 1.616 m | First 1,000 frames of `T046_segment_2` and `_8`; 20 s | 1,602 / 2,000 |
| Moore `subject5` | 65 kg, 1.734 m | First 1,000 frames of `T031_segment_2` and `_8`; 20 s | 1,937 / 2,000 |

There are **12 windows, 5,892 frames and 5,431 force-valid frames**. Moore flags
exclude missing blips, contact without measured force, and seven force
discrepancy frames. Invalid-force frames remain counted and reported; they do
not become zero force or valid liftoff events. The header quality label is
literally `PILOT_DATA` for all four files. This field does not certify quality
and does not establish that each original trial followed a pilot protocol.

The core folders spell the running study `Hammer2013`; attribution is to
**Hamner and Delp (2013)**. Source URLs, exact file IDs, sizes and full-file
Hamner hashes are in [manifest.json](manifest.json). Moore has per-range hashes,
not a claimed whole-file hash. Its local files are sparse: reading any other
frame would encounter an unpopulated hole. The extractor checks byte coverage
before every selected read and never invokes `loadAllFrames`.

## Measured versus derived

The files contain measured force-plate force, torque and center of pressure
(CoP), plus optical marker positions. These are processed dataset copies of
the sensors, not the original acquisition files. Coordinates are meters with
world Y up; forces are newtons and torques N m. We do not convert them to yards
or transform them into engine parameters. Convert lengths once at a simulation
boundary using `1 yd = 0.9144 m`.

Each frame also contains three model processing passes: kinematics, low-pass
filter, and dynamics. COM position/velocity/acceleration, joint torques and
residuals are **model-derived**. Dynamics was optimized against ground forces;
it is not an independent predictor of those forces.

Two format details matter:

- `Frame.t` is an integer frame index, **not seconds**. Multiply it by the
  actual trial timestep. Hamner subject01 is approximately 100 Hz and subject02
  approximately 120 Hz; Moore is approximately 100 Hz. The report retains the
  exact timesteps, rather than imposing a common sample rate.
- `comAcc` is **specific COM acceleration**: the official reader source stores
  `COM linear acceleration - gravity`. Thus compare measured total force with
  `mass * comAcc`; adding weight again creates a spurious one-body-weight error.
  The pinned source and native reader version are in the manifest.

Marker and force values share the processed frame index, establishing a
synchronized processed representation. This does **not** independently verify
the original sensor clock alignment or latency. Original sensor timestamps
are absent from the selected files.

## Initial observations

At a 50 N per-plate loading threshold, both Hamner subjects show progressively
shorter loaded intervals as running speed rises. Each cell below contains six
complete intervals; intervals touching window or force-invalid boundaries are
excluded. The report also repeats the calculation at 25 and 100 N.

| Running speed | Subject01 median loaded interval | Subject02 median loaded interval |
| --- | --- | --- |
| 2 m/s | 0.324 s | 0.357 s |
| 3 m/s | 0.259 s | 0.299 s |
| 4 m/s | 0.229 s | 0.253 s |
| 5 m/s | 0.204 s | 0.224 s |

These are thresholded **plate loading** intervals, not automatically identified
individual foot-contact events. Two force plates do not by themselves prove
which foot produces every load. They support a useful directional requirement:
the virtual support model should permit changing stance/flight timing with
speed. They do not prescribe one universal fixed plant time or NFL max agility.

Kinematic-pass median COM height/stature ranges from **0.575–0.592** across
the eight running segments and **0.554–0.564** across the four walking windows.
These are descriptive model outputs from four subjects, not NFL body-shape
constants. Force-valid running 95th-percentile total vertical GRF spans
**1.86–2.59 body weights**. Neither vertical GRF nor horizontal/vertical force
ratio identifies the maximum cleat traction coefficient.

The source files expose substantial quality limits. Kinematic-pass linear
force residuals have medians around **1.43–1.61 body weights**; these
accelerations should not be used directly to fit a force law. Dynamics-pass
computed raw-force residuals are much smaller: 95th percentiles **0.012–0.048
body weights** for running and **0.079–0.095** for the selected walking windows.
Because the dynamics pass is force-fitted, that agreement is not independent
physical validation. Stored dynamics residuals and a recomputation against raw
forces are both retained, including their differences.

For loaded plates, the 95th-percentile horizontal distance from raw CoP to the
nearest measured heel/toe midpoint spans approximately **0.09–0.18 m**. This is
a registration sanity check, not a foot support polygon: heel/toe midpoint is
not CoP, marker placement matters, and all force-plate corner coordinates in
the headers are zero. Absolute plate boundaries/registration cannot be
certified from this subset.

## What remains unavailable

The original [Moore paper](https://doi.org/10.7717/peerj.918) describes one
minute of normal walking, eight minutes of longitudinal perturbations, then
one minute of normal walking, with named events and measured belt speeds.
Its [original data](https://doi.org/10.5281/zenodo.13030) are two large compressed
archives; those archives were not downloaded. The primary article endpoint
returned HTTP 403, so the public Europe PMC full-text XML was inspected instead.

The core `.b3d` files preserve trial names and split indices, but original
start/end times are all zero and custom value fields contain no belt commands
or perturbation events. **Segment 2 and segment 8 have not been classified as
unperturbed and perturbed.** We do not infer experimental phase from nominal
segment time, nor claim perturbation-aligned recovery measurements.

The most useful next addition is the small original **event/time metadata and
measured treadmill belt-speed traces for `T046` and `T031`**, plus the mapping
from original samples to these processed segments. That would permit actual
disturbance-aligned foot-placement comparisons. Without it, the acquired Moore
windows still provide measured loading and marker-motion envelopes.

No selected trial supplies football jersey grips, hand-contact forces,
cleat maximum traction, padded collision forces or load-restrained stepping.
The data cannot establish a strong versus weak tackle or a restrained-foot
force law. A later matched engine probe should compare several movement tasks
using one support model; this pass does not fit or certify that model.

## Reproduce

The native reader can be used without importing Nimble's optional Torch
helpers. Use Python 3.12, NumPy and the manifest-pinned Linux x86-64 wheel.
Install it into an ignored directory, keeping engine dependencies unchanged:

```sh
python -m pip install --no-deps --target out/virtual-foot-data/reader nimblephysics==0.10.52.1
python scripts/data/biomechanics-support.py --fetch
python scripts/data/biomechanics-support.py --out out/virtual-foot-data/support-summary.json
```

The manifest contains the exact wheel URL and its PyPI SHA-256. This execution
downloaded that wheel, verified its checksum and extracted it into the reader
directory without installing training dependencies. The fetch command was
rerun into a second ignored directory and all subject/range hashes verified.
Two independent extractions produce identical aggregate JSON. This review
adds no raw-data dependency to build, tests or ordinary simulation.

## Attribution

The [official core catalog](https://addbiomechanics.org/download_data.html) and
[terms](https://addbiomechanics.org/tos.html) identify CC BY 4.0. The selected
core subject folders contain only `.b3d` files, and their notes say “Generated
by AddBiomechanics”; no additional uploader `LICENSE.txt` appears in those
four listings. The FAQ requests the core dataset citation for core data and
uploader attribution files for user-generated downloads. These are core files.

Retain the manifest's license and attribution when using or sharing aggregates:

- Werling et al., *AddBiomechanics Dataset: Capturing the Physics of Human
  Motion at Scale*, ECCV 2024, DOI
  [10.1007/978-3-031-73223-2_27](https://doi.org/10.1007/978-3-031-73223-2_27).
- Werling et al. (2023), *AddBiomechanics: Automating model scaling, inverse
  kinematics, and inverse dynamics from human motion data through sequential
  optimization*, DOI
  [10.1371/journal.pone.0295152](https://doi.org/10.1371/journal.pone.0295152).
- Hamner and Delp (2013), DOI
  [10.1016/j.jbiomech.2012.11.024](https://doi.org/10.1016/j.jbiomech.2012.11.024).
- Moore, Hnat and van den Bogert (2015), DOI
  [10.7717/peerj.918](https://doi.org/10.7717/peerj.918). The original Zenodo
  record uses CC0; the acquired core derivative is used under the core catalog's
  CC BY 4.0 terms.

## Segment inertia priors for the finite-foot model

[model-inertial-priors.json](model-inertial-priors.json) retains the embedded
OpenSim segment assignments from both existing Hamner subjects, including all
three processing passes and the original full-file hashes. The kinematic and
low-pass models assign **2.084% of model mass per foot** (talus, calcaneus, toes),
with modeled foot masses 1.518 and 1.594 kg. Both are scaled models with the same
proportions; these are not independently measured segment masses, a population
range, or validated effective inertia for a collapsed point-foot model. The
research panel sweeps 1%, 2.084% and 4% per foot. Dynamics-pass masses are
force-fitted; prefer the kinematic/low-pass assignments as transparent priors.
Local inertia tensors are kg m² and are not directly substituted into a torso
rotor in kg yd². No additional subject was downloaded.

Reproduce using the already acquired files and reader:

```sh
python3 scripts/data/biomechanics-inertial-priors.py --out out/biomechanics-inertial-priors.json
```

The extractor pins its own SHA and the input files. The current physical design
and its limitations are in
[inertial feet and support readiness](../../../docs/reviews/inertial-feet-and-support-readiness.md).

## Pose-dependent rigid shape priors

[rigid-shape-priors.json](rigid-shape-priors.json) adds pose-dependent grouped
torso and foot mass/inertia summaries from the same two complete Hamner files.
It samples eight existing running windows in kinematics and low-pass passes
(16 selected stance frames per pass family across the two subjects); it does
not download any data or change the engine. The non-foot body group forms a
torso proxy, and each foot group includes talus, calcaneus and toes. Full
tensors and principal moments are retained; `trace(I)/3` is only an isotropic
rotor reduction for sensitivity studies. The report includes kg m² and kg yd²
(`kg yd² = kg m² / 0.9144²`), world COMs and offsets transformed into pelvis or
calcaneus frames.

These are embedded processed-model assignments, not direct segment
measurements, an NFL population interval, or an effective inertia validated for
a collapsed point foot. The heel/toe locations are embedded model markers; they
are not measured sole boundaries, cleat geometry or contact points. The pinned
0.10.52.1 native Python wheel cannot return readable body inertia tensors via
its six-scalar `getMomentOfInertia` output binding, and exposes no readable
inertia property. All 80 inspected XML body/pass entries have zero off-diagonal
terms, so the XML/native off-diagonal sign convention remains unverified. The
JSON records these limits explicitly rather than claiming native agreement.

Reproduce with the already acquired reader and BDB files:

```sh
python3 scripts/data/biomechanics-rigid-priors.py \
  --out out/biomechanics-rigid-priors.json
```

The JSON pins the input manifest, each full subject hash, reader source commit,
and extractor hashes at start and end. Raw files and the reader remain ignored
under `out/virtual-foot-data/`. Current support-model interpretation and
production status are in
[solved ground and leg support](../../../docs/reviews/solved-ground-and-leg-support.md).
