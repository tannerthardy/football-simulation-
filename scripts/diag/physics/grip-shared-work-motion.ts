/** Short passive closing-span mechanical witness, not a World integrator.
 * Reference: independent box force + fine RK4. Candidate: coupled force +
 * DOP853. Hold/share laws and all capacities are unchanged; a change of
 * phase, nonzero span bias or normal demand refuses the witness. */
import type {SharedGripInput} from './grip-force-shared.js';
import {pressureGeometry} from './grip-pressure-rate.js';
import {sharedGripForce} from './grip-shared-law.js';
import {tangentBoxReference} from './grip-shared-work-reference.js';
import {sharedExplicitStep} from './grip-shared-explicit.js';
import {LEG_SLIDE} from '../../../src/physics/grip-sliding.js';
export function sharedWorkMotion(input:SharedGripInput,mode:'channel'|'coupled'|'reference',partitions:number,method:'rk4'|'rk8'){
  const {bodies,grips,duration:H,mobility:mu}=input,N=bodies.length,M=grips.length,Z=6*N,FOOT=Z+3*M,J=FOOT+2,MW=J+12*M,T=MW+1;
  if(!(H>0&&H<=.0001)||!Number.isInteger(partitions)||partitions<1||partitions>256||!(mu>0)
    ||![2,3].includes(N)||M!==N-1||new Set(grips.map(g=>g.holder)).size!==M
    ||grips.some(g=>g.held!==1||![0,2].includes(g.holder)||g.holder>=N||g.capacity<0||g.legs<=0||g.legs>1||g.hold<0||g.hold>g.reach)
    ||bodies.some(b=>b.mass<=0||b.inertia<=0))
    throw new RangeError('Short passive motion scope');
  const initial=[...bodies.flatMap(b=>[b.pos.x,b.pos.y,b.vel.x,b.vel.y,b.spin,b.facing]),
    ...grips.flatMap(g=>[g.material.x,g.material.y,g.legs]),input.footOffset.x,input.footOffset.y,...Array(12*M+2).fill(0)];
  if(![...initial,H,mu,input.attachmentReach,input.minimumDistance,...bodies.flatMap(b=>[b.mass,b.inertia]),
    ...grips.flatMap(g=>[g.capacity,g.hold,g.reach])].every(Number.isFinite)||input.attachmentReach<=0||input.minimumDistance<0)
    throw new RangeError('Short passive motion input');
  let phases:boolean[]|undefined,evaluations=0,maximumTargetResidual=0,maximumForceError=0,maximumPassivePower=-Infinity,maximumCapacityExcess=0;
  function frame(y:number[]){
    const g=grips.map((v,k)=>{
      const a=bodies[v.holder],b=bodies[1],ai=6*v.holder,z=Z+3*k,q=[...y.slice(ai,ai+6),...y.slice(6,12),y[z],y[z+1],...Array(13).fill(0),y[z+2]],
        f=pressureGeometry({...v,a,b,mobility:mu,attachmentReach:input.attachmentReach} as any,q);
      if(f.d>v.hold+1e-12||f.d>v.reach||Math.hypot(y[6]-y[ai],y[7]-y[ai+1])<=input.minimumDistance
        ||Math.hypot(y[FOOT],y[FOOT+1])>input.attachmentReach)throw new RangeError('Short passive motion geometry');
      return {...f,capacity:v.capacity,inverseMass:1/a.mass+1/b.mass,normalBias:0};
    });
    const independent=()=>{
      if(M===2)return tangentBoxReference(g,mu);
      const v=g[0],f=Math.max(-v.capacity,Math.min(v.capacity,-v.vt/v.tt)),
        load={x:(-v.xx*v.ny+v.xy*v.nx)*f,y:(-v.xy*v.ny+v.yy*v.nx)*f},velocity={x:mu*load.x,y:mu*load.y};
      if(v.vn+v.jnx*velocity.x+v.jny*velocity.y>1e-10)throw new RangeError('Short reference normal demand');
      return {force:[f],velocity,passivePower:f*v.vt+mu*(load.x**2+load.y**2)};
    },r=mode==='reference'?undefined:sharedGripForce(g,mu,mode),truth=mode!=='channel'?independent():undefined,
      f=r?r.rows.map(v=>v.tangent):truth!.force,u=r?r.velocity:truth!.velocity,
      power=r?r.passivePower:truth!.passivePower,slipping=f.map((v,k)=>g[k].capacity>0&&Math.abs(v)>=.98*g[k].capacity);
    if(r?.rows.some(v=>Math.abs(v.normal)>1e-9))throw new RangeError('Short passive motion normal demand');
    if(phases&&slipping.some((v,k)=>v!==phases![k]))throw new RangeError('Short passive motion phase');
    maximumTargetResidual=Math.max(maximumTargetResidual,r?.targetResidual??0);
    if(truth)maximumForceError=Math.max(maximumForceError,...f.map((v,k)=>Math.abs(v-truth.force[k])));
    maximumPassivePower=Math.max(maximumPassivePower,power);
    maximumCapacityExcess=Math.max(maximumCapacityExcess,...f.map((v,k)=>Math.abs(v)-g[k].capacity));
    if(power>1e-8)throw new RangeError('Short passive motion work');
    return {g,f,u,slipping};
  }
  phases=frame(initial).slipping;
  function derivative(y:number[]){
    evaluations++;const {g,f,u}=frame(y),d=Array(y.length).fill(0),c=Math.cos(y[11]),s=Math.sin(y[11]);
    for(let i=0;i<N;i++){const k=6*i;d[k]=y[k+2];d[k+1]=y[k+3];d[k+5]=y[k+4];}
    d[FOOT]=u.x;d[FOOT+1]=u.y;d[MW]=-(u.x**2+u.y**2)/mu;d[T]=1;
    for(let k=0;k<M;k++){
      const v=g[k],a=6*grips[k].holder,z=Z+3*k,j=J+12*k,fx=-v.ny*f[k],fy=v.nx*f[k],
        ta=-v.rax*fy+v.ray*fx,tb=v.rbx*fy-v.rby*fx;
      d[a+2]-=fx/bodies[grips[k].holder].mass;d[a+3]-=fy/bodies[grips[k].holder].mass;d[a+4]+=ta/bodies[grips[k].holder].inertia;
      d[8]+=fx/bodies[1].mass;d[9]+=fy/bodies[1].mass;d[10]+=tb/bodies[1].inertia;
      d[z]=v.share*(c*u.x+s*u.y);d[z+1]=v.share*(-s*u.x+c*u.y);d[z+2]=phases![k]?(1-y[z+2])/LEG_SLIDE:0;
      d[j]=fx;d[j+1]=fy;d[j+2]=(H-y[T])*fx;d[j+3]=(H-y[T])*fy;
      d[j+4]=ta;d[j+5]=tb;d[j+6]=(H-y[T])*ta;d[j+7]=(H-y[T])*tb;
      d[j+8]=fx*v.gx+fy*v.gy;d[j+9]=Math.abs(f[k]);d[j+10]=0;d[j+11]=f[k];
    }
    return d;
  }
  function rk4(y:number[],h:number){const add=(v:number[],t:number)=>y.map((z,k)=>z+t*v[k]),
    a=derivative(y),b=derivative(add(a,h/2)),c=derivative(add(b,h/2)),d=derivative(add(c,h));
    return y.map((v,k)=>v+h*(a[k]+2*b[k]+2*c[k]+d[k])/6);
  }
  let y=initial.slice();for(let k=0;k<partitions;k++)y=method==='rk8'?sharedExplicitStep(y,H/partitions,derivative):rk4(y,H/partitions);
  const finalFrame=frame(y);
  const energy=(z:number[])=>bodies.reduce((e,b,i)=>{const k=6*i;return e+.5*b.mass*(z[k+2]**2+z[k+3]**2)+.5*b.inertia*z[k+4]**2;},0),
    angular=(z:number[])=>bodies.reduce((e,b,i)=>{const k=6*i;return e+b.mass*(z[k]*z[k+3]-z[k+1]*z[k+2])+b.inertia*z[k+4];},0),
    bodyWork=grips.reduce((s,_g,k)=>s+y[J+12*k+8],0),motorWork=y[MW],
    result={bodies:bodies.map((b,i)=>({...b,pos:{x:y[6*i],y:y[6*i+1]},vel:{x:y[6*i+2],y:y[6*i+3]},spin:y[6*i+4],facing:y[6*i+5]})),
      grips:grips.map((v,k)=>{const z=Z+3*k,j=J+12*k;return {...v,material:{x:y[z],y:y[z+1]},legs:y[z+2],slipping:phases![k],
        point:{x:y[6]+finalFrame.g[k].rbx,y:y[7]+finalFrame.g[k].rby},
        impulse:{x:y[j],y:y[j+1]},moment:{x:y[j+2],y:y[j+3]},angularImpulse:[y[j+4],y[j+5]],angularMoment:[y[j+6],y[j+7]],
        bodyWork:y[j+8],dose:y[j+9],normalImpulse:y[j+10],tangentImpulse:y[j+11]};}),
      footOffset:{x:y[FOOT],y:y[FOOT+1]},bodyWork,motorWork,passiveWork:bodyWork-motorWork,workResidual:energy(y)-energy(initial)-bodyWork,
      angularResidual:angular(y)-angular(initial),maximumForceError,maximumTargetResidual,maximumPassivePower,maximumCapacityExcess,evaluations,partitions,method,mode};
  let representationError=0,linearResidual=0;
  for(let i=0;i<N;i++){
    const original=bodies[i],next=result.bodies[i];let ix=0,iy=0,qx=0,qy=0,ia=0,qa=0;
    for(let k=0;k<M;k++){
      const v=result.grips[k],sign=grips[k].holder===i?-1:i===1?1:0;
      ix+=sign*v.impulse.x;iy+=sign*v.impulse.y;qx+=sign*v.moment.x;qy+=sign*v.moment.y;
      if(sign){const member=sign<0?0:1;ia+=v.angularImpulse[member];qa+=v.angularMoment[member];}
    }
    representationError=Math.max(representationError,
      Math.abs(next.vel.x-original.vel.x-ix/original.mass),Math.abs(next.vel.y-original.vel.y-iy/original.mass),
      Math.abs(next.pos.x-original.pos.x-H*original.vel.x-qx/original.mass),Math.abs(next.pos.y-original.pos.y-H*original.vel.y-qy/original.mass),
      Math.abs(next.spin-original.spin-ia/original.inertia),Math.abs(next.facing-original.facing-H*original.spin-qa/original.inertia));
  }
  for(const axis of ['x','y'] as const)linearResidual=Math.max(linearResidual,
    Math.abs(bodies.reduce((sum,b,i)=>sum+b.mass*(result.bodies[i].vel[axis]-b.vel[axis]),0)));
  return {...result,representationError,linearResidual};
}
