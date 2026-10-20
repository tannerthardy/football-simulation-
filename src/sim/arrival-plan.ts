/** Intent planning for a fixed point, separate from body capability.
 * A fast start needs a braking plan, not a shorter global gait time constant.
 * This is a radial, unloaded estimate; crossing motion and external loads can
 * prevent arrival. World always owns execution and the actual force budget.
 */
import type {Vec2} from '../core/vec.js';
import {fatigueFactor,followAccel,type Body} from '../physics/kinematics.js';
import {availability,supportParams} from '../physics/support.js';

export interface ArrivalPlan {
  velocity: Vec2;
  distance: number;
  brake: number;
  nextSpeedBound: number;
  /** Necessary radial condition for this held-command interval, not proof of
   * a clear2D path. Continuous braking can fit while a coarse held step cannot. */
  radialBrakeFeasible: boolean;
}

export function planArrival(body:Body,target:Readonly<Vec2>,maxSpeed:number,
  terminalSpeed:number,dt:number,captureRadius=.15,cutSkill=1,maxCommandInterval=dt):ArrivalPlan {
  if(!(dt>0&&Number.isFinite(dt)))throw new Error('Arrival planning needs a positive finite command interval');
  if(!(maxCommandInterval>=dt&&Number.isFinite(maxCommandInterval)))throw new Error('Command ceiling must cover the current interval');
  const dx=target.x-body.pos.x,dy=target.y-body.pos.y,d=Math.hypot(dx,dy);
  const distance=Math.max(0,d-captureRadius);
  if(d<1e-9)return {velocity:{x:0,y:0},distance,brake:0,nextSpeedBound:0,radialBrakeFeasible:Math.hypot(body.vel.x,body.vel.y)<1e-6};
  const ux=dx/d,uy=dy/d,v=body.vel.x*ux+body.vel.y*uy;
  const fat=fatigueFactor(body.energy),support=supportParams(body.profile);
  const capacity=body.support?availability(body.support,support,fat):1;
  const available=followAccel(body,{x:-ux*1e6,y:-uy*1e6},cutSkill,capacity);
  // Retain the existing arrival planner's .8 braking margin. Neither this
  // estimate nor the desired velocity can buy extra support or traction.
  const brake=Math.max(0,Math.min(body.profile.brake*.8*(.85+.15*fat)*capacity,
    -available.x*ux-available.y*uy,support.traction/body.profile.massKg*capacity));
  const terminal=Math.max(0,Math.min(maxSpeed,terminalSpeed));
  // World holds a command for the whole interval. A final stop from v<b*dt
  // therefore travels v*dt/2, rather than the smaller v²/(2b). Reserve
  // S(v)=v²/(2b)+v*H/2: a conservative held-stop distance for intervals<=H.
  // Budget THIS tick's midpoint travel plus S(vNext)-S(terminal). No new
  // response constant: H is the command scheduler's known interval ceiling.
  // Through-speed is an endpoint planning target, not a sub-tick crossing
  // guarantee. Crossing motion, new loads or a deteriorating support state
  // still require replanning and can make a previously feasible stop fail.
  const room=terminal*terminal+brake*terminal*maxCommandInterval+2*brake*distance-brake*dt*v;
  const h=brake*(dt+maxCommandInterval);
  const bound=room<=0?0:2*room/(Math.sqrt(h*h+4*room)+h);
  const speed=Math.max(0,Math.min(maxSpeed,bound));
  return {velocity:{x:ux*speed,y:uy*speed},distance,brake,nextSpeedBound:bound,
    radialBrakeFeasible:brake>0&&room>=-1e-12&&Math.max(0,v)**2+brake*Math.max(0,v)*maxCommandInterval<=terminal*terminal+brake*terminal*maxCommandInterval+2*brake*distance+1e-9};
}
