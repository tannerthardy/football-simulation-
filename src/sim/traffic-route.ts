/** A short local passing action around acquired teammate traffic.
 * The football goal remains the producer's goal. Geometry suggests directions;
 * the existing movement preview tests their achievable motion. Neither the
 * geometric cost nor a constant-velocity peer forecast certifies a whole route.
 */
import type {Vec2} from '../core/vec.js';
import type {MovementSample} from '../physics/movement-preview.js';
import type {Intent} from '../physics/world.js';
import type {Agent} from './agent.js';
import {containCoverage} from './coverage-space.js';
import {movementObjective,type MovementObjective} from './movement-objective.js';

export interface TrafficPeer {
  key:number; age?:number; pos:Vec2; vel:Vec2; touch:number;
}
type Forecast=(command:Intent)=>MovementSample[];
interface PassingAction {
  normal:Vec2; forward:Vec2; peers:number[]; kind:MovementObjective['kind'];
}
const actions=new WeakMap<Agent,PassingAction>();
const HORIZON=.6;
const EPS=1e-9;
const angle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));

/** Exact shortest geometric distance around one disc, with stationary endpoints.
 * Taking the maximum over peers is a lower bound for combined traffic, not a
 * known multi-peer path. It values a useful lateral setup which straight-line
 * endpoint distance alone can erase on every replanning tick.
 */
function discDistance(from:Vec2,goal:Vec2,center:Vec2,radius:number):number {
  const ax=from.x-center.x,ay=from.y-center.y,bx=goal.x-center.x,by=goal.y-center.y;
  const da=Math.hypot(ax,ay),db=Math.hypot(bx,by);
  if(da<=radius||db<=radius)return Infinity;
  const sx=goal.x-from.x,sy=goal.y-from.y;
  const along=Math.max(0,Math.min(1,-(ax*sx+ay*sy)/Math.max(1e-12,sx*sx+sy*sy)));
  const direct=Math.hypot(sx,sy);
  if(Math.hypot(ax+along*sx,ay+along*sy)>=radius)return direct;
  const between=Math.acos(Math.max(-1,Math.min(1,(ax*bx+ay*by)/(da*db))));
  const arc=Math.max(0,between-Math.acos(radius/da)-Math.acos(radius/db));
  return Math.sqrt(da*da-radius*radius)+Math.sqrt(db*db-radius*radius)+radius*arc;
}

function clearance(a:Agent,path:readonly MovementSample[],peer:TrafficPeer):number {
  let x=a.pos.x-peer.pos.x,y=a.pos.y-peer.pos.y,least=Math.hypot(x,y)-peer.touch;
  for(const sample of path){
    const xx=sample.pos.x-peer.pos.x-peer.vel.x*sample.t;
    const yy=sample.pos.y-peer.pos.y-peer.vel.y*sample.t;
    const dx=xx-x,dy=yy-y;
    const along=Math.max(0,Math.min(1,-(x*dx+y*dy)/Math.max(1e-12,dx*dx+dy*dy)));
    least=Math.min(least,Math.hypot(x+along*dx,y+along*dy)-peer.touch);x=xx;y=yy;
  }
  return least;
}

/** Only the existing man/zone free-footwork scope. The caller owns tactile
 * eligibility; every peer and goal here must still have known acquired motion.
 * Start after ordinary spacing loses movement and its existing compound action
 * finds no alternative. An adopted side can continue while it is useful and
 * achievable, rather than reversing for a tiny one-horizon ranking gain.
 */
export function localTrafficRoute(a:Agent,raw:Intent,ordinary:Intent,peers:readonly TrafficPeer[],
  forecast:Forecast,eligible:boolean,allowStart:boolean):Intent {
  const clear=()=>{actions.delete(a);return ordinary;};
  const goal=movementObjective(raw),speed=Math.hypot(raw.vel.x,raw.vel.y);
  if(!eligible||(a.behavior.kind!=='man'&&a.behavior.kind!=='zone')||!goal||speed<EPS
    ||![goal.point.x,goal.point.y].every(Number.isFinite)
    ||peers.some(p=>!Number.isFinite(p.age)||p.age!<0
      ||![p.pos.x,p.pos.y,p.vel.x,p.vel.y,p.touch].every(Number.isFinite)))return clear();
  const flow=goal.kind==='fixed'?{x:0,y:0}:goal.velocity;
  if(!flow||![flow.x,flow.y].every(Number.isFinite))return clear();
  let held=actions.get(a);
  if(!held&&(!allowStart||(ordinary.vel.x===raw.vel.x&&ordinary.vel.y===raw.vel.y)))return clear();
  const dx=goal.point.x-a.pos.x,dy=goal.point.y-a.pos.y,distance=Math.hypot(dx,dy);
  if(distance<EPS)return clear();
  const heading=Math.atan2(dy,dx),forward={x:dx/distance,y:dy/distance};
  const intervals=peers.flatMap(peer=>{
    const x=peer.pos.x-a.pos.x,y=peer.pos.y-a.pos.y,d=Math.hypot(x,y);
    if(d<=peer.touch||x*forward.x+y*forward.y<=0||d>distance)return [];
    const bearing=angle(Math.atan2(y,x)-heading),half=Math.asin(peer.touch/d);
    return [{key:peer.key,lo:bearing-half,hi:bearing+half}];
  });
  // Join overlapping angular silhouettes; evaluate both outer tangents against
  // ALL peers below. This union is a direction proposal, never a clear corridor.
  let lo=0,hi=0;const obstructing=new Set<number>();
  for(let i=0;i<=intervals.length;i++)for(const span of intervals){
    if(span.lo<=hi&&span.hi>=lo){lo=Math.min(lo,span.lo);hi=Math.max(hi,span.hi);obstructing.add(span.key);}
  }
  if(lo===0&&hi===0)return clear();
  if(held&&(held.kind!==goal.kind||held.forward.x*forward.x+held.forward.y*forward.y<=0
    ||!held.peers.some(key=>obstructing.has(key))))held=undefined;
  const futureGoal={x:goal.point.x+flow.x*HORIZON,y:goal.point.y+flow.y*HORIZON};
  const cost=(point:Vec2)=>Math.max(Math.hypot(point.x-futureGoal.x,point.y-futureGoal.y),
    ...peers.map(peer=>discDistance(point,futureGoal,
      {x:peer.pos.x+peer.vel.x*HORIZON,y:peer.pos.y+peer.vel.y*HORIZON},peer.touch)));
  const oldPath=forecast(ordinary),oldGaps=peers.map(peer=>clearance(a,oldPath,peer));
  const oldCost=cost(oldPath[oldPath.length-1].pos),stationaryCost=cost(a.pos);
  const paces=[speed,Math.hypot(ordinary.vel.x,ordinary.vel.y)].filter((v,i,all)=>v>EPS&&all.indexOf(v)===i);
  const candidates=[];
  for(const offset of [lo,hi])for(const pace of paces){
    const direction=heading+offset;
    const command=containCoverage(a,{...raw,vel:{x:Math.cos(direction)*pace,y:Math.sin(direction)*pace}});
    const path=forecast(command),gaps=peers.map(peer=>clearance(a,path,peer));
    if(path.some(sample=>sample.support!=='up')
      ||gaps.some((gap,i)=>gap<Math.min(0,oldGaps[i])-EPS))continue;
    const end=path[path.length-1],remaining=cost(end.pos);
    if(!Number.isFinite(remaining))continue;
    candidates.push({command,remaining,normal:{x:-forward.y*Math.sign(offset),y:forward.x*Math.sign(offset)}});
  }
  // A retained action needs fresh physical and information checks on every tick.
  // It may briefly retreat while still shortening this same navigable goal.
  // No fixed commitment timer, forced velocity or stale peer prediction persists.
  const continuing=held?candidates.filter(c=>c.normal.x*held!.normal.x+c.normal.y*held!.normal.y>0
    &&c.remaining<stationaryCost-EPS).sort((a,b)=>a.remaining-b.remaining)[0]:undefined;
  const selected=continuing??candidates.filter(c=>c.remaining<oldCost-EPS).sort((a,b)=>a.remaining-b.remaining)[0];
  if(!selected){if(!held)actions.delete(a);return ordinary;}
  actions.set(a,{normal:selected.normal,forward,peers:[...obstructing],kind:goal.kind});
  return selected.command;
}
