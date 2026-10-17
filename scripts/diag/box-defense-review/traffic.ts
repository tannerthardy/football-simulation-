/** Observe real production spacing calls without adding perceptions/actions. */
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {makeSim,rosters} from './inputs.js';
import {sourceVersion} from '../../source-version.js';
import {previewFreeMovement} from '../../../src/physics/movement-preview.js';
const output=process.argv[2];if(!output)throw new Error('Explicit output required');
const sim=makeSim({concept:'wz',dir:'weak',look:'over3',roster:'pair11',seed:77,formation:'ace_12'},rosters());
const rb=sim.slot('RB')!,observations:any[]=[];
let pictures=new Map<number,any>(),activeActor=-1,activePeer=-1;
const inWindow=()=>sim.t>=1.65&&sim.t<=1.85;
const originalSee=sim.see.bind(sim);
sim.see=((...args:Parameters<typeof sim.see>)=>{
 const result=originalSee(...args);
 if(inWindow()&&new Error().stack?.includes('spaceTeammates')){
  activeActor=args[0].idx;activePeer=args[1].idx;
  if(activeActor===rb.idx)pictures.set(activePeer,{slot:args[1].slot,seen:structuredClone(result),radius:args[1].profile.radius});
 }
 return result;
}) as typeof sim.see;
for(const peer of sim.agents){
 const behavior=peer.behavior,called=behavior.calledMotion?.bind(behavior);if(!called)continue;
 behavior.calledMotion=()=>{
  const result=called();
  if(inWindow()&&activeActor===rb.idx&&activePeer===peer.idx&&pictures.has(peer.idx))
   pictures.get(peer.idx).called=result?{...result}:null;
  return result;
 };
}
sim.intents=new Proxy(sim.intents,{set(target,key,value){
 if(key===String(rb.idx)&&inWindow()&&new Error().stack?.includes('spaceTeammates'))
  observations.push(structuredClone({t:sim.t,raw:target[rb.idx],chosen:value,body:rb.body,pictures:[...pictures.values()]}));
 return Reflect.set(target,key,value);
}});
const frames:any[]=[];
while(sim.t<2-.00001){pictures=new Map();sim.tick();frames.push(sim.agents.map(a=>({slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.facing})));}
// Diagnostics use detached bodies after the native run. These forecasts are
// the existing unloaded operator, not a counterfactual play or new planner.
for(const o of observations){
 const clearance=(command:any,p:any)=>{
  const body=structuredClone(o.body),samples=previewFreeMovement(body,command,o.t,12),seen=p.seen,age=seen.age??0;
  const v=p.called??seen.vel;
  const pos={x:seen.pos.x+(v.x-seen.vel.x)*age,y:seen.pos.y+(v.y-seen.vel.y)*age};
  let px=body.pos.x-pos.x,py=body.pos.y-pos.y,minimum=Math.hypot(px,py)-.9*(body.profile.radius+p.radius);
  for(const s of samples){const rx=s.pos.x-pos.x-v.x*s.t,ry=s.pos.y-pos.y-v.y*s.t,ex=rx-px,ey=ry-py;
   const q=Math.max(0,Math.min(1,-(px*ex+py*ey)/Math.max(1e-12,ex*ex+ey*ey)));
   minimum=Math.min(minimum,Math.hypot(px+q*ex,py+q*ey)-.9*(body.profile.radius+p.radius));px=rx;py=ry;}
  return minimum;
 };
 o.clearances=o.pictures.map((p:any)=>({slot:p.slot,raw:clearance(o.raw,p),chosen:clearance(o.chosen,p)}));
}
const cached=JSON.parse(gunzipSync(readFileSync('out/zone-anchor/combined-native.json.gz')).toString()).rows.find((r:any)=>r.id==='wz-weak-over3');
const identical=frames.every((f,i)=>JSON.stringify(f)===JSON.stringify(cached.frames[i].bodies.map(({slot,pos,vel,facing}:any)=>({slot,pos,vel,facing}))));
if(!identical)throw new Error('Diagnostic wrapper changed native physical history');
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify({source:sourceVersion(),identicalNativePrefix:identical,observations},null,2));
console.log(JSON.stringify(observations.map(({t,raw,chosen,clearances})=>({t,raw:raw.vel,chosen:chosen.vel,clearances}))));
