import ts from 'typescript';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
mkdirSync('out/slip-work/compiled',{recursive:true});
const paths={old:'out/slip-work/compiled/old.mjs',new:'out/slip-work/compiled/new.mjs'};
for(const key of ['old','new']){const source=key==='old'?execFileSync('git',['show','e06ec62:src/physics/local-slip-work.ts'],{encoding:'utf8'}):execFileSync('git',['show','e0f502d:src/physics/local-slip-work.ts'],{encoding:'utf8'});
 writeFileSync(paths[key],ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText);}
const old=(await import(pathToFileURL(resolve(paths.old)).href)).integrateLocalSlip,improved=(await import(pathToFileURL(resolve(paths.new)).href)).integrateLocalSlip,
 packet=JSON.parse(readFileSync('config/local-slip-work.json','utf8')),cases=[{name:'selected',field:packet.selected.field},{name:'slidingControl',field:packet.slidingControl.field},{name:'noHand',field:{...packet.selected.field,forceLimit:0}}],kernels=[old,improved];
for(const c of cases)assert.deepEqual(old(c.field),improved(c.field));
let checksum=0;for(let k=0;k<1000;k++)for(const c of cases)for(const f of kernels)checksum+=f(c.field).impulse;
const passes=[];
for(let pass=0;pass<2;pass++){const samples=cases.map(()=>[[],[]]);
 for(let k=0;k<101;k++)for(let i=0;i<cases.length;i++)for(const j of k%2?[1,0]:[0,1]){const t=performance.now(),r=kernels[j](cases[i].field);samples[i][j].push((performance.now()-t)*1000);checksum+=r.absoluteImpulse;}
 passes.push({pass,cases:cases.map((c,i)=>({name:c.name,kernels:samples[i].map((raw,j)=>{const a=raw.sort((x,y)=>x-y);return {mode:j?'lifted':'closures',samples:a.length,medianUs:a[50],p95Us:a[95],maxUs:a[100]};})}))});}
assert(Number.isFinite(checksum));const result={protocol:'compiled-local-slip-cost-v1',compiler:ts.version,variants:{closures:'e06ec62e6094f2d8b2dc11b03bf2bfdf335d5252',lifted:'e0f502d91a0d420b843a3c3e1483430ac3ae9da0'},flags:{target:'ES2022',module:'ES2022'},physicsBitExact:true,passes};
writeFileSync('out/slip-work/compiled-cost.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
