/** Passive closing-span graph coordinates shared by the diagnostic candidate
 * and reference. Force solvers/timesteppers are independent. This is not World
 * support recovery, and no active/span-energy/normal law is supplied here. */
import type {SharedGripInput} from './grip-force-shared.js';
import type {SharedGripFrame} from './grip-shared-law.js';
import {pressureGeometry} from './grip-pressure-rate.js';
import {LEG_SLIDE} from '../../../src/physics/grip-sliding.js';
export interface PhaseForce{force:number[];velocity:{x:number;y:number};normalVelocity:number[];passivePower:number;targetResidual?:number;}
export function phaseModel(input:SharedGripInput,provider:(g:SharedGripFrame[],mu:number)=>PhaseForce,maximumEvaluations=8192,reuseFrames=true){
  const {bodies,grips,duration:H,mobility:mu}=input,N=bodies.length,M=grips.length,Z=6*N,FOOT=Z+3*M,J=FOOT+2,MW=J+12*M,T=MW+1,SLIP=T+1,
    initial=[...bodies.flatMap(b=>[b.pos.x,b.pos.y,b.vel.x,b.vel.y,b.spin,b.facing]),
      ...grips.flatMap(g=>[g.material.x,g.material.y,g.legs]),input.footOffset.x,input.footOffset.y,...Array(12*M+M+2).fill(0)];
  if(!(H>0&&H<=.001)||!Number.isFinite(mu)||mu<=0||![2,3].includes(N)||M!==N-1
    ||new Set(grips.map(g=>g.holder)).size!==M||grips.some(g=>g.held!==1||![0,2].includes(g.holder)||g.holder>=N
      ||g.capacity<0||g.legs<=0||g.legs>1||g.hold<0||g.hold>g.reach)||bodies.some(b=>b.mass<=0||b.inertia<=0)
    ||![...initial,H,input.attachmentReach,input.minimumDistance,...bodies.flatMap(b=>[b.mass,b.inertia]),
      ...grips.flatMap(g=>[g.capacity,g.hold,g.reach])].every(Number.isFinite)||input.attachmentReach<=0||input.minimumDistance<0)
    throw new RangeError('Passive phase input scope');
  let evaluations=0,maximumTargetResidual=0,maximumPassivePower=-Infinity;
  // All vectors issued by these diagnostic integrators are immutable after
  // evaluation. Markers, endpoint gates and derivatives may query the same
  // vector repeatedly; reuse its physical solve, not a rounded/frozen state.
  const frames=new WeakMap<number[],ReturnType<typeof computeFrame>>();
  function frame(y:number[]){if(!reuseFrames)return computeFrame(y);const prior=frames.get(y);if(prior)return prior;const f=computeFrame(y);frames.set(y,f);return f;}
  function computeFrame(y:number[]){
    if(++evaluations>maximumEvaluations)throw new RangeError('Passive phase evaluation budget');
    const g=grips.map((v,k)=>{
      const a=bodies[v.holder],b=bodies[1],ai=6*v.holder,z=Z+3*k,q=[...y.slice(ai,ai+6),...y.slice(6,12),y[z],y[z+1],...Array(13).fill(0),y[z+2]],
        f=pressureGeometry({...v,a,b,mobility:mu,attachmentReach:input.attachmentReach} as any,q);
      if(f.d>v.hold+1e-12||f.d>v.reach||Math.hypot(y[6]-y[ai],y[7]-y[ai+1])<=input.minimumDistance
        ||Math.hypot(y[FOOT],y[FOOT+1])>input.attachmentReach)throw new RangeError('Passive phase geometry/span');
      return {...f,capacity:v.capacity,inverseMass:1/a.mass+1/b.mass,normalBias:0};
    }),r=provider(g,mu);
    if(r.normalVelocity.some(v=>v>1e-10))throw new RangeError('Passive phase normal channel');
    maximumPassivePower=Math.max(maximumPassivePower,r.passivePower);
    maximumTargetResidual=Math.max(maximumTargetResidual,r.targetResidual??0);
    if(r.passivePower>1e-8)throw new RangeError('Passive phase work');
    return {g,...r,slipping:r.force.map((v,k)=>grips[k].capacity>0&&Math.abs(v)>=.98*grips[k].capacity)};
  }
  function derivative(y:number[],phase:boolean[],guardRenewal=false){
    const f=frame(y),d=Array(y.length).fill(0),c=Math.cos(y[11]),s=Math.sin(y[11]);
    if(guardRenewal&&f.force.some((force,k)=>!phase[k]&&grips[k].capacity>0&&Math.abs(force)/grips[k].capacity>.98+1e-9))
      throw new RangeError('Renewed passive slipping outside scope');
    for(let i=0;i<N;i++){const k=6*i;d[k]=y[k+2];d[k+1]=y[k+3];d[k+5]=y[k+4];}
    d[FOOT]=f.velocity.x;d[FOOT+1]=f.velocity.y;d[MW]=-(f.velocity.x**2+f.velocity.y**2)/mu;d[T]=1;
    for(let k=0;k<M;k++){
      const g=f.g[k],a=6*grips[k].holder,z=Z+3*k,j=J+12*k,fx=-g.ny*f.force[k],fy=g.nx*f.force[k],
        ta=-g.rax*fy+g.ray*fx,tb=g.rbx*fy-g.rby*fx;
      d[a+2]-=fx/bodies[grips[k].holder].mass;d[a+3]-=fy/bodies[grips[k].holder].mass;d[a+4]+=ta/bodies[grips[k].holder].inertia;
      d[8]+=fx/bodies[1].mass;d[9]+=fy/bodies[1].mass;d[10]+=tb/bodies[1].inertia;
      d[z]=g.share*(c*f.velocity.x+s*f.velocity.y);d[z+1]=g.share*(-s*f.velocity.x+c*f.velocity.y);
      d[z+2]=phase[k]?(1-y[z+2])/LEG_SLIDE:0;d[SLIP+k]=phase[k]?1:0;
      d[j]=fx;d[j+1]=fy;d[j+2]=(H-y[T])*fx;d[j+3]=(H-y[T])*fy;
      d[j+4]=ta;d[j+5]=tb;d[j+6]=(H-y[T])*ta;d[j+7]=(H-y[T])*tb;
      d[j+8]=fx*g.gx+fy*g.gy;d[j+9]=Math.abs(f.force[k]);d[j+10]=0;d[j+11]=f.force[k];
    }
    return d;
  }
  function marker(y:number[],member:number,sign:number,kind:'cap'|'slip'|'zero'){
    const f=frame(y),C=grips[member].capacity;
    if(kind==='zero')return sign*f.force[member]/C;
    if(kind==='slip')return Math.abs(f.force[member])/C-.98;
    const g=f.g,j=g.map(q=>({x:-q.xx*q.ny+q.xy*q.nx,y:-q.xy*q.ny+q.yy*q.nx})),
      diagonal=mu*(j[member].x**2+j[member].y**2),other=1-member;
    let velocity=g[member].vt+diagonal*sign*C;
    if(M===2){const cross=mu*(j[member].x*j[other].x+j[member].y*j[other].y),d=mu*(j[other].x**2+j[other].y**2),
      force=Math.max(-grips[other].capacity,Math.min(grips[other].capacity,-(g[other].vt+cross*sign*C)/d));velocity+=cross*force;}
    return -sign*velocity/(diagonal*C);
  }
  function result(y:number[],phase:boolean[]){
    const final=frame(y),energy=(z:number[])=>bodies.reduce((e,b,i)=>{const k=6*i;return e+.5*b.mass*(z[k+2]**2+z[k+3]**2)+.5*b.inertia*z[k+4]**2;},0),
      angular=(z:number[])=>bodies.reduce((e,b,i)=>{const k=6*i;return e+b.mass*(z[k]*z[k+3]-z[k+1]*z[k+2])+b.inertia*z[k+4];},0),
      bodyWork=grips.reduce((s,_g,k)=>s+y[J+12*k+8],0),r={
        bodies:bodies.map((b,i)=>({...b,pos:{x:y[6*i],y:y[6*i+1]},vel:{x:y[6*i+2],y:y[6*i+3]},spin:y[6*i+4],facing:y[6*i+5]})),
        grips:grips.map((g,k)=>{const z=Z+3*k,j=J+12*k;return {...g,material:{x:y[z],y:y[z+1]},legs:y[z+2],slipping:phase[k],
          hold:phase[k]?Math.max(g.hold,final.g[k].d):Math.min(g.hold,Math.max(final.g[k].d,input.minimumDistance)),
          point:{x:y[6]+final.g[k].rbx,y:y[7]+final.g[k].rby},impulse:{x:y[j],y:y[j+1]},moment:{x:y[j+2],y:y[j+3]},
          angularImpulse:[y[j+4],y[j+5]],angularMoment:[y[j+6],y[j+7]],bodyWork:y[j+8],dose:y[j+9],tangentImpulse:y[j+11],
          slipDuration:y[SLIP+k],force:final.force[k]};}),
        footOffset:{x:y[FOOT],y:y[FOOT+1]},bodyWork,motorWork:y[MW],passiveWork:bodyWork-y[MW],
        workResidual:energy(y)-energy(initial)-bodyWork,angularResidual:angular(y)-angular(initial),evaluations,maximumTargetResidual,maximumPassivePower};
    let representationError=0,linearResidual=0;
    for(let i=0;i<N;i++){
      const a=bodies[i],b=r.bodies[i];let ix=0,iy=0,qx=0,qy=0,ia=0,qa=0;
      for(let k=0;k<M;k++){const v=r.grips[k],sign=grips[k].holder===i?-1:i===1?1:0;
        ix+=sign*v.impulse.x;iy+=sign*v.impulse.y;qx+=sign*v.moment.x;qy+=sign*v.moment.y;
        if(sign){const member=sign<0?0:1;ia+=v.angularImpulse[member];qa+=v.angularMoment[member];}}
      representationError=Math.max(representationError,Math.abs(b.vel.x-a.vel.x-ix/a.mass),Math.abs(b.vel.y-a.vel.y-iy/a.mass),
        Math.abs(b.pos.x-a.pos.x-H*a.vel.x-qx/a.mass),Math.abs(b.pos.y-a.pos.y-H*a.vel.y-qy/a.mass),
        Math.abs(b.spin-a.spin-ia/a.inertia),Math.abs(b.facing-a.facing-H*a.spin-qa/a.inertia));
    }
    for(const axis of ['x','y'] as const)linearResidual=Math.max(linearResidual,Math.abs(bodies.reduce((s,b,i)=>s+b.mass*(r.bodies[i].vel[axis]-b.vel[axis]),0)));
    return {...r,representationError,linearResidual};
  }
  return {initial,frame,derivative,marker,result,time:(y:number[])=>y[T]};
}
