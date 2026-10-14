/** Diagnostic passive normal/tangent interval at a bounded lower attachment.
 * The existing tangent operator remains the opposing control. This extension
 * follows one fixed slipping phase and monotone opening with a zero-extension
 * hold ratchet. No active reel, multiple contacts or World insertion. */
import {boundedAttachment} from '../../../src/physics/bounded-attachment.js';
import {LEG_SLIDE} from '../../../src/physics/grip-sliding.js';
import {boundedGripInterval,type BoundedGripInput} from './grip-force-bounded.js';
import type {Particle} from './grip-force-interval.js';

/** Continuous limit of World's eight ordered normal/tangent row passes.
 * M=mu*J^T*J in the contact frame, including its off-diagonal entry. The
 * existing 6-Hz/.8 normal softness uses translational reduced mass. The same
 * vector capacity bounds both components; this is not a new optimal allocator. */
export function mixedSupportForce(vn:number,vt:number,nn:number,nt:number,tt:number,K:number,C:number) {
  const values=[vn,vt,nn,nt,tt,K,C];
  if(!values.every(Number.isFinite)||nn<=0||tt<=0||nn*tt-nt*nt<=0||K<=0||C<0)
    throw new RangeError('Invalid mixed mobility/budget');
  const damping=2*.8*2*Math.PI*6/K;
  let normal=0,tangent=0;
  for(let pass=0;pass<8;pass++) {
    const normalLimit=Math.sqrt(Math.max(0,C*C-tangent*tangent));
    normal=Math.max(-normalLimit,Math.min(0,-damping*(vn+nt*tangent)/(1+damping*nn)));
    const tangentLimit=Math.sqrt(Math.max(0,C*C-normal*normal));
    tangent=Math.max(-tangentLimit,Math.min(tangentLimit,-(vt+nt*normal)/tt));
  }
  return {normal,tangent};
}
const AX=0,AY=1,AVX=2,AVY=3,AS=4,AA=5,BX=6,BY=7,BVX=8,BVY=9,BS=10,BA=11,
  ZX=12,ZY=13,FX=14,FY=15,JX=16,JY=17,QX=18,QY=19,JA=20,JB=21,QA=22,QB=23,
  BW=24,MW=25,DOSE=26,LEGS=27,NJ=28,TJ=29;
type State=number[];
export function mixedGripInterval(input:BoundedGripInput,integration:'uniform'|'adaptive'='uniform') {
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
  let evaluations=0,maximumCapacityExcess=0,estimatedErrorSum=0,absoluteWorkDriftSum=0;
  function frame(y:State) {
    const c=Math.cos(y[BA]),s=Math.sin(y[BA]),map=boundedAttachment({x:y[ZX],y:y[ZY]},input.attachmentReach),
      rbx=c*map.offset.x-s*map.offset.y,rby=s*map.offset.x+c*map.offset.y,
      rax=y[BX]+rbx-y[AX],ray=y[BY]+rby-y[AY],d=Math.hypot(rax,ray),nx=rax/d,ny=ray/d,
      share=input.recoveryCoupling??y[LEGS],D=map.derivative,
      xx=share*(c*c*D.xx-2*c*s*D.xy+s*s*D.yy),xy=share*(c*s*(D.xx-D.yy)+(c*c-s*s)*D.xy),
      yy=share*(s*s*D.xx+2*c*s*D.xy+c*c*D.yy),
      jnx=xx*nx+xy*ny,jny=xy*nx+yy*ny,jtx=-xx*ny+xy*nx,jty=-xy*ny+yy*nx,
      nn=mu*(jnx*jnx+jny*jny),nt=mu*(jnx*jtx+jny*jty),tt=mu*(jtx*jtx+jty*jty),
      gx=y[BVX]-y[AVX]-y[BS]*rby+y[AS]*ray,gy=y[BVY]-y[AVY]+y[BS]*rbx-y[AS]*rax,
      vn=gx*nx+gy*ny,vt=-gx*ny+gy*nx,
      f=mixedSupportForce(vn,vt,nn,nt,tt,K,C),x=f.normal*nx-f.tangent*ny,z=f.normal*ny+f.tangent*nx,
      total=Math.hypot(f.normal,f.tangent),slipping=C>0&&total>=.98*C,
      hold=slipping?Math.max(input.hold,d):Math.min(input.hold,Math.max(d,input.minimumDistance)),
      footx=xx*x+xy*z,footy=xy*x+yy*z,ux=mu*footx,uy=mu*footy,
      radial=vn+nn*f.normal+nt*f.tangent,passive=x*gx+z*gy+footx*ux+footy*uy;
    maximumCapacityExcess=Math.max(maximumCapacityExcess,total-C);
    if(d>input.reach||Math.hypot(y[BX]-y[AX],y[BY]-y[AY])<=input.minimumDistance
      ||Math.hypot(y[FX],y[FY])>input.attachmentReach)
      throw new RangeError('Geometry/chart event outside mixed-grip scope');
    if(C>0&&!slipping||radial< -1e-12||C>0&&d<input.hold-1e-8)
      throw new RangeError('Slip/hold transition outside mixed-grip scope');
    if(passive>1e-8)throw new RangeError('Passive work limiter outside mixed-grip scope');
    return {...f,c,s,rbx,rby,rax,ray,d,share,gx,gy,x,z,footx,footy,ux,uy,total,slipping,hold,radial};
  }
  frame(initial);
  function derivative(t:number,y:State) {
    evaluations++;const f=frame(y),ta=-f.rax*f.z+f.ray*f.x,tb=f.rbx*f.z-f.rby*f.x;
    return [y[AVX],y[AVY],-f.x/a.mass,-f.z/a.mass,ta/a.inertia,y[AS],
      y[BVX],y[BVY],f.x/b.mass,f.z/b.mass,tb/b.inertia,y[BS],
      f.share*(f.c*f.ux+f.s*f.uy),f.share*(-f.s*f.ux+f.c*f.uy),f.ux,f.uy,
      f.x,f.z,(H-t)*f.x,(H-t)*f.z,ta,tb,(H-t)*ta,(H-t)*tb,
      f.x*f.gx+f.z*f.gy,-f.footx*f.ux-f.footy*f.uy,f.total,
      f.slipping?(1-y[LEGS])/LEG_SLIDE:0,f.normal,f.tangent];
  }
  const localError=(x:State,z:State)=>Math.max(...([0,6]).flatMap(i=>[
    Math.hypot(x[i]-z[i],x[i+1]-z[i+1])/5e-7,Math.hypot(x[i+2]-z[i+2],x[i+3]-z[i+3])/2.5e-5,
    Math.abs(x[i+4]-z[i+4])/2.5e-4,Math.abs(x[i+5]-z[i+5])/2.5e-6]),
    Math.hypot(x[ZX]-z[ZX],x[ZY]-z[ZY])/5e-7,Math.hypot(x[FX]-z[FX],x[FY]-z[FY])/5e-7,
    Math.abs(x[LEGS]-z[LEGS])/1e-6,Math.abs(x[BW]-z[BW])/.01,Math.abs(x[MW]-z[MW])/.01);
  const energyChange=(x:State,z:State)=>{
    const dx=z[JX]-x[JX],dy=z[JY]-x[JY],da=z[JA]-x[JA],db=z[JB]-x[JB];
    return (b.vel.x-a.vel.x+K*x[JX])*dx+(b.vel.y-a.vel.y+K*x[JY])*dy+.5*K*(dx*dx+dy*dy)
      +(a.spin+x[JA]/a.inertia)*da+.5*da*da/a.inertia+(b.spin+x[JB]/b.inertia)*db+.5*db*db/b.inertia;
  };
  function rk4(t:number,y:State,h:number) {
    const add=(z:State,s:number)=>y.map((v,i)=>v+s*z[i]),
      a=derivative(t,y),b=derivative(t+h/2,add(a,h/2)),c=derivative(t+h/2,add(b,h/2)),d=derivative(t+h,add(c,h));
    return y.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);
  }
  function solve(n:number) {
    let y=initial.slice(),t=0,nextStep=H/n,errorSum=0,workSum=0;
    for(let k=0;k<n;k++) {
      const end=(k+1)*H/n;
      if(integration==='uniform'){y=rk4(t,y,end-t);t=end;continue;}
      let pieces=0;
      while(t<end) {
        if(++pieces>128)throw new RangeError('Mixed-grip adaptive piece budget');
        let h=Math.min(end-t,nextStep),accepted=false;
        for(let retry=0;retry<20;retry++) {
          if(!(h>0)||t+h===t)throw new RangeError('Mixed-grip adaptive underflow');
          let fine:State,error:number,motionError:number,workDrift:number;
          try {
            const coarse=rk4(t,y,h),mid=rk4(t,y,h/2);fine=rk4(t+h/2,mid,h/2);
            motionError=localError(coarse,fine);workDrift=Math.abs(energyChange(y,fine)-(fine[BW]-y[BW]));
            // The square-root shared-cap corner has a finite impulse but an
            // unbounded force slope. A time-linear local budget shrinks into
            // roundoff there. Allocate nonuniformly and bound the *sum* of
            // accepted errors/work drift; the original global gates remain.
            const portion=Math.sqrt(h/H)/(128*n);
            error=Math.max(motionError/portion,workDrift/Math.max(1e-12,1e-8*portion));
          }catch(e){if(!(e instanceof RangeError))throw e;h/=2;continue;}
          if(error<=1){
            errorSum+=motionError;workSum+=workDrift;
            if(errorSum>1/(16*n)||workSum>1e-8/(8*n))throw new RangeError('Mixed-grip summed local error budget');
            y=fine;t+=h;nextStep=h*Math.min(2,Math.max(.5,.9*Math.max(error,1e-16)**(-.2)));accepted=true;break;}
          h/=2;
        }
        if(!accepted)throw new RangeError('Mixed-grip adaptive retry budget');
      }
    }
    frame(y);estimatedErrorSum=errorSum;absoluteWorkDriftSum=workSum;return y;
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
      const x=pose(coarse),z=pose(fine);
      error=Math.max(...(['a','b'] as const).flatMap(k=>[
        Math.hypot(x[k].pos.x-z[k].pos.x,x[k].pos.y-z[k].pos.y)/5e-7,
        Math.hypot(x[k].vel.x-z[k].vel.x,x[k].vel.y-z[k].vel.y)/2.5e-5,
        Math.abs(x[k].facing-z[k].facing)/2.5e-6,Math.abs(x[k].spin-z[k].spin)/2.5e-4]),
        Math.hypot(coarse[ZX]-fine[ZX],coarse[ZY]-fine[ZY])/5e-7,Math.hypot(coarse[FX]-fine[FX],coarse[FY]-fine[FY])/5e-7,
        Math.abs(coarse[LEGS]-fine[LEGS])/1e-6,Math.abs(frame(coarse).hold-frame(fine).hold)/5e-7,
        Math.abs(coarse[BW]-fine[BW])/.01,Math.abs(coarse[MW]-fine[MW])/.01);
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
    maximumCapacityExcess,integration,method:'mixed-rk4' as const,
    ...(integration==='adaptive'?{adaptiveAccounting:{estimatedErrorSum,absoluteWorkDriftSum}}:{})};
}
