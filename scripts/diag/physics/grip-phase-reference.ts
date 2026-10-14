/** Independent box forces + RK4 and bracket bisection. No direct force solver,
 * DOP853 or candidate root/refinement routine. Shared coordinates/ODE only. */
import type {SharedGripInput} from './grip-force-shared.js';
import {phaseModel} from './grip-phase-model.js';
import {phaseBoxReference} from './grip-phase-box-reference.js';
import type {SharedGripFrame} from './grip-shared-law.js';
const referenceForce=(g:SharedGripFrame[],mu:number)=>{
  if(g.length===2)return phaseBoxReference(g,mu);
  const v=g[0],jx=-v.xx*v.ny+v.xy*v.nx,jy=-v.xy*v.ny+v.yy*v.nx,M=mu*(jx*jx+jy*jy),
    force=[Math.max(-v.capacity,Math.min(v.capacity,-v.vt/M))],load={x:jx*force[0],y:jy*force[0]},velocity={x:mu*load.x,y:mu*load.y},
    normalVelocity=[v.vn+(v.xx*v.nx+v.xy*v.ny)*velocity.x+(v.xy*v.nx+v.yy*v.ny)*velocity.y];
  return {force,velocity,normalVelocity,passivePower:force[0]*v.vt+mu*(load.x**2+load.y**2)};
};
export function passivePhaseReference(input:SharedGripInput,partitions:number){
  if(!Number.isInteger(partitions)||partitions<1||partitions>512)throw new RangeError('Phase reference budget');
  const model=phaseModel(input,referenceForce),initial=model.frame(model.initial),phase=initial.slipping.slice(),
    active=phase.flatMap((v,k)=>v?[k]:[]),events:Array<{kind:'cap'|'slip'|'zero';member:number;time:number;residual:number}>=[];
  if(active.length>1)throw new RangeError('Phase reference initial graph');
  const member=active[0],specs:Array<{kind:'cap'|'slip'|'zero';member:number;sign:number}>=[];
  if(member!==undefined){const sign=Math.sign(initial.force[member]);if(model.marker(model.initial,member,sign,'cap')>0)specs.push({kind:'cap',member,sign});
    specs.push({kind:'slip',member,sign});}
  initial.force.forEach((f,k)=>{if(input.grips[k].capacity>0&&f!==0)specs.push({kind:'zero',member:k,sign:Math.sign(f)});});
  const pending=specs.map(()=>true);let y=model.initial.slice(),roots=0;
  const step=(z:number[],h:number)=>{
    const add=(v:number[],t:number)=>z.map((x,k)=>x+t*v[k]),a=model.derivative(z,phase),b=model.derivative(add(a,h/2),phase),
      c=model.derivative(add(b,h/2),phase),d=model.derivative(add(c,h),phase);
    return z.map((v,k)=>v+h*(a[k]+2*b[k]+2*c[k]+d[k])/6);
  };
  for(let k=0;k<partitions;k++){
    const end=(k+1)*input.duration/partitions;
    for(let pieces=0;model.time(y)<end-1e-17;pieces++){
      if(pieces>specs.length)throw new RangeError('Phase reference piece budget');
      const start=model.time(y),trial=step(y,end-start);
      const crossed=specs.flatMap((spec,j)=>pending[j]&&model.marker(y,spec.member,spec.sign,spec.kind)>0
        &&model.marker(trial,spec.member,spec.sign,spec.kind)<=0?[j]:[]);
      if(!crossed.length){y=trial;break;}
      const found:Array<{index:number;time:number;gap:number;state:number[]}>=[];
      for(const index of crossed){
        const spec=specs[index];let lo=0,hi=end-start;
        for(let retry=0;retry<40;retry++){
          roots++;const h=(lo+hi)/2,z=step(y,h),gap=model.marker(z,spec.member,spec.sign,spec.kind);
          if(gap>0)lo=h;else hi=h;
          if(hi-lo<=1e-14||Math.abs(gap)<=1e-12){found.push({index,time:start+h,gap,state:z});break;}
          if(retry===39)throw new RangeError('Phase reference root budget');
        }
      }
      const earliest=found.reduce((a,b)=>a.time<b.time?a:b),spec=specs[earliest.index];
      y=earliest.state;events.push({kind:spec.kind,member:spec.member,time:earliest.time,residual:earliest.gap});pending[earliest.index]=false;
      if(spec.kind==='slip')phase[spec.member]=false;
    }
  }
  const final=model.frame(y);
  if(final.slipping.some((v,k)=>v!==phase[k]&&Math.abs(Math.abs(final.force[k])/input.grips[k].capacity-.98)>1e-9))
    throw new RangeError('Reference renewed phase outside scope');
  return {...model.result(y,phase),events,partitions,rootIterations:roots};
}
