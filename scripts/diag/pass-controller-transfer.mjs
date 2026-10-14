/** Actual-source panel; compare prior prototype and verify observer neutrality. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {PlaySim} from '../../src/sim/playsim.ts';
import {ZoneCoverage} from '../../src/sim/behaviors/defense.ts';
import {ScoutingReport} from '../../src/sim/recognition.ts';
import {CoverageScouting} from '../../src/sim/qbmind.ts';
import {sourceVersion} from '../source-version.ts';
const copy=x=>structuredClone(x),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),
 fileHash=p=>createHash('sha256').update(readFileSync(p)).digest('hex'),input='data/reviews/current/coverage-cue-inputs.json',
 packet=JSON.parse(readFileSync(input,'utf8')),destination=process.argv[2];
if(!destination)throw Error('OUTDIR required');mkdirSync(destination,{recursive:true});
const profile=JSON.parse(readFileSync('config/baseline.json','utf8')),provenance={
 commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),collectorSha256:fileHash(import.meta.filename),
 inputSha256:fileHash(input),flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 node:process.version,platform:process.platform,arch:process.arch,lockSha256:fileHash('package-lock.json'),startedAt:new Date().toISOString()};
function restore(f,record){const s=copy(f.setup),scouting=s.scouting?new ScoutingReport(s.scouting.strength):undefined;
 if(scouting)Reflect.set(scouting,'cells',new Map(s.scouting.cells));
 const coverageScouting=s.coverageScouting?Object.assign(new CoverageScouting(),copy(s.coverageScouting)):undefined;
 return new PlaySim({...s,scouting,coverageScouting,energy:s.energy?new Map(s.energy):undefined,record,recordEvery:1,recordLevel:'full'});}
function trial(f,observe){
 const sim=restore(f,observe),rows=[],holds=[],ids=new WeakMap(),see=sim.see.bind(sim),tick=sim.tick.bind(sim),step=sim.world.step.bind(sim.world),update=ZoneCoverage.prototype.update;
 let actor=null,cues=[],decisions=[],world=null;
 if(observe){
  sim.see=(a,r,scale)=>{const p=see(a,r,scale);if(actor===a)cues.push({target:r.idx,scale,picture:copy(p)});return p;};
  ZoneCoverage.prototype.update=function(a,s){actor=a;const q=cues.length;let command;
   try{command=update.call(this,a,s);}finally{actor=null;}
   decisions.push({actor:a.idx,zone:this.zone,style:this.style,target:this.target?.idx??null,command:copy(command),cues:cues.slice(q)});return command;};
  sim.world.step=(intents,dt)=>{const before=sim.agents.map(a=>copy(a.body)),applied=copy(intents),report=step(intents,dt),grasps=[];
   for(const j of sim.world.joints.filter(j=>j.kind==='grasp')){
    let id=ids.get(j);const di=sim.world.indexOf(j.a),ci=sim.world.indexOf(j.b);
    if(id===undefined){id=holds.length;ids.set(j,id);holds.push({id,defender:di,carrier:ci,origin:j.origin,firstSeen:sim.t,firstLoaded:null,brokenAt:null,
      execution:sim.bond?.execution?.get(sim.agents[di])??null,acquisitionQuality:sim.bond?.grip?.get(sim.agents[di])??null});}
    const h=holds[id];if((j.force??0)>1e-8&&h.firstLoaded===null){h.firstLoaded=sim.t+dt;h.entry={defender:before[di],runner:before[ci]};}
    if(j.broken&&h.brokenAt===null)h.brokenAt=sim.t+dt;
    grasps.push({id,a:di,b:ci,origin:j.origin,force:j.force,capacity:j.capacity,legs:copy(j.legs),broken:j.broken});
   }
   world={before,applied,after:sim.agents.map(a=>copy(a.body)),grasps,report:copy(report)};return report;};
  sim.tick=()=>{const t=sim.t;cues=[];decisions=[];world=null;tick();rows.push({t,decisions,ball:sim.ball.kind,carrier:sim.carrier?.idx??null,world});};
 }
 let result;try{result=sim.run();}finally{ZoneCoverage.prototype.update=update;}
 const signature=hash({result:{...result,frames:undefined,telemetry:undefined},bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:sim.rng,perception:sim.perception}),
  path=join(destination,`${f.id}.json.gz`),record={id:f.id,setupSha256:hash(f.setup),signature,result:{...result,frames:undefined,telemetry:undefined},
   censored:result.outcome==='timeout',players:sim.agents.map(a=>({idx:a.idx,id:a.player.id,slot:a.slot,team:a.team,profile:a.profile})),holds,rows,
   frames:result.frames,telemetry:result.telemetry};
 if(observe)writeFileSync(path,gzipSync(JSON.stringify(record)));
 return {...record,rows:undefined,frames:undefined,telemetry:undefined,artifact:observe?{path,sha256:fileHash(path)}:null};
}
const requested=process.argv.slice(3);
if(requested.length!==2 || new Set(requested).size!==2)throw Error('Exactly two distinct existing input IDs required');
const selected=requested.map(id=>{const f=packet.fixtures.find(f=>f.id===id);if(!f)throw Error('Unknown input '+id);return f;});
if(process.version!=='v22.23.3'||Object.keys(provenance.flags).length!==44||JSON.stringify(provenance.flags)!==JSON.stringify(profile.flags)||provenance.flags.RUN_CONTACT_COMPONENTS!=='1')throw Error('Accepted Node/44-flag profile required');
const start=performance.now(),cases=[];let failure=null;
for(const f of selected){if(performance.now()-start>30000){failure='Declared 30-second production batch exhausted';break;}
 const t=performance.now(),recorded=trial(f,true),plain=trial(f,false);
 if(recorded.signature!==plain.signature||recorded.setupSha256!==f.setupSha256)throw Error('Observer/input changes production');
 const referenceMatched=recorded.signature===f.reference.signature;
 cases.push({...recorded,observerVerified:true,referenceMatched,priorReference:f.reference,baseline:f.baseline,wallMs:performance.now()-t});
 console.log(JSON.stringify({id:f.id,referenceMatched,outcome:recorded.result.outcome,yards:recorded.result.offenseYards,yac:recorded.result.stats.yac,
  receiver:recorded.result.stats.receiver,interceptor:recorded.result.stats.interceptedBy}));
 if(performance.now()-start>30000){failure='Declared 30-second production batch exceeded at completed-pair boundary';break;}
}
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'pass-controller-transfer-v1',selectedInputs:requested,originalCollector:{commit:'b0b197ff3b68b5bb9e65811728868ff5cf76cf15',path:'scripts/diag/coverage-cue-production.mjs'},historicalComparison:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',provenance,cases,failure,unrun:selected.slice(cases.length).map(f=>f.id),wallMs:performance.now()-start,
 scope:'Actual production source, no request/private-read/spot overrides. Every observed/plain final body/result/intent/RNG/perception fingerprint exact. Prior references describe historical 43-flag source; they are context, not current identity requirements. Selected control pair tests the extracted policy on accepted-source settings. No prototype/controller overrides. Baselines reused, all natural/censored statuses explicit.'})+'\n');
if(sourceVersion()!==provenance.sourceSha256)throw Error('Runtime changed');if(failure)throw Error(failure);
