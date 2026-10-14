/** Predeclared transfer controls: new initial motion/geometry/time states of
 * the acquired pair. Capacity, mobility, masses and recovery law stay fixed. */
import {prepareMixedCase,sha} from './grip-mixed-fixtures.js';
export {sha};
export const saturationCases=[
  {id:'fresh-lower-opening',side:1,normal:.2,tangent:16,spin:0,materialScale:1,duration:.004166666666666667},
  {id:'fresh-higher-opening-mirror',side:-1,normal:.4,tangent:16,spin:0,materialScale:1,duration:.004166666666666667},
  {id:'fresh-moving-arm',side:1,normal:.35,tangent:14,spin:.25,materialScale:.9,duration:.0048},
  {id:'fresh-before-transition',side:-1,normal:.3,tangent:16,spin:-.2,materialScale:1.1,duration:.0025},
];
export function prepareSaturationCase(c:(typeof saturationCases)[number]){
  const v=prepareMixedCase({packetId:`patch-45-8-0-3001-${c.side}`,normal:c.normal,offset:true,reverse:false}),
    {w,joint,input,attachment}=v;
  attachment.material={x:attachment.material.x*c.materialScale,y:attachment.material.y*c.materialScale};attachment.geometry=undefined;
  const point=w.graspPoint(joint),dx=point.x-joint.a.pos.x,dy=point.y-joint.a.pos.y,d=Math.hypot(dx,dy),nx=dx/d,ny=dy/d,
    tangent=c.tangent*c.side;
  joint.b.vel={x:.2+c.normal*nx-tangent*ny,y:c.normal*ny+tangent*nx};
  joint.b.spin=c.spin*c.side;joint.hold=d;
  input.b=v.particle(joint.b);input.hold=d;input.material={...attachment.material};input.duration=c.duration;
  return {...v,id:c.id,transform:{...v.transform,relativeNormal:c.normal,relativeTangent:tangent,
    bSpin:c.spin*c.side,materialScale:c.materialScale,duration:c.duration}};
}
