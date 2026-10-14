/** Derivative composition without the combined frame object, same PR43 ODE.
 * Exact frame scalars/guards are retained; intermediate RK stages do not need
 * the large combined frame object. The preserved model constructs and checks
 * the final motion/ledger result, including its independent identities.
 */
import type {BoundedGripInput} from './grip-force-bounded.js';
import {mixedSpanModel,SPAN} from './grip-mixed-span-model.js';
import {pressureGeometry} from './grip-pressure-rate.js';
import {spanEventForce} from './grip-span-event-force.js';
export function spanKernelModel(input:BoundedGripInput){
  const {a,b,duration:H,capacity:C,mobility:mu}=input,B=1/a.mass+1/b.mass,w=2*Math.PI*6,k=w*w/B,damping=2*.8*w/B,
    provider=spanEventForce(B),m=mixedSpanModel(input,provider,4096);
  let evaluations=0,maximumTargetResidual=0,maximumCapacityRatio=0,minimumLoss=Infinity;
  function derivative(y:number[]){
    if(++evaluations>4096)throw new RangeError('Mixed span evaluation budget');
    const g=pressureGeometry(input,y),e=Math.max(0,g.d-input.hold),
      q={vn:g.vn,vt:g.vt,nn:g.nn,nt:g.nt,tt:g.tt,inverseMass:B,extension:e,capacity:C},f=provider(q),
      x=g.nx*f.normal-g.ny*f.tangent,z=g.ny*f.normal+g.nx*f.tangent,
      footx=g.xx*x+g.xy*z,footy=g.xy*x+g.yy*z,ux=mu*footx,uy=mu*footy,
      normalVelocity=g.vn+g.nn*f.normal+g.nt*f.tangent,tangentVelocity=g.vt+g.nt*f.normal+g.tt*f.tangent,
      total=Math.hypot(f.normal,f.tangent),target=f.normal+damping*normalVelocity+k*e,
      residual=Math.max(f.normal<0?Math.abs(target)/Math.max(1,Math.abs(f.normal),k*e):Math.max(0,target)/Math.max(1,k*e),
        Math.abs(tangentVelocity)/Math.max(1,Math.abs(g.vt))),loss=-(f.normal+k*e)*normalVelocity-f.tangent*tangentVelocity;
    maximumTargetResidual=Math.max(maximumTargetResidual,residual);maximumCapacityRatio=Math.max(maximumCapacityRatio,total/C);minimumLoss=Math.min(minimumLoss,loss);
    if(g.d>input.reach||g.d<input.hold-1e-12||Math.hypot(y[6]-y[0],y[7]-y[1])<=input.minimumDistance
      ||Math.hypot(y[14],y[15])>input.attachmentReach)throw new RangeError('Mixed span geometry/rest event');
    if(total>=.98*C||f.normal>1e-12||residual>1e-11||loss<-1e-8||!Number.isFinite(loss))throw new RangeError('Mixed span cap/target/power scope');
    const ta=-g.rax*z+g.ray*x,tb=g.rbx*z-g.rby*x,t=y[SPAN.TIME];
    return [y[2],y[3],-x/a.mass,-z/a.mass,ta/a.inertia,y[4],
      y[8],y[9],x/b.mass,z/b.mass,tb/b.inertia,y[10],
      g.share*(g.c*ux+g.s*uy),g.share*(-g.s*ux+g.c*uy),ux,uy,
      x,z,(H-t)*x,(H-t)*z,ta,tb,(H-t)*ta,(H-t)*tb,
      x*g.gx+z*g.gy,-footx*ux-footy*uy,total,0,f.normal,f.tangent,
      loss,k*e*normalVelocity,1,Math.abs(f.normal),Math.abs(f.tangent),-2*g.nt*f.normal*f.tangent,
      -g.nn*f.normal*f.normal-g.tt*f.tangent*f.tangent];
  }
  derivative(m.initial); // Same initial guard/stat sample as the original model.
  function result(y:number[]){
    if(evaluations+1>4096)throw new RangeError('Mixed span evaluation budget');
    const r=m.result(y);
    return {...r,evaluations:evaluations+1,
      maximumTargetResidual:Math.max(maximumTargetResidual,r.maximumTargetResidual),
      maximumCapacityRatio:Math.max(maximumCapacityRatio,r.maximumCapacityRatio),minimumLoss:Math.min(minimumLoss,r.minimumLoss)};
  }
  return {initial:m.initial,derivative,result};
}
