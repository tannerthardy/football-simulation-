/** Actual production candidate with the retained P58/P4 first-hold draws. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {trial} from './catch-transition-study.js';
import {sourceVersion} from '../source-version.js';
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex'),destination=process.argv[2];
if(!destination)throw Error('OUTDIR required');mkdirSync(destination,{recursive:true});
const input='data/reviews/current/catch-transition-inputs.json',packet=JSON.parse(readFileSync(input,'utf8')),profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
 provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),collectorSha256:hash(import.meta.filename),
  runnerSha256:hash('scripts/diag/catch-transition-study.ts'),inputSha256:hash(input),
  flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
  node:process.version,platform:process.platform,arch:process.arch,lockSha256:hash('package-lock.json'),startedAt:new Date().toISOString()},cases:any[]=[],start=performance.now();
for(const id of ['R3101-S1001-P58','R6103-S3001-P4']){
 const f=packet.clips.find((f:any)=>f.id===id);
 for(const draw of f.executionWitnesses){const label=`${id}-production-${draw.geometry}`,
  observed=trial(f,'baseline',draw.execution,true,destination,label),plain=trial(f,'baseline',draw.execution,false,destination,label);
  if(observed.signature!==plain.signature)throw Error('Execution observer alters candidate');
  if(observed.acquisition?.appliedExecution!==draw.execution)throw Error('Actual draw was not applied');
  cases.push({...observed,drawSource:draw.geometry,observerVerified:true});
  console.log(JSON.stringify({id,draw:draw.execution,outcome:observed.result.outcome,yac:observed.result.stats.yac,
   firstLoad:observed.holds.find(h=>h.defender===f.defender)?.firstLoaded,slip:observed.holds.find(h=>h.defender===f.defender)?.brokenAt}));
 }
}
for(const id of ['R3101-S1001-P58','R6103-S3001-P4']){
 const values=cases.filter(c=>c.id===id).map(c=>({geometry:c.acquisition.geometry,joint:c.acquisition.before,rng:c.acquisition.rngSha256,command:c.acquisition.command}));
 if(new Set(values.map(v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'))).size!==1)throw Error('Fixed-draw entry states differ');
}
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'catch-production-execution-v1',provenance,cases,wallMs:performance.now()-start,
 interpretation:'Actual production candidate, no diagnostic arrival override. Only retained actual execution for the original selected first hold crossed through unchanged quality/capacity laws; placement, RNG consumption, entry bodies, queued strikes and all other actors retained. Four observed/plain full pairs, existing unchanged-baseline factorials reused. No favorable draw selection or grip-capability change.'})+'\n');
if(sourceVersion()!==provenance.sourceSha256)throw Error('Runtime changed');
