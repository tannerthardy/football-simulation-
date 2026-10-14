/** Diagnostic passive normal/tangent interval at a bounded lower attachment.
 * The existing tangent operator remains the opposing control. This event candidate
 * follows one fixed slipping phase and monotone opening with a zero-extension
 * hold ratchet. No active reel, multiple contacts or World insertion. */
import {pressureGeometry,pressureRate} from './grip-pressure-rate.js';
import {angleGripStep} from './grip-angle-stages.js';
import {LEG_SLIDE} from '../../../src/physics/grip-sliding.js';
import {boundedGripInterval,type BoundedGripInput} from './grip-force-bounded.js';
import type {Particle} from './grip-force-interval.js';

import {mixedSupportForce,mixedGripInterval} from './grip-force-mixed.js';
const AX=0,AY=1,AVX=2,AVY=3,AS=4,AA=5,BX=6,BY=7,BVX=8,BVY=9,BS=10,BA=11,
  ZX=12,ZY=13,FX=14,FY=15,JX=16,JY=17,QX=18,QY=19,JA=20,JB=21,QA=22,QB=23,
  BW=24,MW=25,DOSE=26,LEGS=27,NJ=28,TJ=29;
type State=number[];
export function saturationGripInterval(input:BoundedGripInput) {
  // Reuse the already checked no-attained-normal/reel operator when its
  // complete interval succeeds. Its own scope gates guard that delegation.
  try {return {...boundedGripInterval(input,'capped'),normalImpulse:0,tangentImpulse:undefined,
    method:'existing-tangent' as const};}catch(e){if(!(e instanceof RangeError))throw e;}
  const {a,b,duration:H,capacity:C,mobility:mu}=input,K=1/a.mass+1/b.mass,
    numeric=[H,C,mu,input.legs,input.pullSpeed,input.hold,input.reach,input.minimumDistance,input.attachmentReach,
      input.desired.x,input.desired.y,input.material.x,input.material.y,input.footOffset.x,input.footOffset.y,
      ...[a,b].flatMap(p=>[p.mass,p.inertia,p.pos.x,p.pos.y,p.vel.x,p.vel.y,p.facing,p.spin]),
      input.recoveryCoupling??input.legs];
  if(!numeric.every(Number.isFinite)||[H,mu,a.mass,b.mass,a.inertia,b.inertia,input.attachmentReach].some(v=>v<=0)
    ||C<0||input.legs<=0||input.legs>1||input.minimumDistance<0||input.hold<0||input.hold>input.reach
    ||input.reach<=input.minimumDistance||input.recoveryCoupling!==undefined&&(input.recoveryCoupling<=0||input.recoveryCoupling>1))
    throw new RangeError('Invalid mixed-grip input');
  if(input.desired.x!==0||input.desired.y!==0||input.pullSpeed!==0)
    throw new RangeError('Active motor/reel outside mixed-grip scope');
  if(H*Math.abs(a.spin)+C*H*H*input.reach/(2*a.inertia)>.1
    ||H*Math.abs(b.spin)+C*H*H*input.attachmentReach/(2*b.inertia)>.1)
    throw new RangeError('Angular travel outside mixed-grip scope');
  const initial=[a.pos.x,a.pos.y,a.vel.x,a.vel.y,a.spin,a.facing,b.pos.x,b.pos.y,b.vel.x,b.vel.y,b.spin,b.facing,
    input.material.x,input.material.y,input.footOffset.x,input.footOffset.y,0,0,0,0,0,0,0,0,0,0,0,input.legs,0,0];
  let evaluations=0,maximumCapacityExcess=0,eventTime:number|undefined,eventResidual=0,rootIterations=0;
  const stageStatistics={steps:0,iterations:0};
  function geometry(y:State) {
    const g=pressureGeometry(input,y);
    if(g.d>input.reach||Math.hypot(y[BX]-y[AX],y[BY]-y[AY])<=input.minimumDistance
      ||Math.hypot(y[FX],y[FY])>input.attachmentReach)
      throw new RangeError('Geometry/chart event outside mixed-grip scope');
    return g;
  }
  function frame(y:State) {
    const g=geometry(y),{c,s,rbx,rby,rax,ray,d,nx,ny,share,xx,xy,yy,nn,nt,tt,gx,gy,vn,vt}=g,
      f=mixedSupportForce(vn,vt,nn,nt,tt,K,C),x=f.normal*nx-f.tangent*ny,z=f.normal*ny+f.tangent*nx,
      total=Math.hypot(f.normal,f.tangent),slipping=C>0&&total>=.98*C,
      hold=slipping?Math.max(input.hold,d):Math.min(input.hold,Math.max(d,input.minimumDistance)),
      footx=xx*x+xy*z,footy=xy*x+yy*z,ux=mu*footx,uy=mu*footy,
      radial=vn+nn*f.normal+nt*f.tangent,passive=x*gx+z*gy+footx*ux+footy*uy;
    maximumCapacityExcess=Math.max(maximumCapacityExcess,total-C);
    if(C>0&&!slipping||radial< -1e-12||C>0&&d<input.hold-1e-8)
      throw new RangeError('Slip/hold transition outside mixed-grip scope');
    if(passive>1e-8)throw new RangeError('Passive work limiter outside mixed-grip scope');
    return {...g,...f,x,z,footx,footy,ux,uy,total,slipping,hold,radial};
  }
  const acquired=frame(initial);
  function physical(t:number,y:State) {
    evaluations++;const f=frame(y),ta=-f.rax*f.z+f.ray*f.x,tb=f.rbx*f.z-f.rby*f.x;
    return {frame:f,values:[y[AVX],y[AVY],-f.x/a.mass,-f.z/a.mass,ta/a.inertia,y[AS],
      y[BVX],y[BVY],f.x/b.mass,f.z/b.mass,tb/b.inertia,y[BS],
      f.share*(f.c*f.ux+f.s*f.uy),f.share*(-f.s*f.ux+f.c*f.uy),f.ux,f.uy,
      f.x,f.z,(H-t)*f.x,(H-t)*f.z,ta,tb,(H-t)*ta,(H-t)*tb,
      f.x*f.gx+f.z*f.gy,-f.footx*f.ux-f.footy*f.uy,f.total,
      f.slipping?(1-y[LEGS])/LEG_SLIDE:0,f.normal,f.tangent]};
  }
  const derivative=(t:number,y:State)=>physical(t,y).values;
  if(C===0||acquired.beta>=1)return {...mixedGripInterval(input),eventTime:undefined,method:'uniform-no-event' as const};
  // A small predictor selects the numerical route. It
  // never supplies accepted motion. Non-event controls retain the checked
  // uniform reference; every event trajectory still passes the full gates.
  let predictor=initial.slice(),priorTime=0;
  try {
    const h=H/4;
    for(let k=0;k<4;k++) {
      const t=k*h,add=(z:State,s:number)=>predictor.map((v,j)=>v+s*z[j]),
        a=derivative(t,predictor),b=derivative(t+h/2,add(a,h/2)),c=derivative(t+h/2,add(b,h/2)),d=derivative(t+h,add(c,h));
      predictor=predictor.map((v,j)=>v+h*(a[j]+2*b[j]+2*c[j]+d[j])/6);
      const beta=frame(predictor).beta;
      if(beta>=1)break;
      priorTime=t+h;
    }
  }catch(e){if(!(e instanceof RangeError))throw e;return {...mixedGripInterval(input),eventTime:undefined,method:'uniform-predictor-fallback' as const};}
  if(priorTime===H)return {...mixedGripInterval(input),eventTime:undefined,method:'uniform-no-event' as const};
  function segment(y:State,n:number,start:number,end:number) {
    const h=(end-start)/n;let z=[...y,start];
    for(let k=0;k<n;k++)z=angleGripStep(start+k*h,z,h,(_s:number,y:State)=>[...derivative(y[30],y),1],stageStatistics);
    return z.slice(0,30);
  }
  // beta = attained normal demand / shared capacity. On this monotone
  // transition, theta=acos(beta) removes the square-root tangent corner.
  // The clock is a chain-rule reparameterization, not a force approximation:
  // every stage still invokes the original eight ordered physical passes.
  const theta0=Math.acos(acquired.beta);
  function angleDerivative(s:number,y:State) {
    const {values:dy,frame:g}=physical(y[30],y),speed=pressureRate(input,y,dy,g),theta=theta0*(1-s),
      rate=theta0*Math.sin(theta)/speed;
    if(!(speed>0)||!Number.isFinite(rate)||rate<0)throw new RangeError('Non-monotone force-angle clock');
    return [...dy.map(v=>v*rate),rate];
  }
  function solve(n:number) {
    eventTime=undefined;eventResidual=0;
    let z=[...initial,0];
    for(let k=0;k<n;k++)z=angleGripStep(k/n,z,1/n,angleDerivative,stageStatistics);
    let te=z[30],pre=z.slice(0,30);
    for(let retry=0;retry<4;retry++){
      const g=geometry(pre),gap=g.beta-1;rootIterations++;
      if(Math.abs(gap)<=1e-10){
        if(!(te>0&&te<H))throw new RangeError('Normal-saturation time outside interval');
        eventTime=te;eventResidual=gap;
        const y=segment(pre,n,te,H);frame(y);return y;
      }
      const dt=-gap/pressureRate(input,pre,derivative(te,pre),g);
      if(!Number.isFinite(dt)||Math.abs(dt)>H/100)throw new RangeError('Force-angle event cleanup budget');
      // Correct the small clock truncation error by advancing the original
      // equations (a tiny backward step may undo an overshoot). Never overwrite
      // force, energy, attachment, share or effort to manufacture consistency.
      pre=segment(pre,1,te,te+dt);te+=dt;
    }
    throw new RangeError('Normal-saturation root budget');
  }
  function pose(y:State) {
    const p=(body:Particle,sign:number,j:number,q:number)=>({...body,
      pos:{x:body.pos.x+body.vel.x*H+sign*y[QX]/body.mass,y:body.pos.y+body.vel.y*H+sign*y[QY]/body.mass},
      vel:{x:body.vel.x+sign*y[JX]/body.mass,y:body.vel.y+sign*y[JY]/body.mass},
      facing:body.facing+body.spin*H+y[q]/body.inertia,spin:body.spin+y[j]/body.inertia});
    return {a:p(a,-1,JA,QA),b:p(b,1,JB,QB)};
  }
  const energy=(p:Particle)=>.5*p.mass*(p.vel.x**2+p.vel.y**2)+.5*p.inertia*p.spin**2,
    angular=(p:Particle)=>p.mass*(p.pos.x*p.vel.y-p.pos.y*p.vel.x)+p.inertia*p.spin;
  function balances(y:State) {const p=pose(y);return {
    workResidual:energy(p.a)+energy(p.b)-energy(a)-energy(b)-y[BW],
    angularResidual:angular(p.a)+angular(p.b)-angular(a)-angular(b)};}
  let coarse:State|undefined,accepted:State|undefined,n=0,error=Infinity;
  for(const count of [2,4,8,16,32,64,128,256,512,1024]) {
    let fine:State;try{fine=solve(count);}catch(e){if(!(e instanceof RangeError))throw e;coarse=undefined;continue;}
    if(coarse) {
      const prior=coarse,x=pose(coarse),z=pose(fine);
      error=Math.max(...(['a','b'] as const).flatMap(k=>[
        Math.hypot(x[k].pos.x-z[k].pos.x,x[k].pos.y-z[k].pos.y)/5e-7,
        Math.hypot(x[k].vel.x-z[k].vel.x,x[k].vel.y-z[k].vel.y)/2.5e-5,
        Math.abs(x[k].facing-z[k].facing)/2.5e-6,Math.abs(x[k].spin-z[k].spin)/2.5e-4]),
        Math.hypot(coarse[ZX]-fine[ZX],coarse[ZY]-fine[ZY])/5e-7,Math.hypot(coarse[FX]-fine[FX],coarse[FY]-fine[FY])/5e-7,
        Math.abs(coarse[LEGS]-fine[LEGS])/1e-6,Math.abs(frame(coarse).hold-frame(fine).hold)/5e-7,
        Math.abs(coarse[BW]-fine[BW])/.01,Math.abs(coarse[MW]-fine[MW])/.01,
        Math.hypot(coarse[JX]-fine[JX],coarse[JY]-fine[JY])/.002,
        Math.hypot(coarse[QX]-fine[QX],coarse[QY]-fine[QY])/.00005,
        ...[JA,JB].map(j=>Math.abs(prior[j]-fine[j])/.0005),
        ...[QA,QB].map(j=>Math.abs(prior[j]-fine[j])/.000005),
        ...[NJ,TJ,DOSE].map(j=>Math.abs(prior[j]-fine[j])/.002));
      const b=balances(fine);
      if(error<=1/16&&Math.abs(b.workResidual)<=1e-8&&Math.abs(b.angularResidual)<=1e-7){accepted=fine;n=count;break;}
    }
    coarse=fine;
  }
  if(!accepted)throw new RangeError('Mixed-grip scope/refinement limit exhausted');
  const y=accepted,p=pose(y),f=frame(y),representationError=Math.max(...(['a','b'] as const).flatMap((k,i)=>[
    Math.abs(p[k].pos.x-y[i*6]),Math.abs(p[k].pos.y-y[i*6+1]),Math.abs(p[k].vel.x-y[i*6+2]),
    Math.abs(p[k].vel.y-y[i*6+3]),Math.abs(p[k].spin-y[i*6+4]),Math.abs(p[k].facing-y[i*6+5])]));
  if(representationError>=1e-10)throw new RangeError('Mixed-grip body/impulse representation limit');
  return {...p,material:{x:y[ZX],y:y[ZY]},footOffset:{x:y[FX],y:y[FY]},point:{x:p.b.pos.x+f.rbx,y:p.b.pos.y+f.rby},
    legs:y[LEGS],hold:f.hold,slipping:f.slipping,impulse:{x:y[JX],y:y[JY]},moment:{x:y[QX],y:y[QY]},
    angularImpulse:[y[JA],y[JB]],angularMoment:[y[QA],y[QB]],bodyWork:y[BW],motorWork:y[MW],passiveWork:y[BW]-y[MW],
    dose:y[DOSE],normalImpulse:y[NJ],tangentImpulse:y[TJ],...balances(y),representationError,partitions:n,evaluations,error,
    maximumCapacityExcess,eventTime,eventResidual,rootIterations,stageStatistics,method:'saturation-gauss' as const};
}
