/** Existing grip-fast multiple-contact graph, isolated to passive grasps.
 * Acquire its actual shared foot, then freeze the next issued free plan.
 * No player-capacity or recovery changes; explicit zero desired support is
 * the same diagnostic boundary used by the preceding one-grip references. */
import {World,CONTACT_SCALE,type GraspJoint} from '../../../src/physics/world.js';
import {newSupport} from '../../../src/physics/support.js';
import type {Body} from '../../../src/physics/kinematics.js';
import {snapshot,restore} from '../../../src/physics/grip-timing.js';
import type {Particle} from './grip-force-interval.js';
const profile={massKg:100,radius:.3,reach:1.6,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,
  backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4,getUp:.9};
export function prescribeSharedSupport(original:(...args:any[])=>void){
  return function(this:any,i:number,...args:any[]){
    original.call(this,i,...args);
    if(i===1){const foot=this.bodies[i].support.foot;if(!foot)throw Error('Missing shared foot');
      foot.mobility=this.sp[i].stepSpeed/this.sp[i].pushForce;foot.desired={x:0,y:0};}
  };
}
export function prepareSharedCase(side=1,single=false,variant:'base'|'distinct'|'unequal'='base'){
  const body=(x:number,y:number):Body=>({pos:{x,y:side*y},vel:{x:.2,y:0},facing:0,spin:0,energy:1,profile:{...profile},support:newSupport()}),
    bodies=[body(0,0),body(1,.1),...(single?[]:[body(2,-.1)])],w:any=new World(bodies,{handContact:'patch',gripTiming:'midpoint',substeps:1});
  bodies[0].vel={x:.4,y:side*.2};bodies[1].vel={x:.3,y:-side*.1};if(!single)bodies[2].vel={x:.1,y:side*.1};
  const holds=[0,...(single?[]:[2])].map(i=>({kind:'grasp',a:bodies[i],b:bodies[1],capacity:500,reach:1.6,hold:1,legs:variant==='unequal'&&i===2?.4:.6,pull:0} as GraspJoint));
  w.joints.push(...holds);
  const prototype:any=World.prototype,feet=prototype.feet;prototype.feet=prescribeSharedSupport(feet);
  let saved:any;
  try{
    w.step(bodies.map(()=>({vel:{x:0,y:0},free:true})),1e-6);
    if(variant==='distinct'){
      for(let k=0;k<holds.length;k++){const a=w.attachments.get(holds[k]);a.material.y+=side*(k===0?.025:-.015);a.geometry=undefined;}
      bodies[1].spin=side*.2;
    }
    const stop={},integrate=w.integrateInterval;
    w.integrateInterval=function(...args:any[]){saved=snapshot(this,args);throw stop;};
    try{w.step(bodies.map(()=>({vel:{x:0,y:0},free:true})),.05/12);}catch(e){if(e!==stop)throw e;}
    w.integrateInterval=integrate;
  }finally{prototype.feet=feet;}
  if(!saved)throw Error('Shared checkpoint not acquired');
  const {w:q,args}=restore(saved,World.prototype),particle=(b:any):Particle=>({mass:b.profile.massKg,inertia:q.inertia[q.indexOf(b)],
    pos:{...b.pos},vel:{...b.vel},facing:b.facing,spin:b.spin??0}),foot=q.bodies[1].support.foot,
    input={bodies:q.bodies.map(particle),duration:args[3],mobility:q.sp[1].stepSpeed/q.sp[1].pushForce,
      footOffset:{...foot.offset},attachmentReach:q.sp[1].comHeight,minimumDistance:CONTACT_SCALE*.6,
      grips:q.joints.map((j:any)=>{const a=q.attachments.get(j);if(!a?.bounded||!a.material||a.foot!==foot)throw Error('Invalid acquired common foot');
        return {holder:q.indexOf(j.a),held:1,material:{...a.material},legs:j.legs,hold:j.hold,reach:j.reach,capacity:q.gripCapacity(j)};})};
  return {packet:saved,w:q,args,input,id:`shared-${side}${single?'-single':''}${variant==='base'?'':`-${variant}`}`};
}
