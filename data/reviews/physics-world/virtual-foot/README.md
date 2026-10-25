# Experimental support evidence

Read [the engineering handoff](../../../../docs/reviews/virtual-foot-coupling-and-biomechanics.md)
for interpretation, reproduction and next work. Physics remains **NOT READY**.
Production support stays `legacy`; source identity alone does not select the
experiment. The model/preload must be recorded with each run.

- `hand-experimental.json`: final-source nine hand fixtures, six resolutions
  and ordinary frontal tackle guards. Compare with the preceding committed
  `constraint-support/hand-after.json` baseline.
- `wrap-summary.json`: baseline, full candidate and a model switch at the
  first incoming grasp. The switched probe retains exact legacy first-wrap
  snapshots and separates support coupling from pre-wrap path changes.
- `recovery-summary.json`: 54 stationary-start, zero-locomotion trials with
  force/work/duplicate checks. COMs are not clamped. The direct-state repeated
  recovery case is explicitly synthetic and reveals missing support transfer.
- `validation-summary.json`: shared capabilities, scenario outcomes, four
  tracking games and eight generated-roster games; physical regressions and
  large support drift are retained. Sampled offsets are lower bounds on peaks.
- `geometry-motor-initial.json`: additional read-only geometry/work audit of
  the early frozen candidate. It is separately source-pinned, preceding the
  explicit model-isolation repair.
- `manifest.json`: source versions, exact commands, input/output hashes and
  limits. Raw long traces stay ignored under `out/`; no NFL magnitudes were
  fitted and no global physics resolution was increased.

The new force coupling removes the reproduced numerical fall disagreement and
preserves ordinary tackling. It also worsens unheld press/jam convergence and
permits a corrective coordinate to drift 7.27 yd from its body. That coordinate
cannot represent a reachable planted foot. Keep it default-off; build finite
planting/load transfer and continuous grip attachment before promotion.

The [small AddBiomechanics subset](../../biomechanics-support/README.md)
provides measured loading and marker observations, with explicit alignment and
model-derived quantity limits. It does not validate NFL grips, cleat traction
or padded impact forces.
