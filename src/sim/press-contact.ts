/** The defender's decision to jam a receiver at the line (a palm on the receiver's chest, a World `hands` joint).
 * The decision is the defender's, on his own call and picture; the receiver's release code asks it and owns the
 * contact's life (RouteRunner.handleRelease: the palm's follow, the receiver's swipe, the end at 5 yd or the throw),
 * so the joint is made at the same point in the tick as before. The receiver never reads the defense's call. */
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

/** Does defender `d` jam receiver `r` now (he is within reach and facing him: the caller checks the geometry)?
 * Press man: the call put him in press on this man. */
export function jamWanted(d: Agent, r: Agent, sim: PlaySim): boolean {
  const spot = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots];
  return !!spot?.press && spot.manTarget === r.slot;
}
