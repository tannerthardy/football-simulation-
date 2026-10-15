import {describe,it,expect} from 'vitest';
import {World,type GraspJoint} from '../src/physics/world.js';
import {newSupport} from '../src/physics/support.js';
import type {Body} from '../src/physics/kinematics.js';
const p={massKg:100,radius:.3,reach:1.6,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,
 backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4,getUp:.9};
function scene(handContact:'center'|'patch',parked=true){
 const bs:Body[]=(parked?[0,1,10]:[0,1]).map(x=>({pos:{x,y:0},vel:{x:x===10?0:.2,y:x===1?.1:0},facing:0,spin:0,energy:1,profile:{...p},support:newSupport()})),
  w:any=new World(bs,{handContact,groundMovement:'legacy',substeps:1}),
  j:GraspJoint={kind:'grasp',a:bs[0],b:bs[1],capacity:500,reach:1.6,hold:1,legs:.6,pull:0};
 w.joints.push(j);const intents=bs.map(b=>({vel:{...b.vel},facing:0}));w.step(intents,.001);
 return{w,bs,j,intents};
}
describe('common-point material transport is owned by the held body island',()=>{
 it.each(['center','patch'] as const)('unrelated stepping leaves the held body, attachment and grip work unchanged: %s',mode=>{
  const v=scene(mode),rows:any[]=[],old=v.w.integrateSubstep,
   snapshot=()=>structuredClone({body:v.bs[1],material:v.w.attachments.get(v.j).material,point:v.w.graspPoint(v.j),work:v.w.report.work.grasps});
  v.w.integrateSubstep=function(...a:any[]){const outside=!a[0].includes(1),before=outside?snapshot():null;old.apply(this,a);if(outside)rows.push({before,after:snapshot()});};
  v.w.step(v.intents,.001);expect(rows).toHaveLength(1);expect(rows[0].after).toEqual(rows[0].before);
 });
 it.each(['center','patch'] as const)('preserves correctly owned contact when an unrelated parked island is present: %s',mode=>{
  const a=scene(mode,false),b=scene(mode,true),r=a.w.step(a.intents,.001),s=b.w.step(b.intents,.001);
  expect(a.bs).toEqual(b.bs.slice(0,2));expect(a.w.graspPoint(a.j)).toEqual(b.w.graspPoint(b.j));
  for(const key of ['groundImpulse','groundYawImpulse','armImpulse','armWork','supportMotorWork'])expect(r[key]).toEqual(s[key].slice(0,2));
  expect(r.work).toEqual(s.work);
 });
});
