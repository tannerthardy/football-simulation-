/** Bounded native scope evidence. Serial uninstrumented clocks are separate
 * from references and football diagnostics; preparation is outside timing. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {cpus} from 'node:os';
import {sourceVersion} from '../../source-version.js';
import {sha} from './grip-bounded-fixtures.js';
import {nativeForceFixture} from './grip-native-world-fixtures.js';
import {nativeSpanInterval} from './grip-native-span-interval.js';
import {nativeSpanReference} from './grip-native-span-reference.js';
import {nativeSpanDifference} from './grip-native-span-model.js';
import {rep} from '../tackle/panel.js';
import type {ActiveGripInput} from '../../../src/physics/active-grip.js';
const root='out/grip-native-forces';mkdirSync(root,{recursive:true});
const source=sourceVersion(),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  manifest=JSON.parse(readFileSync('config/grip-native-force-inputs.json','utf8')),cases=manifest.cases as Array<{id:string;phase:number;input:ActiveGripInput}>,
  profile=JSON.parse(readFileSync('config/baseline.json','utf8')),flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),
  mode=process.argv.includes('--benchmark')?'benchmark':'accuracy',output=process.argv.find(x=>x.startsWith('--output='))?.slice(9)??`${root}/evidence.json`,
  files=['src/physics/world.ts','src/physics/active-grip.ts','scripts/diag/physics/grip-native-span-model.ts','scripts/diag/physics/grip-native-span-interval.ts',
    'scripts/diag/physics/grip-native-span-reference.ts','scripts/diag/physics/grip-native-world-fixtures.ts','scripts/diag/physics/grip-native-forces-evidence.ts',
    'config/grip-native-force-inputs.json','test/grip-native-forces.test.ts','test/grip-timing-reference.test.ts','test/grip-passive-world.test.ts'],
  hashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))]));
assert.deepEqual(flags,profile.flags);
for(const p of ['src/physics/support.ts','src/physics/kinematics.ts','src/physics/virtual-foot.ts','src/physics/bounded-attachment.ts','src/physics/grip-timing.ts','src/physics/grip-fast.ts','config/baseline.json'])
  assert.equal(sha(readFileSync(p)),sha(execFileSync('git',['show',`${manifest.parent}:${p}`])));
const meta={commit,source,flags,hashes,node:process.version,cpu:cpus()[0].model,timestamp:new Date().toISOString(),baseline:manifest.baseline,parent:manifest.parent,
  manifest:{path:'config/grip-native-force-inputs.json',sha256:sha(readFileSync('config/grip-native-force-inputs.json'))},
  nativeManifest:{path:'out/grip-timing/baseline.json',sha256:sha(readFileSync('out/grip-timing/baseline.json'))},
  settings:{handContact:'patch',gripTiming:'midpoint',constraintWork:'per-solve',materialTransport:'owned ONLY in owned/combined',nativeSubsteps:96},
  accuracy:{coordinateTolerances:'Unchanged passive tolerances, 1e-9 for added ledgers',normalizedAllowance:1/16,work:1e-8,span:1e-9,energy:1e-8,angular:1e-7},costBudgetMilliseconds:{median:2,p95:5}};
let payload:any;
const state=(v:ReturnType<typeof nativeForceFixture>)=>({bodies:v.w.bodies,point:v.w.graspPoint(v.joint),joint:{...v.joint,a:undefined,b:undefined},attachment:v.w.attachments.get(v.joint)});
if(mode==='accuracy'){
  const mechanical=[],raw=[],continuation=[];
  for(const c of cases){
    let input:ActiveGripInput|undefined,motion:ReturnType<typeof nativeSpanInterval>|undefined;
    const a=nativeForceFixture(c.id,c.phase,'combined',q=>{input=q;return motion=nativeSpanInterval(q);}),r=a.advance();
    assert.deepEqual(input,c.input);assert.equal(r.activeGrip.accepted,1);
    const lo=nativeSpanReference(input!,1024),hi=nativeSpanReference(input!,2048),error=nativeSpanDifference(motion!,hi),convergence=nativeSpanDifference(lo,hi);
    assert(error<=1/16&&convergence<=1/16);
    mechanical.push({id:c.id,phase:c.phase,duration:input!.duration,accepted:1,error,referenceConvergence:convergence,reelDose:motion!.reelDose,
      armCost:motion!.armCost,groundForce:input!.ground.map(g=>g.force),maximumCapacityRatio:motion!.maximumCapacityRatio,
      workResidual:motion!.workResidual,energyResidual:motion!.energyResidual,angularResidual:motion!.angularResidual,partitions:motion!.partitions,evaluations:motion!.evaluations});
    raw.push({id:c.id,input,motion,lo,hi,state:state(a),report:r});
    const arms=[];
    for(const mode of ['legacy','owned','combined'] as const){const v=nativeForceFixture(c.id,c.phase,mode,mode==='combined'?nativeSpanInterval:undefined);
      const before=structuredClone(state(v)),r=v.advance(96-c.phase);
      arms.push({mode,before,end:structuredClone(state(v)),audit:r.activeGrip??null,graspWork:r.work.grasps,
        armWork:r.armWork[v.w.indexOf(v.joint.a)],footWork:r.supportMotorWork[v.w.indexOf(v.joint.b)],time:v.w.time});}
    assert.deepEqual(arms[0].before,arms[1].before);assert.deepEqual(arms[1].before,arms[2].before);
    raw.push({id:c.id,continuation:arms});
    const b=arms[1].end.bodies,cand=arms[2].end.bodies,idx=a.w.indexOf(a.joint.b);
    continuation.push({id:c.id,intervals:96-c.phase,arms:arms.map(v=>({mode:v.mode,audit:v.audit,armWork:v.armWork,footWork:v.footWork,time:v.time,
      holder:v.end.bodies[a.w.indexOf(a.joint.a)].support.state,runner:v.end.bodies[idx].support.state,broken:v.end.joint.broken??false,slipping:v.end.joint.slipping??false})),
      runnerPositionDifference:Math.hypot(cand[idx].pos.x-b[idx].pos.x,cand[idx].pos.y-b[idx].pos.y)});
  }
  const native=[],saved=JSON.parse(readFileSync('out/grip-timing/baseline.json','utf8'));
  for(const c of cases){const input=saved.inputs.find((i:any)=>i.id===c.id);assert(input);const arms=[];
    for(const mode of ['legacy','owned','combined']){const calls={accepted:0,fallbacks:0,reasons:{} as Record<string,number>},start=performance.now(),
      result=rep(input.cell,input.side,input.seed,{handContact:'patch',substeps:96,configureWorld:w=>{
        if(mode!=='legacy')(w as any).materialTransport='owned';if(mode==='combined')(w as any).activeGrip=nativeSpanInterval;
        const step=w.step;w.step=function(...args:Parameters<typeof step>){const r=step.apply(this,args),p=r.activeGrip;
          if(p){calls.accepted+=p.accepted;calls.fallbacks+=p.fallbacks;for(const[k,v]of Object.entries(p.reasons))calls.reasons[k]=(calls.reasons[k]??0)+v;}return r;};}});
      arms.push({mode,result,calls,seconds:(performance.now()-start)/1000});}
    assert.deepEqual(arms[0].result,saved.native.find((v:any)=>v.id===c.id&&v.n===96&&v.timing==='midpoint').result);
    native.push({id:c.id,input,arms,legacyExactSaved:true,interpretation:'Trajectory/ending differences are observations, not automatic football gains or losses.'});
  }
  const path=`${root}/active-world-raw.json`;writeFileSync(path,JSON.stringify(raw));
  payload={mechanical,continuation,native,raw:{path,sha256:sha(readFileSync(path))},
    verdict:'Native reel/ground intervals now invoke the solver. Below-slip accuracy is distinct from continuation/football outcomes. Default-off; cap/slip, impact, active recovery and multiple contacts retain native fallback.'};
}else{
  const records:Array<{case:string;mode:string;repeat:number;milliseconds:number}>=[],specs=cases.flatMap(c=>['owned','combined'].map(mode=>({c,mode}))),
    warm=5,repeats=21;
  for(let k=0;k<warm+repeats;k++)for(let z=0;z<specs.length;z++){
    const {c,mode}=specs[(z+k)%specs.length],v=nativeForceFixture(c.id,c.phase,mode as 'owned'|'combined',mode==='combined'?nativeSpanInterval:undefined),
      start=performance.now();v.advance();const elapsed=performance.now()-start;
    if(k>=warm)records.push({case:c.id,mode,repeat:k-warm,milliseconds:elapsed});
  }
  const rows=specs.map(({c,mode})=>{const a=records.filter(r=>r.case===c.id&&r.mode===mode).map(r=>r.milliseconds).sort((a,b)=>a-b),
    median=a[Math.floor(a.length*.5)],p95=a[Math.floor(a.length*.95)],maximum=a.at(-1)!;
    return {case:c.id,mode,median,p95,maximum,pass:median<=2&&p95<=5};});
  const path=output.replace(/\.json$/,'.samples.json');writeFileSync(path,JSON.stringify(records));
  payload={warm,repeats,serial:true,uninstrumented:true,preparationOutsideClock:true,rows,samples:{path,sha256:sha(readFileSync(path))},
    verdict:'Cost for one native .520833ms interval, not game-wide cost or a worst-case wall-clock bound.'};
}
if(sourceVersion()!==source||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==commit)throw Error('Revision changed during evidence');
writeFileSync(output,JSON.stringify({meta,...payload},null,2)+'\n');console.log(JSON.stringify({output,...payload},null,2));
