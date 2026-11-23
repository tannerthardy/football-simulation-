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
import {leverage} from './behaviors/common.js';

/** BREAK_BALANCE (experimental, off; BREAK_BALANCE=1 turns it on): break on the throw you see, take a line to where the
 * receiver will be (inside-out, to the near hip), and come to balance by closing speed (the coached rule; Integration
 * 2026-11-23).
 *
 * Why (docs/reviews/2026-11-23-pursuit-build-addendum.md and the stage table that followed):
 *  - Outside catches, flags off. A first defender who is beaten by an old angle or overrun is, at the catch, 6.0 yd
 *    away and 4.3 yd ahead of the carrier, coming downhill at -2.9 yd/s along the carrier's line. One who stops him
 *    is 2.9 yd away, moving +2.5 with him. With CATCH_STRIDE the same: -1.6 against +4.0.
 *  - His request until he sees the catch is flightApproach's "can't beat the ball" drive. That drive goes to the catch
 *    point (a fixed point) at full speed, braking by distance only. It ignores the receiver running at him and only
 *    hands over to this moving arrival in the last 0.6 s and near him.
 *
 * With the flag the moving arrival owns that drive from the throw. It anchors on a point moving with the receiver's
 * seen velocity through his catch window, shaded to his inside hip. It matches his lateral motion and closes at the
 * speed it can brake from (movingArrivalVelocity: through speed by tackling, as the gather). The existing support and
 * reachable-ball gates stay. */
export const BREAK_BALANCE=process.env.BREAK_BALANCE==='1';

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
 // BREAK_BALANCE: a defender who cannot beat the ball breaks on the receiver's moving window from the throw on, not
 // only in its last 0.6 s and near him: the same moving arrival, at any distance (see the note on BREAK_BALANCE).
 if(targetSpeed<=.5||(!BREAK_BALANCE&&(t-sim.t>.6||distance>contact+(a.speed+targetSpeed)*.6))
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
 if(!BREAK_BALANCE&&closest>contact+2.5)return original;
 // BREAK_BALANCE: to his inside hip (inside-out), the pursuit shade fading to nothing at contact as in chase.
 if(BREAK_BALANCE){const dg=Math.hypot(goal.x-a.pos.x,goal.y-a.pos.y);goal.y=clamp(goal.y+leverage(a,goal.y)*clamp((dg-contact)/6,0,1),.3,FIELD_WIDTH-.3);}
 const capacity=support?availability(support,supportParams(a.profile),fatigueFactor(a.body.energy)):1,
  vel=movingArrivalVelocity(a.body,goal,seen.vel,a.profile.vmax*a.speedScale,contact,
   2.5+2*(1-a.r('tackling')),1,capacity);
 return withMovementObjective({...original,vel},{kind:'moving',point:goal,velocity:seen.vel});
}
