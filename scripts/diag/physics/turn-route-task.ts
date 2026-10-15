/** Fixed-load yaw task under the existing motor. Instrumented diagnostic,
 * not a new movement/contact/recovery law or game runtime benchmark. */
import {turnRoute,signedAngle,servoCruiseRate} from './turn-route-model.js';
import {turnBodyResponse,YAW_RESPONSE} from '../../../src/physics/actuation.js';
import {supportParams,baseRadiusAt} from '../../../src/physics/support.js';
import {recoveryFixture} from './grip-recovery-input.js';
import {turnRateOf,type Body} from '../../../src/physics/kinematics.js';
export function availableYaw(b:Body,available:number,force:number){
  const p=supportParams(b.profile),r=baseRadiusAt(p,b.support!.posture),rate=turnRateOf(b),
    torque=Math.sqrt(Math.max(0,(p.traction*available)**2-force*force))*r;
  return Math.min(rate/YAW_RESPONSE*(.3+.7*available),torque/p.yawInertia);
}
export interface TurnTask {id:string;history?:'previous'|'transition';facing?:number;spin?:number;target:number;reverseAt?:number;reverseTarget?:number;mirror?:boolean;available?:number;force?:number;}
export function turnTask(c:TurnTask,mode:'shortest'|'arrival',substeps=96){
  const v=recoveryFixture(c.history??'previous'),b:Body=structuredClone(v.w.bodies[0]);
  if(c.facing!==undefined)b.facing=c.facing;if(c.spin!==undefined)b.spin=c.spin;
  const available=c.available??v.w.alpha[0],force=c.force??Math.hypot(v.w.amx[0],v.w.amy[0])*v.w.mass[0],mirror=c.mirror?-1:1;
  b.facing*=mirror;b.spin=(b.spin??0)*mirror;const initial=structuredClone(b),rate=turnRateOf(b),A=availableYaw(b,available,force),I=supportParams(b.profile).yawInertia,
    trace:any[]=[],h=.05/substeps;let totalWork=0,absoluteWork=0,peak=0,held=0,finish:number|null=null,reversalTime:number|null=null;
  for(let k=0;k<100;k++){
    const time=k*.05,target=(c.reverseAt!==undefined&&time>=c.reverseAt?c.reverseTarget!:c.target)*mirror,
      route=turnRoute(target-b.facing,b.spin??0,A,servoCruiseRate(rate,.05,YAW_RESPONSE)),d=mode==='arrival'?route.delta:route.shortest,
      requested=b.facing+Math.min(rate*.05,Math.max(-rate*.05,d));
    trace.push({time,facing:b.facing,spin:b.spin,target,delta:d,route});
    for(let j=0;j<substeps;j++){
      const r=turnBodyResponse(b,requested,h,rate,available,force),t=time+(j+1)*h;
      totalWork+=r.work;absoluteWork+=Math.abs(r.work);peak=Math.max(peak,r.peakTorque);
      if(c.reverseAt!==undefined&&time>=c.reverseAt&&reversalTime===null&&(b.spin??0)*mirror<0)reversalTime=t;
      const finalTarget=(c.reverseAt===undefined||time>=c.reverseAt)&&Math.abs(signedAngle(target-b.facing))<=.01&&Math.abs(b.spin??0)<=.02;
      held=finalTarget?held+h:0;if(held>=.1-1e-12){finish=t;break;}
    }
    if(finish!==null)break;
  }
  return {id:c.id,mode,initial,finish,reversalTime,final:{facing:b.facing,spin:b.spin},available,force,A,rate,totalWork,absoluteWork,peak,
    energyResidual:.5*I*((b.spin??0)**2-(initial.spin??0)**2)-totalWork,trace};
}
export const turnTasks:TurnTask[]=[
  {id:'saved-previous',history:'previous',target:0},{id:'saved-transition',history:'transition',target:0},
  {id:'mirror-previous',history:'previous',target:0,mirror:true},{id:'mirror-transition',history:'transition',target:0,mirror:true},
  {id:'normal',facing:.4,spin:0,target:1},{id:'incoming-toward',facing:.4,spin:2,target:1.2},
  {id:'deliberate-reversal',facing:.4,spin:-2,target:1.2},
  {id:'changed-command',facing:.4,spin:2,target:1.2,reverseAt:.15,reverseTarget:-.6},
  {id:'near-target',facing:0,spin:.1,target:0},{id:'low-torque',facing:-Math.PI+.01,spin:-1.3,target:0,available:.2,force:0},
];
