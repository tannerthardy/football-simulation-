/** Focused retained-input diagnostic; raw evidence stays in ignored out/. */
import{nativeForceFixture}from'./grip-native-world-fixtures.js';import{nativeSpanModel}from'./grip-native-span-model.js';import{spanEventForce}from'./grip-span-event-force.js';import{readFileSync,writeFileSync,mkdirSync}from'node:fs';
import{sourceVersion}from'../../source-version.js';import{execFileSync}from'node:child_process';
mkdirSync('out/grip-native-forces',{recursive:true});
const profile=JSON.parse(readFileSync('config/baseline.json','utf8')),meta={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source:sourceVersion(),
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),timestamp:new Date().toISOString()};
const c=JSON.parse(readFileSync('config/grip-native-force-inputs.json','utf8')).cases[0],q=c.input,m=nativeSpanModel(q,spanEventForce(1/q.a.mass+1/q.b.mass)),f=m.frame(m.initial),rows=[];
for(const h of [1e-5,1e-6,1e-7,1e-8]){const v=nativeForceFixture(c.id,c.phase,'owned'),collect=v.w.jointRows;let r:any;v.w.jointRows=function(H:number){const rows=collect.call(this,H);r=rows[0];return rows;};const a=[...v.args];a[3]=h;v.w.integrateSubstep(...a);
 rows.push({h,normal:(r.ln-r.reel)/h,tangent:r.lt/h,reel:r.reel/h,normalError:Math.abs((r.ln-r.reel)/h-f.normal),tangentError:Math.abs(r.lt/h-f.tangent),reelError:Math.abs(r.reel/h-f.R)});}
writeFileSync('out/grip-native-forces/native-law-limit.json',JSON.stringify({meta,field:{normal:f.normal,tangent:f.tangent,reel:f.R},rows},null,2));console.log(rows);

if(sourceVersion()!==meta.source)throw Error("Physics source changed during diagnosis");
