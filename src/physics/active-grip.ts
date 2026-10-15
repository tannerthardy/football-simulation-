/** Experimental boundary for native reel/ground and a separate zero-tension
 * tangent cap/slip contract. No changed force or support law. */
import {boundedAttachment} from './bounded-attachment.js';
import {LEG_SLIDE} from './grip-sliding.js';
import type {PassiveGripParticle} from './passive-grip.js';
import type {Vec2} from '../core/vec.js';
import type {PassiveGripInput,PassiveGripResult} from './passive-grip.js';
export interface GripGround {force:Vec2;target:number;acceleration:number;rate:number;}
export interface ActiveGripInput extends PassiveGripInput {
  ground:[GripGround,GripGround];tickDuration:number;armCapacity:number;armWorkRemaining:number;
}
export interface ActiveGripResult extends PassiveGripResult {
  groundWork:number[];groundYawImpulse:number[];groundYawMoment:number[];groundYawWork:number[];
  reelWork:number;reelDose:number;armCost:number;externalAngularImpulse:number;
  /** Separate opt-in zero-tension tangent transition contract. */
  tangentSlip?:{time:number;legImpulse:Vec2};
}
export type ActiveGripSolver=(input:ActiveGripInput)=>ActiveGripResult|undefined;


/** Commit identities include issued ground impulse/moment and external torque. */
export function activeGripResultValid(q:ActiveGripInput,r:ActiveGripResult):boolean{
  const point=(p:PassiveGripParticle,z:Vec2)=>{const m=boundedAttachment(z,q.attachmentReach).offset,c=Math.cos(p.facing),s=Math.sin(p.facing);
    return {x:p.pos.x+c*m.x-s*m.y,y:p.pos.y+s*m.x+c*m.y};},
    initial=point(q.b,q.material),end=point(r.b,r.material),B=1/q.a.mass+1/q.b.mass,k=(2*Math.PI*6)**2/B,
    U=(p:Vec2,a:PassiveGripParticle)=>.5*k*Math.max(0,Math.hypot(p.x-a.pos.x,p.y-a.pos.y)-q.hold)**2,
    KE=(p:PassiveGripParticle)=>.5*p.mass*(p.vel.x*p.vel.x+p.vel.y*p.vel.y)+.5*p.inertia*p.spin*p.spin,
    L=(p:PassiveGripParticle)=>p.mass*(p.pos.x*p.vel.y-p.pos.y*p.vel.x)+p.inertia*p.spin,
    values=[...(['a','b'] as const).flatMap(p=>[r[p].mass,r[p].inertia,r[p].pos.x,r[p].pos.y,r[p].vel.x,r[p].vel.y,r[p].facing,r[p].spin]),
      r.material.x,r.material.y,r.footOffset.x,r.footOffset.y,r.point.x,r.point.y,r.impulse.x,r.impulse.y,r.moment.x,r.moment.y,
      ...r.angularImpulse,...r.angularMoment,...r.groundWork,...r.groundYawImpulse,...r.groundYawMoment,...r.groundYawWork,r.reelWork,r.reelDose,r.armCost,r.externalAngularImpulse,r.legs,r.hold,r.dose,r.bodyWork,r.motorWork,r.springEnergy,r.initialSpringEnergy,r.dampingLoss,
      r.workResidual,r.spanResidual,r.energyResidual,r.angularResidual,r.representationError,r.motorCompositionResidual,
      r.maximumTargetResidual,r.maximumCapacityRatio,r.elapsed];
  const slip=r.tangentSlip;
  if(slip&&(![slip.time,slip.legImpulse.x,slip.legImpulse.y].every(Number.isFinite)||slip.time<0||slip.time>q.duration+1e-15
    ||Math.abs(r.legs-(1-(1-q.legs)*Math.exp(-slip.time/LEG_SLIDE)))>1e-12
    ||r.slipping&&Math.abs(slip.time-q.duration)>1e-15||r.legs<q.legs-1e-15||r.legs>1
    ||Math.hypot(slip.legImpulse.x,slip.legImpulse.y)>r.dose+1e-12||q.desired.x!==0||q.desired.y!==0
    ||r.reelDose!==0||r.reelWork!==0||r.armCost!==0||r.initialSpringEnergy!==0||r.springEnergy!==0))return false;
  if(!values.every(Number.isFinite)||r.angularImpulse.length!==2||r.angularMoment.length!==2||r.groundWork.length!==2||r.groundYawImpulse.length!==2||r.groundYawMoment.length!==2||r.groundYawWork.length!==2
    ||r.armCost<0||r.armCost>q.armWorkRemaining+1e-12||r.armCost<Math.max(0,r.reelWork)-1e-12||r.reelDose<0||r.reelDose>q.armCapacity*q.duration+1e-12||!slip&&(r.slipping||r.legs!==q.legs)||r.hold!==q.hold
    ||r.a.mass!==q.a.mass||r.b.mass!==q.b.mass||r.a.inertia!==q.a.inertia||r.b.inertia!==q.b.inertia
    ||r.dose<0||r.dose>q.capacity*q.duration+1e-12||Math.hypot(r.impulse.x,r.impulse.y)>r.dose+1e-12
    ||(slip?r.maximumCapacityRatio>1+1e-14:r.maximumCapacityRatio>=.98)||r.maximumCapacityRatio<0||r.maximumTargetResidual>1e-11
    ||Math.abs(r.elapsed-q.duration)>1e-12||Math.hypot(r.footOffset.x,r.footOffset.y)>q.attachmentReach
    ||Math.hypot(end.x-r.point.x,end.y-r.point.y)>5e-10||Math.hypot(r.b.pos.x-r.a.pos.x,r.b.pos.y-r.a.pos.y)<=q.minimumDistance
    ||Math.hypot(end.x-r.a.pos.x,end.y-r.a.pos.y)>q.reach)
    return false;
  for(const p of ['a','b'] as const){const a=q[p],b=r[p],sign=p==='a'?-1:1,i=p==='a'?0:1,G=q.ground[i].force,H=q.duration;
    if(Math.hypot(b.vel.x-a.vel.x-(sign*r.impulse.x+G.x*H)/a.mass,b.vel.y-a.vel.y-(sign*r.impulse.y+G.y*H)/a.mass)>2.5e-8
      ||Math.hypot(b.pos.x-a.pos.x-a.vel.x*q.duration-(sign*r.moment.x+.5*G.x*H*H)/a.mass,b.pos.y-a.pos.y-a.vel.y*q.duration-(sign*r.moment.y+.5*G.y*H*H)/a.mass)>1e-10
      ||Math.abs(b.spin-a.spin-(r.angularImpulse[i]+r.groundYawImpulse[i])/a.inertia)>2.5e-7
      ||Math.abs(b.facing-a.facing-a.spin*q.duration-(r.angularMoment[i]+r.groundYawMoment[i])/a.inertia)>1e-10)return false;
  }
  const ground=r.groundWork.reduce((s,v,i)=>s+v+r.groundYawWork[i],0);
  return Math.abs(KE(r.a)+KE(r.b)-KE(q.a)-KE(q.b)-r.bodyWork-ground)<1e-8
    &&Math.abs(L(r.a)+L(r.b)-L(q.a)-L(q.b)-r.externalAngularImpulse)<1e-7
    &&Math.abs(U(initial,q.a)-r.initialSpringEnergy)<1e-9&&Math.abs(U(end,r.a)-r.springEnergy)<1e-9
    &&Math.abs(r.bodyWork-r.motorWork-r.reelWork+r.springEnergy-r.initialSpringEnergy+r.dampingLoss)<1e-8
    &&r.dampingLoss>=-1e-8&&Math.abs(r.workResidual)<1e-8&&Math.abs(r.spanResidual)<1e-9&&Math.abs(r.energyResidual)<1e-8
    &&Math.abs(r.angularResidual)<1e-7&&r.representationError<1e-10&&Math.abs(r.motorCompositionResidual)<1e-10;
}
