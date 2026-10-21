# Narrow cutoff surface experiment, after C promotion

Read-only design against frozen C source
`246931590ef723662a4e6178755660185b13487efe2a7d7e8dce503710b08469`.
No source/tests edits, simulations or new validation framework. Implement only
after C's adverse review and promotion. The reproduced B evidence remains in
`cutoff-next-witness.md`; it is a diagnosis, not a D-versus-C result.

## Recommendation

Give a **solo wide backside cutoff** an explicitly intended contact surface,
independent of its displacement vector. Feed that same surface to its own
observed approach/loss decision and to the initial engagement geometry. Use
the existing bounded arrival near the fit; leave loaded contact frames fixed.
Keep inside-shade collection, other run techniques and the physical World
unchanged. This is an installation/controller repair, not more biomechanics.

The failure is Power/Under/left/S3 RT against DE_W. Its nominal shoulder
`(-.3,+.374817)` projects only `+.0001143 yd` onto the current reverse-drive
frame. First actual hands land within 2.17 degrees of that instructed shoulder,
yet the old frame measures phi .9757 and releases for leverage at 1.55s.
Normalizing that **installed wide-edge shoulder**, not the achieved body,
gives axis `(-.62488094,+.78072006)`; the saved same-body first-contact vector
would measure phi `-.0241195`. That last number is only a geometric diagnostic:
the new approach and engagement will alter subsequent native trajectories.

The contradiction persists in C's **existing** six-native
`witness-after.json.gz` (`CA-R1-power-under-L-S3`), with the same alternating
own-cue commands at .55/.60 and 1.00/1.05, real hands at 1.10, reverse-drive
axis, and RT leverage loss at 1.55. C's full `candidate-film.json.gz` also
retains the same first native RT body vector, phi .9757289, control .3087587,
normal -93.4907/tangent -387.3569 and support1. C now gains2.00 yd rather
than B's3.86 because other play decisions changed; the individual discrepancy
is preserved. Source identifiers match frozen C and the six-native observed
signature matches plain execution. No C resimulation was needed.

The full C right Power mate retains first phi -.975459/control .767245 and
leverage loss at2.95. C's two Split/Tite controls retain first phi
-.197408/+.245697, support1, and no local cutoff shed through natural end.
Their whole-play results are .01/1.18 yd, not an acceptance target.

## Small data/API change

Reuse Engagement's existing `surfaceAxis` and `sealTarget`. A small shared
type in `agent.ts` makes the optional input explicit:

```ts
interface RunContactSurface { axis: Vec2; sealTarget: number }
// RunBlockPlan:
contactFit?: RunContactSurface & { target: Agent };
```

`target` binds this installation to its intended down threat. The field is
optional; ordinary fixtures/callers retain their current behavior. It is not
another rating, a strength bonus, an acquired position or a read of the future.

Add an optional final `surface?: RunContactSurface` argument to
`PlaySim.engage` (`playsim.ts:485`) and `createEngagement`
(`engagement.ts:128`). For a **new run engagement only**, copy its axis into
`e.surfaceAxis` before `axisOf`, initial measured phi, working side, punch and
joint creation. Set its requested `sealTarget` explicitly in the run creation
branch. Without the argument, retain the current reverse-drive frame and
generic reach-seal initialization exactly. Ignore the optional surface for
pass work and when returning/joining an existing engagement; never overwrite
the primary's established frame with a helper's plan.

An explicit zero seal target means "keep this selected useful shoulder";
otherwise the generic reach initialization would add another lateral seal
to a frame that already describes the cutoff's inside shoulder. The call
continues to request its ordinary diagonal displacement independently.

## Installation scope

At the final installation pass in `planRunBlocking` (`blocking.ts:644`),
consider only OL plans with `kind === 'cutoff'`, a down target, no combination,
and a backside blocker. Select the explicit surface only when the assigned
defender is **clearly outside** that blocker's aligned torso:

```text
ps = installed run side
(blocker.y - ballY) * ps < 0
(blocker.y - target.y) * ps > blocker.radius + target.radius
axis = normalize({ x: -.3, y: plan.drive.y * .6 })
contactFit = { target, axis, sealTarget: 0 }
```

This proposed boundary represents a clearly outside body, rather than a new
tuned football-distance threshold. It uses the existing installation's
alignment and ownership, not the defender's roster position, front name,
play ID or success. Retaining the current shoulder direction is justified
only for this diagnosed wide-backside responsibility; it is not a universal
cutoff rule or proof of ideal NFL head placement.

The saved initial own images support the distinction:

| Ordinary installation | Blocker home y | Assigned target initial y | Outside separation |
| --- | ---: | ---: | ---: |
| Power/Under/L RT → DE_W | 24.06667 | 21.81936 | +2.24730 yd |
| Power/Under/R LT → DE_W | 29.26667 | 31.61936 | +2.35270 yd |
| Split/Tite/R LT → DT_W | 29.26667 | 28.93259 | -.33408 yd |
| Split/Tite/L RT → DT_W | 24.06667 | 24.33259 | -.26592 yd |

The first two get an explicit wide-edge surface; the latter two retain their
existing inside-collection frame. Draw conversion and reserved pull/kick work
do not get this installation. Do not select a different frame from where the
body happens to be at first hands.

## Approach/contact wiring

In `RunBlocker.attack` (`blocking.ts:767`), consume the existing one `seen`
picture. An installed fit is active only for an OL cutoff with the exact
bound target, no live combination, and the current free-fit admissibility.

1. Use `fitDrive = -contactFit.axis` as the geometry reference for
   `observedBlockLeverage` and `chooseRunBlockFit`. These helpers already
   accept a fit reference different from actual `plan.drive` for stretch zone.
   Clarify the parameter name/comment if helpful; their arithmetic need not
   change and a second geometry function is unnecessary.
2. Aim at `seen.pos + contactFit.axis * (bodyContact + .15)`, the existing
   common fit clearance. Apply the ordinary placement error once, as now.
   Near this explicit wall fit, use the existing `settle=true, through=0`
   bounded arrival. Far away the current distance guard still returns the
   ordinary approach. This gathers the feet for the cutoff; it does not
   grant acceleration, movement or contact.
3. Keep the observed loss boundary 1.1 and actual distance/reach checks.
   A stale favorable picture may still attempt a bounded swipe on a genuinely
   bad current fit, which the actual native engagement must then reject/lose.
4. Pass the valid `contactFit` to `sim.engage` as the optional creation surface
   while passing **unchanged `plan.drive`** as displacement. Do not repair
   `e.phi`, control, bodies, existing hands or support after the strike.
5. Keep `e.surfaceAxis` unchanged throughout loaded contact, including new
   helper joins, ownership transfer and later instruction changes. Shared
   `axisOf`, real keeper admissibility and C's own delayed keeper read already
   use this persistent frame; no new C attention rules are needed.

Clear the plan's contactFit when work is reclassified/exchanged to a different
target, penetration is collected as drive work, or a climber leaves for the
backer (`classifyWork`, collection and `applyCombinationRelease`). The exact
target/kind guard is a second defense against stale metadata. Keep the actual
keeper engagement's acquired frame intact. This experiment does not extend
the original-helper policy beyond its IZ/split installation.

The old displacement is almost tangent to the proposed useful surface. That
is physically permissible as a request, but may produce weak pushing, finite
holding or loss in the native solve. **Do not claim the geometric repair
guarantees a sustained block.** If the unchanged drive merely peels the player
off, diagnose that native result before changing displacement intention.

Useful means the OL remains between this explicitly outside threat and the
installed inside run corridor, with attainable feet and actual loaded hands;
it does not mean the player merely faces the defender or reaches any radial
spot. That geometric relationship must be installed **before movement** and
verified independently of the acquired frame. A defender who crosses the
blocker's inside shoulder toward that corridor is still a genuine loss even
if a later sideways pose would look square in some rotated frame. This patch
does not dynamically redefine the corridor or rotate the frame to follow him.

The unchanged gap-cutoff displacement points upfield and toward the run side.
In the proposed fixed interior-shoulder frame it has almost no normal component:
it requests moving laterally with the run, not driving the DE outward. A true
hinge may instead need supported positioning/containment first and only then
movement with flow. Keep that a separately diagnosed controller intention
question. Accept this experiment only if native relative motion/load shows
useful containment; reduced phi alone is insufficient. Do not quietly change
drive, set a pose-perfect frame and label the combined outcome a surface fix.

## Acceptance with current tests and native records

Extend the existing fit/contact tests rather than adding a new test harness:

- **Installed responsibility:** both Power wide-edge inputs acquire the
  explicit surface; both Split/Tite inside-shade inputs remain unchanged.
  Head-up/slightly shaded and reserved/draw/combo cases retain their prior
  frames. Renaming a defender's roster position must not change selection.
- **Exact mirrored controlled pair:** use the same bodies/ratings/RNG and
  reflect y, y-velocities, facing, drive, surface and signed placement error.
  Advance the ordinary World and Engagement logic. Requests, attained body
  movement, measured phi and bounded hand loads mirror. The natural LT/RT
  witnesses are not substitutes for this same-capability check.
- **Truthful bad fits:** deliberately put the body on the wrong side/late,
  then move only the target's unseen current body after recording a favorable
  image. Desired axis stays fixed; actual leverage remains bad and cannot be
  normalized away. Ordinary collision/shed/holding rules still apply.
- **Persistent surface:** later drive changes, helper joins and direct
  `engage` calls retain an already acquired surface and existing joint identity.
  No body/control rewrite or extra RNG/vision read occurs during installation.
- **Changed work:** a former cutoff assigned a backer or inside penetration
  cannot carry the old outside-edge surface into that approach. A collected
  immediate inside threat remains accounted for.
- **Native invariants:** ordinary force/work/traction/support bounds and
  residuals hold; successful contact carries nonzero physical hands load.
  Keep ordinary square/down and established diagonal-zone controls unchanged.

Run the four natural witnesses at the final candidate and compare to the
**promoted C** baseline, with the same roster/call/seed. B's detailed films
remain prior diagnostic evidence; do not attribute a later C→D difference
to a B→D comparison. Reuse immutable C cached native outcomes and its existing
ten-film `candidate-film.json.gz`, which already includes both Split/Tite
controls. No additional C baseline simulation is needed for these witnesses.

For the wide-edge failure, inspect own consumed image/request → first actual
hands/phi → native force/support → actual disengagement reason. Removing a
frame-only early leverage loss is meaningful; merely turning a bad acquired
pose into phi zero is not. A defender can still win fairly and rushing gain
need not rise. The two successful inside-shade controls must preserve their
old local approach/frame/load behavior; whole-play incidental interference
from another changed wide cutoff must be identified separately.

Add the optional contactFit's target/axis/sealTarget to existing plan and
initial projections/native films. It is a changed installation input and
must not disappear from observer-neutrality/parity checks. Baseline absence
can be represented as null from pinned source, without fabricating reads.
Call/roster/profile/snap/cadence match; report the intended installation-field
difference instead of requiring those intentionally changed plans to hash
identically. Any wrappers around engage must forward the new optional argument.

After focused acceptance, reuse the ordinary 160+2 matched panel to check
collisions, falls, unresolved DL, penalties and run/contact breakdowns. Broaden
only for a new failure. One final frozen suite/typecheck/build suffices; no
global physics-resolution increase, special strength law or league-yardage
tuning belongs in this patch.
