/** One saved local event, one native opposing control, independent precision
 * check and local cost. No World integration, games or baseline promotion. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {integrateLocalSlip,type SlipField} from '../../../src/physics/local-slip-work.js';
import {sourceVersion} from '../../source-version.js';
const root='out/slip-work';mkdirSync(root,{recursive:true});
const inputPath='config/local-slip-work.json',referencePath='config/local-slip-work-reference.json',input=JSON.parse(readFileSync(inputPath,'utf8')),
 reference=JSON.parse(readFileSync(referencePath,'utf8')),precise=JSON.parse(readFileSync(`${root}/reference100.json`,'utf8')),
 source=sourceVersion(),started=performance.now(),sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
assert.equal(reference.inputSha256,sha(inputPath));assert.equal(precise.inputSha256,sha(inputPath));
const numeric=(x:any):any=>typeof x==='string'?Number(x):Array.isArray(x)?x.map(numeric):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,numeric(v)])):x;
assert.deepEqual(numeric(reference.cases),numeric(precise.cases));
const evaluate=(f:SlipField)=>{const r=integrateLocalSlip(f);if(!r.ok)throw Error(r.reason);return r;};
const results=[];
for(const key of ['selected','slidingControl']){
 const f:SlipField=input[key].field,expected=numeric(reference.cases[key]),r=evaluate(f),residuals:any={};
 for(const k of ['impulse','temporalMoment','absoluteImpulse','handWork','energyChange'] as const){residuals[k]=Math.abs(r[k]-expected[k]);assert(residuals[k]<1e-11);}
 residuals.groundWork=Math.abs(r.groundWork[0]+r.groundWork[1]-expected.groundWork);assert(residuals.groundWork<1e-11);
 residuals.motion=Math.max(...r.bodies.flatMap((b,i)=>[Math.abs(b.position.x-expected.after[i].position.x),Math.abs(b.position.y-expected.after[i].position.y),
  Math.abs(b.velocity.x-expected.after[i].velocity.x),Math.abs(b.velocity.y-expected.after[i].velocity.y),Math.abs(b.facing-expected.after[i].facing),Math.abs(b.spin-expected.after[i].spin)]));
 assert(residuals.motion<1e-11&&Math.abs(r.workResidual)<1e-11);assert(r.handWork<=1e-14);assert(r.absoluteImpulse<=f.forceLimit*f.duration+1e-14);
 for(const p of r.phases)assert(Math.abs(p.force)<=f.forceLimit&&p.work<=1e-14);
 const partitions=[];
 for(const weights of [[.23,.41,.36],[.5,.5],[.01,.09,.9]]){
  let field=structuredClone(f),elapsed=0,impulse=0,moment=0,amount=0,work=0,ground=0;
  for(const weight of weights){const dt=weight*f.duration,sub=evaluate({...field,duration:dt,remaining:f.remaining-elapsed});
   impulse+=sub.impulse;moment+=sub.temporalMoment+(f.duration-elapsed-dt)*sub.impulse;amount+=sub.absoluteImpulse;work+=sub.handWork;ground+=sub.groundWork[0]+sub.groundWork[1];elapsed+=dt;field.bodies=sub.bodies;
  }
  const residual=Math.max(Math.abs(impulse-r.impulse),Math.abs(moment-r.temporalMoment),Math.abs(amount-r.absoluteImpulse),Math.abs(work-r.handWork),Math.abs(ground-r.groundWork[0]-r.groundWork[1]),
   ...field.bodies.flatMap((b,i)=>[Math.abs(b.position.x-r.bodies[i].position.x),Math.abs(b.position.y-r.bodies[i].position.y),Math.abs(b.velocity.x-r.bodies[i].velocity.x),Math.abs(b.velocity.y-r.bodies[i].velocity.y),Math.abs(b.facing-r.bodies[i].facing),Math.abs(b.spin-r.bodies[i].spin)]));
  assert(residual<1e-11);partitions.push({weights,residual});
 }
 results.push({key,result:r,referenceResiduals:residuals,partitions,native:input[key].native});
}
const next=integrateLocalSlip(input.nextField.field);assert.deepEqual(next,{ok:false,reason:'ground-motor-transition'});
const noHand:SlipField={...input.selected.field,forceLimit:0};
const bench=[{name:'selected',field:input.selected.field},{name:'slidingControl',field:input.slidingControl.field},{name:'noHand',field:noHand}];
// 10us median/local interval leaves about0.12ms over12 intervals; a feasibility
// allocation from PR68's measured ~0.2ms pair cost, not a World runtime claim.
const budget={medianUs:10,p95Us:25,scope:'local single interval only; World integration not measured'};
let checksum=0;for(let k=0;k<1000;k++)for(const b of bench)checksum+=evaluate(b.field).impulse;
const cost=[];
for(let pass=0;pass<2;pass++){
 const samples=bench.map(()=>[] as number[]);
 for(let k=0;k<101;k++)for(const i of k%2?[2,1,0]:[0,1,2]){const start=performance.now(),r=evaluate(bench[i].field);samples[i].push((performance.now()-start)*1000);checksum+=r.absoluteImpulse;}
 cost.push({pass,cases:bench.map((b,i)=>{const a=samples[i].sort((x,y)=>x-y);return {name:b.name,samples:a.length,medianUs:a[50],p95Us:a[95],maxUs:a[100]};})});
}
assert(Number.isFinite(checksum));assert.equal(sourceVersion(),source);
const result={protocol:'local-slip-work-v1',source,input:{path:inputPath,sha256:sha(inputPath),source:input.source},reference:{path:referencePath,sha256:sha(referencePath),precision:[70,100],doublePrecisionAgreement:true,
 generator:'scripts/diag/physics/local-slip-reference.py',generatorSha256:sha('scripts/diag/physics/local-slip-reference.py'),scope:'Closed-form scalar Coulomb event and analytic coordinate/work integrals; independent Decimal arithmetic, no engine imports.'},
 results,nextSavedField:{time:input.nextField.time,result:next},budget,cost,budgetMet:cost.every(p=>p.cases.every(c=>c.medianUs<=budget.medianUs&&c.p95Us<=budget.p95Us)),
 worldIntegrated:false,adoptionReady:false,elapsedSeconds:(performance.now()-started)/1000,
 decision:'The first frozen-frame slip transition is closed locally: passive phase work, motion and signed/absolute impulse agree with independent references and unequal partitions. This does not repair or promote full World. The next saved field changes the ground-motor regime and is explicitly unsupported; a World adapter must also carry phase work, temporal moment and absolute effort rather than relabel the old ordered ledger.'};
writeFileSync(`${root}/result.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({cases:results.map(({key,result:r,referenceResiduals,partitions})=>({key,phases:r.phases,impulse:r.impulse,temporalMoment:r.temporalMoment,absoluteImpulse:r.absoluteImpulse,handWork:r.handWork,workResidual:r.workResidual,referenceResiduals,partitions})),next:result.nextSavedField,cost,budgetMet:result.budgetMet,elapsedSeconds:result.elapsedSeconds}));
