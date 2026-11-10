# Torso shape: a body wider than it is deep (plan, Flex, 2026-11-10)

Status: design note only. No code until Tanner and Integration agree. This is attempt two of the collision work: (c)
in `docs/reviews/effective-mass.md`, with `CONTACT_LAYER` (b) as the companion arm.

## 1. The evidence

Front-on first contacts on zone runs. The NFL is 2022 tracking (bdb2025); ours is the fixed zone runs at run-ref-11.
Operators: `frontcourse.py`, `carry.py`, `first-hit-split.mts`.

**Through the hit:**

| | NFL | Ours (package) | Ours + `CONTACT_LAYER` |
|---|---|---|---|
| Runner speed kept at +0.2 s | 82% | 49% | 53% |
| …by closing speed (< 3 / 3–4 / 4–5 / 5+ yd/s) | 78 / 83 / 87 / 86% (flat) | 70 / 57 / 44 / 41% (falling) | — |
| Hitter's speed gained along the runner's axis by +0.2 s | about +0.3 yd/s | +1.1 | +1.1 |
| Closing as a share of relative velocity at torso contact (by offset) | 50–78% | 82–89% | 86–89% |
| Tangential slip from torso contact to +0.1 s (0.15–0.3 yd offset) | 2.73 → 3.15 (grows) | 1.46 → 1.10 (shrinks) | — |
| Line of centres' turn by +0.3 s | 80° | 36° | 49° |
| Runner Δv along his axis over 0.2 s, from the torso normal impulse | about −0.8 in total | −2.11 | −1.75 |

**Ruled out:**
- **Grasp weld:** `GRASP_SLIDE` moves +0.1 s slip only 1.24 → 1.34.
- **Two-part body:** articulation moves momentum inside the body, not through the pads (Gate 1).
- **Runner's leg drive:** bracing changes nothing. The impact load is about 3 g against about 1 g of traction, so the
  ceiling is about 70%.
- **Approach speed:** reweighted to the NFL's closing mix, ours keeps about 56%. That is about a fifth of the gap.

**Earlier shape bench** (`shape.py`, offset 0.31 yd, today's 9 Hz law):

| Body | Kept at +0.1 s, no drive | With the runner at his strength cap |
|---|---|---|
| Disc | 46% | 50–53% |
| Capsule, square, yaw free | 62% | 73–74% |
| Capsule, side-on, yaw free | 68% | 81% |
| …+ compliant layer | | 83%, with a peak force of 4.4 kN |

## 2. The physical claim

A torso is wider than it is deep: about 0.27 yd half-width at the shoulders and about 0.15 yd half-depth, with pads.

- **A real body.** Two men meeting at an offset of a few tenths of a yard touch shoulder to shoulder. The contact normal
  there is the surface normal of the shoulders, not the line between the two centres. The collision impulse acts along
  that normal and off the centres: it turns the bodies and leaves the closing velocity largely as slip past each other.
- **A disc.** Every contact normal passes through both centres. So every collision stops the closing velocity along the
  line of centres, at full effective mass.
- **What NFL tracking shows** is the first of these: the closing turns into sliding past, the hitter is barely
  accelerated, and the runner keeps his speed whatever the closing speed.

**What exists today.** `bodyshape.ts` already has an oriented ellipse (the squeeze, for slipping through a gap). It only
changes the body's extent along the centre line: the normal is still the centre line. The change this note proposes is
the normal, not only the extent.

## 3. The smallest version

**Which contacts.** Ball carrier against tackler only, at first (the torso row between the carrier and a defender).
- Blocks keep the centre law with `HANDS_CHEST`. Engaged pairs are already handled by the hands' chest-to-chest geometry,
  and the trench's rotation is 56–59° against the NFL's 43°.
- Widening to other pairs is a later decision, made on its own gates.

**The shape.** Each torso is a capsule across the body's facing: a segment of half-length (half-width − half-depth) with
radius = half-depth.
- The dimensions come from anthropometry: shoulder breadth and chest depth, with pads. The same numbers already fix the
  hands' half-span (`CHEST_HALF` = 0.27 − 0.15 in `world.ts`).
- Scale them by the body's existing `profile.radius`, so big men stay bigger. No new constant, and nothing fitted to
  yards.

**Contact.**
- Closest points between the two capsule segments, as `chestPoints` already computes for hands.
- Normal = the direction between those closest points. Penetration = their distance less the two radii.
- The row acts at the contact point with lever arms, through the existing patch machinery (`contactPatch`, the same
  rows `GRASP_PATCH` uses), so the impulse has a moment about each centre.

**Facing.** Each body's facing orients its segment (the shoulder line), and the squeeze heading when he is squeezing.
Yaw is already free under `GRASP_PATCH` and the patch rows.

**The relax pass.** It zeroes closing velocity along the row's normal. With the capsule normal that is the shoulder
normal, not the centre line, so a glancing contact keeps its slip.
- `CONTACT_LAYER`'s rule stays: the relax removes only separating velocity under the layer.
- The guard (swept test) needs the capsule's swept distance. A capsule–capsule time of impact is the one new piece of
  geometry.

**Flag:** `TORSO_CAPSULE` (off). Same contract as every flag: identity when off, bit-identical worlds without carrier
contact.

## 4. What it could break, and how the gate would see it

| Area | Risk | How the gates would see it |
|---|---|---|
| Piles and crowds | A shape wider at the shoulders changes how bodies stack beside the runner. | Second-man arrival and crowd density (`secondman.py`); weird-events probe on the 16-game card. |
| The trench | Not touched in the smallest version: blocks keep the centre law. | trench2: rotation 58° and DL depth unchanged. |
| Pass protection | Same as the trench (rusher against blocker stays on the centre law). | Pressure grid: paired pressure, sacks and QB hits unchanged. |
| The grasp's geometry | The patch grasp's lever arms are measured from centres. With a capsule torso the hold point should sit on the surface. | Hold breaks by approach (`hold-breaks.mts`); front-hold turn and slip (frontcourse). |
| The finish | `HIP_BRACE` and `HOLD_FINISH` were accepted against today's hit. With a runner who keeps his speed, they act on the input they were built for. | `carry.py`: over by +0.5 / +1.0 s against the NFL's 4% / 26%; deceleration from +0.2 to +0.5 s against 0.92. |
| Downfield contact (receivers, open field) | The same carrier rows apply after the catch. | Coverage's 732-dropback panel paired: YAC and broken tackles. |
| Stuffs | Fewer runners stopped dead at the first hit. | Stuff by depth (`backfield.py`, `deephit3.py`); stuffs at the NFL's depth mix. |

## 5. Bench and gates

**Bench** (stand-alone World, the package on, today's disc against the capsule, each with and without `CONTACT_LAYER`):
- Speed kept at +0.1 / +0.2 s by closing speed (3 / 4 / 5 / 6 yd/s) and offset (0 / 0.15 / 0.3 / 0.45 yd), against the
  NFL's flat 78–87%.
- The hitter's speed gained.
- Peak contact force, against the measured 1.7–3.4 kN.
- A head-on central hit still stops him: at offset 0 the shoulder normal is the centre line, so nothing changes.
- Pair momentum exact, and energy accounted for (dissipation non-negative).
- A world with no carrier contact bit-identical.
- A standing-start control, where nothing should change.

**Gates**, in order:
1. frontcourse and `carry.py`: speed kept, slip, turn, gain after contact, contact to end.
2. Stuff by depth and backfield stops.
3. trench2 unchanged.
4. The fixed 1,321 runs paired (`ref:report`).
5. The 732-dropback panel paired.
6. The pressure grid.
7. A 16-game card, read for bugs and weird events.

## 6. Expected direction, and when to stop

**Yards.** A runner who keeps more speed through the first hit gains more after contact. Yards rise unless the finish,
now acting on the input it was designed for, ends plays at the NFL's rate.
- Our finish's rate after the hit (deceleration 0.36 yd/s from +0.2 to +0.5 s) is already gentler than the NFL's 0.92.
  So the finish may need nothing: the play ends later, but on its own course.
- Neither the shape nor the finish gets tuned to cancel the other.

**Stop and re-diagnose (attempt two of two) if any of these:**
- The bench with sourced dimensions cannot reach about 70% speed kept at the NFL's median offset and closing speed, with
  the package on.
- A head-on central hit stops stopping him.
- Momentum or energy accounting fails.
- The gates show a mechanism bug: bodies interpenetrating in piles, spurious spins, holds breaking from geometry alone.

A statistic moving, including yards, is not by itself a reason to stop. It gets explained under PLAN's merge criteria.

**Owners.**
- Flex: the shape, the contact and the bench.
- Integration: the gates and the decision.
- Defense, Run Game and Coverage: a read of their gates when it is on.
