# ZONE_LADDER 2: the underneath zone defender as one pattern drift (2026-11-18)

Coverage, C14 underneath rebuild. Flag `ZONE_LADDER`, off. Branch `coverage/C14-zone-ladder2`, on develop 097e3b13 (engine-86).

## Why

Three builds on `ZoneCoverage`'s relation layer came back null or partial: `ZONE_COMMIT` (hysteresis on two switches),
`ZONE_GOAL` (one held crosser goal) and `ZONE_FLOW` (one held flow goal). Each fought the same structure: about 13
technique branches, each choosing on its own test (lane, lane carry, crosser carry, stem read, settle, landmark, and
others). The flips moved to the next branch boundary, and a per-receiver goal is not what the NFL shows.

The same-operator NFL comparisons (scripts on `coverage/C14-zone-relation` and #793's branch) say what the underneath
man actually does in the 1.0 s before the release:

| measure | NFL | ours (develop) |
|---|---|---|
| his lateral vs the flow of routes in his band 0.5 s earlier: slope (r) | 0.66 (0.59) | 0.53 (0.46) |
| his lateral vs the flow arriving from the next band: slope (r) | 0.37 (0.33) | 0.08 (0.07) |
| drift toward the throw when the QB's body is not on the throw side | 1.83 yd/s | 0.85 |
| nearest man relates to the thrown receiver | 39-45% | 30-73% |
| deeper crossers complete | 72% | 51% |

The NFL drift is a unit-wide shade toward where the pattern is flowing, including routes not yet in his area. It is
not a QB-eye lean and not a goal on one receiver.

Execution check: no coverage stage bounds the request (`tick-trace.mts`). The body's start is isotropic at 5-6 yd/s^2
(`shuffle-bench.mts`). Tools is building a direction-dependent start, so the drift must not rely on today's lateral
start.

## The rule

Before the throw, once he reads pass, the underneath zone defender has one relation technique, the pattern drift:

1. **Eyes:** on the QB.
2. **Feet: the pattern's flow.**
   - Take the seen (delayed) lateral velocity of every route 0-20 yd deep in his band and the next band out.
   - Weight each by nearness to his band: 1 inside it, falling linearly to 0 a band's width outside.
   - His feet move with that flow (its weighted lateral velocity), held at his band's edges. A first version targeted
     `landmark + flow × ball flight time`, an offset of about half a yard; that drift was too small (see the record).
3. **Depth: over the deepest threat.** Never shallower than the deepest route in his band less a yard; otherwise at his
   landmark depth, and never deeper than his landmark plus a yard.
4. **Balance:** he drifts no faster than he can stop in one plant step: v^2 / (2 brake) <= 0.5 yd. That is about 3-4 yd/s
   by his brake rating. The break on the throw and the rally start from a base. The cap follows from his body, not
   from a fraction of anything measured.
5. **One technique:** the drift replaces the relation branches `lane`, `lane-carry`, `open-carry-cross`,
   `hook-stem-read`, `lane-hold`, `zone-settle` and `zone-landmark`. There is nothing among them to flip between.
6. **Kept as they are:**
   - Seat rules: FLAT_SINK, flat expand / across, curl-flat widen, CoverageDefender's match rules (MUSH_MATCH, apex,
     wall, trap, rob).
   - Vertical carries: seam and carry-wall, with the edge pass-off.
   - The break on the throw: `playsThrow` -> `playBall`, the old lane geometry.

Not in it: no NFL slope is a constant in the code. v3's breakup piece and v2's crosser piece come in only if they follow
from the drift.

Open, after a first read:
- The Cover 2 flat corner's turn-up carry, as a seat rung on FLAT_SINK.
- The squeeze-break's release on a stopped #1 that climbs.
- Rules' Book/Stubbie rungs, now in MUSH_MATCH on develop.

## Acceptance (judged together)

1. **Flow slopes vs the NFL:** band 0.66 and outside band 0.37 (`flow_drift.py`, 8 games, matched off export).
2. **Crosser trace:** the nearest man's lateral ÷ the thrown crosser's, NFL 0.3-0.6 (`cross-trace.mts`).
3. **Crossers and digs:** completion and yards per attempt (`slide-control.mts`). Deeper crossers should rise toward the
   NFL's 72%, and shallow-crosser yards and YAC should fall.
4. **Zone YAC and PBU by coverage:** YAC must not rise as the price of the slopes.
5. **Dither:** technique changes, picked-receiver changes, request reversals and facing jumps per man per second.
6. **Defense's never-touched 20+ count** (`flight-belief.mts`).

Controls:
- A shallow under a dig: he must not vacate under the dig.
- Flood / levels: the flow goes one way, then the throwback, which must stay punishable.
- The Book nickel (MUSH_MATCH).

## Record (2026-11-18): not landed, flag off

| | off | v2 velocity drift | v5 (v2 + sitting route keeps lane + arriving lean) | NFL |
|---|---|---|---|---|
| band slope (r) | 0.48 (0.46) | 0.60 (0.52) | 0.44 (0.42) | 0.66 (0.59) |
| outside-band slope | -0.10 | -0.02 | 0.04 | 0.37 |
| request / body lateral reversals per s | 0.54 / 0.13 | 0.30 / 0.04 | 0.37 / 0.05 | |
| completion / PBU / INT | 74.0 / 46 / 10 | 75.2 / 49 / 5 | 73.6 / 52 / 5 | |
| digs | 63.2% / 9.28 | 69.3% / 11.02 | 67.6% / 10.80 | |
| zone YAC C2 / C3 | 6.75 / 5.40 | 3.87 / 5.26 | 4.92 / 5.13 | |

Develop 097e3b13, staged sets and 8-game exports.

Controls (`scripts/diag/coverage/ladder-controls.mts`, 3 seeds, off -> v5):
- drive's shallow: 15.7 -> 24.2 yd/att, YAC 13.1 -> 21.5 (he stays over the dig and the shallow runs free).
- flood's back_flat: YAC 14.2 -> 29.5; flat YAC 3.7 -> 10.8.
- levels: neutral.

Interceptions (`int-diff.mts`): 5 of the 10 lost were by the old lane / stem-read position, 2-5 yd from the catch at the
release (the undercut); 4 were path divergence in untouched jobs.

**What this established:**
- The single-technique drift buys steadier defenders and lower YAC.
- It does not produce the NFL's anticipation of routes arriving from the next band in any version.
- It costs the shallow-under-dig and the flood flat, and gives up the lane's undercuts.
- The outside-band gap is largely the offense's: our arriving flow is half the NFL's, and the QB has no launch drift.
- Re-measure after Rules' STEM_WORK and the QB's pocket item land.
- (v4, c8f2d8c1f, carried v3's lateral hold by mistake; v5 is the clean version.)
