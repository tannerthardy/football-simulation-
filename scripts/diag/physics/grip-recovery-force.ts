/** Existing unloaded correction plus one shared linear mobility. Independent
 * force reference uses the original SPD passive solve and existing reel law;
 * it is diagnostic only and refuses cap/slip. */
import type {ActiveGripInput} from '../../../src/physics/active-grip.js';
import type {RecoveryGripInput} from './grip-recovery-input.js';
import {pressureGeometry} from './grip-pressure-rate.js';
import {spanReferenceForce} from './grip-mixed-span-reference-force.js';
export function recoveryInitial(q:ActiveGripInput){return [q.a.pos.x,q.a.pos.y,q.a.vel.x,q.a.vel.y,q.a.spin,q.a.facing,q.b.pos.x,q.b.pos.y,q.b.vel.x,q.b.vel.y,q.b.spin,q.b.facing,
  q.material.x,q.material.y,q.footOffset.x,q.footOffset.y,...Array(11).fill(0),q.legs,...Array(21).fill(0)];}
export function recoveryForce(q:RecoveryGripInput,y=recoveryInitial(q)){
  const g=pressureGeometry(q,y),dx=g.xx*q.desired.x+g.xy*q.desired.y,dy=g.xy*q.desired.x+g.yy*q.desired.y,
    vn=g.vn+g.nx*dx+g.ny*dy,vt=g.vt-g.ny*dx+g.nx*dy,
    nb=g.rbx*g.ny-g.rby*g.nx,B=1/q.a.mass+1/q.b.mass,body=B+nb*nb/q.b.inertia,
    reel=q.pullSpeed>0&&g.d>q.reelStopDistance&&g.d<=q.reach?Math.min(q.armCapacity,q.capacity,Math.max(0,vn+Math.min(3,q.pullSpeed))/(body*q.tickDuration+g.nn)):0,
    e=Math.max(0,g.d-q.hold),passive=spanReferenceForce({vn:vn-g.nn*reel,vt:vt-g.nt*reel,nn:g.nn,nt:g.nt,tt:g.tt,inverseMass:B,extension:e,capacity:q.capacity}),
    normal=passive.normal-reel,tangent=passive.tangent,x=g.nx*normal-g.ny*tangent,z=g.ny*normal+g.nx*tangent,
    footx=g.xx*x+g.xy*z,footy=g.xy*x+g.yy*z,ux=q.desired.x+q.mobility*footx,uy=q.desired.y+q.mobility*footy,
    normalVelocity=vn+g.nn*normal+g.nt*tangent,tangentVelocity=vt+g.nt*normal+g.tt*tangent,
    k=(2*Math.PI*6)**2/B,bodyPower=x*g.gx+z*g.gy,motorPower=-footx*ux-footy*uy,reelPower=-reel*normalVelocity,
    springPower=k*e*normalVelocity,loss=-(passive.normal+k*e)*normalVelocity-tangent*tangentVelocity,
    balance=bodyPower+springPower-motorPower-reelPower+loss;
  if(Math.hypot(normal,tangent)>=.98*q.capacity)throw new RangeError('Recovery reference cap boundary');
  return {...g,vn,vt,e,reel,passiveNormal:passive.normal,normal,tangent,x,z,footx,footy,ux,uy,normalVelocity,tangentVelocity,
    bodyPower,motorPower,reelPower,springPower,loss,balance,capacityRatio:Math.hypot(normal,tangent)/q.capacity};
}
