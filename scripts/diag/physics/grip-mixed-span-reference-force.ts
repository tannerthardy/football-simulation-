/** Independent normal-halfplane SPD solve. Capacity is a scope certificate,
 * not an alternative saturated allocator. This module does not call the
 * candidate/World force or work limiter. */
import type {SpanForceInput} from './grip-mixed-span-force.js';
export function spanReferenceForce(q:SpanForceInput){
  const d=2*.8*(2*Math.PI*6)/q.inverseMass,k=(2*Math.PI*6)**2/q.inverseMass,
    a=q.nn+1/d,b=q.nt,c=q.tt,det=a*c-b*b,g=q.vn+k/d*q.extension;
  if(!Object.values(q).every(Number.isFinite)||q.nn<=0||q.tt<=0||q.nn*q.tt-q.nt*q.nt<=0||q.inverseMass<=0
    ||q.extension<0||q.capacity<=0||det<=0)throw new RangeError('Span reference force input');
  let normal=(b*q.vt-c*g)/det,tangent=(b*g-a*q.vt)/det;
  if(normal>0){normal=0;tangent=-q.vt/c;}
  if(Math.hypot(normal,tangent)>=.98*q.capacity)throw new RangeError('Span reference cap boundary');
  return {normal,tangent};
}
