/**
 * Teammates see and feel each other. A player does not plan to close on a
 * teammate faster than he could absorb the contact over a short horizon:
 * linemen working side by side stay hip to hip instead of crashing into
 * each other, a back follows his puller without running him over, and a
 * second tackler joins a pile instead of spearing his own man.
 *
 * This shapes intents only. Bodies still collide physically when pushed
 * together or when a player is already moving too fast to stop.
 */
import type { Intent } from '../physics/world.js';
import {fatigueFactor,followAccel} from '../physics/kinematics.js';
import {availability,supportParams} from '../physics/support.js';
import type { Agent } from './agent.js';
import type {Perceived} from './perception.js';

/** Time a player gives himself to close the gap to a teammate, s. */
const CLOSE_HORIZON = 0.3;
/** Gap at which a teammate starts to shape movement, yd. */
const AWARE_GAP = 1.2;
/** Touch distance as a fraction of the torso radii (matches the world). */
const TOUCH = 0.9;

export function spaceTeammates(agents: readonly Agent[], intents: Intent[],
  observe: (a:Agent,b:Agent)=>Pick<Perceived,'pos'|'vel'> = (_a,b)=>b): void {
  const n = agents.length;
  for (let i = 0; i < n; i++) {
    const a = agents[i];
    const ia = intents[i];
    if (!ia || ia.free || ia.dive || a.body.support?.state !== 'up') continue;
    const capacity=availability(a.body.support,supportParams(a.profile),fatigueFactor(a.body.energy));
    let vx = ia.vel.x, vy = ia.vel.y;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const b = agents[j];
      if (b.team !== a.team) continue;
      const seen=observe(a,b);
      const dx = seen.pos.x - a.pos.x, dy = seen.pos.y - a.pos.y;
      const d = Math.hypot(dx, dy);
      const touch = TOUCH * (a.profile.radius + b.profile.radius);
      const gap = d - touch;
      if (d < 1e-6) continue;
      const nx = dx / d, ny = dy / d;
      const brake=followAccel(a.body,{x:-nx*1e3,y:-ny*1e3},ia.cutSkill??1,capacity);
      const decel=Math.max(.1,-brake.x*nx-brake.y*ny);
      const current=Math.max(0,(a.vel.x-seen.vel.x)*nx+(a.vel.y-seen.vel.y)*ny);
      const stopping=current*CLOSE_HORIZON+current*current/(2*decel);
      if(gap>Math.max(AWARE_GAP,stopping))continue;
      // Closing he plans, relative to where the teammate is going now.
      const rx=vx-seen.vel.x,ry=vy-seen.vel.y;
      const closing=rx*nx+ry*ny;
      // A nearby teammate beside a clean crossing lane is not an obstacle.
      // Check the swept approach before restricting closure; this keeps a
      // narrow, passable crease from becoming a radial repulsion field.
      const speed2=rx*rx+ry*ry;
      const closest=speed2>1e-9?Math.max(0,(dx*rx+dy*ry)/speed2):0;
      if(gap>0&&Math.hypot(dx-rx*closest,dy-ry*closest)>touch)continue;
      // Budget headway plus the distance this body needs to remove relative
      // speed. Do not assume the blocker, grounded helper or occupied tackler
      // will take half the correction. The world still limits the braking.
      const allowed=Math.sqrt((decel*CLOSE_HORIZON)**2+2*decel*Math.max(0,gap))-decel*CLOSE_HORIZON;
      if (closing > allowed) {
        const cut = closing - allowed;
        vx -= nx * cut; vy -= ny * cut;
      }
    }
    if (vx !== ia.vel.x || vy !== ia.vel.y) {
      const speed=Math.hypot(vx,vy),cap=a.profile.vmax*a.speedScale,scale=Math.min(1,cap/Math.max(1e-9,speed));
      intents[i] = { ...ia, vel: { x: vx*scale, y: vy*scale } };
    }
  }
}
