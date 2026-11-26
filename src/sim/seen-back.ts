/** BACK_SEEN (default on; BACK_SEEN=0 restores; Rules + Coaching, step 6): the back a defender keys is the one he sees.
 * - The rule: a backfield player at the snap (behind the line, inside the core, not the passer), from the offense's
 *   alignment as he observes it.
 * - With two backs he keys the deeper one (in the I the tailback, the mesh back; "read the near back through the
 *   fullback" is the near back when they stand level). When two stand level (split backs), the one nearer to him.
 * - With none (an empty set), he has no back key and falls to his next key.
 * Off: the player in the slot labelled RB, wherever he aligned. That is the offense's label, and it named an empty
 * set's detached RB as "the back". */
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

export const BACK_SEEN = process.env.BACK_SEEN !== '0';
const LEVEL = 0.25;

export function seenBack(sim: PlaySim, observer: Agent): Agent | undefined {
  if (!BACK_SEEN) return sim.slot('RB');
  const off = sim.offAlign, by = off.ballY, dir = sim.attackDir('O');
  const surface = Math.max(Math.abs(off.coreEdge.S - by), Math.abs(off.coreEdge.W - by));
  const backs = sim.offense.filter((o) => {
    const sp = off.spots[o.slot];
    return o !== sim.qb && !!sp?.backfield && Math.abs(sp.pos.y - by) <= surface + 1;
  });
  if (!backs.length) return undefined;
  const depth = (o: Agent) => (sim.los - off.spots[o.slot]!.pos.x) * dir;
  const deepest = Math.max(...backs.map(depth));
  const level = backs.filter((o) => deepest - depth(o) <= LEVEL);
  if (level.length === 1) return level[0];
  const oy = sim.defAlign.spots[observer.slot as keyof typeof sim.defAlign.spots]?.pos.y ?? observer.pos.y;
  return level.sort((p, q) => Math.abs(off.spots[p.slot]!.pos.y - oy) - Math.abs(off.spots[q.slot]!.pos.y - oy))[0];
}
