# Physical contact and support: evidence and remaining assumptions

Public source pages and indexed abstracts were inspected on 2026-10-09. This
review separates measured quantities from model reductions. No motion dataset
or subject archive was downloaded; none of the values below was fitted to NFL
scoring or rushing outcomes.

## What the compact model can support

[Hof, Gazendam and Sinke (2005), *The condition for dynamic stability*](https://doi.org/10.1016/j.jbiomech.2004.03.025)
derive extrapolated COM position, `x + v / sqrt(g / l)`, from an inverted
pendulum. Stability depends on this position relative to the support base,
not on speed or an isolated balance rating. Their examples concern standing
and walking. They do not establish a football-specific fall threshold or
recovery step speed.

[Bruijn et al. (2013), *Assessing the stability of human locomotion*](https://doi.org/10.1098/rsif.2012.0999)
review multiple stability measures and their different validation limits.
A capture-point contract is useful, but its mathematical consistency does
not establish realistic fall frequency in football.

For a horizontal impulse `J` applied at height `zc` to a body with COM height
`h`, the physical angular impulse is `(zc - h) × J`. With a pitch/roll
inertia approximation `I = m k²`, a small-angle COM-velocity equivalent is
`J / m * (zc - h) * h / k²`. Dividing that by the pendulum rate gives a
compact support-deviation term. This derivation is rigid-body mechanics;
the conversion into capture-point deviation is a **model approximation**.
It does not simulate a full pitch angle, vertical translation, limb motion,
or rotational kinetic energy.

Keep the actual equal-and-opposite translational impulses unchanged. Height
should change support response rather than amplify the collision impulse.
A below-COM impulse can pitch a body opposite its translation; a low grip
braking a runner pitches him forward. Restrictions on foot placement remain
necessary to distinguish a leg trip from a low torso shove.

Steady horizontal pushes also produce a moment: balancing their horizontal
ground force alone does not cancel the contact/ground couple. The athlete
must lean or move the center of pressure. Treating settled, supported contact
as balanced by committed lean is a useful reduction, but should not erase
every moment whenever net acceleration is small. Applied support, rather
than merely a desired push, must justify that reduction.

A separate pad-height proxy is preferable to using COM height as the contact
height. Common contact height must be compatible with both bodies' geometry.
The exact shoulder offset, posture scaling and torso/leg interpolation are
unmeasured assumptions here. True pad-level leverage also involves vertical
force components and joint posture; a planar contact-height approximation
cannot establish that the lower player always wins.

## Physical parameter evidence

| Quantity | Verified source and result | What it permits here |
|---|---|---|
| Segment inertia | [de Leva (1996), adjustments to segment inertia parameters](https://doi.org/10.1016/0021-9290(95)00178-6); bibliographic identity verified | A source for a future segment-based inertia calculation. A whole-body `k = 0.3 * stature` remains an assumption, not a retrieved NFL measurement. |
| Grip strength | [Straub (1979), college and professional football grip strength](https://doi.org/10.1080/00140137908924693); title verified, numerical tables unavailable in the inspected material | Relevant follow-up source; no numerical grip limit is justified from its title alone. |
| Grip versus leg strength | [Otterson and DeBeliso (2020)](https://doi.org/10.31459/turkjkin.675067): 16 NCAA Division II players; handgrip and one-repetition back squat correlation `r = 0.09`, reported as nonsignificant | Do not treat squat/leg power as an empirically established handgrip predictor. Isometric hand squeeze also differs from an arm wrap, jersey grip or braced push. |
| Cleat/turf resistance | [Villwock et al. (2009)](https://doi.org/10.1177/0363546508328108): ten shoe models, five cleat patterns and four football surfaces; artificial surfaces had higher rotational torque and stiffness than the natural-grass surfaces | Surface and shoe matter. This rotational experiment does **not** identify a universal translational friction coefficient or validate `mu = 1.1`. |
| Recovery reactions | [Maki and McIlroy (2006)](https://doi.org/10.1093/ageing/afl078): rapid compensatory stepping/reaching can decelerate COM motion; lateral control is important | Finite stepping and reaching are justified. This aging review does not validate the engine's 40 ms filter, 120 ms stepping ramp, or athlete recovery speed. |
| Collision measurements | [Bradshaw et al. (2026)](https://doi.org/10.7717/peerj.20953): 11 rugby players tackling an instrumented dummy at 15–17 and 21–23 km/h; shoulder and head accelerations differed greatly | Contact site and measurement location matter. Head/shoulder accelerations are not whole-body accelerations and must not set sustained block force or grip capacity. No NFL padded-torso restitution value was established. |

Current turf traction, hand-force/grip mapping, recovery speeds, support-base
radius, filtering latency, pad geometry and pitch inertia therefore remain
explicit assumptions. Keep sensitivity sweeps and controlled scenarios for
them; a citation about a related measurement is not a parameter validation.

## AddBiomechanics: verified availability and limits

The [official download catalog](https://addbiomechanics.org/download_data.html)
currently advertises **AddBiomechanics Dataset 1.0**, the reviewed core release:
273 participants, over 24 million frames, 15 source datasets and nine activity
types. Its source table totals **71.47 motion hours and 57.55 hours with ground
reaction forces**. Thus motion frames must not all be treated as valid force
measurements. The catalog also distinguishes larger, less reviewed
user-generated releases, with a **May 15, 2024** snapshot offered with and
without arms.

The core-download redirect resolves to this
[public Drive folder](https://drive.google.com/drive/folders/1X3OEJXF5gzvjR5vRG7VO7h58bRwYTV0a?usp=sharing).
The catalog also advertises `http://archive.simtk.org/addbiomechanics/addbiomechanics.zip`
for the complete release. The redirect and documentation were read; archive
contents, byte sizes and checksums have **not** been verified. Use selected
subject files rather than fetching the entire archive as a first step.

The dataset paper is
[Werling et al., *AddBiomechanics Dataset: Capturing the Physics of Human Motion at Scale*, ECCV 2024](https://doi.org/10.1007/978-3-031-73223-2_27).
The processing method is
[Werling et al. (2023), PLOS ONE](https://doi.org/10.1371/journal.pone.0295152).
It fits scale, marker registration and motion to optical markers, then tunes
mass distribution and motion to ground forces. Joint torques and COM motion
are model-derived, rather than direct measurements of individual muscle or
hand-contact force.

The catalog reports mean marker RMS error **2.17 ± 2.44 cm**, normalized
linear residual **0.046 ± 0.027 body weights**, and angular residual
**0.11 ± 0.02 body-weight × height**. These are catalog aggregates, not a
guarantee that a selected trial meets an accuracy threshold. Record the
residual distribution of the actual selected frames.

### License and file formats

The [catalog](https://addbiomechanics.org/download_data.html),
[home page](https://addbiomechanics.org/) and
[terms](https://addbiomechanics.org/tos.html) explicitly identify shared
data as **CC BY 4.0**. The [FAQ citation section](https://addbiomechanics.org/faq.html#citation)
says each user-generated download includes `LICENSE.txt` listing uploaders
who must receive attribution, and asks for the dataset-paper citation. Retain
the actual selected files' license and source attribution; the software
repository is not the authority for the data license.

[Nimble's reader documentation](https://nimblephysics.org/docs/working-with-addbiomechanics-data.html)
describes per-subject **`.b3d`** files, lazy frame reads with
`nimble.biomechanics.SubjectOnDisk`, raw sensor inputs, scaled skeletons and
separate kinematics, filtering and dynamics processing passes. The GUI also
exports standard OpenSim files. Useful fields include measured raw force
plate force/torque/CoP, `missingGRFReason`, COM position/velocity/acceleration,
joint positions and torques, and per-frame residuals. Inspect processing
pass and units rather than assuming the final pass is raw measurement.

If learning force from motion later, use the kinematics pass as input; the
dynamics pass was optimized against forces and can leak the target. Inspect
missing-GRF flags and force-plate registration. The
[quality guidance](https://addbiomechanics.org/tips_and_tricks.html) requires
accurate CoP, artifact-free forces and synchronized marker/force times.

### Small useful subsets

These are proposed selections, **not downloaded or analyzed cohorts**.
The numbers identify the source studies or core-catalog inclusion, not a
claim that every corresponding original frame survives core processing.

| Source | Verified contents | First use |
|---|---|---|
| [Hamner and Delp (2013)](https://doi.org/10.1016/j.jbiomech.2012.11.024); [original project](https://simtk.org/home/nmbl_running) | Ten subjects running at 2, 3, 4 and 5 m/s; catalog includes ten subjects and 0.02 GRF hours | Start with two complete subjects and valid cycles across these speeds. Measure COM-height variation, foot support timing, impulses and running posture. These are submaximal running trials, not football sprint/cut/contact trials. |
| [Moore et al. (2015)](https://doi.org/10.7717/peerj.918) | Original study: 15 subjects, three walking speeds, 120 s unperturbed + 480 s longitudinal pseudo-random treadmill perturbation per trial; core includes 12 subjects, 6.03 GRF hours | Two unimpaired subjects, paired unperturbed/perturbed intervals. Measure foot-placement changes and COM/CoP recovery after known belt disturbances. This does not identify response to an unexpected lateral football hit. |
| [Santos and Duarte (2017)](https://doi.org/10.7717/peerj.3626); [original data DOI](https://doi.org/10.6084/m9.figshare.4525082) | 27 young and 22 older subjects; 60 s standing trials with manipulated vision/surface, dual force plates, 42 markers; core includes 49 subjects, 4.90 GRF hours | A few young-adult firm-surface trials to check quiet-stance COM/CoP scales. Avoid deriving athlete recovery-step speed from quiet stance or pooling older-adult trials into NFL balance parameters. |
| [Carter et al. (2023) data](https://doi.org/10.15125/BATH-01341) | 50 heterogeneous runners, walking and running at speeds/gradients; raw GRF 1000 Hz, marker capture 250 Hz; core includes 19.80 GRF hours | A small level-running cross-check at matched speeds. Running on one force-plate belt requires care with foot-force assignment. Raw markers can be obscured and IMU samples lost; use valid frames. |

For each selected file, pin its URL, byte size, checksum, dataset/source
version, license attribution, subject/trial IDs, mass/stature, processing
pass, time step, missing-GRF exclusions and residual thresholds. Keep raw
files outside Git; publish scripts plus small aggregate measurement tables.

Extract `hCOM / stature`, torso/hip posture, support-foot separation and CoP
extent; mass-normalized horizontal/vertical impulse; stance/flight timing;
and perturbation-aligned recovery foot placement. Convert SI lengths to
yards once at the simulation boundary, using `1 yd = 0.9144 m`.
An observed horizontal/vertical GRF ratio gives traction **demand**, not the
cleat's maximum coefficient. Body mass times COM acceleration should agree
with measured total external force within the selected data's residual.

The FAQ states that the inverse-dynamics pipeline currently applies external
loads only to foot bodies. Neither the verified core catalog nor these source
studies supplies paired football-body forces, jersey friction, sustained
grip limits, padded collision restitution, press jams or tackling recovery.
AddBiomechanics can improve the physical movement/support foundation; NFL
tracking and contact-specific experiments are still needed for football
transfer.

### Suggested source-catalog records

- `addbiomechanics-core-1.0`: catalog above; core paper DOI above; version
  `1.0`; CC BY 4.0; metadata reviewed only; proposed use `COM, inertia,
  support geometry, measured ground-force movement envelopes`.
- `addbiomechanics-moore2015`: core subset plus original paper DOI above;
  proposed use `longitudinal perturbation / recovery-foot placement`;
  subject files and licenses not yet pinned.
- `addbiomechanics-hamner2013`: core subset plus original running-project
  URL above; proposed use `running COM, support timing and impulses`;
  subject files and licenses not yet pinned.

These suggested IDs are provenance plans. They are not evidence that an
engine constant has been validated against downloaded data.
