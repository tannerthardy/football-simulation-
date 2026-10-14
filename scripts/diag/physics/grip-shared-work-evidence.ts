/** Force-accounting proof and short moving controls. Accuracy only: no native
 * football claim, no timing measurement of the instrumented moving witness. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {World} from '../../../src/physics/world.js';
import {sourceVersion} from '../../source-version.js';
import {prepareSharedCase,prescribeSharedSupport} from './grip-shared-fixtures.js';
import {sharedGripForce} from './grip-shared-law.js';
import {tangentBoxReference} from './grip-shared-work-reference.js';
import {sharedWorkInput,sharedWorkFrames} from './grip-shared-work-scene.js';
import {sharedWorkMotion} from './grip-shared-work-motion.js';
const root='out/grip-shared';mkdirSync(root,{recursive:true});
const hash=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex'),
  commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source=sourceVersion(),
  parent='c61e8d56b57a24a3dcc52ba6ca5f4d22fcad2254',baseline='4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
  base=JSON.parse(readFileSync('config/grip-shared-reference.json','utf8')),fresh=JSON.parse(readFileSync('config/grip-shared-fresh-reference.json','utf8')),
  cases=[...base.cases,...fresh.cases],flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null])),
  files=['scripts/diag/physics/grip-shared-law.ts','scripts/diag/physics/grip-shared-work-scene.ts','scripts/diag/physics/grip-shared-work-reference.ts',
    'scripts/diag/physics/grip-shared-work-motion.ts','scripts/diag/physics/grip-shared-work-evidence.ts','test/grip-shared-work.test.ts',
    'scripts/diag/physics/grip-force-shared.ts','scripts/diag/physics/grip-shared-explicit.ts','scripts/diag/physics/grip-shared-evidence.ts','test/grip-shared.test.ts',
    'config/grip-shared-reference.json','config/grip-shared-fresh-reference.json','scripts/diag/physics/grip-pressure-rate.ts','package-lock.json'],
  hashes=Object.fromEntries(files.map(p=>[p,hash(readFileSync(p))]));
assert.equal(source,'f0879d091645ec5c5fb84c8fd163da006fe3c9cdcae71bf95d87d2da62829e12');
for(const f of [base,fresh]){assert.equal(f.source,source);assert.deepEqual(f.flags,flags);}
for(const p of ['src/physics/world.ts','src/physics/grip-sliding.ts','scripts/diag/physics/grip-pressure-rate.ts','config/baseline.json','package-lock.json'])
  assert.equal(hash(readFileSync(p)),hash(execFileSync('git',['show',`${parent}:${p}`])));
const frozen:any[]=[];
for(const c of cases.filter(c=>c.input.grips.length===2)){
  const input=sharedWorkInput(c.input),frames=sharedWorkFrames(input),rows:any[]=[];
  for(const reverse of [false,true]){
    const g=reverse?[...frames].reverse():frames,reference=tangentBoxReference(g,input.mobility);
    for(const [mode,iterations] of [['channel',8],['channel',256],['coupled',256]] as const){
      const r=sharedGripForce(g,input.mobility,mode,iterations),forces=r.rows.map((v,k)=>({holder:g[k].holder,normal:v.normal,tangent:v.tangent,
        slip:g[k].vt+(-g[k].xx*g[k].ny+g[k].xy*g[k].nx)*r.velocity.x+(-g[k].xy*g[k].ny+g[k].yy*g[k].nx)*r.velocity.y,
        capacity:g[k].capacity})),error=Math.max(...forces.map((f,k)=>Math.abs(f.tangent-reference.force[k])));
      if(mode==='coupled'){assert(error<1e-9);assert(r.targetResidual<=1e-10);assert(r.passivePower<=1e-8);assert(r.graphFraction===1);}
      rows.push({reverse,mode,iterations,passes:r.passes,forces,reference:reference.force,error,targetResidual:r.targetResidual,
        graphFraction:r.graphFraction,passivePower:r.passivePower,motorPower:r.motorPower,load:r.load});
    }
  }
  frozen.push({id:c.id,originalInputSha256:hash(JSON.stringify(c.input)),mobility:input.mobility,
    frames:frames.map(g=>Object.fromEntries(['holder','nx','ny','vn','vt','xx','xy','yy','capacity','inverseMass','normalBias'].map(k=>[k,(g as any)[k]]))),rows});
}
// Confirm that the frozen defect belongs to the actual World law, not merely
// this extracted force function. Shrinking finite steps converge to each of
// its two different row-order limits. Never replace a production method.
const worldAudit:any[]=[],prototype:any=World.prototype,feet=prototype.feet;
try{
  prototype.feet=prescribeSharedSupport(feet);
  for(const reverse of [false,true])for(const h of [1e-6,1e-7,1e-8]){
    const v=prepareSharedCase(),w=v.w,input=sharedWorkInput(v.input);
    w.joints.forEach((j:any,k:number)=>{j.hold=input.grips[k].hold;});if(reverse)w.joints.reverse();
    const rowFn=w.jointRows;let rows:any[]=[];w.jointRows=function(h:number){rows=rowFn.call(this,h);return rows;};
    const args=[...v.args];args[3]=h;w.integrateInterval(...args);
    const frames=sharedWorkFrames(input);if(reverse)frames.reverse();const field=sharedGripForce(frames,input.mobility),
      result=rows.map((r,k)=>({holder:r.i,normal:r.ln/h,tangent:r.lt/h,limit:field.rows[k].tangent})),
      error=Math.max(...result.map((r,k)=>Math.hypot(r.normal-field.rows[k].normal,r.tangent-r.limit)));
    assert.equal(rows.length,2);assert(result.every(r=>r.normal===0&&Math.abs(r.tangent)<=500));
    worldAudit.push({reverse,h,result,error});
  }
}finally{prototype.feet=feet;}
for(const reverse of [false,true]){
  const r=worldAudit.filter(r=>r.reverse===reverse);for(let k=1;k<r.length;k++)assert(r[k].error<r[k-1].error*.2);
}
const norm=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y);
function compare(a:ReturnType<typeof sharedWorkMotion>,b:ReturnType<typeof sharedWorkMotion>){
  const e={position:Math.max(...a.bodies.map((v,k)=>norm(v.pos,b.bodies[k].pos))),velocity:Math.max(...a.bodies.map((v,k)=>norm(v.vel,b.bodies[k].vel))),
    facing:Math.max(...a.bodies.map((v,k)=>Math.abs(v.facing-b.bodies[k].facing))),spin:Math.max(...a.bodies.map((v,k)=>Math.abs(v.spin-b.bodies[k].spin))),
    material:Math.max(...a.grips.map((v,k)=>norm(v.material,b.grips[k].material))),point:Math.max(...a.grips.map((v,k)=>norm(v.point,b.grips[k].point))),
    foot:norm(a.footOffset,b.footOffset),legs:Math.max(...a.grips.map((v,k)=>Math.abs(v.legs-b.grips[k].legs))),
    impulse:Math.max(...a.grips.map((v,k)=>norm(v.impulse,b.grips[k].impulse))),moment:Math.max(...a.grips.map((v,k)=>norm(v.moment,b.grips[k].moment))),
    angularImpulse:Math.max(...a.grips.flatMap((v,k)=>v.angularImpulse.map((w,i)=>Math.abs(w-b.grips[k].angularImpulse[i])))),
    angularMoment:Math.max(...a.grips.flatMap((v,k)=>v.angularMoment.map((w,i)=>Math.abs(w-b.grips[k].angularMoment[i])))),
    dose:Math.max(...a.grips.map((v,k)=>Math.abs(v.dose-b.grips[k].dose))),
    bodyWork:Math.abs(a.bodyWork-b.bodyWork),motorWork:Math.abs(a.motorWork-b.motorWork),passiveWork:Math.abs(a.passiveWork-b.passiveWork)},
    normalized=Math.max(e.position/5e-10,e.velocity/2.5e-8,e.facing/2.5e-9,e.spin/2.5e-7,e.material/5e-10,e.point/5e-10,e.foot/5e-10,
      e.legs/1e-9,e.impulse/5e-10,e.moment/5e-10,e.angularImpulse/1e-9,e.angularMoment/1e-9,e.dose/1e-9,e.bodyWork/1e-9,e.motorWork/1e-9,e.passiveWork/1e-9);
  return {error:e,normalized};
}
const moving:any[]=[],raw:any[]=[],refusals:any[]=[];
for(const c of cases){
  const duration=c.id.endsWith('-unequal')?.00002:.0001,input=sharedWorkInput(c.input,duration),saved=structuredClone(input),
    old=sharedWorkMotion(input,'channel',2,'rk8'),candidate=sharedWorkMotion(input,'coupled',2,'rk8'),
    coarse=sharedWorkMotion(input,'reference',128,'rk4'),fine=sharedWorkMotion(input,'reference',256,'rk4'),
    convergence=compare(coarse,fine),accuracy=compare(candidate,fine),before=compare(old,fine);
  assert(convergence.normalized<1&&accuracy.normalized<1);assert(candidate.maximumForceError<1e-9&&candidate.maximumTargetResidual<=1e-10);
  assert(Math.abs(candidate.workResidual)<1e-8&&Math.abs(candidate.angularResidual)<1e-7&&candidate.maximumCapacityExcess===0);
  assert(candidate.representationError<1e-10&&candidate.linearResidual<1e-10);
  assert(candidate.grips.every((g,k)=>g.dose<=input.grips[k].capacity*duration+1e-12));assert.deepEqual(input,saved);
  const summary=(r:typeof candidate)=>({spins:r.bodies.map(v=>v.spin),phases:r.grips.map(v=>v.slipping),legs:r.grips.map(v=>v.legs),
    doses:r.grips.map(v=>v.dose),workResidual:r.workResidual,angularResidual:r.angularResidual,maximumForceError:r.maximumForceError,
    maximumTargetResidual:r.maximumTargetResidual,passiveWork:r.passiveWork,bodyWork:r.bodyWork,motorWork:r.motorWork,
    representationError:r.representationError,linearResidual:r.linearResidual,evaluations:r.evaluations});
  moving.push({id:c.id,duration,inputSha256:hash(JSON.stringify(input)),holdTransform:input.grips.map(g=>g.hold),convergence,accuracy,before,
    old:summary(old),candidate:summary(candidate),reference:summary(fine)});raw.push({id:c.id,input,old,candidate,coarse,fine});
}
const unsupported=sharedWorkInput(cases.find(c=>c.id.endsWith('-unequal')).input),saved=structuredClone(unsupported);
for(const mode of ['coupled','reference'] as const){let refusal='';try{sharedWorkMotion(unsupported,mode,128,'rk4');}catch(e){assert(e instanceof RangeError);refusal=e.message;}
  assert.equal(refusal,'Short passive motion phase');assert.deepEqual(unsupported,saved);refusals.push({id:'unequal-100us',mode,refusal,returnedState:false,inputUnchanged:true});}
writeFileSync(`${root}/work-moving-raw.json`,JSON.stringify(raw)+'\n');
const oldIntegration=JSON.parse(readFileSync(`${root}/benchmark-run1.json`,'utf8'));
assert.equal(oldIntegration.commit,'4592ec3bb079d06d9f06f15f24c422e16c7d7ce1');assert.equal(oldIntegration.source,source);assert.deepEqual(oldIntegration.flags,flags);
assert.equal(sourceVersion(),source);for(const p of files)assert.equal(hash(readFileSync(p)),hashes[p]);
const output=process.argv.find(v=>v.startsWith('--output='))?.slice(9)??`${root}/work-evidence.json`;
writeFileSync(output,JSON.stringify({commit,source,baseline,parent,flags,hashes,
  scope:'Separate passive force-accounting mode; zero stored span extension, desired support zero and no active reel. Existing acquired bodies/materials/mobility/capacities, same sliding-share law. World and numerical timing default unchanged.',
  transform:'sharedWorkInput sets each hold to its actual acquired span; closing short intervals retain zero span bias. Moving durations 100 us, except unequal-share 20 us. Original World fixture files are unchanged.',
  reference:'Independent two-variable convex tangent box enumeration, verified inactive normal targets; fine RK4 moving checks versus candidate DOP853. No numerical work limiter imported by the force reference.',
  gates:{maximumPasses:256,normalizedForceTarget:1e-10,forceReferenceError:1e-9,bodyWorkResidual:1e-8,angularMomentumResidual:1e-7},
  frozen,worldAudit,moving,refusals,rawMoving:{path:`${root}/work-moving-raw.json`,sha256:hash(readFileSync(`${root}/work-moving-raw.json`))},
  preservedOldLawIntegration:{commit:oldIntegration.commit,receiptSha256:hash(readFileSync(`${root}/benchmark-run1.json`)),source:oldIntegration.source,
    protocol:oldIntegration.protocol,node:oldIntegration.node,cpu:oldIntegration.cpu,
    bench:oldIntegration.bench,refusals:oldIntegration.refusals,maximumReferenceNormalizedError:Math.max(...oldIntegration.rows.map((r:any)=>r.normalized)),
    status:'Numerical agreement established, cost budget failed, and integration blocked by the frozen constitutive/work-accounting defect. Keep as a law-faithful diagnostic only.'},
  exclusions:'No production promotion, World insertion, native football replay, full suite, active-work/span-energy accounting or mixed normal/tangent proof. Nine patch failures stay 43/52; keeper and support-history remain separate.'},null,2)+'\n');
console.log(JSON.stringify({output,frozenCases:frozen.length,movingCases:moving.length,maximumMovingError:Math.max(...moving.map(r=>r.accuracy.normalized)),refusals}));
