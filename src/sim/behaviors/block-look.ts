/** A called receiver block fake. It presents real steps and low pads, without
 * installing hands or a block; the called route/blocking continuation owns the
 * next action. Opponents see the same ordinary delayed body pictures. */
import type { Intent } from '../../physics/world.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import { goTo } from './common.js';

export class ReceiverBlockLook implements Behavior {
  readonly kind = 'block-look';
  constructor(
    readonly target: Agent,
    readonly until: number,
    readonly passOption: boolean,
    private readonly continuation: () => Behavior,
    /** The presentation landmark's depth past the line (yd). */
    private readonly landmark = 0.5,
  ) {
    if (!Number.isFinite(until) || until <= 0) throw new Error('Block look requires a positive called release time');
  }

  update(a: Agent, sim: PlaySim): Intent {
    if (sim.t >= this.until) {
      a.stance = 'high';
      a.behavior = this.continuation();
      return a.behavior.update(a, sim);
    }
    const seen = sim.see(a, this.target);
    a.stance = 'low';
    // The familiar stalk stand-off, with a shallow presentation landmark.
    // No strike, engagement, target-position truth or artificial translation.
    // Keeping this look shallow also avoids designing a downfield block into
    // a pass. Actual contacts and pass legality must still be inspected.
    const point = { x: Math.max(a.pos.x, Math.min(sim.los + this.landmark, seen.pos.x - 2)), y: seen.pos.y };
    return { ...goTo(a, point, { speed: .85, facing: Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x) }),
      posture: .7 };
  }
}

/** The call installs a visible opponent to sell to from the snap alignment.
 * It does not inspect the defender's private assignment or future behavior. */
export function installBlockLook(a: Agent, sim: PlaySim, continuation: () => Behavior, receiving: boolean): Behavior {
  const look = sim.offCall.receiverBlockLook?.[a.slot as keyof NonNullable<typeof sim.offCall.receiverBlockLook>];
  if (!look) return continuation();
  const spot = sim.offAlign.spots[a.slot];
  if (!spot || spot.inline || spot.backfield) throw new Error('Block look is a detached perimeter receiver responsibility');
  const corners = sim.defense.filter(d => d.player.position === 'CB');
  if (!corners.length) throw new Error('Perimeter block look needs a visible corner at installation');
  const target = corners.reduce((best, d) =>
    Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y) < Math.hypot(best.pos.x - a.pos.x, best.pos.y - a.pos.y) ? d : best);
  return new ReceiverBlockLook(target, look.until, receiving, continuation);
}
