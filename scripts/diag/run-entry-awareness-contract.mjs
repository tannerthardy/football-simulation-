// Sensing/query contract only. No PlaySim, World, physics tick or RNG.
import assert from'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';
import{execFileSync}from'node:child_process';import{mkdirSync}from'node:fs';import{resolve}from'node:path';import{pathToFileURL}from'node:url';
const folder='out/run-entry-awareness';mkdirSync(folder,{recursive:true});
const bytes=execFileSync('git',['show','68284671d062dfd4e7e879bcd037bc21dad3e3ac:src/sim/teammate-information.ts']);
writeFileSync(folder+'/teammate-information.ts',bytes);
const{TeammateInformation}=await import(pathToFileURL(resolve(folder+'/teammate-information.ts')).href);
const start=performance.now(),actor=(idx,x)=>({idx,team:'O',pos:{x,y:0},vel:{x:0,y:1},facing:0,engagement:null,eyes:null,profile:{reactionTime:.3},mind:{observationDelay:()=>.3},isDown:()=>false});
const observer=actor(0,0),target=actor(1,5),info=new TeammateInformation([observer,target],new Map());
info.sense([observer,target],0,.05);assert.deepEqual(info.query(0,1,.25,.05),{source:'unavailable'});
target.pos={x:-10,y:50};target.vel={x:9,y:-9};info.sense([observer,target],.30,.05);
const rows=[.30,.35,.40,1,1.05].map(t=>({t,picture:info.query(0,1,t,.05)}));
assert.deepEqual(rows[0].picture.vel,{x:0,y:1});assert.equal(rows[0].picture.source,'observed');
assert.equal(rows[1].picture.source,'observed');assert.deepEqual(rows[1].picture.vel,{x:0,y:0});
assert.equal(rows[2].picture.source,'remembered');assert.equal(rows[2].picture.predictedFor,.3);assert.equal(rows[2].picture.age,.4);
assert.deepEqual(rows[4].picture,{source:'unavailable'});
const before=JSON.stringify(info,(_k,v)=>v instanceof Map?[...v]:v);for(let i=0;i<10;i++)info.query(0,1,.4,.05);
assert.equal(JSON.stringify(info,(_k,v)=>v instanceof Map?[...v]:v),before);
const result={schema:'run-entry-awareness-contract-probe-v1',ownerSource:'68284671d062dfd4e7e879bcd037bc21dad3e3ac',moduleSha256:createHash('sha256').update(bytes).digest('hex'),
 originalSample:{t:0,pos:{x:5,y:0},vel:{x:0,y:1}},rows,findings:['Source observed means recently delivered, not prediction still valid.','After prediction cap, vel=(0,0) denotes unknown current speed, not evidence of physical stopping.','Raw sampled velocity is stored but not exposed in the picture.','The admission helper uses picture.vel as sampled velocity to undo extrapolation, and treats zero as stationary. Importing the type alone does not satisfy this assumption.'],
 node:process.version,collectorSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),queryPurityPreserved:true,physicalScrimmages:0,worldSteps:0,completedGames:0,elapsedSeconds:(performance.now()-start)/1000};
writeFileSync('out/run-entry-awareness/contract-probe.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
