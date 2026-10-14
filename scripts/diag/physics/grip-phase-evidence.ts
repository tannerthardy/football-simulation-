/** Source-pinned phase accuracy and serial, uninstrumented operator cost.
 * Native World/football claims are excluded. Historical refusals stay visible. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {cpus} from 'node:os';
import {sourceVersion} from '../../source-version.js';
import {phaseInputs} from './grip-phase-inputs.js';
import {passivePhaseInterval,phaseDifference} from './grip-phase-interval.js';
import {passivePhaseReference} from './grip-phase-reference.js';
import {sharedWorkMotion} from './grip-shared-work-motion.js';
const root='out/grip-phase';mkdirSync(root,{recursive:true});
const sha=(x:Uint8Array|string)=>createHash('sha256').update(x).digest('hex'),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  parent='bf4d6b60122c8eed940c02f0b6188079fa6ffa47',source=sourceVersion(),cases=phaseInputs(),
  flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null])),
  files=['scripts/diag/physics/grip-phase-model.ts','scripts/diag/physics/grip-phase-force.ts','scripts/diag/physics/grip-phase-box-reference.ts',
    'scripts/diag/physics/grip-phase-interval.ts','scripts/diag/physics/grip-phase-reference.ts','scripts/diag/physics/grip-phase-inputs.ts',
    'scripts/diag/physics/grip-phase-evidence.ts','test/grip-phase.test.ts','config/grip-phase-inputs.json','config/grip-shared-reference.json',
    'config/grip-shared-fresh-reference.json','scripts/diag/physics/grip-shared-explicit.ts','scripts/diag/physics/grip-pressure-rate.ts','package-lock.json'],
  hashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))])),benchmark=process.argv.includes('--benchmark');
assert.equal(source,'f0879d091645ec5c5fb84c8fd163da006fe3c9cdcae71bf95d87d2da62829e12');
for(const p of ['src/physics/world.ts','src/physics/grip-sliding.ts','config/baseline.json','package-lock.json','scripts/diag/physics/grip-shared-law.ts',
  'scripts/diag/physics/grip-shared-work-motion.ts','scripts/diag/physics/grip-shared-work-reference.ts','config/grip-shared-reference.json',
  'config/grip-shared-fresh-reference.json','scripts/diag/physics/grip-shared-explicit.ts','scripts/diag/physics/grip-pressure-rate.ts'])
  assert.equal(sha(readFileSync(p)),sha(execFileSync('git',['show',`${parent}:${p}`])));
const rows:any[]=[],raw:any[]=[],refusals:any[]=[],bench:any[]=[];
for(const c of cases){
  const saved=structuredClone(c.input),a=passivePhaseInterval(c.input),b=passivePhaseReference(c.input,128),f=passivePhaseReference(c.input,256),
    convergence=phaseDifference(b,f),error=phaseDifference(a,f);
  assert(convergence<=1/16&&error<=1/16);assert.deepEqual(c.input,saved);
  assert(Math.abs(a.workResidual)<1e-8&&Math.abs(a.angularResidual)<1e-7&&a.representationError<1e-10&&a.linearResidual<1e-10&&a.passiveWork<=1e-9);
  for(let k=0;k<a.grips.length;k++){
    const g=a.grips[k],initial=c.input.grips[k];assert(g.dose<=initial.capacity*c.input.duration+1e-12);
    assert(Math.abs(g.legs-(1-(1-initial.legs)*Math.exp(-g.slipDuration/.3)))<1e-12);
  }
  const metrics=(r:typeof a|typeof f)=>({events:r.events,partitions:r.partitions,evaluations:r.evaluations,rootIterations:r.rootIterations,
    workResidual:r.workResidual,angularResidual:r.angularResidual,representationError:r.representationError,linearResidual:r.linearResidual,
    passiveWork:r.passiveWork,bodyWork:r.bodyWork,motorWork:r.motorWork,maximumTargetResidual:r.maximumTargetResidual,
    maximumPassivePower:r.maximumPassivePower,legs:r.grips.map(g=>g.legs),hold:r.grips.map(g=>g.hold),slipDuration:r.grips.map(g=>g.slipDuration),dose:r.grips.map(g=>g.dose)});
  rows.push({id:c.id,selector:c.selector,inputSha256:sha(JSON.stringify(c.input)),convergence,error,candidate:metrics(a),reference:metrics(f)});
  raw.push({id:c.id,input:c.input,candidate:a,coarse:b,fine:f});
}
for(const [mode,H] of [['coupled',.0001],['coupled',.0002],['reference',.0001]] as const){
  const input={...structuredClone(cases[0].input),duration:H},saved=structuredClone(input);let reason='';
  try{sharedWorkMotion(input,mode,128,'rk4');}catch(e){assert(e instanceof RangeError);reason=e.message;}
  assert(reason);assert.deepEqual(input,saved);refusals.push({id:`old-${mode}-${H}`,reason,returnedState:false,inputUnchanged:true});
}
// Time outside preparation/observation; rotate order to avoid systematic
// warmup bias. Fine reference is intentionally a diagnostic cost comparator.
if(benchmark)for(const c of cases.filter(c=>['unequal-200us','ordinary-control','single-control','fresh-share42'].includes(c.id))){
  const input=structuredClone(c.input),ops=[()=>passivePhaseInterval(input),()=>passivePhaseReference(input,256)],samples=[[] as number[],[] as number[]];
  for(let k=0;k<5;k++)for(const op of ops)op();
  for(let k=0;k<21;k++)for(let j=0;j<2;j++){const i=(k+j)%2,start=performance.now();const result=ops[i]();samples[i].push(performance.now()-start);
    assert(result.evaluations>0);}
  assert.deepEqual(input,c.input);
  for(let i=0;i<2;i++){const times=samples[i].slice().sort((a,b)=>a-b);bench.push({id:c.id,method:i?'reference256':'candidate',samples:samples[i],
    milliseconds:{median:times[10],p95:times[19],maximum:times[20]}});}
}
assert.equal(sourceVersion(),source);for(const p of files)assert.equal(sha(readFileSync(p)),hashes[p]);
writeFileSync(`${root}/moving-raw.json`,JSON.stringify(raw)+'\n');
const output=process.argv.find(v=>v.startsWith('--output='))?.slice(9)??`${root}/evidence.json`;
writeFileSync(output,JSON.stringify({commit,parent,source,baseline:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',flags,hashes,node:process.version,cpu:cpus()[0].model,
  scope:'One or two passive tangent grips on one corrective foot, closing spans, inactive normal targets and no active motor/reel. One initial cap/slip exit and initial-force zero crossings. World/recovery/capacities/defaults unchanged.',
  protocol:{candidate:'Direct active-set force + DOP853; local cap/slip/force-zero root splits; step refinement includes slip-duration and force-dose ledgers',
    reference:'Independent translated-objective box enumeration + RK4/bracket bisection, 128/256 pieces. Shared coordinates and ODE, independent forces/steps/root solvers.',
    repetitions:benchmark?21:0,warmups:benchmark?5:0,serial:true,profilersOrPerStepObservers:false,preparationOutsideClock:true,
    maximumForceEvaluations:4096,maximumPartitions:256,maximumRootIterations:12,rootNormalizedResidual:1e-11,refinedErrorAllowance:1/16,
    capacitySlipMarker:.98,slideTime:.3,slipDurationTolerance:2e-11,costBudgetMilliseconds:{median:2,p95:5,refusal:10}},
  rows,refusals,bench,raw:{path:`${root}/moving-raw.json`,sha256:sha(readFileSync(`${root}/moving-raw.json`))},
  remaining:'Only 100/200-us intervals independently validated. 500/1000-us preliminary reference pairs were not converged at 128/256 pieces. Native World intervals, active normal/tangent/span-energy budgets, long holds, fatigue/support composition and football benefits are unproved. Nine unrelated patch failures remain 43/52; keeper and support history separate.'},null,2)+'\n');
console.log(JSON.stringify({output,matched:rows.length,maximumReferenceError:Math.max(...rows.map(r=>r.error)),maximumReferenceConvergence:Math.max(...rows.map(r=>r.convergence)),
  bench:bench.map(r=>({id:r.id,method:r.method,...r.milliseconds})),refusals}));
