/** Two predeclared continuous route diagnostics, not a production controller.
 * RT alone follows a fixed winding around the moving DL or keeper. Privileged
 * geometry is explicit; World, contact and every other player remain native. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {RunBlocker} from '../../src/sim/behaviors/blocking.ts';
const [routeId,out]=process.argv.slice(2);assert(routeId&&out);
const path='data/reviews/current/second-level-reachability/search-plan.json';
const plan=JSON.parse(readFileSync(path)),route=plan.routes.find(r=>r.id===routeId);assert(route);
const hash=b=>createHash('sha256').update(b).digest('hex');
const native=RunBlocker.prototype.update;
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const copy=a=>({pos:{...a.pos},vel:{...a.vel},facing:a.facing,stance:a.stance,pose:a.pose,age:0,carrying:false});
const advance=(s,dt)=>({...s,pos:{x:s.pos.x+s.vel.x*dt,y:s.pos.y+s.vel.y*dt}});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let state=null;const steps=[];
function corridor(a,obstacles,backer,strike,horizon){
 const ray=sub(backer.pos,a.pos),distance=Math.hypot(ray.x,ray.y),fraction=Math.max(0,distance-strike)/Math.max(distance,1e-12);
 const goal={x:a.pos.x+ray.x*fraction,y:a.pos.y+ray.y*fraction};
 const checks=[];
 for(const {seen,radius} of obstacles)for(const dt of [0,horizon]){
  const point=advance(seen,dt).pos,end={x:goal.x+backer.vel.x*dt,y:goal.y+backer.vel.y*dt};
  const lane=sub(end,a.pos),relative=sub(point,a.pos),length2=lane.x*lane.x+lane.y*lane.y;
  const u=clamp((relative.x*lane.x+relative.y*lane.y)/Math.max(1e-12,length2),0,1);
  const nearest=Math.hypot(relative.x-u*lane.x,relative.y-u*lane.y),initial=Math.hypot(relative.x,relative.y);
  checks.push({margin:nearest-Math.min(radius,initial),opens:initial>=radius||Math.hypot(end.x-point.x,end.y-point.y)>initial});
 }
 return {clear:checks.every(c=>c.margin>=-1e-9&&c.opens),goal,checks};
}
RunBlocker.prototype.update=function(a,sim){
 if(a.idx!==2||sim.t<plan.release-1e-9)return native.call(this,a,sim);
 const defender=sim.slot('DT_S'),keeper=sim.slot('RG'),backer=sim.slot('LB_M');
 if(!state){
  assert.equal(sim.t,plan.release);assert.equal(this.plan.kind,'climb');assert.equal(this.plan.target,backer);
  assert.equal(sim.events.find(e=>e.type==='block_climb'&&e.a===a.idx)?.t,plan.release);
  state={phase:'orbit',nextRead:sim.t,at:sim.t,joinedAt:null,releaseBodies:sim.agents.map(a=>structuredClone(a.body)),releaseRng:JSON.stringify(sim.rng)};
 }
 // Once acquired, actual engagement and its native support/force law own the block.
 if(a.engagement){state.joinedAt??=sim.t;return native.call(this,a,sim);}
 if(this.plan.target!==backer||a.isDown(sim.t))return native.call(this,a,sim);
 let refresh=false;
 if(sim.t>=state.nextRead){
  refresh=true;state.at=sim.t;state.nextRead=sim.t+a.mind.decisionInterval;
  state.down=copy(defender);state.keeper=copy(keeper);state.backer=copy(backer);
  const obstacles=[{seen:state.down,radius:a.profile.radius+defender.profile.radius},
   {seen:state.keeper,radius:a.profile.radius+keeper.profile.radius}];
  const strike=a.profile.radius+backer.profile.radius+.1+a.player.measurables.armIn/36*.45;
  state.corridor=corridor(a,obstacles,state.backer,strike,a.mind.decisionInterval);
  if(state.phase==='orbit'&&state.corridor.clear){
   state.phase='approach';state.approachAt=sim.t;
   // Explicit diagnostic handoff to the existing interceptor. This is not a
   // claim that RT could have acquired the privileged clearance observation.
   delete this.plan.departure;this.departureRead=null;this.climbRead=null;
  }
 }
 const dt=sim.t-state.at;
 let normal;
 if(state.phase==='approach'){
  const see=sim.see;
  sim.see=function(observer,target,...args){
   if(observer===a&&target===backer)return advance(state.backer,dt);
   return see.call(this,observer,target,...args);
  };
  try{normal=native.call(this,a,sim);}finally{sim.see=see;}
 }else normal=native.call(this,a,sim);
 if(a.engagement){state.joinedAt??=sim.t;return normal;}
 let command=normal,steering=null;
 if(state.phase==='orbit'){
  const anchor=route.anchor==='DT_S'?state.down:state.keeper;
  const center=advance(anchor,dt),peer=route.anchor==='DT_S'?defender:keeper;
  const relative=sub(a.pos,center.pos),distance=Math.hypot(relative.x,relative.y)||1e-9;
  const ux=relative.x/distance,uy=relative.y/distance;
  const radius=a.profile.radius+peer.profile.radius+.15;
  // Existing .8 lateral envelope. This limits the request; it never changes
  // acceleration, facing rate, support, ground budget or the body's velocity.
  const speed=Math.min(a.profile.vmax,Math.sqrt(a.profile.lateral*.8*radius));
  const radial=clamp((radius-distance)*3,-speed,speed);
  let vx=center.vel.x-route.winding*uy*speed+ux*radial;
  let vy=center.vel.y+route.winding*ux*speed+uy*radial;
  const cap=Math.min(1,a.profile.vmax/Math.max(1e-9,Math.hypot(vx,vy)));vx*=cap;vy*=cap;
  command={vel:{x:vx,y:vy}}; // Native facing turns toward travel at its finite rate.
  steering={center,radius,speed,radial,distance};
 }
 steps.push({t:sim.t,phase:state.phase,refresh,at:state.at,nextRead:state.nextRead,
  oracleGeometry:refresh?{down:state.down,keeper:state.keeper,backer:state.backer}:null,
  corridor:refresh?state.corridor:null,steering,normalRequest:normal,command});
 return command;
};
process.argv=[process.argv[0],process.argv[1],'run',out,'A030'];
await import('./second-level-access.mjs');
assert(state);mkdirSync(out,{recursive:true});
const receipt={schema:'second-level-reachability-intervention-v1',route,planSha256:hash(readFileSync(path)),
 scriptSha256:hash(readFileSync(import.meta.filename)),phase:state.phase,approachAt:state.approachAt??null,
 joinedAt:state.joinedAt,releaseBodies:state.releaseBodies,releaseRng:state.releaseRng,
 qualification:'Privileged current geometry at native decision cadence, fixed winding chosen after seeing old failure; RT-only diagnostic. Native full22 initialization, all other reactions, spacing and contact. No frozen future or body mutation. No production selection claim.',steps};
writeFileSync(out+'/intervention.json.gz',gzipSync(JSON.stringify(receipt)));
const packet=JSON.parse(gunzipSync(readFileSync(out+'/trace.json.gz')));
packet.receipt.qualification=receipt.qualification;
packet.receipt.intervention={route:route.id,planSha256:receipt.planSha256,scriptSha256:receipt.scriptSha256,diagnosticOnly:true};
writeFileSync(out+'/trace.json.gz',gzipSync(JSON.stringify(packet)));
writeFileSync(out+'/receipt.json',JSON.stringify(packet.receipt,null,2)+'\n');
console.log(JSON.stringify({route:route.id,approachAt:receipt.approachAt,joinedAt:receipt.joinedAt,updates:steps.length}));
