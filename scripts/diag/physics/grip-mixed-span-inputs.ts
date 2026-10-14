import {readFileSync} from 'node:fs';
import type {BoundedGripInput} from './grip-force-bounded.js';
import {loadSpanInput} from './grip-world-accounting-inputs.js';
export interface MixedSpanSelector{id:string;tangent:number;curved:number;zero:boolean;spin?:number;}
export function mixedSpanInputs(){
  return JSON.parse(readFileSync('config/grip-mixed-span-inputs.json','utf8')).cases as Array<{
    id:string;selector:MixedSpanSelector;packetId:string;packetSha256:string;input:BoundedGripInput;transform:unknown;
  }>;
}
/** Reconstruct the predeclared transform from the immutable packet; never
 * silently regenerate a baseline or select a more favorable input. */
export function prepareMixedSpanCase(selector:MixedSpanSelector){
  const v=loadSpanInput(1,selector.zero),{w,joint:j,attachment}=v,n=v.normal,point=w.graspPoint(j),L=v.input.attachmentReach;
  if(selector.curved){
    attachment.material={x:-selector.curved*L,y:selector.curved*L/2};attachment.geometry=undefined;
    const after=w.graspPoint(j);j.b.pos.x+=point.x-after.x;j.b.pos.y+=point.y-after.y;
  }
  j.b.vel={x:-selector.tangent*n.y,y:selector.tangent*n.x};j.b.spin=selector.spin??0;
  const input:BoundedGripInput={...v.input,a:v.particle(j.a),b:v.particle(j.b),hold:j.hold,legs:j.legs,material:{...attachment.material},
    footOffset:{...attachment.foot.offset},pullSpeed:0,duration:.0002};
  return {...v,input,id:selector.id};
}
