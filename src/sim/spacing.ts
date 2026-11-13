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
import { hypot2 } from '../core/vec.js';
import type { Intent } from '../physics/world.js';
import {fatigueFactor,followAccel,type Body} from '../physics/kinematics.js';
import {previewFreeMovement,type MovementSample} from '../physics/movement-preview.js';
import {availability,supportParams} from '../physics/support.js';
import type { Agent } from './agent.js';
import type { Vec2 } from '../core/vec.js';
import type {Perceived} from './perception.js';
import { movementObjective } from './movement-objective.js';
import { containCoverage } from './coverage-space.js';
import { localTrafficRoute } from './traffic-route.js';

/** RB_STEER (default off): a ball carrier (or a lead back) whose held
 * request runs into a teammate first tries bending the same request around him at speed; only
 * when no bend clears does he slow down or gather. */
export const RB_STEER = process.env.RB_STEER !== '0';
/** LINE_STEP (default off): headway against a teammate on an announced step
 * (linemen stepping together on a zone track) is budgeted against where his
 * step takes him over the closing horizon, not his current speed: the inside
 * man of a pair steps with his partner instead of waiting on his first step. */
export const LINE_STEP = process.env.LINE_STEP !== '0';
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
  /** LINE_STEP: a teammate's velocity at the closing horizon from his announced step, if any. */
  calledAhead?: (a: Agent, b: Agent, horizon: number) => Vec2 | null;
}

type MotionForecast = (command: Intent) => MovementSample[];

interface PeerPicture {
  key: number;
  age?: number;
  pos: {x:number;y:number};
  vel: {x:number;y:number};
  touch: number;
}

interface ClosingLimit { key:number; nx:number; ny:number; speed:number }

/** Later radial corrections must not undo earlier teammate headway. Choose
 * the closest requested velocity satisfying the already admitted limits and
 * existing speed cap. This is a command projection, not achievable clearance:
 * momentum, contacts and the next acquired picture still govern movement.
 * A squeezed/inconsistent picture can have no feasible request; retain the
 * ordinary response there rather than inventing room or moving a teammate.
 */
function jointClosingRequest(raw:{x:number;y:number}, ordinary:{x:number;y:number},
  limits:readonly ClosingLimit[], cap:number):{x:number;y:number} {
  const feasible=(v:{x:number;y:number})=>hypot2(v.x,v.y)<=cap+1e-9
    &&limits.every(c=>v.x*c.nx+v.y*c.ny<=c.speed+1e-9);
  // Sequential corrections can be feasible yet farther from the selected
  // request than a joint solution. Keep that response as a fallback, then
  // evaluate the same boundary candidates before accepting its diversion.
  let best:{x:number;y:number}|undefined=feasible(ordinary)?ordinary:undefined;
  let bestError=best?(best.x-raw.x)**2+(best.y-raw.y)**2:Infinity;
  function consider(x:number,y:number):void {
    const v={x,y},error=(x-raw.x)**2+(y-raw.y)**2;
    // Algebraically equivalent projections can differ by a few rounding
    // units. Retain the existing request on that numerical tie.
    const tie=16*Number.EPSILON*Math.max(1,error,bestError);
    if((!best||error<bestError-tie)&&feasible(v)){best=v;bestError=error;}
  }
  const speed=hypot2(raw.x,raw.y),scale=Math.min(1,cap/Math.max(1e-9,speed));
  consider(raw.x*scale,raw.y*scale);
  for(let i=0;i<limits.length;i++){
    const c=limits[i],excess=raw.x*c.nx+raw.y*c.ny-c.speed;
    consider(raw.x-c.nx*excess,raw.y-c.ny*excess);
    // An optimum lies on one limit, two intersecting limits, or the cap.
    const tangent2=cap*cap-c.speed*c.speed;
    if(tangent2>=0){
      const tangent=Math.sqrt(tangent2);
      consider(c.nx*c.speed-c.ny*tangent,c.ny*c.speed+c.nx*tangent);
      consider(c.nx*c.speed+c.ny*tangent,c.ny*c.speed-c.nx*tangent);
    }
    for(let j=0;j<i;j++){
      const d=limits[j],cross=c.nx*d.ny-c.ny*d.nx;
      if(Math.abs(cross)>1e-12)consider((c.speed*d.ny-c.ny*d.speed)/cross,
        (c.nx*d.speed-c.speed*d.nx)/cross);
    }
  }
  return best??ordinary;
}

function sweptClearance(a:Agent, samples:readonly MovementSample[], peer:PeerPicture):number {
  let px=a.pos.x-peer.pos.x,py=a.pos.y-peer.pos.y;
  let minimum=hypot2(px,py)-peer.touch;
  for(const sample of samples){
    const rx=sample.pos.x-peer.pos.x-peer.vel.x*sample.t;
    const ry=sample.pos.y-peer.pos.y-peer.vel.y*sample.t;
    const ex=rx-px,ey=ry-py;
    const along=Math.max(0,Math.min(1,-(px*ex+py*ey)/Math.max(1e-12,ex*ex+ey*ey)));
    minimum=Math.min(minimum,hypot2(px+along*ex,py+along*ey)-peer.touch);
    px=rx;py=ry;
  }
  return minimum;
}

/** A gather request is evaluated with the same posture/facing as its execution.
 * This is a held-command forecast against observed constant-velocity peers,
 * not a contact solve or knowledge of their next decisions. Replan next tick.
 */
function forecastPeers(a:Agent, original:Intent, peers:readonly PeerPicture[], context?:SpacingContext):readonly PeerPicture[] {
  const s=a.body.support,speed=hypot2(a.vel.x,a.vel.y);
  if(!context||!Number.isFinite(context.now)||speed<2||a.isDown(context.now)
    ||a.engagement||context.constrained?.has(a.body)||original.free||original.dive||original.lunge
    ||(original.squeeze??0)>1e-6||(a.body.squeeze??0)>1e-6
    ||(original.push??0)>1e-6||!s||s.state!=='up'||s.foot||s.strike
    ||hypot2(s.lean.x,s.lean.y)>1e-6||hypot2(s.load.x,s.load.y)>1e-6)return [];
  // A nearly aligned request does not remove momentum.
  // Admit by the attainable tube below, then evaluate the actual held-command
  // movement rather than assuming the body immediately adopts its request.
  // In an empty World, every COM acceleration is bounded by traction/mass
  // (including a fall). Midpoint integration keeps its path within .5*a*t²
  // of the initial-velocity line. This tube only rejects definitely clear
  // pictures; unlike the requested straight ray, it cannot hide a curved hit.
  const tube=.5*supportParams(a.profile).traction/a.profile.massKg*TURN_HORIZON**2;
  const near=peers.filter(peer=>{
    const dx=peer.pos.x-a.pos.x,dy=peer.pos.y-a.pos.y;
    const rx=a.vel.x-peer.vel.x,ry=a.vel.y-peer.vel.y,v2=rx*rx+ry*ry;
    const closest=v2>1e-12?Math.max(0,Math.min(TURN_HORIZON,(dx*rx+dy*ry)/v2)):0;
    return hypot2(dx-rx*closest,dy-ry*closest)<=peer.touch+tube+1e-9;
  });
  if(!near.length)return [];
  // An exactly matched request and settled support preserve the current
  // travel line in free movement. Speed/facing caps can brake along it, but
  // supply no transverse force. Reject only peers whose entire acquired
  // constant-velocity sweep stays outside that line's touch corridor.
  // This is a clearance proof, not a small-requested-turn eligibility test.
  const settled=original.vel.x===a.vel.x&&original.vel.y===a.vel.y
    &&s.feetLock===0&&(original.push??0)===0
    &&(original.squeeze??0)===0&&(a.body.squeeze??0)===0
    &&[s.xi,s.lean,s.load,s.felt,s.feetVel,s.fall,s.accel,s.tipAccel,s.feltTip]
      .every(v=>!v||(v.x===0&&v.y===0));
  if(settled&&near.every(peer=>{
    const nx=-a.vel.y/speed,ny=a.vel.x/speed;
    const first=(peer.pos.x-a.pos.x)*nx+(peer.pos.y-a.pos.y)*ny;
    const last=first+(peer.vel.x*nx+peer.vel.y*ny)*TURN_HORIZON;
    return Number.isFinite(first)&&Number.isFinite(last)&&first*last>0
      &&Math.min(Math.abs(first),Math.abs(last))>peer.touch+1e-9;
  }))return [];
  return near;
}

function gatherForMotion(a:Agent, original:Intent, peers:readonly PeerPicture[], forecast:MotionForecast, context?:SpacingContext):Intent {
  const near=forecastPeers(a,original,peers,context);
  if(!near.length)return original;
  const samples=forecast(original);
  const clearances=near.map(peer=>sweptClearance(a,samples,peer));
  const worst=Math.min(...clearances);
  if(worst>=0)return original;
  if(RB_STEER&&(a.behavior.kind==='carrier'||(a.behavior as {plan?:{kind?:string}}).plan?.kind==='lead')){
    // Bend around the teammate at the requested pace: the smallest bend
    // that clears every peer and still makes progress along the request.
    const sp=hypot2(original.vel.x,original.vel.y),h0=Math.atan2(original.vel.y,original.vel.x);
    for(const off of [.2,-.2,.4,-.4,.6,-.6,.8,-.8]){
      const h=h0+off,bent:Intent={...original,vel:{x:Math.cos(h)*sp,y:Math.sin(h)*sp}};
      const path=forecast(bent);
      if(path.every(sample=>sample.support==='up')&&peers.every(peer=>sweptClearance(a,path,peer)>=0))return bent;
    }
  }
  // Yield speed while continuing the turn when that already clears traffic.
  // Maximizing clearance alone favors a full stop even when a moving gather
  // safely follows the same observed peers. Keep posture/facing/skill and let
  // ordinary movement decide whether this request is actually achievable.
  const slowed:Intent={...original,vel:{x:original.vel.x*.5,y:original.vel.y*.5}};
  const slower=forecast(slowed);
  if(slower.every(sample=>sample.support==='up')
    &&peers.every(peer=>sweptClearance(a,slower,peer)>=0)){
    // Half speed is a verified fallback, not the only available pace. Keep
    // more of the requested motion when the same acquired picture and actual
    // free-movement law support it. Each trial must clear every peer; no
    // monotonic clearance or optimal-speed claim is needed for this bounded
    // search. Keep the fallback when a trial loses clearance or progress.
    let chosen=slowed,lower=.5,upper=1;
    const progress=(path:readonly MovementSample[])=>{
      const end=path[path.length-1];
      return(end.pos.x-a.pos.x)*original.vel.x+(end.pos.y-a.pos.y)*original.vel.y;
    };
    let achieved=progress(slower);
    for(let k=0;k<3;k++){
      const scale=(lower+upper)/2;
      const command:Intent={...original,vel:{x:original.vel.x*scale,y:original.vel.y*scale}};
      const path=forecast(command);
      if(path.every(sample=>sample.support==='up')
        &&peers.every(peer=>sweptClearance(a,path,peer)>=0)){
        lower=scale;
        const next=progress(path);
        if(next>=achieved){chosen=command;achieved=next;}
      }else upper=scale;
    }
    return chosen;
  }
  const gather:Intent={...original,vel:{x:0,y:0}};
  const gathered=forecast(gather);
  if(gathered.some(sample=>sample.support!=='up'))return original;
  const alternative=near.map(peer=>sweptClearance(a,gathered,peer));
  // Do not cure one overlap by creating another in a previously clear lane.
  if(alternative.some((clearance,i)=>clearances[i]>=0&&clearance<0)
    ||Math.min(...alternative)<=worst+TURN_MARGIN)return original;
  return gather;
}

interface PassingFrame { peer: number; forward: {x:number;y:number}; normal: {x:number;y:number} }
// Own maneuver state, not remembered peer motion. Every evaluation uses this
// tick's acquired picture; a missing picture ends the maneuver.
const passingFrames=new WeakMap<Agent,PassingFrame>();

/** One compound local action: keep useful forward braking while matching the
 * obstructing teammate's acquired transverse motion. This is not a new route
 * or assignment. Full/half/gather alone can all intersect the same teammate.
 */
function stepAroundTraffic(a:Agent, raw:Intent, chosen:Intent, peers:readonly PeerPicture[], forecast:MotionForecast, context?:SpacingContext):Intent {
  const goal=movementObjective(raw),speed=hypot2(raw.vel.x,raw.vel.y);
  const clear=()=>{passingFrames.delete(a);return chosen;};
  if((a.behavior.kind!=='man'&&a.behavior.kind!=='zone')||!goal||speed<1e-9
    ||![goal.point.x,goal.point.y].every(Number.isFinite)
    ||(goal.kind==='moving'&&(!goal.velocity||![goal.velocity.x,goal.velocity.y].every(Number.isFinite)))
    ||peers.some(p=>!Number.isFinite(p.age)||p.age! < 0
      ||![p.pos.x,p.pos.y,p.vel.x,p.vel.y].every(Number.isFinite))
    ||!forecastPeers(a,raw,peers,context).length)return clear();
  const flow=goal.kind==='fixed'?{x:0,y:0}:goal.velocity!;
  const forward={x:raw.vel.x/speed,y:raw.vel.y/speed};
  const dot=(x:number,y:number,v:{x:number;y:number})=>x*v.x+y*v.y;
  const gaps=(path:readonly MovementSample[])=>peers.map(p=>sweptClearance(a,path,p));
  const originalPath=forecast(raw);
  const originalGaps=gaps(originalPath);
  const residual=forecast({...raw,vel:{...a.vel}});
  const residualGaps=gaps(residual);
  let passing=passingFrames.get(a);
  if(passing){
    const p=peers.find(p=>p.key===passing!.peer);
    if(!p||dot(p.pos.x-a.pos.x,p.pos.y-a.pos.y,passing.forward)<=0
      ||dot(forward.x,forward.y,passing.forward)<=0)passing=undefined;
  }
  if(!passing){
    const conflicts=Math.min(...originalGaps)<0?originalGaps:residualGaps;
    const worst=Math.min(...conflicts);
    if(worst>=0)return clear();
    const peer=peers[conflicts.indexOf(worst)];
    const normal={x:-forward.y,y:forward.x};
    if(dot(peer.pos.x-a.pos.x,peer.pos.y-a.pos.y,normal)>0){normal.x=-normal.x;normal.y=-normal.y;}
    passing={peer:peer.key,forward,normal};
  }
  passingFrames.set(a,passing);
  const peer=peers.find(p=>p.key===passing!.peer)!,normal=passing.normal;
  const oldPath=chosen===raw?originalPath:forecast(chosen);
  const oldGaps=gaps(oldPath),previous=Math.min(...oldGaps);
  const error=(path:readonly MovementSample[])=>{
    const end=path[path.length-1];
    return hypot2(end.pos.x-goal.point.x-flow.x*end.t,end.pos.y-goal.point.y-flow.y*end.t);
  };
  const stationaryError=hypot2(a.pos.x-goal.point.x-flow.x*TURN_HORIZON,
    a.pos.y-goal.point.y-flow.y*TURN_HORIZON);
  function evaluate(base:Intent):Intent|undefined {
    const correction=dot(peer.vel.x-base.vel.x,peer.vel.y-base.vel.y,normal);
    const vx=base.vel.x+normal.x*correction,vy=base.vel.y+normal.y*correction;
    const scale=Math.min(1,speed/Math.max(1e-9,hypot2(vx,vy)));
    // Preserve field containment, facing, posture and all other modifiers.
    const command:Intent={...base,vel:containCoverage(a,{...base,vel:{x:vx*scale,y:vy*scale}}).vel};
    const path=forecast(command),next=gaps(path),end=path[path.length-1];
    if(path.some(s=>s.support!=='up')||dot(end.pos.x-a.pos.x,end.pos.y-a.pos.y,forward)<=0
      ||next.some((g,i)=>oldGaps[i]>=0&&g<0))return;
    // An unsafe unloaded sprint's endpoint is not an achievable-contact
    // benchmark. During overlap demand useful progress plus material relief;
    // when the native action clears, improve the original goal without a hit.
    if(previous<0?Math.min(...next)>previous+TURN_MARGIN&&error(path)<stationaryError
      :Math.min(...next)>=0&&error(path)<error(oldPath))return command;
  }
  const adjusted=evaluate(chosen);
  if(adjusted)return adjusted;
  if(previous<0){
    // Retain current facing/posture constraints; add only the existing
    // half-speed option composed with that same transverse adjustment.
    const combined=evaluate({...chosen,vel:{x:raw.vel.x*.5,y:raw.vel.y*.5}});
    if(combined)return combined;
  }
  return chosen;
}

export function spaceTeammates(agents: readonly Agent[], intents: Intent[],
  observe: (a:Agent,b:Agent)=>Pick<Perceived,'pos'|'vel'> = (_a,b)=>b,
  context?:SpacingContext): void {
  const n = agents.length;
  for (let i = 0; i < n; i++) {
    const a = agents[i];
    const ia = intents[i];
    if (!ia || ia.free || ia.dive || a.body.support?.state !== 'up') { passingFrames.delete(a); continue; }
    const capacity=availability(a.body.support,supportParams(a.profile),fatigueFactor(a.body.energy));
    let vx = ia.vel.x, vy = ia.vel.y;
    const peers:PeerPicture[]=[];
    const limits:ClosingLimit[]=[];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const b = agents[j];
      if (b.team !== a.team) continue;
      const seen=observe(a,b);
      const dx = seen.pos.x - a.pos.x, dy = seen.pos.y - a.pos.y;
      const d = hypot2(dx, dy);
      const touch = TOUCH * (a.profile.radius + b.profile.radius);
      peers.push({key:b.idx,pos:seen.pos,vel:seen.vel,touch,age:(seen as Perceived).age});
      const gap = d - touch;
      if (d < 1e-6) continue;
      const nx = dx / d, ny = dy / d;
      const brake=followAccel(a.body,{x:-nx*1e3,y:-ny*1e3},ia.cutSkill??1,capacity);
      const decel=Math.max(.1,-brake.x*nx-brake.y*ny);
      const current=Math.max(0,(a.vel.x-seen.vel.x)*nx+(a.vel.y-seen.vel.y)*ny);
      const stopping=current*CLOSE_HORIZON+current*current/(2*decel);
      if(gap>Math.max(AWARE_GAP,stopping))continue;
      // Closing he plans, relative to where the teammate is going now
      // (LINE_STEP: where the teammate's announced step takes him).
      const goes=(LINE_STEP?context?.calledAhead?.(a,b,CLOSE_HORIZON):null)??seen.vel;
      const rx=vx-goes.x,ry=vy-goes.y;
      const closing=rx*nx+ry*ny;
      // A nearby teammate beside a clean crossing lane is not an obstacle.
      // Check the swept approach before restricting closure; this keeps a
      // narrow, passable crease from becoming a radial repulsion field.
      const speed2=rx*rx+ry*ry;
      const closest=speed2>1e-9?Math.max(0,(dx*rx+dy*ry)/speed2):0;
      if(gap>0&&hypot2(dx-rx*closest,dy-ry*closest)>touch)continue;
      // Budget headway plus the distance this body needs to remove relative
      // speed. Do not assume the blocker, grounded helper or occupied tackler
      // will take half the correction. The world still limits the braking.
      const allowed=Math.sqrt((decel*CLOSE_HORIZON)**2+2*decel*Math.max(0,gap))-decel*CLOSE_HORIZON;
      limits.push({key:b.idx,nx,ny,speed:allowed+goes.x*nx+goes.y*ny});
      if (closing > allowed) {
        const cut = closing - allowed;
        vx -= nx * cut; vy -= ny * cut;
      }
    }
    let spaced=ia;
    if (vx !== ia.vel.x || vy !== ia.vel.y) {
      const speed=hypot2(vx,vy),cap=a.profile.vmax*a.speedScale,scale=Math.min(1,cap/Math.max(1e-9,speed));
      const ordinary={x:vx*scale,y:vy*scale},s=a.body.support;
      // This is free footwork. A loaded blocker or committed strike cannot
      // be allocated a new joint velocity from radial headway alone: the
      // contact controller owns that work, and the World resolves its load.
      const free=context&&Number.isFinite(context.now)&&!a.isDown(context.now)&&!a.engagement&&!context.constrained?.has(a.body)
        &&!ia.lunge&&(ia.push??0)<=1e-6&&(ia.squeeze??0)<=1e-6&&(a.body.squeeze??0)<=1e-6
        &&!s.foot&&!s.strike&&hypot2(s.lean.x,s.lean.y)<=1e-6&&hypot2(s.load.x,s.load.y)<=1e-6;
      spaced = { ...ia, vel: free?jointClosingRequest(ia.vel,ordinary,limits,cap):ordinary };
    }
    // Both selectors may ask about the same request. The body/time are fixed
    // throughout this call and previews return detached samples. Share only
    // exact request objects here; the next actor/decision gets a fresh cache.
    let forecasts:Map<Intent,MovementSample[]>|undefined;
    const forecast:MotionForecast=command=>{
      const cached=forecasts?.get(command);
      if(cached)return cached;
      const samples=previewFreeMovement(a.body,command,context!.now,TURN_STEPS);
      (forecasts??=new Map()).set(command,samples);
      return samples;
    };
    const gathered=gatherForMotion(a,spaced,peers,forecast,context);
    const ordinary=stepAroundTraffic(a,ia,gathered,peers,forecast,context);
    const s=a.body.support;
    const free=!!context&&Number.isFinite(context.now)&&!a.isDown(context.now)&&!a.engagement
      &&!context.constrained?.has(a.body)&&!ia.free&&!ia.dive&&!ia.lunge
      &&(ia.squeeze??0)<=1e-6&&(a.body.squeeze??0)<=1e-6&&(ia.push??0)<=1e-6
      &&!!s&&s.state==='up'&&!s.foot&&!s.strike
      &&hypot2(s.lean.x,s.lean.y)<=1e-6&&hypot2(s.load.x,s.load.y)<=1e-6;
    // Radial headway uses the requested straight line. A free carrier's
    // current momentum can instead carry the same request safely around a
    // teammate. Retain that football decision only when its actual own-body
    // preview clears EVERY acquired peer; unknown or loaded pictures keep
    // the ordinary response. No peer's future choice is predicted here.
    let selected=ordinary;
    if(free&&a.behavior.kind==='carrier'
      &&(ordinary.vel.x!==ia.vel.x||ordinary.vel.y!==ia.vel.y)
      &&peers.every(p=>Number.isFinite(p.age)&&p.age!>=0
        &&[p.pos.x,p.pos.y,p.vel.x,p.vel.y,p.touch].every(Number.isFinite))){
      const path=forecast(ia),end=path[path.length-1];
      // A clear prefix cannot cancel braking for a still-approaching peer
      // beyond the preview. Restore only a pass that has completed within
      // this same model: both achieved and requested relative motion must
      // be separating from each peer whose headway restricted raw.
      const passed=limits.every(limit=>{
        if(ia.vel.x*limit.nx+ia.vel.y*limit.ny<=limit.speed)return true;
        const peer=peers.find(p=>p.key===limit.key)!;
        const dx=end.pos.x-peer.pos.x-peer.vel.x*end.t;
        const dy=end.pos.y-peer.pos.y-peer.vel.y*end.t;
        return dx*(end.vel.x-peer.vel.x)+dy*(end.vel.y-peer.vel.y)>=0
          &&dx*(ia.vel.x-peer.vel.x)+dy*(ia.vel.y-peer.vel.y)>=0;
      });
      if(passed&&path.every(sample=>sample.support==='up')
        &&peers.every(peer=>sweptClearance(a,path,peer)>=0))selected=ia;
    }
    intents[i]=localTrafficRoute(a,ia,selected,peers,forecast,free,selected===gathered);
  }
}
