/** Only the unresolved anchor/shade distinction and active fresh comparisons. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {trial} from './catch-transition-study.js';
import {sourceVersion} from '../source-version.js';
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const [mode,destination]=process.argv.slice(2);if(!destination)throw Error('ablation|fresh-window OUTDIR');
const input=mode==='ablation'?'data/reviews/current/catch-transition-inputs.json':'out/catch-hip-anchor/fresh/native-inputs.json',
 packet=JSON.parse(readFileSync(input,'utf8')),profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
 provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),collectorSha256:hash(import.meta.filename),
 runnerSha256:hash('scripts/diag/catch-transition-study.ts'),hipModelSha256:hash('scripts/diag/catch-hip-anchor-model.ts'),
 windowModelSha256:hash('scripts/diag/catch-arrival-model.ts'),inputSha256:hash(input),
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 node:process.version,platform:process.platform,arch:process.arch,lockSha256:hash('package-lock.json'),startedAt:new Date().toISOString()},plans:any[]=[];
if(mode==='ablation')for(const id of ['R3101-S1001-P58','R6103-S3001-P4']){
 const f=packet.clips.find((f:any)=>f.id===id);
 for(const w of f.executionWitnesses)plans.push({f,geometry:'hip-unshaded',execution:w.execution,drawSource:w.geometry});
}else if(mode==='fresh-window'){
 const fresh=JSON.parse(readFileSync('out/catch-hip-anchor/fresh/summary.json','utf8'));
 for(const c of fresh.cases)if(c.candidate.changedCalls>0)plans.push({f:packet.clips.find((f:any)=>f.id===c.id),geometry:'arrival',execution:null,drawSource:'natural'});
}else throw Error('ablation|fresh-window OUTDIR');
mkdirSync(destination,{recursive:true});const start=performance.now(),cases:any[]=[];let failure:string|null=null;
for(const p of plans){
 if(performance.now()-start>30000){failure='Declared 30-second batch exhausted';break;}
 const t=performance.now(),label=`${p.f.id}-${p.geometry}-${p.drawSource}`,
  observed=trial(p.f,p.geometry,p.execution,true,destination,label),plain=trial(p.f,p.geometry,p.execution,false,destination,label);
 if(observed.signature!==plain.signature)throw Error('Observer alters followup state/RNG');
 cases.push({...observed,drawSource:p.drawSource,observerVerified:true,wallMs:performance.now()-t});
 console.log(JSON.stringify({label,outcome:observed.result.outcome,possession:observed.result.possession,yac:observed.result.stats.yac,
  changed:observed.changedCalls,execution:observed.acquisition?.appliedExecution,
  firstLoad:observed.holds.find(h=>h.defender===p.f.defender)?.firstLoaded,slip:observed.holds.find(h=>h.defender===p.f.defender)?.brokenAt}));
}
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'hip-anchor-followup-v1',mode,provenance,
 plans:plans.map(p=>({id:p.f.id,geometry:p.geometry,execution:p.execution,drawSource:p.drawSource})),cases,failure,
 unrun:plans.slice(cases.length).map(p=>p.f.id),wallMs:performance.now()-start,
 interpretation:'Ablation removes only field/run-fit leverage offset from observed hip anchor; both prior actual execution values retained. Fresh-window replays only four previously active fresh cases to distinguish existing window arrival from hip anchor. No gate, capability, helper or World law changed. Natural endings and adverse changes retained.'})+'\n');
if(sourceVersion()!==provenance.sourceSha256||hash(input)!==provenance.inputSha256)throw Error('Source/input changed');
if(failure)throw Error(failure);
