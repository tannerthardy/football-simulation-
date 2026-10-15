/** Uninstrumented emitted ES2022; no TSX inside measured calls. */
import ts from 'typescript';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='out/slip-motor/compiled';mkdirSync(root,{recursive:true});
const current='src/physics/local-slip-motor.ts',oldSource=execFileSync('git',['show','1ee42fefda89e969998da64283573206c8c852b6:src/physics/local-slip-work.ts'],{encoding:'utf8'}),source=readFileSync(current,'utf8');
const refactorSource=execFileSync('git',['show','1406664f0b3fc188f4bce03912a5f7a2350cc66e:src/physics/local-slip-motor.ts'],{encoding:'utf8'});
for(const [name,text] of [['motor',source],['refactor',refactorSource],['previous',oldSource]])writeFileSync(`${root}/${name}.mjs`,ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText);
const motor=(await import(pathToFileURL(resolve(`${root}/motor.mjs`)).href)).integrateSlipMotor,refactor=(await import(pathToFileURL(resolve(`${root}/refactor.mjs`)).href)).integrateSlipMotor,previous=(await import(pathToFileURL(resolve(`${root}/previous.mjs`)).href)).integrateLocalSlip,
 input=JSON.parse(readFileSync('config/local-slip-work.json','utf8')),ref=JSON.parse(readFileSync('config/local-slip-motor-reference.json','utf8')),
 fields={nextField:input.nextField.field,selected:input.selected.field,slidingControl:input.slidingControl.field,noHandControl:{...input.nextField.field,forceLimit:0}},cases=[];
for(const [name,field] of Object.entries(fields)){
 const r=motor(field);assert(r.ok);assert.deepEqual(r,refactor(field));assert(Math.abs(r.handWork-Number(ref.cases[name].handWork))<1e-11);
 for(let i=0;i<2;i++){for(const k of ['facing','spin'])assert(Math.abs(r.bodies[i][k]-Number(ref.cases[name].after[i][k]))<1e-11);for(const k of ['position','velocity'])for(const c of ['x','y'])assert(Math.abs(r.bodies[i][k][c]-Number(ref.cases[name].after[i][k][c]))<1e-11);}
 cases.push({name,field,mode:'motor',fn:motor},{name,field,mode:'rejectedRefactor',fn:refactor});if(name==='selected'||name==='slidingControl')cases.push({name,field,mode:'previous',fn:previous});
}
let checksum=0;for(let k=0;k<1000;k++)for(const c of cases)checksum+=c.fn(c.field).absoluteImpulse;
const passes=[];
for(let pass=0;pass<2;pass++){const raw=cases.map(()=>[]);
 for(let k=0;k<101;k++)for(const i of k%2?cases.map((_,i)=>i).reverse():cases.map((_,i)=>i)){const c=cases[i],t=performance.now(),r=c.fn(c.field);raw[i].push((performance.now()-t)*1000);checksum+=r.impulse;}
 passes.push({pass,cases:cases.map((c,i)=>{const a=raw[i].sort((x,y)=>x-y);return {case:c.name,mode:c.mode,samples:a.length,medianUs:a[50],p95Us:a[95],maxUs:a[100]};})});}
assert(Number.isFinite(checksum));assert.equal(readFileSync(current,'utf8'),source);
const budget={medianUs:10,p95Us:25,scope:'local single field only; no World timing guarantee'},result={protocol:'compiled-slip-motor-cost-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,compiler:ts.version,flags:{target:'ES2022',module:'ES2022'},kernelSha256:createHash('sha256').update(source).digest('hex'),physicsBitExactWithRefactor:true,rejectedRefactorRevision:'1406664f0b3fc188f4bce03912a5f7a2350cc66e',previousRevision:'1ee42fefda89e969998da64283573206c8c852b6',passes,budget,budgetMet:passes.every(p=>p.cases.filter(c=>c.mode==='motor').every(c=>c.medianUs<=budget.medianUs&&c.p95Us<=budget.p95Us))};
writeFileSync('out/slip-motor/compiled-cost.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
