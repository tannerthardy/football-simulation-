/** One moving near-hip objective, measured only. Never returns a live override. */
import {FIELD_WIDTH} from '../../src/core/field.js';
import {clamp,type Vec2} from '../../src/core/vec.js';
import {fatigueFactor,movingArrivalVelocity,type MoveCommand} from '../../src/physics/kinematics.js';
import {previewFreeMovement} from '../../src/physics/movement-preview.js';
import {interceptPoint} from '../../src/physics/reach.js';
import {availability,supportParams} from '../../src/physics/support.js';
import type {Agent} from '../../src/sim/agent.js';
import {leverage} from '../../src/sim/behaviors/common.js';
import type {Perceived} from '../../src/sim/perception.js';
import {contactQuality} from '../../src/sim/tackle-window.js';

export function nearHipShadow(a:Agent,target:Agent,picture:Perceived,command:MoveCommand,now:number){
 const body=a.profile.radius+target.profile.radius,arms=body+a.profile.reach,contact=body+a.profile.reach*.65,
  distance=Math.hypot(picture.pos.x-a.pos.x,picture.pos.y-a.pos.y),
  force=a.runFit?.kind==='force'||(a.runFit?.kind==='edge'&&a.runFit.edge==='box'),
  offset=(force?Math.abs(leverage(a,picture.pos.y))*a.runFit!.side:leverage(a,picture.pos.y))*clamp((distance-contact)/6,0,1),
  hip={x:picture.pos.x,y:clamp(picture.pos.y+offset,.3,FIELD_WIDTH-.3)},
  path=(t:number):Vec2=>({x:hip.x+picture.vel.x*t,y:clamp(hip.y+picture.vel.y*t,.3,FIELD_WIDTH-.3)}),
  intercept=interceptPoint({pos:a.pos,vel:a.vel,profile:a.profile,speedScale:a.speedScale},path,{horizon:3,step:.1,radius:contact}),
  support=a.body.support,capacity=support?availability(support,supportParams(a.profile),fatigueFactor(a.body.energy)):1,
  cutSkill=command.cutSkill??1,through=2.5+2*(1-a.r('tackling')),
  // The intercept is a future point on this moving hip path. Steering uses
  // the current anchor and its observed motion, avoiding a second lead.
  candidate={...command,vel:movingArrivalVelocity(a.body,hip,picture.vel,a.profile.vmax*a.speedScale,
   contact,through,cutSkill,capacity)};
 function forecast(request:MoveCommand){
  const samples=previewFreeMovement(a.body,request,now,12);
  const initial={t:0,pos:{...a.pos},vel:{...a.vel},support:a.body.support?.state??'up'};
  const measured=[initial,...samples].map(p=>{
   const target=path(p.t),dx=target.x-p.pos.x,dy=target.y-p.pos.y,d=Math.hypot(dx,dy),
    vx=p.vel.x-picture.vel.x,vy=p.vel.y-picture.vel.y,runnerSpeed=Math.hypot(picture.vel.x,picture.vel.y);
   return {...p,target,distance:d,quality:contactQuality(d,body,arms),
    closing:(vx*dx+vy*dy)/Math.max(1e-9,d),transverse:Math.abs(vx*dy-vy*dx)/Math.max(1e-9,d),
    rearCos:-(picture.vel.x*dx+picture.vel.y*dy)/Math.max(1e-9,runnerSpeed*d),
    headingDifference:Math.atan2(Math.sin(Math.atan2(p.vel.y,p.vel.x)-Math.atan2(picture.vel.y,picture.vel.x)),
     Math.cos(Math.atan2(p.vel.y,p.vel.x)-Math.atan2(picture.vel.y,picture.vel.x)))};
  });
  const upright=measured.filter((p,i)=>measured.slice(0,i+1).every(s=>s.support==='up')),
   closest=upright.length?upright.reduce((b,p)=>p.distance<b.distance?p:b,upright[0]):null,
   firstReach=upright.find(p=>p.distance<=arms)??null;
  return {command:request,samples:measured,closest,firstStandingReach:firstReach,
   fallAt:measured.find(p=>p.support!=='up')?.t??null};
 }
 const original=forecast(command),alternative=forecast(candidate),repeat=forecast(command);
 // Scratch World storage must not create a result that depends on evaluation
 // order. This check concerns the shared preview machinery, not football wins.
 if(JSON.stringify(original.samples)!==JSON.stringify(repeat.samples))throw Error('Movement preview depends on candidate evaluation order');
 const values=alternative.samples.flatMap(p=>[p.pos.x,p.pos.y,p.vel.x,p.vel.y,p.distance,p.closing,p.transverse]);
 if(values.some(v=>!Number.isFinite(v))||Math.hypot(candidate.vel.x,candidate.vel.y)>a.profile.vmax*a.speedScale+1e-10)
  throw Error('Nonfinite/unbounded shadow request or forecast');
 return {target:target.idx,picture,body,arms,contact,offset,hip,intercept,original,alternative,
  previewOrderInvariant:true,
  assumptions:'Both requests held for 0.60 s in free production World; same current body/support, command metadata and observed constant receiver velocity. No future cut, catch success, tip, grip, obstacle or helper knowledge. Intercept estimate uses existing 3-s/.1-s machinery. No scores select a live command.'};
}
