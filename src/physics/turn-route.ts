/** Experimental controller route objective only: minimum time to a heading at rest for a
 * bounded angular double integrator. No new torque or execution law. */
export function signedAngle(delta:number){let d=delta%(2*Math.PI);if(d>Math.PI)d-=2*Math.PI;if(d< -Math.PI)d+=2*Math.PI;return d;}
/** Mean cruise of the existing unsaturated critical servo when each control
 * tick resets its target rate*tick radians ahead. This is a forecast speed,
 * not a new physical rate cap. Derived from the periodic critical flow. */
export function servoCruiseRate(rate:number,tick:number,response:number){
  if(![rate,tick,response].every(Number.isFinite)||rate<0||tick<=0||response<=0)throw new RangeError('Turn cruise forecast scope');
  const u=tick/response,change=-Math.expm1(-u),decay=Math.exp(-u);
  return rate*change*change/(change+u*decay);
}
export function boundedArrival(displacement:number,spin:number,acceleration:number,rate:number){
  if(![displacement,spin,acceleration,rate].every(Number.isFinite)||acceleration<=0||rate<=0||Math.abs(spin)>rate)throw new RangeError('Turn-route estimator scope');
  return arrivalUnchecked(displacement,spin,acceleration,rate);
}
/** Same arithmetic after the caller has checked the shared route inputs. */
function arrivalUnchecked(displacement:number,spin:number,acceleration:number,rate:number){
  let best=Infinity;
  for(let sign=-1;sign<=1;sign+=2){
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
/** Planning needs only the selected lift. Keep rich candidate records out of
 * the hot path; arithmetic, candidate order and numerical tie rule match above. */
export function turnRouteDelta(delta:number,spin:number,acceleration:number,rate:number){
  const shortest=signedAngle(delta);
  if(!Number.isFinite(delta)||!Number.isFinite(spin)||!Number.isFinite(acceleration)||!Number.isFinite(rate)
    ||acceleration<=0||rate<=0||Math.abs(spin)>rate||spin===0)return shortest;
  let chosen=shortest,best=arrivalUnchecked(shortest,spin,acceleration,rate);
  for(let side=1;side>=-1;side-=2){
    const d=shortest+side*2*Math.PI,time=arrivalUnchecked(d,spin,acceleration,rate);
    if(time<best-1e-13*Math.max(1,best,time)){chosen=d;best=time;}
  }
  return chosen;
}
