/** Body bumps share external motion through existing blocks and grasps.
 * Never move just one member of a coupled constraint through another body.
 */
import { bodyRadius } from '../physics/bodyshape.js';
import { contactGroup, resolveGroupContact, type ContactGroup } from '../physics/contact.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

export function resolveBodyContacts(sim: PlaySim): void {
  const groups = new Map<Agent, ContactGroup>();
  const assign = (members: Agent[]) => {
    const group = contactGroup(members.map(a => a.body));
    for (const a of members) groups.set(a, group);
  };
  for (const e of sim.engagements) assign([e.blocker, e.defender, ...e.helpers]);
  // Read the live bond, not a set captured before updateBond released it.
  if (sim.bond) assign([sim.bond.carrier, ...sim.bond.tacklers]);
  for (const a of sim.agents) if (!groups.has(a)) assign([a]);

  // Local projection can reintroduce a neighboring overlap in a crowded
  // trench. A bounded second/third pass settles it; no permanent new bonds.
  for (let pass = 0; pass < 3; pass++) {
    let corrected = false;
    for (let i = 0; i < sim.agents.length; i++) {
      const a = sim.agents[i], ga = groups.get(a)!;
      for (let j = i + 1; j < sim.agents.length; j++) {
        const b = sim.agents[j], gb = groups.get(b)!;
        if (ga === gb) continue;
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= (a.profile.radius + b.profile.radius) * 1.12) continue;
        // A coincident pair still needs separation. Incoming relative motion
        // supplies the normal; stationary coincidences use stable player IDs.
        const rvx = a.vel.x - b.vel.x, rvy = a.vel.y - b.vel.y;
        const speed = Math.hypot(rvx, rvy);
        const angle = ((a.idx + 1) * 13 + (b.idx + 1) * 7) * 0.618;
        const nx = distance > 1e-8 ? dx / distance : speed > 1e-8 ? rvx / speed : Math.cos(angle);
        const ny = distance > 1e-8 ? dy / distance : speed > 1e-8 ? rvy / speed : Math.sin(angle);
        const minimum = 0.9 * (bodyRadius(a.body, nx, ny) + bodyRadius(b.body, nx, ny));
        if (distance >= minimum - 1e-6) continue;
        const carrier = sim.carrier;
        if (sim.t >= 0 && sim.firstContactX === null && a.team !== b.team && (carrier === a || carrier === b)) {
          sim.firstContactX = carrier.pos.x;
          sim.event('carrier_contact', carrier, carrier === a ? b : a, 'body collision');
        }
        resolveGroupContact(ga, gb, { x: nx, y: ny }, minimum - distance);
        corrected = true;
      }
    }
    if (!corrected) break;
  }
}
