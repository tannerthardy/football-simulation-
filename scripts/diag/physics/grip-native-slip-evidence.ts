/** Focused transition evidence. Accuracy/refinement and uninstrumented clocks
 * run in separate serial processes; immutable native inputs are reused. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {cpus} from 'node:os';
import {sourceVersion} from '../../source-version.js';
import {sha} from './grip-bounded-fixtures.js';
import {nativeForceFixture} from './grip-native-world-fixtures.js';
import {nativeAccountingInput} from './grip-world-accounting-inputs.js';
import {nativeSpanInterval} from './grip-native-span-interval.js';
import {nativeSpanDifference} from './grip-native-span-model.js';
import {nativeSlipInterval,nativeSlipReference,nativeSlipDifference,nativeTransitionInterval} from './grip-native-slip.js';
import type {ActiveGripInput,ActiveGripSolver} from '../../../src/physics/active-grip.js';
const root='out/grip-native-slip';mkdirSync(root,{recursive:true});
const output=process.argv.find(x=>x.startsWith('--output='))?.slice(9)??`${root}/evidence.json`,benchmark=process.argv.includes('--benchmark'),fullHost=process.argv.includes('--full-host'),
  source=sourceVersion(),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
  flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),files=['src/physics/world.ts','src/physics/active-grip.ts',
    'scripts/diag/physics/grip-native-span-model.ts','scripts/diag/physics/grip-span-kernel-trial.ts','scripts/diag/physics/grip-native-slip.ts',
    'scripts/diag/physics/grip-native-reel-reference.ts','scripts/diag/physics/grip-native-slip-evidence.ts','test/grip-native-slip.test.ts',
    'config/grip-native-world-packets.json','config/grip-native-force-inputs.json'],hashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))]));
assert.deepEqual(flags,profile.flags);
for(const p of ['src/physics/support.ts','src/physics/kinematics.ts','src/physics/virtual-foot.ts','src/physics/bounded-attachment.ts','src/physics/grip-timing.ts','src/physics/grip-fast.ts','config/baseline.json'])
  assert.equal(sha(readFileSync(p)),sha(execFileSync('git',['show',`d19656d:${p}`])));
const specs=[{name:'acquired-cap',id:'patch-45-8-0-3001-1',phase:0,prepare:0},{name:'native-transition',id:'patch-45-8-0-3001-1',phase:0,prepare:4},
  {name:'below-slip',id:'patch-45-8-0-3001-1',phase:16,prepare:0},{name:'frontal-control',id:'patch-0-3-0-3001-1',phase:0,prepare:0},
  {name:'fresh-angle',id:'patch-45-8-0-4001-1',phase:16,prepare:0},
  {name:'reel-onset',id:'patch-45-8-0-3001-1',phase:0,prepare:9}];
type Spec=typeof specs[number];
function prepared(c:Spec,solver?:ActiveGripSolver){
  const v=fullHost?nativeAccountingInput(c.id):nativeForceFixture(c.id,c.phase,'owned'),w=v.w,H=v.p.args[3],base=fullHost?c.phase:0;
  w.materialTransport='owned';delete w.activeGrip;
  const advance=(k:number)=>{const a=[...v.p.args];a[4]-=k*H;w.integrateSubstep(...a);};
  for(let k=0;k<base;k++)advance(k);
  w.activeGrip=nativeTransitionInterval;for(let k=0;k<c.prepare;k++)advance(base+k);
  if(solver)w.activeGrip=solver;else delete w.activeGrip;
  return {w,H,advance:()=>advance(base+c.prepare),checksum:v.checksum};
}
const meta={commit,source,hashes,node:process.version,cpu:cpus()[0].model,timestamp:new Date().toISOString(),flags,
  baseline:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',parent:'d19656db4964559dd7952c23ccd3388cc0e6058c',
  inputs:{path:'config/grip-native-world-packets.json',sha256:sha(readFileSync('config/grip-native-world-packets.json'))},
  settings:{handContact:'patch',gripTiming:'midpoint',constraintWork:'per-solve',materialTransport:'owned',nativeSubsteps:96},
  accuracy:{normalizedAllowance:1/16,share:1e-9,eventTime:1e-12,heightImpulse:1e-9,ledger:1e-9,work:1e-8,angular:1e-7},
  costBudgetMilliseconds:{median:2,p95:5},fullHost,host:fullHost?'original saved 22-body World, two-body contact group':'equivalent portable two-body World'};
let result:any;
if(!benchmark){
  const raw:any[]=[],continuation=[];
  let initial!:ActiveGripInput;nativeForceFixture(specs[0].id,0,'combined',q=>{initial=q;return undefined;}).advance();
  const q={...initial,duration:.05/12},candidate=nativeSlipInterval(q),lo=nativeSlipReference(q,2048),hi=nativeSlipReference(q,4096),
    mechanical={duration:q.duration,accuracy:nativeSlipDifference(candidate,hi),referenceConvergence:nativeSlipDifference(lo,hi),events:candidate.events,
      evaluations:candidate.evaluations,workResidual:candidate.workResidual,energyResidual:candidate.energyResidual,angularResidual:candidate.angularResidual,maximumCapacityRatio:candidate.maximumCapacityRatio};
  assert(mechanical.accuracy<=1/16&&mechanical.referenceConvergence<=1/16);raw.push({q,candidate,lo,hi});
  for(const c of [specs[0],specs[3],specs[4]]){
    const variants:Array<{n:number;trace:Array<{input:ActiveGripInput;result:ReturnType<typeof nativeTransitionInterval>}>;bodies:any[];joint:any;material:{x:number;y:number};report:any}>=[];
    for(const n of [0,1024,2048]){
      const trace:any[]=[],v=nativeForceFixture(c.id,c.phase,'combined',q=>{const r=nativeTransitionInterval(q,n||undefined,true);trace.push({input:q,result:r});return r;});
      v.advance(16);assert.equal(v.w.report.activeGrip.accepted,16);assert.equal(v.w.report.activeGrip.fallbacks,0);
      variants.push({n,trace,bodies:structuredClone(v.w.bodies),joint:{...v.joint,a:undefined,b:undefined},material:{...v.w.attachments.get(v.joint).material},report:v.w.report});
    }
    const difference=(a:typeof variants[number],b:typeof variants[number])=>({
      position:Math.max(...a.bodies.map((p:any,i:number)=>Math.hypot(p.pos.x-b.bodies[i].pos.x,p.pos.y-b.bodies[i].pos.y))),
      support:Math.max(...a.bodies.map((p:any,i:number)=>Math.hypot(p.support.xi.x-b.bodies[i].support.xi.x,p.support.xi.y-b.bodies[i].support.xi.y))),
      facing:Math.max(...a.bodies.map((p:any,i:number)=>Math.abs(p.facing-b.bodies[i].facing))),
      material:Math.hypot(a.material.x-b.material.x,a.material.y-b.material.y),
      bodyWork:Math.abs(a.report.work.grasps-b.report.work.grasps),armWork:Math.abs(a.report.armWork[1]-b.report.armWork[1]),
      motorWork:Math.max(...a.report.supportMotorWork.map((v:number,i:number)=>Math.abs(v-b.report.supportMotorWork[i]))),legs:Math.abs(a.joint.legs-b.joint.legs),
      worstInterval:Math.max(...a.trace.map((v:any,i:number)=>{const other=b.trace[i].result;
        return v.result.tangentSlip&&'tangentSlip' in other?nativeSlipDifference(v.result,other):nativeSpanDifference(v.result,other);}))});
    const accuracy=difference(variants[0],variants[2]),referenceConvergence=difference(variants[1],variants[2]);
    for(const d of [accuracy,referenceConvergence])assert(d.worstInterval<=1/16&&d.bodyWork<=1e-9/16&&d.armWork<=1e-9/16&&d.support<=5e-10/16&&d.position<=5e-10/16);
    const alternatives=[];
    for(const mode of ['owned','old-callback','transition']){const v=nativeForceFixture(c.id,c.phase,'owned');
      if(mode!=='owned')v.w.activeGrip=mode==='old-callback'?nativeSpanInterval:nativeTransitionInterval;
      v.advance(16);alternatives.push({mode,position:{...v.joint.b.pos},facing:v.joint.b.facing,legs:v.joint.legs,slipping:v.joint.slipping,bodyWork:v.w.report.work.grasps,audit:v.w.report.activeGrip??null});}
    const events=variants[0].trace.flatMap((v,i)=>(v.result.events??[]).map((e:any)=>({...e,timeAfterAcquisition:i*.05/96+e.time}))),
      referenceReelEvents=variants[2].trace.flatMap((v,i)=>(v.result.events??[]).filter((e:any)=>e.kind==='reel').map((e:any)=>({...e,timeAfterAcquisition:i*.05/96+e.time})));
    continuation.push({case:c.name,id:c.id,phase:c.phase,intervals:16,physicalTime:16*.05/96,accuracy,referenceConvergence,events,referenceReelEvents,alternatives});
    raw.push({case:c.name,variants});
  }
  const path=output.replace(/\.json$/,'.raw.json');writeFileSync(path,JSON.stringify(raw));
  result={mechanical,continuation,raw:{path,sha256:sha(readFileSync(path))}};
}else{
  const samples:any[]=[],modes=['owned','old-callback','transition'] as const,items=specs.flatMap(c=>modes.map(mode=>({c,mode}))),warm=11,repeats=101;
  for(let k=0;k<warm+repeats;k++)for(let z=0;z<items.length;z++){
    const {c,mode}=items[(z+k)%items.length],v=prepared(c,mode==='owned'?undefined:mode==='old-callback'?nativeSpanInterval:nativeTransitionInterval),
      t=performance.now();v.advance();const milliseconds=performance.now()-t;
    if(k>=warm)samples.push({case:c.name,mode,repeat:k-warm,milliseconds,accepted:v.w.report.activeGrip?.accepted??null});
  }
  const rows=items.map(({c,mode})=>{const s=samples.filter(r=>r.case===c.name&&r.mode===mode).map(r=>r.milliseconds).sort((a,b)=>a-b),
    median=s[Math.floor(s.length*.5)],p95=s[Math.floor(s.length*.95)],p99=s[Math.floor(s.length*.99)],maximum=s.at(-1)!;
    return {case:c.name,mode,median,p95,p99,maximum,pass:median<=2&&p95<=5};});
  const path=output.replace(/\.json$/,'.samples.json');writeFileSync(path,JSON.stringify(samples));
  result={warm,repeats,serial:true,uninstrumented:true,preparationOutsideClock:true,interval:.05/96,rows,samples:{path,sha256:sha(readFileSync(path))}};
}
assert.equal(sourceVersion(),source);assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);
for(const p of files)assert.equal(sha(readFileSync(p)),hashes[p]);
writeFileSync(output,JSON.stringify({meta,...result},null,2)+'\n');console.log(JSON.stringify({output,...result},null,2));
