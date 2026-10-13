/** Minimal late interval reproduction; no controller or recovery-law change. */
import { readFileSync,writeFileSync } from 'node:fs';
import { deserialize,serialize } from 'node:v8';
import { createHash } from 'node:crypto';
import { World } from '../../../src/physics/world.js';
import { snapshot,restore } from '../../../src/physics/grip-timing.js';
import { sourceVersion } from '../../../scripts/source-version.js';
const root='out/grip-fast', p=deserialize(readFileSync(`${root}/long-96.bin`));
const w:any=Object.assign(Object.create(World.prototype),p.fields);w.attachments=new WeakMap(p.attachments);
w.substeps=96;w.gripTiming='resolved';let saved:any;
const stop={}, integrate=w.integrateSubstep;
w.integrateSubstep=function(...args:any[]){
  if(this.time>=4.95-1e-8&&args[7]){saved=snapshot(this,args);throw stop;}
  return integrate.apply(this,args);
};
try{for(const e of p.entries)w.step(e.intents,e.dt);}catch(e){if(e!==stop)throw e;}
if(!saved)throw Error('No late checkpoint');
const bytes=serialize(saved);writeFileSync(`${root}/late-checkpoint.bin`,bytes);
const trials=[];
for(const [n,mode] of [[12,'resolved'],[96,'resolved'],[4096,'midpoint']] as const){
  const q=restore(saved,World.prototype);q.w.gripTiming=mode;const args=q.args,h=.05/n;
  for(let k=0;k<n;k++){const a=[...args];a[3]=h;a[4]=args[4]-k*h;q.w.integrateSubstep(...a);}
  trials.push({n,mode,time:q.w.time,body:args[0].map((i:number)=>({i,pos:q.w.bodies[i].pos,vel:q.w.bodies[i].vel,
    facing:q.w.bodies[i].facing,spin:q.w.bodies[i].spin,support:q.w.bodies[i].support})),integration:args[5].gripTiming});
}
writeFileSync(`${root}/late-interval.json`,JSON.stringify({source:sourceVersion(),
  checkpointSha:createHash('sha256').update(bytes).digest('hex'),startTime:saved.fields.time,
  inputTapeSha:createHash('sha256').update(readFileSync(`${root}/long-96.bin`)).digest('hex'),trials},null,2));
