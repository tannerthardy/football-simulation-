# One reproduced cutoff failure, with contrary ordinary controls

Read-only diagnosis from **pinned Phase B** evidence, before joined attention:

- `data/reviews/physics-world/zone-helper-check/candidate.json.gz`
- `data/reviews/physics-world/zone-helper-check/candidate-film.json.gz`
- source SHA `d6dfa190412da52725780c71db02f73305b3e3f5541b4c8e9d755a3296ee568f`,
  committed as `4e2abaf`.

No source/test edits, additional simulation, or new collector. The saved native
films contain each actual RunBlocker update, consumed pictures, command,
engagement snapshot and following World load. These records supply the own
pictures missing from the compact 162-trial update subset. Every case below
finished naturally and its recorded/plain execution signature matched.

## Failure: CT-R1-power-under-L-S3, RT against DE_W

Ace 11, Power left, 4-3 Under/Cover3, roster31/32 at strength .55, seed3,
LOS40. RT's installed job is solo cutoff with
`drive=(.7808688094,+.6246950476)`. It is not a helper or failed transfer.

The player largely reaches the shoulder his controller requests. The inferred
contact surface nevertheless puts that shoulder almost ninety degrees around
the displacement frame. The approach controller then flips between a recovery
fit and full-speed pursuit around its hard lost-angle boundary. Real finite
hands load, but the leverage rule releases the block .45s after acquisition.
This is a concrete controller/frame discrepancy, not a finding that the body
needs more strength or traction.

| Tick | RT's actual consumed picture / choice | Following native response |
| --- | --- | --- |
| .55 | Own DE image age .25s; pos(40.80157,22.01022), vel(-.32800,+.63596); inferred observed phi1.09762. Requests(3.52220,-6.71594) yd/s. | Upright; actual velocity(.90928,-1.02882), no hands or fall. World does not obey the requested sprint instantly. |
| .60 | Own observed phi1.10667 crosses lost boundary1.1. Requests bounded fit(-.12728,-3.64845). | Actual velocity(.78450,-1.25866), no fall. |
| 1.00 | Own observed phi1.11640; bounded request(-1.45973,-3.40849). | Actual velocity(-.71814,-1.92864), still upright. |
| 1.05 | Own observed phi1.07421 falls just below1.1. Requests(3.53211,-6.71074), returning to original sprint. | Actual velocity(-.52043,-1.76724). |
| 1.10 | Own DE picture pos(40.310447,22.256973), vel(-.380577,-.150747), age .25s, pose up; observed phi1.03485. `sim.engage` acquires physical hands. | Joint5 loads during[1.10,1.15]. Post-step actual phi .97573, hand control .30876; upright/support availability1. |
| 1.55 | Before solve, actual member phi1.12099; control .32428, upright. | `shed` event at1.55, note `run: leverage`; joint5 disappears. No OL fall caused the loss. |

The first engagement's `e.phi` stored after technique update is1.01068;
post-step actual member phi is .9757289. These are different boundaries,
not conflicting measurements. The creation clamp had temporarily put phi at
.95 in the controller snapshot; the subsequent measured leverage remains poor
in that selected frame.

### The geometric mismatch

Current cutoff nominal offset from the observed defender is
`(-.3, drive.y*.6)=(-.3,+.3748170285)` yards, before placement error.
The contact frame defaults to the reverse of drive:
`axis=(-.7808688094,-.6246950476)`.

Their dot product is **+.0001143014 yd**, effectively a tangent rather than a
useful front surface. `chooseRunBlockFit`'s positive-dot early return therefore
keeps the original sprint whenever the inferred lost angle is just below1.1.
This explains the .55→.60 and1.00→1.05 command flips using actual consumed
pictures; it does not require assuming instantaneous movement or inventing RNG.

At the first completed hand solve, RT is(39.605581,23.136243), DE_W is
(40.332202,22.295757). RT's relative body vector is(-.726621,+.840486): its
angle is only **2.17076 degrees** from that nominal cutoff shoulder. In the
reverse-drive frame, however, the same actual position has phi .97573,
about87.8 degrees around the frame. The approach landmark and contact
assessment disagree about useful positioning.

The exact execution-error-adjusted aiming point is not separately saved, so
2.17076 degrees compares against the nominal installed shoulder, not a claim of
perfect technique. The requested command, consumed image and achieved body
position are directly recorded, not reconstructed through extra observations.

### This was real bounded contact

The initial loaded joint has normal force **-93.49074** and tangent force
**-387.35690** kg·yd/s²; the negative normal denotes a bounded hold, not a
positive driving push. RT's hand budget is not empty:

- arm impulse19.92397 versus limit60.55078 kg·yd/s;
- arm work6.56294 versus limit181.65234 kg·yd²/s²;
- ground impulse(28.64100,22.81437), magnitude below traction limit85.08245
  kg·yd/s;
- own support state up, availability1, no native fall.

At1.50 the same joint transmits normal679.20932 and tangent397.69669 with
arm impulse39.35378 below60.54220. At1.55 it ends through the measured-angle
leverage rule while RT is still upright with positive control. It is not a
missing-contact recording or insufficient solver-load issue.

The complete play gains3.86 yd and ends by tackle at4.55. That outcome does
not rescue or condemn the individual block; the diagnosed issue is the
inconsistent requested surface and eventual leverage loss.

## Natural opposite-side mate: Power/Under/right/S3, LT

`CT-R1-power-under-R-S3` uses the same roster pair/seed and opposite call side,
with LT against DE_W. This is a natural left/right mate, **not** a physically
mirrored identical body experiment: LT and RT have different traits/pictures.

Its drive is(.780869,-.624695); nominal offset(-.3,-.374817) again projects
only+.000114301 yd onto the reverse-drive axis. At1.00, LT consumes his own
DE image age .30s and acquires joint5. Completed actual phi is-.975459;
body relative direction is2.195 degrees from the nominal shoulder. Same
geometric mismatch, opposite sign.

LT's hand control is stronger, .767245 at acquisition versus RT's .308759.
The native pair loads and stays supported until a leverage shed at2.95;
it lasts1.95s rather than .45s. Thus the mismatch does not mean every wide
cutoff immediately fails, and player/defender execution differences remain
material. The right play gains7.11 yd and ends at4.75.

## Successful cutoff control: Split Zone/Tite/right/S3, LT

`CT-R1-split_zone-tite-R-S3`, Gun Wing12, same roster pair/seed, gives LT a
cutoff on **DT_W**, while the slicer reserves the outer edge. This inside-shade
responsibility is a useful contrary case.

At.50, LT consumes his own up DT_W picture age .30s, pos(40.9,28.932591),
stationary in the delayed sample. Observed phi-.264739 is useful in its
installed diagonal frame. The first solved native hand pair is joint2;
completed actual phi-.197408, control .732750, support availability1.
The first loaded impulse29.07120 is below65.61827 and no fall occurs.

The same real joint persists, transmitting normal718.005 at.55,
1086.805 at1.00 and1072.794 at2.00 kg·yd/s². Actual phi stays near-.20 to-.25
with support up and no shed event before the play ends at2.80. The run gains
only .01 yd; good local cutoff work does not guarantee a successful run.

The natural left mate, `CT-R1-split_zone-tite-L-S3` RT→DT_W, also acquires
useful contact (.45, completed phi+.245697/control .477909), remains loaded
without a shed and ends at3.15 for .93 yd. Its differing body/picture prevents
calling this an exact mirror validation.

Importantly, successful LT's actual relative body direction is about59 degrees
from the old generic cutoff nominal offset, although it is well placed in its
current surface frame. **Normalizing the current nominal aim for every cutoff
would damage this control.** Neither actual position at acquisition nor the
old aim alone supplies a universally correct desired surface.

## Minimal next change to investigate

Separate **intended useful contact surface** from **eventual displacement**
in the existing shared fit/controller interface, beginning only with the
reproduced wide backside-cutoff installation. That desired surface must come
from responsibility/alignment: a wide backside edge with the blocker between
him and the run corridor differs from an inside shade that must be collected
before hinging. Do not derive it from achieved body position just to make
phi zero, and do not change all run contact frames.

Use the same intended surface for approaching the useful shoulder and
assessing the first acquired leverage. Keep it stable once loaded, while
retaining independent displacement/seal intent and all existing movement,
traction, arm/work and support constraints. Existing `surfaceAxis` and common
bounded fit machinery provide the necessary hook; no new physical solver is
required. A new controller read may change technique requests after observing
flow, but must not rotate a loaded contact frame to erase a genuine loss.

The minimal acceptance cases are this failure, its natural opposite mate,
these two successful inside-shade controls, and a **controlled exact mirror**
with the same bodies/capabilities. Add a deliberately wrong-side/late cutoff
that must still lose, and a penetrating inside threat that must still be
accounted for. Judge common contact/approach coherence, native loaded
retention and supported movement before rushing means. Changing the1.1 loss
threshold, raising traction/strength, or granting the actual acquisition frame
automatic zero leverage would hide the discrepancy rather than fix it.

This diagnosis gives no unique NFL footfall/head-placement truth; the reduced
model and recorded tracking are insufficient for that. It also does not prove
that100/112 previously flagged cutoffs failed. One concrete loss and the
contrary controls justify a narrow shared-surface repair experiment.
