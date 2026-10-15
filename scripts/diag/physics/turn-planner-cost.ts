/** Cost-only candidate: compare against immutable pre-optimization planning,
 * not against the new helper's own answers. No physical World stepping. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sourceVersion} from '../../source-version.js';
import {sha} from './grip-bounded-fixtures.js';
import {recoveryFixture} from './grip-recovery-input.js';
import {turnRouteDelta} from '../../../src/physics/turn-route.js';
import {World} from '../../../src/physics/world.js';
const root='out/turn-planner-cost',pin='0eb6fc56afba7590e8a26616b5ff8d30a1d60d3d';
mkdirSync(root,{recursive:true});
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source=sourceVersion(),started=performance.now(),
  oldRoute=execFileSync('git',['show',`${pin}:src/physics/turn-route.ts`],{encoding:'utf8'}),
  oldWorld=execFileSync('git',['show',`${pin}:src/physics/world.ts`],{encoding:'utf8'});
const routePath=resolve(root,'pinned-turn-route.ts'),worldPath=resolve(root,'pinned-world.ts');
writeFileSync(routePath,oldRoute);
// Preserve every statement; adapt imports only so the saved module can live
// in ignored output. Pin its selector too, rather than importing the candidate.
const rewritten=oldWorld.replace(/from (['"])(\.{1,2}\/[^'"]+)\1/g,(_all,q,p)=>
  `from ${q}${pathToFileURL(p==='./turn-route.js'?routePath:resolve('src/physics',p)).href}${q}`);
writeFileSync(worldPath,rewritten);
const reference=await import(pathToFileURL(routePath).href),OldWorld=(await import(pathToFileURL(worldPath).href)).World;
let routes=0,plans=0,seed=0x1b873593;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const compare=(d:number,w:number,A:number,R:number)=>{
  assert(Object.is(turnRouteDelta(d,w,A,R),reference.turnRoute(d,w,A,R).delta),`route ${JSON.stringify([d,w,A,R])}`);routes++;
};
for(const d of [-Infinity,-20,-2*Math.PI,-Math.PI-.01,-Math.PI,-.01,-0,0,.01,Math.PI,Math.PI+.01,20,Infinity,NaN])
  for(const w of [-9,-8,-1.3,-Number.MIN_VALUE,-0,0,Number.MIN_VALUE,1.3,8,9,NaN])
    for(const A of [0,.01,60,Infinity])for(const R of [0,8,Infinity])compare(d,w,A,R);
for(let k=0;k<100000;k++){
  const R=10**(-2+4*random()),A=10**(-3+6*random()),w=k%10===0?0:(2*random()-1)*R*(k%11===0?1.2:1),
    d=(k%2?Math.PI+(random()-.5)*.1:(random()-.5)*20)+Math.floor(random()*5-2)*2*Math.PI;
  compare(d,w,A,R);
}
for(const history of ['previous','transition']){
  const v=recoveryFixture(history),w=v.w;w.turnChoice='arrival-time';
  for(let k=0;k<2000;k++){
    const i=k%2,a=structuredClone(w.bodies[i]),b=structuredClone(a),spin=k%5===0?0:(random()-.5)*8,
      facing=-Math.PI+(random()-.5)*.1,command={vel:{x:8*(random()-.5),y:8*(random()-.5)},facing:k%3===0?0:(random()-.5)*8};
    a.facing=b.facing=facing;a.spin=b.spin=spin;
    const dt=[.01,.05,.1][k%3],expected=OldWorld.prototype.plan.call(w,a,i,command,dt),actual=World.prototype['plan'].call(w,b,i,command,dt);
    assert.deepEqual(actual,expected,`plan ${history}/${k}`);assert.deepEqual(a,b);plans++;
  }
}
// Default, free and dive branches must retain their complete plans as well.
for(const enabled of [false,true])for(const special of [{},{free:true},{dive:{x:1,y:.5}}]){
  const v=recoveryFixture(),w=v.w;if(enabled)w.turnChoice='arrival-time';else delete w.turnChoice;
  const a=structuredClone(w.bodies[0]),b=structuredClone(a),command={vel:{x:8,y:0},facing:0,...special};
  assert.deepEqual(World.prototype['plan'].call(w,b,0,command,.05),OldWorld.prototype.plan.call(w,a,0,command,.05));plans++;
}
const profile=JSON.parse(readFileSync('config/baseline.json','utf8')),
  flags=Object.fromEntries(Object.keys(profile.flags).map(k=>[k,process.env[k]??null]));assert.deepEqual(flags,profile.flags);
assert.equal(sourceVersion(),source);assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),commit);
const result={commit,source,pin,baseline:profile.id,flags,node:process.version,
  referenceHashes:{route:sha(oldRoute),world:sha(oldWorld),relocatedWorld:sha(rewritten)},
  inputHashes:{supportPackets:sha(readFileSync('config/grip-native-support-packets.json')),collector:sha(readFileSync('scripts/diag/physics/turn-planner-cost.ts'))},
  corpus:{rng:'LCG 1664525/1013904223, seed0x1b873593; fixed loops above',routes,plans},
  exactMatches:true,physicalSteps:0,elapsedSeconds:(performance.now()-started)/1000};
writeFileSync(`${root}/equivalence.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
