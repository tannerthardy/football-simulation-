/** Existing native reel + held-foot spring/tangent + issued ground interval.
 * Native feet owns force/traction/recovery allocation. This field integrates
 * its delivered force and bounded yaw servo together with the moving grip.
 * Default scope refuses cap/slip. The separate phase option supports only
 * zero-tension tangent cap/slip; recovery, impact and topology still refuse. */
import type {ActiveGripInput} from '../../../src/physics/active-grip.js';
import {ARM_SPEED,YAW_RESPONSE} from '../../../src/physics/actuation.js';
import {LEG_SLIDE} from '../../../src/physics/grip-sliding.js';
import {pressureGeometry} from './grip-pressure-rate.js';
import {SPAN,mixedSpanDifference,type SpanForceProvider} from './grip-mixed-span-model.js';
export const NATIVE={GAW:37,GBW:38,GAJ:39,GBJ:40,GAQ:41,GBQ:42,GAYW:43,GBYW:44,REELW:45,REELDOSE:46,EXTERNAL:47,ARM:48} as const;
export type ReelProvider=(q:ActiveGripInput,g:ReturnType<typeof pressureGeometry>)=>number;
export function nativeReel(q:ActiveGripInput,g:ReturnType<typeof pressureGeometry>){
  if(q.pullSpeed===0)return 0;
  const nb=g.rbx*g.ny-g.rby*g.nx,B=1/q.a.mass+1/q.b.mass+nb*nb/q.b.inertia;
  return Math.min(q.armCapacity,q.capacity,Math.max(0,g.vn+Math.min(ARM_SPEED,q.pullSpeed))/(B*q.tickDuration+g.nn));
}
/** Optional diagnostic scope: zero-tension, zero-reel tangent cap/slip only.
 * The phase is held fixed by the event integrator, not inferred at RK stages. */
export interface NativeSlipPhase {slipping:boolean;}
/** Separate diagnostic option: native feet has already allocated this command.
 * Its unloaded velocity and passive viscous response use one common motor. */
export interface NativeCorrection {capacity:number;}
export function nativeSpanModel(input:ActiveGripInput,provider:SpanForceProvider,reelProvider:ReelProvider=nativeReel,maximumEvaluations=4096,phase?:NativeSlipPhase,correction?:NativeCorrection){
  const {a,b,duration:H,capacity:C,mobility:mu}=input,B=1/a.mass+1/b.mass,w=2*Math.PI*6,k=w*w/B,damping=2*.8*w/B,
    initial=[a.pos.x,a.pos.y,a.vel.x,a.vel.y,a.spin,a.facing,b.pos.x,b.pos.y,b.vel.x,b.vel.y,b.spin,b.facing,
      input.material.x,input.material.y,input.footOffset.x,input.footOffset.y,...Array(11).fill(0),input.legs,...Array(21).fill(0)];
  if(phase)initial.push(0,0,0); // sliding time and impulse weighted by grip height/share
  if(correction)initial.push(0,0,0); // unloaded/viscous motor work and positive delivered motor work
  if(phase&&correction)throw new RangeError('Native correction/slip combination');
  if(initial.length!==(phase||correction?52:49)||![...initial,H,C,mu,a.mass,b.mass,a.inertia,b.inertia,input.attachmentReach,input.minimumDistance,input.hold,input.reach,
    input.tickDuration,input.armCapacity,input.armWorkRemaining,input.pullSpeed,input.recoveryCoupling??input.legs,
    ...input.ground.flatMap(g=>[g.force.x,g.force.y,g.target,g.acceleration,g.rate])].every(Number.isFinite)
    ||H<=0||H>.05/12||C<=0||mu<=0||a.mass<=0||b.mass<=0||a.inertia<=0||b.inertia<=0||input.attachmentReach<=0
    ||input.minimumDistance<0||input.hold<0||input.hold>input.reach||input.legs<=0||input.legs>1
    ||input.tickDuration<=0||input.armCapacity<0||input.armWorkRemaining<0||input.pullSpeed<0
    ||input.recoveryCoupling!==undefined&&(input.recoveryCoupling<=0||input.recoveryCoupling>1)
    ||input.ground.some(g=>g.acceleration<0||g.rate<0))throw new RangeError('Native span input scope');
  if(correction){
    if(![correction.capacity,input.desired.x,input.desired.y].every(Number.isFinite)||correction.capacity<0
      ||Math.hypot(input.desired.x,input.desired.y)>mu*correction.capacity+1e-12)throw new RangeError('Native correction command capacity');
  }else if(input.desired.x!==0||input.desired.y!==0)throw new RangeError('Native span active recovery');
  let evaluations=0,maximumTargetResidual=0,maximumCapacityRatio=0,minimumLoss=Infinity;
  function frame(y:number[]){
    if(++evaluations>maximumEvaluations)throw new RangeError('Native span evaluation budget');
    const body=pressureGeometry(input,y),cmdx=correction?body.xx*input.desired.x+body.xy*input.desired.y:0,
      cmdy=correction?body.xy*input.desired.x+body.yy*input.desired.y:0,
      cmdn=body.nx*cmdx+body.ny*cmdy,cmdt=-body.ny*cmdx+body.nx*cmdy,
      g=correction?{...body,vn:body.vn+cmdn,vt:body.vt+cmdt}:body,e=Math.max(0,g.d-input.hold),R=reelProvider(input,g),
      p=provider({vn:g.vn-g.nn*R,vt:g.vt-g.nt*R,nn:g.nn,nt:g.nt,tt:g.tt,inverseMass:B,extension:e,capacity:C}),
      normal=p.normal-R,tangent=p.tangent,x=g.nx*normal-g.ny*tangent,z=g.ny*normal+g.nx*tangent,
      footx=g.xx*x+g.xy*z,footy=g.xy*x+g.yy*z,ux=mu*footx+(correction?input.desired.x:0),uy=mu*footy+(correction?input.desired.y:0),
      nv=g.vn+g.nn*normal+g.nt*tangent,tv=g.vt+g.nt*normal+g.tt*tangent,
      target=p.normal+damping*nv+k*e,total=Math.hypot(normal,tangent),loss=-(p.normal+k*e)*nv-tangent*tv,
      residual=Math.max(p.normal<0?Math.abs(target)/Math.max(1,Math.abs(p.normal),k*e):Math.max(0,target)/Math.max(1,k*e),
        phase&&Math.abs(tangent)>=C*(1-1e-14)?Math.max(0,tangent*tv)/Math.max(1,C*Math.abs(g.vt)):Math.abs(tv)/Math.max(1,Math.abs(g.vt)));
    // Preserve the old reference's diagnostics; the new transition rejects
    // exploratory out-of-scope stages before including their force in bounds.
    if(!phase){maximumTargetResidual=Math.max(maximumTargetResidual,residual);maximumCapacityRatio=Math.max(maximumCapacityRatio,total/C);minimumLoss=Math.min(minimumLoss,loss);}
    if(g.d>input.reach||Math.hypot(y[6]-y[0],y[7]-y[1])<=input.minimumDistance||Math.hypot(y[14],y[15])>input.attachmentReach)
      throw new RangeError(correction?'Native correction geometry event':'Native span geometry event');
    if((phase?total>C*(1+1e-14)||R!==0||p.normal!==0||e>1e-14:total>=.98*C)||R<0||R>input.armCapacity||p.normal>1e-12||residual>1e-11||loss<-1e-8||!Number.isFinite(loss))
      throw new RangeError('Native span cap/target/power scope');
    if(phase){maximumTargetResidual=Math.max(maximumTargetResidual,residual);maximumCapacityRatio=Math.max(maximumCapacityRatio,total/C);minimumLoss=Math.min(minimumLoss,loss);}
    return {...g,normal,tangent,x,z,footx,footy,ux,uy,nv,tv,total,loss,e,R,cmdn,cmdt};
  }
  function yaw(y:number[],i:number){
    const g=input.ground[i],o=i?6:0,spin=y[o+4],error=g.target-y[o+5],desired=(error-2*YAW_RESPONSE*spin)/(YAW_RESPONSE*YAW_RESPONSE);
    if(Math.abs(error)>Math.PI+1e-12)throw new RangeError('Native span yaw wrap event');
    if(Math.abs(spin)>g.rate+32*Number.EPSILON*Math.max(1,g.rate,Math.abs(spin)))return -Math.sign(spin)*g.acceleration;
    if(Math.abs(spin)>=g.rate&&spin*desired>0||g.rate===0)return 0;
    return Math.max(-g.acceleration,Math.min(g.acceleration,desired));
  }
  function derivative(y:number[]){
    const f=frame(y),ta=-f.rax*f.z+f.ray*f.x,tb=f.rbx*f.z-f.rby*f.x,t=y[SPAN.TIME],
      ga=input.ground[0],gb=input.ground[1],ya=yaw(y,0)*a.inertia,yb=yaw(y,1)*b.inertia,arm=-f.R*f.nv;
    const dy=[y[2],y[3],(ga.force.x-f.x)/a.mass,(ga.force.y-f.z)/a.mass,(ta+ya)/a.inertia,y[4],
      y[8],y[9],(gb.force.x+f.x)/b.mass,(gb.force.y+f.z)/b.mass,(tb+yb)/b.inertia,y[10],
      f.share*(f.c*f.ux+f.s*f.uy),f.share*(-f.s*f.ux+f.c*f.uy),f.ux,f.uy,
      f.x,f.z,(H-t)*f.x,(H-t)*f.z,ta,tb,(H-t)*ta,(H-t)*tb,
      f.x*f.gx+f.z*f.gy,-f.footx*f.ux-f.footy*f.uy,f.total,phase?.slipping?(1-y[27])/LEG_SLIDE:0,f.normal,f.tangent,
      f.loss,k*f.e*f.nv,1,Math.abs(f.normal),Math.abs(f.tangent),-2*f.nt*f.normal*f.tangent,
      -f.nn*f.normal*f.normal-f.tt*f.tangent*f.tangent-(correction?f.normal*f.cmdn+f.tangent*f.cmdt:0),
      ga.force.x*y[2]+ga.force.y*y[3],gb.force.x*y[8]+gb.force.y*y[9],ya,yb,(H-t)*ya,(H-t)*yb,ya*y[4],yb*y[10],
      arm,f.R,y[0]*ga.force.y-y[1]*ga.force.x+ya+y[6]*gb.force.y-y[7]*gb.force.x+yb,Math.max(0,arm)];
    if(phase)dy.push(phase.slipping?1:0,y[27]*f.x,y[27]*f.z);
    if(correction)dy.push(-f.footx*input.desired.x-f.footy*input.desired.y,-mu*(f.footx*f.footx+f.footy*f.footy),Math.max(0,-f.footx*f.ux-f.footy*f.uy));return dy;
  }
  function result(y:number[]){
    const first=pressureGeometry(input,initial),f=frame(y),initialEnergy=.5*k*Math.max(0,first.d-input.hold)**2,energy=.5*k*f.e*f.e,
      particle=(p:typeof a,i:number)=>({...p,pos:{x:y[i],y:y[i+1]},vel:{x:y[i+2],y:y[i+3]},spin:y[i+4],facing:y[i+5]}),aa=particle(a,0),bb=particle(b,6),
      KE=(p:typeof a)=>.5*p.mass*(p.vel.x*p.vel.x+p.vel.y*p.vel.y)+.5*p.inertia*p.spin*p.spin,
      angular=(p:typeof a)=>p.mass*(p.pos.x*p.vel.y-p.pos.y*p.vel.x)+p.inertia*p.spin,
      bodyWork=y[SPAN.BW],motorWork=y[SPAN.MW],dampingLoss=y[SPAN.LOSS],springWork=y[SPAN.UW],
      groundWork=[y[NATIVE.GAW],y[NATIVE.GBW]],groundYawImpulse=[y[NATIVE.GAJ],y[NATIVE.GBJ]],groundYawMoment=[y[NATIVE.GAQ],y[NATIVE.GBQ]],
      groundYawWork=[y[NATIVE.GAYW],y[NATIVE.GBYW]],ground=groundWork.reduce((s,v,i)=>s+v+groundYawWork[i],0),
      representationError=Math.max(...[0,1].flatMap(i=>{const p=i?b:a,o=i?6:0,sign=i?1:-1,ia=i?21:20,qa=i?23:22,G=input.ground[i].force;
        return [Math.abs(y[o]-p.pos.x-p.vel.x*H-(sign*y[18]+.5*G.x*H*H)/p.mass),Math.abs(y[o+1]-p.pos.y-p.vel.y*H-(sign*y[19]+.5*G.y*H*H)/p.mass),
          Math.abs(y[o+2]-p.vel.x-(sign*y[16]+G.x*H)/p.mass),Math.abs(y[o+3]-p.vel.y-(sign*y[17]+G.y*H)/p.mass),
          Math.abs(y[o+4]-p.spin-(y[ia]+groundYawImpulse[i])/p.inertia),Math.abs(y[o+5]-p.facing-p.spin*H-(y[qa]+groundYawMoment[i])/p.inertia)];}));
    return {a:aa,b:bb,material:{x:y[12],y:y[13]},footOffset:{x:y[14],y:y[15]},point:{x:y[6]+f.rbx,y:y[7]+f.rby},legs:y[27],hold:input.hold,slipping:phase?.slipping??false,
      ...(phase?{slideTime:y[49]}:{}),
      ...(correction?{correctionWork:y[49],viscousWork:y[50],positiveMotorWork:y[51],motorWorkBudget:(input.desired.x**2+input.desired.y**2)/(4*mu)*H}:{}),
      impulse:{x:y[16],y:y[17]},moment:{x:y[18],y:y[19]},angularImpulse:[y[20],y[21]],angularMoment:[y[22],y[23]],
      normalImpulse:y[28],tangentImpulse:y[29],normalDose:y[33],tangentDose:y[34],dose:y[26],bodyWork,motorWork,passiveWork:bodyWork-motorWork-y[NATIVE.REELW],
      springWork,initialSpringEnergy:initialEnergy,springEnergy:energy,dampingLoss,motorCrossWork:y[SPAN.CROSS],separateMotorWork:y[SPAN.SEPARATE],
      motorCompositionResidual:motorWork-y[SPAN.CROSS]-y[SPAN.SEPARATE],groundWork,groundYawImpulse,groundYawMoment,groundYawWork,
      reelWork:y[NATIVE.REELW],reelDose:y[NATIVE.REELDOSE],armCost:y[NATIVE.ARM],externalAngularImpulse:y[NATIVE.EXTERNAL],
      workResidual:KE(aa)+KE(bb)-KE(a)-KE(b)-bodyWork-ground,spanResidual:energy-initialEnergy-springWork,
      energyResidual:KE(aa)+KE(bb)-KE(a)-KE(b)+energy-initialEnergy-motorWork-y[NATIVE.REELW]-ground+dampingLoss,
      angularResidual:angular(aa)+angular(bb)-angular(a)-angular(b)-y[NATIVE.EXTERNAL],representationError,
      maximumTargetResidual,maximumCapacityRatio,minimumLoss,evaluations,finalForce:{normal:f.normal,tangent:f.tangent},elapsed:y[SPAN.TIME]};
  }
  frame(initial);return {initial,frame,derivative,result};
}
export type NativeSpanMotion=ReturnType<ReturnType<typeof nativeSpanModel>['result']>;
/** Retain every passive coordinate tolerance and apply the existing ledger
 * tolerance to added native channels; no dimension averaging. */
export function nativeSpanDifference(a:NativeSpanMotion,b:NativeSpanMotion){
  return Math.max(mixedSpanDifference(a,b),...(['groundWork','groundYawImpulse','groundYawMoment','groundYawWork'] as const)
    .flatMap(k=>a[k].map((v,i)=>Math.abs(v-b[k][i])/1e-9)),
    ...(['reelWork','reelDose','armCost','externalAngularImpulse'] as const).map(k=>Math.abs(a[k]-b[k])/1e-9));
}
