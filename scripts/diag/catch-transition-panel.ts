/** Bounded natural-draw command/forecast audit. No new policy arm. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {trial} from './catch-transition-study.js';
import {sourceVersion} from '../source-version.js';
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex'),destination=process.argv[2];
if(!destination)throw Error('OUTDIR required');mkdirSync(destination,{recursive:true});
const inputPaths=[process.argv[3]??'data/reviews/current/catch-transition-inputs.json'],
 clips=inputPaths.flatMap(p=>JSON.parse(readFileSync(p,'utf8')).clips),
 ids=['R3101-S1001-P58','R6103-S3001-P4','R7204-S4001-P16','R3101-S1001-P19','R4202-S2001-P67','R4202-S2001-P95','R3101-S1001-P103','R3101-S1001-P173'],
 profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
 provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),
  collectorSha256:hash(import.meta.filename),runnerSha256:hash('scripts/diag/catch-transition-study.ts'),modelSha256:hash('scripts/diag/catch-arrival-model.ts'),
  flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,startedAt:new Date().toISOString()},cases=[];
for(const id of ids){const f=clips.find((c:any)=>c.id===id);if(!f)throw Error(`Missing ${id}`);const outcomes=[];
 for(const geometry of ['baseline','arrival'] as const){const label=`${id}-${geometry}`,observed=trial(f,geometry,null,true,destination,label,true),plain=trial(f,geometry,null,false,destination,label,true),
  witness=f.executionWitnesses.find((w:any)=>w.geometry===geometry),oracle=witness;
  if(observed.signature!==plain.signature||observed.signature!==oracle.signature)throw Error(`Audit altered ${label}`);
  outcomes.push({...observed,observerVerified:true,nativeOracle:witness});
  console.log(JSON.stringify({label,outcome:observed.result.outcome,yac:observed.result.stats.yac,changed:observed.changedCalls}));
 }
 cases.push({id,outcomes});
}
if(sourceVersion()!==provenance.sourceSha256)throw Error('Runtime changed');
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'catch-transition-panel-v1',provenance:{...provenance,finishedAt:new Date().toISOString()},
 inputs:inputPaths.map(path=>({path,sha256:hash(path)})),ids,cases,
 interpretation:'Predeclared small natural-draw panel. Unchanged baseline versus existing version-2 moving-arrival diagnostic; no new gates or policy. Reconstruct consumed observations, native commands and free movement/interception forecasts without new see or RNG calls. Native final state/RNG signatures and observed/plain parity checked against prior complete plays. P173 is a non-trigger control; no broadened scope.'})+'\n');
