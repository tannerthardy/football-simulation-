# Movement wobble: a real turning-motor defect, plus unresolved request jitter

2026-10-19 UTC. Independent proposal, **Physics review required before
integration**. Accepted develop `f4146275ce7539816bf57b4ed55a0d2be10e48c7`,
canonical queue `9a6bb795179a4b2e61ed59d25bcf23ca5e40f423`.
Claude research inspected through `f0ed18e86679a9250fc661d5095a45dd4799dff0`;
no research runtime, #158/#159/#160 or new flag is imported.

Code `4df4fe406dbbf0edea42ab0a6ed16aeaf45c08f1` changes only the ordinary
World yaw target/motor and `stepBody`'s corresponding forecast motor. Eight
new correctness checks accompany it. Contact geometry, hands, capacities,
speed/braking, reaction, acquisition, assignments, spacing and controller
selection algorithms are unchanged. These statements do not mean their
achieved behavior is unchanged after bodies move differently.

## Decision and causal finding

Question: does movement wobble originate in requests, achieved turning, or both?
A no-contact, zero-randomness World with a **constant90° facing request**
overshoots by **22.5°**, rocks back below the target, then overshoots again.
A small0.2rad target rings too. This cannot be caused by a changed football
read, opponent, aim noise, spacing or rendering. Ordinary native bodies repeat
this pattern while their requested facing changes smoothly: see Toss13 QB
carry-out0.7–1.5s in the plot. The carry-out destination policy remains separate
from Claude's QB_CARRYOUT experiment.

The center motor aims for `angleError / remainingTickTime` without budgeting
its incoming spin at arrival. It therefore brakes too late and countersteers
at the next tick. The repository already contains `turnBodyResponse`, a bounded
critical response using the existing0.05s response time, turn rate, inertia,
traction and shared translational/yaw allowance. The candidate uses it for
ordinary bodies and corresponding `stepBody` forecasts. World-based previews
inherit it without adding observations or randomness.

**The motor must receive the actual requested angle.** Replacing the motor
while retaining the rate-clipped intermediate stopping angle was rejected:
it artificially slowed an otherwise attainable turn. The old clipped pose
remains only the unchanged gait estimate. Experimental patch-mode planning
is untouched. External spin is not projected away; finite opposing torque
still removes it. Purposeful new turns take effect immediately, with finite
physical execution rather than a persistence timer.

## NFL reference and measurement

The existing restored BDB2025/2022 host is readable at
`/workspace/football-yac-angle/data/raw/bdb2025/big-data-bowl-data`.
Actual players/plays/player_play/week1 hashes equal restoration receipt
`747bb24b:data/reviews/current/bdb2025-existing-restoration.json`
(SHA256`d8e3cdc7…`). No archive download/extraction or new data pipeline.

Reuse the accepted adapter's metadata. Select the **first12 designed runs and
8 dropbacks in week1 file order**, before looking at outcomes; these happen to
come from the same game. Use at most the first6 live seconds, stable actual
NFL IDs and valid raw samples, never carried-forward positions. The first
bounded query collected positions; a second pass added provider orientation
to those same IDs because the motor finding made that channel consequential.
Each took about3s; no full-week trajectory conversion or season scan.

One operator samples native positions at10Hz and rounds both sources to.01yd.
This differs intentionally from old common metrics' .1yd quantization.
Compute travel heading from adjacent displacements; provider orientation and
native body facing are a **separate channel**, never gaze. Reversal amplitude
is the smaller absolute angle in adjacent opposite-sign turns; a sustained
one-direction football cut is not automatically jitter. Speed pulse is the
absolute second difference of displacement speeds. Admit all three speeds
>=2yd/s; retain a0.5yd/s sensitivity separately. Split>1.5yd clear of **all**
players, near teammate, near opponent and unavailable geometry. NFL proximity
is not native contact/engagement, and provider estimates are not noiseless
physical ground truth.

Six selected native inputs, unchanged bodies/calls/seeds, reuse existing
accepted baselines. Compare1,399 same-player/time windows where **both** arms
are clear of every player and satisfy the speed gate; never pad a finished
play. Windows are correlated observations, not independent statistical trials.
NFL's6,277 clear samples are a phase/role reference, not a matched population.

| Mean per admitted sample | Accepted, paired | Candidate, paired | NFL reference |
| --- | ---: | ---: | ---: |
| Alternating body-facing correction |1.043°|0.120°|0.263°|
| Absolute body-facing turn |7.928°|4.973°|4.168°|
| Alternating travel-heading correction |0.232°|0.239°|0.133°|
| Speed pulse |0.124yd/s|0.126yd/s|0.129yd/s|

Thus the fix removes about**88.5%** of alternating body-facing correction in
these matched samples. **It does not fix path jitter or speed pulsing.**
The original quoted claim of much higher speed pulsing is not reproduced by
this operator/cohort; its original source/operator remains needed. Lower
candidate body wobble than this NFL reference is not a new number to tune to.
Both run/dropback strata and the lower-speed sensitivity retain the large
body-facing reduction, with limited role/exposure counts visible in JSON.

## Native controls and adverse evidence

| Frozen input | Accepted gain | Candidate gain | Interpretation |
| --- | ---: | ---: | --- |
| TOSS13 |3.84|2.10|First physical runner contact2.55→4.35s; finish4.20→5.00s. Lower gain does not erase that delay. |
| Fresh TOSS13 |9.15|4.04|Different first tackler and finish, not a matched-grip experiment. |
| four_verts13 |22.74|16.13|Same Y catches, throw/catch+.05s; both finish by tackle. This is a completion control, not an interception. |
| PA11 |live at6s|live at6s|Same RB catch4.90s; neither prefix is a completed outcome. |
| OZ24 |0.37|−1.74|Different run/contact traffic; adverse offensive loss retained. |
| COUNTER2 |1.95|0.27|Different ending retained; neither gain is a realism acceptance threshold. |

The first Toss body-facing divergence is X at0.05s with identical commands;
the first>.01yd/s velocity divergence is LB_W at0.45s, after reads/requests
begin differing. First>.01yd position difference is LG at0.85s. The later RB
slowing is **not a direct speed-cap change**: by1.90s its raw request changes
to an almost lateral cut, then spacing alternates gathering/resuming from
2.15s. Saved requests and achieved velocities preserve this chain. No claim
that the changed native endings isolate a grip, balance or defensive decision
improvement. Near-opponent heading-reversal mean actually increases
0.394→0.494°; only body-facing ringing is demonstrated repaired.

## Request jitter is a separate controller question

Claude's relayed diagnosis is compatible with the remaining path wobble.
`requestToCover` is used for different objectives: an offensive zone first
contact deadline(.15–.6s plus track-tempo floor), a free moving fit(two reads),
and a loaded defensive shoulder(two reads), plus off-default fight/CF arms.
For tau1.3s/horizon.4s its coefficients are approximately18*distance−6*velocity.
The algebra is exact for its assumed first-order velocity response; actual
braking, lateral movement and loaded motion do not always follow that model.

A saved accepted Toss LG/DT_W witness keeps the same aim at0.70→0.75s while
lateral requests change−0.894→+1.799yd/s. Own starting velocity changes
−0.091→−0.531 and next achieved velocity is−0.206, **still flowing negative**.
At0.80→0.85s, a second held aim yields−1.981→+2.437 while starting velocity
changes−0.206→−0.913. Some opposing request is legitimate countersteering;
NFL tracking cannot tell us what velocity a player requested.

[Shared usage map and witness sent to Claude/Run](https://github.com/tannerthardy/football-simulation-/pull/153#issuecomment-6278664728).
Do not replace every caller with one softer gain merely to smooth its signal.
Oppose any correction with achieved shoulder error/flow, interposition through
runner arrival, attainable contact and a genuine changed-direction control.
Claude owns that next alternative; no competing motion-plan/contact/run-fit
variant is introduced here.

## Focused validation, exact sources and next decision

**73 TypeScript checks and typecheck pass** on final runtime
`51351a24096a139cecd658b527c54f73d391dfa14dacd20c8772bfc770383648`:
constant turns/mirrors, responsive reversal, retained external spin, unchanged
rest, existing critical-response algebra/subdivision/limits, arm/traction/work
accounting, movement-preview purity and QB forecast/spacing consumers.
Seven pure measurement checks pass: purposeful curve, straight motion, wrap,
missingness, speed gate, teammate/opponent identity and censored pairing.
No assertion was removed or weakened.

Six new native prefixes cost5.61s collection including recording/output;
five complete, one censored. Six accepted baselines reused, zero games,
full-suite repeats, roster sweeps or new NFL archive acquisition. The candidate
native tapes use runtime`365e4a9d…`. Its sole difference from final`51351a24…`
is a redundant conditional whose two branches call the exact same response
with the same arguments; the extraction and full source hashes are verified.
Reuse is explicit rather than relabeling those tapes as final-source runs.
Final focused command2.12s/typecheck10.32s; earlier focused/typecheck costs,
failures, rejected intermediate-target arm and original receipts stay visible.
Recording cost is not a World performance-equivalence benchmark.

Physics must review the motor/control interpretation and shared peak-yaw
traction/recovery allocation before promotion. Integration then owns combined
verification. This independently useful body-turning correction is not
permission to adopt patch contact, modify capacities or merge a research
branch. Controller/request jitter remains open with a concrete saved witness.

Evidence: [Immutable inputs, traces, patches, sources, failures, NFL receipt and plot](https://github.com/tannerthardy/football-simulation-/tree/ed6ebd21911a28f07a085094c393ea2613abeb69/data/reviews/movement-continuity).
