# Lower grip: coherent rotation and recovery, still experimental

The existing `handContact: 'patch'` model now couples lower-grip force, body
rotation and achieved recovery movement. Production `center` is unchanged.
This follows the [upper-grip repair](upper-grip-angular-repair.md). It resolves
the confirmed law defect; it does **not** yet produce reliable native tackles.

## What changed

The old lower point followed a world-oriented foot-correction coordinate.
Adding a torque to that force would leave point motion and work inconsistent.
Rotating the achieved foot position with the body would invent a recovery step.

Instead, each lower grip keeps one two-component local material coordinate.
Its contact point follows attained body yaw. Relative motion comes only from
the existing shared recovery motor, transformed into that local frame. The
averaged support anchor remains in world coordinates. Acquisition, share changes,
chart rebases and replacement of the support record preserve the contact point.
This represents a reduced contact/recovery relationship, not an anatomical foot.

That same point and derivative determine yaw moments, relative contact velocity,
effective mass, motor load and exact work. Reels and passive grip forces now
share the hands' frozen force frame and centered body travel. The algebraic
recovery motor still uses its full attained velocity over the interval.
Strength, traction, grip capacities and global substeps are unchanged.

## Evidence

At implementation source `84d340e4`, **all 1,449 TypeScript tests in 117 files**,
**141 Python checks**, typecheck and build pass. Of 61 new assertions, 53 fail
on the prior source and all pass after repair; the eight unaffected controls
remain green. Independent geometry and lifecycle audits pass 72 and 21 cases.

The retained faster hand/grip collector previously lost angular momentum in
16/48 cases after transitioning to lower holds. All 48 now close the law, with
maximum angular error 7.11e-13 kg yd²/s. Existing hand/torso laws still pass;
unchanged patch promotion remains **42/50**. Historical hashes were preserved.
Final source `27b43749` corrects comments only; emitted executable code is
identical to the fully tested implementation. The final focused 112 assertions
and law collectors also pass. [Receipt](../../data/reviews/current/lower-grip-angular.json).

## Native contact exposes the next problem

The same existing 144-rep tackle panel was repeated before/after in both modes.
Default results and full endpoint signatures are byte-identical. Experimental
patch endings change from **120 tackles / 20 escapes / 4 censored** to
**94 / 42 / 8**. Broken holds rise from two to 26. Every acquired hold exercises
the lower solve, so this is a real adverse control, not an unused option.

The first fast 45-degree witness is identical through 2.65 s. At its first
loaded grip tick, 2.70 s, the new grip rotates the tackler more and slows the
carrier less: tackler spin 3.019 → 6.559 rad/s, mean grip force 969 → 541,
carrier speed along the run 7.606 → 7.914 yd/s. The hold then breaks earlier.
Those tick measurements include contact and ground response; they are not
isolated grip-force attribution.

Some plays still labelled tackles now end upright after the existing four-second
hold whistle. Do not treat that label as a physical fall. The same panel's
post-marker advance also rises; its marker can include missed attempts, so it
is not NFL yards after physical contact. Every adverse cell and the unchanged
controls remain in the receipt.

## Next physical question

Inspect the first loaded grip's attained contact location, moment arm, body
rotation, ground torque and corrective support. A newly acquired lower point
starts at the represented carrier COM in the planar model; that is not proof
of a realistic thigh/ankle grab or wrap. A real wrap can transmit a bounded
couple through distributed contact; a single point cannot represent that merely
by having high grip strength. Test actual contact geometry and feasible body
control before adding a couple or richer technique.

The orientation integration is approximate, and trajectory convergence remains
unproved. Keep the fast-angle escapes, slow rear co-motion and a real physical
fall as controls. Do not increase force, inertia or damping to recover the old
stop, reinstate nonconservative restraint, erase these failures, or promote
patch on law tests alone. The next repair must explain a visible contact
mechanism and preserve the now-consistent force/motion/work relationship.

Run with Node 22:

```sh
npm test -- test/lower-grip-angular-transfer.test.ts test/grasp-angular-transfer.test.ts
node --import tsx docs/archive/research/contact-mechanics/grasp-law.ts out/grasp-lower.json . --stress-lower --assert-law
node node_modules/vitest/vitest.mjs run --config scripts/diag/common-patch-vitest.config.ts --maxWorkers=1
```

The last command intentionally retains the eight promotion failures. Large
traces and four-arm native results remain ignored, with source/operator/input
hashes and adverse witnesses in the compact receipt.
