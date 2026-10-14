/** Bounded local DOP853 integration of PR40's unchanged physical field.
 * A force reversal splits the whole state, not only its dose counter. All
 * local error estimates share one finite budget; final physical gates remain.
 */
import type {BoundedGripInput} from './grip-force-bounded.js';
import {mixedSpanModel,SPAN} from './grip-mixed-span-model.js';
import {spanEventForce} from './grip-span-event-force.js';
import {spanExplicitTrial} from './grip-span-dop853.js';
export function spanEventInterval(input:BoundedGripInput){
  const m=mixedSpanModel(input,spanEventForce(1/input.a.mass+1/input.b.mass),4096),H=input.duration,floor=1e-9/(128*H),
    events:Array<{time:number;residual:number}>=[],refusals:Array<{time:number;width:number;reason:string}>=[];
  let y=m.initial.slice(),start=m.derivative(y),h=H,errorSum=0,pieces=0,roots=0,rejections=0,sign=Math.sign(start[SPAN.TJ]),atRoot=false;
  while(y[SPAN.TIME]<H-1e-17){
    if(++pieces>256)throw new RangeError('Span event piece budget');h=Math.min(h,H-y[SPAN.TIME]);let accepted=false;
    for(let retry=0;retry<24;retry++){
      let trial:ReturnType<typeof spanExplicitTrial>;
      let event:{time:number;residual:number}|undefined;
      try{
        trial=spanExplicitTrial(y,h,m.derivative,start);
        if(!atRoot&&Math.abs(start[SPAN.TJ])>floor)sign=Math.sign(start[SPAN.TJ]);
        if(sign!==0&&sign*trial.end[SPAN.TJ]<-floor){
          if(events.length>=4)throw new RangeError('Span event count budget');
          let lo=0,hi=h,loGap=sign*start[SPAN.TJ],hiGap=sign*trial.end[SPAN.TJ],t=h*loGap/(loGap-hiGap),priorT:number|undefined,priorGap=0,solved=false;
          if(!(loGap>0)||!Number.isFinite(t)||t<=0||t>=h)throw new RangeError('Span event root budget');
          for(let r=0;r<12;r++){
            roots++;const root=spanExplicitTrial(y,t,m.derivative,start),gap=sign*root.end[SPAN.TJ];
            if(Math.abs(gap/input.capacity)<=1e-12||hi-lo<=1e-14){trial=root;h=t;event={time:root.state[SPAN.TIME],residual:gap/input.capacity};solved=true;break;}
            if(gap>0){lo=t;loGap=gap;}else{hi=t;hiGap=gap;}
            const slope=priorT===undefined?NaN:(gap-priorGap)/(t-priorT),next=t-gap/slope;
            priorT=t;priorGap=gap;t=Number.isFinite(next)&&next>lo&&next<hi?next:lo+(hi-lo)*loGap/(loGap-hiGap);
          }
          if(!solved)throw new RangeError('Span event root budget');
        }
      }catch(e){
        if(!(e instanceof RangeError)||!['Mixed span cap/target/power scope','Mixed span geometry/rest event','Span event root budget'].includes(e.message))throw e;
        refusals.push({time:y[SPAN.TIME],width:h,reason:e.message});h/=2;rejections++;continue;
      }
      const budget=h/H/32;
      if(trial.error<=budget){
        errorSum+=trial.error;if(errorSum>1/32)throw new RangeError('Span event summed error budget');
        y=trial.state;start=trial.end;accepted=true;
        atRoot=Boolean(event);if(event){events.push(event);sign*=-1;}
        h*=Math.min(3,Math.max(.5,.85*Math.max(trial.error/budget,1e-16)**(-1/8)));break;
      }
      h*=Math.max(.1,.85*Math.max(trial.error/budget,1e-16)**(-1/8));rejections++;
      if(!(h>0)||y[SPAN.TIME]+h===y[SPAN.TIME])throw new RangeError('Span event underflow');
    }
    if(!accepted)throw new RangeError('Span event retry budget');
  }
  const r=m.result(y);
  if(Math.abs(r.workResidual)>1e-8||Math.abs(r.spanResidual)>1e-9||Math.abs(r.energyResidual)>1e-8||Math.abs(r.angularResidual)>1e-7
    ||r.representationError>1e-10||r.dose>input.capacity*H+1e-12||Math.abs(r.motorCompositionResidual)>1e-10)
    throw new RangeError('Span event physical acceptance');
  return {...r,partitions:pieces,error:errorSum,events,rootIterations:roots,rejections,refusals};
}
