/** Same elimination as spanForce. The model's unchanged frame guard checks
 * target and power once; this provider checks finite/SPD inputs and cap.
 * Constant spring coefficients are prepared once, not at every RK stage.
 * This is only for mixedSpanModel, never an unguarded World force source.
 */
import type {SpanForceInput} from './grip-mixed-span-force.js';
export function spanEventForce(inverseMass:number){
  if(!Number.isFinite(inverseMass)||inverseMass<=0)throw new RangeError('Mixed span force input');
  const w=2*Math.PI*6,k=w*w/inverseMass,d=2*.8*w/inverseMass;
  return (q:SpanForceInput)=>{
    const {vn,vt,nn,nt,tt,extension:e,capacity:C}=q;
    if(!Number.isFinite(vn)||!Number.isFinite(vt)||!Number.isFinite(nn)||!Number.isFinite(nt)||!Number.isFinite(tt)
      ||!Number.isFinite(e)||!Number.isFinite(C)||q.inverseMass!==inverseMass||nn<=0||tt<=0||nn*tt-nt*nt<=0||e<0||C<=0)
      throw new RangeError('Mixed span force input');
    const reduced=nn-nt*nt/tt,normal=Math.min(0,-(d*(vn-nt*vt/tt)+k*e)/(1+d*reduced)),tangent=-(vt+nt*normal)/tt;
    // Reject an overshooting stage before the model updates its accepted
    // force diagnostics, matching the original provider's guard ordering.
    if(Math.hypot(normal,tangent)>=.98*C)throw new RangeError('Mixed span cap/target/power scope');
    return {normal,tangent};
  };
}
