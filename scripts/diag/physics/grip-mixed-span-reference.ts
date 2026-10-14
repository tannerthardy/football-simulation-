/** Independent SPD force + uniform RK4, no candidate force/step/World calls.
 * Physical coordinates/ODE are shared and explicitly part of the protocol.
 */
import type {BoundedGripInput} from './grip-force-bounded.js';
import {mixedSpanModel} from './grip-mixed-span-model.js';
import {spanReferenceForce} from './grip-mixed-span-reference-force.js';
export function mixedSpanReference(input:BoundedGripInput,n:number){
  if(!Number.isInteger(n)||n<1||n>4096)throw new RangeError('Mixed span reference budget');
  const model=mixedSpanModel(input,spanReferenceForce,4*n+2),h=input.duration/n;
  let y=model.initial.slice();
  const add=(f:number[],scale:number)=>y.map((v,i)=>v+scale*f[i]);
  for(let k=0;k<n;k++){
    const a=model.derivative(y),b=model.derivative(add(a,h/2)),c=model.derivative(add(b,h/2)),d=model.derivative(add(c,h));
    y=y.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);
  }
  return {...model.result(y),partitions:n};
}
