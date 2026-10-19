# Tracking continuity: real defect, two held repairs

**Disposition: HOLD. Neither repair is ready for integration.** The first
removes the four-yard steering jump but weakens an ordinary seam carry. The
second preserves the distant objective but introduces another near-range jump
against a legitimate approaching receiver. Stop variants; preserve these
opposing examples for a coherent moving-objective review.

Accepted develop is `f4146275ce7539816bf57b4ed55a0d2be10e48c7`, runtime
`7d23555ad67094fbe2e79726d9b761dd5f068c06fb90ff0796ec61c953750197`.
First code/test pin `9da3b499d8af97d5f3a6c90146a119ef0965e999` is independent
of #162, with runtime
`4e78e876ee1cd7af00be1b5fe79a3968d5d2fb2b63f95dba21fa9e02a3eb8ca3`.
Only `behaviors/common.ts:track` changes. This branch retains that first held
arm; the second source and failed contract are preserved as diagnostic patches,
not imported runtime. No speed, braking, contact, information, capacity,
assignment, run-fit, reach or helper policy changes.

## Defect and saved witnesses

An unchanged moving objective closes along positional error at `d <= 4`, but
at `d > 4` rotates that closure toward
`error + observedVelocity * min(1.2,d/vmax)`. This creates a finite bearing jump
for infinitesimal distance changes, independently of `requestToCover`, new
observations, execution randomness, contact or the turning motor.

Using the saved OZ24 FS profile, an unchanged target moving laterally at
3 yd/s and distances `4 +/- 1e-8` produces a **2.107 yd/s / 19.89 degree** request
jump. Stationary and collinear opposing controls remain continuous. Saved
OZ24 FS crosses 4.0075 to 3.8943 yd at 1.45 to 1.50 s: its held alley point is
unchanged, acquired lateral velocity changes only .160 yd/s, and its request
changes 2.153 yd/s. Toss FS repeats a held-point crossing with a 1.405 yd/s
request change. Counter SS has a smaller .438 yd/s crossing. These are
mechanism witnesses, not independent population trials or a diagnosis of all
visible wobble.

On the **same** OZ24 body and acquired picture, forcing the old two regimes
changes request by 1.932 yd/s / 18.22 degrees. The first .05 s in an unloaded
World agrees because support/traction limit the requests; at .4 s, achieved
position differs .309 yd and velocity about 1.26 yd/s. That is held-command
movement evidence, not a simulated football ending. These saved/pure probes
use #162 runtime `51351a24...`; the continuity contract fails directly on
accepted develop too, so this controller defect does not depend on that motor.
NFL tracking cannot establish requested velocity. Its existing movement
reference motivates this question without proving this native cause; no new
NFL query or download is required for this mathematical discontinuity.

## First repair: smooth requests, adverse seam geometry

`lead=min(1.2,max(0,d-4)/vmax)` joins direct near station-keeping by leading only
the approach outside the existing four-yard region. It keeps supplied target
velocity, modifiers, objective metadata, the maximum and braking envelope;
there is no timer, stored direction, extra observation or draw. It also delays
established diagonal leading between four and roughly fifteen yards. That
cost is consequential.

Parent ran exactly two matched 3.2 s native prefixes, OZ24 and four_verts13.
Inputs equal their accepted saved setups byte-for-byte; every paired
World-boundary RNG state agrees. Launch cost 1.726 s, including recording;
collector rows total .988 s. All 44 settings are in
`out/track-continuity/native-launch.json`: components1, CF_FLOW unset,
World center defaults, Node22.23.3. Source is the exact first candidate4e78.
The two candidate prefixes are **live at3.2 s**: neither establishes a finished
run, completion, tackle or YAC result.

- **OZ24:** first divergence is FS request at .40 s, same incoming body and
  acquired cue, then .0192 yd/s achieved velocity change in that step. Its
  duty remains the installed eight-yard alley cap. At1.30–1.65 s, maximum
  request step falls 2.153→.700 yd/s and maximum heading step20.33→6.58 degrees.
  This includes legitimate cue updates, so reduced steps alone are not proof.
  At1.50 s he is .30 yd closer to cap depth but .37 yd less wide; at1.90 s the
  planned cap/observed-runner handover still occurs. No FS contact or
  engagement occurs in either prefix. The runner is unchanged; its first
  physical LB_S collision at3.15 s remains in both arms. This cannot establish
  a grip correction.
- **four_verts13 adverse:** first divergence is LB_W at .35 s, same own body,
  consumed cue sequence and duty; request changes .0333 yd/s, with no
  execution draw difference. At2.00 s LB_W is .623 yd shallower versus the
  same H seam and separation rises2.949→3.449 yd. At2.50 s separation rises
  3.710→4.432 yd; the FS roof is also .195 yd shallower and .426 yd farther
  across, increasing H separation6.598→6.862 yd. LB_W/FS/SS have no physical
  contact or engagement in either prefix, so this is approach geometry rather
  than failed contact execution. Both outside corners' bodies and commands
  remain identical, all offensive bodies remain identical, and the same QB
  throws to Y at2.80 s. LB_S's actual receiver body contact at1.80 s remains
  identical; it is separate from these free seam approaches. No candidate
  catch or completed outcome is observed before the3.2 s cutoff.

This is enough to **hold the global extraction**, without a touchdown reversal
or a larger campaign. A continuous signal is insufficient when preserving a
legitimate vertical threat requires the distant objective that the repair cut.

## Second repair: rejected by a cheap approaching-receiver control

To preserve every distant bearing, the diagnostic second arm retains the old
lead outside four yards and joins it from inside:
`lead=min(1.2,d/vmax)*min(1,d/4)`. Accepted scalar near/far closure laws remain
literal, as do target feed-forward and the final speed cap. Runtime is
`5d25bd245d0cfaf46738bda6c36f7207d160188bdcdf872ebf671f06d3008a07`;
source and opposing-contract patches are preserved in the diagnostic bundle.

Eight initial continuity/ordinary controls pass. A necessary near control
then **fails**, so no native experiment is run: own maximum9 yd/s, controlled
speed fraction.65, target2.6 yd ahead approaching at9 yd/s. The lead point
passes through the defender's own COM at2.6 yd. Across `2.6 +/- .001`, request
jumps **1.564 yd/s**; accepted near tracking remains continuous. Across
`2.6 +/- 1e-8`, accepted request changes only1.6e-8 yd/s while this proposal
jumps about1.565 yd/s. Both use the same legitimate supplied picture; neither
contact nor hidden state is involved. Normalizing a future lead bearing can
therefore reintroduce the defect inside a plausible receiver approach.

A separate accepted scalar corner also remains: low gain1.6/high brake9 gives
near closure6.4 versus far6.77 yd/s at four yards. This bearing-only diagnosis
does not claim universal velocity continuity or quietly retune those gains.

## Evidence and smallest next decision

First-arm evidence: four original continuity failures/four opposing passes;
first draft omitted a far correction cap and failed that opposing control;
cap restored; **39 focused checks and typecheck pass** on4e78. Preserve all
original failures. Second arm: **8 pass /1 failed opposing contract**, plus a
pure accepted-versus-proposal reproduction; no all-pass claim or second-arm
native run. The branch's retained code/test are first-arm9da3, not the failed
second arm. No additional games, roster sweeps, NFL acquisition or full-suite
repeat.

`out/track-continuity/analysis.json` records exact native source/input/file
hashes, first divergence, per-player contacts and geometry. Its unchanged
operator is `analyze.py`. The parent's
`out/movement-continuity/preview-audit/` holds the original pure probe, saved
incidence and copied receipts. Second source/contract patches, the failed
launch, and a restored accepted-source control are in
`out/continuous-track/rejected-near-join-*` and `near-singularity*` for the
parent's immutable evidence publication.

The smallest next action is **objective design review**, using the existing
lateral crossing, far seam and fast approaching-receiver pictures together.
The controller needs a well-defined relative approach as the future lead
passes through the body, while retaining useful far anticipation and braking.
Do not add a third local blend, persistence timer, capacity change or tune
against final YAC. Contact/physics corrections can proceed independently.
