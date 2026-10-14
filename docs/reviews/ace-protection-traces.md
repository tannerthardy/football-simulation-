# Ace protection through runner arrival

Two different protection failures are now traced. RT **briefly acquires lateral
contact, then loses reach** in the Y-playside case. In the rightward H case,
DT_S takes the inside route while **RT/end traffic constrains RG**. Both are
more precise than calling a player unblocked because an assignment did not win.
No controller, contact-retention, capacity, roster or hand-policy change is
installed. The contact assumption remains with the sole physics owner.

The comparison remains **4ded6b6**. This branch starts from PR #17 at
`61596bd78e21cf4aa7443a8d44eca4370db21470`, using exactly the same isolated
`handContact:'patch', groundMovement:'legacy'` runtime source
`c6b2c179a896aa1c9593def9af01c4869306a63bba9196a04e450e53f55d1904` and 43 flags.
[Inputs](../../config/ace-protection-traces.json) and
[receipt](ace-protection-receipt.json) record all settings, revisions, acquired
cues, requested/delivered/achieved movement, histories, failures and costs.

## RT joining is not useful protection through arrival

**Correction to PR #17 prose:** “RT never develops load” was too broad. He
does develop lateral load from 1.50 through 1.95 s. He develops no compressive
load in that interval, loses eligibility at 2.00, and has zero load when DE_S
grabs the runner at 2.35. Original observations/witnesses are unchanged; the
late-arrival zero-load observation was valid, the earlier blanket claim was not.

| Step | What actually happens |
| --- | --- |
| 1.25 | RT joins Y's existing rep at distance 1.197 yd. That is inside the 1.270 functional envelope but outside the 1.020 initial working reach. A nominal zero-capacity hand object is created; no hand exchange or load yet. |
| 1.50 | Distance 1.009 enters working reach. Acquired hand control is -.0495, with DE_S controlling this exchange. RT transmits lateral load; compression stays zero. |
| 1.65 | Distance bottoms near .975. RT's feet have not established the sustained first-level keeper observed in the baseline success. |
| 1.95 | Distance is back to 1.192. RT still transmits lateral force, but the delivered COM requests ask the pair to **open separation at 2.107 yd/s**; actual opening is 1.445. Nonzero hand force has not secured the runner's route. |
| 2.00 | Distance 1.279 exceeds the 1.270 functional reach. The existing helper gate clears its acquired control and sets push/hold/steer to zero. The nominal rep/helper object remains. |
| 2.05 | The helper consumes Y's .05-s-old and DE_S's .30-s-old pictures. Observed useful-surface depth is +.142 yd; actual depth is -.029. His retained landmark still supports the normal help request. This is an information boundary, not permission to give him the actual defender state. |
| 2.30 | The next end picture finally places the defender on the lost surface (observed -.435, actual -.462). RT requests recovery, but the pair is 1.940 yd apart and still opening with the existing momentum. |
| 2.35 | Runner meets DE_S in the backfield. RT remains unloaded/about2.09 yd away after the step. Y still transmits lateral force; neither that force nor an unreleased double establishes lane protection. |

The native helper uses its oblique installed surface, not an invented vertical
one: axis (-.486,+.874), drive (+.486,-.874). Sustained load while the helper is
on the useful side skips a fresh visual fit; the existing helper request then
works toward the owner's neighboring hip. This explains why hand force can
coexist with an opening COM pair. At 2.05 delayed information still postpones
the recovery branch. There is no new release timer and Y never earns the old
2.00-s climb in this run.

The joining path is also constrained by Y. At 1.25 the contact technique
requests (+3.635,-2.930) yd/s, while World receives (+2.143,+.150). An offline
fold of the **exact consumed teammate pictures reproduces that cut exactly**:
Y has only .112 yd headway; requested relative closure is3.758, allowance .336.
The spacing model's constant-velocity requested path passes within .424,
below the .601 torso touch distance. At 1.50 the same Y traffic clips the
contact request again. Disabling spacing bypasses this collision constraint.
The question for a later controller candidate is a feasible joining/recovery
route, not a blanket traffic bypass or more strength.

The old baseline reaches acquired hands at 1.60 with control **+.1983**, then
develops sustained load and the successful keeper. Acquisition timing and the
native hand exchange differ, as does the physical history. The hand exchange
uses shared RNG; this comparison does not isolate execution randomness from
closed-loop timing. It cannot establish “the same defender is simply superior”
or justify restoring the old successful ending.

## DT_S gains interior access while the end block persists

RG still owns DT_S; the end block is not the uncovered assignment. DT_S remains
on the runner side of RG as the runner approaches. The observed sequence is:

1. RG carries sustained compression through 2.35, with no blocker fall or early
   release. At 2.20 it senses backfield load and requests an anchor:
   (+2.4,-.635) yd/s. World receives (-.350,-.922).
2. The exact spacing fold identifies **RT**, not a mysterious solver cap, as
   the limiting teammate. Headway is .092 yd; relative requested closure3.042
   exceeds allowance .277. The model's straight request passes within .246 yd,
   inside the .667 touch distance. RG cannot execute that anchor through RT.
3. At 2.30 RG also collides with neighboring **DE_S**, receiving/transmitting
   150.81 kg·yd/s pair impulse. This is the first loaded RG/DE_S collision in
   this isolated law run; the same baseline input has none. Meanwhile DT_S
   declares the runner from its acquired picture, changing its aim to
   (38.730,21.848). Previously it follows the developing B-gap/stack picture.
4. RG's 2.35 and 2.40 anchor requests are again clipped by RT. At 2.35 the raw
   modeled straight request passes within .012 yd of RT's COM versus .667 touch distance.
   Actual requests and motion leave RG outside the runner-to-DT_S corridor.
5. DT_S contacts RB at 2.40 with **133.38 kg·yd/s torso impulse**, before LOS.
   RT still carries 850.18 normal/84.78 lateral end load. RG/DT_S compression
   has fallen to zero, with lateral load103.83 still present. Clearing all
   lateral force based only on zero compression would misclassify the contact.

This is a combined surface/traffic/runner-access failure. It does not support
making the end block stronger, declaring DT_S unassigned, or teaching RG to
walk through RT. The defender consumes an acquired runner cue and its commands
remain inside the existing capability model. Whether all preceding retained
contacts remain physically valid still belongs to the contact review.

`RUN_CONTACT_TRACK=0`. The new RG/DE_S collision is evidence on this **experimental
isolated contact package**, not a newly demonstrated 4ded6b6 default failure.
The famous adjacent-block collision in the parked reach-track experiment
remains a separate witness; it was not replayed or reassigned here.

The exact folds attribute the existing limits; they do not prove those limits
are optimal or that the finite-acceleration curved path inevitably collides.
An engaged/contact body cannot use an unloaded forecast as a clearance oracle.
After retention review, an achievable coupled joining/anchoring path is the
next bounded controller question. This pass supplies no traffic-bypass candidate.

## Contact-retention handoff

[The 12,884-byte portable input](ace-lateral-retention-controls.json) uses native
Y/DE_S at 2.30–2.35. Previously acquired hands date to .40; both bodies are
upright, facing toward one another and within reachable separation (.881 yd).
The following controls reuse bodies, capacities, requests and ground:

- **Reachable retained connection:** native state replays exactly (error0).
  Normal force0, lateral41.878 and real moments -17.005/-19.966. This is a
  plausible retention-positive pose; physics must settle whether the modeled
  acquired connection actually remains latched.
- **Cleared connection:** remove only the joint. Both arm impulses and hand
  work are zero. Zero hand delivery follows actual clearance, not compression.
- **Unreachable stale connection:** deliberately translate Y3 yd farther
  along the separation direction. Distance3.881 exceeds even radius plus both
  full profile reaches2.693. Supplying the stale joint still transmits lateral
  force under the current operator. Clearing it removes that force.

The latter is an explicitly **synthetic negative control**, not evidence that
a native controller supplies that unreachable joint. The operator assumes its
acquired input is valid; the owner should define where physical reach/facing
and clearance invalidate retention. Conservation and bounded work do not
establish valid contact acquisition. A law making all shear proportional to
compression would discard the retained positive control without answering
that question. Shared physics is unchanged in this diagnostic branch.

## Preserved controls, cost and next checkpoint

The weak-call success is reused unchanged from PR #17: clean LOS2.40, first
LB_M contact2.85, natural tackle4.10, gain+9.500. The old successful baseline
Y and both adverse H cases remain recorded; the unsafe withdrawn early-release
candidate remains withdrawn. RB reference PR #13 and components/handover/active
hands are not combined here. An assigned block, rep or delivered force is not
an acceptance criterion: evaluate defender access through actual arrival.

Only two existing inputs receive additional **2.45-s observer prefixes**, twice
to add the missing contact and spacing stages. All49 complete state/RNG hashes
match each saved run in both passes. This is1.82 collector seconds, no new
inputs/full games/endings or weak-call replay. Five offline traffic folds match
World delivery exactly; their opposing clear-lane controls preserve the original
request. Native retained/cleared/unreachable assertions and typecheck pass.
PR #17's89 source-compatible law tests are reused, not rerun.

The receipt retains tested revisions/settings and all launcher costs, including
the initial one-line diagnostic typing failure and the reducer's refusal of
that failed check; both were corrected without rerunning football. Later
receipt publication/reduction advances no simulations.

Current `develop` was fetched read-only at
**`a1b16e666a9ee7d1bc1d2aecba141fc535863b24`**, containing reviewed #12. **It has
not been replayed here.** The user's prerequisite is to settle the contact
contract first. Refresh and pin `develop` at that checkpoint, record its own
accepted flags/source and compare these same three cases separately from the
historical 4ded6b6 law experiment. No new baseline is designated.

Reproduce the small portable physics and spacing controls without the large raw
packets (Node22.23.3, recorded baseline flags):

```sh
npm run baseline:run -- --candidate --receipt out/ace-protection/retention-checks.json -- node --import tsx scripts/diag/physics/ace-retention-controls.ts out/ace-protection/retention.json
npm run baseline:run -- --candidate --receipt out/ace-protection/spacing-checks.json -- node --import tsx scripts/diag/zone/ace-protection-spacing.mjs docs/reviews/ace-protection-spacing-controls.json out/ace-protection/spacing.json
```

The two short live prefixes also reproduce without old raw packets: their
expected history hashes are in the manifest. Use `ace-protection-native.ts`
with output `out/ace-protection/delivery.json.gz` under `baseline:run`. Full
offline reduction accepts the saved PR #17 and PR #11 packet directories as
arguments to `ace-protection-report.py`. Check inventory is not a mandatory
testing ladder; run only what addresses the next unresolved decision.
