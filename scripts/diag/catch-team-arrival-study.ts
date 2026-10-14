/** Coexistence question: existing moving-window request for every eligible
 * defensive actor. No helper arbitration or additional observation/flag.
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {PlaySim,type PlaySetup} from '../../src/sim/playsim.js';
import {ScoutingReport} from '../../src/sim/recognition.js';
import {CoverageScouting} from '../../src/sim/qbmind.js';
import type {Agent} from '../../src/sim/agent.js';
import {arrivalChoice,type Consumed} from './catch-arrival-model.js';
import {sourceVersion} from '../source-version.js';
const copy=<T>(x:T):T=>structuredClone(x),hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),
 fileHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const destination=process.argv[2];if(!destination)throw Error('OUTDIR required');mkdirSync(destination,{recursive:true});
const originalPath='data/reviews/current/catch-transition-inputs.json',freshPath='out/catch-hip-anchor/fresh/native-inputs.json',
 original=JSON.parse(readFileSync(originalPath,'utf8')),fresh=JSON.parse(readFileSync(freshPath,'utf8')),
 ids=process.argv[3]?.split(',')??['R3101-S1001-P58','R6103-S3001-P4','R7204-S4001-P16','R4202-S2001-P95','R3101-S1001-P19','R3101-S1001-P103',
  'H10831-C1-S51001','H10831-C3-S51003','H10831-C4-S51004','H11842-C4-S52004'],
 fixtures=[...original.clips,...fresh.clips],profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
 provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),collectorSha256:fileHash(import.meta.filename),
 modelSha256:fileHash('scripts/diag/catch-arrival-model.ts'),inputs:[originalPath,freshPath].map(path=>({path,sha256:fileHash(path)})),
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 node:process.version,platform:process.platform,arch:process.arch,lockSha256:fileHash('package-lock.json'),startedAt:new Date().toISOString()};
if(provenance.sourceSha256!==original.runtimeSha256)throw Error('Unexpected baseline source');
function restore(f:any,record:boolean){const s=copy(f.setup),scouting=s.scouting?new ScoutingReport(s.scouting.strength):undefined;
 if(scouting)Reflect.set(scouting,'cells',new Map(s.scouting.cells));
 const coverageScouting=s.coverageScouting?Object.assign(new CoverageScouting(),copy(s.coverageScouting)):undefined;
 return new PlaySim({...s,energy:s.energy?new Map(s.energy):undefined,scouting,coverageScouting,record,recordEvery:1,recordLevel:'full'} as PlaySetup);}
function lean(a:Agent){return {idx:a.idx,pos:copy(a.pos),vel:copy(a.vel),facing:a.facing,energy:a.body.energy,support:copy(a.body.support),downUntil:a.downUntil};}
function pair(c:Agent,d:Agent){const dx=c.pos.x-d.pos.x,dy=c.pos.y-d.pos.y,dist=Math.hypot(dx,dy),vx=c.vel.x-d.vel.x,vy=c.vel.y-d.vel.y;
 return {distance:dist,closing:-(vx*dx+vy*dy)/Math.max(1e-9,dist),transverseSpeed:Math.abs(vx*dy-vy*dx)/Math.max(1e-9,dist),
 rearCos:-(c.vel.x*dx+c.vel.y*dy)/Math.max(1e-9,c.speed*dist),headingDifference:Math.atan2(Math.sin(Math.atan2(d.vel.y,d.vel.x)-Math.atan2(c.vel.y,c.vel.x)),
 Math.cos(Math.atan2(d.vel.y,d.vel.x)-Math.atan2(c.vel.y,c.vel.x))),defender:lean(d),runner:lean(c)};}
function run(f:any,observe:boolean){
 const sim=restore(f,observe),seen=sim.see.bind(sim),step=sim.world.step.bind(sim.world),tick=sim.tick.bind(sim),
  wrapped=new WeakSet<object>(),changes:any[]=[],rows:any[]=[],holds:any[]=[],ids=new WeakMap<object,number>();
 let inside:Agent|null=null,cues:Consumed[]=[],decisions:any[]=[],world:any=null;
 sim.see=(d,c,delay)=>{const picture=seen(d,c,delay);if(inside===d)cues.push({target:c.idx,delay,seen:copy(picture)});return picture;};
 if(observe)sim.world.step=(intents,dt)=>{
  const before=sim.agents.map(lean),applied=copy(intents),entry=new Map(sim.world.joints.filter(j=>j.kind==='grasp')
   .map(j=>[j,pair(sim.agents[sim.world.indexOf(j.b)],sim.agents[sim.world.indexOf(j.a)])])),report=step(intents,dt);
  const grasps=sim.world.joints.filter(j=>j.kind==='grasp').map(j=>{let id=ids.get(j);if(id===undefined){id=holds.length;ids.set(j,id);
   const d=sim.agents[sim.world.indexOf(j.a)],c=sim.agents[sim.world.indexOf(j.b)];holds.push({id,defender:d.idx,carrier:c.idx,origin:j.origin,
    firstSeen:sim.t,firstLoaded:null,brokenAt:null,initialCapacity:j.capacity,legs:j.legs,
    acquisitionQuality:sim.bond?.grip?.get(d)??null,execution:sim.bond?.execution?.get(d)??null});}
   const h=holds[id];if((j.force??0)>1e-8&&h.firstLoaded===null){h.firstLoaded=sim.t+dt;h.entryGeometry=entry.get(j);}
   if(j.broken&&h.brokenAt===null)h.brokenAt=sim.t+dt;
   return {...copy({...j,a:undefined,b:undefined}),a:sim.world.indexOf(j.a),b:sim.world.indexOf(j.b),id};});
  world={before,applied,after:sim.agents.map(lean),grasps,report:copy(report)};return report;
 };
 sim.tick=()=>{
  const t=sim.t;decisions=[];world=null;
  for(const a of sim.defense){const b=a.behavior;if(!wrapped.has(b)){wrapped.add(b);const update=b.update.bind(b);
   b.update=(actor,s)=>{if(actor.team!=='D')return update(actor,s);
    inside=actor;cues=[];let original;try{original=update(actor,s);}finally{inside=null;}
    const consumed=copy(cues),active=s.ball.kind==='air'&&actor.tags.has('onBall'),
     before=active?hash({body:actor.body,rng:sim.rng,perception:sim.perception}):null,
     choice=active?arrivalChoice(actor,s,original,consumed):{command:original,reason:'no-acquired-flight-window',window:null};
    if(active&&before!==hash({body:actor.body,rng:sim.rng,perception:sim.perception}))throw Error('Team arrival mutates physical/information state');
    const changed=hash(original)!==hash(choice.command);
    if(changed){if(choice.reason!=='moving-window-arrival')throw Error('Protected branch changed');changes.push({t:s.t,actor:actor.idx,id:actor.player.id});}
    if(observe)decisions.push({actor:actor.idx,raw:copy(original),choice:copy(choice),cues:consumed,changed});
    return choice.command;
   };
  }}
  tick();if(observe)rows.push({t,ball:sim.ball.kind,carrier:sim.carrier?.idx??null,decisions,world});
 };
 const result=sim.run(),signature=hash({result:{...result,frames:undefined,telemetry:undefined},bodies:sim.agents.map(a=>a.body),
 intents:sim.intents,rng:sim.rng,perception:sim.perception}),file=join(destination,`${f.id}-team-window.json.gz`),
 record={id:f.id,signature,setupSha256:hash(f.setup),result:{...result,frames:undefined,telemetry:undefined},censored:result.outcome==='timeout',
  changes,holds,players:sim.agents.map(a=>({idx:a.idx,id:a.player.id,slot:a.slot,team:a.team,profile:a.profile})),rows,
  frames:result.frames,telemetry:result.telemetry};
 if(observe)writeFileSync(file,gzipSync(JSON.stringify(record)));
 return {...record,rows:undefined,frames:undefined,telemetry:undefined,artifact:observe?{path:file,sha256:fileHash(file)}:null};
}
const start=performance.now(),cases:any[]=[];let failure:string|null=null;
for(const id of ids){if(performance.now()-start>30000){failure='Declared 30-second coexistence batch exhausted';break;}
 const f=fixtures.find((f:any)=>f.id===id),t=performance.now(),observed=run(f,true),plain=run(f,false);
 if(observed.signature!==plain.signature)throw Error(`Observer changes ${id}`);
 if(!observed.changes.length&&observed.signature!==f.nativeSignature)throw Error('Unaffected team case differs from baseline');
 cases.push({...observed,observerVerified:true,wallMs:performance.now()-t,
  reusedBaseline:{signature:f.nativeSignature,result:f.nativeResult}});
 console.log(JSON.stringify({id,outcome:observed.result.outcome,possession:observed.result.possession,yac:observed.result.stats.yac,
  receiver:observed.result.stats.receiver,interceptor:observed.result.stats.interceptedBy,
  actors:[...new Set(observed.changes.map(c=>c.actor))],firstLoad:observed.holds.find(h=>h.firstLoaded!==null)?.firstLoaded}));
 if(performance.now()-start>30000){failure='Declared 30-second coexistence batch exceeded at completed execution-pair boundary';break;}
}
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'team-moving-window-coexistence-v1',provenance,ids,cases,failure,unrun:ids.slice(cases.length),wallMs:performance.now()-start,
 interpretation:'Same existing v2 moving-window choice on every defensive controller consuming the requisite observations. No new gating, receiver awareness, helper coordination, capacities or physics. One shared approach primitive with available pictures only. Ten selected old/fresh coexistence/ball/success/sideline controls, original full baselines reused; not a league sample. All new observed/plain native states verified.'})+'\n');
if(sourceVersion()!==provenance.sourceSha256)throw Error('Runtime changed during team probe');
if(failure)throw Error(failure);
