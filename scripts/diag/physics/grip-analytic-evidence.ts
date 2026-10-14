/** Bounded force-elimination feasibility evidence. No new World/reference collection.
 * Compare local methods on literal checked inputs; reuse strict PR #15 cost. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
import {sourceVersion} from '../../source-version.js';
import {boundedGripInterval,type GripPhaseWitness} from './grip-force-bounded.js';
const root='out/grip-analytic',parent='c641f2b102594a7c906116bf7c167270a71c3b04',
  reference=JSON.parse(readFileSync('config/grip-bounded-reference.json','utf8')),
  hash=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex'),
  source=sourceVersion(),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  files=['scripts/diag/physics/grip-force-bounded.ts','scripts/diag/physics/grip-passive-stages.ts','scripts/diag/physics/grip-stiff-tail.ts',
    'scripts/diag/physics/grip-analytic-evidence.ts','test/grip-bounded.test.ts',
    'config/grip-bounded-reference.json','package-lock.json'],
  hashes=Object.fromEntries(files.map(p=>[p,hash(readFileSync(p))])),
  flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null]));
assert.equal(source,'f0879d091645ec5c5fb84c8fd163da006fe3c9cdcae71bf95d87d2da62829e12');
assert.deepEqual(flags,reference.flags);
assert.equal(hashes['config/grip-bounded-reference.json'],hash(execFileSync('git',['show',`${parent}:config/grip-bounded-reference.json`])));
// PR #15 already verified reference compatibility after the constant extraction.
// Demand unchanged World and sliding law here, rather than recollecting them.
for(const path of ['src/physics/world.ts','src/physics/grip-sliding.ts'])
  assert.equal(hash(readFileSync(path)),hash(execFileSync('git',['show',`${parent}:${path}`])));
mkdirSync(root,{recursive:true});
const preserved=execFileSync('git',['show',`${parent}:scripts/diag/physics/grip-force-bounded.ts`],{encoding:'utf8'})
  .replaceAll('../../../src/',`${process.cwd()}/src/`)
  .replace("'./grip-stiff-tail.js'",JSON.stringify(`${process.cwd()}/scripts/diag/physics/grip-stiff-tail.js`));
writeFileSync(`${root}/parent-bounded.ts`,preserved);
const old=await import(pathToFileURL(resolve(`${root}/parent-bounded.ts`)).href),norm=(x:any,z:any)=>Math.hypot(x.x-z.x,x.y-z.y);
function compare(r:any,z:any,input:any) {
  const error={position:Math.max(norm(r.a.pos,z.a.pos),norm(r.b.pos,z.b.pos)),
    velocity:Math.max(norm(r.a.vel,z.a.vel),norm(r.b.vel,z.b.vel)),
    facing:Math.max(Math.abs(r.a.facing-z.a.facing),Math.abs(r.b.facing-z.b.facing)),
    spin:Math.max(Math.abs(r.a.spin-z.a.spin),Math.abs(r.b.spin-z.b.spin)),
    material:norm(r.material,z.material),point:norm(r.point,z.point),foot:norm(r.footOffset,z.footOffset),
    legs:Math.abs(r.legs-z.legs),hold:Math.abs(r.hold-z.hold),impulse:norm(r.impulse,z.impulse),moment:norm(r.moment,z.moment),
    angularImpulse:Math.max(...r.angularImpulse.map((v:number,i:number)=>Math.abs(v-z.angularImpulse[i]))),
    angularMoment:Math.max(...r.angularMoment.map((v:number,i:number)=>Math.abs(v-z.angularMoment[i]))),
    bodyWork:Math.abs(r.bodyWork-z.bodyWork),motorWork:Math.abs(r.motorWork-z.motorWork),passiveWork:Math.abs(r.passiveWork-z.passiveWork)};
  const normalized=Math.max(error.position/5e-7,error.velocity/2.5e-5,error.facing/2.5e-6,error.spin/2.5e-4,
    error.material/5e-7,error.point/5e-7,error.foot/5e-7,error.legs/1e-6,error.hold/5e-7,
    error.impulse/.002,error.moment/.00005,error.angularImpulse/.0005,error.angularMoment/.000005,
    error.bodyWork/.01,error.motorWork/.01,error.passiveWork/.01);
  return {error,normalized,matches:normalized<=1&&r.slipping===z.slipping
    &&Math.abs(r.workResidual)<=1e-8&&Math.abs(r.angularResidual)<=1e-7
    &&r.representationError<1e-10&&r.passiveWork<=1e-9&&r.dose<=input.capacity*input.duration+1e-9};
}
const rows:any[]=[],bench:any[]=[],refusals:any[]=[],benchmark=process.argv.includes('--benchmark');
for(const c of reference.cases) {
  assert(c.physical&&c.convergence.converged);
  const input=structuredClone(c.input),r=boundedGripInterval(input);
  assert.deepEqual(input,c.input);assert.deepEqual(r,old.boundedGripInterval(input),'Existing adaptive result changed');
  for(const mode of ['adaptive','gauss','eliminated'] as const) {
    const result=mode==='adaptive'?r:boundedGripInterval(input,mode),comparison=compare(result,c.reference,input);
    rows.push({id:c.id,mode,result,...comparison});assert(comparison.matches,`${c.id} / ${mode}`);
  }

}
if(benchmark)for(const id of ['patch-45-8-0-3001-1-acquired','patch-45-8-0-3001-1-offset','patch-0-3-0-3001-1-acquired']) {
  const c=reference.cases.find((c:any)=>c.id===id),input=structuredClone(c.input),
    modes=['adaptive','gauss','eliminated'] as const,
    samples=new Map(modes.map(mode=>[mode,[] as Array<{milliseconds:number;result:ReturnType<typeof boundedGripInterval>}>]));
  for(let k=0;k<5;k++)for(const mode of modes)boundedGripInterval(input,mode);
  for(let k=0;k<21;k++)for(let j=0;j<modes.length;j++) {
    const mode=modes[(j+k)%modes.length],start=performance.now(),result=boundedGripInterval(input,mode);
    samples.get(mode)!.push({milliseconds:performance.now()-start,result});
  }
  for(const mode of modes) {
    const repeats=samples.get(mode)!,sorted=repeats.map(s=>s.milliseconds).sort((a,b)=>a-b),endpoint=JSON.stringify(repeats[0].result);
    assert(repeats.every(s=>JSON.stringify(s.result)===endpoint));assert.deepEqual(input,c.input);
    bench.push({id,mode,milliseconds:{median:sorted[10],p95:sorted[19],maximum:sorted[20],samples:repeats.map(s=>s.milliseconds)},
      evaluations:repeats[0].result.evaluations,partitions:repeats[0].result.partitions,
      stageStatistics:repeats[0].result.stageStatistics,eventMaxBracket:repeats[0].result.eventMaxBracket,
      ...compare(repeats[0].result,c.reference,input)});
    console.log(JSON.stringify(bench.at(-1)));
  }
}
// Fresh declared mechanical boundary control: initially inside the raw-foot
// chart, but the grip load carries it outside before the interval ends.
const boundary={...structuredClone(reference.cases[0].input),
  footOffset:{x:-reference.cases[0].input.attachmentReach*.9999,y:0}};
for(const mode of ['adaptive','eliminated'] as const) {
  const sample=()=>{
    const saved=structuredClone(boundary),start=performance.now();let refused=false;
    try{boundedGripInterval(boundary,mode);}catch(e){
      assert(e instanceof RangeError&&e.message==='Bounded tangent scope/refinement limit exhausted');refused=true;
    }
    const milliseconds=performance.now()-start;assert(refused,'Accepted a chart exit');assert.deepEqual(boundary,saved);return milliseconds;
  };
  sample();const times=Array.from({length:benchmark?7:1},sample),sorted=[...times].sort((a,b)=>a-b);
  refusals.push({mode,input:boundary,returnedState:false,inputUnchanged:true,samples:times,
    milliseconds:{median:sorted[Math.floor(sorted.length/2)],maximum:sorted.at(-1)},repetitions:times.length,warmups:1});
}
// Separate phase witness after every timed call. Assert instrumentation does
// not change the accepted state; share this small reproduction with the owner.
const displaced=reference.cases.find((c:any)=>c.id==='patch-45-8-0-3001-1-offset'),phaseWork:GripPhaseWitness[]=[],
  traced=boundedGripInterval(structuredClone(displaced.input),'eliminated',phaseWork);
assert.deepEqual(traced,rows.find(r=>r.id===displaced.id&&r.mode==='eliminated').result);
assert.equal(sourceVersion(),source);for(const p of files)assert.equal(hash(readFileSync(p)),hashes[p]);
const output=process.argv.find(v=>v.startsWith('--output='))?.slice(9)??`${root}/evidence.json`;
writeFileSync(output,JSON.stringify({commit,source,parent,baseline:reference.baseline,flags,hashes,node:process.version,cpu:cpus()[0].model,
  reference:{commit:'1db1c9d86a3c36fb0af7303a5945f9ab63795fab',source:reference.source,scope:reference.scope,
    strictAcceptanceReceipt:'data/reviews/current/grip-state-convergence.json',collectedNewWorldReferences:false},
  protocol:{serial:true,repetitions:benchmark?21:0,warmups:benchmark?5:0,rotatingInterleavedOrder:true,preparationOutsideClock:true,observersOrProfilers:false,
    tailStability:'Two viscous force unknowns eliminated analytically; moving geometry iterated; original cap/scope/work checks',
    geometryIterationLimit:12,eventBracketSeconds:1e-9,phaseWitnessAfterTiming:true,
    costBudgetMilliseconds:{median:2,p95:5},existingAdaptiveResultsExact:true},
  rows,bench,refusals,phaseWork,recommendation:'Keep force elimination diagnostic until cost and World composition are established. Next: capped-phase work integration on the displaced witness; its error predates the viscous tail. Preserve all current accuracy gates and do not promote the full patch.'},null,2)+'\n');
