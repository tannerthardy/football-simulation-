/** Own-foot execution of a selected departure. Contact is permitted; an
 * avoidably worse intrusion is a reason to gather before accelerating away. */
import type { Vec2 } from '../core/vec.js';
import type { Body } from '../physics/kinematics.js';
import { previewFreeMovement } from '../physics/movement-preview.js';
import type { Intent } from '../physics/world.js';

interface Peer { pos: Vec2; vel: Vec2; radius: number }

export function departureClearances(body: Body, command: Intent,
  peers: readonly Peer[], now: number, horizon: number, handContact: 'center' | 'patch') {
  const path=previewFreeMovement(body,command,now,Math.ceil(horizon/.05),handContact);
  const clearances=peers.map(peer=>{
    const initial=Math.hypot(body.pos.x-peer.pos.x,body.pos.y-peer.pos.y);
    const floor=Math.min(.9*(body.profile.radius+peer.radius),initial);
    let x=body.pos.x-peer.pos.x,y=body.pos.y-peer.pos.y,minimum=initial;
    for(const sample of path){
      const nx=sample.pos.x-peer.pos.x-peer.vel.x*sample.t;
      const ny=sample.pos.y-peer.pos.y-peer.vel.y*sample.t;
      const dx=nx-x,dy=ny-y;
      const u=Math.max(0,Math.min(1,-(x*dx+y*dy)/Math.max(1e-12,dx*dx+dy*dy)));
      minimum=Math.min(minimum,Math.hypot(x+u*dx,y+u*dy));x=nx;y=ny;
    }
    return minimum-floor;
  });
  return {upright:path.every(sample=>sample.support==='up'),clearances};
}

export function clearCombinationDeparture(body: Body, command: Intent,
  peers: readonly { pos: Vec2; vel: Vec2; radius: number }[], now: number,
  horizon: number, handContact: 'center' | 'patch'): boolean {
  const result=departureClearances(body,command,peers,now,horizon,handContact);
  return result.upright&&result.clearances.every(x=>x>=-1e-9);
}

export function gatherCombinationDeparture(body: Body, command: Intent, peers: readonly Peer[],
  now: number, horizon: number, handContact: 'center' | 'patch'): Intent {
  if(!body.support||body.support.state!=='up'||command.free||command.dive||command.lunge)return command;
  const original=departureClearances(body,command,peers,now,horizon,handContact);
  if(original.clearances.every(x=>x>=-1e-9))return command;
  const gather:Intent={...command,vel:{x:0,y:0}};
  const alternative=departureClearances(body,gather,peers,now,horizon,handContact);
  // A graze can be lawful and unavoidable. Gather only for a strict physical
  // improvement at an obstructed peer, never by creating/worsening another
  // intrusion or losing own support. No collision or contact state is edited.
  if(!alternative.upright||alternative.clearances.some((x,i)=>x<Math.min(0,original.clearances[i])-1e-9)
    ||!alternative.clearances.some((x,i)=>original.clearances[i]<-1e-9&&x>original.clearances[i]+1e-9))return command;
  return gather;
}
