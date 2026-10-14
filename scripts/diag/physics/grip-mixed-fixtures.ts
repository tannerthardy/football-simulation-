/** Declared mechanical transforms of the same acquired packets. No new snaps,
 * player capacities or recovery coefficients. The original 3/16 mixed input
 * and a .3/16 opening control distinguish full normal saturation from sharing
 * at the acquired .17 lower share. Pull is off to isolate passive channels. */
import {prepareBoundedCase,sha} from './grip-bounded-fixtures.js';
export {sha};
export const mixedCases=[
  {packetId:'patch-45-8-0-3001-1',normal:3,offset:true,reverse:false},
  {packetId:'patch-45-8-0-3001-1',normal:.3,offset:true,reverse:false},
  {packetId:'patch-45-8-0-3001--1',normal:.3,offset:true,reverse:false},
  {packetId:'patch-45-8-0-3001-1',normal:.3,offset:true,reverse:true},
];
export function prepareMixedCase(c:(typeof mixedCases)[number]) {
  const v=prepareBoundedCase(c),{w,joint,input}=v,point=w.graspPoint(joint),
    dx=point.x-joint.a.pos.x,dy=point.y-joint.a.pos.y,d=Math.hypot(dx,dy),nx=dx/d,ny=dy/d,
    tangent=(c.packetId.endsWith('--1')?-16:16)*(c.reverse?-1:1);
  joint.a.vel={x:.2,y:0};joint.b.vel={x:.2+c.normal*nx-tangent*ny,y:c.normal*ny+tangent*nx};
  joint.a.spin=joint.b.spin=0;joint.hold=d;joint.pull=0;
  input.a=v.particle(joint.a);input.b=v.particle(joint.b);input.hold=d;input.pullSpeed=0;
  return {...v,id:`${c.packetId}-mixed-${c.normal}${c.reverse?'-reverse':''}`,transform:{...v.transform,
    relativeNormal:c.normal,relativeTangent:tangent,aVelocity:{x:.2,y:0},spins:0,hold:'initial point distance',pull:0}};
}
