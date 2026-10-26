> Publication note: this is the frozen Phase II research report. Source pins, local paths, commands and numerical results describe the retained evidence package. See the [publication index](README.md) for remote evidence access and the next-work plan.

# Tracking and installed jobs: comparable questions, separate evidence

The historical position operator and the installed-job ledger answer different questions. Their denominators, target identities, “release,” and “contact” are different. Neither measures a universal blocking-success rate, and the historical NFL percentage is not a target for the 53-job ledger.

| Retained historical sim evidence | Population and event |
|---|---|
| 17 selected geometric combo episodes; 15 proximity contacts before its carrier-depth criterion | OL selected after reaching +2 yards before the carrier; linebacker selected by closest approach after inferred release; contact means distance ≤1.5 yards |
| 53 initial installed jobs; 14 member-load endpoints by first actual-carrier-contact timestamp | Initial native job identity, including two direct jobs; physical member→installed-target hand resultant >1 native force unit; actual-carrier event roles and event timestamps |

The first row comes from 37 snap-valid historical baseline zone plays and remains exactly reproducible from retained common exports. It does not describe current Phase II develop. The second row has been reproduced separately on both historical and current sources. Later legitimate or questionable retargeting can change responsibility; 53 initial identities are not 53 permanent duties. The 17 episodes are not a subset of 53 jobs with an equivalent success definition.

## Available provenance and raw-data limit

The historical NFL claim is reported in [PR #294](https://github.com/tannerthardy/football-simulation-/pull/294) and retained Phase I `baseline-history.md` / `EXPERIMENT_LEDGER.md`: BDB 2025 competition tracking of the 2022 season, weeks 1–2; reported 1,394 runs, 693 zone runs and 997 classified combo episodes. Reported medians include release 2.1 seconds and backer distance 2.45 yards; the reported proximity share was 58%. **Those NFL-side observations were not independently rerun in either research phase.** No new NFL rate is asserted here.

This phase searched the whole current workspace, including hidden/ignored files and locations outside the Phase I package, for tracking CSV/parquet/archives, week files, players/plays/player-play tables and converted `nfl-plays` exports. Expected `data/raw` paths in the original, historical and current checkouts are absent. Available NFL JSON and compressed benchmark files are aggregate references, not the required per-frame trajectories. The two attached files are assignment text. No raw NFL tracking or converted NFL common-play export was found. `methods/raw-availability-check.json` records the search scope and results. This is a statement about the inspected workspace, not about remote availability; no large data was reacquired.

The retained all-nine-week `data/reviews/mechanics/nfl-bdb2022.json` names archive SHA-256 `743794b44b5ef49da7cb7d3f488a9418ac16c5ef269199a4044eecb8258550d3` and aggregate-only provenance. It is a different cohort from the two-week claim and cannot replace its missing raw input or establish a raw-file hash for the historical climb output.

## What the legacy common operator actually does

Unmodified copies of `climb_reference.py`, `metrics.py`, `nfl_bdb2025.py` and `sim-export.ts` are in `methods/`; they are byte-identical between historical and current accepted checkouts. `methods/provenance.json` records source paths, sizes and hashes. Running the copied operator on the retained 37-play sim-only fixture exactly reproduces the Phase I output, including 17 combo / one uncovered episodes and 15/17 geometric contacts. This is postprocessing only; no football simulation or NFL analysis was rerun.

Important source details:

- Only zone-family runs with a carrier and handoff qualify. Only OL who reach +2 yards before the carrier are retained. A never-climbing OL cannot fail this operator because it never enters its denominator.
- “First level” is implemented as defender snap x ≤1.5 yards; it is not an absolute-distance band. Box backers require LB group, snap depth 2.5–8 yards and lateral distance ≤6 yards from the ball.
- “Combo” means at least .2 seconds of sampled proximity to **any** first-level defender before the OL reaches +2. The samples need not be consecutive or involve one fixed defender. “Release” is the last such sample, not a native release decision or loss of physical load.
- Backer identity minimizes future distance during the two seconds after inferred release. Contact is then the first ≤1.5-yard proximity sample after release; carrier “arrival” is x ≥ that moving backer's x−1, regardless of lateral distance. Contact with no observed carrier arrival is counted as “before” in the legacy share. Censoring is therefore material.
- The NFL adapter emits .1-second frames, .01-yard coordinates, and forward-fills missing player frames without an exported validity mask. The sim adapter resamples replay positions to .1 seconds and emits .01-yard decimals, but replay positions were already quantized to .1 yard. Crucially, `climb_reference.Play` reads these arrays directly: it imports constants from `metrics.py` but **does not use `metrics.Play`'s shared one-decimal quantization**. Identical classifier code does not eliminate this input-resolution asymmetry.

Thus even the legacy common operator needs selection, resolution, missingness and censoring qualification before an NFL/sim comparison. Engine `blocks` and NFL charted blocker IDs are not used by this operator and must not silently become assignment truth.

## Recommended common positional protocol

The following is a concrete specification for a new versioned offline operator, not an implemented or validated new rate. It can consume the existing common format after adapters add stable IDs and frame-validity metadata. Keep the legacy operator unchanged for historical reproduction.

1. **Freeze eligibility and identities before inspecting outcomes.** Predeclare seasons/weeks, live-snap and play-type exclusions, and concept mapping. At snap, retain every offensive OL and every LB satisfying the same declared box window. Create all eligible OL×box-LB pairs, with stable player IDs and deterministic ordering. This measures positional pair access; it makes no claim that a pair is an assignment. If a smaller population is needed, predeclare snap-nearest-LB per OL with stable-ID tie breaking and report it as a separate variant. Never choose a target from future closest approach or exclude a blocker because it failed to reach +2.
2. **Normalize observable inputs identically.** Snap is t=0; x is attack direction relative to snap LOS; y is reflected consistently. Use a .1-second grid and round both sources to .1 yard with one explicitly specified tie rule. Preserve observed/missing/interpolated flags. Do not treat forward-filled NFL gaps as observations. Use the same interpolation policy and exclude or censor intervals with missing endpoints rather than silently imputing successful contact. Compute speeds by the same ±.2-second positional difference, recording truncated endpoint windows.
3. **Keep the whole fixed pair ledger.** Over a predeclared horizon, for example snap through min(4 seconds, observed play end), record minimum separation, first ≤1.5-yard proximity, first sustained proximity of three consecutive .1-second samples (a .2-second span), and each OL's first +2-yard crossing. Retain “not reached,” missing, early-ended and horizon-censored rows separately. Report distance thresholds 1.0/1.5/2.0 yards as predeclared sensitivity, not a search for a preferred rate. These are proximity events, not hands, load, a successful climb, or useful restraint.
4. **Use identical positional timing for the common comparison.** Record carrier-depth crossing only where an actual possession/recipient identity is available on both sides, with unknown/QB-keep strata separate. Label it “depth crossing,” not arrival or first contact. Bracket a crossing between its preceding and first qualifying sample; do not claim sub-frame ordering. Two event intervals that overlap are tied/ambiguous. No observed crossing is censored, not infinite arrival that converts every contact into success. Preserve simultaneous defenders and multiple pairs.
5. **Retain native truth as a separate audit.** Native release events, signed hand loads, actual-carrier-contact events and target changes explain the sim operator's errors; they do not enter the shared position-only numerator. Native event time is tick time, native load is an endpoint sample, and positional time is a .1-second observation interval. Compare those clocks with explicit interval bounds; do not round them into apparent exact ordering. A geometric radius cannot identify an intended duty, continued keeper security, legality, or useful restriction.

At .1-yard rounding, a single coordinate has up to .05-yard rounding error, and pair distance can move by about .142 yards from quantization alone. NFL localization error is additional and not estimated here. Mark threshold-adjacent rows accordingly, preserve .1-second time brackets, and report missing/censored counts alongside denominators. Statistical uncertainty, if later estimated, should cluster by play/game rather than treating OL×LB pairs as independent trials. Separate strata for concept, formation/front geometry, box depth and runner path before interpreting cohort differences. None of these procedures recovers uncharted coach assignments.

Reproduce only the retained historical sim check:

```bash
python -I /workspace/run-game-phase2/methods/climb_reference.py \
  /workspace/run-game-phase2/methods/historical37.common.jsonl.gz
```

Its retained output is `methods/historical37-operator-rerun.json`. A new fixed-identity comparison requires both source cohorts and the new operator version; until the NFL trajectories are available, that comparison remains unmeasured. The methodological gap is specified without inventing an NFL success rate or a new blocking mechanism.
