/** One diagnostic action, not a controller patch: retain RT's acquired arc
 * direction for one ordinary read when native routing reverses at A030 1.60.
 * No new sensing, changed release, frozen actor, solver change or spacing bypass. */
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {RunBlocker} from '../../src/sim/behaviors/blocking.ts';
import {track} from '../../src/sim/behaviors/common.ts';
const out=process.argv[2]??'out/second-level-departure-route/turn-probe';
const native=RunBlocker.prototype.leaveCombination;
let last=null,action=null;
RunBlocker.prototype.leaveCombination=function(a,sim){
 if(a.idx!==2)return native.call(this,a,sim);
 const calls=[],see=sim.see;
 sim.see=function(observer,target,...args){const value=see.call(this,observer,target,...args);
  calls.push({a:observer.idx,b:target.idx,picture:structuredClone(value)});return value;};
 let request;try{request=native.call(this,a,sim);}finally{sim.see=see;}
 if(!calls.length||!this.departureRead?.exit)return request;
 const departure=this.plan.departure;
 assert(departure);const down=calls.find(c=>c.b===departure.defender.idx)?.picture;
 const keeper=calls.find(c=>c.b===departure.keeper.idx)?.picture;
 assert(down&&keeper);
 const read=this.departureRead;
 if(JSON.stringify(read.flow)!==JSON.stringify(down.vel))return request;
 const rel={x:a.pos.x-down.pos.x,y:a.pos.y-down.pos.y};
 const goal={x:read.exit.x-down.pos.x,y:read.exit.y-down.pos.y};
 const direction=Math.sign(rel.x*goal.y-rel.y*goal.x);
 if(Math.abs(sim.t-1.6)<1e-9){
  assert.equal(last?.direction,1);assert.equal(direction,-1);assert.equal(last?.t,1.35);
  const angle=last.direction*.35,distance=Math.hypot(rel.x,rel.y);
  const radius=Math.max(a.profile.radius+departure.defender.profile.radius+.15,distance);
  const exit={x:down.pos.x+(rel.x*Math.cos(angle)-rel.y*Math.sin(angle))*radius/distance,
   y:down.pos.y+(rel.x*Math.sin(angle)+rel.y*Math.cos(angle))*radius/distance};
  const checks=[];
  for(const [peer,seen]of [[departure.defender,down],[departure.keeper,keeper]])for(const dt of [0,a.mind.decisionInterval]){
   const point={x:seen.pos.x+seen.vel.x*dt,y:seen.pos.y+seen.vel.y*dt};
   const end={x:exit.x+down.vel.x*dt,y:exit.y+down.vel.y*dt};
   const lane={x:end.x-a.pos.x,y:end.y-a.pos.y},relative={x:point.x-a.pos.x,y:point.y-a.pos.y};
   const length2=lane.x*lane.x+lane.y*lane.y;
   const along=Math.max(0,Math.min(1,(relative.x*lane.x+relative.y*lane.y)/Math.max(1e-12,length2)));
   const nearest=Math.hypot(relative.x-along*lane.x,relative.y-along*lane.y);
   const initial=Math.hypot(relative.x,relative.y),bound=Math.min(a.profile.radius+peer.profile.radius,initial);
   const opens=initial>=a.profile.radius+peer.profile.radius||Math.hypot(end.x-point.x,end.y-point.y)>initial;
   checks.push({peer:peer.idx,dt,margin:nearest-bound,opens});assert(nearest>=bound-1e-9&&opens);
  }
  action={t:sim.t,prior:last,body:structuredClone(a.body),consumed:calls,
   readBefore:structuredClone(read),nativeRequest:request,alternativeExit:exit,checks};
  read.exit=exit;
  const goal={x:exit.x,y:exit.y+a.mind.placementError*(1-.5*a.r('runBlock'))};
  request=track(a,goal,read.flow,{speed:1,gain:3,facing:Math.atan2(read.backer.pos.y-a.pos.y,read.backer.pos.x-a.pos.x)});
  action.alternativeRequest=request;
 }
 last={t:sim.t,direction,exit:structuredClone(read.exit),down,ownPosition:{...a.pos}};
 return request;
};
process.argv=[process.argv[0],process.argv[1],'run',out,'A030'];
await import('./second-level-access.mjs');
assert(action,'The predeclared one-read action must execute');
mkdirSync(out,{recursive:true});writeFileSync(out+'/action.json',JSON.stringify(action,null,2)+'\n');
console.log(JSON.stringify({diagnostic:'retain one previously acquired clear arc',t:action.t,native:action.nativeRequest.vel,alternative:action.alternativeRequest.vel,checks:action.checks}));
