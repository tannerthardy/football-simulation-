import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {integrateYaw as held} from './held/src/physics/yaw-response.ts';
import {integrateYaw as candidate} from '../../src/physics/yaw-response.ts';
import {sourceVersion} from '../../scripts/source-version.ts';

type Args=[number,number,number,number,number,number];
const hash=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const cases:{id:string,args:Args}[]=[];
const old=JSON.parse(readFileSync('out/loaded-movement/yaw-fastpath-reference-evidence.json','utf8'));
for(const row of old.results){const s=row.spec;cases.push({id:'retained/'+s.label+'/'+row.mirror,args:[s.e*row.mirror,s.w*row.mirror,s.h,s.tau,s.a,s.r]});}
const E=Number.EPSILON;
for(const sign of [-1,1])for(const offset of [-64,-4,0,4,64]){
 const tau=.05,a=60,r=8,w=sign*.9*r,e=2*tau*w+sign*a*tau*tau*(1+offset*E);
 cases.push({id:'acceleration-boundary/'+sign+'/'+offset,args:[e,w,.05,tau,a,r]});
 cases.push({id:'rate-boundary/'+sign+'/'+offset,args:[sign*2,sign*r*(1+offset*E),.05,tau,a,r]});
}
for(const h of [0,-0,Number.MIN_VALUE,1e-300,.05])for(const spin of [0,-0,1,-1]){
 cases.push({id:'zero-tiny/'+h+'/'+Object.is(spin,-0),args:[-.2,spin,h,.05,0,8]});
}
for(const args of [
 [0,0,-.01,.05,1,1],[0,0,.01,0,1,1],[0,0,.01,-1,1,1],
 [0,0,.01,.05,-1,1],[0,0,.01,.05,1,-1],
 [NaN,0,.01,.05,1,1],[0,Infinity,.01,.05,1,1],
 [0,0,Infinity,.05,1,1],[0,0,.01,Infinity,1,1],[0,0,.01,.05,Infinity,1],[0,0,.01,.05,1,NaN],
] as Args[])cases.push({id:'invalid/'+cases.length,args});
let state=0x6e756d31;
const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
const choose=<T>(v:T[])=>v[Math.floor(random()*v.length)];
while(cases.length<1024){
 const tau=choose([.01,.05,.2]),a=choose([0,1e-12,.1,1,5,60,200,2000]),r=choose([0,1e-12,.3,3,8,12]);
 const h=choose([0,Number.MIN_VALUE,1e-12,.05/48,.05/12,.05,.2,1]);
 const e=(2*random()-1)*Math.PI,w=(2*random()-1)*20;
 cases.push({id:'deterministic/'+cases.length,args:[e,w,h,tau,a,r]});
}
function run(fn:typeof held,args:Args){try{return{kind:'value',value:fn(...args)};}catch(e){return{kind:'throw',name:(e as Error).name,message:(e as Error).message};}}
function exact(a:unknown,b:unknown):boolean{
 if(typeof a!=='object'||a===null||typeof b!=='object'||b===null)return Object.is(a,b);
 if(Array.isArray(a)!==Array.isArray(b))return false;
 const ak=Object.keys(a),bk=Object.keys(b);
 return ak.length===bk.length&&ak.every((key,i)=>key===bk[i]&&exact((a as any)[key],(b as any)[key]));
}
const results=cases.map(c=>{const a=run(held,c.args),b=run(candidate,c.args);return{...c,exact:exact(a,b),held:a,candidate:b};});
const summary={revision:'f96a85fdd818b6fd860554e7a9881083ae0dd60c',candidateSourceSha256:sourceVersion(),heldFileSha256:hash(readFileSync('out/yaw-readiness/held/src/physics/yaw-response.ts')),candidateFileSha256:hash(readFileSync('src/physics/yaw-response.ts')),cases:results.length,exact:results.filter(r=>r.exact).length,throws:results.filter(r=>r.held.kind==='throw').length,events:results.filter(r=>r.held.kind==='value'&&r.held.value.events.length).length,failures:results.filter(r=>!r.exact),qualification:'Independent readonly comparison to frozen aadac6d held reference; ordered recursive Object.is covers motion, peak effort, events and signed zero; invalid input exceptions compared by name/message. Deterministic mechanical states, not football outcomes or a runtime benchmark.'};
writeFileSync('out/yaw-readiness/numeric-review-evidence.json',JSON.stringify({summary,results},null,2));
console.log(JSON.stringify(summary,null,2));
if(summary.exact!==summary.cases)process.exitCode=1;
