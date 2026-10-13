/** Benchmark without observers, profilers or per-step logging. Copy unchanged
 * at the same directory depth into each immutable source archive.
 */
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { deserialize } from 'node:v8';
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { World } from '../../../src/physics/world.js';
import { newSupport } from '../../../src/physics/support.js';
import { sourceVersion } from '../../../scripts/source-version.js';
const root='/workspace/football-simulation-/out/grip-fast', model=process.argv.find(x=>x.startsWith('--model='))?.slice(8)??'fast';
const mode=model==='baseline'?'midpoint':model==='slow'?'resolved':'fast';
const source=sourceVersion(), original=JSON.parse(readFileSync(`${root}/../grip-timing/baseline.json`,'utf8'));
const p={massKg:100,radius:.3,reach:1.6,heightYd:2.05,vmax:9,tau:1.3,brake:6,lateral:6,turnRate:8,
  backpedal:.6,shuffle:.55,maxCatchHeight:3,reactReach:2.6,reactionTime:.25,power:100,balance:.5,bend:.5,stepSpeed:3.4,getUp:.9};
const files=['patch-0-3-0-3001-1','patch-45-8-0-3001-1'];
const packets=files.map(id=>({id,bytes:readFileSync(`${root}/../grip-timing/${id}.bin`)}));
const longBytes=readFileSync(`${root}/long-96.bin`);
const restore=(packet:any)=>{
  const w:any=Object.assign(Object.create(World.prototype),packet.fields);w.attachments=new WeakMap(packet.attachments);
  w.gripTiming=mode;w.substeps=12;return w;
};
const definitions=[
  ...packets.map(({id,bytes})=>({name:id, ticks:1, setup:()=>{
    const q=structuredClone(deserialize(bytes)),w=restore(q);return {w,entries:[{dt:.05,intents:q.args[1]}],ids:q.args[0]}; }})),
  {name:'multiple contacts',ticks:4,setup:()=>{
    const bs=[0,1,2].map(x=>({pos:{x,y:x===1?.1:-.1},vel:{x:.2,y:x===1?-.1:.1},facing:0,spin:0,energy:1,profile:{...p},support:newSupport()}));
    const w=new World(bs,{handContact:'patch',gripTiming:mode as any,substeps:12});
    w.joints.push(...[bs[0],bs[2]].map(a=>({kind:'grasp' as const,a,b:bs[1],capacity:500,reach:1.6,hold:1,legs:.6,pull:0})));
    return {w,entries:Array.from({length:4},()=>({dt:.05,intents:bs.map(()=>({vel:{x:.4,y:0},push:.1,posture:.2}))})),ids:[0,1,2]};
  }},
  {name:'dry sliding onset',ticks:1,setup:()=>{
    const bs=[0,1].map(x=>({pos:{x,y:0},vel:{x:0,y:0},facing:0,spin:1,energy:1,profile:{...p},support:newSupport()}));
    const w=new World(bs,{handContact:'patch',gripTiming:mode as any,substeps:1});
    w.joints.push({kind:'grasp',a:bs[0],b:bs[1],capacity:500,reach:1.6,hold:1,legs:0,pull:0});
    return {w,entries:[{dt:.025,intents:bs.map(()=>({vel:{x:0,y:0},free:true}))}],ids:[0,1]};
  }},
  {name:'long hold',ticks:deserialize(longBytes).entries.length,setup:()=>{
    const q=structuredClone(deserialize(longBytes));return {w:restore(q),entries:q.entries,ids:[6,15]};
  }},
];
const hash=(x:any)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const inputHashes=()=>[...packets.map(({id,bytes})=>({id,sha:createHash('sha256').update(bytes).digest('hex')})),
  {id:'long',sha:createHash('sha256').update(longBytes).digest('hex')}];
const initialInputHashes=inputHashes();
const run=(definition:typeof definitions[number])=>{
  const {w,entries,ids}=definition.setup(); const start=performance.now(), tickSeconds:number[]=[];let lastReport:any;
  for(const e of entries) {
    if('commands' in e) for(let k=0;k<(e as any).commands.length;k++) if(w.joints[k]?.kind==='grasp') {
      w.joints[k].capacity=(e as any).commands[k].capacity;w.joints[k].pull=(e as any).commands[k].pull;
    }
    const tickStart=performance.now();lastReport=w.step(e.intents,e.dt);tickSeconds.push((performance.now()-tickStart)/1000);
  }
  const seconds=(performance.now()-start)/1000;
  if(hash(inputHashes())!==hash(initialInputHashes))throw Error('Serialized input mutated');
  return {seconds,tickSeconds,lastIntegration:lastReport.gripTiming,end:ids.map((i:number)=>({i,pos:w.bodies[i].pos,vel:w.bodies[i].vel,facing:w.bodies[i].facing,
    spin:w.bodies[i].spin,energy:w.bodies[i].energy,state:w.bodies[i].support.state}))};
};
const rows=[];
// Warm each case once; every measured sample still starts from a new identical
// acquired world. Run models serially on this same host, without other jobs.
for(const d of definitions) {
  run(d); const repeats=d.name==='long hold'?3:7, samples=[];
  for(let i=0;i<repeats;i++) { const r=run(d);samples.push(r);console.log(JSON.stringify({model,name:d.name,repeat:i,seconds:r.seconds})); }
  const first=hash(samples[0].end);if(!samples.every(r=>hash(r.end)===first))throw Error('Repeated input changed');
  rows.push({name:d.name,ticks:d.ticks,samples});
}
if(model==='baseline'&&source!==original.source)throw Error('Wrong baseline source');
if(model==='slow'&&source!=='a4bfc67148f4b8228acb419e6ab744c2d5195776233f231fe6e7765745a3ceb0')throw Error('Wrong corrected reference');
if(sourceVersion()!==source)throw Error('Source changed');
mkdirSync(root,{recursive:true});
writeFileSync(`${root}/benchmark-${model}.json`,JSON.stringify({source,model,mode,node:process.version,cpu:cpus()[0].model,
  collectors:{sha:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex')},
  inputHashes:initialInputHashes,immutableInputs:true,rows},null,2));
