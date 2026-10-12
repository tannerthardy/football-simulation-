/** Diagnostic adapter only. One physical interval, solved to consistency;
 * rejected fixed-point trials never spend force/work or advance real bodies.
 * Preserve body, joint, plan and report identity when accepting a scratch solve.
 */
import {baseRadiusAt,omega0} from '../../../src/physics/support.js';
import {integrateContinuedRecovery,type RecoveryFlow,type RecoveryLoad} from './continued-recovery.js';
type Private=any;
const zero=()=>({x:0,y:0});

function memory(w:Private){
  return w.continuedRecovery??= {response:w.bodies.map((b:Private)=>Math.min(.12,b.support.out)),
    guess:w.bodies.map(()=>({force:zero(),source:zero()})),prepared:w.bodies.map(()=>null),
    actual:w.bodies.map(()=>null), iterations:0,residual:0};
}
function load(w:Private,i:number,speed:number,capacity:number,force:any,source:any):RecoveryLoad{
  const b=w.bodies[i],sp=w.sp[i];
  return {rb:baseRadiusAt(sp,b.support.posture),w:omega0(sp,b.support.posture),speed,capacity,
    mobility:sp.pushForce>0?sp.stepSpeed/sp.pushForce:0,latency:.12,force,source};
}
export function prepareContinuedRecovery(w:Private,i:number,h:number,speed:number,capacity:number){
  const m=memory(w),b=w.bodies[i],g=m.guess[i],params=load(w,i,speed,capacity,g.force,g.source);
  const initial={xi:{...b.support.xi},response:m.response[i]};
  const flow=integrateContinuedRecovery(initial,params,h);
  m.prepared[i]={initial,params,command:{x:flow.requested.x/h,y:flow.requested.y/h}};
  const foot=b.support.foot;if(!foot)return;
  foot.desired={...m.prepared[i].command};
  foot.target={x:foot.anchor.x+flow.requested.x,y:foot.anchor.y+flow.requested.y};
  foot.state=Math.hypot(b.support.xi.x,b.support.xi.y)>params.rb/2?'placing':'supported';
  // Original prepareRecovery allocated this reserve only outside the base.
  // A continuing placement inside must spend the SAME existing reserve.
  if(Math.hypot(b.support.xi.x,b.support.xi.y)<=params.rb&&Math.hypot(foot.desired.x,foot.desired.y)>0)
    w.report.supportMotorWorkLimit[i]+=capacity*speed*h;
}
export function updateContinuedRecovery(w:Private,i:number,h:number,before:any,phase:any):RecoveryFlow{
  const m=memory(w),b=w.bodies[i],prepared=m.prepared[i];
  const force=b.support.foot?{...b.support.foot.force}:zero();
  const source={x:phase.delta.x/h,y:phase.delta.y/h};
  const params=load(w,i,w.recovery[i],prepared?.params.capacity??0,force,source);
  if(!prepared)params.mobility=0; // An airborne/launch interval has no active motor.
  const flow=integrateContinuedRecovery({xi:{...before.support.xi},response:m.response[i]},params,h);
  m.actual[i]={force,source,command:{x:flow.requested.x/h,y:flow.requested.y/h},flow};
  m.guess[i]={force,source};
  m.response[i]=flow.state.response;
  b.support.xi={...flow.state.xi};b.support.out=flow.state.response;
  return flow;
}

function snapshot(w:Private,args:any[]){
  const fields={...w};delete fields.attachments;
  const attachments=w.joints.map((j:Private)=>[j,w.attachments.get(j)]);
  return {fields,args,attachments};
}
function scratch(packet:any,prototype:any){
  const c=structuredClone(packet),w=Object.assign(Object.create(prototype),c.fields);
  w.attachments=new WeakMap(c.attachments.filter((p:any)=>p[1]));
  return {w,args:c.args};
}
function accept(original:Private,args:any[],trial:Private,trialArgs:any[]){
  const pinned=new Map<any,any>([[trial,original],[trial.bodies,original.bodies],[trialArgs[2],args[2]],
    [trialArgs[5],args[5]],[trialArgs[6],args[6]]]);
  trial.bodies.forEach((b:Private,i:number)=>{pinned.set(b,original.bodies[i]);pinned.set(b.profile,original.bodies[i].profile);});
  trial.joints.forEach((j:Private,i:number)=>pinned.set(j,original.joints[i]));
  trialArgs[2].forEach((p:any,i:number)=>pinned.set(p,args[2][i]));
  const done=new Map<any,any>();
  const remap=(value:any):any=>{
    if(value===null||typeof value!=='object')return value;
    if(done.has(value))return done.get(value);
    let target=pinned.get(value);
    if(value instanceof WeakMap)return value; // Handled through explicit entries below.
    if(ArrayBuffer.isView(value))return value;
    target??=value instanceof Map?new Map():value instanceof Set?new Set():Array.isArray(value)?[]:{};
    done.set(value,target);
    if(value instanceof Map){target.clear();for(const [k,v]of value)target.set(remap(k),remap(v));}
    else if(value instanceof Set){target.clear();for(const v of value)target.add(remap(v));}
    else for(const key of Object.keys(value))target[key]=remap(value[key]);
    return target;
  };
  // Keep live joint identities; World never creates/reorders them in an interval.
  const attachments=trial.joints.map((j:Private)=>[j,trial.attachments.get(j)]);
  const fields={...trial};delete fields.attachments;
  for(const key of Object.keys(fields))original[key]=remap(fields[key]);
  original.attachments=new WeakMap(attachments.filter((p:any)=>p[1]).map(([j,a]:any)=>[remap(j),remap(a)]));
  remap(trialArgs[2]);remap(trialArgs[5]);remap(trialArgs[6]);
}

export function coupledRecoveryInterval(w:Private,args:any[],execute:(trial:Private,args:any[])=>void){
  const m=memory(w),ids:number[]=args[0];
  for(const i of ids){m.prepared[i]=null;m.actual[i]=null;}
  if(!ids.some(i=>w.bodies[i].support.foot)){execute(w,args);return {iterations:1,residual:0};}
  const original=snapshot(w,args);let guess=structuredClone(m.guess);
  for(let iteration=1;iteration<=24;iteration++){
    const {w:trial,args:ta}=scratch(original,Object.getPrototypeOf(w));
    trial.continuedRecovery.guess=guess;
    execute(trial,ta);
    let residual=0;
    for(const i of ids){
      const actual=trial.continuedRecovery.actual[i],prepared=trial.continuedRecovery.prepared[i];
      if(!actual||!prepared)continue;
      residual=Math.max(residual,Math.hypot(actual.command.x-prepared.command.x,actual.command.y-prepared.command.y));
    }
    if(residual<=1e-9){
      trial.continuedRecovery.iterations=iteration;trial.continuedRecovery.residual=residual;
      accept(w,args,trial,ta);return {iterations:iteration,residual};
    }
    guess=guess.map((old:any,i:number)=>trial.continuedRecovery.actual[i]?
      {force:trial.continuedRecovery.actual[i].force,source:trial.continuedRecovery.actual[i].source}:old);
  }
  throw Error('Continued recovery/contact coupling did not converge in 24 local trials');
}
