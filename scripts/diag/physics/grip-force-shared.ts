/** Diagnostic coupled passive graph: two holders and one held body/foot.
 * Fixed observed grip phases; preserve the existing eight-pass order, work
 * limiter and allocated capacities. No World insertion or support-law change. */
import type {Particle} from './grip-force-interval.js';
import type {BoundedGripInput} from './grip-force-bounded.js';
import {pressureGeometry} from './grip-pressure-rate.js';
import {sharedGripForce} from './grip-shared-law.js';
import {sharedExplicitStep} from './grip-shared-explicit.js';
import {sharedViscousCoefficients} from './grip-shared-viscous.js';
import {LEG_SLIDE} from '../../../src/physics/grip-sliding.js';
export interface SharedGripInput{
  bodies:Particle[];duration:number;mobility:number;footOffset:{x:number;y:number};attachmentReach:number;minimumDistance:number;
  grips:Array<{holder:number;held:number;material:{x:number;y:number};legs:number;hold:number;reach:number;capacity:number}>;
}
export function sharedGripInterval(input:SharedGripInput,method:'uniform'|'rk8'='rk8'){
  const {bodies,duration:H,grips,mobility:mu}=input,N=bodies.length,M=grips.length,Z=6*N,FOOT=Z+3*M,J=FOOT+2,MW=J+12*M,T=MW+1,
    initial=[...bodies.flatMap(p=>[p.pos.x,p.pos.y,p.vel.x,p.vel.y,p.spin,p.facing]),
      ...grips.flatMap(g=>[g.material.x,g.material.y,g.legs]),input.footOffset.x,input.footOffset.y,...Array(12*M+2).fill(0)],
    statistics={steps:0};
  if(![H,mu,input.attachmentReach,input.minimumDistance,...initial,...bodies.flatMap(p=>[p.mass,p.inertia]),
    ...grips.flatMap(g=>[g.holder,g.held,g.capacity,g.hold,g.reach])].every(Number.isFinite)
    ||H<=0||mu<=0||input.attachmentReach<=0||input.minimumDistance<0||![2,3].includes(N)||M!==N-1
    ||grips.some(g=>g.held!==1||![0,2].includes(g.holder)||g.holder>=N||g.legs<=0||g.legs>1||g.capacity<0||g.hold<0||g.hold>g.reach)
    ||new Set(grips.map(g=>g.holder)).size!==M||bodies.some(p=>p.mass<=0||p.inertia<=0))throw new RangeError('Invalid shared-grip input');
  let evaluations=0;let phases:boolean[]|undefined;
  const pairs:BoundedGripInput[]=grips.map(g=>({...g,a:bodies[g.holder],b:bodies[1],mobility:mu,attachmentReach:input.attachmentReach,
    duration:H,minimumDistance:input.minimumDistance,footOffset:input.footOffset,desired:{x:0,y:0},pullSpeed:0})),
    pairStates=grips.map(()=>Array(30).fill(0));
  function geometry(y:number[]){
    return grips.map((g,k)=>{
      const ai=6*g.holder,bi=6,gz=Z+3*k,q=pairStates[k];
      for(let j=0;j<6;j++){q[j]=y[ai+j];q[6+j]=y[bi+j];}
      q[12]=y[gz];q[13]=y[gz+1];q[27]=y[gz+2];
      const v=pressureGeometry(pairs[k],q),hold=phases?.[k]?Math.max(g.hold,v.d):g.hold;
      if(v.d>g.reach||Math.hypot(y[bi]-y[ai],y[bi+1]-y[ai+1])<=input.minimumDistance
        ||Math.hypot(y[FOOT],y[FOOT+1])>input.attachmentReach||v.d<g.hold-1e-9)
        throw new RangeError('Shared-grip chart/reach/hold scope');
      return Object.assign(v,{capacity:g.capacity,inverseMass:1/bodies[g.holder].mass+1/bodies[1].mass,
        normalBias:2*Math.PI*6/(2*.8)*Math.max(0,v.d-hold)});
    });
  }
  function frame(y:number[]){
    const g=geometry(y),force=sharedGripForce(g,mu),slipping=force.rows.map((r,k)=>grips[k].capacity>0&&Math.hypot(r.normal,r.tangent)>=.98*grips[k].capacity);
    if(phases&&slipping.some((v,k)=>v!==phases![k]))throw new RangeError('Shared-grip phase change outside fixed-phase scope');
    if(force.passivePower>1e-8)throw new RangeError('Shared-grip passive power');
    return {geometry:g,force,slipping};
  }
  phases=frame(initial).slipping;
  const direction=-Math.sign(frame(initial).geometry[0].vt);
  // The late work-root regime can be stiffer than the first force sample.
  // Choose the initial explicit grid from its body/force Jacobian, rather
  // than spending failed trials at an unstable step size. A numerical bound
  // proposes subdivisions; the same physical/accuracy gates still decide.
  let stabilityRate=0,initialPartitions=2;
  if(method==='rk8'&&M===2){
    const g=geometry(initial),S=sharedViscousCoefficients(g,mu,direction,true).matrix,
      L=g.map((a,q)=>g.map((b,k)=>{
        const dot=a.nx*b.nx+a.ny*b.ny,at=a.rax*a.nx+a.ray*a.ny,bt=b.rax*b.nx+b.ray*b.ny,
          ra=a.rbx*a.nx+a.rby*a.ny,rb=b.rbx*b.nx+b.rby*b.ny,holder=bodies[grips[q].holder];
        return dot/bodies[1].mass+ra*rb/bodies[1].inertia+(q===k?dot/holder.mass+at*bt/holder.inertia:0);
      })),J=L.map(row=>[0,1].map(k=>row[0]*S[0][k]+row[1]*S[1][k]));
    stabilityRate=Math.max(...J.map(row=>Math.abs(row[0])+Math.abs(row[1])));
    initialPartitions=Math.max(2,Math.ceil(H*stabilityRate/4));
  }
  function switches(y:number[]){
    const {geometry:g,force:f}=frame(y);
    if(M!==2||phases!.some(Boolean)||f.rows.some(r=>Math.abs(r.normal)>1e-9)
      ||g[0].vt*direction>=0||Math.abs(g[0].vt/g[0].tt)>=.98*grips[0].capacity)
      throw new RangeError('Shared work-switch scope');
    const first=-g[0].vt/g[0].tt,an=-g[0].xx*g[0].ny+g[0].xy*g[0].nx,
      ay=-g[0].xy*g[0].ny+g[0].yy*g[0].nx,bn=-g[1].xx*g[1].ny+g[1].xy*g[1].nx,
      by=-g[1].xy*g[1].ny+g[1].yy*g[1].nx,cross=mu*(an*bn+ay*by)*first;
    // First tangent pass is uncapped and all normal passes deliver zero.
    // sigma is the second row's no-force target; rho is its incremental
    // passive-work boundary. These locate changes, never select new forces.
    return [direction*(g[1].vt+cross),direction*(g[1].vt+2*cross)];
  }
  function derivative(y:number[]){
    if(++evaluations>4096)throw new RangeError('Shared-grip evaluation budget');const f=frame(y),d=Array(y.length).fill(0),time=y[T],c=Math.cos(y[11]),s=Math.sin(y[11]);
    for(let i=0;i<N;i++){const k=6*i;d[k]=y[k+2];d[k+1]=y[k+3];d[k+5]=y[k+4];}
    d[FOOT]=f.force.velocity.x;d[FOOT+1]=f.force.velocity.y;d[MW]=f.force.motorPower;d[T]=1;
    for(let k=0;k<M;k++){
      const g=f.geometry[k],r=f.force.rows[k],a=6*grips[k].holder,b=6,z=Z+3*k,j=J+12*k,
        fx=g.nx*r.normal-g.ny*r.tangent,fy=g.ny*r.normal+g.nx*r.tangent,
        ta=-g.rax*fy+g.ray*fx,tb=g.rbx*fy-g.rby*fx;
      if(phases![k]&&g.vn+g.xx*g.nx*f.force.velocity.x+g.xy*g.ny*f.force.velocity.x
        +g.xy*g.nx*f.force.velocity.y+g.yy*g.ny*f.force.velocity.y< -1e-12)
        throw new RangeError('Shared slipping hold reverses');
      d[a+2]-=fx/bodies[grips[k].holder].mass;d[a+3]-=fy/bodies[grips[k].holder].mass;d[a+4]+=ta/bodies[grips[k].holder].inertia;
      d[b+2]+=fx/bodies[1].mass;d[b+3]+=fy/bodies[1].mass;d[b+4]+=tb/bodies[1].inertia;
      d[z]=g.share*(c*f.force.velocity.x+s*f.force.velocity.y);d[z+1]=g.share*(-s*f.force.velocity.x+c*f.force.velocity.y);
      d[z+2]=phases![k]?(1-y[z+2])/LEG_SLIDE:0;
      d[j]=fx;d[j+1]=fy;d[j+2]=(H-time)*fx;d[j+3]=(H-time)*fy;
      d[j+4]=ta;d[j+5]=tb;d[j+6]=(H-time)*ta;d[j+7]=(H-time)*tb;
      d[j+8]=fx*g.gx+fy*g.gy;d[j+9]=Math.hypot(r.normal,r.tangent);d[j+10]=r.normal;d[j+11]=r.tangent;
    }
    return d;
  }
  function rk4(y:number[],h:number){
    const add=(v:number[],a:number)=>y.map((z,j)=>z+a*v[j]),a=derivative(y),b=derivative(add(a,h/2)),c=derivative(add(b,h/2)),e=derivative(add(c,h));
    return y.map((z,j)=>z+h*(a[j]+2*b[j]+2*c[j]+e[j])/6);
  }
  const step=(y:number[],h:number)=>{statistics.steps++;return sharedExplicitStep(y,h,derivative);};
  let eventTimes:number[]=[],eventResiduals:number[]=[],rootIterations=0;const seeds:number[]=[];
  function solve(n:number){
    let y=initial.slice();const h=H/n,seen=[false,false];eventTimes=[];eventResiduals=[];
    for(let k=0;k<n;k++){
      const end=(k+1)*h;
      if(method==='uniform'){y=rk4(y,h);continue;}
      for(let pieces=0;y[T]<end-1e-16;pieces++){
        if(pieces>2)throw new RangeError('Shared work-switch piece budget');
        const trial=step(y,end-y[T]);
        if(M!==2){y=trial;break;}
        const start=switches(y),finish=switches(trial),event=[0,1].find(j=>!seen[j]&&start[j]<0&&finish[j]>=0);
        if(event===undefined){y=trial;break;}
        let lo=y[T],hi=end,te=seeds[event]>lo&&seeds[event]<hi?seeds[event]:lo+(hi-lo)*(-start[event])/(finish[event]-start[event]),solved=false,priorTime:number|undefined,priorGap=0;
        for(let retry=0;retry<8;retry++){
          rootIterations++;const z=step(y,te-y[T]),gap=switches(z)[event];
          if(Math.abs(gap)<1e-10){y=z;eventTimes.push(te);eventResiduals.push(gap);seen[event]=true;seeds[event]=te;solved=true;break;}
          if(gap<0)lo=te;else hi=te;
          const dy=derivative(z),eps=1e-7,physicalSlope=(switches(z.map((v,k)=>v+eps*dy[k]))[event]-gap)/eps,
            secant=priorTime!==undefined&&te!==priorTime?(gap-priorGap)/(te-priorTime):NaN,
            slope=Number.isFinite(secant)&&secant>0?secant:physicalSlope,proposal=te-gap/slope;
          // A coarse numerical trajectory can have a different root slope
          // from its endpoint's physical derivative. Use the actual map's
          // secant after the first proposal; retain the bracket and budget.
          priorTime=te;priorGap=gap;
          te=proposal>lo&&proposal<hi?proposal:(lo+hi)/2;
        }
        if(!solved)throw new RangeError('Shared work-switch root budget');
      }
    }return y;
  }
  const energy=(y:number[])=>bodies.reduce((v,p,i)=>{const k=6*i;return v+.5*p.mass*(y[k+2]**2+y[k+3]**2)+.5*p.inertia*y[k+4]**2;},0),
    angular=(y:number[])=>bodies.reduce((v,p,i)=>{const k=6*i;return v+p.mass*(y[k]*y[k+3]-y[k+1]*y[k+2])+p.inertia*y[k+4];},0),
    work=(y:number[])=>grips.reduce((v,_g,k)=>v+y[J+12*k+8],0),
    balance=(y:number[])=>({workResidual:energy(y)-energy(initial)-work(y),angularResidual:angular(y)-angular(initial)}),
    compare=(x:number[],y:number[])=>Math.max(...bodies.flatMap((_p,i)=>{const k=6*i;return [Math.hypot(x[k]-y[k],x[k+1]-y[k+1])/5e-7,
      Math.hypot(x[k+2]-y[k+2],x[k+3]-y[k+3])/2.5e-5,Math.abs(x[k+4]-y[k+4])/2.5e-4,Math.abs(x[k+5]-y[k+5])/2.5e-6];}),
      ...grips.flatMap((_g,k)=>[Math.hypot(x[Z+3*k]-y[Z+3*k],x[Z+3*k+1]-y[Z+3*k+1])/5e-7,Math.abs(x[Z+3*k+2]-y[Z+3*k+2])/1e-6,
        Math.hypot(x[J+12*k]-y[J+12*k],x[J+12*k+1]-y[J+12*k+1])/.002,
        Math.hypot(x[J+12*k+2]-y[J+12*k+2],x[J+12*k+3]-y[J+12*k+3])/.00005,
        ...[10,11,9].map(j=>Math.abs(x[J+12*k+j]-y[J+12*k+j])/.002),
        ...[4,5].map(j=>Math.abs(x[J+12*k+j]-y[J+12*k+j])/.0005),
        ...[6,7].map(j=>Math.abs(x[J+12*k+j]-y[J+12*k+j])/.000005)]),
      Math.hypot(x[FOOT]-y[FOOT],x[FOOT+1]-y[FOOT+1])/5e-7,Math.abs(work(x)-work(y))/.01,Math.abs(x[MW]-y[MW])/.01);
  let previous:number[]|undefined,accepted:number[]|undefined,partitions=0,error=Infinity;
  const counts=method==='rk8'?Array.from({length:10},(_v,k)=>initialPartitions*2**k).filter(n=>n<=1024):[2,4,8,16,32,64,128,256,512,1024];
  for(const n of counts){
    let y:number[];try{y=solve(n);}catch(e){if(!(e instanceof RangeError))throw e;previous=undefined;continue;}
    if(previous){error=compare(previous,y);const b=balance(y);if(error<=1/16&&Math.abs(b.workResidual)<=1e-8&&Math.abs(b.angularResidual)<=1e-7){accepted=y;partitions=n;break;}}
    previous=y;
  }
  if(!accepted)throw new RangeError('Shared-grip scope/refinement budget');
  const y=accepted,f=frame(y),result={bodies:bodies.map((p,i)=>({...p,pos:{x:y[6*i],y:y[6*i+1]},vel:{x:y[6*i+2],y:y[6*i+3]},spin:y[6*i+4],facing:y[6*i+5]})),
    grips:grips.map((g,k)=>{const j=J+12*k,z=Z+3*k;return {material:{x:y[z],y:y[z+1]},legs:y[z+2],hold:phases![k]?Math.max(g.hold,f.geometry[k].d):g.hold,slipping:phases![k],
      point:{x:y[6]+f.geometry[k].rbx,y:y[7]+f.geometry[k].rby},impulse:{x:y[j],y:y[j+1]},moment:{x:y[j+2],y:y[j+3]},
      angularImpulse:[y[j+4],y[j+5]],angularMoment:[y[j+6],y[j+7]],bodyWork:y[j+8],dose:y[j+9],normalImpulse:y[j+10],tangentImpulse:y[j+11]};}),
    footOffset:{x:y[FOOT],y:y[FOOT+1]},motorWork:y[MW],bodyWork:work(y),passiveWork:work(y)-y[MW],...balance(y),partitions,evaluations,error,statistics,method,
    eventTimes,eventResiduals,rootIterations,initialPartitions,stabilityRate};
  let representationError=0;
  for(let i=0;i<N;i++){
    let jx=0,jy=0,qx=0,qy=0,ja=0,qa=0;
    for(let k=0;k<M;k++){
      const g=grips[k],v=result.grips[k];
      if(g.holder===i){jx-=v.impulse.x;jy-=v.impulse.y;qx-=v.moment.x;qy-=v.moment.y;ja+=v.angularImpulse[0];qa+=v.angularMoment[0];}
      if(i===1){jx+=v.impulse.x;jy+=v.impulse.y;qx+=v.moment.x;qy+=v.moment.y;ja+=v.angularImpulse[1];qa+=v.angularMoment[1];}
    }
    const p=bodies[i],v=result.bodies[i];representationError=Math.max(representationError,
      Math.abs(v.pos.x-p.pos.x-p.vel.x*H-qx/p.mass),Math.abs(v.pos.y-p.pos.y-p.vel.y*H-qy/p.mass),
      Math.abs(v.vel.x-p.vel.x-jx/p.mass),Math.abs(v.vel.y-p.vel.y-jy/p.mass),
      Math.abs(v.spin-p.spin-ja/p.inertia),Math.abs(v.facing-p.facing-p.spin*H-qa/p.inertia));
  }
  if(representationError>=1e-10||result.grips.some((g,k)=>g.dose>grips[k].capacity*H+1e-9))throw new RangeError('Shared-grip representation/budget');
  return {...result,representationError};
}
