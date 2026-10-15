/** A frozen-frame numerical candidate, not a World path. Select with slip and
 * angular state; reconstruct full body motion once from impulse/moments.
 * The same phase history carries work and absolute force/torque amounts. */
import type {MotorBody,MotorField,MotorPhase,MotorResult} from './local-slip-motor.js';
type Pair=[number,number];
type Failure={ok:false;reason:'controller-deadline'|'heading-branch'|'event-limit'};
export interface MotorSchedule {
  readonly ok:true;
  /** Owned starting snapshot; subsequent edits to the caller's field do not
   * change application. Treat this and the phase schedule as immutable. */
  readonly initial:MotorField;
  readonly phases:MotorPhase[];
  readonly impulse:number;readonly temporalMoment:number;readonly absoluteImpulse:number;readonly handWork:number;
  readonly groundYawImpulse:Pair;readonly groundYawTemporalMoment:Pair;readonly absoluteGroundYawImpulse:Pair;readonly groundYawWork:Pair;
}
const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));

export function selectMotorEvents(field:MotorField):MotorSchedule|Failure {
  const {duration:h,remaining,tangent:t,arms,forceLimit:limit}=field;
  if(!Number.isFinite(h)||h<0||!Number.isFinite(remaining)||remaining<=0||!Number.isFinite(limit)||limit<0
    ||field.bodies.length!==2||arms.length!==2||!arms.every(a=>Number.isFinite(a)&&a>=0)
    ||!Number.isFinite(t.x+t.y)||Math.abs(t.x*t.x+t.y*t.y-1)>1e-12
    ||field.bodies.some(b=>!(b.mass>0&&b.inertia>0)||![b.mass,b.inertia,b.position.x,b.position.y,b.velocity.x,b.velocity.y,b.facing,b.spin,b.groundAcceleration.x,b.groundAcceleration.y].every(Number.isFinite)
      ||(b.yaw&&(![b.yaw.targetHeading,b.yaw.turnRate,b.yaw.accelerationLimit].every(Number.isFinite)||b.yaw.turnRate<=0||b.yaw.accelerationLimit<0))))throw new RangeError('Invalid local motor field');
  const bs=field.bodies.map(b=>({...b,position:{...b.position},velocity:{...b.velocity},groundAcceleration:{...b.groundAcceleration},...(b.yaw?{yaw:{...b.yaw}}:{})})) as [MotorBody,MotorBody];
  const initial:MotorField={...field,tangent:{...t},arms:[...arms],bodies:bs},phases:MotorPhase[]=[],
    spin:Pair=[bs[0].spin,bs[1].spin],error:Pair=bs.map(b=>b.yaw?b.yaw.targetHeading-b.facing:0) as Pair,
    G:Pair=[0,0],GM:Pair=[0,0],GA:Pair=[0,0],GW:Pair=[0,0],direction:Pair=[0,0],alpha:Pair=[0,0];
  if(h>0&&bs.some(b=>b.yaw)&&h>=remaining)return {ok:false,reason:'controller-deadline'};
  if(error.some(e=>Math.abs(e)>=Math.PI))return {ok:false,reason:'heading-branch'};
  const tx=(bs[1].velocity.x-bs[0].velocity.x)*t.x,ty=(bs[1].velocity.y-bs[0].velocity.y)*t.y,
    ta=-arms[0]*spin[0],tb=-arms[1]*spin[1],
    slipEps=32*Number.EPSILON*(1+Math.abs(tx)+Math.abs(ty)+Math.abs(ta)+Math.abs(tb)),
    mobility=(t.x*t.x+t.y*t.y)*(1/bs[0].mass+1/bs[1].mass),
    external=(bs[1].groundAcceleration.x-bs[0].groundAcceleration.x)*t.x+(bs[1].groundAcceleration.y-bs[0].groundAcceleration.y)*t.y;
  let u=((tx+ty)+ta)+tb,elapsed=0,J=0,M=0,A=0,W=0;
  const ground=(i:number,F:number)=>{const y=bs[i].yaw;return !y?0:direction[i]?direction[i]*y.accelerationLimit:clamp(arms[i]*F/bs[i].inertia,-y.accelerationLimit,y.accelerationLimit);};
  const rate=(F:number)=>external+mobility*F-arms[0]*(ground(0,F)-arms[0]*F/bs[0].inertia)-arms[1]*(ground(1,F)-arms[1]*F/bs[1].inertia);
  while(elapsed<h){
    if(phases.length>=8)return {ok:false,reason:'event-limit'};
    const r=remaining-elapsed,left=h-elapsed;
    for(let i=0;i<2;i++){const y=bs[i].yaw;if(!y){direction[i]=0;continue;}
      const target=clamp(error[i]/r,-y.turnRate,y.turnRate),d=target-spin[i],
        // Keep the reference's floating classification bound, including its
        // equivalent-heading representation allowance; no behavioral deadband.
        eps=32*Number.EPSILON*(1+Math.abs(spin[i])+(Math.abs(y.targetHeading)+Math.abs(y.targetHeading-error[i]))/r);
      direction[i]=Math.abs(d)<=eps?0:Math.sign(d);
    }
    let F:number;
    if(limit===0)F=0;else if(Math.abs(u)>slipEps)F=-Math.sign(u)*limit;
    else if(rate(-limit)>=0)F=-limit;else if(rate(limit)<=0)F=limit;
    else {const cuts=[-limit,limit];for(let i=0;i<2;i++){const y=bs[i].yaw;if(y&&!direction[i]&&arms[i]>0)for(let s=-1;s<=1;s+=2){const x=s*y.accelerationLimit*bs[i].inertia/arms[i];if(x>-limit&&x<limit)cuts.push(x);}}
      if(cuts.length>2)cuts.sort((a,b)=>a-b);F=0;
      for(let k=1;k<cuts.length;k++){const lo=cuts[k-1],hi=cuts[k],vl=rate(lo),vh=rate(hi);if(vl<=0&&vh>=0){F=clamp(lo-vl*(hi-lo)/(vh-vl),lo,hi);break;}}
    }
    const g:Pair=[ground(0,F),ground(1,F)],du=rate(F);for(let i=0;i<2;i++)alpha[i]=g[i]-arms[i]*F/bs[i].inertia;
    let d=left;
    if(limit>0&&Math.abs(u)>slipEps&&u*du<0)d=Math.min(d,-u/du);
    for(let i=0;i<2;i++){const y=bs[i].yaw,a=alpha[i];if(!y||a===0)continue;
      const q=error[i]-r*spin[i];if(q*a>0){const ratio=q/a,disc=r*r-2*ratio;if(disc>=0){const hit=2*ratio/(r+Math.sqrt(disc)),w=spin[i]+a*hit;if(hit>0&&hit<=left&&Math.abs(w)<=y.turnRate&&direction[i]!==0)d=Math.min(d,hit);}}
      for(let s=-1;s<=1;s+=2){const hit=(s*y.turnRate-spin[i])/a;if(hit>0&&hit<=left&&s*(error[i]-spin[i]*hit-.5*a*hit*hit)/(r-hit)>=y.turnRate)d=Math.min(d,hit);}
    }
    if(!(d>0)||!Number.isFinite(d))return {ok:false,reason:'event-limit'};
    const phaseW=F*(u*d+.5*du*d*d);
    for(let i=0;i<2;i++){const angle=spin[i]*d+.5*alpha[i]*d*d,y=bs[i].yaw,turning=alpha[i]===0?-1:-spin[i]/alpha[i];
      if(y&&(Math.abs(error[i]-angle)>=Math.PI||(turning>0&&turning<d&&Math.abs(error[i]-spin[i]*turning-.5*alpha[i]*turning*turning)>=Math.PI)))return {ok:false,reason:'heading-branch'};
      const torque=bs[i].inertia*g[i];G[i]+=torque*d;GM[i]+=torque*d*(h-elapsed-.5*d);GA[i]+=Math.abs(torque)*d;GW[i]+=torque*angle;
      error[i]-=angle;spin[i]+=alpha[i]*d;
    }
    phases.push({duration:d,force:F,groundAcceleration:g,slipBefore:u,slipAfter:u+du*d,work:phaseW});
    J+=F*d;M+=F*d*(h-elapsed-.5*d);A+=Math.abs(F)*d;W+=phaseW;u+=du*d;elapsed+=d;
  }
  return {ok:true,initial,phases,impulse:J,temporalMoment:M,absoluteImpulse:A,handWork:W,groundYawImpulse:G,groundYawTemporalMoment:GM,absoluteGroundYawImpulse:GA,groundYawWork:GW};
}

/** Apply a selected history once mathematically. No impulse/work projection or
 * fatigue application. Repeating this pure function returns the same endpoint;
 * a future World adapter must own mutation and exactly-once charging. */
export function applyMotorEvents(s:MotorSchedule):Extract<MotorResult,{ok:true}> {
  const f=s.initial,h=f.duration,t=f.tangent,bs:MotorBody[]=[],LW:Pair=[0,0];let before=0,after=0;
  for(let i=0;i<2;i++){const b=f.bodies[i],sign=i===0?-1:1,
    dx=b.velocity.x*h+.5*b.groundAcceleration.x*h*h+sign*t.x*s.temporalMoment/b.mass,
    dy=b.velocity.y*h+.5*b.groundAcceleration.y*h*h+sign*t.y*s.temporalMoment/b.mass,
    vx=b.velocity.x+b.groundAcceleration.x*h+sign*t.x*s.impulse/b.mass,vy=b.velocity.y+b.groundAcceleration.y*h+sign*t.y*s.impulse/b.mass,
    w=b.spin+(s.groundYawImpulse[i]-f.arms[i]*s.impulse)/b.inertia,
    angle=b.spin*h+(s.groundYawTemporalMoment[i]-f.arms[i]*s.temporalMoment)/b.inertia;
    before+=.5*b.mass*(b.velocity.x**2+b.velocity.y**2)+.5*b.inertia*b.spin**2;after+=.5*b.mass*(vx**2+vy**2)+.5*b.inertia*w*w;
    LW[i]=b.mass*(b.groundAcceleration.x*dx+b.groundAcceleration.y*dy);
    bs.push({...b,position:{x:b.position.x+dx,y:b.position.y+dy},velocity:{x:vx,y:vy},facing:b.facing+angle,spin:w});
  }
  const change=after-before;
  return {ok:true,bodies:bs as [MotorBody,MotorBody],phases:s.phases,impulse:s.impulse,temporalMoment:s.temporalMoment,absoluteImpulse:s.absoluteImpulse,handWork:s.handWork,
    groundYawImpulse:s.groundYawImpulse,groundYawTemporalMoment:s.groundYawTemporalMoment,absoluteGroundYawImpulse:s.absoluteGroundYawImpulse,groundYawWork:s.groundYawWork,legWork:LW,energyChange:change,
    workResidual:change-s.handWork-s.groundYawWork[0]-s.groundYawWork[1]-LW[0]-LW[1]};
}
export function integrateMotorEvents(f:MotorField):MotorResult {const s=selectMotorEvents(f);return s.ok?applyMotorEvents(s):s;}
