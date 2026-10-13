/** Bounded native-prefix shadow audit; all completed outcomes are cached. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {PlaySim,type PlaySetup} from '../../src/sim/playsim.js';
import type {Agent} from '../../src/sim/agent.js';
import {ScoutingReport} from '../../src/sim/recognition.js';
import {CoverageScouting} from '../../src/sim/qbmind.js';
import {arrivalChoice,type Consumed} from './catch-arrival-model.js';
import {nearHipShadow} from './catch-nearhip-shadow-model.js';
import {sourceVersion} from '../source-version.js';

const copy=<T>(x:T):T=>structuredClone(x),hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),
 fileHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const destination=process.argv[2];if(!destination)throw Error('OUTDIR required');
const packetPath='data/reviews/current/catch-transition-inputs.json',evidencePath='data/reviews/current/catch-transition-diagnosis.json',
 packet=JSON.parse(readFileSync(packetPath,'utf8')),evidence=JSON.parse(readFileSync(evidencePath,'utf8')),
 profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
 flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
const declaration=[
 {id:'R6103-S3001-P4',role:'question: compromised crossing approach',times:[2.8,2.85,2.95,3.05,3.3,3.45]},
 {id:'R3101-S1001-P58',role:'repeated explosive approach / existing repair',times:[2.4,2.55,2.6,2.7,2.9]},
 {id:'R4202-S2001-P95',role:'opposing ordinary success / attainable ball contest',times:[3.65,4.4,4.45,4.5]},
 {id:'R7204-S4001-P16',role:'opposing interception / unseen future tip',times:[3.3,3.8,4.25,4.4]},
];
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),
 collectorSha256:fileHash(import.meta.filename),modelSha256:fileHash('scripts/diag/catch-nearhip-shadow-model.ts'),
 existingArrivalModelSha256:fileHash('scripts/diag/catch-arrival-model.ts'),inputSha256:fileHash(packetPath),
 cachedEvidenceSha256:fileHash(evidencePath),flags,worldDefaults:profile.worldDefaults,node:process.version,
 platform:process.platform,architecture:process.arch,lockSha256:fileHash('package-lock.json'),
 policy:{pr:6,commit:'f9617dde9456c0ead2d66b46d4b42608adcd3585',path:'docs/TESTING_COSTS.md'},
 startedAt:new Date().toISOString()};
// Fail before simulating if the exact baseline or cached material is incompatible.
if(provenance.sourceSha256!==packet.runtimeSha256||provenance.inputSha256!==evidence.input.sha256
 ||hash(flags)!==hash(evidence.panel.provenance.flags)||hash(profile.worldDefaults)!==hash(evidence.panel.provenance.worldDefaults)
 ||provenance.existingArrivalModelSha256!==evidence.panel.provenance.modelSha256)throw Error('Incompatible baseline/flags/input/model evidence');
const tapes=declaration.flatMap(d=>(['baseline','arrival'] as const).map(geometry=>{
 const cached=evidence.panel.cases.find((c:any)=>c.id===d.id).outcomes.find((c:any)=>c.geometry===geometry),
  path=cached.sourceTrace.path;
 if(fileHash(path)!==cached.sourceTrace.sha256)throw Error('Corrupt cached trace');
 const tape=JSON.parse(gunzipSync(readFileSync(path)).toString()),f=packet.clips.find((f:any)=>f.id===d.id);
 if(tape.signature!==f.executionWitnesses.find((w:any)=>w.geometry===geometry).signature||cached.censored)throw Error('Unfinished or incompatible native witness');
 return {declaration:d,geometry,cached,path,tape,f};
}));
function restore(f:any){const s=copy(f.setup),scouting=s.scouting?new ScoutingReport(s.scouting.strength):undefined;
 if(scouting)Reflect.set(scouting,'cells',new Map(s.scouting.cells));
 const coverageScouting=s.coverageScouting?Object.assign(new CoverageScouting(),copy(s.coverageScouting)):undefined;
 return new PlaySim({...s,energy:s.energy?new Map(s.energy):undefined,scouting,coverageScouting,record:false} as PlaySetup);}
function lean(a:Agent){return {idx:a.idx,pos:copy(a.pos),vel:copy(a.vel),facing:a.facing,energy:a.body.energy,
 support:copy(a.body.support),downUntil:a.downUntil};}
const started=performance.now(),cases:any[]=[];let failure:string|null=null;
mkdirSync(destination,{recursive:true});
for(const item of tapes){
 const caseStart=performance.now(),sim=restore(item.f),a=sim.agents[item.f.defender],last=item.declaration.times.at(-1)!,
  wrapped=new WeakSet<object>(),seen=sim.see.bind(sim),step=sim.world.step.bind(sim.world),rows:any[]=[];
 let inside=false,cues:Consumed[]=[],raw:any=null,decision:any=null,shadow:any=null,target:number|null=null,world:any=null,verified=0;
 sim.see=(d,c,delay)=>{const picture=seen(d,c,delay);if(inside&&d===a)cues.push({target:c.idx,delay,seen:copy(picture)});return picture;};
 sim.world.step=(intents,dt)=>{const before=sim.agents.map(lean),applied=copy(intents),report=step(intents,dt);
  world={before,applied,after:sim.agents.map(lean)};return report;};
 try{
  while(sim.phase==='live'&&sim.t<=last+1e-8){
   if(performance.now()-started>30000||performance.now()-caseStart>5000)throw Error('Declared prefix wall budget exhausted');
   const t=sim.t,selected=item.declaration.times.some(x=>Math.abs(x-t)<1e-8),b=a.behavior;
   cues=[];raw=null;decision=null;world=null;shadow=null;
   if(!wrapped.has(b)){wrapped.add(b);const update=b.update.bind(b);
    b.update=(actor,s)=>{inside=true;let original;try{original=update(actor,s);}finally{inside=false;}
     const choice=arrivalChoice(actor,s,original,cues),command=item.geometry==='arrival'?choice.command:original;
     raw=copy(original);decision=copy(choice);
     if(choice.reason==='moving-window-arrival')target=choice.window!.receiver;
     if(selected){
      // Reuse existing eligibility. Only a previously acquired window target
      // can be tracked across the boundary, and only from consumed pictures.
      // Actual catcher/interceptor IDs are never used to choose this target.
      const cue=sim.ball.kind==='air'&&choice.reason==='moving-window-arrival'&&choice.window
       ?{target:choice.window.receiver,seen:choice.window.seen}:sim.ball.kind!=='air'&&target!==null?cues.find(c=>c.target===target):undefined,
       sup=a.body.support,free=sup?.state==='up'&&!a.engagement&&!sup.foot&&!sup.strike&&!a.isDown(s.t)
        &&Math.hypot(sup.lean.x,sup.lean.y)<1e-6&&Math.hypot(sup.load.x,sup.load.y)<1e-6
        &&!sim.world.joints.some(j=>(j.kind!=='grasp'||!j.broken)&&(j.a===a.body||j.b===a.body))
        &&!sim.lastStep?.contacts.some(c=>c.i===a.idx||c.j===a.idx);
      if(cue&&free){const before=hash({body:a.body,rng:sim.rng,perception:sim.perception}),seenCount=cues.length;
       shadow=nearHipShadow(a,sim.agents[cue.target],cue.seen,command,s.t);
       if(before!==hash({body:a.body,rng:sim.rng,perception:sim.perception})||seenCount!==cues.length)throw Error('Shadow mutated physical/information state');
      }else shadow={skipped:!cue?'existing eligibility / no consumed picture of acquired target':'felt constraint makes free forecast unavailable',
       reason:choice.reason,retainedTarget:target};
     }
     return command;
    };
   }
   sim.tick();
   const cached=item.tape.rows.find((r:any)=>Math.abs(r.t-t)<1e-8);
   if(!cached||hash(raw)!==hash(cached.raw)||hash(cues)!==hash(cached.cues)
    ||(world&&hash(world)!==hash({before:cached.world.before,applied:cached.world.applied,after:cached.world.after})))
    throw Error(`Native prefix/cues/command differ at ${t}`);
   verified++;
   if(selected)rows.push({t,behavior:b.kind,phaseBefore:cached.phaseBefore,carrierAfter:cached.carrier,
    raw,decision,cues:copy(cues),shadow,bodyAtDecision:world?.before[a.idx]??null,prefixVerified:true});
  }
  if(rows.length!==item.declaration.times.length)throw Error('Selected prefix ended before all measurements');
  cases.push({id:item.f.id,geometry:item.geometry,role:item.declaration.role,selectedDefender:{idx:a.idx,id:a.player.id,slot:a.slot},
   ticksReplayed:verified,stopAt:sim.t,censored:true,wallMs:performance.now()-caseStart,
   cachedCompletedOutcome:{outcome:item.cached.outcome,possession:item.cached.possession,yac:item.cached.yac,
    signature:item.cached.signature,sourceTrace:item.cached.sourceTrace},rows});
  console.log(JSON.stringify({id:item.f.id,geometry:item.geometry,ticks:verified,measurements:rows.length,wallMs:Math.round(performance.now()-caseStart)}));
 }catch(e){failure=e instanceof Error?e.message:String(e);cases.push({id:item.f.id,geometry:item.geometry,failed:true,
  reason:failure,ticksReplayed:verified,wallMs:performance.now()-caseStart,rows});break;}
}
const report={schema:'nearhip-shadow-prefix-v1',question:'Does the same observed moving near-hip objective improve forecast contact entry across catch without surrendering closing/leverage or a reachable ball contest?',
 provenance:{...provenance,finishedAt:new Date().toISOString()},declaration,budget:{batchMs:30000,caseMs:5000},
 wallMs:performance.now()-started,cases,failure,unrun:tapes.slice(cases.length).map(i=>({id:i.f.id,geometry:i.geometry})),
 newFullPlays:0,newGames:0,interpretation:'Native prefix reconstruction only, never a changed live request. Every replayed World boundary, consumed picture and native raw command checked against complete compatible cached film. All new prefixes censored; completed outcomes retained solely as cached context. Alternative free forecasts are hypotheses, not achieved candidate motion or contact survival.'};
writeFileSync(join(destination,'summary.json'),JSON.stringify(report)+'\n');
if(sourceVersion()!==provenance.sourceSha256||fileHash(packetPath)!==provenance.inputSha256)throw Error('Inputs changed during collection');
if(failure)throw Error(failure);
