/** Complete experimental World boundary and a small three-arm native panel.
 * Cost collection is separate, serial, uninstrumented, with preparation out.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {cpus} from 'node:os';
import {sourceVersion} from '../../source-version.js';
import {sha} from './grip-bounded-fixtures.js';
import {passiveWorldFixture,passiveWorldInputs} from './grip-passive-world-fixtures.js';
import {spanKernelInterval} from './grip-span-kernel-interval.js';
import {spanEventReference} from './grip-span-event-reference.js';
import {mixedSpanDifference} from './grip-mixed-span-model.js';
import {rep} from '../tackle/panel.js';
import type {PassiveGripInput,PassiveGripResult} from '../../../src/physics/passive-grip.js';
const root='out/grip-passive-world';mkdirSync(root,{recursive:true});
const source=sourceVersion(),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null])),
  files=['src/physics/world.ts','src/physics/passive-grip.ts','scripts/diag/tackle/panel.ts',
    'scripts/diag/physics/grip-span-kernel-trial.ts','scripts/diag/physics/grip-span-kernel-model.ts','scripts/diag/physics/grip-span-kernel-interval.ts',
    'scripts/diag/physics/grip-span-event-force.ts','scripts/diag/physics/grip-mixed-span-model.ts','scripts/diag/physics/grip-span-event-reference.ts',
    'scripts/diag/physics/grip-passive-world-fixtures.ts','scripts/diag/physics/grip-passive-world-evidence.ts','config/grip-passive-world-inputs.json','test/grip-passive-world.test.ts'],
  hashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(p))])),mode=process.argv.includes('--benchmark')?'benchmark':'accuracy',
  output=process.argv.find(x=>x.startsWith('--output='))?.slice(9)??`${root}/evidence.json`,H=.05/12;
const parent='938810c40554a42add66600e770ffad0e6b0d8da',prior=JSON.parse(readFileSync('data/reviews/current/grip-span-events.json','utf8'));
assert.deepEqual(flags,prior.flags);
for(const p of ['src/physics/support.ts','src/physics/kinematics.ts','src/physics/virtual-foot.ts','src/physics/bounded-attachment.ts','src/physics/grip-timing.ts','config/baseline.json'])
  assert.equal(sha(readFileSync(p)),sha(execFileSync('git',['show',`${parent}:${p}`])));
const meta={commit,source,flags,hashes,node:process.version,cpu:cpus()[0].model,timestamp:new Date().toISOString(),baseline:prior.baseline,
  options:{host:{handContact:'patch',gripTiming:'midpoint',materialTransport:'owned'},candidate:'passiveGrip:spanKernelInterval',
    production:{materialTransport:'legacy behavior (option absent)',passiveGrip:'absent'},supportedWorldSubsteps:1,duration:H},
  physicalGates:prior.protocol.accuracy,refinementAllowance:1/16,costBudgetMilliseconds:{median:2,p95:5,refusal:10}};
const state=(a:ReturnType<typeof passiveWorldFixture>)=>({bodies:a.bodies,material:a.material(),force:a.j.force,hold:a.j.hold,legs:a.j.legs,slipping:a.j.slipping,broken:a.j.broken});
let payload:unknown;
if(mode==='accuracy'){
  const mechanical=[],raw=[];
  for(const c of passiveWorldInputs()){
    let input:PassiveGripInput|undefined,motion:ReturnType<typeof spanKernelInterval>|undefined;
    const a=passiveWorldFixture(c.id,'owned',q=>{input=q;motion=spanKernelInterval(q);return motion;}),r=a.w.step(a.intents,H);
    if(r.passiveGrip!.accepted){
      assert(input&&motion);const lo=spanEventReference(input,2048),hi=spanEventReference(input,4096),
        error=mixedSpanDifference(motion,hi),convergence=mixedSpanDifference(lo,hi);assert(error<=1/16&&convergence<=1/16);
      const reference=passiveWorldFixture(c.id,'owned',q=>spanEventReference(q,4096)),rr=reference.w.step(reference.intents,H);
      assert.equal(rr.passiveGrip!.accepted,1);
      const supportError=Math.max(...a.bodies.slice(0,2).map((b,i)=>Math.hypot(b.support!.xi.x-reference.bodies[i].support!.xi.x,b.support!.xi.y-reference.bodies[i].support!.xi.y)));
      assert(supportError<=5e-10/16);assert.equal(r.work.grasps,motion.bodyWork);assert.equal(r.supportMotorWork[1],motion.motorWork);
      assert(Math.abs(a.j.force!*H-motion.dose)<1e-12);assert(Math.abs(r.work.residual)<1e-8);
      mechanical.push({id:c.id,inputSha256:sha(JSON.stringify(input)),accepted:1,error,convergence,supportError,
        energyError:Math.max(...a.bodies.slice(0,2).map((b,i)=>Math.abs(b.energy-reference.bodies[i].energy))),
        dose:motion.dose,events:motion.events,bodyWork:motion.bodyWork,motorWork:motion.motorWork,energyResidual:motion.energyResidual,worldWorkResidual:r.work.residual});
      raw.push({id:c.id,input,motion,lo,hi,state:state(a),report:r,referenceState:state(reference),referenceReport:rr});
    }else{
      const base=passiveWorldFixture(c.id,'owned'),rr=base.w.step(base.intents,H);assert.deepEqual(state(a),state(base));
      const {passiveGrip,...rest}=r;assert.deepEqual(rest,rr);mechanical.push({id:c.id,accepted:0,reason:r.passiveGrip!.reasons,exactFallback:true});
      raw.push({id:c.id,state:state(a),report:r});
    }
  }
  const manifest=JSON.parse(readFileSync('out/grip-timing/baseline.json','utf8')),native=[];
  const ids=['patch-0-3-0-3001-1','patch-45-8-0-3001-1','patch-45-8-0-3001--1','patch-45-8-0-4001-1'];
  for(const id of ids){const input=manifest.inputs.find((i:any)=>i.id===id);assert(input);const arms=[];
    for(const mode of ['legacy','owned','combined']){
      const calls={accepted:0,fallbacks:0,reasons:{} as Record<string,number>},start=performance.now(),result=rep(input.cell,input.side,input.seed,
        {handContact:'patch',substeps:96,configureWorld:w=>{if(mode!=='legacy')(w as any).materialTransport='owned';
          if(mode==='combined')(w as any).passiveGrip=spanKernelInterval;
          const step=w.step;w.step=function(...args:Parameters<typeof step>){const r=step.apply(this,args),p=r.passiveGrip;
            if(p){calls.accepted+=p.accepted;calls.fallbacks+=p.fallbacks;for(const [k,v] of Object.entries(p.reasons))calls.reasons[k]=(calls.reasons[k]??0)+v;}
            return r;};}});
      arms.push({mode,result,calls,seconds:(performance.now()-start)/1000});
    }
    assert.deepEqual(arms[1].result,arms[2].result);assert.equal(arms[2].calls.accepted,0);
    const preserved=manifest.native.find((r:any)=>r.id===id&&r.n===96&&r.timing==='midpoint').result;
    assert.deepEqual(arms[0].result,preserved);
    native.push({id,input,arms,legacyExactSaved:true,candidateExactOwned:true,
      verdict:arms[0].result.ending===arms[1].result.ending?'ending retained; inspect any trajectory difference as ownership-only':'ownership changes ending; no kernel invocation, retain adverse/changed outcome'});
  }
  const path=`${root}/world-raw.json`;writeFileSync(path,JSON.stringify(raw)+'\n');
  payload={mechanical,native,raw:{path,sha256:sha(readFileSync(path))},nativeManifest:{path:'out/grip-timing/baseline.json',sha256:sha(readFileSync('out/grip-timing/baseline.json'))},
    decision:'World mechanics/support/effort pass on supported passive scope. Native panel remains outside scope (active reel/drive); exact corrected-host fallback is evidence of safety, not football benefit. Ownership correction is separately default-off; retain every adverse/changed/censored ending.'};
}else{
  const bench=[],samples=[];
  for(const c of passiveWorldInputs()){
    const methods=['legacy','owned','kernel','reference4096'],times:number[][]=methods.map(()=>[]),accepts:number[][]=methods.map(()=>[]);
    for(let k=0;k<26;k++)for(let j=0;j<methods.length;j++){
      const i=(k+j)%methods.length,a=passiveWorldFixture(c.id,i===0?'legacy':'owned',i===2?spanKernelInterval:i===3?q=>spanEventReference(q,4096):undefined),t=performance.now();
      const r=a.w.step(a.intents,H),elapsed=performance.now()-t;if(k>=5){times[i].push(elapsed);accepts[i].push(r.passiveGrip?.accepted??0);}
    }
    for(let i=0;i<methods.length;i++){
      const t=times[i].slice().sort((a,b)=>a-b),milliseconds={median:t[10],p95:t[19],maximum:t[20]};
      bench.push({id:c.id,method:methods[i],milliseconds,acceptedCalls:accepts[i].reduce((a,b)=>a+b,0),
        passesBudget:i===2?milliseconds.median<=2&&milliseconds.p95<=5:null});samples.push({id:c.id,method:methods[i],times:times[i],accepts:accepts[i]});
    }
  }
  const path=output.replace(/\.json$/,'.samples.json');writeFileSync(path,JSON.stringify(samples)+'\n');
  payload={bench,raw:{path,sha256:sha(readFileSync(path))},protocol:{serial:true,warmups:5,repetitions:21,rotatingOrder:true,preparationOutsideClock:true,
    profilersOrObservers:false,allWorldInputsIncludingRefusedFresh:true},costPass:bench.filter(r=>r.method==='kernel').every(r=>r.passesBudget)};
}
assert.equal(sourceVersion(),source);for(const [p,h] of Object.entries(hashes))assert.equal(sha(readFileSync(p)),h);
writeFileSync(output,JSON.stringify({...meta,mode,...payload as object},null,2)+'\n');console.log(JSON.stringify({output,mode,...payload as object}));
