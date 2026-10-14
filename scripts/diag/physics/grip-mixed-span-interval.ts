/** Efficient bounded integration of the already-accounted mixed spring law.
 * Stage motion/material/work/impulse/time moment share one field evaluation.
 * Whole World is never cloned or repeatedly advanced. No saturated fallback.
 */
import type {BoundedGripInput} from './grip-force-bounded.js';
import {spanForce} from './grip-mixed-span-force.js';
import {mixedSpanModel,mixedSpanDifference} from './grip-mixed-span-model.js';
import {sharedExplicitStep} from './grip-shared-explicit.js';
export function mixedSpanInterval(input:BoundedGripInput){
  const model=mixedSpanModel(input,spanForce,4096);
  let prior:ReturnType<typeof model.result>|undefined;
  const refusedTrials:Array<{partitions:number;reason:string}>=[];
  for(const n of [1,2,4,8,16,32,64,128]){
    let y=model.initial.slice();
    try{for(let k=0;k<n;k++)y=sharedExplicitStep(y,input.duration/n,model.derivative);}
    catch(e){
      // A coarse explicit stage can overshoot while the refined physical
      // trajectory stays below cap. Initial scope was checked by the model;
      // retain these trials, refine under the same evaluation bound, and
      // never accept a state that crosses its physical/correctness gates.
      if(!(e instanceof RangeError)||!['Mixed span cap/target/power scope','Mixed span geometry/rest event'].includes(e.message))throw e;
      refusedTrials.push({partitions:n,reason:e.message});prior=undefined;continue;
    }
    const result=model.result(y),error=prior?mixedSpanDifference(prior,result):Infinity;
    if(prior&&error<=1/16&&Math.abs(result.workResidual)<1e-8&&Math.abs(result.spanResidual)<1e-9&&Math.abs(result.energyResidual)<1e-8
      &&Math.abs(result.angularResidual)<1e-7&&result.representationError<1e-10&&result.dose<=input.capacity*input.duration+1e-12)
      return {...result,error,partitions:n,refusedTrials};
    prior=result;
  }
  throw new RangeError('Mixed span accuracy budget');
}
