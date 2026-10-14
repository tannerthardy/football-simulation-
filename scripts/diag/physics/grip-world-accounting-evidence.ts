/** Complete-interval bookkeeping plus the first stored-span restoring error.
 * Native packets stay immutable in out. Profiling and clocked measurements
 * are separate processes; preparation/observers are outside benchmark clocks.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {Session} from 'node:inspector/promises';
import {cpus} from 'node:os';
import {sourceVersion} from '../../source-version.js';
import {sha,prescribeBoundedSupport} from './grip-bounded-fixtures.js';
import {prepareMixedCase} from './grip-mixed-fixtures.js';
import {nativeAccountingInput,loadSpanInput,frozenArguments} from './grip-world-accounting-inputs.js';
import {observeWorldLedger} from './grip-world-ledger.js';
import {storedSpan,radialSpanReference,withSpanReserve} from './grip-span-accounting.js';
const root='out/grip-world-accounting';mkdirSync(root,{recursive:true});
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source=sourceVersion(),
  files=['scripts/diag/physics/grip-world-accounting-evidence.ts','scripts/diag/physics/grip-world-accounting-inputs.ts',
    'scripts/diag/physics/grip-world-ledger.ts','scripts/diag/physics/grip-span-accounting.ts','test/grip-span-accounting.test.ts'],
  hashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))])),
  flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null])),
  packetManifest=JSON.parse(readFileSync('out/grip-timing/baseline.json','utf8')),
  parent='abf0e1c775b4ded5e0ff09e0bbe98d5d2c9587d6';
assert.equal(source,'f0879d091645ec5c5fb84c8fd163da006fe3c9cdcae71bf95d87d2da62829e12');assert.deepEqual(flags,packetManifest.flags);
for(const p of ['src/physics/world.ts','src/physics/virtual-foot.ts','config/baseline.json','package-lock.json',
  'scripts/diag/physics/grip-phase-interval.ts','scripts/diag/physics/grip-phase-reference.ts','scripts/diag/physics/grip-mixed-reference.ts'])
  assert.equal(sha(readFileSync(p)),sha(execFileSync('git',['show',`${parent}:${p}`])));
const metadata={commit,parent,source,flags,hashes,baseline:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',node:process.version,cpu:cpus()[0].model,
  worldOptions:{handContact:'patch',constraintWork:'per-solve',gripTiming:'midpoint',handIntegration:'centered'},
  budgetMilliseconds:{median:2,p95:5,boundedFallback:10}};
const output=process.argv.find(x=>x.startsWith('--output='))?.slice(9)??`${root}/evidence.json`,mode=process.argv.includes('--benchmark')?'benchmark':process.argv.includes('--profile')?'profile':'accuracy';
let payload:any;
if(mode==='accuracy'){
  const native=[],release=[],adverse=[];
  for(const id of ['patch-45-8-0-3001-1','patch-0-3-0-3001-1']){
    const v=nativeAccountingInput(id),a=observeWorldLedger(v.w,()=>frozenArguments(v.p,v.w,.05/12,12),.05/12);
    const plain=nativeAccountingInput(id);frozenArguments(plain.p,plain.w,.05/12,12);
    const endpoint=(w:any)=>sha(JSON.stringify({bodies:w.bodies,joints:w.joints,report:w.report,time:w.time}));
    assert.equal(endpoint(v.w),endpoint(plain.w));
    native.push({id,checksum:v.checksum,transform:v.transform,duration:.05/12,partitions:12,observerIdentity:true,endpointSha256:endpoint(v.w),...a.accounting});
  }
  const mixed=prepareMixedCase({packetId:'patch-45-8-0-3001-1',normal:.3,offset:true,reverse:false});
  mixed.w.feet=prescribeBoundedSupport(mixed.w.feet);
  const audit=observeWorldLedger(mixed.w,()=>frozenArguments(mixed.p,mixed.w,.05/12,12),.05/12);
  native.push({id:mixed.id,checksum:mixed.checksum,transform:mixed.transform,duration:.05/12,partitions:12,...audit.accounting});
  assert(audit.accounting.normalDose>0&&audit.accounting.tangentDose>0&&Math.abs(audit.accounting.commonMotorCrossWork)>.03);
  for(const a of native)for(const key of ['kineticResidual','bodyLedgerResidual','motorLedgerResidual','passiveLedgerResidual','doseResidual'] as const)
    assert(Math.abs(a[key])<1e-8);
  const dot=(a:{x:number;y:number},n:{x:number;y:number})=>a.x*n.x+a.y*n.y;
  function trial(side:1|-1,zero:boolean,n:number,funded:boolean,H=.000001){
    const v=loadSpanInput(side,zero),{w,p,joint:j,attachment,normal:norm}=v,input={...v.referenceInput,duration:H},
      start={a:structuredClone(j.a.pos),b:structuredClone(j.b.pos),foot:structuredClone(attachment.foot.offset),
        material:structuredClone(attachment.material),span:storedSpan(w,j)},
      a=observeWorldLedger(w,()=>funded?withSpanReserve(w,()=>frozenArguments(p,w,H,n)):frozenArguments(p,w,H,n),H),
      c=Math.cos(j.b.facing),s=Math.sin(j.b.facing),z=attachment.material,ref=radialSpanReference(input,64),fine=radialSpanReference(input,128),
      actual={separation:dot({x:j.b.pos.x-j.a.pos.x,y:j.b.pos.y-j.a.pos.y},norm),
        velocity:dot({x:j.b.vel.x-j.a.vel.x,y:j.b.vel.y-j.a.vel.y},norm),
        material:dot({x:c*z.x-s*z.y,y:s*z.x+c*z.y},norm),footTravel:dot({x:attachment.foot.offset.x-start.foot.x,y:attachment.foot.offset.y-start.foot.y},norm),
        extension:storedSpan(w,j).extension,bodyWork:a.accounting.bodyWork,motorWork:a.accounting.motorWork,
        dose:a.accounting.dose,impulse:-a.accounting.normalDose,moment:a.accounting.moment},
      difference=(x:typeof actual,y:typeof fine)=>Math.max(...(['separation','material','footTravel','extension','impulse','moment'] as const).map(k=>Math.abs(x[k]-y[k])/5e-10),
        Math.abs(x.velocity-y.velocity)/2.5e-8,...(['bodyWork','motorWork','dose'] as const).map(k=>Math.abs(x[k]-y[k])/1e-9)),
      error=difference(actual,fine),convergence=difference(ref, fine),residuals=a.accounting;
    assert(Math.abs(fine.energyResidual)<1e-11&&Math.abs(fine.workResidual)<1e-11&&convergence<=1/16);
    for(const key of ['kineticResidual','bodyLedgerResidual','motorLedgerResidual','passiveLedgerResidual','doseResidual'] as const)
      assert(Math.abs(residuals[key])<1e-8);
    return {id:v.id,checksum:v.checksum,input,transform:v.transform,n,funded,error,convergence,actual,reference:fine,
      accounting:residuals,credits:funded?(a.result as ReturnType<typeof withSpanReserve>).credits:[],returnedState:true};
  }
  for(const side of [1,-1] as const)for(const zero of [false,true]){
    const old=trial(side,zero,8,false),coarse=trial(side,zero,4,true),fine=trial(side,zero,8,true);
    assert(fine.error<=1/16);assert(zero?old.error<=1/16:old.error>10000);
    assert(fine.accounting.maximumCapExcess<=1e-10&&fine.accounting.reelDose===0&&fine.accounting.energyBalance<=1e-11);
    release.push({id:fine.id,input:fine.input,inputSha256:sha(JSON.stringify(fine.input)),checksum:fine.checksum,transform:fine.transform,
      old,coarse,fine});
  }
  // Reuse the already observed 200us failure: compare with unchanged strict
  // tolerances, never turn its visually small velocity error into a pass.
  const long=trial(1,false,128,true,.0002);assert(long.error>1/16);adverse.push({...long,accepted:false,reason:'strict impulse/dose agreement fails at 128 World partitions'});
  payload={native,release,adverse,scope:'Three complete native/transformed World intervals audit achieved work/circle/dose composition, not force correctness. One acquired grip is physically loaded, externally stopped and released for 1us; independent moving-radial spring reference. Zero span/mirror controls. No active/mixed/multiple stored-energy release claim.',
    accuracy:{position:5e-10,velocity:2.5e-8,material:5e-10,foot:5e-10,impulse:5e-10,moment:5e-10,work:1e-9,dose:1e-9,refinedAllowance:1/16},
    remaining:'A finite stored-span reserve diagnoses/funds this radial first event only. It cannot replace joint normal/tangent/span-energy accounting for active/multiple/long World intervals. 200us strict agreement still fails; no native football or production promotion. Nine failures remain 43/52; awareness, keeper and support history separate.'};
}else if(mode==='benchmark'){
  const bench=[];
  for(const zero of [false,true]){
    const names=['world-original8','world-span-reserve8','radial-reference128'],samples:number[][]=[[],[],[]];
    for(let k=0;k<26;k++)for(let j=0;j<3;j++){
      const i=(k+j)%3,v=loadSpanInput(1,zero),start=performance.now();
      if(i===2)radialSpanReference(v.referenceInput,128);
      else if(i===1)withSpanReserve(v.w,()=>frozenArguments(v.p,v.w,.000001,8));
      else frozenArguments(v.p,v.w,.000001,8);
      const elapsed=performance.now()-start;if(k>=5)samples[i].push(elapsed);
    }
    for(let i=0;i<3;i++){const t=samples[i].slice().sort((a,b)=>a-b);bench.push({id:zero?'zero-span':'stored-span',mode:names[i],duration:.000001,partitions:i===2?128:8,
      samples:samples[i],milliseconds:{median:t[10],p95:t[19],maximum:t[20]},accuracy:i===0&&!zero?'known wrong restoring force':'validated narrow witness'});}
  }
  payload={bench,protocol:{serial:true,warmups:5,repetitions:21,rotatingOrder:true,profilersOrLedgerObservers:false,preparationOutsideClock:true,
    originalComparison:'Original restoring force is wrong on stored span; its speed does not imply acceptance',boundedFallbackWorstCase:'Not implemented/measured; global World budget unproved'}};
}else{
  const inputs=Array.from({length:400},()=>loadSpanInput(1));
  const session=new Session();session.connect();await session.post('Profiler.enable');await session.post('Profiler.setSamplingInterval',{interval:500});
  await session.post('Profiler.start');
  for(const v of inputs)withSpanReserve(v.w,()=>frozenArguments(v.p,v.w,.000001,8));
  const {profile}=await session.post('Profiler.stop');session.disconnect();
  const path=`${root}/span-release.cpuprofile`;writeFileSync(path,JSON.stringify(profile));
  const nodes=new Map(profile.nodes.map(n=>[n.id,n])),counts=new Map<number,number>();for(const id of profile.samples??[])counts.set(id,(counts.get(id)??0)+1);
  const total=profile.samples?.length??0,hot=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,15).map(([id,count])=>({count,fraction:count/total,
    function:nodes.get(id)?.callFrame.functionName,file:nodes.get(id)?.callFrame.url,line:(nodes.get(id)?.callFrame.lineNumber??0)+1}));
  payload={profile:{path,sha256:sha(readFileSync(path)),samples:total,hot,operators:inputs.length,preparationExcluded:true},
    decision:'Profile the corrected, narrow World release only. No optimization of a mixed/active law with unresolved stored-energy accounting; no faster whole-World claim.'};
}
assert.equal(sourceVersion(),source);for(const p of files)assert.equal(sha(readFileSync(p)),hashes[p]);
writeFileSync(output,JSON.stringify({...metadata,mode,...payload},null,2)+'\n');
console.log(JSON.stringify({output,mode,native:payload.native?.map((r:any)=>({id:r.id,normal:r.normalDose,tangent:r.tangentDose,cross:r.commonMotorCrossWork,kinetic:r.kineticResidual})),
  release:payload.release?.map((r:any)=>({id:r.id,oldError:r.old.error,error:r.fine.error,convergence:r.fine.convergence})),
  adverse:payload.adverse?.map((r:any)=>({id:r.id,error:r.error,reason:r.reason})),bench:payload.bench?.map((r:any)=>({id:r.id,mode:r.mode,...r.milliseconds})),profile:payload.profile}));
