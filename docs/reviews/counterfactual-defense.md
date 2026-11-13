# Counterfactual defenses: is unrealistic run defense punished?

A realistic run game must punish a defense that does something unrealistic,
and punish it in the way real football does. This check runs the same
offensive plays, bodies, seeds and measurement against three defenses:

- **current**: the production run fits.
- **hold** (`CF_FLOW=hold`): nobody flows. Free fits keep their snap landmark
  (no scrape, flow or pull reads); engaged defenders play the man and keep
  their alignment. Everyone still attacks a runner who commits to his lane,
  and still sheds, tackles and pursues.
- **over** (`CF_FLOW=over`): everybody flows. Once the line is seen moving,
  free fits, including the backside cutback player, sprint that way, and
  engaged defenders work at full lateral effort with the seen flow. Same
  reactions to a committed runner.

Edge and contain players keep their normal job in all three. The switch is a
diagnostic: it is never set in production.

## Predictions (written before the first run)

Real football says:

1. **hold is punished on the edge.** Play-side reach blocks get outside their
   man more often; the ball crosses the line outside the play-side tackle
   more often; mean gain rises, mostly from outside runs.
2. **over is punished inside.** Backside lanes open; more runs cross inside
   or behind the center (cutbacks); mean gain rises, mostly from cutbacks.
3. **current sits between them**, with fewer gains than either.

If a defense is *not* punished, the per-play mechanism (did the reach win,
was the open space there, where did the back go) says which punishment is
missing: the block, the back's read, or something else.

Probe: `scripts/diag/zone/counterfactual-probe.ts`.

## Results (first run)

96 native stretch inputs (OZ/WZ strong and weak, 3 rosters, 2 fronts, both
flips, 2 seeds), identical in every arm. Crossings are classified against
the line where it is when the back crosses.

| | current | hold | over |
|---|---|---|---|
| Gain mean / median, yd | 2.67 / 1.45 | **4.70** / 1.83 | 2.02 / 1.17 |
| Runs of 5+ yd | 0.19 | **0.36** | 0.11 |
| Play-side reach outside its man by 1.2 s | 0.38 | **0.62** | 0.38 |
| Unblocked within 4 yd at 1.5 s: edge / backside | 0.55 / 1.09 | 0.23 / 1.80 | 0.86 / **0.73** |
| Crossed outside the end / C-D gap / inside / backside | 17 / 9 / 38 / 11 | 43 / 6 / 13 / 0 | 8 / 3 / 39 / 10 |
| Stopped behind the line | 21 | **34** | **36** |
| Lateral at 1.5 s: OL / DL / LB, yd | 1.24 / 0.71 / 1.24 | 0.97 / 0.17 / 0.01 | 1.42 / 1.15 / 2.06 |

**Prediction 1 holds.** A defense that does not flow loses the edge: the
reach wins far more often and outside runs average 7.6 yd. But it also gets
more stops behind the line (34 vs 21), 23 of them by the play-side end.

**Prediction 2 fails.** Overflow is not punished; it is the best defense of
the three. It empties the backside (unblocked backside defenders 1.09 to
0.73), but the back's choices barely change (backside crossings 11 to 10,
inside 38 to 39). He does not read the overflow.

### Mechanism (traced: `scripts/diag/zone/trace-end.ts`)

Hold arm, oz_strong 31/32 Under flip: the tackle reaches the end and gets
outside him (tackle 4.0 yd play side, end 3.3). The end keeps his lateral
spot but drives vertical, from 0.9 yd past the line to 1.1 yd behind it,
inside the tackle's hip; the stretch reach only matches his forward speed.
The back, still in his designed press (until 0.8 yd from the line), turns
up at his live aim (3.9 yd) into the end. The open space was outside the
tackle.

Both failures are the same missing piece, **the back's read**:

- The press heads for a landmark and abandons it only when it is clearly
  blocked, with a patience margin. It does not read the key defender's
  leverage (end sealed inside: bounce; end wide: up inside; flow overrun:
  cut back).
- After the press, the crease choice pays 0.65 per yard of distance from
  the designed aim, so a cutback 4 yd away needs a large risk difference
  before he takes it.

A second, smaller item: a reaching blocker keeps working outside a
defender who does not widen, and does nothing about vertical penetration
inside him (`STRETCH_REACH`).

A first back read (`RUN_READ=1`, off by default) punishes overflow somewhat
more (2.2-2.95 vs 2.02) but lowers ordinary-play gains (2.0-2.45 vs 2.67).
See [run read](run-read.md).
