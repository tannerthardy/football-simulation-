/** Normal-saturation event candidate; reuse compatible mixed references. No new World collection.
 * Compare local methods on literal checked inputs; reuse strict PR #15 cost. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
import {sourceVersion} from '../../source-version.js';
import {mixedGripInterval} from './grip-force-mixed.js';
import {saturationGripInterval} from './grip-force-saturation.js';
const root='out/grip-saturation',parent='9e1ac9e66c2bc8cf1a6f6b5e777eecc5854a949c',
  reference=JSON.parse(readFileSync('config/grip-mixed-reference.json','utf8')),
  fresh=JSON.parse(readFileSync('config/grip-saturation-reference.json','utf8')),
  tangent=JSON.parse(readFileSync('config/grip-bounded-reference.json','utf8')),
  hash=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex'),
  source=sourceVersion(),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  files=['scripts/diag/physics/grip-force-saturation.ts','scripts/diag/physics/grip-angle-stages.ts','scripts/diag/physics/grip-pressure-rate.ts',
    'scripts/diag/physics/grip-saturation-reference.ts','scripts/diag/physics/grip-saturation-fixtures.ts','config/grip-saturation-reference.json','scripts/diag/physics/grip-force-mixed.ts',
    'scripts/diag/physics/grip-saturation-evidence.ts','test/grip-saturation.test.ts',
    'scripts/diag/physics/grip-force-bounded.ts','scripts/diag/physics/grip-passive-stages.ts',
    'config/grip-mixed-reference.json','config/grip-bounded-reference.json','package-lock.json'],
  hashes=Object.fromEntries(files.map(p=>[p,hash(readFileSync(p))])),
  flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null]));
assert.equal(source,'f0879d091645ec5c5fb84c8fd163da006fe3c9cdcae71bf95d87d2da62829e12');
assert.deepEqual(flags,reference.flags);assert.deepEqual(flags,fresh.flags);assert.equal(fresh.source,source);
assert.equal(fresh.helperSha256,hashes['scripts/diag/physics/grip-saturation-fixtures.ts']);
assert.equal(fresh.collectorSha256,hashes['scripts/diag/physics/grip-saturation-reference.ts']);
assert.equal(hashes['config/grip-bounded-reference.json'],hash(execFileSync('git',['show',`${parent}:config/grip-bounded-reference.json`])));
assert.equal(hashes['scripts/diag/physics/grip-force-bounded.ts'],hash(execFileSync('git',['show',`${parent}:scripts/diag/physics/grip-force-bounded.ts`])));
assert.equal(hashes['scripts/diag/physics/grip-passive-stages.ts'],hash(execFileSync('git',['show',`${parent}:scripts/diag/physics/grip-passive-stages.ts`])));
// PR #15 already verified reference compatibility after the constant extraction.
// Demand unchanged World and sliding law here, rather than recollecting them.
for(const path of ['src/physics/world.ts','src/physics/grip-sliding.ts'])
  assert.equal(hash(readFileSync(path)),hash(execFileSync('git',['show',`${parent}:${path}`])));
assert.equal(hashes['scripts/diag/physics/grip-force-mixed.ts'],hash(execFileSync('git',['show',`${parent}:scripts/diag/physics/grip-force-mixed.ts`])));
mkdirSync(root,{recursive:true});
const run=(input:any,mode:'uniform'|'event')=>mode==='uniform'?mixedGripInterval(input):saturationGripInterval(input);
const norm=(x:any,z:any)=>Math.hypot(x.x-z.x,x.y-z.y);
function compare(r:any,z:any,input:any) {
  const error={position:Math.max(norm(r.a.pos,z.a.pos),norm(r.b.pos,z.b.pos)),
    velocity:Math.max(norm(r.a.vel,z.a.vel),norm(r.b.vel,z.b.vel)),
    facing:Math.max(Math.abs(r.a.facing-z.a.facing),Math.abs(r.b.facing-z.b.facing)),
    spin:Math.max(Math.abs(r.a.spin-z.a.spin),Math.abs(r.b.spin-z.b.spin)),
    material:norm(r.material,z.material),point:norm(r.point,z.point),foot:norm(r.footOffset,z.footOffset),
    legs:Math.abs(r.legs-z.legs),hold:Math.abs(r.hold-z.hold),impulse:norm(r.impulse,z.impulse),moment:norm(r.moment,z.moment),
    angularImpulse:Math.max(...r.angularImpulse.map((v:number,i:number)=>Math.abs(v-z.angularImpulse[i]))),
    angularMoment:Math.max(...r.angularMoment.map((v:number,i:number)=>Math.abs(v-z.angularMoment[i]))),
    normalImpulse:Math.abs(r.normalImpulse-z.normalImpulse),tangentImpulse:Math.abs((r.tangentImpulse??0)-(z.tangentImpulse??0)),dose:Math.abs(r.dose-z.dose),
    bodyWork:Math.abs(r.bodyWork-z.bodyWork),motorWork:Math.abs(r.motorWork-z.motorWork),passiveWork:Math.abs(r.passiveWork-z.passiveWork)};
  const normalized=Math.max(error.position/5e-7,error.velocity/2.5e-5,error.facing/2.5e-6,error.spin/2.5e-4,
    error.material/5e-7,error.point/5e-7,error.foot/5e-7,error.legs/1e-6,error.hold/5e-7,
    error.impulse/.002,error.moment/.00005,error.angularImpulse/.0005,error.angularMoment/.000005,
    error.normalImpulse/.002,error.tangentImpulse/.002,error.dose/.002,error.bodyWork/.01,error.motorWork/.01,error.passiveWork/.01);
  return {error,normalized,matches:normalized<=1&&r.slipping===z.slipping
    &&Math.abs(r.workResidual)<=1e-8&&Math.abs(r.angularResidual)<=1e-7
    &&r.representationError<1e-10&&r.passiveWork<=1e-9&&r.dose<=input.capacity*input.duration+1e-9};
}
const rows:any[]=[],bench:any[]=[],refusals:any[]=[],benchmark=process.argv.includes('--benchmark');
for(const c of [...reference.cases,...fresh.cases]) {
  assert(c.physical&&c.convergence.converged);
  const input=structuredClone(c.input);
  for(const mode of ['uniform','event'] as const) {
    const result=run(input,mode),comparison=compare(result,c.reference,input);
    assert.deepEqual(input,c.input);
    rows.push({id:c.id,mode,result,...comparison});assert(comparison.matches,`${c.id} / ${mode}`);
  }

}
if(benchmark)for(const id of ['patch-45-8-0-3001-1-mixed-3','patch-45-8-0-3001-1-mixed-0.3','patch-45-8-0-3001-1-mixed-0.3-reverse',
  'patch-0-3-0-3001-1-acquired','fresh-moving-arm']) {
  const c=[...reference.cases,...fresh.cases].find((c:any)=>c.id===id)??tangent.cases.find((c:any)=>c.id===id),input=structuredClone(c.input),
    modes=['uniform','event'] as const,
    samples=new Map(modes.map(mode=>[mode,[] as Array<{milliseconds:number;result:ReturnType<typeof run>}>]));
  for(let k=0;k<5;k++)for(const mode of modes)run(input,mode);
  for(let k=0;k<21;k++)for(let j=0;j<modes.length;j++) {
    const mode=modes[(j+k)%modes.length],start=performance.now(),result=run(input,mode);
    samples.get(mode)!.push({milliseconds:performance.now()-start,result});
  }
  for(const mode of modes) {
    const repeats=samples.get(mode)!,sorted=repeats.map(s=>s.milliseconds).sort((a,b)=>a-b),endpoint=JSON.stringify(repeats[0].result);
    assert(repeats.every(s=>JSON.stringify(s.result)===endpoint));assert.deepEqual(input,c.input);
    bench.push({id,mode,milliseconds:{median:sorted[10],p95:sorted[19],maximum:sorted[20],samples:repeats.map(s=>s.milliseconds)},
      evaluations:repeats[0].result.evaluations,partitions:repeats[0].result.partitions,
      method:repeats[0].result.method,stageStatistics:(repeats[0].result as any).stageStatistics,
      eventTime:(repeats[0].result as any).eventTime,rootIterations:(repeats[0].result as any).rootIterations,
      ...compare(repeats[0].result,c.reference,input)});
    console.log(JSON.stringify(bench.at(-1)));
  }
}
// Physical unsupported controls, timed separately after accepted intervals.
const chart={...structuredClone(reference.cases[1].input),footOffset:{x:-reference.cases[1].input.attachmentReach*.9999,y:0}},
  slip={...structuredClone(reference.cases[1].input),capacity:10000};
for(const [id,input] of [['chart-exit',chart],['slip-phase',slip]] as const)for(const mode of ['uniform','event'] as const) {
  const sample=()=>{
    const saved=structuredClone(input),start=performance.now();let refused=false;
    try{run(input,mode);}catch(e){
      assert(e instanceof RangeError&&e.message==='Mixed-grip scope/refinement limit exhausted');refused=true;
    }
    const milliseconds=performance.now()-start;assert(refused,'Accepted unsupported interval');assert.deepEqual(input,saved);return milliseconds;
  };
  sample();const times=Array.from({length:benchmark?7:1},sample),sorted=[...times].sort((a,b)=>a-b);
  refusals.push({id,mode,input,returnedState:false,inputUnchanged:true,samples:times,
    milliseconds:{median:sorted[Math.floor(sorted.length/2)],maximum:sorted.at(-1)},repetitions:times.length,warmups:1});
}
assert.equal(sourceVersion(),source);for(const p of files)assert.equal(hash(readFileSync(p)),hashes[p]);
const output=process.argv.find(v=>v.startsWith('--output='))?.slice(9)??`${root}/evidence.json`;
writeFileSync(output,JSON.stringify({commit,source,parent,baseline:reference.baseline,flags,hashes,node:process.version,cpu:cpus()[0].model,
  reference:{scope:reference.scope,collections:reference.collections,collectedNewWorldReferences:true,freshReferenceSha256:hashes['config/grip-saturation-reference.json'],
    freshCollectorCommit:fresh.commit,freshCollectorSha256:fresh.collectorSha256,freshPhysicalAndConverged:fresh.cases.every((c:any)=>c.physical&&c.convergence.converged),
    coarse:32768,fine:65536,slippingWholeInterval:true,activeReel:false,forceAuditReused:'data/reviews/current/grip-mixed-budget.json'},
  protocol:{serial:true,repetitions:benchmark?21:0,warmups:benchmark?5:0,rotatingInterleavedOrder:true,
    preparationOutsideClock:true,observersOrProfilers:false,methods:['preserved uniform RK4','three-stage Gauss with a force-angle clock; unchanged eight-pass allocation'],
    rowPasses:8,eventClock:'theta=acos(beta0)*(1-s); dt/ds=acos(beta0)*sin(theta)/(d beta/dt)',
    maximumRefinement:1024,maximumRootIterations:4,maximumStageIterations:30,stageResidual:1e-13,eventResidual:1e-10,
    errorAllowance:1/16,accuracy:{position:5e-7,attachment:5e-7,velocity:2.5e-5,facing:2.5e-6,spin:2.5e-4,legs:1e-6,
      impulse:.002,moment:.00005,angularImpulse:.0005,angularMoment:.000005,work:.01,workResidual:1e-8,angularResidual:1e-7,representation:1e-10},
    costBudgetMilliseconds:{median:2,p95:5,observedRefusalMaximum:10},existingTangentSourceAndFixturesUnchanged:true},
  rows,bench,refusals,
  recommendation:'Judge the bounded event method on unchanged accuracy, typical/tail/refusal cost and fresh controls. World composition and default promotion remain separate.'},null,2)+'\n');
