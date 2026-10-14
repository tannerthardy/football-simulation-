/** Reuse hash-compatible independent PR43 evidence; benchmark all six inputs
 * serially. The preserved ODE/controller/refinement gates remain unchanged.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {cpus} from 'node:os';
import {sha} from './grip-bounded-fixtures.js';
import {sourceVersion} from '../../source-version.js';
import {mixedSpanInputs} from './grip-mixed-span-inputs.js';
import {mixedSpanDifference} from './grip-mixed-span-model.js';
import {spanEventInterval} from './grip-span-event-interval.js';
import {spanEventReference} from './grip-span-event-reference.js';
import {spanKernelInterval} from './grip-span-kernel-interval.js';
const root='out/grip-span-kernel';mkdirSync(root,{recursive:true});
const parent='938810c40554a42add66600e770ffad0e6b0d8da',commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  priorPath='data/reviews/current/grip-span-events.json',prior=JSON.parse(readFileSync(priorPath,'utf8')),source=sourceVersion(),
  flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null])),
  files=['scripts/diag/physics/grip-span-kernel-trial.ts','scripts/diag/physics/grip-span-kernel-model.ts',
    'scripts/diag/physics/grip-span-kernel-interval.ts','scripts/diag/physics/grip-span-kernel-evidence.ts','test/grip-span-kernel.test.ts'],
  hashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))])),inputs=mixedSpanInputs(),
  mode=process.argv.includes('--benchmark')?'benchmark':'accuracy',
  output=process.argv.find(x=>x.startsWith('--output='))?.slice(9)??`${root}/kernel-evidence.json`;
assert.equal(source,prior.source);assert.deepEqual(flags,prior.flags);
for(const [p,h] of Object.entries(prior.hashes))assert.equal(sha(readFileSync(p)),h);
for(const p of ['src/physics/world.ts','src/physics/virtual-foot.ts','config/baseline.json','package-lock.json',
  'scripts/diag/physics/grip-span-event-interval.ts','scripts/diag/physics/grip-span-dop853.ts','scripts/diag/physics/grip-span-event-reference.ts'])
  assert.equal(sha(readFileSync(p)),sha(execFileSync('git',['show',`${parent}:${p}`])));
const metadata={commit,parent,source,flags,hashes,node:process.version,cpu:cpus()[0].model,timestamp:new Date().toISOString(),baseline:prior.baseline,
  priorReceipt:{path:priorPath,sha256:sha(readFileSync(priorPath))},protocol:prior.protocol,
  change:'Only dynamic coordinates0..15/time32 need intermediate RK stage states. Every final ledger quadrature/error retains original summation. Same field scalar/guard arithmetic without combined frame object. No World insertion in this numerical stage.'};
let payload:unknown;
if(mode==='accuracy'){
  assert.equal(sha(readFileSync(prior.raw.path)),prior.raw.sha256);
  const saved=JSON.parse(readFileSync(prior.raw.path,'utf8')),rows=[],raw=[];
  for(const c of inputs)for(const duration of [.0002,.05/12]){
    const input={...c.input,duration},r=saved.find((r:any)=>r.id===c.id&&r.input.duration===duration);assert(r);assert.deepEqual(r.input,input);
    const preserved=spanEventInterval(input),candidate=spanKernelInterval(input);assert.deepEqual(preserved,r.candidate);assert.deepEqual(candidate,preserved);
    const error=mixedSpanDifference(candidate,r.fine),convergence=mixedSpanDifference(r.coarse,r.fine);assert(error<=1/16&&convergence<=1/16);
    rows.push({id:c.id,duration,inputSha256:sha(JSON.stringify(input)),exactPR43:true,error,convergence,
      evaluations:candidate.evaluations,partitions:candidate.partitions,events:candidate.events,energyResidual:candidate.energyResidual,
      angularResidual:candidate.angularResidual,motorCompositionResidual:candidate.motorCompositionResidual,estimatedError:candidate.error});
    raw.push({id:c.id,input,candidate});
  }
  const path=`${root}/kernel-moving-raw.json`;writeFileSync(path,JSON.stringify(raw)+'\n');
  payload={rows,raw:{path,sha256:sha(readFileSync(path))},referenceReuse:{...prior.raw,commit:prior.commit,
    settings:'All prior dependency/fixture hashes checked. Independent SPD/RK4/bisection128/256 and2048/4096 states reused; original force/controller comparisons executed again.'}};
}else{
  const bench=[],samples=[];
  for(const c of inputs){
    const input={...c.input,duration:.05/12},names=['kernel','PR43-event','event-reference4096'],times:number[][]=names.map(()=>[]),reasons:string[][]=names.map(()=>[]);
    for(let k=0;k<26;k++)for(let j=0;j<names.length;j++){
      const i=(k+j)%names.length,t=performance.now();let reason='';
      try{if(i===0)spanKernelInterval(input);else if(i===1)spanEventInterval(input);else spanEventReference(input,4096);}
      catch(e){assert(e instanceof RangeError);reason=e.message;}
      const elapsed=performance.now()-t;if(k>=5){times[i].push(elapsed);if(reason)reasons[i].push(reason);}
    }
    for(let i=0;i<names.length;i++){
      const t=times[i].slice().sort((a,b)=>a-b),milliseconds={median:t[10],p95:t[19],maximum:t[20]};
      bench.push({id:c.id,method:names[i],milliseconds,refusals:reasons[i].length,passesBudget:i===0?reasons[i].length===0&&milliseconds.median<=2&&milliseconds.p95<=5:null});
      samples.push({id:c.id,method:names[i],times:times[i],reasons:reasons[i]});
    }
  }
  const path=output.replace(/\.json$/,'.samples.json');writeFileSync(path,JSON.stringify(samples)+'\n');
  payload={bench,raw:{path,sha256:sha(readFileSync(path))},benchmarkProtocol:{serial:true,warmups:5,repetitions:21,rotatingOrder:true,
    preparationOutsideClock:true,profilersOrLedgerObservers:false,sameSixInputsAndOrdinaryDuration:true},
    costPass:bench.filter(r=>r.method==='kernel').every(r=>r.passesBudget)};
}
assert.equal(sourceVersion(),source);for(const [p,h] of Object.entries(hashes))assert.equal(sha(readFileSync(p)),h);
writeFileSync(output,JSON.stringify({...metadata,mode,...payload as object},null,2)+'\n');console.log(JSON.stringify({output,mode,...payload as object}));
