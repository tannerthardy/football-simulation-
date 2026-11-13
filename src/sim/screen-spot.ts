/** Where a called screen is designed to be caught: the screen receiver's
 * route landmark from his snap alignment. Part of the call, known to the
 * whole offense (the QB throws to it, the blockers block for it). */
import type { Vec2 } from '../core/vec.js';
import { getRoute } from '../playbook/routes.js';
import type { PassConcept } from '../playbook/types.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

export interface ScreenSpot { receiver: Agent; routeId: string; spot: Vec2; side: number }

export function screenSpot(sim: PlaySim, concept: PassConcept): ScreenSpot | null {
  const spec = concept.screen;
  if (!spec) return null;
  const off = sim.offAlign;
  const slotOf = (ref: string) => off.numbering[ref as keyof typeof off.numbering];
  const receiver = sim.slot(slotOf(spec.receiver) ?? (spec.receiver === 'B' ? 'RB' : ''));
  if (!receiver) return null;
  const at = off.spots[receiver.slot]?.pos ?? receiver.pos;
  const side = Math.sign(at.y - sim.ballY) || off.strongSign;
  const ref = spec.receiver;
  const routeId = ref === 'B' || ref === 'B2' ? concept.back
    : (ref[0] === 'S' ? concept.strong : concept.weak)[Number(ref[1]) as 1 | 2 | 3 | 4] ?? 'go';
  const route = getRoute(routeId);
  const land = route.points.find(p => p.s === 0) ?? route.points[Math.min(1, route.points.length - 1)];
  return { receiver, routeId, side, spot: { x: sim.los + land.d, y: at.y + land.l * side } };
}
