# TACKLE_SET: the tackle's set against an edge rusher (attempt 1, stopped)

Integration, 2026-11-12. The edge-rush diagnosis (`2026-11-12-edge-rush.md`) found our tackle ending deeper than the
QB (-8.2 vs -7.8 at 3.0 s; NFL tackle -6.8) while still asking to retreat. The assignment: kick to a set depth that
meets the arc short of the launch point, from what the tackle knows, then anchor. Add no strength or anchor capacity.
If he is driven back while asking to hold, report requested vs achieved and stop.

## Mechanism (flag `TACKLE_SET`, off)

- **Set depth from the call.** The tackle sets no deeper than the called drop's launch point plus a body width
  (`tackleFloor`, 1.0 yd). The drop spec now lives in `src/sim/called-drop.ts`, shared with the QB; the move is
  bit-identical. He still kicks with what he sees of the rusher's path, as PASS_KICK does.
- **Why it was never an anchor (off).** In the rep, the PASS_KICK extension follows the rusher's depth down to half a
  yard short of the QB's *live* spot, so a drifting QB takes the tackle with him. The mirror also runs across the
  rusher's line to the QB. Once the rusher is wide and deep that line is mostly lateral, so mirroring along it is a
  retreat: an LT 0.35 yd short of the floor asked for -7.8 yd/s.
- **The request (on).**
  - Short of the floor: no more depth speed than he can brake off before it. This uses the braking law movement
    already uses: sqrt(2 * 0.8 * brake * distance), as in `kinematics.ts`.
  - At the floor: none.
  - Unengaged: the PASS_KICK set is clamped at the floor and stops matching the rusher's retreat there.
- **Off is bit-identical.** Seed 999 export hash, against develop af9d7bd1.

## Bench: edge-probe, requested vs achieved (seeds 101-104, 4 games)

`node --import tsx scripts/diag/effective-mass/edge-probe.mts 101 4`, summarised by `edge-probe-sum.py`. The x
columns are yards past the line; velocities are along x, where negative is deeper.

| 3.0 s, ball in | off | on |
|---|---|---|
| tackle requested x | -2.01 | 0.00 |
| tackle achieved x | -2.26 | -1.48 |
| tackle depth | -7.97 | -7.36 |
| QB depth | -7.89 | -7.86 |
| tackle minus QB (NFL about +1.0) | +0.15 | +0.65 |
| tackle deeper than the QB | 48% | 32% |
| rusher requested / achieved x | -3.52 / -2.35 | -3.39 / -1.67 |
| rusher achieved lateral | -0.57 | -0.31 |
| engaged | 78% | 77% |

At 2.5 s the tackle asks for -1.54 (off -2.60) and achieves -2.57 (off -2.77).

### Asking to hold, being driven

Tackles requesting 0 (at the set):

| time | engaged n | achieved x p25 / 50 / 75 | faster than 1 yd/s | rusher depth vs tackle |
|---|---|---|---|---|
| 2.5 s | 57 | -2.84 / -2.30 / -1.65 | 95% | +0.33 (in front) |
| 3.0 s | 74 | -1.70 / -1.15 / -0.65 | 58% | +0.23 (in front) |

Repro: `test/tackle-set.test.ts`, four verticals vs Cover 2, seed 2.
- The LT reaches the set (x 33.0) at about -3.5 yd/s and asks for 0 from there.
- A DE on a swim, then a spin, holds about 1000 N on the hands joint, about the tackle's braking capacity.
- The tackle is walked to 31.7, 1.3 yd past the set, at 3.0 then 2.2 yd/s.
- The rusher stays 0.2-0.3 yd in front of him, driving straight through: his lateral request is -3 to -5 yd/s and he
  achieves about 0.

## Reading

The rule is now what the tackle asks for. What stops him short of the set is no longer his controller but the
rusher's load. Per the assignment I stop there: no anchor capacity added, no game read of TACKLE_SET alone. Its
effect would be to measure how far a rusher walks a tackle, which EDGE_ARC changes.

The load comes from a rusher whose path aims through the tackle. In the rep his aim is the corner beside the
blocker, measured along the axis to the QB, and once the bodies are level that point is behind the tackle. So:

- The next mechanism is EDGE_ARC (the rusher's landmark), not the tackle.
- TACKLE_SET's anchor should be read with EDGE_ARC on, where the rusher's force is spent going around rather than
  through.
- If a tackle at his set is still walked back by a rusher running the arc, that is the anchor question (physics) to
  re-diagnose, not a controller fix.
