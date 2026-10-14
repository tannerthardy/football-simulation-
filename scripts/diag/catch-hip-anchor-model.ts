/** Replace only the existing eligible moving-window request's anchor.
 * All information, branch protections, movement limits and metadata retained.
 */
import {FIELD_WIDTH} from '../../src/core/field.js';
import {clamp} from '../../src/core/vec.js';
import {fatigueFactor,movingArrivalVelocity} from '../../src/physics/kinematics.js';
import {availability,supportParams} from '../../src/physics/support.js';
import type {Agent} from '../../src/sim/agent.js';
import {leverage} from '../../src/sim/behaviors/common.js';
import type {PlaySim} from '../../src/sim/playsim.js';
import type {arrivalChoice} from './catch-arrival-model.js';

export function hipAnchor(a:Agent,sim:PlaySim,choice:ReturnType<typeof arrivalChoice>){
 if(choice.reason!=='moving-window-arrival'||!choice.window)return choice;
 const {receiver,seen}=choice.window,target=sim.agents[receiver],
  contact=a.profile.radius+target.profile.radius+a.profile.reach*.65,
  distance=Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y),
  force=a.runFit?.kind==='force'||(a.runFit?.kind==='edge'&&a.runFit.edge==='box'),
  offset=(force?Math.abs(leverage(a,seen.pos.y))*a.runFit!.side:leverage(a,seen.pos.y))*clamp((distance-contact)/6,0,1),
  goal={x:seen.pos.x,y:clamp(seen.pos.y+offset,.3,FIELD_WIDTH-.3)},
  capacity=a.body.support?availability(a.body.support,supportParams(a.profile),fatigueFactor(a.body.energy)):1,
  vel=movingArrivalVelocity(a.body,goal,seen.vel,a.profile.vmax*a.speedScale,contact,
   2.5+2*(1-a.r('tackling')),choice.command.cutSkill??1,capacity);
 if(!Number.isFinite(vel.x)||!Number.isFinite(vel.y)||Math.hypot(vel.x,vel.y)>a.profile.vmax*a.speedScale+1e-10)
  throw Error('Unbounded/nonfinite hip-anchor request');
 return {...choice,command:{...choice.command,vel},reason:'observed-hip-arrival',windowGoal:choice.goal,goal,offset};
}
