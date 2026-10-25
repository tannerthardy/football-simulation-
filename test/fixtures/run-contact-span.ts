import { contactFixture } from '../../scripts/diag/run-contact-technique.js';
import type { Intent } from '../../src/physics/world.js';

/** A contact acquired at ordinary reach, then separated by achieved motion.
 * Bodies and arm lengths are the existing generated mechanical fixture's;
 * range is independent of the shorter hand joint's working extension.
 * This reduced contact island is not a replay or a football-outcome claim.
 */
export function spanFixture(type: 'run' | 'pass' = 'run') {
  const f = contactFixture({ type, runBlock: 60, passBlock: 60 });
  const { blocker: b, defender: d, engagement: e } = f;
  e.control = -.3;
  e.nextMoveAt = Infinity;
  const radii = b.profile.radius + d.profile.radius;
  const fullSpan = radii + Math.max(b.player.measurables.armIn, d.player.measurables.armIn) / 36;
  const place = (distance: number) => {
    d.body.pos = { x: b.pos.x + distance, y: b.pos.y };
    b.body.facing = 0;
    d.body.facing = Math.PI;
  };
  const commands = (): Intent[] => f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  return { ...f, radii, fullSpan, place, commands };
}
