# Offensive-line technique: making the whole wide-zone surface work

The saved Ace runs expose broader technique and coordination gaps, not simply
superior defenders winning every matchup. The first-level count is complete.
What varies is whether the assigned player reaches a useful surface, maintains
it with supported feet, and controls the defender's route through runner
arrival. Some free defenders are ordinary football numbers; some assigned
defenders are never collected; others carry real contact and still reach the
back. Those outcomes need different remedies.

This is a source audit and an offline investigation, **not a controller
improvement or production replay**. The user's contact-retention review remains
pending. No controller, solver, shared movement, capacity, roster, release
timer, grip policy or default changes are installed. The existing 13 KB
[retained/cleared/unreachable witness](https://github.com/tannerthardy/football-simulation-/blob/830f6e2fe7ef19604b5033e9c9115413d5d2ef4c/docs/reviews/ace-lateral-retention-controls.json)
is already with the sole physics owner; this investigation does not duplicate
that implementation.

## What correct technique should accomplish

For ordinary under-center `ace_12` wide zone, both attached tight ends belong
to the seven-body first-level blocking surface. Their capabilities and stance
can differ from tackles. Their installed jobs still require a coherent
approach, useful shoulder relationship and recoverable base. The useful
sequence is:

1. Account for the near first-level threat and the conditional second-level job.
2. Gain attainable width/depth toward the observed surface while leaving a
   supported second action available.
3. Acquire hands within actual reach; let finite contact and the opponent's
   response determine what load survives.
4. Replace the feet under that load. Run with a widening defender when a hook
   is unavailable; an inside bang/bend lane can be the correct result.
5. Transfer only after the keeper earns useful protection, then actually
   collect the backer from acquired information and achievable movement.

Neither a successful hook nor a positive gain is mandatory. A defender can win
the shoulder, squeeze a crease, run through before a climber arrives or defeat
an acquired block. The common evaluation is **defender access through actual
runner arrival**, with requests, information, physical execution and randomness
kept distinct. A block label, engagement or force alone cannot establish it.

This follows the repository's [trench teaching synthesis](../football-handbook/trenches.md),
especially supported arrival, base replacement, reach versus runoff and earned
overtakes. Its publicly inspected Kuchar, Grabowski, Penree and Janak sources
describe coaching choices; they do not calibrate numeric posture, literal foot
placement, release times or NFL success rates. This model represents COM,
facing and support, not anatomical foot sequences.

## Evidence and scope

Source inspected: current `develop`
**`a1b16e666a9ee7d1bc1d2aecba141fc535863b24`**, accepted runtime source
`e5c318a1082c3738b9782107fa9faec67ada38b02245d1a529af4adaf6825c54`.
Its accepted setting is `RUN_CONTACT_COMPONENTS=1`, with the original profile
values and center World defaults retained. No native run on that source was
collected here. Integration owns its separate replay after contact review.

Historical comparison stays **`4ded6b600fd3785e65034aa5623d7a9f8f3c5db1`**.
Saved historical observer packets have source `09c65f70...`; prior PR #11/#17
receipts establish their state/RNG compatibility with that reference. The
isolated experiment has source `c6b2c179...`, explicit
`handContact:'patch', groundMovement:'legacy'`, and the historical profile.
Active hands, handover, RB correction and collection experiments are separate.
The exact serialized packet flags and launch profiles remain distinct in the
audit receipt; they are not replaced by an ambient environment.

The same three inputs remain primary: `uc12-wz-s3` (Y playside),
`uc12-wz-s3-mirror` (H playside) and `uc12-wz-weak-s3` (weak H). All use O31/D32,
seed3, strength.55, Ace12, Over/Cover3, LOS40 and first down50. The legacy
“mirror” changes TE placement; it is not a full geometry reflection. Both
strong calls attack decreasing y. The weak call attacks increasing y against
the same asymmetric front. G73-I48 stays secondary and is not replayed.

**Timing:** frame `t` is controller entry, `after=t+.05` is achieved body state.
`block_contact` stamps the World-step end. `carrier_contact` stamps entry even
though it uses post-World bodies; an event labeled2.35 therefore belongs to
the2.35–2.40 interval, not a certified instantaneous contact at2.35. The audit
retains both clocks and pre/post bodies. Quoted hand-load times label controller
steps; each final-substep output belongs to its recorded World interval.

## 1. The attached-TE technique path is incomplete

The planner includes inline TEs in first-level ownership, but execution filters
several techniques by the five OL slot names. This is a demonstrated code
asymmetry; whether a particular extension improves football remains untested.

| Technique component | Current implementation |
| --- | --- |
| Initial physical base | `playsim.ts:214–217`: OL/DT/EDGE start at posture.7; attached TEs start.3. |
| Moving-shoulder zone track | `blocking.ts:796–798,925–968`: OL only; stretch combinations included before joining. |
| Explicit first-foot landmark | `blocking.ts:800–804`: OL only, after the zone-flow branch. |
| Approach base maintenance | `blocking.ts:998–1004`: OL first-level jobs request posture.7. |
| Observed lost-shoulder refusal and bounded refit | `blocking.ts:1081–1095,1150–1153`: OL solo/released first-level jobs only. |
| Adaptive reach/runoff/seal | `blocking.ts:1156–1162`: solo OL reach only; unreleased combinations excluded. |
| Reviewed special cutoff surface | `blocking.ts:686–691`: qualifying solo OL cutoff only. |

An attached TE's visible stance is `low`, yet its first-level shoulder approach
usually uses full-speed `runThrough` with no explicit physical posture. World
then targets the existing.2 default with finite posture adjustment. In the
baseline Y case at controller.05, Y requests (+8.105,-4.511) yd/s while RT
requests (+1.823,-7.584), delivered as (+2.049,-1.689) after traffic avoidance.
At achieved state.40, **before the contact-law histories diverge**, Y has
advanced.337 yd upfield with physical posture.199; RT has advanced.088 yd with
posture.700. The pair approaches one defender using different machinery.

This can plausibly contribute to an owner arriving ahead of the helper and
restricting the later joining lane. It does not prove causality or justify
assigning every TE the tackle's posture. Increasing posture changes movement
cost, COM/pad height and support width: the existing effort factor is.952 at.7
versus1 at.2, and the support-radius proxy is1.10 versus.85 times base radius.
A better supported arrival can sacrifice attainable width.

The portable [role-dispatch probe](../../scripts/diag/zone/ol-role-dispatch.ts)
calls existing dispatch functions without creating or stepping World. Its
synthetic role controls establish eligibility only. Keep the supported WR
`drive` no-override contract in `test/run-base.test.ts:103–110`; a blanket
extension to every first-level label would violate it. Any future candidate
needs the actual installed/acquired inline role. Test base maintenance separately
from lateral track, gather and loaded recovery, after the contact dependency.

## 2. RT joining does not reliably become a keeper

This is the Y protection failure already traced in PR #18, now separated into
technique stages:

- **Nominal joining at1.25** switches RT from free approach to helper footwork
  before actual hand acquisition at1.50. Nominal distance1.197 is inside the
  functional controller envelope1.270, outside working acquisition reach1.020.
  Y clips the initial helper request. A nominal join is neither illegal nor
  evidence that the approach has finished.
- **Real lateral contact1.50–1.95** does not establish a keeper. Compression
  remains zero, but zero compression is not clearance. The loaded-positive-depth
  shortcut skips visual refitting; ordinary help continues toward the owner's
  neighboring hip plus installed drive.
- **The ordinary command explains the opening.** Substituting saved positions
  into `2.2*drive + 3*(ownerHip-helperCOM)` exactly reproduces the saved raw RT
  requests at1.50,1.65,1.80,1.95 and2.00. At1.95 the delivered RT/end targets ask
  COM separation to open at2.107 yd/s; actual opening is1.445. Earlier spacing
  is not the whole later failure: it is mostly inactive from1.65–2.05.
- **Functional contact is lost at2.00.** At2.05 the consumed end picture is.30 s
  old and still places the surface on the useful side. The next acquired loss
  at2.30 produces a recovery request, but traffic and existing opening momentum
  prevent immediate useful return. RT is unloaded when DE_S meets the back.

The next question is whether an adjacent joining/recovery route is achievable
from those same cues, momentum and reviewed contact state. Do not replace this
with an earlier release timer, stronger hands or an omniscient loss cue. Y
never earns the old climb in this failed surface.

Ordinary helper movement also uses the live owner's position/side every tick,
while recovery holds acquired pictures. That information inconsistency deserves
a separate ownership check: contact with the defender does not automatically
explain exact live teammate COM. It is not an established rescue. The different
hip-width formulas change this witness's target by only.0095 yd; that small
inconsistency is not the main failure.

## 3. RG's anchor has no clear straight path through RT

In the H strong case, RT still loads the end when **DT_S** reaches the runner.
RG owns that interior defender, remains upright and requests an anchor; this
is not a missing assignment, an early release or a failed end block.

At2.20 RG requests (+2.400,-.635) yd/s, but World receives (-.350,-.922).
At2.35 it asks (+2.400,-.098), delivered (-.473,-1.023). Existing exact
consumed-picture folds identify RT traffic: the2.35 straight requested path
passes within.012 yd of RT COM against a.667 touch distance. Requesting more
upfield drive cannot make that path available.

RG also collides with neighboring DE_S in the2.30 step, with150.81 kg·yd/s
pair impulse, as DT_S acquires the runner declaration. DT_S reaches RB in the
2.40 step with133.38 torso impulse while RT/end normal load remains850.18.
The useful next task is a coupled, attainable anchoring path; a free-World
forecast cannot promise clearance for these loaded bodies. The fold proves
what the current traffic rule did, not that every curved route is impossible.

This collision belongs to the **isolated-law experiment with
`RUN_CONTACT_TRACK=0`**. It is separate from the parked reach-track adjacent
collision and is not a newly shown default-baseline or production failure.

## 4. What the “unblocked” defenders actually represent

All three snap ledgers account for four DL, three LB and two CB using nine
blockers. Two LB jobs in the strong calls are conditional combination transfers;
having a reserved backer does not mean somebody has reached him. FS and SS
have no installed blocker; nine blockers cannot block eleven defenders at once.

The [portable responsibility witness](ol-responsibility-witness.json) and
[offline responsibility audit](../../scripts/diag/zone/ol-responsibility-audit.py)
separate snap account, transfer, acquired/load timing, body collision and first
runner contact. Important examples:

| Defender access | Actual account/execution | Implication |
| --- | --- | --- |
| Baseline Y: CB_S first runner contact3.65 | Z has the stalk job but develops no loaded hands or body collision before arrival; closest pre-step COM separation is2.083 yd at2.35. | A missed/unachieved stalk collection, not a free safety or absent assignment. Its informed approach still needs diagnosis. |
| Isolated Y: DE_S first contact2.35 interval | TE/RT combination remains assigned; RT loses functional contact before arrival. | First-level keeper failure, not an earlier-release problem. |
| Isolated H strong: DT_S first contact2.40 interval | RG has the job; RT/end remains loaded; interior anchor is traffic constrained. | Interior access and surface coordination. |
| Isolated weak: LB_M first contact2.85 interval | LG has a direct climb from snap and develops real hand load1.65–2.80. | Loaded second-level work that does not prevent later access; preserve the successful run and investigate before calling it an error. |
| Strong-call reserved backers | C/TE departures and subsequent load occur at different times; some collection is later than the first-level stop. | Eventual contact cannot be counted as timely protection; earlier departure may still be unsafe. |

Closest distances are descriptive geometry, not certified reach/interception.
Hand force is a final-substep output, not proof of continuously retained contact.
The defender's timing, acquired cue, support and runner momentum still decide
whether a missed collection is avoidable or a legitimate defensive win.

## Narrow path to a controller improvement

First consume the sole physics owner's smallest retention contract, preserving
physically supported zero-compression lateral force and rejecting stale
unreachable connections without losing torque/work/acquisition accounting.
Integration then pins current production and distinguishes its three native
cases from this historical law experiment.

On that reviewed foundation, use one clear question at a time:

1. **RT joining/recovery:** can the current acquired-information command earn
   and retain an attainable keeper surface without running through the owner?
   Keep the real loaded positive control and a widened/escaping defender loss.
2. **RG anchoring:** is an observed collision-free adjacent route available
   through runner arrival while preserving the useful RT/end block? If not,
   report the timing/capability limit rather than relaxing spacing.
3. **Attached first-level technique:** does an explicit role-appropriate base
   alone improve supported arrival? Preserve WR, released climb, pull and Draw
   contracts; retain the weak success. Lateral track/gather is a separate trial.
4. **Perimeter and second level:** use Z/CB_S's saved approach and LG/LB_M's
   loaded access as opposing collection mechanisms. Do not launch new formations
   or a roster census to decide whether a known job was ever achieved.

Preserve the withdrawn unsafe early-release control, useful runoff and ordinary
defensive wins. Retain every material adverse/inconclusive change. No new
baseline or diagnostic ancestry merge is requested.

## Reproduction and validation

Build the interactive film and responsibility reduction from the already saved
packets, with explicit path overrides available on both CLIs:

```sh
python3 scripts/diag/zone/ol-technique-film.py --self-check
python3 scripts/diag/zone/ol-responsibility-audit.py --help
npm run baseline:run -- --candidate --flag RUN_CONTACT_COMPONENTS=1 --receipt out/ol-technique/dispatch-checks.json -- node --import tsx scripts/diag/zone/ol-role-dispatch.ts out/ol-technique/role-dispatch.json
```

The film shows the same six historical/isolated histories through all natural
endings, with acquired links, exact body facing/radius, stored command versus
raw traced technique versus World target versus achieved COM movement. Data
integrity and JavaScript syntax checks are recorded in the final receipt.
It neither simulates alternative routes nor depicts anatomical footwork.
Actual browser rendering could not be automated because the installed
Playwright browser executable is absent; no dependency download was performed.

The [final receipt](ol-technique-receipt.json) records tested diagnostic revision
`64112f524343db314b373fc8e0612519c315a92b`, source/profile/input hashes, reused
evidence, tool checks, failures, runtime and remaining gate. The nine no-World
role observations and typecheck pass on unchanged accepted runtime source,
with exact accepted settings; wrapped command cost is9.71 seconds. Final film
and responsibility reductions take2.95 and2.27 seconds respectively; those
are the measured final builds, not total investigation cost. The initial film
extraction/round-trip fixes and unavailable browser check remain visible.
No new engine suite, roster panel, snap or game is needed for this audit. The
integration owner retains the preserved full-suite responsibility for an exact
reviewed combined candidate.
