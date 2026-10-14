/** Continuous small-step limit of World's eight ordered passive grasp passes.
 * One common foot, including cross-load work and per-channel refund ledgers.
 * Capacity has already been allocated by the unchanged World. No optimal
 * allocator or independent sum of one-grip motions is introduced. */
import {workFraction} from '../../../src/physics/actuation.js';
export interface SharedGripFrame {
  nx:number;ny:number;vn:number;vt:number;xx:number;xy:number;yy:number;
  capacity:number;inverseMass:number;normalBias?:number;
}
export function sharedGripForce(frames:SharedGripFrame[],mobility:number) {
  if(!(mobility>0)||!Number.isFinite(mobility)||!frames.length)throw new RangeError('Invalid common-foot mobility');
  const rows=frames.map(g=>{
    if(![g.nx,g.ny,g.vn,g.vt,g.xx,g.xy,g.yy,g.capacity,g.inverseMass,g.normalBias??0].every(Number.isFinite)||g.capacity<0||g.inverseMass<=0)
      throw new RangeError('Invalid shared-grip frame');
    const jnx=g.xx*g.nx+g.xy*g.ny,jny=g.xy*g.nx+g.yy*g.ny,
      jtx=-g.xx*g.ny+g.xy*g.nx,jty=-g.xy*g.ny+g.yy*g.nx,
      nn=mobility*(jnx*jnx+jny*jny),tt=mobility*(jtx*jtx+jty*jty),damping=2*.8*2*Math.PI*6/g.inverseMass;
    if(!(nn>0&&tt>0))throw new RangeError('Degenerate shared-grip mobility');
    return {nx:g.nx,ny:g.ny,vn:g.vn,vt:g.vt,normalBias:g.normalBias??0,capacity:g.capacity,
      jnx,jny,jtx,jty,nn,tt,damping,normal:0,tangent:0,normalWork:0,tangentWork:0};
  });
  let px=0,py=0,minimumFraction=1;
  for(let pass=0;pass<8;pass++)for(const r of rows){
    const limit=Math.sqrt(Math.max(0,r.capacity*r.capacity-r.tangent*r.tangent)),
      total=r.vn+mobility*(r.jnx*px+r.jny*py),
      wanted=Math.max(-limit,Math.min(0,r.normal-(total+(r.normalBias??0)+r.normal/r.damping)/(r.nn+1/r.damping)));
    r.normal+=apply(r,wanted-r.normal,false);
    const tangentLimit=Math.sqrt(Math.max(0,r.capacity*r.capacity-r.normal*r.normal)),
      slip=r.vt+mobility*(r.jtx*px+r.jty*py),
      tangent=Math.max(-tangentLimit,Math.min(tangentLimit,r.tangent-slip/r.tt));
    r.tangent+=apply(r,tangent-r.tangent,true);
  }
  function apply(r:(typeof rows)[number],delta:number,tangent:boolean){
    const x=(tangent?r.jtx:r.jnx)*delta,y=(tangent?r.jty:r.jny)*delta,
      linear=delta*(tangent?r.vt:r.vn)+2*mobility*(px*x+py*y),quadratic=mobility*(x*x+y*y),
      key=tangent?'tangentWork':'normalWork',fraction=workFraction(linear,quadratic,Math.max(0,-r[key]));
    minimumFraction=Math.min(minimumFraction,fraction);
    px+=fraction*x;py+=fraction*y;r[key]+=fraction*linear+fraction*fraction*quadratic;
    return fraction*delta;
  }
  return {rows,load:{x:px,y:py},velocity:{x:mobility*px,y:mobility*py},
    motorPower:-mobility*(px*px+py*py),minimumFraction,
    passivePower:rows.reduce((s,r)=>s+r.normal*r.vn+r.tangent*r.vt,0)+mobility*(px*px+py*py)};
}
