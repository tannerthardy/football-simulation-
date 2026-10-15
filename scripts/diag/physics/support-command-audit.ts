/** Causal replay only. Saved requests and the validated grip integrator stay
 * fixed except for explicitly labelled diagnostic interventions. No tuning. */
import assert from 'node:assert/strict';
import {recoveryFixture,issuedRecoveryInput,type RecoveryGripInput} from './grip-recovery-input.js';
import {recoverySpanInterval,recoverySpanReference,recoverySpanDifference} from './grip-recovery-span.js';
import {baseRadiusAt,omega0} from '../../../src/physics/support.js';
import {commandFacing,driveAccel,fatigueFactor,turnRateOf} from '../../../src/physics/kinematics.js';
import {angleDiff} from '../../../src/core/vec.js';
import {integrateYaw} from '../../../src/physics/yaw-response.js';
import {YAW_RESPONSE} from '../../../src/physics/actuation.js';
export type History='previous'|'transition';
export type Intervention='none'|'xi'|'held-yaw'|'holder-yaw'|'material'|'filters'|'body-pose'|'body-velocity';
const norm=(a:{x:number;y:number},b={x:0,y:0})=>Math.hypot(a.x-b.x,a.y-b.y);
function opposite(h:History):History{return h==='previous'?'transition':'previous';}
const sum=(v:number[])=>v.reduce((s,x)=>s+x,0);
function energy(w:any){return w.bodies.reduce((s:number,b:any,i:number)=>s+.5*w.mass[i]*norm(b.vel)**2+.5*w.inertia[i]*(b.spin??0)**2,0);}
function ledger(w:any){return sum(w.report.groundWork)+sum(w.report.groundYawWork)+['grasps','hands','strikes','contacts'].reduce((s,k)=>s+w.report.work[k],0);}
/** Independent evaluation of the declared acceleration-follow ellipse. */
function followed(b:any,a:{x:number;y:number},capacity:number,cut:number){
  const p=b.profile,s=norm(b.vel),fat=fatigueFactor(b.energy),m=norm(a);
  if(m<1e-12)return {x:0,y:0};
  if(s<.35){const limit=Math.max(driveAccel(p,s,p.vmax*fat)*fat,p.brake*.5)*capacity,k=Math.min(1,limit/m);return {x:a.x*k,y:a.y*k};}
  const tx=b.vel.x/s,ty=b.vel.y/s,at=a.x*tx+a.y*ty,an=-a.x*ty+a.y*tx,
    A=(at>=0?Math.max(driveAccel(p,s,p.vmax*fat)*fat,.01):p.brake*(.85+.15*fat))*capacity,
    B=p.lateral*cut*(1-.2*Math.min(1,Math.max(0,s/p.vmax)))*(.85+.15*fat)*capacity,
    k=Math.min(1,1/Math.hypot(at/Math.max(A,1e-9),an/Math.max(B,1e-9)));
  return {x:k*a.x,y:k*a.y};
}
/** Independent closed-form balance equation for this saved, fully ramped,
 * outside-base phase. It deliberately refuses other recovery phases. */
export function supportEquation(w:any,i:number,h:number){
  const b=w.bodies[i],s=b.support,sp=w.sp[i],foot=s.foot,w0=omega0(sp,s.posture),rb=baseRadiusAt(sp,s.posture),
    acceleration={x:(b.vel.x-w.v0x[i])/h,y:(b.vel.y-w.v0y[i])/h},decay=Math.exp(-h/.04),mean=.04/h*(1-decay),
    filtered={x:acceleration.x+((s.accel?.x??0)-acceleration.x)*mean,y:acceleration.y+((s.accel?.y??0)-acceleration.y)*mean},
    follow=followed(b,filtered,Math.max(w.alpha[i],.1)*1.1,w.cut[i]),
    tip={x:w.tipX[i]/h+((s.tipAccel?.x??0)-w.tipX[i]/h)*mean,y:w.tipY[i]/h+((s.tipAccel?.y??0)-w.tipY[i]/h)*mean},
    D={x:((filtered.x-follow.x+tip.x)*h+w.tripX[i])/w0,y:((filtered.y-follow.y+tip.y)*h+w.tripY[i])/w0},
    midpoint={x:s.xi.x+D.x/2,y:s.xi.y+D.y/2},e=norm(midpoint),n={x:midpoint.x/e,y:midpoint.y/e},
    load={x:foot.achieved.x-foot.desired.x,y:foot.achieved.y-foot.desired.y},radial=load.x*n.x+load.y*n.y,
    equilibrium=rb+(w.recovery[i]+radial)/w0,next=equilibrium+(e-equilibrium)*Math.exp(w0*h),weight=Math.expm1(w0*h)/w0;
  assert(s.out>=.12&&e>rb&&next>rb&&norm(b.vel)<=b.profile.vmax*w.fat[i]*1.05&&w.thighX[i]===0&&w.thighY[i]===0);
  return {xi:{x:n.x*next-(load.x-radial*n.x)*weight+D.x/2,y:n.y*next-(load.y-radial*n.y)*weight+D.y/2},
    contributions:{acceleration:filtered,follow,tip,contactShift:D,radialLoad:radial,recoverySpeed:w.recovery[i],gravityRate:w0},
    nextAccel:{x:acceleration.x+((s.accel?.x??0)-acceleration.x)*decay,y:acceleration.y+((s.accel?.y??0)-acceleration.y)*decay}};
}
export function supportReplay(history:History,intervention:Intervention='none',epsilon=0,instrument=true){
  const v=recoveryFixture(history),other=recoveryFixture(opposite(history)),w=v.w;
  assert(w.joints[0].b===w.bodies[0]); // Callback b is the held runner, World index0.
  delete w.activeGrip;w.correctiveGrip=recoverySpanInterval;
  if(intervention==='xi')w.bodies[0].support.xi={...other.w.bodies[0].support.xi};
  if(intervention==='held-yaw')v.args[2][0].facing=other.args[2][0].facing;
  if(intervention==='holder-yaw')v.args[2][1].facing=other.args[2][1].facing;
  if(intervention==='material')w.attachments.get(w.joints[0]).material={...other.w.attachments.get(other.w.joints[0]).material};
  if(intervention==='filters')for(let i=0;i<2;i++)for(const k of ['accel','tipAccel','felt','feltTip','lean','load','out'])w.bodies[i].support[k]=structuredClone(other.w.bodies[i].support[k]);
  if(intervention==='body-pose')for(let i=0;i<2;i++)for(const k of ['pos','facing','spin'])w.bodies[i][k]=structuredClone(other.w.bodies[i][k]);
  if(intervention==='body-velocity')for(let i=0;i<2;i++)w.bodies[i].vel={...other.w.bodies[i].vel};
  w.bodies[0].support.xi.x+=epsilon;
  const initial=structuredClone(w.bodies),trace:any[]=[],originalPlan=v.args[2].map((p:any)=>({...p}));let row:any;
  if(instrument){
    const feet=w.feet,prepare=w.prepareRecovery,support=w.updateSupport,solve=w.tryActiveGrip;
    w.feet=function(i:number,...a:any[]){const before=structuredClone(this.bodies[i]),r=feet.call(this,i,...a);
      row.ground[i]={before,after:structuredClone(this.bodies[i]),alpha:this.alpha[i],force:{x:this.amx[i]*this.mass[i],y:this.amy[i]*this.mass[i]}};return r;};
    w.prepareRecovery=function(i:number,h:number,capacity:number){const s=this.bodies[i].support,before=structuredClone(s),r=prepare.call(this,i,h,capacity);
      row.commands[i]={before,capacity,after:structuredClone(s),speed:r};return r;};
    w.tryActiveGrip=function(ids:number[],starts:any[],plans:any[],h:number,report:any,...rest:any[]){
      row.input=issuedRecoveryInput(this,ids,starts,plans,h,report);return solve.call(this,ids,starts,plans,h,report,...rest);};
    w.updateSupport=function(i:number,h:number,report:any){
      const before=structuredClone(this.bodies[i].support),expected=i===0?supportEquation(this,i,h):undefined,r=support.call(this,i,h,report),after=structuredClone(this.bodies[i].support);
      row.balance[i]={before,after,expected,error:expected?norm(after.xi,expected.xi):0,filterError:expected?norm(after.accel,expected.nextAccel):0};return r;};
  }
  for(let k=0;k<96;k++){
    row={k,time:w.time,ground:[],commands:[],balance:[]};const before=energy(w)-ledger(w),args=[...v.args];args[4]-=k*args[3];w.integrateSubstep(...args);
    row.energyResidual=energy(w)-ledger(w)-before;
    if(instrument){
      const q:RecoveryGripInput=row.input,g=q.ground[1],b=row.ground[0].before,sp=w.sp[0],h=args[3],F=norm(g.force),
        yaw=integrateYaw(angleDiff(b.facing,g.target),b.spin??0,h,YAW_RESPONSE,g.acceleration,g.rate),
        yawForce=w.inertia[0]*yaw.maxAcceleration/baseRadiusAt(sp,row.commands[0].before.posture),
        reserve=Math.sqrt(Math.max(0,Math.min(sp.pushForce**2-F**2,sp.traction**2-F**2-yawForce**2)));
      row.reserveResidual=reserve-row.commands[0].capacity;
      row.budget={force:F,yawForce,reserve:row.commands[0].capacity,strengthExcess:F*F+row.commands[0].capacity**2-sp.pushForce**2,
        tractionExcess:F*F+yawForce*yawForce+row.commands[0].capacity**2-sp.traction**2,
        commandExcess:norm(q.desired)-q.mobility*q.footCapacity};
      trace.push(row);
    }
  }
  return {history,intervention,epsilon,initial,plans:originalPlan,bodies:structuredClone(w.bodies),report:structuredClone(w.report),
    attachment:structuredClone(w.attachments.get(w.joints[0])),trace};
}
export function facingWitness(history:History){
  const v=recoveryFixture(history),w=v.w,b=w.bodies[0],intent=v.args[1][0],
    out:Array<{shift:number;requestedError:number;command:number;target:number}>=[];
  for(const shift of [0,2*Math.PI,-2*Math.PI]){
    const copy=structuredClone(b);copy.facing+=shift;const plan=w.plan(copy,0,intent,.05);
    out.push({shift,requestedError:plan.facing-copy.facing,command:commandFacing(copy,intent),target:plan.facing});
  }
  assert(Math.max(...out.map(p=>Math.abs(p.requestedError-out[0].requestedError)))<2e-15);
  return {history,heading:b.facing,spin:b.spin,antipodeMargin:b.facing+Math.PI,requestedTurn:v.args[2][0].facing-b.facing,
    command:commandFacing(b,intent),rate:turnRateOf(b),periodic:out};
}
export function smallFacingControl(history:History,offset:number){
  const v=recoveryFixture(history),w=v.w,b=w.bodies[0];b.facing=-Math.PI+.1+offset;
  return w.plan(b,0,v.args[1][0],.05).facing-b.facing;
}
export function replayDifference(a:ReturnType<typeof supportReplay>,b:ReturnType<typeof supportReplay>){
  return {xi:norm(a.bodies[0].support.xi,b.bodies[0].support.xi),position:norm(a.bodies[0].pos,b.bodies[0].pos),
    initialXi:norm(a.initial[0].support.xi,b.initial[0].support.xi)};
}
export function checkReplay(r:ReturnType<typeof supportReplay>){
  const maximum=(f:(t:any)=>number)=>Math.max(...r.trace.map(f));
  return {energy:maximum(t=>Math.abs(t.energyResidual)),support:maximum(t=>t.balance[0].error),filter:maximum(t=>t.balance[0].filterError),
    reserve:maximum(t=>Math.abs(t.reserveResidual)),strengthExcess:maximum(t=>t.budget.strengthExcess),tractionExcess:maximum(t=>t.budget.tractionExcess),commandExcess:maximum(t=>t.budget.commandExcess)};
}
export function checkIntervalReference(q:RecoveryGripInput){
  try{const candidate=recoverySpanInterval(q),lo=recoverySpanReference(q,1024),hi=recoverySpanReference(q,2048);
    return {error:recoverySpanDifference(candidate,hi),refinement:recoverySpanDifference(lo,hi),bodyWork:candidate.bodyWork,motorWork:candidate.motorWork};
  }catch(e){return {refused:String(e)};}
}
