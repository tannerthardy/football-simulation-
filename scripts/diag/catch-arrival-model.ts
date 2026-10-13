/** Diagnostic-only moving arrival. Reconstruct the baseline visible window
 * from pictures its controller already consumed; no added see or RNG call.
 */
import {FIELD_WIDTH} from '../../src/core/field.js';
import {clamp} from '../../src/core/vec.js';
import {fatigueFactor,movingArrivalVelocity,type MoveCommand} from '../../src/physics/kinematics.js';
import {timeToReach} from '../../src/physics/reach.js';
import {availability,supportParams} from '../../src/physics/support.js';
import type {Agent} from '../../src/sim/agent.js';
import {catchSpot} from '../../src/sim/behaviors/receiver.js';
import {TRACKING_REACH_BONUS} from '../../src/sim/catching.js';
import type {Perceived} from '../../src/sim/perception.js';
import type {PlaySim} from '../../src/sim/playsim.js';
export interface Consumed {target:number;delay?:number;seen:Perceived}
export function windowFromPictures(a:Agent,sim:PlaySim,cues:Consumed[]){
 if(sim.ball.kind!=='air')return null;
 const eligible=sim.offense.filter(r=>r!==sim.qb&&!['LT','LG','C','RG','RT'].includes(r.slot));
 const pictures=eligible.map(r=>({r,seen:cues.filter(c=>c.target===r.idx&&c.delay===undefined).at(-1)?.seen}));
 if(pictures.some(p=>!p.seen))return null;
 for(const sample of sim.ballPath){const remaining=sample.t-sim.t;if(remaining<0||sample.z<.25)continue;
  for(const {r,seen} of pictures){if(sample.z>r.profile.maxCatchHeight*.92)continue;
   const p={x:sample.x,y:sample.y},reach=r.profile.reach+TRACKING_REACH_BONUS;
   if(Math.hypot(p.x-seen!.pos.x,p.y-seen!.pos.y)>r.profile.vmax*remaining+reach)continue;
   const passing=Math.hypot(p.x-seen!.pos.x-seen!.vel.x*remaining,p.y-seen!.pos.y-seen!.vel.y*remaining)<=reach;
   if(passing||timeToReach({pos:seen!.pos,vel:seen!.vel,profile:r.profile},p,reach)<=remaining)
    return {p,t:sample.t,receiver:r,seen:seen!};
  }
 }
 return null;
}
export function arrivalChoice(a:Agent,sim:PlaySim,original:MoveCommand,cues:Consumed[]){
 const window=windowFromPictures(a,sim,cues);
 if(!window||!a.tags.has('onBall'))return {command:original,reason:'no-acquired-flight-window',window:null};
 const {receiver,seen,p,t}=window,spot=catchSpot(a,sim);
 const tt=spot?timeToReach({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},spot.p,a.profile.reach):Infinity;
 const earlierBall=!!(spot&&spot.t<t&&tt<=spot.t-sim.t+.05);
 const reachableBall=!!(spot&&tt<=spot.t-sim.t+.05&&spot.t<=t+.05);
 const nearCarry=!earlierBall&&Math.hypot(seen.vel.x,seen.vel.y)>.5&&
  Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y)<=a.profile.radius+receiver.profile.radius+a.profile.reach;
 const detail={p,t,receiver:receiver.idx,seen,spot,earlierBall,reachableBall,nearCarry};
 if(earlierBall||reachableBall)return {command:original,reason:'preserve-reachable-ball',window:detail};
 if(nearCarry)return {command:original,reason:'preserve-existing-carry',window:detail};
 const dx=p.x-a.pos.x,dy=p.y-a.pos.y,distance=Math.hypot(dx,dy)||1;
 const control=2.2+2.5*(1-a.r('tackling'));
 const speed=Math.min(a.profile.vmax,Math.sqrt(control*control+2*a.profile.brake*.7*Math.max(0,distance-.3)));
 const drive={x:dx/distance*speed,y:dy/distance*speed};
 // Exact fingerprint of playBall's existing drive branch. goTo/track/rule
 // requests and unseen-throw coverage must never be silently replaced.
 if(Object.keys(original).some(k=>k!=='vel')||Math.hypot(original.vel.x-drive.x,original.vel.y-drive.y)>1e-8)
  return {command:original,reason:'preserve-other-controller-branch',window:detail};
 const contact=a.profile.radius+receiver.profile.radius+a.profile.reach*.65;
 const targetSpeed=Math.hypot(seen.vel.x,seen.vel.y);
 if(targetSpeed<=.5||t-sim.t>.6||distance>contact+(a.speed+targetSpeed)*.6||a.engagement||a.isDown(sim.t)
  ||a.body.support?.foot||Math.hypot(a.body.support?.load.x??0,a.body.support?.load.y??0)>1e-6)
  return {command:original,reason:'preserve-outside-free-moving-arrival',window:detail};
 // This point moves with the consumed receiver velocity and crosses the
 // visible ball window at t. Subtract its remaining travel, rather than
 // double-leading a point which is already in the future.
 const goal={x:p.x-seen.vel.x*(t-sim.t),y:clamp(p.y-seen.vel.y*(t-sim.t),.3,FIELD_WIDTH-.3)};
 const capacity=a.body.support?availability(a.body.support,supportParams(a.profile),fatigueFactor(a.body.energy)):1;
 const vel=movingArrivalVelocity(a.body,goal,seen.vel,a.profile.vmax*a.speedScale,contact,
  2.5+2*(1-a.r('tackling')),1,capacity);
 return {command:{...original,vel},reason:'moving-window-arrival',window:detail,goal};
}
