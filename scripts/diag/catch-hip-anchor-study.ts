/** Full native causal comparison; no gate, capability or physics-law changes.
 * control OUTDIR | local OUTDIR | ordinary OUTDIR
 */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {trial} from './catch-transition-study.js';
import {sourceVersion} from '../source-version.js';
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const [mode,destination]=process.argv.slice(2);if(!destination)throw Error('control|local|ordinary OUTDIR');
const packetPath='data/reviews/current/catch-transition-inputs.json',packet=JSON.parse(readFileSync(packetPath,'utf8')),
 cachedPath='data/reviews/current/catch-transition-diagnosis.json',cached=JSON.parse(readFileSync(cachedPath,'utf8')),
 profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
 flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));
const provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),
 collectorSha256:hash(import.meta.filename),runnerSha256:hash('scripts/diag/catch-transition-study.ts'),
 windowModelSha256:hash('scripts/diag/catch-arrival-model.ts'),hipModelSha256:hash('scripts/diag/catch-hip-anchor-model.ts'),
 inputSha256:hash(packetPath),cacheSha256:hash(cachedPath),node:process.version,platform:process.platform,arch:process.arch,
 lockSha256:hash('package-lock.json'),flags,worldDefaults:profile.worldDefaults,startedAt:new Date().toISOString()};
if(provenance.sourceSha256!==packet.runtimeSha256||provenance.inputSha256!==cached.input.sha256
 ||JSON.stringify(flags)!==JSON.stringify(cached.panel.provenance.flags)
 ||provenance.windowModelSha256!==cached.panel.provenance.modelSha256)throw Error('Incompatible cached baseline');
const plans:any[]=[];
if(mode==='control')plans.push({id:'R7204-S4001-P16',geometry:'hip',execution:null,drawSource:'natural'});
else if(mode==='local')for(const id of ['R3101-S1001-P58','R6103-S3001-P4']){
 const f=packet.clips.find((f:any)=>f.id===id);
 if(id.endsWith('P58'))for(const geometry of ['baseline','arrival']){
  const opposite=f.executionWitnesses.find((w:any)=>w.geometry!==geometry);
  plans.push({id,geometry,execution:opposite.execution,drawSource:opposite.geometry});
 }
 plans.push({id,geometry:'hip',execution:null,drawSource:'natural'});
 for(const w of f.executionWitnesses)plans.push({id,geometry:'hip',execution:w.execution,drawSource:w.geometry});
}else if(mode==='ordinary')for(const id of ['R3101-S1001-P19','R3101-S1001-P103','R4202-S2001-P95'])
 plans.push({id,geometry:'hip',execution:null,drawSource:'natural'});
else throw Error('control|local|ordinary OUTDIR');
mkdirSync(destination,{recursive:true});const cases:any[]=[];const start=performance.now();let failure:string|null=null;
for(const p of plans){
 if(performance.now()-start>30000){failure='Declared 30-second batch budget exhausted';break;}
 const f=packet.clips.find((f:any)=>f.id===p.id),caseStart=performance.now(),label=`${p.id}-${p.geometry}-${p.drawSource}`;
 const observed=trial(f,p.geometry,p.execution,true,destination,label),plain=trial(f,p.geometry,p.execution,false,destination,label);
 if(observed.signature!==plain.signature)throw Error(`Observer changes ${label}`);
 if(p.geometry==='baseline'&&p.execution===null&&observed.signature!==f.nativeSignature)throw Error('Baseline mismatch');
 cases.push({...observed,drawSource:p.drawSource,observerVerified:true,wallMs:performance.now()-caseStart});
 console.log(JSON.stringify({label,outcome:observed.result.outcome,possession:observed.result.possession,
  receiver:observed.actualReceiverId,yac:observed.result.stats.yac,changed:observed.changedCalls,
  execution:observed.acquisition?.appliedExecution,firstLoad:observed.holds.find(h=>h.defender===f.defender)?.firstLoaded,
  slip:observed.holds.find(h=>h.defender===f.defender)?.brokenAt}));
}
if(sourceVersion()!==provenance.sourceSha256||hash(packetPath)!==provenance.inputSha256)throw Error('Source/input changed');
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'hip-anchor-native-v1',mode,
 provenance:{...provenance,finishedAt:new Date().toISOString()},plans,cases,failure,unrun:plans.slice(cases.length),wallMs:performance.now()-start,
 reused:cached.panel.cases.filter((c:any)=>plans.some(p=>p.id===c.id)),
 interpretation:'Existing one-defender moving-window eligibility unchanged. Only anchor becomes consumed receiver hip plus existing own leverage. Pursuit, helper rules, physical capabilities and World laws fixed. Both actual prior execution values and natural new execution retained. Original RNG consumption/leg placement and all native feedback retained within each run. Complete cached controls reused; every new arm has observed/plain final-body/RNG parity. No repeated games/full suite.'})+'\n');
if(failure)throw Error(failure);
