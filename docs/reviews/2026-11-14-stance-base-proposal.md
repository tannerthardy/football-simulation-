# Stance and base: proposal (Flex, 2026-11-14)

> **Result first (BASE_ORIENT, 2026-11-14): two attempts, both worse, removed.**
> - **Keeping the area is not neutral.** With pushes spread over directions, an equal-area ellipse loses more falls on
>   its short axis than its long one saves, whichever way it points.
> - **The stagger axis.** A set fighting stance is staggered along his facing, not across it.
>
> **What would re-open it** (named, not done): on BDB tracking, who goes down within about 0.5 s of a contact, by the
> direction of the hit relative to his heading and to his facing, for set linemen, running rushers and ball carriers.
> That gives the anisotropy as a ratio without needing forces. The outcome is at the end of this document.

Integration's order item 5. This is a proposal, not built. It joins four threads:

- the remaining edge rusher falls;
- Run Game's research on what a low posture costs (`docs/football-handbook/low-posture-cost-sources.md`, branch
  `run/G3-oz-backfield`, 4fbd5899);
- the pass-protection base and anchor sources (`docs/football-handbook/pass-protection-base-anchor-sources.md`, branch
  `claude/admiring-bell-t3ji19`, candidate 4);
- ANCHOR_BASE's sink target.

## 1. What the engine has (develop / engine-59)

- **Base.** One isotropic radius, `baseRadius = 0.11 + 0.05 balance + 0.04 mass term` yd (about 0.15-0.20 for a
  lineman). It is scaled by `0.75 + 0.5 posture` and is the same in every direction.
- **Recovery.** A step at `stepSpeed` (3.2 yd/s) x (1 - feetLock) x fatigue, in any direction, whatever his facing,
  his motion or the push's direction.
- **Point of no return.** `criticalDeviation = base + recovery / w0`.
- **Posture.** Lower is better on every count (larger base, larger w0, a stronger anchor). Only an 8% top-speed term
  costs anything.

## 2. The evidence that points here

### The edge collision class (after RUSH_LEAN_BOUND)

These are about 2 per 100 dropbacks, and 14 of the 18 edge falls left in the 8-game classification.
edge-match.mts compares edge first contacts closing at 2 yd/s or more over 24 games, with RUSH_LEAN_BOUND on:
12 fell within 0.5 s and about 3,270 stayed up. Three windows (fell / stayed up):

| | fell | stayed up |
|---|---|---|
| closing speed | 2.4-2.9 yd/s | 3.1-3.3 |
| posture at contact | 0.25-0.28 | 0.29 |
| xi along the line at contact (base radii) | -0.14 to -0.45 | -0.14 to -0.18 |
| **his facing off the line of contact** | **19-27 deg** | **13-14 deg** |
| **blocker's velocity along the line after** (follow-through) | **2.3-2.5 yd/s** (2 windows), 0.9 | 1.1-1.3 |
| **his own request along the line** | **4.2-4.7 yd/s** | 5.9-6.1 |

The fallers did not arrive faster, lower or less balanced. They were hit more side-on (wider off their facing), and
they were going around the man rather than into him. Then the blocker drove through.

In the engine a push from 25 degrees off his facing meets the same base and the same recovery step as one from
straight ahead. RUSH_PAD_LEVEL's two failed attempts say the same thing from the other side: a forward lean doesn't
stop the follow-through taking him over (docs/reviews/2026-11-12-tackle-set.md, PARKED).

### What real bodies do

- **Stagger.** In a staggered stance, pushes perpendicular to the line between the feet needed a recovery step in
  over 60% of trials at 12% body weight, and took about 0.8 s to settle. Pushes along it took 0.4-0.5 s (van Mierlo
  et al. 2023). Use the direction dependence, not the numbers.
- **Effective base.** After a sudden push the effective base is about 30% of the static area once recovery time is
  counted (Hof & Curtze 2016).
- **Coaching.** "Sprawl the feet, toes outside the ankles"; "hop back with both feet and lower the hips" when driven
  back. "If a defender can grab your shoulder you are in trouble": a turned body has a short base across.

A running rusher's stride is a long, narrow base along his path. A protector's set is wide across and short along.

### Posture (Run Game's research)

- Leg force peaks at a half squat and falls about 15% from the deepest start (squat-jump F0 at 70 / 90 / 110 deg
  knee angle).
- A deep crouch is slower off the mark sideways.
- Holding 90 deg of flexion fatigues about 4x faster than 30 deg (Pethick 2021).
- The engine has none of these: the lowest man always wins.

## 3. Proposal: three mechanisms, each its own flag, in this order

### BASE_ORIENT: an oriented base with a directional recovery step (the edge class; candidate 4)

- **The base becomes an ellipse in his feet frame.** Half-length along the feet axis and half-width across it.
  - The feet axis is his facing while he is set, and his velocity while he runs (the stride).
  - The area stays that of today's circle at the same posture, so balance, mass and posture keep their present totals.
  - The aspect comes from his gait: a set or anchor stance is wide (across about 1.3x along); a running stride is
    long (along about 1.5x across). The two meet continuously by speed, with no switch.
- **The point of no return becomes directional.** criticalDeviation(dir) = r_base(dir) + recovery(dir) / w0.
- **The recovery step is directional.** recovery(dir) = stepSpeed x directionalSpeedFactor(the step's direction off
  his facing), using the factor movement already uses for shuffle and backpedal. A step against his own velocity also
  loses that velocity first, the same braking law as movement.
- **Nothing is capped.** A hit square on a runner meets the long axis and the forward step. The same hit 25 degrees
  off meets a shorter base and a slower step. The decision (rush around, take on square, set wide) stays the player's.
- **Witness (staged, one body).** A fixed impulse at 0, 30, 60 and 90 degrees off the stride and off the set. Today
  every row is identical. On, the stride falls first across it, the set first along it. That direction dependence is
  what the evidence supports.

### POSTURE_FORCE: leg capacity by posture, and the energy of holding it (Run Game's mechanism)

- **Force.** One curve multiplies leg drive (push, strike, the anchor and lean limits through pushForce) by posture:
  peak at a mid posture (about 0.6-0.7, a half squat), falling about 15% at posture 1. First fix the posture-to-knee
  mapping the curve needs.
- **Energy.** A posture term on the isometric charge in `spendEnergy`, by Pethick's ratio. This is the late-drive
  "got tall" cost.
- **Witness (Run Game's).** The same two bodies, inputs and seed: a drive block and a bull rush, with the requested
  posture 0.7 against 1.0 (mirrored, a weaker and a stronger blocker). Today 1.0 wins every row. On, 0.7 should win or
  tie the push rows; the base rows are BASE_ORIENT's.

### ANCHOR_BASE's sink target, re-pointed at the optimum

Today it sinks a heavily loaded protector to 0.6 + 0.35 technique (up to 0.95), because lower is always better. With
POSTURE_FORCE the target becomes the posture where his anchor bound (k m w0^2 critDev x the force factor) peaks, and
technique sets how close he gets to it. This is a request change only, made after POSTURE_FORCE lands.

### Walk-back (OL), with BASE_ORIENT

Driven back, a set protector's coached recovery is "hop back with both feet and lower the hips". In BASE_ORIENT
terms, his step back is a set-stance step (wide base, backpedal factor) taken while his base stays set, rather than a
running stride. Read it on the walk-back probe (walkback.mts) once BASE_ORIENT is in. It needs no separate build
unless the read shows a gap.

## 4. Reads (per flag, two attempts each)

| row | today (engine-59, RUSH_LEAN_BOUND on) | NFL / bound |
|---|---|---|
| **DL falls /100: edge, driven over backward** (the named remainder) | about 2 | the DL total about 1 |
| DL falls /100: interior, all classes | about 1 | |
| OL falls /100 | 2.5-3.7 | about 1-5 |
| edge past outside / level / inside, per dropback (pressure-source) | 0.4-0.5% / 2.6-3.8% / 6.5-8.1% | 3.8 / 3.0 / 6.4% |
| come-offs and rides (ride-pair.py) | | |
| fixtures | the single-body direction witness; Run Game's posture pair; an edge hit square vs at 25 deg (stays up / falls) | |

The edge past-outside row matters both ways. A long stride base along his path could let him run the arc through
contact (good). A short base across could make a rusher turning the corner easier to knock down (also real). Both are
earned from the body, not set.

## 5. What this does not do

- No posture or technique is banned or capped. The controller keeps choosing depth, angle and stance and pays the cost.
- No rating awards a stand-up. Balance and mass keep their present totals, only distributed by direction.
- RUSH_PAD_LEVEL stays parked. If BASE_ORIENT leaves the edge class standing, the matched comparison above is the
  starting point again.

## Outcome: BASE_ORIENT, two attempts, both worse; removed (2026-11-14)

The engine-61 stack (RUSH_LEAN_BOUND, THROW_HOLD, POCKET_REACH, REP_SEEN on), 16 games x seeds 11 / 23. True falls
per 100 dropbacks (fall-proxy.py), off → on:

| | OL | DL |
|---|---|---|
| off | 3.6 / 2.8 | 4.8 / 3.9 |
| attempt 1: set wide across his facing (a parallel stance) | 8.5 / 6.7 | 8.2 / 7.7 |
| attempt 2: set staggered along his facing (a fighting stance) | 6.7 / 4.5 | 7.4 / 4.2 |

Lineman falls on runs rose under both attempts (all fall events: OL 27 → 43 and 31 → 35 on runs in attempt 1).

**Attempt 1** made head-on contact, the linemen's main load, meet the set ellipse's short axis. The stagger evidence I
had cited (van Mierlo's stance was 0.40 m long by 0.15 m wide) points the other way, so attempt 2 staggered the set
along his facing. **Attempt 2** made both shapes weakest across. Falls still rose, by less.

**Why it fails either way.** A fall is a threshold crossed in the direction of the push. With pushes spread over many
directions (rips, swims, angled hits, drives), an equal-area ellipse loses more falls on its short axis than its long
axis saves, whichever way it points. Keeping the area while taking only the direction dependence from the evidence is
not neutral. It costs on the weak side.

**What re-opening needs.** Measured magnitudes: how much a lineman's stagger adds along the line of force, and how
little it costs across. Those could come from instrumented stance or perturbation work on athletes, or from NFL
tracking of who goes down by direction of the hit. They would replace an area-preserving reshape. The edge
driven-over row (about 2 /100) stays open. POSTURE_FORCE is next only with Integration's go. It does not depend on
this result.

## Outcome: POSTURE_FORCE, one build, no effect; removed; the premise does not hold at the engine's posture range (2026-11-14)

**The witness** (test/posture-witness.test.ts) is staged four-vertical pass reps (rosters 1-6, seeds 1-2, Cover 1).
Every OL's posture request is held at 0.7 or 1.0. Ground the line gives up from 0.8 s to 2.5 s or the throw: 2.81 yd
at 0.7, 2.73 at 1.0. Lower wins, as Run Game said, but by 0.08 yd. In the World alone the push does not depend on
posture: two bodies driving chest to chest moved identically (0.710 yd) at 0.7 and 1.0. So "lower wins" is the
balance model (base and w0 grow) and the controller's lean bounds, not leg force.

**The posture-to-knee-flexion mapping (stated).** comHeightAt drops the COM by d = 0.25 x posture x (0.4 + 0.6 x bend).
With the trunk upright, thigh and shank of equal length and hip height 0.5 of stature (COM 0.55), d is about 0.91 x
(1 - cos(theta/2)):

| | posture 0.6 | posture 0.7 | posture 1.0 |
|---|---|---|---|
| bend 0.2 | 48 deg | 52 deg | 62 deg |
| bend 0.5 | 56 deg | 60 deg | 72 deg |
| bend 1.0 | 67 deg | 72 deg | 87 deg |

**The build.** Leg drive x 1 to 70 deg, falling linearly to 0.84 at 110 deg (squat-jump F0), plus the isometric
charge x 2^((theta - 60)/30). At posture 1 it removes at most 7% of leg drive (bend 1). The witness did not move:
2.807 / 2.726 yd on, against 2.807 / 2.726 off.

**Why.** The engine's deepest posture is a half squat, where the evidence puts the force optimum and where coaching
says "low man wins" is right. The coached "too low" failure (past about 90-100 deg of flexion, the COM behind the feet)
cannot occur in the engine, because posture never goes that deep. Run Game's note assumed a 25% COM drop is a deep
squat (over 100 deg). By this geometry it is about 87 deg at most. I did not spend a second attempt on a mechanism with
nothing to act on.

**What would make posture matter.** Either the posture range extends past a half squat (then the force-angle and
COM-behind-the-base costs apply there), or a cost at the engine's own range is found. The low-posture research
suggests the next candidate is mobility: first-step and lateral quickness fall in a deeper crouch, even within a half
squat (Takayama: 70/70 slower off the mark than 30/30). That is a movement-rate cost, not a force one. **ANCHOR_BASE's
sink re-point** depends on there being an optimum inside the range. By this mapping the optimum is posture 1 for most
bodies, so the re-point has nothing to move to unless the mobility cost is added.
