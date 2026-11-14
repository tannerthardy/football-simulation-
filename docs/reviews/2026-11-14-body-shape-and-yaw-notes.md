# Two notes for Integration: the World's body shape, and how yaw is integrated

Requested by Integration (from Flex's hands work), 2026-11-14. Notes, not builds. Read from develop `3d445688` (engine-64). What I read in code is marked as such; what I computed from the code's constants is marked "computed"; anything I could not check is marked "not checked". Numbers for bodies are the median profile of the generator at quality .5 (`derivePhysical`).

## A. The body shape, and what a capsule torso would touch

### Today

- **One number.** A body's `profile.radius` = clamp(0.24 + (weightLb - 180)/1100, 0.22, 0.42) yd (`players/physical.ts`): OT 0.37, edge 0.31, WR 0.28, CB 0.26. It is used as a disc in the World's centre-to-centre law, and as a shoulder half-width by the sim (gap widths, alignment splits, sight occlusion).
- **Where the disc is read** (`.radius` in `src`, outside `lab`): blocking.ts 63, engagement.ts 29, carrier.ts 27, pass-interference.ts 24, defense.ts 24, traffic-path.ts 19, world.ts 18, receiver.ts 11, run-fits.ts 10, playsim.ts 10, contact-holding.ts 9, tackle.ts 8, qb.ts 8, inertial-support.ts 8, pass-legality.ts 7, traffic-distance.ts 6. About 280 sites; nearly all of them mean WIDTH (a shoulder half-width): gaps, splits, how far apart two linemen line up.
- **What already exists for depth:**
  - `HANDS_CHEST` (on): two hands on a chest act along that chest's normal while inside a flat span; each torso's shoulder line is a segment of half-length `CHEST_HALF` = 0.27 - 0.15 = 0.12 yd across his facing (`world.ts`), and the hands' row acts between the closest points of the two segments "as for two capsules".
  - `TORSO_CAPSULE` (off, experimental, `docs/reviews/2026-11-10-torso-shape-plan.md`): a torso capsule across the shoulder line, half-width = `radius`, half-depth = `radius * 0.15/0.27` (0.556). Today only for the carrier-defender pair (`World.capsulePair`, set in `playsim.ts`). That note's shape bench: kept speed at +0.1 s 46% for a disc, 62-74% for a square capsule, against the NFL's 82% at +0.2 s.
  - `bodyshape.ts`: an oriented ellipse for the squeeze (slipping through a gap); it changes the extent along the centre line only, not the normal.
- **Integration's number, checked against the code:** two men chest to chest are `radius_a + radius_b` apart in the centre law: OT against OT 0.74 yd (computed), where real centre-to-sternum depth is 0.14 to 0.17 yd each, about 0.3 between two men. So the NFL's engaged separation (0.81 at +0.4 s) is about the disc's contact distance, and it leaves no room for arms unless the hands' bent base is fitted to it (Flex's stopgap). I did not measure the engaged separation in play.

### What a capsule torso (depth separate from width) would touch

Keep half-width = `radius`, add `depth` (half-depth, about 0.4 to 0.56 of the half-width, or from anthropometry). Width readers do not change. Depth matters only where the distance along a contact normal matters:

| Place | What it does today (read in code) | With a depth |
|---|---|---|
| World torso row (`world.ts`, `capsuleGeom`, `capsuleRow`) | disc: normal through both centres; capsule only for the carrier-defender pair under `TORSO_CAPSULE` | extend from one pair to all pairs (engaged, piles) behind its own flag; the code exists, the pair predicate is the change |
| Hand joints (`world.ts` about 926, 934, 1189, 1706, 1988) | extension = joint extension minus the two radii; touch = `CONTACT_SCALE * (ra + rb)` | reach along the normal uses depth, not the sum of half-widths: this is where Flex's "fit the bent base to centre distance" becomes principled |
| Tackle reach and contact (`tackle.ts` about 169, 360, 474, 514, 519) | `body = rc + rd`; touch = 0.9 of that; reach = rc + rd + arm * 0.9 + extension | the "touching" distance shortens to depth plus depth; arm reach is unchanged |
| Traffic and gaps (`traffic-path.ts` 19 sites, `traffic-distance.ts` 6) | radii as path clearance | clearance across the path is width (unchanged); clearance along the path is depth (shorter): a few sites |
| Sight occlusion (`sight.ts`) | a torso (`radius`, up to shoulder height) and a head | width is what occludes across the line of sight: unchanged; no depth needed |
| Yaw inertia (`support.ts`) | `m (0.5 radius)^2` | a torso with depth changes the moment of inertia (slightly, a flat ellipse): optional |
| Pass-interference and legality proximity (31 sites) | `radius` as a proximity threshold | width: unchanged |

### How big

Small in code surface, large in behaviour. About a dozen sites need a depth (World torso rows, hand joints, tackle touch, a few traffic distances) plus generalising `capsuleGeom` from one pair to all; the 280 width sites stay. But everything fitted on the disc (blocking rows, engaged separation, hand reach, first-contact energy) was tuned against a contact distance that is 2 x 0.37 for linemen, so the change gets the full treatment: lone pair (the `effective-mass` shape bench exists), staged pairs (Flex's PAIR_HANDS), then games. Order I would take: first the engaged pairs only (blocker-defender), behind a flag separate from `TORSO_CAPSULE`, keeping `HANDS_CHEST`; carrier-defender is already built and off.

## B. How yaw is integrated today, and what facing as a physical state would take

### Today (read in code; computed numbers marked)

- A body has `facing` (rad) and `spin` (rad/s). Yaw inertia is `m (0.5 radius)^2`: OT 4.8, edge 2.8, WR 1.9, CB 1.6 kg yd^2 (computed).
- The controller's request (`MoveCommand.facing`, shaped by `commandFacing`, the coverage orientation owner, etc.) is the target. Each substep `turnBodyResponse` (`actuation.ts`) integrates `integrateYaw(angle error, spin, dt, YAW_RESPONSE = 0.05 s, acceleration, turnRate)`: a critically damped response toward the target with response time 0.05 s, spin capped at `turnRate` (6.1 OT, 8.3 edge, 8.4 WR, 8.6 CB rad/s, computed), and angular acceleration capped at the smaller of `turnRate / 0.05 * (0.3 + 0.7 available)` (121 to 173 rad/s^2) and grip torque over inertia, where grip torque = sqrt(traction^2 - force^2) x base radius (the friction circle shared with the linear force). At rest that grip torque is 241 (OT), 172 (edge), 136 (WR), 108 (CB) kg yd^2/s^2, so the cap is 50 to 71 rad/s^2 (computed). It returns the impulse, work and peak torque, so the motor's action is in the energy accounting.
- Contacts add yaw: the solver rows carry lever arms and the facing integrates `spin` (`world.ts` about 1760 to 1800, 2067 to 2075, 2249).
- What an external moment does: it adds spin in the substep; the motor then drives the spin back toward the request's profile. As a stiff spring the motor has `omega_n^2 I` = 400 I, about 1,900 per rad for an OT; its torque saturates at the grip torque above. So a steady external moment below the grip torque deflects the man by at most `M / (400 I)` (100 torque is about 3 deg on an OT) and he holds; one above it turns him (computed).

### Why a hand does not turn a man (computed, not yet reproduced)

Three things, in the order I would check:

1. **Symmetric hands cancel.** Two hands pushing at the two ends of the chest, equal and in the same direction, give zero net moment; a power rush is symmetric by construction. Flex's "both at 0 deg in a power rush" is what two equal hands should do, not a missing mechanism. A turn needs an asymmetric push: one hand (swim, club, rip, reach), or an off-centre fit.
2. **The lever is short.** Under `HANDS_CHEST` the hands act on a flat span of half-length `CHEST_HALF` = 0.12 yd, so a single 1,500 push has a moment of about 180 (computed), against a grip torque of 241 (OT), 172 (edge), 136 (WR), 108 (CB): it cannot turn an OT, and barely turns the lighter men. At the 0.35 yd lever of a shoulder-end hand, the same push is 525, which would turn all of them (59 rad/s^2 net for an OT, 200 for a WR, computed).
3. **The request holds.** The motor target is the controller's request; for blockers it is a stable facing, so any spin the contact adds is driven out inside about 0.05 to 0.1 s unless the moment exceeds the grip torque.

Not checked: the order of the motor and the contact rows inside a substep, and whether the yaw rows from `HANDS_CHEST` carry the lever at the chest end or at the centre. Flex's reproducer decides between 1, 2 and 3; I can instrument one staged pair to print the net yaw impulse from contacts and the motor's counter-impulse per substep.

### Update, traced on Flex's staged pair (2026-11-14): why the rusher's hand does not turn the blocker

Instrumented, not inferred. `docs/reviews/patches/yaw-trace-world.patch` adds a local `World.yawTrace` hook (each hands row's normal impulse, lever arms and the yaw it delivers; each yaw-motor call's error, spin change, impulse, peak torque and the grip it was given), and `docs/reviews/patches/pair-yaw-trace.mts` is Flex's `pair-staged.mts` ("turn: a power rusher, his hand outside / inside on the blocker", `PAIR_HANDS=1`, 0.6 s, both men 144 kg) with the per-tick summary. Run on `claude/quirky-franklin-9lbwbp` at e2a02893, `HANDS_LEVER=1` and `=0`. What it shows:

1. **The rusher's shoulder joint is slack.** His outside joint carries a compression only in tick 1 (mean 2.7, max 5.4 per substep impulse, about 1,300 N) and zero from tick 2 on. The blocker's inside joint, whose chest points sit on the line of centres, carries the whole 2,032 N press (8.5 per substep, impulse = force x 0.0042 s).
2. **The compressing joint has no lever.** Its arms are 0.00 to 0.02 yd (the closest chest points of two squared-up men lie on the line of centres), so the 2,032 N press delivers a yaw acceleration of 0.00 rad/s^2. The slack joint has the arms (0.12) but no force. The only moment is in tick 1: +/-0.13 rad/s^2 for one tick, a spin of about 0.007 rad/s added over the run (0.000 to 0.002 rad/s in the summary).
3. **The motor never has to fight.** Over the run the yaw motor's counter-impulse sums to -0.5 and -0.8 kg yd^2/s (the two men), its error stays under 0.6 deg, its peak torque is at most 150 against a grip budget of 1,696 (the OT's whole traction), and the pair ends 1 deg turned. So of the two cases asked, the moment is not applied: there is nothing for the motor to win against.
4. **With `HANDS_LEVER=0` (the default) there is no lever at all**, as the code says: 288 of 432 rows are levered (the shoulder joint's) against 432 of 432 with the flag on, and the blocker's joint is unlevered; the outcome is the same, 1 deg.
5. **Grip is not shared with holding ground.** The motor's grip budget is 1,696 at every substep while the hands carry 2,032 N (Flex's note, confirmed): the press is not charged against the traction the yaw motor draws on, only the gait's own force is (19 to 215 in the trace).
6. **A period-2 chatter, cause not determined.** The blocker's joint force is 2,032 N on every even tick and 0 on every odd tick (rows per tick: 8.5, 0.0, 8.5, 0.0...). Flex's "hands 2032" at 0.2, 0.4 and 0.6 s are all even ticks, so the mean press is about 1,016 N. The staging calls `syncJoints` each tick; whether the chatter is the staging or the engagement's own hands law is not checked.

So the first cause on the list above is confirmed in a stronger form than I stated: not a short lever, but a compressing joint whose lever is zero by geometry (squared up chest to chest) and a shoulder joint that carries nothing. A man gets turned when the shoulder joint carries the load (one hand loaded, the other slack and the compression taken by the shoulder, the geometry of a swim or rip) or the two bodies are off the line of centres.

### What it would take for facing to be a physical state that contact can overcome

It is already a state with a bounded motor; what is missing is a motor torque that is a body capacity, not just friction. Smallest changes, in order of cost:

1. State the motor torque as a capacity of the body (hips and legs: scales with mass and power, like `pushForce`), keep grip as a second limit, and let the request pull on the body through it. Contact moments beyond it then turn the man, as the numbers above already allow when the lever is long enough.
2. Give a contact moment a lever of the true shoulder-end (0.27 yd) for a hand that lands there, not the flat-span 0.12; HANDS_CHEST's span was chosen for the push direction, not for the moment.
3. Order the substep so the motor's reaction is in the same solve as the contact (impulse and work are already returned, so the accounting exists).
Not needed: a new integrator or a second solver. Risk: every controller that holds a facing against contact (blockers, DBs in press, tackle approach) gets turned where it did not before, so it is a flag, with the staged pairs first.

### Interaction with `TRUNK_TWIST` (PR #744)

- `facing` stays the hips (gait, turn motor, base). `trunk` is a kinematic follower of a `look` request within 55 deg at 360 deg/s: no inertia, no torque limit, no contact coupling. A moment on a receiver's chest today acts on the hips' frame (`world.ts` chest segments across `facing`) and does not load the trunk at all; the PR notes that the World's contact geometry still reads hips.
- If facing becomes a physical state, the trunk should become one too, not stay a follower: a second yaw degree of freedom coupled to the hips by a torsional spring-damper with range stops at 55 deg. A moment at the chest loads the trunk joint first and passes to the hips once the trunk is at its stop; the hips are held by the motor (grip-limited). That is the same two-rotor chain as the "turn the man" mechanic needs for a reach block (the shoulders go first, the hips follow). It is not a Stage 1 or 2 item; the point for now is that the trunk as a follower is compatible with any of the changes above, since nothing reads it as physical, and the chest-geometry readers (marked "shoulders by meaning") are the same sites that would take the trunk's angle when it becomes physical.
