/** Bounded cap/slip continuation of the native zero-tension tangent field.
 * No new force law: the native tangent row clips against the existing cap.
 * Both cap and 98%-capacity slide exits split the complete state. */
import type {ActiveGripInput} from '../../../src/physics/active-grip.js';
import {nativeSpanModel,nativeReel,type NativeSlipPhase} from './grip-native-span-model.js';
import {pressureGeometry} from './grip-pressure-rate.js';
import {spanKernelTrial} from './grip-span-kernel-trial.js';
import type {SpanForceProvider} from './grip-mixed-span-model.js';
import {nativeSpanDifference} from './grip-native-span-model.js';
import {nativeSpanInterval} from './grip-native-span-interval.js';
import {nativeCenteredReference} from './grip-native-centered-reference.js';
import {nativeReelEventReference} from './grip-native-reel-reference.js';
const tangent:SpanForceProvider=q=>({normal:0,tangent:Math.max(-q.capacity,Math.min(q.capacity,-q.vt/q.tt))});
// Separate reference arithmetic; no answers or candidate force reuse.
const referenceTangent:SpanForceProvider=q=>{
  const magnitude=Math.abs(q.vt)/q.tt;
  return {normal:0,tangent:-Math.sign(q.vt)*(magnitude>q.capacity?q.capacity:magnitude)};
};
export type SlipEvent={kind:'cap'|'slide';time:number;residual:number};
export function nativeSlipInterval(q:ActiveGripInput,referenceSteps?:number){
  if(referenceSteps!==undefined&&(!Number.isInteger(referenceSteps)||referenceSteps<1||referenceSteps>4096))throw new RangeError('Native slip reference budget');
  const phase:NativeSlipPhase={slipping:false},m=nativeSpanModel(q,referenceSteps?referenceTangent:tangent,nativeReel,referenceSteps?32*referenceSteps+4096:8192,phase),
    gaps=(z:number[])=>{const g=pressureGeometry(q,z),r=Math.abs(g.vt)/g.tt/q.capacity;return {cap:r-1,slide:r-.98};},
    H=q.duration,events:SlipEvent[]=[],initial=gaps(m.initial);
  phase.slipping=initial.slide>1e-13;
  let y=m.initial.slice(),h=referenceSteps?H/referenceSteps:H,pieces=0,rejections=0,roots=0,errorSum=0;
  const step=(z:number[],width:number)=>{
    if(!referenceSteps)return spanKernelTrial(z,width,m.derivative,undefined,true);
    const add=(f:number[],s:number)=>z.map((v,i)=>v+s*f[i]),a=m.derivative(z),b=m.derivative(add(a,width/2)),c=m.derivative(add(b,width/2)),d=m.derivative(add(c,width));
    const state=z.map((v,i)=>v+width*(a[i]+2*b[i]+2*c[i]+d[i])/6);
    return {state,error:0};
  };
  // This scope follows one monotone cap/slide exit. Entry, reversal or reel
  // onset refuses the whole proposal; World retains its native fallback.
  let cap=initial.cap>1e-13,slide=phase.slipping;
  while(y[32]<H-1e-17){
    if(++pieces>(referenceSteps?referenceSteps+16:256))throw new RangeError('Native slip piece budget');
    let width=Math.min(h,H-y[32]),accepted=false;
    for(let retry=0;retry<24;retry++){
      let trial:ReturnType<typeof step>,event:SlipEvent|undefined;
      try{trial=step(y,width);}catch(e){
        if(referenceSteps||!(e instanceof RangeError)||e.message!=='Native span cap/target/power scope')throw e;
        width/=2;rejections++;continue;
      }
      const start=gaps(y),end=gaps(trial.state),kind=cap&&end.cap<0?'cap':slide&&end.slide<0?'slide':undefined;
      if(kind){
        let lo=0,hi=width,z=trial,solved=false,loGap=start[kind],hiGap=end[kind],priorT:number|undefined,priorGap=0,
          t=referenceSteps?width/2:width*loGap/(loGap-hiGap);
        for(let r=0;r<48;r++){
          roots++;z=step(y,t);const gap=gaps(z.state)[kind];
          if(Math.abs(gap)<=1e-13||hi-lo<=2e-16){width=t;trial=z;event={kind,time:z.state[32],residual:gap};solved=true;break;}
          if(gap>0){lo=t;loGap=gap;}else{hi=t;hiGap=gap;}
          const slope=priorT===undefined?NaN:(gap-priorGap)/(t-priorT),next=t-gap/slope;
          priorT=t;priorGap=gap;t=referenceSteps?(lo+hi)/2:Number.isFinite(next)&&next>lo&&next<hi?next:lo+(hi-lo)*loGap/(loGap-hiGap);
        }
        if(!solved)throw new RangeError('Native slip root budget');
      }else if((!cap&&end.cap>1e-11)||(!slide&&end.slide>1e-11)||start.cap>1e-11&&!cap)throw new RangeError('Native slip reentry');
      const budget=width/H/32;
      if(trial.error<=budget){
        errorSum+=trial.error;if(errorSum>1/32)throw new RangeError('Native slip summed error');
        y=trial.state;accepted=true;
        if(event){events.push(event);if(event.kind==='cap')cap=false;else phase.slipping=slide=false;}
      if(!referenceSteps)h=width*Math.min(3,Math.max(.5,.85*Math.max(trial.error/budget,1e-16)**(-1/8)));
        break;
      }
      width*=Math.max(.1,.85*Math.max(trial.error/budget,1e-16)**(-1/8));rejections++;
      if(!(width>0)||y[32]+width===y[32])throw new RangeError('Native slip step underflow');
    }
    if(!accepted)throw new RangeError('Native slip retry budget');
  }
  const r=m.result(y);
  if(Math.abs(r.workResidual)>1e-8||Math.abs(r.spanResidual)>1e-9||Math.abs(r.energyResidual)>1e-8||Math.abs(r.angularResidual)>1e-7
    ||r.representationError>1e-10||r.dose>q.capacity*H+1e-12||Math.abs(r.motorCompositionResidual)>1e-10)throw new RangeError('Native slip accounting', {cause:{work:r.workResidual,span:r.spanResidual,energy:r.energyResidual,angular:r.angularResidual,representation:r.representationError,dose:r.dose,events}});
  return {...r,tangentSlip:{time:y[49],legImpulse:{x:y[50],y:y[51]}},slideTime:y[49],partitions:pieces,events,rootIterations:roots,rejections,error:errorSum};
}
/** Translation is a reference precision control, not a changed physical law. */
export function nativeSlipReference(input:ActiveGripInput,n:number){
  const q=structuredClone(input),origin={...q.a.pos};for(const p of [q.a,q.b]){p.pos.x-=origin.x;p.pos.y-=origin.y;}
  const r=nativeSlipInterval(q,n);for(const p of [r.a.pos,r.b.pos,r.point]){p.x+=origin.x;p.y+=origin.y;}
  const G={x:q.ground[0].force.x+q.ground[1].force.x,y:q.ground[0].force.y+q.ground[1].force.y};
  r.externalAngularImpulse+=(origin.x*G.y-origin.y*G.x)*q.duration;
  const L=(p:typeof q.a)=>p.mass*(p.pos.x*p.vel.y-p.pos.y*p.vel.x)+p.inertia*p.spin;
  r.angularResidual=L(r.a)+L(r.b)-L(input.a)-L(input.b)-r.externalAngularImpulse;return r;
}
/** Existing below-slip branch stays byte-for-byte the same numerical method.
 * Select the new contract only when the actual input begins at tangent slip. */
export function nativeTransitionInterval(q:ActiveGripInput,n?:number,reelEvents=false){
  const y=[q.a.pos.x,q.a.pos.y,q.a.vel.x,q.a.vel.y,q.a.spin,q.a.facing,q.b.pos.x,q.b.pos.y,q.b.vel.x,q.b.vel.y,q.b.spin,q.b.facing,
    q.material.x,q.material.y,q.footOffset.x,q.footOffset.y,...Array(11).fill(0),q.legs],g=pressureGeometry(q,y);
  if(Math.abs(g.vt)/g.tt>=.98*q.capacity&&nativeReel(q,g)===0)return n?nativeSlipReference(q,n):nativeSlipInterval(q);
  return n?(reelEvents?nativeReelEventReference(q,n):nativeCenteredReference(q,n)):nativeSpanInterval(q);
}
export function nativeSlipDifference(a:ReturnType<typeof nativeSlipInterval>,b:ReturnType<typeof nativeSlipInterval>){
  if(a.slipping!==b.slipping||a.events.length!==b.events.length||a.events.some((v,i)=>v.kind!==b.events[i].kind))return Infinity;
  return Math.max(nativeSpanDifference(a,b),Math.abs(a.legs-b.legs)/1e-9,Math.abs(a.slideTime-b.slideTime)/1e-12,
    Math.hypot(a.tangentSlip.legImpulse.x-b.tangentSlip.legImpulse.x,a.tangentSlip.legImpulse.y-b.tangentSlip.legImpulse.y)/1e-9,
    ...a.events.map((e,i)=>Math.abs(e.time-b.events[i].time)/1e-12));
}
