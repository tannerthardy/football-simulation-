/** Production port must exactly reproduce the neutral team prototype. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {PlaySim,type PlaySetup} from '../../src/sim/playsim.js';
import {ScoutingReport} from '../../src/sim/recognition.js';
import {CoverageScouting} from '../../src/sim/qbmind.js';
import {sourceVersion} from '../source-version.js';
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),copy=<T>(x:T):T=>structuredClone(x),
 fileHash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex'),destination=process.argv[2];
if(!destination)throw Error('OUTDIR required');mkdirSync(destination,{recursive:true});
const inputPaths=['data/reviews/current/catch-transition-inputs.json','data/reviews/current/moving-catch-fresh-inputs.json'],
 prototypePaths=['data/reviews/current/moving-catch-prototype-signatures.json'],
 inputs=inputPaths.flatMap(p=>JSON.parse(readFileSync(p,'utf8')).clips),
 expected=prototypePaths.flatMap(p=>JSON.parse(readFileSync(p,'utf8')).cases),
 selected=process.argv[3]&&process.argv[3]!=='all'?process.argv[3].split(',').map(id=>expected.find(c=>c.id===id)??{
  id,signature:inputs.find((f:any)=>f.id===id)?.nativeSignature,artifact:null
 }):[...new Map(expected.map(c=>[c.id,c])).values()],
 unique=process.argv[4]==='baseline'?selected.map(c=>({...c,signature:inputs.find((f:any)=>f.id===c.id)?.nativeSignature,artifact:null})):selected,
 profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
 provenance={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),collectorSha256:fileHash(import.meta.filename),
  expectedBasis:process.argv[4]==='baseline'?'frozen unchanged baseline':'completed candidate references',
  inputs:inputPaths.map(path=>({path,sha256:fileHash(path)})),
  prototypes:prototypePaths.map(path=>({path,sha256:fileHash(path)})),
  flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),worldDefaults:profile.worldDefaults,
  node:process.version,platform:process.platform,arch:process.arch,lockSha256:fileHash('package-lock.json'),startedAt:new Date().toISOString()},
 cases:any[]=[],start=performance.now();let failure:string|null=null;
for(const e of unique){
 if(performance.now()-start>30000){failure='Declared 30-second port batch exhausted';break;}
 const f=inputs.find((f:any)=>f.id===e.id);if(!f||!e.signature)throw Error(`Missing declared fixture/signature ${e.id}`);
 const s=copy(f.setup),scouting=s.scouting?new ScoutingReport(s.scouting.strength):undefined;
 if(scouting)Reflect.set(scouting,'cells',new Map(s.scouting.cells));
 const coverageScouting=s.coverageScouting?Object.assign(new CoverageScouting(),copy(s.coverageScouting)):undefined,
  sim=new PlaySim({...s,energy:s.energy?new Map(s.energy):undefined,scouting,coverageScouting,record:false} as PlaySetup),
  t=performance.now(),result=sim.run(),signature=hash({result:{...result,frames:undefined,telemetry:undefined},
   bodies:sim.agents.map(a=>a.body),intents:sim.intents,rng:sim.rng,perception:sim.perception}),matched=signature===e.signature;
 cases.push({id:f.id,signature,expectedSignature:e.signature,matched,wallMs:performance.now()-t,result,
  reusedPrototype:e.artifact,setupSha256:hash(f.setup)});
 console.log(JSON.stringify({id:f.id,matched,outcome:result.outcome,yac:result.stats.yac}));
 if(!matched){failure=`Production port differs from prototype on ${f.id}`;break;}
}
if(performance.now()-start>30000)failure??='Declared 30-second port batch exceeded at completed-play boundary';
writeFileSync(join(destination,'summary.json'),JSON.stringify({schema:'catch-approach-production-parity-v1',provenance,cases,failure,
 unrun:unique.slice(cases.length).map(c=>c.id),wallMs:performance.now()-start,
 interpretation:'No diagnostic request override: actual production candidate from restored exact inputs. Every result, final body, executed intent, RNG and perception fingerprint must equal its completed observer-neutral prototype, or frozen baseline for an explicitly named additional unaffected control. Existing baseline results and prototype recordings reused; no games/full-suite rerun.'})+'\n');
if(sourceVersion()!==provenance.sourceSha256)throw Error('Source changed during parity');
if(failure)throw Error(failure);
