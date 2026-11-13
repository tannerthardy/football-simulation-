# Zone reach: contact surface, run-off and displacement

## Status and where to start

This increment follows the [run-technique review](offensive-line-run-technique.md)
and [keeper/approach implementation](ol-technique-implementation.md). It repairs
a reproduced early outside/wide-zone wrong turn. It does not install every zone
combination, backside cutoff, perimeter concept or literal foot technique.

The important distinction is **where the blocker is trying to fit his body**
versus **where he is trying to drive the defender**. Lateral stretch cannot
also define the opposite shoulder as the only legal contact surface. A small
stable reference lets real bodies and forces execute either a reach or run-off.

## The ordinary defect

In the previous fixed wide-zone Over/right/seed3 clip, RG owns DT_S. At
.30–.45 s the consumed defender picture stays around (40.9, 25.108). The
installed stretch drive is (.486, -.874), and the nominal reach aims .524 yd
toward the playside shoulder. The generic fitter reconstructs the contact
surface opposite that displacement vector and instead aims about .539 yd
the other way.

Requested y velocity is +1.276 to +1.455 yd/s, away from the called right side.
Native ground impulse turns achieved y velocity from playside movement to
+.106 at .40 s and +.343 at .45 s. There are no hands, arm loads or body
contacts in this interval. The wrong turn is an actual controller-to-ground
effect before contact, not a strength deficit or a tackle breaking the block.

The saved four OZ/WZ clips contain 19 healthy original solo-reach pre-contact
updates with this opposing projection; 13 request relative movement away from
the playside. This is a trace count in four fixed diagnostic plays, not an NFL
frequency. First contact on the backside can be legitimate run-off or combo
work, so backside contact counts alone are not blocking-error rates.

## Teaching and reduced installation

The [verified coaching sources](offensive-line-run-technique.md#primary-and-public-coaching-evidence)
distinguish an even defender from a widening one. The blocker tries to attain
the playside surface, but a widening defender may be stretched from inside;
the resulting RB cut depends on the actual leverage. An outside hook is not
automatic. Staffs differ in their exact foot vocabulary and installation.

The controller uses three intentions:

- **Reach:** an even or potentially attainable hip gets a gathered outside
  approach and an outside surface goal during contact.
- **Run-off:** a widening hip that the short movement estimate does not expect
  to overtake gets an inside/near-surface fit and the original lateral stretch
  drive. Maintaining useful inside contact is valid football work.
- **Seal intention:** the consumed picture shows an upright blocker outside,
  within contact distance and longitudinal fit, with a sound vertical loss
  angle. He requests the outside finish. This label is a read, not a measured
  successful seal. Delayed vision can be wrong; actual load and position are
  separate evidence.

An attained outside picture takes precedence over a widening cue because our
own contact can make the defender move outward. Later pictures can change the
intention; no phase permanently awards the leverage. Existing placement error
and support limitations remain.

## Implementation and physical limits

`zone-reach.ts` makes the read from a consumed defender picture and the
blocker's own body state. Its short .1–.4 s lateral estimate uses existing
locomotion, support, fatigue and traction. It holds initial facing/acceleration,
omits traffic/contact and does not simulate future yaw or gait. It is a cheap
read aid, not a certified reachability bound or a new physical capability.
The horizon is a prediction window; elapsed play time does not trigger a phase.

`RunBlocker.zoneRead` stores the consumed cue, intention and estimate at the
player's existing decision cadence. Reads continue during his owned solo
contact. Between them the intention persists. The original installed stretch
drive is retained separately, so an early vertical fit does not erase the
later run-off option. Fresh foot requests still use ordinary delayed pictures.

The scope is solo OL `reach` jobs in OZ/WZ. Initial live combinations, cutoffs,
inside zone, toss, gap jobs, Draw, stalks and unrelated body constraints keep
their existing controllers. Earned solo keepers can use the same technique;
physical helper ownership is not silently rewritten.

The gathered approach reuses the existing body-clearance arcs and moving
arrival helper with the existing 2.4 yd/s strike-through intention. A vertical
fit frame keeps the requested playside surface intact. The controller still
requires real hand reach, and a genuinely crossed or off-feet player can lose.
It creates neither a remote hand joint nor an automatic outside position.

An optional `Engagement.surfaceAxis` holds the acquired contact reference while
`drive` remains the displacement intention. New solo zone hands acquire the
vertical fit reference. Existing real hands arriving through another job keep
their original reference; the desired world-lateral offset is projected into
that frame. The reference is never realigned to make the current bodies fit.
Without this separation, changing
vertical reach to lateral WZ run-off would rotate the failure reference about
61 degrees and could cause a shed without any body motion. This is one reference
vector, not an anatomical or solver expansion. A separate real-contact control
reproduced the reverse transition: promoting a sound diagonal inside-hip rep
to vertical changed its loss angle from -.479 to -1.156, releasing its hands
at the next engagement update despite unchanged bodies. Retaining the acquired
frame preserves the physical rep through that update. The same stable frame supplies
measured contact angle, helper support and keeper-transfer geometry. Explicit
drive supplies ground intentions; it does not directly apply a magic force.

The desired surface angle is +.3 quarter-turns times play side for the outside
fit and the opposite for inside run-off. Those are reduced controller landmarks,
not NFL-fitted physical constants. Actual achieved body position is not set
from them. A later physical helper retains the stable frame and uses the
explicit displacement drive; the solo zone controller pauses its reads while
helpers are present.

Existing hands, control, contact reach, arm budgets, ground traction, balance,
work accounting and World resolution stay intact. A new intention does not
rebuild the joint, reset hand control or move either body. Actual normal and
tangential hand forces still come from the physical body geometry.

## Validation and remaining work

The diagnostic panel uses 40 ordinary OZ/WZ snaps across five fronts, both
directions and seeds 3/11, plus eight installed non-zone controls. All inputs
use the same .55 generated roster pair and Ace 11/Cover 3. These are balanced
football checks, not league frequencies. Full films are selected before
outcomes: four zone plays plus all eight controls, paired by source.

Check consumed read versus actual motion, first useful contact, inside/outside
position, continuing native hand load, and requested versus delivered movement.
Do not infer a completed seal from a phase label or a reduced stuff count.
Preserve all adverse outcomes and use broader run/game guards separately.

The final source has 48 matched initial states, 96 observed/plain checks and
all eight non-zone complete executions unchanged. Each zone concept has 39
original installed solo-reach pairs; 17 initial covered owners with a live
combo are excluded from this acquisition metric.

| Measured acquisition | Outside zone | Wide zone |
| --- | --- | --- |
| Playside center at first surviving hands | 18→30 / 39 | 19→30 / 39 |
| Playside center, loaded paired hands and positive own tick arm impulse | 15→25 / 39 | 14→23 / 39 |
| Mean completed first-hand boundary | .791→.632 s | .858→.636 s |

The second row binds genuine paired hand load to player-wide positive arm
accounting; it does not assign every arm impulse to that joint. Playside center
is a measured body offset, not proof of a completed outside seal. Contact
times are completed tick boundaries; recorded tick starts are .05 s earlier.
The fixed early RG wrong-turn interval now requests about -2.34→-2.21 yd/s
and achieves -.40→-.80 yd/s at .40–.45 s, with no hands or collisions. A
separate OZ-left RG run-off at .80/.85/.90 s keeps inside center offsets
-.364/-.341/-.315 yd and native arm impulses 51.3/48.2/46.8 kg·yd/s below
the 71.42 budget. Real bodies carry inside contact without an awarded hook.

Across the 40 zone snaps, mean gain changes 1.598→1.763 yd, stuffs 14→7,
earned climbs 15→13 and 10+ runs 0→1. Five losses of at least two yards are
retained. The pooled gain increase is especially fragile: one OZ
Odd/left/seed3 run changes 4.42→10.73 yd and supplies 6.31 of the 6.61
incremental yards. Acquisition alone does not solve lane use or shared blocking
sequence, and the mean is not broad evidence of improved rushing efficiency.

There is one new OL fall: OZ Under/left/seed11 LT stays on a real legacy DE_S
block, then the runner contacts his body in the recorded 3.00 s tick.
The native runner collision impulse is 177.3 kg·yd/s at 2.475 yd/s closing
speed, alongside a DE_S collision; support changes from up to contact-driven
falling. Arm impulse remains within budget. This is a real teammate collision
after sustained contact, not a phase flag forcing a fall. RB obstacle use and
traffic coordination remain unresolved and this adverse case stays published.

The independent 144-play guard has 96 complete non-zone executions identical;
mean gain changes 1.585→1.696 yd, stuffs 39→33 and 10+ runs 3→2. All 64
isolated tackle executions match exactly. Two game guards finish without
timeouts or motor-budget excess. Their rushing paths and later passing/score
paths diverge: one game's rush average falls 1.522→1.477, while the other rises
2.027→4.041 with four 10+ rushes. These tiny samples are regression evidence,
not NFL averages or isolated estimates of this technique's scoring effect.
The physical panel conserves momentum/work within about 1e-12/1e-11 native
units and has no motor-budget excess. Timed collectors include instrumentation,
plain reruns and shared machine load; they are not solver speed benchmarks.

The first `c0f71ae6` prototype and `4cd9284e` pre-transition phase preserve
identical complete physical executions across all 48 inputs. Final
`cf53e3f0` retains existing acquired frames and bounds the read's traction
estimate by support availability. Thirteen complete executions change from
the pre-transition version; each first diverges at a retained legacy-frame
decision on identical bodies. Exact patches and both intermediate sources'
measurements remain available for review.

The 18 focused controller/contact tests include mirrored loaded legacy-frame
transitions through the next engagement update and a real bounded World step.
The baseline passes the five unchanged controls and fails the 13 new-feature
cases. All 732 TypeScript tests and 22 Python tests pass; typecheck and build
pass. Their results are recorded with the
[evidence and rerun commands](../../../data/reviews/physics-world/zone-reach/README.md).
Watch the [24 paired clips](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/zone-reach.html) or
[offline ZIP](https://github.com/tannerthardy/football-simulation-/blob/663193dfe7fe362d4f59072ef136437f881f1086/viewer/zone-reach.zip). Native panels distinguish stored
read, actual acquired frame, body position and delivered force/work.

Next comes coordinated zone contact: brief post/check/climb, actual overtakes,
and front-specific helper responsibility. Backside cutoff/hinge, achieved
kick/log traffic and missing Draw/perimeter installations remain separate work.
Do not alter force capacities to make those controller mistakes disappear.
