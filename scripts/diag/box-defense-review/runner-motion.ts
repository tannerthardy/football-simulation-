/** Native runner reads and requested/executed movement. No extra observations. */
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Agent} from '../../../src/sim/agent.js';
import type {Intent} from '../../../src/physics/world.js';
import {runReadObservers} from '../../../src/sim/run-read-observer.js';
import {sourceVersion} from '../../source-version.js';
import {makeSim,rosters} from './inputs.js';
const output=process.argv[2];if(!output)throw Error('Explicit output required');
const arg=(key:string)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3);
const until=Number(arg('until')??2.25),direction=arg('direction')??'weak',look=arg('look')??'over3',concept=arg('concept')??'wz';
if(!['strong','weak'].includes(direction)||!Number.isFinite(until)||until<=0)throw Error('Invalid explicit input');
const input={concept,dir:direction as 'strong'|'weak',look,roster:'pair11',seed:77,formation:'ace_12'};
const sim=makeSim(input,rosters()),rb=sim.slot('RB')!,frames:any[]=[],reads:any[]=[],initial=structuredClone(sim.agents.map(a=>({slot:a.slot,body:a.body,profile:a.profile})));
const capture=arg('traffic')?.split('@'),traffic:any[]=[];
const trafficActor=capture?sim.slot(capture[0] as never):null,trafficAt=Number(capture?.[1]);
const trafficPictures=new Map<number,any>();let observingTraffic=false,lastPeer=-1;
const encode=(v:any):any=>v instanceof Agent?{agent:v.idx}:Array.isArray(v)?v.map(encode)
 :v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,v])=>[k,encode(v)])):v;
let pictures=new Map<number,any>();
const see=sim.see.bind(sim);
sim.see=((...args:Parameters<typeof sim.see>)=>{
 const [a,b]=args,seen=see(...args);
 if(a===rb&&new Error().stack?.includes('runReadAim'))pictures.set(b.idx,structuredClone(seen));
 observingTraffic=!!trafficActor&&a===trafficActor&&sim.t===trafficAt&&!!new Error().stack?.includes('spaceTeammates');
 lastPeer=b.idx;
 if(observingTraffic)trafficPictures.set(b.idx,{slot:b.slot,idx:b.idx,team:b.team,profile:b.profile,picture:structuredClone(seen),called:null});
 return seen;
})as typeof sim.see;
if(trafficActor){
 for(const peer of sim.offense){
  const called=peer.behavior.calledMotion?.bind(peer.behavior);if(!called)continue;
  peer.behavior.calledMotion=()=>{
   const value=called();
   if(observingTraffic&&lastPeer===peer.idx&&trafficPictures.has(peer.idx))trafficPictures.get(peer.idx).called=value?{...value}:null;
   return value;
  };
 }
 sim.intents=new Proxy(sim.intents,{set(target,key,value){
  if(key===String(trafficActor.idx)&&sim.t===trafficAt&&new Error().stack?.includes('spaceTeammates')){
   const peers=[...trafficPictures.values()].map(p=>{
    const picture=structuredClone(p.picture),called=p.called;
    if(called){const age=picture.age??0;picture.pos.x+=(called.x-picture.vel.x)*age;picture.pos.y+=(called.y-picture.vel.y)*age;picture.vel={...called};}
    return{...p,picture};
   });
   traffic.push(structuredClone({t:sim.t,actor:{idx:trafficActor.idx,slot:trafficActor.slot,team:trafficActor.team,player:trafficActor.player,profile:trafficActor.profile,body:trafficActor.body,engaged:!!trafficActor.engagement},raw:target[trafficActor.idx],chosen:value,peers}));
  }
  return Reflect.set(target,key,value);
 }});
}
runReadObservers.set(sim,e=>{
 if(e.phase!=='aim')return;
 reads.push(structuredClone({...e,body:rb.body,opts:encode((rb.behavior as any).opts),pictures:[...pictures].map(([target,picture])=>({target,picture}))}));
});
const start=performance.now();let error:string|null=null;
while(sim.phase==='live'&&sim.t<until-1e-6){
 if(performance.now()-start>15000){error='wall-budget';break;}
 pictures=new Map();
 try{sim.tick();}catch(e){error=String(e);break;}
 frames.push({t:sim.t,bodies:sim.agents.map(a=>({slot:a.slot,pos:{...a.pos},vel:{...a.vel},facing:a.facing,
  // Diagnostic access records an already emitted command; no controller
  // receives this private collection or another player's future action.
  raw:structuredClone((sim as unknown as {cmds:Intent[]}).cmds[a.idx]),request:structuredClone(sim.intents[a.idx])})),
  loads:sim.engagements.flatMap(e=>[[e.blocker,e.hands]as const,...(e.helperHands?.entries()??[])].map(([a,h])=>({blocker:a.slot,defender:e.defender.slot,force:Math.hypot(h?.normalForce??0,h?.tangentForce??0)}))),
  impacts:sim.lastStep!.contacts.filter(c=>c.impulse>0&&sim.agents[c.i].team==='O'&&sim.agents[c.j].team==='O').map(c=>({a:sim.agents[c.i].slot,b:sim.agents[c.j].slot,impulse:c.impulse}))});
}
 let cachedExact:boolean|null=null;
if(arg('cached')){
 const d=JSON.parse(gunzipSync(readFileSync(arg('cached')!)).toString()),r=d.rows.find((r:any)=>r.id===`${concept}-${direction}-${look}`);
 cachedExact=!!r&&frames.every((f,i)=>JSON.stringify(f.bodies.map(({slot,pos,vel,facing}:any)=>({slot,pos,vel,facing})))===JSON.stringify(r.frames[i]?.bodies.map(({slot,pos,vel,facing}:any)=>({slot,pos,vel,facing}))));
 if(!cachedExact){
  error='Passive collector changed cached body histories';
  const i=frames.findIndex((f,i)=>JSON.stringify(f.bodies.map(({slot,pos,vel,facing}:any)=>({slot,pos,vel,facing})))!==JSON.stringify(r?.frames[i]?.bodies.map(({slot,pos,vel,facing}:any)=>({slot,pos,vel,facing}))));
  console.error(JSON.stringify({firstDifference:i,observed:frames[i]?.bodies[0],cached:r?.frames[i]?.bodies[0]}));
 }
}
const result=sim.buildResult(),terminal=sim.phase!=='live',row={input,initial,initialSha256:createHash('sha256').update(JSON.stringify(initial)).digest('hex'),
 actors:sim.agents.map(a=>({idx:a.idx,slot:a.slot,team:a.team,player:a.player,profile:a.profile})),cachedExact,terminal,t:sim.t,gain:terminal?result.offenseYards:null,ending:terminal?result.outcome:'explicit-prefix-censor',error,frames,reads,traffic,events:sim.events};
const data={source:sourceVersion(),elapsedSeconds:(performance.now()-start)/1000,settings:'44 accepted flags; RUN_CONTACT_COMPONENTS=1; CF_FLOW unset',rows:[row]};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,gzipSync(JSON.stringify(data)));
console.log(JSON.stringify({source:data.source,input,elapsedSeconds:data.elapsedSeconds,cachedExact,terminal,t:sim.t,gain:row.gain,error,reads:reads.map(({t,preferred,selected,candidates})=>({t,preferred,selected,top:[...candidates].sort((a,b)=>a.score-b.score).slice(0,2)}))}));
if(error)process.exitCode=1;
