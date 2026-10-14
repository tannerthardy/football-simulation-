/** Bounded diagnostic, never installed in production World. The existing
 * 6Hz/.8 normal softness already defines k and d; this does not tune them.
 * One passive, radial, below-cap release may spend its ACTUAL stored span
 * energy once per physical interval. Check the resulting World energy before
 * accepting it. Active drives, multiple grips and mixed release are refused.
 */
import {World} from '../../../src/physics/world.js';
const omega=2*Math.PI*6;
export function gripSpring(ma:number,mb:number){
  if(!Number.isFinite(ma)||!Number.isFinite(mb)||ma<=0||mb<=0)throw new RangeError('Spring masses');
  const inverseMass=1/ma+1/mb;
  return {inverseMass,stiffness:omega*omega/inverseMass,damping:2*.8*omega/inverseMass};
}
export function storedSpan(w:any,j:any){
  const p=w.graspPoint(j),distance=Math.hypot(p.x-j.a.pos.x,p.y-j.a.pos.y),
    extension=Math.max(0,distance-(j.hold??distance)),spring=gripSpring(j.a.profile.massKg,j.b.profile.massKg);
  return {...spring,distance,extension,energy:.5*spring.stiffness*extension*extension};
}
export function withSpanReserve<T>(w:any,run:()=>T){
  if(!World.prototype.isPrototypeOf(w)||w.gripTiming!=='midpoint'||w.constraintWork!=='per-solve'||w.handContact!=='patch'
    ||w.joints.length!==1||w.pending.length)throw new RangeError('Span reserve operator scope');
  const j=w.joints[0];
  if(j.kind!=='grasp'||j.broken||j.brace!==undefined||j.pull>0||!(j.legs>0))throw new RangeError('Span reserve grip scope');
  if(Math.hypot(j.b.vel.x-j.a.vel.x,j.b.vel.y-j.a.vel.y)>1e-12||Math.abs(j.a.spin??0)>1e-12||Math.abs(j.b.spin??0)>1e-12)
    throw new RangeError('Span reserve initial rest scope');
  const rows=w.jointRows,integrate=w.integrateInterval,credits:Array<{energy:number;net:number;returned:number}>=[];
  let row:any;
  w.jointRows=function(h:number){
    const r=rows.call(this,h),s=storedSpan(this,j);
    if(r.length!==1||s.extension>.001||j.slipping)throw new RangeError('Span reserve row scope');
    row=r[0];row.normalWork={net:-s.energy};credits.push({energy:s.energy,net:0,returned:0});
    return r;
  };
  w.integrateInterval=function(...args:any[]){
    const [ids,,plans,h]=args;
    if(!(h>0&&h<=.0002)||ids.some((i:number)=>!plans[i].free)||this.reels.size)
      throw new RangeError('Span reserve interval scope');
    const before=storedSpan(this,j),K=this.kineticEnergy(),motor=this.report.supportMotorWork.reduce((s:number,v:number)=>s+v,0),
      active=this.report.armWork.reduce((s:number,v:number)=>s+v,0);
    integrate.apply(this,args);
    const after=storedSpan(this,j),motorDelta=this.report.supportMotorWork.reduce((s:number,v:number)=>s+v,0)-motor,
      change=this.kineticEnergy()-K+after.energy-before.energy-motorDelta;
    const c=credits.at(-1)!;c.net=row.normalWork.net;c.returned=c.net+c.energy;
    // A reserve is not dissipative credit. Reject any overspend, unexpected
    // mixed/active action, phase/rest change or total-energy creation.
    if(Math.abs(row.lt)>1e-11||row.reel!==0||j.slipping||before.distance>j.reach||j.broken
      ||Math.abs(after.energy-before.energy)>c.energy+1e-12||c.returned>c.energy+1e-12||change>1e-11
      ||this.report.armWork.reduce((s:number,v:number)=>s+v,0)!==active)
      throw new RangeError('Span reserve energy/phase acceptance');
  };
  try{return {result:run(),credits};}finally{w.jointRows=rows;w.integrateInterval=integrate;}
}

export interface RadialSpanInput{
  massA:number;massB:number;capacity:number;share:number;mobility:number;limit:number;
  separation:number;material:number;hold:number;velocity:number;duration:number;
}
/** Independent scalar moving-material reference, not World or its impulse/
 * work limiter. r=L*tanh(z/L), F=-[d*v+k*e]/[1+d*mu*(s*r')^2].
 * Both physical spring energy and damping loss accompany body/motor work.
 */
export function radialSpanReference(input:RadialSpanInput,n:number){
  const a=input,{inverseMass:B,stiffness:k,damping:d}=gripSpring(a.massA,a.massB);
  if(!Number.isInteger(n)||n<1||n>65536||!(a.duration>0&&a.duration<=.0002)||a.share<=0||a.share>1
    ||a.mobility<0||a.limit<=0||a.capacity<=0||!Object.values(a).every(Number.isFinite))throw new RangeError('Radial span reference scope');
  // separation, relative velocity, radial material, body work, motor work,
  // damping loss, dose, impulse, temporal moment, raw corrective-foot travel.
  let y=[a.separation,a.velocity,a.material,0,0,0,0,0,0,0],t=0;
  const field=(z:number[],time:number)=>{
    const q=z[2]/a.limit,r=a.limit*Math.tanh(q),dr=1-Math.tanh(q)**2,e=z[0]+r-a.hold,
      J=a.share*dr,M=a.mobility*J*J,F=-(d*z[1]+k*Math.max(0,e))/(1+d*M),u=a.mobility*J*F,
      pointVelocity=z[1]+J*u;
    if(e<-1e-12||F>1e-10||Math.abs(F)>=.98*a.capacity)throw new RangeError('Radial span phase');
    return [z[1],B*F,a.share*u,F*z[1],-F*J*u,d*pointVelocity*pointVelocity,Math.abs(F),F,(a.duration-time)*F,u];
  };
  const h=a.duration/n,add=(z:number[],f:number[],scale:number)=>z.map((v,i)=>v+scale*f[i]);
  for(let i=0;i<n;i++){
    const f1=field(y,t),f2=field(add(y,f1,h/2),t+h/2),f3=field(add(y,f2,h/2),t+h/2),f4=field(add(y,f3,h),t+h);
    y=y.map((v,j)=>v+h*(f1[j]+2*f2[j]+2*f3[j]+f4[j])/6);t+=h;
  }
  const extension=y[0]+a.limit*Math.tanh(y[2]/a.limit)-a.hold,
    initialExtension=a.separation+a.limit*Math.tanh(a.material/a.limit)-a.hold,
    initialEnergy=.5*k*initialExtension**2,energy=.5*k*extension**2,
    kineticChange=.5*(y[1]**2-a.velocity**2)/B;
  return {separation:y[0],velocity:y[1],material:y[2],extension,initialEnergy,energy,
    bodyWork:y[3],motorWork:y[4],dampingLoss:y[5],dose:y[6],impulse:y[7],moment:y[8],footTravel:y[9],
    kineticChange,workResidual:kineticChange-y[3],energyResidual:kineticChange+energy-initialEnergy-y[4]+y[5]};
}
