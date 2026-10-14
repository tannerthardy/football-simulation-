/** Diagnostic one-actor post-catch spacing ablation; not an installable policy. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {trial} from './catch-transition-study.js';
import {sourceVersion} from '../source-version.js';
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex'),destination=process.argv[2];
if(!destination)throw Error('OUTDIR required');mkdirSync(destination,{recursive:true});
const input='out/catch-hip-anchor/fresh/native-inputs.json',packet=JSON.parse(readFileSync(input,'utf8')),
 fresh=JSON.parse(readFileSync('out/catch-hip-anchor/fresh/summary.json','utf8')),profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
 plans=[{id:'H10831-C3-S51003',execution:null,role:'fresh untouched TD, no first hold'},
  {id:'H10831-C1-S51001',execution:null,role:'ordinary completed tackle with available NB support'},
  {id:'H10831-C1-S51001',execution:.8280738783133311,role:'ordinary same actual selected execution'},
  {id:'H11842-C4-S52004',execution:.8193023716022954,role:'sideline ending / same actual selected execution'}],
 provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),collectorSha256:hash(import.meta.filename),
 runnerSha256:hash('scripts/diag/catch-transition-study.ts'),spacingSourceSha256:hash('src/sim/spacing.ts'),inputSha256:hash(input),
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
 node:process.version,platform:process.platform,arch:process.arch,lockSha256:hash('package-lock.json'),startedAt:new Date().toISOString()};
const start=performance.now(),cases:any[]=[];
for(const [i,p] of plans.entries()){
 if(performance.now()-start>30000)throw Error('Declared 30-second diagnostic budget exhausted');
 const f=packet.clips.find((f:any)=>f.id===p.id),label=`${p.id}-spacing-ablation-${i}`,
  observed=trial(f,'baseline',p.execution,true,destination,label,false,true),plain=trial(f,'baseline',p.execution,false,destination,label,false,true),
  b=fresh.cases.find((c:any)=>c.id===p.id).baseline;
 if(observed.signature!==plain.signature)throw Error('Spacing observer changes native state/RNG');
 if(observed.actualReceiverId!==b.actualReceiverId)throw Error('Post-catch ablation changed earlier catcher identity');
 cases.push({...observed,role:p.role,observerVerified:true,reusedBaseline:b});
 console.log(JSON.stringify({id:p.id,role:p.role,overrides:observed.spacingOverrides.length,outcome:observed.result.outcome,
  yac:observed.result.stats.yac,firstLoad:observed.holds.find(h=>h.defender===f.defender)?.firstLoaded,
  slip:observed.holds.find(h=>h.defender===f.defender)?.brokenAt,execution:observed.acquisition?.appliedExecution}));
}
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'pursuit-spacing-ablation-v1',provenance,plans,cases,wallMs:performance.now()-start,
 interpretation:'No arrival/hip change combined. One actor in existing pursuit restores its free raw velocity only where post-spacing velocity differs. All physical contacts, constraints, teammate requests, delayed observations, speed/braking/grip capabilities and laws retained. This may cause real collisions and is diagnostic, not a safe cooperation fix. Catches/ending baseline reused; natural/same-execution ordinary and sideline controls retained.'})+'\n');
if(sourceVersion()!==provenance.sourceSha256||hash(input)!==provenance.inputSha256)throw Error('Inputs changed during ablation');
