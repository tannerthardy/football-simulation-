import type { DropType } from '../playbook/types.js';
import type { PlaySim } from './playsim.js';

/** Where and when the called drop puts the QB (los-relative x, seconds). */
export function dropSpec(drop: DropType, qbStartX: number, los: number, gun: boolean): { x: number; time: number } {
  switch (drop) {
    // Depths at the throw match tracking (median 7.9 yd behind the line).
    case 'quick':
      return gun ? { x: los - 6.6, time: 0.75 } : { x: los - 5.0, time: 1.05 };
    case 'gun3':
      return gun ? { x: los - 7.3, time: 1.0 } : { x: los - 6.2, time: 1.3 };
    case 'gun5':
      return gun ? { x: los - 8.0, time: 1.4 } : { x: los - 8.0, time: 1.75 };
    case 'five':
      return { x: los - 8.0, time: gun ? 1.4 : 1.8 };
    case 'seven':
      return { x: los - 9.5, time: gun ? 1.8 : 2.3 };
    case 'pa':
    case 'boot':
      return { x: los - 8.3, time: 1.95 };
  }
  void qbStartX;
}

/** The launch point every lineman knows from the call: the depth of the called
 * drop (null when the call has no pass concept). Not the QB's live spot. */
export function calledLaunchX(sim: PlaySim): number | null {
  const concept = sim.offCall.pass;
  if (!concept) return null;
  return dropSpec(concept.drop, sim.qb.pos.x, sim.los, sim.offCall.formation.qb !== 'under').x;
}
