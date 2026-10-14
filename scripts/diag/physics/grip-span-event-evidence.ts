/** Firm PR40 checkpoint: same inputs/laws, converged reversal reference and
 * serial uninstrumented cost. Accuracy does not waive the integration budget.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {cpus} from 'node:os';
import {Session} from 'node:inspector/promises';
import {sourceVersion} from '../../source-version.js';
import {sha} from './grip-bounded-fixtures.js';
import {mixedSpanInputs,prepareMixedSpanCase} from './grip-mixed-span-inputs.js';
import {mixedSpanDifference} from './grip-mixed-span-model.js';
import {mixedSpanInterval} from './grip-mixed-span-interval.js';
import {mixedSpanReference} from './grip-mixed-span-reference.js';
import {spanEventInterval} from './grip-span-event-interval.js';
import {spanEventReference} from './grip-span-event-reference.js';
const root='out/grip-span-events';mkdirSync(root,{recursive:true});
const parent='9a9d1b9ddddd405c5d4d9ee1b587f214ef95e134',commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  source=sourceVersion(),prior=JSON.parse(readFileSync('data/reviews/current/grip-mixed-span.json','utf8')),
  flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null])),
  files=['scripts/diag/physics/grip-span-dop853.ts','scripts/diag/physics/grip-span-event-force.ts',
    'scripts/diag/physics/grip-span-event-interval.ts','scripts/diag/physics/grip-span-event-reference.ts',
    'scripts/diag/physics/grip-span-event-evidence.ts','scripts/diag/physics/grip-shared-explicit.ts',
    'scripts/diag/physics/grip-mixed-span-model.ts','scripts/diag/physics/grip-mixed-span-force.ts',
    'scripts/diag/physics/grip-mixed-span-reference-force.ts','scripts/diag/physics/grip-pressure-rate.ts',
    'config/grip-mixed-span-inputs.json','test/grip-span-events.test.ts'],
  hashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))])),inputs=mixedSpanInputs(),
  mode=process.argv.includes('--benchmark')?'benchmark':process.argv.includes('--profile')?'profile':'accuracy',
  output=process.argv.find(x=>x.startsWith('--output='))?.slice(9)??`${root}/event-evidence.json`,
  saved=(p:string)=>execFileSync('git',['show',`${parent}:${p}`]);
assert.equal(source,prior.source);assert.deepEqual(flags,prior.flags);
for(const p of ['src/physics/world.ts','src/physics/virtual-foot.ts','src/physics/grip-timing.ts','config/baseline.json','package-lock.json',
  'scripts/diag/physics/grip-mixed-span-model.ts','scripts/diag/physics/grip-mixed-span-force.ts',
  'scripts/diag/physics/grip-mixed-span-reference-force.ts','scripts/diag/physics/grip-mixed-span-interval.ts',
  'scripts/diag/physics/grip-mixed-span-reference.ts','scripts/diag/physics/grip-mixed-span-evidence.ts',
  'scripts/diag/physics/grip-mixed-span-inputs.ts','scripts/diag/physics/grip-pressure-rate.ts',
  'config/grip-mixed-span-inputs.json','test/grip-mixed-span.test.ts','test/grip-effort.test.ts'])
  assert.equal(sha(readFileSync(p)),sha(saved(p)));
// The only prior diagnostic edit exports its table. Original uniform step,
// coefficients and arithmetic are byte-for-byte preserved before this suffix.
const table=readFileSync('scripts/diag/physics/grip-shared-explicit.ts','utf8');
assert.equal(table.slice(0,table.indexOf('/** Read-only reuse')).trimEnd(),saved('scripts/diag/physics/grip-shared-explicit.ts').toString().trimEnd());
const metadata={commit,parent,source,flags,hashes,baseline:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',node:process.version,cpu:cpus()[0].model,
  timestamp:new Date().toISOString(),priorReceipt:{path:'data/reviews/current/grip-mixed-span.json',sha256:sha(readFileSync('data/reviews/current/grip-mixed-span.json'))},
  scope:'Same isolated passive lower grip, same stored spring, sticking tangent/common-foot law, below98% vector cap. Desired motor/reel zero, fixed retained hold/share. No World/native fatigue, support, recovery, active, slip or multiple-contact insertion.',
  protocol:{candidate:'DOP853 local embedded5/3 estimate, per-component norm and summed1/32 budget; whole-state safeguarded secant at tangent reversal; endpoint derivative reuse',
    reference:'Independent SPD provider + RK4 uniform pieces with whole-state bisection at reversal; same physical coordinates/ODE, independent force/step/root',
    shortReference:[128,256],longReference:[2048,4096],refinedAllowance:1/16,
    event:{maximum:4,forceResidualCapacityRatio:1e-12,timeBracket:1e-14,detectionFloor:'1e-9/(128*duration), numerical event detection only'},
    bounded:{evaluations:4096,pieces:256,retries:24,rootTrials:12},
    accuracy:{position:5e-10,velocity:2.5e-8,facing:2.5e-9,spin:2.5e-7,attachment:5e-10,impulse:5e-10,moment:5e-10,work:1e-9,dose:1e-9},
    budgetMilliseconds:{median:2,p95:5,refusal:10},shortDuration:.0002,longDuration:.05/12}};
const metrics=(r:ReturnType<typeof spanEventReference>)=>({partitions:r.partitions,evaluations:r.evaluations,
  energyResidual:r.energyResidual,spanResidual:r.spanResidual,workResidual:r.workResidual,angularResidual:r.angularResidual,
  representationError:r.representationError,motorCompositionResidual:r.motorCompositionResidual,
  maximumTargetResidual:r.maximumTargetResidual,maximumCapacityRatio:r.maximumCapacityRatio,minimumLoss:r.minimumLoss,
  bodyWork:r.bodyWork,motorWork:r.motorWork,springWork:r.springWork,initialSpringEnergy:r.initialSpringEnergy,springEnergy:r.springEnergy,
  dampingLoss:r.dampingLoss,motorCrossWork:r.motorCrossWork,separateMotorWork:r.separateMotorWork,
  normalImpulse:r.normalImpulse,tangentImpulse:r.tangentImpulse,normalDose:r.normalDose,tangentDose:r.tangentDose,dose:r.dose,
  events:r.events,rootIterations:r.rootIterations});
let payload:unknown;
if(mode==='accuracy'){
  const rows=[],raw=[];
  for(const c of inputs){
    const reconstructed=prepareMixedSpanCase(c.selector);assert.equal(reconstructed.checksum,c.packetSha256);assert.deepEqual(reconstructed.input,c.input);
    for(const duration of [.0002,.05/12]){
      const input={...c.input,duration},savedInput=structuredClone(input),n=duration===.0002?128:2048,
        candidate=spanEventInterval(input),coarse=spanEventReference(input,n),fine=spanEventReference(input,n*2),
        error=mixedSpanDifference(candidate,fine),convergence=mixedSpanDifference(coarse,fine);
      assert(error<=1/16&&convergence<=1/16);assert.deepEqual(input,savedInput);assert(candidate.error<=1/32);
      assert(candidate.maximumCapacityRatio<.98);assert(candidate.dose<=input.capacity*duration+1e-12);
      let uniform:ReturnType<typeof mixedSpanInterval>|undefined,reason='';
      try{uniform=mixedSpanInterval(input);}catch(e){assert(e instanceof RangeError);reason=e.message;}
      const oldCoarse=mixedSpanReference(input,n),oldFine=mixedSpanReference(input,n*2),oldConvergence=mixedSpanDifference(oldCoarse,oldFine),
        oldError=uniform?mixedSpanDifference(uniform,oldFine):null;
      rows.push({id:c.id,duration,inputSha256:sha(JSON.stringify(input)),packetSha256:c.packetSha256,error,convergence,
        candidate:{...metrics(candidate),estimatedError:candidate.error,rejections:candidate.rejections,refusals:candidate.refusals},reference:metrics(fine),
        preservedUniform:{returned:Boolean(uniform),reason,error:oldError,convergence:oldConvergence,
          accepted:Boolean(uniform&&oldError!==null&&oldError<=1/16&&oldConvergence<=1/16),
          partitions:uniform?.partitions??null,evaluations:uniform?.evaluations??null}});
      raw.push({id:c.id,input,candidate,coarse,fine,uniform:uniform??null,reason,oldCoarse,oldFine});
    }
  }
  const path=`${root}/event-moving-raw.json`;writeFileSync(path,JSON.stringify(raw)+'\n');
  payload={rows,raw:{path,sha256:sha(readFileSync(path))},decision:'All six short and ordinary cases pass the unchanged gates and independent refinement. Runtime gate remains independent; no World insertion by accuracy alone.'};
}else if(mode==='benchmark'){
  const samples=[],summaries=[];
  for(const c of inputs){
    const input={...c.input,duration:.05/12},names=['event-local','preserved-uniform','event-reference4096'],times:number[][]=names.map(()=>[]),refusalReasons:string[][]=names.map(()=>[]);
    for(let k=0;k<26;k++)for(let j=0;j<names.length;j++){
      const i=(k+j)%names.length,start=performance.now();let reason='';
      try{if(i===0)spanEventInterval(input);else if(i===1)mixedSpanInterval(input);else spanEventReference(input,4096);}
      catch(e){assert(e instanceof RangeError);reason=e.message;}
      const elapsed=performance.now()-start;if(k>=5){times[i].push(elapsed);if(reason)refusalReasons[i].push(reason);}
    }
    for(let i=0;i<names.length;i++){
      const t=times[i].slice().sort((a,b)=>a-b),milliseconds={median:t[10],p95:t[19],maximum:t[20]};
      summaries.push({id:c.id,method:names[i],milliseconds,refusals:refusalReasons[i].length,reasons:[...new Set(refusalReasons[i])],
        passesBudget:i===0?refusalReasons[i].length===0&&milliseconds.median<=2&&milliseconds.p95<=5:null});
      samples.push({id:c.id,method:names[i],times:times[i],refusalReasons:refusalReasons[i]});
    }
  }
  const path=output.replace(/\.json$/,'.samples.json');writeFileSync(path,JSON.stringify(samples)+'\n');
  payload={bench:summaries,raw:{path,sha256:sha(readFileSync(path))},benchmarkProtocol:{serial:true,warmups:5,repetitions:21,rotatingOrder:true,
    preparationOutsideClock:true,profilersOrLedgerObservers:false,baselineIsPreservedUniformDiagnostic:true},
    decision:summaries.filter(r=>r.method==='event-local').every(r=>r.passesBudget)?'Scope cost gate passes; evaluate minimal experimental World interface next.':'Reject World integration: at least one ordinary input misses the declared median/p95 budget. Retain precise diagnostic reference; stop this bounded pass.'};
}else{
  const input={...inputs.find(c=>c.id==='curved-mixed')!.input,duration:.05/12};for(let k=0;k<20;k++)spanEventInterval(input);
  const session=new Session();session.connect();await session.post('Profiler.enable');await session.post('Profiler.setSamplingInterval',{interval:100});await session.post('Profiler.start');
  for(let k=0;k<500;k++)spanEventInterval(input);
  const {profile}=await session.post('Profiler.stop');session.disconnect();const path=`${root}/event-final.cpuprofile`;writeFileSync(path,JSON.stringify(profile));
  const nodes=new Map(profile.nodes.map(n=>[n.id,n])),counts=new Map<number,number>();for(const id of profile.samples??[])counts.set(id,(counts.get(id)??0)+1);
  const total=profile.samples?.length??0,hot=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,15).map(([id,count])=>({count,fraction:count/total,
    function:nodes.get(id)?.callFrame.functionName,file:nodes.get(id)?.callFrame.url,line:(nodes.get(id)?.callFrame.lineNumber??0)+1}));
  payload={profile:{path,sha256:sha(readFileSync(path)),samples:total,operators:500,input:'curved-mixed4.166667ms',hot,preparationExcluded:true},
    decision:'Profile is separate from uninstrumented clocks; use dominant arithmetic/geometry cost for the checkpoint recommendation, without loosening accuracy or changing laws.'};
}
assert.equal(sourceVersion(),source);for(const p of files)assert.equal(sha(readFileSync(p)),hashes[p]);
writeFileSync(output,JSON.stringify({...metadata,mode,...payload as object},null,2)+'\n');
console.log(JSON.stringify({output,mode,...payload as object}));
