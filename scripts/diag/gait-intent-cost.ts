/** Uninstrumented, alternating repeated microbenchmarks; no game campaign.
 * node --import tsx scripts/diag/gait-intent-cost.ts OUT
 * Report query and isolated-World costs separately; neither is native game cost.
 */
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {cpus, platform, arch} from 'node:os';
import {Rng} from '../../src/core/rng.js';
import {generatePlayer} from '../../src/players/generator.js';
import {derivePhysical} from '../../src/players/physical.js';
import {arriveVelocity, type Body} from '../../src/physics/kinematics.js';
import {World} from '../../src/physics/world.js';
import {newSupport} from '../../src/physics/support.js';
import {planArrival} from '../../src/sim/arrival-plan.js';

const profile=derivePhysical(generatePlayer(new Rng(5),'OG'));
const goal={x:3,y:0}, dt=.05, queryCount=25000, worldCount=16*60, repeats=11;
let sink=0;
function body(speed=0):Body{return {pos:{x:0,y:0},vel:{x:speed,y:0},facing:0,energy:1,profile,support:newSupport()};}
const states=Array.from({length:32},(_,k)=>{const b=body(k/12);b.pos.x=k/20;b.energy=.3+.7*k/31;return b;});
function batch(kind:'query'|'world',intent:boolean){
  const start=performance.now();
  if(kind==='query'){
    for(let k=0;k<queryCount;k++){
      const b=states[k%states.length];
      sink+=(intent?planArrival(b,goal,3,0,dt).velocity:arriveVelocity(b,goal,3,0)).x;
    }
  }else{
    for(let j=0;j<16;j++){
      const b=body(),w=new World([b]);
      for(let k=0;k<60;k++){
        const vel=intent?planArrival(b,goal,3,0,dt).velocity:arriveVelocity(b,goal,3,0);
        w.step([{vel,...(intent?{propulsion:'full' as const}:{})}],dt);
      }
      sink+=b.pos.x+b.energy;
    }
  }
  return (performance.now()-start)*1000/(kind==='query'?queryCount:worldCount);
}
for(let k=0;k<4;k++)for(const kind of ['query','world'] as const)for(const intent of [false,true])batch(kind,intent);
const rows=[];
for(const kind of ['query','world'] as const){
  const ordinary:number[]=[],intent:number[]=[];
  for(let k=0;k<repeats;k++)for(const useIntent of (k%2?[true,false]:[false,true])){
    (useIntent?intent:ordinary).push(batch(kind,useIntent));
  }
  const summary=(v:number[])=>{const a=[...v].sort((x,y)=>x-y);return {medianUs:a[5],p90Us:a[9],worstUs:a[10],samplesUs:v};};
  rows.push({kind,countPerBatch:kind==='query'?queryCount:worldCount,ordinary:summary(ordinary),intent:summary(intent)});
}
const result={schemaVersion:1,node:process.version,platform:platform(),arch:arch(),cpu:cpus()[0].model,
  scriptSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  repeats,dt,profile,rows,sink,scope:'Microseconds per query/isolated World tick. Alternating warm runs in one process. No tracing, JSON or assertions inside timed batches. Not a loaded/native game runtime benchmark;11 batches do not characterize rare tails.'};
const out=process.argv[2];if(!out)throw new Error('Output path required');
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({out,rows},null,2));
