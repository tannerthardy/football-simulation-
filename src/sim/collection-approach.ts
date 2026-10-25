/** Find a free first-level strike surface when a former owner occupies the
 * helper's half. This selects feet, not contact, release or force capacity. */
import {FIELD_WIDTH} from '../core/field.js';
import type {Vec2} from '../core/vec.js';
import type {Intent} from '../physics/world.js';
import type {Agent} from './agent.js';
import type {Perceived} from './perception.js';
import {goTo} from './behaviors/common.js';

export interface CollectionObstacle { seen: Perceived; radius: number }
export interface CollectionApproach { goal: Vec2 | null; flow: Vec2 }

function distanceToSegment(point: Vec2, start: Vec2, end: Vec2): number {
  const x=end.x-start.x,y=end.y-start.y;
  const u=Math.max(0,Math.min(1,((point.x-start.x)*x+(point.y-start.y)*y)/Math.max(1e-12,x*x+y*y)));
  return Math.hypot(point.x-start.x-u*x,point.y-start.y-u*y);
}

/** Pictures are already extrapolated to their delivery time. Only project
 * forward to the next ordinary read; never read another body's live state. */
export function readCollectionApproach(a: Agent, down: Perceived,
  partner: CollectionObstacle, others: CollectionObstacle[], contact: number,
  direction: number, placementError: number, horizon: number): CollectionApproach | null {
  const bearing=Math.atan2(down.pos.y-partner.seen.pos.y,down.pos.x-partner.seen.pos.x);
  const off=Math.abs(Math.atan2(Math.sin(bearing-partner.seen.facing),Math.cos(bearing-partner.seen.facing)));
  // This correction concerns a visibly lost surface, not a covered player
  // still squaring his first strike. Use the existing run-loss torso boundary.
  if(off/(Math.PI/2)<1.1)return null;
  const side=Math.sign(a.pos.y-partner.seen.pos.y)||1;
  const half={x:down.pos.x-direction*.35,y:down.pos.y+side*.55+placementError};
  // The half-man landmark lies beyond first strike. A teammate behind that
  // entry need not obstruct collection: don't demand travel through the whole
  // landmark when the ordinary controller can acquire hands beforehand.
  const ray={x:half.x-a.pos.x,y:half.y-a.pos.y},length2=ray.x*ray.x+ray.y*ray.y;
  const relative={x:down.pos.x-a.pos.x,y:down.pos.y-a.pos.y};
  const along=relative.x*ray.x+relative.y*ray.y;
  const discriminant=along*along-length2*(relative.x*relative.x+relative.y*relative.y-contact*contact);
  const entry=length2>1e-12&&discriminant>=0?Math.max(0,(along-Math.sqrt(discriminant))/length2):1;
  const strike=entry<1?{x:a.pos.x+entry*ray.x,y:a.pos.y+entry*ray.y}:half;
  const clear=(goal:Vec2,obstacle:CollectionObstacle)=>[0,horizon].every(dt=>{
    const point={x:obstacle.seen.pos.x+obstacle.seen.vel.x*dt,y:obstacle.seen.pos.y+obstacle.seen.vel.y*dt};
    const end={x:goal.x+down.vel.x*dt,y:goal.y+down.vel.y*dt};
    const initial=Math.hypot(point.x-a.pos.x,point.y-a.pos.y),radius=a.profile.radius+obstacle.radius;
    return distanceToSegment(point,a.pos,end)>=Math.min(initial,radius)-1e-9
      && (initial>=radius||Math.hypot(end.x-point.x,end.y-point.y)>initial);
  });
  if(clear(strike,partner))return null;
  // The first strike already permits this extension. Search only the near,
  // backfield half of that existing envelope, never an upfield shortcut.
  const dx=a.pos.x-down.pos.x,dy=a.pos.y-down.pos.y,n=Math.hypot(dx,dy)||1;
  const directions=[{x:dx/n,y:dy/n},{x:-direction,y:0},
    {x:-direction/Math.SQRT2,y:side/Math.SQRT2},
    {x:-direction/Math.SQRT2,y:-side/Math.SQRT2},{x:0,y:side},{x:0,y:-side}];
  const candidates=directions.filter(v=>v.x*direction<=0).map(v=>({
    x:down.pos.x+v.x*(contact-.1),y:down.pos.y+v.y*(contact-.1)+placementError
  })).filter(goal=>goal.y>=.5&&goal.y<=FIELD_WIDTH-.5
    && [partner,...others].every(peer=>clear(goal,peer)));
  candidates.sort((aGoal,bGoal)=>Math.hypot(aGoal.x-a.pos.x,aGoal.y-a.pos.y)-Math.hypot(bGoal.x-a.pos.x,bGoal.y-a.pos.y));
  return {goal:candidates[0]??null,flow:{...down.vel}};
}

export function collectionCommand(a:Agent,read:CollectionApproach,elapsed:number,down:Perceived):Intent {
  const facing=Math.atan2(down.pos.y-a.pos.y,down.pos.x-a.pos.x);
  // No admitted route means brake with ordinary feet; it does not stop the
  // body or clear the teammate. World and global spacing remain authoritative.
  if(!read.goal)return {vel:{x:0,y:0},facing};
  return goTo(a,{x:read.goal.x+read.flow.x*elapsed,y:read.goal.y+read.flow.y*elapsed},{speed:1,facing});
}
