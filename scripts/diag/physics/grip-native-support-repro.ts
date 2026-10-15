/** Capture the first large support-history growth from the fixed small panel.
 * Portable two-body inputs, not expected answers. Default-off callback identity
 * is compared on each identical checkpoint before making any causal claim. */
import assert from 'node:assert/strict';
import {serialize,deserialize} from 'node:v8';
import {readFileSync,writeFileSync} from 'node:fs';
import {World} from '../../../src/physics/world.js';
import {rep} from '../tackle/panel.js';
import {nativeSpanInterval} from './grip-native-span-interval.js';
import {nativeTransitionInterval} from './grip-native-slip.js';
import {sha} from './grip-bounded-fixtures.js';
import {sourceVersion} from '../../source-version.js';
const root='out/grip-native-football',panel=JSON.parse(readFileSync(`${root}/panel.json`,'utf8')),input=panel.meta.inputs.find((c:any)=>c.id==='patch-45-8-0-4001-1'),
  time=4.1,cases:any[]=[],audit:any[]=[];
assert.equal(sourceVersion(),panel.meta.source);
function restore(bytes:Uint8Array){const p=deserialize(bytes),w:any=Object.assign(Object.create(World.prototype),p.fields);w.attachments=new WeakMap(p.attachments);return {p,w};}
for(const mode of ['previous','transition']){
  let packet:Buffer|undefined;
  const result=rep(input.cell,input.side,input.seed,{handContact:'patch',substeps:96,configureWorld:world=>{
    const w:any=world;w.materialTransport='owned';w.activeGrip=mode==='previous'?nativeSpanInterval:nativeTransitionInterval;
    const sub=w.integrateSubstep;
    w.integrateSubstep=function(...args:any[]){
      if(!packet&&args[7]&&args[0].length===2&&Math.abs(this.time-time)<1e-12){
        const fields=Object.fromEntries(Object.entries(this).filter(([k,v])=>k!=='attachments'&&typeof v!=='function'));
        packet=serialize({fields,args,attachments:this.joints.map((j:any)=>[j,this.attachments.get(j)]).filter((v:any)=>v[1])});
      }
      return sub.apply(this,args);
    };
  }});
  const expected=panel.rows.find((r:any)=>r.input.id===input.id&&r.mode===mode).result;assert.deepEqual(result,expected);assert(packet);
  const original=restore(packet),p=original.p,w=original.w,ids=p.args[0],N=w.n,
    select=(v:any)=>Array.isArray(v)&&v.length===N?ids.map((i:number)=>v[i]):ArrayBuffer.isView(v)&&(v as any).length===N?new (v as any).constructor(ids.map((i:number)=>(v as any)[i])):v,
    fields=Object.fromEntries(Object.entries(w).filter(([k])=>k!=='attachments').map(([k,v])=>[k,select(v)])) as any;
  fields.index=new Map(fields.bodies.map((b:any,i:number)=>[b,i]));fields.n=2;fields.heldBodies=new Set([...w.heldBodies].filter(b=>fields.bodies.includes(b)));
  fields.report=Object.fromEntries(Object.entries(w.report).map(([k,v])=>[k,select(v)]));
  const args=[...p.args];args[0]=[0,1];args[1]=select(args[1]);args[2]=select(args[2]);args[5]=fields.report;assert.equal(args[6].size,0);
  const bytes=serialize({fields,args,attachments:p.attachments}),states=[];
  for(const solver of [nativeSpanInterval,nativeTransitionInterval]){
    const full=restore(packet),small=restore(bytes);full.w.activeGrip=solver;small.w.activeGrip=solver;
    full.w.integrateSubstep(...full.p.args);small.w.integrateSubstep(...small.p.args);
    ids.forEach((i:number,k:number)=>assert.deepEqual(full.w.bodies[i],small.w.bodies[k]));
    assert.deepEqual(small.w.report.work,full.w.report.work);assert.deepEqual(small.w.report.passiveGraspWork,full.w.report.passiveGraspWork);
    for(const key of ['supportMotorWork','armWork'])ids.forEach((i:number,k:number)=>assert.equal(small.w.report[key][k],full.w.report[key][i]));
    assert.equal(small.w.report.activeGrip.accepted,0);assert.equal(small.w.report.activeGrip.reasons['scope:recovery-command'],1);
    states.push({bodies:small.w.bodies,joint:{...small.w.joints[0],a:undefined,b:undefined},report:small.w.report});
  }
  assert.deepEqual(states[0],states[1]);
  const fullPath=`${root}/support-${mode}-4.1.bin`;writeFileSync(fullPath,packet);
  cases.push({id:input.id,history:mode,time,physicalInterval:args[3],inputSha256:sha(bytes),input:bytes.toString('base64'),bytes:bytes.length,
    source:panel.meta.source,equivalence:'Original22-body interval exactly reproduced on projected bodies, work and effort. Old/new callback identity gives identical fallback on the same checkpoint.'});
  audit.push({mode,initial:fields.bodies.map((b:any)=>({pos:b.pos,vel:b.vel,support:b.support})),states,original:{path:fullPath,sha256:sha(packet)}});
}
const output='config/grip-native-support-packets.json';writeFileSync(output,JSON.stringify({format:'node22-v8-native-support-input-v1',baseline:panel.meta.baseline,
  source:panel.meta.source,settings:panel.meta.settings,input,time,cases},null,2)+'\n');
writeFileSync(`${root}/support-repro.json`,JSON.stringify({input,time,cases:cases.map(({input,...v})=>v),audit},null,2)+'\n');
console.log(JSON.stringify({output,cases:cases.map(({input,...v})=>v),verdict:'Same-checkpoint callback identity does not create the late fork. Earlier histories differ. Reproduction is a support/loaded-force handoff, not proof of an incorrect recovery rule.'}));
