/**
 * Teammates see and feel each other. A player does not plan to close on a
 * teammate faster than he could absorb the contact over a short horizon:
 * linemen working side by side stay hip to hip instead of crashing into
 * each other, a back follows his puller without running him over, and a
 * second tackler joins a pile instead of spearing his own man.
 *
 * This shapes intents only. Bodies still collide physically when pushed
 * together or when a player is already moving too fast to stop.
 */
import type { Intent } from '../physics/world.js';
import {fatigueFactor,followAccel,type Body} from '../physics/kinematics.js';
import {previewFreeMovement,type MovementSample} from '../physics/movement-preview.js';
import {availability,supportParams} from '../physics/support.js';
import type { Agent } from './agent.js';
import type {Perceived} from './perception.js';
import type {TeammateForecast} from './teammate-information.js';
import {clearMovementStep} from './movement-clearance.js';

/** Time a player gives himself to close the gap to a teammate, s. */
const CLOSE_HORIZON = 0.3;
/** Gap at which a teammate starts to shape movement, yd. */
const AWARE_GAP = 1.2;
/** Touch distance as a fraction of the torso radii (matches the world). */
const TOUCH = 0.9;
/** A few running steps, through the existing 20 Hz free-movement law. */
const TURN_STEPS = 12;
const TURN_HORIZON = TURN_STEPS * .05;
/** Avoid changing requests for a negligible forecast difference, yd. */
const TURN_MARGIN = .05;

export interface SpacingContext {
  now: number;
  /** Own tactile constraint state, never a teammate's unobserved intention. */
  constrained?: ReadonlySet<Body>;
  /** Own installed first-level stretch duty, never a peer's next command. */
  openingTrack?: ReadonlySet<Body>;
  /** Own post-exchange run duty. This carries no peer intentions. */
  runCarrier?: Body;
  handContact?: 'center' | 'patch';
  allowDetour?:(a:Agent,path:readonly MovementSample[],original:readonly MovementSample[])=>boolean;
}

export interface SpacingPicture extends Pick<Perceived, 'pos' | 'vel'> {
  source?: 'called' | 'observed' | 'remembered' | 'tactile';
  forecast?: TeammateForecast;
}

interface PeerPicture extends SpacingPicture {
  pos: {x:number;y:number};
  vel: {x:number;y:number};
  touch: number;
  radius: number;
  maxSpeed: number;
}

function peerAt(peer:PeerPicture,t:number,route:boolean):{x:number;y:number} {
  const path=route&&peer.source==='called'?peer.forecast?.samples:undefined;
  if(path&&path.length>1){
    const k=path.findIndex(s=>s.t>=t-1e-9);
    const hi=path[k<0?path.length-1:k],lo=path[Math.max(0,(k<0?path.length-1:k)-1)];
    const u=hi.t>lo.t?Math.max(0,Math.min(1,(t-lo.t)/(hi.t-lo.t))):0;
    return {x:lo.pos.x+(hi.pos.x-lo.pos.x)*u,y:lo.pos.y+(hi.pos.y-lo.pos.y)*u};
  }
  return {x:peer.pos.x+peer.vel.x*t,y:peer.pos.y+peer.vel.y*t};
}

function coversOpening(peer:PeerPicture):boolean {
  const f=peer.forecast;
  return peer.source==='called'&&!!f&&f.validFor>=CLOSE_HORIZON-1e-9
    &&f.samples.length>1&&f.samples[0].t<=1e-9&&f.samples.at(-1)!.t>=CLOSE_HORIZON-1e-9;
}

function sweptClearance(a:Agent, samples:readonly MovementSample[], peer:PeerPicture,route=false):number {
  let px=a.pos.x-peer.pos.x,py=a.pos.y-peer.pos.y;
  let minimum=Math.hypot(px,py)-peer.touch;
  for(const sample of samples){
    const future=peerAt(peer,sample.t,route);
    const rx=sample.pos.x-future.x;
    const ry=sample.pos.y-future.y;
    const ex=rx-px,ey=ry-py;
    const along=Math.max(0,Math.min(1,-(px*ex+py*ey)/Math.max(1e-12,ex*ex+ey*ey)));
    minimum=Math.min(minimum,Math.hypot(px+along*ex,py+along*ey)-peer.touch);
    px=rx;py=ry;
  }
  return minimum;
}

/** Excuse only a demonstrated installed-tempo false positive. Keep the
 * existing answer unless the original command's achievable opening clears
 * every acquired peer together. This selects no new direction/braking plan.
 * An observed stopping-distance restriction can never be excused here. */
function clearInstalledOpening(a:Agent,original:Intent,peers:readonly PeerPicture[],context?:SpacingContext):boolean {
  const s=a.body.support;
  if(!context?.openingTrack?.has(a.body)||!Number.isFinite(context.now)||context.now<0||context.now>.3+1e-9
    ||context.constrained?.has(a.body)||a.engagement||a.isDown(context.now)
    ||original.free||original.dive||original.lunge||(original.push??0)>1e-6
    ||(original.squeeze??0)>1e-6||(a.body.squeeze??0)>1e-6
    ||!s||s.state!=='up'||s.foot||s.strike
    ||Math.hypot(s.lean.x,s.lean.y)>1e-6||Math.hypot(s.load.x,s.load.y)>1e-6)return false;
  // A shorter remaining call cannot certify this fixed horizon. Alignment
  // and mesh calls retain their declared CV only while that call is valid.
  if(peers.some(p=>p.source==='called'&&(!p.forecast
    ||p.forecast.validFor<CLOSE_HORIZON-1e-9
    ||(p.forecast.samples.length>1&&!coversOpening(p)))))return false;
  const path=previewFreeMovement(a.body,original,context.now,Math.round(CLOSE_HORIZON/.05),context.handContact);
  return path.every(s=>s.support==='up')&&peers.every(p=>sweptClearance(a,path,p,true)>=0);
}

/** A gather request is evaluated with the same posture/facing as its execution.
 * This is a held-command forecast against observed constant-velocity peers,
 * not a contact solve or knowledge of their next decisions. Replan next tick.
 */
function gatherForTurn(a:Agent, original:Intent, peers:readonly PeerPicture[], context?:SpacingContext):Intent {
  const s=a.body.support,speed=Math.hypot(a.vel.x,a.vel.y);
  if(!context||!Number.isFinite(context.now)||speed<2||a.isDown(context.now)
    ||a.engagement||context.constrained?.has(a.body)||original.free||original.dive||original.lunge
    ||(original.squeeze??0)>1e-6||(a.body.squeeze??0)>1e-6
    ||(original.push??0)>1e-6||!s||s.state!=='up'||s.foot||s.strike
    ||Math.hypot(s.lean.x,s.lean.y)>1e-6||Math.hypot(s.load.x,s.load.y)>1e-6
    ||Math.abs(original.vel.x*a.vel.y-original.vel.y*a.vel.x)/speed<1)return original;
  // In an empty World, every COM acceleration is bounded by traction/mass
  // (including a fall). Midpoint integration keeps its path within .5*a*t²
  // of the initial-velocity line. This tube only rejects definitely clear
  // pictures; unlike the requested straight ray, it cannot hide a curved hit.
  const tube=.5*supportParams(a.profile).traction/a.profile.massKg*TURN_HORIZON**2;
  const near=peers.filter(peer=>{
    const dx=peer.pos.x-a.pos.x,dy=peer.pos.y-a.pos.y;
    const rx=a.vel.x-peer.vel.x,ry=a.vel.y-peer.vel.y,v2=rx*rx+ry*ry;
    const closest=v2>1e-12?Math.max(0,Math.min(TURN_HORIZON,(dx*rx+dy*ry)/v2)):0;
    return Math.hypot(dx-rx*closest,dy-ry*closest)<=peer.touch+tube+1e-9;
  });
  if(!near.length)return original;
  const samples=previewFreeMovement(a.body,original,context.now,TURN_STEPS);
  const clearances=near.map(peer=>sweptClearance(a,samples,peer));
  const worst=Math.min(...clearances);
  if(worst>=0)return original;
  // Yield speed while continuing the turn when that already clears traffic.
  // Maximizing clearance alone favors a full stop even when a moving gather
  // safely follows the same observed peers. Keep posture/facing/skill and let
  // ordinary movement decide whether this request is actually achievable.
  const slowed:Intent={...original,vel:{x:original.vel.x*.5,y:original.vel.y*.5}};
  const slower=previewFreeMovement(a.body,slowed,context.now,TURN_STEPS);
  if(slower.every(sample=>sample.support==='up')
    &&peers.every(peer=>sweptClearance(a,slower,peer)>=0))return slowed;
  const gather:Intent={...original,vel:{x:0,y:0}};
  const gathered=previewFreeMovement(a.body,gather,context.now,TURN_STEPS);
  if(gathered.some(sample=>sample.support!=='up'))return original;
  const alternative=near.map(peer=>sweptClearance(a,gathered,peer));
  // Do not cure one overlap by creating another in a previously clear lane.
  if(alternative.some((clearance,i)=>clearances[i]>=0&&clearance<0)
    ||Math.min(...alternative)<=worst+TURN_MARGIN)return original;
  return gather;
}

export function spaceTeammates(agents: readonly Agent[], intents: Intent[],
  observe: (a:Agent,b:Agent)=>SpacingPicture | null = ()=>null,
  context?:SpacingContext): void {
  const n = agents.length;
  for (let i = 0; i < n; i++) {
    const a = agents[i];
    let ia = intents[i];
    if (!ia || ia.free || ia.dive || a.body.support?.state !== 'up') continue;
    const capacity=availability(a.body.support,supportParams(a.profile),fatigueFactor(a.body.energy));
    const peers:PeerPicture[]=[];
    let installedOnly=true,restrictedByRoute=false;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const b = agents[j];
      if (b.team !== a.team) continue;
      const seen=observe(a,b);
      if (!seen) continue; // Unavailable information is not a live-body fallback.
      const touch = TOUCH * (a.profile.radius + b.profile.radius);
      peers.push({pos:seen.pos,vel:seen.vel,source:seen.source,forecast:seen.forecast,touch,
        radius:b.profile.radius,maxSpeed:b.profile.vmax});
    }
    // A free runner can choose space around a teammate instead of repeating a
    // requested straight ray followed by a speed-only correction. Test the
    // curved achieved path from this exact body, including residual momentum,
    // against all acquired neighbors together. There is no speed gate and no
    // live-body fallback. Loaded/contact movement keeps the ordinary controller.
    const s=a.body.support;
    if(context?.runCarrier===a.body&&!context.constrained?.has(a.body)&&!a.engagement
      &&!ia.lunge&&!(ia.push??0)&&!s.foot&&!s.strike
      &&Math.hypot(s.lean.x,s.lean.y)<1e-6&&Math.hypot(s.load.x,s.load.y)<1e-6){
      const choice=clearMovementStep(a.body,ia,{x:a.pos.x+ia.vel.x,y:a.pos.y+ia.vel.y},
        peers.map((p,id)=>({id,pos:p.pos,vel:p.vel,radius:p.radius,maxSpeed:p.maxSpeed,
          mayStop:p.source!=='called',
          ...(p.source==='called'?{route:p.forecast?.samples,validFor:p.forecast?.validFor??0}:{})})),
        context.now,TURN_HORIZON,Math.sign(ia.vel.y)||1,context.handContact??'center',
        context.allowDetour?(path,original)=>context.allowDetour!(a,path,original):undefined);
      ia=choice.command;
    }
    let vx = ia.vel.x, vy = ia.vel.y;
    for (const peer of peers) {
      const seen=peer,touch=peer.touch;
      const dx=seen.pos.x-a.pos.x,dy=seen.pos.y-a.pos.y,d=Math.hypot(dx,dy);
      const gap = d - touch;
      if (d < 1e-6) continue;
      const nx = dx / d, ny = dy / d;
      const brake=followAccel(a.body,{x:-nx*1e3,y:-ny*1e3},ia.cutSkill??1,capacity);
      const decel=Math.max(.1,-brake.x*nx-brake.y*ny);
      const current=Math.max(0,(a.vel.x-seen.vel.x)*nx+(a.vel.y-seen.vel.y)*ny);
      const stopping=current*CLOSE_HORIZON+current*current/(2*decel);
      if(gap>Math.max(AWARE_GAP,stopping))continue;
      const allowed=Math.sqrt((decel*CLOSE_HORIZON)**2+2*decel*Math.max(0,gap))-decel*CLOSE_HORIZON;
      const rawX=ia.vel.x-seen.vel.x,rawY=ia.vel.y-seen.vel.y,raw2=rawX*rawX+rawY*rawY;
      const rawClosest=raw2>1e-9?Math.max(0,(dx*rawX+dy*rawY)/raw2):0;
      if(rawX*nx+rawY*ny>allowed&&(gap<=0||Math.hypot(dx-rawX*rawClosest,dy-rawY*rawClosest)<=touch)){
        if(coversOpening(peer))restrictedByRoute=true;else installedOnly=false;
      }
      // Closing he plans, relative to where the teammate is going now.
      const rx=vx-seen.vel.x,ry=vy-seen.vel.y;
      const closing=rx*nx+ry*ny;
      // A nearby teammate beside a clean crossing lane is not an obstacle.
      // Check the swept approach before restricting closure; this keeps a
      // narrow, passable crease from becoming a radial repulsion field.
      const speed2=rx*rx+ry*ry;
      const closest=speed2>1e-9?Math.max(0,(dx*rx+dy*ry)/speed2):0;
      if(gap>0&&Math.hypot(dx-rx*closest,dy-ry*closest)>touch)continue;
      // Budget headway plus the distance this body needs to remove relative
      // speed. Do not assume the blocker, grounded helper or occupied tackler
      // will take half the correction. The world still limits the braking.
      if (closing > allowed) {
        if(!coversOpening(peer))installedOnly=false;
        const cut = closing - allowed;
        vx -= nx * cut; vy -= ny * cut;
      }
    }
    let spaced=ia;
    if (vx !== ia.vel.x || vy !== ia.vel.y) {
      const speed=Math.hypot(vx,vy),cap=a.profile.vmax*a.speedScale,scale=Math.min(1,cap/Math.max(1e-9,speed));
      spaced = { ...ia, vel: { x: vx*scale, y: vy*scale } };
    }
    if(spaced!==ia&&installedOnly&&restrictedByRoute&&clearInstalledOpening(a,ia,peers,context))spaced=ia;
    intents[i]=gatherForTurn(a,spaced,peers,context);
  }
}
