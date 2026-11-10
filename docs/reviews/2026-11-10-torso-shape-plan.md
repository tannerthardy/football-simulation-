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

## Bench result (`capsule-bench.mts`, `TORSO_CAPSULE` off by default; 2026-11-10)

**Setup.** The package on (run-ref-12 defaults). A runner driving at 3–6 yd/s into a hitter holding his ground, the hitter
square or 45° off square, at offsets 0–0.45 yd. Torso only, and with the hitter's grasp formed at first proximity
(lock 0.5, reel 2.2). Speed kept = the runner's speed along his path at first torso touch + 0.2 s, over his speed before
proximity. (The capsule lets centres get closer before touching, so a fixed time after proximity mixes the approach with
the hit.)

**At the NFL's median offset (0.30 yd), closing 3 / 4 / 6 yd/s:**

| Arm | Torso only, square | Torso only, 45° | Grasp, square | Grasp, 45° |
|---|---|---|---|---|
| Disc (today) | 51 / 63 / 71% | 52 / 64 / 71% | 46 / 52 / 65% | 43 / 51 / 65% |
| `CONTACT_LAYER` | 60 / 73 / 76% | 60 / 73 / 76% | 51 / 57 / 69% | 49 / 56 / 69% |
| `TORSO_CAPSULE` | 59 / 71 / 77% | 80 / 81 / 83% | 51 / 61 / 65% | 40 / 51 / 64% |
| Capsule + layer | 62 / 76 / 78% | 86 / 83 / 85% | 51 / 59 / 63% | 41 / 59 / 67% |
| NFL (from proximity, all front-on hits) | 78–87% | | | |

**Detail at 4 yd/s, offset 0.30 yd:**

| Arm | Hitter's gain by touch + 0.2 s (yd/s) | Slip at touch → + 0.1 s (yd/s) | Yaw by + 0.5 s, runner / hitter |
|---|---|---|---|
| Disc | +0.16 | 1.83 → 1.76 (shrinks) | 0 / 37° |
| Capsule | −0.10 | 1.92 → 2.03 (grows) | 4 / 60° |
| Capsule, hitter at 45° | −0.13 | 2.41 → 2.47 (grows) | 34 / 2° |
| Grasp: disc / capsule, square | | | hitter 121 / 117° |
| Grasp: disc / capsule, 45° | | | runner 47 / 102°, hitter 89 / 57° |

**Checks:**
- A head-on central hit (offset 0) still stops him: 28–40% kept in every arm.
- Pair momentum with free intents is exact (≤ 3.6e−13).
- A world with no contact is bit-identical in every arm (the same digest).
- `npm test` with the flag off: 3,922 passed. The 3 failures are the known Node-version refusal in `baseline-runner`.

**Reading against the stop rule.**
- **Torso only, the sourced capsule reaches the NFL band.** At the median offset, square, it keeps 59–77% (62–78% with
  the layer); a hitter at 45° gives 80–86%. The hitter is barely accelerated, the slip grows after the pads meet as the
  NFL's does, and central hits still stop the runner.
- **With the bench's grasp formed at proximity, it does not.** It keeps 51–65%, square, against the disc's 46–65%, short
  of about 70%.
- **The bench grasp may be harsher than the game's.** The in-game split showed the grasp contributing +0.08 yd/s over the
  first 0.2 s, while the bench's grasp (lock 0.5, reel 2.2 at proximity) brakes harder.
- **The plan's stop rule is met for the package as benched.** Per the conditions, this is reported before any game run
  and the capsule is not widened. The game-level gate (frontcourse and `carry.py` on the fixed zone runs, with the game's
  own grasps) is the test that settles which reading is right; it is Integration's call.

**Yaw.**
- Torso only, the capsule adds rotation: hitter 37° → 60° square; runner 0° → 34° with the hitter at 45°.
- With a grasp, the grasp dominates the hitter's yaw (117–121°) and the capsule does not add to it. The runner turns more
  (47° → 102° at 45°).
- That is the over-rotation watch item (51° against the NFL's 41° at +0.5 s). A game run would have to report it.

## The read-only game gate (pre-registered; run-ref-12, fixed zone runs, frontcourse's front-on contacts; 2026-11-10)

Pre-registered by Integration:
- **Continue** if speed kept at +0.2 s reaches about 65% or more and stops falling with closing speed.
- **Stop** if it is under about 60% or still falls steeply.
- **60–65%:** report, and Integration decides.

| | NFL | run-ref-12 | + `TORSO_CAPSULE` | + `TORSO_CAPSULE` + `CONTACT_LAYER` |
|---|---|---|---|---|
| Contacts | 556 | 165 | 166 | 168 |
| Speed kept at +0.2 s | 82% | 49% | 59% | 62% |
| …by closing < 3 / 3–4 / 4–5 / 5+ yd/s | 78 / 83 / 87 / 86% | 67 / 57 / 45 / 41% | 74 / 70 / 53 / 46% | 69 / 69 / 61 / 60% |
| Slip at +0.1 / +0.3 s (yd/s) | 2.69 / 1.25 | 1.26 / 1.18 | 1.76 / 1.26 | 2.23 / 1.16 |
| Turn by +0.3 s | 80° | 36° | 60° | 67° |
| Hitter's rotation by +0.5 / +1.0 s | 41° / 74° | 52° / 86° | 75° / 113° | 90° / 115° |
| Runner's facing change against his path, +0.5 / +1.0 s | 18° / 37° | 24° / 31° | 22° / 26° | 21° / 25° |
| Gain after contact; contact to end | 2.84 yd; 1.5 s | 1.74; 0.9 | 2.25; 1.3 | 2.13; 1.2 |
| Central hits (offset < 0.1 yd): speed kept | 78% | 40% | 46% | 57% |
| Central hits: gain | 2.24 | 1.43 | 2.07 | 1.93 |
| Central hits: over by +1.0 s | 33% | 69% | 52% | 39% |

**Against the pre-registration:**
- **The capsule alone is a stop:** 59% kept, still falling steeply with closing speed (74 → 46%).
- **The capsule with the layer falls in the 60–65% band:** 62% kept and much flatter (69 / 69 / 61 / 60%).
  - Slip at +0.1 s 1.26 → 2.23 (NFL 2.69).
  - Turn 36° → 67° (NFL 80°).
  - Gain after contact 1.74 → 2.13 yd; contact to end 0.9 → 1.2 s.
  - Central hits still end the play: over by +1.0 s 39% against the NFL's 33%.

**The cost is the hitter's rotation:** 52° / 86° → 90° / 115° by +0.5 / +1.0 s, against the NFL's 41° / 74°. The
one-point grasp's over-spin grows with the capsule's lever arms. The runner does not over-rotate: 21° / 25° against the
NFL's 18° / 37°. If this continues, the hitter's rotation is the first thing to explain.

## The tackler's over-rotation (`hitterspin.py`, same code on NFL and sim; `hitter-torque.mts`; 2026-11-10)

First contact on zone runs, by the hitter's bearing from the runner (front / side / behind, 45° cones).

**Hitter's rotation by +0.5 / +1.0 s:**

| Approach | NFL | run-ref-12 | ref-10 (no `GRASP_PATCH`) |
|---|---|---|---|
| Front | 44° / 89° | 51° / 82° | 30° / 52° |
| Side | 34° / 76° | 98° / 98° | 37° / 61° |
| Behind | 27° / 64° | 96° / 94° | 37° / 45° |

**Bearing from hitter to runner turned by +0.5 / +1.0 s**, and the hitter's facing against square to the runner then:

| Approach | NFL | run-ref-12 | ref-10 |
|---|---|---|---|
| Front | 121° / 135°; 64° / 46° off square | 58° / 128°; 17° / 13° | 15° / 88°; 7° / 8° |
| Side | 94° / 111°; 55° / 42° | 89° / 107°; 23° / 21° | 37° / 68°; 9° / 11° |
| Behind | 65° / 79°; 44° / 34° | 71° / 94°; 35° / 23° | 6° / 16°; 5° / 8° |

**Reading:**
- The over-spin is in side and behind holds: ours turns about 100° in the first half-second, against the NFL's 30°. Front
  hits are close to the NFL.
- Since `GRASP_PATCH`, the bearing from hitter to runner turns about as much as the NFL's (side: 89° against 94°). The
  pair orbits.
- **The difference is what the tackler does about it.** The NFL tackler lags behind the bearing and is left turned away,
  42–64° off square. Ours keeps himself square to the runner: 13–23° off.

**Torques on ours** (`hitter-torque.mts`, signed with his spin; side holds, first 0.2 s):
- He spins at 3.6–5.0 rad/s.
- The grasp's moment drives it: +85 at the first tick, then about +40.
- His feet add to it at first (+10), then resist (−13 → −56).
- His facing request is 5–11° off square to the runner, and leads his facing by 10–21° in the direction of the spin.

**So the over-rotation has two parts:**
- **A decision.** The tackler's facing request stays square to a runner who is passing him, and his yaw motor follows
  it. That is Defense's.
- **The one-point grasp's moment.** All of the runner's motion past him becomes torque. That is the two-point wrap
  question, and it goes on the bench next.

**Two-point wrap bench** (`WRAP_TWO_POINT`, off; `wrap-bench.mts`).
- **Setup.** A runner at 4.5 yd/s passes a hitter standing 0.6–0.9 yd beside his path. The grasp forms at first
  proximity, two-arm (lock 0.5) or one-arm.

| Hitter rotation by +0.5 / +1.0 s | Flag off | `WRAP_TWO_POINT` on |
|---|---|---|
| Request tracks square to the runner (as the game's does) | 99–122° / 120–142° | the same |
| Request held at the facing he had at the grasp | 0–3° / 0° | 0–3° / 0° |

- **The runner.** With his tracking hitter and a two-arm wrap, the flag turns the runner 27° / 45° (from 1° / 1°): the
  couple passes the hitter's turn on to him.
- **The bearing.** It turns 89–118° in every case. When the hitter holds his facing, the runner goes past his shoulders
  as in the NFL (NFL side: hitter 34° against a bearing of 94°).
- **Pair momentum is exact:** 2.3e−13 off, 5.5e−13 on.

**Reading:**
- On the bench the hitter's rotation is his own facing request: a tackler who keeps squaring up to a passing runner spins
  with him. The one-point grasp's moment alone barely turns him.
- A two-arm couple does not stop a tracking tackler; it turns the runner instead. `WRAP_TWO_POINT` stays off.
- **The over-rotation is a decision: Defense's tackler facing request during a hold.** A held or braced facing reproduces
  the NFL's lag.
- The capsule + layer read waits for that fix, as its spin gate depends on it.
