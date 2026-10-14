/** Feasibility kernel ONLY: one passive dry grasp at the held body's COM,
 * zero support mobility/normal load, no collision or active reel. No World
 * insertion. This is the continuous limit of its existing tangential row.
 * Unsupported branches fail closed rather than supplying a new force law.
 */
export interface Particle {
  mass: number; inertia: number;
  pos: { x: number; y: number }; vel: { x: number; y: number };
  facing: number; spin: number;
}
export interface DryGripInput {
  a: Particle; b: Particle; capacity: number; duration: number;
  minimumDistance: number; reach: number; pullSpeed: number;
}
// State: relative position/velocity, holder spin/facing, impulse on B,
// angular impulse on A, and their remaining-time moments, passive work/dose.
const RX=0, RY=1, VX=2, VY=3, SPIN=4, ANGLE=5, JX=6, JY=7, JA=8,
  QX=9, QY=10, QA=11, WORK=12, DOSE=13;
type State = number[];

export function dryGripInterval(input: DryGripInput) {
  const {a,b,capacity:C,duration:H}=input;
  const numbers=[a.mass,b.mass,a.inertia,b.inertia,C,H,input.minimumDistance,input.reach,input.pullSpeed,
    a.pos.x,a.pos.y,b.pos.x,b.pos.y,a.vel.x,a.vel.y,b.vel.x,b.vel.y,a.spin,b.spin,a.facing,b.facing];
  if(!numbers.every(Number.isFinite)||a.mass<=0||b.mass<=0||a.inertia<=0||b.inertia<=0
    ||C<0||H<=0||input.minimumDistance<0||input.reach<=input.minimumDistance||input.pullSpeed<0)
    throw new RangeError('Invalid dry-grip feasibility input');
  const K=1/a.mass+1/b.mass;
  let evaluations=0;
  function frame(y:State) {
    const d=Math.hypot(y[RX],y[RY]),nx=y[RX]/d,ny=y[RY]/d;
    const radial=y[VX]*nx+y[VY]*ny, tangent=-y[VX]*ny+y[VY]*nx;
    if(d<=input.minimumDistance||d>input.reach||radial+input.pullSpeed>1e-10)
      throw new RangeError('Collision, tension or active reel outside dry-grip scope');
    return {d,nx,ny,radial,tangent,slip:tangent-d*y[SPIN],inverse:K+d*d/a.inertia};
  }
  const initial:State=[b.pos.x-a.pos.x,b.pos.y-a.pos.y,b.vel.x-a.vel.x,b.vel.y-a.vel.y,
    a.spin,a.facing,0,0,0,0,0,0,0,0];
  const sign=Math.sign(frame(initial).slip);
  function derivative(t:number,y:State,sliding:boolean):State {
    evaluations++;
    const f=frame(y);
    // During sticking, slip' = K_eff F - 2*radial*spin = 0.
    // The moving frame can require force after the initial slip stops.
    const force=C===0?0:sliding?-sign*C:2*f.radial*y[SPIN]/f.inverse;
    if(Math.abs(force)>C*(1+1e-10)||!sliding&&Math.abs(force)>=.98*C&&C>0)
      throw new RangeError('Re-sliding outside this single-event experiment');
    const x=-f.ny*force,z=f.nx*force,angular=-f.d*force;
    return [y[VX],y[VY],K*x,K*z,angular/a.inertia,y[SPIN],x,z,angular,
      (H-t)*x,(H-t)*z,(H-t)*angular,force*f.slip,Math.abs(force)];
  }
  function rk4(t:number,y:State,h:number,sliding:boolean):State {
    const add=(k:State,s:number)=>y.map((v,i)=>v+s*k[i]);
    const k1=derivative(t,y,sliding),k2=derivative(t+h/2,add(k1,h/2),sliding),
      k3=derivative(t+h/2,add(k2,h/2),sliding),k4=derivative(t+h,add(k3,h),sliding);
    return y.map((v,i)=>v+h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
  }
  function solve(n:number) {
    let y=initial.slice(),t=0,sliding=sign!==0&&C>0,exit=sliding?H:0;
    for(let k=0;k<n;k++) {
      const end=(k+1)*H/n,h=end-t;
      if(sliding) {
        const next=rk4(t,y,h,true);
        if(sign*frame(next).slip<=0) {
          // Locate the event in this kernel, not by advancing World. Keep the
          // pre-event force cap; after it use the lawful sticking reaction.
          let lo=0,hi=h;
          for(let j=0;j<36;j++) { const mid=(lo+hi)/2;
            if(sign*frame(rk4(t,y,mid,true)).slip>0) lo=mid; else hi=mid; }
          y=rk4(t,y,(lo+hi)/2,true);t+=(lo+hi)/2;exit=t;sliding=false;
          if(end>t)y=rk4(t,y,end-t,false);
        } else y=next;
      } else y=rk4(t,y,h,false);
      t=end;
    }
    return {y,exit,n};
  }
  function end(y:State) {
    // Motion is explicitly recovered from impulse AND temporal moment.
    // These are independently compared with the integrated relative state.
    const pose=(p:Particle,s:number,angular:number)=>({ ...p,
      pos:{x:p.pos.x+p.vel.x*H+s*y[QX]/p.mass,y:p.pos.y+p.vel.y*H+s*y[QY]/p.mass},
      vel:{x:p.vel.x+s*y[JX]/p.mass,y:p.vel.y+s*y[JY]/p.mass},
      spin:p.spin+angular*y[JA]/p.inertia,facing:p.facing+p.spin*H+angular*y[QA]/p.inertia });
    return {a:pose(a,-1,1),b:pose(b,1,0)};
  }
  let coarse=solve(2),accepted:ReturnType<typeof solve>|undefined,error=Infinity;
  // Same pose/velocity/yaw/spin/work requirements as the reference. Reserve
  // 15/16 for reference discretization and eventual operator composition.
  for(const n of [4,8,16,32,64,128]) {
    const fine=solve(n),x=end(coarse.y),z=end(fine.y);
    error=Math.max(...(['a','b'] as const).flatMap(k=>[
      Math.hypot(x[k].pos.x-z[k].pos.x,x[k].pos.y-z[k].pos.y)/5e-7,
      Math.hypot(x[k].vel.x-z[k].vel.x,x[k].vel.y-z[k].vel.y)/2.5e-5,
      Math.abs(x[k].facing-z[k].facing)/2.5e-6,Math.abs(x[k].spin-z[k].spin)/2.5e-4]),
      Math.abs(coarse.y[WORK]-fine.y[WORK])/.01);
    if(error<=1/16) {accepted=fine;break;}coarse=fine;
  }
  if(!accepted)throw new RangeError('Dry-grip kernel refinement bound exhausted');
  const y=accepted.y,poses=end(y),f=frame(y);
  return {...poses,impulse:{x:y[JX],y:y[JY]},moment:{x:y[QX],y:y[QY]},
    angularImpulse:y[JA],angularMoment:y[QA],work:y[WORK],dose:y[DOSE],
    slidingUntil:accepted.exit,finalSlip:f.slip,partitions:accepted.n,evaluations,error,
    representationError:Math.max(Math.abs(poses.b.pos.x-poses.a.pos.x-y[RX]),
      Math.abs(poses.b.pos.y-poses.a.pos.y-y[RY]),Math.abs(poses.a.facing-y[ANGLE]))};
}
