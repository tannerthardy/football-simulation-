/** Diagnostic passive tangent interval at the acquired bounded lower point.
 * One grip/foot, zero support request and zero attained normal/reel demand.
 * Carries World's changing lower share and its 98%-capacity slip marker.
 * This is not inserted into World; unsupported channels return no state.
 */
import { boundedAttachment } from '../../../src/physics/bounded-attachment.js';
import { stiffTailStep } from './grip-stiff-tail.js';
import { passiveStageStep } from './grip-passive-stages.js';
import type { SupportedGripInput } from './grip-force-supported.js';
import type { Particle } from './grip-force-interval.js';
export interface BoundedGripInput extends SupportedGripInput {
  legs:number; recoveryCoupling?:number; pullSpeed:number;
}
type State=number[];
type Phase='cap'|'settling'|'tail';
const AX=0,AY=1,AVX=2,AVY=3,AS=4,AA=5,BX=6,BY=7,BVX=8,BVY=9,BS=10,BA=11,
  ZX=12,ZY=13,FX=14,FY=15,JX=16,JY=17,QX=18,QY=19,JA=20,JB=21,QA=22,QB=23,
  BW=24,MW=25,DOSE=26,LEGS=27;

export function boundedGripInterval(input:BoundedGripInput,integration:'uniform'|'adaptive'|'gauss'|'radau'|'eliminated'='adaptive') {
  const {a,b,duration:H,capacity:C,mobility:mu}=input,K=1/a.mass+1/b.mass;
  const numbers=[H,C,mu,input.legs,input.pullSpeed,input.hold,input.reach,input.minimumDistance,input.attachmentReach,
    input.desired.x,input.desired.y,input.material.x,input.material.y,input.footOffset.x,input.footOffset.y,
    ...[a,b].flatMap(p=>[p.mass,p.inertia,p.pos.x,p.pos.y,p.vel.x,p.vel.y,p.facing,p.spin]),
    input.recoveryCoupling??input.legs];
  if(!numbers.every(Number.isFinite)||[a.mass,b.mass,a.inertia,b.inertia,H,mu,input.attachmentReach].some(v=>v<=0)
    ||C<0||input.legs<=0||input.legs>1||input.pullSpeed<0||input.minimumDistance<0
    ||input.hold<0||input.hold>input.reach||input.reach<=input.minimumDistance
    ||input.recoveryCoupling!==undefined&&(input.recoveryCoupling<=0||input.recoveryCoupling>1))
    throw new RangeError('Invalid bounded-grip interval input');
  if(input.desired.x!==0||input.desired.y!==0)throw new RangeError('Active motor outside bounded tangent scope');
  if(H*Math.abs(a.spin)+C*H*H*input.reach/(2*a.inertia)>.1
    ||H*Math.abs(b.spin)+C*H*H*input.attachmentReach/(2*b.inertia)>.1)
    throw new RangeError('Angular travel outside short bounded tangent scope');
  const initial=[a.pos.x,a.pos.y,a.vel.x,a.vel.y,a.spin,a.facing,b.pos.x,b.pos.y,b.vel.x,b.vel.y,b.spin,b.facing,
    input.material.x,input.material.y,input.footOffset.x,input.footOffset.y,0,0,0,0,0,0,0,0,0,0,0,input.legs];
  let evaluations=0,expectedDirection=0,eventMaxBracket=0;
  const stageStatistics={steps:0,geometryIterations:0};
  function geometry(y:State) {
    const c=Math.cos(y[BA]),s=Math.sin(y[BA]),map=boundedAttachment({x:y[ZX],y:y[ZY]},input.attachmentReach),
      rbx=c*map.offset.x-s*map.offset.y,rby=s*map.offset.x+c*map.offset.y,
      rax=y[BX]+rbx-y[AX],ray=y[BY]+rby-y[AY],d=Math.hypot(rax,ray),nx=rax/d,ny=ray/d,
      share=input.recoveryCoupling??y[LEGS],D=map.derivative,
      xx=share*(c*c*D.xx-2*c*s*D.xy+s*s*D.yy),
      xy=share*(c*s*(D.xx-D.yy)+(c*c-s*s)*D.xy),
      yy=share*(s*s*D.xx+2*c*s*D.xy+c*c*D.yy),
      jtx=-xx*ny+xy*nx,jty=-xy*ny+yy*nx,M=mu*(jtx*jtx+jty*jty),
      gx=y[BVX]-y[AVX]-y[BS]*rby+y[AS]*ray,
      gy=y[BVY]-y[AVY]+y[BS]*rbx-y[AS]*rax,vt=-gx*ny+gy*nx;
    if(d>input.reach||Math.hypot(y[BX]-y[AX],y[BY]-y[AY])<=input.minimumDistance
      ||Math.hypot(y[FX],y[FY])>input.attachmentReach||!(M>0))
      throw new RangeError('Geometry/chart event outside bounded tangent scope');
    return {c,s,rbx,rby,rax,ray,d,nx,ny,share,xx,xy,yy,jtx,jty,M,gx,gy,vt};
  }
  const start=geometry(initial),sign=Math.sign(start.vt);
  function frame(y:State,phase:Phase,hold0:number,checkDirection=true,validate=true) {
    const g=geometry(y),force=C===0?0:phase==='cap'?-sign*C:Math.max(-C,Math.min(C,-g.vt/g.M)),
      x=-g.ny*force,z=g.nx*force,footx=g.xx*x+g.xy*z,footy=g.xy*x+g.yy*z,
      ux=mu*footx,uy=mu*footy,pointx=g.xx*ux+g.xy*uy,pointy=g.xy*ux+g.yy*uy,
      vn=(g.gx+pointx)*g.nx+(g.gy+pointy)*g.ny,
      hold=phase==='tail'?Math.min(hold0,Math.max(g.d,input.minimumDistance)):Math.max(hold0,g.d),
      extension=Math.max(0,g.d-hold);
    // An anisotropic Jacobian couples tangent motor load into normal velocity.
    // Query that actual velocity, not just body approach. No normal law is
    // invented here; any nonzero tensile/reel demand requires another operator.
    if(validate&&(vn>1e-12||extension>1e-8&&Math.hypot(g.gx,g.gy)>1e-12||vn+input.pullSpeed>1e-12))
      throw new RangeError('Normal/reel channel outside bounded tangent scope');
    if(validate&&checkDirection&&Math.abs(vn)>1e-12&&(expectedDirection===0||Math.sign(vn)!==expectedDirection))
      throw new RangeError('Distance reversal outside bounded tangent scope');
    if(validate&&phase==='tail'&&C>0&&Math.abs(force)>.98*C*(1+1e-10))
      throw new RangeError('Renewed slipping outside bounded tangent scope');
    return {...g,force,x,z,footx,footy,ux,uy,vn,hold};
  }
  const initialPhase:Phase=C>0&&Math.abs(start.vt)>=start.M*C?'cap'
    :C>0&&Math.abs(start.vt)/start.M>=.98*C?'settling':'tail';
  expectedDirection=Math.sign(frame(initial,initialPhase,input.hold,false).vn);
  function derivative(t:number,y:State,phase:Phase,hold:number,validate=true) {
    evaluations++;const f=frame(y,phase,hold,true,validate),ta=-f.rax*f.z+f.ray*f.x,tb=f.rbx*f.z-f.rby*f.x;
    return [y[AVX],y[AVY],-f.x/a.mass,-f.z/a.mass,ta/a.inertia,y[AS],
      y[BVX],y[BVY],f.x/b.mass,f.z/b.mass,tb/b.inertia,y[BS],
      f.share*(f.c*f.ux+f.s*f.uy),f.share*(-f.s*f.ux+f.c*f.uy),f.ux,f.uy,
      f.x,f.z,(H-t)*f.x,(H-t)*f.z,ta,tb,(H-t)*ta,(H-t)*tb,
      f.x*f.gx+f.z*f.gy,-f.footx*f.ux-f.footy*f.uy,Math.abs(f.force),
      phase==='tail'?0:(1-y[LEGS])/.3];
  }
  function rk4(t:number,y:State,h:number,phase:Phase,hold:number) {
    const add=(k:State,s:number)=>y.map((v,i)=>v+s*k[i]),a=derivative(t,y,phase,hold),
      b=derivative(t+h/2,add(a,h/2),phase,hold),c=derivative(t+h/2,add(b,h/2),phase,hold),
      d=derivative(t+h,add(c,h),phase,hold);
    return y.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);
  }
  function solve(n:number) {
    let y=initial.slice(),t=0,phase=initialPhase,hold=input.hold,
      capUntil=phase==='cap'?H:0,slidingUntil=phase==='tail'?0:H,nextTailStep=0;
    // Check the represented body's energy change from its impulse ledger,
    // exactly as endpoint velocity is recovered. This avoids subtracting
    // large energies or tiny rounded body-velocity changes. Body power is
    // still integrated independently; work is never replaced by this check.
    const energyChange=(x:State,z:State)=>{
      const dx=z[JX]-x[JX],dy=z[JY]-x[JY],da=z[JA]-x[JA],db=z[JB]-x[JB];
      return (b.vel.x-a.vel.x+K*x[JX])*dx+(b.vel.y-a.vel.y+K*x[JY])*dy
        +.5*K*(dx*dx+dy*dy)+(a.spin+x[JA]/a.inertia)*da+.5*da*da/a.inertia
        +(b.spin+x[JB]/b.inertia)*db+.5*db*db/b.inertia;
    };
    const localError=(x:State,z:State)=>Math.max(...([0,6]).flatMap(i=>[
      Math.hypot(x[i]-z[i],x[i+1]-z[i+1])/5e-7,
      Math.hypot(x[i+2]-z[i+2],x[i+3]-z[i+3])/2.5e-5,
      Math.abs(x[i+4]-z[i+4])/2.5e-4,Math.abs(x[i+5]-z[i+5])/2.5e-6]),
      Math.hypot(x[ZX]-z[ZX],x[ZY]-z[ZY])/5e-7,Math.hypot(x[FX]-z[FX],x[FY]-z[FY])/5e-7,
      Math.abs(x[LEGS]-z[LEGS])/1e-6,Math.abs(x[BW]-z[BW])/.01,Math.abs(x[MW]-z[MW])/.01);
    function implicit(t:number,y:State,h:number,hold:number) {
      const g=geometry(y),ka=g.rax*g.nx+g.ray*g.ny,kb=g.rbx*g.nx+g.rby*g.ny,
        u=y.map(()=>0),w=y.map(()=>0);
      u[AVX]=g.ny/a.mass;u[AVY]=-g.nx/a.mass;u[AS]=-ka/a.inertia;
      u[BVX]=-g.ny/b.mass;u[BVY]=g.nx/b.mass;u[BS]=kb/b.inertia;
      // The approximate Newton direction must respect the same linear
      // momentum/impulse identities as its residual, even before convergence.
      u[JX]=-g.ny;u[JY]=g.nx;u[JA]=-ka;u[JB]=kb;
      w[AVX]=g.ny/g.M;w[AVY]=-g.nx/g.M;w[AS]=-ka/g.M;
      w[BVX]=-g.ny/g.M;w[BVY]=g.nx/g.M;w[BS]=kb/g.M;
      return stiffTailStep(t,y,h,(time,state,validate)=>derivative(time,state,'tail',hold,validate),
        {u,w},delta=>localError(delta,delta.map(()=>0)),integration==='radau'?'radau':'gauss');
    }
    function eliminated(t:number,y:State,h:number,hold:number) {
      const f=frame(y,'tail',hold);
      // No viscous mode exists in a nonrotating, exactly head-on free pair.
      // Retain the existing explicit operator instead of solving empty stages.
      if(C===0||f.vt===0&&y[AS]===0&&y[BS]===0)return rk4(t,y,h,'tail',hold);
      return passiveStageStep(t,y,h,{a,b,mobility:mu,geometry,
        derivative:(time,state)=>derivative(time,state,'tail',hold),statistics:stageStatistics});
    }
    for(let k=0;k<n;k++) {
      const end=(k+1)*H/n;
      let pieces=0;
      while(t<end) {
        if(++pieces>128)throw new RangeError('Bounded tangent event budget exhausted');
        let h=end-t;
        if(phase==='tail'&&integration!=='uniform') {
          if(!nextTailStep) {
            const g=geometry(y),ka=g.rax*g.nx+g.ray*g.ny,kb=g.rbx*g.nx+g.rby*g.ny;
            // A COM-point head-on pair with zero spin has no source of
            // tangential slip. Do not resolve a viscous transient it lacks.
            nextTailStep=g.vt===0&&y[AS]===0&&y[BS]===0&&y[ZX]===0&&y[ZY]===0?end-t
              :.05*g.M/(K+ka*ka/a.inertia+kb*kb/b.inertia);
          }
          h=Math.min(h,nextTailStep);
          let accepted=false;
          for(let retry=0;retry<20;retry++) {
            if(!(h>0)||t+h===t)throw new RangeError('Bounded tangent adaptive underflow');
            let fine:State,error:number;
            try {
              const step=integration==='eliminated'?eliminated:integration==='gauss'||integration==='radau'?implicit:(t:number,y:State,h:number,hold:number)=>rk4(t,y,h,phase,hold),
                coarse=step(t,y,h,hold),mid=step(t,y,h/2,hold);
              fine=step(t+h/2,mid,h/2,hold);
              // Allocate local accuracy by elapsed physical time. Separately
              // cap represented-work drift, including a roundoff floor whose
              // accumulated cost is still checked by the unchanged global gate.
              error=Math.max(localError(coarse,fine)*16*n*H/h,
                Math.abs(energyChange(y,fine)-(fine[BW]-y[BW]))/Math.max(1e-12,1e-8*h/H/(8*n)));
            }catch(e){if(!(e instanceof RangeError))throw e;h/=2;continue;}
            if(error<=1) {
              y=fine;t+=h;nextTailStep=h*Math.min(2,Math.max(.5,.9*Math.max(error,1e-16)**(-.2)));
              accepted=true;break;
            }
            h/=2;
          }
          if(!accepted)throw new RangeError('Bounded tangent adaptive retry budget exhausted');
          continue;
        }
        if(phase==='settling') {
          const g=geometry(y),ka=g.rax*g.nx+g.ray*g.ny,kb=g.rbx*g.nx+g.rby*g.ny,
            inverse=K+ka*ka/a.inertia+kb*kb/b.inertia;
          h=Math.min(h,.05*g.M/inverse); // resolve the narrow 100%→98% event only
        }
        if(!(h>0)||t+h===t)throw new RangeError('Bounded tangent event underflow');
        const next=rk4(t,y,h,phase,hold);
        if(phase!=='tail') {
          const fraction=phase==='cap'?1:.98,g=geometry(next),gap=sign*g.vt-fraction*g.M*C;
          if(gap<=0) {
            let lo=0,hi=h;
            for(let j=0;j<36;j++) {
              // Existing motion/share/work gates still apply. A 1ns event
              // bracket per transition bounds two-clock share error by 6.67e-9, below
              // its 1e-6 budget; the old 36-iteration path remains unchanged.
              if(integration==='eliminated'&&hi-lo<=1e-9)break;
              const mid=(lo+hi)/2,z=geometry(rk4(t,y,mid,phase,hold));
              if(sign*z.vt-fraction*z.M*C>0)lo=mid;else hi=mid;
            }
            if(integration==='eliminated')eventMaxBracket=Math.max(eventMaxBracket,hi-lo);
            const delta=(lo+hi)/2;y=rk4(t,y,delta,phase,hold);t+=delta;
            if(phase==='cap'){capUntil=t;phase='settling';}
            else {slidingUntil=t;phase='tail';hold=geometry(y).d;}
            continue;
          }
        }
        y=next;t+=h;
      }
    }
    const final=frame(y,phase,hold);return {y,phase,hold:final.hold,capUntil,slidingUntil};
  }
  function pose(y:State) {
    const p=(body:Particle,sign:number,j:number,q:number)=>({...body,
      pos:{x:body.pos.x+body.vel.x*H+sign*y[QX]/body.mass,y:body.pos.y+body.vel.y*H+sign*y[QY]/body.mass},
      vel:{x:body.vel.x+sign*y[JX]/body.mass,y:body.vel.y+sign*y[JY]/body.mass},
      facing:body.facing+body.spin*H+y[q]/body.inertia,spin:body.spin+y[j]/body.inertia});
    return {a:p(a,-1,JA,QA),b:p(b,1,JB,QB)};
  }
  const energy=(p:Particle)=>.5*p.mass*(p.vel.x*p.vel.x+p.vel.y*p.vel.y)+.5*p.inertia*p.spin*p.spin;
  const angular=(p:Particle)=>p.mass*(p.pos.x*p.vel.y-p.pos.y*p.vel.x)+p.inertia*p.spin;
  function balances(y:State) {const p=pose(y);return {
    workResidual:energy(p.a)+energy(p.b)-energy(a)-energy(b)-y[BW],
    angularResidual:angular(p.a)+angular(p.b)-angular(a)-angular(b)};}
  let coarse:ReturnType<typeof solve>|undefined,accepted:ReturnType<typeof solve>|undefined,n=0,error=Infinity;
  for(const count of [2,4,8,16,32,64,128,256,512,1024]) {
    let fine:ReturnType<typeof solve>;
    try {fine=solve(count);}catch(e){if(!(e instanceof RangeError))throw e;coarse=undefined;continue;}
    if(coarse) {
      const x=pose(coarse.y),z=pose(fine.y);
      error=Math.max(...(['a','b'] as const).flatMap(k=>[
        Math.hypot(x[k].pos.x-z[k].pos.x,x[k].pos.y-z[k].pos.y)/5e-7,
        Math.hypot(x[k].vel.x-z[k].vel.x,x[k].vel.y-z[k].vel.y)/2.5e-5,
        Math.abs(x[k].facing-z[k].facing)/2.5e-6,Math.abs(x[k].spin-z[k].spin)/2.5e-4]),
        Math.hypot(coarse.y[ZX]-fine.y[ZX],coarse.y[ZY]-fine.y[ZY])/5e-7,
        Math.hypot(coarse.y[FX]-fine.y[FX],coarse.y[FY]-fine.y[FY])/5e-7,
        Math.abs(coarse.y[LEGS]-fine.y[LEGS])/1e-6,Math.abs(coarse.hold-fine.hold)/5e-7,
        Math.abs(coarse.y[BW]-fine.y[BW])/.01,Math.abs(coarse.y[MW]-fine.y[MW])/.01);
      const b=balances(fine.y);
      if(error<=1/16&&Math.abs(b.workResidual)<=1e-8&&Math.abs(b.angularResidual)<=1e-7)
        {accepted=fine;n=count;break;}
    }
    coarse=fine;
  }
  if(!accepted)throw new RangeError('Bounded tangent scope/refinement limit exhausted');
  const y=accepted.y,p=pose(y),g=geometry(y),
    representationError=Math.max(...(['a','b'] as const).flatMap((k,i)=>[
      Math.abs(p[k].pos.x-y[i*6]),Math.abs(p[k].pos.y-y[i*6+1]),Math.abs(p[k].vel.x-y[i*6+2]),
      Math.abs(p[k].vel.y-y[i*6+3]),Math.abs(p[k].spin-y[i*6+4]),Math.abs(p[k].facing-y[i*6+5])]));
  if((integration==='gauss'||integration==='radau'||integration==='eliminated')&&!(representationError<1e-10))
    throw new RangeError('Bounded tangent body/impulse representation limit exhausted');
  return {...p,material:{x:y[ZX],y:y[ZY]},footOffset:{x:y[FX],y:y[FY]},
    point:{x:p.b.pos.x+g.rbx,y:p.b.pos.y+g.rby},legs:y[LEGS],hold:accepted.hold,
    slipping:accepted.phase!=='tail',capUntil:accepted.capUntil,slidingUntil:accepted.slidingUntil,
    impulse:{x:y[JX],y:y[JY]},moment:{x:y[QX],y:y[QY]},
    angularImpulse:[y[JA],y[JB]],angularMoment:[y[QA],y[QB]],bodyWork:y[BW],motorWork:y[MW],
    passiveWork:y[BW]-y[MW],dose:y[DOSE],...balances(y),partitions:n,evaluations,error,integration,
    representationError,...(integration==='eliminated'?{stageStatistics,eventMaxBracket}:{})};
}
