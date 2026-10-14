/** Separate reference precision control. Keep the original absolute-coordinate
 * RK4/SPD reference; translate coordinates before integrating the same law.
 * Restore external angular impulse when returning to the original origin. */
import type {ActiveGripInput} from '../../../src/physics/active-grip.js';
import {nativeSpanReference} from './grip-native-span-reference.js';
export function nativeCenteredReference(input:ActiveGripInput,n:number){
  const q=structuredClone(input),origin={...q.a.pos};
  for(const p of [q.a,q.b]){p.pos.x-=origin.x;p.pos.y-=origin.y;}
  const r=nativeSpanReference(q,n);
  for(const p of [r.a.pos,r.b.pos,r.point]){p.x+=origin.x;p.y+=origin.y;}
  const force={x:q.ground[0].force.x+q.ground[1].force.x,y:q.ground[0].force.y+q.ground[1].force.y};
  r.externalAngularImpulse+=(origin.x*force.y-origin.y*force.x)*q.duration;
  const L=(p:typeof q.a)=>p.mass*(p.pos.x*p.vel.y-p.pos.y*p.vel.x)+p.inertia*p.spin;
  r.angularResidual=L(r.a)+L(r.b)-L(input.a)-L(input.b)-r.externalAngularImpulse;
  return r;
}
