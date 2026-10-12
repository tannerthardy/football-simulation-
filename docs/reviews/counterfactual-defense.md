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
