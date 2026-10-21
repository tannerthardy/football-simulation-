# Reduced split-zone snap-momentum/contact witnesses

**Historical v1 evidence.** The fixture declared formation strength opposite
the staged TE's side, and its first-contact predicate omitted delivered
technique strikes. The counts below therefore describe the historical
hand/body channels only. They do not prove that no physical force acted.
Read the [corrected installation/accounting review](../../../../docs/reviews/strike-force-and-slice-validation.md)
and [v2 evidence](../strike-contact/README.md) before interpreting these trials.
The original offline film is preserved as
[historical HTML](../../../../viewer/motion-contact-historical.html) and
[ZIP](../../../../viewer/motion-contact-historical.zip); its old exporter hashes
refer to those exact bytes. The current `viewer/motion-contact` files show v2.

Source: `bf3da801c3f8ad3b9729d6e808665bb6f67f9e59c0dbdb0262316267307cf631`.
The exact diagnostic/tool/profile/input/initial-state pins are in `summary.json`,
the raw report, and `export-validation.json`. All selections were fixed before outcomes.

This is a narrow physical/controller stress witness, **not full presnap motion
validation or a complete split-zone play**. It analytically stages the TE already
moving at snap, then runs ordinary RunBlocker slice landmarks, RunDefender,
engagement controllers and the shared World for 2.5 seconds. No strength bonuses,
body velocity resets, forced blocks, scripted wins or football outcome fitting.
Twenty distant stationary bystanders preserve real indexing and lateral offensive
surface landmarks. They have consistent stationary observation history; the active
TE's prior 24 snapshots are analytically reconstructed constant-velocity positions.
TE/end execution errors and bystander defensive alignment scatter are explicitly
mirrored as geometric quantities, preserving generated magnitude and timing.

## Cohort and findings

72 primary reps: two roster seeds × two mirrored sides × three initial TE speeds
(0 / 2.5 / 4 yd/s) × two wide-end depths × 12 / 24 / 48 physics steps. Six separately
labelled 8 yd/s far-edge reach negatives are excluded from primary summaries.
These are exploratory geometry/speed inputs, not NFL distributions.

- Mirrors: maximum endpoint discrepancy `2.25e-14` yd.
- Refinement: maximum 12-vs-24/48 endpoint difference `0.0250` yd; no acquired/load
  or fall classification changes. The controls stay at 20 Hz for all resolutions.
- Momentum/work residuals: `1.76e-12` / `2.91e-12`; arm impulse excess only floating
  roundoff (`4.26e-14`), no arm/support work excess.
- All 14 fixed film recordings match unrecorded/uninstrumented physical histories,
  initial fixture context and RNG. Six focused tests pass.
- At 12 steps, all eight primary reps per speed acquire an engagement. Actual
  hand/body load appears in zero stationary, four 2.5 yd/s and eight 4 yd/s reps.
  This is a censored observation, not a real football success/miss rate.

The useful diagnosis is **acquisition is not a physically established block**.
For example `MC-S7-wideSurface-R-V0-P12` creates an engagement at 2.15 s and sheds
it for `run: leverage` in the same decision interval, before actual hand/body load.
The faster version initially does the same, then reaches real load later. This
is a controller/fit-angle follow-up, not evidence that a moving TE should always
win or a reason to add more force. The source preserves these real decisions.

## Retained files and film

- `raw.json.gz`: all 78 detailed trajectories, fixture states, forces, impulses,
  support/balance, accounting and decision cadence.
- `summary.json`: comparison and compact rows, source/input/profile pins and all
  observer checks. Positions are window endpoints, not credited rushing yards.
- `film.json.gz`: 14 predetermined raw full recordings (first roster, both mirrors,
  all primary speeds/depths at 12 steps, plus both reach negatives).
- `export-validation.json`, `film-integrity.json`, `browser-check.json`: read-only
  export pins, exact full telemetry/events and offline browser verification.
- Viewer: `viewer/motion-contact.html` or unzip `viewer/motion-contact.zip` and
  open its HTML. Its camera follows the two active bodies; all 22 raw actors stay
  available to inspection. It hides nonexistent down/clock/gain/outcome, calls
  the finish an inspection window, and disables football success filters.

The hand normal/tangent impulses are the actual step-mean joint forces × 0.05 s.
Body contacts expose summed normal impulse and closing at touch; body tangent
impulse is unavailable. Endpoint relative speeds are separately labelled, not
presented as exact strike-time speeds. Initial moving-TE kinetic energy is counted
as `0.5 × generated mass × speed²`, not treated as free force. Work accounting is
the reduced planar World with yaw; it does not include anatomical 3D energy.

## Reproduce at the recorded source

```sh
node --import tsx scripts/diag/motion-contact-review.ts out/motion-contact-review
node --import tsx scripts/export-motion-contact.ts out/motion-contact-review/film.json.gz viewer/motion-contact.html
node node_modules/vitest/vitest.mjs run test/motion-contact.test.ts --maxWorkers=1 --minWorkers=1
```

The exporter reads saved recordings only. Current versions can export this
historical film without rerunning the simulation. Existing positional replay
packing rounds to 0.1 yd/radians; full telemetry remains lossless, and its exact
values are available in raw data. Every clip, layer and both participant inspectors
were checked offline, including mobile overflow and specific play-ID search.

Next escalation: a true legal presnap path, motion cues/coverage exchanges, and
TE/OT/RB traffic/full mesh under ordinary controllers. Those need football support
that this reduced probe deliberately does not claim to implement.
