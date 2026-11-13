/** Frozen actual-controller input controls. No shadow movement formula. */
import assert from 'node:assert/strict';
import type {Body} from '../../src/physics/kinematics.js';
import type {Agent} from '../../src/sim/agent.js';
import type {PlaySim} from '../../src/sim/playsim.js';
import type {Perceived} from '../../src/sim/perception.js';
import {RunBlocker} from '../../src/sim/behaviors/blocking.js';
import {SnapMind} from '../../src/sim/mind.js';

export interface StalkWitness {
  protocol:string;sourceBase:string;comparisonBaseline:string;controllerT:number;
  actor:{id:number;slot:string;body:Body;snapReadyAt:number};
  target:{id:number;slot:string;body:Body};
  installedDrive:{x:number;y:number};presentedPicture:Perceived;
  hiddenPositionDelta:{x:number;y:number};recordedMovementCommand:{vel:{x:number;y:number}};
}
export function stalkRequest(f:StalkWitness,opts:{hiddenY?:number;visibleY?:number;fresh?:boolean;
  picture?:Perceived;near?:boolean}={}){
  const own=structuredClone(f.actor.body),other=structuredClone(f.target.body);
  other.pos.y+=opts.hiddenY??0;
  if(opts.near)other.pos={x:own.pos.x+.5,y:own.pos.y};
  const picture=opts.picture?structuredClone(opts.picture):opts.fresh?
    {...structuredClone(f.presentedPicture),pos:{...f.target.body.pos},vel:{...f.target.body.vel},
      facing:f.target.body.facing,age:0}:structuredClone(f.presentedPicture);
  picture.pos.y+=opts.visibleY??0;
  const ownBefore=structuredClone(own),otherBefore=structuredClone(other);
  const actor={idx:f.actor.id,slot:f.actor.slot,team:'O',body:own,profile:own.profile,engagement:null,
    get pos(){return own.pos;},get vel(){return own.vel;},get facing(){return own.facing;},
    // This frozen witness only needs the stalk's readiness and target-action
    // lifecycle. Execute the production method rather than stubbing it away.
    mind:{snapDelay:f.actor.snapReadyAt,decisionInterval:.2,aims:new Map(),aimTargets:new Map(),
      setAimTarget:SnapMind.prototype.setAimTarget},isDown:()=>false}as unknown as Agent;
  const target={idx:f.target.id,slot:f.target.slot,team:'D',body:other,profile:other.profile,engagement:null,
    get pos(){return other.pos;},get vel(){return other.vel;},get facing(){return other.facing;},
    isDown:()=>false}as unknown as Agent;
  let visualCalls=0,engageCalls=0;
  const sim={t:f.controllerT,offCall:{kind:'run',run:{scheme:'wideZone'}},
    see:(a:Agent,d:Agent)=>{assert.equal(a,actor);assert.equal(d,target);visualCalls++;return structuredClone(picture);},
    engage:(a:Agent,d:Agent,kind:string,drive:unknown)=>{
      assert.equal(a,actor);assert.equal(d,target);assert.equal(kind,'run');assert.deepEqual(drive,f.installedDrive);
      assert.ok(opts.near,'No contact can be acquired in the far witness');engageCalls++;return true;
    }}as unknown as PlaySim;
  const controller=new RunBlocker({kind:'stalk',target,drive:{...f.installedDrive}});
  const command=controller.update(actor,sim);
  assert.deepEqual(own,ownBefore,'Controller observation must not move the body');
  assert.deepEqual(other,otherBefore,'Controller observation must not move its opponent');
  const distance=Math.hypot(other.pos.x-own.pos.x,other.pos.y-own.pos.y);
  const strikeRange=own.profile.radius+other.profile.radius+.3;
  if(!opts.near)assert.ok(distance>strikeRange,'Hidden inputs must remain outside felt contact');
  return {command,visualCalls,engageCalls,distance,strikeRange,picture,own,other};
}
