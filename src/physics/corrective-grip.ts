/** Separate experimental boundary for an issued corrective-foot command.
 * Scope: one below-slip, zero-tension tangent grip inside its reel-stop span.
 * Native feet owns allocation; support/recovery/fatigue laws remain native. */
import type {ActiveGripInput,ActiveGripResult} from './active-grip.js';
import {activeGripResultValid} from './active-grip.js';
import {boundedAttachment} from './bounded-attachment.js';
export interface CorrectiveGripInput extends ActiveGripInput {reelStopDistance:number;footCapacity:number;}
export interface CorrectiveGripResult extends ActiveGripResult {
  normalDose:number;correctionWork:number;viscousWork:number;positiveMotorWork:number;motorWorkBudget:number;
}
export type CorrectiveGripSolver=(q:CorrectiveGripInput)=>CorrectiveGripResult|undefined;
export function correctiveGripResultValid(q:CorrectiveGripInput,r:CorrectiveGripResult){
  if(!activeGripResultValid(q,r)||r.tangentSlip||![q.reelStopDistance,q.footCapacity,q.mobility,q.desired.x,q.desired.y,r.normalDose,r.correctionWork,r.viscousWork,r.positiveMotorWork,r.motorWorkBudget].every(Number.isFinite)
    ||q.reelStopDistance<0||q.reelStopDistance>q.reach||q.footCapacity<0||q.mobility<=0||r.positiveMotorWork<0
    ||Math.hypot(q.desired.x,q.desired.y)>q.mobility*q.footCapacity+1e-12||r.normalDose!==0||r.reelDose!==0||r.reelWork!==0||r.armCost!==0
    ||r.initialSpringEnergy!==0||r.springEnergy!==0||r.viscousWork>1e-12||r.positiveMotorWork<Math.max(0,r.motorWork)-1e-12
    ||Math.abs(r.motorWork-r.correctionWork-r.viscousWork)>1e-10)return false;
  const budget=(q.desired.x*q.desired.x+q.desired.y*q.desired.y)/(4*q.mobility)*q.duration;
  if(Math.abs(r.motorWorkBudget-budget)>1e-12||r.positiveMotorWork>budget+1e-12)return false;
  for(const [p,z]of [[q.b,q.material],[r.b,r.material]] as const){
    const a=p===q.b?q.a:r.a,m=boundedAttachment(z,q.attachmentReach).offset,c=Math.cos(p.facing),s=Math.sin(p.facing);
    if(Math.hypot(p.pos.x+c*m.x-s*m.y-a.pos.x,p.pos.y+s*m.x+c*m.y-a.pos.y)>q.reelStopDistance)return false;
  }
  return true;
}
