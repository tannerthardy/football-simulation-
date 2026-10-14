# Under-center singleback zone: the first reference plays

The main development reference is now the existing **`ace_12`**: under center,
one running back, two attached tight ends and no fullback. This follows the
user's formation priority; it is not an estimate of NFL formation frequencies.
Start with this simple surface before adding under-center wing/off-ball looks.
The I-formation G73-I48 remains a secondary control. Shotgun is outside this
bounded task. No new formation, roster or physical capability is introduced.

Comparison remains **`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`**. All experiments
are off in the reference; component-only PR #9 is a separate matched arm.
The final branch changes diagnostics/docs only, with runtime byte-identical to
PR #4 (`09c65f70ff3835dba17fb08487582d65f49eaea827f4e6e48f396f93210b773c`).

## What the three plays establish

| Ordinary 12-personnel look | Collection and first-level protection | Runner ending |
| --- | --- | --- |
| Rightward WZ, Y playside | Y leaves the end to RT at 2.00 s and loads LB_S at 2.50; C collects LB_M at 2.75. RT retains end load through arrival. | Crosses LOS at 3.60; first contact is the intentionally free SS at 3.65. Ends at 4.30, +1.496 yd. Clean arrival. |
| Same rightward call, H playside after skill-side flip | H leaves at 1.75 and loads LB_S at 2.00. RT still has loaded end hands, but DE_S reaches the runner. | First contact at 2.65 before LOS; ends at 3.25, −.206 yd without crossing. Collection succeeds while first-level protection fails. |
| Explicit weak-side WZ, running left with H playside | H leaves DE_W to LT at 1.25; neither H nor RT collects its assigned backer before first contact. LG collects LB_M at 1.75. LT retains end load until after the end's runner contact. | DE_W grips at 2.30 before LOS crossing at 2.60. Ends at 3.40, +2.372 yd; the positive gain does not establish a protected approach. |

All three default complete state/RNG histories are **exact to a direct actual
`4ded6b6` checkout**. Nine new observed/plain pairs cover three actual-pin,
three disabled-current and three isolated-component executions. Every pair is
neutral and reaches an actual tackle ending. The saved `ace_11` completed
controls are reused without another run. This is a small declared mechanism
panel, not an estimate of run-game success rates.

The front accounts for four DL and three linebackers using the seven inline
blockers; the two receivers handle corners and the safeties remain free. There
is no missing-fullback assumption in these installations. Nominal assignment
still does not establish collection or path protection.

The original input's `mirror` suffix was corrected after inspecting actual
geometry. In balanced `ace_12`, flipping the formation swaps the tight ends and
other skill sides, but the field-side strength tie-break still calls the run
right. It is a **placement contrast**, not a directional mirror or a causal
rating-only experiment. The added weak call runs left against the same
asymmetric Over front; it is not a complete geometric mirror either. Both
interpretations and the original measurement revision remain recorded in the
[initial manifest](under-center-zone-inputs.json) and
[explicit direction control](under-center-zone-direction-inputs.json).

## What is still unresolved

The failing rightward keeper's own acquired picture selects **runoff**: at
release he estimates .634 yd needed versus .139 yd available for the outside
fit over the selected horizon. That is a capability-limited decision, not a
commanded instant hook. The successful rightward keeper also chooses runoff,
so runoff alone is not the error. Preserve useful runoff and examine how the
developing surface and the runner's press/bang/bend response fit together.
Earlier departure, stronger hands or a forced slower runner would not answer
that question.

The [consumed native trace](under-center-zone-native-trace.json) retains the
failing keeper, helper, backer, end and runner from 1.45 through 2.65 s, including
their actual held cues, foot requests, delivered intents, forces and support.
Exact duplicate consumed observations carry repeat counts. The engagement's
`movement.command` is the contact controller's foot request; a blocker's
behavior-level stand command is not its delivered engagement movement.

A **13 KB two-body RT/DE_S witness at 2.40 s** establishes a genuine shared-law
blocker. [Portable input](under-center-zone-keeper-world-witness.json) reproduces
the native reduced step within `8.44e-15` in pose/velocity/spin. Its independent
free-motion pair has zero ground impulse/yaw, no torso contact and no strike,
but angular momentum changes **+15.153603** with the hand motor off; explicitly
removing drive yields the same defect. This is the already-known passive
center-hand problem on an ordinary no-fullback run. It is **not proved to cause
the football endpoint**, and does not certify this defensive win as physically
correct. Force/work limits alone cannot do that.

No specific controller error has been demonstrated on this panel. Contact-law
dependent release refinement stays paused. The sole solver owner should replay
this same interval after the reviewed law candidate, retaining the successful
Y/RT collection control and the failed H/RT arrival. Once execution is coherent,
the next football question is keeper runoff versus runner response using actual
acquired information; preserve legitimate defensive wins and free safeties.

The [withdrawn early-release trial](combination-collection.md) remains archived
at `4074038c4cd966e1c213e204ca47d528e7260968`; its unsafe WZ-23 first-level control
is retained. The parked `RUN_CONTACT_TRACK=1` neighboring-pair collision is a
separate witness. No new release, hand policy, shared movement, capacity, roster,
solver or default changes are made here.

## Component-only transfer and handoff

PR #9 remains frozen at **`7a04ad6c65d9268bb332147411baacc27ebe20e0`**, source
`0ba6cfb6fe924d9d7edc5d04316218cadeb14ef5f604003e2549187f7d0e1678`.
Only `RUN_CONTACT_COMPONENTS=1` is enabled. Handover, active hands, collection
and contact tracking remain separate.

On these three new preferred-formation inputs it retains the same first-contact
opponents/times, LOS-crossing boundaries, ending times and approach categories.
It preserves the successful arrival and does not repair either failed keeper.
Completed gain changes are −.000939, exactly zero and −.003821 yd. These small
adverse changes remain visible; unchanged endings do not establish broad
improvement. Off-ball paths do change: the largest displacement is 2.496 yd in
the weak call's backside RG at the 3.40-s ending. His DT_S pair stays loaded in
both arms through the ending and is remote from the runner's earlier first
contact. Do not describe all histories or all blocker paths as unchanged.

The audit/integration owner can reuse this exact-candidate extension alongside
PR #9's original 32 focused assertions/typecheck and 60/eight-ending evidence.
It is additional focused evidence, not a new full-suite verification or baseline.
All new native arm/work/support-work limits pass to floating-point tolerance;
the independent angular-law defect remains a failure.

## Reproduction and cost

Use Node 22.23.3. Both manifests declare calls, seeds, personnel, formation,
front and a 25-second cap. The collector uses the existing .55 generated-roster
strength and LOS 40; the launcher resets all 45 current flags. Reference
settings are `config/baseline.json`, including components and handover `0`.
The [receipt](under-center-zone-receipt.json) retains every exact starting commit,
source/validation/collector fingerprint, resolved flags, installed responsibilities,
loads, body/profile/history digests, adverse changes and completed endings.

Collect the initial two calls; repeat with the direction-control manifest and
`weak.json.gz` destination. Unset diagnostic interventions:

```sh
env -u HAND_REMOVE -u HAND_KEEP \
  FLOW_INPUTS=docs/reviews/under-center-zone-inputs.json \
  FLOW_STOP=25 FLOW_TRACE=1 FLOW_PEERS=1 CONTACT_TRACE=1 \
  npm run baseline:run -- --candidate --receipt out/under-center-zone/native-checks.json -- \
  node --import tsx scripts/diag/defense/hand-action-panel.ts out/under-center-zone/native.json.gz
```

For actual-pin comparison, create a detached `4ded6b6` checkout, copy the same
collector as an untracked diagnostic there, and use its 43-flag launcher without
`--candidate`. Pass the manifest's absolute path and write `pin.json.gz` and
`pin-weak.json.gz` with corresponding launcher receipts. The current code's two
additional experimental switches are absent from that source, not enabled.
Copy the packets/receipts into this output directory before offline reduction.
For the component arm, use exact PR #9, add only
`--candidate --flag RUN_CONTACT_COMPONENTS=1` and save/copy the corresponding
`components` and `components-weak` packets/receipts. No combination arm is needed.

```sh
python3 scripts/diag/under-center-zone-report.py
npm run baseline:run -- --candidate -- \
  node --import tsx scripts/diag/hand-action-world-replay.ts --witness \
  docs/reviews/under-center-zone-keeper-world-witness.json out/under-center-zone/replay.json
```

Nine matched observer pairs plus native/reduced/free witness checks cost 19.25
recorded command-seconds. With offline reduction, compact-witness verification
and final duplicate-cue aggregation, total recorded validation commands cost
**27.83 seconds**. Aggregation repeats only offline reduction and runs no new
plays. [Analysis validation](under-center-zone-analysis-validation.json) distinguishes
these stages. No games, new census or full suite were run. Runtime is unchanged;
the full-suite responsibility remains with the designated integration owner.
