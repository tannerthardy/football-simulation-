# Coupled run contact components and pull-to-runner handover

Two bounded controller trials now have explicit contracts and matched offensive,
defensive and combined controls. Both remain **off**. The shoulder-component
repair fixes a request construction error; it does not repair the known WZ
cross-pair fall. The combined hand trial loses four previously clean approaches.
No shared force, traction, support, recovery or contact law changed.

## Source and hypotheses

Started from the shared pin `4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`, using
Node 22.23.3. Candidate runtime SHA-256 is
`09c65f70ff3835dba17fb08487582d65f49eaea827f4e6e48f396f93210b773c`.
The native receipts record the actual starting checkout commit, modified source
fingerprint, collector fingerprint and all flags; these are working-tree
candidate measurements, not measurements of the untouched pin. Historical
receipts and physics promotion failures remain intact.

The [positioning diagnosis](run-game-positioning.md) identifies a mixed drive
and contact frame: `drive * forward + tangent * lateral` adds the drive's
tangential component even though `lateral` already contains the complete
opponent-flow and shoulder correction. The falsifier is the actual request's
projection onto the acquired tangent. `RUN_CONTACT_COMPONENTS=1` subtracts the
duplicated component in nonanchored stretch contact. It preserves the drive's
normal projection without normalizing it or dividing by a small angle. The
existing backdrive anchor, acquired hand geometry and release rules remain.

The [integration diagnosis](run-game-integration.md) identifies the pull-to-ball
handover problem when a carrying runner's lateral speed falls below the flow
gate and the pull target exceeds its reach gate. `PULL_HANDOVER=1` remembers a
personally acquired pull side, then uses the consumed carrying-runner picture
for an inside-out insertion landmark over the existing two-read horizon. The
ordinary held aim controls adoption; the surface declaration still controls
pursuit. Edge, force, lag, cutback and deep keyed mesh controls retain their
jobs. This inherits the engine's existing carrier-identity interface; it does
not supply a complete occluded-possession model. No new perception/RNG call,
memory timer, planner amplification or strength bonus was added.

## Declared comparison

The collector uses the existing 32 shared inputs, 16 previously inspected fresh
inputs and 12 integration inputs, declared before implementation. These are
generated development controls, not a blind NFL holdout. Bodies, profiles,
calls, seeds, measurement and the 3.5-second live window are shared by all arms.
Every observed execution is checked against a plain execution. A short-ended
play stays ended; a still-live spot is not a completed gain.

| Arm | Explicit additions | Exact histories / 60 | Ended / live at cutoff |
| --- | --- | ---: | ---: |
| Default | None | 60 | 19 / 41 |
| Offense | `RUN_CONTACT_COMPONENTS` | 40 | 18 / 42 |
| Defense | `PULL_HANDOVER` | 43 | 19 / 41 |
| Combined | Both controller trials | 25 | 18 / 42 |
| Motor alone | `HAND_MOTOR` | 60 | 19 / 41 |
| Offensive hands | Offense + `HAND_MOTOR`, `RUN_HANDS` | 8 | 16 / 44 |
| Defensive hands | Defense + `HAND_MOTOR`, `DL_HANDS` | 8 | 20 / 40 |
| Combined hands | Both trials + `HAND_MOTOR`, `RUN_HANDS`, `DL_HANDS` | 8 | 16 / 44 |

All **480 observed/plain pairs** match. The disabled candidate matches the
untouched pin's 60 native histories exactly through the same window. All eight
PA controls retain exact histories in every arm. `HAND_FIGHT`, gait, tackle,
patch-contact and the other parked experiments are off. Existing hand control
still uses the baseline ratings walk; these trials do not fix inside-hand
ownership or certify center hands' known angular defect.

The mean absolute mismatch between the whole requested shoulder component and
its actual nonanchored stretch projection is .409329 yd/s in default (1,710
requests), and below 2e-16 yd/s in offense/combined. This is a request contract,
not an achieved loaded-speed claim. Changing physical paths changes later request
counts; it does not create an NFL displacement target.

## Contact and adverse controls

The two controller-only arms and their combination lose no baseline clean
approach among these inputs. Gap-run paths and completed gains still trade off.
For example, defense changes completed mirrored power seed 3 from 2.639 to
1.348 yd; counter seed 3 remains live and its cutoff spot changes .408 to 1.776
yd. Those observations do not establish a broad improvement in defensive fits.

Hand actions reuse the existing paid push, hold and tangential motor. The 22
mirrored center/patch bench rows pass their existing linear momentum, force,
work and mirror assertions. Maximum mirror discrepancy is 3.70e-13. Center drag
displacement changes 1.291 to 1.816 yd, with unchanged arm capacities. The patch
turn and center angular-law concerns from [hands evidence](hands-plan.md) remain;
linear accounting alone is insufficient for promotion.

All adverse approach pairs remain in the reducer output:

- Offensive hands lose the prior clean `new-wz_strong-s23` approach.
- Defensive hands lose `wz_strong-s3-mirror` and
  `oz_strong-s19-mirror-fresh`.
- Combined hands lose those three and `wz_strong-s7-mirror`.

Separate five-input `RUN_CONTACT_TRACK=1` controls retain the known adjacent-pair
failure. On mirrored WZ seed 3, the component repair delays LG's fall from 2.25
to 2.30 seconds; the first runner contact remains 2.40 and the LOS crossing is
bounded at 2.60. Both approaches remain interrupted. The repaired arm is still
live at cutoff, so its larger spot is not a successful completed result. No
extra floor, neighbor avoidance, delayed release or stronger support rule was
stacked to rescue it.

## Reproduction and validation

Activate Node 22.23.3 and run from the checkout root:

```sh
node scripts/diag/coupled-run-contact.mjs
python3 scripts/diag/coupled-run-contact-report.py
npm run baseline:verify -- --candidate
```

The eight-arm collector writes source/profile receipts and raw histories under
ignored `out/coupled-run-contact/`; the reducer verifies matching inputs,
profiles, neutral observation and default/motor parity before writing every
paired result to `summary.json`. Fixed-time samples require real live frames;
same-tick contact/crossing remains uncertain.

The untouched baseline passed 1,652 TypeScript and 145 Python checks, typecheck
and build. The enabled combined controllers/hands pass 117 focused checks,
including shared arm budgets, co-motion, contact ownership, helper transfers,
retained hand parameters, genuine backdrive and acquired-cue boundaries.
Complete candidate validation and the eight-game mechanism comparisons are
recorded in the accompanying receipt after their completion.

The next bounded work is the native adjacent-pair approach/contact sequence and
the first changed defensive fit after the runner handover. These trials supply
reproducible requests and opponent responses for that diagnosis; they do not
promote the hand stack or finish loaded run blocking.
