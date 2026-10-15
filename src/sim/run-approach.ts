/** Run-only approach pacing. A destination between blockers does not promise
 * that the runner can reach it while those blockers keep clearing the lane.
 */
import type {Vec2} from '../core/vec.js';
import type {Body} from '../physics/kinematics.js';
import {previewFreeMovement} from '../physics/movement-preview.js';
import {CONTACT_SCALE,type Intent} from '../physics/world.js';
import type {TeammatePicture} from './teammate-information.js';

export interface RunApproachPeer {
  id:number;
  picture:TeammatePicture;
  radius:number;
  /** Public ordinary braking capability, not live load/fatigue/intention. */
  brake:number;
}
const STEPS=12; // Existing spacing preview's .60s native movement window.
type AcquiredPicture=Extract<TeammatePicture,{pos:Vec2}>;
/** The source names delivery recency, not motion validity. After the position
 * prediction clock stops, zero vel means unknown, including source=observed.
 * Retain the owner's schema and clocks; do not recover velocity from reality.
 */
function motionKnown(p:TeammatePicture):p is AcquiredPicture {
  return (p.source==='observed'||p.source==='remembered')&&p.age<=p.predictedFor+1e-9;
}
function pointSegment(p:Vec2,a:Vec2,b:Vec2):number {
  const dx=b.x-a.x,dy=b.y-a.y;
  const u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/Math.max(1e-12,dx*dx+dy*dy)));
  return Math.hypot(p.x-a.x-u*dx,p.y-a.y-u*dy);
}
/** Distance to the synchronized relative-motion quadrilateral. Its two
 * parallel edges span continued observed motion and ordinary braking.
 */
function stripDistance(points:readonly Vec2[]):number {
  let minimum=Infinity,positive=false,negative=false,area=0;
  for(let i=0;i<4;i++){
    const a=points[i],b=points[(i+1)%4],cross=a.x*b.y-a.y*b.x;
    minimum=Math.min(minimum,pointSegment({x:0,y:0},a,b));
    positive ||= cross>1e-12;negative ||= cross< -1e-12;area+=cross;
  }
  return Math.abs(area)>1e-12&&!(positive&&negative)?0:minimum;
}
function positions(peer:RunApproachPeer,p:AcquiredPicture,t:number):[Vec2,Vec2]{
  const v=Math.hypot(p.vel.x,p.vel.y);
  const continuing={x:p.pos.x+p.vel.x*t,y:p.pos.y+p.vel.y*t};
  if(v<1e-9||!(peer.brake>0))return[continuing,continuing];
  // The supplied picture has already been dead-reckoned. Back out only that
  // extrapolation before considering braking since the acquired sample.
  const elapsed=p.predictedFor+t,decel=peer.brake,u=Math.min(elapsed,v/decel);
  const lag=(v*u-.5*decel*u*u)-v*p.predictedFor;
  return[continuing,{x:p.pos.x+p.vel.x/v*lag,y:p.pos.y+p.vel.y/v*lag}];
}
export function runApproachChoices(body:Body,original:Intent,peers:readonly RunApproachPeer[],now:number,
 handContact:'center'|'patch'){
  // Unknown/unsupported peers remain in every assessment. Their absence of a
  // usable motion forecast cannot certify clearance or manufacture occupancy.
  const evaluate=(kind:'fast'|'slower'|'gather',scale:number)=>{
    const command=scale===1?original:{...original,vel:{x:original.vel.x*scale,y:original.vel.y*scale}};
    const path=previewFreeMovement(body,command,now,STEPS,handContact);
    const gaps=peers.map(peer=>{
      const picture=peer.picture;
      if(!motionKnown(picture))return{id:peer.id,gap:null};
      const touch=CONTACT_SCALE*(body.profile.radius+peer.radius);
      let own=body.pos,[continued,braked]=positions(peer,picture,0),gap=Infinity;
      for(const sample of path){
        const[nextContinued,nextBraked]=positions(peer,picture,sample.t);
        const relative=(a:Vec2,b:Vec2)=>({x:a.x-b.x,y:a.y-b.y});
        gap=Math.min(gap,stripDistance([relative(own,continued),relative(sample.pos,nextContinued),
          relative(sample.pos,nextBraked),relative(own,braked)])-touch);
        own=sample.pos;continued=nextContinued;braked=nextBraked;
      }
      return{id:peer.id,gap};
    });
    const unknownPeers=gaps.filter(g=>g.gap===null).map(g=>g.id);
    const knownMinimumGap=Math.min(...gaps.flatMap(g=>g.gap===null?[]:[g.gap]));
    const up=path.every(s=>s.support==='up');
    const status:'clear'|'blocked'|'unknown'=!up||knownMinimumGap<0?'blocked':unknownPeers.length?'unknown':'clear';
    return{kind,command,path,gaps,unknownPeers,knownMinimumGap,
      minimumGap:unknownPeers.length?null:knownMinimumGap,status,up};
  };
  return[evaluate('fast',1),evaluate('slower',.5),evaluate('gather',0)];
}
export function chooseRunApproach(body:Body,original:Intent,peers:readonly RunApproachPeer[],now:number,
 handContact:'center'|'patch'){
  const choices=runApproachChoices(body,original,peers,now,handContact),fast=choices[0];
  // First clear moving request wins. Do not maximize clearance by stopping
  // when ordinary acceleration is already clear of the directional envelope.
  const clear=choices.find(c=>c.status==='clear');
  if(clear)return{...clear,choices};
  // With unknown peers, keep the first request supported by known evidence,
  // explicitly unassessed. Unknown alone justifies neither a stop nor a reroute.
  const unassessed=choices.find(c=>c.status==='unknown');
  if(unassessed)return{...unassessed,choices};
  const gather=choices[2],newConflict=gather.gaps.some((g,i)=>{
    const before=fast.gaps[i].gap;
    return before!==null&&g.gap!==null&&before>=0&&g.gap<0;
  });
  return{...(gather.up&&!newConflict&&gather.knownMinimumGap>fast.knownMinimumGap?gather:fast),choices};
}
