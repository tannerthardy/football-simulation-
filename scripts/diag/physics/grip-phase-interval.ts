/** Event-local diagnostic integration of one initial cap/slip exit in a
 * shared passive graph. Existing 100% force cap and 98% sliding marker; no
 * altered grip, recovery or effort law. Never inserted into World. */
import type {SharedGripInput} from './grip-force-shared.js';
import {phaseModel} from './grip-phase-model.js';
import {phaseGripForce} from './grip-phase-force.js';
import {sharedExplicitStep} from './grip-shared-explicit.js';
export type PhaseMotion=ReturnType<ReturnType<typeof phaseModel>['result']>;
export function phaseDifference(a:PhaseMotion,b:PhaseMotion){
  const norm=(x:{x:number;y:number},y:{x:number;y:number})=>Math.hypot(x.x-y.x,x.y-y.y);
  return Math.max(...a.bodies.flatMap((x,k)=>{const y=b.bodies[k];return [norm(x.pos,y.pos)/5e-10,norm(x.vel,y.vel)/2.5e-8,
    Math.abs(x.facing-y.facing)/2.5e-9,Math.abs(x.spin-y.spin)/2.5e-7];}),
    norm(a.footOffset,b.footOffset)/5e-10,...a.grips.flatMap((x,k)=>{const y=b.grips[k];return [norm(x.material,y.material)/5e-10,
      norm(x.point,y.point)/5e-10,Math.abs(x.legs-y.legs)/1e-9,Math.abs(x.hold-y.hold)/5e-10,
      norm(x.impulse,y.impulse)/5e-10,norm(x.moment,y.moment)/5e-10,Math.abs(x.dose-y.dose)/1e-9,
      Math.abs(x.slipDuration-y.slipDuration)/2e-11,Math.abs(x.bodyWork-y.bodyWork)/1e-9,
      ...x.angularImpulse.map((v,i)=>Math.abs(v-y.angularImpulse[i])/1e-9),...x.angularMoment.map((v,i)=>Math.abs(v-y.angularMoment[i])/1e-9)];}),
    ...(['bodyWork','motorWork','passiveWork'] as const).map(k=>Math.abs(a[k]-b[k])/1e-9));
}
export function passivePhaseInterval(input:SharedGripInput,reuseFrames=true){
  const model=phaseModel(input,phaseGripForce,4096,reuseFrames),first=model.frame(model.initial),phase0=first.slipping,
    active=phase0.flatMap((v,k)=>v?[k]:[]);
  if(active.length>1)throw new RangeError('Passive phase initial graph');
  const member=active[0],specs:Array<{kind:'cap'|'slip'|'zero';member:number;sign:number}>=[];
  if(member!==undefined){const sign=Math.sign(first.force[member]);if(model.marker(model.initial,member,sign,'cap')>0)specs.push({kind:'cap',member,sign});
    specs.push({kind:'slip',member,sign});}
  first.force.forEach((f,k)=>{if(input.grips[k].capacity>0&&f!==0)specs.push({kind:'zero',member:k,sign:Math.sign(f)});});
  let roots=0;
  function solve(n:number){
    let y=model.initial.slice();const phase=phase0.slice(),events:Array<{kind:'cap'|'slip'|'zero';member:number;time:number;residual:number}>=[],
      pending=specs.map(()=>true);
    const step=(z:number[],h:number)=>sharedExplicitStep(z,h,v=>model.derivative(v,phase,true));
    for(let k=0;k<n;k++){
      const end=(k+1)*input.duration/n;
      for(let pieces=0;model.time(y)<end-1e-17;pieces++){
        if(pieces>specs.length)throw new RangeError('Passive phase piece budget');
        const start=model.time(y),trial=step(y,end-start);
        const crossed=specs.flatMap((spec,j)=>pending[j]&&model.marker(y,spec.member,spec.sign,spec.kind)>0
          &&model.marker(trial,spec.member,spec.sign,spec.kind)<=0?[j]:[]);
        if(!crossed.length){y=trial;break;}
        const found:Array<{index:number;time:number;gap:number;state:number[]}>=[];
        for(const index of crossed){
          const spec=specs[index],s=model.marker(y,spec.member,spec.sign,spec.kind),f=model.marker(trial,spec.member,spec.sign,spec.kind);
          let lo=start,hi=end,t=start+(end-start)*s/(s-f),priorTime:number|undefined,priorGap=0,solved=false;
          for(let retry=0;retry<12;retry++){
            roots++;const z=step(y,t-start),gap=model.marker(z,spec.member,spec.sign,spec.kind);
            if(Math.abs(gap)<=1e-11){found.push({index,time:t,gap,state:z});solved=true;break;}
            if(gap>0)lo=t;else hi=t;
            const slope=priorTime===undefined?NaN:(gap-priorGap)/(t-priorTime),secant=t-gap/slope;
            priorTime=t;priorGap=gap;t=Number.isFinite(secant)&&secant>lo&&secant<hi?secant:(lo+hi)/2;
          }
          if(!solved)throw new RangeError('Passive phase root budget');
        }
        const earliest=found.reduce((a,b)=>a.time<b.time?a:b),spec=specs[earliest.index];
        y=earliest.state;events.push({kind:spec.kind,member:spec.member,time:earliest.time,residual:earliest.gap});pending[earliest.index]=false;
        if(spec.kind==='slip')phase[spec.member]=false;
      }
    }
    return {...model.result(y,phase),events,partitions:n,rootIterations:roots};
  }
  let previous:ReturnType<typeof solve>|undefined;
  for(const n of [2,4,8,16,32,64,128,256]){
    let r:ReturnType<typeof solve>;try{r=solve(n);}catch(e){if(!(e instanceof RangeError))throw e;previous=undefined;continue;}
    if(previous){const error=phaseDifference(previous,r);
      if(error<=1/16&&Math.abs(r.workResidual)<=1e-8&&Math.abs(r.angularResidual)<=1e-7&&r.representationError<=1e-10
        &&r.linearResidual<=1e-10&&r.passiveWork<=1e-9&&r.grips.every((g,k)=>g.dose<=input.grips[k].capacity*input.duration+1e-12))return {...r,error};}
    previous=r;
  }
  throw new RangeError('Passive phase scope/refinement budget');
}
