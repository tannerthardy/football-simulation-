/** Focused retained-input diagnostic; raw evidence stays in ignored out/. */
import{nativeForceFixture}from'./grip-native-world-fixtures.js';import{nativeSpanInterval}from'./grip-native-span-interval.js';import{nativeSpanReference}from'./grip-native-span-reference.js';import{writeFileSync,readFileSync,mkdirSync}from'node:fs';
import{sourceVersion}from'../../source-version.js';import{execFileSync}from'node:child_process';
mkdirSync('out/grip-native-forces',{recursive:true});
const profile=JSON.parse(readFileSync('config/baseline.json','utf8')),meta={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source:sourceVersion(),
 flags:Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null])),timestamp:new Date().toISOString()};
const results=[];
for(const id of ['patch-45-8-0-3001-1','patch-45-8-0-4001-1']){
 const variants=[];
 for(const n of [0,1024,2048]){const v=nativeForceFixture(id,16,'combined',n?q=>nativeSpanReference(q,n):nativeSpanInterval);const r=v.advance(80);variants.push({n,bodies:v.w.bodies.map((b:any)=>({pos:b.pos,vel:b.vel,facing:b.facing,spin:b.spin,support:b.support})),material:v.w.attachments.get(v.joint).material,foot:v.joint.b.support.foot,report:r,joint:{...v.joint,a:undefined,b:undefined}});}
 const diff=(a:any,b:any)=>({position:Math.max(...[0,1].map(i=>Math.hypot(a.bodies[i].pos.x-b.bodies[i].pos.x,a.bodies[i].pos.y-b.bodies[i].pos.y))),support:Math.max(...[0,1].map(i=>Math.hypot(a.bodies[i].support.xi.x-b.bodies[i].support.xi.x,a.bodies[i].support.xi.y-b.bodies[i].support.xi.y))),facing:Math.max(...[0,1].map(i=>Math.abs(a.bodies[i].facing-b.bodies[i].facing))),material:Math.hypot(a.material.x-b.material.x,a.material.y-b.material.y),foot:Math.hypot(a.foot.offset.x-b.foot.offset.x,a.foot.offset.y-b.foot.offset.y),bodyWork:Math.abs(a.report.work.grasps-b.report.work.grasps),footWork:Math.abs(a.report.supportMotorWork[0]-b.report.supportMotorWork[0]),armWork:Math.abs(a.report.armWork[1]-b.report.armWork[1])});
 const row={id,intervals:80,physicalTime:80*.05/96,accuracy:diff(variants[0],variants[2]),referenceConvergence:diff(variants[1],variants[2]),accepted:variants.map(v=>({n:v.n,accepted:v.report.activeGrip.accepted,fallbacks:v.report.activeGrip.fallbacks})),raw:variants};results.push(row);console.log({...row,raw:undefined});}
writeFileSync('out/grip-native-forces/reference-continuation.json',JSON.stringify({meta,cases:results},null,2));

if(sourceVersion()!==meta.source)throw Error("Physics source changed during diagnosis");
