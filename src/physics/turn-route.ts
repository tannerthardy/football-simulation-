/** Experimental controller route objective only: minimum time to a heading at rest for a
 * bounded angular double integrator. No new torque or execution law. */
export function signedAngle(delta:number){let d=delta%(2*Math.PI);if(d>Math.PI)d-=2*Math.PI;if(d< -Math.PI)d+=2*Math.PI;return d;}
export function boundedArrival(displacement:number,spin:number,acceleration:number,rate:number){
  if(![displacement,spin,acceleration,rate].every(Number.isFinite)||acceleration<=0||rate<=0||Math.abs(spin)>rate)throw new RangeError('Turn-route estimator scope');
  let best=Infinity;
  for(const sign of [-1,1]){
    const q=sign*acceleration*displacement+spin*spin/2;if(q<0)continue;
    const peak=Math.sqrt(q),first=(peak-sign*spin)/acceleration;
    if(first< -1e-14)continue;
    if(peak<=rate)best=Math.min(best,Math.max(0,first)+peak/acceleration);
    else{
      const cruise=(sign*displacement-(2*rate*rate-spin*spin)/(2*acceleration))/rate;
      if(cruise>=-1e-14)best=Math.min(best,(rate-sign*spin)/acceleration+Math.max(0,cruise)+rate/acceleration);
    }
  }
  return best;
}
export function turnRoute(delta:number,spin:number,acceleration:number,rate:number){
  const shortest=signedAngle(delta);
  if(![delta,spin,acceleration,rate].every(Number.isFinite)||acceleration<=0||rate<=0||Math.abs(spin)>rate)
    return {delta:shortest,shortest,estimated:undefined,candidates:[],fallback:true};
  const candidates=[shortest,shortest+2*Math.PI,shortest-2*Math.PI].map(d=>({delta:d,time:boundedArrival(d,spin,acceleration,rate)}));
  // Keep the original shortest direction on a genuine numerical tie.
  const best=candidates.reduce((a,b)=>b.time<a.time-1e-13*Math.max(1,a.time,b.time)?b:a);
  return {delta:best.delta,shortest,estimated:best.time,candidates,fallback:false};
}
