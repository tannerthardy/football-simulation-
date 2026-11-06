# Tackling: a held runner needs an achieved finish

The tackle controller now uses a secured side/rear hold to request a plant
along that hold. Ground traction, grip force and balance still decide whether
the defender slows the runner, slips or gets dragged. No physical capability,
grip strength, mass, inertia or solver resolution increased. This is a controller
repair exercised through shared physics, not a new grasp law.

The user's [tackling reference](../references/tackling_mechanics_and_physics.md)
is preserved for collaborators. It usefully separates approach, contact, wrap
and finish. Its equations and non-NFL studies do not calibrate NFL contact forces.

## Repeated mechanism and repair

The existing panel repeatedly showed a secure rear hold transmitting almost no
load while the carrier walked another twelve yards. `updateBond` kept requesting
the carrier's speed plus a closing step even after the arms had closed. There
was no attempted plant for the World to execute. More grip strength cannot
correct a controller that asks for almost no restraining load.

An extended reach still follows and closes. With actual body proximity and the
existing grip quality, the holder reduces following **along the hold**, retaining
the carrier's perpendicular motion. A side hold must close and earn rear leverage
before trying to brake forward motion. Existing front-on drive, committed dives,
bounded strikes and staying with a falling carrier remain.

A four-second hold no longer whistles a moving runner down. Physical falls,
stopped forward progress and the protected pocket QB's in-the-grasp rule still
end plays. Some experimental reps now remain unfinished at the inspection limit;
they were previously reported as tackles without a physical stop.

## Matched evidence

Baseline: `505842e`, source `621ad9364e`. Repair source: `f14d849a51`.
The same panel operator, generated rosters 61/62, three seeds, 24 cells and both
mirrors give 144 reps per physics model. Its new finish labels distinguish a
fall, stopped progress and another whistle. First observed grasp is separate
from the old first-attempt marker, which includes misses. Neither advance measure
is a calibrated NFL yards-after-contact measurement.

| Adaptive panel, 144 reps | Before | After |
| --- | --- | --- |
| Production: physical falls | 106 | 122 |
| Production: escapes / unfinished | 20 / 4 | 20 / 2 |
| Production: other whistles | 14 | 0 |
| Angular patch: physical falls | 62 | 92 |
| Angular patch: escapes / unfinished | 42 / 6 | 36 / 16 |
| Angular patch: other whistles | 34 | 0 |

In the predeclared slow rear witness (180 degrees, 3 yd/s, seed 3000), production
advance after observed grasp drops from 12.22 to 3.00 yd. Peak actual grip load
rises from 102 to 1,128 kg·yd/s² within unchanged capacities; the ending changes
from an upright timed whistle to a physical fall. Patch also produces a physical
fall at 3.13 yd. Fast difficult escapes remain. These are controlled generated
players, not estimates of NFL tackle rates.

The permanent acquired-wrap controls compare planting with the old co-moving
request using identical bodies and holds. They verify actual transmitted load,
carrier slowing, shared arm/recovery work, mirrors and 12/48-step refinement.
Weak extended reaches, grounded holders and the other finish situations remain.
Five of the final twenty assertions fail on baseline, including the two physical
load comparisons and the false-whistle control. The final stage passes all twenty.

## Rejected attempts and remaining physics

The first fast 45-degree reach starts with a 1.15-yard holder lever arm and
substantial existing spin. Acquiring the carrier's near surface instead of COM
in a local experiment did not repair it: shorter radius required faster holder
rotation, and the escape worsened. The experiment was reverted. A plausible
contact location alone does not prove a good wrap or support response.

A first finish request braked every component of carrier motion. It improved
rear holds but lost the ordinary side approach under patch: one grip slipped
and the runner stayed upright. Projecting braking along the hold restores that
unchanged side control in both mirrors, through a physical fall. We retained
the failed trial's evidence rather than increasing grip force or weakening the
control. Final patch promotion returns to its prior **42/50**, still not ready.

Full trajectories are not universally converged. The controlled acquired rear
plant agrees at 12/48 steps, but some native panel finishes differ, especially
under patch. Both final models have two mirrored finish disagreements out of
144 reps at 12 versus 48 steps (the baseline has four in each model). This is
a limited panel result, not universal convergence. The next physics work should
trace the first divergence in those
loaded angled holds: actual point motion, delivered normal/tangent moments,
attained yaw, grip slip and support recovery. A bounded distributed wrap may
eventually be needed; these trials do not establish that it is the next fix.
Initial approach/braking and jump/landing remain separate unfinished mechanisms.

## Checks and reproduction

Run Node 22. Current full checks and compact receipts are recorded in
[the evidence receipt](../../data/reviews/current/tackle-finish.json).
Two matched generated games at seeds 101/102 are a smoke check only. Both stages
retain 12/12 existing mechanism guards. Later calls and RNG diverge; games are
not paired snaps, a blind NFL holdout or proof of general football improvement.

```sh
npm test -- test/tackle-support-choice.test.ts
node --import tsx scripts/diag/tackle/panel.ts --seeds 3 --out out/tackle/center.json
node --import tsx scripts/diag/tackle/panel.ts --seeds 3 --common-patch --out out/tackle/patch.json
# Repeat either arm with --substeps 12 and --substeps 48.
node --import tsx docs/archive/research/contact-mechanics/grasp-law.ts out/tackle/law.json . --stress-lower --assert-law
```

For baseline, extract `git archive 505842e src scripts` into an ignored snapshot,
copy the current panel into its same path, and run there with access to existing
Node dependencies. The panel checks source identity before/after and records
its operator hash. Large traces stay in ignored `out/`; the compact receipt
keeps source/input pins, adverse cases and artifact hashes. No history rewrite
or experimental angular-patch promotion is part of this change.
