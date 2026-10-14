/** Portable input projection from immutable native checkpoints; no expected answers. */
import assert from 'node:assert/strict';import{serialize,deserialize}from'node:v8';import{readFileSync,writeFileSync}from'node:fs';
import{nativeAccountingInput}from'./grip-world-accounting-inputs.js';import{World}from'../../../src/physics/world.js';import{sha}from'./grip-bounded-fixtures.js';
const specs=JSON.parse(readFileSync('config/grip-native-force-inputs.json','utf8')).cases.map((c:any)=>[c.id,c.phase]);specs.push(['patch-45-8-0-3001-1',0]);const cases=[];
for(const[id,phase]of specs){const v=nativeAccountingInput(id),{w}=v;w.materialTransport='owned';for(let k=0;k<phase;k++){const a=[...v.p.args];a[4]-=k*a[3];w.integrateSubstep(...a);}const originalArgs=[...v.p.args];originalArgs[4]-=phase*originalArgs[3];const argsBefore=originalArgs,ids=argsBefore[0],N=w.n,select=(x:any)=>Array.isArray(x)&&x.length===N?ids.map((i:number)=>x[i]):ArrayBuffer.isView(x)&&(x as any).length===N?new (x as any).constructor(ids.map((i:number)=>x[i])):x;
 const fields=Object.fromEntries(Object.entries(w).filter(([k])=>!['attachments','activeGrip','passiveGrip','materialTransport'].includes(k)).map(([k,x])=>[k,select(x)])) as any;
 fields.index=new Map(fields.bodies.map((b:any,i:number)=>[b,i]));fields.n=ids.length;fields.heldBodies=new Set([...w.heldBodies].filter(b=>fields.bodies.includes(b)));
 fields.report=Object.fromEntries(Object.entries(w.report).map(([k,x])=>[k,select(x)]));
 const args=[...argsBefore];args[0]=ids.map((_v:any,i:number)=>i);args[1]=select(args[1]);args[2]=select(args[2]);args[5]=fields.report;assert.equal(args[6].size,0);
 const bytes=serialize({fields,args,attachments:w.joints.map((j:any)=>[j,w.attachments.get(j)])}),p=deserialize(bytes),reduced:any=Object.assign(Object.create(World.prototype),p.fields);reduced.attachments=new WeakMap(p.attachments);reduced.materialTransport='owned';
 // Check the original and reduced acquired contact interval, not a solver answer.
 w.integrateSubstep(...argsBefore);reduced.integrateSubstep(...p.args);
 ids.forEach((i:number,k:number)=>assert.deepEqual(reduced.bodies[k],w.bodies[i]));
 assert.deepEqual(reduced.graspPoint(reduced.joints[0]),w.graspPoint(v.joint));
 for(const k of ['work','passiveGraspWork'])assert.deepEqual(reduced.report[k],w.report[k]);
 cases.push({id,phase,nativePacketSha256:v.checksum,reducedPacketSha256:sha(bytes),bytes:bytes.length,input:bytes.toString('base64'),equivalence:'Original native interval body/support/point/work exactly equal after projecting unrelated bodies and remapping indices; no requests or physical values replaced.'});
}
writeFileSync('config/grip-native-world-packets.json',JSON.stringify({format:'node22-v8-native-world-input-v1',baseline:'4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',cases},null,2)+'\n');console.log(cases.map(({input,...x})=>x));
