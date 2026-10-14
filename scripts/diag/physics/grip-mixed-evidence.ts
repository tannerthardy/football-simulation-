/** Bounded mixed-grip accuracy and local integration cost. Reference collection is separate.
 * Compare local methods on literal checked inputs; reuse strict PR #15 cost. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
import {sourceVersion} from '../../source-version.js';
import {mixedGripInterval,mixedSupportForce} from './grip-force-mixed.js';
import {World} from '../../../src/physics/world.js';
import {mixedCases,prepareMixedCase} from './grip-mixed-fixtures.js';
import {prescribeBoundedSupport} from './grip-bounded-fixtures.js';
const root='out/grip-mixed',parent='1945a34fbca4bc39ed787e6f22dd7e6e615f8b2a',
  reference=JSON.parse(readFileSync('config/grip-mixed-reference.json','utf8')),
  tangent=JSON.parse(readFileSync('config/grip-bounded-reference.json','utf8')),
  hash=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex'),
  source=sourceVersion(),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  files=['scripts/diag/physics/grip-force-mixed.ts','scripts/diag/physics/grip-mixed-fixtures.ts','scripts/diag/physics/grip-mixed-reference.ts',
    'scripts/diag/physics/grip-mixed-evidence.ts','test/grip-mixed.test.ts',
    'scripts/diag/physics/grip-force-bounded.ts','scripts/diag/physics/grip-passive-stages.ts',
    'config/grip-mixed-reference.json','config/grip-bounded-reference.json','package-lock.json'],
  hashes=Object.fromEntries(files.map(p=>[p,hash(readFileSync(p))])),
  flags=Object.fromEntries(Object.keys(JSON.parse(readFileSync('config/baseline.json','utf8')).flags).map(k=>[k,process.env[k]??null]));
assert.equal(source,'f0879d091645ec5c5fb84c8fd163da006fe3c9cdcae71bf95d87d2da62829e12');
assert.deepEqual(flags,reference.flags);
assert.equal(hashes['config/grip-bounded-reference.json'],hash(execFileSync('git',['show',`${parent}:config/grip-bounded-reference.json`])));
assert.equal(hashes['scripts/diag/physics/grip-force-bounded.ts'],hash(execFileSync('git',['show',`${parent}:scripts/diag/physics/grip-force-bounded.ts`])));
assert.equal(hashes['scripts/diag/physics/grip-passive-stages.ts'],hash(execFileSync('git',['show',`${parent}:scripts/diag/physics/grip-passive-stages.ts`])));
// PR #15 already verified reference compatibility after the constant extraction.
// Demand unchanged World and sliding law here, rather than recollecting them.
for(const path of ['src/physics/world.ts','src/physics/grip-sliding.ts'])
  assert.equal(hash(readFileSync(path)),hash(execFileSync('git',['show',`${parent}:${path}`])));
mkdirSync(root,{recursive:true});
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
  const input=structuredClone(c.input);
  for(const mode of ['uniform','adaptive'] as const) {
    const result=mixedGripInterval(input,mode),comparison=compare(result,c.reference,input);
    assert.deepEqual(input,c.input);
    rows.push({id:c.id,mode,result,...comparison});assert(comparison.matches,`${c.id} / ${mode}`);
  }

}
if(benchmark)for(const id of ['patch-45-8-0-3001-1-mixed-3','patch-45-8-0-3001-1-mixed-0.3','patch-45-8-0-3001-1-mixed-0.3-reverse',
  'patch-0-3-0-3001-1-acquired']) {
  const c=reference.cases.find((c:any)=>c.id===id)??tangent.cases.find((c:any)=>c.id===id),input=structuredClone(c.input),
    modes=['uniform','adaptive'] as const,
    samples=new Map(modes.map(mode=>[mode,[] as Array<{milliseconds:number;result:ReturnType<typeof mixedGripInterval>}>]));
  for(let k=0;k<5;k++)for(const mode of modes)mixedGripInterval(input,mode);
  for(let k=0;k<21;k++)for(let j=0;j<modes.length;j++) {
    const mode=modes[(j+k)%modes.length],start=performance.now(),result=mixedGripInterval(input,mode);
    samples.get(mode)!.push({milliseconds:performance.now()-start,result});
  }
  for(const mode of modes) {
    const repeats=samples.get(mode)!,sorted=repeats.map(s=>s.milliseconds).sort((a,b)=>a-b),endpoint=JSON.stringify(repeats[0].result);
    assert(repeats.every(s=>JSON.stringify(s.result)===endpoint));assert.deepEqual(input,c.input);
    bench.push({id,mode,milliseconds:{median:sorted[10],p95:sorted[19],maximum:sorted[20],samples:repeats.map(s=>s.milliseconds)},
      evaluations:repeats[0].result.evaluations,partitions:repeats[0].result.partitions,
      method:repeats[0].result.method,
      ...compare(repeats[0].result,c.reference,input)});
    console.log(JSON.stringify(bench.at(-1)));
  }
}
// Physical unsupported controls, timed separately after accepted intervals.
const chart={...structuredClone(reference.cases[1].input),footOffset:{x:-reference.cases[1].input.attachmentReach*.9999,y:0}},
  slip={...structuredClone(reference.cases[1].input),capacity:10000};
for(const [id,input] of [['chart-exit',chart],['slip-phase',slip]] as const)for(const mode of ['uniform','adaptive'] as const) {
  const sample=()=>{
    const saved=structuredClone(input),start=performance.now();let refused=false;
    try{mixedGripInterval(input,mode);}catch(e){
      assert(e instanceof RangeError&&e.message==='Mixed-grip scope/refinement limit exhausted');refused=true;
    }
    const milliseconds=performance.now()-start;assert(refused,'Accepted unsupported interval');assert.deepEqual(input,saved);return milliseconds;
  };
  sample();const times=Array.from({length:benchmark?7:1},sample),sorted=[...times].sort((a,b)=>a-b);
  refusals.push({id,mode,input,returnedState:false,inputUnchanged:true,samples:times,
    milliseconds:{median:sorted[Math.floor(sorted.length/2)],maximum:sorted.at(-1)},repetitions:times.length,warmups:1});
}
// Frozen row audit is separate from every timed call. Shrinking h checks the
// continuous allocation against the original eight ordered World passes.
const forceAudit:any[]=[],prototype:any=World.prototype,feet=prototype.feet;
try {
  prototype.feet=prescribeBoundedSupport(feet);
  for(const c of mixedCases)for(const h of [1e-6,1e-7,1e-8]) {
    const v=prepareMixedCase(c),{w,joint,input}=v,point=w.graspPoint(joint),J=w.graspJacobian(joint),
      d=Math.hypot(point.x-joint.a.pos.x,point.y-joint.a.pos.y),nx=(point.x-joint.a.pos.x)/d,ny=(point.y-joint.a.pos.y)/d,
      jnx=J.xx*nx+J.xy*ny,jny=J.xy*nx+J.yy*ny,jtx=-J.xx*ny+J.xy*nx,jty=-J.xy*ny+J.yy*nx,
      nn=input.mobility*(jnx*jnx+jny*jny),nt=input.mobility*(jnx*jtx+jny*jty),tt=input.mobility*(jtx*jtx+jty*jty),
      predicted=mixedSupportForce(c.normal,v.transform.relativeTangent,nn,nt,tt,1/input.a.mass+1/input.b.mass,input.capacity),
      solve=w.solveGrasp,passes:any[]=[];
    w.solveGrasp=function(row:any,...args:any[]){solve.call(this,row,...args);passes.push({normal:row.ln/h,tangent:row.lt/h});};
    v.p.args[3]=h;w.integrateSubstep(...v.p.args);assert.equal(passes.length,8);
    const actual=passes.at(-1),error=Math.hypot(actual.normal-predicted.normal,actual.tangent-predicted.tangent);
    forceAudit.push({id:v.id,h,input,mobility:{nn,nt,tt},predicted,actual,error,passes});
  }
}finally{prototype.feet=feet;}
for(const c of mixedCases) {
  const id=prepareMixedCase(c).id,samples=forceAudit.filter(r=>r.id===id);
  assert(samples.at(-1).error<=samples[0].error,'Force error did not decrease with shrinking World step');
}
assert.equal(sourceVersion(),source);for(const p of files)assert.equal(hash(readFileSync(p)),hashes[p]);
const output=process.argv.find(v=>v.startsWith('--output='))?.slice(9)??`${root}/evidence.json`;
writeFileSync(output,JSON.stringify({commit,source,parent,baseline:reference.baseline,flags,hashes,node:process.version,cpu:cpus()[0].model,
  reference:{scope:reference.scope,collections:reference.collections,collectedNewWorldReferences:true,
    coarse:32768,fine:65536,slippingWholeInterval:true,activeReel:false},
  protocol:{serial:true,repetitions:benchmark?21:0,warmups:benchmark?5:0,rotatingInterleavedOrder:true,
    preparationOutsideClock:true,observersOrProfilers:false,methods:['uniform RK4','adaptive RK4 with bounded accumulated local error'],
    rowPasses:8,maximumUniformPieces:1024,maximumAdaptivePiecesPerMacro:128,maximumAdaptiveRetries:20,
    costBudgetMilliseconds:{median:2,p95:5,observedRefusalMaximum:10},existingTangentSourceAndFixturesUnchanged:true},
  rows,bench,refusals,forceAudit,prototypeRestored:prototype.feet===feet,
  recommendation:'Retain a bounded mixed-budget diagnostic only. Review measured accuracy and cost before any new integration scope; World composition and default promotion remain unproved.'},null,2)+'\n');
