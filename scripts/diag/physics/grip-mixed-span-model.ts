/** One passive lower grip's moving reduced coordinates. The two providers
 * and timesteppers are independent; this geometry/physical ODE is shared.
 * No World insertion, active motor/reel, saturation, slip or rest-span event.
 */
import type {BoundedGripInput} from './grip-force-bounded.js';
import {pressureGeometry} from './grip-pressure-rate.js';
import type {SpanForceInput} from './grip-mixed-span-force.js';
export type SpanForceProvider=(q:SpanForceInput)=>{normal:number;tangent:number};
export const SPAN={BW:24,MW:25,DOSE:26,LEGS:27,NJ:28,TJ:29,LOSS:30,UW:31,TIME:32,ND:33,TD:34,CROSS:35,SEPARATE:36} as const;
export function mixedSpanModel(input:BoundedGripInput,provider:SpanForceProvider,maximumEvaluations=16384){
  const {a,b,duration:H,capacity:C,mobility:mu}=input,B=1/a.mass+1/b.mass,w=2*Math.PI*6,k=w*w/B,damping=2*.8*w/B,
    initial=[a.pos.x,a.pos.y,a.vel.x,a.vel.y,a.spin,a.facing,b.pos.x,b.pos.y,b.vel.x,b.vel.y,b.spin,b.facing,
      input.material.x,input.material.y,input.footOffset.x,input.footOffset.y,...Array(11).fill(0),input.legs,...Array(9).fill(0)];
  if(![...initial,H,C,mu,a.mass,b.mass,a.inertia,b.inertia,input.attachmentReach,input.minimumDistance,input.hold,input.reach,
    input.desired.x,input.desired.y,input.pullSpeed,input.recoveryCoupling??input.legs].every(Number.isFinite)
    ||!(H>0&&H<=.05/12)||C<=0||mu<=0||a.mass<=0||b.mass<=0||a.inertia<=0||b.inertia<=0||input.attachmentReach<=0
    ||input.minimumDistance<0||input.hold<0||input.hold>input.reach||input.legs<=0||input.legs>1
    ||input.recoveryCoupling!==undefined&&(input.recoveryCoupling<=0||input.recoveryCoupling>1))
    throw new RangeError('Mixed span input scope');
  if(input.desired.x!==0||input.desired.y!==0||input.pullSpeed!==0)throw new RangeError('Mixed span active motor/reel');
  let evaluations=0,maximumTargetResidual=0,maximumCapacityRatio=0,minimumLoss=Infinity;
  function frame(y:number[]){
    if(++evaluations>maximumEvaluations)throw new RangeError('Mixed span evaluation budget');
    const g=pressureGeometry(input,y),e=Math.max(0,g.d-input.hold),
      q={vn:g.vn,vt:g.vt,nn:g.nn,nt:g.nt,tt:g.tt,inverseMass:B,extension:e,capacity:C},f=provider(q),
      x=g.nx*f.normal-g.ny*f.tangent,z=g.ny*f.normal+g.nx*f.tangent,
      footx=g.xx*x+g.xy*z,footy=g.xy*x+g.yy*z,ux=mu*footx,uy=mu*footy,
      normalVelocity=g.vn+g.nn*f.normal+g.nt*f.tangent,tangentVelocity=g.vt+g.nt*f.normal+g.tt*f.tangent,
      total=Math.hypot(f.normal,f.tangent),target=f.normal+damping*normalVelocity+k*e,
      residual=Math.max(f.normal<0?Math.abs(target)/Math.max(1,Math.abs(f.normal),k*e):Math.max(0,target)/Math.max(1,k*e),
        Math.abs(tangentVelocity)/Math.max(1,Math.abs(g.vt))),loss=-(f.normal+k*e)*normalVelocity-f.tangent*tangentVelocity;
    maximumTargetResidual=Math.max(maximumTargetResidual,residual);maximumCapacityRatio=Math.max(maximumCapacityRatio,total/C);minimumLoss=Math.min(minimumLoss,loss);
    if(g.d>input.reach||g.d<input.hold-1e-12||Math.hypot(y[6]-y[0],y[7]-y[1])<=input.minimumDistance
      ||Math.hypot(y[14],y[15])>input.attachmentReach)throw new RangeError('Mixed span geometry/rest event');
    if(total>=.98*C||f.normal>1e-12||residual>1e-11||loss<-1e-8||!Number.isFinite(loss))throw new RangeError('Mixed span cap/target/power scope');
    return {...g,...f,x,z,footx,footy,ux,uy,normalVelocity,tangentVelocity,total,loss,e};
  }
  function derivative(y:number[]){
    const f=frame(y),ta=-f.rax*f.z+f.ray*f.x,tb=f.rbx*f.z-f.rby*f.x,t=y[SPAN.TIME];
    return [y[2],y[3],-f.x/a.mass,-f.z/a.mass,ta/a.inertia,y[4],
      y[8],y[9],f.x/b.mass,f.z/b.mass,tb/b.inertia,y[10],
      f.share*(f.c*f.ux+f.s*f.uy),f.share*(-f.s*f.ux+f.c*f.uy),f.ux,f.uy,
      f.x,f.z,(H-t)*f.x,(H-t)*f.z,ta,tb,(H-t)*ta,(H-t)*tb,
      f.x*f.gx+f.z*f.gy,-f.footx*f.ux-f.footy*f.uy,f.total,0,f.normal,f.tangent,
      f.loss,k*f.e*f.normalVelocity,1,Math.abs(f.normal),Math.abs(f.tangent),-2*f.nt*f.normal*f.tangent,
      -f.nn*f.normal*f.normal-f.tt*f.tangent*f.tangent];
  }
  function result(y:number[]){
    const first=pressureGeometry(input,initial),f=frame(y),initialEnergy=.5*k*Math.max(0,first.d-input.hold)**2,energy=.5*k*f.e*f.e,
      particle=(p:typeof a,i:number)=>({...p,pos:{x:y[i],y:y[i+1]},vel:{x:y[i+2],y:y[i+3]},spin:y[i+4],facing:y[i+5]}),
      aa=particle(a,0),bb=particle(b,6),KE=(p:typeof a)=>.5*p.mass*(p.vel.x*p.vel.x+p.vel.y*p.vel.y)+.5*p.inertia*p.spin*p.spin,
      angular=(p:typeof a)=>p.mass*(p.pos.x*p.vel.y-p.pos.y*p.vel.x)+p.inertia*p.spin,
      bodyWork=y[SPAN.BW],motorWork=y[SPAN.MW],dampingLoss=y[SPAN.LOSS],springWork=y[SPAN.UW],
      representationError=Math.max(...[0,1].flatMap(i=>{
        const p=i?b:a,o=i?6:0,sign=i?1:-1,ia=i?21:20,qa=i?23:22;
        return [Math.abs(y[o]-p.pos.x-p.vel.x*H-sign*y[18]/p.mass),Math.abs(y[o+1]-p.pos.y-p.vel.y*H-sign*y[19]/p.mass),
          Math.abs(y[o+2]-p.vel.x-sign*y[16]/p.mass),Math.abs(y[o+3]-p.vel.y-sign*y[17]/p.mass),
          Math.abs(y[o+4]-p.spin-y[ia]/p.inertia),Math.abs(y[o+5]-p.facing-p.spin*H-y[qa]/p.inertia)];}));
    return {a:aa,b:bb,material:{x:y[12],y:y[13]},footOffset:{x:y[14],y:y[15]},point:{x:y[6]+f.rbx,y:y[7]+f.rby},
      legs:y[27],hold:input.hold,slipping:false,impulse:{x:y[16],y:y[17]},moment:{x:y[18],y:y[19]},angularImpulse:[y[20],y[21]],
      angularMoment:[y[22],y[23]],normalImpulse:y[28],tangentImpulse:y[29],normalDose:y[33],tangentDose:y[34],dose:y[26],
      bodyWork,motorWork,passiveWork:bodyWork-motorWork,springWork,initialSpringEnergy:initialEnergy,springEnergy:energy,dampingLoss,
      motorCrossWork:y[SPAN.CROSS],separateMotorWork:y[SPAN.SEPARATE],motorCompositionResidual:motorWork-y[SPAN.CROSS]-y[SPAN.SEPARATE],
      workResidual:KE(aa)+KE(bb)-KE(a)-KE(b)-bodyWork,spanResidual:energy-initialEnergy-springWork,
      energyResidual:KE(aa)+KE(bb)-KE(a)-KE(b)+energy-initialEnergy-motorWork+dampingLoss,
      angularResidual:angular(aa)+angular(bb)-angular(a)-angular(b),representationError,maximumTargetResidual,maximumCapacityRatio,minimumLoss,evaluations,
      finalForce:{normal:f.normal,tangent:f.tangent},elapsed:y[SPAN.TIME]};
  }
  frame(initial);return {initial,frame,derivative,result};
}
export type MixedSpanMotion=ReturnType<ReturnType<typeof mixedSpanModel>['result']>;
export function mixedSpanDifference(a:MixedSpanMotion,b:MixedSpanMotion){
  const norm=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
  return Math.max(...(['a','b'] as const).flatMap(p=>[norm(a[p].pos,b[p].pos)/5e-10,norm(a[p].vel,b[p].vel)/2.5e-8,
    Math.abs(a[p].spin-b[p].spin)/2.5e-7,Math.abs(a[p].facing-b[p].facing)/2.5e-9]),
    ...(['material','footOffset','point','impulse','moment'] as const).map(p=>norm(a[p],b[p])/5e-10),
    ...(['bodyWork','motorWork','motorCrossWork','separateMotorWork','passiveWork','springWork','springEnergy','dampingLoss','dose','normalImpulse','tangentImpulse','normalDose','tangentDose'] as const)
      .map(p=>Math.abs(a[p]-b[p])/1e-9),...a.angularImpulse.map((v,k)=>Math.abs(v-b.angularImpulse[k])/1e-9),
    ...a.angularMoment.map((v,k)=>Math.abs(v-b.angularMoment[k])/1e-9));
}
