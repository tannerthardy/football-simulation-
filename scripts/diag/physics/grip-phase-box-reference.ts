/** Independent zero-normal reference: minimize the convex tangent-contact
 * energy over two unchanged grip limits. Enumerate interior/edges/corners;
 * no iterative force solver or candidate work rule is imported. */
import type {SharedGripFrame} from './grip-shared-law.js';
export function phaseBoxReference(g:SharedGripFrame[],mu:number){
  if(g.length!==2||!(mu>0)||!Number.isFinite(mu)||g.some(v=>(v.normalBias??0)!==0||v.capacity<0
    ||![v.nx,v.ny,v.vn,v.vt,v.xx,v.xy,v.yy,v.capacity].every(Number.isFinite)))throw new RangeError('Tangent reference scope');
  const j=g.map(v=>({x:-v.xx*v.ny+v.xy*v.nx,y:-v.xy*v.ny+v.yy*v.nx})),
    M=j.map(a=>j.map(b=>mu*(a.x*b.x+a.y*b.y))),a=M[0][0],b=M[0][1],d=M[1][1],det=a*d-b*b,
    v=g.map(q=>q.vt),C=g.map(q=>q.capacity),candidates:number[][]=[];
  if(!(det>0))throw new RangeError('Non-unique tangent reference');
  const interior=[(-d*v[0]+b*v[1])/det,(b*v[0]-a*v[1])/det];
  if(interior.every((f,k)=>Math.abs(f)<=C[k]))candidates.push(interior);
  for(const sign of [-1,1]){
    candidates.push([sign*C[0],Math.max(-C[1],Math.min(C[1],-(v[1]+b*sign*C[0])/d))]);
    candidates.push([Math.max(-C[0],Math.min(C[0],-(v[0]+b*sign*C[1])/a)),sign*C[1]]);
    for(const other of [-1,1])candidates.push([sign*C[0],other*C[1]]);
  }
  // Subtract the unconstrained minimum analytically. Comparing full values
  // near a cap corner cancels O(40) energies and can choose an invalid edge.
  const objective=(f:number[])=>{const x=f[0]-interior[0],y=f[1]-interior[1];return .5*(a*x*x+2*b*x*y+d*y*y);},
    force=candidates.reduce((x,y)=>objective(x)<=objective(y)?x:y),
    load={x:j[0].x*force[0]+j[1].x*force[1],y:j[0].y*force[0]+j[1].y*force[1]},u={x:mu*load.x,y:mu*load.y},
    normalVelocity=g.map(q=>q.vn+(q.xx*q.nx+q.xy*q.ny)*u.x+(q.xy*q.nx+q.yy*q.ny)*u.y);
  if(normalVelocity.some(v=>v>1e-10))throw new RangeError('Normal contact also required');
  return {force,load,velocity:u,slip:v.map((w,k)=>w+M[k][0]*force[0]+M[k][1]*force[1]),normalVelocity,
    passivePower:v[0]*force[0]+v[1]*force[1]+mu*(load.x*load.x+load.y*load.y),objective:objective(force)};
}
