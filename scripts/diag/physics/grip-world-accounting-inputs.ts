/** Saved native checkpoints, then an explicitly loaded/stopped opposing pair.
 * No new snaps and no player/force/recovery capacity changes. */
import {readFileSync} from 'node:fs';
import {deserialize} from 'node:v8';
import {World} from '../../../src/physics/world.js';
import {prepareMixedCase} from './grip-mixed-fixtures.js';
import {prescribeBoundedSupport,sha} from './grip-bounded-fixtures.js';
import type {RadialSpanInput} from './grip-span-accounting.js';
export function nativeAccountingInput(id:string){
  const bytes=readFileSync(`out/grip-timing/${id}.bin`),checksum=sha(bytes),manifest=JSON.parse(readFileSync('out/grip-timing/baseline.json','utf8'));
  if(checksum!==manifest.checkpoints.find((c:any)=>c.id===id)?.checksum)throw Error('Native accounting packet changed');
  const p=structuredClone(deserialize(bytes)),w:any=Object.assign(Object.create(World.prototype),p.fields);w.attachments=new WeakMap(p.attachments);w.gripTiming='midpoint';
  return {id,checksum,p,w,joint:w.joints[0],transform:'Unchanged acquired World, issued plans and active pull; duration .05/12'};
}
export function frozenArguments(p:any,w:any,H:number,n:number){
  for(let k=0;k<n;k++){const a=[...p.args];a[3]=H/n;a[4]=p.args[4]-k*H/n;w.integrateSubstep(...a);}
}
export function loadSpanInput(side:1|-1,zero=false){
  const id=`patch-45-8-0-3001-${side}`,v=prepareMixedCase({packetId:id,normal:.1,offset:false,reverse:false} as any),{w,p,joint:j,attachment}=v,
    point=w.graspPoint(j),dx=point.x-j.a.pos.x,dy=point.y-j.a.pos.y,d=Math.hypot(dx,dy),nx=dx/d,ny=dy/d;
  j.a.vel={x:0,y:0};j.b.vel={x:.1*nx,y:.1*ny};
  const feet=w.feet;w.feet=prescribeBoundedSupport(feet);frozenArguments(p,w,.002,128);
  if(j.slipping||j.broken)throw Error('Span loading crossed phase');
  // External stopping removes kinetic energy. It does not reset a rest span,
  // return energy through a grip, change a capacity or count as native play.
  j.a.vel={x:0,y:0};j.b.vel={x:0,y:0};j.a.spin=j.b.spin=0;
  if(zero){const q=w.graspPoint(j);j.hold=Math.hypot(q.x-j.a.pos.x,q.y-j.a.pos.y);}
  const c=Math.cos(j.b.facing),s=Math.sin(j.b.facing),z=attachment.material,
    referenceInput:RadialSpanInput={massA:j.a.profile.massKg,massB:j.b.profile.massKg,capacity:w.gripCapacity(j),
      share:j.recoveryCoupling??j.legs,mobility:v.input.mobility,limit:v.input.attachmentReach,
      separation:(j.b.pos.x-j.a.pos.x)*nx+(j.b.pos.y-j.a.pos.y)*ny,
      material:(c*z.x-s*z.y)*nx+(s*z.x+c*z.y)*ny,hold:j.hold,velocity:0,duration:.000001};
  return {...v,id:`${id}-loaded${zero?'-zero-span':''}`,normal:{x:nx,y:ny},referenceInput,
    transform:{...v.transform,relativeNormal:.1,relativeTangent:0,loading:{duration:.002,partitions:128},
      stopping:'External removal of body translation/yaw; stored span and material retained',zero:zero?'Plastic reset of hold to current distance (energy removed)':'No rest reset'}};
}
