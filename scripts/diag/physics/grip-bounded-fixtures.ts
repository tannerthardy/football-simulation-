/** Reuse the original immutable acquired packets. No new football snaps.
 * Ground is isolated and its existing support slope is prescribed explicitly.
 */
import {readFileSync} from 'node:fs';
import {deserialize} from 'node:v8';
import {createHash} from 'node:crypto';
import {World,CONTACT_SCALE} from '../../../src/physics/world.js';
import {ARM_SPEED} from '../../../src/physics/actuation.js';
import type {Particle} from './grip-force-interval.js';
import type {BoundedGripInput} from './grip-force-bounded.js';
export const sha=(v:string|Uint8Array)=>createHash('sha256').update(v).digest('hex');
export const boundedCases=[
  {packetId:'patch-45-8-0-3001-1',offset:false},
  {packetId:'patch-45-8-0-3001--1',offset:false},
  {packetId:'patch-0-3-0-3001-1',offset:false},
  {packetId:'patch-45-8-0-3001-1',offset:true},
  {packetId:'patch-45-8-0-3001--1',offset:true},
];
export function prepareBoundedCase(c:{packetId:string;offset:boolean}) {
  const bytes=readFileSync(`out/grip-timing/${c.packetId}.bin`),checksum=sha(bytes),
    manifest=JSON.parse(readFileSync('out/grip-timing/baseline.json','utf8'));
  if(checksum!==manifest.checkpoints.find((p:any)=>p.id===c.packetId)?.checksum)throw Error('Acquired input changed');
  const p=structuredClone(deserialize(bytes)),w:any=Object.assign(Object.create(World.prototype),p.fields);
  w.attachments=new WeakMap(p.attachments);
  if(w.joints.length!==1||w.pending.length||w.handContact!=='patch'||w.constraintWork!=='per-solve')
    throw Error('Unsupported acquired contact graph/options');
  const joint=w.joints[0],attachment=w.attachments.get(joint),ia=w.indexOf(joint.a),ib=w.indexOf(joint.b);
  if(joint.kind!=='grasp'||joint.broken||joint.brace!==undefined||!attachment?.bounded||!attachment.material)
    throw Error('Witness requires its acquired bounded material grip');
  const sp=w.sp[ib],mobility=sp.stepSpeed/sp.pushForce,side=c.packetId.endsWith('--1')?-1:1;
  if(c.offset) {
    attachment.material={x:-.25*sp.comHeight,y:side*.125*sp.comHeight};attachment.geometry=undefined;
  }
  for(const i of p.args[0]){p.args[2][i].free=true;p.args[2][i].dive=null;}
  w.gripTiming='midpoint';p.args[3]=.05/12;
  const particle=(b:any):Particle=>({mass:b.profile.massKg,inertia:w.inertia[w.indexOf(b)],
    pos:{...b.pos},vel:{...b.vel},facing:b.facing,spin:b.spin??0});
  const input:BoundedGripInput={a:particle(joint.a),b:particle(joint.b),material:{...attachment.material},
    footOffset:{...attachment.foot.offset},mobility,desired:{x:0,y:0},capacity:w.gripCapacity(joint),
    duration:p.args[3],minimumDistance:CONTACT_SCALE*(joint.a.profile.radius+joint.b.profile.radius),
    reach:joint.reach,attachmentReach:sp.comHeight,hold:joint.hold,legs:joint.legs,
    ...(joint.recoveryCoupling===undefined?{}:{recoveryCoupling:joint.recoveryCoupling}),pullSpeed:Math.min(ARM_SPEED,joint.pull??0)};
  return {bytes,checksum,p,w,joint,attachment,ia,ib,input,particle,
    id:c.packetId+(c.offset?'-offset':'-acquired'),transform:{freeGround:true,
      prescribedSupport:'existing sp.stepSpeed/sp.pushForce; desired zero',
      material:c.offset?'declared curved-map opposing input: (-.25L, side*.125L)':'unchanged acquired point',
      legs:'unchanged acquired initial value; existing sliding law',pull:'unchanged; zero attained reel required'}};
}
/** Use on World.prototype during diagnostic trials so resolved scratch Worlds
 * inherit the same boundary, rather than dropping an instance override. */
export function prescribeBoundedSupport(original:(...args:any[])=>void) {
  return function(this:any,i:number,...args:any[]) {
    original.call(this,i,...args);
    const holds=this.joints.filter((j:any)=>j.kind==='grasp'&&!j.broken);
    if(holds.length!==1)throw Error('Prescribed support requires one live grasp');
    const held=holds[0].b;
    if(i===this.indexOf(held)) {
      const foot=held.support.foot,sp=this.sp[i];if(!foot)throw Error('Held support disappeared');
      foot.mobility=sp.stepSpeed/sp.pushForce;foot.desired={x:0,y:0};
    }
  };
}
