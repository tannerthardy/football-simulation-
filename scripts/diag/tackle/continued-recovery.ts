/** Diagnostic reduced support response. Production does not import this file.
 * xi' = w*(xi - bounded ankle/hip target) - achieved placement + source.
 * The old inner decay asks for target=2*xi. Clip that target to the EXISTING
 * base, rather than doubling its available moment near the old boundary.
 * A started step continues until that inner request fits inside the base;
 * its existing speed ramp winds down geometrically, with no added timer.
 */
import type { Vec2 } from '../../../src/core/vec.js';

export interface RecoveryState { xi:Vec2; response:number }
export interface RecoveryLoad {
  rb:number; w:number; speed:number; capacity:number; mobility:number;
  latency:number; force:Vec2; source:Vec2;
}
export interface RecoveryFlow {
  state:RecoveryState; requested:Vec2; achieved:Vec2; work:number;
  commandWork:number; dissipation:number;
  peakCommandForce:number; peakAnkleTarget:number; evaluations:number; error:number;
}

export function recoveryControl(state:RecoveryState,a:RecoveryLoad){
  const e=Math.hypot(state.xi.x,state.xi.y),n=e>1e-15?{x:state.xi.x/e,y:state.xi.y/e}:{x:0,y:0};
  const ankle=Math.min(2*e,a.rb);
  const active=e>a.rb/2&&(state.response>0||e>a.rb);
  const readiness=active?Math.min(1,Math.max(0,state.response/a.latency)):0;
  const speed=Math.min(a.speed,a.mobility*a.capacity);
  const gain=Math.min(1,Math.max(0,2*e/a.rb-1));
  let u=speed*readiness*gain;
  const forceAlong=a.force.x*n.x+a.force.y*n.y;
  if(a.mobility>0&&forceAlong>0){
    // Passive assistance can exceed free speed. Derate the active command
    // if necessary; the existing capacity*speed power ceiling still applies.
    const power=a.capacity*speed;
    const forceLimit=2*power/(a.mobility*(Math.sqrt(forceAlong*forceAlong+4*power/a.mobility)+forceAlong));
    u=Math.min(u,a.mobility*forceLimit);
  }
  const requested={x:n.x*u,y:n.y*u};
  const achieved={x:requested.x+a.mobility*a.force.x,y:requested.y+a.mobility*a.force.y};
  return {requested,achieved,ankleTarget:{x:n.x*ankle,y:n.y*ankle},
    rate:{x:a.w*(state.xi.x-n.x*ankle)-achieved.x+a.source.x,
      y:a.w*(state.xi.y-n.y*ankle)-achieved.y+a.source.y},
    responseRate:active&&state.response<a.latency?1:0,
    commandForce:a.mobility>0?u/a.mobility:0,
    commandPower:a.mobility>0?(requested.x*achieved.x+requested.y*achieved.y)/a.mobility:0,
    dissipatedPower:a.mobility>0?(achieved.x*achieved.x+achieved.y*achieved.y)/a.mobility:0};
}

/** Embedded step-doubling integrates the automatic support response only;
 * it never subdivides World/contact/locomotion integration. Frozen loads and
 * capacities, explicit error and evaluation count, no silent fallback.
 * Ordinary inner-base response has its original exact exponential path.
 */
export function integrateContinuedRecovery(initial:RecoveryState,a:RecoveryLoad,h:number,tolerance=1e-12):RecoveryFlow{
  if(!(h>=0&&a.rb>0&&a.w>0&&a.latency>0&&a.speed>=0&&a.capacity>=0&&a.mobility>=0))throw Error('Invalid recovery inputs');
  const f={x:a.source.x-a.mobility*a.force.x,y:a.source.y-a.mobility*a.force.y};
  const decay=Math.exp(-a.w*h),weight=-Math.expm1(-a.w*h)/a.w;
  const end={x:initial.xi.x*decay+f.x*weight,y:initial.xi.y*decay+f.y*weight};
  if(Math.max(Math.hypot(initial.xi.x,initial.xi.y),Math.hypot(end.x,end.y))<=a.rb/2){
    return {state:{xi:end,response:0},requested:{x:0,y:0},
      achieved:{x:a.mobility*a.force.x*h,y:a.mobility*a.force.y*h},
      work:-a.mobility*(a.force.x*a.force.x+a.force.y*a.force.y)*h,
      commandWork:0,dissipation:a.mobility*(a.force.x*a.force.x+a.force.y*a.force.y)*h,
      peakCommandForce:0,peakAnkleTarget:2*Math.max(Math.hypot(initial.xi.x,initial.xi.y),Math.hypot(end.x,end.y)),evaluations:0,error:0};
  }
  // State and placement integrals; external motor work follows their SAME
  // achieved motion. Motor presence is not an input to this common law.
  let y=[initial.xi.x,initial.xi.y,Math.max(0,Math.min(a.latency,initial.response)),0,0,0,0];
  let t=0,step=h,evaluations=0,maxError=0,peakCommandForce=0,peakAnkleTarget=0;
  const rhs=(v:number[])=>{
    evaluations++;
    const c=recoveryControl({xi:{x:v[0],y:v[1]},response:v[2]},a);
    peakCommandForce=Math.max(peakCommandForce,c.commandForce);
    peakAnkleTarget=Math.max(peakAnkleTarget,Math.hypot(c.ankleTarget.x,c.ankleTarget.y));
    return [c.rate.x,c.rate.y,c.responseRate,c.requested.x,c.requested.y,c.commandPower,c.dissipatedPower];
  };
  const rk=(v:number[],dt:number)=>{
    const add=(r:number[],s:number)=>v.map((x,i)=>x+s*r[i]);
    const k1=rhs(v),k2=rhs(add(k1,dt/2)),k3=rhs(add(k2,dt/2)),k4=rhs(add(k3,dt));
    return v.map((x,i)=>x+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
  };
  for(let count=0;t<h&&count<8192;count++){
    step=Math.min(step,h-t);
    const coarse=rk(y,step),middle=rk(y,step/2),fine=rk(middle,step/2);
    const errors=fine.map((x,i)=>Math.abs(x-coarse[i])/15);
    const error=Math.max(...errors);
    // Work is measured in much larger units than xi and response time. Its
    // scale must not loosen the error bound on a base/latency crossing.
    const ratio=Math.max(...errors.map((e,i)=>e/(tolerance*Math.max(1,Math.abs(fine[i])))));
    if(ratio>1){step*=.5;if(step<1e-14)throw Error('Recovery response cannot resolve event');continue;}
    y=fine;t+=step;maxError=Math.max(maxError,error);
    y[2]=Math.hypot(y[0],y[1])<=a.rb/2?0:Math.min(a.latency,Math.max(0,y[2]));
    if(ratio<1/32)step*=2;
  }
  if(t<h-1e-14)throw Error('Recovery response evaluation limit');
  const requested={x:y[3],y:y[4]},achieved={x:requested.x+a.mobility*a.force.x*h,y:requested.y+a.mobility*a.force.y*h};
  return {state:{xi:{x:y[0],y:y[1]},response:y[2]},requested,achieved,
    work:-(a.force.x*achieved.x+a.force.y*achieved.y),commandWork:y[5],dissipation:y[6],
    peakCommandForce,peakAnkleTarget,evaluations,error:maxError};
}
