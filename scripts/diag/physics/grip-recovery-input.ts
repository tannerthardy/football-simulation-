/** Read actual post-feet allocation without bypassing World's recovery guard. */
import {readFileSync} from 'node:fs';
import {deserialize} from 'node:v8';
import {World,CONTACT_SCALE} from '../../../src/physics/world.js';
import {angleDiff} from '../../../src/core/vec.js';
import {turnRateOf} from '../../../src/physics/kinematics.js';
import {baseRadiusAt} from '../../../src/physics/support.js';
import {YAW_RESPONSE} from '../../../src/physics/actuation.js';
import type {ActiveGripInput} from '../../../src/physics/active-grip.js';
import {sha} from './grip-bounded-fixtures.js';
export type {CorrectiveGripInput as RecoveryGripInput} from '../../../src/physics/corrective-grip.js';
import type {CorrectiveGripInput as RecoveryGripInput} from '../../../src/physics/corrective-grip.js';
export function recoveryFixture(history='previous',phase=0){
  const manifest=JSON.parse(readFileSync('config/grip-native-support-packets.json','utf8')),c=manifest.cases.find((c:any)=>c.history===history);
  if(!c)throw Error('Missing recovery history');const bytes=Buffer.from(c.input,'base64');if(sha(bytes)!==c.inputSha256)throw Error('Recovery input changed');
  const p=deserialize(bytes),w:any=Object.assign(Object.create(World.prototype),p.fields);w.attachments=new WeakMap(p.attachments);w.activeGrip=()=>undefined;
  for(let k=0;k<phase;k++){const a=[...p.args];a[4]-=k*a[3];w.integrateSubstep(...a);}
  const args=[...p.args];args[4]-=phase*args[3];return {w,p,args,checksum:c.inputSha256,history,phase};
}
export function issuedRecoveryInput(w:any,ids:number[],starts:ActiveGripInput['a'][],plans:any[],h:number,report:any):RecoveryGripInput{
  const j=w.joints[0],i=w.indexOf(j.a),k=w.indexOf(j.b),at=w.attachments.get(j),foot=j.b.support.foot,
    ground=(idx:number,s:ActiveGripInput['a'])=>{const force={x:w.amx[idx]*w.mass[idx],y:w.amy[idx]*w.mass[idx]},available=w.alpha[idx],rate=turnRateOf(w.bodies[idx]),
      magnitude=Math.hypot(force.x,force.y),torque=Math.sqrt(Math.max(0,(w.sp[idx].traction*available)**2-magnitude*magnitude))*baseRadiusAt(w.sp[idx],w.bodies[idx].support.posture);
      return {force,target:s.facing+angleDiff(s.facing,plans[idx].facing),rate,acceleration:plans[idx].free?0:Math.min(rate/YAW_RESPONSE*(.3+.7*available),torque/w.inertia[idx])};};
  return {a:starts[ids.indexOf(i)],b:starts[ids.indexOf(k)],material:{...at.material},footOffset:{...foot.offset},mobility:foot.mobility,desired:{...foot.desired},
    reelStopDistance:CONTACT_SCALE*(j.a.profile.radius+j.b.profile.radius),footCapacity:foot.capacity,
    capacity:w.gripCapacity(j),duration:h,minimumDistance:CONTACT_SCALE*1.12*(j.a.profile.radius+j.b.profile.radius),reach:j.reach,attachmentReach:w.sp[k].comHeight,
    hold:j.hold,legs:j.legs,...(j.recoveryCoupling===undefined?{}:{recoveryCoupling:j.recoveryCoupling}),pullSpeed:j.pull??0,
    ground:[ground(i,starts[ids.indexOf(i)]),ground(k,starts[ids.indexOf(k)])],tickDuration:w.tickDt,armCapacity:w.armCap[i]*w.armScale[i],
    armWorkRemaining:Math.max(0,report.armWorkLimit[i]-report.armWork[i])};
}
export function watchRecoveryInput(w:any,receive:(q:RecoveryGripInput)=>void){
  const original=w.tryActiveGrip;w.tryActiveGrip=function(ids:number[],starts:ActiveGripInput['a'][],plans:any[],h:number,report:any,...rest:any[]){
    receive(issuedRecoveryInput(this,ids,starts,plans,h,report));return original.call(this,ids,starts,plans,h,report,...rest);
  };
}
