/** Bounded direct solve of the corrected passive zero-normal tangent graph.
 * Same circle budgets (normal inactive), common motor and sticking targets.
 * Enumerate active constraints and certify their projected residual; no
 * sequential row work, iteration tolerance amplification or new force law.
 * The independent reference chooses by convex objective, not this KKT test. */
import type {SharedGripFrame} from './grip-shared-law.js';
import {workFraction} from '../../../src/physics/actuation.js';
export function phaseGripForce(g:SharedGripFrame[],mu:number){
  if(![1,2].includes(g.length)||!Number.isFinite(mu)||mu<=0||g.some(v=>v.capacity<0||(v.normalBias??0)!==0
    ||![v.nx,v.ny,v.vn,v.vt,v.xx,v.xy,v.yy,v.capacity].every(Number.isFinite)))throw new RangeError('Direct passive force scope');
  const jt=g.map(v=>({x:-v.xx*v.ny+v.xy*v.nx,y:-v.xy*v.ny+v.yy*v.nx})),
    M=jt.map(a=>jt.map(b=>mu*(a.x*b.x+a.y*b.y))),v=g.map(q=>q.vt),C=g.map(q=>q.capacity),M0=M[0][0];
  if(!(M0>0))throw new RangeError('Direct passive mobility');
  let force:number[]|undefined;
  if(g.length===1)force=[Math.max(-C[0],Math.min(C[0],-v[0]/M0))];
  else{
    const b=M[0][1],d=M[1][1],det=M0*d-b*b;
    if(!(det>0&&Number.isFinite(det)))throw new RangeError('Non-unique direct force');
    for(const s of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const f=s[0]===0&&s[1]===0?[(-d*v[0]+b*v[1])/det,(b*v[0]-M0*v[1])/det]
        :s[0]===0?[-(v[0]+b*s[1]*C[1])/M0,s[1]*C[1]]
        :s[1]===0?[s[0]*C[0],-(v[1]+b*s[0]*C[0])/d]:[s[0]*C[0],s[1]*C[1]],
        slip=v.map((w,k)=>w+M[k][0]*f[0]+M[k][1]*f[1]);
      if(f.some((w,k)=>!Number.isFinite(w)||Math.abs(w)>C[k]))continue;
      if(f.some((w,k)=>Math.abs(Math.max(-C[k],Math.min(C[k],w-slip[k]/M[k][k]))-w)>1e-10*Math.max(1,C[k])))continue;
      force=f;break;
    }
  }
  if(!force)throw new RangeError('Direct passive active set');
  const load={x:force.reduce((sum,f,k)=>sum+jt[k].x*f,0),y:force.reduce((sum,f,k)=>sum+jt[k].y*f,0)},
    velocity={x:mu*load.x,y:mu*load.y},slip=v.map((w,k)=>w+jt[k].x*velocity.x+jt[k].y*velocity.y),
    normalVelocity=g.map(q=>q.vn+(q.xx*q.nx+q.xy*q.ny)*velocity.x+(q.xy*q.nx+q.yy*q.ny)*velocity.y),
    bodyPower=force.reduce((sum,f,k)=>sum+f*v[k],0),motorCost=mu*(load.x**2+load.y**2),fraction=workFraction(bodyPower,motorCost,0),
    targetResidual=Math.max(...force.map((f,k)=>Math.abs(Math.max(-C[k],Math.min(C[k],f-slip[k]/M[k][k]))-f)/Math.max(1,C[k])));
  if(normalVelocity.some(w=>w>1e-10))throw new RangeError('Direct force normal channel');
  if(targetResidual>1e-10||fraction!==1)throw new RangeError('Direct passive work/target conflict');
  return {force,load,velocity,slip,normalVelocity,passivePower:bodyPower+motorCost,motorPower:-motorCost,targetResidual};
}
