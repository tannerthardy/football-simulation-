# Outside/wide zone: current diagnosis and plan for Claude

The next gains are **better lateral requests, an earned lateral takeover,
and an attainable useful climb**. The measurements do not demonstrate a
universal engaged-pair speed limit. Keep physical capacities fixed while
repairing those controllers.

Teaching references remain the [trench handbook](../football-handbook/trenches.md)
and [runner's reads](../football-handbook/offensive-skill-and-playcalling.md).
The controller changes below are proposals to test, not measured NFL facts.

Reviewed controller commit `ebff3938494b0e343df4aa00c9b8c492b60e881f`,
without merging or editing it. Native evidence uses combined source
`036b15a9`: that controller snapshot plus previously published physics.
The new preview repair is a separate source, `621ad936`.
[Evidence and limits](../../data/reviews/current/zone-flow-and-climb.json)
retain those stages. The [earlier review](../archive/reviews/wide-zone-guidance-9dbb74f9.md)
is archived; [engaged hand physics](engaged-zone-physics.md) remains the law review.

## What the line-width comparison means

The 1.2 versus 4.5 yd comparison is **displacement by two seconds**, not
an instantaneous speed limit. It combines startup, acquired track, contact,
turning, release and later work. Match formation/front/role and handoff stage
before interpreting the NFL comparison; the existing stretch operator also
infers direction from achieved OL flow and excludes short plays.

Separate body facing, travel heading and the observed key. A running reach
need not keep its entire torso aimed at the defender for every step. Trace
whether the engaged controller replaces an opened-hip track with repeated
shuffle/turn demands; keeping eyes on the key does not require that body pose.
Any different footwork still needs attainable hands, leverage and support.

Eight WZ inputs, both hand modes, provide the following late engaged-OL
observations at 0.9–1.6 s. These are selected mechanism probes, not random
football frequencies:

| Observation | Center | Experimental patch |
| --- | ---: | ---: |
| Pair ticks | 366 | 366 |
| Median playside velocity request, yd/s | 1.48 | 1.64 |
| Requests toward the wrong side | 80 | 70 |
| Requests at least 3 yd/s | 56 | 49 |
| Ticks containing full shared ground use | 245 | 178 |

Ground use includes simultaneous translation and peak turning torque, divided
by traction at the actual support availability. Peak patch torque was checked
against achieved yaw. All intervals remain within the budget. A tick-average
60–80% does not imply that 20–40% was available during the relevant plant.

The same physics yields different Over and Under flow: mean blocker speed is
0.72 versus 1.33 yd/s in center, 0.59 versus 1.43 in patch. Small requests
also deliberately ease toward their desired speed. Matched bodies with equal
requests and no point slip retain exactly the bare-body acceleration while
strong hands transmit zero force. The first request/execution gaps close
through actual hand/contact impulses; stored lean can also oppose a new track.
No stronger traction, weaker steering, or automatic spending of unused force
is justified. Loaded gait/yaw capabilities still need external calibration.

## Climbs: separate these mechanisms

Times below are native controller/event timestamps. A tackle evaluated after
World uses the same event label; its physical endpoint is 50 ms later.
Roster pairs are offense/defense seeds, Ace 11, seed 3, Over/Under Cover 3.

| Witness | What happened | What to investigate |
| --- | --- | --- |
| 31/32 WZ Over, unflipped | C releases at 1.15, acquires LB_M at 2.60 and loads contact at 2.65 | Positive earned transfer and acquisition to preserve. |
| 41/42 WZ Over, unflipped | C releases at 1.15; closest precontact separation is about 1.46 yd versus 1.16 yd strike range; no strike is requested | Acquired prediction, attainable approach and fit transition. C encounters no body collision before first RB contact. |
| 41/42 WZ Under, flipped | Keeper LG has reachable loaded hands, positive control and good support; fixed-frame phi rejects C's departure on nine reads; C releases on the same tick LB_M grasps RB | Keeper/surface eligibility, before changing release urgency or pathfinding. |
| 41/42 WZ Under, unflipped | Double joins late; remaining RT control is weak and RG's helper hands remain unacquired/unloaded | A correct no-release negative. Do not manufacture a keeper. |
| 31/32 WZ Over, flipped | Direct-climbing C acquires and loads LB_M, which later reaches RB | Useful blocking surface and the runner's read; contact acquisition already happened. |

Two OZ transfers reproduce a released-but-out-of-range climb and a phi-held
climb. All eight WZ 1.8 s signatures match prior traces, and one extended
plain replay matches exactly. The two OZ extensions lack individual plain
parity checks; do not treat them as independently certified observer controls.

Across 66 scheduled joined WZ reads, 51 fail physical keeper eligibility,
eight are confirmation reads and seven propose departure. None fails the
later delayed-surface, backer/runner-arrival or exit-route gates after passing
prior gates. This does not establish their frequency in other calls.

For the hard Under example, LG's actual torso-to-DT angle is 0.154 rad at
1.05 s and 0.098 at 1.85; fixed-frame phi is 1.664 and -1.094. Thus the old
frame vetoes a nearly aligned body. This locates a gate mismatch; it does not
prove the remaining blocker can protect the runner's lane alone.

For the engaged LB tackle, C lies upfield beyond LB on the opposite side
from RB. At the 2.70 event's post-World endpoint, LB–RB separation is 0.862 yd,
and C is 1.624 yd from LB. The reach toward RB does not pass through C.
Do not forbid an engaged defender from tackling. Isolate whether the blocker
lost useful position or the back chose a path the blocker could not protect.
Current joint normal/tangent loads were not recorded for that tick.

## Implementation order for Claude

### 1. Keep useful lateral work while anchoring

Use the existing exact RG–DT_S witness: anchor reverses the playside request
on 13/26 inspected ticks. Separate loss of useful depth/support from lateral
co-flow under load. Preserve appropriate tangential work while bracing against
the normal threat. Trace the final request after spacing and snap readiness.
Use actual force/moment vectors where available: scalar tangent load resisting
own yaw is not observed opponent lateral velocity.

Keep a genuinely driven-back blocker, widening defender, lost shoulder,
weak keeper and reflected controls. A faster requested track must still earn
its motion through shared translation/yaw and support. Retain ordinary IZ,
Power and Counter as unaffected cases.

### 2. Give lateral takeovers a coherent keeper test

Review `keeperCandidate`, `readJoinedSurface` and `helperSupport` together.
First compare whether better feet/half placement can satisfy the acquired
surface. Separately evaluate achieved torso, maintained reachable hands,
support, acquired control and the path the keeper must deny. The departing
player needs his own delayed visual evidence of that relationship.

Keep the acquired material/contact frame fixed. Turning the body must earn
its new geometry; do not rotate loaded frames or credit `turnRate * dt`.
Do not replace one phi threshold while leaving contradictory helper/read
thresholds in place. Do not force the weak, unloaded Under double to release.

A departure should remain safe for the down threat and early enough to reach
the backer. Compare the acquired backer flow, remaining approach distance and
runner's arrival window; the current 0.15 s confirmation is not the dominant
bottleneck in these witnesses, so a global timer reduction is unsupported.

### 3. Make the released climb executable

`interceptPoint` can return its smallest-slack fallback when no intercept is
attainable. The climb discards time/feasibility, holds a lead through
`mind.aim`, then combines it with a target velocity updated on another cadence.
Near-fit logic can replace that lead with a shoulder offset several yards out.
These are separate controller hypotheses to isolate.

Keep lead, velocity and uncertainty from one acquired picture. Evaluate a few
candidate moving fits with the player's own body, facing, support and braking
limits. The shared helper now supports:

```ts
previewFreeMovement(a.body, command, sim.t, 12, sim.world.handContact)
```

Use it only after physical release, for empty-space movement. It does not
predict grips, traffic, future cuts or opponent decisions. Carry its sample
time into the acquired backer prediction; an endpoint alone is not an
interception. Preserve limited information and finite read cadence.

Coaching target: get onto a useful shoulder with attainable relative speed,
then establish and sustain contact. Do not sprint at an old center, gather
so early that the backer outruns the fit, or count arrival near him as a block.
Prove actual strike range, acquired hands and useful loaded contact on both
miss witnesses; retain the positive normal transfer and direct climb.

### 4. Grade path protection after acquisition

Record the blocker, backer and runner corridor through contact, plus actual
facing, hand load, support and recovery. Check which side the blocker occupies
when the backer gains access. A loaded block can still protect the wrong path.
Compare blocking intent with the back's personally acquired read; retain a
valid defensive recovery and a genuine runner mistake.

Check sustained hand reach/holding validity separately if a nominal engagement
persists beyond useful physical contact. The current retained-contact trace
cannot certify its last hand load. Coordinate a reproduced shared-law defect
with physics; do not turn the engagement label into a guaranteed exclusion.
Preserve the post-contact tackle-bond guard.

### 5. Reconstruct the actual unassigned calls

All selected Ace, Gun Doubles and Spread examples account for three LB slots,
including H/Y stalk jobs. Inline count arithmetic alone misses those jobs.
Recover the historical 14 unassigned first-contact cases with their exact
formation, front, presnap classification and complete responsibility ledger.

Include down ownership, reserved combo backer, direct climb, WR/TE/FB support,
duplications, attainable arrival and intended unblocked read. A reservation
is not an executable block. `lbNear` reserves by lateral distance; receiver
stalk selection can duplicate that reservation. A walked-up LB can consume
first-level work, and a null combo backer is never assigned later.

Fix missing/duplicate installation locally. Let a player collect new personally
observed work when his old responsibility ends. Preserve legitimate no-spare
fronts: their answers may be a different lane, perimeter support or another
call. Do not invent an uncalled option or globally reassign blockers to the ball.

## Small validation pack and stopping rule

Keep normal Over earned transfer, released Over miss, Under phi-held takeover,
Under weak/unloaded keeper, direct climb and acquired-but-unprotected backer.
Add blocked departure, widening/slanting shade, lost first-level contact,
backer reversal, stale keeper picture and a thin box with duplicate support.
Use both native flips plus exact physical mirrors for claimed symmetric rules.

Measure read → request → achieved path → acquired hands → loaded contact →
access denied/lost. Preserve Inside/Split check-versus-sustained contracts,
Tite's no-premature-climb and a real lost-contact collection positive; compare
Bear's joined reads over a fixed window even without release. After two failed
attempts, re-diagnose the first request/geometry fork. Games and NFL outcome
statistics come after these mechanisms, never as a reason to retune strength.

The physics preview repair passes ten new mode contracts and preserves eight
original default contracts. Current production callers retain the default;
Claude must explicitly select the model when using the new argument. The
angular patch remains experimental, with its existing promotion failures.
The [manual probes](../archive/research/contact-mechanics/README.md#interior-flow-and-climb-follow-up)
repeat the immutable evidence stage in a fresh ignored folder.
