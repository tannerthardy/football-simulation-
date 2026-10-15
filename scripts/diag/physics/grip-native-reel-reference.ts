/** Optional refinement of the preserved native reference: split at existing
 * reel demand zero. Independent RK4, SPD force and normal-demand arithmetic.
 * No candidate values, new force law or altered accuracy tolerances. */
import type {ActiveGripInput} from '../../../src/physics/active-grip.js';
import {nativeSpanModel,type ReelProvider} from './grip-native-span-model.js';
import {spanReferenceForce} from './grip-mixed-span-reference-force.js';
const reel:ReelProvider=(q,g)=>{
  if(!(q.pullSpeed>0))return 0;
  const cross=g.nx*g.rby-g.ny*g.rbx,body=1/q.a.mass+1/q.b.mass+cross*cross/q.b.inertia,
    foot=q.mobility*(g.jnx*g.jnx+g.jny*g.jny),request=Math.max(0,g.vn+Math.min(q.pullSpeed,3));
  return Math.min(q.capacity,q.armCapacity,request/(foot+q.tickDuration*body));
};
export function nativeReelEventReference(input:ActiveGripInput,n:number){
  if(!Number.isInteger(n)||n<1||n>4096)throw new RangeError('Reel reference budget');
  const q=structuredClone(input),origin={...q.a.pos};for(const p of [q.a,q.b]){p.pos.x-=origin.x;p.pos.y-=origin.y;}
  const m=nativeSpanModel(q,spanReferenceForce,reel,16*n+4096),H=q.duration,
    gap=(y:number[])=>m.frame(y).vn+Math.min(q.pullSpeed,3),events:Array<{kind:'reel';time:number;residual:number}>=[];
  let y=m.initial.slice();
  const step=(z:number[],h:number)=>{const add=(f:number[],s:number)=>z.map((v,i)=>v+s*f[i]),a=m.derivative(z),b=m.derivative(add(a,h/2)),c=m.derivative(add(b,h/2)),d=m.derivative(add(c,h));
    return z.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);};
  let entered=gap(y)>=0;
  for(let k=0;k<n;k++){
    const end=(k+1)*H/n;
    for(let count=0;y[32]<end-1e-17;count++){
      if(count>4)throw new RangeError('Reel reference event budget');
      const h=end-y[32];let z=step(y,h);
      if(!entered&&gap(z)>0){
        let lo=0,hi=h,solved=false;
        for(let r=0;r<48;r++){
          const t=(lo+hi)/2;z=step(y,t);const e=gap(z);
          if(Math.abs(e)<1e-13||hi-lo<=2e-16){events.push({kind:'reel',time:z[32],residual:e});entered=true;solved=true;break;}
          if(e<0)lo=t;else hi=t;
        }
        if(!solved)throw new RangeError('Reel reference root budget');
      }
      y=z;
    }
  }
  const r=m.result(y);for(const p of [r.a.pos,r.b.pos,r.point]){p.x+=origin.x;p.y+=origin.y;}
  const G={x:q.ground[0].force.x+q.ground[1].force.x,y:q.ground[0].force.y+q.ground[1].force.y};
  r.externalAngularImpulse+=(origin.x*G.y-origin.y*G.x)*H;
  const L=(p:typeof q.a)=>p.mass*(p.pos.x*p.vel.y-p.pos.y*p.vel.x)+p.inertia*p.spin;
  r.angularResidual=L(r.a)+L(r.b)-L(input.a)-L(input.b)-r.externalAngularImpulse;
  return {...r,events,partitions:n};
}
