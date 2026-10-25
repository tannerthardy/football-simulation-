# Angular contact: physical repair before more hand techniques

Status: the timing repair and material hand-point API pass their law checks.
Production still selects `handContact: 'center'`; the coherent `patch` option
has not passed its unchanged football promotion controls. This is a mechanism
repair, not a change selected to improve scoring or rushing averages.

The later [sustained-contact review](sustained-contact.md) adds a production
get-up torque-budget repair and an opt-in bounded yaw response. Its passing
laws and failed promotion controls have separate source pins; numbers below
remain measurements of this earlier hand-point stage.

## What was actually wrong

The old hand constraint transfers sideways force between body centers without
the corresponding body moments. A hand on a shoulder therefore cannot turn
the opponent correctly. The common-point prototype repairs that isolated law,
but diagnosis found another error when hands and torso impacts act together:
the hand point was frozen before an instantaneous torso impact while travel
used the velocity achieved after it. The two individually lawful channels then
left an angular-momentum debt. In one free-body fixture it was 0.02545 at one
substep, 0.000502 at 12 and 0.0000360 at 48, with mirrored signs. Increasing
resolution hides the error; it does not fix its cause.

The same fixture exposed delayed body rotation. A start-of-interval impact
gave a body spin, but its facing did not advance with that acquired spin until
the next interval. Translation and rotation used different physical timing.

In patch mode, the existing torso solve now finishes before the hand frame is
constructed. Its acquired yaw advances during the same remaining interval.
Hands remain bounded finite forces with centered travel. Endpoint relaxation
has no remaining travel time. The repair adds no force capacity, damping,
global substeps or solver passes. Legacy center mode retains its previous
behavior while promotion is unresolved.

## What an achieved shoulder force now means

`HandJoint.contact` optionally identifies one persistent material torso point
in either body's local frame. With that point, `extension` measures the other
body center's distance to the point. Without it, the reduced shared-point
model remains. A release and a new reach must establish a new contact; a
controller must not slide a latched point around the torso to follow it.

The solver transforms that material point to a common world point. Both bodies
receive equal and opposite impulses there. The same moment arms enter relative
point velocity, effective mass, delivered rotation and work accounting.
Normal force can now turn a shoulder as well as steering force. The body-wide
arm impulse and work budgets remain shared; one hand gets no special bonus.
Material points outside the target torso, nonfinite points and their use with
legacy center mode are rejected.

Two coincident half-capacity hand connections now share one compliant row,
rather than creating two springs. Distinct material points remain separate.
The branch audit demonstrated why this matters: two coincident half-cap hands
produced 12.84% more load in an unsaturated free-body fixture, even though their
total force and work limits were respected. Matching capacity alone did not
preserve the physical connection.

This is a reduced planar contact model. It does not add articulated arms,
automatic hand acquisition, a physical chop, holding judgments or a complete
angular model for all grasp and strike channels. Material-point orientation
over a force interval remains a numerical approximation that needs refinement
checks. A lawful impulse is necessary evidence, not proof of good football.

## Why the corrected law is not the default yet

The final promotion run at source `97612098` remains 43/50: five football controls fail,
alongside two preserved legacy hash expectations. The football failures are
wrong-side helper contact, recovered keeper confirmation, native Split Zone
Under check/climb, Tite unfinished work and Bear release. Their assertions are
unchanged. That run uses the reduced common point; explicit material-point
experiments also fail sustained keeper controls, so no production caller is
switched to a selected shoulder point merely to pass a short assertion.

The helper's first divergence is already explained more narrowly. Before any
torso collision, simultaneous body turns create shared-point slip that the old
center constraint never saw. The corrected impulse opposes that slip within
its force limit. The blocking controller then interprets tangential load as
opponent lateral motion, although the load can resist the players' own turns.
At the first identical-state decision fork, that inference reverses the
blocker's lateral request.

Removing only that cue passes three short checks but still loses the keeper
in both longer mirrored continuations. Delaying yaw by one tick merely moves
the crossing past a read. Neither experiment is a complete repair. Keep the
law; distinguish observed body flow, attained hand load and rotation in the
controller, then test maintained seal geometry and footwork. Do not increase
strength or relax a keeper assertion to recover the old outcome.

The geometry-only controls keep a point on the defender's torso and preserve
the native acquisition slack. A fixed front point passes the short keeper check
but sheds at 2.10 s; acquisition-facing points pass both helper mirrors but
shed the keeper at 2.00 s. The implicit midpoint sheds at 1.90 s. Both material
choices lose contact in longer mirrored continuations. These are selected
diagnostic fixtures, not measured football error rates or grounds for picking
a universal shoulder location.

## Branch and ownership boundaries

`claude/pass-rush-hands` at `724a94c` was inspected, not merged. Its stored hand
angles never reach World, its held contact relocates each decision, and its
chop removes a hand after an unsolved force comparison. Haptic feedback reads
only the primary connection. Importing it wholesale would also import the
separately rejected load package from `claude/run-blocking`.

The useful next step is to reconnect its technique experiment to achieved,
persistent contact points after the law and football controls pass. Verify
that one recovered shoulder hand actually changes the rusher's trajectory or
arrival time, that two hands respect the same budget, and that a new grip is
reached rather than teleported. Holding and chop execution remain separate
controller/legality tasks.

The [workboard](../WORKBOARD.md) assigns this session shared physics,
tackling and catching. Run-blocking, pass-rush, pursuit and coverage controller
work needs coordination with its owner. No direct communication with another
chat session is implied. Existing pursuit and moving-catch repairs are already
on this branch; do not duplicate them.

## Evidence and checks

At engine source `97612098c8fdcbde2a47905e461a8592595759db1e2c0922c68cc31af5d2e1da`,
all **1,298 TypeScript tests in 111 files** pass (140.15 s with concurrent
diagnostics), along with **141 Python checks**, typecheck and build. The default
center policy's two frozen hashes still pass. No new full-game improvement is
claimed: default execution is retained and experimental promotion is blocked.

The permanent law tests are
[torso and mixed-channel transfer](../../test/contact-angular-transfer.test.ts)
and [hand transfer](../../test/hand-angular-transfer.test.ts), plus
[35 material-point tests](../../test/hand-force-point.test.ts). Keep isolated
channels, mixed channels, mirrors, work limits and multiple resolutions.
Those point tests independently check normal shoulder torque, tensile force,
passive steering, coordinate rotation, invalid contacts, achieved force/moment
outputs and exact unsaturated coincident-row equivalence. Eight analytic normal
cases fail on the frozen pre-API source `929fbda8`. The 144-case hand oracle
passes; a separate 36-case shared-body law audit closes angular momentum within
`5.12e-12`, linear momentum within `3.02e-13` and work within `3.56e-13`.

The existing redirect refinement panel is now selectable with `--common-patch`.
Across nine seed/power combinations, all tested resolutions agree with 192
steps on falls and corner outcomes. At 12 steps the largest closest-to-QB error
is 0.066 yd; at 48 it is 0.0077 yd. Error is not monotonic at every coarse step.
These synthetic redirects do not clear the separate heavy-jam witness or prove
that a recovered shoulder hand buys time in a real pass-rush rep.

Use Node 22 from the repository root:

```sh
npm test -- test/contact-angular-transfer.test.ts test/hand-angular-transfer.test.ts test/hand-force-point.test.ts
node --import tsx scripts/diag/hand-angular-law.ts out/angular-contact-next/law.json --common-patch --assert-law
node --import tsx docs/archive/research/contact-mechanics/material-hand-law.ts out/angular-contact-next/graph-law.json
node --import tsx scripts/diag/hand-convergence.ts out/angular-contact-next/refinement.json --common-patch
node node_modules/vitest/vitest.mjs run --config scripts/diag/common-patch-vitest.config.ts --maxWorkers=1
npm run test:all
npm run test:data
npm run typecheck
npm run build
```

The [earlier contact receipt](../../data/reviews/current/contact-coupling.json)
and [prototype review](zone-flow-prototype.md) preserve failed controls and
source pins. The [compact new receipt](../../data/reviews/current/angular-contact.json)
records the final source, test/operator hashes, laws and remaining failures.
Detailed local diagnosis is in ignored `out/mixed-hand-torso/summary.json`,
`out/patch-helper-review/first-fork-review.md` and
`out/pass-rush-hands-audit/review.json`. Those are captured historical sources,
not measurements of subsequent edits. Reproduce the current laws and failing
football controls with the tracked commands above; retain earlier sources.
