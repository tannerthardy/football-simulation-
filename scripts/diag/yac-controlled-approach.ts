/** Diagnostic only: judge an imminent approach by attainable entry geometry,
 * rather than the smallest distance during a free fly-by. No target queries.
 */
import {clamp} from '../../src/core/vec.js';
import {fatigueFactor,followAccel,movingArrivalVelocity,type MoveCommand} from '../../src/physics/kinematics.js';
import {previewFreeMovement} from '../../src/physics/movement-preview.js';
import {availability,supportParams} from '../../src/physics/support.js';
import type {Agent} from '../../src/sim/agent.js';
import type {Perceived} from '../../src/sim/perception.js';
import type {Intent} from '../../src/physics/world.js';

export function controlledApproach(a:Agent,seen:Perceived,contact:number,original:MoveCommand,now:number):MoveCommand {
 const s=a.body.support,dx=seen.pos.x-a.pos.x,dy=seen.pos.y-a.pos.y,dist=Math.hypot(dx,dy),
  speed=a.speed,targetSpeed=Math.hypot(seen.vel.x,seen.vel.y);
 if(dist<=contact+.5||speed<2||targetSpeed<.5||dist>contact+(speed+targetSpeed)*.6
  ||a.isDown(now)||a.engagement||(s&&(s.state!=='up'||s.foot||s.strike
   ||Math.hypot(s.lean.x,s.lean.y)>1e-6||Math.hypot(s.load.x,s.load.y)>1e-6)))return original;
 const ux=dx/dist,uy=dy/dist,rvx=a.vel.x-seen.vel.x,rvy=a.vel.y-seen.vel.y;
 if(rvx*ux+rvy*uy<=0||Math.abs(-rvx*uy+rvy*ux)<1)return original;
 const tackle=a.r('tackling'),cutSkill=.85+.35*tackle,through=2.5+2*(1-tackle),
  capacity=s?availability(s,supportParams(a.profile),fatigueFactor(a.body.energy)):1,
  arrival:Intent={vel:movingArrivalVelocity(a.body,seen.pos,seen.vel,a.profile.vmax*a.speedScale,
   contact,through,cutSkill,capacity),cutSkill,posture:.4+.25*tackle},
  brake:Intent={vel:{...seen.vel},cutSkill,posture:arrival.posture};
 function forecast(command:MoveCommand){
  let previous={x:-dx,y:-dy},previousVel={...a.vel},closest=dist,entry:any=null;
  for(const p of previewFreeMovement(a.body,command,now,12)){
   if(p.support!=='up')return {closest:Infinity,score:Infinity};
   const relative={x:p.pos.x-seen.pos.x-seen.vel.x*p.t,y:p.pos.y-seen.pos.y-seen.vel.y*p.t},
    ex=relative.x-previous.x,ey=relative.y-previous.y,
    along=clamp(-(previous.x*ex+previous.y*ey)/Math.max(1e-12,ex*ex+ey*ey),0,1),
    rx=previous.x+ex*along,ry=previous.y+ey*along,d=Math.hypot(rx,ry);
   if(d<closest){closest=d;entry={r:{x:rx,y:ry},vel:{x:previousVel.x+(p.vel.x-previousVel.x)*along,
    y:previousVel.y+(p.vel.y-previousVel.y)*along}};}
   previous=relative;previousVel=p.vel;
  }
  if(!entry)return {closest,score:closest};
  const d=Math.max(1e-9,Math.hypot(entry.r.x,entry.r.y)),nx=-entry.r.y/d,ny=entry.r.x/d,
   across=(entry.vel.x-seen.vel.x)*nx+(entry.vel.y-seen.vel.y)*ny,
   accel=followAccel({...a.body,vel:entry.vel},{x:-Math.sign(across)*nx*1e3,y:-Math.sign(across)*ny*1e3},cutSkill,capacity),
   decel=Math.max(.1,-Math.sign(across)*(accel.x*nx+accel.y*ny)),
   excursion=Math.max(0,across*across-through*through)/(2*decel);
  return {closest,score:closest+excursion};
 }
 const ordinary=forecast(original);if(ordinary.closest>contact+2.5)return original;
 let choice=original,best=ordinary.score;
 for(const command of [arrival,brake]){const result=forecast(command);if(result.score+.1<best){choice=command;best=result.score;}}
 return choice;
}
