/** Source-pinned one-grip mixed-energy witness, mechanical refs and serial
 * cost. Successful partial scope never launders long failures into passes.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {cpus} from 'node:os';
import {Session} from 'node:inspector/promises';
import {sourceVersion} from '../../source-version.js';
import {sha} from './grip-bounded-fixtures.js';
import {mixedSpanInputs,prepareMixedSpanCase} from './grip-mixed-span-inputs.js';
import {spanForce,orderedSpanTarget} from './grip-mixed-span-force.js';
import {spanReferenceForce} from './grip-mixed-span-reference-force.js';
import {mixedSpanModel,mixedSpanDifference} from './grip-mixed-span-model.js';
import {mixedSpanInterval} from './grip-mixed-span-interval.js';
import {mixedSpanReference} from './grip-mixed-span-reference.js';
import {withSpanReserve} from './grip-span-accounting.js';
import {frozenArguments} from './grip-world-accounting-inputs.js';
import {observeWorldLedger} from './grip-world-ledger.js';
const root='out/grip-mixed-span';mkdirSync(root,{recursive:true});
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),parent='03700539089162b7d667d6d836d34c88cebb9806',source=sourceVersion(),
  flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null])),
  inputs=mixedSpanInputs(),files=['scripts/diag/physics/grip-mixed-span-force.ts','scripts/diag/physics/grip-mixed-span-inputs.ts',
    'scripts/diag/physics/grip-mixed-span-model.ts','scripts/diag/physics/grip-mixed-span-interval.ts','scripts/diag/physics/grip-mixed-span-reference.ts',
    'scripts/diag/physics/grip-mixed-span-reference-force.ts','scripts/diag/physics/grip-mixed-span-evidence.ts','config/grip-mixed-span-inputs.json',
    'test/grip-mixed-span.test.ts','scripts/diag/physics/grip-pressure-rate.ts','scripts/diag/physics/grip-shared-explicit.ts'],
  hashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))])),
  prior=JSON.parse(readFileSync('data/reviews/current/grip-world-accounting.json','utf8')),
  mode=process.argv.includes('--benchmark')?'benchmark':process.argv.includes('--profile')?'profile':'accuracy',
  output=process.argv.find(x=>x.startsWith('--output='))?.slice(9)??`${root}/evidence.json`;
assert.equal(source,prior.source);assert.deepEqual(flags,prior.flags);
for(const p of ['src/physics/world.ts','src/physics/virtual-foot.ts','src/physics/grip-timing.ts','config/baseline.json','package-lock.json',
  'scripts/diag/physics/grip-span-accounting.ts','scripts/diag/physics/grip-force-mixed.ts','scripts/diag/physics/grip-phase-interval.ts',
  'scripts/diag/physics/grip-phase-reference.ts','scripts/diag/physics/grip-pressure-rate.ts','scripts/diag/physics/grip-shared-explicit.ts'])
  assert.equal(sha(readFileSync(p)),sha(execFileSync('git',['show',`${parent}:${p}`])));
const metadata={commit,parent,source,flags,hashes,baseline:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',node:process.version,cpu:cpus()[0].model,
  scope:'One passive lower grip; original 6Hz/.8 spring/damper, existing sticking tangent and shared capacity. Desired motor/reel zero, fixed retained rest/share, below98% vector cap. Moving two-body yaw/material/raw foot/work/dose, no World or recovery insertion.',
  protocol:{candidate:'Coupled force elimination + DOP853, dyadic physical refinement 1..128, max4096 fields; coarse overshoot refusals retained',
    reference:'Independent SPD halfplane force + uniform RK4; same physical coordinates/ODE, independent force and timestepping',
    shortReference:[128,256],longReference:[2048,4096],refinedAllowance:1/16,
    accuracy:{position:5e-10,velocity:2.5e-8,facing:2.5e-9,spin:2.5e-7,attachment:5e-10,impulse:5e-10,moment:5e-10,work:1e-9,dose:1e-9},
    budgetMilliseconds:{median:2,p95:5,refusal:10},shortDuration:.0002,longDuration:.05/12}};
const metrics=(r:ReturnType<typeof mixedSpanReference>)=>({partitions:r.partitions,evaluations:r.evaluations,
  workResidual:r.workResidual,spanResidual:r.spanResidual,energyResidual:r.energyResidual,angularResidual:r.angularResidual,
  motorCompositionResidual:r.motorCompositionResidual,representationError:r.representationError,maximumTargetResidual:r.maximumTargetResidual,
  maximumCapacityRatio:r.maximumCapacityRatio,minimumLoss:r.minimumLoss,bodyWork:r.bodyWork,motorWork:r.motorWork,motorCrossWork:r.motorCrossWork,
  separateMotorWork:r.separateMotorWork,passiveWork:r.passiveWork,springWork:r.springWork,initialSpringEnergy:r.initialSpringEnergy,
  springEnergy:r.springEnergy,dampingLoss:r.dampingLoss,normalImpulse:r.normalImpulse,tangentImpulse:r.tangentImpulse,
  normalDose:r.normalDose,tangentDose:r.tangentDose,dose:r.dose,finalForce:r.finalForce});
let payload:any;
if(mode==='accuracy'){
  const rows=[],long=[],raw=[],world=[],frozen=[];
  for(const c of inputs){
    const reconstructed=prepareMixedSpanCase(c.selector);assert.equal(reconstructed.checksum,c.packetSha256);assert.deepEqual(reconstructed.input,c.input);
    const saved=structuredClone(c.input),m=mixedSpanModel(c.input,spanForce),g=m.frame(m.initial),q={vn:g.vn,vt:g.vt,nn:g.nn,nt:g.nt,tt:g.tt,
      inverseMass:1/c.input.a.mass+1/c.input.b.mass,extension:g.e,capacity:c.input.capacity},a=spanForce(q),o=orderedSpanTarget(q),r=spanReferenceForce(q);
    assert(Math.max(Math.abs(a.normal-o.normal),Math.abs(a.tangent-o.tangent),Math.abs(a.normal-r.normal),Math.abs(a.tangent-r.tangent))<1e-9);
    frozen.push({id:c.id,q,candidate:a,ordered:o,reference:r});
    const candidate=mixedSpanInterval(c.input),coarse=mixedSpanReference(c.input,128),fine=mixedSpanReference(c.input,256),
      error=mixedSpanDifference(candidate,fine),convergence=mixedSpanDifference(coarse,fine);
    assert(error<=1/16&&convergence<=1/16);assert.deepEqual(c.input,saved);
    assert(Math.abs(candidate.energyResidual)<1e-8&&Math.abs(candidate.spanResidual)<1e-9&&Math.abs(candidate.angularResidual)<1e-7
      &&candidate.representationError<1e-10&&Math.abs(candidate.motorCompositionResidual)<1e-10&&candidate.dose<=c.input.capacity*c.input.duration+1e-12);
    rows.push({id:c.id,inputSha256:sha(JSON.stringify(c.input)),packetSha256:c.packetSha256,selector:c.selector,convergence,error,
      candidate:{...metrics(candidate),refusedTrials:candidate.refusedTrials},reference:metrics(fine)});
    raw.push({id:c.id,input:c.input,candidate,coarse,fine});
    // Explicit whole interval question: success/failure/reference uncertainty
    // are recorded independently, never used to claim all six pass.
    const input={...c.input,duration:.05/12};let result:ReturnType<typeof mixedSpanInterval>|undefined,reason='';
    try{result=mixedSpanInterval(input);}catch(e){assert(e instanceof RangeError);reason=e.message;}
    const lo=mixedSpanReference(input,2048),hi=mixedSpanReference(input,4096),conv=mixedSpanDifference(lo,hi),
      diff=result?mixedSpanDifference(result,hi):null,accepted=Boolean(result&&conv<=1/16&&diff!==null&&diff<=1/16);
    long.push({id:c.id,convergence:conv,error:diff,accepted,reason,candidate:result?{...metrics(result),refusedTrials:result.refusedTrials}:null,
      reference:metrics(hi),candidateStateReturned:Boolean(result),referenceConverged:conv<=1/16});
    raw.push({id:`${c.id}-long`,input,candidate:result??null,reason,coarse:lo,fine:hi});
  }
  for(const id of ['loaded-mixed','curved-return','radial-control','zero-span-control']){
    const c=inputs.find(c=>c.id===id)!,v=prepareMixedSpanCase(c.selector),a=observeWorldLedger(v.w,()=>frozenArguments(v.p,v.w,c.input.duration,128),c.input.duration);
    world.push({id,mode:'unchanged-World128',duration:c.input.duration,partitions:128,...a.accounting});
  }
  const previous=prior.adverse[0],radial=raw.find(c=>c.id==='radial-control')!.candidate;
  assert(radial);
  assert(Math.abs(radial.dose-previous.reference.dose)<1e-9/16&&Math.abs(radial.bodyWork-previous.reference.bodyWork)<1e-9/16);
  writeFileSync(`${root}/moving-raw.json`,JSON.stringify(raw)+'\n');
  payload={rows,long,frozen,world,priorComparison:{path:'data/reviews/current/grip-world-accounting.json',sha256:sha(readFileSync('data/reviews/current/grip-world-accounting.json')),
    originalFundedWorld128NormalizedError:previous.normalizedError,newRadialReferenceError:rows.find(c=>c.id==='radial-control')!.error,
    inputBasis:'Same acquired loaded/stopped radial checkpoint, existing mobility, unchanged capacities, 200us. Reuse prior scalar work/dose oracle.'},
    raw:{path:`${root}/moving-raw.json`,sha256:sha(readFileSync(`${root}/moving-raw.json`))},
    decision:'200us accounting/mechanics pass; ordinary whole-interval scope is incomplete, so no World/native football integration. Retain 4.166667ms curved-return refusal and unconverged reference; tangent force reverses near.806ms, normal remains negative.'};
}else if(mode==='benchmark'){
  const bench:any[]=[];
  const clock=(id:string,names:string[],prepare:(method:number)=>()=>unknown)=>{
    const samples:number[][]=names.map(()=>[]);
    for(let k=0;k<26;k++)for(let j=0;j<names.length;j++){
      const i=(k+j)%names.length,run=prepare(i),start=performance.now();run();const elapsed=performance.now()-start;if(k>=5)samples[i].push(elapsed);
    }
    for(let i=0;i<names.length;i++){const t=samples[i].slice().sort((a,b)=>a-b);bench.push({id,method:names[i],samples:samples[i],milliseconds:{median:t[10],p95:t[19],maximum:t[20]}});}
  };
  for(const c of inputs)clock(`${c.id}-200us`,['candidate','reference256'],i=>()=>i?mixedSpanReference(c.input,256):mixedSpanInterval(c.input));
  const radial=inputs.find(c=>c.id==='radial-control')!;
  clock('radial-matched-200us',['originalWorld128-known-wrong','fundedWorld128-fails-strict-dose','candidate','reference256'],i=>{
    if(i>=2)return ()=>i===2?mixedSpanInterval(radial.input):mixedSpanReference(radial.input,256);
    const v=prepareMixedSpanCase(radial.selector);
    return ()=>i===1?withSpanReserve(v.w,()=>frozenArguments(v.p,v.w,.0002,128)):frozenArguments(v.p,v.w,.0002,128);
  });
  const long=inputs.find(c=>c.id==='curved-return')!;
  clock('long-curved-return-refusal',['candidate-refusal'],()=>()=>{let reason='';try{mixedSpanInterval({...long.input,duration:.05/12});}
    catch(e){assert(e instanceof RangeError);reason=e.message;}assert(reason);});
  const valid=inputs.find(c=>c.id==='curved-mixed')!;clock('long-curved-mixed',['candidate'],()=>()=>mixedSpanInterval({...valid.input,duration:.05/12}));
  payload={bench,benchmarkProtocol:{serial:true,warmups:5,repetitions:21,rotatingOrder:true,profilersOrLedgerObservers:false,
    preparationOutsideClock:true,knownWrongOriginalAndFundedSpeedIsNotAcceptance:true},
    decision:'Report short success separately from whole-interval tail/refusal; no global/native football cost claim.'};
}else{
  const input=inputs.find(c=>c.id==='curved-mixed')!.input;for(let k=0;k<10;k++)mixedSpanInterval(input);
  const session=new Session();session.connect();await session.post('Profiler.enable');await session.post('Profiler.setSamplingInterval',{interval:500});await session.post('Profiler.start');
  for(let k=0;k<400;k++)mixedSpanInterval(input);
  const {profile}=await session.post('Profiler.stop');session.disconnect();const path=`${root}/mixed-span.cpuprofile`;writeFileSync(path,JSON.stringify(profile));
  const nodes=new Map(profile.nodes.map(n=>[n.id,n])),counts=new Map<number,number>();for(const id of profile.samples??[])counts.set(id,(counts.get(id)??0)+1);
  const total=profile.samples?.length??0,hot=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,15).map(([id,count])=>({count,fraction:count/total,
    function:nodes.get(id)?.callFrame.functionName,file:nodes.get(id)?.callFrame.url,line:(nodes.get(id)?.callFrame.lineNumber??0)+1}));
  payload={profile:{path,sha256:sha(readFileSync(path)),samples:total,operators:400,hot,input:'curved-mixed200us',preparationExcluded:true},
    decision:'Use actual dominant cost to choose next work; do not remove stored-energy/impulse/channel-dose gates to claim speed.'};
}
assert.equal(sourceVersion(),source);for(const p of files)assert.equal(sha(readFileSync(p)),hashes[p]);
writeFileSync(output,JSON.stringify({...metadata,mode,...payload},null,2)+'\n');
console.log(JSON.stringify({output,mode,short:payload.rows?.map((r:any)=>({id:r.id,error:r.error,convergence:r.convergence,...r.candidate})),
  long:payload.long?.map((r:any)=>({id:r.id,error:r.error,convergence:r.convergence,accepted:r.accepted,reason:r.reason})),
  bench:payload.bench?.map((r:any)=>({id:r.id,method:r.method,...r.milliseconds})),profile:payload.profile}));
