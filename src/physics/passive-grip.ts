/** Experimental callback boundary for one passive, below-slip lower grip.
 * World owns ground/support/fatigue. A solver owns only the declared contact
 * interval and returns no state on an unsupported phase; defaults install none.
 */
import type {Vec2} from '../core/vec.js';
import {boundedAttachment} from './bounded-attachment.js';
export interface PassiveGripParticle {mass:number;inertia:number;pos:Vec2;vel:Vec2;facing:number;spin:number;}
export interface PassiveGripInput {
  a:PassiveGripParticle;b:PassiveGripParticle;material:Vec2;footOffset:Vec2;
  mobility:number;desired:Vec2;capacity:number;duration:number;minimumDistance:number;
  reach:number;attachmentReach:number;hold:number;legs:number;recoveryCoupling?:number;pullSpeed:number;
}
export interface PassiveGripResult {
  a:PassiveGripParticle;b:PassiveGripParticle;material:Vec2;footOffset:Vec2;point:Vec2;
  legs:number;hold:number;slipping:boolean;impulse:Vec2;moment:Vec2;angularImpulse:number[];angularMoment:number[];
  dose:number;bodyWork:number;motorWork:number;springEnergy:number;initialSpringEnergy:number;dampingLoss:number;
  workResidual:number;spanResidual:number;energyResidual:number;angularResidual:number;representationError:number;
  motorCompositionResidual:number;maximumTargetResidual:number;maximumCapacityRatio:number;elapsed:number;
}
export type PassiveGripSolver=(input:PassiveGripInput)=>PassiveGripResult|undefined;
export interface PassiveGripReport {accepted:number;fallbacks:number;reasons:Record<string,number>;dose:number;bodyWork:number;motorWork:number;}

/** Independent interface identities before World commits any returned state.
 * These preserve the existing physical gates; numeric refinement remains the
 * solver's responsibility and is independently validated by its owner.
 */
export function passiveGripResultValid(q:PassiveGripInput,r:PassiveGripResult):boolean{
  const point=(p:PassiveGripParticle,z:Vec2)=>{const m=boundedAttachment(z,q.attachmentReach).offset,c=Math.cos(p.facing),s=Math.sin(p.facing);
    return {x:p.pos.x+c*m.x-s*m.y,y:p.pos.y+s*m.x+c*m.y};},
    initial=point(q.b,q.material),end=point(r.b,r.material),B=1/q.a.mass+1/q.b.mass,k=(2*Math.PI*6)**2/B,
    U=(p:Vec2,a:PassiveGripParticle)=>.5*k*Math.max(0,Math.hypot(p.x-a.pos.x,p.y-a.pos.y)-q.hold)**2,
    KE=(p:PassiveGripParticle)=>.5*p.mass*(p.vel.x*p.vel.x+p.vel.y*p.vel.y)+.5*p.inertia*p.spin*p.spin,
    L=(p:PassiveGripParticle)=>p.mass*(p.pos.x*p.vel.y-p.pos.y*p.vel.x)+p.inertia*p.spin,
    values=[...(['a','b'] as const).flatMap(p=>[r[p].mass,r[p].inertia,r[p].pos.x,r[p].pos.y,r[p].vel.x,r[p].vel.y,r[p].facing,r[p].spin]),
      r.material.x,r.material.y,r.footOffset.x,r.footOffset.y,r.point.x,r.point.y,r.impulse.x,r.impulse.y,r.moment.x,r.moment.y,
      ...r.angularImpulse,...r.angularMoment,r.legs,r.hold,r.dose,r.bodyWork,r.motorWork,r.springEnergy,r.initialSpringEnergy,r.dampingLoss,
      r.workResidual,r.spanResidual,r.energyResidual,r.angularResidual,r.representationError,r.motorCompositionResidual,
      r.maximumTargetResidual,r.maximumCapacityRatio,r.elapsed];
  if(!values.every(Number.isFinite)||r.angularImpulse.length!==2||r.angularMoment.length!==2||r.slipping||r.hold!==q.hold||r.legs!==q.legs
    ||r.a.mass!==q.a.mass||r.b.mass!==q.b.mass||r.a.inertia!==q.a.inertia||r.b.inertia!==q.b.inertia
    ||r.dose<0||r.dose>q.capacity*q.duration+1e-12||Math.hypot(r.impulse.x,r.impulse.y)>r.dose+1e-12
    ||r.maximumCapacityRatio>=.98||r.maximumCapacityRatio<0||r.maximumTargetResidual>1e-11
    ||Math.abs(r.elapsed-q.duration)>1e-12||Math.hypot(r.footOffset.x,r.footOffset.y)>q.attachmentReach
    ||Math.hypot(end.x-r.point.x,end.y-r.point.y)>5e-10||Math.hypot(r.b.pos.x-r.a.pos.x,r.b.pos.y-r.a.pos.y)<=q.minimumDistance
    ||Math.hypot(end.x-r.a.pos.x,end.y-r.a.pos.y)>q.reach||Math.hypot(end.x-r.a.pos.x,end.y-r.a.pos.y)<q.hold-1e-12)
    return false;
  for(const p of ['a','b'] as const){const a=q[p],b=r[p],sign=p==='a'?-1:1,i=p==='a'?0:1;
    if(Math.hypot(b.vel.x-a.vel.x-sign*r.impulse.x/a.mass,b.vel.y-a.vel.y-sign*r.impulse.y/a.mass)>2.5e-8
      ||Math.hypot(b.pos.x-a.pos.x-a.vel.x*q.duration-sign*r.moment.x/a.mass,b.pos.y-a.pos.y-a.vel.y*q.duration-sign*r.moment.y/a.mass)>1e-10
      ||Math.abs(b.spin-a.spin-r.angularImpulse[i]/a.inertia)>2.5e-7
      ||Math.abs(b.facing-a.facing-a.spin*q.duration-r.angularMoment[i]/a.inertia)>1e-10)return false;
  }
  return Math.abs(KE(r.a)+KE(r.b)-KE(q.a)-KE(q.b)-r.bodyWork)<1e-8
    &&Math.abs(L(r.a)+L(r.b)-L(q.a)-L(q.b))<1e-7
    &&Math.abs(U(initial,q.a)-r.initialSpringEnergy)<1e-9&&Math.abs(U(end,r.a)-r.springEnergy)<1e-9
    &&Math.abs(r.bodyWork-r.motorWork+r.springEnergy-r.initialSpringEnergy+r.dampingLoss)<1e-8
    &&r.dampingLoss>=-1e-8&&Math.abs(r.workResidual)<1e-8&&Math.abs(r.spanResidual)<1e-9&&Math.abs(r.energyResidual)<1e-8
    &&Math.abs(r.angularResidual)<1e-7&&r.representationError<1e-10&&Math.abs(r.motorCompositionResidual)<1e-10;
}
