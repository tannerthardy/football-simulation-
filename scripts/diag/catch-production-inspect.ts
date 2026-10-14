/** Bounded actual-source recording of the incomplete opposing control. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {trial} from './catch-transition-study.js';
import {sourceVersion} from '../source-version.js';
const destination=process.argv[2];if(!destination)throw Error('OUTDIR required');mkdirSync(destination,{recursive:true});
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex'),
 input='data/reviews/current/moving-catch-fresh-inputs.json',prior='out/catch-production/remaining-fresh/summary.json',
 f=JSON.parse(readFileSync(input,'utf8')).clips.find((f:any)=>f.id==='H11842-C1-S52001'),
 expected=JSON.parse(readFileSync(prior,'utf8')).cases.find((c:any)=>c.id===f.id),profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
 provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),collectorSha256:hash(import.meta.filename),
  runnerSha256:hash('scripts/diag/catch-transition-study.ts'),inputs:[input,prior].map(path=>({path,sha256:hash(path)})),
  flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
  node:process.version,platform:process.platform,arch:process.arch,lockSha256:hash('package-lock.json'),startedAt:new Date().toISOString()},start=performance.now(),
 observed=trial(f,'baseline',null,true,destination,`${f.id}-production`),plain=trial(f,'baseline',null,false,destination,`${f.id}-production`);
if(observed.signature!==plain.signature||observed.signature!==expected.signature)throw Error('Recording changes the candidate');
if(JSON.stringify(observed.result)!==JSON.stringify(f.nativeResult))throw Error('Incomplete football outcome/events changed');
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'moving-catch-incomplete-inspection-v1',provenance,case:observed,
 observerVerified:true,sameFootballResult:true,baselineSignature:f.nativeSignature,wallMs:performance.now()-start,
 interpretation:'No movement/execution override. Complete actual-source observed/plain pair. Earlier baseline-state equality assumption failed on final bodies; result including all events unchanged. Film supports separating an expected eligible-defender approach change from lost ball opportunity.'})+'\n');
if(sourceVersion()!==provenance.sourceSha256)throw Error('Runtime changed');
