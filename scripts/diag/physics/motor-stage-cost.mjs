/** Observation-neutral stage timings. Clocks perturb cost; no readiness verdict
 * comes from the instrumented numbers or subtraction of independent medians. */
import ts from 'typescript';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root='out/event-schedule',src=readFileSync('src/physics/local-slip-motor.ts','utf8');mkdirSync(root,{recursive:true});
let marked='export const stageCosts = new Float64Array(4);\n'+src;
const change=(old,next)=>{assert.equal(marked.split(old).length,2,old);marked=marked.replace(old,next);};
change('  const {duration:h,remaining,tangent:t,arms,forceLimit:limit}=field;','  const __setup=performance.now();\n  const {duration:h,remaining,tangent:t,arms,forceLimit:limit}=field;');
change('  while(elapsed<h){','  stageCosts[0]+=performance.now()-__setup;\n  while(elapsed<h){\n    const __select=performance.now();');
change('    const phaseW=F*(u*d+.5*du*d*d);','    stageCosts[1]+=performance.now()-__select;const __apply=performance.now();\n    const phaseW=F*(u*d+.5*du*d*d);');
change('W+=phaseW;elapsed+=d;','W+=phaseW;elapsed+=d;stageCosts[2]+=performance.now()-__apply;');
change('  const change=energy(bs)-beforeE;','  const __finish=performance.now();const change=energy(bs)-beforeE;stageCosts[3]+=performance.now()-__finish;');
for(const [name,text] of [['plain',src],['marked',marked]])writeFileSync(`${root}/stage-${name}.mjs`,ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText);
const plain=(await import(pathToFileURL(resolve(`${root}/stage-plain.mjs`)).href)).integrateSlipMotor,measured=await import(pathToFileURL(resolve(`${root}/stage-marked.mjs`)).href),
 input=JSON.parse(readFileSync('config/local-slip-work.json','utf8')),fields={nextField:input.nextField.field,selected:input.selected.field,slidingControl:input.slidingControl.field,noHandControl:{...input.nextField.field,forceLimit:0}};
for(const f of Object.values(fields))assert.deepEqual(plain(f),measured.integrateSlipMotor(f));
let checksum=0;for(let k=0;k<1000;k++)for(const f of Object.values(fields)){checksum+=plain(f).impulse;checksum+=measured.integrateSlipMotor(f).impulse;}
const summary=raw=>{const a=raw.sort((x,y)=>x-y);return {samples:a.length,medianUs:a[50],p95Us:a[95],maxUs:a[100]};},passes=[];
for(let pass=0;pass<2;pass++){const cases=[];for(const [name,f] of Object.entries(fields)){const times=[],stages=[[],[],[],[]];
 for(let k=0;k<101;k++){const t=performance.now();checksum+=plain(f).absoluteImpulse;times.push((performance.now()-t)*1000);measured.stageCosts.fill(0);checksum+=measured.integrateSlipMotor(f).absoluteImpulse;for(let i=0;i<4;i++)stages[i].push(measured.stageCosts[i]*1000);}
 cases.push({name,uninstrumented:summary(times),instrumentedStages:Object.fromEntries(['setup','selection','application','finalEnergy'].map((name,i)=>[name,summary(stages[i])]))});}passes.push({pass,cases});}
assert(Number.isFinite(checksum));assert.equal(readFileSync('src/physics/local-slip-motor.ts','utf8'),src);
const result={protocol:'motor-stage-cost-v1',node:process.version,compiler:ts.version,referenceKernelSha256:createHash('sha256').update(src).digest('hex'),observationNeutral:true,instrumentationCaveat:'Stage clocks/JIT effects perturb costs; do not subtract these medians or compare their sums as uninstrumented cost. Full return-object construction is outside finalEnergy stage.',passes};
writeFileSync(`${root}/stage-cost.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
