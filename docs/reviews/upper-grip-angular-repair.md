# Upper grips: consistent force, rotation and travel

Upper-body grips now use the same reduced common-point mechanics as hands in
the existing `handContact: 'patch'` experiment. Production still uses `center`.
This repairs a physical law, not a tackle-success or YAC target. No capacities,
ratings, controller cues or global physics resolution changed.

The later [lower-grip follow-up](lower-grip-angular-repair.md) repairs the
lower-path law left open at this stage, and retains its native tackle regressions.
The measurements below keep their original source.

## The wrong mechanism

Previously, sideways grip resistance changed both centers' velocities without
turning either body. It conserved linear momentum and accounted for work, but
lost angular momentum. The unslipped 90/120 kg witness with 0.25 yd/s lateral
slip lost 12.857 kg yd²/s in one 50 ms interval, with no ground force or collision.
The permanent test now checks that exact input, its mirrors and world rotations.

Hands also carried their attained force at half-interval travel while passive
grips carried full end-velocity travel. Mixing them left another angular debt.
Adding torque after the old grip solve would not repair its point velocity,
effective mass, energy limit or this mixed timing.

## The repair

After torso impacts, all hand and zero-leg grip rows acquire one frozen force
midpoint before any upper grip reels. A grip uses the existing radius-weighted
common point between the bodies. Its lever arms determine relative point
velocity, rotational effective mass, angular impulse and exact kinetic work.
Active reeling and passive restraint share the existing grip envelope. Their
total attained force and rotation carry the same centered travel as hands.

Coincident upper grip copies also share one compliant row and one pull. Their
allocated arm effort is recombined; extra numerical copies cannot halve the
pull or create extra holding strength. This retains the existing strongest
structural claim rule. Half-cap copies have a weaker strongest claim; they are
not interchangeable with the half-cap hands used elsewhere.

## Evidence and limits

At source `e901bb5b`, all **1,388 TypeScript tests in 116 files**, **141 Python
checks**, typecheck and build pass. Both default historical hashes pass.
The same 51 new assertions fail 38 times on baseline `f2eb1e3a` and pass entirely
after repair. They cover analytic impulses, sustained pulling, body spin,
mirrors, shared bodies, duplicate grips, failed reaches and real slipping.

The archived collector uses identical inputs on both sources. Its 48 unslipped
upper cases improve from 0/48 to 48/48 angular-law passes; maximum angular error
falls from 0.102857 to 4.55e-13 kg yd²/s. The smaller lateral speed stays below
the same cap at 1/12/48 subdivisions, so no lower-foot path hides inside the
comparison. Separate shared material-hand graphs and existing hand/torso audits
also pass. Full traces remain ignored; the [compact receipt](../../data/reviews/current/upper-grip-angular.json)
pins the sources, operators, checks and adverse cases.

Two limitations prevent promotion. **Lower holds remain unrepaired.** Faster
versions of the same collector cross into positive leg share in 16/48 cases;
those 16 still lose angular momentum, up to 12.177 kg yd²/s. Linear momentum
and work close, so those checks alone are insufficient. A joint marked
`slipping: false` at the end can still have slipped earlier. The permanent
transition test proves only the first upper interval, then records lower support.

**The common point is a reduced contact assumption, not a persistent acquired
torso attachment.** It can exchange lateral center motion for body yaw; it does
not rigidly lock the centers. Do not strengthen it to restore the old restraint.
Before claiming a grip stays on a particular shoulder through turning, acquire
a real torso point and use its position and velocity derivative consistently.
The existing material-hand representation is a possible starting point, not
evidence that every grip needs more detail.

Unchanged patch promotion remains **42/50**: six helper/transfer/climb failures
and two preserved historical hash differences. They were not weakened. The
controller owner has those blocking reads; their repair must retain the laws.
The nominated 69-YAC escape has no established grip or body impact, so this
grip repair does not explain that play.

An existing native tackle panel was also repeated across three seeds and both
sides: 144 reps per arm, baseline/current in both modes. Before/after results
and full endpoint signatures are identical in each mode: 120 tackles, 20 escapes
and four censored reps. It acquires **no zero-leg grips**, so this is an unaffected
lower-grip regression control, not evidence of an upper-grip football benefit.

## Next narrow physics step

Couple lower-grip body yaw and the existing corrective-foot Jacobian inside
the same force, mobility and work solve. Start with a displaced-foot normal
load and a sideways load, including mirrors, active recovery and mixed holds.
Do not append spin after calculating the old impulse or rotate/reset achieved
foot placement for free. Keep the reduced model unless those controlled cases
demonstrate a missing degree of freedom. Then inspect native contacts before
making a default change or changing tackle strength.

## Reproduce

Use Node 22 from the repository root. The stress command intentionally records
the lower-path failures; it is not an angular-law pass.

```sh
npm test -- test/grasp-angular-transfer.test.ts
node --import tsx docs/archive/research/contact-mechanics/grasp-law.ts out/grasp-law.json . --assert-law
node --import tsx docs/archive/research/contact-mechanics/grasp-law.ts out/grasp-lower.json . --stress-lower
node node_modules/vitest/vitest.mjs run --config scripts/diag/common-patch-vitest.config.ts --maxWorkers=1
```

The last command deliberately fails the existing promotion controls. To compare
the baseline collector, create an ignored archive of `ea68ed3` containing `src`
and pass its directory as `SOURCE_ROOT`; do not use a new worktree or relabel
old measurements as current.
