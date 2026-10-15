/** Experimental frozen-frame flow of the legacy heading/remaining-tick motor
 * coupled to one passive tangent row. No World path or recovery law.
 * Ground/tangent capacities and leg accelerations stay fixed in this field. */
import type { SlipBody, SlipField } from './local-slip-work.js';
export type MotorBody = Omit<SlipBody, 'groundYawAcceleration'>;
export interface MotorField extends Omit<SlipField, 'bodies'> { bodies: [MotorBody, MotorBody]; }
export interface MotorPhase {
  duration: number; force: number; groundAcceleration: [number, number];
  slipBefore: number; slipAfter: number; work: number;
}
export type MotorResult = {ok:false;reason:'controller-deadline'|'heading-branch'|'event-limit'} | {
  ok:true;bodies:[MotorBody,MotorBody];phases:MotorPhase[];
  impulse:number;temporalMoment:number;absoluteImpulse:number;handWork:number;
  groundYawImpulse:[number,number];groundYawTemporalMoment:[number,number];absoluteGroundYawImpulse:[number,number];
  groundYawWork:[number,number];legWork:[number,number];energyChange:number;workResidual:number;
};
const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));
const energy=(bs:readonly MotorBody[])=>bs.reduce((s,b)=>s+.5*b.mass*(b.velocity.x**2+b.velocity.y**2)+.5*b.inertia*b.spin**2,0);

/** A motor away from its requested spin saturates toward it. At the target
 * it cancels hand torque if possible; otherwise it remains torque-limited.
 * This is the dt->0 limit of the existing coupled endpoint motor selection.
 * No spin/rate projection is applied when load beats the motor. */
export function integrateSlipMotor(field:MotorField):MotorResult {
  const {duration:h,remaining,tangent:t,arms,forceLimit:limit}=field;
  if(!Number.isFinite(h)||h<0||!Number.isFinite(remaining)||remaining<=0||!Number.isFinite(limit)||limit<0
    ||field.bodies.length!==2||arms.length!==2||!arms.every(a=>Number.isFinite(a)&&a>=0)
    ||!Number.isFinite(t.x+t.y)||Math.abs(t.x*t.x+t.y*t.y-1)>1e-12
    ||field.bodies.some(b=>!(b.mass>0&&b.inertia>0)||![b.mass,b.inertia,b.position.x,b.position.y,b.velocity.x,b.velocity.y,b.facing,b.spin,b.groundAcceleration.x,b.groundAcceleration.y].every(Number.isFinite)
      ||(b.yaw&&(![b.yaw.targetHeading,b.yaw.turnRate,b.yaw.accelerationLimit].every(Number.isFinite)||b.yaw.turnRate<=0||b.yaw.accelerationLimit<0))))throw new RangeError('Invalid local motor field');
  const bs=field.bodies.map(b=>({...b,position:{...b.position},velocity:{...b.velocity}})) as [MotorBody,MotorBody],beforeE=energy(bs),phases:MotorPhase[]=[];
  const G:[number,number]=[0,0],GM:[number,number]=[0,0],GA:[number,number]=[0,0],GW:[number,number]=[0,0],LW:[number,number]=[0,0];
  let elapsed=0,J=0,M=0,A=0,W=0;
  if(h>0&&bs.some(b=>b.yaw)&&h>=remaining)return {ok:false,reason:'controller-deadline'};
  // Restrict to the saved small-turn branch. Crossing the heading wrap is a
  // different controller choice, not an event for this local integrator.
  if(bs.some(b=>b.yaw&&Math.abs(b.yaw.targetHeading-b.facing)>=Math.PI))return {ok:false,reason:'heading-branch'};
  const mobility=(t.x*t.x+t.y*t.y)*(1/bs[0].mass+1/bs[1].mass),
    external=(bs[1].groundAcceleration.x-bs[0].groundAcceleration.x)*t.x+(bs[1].groundAcceleration.y-bs[0].groundAcceleration.y)*t.y;
  while(elapsed<h){
    if(phases.length>=8)return {ok:false,reason:'event-limit'};
    const r=remaining-elapsed,left=h-elapsed,
      terms=[(bs[1].velocity.x-bs[0].velocity.x)*t.x,(bs[1].velocity.y-bs[0].velocity.y)*t.y,-arms[0]*bs[0].spin,-arms[1]*bs[1].spin],
      u=terms.reduce((s,x)=>s+x,0),slipEps=32*Number.EPSILON*(1+terms.reduce((s,x)=>s+Math.abs(x),0)),
      direction=bs.map(b=>{const y=b.yaw;if(!y)return 0;const target=clamp((y.targetHeading-b.facing)/r,-y.turnRate,y.turnRate),d=target-b.spin,
        eps=32*Number.EPSILON*(1+Math.abs(b.spin)+(Math.abs(y.targetHeading)+Math.abs(b.facing))/r);return Math.abs(d)<=eps?0:Math.sign(d);});
    const ground=(i:number,F:number)=>{const b=bs[i],y=b.yaw;return !y?0:direction[i]?direction[i]*y.accelerationLimit:clamp(arms[i]*F/b.inertia,-y.accelerationLimit,y.accelerationLimit);};
    const rate=(F:number)=>external+mobility*F-arms[0]*(ground(0,F)-arms[0]*F/bs[0].inertia)-arms[1]*(ground(1,F)-arms[1]*F/bs[1].inertia);
    let F:number;
    if(limit===0)F=0;
    else if(Math.abs(u)>slipEps)F=-Math.sign(u)*limit;
    else if(rate(-limit)>=0)F=-limit;
    else if(rate(limit)<=0)F=limit;
    else {
      // The sticking equation is strictly increasing. Tracking motors add
      // at most four cap breakpoints; find its exact linear segment.
      const cuts=[-limit,limit];
      for(let i=0;i<2;i++){const y=bs[i].yaw;if(y&&!direction[i]&&arms[i]>0)for(const s of [-1,1]){const x=s*y.accelerationLimit*bs[i].inertia/arms[i];if(x>-limit&&x<limit)cuts.push(x);}}
      cuts.sort((a,b)=>a-b);F=0;
      for(let k=1;k<cuts.length;k++){const lo=cuts[k-1],hi=cuts[k],vl=rate(lo),vh=rate(hi);if(vl<=0&&vh>=0){F=clamp(lo-vl*(hi-lo)/(vh-vl),lo,hi);break;}}
    }
    const g:[number,number]=[ground(0,F),ground(1,F)],alpha=bs.map((b,i)=>g[i]-arms[i]*F/b.inertia),du=rate(F);
    let d=left;
    if(limit>0&&Math.abs(u)>slipEps&&u*du<0)d=Math.min(d,-u/du);
    for(let i=0;i<2;i++){
      const b=bs[i],y=b.yaw,a=alpha[i];if(!y||a===0)continue;
      const e=y.targetHeading-b.facing,q=e-r*b.spin;
      // q'=-remaining*angularAcceleration. Its first positive zero has a
      // stable quadratic root; the other possible target is the rate cap.
      if(q*a>0){const ratio=q/a,disc=r*r-2*ratio;if(disc>=0){const hit=2*ratio/(r+Math.sqrt(disc)),spin=b.spin+a*hit;
        if(hit>0&&hit<=left&&Math.abs(spin)<=y.turnRate&&direction[i]!==0)d=Math.min(d,hit);}}
      for(const s of [-1,1]){const hit=(s*y.turnRate-b.spin)/a;
        if(hit>0&&hit<=left&&s*(e-b.spin*hit-.5*a*hit*hit)/(r-hit)>=y.turnRate)d=Math.min(d,hit);}
    }
    if(!(d>0)||!Number.isFinite(d))return {ok:false,reason:'event-limit'};
    const phaseW=F*(u*d+.5*du*d*d);
    for(let i=0;i<2;i++){
      const b=bs[i],sign=i===0?-1:1,ax=b.groundAcceleration.x+sign*t.x*F/b.mass,ay=b.groundAcceleration.y+sign*t.y*F/b.mass,
        dx=b.velocity.x*d+.5*ax*d*d,dy=b.velocity.y*d+.5*ay*d*d,angle=b.spin*d+.5*alpha[i]*d*d,torque=b.inertia*g[i];
      if(b.yaw){const turning=alpha[i]===0?-1:-b.spin/alpha[i];
        if(Math.abs(b.yaw.targetHeading-(b.facing+angle))>=Math.PI
          ||(turning>0&&turning<d&&Math.abs(b.yaw.targetHeading-(b.facing+b.spin*turning+.5*alpha[i]*turning*turning))>=Math.PI))return {ok:false,reason:'heading-branch'};
      }
      LW[i]+=b.mass*(b.groundAcceleration.x*dx+b.groundAcceleration.y*dy);GW[i]+=torque*angle;
      G[i]+=torque*d;GM[i]+=torque*d*(h-elapsed-.5*d);GA[i]+=Math.abs(torque)*d;
      b.position.x+=dx;b.position.y+=dy;b.velocity.x+=ax*d;b.velocity.y+=ay*d;b.facing+=angle;b.spin+=alpha[i]*d;
    }
    phases.push({duration:d,force:F,groundAcceleration:g,slipBefore:u,slipAfter:u+du*d,work:phaseW});
    J+=F*d;M+=F*d*(h-elapsed-.5*d);A+=Math.abs(F)*d;W+=phaseW;elapsed+=d;
  }
  const change=energy(bs)-beforeE;
  return {ok:true,bodies:bs,phases,impulse:J,temporalMoment:M,absoluteImpulse:A,handWork:W,groundYawImpulse:G,groundYawTemporalMoment:GM,absoluteGroundYawImpulse:GA,groundYawWork:GW,legWork:LW,energyChange:change,workResidual:change-W-GW[0]-GW[1]-LW[0]-LW[1]};
}
