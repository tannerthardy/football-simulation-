/** Diagnostic only: a deep safety's conservative upfield escape hypothesis.
 * Installed own duty + the already consumed carrier picture; no helper state.
 */
import {FIELD_WIDTH} from '../../src/core/field.js';
import {clamp} from '../../src/core/vec.js';
import {interceptPoint} from '../../src/physics/reach.js';
import {isDeepZone} from '../../src/playbook/alignment.js';
import {blendApproach,gatheringApproach,leverage,runThrough} from '../../src/sim/behaviors/common.js';
import type {Agent} from '../../src/sim/agent.js';
import type {Perceived} from '../../src/sim/perception.js';
import type {PlaySim} from '../../src/sim/playsim.js';
import type {MoveCommand} from '../../src/physics/kinematics.js';
import type {DefSlot} from '../../src/playbook/types.js';

export function capApproach(a:Agent,sim:PlaySim,c:Agent,seen:Perceived,original:MoveCommand):MoveCommand {
 const zone=sim.defAlign.spots[a.slot as DefSlot]?.zone;
 if(!['FS','SS'].includes(a.slot)||!zone||!isDeepZone(zone)||seen.carrying!==true
  ||sim.bond?.tacklers.includes(a)||a.engagement||a.isDown(sim.t))return original;
 const contact=a.profile.radius+c.profile.radius+a.profile.reach*.65,
  distance=Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y),
  offset=leverage(a,seen.pos.y)*clamp((distance-contact)/6,0,1),
  {near,gather}=gatheringApproach(a,seen,contact,offset);
 if(gather>=1||distance<=contact+.5||a.pos.x<=seen.pos.x)return original;
 const vx=seen.vel.x,stop=vx<0?-vx/c.profile.brake:0,
  back=vx<0?-vx*vx/(2*c.profile.brake):0;
 // This is an escape possibility that the cap protects, not an assertion
 // that the runner will choose it. Reconsider on every acquired picture.
 const path=(t:number)=>{
  const after=Math.max(0,t-stop),initial=Math.max(0,vx),V=c.profile.vmax,
   x=t<stop?seen.pos.x+vx*t+.5*c.profile.brake*t*t:
    seen.pos.x+back+V*after-(V-initial)*c.profile.tau*(1-Math.exp(-after/c.profile.tau));
  return {x,y:clamp(seen.pos.y+seen.vel.y*t,0,FIELD_WIDTH)};
 };
 const ip=interceptPoint({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},path,
  {horizon:3,step:.1,radius:contact}),p={...ip.point,y:ip.point.y+offset};
 const speed=Math.hypot(original.vel.x,original.vel.y)/a.profile.vmax;
 return blendApproach({...runThrough(a,p,{speed}),effort:original.effort},near,gather);
}
