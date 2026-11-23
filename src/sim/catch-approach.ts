/** Free movement toward an observed receiver's moving catch window.
 * The point is a possible catch, not knowledge of the eventual catcher.
 */
import {FIELD_WIDTH} from '../core/field.js';
import {clamp,type Vec2} from '../core/vec.js';
import {fatigueFactor,movingArrivalVelocity,type MoveCommand} from '../physics/kinematics.js';
import {previewFreeMovement} from '../physics/movement-preview.js';
import {timeToReach} from '../physics/reach.js';
import {availability,supportParams} from '../physics/support.js';
import type {Agent} from './agent.js';
import type {Perceived} from './perception.js';
import type {PlaySim} from './playsim.js';
import {withMovementObjective} from './movement-objective.js';
import {reachTo} from './tackle-reach.js';

interface CatchWindow {p:Vec2;t:number;receiver:Agent;seen:Perceived}
interface BallOpportunity {p:Vec2;t:number}

/** Called only for playBall's catch-point drive. Reachable ball plays and
 * receiver carry remain owned by their existing branches. No new see/RNG call.
 */
export function movingCatchApproach(a:Agent,sim:PlaySim,original:MoveCommand,
 window:CatchWindow|null,spot:BallOpportunity|null):MoveCommand {
 if(!window||!a.tags.has('onBall'))return original;
 const {receiver,seen,p,t}=window,
  tt=spot?timeToReach({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},spot.p,a.profile.reach):Infinity,
  earlierBall=!!(spot&&spot.t<t&&tt<=spot.t-sim.t+.05),
  reachableBall=!!(spot&&tt<=spot.t-sim.t+.05&&spot.t<=t+.05),
  nearCarry=!earlierBall&&Math.hypot(seen.vel.x,seen.vel.y)>.5
   &&Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y)<=reachTo(a,receiver);
 if(earlierBall||reachableBall||nearCarry)return original;
 const distance=Math.hypot(p.x-a.pos.x,p.y-a.pos.y)||1,
  contact=reachTo(a,receiver,.65),
  targetSpeed=Math.hypot(seen.vel.x,seen.vel.y),support=a.body.support;
 if(targetSpeed<=.5||t-sim.t>.6||distance>contact+(a.speed+targetSpeed)*.6
  ||a.engagement||a.isDown(sim.t)||support?.foot
  ||Math.hypot(support?.load.x??0,support?.load.y??0)>1e-6
  ||(support&&(support.strike||Math.hypot(support.lean.x,support.lean.y)>1e-6||support.state!=='up')))return original;
 // Anchor a moving point that crosses the visible ball window at its
 // estimated time. Leading this future point again would aim beyond it.
 const goal={x:p.x-seen.vel.x*(t-sim.t),y:clamp(p.y-seen.vel.y*(t-sim.t),.3,FIELD_WIDTH-.3)};
 let closest=Math.hypot(a.pos.x-goal.x,a.pos.y-goal.y),previous={x:a.pos.x-goal.x,y:a.pos.y-goal.y};
 // Speed sums alone admit runners travelling alongside us well outside
 // reach. Reuse the existing approach planner's attainable free trajectory.
 for(const sample of previewFreeMovement(a.body,original,sim.t,12)){
  if(sample.support!=='up')return original;
  const target={x:goal.x+seen.vel.x*sample.t,y:clamp(goal.y+seen.vel.y*sample.t,.3,FIELD_WIDTH-.3)},
   relative={x:sample.pos.x-target.x,y:sample.pos.y-target.y},ex=relative.x-previous.x,ey=relative.y-previous.y,
   along=clamp(-(previous.x*ex+previous.y*ey)/Math.max(1e-12,ex*ex+ey*ey),0,1);
  closest=Math.min(closest,Math.hypot(previous.x+ex*along,previous.y+ey*along));previous=relative;
 }
 if(closest>contact+2.5)return original;
 const capacity=support?availability(support,supportParams(a.profile),fatigueFactor(a.body.energy)):1,
  vel=movingArrivalVelocity(a.body,goal,seen.vel,a.profile.vmax*a.speedScale,contact,
   2.5+2*(1-a.r('tackling')),1,capacity);
 return withMovementObjective({...original,vel},{kind:'moving',point:goal,velocity:seen.vel});
}
