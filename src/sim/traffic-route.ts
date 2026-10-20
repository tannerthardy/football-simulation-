/** Local routes keep the football goal and use only acquired teammate pictures.
 * Static geometry proposes the detour; ordinary movement previews decide which
 * short command is achievable. Neither predicts a teammate's future decision.
 */
import {END_LINE_X,FIELD_WIDTH} from '../core/field.js';
import type {MovementSample} from '../physics/movement-preview.js';
import type {Intent} from '../physics/world.js';
import type {Agent} from './agent.js';
import {containCoverage} from './coverage-space.js';
import {movementObjective} from './movement-objective.js';
import type {TrafficDisc} from './traffic-path.js';
import {trafficDistance,trafficRoute} from './traffic-distance.js';

export interface TrafficPeer {
  key:number; age?:number; pos:{x:number;y:number}; vel:{x:number;y:number}; touch:number;
}
type Forecast=(command:Intent)=>MovementSample[];
const routing=new WeakSet<Agent>();
const HORIZON=.6,EPS=1e-9;

/** Swept touch geometry and incoming normal speed from the same achieved
 * preview. Less eventual overlap alone can hide an earlier, harder impact.
 * This is a contact-risk comparison, not a prediction of delivered impulse.
 */
function encounter(a:Agent,path:readonly MovementSample[],peer:TrafficPeer):{gap:number;closing:number} {
  let x=a.pos.x-peer.pos.x,y=a.pos.y-peer.pos.y,least=Math.hypot(x,y)-peer.touch;
  let closing:number|undefined,time=0;
  if(least < -EPS)closing=Math.max(0,-(x*(a.vel.x-peer.vel.x)+y*(a.vel.y-peer.vel.y))/Math.max(EPS,Math.hypot(x,y)));
  for(const sample of path){
    const xx=sample.pos.x-peer.pos.x-peer.vel.x*sample.t;
    const yy=sample.pos.y-peer.pos.y-peer.vel.y*sample.t;
    const dx=xx-x,dy=yy-y;
    const along=Math.max(0,Math.min(1,-(x*dx+y*dy)/Math.max(1e-12,dx*dx+dy*dy)));
    const gap=Math.hypot(x+along*dx,y+along*dy)-peer.touch;
    if(closing===undefined&&gap < -EPS){
      const aa=dx*dx+dy*dy,bb=2*(x*dx+y*dy),cc=x*x+y*y-peer.touch*peer.touch;
      const first=cc<=0?0:Math.max(0,Math.min(1,(-bb-Math.sqrt(Math.max(0,bb*bb-4*aa*cc)))/(2*aa)));
      const rx=x+first*dx,ry=y+first*dy;
      closing=Math.max(0,-(rx*dx+ry*dy)/(Math.max(EPS,sample.t-time)*Math.max(EPS,Math.hypot(rx,ry))));
    }
    least=Math.min(least,gap);x=xx;y=yy;time=sample.t;
  }
  return {gap:least,closing:closing??0};
}

/** Existing man/zone free-footwork scope only. Start when ordinary spacing
 * restricts the selected request and its existing compound action found no
 * alternative. Continue to reconsider the local route while the acquired
 * obstacle still blocks that same goal; no fixed hold timer or peer memory.
 */
export function localTrafficRoute(a:Agent,raw:Intent,ordinary:Intent,peers:readonly TrafficPeer[],
  forecast:Forecast,eligible:boolean,allowStart:boolean):Intent {
  const clear=()=>{routing.delete(a);return ordinary;};
  const goal=movementObjective(raw),speed=Math.hypot(raw.vel.x,raw.vel.y);
  if(!eligible||(a.behavior.kind!=='man'&&a.behavior.kind!=='zone')||!goal||speed<EPS
    ||![goal.point.x,goal.point.y].every(Number.isFinite)
    ||peers.some(p=>!Number.isFinite(p.age)||p.age!<0
      ||![p.pos.x,p.pos.y,p.vel.x,p.vel.y,p.touch].every(Number.isFinite)))return clear();
  const flow=goal.kind==='fixed'?{x:0,y:0}:goal.velocity;
  if(!flow||![flow.x,flow.y].every(Number.isFinite))return clear();
  if(!routing.has(a)&&(!allowStart||(ordinary.vel.x===raw.vel.x&&ordinary.vel.y===raw.vel.y)))return ordinary;
  const margin=a.profile.radius+.5;
  const bounds={minX:margin,maxX:END_LINE_X-margin,minY:margin,maxY:FIELD_WIDTH-margin};
  const futureGoal={x:goal.point.x+flow.x*HORIZON,y:goal.point.y+flow.y*HORIZON};
  const discs:TrafficDisc[]=peers.map(peer=>({center:peer.pos,radius:peer.touch}));
  const route=trafficRoute(a.pos,futureGoal,discs,bounds);
  if(!route||route.distance<=Math.hypot(a.pos.x-futureGoal.x,a.pos.y-futureGoal.y)+EPS)return clear();
  const futureDiscs=peers.map(peer=>({center:{x:peer.pos.x+peer.vel.x*HORIZON,
    y:peer.pos.y+peer.vel.y*HORIZON},radius:peer.touch}));
  const cost=(point:{x:number;y:number})=>trafficDistance(point,futureGoal,futureDiscs,bounds)??Infinity;
  const oldPath=forecast(ordinary),oldEncounters=peers.map(peer=>encounter(a,oldPath,peer));
  const oldCost=cost(oldPath[oldPath.length-1].pos);
  let best=ordinary,bestCost=oldCost;
  // A turn can require a real brake before the body can follow its tangent.
  // These are the actor's existing raw pace, restricted pace, and gather;
  // direction comes from joint geometry rather than extra sampled angles.
  const paces=[speed,Math.hypot(ordinary.vel.x,ordinary.vel.y),0].filter((v,i,all)=>all.indexOf(v)===i);
  for(const pace of paces){
    const command=containCoverage(a,{...raw,vel:{x:route.firstDirection.x*pace,y:route.firstDirection.y*pace}});
    const path=forecast(command);
    if(path.some(sample=>sample.support!=='up')
      ||peers.some((peer,i)=>{
        const next=encounter(a,path,peer),old=oldEncounters[i];
        return next.gap<Math.min(0,old.gap)-EPS||next.closing>old.closing+EPS;
      }))continue;
    const remaining=cost(path[path.length-1].pos);
    if(remaining<bestCost-EPS){best=command;bestCost=remaining;}
  }
  if(best!==ordinary)routing.add(a);
  return best;
}
