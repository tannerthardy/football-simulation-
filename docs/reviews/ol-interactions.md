# OL interactions: the next useful detail

Reviewed 2026-10-11, starting at `8119f08`. The
[receipt](../../data/reviews/current/ol-leverage-review.json) pins measurements
and subsequent changes. This review is about mechanisms, not producing a
particular rushing average. Coaching examples describe possible installations,
not one universal NFL technique.

## Recommendation

Improve **how a lineman acquires, maintains and recovers a useful surface**
before adding a larger foot or anatomical solver. The current World can already
execute bounded changes of position, orientation, posture and support. The
fresh solo-drive witness below demonstrates a wrong request, not weak physics.

There is also a confirmed shared physical gap: **sideways hand force lacks
coherent angular transfer**. Correct that before building richer shoulder
steering or hand counters. One effective common contact patch is the first
candidate, using existing body yaw and shared force/work limits. It is a bounded
contact-model correction, not a reason to simulate articulated arms or feet.

Do not postpone tackling indefinitely. A useful block followed by a bad pursuit
or tackle does not establish a good run game. Keep the current tackle-approach
diagnosis alongside the trench work; do not raise grip strength to compensate.

## Leverage is several relationships

| Relationship | Why it matters | Current representation / limitation |
| --- | --- | --- |
| Access to the protected path | Being between the defender and the crease can matter more than displacement. | Installed drive/surface and fit exist; `phi` measures relative body position about that frame. A pushed defender is not necessarily sealed. |
| Shoulder and hip orientation | An opponent can remain nearby while losing square access or turning to recover. | Facing and physical yaw exist, but `phi` is not a shoulder angle. Ordinary torso collision shapes remain circular unless squeezing. |
| Contact ownership | A reachable chest, acquired useful hands, neutral hand fighting and a surviving grab are different. | Primary hand control combines several of these in one scalar. Helpers have separate earned contacts; these are separate blockers, not each player's left/right hands. |
| Support under load | A supported strike differs from an extended reach or a late corrective step. | Reduced capture-point support, posture, recovery and traction exist. Ordinary support lacks an independently attained stance direction or two planted feet. |
| Remaining escape route | A DL can maintain his gap, challenge the post blocker, shed toward the runner or legitimately be washed away. | Fit-aware contact and lateral work exist. Some run sheds still delete contacts after a success draw instead of requiring achieved clearance. |

Record these separately. A single “leverage rating” or block-win score cannot
explain all five. Head-on-the-number and hip-to-hip coaching language should
initially become surface, orientation and support requests, not skeletal parts.
Body facing also does not prove eye direction.

## Applying the separate trench investigation

The [reference investigation](https://github.com/tannerthardy/football-simulation-/blob/b6a48f1/docs/reviews/trench-deep-dive.md)
was reviewed against current source, rather than merged. Its useful controller
finding reproduces: the engaged defender's old foot request directly opposed
the OL's private drive direction, even before acquiring a changed movement cue.
The [current receipt](../../data/reviews/current/trench-controller.json) records
the clean reapplication, matched controls and adverse outcomes.

Only first-level interior/edge contact fits receive this change:

- The defender acquires blocker motion through his delayed picture, holds it
  for his decision beat and follows it while keeping a remembered gap-side
  shoulder. Actual transmitted hand load supplies local position; reaching
  alone does not. A newly declared runner changes the selected target and
  movement together on the next decision.
- Box and spill retain opposite shoulders. Interior lag answers acquired
  lateral flow on its backside; it does not override an edge's box/spill duty.
- Control and lag request finite foot replacement toward their own first
  loaded-contact depth. Attack keeps forward intent. A keeper change refreshes
  the opponent picture while preserving that depth. A double can still drive
  the defender backward. There is no displacement ceiling or resistance bonus.

This changes neither the OL's lateral technique nor World forces, traction,
support, contact law or physical profiles. The placement rule is a reduced
coaching model, not a measured NFL shoulder distance. Support players, inserts,
unassigned contacts and pass reps retain their policies. Conditional inside
support, gaze/occlusion, inherited true-position facing, drive-derived fallback
contact frames and outcome-awarded sheds remain separate limitations.

Do **not** promote the experimental force flags from their better percentiles.
`TRENCH_ECC` raises turf traction as well as muscular capacity. `TRENCH_LEV`
alters normal-load allowance without a complete vertical force/work model, and
translation, turning and recovery do not share that altered allowance. Neither
repairs the angular-law failure. Their measurements also mix proximity with
contact, snap-relative with engagement-relative time, and changing blocker
identities. Flat weight curves and NFL drive tails are diagnostic comparisons,
not acceptance gates or evidence that mass should cease to matter.

The optional `--contacts` mode of
`scripts/diag/combo-attention-witness.ts` now copies real pre/post-solve run
requests, acquired pictures, bodies, hand loads and returned budgets. It makes
no extra decisions, observations or RNG draws. Native outcomes include worse
runs and missed climber contacts; a correct request does not certify a better
whole play. The receipt retains these negatives and reproduction commands.

## What the lineman should keep doing

Use one reusable responsibility-and-control loop:

1. Know the installed protected path, first-level responsibility, partner,
   second-level target and replacement rules.
2. Acquire a delayed picture of the near defender and relevant help. Feel actual
   hand load immediately; preserve remembered evidence rather than knowing
   every teammate's current assignment and every defender's intentions.
3. Select an attainable half/shoulder and an approach that leaves support for
   contact. A foot-recovery request cannot reposition the body instantly.
4. Distinguish reaching from achieved contact. Work with the load and support
   actually present; turn, drive, mirror, yield or refit accordingly.
5. Reconsider continuing, transferring, climbing or finding work when the
   acquired evidence changes. A missed read or poor step can remain a loss.

These are concurrent decisions, not stages that must finish on a timer.
Ratings should change observation, precision, anticipation, control and
recovery. Training/mastery can improve execution of these rules later; it
must not award a successful block.

| Technique intention | Relevant cue and response | What proves useful execution |
| --- | --- | --- |
| Drive / down | Near-half movement and threatened penetration; gain and keep the wall rather than repeatedly reach from behind. | Achieved useful-side contact and path denial; displacement alone is insufficient. |
| Reach / stretch | Defender even, widening or undercutting; attempt the outside fit, run him laterally or preserve inside access. | Actual lateral movement, support and remaining penetration route. A failed hook can still be useful. |
| Combination | DL motion, keeper's surviving surface and backer fill/scrape; remain, take over or depart on a personally available route. | Concurrent actual load, continuity of keeper hands, clear departure and subsequent backer contact. |
| Kick / log | Observed pull corridor, edge movement and attained leverage; brake into the half that can be reached. | Achieved wash and a usable wrapper path; a “log” event does not establish either. |
| Recovery | Lost shoulder, unloaded/cleared contact or a new threat; replace feet around the body or classify new work. | Finite travel to a useful side, with a possible failed recovery and no fabricated hands. |

The defender needs an equally meaningful controller. Against a double, a
trained DL can challenge the post, maintain separation, lower/replace support
and preserve his called access. Squeeze, lag and holding ground are different
intentions. None justifies a special anti-double strength multiplier, a fixed
displacement ceiling or an automatic split/shed.

## First repair: do not regrab a known lost drive surface

The existing approach recovery covered reach, cutoff and down blocks, but solo
drive blocks bypassed it. Fresh fixed ordinary Inside Zone inputs showed six
drive acquisitions with a consumed position angle beyond the existing lost
shoulder boundary, followed by a same-tick leverage shed. Earlier requests
already sprinted toward the defender's center instead of recovering the feet.

The narrow repair reuses the existing body-clearance and bounded arrival logic
only for a personally observed lost, unengaged solo OL drive. Square drives,
unseen losses, live combinations and existing contacts retain their policies.
It changes no physical capacities and promises neither recovered hands nor a
successful block. Native outcomes, adverse cases and the controlled stale-read
checks are recorded in the receipt; these inputs are not a league frequency.

## Necessary contact study: one point before two hands

The new [angular-law audit](../../scripts/diag/hand-angular-law.ts) uses actual
World, separated bodies, no ground forces/yaw, no torso collisions and no
controllers/RNG. In the base tangent-restraint case, total angular momentum
changes from 144 to 140.287336 kg·yd²/s over 0.2 s, with zero body spin. Linear
momentum and kinetic-work accounting still pass. Normal-force controls pass;
mirrors, coordinate transforms and refinement retain the tangent defect.
Increasing resolution will not repair this missing transfer.

The current tangent solve applies equal/opposite impulses at separated body
centers. A common application point needs two **body lever arms** for one
contact: the point relative to each center. The relative point velocities,
angular effective mass, equal/opposite force and corresponding moments,
rotational work and sustained integration must agree. A yaw kick added after
the current solve would be inconsistent. The shared impulse primitive also
serves grips and strikes: audit their assumptions before generalizing a fix.

Compare the current model and one effective patch at unchanged aggregate
budgets. Use normal/tangent loads, off-center loads, mirror/translation/rotation,
loss of contact, impossible reach, recovering support and a double team. Require
the independent law oracle, convergence, ordinary anchor/redirect/seal/press
transfer and unchanged-profile native controls. Measure actual cost before
promotion. This audit proves a law gap; it does not prove its football frequency
or that more shoulder rotation will improve every block.

Two independent hands add something only when independent survival/replacement
or a force couple matters. One force point cannot represent a pure two-hand
couple without net translation. A finite patch with bounded moment may suffice;
it must pay from the same arm force/work budget. Do not introduce a free yaw
motor or double strength by adding contacts.

## Development order and what to defer

1. Fix demonstrated bad acquisition/recovery requests using existing movement.
2. Repair shared contact angular transfer before expanding hand technique.
3. Separate contact existence from hand advantage; replace outcome-awarded
   shedding with bounded attempts and preserve independently surviving help.
4. Refine loaded primary/DL refits and double responses from actual geometry,
   load and available cues. A fixed drive request is a hypothesis to test, not
   proof of excessive force.
5. Add independent hand state or attained directional support only if a matched
   witness needs a distinction the simpler model cannot represent.

Defer articulated limbs, 3D feet/soles, detailed gait phases, new cleat-friction
coefficients and dozens of move names. A directional base must be attained
through finite adjustment; rotating a support ellipse with torso facing would
rotate planted support for free. Changes to support should also agree with
brace moments, recovery and yaw traction, not only fall thresholds.

Use a matched 2×2 comparison when both controller and physics are candidates:
old/new controller against old/new contact, with identical bodies and cues.
This distinguishes a better request from a changed physical response. Track
first useful contact, relative approach speed, position angle, body orientation,
support, hand load, remaining access, release and reacquisition. Whole games
come afterward. NFL tracking can constrain comparable movement and displacement;
it cannot directly reveal fingers, grips, ground force, coaching intent or
whether two nearby linemen actually doubled a defender.

## Coaching evidence

The supplied generated books are organizing aids. Existing inspected teaching
and provenance are in [Trenches](../football-handbook/trenches.md). Particularly
useful are [Penree's zone teaching](https://www.xandolabs.com/the-lab/position-groups/offensive-line/run-game-mechanics-offensive-line/pod-teaching-the-inside-and-outside-zone-schemes/),
[Grabowski's inside zone](https://blogs.usafootball.com/blog/1428/building-an-offensive-line-coaching-the-inside-zone)
and [Janak's Duo](https://www.xandolabs.com/the-lab/offense/run-game/tight-zone-run-concepts/the-duo-concept-power-without-a-puller/).

Newly inspected public Thorn prose describes [feet and relationship before the
strike](https://blogs.usafootball.com/blog/6283/usafootball.com/coaches-notes/rcfamilies.com),
[inside access with the drag hand](https://blogs.usafootball.com/blog/6227/how-the-backside-drag-hand-in-outside-zone-benefits-offensive-linemen)
and [gallop/base variations](https://blogs.usafootball.com/blog/6191/how-the-gallop-technique-works-for-offensive-linemen).
Embedded film was not quantitatively reviewed. These examples support the
cue/response model, not universal NFL rates, fixed timings or force magnitudes.
