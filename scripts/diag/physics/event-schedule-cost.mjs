/** Emitted ES2022, uninstrumented timed calls. Stage-only calls are diagnostic;
 * the unchanged acceptance target applies to the complete candidate. */
import ts from 'typescript';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root='out/event-schedule',paths={candidate:'src/physics/motor-event-schedule.ts',reference:'src/physics/local-slip-motor.ts'};mkdirSync(root,{recursive:true});
const hashes={};
for(const [key,path] of Object.entries(paths)){const src=readFileSync(path,'utf8');hashes[key]=createHash('sha256').update(src).digest('hex');writeFileSync(`${root}/cost-${key}.mjs`,ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText);}
const candidate=await import(pathToFileURL(resolve(`${root}/cost-candidate.mjs`)).href),reference=await import(pathToFileURL(resolve(`${root}/cost-reference.mjs`)).href),
 packet=JSON.parse(readFileSync('config/local-slip-work.json','utf8')),ref=JSON.parse(readFileSync('config/local-slip-motor-reference.json','utf8')),
 fields={nextField:packet.nextField.field,selected:packet.selected.field,slidingControl:packet.slidingControl.field,noHandControl:{...packet.nextField.field,forceLimit:0}},cases=[];
for(const [name,f] of Object.entries(fields)){
 const p=candidate.selectMotorEvents(f),r=candidate.integrateMotorEvents(f);assert(p.ok&&r.ok);assert.deepEqual(r,candidate.applyMotorEvents(p));
 for(let i=0;i<2;i++){for(const k of ['position','velocity'])for(const c of ['x','y'])assert(Math.abs(r.bodies[i][k][c]-Number(ref.cases[name].after[i][k][c]))<1e-11);for(const k of ['facing','spin'])assert(Math.abs(r.bodies[i][k]-Number(ref.cases[name].after[i][k]))<1e-11);}
 for(const k of ['impulse','temporalMoment','absoluteImpulse','handWork','energyChange'])assert(Math.abs(r[k]-Number(ref.cases[name][k]))<1e-11);
 assert(Math.abs(r.workResidual)<1e-11);for(const phase of r.phases)assert(phase.work<=1e-14);
 cases.push({name,mode:'candidate',fn:()=>candidate.integrateMotorEvents(f)},{name,mode:'reference',fn:()=>reference.integrateSlipMotor(f)},
  {name,mode:'selectOnly',fn:()=>candidate.selectMotorEvents(f)},{name,mode:'applySelected',fn:()=>candidate.applyMotorEvents(p)});
}
let checksum=0;for(let k=0;k<1000;k++)for(const c of cases)checksum+=c.fn().impulse;
const order=cases.map((_,i)=>i),reverse=[...order].reverse(),passes=[];
for(let pass=0;pass<2;pass++){const raw=cases.map(()=>[]);for(let k=0;k<101;k++)for(const i of k%2?reverse:order){const t=performance.now(),r=cases[i].fn();raw[i].push((performance.now()-t)*1000);checksum+=r.absoluteImpulse;}
 passes.push({pass,cases:cases.map((c,i)=>{const a=raw[i].sort((x,y)=>x-y);return {case:c.name,mode:c.mode,samples:a.length,medianUs:a[50],p95Us:a[95],maxUs:a[100]};})});}
assert(Number.isFinite(checksum));for(const [k,p] of Object.entries(paths))assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),hashes[k]);
const budget={medianUs:10,p95Us:25,scope:'complete local single-field call, not World'},result={protocol:'event-schedule-cost-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,compiler:ts.version,hashes,settings:{target:'ES2022',module:'ES2022',warmupsPerCase:1000,passes:2,samplesPerPass:101},passes,budget,budgetMet:passes.every(p=>p.cases.filter(c=>c.mode==='candidate').every(c=>c.medianUs<=budget.medianUs&&c.p95Us<=budget.p95Us))};
writeFileSync(`${root}/cost.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
