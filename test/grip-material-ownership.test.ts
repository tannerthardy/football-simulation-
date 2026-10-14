import {describe,it,expect} from 'vitest';
import {World,type GraspJoint} from '../src/physics/world.js';
import {newSupport} from '../src/physics/support.js';
import type {Body} from '../src/physics/kinematics.js';
const p={massKg:100,radius:.3,reach:1.6,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,
 backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4,getUp:.9};
function scene(handContact:'center'|'patch',owned:boolean,parked=true){
 const bs:Body[]=(parked?[0,1,10]:[0,1]).map(x=>({pos:{x,y:0},vel:{x:x===10?0:.2,y:x===1?.1:0},facing:0,spin:0,energy:1,profile:{...p},support:newSupport()})),
  w:any=new World(bs,{handContact,substeps:1,...(owned?{materialTransport:'owned' as const}:{})}),
  j:GraspJoint={kind:'grasp',a:bs[0],b:bs[1],capacity:500,reach:1.6,hold:1,legs:.6,pull:0};
 w.joints.push(j);const intents=bs.map(b=>({vel:{...b.vel},facing:0}));w.step(intents,.001);
 return{w,bs,j,intents};
}
describe('separate opt-in material-island ownership correction',()=>{
 it.each([false,true])('only the held body island may transport its attachment: owned %s',owned=>{
  const v=scene('patch',owned),rows:any[]=[],old=v.w.integrateInterval;
  const snapshot=()=>structuredClone({pos:v.bs[1].pos,vel:v.bs[1].vel,spin:v.bs[1].spin,facing:v.bs[1].facing,
   offset:v.bs[1].support!.foot!.offset,material:v.w.attachments.get(v.j).material,point:v.w.graspPoint(v.j),work:v.w.report.work.grasps});
  v.w.integrateInterval=function(...a:any[]){const outside=!a[0].includes(1),before=snapshot();old.apply(this,a);if(outside)rows.push({before,after:snapshot()});};
  v.w.step(v.intents,.001);expect(rows).toHaveLength(1);const {before,after}=rows[0];
  for(const key of ['pos','vel','spin','facing','offset','work'])expect(after[key]).toEqual(before[key]);
  if(owned){expect(after.material).toEqual(before.material);expect(after.point).toEqual(before.point);}
  else expect(Math.hypot(after.point.x-before.point.x,after.point.y-before.point.y)).toBeGreaterThan(1e-8);
 });
 it('preserves a correctly owned contact island exactly',()=>{
  const a=scene('patch',false,false),b=scene('patch',true,false),r=a.w.step(a.intents,.001),s=b.w.step(b.intents,.001);
  expect(a.bs).toEqual(b.bs);expect(r).toEqual(s);expect(a.w.graspPoint(a.j)).toEqual(b.w.graspPoint(b.j));
 });
 it('preserves accepted center behavior exactly and leaves the option absent by default',()=>{
  const a=scene('center',false),b=scene('center',true),r=a.w.step(a.intents,.001),s=b.w.step(b.intents,.001);
  expect(Object.hasOwn(a.w,'materialTransport')).toBe(false);expect(a.w.handContact).toBe('center');
  expect(a.bs).toEqual(b.bs);expect(r).toEqual(s);expect(a.w.graspPoint(a.j)).toEqual(b.w.graspPoint(b.j));
 });
});
