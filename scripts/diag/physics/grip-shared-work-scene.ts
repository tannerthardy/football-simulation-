/** Literal existing graph, with no stored span-extension energy. This is an
 * explicit diagnostic transform, not a change to acquired World fixtures. */
import type {SharedGripInput} from './grip-force-shared.js';
import {pressureGeometry} from './grip-pressure-rate.js';
export function sharedWorkFrames(input:SharedGripInput){
  return input.grips.map(j=>{
    const a=input.bodies[j.holder],b=input.bodies[1],q=[a.pos.x,a.pos.y,a.vel.x,a.vel.y,a.spin,a.facing,
      b.pos.x,b.pos.y,b.vel.x,b.vel.y,b.spin,b.facing,j.material.x,j.material.y,...Array(13).fill(0),j.legs],
      g=pressureGeometry({...j,a,b,mobility:input.mobility,attachmentReach:input.attachmentReach} as any,q);
    return {...g,holder:j.holder,capacity:j.capacity,inverseMass:1/a.mass+1/b.mass,normalBias:0};
  });
}
export function sharedWorkInput(input:SharedGripInput,duration=.0001):SharedGripInput{
  const copy=structuredClone(input),frames=sharedWorkFrames(copy);
  copy.duration=duration;
  copy.grips.forEach((g,k)=>{g.hold=frames[k].d;});
  return copy;
}
