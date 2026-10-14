/** Default: small-step limit of World's eight ordered passive grasp passes.
 * Explicit coupled mode: experimental graph work accounting, zero span bias
 * and no active motor/reel. Capacities and force targets remain unchanged.
 * Never called by World; not a production support or recovery repair. */
import {workFraction} from '../../../src/physics/actuation.js';
export interface SharedGripFrame {
  nx:number;ny:number;vn:number;vt:number;xx:number;xy:number;yy:number;
  capacity:number;inverseMass:number;normalBias?:number;
}
export function sharedGripForce(frames:SharedGripFrame[],mobility:number,workAccounting:'channel'|'coupled'='channel',iterations=workAccounting==='coupled'?256:8) {
  if(!(mobility>0)||!Number.isFinite(mobility)||!frames.length)throw new RangeError('Invalid common-foot mobility');
  if(!Number.isInteger(iterations)||iterations<1||iterations>256)throw new RangeError('Invalid passive force iteration budget');
  // Bounded accounting candidate only: no stored spring energy or active motor.
  if(workAccounting==='coupled'&&frames.some(g=>(g.normalBias??0)!==0))throw new RangeError('Coupled work requires zero span bias');
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
  let px=0,py=0,minimumFraction=1,passes=0;
  for(let pass=0;pass<iterations;pass++){
    for(const r of rows){
      const limit=Math.sqrt(Math.max(0,r.capacity*r.capacity-r.tangent*r.tangent)),
        total=r.vn+mobility*(r.jnx*px+r.jny*py),
        wanted=Math.max(-limit,Math.min(0,r.normal-(total+r.normalBias+r.normal/r.damping)/(r.nn+1/r.damping)));
      r.normal+=apply(r,wanted-r.normal,false);
      const tangentLimit=Math.sqrt(Math.max(0,r.capacity*r.capacity-r.normal*r.normal)),
        slip=r.vt+mobility*(r.jtx*px+r.jty*py),
        tangent=Math.max(-tangentLimit,Math.min(tangentLimit,r.tangent-slip/r.tt));
      r.tangent+=apply(r,tangent-r.tangent,true);
    }
    passes=pass+1;
    if(workAccounting==='coupled'&&targetResidual()<=1e-10)break;
  }
  function targetResidual(){return Math.max(...rows.map(r=>{
    const n=r.vn+r.normalBias+mobility*(r.jnx*px+r.jny*py)+r.normal/r.damping,
      nLimit=Math.sqrt(Math.max(0,r.capacity*r.capacity-r.tangent*r.tangent)),
      normal=Math.max(-nLimit,Math.min(0,r.normal-n/(r.nn+1/r.damping))),
      t=r.vt+mobility*(r.jtx*px+r.jty*py),tLimit=Math.sqrt(Math.max(0,r.capacity*r.capacity-r.normal*r.normal)),
      tangent=Math.max(-tLimit,Math.min(tLimit,r.tangent-t/r.tt));
    return Math.max(Math.abs(normal-r.normal),Math.abs(tangent-r.tangent))/Math.max(1,r.capacity);
  }));}
  function apply(r:(typeof rows)[number],delta:number,tangent:boolean){
    const x=(tangent?r.jtx:r.jnx)*delta,y=(tangent?r.jty:r.jny)*delta,
      linear=delta*(tangent?r.vt:r.vn)+2*mobility*(px*x+py*y),quadratic=mobility*(x*x+y*y),
      key=tangent?'tangentWork':'normalWork',fraction=workAccounting==='coupled'?1:workFraction(linear,quadratic,Math.max(0,-r[key]));
    minimumFraction=Math.min(minimumFraction,fraction);
    // In coupled mode these are numerical marginal traces, not independently
    // owned work. Only passivePower/motorPower describe physical graph work.
    px+=fraction*x;py+=fraction*y;r[key]+=fraction*linear+fraction*fraction*quadratic;
    return fraction*delta;
  }
  // Contacts in this graph act together. An intermediate numerical row update
  // is not a physical event and does not own another contact's cross-work.
  // Project the complete passive load once; capacities/targets are unchanged.
  let graphFraction=1;
  if(workAccounting==='coupled'){
    if(targetResidual()>1e-10)throw new RangeError('Shared passive constitutive budget');
    const bodyPower=rows.reduce((s,r)=>s+r.normal*r.vn+r.tangent*r.vt,0),motorCost=mobility*(px*px+py*py);
    graphFraction=workFraction(bodyPower,motorCost,0);
    for(const r of rows){r.normal*=graphFraction;r.tangent*=graphFraction;}
    px*=graphFraction;py*=graphFraction;minimumFraction=Math.min(minimumFraction,graphFraction);
    if(targetResidual()>1e-10)throw new RangeError('Shared passive work/target conflict');
  }
  return {rows,load:{x:px,y:py},velocity:{x:mobility*px,y:mobility*py},
    motorPower:-mobility*(px*px+py*py),minimumFraction,
    passivePower:rows.reduce((s,r)=>s+r.normal*r.vn+r.tangent*r.vt,0)+mobility*(px*px+py*py),graphFraction,
    targetResidual:targetResidual(),passes};
}
