/** Diagnostic only: one passive, full lower grip and a prescribed linear
 * support motor. No World insertion or recovery decision. The geometry moves
 * at every evaluation; both torque arms, material transport and motor work
 * follow the same force. Unsupported contact/hold transitions fail closed.
 */
import type { Particle } from './grip-force-interval.js';
type V = { x: number; y: number };
export interface SupportedGripInput {
  a: Particle; b: Particle; material: V; footOffset: V;
  mobility: number; desired: V; capacity: number; duration: number;
  minimumDistance: number; reach: number; attachmentReach: number; hold: number;
}

/** Continuous limit of World's linear support row, not a new coefficient.
 * Its normal softness uses translational reduced mass; tangent consumes the
 * capacity left by normal. The motor mobility remains mu, not mu+1/damping.
 */
export function linearSupportForce(vn:number, vt:number, extension:number,
  inverseMass:number, mobility:number, capacity:number) {
  const omega=2*Math.PI*6, damping=2*.8*omega/inverseMass, stiffness=omega*omega/inverseMass;
  const normal=Math.min(0,Math.max(-(stiffness*extension+damping*vn)/(1+damping*mobility),
    -capacity,-Math.max(vn,0)/mobility));
  const remaining=Math.sqrt(Math.max(0,capacity*capacity-normal*normal));
  return {normal,tangent:Math.max(-remaining,Math.min(remaining,-vt/mobility))};
}

const AX=0,AY=1,AVX=2,AVY=3,AS=4,AA=5,BX=6,BY=7,BVX=8,BVY=9,BS=10,BA=11,
  ZX=12,ZY=13,FX=14,FY=15,JX=16,JY=17,QX=18,QY=19,JA=20,JB=21,QA=22,QB=23,
  BW=24,MW=25,DOSE=26,NJ=27,TJ=28;
type State=number[];
export function supportedGripInterval(input:SupportedGripInput) {
  const {a,b,duration:H,capacity:C,mobility:mu,desired:u0}=input;
  const numeric=[a.mass,a.inertia,b.mass,b.inertia,H,C,mu,u0.x,u0.y,
    input.material.x,input.material.y,input.footOffset.x,input.footOffset.y,
    input.minimumDistance,input.reach,input.attachmentReach,input.hold,
    ...[a,b].flatMap(p=>[p.pos.x,p.pos.y,p.vel.x,p.vel.y,p.facing,p.spin])];
  if(!numeric.every(Number.isFinite)||a.mass<=0||b.mass<=0||a.inertia<=0||b.inertia<=0
    ||H<=0||C<0||mu<=0||input.minimumDistance<0||input.reach<=input.minimumDistance
    ||input.attachmentReach<=0||input.hold<0||input.hold>input.reach)
    throw new RangeError('Invalid supported-grip input (zero mobility uses the dry reference)');
  if(u0.x!==0||u0.y!==0)
    throw new RangeError('Active support budget outside supported-grip scope');
  if(H*Math.abs(a.spin)+C*H*H*input.reach/(2*a.inertia)>.1
    ||H*Math.abs(b.spin)+C*H*H*input.attachmentReach/(2*b.inertia)>.1)
    throw new RangeError('Angular travel outside short supported-grip scope');
  const K=1/a.mass+1/b.mass;
  const initial:State=[a.pos.x,a.pos.y,a.vel.x,a.vel.y,a.spin,a.facing,
    b.pos.x,b.pos.y,b.vel.x,b.vel.y,b.spin,b.facing,input.material.x,input.material.y,
    input.footOffset.x,input.footOffset.y,0,0,0,0,0,0,0,0,0,0,0,0,0];
  let evaluations=0,expectedSlip:boolean|undefined,expectedDirection=0,acquiredHold=input.hold;
  function frame(y:State) {
    const c=Math.cos(y[BA]),s=Math.sin(y[BA]),rbx=c*y[ZX]-s*y[ZY],rby=s*y[ZX]+c*y[ZY],
      rax=y[BX]+rbx-y[AX],ray=y[BY]+rby-y[AY],d=Math.hypot(rax,ray),nx=rax/d,ny=ray/d;
    if(Math.hypot(y[BX]-y[AX],y[BY]-y[AY])<=input.minimumDistance||d>input.reach
      ||Math.hypot(rbx,rby)>=input.attachmentReach)
      throw new RangeError('Contact/reach event outside supported-grip scope');
    const gx=y[BVX]-y[AVX]-y[BS]*rby+y[AS]*ray,
      gy=y[BVY]-y[AVY]+y[BS]*rbx-y[AS]*rax,
      vn=(gx+u0.x)*nx+(gy+u0.y)*ny,vt=-(gx+u0.x)*ny+(gy+u0.y)*nx;
    // On a monotonic slipping branch, World's repeated running max is
    // exactly max(initialHold,d); tightening without slipping uses min.
    // This algebraic coordinate avoids an artificial stiff ODE for the hold.
    const hold=expectedSlip===undefined?acquiredHold:expectedSlip?Math.max(acquiredHold,d)
      :Math.min(acquiredHold,Math.max(d,input.minimumDistance)),extension=Math.max(0,d-hold);
    // The first bounded experiment follows zero-extension tightening or the
    // existing cap-loaded hold ratchet. Opening unsaturated tension requires
    // another event/hold treatment; do not silently omit its spring force.
    if(extension>1e-8&&vn>1e-12)
      throw new RangeError('Tensile hold transition outside supported-grip scope');
    const f=linearSupportForce(vn,vt,extension,K,mu,C),x=f.normal*nx-f.tangent*ny,
      z=f.normal*ny+f.tangent*nx,total=Math.hypot(x,z),slipping=C>0&&total>=.98*C;
    if(expectedSlip!==undefined&&slipping!==expectedSlip)
      throw new RangeError('Slip/hold transition outside supported-grip scope');
    const ux=u0.x+mu*x,uy=u0.y+mu*z,radial=(gx+ux)*nx+(gy+uy)*ny;
    if(expectedSlip!==undefined&&Math.abs(radial)>1e-12
      &&(expectedDirection===0||Math.sign(radial)!==expectedDirection||!slipping&&radial>0))
      throw new RangeError('Hold direction reversal outside supported-grip scope');
    return {c,s,rbx,rby,rax,ray,d,gx,gy,x,z,ux,uy,total,slipping,hold,radial,...f};
  }
  const acquired=frame(initial);expectedSlip=acquired.slipping;
  expectedDirection=Math.abs(acquired.radial)>1e-12?Math.sign(acquired.radial):0;
  // World's interval-end hold projection has this instantaneous limit for a
  // loose acquired grip; it cannot supply an extra spring extension reserve.
  acquiredHold=expectedSlip?Math.max(acquiredHold,acquired.d)
    :Math.min(acquiredHold,Math.max(acquired.d,input.minimumDistance));
  function derivative(t:number,y:State):State {
    evaluations++;
    const f=frame(y),ta=-f.rax*f.z+f.ray*f.x,tb=f.rbx*f.z-f.rby*f.x;
    return [y[AVX],y[AVY],-f.x/a.mass,-f.z/a.mass,ta/a.inertia,y[AS],
      y[BVX],y[BVY],f.x/b.mass,f.z/b.mass,tb/b.inertia,y[BS],
      f.c*f.ux+f.s*f.uy,-f.s*f.ux+f.c*f.uy,f.ux,f.uy,
      f.x,f.z,(H-t)*f.x,(H-t)*f.z,ta,tb,(H-t)*ta,(H-t)*tb,
      f.x*f.gx+f.z*f.gy,-f.x*f.ux-f.z*f.uy,f.total,f.normal,f.tangent];
  }
  function solve(n:number) {
    let y=initial.slice();
    for(let k=0;k<n;k++) {
      const h=H/n,t=k*h,add=(z:State,s:number)=>y.map((v,i)=>v+s*z[i]),
        k1=derivative(t,y),k2=derivative(t+h/2,add(k1,h/2)),
        k3=derivative(t+h/2,add(k2,h/2)),k4=derivative(t+h,add(k3,h));
      y=y.map((v,i)=>v+h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
    }
    frame(y);return y;
  }
  function pose(y:State) {
    const p=(body:Particle,sign:number,j:number,q:number):Particle=>({...body,
      pos:{x:body.pos.x+body.vel.x*H+sign*y[QX]/body.mass,y:body.pos.y+body.vel.y*H+sign*y[QY]/body.mass},
      vel:{x:body.vel.x+sign*y[JX]/body.mass,y:body.vel.y+sign*y[JY]/body.mass},
      facing:body.facing+body.spin*H+y[q]/body.inertia,spin:body.spin+y[j]/body.inertia});
    return {a:p(a,-1,JA,QA),b:p(b,1,JB,QB)};
  }
  const energy=(p:Particle)=>.5*p.mass*(p.vel.x*p.vel.x+p.vel.y*p.vel.y)+.5*p.inertia*p.spin*p.spin;
  const angular=(p:Particle)=>p.mass*(p.pos.x*p.vel.y-p.pos.y*p.vel.x)+p.inertia*p.spin;
  function accounting(y:State) {
    const p=pose(y);
    return {workResidual:energy(p.a)+energy(p.b)-energy(a)-energy(b)-y[BW],
      angularResidual:angular(p.a)+angular(p.b)-angular(a)-angular(b)};
  }
  let coarse:State|undefined,accepted:State|undefined,partitions=0,error=Infinity;
  // Refine only this small force ODE, never the entire World. The bound is a
  // diagnostic fallback boundary, not permission to return an inaccurate row.
  for(const n of [2,4,8,16,32,64,128,256,512,1024]) {
    let fine:State;
    try {fine=solve(n);}catch(e) {if(!(e instanceof RangeError))throw e;coarse=undefined;continue;}
    if(coarse) {
      const x=pose(coarse),z=pose(fine);
      error=Math.max(...(['a','b'] as const).flatMap(k=>[
        Math.hypot(x[k].pos.x-z[k].pos.x,x[k].pos.y-z[k].pos.y)/5e-7,
        Math.hypot(x[k].vel.x-z[k].vel.x,x[k].vel.y-z[k].vel.y)/2.5e-5,
        Math.abs(x[k].facing-z[k].facing)/2.5e-6,Math.abs(x[k].spin-z[k].spin)/2.5e-4]),
        Math.hypot(coarse[ZX]-fine[ZX],coarse[ZY]-fine[ZY])/5e-7,
        Math.hypot(coarse[FX]-fine[FX],coarse[FY]-fine[FY])/5e-7,
        Math.abs(frame(coarse).hold-frame(fine).hold)/5e-7,
        Math.abs(coarse[BW]-fine[BW])/.01,Math.abs(coarse[MW]-fine[MW])/.01);
      const balances=accounting(fine);
      if(error<=1/16&&Math.abs(balances.workResidual)<=1e-8&&Math.abs(balances.angularResidual)<=1e-7)
        {accepted=fine;partitions=n;break;}
    }
    coarse=fine;
  }
  if(!accepted)throw new RangeError('Supported-grip scope/refinement bound exhausted');
  const y=accepted,poses=pose(y),f=frame(y);
  return {...poses,material:{x:y[ZX],y:y[ZY]},footOffset:{x:y[FX],y:y[FY]},
    point:{x:poses.b.pos.x+f.rbx,y:poses.b.pos.y+f.rby},
    hold:f.hold,slipping:f.slipping,
    impulse:{x:y[JX],y:y[JY]},moment:{x:y[QX],y:y[QY]},
    angularImpulse:[y[JA],y[JB]],angularMoment:[y[QA],y[QB]],
    bodyWork:y[BW],motorWork:y[MW],passiveWork:y[BW]-y[MW],dose:y[DOSE],...accounting(y),
    normalImpulse:y[NJ],tangentImpulse:y[TJ],partitions,evaluations,error,
    representationError:Math.max(...(['a','b'] as const).flatMap((k,i)=>[
      Math.abs(poses[k].pos.x-y[i*6]),Math.abs(poses[k].pos.y-y[i*6+1]),
      Math.abs(poses[k].vel.x-y[i*6+2]),Math.abs(poses[k].vel.y-y[i*6+3]),
      Math.abs(poses[k].spin-y[i*6+4]),Math.abs(poses[k].facing-y[i*6+5])]))};
}
