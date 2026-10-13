# Hand actions, actual run protection and existing pull handover

PR #4's component correction and pull handover are already implemented. This
follow-up changes diagnostics and evidence only. The comparison remains
`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`; shared physics, capacities,
controllers and defaults are unchanged. No new baseline is designated.

The four combined-hand losses have specific responsible contact pairs. The
defensive requests examined follow acquired cues and current hand ownership;
winning with the hands is acceptable. Force/work compliance does not certify
the execution: independent controls reproduce the known center-hand angular
defect. No controller edit is justified by the outcome alone. Small witnesses
are handed to the single physics owner through [the workboard](../WORKBOARD.md).
The seed-23 offensive redirect exposes a separate lane-protection question.

## Fixed inputs and separate candidates

The [20-input manifest](hand-action-protection-inputs.json) contains the four
losses, four opposite-side controls and 12 changed power/counter cases. These
are previously inspected development inputs, not a blind holdout. All share
the same rosters, profiles, calls, initial positions, seeds and measurement.
The [actual-pin ending digests](hand-action-protection-baseline.json) came from
an execution on the frozen checkout, not from turning experiments off on PR #4.
Disabled PR #4 matches all 20 complete state/RNG histories through their endings.

Candidate runtime SHA-256 remains
`09c65f70ff3835dba17fb08487582d65f49eaea827f4e6e48f396f93210b773c`.
World SHA-256 is unchanged from the pin:
`ed1708d764c355da60bd31c115f557baf3d81af18c89f3479c471bf981732ca2`.
The [receipt](hand-action-protection-receipt.json) records both complete flag
profiles, every arm's overrides, collector versions, interventions, consumed
cues, ownership, requested action, delivered force, positions and support.

The factorial runs components alone, offensive hands alone, defensive hands
alone, both hands alone, and handover alone before the controller/hand
combinations. `HAND_MOTOR=1` accompanies each enabled hand controller.
`RUN_CONTACT_TRACK=0`, `HAND_FIGHT=0` and all other parked flags retain the
baseline values in every arm. The old ownership ratings walk remains in use;
these results do not validate physical inside-hand acquisition.

All **236 observed/plain pairs** (472 executions, including 20 actual-pin
pairs) are neutral. Every play ends in a tackle by 5.85 s; none reaches the
explicit 25-s censoring cap. Three later observer controls add held-shed
decision capture without changing the earlier native histories. The separate
normalized hashes omit only the hand-joint `drive` request field; full native
hashes, poses, forces, ownership, support, events and RNG remain available.

## Actual protection through endings

These are completed gains in yards. `clean` means crossing the LOS before the
first runner contact; `interrupted` means contact earlier than that crossing;
`unreached` means the play ends without crossing. Same-step contact/crossing
stays uncertain. A larger completed gain does not establish a better mechanism.

| Arm | WZ 3 mirror | WZ 7 mirror | OZ 19 mirror | New WZ 23 |
| --- | --- | --- | --- | --- |
| Frozen pin | clean, .677 | clean, .281 | clean, .687 | clean, 1.447 |
| Components alone | clean, .683 | clean, .351 | clean, .687 | clean, 1.447 |
| Offensive hands alone | clean, .648 | clean, .281 | clean, .733 | unreached, −.261 |
| Defensive hands alone | interrupted, .521 | clean, .387 | unreached, −.131 | unreached, −.315 |
| Both hands alone | interrupted, .435 | clean, .387 | unreached, −.131 | unreached, −.262 |
| Components + defensive hands, no offensive hands | clean, .624 | unreached, −.020 | unreached, −.131 | unreached, −.315 |
| Both controllers, no hands | clean, .683 | clean, .351 | clean, .687 | clean, 1.456 |
| Components + offensive hands | clean, .672 | clean, .351 | clean, .733 | unreached, −.261 |
| Handover + defensive hands | interrupted, .521 | clean, .387 | unreached, −.131 | unreached, −.315 |
| Both controllers + both hands | interrupted, .350 | unreached, −.020 | unreached, −.131 | unreached, −.262 |

The four combined losses never activate handover through their endings.
Defensive-only seed 23 adds a loss that the 3.5-s live window had not resolved:
contact is at 3.15, tackle at 4.00. Its first handover cue is at 3.80, after the
interruption; defensive hands with handover **off** give the same final result.
The four opposite-side controls lose no previously clean approach. Unflipped
WZ 3's baseline contact/crossing is uncertain, not classified as a clean win.

## First differences and causal interventions

Each intervention zeros only the selected hand joint's active `drive`, or
keeps only that joint's active drive. It preserves feet, ownership, extension,
force/work limits, other joint laws and RNG. Both observed and plain executions
receive the same intervention. This is a diagnostic counterfactual, not a
proposed controller rule.

**WZ seed 3 mirror.** The first offensive request/delivery difference is
RT/DE_W at 1.00 (drive −3); its poses change by 1.05. Offensive hands alone
retain protection. Defensive hands first change Y/DE_S at 1.85, but removing
that pair does not rescue the loss. The responsible defensive action is
**LG/DT_S at 2.00**: retaining only its drive reproduces the defensive-only
interruption at 2.50, while removing it restores a clean approach. In the
combined arm contact moves to 2.45; removing either RT/DE_W or LG/DT_S restores
clean protection. Both actions participate in the changed interaction; the
first changed Y pair does not explain it.

At 2.00 DT_S owns the hands (`control` −.0285), is supported and consumes a
carrying-runner cue aged .30 s at (37.885, 30.467). The held shed side −1 lasts
to 2.426. Drive +2 requests ball-side motion in the joint tangent; delivered
tangential force is +140.334 versus the incoming −143.669. The acquired
ball-side request is coherent with this picture. Its native two-body witness
replays exactly, but the separate free-motion pair still has torso contact;
that control is **not** a clean angular-law isolation.

**WZ seed 7 mirror.** Y/DE_S first requests drive −2 at 1.75, but it does not
first change the delivered force or poses in the combined arm. The first
delivered change there is **RG/DT_W at 2.00**, with poses changed by 2.05.
Removing RG/DT_W restores a clean approach/contact at 3.00; removing Y does
not. DT_W's hands alone with the original component composition stay clean.
The component correction and the defensive hand action interact; neither
alone produces this loss. A separate eight-input components/defensive-hands
control with offensive hands and handover disabled confirms the same WZ-7
ending (−.020 at 3.35). There is no offensive active-hand request in this
case's offensive-only arm.

DT_W owns the hands (`control` −.0637), remains supported and uses a carrying
cue aged .30 s at (37.885, 30.467). Its shed decision at 2.00 selects side −1
until 2.440. Requested tangent speed is +2; delivered tangential force is
+236.818, compared with the incoming +76.332. Contact advances to 2.70 and
the combined play ends at 3.35 before crossing. This is a ball-side defensive
action, not evidence of a wrong-side command. The independent free pair's
angular residual makes its precise effectiveness physically uncertified.

**Fresh OZ seed 19 mirror.** The first defensive/combined request and delivery
difference is **Y/DE_S at 2.05**; LT/Y/DE_S poses change by 2.10. Keeping only
Y/DE_S reproduces the loss; removing it restores clean protection. DE_S owns
the hands (`control` −.9664), is supported and consumes a carrying cue aged
.25 s at (37.513, 31.082), moving (3.677, 2.560). That picture projects the
runner toward the outside edge near the LOS. The held side −1 lasts to 2.448;
drive +2 delivers mean tangent +456.036 within the +509.319 request limit.
First contact is at 2.70, followed by a 3.40-s tackle at −.131 yd. Offensive
hands first act later, C/LB_M at 2.55, and retain a clean approach. The edge
defender's intention is legitimate; the hand law still needs certification.

**New WZ seed 23.** Offensive/combined hands first change Y/DE_S at 1.50
(drive −2.390), with RT/Y/DE_S poses changed by 1.55. Removing Y does not
rescue the loss, and keeping only Y remains clean. The responsible early
approach action is **RG/DT_S at 2.25**. Keeping only this drive reproduces
contact at 2.35; removing it from the offensive arm delays contact to 3.50,
but the later play still ends unreached (−.162 yd). Preserve that failed rescue.

RG owns the hands (`control` +.4777), remains supported at (39.799, 21.761)
and feels load (−59.127, −914.954). DT_S is at (39.324, 22.455); the runner
is at (38.491, 21.508). RG's local relative-motion test requests +2.531 yd/s
along a tangent approximately (−.825, −.565), taking DT_S toward the runner's
approach. Mean tangential force flips from incoming −510.103 braking to
+522.868 active redirect. The blocker consumes no runner picture in that
decision. Moving a defender off the blocker's body does not ensure protection
of the runner's lane. This exposes missing protection in the local policy,
but does not by itself demonstrate a sign error or justify banning a valid
redirect while its force-point law is incoherent.

Defensive-only seed 23 instead first changes Y/DE_S at 1.95. Removing Y from
that arm restores a clean approach; the opposing controller arms therefore
have different causes. This later defensive interruption is retained alongside
the earlier offensive RG loss.

The observer records the actual held shed decision, not a reconstruction from
a later runner picture. For example, WZ 7's earlier Y-side decision holds from
1.75 to 2.163; comparing its command with a newer cue would incorrectly suggest
a fresh side error. Some earlier mesh pictures say `carrying:false` while the
engine's public carrier identity already selects RB. That inherited information
assumption remains a limitation; the three responsible defensive decisions
described above consume `carrying:true` pictures.

## Physical limits and minimal handoff

Across every collected step, maximum arm-impulse excess is 2.85e−14; arm-work
and support-work excess are zero; maximum work-accounting residual is 1.52e−11.
The four nominated pairs and runners are supported at action onset. These
checks exclude a simple new force/work-limit overrun; they do not validate
force points or angular momentum.

The replay restores native World inputs and closes the small graph over real
joints, contacts and pending strikes. Native/reduced pose error is below
2.1e−13. The separate free-motion controls remove ground reactions and retain
only the nominated hand pair. They are law checks, not football endings.

| Portable witness | Bodies retained | Clean free-pair angular change, driven / no drive |
| --- | ---: | ---: |
| [WZ 3, LG/DT_S at 2.00](hand-action-witness-wz3.json) | 2 | Not isolated: torso contact remains |
| [WZ 7, RG/DT_W at 2.00](hand-action-witness-wz7.json) | 2 | +7.817066 / +.000001 |
| [OZ 19, Y/DE_S at 2.05](hand-action-witness-oz19.json) | 3, including LT helper | +19.339288 / 0 |
| [New WZ 23, RG/DT_S at 2.25](hand-action-witness-new23.json) | 2 | +22.886752 / −22.882155 |

The three clean controls have zero ground impulse/yaw, no torso contacts and
no strikes; linear accounting remains conserved. The seed-23 passive law is
also angularly defective. These witnesses establish a shared-law problem;
they do **not** prove that repairing it rescues a particular approach. The
physics owner should evaluate the force-point/angular mechanism, then return
the same native requests for paired controller/protection checks.

The famous adjacent-block fall is a separate, already parked
`RUN_CONTACT_TRACK=1` experiment from the [earlier review](coupled-run-contact.md).
It is not a new default-baseline failure and is excluded from this panel.

## Existing pull handover, through actual endings

`PULL_HANDOVER=1` alone first changes an insertion backer's command at 1.75 s
(1.80 for power 7 mirror). All first runner pictures say carrying, aged .20 s.
The insertion landmark remains at x=41.5; held aims use existing decision
cadence after a personally acquired pull side. There is no new perception/RNG,
planner boost, timer or pursuit-depth rule. Recorded commands can reverse
sharply under the existing planner; that is an observed execution issue, not
an added speed allowance.

| Case | Baseline → handover completed gain, yd | Baseline → handover ending, s |
| --- | ---: | ---: |
| Power 3 | −1.446 → .104 | 3.40 → 4.25 |
| Power 3 mirror | 2.639 → 1.348 | 3.50 → 3.35 |
| Counter 3 | 3.063 → 5.118 | 5.20 → 4.35 |
| Counter 3 mirror | −1.435 → −1.541 | 3.30 → 3.20 |
| Power 7 | .290 → 3.187 | 4.75 → 5.10 |
| Power 7 mirror | −.078 → −.080 | 4.05 → 4.05 |
| Counter 7 | −.597 → −.748 | 3.75 → 4.10 |
| Counter 7 mirror | 4.027 → 1.852 | 5.45 → 5.85 |
| New power 23 | .337 → .334 | 4.15 → 4.15 |
| New power 23 mirror | 1.934 → .820 | 3.55 → 3.45 |
| New counter 23 | −.793 → −.116 | 3.65 → 3.70 |
| New counter 23 mirror | 1.413 → −.138 | 4.00 → 3.65 |

Eight gains decrease and four increase. The contract changes the acquired
target as intended; cutback/misdirection and resulting support/approach remain
tradeoffs. This inspected panel does not establish a broad defensive upgrade.
Keep the handover off pending review and further mechanism evidence.

## Reproduction

Use Node 22.23.3 from the checkout root. A small physics witness requires no
large raw trace; substitute any of the four witness filenames:

```sh
node scripts/baseline.mjs --candidate --flag HAND_MOTOR=1 -- \
  node --import tsx scripts/diag/hand-action-world-replay.ts --witness \
  docs/reviews/hand-action-witness-wz7.json out/hand-action-protection/replay.json
```

The native expected poses are asserted when the World hash matches. With a
changed solver the tool reports the reference error and new law result instead
of claiming old-law parity. Free controls are explicitly labelled, including
the WZ-3 contact contamination.

Collect a fresh candidate panel without switching branches:

```sh
node scripts/diag/hand-action-protection.mjs
node scripts/diag/hand-action-ablations.mjs
node scripts/diag/hand-action-additional-ablations.mjs
python3 scripts/diag/hand-action-protection-report.py
```

The driver writes all exact input subsets from the manifest. The reducer
checks complete disabled parity against the committed actual-pin digests,
all observer pairs, profiles, positions, flags and receipts before writing
`diagnosis.json` and `compact-receipt.json` under ignored
`out/hand-action-protection/`. A fresh run counts 216 pairs because it reuses
the 20 frozen-pin digests; the original 236-pair receipt also includes those
actual frozen executions. Historical collector hashes are retained, not
relabeled with the final script version.

[Complete candidate verification](hand-action-protection-validation.json)
passes on Node 22.23.3: all 1,673 TypeScript tests in 137 files, 145 Python
checks, typecheck and build. Inputs remain unchanged across the check. The
runtime, production tests, solver and defaults are byte-identical to the
starting PR #4 stage. The later components/defensive-hands driver registration
is [syntax-checked](hand-action-protection-driver-validation.json) and its eight native observed/plain pairs pass separately;
the full-check receipt retains its actual earlier validation fingerprint.

To independently recollect the actual pin, first preserve local work. Run the
driver with `--prepare`, copy `hand-action-panel.ts` outside the checkout,
switch to detached `4ded6b6`, and restore only that helper at its same relative
path as an untracked file. With `FLOW_INPUTS` set to the prepared
`all-inputs.json`, `FLOW_STOP=25`, `FLOW_TRACE=1`, `CONTACT_TRACE=1`, and both
`HAND_REMOVE`/`HAND_KEEP` empty, run it through the pin's `scripts/baseline.mjs`
without `--candidate`, saving `baseline.json.gz` and `baseline-receipt.json`.
Remove only the helper just restored before switching back to the feature
branch. Do not reset, replace the frozen fixture from a candidate, or promote
another pin as a convenience.
