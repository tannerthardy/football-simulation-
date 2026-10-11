# Ground-support validation design

## Evidence boundary

The acquired AddBiomechanics subset supports checks of **human vertical loading
and timing**. It does not identify an NFL player's spring stiffness, contact
compliance, vertical force ceiling, cleat traction, or football contact
capacity. Keep the measurements as an external sanity envelope; do not fit a
force law to them.

The processed files provide raw force-plate force, torque and center of
pressure (CoP), raw optical marker locations, and three model processing passes
(kinematics, low-pass filter, dynamics). Coordinates are meters with world Y
up, forces newtons, torques N m, and time seconds. `Frame.t` is an integer
frame index; multiply it by each trial's own `dt`. Force and marker arrays
share the processed frame index, but original sensor timestamps are missing,
so original clock alignment/latency is unverified. The API exposes raw plate
forces and raw markers; the low-pass pass is a separate derived model state,
not a license to treat all signals as equivalently filtered.

Measured force is compared with `mass * comAcc`, where `comAcc` is specific
COM acceleration (kinematic acceleration minus gravity). Adding weight again
would create an erroneous one-body-weight term. Kinematic COM and all pass
residuals are model-derived. Kinematic-pass linear residual medians are about
1.43–1.61 body weights. The dynamics pass is explicitly fit against GRF, so its
small residuals are not independent validation. Do not regress force against
these COM accelerations to tune stiffness, damping, or a cap.

The plates report useful vertical load, but their corner coordinates are all
zero and absolute plate registration cannot be certified. CoP-to-heel/toe
midpoint distance is only a registration sanity check, not a calibrated
support polygon. Heel/toe markers are measured points, not the plantar surface
or a known contact point. In particular, do not infer vertical foot
compression by subtracting marker Y from CoP Y: the absolute plane/registration
is not established. The plate data also do not uniquely assign each plate
force to a particular foot during double support.

Moore's processed trials retain selected window names but no belt-speed
commands or perturbation event metadata; original trial start/end times are
zero. Segments 2 and 8 are therefore phase-unclassified walking windows, not
verified perturbation/recovery trials. The four subjects are marked
`PILOT_DATA`; that label is retained literally and is not a quality guarantee.

## Directly usable reference quantities

The pinned summary contains four subjects, 12 windows, 5,892 frames, and 5,431
force-valid frames. Hamner's two running subjects have six complete plate
loading intervals per speed at a 50 N threshold. Median loaded interval times
are:

| Nominal speed | Subject 01 | Subject 02 |
| --- | ---: | ---: |
| 2 m/s | 0.324 s | 0.357 s |
| 3 m/s | 0.259 s | 0.299 s |
| 4 m/s | 0.229 s | 0.253 s |
| 5 m/s | 0.204 s | 0.224 s |

The report repeats thresholding at 25 N and 100 N. These are intervals where a
single plate exceeds a force threshold, not verified individual foot stance
times. They establish that the observed loading schedule varies with speed;
they do not set a controller's stance duration or spring time constant.

Force-valid running total vertical GRF has a 95th-percentile range of **1.86–
2.59 body weights** across the selected windows. This is the sum across the
measured plates normalized by each model's weight. It is a human running
reference for a *whole-body* vertical support envelope; it is not an NFL force
capacity, a per-foot cap, or a contact-force prescription. Walking windows and
invalid-force frames must not be silently mixed into that running range.

Kinematic-pass median COM height/stature is 0.575–0.592 for the eight running
windows and 0.554–0.564 for the four selected walking windows. These are
model-derived body-shape/context statistics, not leg rest lengths. Vertical
GRF plus COM motion does not isolate leg compression from articulated joint
motion, and the current subset has no independently registered foot-ground
vertical displacement. Accordingly it cannot measure vertical spring
stiffness or damping.

## Recommended dimensionless sensitivity panel

Use dimensionless values so the same experiment scales with player mass and
height. Let `M` be total player mass, `H` stature, `g` gravity, `W = M g`,
`k` vertical support stiffness, `c` vertical damping, and `delta` compression.
Report the normalization explicitly:

```text
k*       = k H / W              dimensionless stiffness
zeta     = c / (2 sqrt(k M))    damping ratio
delta*   = delta / H            normalized compression
Fcap*   = Fcap / W             normalized whole-body vertical force cap
Tn      = 2 pi sqrt(M / k)      linearized total-mass spring period
```

An intentionally small first pass is:

| Sweep | Suggested values | Interpretation |
| --- | --- | --- |
| Stiffness `k*` | 20, 60, 180 | Soft-to-stiff numerical sensitivity. With `H=1.8 m`, the total-mass spring periods are about 0.60, 0.35 and 0.20 s. The latter two bracket the observed 50 N plate-loading intervals, but this is only a timescale comparison: plate load duration is not a spring period and the effective vertical mass is unknown. |
| Damping ratio `zeta` | 0.2, 0.7, 1.2 | Underdamped, near-critical and overdamped behavior probes. No acquired signal identifies a damping ratio. |
| Rest/preload offset `delta0*` | 0, 0.01, 0.03 | Perturb the chosen static-equilibrium reference by 0–3% of stature. These are design probes, not measured neutral leg compressions. Keep the unloaded geometry and equilibrium force definition explicit. |
| Compression cap `deltaMax*` | 0.02, 0.05, 0.10 | Short, medium and broad travel limits. Mark combinations unable to support static weight as intentionally infeasible; never hide them by resetting body height. No acquired measurement establishes any of these limits. |
| Whole-body force cap `Fcap*` | 1.5, 2.6, 3.5 | Lower clipping, near the upper observed running p95, and high-cap sensitivity cases. Use this only for a total support reaction. The dataset cannot divide the aggregate force into independent per-foot capacities. |

For a linear spring, static compression under body weight is
`delta_eq* = 1/k*`. This is a useful implementation invariant: a cap below
that value should be reported as unable to carry static weight at that
stiffness. It is not a human anatomy estimate. For `k*` values 20, 60 and 180,
the corresponding normalized static compressions are 0.05, 0.0167 and
0.0056. Keep cap sweeps and rest-offset sweeps paired so a changed outcome can
be attributed to one declared parameter.

Run each parameter row against the same small task panel: quiet static support,
vertical drop/landing, repeated unload/reload at the measured 2–5 m/s timing
context, and a lateral impulse recovery case. Record total vertical force in
body weights, compression in stature fractions, contact duty/loading time,
energy/work residuals, and timestep convergence. The dataset's loaded intervals
can be used as a contextual timing overlay only; do not call the simulator a
match because one selected interval coincides. Any acceptance gate for a
football game model also needs held-out football movement/interaction evidence
and cannot be passed by this human locomotion sample.

## Input and provenance checks

The review's current aggregate is byte-identical to
`out/virtual-foot-data/reproduction-summary.json`. It pins:

- reader `nimblephysics 0.10.52.1`, source commit
  `7f3ac81e7120713bbeea331ea06aa8ed02229251`, and `SubjectOnDisk.cpp` SHA-256
  `eedac7833cd553e3e328463c187db00ed3d13d9174dccd019734d8bb0f451c8d`;
- Hamner subject 01 SHA-256
  `d5391cc873747997da3be6e74e7cf58bd077d48918ec96542fe6ca773bd73f58`;
- Hamner subject 02 SHA-256
  `8089e69b4a2161aef022aa110ac6cef14da7cd28de671a7afda23ebcd5cee3bc`;
- Moore selected ranges, not whole-file hashes: subject 3 header/ranges
  `760620f8…07d7`, `51cb8b85…3f07`, `975dfc46…ccf6`; subject 5
  `3ecb20b4…5b49`, `1c099073…24fc`, `bdb33c29…a994` (full values and byte
  offsets are in the source manifest).

The native reader API was checked against all four local `.b3d` inputs. Header
masses are 72.84, 76.48, 60 and 65 kg. The embedded kinematics/low-pass models
give the two Hamner subjects the same segment proportions: talus+calcaneus+toes
are 2.0842% of model mass per foot; one tibia is 4.9325%. These are embedded
scaled-model assignments, not measured masses and not an NFL population range.
The dynamics-pass masses differ because that pass was optimized; use the
kinematics/low-pass assignments if testing an anatomical-prior sensitivity.
The exact input hashes and per-pass body masses/inertias are retained in
[`model-inertial-priors.json`](../../../data/reviews/biomechanics-support/model-inertial-priors.json).

The old ignored extraction under `out/virtual-foot-data/support-summary.json`
has different source-manifest and extractor hashes from the currently pinned
review summary. It has the same broad frame counts, but do not cite it as the
reproduced current artifact; use the review summary or matching
`reproduction-summary.json` and the hashes above.
